'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function GalleryFeed() {
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState({});

  useEffect(() => {
    fetchPosts();

    // Realtime Listener: অ্যাডমিন কোনো পরিবর্তন করলে সাথে সাথে পেজ আপডেট হবে
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  const handleLike = async (postId, currentLikes) => {
    if (likedPosts[postId]) return;

    const newLikesCount = (currentLikes || 0) + 1;
    setLikedPosts(prev => ({ ...prev, [postId]: true }));

    await supabase
      .from('posts')
      .update({ likes: newLikesCount })
      .eq('id', postId);
  };

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '24px', margin: 0, color: '#111' }}>📸 Moments & Stories</h1>
        <Link href="/" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 'bold' }}>← Back to Home</Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {posts.map((post) => (
          <div key={post.id} style={{ border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <img 
              src={post.image_url} 
              alt={post.caption || 'Photo'} 
              style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', display: 'block' }} 
            />
            <div style={{ padding: '16px' }}>
              <button
                onClick={() => handleLike(post.id, post.likes)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: 0,
                  marginBottom: '10px'
                }}
              >
                {likedPosts[post.id] ? '❤️' : '🤍'}
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#374151' }}>{post.likes || 0}</span>
              </button>
              {post.caption && <p style={{ margin: 0, color: '#1f2937', fontSize: '15px', lineHeight: '1.5' }}>{post.caption}</p>}
            </div>
          </div>
        ))}
        {posts.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af' }}>No moments shared yet.</p>}
      </div>
    </main>
  );
}