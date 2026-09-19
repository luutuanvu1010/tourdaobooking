/// <reference lib="webworker" />
// Service worker: khung app (HTML/CSS/JS/icon) mở tức thì từ cache, tải bản mới ngầm; /api/* không bao giờ qua đây.
import { CACHE_NAME, PRECACHE, cacheKey, isCacheable, routeFor } from "../../src/shared/sw-policy";

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", (event) => {
  // Lỗi một mục (vd chưa build) không làm hỏng cả lần cài.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url)))));
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (name !== CACHE_NAME) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  // Thoát sớm, KHÔNG gọi respondWith: mạng xử lý như bình thường (bắt buộc với /api/*).
  if (routeFor(event.request.method, event.request.url, self.location.origin) === "pass") return;
  event.respondWith(staleWhileRevalidate(event));
});

async function staleWhileRevalidate(event: FetchEvent): Promise<Response> {
  const key = cacheKey(event.request.url);
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(key);
  const refresh = fetch(event.request).then(async (res) => {
    if (isCacheable({ status: res.status, type: res.type, redirected: res.redirected, contentType: res.headers.get("content-type") })) await cache.put(key, res.clone());
    return res;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => undefined));
    return cached;
  }
  return refresh.catch(() => new Response("Không có kết nối mạng.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }));
}
