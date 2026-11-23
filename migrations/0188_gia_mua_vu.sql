-- Migration 0188 — GIÁ MÙA VỤ (ADR-0229 Đ1, Đ3, Đ8; chủ duyệt 2026-11-22). Chỉ THÊM hai bảng của `catalog` (tiền tố `ctl_`, ADR-0058) + trigger + chỉ mục.
-- `ctl_seasonal_price`: mỗi dòng = «dịch vụ D (hoặc mọi dịch vụ đang thuộc nhóm G) có ngày đi trong [from_date, to_date] (ngày dân sự Việt Nam, gồm hai đầu)
-- tăng giá pct % rồi cộng amount đồng». Chỉ tăng (pct, amount ≥ 0, ít nhất một > 0). Hiệu lực khi ĐÃ DUYỆT bởi người KHÁC người đặt (10c) và CHƯA KẾT THÚC.
-- `updated_at` / `updated_by` = lúc và người của lần ghi gần nhất (tạo, duyệt hoặc kết thúc). Bảng chỉ thêm: cấm xoá; chỉ hai kiểu sửa — đặt mốc duyệt MỘT lần (chưa kết thúc) và đặt mốc kết thúc MỘT lần (cả quy tắc chờ duyệt). Hai quy tắc chưa kết thúc
-- cùng phạm vi, cùng mã không được chồng ngày (Đ3; máy chủ kiểm trước, trigger là lưới thứ hai). «Ngày cuối không ở quá khứ», trần % kiểm ở máy chủ.
-- `ctl_seasonal_price_cap`: trần % do Toàn quyền đặt (Đ8), chỉ thêm, dòng mới nhất là trần hiện hành; gieo 30.
-- HC-5.19: chủ chấp nhận rủi ro 22/11 — dòng `xay_tren_cho_phep_adr_0229` ở docs/quyen-hoan.json.
-- HOÀN TÁC: D1 không có bước "down". Bảng rỗng không đổi hành vi (không quy tắc ⇒ giá giữ nguyên); muốn gỡ thì một migration SAU bỏ trigger / bảng.

CREATE TABLE ctl_seasonal_price (
  id           TEXT PRIMARY KEY,
  scope        TEXT NOT NULL CHECK (scope IN ('SERVICE', 'GROUP')),
  catalog_code TEXT,
  group_code   TEXT REFERENCES ctl_group (code),
  from_date    TEXT NOT NULL CHECK (from_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  to_date      TEXT NOT NULL CHECK (to_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  pct          INTEGER NOT NULL CHECK (typeof(pct) = 'integer' AND pct BETWEEN 0 AND 100),
  amount       INTEGER NOT NULL CHECK (typeof(amount) = 'integer' AND amount >= 0),
  note         TEXT CHECK (note IS NULL OR length(note) <= 200),
  created_at   TEXT NOT NULL,
  created_by   TEXT,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT,
  approved_at  TEXT,
  approved_by  TEXT,
  ended_at     TEXT,
  ended_by     TEXT,
  CHECK (to_date >= from_date),
  CHECK (pct > 0 OR amount > 0),
  CHECK ((approved_at IS NULL) = (approved_by IS NULL)),
  CHECK (approved_by IS NULL OR (created_by IS NOT NULL AND approved_by <> created_by)),
  CHECK ((ended_at IS NULL) = (ended_by IS NULL)),
  CHECK ((scope = 'SERVICE' AND catalog_code IS NOT NULL AND group_code IS NULL)
      OR (scope = 'GROUP' AND group_code IS NOT NULL AND catalog_code IS NULL))
);
CREATE INDEX ctl_seasonal_price_service_ix ON ctl_seasonal_price (catalog_code);
CREATE INDEX ctl_seasonal_price_group_ix ON ctl_seasonal_price (group_code);

CREATE TRIGGER ctl_seasonal_price_no_delete BEFORE DELETE ON ctl_seasonal_price
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: không xoá quy tắc giá mùa vụ — bấm Kết thúc'); END;

CREATE TRIGGER ctl_seasonal_price_one_way BEFORE UPDATE ON ctl_seasonal_price
WHEN NEW.id IS NOT OLD.id OR NEW.scope IS NOT OLD.scope OR NEW.catalog_code IS NOT OLD.catalog_code OR NEW.group_code IS NOT OLD.group_code
  OR NEW.from_date IS NOT OLD.from_date OR NEW.to_date IS NOT OLD.to_date OR NEW.pct IS NOT OLD.pct OR NEW.amount IS NOT OLD.amount
  OR NEW.note IS NOT OLD.note OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR (OLD.approved_at IS NOT NULL AND (NEW.approved_at IS NOT OLD.approved_at OR NEW.approved_by IS NOT OLD.approved_by))
  OR (OLD.ended_at IS NOT NULL AND (NEW.ended_at IS NOT OLD.ended_at OR NEW.ended_by IS NOT OLD.ended_by))
  OR (OLD.approved_at IS NULL AND NEW.approved_at IS NOT NULL AND OLD.ended_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: quy tắc giá mùa vụ chỉ được duyệt một lần (khi chưa kết thúc) và kết thúc một lần'); END;

CREATE TRIGGER ctl_seasonal_price_no_overlap BEFORE INSERT ON ctl_seasonal_price
WHEN EXISTS (
  SELECT 1 FROM ctl_seasonal_price p
  WHERE p.ended_at IS NULL AND p.scope = NEW.scope
    AND p.catalog_code IS NEW.catalog_code AND p.group_code IS NEW.group_code
    AND p.from_date <= NEW.to_date AND NEW.from_date <= p.to_date
)
BEGIN SELECT RAISE(ABORT, 'ctl_seasonal_overlap: đã có quy tắc giá mùa vụ cùng phạm vi chồng khoảng ngày này'); END;

CREATE TABLE ctl_seasonal_price_cap (
  id         TEXT PRIMARY KEY,
  max_pct    INTEGER NOT NULL CHECK (typeof(max_pct) = 'integer' AND max_pct BETWEEN 0 AND 100),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE TRIGGER ctl_seasonal_price_cap_no_delete BEFORE DELETE ON ctl_seasonal_price_cap
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: trần giá mùa vụ chỉ thêm dòng mới'); END;
CREATE TRIGGER ctl_seasonal_price_cap_no_update BEFORE UPDATE ON ctl_seasonal_price_cap
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: trần giá mùa vụ chỉ thêm dòng mới'); END;

INSERT INTO ctl_seasonal_price_cap (id, max_pct, created_at, created_by, updated_at, updated_by) VALUES ('ctl-seasonal-cap-goc', 30, '2026-11-22T00:00:00.000Z', NULL, '2026-11-22T00:00:00.000Z', NULL);
