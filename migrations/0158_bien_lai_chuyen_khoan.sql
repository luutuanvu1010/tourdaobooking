-- Migration 0158 — ADR-0196 (accepted 2026-11-11): ảnh biên lai chuyển khoản của khoản thu do Đối tác khai «Công ty thu, chuyển khoản», trên R2 (binding BIEN_LAI).
-- CHỈ THÊM. Module billing. Xây trên lỗ đang hở HC-5.19 (khoá `xay_tren_cho_phep_adr_0196`, docs/quyen-hoan.json): CHỈ phát hành SAU diễn tập khôi phục.
-- Chép khuôn fbk_attachment của 0124 (ADR-0144), thay TIN bằng KHOẢN THU: mỗi dòng gắn ĐÚNG một khoản thu (receipt_id không đổi), mỗi khoản tối đa MỘT ảnh
-- (UNIQUE — kể cả sau khi ảnh bị gỡ: không có ảnh thay thế, ADR-0196 Đ11).
-- Nội dung tệp KHÔNG nằm trong D1 — chỉ ở kho R2 riêng, khoá tên ngẫu nhiên không mang nghĩa (Hiến chương 5.22). KHÔNG lưu tên tệp gốc.
-- storage_key và content_hash là dữ liệu hạng N3 (ảnh có số tài khoản, tên người chuyển): KHÔNG BAO GIỜ vào nhật ký, DTO, câu báo lỗi.
-- Người tải ở created_by — không khoá ngoại sang staff (ADR-0003); trigger buộc người tải = người ghi khoản thu, khoản là CUSTOMER_PAYMENT. Trigger chỉ đọc bảng bil_*.
-- "Chỉ-thêm": không xoá dòng; nội dung bất biến; BA mốc đi MỘT chiều (như 0104, 0124):
--   stored_at     rỗng → có: đối tượng R2 đã đặt xong (ghi khoản thu ghi D1 TRƯỚC rồi mới đặt R2 — mọi đối tượng trong kho luôn có dòng ở đây).
--   purged_at     rỗng → có, CÙNG LÚC purge_reason (mã: TAI_LEN_DO_DANG / GO_TEP) và content_hash → rỗng: quyết định xoá đã ghi trong lô D1.
--   r2_deleted_at rỗng → có, chỉ SAU purged_at (câu khác): đối tượng R2 đã xoá (việc bên ngoài chạy sau lô — Hiến chương 5.16).
--   "Tải dở dang" = stored_at rỗng, purged_at rỗng; "chờ xoá" = purged_at có, r2_deleted_at rỗng — thấy được (GET /api/ledger/bien-lai-cho-xoa, kiểm R-BIL-BL1)
--   và chạy lại được (POST /api/ledger/bien-lai-cho-xoa/chay-lai).
-- content_kind là danh sách ĐÓNG theo ADR (đổi danh sách = ADR mới), như 0104, 0124.

CREATE TABLE bil_receipt_proof (
  id             TEXT PRIMARY KEY,
  receipt_id     TEXT NOT NULL UNIQUE REFERENCES bil_payment_receipt(id),
  storage_key    TEXT NOT NULL UNIQUE CHECK (length(storage_key) = 36 AND substr(storage_key, 1, 4) = 'bln/' AND substr(storage_key, 5) NOT GLOB '*[^0-9a-f]*'),
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
CREATE INDEX bil_receipt_proof_nguoi_ix ON bil_receipt_proof(created_by, created_at);   -- trần TEP_MOI_GIO ảnh / giờ / tài khoản (ADR-0196 Đ3)
CREATE INDEX bil_receipt_proof_cho_ix ON bil_receipt_proof(created_at) WHERE r2_deleted_at IS NULL AND (purged_at IS NOT NULL OR stored_at IS NULL);

CREATE TRIGGER bil_receipt_proof_no_delete BEFORE DELETE ON bil_receipt_proof
BEGIN SELECT RAISE(ABORT, 'proof_no_delete: ảnh biên lai không xoá dòng — quyết xoá bằng purged_at'); END;
CREATE TRIGGER bil_receipt_proof_identity BEFORE UPDATE ON bil_receipt_proof
WHEN NEW.id IS NOT OLD.id OR NEW.receipt_id IS NOT OLD.receipt_id OR NEW.storage_key IS NOT OLD.storage_key OR NEW.content_kind IS NOT OLD.content_kind
  OR NEW.byte_size IS NOT OLD.byte_size OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'proof_identity: không đổi khoản thu, khoá kho, loại, cỡ, mốc tạo, người tải của ảnh biên lai'); END;
CREATE TRIGGER bil_receipt_proof_hash_one_way BEFORE UPDATE OF content_hash ON bil_receipt_proof
WHEN NEW.content_hash IS NOT NULL AND NEW.content_hash IS NOT OLD.content_hash
BEGIN SELECT RAISE(ABORT, 'proof_hash_one_way: băm của ảnh chỉ được xoá về rỗng (khi quyết xoá)'); END;
CREATE TRIGGER bil_receipt_proof_purge_one_way BEFORE UPDATE ON bil_receipt_proof
WHEN (OLD.purged_at IS NOT NULL AND (NEW.purged_at IS NOT OLD.purged_at OR NEW.purge_reason IS NOT OLD.purge_reason))
  OR (OLD.r2_deleted_at IS NOT NULL AND NEW.r2_deleted_at IS NOT OLD.r2_deleted_at)
  OR (OLD.r2_deleted_at IS NULL AND NEW.r2_deleted_at IS NOT NULL AND OLD.purged_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'proof_purge_one_way: quyết xoá và đã-xoá-khỏi-kho chỉ đi một chiều; đã-xoá-khỏi-kho chỉ sau khi quyết xoá'); END;
CREATE TRIGGER bil_receipt_proof_store_one_way BEFORE UPDATE OF stored_at ON bil_receipt_proof
WHEN (OLD.stored_at IS NOT NULL AND NEW.stored_at IS NOT OLD.stored_at) OR (OLD.stored_at IS NULL AND NEW.stored_at IS NOT NULL AND OLD.purged_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'proof_store_one_way: mốc đã lưu chỉ đặt một lần, và không đặt cho ảnh đã quyết xoá'); END;

-- Chặn INSERT OR REPLACE lách "chỉ-thêm" (REPLACE xoá dòng cũ mà không chạy trigger xoá) — khuôn 0104/0124, CỘNG khoản thu (UNIQUE receipt_id cũng là đích của REPLACE).
CREATE TRIGGER bil_receipt_proof_no_replace BEFORE INSERT ON bil_receipt_proof
WHEN EXISTS (SELECT 1 FROM bil_receipt_proof p WHERE p.id = NEW.id OR p.storage_key = NEW.storage_key OR p.receipt_id = NEW.receipt_id)
BEGIN SELECT RAISE(ABORT, 'proof_no_replace: UNIQUE — mã, khoá kho hoặc khoản thu đã có ảnh, không ghi đè dòng ảnh'); END;
-- Người tải = người ghi khoản thu, khoản là CUSTOMER_PAYMENT (ADR-0196 Đ3, bản tương đương fbk_attachment_author_ins). Khoản không có thật cũng rơi vào đây
-- (câu chèn của route có EXISTS nên không tới — lô thua lính gác ra 409, không 5xx).
CREATE TRIGGER bil_receipt_proof_author_ins BEFORE INSERT ON bil_receipt_proof
WHEN NOT EXISTS (SELECT 1 FROM bil_payment_receipt r WHERE r.id = NEW.receipt_id AND r.created_by = NEW.created_by AND r.kind_code = 'CUSTOMER_PAYMENT')
BEGIN SELECT RAISE(ABORT, 'proof_author_mismatch: ảnh biên lai chỉ gắn vào khoản thu của khách do chính người tải ghi'); END;
-- Trần 20 ảnh / giờ / tài khoản (ADR-0196 Đ3 — cùng số TEP_MOI_GIO của ADR-0144, đếm riêng trên bảng này; bài src/migrations-bien-lai.test.ts ghim số).
-- Đặt ở TRIGGER (không ở WHERE của câu chèn như fbk_attachment): chạm trần thì CẢ lô bị huỷ — không bao giờ có khoản thu bắt buộc ảnh mà thiếu dòng ảnh.
CREATE TRIGGER bil_receipt_proof_rate_ins BEFORE INSERT ON bil_receipt_proof
WHEN (SELECT count(*) FROM bil_receipt_proof p WHERE p.created_by = NEW.created_by AND p.created_at > strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at, '-1 hour')) >= 20
BEGIN SELECT RAISE(ABORT, 'proof_rate_limited: mỗi tài khoản tối đa 20 ảnh biên lai mỗi giờ'); END;
