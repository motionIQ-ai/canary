/*
  motionIQ
*/

// src/pwaWorker.ts
var skipCaching = false;
var cacheName = "motionIQ";
var cacheFiles = ["favicon.ico", "favicon.png", "manifest.webmanifest"];
var cacheModels = true;
var cacheWASM = true;
var cacheOther = false;
var listening = false;
var stats = { hit: 0, miss: 0 };
var log = (...msg) => {
  const dt = new Date();
  const ts = `${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}:${dt.getSeconds().toString().padStart(2, "0")}.${dt.getMilliseconds().toString().padStart(3, "0")}`;
  console.log(ts, "pwa", ...msg);
};
async function updateCached(req) {
  fetch(req).then((update) => {
    if (update.ok) {
      caches.open(cacheName).then((cache) => cache.put(req, update)).catch((err) => log("cache update error", err));
    }
    return true;
  }).catch((err) => {
    log("fetch error", err);
    return false;
  });
}
async function getCached(evt) {
  if (skipCaching)
    return fetch(evt.request);
  let found = await caches.match(evt.request);
  if (found && found.ok) {
    stats.hit += 1;
  } else {
    stats.miss += 1;
    found = await fetch(evt.request);
  }
  if (!found || !found.ok) {
    found = await caches.match("offline.html");
  }
  if (found && found.type === "basic" && found.ok) {
    const uri = new URL(evt.request.url);
    if (uri.pathname.endsWith(".bin") || uri.pathname.endsWith(".json")) {
      if (cacheModels)
        updateCached(evt.request);
    } else if (uri.pathname.endsWith(".wasm")) {
      if (cacheWASM)
        updateCached(evt.request);
    } else if (cacheOther) {
      updateCached(evt.request);
    }
  }
  return found;
}
function cacheInit() {
  caches.open(cacheName).then((cache) => cache.addAll(cacheFiles).then(() => log("cache refresh:", cacheFiles.length, "files"), (err) => log("cache error", err)));
}
if (!listening) {
  self.addEventListener("message", (evt) => {
    log("event message:", evt.data);
    switch (evt.data.key) {
      case "cacheModels":
        cacheModels = evt.data.val;
        break;
      case "cacheWASM":
        cacheWASM = evt.data.val;
        break;
      case "cacheOther":
        cacheOther = evt.data.val;
        break;
      default:
    }
  });
  self.addEventListener("install", (evt) => {
    log("install");
    self.skipWaiting();
    evt.waitUntil(cacheInit);
  });
  self.addEventListener("activate", (evt) => {
    log("activate");
    evt.waitUntil(self.clients.claim());
  });
  self.addEventListener("fetch", (evt) => {
    const uri = new URL(evt.request.url);
    if (evt.request.cache === "only-if-cached" && evt.request.mode !== "same-origin")
      return;
    if (uri.origin !== location.origin)
      return;
    if (evt.request.method !== "GET")
      return;
    if (evt.request.url.includes("/api/"))
      return;
    const response = getCached(evt);
    if (response)
      evt.respondWith(response);
    else
      log("fetch response missing");
  });
  let refreshed = false;
  self.addEventListener("controllerchange", (evt) => {
    log(`PWA: ${evt.type}`);
    if (refreshed)
      return;
    refreshed = true;
    location.reload();
  });
  listening = true;
}
//# sourceMappingURL=pwaWorker.js.map
