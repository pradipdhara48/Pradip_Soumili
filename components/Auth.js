'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxSize = 1920; 

        if (width > height && width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        } else if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(newFile);
          },
          'image/jpeg',
          0.95
        );
      };
    };
  });
};

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    [784, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + (idx * 0.12);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.8, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  } catch (e) {}
};

function urlBase64ToUint8Array(base64String) {
  if (!base64String) return new Uint8Array();
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function Auth() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [activeMenu, setActiveMenu] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [selectedPostForDetail, setSelectedPostForDetail] = useState(null);
  const [replyInputs, setReplyInputs] = useState({});
  const [incomingAlert, setIncomingAlert] = useState(null);

  // অ্যাডমিন কমেন্ট লাইক ট্র্যাকিং স্টেট
  const [adminLikedCommentIds, setAdminLikedCommentIds] = useState({});

  // ক্যাপশন এডিট করার স্টেট
  const [editingCaptionId, setEditingCaptionId] = useState(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [config, setConfig] = useState({
    bride: '', groom: '', date: '', date_label: '', year_label: '', tagline: '', location: '',
    ceremony_title: '', ceremony_time: '', ceremony_venue: '', ceremony_address: '',
    reception_title: '', reception_time: '', reception_venue: '', reception_address: '',
    drive_note: '', drive_link: '', story: [],
    home_gallery_1: '', home_gallery_2: '', home_gallery_3: '',
    map_link: '', invitation_cards: [], whatsapp_number: '',
    about_image_1: '', about_image_2: '', hero_bg_image: ''
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const [posts, setPosts] = useState([]);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [rsvps, setRsvps] = useState([]);
  const [adminComments, setAdminComments] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [clearingDB, setClearingDB] = useState(false);

  // মডাল ও ড্রয়ার স্টেট ট্র্যাকিং রেফারেন্স (যাতে useEffect dependency সাইজ স্থায়ী খালি [] থাকে)
  const selectedPostRef = useRef(selectedPostForDetail);
  const isNotifDrawerRef = useRef(isNotifDrawerOpen);

  useEffect(() => {
    selectedPostRef.current = selectedPostForDetail;
  }, [selectedPostForDetail]);

  useEffect(() => {
    isNotifDrawerRef.current = isNotifDrawerOpen;
  }, [isNotifDrawerOpen]);

  const registerDeviceForPush = async (userEmail) => {
    try {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') return;

        const reg = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey)
          });
        }

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub, email: userEmail })
        });
      }
    } catch (err) {}
  };

  // ব্রাউজার ব্যাক বাটন ও হ্যাশ নেভিগেশন হ্যান্ডলার (ডিপেন্ডেন্সি ছাড়া নিরাপদ)
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    const savedMenu = localStorage.getItem('activeAdminMenu');

    if (hash) {
      setActiveMenu(hash);
    } else if (savedMenu) {
      setActiveMenu(savedMenu);
      if (typeof window !== 'undefined') {
        window.history.replaceState({ menu: savedMenu }, '', `#${savedMenu}`);
      }
    } else if (typeof window !== 'undefined') {
      window.history.replaceState({ menu: 'overview' }, '', '#overview');
    }

    const handlePopState = (event) => {
      // যদি ছবি ডিটেইল মডাল খোলা থাকে, ব্যাক চাপলে শুধু মডাল বন্ধ হবে
      if (selectedPostRef.current) {
        setSelectedPostForDetail(null);
        return;
      }
      // যদি নোটিফিকেশন ড্রয়ার খোলা থাকে, ব্যাক চাপলে ড্রয়ার বন্ধ হবে
      if (isNotifDrawerRef.current) {
        setIsNotifDrawerOpen(false);
        return;
      }

      // হিস্ট্রি থেকে আগের মেনুতে ফিরে যাওয়া
      if (event.state && event.state.menu) {
        setActiveMenu(event.state.menu);
        localStorage.setItem('activeAdminMenu', event.state.menu);
      } else {
        const currentHash = window.location.hash.replace('#', '') || 'overview';
        setActiveMenu(currentHash);
        localStorage.setItem('activeAdminMenu', currentHash);
      }
    };

    window.addEventListener('popstate', handlePopState);

    const savedAdminLikes = localStorage.getItem('admin_liked_comments');
    if (savedAdminLikes) {
      try {
        setAdminLikedCommentIds(JSON.parse(savedAdminLikes));
      } catch (e) {}
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleMenuChange = (menu) => {
    if (menu === activeMenu) return;
    setActiveMenu(menu);
    localStorage.setItem('activeAdminMenu', menu);
    setIsSidebarOpen(false);
    if (typeof window !== 'undefined') {
      window.history.pushState({ menu }, '', `#${menu}`);
    }
  };

  const handleOpenPostDetail = (post) => {
    setSelectedPostForDetail(post);
    if (typeof window !== 'undefined') {
      window.history.pushState({ modal: 'postDetail', menu: activeMenu }, '', `#${activeMenu}`);
    }
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAllData();
        fetchNotifications();
        registerDeviceForPush(session.user.email);
      }
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAllData();
        fetchNotifications();
        registerDeviceForPush(session.user.email);
      }
    });

    // ইন-অ্যাপ রিয়েলটাইম নোটিফিকেশন লিসেনার
    const notifChannel = supabase
      .channel('public:admin_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, (payload) => {
        const newNotif = payload.new;
        setNotifications(prev => [newNotif, ...prev]);
        playNotificationSound();
        setIncomingAlert(newNotif);
      })
      .subscribe();

    // কমেন্ট রিয়েলটাইম লিসেনার
    const commentChannel = supabase
      .channel('public:comments_admin_sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
        setAdminComments(prev => {
          if (prev.some(c => c.id === payload.new.id)) return prev;
          return [payload.new, ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'comments' }, (payload) => {
        setAdminComments(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, (payload) => {
        setAdminComments(prev => prev.filter(c => c.id !== payload.old.id));
      })
      .subscribe();

    // পোস্ট ও ফটো লাইক রিয়েলটাইম লিসেনার
    const postChannel = supabase
      .channel('public:posts_admin_sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(commentChannel);
      supabase.removeChannel(postChannel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setNotifications(data);
  };

  const fetchAllData = async () => {
    const { data: conf } = await supabase.from('site_settings').select('*').eq('id', 'main_config').single();
    if (conf) setConfig(conf);
    const { data: postData } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (postData) setPosts(postData || []);
    const { data: rsvpData } = await supabase.from('rsvps').select('*').order('created_at', { ascending: false });
    if (rsvpData) setRsvps(rsvpData || []);
    const { data: commentsData } = await supabase.from('comments').select('*').order('created_at', { ascending: false });
    if (commentsData) setAdminComments(commentsData || []);
  };

  const markNotificationsAsRead = async () => {
    await supabase.from('admin_notifications').update({ is_read: true }).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleOpenNotificationDetail = (notif) => {
    if (notif.post_id) {
      const targetPost = posts.find(p => p.id === notif.post_id);
      if (targetPost) {
        handleOpenPostDetail(targetPost);
        return;
      }
    }
    if (notif.type === 'rsvp') {
      handleMenuChange('rsvp');
      setIsNotifDrawerOpen(false);
    }
  };

  // অ্যাডমিন লাইক/ডিসলাইক টগল হ্যান্ডলার
  const handleCommentLikeToggle = async (commentId, currentLikes) => {
    const isLiked = Boolean(adminLikedCommentIds[commentId]);
    const newCount = isLiked ? Math.max(0, (currentLikes || 0) - 1) : (currentLikes || 0) + 1;

    const updatedLikes = { ...adminLikedCommentIds };
    if (isLiked) {
      delete updatedLikes[commentId];
    } else {
      updatedLikes[commentId] = true;
    }
    setAdminLikedCommentIds(updatedLikes);
    localStorage.setItem('admin_liked_comments', JSON.stringify(updatedLikes));

    setAdminComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: newCount } : c));
    await supabase.from('comments').update({ likes: newCount }).eq('id', commentId);
  };

  const handleSendReply = async (commentId) => {
    const replyText = replyInputs[commentId]?.trim();
    if (!replyText) return;

    await supabase.from('comments').update({ reply: replyText }).eq('id', commentId);
    setAdminComments(prev => prev.map(c => c.id === commentId ? { ...c, reply: replyText } : c));
    setReplyInputs(prev => ({ ...prev, [commentId]: '' }));
  };

  const handleStartEditCaption = (e, post) => {
    e.stopPropagation();
    setEditingCaptionId(post.id);
    setCaptionDraft(post.caption || '');
  };

  const handleSaveCaption = async (e, postId) => {
    e.stopPropagation();
    try {
      setSavingCaption(true);
      const { error } = await supabase.from('posts').update({ caption: captionDraft }).eq('id', postId);
      if (error) throw error;

      setPosts(prev => prev.map(p => p.id === postId ? { ...p, caption: captionDraft } : p));
      if (selectedPostForDetail?.id === postId) {
        setSelectedPostForDetail(prev => ({ ...prev, caption: captionDraft }));
      }
      setEditingCaptionId(null);
    } catch (err) {
      alert('Failed to update caption: ' + err.message);
    } finally {
      setSavingCaption(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    const { error } = await supabase.from('site_settings').upsert({ id: 'main_config', ...config });
    setSavingConfig(false);
    if (!error) alert('Website Details Updated Successfully! 🎉');
    else alert(error.message);
  };

  const handleImageUpload = async (e, field) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    try {
      setSavingConfig(true);
      let fileToUpload = selectedFile;
      let fileExt = selectedFile.name.split('.').pop();

      if (field !== 'hero_bg_image') {
        fileToUpload = await compressImage(selectedFile);
        fileExt = fileToUpload.name.split('.').pop();
      }

      const fileName = `${field}_${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('gallery-images').upload(filePath, fileToUpload);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('gallery-images').getPublicUrl(filePath);
      const newConfig = { ...config, [field]: publicUrl };
      setConfig(newConfig);
      await supabase.from('site_settings').upsert({ id: 'main_config', ...newConfig });
    } catch (err) { alert(err.message); } finally { setSavingConfig(false); }
  };

  const handleAddInvCard = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    try {
      setSavingConfig(true);
      const compressedFile = await compressImage(selectedFile);
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `inv_card_${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('gallery-images').upload(filePath, compressedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('gallery-images').getPublicUrl(filePath);
      const newCards = [...(config.invitation_cards || []), publicUrl];
      const newConfig = { ...config, invitation_cards: newCards };
      setConfig(newConfig);
      await supabase.from('site_settings').upsert({ id: 'main_config', ...newConfig });
    } catch (err) { alert(err.message); } finally { setSavingConfig(false); }
  };

  const handleUpdateInvCard = async (e, index) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    try {
      setSavingConfig(true);
      const compressedFile = await compressImage(selectedFile);
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `inv_card_${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('gallery-images').upload(filePath, compressedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('gallery-images').getPublicUrl(filePath);
      const newCards = [...(config.invitation_cards || [])];
      newCards[index] = publicUrl; 
      const newConfig = { ...config, invitation_cards: newCards };
      setConfig(newConfig);
      await supabase.from('site_settings').upsert({ id: 'main_config', ...newConfig });
    } catch (err) { alert(err.message); } finally { setSavingConfig(false); }
  };

  const handleRemoveInvCard = async (index) => {
    if(!confirm('Are you sure you want to remove this page?')) return;
    const newCards = (config.invitation_cards || []).filter((_, i) => i !== index);
    const newConfig = { ...config, invitation_cards: newCards };
    setConfig(newConfig);
    await supabase.from('site_settings').upsert({ id: 'main_config', ...newConfig });
  };

  const handleStoryChange = (index, field, value) => {
    const updatedStory = [...(config.story || [])];
    updatedStory[index][field] = value;
    setConfig({ ...config, story: updatedStory });
  };
  const addStoryTimeline = () => setConfig({ ...config, story: [...(config.story || []), { year: '2026', title: 'New Chapter', text: 'Write story here...' }] });
  const removeStoryTimeline = (index) => setConfig({ ...config, story: config.story.filter((_, i) => i !== index) });

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Please select a photo');
    try {
      setUploading(true);
      const compressedFile = await compressImage(file);
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('gallery-images').upload(filePath, compressedFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('gallery-images').getPublicUrl(filePath);
      const { error: dbError } = await supabase.from('posts').insert([{ image_url: publicUrl, caption, likes: 0 }]);
      if (dbError) throw dbError;
      setCaption(''); setFile(null); e.target.reset(); fetchAllData();
      alert('Photo Uploaded Successfully!');
    } catch (err) { alert(err.message); } finally { setUploading(false); }
  };

  const handleDeletePost = async (id, imageUrl) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    try {
      await supabase.from('posts').delete().eq('id', id);
      const pathParts = imageUrl.split('gallery-images/');
      if (pathParts[1]) await supabase.storage.from('gallery-images').remove([pathParts[1]]);
      setPosts(posts.filter(p => p.id !== id));
      if (selectedPostForDetail?.id === id) setSelectedPostForDetail(null);
    } catch (err) { alert('Failed to delete'); }
  };

  const toggleTableSelection = (tableName) => setSelectedTables(prev => prev.includes(tableName) ? prev.filter(t => t !== tableName) : [...prev, tableName]);

  const handleClearDatabase = async () => {
    if (selectedTables.length === 0) return alert("Please select at least one table to clear.");
    if (!window.confirm("⚠️ WARNING: This will permanently delete all data in the selected tables. Are you sure?")) return;

    setClearingDB(true);
    try {
      if (selectedTables.includes('posts')) {
        const { data: files } = await supabase.storage.from('gallery-images').list('uploads');
        if (files && files.length > 0) {
          const filePaths = files.map(x => `uploads/${x.name}`);
          await supabase.storage.from('gallery-images').remove(filePaths);
        }
        await supabase.from('posts').delete().not('id', 'is', null);
      }
      if (selectedTables.includes('rsvps')) await supabase.from('rsvps').delete().not('id', 'is', null);
      if (selectedTables.includes('comments')) await supabase.from('comments').delete().not('id', 'is', null);

      alert("Selected databases cleared successfully!");
      setSelectedTables([]); fetchAllData();
    } catch (err) { alert("Error: " + err.message); } finally { setClearingDB(false); }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true); 
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    setLoading(false);
  };

  const handleResetPasswordRequest = async (e) => {
    e.preventDefault();
    if (!email) return alert('Please enter your admin email address.');
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/adminlogin` : undefined,
    });
    setLoading(false);
    if (error) setMessage(error.message);
    else {
      alert('Password reset link has been sent to your email! Please check your inbox.');
      setIsResetMode(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return alert('Password must be at least 6 characters long.');
    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingPassword(false);
    if (error) alert(error.message);
    else { alert('Password updated successfully!'); setNewPassword(''); }
  };

  if (user) {
    const totalLikes = posts.reduce((acc, p) => acc + (p.likes || 0), 0);
    const totalGuests = rsvps.reduce((acc, r) => acc + (r.guests_count || 1), 0);
    const formattedDateForInput = config.date ? config.date.slice(0, 16) : '';
    const unreadCount = notifications.filter(n => !n.is_read).length;

    const postSpecificComments = selectedPostForDetail 
      ? adminComments.filter(c => c.post_id === selectedPostForDetail.id)
      : [];

    return (
      <div className="relative flex h-screen w-full bg-[#f1f5f9] text-[#1e293b] font-sans antialiased overflow-hidden">
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {incomingAlert && (
          <div className="fixed bottom-6 right-6 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 max-w-sm w-full animate-in slide-in-from-bottom duration-300">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔔</span>
                <h4 className="font-bold text-sm text-gray-800">New Notification</h4>
              </div>
              <button onClick={() => setIncomingAlert(null)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer">✕</button>
            </div>
            <p className="text-xs font-semibold text-gray-700 mt-2">{incomingAlert.title}</p>
            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{incomingAlert.description}</p>
            <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setIncomingAlert(null)} className="px-3 py-1.5 text-xs text-gray-500 font-semibold hover:bg-gray-100 rounded-lg cursor-pointer">Close</button>
              <button type="button" onClick={() => { setIncomingAlert(null); setIsNotifDrawerOpen(true); markNotificationsAsRead(); handleOpenNotificationDetail(incomingAlert); }} className="px-4 py-1.5 text-xs bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow cursor-pointer">View</button>
            </div>
          </div>
        )}

        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1c2434] text-[#dee4ee] flex flex-col justify-between shrink-0 shadow-2xl transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div>
            <div className="p-6 border-b border-[#2e3a47] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow">⚡</div>
                <h1 className="text-xl font-bold tracking-wide text-white">AdminPanel</h1>
              </div>
              <button type="button" onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white p-1 cursor-pointer">✕</button>
            </div>
            <nav className="p-4 space-y-1">
              <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Menu</p>
              <button onClick={() => handleMenuChange('overview')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'overview' ? 'bg-[#333a48] text-white shadow-sm' : 'text-gray-400 hover:bg-[#333a48]/50 hover:text-white'}`}>📊 Dashboard Overview</button>
              <button onClick={() => handleMenuChange('couple_hero')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'couple_hero' ? 'bg-[#333a48] text-white shadow-sm' : 'text-gray-400 hover:bg-[#333a48]/50 hover:text-white'}`}>💑 Couple & Homepage</button>
              <button onClick={() => handleMenuChange('events')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'events' ? 'bg-[#333a48] text-white shadow-sm' : 'text-gray-400 hover:bg-[#333a48]/50 hover:text-white'}`}>📅 Ceremony & Reception</button>
              <button onClick={() => handleMenuChange('story')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'story' ? 'bg-[#333a48] text-white shadow-sm' : 'text-gray-400 hover:bg-[#333a48]/50 hover:text-white'}`}>📖 Our Love Story</button>
              <button onClick={() => handleMenuChange('gallery')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'gallery' ? 'bg-[#333a48] text-white shadow-sm' : 'text-gray-400 hover:bg-[#333a48]/50 hover:text-white'}`}><div className="flex items-center gap-3">📸 Live Feed & Photos</div><span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full text-white">{posts.length}</span></button>
              <button onClick={() => handleMenuChange('rsvp')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'rsvp' ? 'bg-[#333a48] text-white shadow-sm' : 'text-gray-400 hover:bg-[#333a48]/50 hover:text-white'}`}><div className="flex items-center gap-3">💌 RSVP Guests</div><span className="text-xs bg-emerald-600 px-2 py-0.5 rounded-full text-white">{rsvps.length}</span></button>
              <button onClick={() => handleMenuChange('comments')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'comments' ? 'bg-[#333a48] text-white shadow-sm' : 'text-gray-400 hover:bg-[#333a48]/50 hover:text-white'}`}><div className="flex items-center gap-3">💬 Comments & Logs</div><span className="text-xs bg-indigo-600 px-2 py-0.5 rounded-full text-white">{adminComments.length}</span></button>
              <button onClick={() => handleMenuChange('database')} className={`w-full mt-4 flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'database' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-400 hover:bg-rose-500/20 hover:text-rose-300'}`}><div className="flex items-center gap-3">🧹 Clean Database</div></button>
            </nav>
          </div>
          
          <div className="relative p-4 border-t border-[#2e3a47]">
            {isUserMenuOpen && (
              <div className="absolute bottom-full left-4 mb-2 w-56 bg-[#2a3441] border border-[#3a4754] rounded-xl shadow-2xl overflow-hidden z-50">
                <button onClick={() => { handleMenuChange('settings'); setIsUserMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#333a48] transition-colors cursor-pointer">⚙️ Account Settings</button>
                <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-rose-400 hover:text-white hover:bg-rose-600 transition-colors cursor-pointer">🚪 Sign Out</button>
              </div>
            )}
            <div onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#2a3441] cursor-pointer transition-colors">
              <div className="h-9 w-9 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 uppercase">{user.email.charAt(0)}</div>
              <div className="overflow-hidden flex-1"><p className="text-xs font-semibold text-white truncate">{user.email}</p><p className="text-[10px] text-emerald-400">● Online Admin</p></div>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 shrink-0">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 md:hidden cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="text-base sm:text-lg font-bold text-gray-800 capitalize truncate">{activeMenu.replace('_', ' ')}</h2>
            </div>

            <div className="flex items-center gap-4">
              <a href="/" target="_blank" className="text-xs font-semibold text-blue-600 hover:underline shrink-0 hidden sm:block">↗ View Live Website</a>
              <button 
                type="button"
                onClick={() => { setIsNotifDrawerOpen(true); markNotificationsAsRead(); }}
                className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-5 w-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#f1f5f9]">
            {activeMenu === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  <div onClick={() => handleMenuChange('gallery')} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-blue-300 transition group">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase group-hover:text-blue-600 transition">Total Photos</p>
                      <h3 className="text-2xl font-bold mt-1 text-gray-800">{posts.length}</h3>
                    </div>
                    <span className="text-2xl p-3 bg-blue-50 group-hover:bg-blue-100 rounded-xl transition">📸</span>
                  </div>

                  <div onClick={() => handleMenuChange('gallery')} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-rose-300 transition group">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase group-hover:text-rose-600 transition">Total Likes</p>
                      <h3 className="text-2xl font-bold mt-1 text-rose-500">{totalLikes}</h3>
                    </div>
                    <span className="text-2xl p-3 bg-rose-50 group-hover:bg-rose-100 rounded-xl transition">❤️</span>
                  </div>

                  <div onClick={() => handleMenuChange('rsvp')} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-emerald-300 transition group">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase group-hover:text-emerald-600 transition">RSVP Responses</p>
                      <h3 className="text-2xl font-bold mt-1 text-emerald-600">{rsvps.length}</h3>
                    </div>
                    <span className="text-2xl p-3 bg-emerald-50 group-hover:bg-emerald-100 rounded-xl transition">💌</span>
                  </div>

                  <div onClick={() => handleMenuChange('comments')} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md hover:border-indigo-300 transition group">
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase group-hover:text-indigo-600 transition">Total Comments</p>
                      <h3 className="text-2xl font-bold mt-1 text-indigo-600">{adminComments.length}</h3>
                    </div>
                    <span className="text-2xl p-3 bg-indigo-50 group-hover:bg-indigo-100 rounded-xl transition">💬</span>
                  </div>
                </div>
              </div>
            )}

            {activeMenu === 'couple_hero' && (
              <form onSubmit={handleSaveConfig} className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm space-y-5 max-w-3xl">
                <h3 className="text-base font-bold border-b pb-3 text-gray-800">Couple & Hero Section</h3>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-2">
                  <label className="text-xs font-bold text-green-800 uppercase flex items-center gap-2">WhatsApp Contact Number</label>
                  <input type="text" placeholder="+91 9876543210" value={config.whatsapp_number || ''} onChange={(e) => setConfig({ ...config, whatsapp_number: e.target.value })} className="w-full mt-2 p-2.5 border rounded-lg text-sm bg-white focus:outline-green-500" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-gray-600 uppercase">Bride Name</label><input type="text" value={config.bride || ''} onChange={(e) => setConfig({ ...config, bride: e.target.value })} className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white" /></div>
                  <div><label className="text-xs font-bold text-gray-600 uppercase">Groom Name</label><input type="text" value={config.groom || ''} onChange={(e) => setConfig({ ...config, groom: e.target.value })} className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 uppercase flex items-center justify-between">
                      <span>Event Date & Time (Timer)</span>
                      <span className="text-[10px] text-blue-600 font-normal">📅 Click to pick</span>
                    </label>
                    <input 
                      type="datetime-local" 
                      value={formattedDateForInput} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfig({ ...config, date: val ? `${val}:00` : '' });
                      }} 
                      className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-white focus:outline-blue-500 cursor-pointer font-medium text-gray-800" 
                    />
                  </div>
                  <div><label className="text-xs font-bold text-gray-600 uppercase">Tagline</label><input type="text" value={config.tagline || ''} onChange={(e) => setConfig({ ...config, tagline: e.target.value })} className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-gray-600 uppercase">Date Label</label><input type="text" value={config.date_label || ''} onChange={(e) => setConfig({ ...config, date_label: e.target.value })} className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white" /></div>
                  <div><label className="text-xs font-bold text-gray-600 uppercase">Year Label</label><input type="text" value={config.year_label || ''} onChange={(e) => setConfig({ ...config, year_label: e.target.value })} className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white" /></div>
                </div>
                <div><label className="text-xs font-bold text-gray-600 uppercase">Overall Location Label</label><input type="text" value={config.location || ''} onChange={(e) => setConfig({ ...config, location: e.target.value })} className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white" /></div>
                <div><label className="text-xs font-bold text-gray-600 uppercase">Google Drive Link</label><input type="text" value={config.drive_link || ''} onChange={(e) => setConfig({ ...config, drive_link: e.target.value })} className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white" /></div>
                
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-800 mb-3">Hero Background Image</h4>
                  <div className="p-3 border border-dashed border-gray-300 rounded-xl text-center bg-gray-50 group max-w-sm">
                    <label className="relative w-full h-40 cursor-pointer block rounded-lg overflow-hidden shadow-sm bg-white mb-2">
                      {config.hero_bg_image ? (
                        <img src={config.hero_bg_image} alt="Hero Background" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">No Image</div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs font-semibold">Change Hero Image</span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'hero_bg_image')} />
                    </label>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-800 mb-3">Homepage Fixed Gallery (3 Photos)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map((num) => (
                      <div key={num} className="p-3 border border-dashed border-gray-300 rounded-xl text-center bg-gray-50 group">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Image {num}</p>
                        <label className="relative w-full h-24 cursor-pointer block rounded-lg overflow-hidden shadow-sm bg-white mb-2">
                          {config[`home_gallery_${num}`] ? (
                            <img src={config[`home_gallery_${num}`]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">No Image</div>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-semibold">Change</span>
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, `home_gallery_${num}`)} />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={savingConfig} className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold cursor-pointer shadow mt-4">{savingConfig ? 'Saving...' : '💾 Save & Publish Changes'}</button>
              </form>
            )}

            {activeMenu === 'events' && (
              <form onSubmit={handleSaveConfig} className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm space-y-6 max-w-4xl">
                <h3 className="text-base font-bold border-b pb-3 text-gray-800">Ceremony & Reception Details</h3>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase">Google Map Link</label>
                  <input type="text" placeholder="https://maps.app.goo.gl/..." value={config.map_link || ''} onChange={(e) => setConfig({ ...config, map_link: e.target.value })} className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-gray-50" />
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border space-y-3"><h4 className="font-bold text-sm text-blue-600">The Ceremony</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input type="text" placeholder="Title" value={config.ceremony_title || ''} onChange={(e) => setConfig({ ...config, ceremony_title: e.target.value })} className="p-2 border rounded-lg text-xs bg-white" /><input type="text" placeholder="Time" value={config.ceremony_time || ''} onChange={(e) => setConfig({ ...config, ceremony_time: e.target.value })} className="p-2 border rounded-lg text-xs bg-white" /></div><input type="text" placeholder="Venue Name" value={config.ceremony_venue || ''} onChange={(e) => setConfig({ ...config, ceremony_venue: e.target.value })} className="w-full p-2 border rounded-lg text-xs bg-white" /><input type="text" placeholder="Address" value={config.ceremony_address || ''} onChange={(e) => setConfig({ ...config, ceremony_address: e.target.value })} className="w-full p-2 border rounded-lg text-xs bg-white" /></div>
                <div className="p-4 bg-gray-50 rounded-xl border space-y-3"><h4 className="font-bold text-sm text-indigo-600">The Reception</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input type="text" placeholder="Title" value={config.reception_title || ''} onChange={(e) => setConfig({ ...config, reception_title: e.target.value })} className="p-2 border rounded-lg text-xs bg-white" /><input type="text" placeholder="Time" value={config.reception_time || ''} onChange={(e) => setConfig({ ...config, reception_time: e.target.value })} className="p-2 border rounded-lg text-xs bg-white" /></div><input type="text" placeholder="Venue Name" value={config.reception_venue || ''} onChange={(e) => setConfig({ ...config, reception_venue: e.target.value })} className="w-full p-2 border rounded-lg text-xs bg-white" /><input type="text" placeholder="Address" value={config.reception_address || ''} onChange={(e) => setConfig({ ...config, reception_address: e.target.value })} className="w-full p-2 border rounded-lg text-xs bg-white" /></div>
                
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-gray-800">Invitation Cards</h4>
                    <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition shadow-sm">
                      + Add New Page
                      <input type="file" accept="image/*" className="hidden" onChange={handleAddInvCard} />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                    {(config.invitation_cards || []).map((url, idx) => (
                      <div key={idx} className="relative p-2 border border-gray-200 rounded-lg bg-gray-50 flex flex-col items-center group">
                        <p className="text-[10px] font-bold text-gray-500 mb-2 w-full text-left">Page {idx + 1}</p>
                        <label className="relative w-full h-40 cursor-pointer block rounded-md overflow-hidden shadow-sm border border-gray-200 bg-white">
                          <img src={url} alt="" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-semibold">Change Image</span>
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpdateInvCard(e, idx)} />
                        </label>
                        <button type="button" onClick={() => handleRemoveInvCard(idx)} className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full h-6 w-6 flex items-center justify-center shadow-md hover:bg-rose-50 text-rose-500 text-xs cursor-pointer transition z-10">❌</button>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={savingConfig} className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold cursor-pointer shadow mt-4">{savingConfig ? 'Saving...' : '💾 Save Event Details'}</button>
              </form>
            )}

            {activeMenu === 'story' && (
              <form onSubmit={handleSaveConfig} className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm space-y-5 max-w-3xl">
                <div className="pb-6 border-b border-gray-100">
                  <h3 className="text-base font-bold text-gray-800 mb-4">Story Images (2 Photos)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2].map((num) => (
                      <div key={num} className="p-3 border border-dashed border-gray-300 rounded-xl text-center bg-gray-50 group">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Image {num}</p>
                        <label className="relative w-full h-32 cursor-pointer block rounded-lg overflow-hidden shadow-sm bg-white mb-2">
                          {config[`about_image_${num}`] ? (
                            <img src={config[`about_image_${num}`]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">No Image</div>
                          )}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-semibold">Change</span>
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, `about_image_${num}`)} />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pb-3 pt-2">
                  <h3 className="text-base font-bold text-gray-800">Our Story Timeline</h3>
                  <button type="button" onClick={addStoryTimeline} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-semibold hover:bg-blue-700 cursor-pointer">+ Add New Milestone</button>
                </div>
                <div className="space-y-4">
                  {(config.story || []).map((item, idx) => (
                    <div key={idx} className="p-4 border rounded-xl bg-gray-50 relative space-y-3"><button type="button" onClick={() => removeStoryTimeline(idx)} className="absolute top-3 right-3 text-xs text-rose-500 font-bold hover:underline cursor-pointer">Remove ✕</button><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-8 sm:pr-16"><input type="text" placeholder="Year" value={item.year || ''} onChange={(e) => handleStoryChange(idx, 'year', e.target.value)} className="p-2 border rounded-lg text-xs bg-white font-bold" /><input type="text" placeholder="Title" value={item.title || ''} onChange={(e) => handleStoryChange(idx, 'title', e.target.value)} className="sm:col-span-2 p-2 border rounded-lg text-xs bg-white font-bold" /></div><textarea rows={2} placeholder="Story Details..." value={item.text || ''} onChange={(e) => handleStoryChange(idx, 'text', e.target.value)} className="w-full p-2 border rounded-lg text-xs bg-white" /></div>
                  ))}
                </div>
                <button type="submit" disabled={savingConfig} className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold cursor-pointer shadow">{savingConfig ? 'Saving...' : '💾 Save Story Timeline'}</button>
              </form>
            )}

            {activeMenu === 'gallery' && (
              <div className="space-y-6 max-w-4xl">
                <form onSubmit={handleUpload} className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm space-y-4"><h3 className="text-base font-bold text-gray-800">Upload to Live Feed</h3><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} required className="text-sm w-full" /><textarea placeholder="Write a sweet caption..." value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} className="w-full p-2.5 border rounded-lg text-sm bg-gray-50" /><button type="submit" disabled={uploading} className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow cursor-pointer">{uploading ? 'Uploading...' : 'Publish Photo 🚀'}</button></form>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {posts.map((post) => {
                    const isEditing = editingCaptionId === post.id;
                    return (
                      <div key={post.id} className="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between cursor-pointer" onClick={() => handleOpenPostDetail(post)}>
                        <img src={post.image_url} alt="" className="w-full h-44 object-cover" />
                        <div className="p-3">
                          {isEditing ? (
                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                              <textarea
                                value={captionDraft}
                                onChange={(e) => setCaptionDraft(e.target.value)}
                                rows={2}
                                className="w-full p-2 border border-blue-300 rounded-lg text-xs outline-none bg-blue-50/20"
                                placeholder="Edit caption..."
                                autoFocus
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setEditingCaptionId(null); }}
                                  className="text-xs px-2.5 py-1 text-gray-500 hover:bg-gray-100 rounded"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={savingCaption}
                                  onClick={(e) => handleSaveCaption(e, post.id)}
                                  className="text-xs px-3 py-1 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
                                >
                                  {savingCaption ? '...' : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-gray-800 line-clamp-2 flex-1">{post.caption || 'No caption'}</p>
                              <button
                                type="button"
                                onClick={(e) => handleStartEditCaption(e, post)}
                                className="text-xs text-blue-600 hover:bg-blue-50 p-1 rounded cursor-pointer shrink-0"
                                title="Edit caption"
                              >
                                ✏️
                              </button>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                            <span className="text-xs text-rose-500 font-bold">❤️ {post.likes || 0}</span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id, post.image_url); }} className="text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded cursor-pointer font-medium">Delete</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeMenu === 'rsvp' && (
              <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm max-w-4xl space-y-4">
                <h3 className="text-base font-bold text-gray-800 border-b pb-3">Guest RSVPs</h3>
                <div className="space-y-3">
                  {rsvps.map((rsvp) => (
                    <div key={rsvp.id} className="p-4 border rounded-xl bg-gray-50 flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div><h4 className="text-sm font-bold text-gray-900">{rsvp.name} ({rsvp.guests_count || 1} Guests)</h4><p className="text-xs text-gray-500 mt-0.5">{rsvp.email || 'No email'}</p><p className="text-xs text-gray-700 mt-2 bg-white p-2 rounded border">{rsvp.message || 'No message'}</p></div><span className={`text-xs px-2.5 py-1 rounded-full font-bold self-start sm:self-auto ${rsvp.attending ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{rsvp.attending ? 'Attending' : 'Not Attending'}</span></div>
                  ))}
                  {rsvps.length === 0 && <p className="text-center text-sm text-gray-400 py-6">No RSVPs received yet.</p>}
                </div>
              </div>
            )}

            {activeMenu === 'comments' && (
              <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm max-w-5xl space-y-4">
                <div className="border-b pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-800">User Comments & Device Analytics</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Approve comments to make them public or delete unwanted ones.</p>
                  </div>
                  <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
                    Total: {adminComments.length}
                  </span>
                </div>

                <div className="space-y-4">
                  {adminComments.map((comment) => {
                    const isAdminLiked = Boolean(adminLikedCommentIds[comment.id]);
                    return (
                      <div key={comment.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-gray-900">{comment.name}</h4>
                            <span className="text-[11px] text-gray-400">• {new Date(comment.created_at).toLocaleString()}</span>
                            {comment.approved ? (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">● Public</span>
                            ) : (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">⏳ Pending</span>
                            )}
                          </div>

                          <p className="text-xs text-gray-800 bg-white p-3 rounded-lg border border-gray-100 shadow-xs font-medium leading-relaxed">
                            "{comment.message}"
                          </p>

                          {comment.reply && (
                            <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 text-xs ml-4">
                              <span className="font-bold text-blue-700">👑 Admin Reply:</span>
                              <p className="text-gray-700 mt-0.5">{comment.reply}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                            <button
                              type="button"
                              onClick={() => handleCommentLikeToggle(comment.id, comment.likes)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold transition cursor-pointer ${
                                isAdminLiked 
                                  ? 'bg-rose-50 border-rose-300 text-rose-600 shadow-xs' 
                                  : 'bg-white border-gray-200 text-gray-500 hover:text-rose-500'
                              }`}
                            >
                              <span>{isAdminLiked ? '❤️' : '🤍'}</span>
                              <span>{comment.likes || 0} Likes</span>
                            </button>

                            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 font-mono">📱 {comment.device || 'Unknown'}</span>
                            <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md border border-purple-200 font-mono">🌐 IP: {comment.ip_address || 'Unknown'}</span>
                            <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md border border-amber-200">📍 {comment.location || 'Unknown'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {!comment.approved && (
                            <button
                              type="button"
                              onClick={async () => {
                                await supabase.from('comments').update({ approved: true }).eq('id', comment.id);
                                setAdminComments(prev => prev.map(c => c.id === comment.id ? { ...c, approved: true } : c));
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
                            >
                              Approve ✅
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('Permanently delete this comment?')) {
                                await supabase.from('comments').delete().eq('id', comment.id);
                                setAdminComments(prev => prev.filter(c => c.id !== comment.id));
                              }
                            }}
                            className="px-3.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-bold border border-rose-200 transition cursor-pointer"
                          >
                            Delete 🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {adminComments.length === 0 && <p className="text-center text-sm text-gray-400 py-10">No comments submitted yet.</p>}
                </div>
              </div>
            )}

            {activeMenu === 'database' && (
              <div className="space-y-6 max-w-4xl">
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-3"><span className="text-xl">⚠️</span><div><h4 className="font-bold text-sm">Note: This page contains sensitive actions.</h4><p className="text-xs mt-1">Data cannot be recovered once deleted.</p></div></div>
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm"><h3 className="text-base font-bold text-gray-800 border-b pb-3 mb-4">Clean Database</h3><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><label className="flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:bg-gray-50"><div className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 text-rose-600 rounded" checked={selectedTables.includes('rsvps')} onChange={() => toggleTableSelection('rsvps')} /><span className="text-sm font-semibold text-gray-700">RSVP Messages</span></div><span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{rsvps.length}</span></label><label className="flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:bg-gray-50"><div className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 text-rose-600 rounded" checked={selectedTables.includes('posts')} onChange={() => toggleTableSelection('posts')} /><span className="text-sm font-semibold text-gray-700">Gallery Photos</span></div><span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{posts.length}</span></label><label className="flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:bg-gray-50"><div className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 text-rose-600 rounded" checked={selectedTables.includes('comments')} onChange={() => toggleTableSelection('comments')} /><span className="text-sm font-semibold text-gray-700">Visitor Comments</span></div><span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{adminComments.length}</span></label></div><div className="mt-6 flex justify-end"><button onClick={handleClearDatabase} disabled={clearingDB || selectedTables.length === 0} className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-bold shadow-lg transition-all cursor-pointer">{clearingDB ? 'Clearing Data...' : 'Clear Selected'}</button></div></div>
              </div>
            )}

            {activeMenu === 'settings' && (
              <div className="space-y-6 max-w-2xl">
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-base font-bold text-gray-800 border-b pb-3 mb-5">Account Settings</h3>
                  <div className="space-y-5">
                    <div><label className="text-xs font-bold text-gray-600 uppercase">Login Email (ID)</label><input type="email" value={user.email} disabled className="w-full mt-1 p-3 border rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed" /></div>
                    <form onSubmit={handleUpdatePassword} className="pt-4 border-t"><label className="text-xs font-bold text-gray-600 uppercase">Change Password</label><input type="password" placeholder="Enter new password (min. 6 characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="w-full mt-1 p-3 border rounded-lg text-sm bg-gray-50" /><button type="submit" disabled={updatingPassword} className="w-full sm:w-auto mt-3 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow cursor-pointer">{updatingPassword ? 'Updating...' : '🔐 Update Password'}</button></form>
                  </div>
                </div>
              </div>
            )}
          </main>

          {isNotifDrawerOpen && (
            <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 animate-in fade-in duration-200">
              <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#1c2434] text-white">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔔</span>
                    <h3 className="font-bold text-sm">Notifications</h3>
                  </div>
                  <button onClick={() => setIsNotifDrawerOpen(false)} className="text-gray-400 hover:text-white text-lg p-1 cursor-pointer">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {notifications.map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => handleOpenNotificationDetail(n)}
                      className="p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50/60 transition cursor-pointer flex flex-col gap-1 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                          {n.type === 'like' && '❤️'}
                          {n.type === 'comment' && '💬'}
                          {n.type === 'rsvp' && '💌'}
                          {n.title}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{n.description}</p>
                    </div>
                  ))}

                  {notifications.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-16">No notifications yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedPostForDetail && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                  <h3 className="font-bold text-sm text-gray-800">📸 Moment Activity Details</h3>
                  <button onClick={() => setSelectedPostForDetail(null)} className="text-gray-400 hover:text-gray-700 text-lg cursor-pointer p-1">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-72">
                    <img src={selectedPostForDetail.image_url} alt="" className="max-h-72 w-full object-contain" />
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-rose-500 font-bold text-base">❤️ {selectedPostForDetail.likes || 0} Likes</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-blue-600 font-bold text-sm">💬 {postSpecificComments.length} Comments</span>
                    </div>
                  </div>

                  {editingCaptionId === selectedPostForDetail.id ? (
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-blue-200 space-y-2">
                      <textarea
                        value={captionDraft}
                        onChange={(e) => setCaptionDraft(e.target.value)}
                        rows={2}
                        className="w-full p-2 border border-blue-300 rounded text-xs bg-white outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingCaptionId(null)} className="text-xs px-2.5 py-1 text-gray-500 hover:bg-gray-200 rounded">Cancel</button>
                        <button type="button" disabled={savingCaption} onClick={(e) => handleSaveCaption(e, selectedPostForDetail.id)} className="text-xs px-3 py-1 bg-blue-600 text-white rounded font-bold">Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-700 flex-1">{selectedPostForDetail.caption || 'No caption'}</p>
                      <button type="button" onClick={(e) => handleStartEditCaption(e, selectedPostForDetail)} className="text-xs text-blue-600 hover:underline ml-2 font-medium shrink-0">✏️ Edit</button>
                    </div>
                  )}

                  <div className="pt-2 border-t space-y-3">
                    <h4 className="text-xs font-bold text-gray-600 uppercase">Guest Comments & Replies</h4>
                    
                    {postSpecificComments.map((c) => {
                      const isLikedByAdmin = Boolean(adminLikedCommentIds[c.id]);
                      return (
                        <div key={c.id} className="p-3 rounded-xl border border-gray-200 bg-white space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-gray-900">{c.name}</span>
                              <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleTimeString()}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {!c.approved ? (
                                <button 
                                  onClick={async () => {
                                    await supabase.from('comments').update({ approved: true }).eq('id', c.id);
                                    setAdminComments(prev => prev.map(item => item.id === c.id ? { ...item, approved: true } : item));
                                  }}
                                  className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold hover:bg-emerald-200 cursor-pointer"
                                >
                                  Approve
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-semibold">● Public</span>
                              )}
                              
                              <button 
                                onClick={async () => {
                                  if (confirm('Delete this comment?')) {
                                    await supabase.from('comments').delete().eq('id', c.id);
                                    setAdminComments(prev => prev.filter(item => item.id !== c.id));
                                  }
                                }}
                                className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-gray-800 leading-relaxed font-medium pl-1">
                            {c.message}
                          </p>

                          <div className="flex items-center gap-4 pt-1 text-[11px] text-gray-500 pl-1">
                            <button 
                              type="button"
                              onClick={() => handleCommentLikeToggle(c.id, c.likes)}
                              className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                                isLikedByAdmin 
                                  ? 'bg-rose-50 text-rose-600 font-bold' 
                                  : 'text-gray-500 hover:text-rose-600'
                              }`}
                            >
                              <span>{isLikedByAdmin ? '❤️' : '🤍'}</span>
                              <span>Like ({c.likes || 0})</span>
                            </button>
                            <span>📱 {c.device || 'Mobile'}</span>
                          </div>

                          {c.reply && (
                            <div className="bg-blue-50 p-2 rounded-lg text-xs border border-blue-100 mt-2 ml-3">
                              <span className="font-bold text-blue-700">👑 Admin Reply:</span>
                              <p className="text-gray-700 mt-0.5">{c.reply}</p>
                            </div>
                          )}

                          <div className="flex gap-2 pt-1 mt-1 ml-3">
                            <input 
                              type="text" 
                              placeholder="Write a reply..."
                              value={replyInputs[c.id] || ''}
                              onChange={(e) => setReplyInputs({ ...replyInputs, [c.id]: e.target.value })}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply(c.id); }}
                              className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg outline-none bg-gray-50 focus:bg-white focus:border-blue-500"
                            />
                            <button 
                              type="button" 
                              onClick={() => handleSendReply(c.id)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-700"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {postSpecificComments.length === 0 && (
                      <p className="text-center text-xs text-gray-400 py-4">No comments on this photo yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f1f5f9] p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl mx-auto mb-3 shadow">⚡</div>
          <h2 className="text-xl font-bold text-gray-800">{isResetMode ? 'Reset Admin Password' : 'Admin Sign In'}</h2>
          <p className="text-xs text-gray-400 mt-1">{isResetMode ? 'Enter your email to receive a reset link' : 'Control and manage your website content'}</p>
        </div>
        
        {isResetMode ? (
          <form onSubmit={handleResetPasswordRequest} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Admin Email</label>
              <input type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full mt-1 p-3 border rounded-xl text-sm bg-gray-50 focus:bg-white outline-blue-500" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg transition cursor-pointer">{loading ? 'Sending Link...' : 'Send Reset Link 📧'}</button>
            <div className="text-center mt-3"><button type="button" onClick={() => { setIsResetMode(false); setMessage(''); }} className="text-xs text-blue-600 hover:underline font-medium cursor-pointer">← Back to Login</button></div>
          </form>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Email</label>
              <input type="email" name="email" autoComplete="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full mt-1 p-3 border rounded-xl text-sm bg-gray-50 focus:bg-white outline-blue-500" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-600 uppercase">Password</label>
                <button type="button" onClick={() => { setIsResetMode(true); setMessage(''); }} className="text-xs text-blue-600 hover:underline font-medium cursor-pointer">Forgot password?</button>
              </div>
              <input type="password" name="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full mt-1 p-3 border rounded-xl text-sm bg-gray-50 focus:bg-white outline-blue-500" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg transition cursor-pointer">{loading ? 'Signing In...' : 'Sign In to Dashboard'}</button>
          </form>
        )}
        {message && <p className="mt-4 text-center text-xs text-rose-500 font-semibold">{message}</p>}
      </div>
    </div>
  );
}