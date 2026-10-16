-- Migration 0104 — ADR-0123 (accepted 2026-10-16): kho tệp hồ sơ trên R2 (binding HO_SO). CHỈ THÊM. Module parties.
-- Nội dung tệp KHÔNG nằm trong D1 — chỉ ở kho R2 RIÊNG, khoá tên ngẫu nhiên không mang nghĩa (Hiến chương 5.22). KHÔNG lưu tên tệp gốc (tối thiểu hoá).
-- storage_key và content_hash là dữ liệu hạng N3 (ảnh giấy tờ — Hiến chương 5.20): KHÔNG BAO GIỜ vào nhật ký, DTO, câu báo lỗi.
-- Trigger chỉ đọc bảng pty_* (Hiến chương 5.3). Người tải ở created_by — không khoá ngoại sang staff (ADR-0003).
-- "Chỉ-thêm" của pty_attachment (ruling Q3 kế hoạch 2026-10-16-goi-2-h2-kho-tep): không xoá dòng; nội dung bất biến; BA mốc đi MỘT chiều:
--   stored_at     rỗng → có: đối tượng R2 đã đặt xong (tải lên ghi D1 TRƯỚC rồi mới đặt R2 — mọi đối tượng trong kho luôn có dòng ở đây).
--   purged_at     rỗng → có, CÙNG LÚC purge_reason (mã) và content_hash → rỗng: quyết định xoá đã ghi trong lô D1 (ADR-0123 đ6, ADR-0126 đ3).
--   r2_deleted_at rỗng → có, chỉ SAU purged_at (câu khác): đối tượng R2 đã xoá (việc bên ngoài chạy sau lô — Hiến chương 5.16).
--   "Chờ xoá" = purged_at có, r2_deleted_at rỗng — thấy được (GET /api/parties/tep-cho-xoa, kiểm R-PTY-12) và chạy lại được.

CREATE TABLE pty_attachment (
  id             TEXT PRIMARY KEY,
  party_id       TEXT NOT NULL REFERENCES pty_party(id),            -- hồ sơ nhận tệp LÚC TẢI (không đổi; gộp hồ sơ thêm dòng nối, không sửa cột này)
  storage_key    TEXT NOT NULL UNIQUE CHECK (length(storage_key) = 36 AND substr(storage_key, 1, 4) = 'pty/' AND substr(storage_key, 5) NOT GLOB '*[^0-9a-f]*'),
  content_kind   TEXT NOT NULL CHECK (content_kind IN ('jpg', 'png', 'heic', 'pdf')),   -- theo CHỮ KÝ thật (ADR-0123 đ2 — đổi danh sách = ADR mới)
  byte_size      INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  content_hash   TEXT CHECK (content_hash IS NULL OR (length(content_hash) = 64 AND content_hash NOT GLOB '*[^0-9a-f]*')),  -- SHA-256 hex của nội dung
  stored_at      TEXT,
  purged_at      TEXT,
  purge_reason   TEXT CHECK (purge_reason IS NULL OR (purge_reason = upper(purge_reason) AND length(purge_reason) BETWEEN 2 AND 40 AND purge_reason NOT GLOB '*[^A-Z0-9_]*')),
  r2_deleted_at  TEXT,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  CHECK (created_by IS NOT NULL),
  CHECK ((purged_at IS NULL) = (purge_reason IS NULL)),
  CHECK ((purged_at IS NULL) = (content_hash IS NOT NULL)),
  CHECK (r2_deleted_at IS NULL OR purged_at IS NOT NULL)
);
CREATE INDEX pty_attachment_party_ix ON pty_attachment(party_id);
CREATE INDEX pty_attachment_cho_ix ON pty_attachment(created_at) WHERE r2_deleted_at IS NULL AND (purged_at IS NOT NULL OR stored_at IS NULL);

CREATE TRIGGER pty_attachment_no_delete BEFORE DELETE ON pty_attachment
BEGIN SELECT RAISE(ABORT, 'attachment_no_delete: tệp hồ sơ không xoá dòng — quyết xoá bằng purged_at'); END;
CREATE TRIGGER pty_attachment_identity BEFORE UPDATE ON pty_attachment
WHEN NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.storage_key IS NOT OLD.storage_key OR NEW.content_kind IS NOT OLD.content_kind
  OR NEW.byte_size IS NOT OLD.byte_size OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'attachment_identity: không đổi hồ sơ, khoá kho, loại, cỡ, mốc tạo của tệp'); END;
CREATE TRIGGER pty_attachment_hash_one_way BEFORE UPDATE OF content_hash ON pty_attachment
WHEN NEW.content_hash IS NOT NULL AND NEW.content_hash IS NOT OLD.content_hash
BEGIN SELECT RAISE(ABORT, 'attachment_hash_one_way: băm của tệp chỉ được xoá về rỗng (khi quyết xoá)'); END;
CREATE TRIGGER pty_attachment_purge_one_way BEFORE UPDATE ON pty_attachment
WHEN (OLD.purged_at IS NOT NULL AND (NEW.purged_at IS NOT OLD.purged_at OR NEW.purge_reason IS NOT OLD.purge_reason))
  OR (OLD.r2_deleted_at IS NOT NULL AND NEW.r2_deleted_at IS NOT OLD.r2_deleted_at)
  OR (OLD.r2_deleted_at IS NULL AND NEW.r2_deleted_at IS NOT NULL AND OLD.purged_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'attachment_purge_one_way: quyết xoá và đã-xoá-khỏi-kho chỉ đi một chiều; đã-xoá-khỏi-kho chỉ sau khi quyết xoá'); END;
CREATE TRIGGER pty_attachment_store_one_way BEFORE UPDATE OF stored_at ON pty_attachment
WHEN (OLD.stored_at IS NOT NULL AND NEW.stored_at IS NOT OLD.stored_at) OR (OLD.stored_at IS NULL AND NEW.stored_at IS NOT NULL AND OLD.purged_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'attachment_store_one_way: mốc đã lưu chỉ đặt một lần, và không đặt cho tệp đã quyết xoá'); END;

-- Dòng nối tệp ↔ đối tượng (ADR-0123 đ4, đ5) — CHỈ-THÊM thật. target_kind là MÃ MỞ (CHECK khuôn, không liệt kê — ruling R6): trigger dưới đây chỉ mở
-- PERSON_DOCUMENT, ORG_DOCUMENT; loại khác (vd phiếu tự khai, lát H-4) mở bằng cách TẠO LẠI trigger, không dựng lại bảng.
-- Đích phải thuộc hồ sơ của tệp, hoặc hồ sơ mà hồ sơ của tệp đã GỘP VÀO (ADR-0068 Đ1 bước 4 — một bước, không chuỗi: Đ3).
CREATE TABLE pty_attachment_link (
  attachment_id  TEXT NOT NULL REFERENCES pty_attachment(id),
  target_kind    TEXT NOT NULL CHECK (target_kind = upper(target_kind) AND length(target_kind) BETWEEN 2 AND 30 AND target_kind NOT GLOB '*[^A-Z_]*'),
  target_id      TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  PRIMARY KEY (attachment_id, target_kind, target_id),
  CHECK (created_by IS NOT NULL)
);
CREATE INDEX pty_attachment_link_target_ix ON pty_attachment_link(target_kind, target_id);

CREATE TRIGGER pty_attachment_link_kind_ins BEFORE INSERT ON pty_attachment_link
WHEN NEW.target_kind NOT IN ('PERSON_DOCUMENT', 'ORG_DOCUMENT')
  AND NEW.target_kind = upper(NEW.target_kind) AND length(NEW.target_kind) BETWEEN 2 AND 30 AND NEW.target_kind NOT GLOB '*[^A-Z_]*'  -- sai khuôn thì để CHECK báo (trigger BEFORE chạy trước CHECK)
BEGIN SELECT RAISE(ABORT, 'attachment_link_kind_closed: loại nối này chưa mở'); END;
CREATE TRIGGER pty_attachment_link_purged_ins BEFORE INSERT ON pty_attachment_link
WHEN EXISTS (SELECT 1 FROM pty_attachment a WHERE a.id = NEW.attachment_id AND a.purged_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'attachment_link_purged: tệp đã quyết xoá — không nối thêm'); END;
CREATE TRIGGER pty_attachment_link_target_ins BEFORE INSERT ON pty_attachment_link
WHEN (NEW.target_kind = 'PERSON_DOCUMENT' AND NOT EXISTS (
        SELECT 1 FROM pty_person_document d JOIN pty_attachment a ON a.id = NEW.attachment_id
        WHERE d.id = NEW.target_id
          AND (d.party_id = a.party_id OR d.party_id = (SELECT p.merged_into_id FROM pty_party p WHERE p.id = a.party_id))))
  OR (NEW.target_kind = 'ORG_DOCUMENT' AND NOT EXISTS (
        SELECT 1 FROM pty_organization_document d JOIN pty_attachment a ON a.id = NEW.attachment_id
        WHERE d.id = NEW.target_id
          AND (d.party_id = a.party_id OR d.party_id = (SELECT p.merged_into_id FROM pty_party p WHERE p.id = a.party_id))))
BEGIN SELECT RAISE(ABORT, 'attachment_link_target_mismatch: dòng giấy tờ không thuộc hồ sơ của tệp'); END;
CREATE TRIGGER pty_attachment_link_no_update BEFORE UPDATE ON pty_attachment_link
BEGIN SELECT RAISE(ABORT, 'attachment_link_append_only: dòng nối tệp chỉ thêm, không sửa'); END;
CREATE TRIGGER pty_attachment_link_no_delete BEFORE DELETE ON pty_attachment_link
BEGIN SELECT RAISE(ABORT, 'attachment_link_append_only: dòng nối tệp không xoá'); END;

-- Chặn INSERT OR REPLACE lách "chỉ-thêm": REPLACE xoá dòng cũ mà không chạy trigger xoá. Trigger BEFORE INSERT chạy trước khi SQLite xử lý xung đột,
-- nên bắt được cả REPLACE lẫn chèn trùng thường (thông điệp giữ chữ UNIQUE cho khớp lỗi quen thuộc).
CREATE TRIGGER pty_attachment_no_replace BEFORE INSERT ON pty_attachment
WHEN EXISTS (SELECT 1 FROM pty_attachment a WHERE a.id = NEW.id OR a.storage_key = NEW.storage_key)
BEGIN SELECT RAISE(ABORT, 'attachment_no_replace: UNIQUE — id hoặc khoá kho đã có, không ghi đè dòng tệp'); END;
CREATE TRIGGER pty_attachment_link_no_replace BEFORE INSERT ON pty_attachment_link
WHEN EXISTS (SELECT 1 FROM pty_attachment_link l WHERE l.attachment_id = NEW.attachment_id AND l.target_kind = NEW.target_kind AND l.target_id = NEW.target_id)
BEGIN SELECT RAISE(ABORT, 'attachment_link_no_replace: UNIQUE — dòng nối đã có, không ghi đè'); END;
