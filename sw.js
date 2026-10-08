/* Résonance — service worker : reçoit les notifications (Web Push) et ouvre le site quand on les touche.
   Pas de cache hors ligne : le site a besoin d'Internet pour parler à Supabase. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (_) { m = { texte: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(m.titre || 'Résonance', {
    body: m.texte || '',
    icon: 'icone-192.png',
    badge: 'icone-192.png',
    tag: m.tag,
    data: { url: m.url || './' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(fenetres => {
    for (const f of fenetres) if ('focus' in f) return f.focus();
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});
