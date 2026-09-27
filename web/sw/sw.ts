/// <reference lib="webworker" />
// Service worker: khung app (HTML/CSS/JS/icon) mở tức thì từ cache, tải bản mới ngầm; /api/* không bao giờ qua đây.
import { CACHE_NAME, PRECACHE, cacheKey, isCacheable, routeFor } from "../../src/shared/sw-policy";

declare const self: ServiceWorkerGlobalScope;

/** Chỉ 2 trường dùng ở đây — khai riêng thay vì import `MoiNhatResponse` từ `src/shared/contracts.ts` (tệp đó không
 * hướng tới lib WebWorker; tránh kéo theo kiểu DOM không cần cho service worker). */
interface MoiNhatDto { tin: { cau: string; lienKet: string | null } | null }

self.addEventListener("install", (event) => {
  // Lỗi một mục (vd chưa build) không làm hỏng cả lần cài. `cache: "reload"`: lấy thẳng từ máy chủ, bỏ qua bộ nhớ HTTP của trình duyệt —
  // không thì bản dựng mới có thể nạp sẵn HTML/JS của bản CŨ (ETag cũ còn trong bộ nhớ HTTP) và chạy lệch nhau cho tới lần triển khai sau.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" }))))));
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

// Web Push màn hình khoá (ADR-0036, Task 4): cú gõ cửa không mang nội dung — luôn hỏi lại máy chủ câu của tin mới nhất
// bằng phiên của MÁY NÀY rồi mới hiện. Hỏi hỏng (401 hết phiên, mất mạng, quá giờ) vẫn phải hiện một thông báo: iOS
// thu hồi quyền của app nếu một lần "push" không dẫn tới `showNotification`.
const CAU_CHUNG = "Bạn có thông báo mới";

self.addEventListener("push", (event: PushEvent) => {
  event.waitUntil(
    (async () => {
      let cau = CAU_CHUNG;
      let lienKet = "/";
      try {
        const r = await fetch("/api/thong-bao/moi-nhat", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(8000) });
        if (r.ok) {
          const b = (await r.json()) as MoiNhatDto;
          if (b.tin) {
            cau = b.tin.cau;
            lienKet = b.tin.lienKet ?? "/";
          }
        }
      } catch {
        // 401 (đã đăng xuất máy khác), mất mạng, quá giờ: vẫn hiện câu chung bên dưới.
      }
      // `renotify: true` bắt buộc: cùng `tag` mà thiếu cờ này thì tin thứ hai âm thầm THAY tin cũ, không rung máy.
      const options = { body: cau, tag: "thong-bao", renotify: true, data: { lienKet }, icon: "/icons/icon-192.png" } as NotificationOptions & { renotify: boolean };
      await self.registration.showNotification("Island Booking", options);
    })(),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const raw = (event.notification.data as { lienKet?: string } | null)?.lienKet ?? "/";
  const url = new URL(raw, self.location.origin);
  const dich = url.origin === self.location.origin ? url.href : self.location.origin + "/"; // chỉ mở trang cùng nguồn
  event.waitUntil(
    (async () => {
      for (const c of await self.clients.matchAll({ type: "window", includeUncontrolled: true })) {
        try {
          await (c as WindowClient).focus();
          await (c as WindowClient).navigate(dich);
          return;
        } catch {
          // navigate() ném với cửa sổ chưa do SW này điều khiển; iOS chưa chắc hỗ trợ → rơi xuống openWindow bên dưới.
        }
      }
      await self.clients.openWindow(dich);
    })(),
  );
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
