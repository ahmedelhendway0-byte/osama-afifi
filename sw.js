// Service worker: التطبيق بيفتح بسرعة حتى لو النت ضعيف + إشعارات الموبايل
// ملفات السيستم: من النت الأول، ولو مفيش نت من النسخة المحفوظة. الداتابيز (Supabase) مش بتتحفظ هنا.
const CACHE = 'oa-v3';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('oa-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || (u.origin !== location.origin && !/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname))) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: u.origin === location.origin && !/\.html$|\/$/.test(u.pathname) }).then(r => r || caches.match(new URL('./', self.registration.scope).href))));
});

// إشعار جاي من السيرفر (Web Push)
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Mr. Osama Afifi', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Mr. Osama Afifi', { body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: d.tag || 'oa', dir: 'rtl', lang: 'ar' }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const c = list.find(w => w.url.startsWith(self.registration.scope));
    return c ? c.focus() : self.clients.openWindow(self.registration.scope);
  }));
});
