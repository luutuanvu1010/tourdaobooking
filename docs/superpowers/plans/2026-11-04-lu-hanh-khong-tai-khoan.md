# Công ty lữ hành chưa có tài khoản hưởng theo cấp — kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps dùng checkbox (`- [ ]`).

**Goal:** hồ sơ chưa có tài khoản, cả tổ chức, mang được năm vai bên ngoài ở Danh bạ, hưởng hoa hồng theo cấp qua «Đặt qua đối tác», mà không sinh đăng nhập.

**Architecture:** không migration, không ô quyền mới. Mở chỗ chặn `isAccountGroup` ở hai route vai của `src/modules/parties/index.ts` theo một điều kiện duy nhất. Mọi chốt ở lớp route, mỗi chốt có dòng sổ và một lần quan sát chặn.

**Tech Stack:** TypeScript, Worker + D1, `node --test`, khung thử `tests/audit/harness.mjs`, e2e `tests/e2e`.

**Spec:** `docs/adr/ADR-0155-vai-doc-lap-voi-tai-khoan-va-cot-cap-o-quan-ly-tai-khoan.md` (Đ1, C3, C4, C6, tiêu chí h–l; chủ duyệt 2026-11-04, nguyên văn «Duyệt cả ba»); đặc tả `docs/superpowers/specs/2026-11-01-dat-ve-doi-tac-design.md` §8 QĐ-C (a)(b)(c)(d)(g); trang ghép `docs/superpowers/specs/2026-11-03-trang-ghep-lu-hanh-khong-tai-khoan.md`. ADR thắng khi lệch.

## Global Constraints

- Năm vai: `TRAVEL_AGENCY`, `GUIDE_FREELANCE`, `HOTEL_RECEPTION`, `TAXI_DRIVER`, `COLLABORATOR`. `DRIVER_EXTERNAL` và vai `INTERNAL` vẫn 409 `role_via_account`.
- Chưa có tài khoản = không có dòng `staff` trỏ hồ sơ, kể cả tài khoản đã ngưng.
- Không thêm migration, không thêm ô quyền, không đổi công thức hoa hồng. Thấy cần thì DỪNG, báo điều phối.
- Không ghi SĐT, email, MST vào nhật ký hay câu báo. Chữ tiếng Việt có dấu, gọi «vai trò», qua được bài bảng từ `src/shared/bang-tu-giao-dien.ts`. Giao diện theo `web/CLAUDE.md`.
- Module chỉ đọc chéo qua `index.ts` hoặc view `v_<tiền tố>_*`, hoặc giá trị gốc lắp ráp tiêm (khuôn `ctx.partyAccount`, `ngoai.phuTrachDon` của gộp). `src/architecture.test.ts` phải xanh.
- Mỗi bài đỏ trước, xanh sau. Chỉ chạy `node --test` từng tệp; `npm test` đầy đủ và e2e đầy đủ do điều phối chạy một lần ở cuối. Không `git push`, không merge vào `main`.

## Review Focus

Mỗi dòng có bài ở task sở hữu.

1. Hồ sơ mang hai trong năm vai, còn nháp: gỡ một vai vẫn được vì còn vai hưởng; gỡ vai cuối mới bị chặn (Task 2).
2. Đơn đã xác nhận hoặc đã huỷ đứng tên hồ sơ không chặn gỡ; đơn chờ xác nhận thì chặn như nháp (Task 2).
3. Mức riêng của hồ sơ còn hiệu lực, không phải chỉ cấp riêng: gỡ vai cuối bị chặn, nếu không `R-PRC-5` báo lỗi sau đó (Task 2).
4. Hồ sơ công ty chủ, hồ sơ đã gộp, hồ sơ ngưng dùng: không gắn được năm vai (Task 1).
5. Gỡ rồi gắn lại trong ngày: 409 `role_overlap` với câu tiếng Việt dễ hiểu, không lỗi thô (Task 1).

---

### Task 1: Mở năm vai ở hai route, kèm chốt và sổ hàng rào (Đ1.1–5, C6)

**Files:** Modify `src/modules/parties/index.ts` (hai dòng gọi `isAccountGroup`), `src/shared/roles.ts`, `src/shared/booker.ts` (chú thích), `docs/SO-HANG-RAO.md` (dòng `role_via_account`). Test: tạo `src/modules/parties/vai-khong-tai-khoan-route.test.ts`; đảo có chủ đích `src/modules/pricing/loai-doi-tac.test.ts` (N-3), `tests/e2e/parties.mjs`, `tests/e2e/so-dai-ly.mjs`; giữ `tests/e2e/roles.mjs`.

**Interfaces — Produces:** `vaiMoChoHoSoKhongTaiKhoan(code: string): boolean` ở `src/shared/roles.ts`: đúng khi vai nhóm `EXTERNAL` và `defaults` có `PARTNER`.

- [ ] Viết bài đỏ, mỗi ca qua route thật: PERSON và ORG không tài khoản gắn từng vai trong năm ⇒ 201, không sinh dòng `staff`, không sinh `stf_permission`. Hồ sơ có tài khoản đang chạy ⇒ 409 `role_via_account`; có tài khoản đã ngưng ⇒ 409. `DRIVER_EXTERNAL`, `SALES_STAFF` ⇒ 409. Hồ sơ nội bộ ⇒ 409 `ROLE_PARTNER_LABEL_CONFLICT` hiện có. Có nơi ⇒ 400; `from` tương lai ⇒ 400; có `to` ⇒ 400; gỡ với ngày tương lai ⇒ 400. Công ty chủ ⇒ 403 hoặc 409 theo cổng sẵn có, không 201; đã gộp ⇒ cổng `DA_GOP`; ngưng dùng ⇒ 409. Gỡ rồi gắn lại trong ngày ⇒ 409 `role_overlap`, câu tiếng Việt. Kế toán ⇒ 403.
- [ ] Chạy thấy đỏ: `node --test src/modules/parties/vai-khong-tai-khoan-route.test.ts`.
- [ ] Thi công: thêm `vaiMoChoHoSoKhongTaiKhoan`. Ở route tạo: `isAccountGroup` chỉ trả `ACCOUNT_ROLE` khi KHÔNG (`vaiMoChoHoSoKhongTaiKhoan(code)` và `!acc.linked`); cho năm vai dùng lại các chốt của `loai?.partnerLabel` bằng điều kiện `partnerLabel || moKhongTaiKhoan`, thêm chốt không gắn nơi, thêm chặn hồ sơ ngưng dùng. Route gỡ: tương tự với `row.code`, chốt ngày tương lai cùng điều kiện.
- [ ] Chạy thấy xanh, cùng `node --test src/modules/pricing/loai-doi-tac.test.ts` đã đảo N-3 (`TRAVEL_AGENCY` trên tổ chức không tài khoản nay 201; đối chứng 409 chuyển sang `SALES_STAFF`).
- [ ] Viết lại dòng `role_via_account` ở `docs/SO-HANG-RAO.md`; thêm dòng cho các chốt mới. Phá thử cố ý từng chốt (xoá chốt ⇒ bài đỏ ⇒ hoàn nguyên), ghi ngày 2026-11-04 và kết quả vào sổ. Ghi rõ «chỉ lớp route, CSDL chỉ đỡ `pty_party_role_group_conflict`, `party_role_overlap`».
- [ ] Commit.

### Task 2: Chặn gỡ khi còn việc dở (C3)

**Files:** Modify `src/modules/parties/index.ts` (route gỡ), `src/shared/roles.ts` nếu cần, gốc lắp ráp nếu tiêm. Test: `src/modules/parties/vai-khong-tai-khoan-route.test.ts`.

**Interfaces — Consumes:** `vaiMoChoHoSoKhongTaiKhoan`. **Produces:** mã lỗi 409 `role_end_has_open_work`.

- [ ] Viết bài đỏ: gỡ vai CUỐI CÙNG được hưởng của hồ sơ không tài khoản ⇒ 409 `role_end_has_open_work` khi (a) còn đơn chưa xác nhận đứng tên (`booker_party_id`): nháp, chờ xác nhận; câu nêu tối đa 5 mã đơn và tổng số; (b) còn cấp riêng mở (`prc_party_tier`); (c) còn mức riêng của hồ sơ còn hiệu lực. Câu nói rõ lối ra: «xử lý đơn nháp, kết thúc cấp riêng, ngừng mức riêng, rồi gỡ». Đối chứng: đơn đã xác nhận hoặc đã huỷ ⇒ 200; còn vai hưởng khác ⇒ 200; gỡ sau khi xử lý xong ⇒ 200; đơn đã xác nhận giữ nguyên bản chụp hoa hồng.
- [ ] Chạy thấy đỏ.
- [ ] Thi công: đọc ba điều kiện theo đúng định nghĩa `R-PRC-5` và trạng thái đơn hiện có, không viết luật thứ hai nếu đã có hàm; đọc chéo theo Global Constraints. Chỉ áp cho năm vai trên hồ sơ không tài khoản; loại tự thêm và đường Quản lý tài khoản giữ nguyên, ghi vào mục Nợ của `docs/superpowers/plans/2026-11-03-hoan-thien-hoa-hong-bang-viec.md`.
- [ ] Chạy thấy xanh; phá thử một lần; thêm dòng sổ `docs/SO-HANG-RAO.md`.
- [ ] Commit.

### Task 3: Gộp hồ sơ, kiểm định kỳ, luồng tiền và tạo tài khoản (Đ1.4, Đ1.6, Đ1.7, C4, tiêu chí c, d, g, j)

**Files:** Modify `src/modules/parties/index.ts` (`nhanDoiTac` khoảng dòng 352), `src/modules/parties/gop.ts` (câu `merge_source_account_role`), `scripts/audit-checks.mjs` (`R-PRC-6`). Test: `src/modules/parties/gop*.test.ts`, `src/audit-*.test.ts` cạnh `R-PRC-6`, `vai-khong-tai-khoan-route.test.ts`; tạo ca trong `tests/e2e/so-dai-ly.mjs`.

- [ ] Viết bài đỏ: gộp hồ sơ mang vai cũ `STAFF` với hồ sơ mang năm vai bị chặn `merge_partner_label_internal`; `R-PRC-6` bắt hồ sơ mang năm vai còn vai nội bộ, vai cũ `STAFF`/`SALES`, hoặc tài khoản giữ quyền nội bộ; câu `merge_source_account_role` khi hồ sơ không tài khoản trỏ Danh bạ, không trỏ Quản lý tài khoản, và nhắc thứ tự của C3.
- [ ] Viết bài ghim, xanh ngay thì vẫn giữ, phải quan sát chặn một lần: Hành chính nhân sự `GET /api/staff/ho-so-khop` thấy id, tên, vai của hồ sơ loại này (C4); tạo tài khoản cá nhân đã gắn `COLLABORATOR` ⇒ 201, quyền `PARTNER` sinh đúng lúc, cấp riêng còn; tổ chức ⇒ 409 như cũ; `R-LC-1`, `R-PRC-*` xanh trên dữ liệu thử có hồ sơ loại này.
- [ ] Viết ca e2e trong `tests/e2e/so-dai-ly.mjs`: tổ chức không tài khoản gắn `TRAVEL_AGENCY`, gắn cấp, văn phòng chọn «Qua đối tác», xác nhận đơn, hoa hồng đúng cấp, Đã giao ghi sổ đúng, đổi cấp sau đó đơn cũ không đổi. Gỡ phần ghi chú lệch ở đầu tệp.
- [ ] Thi công, chạy xanh các tệp trên, chạy `npm run test:e2e -- so-dai-ly parties roles`.
- [ ] Commit.

### Task 4: Giao diện, tài liệu, nhật ký thay đổi

**Files:** Modify `web/parties.ts`, `src/shared/contracts.ts` nếu DTO thiếu, `src/modules/billing/phan-dinh.ts` (`dungPhieu`, trường cho biết bên chịu có tài khoản) và màn phân định ở `web/`; `src/shared/changelog.ts`, `src/shared/app-info.test.ts`; `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, hướng dẫn Kế toán và Quản trị nếu máy canh đòi; `docs/superpowers/plans/2026-11-03-hoan-thien-hoa-hong-bang-viec.md`; `tests/e2e/README.md` (dòng «để sau» ngày 2026-10-09).

- [ ] Viết bài đỏ cho DTO: phiếu phân định có bên chịu không tài khoản trả cờ `benChiuKhongTaiKhoan: true`.
- [ ] Thi công: Danh bạ hiện năm vai trong ô gắn vai khi `!p.accountLinked`, ẩn ô «Nơi làm» với năm vai; câu lỗi 409 hiện nguyên văn máy chủ. Màn phân định, khi có cờ, hiện đúng một dòng: «Bên này chưa có tài khoản nên không nhận được tin và không phản hồi trên Nền tảng; văn phòng cần báo trực tiếp.»
- [ ] Thêm mục đầu `changelog.ts`, `version: "2.60"`, `date: "2026-11-04"`, `kind: "moi"`, `text: "Công ty lữ hành và đối tác chưa có tài khoản nay gắn được vai trò ở Danh bạ và hưởng hoa hồng theo cấp."`. Sửa bài ghim ở `app-info.test.ts`.
- [ ] Cập nhật tài liệu mô tả; trạng thái Việc 1 trong bảng việc thành «đã thi công, chờ kiểm». Chạy `npm run typecheck` (0 lỗi), `npm run build:web`, các tệp bài liên quan.
- [ ] Chụp ảnh thật hai khổ của Danh bạ và màn phân định bằng kịch bản Chrome sẵn có nếu chạy được; không được thì ghi rõ chưa chạy.
- [ ] Commit, báo điều phối: đã chạy gì, chưa chạy gì, lệch kế hoạch nào. Không tự nghiệm thu.
