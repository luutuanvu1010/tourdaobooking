-- Migration 0167 — ADR-0206 (accepted) Đ2–Đ4 + ADR-0207 Đ5: phiếu đăng ký đối tác tự đăng ký (đợt 1, Task 1). Module MỚI `dang-ky`, tiền tố `dk_`. CHỈ THÊM: tám bảng mới, không đổi bảng nào đang có.
-- Số: `main` và mọi nhánh / worktree chưa gộp tới 0166 ⇒ 0167.
-- Trigger CHỈ đọc bảng dk_* (Hiến chương 5.3). Cột người làm / hồ sơ / tài khoản (`*_by`, `party_id`, `staff_id`, `match_party_id`) là tham chiếu LOGIC, không khoá ngoại sang module khác (ADR-0003).
-- Hạng dữ liệu (5.20): tên, ngày sinh, địa chỉ, số điện thoại, email N2; số giấy tờ, số chuẩn hoá, nơi cấp N3; băm mã gửi email N4 — KHÔNG BAO GIỜ vào nhật ký, view công bố, câu báo lỗi. Không có view v_dk_*.
-- Chưa gieo gì ngoài MỘT dòng chính sách đóng (registration_open = 0): mở đăng ký là quyết định riêng của chủ (ADR-0206).

-- Chính sách đăng ký (Đ3): chỉ thêm dòng, hiệu lực từ `valid_from_at` (khuôn ord_pickup_time_policy, 0157). Con số lấy từ PHU-LUC «Con số đề xuất»; Toàn quyền đổi được, mã không viết cứng.
CREATE TABLE dk_policy (
  id                      TEXT PRIMARY KEY,
  registration_open       INTEGER NOT NULL CHECK (registration_open IN (0, 1)),
  open_role_codes         TEXT NOT NULL DEFAULT '',                          -- loại đối tác mở cho phiếu, cách nhau dấu phẩy; rỗng = chưa mở loại nào
  code_digits             INTEGER NOT NULL CHECK (code_digits BETWEEN 4 AND 10),
  code_ttl_minutes        INTEGER NOT NULL CHECK (code_ttl_minutes > 0),
  code_max_attempts       INTEGER NOT NULL CHECK (code_max_attempts > 0),
  ask_per_mailbox           INTEGER NOT NULL CHECK (ask_per_mailbox > 0),
  ask_per_network              INTEGER NOT NULL CHECK (ask_per_network > 0),
  ask_window_minutes      INTEGER NOT NULL CHECK (ask_window_minutes > 0),
  ask_global_per_hour     INTEGER NOT NULL CHECK (ask_global_per_hour > 0),
  session_idle_minutes    INTEGER NOT NULL CHECK (session_idle_minutes > 0),
  session_max_hours       INTEGER NOT NULL CHECK (session_max_hours > 0),
  draft_expire_days       INTEGER NOT NULL CHECK (draft_expire_days > 0),
  supplement_expire_days  INTEGER NOT NULL CHECK (supplement_expire_days > 0),
  activation_days         INTEGER NOT NULL CHECK (activation_days > 0),
  photo_max_mb            INTEGER NOT NULL CHECK (photo_max_mb > 0),
  photo_max_count         INTEGER NOT NULL CHECK (photo_max_count > 0),
  anonymize_days          INTEGER NOT NULL CHECK (anonymize_days > 0),       -- ĐỔI SỐ NÀY LÀ ĐỔI THỜI GIAN GIỮ DỮ LIỆU CÁ NHÂN CỦA NGƯỜI LẠ
  valid_from_at           TEXT NOT NULL UNIQUE,
  created_at              TEXT NOT NULL,
  created_by              TEXT,
  updated_at              TEXT NOT NULL,
  updated_by              TEXT
);
INSERT INTO dk_policy (id, registration_open, open_role_codes, code_digits, code_ttl_minutes, code_max_attempts, ask_per_mailbox, ask_per_network, ask_window_minutes, ask_global_per_hour,
  session_idle_minutes, session_max_hours, draft_expire_days, supplement_expire_days, activation_days, photo_max_mb, photo_max_count, anonymize_days, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0167', 0, '', 6, 10, 5, 3, 10, 15, 60, 30, 12, 7, 14, 14, 5, 8, 30,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
CREATE TRIGGER dk_policy_no_update BEFORE UPDATE ON dk_policy
BEGIN SELECT RAISE(ABORT, 'dk_policy_append_only: chính sách đăng ký chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER dk_policy_no_delete BEFORE DELETE ON dk_policy
BEGIN SELECT RAISE(ABORT, 'dk_policy_append_only: chính sách đăng ký không xoá'); END;

-- Phiếu (Đ3, Đ4). Mã do máy cấp (5.26, tiền tố DK). `current_version` = số bản khai hiện hành (0 khi chưa gửi lần nào). Kết luận Danh bạ và người xác minh nằm ở ĐÂY (match_*, verified_*)
-- để trigger của dk_decision chỉ đọc bảng dk_*. `party_id`, `staff_id` chỉ có sau khi duyệt.
CREATE TABLE dk_registration (
  id               TEXT PRIMARY KEY CHECK (id GLOB 'DK_[A-Z][A-Z][A-Z][A-Z][A-Z][A-Z][A-Z][A-Z]'),
  kind             TEXT NOT NULL CHECK (kind = upper(kind) AND length(kind) BETWEEN 2 AND 30 AND kind NOT GLOB '*[^A-Z_]*'),
  status           TEXT NOT NULL CHECK (status IN ('DANG_DIEN', 'CHO_XAC_MINH', 'CAN_BO_SUNG', 'CHO_DUYET', 'DA_DUYET', 'TU_CHOI', 'DA_RUT', 'HET_HAN')),
  role_code        TEXT NOT NULL,                                            -- loại đối tác xin đăng ký (danh sách mở kiểm ở mã)
  current_version  INTEGER NOT NULL DEFAULT 0 CHECK (current_version >= 0),
  reason_code      TEXT CHECK (reason_code IS NULL OR (reason_code = upper(reason_code) AND length(reason_code) BETWEEN 2 AND 40 AND reason_code NOT GLOB '*[^A-Z0-9_]*')),
  match_kind       TEXT CHECK (match_kind IS NULL OR match_kind IN ('NEW', 'EXISTING')),  -- kết luận Danh bạ: hồ sơ mới / gắn hồ sơ có sẵn
  match_party_id   TEXT,
  verified_by      TEXT,                                                     -- người đã bấm «đạt»
  verified_version INTEGER,                                                  -- bản khai được xác minh
  verified_at      TEXT,
  party_id         TEXT,
  staff_id         TEXT,
  submitted_at     TEXT,
  decided_at       TEXT,
  activated_at     TEXT,
  expires_at       TEXT,
  erased_at        TEXT,
  created_at       TEXT NOT NULL,
  created_by       TEXT,
  updated_at       TEXT NOT NULL,
  updated_by       TEXT,
  CHECK ((match_kind = 'EXISTING') = (match_party_id IS NOT NULL))
);
CREATE INDEX dk_registration_status_ix ON dk_registration(status, expires_at);
-- Loại phiếu MỞ: chỉ «cá nhân» (đợt 1). Loại mới (tổ chức, đợt 2) mở bằng TẠO LẠI trigger này, không dựng lại bảng (khuôn pty_self_submission_kind_ins).
CREATE TRIGGER dk_registration_kind_ins BEFORE INSERT ON dk_registration
WHEN NEW.kind <> 'PERSON'
BEGIN SELECT RAISE(ABORT, 'dk_registration_kind_closed: loại phiếu này chưa mở'); END;
CREATE TRIGGER dk_registration_status_ins BEFORE INSERT ON dk_registration
WHEN NEW.status <> 'DANG_DIEN'
BEGIN SELECT RAISE(ABORT, 'dk_registration_new_not_draft: phiếu mới phải ở trạng thái đang điền'); END;
-- Đồ thị ADR-0206 Đ4: ĐANG ĐIỀN → CHỜ XÁC MINH → CHỜ DUYỆT → ĐÃ DUYỆT; CHỜ XÁC MINH ⇄ CẦN BỔ SUNG; mọi trạng thái chưa kết thúc → TỪ CHỐI | ĐÃ RÚT | HẾT HẠN. Bốn trạng thái kết thúc không đổi nữa.
-- Phải khớp hàm `chuyenHopLe` ở src/modules/dang-ky/rules.ts (bài rules.test.ts đối chiếu).
CREATE TRIGGER dk_registration_transition BEFORE UPDATE OF status ON dk_registration
WHEN NEW.status IS NOT OLD.status AND NOT (
     (OLD.status = 'DANG_DIEN'    AND NEW.status = 'CHO_XAC_MINH')
  OR (OLD.status = 'CHO_XAC_MINH' AND NEW.status IN ('CAN_BO_SUNG', 'CHO_DUYET'))
  OR (OLD.status = 'CAN_BO_SUNG'  AND NEW.status = 'CHO_XAC_MINH')
  OR (OLD.status = 'CHO_DUYET'    AND NEW.status = 'DA_DUYET')
  OR (OLD.status IN ('DANG_DIEN', 'CHO_XAC_MINH', 'CAN_BO_SUNG', 'CHO_DUYET') AND NEW.status IN ('TU_CHOI', 'DA_RUT', 'HET_HAN'))
)
BEGIN SELECT RAISE(ABORT, 'dk_registration_transition: chuyển trạng thái trái đồ thị của phiếu đăng ký'); END;
-- Phiếu kết thúc thì danh tính hết «đang mở» (để cùng email đăng ký lại được).
CREATE TRIGGER dk_registration_close_identity AFTER UPDATE OF status ON dk_registration
WHEN NEW.status IN ('DA_DUYET', 'TU_CHOI', 'DA_RUT', 'HET_HAN') AND NEW.status IS NOT OLD.status
BEGIN UPDATE dk_identity SET is_open = 0, updated_at = NEW.updated_at WHERE registration_id = NEW.id AND is_open = 1; END;

-- Danh tính đã chứng minh, tách khỏi email liên lạc (Đ3). Đợt 1 chỉ `EMAIL`; loại Google, Apple mở ở đợt sau bằng tạo lại trigger. `is_open` do trigger phiếu hạ về 0 khi phiếu kết thúc.
CREATE TABLE dk_identity (
  id               TEXT PRIMARY KEY,
  registration_id  TEXT NOT NULL REFERENCES dk_registration(id),
  provider         TEXT NOT NULL CHECK (provider = upper(provider) AND length(provider) BETWEEN 2 AND 30 AND provider NOT GLOB '*[^A-Z_]*'),
  subject          TEXT NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),  -- email đã chuẩn hoá (chữ thường); ẩn danh thì thay bằng giá trị che
  contact_email    TEXT CHECK (contact_email IS NULL OR length(contact_email) <= 200),
  is_open          INTEGER NOT NULL DEFAULT 1 CHECK (is_open IN (0, 1)),
  erased_at        TEXT,
  created_at       TEXT NOT NULL,
  created_by       TEXT,
  updated_at       TEXT NOT NULL,
  updated_by       TEXT
);
CREATE UNIQUE INDEX dk_identity_open_uq ON dk_identity(provider, subject) WHERE is_open = 1;
CREATE INDEX dk_identity_registration_ix ON dk_identity(registration_id);
CREATE TRIGGER dk_identity_provider_ins BEFORE INSERT ON dk_identity
WHEN NEW.provider <> 'EMAIL'
BEGIN SELECT RAISE(ABORT, 'dk_identity_provider_closed: loại danh tính này chưa mở'); END;

-- Bản khai (Đ3): mỗi lần gửi một dòng BẤT BIẾN. Cột soi theo pty_person / pty_contact_point / pty_person_document để lệnh duyệt chép một–một (5.2, không JSON tự do).
-- Ngoại lệ DUY NHẤT với nội dung: ẩn danh (ADR-0208) — đặt `erased_at` MỘT lần, kèm xoá chữ; sau đó không sửa nữa.
CREATE TABLE dk_submission (
  id                  TEXT PRIMARY KEY,
  registration_id     TEXT NOT NULL REFERENCES dk_registration(id),
  version             INTEGER NOT NULL CHECK (version >= 1),
  family_name         TEXT CHECK (family_name IS NULL OR length(trim(family_name)) BETWEEN 1 AND 60),
  middle_name         TEXT CHECK (middle_name IS NULL OR length(trim(middle_name)) BETWEEN 1 AND 100),
  given_name          TEXT NOT NULL CHECK (length(trim(given_name)) BETWEEN 1 AND 60),
  gender              TEXT,
  birth_date          TEXT CHECK (birth_date IS NULL OR (date(birth_date) IS birth_date AND birth_date >= '1900-01-01')),
  address_value       TEXT CHECK (address_value IS NULL OR length(trim(address_value)) BETWEEN 1 AND 200),
  phone_value         TEXT CHECK (phone_value IS NULL OR length(trim(phone_value)) BETWEEN 1 AND 40),
  phone_key           TEXT CHECK (phone_key IS NULL OR length(phone_key) BETWEEN 1 AND 40),
  document_type_code  TEXT,
  document_number     TEXT CHECK (document_number IS NULL OR length(trim(document_number)) BETWEEN 1 AND 40),
  number_key          TEXT CHECK (number_key IS NULL OR (number_key = upper(number_key) AND length(number_key) BETWEEN 1 AND 40)),
  license_class_code  TEXT,
  issued_date         TEXT CHECK (issued_date IS NULL OR date(issued_date) IS issued_date),
  issued_place        TEXT CHECK (issued_place IS NULL OR length(trim(issued_place)) BETWEEN 1 AND 200),
  expiry_date         TEXT CHECK (expiry_date IS NULL OR date(expiry_date) IS expiry_date),
  referrer_text       TEXT CHECK (referrer_text IS NULL OR length(trim(referrer_text)) BETWEEN 1 AND 200),
  policy_id           TEXT NOT NULL REFERENCES pty_privacy_policy(id),       -- phiên bản chính sách riêng tư đã đồng ý lúc gửi (5.21)
  consented_at        TEXT NOT NULL,
  erased_at           TEXT,
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  UNIQUE (registration_id, version),
  CHECK (expiry_date IS NULL OR issued_date IS NULL OR expiry_date >= issued_date),
  CHECK ((document_number IS NULL) = (number_key IS NULL))
);
CREATE TRIGGER dk_submission_version BEFORE INSERT ON dk_submission
WHEN NEW.version IS NOT (SELECT current_version + 1 FROM dk_registration WHERE id = NEW.registration_id)
BEGIN SELECT RAISE(ABORT, 'dk_submission_version: bản khai mới phải là phiên bản kế tiếp của phiếu'); END;
CREATE TRIGGER dk_submission_content BEFORE UPDATE ON dk_submission
WHEN NOT (OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'dk_submission_content: bản khai bất biến, chỉ ẩn danh được một lần'); END;
CREATE TRIGGER dk_submission_no_delete BEFORE DELETE ON dk_submission
BEGIN SELECT RAISE(ABORT, 'dk_submission_content: bản khai không xoá'); END;

-- Kết luận từng mục khi xác minh (chỉ thêm).
CREATE TABLE dk_item_result (
  id               TEXT PRIMARY KEY,
  registration_id  TEXT NOT NULL REFERENCES dk_registration(id),
  version          INTEGER NOT NULL CHECK (version >= 1),
  item_code        TEXT NOT NULL CHECK (item_code = upper(item_code) AND length(item_code) BETWEEN 2 AND 40 AND item_code NOT GLOB '*[^A-Z0-9_]*'),
  result           TEXT NOT NULL CHECK (result IN ('DAT', 'KHONG_DAT')),
  reason_code      TEXT CHECK (reason_code IS NULL OR (reason_code = upper(reason_code) AND length(reason_code) BETWEEN 2 AND 40 AND reason_code NOT GLOB '*[^A-Z0-9_]*')),
  verified_by      TEXT NOT NULL,
  verified_at      TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  created_by       TEXT,
  updated_at       TEXT NOT NULL,
  updated_by       TEXT
);
CREATE INDEX dk_item_result_registration_ix ON dk_item_result(registration_id, version);
CREATE TRIGGER dk_item_result_no_update BEFORE UPDATE ON dk_item_result
BEGIN SELECT RAISE(ABORT, 'dk_append_only: kết luận từng mục chỉ thêm dòng mới'); END;
CREATE TRIGGER dk_item_result_no_delete BEFORE DELETE ON dk_item_result
BEGIN SELECT RAISE(ABORT, 'dk_append_only: kết luận từng mục không xoá'); END;

-- Quyết định của phiếu (ADR-0207 Đ4, Đ5): chỉ thêm. Câu ĐẦU của lô duyệt / kích hoạt: trigger RAISE làm hỏng cả lô nếu thiếu điều kiện. Miễn trừ «Toàn quyền làm cả hai bước» do MÁY CHỦ đặt cờ
-- (trigger chỉ đọc dk_*, không biết quyền) — ca thường do CSDL canh, miễn trừ dựa vào kiểm ở máy chủ.
CREATE TABLE dk_decision (
  id                TEXT PRIMARY KEY,
  registration_id   TEXT NOT NULL REFERENCES dk_registration(id),
  kind              TEXT NOT NULL CHECK (kind IN ('DUYET', 'KICH_HOAT')),
  version           INTEGER NOT NULL CHECK (version >= 1),
  decided_by        TEXT NOT NULL,                                           -- DUYET: người duyệt; KICH_HOAT: tài khoản mới
  super_admin_flag  INTEGER NOT NULL DEFAULT 0 CHECK (super_admin_flag IN (0, 1)),
  decided_at        TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  created_by        TEXT,
  updated_at        TEXT NOT NULL,
  updated_by        TEXT
);
CREATE UNIQUE INDEX dk_decision_once_uq ON dk_decision(registration_id, kind);
CREATE TRIGGER dk_decision_guard BEFORE INSERT ON dk_decision
BEGIN
  SELECT RAISE(ABORT, 'dk_decision_state: phiếu không còn ở bước chờ duyệt')
    WHERE NEW.kind = 'DUYET' AND (SELECT status FROM dk_registration WHERE id = NEW.registration_id) IS NOT 'CHO_DUYET';
  SELECT RAISE(ABORT, 'dk_decision_version: bản khai đã đổi sau khi mở màn duyệt')
    WHERE NEW.kind = 'DUYET' AND NEW.version IS NOT (SELECT current_version FROM dk_registration WHERE id = NEW.registration_id);
  SELECT RAISE(ABORT, 'dk_decision_no_match: chưa có kết luận Danh bạ cho phiếu')
    WHERE NEW.kind = 'DUYET' AND (SELECT match_kind FROM dk_registration WHERE id = NEW.registration_id) IS NULL;
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
    WHERE NEW.kind = 'KICH_HOAT' AND NOT COALESCE(NEW.decided_at <= (
      SELECT strftime('%Y-%m-%dT%H:%M:%fZ', d.decided_at, '+' || (SELECT p.activation_days FROM dk_policy p WHERE p.valid_from_at <= d.decided_at ORDER BY p.valid_from_at DESC LIMIT 1) || ' days')
      FROM dk_decision d WHERE d.registration_id = NEW.registration_id AND d.kind = 'DUYET'), 0);
END;
CREATE TRIGGER dk_decision_no_update BEFORE UPDATE ON dk_decision
BEGIN SELECT RAISE(ABORT, 'dk_append_only: quyết định của phiếu chỉ thêm dòng mới'); END;
CREATE TRIGGER dk_decision_no_delete BEFORE DELETE ON dk_decision
BEGIN SELECT RAISE(ABORT, 'dk_append_only: quyết định của phiếu không xoá'); END;

-- Lịch sử lệnh của phiếu (Đ3, ADR-0206 Đ12): chỉ thêm. Người đăng ký không phải tài khoản nên lịch sử nằm ở đây, KHÔNG ở audit_log. Không ghi SĐT, email, số giấy tờ, ngày sinh, địa chỉ.
CREATE TABLE dk_event (
  id               TEXT PRIMARY KEY,
  registration_id  TEXT NOT NULL REFERENCES dk_registration(id),
  actor_kind       TEXT NOT NULL CHECK (actor_kind IN ('REGISTRANT', 'STAFF', 'AGENT')),
  actor_ref        TEXT,                                                     -- STAFF: mã tài khoản; AGENT: mã tác nhân; REGISTRANT: rỗng
  command          TEXT NOT NULL CHECK (command = upper(command) AND length(command) BETWEEN 2 AND 40 AND command NOT GLOB '*[^A-Z0-9_]*'),
  reason_code      TEXT CHECK (reason_code IS NULL OR (reason_code = upper(reason_code) AND length(reason_code) BETWEEN 2 AND 40 AND reason_code NOT GLOB '*[^A-Z0-9_]*')),
  at               TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  created_by       TEXT,
  updated_at       TEXT NOT NULL,
  updated_by       TEXT
);
CREATE INDEX dk_event_registration_ix ON dk_event(registration_id, at);
CREATE TRIGGER dk_event_no_update BEFORE UPDATE ON dk_event
BEGIN SELECT RAISE(ABORT, 'dk_append_only: lịch sử phiếu chỉ thêm dòng mới'); END;
CREATE TRIGGER dk_event_no_delete BEFORE DELETE ON dk_event
BEGIN SELECT RAISE(ABORT, 'dk_append_only: lịch sử phiếu không xoá'); END;

-- Mã gửi email (Đ3): chỉ lưu BẢN BĂM, có hạn, có đếm lần nhập. Bảng kỹ thuật như login_attempt: được cập nhật và xoá (dòng hết hạn bị xoá).
CREATE TABLE dk_email_code (
  id          TEXT PRIMARY KEY,
  email_key   TEXT NOT NULL CHECK (length(email_key) BETWEEN 1 AND 200),
  code_hash   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
CREATE INDEX dk_email_code_email_ix ON dk_email_code(email_key, created_at);
