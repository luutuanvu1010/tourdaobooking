# Công tắc «Khách của đối tác trả cho Công ty» và «Trả sau theo dịch vụ» — kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toàn quyền tắt được kênh Công ty nhận tiền khách của đơn đối tác tự lập (Phần A), và đánh dấu nhóm/dịch vụ «Trả sau theo dịch vụ» cho đối tác được hưởng trả sau không cần hạn mức (Phần B).

**Architecture:** Hai bảng cài đặt chỉ thêm của `billing`; `orders` chụp dấu công tắc lúc lập và loại Trả sau lúc xác nhận, công bố qua view `v_ord_*`. Một hàm cổng của `billing` canh mọi đường chèn khoản thu; cổng Trả sau sẵn có (`kiemTraSau`, `traSauChoXacNhan`) nhận thêm nhánh «theo dịch vụ». `orders` không đọc `bil_*`: mọi thứ qua hàm do gốc lắp ráp tiêm (`src/shared/router.ts`).

**Tech Stack:** TypeScript, Cloudflare Workers + D1, `node --test`, esbuild, giao diện thuần (`h()`).

**Spec:** `docs/superpowers/specs/2026-11-06-thu-tien-doi-tac-va-tra-sau-theo-dich-vu-design.md` · **ADR:** `docs/adr/ADR-0178-cong-tac-khach-doi-tac-tra-cong-ty-va-tra-sau-theo-dich-vu.md` (accepted). Lệch: ADR thắng, rồi đặc tả, rồi kế hoạch này.

## Global Constraints

- Việc lớn (tiền, quyền, dữ liệu): mỗi Phần xong phải có `nguoi-kiem-doc-lap` đọc mã thật; người thi công không tự nghiệm thu (`CLAUDE.md` §3).
- Tiền `INTEGER` VNĐ; số giờ nguyên, thời hạn trả 1..`GIO_TOI_DA` (8760), ân hạn 0..8760 (`kiemSoGio` ở `src/shared/tra-sau.ts`).
- Dấu thời gian ISO UTC bằng `toISOString()`; ngày dân sự `vnToday`.
- Không xoá cứng; bảng cài đặt chỉ thêm, hiệu lực theo `valid_from`/`valid_to`.
- Migration: chỉ thêm tệp mới. Số tạm = số lớn nhất của **mọi nhánh** + 1 (hôm nay `0142`, `0143` đã dùng ⇒ Phần A `0144`, Phần B `0145`); người nhập sau đổi số theo `docs/adr/README.md`. Trigger khoá «Đã giao» phải liệt kê mọi cột của `orders` (bài `src/migrations-orders-da-giao.test.ts`).
- Chữ giao diện, câu lỗi: tiếng Việt có dấu, tên theo `docs/BANG-THAM-CHIEU.md`. Hai tên chủ đã chọn: **«Khách của đối tác trả cho Công ty»** (công tắc; Bật/Tắt), **«Trả sau theo dịch vụ»** (dấu). Thêm vào nguồn `src/shared/bang-tham-chieu*.ts` bằng Edit, `npm run` lệnh sinh bảng có sẵn.
- Không `innerHTML`; ô gõ 16px; giá trị CSS qua token.
- Nhật ký khai ở `src/shared/audit-actions.ts`, không ghi SĐT/email/MST.
- Ô quyền mới khai ở `src/shared/permissions.ts`; đổi công tắc và đánh dấu dùng `chiToanQuyen()`; xem dùng `row(...)` cho Toàn quyền, Kế toán, Quản trị.
- Phát hành: chủ cho **lên trước diễn tập** (`docs/quyen-hoan.json`, khoá `xay_tren_cho_phep_adr_0178`).
- Phần B chỉ bắt đầu sau khi nhánh `claude/festive-payne-7371a2` (ADR-0177) đã nhập `main` hoặc bị bỏ; trước khi bắt đầu, nhập `main` mới nhất vào nhánh thi công.

## Review Focus

1. Đơn nháp tạo lúc Bật, gửi/xác nhận sau lúc Tắt: phải giữ dấu Bật (Task A1 có bài).
2. Đơn mang dấu Tắt, văn phòng đổi bên đặt sau xác nhận, rồi đối tác ghi «Tôi thu»: phải qua, và bất biến không đỏ (Task A3 có bài).
3. Đối tác không có hạn mức, có một đơn Trả sau theo dịch vụ hết ân hạn: lỗi phải là `co_don_qua_han`, không phải `khong_co_han_muc` (Task B2 có bài).
4. Quản trị chuyển dịch vụ ra khỏi nhóm có dấu sau khi đơn đã xác nhận: hạn trả, loại Trả sau không đổi; nhưng sửa đơn thêm chính dịch vụ đó lần nữa thì 409 (Task B3 có bài).
5. Hai tab Toàn quyền cùng đổi công tắc: dòng sau cùng thắng, cả hai có nhật ký, không có hai dòng hiệu lực chồng nhau (Task A2 có bài).

---

## Phần A — Công tắc «Khách của đối tác trả cho Công ty»

### Task A1: Dữ liệu — bảng công tắc, dấu trên đơn, chụp lúc lập

**Files:**
- Create: `migrations/0144_kenh_thu_doi_tac.sql`
- Modify: `src/modules/orders/repository.ts` (câu `INSERT INTO orders` ~dòng 1010), `src/modules/orders/index.ts` (route `POST /api/orders` và lưu nháp đầu), `src/shared/router.ts` (ctx tiêm), `src/index.ts` (lắp ráp), `docs/data-dictionary.json` rồi `npm run dict`
- Test: `src/migrations-kenh-thu.test.ts`, `src/modules/orders/kenh-thu-chup.test.ts`

**Interfaces:**
- Produces: bảng `bil_partner_channel_setting(id TEXT PK, company_collects INTEGER NOT NULL CHECK IN (0,1), valid_from TEXT NOT NULL, valid_to TEXT NULL, created_at, created_by)`; cột `orders.company_collects_snapshot INTEGER NULL CHECK (IS NULL OR IN (0,1))` (NULL = đơn không do tài khoản Đối tác lập); trigger `orders_company_collects_locked` (BEFORE UPDATE OF cột đó → RAISE); trigger khoá «Đã giao» tạo lại có cột mới; view `v_ord_kenh_thu AS SELECT id, staff_id, company_collects_snapshot FROM orders`.
- Produces: `ctx.kenhThuHienTai: () => Promise<0 | 1 | null>` (billing tiêm; `null` = không đọc được ⇒ route lập đơn của tài khoản Đối tác trả 503, không đoán).

- [ ] **Step 1: Bài migration đỏ** — `src/migrations-kenh-thu.test.ts` áp mọi migration vào SQLite bộ nhớ (khuôn của `src/migrations-orders-da-giao.test.ts`), khẳng định: chèn đơn có `company_collects_snapshot = 0` rồi `UPDATE … SET company_collects_snapshot = 1` → lỗi chứa `company_collects_locked`; `UPDATE` cột này sau `delivered_at` cũng lỗi; giá trị 2 bị `CHECK` chặn.
- [ ] **Step 2: Chạy** `node --test src/migrations-kenh-thu.test.ts` → FAIL (chưa có tệp migration).
- [ ] **Step 3: Viết `migrations/0144_kenh_thu_doi_tac.sql`** theo Interfaces; thêm bảng/cột/view vào `docs/data-dictionary.json`, chạy `npm run dict`.
- [ ] **Step 4: Bài chụp đỏ** — `kenh-thu-chup.test.ts` (khung thử route của `orders`): tài khoản Đối tác lập đơn khi `kenhThuHienTai` trả 0 ⇒ cột = 0; trả 1 ⇒ 1; văn phòng lập ⇒ NULL; `kenhThuHienTai` trả null ⇒ 503 `kenh_thu_chua_doc_duoc`; lưu nháp lại (PUT) không đổi cột; nháp tạo lúc 1, sau đó `kenhThuHienTai` trả 0 rồi gửi xác nhận ⇒ cột vẫn 1 (Review Focus 1).
- [ ] **Step 5: Cài** — route lập đơn gọi `ctx.kenhThuHienTai()` chỉ khi `holdsPartner(staff)`, truyền giá trị vào câu `INSERT INTO orders`; đường «huỷ để lập lại» (ADR-0089) chụp lại theo người lập đơn mới.
- [ ] **Step 6: Chạy** hai tệp bài + `node --test src/architecture.test.ts src/migrations-orders-da-giao.test.ts` → PASS; `npm run typecheck` 0 lỗi.
- [ ] **Step 7: Commit** `Kênh thu đối tác: bảng công tắc, dấu chụp lúc lập trên đơn (ADR-0178 Đ1 mục 1)`.

### Task A2: Công tắc — route, ô quyền, nhật ký

**Files:**
- Create: `src/modules/billing/kenh-thu.ts` (luật đọc/ghi công tắc + hàm cổng ở Task A3), `src/modules/billing/kenh-thu-repo.ts` (SQL)
- Modify: `src/modules/billing/index.ts` (route), `src/shared/permissions.ts`, `src/shared/audit-actions.ts`, `src/shared/contracts.ts`, `src/index.ts` (tiêm `kenhThuHienTai`)
- Test: `src/modules/billing/kenh-thu.test.ts`

**Interfaces:**
- Produces: ô `billing.partner_channel.write` = `chiToanQuyen()`; ô `billing.partner_channel.view` = Toàn quyền, Kế toán, Quản trị `any`, còn lại `none`.
- Produces: `GET /api/kenh-thu-doi-tac` (`office`) → `KenhThuDoiTacDto { congTyThu: boolean; tuLuc: string | null; lichSu: { congTyThu: boolean; tuLuc: string; nguoiDoi: string }[] }`; `POST /api/kenh-thu-doi-tac` (`office`) thân `{ congTyThu: boolean }` → 200 `KenhThuDoiTacDto`.
- Produces: nhật ký `partner_channel_set`, nhãn «Đổi «Khách của đối tác trả cho Công ty»», `detail` = «Bật» / «Tắt».
- Produces: `kenhThuHienTai(db: D1Database): Promise<0 | 1>` (không có dòng nào ⇒ 1, mặc định Bật).

- [ ] **Step 1: Bài đỏ** — `kenh-thu.test.ts`: chưa có dòng ⇒ `kenhThuHienTai` = 1; Toàn quyền POST `{congTyThu:false}` ⇒ 200, dòng cũ có `valid_to`, dòng mới hiệu lực, một dòng nhật ký `partner_channel_set`; Quản trị, Kế toán, Bán hàng, Đối tác POST ⇒ 403; thân sai kiểu ⇒ 400; hai POST liền nhau ⇒ đúng một dòng có `valid_to IS NULL` (Review Focus 5); POST trùng giá trị đang có ⇒ 200, không thêm dòng.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài** — đóng dòng cũ và mở dòng mới trong MỘT `db.batch` có câu gác (đóng dòng đang mở `WHERE valid_to IS NULL` rồi chèn khi `changes()` đúng), khuôn bảng cài đặt công nợ ADR-0173 Đ1 ở `tra-sau-repo.ts`.
- [ ] **Step 4: Chạy** bài + `node --test src/permission-enforcement.test.ts src/route-access.test.ts` → PASS (ô mới phải được máy chủ hỏi).
- [ ] **Step 5: Commit** `Kênh thu đối tác: route đổi công tắc chỉ Toàn quyền (ADR-0178 Đ3)`.

### Task A3: Cổng người thu ở mọi đường ghi tiền + lớp CSDL

**Files:**
- Create: `src/shared/kenh-thu-doi-tac.ts` (luật thuần, dùng chung giao diện), `src/kenh-thu-noi-goi.test.ts` (bài quét)
- Modify: `src/modules/billing/kenh-thu.ts`, `service.ts` (ghi khoản thu trước giao; khoản thu kèm `/delivered`), `thay-lan-thu.ts` (gồm lối «Ghi khoản thu đòi được» của `phan-dinh.ts`), `coc.ts` (`/coc/chuyen`, nửa thu ở đơn nhận), `dat-coc.ts` (khoản cọc lúc xác nhận — kiểm TRƯỚC lô), `src/modules/receipt/index.ts` (QR), `migrations/0144_kenh_thu_doi_tac.sql` (trigger)
- Test: `src/shared/kenh-thu-doi-tac.test.ts`, `src/modules/billing/kenh-thu-cong.test.ts`

**Interfaces:**
- Produces (thuần): `nguoiThuHopLeKenhTat(i: { dauDon: 0 | 1 | null; nguoiLapPartyId: string | null; collectorPartyId: string }): { ok: true } | { ok: false; ma: "kenh_thu_chi_nguoi_lap" | "kenh_thu_chua_gan_ho_so"; cau: string }`. `dauDon !== 0` ⇒ ok. Câu: `kenh_thu_chi_nguoi_lap` = «Đơn này chỉ nhận tiền khách trả cho đối tác đã lập đơn. Công ty không nhận tiền khách của đơn này.»; `kenh_thu_chua_gan_ho_so` = «Tài khoản lập đơn chưa gắn hồ sơ nên chưa ghi được khoản thu. Nhờ văn phòng gắn hồ sơ.»
- Produces (billing): `kiemNguoiThuKenh(db: D1Database, orderId: string, collectorPartyId: string): Promise<Response | null>` — đọc `v_ord_kenh_thu` + hồ sơ người lập (view hồ sơ nhân viên sẵn có, cùng nguồn `hoSoNhanVien` ở `dat-coc.ts`); `null` = qua; 409 với `ma` ở trên.
- Produces: trigger `bil_receipt_partner_channel` BEFORE INSERT ON `bil_payment_receipt` WHEN `kind_code = 'CUSTOMER_PAYMENT' AND reverses_id IS NULL` và đơn có `company_collects_snapshot = 0` và `collector_party_id` khác hồ sơ người lập ⇒ RAISE `partner_channel_collector`.

- [ ] **Step 1: Bài thuần đỏ** — `kenh-thu-doi-tac.test.ts`: (null|1, bất kỳ) ⇒ ok; (0, "P1", "P1") ⇒ ok; (0, "P1", "CONGTY") ⇒ `kenh_thu_chi_nguoi_lap`; (0, null, "P1") ⇒ `kenh_thu_chua_gan_ho_so`.
- [ ] **Step 2: Bài route đỏ** — `kenh-thu-cong.test.ts` trên đơn dấu 0 do Đối tác P1 lập: `POST /api/orders/:id/payments` với `nguoiThu: "cong_ty"` ⇒ 409; quầy nhà cung cấp ⇒ 409; Kế toán ghi người thu nhân viên khác ⇒ 409; Đối tác «toi» ⇒ 201; bên đặt là khách lẻ, Đối tác «toi» ⇒ 201; văn phòng đổi bên đặt (`PUT /api/orders/:id/booker`) rồi Đối tác «toi» ⇒ 201 (Review Focus 2); `/delivered` kèm khoản thu Công ty ⇒ 409, đơn không sang «Xong và đủ tiền»; `receipt-replacements` đổi người thu sang Công ty ⇒ 409; phân định «ghi khoản thu đòi được» ⇒ 409; `/coc/chuyen` từ người giữ khác P1 vào đơn này ⇒ 409; xác nhận đơn có khai cọc khi người lập chưa gắn hồ sơ ⇒ 409, đơn vẫn chưa xác nhận, không có khoản thu; đảo khoản thu, `/api/ledger/refunds`, `/coc/chi` ⇒ vẫn chạy; `GET /api/orders/:id/qr-thanh-toan` ⇒ trả `{ coQr: false }` (giữ dạng DTO hiện có, thêm trường nếu cần). Đơn dấu 1 và đơn NULL: các ca trên cư xử như hôm nay.
- [ ] **Step 3: Bài quét đỏ** — `kenh-thu-noi-goi.test.ts`: mọi tệp `src/modules/billing/*.ts` (trừ `*.test.ts`) gọi một trong `receiptBeforeDeliveredStatement`, `receiptAtDeliveryStatement`, `receiptOnConfirmStatement`, `receiptThayMoiStatement`, câu chèn của `coc-repo.ts` thì cũng phải gọi `kiemNguoiThuKenh(`, trừ danh sách miễn ghi tên: `receiptRefundStatement`, `receiptReversalStatement`, câu chi hoàn cọc, câu hoàn sau phân định. Thêm tên hàm chèn mới mà không phân loại ⇒ đỏ.
- [ ] **Step 4: Chạy** ba tệp → FAIL.
- [ ] **Step 5: Cài** — gọi `kiemNguoiThuKenh` ở mỗi đường «chặn» TRƯỚC khi dựng lô; viết trigger vào `0144`; QR route trả không QR khi dấu 0.
- [ ] **Step 6: Thử phá lớp CSDL** — tạm bỏ lời gọi ở `service.ts`, chạy bài route: phải đỏ vì trigger (lỗi `partner_channel_collector`); hoàn nguyên.
- [ ] **Step 7: Chạy** ba tệp + `node --test src/modules/billing/*.test.ts` → PASS.
- [ ] **Step 8: Commit** `Kênh thu đối tác: chỉ người lập đơn thu ở đơn mang dấu Tắt, mọi đường ghi tiền (ADR-0178 Đ1 mục 2)`.

### Task A4: Bất biến dữ liệu và sổ hàng rào

**Files:**
- Modify: `scripts/audit-checks.mjs`, `docs/SO-HANG-RAO.md`
- Test: `src/audit-invariants.test.ts`

**Interfaces:**
- Produces: mã bất biến `R-KT-1` «Đơn mang dấu Tắt có khoản khách trả còn hiệu lực với người thu khác người lập».

- [ ] **Step 1: Bài đỏ** — trong `audit-invariants.test.ts`: dữ liệu sạch ⇒ `R-KT-1` không báo; chèn thẳng (tắt trigger bằng DB thử không có trigger) một khoản Công ty thu vào đơn dấu 0 ⇒ báo đúng mã đơn; khoản đó bị đảo ⇒ không báo.
- [ ] **Step 2: Chạy** `node --test src/audit-invariants.test.ts` → FAIL.
- [ ] **Step 3: Cài** câu kiểm chỉ đọc trong `scripts/audit-checks.mjs`.
- [ ] **Step 4: Chạy** → PASS. Thêm hai dòng `docs/SO-HANG-RAO.md` (trigger `bil_receipt_partner_channel`, bất biến `R-KT-1`, bài quét nơi gọi) kèm ngày quan sát chặn thật ở Task A3 Step 6 và Step 1 này.
- [ ] **Step 5: Commit** `Kênh thu đối tác: bất biến R-KT-1 và dòng sổ hàng rào`.

### Task A5: Giao diện và chữ

**Files:**
- Modify: `src/shared/ben-kia-hien-thi.ts` (`luaChonNguoiThu`), `src/shared/contracts.ts` (`OrderPaymentsResponse` thêm `kenhThu: { congTyThu: boolean; nguoiLapTen: string | null; nguoiLapLaBenDatHuong: boolean } | null`), `src/modules/billing/index.ts` (điền trường đó), `web/order.ts` (khối ghi khoản thu), chỗ hiện QR ở `web/`, `web/o-tra-sau.ts` (thẻ công tắc ở màn Cấp độ đại lý), `src/shared/bang-tham-chieu*.ts`, `src/shared/huong-dan-doi-tac.ts` (bài hướng dẫn), `src/shared/changelog.ts`
- Test: `src/shared/ben-kia-hien-thi.test.ts`, kịch bản Chrome theo bảng ở `web/CLAUDE.md`

**Interfaces:**
- Consumes: `KenhThuDoiTacDto`, route A2.
- Produces: `luaChonNguoiThu(benKia, kenhThu?: OrderPaymentsResponse["kenhThu"], laDoiTac?: boolean): LuaChon[]` — `kenhThu?.congTyThu === false`: Đối tác ⇒ `[{value:"toi", nhan:"Tôi thu"}]`; văn phòng và `nguoiLapLaBenDatHuong` ⇒ `[{value:"ben_dat", nhan:\`Khách trả cho đại lý ${ten}\`}]`; văn phòng còn lại ⇒ `[]` và khối hiện câu «Đối tác lập đơn tự ghi khoản thu của đơn này.».

- [ ] **Step 1: Bài đỏ** — `ben-kia-hien-thi.test.ts` ba ca trên + ca `kenhThu` null/Bật giữ hai dòng đầu như cũ.
- [ ] **Step 2: Chạy** → FAIL. **Step 3: Cài.** **Step 4: Chạy** → PASS; `npm run build:web`; `npm run typecheck`.
- [ ] **Step 5: Kịch bản Chrome** — tài khoản Đối tác và văn phòng mở đơn dấu Tắt: đúng một/không lựa chọn, biên nhận không QR; Toàn quyền thấy thẻ công tắc, người khác không thấy nút. Trang của tài khoản nào mở SAU CÙNG (chung kho cookie). Ảnh lưu `docs/evidence/2026-11-xx-kenh-thu/`.
- [ ] **Step 6: Commit** `Kênh thu đối tác: giao diện công tắc, ô người thu, ẩn QR`.

### Task A6: Kiểm Phần A

- [ ] `npm test`, `npm run typecheck`, `npm run test:e2e` (một lần, cuối Phần A).
- [ ] Giao `nguoi-kiem-doc-lap`: đọc ADR-0178 Đ1, Đ3, bảng đường ghi tiền của đặc tả, rồi mã Phần A; tự grep lại mọi nơi chèn `bil_payment_receipt`.
- [ ] Cập nhật `docs/SYSTEM-DESIGN.md` (§5, §7), `docs/CHANGE-GUIDE.md` (bẫy: thêm đường ghi khoản thu phải gọi `kiemNguoiThuKenh`), sổ thi công.

---

## Phần B — «Trả sau theo dịch vụ»

### Task B1: Dữ liệu — bảng dấu, loại Trả sau trên đơn

**Files:**
- Create: `migrations/0145_tra_sau_theo_dich_vu.sql`
- Modify: `docs/data-dictionary.json` + `npm run dict`
- Test: `src/migrations-tra-sau-dich-vu.test.ts`

**Interfaces:**
- Produces: bảng `bil_service_credit_rule(id TEXT PK, target_kind TEXT NOT NULL CHECK IN ('GROUP','SERVICE'), target_code TEXT NOT NULL, due_hours INTEGER NOT NULL CHECK BETWEEN 1 AND 8760, grace_hours INTEGER NOT NULL CHECK BETWEEN 0 AND 8760, valid_from TEXT NOT NULL, valid_to TEXT NULL, created_at, created_by)`, chỉ mục duy nhất một dòng mở cho mỗi `(target_kind, target_code)`; dòng «gỡ dấu» = đóng dòng mở, không chèn dòng mới.
- Produces: cột `orders.credit_basis TEXT NULL` (NULL với `PREPAID`; `'LIMIT'` | `'SERVICE'` với `CREDIT`; kiểm giá trị ở mã, ADR-0168 khuôn); trigger cấm đổi sau khi khác NULL; trigger khoá «Đã giao» có cột mới; `v_ord_don_tra_sau` tạo lại thêm `credit_basis`. Đơn `CREDIT` cũ: `UPDATE orders SET credit_basis = 'LIMIT' WHERE payment_term = 'CREDIT'` trong migration.

- [ ] **Step 1: Bài đỏ** (hai dòng mở cùng đích ⇒ lỗi; `due_hours` 0 ⇒ lỗi; đổi `credit_basis` từ `'SERVICE'` ⇒ lỗi; đơn `CREDIT` cũ có `'LIMIT'` sau migration). **Step 2:** FAIL. **Step 3:** viết migration + từ điển. **Step 4:** PASS cùng `src/migrations-orders-da-giao.test.ts`. **Step 5: Commit** `Trả sau theo dịch vụ: bảng dấu và loại Trả sau trên đơn (ADR-0178 Đ2)`.

### Task B2: Luật thuần và cổng `billing`

**Files:**
- Modify: `src/shared/tra-sau.ts`, `src/modules/billing/tra-sau.ts`, `src/modules/billing/tra-sau-repo.ts`, `src/shared/router.ts` (kiểu `kiemTraSau`), `src/index.ts`
- Test: `src/shared/tra-sau.test.ts`, `src/modules/billing/tra-sau.test.ts`

**Interfaces:**
- Produces (thuần): `type CoSoTraSau = "LIMIT" | "SERVICE"`; `interface DauDichVu { targetKind: "GROUP" | "SERVICE"; targetCode: string; gioTra: number; gioAnHan: number }`; `dauCuaDon(dichVu: readonly { catalogCode: string | null; groupCode: string | null }[], dau: readonly DauDichVu[]): { gioTra: number; gioAnHan: number } | null` — `null` khi đơn rỗng, có dòng `catalogCode` null (nhập tay), hoặc một dịch vụ không có dấu riêng lẫn dấu nhóm; số giờ = nhỏ nhất (dấu dịch vụ thắng dấu nhóm của chính dịch vụ đó).
- Changes: `lyDoKhongTraSau(i: { coSo: CoSoTraSau; hanMuc: HanMucHieuLuc | null; noHanMuc: number; soTienDon: number; coDonQuaHan: boolean })` — kiểm `coDonQuaHan` TRƯỚC; `coSo === "SERVICE"` bỏ qua hạn mức.
- Changes: `KetQuaKiemTraSau = { ok: true; coSo: CoSoTraSau; gio: { gioTra: number; gioAnHan: number }; version: number } | { ok: false; ma: MaKhongTraSau | "tra_sau_dich_vu_khong_du"; cau: string }` (bỏ `hanMuc` khỏi nhánh ok; nơi đọc `r.kq.hanMuc` ở `orders/tra-sau-cong.ts` đổi sang `r.kq.gio`).
- Changes: `NoBenDat { tongHanMuc: number; tongDichVu: number; don: (DonNo & { coSo: CoSoTraSau })[]; coDonQuaHan: boolean }` (`coDonQuaHan` tính trên cả hai loại); mọi nơi đọc `tong` đổi theo, cổng ngừng hồ sơ (`benCoDonTraSau`) tính cả hai.
- Changes: `kiemTraSau(db, i: { benDat: string; soTienDon: number; dichVu: readonly { catalogCode: string | null; groupCode: string | null }[]; boQuaDon?: string; bayGio?: string })` — bên đặt không mang loại đối tác được hưởng ⇒ chỉ xét nhánh `LIMIT` như hôm nay; mang loại được hưởng và `dauCuaDon` khác null ⇒ nhánh `SERVICE`; không thì `LIMIT`. Nhóm hiện tại đọc qua `v_ctl_service_group` (chủ chọn «theo nhóm hiện tại»).

- [ ] **Step 1: Bài thuần đỏ** — `dauCuaDon`: mọi dịch vụ có dấu nhóm (24h, 48h) ⇒ `{gioTra:24,…}`; một dịch vụ có dấu riêng 12h trong nhóm 48h ⇒ 12; một dịch vụ không dấu ⇒ null; dòng nhập tay ⇒ null; đơn rỗng ⇒ null. `lyDoKhongTraSau({coSo:"SERVICE", hanMuc:null, coDonQuaHan:true,…})` ⇒ `co_don_qua_han` (Review Focus 3); `({coSo:"SERVICE", hanMuc:null, coDonQuaHan:false})` ⇒ null; `({coSo:"LIMIT", hanMuc:{hanMuc:10_000_000…}, noHanMuc:10_000_000, soTienDon:1})` ⇒ `vuot_han_muc`.
- [ ] **Step 2: Bài billing đỏ** — đối tác có hạn mức 10.000.000 ₫ đang nợ đủ (đơn `LIMIT`), đơn mới toàn dịch vụ có dấu ⇒ ok `SERVICE`, `tongHanMuc` không đổi sau khi xác nhận; khách lẻ bên đặt, toàn dịch vụ có dấu ⇒ `khong_co_han_muc`; đơn `SERVICE` hết ân hạn còn nợ ⇒ đơn `LIMIT` mới cũng `co_don_qua_han`.
- [ ] **Step 3:** FAIL. **Step 4: Cài.** **Step 5:** PASS cùng mọi `src/modules/billing/tra-sau*.test.ts` và `src/tra-sau-duong-ghi.test.ts`; `npm run typecheck`.
- [ ] **Step 6: Commit** `Trả sau theo dịch vụ: luật thuần, cổng hạn mức tách hai loại nợ`.

### Task B3: Đánh dấu, xác nhận và sửa đơn

**Files:**
- Modify: `src/modules/billing/index.ts` (route dấu), `src/shared/permissions.ts`, `src/shared/audit-actions.ts`, `src/shared/contracts.ts`, `src/modules/orders/tra-sau-cong.ts`, `src/modules/orders/xac-nhan-chung.ts`, các đường sửa đơn đã qua `congSuaTangTraSau` (sửa đơn, sửa số khách)
- Test: `src/modules/billing/tra-sau-dau.test.ts`, `src/modules/orders/tra-sau-dich-vu.test.ts`

**Interfaces:**
- Produces: ô `credit.service_rule.write` = `chiToanQuyen()`; `credit.service_rule.view` = Toàn quyền, Kế toán, Quản trị.
- Produces: `GET /api/tra-sau/dich-vu` → `{ dau: { targetKind; targetCode; ten: string; gioTra; gioAnHan; tuLuc: string; coVeHangNgoai: boolean | null }[] }`; `POST /api/tra-sau/dich-vu` thân `{ targetKind, targetCode, gioTra, gioAnHan }`; `POST /api/tra-sau/dich-vu/go` thân `{ targetKind, targetCode }`. Nhật ký `service_credit_rule_set`, `service_credit_rule_removed`. `coVeHangNgoai` = null khi chưa có dữ liệu ADR-0174/0175 trên `main`.
- Changes: `DonTraSau` thêm `dichVu: { catalogCode: string | null; groupCode: string | null }[]`; `traSauChoXacNhan` ghi `credit_basis = r.kq.coSo` cùng hai mốc giờ trong câu `UPDATE` có lính gác `auditId` hiện có.
- Produces: lỗi sửa đơn `409 tra_sau_dich_vu_khong_dau` «Đơn trả sau theo dịch vụ chỉ nhận dịch vụ có dấu Trả sau theo dịch vụ. Bỏ dịch vụ này, hoặc huỷ đơn và lập lại với hình thức khác.»

- [ ] **Step 1: Bài đỏ** — `tra-sau-dau.test.ts`: Toàn quyền đặt/gỡ dấu được, người khác 403, `gioTra` 0 hoặc 8761 ⇒ 400, dịch vụ có vé hãng ngoài vẫn 200 (chỉ cờ cảnh báo trong DTO). `tra-sau-dich-vu.test.ts`: tiêu chí 9–16 của đặc tả; Quản trị chuyển dịch vụ ra khỏi nhóm có dấu sau xác nhận ⇒ `credit_due_at`, `credit_basis` của đơn không đổi, sửa đơn thêm lại dịch vụ đó ⇒ 409 (Review Focus 4); hai xác nhận song song vẫn một thắng (`credit_version_stale`).
- [ ] **Step 2:** FAIL. **Step 3: Cài.** **Step 4:** PASS + `node --test src/permission-enforcement.test.ts src/tra-sau-duong-ghi.test.ts`.
- [ ] **Step 5: Commit** `Trả sau theo dịch vụ: đánh dấu chỉ Toàn quyền, xác nhận và sửa đơn (ADR-0178 Đ2, Đ3)`.

### Task B4: Giao diện, chữ, kiểm Phần B

**Files:**
- Modify: `web/order-form.ts` (khối Trả sau hiện khi đủ điều kiện; câu số giờ), `web/catalog-kiem-ve.ts` hoặc màn Dịch vụ cạnh ô «Có vé» (đặt/gỡ dấu, cảnh báo vé hãng ngoài), `web/o-tra-sau.ts` và màn nợ của đối tác (hai số «Đang nợ theo hạn mức», «Đang nợ Trả sau theo dịch vụ»), màn nhóm dịch vụ (báo khi nhóm đích có dấu), `src/shared/bang-tham-chieu*.ts`, `src/shared/huong-dan-doi-tac.ts`, `src/shared/changelog.ts`
- Test: bài thuần cạnh tệp `src/shared/` được sửa; `tests/e2e/tra-sau.mjs` thêm phần «theo dịch vụ»; kịch bản Chrome

- [ ] **Step 1:** bài thuần đỏ cho hàm quyết hiện khối Trả sau (`hienKhoiTraSau({ coHanMuc, duDieuKienDichVu })`) và nhãn hai số nợ. **Step 2:** FAIL → cài → PASS.
- [ ] **Step 3:** e2e: đối tác không hạn mức đặt đơn toàn dịch vụ có dấu, xác nhận, vé mở, quá hạn chặn đơn mới.
- [ ] **Step 4:** Kịch bản Chrome (Đối tác, văn phòng, Toàn quyền; trang tài khoản nào mở sau cùng). Ảnh vào `docs/evidence/`.
- [ ] **Step 5:** `npm test`, `npm run typecheck`, `npm run test:e2e` một lần; dòng `docs/SO-HANG-RAO.md` cho cổng mới kèm ngày quan sát chặn thật; cập nhật `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`.
- [ ] **Step 6:** Giao `nguoi-kiem-doc-lap` cho Phần B (ADR-0178 Đ2, Đ3; đặc tả mục Việc 2; mã Phần B).
- [ ] **Step 7: Commit** `Trả sau theo dịch vụ: giao diện, chữ, e2e`.
