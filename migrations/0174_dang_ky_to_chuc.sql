-- Đợt 2 đăng ký đối tác: phần tổ chức (ADR-0212). Tệp này nhận các phần của nhiều việc; mỗi phần ghi đầu mục.

-- ===== parties — dấu «Thu thông tin tổ chức» của chính sách riêng tư (ADR-0212 Đ7) =====
-- Phiên bản chính sách riêng tư tự nói mình đã nêu việc thu thông tin của tổ chức hay chưa. Phần tổ chức của biểu mẫu đăng ký chỉ mở khi bản ĐANG hiệu lực có dấu này.
-- Bảng chỉ-thêm (trigger cũ chặn sửa/xoá) nên dấu chỉ đặt lúc đăng bản mới; bản cũ giữ 0 = chưa nêu. Không lộ ra điểm cuối công khai của chính sách.
ALTER TABLE pty_privacy_policy ADD COLUMN covers_org_data INTEGER NOT NULL DEFAULT 0 CHECK (covers_org_data IN (0, 1));

-- Hai view công bố của 0171 thêm cột (DROP + CREATE: không sửa 0171 đã áp remote).
DROP VIEW v_pty_privacy_current;
CREATE VIEW v_pty_privacy_current AS
SELECT p.id, p.version, p.purposes, p.body, p.valid_from_at, p.covers_org_data
FROM pty_privacy_policy p
ORDER BY p.version DESC
LIMIT 1;

DROP VIEW v_pty_privacy_effective;
CREATE VIEW v_pty_privacy_effective AS
SELECT p.id, p.version, p.valid_from_at, p.covers_org_data
FROM pty_privacy_policy p
WHERE p.valid_from_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
ORDER BY p.version DESC
LIMIT 1;

-- ===== dang-ky — phần tổ chức của phiếu (ADR-0212 Đ2, Đ4, Đ7; đợt 2 Task 5) =====
-- Bảng anh em của bản khai: MỘT dòng bất biến cho mỗi (phiếu, phiên bản bản khai) có phần tổ chức, sinh CÙNG lô với dòng dk_submission lúc gửi. Cột soi theo pty_party / pty_organization /
-- pty_organization_document để lệnh duyệt chép một–một (5.2). Trần độ dài không rộng hơn cột đích (tên gọi 200, tên pháp lý 300, địa chỉ 300, email 200). Cột số và khoá chỉ CHECK độ dài
-- (≤ 40) để dấu ẩn danh 'XOA' || mã dòng (35 ký tự) đi qua được. Hạng (5.20): mã số thuế, số GPKD, số giấy phép thêm, các khoá chuẩn hoá và nơi cấp N3; tên, địa chỉ, email hoá đơn,
-- số điện thoại tổ chức N2 — KHÔNG BAO GIỜ vào nhật ký, lịch sử phiếu, câu báo lỗi, view công bố. Không view v_dk_*. Bốn cột kiểm toán theo ADR-0003 (bài architecture.test.ts).
CREATE TABLE dk_submission_org (
  id                      TEXT PRIMARY KEY,
  registration_id         TEXT NOT NULL REFERENCES dk_registration(id),
  version                 INTEGER NOT NULL CHECK (version >= 1),
  display_name            TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 200),
  legal_name              TEXT CHECK (legal_name IS NULL OR length(trim(legal_name)) BETWEEN 1 AND 300),
  tax_code                TEXT CHECK (tax_code IS NULL OR length(trim(tax_code)) BETWEEN 1 AND 40),
  tax_key                 TEXT CHECK (tax_key IS NULL OR length(tax_key) BETWEEN 1 AND 40),
  address                 TEXT CHECK (address IS NULL OR length(trim(address)) BETWEEN 1 AND 300),
  invoice_email           TEXT CHECK (invoice_email IS NULL OR length(trim(invoice_email)) BETWEEN 1 AND 200),
  phone_value             TEXT CHECK (phone_value IS NULL OR length(trim(phone_value)) BETWEEN 1 AND 40),
  phone_key               TEXT CHECK (phone_key IS NULL OR length(phone_key) BETWEEN 1 AND 40),
  gpkd_number             TEXT NOT NULL CHECK (length(trim(gpkd_number)) BETWEEN 1 AND 40),
  gpkd_key                TEXT NOT NULL CHECK (gpkd_key = upper(gpkd_key) AND length(gpkd_key) BETWEEN 1 AND 40),
  gpkd_issued_date        TEXT CHECK (gpkd_issued_date IS NULL OR date(gpkd_issued_date) IS gpkd_issued_date),
  gpkd_issued_place       TEXT CHECK (gpkd_issued_place IS NULL OR length(trim(gpkd_issued_place)) BETWEEN 1 AND 200),
  extra_type_code         TEXT,                                                -- loại giấy phép thêm (pty_organization_document_type đang bật, kiểm ở mã); NULL = không khai
  extra_number            TEXT CHECK (extra_number IS NULL OR length(trim(extra_number)) BETWEEN 1 AND 40),
  extra_key               TEXT CHECK (extra_key IS NULL OR (extra_key = upper(extra_key) AND length(extra_key) BETWEEN 1 AND 40)),
  extra_issued_date       TEXT CHECK (extra_issued_date IS NULL OR date(extra_issued_date) IS extra_issued_date),
  extra_issued_place      TEXT CHECK (extra_issued_place IS NULL OR length(trim(extra_issued_place)) BETWEEN 1 AND 200),
  extra_expiry_date       TEXT CHECK (extra_expiry_date IS NULL OR date(extra_expiry_date) IS extra_expiry_date),
  authority_confirmed_at  TEXT NOT NULL,                                       -- lúc người đăng ký tích «tôi được tổ chức cho phép đăng ký thay» (chứng cứ của phiếu, không chép sang hồ sơ)
  erased_at               TEXT,
  created_at              TEXT NOT NULL,
  created_by              TEXT,
  updated_at              TEXT NOT NULL,
  updated_by              TEXT,
  UNIQUE (registration_id, version),
  CHECK ((tax_code IS NULL) = (tax_key IS NULL)),
  CHECK ((phone_value IS NULL) = (phone_key IS NULL)),
  CHECK ((extra_number IS NULL) = (extra_key IS NULL)),
  CHECK (extra_type_code IS NOT NULL OR (extra_number IS NULL AND extra_issued_date IS NULL AND extra_issued_place IS NULL AND extra_expiry_date IS NULL)),
  CHECK (extra_expiry_date IS NULL OR extra_issued_date IS NULL OR extra_expiry_date >= extra_issued_date)
);
-- Chỉ chèn đúng phiên bản kế tiếp (khuôn dk_submission_version: chèn TRƯỚC câu tăng current_version trong lô gửi) VÀ phải có bản khai cá nhân cùng phiên bản.
CREATE TRIGGER dk_submission_org_version BEFORE INSERT ON dk_submission_org
WHEN NEW.version IS NOT (SELECT current_version + 1 FROM dk_registration WHERE id = NEW.registration_id)
  OR NOT EXISTS (SELECT 1 FROM dk_submission s WHERE s.registration_id = NEW.registration_id AND s.version = NEW.version)
BEGIN SELECT RAISE(ABORT, 'dk_submission_org_version: phần tổ chức phải đi cùng bản khai kế tiếp của phiếu'); END;
CREATE TRIGGER dk_submission_org_content BEFORE UPDATE ON dk_submission_org
WHEN NOT (OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'dk_submission_org_content: phần tổ chức của bản khai bất biến, chỉ ẩn danh được một lần'); END;
-- Ẩn danh hẹp (khuôn dk_submission_erase_shape): tên gọi thành dấu '(đã ẩn)'; tên pháp lý, địa chỉ, email, điện thoại, nơi cấp về NULL; số và khoá thay bằng 'XOA' || mã dòng;
-- khoá phiếu, phiên bản, loại giấy phép, các ngày, chứng cứ «được phép đăng ký thay» giữ nguyên.
CREATE TRIGGER dk_submission_org_erase_shape BEFORE UPDATE ON dk_submission_org
WHEN OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL AND (
     NEW.id IS NOT OLD.id OR NEW.registration_id IS NOT OLD.registration_id OR NEW.version IS NOT OLD.version
  OR NEW.authority_confirmed_at IS NOT OLD.authority_confirmed_at OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR NEW.extra_type_code IS NOT OLD.extra_type_code OR NEW.gpkd_issued_date IS NOT OLD.gpkd_issued_date
  OR NEW.extra_issued_date IS NOT OLD.extra_issued_date OR NEW.extra_expiry_date IS NOT OLD.extra_expiry_date
  OR NEW.display_name IS NOT '(đã ẩn)'
  OR NEW.legal_name IS NOT NULL OR NEW.address IS NOT NULL OR NEW.invoice_email IS NOT NULL OR NEW.phone_value IS NOT NULL OR NEW.phone_key IS NOT NULL
  OR NEW.gpkd_issued_place IS NOT NULL OR NEW.extra_issued_place IS NOT NULL
  OR NEW.tax_code IS NOT (CASE WHEN OLD.tax_code IS NULL THEN NULL ELSE 'XOA' || upper(replace(OLD.id, '-', '')) END)
  OR NEW.tax_key IS NOT (CASE WHEN OLD.tax_key IS NULL THEN NULL ELSE 'XOA' || upper(replace(OLD.id, '-', '')) END)
  OR NEW.gpkd_number IS NOT 'XOA' || upper(replace(OLD.id, '-', ''))
  OR NEW.gpkd_key IS NOT 'XOA' || upper(replace(OLD.id, '-', ''))
  OR NEW.extra_number IS NOT (CASE WHEN OLD.extra_number IS NULL THEN NULL ELSE 'XOA' || upper(replace(OLD.id, '-', '')) END)
  OR NEW.extra_key IS NOT (CASE WHEN OLD.extra_key IS NULL THEN NULL ELSE 'XOA' || upper(replace(OLD.id, '-', '')) END))
BEGIN SELECT RAISE(ABORT, 'dk_submission_org_erase_shape: ẩn danh hoá chỉ thay giá trị khai bằng dấu — không sửa khoá hay chứng cứ'); END;
CREATE TRIGGER dk_submission_org_no_delete BEFORE DELETE ON dk_submission_org
BEGIN SELECT RAISE(ABORT, 'dk_submission_org_content: phần tổ chức của bản khai không xoá'); END;

-- Vai của tổ chức (khoá sau lần gửi đầu như role_code) và kết luận Danh bạ của tổ chức (tách khỏi của cá nhân). Cột mới rỗng được; tham chiếu logic, không khoá ngoại (ADR-0003).
ALTER TABLE dk_registration ADD COLUMN org_role_code TEXT;
ALTER TABLE dk_registration ADD COLUMN org_match_kind TEXT CHECK (org_match_kind IS NULL OR org_match_kind IN ('NEW', 'EXISTING'));
ALTER TABLE dk_registration ADD COLUMN org_match_party_id TEXT;
-- ALTER không thêm được CHECK nhiều cột: hai trigger thay CHECK (khuôn CHECK của match_*, chặt hơn: chưa kết luận thì cũng không được có hồ sơ).
CREATE TRIGGER dk_registration_org_match_shape_ins BEFORE INSERT ON dk_registration
WHEN NOT ((NEW.org_match_kind IS NULL AND NEW.org_match_party_id IS NULL) OR (NEW.org_match_kind IS 'NEW' AND NEW.org_match_party_id IS NULL)
  OR (NEW.org_match_kind IS 'EXISTING' AND NEW.org_match_party_id IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'dk_registration_org_match_shape: gắn tổ chức có sẵn phải kèm hồ sơ, hồ sơ tổ chức mới thì không'); END;
CREATE TRIGGER dk_registration_org_match_shape BEFORE UPDATE OF org_match_kind, org_match_party_id ON dk_registration
WHEN NOT ((NEW.org_match_kind IS NULL AND NEW.org_match_party_id IS NULL) OR (NEW.org_match_kind IS 'NEW' AND NEW.org_match_party_id IS NULL)
  OR (NEW.org_match_kind IS 'EXISTING' AND NEW.org_match_party_id IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'dk_registration_org_match_shape: gắn tổ chức có sẵn phải kèm hồ sơ, hồ sơ tổ chức mới thì không'); END;

-- Ba trigger của 0170 tạo lại (DROP + CREATE: không sửa 0170 đã áp remote). Thân CHÉP NGUYÊN 0170, chỉ thêm phần ghi ở mỗi chú thích.
-- (1) + org_role_code khoá sau lần gửi đầu.
DROP TRIGGER dk_registration_immutable;
CREATE TRIGGER dk_registration_immutable BEFORE UPDATE ON dk_registration
WHEN NEW.id IS NOT OLD.id OR NEW.kind IS NOT OLD.kind OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR (NEW.role_code IS NOT OLD.role_code AND OLD.current_version > 0)
  OR (NEW.org_role_code IS NOT OLD.org_role_code AND OLD.current_version > 0)
  OR (NEW.current_version IS NOT OLD.current_version AND NEW.current_version IS NOT OLD.current_version + 1)
BEGIN SELECT RAISE(ABORT, 'dk_registration_immutable: cột gốc của phiếu không sửa; số bản khai chỉ tăng đúng 1'); END;
-- (2) «Trả về xác minh» xoá cả kết luận Danh bạ của tổ chức.
DROP TRIGGER dk_registration_return_clear;
CREATE TRIGGER dk_registration_return_clear BEFORE UPDATE OF status ON dk_registration
WHEN OLD.status = 'CHO_DUYET' AND NEW.status = 'CHO_XAC_MINH'
  AND (NEW.verified_by IS NOT NULL OR NEW.verified_version IS NOT NULL OR NEW.verified_at IS NOT NULL OR NEW.match_kind IS NOT NULL OR NEW.match_party_id IS NOT NULL OR NEW.referrer_party_id IS NOT NULL
    OR NEW.org_match_kind IS NOT NULL OR NEW.org_match_party_id IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'dk_registration_return_clear: trả về xác minh phải xoá kết luận Danh bạ và người xác minh'); END;
-- (3) Câu chốt DUYỆT đòi kết luận Danh bạ của tổ chức khi bản khai đang duyệt có phần tổ chức (câu mới đứng ngay sau câu đòi kết luận của cá nhân).
DROP TRIGGER dk_decision_guard;
CREATE TRIGGER dk_decision_guard BEFORE INSERT ON dk_decision
BEGIN
  SELECT RAISE(ABORT, 'dk_decision_state: phiếu không còn ở bước chờ duyệt')
    WHERE NEW.kind = 'DUYET' AND (SELECT status FROM dk_registration WHERE id = NEW.registration_id) IS NOT 'CHO_DUYET';
  SELECT RAISE(ABORT, 'dk_decision_version: bản khai đã đổi sau khi mở màn duyệt')
    WHERE NEW.kind = 'DUYET' AND NEW.version IS NOT (SELECT current_version FROM dk_registration WHERE id = NEW.registration_id);
  SELECT RAISE(ABORT, 'dk_decision_no_match: chưa có kết luận Danh bạ cho phiếu')
    WHERE NEW.kind = 'DUYET' AND (SELECT match_kind FROM dk_registration WHERE id = NEW.registration_id) IS NULL;
  SELECT RAISE(ABORT, 'dk_decision_no_org_match: chưa có kết luận Danh bạ cho tổ chức của phiếu')
    WHERE NEW.kind = 'DUYET' AND (SELECT org_match_kind FROM dk_registration WHERE id = NEW.registration_id) IS NULL
      AND EXISTS (SELECT 1 FROM dk_submission_org o WHERE o.registration_id = NEW.registration_id AND o.version = NEW.version);
  SELECT RAISE(ABORT, 'dk_decision_not_verified: bản khai này chưa được xác minh đạt')
    WHERE NEW.kind = 'DUYET' AND (SELECT verified_by IS NULL OR verified_version IS NOT current_version FROM dk_registration WHERE id = NEW.registration_id);
  SELECT RAISE(ABORT, 'dk_decision_same_person: người duyệt phải khác người xác minh')
    WHERE NEW.kind = 'DUYET' AND NEW.super_admin_flag = 0 AND NEW.decided_by IS (SELECT verified_by FROM dk_registration WHERE id = NEW.registration_id);
  SELECT RAISE(ABORT, 'dk_activation_state: phiếu chưa được duyệt')
    WHERE NEW.kind = 'KICH_HOAT' AND (SELECT status FROM dk_registration WHERE id = NEW.registration_id) IS NOT 'DA_DUYET';
  SELECT RAISE(ABORT, 'dk_activation_done: tài khoản của phiếu đã kích hoạt')
    WHERE NEW.kind = 'KICH_HOAT' AND ((SELECT activated_at FROM dk_registration WHERE id = NEW.registration_id) IS NOT NULL
      OR EXISTS (SELECT 1 FROM dk_decision WHERE registration_id = NEW.registration_id AND kind = 'KICH_HOAT'));
  SELECT RAISE(ABORT, 'dk_activation_late: quá hạn đặt mã PIN, cần gửi lại lời mời')
    WHERE NEW.kind = 'KICH_HOAT' AND NOT COALESCE(NEW.decided_at <= (SELECT activation_deadline_at FROM dk_registration WHERE id = NEW.registration_id), 0);
END;

-- ===== parties — mục xác minh của tổ chức (ADR-0212 Đ5; đợt 2 Task 6) =====
-- Tập đóng mở thêm bốn thuộc tính và giấy tờ GPKD (phiếu đăng ký đã có ô cho chúng từ Task 5). Phải khớp hằng MUC_XAC_MINH_MO (src/shared/dau-xac-minh.ts; bài tep-cho.test.ts đối chiếu).
-- Thân CHÉP NGUYÊN 0171, chỉ thêm mã vào hai danh sách IN.
DROP TRIGGER pty_verification_requirement_item_closed;
CREATE TRIGGER pty_verification_requirement_item_closed BEFORE INSERT ON pty_verification_requirement
WHEN NOT ((NEW.item_kind = 'ATTRIBUTE' AND NEW.item_code IN ('HO_TEN', 'NGAY_SINH', 'TEN_PHAP_LY', 'MA_SO_THUE', 'DIA_CHI_TO_CHUC', 'EMAIL_HOA_DON')) OR (NEW.item_kind = 'DOCUMENT' AND NEW.item_code IN ('CCCD', 'GPKD')))
  AND NEW.item_code = upper(NEW.item_code) AND length(NEW.item_code) BETWEEN 2 AND 40 AND NEW.item_code NOT GLOB '*[^A-Z0-9_]*'   -- sai khuôn thì để CHECK báo (trigger BEFORE chạy trước CHECK)
BEGIN SELECT RAISE(ABORT, 'verification_requirement_item_closed: mục này chưa có ô khai trong phiếu đăng ký — thêm ô vào phiếu trước'); END;
-- Mặc định cho TỔ CHỨC (ADR-0212 Đ5 mục 2): tên pháp lý, mã số thuế, GPKD. Hệ quả có chủ đích (điều phối PF6): mọi hồ sơ tổ chức đang có hiện «Chưa xác minh» (dấu chỉ để biết, ADR-0210 Đ5).
INSERT INTO pty_verification_requirement (id, subject_kind, item_kind, item_code, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES
  ('gieo-0174-ten-phap-ly', 'ORGANIZATION', 'ATTRIBUTE', 'TEN_PHAP_LY', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL),
  ('gieo-0174-ma-so-thue',  'ORGANIZATION', 'ATTRIBUTE', 'MA_SO_THUE',  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL),
  ('gieo-0174-gpkd',        'ORGANIZATION', 'DOCUMENT',  'GPKD',        strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);

-- View dữ kiện xác minh (0171) tạo lại: mục GIẤY TỜ của hồ sơ TỔ CHỨC đọc dòng pty_organization_document hiện hành và dòng xác minh ORG_DOCUMENT (0171 chỉ đọc giấy tờ cá nhân ⇒ GPKD
-- của tổ chức không bao giờ «đạt»). Nhánh cá nhân CHÉP NGUYÊN 0171 (thêm điều kiện loại hồ sơ). Giấy tờ tổ chức không có cột ẩn danh. Chỉ mục ghép cho truy vấn con theo từng tổ chức.
CREATE INDEX pty_organization_document_party_type_ix ON pty_organization_document(party_id, document_type_code);
DROP VIEW v_pty_verification_facts;
CREATE VIEW v_pty_verification_facts AS
SELECT x.party_id, x.subject_kind, x.item_kind, x.item_code, x.is_partner, x.anonymized, x.doc_id, COALESCE(d.expiry_date, od.expiry_date) AS expiry_date,
  CASE x.item_kind
    WHEN 'ATTRIBUTE' THEN (SELECT v.outcome FROM pty_verification v WHERE v.party_id = x.eff_id AND v.target_kind = 'ATTRIBUTE' AND v.attribute_code = x.item_code
                            ORDER BY v.created_at DESC, v.rowid DESC LIMIT 1)
    WHEN 'DOCUMENT' THEN (SELECT v.outcome FROM pty_verification v WHERE v.party_id = x.eff_id
                            AND v.target_kind = CASE x.subject_kind WHEN 'ORGANIZATION' THEN 'ORG_DOCUMENT' ELSE 'PERSON_DOCUMENT' END AND v.target_id = x.doc_id
                           ORDER BY v.created_at DESC, v.rowid DESC LIMIT 1)
  END AS last_outcome,
  CASE x.item_kind
    WHEN 'ATTRIBUTE' THEN EXISTS (SELECT 1 FROM pty_verification v WHERE v.party_id = x.eff_id AND v.target_kind = 'ATTRIBUTE' AND v.attribute_code = x.item_code AND v.outcome = 'DA_XAC_MINH')
    WHEN 'DOCUMENT' THEN CASE x.subject_kind
      WHEN 'ORGANIZATION' THEN EXISTS (SELECT 1 FROM pty_verification v JOIN pty_organization_document g ON g.id = v.target_id
                                        WHERE v.party_id = x.eff_id AND v.target_kind = 'ORG_DOCUMENT' AND v.outcome = 'DA_XAC_MINH' AND g.document_type_code = x.item_code)
      ELSE EXISTS (SELECT 1 FROM pty_verification v JOIN pty_person_document g ON g.id = v.target_id
                    WHERE v.party_id = x.eff_id AND v.target_kind = 'PERSON_DOCUMENT' AND v.outcome = 'DA_XAC_MINH' AND g.document_type_code = x.item_code)
    END
    ELSE 0
  END AS ever_passed
FROM (
  SELECT p.id AS party_id, COALESCE(p.merged_into_id, p.id) AS eff_id, p.party_kind AS subject_kind, r.item_kind, r.item_code,
    EXISTS (SELECT 1 FROM pty_party_role pr JOIN pty_role_type rt ON rt.code = pr.role_type_code
            WHERE pr.party_id IN (p.id, COALESCE(p.merged_into_id, p.id)) AND pr.valid_to_date IS NULL AND rt.is_partner_label = 1) AS is_partner,
    EXISTS (SELECT 1 FROM pty_erasure_request e WHERE e.party_id = COALESCE(p.merged_into_id, p.id) AND e.status = 'DA_THUC_HIEN') AS anonymized,
    CASE WHEN r.item_kind = 'DOCUMENT' AND p.party_kind = 'PERSON' THEN
      (SELECT g.id FROM pty_person_document g
        WHERE g.party_id = COALESCE(p.merged_into_id, p.id) AND g.document_type_code = r.item_code AND g.voided_at IS NULL AND g.erased_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM pty_person_document n WHERE n.previous_id = g.id AND n.voided_at IS NULL)
        ORDER BY g.created_at DESC, g.id DESC LIMIT 1)
    WHEN r.item_kind = 'DOCUMENT' AND p.party_kind = 'ORGANIZATION' THEN
      (SELECT g.id FROM pty_organization_document g
        WHERE g.party_id = COALESCE(p.merged_into_id, p.id) AND g.document_type_code = r.item_code AND g.voided_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM pty_organization_document n WHERE n.previous_id = g.id AND n.voided_at IS NULL)
        ORDER BY g.created_at DESC, g.id DESC LIMIT 1)
    END AS doc_id
  FROM pty_party p LEFT JOIN v_pty_verification_requirement r ON r.subject_kind = p.party_kind
) x LEFT JOIN pty_person_document d ON d.id = x.doc_id AND x.subject_kind = 'PERSON'
    LEFT JOIN pty_organization_document od ON od.id = x.doc_id AND x.subject_kind = 'ORGANIZATION';
