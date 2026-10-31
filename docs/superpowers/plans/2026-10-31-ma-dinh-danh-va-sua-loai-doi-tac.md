# Luật mã định danh + nút «Sửa» Loại đối tác / Cấp đại lý — kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kế toán / Quản trị / Toàn quyền đổi tên và ghi chú cho loại đối tác và cấp đại lý, thấy mã định danh, ai tạo / ai sửa; mã không bao giờ đổi; điều 5.26 vào Hiến chương với một hàng rào máy.

**Architecture:** Bảng tiền tố + hàm sinh mã + luật ghi chú là luật thuần ở `src/shared/`. Migration `0130` thêm cột ghi chú + dấu vết. Hai route `PATCH` ở `pricing` (cạnh route Tắt/Bật), mỗi route một `db.batch`: câu cập nhật có khoá lạc quan `updated_at IS ?` → nhật ký `changes() > 0`. `pty_role_type` chỉ do `parties` ghi (câu chưa chạy công bố qua `parties/index.ts`). Giao diện: một hộp sửa dùng chung hai thẻ.

**Tech Stack:** TypeScript, Cloudflare Worker + D1 (SQLite), `node --test`, giao diện thuần dựng bằng `h()`, esbuild.

**Spec:** `docs/superpowers/specs/2026-10-31-ma-dinh-danh-va-sua-loai-doi-tac-design.md` (ĐÃ DUYỆT 31/10). Người thi công đọc cả hai tệp.

## Global Constraints

- Không thêm ô quyền: mọi lệnh ghi = `can(staff, "partner.commission.write") && !holdsPartner(staff)`; đọc = `partner.commission.view`.
- Mã không bao giờ đổi; không ô sửa mã. Khuôn `<TIỀN TỐ>_<8 chữ A–Z>`.
- Tên: 2–60 chữ, không trùng tên khác cùng loại, không SĐT / số tài khoản / email. Ghi chú: ≤ 500 chữ, rỗng được, cấm như tên.
- Đổi tên + ghi chú loại đối tác: **chỉ** dòng có trong `prc_beneficiary_role` (năm loại Có sẵn + loại tự thêm). Dòng khác / mã lạ ⇒ 404.
- Nhật ký sửa ghi chú **không** chứa nội dung ghi chú. Đổi tên ghi `«cũ» → «mới»`. Mọi dòng nhật ký về loại / cấp ghi `targetType: "ledger"`, `targetId: <mã>`.
- Ô mã của năm loại Có sẵn hiện «Loại gốc của hệ thống — mã cố định», không hiện mã tiếng Anh.
- Chữ giao diện, lỗi, commit: tiếng Việt có dấu; không «App». Không `innerHTML`; CSS qua token; ô gõ 16px.
- Migration chỉ thêm tệp mới; kiểm số `0130` còn trống ở mọi nhánh ngay trước khi tạo tệp.
- Sửa hành vi: test đỏ trước, xanh sau. Bộ kiểm dài (`npm test`, e2e, Chrome) chạy **một lần** ở cuối (Task 6).

## Review Focus

- Lưu mà không đổi gì (cùng tên, cùng ghi chú) ⇒ 200, **không** dòng nhật ký, `updated_at` giữ nguyên. Test ở Task 3, Task 4.
- Đổi tên chỉ khác hoa/thường hoặc khoảng trắng («Lễ tân  khách sạn» → «lễ tân khách sạn») ⇒ coi là tên của chính nó, không báo trùng với chính mình; với loại khác thì báo trùng theo cùng cách so lúc thêm. Test ở Task 3.
- Loại tạo trước bản này (`created_at` NULL, `updated_at` NULL) sửa được lần đầu: thân gửi `updatedAt: null` khớp `IS NULL`. Test ở Task 3.
- Ghi chú chỉ toàn khoảng trắng ⇒ lưu thành NULL (xoá ghi chú), không lưu chuỗi trắng. Test ở Task 1.
- Loại / cấp đang **tắt** vẫn sửa được tên và ghi chú (tắt không phải xoá). Test ở Task 3, Task 4.

---

### Task 1: Luật thuần — bảng tiền tố, hàm sinh mã, luật ghi chú

**Files:**
- Create: `src/shared/ma-dinh-danh.ts`, `src/shared/ma-dinh-danh.test.ts`, `src/shared/ghi-chu-danh-muc.ts`, `src/shared/ghi-chu-danh-muc.test.ts`
- Modify: `src/modules/parties/rules.ts` (`maLoaiDoiTac`), `src/modules/pricing/rules.ts` (`maMucTa`), `docs/SO-HANG-RAO.md`

**Interfaces:**
- Produces: `TIEN_TO_MA: readonly { tienTo: string; loai: string }[]` (ban đầu `{ tienTo: "LD", loai: "Loại đối tác" }`, `{ tienTo: "MT", loai: "Cấp đại lý" }`); `sinhMa(tienTo: string, bytes: Uint8Array): string` (ném lỗi nếu tiền tố không có trong bảng); `MA_DINH_DANH_RE = /^[A-Z]{2,3}_[A-Z]{8}$/`.
- Produces: `kiemGhiChu(raw: unknown): { ok: true; value: string | null } | { ok: false; message: string }`.

- [ ] **Step 1: Viết test đỏ** — `ma-dinh-danh.test.ts`: `sinhMa("LD", bytes)` khớp `MA_DINH_DANH_RE` và bằng đúng chuỗi `maLoaiDoiTac(bytes)` cũ (cùng bytes ⇒ cùng mã, để không đổi hành vi); `sinhMa("XX", …)` ném; **bài rào** «không hai dòng `TIEN_TO_MA` trùng `tienTo`»; mọi `tienTo` khớp `/^[A-Z]{2,3}$/`. `ghi-chu-danh-muc.test.ts`: `undefined`/`""`/`"   "` ⇒ `{ ok: true, value: null }`; `"  dòng 1\ndòng 2  "` ⇒ `"dòng 1\ndòng 2"` (chỉ `trim()` hai đầu, giữ xuống dòng); 501 chữ ⇒ lỗi «Ghi chú dài tối đa 500 ký tự.»; chứa `0905123456`, `0905.123.456`, `a@b.vn` ⇒ lỗi «Ghi chú không được chứa số điện thoại, số tài khoản hay địa chỉ email.»; `"Năm 2024-2025"` ⇒ ok; số không phải chuỗi ⇒ lỗi.
- [ ] **Step 2: Chạy** `node --test src/shared/ma-dinh-danh.test.ts src/shared/ghi-chu-danh-muc.test.ts` — Expected: FAIL (tệp chưa có).
- [ ] **Step 3: Viết hai tệp thuần.** Bộ dò số / email chép đúng biểu thức trong `kiemTenMucTa` (`pricing/rules.ts`) — đưa biểu thức đó thành một hằng xuất ở `ghi-chu-danh-muc.ts` và cho `kiemTenMucTa` dùng lại (một nguồn). `maLoaiDoiTac` và `maMucTa` gọi `sinhMa("LD"| "MT", bytes)`.
- [ ] **Step 4: Chạy lại** hai test + `node --test src/modules/pricing/rules.test.ts src/modules/parties/*.test.ts` — Expected: PASS.
- [ ] **Step 5: Quan sát rào chặn thật** — thêm tạm dòng `{ tienTo: "LD", loai: "Thử" }` ⇒ bài rào đỏ ⇒ hoàn nguyên ⇒ xanh. Thêm một dòng vào `docs/SO-HANG-RAO.md`: chặn «hai loại bản ghi trùng tiền tố mã», cơ chế `src/shared/ma-dinh-danh.test.ts`, ngày quan sát.
- [ ] **Step 6: Commit** `feat(ma-dinh-danh): bảng tiền tố và hàm sinh mã chung; luật ghi chú danh mục`.

### Task 2: Migration 0130 + câu SQL của hai bảng

**Files:**
- Create: `migrations/0130_ghi_chu_va_dau_vet_loai_cap.sql`
- Modify: `src/modules/parties/repository.ts`, `src/modules/parties/index.ts`, `src/modules/pricing/repository.ts`, `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` (sinh bằng `npm run dict`)
- Test: `src/modules/parties/loai-doi-tac-csdl.test.ts` (mới), mở rộng `src/modules/pricing/muc-ta.test.ts`

**Interfaces:**
- Produces (parties/index.ts): `suaLoaiDoiTacStatement(db, v: { code: string; ten: string; ghiChu: string | null; at: string; staffId: string; truocLuc: string | null }): D1PreparedStatement` — `UPDATE pty_role_type SET name = ?2, note = ?3, updated_at = ?4, updated_by = ?5 WHERE code = ?1 AND updated_at IS ?6 AND code IN (SELECT role_type_code FROM prc_beneficiary_role)`. (Đọc `prc_beneficiary_role` trong câu của parties: nếu `architecture.test.ts` cấm, thay bằng view công bố của pricing, hoặc chuyển giới hạn này lên route + giữ `is_partner_label = 1 OR role_group = 'EXTERNAL'` ở câu — ghi lại lựa chọn trong commit.)
- Changes: `datHoatDongLoaiDoiTacStatement(db, code, bat, at, staffId)` — thêm `at`, `staffId`, đặt `updated_at/updated_by`. `themLoaiDoiTacStatement(db, { code, ten, at, staffId })` — đặt `created_*` và `updated_*`. Sửa mọi nơi gọi.
- Changes: `loaiVaiChiTiet` trả thêm `ghiChu, taoLuc, taoBoi, suaLuc, suaBoi` (mã nhân viên hoặc null).
- Produces (pricing/repository.ts): `suaMucTaStatement(db, v: { code; ten; khoa; ghiChu; at; staffId; truocLuc: string })` — `UPDATE prc_rate_tier SET name, name_key, note, updated_at, updated_by WHERE code = ?1 AND updated_at = ?truocLuc`; câu đọc mức trả thêm `note, created_at, created_by, updated_at, updated_by`.

- [ ] **Step 1: Test đỏ** (`loai-doi-tac-csdl.test.ts`, SQLite thật qua `tests/audit/harness.mjs` như `loai-doi-tac.test.ts`): sau migration, `pty_role_type` có 5 cột mới NULL ở dòng cũ; `suaLoaiDoiTacStatement` với `truocLuc: null` đổi đúng 1 dòng loại có sẵn `TRAVEL_AGENCY`; chạy lại cùng `truocLuc: null` ⇒ 0 dòng; trên mã `SALES` (vai nội bộ) ⇒ 0 dòng; Tắt qua `datHoatDongLoaiDoiTacStatement` đặt `updated_at`. `muc-ta.test.ts`: `suaMucTaStatement` với `truocLuc` cũ ⇒ 0 dòng; tên trùng `name_key` cấp khác ⇒ lỗi UNIQUE.
- [ ] **Step 2: Chạy** `node --test src/modules/parties/loai-doi-tac-csdl.test.ts src/modules/pricing/muc-ta.test.ts` — Expected: FAIL.
- [ ] **Step 3: Viết migration** — `ALTER TABLE pty_role_type ADD COLUMN note TEXT CHECK (note IS NULL OR length(note) BETWEEN 1 AND 500)`; `created_at TEXT`, `created_by TEXT`, `updated_at TEXT`, `updated_by TEXT`; `ALTER TABLE prc_rate_tier ADD COLUMN note TEXT CHECK (…cùng điều kiện…)`. Không sửa trigger `prc_rate_tier_update_scope` (đã cho đổi). Ghi 6 cột vào `docs/data-dictionary.json` (hạng N1), `npm run dict`. Viết các câu SQL bằng `defineSql`.
- [ ] **Step 4: Chạy** lại test Step 2 + `node --test src/architecture.test.ts src/migrations-n1.test.ts` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(du-lieu): migration 0130 — ghi chú và dấu vết cho loại đối tác, ghi chú cho cấp đại lý`.

### Task 3: Route sửa loại đối tác + nhật ký có mã

**Files:**
- Modify: `src/modules/pricing/index.ts` (route `PATCH /api/pricing/loai-doi-tac/:code`, `docLoaiDoiTac`, `doiTrangThaiLoai`, route `POST /api/pricing/loai-doi-tac`), `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `src/shared/lich-su-doi-tac.ts`, `src/shared/lich-su-noi-bo.ts`
- Test: `src/modules/pricing/sua-loai-doi-tac.test.ts` (mới, cùng khung với `loai-doi-tac.test.ts`)

**Interfaces:**
- Consumes: `kiemGhiChu`, `suaLoaiDoiTacStatement`, `loaiVaiChiTiet` (Task 1–2).
- Produces: `LoaiDoiTacDto` thêm `ghiChu: string | null; taoLuc: string | null; taoBoi: string | null; suaLuc: string | null; suaBoi: string | null; updatedAt: string | null; soHoSo: number` (`taoBoi/suaBoi` = **tên** nhân viên; đọc qua view nhãn nhân viên công bố `v_stf_staff_label` — thêm cạnh `pricing → staff` ở `ALLOWED_EDGES` nếu bài kiến trúc đòi; `soHoSo` = số hồ sơ có vai đang mở ở `v_pty_open_role`).
- Produces: thân `PATCH` `{ ten?: string; ghiChu?: string; updatedAt: string | null }` ⇒ 200 `LoaiDoiTacResponse`. Lỗi: 400 `invalid_input` (vắng cả `ten` lẫn `ghiChu`, hoặc luật tên/ghi chú), 403, 404 `not_found`, 409 `loai_trung`, 409 `da_doi` («Loại này vừa được người khác sửa, mở lại để xem bản mới.»).
- Produces: hành động nhật ký `prc_partner_type_renamed` («Đổi tên loại đối tác»), `prc_partner_type_note` («Sửa ghi chú loại đối tác»), nhóm `ledger`; ba hành động cũ thêm `targetType: "ledger", targetId: code`.

- [ ] **Step 1: Test đỏ** — `sua-loai-doi-tac.test.ts`, mỗi tiêu chí một `test(...)` mang mã spec:
  - A1: KT đổi tên loại tự thêm ⇒ 200; `GET /api/pricing/loai-doi-tac` có tên mới, cùng `code`; `GET /api/parties/:id` của hồ sơ đã gắn có tên mới; một dòng `prc_partner_type_renamed` với `target_id = code` và `detail = «Nhân viên spa» → «Spa cao cấp»`.
  - A2: đổi sang tên của loại khác ⇒ 409 `loai_trung`, `pty_role_type` không đổi, 0 dòng nhật ký mới; tên `Gọi 0905123456` ⇒ 400.
  - A3: đổi tên + ghi chú `TRAVEL_AGENCY` (dữ liệu cũ, `updatedAt: null`) ⇒ 200; mã `SALES`, `DRIVER_EXTERNAL`, `OWNER_COMPANY`, `KHONG_CO` ⇒ 404.
  - A4: `SALES`, `HDV`, `HR`, `DRV`, `DP`, `DT`, `KP` ⇒ 403; `KT`, `ADM`, `SA` ⇒ 200.
  - A5: hai `PATCH` cùng `updatedAt` ⇒ một 200, một 409 `da_doi`, đúng một dòng nhật ký; mở (đọc `updatedAt`) → Tắt → `PATCH` ⇒ 409 `da_doi`.
  - A6: sửa ghi chú `"Lễ tân khu Trần Phú"` ⇒ dòng `prc_partner_type_note`, `detail` không chứa «Trần Phú».
  - A7: thêm, tắt, bật, đổi tên, sửa ghi chú ⇒ mọi dòng nhật ký `prc_partner_type_%` mới có `target_id = code`.
  - Review Focus: lưu không đổi ⇒ 200, 0 dòng nhật ký, `updated_at` giữ; đổi «Nhân viên spa» → «nhân viên  SPA» ⇒ 200 (không trùng chính mình); loại đang tắt đổi tên được; gửi cả `ten` lẫn `ghiChu` đổi ⇒ hai dòng nhật ký (một mỗi hành động), một câu UPDATE.
- [ ] **Step 2: Chạy** `node --test src/modules/pricing/sua-loai-doi-tac.test.ts` — Expected: FAIL (404 route chưa có).
- [ ] **Step 3: Viết route** cạnh `…/:code/tat` (đường cố định đứng trước đường có `:code` như chú thích hiện có). Thứ tự: kiểm quyền → `MA_RE` → tìm trong `docLoaiDoiTac` (vắng ⇒ 404) → luật tên (lọc chính mã đang sửa khỏi `daCo` của `kiemTenLoaiDoiTac`) + `kiemGhiChu` → không đổi gì ⇒ trả DTO hiện tại → `chayLo([suaLoaiDoiTacStatement, audit đổi tên (nếu đổi) changes()>0, audit ghi chú (nếu đổi) changes()>0])` → 0 dòng đổi ⇒ 409 `da_doi`. Nhật ký thứ hai phải dựa vào dòng nhật ký thứ nhất hoặc chung một điều kiện đúng — dùng `id` nhật ký + `wonGuard` như luật `src/CLAUDE.md` «Ghi nhiều bảng sau một UPDATE điều kiện».
- [ ] **Step 4: Chạy** lại + `node --test src/modules/pricing/loai-doi-tac.test.ts src/shared/audit-actions.test.ts src/architecture.test.ts` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(hoa-hong): sửa tên và ghi chú loại đối tác; nhật ký loại đối tác ghi mã`.

### Task 4: Route sửa cấp đại lý + nhật ký có mã

**Files:**
- Modify: `src/modules/pricing/index.ts` (route `PATCH /api/pricing/muc-ta/:code`, `doiTrangThaiMuc`, route thêm mức), `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `src/shared/lich-su-doi-tac.ts`, `src/shared/lich-su-noi-bo.ts`
- Test: `src/modules/pricing/sua-muc-ta.test.ts` (mới, khung như `muc-ta.test.ts`)

**Interfaces:**
- Consumes: `kiemGhiChu`, `kiemTenMucTa`, `suaMucTaStatement`.
- Produces: `MucTaDto` thêm `ghiChu, taoLuc, taoBoi, suaLuc, suaBoi, updatedAt: string, soLoai: number, soDoiTac: number` (`soLoai` = gắn loại↔cấp đang/sắp hiệu lực; `soDoiTac` = gắn riêng đang/sắp hiệu lực). Thân `PATCH` `{ ten?, ghiChu?, updatedAt: string }`; lỗi như Task 3 (trùng tên ⇒ 409 `muc_trung`, câu «Đã có cấp đại lý tên này.»).
- Produces: hành động `prc_rate_tier_renamed` («Đổi tên cấp đại lý»), `prc_rate_tier_note` («Sửa ghi chú cấp đại lý»); `prc_rate_tier_added/off/on` thêm `targetId`.

- [ ] **Step 1: Test đỏ** — A1, A2, A4, A5, A6, A7 phiên bản cấp (cùng tài khoản, cùng kỳ vọng), cộng: cấp đang khoá đổi tên được; lưu không đổi ⇒ 0 dòng nhật ký; tên cấp mới hiện ở `GET /api/pricing/muc-ta` và trong `gan[].tenMuc` của gắn riêng.
- [ ] **Step 2: Chạy** `node --test src/modules/pricing/sua-muc-ta.test.ts` — Expected: FAIL.
- [ ] **Step 3: Viết route** theo đúng khuôn Task 3 (409 khi UNIQUE `name_key` ⇒ `muc_trung`).
- [ ] **Step 4: Chạy** lại + `node --test src/modules/pricing/muc-ta.test.ts src/modules/pricing/gan-rieng-route.test.ts` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(hoa-hong): sửa tên và ghi chú cấp đại lý; nhật ký cấp ghi mã`.

### Task 5: Giao diện — nút Sửa, hộp sửa chung, mã hiện ra

**Files:**
- Modify: `web/hoa-hong-loai.ts`, `web/hoa-hong-cap.ts`, `web/hoa-hong-hop.ts`, `public/app.css` (chỉ nếu cần lớp mới, giá trị qua token), `src/shared/huong-dan-ke-toan.ts` (mục «Thêm loại đối tác» + «Cấp đại lý»: thêm bước Sửa), `src/shared/so-do-trang.ts` (nút «Sửa»)
- Test: `src/shared/hien-thi-ma.test.ts` (mới) cho hàm thuần dưới

**Interfaces:**
- Produces (thuần, `src/shared/hien-thi-ma.ts`): `nhanMa(code: string, coSan: boolean): string` — `coSan` ⇒ «Loại gốc của hệ thống — mã cố định», ngược lại trả `code`. `nhanDauVet(luc: string | null, boi: string | null, kieu: "tao" | "sua"): string` — `luc` null & `kieu = "tao"` ⇒ «Tạo trước 31/10/2026 — chưa có dấu vết»; có ⇒ «Tạo bởi Lan Kế Toán lúc 14:05 31/10/2026» (giờ VN).
- Hộp: `mo.suaDanhMuc({ loai: "LOAI" | "CAP", code, ten, ghiChu, updatedAt, coSan, dauVet, soNoi })` trong `hoa-hong-hop.ts`; gửi `PATCH`, 409 `da_doi` ⇒ hiện câu lỗi máy chủ và nút «Mở lại»; 200 ⇒ đóng hộp, vẽ lại thẻ.

- [ ] **Step 1: Test đỏ** `hien-thi-ma.test.ts` cho hai hàm (đủ ba nhánh mỗi hàm, giờ VN qua `vnToday`-kiểu chuyển UTC+7).
- [ ] **Step 2: Chạy** — FAIL; **Step 3:** viết hàm + giao diện: nút «Sửa» (chỉ khi `can(nguoiDung, "partner.commission.write")`) ở đầu mỗi cụm loại / cấp; dòng mã mờ dưới tên + nút «Chép mã» (ẩn với loại Có sẵn); hộp gồm Mã (chỉ đọc), Tên, Ghi chú (`textarea`, 16px, đếm chữ /500), dấu vết, «Đang dùng: N hồ sơ» / «N loại · N đối tác»; với loại Có sẵn thêm câu «Tên này cũng hiện trên màn tài khoản của đối tác.».
- [ ] **Step 4: Chạy** `node --test src/shared/hien-thi-ma.test.ts` + `npm run typecheck` + `npm run build:web` — Expected: PASS, 0 lỗi, gói Hoa hồng không vượt trần (bài trần gói trong `npm test`, chạy ở Task 6).
- [ ] **Step 5: Commit** `feat(giao-dien): nút Sửa và mã định danh ở thẻ Loại đối tác, Các cấp đại lý`.

### Task 6: Hiến chương 5.26, tài liệu mô tả, nhật ký thay đổi, bộ kiểm dài

**Files:**
- Modify: `docs/ARCHITECTURE.md` (Phần I: điều 5.26 nguyên văn từ spec §2; dòng Trạng thái: «5.26 (2026-10-31, chủ duyệt trong phiên chat — spec `2026-10-31-ma-dinh-danh-…`)»; bảng thi hành: dòng 5.26 = «bài `src/shared/ma-dinh-danh.test.ts`; phần "máy cấp, không ô sửa" dựa vào kỷ luật»), `docs/SYSTEM-DESIGN.md` (§ loại đối tác / mức TA: route mới), `docs/CHANGE-GUIDE.md` (công thức «thêm loại bản ghi có mã mới ⇒ khai tiền tố ở `ma-dinh-danh.ts`»), `src/shared/changelog.ts` (mục bản kế tiếp sau bản lớn nhất trên `main` lúc thi công; chữ cho người dùng: «Sửa được tên và ghi chú của loại đối tác, cấp đại lý; mã định danh hiện ra để chép.»), `docs/BACKLOG.md` (mục nợ: rà khuôn mã toàn Nền tảng theo 5.26 — danh sách nợ ở spec §2), `tests/e2e/loai-doi-tac.mjs`, `tests/e2e/muc-ta.mjs`
- Sửa `docs/ARCHITECTURE.md` bằng công cụ sửa tệp (luật — hook chặn sửa bằng dòng lệnh).

- [ ] **Step 1: e2e đỏ trước** — trong `tests/e2e/loai-doi-tac.mjs` thêm A9: xác nhận một đơn có hoa hồng theo loại tự thêm, đổi tên loại, đọc lại đơn ⇒ số tiền hoa hồng giữ nguyên; ghi rõ trong bài bản chụp đơn có chép chữ tên hay không (spec §3). `muc-ta.mjs`: đổi tên cấp ⇒ `GET` thấy tên mới, mã giữ.
- [ ] **Step 2: Grep chữ tên năm loại có sẵn viết cứng** trong `tests/`, `src/**/*.test.ts`, `src/shared/huong-dan-*.ts`: chỗ nào so bằng chữ tên để nhận loại thì chuyển sang so mã (ghi danh sách trong commit).
- [ ] **Step 3: Viết tài liệu + nhật ký thay đổi** như danh sách Files.
- [ ] **Step 4: Bộ kiểm dài, một lần:** `npm run typecheck` (0 lỗi) → `npm test` (thoát 0) → `npm run test:e2e -- loai-doi-tac muc-ta` (cần mạng) → kịch bản Chrome trang Hoa hồng theo bảng ở `web/CLAUDE.md` (có `AXE_JS`), ảnh hai khổ (máy tính, điện thoại) vào `docs/evidence/`.
- [ ] **Step 5: Commit** `docs(luat): điều 5.26 mã định danh; tài liệu và nhật ký thay đổi cho nút Sửa`.

### Task 7: Kiểm độc lập (việc lớn — CLAUDE.md §3)

- [ ] **Step 1:** Giao subagent `nguoi-kiem-doc-lap` (chỉ đọc): đọc spec + kế hoạch + diff nhánh; chạy lại `npm run typecheck`, `npm test`, hai bài e2e; kiểm riêng: hai lớp chặn đổi tên vai nội bộ (route **và** câu SQL — thử bỏ kiểm route trong đầu, câu SQL vẫn 0 dòng?), nhật ký ghi chú không chứa nội dung, mọi dòng `prc_partner_type_%`/`prc_rate_tier_%` mới có `target_id`, migration `0130` không đụng tệp cũ, bảng tiền tố đã quan sát chặn thật.
- [ ] **Step 2:** Chỉ báo «đạt» dựa trên báo cáo đó + test. Lỗi tìm được ⇒ sửa (đỏ trước, xanh sau), giao kiểm lại phần sửa.
- [ ] **Step 3:** Báo chủ theo bốn mục; đưa lệnh nhập bản chính (`npm run day-len`) và nói rõ **cần triển khai** (`npm run trien-khai`, có migration `0130`) — chủ tự chạy.
