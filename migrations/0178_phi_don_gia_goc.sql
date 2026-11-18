-- Migration 0178 — ADR-0218 (accepted 2026-11-18) Đợt 1, KHÔNG SINH TIỀN: năm bảng mới + một view. CHỈ THÊM; không đổi bảng, dòng nào đang có; mã cũ không đọc chúng.
-- Số: ngày 18/11, mọi nhánh của máy này có tối đa 0177 ⇒ 0178.
-- Xây trên lỗ đang hở HC-5.19 (chủ cho phép, có ghi lý do, ADR-0218): bảng chỉ thêm, không chạm sổ tiền; phí chưa thu đồng nào tới khi Đợt 2 lên và Quản trị đặt «ngày bắt đầu áp».
-- (1) ctl_service_transfer_price: giá gốc phí đưa đón đọc từ HAI cột Sheet (khuôn 0151 `ctl_service_ticket_source`). Dòng hiệu lực = `valid_from_at` lớn nhất của dịch vụ.
--     NULL = ô trống = chưa có giá (không bao giờ thành 0); 0 = miễn phí. Trần Sheet: đi chung 500.000 đ mỗi khách, xe riêng 5.000.000 đ cả chuyến.
-- (2) prc_transfer_fee_tier_discount: mức giảm mỗi khách theo cấp (khuôn 0118 `prc_party_tier`): đóng được một lần, không chồng ngày cùng cấp, cấp phải bật, không xoá.
-- (3) prc_transfer_fee_program + prc_transfer_fee_program_scope: chương trình miễn phí đưa đón theo khoảng NGÀY ĐI; phạm vi ALL / SERVICES / PARTNERS; chỉ kết thúc, không sửa.
-- (4) ord_receipt_fee_display_policy: công tắc «hiện riêng phí đưa đón trên biên nhận khách lẻ» (khuôn 0157). Gieo MỘT dòng Tắt (gộp) = mặc định của ADR-0218 Đ3.4.
-- Tệp không tự mở, đóng giao dịch: wrangler chạy cả tệp trong một lô.
-- HOÀN TÁC: Đợt 1 không có mã nào đọc các bảng này để tính tiền; để nguyên bảng thừa thì không ảnh hưởng mã cũ. Chưa có dòng nào của người dùng thì có thể bỏ cả năm bảng.

CREATE TABLE ctl_service_transfer_price (
  id             TEXT PRIMARY KEY,
  catalog_code   TEXT NOT NULL,
  per_pax_price  INTEGER CHECK (per_pax_price IS NULL OR per_pax_price BETWEEN 0 AND 500000),
  private_price  INTEGER CHECK (private_price IS NULL OR private_price BETWEEN 0 AND 5000000),
  valid_from_at  TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  UNIQUE (catalog_code, valid_from_at)
);
CREATE TRIGGER ctl_service_transfer_price_no_update BEFORE UPDATE ON ctl_service_transfer_price
BEGIN SELECT RAISE(ABORT, 'ctl_service_transfer_price_append_only: giá gốc phí đưa đón chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ctl_service_transfer_price_no_delete BEFORE DELETE ON ctl_service_transfer_price
BEGIN SELECT RAISE(ABORT, 'ctl_service_transfer_price_append_only: giá gốc phí đưa đón không xoá'); END;
CREATE VIEW v_ctl_service_transfer_price AS
  SELECT s.catalog_code, s.per_pax_price, s.private_price, s.valid_from_at FROM ctl_service_transfer_price s
  WHERE s.valid_from_at = (SELECT max(t.valid_from_at) FROM ctl_service_transfer_price t WHERE t.catalog_code = s.catalog_code);

CREATE TABLE prc_transfer_fee_tier_discount (
  id              TEXT PRIMARY KEY,
  tier_code       TEXT NOT NULL REFERENCES prc_rate_tier(code),
  amount          INTEGER NOT NULL CHECK (amount >= 0 AND amount <= 5000000),
  valid_from_date TEXT NOT NULL,
  valid_to_date   TEXT CHECK (valid_to_date IS NULL OR valid_to_date >= valid_from_date),
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
CREATE INDEX prc_transfer_fee_tier_discount_tier_ix ON prc_transfer_fee_tier_discount(tier_code);
CREATE TRIGGER prc_transfer_fee_tier_discount_no_delete BEFORE DELETE ON prc_transfer_fee_tier_discount
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá mức giảm phí đưa đón — đóng hiệu lực'); END;
CREATE TRIGGER prc_transfer_fee_tier_discount_close_only BEFORE UPDATE ON prc_transfer_fee_tier_discount
WHEN OLD.valid_to_date IS NOT NULL OR NEW.valid_to_date IS NULL OR NEW.id IS NOT OLD.id OR NEW.tier_code IS NOT OLD.tier_code
  OR NEW.amount IS NOT OLD.amount OR NEW.valid_from_date IS NOT OLD.valid_from_date OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'prc_append_only: mức giảm phí đưa đón chỉ được đóng một lần — đổi mức thì đóng dòng cũ, mở dòng mới'); END;
CREATE TRIGGER prc_transfer_fee_tier_discount_overlap BEFORE INSERT ON prc_transfer_fee_tier_discount
WHEN EXISTS (SELECT 1 FROM prc_transfer_fee_tier_discount o WHERE o.tier_code = NEW.tier_code
  AND NOT (COALESCE(o.valid_to_date, '9999-12-31') < NEW.valid_from_date OR o.valid_from_date > COALESCE(NEW.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'prc_transfer_fee_discount_overlap: cấp này đã có một mức giảm trong khoảng ngày này'); END;
CREATE TRIGGER prc_transfer_fee_tier_discount_tier_ok BEFORE INSERT ON prc_transfer_fee_tier_discount
WHEN NOT EXISTS (SELECT 1 FROM prc_rate_tier t WHERE t.code = NEW.tier_code AND t.active = 1)
BEGIN SELECT RAISE(ABORT, 'prc_tier_inactive: mức TA không tồn tại hoặc đã tắt'); END;

CREATE TABLE prc_transfer_fee_program (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  scope           TEXT NOT NULL CHECK (scope IN ('ALL', 'SERVICES', 'PARTNERS')),
  trip_from       TEXT NOT NULL,
  trip_to         TEXT NOT NULL CHECK (trip_to >= trip_from),
  include_private INTEGER NOT NULL DEFAULT 0 CHECK (include_private IN (0, 1)),
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  ended_at        TEXT,
  ended_by        TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
CREATE TRIGGER prc_transfer_fee_program_no_delete BEFORE DELETE ON prc_transfer_fee_program
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá chương trình miễn phí đưa đón — kết thúc'); END;
CREATE TRIGGER prc_transfer_fee_program_end_only BEFORE UPDATE ON prc_transfer_fee_program
WHEN OLD.ended_at IS NOT NULL OR NEW.ended_at IS NULL OR NEW.id IS NOT OLD.id OR NEW.name IS NOT OLD.name OR NEW.scope IS NOT OLD.scope
  OR NEW.trip_from IS NOT OLD.trip_from OR NEW.trip_to IS NOT OLD.trip_to OR NEW.include_private IS NOT OLD.include_private
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'prc_append_only: chương trình miễn phí đưa đón chỉ được kết thúc một lần, không sửa tại chỗ'); END;

CREATE TABLE prc_transfer_fee_program_scope (
  program_id   TEXT NOT NULL REFERENCES prc_transfer_fee_program(id),
  catalog_code TEXT,
  party_id     TEXT,
  created_at   TEXT NOT NULL,
  created_by   TEXT,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT,
  CHECK ((catalog_code IS NULL) <> (party_id IS NULL))
);
-- Khoá chống trùng viết bằng chỉ mục biểu thức vì khoá chính có cột NULL không chặn trùng trong SQLite.
CREATE UNIQUE INDEX prc_transfer_fee_program_scope_uq ON prc_transfer_fee_program_scope(program_id, COALESCE(catalog_code, ''), COALESCE(party_id, ''));
CREATE TRIGGER prc_transfer_fee_program_scope_no_update BEFORE UPDATE ON prc_transfer_fee_program_scope
BEGIN SELECT RAISE(ABORT, 'prc_append_only: phạm vi chương trình miễn phí đưa đón chỉ thêm, không sửa'); END;
CREATE TRIGGER prc_transfer_fee_program_scope_no_delete BEFORE DELETE ON prc_transfer_fee_program_scope
BEGIN SELECT RAISE(ABORT, 'prc_append_only: phạm vi chương trình miễn phí đưa đón không xoá'); END;
CREATE TRIGGER prc_transfer_fee_program_scope_kind_ok BEFORE INSERT ON prc_transfer_fee_program_scope
WHEN NOT EXISTS (SELECT 1 FROM prc_transfer_fee_program p WHERE p.id = NEW.program_id
  AND ((p.scope = 'SERVICES' AND NEW.catalog_code IS NOT NULL) OR (p.scope = 'PARTNERS' AND NEW.party_id IS NOT NULL)))
BEGIN SELECT RAISE(ABORT, 'prc_transfer_fee_scope: phạm vi không khớp loại chương trình (SERVICES nhận mã dịch vụ, PARTNERS nhận hồ sơ, ALL không nhận gì)'); END;

CREATE TABLE ord_receipt_fee_display_policy (
  id            TEXT PRIMARY KEY,
  show_separate INTEGER NOT NULL CHECK (show_separate IN (0, 1)),
  valid_from_at TEXT NOT NULL UNIQUE,
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);
INSERT INTO ord_receipt_fee_display_policy (id, show_separate, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0178', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
CREATE TRIGGER ord_receipt_fee_display_policy_no_update BEFORE UPDATE ON ord_receipt_fee_display_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: công tắc hiện riêng phí đưa đón chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ord_receipt_fee_display_policy_no_delete BEFORE DELETE ON ord_receipt_fee_display_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: công tắc hiện riêng phí đưa đón không xoá'); END;
