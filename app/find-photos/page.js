'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function FindPhotosPage() {
  const [siteConfig, setSiteConfig] = useState(null);
  const [matchedPhotos, setMatchedPhotos] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [userSelfie, setUserSelfie] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(true);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [previewIndex, setPreviewIndex] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const faceapiRef = useRef(null);

  const previewIndexRef = useRef(previewIndex);
  const hasSearchedRef = useRef(hasSearched);
  const isCameraOpenRef = useRef(isCameraOpen);

  useEffect(() => { previewIndexRef.current = previewIndex; }, [previewIndex]);
  useEffect(() => { hasSearchedRef.current = hasSearched; }, [hasSearched]);
  useEffect(() => { isCameraOpenRef.current = isCameraOpen; }, [isCameraOpen]);

  useEffect(() => {
    fetchSiteData();
    loadFaceModels();

    try {
      const cachedMatches = sessionStorage.getItem('find_photos_matches');
      const cachedSelfie = sessionStorage.getItem('find_photos_selfie');
      if (cachedMatches && cachedSelfie) {
        setMatchedPhotos(JSON.parse(cachedMatches));
        setUserSelfie(cachedSelfie);
        setHasSearched(true);
      }
    } catch (e) {}

    const handlePopState = () => {
      if (previewIndexRef.current !== null) {
        setPreviewIndex(null);
        setZoomLevel(1);
        setPanPosition({ x: 0, y: 0 });
        return;
      }
      if (isCameraOpenRef.current) {
        closeCameraModal();
        return;
      }
      if (hasSearchedRef.current) {
        handleResetSearch();
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      stopCameraStream();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const loadFaceModels = async () => {
    try {
      if (typeof window === 'undefined') return;
      const faceapi = await import('@vladmandic/face-api');
      faceapiRef.current = faceapi;

      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
    } catch (e) {
      console.warn('Face models loading error:', e);
    }
  };

  const fetchSiteData = async () => {
    try {
      const { data: conf } = await supabase.from('site_settings').select('*').eq('id', 'main_config').single();
      if (conf) setSiteConfig(conf);
    } catch (e) {}
  };

  const handleResetSearch = () => {
    setHasSearched(false);
    sessionStorage.removeItem('find_photos_matches');
    sessionStorage.removeItem('find_photos_selfie');
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    setCameraStarting(true);
    window.history.pushState({ modal: 'camera' }, '');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraStarting(false);
        };
      }
    } catch (err) {
      alert('Camera error: ' + err.message);
      setIsCameraOpen(false);
      setCameraStarting(false);
    }
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const closeCameraModal = () => {
    stopCameraStream();
    setIsCameraOpen(false);
  };

  const handleCaptureSelfie = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const selfieDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    closeCameraModal();
    runInstantFaceRecognition(selfieDataUrl);
  };

  const handleSelfieFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => runInstantFaceRecognition(event.target.result);
    reader.readAsDataURL(file);
  };

  const runInstantFaceRecognition = async (selfieSrc) => {
    setUserSelfie(selfieSrc);
    setIsScanning(true);
    setHasSearched(false);
    setScanStatus('Reading facial geometry...');
    setErrorMessage('');

    try {
      let faceapi = faceapiRef.current;
      if (!faceapi) {
        faceapi = await import('@vladmandic/face-api');
        faceapiRef.current = faceapi;
      }

      const selfieImg = new Image();
      selfieImg.src = selfieSrc;
      await new Promise((r) => (selfieImg.onload = r));

      let userDetection = await faceapi
        .detectSingleFace(selfieImg, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.40 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!userDetection) {
        userDetection = await faceapi
          .detectSingleFace(selfieImg, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.30 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
      }

      if (!userDetection) {
        alert('No clear face detected in your selfie. Please ensure good lighting and look directly at the camera.');
        setIsScanning(false);
        return;
      }

      setScanStatus('Comparing facial features...');
      const { data: dbRecords, error } = await supabase.from('photo_descriptors').select('*');

      if (error || !dbRecords || dbRecords.length === 0) {
        setErrorMessage('Gallery database is currently empty.');
        setIsScanning(false);
        setHasSearched(true);
        return;
      }

      const userDescriptor = userDetection.descriptor;
      const scoredMatches = [];

      // 0.46 থ্রেশহোল্ড অন্য কোনো মেয়ের ছবি আসা বন্ধ করবে এবং অ্যাকুরেট ছবি আনবে
      const STRICT_THRESHOLD = 0.46;

      for (const item of dbRecords) {
        let facesInPhoto = item.descriptors;

        if (typeof facesInPhoto === 'string') {
          try {
            facesInPhoto = JSON.parse(facesInPhoto);
          } catch (e) {
            facesInPhoto = [];
          }
        }

        if (!Array.isArray(facesInPhoto) || facesInPhoto.length === 0) continue;

        if (facesInPhoto.length === 128 && typeof facesInPhoto[0] === 'number') {
          facesInPhoto = [facesInPhoto];
        }

        let bestDistance = 1.0;

        for (const faceArr of facesInPhoto) {
          if (!faceArr || !Array.isArray(faceArr) || faceArr.length !== 128) continue;

          const photoDescriptor = new Float32Array(faceArr);
          const dist = faceapi.euclideanDistance(userDescriptor, photoDescriptor);

          if (dist < bestDistance) bestDistance = dist;
        }

        if (bestDistance < STRICT_THRESHOLD) {
          scoredMatches.push({ ...item, distance: bestDistance });
        }
      }

      scoredMatches.sort((a, b) => a.distance - b.distance);

      try {
        sessionStorage.setItem('find_photos_matches', JSON.stringify(scoredMatches));
        sessionStorage.setItem('find_photos_selfie', selfieSrc);
      } catch (e) {}

      setMatchedPhotos(scoredMatches);
      setIsScanning(false);
      setHasSearched(true);
      window.history.pushState({ modal: 'results' }, '');
    } catch (err) {
      console.error(err);
      alert('Recognition Error: ' + err.message);
      setIsScanning(false);
    }
  };

  const handleDirectDriveDownload = (e, photo) => {
    if (e) e.stopPropagation();
    const photoId = photo?.drive_file_id || photo?.id;
    if (!photoId) return;

    const directDownloadUrl = `https://drive.usercontent.google.com/download?id=${photoId}&export=download&authuser=0&confirm=t`;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = directDownloadUrl;
    document.body.appendChild(iframe);

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 60000);
  };

  const openPhotoPreview = (index) => {
    setPreviewIndex(index);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    window.history.pushState({ modal: 'preview' }, '');
  };

  const closePhotoPreview = () => {
    if (window.history.state?.modal === 'preview') {
      window.history.back();
    } else {
      setPreviewIndex(null);
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    }
  };

  const showNextPhoto = useCallback((e) => {
    if (e) e.stopPropagation();
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setPreviewIndex((prev) => (prev + 1 < matchedPhotos.length ? prev + 1 : 0));
  }, [matchedPhotos.length]);

  const showPrevPhoto = useCallback((e) => {
    if (e) e.stopPropagation();
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setPreviewIndex((prev) => (prev - 1 >= 0 ? prev - 1 : matchedPhotos.length - 1));
  }, [matchedPhotos.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (previewIndex === null) return;
      if (e.key === 'ArrowRight') showNextPhoto();
      if (e.key === 'ArrowLeft') showPrevPhoto();
      if (e.key === 'Escape') closePhotoPreview();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, showNextPhoto, showPrevPhoto]);

  const handleZoomIn = (e) => {
    if (e) e.stopPropagation();
    setZoomLevel((prev) => Math.min(prev + 0.4, 4.5));
  };

  const handleZoomOut = (e) => {
    if (e) e.stopPropagation();
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.4, 1.0);
      if (next === 1) setPanPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = (e) => {
    if (e) e.stopPropagation();
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleWheelZoom = (e) => {
    e.preventDefault();
    const zoomStep = 0.25;
    if (e.deltaY < 0) {
      setZoomLevel((prev) => Math.min(prev + zoomStep, 4.5));
    } else {
      setZoomLevel((prev) => {
        const next = Math.max(prev - zoomStep, 1.0);
        if (next === 1) setPanPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleMouseDown = (e) => {
    if (zoomLevel <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panPosition.x,
      y: e.clientY - panPosition.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoomLevel <= 1) return;
    e.preventDefault();
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (zoomLevel <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.touches[0].clientX - panPosition.x,
      y: e.touches[0].clientY - panPosition.y
    };
  };

  const handleTouchMove = (e) => {
    if (!isDragging || zoomLevel <= 1 || e.touches.length !== 1) return;
    setPanPosition({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y
    });
  };

  const bgImage = siteConfig?.hero_bg_image || '';
  const activePreviewPhoto = previewIndex !== null ? matchedPhotos[previewIndex] : null;

  return (
    <div className="relative min-h-screen w-full font-serif text-[#2d2926] flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden bg-stone-900">
      {bgImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105 filter blur-xs brightness-[0.75] transition-opacity duration-500"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70 pointer-events-none" />

      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur-md text-white text-xs tracking-wider uppercase font-sans font-semibold transition shadow">
          ← Back
        </Link>
      </div>

      <div className="relative z-10 max-w-xl w-full text-center px-6 py-10 sm:px-12 sm:py-14 rounded-3xl bg-white/75 backdrop-blur-xl border border-white/60 shadow-2xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 border border-white/80 text-[11px] font-sans font-semibold tracking-widest uppercase text-stone-700 mb-6 shadow-xs">
          <span>♡</span>
          <span>{siteConfig?.bride || 'Bride'} & {siteConfig?.groom || 'Groom'}</span>
          <span>•</span>
          <span>{siteConfig?.date_label || siteConfig?.year_label || 'Wedding'}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-normal tracking-tight text-stone-900 mb-4 leading-tight">
          Welcome to Our <br />
          <span className="italic font-light">Wedding Gallery</span>
        </h1>

        <p className="text-xs sm:text-sm font-sans font-normal text-stone-600 max-w-md mx-auto leading-relaxed mb-6">
          Take a selfie to scan and download your original high-resolution wedding photos instantly.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-6 font-sans">
          <button onClick={startCamera} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#c29d68] hover:bg-[#b08b56] text-white text-sm font-semibold tracking-wide transition shadow-md cursor-pointer active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span>Camera</span>
          </button>

          <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-sm font-semibold tracking-wide transition shadow-sm cursor-pointer active:scale-95">
            <svg className="w-5 h-5 text-stone-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span>Upload</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleSelfieFileUpload} />
          </label>
        </div>
      </div>

      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-[#1c1917]/95 backdrop-blur-md flex flex-col justify-between p-6 sm:p-10">
          <div className="flex items-center justify-between w-full max-w-3xl mx-auto">
            <h3 className="text-lg font-serif text-stone-200">Capture Face</h3>
            <button onClick={() => window.history.back()} className="text-stone-400 hover:text-white p-2 text-2xl cursor-pointer">✕</button>
          </div>

          <div className="relative w-full max-w-sm sm:max-w-md h-[460px] mx-auto rounded-3xl overflow-hidden bg-black flex items-center justify-center shadow-2xl border border-stone-800">
            {cameraStarting && <p className="text-stone-400 font-sans text-sm animate-pulse">Starting...</p>}
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              <div className="w-56 sm:w-64 h-72 sm:h-80 border-2 border-dashed border-white/80 rounded-[50%]" />
            </div>
          </div>

          <div className="text-center max-w-sm mx-auto space-y-4">
            <button onClick={handleCaptureSelfie} disabled={cameraStarting} className="h-14 w-14 rounded-full bg-[#c29d68] hover:bg-[#b08b56] text-white flex items-center justify-center text-xl shadow-xl transition cursor-pointer mx-auto active:scale-95 disabled:opacity-50">
              📷
            </button>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white text-center">
          <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-amber-400 p-1 mb-6 shadow-2xl">
            {userSelfie && <img src={userSelfie} alt="" className="w-full h-full object-cover rounded-full" />}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-400/40 to-transparent animate-pulse" />
          </div>
          <div className="h-1.5 w-44 bg-stone-800 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-[#c29d68] animate-pulse w-full" />
          </div>
          <h3 className="text-xl font-serif">Finding Your Moments...</h3>
          <p className="text-xs font-sans text-stone-400 mt-2">{scanStatus}</p>
        </div>
      )}

      {hasSearched && (
        <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-xl flex flex-col p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-6xl w-full mx-auto flex items-center justify-between border-b border-stone-800 pb-4 mb-4 text-white">
            <div>
              <h2 className="text-xl sm:text-2xl font-serif">Moments ({matchedPhotos.length})</h2>
              <p className="text-[11px] font-sans text-stone-400 mt-0.5">Verified Face Matches</p>
            </div>

            <div className="flex items-center gap-3 font-sans">
              <button onClick={handleResetSearch} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-800/80 hover:bg-stone-700 border border-stone-700 text-stone-200 hover:text-white text-xs font-medium cursor-pointer shadow transition active:scale-95">
                <span>Scan New Selfie</span>
              </button>
              <button onClick={handleResetSearch} className="h-8 w-8 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center text-xl cursor-pointer">
                ✕
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="max-w-6xl w-full mx-auto mb-6 p-4 rounded-xl border text-xs font-sans font-medium text-center bg-rose-950/80 border-rose-800 text-rose-200">
              {errorMessage}
            </div>
          )}

          {matchedPhotos.length > 0 ? (
            <div className="max-w-6xl w-full mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-12">
              {matchedPhotos.map((photo, index) => {
                const photoId = photo.drive_file_id || photo.id || index;
                return (
                  <div key={photoId} onClick={() => openPhotoPreview(index)} className="relative group rounded-2xl overflow-hidden bg-stone-900 border border-stone-800 aspect-square shadow-lg cursor-pointer">
                    <img
                      src={photo.image_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex items-end justify-center gap-3">
                      <button 
                        type="button" 
                        onClick={() => openPhotoPreview(index)} 
                        className="h-10 w-10 rounded-full bg-white/95 hover:bg-white text-stone-900 flex items-center justify-center shadow-lg cursor-pointer transition active:scale-90"
                        title="View Photo"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /></svg>
                      </button>
                      <button 
                        type="button" 
                        onClick={(e) => handleDirectDriveDownload(e, photo)} 
                        className="h-10 w-10 rounded-full bg-[#c29d68] hover:bg-[#b08b56] text-white flex items-center justify-center shadow-lg cursor-pointer transition active:scale-90"
                        title="Download Original (High Quality)"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-stone-400 py-16">
              <span className="text-4xl mb-3">🔍</span>
              <p className="text-base font-serif text-stone-300">No matching photos found</p>
              <p className="text-xs font-sans mt-1">Make sure you are facing the camera directly in good lighting.</p>
            </div>
          )}
        </div>
      )}

      {activePreviewPhoto && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-between p-4 sm:p-6 select-none" 
          onClick={closePhotoPreview}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          <div className="w-full max-w-5xl flex items-center justify-between text-white z-30" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs font-sans text-stone-400 bg-stone-900/80 px-3 py-1.5 rounded-full border border-stone-800">
              {previewIndex + 1} / {matchedPhotos.length}
            </span>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleZoomOut} 
                className="h-10 w-10 rounded-full bg-stone-800/90 hover:bg-stone-700 text-white flex items-center justify-center text-lg cursor-pointer shadow active:scale-95 transition"
                title="Zoom Out"
              >
                －
              </button>
              
              <button 
                onClick={handleResetZoom} 
                className="h-10 w-10 rounded-full bg-stone-800/90 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center cursor-pointer shadow active:scale-95 transition"
                title="Reset Zoom"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
              </button>

              <button 
                onClick={handleZoomIn} 
                className="h-10 w-10 rounded-full bg-stone-800/90 hover:bg-stone-700 text-white flex items-center justify-center text-lg cursor-pointer shadow active:scale-95 transition"
                title="Zoom In"
              >
                ＋
              </button>

              <button 
                type="button" 
                onClick={(e) => handleDirectDriveDownload(e, activePreviewPhoto)} 
                className="h-10 px-4 rounded-full bg-[#c29d68] hover:bg-[#b08b56] text-white flex items-center gap-1.5 text-xs font-sans font-semibold shadow ml-2 cursor-pointer active:scale-95 transition"
                title="Download Original High Quality"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span className="hidden sm:inline">Download</span>
              </button>

              <button 
                onClick={closePhotoPreview} 
                className="h-10 w-10 rounded-full bg-stone-800/90 hover:bg-stone-700 text-white flex items-center justify-center text-lg cursor-pointer shadow ml-2 active:scale-95 transition"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          <div 
            className="relative flex-1 w-full flex items-center justify-center overflow-hidden p-2"
            onWheel={handleWheelZoom}
          >
            {matchedPhotos.length > 1 && (
              <button
                type="button"
                onClick={showPrevPhoto}
                className="absolute left-2 sm:left-6 z-20 h-12 w-12 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center text-2xl shadow-xl transition cursor-pointer active:scale-90"
                title="Previous Photo"
              >
                ‹
              </button>
            )}

            <div 
              className="w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={activePreviewPhoto.image_url} 
                alt="" 
                referrerPolicy="no-referrer" 
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                style={{ 
                  transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                  cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  transition: isDragging ? 'none' : 'transform 0.12s ease-out'
                }} 
                className="max-h-[82vh] max-w-[88vw] object-contain select-none shadow-2xl rounded-lg" 
                draggable={false}
              />
            </div>

            {matchedPhotos.length > 1 && (
              <button
                type="button"
                onClick={showNextPhoto}
                className="absolute right-2 sm:right-6 z-20 h-12 w-12 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/20 flex items-center justify-center text-2xl shadow-xl transition cursor-pointer active:scale-90"
                title="Next Photo"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}