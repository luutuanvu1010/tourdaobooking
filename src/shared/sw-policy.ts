// Chính sách bộ nhớ đệm của service worker — hàm thuần để kiểm thử được; web/sw/sw.ts chỉ nối vào sự kiện.

/** Tăng tay khi một lần deploy đổi API không tương thích: cache cũ bị xoá, khung phải tải lại. */
export const CACHE_VERSION = "v1";
export const CACHE_NAME = `td-shell-${CACHE_VERSION}`;

/** Nạp sẵn lúc cài (đường dẫn đúng như trình duyệt yêu cầu, không có .html). Trang admin tự vào cache ở lần mở đầu. */
export const PRECACHE: readonly string[] = [
  "/", "/login", "/order-form", "/order", "/account",
  "/app.css",
  "/js/login.js", "/js/orders.js", "/js/order-form.js", "/js/order.js", "/js/account.js",
  "/manifest.webmanifest",
  "/icons/logo-96.png", "/icons/icon-192.png",
];

export type Route = "pass" | "shell";

/** "pass" = service worker không đụng vào (mạng xử lý như bình thường). /api/* luôn "pass": có dữ liệu khách và phiên. */
export function routeFor(method: string, url: string, origin: string): Route {
  if (method !== "GET") return "pass";
  const u = new URL(url);
  if (u.origin !== origin) return "pass";
  if (u.pathname === "/api" || u.pathname.startsWith("/api/")) return "pass";
  if (u.pathname === "/sw.js") return "pass";
  return "shell";
}

/** Bỏ query/hash: mọi /order?id=… dùng chung một mục cache (cùng một file HTML). */
export function cacheKey(url: string): string {
  const u = new URL(url);
  return u.origin + u.pathname;
}

/** Không lưu lỗi, phản hồi khác origin hay chuyển hướng (trả lại cho yêu cầu điều hướng sẽ lỗi). */
export function isCacheable(res: { status: number; type: string; redirected: boolean }): boolean {
  return res.status === 200 && res.type === "basic" && !res.redirected;
}
