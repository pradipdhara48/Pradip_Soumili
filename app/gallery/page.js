'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

function getDeviceInfo() {
  if (typeof window === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS (iPhone)';
  else if (/Windows/i.test(ua)) os = 'Windows PC';
  else if (/Macintosh/i.test(ua)) os = 'Mac OS';

  let browser = 'Unknown Browser';
  if (/Chrome/i.test(ua) && !/Edge|OPR/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edge/i.test(ua)) browser = 'Edge';

  return `${os} (${browser})`;
}

export default function GalleryFeed() {
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState({});
  const [comments, setComments] = useState([]);
  const [myCommentIds, setMyCommentIds] = useState([]);
  const [likedCommentIds, setLikedCommentIds] = useState({});
  const [animatingPostId, setAnimatingPostId] = useState(null);

  const [savedUserName, setSavedUserName] = useState('');
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [tempName, setTempName] = useState('');
  const [activePostId, setActivePostId] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const localLikes = localStorage.getItem('user_liked_posts');
    if (localLikes) {
      try { setLikedPosts(JSON.parse(localLikes)); } catch (e) {}
    }

    const localCommentLikes = localStorage.getItem('user_liked_comments');
    if (localCommentLikes) {
      try { setLikedCommentIds(JSON.parse(localCommentLikes)); } catch (e) {}
    }

    const localName = localStorage.getItem('guest_comment_name');
    if (localName) setSavedUserName(localName);

    const localMyComments = localStorage.getItem('user_posted_comment_ids');
    if (localMyComments) {
      try { setMyCommentIds(JSON.parse(localMyComments)); } catch (e) {}
    }

    fetchPosts();
    fetchComments();

    // পোস্ট রিয়েলটাইম চ্যানেল: ক্যাপশন এডিট, লাইক পরিবর্তন ও পোস্ট ডিলিট হ্যান্ডলার
    const postChannel = supabase
      .channel('public:posts_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((prev) => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((prev) =>
          prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
        );
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
      })
      .subscribe();

    // কমেন্ট রিয়েলটাইম চ্যানেল: নতুন কমেন্ট, অ্যাপ্রুভাল, রিপ্লাই, লাইক ও ডিলিট হ্যান্ডলার
    const commentChannel = supabase
      .channel('public:comments_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
        setComments((prev) => {
          if (prev.some((c) => c.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments' }, (payload) => {
        setComments((prev) =>
          prev.map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c))
        );
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, (payload) => {
        setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postChannel);
      supabase.removeChannel(commentChannel);
    };
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  const fetchComments = async () => {
    const { data } = await supabase.from('comments').select('*').order('created_at', { ascending: true });
    if (data) setComments(data);
  };

  const handleToggleLike = async (postId, currentLikes) => {
    const isCurrentlyLiked = !!likedPosts[postId];
    const newLikesCount = isCurrentlyLiked ? Math.max(0, (currentLikes || 0) - 1) : (currentLikes || 0) + 1;

    let currentLiker = savedUserName;
    if (!isCurrentlyLiked && !currentLiker) {
      const promptName = window.prompt("What's your name?");
      if (promptName && promptName.trim()) {
        currentLiker = promptName.trim();
        setSavedUserName(currentLiker);
        localStorage.setItem('guest_comment_name', currentLiker);
      }
    }

    const updatedLikes = { ...likedPosts };
    if (isCurrentlyLiked) delete updatedLikes[postId];
    else updatedLikes[postId] = true;

    setLikedPosts(updatedLikes);
    localStorage.setItem('user_liked_posts', JSON.stringify(updatedLikes));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newLikesCount } : p));

    await supabase.from('posts').update({ likes: newLikesCount }).eq('id', postId);

    if (!isCurrentlyLiked) {
      await supabase.from('admin_notifications').insert([{
        type: 'like',
        title: 'New Like received! ❤️',
        description: `${currentLiker || 'Someone'} liked your photo. Total likes: ${newLikesCount}`,
        post_id: postId
      }]);

      try {
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'like',
            guestName: currentLiker || 'Someone',
            totalLikes: newLikesCount,
            url: '/adminlogin'
          })
        });
      } catch (err) {}
    }
  };

  const handleToggleCommentLike = async (commentId, currentLikes) => {
    const isLiked = !!likedCommentIds[commentId];
    const newCount = isLiked ? Math.max(0, (currentLikes || 0) - 1) : (currentLikes || 0) + 1;

    const updatedMap = { ...likedCommentIds };
    if (isLiked) {
      delete updatedMap[commentId];
    } else {
      updatedMap[commentId] = true;
    }

    setLikedCommentIds(updatedMap);
    localStorage.setItem('user_liked_comments', JSON.stringify(updatedMap));

    setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: newCount } : c));
    await supabase.from('comments').update({ likes: newCount }).eq('id', commentId);
  };

  const handleDoubleClick = (postId, currentLikes) => {
    setAnimatingPostId(postId);
    setTimeout(() => setAnimatingPostId(null), 900);
    if (!likedPosts[postId]) handleToggleLike(postId, currentLikes);
  };

  const handleOpenCommentBox = (postId) => {
    setActivePostId(postId);
    if (!savedUserName) {
      setNameModalOpen(true);
    }
  };

  const handleSaveName = (e) => {
    e.preventDefault();
    if (!tempName.trim()) return alert('Please enter your name');
    const trimmed = tempName.trim();
    setSavedUserName(trimmed);
    localStorage.setItem('guest_comment_name', trimmed);
    setNameModalOpen(false);
  };

  const handleAddComment = async (postId) => {
    const msg = commentInputs[postId]?.trim();
    if (!msg) return;

    if (!savedUserName) {
      setActivePostId(postId);
      setNameModalOpen(true);
      return;
    }

    setSubmitting(true);
    let ip = 'Local IP';
    let location = 'Localhost';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const geo = await res.json();
        ip = geo.ip || ip;
        location = `${geo.city || ''}, ${geo.region || ''}, ${geo.country_name || ''}`.replace(/^, |, $/g, '');
      }
    } catch (e) {}

    const device = getDeviceInfo();

    const { data: insertedData, error: commentError } = await supabase.from('comments').insert([
      {
        post_id: postId,
        name: savedUserName,
        message: msg,
        device,
        ip_address: ip,
        location,
        approved: false,
        likes: 0
      }
    ]).select();

    if (commentError) {
      alert('Failed to post comment: ' + (commentError.message || ''));
      setSubmitting(false);
      return;
    }

    if (insertedData && insertedData[0]) {
      const newCommentObj = insertedData[0];
      const updatedIds = [...myCommentIds, newCommentObj.id];
      setMyCommentIds(updatedIds);
      localStorage.setItem('user_posted_comment_ids', JSON.stringify(updatedIds));
      setComments(prev => {
        if (prev.some(c => c.id === newCommentObj.id)) return prev;
        return [...prev, newCommentObj];
      });
    }

    await supabase.from('admin_notifications').insert([{
      type: 'comment',
      title: `New Comment from ${savedUserName} 💬`,
      description: `"${msg.slice(0, 50)}"`,
      post_id: postId
    }]);

    const totalCommentsOnPost = comments.filter(c => c.post_id === postId).length + 1;

    try {
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'comment',
          guestName: savedUserName,
          message: msg.slice(0, 80),
          totalComments: totalCommentsOnPost,
          url: '/adminlogin'
        })
      });
    } catch (err) {}

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    setSubmitting(false);
  };

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif', minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <style>{`
        @keyframes instaHeartPop {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          30% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.95; }
          60% { transform: translate(-50%, -50%) scale(1); opacity: 0.95; }
          100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
        }
        .insta-heart-anim { animation: instaHeartPop 0.85s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .action-btn:active { transform: scale(1.2); }
      `}</style>

      {/* Name Input Modal */}
      {nameModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '380px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#111827', fontWeight: 'bold' }}>👋 What's your name?</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#6b7280' }}>Please enter your name to post wishes and comments.</p>
            <form onSubmit={handleSaveName}>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Rahul Sharma"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setNameModalOpen(false)}
                  style={{ padding: '8px 16px', border: '1px solid #d1d5db', background: '#fff', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', margin: 0, color: '#111', fontWeight: 'bold' }}>📸 Moments & Stories</h1>
        <Link href="/" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: '600', fontSize: '14px' }}>← Back to Home</Link>
      </div>

      {/* Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {posts.map((post) => {
          const isLiked = !!likedPosts[post.id];
          const visibleComments = comments.filter(c => 
            c.post_id === post.id && 
            !c.parent_id && 
            (c.approved === true || myCommentIds.includes(c.id) || c.is_admin === true)
          );
          const isCommentOpen = activePostId === post.id;

          return (
            <div key={post.id} style={{ border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden', background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              
              {/* Photo Area */}
              <div 
                onDoubleClick={() => handleDoubleClick(post.id, post.likes)}
                style={{ position: 'relative', width: '100%', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', userSelect: 'none' }}
              >
                <img src={post.image_url} alt="" style={{ width: '100%', height: 'auto', maxHeight: '75vh', objectFit: 'contain', display: 'block' }} />
                {animatingPostId === post.id && (
                  <div className="insta-heart-anim" style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none', zIndex: 10, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
                    <svg viewBox="0 0 24 24" width="80" height="80" fill="#ff2d55"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                  <button onClick={() => handleToggleLike(post.id, post.likes)} className="action-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                    {isLiked ? (
                      <svg viewBox="0 0 24 24" width="26" height="26" fill="#ff2d55"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#262626" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                    )}
                  </button>

                  <button onClick={() => handleOpenCommentBox(post.id)} className="action-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                    <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </button>
                </div>

                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937', marginBottom: '6px' }}>
                  {post.likes || 0} {post.likes === 1 ? 'like' : 'likes'}
                </div>

                {/* পোস্ট ক্যাপশন (রিয়েলটাইমে চেঞ্জ হবে) */}
                {post.caption && <p style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '14px', lineHeight: '1.5' }}>{post.caption}</p>}

                {/* Comment Section */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                    {visibleComments.map((c) => {
                      const isCommentLiked = !!likedCommentIds[c.id];
                      const childReplies = comments.filter(r => r.parent_id === c.id);
                      const directAdminReply = c.admin_reply || c.reply;

                      return (
                        <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', lineHeight: '1.4' }}>
                            <div>
                              <strong style={{ color: '#111827', marginRight: '6px' }}>{c.name}</strong>
                              <span style={{ color: '#4b5563' }}>{c.message}</span>
                            </div>

                            <button
                              onClick={() => handleToggleCommentLike(c.id, c.likes)}
                              style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', color: isCommentLiked ? '#ff2d55' : '#9ca3af', fontSize: '12px' }}
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill={isCommentLiked ? "#ff2d55" : "none"} stroke={isCommentLiked ? "#ff2d55" : "currentColor"} strokeWidth="2">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                              <span>{c.likes || 0}</span>
                            </button>
                          </div>

                          {directAdminReply && (
                            <div style={{ marginLeft: '16px', paddingLeft: '8px', borderLeft: '2px solid #3b82f6', fontSize: '12px', color: '#1f2937', marginTop: '2px' }}>
                              <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold', marginRight: '6px', fontSize: '10px' }}>Admin</span>
                              <span>{directAdminReply}</span>
                            </div>
                          )}

                          {childReplies.map(reply => (
                            <div key={reply.id} style={{ marginLeft: '16px', paddingLeft: '8px', borderLeft: '2px solid #3b82f6', fontSize: '12px', color: '#1f2937', marginTop: '2px' }}>
                              <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold', marginRight: '6px', fontSize: '10px' }}>
                                {reply.is_admin ? 'Admin' : reply.name}
                              </span>
                              <span>{reply.message}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {visibleComments.length === 0 && (
                      <span 
                        onClick={() => handleOpenCommentBox(post.id)}
                        style={{ fontSize: '13px', color: '#9ca3af', cursor: 'pointer' }}
                      >
                        Add a comment...
                      </span>
                    )}
                  </div>

                  {isCommentOpen && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <input
                        type="text"
                        autoFocus
                        placeholder={`Commenting as ${savedUserName || 'Guest'}...`}
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(post.id); }}
                        style={{ flex: 1, padding: '8px 12px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', outline: 'none' }}
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={submitting}
                        style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        {submitting ? '...' : 'Post'}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}