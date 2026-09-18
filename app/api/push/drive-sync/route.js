import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId');

  if (!folderId) {
    return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
  }

  try {
    // গুগল ড্রাইভ পাবলিক ফোল্ডার ভিউ ফেচ
    const driveUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
    const res = await fetch(driveUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();

    // ফাইল আইডিগুলো এক্সট্র্যাক্ট করা
    const matches = [...html.matchAll(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/g)];
    const fileIds = [...new Set(matches.map(m => m[1]))];

    const photos = fileIds.map(id => ({
      drive_file_id: id,
      // অরিজিনাল হাই-রেজ ভিউ এবং প্রিভিউ লিংক
      image_url: `https://lh3.googleusercontent.com/u/0/d/${id}=w1920`,
      download_url: `https://drive.google.com/uc?export=download&id=${id}`
    }));

    return NextResponse.json({ success: true, photos });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}