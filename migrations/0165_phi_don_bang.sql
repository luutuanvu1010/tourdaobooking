-- ADR-0147 Đ2 + ADR-0203 ĐB1 (kế hoạch Phí đưa đón, Đợt B, Task 5): bảng phí đưa đón của module pricing, mỗi dòng mức mang các điều kiện dạng khoá–giá trị.
-- Giá trị điều kiện là CHỮ, không khoá ngoại ra ngoài pricing (vùng thuộc locations, cấp/nhóm/dịch vụ thuộc catalog): máy chủ kiểm ở lúc ghi.
-- Thiếu mức không bao giờ là 0 đồng (Hiến chương 5.7): miễn phí phải là một dòng amount = 0 được đặt rõ. Chưa gieo dòng mức nào và chưa gieo ngày bắt đầu áp (chưa có dòng = chưa áp).
-- Số 0165: main dừng ở 0162, nhánh ADR-0199 giữ 0163, Đợt A dùng 0164.
-- HOÀN TÁC: D1 không có bước «down». Mã chỉ đọc bảng mới nên chưa triển khai mã thì bảng nằm yên; muốn gỡ thì migration SAU (expand–contract hai lần phát hành).
CREATE TABLE prc_transfer_fee_key (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

INSERT INTO prc_transfer_fee_key (code, name, sort_order, created_at, updated_at) VALUES
  ('ZONE', 'Khu vực đón', 10, '2026-11-14T00:00:00.000Z', '2026-11-14T00:00:00.000Z'),
  ('DIRECTION', 'Chiều đón', 20, '2026-11-14T00:00:00.000Z', '2026-11-14T00:00:00.000Z'),
  ('SERVICE_GROUP', 'Nhóm dịch vụ', 30, '2026-11-14T00:00:00.000Z', '2026-11-14T00:00:00.000Z'),
  ('EXCLUSIVE', 'Xe riêng', 40, '2026-11-14T00:00:00.000Z', '2026-11-14T00:00:00.000Z'),
  ('TIER', 'Cấp đại lý', 50, '2026-11-14T00:00:00.000Z', '2026-11-14T00:00:00.000Z'),
  ('SERVICE', 'Dịch vụ', 60, '2026-11-14T00:00:00.000Z', '2026-11-14T00:00:00.000Z');

CREATE TABLE prc_transfer_fee_rule (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('PER_PAX', 'PER_TRIP')),
  amount INTEGER NOT NULL CHECK (amount >= 0),
  valid_from_date TEXT NOT NULL CHECK (date(valid_from_date) IS valid_from_date),
  valid_to_date TEXT CHECK (valid_to_date IS NULL OR (date(valid_to_date) IS valid_to_date AND valid_to_date >= valid_from_date)),
  condition_sig TEXT NOT NULL CHECK (length(condition_sig) BETWEEN 6 AND 400),
  note TEXT CHECK (note IS NULL OR length(note) BETWEEN 1 AND 200),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE prc_transfer_fee_condition (
  rule_id TEXT NOT NULL REFERENCES prc_transfer_fee_rule(id),
  key_code TEXT NOT NULL REFERENCES prc_transfer_fee_key(code),
  value TEXT NOT NULL CHECK (length(value) BETWEEN 1 AND 60),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  PRIMARY KEY (rule_id, key_code)
);

-- Ngày bắt đầu áp: chỉ thêm; dòng mới nhất theo valid_from_at là hiện hành; start_date NULL = không áp.
CREATE TABLE prc_transfer_fee_start (
  id TEXT PRIMARY KEY,
  start_date TEXT CHECK (start_date IS NULL OR date(start_date) IS start_date),
  valid_from_at TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE TRIGGER prc_transfer_fee_rule_no_delete BEFORE DELETE ON prc_transfer_fee_rule
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá dòng mức phí đưa đón — đóng hiệu lực'); END;
CREATE TRIGGER prc_transfer_fee_condition_no_delete BEFORE DELETE ON prc_transfer_fee_condition
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá điều kiện của dòng mức phí đưa đón'); END;
CREATE TRIGGER prc_transfer_fee_condition_no_update BEFORE UPDATE ON prc_transfer_fee_condition
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không sửa điều kiện của dòng mức phí đưa đón — đóng dòng cũ, thêm dòng mới'); END;
CREATE TRIGGER prc_transfer_fee_start_no_update BEFORE UPDATE ON prc_transfer_fee_start
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không sửa ngày bắt đầu áp phí đưa đón — thêm dòng mới'); END;
CREATE TRIGGER prc_transfer_fee_start_no_delete BEFORE DELETE ON prc_transfer_fee_start
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá ngày bắt đầu áp phí đưa đón — thêm dòng mới'); END;

-- Chỉ được đóng: chỉ valid_to_date, updated_at, updated_by đổi; valid_to_date đặt từ NULL hoặc rút ngắn, không bao giờ nới hay bỏ.
CREATE TRIGGER prc_transfer_fee_rule_close_only BEFORE UPDATE ON prc_transfer_fee_rule
WHEN NEW.valid_to_date IS NULL OR (OLD.valid_to_date IS NOT NULL AND NEW.valid_to_date > OLD.valid_to_date)
  OR NEW.id IS NOT OLD.id OR NEW.kind IS NOT OLD.kind OR NEW.amount IS NOT OLD.amount OR NEW.valid_from_date IS NOT OLD.valid_from_date
  OR NEW.condition_sig IS NOT OLD.condition_sig OR NEW.note IS NOT OLD.note OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'prc_append_only: dòng mức phí đưa đón chỉ được đóng (đặt hoặc rút ngắn ngày kết thúc) — đổi mức thì đóng dòng cũ, thêm dòng mới'); END;

-- Khoá chồng ngày = (kiểu, chữ ký điều kiện). Chữ ký do máy chủ tính, bất biến R-PRC-PD-1 canh nó khớp các dòng con.
CREATE TRIGGER prc_transfer_fee_rule_overlap BEFORE INSERT ON prc_transfer_fee_rule
WHEN EXISTS (SELECT 1 FROM prc_transfer_fee_rule o
  WHERE o.kind = NEW.kind AND o.condition_sig = NEW.condition_sig
    AND NOT (COALESCE(o.valid_to_date, '9999-12-31') < NEW.valid_from_date OR o.valid_from_date > COALESCE(NEW.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'prc_overlap: đã có mức cùng bộ điều kiện trong khoảng ngày này'); END;

CREATE TRIGGER prc_transfer_fee_condition_khoa_bat BEFORE INSERT ON prc_transfer_fee_condition
WHEN NOT EXISTS (SELECT 1 FROM prc_transfer_fee_key k WHERE k.code = NEW.key_code AND k.active = 1)
BEGIN SELECT RAISE(ABORT, 'prc_key_inactive: khoá điều kiện đã tắt, không thêm vào dòng mức mới'); END;
