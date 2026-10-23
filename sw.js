// Service worker: إشعارات الموبايل + فتح السيستم لما تدوس على الإشعار
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// إشعار جاي من السيرفر (Web Push) — بيشتغل لما نربط Supabase
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Mr. Osama Afifi', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Mr. Osama Afifi', { body: d.body || '', icon: 'icon.svg', badge: 'icon.svg', tag: d.tag || 'oa', dir: 'rtl', lang: 'ar' }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(w => w.url.startsWith(self.registration.scope));
    return c ? c.focus() : self.clients.openWindow(self.registration.scope);
  }));
});
