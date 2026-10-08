-- Migration 0090 — SỔ ĐẠI LÝ ĐỢT 1 (ADR-0077 toàn bộ, ADR-0078 B1, ADR-0080 D1; đặc tả docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md §3).
-- Chỉ THÊM. Thân trigger chỉ đọc bảng cùng module hoặc view công bố của module được phép phụ thuộc (ADR-0024 điều 5). Câu báo có tiền tố mã.

-- ===== parties: vai Nhà cung cấp (ADR-0078 điều 1) + view vai đang mở (chỉ khoá, không tên, không SĐT) ==========================================
INSERT INTO pty_role_type (code, name, sort_order, role_group) VALUES ('SUPPLIER', 'Nhà cung cấp', 32, 'OTHER');
CREATE VIEW v_pty_open_role AS
  SELECT DISTINCT r.party_id, r.role_type_code, t.role_group
  FROM pty_party_role r JOIN pty_role_type t ON t.code = r.role_type_code
  WHERE r.valid_to_date IS NULL;

-- ===== catalog: nhóm hiện hành của từng mã dịch vụ (dòng seq lớn nhất; group_code NULL = Chưa phân loại) =========================================
CREATE VIEW v_ctl_service_group AS
  SELECT g.service_code AS catalog_code, g.group_code
  FROM ctl_service_group g
  WHERE g.seq = (SELECT max(g2.seq) FROM ctl_service_group g2 WHERE g2.service_code = g.service_code);

-- ===== pricing ===================================================================================================================================
-- Danh sách vai được hưởng hoa hồng (C3 = A). Tắt một vai = active 0 (dòng mức cũ vẫn giữ; R-PRC-2 báo).
CREATE TABLE prc_beneficiary_role (
  role_type_code TEXT PRIMARY KEY REFERENCES pty_role_type(code),
  active         INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT
);
INSERT INTO prc_beneficiary_role (role_type_code, active, created_at, created_by, updated_at, updated_by)
  SELECT code, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong'
  FROM pty_role_type WHERE code IN ('TRAVEL_AGENCY', 'GUIDE_FREELANCE', 'HOTEL_RECEPTION', 'TAXI_DRIVER', 'COLLABORATOR');
CREATE TRIGGER prc_beneficiary_role_no_delete BEFORE DELETE ON prc_beneficiary_role
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá vai được hưởng — tắt bằng active = 0'); END;
-- UPDATE chỉ được đổi active (+ người/giờ cập nhật): đổi khoá hay cột tạo sẽ làm một vai biến khỏi danh sách đóng / thêm vai lạ, lách trigger chặn xoá.
CREATE TRIGGER prc_beneficiary_role_update_scope BEFORE UPDATE ON prc_beneficiary_role
WHEN NEW.role_type_code IS NOT OLD.role_type_code OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'prc_append_only: chỉ đổi được active và người/giờ cập nhật'); END;
CREATE VIEW v_prc_beneficiary_role AS SELECT role_type_code FROM prc_beneficiary_role WHERE active = 1;

-- Bảng mức hoa hồng (ADR-0077 điều 4). Đúng một trong (đối tác, vai); phạm vi khớp mã; đúng một trong (tỷ lệ, đ/khách).
CREATE TABLE prc_commission_rule (
  id               TEXT PRIMARY KEY,
  target_party_id  TEXT REFERENCES pty_party(id),
  target_role_code TEXT REFERENCES prc_beneficiary_role(role_type_code),
  scope            TEXT NOT NULL CHECK (scope IN ('SERVICE', 'GROUP', 'ALL')),
  catalog_code     TEXT,
  group_code       TEXT REFERENCES ctl_group(code),
  kind             TEXT NOT NULL CHECK (kind IN ('RATE', 'PER_PAX')),
  rate_bp          INTEGER CHECK (rate_bp BETWEEN 0 AND 10000),
  per_pax_amount   INTEGER CHECK (per_pax_amount >= 0),
  valid_from_date  TEXT NOT NULL,
  valid_to_date    TEXT CHECK (valid_to_date IS NULL OR valid_to_date >= valid_from_date),
  note             TEXT CHECK (note IS NULL OR length(note) <= 200),
  created_at       TEXT NOT NULL,
  created_by       TEXT,
  updated_at       TEXT NOT NULL,
  updated_by       TEXT,
  CHECK ((target_party_id IS NULL) <> (target_role_code IS NULL)),
  CHECK ((scope = 'SERVICE' AND catalog_code IS NOT NULL AND group_code IS NULL) OR (scope = 'GROUP' AND group_code IS NOT NULL AND catalog_code IS NULL)
         OR (scope = 'ALL' AND catalog_code IS NULL AND group_code IS NULL)),
  CHECK ((kind = 'RATE' AND rate_bp IS NOT NULL AND per_pax_amount IS NULL) OR (kind = 'PER_PAX' AND per_pax_amount IS NOT NULL AND rate_bp IS NULL))
);
CREATE INDEX prc_commission_rule_party_ix ON prc_commission_rule(target_party_id);
CREATE INDEX prc_commission_rule_role_ix ON prc_commission_rule(target_role_code);
CREATE TRIGGER prc_commission_rule_no_delete BEFORE DELETE ON prc_commission_rule
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá dòng mức — đóng hiệu lực'); END;
CREATE TRIGGER prc_commission_rule_close_only BEFORE UPDATE ON prc_commission_rule
WHEN OLD.valid_to_date IS NOT NULL OR NEW.valid_to_date IS NULL OR NEW.id IS NOT OLD.id OR NEW.target_party_id IS NOT OLD.target_party_id
  OR NEW.target_role_code IS NOT OLD.target_role_code OR NEW.scope IS NOT OLD.scope OR NEW.catalog_code IS NOT OLD.catalog_code OR NEW.group_code IS NOT OLD.group_code
  OR NEW.kind IS NOT OLD.kind OR NEW.rate_bp IS NOT OLD.rate_bp OR NEW.per_pax_amount IS NOT OLD.per_pax_amount OR NEW.valid_from_date IS NOT OLD.valid_from_date
  OR NEW.note IS NOT OLD.note OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'prc_append_only: dòng mức chỉ được đóng một lần — đổi mức thì đóng dòng cũ, thêm dòng mới'); END;
CREATE TRIGGER prc_commission_rule_overlap BEFORE INSERT ON prc_commission_rule
WHEN EXISTS (SELECT 1 FROM prc_commission_rule o
  WHERE IFNULL(o.target_party_id, '') = IFNULL(NEW.target_party_id, '') AND IFNULL(o.target_role_code, '') = IFNULL(NEW.target_role_code, '')
    AND o.scope = NEW.scope AND IFNULL(o.catalog_code, '') = IFNULL(NEW.catalog_code, '') AND IFNULL(o.group_code, '') = IFNULL(NEW.group_code, '')
    AND NOT (COALESCE(o.valid_to_date, '9999-12-31') < NEW.valid_from_date OR o.valid_from_date > COALESCE(NEW.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'prc_overlap: đã có mức cùng đối tượng, cùng phạm vi trong khoảng ngày này'); END;
CREATE TRIGGER prc_commission_rule_target_party BEFORE INSERT ON prc_commission_rule
WHEN NEW.target_party_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM v_pty_open_role r JOIN prc_beneficiary_role b ON b.role_type_code = r.role_type_code AND b.active = 1
  WHERE r.party_id = NEW.target_party_id)
BEGIN SELECT RAISE(ABORT, 'prc_target_not_beneficiary: hồ sơ này không mang vai được hưởng hoa hồng'); END;
CREATE TRIGGER prc_commission_rule_target_role BEFORE INSERT ON prc_commission_rule
WHEN NEW.target_role_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM prc_beneficiary_role b WHERE b.role_type_code = NEW.target_role_code AND b.active = 1)
BEGIN SELECT RAISE(ABORT, 'prc_role_not_beneficiary: vai này không nằm trong danh sách được hưởng'); END;
CREATE VIEW v_prc_commission_rule AS
  SELECT id, target_party_id, target_role_code, scope, catalog_code, group_code, kind, rate_bp, per_pax_amount, valid_from_date, valid_to_date FROM prc_commission_rule;

-- Điều khoản cung ứng (ADR-0078 điều 2). Có nhà cung cấp + a% ⇔ người bán ≠ công ty chủ; khi có thì nhà cung cấp = người bán.
CREATE TABLE prc_supply_term (
  id                TEXT PRIMARY KEY,
  scope             TEXT NOT NULL CHECK (scope IN ('SERVICE', 'GROUP', 'ALL')),
  catalog_code      TEXT,
  group_code        TEXT REFERENCES ctl_group(code),
  seller_party_id   TEXT NOT NULL REFERENCES pty_party(id),
  supplier_party_id TEXT REFERENCES pty_party(id),
  cost_rate_bp      INTEGER CHECK (cost_rate_bp BETWEEN 0 AND 10000),
  valid_from_date   TEXT NOT NULL,
  valid_to_date     TEXT CHECK (valid_to_date IS NULL OR valid_to_date >= valid_from_date),
  note              TEXT CHECK (note IS NULL OR length(note) <= 200),
  created_at        TEXT NOT NULL,
  created_by        TEXT,
  updated_at        TEXT NOT NULL,
  updated_by        TEXT,
  CHECK ((scope = 'SERVICE' AND catalog_code IS NOT NULL AND group_code IS NULL) OR (scope = 'GROUP' AND group_code IS NOT NULL AND catalog_code IS NULL)
         OR (scope = 'ALL' AND catalog_code IS NULL AND group_code IS NULL)),
  CHECK ((supplier_party_id IS NULL) = (cost_rate_bp IS NULL)),
  CHECK (supplier_party_id IS NULL OR supplier_party_id = seller_party_id)
);
CREATE TRIGGER prc_supply_term_no_delete BEFORE DELETE ON prc_supply_term
BEGIN SELECT RAISE(ABORT, 'prc_append_only: không xoá điều khoản — đóng hiệu lực'); END;
CREATE TRIGGER prc_supply_term_close_only BEFORE UPDATE ON prc_supply_term
WHEN OLD.valid_to_date IS NOT NULL OR NEW.valid_to_date IS NULL OR NEW.id IS NOT OLD.id OR NEW.scope IS NOT OLD.scope OR NEW.catalog_code IS NOT OLD.catalog_code
  OR NEW.group_code IS NOT OLD.group_code OR NEW.seller_party_id IS NOT OLD.seller_party_id OR NEW.supplier_party_id IS NOT OLD.supplier_party_id
  OR NEW.cost_rate_bp IS NOT OLD.cost_rate_bp OR NEW.valid_from_date IS NOT OLD.valid_from_date OR NEW.note IS NOT OLD.note
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'prc_append_only: điều khoản chỉ được đóng một lần — đổi thì đóng dòng cũ, thêm dòng mới'); END;
CREATE TRIGGER prc_supply_term_overlap BEFORE INSERT ON prc_supply_term
WHEN EXISTS (SELECT 1 FROM prc_supply_term o WHERE o.scope = NEW.scope AND IFNULL(o.catalog_code, '') = IFNULL(NEW.catalog_code, '') AND IFNULL(o.group_code, '') = IFNULL(NEW.group_code, '')
  AND NOT (COALESCE(o.valid_to_date, '9999-12-31') < NEW.valid_from_date OR o.valid_from_date > COALESCE(NEW.valid_to_date, '9999-12-31')))
BEGIN SELECT RAISE(ABORT, 'prc_overlap: đã có điều khoản cùng phạm vi trong khoảng ngày này'); END;
-- Người bán ≠ công ty chủ ⇒ phải có nhà cung cấp (a%); người bán = công ty chủ ⇒ không có.
CREATE TRIGGER prc_supply_term_supplier_iff BEFORE INSERT ON prc_supply_term
WHEN (NEW.supplier_party_id IS NULL) <> EXISTS (SELECT 1 FROM v_pty_owner_company c WHERE c.party_id = NEW.seller_party_id)
BEGIN SELECT RAISE(ABORT, 'prc_supplier_mismatch: người bán là công ty thì không ghi tỷ lệ mua lại; người bán là nhà cung cấp thì phải ghi'); END;
CREATE TRIGGER prc_supply_term_seller_role BEFORE INSERT ON prc_supply_term
WHEN NOT EXISTS (SELECT 1 FROM v_pty_owner_company c WHERE c.party_id = NEW.seller_party_id)
  AND NOT EXISTS (SELECT 1 FROM v_pty_open_role r WHERE r.party_id = NEW.seller_party_id AND r.role_type_code = 'SUPPLIER')
BEGIN SELECT RAISE(ABORT, 'prc_seller_not_supplier: người bán phải là công ty chủ hoặc hồ sơ đang mang vai Nhà cung cấp'); END;
-- Ruling đặc tả §3: dòng "mọi dịch vụ" chỉ cho công ty chủ (dòng ALL mang a% sẽ trùm cả nhóm Thuê xe, trái X3).
CREATE TRIGGER prc_supply_term_all_owner BEFORE INSERT ON prc_supply_term
WHEN NEW.scope = 'ALL' AND NOT EXISTS (SELECT 1 FROM v_pty_owner_company c WHERE c.party_id = NEW.seller_party_id)
BEGIN SELECT RAISE(ABORT, 'prc_all_owner_only: dòng mọi dịch vụ chỉ dành cho công ty chủ'); END;
-- X3 (điều A2, chủ duyệt 2026-10-08): không ghi nhà cung cấp mua lại cho nhóm Thuê xe (TXE) hay mã đang thuộc nhóm đó.
CREATE TRIGGER prc_supply_term_x3 BEFORE INSERT ON prc_supply_term
WHEN NEW.supplier_party_id IS NOT NULL AND (NEW.group_code = 'TXE'
  OR EXISTS (SELECT 1 FROM v_ctl_service_group g WHERE g.catalog_code = NEW.catalog_code AND g.group_code = 'TXE'))
BEGIN SELECT RAISE(ABORT, 'prc_transfer_no_supplier: dịch vụ nhóm Thuê xe không ghi nhà cung cấp mua lại (luật X3)'); END;
CREATE VIEW v_prc_supply_term AS
  SELECT id, scope, catalog_code, group_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, valid_to_date FROM prc_supply_term;
-- Gieo (ADR-0078 điều 3): công ty chủ bán mọi dịch vụ, từ mốc cố định sớm hơn mọi đơn.
INSERT INTO prc_supply_term (id, scope, catalog_code, group_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, valid_to_date, note, created_at, created_by, updated_at, updated_by)
  SELECT 'prc-st-goc-all', 'ALL', NULL, NULL, party_id, NULL, NULL, '2025-01-01', NULL, 'Gieo sẵn: công ty chủ bán mọi dịch vụ (ADR-0078 điều 3)',
         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong'
  FROM v_pty_owner_company LIMIT 1;

-- ===== orders: bản chụp thương mại của từng dòng dịch vụ (ADR-0077 điều 8, ADR-0078 điều 5) ======================================================
CREATE TABLE ord_service_terms (
  id                   TEXT PRIMARY KEY,
  order_id             TEXT NOT NULL REFERENCES orders(id),
  order_service_id     TEXT NOT NULL REFERENCES order_service(id),
  beneficiary_party_id TEXT REFERENCES pty_party(id),
  commission_status    TEXT NOT NULL CHECK (commission_status IN ('NONE', 'SET', 'MISSING')),
  missing_reason       TEXT CHECK (missing_reason IN ('NO_RULE', 'RULE_CONFLICT', 'MANUAL_LINE', 'BOOKER_NOT_BENEFICIARY', 'NOT_CAPTURED')),
  commission_kind      TEXT CHECK (commission_kind IN ('RATE', 'PER_PAX')),
  commission_rate_bp   INTEGER CHECK (commission_rate_bp BETWEEN 0 AND 10000),
  commission_per_pax   INTEGER CHECK (commission_per_pax >= 0),
  commission_rule_id   TEXT REFERENCES prc_commission_rule(id),
  supply_status        TEXT NOT NULL CHECK (supply_status IN ('SET', 'MISSING')),
  seller_party_id      TEXT REFERENCES pty_party(id),
  supplier_party_id    TEXT REFERENCES pty_party(id),
  cost_rate_bp         INTEGER CHECK (cost_rate_bp BETWEEN 0 AND 10000),
  supply_term_id       TEXT REFERENCES prc_supply_term(id),
  source               TEXT NOT NULL CHECK (source IN ('AUTO', 'MANUAL')),
  reason               TEXT,
  supersedes_id        TEXT UNIQUE REFERENCES ord_service_terms(id),
  captured_date        TEXT NOT NULL,
  created_at           TEXT NOT NULL,
  created_by           TEXT,
  updated_at           TEXT NOT NULL,
  updated_by           TEXT,
  CHECK ((commission_status = 'MISSING') = (missing_reason IS NOT NULL)),
  CHECK (commission_status = 'NONE' OR beneficiary_party_id IS NOT NULL),
  CHECK (commission_status <> 'NONE' OR beneficiary_party_id IS NULL),
  CHECK ((commission_status = 'SET' AND ((commission_kind = 'RATE' AND commission_rate_bp IS NOT NULL AND commission_per_pax IS NULL)
                                         OR (commission_kind = 'PER_PAX' AND commission_per_pax IS NOT NULL AND commission_rate_bp IS NULL)))
         OR (commission_status <> 'SET' AND commission_kind IS NULL AND commission_rate_bp IS NULL AND commission_per_pax IS NULL AND commission_rule_id IS NULL)),
  CHECK ((supply_status = 'SET') = (seller_party_id IS NOT NULL)),
  CHECK ((supplier_party_id IS NULL) = (cost_rate_bp IS NULL)),
  CHECK (supplier_party_id IS NULL OR supplier_party_id = seller_party_id),
  CHECK ((source = 'AUTO' AND reason IS NULL) OR (source = 'MANUAL' AND reason IS NOT NULL AND length(trim(reason)) >= 10 AND length(reason) <= 500 AND supersedes_id IS NOT NULL)),
  -- Bản AUTO ở trạng thái SET phải trỏ dòng nguồn: hai trigger «vừa đổi» (rule_valid / term_valid) chỉ chạy khi mã nguồn KHÔNG NULL, nên thiếu mã thì lớp CSDL chống ghi số cũ vô hiệu.
  -- Chỉ bản MANUAL (ghi mức tay) được SET mà không có dòng nguồn. Cung ứng MISSING thì không mang mã điều khoản.
  CHECK (source <> 'AUTO' OR commission_status <> 'SET' OR commission_rule_id IS NOT NULL),
  CHECK (source <> 'AUTO' OR supply_status <> 'SET' OR supply_term_id IS NOT NULL),
  CHECK (supply_status = 'SET' OR supply_term_id IS NULL)
);
CREATE INDEX ord_service_terms_order_ix ON ord_service_terms(order_id);
CREATE INDEX ord_service_terms_service_ix ON ord_service_terms(order_service_id);
CREATE TRIGGER ord_service_terms_no_update BEFORE UPDATE ON ord_service_terms
BEGIN SELECT RAISE(ABORT, 'terms_append_only: bản chụp không sửa được — ghi bản mới trỏ bản cũ'); END;
CREATE TRIGGER ord_service_terms_no_delete BEFORE DELETE ON ord_service_terms
BEGIN SELECT RAISE(ABORT, 'terms_append_only: bản chụp không xoá được'); END;
CREATE TRIGGER ord_service_terms_confirmed BEFORE INSERT ON ord_service_terms
WHEN NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = NEW.order_id AND o.status = 'confirmed')
BEGIN SELECT RAISE(ABORT, 'terms_order_not_confirmed: chỉ chụp cho đơn đã xác nhận'); END;
CREATE TRIGGER ord_service_terms_delivered BEFORE INSERT ON ord_service_terms
WHEN EXISTS (SELECT 1 FROM orders o WHERE o.id = NEW.order_id AND o.delivered_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'terms_order_delivered: đơn đã Đã giao — không chụp thêm'); END;
CREATE TRIGGER ord_service_terms_service BEFORE INSERT ON ord_service_terms
WHEN NOT EXISTS (SELECT 1 FROM order_service s WHERE s.id = NEW.order_service_id AND s.order_id = NEW.order_id)
BEGIN SELECT RAISE(ABORT, 'terms_service_mismatch: dòng dịch vụ không thuộc đơn này'); END;
CREATE TRIGGER ord_service_terms_supersede BEFORE INSERT ON ord_service_terms
WHEN NEW.supersedes_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ord_service_terms p WHERE p.id = NEW.supersedes_id AND p.order_service_id = NEW.order_service_id)
BEGIN SELECT RAISE(ABORT, 'terms_supersede_mismatch: bản thay thế phải cùng dòng dịch vụ'); END;
CREATE TRIGGER ord_service_terms_one_current BEFORE INSERT ON ord_service_terms
WHEN NEW.supersedes_id IS NULL AND EXISTS (SELECT 1 FROM ord_service_terms p WHERE p.order_service_id = NEW.order_service_id)
BEGIN SELECT RAISE(ABORT, 'terms_one_current: dòng dịch vụ đã có bản chụp — bản mới phải trỏ bản hiện hành'); END;
-- Lớp CSDL cho "bảng mức vừa đổi giữa lúc đọc và lúc ghi": bản AUTO phải trỏ dòng còn hiệu lực ở ngày chụp và chép đúng số của dòng đó.
CREATE TRIGGER ord_service_terms_rule_valid BEFORE INSERT ON ord_service_terms
WHEN NEW.source = 'AUTO' AND NEW.commission_rule_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM v_prc_commission_rule r
  WHERE r.id = NEW.commission_rule_id AND r.valid_from_date <= NEW.captured_date AND (r.valid_to_date IS NULL OR r.valid_to_date >= NEW.captured_date)
    AND r.kind = NEW.commission_kind AND r.rate_bp IS NEW.commission_rate_bp AND r.per_pax_amount IS NEW.commission_per_pax)
BEGIN SELECT RAISE(ABORT, 'terms_rule_stale: dòng mức không còn hiệu lực ở ngày chụp'); END;
CREATE TRIGGER ord_service_terms_term_valid BEFORE INSERT ON ord_service_terms
WHEN NEW.source = 'AUTO' AND NEW.supply_term_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM v_prc_supply_term t
  WHERE t.id = NEW.supply_term_id AND t.valid_from_date <= NEW.captured_date AND (t.valid_to_date IS NULL OR t.valid_to_date >= NEW.captured_date)
    AND t.seller_party_id = NEW.seller_party_id AND t.supplier_party_id IS NEW.supplier_party_id AND t.cost_rate_bp IS NEW.cost_rate_bp)
BEGIN SELECT RAISE(ABORT, 'terms_term_stale: điều khoản người bán không còn hiệu lực ở ngày chụp'); END;
CREATE VIEW v_ord_terms_missing AS
  SELECT DISTINCT t.order_id FROM ord_service_terms t
  WHERE NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id)
    AND (t.commission_status = 'MISSING' OR t.supply_status = 'MISSING');
-- Mốc của kiểm định kỳ R-ORD-T1 (đặc tả §9 sau kiểm độc lập N4): lúc áp migration. Khuôn bil_audit_cutoff (0080). Chỉ-thêm.
CREATE TABLE ord_audit_cutoff (
  code       TEXT PRIMARY KEY,
  cutoff_at  TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE TRIGGER ord_audit_cutoff_no_update BEFORE UPDATE ON ord_audit_cutoff
BEGIN SELECT RAISE(ABORT, 'terms_append_only: mốc kiểm không sửa được'); END;
CREATE TRIGGER ord_audit_cutoff_no_delete BEFORE DELETE ON ord_audit_cutoff
BEGIN SELECT RAISE(ABORT, 'terms_append_only: mốc kiểm không xoá được'); END;
INSERT INTO ord_audit_cutoff (code, cutoff_at, created_at, created_by, updated_at, updated_by)
VALUES ('R-ORD-T1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong');

-- ===== ky-so: khoá tháng (ADR-0080 D1). Liền kề; không mở lại; trigger chỉ đọc chính bảng này ===================================================
CREATE TABLE ky_period_close (
  period     TEXT PRIMARY KEY CHECK (period GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]' AND substr(period, 6, 2) BETWEEN '01' AND '12'),
  closed_at  TEXT NOT NULL,
  closed_by  TEXT NOT NULL,
  note       TEXT CHECK (note IS NULL OR length(note) <= 200),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE TRIGGER ky_period_close_adjacent BEFORE INSERT ON ky_period_close
WHEN EXISTS (SELECT 1 FROM ky_period_close)
  AND NEW.period IS NOT (SELECT strftime('%Y-%m', max(period) || '-01', '+1 month') FROM ky_period_close)
BEGIN SELECT RAISE(ABORT, 'period_not_adjacent: chỉ khoá được tháng ngay sau tháng đã khoá gần nhất'); END;
CREATE TRIGGER ky_period_close_no_update BEFORE UPDATE ON ky_period_close
BEGIN SELECT RAISE(ABORT, 'ky_append_only: tháng đã khoá không sửa được'); END;
CREATE TRIGGER ky_period_close_no_delete BEFORE DELETE ON ky_period_close
BEGIN SELECT RAISE(ABORT, 'ky_append_only: tháng đã khoá không mở lại được'); END;
CREATE VIEW v_ky_closed_period AS SELECT period FROM ky_period_close;

-- ===== Khoá tháng trên bốn bảng tiền có ngày phát sinh (ADR-0080 điều 3). billing + van-chuyen đọc view công bố của ky-so =========================
CREATE TRIGGER bil_payment_receipt_period_closed BEFORE INSERT ON bil_payment_receipt
WHEN substr(NEW.occurred_date, 1, 7) IN (SELECT period FROM v_ky_closed_period)
BEGIN SELECT RAISE(ABORT, 'period_closed: tháng của ngày phát sinh đã khoá sổ — ghi vào tháng đang mở'); END;
CREATE TRIGGER bil_posting_period_closed BEFORE INSERT ON bil_posting
WHEN substr(NEW.occurred_date, 1, 7) IN (SELECT period FROM v_ky_closed_period)
BEGIN SELECT RAISE(ABORT, 'period_closed: tháng của ngày phát sinh đã khoá sổ — ghi vào tháng đang mở'); END;
CREATE TRIGGER bil_outside_refund_period_closed BEFORE INSERT ON bil_outside_refund
WHEN substr(NEW.occurred_date, 1, 7) IN (SELECT period FROM v_ky_closed_period)
BEGIN SELECT RAISE(ABORT, 'period_closed: tháng của ngày phát sinh đã khoá sổ — ghi vào tháng đang mở'); END;
CREATE TRIGGER vc_trip_cost_line_period_closed BEFORE INSERT ON vc_trip_cost_line
WHEN substr(NEW.occurred_date, 1, 7) IN (SELECT period FROM v_ky_closed_period)
BEGIN SELECT RAISE(ABORT, 'period_closed: tháng của ngày phát sinh đã khoá sổ — ghi vào tháng đang mở'); END;
