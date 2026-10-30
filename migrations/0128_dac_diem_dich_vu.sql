-- Migration 0128 — ĐẶC ĐIỂM DỊCH VỤ (ADR-0152 Đ1, chủ duyệt 2026-10-30; kế hoạch docs/superpowers/plans/2026-10-30-adr-0146-va-dac-diem-dich-vu-ke-hoach.md T1).
-- Chỉ THÊM ba bảng của `catalog`, hai view công bố (chỉ khoá, không tên — hàng rào (l2)) và trigger. KHÔNG gieo đặc điểm / giá trị nào (ADR-0152 A-C3, hàng rào (j)):
-- Quản trị nhập trên màn sau khi phát hành; mã chạy không biết tên, mã đặc điểm nào. Số 0128: main dừng ở 0127 (30/10), không nhánh chưa gộp nào giữ số lớn hơn.
-- Phải vào CÙNG lần phát hành với 0129 (luật bán) hoặc trước: khoá ngoại của `prc_sales_block` trỏ hai bảng định nghĩa ở đây.
-- HOÀN TÁC: D1 không có bước "down". Ba bảng rỗng không ảnh hưởng mã cũ; muốn gỡ thì một migration SAU bỏ view / trigger / bảng (khi chưa có dữ liệu).

-- ===== Đặc điểm: tắt = active 0 (không xoá); tên trùng chỉ cấm giữa các đặc điểm đang dùng (khuôn ctl_group, 0055) ==============================
CREATE TABLE ctl_attribute (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  sort_order  INTEGER NOT NULL,
  active      INTEGER NOT NULL CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
CREATE UNIQUE INDEX ctl_attribute_name_active ON ctl_attribute (name) WHERE active = 1;CREATE TRIGGER ctl_attribute_no_delete BEFORE DELETE ON ctl_attribute
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: đặc điểm dịch vụ không xoá được — tắt đặc điểm'); END;
CREATE TRIGGER ctl_attribute_keep_key BEFORE UPDATE ON ctl_attribute
WHEN NEW.code IS NOT OLD.code OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: không đổi mã hay dấu vết tạo của đặc điểm'); END;

-- ===== Giá trị của một đặc điểm: mã duy nhất TOÀN bảng; tên trùng chỉ cấm giữa các giá trị đang dùng của CÙNG đặc điểm ===========================
CREATE TABLE ctl_attribute_value (
  code           TEXT PRIMARY KEY,
  attribute_code TEXT NOT NULL REFERENCES ctl_attribute (code),
  name           TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  sort_order     INTEGER NOT NULL,
  active         INTEGER NOT NULL CHECK (active IN (0, 1)),
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT
);
CREATE UNIQUE INDEX ctl_attribute_value_name_active ON ctl_attribute_value (attribute_code, name) WHERE active = 1;
CREATE INDEX ctl_attribute_value_attribute_ix ON ctl_attribute_value (attribute_code);
CREATE TRIGGER ctl_attribute_value_no_delete BEFORE DELETE ON ctl_attribute_value
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: giá trị đặc điểm không xoá được — tắt giá trị'); END;
CREATE TRIGGER ctl_attribute_value_keep_key BEFORE UPDATE ON ctl_attribute_value
WHEN NEW.code IS NOT OLD.code OR NEW.attribute_code IS NOT OLD.attribute_code OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: không đổi mã, đặc điểm hay dấu vết tạo của giá trị'); END;

-- ===== Gắn giá trị cho MỘT dịch vụ hoặc MỘT nhóm (khuôn 0127): dòng mở = valid_to_at NULL; đổi = đóng dòng cũ + chèn dòng mới; «theo nhóm» = KHÔNG có dòng mở ====
-- Mọi khoá ngoại MỘT cột trỏ khoá chính (bài «khoá ngoại xuyên module» của architecture.test.ts). «Giá trị thuộc đúng đặc điểm» do trigger canh, không khoá ngoại hai cột.
CREATE TABLE ctl_attribute_assignment (
  id             TEXT PRIMARY KEY,
  service_code   TEXT REFERENCES catalog_item (code),
  group_code     TEXT REFERENCES ctl_group (code),
  attribute_code TEXT NOT NULL REFERENCES ctl_attribute (code),
  value_code     TEXT NOT NULL REFERENCES ctl_attribute_value (code),
  valid_from_at  TEXT NOT NULL,
  valid_to_at    TEXT,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  CHECK ((service_code IS NULL) <> (group_code IS NULL)),
  CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at)
);
-- Tối đa MỘT dòng mở mỗi (dịch vụ, đặc điểm) và mỗi (nhóm, đặc điểm): view không bao giờ nhân dòng; hai lệnh đua cùng mở dòng → lệnh sau bị chặn (→ 409).
CREATE UNIQUE INDEX ctl_attribute_assignment_service_open ON ctl_attribute_assignment (service_code, attribute_code) WHERE valid_to_at IS NULL AND service_code IS NOT NULL;
CREATE UNIQUE INDEX ctl_attribute_assignment_group_open ON ctl_attribute_assignment (group_code, attribute_code) WHERE valid_to_at IS NULL AND group_code IS NOT NULL;
CREATE INDEX ctl_attribute_assignment_value_ix ON ctl_attribute_assignment (value_code);
CREATE TRIGGER ctl_attribute_assignment_no_delete BEFORE DELETE ON ctl_attribute_assignment
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: gắn đặc điểm chỉ thêm'); END;
-- Chỉ một kiểu sửa: ĐÓNG dòng đang mở (đặt valid_to_at + updated_at / updated_by = người đóng), mọi cột khác giữ nguyên; dòng đã đóng không sửa nữa.
CREATE TRIGGER ctl_attribute_assignment_only_close BEFORE UPDATE ON ctl_attribute_assignment
WHEN OLD.valid_to_at IS NOT NULL OR NEW.valid_to_at IS NULL OR NEW.id IS NOT OLD.id OR NEW.service_code IS NOT OLD.service_code OR NEW.group_code IS NOT OLD.group_code
  OR NEW.attribute_code IS NOT OLD.attribute_code OR NEW.value_code IS NOT OLD.value_code OR NEW.valid_from_at IS NOT OLD.valid_from_at
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: chỉ được đóng dòng gắn đặc điểm đang mở'); END;
CREATE TRIGGER ctl_attribute_assignment_value_of_attribute BEFORE INSERT ON ctl_attribute_assignment
WHEN NOT EXISTS (SELECT 1 FROM ctl_attribute_value v WHERE v.code = NEW.value_code AND v.attribute_code = NEW.attribute_code)
BEGIN SELECT RAISE(ABORT, 'ctl_attribute_mismatch: giá trị không thuộc đặc điểm ghi trên dòng'); END;
CREATE TRIGGER ctl_attribute_assignment_active BEFORE INSERT ON ctl_attribute_assignment
WHEN NOT EXISTS (SELECT 1 FROM ctl_attribute a WHERE a.code = NEW.attribute_code AND a.active = 1)
  OR NOT EXISTS (SELECT 1 FROM ctl_attribute_value v WHERE v.code = NEW.value_code AND v.active = 1)
  OR (NEW.group_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ctl_group g WHERE g.code = NEW.group_code AND g.active = 1))
BEGIN SELECT RAISE(ABORT, 'ctl_attribute_inactive: đặc điểm, giá trị hoặc nhóm đang tắt'); END;

-- ===== Kế hoạch R-8 (chỉ siết): tắt đặc điểm / giá trị còn dòng gắn mở bị CSDL từ chối — hết khe đua giữa route kiểm (409 attribute_in_use) và ghi ============
CREATE TRIGGER ctl_attribute_off_in_use BEFORE UPDATE OF active ON ctl_attribute
WHEN NEW.active = 0 AND OLD.active = 1 AND EXISTS (SELECT 1 FROM ctl_attribute_assignment s WHERE s.attribute_code = NEW.code AND s.valid_to_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'ctl_attribute_in_use: đặc điểm còn dịch vụ hoặc nhóm đang mang — bỏ giá trị trước khi tắt'); END;
CREATE TRIGGER ctl_attribute_value_off_in_use BEFORE UPDATE OF active ON ctl_attribute_value
WHEN NEW.active = 0 AND OLD.active = 1 AND EXISTS (SELECT 1 FROM ctl_attribute_assignment s WHERE s.value_code = NEW.code AND s.valid_to_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'ctl_attribute_in_use: giá trị còn dịch vụ hoặc nhóm đang mang — bỏ giá trị trước khi tắt'); END;

-- ===== View công bố (chỉ khoá). Giá trị HIỆU LỰC của mỗi dịch vụ cho mỗi đặc điểm: dòng mở của chính dịch vụ (SERVICE); không có thì dòng mở của NHÓM HIỆN HÀNH
-- đang dùng (GROUP — nhóm tắt coi như Chưa phân loại, như 0121/0127); không có cả hai ⇒ KHÔNG có dòng (= chưa khai). MỘT nguồn sự thật cho «riêng thắng chung».
CREATE VIEW v_ctl_service_attribute AS
  SELECT i.code AS catalog_code,
         a.code AS attribute_code,
         COALESCE(s.value_code, g.value_code) AS value_code,
         CASE WHEN s.value_code IS NOT NULL THEN 'SERVICE' ELSE 'GROUP' END AS source
  FROM catalog_item i
  CROSS JOIN ctl_attribute a
  LEFT JOIN ctl_attribute_assignment s ON s.service_code = i.code AND s.attribute_code = a.code AND s.valid_to_at IS NULL
  LEFT JOIN v_ctl_service_group sg ON sg.catalog_code = i.code
  LEFT JOIN ctl_group gr ON gr.code = sg.group_code AND gr.active = 1
  LEFT JOIN ctl_attribute_assignment g ON g.group_code = gr.code AND g.attribute_code = a.code AND g.valid_to_at IS NULL
  WHERE COALESCE(s.value_code, g.value_code) IS NOT NULL;

-- Để `pricing` kiểm «luật trỏ giá trị đang dùng, thuộc đúng đặc điểm» (ADR-0152 Đ2) mà không đọc bảng của `catalog`.
CREATE VIEW v_ctl_attribute_value AS
  SELECT attribute_code, code, active FROM ctl_attribute_value;
