-- Migration 0154 — ADR-0194 (accepted 2026-11-09) đợt 1: chính sách hiện / ẩn / bắt buộc theo màn × trường × mã quyền do Toàn quyền đặt. Module giao-dien (tiền tố `gd_`).
-- CHỈ THÊM (expand): MỘT bảng mới, hai trigger mới, MỘT chỉ mục; không đụng bảng/trigger cũ. Bảng RỖNG khi phát hành (không gieo dòng) ⇒ mọi màn giữ nguyên hành vi hôm nay.
-- Số: ngày 09/11, mọi nhánh (cục bộ lẫn xa) tới `0153_thanh_duoi_ghim` ⇒ `0154`.
-- Khuôn `ord_partner_customer_policy` (0133): đổi = chèn dòng mới; dòng hiệu lực = `valid_from_at` lớn nhất ≤ bây giờ theo (man, truong, quyen). Đặt lại mặc định = chèn dòng 'HIEN'.
-- Tên bảng dùng tiền tố `gd_` của module giao-dien (kế hoạch ghi `ui_field_policy`; tiền tố `ui_` chưa khai ở `src/architecture.test.ts` và không được nới hàng rào — ghi ở nhật ký thi công).
-- Danh mục màn / trường được chỉnh khai ở CODE (`src/shared/ui-truong.ts`), không CHECK liệt kê ở đây (luật dữ liệu: danh sách giá trị mở kiểm ở mã); máy chủ kiểm từng dòng trước khi ghi
-- và khi ĐỌC bỏ qua dòng ngoài danh mục. Không dữ liệu cá nhân trong cột nào: chỉ mã màn, mã trường, mã quyền, chế độ, mốc giờ, id người ghi.
CREATE TABLE gd_field_policy (
  id             TEXT PRIMARY KEY,
  man            TEXT NOT NULL,
  truong         TEXT NOT NULL,
  quyen          TEXT NOT NULL,
  che_do         TEXT NOT NULL CHECK (che_do IN ('HIEN', 'AN', 'BAT_BUOC', 'TUY_CHON')),
  valid_from_at  TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  UNIQUE (man, truong, quyen, valid_from_at)
);
CREATE INDEX gd_field_policy_o ON gd_field_policy (man, truong, quyen, valid_from_at);
CREATE TRIGGER gd_field_policy_no_update BEFORE UPDATE ON gd_field_policy
BEGIN SELECT RAISE(ABORT, 'gd_policy_append_only: chính sách giao diện chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER gd_field_policy_no_delete BEFORE DELETE ON gd_field_policy
BEGIN SELECT RAISE(ABORT, 'gd_policy_append_only: chính sách giao diện không xoá'); END;
