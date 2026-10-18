# Kế hoạch thi công: Sổ đại lý đợt 2 (đơn có người hưởng tới «Đã giao – đã thu đủ»)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **TRẠNG THÁI: CHỜ CHỦ DUYỆT.** Không thi công trước khi chủ duyệt `docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/trinh-chu.md` (ba quyết định) và ADR-0130 đã vào `docs/adr/`. Phiên lập kế hoạch không tự thi công (Hiến pháp P15). Người thi công không tự nghiệm thu (N8): mỗi task có người kiểm độc lập chỉ-đọc (vai `nguoi-kiem-doc-lap`).

**Goal:** Đơn có bên đặt là đại lý (người hưởng hoa hồng) đi trọn đường tới «Đã giao – đã thu đủ», và sổ ghi ngay ai nợ ai: hoa hồng, giảm giá bên đặt chịu, giá vốn nhà cung cấp.

**Architecture:** `billing` sinh dòng thương mại trong lô «Đã giao», dùng số do `orders.phanThuongMaiCuaDon` dựng từ bản chụp (một nguồn tính, `src/shared/hoa-hong-dong.ts`). Hai lớp CSDL canh: câu ghi của `orders` và trigger của `billing`. Người thu `BOOKER` / `SUPPLIER` mở theo ADR-0130: người không giữ `ledger.write` chỉ khai (dấu `DECLARED`, không tạo nợ), Kế toán xác nhận thì sinh dòng giữ hộ. Trần giảm giá trên đơn có người hưởng = tổng hoa hồng, áp cho mọi người.

**Tech Stack:** TypeScript, Cloudflare Worker + D1 (SQLite), esbuild, `node --test` (Node 22, chạy `.ts` trực tiếp), khung thử `tests/audit/harness.mjs` (cả ứng dụng + SQLite đủ migration), e2e `tests/e2e/*.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/README.md` (đặc tả, mục P1–P9), cùng thư mục: `trang-ghep.md`, `de-xuat-adr-khach-tra-ben-kia.md` (ADR-0130), `phieu-ke-toan.md`. ADR gốc: ADR-0078 (B2), ADR-0079, đã sửa câu bởi ADR-0088, 0092, 0109, 0115, 0120. Đọc đặc tả trước kế hoạch; lệch nhau thì đặc tả thắng, rồi tới ADR.

## Global Constraints

- Chữ người dùng thấy, lỗi, commit, tài liệu: **tiếng Việt có dấu**. Không lộ mã thô (`HOA_HONG`, `terms_missing`…). Gọi hệ thống là «Nền tảng».
- Tiền là `INTEGER` VNĐ. Số dẫn xuất **chỉ tính ở máy chủ**. Làm tròn nửa lên theo dòng (`lamTronNuaLen`). **Một nguồn tính**: hoa hồng / giá vốn chỉ qua `hoaHongDong` / `giaVonDong` của `src/shared/hoa-hong-dong.ts` (hàng rào `src/hoa-hong-mot-nguon.test.ts`).
- Giảm giá bên đặt chịu = **giảm giá hiệu lực** (ADR-0109) = `effectiveMoney` ở `orders/money-adjustment.ts`. Không tự tính `min()` lần hai.
- Thiếu mức ⇒ giữ đơn. **Không bao giờ tự lấy 0** (Hiến chương 5.7).
- Không xoá cứng; dòng sổ chỉ đảo. Migration chỉ thêm tệp mới, số dự kiến **`0111`** (tạm; `0098` đang bị nhánh đưa đón chưa gộp giữ). Lúc gộp, kiểm lại bằng `ls migrations` và `git ls-tree --name-only <nhánh> migrations/` cho mọi nhánh chưa gộp.
- Bản dự kiến **`2.18`** (tạm, kiểm `changelog.ts` ở `main` lúc gộp).
- Module chỉ import nhau qua `index.ts`; chỉ module chủ ghi bảng của mình; đọc xuyên module chỉ qua view `v_<tiền tố>_*`; `billing` **không có cạnh tới `pricing`** (dùng `src/shared/`).
- Mọi route ghi hỏi `can()` ở dòng đầu thân. POST cần header `Origin` cùng site. Nhật ký không ghi SĐT / email / MST.
- Tài khoản giữ quyền Đối tác (kể cả lai — `holdsPartner`) **không bao giờ** thấy: a%, giá vốn, tên người thu, tiền người khác đang giữ, hoa hồng của bên khác.
- Hàng rào mới phải **thấy chặn thật một lần** (sửa cố ý → đỏ → hoàn nguyên) và có dòng ở `docs/SO-HANG-RAO.md` kèm ngày.
- Sửa hành vi: bài **đỏ trước, xanh sau**. Chạm API / migration ⇒ chạy cả e2e. Sửa giao diện ⇒ kịch bản Chrome tương ứng (`web/CLAUDE.md`).
- AI **không** chạy: `git push`, gộp vào `main`, `wrangler deploy`, migration remote, ghi D1 remote. Câu đếm production do chủ chạy.

## Review Focus

1. **Đơn khách lẻ cũ xác nhận trước 12/10, chưa có bản chụp** — sau khi bản lên phải «Đã giao» được như hôm nay, nhờ b1 chụp bù trong cùng lần phát hành. Ngoại lệ duy nhất là nhóm b1x (có dịch vụ mang điều khoản SERVICE / GROUP): nhóm này chờ Kế toán «Chụp bù», và số đơn đã được đếm và báo chủ trước khi phát hành. Ca kiểm ở Task 4 và Task 6.
2. **Đơn có người hưởng mà một dòng là dịch vụ nhập tay** — luôn bị giữ `terms_missing` cho tới khi Kế toán ghi mức tay. Không được lọt vì dòng nhập tay không có `catalog_code`. Ca ở Task 4.
3. **Lần thu khai «khách trả đại lý» rồi bị đảo, sau đó khai lại** — đơn hết «đang đối chiếu» đúng lúc, không sót dấu chờ, không dòng mồ côi. Ca ở Task 5.
4. **Giảm số khách sau xác nhận làm hoa hồng < giảm giá** — không chặn; «Đã giao» vẫn ghi `GIAM_GIA_BEN_DAT` = giảm giá hiệu lực, và R-BIL-2 không báo sai. Ca ở Task 3 và Task 7.
5. **Tài khoản lai Bán hàng + Đối tác xem đơn đại lý của chính mình** — không thấy tên HDV đã thu, không thấy câu «<tên> đang giữ». Ca ở Task 9.

---

## Bản đồ tệp

| Tệp | Việc |
|---|---|
| `migrations/0111_so_dai_ly_dot_2.sql` (tạo) | loại dòng, loại phiếu, vai người thu, `gross_snapshot`, trigger lớp 2 và (i)–(iv), mở rộng dấu đối chiếu, mốc kiểm định kỳ, view «chưa chụp» |
| `migrations/0112_chup_bu_khach_le.sql` (tạo, có điều kiện) | chụp bù b1 một lần. **Bỏ tệp** nếu câu đếm của chủ cho b1 = 0 |
| `src/modules/billing/rules.ts` | `sinhPhieuDaGiao`, `lyDoChuaGiaoDuoc`, `kiemVuotGiaBan`, `LineDraft.orderServiceId`, kiểu `DebtKind` |
| `src/modules/billing/service.ts` | `docLanThu` (người thu mới), `cauLanThu` (dấu `DECLARED`), `daGiao` (lô thương mại), `xacNhanBenKia` (mới) |
| `src/modules/billing/repository.ts` | `LINE_IF_POSTING` mang `order_service_id`; `POSTING_COLS` mang `gross_snapshot`; `RECEIPT_VALUES` mang `collected_for_party_id` |
| `src/modules/billing/index.ts` | route `POST /api/ledger/counterparty-receipts/:receiptId/confirm`; DTO lần thu hẹp cho Đối tác |
| `src/modules/billing/dieu-chinh.ts` | `loaiDong` nhận ba loại mới |
| `src/modules/orders/hoan-tat-repo.ts`, `hoan-tat.ts` | lớp 1 của câu «Đã giao»; `ThongTinGiaoDon.thuongMai` thay `coNguoiHuong` |
| `src/modules/orders/index.ts`, `thuong-mai.ts` | route chụp bù + danh sách chờ; thứ tự Xác nhận (chụp trước, kiểm trần sau) |
| `src/modules/orders/price-guards.ts` | trần giảm giá theo người hưởng |
| `src/modules/receipt/rules.ts`, `src/shared/contracts.ts` | `ReceiptDto.phan[]`, `LanThuInput.nguoiThu` mới |
| `scripts/audit-checks.mjs` | R-BIL-2, R-BIL-5, R-BIL-12, R-BIL-16, R-ORD-DC1, R-BIL-13, R-BIL-S9 |
| `golden/so-cong-no-luot-2.json` | C-1…C-5 (`cho_xac_nhan`) |
| `web/order.ts`, `web/order-form.ts`, `web/home.ts` (Việc của bạn), trang mới `web/chup-bu.ts` | giao diện |
| `tests/e2e/so-dai-ly-dot-2.mjs` (tạo), `tests/e2e/nhap-tay-va-gia-doi-tac.mjs` | e2e |

---

### Task 0: Kiểm trước khi thi công, mở sổ thi công, câu đếm cho chủ

**Files:**
- Create: `docs/superpowers/plans/2026-10-18-so-dai-ly-dot-2-thi-cong-nhat-ky.md` (Ruling, Quan sát chặn thật, Nợ — khuôn sổ đợt 1)
- Create: `docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/cau-dem-chi-doc.sql`
- Modify: `golden/so-cong-no-luot-2.json` (thêm C-1…C-5)

- [ ] **Step 1: Xác nhận điều kiện.** ADR-0130 có trong `docs/adr/` với trạng thái accepted; `trinh-chu.md` có lời duyệt của chủ cho cả ba quyết định; `docs/quyen-hoan.json` có lời cho phép «xây trên» (trường `xay_tren_cho_phep`) cho TNV-G1, TNV-G3, TNV-G4, HC-4.2 **do chủ ghi**. Thiếu một điều thì DỪNG, báo điều phối.
- [ ] **Step 2: Soạn bốn câu đếm chỉ-đọc** (một tệp SQL, mỗi câu một dòng, có chú thích lời thường). Chủ chạy bằng `wrangler d1 execute tourdao-sales-db --remote --command "<câu>"`.
  - (a) Đơn đã «Đã giao» có dòng dịch vụ mà điều khoản cung ứng hiện hành có nhà cung cấp.
  - (b1) Đơn `confirmed`, chưa giao, không bản chụp nào, bên đặt không mang vai được hưởng / vai nhóm bên ngoài / loại đối tác, không dòng nhập tay.
  - (b1x) Trong số (b1): đơn có dịch vụ mang dòng điều khoản SERVICE / GROUP.
  - (b2) Đơn `confirmed`, chưa giao, không bản chụp nào, còn lại.
  - (d) Đơn có bản chụp người hưởng đang chờ «Đã giao».
  Ghi kết quả chủ dán vào sổ thi công. **b1 = 0 ⇒ bỏ Task 6 phần b1 và tệp `0112`.**
- [ ] **Step 3: Thêm C-1…C-5 vào `golden/so-cong-no-luot-2.json`**, đúng khuôn ca B-3: `xac_nhan.trang_thai = "cho_xac_nhan"`. Số lấy nguyên văn từ ADR-0079 «Ví dụ bằng số» và `phieu-ke-toan.md`. Chạy `node --test src/so-vang-so-dai-ly.test.ts`; kỳ vọng: xanh, ca mới hiện là `todo`.
- [ ] **Step 4: Spike `gross_snapshot` trên SQLite của khung thử.** Thử `ALTER TABLE bil_posting ADD COLUMN gross_snapshot INTEGER CHECK (...)` tham chiếu `kind_code`. Ghi kết quả vào sổ (Ruling R-1): được thì dùng `CHECK`, không được thì dùng trigger `BEFORE INSERT`.
- [ ] **Step 5: Commit** — `git add docs/ golden/ && git commit -m "Sổ đại lý đợt 2: mở sổ thi công, câu đếm chỉ-đọc, ca vàng C-1…C-5 chờ xác nhận"`.

### Task 1: Hàng rào «một nguồn tính hoa hồng» bắt thêm dạng bọc (BL-VA-RAO-K3)

**Files:**
- Modify: `src/hoa-hong-mot-nguon.test.ts`

**Interfaces:** Produces: hàng rào chạy trong `npm test`; Task 2–5 phải qua nó.

- [ ] **Step 1: Viết ca đỏ** — trong tệp test, thêm mẫu chuỗi giả: `Number(rateBp) * thanhTien`, `((rateBp)) * x`, `CAST(rate_bp AS INTEGER) * …`, `IFNULL(rate_bp, 0) * …`; khẳng định bộ quét báo cả bốn (`assert.equal(viPham.length, 4)`).
- [ ] **Step 2: Chạy** `node --test src/hoa-hong-mot-nguon.test.ts` — kỳ vọng FAIL (bộ quét hôm nay bỏ sót).
- [ ] **Step 3: Mở rộng bộ quét** (regex trên mã TS và chuỗi SQL) cho bốn dạng; cập nhật phần GIỚI HẠN ở đầu tệp.
- [ ] **Step 4: Chạy lại** — PASS. Quan sát chặn thật: chèn tạm `IFNULL(rate_bp,0)*2` vào một chuỗi SQL bất kỳ trong `src/modules/billing/` → đỏ → hoàn nguyên. Ghi ngày vào `docs/SO-HANG-RAO.md`.
- [ ] **Step 5: Commit** — «Hàng rào một nguồn tính hoa hồng: bắt biến bị bọc, CAST và IFNULL (BL-VA-RAO-K3)».

### Task 2: Migration `0111` và bài kiểm migration

**Files:**
- Create: `migrations/0111_so_dai_ly_dot_2.sql`
- Create: `src/migrations-so-dai-ly-dot-2.test.ts`
- Modify: `docs/data-dictionary.json` rồi `npm run dict`

**Interfaces:**
- Produces (tên CSDL các task sau dùng):
  - `bil_debt_kind`: `HOA_HONG` («Hoa hồng»), `GIAM_GIA_BEN_DAT` («Giảm giá bên đặt chịu»), `GIA_VON` («Giá vốn nhà cung cấp»);
  - `bil_posting_kind`: `COUNTERPARTY_CONFIRMED` («Bên kia đã nhận»);
  - `bil_collector_role.SUPPLIER.active = 1`;
  - `bil_posting.gross_snapshot INTEGER NULL`;
  - view `v_ord_terms_uncaptured(order_id, order_service_id)` của `orders`: dòng dịch vụ của đơn đã xác nhận không có bản chụp hiện hành nào;
  - trigger `bil_posting_delivered_terms`;
  - chỉ mục `bil_debt_line_one_commercial`;
  - trigger `bil_debt_line_commercial_*` (i)–(iv);
  - `bil_receipt_recon_declared` (tạo lại, nhận thêm `BOOKER` / `SUPPLIER`);
  - `bil_receipt_recon_confirmed_txn` (tạo lại, chỉ người thu `COMPANY`);
  - dòng `bil_audit_cutoff`: `R-BIL-2`, `R-BIL-5`, `R-BIL-12`, `R-BIL-16`; dòng `ord_audit_cutoff`: `R-ORD-DC1`.

- [ ] **Step 1: Viết bài đỏ** `src/migrations-so-dai-ly-dot-2.test.ts`. Dùng `world()` của khung thử, mỗi trigger một ca, và khẳng định câu `RAISE` có tiền tố mã:
  - `delivered_terms: còn dòng dịch vụ thiếu bản chụp`: phiếu `DELIVERED` cho đơn có dòng trong `v_ord_terms_uncaptured` hoặc `v_ord_terms_missing` ⇒ `assert.throws(…, /delivered_terms/)`.
  - `commercial (i)`: dòng `HOA_HONG` gốc không `order_service_id` ⇒ throws; hai dòng `HOA_HONG` cùng (phiếu, dòng dịch vụ) ⇒ throws `UNIQUE`.
  - `commercial (ii)`: dòng `HOA_HONG` có bên nợ ≠ công ty chủ ⇒ throws.
  - `commercial (iii)`: Σ `HOA_HONG` + `GIA_VON` gốc > `gross_snapshot` ⇒ throws.
  - `commercial (iv)`: `GIAM_GIA_BEN_DAT` ≠ `gross_snapshot − due_snapshot` ⇒ throws.
  - **Miễn đúng chỗ:** dòng đảo của một dòng `HOA_HONG` ⇒ không throws; phiếu `ADJUSTMENT` một dòng `GIA_VON` không `order_service_id` ⇒ không throws; phiếu `DELIVERED` có `gross_snapshot` NULL ⇒ (ii)–(iv) không áp.
  - `recon_declared`: dấu `DECLARED` cho lần thu vai `BOOKER` tiền mặt ⇒ được; vai `STAFF` ⇒ throws `recon_receipt_invalid`.
  - `recon_confirmed_txn`: `CONFIRMED` cho lần thu `BOOKER` chuyển khoản không mã ⇒ được; `COMPANY` chuyển khoản không mã sau mốc ⇒ throws `bank_txn_required`.
  - `delivered_reconciling`: còn dấu `DECLARED` vai `BOOKER` chưa `CONFIRMED` ⇒ phiếu `DELIVERED` throws.
- [ ] **Step 2: Chạy** `node --test src/migrations-so-dai-ly-dot-2.test.ts` — FAIL (chưa có migration).
- [ ] **Step 3: Viết migration** theo Interfaces. Mỗi trigger chỉ đọc bảng `bil_` hoặc view công bố (`v_ord_*`, `v_pty_owner_company`). Câu `RAISE` có tiền tố mã. Trigger `_declared` / `_confirmed_txn` tạo lại bằng `DROP TRIGGER` + `CREATE TRIGGER` cùng tên (khuôn 0099). Mốc `cutoff_at` = thời điểm áp migration (`strftime` ISO UTC).
- [ ] **Step 4: Chạy lại** — PASS; `npm run dict`; `node --test src/architecture.test.ts src/migrations-*.test.ts` — PASS. Quan sát chặn thật cho từng trigger (ghi vào sổ thi công, phần «Quan sát chặn thật»).
- [ ] **Step 5: Commit** — «Migration 0111 sổ đại lý đợt 2: ba loại dòng thương mại, phiếu Bên kia đã nhận, hai lớp chặn Đã giao thiếu bản chụp».

### Task 3: Luật thuần của phiếu «Đã giao» và lý do giữ

**Files:**
- Modify: `src/modules/billing/rules.ts`
- Test: `src/modules/billing/rules.test.ts`

**Interfaces:**
- Produces:
```ts
export type DebtKind = "HELD" | "SETTLEMENT" | "REFUND" | "HOA_HONG" | "GIAM_GIA_BEN_DAT" | "GIA_VON";
export interface LineDraft { debtorPartyId: string; creditorPartyId: string; amount: number; kind: DebtKind; reversesLineId: string | null; orderServiceId?: string | null }
export interface DongThuongMai { orderServiceId: string; tenDichVu: string; thanhTien: number; hoaHong: number | null; giaVon: number | null; nhaCungCapPartyId: string | null }
export type TinhTrangThuongMai =
  | { trangThai: "KHONG_NGUOI_HUONG" }                        // khách lẻ / nội bộ: như lượt 1
  | { trangThai: "DU"; nguoiHuongPartyId: string }
  | { trangThai: "THIEU"; ma: "terms_missing" | "booker_not_beneficiary"; dichVu: readonly string[] }
  | { trangThai: "VUOT"; dichVu: readonly string[] };
// `chup` là bản chụp hiện hành từng dòng (dòng chưa chụp mang MISSING / NOT_CAPTURED — `chuaCoBanChup` của orders); `BanChup` từ src/shared/hoa-hong-dong.ts.
export function tinhTrangThuongMai(v: { chup: readonly BanChup[]; dong: readonly DongThuongMai[] }): TinhTrangThuongMai;
export function sinhPhieuDaGiao(v: { congTyId: string; nguoiHuongPartyId: string | null; giamGiaHieuLuc: number; dong: readonly DongThuongMai[] }): LineDraft[];
// lyDoChuaGiaoDuoc: tham số `coNguoiHuong: boolean` THAY bằng `thuongMai: TinhTrangThuongMai`
```
- `MaLyDo` bỏ `booker_partner`, thêm `terms_missing`, `booker_not_beneficiary`, `terms_exceed_price`.

- [ ] **Step 1: Viết bài đỏ** trong `rules.test.ts`:
  - `sinhPhieuDaGiao — C-1 (đại lý giữ cọc, giảm 250.000)`: một dòng tour 5.000.000, hoa hồng 500.000, `giamGiaHieuLuc: 250_000` ⇒ đúng hai dòng: `{debtor: cty, creditor: A, amount: 500_000, kind: "HOA_HONG", orderServiceId: "s1"}` và `{debtor: A, creditor: cty, amount: 250_000, kind: "GIAM_GIA_BEN_DAT", orderServiceId: null}`.
  - `C-4 (đơn trộn lễ tân)`: Hòn Tằm 1.000.000 / hoa hồng 100.000 / giá vốn null; i-resort 600.000 / hoa hồng 100.000 / giá vốn 480.000 / NCC = IR ⇒ ba dòng: `HOA_HONG` 100.000 ×2 (cty → H), `GIA_VON` 480.000 (cty → IR). Tổng hoa hồng 200.000.
  - `hoa hồng 0 không sinh dòng`; `giảm giá 0 không sinh dòng GIAM_GIA_BEN_DAT`; `không người hưởng ⇒ chỉ GIA_VON`.
  - `tinhTrangThuongMai`: một dòng `MISSING / NOT_CAPTURED` hoặc `NO_RULE` / `RULE_CONFLICT` / `MANUAL_LINE` ⇒ `THIEU / terms_missing`; một bản `MISSING / BOOKER_NOT_BENEFICIARY` ⇒ `THIEU / booker_not_beneficiary`; hoa hồng + giá vốn của một dòng > thành tiền dòng ⇒ `VUOT` kèm tên dịch vụ; mọi bản `NONE` ⇒ `KHONG_NGUOI_HUONG`.
  - `lyDoChuaGiaoDuoc — thứ tự`: (đã thu đủ, qua ngày đi) với `THIEU` ⇒ `ma: "terms_missing"`, `aiXuLy: "Kế toán"`; với `VUOT` ⇒ `terms_exceed_price`. Có cả `THIEU` lẫn khoản đối chiếu ⇒ `terms_missing` (đứng trước `reconciling`). `before_departure` vẫn đứng trước `terms_*`.
  - **Đảo có chủ đích:** bài `:94` «thứ tự lý do cố định» đổi `booker_partner` → `terms_missing`; bài `:85` «`sinhPhieuDaGiao() == []`» đổi sang ca không người hưởng, không giá vốn ⇒ `[]`. Ghi trong commit «đảo có chủ đích».
- [ ] **Step 2: Chạy** `node --test src/modules/billing/rules.test.ts` — FAIL.
- [ ] **Step 3: Cài.** Câu lời thường cho ba lý do mới (copy cố định):
  - `terms_missing`: «Thiếu mức hoa hồng cho <dịch vụ> — Kế toán cài mức, bấm Chụp bù hoặc ghi mức tay.»
  - `booker_not_beneficiary`: «Bên đặt của đơn không thuộc danh sách được hưởng hoa hồng — Văn phòng sửa bên đặt hoặc Kế toán ghi mức tay.»
  - `terms_exceed_price`: «Mức hoa hồng / giá vốn cài cho <dịch vụ> vượt giá bán — Kế toán xem lại.»
- [ ] **Step 4: Chạy lại** — PASS; `npm run typecheck` — các nơi gọi `lyDoChuaGiaoDuoc` sẽ đỏ kiểu ở `service.ts`. Để Task 4 sửa (Task 3 và 4 commit liền nhau nếu typecheck không xanh được riêng — ghi Ruling).
- [ ] **Step 5: Commit** — «Luật phiếu Đã giao sinh dòng hoa hồng, giảm giá bên đặt chịu, giá vốn; ba lý do giữ mới thay booker_partner».

### Task 4: Lô «Đã giao» ghi dòng thương mại (hai lớp chặn)

**Files:**
- Modify: `src/modules/orders/hoan-tat-repo.ts` (`CO_NGUOI_HUONG` → điều kiện bản chụp), `src/modules/orders/hoan-tat.ts` (`ThongTinGiaoDon`)
- Modify: `src/modules/billing/service.ts` (`daGiao`, `tienCuaDon`), `src/modules/billing/repository.ts` (`LINE_IF_POSTING`, `POSTING_COLS`)
- Test: `src/da-giao-thuong-mai.test.ts` (tạo); đảo `src/da-giao-khe-hoa-hong.test.ts`, `src/modules/pricing/loai-doi-tac.test.ts` (các bài agent đo đã liệt kê ở sổ thi công)

**Interfaces:**
- Consumes: `tinhTrangThuongMai`, `sinhPhieuDaGiao` (Task 3); `phanThuongMaiCuaDon` (`orders/index.ts`); `effectiveMoney` (`orders/money-adjustment.ts`).
- Produces: `ThongTinGiaoDon.thuongMai: TinhTrangThuongMai` (thay `coNguoiHuong`); phiếu `DELIVERED` có `gross_snapshot` = Σ `dichVu[].thanhTien`.

- [ ] **Step 1: Viết bài đỏ** `src/da-giao-thuong-mai.test.ts` trên khung thử (`world`, `seedStaff`). Gieo đối tác `TRAVEL_AGENCY`, mức 10% mọi dịch vụ, đơn 5.000.000, xác nhận qua route.
  - `đơn đại lý đủ bản chụp, đã thu đủ ⇒ «Đã giao» 200, sổ có HOA_HONG 500.000 cty → đại lý mang order_service_id`.
  - `C-1 trọn: đại lý tự ghi cọc 3.000.000 (route payments, tài khoản PARTNER), HDV ghi 1.750.000, giảm giá 250.000 ⇒ số dư đại lý 2.750.000, HDV 1.750.000` (dùng `soDuTheoBen`).
  - `dòng nhập tay trên đơn đại lý ⇒ 409 not_deliverable, lyDoChuaGiao.ma = "terms_missing"`.
  - `đơn khách lẻ có bản chụp NONE ⇒ «Đã giao» như cũ, không dòng thương mại`.
  - `đơn khách lẻ xác nhận trước 0090, đã qua b1 (bản chụp AUTO / NONE) ⇒ «Đã giao» được`; `cùng đơn khi CHƯA có bản chụp nào ⇒ 409 terms_missing` (ADR-0079 điều 5 lớp 1, nguyên chữ).
  - `câu UPDATE «Đã giao» chạy tay (datGiaoStatement) cho đơn thiếu bản chụp ⇒ 0 dòng đổi` (lớp 1).
  - `INSERT phiếu DELIVERED chạy tay cho đơn đó ⇒ throws delivered_terms` (lớp 2).
  - `cố ý hỏng một dòng trong lô (số âm) ⇒ không câu nào lưu, đơn chưa «Đã giao»`.
- [ ] **Step 2: Chạy** `node --test src/da-giao-thuong-mai.test.ts` — FAIL.
- [ ] **Step 3: Cài.**
  - **Lớp 1:** thay `AND NOT CO_NGUOI_HUONG` bằng `AND NOT EXISTS (… v_ord_terms_missing …) AND NOT EXISTS (… dòng dịch vụ không có bản chụp hiện hành …)`, đọc bảng `ord_service_terms` của chính `orders`.
  - **Không thêm ngoại lệ** cho đơn không bản chụp: lớp 1 đúng chữ ADR-0079 điều 5 (mọi dòng phải có bản chụp hiện hành). Đơn khách lẻ cũ được b1 (Task 6, migration `0112` chạy cùng lần phát hành) chụp bù trước khi luật mới có hiệu lực. Vì vậy **Task 6 phải gộp cùng bản với Task 4**; không phát hành Task 4 một mình.
  - **`daGiao`:** gọi `phanThuongMaiCuaDon` **một lần**. Kiểm `thanhTien` của nó là thành tiền **hiện hành sau điều chỉnh số khách** (ADR-0114); nếu `loadOrderView(…, false)` chưa áp điều chỉnh thì dùng đúng hàm mà `due_snapshot` dùng, ghi Ruling. Sau đó dựng `DongThuongMai[]` bằng `tinhDongDoiTac` của `src/shared/hoa-hong-dong.ts`, gọi `tinhTrangThuongMai`, `sinhPhieuDaGiao`, rồi chèn các dòng vào lô sau phiếu `DELIVERED` (thứ tự lô: câu bảo vệ dispatch → `datGiaoStatement` → lần thu → phiếu → các dòng → nhật ký).
  - **Dịch lỗi:** `delivered_terms` / `commercial_*` của trigger được dịch ra cùng câu lời thường ở Task 3, không trả lỗi SQL thô.
- [ ] **Step 4: Chạy lại** bài mới + `node --test src/da-giao-khe-hoa-hong.test.ts src/modules/pricing/loai-doi-tac.test.ts src/modules/billing/*.test.ts`. Các bài liệt kê «sẽ phải đảo» đổi kỳ vọng (từ 409 `booker_partner` sang 200 khi có mức); các bài «vẫn xanh» chỉ đổi mã lý do. Sau đó `npm test` + `npm run typecheck` xanh.
- [ ] **Step 5: Commit** — «Mở Đã giao cho đơn có người hưởng: lô ghi hoa hồng, giảm giá bên đặt chịu, giá vốn; hai lớp chặn thiếu bản chụp».

### Task 5: Người thu bên đặt / nhà cung cấp; khai và «Bên kia đã nhận» (ADR-0130)

**Files:**
- Modify: `src/shared/contracts.ts` (`LanThuInput.nguoiThu`), `src/modules/billing/service.ts` (`docLanThu`, `cauLanThu`, `khoanChoXacNhan` ở `rules.ts`), `src/modules/billing/repository.ts` (`RECEIPT_VALUES`, `bindReceipt`), `src/modules/billing/index.ts` (route mới)
- Test: `src/modules/billing/ben-kia.test.ts` (tạo), sửa `src/modules/billing/lo-ghi.test.ts:76` (NT-Q4 / NT-S9 — đảo có chủ đích)

**Interfaces:**
- Produces:
```ts
// LanThuInput.nguoiThu thêm hai dạng:
nguoiThu: "toi" | "cong_ty" | { partyId: string } | "ben_dat" | { nhaCungCapPartyId: string };
// «Thu cho ai» (ADR-0078 điều 9): mặc định Tour Đảo; người thu SUPPLIER ⇒ luôn nhà cung cấp đó; người ghi chọn được NCC của một dòng trên đơn khi khách trả trước phần đó.
thuChoNhaCungCapPartyId?: string;
export interface LanThuHopLe { /* … */ collectorRole: "COMPANY" | "STAFF" | "BOOKER" | "SUPPLIER"; collectorPartyId: string; collectedForPartyId: string; canDoiChieu: boolean }
export async function xacNhanBenKia(db: D1Database, v: { receiptId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ orderId: string }>>;
```
- Route: `POST /api/ledger/counterparty-receipts/:receiptId/confirm` (cổng `office`, `can(staff, "ledger.write")`, `baoThayDoi({orderId, thayDoi: "tien"})`).

- [ ] **Step 1: Viết bài đỏ** `ben-kia.test.ts` (khung thử):
  - `HDV khai "ben_dat" 300.000 trên đơn đại lý ⇒ 201; không dòng HELD nào; có dấu DECLARED; banDangGiu của HDV không đổi; «Đã giao» ⇒ 409 ma "reconciling", câu nêu «khách trả cho <tên đại lý>»` (tiêu chí 1 của ADR-0130).
  - `Kế toán xác nhận ⇒ một phiếu COUNTERPARTY_CONFIRMED, một dòng HELD đại lý → cty 300.000 mang receipt_id gốc; «Đã giao» được` (tiêu chí 2).
  - `Kế toán đảo lần thu trước khi xác nhận ⇒ hết đang đối chiếu, không dòng sót; khai lại 300.000 ⇒ lại đang đối chiếu` (tiêu chí 3, Review Focus 3).
  - `Kế toán đảo sau khi xác nhận (đơn chưa giao) ⇒ dòng HELD trên đại lý được đảo`.
  - `Đối tác ghi "toi" ⇒ collector_role = "BOOKER" (không còn STAFF), HELD ngay trên chính họ, không dấu chờ` (tiêu chí 5).
  - `Kế toán ghi { partyId: <đại lý> } ⇒ BOOKER, HELD ngay`.
  - `"ben_dat" trên đơn khách lẻ ⇒ 400 «Đơn này không có đại lý đặt»`.
  - `{ nhaCungCapPartyId } không phải NCC của dòng nào trên đơn ⇒ 400; số > phần chưa thu của NCC đó ⇒ 400`.
  - `lần thu SUPPLIER ⇒ collected_for_party_id = NCC; lần thu khác ⇒ công ty chủ`.
  - `khai BOOKER chuyển khoản, xác nhận không mã giao dịch ⇒ được` (tiêu chí 4).
- [ ] **Step 2: Chạy** — FAIL.
- [ ] **Step 3: Cài** `docLanThu` (nhánh mới; người không `laKeToan` chỉ khai được; `ben_dat` = `orders.booker_party_id` của đơn và đơn phải có người hưởng theo bản chụp), `cauLanThu` (canDoiChieu ⇒ dấu `DECLARED`, không `sinhDongLanThu`), `xacNhanBenKia` (khuôn `xacNhanCongTyNhan`: một lô = dấu `CONFIRMED` → phiếu → dòng HELD → nhật ký; khoá lạc quan như khuôn cũ), `khoanChoXacNhan` gồm cả lần thu `BOOKER` / `SUPPLIER` có dấu chờ, `RECEIPT_VALUES` nhận `collected_for_party_id` từ tham số (bỏ gán cứng). Xoá hằng chết `COLLECTOR_ROLES_GHI_MOI` hoặc cho nó thành cổng thật (Ruling).
- [ ] **Step 4: Chạy lại** + `node --test src/modules/billing/*.test.ts src/audit-invariants.test.ts` — PASS; `npm test`, `typecheck` xanh.
- [ ] **Step 5: Commit** — «Người thu là đại lý / quầy nhà cung cấp; lời khai chờ Kế toán xác nhận, không tạo nợ (ADR-0130)».

### Task 6: Đơn cũ: chụp bù b1 (một lần) và nút «Chụp bù» của Kế toán (b2)

**Files:**
- Create (có điều kiện): `migrations/0112_chup_bu_khach_le.sql`
- Modify: `src/modules/orders/index.ts` (hai route, đặt TRƯỚC `/api/orders/:id`), `src/modules/orders/thuong-mai-repo.ts`
- Test: `src/modules/orders/chup-bu.test.ts` (tạo)

**Interfaces:**
- Produces:
  - `GET /api/orders/cho-chup-bu` (cổng `office`, `can(order.terms.override)`) → `{ don: { orderId, maDon, ngayXacNhan, benDat, lyDo: "co_nguoi_huong" | "nhap_tay" | "khong_xac_dinh" }[] }`.
  - `POST /api/orders/:id/chup-bu` (cùng ô) → `{ chup: BanChup[] }`; nhật ký hành động mới `ord_terms_backfilled` (khai ở `src/shared/audit-actions.ts`, nhãn «Chụp bù mức hoa hồng»).

- [ ] **Step 1: Viết bài đỏ**:
  - `chụp bù dùng mức hiệu lực ở NGÀY XÁC NHẬN, không phải hôm nay`: mức 10% từ 2026-09-01 đến 2026-10-15, 12% từ 2026-10-16; đơn xác nhận 2026-10-10 ⇒ bản chụp `rateBp = 1000`.
  - `chụp bù đơn đã có bản chụp ⇒ 409`; `đơn đã «Đã giao» ⇒ 409` (trigger `_delivered`); `Bán hàng gọi ⇒ 403`.
  - `chụp bù khi không còn mức hiệu lực ngày đó ⇒ bản chụp MISSING / NO_RULE, đơn vẫn bị giữ` (không tự lấy 0).
  - `migration 0112 trên khung thử`: đơn khách lẻ cũ không bản chụp ⇒ có bản chụp `NONE`, người bán = dòng ALL, `source = 'AUTO'`, `captured_date` = ngày xác nhận; đơn có dịch vụ mang điều khoản SERVICE ⇒ **không** được chụp (sang danh sách b2).
- [ ] **Step 2: Chạy** — FAIL.
- [ ] **Step 3: Cài.** Route dùng **cùng** `chupDon` + `docBangChoChup` với lúc Xác nhận, `ngay` = ngày giờ VN của `confirmed_at`. Migration `0112` là câu `INSERT … SELECT` một lần, không đụng tiền (hoa hồng `NONE`, người bán từ `prc-st-goc-all`), lọc đúng tập (b1) trừ (b1x) như câu đếm ở Task 0.
- [ ] **Step 4: Chạy lại** — PASS; `npm test`, `typecheck`.
- [ ] **Step 5: Commit** — «Chụp bù mức cho đơn xác nhận trước bảng mức: tự động cho khách lẻ, nút Chụp bù cho Kế toán».

### Task 7: Trần giảm giá theo người hưởng của đơn

**Files:**
- Modify: `src/modules/orders/price-guards.ts`, `src/modules/orders/index.ts` (`priceGuard`, đường Xác nhận)
- Test: `src/modules/orders/price-guards.test.ts`, `tests/e2e/nhap-tay-va-gia-doi-tac.mjs`

**Interfaces:**
- Produces:
```ts
export function tranGiamGiaTheoNguoiHuong(v: { coNguoiHuong: boolean; tongHoaHong: number; laThucTap: boolean }): number | null; // null = không trần (đơn không người hưởng, người không phải Thực tập)
```
- Câu lỗi (copy cố định): «Giảm tối đa <X> ₫ (bằng hoa hồng của đơn).»

- [ ] **Step 1: Viết bài đỏ**:
  - `C-5: tổng hoa hồng 790.000, giảm 800.000 ⇒ vi phạm; 790.000 ⇒ được`. Áp cho Bán hàng, Quản trị, Đối tác (ba ca).
  - `Thực tập trên đơn có người hưởng ⇒ trần 0`.
  - `nháp: dòng thiếu mức tính 0 vào trần`.
  - `Xác nhận: trần theo bản chụp tính trong cùng lô — bảng đổi giữa lúc sửa nháp và lúc xác nhận ⇒ dùng bản chụp`.
  - `sau xác nhận, bớt khách làm hoa hồng < giảm giá ⇒ không chặn; DTO đơn có canhBaoGiamGia = { vuot: X }`.
  - **Đảo có chủ đích:** `price-guards.test.ts:155`, `:162` (`PARTNER_DISCOUNT_CAP === 0`) và e2e `nhap-tay-va-gia-doi-tac.mjs:236-237` (Bán hàng giảm giá đơn có người hưởng → nay bị trần).
- [ ] **Step 2: Chạy** — FAIL.
- [ ] **Step 3: Cài.** Tách vế trần (theo người hưởng của đơn) khỏi vế giá danh mục (giữ theo người thao tác). Đường Xác nhận: tính `chup` **trước** bước kiểm giá, rồi truyền tổng hoa hồng của bản chụp vào kiểm trần.
- [ ] **Step 4: Chạy lại** — PASS; `npm test`, `typecheck`.
- [ ] **Step 5: Commit** — «Trần giảm giá đơn có người hưởng bằng tổng hoa hồng, áp cho mọi người sửa đơn (C8 = A)».

### Task 8: Biên nhận chia phần theo người bán

**Files:**
- Modify: `src/shared/contracts.ts` (`ReceiptDto`), `src/modules/receipt/rules.ts` (`dungBienNhan`), `src/modules/receipt/index.ts`, `src/modules/billing/index.ts` (`soTienBienNhan` trả thêm đã trả theo «thu cho ai»)
- Test: `src/modules/receipt/bien-nhan.test.ts`

**Interfaces:**
- Produces: `ReceiptDto.phan: { nguoiBan: string; vaiTourDao: "nguoi_ban" | "doi_tac_dat_ve"; dichVu: string[]; tong: number; daTra: number; conLai: number; traTaiQuay: boolean }[]` (một phần khi chỉ Tour Đảo bán).

- [ ] **Step 1: Viết bài đỏ**:
  - `SV-HT-03 (chỉ vé i-resort) ⇒ một phần: nguoiBan "i-resort", vaiTourDao "doi_tac_dat_ve", tong 600.000, daTra 600.000 (lễ tân 200.000 ghi thuChoNhaCungCapPartyId = i-resort + quầy 400.000), conLai 0, traTaiQuay true`.
  - `C-4 ⇒ hai phần: Tour Đảo (Hòn Tằm) tong 1.000.000, daTra 1.000.000 (HDV); i-resort tong 600.000, daTra 600.000 (Hương 200.000 thu cho i-resort + quầy 400.000)`.
  - `lần thu không chọn «thu cho» ⇒ tính vào phần Tour Đảo`.
  - **Số lạ:** gieo `480017` vào `cost_rate_bp`, `470019` vào giá vốn, `460023` vào hoa hồng ⇒ không chuỗi nào xuất hiện trong JSON biên nhận.
- [ ] **Step 2–4:** chạy đỏ → cài → xanh (`node --test src/modules/receipt/*.test.ts`), `npm test`, `typecheck`.
- [ ] **Step 5: Commit** — «Biên nhận chia phần theo người bán, giữ danh sách trắng».

### Task 9: Bịt chỗ lộ tên người thu với tài khoản Đối tác

**Files:**
- Modify: `src/modules/billing/service.ts` (DTO `GET /api/orders/:id/payments`, `lyDoChuaHoanThanh`), `src/modules/billing/rules.ts` (câu «<tên> đang giữ»)
- Test: `src/so-la-doi-tac.test.ts`

- [ ] **Step 1: Viết bài đỏ** — thêm `GET /api/orders/:id/payments` và `POST /api/ledger/balances` vào danh sách bề mặt.
  - Tài khoản PARTNER và tài khoản lai SALES + PARTNER (Review Focus 5) mở đơn của mình có lần thu do HDV «Nam Số Lạ 4817» ghi.
  - Khẳng định: JSON không chứa `Nam Số Lạ`; `lanThu[].nguoiThu` của lần thu người khác = «Người thu khác»; câu chưa hoàn thành không chứa tên, không chứa số người khác giữ.
- [ ] **Step 2–4:** đỏ → cài (rẽ nhánh theo `holdsPartner(staff)`; văn phòng giữ nguyên) → xanh; `npm test`, `typecheck`.
- [ ] **Step 5: Commit** — «Đối tác không thấy tên người thu và tiền người khác đang giữ (ADR-0081 điều 4)».

### Task 10: Kiểm định kỳ và bảng kiểm khoá tháng

**Files:**
- Modify: `scripts/audit-checks.mjs`, `src/modules/billing/service.ts` (`kySoResponse` — bảng kiểm trước khoá)
- Test: `src/audit-invariants.test.ts`

- [ ] **Step 1: Viết bài đỏ** (mỗi mã một ca vi phạm cố ý + một ca sạch):
  - `R-BIL-2`: dòng `HOA_HONG` lệch 1 đồng so với số tính lại ⇒ thoát 1; đơn «Đã giao» trước mốc ⇒ chỉ `warn`.
  - `R-BIL-5`: đơn «Đã giao» có dòng làm đại lý mà không `GIA_VON` ⇒ lỗi sau mốc / cảnh báo trước mốc.
  - `R-BIL-16` (số dòng giảm giá bên đặt; tên ADR gốc R-BIL-14 đã bị ADR-0115 dùng): đơn có người hưởng, giảm giá hiệu lực > 0, không có / có hai dòng `GIAM_GIA_BEN_DAT` ⇒ lỗi.
  - `R-BIL-12`: `collected_for_party_id` không phải công ty chủ cũng không phải người bán của dòng nào trên đơn ⇒ lỗi. `R-BIL-S9` đổi nghĩa tương ứng (bài `:2329` đảo có chủ đích).
  - `R-ORD-DC1`: đơn có người hưởng, xác nhận sau mốc, giảm giá > tổng hoa hồng chụp lúc xác nhận ⇒ `warn` (mức theo ADR-0079 điều 9 / C11).
  - `R-BIL-13`: câu kiểm cộng **mọi** loại dòng như trigger `settlement_no_flip`; ca có `HOA_HONG` không báo sai.
  - Bỏ `R-BIL-2`, `R-BIL-5` khỏi `GHI_CHU` «chưa áp dụng» (bài `:2235` đảo có chủ đích).
  - Bảng kiểm khoá tháng: tháng có đơn «Đã giao» thiếu giá vốn ⇒ mục cảnh báo trong `kySoResponse`.
- [ ] **Step 2–4:** đỏ → cài → xanh; `node scripts/audit-invariants.mjs --db local` trên D1 local sau e2e: thoát 0.
- [ ] **Step 5: Commit** — «Kiểm định kỳ sổ đại lý đợt 2: R-BIL-2, R-BIL-5, R-BIL-12, R-BIL-16, R-ORD-DC1; R-BIL-13 cộng mọi loại dòng».

### Task 11: Sổ vàng chạy trên mã sổ; gộp hồ sơ có bản chụp

**Files:**
- Modify: `src/so-vang.test.ts`, `src/so-vang-so-dai-ly.test.ts`
- Create: `src/gop-ho-so-ban-chup.test.ts`
- Create: `docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/de-xuat-luat.md` (diff đề xuất cho câu luật sổ vàng ở `docs/ARCHITECTURE.md` — **không sửa** `ARCHITECTURE.md`)

- [ ] **Step 1:** Bỏ bộ lọc `luot1` để SV-HT-01…05 chạy trên mã sổ (`sinhPhieuDaGiao` + `soDuTheoBen`). Luật lớp 1 «tổng thu = giá bán» đổi sang công thức của R-BIL-2: phần Tour Đảo giữ = giá bán lẻ trước giảm − giảm giá Tour Đảo chịu − giá vốn − hoa hồng. Ca `cho_xac_nhan` chạy dưới dạng `todo` (khuôn sẵn có).
- [ ] **Step 2:** C-1…C-5 thành bài của luật sinh dòng, khớp từng đồng với `phieu-ke-toan.md`.
- [ ] **Step 3:** `gop-ho-so-ban-chup.test.ts` (ADR-0117 tiêu chí N-11). Gộp hồ sơ đại lý B vào A khi B là người hưởng trên một đơn đã xác nhận chưa giao, rồi «Đã giao». Ghi lại sổ thực ra gì. **Nếu tiền sai: dừng, ghi nợ, báo điều phối — không sửa trong đợt này**; khi đó bài ghi `todo` có lý do.
- [ ] **Step 4:** `npm test` xanh.
- [ ] **Step 5: Commit** — «Sổ vàng chạy trên mã sổ đợt 2; bài gộp hồ sơ có bản chụp».

### Task 12: Giao diện

**Files:**
- Modify: `web/order.ts` (form lần thu: «Khách trả cho đại lý <tên>», «Khách trả tại quầy <NCC>», câu «chờ Kế toán xác nhận»; lý do giữ mới; nút «Chụp bù»; cảnh báo giảm giá > hoa hồng), `web/order-form.ts` (câu trần giảm giá), `web/home.ts` (ô «Chờ đối chiếu» đếm loại mới; nút «Bên kia đã nhận» ở chỗ Kế toán đang bấm «Công ty đã nhận»)
- Create: `web/chup-bu.ts` + khai `PAGES` (`src/shared/sw-policy.ts`), script `build:web`, mục menu Thiết lập (`src/shared/muc-giao-dien.ts`, hiện theo `order.terms.override`), `src/shared/so-do-trang.ts`

- [ ] **Step 1:** Dựng bằng `h()`, không `innerHTML`, giá trị CSS qua token, ô gõ 16px. Hai lựa chọn người thu mới **ẩn** ở đơn không có người hưởng / không dòng làm đại lý (máy chủ vẫn từ chối).
- [ ] **Step 2:** `npm run build:web`; chạy kịch bản Chrome tương ứng ở bảng `web/CLAUDE.md` (có `AXE_JS`). Chụp ảnh thật hai hướng (điện thoại / máy tính) cho: trang đơn đại lý (trước / sau «Đã giao»), form lần thu, «Việc của bạn» của Kế toán, màn «Chụp bù», biên nhận hai phần. Lưu ở `docs/evidence/2026-10-18-so-dai-ly-dot-2/`.
- [ ] **Step 3:** Trợ giúp theo vai: Kế toán (Chụp bù, Bên kia đã nhận), HDV (khai khách trả đại lý). **Không nới trần chữ**: rút câu cũ nếu cần.
- [ ] **Step 4:** `npm test`, `typecheck` xanh.
- [ ] **Step 5: Commit** — «Giao diện sổ đại lý đợt 2: khai khách trả đại lý / tại quầy, Chụp bù, Bên kia đã nhận».

### Task 13: Thử đầu–cuối

**Files:**
- Create: `tests/e2e/so-dai-ly-dot-2.mjs` (đăng nhập qua `login()` / `session()` của `tests/e2e/lib.mjs`)

- [ ] **Step 1:** Kịch bản: (1) C-1 trọn đường tới «Hoàn thành» bằng nộp / trả từng đơn (tiêu chí 1 đặc tả §4); (2) SV-HT-03 với khai → giữ «đang đối chiếu» → Kế toán xác nhận → «Đã giao» → Tour Đảo nợ i-resort 80.000 (tiêu chí 2); (3) đơn khách lẻ thường (tiêu chí 3); (4) đơn đại lý thiếu mức → bị giữ → Kế toán cài mức + «Chụp bù» → «Đã giao»; (5) Đối tác mở đơn của mình không thấy tên người thu (tiêu chí 4).
- [ ] **Step 2:** `npm run test:e2e -- so-dai-ly-dot-2 so-dai-ly so-tien nhap-tay-va-gia-doi-tac khoa-thang` (cần mạng). Cuối cùng `audit-invariants` local thoát 0.
- [ ] **Step 3: Commit** — «Kịch bản đầu–cuối sổ đại lý đợt 2».

### Task 14: Tài liệu, sổ hàng rào, nhật ký thay đổi, runbook, kiểm độc lập toàn nhánh

**Files:**
- Modify: `docs/SYSTEM-DESIGN.md` (§5, §6, §7, §8), `docs/CHANGE-GUIDE.md` (công thức sổ đại lý), `docs/SO-HANG-RAO.md` (mỗi hàng rào mới kèm ngày quan sát chặn thật), `docs/BACKLOG.md` (đóng BL-SDL-DOT-2 (1)(3)(4), BL-VA-RAO-K3, BL-SDL-GIA-DAI-LY-AM nếu đã giải; ghi nợ mới), nhật ký thay đổi (mục 2.18 tạm, lời thường), `docs/HANDOFF-N1.md` (mục chuẩn bị phát hành: câu đếm Task 0 trước, rồi `trien-khai` — có migration nên có điểm Time Travel; sau deploy `audit-invariants --db remote`)

- [ ] **Step 1:** Cập nhật tài liệu mô tả trong cùng commit với mã nếu chưa (CLAUDE.md §2).
- [ ] **Step 2:** `npm test`, `npm run typecheck`, e2e (Task 13) xanh; ghi số bài vào sổ thi công.
- [ ] **Step 3:** Giao người kiểm độc lập chỉ-đọc (vai `nguoi-kiem-doc-lap`) đọc toàn nhánh, chạy lại lệnh, phá thử các hàng rào; chỉ báo «đạt» dựa trên báo cáo đó.
- [ ] **Step 4:** Báo điều phối: nhánh, commit cuối, lệnh `day-len` / `trien-khai` cho chủ (không tự chạy), việc chủ còn lại (ca vàng, mức cho đơn đang chờ).
