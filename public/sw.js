/* CartWise service worker: installable PWA that opens and works with no network.
 *  - precache the app shell + offline page
 *  - hashed build assets (/_next/static, fonts, images): cache-first
 *  - pages and RSC payloads: network-first (4 s), then cache, then offline page
 *  - /api/*: not handled here. The app keeps its own IndexedDB cache + write queue (sales sync when back online).
 */
const VERSION = "cw-v3";
const SHELL = [
  "/",
  "/login",
  "/register",
  "/vendors",
  "/app",
  "/app/sell",
  "/app/plan",
  "/app/money",
  "/app/products",
  "/app/payments",
  "/app/more",
  "/app/settings",
  "/offline.html",
  "/logo-mark.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(new Request(u, { credentials: "same-origin" })).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

const cacheable = (res) => res && res.ok && !res.redirected && res.type === "basic";

function networkFirst(req, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const fromCache = () => caches.match(req, { ignoreVary: true }).then((hit) => hit || caches.match(new URL(req.url).pathname));
    const timer = setTimeout(() => {
      fromCache().then((hit) => {
        if (hit && !settled) {
          settled = true;
          resolve(hit);
        }
      });
    }, timeoutMs);
    fetch(req)
      .then((res) => {
        clearTimeout(timer);
        if (cacheable(res)) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        if (!settled) {
          settled = true;
          resolve(res);
        }
      })
      .catch(() => {
        clearTimeout(timer);
        if (settled) return;
        fromCache().then((hit) => {
          settled = true;
          if (hit) return resolve(hit);
          if (req.mode === "navigate") return caches.match("/offline.html").then((o) => resolve(o || Response.error()));
          resolve(Response.error());
        });
      });
  });
}

function cacheFirst(req) {
  return caches.match(req).then(
    (hit) =>
      hit ||
      fetch(req).then((res) => {
        if (cacheable(res)) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }),
  );
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  const isAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/logo") ||
    /\.(?:png|jpg|jpeg|svg|webp|avif|ico|woff2?|css|js)$/.test(url.pathname);
  if (isAsset) {
    e.respondWith(cacheFirst(req));
    return;
  }
  e.respondWith(networkFirst(req, req.mode === "navigate" ? 4000 : 6000));
});
