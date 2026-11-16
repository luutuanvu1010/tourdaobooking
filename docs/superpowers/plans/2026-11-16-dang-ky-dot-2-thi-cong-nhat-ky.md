# Nhật ký thi công — đăng ký đối tác đợt 2

> Kế hoạch: `docs/superpowers/plans/2026-11-16-dang-ky-dot-2-ke-hoach.md`. Spec: ADR-0212, ADR-0213 (chủ duyệt 16/11, phát hành trước diễn tập 25/11). Cách thi công: mỗi việc một trợ lý, người kiểm riêng sau mỗi việc (chủ chọn 16/11).

## Task 0 (16/11)

- Nhận `main` cục bộ (d6dda7b7b, đi trước `origin/main` 0669c6e23 một lần lưu, đã chứa `origin/main`) vào nhánh, không xung đột.
- Liệt kê migration mọi nhánh cục bộ, nhánh xa và thư mục `migrations/` của mọi worktree (kể cả tệp chưa lưu): lớn nhất `0172_cap_mac_dinh_dang_ky.sql`.
- Ruling: số migration mốc A = **0173**, tệp `migrations/0173_dang_ky_to_chuc.sql` — số lớn nhất mọi nơi + 1 — sai thì đổi tên tệp trước khi nhập main.
- Ruling (Task 4 vòng sửa): đổi sang 0174 vì nhánh claude/heuristic-turing-a00d98 lấy 0173 (phi_don_chon) sau Task 0; tệp `migrations/0174_dang_ky_to_chuc.sql`.
- `npm run typecheck` 0 lỗi; `src/architecture.test.ts`, `src/migrations-dang-ky.test.ts` 73/73 đạt.

## Ruling và nợ nhỏ

(ghi theo thứ tự task)
- **Soát trước (16/11):** 18 ruling PF1–PF18 sửa thứ tự và chỗ thiếu của kế hoạch (bảng ở sổ điều phối). Đáng báo chủ: gieo mục bắt buộc cho tổ chức làm mọi hồ sơ tổ chức đang có hiện dấu «Chưa xác minh» (dấu chỉ để biết, ADR-0210) — PF6. «Đổi khách» xoá tư cách của đơn (PF10).
- **Task 5 (16/11), ruling của người thi công:**
  - T5-1 `dk_submission_org` thêm `created_by`, `updated_at`, `updated_by` ngoài bảng tên thật của kế hoạch: bài ADR-0003 (`src/architecture.test.ts`) đòi bốn cột kiểm toán ở mọi bảng mới; câu ẩn danh của Task 7 cũng cần `updated_at`.
  - T5-2 Trần CHECK của cột phiếu không rộng hơn cột đích (tên gọi 200, tên pháp lý 300, địa chỉ 300, email 200); cột số và khoá chỉ CHECK độ dài ≤ 40 để dấu ẩn danh `XOA…` (35 ký tự) đi qua. `gpkd_number`, `gpkd_key`, `authority_confirmed_at` NOT NULL (GPKD bắt buộc vì `pty_organization_document` đòi số cho loại GPKD).
  - T5-3 Trigger `dk_submission_org_version` đòi thêm có `dk_submission` cùng phiên bản; `dk_registration_org_match_shape` (chèn + sửa) chặt hơn CHECK của `match_*`: chưa kết luận thì cũng không được có hồ sơ.
  - T5-4 Hình thức phần tổ chức (`kiemPhanToChuc`) chỉ bắt buộc tên tổ chức, số GPKD, xác nhận «được tổ chức cho phép»; tên pháp lý, mã số thuế để mục bắt buộc của tổ chức (dữ liệu `parties`, Task 6) quyết. Khoá mã số thuế = 10 số, có hậu tố thì `-` + 3 số (13 số viết liền cũng ra cùng khoá).
  - T5-5 Luật nối vai lúc gửi: nhánh 2 = vai cá nhân hoặc vai của tổ chức là «chỉ tổ chức» mà không có phần tổ chức (400 `org_section_required`); nhánh 5 = có `org_role_code` mà không có phần tổ chức — đã gửi ⇒ 400 `org_section_locked`, chưa gửi ⇒ 400 `org_section_required` (vai tổ chức không đứng một mình). PUT `loaiToChuc` chỉ nhận vai đang mở có phần ≠ cá nhân và khi phần tổ chức mở (409); vai cá nhân «chỉ tổ chức» bị từ chối ở PUT. Vai của tổ chức bị tắt sau khi chọn không chặn gửi (mục ROLE quyết), cùng khuôn vai cá nhân.
  - T5-6 Câu «Hãy chọn một vai cá nhân» (brief) đổi thành «Hãy chọn một vai người dùng cá nhân.» vì bảng từ ADR-0130 (`src/bang-tu-giao-dien.test.ts`) cấm chữ «vai» trơn; hai câu mới khác cũng viết «vai người dùng».
  - T5-7 Route tải tệp từ chối ô `GPKD`, `GIAY_PHEP_THEM` (409 `org_section_closed`) khi phần tổ chức đóng — để không ảnh tổ chức nào nằm chờ rồi bị lô duyệt cá nhân chuyển sang hồ sơ người.
  - T5-8 R8 xanh: `pty_organization.tax_code` nâng N2 → N3 (sổ dữ liệu, `N3_GHIM`, `COT_N3_NHAT_KY` kiểm R-PD-1, bài phụ trách `src/giay-to-khong-lo-so.test.ts` tạo hồ sơ tổ chức có mã số thuế qua route thật). Biên nhận vẫn in mã số thuế công ty chủ (hạng không cấm DTO); bài biên nhận, công ty chủ, xác nhận đơn xanh. R-PD-1 trên production nay dò mã số thuế mọi hồ sơ tổ chức trong nhật ký — chưa chạy trên D1 thật.
  - T5-9 Minor (b) bỏ qua: bảng tham chiếu chỉ ép tên NÚT (`bang-tham-chieu.test.ts` điều 1–3), không ép nhãn ô; «Giới tính» không cần dòng. Hai dòng khái niệm «Câu báo lỗi của phiếu đăng ký», «Tên mục của phiếu đăng ký» đã cập nhật câu mới.
  - T5-10 Khu tổ chức của biểu mẫu chưa dựng (Task 8): bài khớp cột chiều (1) có hạn `2026-12-31` (`WEB_CHUA_DUNG_TO_CHUC`), quá hạn mà `web/dang-ky.ts` chưa dựng bốn khu tổ chức ⇒ đỏ. `dungThanGui` chưa dựng `toChuc` (Task 8).
- **Nợ cho Task 7 (từ Task 5):** (a) `cauChuyenTepCho` chuyển MỌI ô tệp chờ đã lưu sang hồ sơ người và nối dòng giấy tờ người — phải loại `GPKD`, `GIAY_PHEP_THEM` (chuyển sang hồ sơ tổ chức). (b) Câu ẩn danh bản khai (lô duyệt và tác nhân dọn phiếu) chưa ẩn danh `dk_submission_org`; bất biến kiểm «phiếu kết thúc còn bản khai chưa ẩn danh» (audit-checks) chưa xét bảng này. Tới khi có, không đăng chính sách có dấu thu thông tin tổ chức (ghi ở PHAN-THEM-TO-CHUC.md). (c) Bốn chỗ đỏ có từ trước ở `src/bang-tu-giao-dien.test.ts` («loại đối tác» ở `web/dang-ky-hang-cho.ts`, `dang-ky-chon-vai.ts`, `xac-minh-route.ts`) — không thuộc Task 5.
