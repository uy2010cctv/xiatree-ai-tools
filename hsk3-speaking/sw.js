/* Scope is limited to this directory. No third-party requests are cached. */
const CACHE='hsk30-speaking-v1';
const FILES=['./','./index.html','./styles.css','./tokens.css','./config.js','./core.js','./app.js','./data/questions.js','./data/scenes.js','./privacy.html','./terms.html','./free-samples.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('hsk30-speaking-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));});
