/* Résonance — service worker.
   1. Notifications (Web Push) : reçues ici, et le site s'ouvre quand on les touche.
   2. Cache des Outils, pour ne pas retélécharger Python (~20 Mo, scipy 14 Mo à la demande) à chaque visite.

   Ce qui est mis en cache, et comment :
   - vendor/ (Pyodide, CodeMirror) et polices/ : « cache d'abord ». Ces fichiers ne changent qu'à une mise à
     jour de Pyodide : on change alors VERSION_VENDOR, et l'ancien cache est supprimé à l'activation.
     Rien n'est préchargé : un fichier n'entre dans le cache que quand une page le demande (scipy compris).
   - outils/ (pages, moteur, mémos) : « réseau d'abord », le cache ne sert que hors ligne. Une page
     corrigée arrive donc dès la visite suivante, sans changer de version.
   - Tout le reste — index.html, participation.js, commun.js, ce fichier — n'est JAMAIS mis en cache :
     l'application elle-même ne peut pas rester bloquée sur une vieille version.
   - Jamais : une autre origine (Supabase, CDN), une requête autre que GET, une réponse partielle ou en erreur. */
const VERSION_VENDOR = 'pyodide-314.0.7-1';  // à changer à chaque mise à jour de vendor/ ou de polices/
const VERSION_OUTILS = 'outils-1';           // à changer seulement pour vider le cache hors ligne des outils
const CACHES_ACTUELS = ['resonance-vendor-' + VERSION_VENDOR, 'resonance-' + VERSION_OUTILS];
const [CACHE_VENDOR, CACHE_OUTILS] = CACHES_ACTUELS;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  // Purge des caches d'une version précédente (préfixe « resonance- » uniquement).
  for (const nom of await caches.keys())
    if (nom.startsWith('resonance-') && !CACHES_ACTUELS.includes(nom)) await caches.delete(nom);
  await self.clients.claim();
})()));

/* Chemin relatif à la portée du service worker : « vendor/pyodide/numpy-….whl », « outils/python/niveau-1.html »… */
function cheminDe(url) {
  const base = new URL(self.registration.scope);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return null;
  return url.pathname.slice(base.pathname.length);
}
const bonneReponse = r => r && r.ok && r.status === 200 && r.type === 'basic';

async function cacheDabord(requete, nomCache) {
  const cache = await caches.open(nomCache);
  const deja = await cache.match(requete, { ignoreSearch: true });
  if (deja) return deja;
  const r = await fetch(requete);
  if (bonneReponse(r)) await cache.put(requete, r.clone()).catch(() => {});
  return r;
}
async function reseauDabord(requete, nomCache) {
  const cache = await caches.open(nomCache);
  try {
    const r = await fetch(requete);
    if (bonneReponse(r)) await cache.put(requete, r.clone()).catch(() => {});
    return r;
  } catch (err) {
    const deja = await cache.match(requete, { ignoreSearch: true });
    if (deja) return deja;
    throw err;
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const chemin = cheminDe(new URL(req.url));
  if (chemin === null) return;                       // autre origine : Supabase, CDN… jamais en cache
  if (chemin.startsWith('vendor/') || chemin.startsWith('polices/') || chemin.startsWith('outils/python/polices/'))
    e.respondWith(cacheDabord(req, CACHE_VENDOR));
  else if (chemin.startsWith('outils/') && !chemin.includes('/audit/'))
    e.respondWith(reseauDabord(req, CACHE_OUTILS));
  // sinon : le navigateur fait comme sans service worker (index.html, participation.js, commun.js…)
});

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
