import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwMPlGBUer9_Etg_UFWnCJ97dapbQBAdXsaWdL_Em_rexZFqmS5F2vxz2yOJMp4d_xNiA/exec';

let jobState = {
  state: 'idle',
  status: '',
  progress: { current: 0, total: 0 },
  eta: '',
  lastIndexedAt: ''
};

let shouldCancel = false;
let isPaused = false;

const extractDriveFolderId = (url) => {
  if (!url) return null;
  const folderMatch = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const idMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return null;
};

export async function GET() {
  return NextResponse.json(jobState);
}

export async function POST(request) {
  try {
    const { action } = await request.json();

    if (action === 'pause') {
      isPaused = true;
      jobState.state = 'paused';
      jobState.status = 'Paused by admin';
      return NextResponse.json({ message: 'Paused', jobState });
    }

    if (action === 'resume') {
      isPaused = false;
      jobState.state = 'running';
      jobState.status = 'Resuming indexing...';
      return NextResponse.json({ message: 'Resumed', jobState });
    }

    if (action === 'cancel') {
      shouldCancel = true;
      isPaused = false;
      jobState.state = 'idle';
      jobState.status = 'Cancelled by admin';
      jobState.progress = { current: 0, total: 0 };
      jobState.eta = '';
      return NextResponse.json({ message: 'Cancelled', jobState });
    }

    if (action === 'start') {
      if (jobState.state === 'running') {
        return NextResponse.json({ message: 'A task is already running in background', jobState }, { status: 400 });
      }

      jobState.state = 'running';
      jobState.status = 'Initializing Server AI Models...';
      jobState.progress = { current: 0, total: 0 };
      jobState.eta = 'Calculating time...';
      shouldCancel = false;
      isPaused = false;

      runServerBackgroundIndexing();

      return NextResponse.json({ message: 'Started', jobState });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function runServerBackgroundIndexing() {
  try {
    const faceapi = await import('@vladmandic/face-api');
    const canvas = await import('canvas');
    
    const { Canvas, Image, ImageData } = canvas;
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    jobState.status = 'Fetching Google Drive photos list...';
    const { data: conf } = await supabase.from('site_settings').select('drive_link').eq('id', 'main_config').single();
    const folderId = extractDriveFolderId(conf?.drive_link);
    const targetUrl = folderId ? `${GOOGLE_SCRIPT_URL}?folderId=${folderId}` : GOOGLE_SCRIPT_URL;

    const res = await fetch(targetUrl);
    const data = await res.json();
    const drivePhotos = data.photos || [];

    if (drivePhotos.length === 0) {
      jobState.state = 'idle';
      jobState.status = 'No photos found in Drive folder.';
      return;
    }

    jobState.status = 'Clearing old database descriptors...';
    await supabase.from('photo_descriptors').delete().neq('id', 'placeholder_id');

    const total = drivePhotos.length;
    jobState.progress = { current: 0, total };
    let recentDurations = [];

    for (let i = 0; i < total; i++) {
      if (shouldCancel) {
        jobState.state = 'idle';
        jobState.status = 'Indexing cancelled.';
        return;
      }

      while (isPaused) {
        await new Promise((r) => setTimeout(r, 1000));
        if (shouldCancel) {
          jobState.state = 'idle';
          jobState.status = 'Indexing cancelled.';
          return;
        }
      }

      const photo = drivePhotos[i];
      const current = i + 1;
      const stepStartTime = Date.now();

      jobState.status = `Indexing photo ${current} of ${total}...`;

      try {
        const fileId = photo.drive_file_id || photo.id;
        
        const possibleUrls = [
          `https://lh3.googleusercontent.com/d/${fileId}=s2048`,
          `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&confirm=t`,
          `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
          photo.download_url,
          photo.image_url
        ].filter(Boolean);

        let imgBuffer = null;
        for (const url of possibleUrls) {
          try {
            const imgRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (imgRes.ok) {
              const arrayBuf = await imgRes.arrayBuffer();
              if (arrayBuf && arrayBuf.byteLength > 2000) {
                imgBuffer = Buffer.from(arrayBuf);
                break;
              }
            }
          } catch (e) {}
        }

        if (!imgBuffer) {
          console.warn(`Could not fetch image bytes for fileId: ${fileId}`);
          continue;
        }

        const img = await canvas.loadImage(imgBuffer);

        // অতি-সংবেদনশীল রেজোলিউশনে ফেস ডিটেকশন (inputSize: 1024, scoreThreshold: 0.02)
        let detections = await faceapi
          .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 1024, scoreThreshold: 0.02 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (!detections || detections.length === 0) {
          detections = await faceapi
            .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.03 }))
            .withFaceLandmarks()
            .withFaceDescriptors();
        }

        // মাল্টি-অ্যাঙ্গেল রোটেশন চেক (90°, 270°, 180°)
        if (!detections || detections.length === 0) {
          const angles = [90, 270, 180];
          for (const angle of angles) {
            const rotCanvas = canvas.createCanvas(
              angle === 90 || angle === 270 ? img.height : img.width,
              angle === 90 || angle === 270 ? img.width : img.height
            );
            const rotCtx = rotCanvas.getContext('2d');

            rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
            rotCtx.rotate((angle * Math.PI) / 180);
            rotCtx.drawImage(img, -img.width / 2, -img.height / 2);

            detections = await faceapi
              .detectAllFaces(rotCanvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 1024, scoreThreshold: 0.02 }))
              .withFaceLandmarks()
              .withFaceDescriptors();

            if (!detections || detections.length === 0) {
              detections = await faceapi
                .detectAllFaces(rotCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.03 }))
                .withFaceLandmarks()
                .withFaceDescriptors();
            }

            if (detections && detections.length > 0) break;
          }
        }

        const descriptorsArray = (detections || []).map((det) => Array.from(det.descriptor));

        await supabase.from('photo_descriptors').upsert({
          id: fileId,
          drive_file_id: fileId,
          image_url: photo.image_url,
          download_url: photo.download_url,
          name: photo.name,
          descriptors: descriptorsArray
        });
      } catch (err) {
        console.warn('Skipping photo:', photo.id, err.message);
      }

      const stepDuration = (Date.now() - stepStartTime) / 1000;
      recentDurations.push(stepDuration);
      if (recentDurations.length > 5) recentDurations.shift();

      const avgDuration = recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length;
      const secondsRemaining = Math.max(0, Math.round((total - current) * avgDuration));

      if (secondsRemaining >= 60) {
        jobState.eta = `~${Math.floor(secondsRemaining / 60)}m ${secondsRemaining % 60}s left`;
      } else {
        jobState.eta = `~${secondsRemaining}s left`;
      }

      jobState.progress = { current, total };
    }

    const now = new Date().toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    jobState.state = 'idle';
    jobState.status = 'Complete! All photos indexed successfully.';
    jobState.eta = '';
    jobState.lastIndexedAt = now;

    await supabase.from('site_settings').upsert({
      id: 'main_config',
      last_indexed_at: now
    });
  } catch (e) {
    console.error('Background worker error:', e);
    jobState.state = 'idle';
    jobState.status = 'Error: ' + e.message;
    jobState.eta = '';
  }
}