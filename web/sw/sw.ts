/// <reference lib="webworker" />
// Service worker: khung app (HTML/CSS/JS/icon) mở tức thì từ cache, tải bản mới ngầm; /api/* không bao giờ qua đây.
import { CACHE_NAME, PRECACHE, cacheKey, isCacheable, routeFor } from "../../src/shared/sw-policy";

declare const self: ServiceWorkerGlobalScope;

/** Chỉ các trường dùng ở đây — khai riêng thay vì import `MoiNhatResponse` từ `src/shared/contracts.ts` (tệp đó không
 * hướng tới lib WebWorker; tránh kéo theo kiểu DOM không cần cho service worker). */
interface MoiNhatDto { tin: { cau: string; lienKet: string | null } | null; imLang: boolean }

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
      // ADR-0039: mặc định KHÔNG im lặng (rung/kêu như trước) — chỉ máy chủ trả lời mới biết được đang giờ yên lặng hay
      // không. Hỏi hỏng (401, mất mạng, quá giờ) cố ý giữ nguyên như cũ (không suy giờ VN ở máy để đoán): đơn giản hơn,
      // và tin không hỏi được có thể là tin quan trọng mà máy chủ chưa xác nhận được — rung vẫn an toàn hơn bỏ lỡ.
      let imLang = false;
      try {
        const r = await fetch("/api/thong-bao/moi-nhat", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(8000) });
        if (r.ok) {
          const b = (await r.json()) as MoiNhatDto;
          if (b.tin) {
            cau = b.tin.cau;
            lienKet = b.tin.lienKet ?? "/";
          }
          imLang = b.imLang === true; // đọc lỏng: giá trị khác true (thiếu trường, máy chủ cũ) → coi như không im lặng.
        }
      } catch {
        // 401 (đã đăng xuất máy khác), mất mạng, quá giờ: vẫn hiện câu chung bên dưới, không im lặng.
      }
      // `renotify: true` bắt buộc khi KHÔNG im lặng: cùng `tag` mà thiếu cờ này thì tin thứ hai âm thầm THAY tin cũ, không
      // rung máy. Im lặng (`silent: true`) thì KHÔNG đặt `renotify`/`vibrate` — cùng `silent: true` mà có `vibrate` sẽ ném lỗi
      // (`showNotification` ném ⇒ iOS coi như push không dẫn tới hiện thông báo, có thể thu hồi quyền).
      const options: NotificationOptions & { renotify?: boolean } = imLang
        ? { body: cau, tag: "thong-bao", silent: true, data: { lienKet }, icon: "/icons/icon-192.png" }
        : { body: cau, tag: "thong-bao", renotify: true, data: { lienKet }, icon: "/icons/icon-192.png" };
      await self.registration.showNotification("Island Booking", options);
    })(),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const raw = (event.notification.data as { lienKet?: string } | null)?.lienKet ?? "/";
  // Sửa kèm vòng rà 2026-09-28: `new URL()` có thể ném với chuỗi hỏng (dữ liệu `lienKet` không đúng dạng URL, dù
  // hiếm) — bọc try, hỏng thì mở trang chủ thay vì để cả `notificationclick` lỗi (không mở gì).
  let dich = self.location.origin + "/";
  try {
    const url = new URL(raw, self.location.origin);
    if (url.origin === self.location.origin) dich = url.href; // chỉ mở trang cùng nguồn
  } catch {
    // dich giữ nguyên "/" đã đặt ở trên.
  }
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
    if (isCacheable({ status: res.status, type: res.type, redirected: res.redirected, contentType: res.headers.get("content-type"), cacheControl: res.headers.get("cache-control") })) await cache.put(key, res.clone());
    return res;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => undefined));
    return cached;
  }
  return refresh.catch(() => new Response("Không có kết nối mạng.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }));
}
