# Phí đưa đón từ giá gốc Sheet (ADR-0218) — kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Máy tính phí đưa đón từ giá gốc trên Sheet, trừ mức giảm theo cấp, có chương trình miễn phí và đổi số có lý do; biên nhận khách lẻ gộp phí vào giá.

**Architecture:** Hai đợt. Đợt 1 (không sinh tiền): đọc hai cột Sheet vào bảng riêng của `catalog`, bảng mức giảm và chương trình ở `pricing`, công tắc biên nhận ở `orders`, các màn nhập. Đợt 2 (sinh tiền, chỉ sau khi sổ vàng được xác nhận): một hàm thuần ở `pricing` tính phí từng lượt đón, `orders` gọi nó ở mọi đường lưu nháp/xác nhận, dòng phí mang nguồn mới và trường chụp, biên nhận khách lẻ gộp trong `dungBienNhan`.

**Tech Stack:** TypeScript, Cloudflare Worker + D1 (SQLite), esbuild, `node --test`, không dependency runtime.

**Spec:** `docs/adr/ADR-0218-phi-don-gia-goc-sheet-giam-theo-cap-chuong-trinh-mien-phi.md` (chuẩn tắc); trang ghép, tiêu chí nghiệm thu: `docs/superpowers/specs/2026-11-18-phi-don-gia-goc-sheet-DE-XUAT-ADR.md`; đặc tả: `docs/superpowers/specs/2026-11-18-phi-don-gia-goc-sheet-design.md`; sổ vàng: `golden/phi-dua-don-gia-goc.json`.

## Global Constraints
- Tiền `INTEGER` VNĐ; mọi thành tiền qua `thanhTienDong` (`src/shared/order-lines.ts`) — hàng rào `src/thanh-tien-mot-ham.test.ts`.
- Ngày dân sự giờ VN (`vnToday`), dấu thời gian ISO UTC; không xoá cứng; bảng mới chỉ thêm (`valid_from/to` hoặc `valid_from_at`), trigger cấm sửa/xoá như khuôn hiện có.
- Ô Sheet trống = chưa có giá (null), không bao giờ thành 0. Số 0 = miễn phí.
- Trần giá gốc Sheet: đi chung 500.000 đ mỗi khách; xe riêng 5.000.000 đ cả chuyến. Trần số đổi tay: đơn giá 0–5.000.000 đ (`TRAN_MUC_PHI_DON`).
- Quyền: không thêm ô. `partner.commission.write` (+ chặn `holdsPartner(staff)` như các route hoa hồng) cho mức giảm; `admin.manage` cho chương trình và ngày bắt đầu áp; `settings.ops` cho công tắc biên nhận; `order.modify` (+ `assigned`) cho đổi số trên nháp.
- Ranh giới: `catalog` sở hữu `ctl_*`, công bố view `v_ctl_*`; `pricing` đọc qua view; câu `ctl_*` mới ở tệp nửa nghiêm khai trong `NUA_NGHIEM` (`src/architecture.test.ts`); `receipt` chỉ import `orders, billing, parties, company` nên công tắc nằm ở `orders`.
- Bảng/view mới → `docs/data-dictionary.json` + `npm run dict`. Hành động nhật ký mới khai ở `src/shared/audit-actions.ts` có nhãn tiếng Việt; nhật ký không ghi tên khách, SĐT, email, MST.
- Chữ mới trên giao diện phải có trong `src/shared/bang-tham-chieu-khai-niem.ts` / `bang-tham-chieu-viec.ts` rồi `npm run tham-chieu`. Tên chưa chốt khai `trangThai: "cho-chon"` với phương án khuyến nghị ở bảng «Tên chờ chủ chọn» cuối tệp.
- Số migration: Đợt 1 = `0178`, Đợt 2 = số kế tiếp lúc viết. Kiểm lại trên mọi nhánh ngay trước khi tạo tệp: `for r in $(git for-each-ref --format='%(refname)' refs/heads); do git ls-tree --name-only "$r" migrations/ | tail -1; done | sort | tail -3`.
- Bộ kiểm dài (`npm test`, `npm run typecheck`, `npm run test:e2e`, kịch bản Chrome) chạy MỘT lần cuối mỗi đợt; từng task chạy bài của chính nó.

## Review Focus
1. **Đồng bộ khi chủ CHƯA thêm cột** (trạng thái bình thường ngày Đợt 1 lên): không lỗi, không «Lần đồng bộ gần nhất lỗi», không gửi tin dòng hỏng. Cột từng có giá rồi biến mất mới báo (lưu trong `problems_json`) và giữ giá cũ. → Task 2.
2. **Trình duyệt iPhone còn bản cũ sau Đợt 2**: thân cũ `phiDon:{loai,soTien}` ở biểu mẫu đơn và Còn vé ⇒ 400 `client_outdated` «Nền tảng vừa cập nhật. Tải lại trang rồi thử lại.», không lặng lẽ bỏ qua. → Task 8.
3. **Ba ngày khác nhau**: ngày bắt đầu áp và cấp so với ngày xác nhận; chương trình so với `ord_transfer_leg.pickup_date`; nháp chưa có ngày đón ⇒ không chương trình nào khớp. → Task 7 (GG-16, GG-17, GG-17b) và Task 8.
4. **Đổi bên đặt trên nháp** (`PUT /api/orders/:id/booker`) phải tính lại phí (cấp, chương trình theo đối tác); đơn Đối tác tính được phí nay đi nhánh B. → Task 8.
5. **Tổng biên nhận gộp**: tổng dòng in = tạm tính, tổng từng phần đúng; em bé giữ nguyên; xe riêng và chiều về ít khách thành trọn gói; đơn nhiều người bán không có chữ «Phí đưa đón» ở bất kỳ đâu trên bản khách lẻ, kể cả ảnh xác nhận. → Task 10.

---

# ĐỢT 1 — không sinh tiền

### Task 1: Migration 0178 — bốn bảng mới

**Files:**
- Create: `migrations/0178_phi_don_gia_goc.sql`
- Create: `src/migrations-phi-don-gia-goc.test.ts`
- Modify: `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` (sinh bằng `npm run dict`)

**Interfaces — Produces (tên bảng/cột các task sau dùng):**
- `ctl_service_transfer_price(id TEXT PK, catalog_code TEXT NOT NULL, per_pax_price INTEGER NULL CHECK(per_pax_price IS NULL OR per_pax_price BETWEEN 0 AND 500000), private_price INTEGER NULL CHECK(private_price IS NULL OR private_price BETWEEN 0 AND 5000000), valid_from_at TEXT NOT NULL, created_at TEXT NOT NULL)`, UNIQUE(`catalog_code`, `valid_from_at`); trigger cấm UPDATE/DELETE. View `v_ctl_service_transfer_price(catalog_code, per_pax_price, private_price, valid_from_at)` = dòng `max(valid_from_at)` theo `catalog_code` (khuôn `v_ctl_service_ticket_source`, migration 0151).
- `prc_transfer_fee_tier_discount(id TEXT PK, tier_code TEXT NOT NULL REFERENCES prc_rate_tier(code), amount INTEGER NOT NULL CHECK(amount >= 0 AND amount <= 5000000), valid_from_date TEXT NOT NULL, valid_to_date TEXT NULL, created_at, created_by, updated_at, updated_by)`; trigger chép khuôn `prc_party_tier` (0118): chỉ đóng `valid_to_date` một lần, chồng lấn theo `tier_code` bị chặn, cấp phải `active = 1`, cấm DELETE.
- `prc_transfer_fee_program(id TEXT PK, name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120), scope TEXT NOT NULL CHECK(scope IN ('ALL','SERVICES','PARTNERS')), trip_from TEXT NOT NULL, trip_to TEXT NOT NULL CHECK(trip_to >= trip_from), include_private INTEGER NOT NULL DEFAULT 0 CHECK(include_private IN (0,1)), created_at, created_by, ended_at TEXT NULL, ended_by TEXT NULL)`; trigger: chỉ cho UPDATE đặt `ended_at/ended_by` từ NULL một lần, cấm DELETE.
- `prc_transfer_fee_program_scope(program_id TEXT NOT NULL REFERENCES prc_transfer_fee_program(id), catalog_code TEXT NULL, party_id TEXT NULL, CHECK((catalog_code IS NULL) <> (party_id IS NULL)), PRIMARY KEY(program_id, catalog_code, party_id))`; trigger cấm UPDATE/DELETE; trigger chèn: `catalog_code` chỉ khi scope = SERVICES, `party_id` chỉ khi scope = PARTNERS.
- `ord_receipt_fee_display_policy(id TEXT PK, show_separate INTEGER NOT NULL CHECK(show_separate IN (0,1)), valid_from_at TEXT NOT NULL UNIQUE, created_at, created_by)`, gieo một dòng `show_separate = 0`; trigger cấm UPDATE/DELETE (khuôn `ord_pickup_time_policy`, 0157).

- [ ] **Step 1: Viết bài đỏ** `src/migrations-phi-don-gia-goc.test.ts` dùng `world()` của `tests/audit/harness.mjs`: (a) chèn giá gốc 600.000 đi chung ⇒ lỗi CHECK; 500.000 ⇒ được; UPDATE dòng ⇒ lỗi; (b) hai dòng mức giảm cùng cấp chồng ngày ⇒ lỗi; cấp tắt ⇒ lỗi; đóng `valid_to_date` hai lần ⇒ lỗi; (c) chương trình `trip_to < trip_from` ⇒ lỗi; đặt `ended_at` hai lần ⇒ lỗi; phạm vi SERVICES chèn `party_id` ⇒ lỗi; (d) `ord_receipt_fee_display_policy` có đúng một dòng `show_separate = 0` sau migration; UPDATE ⇒ lỗi; (e) view giá gốc trả dòng mới nhất.
- [ ] **Step 2:** `node --test src/migrations-phi-don-gia-goc.test.ts` ⇒ FAIL (bảng chưa có).
- [ ] **Step 3:** Viết `migrations/0178_phi_don_gia_goc.sql` theo Interfaces; thêm bốn bảng + view vào `docs/data-dictionary.json`; `npm run dict`.
- [ ] **Step 4:** Chạy lại bài ⇒ PASS; `node --test src/migrations-n1.test.ts src/audit-invariants.test.ts` ⇒ PASS.
- [ ] **Step 5:** Commit «Migration 0178: bảng giá gốc phí đón, mức giảm theo cấp, chương trình miễn phí, công tắc biên nhận (ADR-0218 Đợt 1)».

### Task 2: Đồng bộ hai cột Sheet

**Files:**
- Modify: `src/modules/catalog/sheet.ts` (`parseCatalogSheet`), `src/modules/catalog/service.ts` (`syncCatalog`), `src/modules/catalog/repository.ts` (`applySync` nhận thêm câu)
- Create: `src/modules/catalog/phi-don-goc-repo.ts` (nửa nghiêm, `defineSql`), khai vào `NUA_NGHIEM` ở `src/architecture.test.ts`
- Modify: `src/modules/catalog/index.ts` (công bố hàm đọc)
- Test: `src/modules/catalog/sheet.test.ts`, Create `src/modules/catalog/phi-don-goc-dong-bo.test.ts`

**Interfaces — Produces:**
- `CatalogParse` (ok) thêm `phiDon: { coCotMoiKhach: boolean; coCotXeRieng: boolean; theoMa: Map<string, { moiKhach: number | null; xeRieng: number | null }>; loiO: { row: number; code: string; cot: "moi_khach" | "xe_rieng"; message: string }[] }`. Tiêu đề: `findColumn(header, "phí đưa đón")`, `findColumn(header, "phí đưa đón xe riêng")`. Ô hỏng (không phải số nguyên, hoặc vượt trần) ⇒ vào `loiO`, KHÔNG vào `problems`, KHÔNG làm bỏ dòng; giá trị của ô đó coi như «giữ cũ».
- `phi-don-goc-repo.ts`: `giaGocPhiDonHienTai(db): Promise<Map<string, {moiKhach: number|null; xeRieng: number|null}>>`; `cauGhiGiaGocPhiDon(db, v: {catalogCode: string; moiKhach: number|null; xeRieng: number|null; at: string}): D1PreparedStatement`.
- `catalog/index.ts`: `export async function giaGocPhiDon(db, codes: readonly string[]): Promise<Map<string, {moiKhach: number|null; xeRieng: number|null}>>` (đọc view) và `export async function dichVuDuaDonChuaCoGiaGoc(db): Promise<{code: string; name: string}[]>` (join `v_ctl_service_transfer` có `transfer_enabled = 1` với view giá gốc, dịch vụ còn trên Sheet, `moiKhach IS NULL`).

**Luật ghi (thuần, viết ở `catalog/rules.ts`: `kePhiDonGoc(cu, parse): { ghi: {catalogCode, moiKhach, xeRieng}[]; vanDe: {code: string; message: string}[] }`):**
- Một cột có trên Sheet ⇒ giá trị mới của cột đó lấy từ ô (ô hỏng ⇒ giữ giá cũ của cột đó, thêm vấn đề «Ô phí đưa đón dòng N của <mã> không hợp lệ, giữ giá cũ»).
- Một cột vắng: chưa từng có giá nào cho cột đó trong bảng ⇒ im lặng, giữ null; đã có ít nhất một giá ⇒ giữ nguyên mọi giá cũ của cột đó, thêm MỘT vấn đề «Cột «Phí đưa đón» không còn trên Sheet; giữ giá gốc cũ».
- Chỉ ghi dòng mới khi cặp (moiKhach, xeRieng) khác dòng hiện hành.
- Vấn đề nối vào `problems_json` (kênh bền hiện có, hiện ở `web/catalog.ts`); không đặt `last_error`, không gọi `soanTinDongHong`, phần còn lại của danh mục vẫn đồng bộ.

- [ ] **Step 1: Bài đỏ thuần** trong `sheet.test.ts`: Sheet không có hai cột ⇒ `coCotMoiKhach=false`, `theoMa` rỗng, `problems` không đổi; Sheet có cột, ô «50000» ⇒ 50000; ô trống ⇒ null; ô «abc» và «600000» ⇒ vào `loiO`, dòng dịch vụ VẪN có trong `rows` với giá vé cập nhật. Thêm bài `kePhiDonGoc` cho bốn quy tắc trên.
- [ ] **Step 2:** `node --test src/modules/catalog/sheet.test.ts src/modules/catalog/rules.test.ts` ⇒ FAIL.
- [ ] **Step 3:** Cài phần đọc và `kePhiDonGoc`.
- [ ] **Step 4: Bài đỏ tích hợp** `phi-don-goc-dong-bo.test.ts` (khuôn `giu-lai-dong-hong.test.ts`, `voiSheet` + `app.syncCatalog`): (a) Sheet không cột ⇒ đồng bộ thành công, `catalog_sync.last_error` NULL, `problems_json` không có chữ «Phí đưa đón», bảng giá gốc rỗng; (b) thêm cột, đồng bộ ⇒ có giá; (c) đổi tên cột, đồng bộ ⇒ giá cũ còn, `problems_json` có câu «không còn trên Sheet», giá vé người lớn đổi trên Sheet vẫn cập nhật vào `catalog_item`; (d) ghi 600.000 ⇒ giá cũ còn, giá vé dịch vụ đó vẫn cập nhật; (e) đồng bộ hai lần không đổi ⇒ không thêm dòng.
- [ ] **Step 5:** Cài `phi-don-goc-repo.ts`, nối vào `syncCatalog` → `applySync` (câu ghi giá gốc cùng lô cuối với cập nhật `catalog_sync`); khai `NUA_NGHIEM`; hai hàm công bố ở `catalog/index.ts`.
- [ ] **Step 6:** `node --test src/modules/catalog/ src/architecture.test.ts` ⇒ PASS.
- [ ] **Step 7:** Commit «Đồng bộ hai cột phí đưa đón từ Sheet vào bảng riêng, không bỏ dòng khi ô phí hỏng».

### Task 3: Mức giảm phí đưa đón theo cấp

**Files:**
- Create: `src/modules/pricing/giam-phi-don-repo.ts` (nghiêm, thêm vào `STRICT` ở `src/architecture.test.ts` như `phi-don-repo.ts`), `src/modules/pricing/giam-phi-don-route.ts`
- Modify: `src/modules/pricing/index.ts` (gắn route, công bố hàm đọc), `src/shared/audit-actions.ts`, `src/shared/contracts.ts`
- Modify: `web/cap-dai-ly.ts` (cột «Mức giảm phí đưa đón» trong bảng cấp; nút đặt mức)
- Test: Create `src/modules/pricing/giam-phi-don-route.test.ts`

**Interfaces — Produces:**
- Route `GET /api/pricing/giam-phi-don` (cổng `office`; `can(staff,"partner.commission.view")` và không `holdsPartner`) ⇒ `{ dong: { id, tierCode, tierName, amount, validFromDate, validToDate, updatedAt }[] }`.
- Route `POST /api/pricing/giam-phi-don` (cổng `office`; `can(staff,"partner.commission.write") && !holdsPartner(staff)` ngược lại 403) thân `{ tierCode: string; amount: number; validFromDate: string; thayCho?: { id: string; expectedUpdatedAt: string } }`: đóng dòng cũ (`valid_to_date = validFromDate − 1 ngày`) và chèn dòng mới trong một `db.batch` kèm nhật ký `prc_transfer_fee_discount_set` (chi tiết «<tên cấp>: <cũ> → <mới> từ dd/mm/yyyy»). `amount` số nguyên 0–5.000.000, ngày ≥ `vnToday`. Va chồng lấn ⇒ 409.
- Route `POST /api/pricing/giam-phi-don/:id/ket-thuc` thân `{ expectedUpdatedAt }` ⇒ nhật ký `prc_transfer_fee_discount_ended`.
- `pricing/index.ts`: `export async function mucGiamPhiDonNgay(db, tierCode: string, ngay: string): Promise<number | null>` (null = cấp chưa đặt mức ⇒ hàm tính hiểu là 0).

- [ ] **Step 1: Bài đỏ** (khuôn `phi-don-route.test.ts`): Kế toán đặt C3 = 20.000 ⇒ 200, GET thấy; Bán hàng ⇒ 403; tài khoản Đối tác ⇒ 403; Quản trị ⇒ 200; amount âm / 5.000.001 / số lẻ ⇒ 400; đặt lại từ ngày sau ⇒ dòng cũ đóng đúng ngày trước; nhật ký có hành động mới; `mucGiamPhiDonNgay` trả đúng mức theo ngày.
- [ ] **Step 2:** `node --test src/modules/pricing/giam-phi-don-route.test.ts` ⇒ FAIL.
- [ ] **Step 3:** Cài repo, route, hành động nhật ký (nhãn «Đặt mức giảm phí đưa đón», «Kết thúc mức giảm phí đưa đón» — chờ chủ chốt tên, xem bảng cuối), hàm công bố.
- [ ] **Step 4:** Màn `web/cap-dai-ly.ts`: mỗi cấp hiện mức giảm hiện hành (hoặc «Chưa đặt»); người có `partner.commission.write` thấy nút đặt mức (hộp nhập số tiền + ngày bắt đầu). Dựng bằng `h()`, ô gõ 16px.
- [ ] **Step 5:** `node --test src/modules/pricing/ src/route-access.test.ts src/route-write-guard.test.ts src/permission-enforcement.test.ts` ⇒ PASS.
- [ ] **Step 6:** Commit «Mức giảm phí đưa đón theo cấp: bảng, route Kế toán đặt, cột trên màn Cấp độ đại lý».

### Task 4: Chương trình miễn phí đưa đón

**Files:**
- Create: `src/modules/pricing/chuong-trinh-phi-don-repo.ts` (nghiêm), `src/modules/pricing/chuong-trinh-phi-don-route.ts`, `src/modules/pricing/chuong-trinh-phi-don-rules.ts` (+ `.test.ts`)
- Modify: `src/modules/pricing/index.ts`, `src/shared/audit-actions.ts`, `src/shared/contracts.ts`, `web/phi-don.ts`, `public/phi-don.html`
- Test: Create `src/modules/pricing/chuong-trinh-phi-don-route.test.ts`

**Interfaces — Produces:**
- Thuần: `export type ChuongTrinh = { id: string; name: string; scope: "ALL"|"SERVICES"|"PARTNERS"; tripFrom: string; tripTo: string; includePrivate: boolean; createdAt: string; services: readonly string[]; parties: readonly string[] }`; `export function chuongTrinhKhop(ds: readonly ChuongTrinh[], luot: { catalogCode: string; bookerPartyId: string | null; pickupDate: string | null; xeRieng: boolean }): ChuongTrinh | null` — `pickupDate` null ⇒ null; nhiều chương trình khớp ⇒ chương trình `createdAt` sớm nhất (bằng nhau thì `id` nhỏ hơn).
- Route `GET /api/pricing/chuong-trinh-phi-don` (cổng `admin`, `admin.manage`) ⇒ chương trình còn hiệu lực và đã kết thúc (30 ngày gần nhất), kèm tên dịch vụ / tên đối tác của phạm vi.
- Route `POST /api/pricing/chuong-trinh-phi-don` thân `{ name, scope, tripFrom, tripTo, includePrivate, services?: string[], parties?: string[] }`: ALL ⇒ hai danh sách rỗng; SERVICES ⇒ 1–200 mã có trong `catalog_item`; PARTNERS ⇒ 1–200 hồ sơ bên đặt có thật; `tripTo ≥ tripFrom`, `tripTo ≥ vnToday`. Một `db.batch`: chèn chương trình + các dòng phạm vi + nhật ký `prc_transfer_fee_program_created` (chi tiết: tên, khoảng ngày, phạm vi đếm số, «gồm xe riêng» có/không).
- Route `POST /api/pricing/chuong-trinh-phi-don/:id/ket-thuc` ⇒ đặt `ended_at`, nhật ký `prc_transfer_fee_program_ended`; đã kết thúc ⇒ 409.
- `pricing/index.ts`: `export async function chuongTrinhPhiDonHieuLuc(db, luc: string): Promise<ChuongTrinh[]>` (`ended_at IS NULL OR ended_at > luc`).

- [ ] **Step 1: Bài đỏ thuần** `chuong-trinh-phi-don-rules.test.ts`: đọc `golden/phi-dua-don-gia-goc.json` phần `chuong_trinh` và các ca GG-09–GG-13, GG-17, GG-17b; với mỗi lượt, `chuongTrinhKhop` trả đúng mã chương trình của đáp án khi `nguon = "CHUONG_TRINH"`, ngược lại null. Thêm ca `pickupDate` null ⇒ null, và ca hai chương trình khớp ⇒ cái tạo sớm hơn. (Bài này chỉ dùng ĐẦU VÀO của sổ vàng để kiểm khớp, không kiểm tiền — được viết trước khi sổ được xác nhận.)
- [ ] **Step 2: Bài đỏ route**: Quản trị tạo ⇒ 200, Toàn quyền ⇒ 200, Kế toán / Bán hàng ⇒ 403; SERVICES rỗng ⇒ 400; mã dịch vụ lạ ⇒ 400; kết thúc hai lần ⇒ 409; nhật ký có tên chương trình.
- [ ] **Step 3:** `node --test src/modules/pricing/chuong-trinh-phi-don-*.test.ts` ⇒ FAIL.
- [ ] **Step 4:** Cài thuần, repo, route, hàm công bố.
- [ ] **Step 5:** `web/phi-don.ts`: khối «Chương trình miễn phí đưa đón» — danh sách (tên, khoảng ngày đi, phạm vi, «gồm xe riêng»), nút kết thúc, biểu mẫu tạo (ô tìm dịch vụ / đối tác dùng lại ô tìm đang có trên Nền tảng).
- [ ] **Step 6:** `node --test src/modules/pricing/ src/route-access.test.ts src/route-write-guard.test.ts` ⇒ PASS.
- [ ] **Step 7:** Commit «Chương trình miễn phí đưa đón: bảng, luật khớp, màn Quản trị tạo và kết thúc».

### Task 5: Công tắc biên nhận, danh sách dịch vụ chưa có phí, màn phí đón mới, tên trong bảng tham chiếu

**Files:**
- Modify: `src/modules/orders/xac-nhan-repo.ts`, `src/modules/orders/xac-nhan-route.ts`, `src/modules/orders/index.ts` (công bố hàm đọc), `src/shared/audit-actions.ts`
- Create: `web/phi-don-bien-nhan-cai-dat.ts`; Modify: `web/account.ts`, `public/account.html`
- Modify: `src/modules/pricing/phi-don-route.ts` hoặc `pricing/index.ts` (route danh sách), `web/phi-don.ts`
- Modify: `src/shared/bang-tham-chieu-khai-niem.ts`, `src/shared/bang-tham-chieu-viec.ts`, `docs/BANG-THAM-CHIEU.md` (`npm run tham-chieu`)
- Test: Create `src/modules/orders/phi-don-bien-nhan-cai-dat.test.ts`, `src/modules/pricing/dich-vu-chua-co-phi.test.ts`

**Interfaces — Produces:**
- `orders/index.ts`: `export async function hienRiengPhiDonBienNhan(db, luc: string): Promise<boolean>` (dòng `max(valid_from_at) ≤ luc`).
- Route `GET /api/cai-dat/phi-don-bien-nhan` (cổng `orders`) ⇒ `{ hienRieng: boolean; doiDuoc: can(staff,"settings.ops") }`; `POST` (cổng `admin`, `settings.ops`) thân `{ hienRieng: boolean }` ⇒ chèn dòng + nhật ký `receipt_fee_display_changed` trong một lô; va UNIQUE ⇒ 409 `stale` (khuôn `lenhGhiBatBuocGioDon`, xac-nhan-route.ts).
- Route `GET /api/pricing/phi-don/dich-vu-chua-co-phi` (cổng `admin`, `admin.manage`) ⇒ `{ dichVu: {code, name}[] }` gọi `dichVuDuaDonChuaCoGiaGoc` của `catalog` qua `catalog/index.ts` (cạnh `pricing → catalog` đã có).
- `web/phi-don.ts`: phần «ngày bắt đầu áp» hiện danh sách này phía trên nút đặt ngày («Các dịch vụ có đưa đón chưa có giá gốc phí đưa đón trên Sheet: …»); chỉ nhắc, không chặn. Bảng phí theo khu vực vẫn hiện ở Đợt 1 (ẩn ở Đợt 2).

- [ ] **Step 1: Bài đỏ**: GET mặc định `hienRieng=false`; Quản trị POST ⇒ 403; Toàn quyền POST `true` ⇒ 200, GET ⇒ true, nhật ký có; `hienRiengPhiDonBienNhan` theo mốc giờ. Danh sách: dịch vụ bật đưa đón mà ô trống ⇒ có; ô 0 ⇒ không; dịch vụ không bật đưa đón ⇒ không; Bán hàng gọi ⇒ 403.
- [ ] **Step 2:** `node --test` hai tệp ⇒ FAIL.
- [ ] **Step 3:** Cài repo, route, hàm công bố, khối giao diện trên trang Tôi (chép `web/gio-don-cai-dat.ts`), danh sách trên màn phí đón.
- [ ] **Step 4:** Thêm khái niệm/việc vào bảng tham chiếu với tên khuyến nghị ở bảng cuối tệp, `trangThai: "cho-chon"`; `npm run tham-chieu`; `node --test src/shared/bang-tham-chieu*.test.ts` ⇒ PASS.
- [ ] **Step 5:** Commit «Công tắc hiện riêng phí đưa đón trên biên nhận khách lẻ; danh sách dịch vụ chưa có giá gốc».

### Kết thúc Đợt 1
- [ ] `npm run build:web && npm test && npm run typecheck` ⇒ 0 lỗi, mọi bước xanh.
- [ ] `npm run test:e2e -- phi-don catalog` ⇒ xanh (cần mạng).
- [ ] Kịch bản Chrome cho `web/cap-dai-ly.ts`, `web/phi-don.ts`, `web/account.ts` theo bảng ở `web/CLAUDE.md`.
- [ ] Cập nhật `docs/SYSTEM-DESIGN.md` (§5 bảng mới, §6 luồng đồng bộ), `docs/CHANGE-GUIDE.md` (công thức phí đón), sổ thi công.
- [ ] Người kiểm độc lập (`nguoi-kiem-doc-lap`) đọc mã, chạy lại bài; chỉ báo «đạt» theo báo cáo đó.

---

# ĐỢT 2 — sinh tiền (CHỈ BẮT ĐẦU khi `golden/phi-dua-don-gia-goc.json` có ca `da_xac_nhan` do chủ hoặc Kế toán xác nhận)

### Task 6: Migration dòng phí nguồn mới

**Files:** Create `migrations/<số>_phi_don_nguon_tinh.sql`; Modify `src/migrations-phi-don-chon.test.ts`, `docs/data-dictionary.json`.

**Quyết định:** không dựng lại `order_item`. Dòng mới để `fee_source` và `fee_choice` NULL (CHECK cột cho qua NULL), mang cột mới:
- `fee_calc_source TEXT CHECK (fee_calc_source IS NULL OR fee_calc_source IN ('DOI_TAY','CHUONG_TRINH','GIA_GOC'))`
- `fee_base_price INTEGER`, `fee_tier_discount INTEGER`, `fee_program_id TEXT`, `fee_program_name TEXT`, `fee_override_reason TEXT`, `fee_override_by TEXT`; dùng lại `fee_tier_code`, `fee_kind`, `fee_return_pax`.

DROP rồi CREATE lại ba trigger dòng phí của 0173 với nhánh thứ ba: `fee_calc_source IS NOT NULL` ⇒ `fee_source`, `fee_choice`, `fee_rule_id`, `fee_zone_code` phải NULL; `DOI_TAY` ⇒ `fee_override_reason` không rỗng (≤ 300 ký tự), `fee_override_by` không NULL, `unit_price` 0–5.000.000; `CHUONG_TRINH` ⇒ `fee_program_id` không NULL, `unit_price = 0`; `GIA_GOC` ⇒ `fee_base_price` không NULL, và `unit_price = max(0, fee_base_price − coalesce(fee_tier_discount,0))` khi `fee_kind = 'PER_PAX'`, `unit_price = fee_base_price` khi `PER_TRIP`. Dòng `BANG_PHI`/`CHON` cũ vẫn qua y như trước. Thêm mọi cột mới vào `order_item_fee_frozen_update`.

- [ ] Bài đỏ: ba nguồn mới, mỗi nguồn một ca qua và một ca sai bị chặn; dòng `CHON` cũ (danh sách và «Số khác») vẫn chèn được; đơn không còn nháp đổi `fee_override_reason` ⇒ `order_fee_frozen`.
- [ ] Cài migration; chạy `node --test src/migrations-phi-don*.test.ts src/migrations-n1.test.ts` ⇒ PASS; commit.

### Task 7: Hàm thuần tính phí một lượt đón

**Files:** Create `src/modules/pricing/phi-don-gia-goc-rules.ts` + `.test.ts`; Modify `src/modules/pricing/index.ts`.

**Interfaces — Produces:**
```ts
export type DauVaoLuotDon = {
  luotKey: string; catalogCode: string; direction: "OUT" | "RETURN"; xeRieng: boolean;
  pickupDate: string | null; soKhachTinhTien: number; paxOverride: number | null;
  doiTay: { donGia: number; lyDo: string; nguoi: string } | null;
};
export type BoiCanh = {
  bookerPartyId: string | null; cap: CapCuaHoSo /* từ capCuaHoSoNgay, ngày xác nhận */;
  mucGiam: number | null; giaGoc: ReadonlyMap<string, { moiKhach: number | null; xeRieng: number | null }>;
  chuongTrinh: readonly ChuongTrinh[];
};
export type KetQuaLuot =
  | { ketQua: "CO_PHI"; nguon: "DOI_TAY" | "CHUONG_TRINH" | "GIA_GOC"; donGia: number; soLuong: number; tien: number;
      kind: "PER_PAX" | "PER_TRIP"; giaGoc: number | null; tierCode: string | null; mucGiam: number | null;
      chuongTrinh: { id: string; name: string } | null; lyDo: string | null; nguoi: string | null }
  | { ketQua: "THIEU"; lyDo: "O_TRONG" | "HAI_CAP" };
export function tinhPhiLuotDon(l: DauVaoLuotDon, b: BoiCanh): KetQuaLuot | null;
```
Thứ tự đúng ADR Đ1.1; `cap` chỉ được xét ở bước 3 (lượt có đổi tay hoặc chương trình không bao giờ ra `HAI_CAP`); `soLuong` = 1 khi xe riêng, `min(paxOverride, soKhachTinhTien)` khi chiều về có `paxOverride`, ngược lại `soKhachTinhTien`; `tien = thanhTienDong({quantity: soLuong, unitPrice: donGia})`; `soLuong = 0` ⇒ trả `null` (không dòng), đúng cách `dongPhiThanhItem` làm hôm nay.

- [ ] Bài: lặp mọi ca `cac_ca` có `xac_nhan.trang_thai = "da_xac_nhan"` trong sổ vàng (bỏ qua ca `cho_xac_nhan` và GG-19, ca của Task 8), dựng `BoiCanh` từ khối `gia_goc`, `muc_giam_theo_cap`, `ben_dat`, `chuong_trinh`; so `nguon`, `don_gia`, `so_luong`, `tien`, `ly_do` từng lượt. Bài thêm (không cần sổ): đổi tay thắng chương trình; `HAI_CAP` + chương trình khớp ⇒ 0.
- [ ] Cài; chạy; commit.

### Task 8: Nối vào `orders` (mọi đường)

**Files:** Modify `src/modules/orders/phi-don-don.ts` (thay `phiNhapChon`, `mucTheoThan`), `service.ts` (`tinhPhiNhap`, `chuanBiPhiDonXacNhan`, `mucDaLuu`), `rules.ts` (`docPhiDonChang`), `index.ts` (lập đơn, lưu nháp, `phiSauSuaChang`, `PUT /booker`, `nhatKyPhiDon`), `xac-nhan-route.ts` (Gửi xác nhận, Gửi đơn, Còn vé), `chang-hanh-khach-repo.ts` (`FEE_COLS`), `src/shared/contracts.ts`, `src/shared/phi-don-hien-thi.ts` (`cauThieuPhiDon` thêm lý do «chưa có giá gốc trên Sheet» và «đối tác có hai cấp»); Create `src/modules/pricing/phi-don-gia-goc-repo.ts` (đọc đầu vào một lần cho cả đơn); Test: `src/modules/orders/phi-don-don.test.ts`, `phi-don-xac-nhan.test.ts`, `tests/e2e/phi-don-don.mjs`, `phi-don-xac-nhan.mjs`, `gui-don.mjs`, `sua-so-khach.mjs`.

**Interfaces:**
- `pricing/index.ts`: `export async function tinhPhiDonGiaGoc(db, v: { bookerPartyId: string | null; ngayXacNhan: string; luot: readonly (Omit<DauVaoLuotDon,"doiTay"> & { doiTay: DauVaoLuotDon["doiTay"] })[] }): Promise<Map<string, KetQuaLuot>>` — đọc giá gốc (`catalog.giaGocPhiDon`), cấp (`capCuaHoSoNgay`), mức giảm, chương trình hiệu lực, rồi gọi `tinhPhiLuotDon`. Đây là đường tính duy nhất cho nháp và xác nhận (Hiến chương 5.4).
- Thân từ trình duyệt: `services[i].legs[j].doiPhi = { donGia: number; lyDo: string } | null` (vắng = giữ số đổi đã lưu; `null` = bỏ đổi tay). Còn vé: `doiPhi: { legId: string; donGia: number; lyDo: string }[]`, nhận cả lượt đã có số (bỏ chặn P5/P6 ở xac-nhan-route.ts).
- Thân cũ có khoá `phiDon` (biểu mẫu đơn hoặc Còn vé) ⇒ 400 `client_outdated` «Nền tảng vừa cập nhật. Tải lại trang rồi thử lại.»
- Tài khoản Đối tác gửi `doiPhi` ⇒ 400 `transfer_fee_not_allowed` (giữ mã cũ).
- Nhật ký: `moTaPhiDonNhatKy` ghi lượt, số cũ → số mới, nguồn, tên chương trình, lý do đổi (không tên khách).

- [ ] Bài đỏ (route, `world()`): lập đơn khách lẻ ⇒ dòng phí `GIA_GOC` đúng GG-02; nháp đổi tay không lý do ⇒ 400; có lý do ⇒ dòng `DOI_TAY`, lưu lại nháp không mất số đổi; ô Sheet trống ⇒ `/status` 409 `transfer_fee_missing` nêu tên dịch vụ; Đối tác Gửi đơn ô có số ⇒ nhánh B (xác nhận thẳng), ô trống ⇒ nhánh A; Còn vé đổi lượt đã có số ⇒ nhận; đổi bên đặt trên nháp từ khách lẻ sang đại lý C3 ⇒ phí từ 100.000 thành 60.000; tạo chương trình sau khi xác nhận ⇒ phí không đổi; GG-19 qua «Sửa số khách»; thân cũ `phiDon` ⇒ 400 `client_outdated`; trước ngày bắt đầu áp ⇒ không dòng phí, không chặn.
- [ ] Cài theo Interfaces; xoá đường `phiNhapChon`/`kiemMucChon` khỏi luồng đơn (giữ `src/shared/phi-don-chon.ts` chỉ cho dữ liệu cũ hiển thị).
- [ ] `node --test src/modules/orders/ src/modules/pricing/ src/buildlines-guard.test.ts src/hoa-hong-mot-nguon.test.ts src/cong-no-dai-ly.test.ts` ⇒ PASS; commit.

### Task 9: Giao diện đổi số

**Files:** `web/khoi-dua-don.ts` (ô chọn ⇒ «số máy tính + nút đổi phí»), `web/order-form.ts` (`kemPhiDon` ⇒ gửi `doiPhi`), `web/xac-nhan-don-ui.ts` (`taoOPhiConVe` dựng cho mọi lượt có phí, không chỉ lượt thiếu), `src/shared/phi-don-o-chon.ts`, `src/shared/phi-don-hien-thi.ts`.

- Biểu mẫu đơn hiện số máy tính từ `GET` đơn (DTO `phiDuaDon` thêm `nguon`, `tenChuongTrinh`, `lyDoDoi`); tài khoản Đối tác chỉ thấy số, không có nút.
- Hộp đổi phí: ô đơn giá (16px, số nguyên 0–5.000.000) + ô lý do bắt buộc; ghi chú «mỗi khách» hoặc «cả chuyến».
- [ ] Bài thuần cho phần dùng chung ở `src/shared/`; build; chạy lại kịch bản Chrome của biểu mẫu đơn và Còn vé; commit.

### Task 10: Biên nhận khách lẻ gộp phí

**Files:** `src/modules/receipt/rules.ts` (`dungBienNhan`, `chiaPhanBienNhan`), `src/modules/receipt/index.ts` (đọc `hienRiengPhiDonBienNhan` qua `orders`), `src/shared/contracts.ts` (`ReceiptDto` item thêm `tronGoi?: { soKhach: number }` để in dòng không đơn giá), `src/shared/order-confirmation.ts` (dòng trọn gói), `web/confirmation-image.ts`; Create `src/modules/receipt/gop-phi-don.ts` + `.test.ts`.

**Interfaces:** `export function gopPhiDonVaoDichVu(order: OrderDetailDto, mau: MauBienNhan, hienRieng: boolean): { services: ReceiptDto["services"]; phiDuaDon: ReceiptPhiDto[]; dongDuaDonTourDao: { description: string; lineTotal: number }[] }` — `mau = "doi_tac"` hoặc `hienRieng` ⇒ trả nguyên như hôm nay. Khi gộp: `phiDuaDon = []`, `chiaPhanBienNhan` không thêm `TEN_DONG_PHI_DON` vào tên phần, phần Tour Đảo nhận các dòng «<Tên dịch vụ> — đưa đón» của dịch vụ nhà cung cấp khác (Đ3.3); mọi thành tiền qua `thanhTienDong`.

- [ ] Bài: mọi ca `bien_nhan_khach_le.cac_ca` đã `da_xac_nhan`; thêm bất biến cho mọi ca: tổng dòng in = `subtotal`, tổng từng phần = số của phần; chuỗi «Phí đưa đón» không có trong `JSON.stringify(receipt)` lẫn `buildConfirmation(receipt, …)` khi gộp.
- [ ] Cài; `node --test src/modules/receipt/ src/shared/order-confirmation.test.ts src/thanh-tien-mot-ham.test.ts` ⇒ PASS; kịch bản Chrome ảnh xác nhận; commit.

### Task 11: Dọn và tài liệu
- Ẩn mục menu `phiDon` bảng phí theo khu vực khỏi `src/shared/muc-giao-dien.ts` phần bảng phí; màn còn lại chỉ gồm ngày bắt đầu áp, danh sách dịch vụ chưa có phí, chương trình miễn phí. **Thử tra cũ giữ nguyên trên luật bảng phí cũ, ẩn cùng bảng phí, ghi chú «luật cũ, không dùng cho đơn»; không làm Thử tra mới** (YAGNI).
- `web/cap-dai-ly.ts`: bật lại câu nhắc «Đổi cấp cũng đổi phí đưa đón của các đơn chưa xác nhận.» (tên chờ chủ chốt).
- Bảng tham chiếu: viết lại khái niệm «Phí đưa đón» theo ADR-0218; «Số khác», «Chưa chọn» chuyển trạng thái ngưng.
- `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/data-dictionary.json`, nhật ký thay đổi phát hành.
- [ ] `npm run build:web && npm test && npm run typecheck && npm run test:e2e` ⇒ xanh; kịch bản Chrome; người kiểm độc lập; commit.

---

## Tên chờ chủ chọn (khai `cho-chon`, dùng phương án đầu cho tới khi chủ chốt)
| Chỗ | Khuyến nghị | Phương án khác |
|---|---|---|
| Hai giá trên Sheet | «Giá gốc phí đưa đón» | «Phí đưa đón niêm yết»; «Phí đưa đón chuẩn» |
| Số trừ theo cấp | «Mức giảm phí đưa đón» | «Giảm phí đưa đón theo cấp» |
| Đợt miễn phí | «Chương trình miễn phí đưa đón» | «Đợt miễn phí đưa đón»; «Khuyến mãi đưa đón» |
| Nút trên đơn | «Đổi phí» (ô «Lý do đổi phí») | «Sửa phí»; «Đặt phí khác» |
| Công tắc | «Hiện riêng phí đưa đón trên biên nhận khách lẻ» (chữ của ADR) | «In dòng phí đưa đón cho khách lẻ» |
| Câu nhắc màn Cấp độ đại lý | «Đổi cấp cũng đổi phí đưa đón của các đơn chưa xác nhận.» | «Phí đưa đón của đơn chưa xác nhận sẽ tính theo cấp mới.» |

## Việc đã kiểm trước khi lập kế hoạch (18/11)
- Trang web công khai (`tourdaovn/scripts/prices-pull.mjs`) tìm cột theo tên tiêu đề, cột lạ chỉ cảnh báo, và chỉ chạy tay (không đọc Sheet lúc khách mở trang): thêm hai cột ở cuối hay giữa đều không làm hỏng. Chưa so được mã Sheet hai bên có trùng không (không đọc `.env`). Nên cập nhật `docs/gia/README.md` của tourdaovn (13 → 15 cột) — kho khác, việc sau.
- Đơn của thành viên tổ chức đối tác ghi `orders.booker_party_id` = hồ sơ TỔ CHỨC (`src/shared/booker.ts` `benDatChoTaiKhoan`; bài `src/modules/orders/thanh-vien-route.test.ts`): chương trình theo đối tác khớp theo bên đặt sẽ áp cho đơn của thành viên. Đóng câu hỏi ADR-0218 Đ2.5.
