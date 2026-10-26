// Mochi v1000000 — stable / scalable: static files only, no server, no database.
// Cache-first service worker: after first load, the app works from the phone itself,
// so GitHub Pages / CDN load does not crash even if millions open it at once.
// Search and Gemini calls are per-user (your own key / free public APIs), never a shared central server.
const CACHE = "mochi-v1000000";
const FILES = ["./", "./index.html", "./style.css", "./app.js", "./mochi.jpg", "./manifest.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); });
self.addEventListener("fetch", e => {
  // App shell: cache first, fast and stable. API calls: network only, with timeout handled in app.js.
  if (e.request.url.includes("http")) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match("./index.html"))));
  }
});
