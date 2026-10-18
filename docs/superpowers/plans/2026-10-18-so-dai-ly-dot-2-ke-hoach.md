# Kế hoạch thi công: Sổ đại lý đợt 2 (đơn có người hưởng tới «Đã giao – đã thu đủ»)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **TRẠNG THÁI: CHỜ CHỦ DUYỆT** (bản 2, sửa theo người kiểm độc lập vòng 1). Không thi công trước khi:
> - chủ duyệt ba quyết định ở `docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/trinh-chu.md`;
> - ADR-0130 đã vào `docs/adr/`.
>
> Phiên lập kế hoạch không tự thi công (Hiến pháp P15). Người thi công không tự nghiệm thu (N8): mỗi task có người kiểm độc lập chỉ-đọc (vai `nguoi-kiem-doc-lap`).

**Goal:** Đơn có bên đặt là đại lý (người hưởng hoa hồng) đi trọn đường tới «Đã giao – đã thu đủ», và sổ ghi ngay ai nợ ai: hoa hồng, giảm giá bên đặt chịu, giá vốn nhà cung cấp.

**Architecture:**
- Route «Đã giao» của `billing` hỏi `can()`, gọi hàm công bố `orders.phanThuongMaiCuaDon`, rồi truyền phần thương mại xuống `billing/service.ts`. Ở đó luật thuần sinh dòng thương mại vào cùng lô.
- Hai lớp CSDL canh: câu ghi của `orders` và trigger của `billing`.
- Người thu `BOOKER` / `SUPPLIER` mở theo ADR-0130: người không giữ `ledger.write` chỉ khai (dấu `DECLARED`, không tạo nợ); Kế toán xác nhận thì sinh dòng giữ hộ.
- Trần giảm giá trên đơn có người hưởng = tổng hoa hồng, áp cho mọi người.

**Tech Stack:**
- TypeScript, Cloudflare Worker + D1 (SQLite), esbuild.
- Chạy kiểm bằng `node --test` (Node 22, chạy `.ts` trực tiếp).
- Khung thử `tests/audit/harness.mjs` (`world`, `seedStaff`: cả ứng dụng + SQLite đủ migration).
- E2e `tests/e2e/*.mjs` (đăng nhập qua `login()` / `session()` của `tests/e2e/lib.mjs`).

**Spec:**
- Đặc tả: `docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/README.md`, mục P1–P9.
- Cùng thư mục: `trang-ghep.md`, `de-xuat-adr-khach-tra-ben-kia.md` (ADR-0130), `phieu-ke-toan.md`.
- ADR gốc: ADR-0078 (B2, điều 5), ADR-0079, ADR-0061 A-14; đã sửa câu bởi ADR-0088, 0092, 0109, 0115, 0120.
- Lệch nhau thì đặc tả thắng kế hoạch, ADR thắng đặc tả.

## Global Constraints

- **Ngôn ngữ:** chữ người dùng thấy, lỗi, commit, tài liệu đều **tiếng Việt có dấu**; không lộ mã thô; gọi hệ thống là «Nền tảng».
- **Tiền:**
  - Tiền là `INTEGER` VNĐ; số dẫn xuất chỉ tính ở máy chủ; làm tròn nửa lên theo dòng.
  - Hoa hồng / giá vốn chỉ qua `hoaHongDong` / `giaVonDong` / `tinhDongDoiTac` của `src/shared/hoa-hong-dong.ts` (hàng rào `src/hoa-hong-mot-nguon.test.ts`).
  - **Giảm giá bên đặt chịu** = Σ thành tiền trước giảm (`gross_snapshot`) − phải thu đã chụp (`due_snapshot`). Công thức này đúng nghĩa «giảm giá hiệu lực» của ADR-0109 mà không tính `min()` lần hai; không import `effectiveMoney` của `orders`, vì hàm này không công bố.
  - Thiếu mức ⇒ giữ đơn. Không bao giờ tự lấy 0.
- **Ranh giới module:**
  - `phanThuongMaiCuaDon` chỉ được gọi trong **thân route** ở `index.ts`, sau `can(` (`src/orders-cong-bo.test.ts`). `billing/service.ts` nhận dữ liệu do route truyền xuống.
  - `orders` không import `billing`: kiểu mới của `billing` không được nằm trong chữ ký mà `orders` phải dựng.
  - `billing` không có cạnh tới `pricing`: dùng `src/shared/`.
- **Dữ liệu:**
  - Không xoá cứng; dòng sổ chỉ đảo.
  - Migration chỉ thêm tệp mới, số dự kiến `0111`, `0112` (tạm; `0098` đang bị nhánh đưa đón giữ). Lúc gộp kiểm lại bằng `ls migrations` và `git ls-tree --name-only <nhánh> migrations/` cho mọi nhánh chưa gộp. Bản dự kiến `2.18` (tạm).
  - Ngày dân sự theo giờ Việt Nam (`vnToday`); dấu thời gian ISO UTC.
- **Quyền và nhật ký:**
  - Route ghi hỏi `can()` ở dòng đầu thân. POST cần `Origin` cùng site.
  - Nhật ký không ghi SĐT / email / MST; hành động mới khai ở `src/shared/audit-actions.ts` có nhãn tiếng Việt.
  - Tài khoản giữ quyền Đối tác (`holdsPartner`, kể cả lai) không bao giờ thấy: a%, giá vốn, tên người thu khác, tiền người khác giữ, hoa hồng của bên khác.
  - Người không có `supply.terms.view` không suy ra được giá vốn.
- **Kiểm:**
  - Mỗi hàng rào mới: **quan sát chặn thật** (sửa cố ý → đỏ → hoàn nguyên), ghi ngày vào sổ thi công và `docs/SO-HANG-RAO.md`.
  - Sửa hành vi: đỏ trước, xanh sau.
  - Chạm API / migration ⇒ chạy e2e. Sửa giao diện ⇒ kịch bản Chrome tương ứng (`web/CLAUDE.md`).
- **AI không chạy:** `git push`, gộp vào `main`, `wrangler deploy` / `rollback`, migration remote, ghi D1 remote. Câu đếm production do chủ chạy.

## Review Focus

1. **Đơn khách lẻ cũ xác nhận trước 12/10, chưa có bản chụp:** sau khi bản lên, «Đã giao» được nhờ `0112` (b1, đúng chữ ADR-0079 điều 7b1). Không đơn khách lẻ nào bị giữ thêm, trừ đơn có **dịch vụ nhập tay** (đã duyệt, A-14). Ca ở Task 4, Task 6.
2. **Đơn đại lý có một dòng nhập tay:** luôn giữ `terms_missing` cho tới khi Kế toán ghi tay; không lọt vì dòng nhập tay không có `catalog_code`. Ca ở Task 4.
3. **Lời khai «khách trả đại lý» bị đảo rồi khai lại:** dấu chờ và ô «chờ đối chiếu» của Kế toán đúng ở mọi bước; không dòng mồ côi; view cọc khớp mã. Ca ở Task 5.
4. **Bớt khách sau xác nhận làm hoa hồng < giảm giá:** không chặn. «Đã giao» ghi `GIAM_GIA_BEN_DAT` = gross − due, R-BIL-2 không báo sai. Ca ở Task 3, Task 7.
5. **Tài khoản lai Bán hàng + Đối tác, và tài khoản Bán hàng thuần:** người lai không thấy tên HDV đã thu và câu «<tên> đang giữ». Bán hàng không thấy số dư nhà cung cấp. Ca ở Task 9.

---

## Bản đồ tệp

| Tệp | Việc |
|---|---|
| `migrations/0111_so_dai_ly_dot_2.sql` (tạo) | loại dòng, loại phiếu, vai người thu, `gross_snapshot`, trigger lớp 2 và (i)–(iv), dấu đối chiếu nhận vai mới, view / trigger cọc tạo lại, `bil_posting_order_required`, mốc kiểm định kỳ, view «chưa chụp» |
| `migrations/0112_chup_bu_khach_le.sql` (tạo, có điều kiện) | chụp bù b1 một lần; **bỏ tệp** nếu câu đếm b1 = 0 |
| `src/modules/billing/rules.ts` | `DebtKind`, `LineDraft.orderServiceId`, `DongThuongMai`, `TinhTrangThuongMai`, `tinhTrangThuongMai`, `sinhPhieuDaGiao`, `lyDoChuaGiaoDuoc`, `khoanMoiDoiChieu`, `canDoiChieu`, câu «<bên> đang giữ» |
| `src/modules/billing/service.ts` | `docLanThu`, `cauLanThu`, `daGiao`, `tienCuaDon`, `xacNhanBenKia` (mới), `lyDoChuaHoanThanh` theo người xem |
| `src/modules/billing/repository.ts` | `LINE_IF_POSTING` mang `order_service_id`; `POSTING_COLS` mang `gross_snapshot`; `RECEIPT_VALUES` mang `collected_for_party_id`; `PENDING_COMPANY` nhận vai mới |
| `src/modules/billing/index.ts` | route `POST /api/ledger/counterparty-receipts/:receiptId/confirm`; route `…/delivered`, `…/payments` gọi `phanThuongMaiCuaDon` sau `can(` |
| `src/modules/billing/dieu-chinh.ts` | `loaiDong` nhận ba loại mới |
| `src/modules/orders/hoan-tat-repo.ts` | lớp 1 của câu «Đã giao» |
| `src/modules/orders/index.ts`, `thuong-mai-repo.ts` | route chụp bù + danh sách chờ; thứ tự Xác nhận (chụp trước, kiểm trần sau) |
| `src/modules/orders/price-guards.ts` | trần giảm giá theo người hưởng |
| `src/modules/receipt/rules.ts`, `src/shared/contracts.ts` | `ReceiptDto.phan[]`; `LanThuInput.nguoiThu`, `thuChoNhaCungCapPartyId` |
| `scripts/audit-checks.mjs` | R-BIL-2, R-BIL-5, R-BIL-12, R-BIL-16, R-ORD-DC1, R-BIL-S9 (R-BIL-13 giữ nguyên) |
| `golden/so-cong-no-luot-2.json` | C-1…C-5 (`cho_xac_nhan`) |
| `web/order.ts`, `web/order-form.ts`, `web/home.ts`, trang mới `web/chup-bu.ts` | giao diện |
| `tests/e2e/so-dai-ly-dot-2.mjs` (tạo), `tests/e2e/nhap-tay-va-gia-doi-tac.mjs` | e2e |

---

### Task 0: Điều kiện, sổ thi công, câu đếm cho chủ, ca vàng

**Files:**
- Create: `docs/superpowers/plans/2026-10-18-so-dai-ly-dot-2-thi-cong-nhat-ky.md` (Ruling, Quan sát chặn thật, Nợ — khuôn sổ đợt 1)
- Create: `docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/cau-dem-chi-doc.sql`
- Modify: `golden/so-cong-no-luot-2.json`

- [ ] **Step 1: Xác nhận điều kiện.** Thiếu một điều thì DỪNG, báo điều phối.
  - ADR-0130 có ở `docs/adr/`, trạng thái accepted.
  - `trinh-chu.md` có lời duyệt của chủ cho ba quyết định.
  - Trường `xay_tren_cho_phep` của TNV-G1, TNV-G3, TNV-G4, HC-4.2, HC-5.19 trong `docs/quyen-hoan.json` có câu **nhắc «sổ đại lý đợt 2»**. Dòng cho phép cũ của đặc tả QR ngày 8/10 **không tính**.
- [ ] **Step 2: Soạn câu đếm chỉ-đọc.** Một tệp SQL, mỗi câu một dòng, có chú thích lời thường. Chủ chạy bằng `wrangler d1 execute tourdao-sales-db --remote --command "<câu>"`.
  - (a) đơn đã «Đã giao» có dòng mà điều khoản cung ứng hiện hành có nhà cung cấp;
  - (b1) đơn `confirmed`, chưa giao, không bản chụp nào, bên đặt không mang vai được hưởng / nhóm bên ngoài / loại đối tác, không dòng nhập tay;
  - (b1x) trong (b1): đơn có dịch vụ đang mang điều khoản SERVICE / GROUP có nhà cung cấp — **danh sách mã đơn** cho Kế toán;
  - (b2) đơn `confirmed`, chưa giao, không bản chụp, còn lại;
  - (b3) đơn có bản chụp hiện hành `MISSING`, chưa giao;
  - (e) đơn khách lẻ `confirmed`, chưa giao, có dòng nhập tay (sẽ bị giữ theo A-14);
  - (sau) câu đếm sau phát hành: số bản chụp `source = 'AUTO'` có `created_at` ≥ giờ áp `0112`.

  Kết quả chủ dán vào sổ thi công. (b1) = 0 ⇒ bỏ tệp `0112` và phần b1 của Task 6.
- [ ] **Step 3: Thêm C-1…C-5** vào `golden/so-cong-no-luot-2.json` (khuôn ca B-3, `xac_nhan.trang_thai = "cho_xac_nhan"`; số theo ADR-0079 «Ví dụ bằng số», khớp `phieu-ke-toan.md`). Chạy `node --test src/so-vang-so-dai-ly.test.ts`: xanh, ca mới là `todo`.
- [ ] **Step 4: Spike `gross_snapshot`** trên SQLite của khung thử: `ALTER TABLE bil_posting ADD COLUMN gross_snapshot INTEGER CHECK (...)` tham chiếu `kind_code`. Ghi Ruling R-1: được thì dùng `CHECK`, không thì dùng trigger `BEFORE INSERT`.
- [ ] **Step 5: Commit** — «Sổ đại lý đợt 2: mở sổ thi công, câu đếm chỉ-đọc, ca vàng C-1…C-5 chờ xác nhận».

### Task 1: Hàng rào «một nguồn tính hoa hồng» bắt thêm dạng bọc (BL-VA-RAO-K3)

**Files:** Modify: `src/hoa-hong-mot-nguon.test.ts`

- [ ] **Step 1: Viết ca đỏ.** Bốn mẫu chuỗi: `Number(rateBp) * thanhTien`, `((rateBp)) * x`, `CAST(rate_bp AS INTEGER) * …`, `IFNULL(rate_bp, 0) * …`. Khẳng định bộ quét báo đủ bốn.
- [ ] **Step 2: Chạy** `node --test src/hoa-hong-mot-nguon.test.ts`. Kỳ vọng FAIL.
- [ ] **Step 3: Mở rộng bộ quét** (regex trên mã TS và chuỗi SQL); cập nhật phần GIỚI HẠN ở đầu tệp.
- [ ] **Step 4: Chạy lại**, PASS. Quan sát chặn thật: chèn tạm `IFNULL(rate_bp,0)*2` vào một chuỗi SQL trong `src/modules/billing/` → đỏ → hoàn nguyên. Ghi ngày.
- [ ] **Step 5: Commit** — «Hàng rào một nguồn tính hoa hồng: bắt biến bị bọc, CAST và IFNULL (BL-VA-RAO-K3)».

### Task 2: Migration `0111` và bài kiểm migration

**Files:** Create `migrations/0111_so_dai_ly_dot_2.sql`, `src/migrations-so-dai-ly-dot-2.test.ts`. Modify `docs/data-dictionary.json`, rồi `npm run dict`.

**Interfaces — Produces** (tên CSDL các task sau dùng):

*Loại và vai:*
- `bil_debt_kind`: `HOA_HONG` («Hoa hồng»), `GIAM_GIA_BEN_DAT` («Giảm giá bên đặt chịu»), `GIA_VON` («Giá vốn nhà cung cấp»).
- `bil_posting_kind`: `COUNTERPARTY_CONFIRMED` («Bên kia đã nhận»). Trigger `bil_posting_order_required` (0045) nhận loại này (phiếu một đơn).
- `bil_collector_role`: `SUPPLIER.active = 1`.
- `bil_posting.gross_snapshot INTEGER NULL`.

*View và trigger chặn «Đã giao»:*
- View `v_ord_terms_uncaptured(order_id, order_service_id)` của `orders`: dòng dịch vụ của đơn đã xác nhận chưa có bản chụp hiện hành.
- Trigger `bil_posting_delivered_terms`: đọc `v_ord_terms_missing` + `v_ord_terms_uncaptured`.

*Lưới số thương mại:*
- Chỉ mục duy nhất một phần `bil_debt_line_one_commercial`.
- Trigger `bil_debt_line_commercial_*` (i)–(iv).

*Đối chiếu và cọc* — tạo lại bằng `DROP` + `CREATE` cùng tên, khuôn 0099:
- `bil_receipt_recon_declared`: nhận thêm `BOOKER` / `SUPPLIER`, mọi hình thức.
- `bil_receipt_recon_confirmed_txn`: chỉ người thu `COMPANY`.
- `v_bil_coc_don` và `bil_payment_receipt_coc_reversal`: «đang đối chiếu» gồm vai mới.

*Mốc kiểm định kỳ:*
- `bil_audit_cutoff`: `R-BIL-2`, `R-BIL-5`, `R-BIL-12`, `R-BIL-16`.
- `ord_audit_cutoff`: `R-ORD-DC1`.

- [ ] **Step 1: Viết bài đỏ.** Dùng `world()`, mỗi trigger một ca, khẳng định câu `RAISE` có tiền tố mã.
  - **Chặn «Đã giao»:**
    - phiếu `DELIVERED` cho đơn có dòng trong `v_ord_terms_uncaptured` hoặc `v_ord_terms_missing` ⇒ throws `/delivered_terms/`.
  - **Lưới số thương mại:**
    - (i) `HOA_HONG` gốc không `order_service_id` ⇒ throws; hai `HOA_HONG` cùng (phiếu, dòng dịch vụ) ⇒ throws `UNIQUE`.
    - (ii) `HOA_HONG` có bên nợ ≠ công ty chủ ⇒ throws.
    - (iii) Σ `HOA_HONG` + `GIA_VON` gốc > `gross_snapshot` ⇒ throws.
    - (iv) `GIAM_GIA_BEN_DAT` ≠ `gross_snapshot − due_snapshot` ⇒ throws.
  - **Miễn đúng chỗ** (đều không throws):
    - dòng đảo của một `HOA_HONG`;
    - phiếu `ADJUSTMENT` một dòng `GIA_VON` không `order_service_id`;
    - phiếu `DELIVERED` `gross_snapshot` NULL.
  - **Đối chiếu:**
    - `DECLARED` cho lần thu `BOOKER` tiền mặt ⇒ được; vai `STAFF` ⇒ throws `recon_receipt_invalid`.
    - `CONFIRMED` cho `BOOKER` chuyển khoản không mã ⇒ được; `COMPANY` chuyển khoản không mã sau mốc ⇒ throws `bank_txn_required`.
    - còn `DECLARED` vai `BOOKER` chưa `CONFIRMED` ⇒ phiếu `DELIVERED` throws `delivered_reconciling`.
  - **Cọc:**
    - `v_bil_coc_don` của đơn có lần thu `BOOKER` đang chờ ⇒ `dang_doi_chieu` đúng số;
    - đảo lần thu đó qua trigger cọc ⇒ hành vi như vai `COMPANY` hôm nay.
  - **Loại phiếu mới:** phiếu `COUNTERPARTY_CONFIRMED` không `order_id` ⇒ throws.
- [ ] **Step 2: Chạy** `node --test src/migrations-so-dai-ly-dot-2.test.ts`. Kỳ vọng FAIL.
- [ ] **Step 3: Viết migration** theo Interfaces.
  - Thân trigger chỉ đọc bảng `bil_` hoặc view công bố (`v_ord_*`, `v_pty_owner_company`).
  - `cutoff_at` = lúc áp (`strftime('%Y-%m-%dT%H:%M:%fZ','now')`).
- [ ] **Step 4: Chạy lại**, PASS. Chạy `npm run dict`, rồi `node --test src/architecture.test.ts src/migrations-*.test.ts`, PASS. Quan sát chặn thật từng trigger, ghi sổ.
- [ ] **Step 5: Commit** — «Migration 0111 sổ đại lý đợt 2: ba loại dòng thương mại, phiếu Bên kia đã nhận, hai lớp chặn Đã giao thiếu bản chụp, đối chiếu và cọc nhận người thu mới».

### Task 3: Luật thuần của phiếu «Đã giao» và lý do giữ

**Files:** Modify `src/modules/billing/rules.ts`. Test: `src/modules/billing/rules.test.ts`.

**Interfaces — Produces:**
```ts
export type DebtKind = "HELD" | "SETTLEMENT" | "REFUND" | "HOA_HONG" | "GIAM_GIA_BEN_DAT" | "GIA_VON";
export interface LineDraft { debtorPartyId: string; creditorPartyId: string; amount: number; kind: DebtKind; reversesLineId: string | null; orderServiceId?: string | null }
export interface DongThuongMai { orderServiceId: string; tenDichVu: string; thanhTien: number; hoaHong: number | null; giaVon: number | null; nhaCungCapPartyId: string | null }
export type TinhTrangThuongMai =
  | { trangThai: "KHONG_NGUOI_HUONG" }
  | { trangThai: "DU"; nguoiHuongPartyId: string }
  | { trangThai: "THIEU"; ma: "terms_missing" | "booker_not_beneficiary"; dichVu: readonly string[]; canChupBu: boolean }
  | { trangThai: "VUOT"; dichVu: readonly string[] };
// `chup`: bản chụp hiện hành từng dòng; dòng chưa chụp mang MISSING / NOT_CAPTURED (`chuaCoBanChup` của orders). BanChup từ src/shared/hoa-hong-dong.ts.
export function tinhTrangThuongMai(v: { chup: readonly BanChup[]; dong: readonly DongThuongMai[] }): TinhTrangThuongMai;
export function sinhPhieuDaGiao(v: { congTyId: string; nguoiHuongPartyId: string | null; giamGiaBenDat: number; dong: readonly DongThuongMai[] }): LineDraft[];
// lyDoChuaGiaoDuoc: `coNguoiHuong: boolean` THAY bằng `thuongMai: TinhTrangThuongMai`. MaLyDo bỏ `booker_partner`, thêm `terms_missing`, `booker_not_beneficiary`, `terms_exceed_price`.
```
`canChupBu = true` khi mọi dòng thiếu đều là `NOT_CAPTURED` (đơn chưa có bản chụp nào).

**Câu lời thường (copy cố định):**
- `terms_missing`, `canChupBu`: «Đơn xác nhận trước khi có bảng mức, chưa chụp mức — Kế toán cài mức rồi bấm Chụp bù.»
- `terms_missing`, không `canChupBu`: «Thiếu mức hoa hồng / người bán cho <dịch vụ> — Kế toán ghi mức tay cho dòng này.»
- `booker_not_beneficiary`: «Bên đặt của đơn không thuộc danh sách được hưởng hoa hồng — Văn phòng sửa bên đặt hoặc Kế toán ghi mức tay.»
- `terms_exceed_price`: «Mức hoa hồng / giá vốn cài cho <dịch vụ> vượt giá bán — Kế toán xem lại.»

- [ ] **Step 1: Viết bài đỏ.**
  - **Sinh dòng `sinhPhieuDaGiao`:**
    - `C-1` — tour 5.000.000, hoa hồng 500.000, `giamGiaBenDat: 250_000`. Đúng hai dòng: `{cty → A, 500_000, HOA_HONG, orderServiceId "s1"}` và `{A → cty, 250_000, GIAM_GIA_BEN_DAT, null}`.
    - `C-4` — ba dòng: `HOA_HONG` 100.000 × 2 (cty → H) và `GIA_VON` 480.000 (cty → IR).
    - `B-5` — 600.000, hoa hồng 100.000, giá vốn 480.000, `giamGiaBenDat` 20.000. Ra `HOA_HONG` 100.000, `GIA_VON` 480.000, `GIAM_GIA_BEN_DAT` 20.000.
    - Hoa hồng 0 ⇒ không dòng; giảm giá 0 ⇒ không dòng giảm giá; không người hưởng ⇒ chỉ `GIA_VON`.
  - **`tinhTrangThuongMai`:**
    - mọi dòng `NOT_CAPTURED` ⇒ `THIEU / terms_missing / canChupBu = true`;
    - một dòng `NO_RULE` / `RULE_CONFLICT` / `MANUAL_LINE` hoặc người bán `MISSING` ⇒ `THIEU / terms_missing / canChupBu = false`;
    - `BOOKER_NOT_BENEFICIARY` ⇒ `THIEU / booker_not_beneficiary`;
    - hoa hồng + giá vốn một dòng > thành tiền dòng ⇒ `VUOT` kèm tên;
    - mọi bản `NONE` + người bán SET ⇒ `KHONG_NGUOI_HUONG`.
  - **`lyDoChuaGiaoDuoc` — thứ tự:**
    - `before_departure` trước `terms_*`;
    - `terms_*` trước `reconciling`;
    - `aiXuLy` đúng (`terms_missing` → Kế toán).
  - **Đảo có chủ đích** (ghi trong commit):
    - bài «thứ tự lý do cố định» (`booker_partner` → `terms_missing`);
    - bài «`sinhPhieuDaGiao() == []`» → ca không người hưởng, không giá vốn ⇒ `[]`.
- [ ] **Step 2: Chạy** `node --test src/modules/billing/rules.test.ts`. Kỳ vọng FAIL.
- [ ] **Step 3: Cài.**
- [ ] **Step 4: Chạy lại**, PASS. Nơi gọi `lyDoChuaGiaoDuoc` sẽ đỏ kiểu. Task 3 và 4 commit liền nhau nếu `typecheck` không xanh được riêng (ghi Ruling).
- [ ] **Step 5: Commit** — «Luật phiếu Đã giao sinh dòng hoa hồng, giảm giá bên đặt chịu, giá vốn; ba lý do giữ mới thay booker_partner».

### Task 4: Lô «Đã giao» ghi dòng thương mại (hai lớp chặn)

**Files:**
- Modify: `src/modules/orders/hoan-tat-repo.ts` (lớp 1).
- Modify: `src/modules/billing/index.ts` (route `…/delivered` và `GET …/payments`: gọi `phanThuongMaiCuaDon` sau `can(`, truyền xuống).
- Modify: `src/modules/billing/service.ts` (`daGiao`, `tienCuaDon` nhận `phan: PhanThuongMai | null`).
- Modify: `src/modules/billing/repository.ts` (`LINE_IF_POSTING`, `POSTING_COLS`).
- Test: tạo `src/da-giao-thuong-mai.test.ts`. Đảo các bài đã liệt kê ở sổ thi công: `src/da-giao-khe-hoa-hong.test.ts`, `src/modules/pricing/loai-doi-tac.test.ts` (N-5, N-5b).

**Interfaces:**
- Consumes: `tinhTrangThuongMai`, `sinhPhieuDaGiao` (Task 3); `phanThuongMaiCuaDon` và kiểu `PhanThuongMai` qua `orders/index.ts`.
- Produces: phiếu `DELIVERED` có `gross_snapshot` = Σ `phan.dichVu[].thanhTien`. `giamGiaBenDat` = `gross_snapshot − due_snapshot`. Cột `co_nguoi_huong` của `GIAO_STATE` không còn dùng cho quyết định (giữ hoặc bỏ, ghi Ruling).

- [ ] **Step 1: Viết bài đỏ** `src/da-giao-thuong-mai.test.ts` (khung thử). Gieo `TRAVEL_AGENCY`, mức 10% mọi dịch vụ, đơn 5.000.000, xác nhận qua route.
  - Đơn đại lý đủ bản chụp, đã thu đủ ⇒ «Đã giao» 200; sổ có `HOA_HONG` 500.000 cty → đại lý, mang `order_service_id`.
  - **C-1 trọn:** đại lý (PARTNER) ghi «toi» 3.000.000, HDV ghi 1.750.000, giảm giá 250.000 ⇒ `soDuTheoBen`: đại lý 2.750.000, HDV 1.750.000.
  - **Đơn đại lý:**
    - có dòng nhập tay ⇒ 409, `lyDoChuaGiao.ma = "terms_missing"`, câu «ghi mức tay» (Review Focus 2);
    - xác nhận trước 0090, chưa chụp ⇒ 409 `terms_missing`, câu «Chụp bù».
  - **Đơn khách lẻ:**
    - có bản chụp `NONE` + người bán SET ⇒ «Đã giao» như cũ, không dòng thương mại;
    - có **dịch vụ nhập tay** ⇒ 409 `terms_missing` (A-14 đã duyệt);
    - cũ đã qua b1 (bản chụp `AUTO` / `NONE`) ⇒ «Đã giao» được.
  - **Hai lớp chặn:**
    - `datGiaoStatement` chạy tay cho đơn thiếu bản chụp ⇒ 0 dòng đổi (lớp 1);
    - `INSERT` phiếu `DELIVERED` chạy tay ⇒ throws `delivered_terms` (lớp 2).
  - Cố ý hỏng một dòng trong lô ⇒ không câu nào lưu.
- [ ] **Step 2: Chạy** `node --test src/da-giao-thuong-mai.test.ts`. Kỳ vọng FAIL.
- [ ] **Step 3: Cài.**
  - **Lớp 1:** thay `AND NOT CO_NGUOI_HUONG` bằng «không dòng nào trong `v_ord_terms_missing`, không dòng nào trong `v_ord_terms_uncaptured`». Câu đọc bảng `ord_service_terms` của chính `orders`.
  - **Route:** gọi `phanThuongMaiCuaDon` một lần, sau `can(`.
  - **`daGiao`:**
    - dựng `DongThuongMai[]` bằng `tinhDongDoiTac`, gọi `tinhTrangThuongMai` rồi `sinhPhieuDaGiao`;
    - chèn các dòng sau phiếu `DELIVERED`, theo thứ tự lô: câu bảo vệ dispatch → `datGiaoStatement` → lần thu → phiếu → dòng → nhật ký;
    - dịch lỗi `delivered_terms` / `commercial_*` ra cùng câu lời thường ở Task 3.
  - **Kèm b1:** Task 6 (`0112`) phải lên **cùng bản** với task này.
- [ ] **Step 4: Chạy lại** bài mới, rồi `node --test src/da-giao-khe-hoa-hong.test.ts src/modules/pricing/loai-doi-tac.test.ts src/modules/billing/*.test.ts src/orders-cong-bo.test.ts src/architecture.test.ts`. Sau đó `npm test` + `npm run typecheck` xanh.
- [ ] **Step 5: Commit** — «Mở Đã giao cho đơn có người hưởng: lô ghi hoa hồng, giảm giá bên đặt chịu, giá vốn; hai lớp chặn thiếu bản chụp».

### Task 5: Người thu bên đặt / nhà cung cấp; khai và «Bên kia đã nhận» (ADR-0130)

**Files:**
- Modify `src/shared/contracts.ts`.
- Modify `src/modules/billing/service.ts`: `docLanThu`, `cauLanThu`, `xacNhanBenKia` (mới), lần thu kèm «Đã giao».
- Modify `src/modules/billing/rules.ts`: `khoanMoiDoiChieu`, `canDoiChieu`.
- Modify `src/modules/billing/repository.ts`: `RECEIPT_VALUES`, `bindReceipt`, `PENDING_COMPANY`.
- Modify `src/modules/billing/index.ts`: route mới.
- Test: tạo `src/modules/billing/ben-kia.test.ts`. Đảo có chủ đích `src/modules/billing/lo-ghi.test.ts` (NT-Q4 / NT-S9) và bài đối chiếu hai nơi mã ↔ SQL ở `rules.test.ts`.

**Interfaces — Produces:**
```ts
// LanThuInput:
nguoiThu: "toi" | "cong_ty" | { partyId: string } | "ben_dat" | { nhaCungCapPartyId: string };
thuChoNhaCungCapPartyId?: string; // «Thu cho ai»: mặc định Tour Đảo; SUPPLIER ⇒ luôn NCC đó; người ghi chọn NCC của một dòng trên đơn
export interface LanThuHopLe { soTien: number; hinhThuc: MethodCode; collectorRole: "COMPANY" | "STAFF" | "BOOKER" | "SUPPLIER"; collectorPartyId: string; collectedForPartyId: string; canDoiChieu: boolean; ngayPhatSinh: string; ghiChu: string | null }
export async function xacNhanBenKia(db: D1Database, v: { receiptId: string; raw: unknown; ai: NguoiGoi }): Promise<KetQua<{ orderId: string }>>;
```
Route mới: `POST /api/ledger/counterparty-receipts/:receiptId/confirm`. Cổng `office`, `can(staff, "ledger.write")`, cuối route gọi `baoThayDoi({ orderId, thayDoi: "tien" })`.

**Luật đọc thân** (`docLanThu`; `phan` do route truyền):
- `"toi"` của tài khoản Đối tác:
  - hồ sơ là `booker_party_id` của đơn **và** đơn có người hưởng ⇒ `BOOKER`;
  - còn lại ⇒ như hôm nay.
- `"ben_dat"`:
  - đơn có người hưởng ⇒ người thu = bên đặt;
  - không có ⇒ 400 «Đơn này không có đại lý đặt.».
- `{ nhaCungCapPartyId }`:
  - phải là nhà cung cấp của một dòng trên đơn theo `phan.chup`;
  - số ≤ phần thành tiền chưa thu của dòng NCC đó.
- `{ partyId }` của Kế toán: là bên đặt ⇒ `BOOKER`; là NCC của một dòng ⇒ `SUPPLIER`; còn lại ⇒ `STAFF` như hôm nay.
- `canDoiChieu = true` khi vai `BOOKER` / `SUPPLIER` và người ghi không `laKeToan`, trừ trường hợp Đối tác ghi chính mình.
- **Lần thu kèm «Đã giao»:** `"ben_dat"` / `{ nhaCungCapPartyId }` ⇒ 400 «Ghi khoản khách trả cho đại lý / tại quầy trước, chờ Kế toán xác nhận rồi mới Đã giao.».

- [ ] **Step 1: Viết bài đỏ** `ben-kia.test.ts`.
  - **Khai và xác nhận** (ADR-0130 tiêu chí 1–3):
    - HDV khai `"ben_dat"` 300.000 ⇒ 201; không `HELD`; có `DECLARED`; `banDangGiu` của HDV không đổi; đơn có trong danh sách «chờ đối chiếu» (`PENDING_COMPANY`) và bộ đếm của Kế toán; «Đã giao» ⇒ 409 `reconciling`, câu nêu «khách trả cho <tên đại lý>».
    - Kế toán xác nhận ⇒ một phiếu `COUNTERPARTY_CONFIRMED`, một `HELD` đại lý → cty 300.000 mang `receipt_id` gốc; đơn rời danh sách chờ; «Đã giao» được.
    - Đảo trước xác nhận ⇒ hết chờ, không dòng sót. Khai lại ⇒ chờ lại (Review Focus 3). Đảo sau xác nhận (đơn chưa giao) ⇒ `HELD` trên đại lý được đảo.
  - **Ghi trực tiếp:**
    - Đối tác `"toi"` trên đơn mình là bên đặt ⇒ `BOOKER`, `HELD` ngay, không dấu chờ (ADR-0130 tiêu chí 5).
    - Kế toán `{ partyId: đại lý }` ⇒ `BOOKER`, `HELD` ngay.
  - **Từ chối:**
    - `"ben_dat"` trên đơn khách lẻ ⇒ 400;
    - `{ nhaCungCapPartyId }` sai NCC ⇒ 400; số vượt phần chưa thu ⇒ 400;
    - lần thu kèm «Đã giao» với lựa chọn mới ⇒ 400.
  - **Thu cho ai:**
    - `SUPPLIER` ⇒ `collected_for_party_id` = NCC;
    - lễ tân `"toi"` + `thuChoNhaCungCapPartyId` = i-resort ⇒ thu cho i-resort;
    - không chọn ⇒ công ty chủ.
  - **Mã giao dịch:** `BOOKER` chuyển khoản, xác nhận không mã ⇒ được (ADR-0130 tiêu chí 4).
  - **Hai nơi khớp nhau:** bài đối chiếu mã ↔ SQL có mẫu `BOOKER` / `SUPPLIER` (khoanMoiDoiChieu ↔ `v_bil_coc_don`).
- [ ] **Step 2: Chạy.** Kỳ vọng FAIL.
- [ ] **Step 3: Cài** theo luật trên.
  - `xacNhanBenKia` theo khuôn `xacNhanCongTyNhan`: một lô gồm dấu `CONFIRMED` → phiếu → `HELD` → nhật ký (hành động mới `ledger_counterparty_confirmed`, nhãn «Bên kia đã nhận»), khoá lạc quan như khuôn cũ.
  - Xoá hằng chết `COLLECTOR_ROLES_GHI_MOI` hoặc cho nó thành cổng thật (Ruling).
- [ ] **Step 4: Chạy lại** cùng `node --test src/modules/billing/*.test.ts src/audit-invariants.test.ts`, PASS. Sau đó `npm test`, `typecheck` xanh.
- [ ] **Step 5: Commit** — «Người thu là đại lý / quầy nhà cung cấp; lời khai chờ Kế toán xác nhận, không tạo nợ (ADR-0130)».

### Task 6: Đơn cũ — chụp bù b1, nút «Chụp bù» (b2), điều chỉnh nhóm a

**Files:**
- Create (có điều kiện): `migrations/0112_chup_bu_khach_le.sql`.
- Modify: `src/modules/orders/index.ts` (hai route, đặt **trước** `/api/orders/:id`), `src/modules/orders/thuong-mai-repo.ts`, `src/modules/billing/dieu-chinh.ts` (`loaiDong`).
- Test: tạo `src/modules/orders/chup-bu.test.ts`; sửa `src/modules/billing/dieu-chinh*.test.ts`.

**Interfaces — Produces:**
- `GET /api/orders/cho-chup-bu` (cổng `office`, `can(order.terms.override)`) → `{ don: { orderId, maDon, ngayXacNhan, benDat, lyDo: "co_nguoi_huong" | "nhap_tay" }[] }`. Chỉ đơn **chưa có bản chụp nào**.
- `POST /api/orders/:id/chup-bu` (cùng ô) → `{ chup: BanChup[] }`. Nhật ký mới `ord_terms_backfilled`, nhãn «Chụp bù mức hoa hồng».
- `loaiDong` của yêu cầu điều chỉnh nhận `HOA_HONG`, `GIAM_GIA_BEN_DAT`, `GIA_VON`.

- [ ] **Step 1: Viết bài đỏ.**
  - **Chụp bù theo ngày xác nhận:** mức 10% (2026-09-01 → 2026-10-15), 12% (từ 2026-10-16); đơn xác nhận 2026-10-10 ⇒ `rateBp = 1000`.
  - **Từ chối:**
    - đơn đã có bản chụp (kể cả `MISSING`) ⇒ 409 «Đơn đã có bản chụp — ghi mức tay cho dòng thiếu»;
    - đơn đã «Đã giao» ⇒ 409;
    - Bán hàng gọi ⇒ 403.
  - **Không còn mức ngày đó** ⇒ bản chụp `MISSING / NO_RULE`, đơn vẫn giữ.
  - **`0112` trên khung thử:**
    - đơn khách lẻ cũ không bản chụp ⇒ bản chụp `NONE`, người bán = `prc-st-goc-all`, `source = 'AUTO'`, `captured_date` = ngày giờ VN của `confirmed_at`;
    - `confirmed_at` NULL ⇒ ngày tạo đơn;
    - đơn có bên đặt mang vai được hưởng / nhóm ngoài / loại đối tác, hoặc dòng nhập tay ⇒ **không** chụp (sang b2).
  - **Điều chỉnh nhóm a** (ADR-0115):
    - yêu cầu bổ sung `GIA_VON` cho đơn đã giao ⇒ duyệt ⇒ dòng ghi;
    - ví dụ D-3 («đại lý → cty 20.000 loại hoa hồng») chạy được;
    - ca nhà cung cấp đang giữ tiền khách (bổ sung giá vốn làm đổi dấu số dư cặp) ⇒ ghi kết quả thật vào sổ thi công. Nếu bị chặn `adjustment_flips_sign` thì báo điều phối, không tự nới.
- [ ] **Step 2: Chạy.** Kỳ vọng FAIL.
- [ ] **Step 3: Cài.**
  - Route dùng **cùng** `chupDon` + `docBangChoChup` với lúc Xác nhận, `ngay` = ngày VN của `confirmed_at` (rỗng ⇒ `created_at`).
  - `0112` là một câu `INSERT … SELECT` không đụng tiền, lọc đúng tập (b1) như câu đếm của Task 0, theo chữ ADR-0079 điều 7b1 (không loại b1x).
- [ ] **Step 4: Chạy lại**, PASS. Sau đó `npm test`, `typecheck`.
- [ ] **Step 5: Commit** — «Chụp bù mức cho đơn xác nhận trước bảng mức; điều chỉnh có duyệt nhận ba loại dòng mới».

### Task 7: Trần giảm giá theo người hưởng của đơn

**Files:**
- Modify: `src/modules/orders/price-guards.ts`, `src/modules/orders/index.ts` (`priceGuard`, đường Xác nhận, cảnh báo trên DTO đơn).
- Test: `src/modules/orders/price-guards.test.ts`, `src/phai-thu-mot-ham.test.ts` (nếu cảnh báo chạm khuôn P1–P3 / danh sách cho phép), `tests/e2e/nhap-tay-va-gia-doi-tac.mjs`.

**Interfaces — Produces:**
```ts
// null = không trần. Đơn KHÔNG người hưởng: giữ đúng luật hôm nay (Đối tác 0, Thực tập 0, còn lại null).
export function tranGiamGia(v: { coNguoiHuong: boolean; tongHoaHong: number; laDoiTac: boolean; laThucTap: boolean }): number | null;
```
Câu lỗi (copy cố định): «Giảm tối đa <X> ₫ (bằng hoa hồng của đơn).»

- [ ] **Step 1: Viết bài đỏ.**
  - **C-5:** tổng hoa hồng 790.000; giảm 800.000 ⇒ vi phạm, 790.000 ⇒ được. Ba ca: Bán hàng, Quản trị, Đối tác.
  - **B-5:** hoa hồng 100.000; giảm 150.000 ⇒ vi phạm, 20.000 ⇒ được.
  - **Thực tập** trên đơn có người hưởng ⇒ 0.
  - **Đơn không người hưởng:**
    - Đối tác, kể cả tài khoản lai Bán hàng + Đối tác ⇒ trần 0 (giữ vá DK-T3-01);
    - Bán hàng ⇒ không trần.
  - **Nháp:** dòng thiếu mức tính 0.
  - **Xác nhận:** trần theo bản chụp vừa tính trong cùng lô.
  - **Sau xác nhận:** bớt khách làm hoa hồng < giảm giá ⇒ không chặn; DTO đơn có `canhBaoGiamGia: { vuot: X }`.
  - **Không đảo nguyên bài** `PARTNER_DISCOUNT_CAP === 0`: hằng giữ cho đơn không người hưởng. Ca e2e `nhap-tay-va-gia-doi-tac.mjs:236-237` dùng đơn khách lẻ thì **giữ nguyên**; kiểm lại trước khi sửa.
- [ ] **Step 2: Chạy.** Kỳ vọng FAIL.
- [ ] **Step 3: Cài.** Tách vế trần (theo người hưởng của đơn) khỏi vế giá danh mục (giữ theo người thao tác). Đường Xác nhận: tính `chup` trước, kiểm trần sau.
- [ ] **Step 4: Chạy lại**, PASS. Quan sát chặn thật: đổi tạm trần thành `tongHoaHong + 1` → bài C-5 đỏ → hoàn nguyên. Sau đó `npm test`, `typecheck`.
- [ ] **Step 5: Commit** — «Trần giảm giá đơn có người hưởng bằng tổng hoa hồng, áp cho mọi người sửa đơn (C8 = A); đơn khách lẻ giữ luật cũ».

### Task 8: Biên nhận chia phần theo người bán

**Files:**
- Modify: `src/shared/contracts.ts` (`ReceiptDto`), `src/modules/receipt/rules.ts` (`dungBienNhan`), `src/modules/receipt/index.ts`, `src/modules/billing/index.ts` (`soTienBienNhan` trả thêm đã trả theo «thu cho ai»).
- Test: `src/modules/receipt/bien-nhan.test.ts`.

**Interfaces — Produces:**
```ts
ReceiptDto.phan: { nguoiBan: string; vaiTourDao: "nguoi_ban" | "doi_tac_dat_ve"; dichVu: string[]; tong: number; daTra: number; conLai: number; traTaiQuay: boolean }[]
```
Mỗi người bán một phần; đơn chỉ một người bán thì có một phần.

- [ ] **Step 1: Viết bài đỏ.**
  - **SV-HT-03 (chỉ vé i-resort):** một phần — `nguoiBan` «i-resort», `vaiTourDao: "doi_tac_dat_ve"`, `tong` 600.000, `daTra` 600.000 (lễ tân 200.000 thu cho i-resort + quầy 400.000), `conLai` 0, `traTaiQuay: true`.
  - **B-4:** hai phần — Tour Đảo 1.000.000 (đã trả 500.000, còn 500.000); i-resort 600.000 (còn 600.000, `traTaiQuay: true`).
  - **B-5:** «giảm 20.000, còn 580.000 thanh toán tại quầy i-resort».
  - **Thu cho ai:** lần thu không chọn ⇒ tính vào phần Tour Đảo.
  - **Số lạ:** gieo `480017` vào `cost_rate_bp`, `470019` vào giá vốn, `460023` vào hoa hồng ⇒ không chuỗi nào trong JSON biên nhận.
- [ ] **Step 2–4:**
  - Chạy đỏ → cài → xanh (`node --test src/modules/receipt/*.test.ts`).
  - Quan sát chặn thật: cho tạm `dungBienNhan` chép `costRateBp` vào DTO → bài số lạ đỏ → hoàn nguyên.
  - Chạy `npm test`, `typecheck`.
- [ ] **Step 5: Commit** — «Biên nhận chia phần theo người bán, giữ danh sách trắng».

### Task 9: Chặn lộ tên người thu và giá vốn

**Files:**
- Modify: `src/modules/billing/service.ts` (DTO `GET /api/orders/:id/payments`, `lyDoChuaHoanThanh`), `src/modules/billing/rules.ts` (câu «<bên> đang giữ»).
- Test: `src/so-la-doi-tac.test.ts`.

- [ ] **Step 1: Viết bài đỏ.** Thêm `GET /api/orders/:id/payments` và `POST /api/ledger/balances` vào danh sách bề mặt.
  - **Tài khoản PARTNER và tài khoản lai SALES + PARTNER**, xem đơn của mình có lần thu do HDV «Nam Số Lạ 4817» ghi:
    - JSON không chứa «Nam Số Lạ»;
    - `lanThu[].nguoiThu` của người khác = «Người thu khác»;
    - câu chưa hoàn thành không có tên và số của người khác.
  - **Tài khoản SALES thuần và FIELD** (không `supply.terms.view`), xem đơn SV-HT-05 sau «Đã giao»:
    - JSON không chứa `120000` hay «i-resort đang giữ»;
    - thấy câu «còn khoản giữa công ty và nhà cung cấp — Kế toán xử lý».
  - **Kế toán:** thấy đủ.
- [ ] **Step 2–4:**
  - Chạy đỏ → cài (rẽ nhánh theo `holdsPartner(staff)` và `can(staff, "supply.terms.view")`) → xanh.
  - Quan sát chặn thật: bỏ tạm nhánh ẩn → đỏ → hoàn nguyên.
  - Chạy `npm test`, `typecheck`.
- [ ] **Step 5: Commit** — «Đối tác không thấy tên người thu và tiền người khác giữ; người không xem điều khoản cung ứng không thấy số dư nhà cung cấp».

### Task 10: Kiểm định kỳ và bảng kiểm khoá tháng

**Files:**
- Modify: `scripts/audit-checks.mjs`, `src/modules/billing/service.ts` (`kySoResponse`).
- Test: `src/audit-invariants.test.ts`.

- [ ] **Step 1: Viết bài đỏ.** Mỗi mã: một ca vi phạm cố ý và một ca sạch.
  - **`R-BIL-2`:** dòng `HOA_HONG` lệch 1 đồng ⇒ thoát 1; đơn trước mốc ⇒ chỉ cảnh báo.
  - **`R-BIL-5`:** đơn «Đã giao» có dòng làm đại lý mà không `GIA_VON` ⇒ lỗi sau mốc, cảnh báo trước mốc.
  - **`R-BIL-16`** (số dòng giảm giá bên đặt): đơn có người hưởng, gross − due > 0, không có hoặc có hai dòng `GIAM_GIA_BEN_DAT` ⇒ lỗi.
  - **`R-BIL-12`, `R-BIL-S9`:**
    - `collected_for_party_id` không phải công ty chủ cũng không phải người bán của dòng nào ⇒ lỗi (`R-BIL-12`);
    - `R-BIL-S9` đổi nghĩa tương ứng (đảo bài có chủ đích).
  - **`R-ORD-DC1`:** giảm giá > tổng hoa hồng chụp lúc xác nhận ⇒ cảnh báo trước mốc, **lỗi** sau mốc.
  - **`R-BIL-13` giữ nguyên:** ca C-2 (Tour Đảo nợ CTV 150.000, không giữ hộ) và SV-HT-04 ⇒ **không** báo.
  - **Danh sách «chưa áp dụng»:** bỏ `R-BIL-2`, `R-BIL-5` khỏi `GHI_CHU` (đảo bài có chủ đích).
  - **Khoá tháng:** tháng có đơn «Đã giao» thiếu giá vốn ⇒ có mục cảnh báo trong `kySoResponse`.
- [ ] **Step 2–4:** Chạy đỏ → cài → xanh. Sau e2e, `node scripts/audit-invariants.mjs --db local` thoát 0.
- [ ] **Step 5: Commit** — «Kiểm định kỳ sổ đại lý đợt 2: R-BIL-2, R-BIL-5, R-BIL-12, R-BIL-16, R-ORD-DC1».

### Task 11: Sổ vàng chạy trên mã sổ; gộp hồ sơ có bản chụp

**Files:**
- Modify: `src/so-vang.test.ts`, `src/so-vang-so-dai-ly.test.ts`.
- Create: `src/gop-ho-so-ban-chup.test.ts`, `docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/de-xuat-luat.md` (diff đề xuất cho câu luật sổ vàng ở `docs/ARCHITECTURE.md`; **không sửa** `ARCHITECTURE.md`).

- [ ] **Step 1: Cho SV-HT-01…05 chạy trên mã sổ.** Bỏ bộ lọc `luot1`, chạy bằng `sinhPhieuDaGiao` + `soDuTheoBen`. Đổi luật lớp 1 sang công thức R-BIL-2: phần Tour Đảo giữ = giá bán lẻ trước giảm − giảm giá Tour Đảo chịu − giá vốn − hoa hồng. Ca `cho_xac_nhan` chạy dạng `todo`.
- [ ] **Step 2: C-1…C-5** thành bài của luật sinh dòng, khớp từng đồng `phieu-ke-toan.md`.
- [ ] **Step 3: Viết `gop-ho-so-ban-chup.test.ts`** (ADR-0117 N-11): gộp hồ sơ đại lý B vào A khi B là người hưởng trên đơn đã xác nhận chưa giao, rồi «Đã giao», và ghi lại sổ thực ra gì. **Tiền sai thì dừng, ghi nợ, báo điều phối**; bài để `todo` có lý do.
- [ ] **Step 4:** `npm test` xanh.
- [ ] **Step 5: Commit** — «Sổ vàng chạy trên mã sổ đợt 2; bài gộp hồ sơ có bản chụp».

### Task 12: Giao diện

**Files:**
- **`web/order.ts`** (trang đơn):
  - form lần thu: «Khách trả cho đại lý <tên>», «Khách trả tại quầy <NCC>», ô chọn «Phần tiền này cho» khi đơn có dòng làm đại lý, câu «chờ Kế toán xác nhận»;
  - lý do giữ mới, nút «Chụp bù», cảnh báo giảm giá > hoa hồng.
- **`web/order-form.ts`:** câu trần giảm giá.
- **`web/home.ts`:** ô «Chờ đối chiếu» gồm loại mới; nút «Bên kia đã nhận».
- **Trang mới `web/chup-bu.ts`**, khai ở:
  - `PAGES` (`src/shared/sw-policy.ts`) và script `build:web`;
  - menu Thiết lập (`src/shared/muc-giao-dien.ts`, hiện theo `order.terms.override`);
  - `src/shared/so-do-trang.ts`.

- [ ] **Step 1: Dựng các màn.** Theo luật giao diện: dùng `h()` (không `innerHTML`), CSS qua token, ô gõ 16px. Hai lựa chọn người thu mới và ô «Phần tiền này cho» **ẩn** khi đơn không đủ điều kiện; máy chủ vẫn từ chối.
- [ ] **Step 2: Kiểm bằng trình duyệt.** Chạy `npm run build:web`, rồi kịch bản Chrome theo bảng ở `web/CLAUDE.md` (có `AXE_JS`). Chụp ảnh thật hai hướng (điện thoại / máy tính) cho: trang đơn đại lý trước và sau «Đã giao», form lần thu, «Việc của bạn» của Kế toán, màn «Chụp bù», biên nhận hai phần. Lưu ở `docs/evidence/2026-10-18-so-dai-ly-dot-2/`.
- [ ] **Step 3: Trợ giúp theo vai:**
  - Kế toán: Chụp bù, ghi mức tay cho đơn đã có bản chụp thiếu mức, Bên kia đã nhận.
  - HDV: khai khách trả cho đại lý.
  - **Không nới trần chữ**; cần chỗ thì rút câu cũ.
- [ ] **Step 4:** `npm test`, `typecheck` xanh.
- [ ] **Step 5: Commit** — «Giao diện sổ đại lý đợt 2: khai khách trả đại lý / tại quầy, Chụp bù, Bên kia đã nhận».

### Task 13: Thử đầu–cuối

**Files:** Create `tests/e2e/so-dai-ly-dot-2.mjs`.

- [ ] **Step 1: Viết kịch bản.** Năm ca:
  1. C-1 trọn đường tới «Hoàn thành» bằng nộp / trả từng đơn.
  2. SV-HT-03 có lời khai: HDV khai → đơn hiện ở ô chờ của Kế toán → giữ «đang đối chiếu» → Kế toán xác nhận → «Đã giao» → Tour Đảo nợ i-resort 80.000.
  3. Đơn khách lẻ thường.
  4. Đơn đại lý chưa chụp: bị giữ → Kế toán cài mức + «Chụp bù» → «Đã giao».
  5. Đối tác và Bán hàng mở đơn: không lộ tên, không lộ số dư nhà cung cấp.
- [ ] **Step 2: Chạy** `npm run test:e2e -- so-dai-ly-dot-2 so-dai-ly so-tien coc-don-huy nhap-tay-va-gia-doi-tac khoa-thang` (cần mạng). Cuối cùng chạy `audit-invariants` local: thoát 0.
- [ ] **Step 3: Commit** — «Kịch bản đầu–cuối sổ đại lý đợt 2».

### Task 14: Tài liệu, runbook, kiểm độc lập toàn nhánh

**Files:**
- **Tài liệu mô tả:** `docs/SYSTEM-DESIGN.md` (§5–§8), `docs/CHANGE-GUIDE.md`, `docs/SO-HANG-RAO.md`.
- **`docs/BACKLOG.md`:**
  - đóng: BL-SDL-DOT-2 (1)(3)(4), BL-VA-RAO-K3, BL-SDL-GIA-DAI-LY-AM nếu đã giải;
  - ghi nợ mới.
- **Nhật ký thay đổi:** mục 2.18 tạm, lời thường.
- **`docs/HANDOFF-N1.md`** (mục chuẩn bị phát hành):
  1. Điều kiện: diễn tập khôi phục (HC-5.19) đã xong, hoặc chủ ghi rõ chấp nhận rủi ro.
  2. Trước phát hành: chạy câu đếm Task 0.
  3. Phát hành: `trien-khai` (có migration nên có điểm Time Travel).
  4. Ngay sau đó: câu đếm (sau) phải bằng số b1; rồi `audit-invariants --db remote`.
  5. **Đường lùi:** `wrangler rollback` không gỡ trigger `0111`; đơn khách lẻ có dòng nhập tay sẽ gặp lỗi chưa dịch. Xử lý bằng một migration mới bỏ trigger lớp 2, không sửa tệp đã áp.

- [ ] **Step 1:** Rà lịch sử đơn của Đối tác: hai hành động nhật ký mới (`ord_terms_backfilled`, `ledger_counterparty_confirmed`) phải nằm trong danh sách ẩn của `src/shared/lich-su-doi-tac.ts`; thêm ca kiểm.
- [ ] **Step 2:** Cập nhật tài liệu mô tả cùng commit với mã nếu chưa làm.
- [ ] **Step 3:** `npm test`, `npm run typecheck`, e2e (Task 13) xanh; ghi số bài vào sổ thi công.
- [ ] **Step 4:** Giao người kiểm độc lập chỉ-đọc đọc toàn nhánh, chạy lại lệnh, phá thử các hàng rào. Chỉ báo «đạt» dựa trên báo cáo đó.
- [ ] **Step 5:** Báo điều phối:
  - nhánh, commit cuối;
  - lệnh `day-len` / `trien-khai` cho chủ (không tự chạy);
  - việc chủ / Kế toán còn lại: ca vàng, mức cho đơn chưa chụp, ghi tay cho đơn b3, danh sách b1x.
