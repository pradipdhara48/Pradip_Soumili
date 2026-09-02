self.addEventListener('push', function (event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'New Alert', body: event.data.text() };
    }
  }

  const title = data.title || 'New Wedding Update 🔔';
  const options = {
    body: data.body || 'You have a new interaction on the website.',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [300, 100, 300, 100, 300], // সাউন্ডের পাশাপাশি ভাইব্রেশন প্যাটার্ন
    requireInteraction: true,
    data: {
      url: data.url || '/adminlogin'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// নোটিফিকেশনে ক্লিক করলে সরাসরি অ্যাডমিন প্যানেল ওপেন হবে
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes('/adminlogin') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/adminlogin');
      }
    })
  );
});