-- Migration 0129 — LUẬT BÁN THEO LOẠI ĐỐI TÁC (ADR-0146 Đ1, chủ duyệt 28/10; ADR-0152 Đ2, chủ duyệt 30/10; kế hoạch docs/superpowers/plans/2026-10-30-adr-0146-va-dac-diem-dich-vu-ke-hoach.md T3).
-- Chỉ THÊM một bảng của `pricing` + trigger + chỉ mục. Mỗi dòng = «loại đối tác L KHÔNG được đặt [phạm vi] trong [hiệu lực]». Chỉ có dòng chặn: không cột hay giá trị
-- nào mang nghĩa «cho phép», không phạm vi «mọi dịch vụ» (hàng rào (b), (g)). Ba kiểu phạm vi là tập đóng, CHECK ở CSDL (ADR-0152 Đ2 — đổi bằng ADR).
-- Hiệu lực theo NGÀY dân sự Việt Nam, gồm cả hai đầu (khuôn prc_commission_rule / prc_role_tier). Kế hoạch R-1 (chủ chọn Q-3 (a)): «Kết thúc ngay» = ngày kết thúc
-- max(hôm qua, ngày bắt đầu − 1) ⇒ CHECK cho phép đúng một «khoảng rỗng» (ngày bắt đầu − 1); luật không có cột huỷ.
-- Số 0129: ngay sau 0128 (đặc điểm dịch vụ) — khoá ngoại trỏ hai bảng của 0128, nên hai tệp đi CÙNG một lần phát hành.
-- HOÀN TÁC: D1 không có bước "down". Bảng rỗng không ảnh hưởng mã cũ; muốn gỡ thì một migration SAU bỏ trigger / bảng (khi chưa có luật).

CREATE TABLE prc_sales_block (
  id              TEXT PRIMARY KEY,
  role_type_code  TEXT NOT NULL REFERENCES prc_beneficiary_role (role_type_code),
  scope           TEXT NOT NULL CHECK (scope IN ('SERVICE', 'GROUP', 'ATTRIBUTE')),
  catalog_code    TEXT,
  group_code      TEXT REFERENCES ctl_group (code),
  attribute_code  TEXT REFERENCES ctl_attribute (code),
  value_code      TEXT REFERENCES ctl_attribute_value (code),
  valid_from_date TEXT NOT NULL,
  valid_to_date   TEXT CHECK (valid_to_date IS NULL OR valid_to_date >= date(valid_from_date, '-1 day')),
  note            TEXT CHECK (note IS NULL OR length(note) <= 200),
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT,
  -- SERVICE: chỉ mã dịch vụ (không khoá ngoại, như prc_commission_rule — route kiểm có trong danh mục). GROUP: chỉ mã nhóm.
  -- ATTRIBUTE: đặc điểm + giá trị, không mã dịch vụ; nhóm TUỲ CHỌN (có nhóm thì dịch vụ còn phải thuộc nhóm hiện hành đó — ADR-0152 Đ2 vế 3).
  CHECK ((scope = 'SERVICE' AND catalog_code IS NOT NULL AND group_code IS NULL AND attribute_code IS NULL AND value_code IS NULL)
      OR (scope = 'GROUP' AND group_code IS NOT NULL AND catalog_code IS NULL AND attribute_code IS NULL AND value_code IS NULL)
      OR (scope = 'ATTRIBUTE' AND attribute_code IS NOT NULL AND value_code IS NOT NULL AND catalog_code IS NULL))
);
CREATE INDEX prc_sales_block_role_ix ON prc_sales_block (role_type_code);
CREATE INDEX prc_sales_block_service_ix ON prc_sales_block (scope, catalog_code);
CREATE INDEX prc_sales_block_group_ix ON prc_sales_block (group_code);
CREATE INDEX prc_sales_block_value_ix ON prc_sales_block (value_code);

CREATE TRIGGER prc_sales_block_no_delete BEFORE DELETE ON prc_sales_block
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá luật bán — đặt ngày kết thúc'); END;
-- Chỉ một kiểu sửa: đặt ngày kết thúc MỘT lần (+ người / giờ cập nhật); mọi cột khác giữ nguyên.
CREATE TRIGGER prc_sales_block_close_only BEFORE UPDATE ON prc_sales_block
WHEN OLD.valid_to_date IS NOT NULL OR NEW.valid_to_date IS NULL OR NEW.id IS NOT OLD.id OR NEW.role_type_code IS NOT OLD.role_type_code OR NEW.scope IS NOT OLD.scope
  OR NEW.catalog_code IS NOT OLD.catalog_code OR NEW.group_code IS NOT OLD.group_code OR NEW.attribute_code IS NOT OLD.attribute_code OR NEW.value_code IS NOT OLD.value_code
  OR NEW.valid_from_date IS NOT OLD.valid_from_date OR NEW.note IS NOT OLD.note OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'prc_append_only: luật bán chỉ được đặt ngày kết thúc một lần'); END;
-- ADR-0146 Đ1 bất biến (lớp CSDL, lúc thêm): loại phải nằm trong danh sách được hưởng và đang bật (khuôn prc_role_tier_role_ok, 0096). Tắt loại còn luật: route kiểm (409).
CREATE TRIGGER prc_sales_block_role_ok BEFORE INSERT ON prc_sales_block
WHEN NOT EXISTS (SELECT 1 FROM prc_beneficiary_role b WHERE b.role_type_code = NEW.role_type_code AND b.active = 1)
BEGIN SELECT RAISE(ABORT, 'prc_sales_block_target: loại đối tác không nằm trong danh sách được hưởng hoặc đã tắt'); END;
-- ADR-0152 Đ2 bất biến (lớp CSDL, lúc thêm): giá trị thuộc ĐÚNG đặc điểm ghi trên dòng, giá trị đang dùng VÀ đặc điểm cha đang dùng (siết sau KĐL-1) — đọc view công bố
-- của catalog (pricing → catalog đã khai). Thiếu đặc điểm / giá trị thì để CHECK của bảng báo (trigger BEFORE chạy trước CHECK).
CREATE TRIGGER prc_sales_block_value_ok BEFORE INSERT ON prc_sales_block
WHEN NEW.scope = 'ATTRIBUTE' AND NEW.attribute_code IS NOT NULL AND NEW.value_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM v_ctl_attribute_value v WHERE v.code = NEW.value_code AND v.attribute_code = NEW.attribute_code AND v.active = 1 AND v.attribute_active = 1)
BEGIN SELECT RAISE(ABORT, 'prc_sales_block_value: giá trị không thuộc đặc điểm, hoặc giá trị hay đặc điểm đang tắt'); END;
