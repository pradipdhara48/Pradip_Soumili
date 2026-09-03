// public/sw.js

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'New Notification 🔔', body: event.data.text() };
    }
  }

  const title = data.title || 'New Wedding Update 💍';
  const options = {
    body: data.body || 'You have a new update!',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true, // স্ক্রিনে দীর্ঘক্ষণ নোটিফিকেশন ধরে রাখবে
    data: {
      url: data.url || '/adminlogin'
    }
  };

  // waitUntil দিয়ে ওএস-কে ওয়েক-লক রাখতে বাধ্য করা হয়
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/adminlogin';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});