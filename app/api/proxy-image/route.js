import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return new NextResponse('File ID missing', { status: 400 });
  }

  try {
    // গুগল ড্রাইভের বড় ফাইলের (১০ MB+) ভাইরাস স্ক্যান বাইপাস নিশ্চিত করতে confirm=t ও uuid প্যারামিটার
    const directDownloadUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;

    let response = await fetch(directDownloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    // যদি গুগল কুকি বা রিডাইরেক্ট চায়, তবে ড্রাইভের অথরাইজড স্ট্রিম থেকে র' ডাটা নেওয়া হবে
    if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
      const fallbackUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
      response = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="wedding_original_${fileId}.jpg"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('Error fetching original Drive photo:', error);
    return new NextResponse('Failed to fetch full size photo', { status: 500 });
  }
}