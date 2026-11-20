-- Migration 0180 — NGỪNG BÁN THEO NGÀY KHỞI HÀNH (ADR-0220 Đ1, chủ duyệt 2026-11-20).
-- Chỉ THÊM một bảng của `catalog` (tiền tố `ctl_`, ADR-0058) + trigger + chỉ mục. Mỗi dòng = «dịch vụ D (hoặc mọi dịch vụ đang thuộc nhóm G) KHÔNG bán cho ngày khởi hành
-- trong [from_date, to_date]», ngày dân sự Việt Nam, gồm cả hai đầu. Không có phạm vi «mọi dịch vụ», không có cột mang nghĩa «cho phép».
-- Bảng chỉ thêm: cấm xoá; chỉ một kiểu sửa là đặt mốc kết thúc (`ended_at`, kèm `updated_at` / `updated_by` = lúc và người kết thúc) MỘT lần. Khoảng còn chặn khi `ended_at IS NULL`.
-- «Ngày cuối không ở quá khứ lúc tạo» kiểm ở máy chủ (CSDL không biết hôm nay theo giờ Việt Nam).
-- Số 0180: 0178, 0179 đang do nhánh phí đón từ giá gốc (ADR-0218) giữ, chưa nhập main (kiểm 20/11).
-- HOÀN TÁC: D1 không có bước "down". Bảng rỗng không ảnh hưởng mã cũ; muốn gỡ thì một migration SAU bỏ trigger / bảng (khi chưa có khoảng nào).

CREATE TABLE ctl_sales_pause (
  id           TEXT PRIMARY KEY,
  scope        TEXT NOT NULL CHECK (scope IN ('SERVICE', 'GROUP')),
  catalog_code TEXT,
  group_code   TEXT REFERENCES ctl_group (code),
  from_date    TEXT NOT NULL CHECK (from_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  to_date      TEXT NOT NULL CHECK (to_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  note         TEXT CHECK (note IS NULL OR length(note) <= 200),
  created_at   TEXT NOT NULL,
  created_by   TEXT,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT,
  ended_at     TEXT,
  CHECK (to_date >= from_date),
  -- SERVICE: chỉ mã dịch vụ (không khoá ngoại, như prc_sales_block — route kiểm có trong danh mục). GROUP: chỉ mã nhóm.
  CHECK ((scope = 'SERVICE' AND catalog_code IS NOT NULL AND group_code IS NULL)
      OR (scope = 'GROUP' AND group_code IS NOT NULL AND catalog_code IS NULL))
);
CREATE INDEX ctl_sales_pause_service_ix ON ctl_sales_pause (catalog_code);
CREATE INDEX ctl_sales_pause_group_ix ON ctl_sales_pause (group_code);

CREATE TRIGGER ctl_sales_pause_no_delete BEFORE DELETE ON ctl_sales_pause
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: không xoá khoảng ngừng bán — bấm Kết thúc'); END;
CREATE TRIGGER ctl_sales_pause_close_only BEFORE UPDATE ON ctl_sales_pause
WHEN OLD.ended_at IS NOT NULL OR NEW.ended_at IS NULL OR NEW.id IS NOT OLD.id OR NEW.scope IS NOT OLD.scope OR NEW.catalog_code IS NOT OLD.catalog_code
  OR NEW.group_code IS NOT OLD.group_code OR NEW.from_date IS NOT OLD.from_date OR NEW.to_date IS NOT OLD.to_date OR NEW.note IS NOT OLD.note
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: khoảng ngừng bán chỉ được kết thúc một lần'); END;
