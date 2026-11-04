/* Aethelgard service worker — offline cache. Created by Dr. Sohil Momin.

   Only the app shell is precached on install (44 files: the modules, the stylesheet,
   the manifest and the icons). The list is exactly what
   THIS repository ships: the page, the mods and the three extra .md files it used
   to name live in drsamonline/aethelgard-games, and a precache list that names a
   file the repo does not ship is not a small error — cache.addAll() rejects on the
   first 404, so the catch below swallowed it and NOTHING was precached at all.
   test9.js pins the list against the disk. Art packs, mod
   art, screenshots and posters are cached on demand the first time they are used,
   so a player who picks the Classic edition never downloads the illustrated art. */
const CACHE = "aethelgard-v23";

const CORE = [
  "./style.css",
  "./manifest.json",
  "./js/data/achievements.js",
  "./js/data/activities.js",
  "./js/data/classes.js",
  "./js/data/companions.js",
  "./js/data/enemies.js",
  "./js/data/events.js",
  "./js/data/gamedata.js",
  "./js/data/gear.js",
  "./js/data/gems.js",
  "./js/data/i18n.js",
  "./js/data/music.js",
  "./js/data/quests.js",
  "./js/data/races.js",
  "./js/data/reactions.js",
  "./js/data/wiki.js",
  "./js/views/atlas.js",
  "./js/views/codex.js",
  "./js/views/forge.js",
  "./js/views/hero.js",
  "./js/views/home.js",
  "./js/views/inventory.js",
  "./js/views/market.js",
  "./js/views/skills.js",
  "./js/views/story.js",
  "./js/views/underworld.js",
  "./js/boot.js",
  "./js/combat.js",
  "./js/companions.js",
  "./js/core.js",
  "./js/graphics.js",
  "./js/late-game.js",
  "./js/maps.js",
  "./js/mods.js",
  "./js/music.js",
  "./js/quests.js",
  "./js/ui.js",
  "./js/wiki.js",
  "./js/world.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./README.md",
];

self.addEventListener("install", e => {
  // populate the cache, but do NOT skipWaiting: a worker that activates while a
  // page is mid-interaction can disrupt it. It takes over on the next visit.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).catch(() => {}));
});
self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

/* Documentation (.md) is precached so it can be read offline, but it must never
   be served FROM the cache while the network is up: the docs change on every
   deploy and the cache only refreshes when CACHE is bumped, so a cache-first
   handler pins every installed reader to the docs of the day they installed.
   Network first, cache as the offline fallback — and the fresh copy is written
   back, so the offline read is the current one rather than the first one. */
const DOCS = /\.md$/i;

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (DOCS.test(new URL(e.request.url).pathname)) {
    e.respondWith(fetch(e.request).then(resp => {
      if (resp && resp.ok) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); }
      return resp;
    }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
    if (resp && resp.ok) { const copy = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); }
    return resp;
  }).catch(() => caches.match("./index.html"))));
});
