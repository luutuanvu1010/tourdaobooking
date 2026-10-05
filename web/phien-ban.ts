// Số phiên bản + ngày phát hành cho các trang KHÔNG cần cả nhật ký thay đổi. Hai giá trị do esbuild chèn lúc `npm run build:web`
// (`--define:__APP_VERSION__` / `__APP_RELEASE_DATE__`, lấy từ mục ĐẦU nhật ký qua `scripts/in-phien-ban.mjs` — vẫn MỘT nguồn sự thật, không viết tay ở đây).
// Vì sao không nhập `src/shared/app-info.ts`: tệp đó dẫn xuất từ `CHANGELOG[0]` nên kéo cả nhật ký (~63 KB) vào gói của mọi trang.
// Chỉ `web/help.ts` (trang đọc nhật ký) được nhập `app-info`/`changelog`. `src/goi-trang-nhe.test.ts` canh. Ngoài bản dựng (bài kiểm chạy thẳng bằng node): "0.0".
declare const __APP_VERSION__: string | undefined;
declare const __APP_RELEASE_DATE__: string | undefined;

/** Tên ứng dụng — BẢN SAO của `APP_NAME` ở `src/shared/app-info.ts` (`src/goi-trang-nhe.test.ts` ép trùng; `app-info.test.ts` ép trùng manifest). */
export const APP_NAME = "Island Booking System";
export const APP_VERSION: string = typeof __APP_VERSION__ === "undefined" ? "0.0" : __APP_VERSION__;
export const APP_RELEASE_DATE: string = typeof __APP_RELEASE_DATE__ === "undefined" ? "1970-01-01" : __APP_RELEASE_DATE__;
