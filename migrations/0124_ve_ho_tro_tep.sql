-- Migration 0124 — ADR-0144 (accepted 2026-10-28): tệp đính kèm tin của vé hỗ trợ trên R2 (binding HO_TRO). CHỈ THÊM. Module feedback.
-- Chép khuôn pty_attachment của 0104 (ADR-0123), thay hồ sơ bằng TIN: mỗi tệp thuộc ĐÚNG một tin (message_id không đổi) nên không cần bảng nối.
-- Nội dung tệp KHÔNG nằm trong D1 — chỉ ở kho R2 riêng, khoá tên ngẫu nhiên không mang nghĩa (Hiến chương 5.22). KHÔNG lưu tên tệp gốc.
-- storage_key và content_hash là dữ liệu hạng N3 (tệp có thể là ảnh giấy tờ gửi nhầm): KHÔNG BAO GIỜ vào nhật ký, DTO, câu báo lỗi.
-- Người tải ở created_by — không khoá ngoại sang staff (ADR-0003); trigger buộc người tải = tác giả tin. Trigger chỉ đọc bảng fbk_* (Hiến chương 5.3).
-- "Chỉ-thêm": không xoá dòng; nội dung bất biến; BA mốc đi MỘT chiều (như 0104):
--   stored_at     rỗng → có: đối tượng R2 đã đặt xong (gửi tin ghi D1 TRƯỚC rồi mới đặt R2 — mọi đối tượng trong kho luôn có dòng ở đây).
--   purged_at     rỗng → có, CÙNG LÚC purge_reason (mã: TAI_LEN_LOI / TAI_LEN_DO_DANG / GO_TEP) và content_hash → rỗng: quyết định xoá đã ghi trong lô D1.
--   r2_deleted_at rỗng → có, chỉ SAU purged_at (câu khác): đối tượng R2 đã xoá (việc bên ngoài chạy sau lô — Hiến chương 5.16).
--   "Chờ xoá" = purged_at có, r2_deleted_at rỗng — thấy được (GET /api/feedback/tep-cho-xoa, kiểm R-FBK-1) và chạy lại được.
-- content_kind là danh sách ĐÓNG theo ADR (đổi danh sách = ADR mới), như 0104.

CREATE TABLE fbk_attachment (
  id             TEXT PRIMARY KEY,
  message_id     TEXT NOT NULL REFERENCES fbk_message(id),
  storage_key    TEXT NOT NULL UNIQUE CHECK (length(storage_key) = 36 AND substr(storage_key, 1, 4) = 'fbk/' AND substr(storage_key, 5) NOT GLOB '*[^0-9a-f]*'),
  content_kind   TEXT NOT NULL CHECK (content_kind IN ('jpg', 'png', 'heic', 'pdf')),
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
CREATE INDEX fbk_attachment_message_ix ON fbk_attachment(message_id);
CREATE INDEX fbk_attachment_nguoi_ix ON fbk_attachment(created_by, created_at);   -- trần 20 tệp / giờ / tài khoản (ADR-0144 đ5)
CREATE INDEX fbk_attachment_cho_ix ON fbk_attachment(created_at) WHERE r2_deleted_at IS NULL AND (purged_at IS NOT NULL OR stored_at IS NULL);

CREATE TRIGGER fbk_attachment_no_delete BEFORE DELETE ON fbk_attachment
BEGIN SELECT RAISE(ABORT, 'attachment_no_delete: tệp vé hỗ trợ không xoá dòng — quyết xoá bằng purged_at'); END;
CREATE TRIGGER fbk_attachment_identity BEFORE UPDATE ON fbk_attachment
WHEN NEW.id IS NOT OLD.id OR NEW.message_id IS NOT OLD.message_id OR NEW.storage_key IS NOT OLD.storage_key OR NEW.content_kind IS NOT OLD.content_kind
  OR NEW.byte_size IS NOT OLD.byte_size OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'attachment_identity: không đổi tin, khoá kho, loại, cỡ, mốc tạo, người tải của tệp'); END;
CREATE TRIGGER fbk_attachment_hash_one_way BEFORE UPDATE OF content_hash ON fbk_attachment
WHEN NEW.content_hash IS NOT NULL AND NEW.content_hash IS NOT OLD.content_hash
BEGIN SELECT RAISE(ABORT, 'attachment_hash_one_way: băm của tệp chỉ được xoá về rỗng (khi quyết xoá)'); END;
CREATE TRIGGER fbk_attachment_purge_one_way BEFORE UPDATE ON fbk_attachment
WHEN (OLD.purged_at IS NOT NULL AND (NEW.purged_at IS NOT OLD.purged_at OR NEW.purge_reason IS NOT OLD.purge_reason))
  OR (OLD.r2_deleted_at IS NOT NULL AND NEW.r2_deleted_at IS NOT OLD.r2_deleted_at)
  OR (OLD.r2_deleted_at IS NULL AND NEW.r2_deleted_at IS NOT NULL AND OLD.purged_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'attachment_purge_one_way: quyết xoá và đã-xoá-khỏi-kho chỉ đi một chiều; đã-xoá-khỏi-kho chỉ sau khi quyết xoá'); END;
CREATE TRIGGER fbk_attachment_store_one_way BEFORE UPDATE OF stored_at ON fbk_attachment
WHEN (OLD.stored_at IS NOT NULL AND NEW.stored_at IS NOT OLD.stored_at) OR (OLD.stored_at IS NULL AND NEW.stored_at IS NOT NULL AND OLD.purged_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'attachment_store_one_way: mốc đã lưu chỉ đặt một lần, và không đặt cho tệp đã quyết xoá'); END;

-- Chặn INSERT OR REPLACE lách "chỉ-thêm" (REPLACE xoá dòng cũ mà không chạy trigger xoá) — khuôn 0104.
CREATE TRIGGER fbk_attachment_no_replace BEFORE INSERT ON fbk_attachment
WHEN EXISTS (SELECT 1 FROM fbk_attachment a WHERE a.id = NEW.id OR a.storage_key = NEW.storage_key)
BEGIN SELECT RAISE(ABORT, 'attachment_no_replace: UNIQUE — id hoặc khoá kho đã có, không ghi đè dòng tệp'); END;
-- Người tải = tác giả tin (ADR-0144 đ3: tệp đi CÙNG tin, trong cùng lô). Tin không có thật cũng rơi vào đây (câu chèn của route có EXISTS nên không tới).
CREATE TRIGGER fbk_attachment_author_ins BEFORE INSERT ON fbk_attachment
WHEN NOT EXISTS (SELECT 1 FROM fbk_message m WHERE m.id = NEW.message_id AND m.author_id = NEW.created_by)
BEGIN SELECT RAISE(ABORT, 'attachment_author_mismatch: tệp chỉ gắn vào tin của chính người tải'); END;
-- Tối đa 5 tệp mỗi tin (ADR-0144 đ2) — hai lớp với kiemTepCuaTin (Hiến chương 5.1).
CREATE TRIGGER fbk_attachment_max_ins BEFORE INSERT ON fbk_attachment
WHEN (SELECT count(*) FROM fbk_attachment a WHERE a.message_id = NEW.message_id) >= 5
BEGIN SELECT RAISE(ABORT, 'attachment_too_many: mỗi tin tối đa 5 tệp'); END;
