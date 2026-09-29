# Nhật ký thi công ADR-0047 (chặng đưa đón, danh sách hành khách, số khách hiệu lực, tiền tố `ord_`)

- **Kế hoạch:** `docs/superpowers/plans/2026-09-29-adr-0047-thi-cong.md` (vai lập kế hoạch, 2026-09-29; đo trên `9067d97`).
- **Đề xuất sửa luật:** `docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md` (**CHỜ CHỦ DUYỆT**).
- **Nguồn chuẩn tắc:**
  - ADR-0047 (accepted 2026-09-28; Q4 = (a) "Chặng thay hẳn ô cũ");
  - danh sách màn `docs/superpowers/specs/2026-09-29-adr-0047-man-hinh-can-ve.md`.
- **Nhánh thi công:** `worktree-agent-aa4ba1b121f98db87` (worktree `.claude/worktrees/agent-aa4ba1b121f98db87`), tách từ `main` `ce831f8` (bản 1.36); đã gộp nhánh kế hoạch `worktree-agent-ad6521054d4dcefcf` @ `d8bbe95` (chứa `adr-van-chuyen-0047-0048` @ `96d7048`, ADR-0047 accepted) bằng commit gộp `24ae5cb`. Đỉnh: xem bảng mục 3.
- **Cách thi công:** executing-plans, một phiên thi công (subagent do điều phối giao vai 2026-09-29): Phần A từ A0 đến A19, rồi dừng ở A20 (R10) để điều phối giao người kiểm độc lập. Nhánh ADR-0048 thi công SONG SONG (dùng `0037`–`0039`).
- **Trạng thái:** Phần A đang thi công (cập nhật ở mục 3). Chưa kiểm độc lập. Chưa lên production. Phần B chờ bản vẽ; Phần C chưa làm.
- **Người ghi nhật ký này không tự nghiệm thu** (N8). Kết quả của người kiểm độc lập ghi ở mục 8.

## 1. Mốc ban đầu (Task A0)

| Mục | Kết quả |
|---|---|
| Bước 1: ADR-0047 accepted trên nhánh (dòng trạng thái, câu Q4) | ĐẠT — dòng 3 "**accepted**"; dòng 5 Q4 nguyên văn "Chặng thay hẳn ô cũ" |
| Bước 2: Ruling R1–R11 đã chốt (xem mục 4) | ĐẠT — điều phối chốt 2026-09-29: chấp nhận R1–R11 đúng như kế hoạch mục 0; R11 = không làm `0036`, trả số; R10 = dừng ở A20. Q0 đã có câu trả lời của chủ (mục 2) nên hai câu `*_delete_draft` và lô lưu nháp A9 không còn chờ |
| Bước 3: `docs/quyen-hoan.json` → `phat_hien` | `[]` (2026-09-29) — không xây trên lỗ đang hở |
| Bước 4: chưa ai thêm `ord_transfer_leg` / `ord_passenger` / `order.passenger.write` / `soKhachHieuLuc` | rỗng (grep `src migrations`) |
| Bước 5: số migration lớn nhất; quét mọi ref (`git log --all --name-only --format= -- migrations/`); `0034`–`0036` còn trống; `0037`–`0039` của nhánh ADR-0048 có chưa | lớn nhất `0033_van_chuyen_xe.sql`; quét mọi ref (09:26): không nhánh nào có `0034`–`0039`. Dùng `0034`, `0035`; trả `0036` (R11) |
| Bước 6: `npm test` (số test) / `npm run typecheck` / `uptime` | `npm ci` xong; `npm test` 1313/1313 pass, 0 fail; `npm run typecheck` thoát 0; `uptime` load 2.93 2.71 2.40 (một người thi công khác chạy e2e song song — tiến trình wrangler của worktree `agent-ae0f600ceaab6d8b4`, không đụng) |
| Bước 7: số dòng trích dẫn lệch so với kế hoạch (đo trên `9067d97`) | 0 — diff `9067d97`..đỉnh trên `src migrations scripts tests web` rỗng (mã giống hệt mốc lập kế hoạch) |
| Bước 8: `npm run test:e2e` đủ bộ — kịch bản đỏ sẵn có | 2026-09-29 (đỉnh `79ab917`, mã = `ce831f8`): **E2E: 24/24 kịch bản xanh**, thoát 0 (có mạng; `catalog`, `dispatch` hôm nay XANH). Đuôi `audit-invariants`: một cảnh báo sẵn có `⚠ R-ORD-6a … 1 vi phạm` (dữ liệu e2e, mức cảnh báo, không chặn) |
| Bước 9: Chrome — số ✓/✗ từng kịch bản (`a2-smoke-form`, `a2-smoke-order`, `a2-smoke-sheet`, `v1-xac-nhan-png`, `trang-chu-smoke`, `hdv-viec-cua-toi-smoke`) | 2026-09-29 (đỉnh `f637643`, mã hành vi = `ce831f8`; `AXE_JS=/private/tmp/vgt-axe/package/axe.min.js`, `CHROME_BIN=…/chrome-wrap.sh`, kịch bản chạy nối tiếp bằng `/tmp/adr0047-chrome.sh`): `a2-smoke-form` 24 ✓ OK; `a2-smoke-order` 11 ✓ OK; `a2-smoke-sheet` 14 ✓ OK; `v1-xac-nhan-png` 13 bước ✓ OK; `hdv-viec-cua-toi-smoke` 9 bước ✓ 0 ✗ OK; **`trang-chu-smoke` ĐỎ SẴN CÓ** (thoát 1 sau 11 ✓): `AssertionError: Trang chủ (máy tính, 1040×800): phải có đúng 2 dòng cảnh báo (Sheet đổi giá + góp ý)` — thấy 1 dòng (chỉ "Sheet đã đổi giá"); kịch bản cũ còn đòi dòng góp ý mà ADR-0038 đã chuyển Góp ý sang chỉ Toàn quyền — không liên quan ADR-0047 |
| Bước 10: khẳng định "đúng số lượng / đúng danh sách" tìm thêm được | Đã biết: `src/route-access.test.ts:214,235,237,238` (109); `src/modules/orders/pool.test.ts` (bốn khoá); `src/modules/orders/dashboard.test.ts` (D1 giả). Tìm thêm: `src/tai-xe-cong.test.ts:88` (`ROUTES.length >= 109` — dấu ≥ nên 114 vẫn xanh); `src/bang-tin-guard.test.ts:204` ("8 route ghi đơn đã biết" — xem lại ở A11/A12). **Hàng rào chữ bị va mà kế hoạch chưa nêu:** bài R-N1-14 của `src/architecture.test.ts` (dòng 557–574) bắt mọi `\bfull_name\b` trong `src/**/*.ts` (trừ test) và `scripts/*.mjs`, chỉ miễn hai tệp của `staff`. Cột `ord_passenger.full_name` do ADR-0047 A2 chốt tên ⇒ tệp SQL mới sẽ làm bài này đỏ ⇒ cần ngoại lệ có tên (NỚI) — ghi đề xuất luật **mục 7 (mới)**, báo điều phối (lượt duyệt thành 4 mục nới) |

**Đỏ sẵn có trên nhánh gốc** (không phải lỗi của việc này):
- Chrome `trang-chu-smoke.mjs`: đòi 2 dòng cảnh báo (Sheet + góp ý) ở Trang chủ máy tính, thấy 1 — kịch bản chưa theo ADR-0038 (Góp ý chỉ Toàn quyền). Đỏ trước mọi thay đổi của ADR-0047.
- e2e đuôi `audit-invariants`: `⚠ R-ORD-6a` 1 vi phạm mức CẢNH BÁO (dữ liệu e2e), không làm e2e đỏ.

## 2. Câu trả lời của chủ dự án

| Câu | Nội dung | Trả lời (nguyên văn, ngày) | Ảnh hưởng |
|---|---|---|---|
| Q0 | Xác nhận lệch có chủ ý hẹp của Hiến chương 5.5: xoá–chèn lại chặng / hành khách của **đơn nháp** (khuyến nghị (a) xác nhận) — trả lời cùng lúc duyệt đề xuất luật mục 2 | **"Cách 1: chỉ giữ bản cuối"** — chủ trả lời trực tiếp phiên điều phối 2026-09-29, **điều phối chuyển lại** cho người thi công. Nghĩa: đơn NHÁP xoá hẳn rồi chèn lại chặng + danh sách khách cùng lô khi lưu nháp; đơn đã xác nhận cấm xoá. Ngoại lệ hẹp của Hiến chương 5.5, ghi "lệch có chủ ý" ở đề xuất luật mục 2; chủ đồng ý ghi rõ trong Hiến chương, nhưng sửa `docs/ARCHITECTURE.md` vẫn đi qua tệp đề xuất luật (chưa duyệt chính thức tệp đó) | Hai câu `*_delete_draft` + `XOA_CUNG_NHAP` (A7) và lô lưu nháp (A9) KHÔNG còn chờ. Chú thích "CHỜ CHỦ DUYỆT" trong mã giữ nguyên tới khi chủ duyệt tệp đề xuất luật |
| Q1 | Dịch vụ cũ có giờ đón mà không có điểm đón: chép thế nào (mặc định (a) "(chưa ghi nơi đón)") | **chưa hỏi** (cần truy vấn chỉ đọc trước). Điều phối: tạm áp khuyến nghị (a) `(chưa ghi nơi đón)` — **giả định chờ chủ chạy truy vấn mục 10 bước 3** | Task A4 (câu chép), A15 (R-ORD-12) |
| Q2 | Khoảng ngày đón so với ngày đi (mặc định (a): −1 / +7 ngày) | **"Sớm 1 ngày, muộn 7 ngày"** — chủ trả lời phiên điều phối 2026-09-29, điều phối chuyển lại. Ngày đón cách ngày đi của dịch vụ từ −1 tới +7 ngày; ngoài khoảng đó máy chặn | Task A3 (`khoangNgayDon`, hai hằng 1 / 7) |
| Q3 | "Chuyến đón hôm nay" ở Trang chủ theo ngày đi hay ngày đón (mặc định (a) ngày đi) | **Giữ theo ngày đi như hiện nay** — chủ trả lời phiên điều phối 2026-09-29, điều phối chuyển lại | Task A8 (`getDashboard`: chọn đơn theo ngày đi, giờ/nơi lấy từ chặng) |
| Truy vấn chỉ đọc (kế hoạch mục 10 bước 3) | Số dịch vụ có dữ liệu đón cũ theo trạng thái; số "giờ không nơi", "chưa có ngày đi", "chưa có nơi trả" | _chờ chủ chạy_ (AI chạy thử câu `SELECT` trên D1 **local** trước — ghi kết quả thử ở đây) | Q1; kiểm sau triển khai |
| Đề xuất luật | Duyệt `…-de-xuat-luat.md` mục 1–4 (mục 5 chỉ để biết; mục 4d tuỳ chọn) | _chờ_ | Task K3 |
| Bản vẽ | Link Claude Design các màn | _chờ_ | Phần B |

## 3. Bảng từng task

Cột "Đột biến P16": sửa cố ý → đỏ → hoàn nguyên → xanh. Chép **nguyên văn** dòng đỏ, kèm ngày.

| Task | Việc | Commit | `npm test` sau | Dòng ĐỎ trước (đã thấy) | Đột biến P16 (ngày · đột biến · dòng đỏ) | Người kiểm |
|---|---|---|---|---|---|---|
| A0 | Điều kiện trước, mốc | (commit tài liệu A0) | 1313/1313 | — | — | — |
| A1 | `ord_` (chờ duyệt), khoá `legacy`, khung `NUA_NGHIEM` | (commit A1) | 1315/1315 | 2026-09-29: hằng thiếu `staff` → `not ok 26 - ADR-0047 A3 (T3b): tập bảng \`legacy\` bằng đúng LEGACY_TABLES — bảng mới không được trốn tiền tố` … `+ 'staff'` | 2026-09-29 · (1) thêm tạm `order_x` `legacy: true` vào sổ + `migrations/9999_p16_tam.sql` `CREATE TABLE order_x` → `not ok 26 - ADR-0047 A3 (T3b) …` `+ 'order_x'` (kèm đỏ phụ "DATA-DICTIONARY.md khớp") → hoàn nguyên → xanh 27/27. (2) `NUA_NGHIEM` đổi module thành `locations` → `not ok 27 … error: 'module "locations" của modules/orders/chang-hanh-khach-repo.ts không còn ở LEGACY — bỏ khỏi NUA_NGHIEM'` → hoàn nguyên → xanh. `ord_` chưa có bảng để thấy chặn — bài dòng 187 (tiền tố đúng module) áp tự động cho `ord_*` ở A4 | chưa |
| A2 | `soKhachHieuLuc` + quét `after_json` + bật EXPLAIN `NUA_NGHIEM` | (commit A2) | 1321/1321; typecheck 0 | 2026-09-29 `so-khach-hieu-luc.test.ts` 4 ca: `not ok 1 … error: 'soKhachHieuLuc is not a function'` (cả 4 ca) | 2026-09-29 · (1) cắm `export const thuP16 = "after_json";` vào `src/shared/order-view.ts` → `not ok 2 - ADR-0047 A3: ngoài src/modules/orders/ …` `+ 'src/shared/order-view.ts:109'` → hoàn nguyên → xanh. (2) cắm `defineSql("orders", "thu", "SELECT id FROM staff")` + `db.prepare("SELECT 1")` vào tệp nửa nghiêm → `not ok 12 … 'orders.thu: đọc TRỰC TIẾP bảng staff của module staff (chỉ được đọc qua view công bố v_*)'` và `not ok 14 … 'modules/orders/chang-hanh-khach-repo.ts:34'` → hoàn nguyên → xanh 27/27 | chưa |
| A3 | Luật thuần chặng + kiểu + `vnLocalToMs` | (commit A3) | 1337/1337; typecheck 0 | 2026-09-29 `node --test src/shared/chang-dua-don.test.ts` → `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/src/shared/chang-dua-don.ts'`; `vn-date.test.ts` → `SyntaxError: The requested module './vn-date.ts' does not provide an export named 'vnLocalToMs'` | — (luật thuần). **Ghi thêm:** `cleanText` (orders/fields.ts) và `maskLongDigits` (orders/pool.ts) CHUYỂN về `src/shared/text-guards.ts` (luật thuần dùng chung không import module); hai tệp cũ xuất lại tên cũ — một luật, không chép. Q2 áp hai hằng 1 / 7. `OrderServiceDto.legs` CHƯA thêm ở A3 (thêm cùng `findOrder` ở A8 để typecheck xanh). Giả định mới G10: thân CŨ gửi giờ đón mà trống điểm đón → nơi đón = `NOI_DON_CHUA_GHI` (cùng nhánh với Q1 (a)) | chưa |
| A4 | Migration `0034` (chặng, loại điểm, chép dữ liệu) | | | | | chưa |
| A5 | Migration `0035` (hành khách, 3 view) | | | | | chưa |
| A6 | Luật thuần hành khách | | | | — (luật thuần) | chưa |
| A7 | Tệp SQL + hai ngoại lệ có tên (chờ duyệt) | | | | | chưa |
| A8 | Mọi nơi đọc chuyển sang chặng | | | | | chưa |
| A9 | Ghi ở lập / sửa nháp; tương thích; ghi kép; xác nhận điền ngày | | | | | chưa |
| A10 | `PUT /trip` trộn vào chặng, dời ngày | | | | | chưa |
| A11 | Route chặng sau xác nhận | | | | | chưa |
| A12 | Ô `order.passenger.write` + route hành khách | | | | | chưa |
| A13 | `hanhKhachChoChuyen` + quét nơi gọi | | | | | chưa |
| A14 | Hàng rào "nhật ký không tên" | | | | | chưa |
| A15 | R-ORD-7…12 | | | | | chưa |
| A16 | E2E `chang-hanh-khach` | | | | — | chưa |
| A17 | Sổ hàng rào | | | — | — | chưa |
| A18 | Tài liệu + đề xuất luật | | | — | — | chưa |
| A19 | Tự kiểm Phần A | | | — | — | — |
| A20 | Kiểm độc lập giữa chừng (nếu điều phối chọn) | | | — | — | |
| B0–B7 | Giao diện theo bản vẽ | | | | | chưa |
| C0–C6 | Phát hành 2 (contract) | | | | | chưa |
| K1–K3 | Mỗi lần phát hành | | | | | |

## 4. Phán quyết của điều phối (Ruling) — kèm giá nếu sai

Kế hoạch mục 0 đề nghị R1–R11. Điều phối chốt, hoặc sửa, rồi chép vào đây **trước Task A3**.

| Mã | Đề nghị (kế hoạch mục 0) | Điều phối chốt (nguyên ý, ngày) | Giá nếu sai |
|---|---|---|---|
| R1 | Hành khách / chặng của đơn nháp chỉ đi trong thân `POST/PUT /api/orders`; route riêng chỉ nhận đơn đã xác nhận | CHẤP NHẬN đúng như đề nghị (điều phối, 2026-09-29) | hai đường ghi đè nhau khi lưu nháp |
| R2 | Tương thích phát hành 1: DTO cũ dẫn xuất từ chặng; khoá vắng = giữ; `PUT /trip` khoá có mặt thì trộn | CHẤP NHẬN (điều phối, 2026-09-29) | bỏ ⇒ Phần A không lên trước bản vẽ được; làm sai ⇒ máy chưa tải bản mới xoá mất chiều về, danh sách khách |
| R3 | Ghi kép hai cột cũ ở phát hành 1 | CHẤP NHẬN (điều phối, 2026-09-29) | bỏ ⇒ lùi Worker về 1.36 thấy giờ đón cũ |
| R4 | Ngày đón trống chỉ ở đơn nháp; máy chủ tự điền; xác nhận điền nốt; đổi ngày đi thì chặng dời theo | CHẤP NHẬN (điều phối, 2026-09-29) | đổi cổng xác nhận người dùng thấy, hoặc chặng lệch ngày đi |
| R5 | Tệp SQL nửa nghiêm + hai ngoại lệ có tên (chờ chủ) | CHẤP NHẬN (điều phối, 2026-09-29); hai ngoại lệ vẫn "CHỜ CHỦ DUYỆT" ở đề xuất luật | mục 16 điểm 4 của kế hoạch |
| R6 | Ba lý do đóng chặng ở mã | CHẤP NHẬN (điều phối, 2026-09-29) | sửa hằng |
| R7 | Điểm danh mục phải đang dùng; mọi loại | CHẤP NHẬN (điều phối, 2026-09-29) | sửa một điều kiện |
| R8 | "Huỷ người" = huỷ cả chuỗi, mới trước cũ sau | CHẤP NHẬN (điều phối, 2026-09-29) | huỷ dòng cuối làm tên cũ "sống lại" |
| R9 | Cờ vượt số khách so với dịch vụ đông nhất | CHẤP NHẬN (điều phối, 2026-09-29) | cờ bật nhầm ở đơn nhiều nhóm |
| R10 | Kiểm độc lập giữa chừng sau Phần A | CHẤP NHẬN — người thi công DỪNG ở Task A20 để người kiểm độc lập soát giữa chừng (điều phối giao, không phải người thi công) | — |
| R11 | `0036` (trigger khoá cột cũ) — mặc định không làm | CHẤP NHẬN mặc định: **KHÔNG làm `0036`; trả số `0036` lại cho điều phối** (điều phối, 2026-09-29) | có ⇒ không lùi được từ phát hành 2 |

## 5. Sự cố

_(ghi theo thời gian: gì xảy ra, ảnh hưởng, đã làm gì)_

## 6. Nợ còn lại (không chặn gộp)

- _(điền)_
- **Đã biết từ kế hoạch:** ngoại lệ `DOC_AUDIT_LOG_WONGUARD` có hạn (chủ chốt ngày ở đề xuất luật mục 3); hết hạn thì `npm test` đỏ.

## 7. Kết quả kiểm của người thi công (tự khai, chưa phải kiểm độc lập)

| Lệnh | Kết quả |
|---|---|
| `npm test` | |
| `npm run typecheck` | |
| `npm run build:web` | |
| `npm run test:e2e` (đủ bộ) | |
| Chrome (mốc A0 + mới) | |
| Tiêu chí mục 3 kế hoạch, từng dòng | |

## 8. Kiểm độc lập (`nguoi-kiem-doc-lap`, chỉ đọc)

### Kiểm độc lập giữa chừng — Task A20

_(điền: mốc commit, phạm vi, kết luận ĐẠT / ĐẠT CÓ ĐIỀU KIỆN / KHÔNG ĐẠT, phát hiện, việc đã sửa)_

### Kiểm độc lập cuối phát hành 1 — Task K2

### Kiểm độc lập Phần B — Task K2

### Kiểm độc lập phát hành 2 — Task K2

## 9. Chưa kiểm (lúc viết mục này)

- _(điền)_

## 10. Phát hành (chủ dự án tự chạy — Task K3)

| Lần | Nhánh / commit | Số bản | Migration | Worker (id) | Mốc lùi | Kiểm sau (kiem-phien-ban, audit remote, GET 401) |
|---|---|---|---|---|---|---|
| Phát hành 1 | | | `0034`, `0035` | | | |
| Phần B (nếu riêng) | | | không | | | |
| Phát hành 2 | | | `0036` nếu R11 | | | |
