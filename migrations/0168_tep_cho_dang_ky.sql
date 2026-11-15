-- Migration 0168 — ADR-0208 (accepted) Đ1, Đ5 + ADR-0210 (accepted) Đ1: tệp chờ của phiếu đăng ký đối tác, mục bắt buộc để được «Đã xác minh», hai view công bố (đợt 1, Task 5). Module parties. CHỈ THÊM.
-- Số: `main` và mọi nhánh / worktree chưa gộp tới 0167 ⇒ 0168.
-- Nội dung tệp KHÔNG nằm trong D1 — ở kho R2 `HO_SO`, khoá `pty/` + 32 hex như pty_attachment (để lúc duyệt dùng lại đúng khoá, không chép tệp). Không lưu tên tệp gốc.
-- storage_key và content_hash là dữ liệu hạng N3 (ảnh giấy tờ — Hiến chương 5.20): KHÔNG BAO GIỜ vào nhật ký, DTO, câu báo lỗi.
-- `registration_id` là mã phiếu do module dang-ky truyền vào — chuỗi, KHÔNG khoá ngoại sang bảng của module khác (ADR-0003). Trigger chỉ đọc bảng pty_*.
-- Chỉ-thêm: không xoá dòng; nội dung bất biến; các mốc đi MỘT chiều (như pty_attachment, thêm mốc «đã chuyển»):
--   stored_at      rỗng → có: đối tượng R2 đã đặt xong (ghi D1 TRƯỚC, đặt R2 SAU).
--   purged_at      rỗng → có, CÙNG LÚC purge_reason và content_hash → rỗng: quyết gỡ đã ghi trong lô D1 (phiếu kết thúc không được duyệt, thay tệp, tải lỗi).
--   r2_deleted_at  rỗng → có, chỉ SAU purged_at: đối tượng R2 đã xoá (việc bên ngoài chạy sau lô — Hiến chương 5.16).
--   transferred_at rỗng → có, CÙNG LÚC content_hash → rỗng: lô duyệt đã chèn dòng pty_attachment dùng lại đúng khoá kho. Dòng đã chuyển KHÔNG bao giờ bị gỡ hay xoá kho từ đây
--                  (khoá kho nay thuộc dòng pty_attachment). Bất biến: một khoá kho không vừa nằm ở dòng chờ chưa chuyển, vừa ở pty_attachment (kiểm R-PTY-DK1).

CREATE TABLE pty_registration_attachment (
  id               TEXT PRIMARY KEY,
  registration_id  TEXT NOT NULL CHECK (length(registration_id) BETWEEN 1 AND 100),
  slot             TEXT NOT NULL CHECK (slot = upper(slot) AND length(slot) BETWEEN 2 AND 40 AND slot NOT GLOB '*[^A-Z0-9_]*'),   -- ô của tệp trong phiếu (vd căn cước mặt trước)
  storage_key      TEXT NOT NULL UNIQUE CHECK (length(storage_key) = 36 AND substr(storage_key, 1, 4) = 'pty/' AND substr(storage_key, 5) NOT GLOB '*[^0-9a-f]*'),
  content_kind     TEXT NOT NULL CHECK (content_kind IN ('jpg', 'png', 'heic', 'pdf')),
  byte_size        INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  content_hash     TEXT CHECK (content_hash IS NULL OR (length(content_hash) = 64 AND content_hash NOT GLOB '*[^0-9a-f]*')),
  stored_at        TEXT,
  purged_at        TEXT,
  purge_reason     TEXT CHECK (purge_reason IS NULL OR (purge_reason = upper(purge_reason) AND length(purge_reason) BETWEEN 2 AND 40 AND purge_reason NOT GLOB '*[^A-Z0-9_]*')),
  r2_deleted_at    TEXT,
  transferred_at   TEXT,
  created_at       TEXT NOT NULL,
  created_by       TEXT,                                                   -- mã danh tính của người đăng ký (không khoá ngoại); CHECK bên dưới: không rỗng
  updated_at       TEXT NOT NULL,
  updated_by       TEXT,
  CHECK (created_by IS NOT NULL),
  CHECK ((purged_at IS NULL) = (purge_reason IS NULL)),
  CHECK ((content_hash IS NOT NULL) = (purged_at IS NULL AND transferred_at IS NULL)),
  CHECK (r2_deleted_at IS NULL OR purged_at IS NOT NULL),
  CHECK (transferred_at IS NULL OR (stored_at IS NOT NULL AND purged_at IS NULL))
);
CREATE INDEX pty_registration_attachment_reg_ix ON pty_registration_attachment(registration_id, slot);
CREATE INDEX pty_registration_attachment_cho_ix ON pty_registration_attachment(created_at) WHERE r2_deleted_at IS NULL AND transferred_at IS NULL AND (purged_at IS NOT NULL OR stored_at IS NULL);

CREATE TRIGGER pty_registration_attachment_no_delete BEFORE DELETE ON pty_registration_attachment
BEGIN SELECT RAISE(ABORT, 'registration_attachment_no_delete: tệp chờ không xoá dòng — quyết gỡ bằng purged_at'); END;
CREATE TRIGGER pty_registration_attachment_no_replace BEFORE INSERT ON pty_registration_attachment
WHEN EXISTS (SELECT 1 FROM pty_registration_attachment a WHERE a.id = NEW.id OR a.storage_key = NEW.storage_key)
BEGIN SELECT RAISE(ABORT, 'registration_attachment_no_replace: UNIQUE — id hoặc khoá kho đã có, không ghi đè dòng tệp chờ'); END;
CREATE TRIGGER pty_registration_attachment_insert_clean BEFORE INSERT ON pty_registration_attachment
WHEN NEW.stored_at IS NOT NULL OR NEW.purged_at IS NOT NULL OR NEW.r2_deleted_at IS NOT NULL OR NEW.transferred_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'registration_attachment_insert_clean: dòng tệp chờ mới phải ở trạng thái chưa lưu, chưa gỡ, chưa chuyển'); END;
CREATE TRIGGER pty_registration_attachment_identity BEFORE UPDATE ON pty_registration_attachment
WHEN NEW.id IS NOT OLD.id OR NEW.registration_id IS NOT OLD.registration_id OR NEW.slot IS NOT OLD.slot OR NEW.storage_key IS NOT OLD.storage_key
  OR NEW.content_kind IS NOT OLD.content_kind OR NEW.byte_size IS NOT OLD.byte_size OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'registration_attachment_identity: không đổi phiếu, ô, khoá kho, loại, cỡ, mốc tạo của tệp chờ'); END;
CREATE TRIGGER pty_registration_attachment_hash_one_way BEFORE UPDATE OF content_hash ON pty_registration_attachment
WHEN NEW.content_hash IS NOT NULL AND NEW.content_hash IS NOT OLD.content_hash
BEGIN SELECT RAISE(ABORT, 'registration_attachment_hash_one_way: băm của tệp chờ chỉ được xoá về rỗng (khi gỡ hoặc chuyển)'); END;
CREATE TRIGGER pty_registration_attachment_purge_one_way BEFORE UPDATE ON pty_registration_attachment
WHEN (OLD.purged_at IS NOT NULL AND (NEW.purged_at IS NOT OLD.purged_at OR NEW.purge_reason IS NOT OLD.purge_reason))
  OR (OLD.r2_deleted_at IS NOT NULL AND NEW.r2_deleted_at IS NOT OLD.r2_deleted_at)
  OR (OLD.r2_deleted_at IS NULL AND NEW.r2_deleted_at IS NOT NULL AND OLD.purged_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'registration_attachment_purge_one_way: quyết gỡ và đã-xoá-khỏi-kho chỉ đi một chiều; đã-xoá-khỏi-kho chỉ sau khi quyết gỡ'); END;
CREATE TRIGGER pty_registration_attachment_store_one_way BEFORE UPDATE OF stored_at ON pty_registration_attachment
WHEN (OLD.stored_at IS NOT NULL AND NEW.stored_at IS NOT OLD.stored_at) OR (OLD.stored_at IS NULL AND NEW.stored_at IS NOT NULL AND (OLD.purged_at IS NOT NULL OR OLD.transferred_at IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'registration_attachment_store_one_way: mốc đã lưu chỉ đặt một lần, và không đặt cho tệp đã quyết gỡ'); END;
CREATE TRIGGER pty_registration_attachment_transfer_one_way BEFORE UPDATE OF transferred_at ON pty_registration_attachment
WHEN (OLD.transferred_at IS NOT NULL AND NEW.transferred_at IS NOT OLD.transferred_at)
  OR (OLD.transferred_at IS NULL AND NEW.transferred_at IS NOT NULL AND (OLD.stored_at IS NULL OR OLD.purged_at IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'registration_attachment_transfer_one_way: mốc đã chuyển chỉ đặt một lần, chỉ cho tệp đã lưu và chưa gỡ'); END;
CREATE TRIGGER pty_registration_attachment_no_purge_after_transfer BEFORE UPDATE OF purged_at ON pty_registration_attachment
WHEN OLD.transferred_at IS NOT NULL AND NEW.purged_at IS NOT OLD.purged_at
BEGIN SELECT RAISE(ABORT, 'registration_attachment_transferred: khoá kho đã thuộc dòng tệp của hồ sơ — không gỡ qua dòng chờ'); END;

-- Mục bắt buộc để hồ sơ được «Đã xác minh» (ADR-0210 Đ1). CHỈ THÊM. Một «bản danh sách» = mọi dòng cùng (loại hồ sơ, valid_from_at); bản hiệu lực = bản có valid_from_at lớn nhất ≤ lúc xét
-- (view bên dưới). Bỏ một mục = thêm bản mới không có mục đó. Mã chỉ chọn trong TẬP ĐÓNG mà phiếu đăng ký đã có ô để khai (src/shared/dau-xac-minh.ts, MUC_XAC_MINH_MO; bài đối chiếu hai bên):
-- thêm mục ngoài tập = sửa mã thêm ô vào phiếu TRƯỚC, rồi tạo lại trigger này.
CREATE TABLE pty_verification_requirement (
  id             TEXT PRIMARY KEY,
  subject_kind   TEXT NOT NULL CHECK (subject_kind IN ('PERSON', 'ORGANIZATION')),
  item_kind      TEXT NOT NULL CHECK (item_kind IN ('ATTRIBUTE', 'DOCUMENT')),
  item_code      TEXT NOT NULL CHECK (item_code = upper(item_code) AND length(item_code) BETWEEN 2 AND 40 AND item_code NOT GLOB '*[^A-Z0-9_]*'),
  valid_from_at  TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  UNIQUE (subject_kind, valid_from_at, item_kind, item_code)
);
CREATE INDEX pty_verification_requirement_ix ON pty_verification_requirement(subject_kind, valid_from_at);
CREATE TRIGGER pty_verification_requirement_no_update BEFORE UPDATE ON pty_verification_requirement
BEGIN SELECT RAISE(ABORT, 'verification_requirement_append_only: mục bắt buộc chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER pty_verification_requirement_no_delete BEFORE DELETE ON pty_verification_requirement
BEGIN SELECT RAISE(ABORT, 'verification_requirement_append_only: mục bắt buộc không xoá'); END;
CREATE TRIGGER pty_verification_requirement_item_closed BEFORE INSERT ON pty_verification_requirement
WHEN NOT ((NEW.item_kind = 'ATTRIBUTE' AND NEW.item_code IN ('HO_TEN', 'NGAY_SINH')) OR (NEW.item_kind = 'DOCUMENT' AND NEW.item_code IN ('CCCD')))
  AND NEW.item_code = upper(NEW.item_code) AND length(NEW.item_code) BETWEEN 2 AND 40 AND NEW.item_code NOT GLOB '*[^A-Z0-9_]*'   -- sai khuôn thì để CHECK báo (trigger BEFORE chạy trước CHECK)
BEGIN SELECT RAISE(ABORT, 'verification_requirement_item_closed: mục này chưa có ô khai trong phiếu đăng ký — thêm ô vào phiếu trước'); END;
-- Mặc định đề xuất cho CÁ NHÂN (ADR-0210 Đ1): họ tên, ngày sinh, một căn cước còn hiệu lực. Danh sách cho tổ chức để đợt 2 đặt.
INSERT INTO pty_verification_requirement (id, subject_kind, item_kind, item_code, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES
  ('gieo-0168-ho-ten',    'PERSON', 'ATTRIBUTE', 'HO_TEN',    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL),
  ('gieo-0168-ngay-sinh', 'PERSON', 'ATTRIBUTE', 'NGAY_SINH', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL),
  ('gieo-0168-cccd',      'PERSON', 'DOCUMENT',  'CCCD',      strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);

-- View công bố 1 (ADR-0210 Đ1, ADR-0002 đ3): danh sách mục bắt buộc ĐANG hiệu lực theo từng loại hồ sơ. Module khác (dang-ky, accounts) đọc view này, không đọc bảng.
CREATE VIEW v_pty_verification_requirement AS
SELECT r.subject_kind, r.item_kind, r.item_code, r.valid_from_at
FROM pty_verification_requirement r
WHERE r.valid_from_at = (SELECT MAX(x.valid_from_at) FROM pty_verification_requirement x
                         WHERE x.subject_kind = r.subject_kind AND x.valid_from_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- View công bố 2: phiên bản chính sách quyền riêng tư MỚI NHẤT (cùng nghĩa «hiện hành» với trigger của phiếu tự khai: version lớn nhất). Phiếu đăng ký ghi policy_id này lúc người đăng ký đồng ý.
CREATE VIEW v_pty_privacy_current AS
SELECT p.id, p.version, p.purposes, p.body, p.valid_from_at
FROM pty_privacy_policy p
ORDER BY p.version DESC
LIMIT 1;

-- Bộ đếm tệp tải lên mỗi giờ mỗi địa chỉ mạng (ADR-0208 Đ2, dk_policy.files_per_network_hour). Module dang-ky; để CHUNG tệp migration này vì route tải tệp ra đời cùng Task 5.
-- Không dùng `login_attempt` của auth: cửa sổ ở đó cố định 15 phút và mỗi lần đặt chỗ xoá dòng quá 15 phút của MỌI khoá. Chỉ-thêm trên thực tế (R-N1-9: không xoá cứng): đếm theo cửa sổ `at_ms`, dòng cũ không còn được đếm; dọn dòng cũ cần quyết định riêng.
-- ip_key là địa chỉ mạng (N2): không vào nhật ký, DTO, câu báo lỗi.
CREATE TABLE dk_upload_attempt (
  id          TEXT PRIMARY KEY,
  ip_key      TEXT NOT NULL CHECK (length(ip_key) BETWEEN 1 AND 100),
  at_ms       INTEGER NOT NULL,
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
CREATE INDEX dk_upload_attempt_ix ON dk_upload_attempt(ip_key, at_ms);
