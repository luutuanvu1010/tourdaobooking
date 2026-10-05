# Sổ thi công — Tốc độ đợt 1 (ADR-0102)

- **Nguồn việc:** chủ dự án, 2026-10-05: "Ok làm A) Duyệt cả 6 việc" (sau báo cáo `docs/superpowers/specs/2026-10-02-toc-do-nguyen-nhan-goc.md` và số liệu D1 của chủ 2026-10-03).
- **Nhánh:** `toc-do-nguyen-nhan-goc` (gốc `origin/main` a43480b, bản 1.81). Chưa gộp, chưa triển khai — theo CLAUDE.md §8 chủ tự chạy `git push`, gộp và `npm run trien-khai`.
- **Vai:** người thi công = phiên này (AI); người kiểm độc lập = trợ lý `nguoi-kiem-doc-lap` (chỉ đọc, chạy lại lệnh, thử đột biến trong bản sao).

## Tiêu chí nghiệm thu (viết trước khi làm — P20)

| # | Việc | Kiểm được bằng |
|---|---|---|
| 1 | Tệp màu không chặn trang | Mọi `public/*.html` nạp `/giao-dien.css` (`src/giao-dien-the-link.test.ts`); `/giao-dien.css` ∈ `STATIC_FILE` + `PRECACHE`, `/api/*` vẫn `pass` (`sw-policy.test.ts`); hai đường cùng thân + ETag; `run_worker_first` đủ hai mẫu (`cau-hinh-toc-do.test.ts`); kịch bản Chrome `giao-dien-smoke.mjs` |
| 2 | Gói giao diện gọn | Không gói nào ngoài `help.js` chứa `changelog.ts`; gói Đơn hàng ≤ 95 KB; số phiên bản/ngày vào gói đúng (`goi-trang-nhe.test.ts`) |
| 3 | Huy hiệu bằng route đếm nhẹ | Cùng mã trạng thái với route nặng cho mọi loại tài khoản; số trùng; ít câu D1 hơn; cùng bộ ô quyền (`dem-nhap.test.ts`, `dem-xung-dot.test.ts`) |
| 4 | Hiện lại app chỉ kiểm kết nối | Còn sống → không đóng/không `can-tai-lai`; chết / ẩn ≥ 2 phút / `readyState ≠ 1` → nối lại (`bang-tin-web.test.ts`) |
| 5 | Bớt một chặng chờ mỗi lời gọi | Phiên ∥ nhân viên ∥ bảo trì bắt đầu cùng lúc; `last_seen_at` ở nền; `/me` hỏi bảo trì một lần; chữ ký sai không đụng D1; phiên bị lưới không ghi `last_seen_at` (`nen-moi-yeu-cau.test.ts`) |
| 6 | Smart Placement | `wrangler.jsonc` có `placement.mode = "smart"`, đọc được như JSON, không `region`/`host` (`cau-hinh-toc-do.test.ts`) — **hiệu quả thật chỉ đo được sau triển khai** |

## Kết quả thi công (đỏ trước → xanh sau)

| Commit | Việc | Đỏ trước (đã thấy) |
|---|---|---|
| 7d86124 | 2 | `web/orders.ts = 153426 byte, trần 95000`; trang nào cũng "kéo nhật ký thay đổi vào gói" |
| 5f93ec4 | 1 | `giao-dien-the-link`, `sw-policy` (bài mới), `route-access` đỏ trước khi đổi đường dẫn |
| 2b45c9e | 5 | `nen-moi-yeu-cau` bài 1–3 đỏ (`bat-dau:phien, bat-dau:nhan-vien, ket-thuc:phien, … bat-dau:bao-tri, … bat-dau:bao-tri`) |
| 5dc3bb9 | 4 | thiếu `AN_LAU_MS`/`KIEM_NHANH_MS`/`hienLai` → bài đỏ; đột biến "luôn nối lại" → 5 bài đỏ |
| dce3c07 | 3 | cả hai route chưa có → `not ok` 5 bài |
| 9fb78d0 | 6 | `not ok 2 - Smart Placement bật` trước khi thêm cấu hình |
| b4387bd | tài liệu | ADR-0102, dòng trỏ ở ADR-0087/0022/0075, mục lục ADR, sổ hàng rào, SYSTEM-DESIGN, PWA-IPHONE, CHANGE-GUIDE |

Ruling trong lúc làm (đã tự quyết, đảo ngược được, ghi để chủ biết):
- **R1 — Tệp màu ra `/giao-dien.css` thay vì nới bất biến `/api/*` của service worker.** Giữ nguyên bất biến an ninh; đổi lại phải thêm một dòng `run_worker_first` và giữ đường cũ.
- **R2 — Không làm Bảng tin báo "đã đổi màu"** (ADR-0022 giới hạn sự kiện đúng 5 khoá): thay bằng việc màn Giao diện tự làm mới bản đệm của máy Toàn quyền.
- **R3 — Hai route đếm riêng thay vì một route gộp** (ranh giới module: `orders` không đọc `catalog`).
- **R4 — Không thu gọn `app.css`** (lợi nhỏ, phải đổi liên kết ở 38 trang và bài quét token).
- **R5 — Không thêm mục nhật ký thay đổi 1.82** ở đây: bước A.0 của quy trình phát hành thêm nó lúc triển khai, kẻo trùng số với nhánh khác cùng phát hành.

## Kiểm độc lập (2026-10-05) và việc sửa theo nhận xét

Người kiểm: không có phát hiện CAO; không kẽ hở an ninh (đã thử mọi 512 tập con quyền: hai route đếm khớp cổng với route nặng). Phát hiện VỪA và cách xử lý:

| Mã | Phát hiện | Xử lý |
|---|---|---|
| V1 | Ba kịch bản Chrome hỏng / đạt rỗng do đổi route và đường tệp màu | Sửa `trang-chu-smoke.mjs` (G-4, G-9, kiểm không gọi route đếm của Đối tác), `giao-dien-smoke.mjs` (thẻ link, bước 6 chặn cả hai đường), `doi-tac-lap-don-smoke.mjs`; **đã chạy lại trên Chromium** (kết quả ở mục dưới) |
| V2 | Đổi màu tới máy khác chậm hơn một nhịp (bản đệm cũ phục vụ trước); kể cả máy Toàn quyền | `web/giao-dien.ts` làm mới bản đệm ngay sau "Áp dụng"; chữ ở ADR/tài liệu/màn Giao diện sửa thành "sau một đến hai lần chuyển trang" |
| V3 | Ba chỗ tài liệu mô tả nói sai + vài chú thích cũ | Sửa `CHANGE-GUIDE` (công thức trang mới, bẫy 40), `SYSTEM-DESIGN`, `tests/e2e/README.md`, `src/shared/http.ts`, `web/CLAUDE.md` (chỉ tên đường dẫn) |
| V4 | Bất biến "phiên bị lưới không ghi `last_seen_at`" chưa có bài | Hai bài mới; đột biến ghi trước khi loại → `not ok 7`, `not ok 8` |
| V5 | Sổ hàng rào nói quá ("đổi quyền một bên sẽ đỏ") | Sửa chữ + hai bài khoá bằng CHỮ trong nguồn (route đếm phải hỏi đúng cùng bộ ô với route nặng); đột biến → đỏ |
| V6 | `--define` ở `build:web` không có bài canh | Bài mới; đột biến cắt hai tham số → `not ok 6` |
| T1–T3 | Con số "tổng 4,9 MB" lệch; chú thích dính nhầm; socket đã chết ở iOS chờ 3 giây | Sửa ADR (5,6 → 3,26 MB), sửa chú thích, thêm `readyState` (nối lại ngay khi socket không mở) |
| T4 | Thiếu sổ điều phối / HANDOFF | Sổ này + một dòng ở `docs/HANDOFF-N1.md`; mục nhật ký 1.82 làm ở bước A.0 |

## Việc còn lại / chủ cần làm (dựa vào kỷ luật — chưa có hàng rào máy)

1. **Gộp và triển khai** theo `docs/HANDOFF-N1.md` (bước A.0 thêm mục nhật ký thay đổi 1.82 bằng lời thường). Lưu ý trong lần mở đầu sau triển khai máy nhân viên vẫn chạy khung cũ một lượt (service worker "dùng ngay, làm mới ở nền").
2. **Sau triển khai, đo hiệu quả Smart Placement:** header `cf-placement` trên một yêu cầu `/api/*` (`remote-XXX` = đã được đặt xa người bấm, `local-XXX` = không đổi); biểu đồ "Request duration" của Worker trước/sau; chờ tới 15 phút phân tích. Không có lợi → xoá dòng `placement` rồi triển khai lại.
3. **Thử iPhone thật:** (a) mở app, sang ứng dụng khác 10 giây rồi quay lại — thấy dữ liệu không nhấp nháy tải lại; ẩn quá 2 phút rồi quay lại — dữ liệu mới; (b) Toàn quyền đổi màu rồi mở trang khác — thấy màu mới ở lần chuyển trang kế tiếp trên máy mình; máy khác thấy sau một đến hai lần chuyển trang.
4. **Đợt 2 (chưa làm):** gộp / chạy song song câu D1 của Trang chủ, Chi tiết chuyến, Điều phối; làm nhẹ chuông thông báo (`tom-tat` quét 30 ngày nhật ký); chỉ mục D1 (`orders.status`, `audit_log`, `vc_trip`); `wrangler d1 insights` để chọn câu nặng nhất.
