-- Migration 0105 — ADR-0124 (accepted 2026-10-16) + ADR-0126 điều 1 (accepted 2026-10-16): phiếu TỰ KHAI hồ sơ (lát H-3 Gói 2). CHỈ THÊM. Module parties.
-- KHÔNG gieo chính sách riêng tư, KHÔNG gieo phiếu, KHÔNG có cột / con số thời hạn xoá (ADR-0126 đ2 — lát H-5, chờ luật sư).
-- Giá trị khai là ĐỀ XUẤT (Hiến chương 5.23): nằm ở phiếu, KHÔNG ghi vào pty_person / pty_contact_point / pty_person_document cho tới khi người KHÁC xác minh (lát H-4).
-- Hạng (5.20): birth_date, address_value N2; document_number, number_key, issued_place N3 — KHÔNG BAO GIỜ vào nhật ký, view công bố, câu báo lỗi. Bảng KHÔNG có view v_pty_*.
-- Trigger chỉ đọc bảng pty_* (5.3). Người khai / người xử lý ở created_by / decided_by — không khoá ngoại sang staff (ADR-0003).
-- Vòng đời (ruling R3 kế hoạch 2026-10-17-goi-2-h3-tu-khai): NỘI DUNG bất biến; status đi MỘT chiều CHO_XAC_MINH → DA_CHAP_NHAN | TU_CHOI | RUT, cùng lúc decided_at +
-- decided_by (TU_CHOI kèm reason_code — danh sách đóng của lát H-4). Lát H-3 chỉ ghi → RUT. Ảnh của phiếu: loại nối SELF_SUBMISSION của 0104 VẪN ĐÓNG (ruling R1).

CREATE TABLE pty_self_submission (
  id                  TEXT PRIMARY KEY,
  party_id            TEXT NOT NULL REFERENCES pty_person(party_id),     -- chỉ hồ sơ CÁ NHÂN (ruling R5); = staff.party_id của phiên lúc gửi
  subject_kind        TEXT NOT NULL CHECK (subject_kind = upper(subject_kind) AND length(subject_kind) BETWEEN 2 AND 30 AND subject_kind NOT GLOB '*[^A-Z_]*'),
  policy_id           TEXT NOT NULL REFERENCES pty_privacy_policy(id),    -- phiên bản chính sách người khai ĐÃ đồng ý lúc gửi (5.21)
  birth_date          TEXT CHECK (birth_date IS NULL OR (date(birth_date) IS birth_date AND birth_date >= '1900-01-01')),
  address_value       TEXT CHECK (address_value IS NULL OR length(trim(address_value)) BETWEEN 1 AND 200),
  document_type_code  TEXT REFERENCES pty_person_document_type(code),
  document_number     TEXT CHECK (document_number IS NULL OR length(trim(document_number)) BETWEEN 1 AND 40),
  number_key          TEXT CHECK (number_key IS NULL OR (number_key = upper(number_key) AND length(number_key) BETWEEN 1 AND 40)),
  license_class_code  TEXT REFERENCES pty_license_class(code),
  issued_date         TEXT CHECK (issued_date IS NULL OR date(issued_date) IS issued_date),
  issued_place        TEXT CHECK (issued_place IS NULL OR length(trim(issued_place)) BETWEEN 1 AND 200),
  expiry_date         TEXT CHECK (expiry_date IS NULL OR date(expiry_date) IS expiry_date),
  status              TEXT NOT NULL CHECK (status IN ('CHO_XAC_MINH', 'DA_CHAP_NHAN', 'TU_CHOI', 'RUT')),
  decided_at          TEXT,
  decided_by          TEXT,
  reason_code         TEXT CHECK (reason_code IS NULL OR (reason_code = upper(reason_code) AND length(reason_code) BETWEEN 2 AND 40 AND reason_code NOT GLOB '*[^A-Z0-9_]*')),
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  CHECK (created_by IS NOT NULL),
  CHECK ((subject_kind = 'NGAY_SINH') = (birth_date IS NOT NULL)),
  CHECK ((subject_kind = 'DIA_CHI') = (address_value IS NOT NULL)),
  CHECK ((subject_kind = 'GIAY_TO') = (document_type_code IS NOT NULL)),
  CHECK (subject_kind = 'GIAY_TO' OR (number_key IS NULL AND license_class_code IS NULL AND issued_date IS NULL AND issued_place IS NULL AND expiry_date IS NULL)),
  CHECK ((document_number IS NULL) = (number_key IS NULL)),
  -- Cùng luật hình dạng của pty_person_document (0032) để phiếu được chấp nhận ở H-4 không vỡ CHECK lúc chép sang: CCCD / GPLX bắt buộc số; hạng chỉ và bắt buộc với GPLX.
  CHECK (document_number IS NOT NULL OR document_type_code IS NULL OR document_type_code NOT IN ('CCCD', 'GPLX')),
  CHECK ((document_type_code IS 'GPLX') = (license_class_code IS NOT NULL)),
  CHECK (expiry_date IS NULL OR issued_date IS NULL OR expiry_date >= issued_date),
  CHECK ((status = 'CHO_XAC_MINH') = (decided_at IS NULL)),
  CHECK ((status = 'CHO_XAC_MINH') = (decided_by IS NULL)),
  CHECK ((status = 'TU_CHOI') = (reason_code IS NOT NULL))
);
CREATE INDEX pty_self_submission_party_ix ON pty_self_submission(party_id, created_at);
CREATE INDEX pty_self_submission_cho_ix ON pty_self_submission(created_at) WHERE status = 'CHO_XAC_MINH';   -- hàng chờ của lát H-4
CREATE UNIQUE INDEX pty_self_submission_one_pending_uq ON pty_self_submission(party_id, subject_kind, COALESCE(document_type_code, '')) WHERE status = 'CHO_XAC_MINH';

-- Loại phiếu MỞ: ba loại của lát H-3 (mã mở — khuôn ruling R6 của H-2: loại mới mở bằng TẠO LẠI trigger, không dựng lại bảng chỉ-thêm). Sai khuôn thì để CHECK báo.
CREATE TRIGGER pty_self_submission_kind_ins BEFORE INSERT ON pty_self_submission
WHEN NEW.subject_kind NOT IN ('NGAY_SINH', 'DIA_CHI', 'GIAY_TO')
  AND NEW.subject_kind = upper(NEW.subject_kind) AND length(NEW.subject_kind) BETWEEN 2 AND 30 AND NEW.subject_kind NOT GLOB '*[^A-Z_]*'
BEGIN SELECT RAISE(ABORT, 'self_submission_kind_closed: loại phiếu này chưa mở'); END;
CREATE TRIGGER pty_self_submission_status_ins BEFORE INSERT ON pty_self_submission
WHEN NEW.status <> 'CHO_XAC_MINH'
BEGIN SELECT RAISE(ABORT, 'self_submission_new_not_pending: phiếu mới phải ở trạng thái chờ xác minh'); END;
-- Đồng ý (5.21, ADR-0124 đ3) — lớp CSDL (lớp máy chủ: route + lính gác trong câu ghi): quyết định MỚI NHẤT của chính hồ sơ với ĐÚNG phiên bản ghi trên phiếu là DONG_Y,
-- và phiên bản đó là phiên bản LỚN NHẤT (route chỉ đăng chính sách hiệu lực ngay — ruling Q4).
CREATE TRIGGER pty_self_submission_consent_ins BEFORE INSERT ON pty_self_submission
WHEN COALESCE((SELECT c.decision FROM pty_consent c WHERE c.party_id = NEW.party_id AND c.policy_id = NEW.policy_id ORDER BY c.created_at DESC, c.rowid DESC LIMIT 1), '') <> 'DONG_Y'
  OR NEW.policy_id IS NOT (SELECT p.id FROM pty_privacy_policy p ORDER BY p.version DESC LIMIT 1)
BEGIN SELECT RAISE(ABORT, 'self_submission_no_consent: chưa đồng ý phiên bản chính sách riêng tư hiện hành'); END;
-- Một phiếu ĐANG CHỜ mỗi (hồ sơ, loại, loại giấy tờ) — chạy TRƯỚC xử lý xung đột nên bắt cả INSERT OR REPLACE (bài học 0104). Thông điệp giữ chữ UNIQUE.
CREATE TRIGGER pty_self_submission_one_pending_ins BEFORE INSERT ON pty_self_submission
WHEN EXISTS (SELECT 1 FROM pty_self_submission s WHERE s.party_id = NEW.party_id AND s.subject_kind = NEW.subject_kind
               AND COALESCE(s.document_type_code, '') = COALESCE(NEW.document_type_code, '') AND s.status = 'CHO_XAC_MINH')
BEGIN SELECT RAISE(ABORT, 'self_submission_pending_exists: UNIQUE — đã có phiếu cùng loại đang chờ xác minh'); END;
CREATE TRIGGER pty_self_submission_no_replace BEFORE INSERT ON pty_self_submission
WHEN EXISTS (SELECT 1 FROM pty_self_submission s WHERE s.id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'self_submission_no_replace: UNIQUE — mã phiếu đã có, không ghi đè'); END;
CREATE TRIGGER pty_self_submission_no_delete BEFORE DELETE ON pty_self_submission
BEGIN SELECT RAISE(ABORT, 'self_submission_no_delete: phiếu tự khai không xoá'); END;
-- Nội dung bất biến (lát H-5 tạo lại trigger này với điều kiện miễn hẹp của lệnh ẩn danh hoá — ADR-0126 đ3).
CREATE TRIGGER pty_self_submission_content BEFORE UPDATE ON pty_self_submission
WHEN NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.subject_kind IS NOT OLD.subject_kind OR NEW.policy_id IS NOT OLD.policy_id
  OR NEW.birth_date IS NOT OLD.birth_date OR NEW.address_value IS NOT OLD.address_value OR NEW.document_type_code IS NOT OLD.document_type_code
  OR NEW.document_number IS NOT OLD.document_number OR NEW.number_key IS NOT OLD.number_key OR NEW.license_class_code IS NOT OLD.license_class_code
  OR NEW.issued_date IS NOT OLD.issued_date OR NEW.issued_place IS NOT OLD.issued_place OR NEW.expiry_date IS NOT OLD.expiry_date
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'self_submission_content: nội dung phiếu tự khai không sửa — rút rồi khai phiếu mới'); END;
-- Trạng thái một chiều: chỉ dòng ĐANG CHỜ được đổi, và phải đổi SANG trạng thái cuối (không "chạm" dòng đang chờ, không mở lại dòng đã xong).
CREATE TRIGGER pty_self_submission_status_one_way BEFORE UPDATE ON pty_self_submission
WHEN OLD.status <> 'CHO_XAC_MINH' OR NEW.status = 'CHO_XAC_MINH'
BEGIN SELECT RAISE(ABORT, 'self_submission_status_one_way: phiếu đã xử lý hoặc đã rút — không đổi trạng thái'); END;

-- Vá lỗ INSERT OR REPLACE của ba bảng chỉ-thêm ở 0103 (ruling R11; người kiểm nhóm A lát H-2 nêu): REPLACE xoá dòng cũ mà không chạy trigger xoá.
CREATE TRIGGER pty_consent_no_replace BEFORE INSERT ON pty_consent
WHEN EXISTS (SELECT 1 FROM pty_consent c WHERE c.id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'consent_no_replace: UNIQUE — mã dòng đồng ý đã có, không ghi đè'); END;
CREATE TRIGGER pty_privacy_policy_no_replace BEFORE INSERT ON pty_privacy_policy
WHEN EXISTS (SELECT 1 FROM pty_privacy_policy p WHERE p.id = NEW.id OR p.version = NEW.version)
BEGIN SELECT RAISE(ABORT, 'privacy_policy_no_replace: UNIQUE — mã hoặc phiên bản chính sách đã có, không ghi đè'); END;
CREATE TRIGGER pty_privacy_policy_valid_from_ins BEFORE INSERT ON pty_privacy_policy
WHEN NEW.valid_from_at < COALESCE((SELECT MAX(p.valid_from_at) FROM pty_privacy_policy p), '')
BEGIN SELECT RAISE(ABORT, 'privacy_policy_valid_from_back: phiên bản mới không được hiệu lực trước phiên bản cũ'); END;
CREATE TRIGGER pty_verification_no_replace BEFORE INSERT ON pty_verification
WHEN EXISTS (SELECT 1 FROM pty_verification v WHERE v.id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'verification_no_replace: UNIQUE — mã dòng xác minh đã có, không ghi đè'); END;
