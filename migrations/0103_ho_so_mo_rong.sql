-- Migration 0103 — ADR-0122 (accepted 2026-10-16) + ADR-0126 điều 1 (accepted 2026-10-16): hồ sơ mở rộng của module parties. CHỈ THÊM.
-- KHÔNG gieo dữ liệu cá nhân, KHÔNG gieo văn bản chính sách riêng tư, KHÔNG có cột / con số thời hạn xoá (ADR-0126 đ2: con số chờ luật sư — lát H-5).
-- Trigger chỉ đọc bảng của chính module (Hiến chương 5.3); tên bắt đầu pty_ (không staff_/stf_ — src/migrations-n1.test.ts coi đó là trigger siết B5).
-- Người thao tác (người xác minh, người đăng chính sách, tài khoản đồng ý) ghi ở created_by — KHÔNG khoá ngoại sang staff (ADR-0003; cạnh parties → staff không có).

-- (1) Ngày sinh (ADR-0122 đ1). NULL = chưa khai. "Không ở tương lai" kiểm ở máy chủ (CHECK không dùng được date('now')).
ALTER TABLE pty_person ADD COLUMN birth_date TEXT CHECK (birth_date IS NULL OR (date(birth_date) IS birth_date AND birth_date >= '1900-01-01'));

-- (2) Địa chỉ cá nhân = loại liên hệ ADDRESS (ADR-0122 đ1, đ6). Chỉ hồ sơ CÁ NHÂN: địa chỉ tổ chức ở pty_organization.address (một nơi, N7).
INSERT INTO pty_contact_kind (code, name, sort_order) VALUES ('ADDRESS', 'Địa chỉ', 3);
CREATE TRIGGER pty_contact_point_address_person_ins BEFORE INSERT ON pty_contact_point
WHEN NEW.contact_kind_code = 'ADDRESS' AND NOT EXISTS (SELECT 1 FROM pty_person WHERE party_id = NEW.party_id)
BEGIN SELECT RAISE(ABORT, 'contact_address_person_only: địa chỉ cá nhân chỉ ghi cho hồ sơ cá nhân'); END;
CREATE TRIGGER pty_contact_point_address_person_upd BEFORE UPDATE OF contact_kind_code, party_id ON pty_contact_point
WHEN NEW.contact_kind_code = 'ADDRESS' AND NOT EXISTS (SELECT 1 FROM pty_person WHERE party_id = NEW.party_id)
BEGIN SELECT RAISE(ABORT, 'contact_address_person_only: địa chỉ cá nhân chỉ ghi cho hồ sơ cá nhân'); END;

-- (3) Giấy tờ của TỔ CHỨC (ADR-0122 đ2) — khuôn y hệt pty_person_document (0032). Danh mục loại do Quản trị sửa (màn hình ở lát H-2).
-- Mã 'GPKD' CỐ ĐỊNH (CHECK / trigger dưới đây dựa vào nó; đổi bằng ADR). Bốn loại còn lại là tên đề xuất, sửa được.
CREATE TABLE pty_organization_document_type (
  code        TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 30),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  has_expiry  INTEGER NOT NULL DEFAULT 1 CHECK (has_expiry IN (0, 1)),    -- 0: loại không có ngày hết hạn; 1: có thể có (để trống = không hạn)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
INSERT INTO pty_organization_document_type (code, name, has_expiry, sort_order, created_at, updated_at) VALUES
  ('GPKD', 'Giấy chứng nhận đăng ký kinh doanh', 0, 1, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('TRAVEL_DOMESTIC', 'Giấy phép kinh doanh dịch vụ lữ hành nội địa', 1, 2, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('TRAVEL_INTERNATIONAL', 'Giấy phép kinh doanh dịch vụ lữ hành quốc tế', 1, 3, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('ACCOMMODATION', 'Giấy chứng nhận xếp hạng cơ sở lưu trú', 1, 4, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('TRANSPORT', 'Giấy phép kinh doanh vận tải bằng xe ô tô', 1, 5, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z');

-- number_key = số đã chuẩn hoá (chữ HOA, bỏ khoảng trắng . - /) do máy chủ tính. Số và nơi cấp là dữ liệu hạng N3 (giấy phép của hộ kinh doanh — Hiến chương 5.20):
-- KHÔNG BAO GIỜ vào nhật ký, Bảng tin, thông báo. Gia hạn = THÊM dòng nối previous_id; nhập nhầm = voided_at; không xoá.
CREATE TABLE pty_organization_document (
  id                  TEXT PRIMARY KEY,
  party_id            TEXT NOT NULL REFERENCES pty_organization(party_id),
  document_type_code  TEXT NOT NULL REFERENCES pty_organization_document_type(code),
  document_number     TEXT CHECK (document_number IS NULL OR length(trim(document_number)) BETWEEN 1 AND 40),
  number_key          TEXT CHECK (number_key IS NULL OR (number_key = upper(number_key) AND length(number_key) BETWEEN 1 AND 40)),
  issued_date         TEXT CHECK (issued_date IS NULL OR date(issued_date) IS issued_date),
  issued_place        TEXT CHECK (issued_place IS NULL OR length(trim(issued_place)) BETWEEN 1 AND 200),
  expiry_date         TEXT CHECK (expiry_date IS NULL OR date(expiry_date) IS expiry_date),     -- NULL = không hạn
  previous_id         TEXT REFERENCES pty_organization_document(id),                            -- dòng này GIA HẠN dòng nào
  voided_at           TEXT,                                                                      -- huỷ dòng nhập nhầm (không xoá)
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  CHECK ((document_number IS NULL) = (number_key IS NULL)),
  CHECK (document_number IS NOT NULL OR document_type_code <> 'GPKD'),
  CHECK (expiry_date IS NULL OR issued_date IS NULL OR expiry_date >= issued_date),
  CHECK (previous_id IS NULL OR previous_id <> id)
);
CREATE INDEX pty_organization_document_party_ix ON pty_organization_document(party_id);
CREATE INDEX pty_organization_document_number_ix ON pty_organization_document(document_type_code, number_key);
CREATE UNIQUE INDEX pty_organization_document_next_uq ON pty_organization_document(previous_id) WHERE previous_id IS NOT NULL AND voided_at IS NULL;

CREATE TRIGGER pty_organization_document_no_delete BEFORE DELETE ON pty_organization_document
BEGIN SELECT RAISE(ABORT, 'organization_document_no_delete: giấy tờ không xoá — nhập nhầm thì huỷ dòng'); END;
CREATE TRIGGER pty_organization_document_superseded BEFORE UPDATE ON pty_organization_document
WHEN EXISTS (SELECT 1 FROM pty_organization_document n WHERE n.previous_id = OLD.id AND n.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'organization_document_superseded: giấy tờ đã có dòng gia hạn — không sửa đè'); END;
CREATE TRIGGER pty_organization_document_voided BEFORE UPDATE ON pty_organization_document
WHEN OLD.voided_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'organization_document_voided: dòng đã huỷ — không sửa'); END;
CREATE TRIGGER pty_organization_document_identity BEFORE UPDATE ON pty_organization_document
WHEN NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.document_type_code IS NOT OLD.document_type_code
  OR NEW.previous_id IS NOT OLD.previous_id OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'organization_document_identity: không đổi tổ chức, loại, dòng trước, mốc tạo'); END;
CREATE TRIGGER pty_organization_document_renew_ins BEFORE INSERT ON pty_organization_document
WHEN NEW.previous_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM pty_organization_document p
  WHERE p.id = NEW.previous_id AND p.party_id = NEW.party_id AND p.document_type_code = NEW.document_type_code AND p.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'organization_document_renew_mismatch: dòng gia hạn phải nối dòng chưa huỷ của cùng tổ chức, cùng loại'); END;
-- Một số GPKD thuộc đúng MỘT tổ chức (khuôn CCCD của 0032): so party_id KHÁC nhau — tổ chức gia hạn giữ số cũ được. Dòng đã huỷ không tính.
CREATE TRIGGER pty_organization_document_gpkd_one_org_ins BEFORE INSERT ON pty_organization_document
WHEN NEW.document_type_code = 'GPKD' AND NEW.voided_at IS NULL AND EXISTS (
  SELECT 1 FROM pty_organization_document o
  WHERE o.document_type_code = 'GPKD' AND o.number_key = NEW.number_key AND o.party_id <> NEW.party_id AND o.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'organization_document_gpkd_other_org: số giấy chứng nhận đăng ký kinh doanh này đã thuộc một tổ chức khác'); END;
CREATE TRIGGER pty_organization_document_gpkd_one_org_upd BEFORE UPDATE OF number_key ON pty_organization_document
WHEN NEW.document_type_code = 'GPKD' AND NEW.voided_at IS NULL AND EXISTS (
  SELECT 1 FROM pty_organization_document o
  WHERE o.id <> NEW.id AND o.document_type_code = 'GPKD' AND o.number_key = NEW.number_key AND o.party_id <> NEW.party_id AND o.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'organization_document_gpkd_other_org: số giấy chứng nhận đăng ký kinh doanh này đã thuộc một tổ chức khác'); END;

-- (4) Kết quả xác minh theo TỪNG dòng (ADR-0122 đ3; Hiến chương 5.23) — CHỈ-THÊM. Trạng thái hiện tại của một đối tượng = dòng mới nhất (lát H-2).
-- target_kind: dòng giấy tờ người / giấy tờ tổ chức / liên hệ, hoặc một THUỘC TÍNH của hồ sơ (attribute_code — bảng tra cứu dưới đây, câu hỏi Q1 của kế hoạch).
-- reason_code: mã lý do từ chối (danh sách đóng sống ở mã — lát H-4; ADR-0125 đ6). verifier_touched_account: Toàn quyền là chốt cuối (ADR-0125 đ5).
-- Thuộc tính xác minh được là DỮ LIỆU (khuôn pty_contact_kind / loại giấy tờ), không CHECK liệt kê: thêm thuộc tính về sau = migration chèn một dòng, không dựng lại
-- bảng chỉ-thêm pty_verification. applies_to: thuộc tính của hồ sơ người hay tổ chức (trigger đích đọc cột này). Bảy dòng gieo là đề xuất (Q1).
CREATE TABLE pty_verification_attribute (
  code        TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 30),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  applies_to  TEXT NOT NULL CHECK (applies_to IN ('PERSON', 'ORGANIZATION')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
INSERT INTO pty_verification_attribute (code, name, applies_to, sort_order, created_at, updated_at) VALUES
  ('HO_TEN', 'Họ tên', 'PERSON', 1, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('NGAY_SINH', 'Ngày sinh', 'PERSON', 2, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('GIOI_TINH', 'Giới tính', 'PERSON', 3, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('TEN_PHAP_LY', 'Tên pháp lý', 'ORGANIZATION', 4, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('MA_SO_THUE', 'Mã số thuế', 'ORGANIZATION', 5, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('DIA_CHI_TO_CHUC', 'Địa chỉ tổ chức', 'ORGANIZATION', 6, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z'),
  ('EMAIL_HOA_DON', 'Email nhận hoá đơn', 'ORGANIZATION', 7, '2026-10-16T00:00:00.000Z', '2026-10-16T00:00:00.000Z');

CREATE TABLE pty_verification (
  id                        TEXT PRIMARY KEY,
  party_id                  TEXT NOT NULL REFERENCES pty_party(id),
  target_kind               TEXT NOT NULL CHECK (target_kind IN ('PERSON_DOCUMENT', 'ORG_DOCUMENT', 'CONTACT', 'ATTRIBUTE')),
  target_id                 TEXT,
  attribute_code            TEXT REFERENCES pty_verification_attribute(code),
  outcome                   TEXT NOT NULL CHECK (outcome IN ('DA_XAC_MINH', 'TU_CHOI', 'CAN_XAC_MINH_LAI')),
  reason_code               TEXT CHECK (reason_code IS NULL OR (reason_code = upper(reason_code) AND length(reason_code) BETWEEN 2 AND 40)),
  verifier_touched_account  INTEGER NOT NULL DEFAULT 0 CHECK (verifier_touched_account IN (0, 1)),
  created_at                TEXT NOT NULL,
  created_by                TEXT,
  updated_at                TEXT NOT NULL,
  updated_by                TEXT,
  CHECK ((target_kind = 'ATTRIBUTE') = (attribute_code IS NOT NULL)),
  CHECK ((target_kind = 'ATTRIBUTE') = (target_id IS NULL)),
  CHECK ((outcome = 'TU_CHOI') = (reason_code IS NOT NULL)),
  CHECK (outcome = 'CAN_XAC_MINH_LAI' OR created_by IS NOT NULL),
  CHECK (verifier_touched_account = 0 OR outcome <> 'CAN_XAC_MINH_LAI')
);
CREATE INDEX pty_verification_party_ix ON pty_verification(party_id, created_at);
CREATE INDEX pty_verification_target_ix ON pty_verification(target_kind, target_id, attribute_code, created_at);
CREATE TRIGGER pty_verification_target_ins BEFORE INSERT ON pty_verification
WHEN (NEW.target_kind = 'PERSON_DOCUMENT' AND NOT EXISTS (SELECT 1 FROM pty_person_document d WHERE d.id = NEW.target_id AND d.party_id = NEW.party_id))
  OR (NEW.target_kind = 'ORG_DOCUMENT' AND NOT EXISTS (SELECT 1 FROM pty_organization_document d WHERE d.id = NEW.target_id AND d.party_id = NEW.party_id))
  OR (NEW.target_kind = 'CONTACT' AND NOT EXISTS (SELECT 1 FROM pty_contact_point c WHERE c.id = NEW.target_id AND c.party_id = NEW.party_id))
  OR (NEW.target_kind = 'ATTRIBUTE' AND NOT EXISTS (
        SELECT 1 FROM pty_verification_attribute a WHERE a.code = NEW.attribute_code AND a.active = 1
          AND ((a.applies_to = 'PERSON' AND EXISTS (SELECT 1 FROM pty_person WHERE party_id = NEW.party_id))
            OR (a.applies_to = 'ORGANIZATION' AND EXISTS (SELECT 1 FROM pty_organization WHERE party_id = NEW.party_id)))))
BEGIN SELECT RAISE(ABORT, 'verification_target_mismatch: dòng được xác minh không thuộc hồ sơ này'); END;
CREATE TRIGGER pty_verification_no_update BEFORE UPDATE ON pty_verification
BEGIN SELECT RAISE(ABORT, 'verification_append_only: kết quả xác minh chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER pty_verification_no_delete BEFORE DELETE ON pty_verification
BEGIN SELECT RAISE(ABORT, 'verification_append_only: kết quả xác minh không xoá'); END;

-- (5) Chính sách riêng tư có phiên bản (ADR-0126 đ1; Hiến chương 5.21) — CHỈ-THÊM; phiên bản liên tiếp từ 1. Phiên bản hiện hành = valid_from_at lớn nhất ≤ bây giờ.
-- Không gieo dòng nào: chưa có chính sách thì không ai gửi được phiếu tự khai (ADR-0124 đ3). Chỉ Toàn quyền đăng (ô và route ở lát H-4).
CREATE TABLE pty_privacy_policy (
  id             TEXT PRIMARY KEY,
  version        INTEGER NOT NULL UNIQUE CHECK (version >= 1),
  purposes       TEXT NOT NULL CHECK (length(trim(purposes)) BETWEEN 1 AND 2000),   -- tóm tắt các mục đích thu dữ liệu
  body           TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 20000),      -- toàn văn chủ dự án duyệt
  valid_from_at  TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  CHECK (created_by IS NOT NULL)
);
CREATE TRIGGER pty_privacy_policy_version_ins BEFORE INSERT ON pty_privacy_policy
WHEN NEW.version <> (SELECT COALESCE(MAX(version), 0) + 1 FROM pty_privacy_policy)
BEGIN SELECT RAISE(ABORT, 'privacy_policy_version_gap: phiên bản chính sách phải nối tiếp phiên bản trước'); END;
CREATE TRIGGER pty_privacy_policy_no_update BEFORE UPDATE ON pty_privacy_policy
BEGIN SELECT RAISE(ABORT, 'privacy_policy_append_only: chính sách đã đăng không sửa — đăng phiên bản mới'); END;
CREATE TRIGGER pty_privacy_policy_no_delete BEFORE DELETE ON pty_privacy_policy
BEGIN SELECT RAISE(ABORT, 'privacy_policy_append_only: chính sách đã đăng không xoá'); END;

-- (6) Đồng ý (ADR-0126 đ1; Hiến chương 5.21) — CHỈ-THÊM; đồng ý theo CẢ phiên bản (câu hỏi Q2 của kế hoạch); rút = dòng mới 'RUT'. created_by = tài khoản bấm.
CREATE TABLE pty_consent (
  id          TEXT PRIMARY KEY,
  party_id    TEXT NOT NULL REFERENCES pty_party(id),
  policy_id   TEXT NOT NULL REFERENCES pty_privacy_policy(id),
  decision    TEXT NOT NULL CHECK (decision IN ('DONG_Y', 'RUT')),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT,
  CHECK (created_by IS NOT NULL)
);
CREATE INDEX pty_consent_party_ix ON pty_consent(party_id, created_at);
CREATE TRIGGER pty_consent_withdraw_ins BEFORE INSERT ON pty_consent
WHEN NEW.decision = 'RUT' AND NOT EXISTS (SELECT 1 FROM pty_consent c WHERE c.party_id = NEW.party_id AND c.policy_id = NEW.policy_id AND c.decision = 'DONG_Y')
BEGIN SELECT RAISE(ABORT, 'consent_withdraw_without_consent: chưa đồng ý phiên bản này thì không có gì để rút'); END;
CREATE TRIGGER pty_consent_no_update BEFORE UPDATE ON pty_consent
BEGIN SELECT RAISE(ABORT, 'consent_append_only: đồng ý chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER pty_consent_no_delete BEFORE DELETE ON pty_consent
BEGIN SELECT RAISE(ABORT, 'consent_append_only: đồng ý không xoá'); END;
