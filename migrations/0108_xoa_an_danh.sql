-- Migration 0108 — ADR-0126 (accepted 2026-10-16) đ2, đ3, đ6; Hiến chương 5.24 (ẩn danh hoá = ngoại lệ có tên của 5.5), 5.25: phiếu xoá + ẩn danh hoá (lát H-5 Gói 2).
-- Module parties. CHỈ THÊM (ADD COLUMN, CREATE TABLE / INDEX / TRIGGER) + TẠO LẠI bốn trigger chặn sửa (DROP TRIGGER rồi CREATE TRIGGER CÙNG TÊN — không đụng bảng,
-- không dựng lại bảng: SUY-RA X2). KHÔNG gieo; KHÔNG con số thời hạn (hai cột số ngày rỗng được, không DEFAULT — con số chờ luật sư, ADR-0126 đ2).
-- Dấu ẩn danh số giấy tờ = 'XOA' || upper(replace(mã dòng, '-', '')): duy nhất theo dòng (không vướng trigger một CCCD một người), KHÔNG suy ra được từ số thật.
-- Hằng khớp TỪNG CHỮ với src/modules/parties/xoa-an-danh.ts (bài xoa-an-danh.test.ts đối chiếu). Miễn trừ hai phần (ruling R3 kế hoạch 2026-10-17-goi-2-h5): trigger
-- cũ chỉ miễn "đặt erased_at lần đầu"; trigger *_erase_shape giữ ĐÚNG dạng chuyển; *_erased_frozen đóng băng dòng đã ẩn danh. aut_session KHÔNG cần migration.

-- (1) Giấy tờ của người (0032)
ALTER TABLE pty_person_document ADD COLUMN erased_at TEXT;
DROP TRIGGER pty_person_document_superseded;
CREATE TRIGGER pty_person_document_superseded BEFORE UPDATE ON pty_person_document
WHEN EXISTS (SELECT 1 FROM pty_person_document n WHERE n.previous_id = OLD.id AND n.voided_at IS NULL)
  AND NOT (OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'person_document_superseded: giấy tờ đã có dòng gia hạn — không sửa đè'); END;
DROP TRIGGER pty_person_document_voided;
CREATE TRIGGER pty_person_document_voided BEFORE UPDATE ON pty_person_document
WHEN OLD.voided_at IS NOT NULL AND NOT (OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'person_document_voided: dòng đã huỷ — không sửa'); END;
CREATE TRIGGER pty_person_document_erase_shape BEFORE UPDATE ON pty_person_document
WHEN OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL AND (
     NEW.document_number IS NOT (CASE WHEN OLD.document_number IS NULL THEN NULL ELSE 'XOA' || upper(replace(OLD.id, '-', '')) END)
  OR NEW.number_key IS NOT (CASE WHEN OLD.number_key IS NULL THEN NULL ELSE 'XOA' || upper(replace(OLD.id, '-', '')) END)
  OR NEW.issued_place IS NOT NULL
  OR NEW.license_class_code IS NOT OLD.license_class_code OR NEW.issued_date IS NOT OLD.issued_date
  OR NEW.expiry_date IS NOT OLD.expiry_date OR NEW.voided_at IS NOT OLD.voided_at)
BEGIN SELECT RAISE(ABORT, 'person_document_erase_shape: ẩn danh hoá chỉ thay số bằng dấu và xoá nơi cấp — không sửa cột khác'); END;
CREATE TRIGGER pty_person_document_erased_frozen BEFORE UPDATE ON pty_person_document
WHEN OLD.erased_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'person_document_erased: dòng đã ẩn danh hoá — không sửa'); END;

-- (2) Phiếu yêu cầu xoá (ADR-0126 đ2) — vòng đời một chiều CHO_XU_LY → DA_THUC_HIEN | TU_CHOI | RUT. due_at chụp lúc gửi từ chính sách hiện hành (rỗng = chưa có số).
CREATE TABLE pty_erasure_request (
  id              TEXT PRIMARY KEY,
  party_id        TEXT NOT NULL REFERENCES pty_person(party_id),          -- chỉ hồ sơ CÁ NHÂN (ruling R4); = staff.party_id của phiên lúc gửi
  policy_id       TEXT REFERENCES pty_privacy_policy(id),                 -- chính sách hiện hành lúc gửi; rỗng = chưa đăng bản nào
  due_at          TEXT,                                                   -- hạn xử lý = created_at + erasure_days (SQL tính lúc gửi); rỗng = chính sách chưa có số
  status          TEXT NOT NULL CHECK (status IN ('CHO_XU_LY', 'DA_THUC_HIEN', 'TU_CHOI', 'RUT')),
  decided_at      TEXT,
  decided_by      TEXT,
  reason_code     TEXT CHECK (reason_code IS NULL OR (length(reason_code) BETWEEN 2 AND 40 AND reason_code NOT GLOB '*[^A-Z0-9_]*')),
  name_kept       INTEGER CHECK (name_kept IS NULL OR name_kept IN (0, 1)),   -- quyết lúc thực hiện (ruling R8); câu ghi tên đọc cột này
  retained_codes  TEXT CHECK (retained_codes IS NULL OR (length(retained_codes) BETWEEN 2 AND 400 AND retained_codes NOT GLOB '*[^A-Z0-9_,]*')),
  offsite_at      TEXT,                                                   -- bản ngoài D1 (chỉ mã) đã chép (ADR-0126 đ7)
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT,
  CHECK (created_by IS NOT NULL),
  CHECK ((status = 'CHO_XU_LY') = (decided_at IS NULL)),
  CHECK ((status = 'CHO_XU_LY') = (decided_by IS NULL)),
  CHECK ((status = 'TU_CHOI') = (reason_code IS NOT NULL)),
  CHECK ((status = 'DA_THUC_HIEN') = (retained_codes IS NOT NULL)),
  CHECK ((status = 'DA_THUC_HIEN') = (name_kept IS NOT NULL)),
  CHECK (offsite_at IS NULL OR status = 'DA_THUC_HIEN'),
  CHECK ((policy_id IS NULL) <= (due_at IS NULL))
);
CREATE INDEX pty_erasure_request_party_ix ON pty_erasure_request(party_id, created_at);
CREATE INDEX pty_erasure_request_cho_ix ON pty_erasure_request(created_at) WHERE status = 'CHO_XU_LY';
CREATE UNIQUE INDEX pty_erasure_request_one_pending_uq ON pty_erasure_request(party_id) WHERE status = 'CHO_XU_LY';
CREATE TRIGGER pty_erasure_request_no_delete BEFORE DELETE ON pty_erasure_request
BEGIN SELECT RAISE(ABORT, 'erasure_no_delete: phiếu yêu cầu xoá không xoá'); END;
CREATE TRIGGER pty_erasure_request_no_replace BEFORE INSERT ON pty_erasure_request
WHEN EXISTS (SELECT 1 FROM pty_erasure_request r WHERE r.id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'erasure_no_replace: UNIQUE — mã phiếu đã có, không ghi đè'); END;
CREATE TRIGGER pty_erasure_request_person_ins BEFORE INSERT ON pty_erasure_request
WHEN NOT EXISTS (SELECT 1 FROM pty_person p WHERE p.party_id = NEW.party_id)
BEGIN SELECT RAISE(ABORT, 'erasure_person_only: phiếu yêu cầu xoá chỉ cho hồ sơ cá nhân'); END;
CREATE TRIGGER pty_erasure_request_new_ins BEFORE INSERT ON pty_erasure_request
WHEN NEW.status <> 'CHO_XU_LY'
BEGIN SELECT RAISE(ABORT, 'erasure_new_not_pending: phiếu mới phải ở trạng thái chờ xử lý'); END;
CREATE TRIGGER pty_erasure_request_one_pending_ins BEFORE INSERT ON pty_erasure_request
WHEN EXISTS (SELECT 1 FROM pty_erasure_request r WHERE r.party_id = NEW.party_id AND r.status = 'CHO_XU_LY')
BEGIN SELECT RAISE(ABORT, 'erasure_pending_exists: UNIQUE — hồ sơ đã có phiếu yêu cầu xoá đang chờ'); END;
CREATE TRIGGER pty_erasure_request_content BEFORE UPDATE ON pty_erasure_request
WHEN NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.policy_id IS NOT OLD.policy_id OR NEW.due_at IS NOT OLD.due_at
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'erasure_content: nội dung phiếu yêu cầu xoá không sửa'); END;
CREATE TRIGGER pty_erasure_request_status_one_way BEFORE UPDATE ON pty_erasure_request
WHEN (OLD.status = 'CHO_XU_LY' AND NEW.status = 'CHO_XU_LY')
  OR (OLD.status <> 'CHO_XU_LY' AND (NEW.status IS NOT OLD.status OR NEW.decided_at IS NOT OLD.decided_at OR NEW.decided_by IS NOT OLD.decided_by
      OR NEW.reason_code IS NOT OLD.reason_code OR NEW.name_kept IS NOT OLD.name_kept OR NEW.retained_codes IS NOT OLD.retained_codes))
BEGIN SELECT RAISE(ABORT, 'erasure_status_one_way: phiếu đã xử lý hoặc đã rút — không đổi'); END;
CREATE TRIGGER pty_erasure_request_decider BEFORE UPDATE ON pty_erasure_request
WHEN OLD.status = 'CHO_XU_LY' AND NEW.status IN ('DA_THUC_HIEN', 'TU_CHOI') AND NEW.decided_by IS OLD.created_by
BEGIN SELECT RAISE(ABORT, 'erasure_decider_is_requester: người xử lý phải khác người gửi phiếu'); END;
CREATE TRIGGER pty_erasure_request_withdraw BEFORE UPDATE ON pty_erasure_request
WHEN OLD.status = 'CHO_XU_LY' AND NEW.status = 'RUT' AND NEW.decided_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'erasure_withdraw_not_requester: chỉ người gửi được rút phiếu'); END;
CREATE TRIGGER pty_erasure_request_offsite_one_way BEFORE UPDATE OF offsite_at ON pty_erasure_request
WHEN OLD.offsite_at IS NOT NULL AND NEW.offsite_at IS NOT OLD.offsite_at
BEGIN SELECT RAISE(ABORT, 'erasure_offsite_one_way: mốc chép bản ngoài chỉ đặt một lần'); END;

-- (3) Phiếu tự khai (0105, 0107) — ẩn danh phiếu ĐÃ xử lý / đã rút (phiếu đang chờ phải rút trước, cùng lô). Giá trị giữ chỗ vì CHECK của 0105 cấm rỗng.
ALTER TABLE pty_self_submission ADD COLUMN erased_at TEXT;
DROP TRIGGER pty_self_submission_content;
CREATE TRIGGER pty_self_submission_content BEFORE UPDATE ON pty_self_submission
WHEN NOT (OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL) AND (
     NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.subject_kind IS NOT OLD.subject_kind OR NEW.policy_id IS NOT OLD.policy_id
  OR NEW.birth_date IS NOT OLD.birth_date OR NEW.address_value IS NOT OLD.address_value OR NEW.document_type_code IS NOT OLD.document_type_code
  OR NEW.document_number IS NOT OLD.document_number OR NEW.number_key IS NOT OLD.number_key OR NEW.license_class_code IS NOT OLD.license_class_code
  OR NEW.issued_date IS NOT OLD.issued_date OR NEW.issued_place IS NOT OLD.issued_place OR NEW.expiry_date IS NOT OLD.expiry_date
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by)
BEGIN SELECT RAISE(ABORT, 'self_submission_content: nội dung phiếu tự khai không sửa — rút rồi khai phiếu mới'); END;
DROP TRIGGER pty_self_submission_status_one_way;
CREATE TRIGGER pty_self_submission_status_one_way BEFORE UPDATE ON pty_self_submission
WHEN (OLD.status <> 'CHO_XAC_MINH' OR NEW.status = 'CHO_XAC_MINH') AND NOT (OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'self_submission_status_one_way: phiếu đã xử lý hoặc đã rút — không đổi trạng thái'); END;
CREATE TRIGGER pty_self_submission_erase_shape BEFORE UPDATE ON pty_self_submission
WHEN OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL AND (
     OLD.status = 'CHO_XAC_MINH' OR NEW.status IS NOT OLD.status OR NEW.decided_at IS NOT OLD.decided_at OR NEW.decided_by IS NOT OLD.decided_by
  OR NEW.reason_code IS NOT OLD.reason_code OR NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.subject_kind IS NOT OLD.subject_kind
  OR NEW.policy_id IS NOT OLD.policy_id OR NEW.document_type_code IS NOT OLD.document_type_code OR NEW.license_class_code IS NOT OLD.license_class_code
  OR NEW.issued_date IS NOT OLD.issued_date OR NEW.expiry_date IS NOT OLD.expiry_date OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR NEW.birth_date IS NOT (CASE WHEN OLD.birth_date IS NULL THEN NULL ELSE '1900-01-01' END)
  OR NEW.address_value IS NOT (CASE WHEN OLD.address_value IS NULL THEN NULL ELSE 'Đã xoá' END)
  OR NEW.document_number IS NOT (CASE WHEN OLD.document_number IS NULL THEN NULL ELSE 'XOA' || upper(replace(OLD.id, '-', '')) END)
  OR NEW.number_key IS NOT (CASE WHEN OLD.number_key IS NULL THEN NULL ELSE 'XOA' || upper(replace(OLD.id, '-', '')) END)
  OR NEW.issued_place IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'self_submission_erase_shape: ẩn danh hoá phiếu chỉ thay giá trị khai bằng dấu, trên phiếu đã xử lý hoặc đã rút'); END;
CREATE TRIGGER pty_self_submission_erased_frozen BEFORE UPDATE ON pty_self_submission
WHEN OLD.erased_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'self_submission_erased: phiếu đã ẩn danh hoá — không sửa'); END;
CREATE TRIGGER pty_self_submission_erasure_open_ins BEFORE INSERT ON pty_self_submission
WHEN EXISTS (SELECT 1 FROM pty_erasure_request r WHERE r.party_id = NEW.party_id AND r.status = 'CHO_XU_LY')
BEGIN SELECT RAISE(ABORT, 'self_submission_erasure_open: đang có yêu cầu xoá dữ liệu chờ xử lý — chưa gửi phiếu mới được'); END;

-- (4) Số ngày trong dữ liệu chính sách (ADR-0126 đ2, đ8; Hiến chương 5.25). Rỗng = chưa có số luật sư xác nhận ⇒ không hạn, không ẩn danh phiên cũ. KHÔNG DEFAULT.
ALTER TABLE pty_privacy_policy ADD COLUMN erasure_days INTEGER CHECK (erasure_days IS NULL OR erasure_days >= 1);
ALTER TABLE pty_privacy_policy ADD COLUMN session_retention_days INTEGER CHECK (session_retention_days IS NULL OR session_retention_days >= 1);

-- (5) Không gộp hồ sơ đang / đã có phiếu xoá (ruling R16) — hồ sơ phụ gộp vào hồ sơ đã ẩn danh sẽ mang dữ liệu thật vào một hồ sơ "đã xoá".
CREATE TRIGGER pty_party_merge_erasure BEFORE UPDATE OF merged_into_id ON pty_party
WHEN NEW.merged_into_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM pty_erasure_request r WHERE r.party_id IN (NEW.id, NEW.merged_into_id) AND r.status IN ('CHO_XU_LY', 'DA_THUC_HIEN'))
BEGIN SELECT RAISE(ABORT, 'party_merge_erasure: hồ sơ đang có hoặc đã thực hiện yêu cầu xoá dữ liệu — không gộp'); END;
