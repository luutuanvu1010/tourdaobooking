-- Migration 0114 — ADR-0133 (chiết khấu «mỗi khách» tách theo loại khách), Task 2: hai bảng phụ, CHỈ THÊM. Không động tới bảng cũ; dòng PER_PAX / RATE cũ và mọi bản chụp cũ giữ nguyên nghĩa.
-- Số 0114 là SỐ TẠM: nhánh sổ đại lý đợt 2 (chưa gộp) đang giữ 0112, 0113. Ai gộp sau tự đổi số theo main lúc gộp (CLAUDE.md §10).
-- Quy ước: dòng PER_PAX có dòng phụ ⇒ tính theo ba số (người lớn, trẻ em, người cao tuổi; em bé luôn 0); không có dòng phụ ⇒ tính như cũ (một số × số khách). Ô bỏ trống = 0 (điều 2).
-- LƯU Ý cho migration sau: bảng phụ ở đây trỏ prc_commission_rule / ord_service_terms. Ai dựng lại hai bảng đó (như 0097) phải gỡ rồi tạo lại trigger + view của hai bảng phụ này.
-- Số «người lớn» của dòng phụ LUÔN bằng per_pax_amount của dòng mức (bất biến, trigger) để nơi đọc cũ vẫn ra đúng phần người lớn.

-- ===== pricing: ba số tiền theo loại của một dòng mức =====================================================================================
CREATE TABLE prc_commission_rule_pax (
  rule_id       TEXT PRIMARY KEY REFERENCES prc_commission_rule(id),
  adult_amount  INTEGER NOT NULL CHECK (adult_amount  BETWEEN 0 AND 100000000),
  child_amount  INTEGER NOT NULL CHECK (child_amount  BETWEEN 0 AND 100000000),
  senior_amount INTEGER NOT NULL CHECK (senior_amount BETWEEN 0 AND 100000000),
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);
CREATE TRIGGER prc_commission_rule_pax_no_update BEFORE UPDATE ON prc_commission_rule_pax
BEGIN SELECT RAISE(ABORT, 'prc_append_only: số tiền theo loại không sửa được — đóng dòng mức, thêm dòng mới'); END;
CREATE TRIGGER prc_commission_rule_pax_no_delete BEFORE DELETE ON prc_commission_rule_pax
BEGIN SELECT RAISE(ABORT, 'prc_append_only: số tiền theo loại không xoá được'); END;
-- Chỉ dòng PER_PAX mới có số theo loại, và số người lớn phải bằng per_pax_amount của dòng đó.
CREATE TRIGGER prc_commission_rule_pax_rule BEFORE INSERT ON prc_commission_rule_pax
WHEN NOT EXISTS (SELECT 1 FROM prc_commission_rule r WHERE r.id = NEW.rule_id AND r.kind = 'PER_PAX' AND r.per_pax_amount = NEW.adult_amount)
BEGIN SELECT RAISE(ABORT, 'prc_pax_rule_mismatch: chỉ dòng mức kiểu đ/khách mới có số theo loại, và số người lớn phải bằng số đ/khách của dòng đó'); END;
-- View công bố cho orders (đọc xuyên module chỉ qua view).
CREATE VIEW v_prc_commission_rule_pax AS
  SELECT rule_id, adult_amount, child_amount, senior_amount FROM prc_commission_rule_pax;

-- ===== orders: bản chụp ba số tiền cùng bản chụp điều khoản (ADR-0133 điều 3) ============================================================
CREATE TABLE ord_service_terms_pax (
  terms_id      TEXT PRIMARY KEY REFERENCES ord_service_terms(id),
  adult_amount  INTEGER NOT NULL CHECK (adult_amount  BETWEEN 0 AND 100000000),
  child_amount  INTEGER NOT NULL CHECK (child_amount  BETWEEN 0 AND 100000000),
  senior_amount INTEGER NOT NULL CHECK (senior_amount BETWEEN 0 AND 100000000),
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);
CREATE TRIGGER ord_service_terms_pax_no_update BEFORE UPDATE ON ord_service_terms_pax
BEGIN SELECT RAISE(ABORT, 'terms_append_only: bản chụp số theo loại không sửa được — ghi bản chụp mới'); END;
CREATE TRIGGER ord_service_terms_pax_no_delete BEFORE DELETE ON ord_service_terms_pax
BEGIN SELECT RAISE(ABORT, 'terms_append_only: bản chụp số theo loại không xoá được'); END;
-- Chỉ gắn vào bản chụp hoa hồng SET kiểu PER_PAX; số người lớn bằng commission_per_pax của bản đó.
CREATE TRIGGER ord_service_terms_pax_terms BEFORE INSERT ON ord_service_terms_pax
WHEN NOT EXISTS (SELECT 1 FROM ord_service_terms t WHERE t.id = NEW.terms_id AND t.commission_status = 'SET' AND t.commission_kind = 'PER_PAX' AND t.commission_per_pax = NEW.adult_amount)
BEGIN SELECT RAISE(ABORT, 'terms_pax_mismatch: chỉ bản chụp hoa hồng đ/khách mới có số theo loại, và số người lớn phải bằng số đ/khách của bản chụp'); END;
-- Chỉ gắn vào bản hiện hành (chưa bị bản mới thay).
CREATE TRIGGER ord_service_terms_pax_current BEFORE INSERT ON ord_service_terms_pax
WHEN EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = NEW.terms_id)
BEGIN SELECT RAISE(ABORT, 'terms_pax_superseded: bản chụp đã bị bản mới thay — không gắn thêm số theo loại'); END;
-- Đơn đã Đã giao thì không chụp thêm (cùng nghĩa ord_service_terms_delivered).
CREATE TRIGGER ord_service_terms_pax_delivered BEFORE INSERT ON ord_service_terms_pax
WHEN EXISTS (SELECT 1 FROM ord_service_terms t JOIN orders o ON o.id = t.order_id WHERE t.id = NEW.terms_id AND o.delivered_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'terms_order_delivered: đơn đã Đã giao — không chụp thêm'); END;
-- Bản AUTO trỏ dòng mức: ba số phải khớp dòng phụ của mức đó (mức không có dòng phụ, hoặc đã đổi ⇒ cả lô rơi), cùng ý với terms_rule_stale.
CREATE TRIGGER ord_service_terms_pax_rule BEFORE INSERT ON ord_service_terms_pax
WHEN EXISTS (SELECT 1 FROM ord_service_terms t WHERE t.id = NEW.terms_id AND t.source = 'AUTO' AND t.commission_rule_id IS NOT NULL)
 AND NOT EXISTS (SELECT 1 FROM ord_service_terms t JOIN v_prc_commission_rule_pax p ON p.rule_id = t.commission_rule_id
   WHERE t.id = NEW.terms_id AND p.adult_amount = NEW.adult_amount AND p.child_amount = NEW.child_amount AND p.senior_amount = NEW.senior_amount)
BEGIN SELECT RAISE(ABORT, 'terms_pax_rule_stale: số theo loại không khớp dòng mức nguồn'); END;
