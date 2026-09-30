# Nhật ký thi công — Lượt 1: ADR-0058 (nhóm dịch vụ) + ADR-0062 (báo tin khi đơn đổi sau xác nhận)

- **Kế hoạch:** `docs/superpowers/plans/2026-09-30-luot-1-adr-0058-0062-ke-hoach.md` (vai lập kế hoạch, 2026-09-30; đo trên `3a39b5a7`).
- **Đề xuất sửa luật:** `docs/superpowers/plans/2026-09-30-luot-1-de-xuat-luat.md` (Task A8 / B8 tạo; chủ duyệt; điều phối áp lúc gộp).
- **Nguồn chuẩn tắc:** ADR-0058 (accepted 2026-09-30, lượt 1a), ADR-0062 (accepted 2026-09-30, lượt 1b; câu 3 = A, câu 5 = Có, câu 6 = không ghi nơi đón mới).
- **Nhánh thi công Phần A:** _(chưa có)_
- **Nhánh thi công Phần B:** _(chưa có — chỉ bắt đầu sau khi Sổ tiền gộp `main`, Task B0)_
- **Cách thi công:** _(điều phối ghi: subagent-driven / executing-plans)_
- **Trạng thái:** CHƯA BẮT ĐẦU.
- **Người ghi nhật ký này không tự nghiệm thu** (N8). Kết quả kiểm độc lập ghi ở mục 5.

## 1. Mốc ban đầu

### 1.1 Phần A (Task A0)

| Bước | Kết quả |
|---|---|
| 1. Đỉnh `main`; số bản trên `main` | `main` = `970f705d` ("Nhật ký phiên bản: sửa bảo trì tự tắt chuyển sang bản 1.43"); nhánh thi công gộp `main` ở `a76b2792`. Số bản đầu `changelog.ts` = **1.43** (bảo trì tự tắt). Phần A dời thành **1.44** (điều phối chốt, chưa sửa changelog ở A0/A1) |
| 2. Sổ tiền (1.41) và nhánh 1.42 đã gộp `main` chưa | Cả hai ĐÃ gộp `main` (danh sách nhánh đã gộp `main` có `worktree-agent-aa1fab0316112d404` và `worktree-agent-a70eb0a16a8dbebb3`); `main` có `0044`, `0045`, `src/shared/loc-danh-muc.ts` |
| 3. Số migration (`ls migrations` + quét mọi nhánh); `0046` còn trống | `ls migrations` tới `0045_billing_so_cong_no.sql`. Lệnh quét mọi nhánh (khuôn kế hoạch §2) cho `0044`, `0045`, **`0050_tro_ly.sql`** (nhánh khác chưa gộp). `0046` CÒN TRỐNG trên mọi nhánh → dùng `0046_nhom_dich_vu.sql`. (Lưu ý cho điều phối: một nhánh khác đã giữ `0050` — không đụng `0046`–`0049`) |
| 4. Ảnh chụp Sheet: giờ, số byte, sha256; khớp 110 mã của ADR | Tải 2026-09-30 (phiên thi công A0/A1): **26 888 byte**, sha256 `6a06864f847c7308d4a5968ca3ac20bd70a6b639f7d1d70b27601077b867f713` = TRÙNG ảnh chụp của ADR. Đối chiếu bằng máy (phân tích CSV, cột 1 / 13 / 14 với bảng ADR): 110 mã, không trùng, KHỚP đúng 110 mã của ADR (không thừa, không thiếu); mã nhóm cột 14 khớp ADR ở 109/110 mã, lệch DUY NHẤT `ATV` (CSV `TBA`, ADR `KON` — đúng chỗ lỗi ADR đã nêu); tên nhóm cột 13 khớp 14/14 (trừ nhãn của ATV) |
| 5. Mốc `npm test` / `typecheck` (số test, số lỗi, `uptime` nếu ca CPU đỏ) | `npm test` bước 1: 1993 test, 1993 xanh, 0 đỏ; bước 2 (bài đo giờ hook): 1/1 xanh (`uptime` load ~3.9). `npm run typecheck`: 0 lỗi (cả ba tsconfig). Đo TRƯỚC khi có `0046` |
| 6. Mốc e2e + `audit-invariants --db local` (đỏ sẵn có) | `npm run test:e2e`: **31/31 kịch bản xanh** (gồm `audit-invariants` cuối chuỗi trên D1 tạm). Có wrangler dev mồ côi của worktree khác (`bao-tri-tu-tat`) đang chạy, dùng thư mục tạm riêng nên không khoá; tôi không tắt (không phải của phiên này). `node scripts/audit-invariants.mjs --db local` chạy trên D1 local của worktree (chưa nạp nhân viên): thoát 1, MỘT bất biến `R-N1-5` (chưa có quản trị viên) — do D1 local trống, không liên quan `0046`; e2e (D1 tạm có tài khoản) thì sạch |
| 7. Độ lệch `tệp:dòng` so với §4 kế hoạch | Đo trên `970f705d`+nhánh: `architecture.test.ts` `STRICT` `:64`, `LEGACY` `:84`, `LEGACY_TABLES` `:105`, `NUA_NGHIEM` `:124`, `DOC_AUDIT_LOG_WONGUARD` `:147`, `TABLE_PREFIX` `:160` (kế hoạch `:55`, `:74`, `:88`, `:107`, `:126`, `:137` — lệch +9…+23; `:160` đã tính một dòng chú thích tôi thêm). `catalog/index.ts`: `catalogForOrderForm` `:81` (khớp), `GET /api/catalog` `:99`, `for-order` `:110` (kế hoạch `:102`, `:112` — lệch ≤ 3). `catalog/repository.ts`: `ON CONFLICT(code)` `:125`, `in_sheet = 0` `:132`, xoá `catalog_override` `:166` (khớp). `contracts.ts`: `CatalogServiceDto` `:475`, `CatalogAdminItemDto` `:481`, `CatalogPublicResponse` `:506` (khớp). `web/catalog-picker.ts` 123 dòng (bản 1.42 viết lại, `KHOA_NHO` `:24`); `web/catalog.ts` 220 dòng (khớp); `web/order-form.ts` gọi danh mục ở `:323`, `:439`, `:496`, `:523` (kế hoạch `:103`, `:228`, `:324`, `:485` — lệch nhiều: A6 đo lại). `audit-actions.ts` nhóm `catalog` `:118-122` (kế hoạch `:108-112`) |
| 8. Hai số đếm chỉ-đọc do chủ chạy (`co_mat`, `dang_tren_sheet`, `ngoai_bang_gieo`) | CHƯA — nhờ điều phối chuyển lệnh ở kế hoạch §9 bước 1 cho chủ; không chặn A1–A4, chỉ chặn K3A |

### 1.2 Phần B (Task B0)

| Bước | Kết quả |
|---|---|
| 1. Cổng: Sổ tiền đã gộp `main` | |
| 2. Độ lệch `tệp:dòng` (`insertMoneyAdjustment`, `handler-money-edit`, `dispatch.mjs`, `THAY_DOI`, `HANH_DONG_CUA_THAY_DOI`, `router.ts`) | |
| 3. `INSERT INTO order_money_adjustment` trong mã chạy | |
| 4. `order_money_adjusted` đã khai chưa (ADR-0063 lên trước?) | |
| 5. `v_aud_trip_event` có chưa (ADR-0052 D6 lên trước?) | |
| 6. Đối tác / Thực tập mở được `/order?id=` không | |
| 7. Số migration; `0047` còn trống | |
| 8. Chỉ mục `audit_log` theo `order_id` | |
| 9. Mốc test đủ bộ | |

## 2. Câu trả lời của chủ dự án

| Câu | Trả lời (nguyên văn, ngày giờ, kênh) | Áp ở |
|---|---|---|
| Q1 — cách đặt chip nhóm dịch vụ (Task A5) | **Cách 1** — chủ chọn ngày 30/9 (điều phối chuyển lời trong đề bài Task A6): hàng riêng "Nhóm dịch vụ" dưới hàng lọc 1.42, lọc kết hợp VÀ, đổi chữ "Theo nhóm" → "Giá theo nhóm", dòng "Đang lọc: <tên> — N dịch vụ · Bỏ lọc" như ảnh phác | Task A6 |
| Duyệt đề xuất luật mục A | **"Duyệt cả 4 (Recommended)"** — chủ trả lời 1/10 qua hộp hỏi của phiên điều phối chung (A-1 `src/CLAUDE.md`, A-2 `web/CLAUDE.md`, A-3 `docs/ARCHITECTURE.md` Phần II, A-4 `docs/adr/README.md`); điều phối áp đúng diff, mỗi tệp một commit | K3A |
| Duyệt đề xuất luật mục B | _(chờ)_ | K3B |

## 3. Bảng từng task

| Task | Commit | Đỏ trước (dòng đỏ nguyên văn) | Xanh sau (lệnh + số) | P16 (đột biến → đỏ → hoàn nguyên) | Dòng `SO-HANG-RAO` | Ghi chú |
|---|---|---|---|---|---|---|
| A0 | (chỉ sổ; cùng commit với A1) | không áp dụng | không áp dụng (mốc: 1993 + 1 test xanh, typecheck 0, e2e 31/31) | không áp dụng | không áp dụng | Xem §1.1 |
| A1 | "Nhóm dịch vụ: migration 0046 …" (SHA ghi ở báo cáo) | `node --test src/migrations-0046.test.ts` (migration tạm dời đi): `not ok 1 - NT-A3: danh sách gieo trong 0046 đúng bảng ADR-0058…` / `error: "ENOENT: no such file or directory, open '…/migrations/0046_nhom_dich_vu.sql'"`; `not ok 2 - NT-A3: 14 nhóm gieo…` / `error: 'no such table: ctl_group'`; `not ok 3 - NT-A2: DB có đủ 110 mã…` / ENOENT. Ghi chú trung thực: migration đã soạn nháp trước khi chạy đỏ, nên ca đỏ lấy bằng cách dời tệp tạm rồi trả lại | `node --test src/migrations-0046.test.ts` → 11/11 xanh; `npm test` → 2004 + 1 xanh, 0 đỏ; `npm run typecheck` → 0 lỗi; `npm run db:migrate:local` → `0046_nhom_dich_vu.sql` ✅; `npm run test:e2e` → 31/31 xanh | Xem "P16 chi tiết A1" ngay dưới bảng | 2 dòng mới cuối `docs/SO-HANG-RAO.md` | Sửa thêm 4 tệp test cũ đếm `audit_log` trên schema đầy đủ (dòng gieo `catalog_groups_seeded` làm chúng đỏ 14 ca) — xem ruling A1-1 |
| A2 | "Nhóm dịch vụ: tệp SQL nửa nghiêm `nhom-repo.ts` …" (SHA ở báo cáo A2) | `node --test src/modules/catalog/nhom-rules.test.ts src/architecture.test.ts`: `not ok 13 - ADR-0002 điều 8(b): SQL đã đăng ký của module nghiêm …` / `Cannot find module …/src/modules/catalog/nhom-repo.ts` (ERR_MODULE_NOT_FOUND); các bài `.prepare(` thô và XOA_CUNG_NHAP / DOC_AUDIT_LOG_WONGUARD cũng đỏ cùng lỗi nạp | xem báo cáo A2 (số test ghi lúc chạy `npm test`) | (1) `db.prepare("SELECT 1 FROM catalog_override")` → `not ok 15 …` `.prepare(` thô; (2) `defineSql` đọc `orders` → `catalog.doc_orders_tam: đọc TRỰC TIẾP bảng orders …`; (3) `LEFT JOIN v_stf_staff_label` → `cạnh catalog → staff chưa khai`; (4) `DELETE FROM ctl_group` → `xoá cứng bảng ctl_group`; (5) `CATALOG_LEGACY_HAN = "2026-01-01"` → `catalog quá hạn LEGACY 2026-01-01 …`; hoàn nguyên → xanh | 2 dòng mới ("`nhom-repo.ts` nửa nghiêm", "Hạn lệch LEGACY `catalog`") | Lệch nhỏ: `nhom-repo.ts` không import `../audit` (bài nạp tệp thẳng bằng Node) — hàm ghi trả câu chuẩn bị, `index.ts` ghép `auditStatement` (A3) |
| A3 | `39b106ad` "Nhóm dịch vụ: năm route quản trị nhóm + nhóm trong DTO danh mục …" | `node --test src/modules/catalog/danh-muc-lap-don.test.ts src/modules/catalog/nhom-route.test.ts src/route-access.test.ts`: 11 đỏ — `not ok 1 - ADR-0033: … đúng sáu khoá` (thiếu `'groups'`), `not ok 6/7 - ADR-0058 Đ5 …`, `not ok 8 - NT-A6 …` / `Bán hàng GET /api/catalog/groups undefined: {"error":{"code":"method_not_allowed",…}}`, `not ok 16 - mức truy cập của 181 route …`; `npm run test:e2e -- catalog` trên `index.ts` cũ: `TypeError: Cannot read properties of undefined (reading 'length')` ở `dsAdmin.groups.length` | cùng lệnh → xanh; `npm test` bước 1: 2078/2078 xanh (bước 2 đo giờ hook đỏ — máy tải cao, xem báo cáo); `npm run typecheck` 0 lỗi; `npm run test:e2e -- catalog` → `E2E CATALOG OK`; `npm run test:e2e` đủ bộ → `E2E: 33/33 kịch bản xanh`; `audit-invariants --db local` → exit 1 chỉ `R-N1-5` (D1 local không có quản trị — có sẵn, không do A3) | Xem "P16 chi tiết A3" dưới bảng | không dòng mới (hàng rào 1, 2 và bài khoá DTO sẵn có) | Lệch đề bài: đột biến "dời `can` xuống sau `readJson`" KHÔNG làm hàng rào 2 đỏ (hàng rào không canh thứ tự — đúng giới hạn đã ghi ở đầu tệp bài) — thay bằng bài hành vi `nhom-route.test.ts` (xem P16) |
| A4 | "Nhóm dịch vụ: kiểm định kỳ R-CTL-1 …" (SHA ở báo cáo A4) | `node --test --test-name-pattern="R-CTL-1" src/audit-invariants.test.ts`: `not ok 1 - R-CTL-1 (ADR-0058 NT-A11): …` / `phải có đúng một kiểm R-CTL-1` | `node --test src/audit-invariants.test.ts` 84/84; `npm test` bước 1 + bước 2 thoát 0 (load ~6–8); typecheck 0; `audit-invariants.mjs --db local`: R-CTL-1 ✓ (0), chỉ đỏ R-N1-5 có sẵn (D1 local chưa có quản trị, không phải của A4) | Đổi tạm câu thành `SELECT 0 …` → `not ok 84 - R-CTL-1 …` / `expected: 1` / `actual: 0`; hoàn nguyên → 84/84 | Có (mức cảnh báo, không chặn; 2026-09-30) | Ca phủ: không dòng gán, có nhóm, group_code NULL hiện hành, nhóm hiện hành đã tắt, ẩn bằng override, in_sheet = 0; SYSTEM-DESIGN mục bất biến thêm R-CTL-1 |
| A5 | | | | | | |
| A6 | "Nhóm dịch vụ: chip lọc nhóm ở ô chọn dịch vụ …" (SHA ở báo cáo A6) | `node --test src/shared/loc-danh-muc.test.ts`: `SyntaxError: The requested module './loc-danh-muc.ts' does not provide an export named 'CHUA_PHAN_LOAI'` (cả tệp đỏ — hàm chưa có) | `node --test src/shared/loc-danh-muc.test.ts` 9/9; `npm run typecheck` 0 lỗi; `npm run build:web` sạch; `npm test` bước 1 + bước 2 thoát 0 (2087 + 1 bài; tải máy ~8–9); Chrome `chip-nhom-smoke.mjs` 8/8 bước (390 + 1040) — `CHIP NHOM SMOKE OK`; chạy lại `loc-don-smoke.mjs` OK, ba `a2-smoke-*.mjs` (form, order, sheet) OK, `doi-tac-lap-don-smoke.mjs` 7/7, `danh-muc-lap-don-smoke.mjs` 5/6 (bước 4 đỏ CÓ SẴN trên `6c78a7a6`, xem ruling A6-1) | Bỏ id khỏi `khoaNhoNhom` → build → kịch bản đỏ bước 6: `AssertionError [ERR_ASSERTION]: tài khoản khác không nhớ lẫn nhóm của A` → hoàn nguyên → build → OK | Có (dòng "Kịch bản Chrome chip-nhom-smoke.mjs …", ghi "không chạy tự động trong CI") | Ảnh `docs/evidence/2026-09-30-nhom-dich-vu/*.png`; giả định bề mặt ở ruling A6-2 |
| A7 | "Nhóm dịch vụ: màn Danh mục quản lý nhóm …" (SHA ở báo cáo A7); việc kèm: `81af9ad5` (kịch bản `danh-muc-lap-don` bước 4), `bcc3c2f4` (sổ tồn đọng mục 9) | Chrome `danh-muc-nhom-smoke.mjs` trên `web/catalog.ts` cũ: `✗ 1) 1040: khối 'Nhóm dịch vụ' ở đầu trang …` / `hết giờ chờ: không thấy khối Nhóm dịch vụ` (`0 bước ✓, 1 bước ✗ (dừng ở bước 1)`); `node --test src/shared/lich-su-nhom.test.ts`: `ERR_MODULE_NOT_FOUND … lich-su-nhom.ts` | `node --test src/shared/lich-su-nhom.test.ts` 4/4; `npm run typecheck` 0 lỗi; `npm run build:web` sạch; `npm test` bước 1 + bước 2 thoát 0 (lần đầu bước 1 đỏ đúng một bài "sơ đồ trang" → chạy `node scripts/sinh-so-do-trang.mjs` → xanh; tải máy ~44); Chrome `danh-muc-nhom-smoke.mjs` **10/10** (1040 + 390) `DANH MỤC NHÓM SMOKE OK`; chạy lại `chip-nhom-smoke.mjs` OK (chạm `app.css`); `dot-a-smoke.mjs` (có `AXE_JS`): `dich-vu` 1040 + 390 ✓ kể cả axe, đỏ ở `nhat-ky` như cũ (ADR-0038, có sẵn); `danh-muc-lap-don-smoke.mjs` 6/6 sau việc kèm (1) | Thay lời gọi `GET /api/catalog/:code/group-history` bằng `Promise.resolve({ items: [] })` → build → kịch bản `✗ 8) … hết giờ chờ: lịch sử 2 dòng` (`7 bước ✓, 1 bước ✗`) → hoàn nguyên → build → 10/10 | không dòng mới (kịch bản Chrome giao diện, không phải hàng rào máy chủ) | Ảnh chủ duyệt: `docs/evidence/2026-09-30-nhom-dich-vu/danh-muc-nhom-{1040,1040-sua-lich-su,390,390-chon}.png`; giả định bề mặt ở ruling A7-1; ruling A6-1 đã xử lý (việc kèm 1) |
| A8 | | | | | | |
| K1A | | | | | | |
| B0 | | | | | | |
| B1 | | | | | | |
| B2 | | | | | | |
| B3 | | | | | | |
| B4 | | | | | | |
| B5 | | | | | | |
| B6 | | | | | | |
| B7 | | | | | | |
| B8 | | | | | | |
| K1B | | | | | | |

**P16 chi tiết A1 (2026-09-30, mỗi phép: sửa tạm → chạy `node --test` → hoàn nguyên; `cmp` với bản sao xác nhận nguyên vẹn):**

| Đột biến | Kết quả đỏ (nguyên văn) |
|---|---|
| bỏ trigger `ctl_service_group_no_update` | `not ok 6 - NT-A1: ctl_service_group chỉ-thêm (không sửa, không xoá)` / `error: 'Missing expected exception.'` |
| bỏ trigger `ctl_service_group_no_delete` | cùng ca 6, cùng thông báo |
| bỏ trigger `ctl_group_no_delete` | `not ok 7 - NT-A1: ctl_group không xoá được (tắt bằng active = 0), sửa tên / tắt vẫn được` / `Missing expected exception.` |
| bỏ trigger `ctl_service_group_active_group` | `not ok 8 - NT-A1: gán vào nhóm đang tắt bị chặn; bật lại thì gán được; …` và `not ok 9 - NT-A1: khoá ngoại — …` (2 ca đỏ) |
| bỏ chỉ mục `ctl_group_name_active` | `not ok 11 - NT-A1: tên trùng giữa hai nhóm ĐANG DÙNG → lỗi duy nhất; …` / `Missing expected exception.` |
| bỏ `UNIQUE (service_code, seq)` | `not ok 10 - NT-A1: trùng (service_code, seq) → lỗi duy nhất; seq < 1 → lỗi CHECK` / `Missing expected exception.` |
| bỏ `REFERENCES catalog_item (code)` | `not ok 9 - NT-A1: khoá ngoại — service_code phải có trong catalog_item; nhóm lạ bị chặn` / `Missing expected exception.` |
| `('ATV','KON')` → `('ATV','TBA')` | 3 ca đỏ: `not ok 1 - NT-A3: danh sách gieo trong 0046 đúng bảng ADR-0058 (110 cặp, 14 nhóm, ATV → KON)`, `not ok 3 - NT-A2: DB có đủ 110 mã…`, `not ok 5 - NT-A2: DB thiếu một phần mã…` |
| bỏ câu `INSERT INTO audit_log` | 3 ca đỏ: `not ok 3`, `not ok 4 - NT-A2: DB chưa đồng bộ Sheet → 14 nhóm, 0 gán, detail 'gieo 14 nhóm, 0 dịch vụ'`, `not ok 5` |
| bỏ `ctl_: "catalog"` khỏi `TABLE_PREFIX` (`src/architecture.test.ts`) | `not ok 6 - ADR-0002 điều 2: bảng mới có tiền tố đúng module; bảng không tiền tố phải đánh dấu legacy` / `error: 'ctl_group không có tiền tố module nên phải đánh dấu "legacy": true (tên cũ giữ nguyên)'` |

Kịch bản đột biến nằm ngoài repo (thư mục tạm của phiên), không commit.

**P16 chi tiết A3 (2026-09-30, mỗi phép: sửa tạm `src/modules/catalog/index.ts` → chạy `node --test` → hoàn nguyên từ bản sao; `git diff --stat` xác nhận chỉ còn thay đổi thật):**

| Đột biến | Kết quả |
|---|---|
| dời `if (!can(staff, "admin.manage")) …` của `POST /api/catalog/groups` xuống SAU `readJson` (đề bài) | **KHÔNG đỏ**: `route-write-guard` + `permission-enforcement` 14/14 xanh, `nhom-route.test.ts` 7/7 xanh. Hàng rào 2 không canh thứ tự (giới hạn đã ghi ở đầu `src/route-write-guard.test.ts`); cổng thô `admin` của router chặn năm vai kia TRƯỚC thân nên bài hành vi cũng không thấy |
| bỏ hẳn dòng `can` ở `POST /api/catalog/groups` | `route-write-guard` đỏ 2 ca: `not ok 1 - hàng rào 2: mọi đường ghi …` / `Đường ghi chỉ dựa cổng thô …: POST /api/catalog/groups (catalog, access "admin")`, `not ok 2 - hàng rào 2 (ADR-0019) …` |
| đổi tạm cổng `PUT /api/catalog/group-assignments` sang `office`, `can` vẫn dòng đầu | `nhom-route.test.ts` 7/7 xanh (ô trong thân tự chặn được) |
| như trên + dời `can` xuống SAU `kiemLoGan` | `not ok 1 - NT-A6: … hỏi quyền TRƯỚC khi đọc thân …` / `Bán hàng PUT /api/catalog/group-assignments {"codes":["TD0",…,"TD50"],"groupCode":"TTB"}: {"error":{"code":"invalid_input","message":"Mỗi lần gán tối đa 50 dịch vụ."}}` |
| thêm tạm `sheetRow: 1` vào `publicItem` (đề bài) | `not ok 1 - ADR-0033: … đúng sáu khoá mỗi dịch vụ …` / `+   'sheetRow',` |

Kết luận: thứ tự "hỏi quyền trước khi đọc thân" trong THÂN route hôm nay **dựa vào kỷ luật + người kiểm đọc mã** (cổng `admin` trùng ô `admin.manage` nên không bài nào thấy được); thiếu hẳn `can` do hàng rào 2 luật (4) bắt.

**Vòng sửa 1 của A3 — F1 (2026-09-30, điều phối quyết: "tắt nhóm còn dịch vụ → 409" là bất biến ADR-0058):** câu `group_update` (`src/modules/catalog/nhom-repo.ts`) thêm `AND (?4 = 1 OR NOT EXISTS (dịch vụ HIỆN HÀNH của nhóm))`; PATCH (`index.ts`) khi `changes = 0` đọc lại nhóm: mốc còn khớp + yêu cầu tắt → 409 "Nhóm còn N dịch vụ…", còn lại → 409 sai mốc.

| Bước | Kết quả |
|---|---|
| Đỏ trước: ca mới `nhom-repo.test.ts` trên câu cũ | `not ok 7 - F1 (vòng sửa A3): câu TẮT nhóm tự chặn …` / `nhóm còn dịch vụ hiện hành → câu tắt không ghi` / `expected: 0 actual: 1` |
| P16: bỏ tạm điều kiện `NOT EXISTS` (sau khi đã xanh) | 2 ca đỏ: `not ok 7 - F1 … câu TẮT nhóm tự chặn …` (`expected: 0 actual: 1`) và `not ok 14 - F1 (vòng sửa A3): tắt nhóm — lô gán chen vào SAU lần đếm → 409 …` (`expected: 409 actual: 200`) → hoàn nguyên từ bản sao → 15/15 xanh |

## 4. Ruling, lệch kế hoạch, nợ

| # | Ngày | Nội dung | Ai quyết | Hệ quả |
|---|---|---|---|---|
| K0 | 2026-09-30 | Kiểm độc lập **bản kế hoạch**: ĐẠT CÓ ĐIỀU KIỆN (1 CAO, 4 VỪA, 10 THẤP). Người lập kế hoạch sửa hết trên nhánh `ke-hoach-luot-1-adr-0058-0062` — bảng dưới | điều phối giao sửa | Kế hoạch đủ điều kiện giao thi công |
| A1-1 | 2026-09-30 | Dòng nhật ký `catalog_groups_seeded` do migration gieo (ADR-0058 Đ7, NT-A2) làm ĐỎ 14 ca ở 4 tệp test cũ vốn giả định `audit_log` rỗng trên schema đầy đủ (`src/migrations-0017.test.ts`, `src/modules/accounts/patch-staff.test.ts`, `src/modules/accounts/reset-pin-self.test.ts`, `src/modules/audit/an-toan-quyen.test.ts`). Sửa: các bài chỉ bỏ dòng gieo (`action != 'catalog_groups_seeded'` / id `gieo-nhom-dich-vu`) khỏi phép đếm — không đổi ý nghĩa bài | thi công A1 (bề mặt test, đảo ngược được; ghi để điều phối biết) | Bài tương lai đếm `audit_log` trên schema đầy đủ cũng phải bỏ dòng này (ghi ở CHANGE-GUIDE §3). **Việc cho A3:** khai hành động `catalog_groups_seeded` (nhãn tiếng Việt) ở `src/shared/audit-actions.ts` — trang Nhật ký của Toàn quyền sẽ liệt kê dòng gieo này sau khi `0046` lên production; chưa khai thì chữ hiển thị là mã thô |

**Phát hiện → chỗ sửa trong kế hoạch (vòng kiểm kế hoạch 30/9):**

| Mã | Phát hiện | Chỗ sửa |
|---|---|---|
| C1 | `service_group_history` JOIN `v_stf_staff_label` → cạnh `catalog → staff` (cấm) | §5.2 bỏ JOIN, trả `created_by`; §5.4 route trả `createdBy` (id), tên ghép phía web từ `GET /api/staff` (`accounts/index.ts:331`, `admin` + `admin.manage`); NT-A4 thêm "`ALLOWED_EDGES.catalog` vẫn `["audit"]`, không `v_stf_*`"; A2 P16 thêm đột biến JOIN; A7(c) ghép tên; K2A bước 4 |
| V1 | `v1-nguoi-phu-trach.mjs` bước o khẳng định `detail` = lý do | §4 dòng bẫy mới; B2 tệp sửa + kỳ vọng "kết thúc bằng lý do"; K2B (5) chạy lại |
| V2 | `ghiDatGapNhatKy`/`DAU_DAT_GAP` ở `orders/dat-gap.ts:93-94` | B3: chốt chuyển sang `src/shared/chang-dua-don.ts` cạnh `LY_DO_DAT_GAP`, `dat-gap.ts` import lại; khứ hồi canh `kemDatGap` |
| V3 | Đường màn hình khoá chưa chốt | B5 mục "Chốt một đường": sửa `loaiTinDon` (chữ ký giữ) + `locHopThongBao` (thêm `mocTinDoi?`); `hop()` nối vào `don`; `nguoiNhanDay` / `web-push.ts` không sửa; B6 bỏ "nếu cần" |
| V4 | Mốc = lúc phát hành, không phải lúc gộp | §5.6; NT-B16 mới (bài thuần, `test.todo` tới K1B); K1B, K2B (6), K3B (gộp–triển khai liền nhau), R7 |
| T1 | Số dòng `thong-bao.ts`, `web-push.ts`, `catalogForOrderForm` | §4, ràng buộc chung |
| T2 | `dispatch.mjs:502,510` | §4, B2 |
| T3 | Sổ tiền `:1118` / `:1134` | §4, B0 |
| T4 | NT-B1 dò nhãn mọi vị trí, cả nhánh "thêm —" | B1 bài regex + ghi chú `chang-dua-don.ts:272`, `:278-279` |
| T5 | NT-A5 chỉ đỏ qua đột biến; A2 cần đỏ trước | NT-A5; A2 bước 1 thêm dòng `NUA_NGHIEM` trước |
| T6 | Sổ dữ liệu không có mục trigger / chỉ mục | §5.1 cuối, A1 bước 3: `ctl_group` kind `lookup` |
| T7 | Bật lại nhóm trùng tên | NT-A7 |
| T8 | Chú thích 1.42 nói chip vào CUỐI hàng | §12 Q1 ghi lý do vẫn khuyến nghị cách 1 |
| T9 | Bộ chọn dựng trước `initShell` | §5.5 + A6: `setTaiKhoan(staffId)` gọi sau `order-form.ts:487` |
| T10 | Lưu y nguyên không ghi dòng | B6: không `detail` ⇒ không `tinDoi` (`orders/index.ts:359`), thêm ca |

**Vòng 2 kiểm kế hoạch (30/9): ĐẠT CÓ ĐIỀU KIỆN — sửa nốt:**

| Mã | Phát hiện | Chỗ sửa |
|---|---|---|
| N1 (VỪA) | NT-B1 quét cả tệp sẽ đỏ vì câu báo lỗi cũng chứa nhãn (`service-rules.ts:86-91`, `:340-341`; `chang-dua-don.ts:126,133,137,142`) | B1: bài chỉ quét đoạn viết nhật ký (`TRIP_VALUE_FIELDS` → trước `describeTripUpdates`; thân `moTaChang`), vẫn bắt nhánh "thêm —" và nhánh sửa; dấu cắt không thấy → đỏ; ghi rõ câu báo lỗi ngoài phạm vi; P16 thêm đột biến trong thân `moTaChang` và ca đối chứng ngoài đoạn vẫn xanh |
| N2 (THẤP) | §5.4 thiếu nhánh 409 bật lại trùng tên | §5.4 dòng `PATCH /api/catalog/groups/:code` |
| N3 (THẤP) | Màn Danh mục tải `/api/staff` (có SĐT) chỉ để lấy tên | Ghi nợ N-1 ở bảng dưới |
| N4 (THẤP) | NT-B16 tạo trước khi có hằng → lỗi import đỏ cả tệp | NT-B16 tạo ở B5 (dạng `test.todo`), bật ở K1B; thêm bước ở B5 |

**Nợ đã chấp nhận:**

| # | Nợ | Vì sao chấp nhận | Đề xuất gỡ |
|---|---|---|---|
| N-1 | Màn Danh mục (A7) tải `GET /api/staff` — trả cả SĐT — chỉ để ghép tên người sửa vào lịch sử nhóm | Cùng quyền `admin.manage` với màn Tài khoản (người xem vốn thấy SĐT ở đó); không mở dữ liệu cho ai mới; tránh cạnh `catalog → staff` (C1) | Sau này thêm route nhãn hẹp (id → tên hiển thị) cho các màn Quản trị cần ghép tên; ADR / kế hoạch riêng |
| N-2 | Số "Chưa phân loại" của `GET /api/catalog/groups` (`chuaPhanLoai`) đếm MỌI dịch vụ của danh mục không có nhóm hiện hành — kể cả dịch vụ ẩn / đã rời Sheet; khác chip "Chưa phân loại" của form đơn (chỉ dịch vụ đang hiện) và khác kiểm định kỳ A4 (dịch vụ đang hiện) | Cùng gốc với `soDichVu` (đếm mọi dòng gán hiện hành) nên tổng khớp danh mục quản trị (điều phối, vòng sửa A3) | **Việc cho A7:** màn Quản trị ghi nhãn rõ con số này gồm cả dịch vụ ẩn / đã rời Sheet |
| N-3 | `GET /api/catalog` và `GET /api/catalog/for-order` nay đọc `ctl_group` / `ctl_service_group` (A3) — deploy mã khi D1 chưa có migration `0053` thì hai route này lỗi, form đơn không mở được danh mục | Hai route bắt buộc phải có nhóm (ADR-0058 Đ5) | **Việc cho K3A (runbook):** migration `0053` BẮT BUỘC áp trước `wrangler deploy` (`npm run trien-khai` đã áp migration trước deploy — ghi rõ vào runbook phát hành) |

**Ruling A6-1 (2026-09-30, người thi công A6 — chỉ ghi nhận, không sửa):** `docs/evidence/2026-09-27-danh-muc-lap-don/kich-ban/danh-muc-lap-don-smoke.mjs` bước 4 ("Kế toán … KHÔNG gọi danh mục") đỏ: `Kế toán: form không gọi route danh mục nào — thấy ["/api/catalog/for-order"]`. Đã chạy lại trên mã GỐC `6c78a7a6` (tạm gỡ thay đổi A6, build lại) → **cùng đỏ** ⇒ không do A6. Nghi do "gọi sớm" (`web/goi-som.ts`, bản nhớ khung ADR-0035 của tài khoản trước trong cùng hồ sơ Chrome) — chưa điều tra. Máy chủ vẫn trả 403 cho Kế toán; đây là kỳ vọng của kịch bản, không phải lỗ quyền. Việc cho điều phối: giao người sửa kịch bản hoặc mã.

**Ruling A7-1 (2026-09-30, người thi công A7 — giả định bề mặt, đảo ngược được):** (a) Khối "Nhóm dịch vụ" luôn mở ở đầu trang, liệt kê cả nhóm đã tắt (nhãn "Đã tắt", nút "Bật"); ở 390px khối dài ~15 dòng trước bảng dịch vụ — nếu chủ thấy vướng, đổi thành khối thu gọn được là việc giao diện nhỏ. (b) Nút ở hàng / thẻ dịch vụ GIỮ chữ "Sửa giá" (hướng dẫn Quản trị `src/shared/huong-dan-quan-tri.ts` trỏ `[[Sửa giá]]`); phần nhóm + lịch sử nằm cuối hộp đó, dưới "Lưu ghi đè / Đóng", có nút "Đổi nhóm" riêng (không gộp vào "Lưu ghi đè"). Hướng dẫn Quản trị chưa có đoạn về nhóm — chưa sửa. (c) Ô "Chuyển sang nhóm" mặc định "Chọn nhóm…" (bấm Chuyển khi chưa chọn → "Chọn nhóm đích trước.", không gửi); có lựa chọn "Chưa phân loại" (máy chủ nhận `groupCode: null`). (d) Quá 50: nút đổi chữ "Tối đa 50 dịch vụ một lần" và bị khoá, kèm dòng "bỏ chọn bớt N dịch vụ". (e) Lên / Xuống = đổi `sortOrder` với nhóm kề bằng hai PATCH (mỗi cái mang `updatedAt` của chính nhóm); PATCH thứ hai lỗi thì vẫn tải lại để thấy trạng thái thật (có thể hai nhóm cùng thứ tự — bấm lại sửa được). (f) Lịch sử: "từ" lấy nhóm của dòng cũ hơn kế tiếp, dòng cũ nhất từ "Chưa phân loại"; giờ theo giờ Việt Nam dạng "dd/mm hh:mm". (g) `GET /api/staff` lỗi → mọi người sửa hiện "Người dùng cũ" (không chặn lịch sử). (h) Đổi nhãn nút → đã chạy `node scripts/sinh-so-do-trang.mjs` (bài "sơ đồ trang" của `npm test` đỏ nếu quên). (i) Lỗi 400/409 khi thêm / đổi tên nhóm: chữ đã gõ được giữ trong ô (kịch bản bước 2 canh). (j) Đã đối chiếu: các route một dịch vụ (`PATCH /api/catalog/:code`, `…/ack`, `…/override`) trả `item` có `groupCode` THẬT (`catalog/index.ts:58`) — ẩn / hiện lại không làm cột Nhóm rơi về "Chưa phân loại" (kịch bản bước 8 canh).

**Ruling A6-2 (2026-09-30, giả định bề mặt, đảo ngược được):** (a) "Bỏ lọc" chỉ bỏ chip NHÓM (về "Tất cả"), không đụng hàng "Lọc sẵn có" — dòng trạng thái chỉ ghi tên nhóm như ADR-0058 Đ8 ("Đang lọc: <tên nhóm> — N dịch vụ"), không ghép "★ Hay dùng và …" như một ảnh phác; N = số dịch vụ đang hiện sau cả ô tìm + hàng trên + nhóm (trước trần 40). (b) Thêm nhãn "Lọc sẵn có" trên hàng 1.42 như ảnh phác; hàng 1.42 GIỮ xuống dòng (ảnh phác vẽ trượt ngang) để "Giá theo nhóm" không bị khuất ở 390px. (c) Hàng nhóm ẩn khi `groups` rỗng. (d) Chip đang chọn khuất bên phải thì hàng tự trượt ngang tới nó (không cuộn dọc trang). (f) Đã chạy `node scripts/sinh-so-do-trang.mjs` (công thức z5 — đổi nhãn giao diện): sơ đồ trang Trợ lý không đổi. (e) Chữ nhật ký thay đổi 1.42 trong `src/shared/changelog.ts` ("theo người hoặc theo nhóm") không sửa — là ghi chép bản cũ; mục nhật ký cho bản phát hành lượt 1 do điều phối thêm.

**Ruling A-0 (2026-09-30, điều phối):** đổi số migration nhóm dịch vụ `0046` → `0053` (tệp `migrations/0053_nhom_dich_vu.sql`, test `src/migrations-0053.test.ts`). Lý do: `main` đã có `0050_tro_ly.sql` (bản 1.44); luật CLAUDE.md §10 số kế tiếp = số lớn nhất + 1; `0051`/`0052` đã cấp cho phiên khác (ADR-0060/0061). Các dòng cũ ở bảng trên còn ghi `0046` là lịch sử lúc thi công A1. ADR-0058 Đ7 (số giữ chỗ) và tệp kế hoạch giữ nguyên (tệp đã duyệt).

**Ruling A-0b (2026-10-01, điều phối; thi công: người dựng A6):** đổi số migration nhóm dịch vụ `0053` → `0055` (đổi tên → `migrations/0055_nhom_dich_vu.sql`, test `src/migrations-0055.test.ts`) vì `0054_tl_bang_dieu_khien.sql` (bản 1.47, ADR-0069) lên `main` trước — luật "số = lớn nhất trong `migrations/` của main lúc gộp + 1". Chỉ đổi SỐ ở mã, test, tài liệu mô tả, sổ dữ liệu (`npm run dict`), `docs/ARCHITECTURE.md` (dòng tiền tố `ctl_`), `docs/adr/README.md` (dòng 0058 + dòng lịch sử giữ chỗ) và kế hoạch; không đổi nghĩa câu nào. Các chỗ `0053` ghi lịch sử của ruling A-0 ở trên giữ nguyên. Nhật ký thay đổi: mục nhóm dịch vụ đổi `1.47` → **`1.48`** (trên mục 1.47 của main).

## 5. Kiểm độc lập

| Vòng | Phần | Đỉnh được kiểm | Kết luận | Mục CAO / VỪA / THẤP | Đã sửa ở |
|---|---|---|---|---|---|
| K2A (1/10, `nguoi-kiem-doc-lap`, chỉ đọc) | A — ADR-0058 | `274b5a54` (đã gộp `main` 1.46, gốc chung `26c44255`) | **ĐẠT**, sẵn sàng trình chủ | 0 / 0 / 6. Tự chạy lại: `npm test` 2154 + đo giờ 1/1; typecheck 0; e2e 35/35; `chip-nhom-smoke` 8/8; `danh-muc-nhom-smoke` 10/10; tự đếm 110 cặp khớp ADR; `kiem-phien-ban` ĐẠT. 17 đột biến P16, 16 đỏ; sống sót: dời `can()` xuống sau đọc thân ở POST groups (cổng `admin` chặn trước — "dựa vào kỷ luật", THẤP-1). THẤP-2 lịch sử nhóm hiện tên nhóm HIỆN TẠI (nhật ký giữ tên lúc đổi) — nợ; THẤP-3 tên bài "sáu khoá"; THẤP-4 = N-1; THẤP-5 = N-2; THẤP-6 kế hoạch còn ghi `0046` | THẤP-3, THẤP-6: điều phối sửa cùng commit ghi dòng này (tên bài → "bảy khoá"; ghi chú đầu kế hoạch + K3A + §9 bước 5 → `0053`). THẤP-1, 2, 4, 5: nợ, không chặn |

## 6. Phát hành

| Phần | Bản | Nhánh gộp | Migration | Worker | Ngày giờ | Kiểm sau deploy |
|---|---|---|---|---|---|---|
