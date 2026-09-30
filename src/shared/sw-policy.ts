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
export const PAGES: readonly string[] = ["/", "/orders", "/home", "/login", "/order-form", "/order", "/account", "/catalog", "/staff", "/audit", "/parties", "/locations", "/feedback", "/help", "/gui-thong-bao", "/tai-xe", "/xe", "/xe-sua", "/xe-chi-tiet", "/giay-to-sap-het-han", "/danh-muc-giay-to", "/loai-giay-to-xe", "/loai-giay-to-nguoi", "/chinh-sach-dieu-phoi", "/ly-do-dieu-phoi", "/dieu-kien-xuat-ben", "/chuyen-sua", "/chuyen", "/dieu-phoi", "/cuoc", "/cuoc-chuyen"];

/** Tệp tĩnh đúng mẫu: CSS, manifest, JS của trang, font woff2, icon PNG. Không cho phép thư mục lồng nhau hay ký tự lạ. */
const STATIC_FILE = /^\/(?:app\.css|manifest\.webmanifest|js\/[A-Za-z0-9_-]+\.js|fonts\/[A-Za-z0-9_-]+\.woff2|icons\/[A-Za-z0-9_-]+\.png)$/;

/** Nạp sẵn lúc cài: MỌI trang và MỌI tệp JS của trang (tối ưu tải 2026-09-27, ~250 KB nén, một lần mỗi bản dựng) — sau mỗi lần
 *  triển khai, không lần bấm nào phải kéo cả trang qua mạng; mỗi lần bấm chỉ còn chờ dữ liệu. Test đối chiếu với `PAGES` và script
 *  `build:web` nên thêm trang mới mà quên dòng này thì `npm test` đỏ. */
export const PRECACHE: readonly string[] = [
  "/", "/orders", "/home", "/login", "/order-form", "/order", "/account", "/catalog", "/staff", "/audit", "/parties", "/locations", "/feedback", "/help", "/gui-thong-bao", "/tai-xe", "/xe", "/xe-sua", "/xe-chi-tiet", "/giay-to-sap-het-han", "/danh-muc-giay-to", "/loai-giay-to-xe", "/loai-giay-to-nguoi", "/chinh-sach-dieu-phoi", "/ly-do-dieu-phoi", "/dieu-kien-xuat-ben", "/chuyen-sua", "/chuyen", "/dieu-phoi", "/cuoc", "/cuoc-chuyen",
  "/app.css",
  "/fonts/be-vietnam-pro-400.woff2", "/fonts/be-vietnam-pro-500.woff2", "/fonts/be-vietnam-pro-600.woff2",
  "/fonts/be-vietnam-pro-700.woff2", "/fonts/be-vietnam-pro-800.woff2",
  "/js/login.js", "/js/home.js", "/js/orders.js", "/js/order-form.js", "/js/order.js", "/js/account.js",
  "/js/catalog.js", "/js/staff.js", "/js/audit.js", "/js/parties.js", "/js/locations.js", "/js/feedback.js", "/js/help.js", "/js/gui-thong-bao.js", "/js/tai-xe.js", "/js/xe.js", "/js/xe-sua.js", "/js/xe-chi-tiet.js", "/js/giay-to-sap-het-han.js", "/js/loai-giay-to-xe.js", "/js/loai-giay-to-nguoi.js", "/js/chinh-sach-dieu-phoi.js", "/js/ly-do-dieu-phoi.js", "/js/dieu-kien-xuat-ben.js", "/js/chuyen-sua.js", "/js/chuyen.js", "/js/dieu-phoi.js", "/js/cuoc.js", "/js/cuoc-chuyen.js",
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
