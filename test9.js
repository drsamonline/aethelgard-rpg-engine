/* Behavioural test for the service worker (sw.js), run in Node with a small
   shim — no browser, no puppeteer.

   The defect it pins: the fetch handler was cache-first for EVERYTHING, and
   sw.js precaches five .md files (README, HOW_TO_PLAY, AI_ART_PROMPTS,
   MOD_ART_PROMPTS, mods/README). Docs change on every deploy and the cache only
   refreshes when CACHE is bumped, so an installed reader was pinned to the docs
   of the day they installed — the copy in cache was served forever, even online.

   The fix under test: .md is network-first, cache as the offline fallback, and
   the fresh copy is written back. Everything else stays cache-first.

     node test9.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('PASS  ' + name + (extra ? '  (' + extra + ')' : '')); }
  else { fail++; console.log('FAIL  ' + name + (extra ? '  (' + extra + ')' : '')); }
};

const BASE = 'https://drsamonline.github.io/aethelgard-rpg-engine/';
const url = p => new URL(p, BASE).href;

/* ---------- the shim: enough of a service worker global to run sw.js ---------- */
function loadWorker(opts) {
  opts = opts || {};
  const store = new Map();          // url -> response
  const opened = [];                // every cache name the worker opened
  const netCalls = [];
  const listeners = {};

  const key = r => (typeof r === 'string' ? new URL(r, BASE).href : r.url);
  const res = (body, okFlag) => ({ ok: okFlag !== false, body, clone() { return res(body, okFlag); } });

  const cacheObj = {
    addAll() { return Promise.resolve(); },
    put(req, response) { store.set(key(req), response); return Promise.resolve(); },
    match(req) { return Promise.resolve(store.get(key(req))); }
  };
  const caches = {
    open(name) { opened.push(name); return Promise.resolve(cacheObj); },
    match(req) { return Promise.resolve(store.get(key(req))); },
    keys() { return Promise.resolve([]); },
    delete() { return Promise.resolve(true); }
  };

  const net = opts.network || (() => Promise.resolve(res('fresh', true)));
  const fetchShim = req => { netCalls.push(key(req)); return net(req); };

  const self = {
    addEventListener(type, fn) { (listeners[type] || (listeners[type] = [])).push(fn); },
    skipWaiting() {}
  };

  const ctx = { self, caches, fetch: fetchShim, URL, console, Promise, setTimeout, Request: class {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8'), ctx, { filename: 'sw.js' });

  return { store, opened, netCalls, listeners, res };
}

/* Fire a fetch event at the worker and return what respondWith() was handed. */
async function fireFetch(w, reqUrl, method) {
  let responded = null;
  const ev = { request: { url: url(reqUrl), method: method || 'GET' }, respondWith(p) { responded = p; } };
  (w.listeners.fetch || []).forEach(fn => fn(ev));
  if (responded === null) return { handled: false, body: null };
  const r = await responded;
  return { handled: true, body: r && r.body };
}

const tick = () => new Promise(r => setTimeout(r, 0));

(async () => {
  /* 1. The defect itself: a stale cached README must not be what an online
        reader gets. */
  {
    const w = loadWorker({ network: () => Promise.resolve(w.res('fresh', true)) });
    w.store.set(url('./README.md'), w.res('stale', true));
    const got = await fireFetch(w, './README.md');
    ok('a .md request goes to the network when the cache holds an older copy',
      got.handled && got.body === 'fresh', 'body=' + got.body);
    ok('the .md request actually reached the network',
      w.netCalls.some(u => u.endsWith('/README.md')), 'calls=' + w.netCalls.length);
  }

  /* 2. Offline still works: with the network down, the cached doc is served. */
  {
    const w = loadWorker({ network: () => Promise.reject(new Error('offline')) });
    w.store.set(url('./HOW_TO_PLAY.md'), w.res('cached docs', true));
    const got = await fireFetch(w, './HOW_TO_PLAY.md');
    ok('a .md request falls back to the cached copy when the network fails',
      got.handled && got.body === 'cached docs', 'body=' + got.body);
  }

  /* 3. The fresh copy is written back, so the next offline read is current. */
  {
    const w = loadWorker({ network: () => Promise.resolve(w.res('fresh', true)) });
    w.store.set(url('./README.md'), w.res('stale', true));
    await fireFetch(w, './README.md');
    await tick(); await tick();
    const now = w.store.get(url('./README.md'));
    ok('a fresh .md response replaces the stale copy in the cache',
      !!now && now.body === 'fresh', 'cached=' + (now && now.body));
  }

  /* 4. Everything else keeps the cache-first behaviour it had. */
  {
    const w = loadWorker({ network: () => Promise.resolve(w.res('from network', true)) });
    w.store.set(url('./js/core.js'), w.res('from cache', true));
    const got = await fireFetch(w, './js/core.js');
    ok('a non-.md asset is still served cache-first',
      got.handled && got.body === 'from cache', 'body=' + got.body);
    ok('a cache hit does not touch the network',
      w.netCalls.length === 0, 'calls=' + w.netCalls.length);
  }

  /* 5. A cache MISS on a normal asset still goes to the network. */
  {
    const w = loadWorker({ network: () => Promise.resolve(w.res('from network', true)) });
    const got = await fireFetch(w, './js/world.js');
    ok('a cache miss fetches and serves the network response',
      got.handled && got.body === 'from network', 'body=' + got.body);
  }

  /* 6. Non-GET is never intercepted (unchanged). */
  {
    const w = loadWorker();
    const got = await fireFetch(w, './README.md', 'POST');
    ok('a POST is not intercepted', got.handled === false);
  }

  /* 7. The cache was bumped, so an installed worker re-fetches the shell rather
        than keeping the previous generation forever. */
  {
    const w = loadWorker();
    (w.listeners.install || []).forEach(fn => fn({ waitUntil() {} }));
    await tick();
    const names = [...new Set(w.opened)];
    ok('the worker opens exactly one cache', names.length === 1, 'names=' + names.join(','));
    ok('the cache name is a versioned aethelgard-* name',
      /^aethelgard-v\d+$/.test(names[0] || ''), names[0]);
    ok('the cache version was bumped past v22',
      /^aethelgard-v\d+$/.test(names[0] || '') && Number(names[0].split('-v')[1]) > 22, names[0]);
  }

  /* 8. The precache list must name only files this repository ships. One 404
        makes cache.addAll() reject, and the worker's own .catch() then swallows
        it — so the whole shell goes uncached and nothing reports it. */
  {
    const src = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
    const core = src.split('const CORE = [')[1].split('];')[0];
    const entries = (core.match(/"([^"]+)"/g) || []).map(q => q.slice(1, -1));
    ok('sw.js declares a precache list', entries.length > 0, entries.length + ' entries');

    const missing = entries.filter(e => !fs.existsSync(path.join(__dirname, e.replace(/^\.\//, ''))));
    ok('every precached path exists on disk', missing.length === 0, missing.length ? 'missing: ' + missing.join(' ') : 'none missing');

    const notFiles = entries.filter(e => {
      const p = path.join(__dirname, e.replace(/^\.\//, ''));
      try { return !fs.statSync(p).isFile(); } catch (e2) { return true; }
    });
    ok('every precached path names a file, not a directory', notFiles.length === 0, notFiles.join(' ') || 'none');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
