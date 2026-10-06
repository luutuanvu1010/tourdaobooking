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
| V1 | Ba kịch bản Chrome hỏng / đạt rỗng do đổi route và đường tệp màu | Sửa `trang-chu-smoke.mjs` (G-4, G-9, kiểm không gọi route đếm của Đối tác), `giao-dien-smoke.mjs` (thẻ link, bước 6 chặn cả hai đường), `doi-tac-lap-don-smoke.mjs`; đã chạy lại trên Chromium đám mây — kết quả ở mục "Kết quả kịch bản Chrome" dưới đây |
| V2 | Đổi màu tới máy khác chậm hơn một nhịp (bản đệm cũ phục vụ trước); kể cả máy Toàn quyền | `web/giao-dien.ts` làm mới bản đệm ngay sau "Áp dụng"; chữ ở ADR/tài liệu/màn Giao diện sửa thành "sau một đến hai lần chuyển trang" |
| V3 | Ba chỗ tài liệu mô tả nói sai + vài chú thích cũ | Sửa `CHANGE-GUIDE` (công thức trang mới, bẫy 40), `SYSTEM-DESIGN`, `tests/e2e/README.md`, `src/shared/http.ts`, `web/CLAUDE.md` (chỉ tên đường dẫn) |
| V4 | Bất biến "phiên bị lưới không ghi `last_seen_at`" chưa có bài | Hai bài mới; đột biến ghi trước khi loại → `not ok 7`, `not ok 8` |
| V5 | Sổ hàng rào nói quá ("đổi quyền một bên sẽ đỏ") | Sửa chữ + hai bài khoá bằng CHỮ trong nguồn (route đếm phải hỏi đúng cùng bộ ô với route nặng); đột biến → đỏ |
| V6 | `--define` ở `build:web` không có bài canh | Bài mới; đột biến cắt hai tham số → `not ok 6` |
| T1–T3 | Con số "tổng 4,9 MB" lệch; chú thích dính nhầm; socket đã chết ở iOS chờ 3 giây | Sửa ADR (5,6 → 3,26 MB), sửa chú thích, thêm `readyState` (nối lại ngay khi socket không mở) |
| T4 | Thiếu sổ điều phối / HANDOFF | Sổ này + một dòng ở `docs/HANDOFF-N1.md`; mục nhật ký 1.82 làm ở bước A.0 |

## Kết quả kịch bản Chrome (Chromium 1194 trên Linux đám mây, D1 tạm, khổ 390 và 1040, ngày 2026-10-05; trên mã ea1bb83)

Chạy bằng `CHROME_BIN=<bọc Chromium --no-sandbox> AXE_JS=<axe-core 4.13 lấy bằng npm pack, ngoài repo> node <kịch bản>`. Đây là Chromium Linux, KHÔNG phải Chrome Mac / Safari iPhone — chủ hoặc phiên Local nên chạy lại trên máy thật.

| Kịch bản | Kết quả | Ghi chú |
|---|---|---|
| `docs/evidence/2026-10-02-giao-dien/kich-ban/giao-dien-smoke.mjs` | ĐẠT 11/11 bước | gồm bước 5 (trang khác thấy màu mới), bước 6 (chặn tệp màu → thanh trên mặc định, trang không vỡ), bước 7 (về mặc định) |
| `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs` | ĐẠT 44 bước, in "TRANG CHU SMOKE OK" (lần 2) | G-4: thanh bên 1040px gọi đúng `dem-xung-dot`, `dem-nhap`, `feedback/badge`; 390px không gọi gì. G-9 đạt. Lần 1 đỏ vì "database is locked" (còn `wrangler dev` mồ côi từ một lần chạy bị cắt giờ) — dọn tiến trình rồi chạy lại đạt |
| `docs/evidence/2026-09-26-mo-danh-muc-doi-tac/kich-ban/doi-tac-lap-don-smoke.mjs` | ĐẠT 8 bước, in "ĐỐI TÁC LẬP ĐƠN SMOKE OK" (lần 2) | bước 6 có dòng "không gọi `dashboard` hay `dem-nhap`" đạt. Lần 1 đỏ vì "database is locked" ở lệnh gieo dữ liệu (xung đột với máy chủ thử, lỗi môi trường), chạy lại đạt |

## Kiểm độc lập vòng 2 (soát ea1bb83)

Người kiểm: V1–V6 và T1–T3 **ĐÃ SỬA ĐÚNG**, không hồi quy, không phát hiện CAO; chạy lại `typecheck` + `npm test` (3252 bài, thoát 0), cây sạch; thử 10 đột biến, không đột biến nào xanh mà đáng ra phải đỏ. Còn sót (đã xử lý ở commit kế): V1b (sổ nói "đã chạy" mà chưa ghi kết quả — mục trên), V3a (`CHANGE-GUIDE` mục "Tắt khẩn"), V3b / "33 trang" / "chín bài" / chú thích `readyState` ở ADR, sổ hàng rào, `bangtin-logic.ts`, `SYSTEM-DESIGN`; V1a (`giao-dien-smoke` thêm khẳng định "có ≥ 1 thẻ" và ghi chú vì sao bước 4 hỏi đường cũ); V1c (thông báo G-4); khoá bộ ô quyền bằng nguồn nay bỏ chú thích trước khi so (đột biến "bỏ ô nhưng để lại chú thích `can(...)`" → đỏ). Người kiểm KHÔNG kiểm được: V2 trên trình duyệt thật (service worker cập nhật bản đệm trong lần chuyển trang đầu — phép thử iPhone thật ở mục dưới), Smart Placement, đo mili-giây.

Lưu ý cho chủ: `web/CLAUDE.md` bị sửa MỘT chữ (tên đường dẫn trong một ô bảng kịch bản Chrome, không đổi nghĩa quy tắc) — là tệp luật theo thư mục, chủ xem lại diff nếu muốn.

## Triển khai (ghi 2026-10-06, chỉ lệnh đọc)

- Đợt 1 đã gộp vào `main` (commit đầu nhánh `20167ef`) và đi lên production cùng bản **1.84** (năm lỗi tiền, migration 0078–0083). Không có lần triển khai riêng chỉ-1.83: bản phát hành trước đó là `3a53ded5` (2026-10-05T11:43Z = 1.81).
- `main` = `origin/main` = `f6e2e735`; `git merge-base --is-ancestor 20167ef main` → CÓ.
- `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.84."; `wrangler d1 migrations list … --remote` → "No migrations to apply!".
- `wrangler deployments list`: hai bản phát hành sau 1.81 — `b30a2356` (2026-10-05T22:32Z) và mới nhất `72d2dc12` (2026-10-05T23:40Z = 06:40 giờ VN 6/10). Chưa đối chiếu được bản nào ứng với lần chủ chạy lại `trien-khai`.
- GET công khai (01:47Z 2026-10-06): `/giao-dien.css` và `/api/giao-dien.css` → 200, `text/css; charset=utf-8`, `etag "v3"`, `cache-control: no-cache`; `/orders` có `href="/giao-dien.css"`.
- `cf-placement` trên `/api/auth/config` và hai đường CSS → `local-SIN`; chưa thấy `remote-…`. Không kết luận gì về Smart Placement từ một lần thử (lưu lượng chủ yếu từ Việt Nam, phân tích có thể mất ~15 phút hoặc không đổi).
- **Chưa kiểm:** iPhone thật, hiệu quả Smart Placement, số giây tải trang.

## Việc còn lại / chủ cần làm (dựa vào kỷ luật — chưa có hàng rào máy)

1. **Gộp và triển khai** theo `docs/HANDOFF-N1.md` (bước A.0 thêm mục nhật ký thay đổi 1.82 bằng lời thường). Lưu ý trong lần mở đầu sau triển khai máy nhân viên vẫn chạy khung cũ một lượt (service worker "dùng ngay, làm mới ở nền").
2. **Sau triển khai, đo hiệu quả Smart Placement:** header `cf-placement` trên một yêu cầu `/api/*` (`remote-XXX` = đã được đặt xa người bấm, `local-XXX` = không đổi); biểu đồ "Request duration" của Worker trước/sau; chờ tới 15 phút phân tích. Không có lợi → xoá dòng `placement` rồi triển khai lại.
3. **Thử iPhone thật:** (a) mở app, sang ứng dụng khác 10 giây rồi quay lại — thấy dữ liệu không nhấp nháy tải lại; ẩn quá 2 phút rồi quay lại — dữ liệu mới; (b) Toàn quyền đổi màu rồi mở trang khác — thấy màu mới ở lần chuyển trang kế tiếp trên máy mình; máy khác thấy sau một đến hai lần chuyển trang.
4. **Đợt 2 (chưa làm):** gộp / chạy song song câu D1 của Trang chủ, Chi tiết chuyến, Điều phối; làm nhẹ chuông thông báo (`tom-tat` quét 30 ngày nhật ký); chỉ mục D1 (`orders.status`, `audit_log`, `vc_trip`); `wrangler d1 insights` để chọn câu nặng nhất.
