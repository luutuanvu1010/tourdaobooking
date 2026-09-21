// Chính sách bộ nhớ đệm của service worker — hàm thuần để kiểm thử được; web/sw/sw.ts chỉ nối vào sự kiện.
//
// BẤT BIẾN: dữ liệu từ /api/* (khách, phiên, đơn) KHÔNG BAO GIỜ nằm trong cache của service worker. Giữ bằng hai lớp độc lập:
//  1. routeFor: DANH SÁCH CHO PHÉP, đóng theo mặc định. Chỉ trang và tệp tĩnh đã biết mới vào cache; mọi đường dẫn khác đi thẳng ra mạng.
//     Cố ý KHÔNG viết luật "bỏ qua /api": router của Worker khớp đường dẫn bằng split("/").filter(Boolean) nên "//api/auth/me" vẫn chạm API thật,
//     và một bộ lọc theo tiền tố phải khớp ĐÚNG như router — hai luật khớp cho cùng một khái niệm sẽ lệch nhau (QA2 độc lập lần 1, Q2-01).
//  2. isCacheable: chỉ lưu đúng các loại nội dung của khung (HTML/CSS/JS/PNG/manifest/font woff2); JSON và văn bản thường không bao giờ được lưu.

declare const __BUILD_ID__: string | undefined;

/** Mã bản dựng do esbuild chèn lúc `npm run build:web` (--define:__BUILD_ID__): mỗi lần build/deploy đổi mã → service worker mới xoá cache cũ, khung không bao giờ chạy lệch API sau deploy và không ai phải nhớ tăng tay. Ngoài bản build (test) là "dev". */
export const CACHE_VERSION = typeof __BUILD_ID__ === "undefined" ? "dev" : __BUILD_ID__;
export const CACHE_NAME = `td-shell-${CACHE_VERSION}`;

/** Các trang của app (đường dẫn đúng như trình duyệt yêu cầu, không có .html). Test đối chiếu với các file HTML trong public/ nên không lệch khi thêm/bớt trang. */
export const PAGES: readonly string[] = ["/", "/login", "/order-form", "/order", "/account", "/catalog", "/staff", "/audit", "/parties", "/locations", "/feedback"];

/** Tệp tĩnh đúng mẫu: CSS, manifest, JS của trang, font woff2, icon PNG. Không cho phép thư mục lồng nhau hay ký tự lạ. */
const STATIC_FILE = /^\/(?:app\.css|manifest\.webmanifest|js\/[A-Za-z0-9_-]+\.js|fonts\/[A-Za-z0-9_-]+\.woff2|icons\/[A-Za-z0-9_-]+\.png)$/;

/** Nạp sẵn lúc cài. Các trang còn lại (/catalog, /staff, /audit, /parties, /locations) tự vào cache ở lần mở đầu. */
export const PRECACHE: readonly string[] = [
  "/", "/login", "/order-form", "/order", "/account",
  "/app.css",
  "/fonts/nunito-latin-viet-var.woff2", "/fonts/nunito-vietnamese-var.woff2",
  "/fonts/be-vietnam-pro-latin-viet-700.woff2", "/fonts/be-vietnam-pro-vietnamese-700.woff2",
  "/fonts/be-vietnam-pro-latin-viet-800.woff2", "/fonts/be-vietnam-pro-vietnamese-800.woff2",
  "/js/login.js", "/js/orders.js", "/js/order-form.js", "/js/order.js", "/js/account.js",
  "/manifest.webmanifest",
  "/icons/logo-96.png", "/icons/icon-192.png",
];

export type Route = "pass" | "shell";

/** "pass" = service worker không đụng vào (mạng xử lý như bình thường). Mặc định là "pass"; chỉ trang/tệp tĩnh đã biết là "shell". */
export function routeFor(method: string, url: string, origin: string): Route {
  if (method !== "GET") return "pass";
  const u = new URL(url);
  if (u.origin !== origin) return "pass";
  return PAGES.includes(u.pathname) || STATIC_FILE.test(u.pathname) ? "shell" : "pass";
}

/** Bỏ query/hash: mọi /order?id=… dùng chung một mục cache (cùng một file HTML). */
export function cacheKey(url: string): string {
  const u = new URL(url);
  return u.origin + u.pathname;
}

const CACHEABLE_TYPE = /^(?:text\/html|text\/css|(?:text|application)\/javascript|image\/png|font\/woff2|application\/manifest\+json)\b/i;

/** Không lưu lỗi, phản hồi khác origin hay chuyển hướng, và không bao giờ lưu nội dung không thuộc khung (JSON, văn bản thường, loại lạ). */
export function isCacheable(res: { status: number; type: string; redirected: boolean; contentType: string | null }): boolean {
  return res.status === 200 && res.type === "basic" && !res.redirected && CACHEABLE_TYPE.test(res.contentType ?? "");
}
