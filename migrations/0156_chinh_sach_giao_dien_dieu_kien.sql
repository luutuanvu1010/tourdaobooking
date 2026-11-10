-- Migration 0156 — ADR-0195 (accepted 2026-11-10) Đ2: thêm cột `dieu_kien` vào bảng chính sách giao diện `gd_field_policy` (0154).
-- `dieu_kien` NULL = luôn áp (đúng như đợt 1: mọi dòng cũ giữ NULL); khác NULL = chỉ áp cho dịch vụ thoả điều kiện đó (mã khai ở code `src/shared/ui-dieu-kien.ts`: DICH_VU_KHONG_DON, DICH_VU_CO_DON —
-- KHÔNG CHECK liệt kê ở đây, luật dữ liệu: danh sách giá trị mở kiểm ở mã). Dòng có điều kiện thắng khi thoả, dòng trống là mặc định cho phần còn lại (luật giải ở `giaiChinhSach`).
-- Số: ngày 10/11, đã kiểm mọi nhánh (cục bộ lẫn xa) — số lớn nhất đã có là `0155_ve_quet` ⇒ `0156`.
--
-- VÌ SAO DỰNG LẠI BẢNG (không chỉ ALTER): 0154 khai `UNIQUE (man, truong, quyen, valid_from_at)` ở CẤP BẢNG (sqlite_autoindex), SQLite không bỏ được ràng buộc đó bằng ALTER, mà lô lưu chính sách
-- ghi mọi dòng của một lần lưu với CÙNG một mốc — nên dòng «không điều kiện» và dòng «có điều kiện» của cùng một ô sẽ va nhau nếu giữ ràng buộc cũ. Làm theo khuôn 0097 (`prc_commission_rule`):
-- tạo bảng mới → chép nguyên dòng → DROP bảng cũ → đổi tên → dựng lại chỉ mục và HAI trigger chỉ-thêm (`DROP TABLE` không kích hoạt trigger DELETE — xem 0017; trigger đi theo bảng cũ nên phải dựng lại).
-- Không có bảng / view / khoá ngoại nào khác trỏ vào `gd_field_policy` (đã grep `migrations/` và `src/`). Dòng cũ chép NGUYÊN (id, mốc, người ghi) — chỉ-thêm không bị vi phạm vì chép chạy TRƯỚC khi trigger mới tồn tại.
-- Chỉ mục UNIQUE mới dùng `COALESCE(dieu_kien, '')`: «không điều kiện» là MỘT giá trị riêng (NULL thường không bao giờ trùng nhau trong UNIQUE). Bảng RỖNG hoặc chỉ dòng cũ ⇒ hành vi hôm nay không đổi.
-- Không dữ liệu cá nhân trong cột nào (mã màn, mã trường, mã quyền, chế độ, mã điều kiện, mốc giờ, id người ghi).
CREATE TABLE gd_field_policy_moi (
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
  dieu_kien      TEXT
);
INSERT INTO gd_field_policy_moi (id, man, truong, quyen, che_do, valid_from_at, created_at, created_by, updated_at, updated_by, dieu_kien)
  SELECT id, man, truong, quyen, che_do, valid_from_at, created_at, created_by, updated_at, updated_by, NULL FROM gd_field_policy;
DROP TABLE gd_field_policy;
ALTER TABLE gd_field_policy_moi RENAME TO gd_field_policy;
CREATE UNIQUE INDEX gd_field_policy_khoa ON gd_field_policy (man, truong, quyen, COALESCE(dieu_kien, ''), valid_from_at);
CREATE INDEX gd_field_policy_o ON gd_field_policy (man, truong, quyen, dieu_kien, valid_from_at);
CREATE TRIGGER gd_field_policy_no_update BEFORE UPDATE ON gd_field_policy
BEGIN SELECT RAISE(ABORT, 'gd_policy_append_only: chính sách giao diện chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER gd_field_policy_no_delete BEFORE DELETE ON gd_field_policy
BEGIN SELECT RAISE(ABORT, 'gd_policy_append_only: chính sách giao diện không xoá'); END;
