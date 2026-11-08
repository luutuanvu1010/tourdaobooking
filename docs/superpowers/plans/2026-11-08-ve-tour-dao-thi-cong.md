# Vé Tour Đảo — kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tour Đảo tự tạo vé điện tử có QR cho dịch vụ của mình, giữ vé vào đơn, mở vé cho khách từ lúc xác nhận, và quét vé bằng điện thoại trong Nền tảng để biết vé đã dùng chưa.

**Architecture:** Dùng lại module `ve-dien-tu` (lô, vé, phân bổ, gửi, đường dẫn khách). Mỗi lô mang `source` (`HANG_NGOAI` / `TOUR_DAO`); mọi luật mở vé, giữ vé, quét, huỷ, quyền đọc `source` của lô, quyết **theo từng vé**. Ô «Vé do ai phát» là bảng chỉ thêm của `catalog`, cạnh ô «Có vé» (ADR-0174). Ảnh vé vẽ bằng canvas trên trình duyệt người tạo, gửi qua route nhập vé có sẵn. Quét là bảng chỉ thêm `vdt_scan` mới.

**Tech Stack:** TypeScript, Cloudflare Worker + D1 + R2, `node --test`, esbuild, giao diện thuần dựng bằng `h()`, `web/vendor/qrcode.js` (vẽ QR), `web/vendor/jsqr.cjs` (đọc QR, chỉ qua `web/qr-doc-ve.ts`).

**Spec:** `docs/adr/ADR-0175-ve-tour-dao-va-quet-ve.md` (accepted 2026-11-08, chuẩn tắc, thắng mọi văn bản dưới). Chi tiết cho người thi công: `docs/superpowers/specs/2026-11-05-ve-tour-dao-design.md` phần 2 (các câu gạch ngang là đã bị ADR thay, đừng làm theo). Danh sách màn: `docs/superpowers/specs/2026-11-05-ve-dien-tu-danh-sach-man.md`. Ô «Có vé»: ADR-0174.

## Global Constraints

- Mọi chữ giao diện, câu lỗi, tài liệu, commit: tiếng Việt CÓ DẤU; riêng tấm vé gửi khách in thêm dòng tiếng Anh nhỏ hơn bên dưới (ngoại lệ có tên của ADR-0175).
- Chữ nút, nhãn mới phải có trong `src/shared/bang-tham-chieu*.ts` (ADR-0167); sửa tệp bảng chỉ bằng công cụ Edit. Tên chờ chủ chọn ở Task 0.
- Mã vé (`ticket_code`, `TD1.…`) **không bao giờ** vào nhật ký, URL, phản hồi lệnh ghi, câu lỗi (ADR-0153 Đ1 mục 5). Phản hồi chỉ được 4 ký tự cuối.
- Dạng mã vé Tour Đảo: `TD1.` + đúng 26 ký tự base32 RFC 4648 (`A-Z2-7`), sinh bằng `crypto.getRandomValues` ở trình duyệt. Lô `TOUR_DAO` chỉ nhận dạng này; lô `HANG_NGOAI` từ chối tiền tố `TD1.`.
- Vé hãng ngoài: hành vi hiện hành **không đổi một chữ**; toàn bộ e2e `tests/e2e/ve-dien-tu.mjs` phải xanh nguyên.
- Không luật vé nào đọc `prc_supply_term` (Người bán dịch vụ).
- Không xoá cứng; bảng mới chỉ thêm (trigger cấm UPDATE/DELETE trừ cột dấu ghi một lần).
- Migration chỉ thêm tệp mới, số kế tiếp kiểm lại lúc tạo (`ls migrations`, cộng mọi nhánh chưa gộp); hôm 8/11 số trống là `0151`. Cột/bảng mới → `docs/data-dictionary.json` + `npm run dict`.
- Module vé không import `orders`/`billing`/`catalog`: mọi dữ liệu đơn, tiền, danh mục qua hàm tiêm ở `src/shared/router.ts` (gán ở `src/index.ts`) hoặc view `v_<tiền tố>_*`.
- Route ghi mới tự qua lớp chống ghi trùng ADR-0094; mỗi route POST mới tăng số ghim ở `src/lan-gui-phu-route.test.ts` kèm chú thích.
- Camera: chỉ `/quet-ve` có `camera=(self)`; mọi trang khác giữ `camera=()`.
- Sửa hành vi: bài đỏ trước, xanh sau. Việc lớn (dữ liệu, quyền, tiền): người kiểm độc lập chỉ đọc sau mỗi đợt.
- Điều kiện diễn tập khôi phục đã được chủ bỏ ngày 2026-11-08; vẫn giữ điểm khôi phục Time Travel của `npm run trien-khai`.

## Review Focus

1. **Đơn có cả vé hãng ngoài và vé Tour Đảo, chưa thu đủ:** tạo đường dẫn / gửi Zalo / xem ảnh không được đóng dấu `revealed_at` lên vé hãng ngoài; khách chỉ thấy vé Tour Đảo. (Task 7 có bài.)
2. **Đơn do tài khoản Đối tác lập, hoặc bên đặt là hồ sơ đối tác:** vé Tour Đảo vẫn chờ tiền như vé thường; đối tác không tự huỷ, không sửa số khách khi đơn có vé đã mở, kể cả chỉ vé Tour Đảo. (Task 7, Task 8.)
3. **Hai máy quét cùng một vé cùng lúc:** đúng một lượt `DA_TINH`; bên thua nhận «Đã dùng lúc … bởi …». (Task 12.)
4. **Quét vé hãng ngoài hoặc mã lạ:** cùng một câu đỏ, không ghi lượt, để không dò được mã Vinpearl. (Task 11, 12.)
5. **Người quét không có quyền xem đơn (Hướng dẫn viên, Tài xế công ty):** không nhận tên khách, số điện thoại, giá, mã đơn. (Task 12.)

---

## Task 0: Việc của chủ trước khi thi công (không có mã)

Gom một lần hỏi (CLAUDE.md §3). Hết giờ thì lấy phương án khuyến nghị; tất cả đảo ngược được.

- [ ] **Tên giao diện** (Hiến chương 5.27): khuyến nghị «Vé do ai phát», «Vé hãng ngoài», «Vé Tour Đảo», «Tạo vé», «Quét vé», «Bỏ lượt quét», «Đã dùng», «Đối chiếu vé». Ghi vào bảng tham chiếu ở task dùng tên đó.
- [ ] **Bước 0 — thử camera trên iPhone thật** làm ở đầu Task 14 (cần mã), không chặn Đợt 1.
- [ ] **An toàn giữa hai đợt (chạm tiền):** khuyến nghị — phát hành Đợt 1 nhưng **giữ mọi dịch vụ ở «Vé hãng ngoài»** tới khi Đợt 2 (quét) lên; chỉ chuyển dịch vụ sang «Vé Tour Đảo» khi đã quét được. Đây là mặc định sẵn, nên rủi ro chỉ bắt đầu khi có người gạt ô.
- [ ] Câu «Vé này không phải hóa đơn» vẫn chờ kế toán; Task 9 in đúng câu đó, đổi chữ sau không cần đổi mã khác ngoài hằng.

## Đợt 1 — Tạo vé, giữ vé, mở vé (một lần phát hành)

### Task 1: Migration nguồn vé

**Files:**
- Create: `migrations/0151_ve_tour_dao_nguon.sql` (số kiểm lại lúc làm)
- Modify: `docs/data-dictionary.json` (rồi `npm run dict`)
- Test: `src/modules/ve-dien-tu/migration.test.ts`, `src/modules/catalog/nguon-ve-repo.test.ts` (mới)

**Interfaces:**
- Produces: cột `vdt_batch.source TEXT NOT NULL DEFAULT 'HANG_NGOAI' CHECK (source IN ('HANG_NGOAI','TOUR_DAO'))`; trigger `vdt_batch_source_locked` (cấm đổi `source`); bảng `ctl_service_ticket_source (id, code, source, valid_from_at, created_at, created_by, updated_at, updated_by, UNIQUE(code, valid_from_at))` chỉ thêm (trigger cấm UPDATE, DELETE); view `v_ctl_service_ticket_source(code, source)` lấy dòng `valid_from_at` lớn nhất mỗi `code`.

- [ ] **Step 1: Bài đỏ** trong `migration.test.ts`: `test("0151: lô cũ là HANG_NGOAI, không đổi được source", …)` — chèn lô trước migration, áp migration, `assert.equal(row.source, "HANG_NGOAI")`; `UPDATE vdt_batch SET source='TOUR_DAO'` ném lỗi khớp `/vdt_one_way/`; chèn lô `source='KHAC'` ném lỗi CHECK. `test("0151: ctl_service_ticket_source chỉ thêm, view lấy dòng mới nhất", …)` — hai dòng cùng `code`, view trả dòng sau; UPDATE/DELETE ném lỗi.
- [ ] **Step 2:** `node --test src/modules/ve-dien-tu/migration.test.ts` → FAIL (chưa có cột).
- [ ] **Step 3:** Viết migration theo Interfaces; câu lỗi trigger bắt đầu bằng `vdt_one_way:` và `ctl_service_ticket_source_append_only:` như khuôn `0142_o_co_ve.sql`. Thêm hai mục từ điển dữ liệu (hạng dữ liệu: nội bộ).
- [ ] **Step 4:** Chạy lại bài + `npm run dict` + `node --test src/migrations-n1.test.ts` → PASS.
- [ ] **Step 5: Commit** «Thêm nguồn vé cho lô và ô Vé do ai phát (migration)».

### Task 2: Ô quyền tạo vé

**Files:**
- Modify: `src/shared/permissions.ts` (khối `ve.*` cạnh dòng `ve.kho.manage`)
- Test: `src/shared/permissions.test.ts` (đối tượng `ADR` và ba bài ghim nguyên dòng DRIVER, DRIVER_PARTNER, HR)

**Interfaces:**
- Produces (thứ tự cột `row(SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR, SALES_MANAGER)`):
  - `"ve.phat-hanh": row("none","any","any","none","none","any","none","none","none","none","any")`
  - Ba ô còn lại thêm cùng route của chúng, không thêm ở đợt này (bài `permission-enforcement` đòi mỗi ô có route hỏi): `ve.quet.tinh`, `ve.quet.xem` ở Task 12; `ve.doi-chieu.view` ở Task 15.

- [ ] **Step 1:** Thêm dòng vào `ADR` của bài ghim và vào ba bài ghim nguyên dòng → `node --test src/shared/permissions.test.ts` FAIL.
- [ ] **Step 2:** Thêm khoá vào `MATRIX` kèm chú thích `// ADR-0175 Đ1.3`.
- [ ] **Step 3:** `node --test src/shared/permissions.test.ts src/permission-enforcement.test.ts src/giao-dien-hoi-bang-quyen.test.ts` → PASS (ô này có route hỏi từ Task 4; nếu bài đòi route ngay thì gộp Task 2 vào Task 4).
- [ ] **Step 4: Commit** «Thêm ô quyền tạo vé Tour Đảo (ADR-0175)».

### Task 3: Ô «Vé do ai phát» ở Dịch vụ & giá

**Files:**
- Create: `src/shared/nguon-ve.ts` (+ `nguon-ve.test.ts`), `src/modules/catalog/nguon-ve-repo.ts` (khai trong `NUA_NGHIEM` của `src/architecture.test.ts` như `co-ve-repo.ts`), `src/modules/catalog/nguon-ve-route.ts` (+ `nguon-ve-route.test.ts`)
- Modify: `src/modules/catalog/index.ts` (trải route, export `nguonVeTheoMa`), `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `web/catalog-co-ve.ts`, `src/shared/bang-tham-chieu-khai-niem.ts`, `src/shared/bang-tham-chieu-viec.ts`

**Interfaces:**
- Produces:
  - `export type NguonVe = "HANG_NGOAI" | "TOUR_DAO";` và `export function nguonVeCua(ma: string | null, hienHanh: ReadonlyMap<string, NguonVe>): NguonVe` (không có dòng → `HANG_NGOAI`) ở `src/shared/nguon-ve.ts`.
  - `export async function nguonVeTheoMa(db: D1Database, codes: readonly string[]): Promise<Map<string, NguonVe>>` ở `catalog/index.ts`.
  - `GET /api/catalog/nguon-ve` → `{ dichVu: { ma: string; nguon: NguonVe }[] }`; `POST /api/catalog/nguon-ve` thân `{ ma: string; nguon: NguonVe }`; access `office`; cổng `can(staff,"catalog.ticket_flag.write") && !holdsPartner(staff)` (ADR-0175 Đ1.2: dùng chung ô của ADR-0174); trùng `UNIQUE` → 409 `stale`; nhật ký `ticket_source_changed` (detail chỉ `ma`, `nguon`).

- [ ] **Step 1: Bài đỏ** `nguon-ve.test.ts`: `nguonVeCua("ZVD1", new Map())` = `"HANG_NGOAI"`; `nguonVeCua(null, …)` = `"HANG_NGOAI"`; có dòng `TOUR_DAO` → `"TOUR_DAO"`. `nguon-ve-route.test.ts`: Quản trị POST được, Bán hàng/Kế toán 403, thân sai `nguon` 400, GET trả dòng hiện hành, hai POST cùng mili-giây → một 409.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Viết repo (khuôn `co-ve-repo.ts`: `nguonVeHienHanh`, `cauThemNguonVe`), route (khuôn `co-ve-route.ts`), hàm công bố.
- [ ] **Step 4:** Web: trong `taoCoVe` thêm `oNguonVe(ma, ten)` — chỉ hiện khi dịch vụ đang «Có vé»; hai lựa chọn «Vé hãng ngoài» / «Vé Tour Đảo»; đổi thì POST rồi `sauKhiDoi()`. Không ô theo nhóm. Thêm tên vào bảng tham chiếu.
- [ ] **Step 5:** Bài xanh + `npm run typecheck` 0 lỗi + `node --test src/architecture.test.ts src/standards.test.ts`.
- [ ] **Step 6: Commit** «Thêm ô Vé do ai phát trên từng dịch vụ».

### Task 4: Kho vé theo nguồn của lô

**Files:**
- Modify: `src/modules/ve-dien-tu/index.ts` (mười route kho), `repository.ts` (`cauChenLo`, `docLo`, `thongKeKho`, `dsLoBoDuoc`, `dsLoDaHuy`), `nhap-lo.ts` (`kiemLo`, `kiemVeMoi`)
- Create: `src/shared/ma-ve-tour-dao.ts` (+ test)
- Test: `src/modules/ve-dien-tu/nguon-lo-route.test.ts` (mới)

**Interfaces:**
- Produces:
  - `src/shared/ma-ve-tour-dao.ts`: `export const DANG_MA_VE_TD = /^TD1\.[A-Z2-7]{26}$/;` `export function taoMaVeTourDao(ngauNhien: (n: number) => Uint8Array): string` (16 byte → 26 ký tự base32, bỏ đệm).
  - `kiemLo` nhận thêm `nguon: NguonVe` (thiếu → `HANG_NGOAI`); `kiemVeMoi(raw, nguon: NguonVe)`: `TOUR_DAO` đòi `DANG_MA_VE_TD`, `HANG_NGOAI` từ chối mã bắt đầu `TD1.`.
  - `LoRow` thêm `source: NguonVe`; `cauChenLo(db, p & { nguon: NguonVe })`.
  - Trong `index.ts`: `const coQuyenLo = (staff, nguon: NguonVe, chiXem = false): boolean` — `HANG_NGOAI`: `ve.kho.manage`; `TOUR_DAO`: `ve.phat-hanh`, hoặc khi `chiXem` thì thêm `ve.kho.manage`. Route danh sách `GET /kho`, `GET /lo` lọc: chỉ trả nguồn mà người gọi `coQuyenLo(…, chiXem=true)`. `GET /lo-da-huy` lọc theo `coQuyenLo(…)` **không** `chiXem` (ADR Đ1.4: lô Tour Đảo chỉ `ve.phat-hanh`). Không nguồn nào → 403.
  - Route lô có `:id` đọc `docLo` trước rồi kiểm `coQuyenLo(staff, lo.source)`; `POST /api/ve/lo` kiểm theo `nguon` trong thân.

- [ ] **Step 1: Bài đỏ** `nguon-lo-route.test.ts` (khung `src/khung-thu-ve.test.ts`):
  - Bán hàng `POST /api/ve/lo {nguon:"TOUR_DAO"}` → 403; Quản lý bán hàng, Kế toán, Quản trị → 200.
  - Kế toán `GET /api/ve/kho` không thấy dòng lô `HANG_NGOAI`; `POST /api/ve/lo/:idHangNgoai/xac-nhan` → 403.
  - Bán hàng `GET /api/ve/lo` thấy số lượng lô `TOUR_DAO`; `POST /api/ve/lo/:idTD/bo` → 403; `GET /api/ve/lo-da-huy` không trả lô `TOUR_DAO` cho Bán hàng.
  - Lô `TOUR_DAO` nhận vé mã `ABC123` → 400; lô `HANG_NGOAI` nhận `TD1.AAAA…` → 400.
  - `taoMaVeTourDao(() => new Uint8Array(16))` = `"TD1." + "A".repeat(26)`; kết quả luôn khớp `DANG_MA_VE_TD`.
- [ ] **Step 2:** Chạy → FAIL.
- [ ] **Step 3:** Cài theo Interfaces. Thông báo lỗi 403 dùng câu có sẵn của module.
- [ ] **Step 4:** Bài mới xanh + toàn bộ `node --test src/modules/ve-dien-tu/` xanh (vé hãng ngoài không đổi) + bài không lộ mã ở `nhap-lo-route.test.ts` thêm ca lô `TOUR_DAO` (phản hồi, nhật ký không khớp `/TD1\.[A-Z2-7]{26}/`).
- [ ] **Step 5: Commit** «Kho vé hỏi quyền theo nguồn của lô».

### Task 5: Giữ vé đúng nguồn

**Files:**
- Modify: `src/modules/ve-dien-tu/repository.ts` (câu `GIU_VE`), `cap-ve.ts` (`DichCapVe`), `noi-orders.ts`, `src/shared/router.ts` (`dichVuChoVe` thêm trường), `src/modules/orders/index.ts` (`dichVuChoVe` điền nguồn qua `nguonVeTheoMa`), `src/index.ts`
- Test: `src/modules/ve-dien-tu/cap-ve.test.ts`, `src/modules/orders/…` bài của `dichVuChoVe`

**Interfaces:**
- Consumes: `nguonVeTheoMa` (Task 3), `vdt_batch.source` (Task 1).
- Produces: `DichCapVe` thêm `nguonVe: NguonVe`; phần tử của `ctx.dichVuChoVe()` thêm `nguonVe: NguonVe`; `GIU_VE` thêm `AND b.source = ?<nguon>`.

- [ ] **Step 1: Bài đỏ** trong `cap-ve.test.ts`: kho có lô `HANG_NGOAI` và lô `TOUR_DAO` cùng `catalog_code`; dịch vụ `nguonVe:"TOUR_DAO"` chỉ giữ vé lô `TOUR_DAO`, và ngược lại; đổi ô sau khi đã giữ không làm vé đã giữ đổi (ADR-0175 Đ1.5).
- [ ] **Step 2:** FAIL → cài → PASS. Kiểm thêm: «Thiếu vé» và `GET /api/ve/don/:orderId` không tính đơn huỷ và dịch vụ «Không vé» (nếu ADR-0174 đã làm, bài này phải xanh sẵn; nếu đỏ thì sửa ở đây).
- [ ] **Step 3: Commit** «Giữ vé từ đúng lô theo ô Vé do ai phát».

### Task 6: Cấp bù khi lô vào kho, báo thiếu vé

**Files:**
- Modify: `src/shared/router.ts` + `src/index.ts` (hàm tiêm mới), `src/modules/orders/index.ts` (hàm công bố), `src/modules/ve-dien-tu/index.ts` (route `/lo/:id/xac-nhan`), `src/shared/audit-actions.ts`, `src/shared/thong-bao.ts` (`locHopThongBao`)
- Test: `src/modules/ve-dien-tu/cap-bu.test.ts` (mới), `src/shared/thong-bao.test.ts`

**Interfaces:**
- Produces:
  - Ctx: `donThieuVe: (catalogCode: string) => Promise<string[]>` — id các đơn `confirmed` có dòng dịch vụ mã đó, «Có vé», còn thiếu, ngày đi ≥ hôm nay giờ Việt Nam, sắp theo ngày đi tăng dần. Gán ở `src/index.ts` từ `orders`.
  - Sau khi lô chuyển `ACTIVE`: lần lượt `ctx.capVeSauXacNhan(orderId)` cho từng đơn của `donThieuVe(lo.catalog_code)`; trả thêm `capBu: number` (số đơn được cấp) trong phản hồi.
  - Nhật ký mới `ve_thieu` (detail: `catalogCode`, `nguon`, `thieu: number`; không mã vé, không tên khách) ghi **bên trong** `capVeChoDon` (đường của `capVeSauXacNhan`) mỗi khi giữ vé xong mà còn thiếu — nên báo cả lúc xác nhận đơn thiếu vé, không chỉ lúc cấp bù. `locHopThongBao`: `nguon TOUR_DAO` → người có `ve.phat-hanh`; `HANG_NGOAI` → `ve.kho.manage`.
  - Tạo lô cho dịch vụ đang «Không vé» hoặc khác nguồn: không chặn; phản hồi xác nhận lô thêm `canhBaoNguon: true` để web hiện câu «Lô chưa được cấp cho ai tới khi Quản trị đổi ô».

- [ ] **Step 1: Bài đỏ** `cap-bu.test.ts`: hai đơn đã xác nhận thiếu vé (ngày đi 10/11 và 12/11), lô 1 vé vào kho → đơn 10/11 nhận vé, đơn 12/11 vẫn thiếu, có một dòng `ve_thieu`; xác nhận một đơn mới khi kho rỗng cũng sinh `ve_thieu`; Kế toán thấy tin trong hộp thư khi nguồn `TOUR_DAO`, Bán hàng không; nguồn `HANG_NGOAI` thì ngược lại.
- [ ] **Step 2:** FAIL → cài → PASS.
- [ ] **Step 3: Commit** «Cấp bù vé khi lô vào kho và báo thiếu vé».

### Task 7: Mở vé theo từng vé

**Files:**
- Modify: `src/shared/tra-sau.ts` (giữ `moVeDuoc`), `src/modules/ve-dien-tu/index.ts` (`veMoDuoc` và sáu đường), `repository.ts` (`docPhanBoMoKemLo`, `docVeCuaLink`, `docPhanBoDeXem` trả thêm `nguon`), `src/shared/router.ts` + `src/index.ts`
- Create: `src/shared/mo-ve-theo-ve.ts` (+ test)
- Test: `src/modules/ve-dien-tu/mo-ve-tour-dao.test.ts` (mới)

**Interfaces:**
- Produces:
  - Ctx: `dienDoiTacCuaDon: (orderId: string) => Promise<{ doiTacLap: boolean; benDatDoiTac: boolean } | null>` — `doiTacLap`: người lập giữ quyền PARTNER (ADR-0170 Đ2); `benDatDoiTac`: cùng nghĩa `bookerLaDoiTac` của DTO đơn (`orders/repository.ts`). Gán ở `src/index.ts`. Lỗi đọc → `null` → coi như diện đối tác (an toàn).
  - `src/shared/mo-ve-theo-ve.ts`: `export function veMoDuocTheoVe(v: { nguon: NguonVe; daMo: boolean }, d: { trangThai: string | null; dienDoiTac: boolean; moTheoTien: boolean }): boolean` — `HANG_NGOAI` → đúng `moTheoTien` như hôm nay (không thêm điều kiện nào); `TOUR_DAO`: `trangThai === "confirmed"` và (`!dienDoiTac` hoặc `moTheoTien`). Trạng thái đơn chỉ có `draft | confirmed | cancelled` (`OrderStatus`, `contracts.ts`); «Khách đã trả đủ» là cờ riêng, đơn vẫn `confirmed`. `moTheoTien` là kết quả `moVeDuoc` hiện hành (vé đã mở vẫn true như cũ).
  - Sáu đường lọc theo từng vé (ADR-0175 Đ2.5): `GET /api/ve/anh/:allocationId`, `POST /api/ve/giao`, `POST /api/ve/duong-dan`, `veXem` + `thuDu` ở `GET /api/ve/don/:orderId`, danh sách và ảnh ở `/ve/:token`, `/api/ve-khach/:token/anh/:slot`. `cauDanhDauLo` chỉ được gọi trên vé đã qua `veMoDuocTheoVe`.
  - `GET /api/ve/don/:orderId` thêm `veTourDaoMoSom: boolean` để web biết hiện nút trước khi thu đủ.

- [ ] **Step 1: Bài đỏ** `mo-ve-theo-ve.test.ts` — bảng ADR-0175 Đ2.2 thành bốn ca: nội bộ đã xác nhận chưa thu đủ → `TOUR_DAO` true, `HANG_NGOAI` false; đối tác lập chưa thu → cả hai false; bên đặt đối tác Trả sau trong hạn → true (qua `moTheoTien`); đơn huỷ → `TOUR_DAO` false; đơn `confirmed` đã đánh dấu «Khách đã trả đủ» → `TOUR_DAO` vẫn true, vé đã mở vẫn xem được.
- [ ] **Step 2: Bài đỏ** `mo-ve-tour-dao.test.ts`: đơn nội bộ có 1 vé Tour Đảo + 1 vé hãng ngoài, chưa thu đủ: `POST /api/ve/duong-dan` thành công; sau đó `revealed_at` của vé hãng ngoài vẫn `NULL`; trang `/ve/:token` liệt kê đúng 1 vé; `GET /api/ve/anh/<phân bổ hãng ngoài>` → câu `CHUA_THU_DU`. Đơn tài khoản Đối tác lập cùng tình huống: vé Tour Đảo không mở. Phản hồi không chứa mã vé.
- [ ] **Step 3:** FAIL → cài (đổi chữ ký và mọi điểm gọi, không thêm nhánh rời) → PASS; toàn bộ `src/modules/ve-dien-tu/` xanh, gồm `doi-tac-mo-ve.test.ts`, `adr-0171.test.ts`.
- [ ] **Step 4:** Web `web/ve-don.ts`: điều kiện hiện câu khoá đổi thành `!res.thuDu && res.veXem.length === 0 && !res.veTourDaoMoSom`; nút mở vé hiện cho vé Tour Đảo khi `veXem.length > 0`.
- [ ] **Step 5: Commit** «Mở vé Tour Đảo từ lúc xác nhận, quyết theo từng vé».

### Task 8: Tách chặn huỷ theo mục đích

**Files:**
- Modify: `src/modules/ve-dien-tu/repository.ts` (thêm câu), `noi-orders.ts` (`soanTraVeKhiHuy`), `src/shared/router.ts` + `src/index.ts` (`traVeKhiHuy`, `veDaMoCuaDon`), `src/modules/orders/tra-sau-cong.ts` (`congHuyTraSau`)
- Test: `src/modules/orders/tra-sau-cong.test.ts` (hoặc bài hiện có của cổng), `src/modules/ve-dien-tu/noi-orders.test.ts`

**Interfaces:**
- Produces:
  - `repository.ts`: `veHangNgoaiDaMoCuaDon(db, orderId): Promise<boolean>` và `cauChanVeHangNgoaiDaMo(db, orderId): D1PreparedStatement` (cùng khuôn `json_extract` của `cauChanVeDaMo`, chỉ tính lô `HANG_NGOAI`).
  - `soanTraVeKhiHuy` đổi `chanVeDaMo?: boolean` thành `chan?: "MOI_VE" | "HANG_NGOAI" | null`. Đối tác → `"MOI_VE"` (ADR-0170 Đ3 giữ nguyên); Trả sau còn nợ (văn phòng) → `"HANG_NGOAI"` (ADR-0168 Đ3 mục 3 bỏ vé Tour Đảo).
  - Ctx `traVeKhiHuy(orderId, lyDo, chanTraSau: boolean)` giữ chữ ký; trong `src/index.ts` chọn `chan = holdsPartner(actor) ? "MOI_VE" : chanTraSau ? "HANG_NGOAI" : null`.
  - Ctx mới `veHangNgoaiDaMoCuaDon: (orderId) => Promise<boolean | null>`; `congHuyTraSau` đọc hàm này thay cho `veDaMoCuaDon`. `chanDoiTacHuy`, `chanDoiTacSuaSoKhach` vẫn đọc `veDaMoCuaDon` (mọi loại vé).

- [ ] **Step 1: Bài đỏ:** văn phòng huỷ đơn Trả sau còn nợ chỉ có vé Tour Đảo đã mở → 200, vé thành `VOID`; có vé hãng ngoài đã mở → 409 `tra_sau_con_no_da_mo_ve`; tài khoản Đối tác huỷ đơn chỉ có vé Tour Đảo đã mở → 409 (cả `status` và `handler-cancel`); Đối tác sửa số khách cùng đơn → 409.
- [ ] **Step 2:** FAIL → cài → PASS; chạy `node --test src/modules/orders/ src/modules/dispatch/ src/modules/ve-dien-tu/`.
- [ ] **Step 2b:** Đọc `web/order.ts` (chỗ dựng nút «Huỷ đơn» của văn phòng, dữ liệu `traSau`, `coVeDaMo`): nếu nút bị ẩn khi Trả sau còn nợ và có vé đã mở, đổi điều kiện để chỉ ẩn khi có vé **hãng ngoài** đã mở (máy chủ trả thêm cờ `coVeHangNgoaiDaMo`); nếu chỉ có 409 của máy chủ thì ghi một dòng vào nhật ký thi công. Nút của đối tác giữ nguyên.
- [ ] **Step 3: Commit** «Tách chặn huỷ: Trả sau bỏ vé Tour Đảo, đối tác giữ nguyên».

### Task 9: Màn tạo vé Tour Đảo và ảnh vé

**Files:**
- Create: `web/ve-tao.ts` (khối tạo vé gắn vào trang kho), `web/ve-anh-tour-dao.ts` (vẽ ảnh vé)
- Modify: `web/ve-kho.ts` (hiện trang khi `ve.kho.manage` hoặc `ve.phat-hanh`; nút «Tạo vé» chỉ khi `ve.phat-hanh`; Kế toán chỉ thấy lô Tour Đảo do máy chủ lọc), `src/shared/bang-tham-chieu-viec.ts`, `src/shared/sw-policy.ts` nếu thêm tệp js
- Test: `src/shared/ve-anh-tour-dao-bo-cuc.test.ts` (luật bố cục thuần, nếu tách được), kịch bản Chrome `docs/evidence/…` ở Task 16

**Interfaces:**
- Consumes: `taoMaVeTourDao`, `DANG_MA_VE_TD` (Task 4), `veMaQr(canvas, payload, canhPx)` (`web/qr-ve.ts`), `docQrTuTep(file)` (`web/qr-doc-ve.ts`), `GET /api/company` (tên, hotline), logo `/icons/icon-192.png`, cách nạp phông của `web/confirmation-image.ts`.
- Produces: `export async function veAnhTourDao(m: { tenCongTy: string; hotline: string; tenDichVu: string; tenDichVuEn: string | null; nhomKhach: NhomLo; denNgay: string; ma: string }): Promise<Blob>` — PNG dọc 1080×1920, QR ≥ 520 px nền trắng viền ≥ 40 px ở nửa trên, chữ nhỏ nhất 28 px, mọi dòng cố định có dòng tiếng Anh nhỏ hơn; không giá, tên khách, số điện thoại, mã đơn. Nội dung dòng theo `docs/superpowers/specs/2026-11-05-lenh-ve-mau-ve-claude-design.md` mục «Vé từng khách».

- [ ] **Step 1:** Form: dịch vụ (danh mục «Có vé» + nguồn `TOUR_DAO`), nhóm khách (gồm «Mọi loại khách»), từ ngày, đến ngày, số lượng (≤ trần `vdt_setting`), «Tên tiếng Anh» tuỳ chọn (không lưu; chỉ in lên ảnh).
- [ ] **Step 2:** Luồng: `POST /api/ve/lo {nguon:"TOUR_DAO", …}` → mỗi vé: sinh mã, vẽ ảnh, `docQrTuTep(new File([blob], "ve.png"))` phải bằng đúng mã, không bằng thì dừng cả lô và `POST …/bo` → gửi theo đoạn `TOI_DA_VE_MOI_DOT` qua `POST /api/ve/lo/:id/ve` → `POST …/xac-nhan` → hiện số vé vào kho, số đơn được cấp bù, `canhBaoNguon`.
- [ ] **Step 3:** Xem trước một vé mẫu (mã giả `TD1.MAU…` không gửi máy chủ) trước khi bấm tạo.
- [ ] **Step 4:** `npm run build:web` + `npm run typecheck` 0 lỗi; chụp ảnh thật hai hướng (điện thoại 390 px, máy tính) gửi chủ duyệt bố cục.
- [ ] **Step 5: Commit** «Màn tạo vé Tour Đảo, ảnh vé hai thứ tiếng».

**Hết Đợt 1:** cập nhật `docs/SYSTEM-DESIGN.md` mục kho vé, `docs/CHANGE-GUIDE.md` (công thức vé Tour Đảo), `docs/SO-HANG-RAO.md` (hàng rào nguồn lô, dạng mã — kèm ngày quan sát chặn thật: sửa cố ý → đỏ → hoàn nguyên); chạy `npm test`, `npm run typecheck`, `npm run test:e2e -- ve-dien-tu` một lần; người kiểm độc lập (vai `nguoi-kiem-doc-lap`) đọc mã và chạy lại; chủ chạy `npm run day-len` rồi `npm run trien-khai`.

## Đợt 2 — Quét vé và đối chiếu (một lần phát hành)

### Task 10: Bảng lượt quét

**Files:**
- Create: `migrations/0152_ve_quet.sql` (số kiểm lại)
- Modify: `docs/data-dictionary.json`, `scripts/audit-checks.mjs` (bất biến mới)
- Test: `src/modules/ve-dien-tu/migration.test.ts`, `src/modules/ve-dien-tu/bat-bien.test.ts`

**Interfaces:**
- Produces: bảng `vdt_scan (id, ticket_id, allocation_id, order_id, order_service_id, ket_qua CHECK IN ('DA_TINH','CHI_XEM','TU_CHOI'), ly_do TEXT, so_khach INTEGER NOT NULL DEFAULT 1, xac_nhan_lech_ngay INTEGER, xac_nhan_chua_thu INTEGER, xac_nhan_vuot_khach INTEGER, scanned_at, scanned_by, voided_at, voided_by, void_reason, ve_doan INTEGER NOT NULL DEFAULT 0 CHECK (ve_doan IN (0,1)), created_at, created_by, updated_at, updated_by)`; trigger chỉ cho UPDATE ba cột `voided_*` một lần; cấm DELETE; chỉ mục duy nhất một phần `vdt_scan_mot_lan ON vdt_scan(ticket_id) WHERE ket_qua='DA_TINH' AND voided_at IS NULL AND ve_doan = 0` (chừa vé đoàn: lượt quét vé đoàn ghi `ve_doan = 1`, kể cả lượt một khách). Bất biến `R-VDT-7` (fail): lượt `DA_TINH` chưa bỏ chỉ trên vé lô `TOUR_DAO` có `revealed_at`. `R-VDT-8` (fail): vé có `DA_TINH` chưa bỏ không ở trạng thái `AVAILABLE`.

- [ ] **Step 1:** Bài đỏ: hai `DA_TINH` chưa bỏ cùng vé → lỗi UNIQUE; bỏ lượt rồi chèn lại được; sửa `ket_qua` → lỗi; bất biến báo vi phạm trên dữ liệu gieo sai.
- [ ] **Step 2:** FAIL → cài → PASS + `npm run dict`.
- [ ] **Step 3: Commit** «Thêm bảng lượt quét vé».

### Task 11: Luật quét thuần

**Files:**
- Create: `src/shared/ket-qua-quet.ts` (+ `ket-qua-quet.test.ts`)

**Interfaces:**
- Produces: `export type MauQuet = "DO" | "VANG" | "XANH";` `export function ketQuaQuet(v: VeQuet | null, ngu: { homNay: string; quyenTinh: boolean; xacNhan: { lechNgay: boolean; chuaThu: boolean; vuotKhach: boolean } }): { mau: MauQuet; ma: MaQuet; ghi: "DA_TINH" | "CHI_XEM" | "TU_CHOI" | null }` với `VeQuet = { nguon: NguonVe; trangThaiVe: string; trangThaiDon: string | null; daMo: boolean; tuNgay: string; denNgay: string; daDung: { luc: string; nguoi: string } | null; ngayDi: string | null; moTheoTien: boolean; soLuotDaTinh: number; soKhachHieuLuc: number }` và `MaQuet` là `"KHONG_PHAI_VE_TD" | "VE_DA_HUY" | "CHUA_GIAO" | "HET_HAN" | "CHUA_TOI_NGAY" | "DA_DUNG" | "LECH_NGAY" | "CHUA_THU_DU" | "VUOT_KHACH" | "HOP_LE"`. Thứ tự kiểm đúng bảng spec mục 2.5. `v === null` hoặc `nguon === "HANG_NGOAI"` → `KHONG_PHAI_VE_TD`, `ghi: null`. Đỏ có vé thật → `ghi: "TU_CHOI"`. Xanh/vàng đã xác nhận: `quyenTinh` → `DA_TINH`, không → `CHI_XEM`. Vàng chưa xác nhận → `ghi: null`.
- Câu chữ cho từng `MaQuet` khai một chỗ (`CAU_QUET`), lấy từ spec mục 2.5.

- [ ] **Step 1:** Bài đỏ: một ca cho mỗi dòng bảng spec 2.5, cộng: vé hãng ngoài và `null` trả cùng `ma`; Trả sau trong hạn không ra `CHUA_THU_DU` (`moTheoTien` true); tài xế (`quyenTinh:false`) vé hợp lệ → `CHI_XEM`.
- [ ] **Step 2:** FAIL → cài → PASS.
- [ ] **Step 3: Commit** «Luật quét vé thuần».

### Task 12: Route quét và bỏ lượt

**Files:**
- Modify: `src/modules/ve-dien-tu/index.ts`, `repository.ts`, `src/shared/router.ts` + `src/index.ts`, `src/shared/audit-actions.ts`, `src/lan-gui-phu-route.test.ts`, `src/shared/lan-gui-bi-mat.ts` (thân có mã vé → `BI_MAT`)
- Test: `src/modules/ve-dien-tu/quet-route.test.ts` (mới)

**Interfaces:**
- Consumes: `ketQuaQuet` (Task 11), `vdt_scan` (Task 10), `veMoDuocTheoVe` (Task 7).
- Produces:
  - Ô quyền (bài ghim `permissions.test.ts` như Task 2): `"ve.quet.tinh": row("any","any","any","any","none","any","none","none","none","none","any")`, `"ve.quet.xem": row("any","any","any","any","none","any","none","any","none","none","any")`.
  - Ctx `donChoQuet: (orderId: string, serviceId: string, staffId: string) => Promise<{ trangThai: string; ngayDi: string | null; soKhachHieuLuc: number; maDon: string | null; xemTien: boolean } | null>` — `maDon` chỉ khi người quét có `order.view` trên đơn; `xemTien` theo `money.view`.
  - `POST /api/ve/quet`, access `staff`, cần `ve.quet.tinh` hoặc `ve.quet.xem`; thân `{ ma: string; xacNhan?: { lechNgay?: boolean; chuaThu?: boolean; vuotKhach?: boolean } }`; trả `{ mau, cau, dichVu, nhomKhach, ngayDi, soCuoi: string, maDon?: string, lanQuetId?: string }`. Không trả tên khách, số điện thoại, giá.
  - Ghi: một `db.batch` — câu chèn có gác + nhật ký `ve_quet` gác `changes() > 0` (detail: `ketQua`, `soCuoi`; không mã đủ). Thua UNIQUE → đọc lại lượt thắng, trả `DA_DUNG` kèm giờ và tên người.
  - `POST /api/ve/quet/:id/bo`, access `staff`, thân `{ lyDo: string }` (≥ 5 ký tự): người quét trong 5 phút kể từ `scanned_at`, hoặc Quản trị, Toàn quyền bất kỳ lúc; nhật ký `ve_bo_luot_quet`.

- [ ] **Step 1: Bài đỏ** `quet-route.test.ts`: Hướng dẫn viên quét vé đã mở hợp lệ → xanh, một `DA_TINH`; quét lại → đỏ «Đã dùng»; Tài xế công ty → xanh, `CHI_XEM`, sau đó Hướng dẫn viên vẫn tính được; hai yêu cầu song song (`Promise.all`) → đúng một `DA_TINH`; vé hãng ngoài và mã lạ → cùng `cau`, không có dòng `vdt_scan`; vé trong kho chưa cấp → đỏ `CHUA_GIAO`, có `TU_CHOI`; lệch ngày → vàng, chưa ghi; gửi lại kèm `xacNhan.lechNgay` → ghi kèm cờ; Đối tác, Thực tập, Tài xế đối tác → 403; Hướng dẫn viên không có `order.view` không nhận `maDon`; phản hồi và nhật ký không khớp `/TD1\.[A-Z2-7]{26}/`; bỏ lượt sau 5 phút bởi người quét → 403, Quản trị → 200.
- [ ] **Step 2:** FAIL → cài → PASS; tăng số ghim route ghi thêm 2.
- [ ] **Step 3: Commit** «Route quét vé và bỏ lượt quét».

### Task 13: Chặn huỷ khi vé đã dùng

**Files:**
- Modify: `src/modules/ve-dien-tu/repository.ts`, `noi-orders.ts`, `src/shared/router.ts` + `src/index.ts`, `src/modules/orders/index.ts` (`money-edit`), `src/modules/dispatch/index.ts` (`handler-money-edit`)
- Test: `src/modules/ve-dien-tu/chan-da-dung.test.ts` (mới)

**Interfaces:**
- Produces: `cauChanVeDaDung(db, orderId): D1PreparedStatement` (khuôn `json_extract`, dấu lỗi `don_co_ve_da_dung`), luôn đứng đầu lô của `soanTraVeKhiHuy` cho cả `DON_HUY` và `RUT_XAC_NHAN`; dịch lỗi thành 409 `don_co_ve_da_dung` với câu «Đơn có vé đã dùng. Bỏ lượt quét trước khi huỷ.» ở mọi đường gọi `traVeKhiHuy` (`status`, `handler-cancel`, `rut-xac-nhan`, `quyet-dinh`). Ctx `soVeDaDungTheoDichVu: (orderId) => Promise<Map<string, number> | null>`; `money-edit` và `handler-money-edit` trả 409 `duoi_so_ve_da_dung` khi số khách mới (không gồm em bé) < số vé đã dùng của dòng đó.

- [ ] **Step 1: Bài đỏ:** đơn có `DA_TINH` → huỷ 409 ở bốn đường; bỏ lượt rồi huỷ → 200; đơn chỉ có `CHI_XEM`/`TU_CHOI` → huỷ được; giảm khách xuống dưới số đã dùng → 409; huỷ đơn có vé đã mở chưa dùng → vé `VOID`, quét lại ra «Vé đã huỷ».
- [ ] **Step 2:** FAIL → cài → PASS; chạy cả `src/modules/orders/ src/modules/dispatch/`.
- [ ] **Step 3: Commit** «Chặn huỷ đơn và giảm khách khi có vé đã dùng».

### Task 14: Camera và trang Quét vé

**Files:**
- Modify: `public/_headers`, `web/qr-doc-ve.ts`, `src/shared/sw-policy.ts` (`PAGES`, `PRECACHE`), `package.json` (`build:web`), menu (nơi khai mục menu theo việc), `src/shared/bang-tham-chieu-viec.ts`
- Create: `public/quet-ve.html`, `web/quet-ve.ts`, `src/quet-ve-camera.test.ts`

**Interfaces:**
- Produces: `export function docQrTuKhung(khung: ImageData): string | null` trong `web/qr-doc-ve.ts` (nơi duy nhất import jsQR). `_headers`: khối `/quet-ve` với `! Permissions-Policy` rồi `Permissions-Policy: camera=(self), microphone=(), geolocation=()`.

- [ ] **Step 1 (Bước 0, cùng chủ):** dựng trang tối thiểu (video `getUserMedia` + nút chụp ảnh `<input type="file" accept="image/*" capture="environment">`), chạy `node scripts/dev-iphone.mjs --tunnel`, chủ mở bằng iPhone (Safari và bản cài lên màn hình): camera mở được, chụp ảnh đọc được mã. Ghi kết quả vào nhật ký thi công. Hỏng đường video thì chỉ giữ đường chụp ảnh và báo chủ.
- [ ] **Step 2: Bài đỏ** `quet-ve-camera.test.ts`: `/*` vẫn `camera=()`; chỉ đúng một khối mở `camera=(self)` và đó là `/quet-ve`; `geolocation=()` vẫn ở mọi khối. Đọc đầu phản hồi thật trên `wrangler dev` một lần, ghi lệnh và kết quả vào nhật ký.
- [ ] **Step 3:** Trang `/quet-ve`: hiện cho người có `ve.quet.tinh` hoặc `ve.quet.xem`; đọc khung mỗi ~250 ms; chống đọc lặp cùng mã trong 3 giây; kết quả chiếm cả màn, ba màu kèm chữ lớn (không chỉ dựa vào màu); vàng có nút xác nhận gửi lại kèm cờ; danh sách năm lượt vừa quét kèm nút «Bỏ lượt quét» trong 5 phút. Luôn có nút chụp ảnh dự phòng.
- [ ] **Step 4:** `npm run build:web`, `npm run typecheck`, `node --test src/vendor-jsqr.test.ts src/chi-duong-tinh.test.ts src/quet-ve-camera.test.ts` → PASS.
- [ ] **Step 5: Commit** «Trang Quét vé, chỉ trang này được dùng camera».

### Task 15: Đã dùng trên đơn, màn đối chiếu

**Files:**
- Modify: `src/modules/ve-dien-tu/index.ts` (`GET /api/ve/don/:orderId` thêm `daDung` theo dịch vụ), `web/ve-don.ts`
- Create: route `GET /api/ve/doi-chieu?ngay=YYYY-MM-DD`, `GET /api/ve/nguoi-quet?ngay=YYYY-MM-DD` (access `office` hoặc `staff` + `ve.doi-chieu.view`), `public/ve-doi-chieu.html`, `web/ve-doi-chieu.ts`; khai `PAGES`, `PRECACHE`, `build:web`, menu
- Test: `src/modules/ve-dien-tu/doi-chieu-route.test.ts`

**Interfaces:**
- Produces: ô `"ve.doi-chieu.view": row("none","any","any","none","none","any","none","none","none","none","any")` (bài ghim như Task 2). `GET /api/ve/doi-chieu` → `{ dong: { dichVu: string; soKhachTheoDon: number; daDung: number; chenhLech: number }[] }` (chỉ đơn `confirmed`, không đơn huỷ); `GET /api/ve/nguoi-quet` → `{ dong: { nguoi: string; daTinh: number; chiXem: number; tuChoi: number; daBo: number }[] }`; sổ vé Tour Đảo `{ daTao, trongKho, daCapChuaMo, daMoChuaDung, daDung, daHuy }` với `daTao` = tổng năm ô. Bất biến `R-VDT-9` kiểm đẳng thức sổ vé.

- [ ] **Step 1: Bài đỏ:** Kế toán thấy đối chiếu, Bán hàng thường 403; số liệu khớp dữ liệu gieo; đẳng thức sổ vé đúng sau một vé bị huỷ đơn khi đã mở (thuộc «đã huỷ»).
- [ ] **Step 2:** FAIL → cài → PASS; web khối vé trên đơn hiện «Đã dùng x/y» theo dịch vụ.
- [ ] **Step 3: Commit** «Đã dùng trên đơn, màn đối chiếu vé và theo dõi người quét».

### Task 16: Kiểm toàn bộ và nghiệm thu

**Files:**
- Create: `tests/e2e/ve-tour-dao.mjs`
- Modify: `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/HANDOFF-N1.md` (mục nhật ký thay đổi bước A.0 do chủ triển khai)

- [ ] **Step 1:** e2e `ve-tour-dao.mjs` phủ 11 tiêu chí ở spec mục 2.12 và 4 điều kiện nghiệm thu ở ADR-0175; đăng nhập qua `login()`/`session()` của `tests/e2e/lib.mjs`.
- [ ] **Step 2:** Mỗi hàng rào mới (nguồn lô, dạng mã, chỉ mục quét một lần, camera chỉ `/quet-ve`, chặn huỷ khi đã dùng) có dòng ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật (sửa cố ý → đỏ → hoàn nguyên).
- [ ] **Step 3:** Chạy một lần: `npm test`, `npm run typecheck`, `npm run test:e2e`, kịch bản Chrome kho vé và trang quét (trang của tài khoản nào mở sau cùng).
- [ ] **Step 4:** Người kiểm độc lập (`nguoi-kiem-doc-lap`) đọc mã, chạy lại lệnh; chủ thử iPhone thật (tạo vé, gửi khách, quét bằng camera và bằng ảnh).
- [ ] **Step 5:** Đưa chủ lệnh `npm run day-len -- <nhánh>` rồi `npm run trien-khai`.

---

## Đợt 3 — Vé đoàn

Không thuộc kế hoạch này; ADR riêng theo spec mục 2.8.

## Lựa chọn của người viết kế hoạch (chủ sửa được)

- «Tên tiếng Anh» của dịch vụ không lưu, chỉ gõ lúc tạo vé và in lên ảnh (YAGNI; ảnh đã lưu ở kho).
- Hai đợt phát hành riêng: Đợt 1 (tạo, giữ, gửi vé), Đợt 2 (quét). Cách dùng giữa hai đợt là câu hỏi chủ ở Task 0.
- Cấp bù chạy ngay trong lệnh xác nhận lô, không qua Cron.
- Ba màn trong danh sách màn để lượt sau, không làm ở kế hoạch này: màn 1 «Tổng quan vé», màn 9 «Tra cứu một vé», phần ngưỡng báo thiếu và lời lưu ý trên vé của màn 13 «Cài đặt vé» (ngưỡng tạm là báo khi thiếu từ 1 vé). Màn 12 «Doanh thu và sổ vé» chờ kế toán.
- Mục menu: Hướng dẫn viên và Tài xế công ty chỉ thấy «Quét vé» (Task 14).
