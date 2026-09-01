'use client';

import { useState, useEffect } from 'react';
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

export default function Auth() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeMenu, setActiveMenu] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
  const [selectedTables, setSelectedTables] = useState([]);
  const [clearingDB, setClearingDB] = useState(false);

  useEffect(() => {
    const savedMenu = localStorage.getItem('activeAdminMenu');
    if (savedMenu) setActiveMenu(savedMenu);
  }, []);

  const handleMenuChange = (menu) => {
    setActiveMenu(menu);
    localStorage.setItem('activeAdminMenu', menu);
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) fetchAllData();
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchAllData();
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchAllData = async () => {
    const { data: conf } = await supabase.from('site_settings').select('*').eq('id', 'main_config').single();
    if (conf) setConfig(conf);
    const { data: postData } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (postData) setPosts(postData || []);
    const { data: rsvpData } = await supabase.from('rsvps').select('*').order('created_at', { ascending: false });
    if (rsvpData) setRsvps(rsvpData || []);
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

      // Hero background image retains original resolution without compression
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

    return (
      <div className="relative flex h-screen w-full bg-[#f1f5f9] text-[#1e293b] font-sans antialiased overflow-hidden">
        {/* Mobile Backdrop Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1c2434] text-[#dee4ee] flex flex-col justify-between shrink-0 shadow-2xl transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div>
            <div className="p-6 border-b border-[#2e3a47] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow">⚡</div>
                <h1 className="text-xl font-bold tracking-wide text-white">AdminPanel</h1>
              </div>
              <button 
                type="button" 
                onClick={() => setIsSidebarOpen(false)} 
                className="md:hidden text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <nav className="p-4 space-y-1">
              <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Menu</p>
              <button onClick={() => handleMenuChange('overview')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'overview' ? 'bg-[#333a48] text-white shadow-sm' : 'text-gray-400 hover:bg-[#333a48]/50 hover:text-white'}`}>📊 Dashboard Overview</button>
              <button onClick={() => handleMenuChange('couple_hero')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'couple_hero' ? 'bg-[#333a48] text-white shadow-sm' : 'text-gray-400 hover:bg-[#333a48]/50 hover:text-white'}`}>💑 Couple & Homepage</button>
              <button onClick={() => handleMenuChange('events')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'events' ? 'bg-[#333a48] text-white shadow-sm' : 'text-gray-400 hover:bg-[#333a48]/50 hover:text-white'}`}>📅 Ceremony & Reception</button>
              <button onClick={() => handleMenuChange('story')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'story' ? 'bg-[#333a48] text-white shadow-sm' : 'text-gray-400 hover:bg-[#333a48]/50 hover:text-white'}`}>📖 Our Love Story</button>
              <button onClick={() => handleMenuChange('gallery')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'gallery' ? 'bg-[#333a48] text-white shadow-sm' : 'text-gray-400 hover:bg-[#333a48]/50 hover:text-white'}`}><div className="flex items-center gap-3">📸 Live Feed & Photos</div><span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full text-white">{posts.length}</span></button>
              <button onClick={() => handleMenuChange('rsvp')} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'rsvp' ? 'bg-[#333a48] text-white shadow-sm' : 'text-gray-400 hover:bg-[#333a48]/50 hover:text-white'}`}><div className="flex items-center gap-3">💌 RSVP Guests</div><span className="text-xs bg-emerald-600 px-2 py-0.5 rounded-full text-white">{rsvps.length}</span></button>
              <button onClick={() => handleMenuChange('database')} className={`w-full mt-4 flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${activeMenu === 'database' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-400 hover:bg-rose-500/20 hover:text-rose-300'}`}><div className="flex items-center gap-3">🧹 Clean Database</div></button>
            </nav>
          </div>
          
          <div className="relative p-4 border-t border-[#2e3a47]">
            {isUserMenuOpen && (
              <div className="absolute bottom-full left-4 mb-2 w-56 bg-[#2a3441] border border-[#3a4754] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
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

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 md:hidden cursor-pointer"
                aria-label="Open Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="text-base sm:text-lg font-bold text-gray-800 capitalize truncate">{activeMenu.replace('_', ' ')}</h2>
            </div>
            <a href="/" target="_blank" className="text-xs font-semibold text-blue-600 hover:underline shrink-0">↗ View Live Website</a>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#f1f5f9]">
            {activeMenu === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between"><div><p className="text-xs text-gray-500 font-medium uppercase">Total Photos</p><h3 className="text-2xl font-bold mt-1">{posts.length}</h3></div><span className="text-2xl p-3 bg-blue-50 rounded-xl">📸</span></div>
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between"><div><p className="text-xs text-gray-500 font-medium uppercase">Total Likes</p><h3 className="text-2xl font-bold mt-1 text-rose-500">{totalLikes}</h3></div><span className="text-2xl p-3 bg-rose-50 rounded-xl">❤️</span></div>
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between"><div><p className="text-xs text-gray-500 font-medium uppercase">RSVP Responses</p><h3 className="text-2xl font-bold mt-1 text-emerald-600">{rsvps.length}</h3></div><span className="text-2xl p-3 bg-emerald-50 rounded-xl">💌</span></div>
                  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between"><div><p className="text-xs text-gray-500 font-medium uppercase">Total Guests</p><h3 className="text-2xl font-bold mt-1 text-indigo-600">{totalGuests}</h3></div><span className="text-2xl p-3 bg-indigo-50 rounded-xl">👥</span></div>
                </div>
              </div>
            )}

            {activeMenu === 'couple_hero' && (
              <form onSubmit={handleSaveConfig} className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm space-y-5 max-w-3xl">
                <h3 className="text-base font-bold border-b pb-3 text-gray-800">Couple & Hero Section</h3>
                
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-2">
                  <label className="text-xs font-bold text-green-800 uppercase flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.334.101.154.453.726.963 1.154.658.553 1.218.728 1.378.814.16.086.253.072.347-.029l.482-.601c.116-.145.231-.116.362-.072.13.043.823.391.968.462.145.072.246.108.282.166.036.058.036.333-.108.738z" /><path d="M12.031 2C6.5 2 2 6.5 2 12.034c0 1.77.466 3.5 1.348 5.035L2 22l5.084-1.319A9.957 9.957 0 0012.031 22c5.53 0 10.031-4.5 10.031-10.034C22.062 6.5 17.56 2 12.031 2zm0 18.232c-1.48 0-2.932-.381-4.198-1.103l-.3-.173-3.118.81.828-3.033-.196-.307A8.256 8.256 0 013.73 12.034c0-4.57 3.721-8.293 8.301-8.293 4.58 0 8.302 3.723 8.302 8.293 0 4.57-3.722 8.293-8.302 8.293z" /></svg>
                    WhatsApp Contact Number
                  </label>
                  <input type="text" placeholder="+91 9876543210" value={config.whatsapp_number || ''} onChange={(e) => setConfig({ ...config, whatsapp_number: e.target.value })} className="w-full mt-2 p-2.5 border rounded-lg text-sm bg-white focus:outline-green-500" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-gray-600 uppercase">Bride Name</label><input type="text" value={config.bride || ''} onChange={(e) => setConfig({ ...config, bride: e.target.value })} className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white" /></div>
                  <div><label className="text-xs font-bold text-gray-600 uppercase">Groom Name</label><input type="text" value={config.groom || ''} onChange={(e) => setConfig({ ...config, groom: e.target.value })} className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-gray-600 uppercase">ISO Date</label><input type="text" value={config.date || ''} onChange={(e) => setConfig({ ...config, date: e.target.value })} className="w-full mt-1 p-2.5 border rounded-lg text-sm bg-gray-50 focus:bg-white" /></div>
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
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleImageUpload(e, 'hero_bg_image')} 
                      />
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
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleImageUpload(e, `home_gallery_${num}`)} 
                          />
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
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleUpdateInvCard(e, idx)} 
                          />
                        </label>

                        <button 
                          type="button" 
                          onClick={() => handleRemoveInvCard(idx)} 
                          className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full h-6 w-6 flex items-center justify-center shadow-md hover:bg-rose-50 text-rose-500 text-xs cursor-pointer transition z-10"
                          aria-label="Remove page"
                        >
                          ❌
                        </button>
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
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleImageUpload(e, `about_image_${num}`)} 
                          />
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
                  {posts.map((post) => (
                    <div key={post.id} className="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between"><img src={post.image_url} alt="" className="w-full h-44 object-cover" /><div className="p-3"><p className="text-xs font-semibold text-gray-800 truncate">{post.caption || 'No caption'}</p><div className="flex items-center justify-between mt-3"><span className="text-xs text-rose-500 font-bold">❤️ {post.likes || 0}</span><button onClick={() => handleDeletePost(post.id, post.image_url)} className="text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded cursor-pointer font-medium">Delete</button></div></div></div>
                  ))}
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

            {activeMenu === 'database' && (
              <div className="space-y-6 max-w-4xl">
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-3"><span className="text-xl">⚠️</span><div><h4 className="font-bold text-sm">Note: This page contains sensitive actions.</h4><p className="text-xs mt-1">Please make sure before you click the clear button. Data cannot be recovered once deleted.</p></div></div>
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm"><h3 className="text-base font-bold text-gray-800 border-b pb-3 mb-4">Clean Database</h3><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"><label className="flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"><div className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer" checked={selectedTables.includes('rsvps')} onChange={() => toggleTableSelection('rsvps')} /><span className="text-sm font-semibold text-gray-700">RSVP Messages</span></div><span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{rsvps.length}</span></label><label className="flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"><div className="flex items-center gap-3"><input type="checkbox" className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 cursor-pointer" checked={selectedTables.includes('posts')} onChange={() => toggleTableSelection('posts')} /><span className="text-sm font-semibold text-gray-700">Gallery Photos</span></div><span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{posts.length}</span></label></div><div className="mt-6 flex justify-end"><button onClick={handleClearDatabase} disabled={clearingDB || selectedTables.length === 0} className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-bold shadow-lg transition-all cursor-pointer">{clearingDB ? 'Clearing Data...' : 'Clear Selected'}</button></div></div>
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f1f5f9] p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl mx-auto mb-3 shadow">⚡</div>
          <h2 className="text-xl font-bold text-gray-800">Admin Sign In</h2>
          <p className="text-xs text-gray-400 mt-1">Control and manage your website content</p>
        </div>
        
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Email</label>
            <input 
              type="email" 
              name="email"
              autoComplete="email"
              placeholder="admin@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="w-full mt-1 p-3 border rounded-xl text-sm bg-gray-50 focus:bg-white outline-blue-500" 
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase">Password</label>
            <input 
              type="password" 
              name="password"
              autoComplete="current-password"
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="w-full mt-1 p-3 border rounded-xl text-sm bg-gray-50 focus:bg-white outline-blue-500" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg transition cursor-pointer"
          >
            {loading ? 'Signing In...' : 'Sign In to Dashboard'}
          </button>
        </form>
        {message && <p className="mt-4 text-center text-xs text-rose-500 font-semibold">{message}</p>}
      </div>
    </div>
  );
}