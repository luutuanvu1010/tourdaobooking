-- Migration 0159 — ADR-0182 phần B (accepted 2026-11-13): KHOẢN NỘP của đại lý theo từng đơn (Đ2 mục 4–13) + ảnh biên lai của khoản nộp (Đ2 mục 5, khuôn 0158 / ADR-0196).
-- CHỈ THÊM. Module billing. Xây trên lỗ đang hở HC-5.19, TNV-G1 (khoá `xay_tren_cho_phep_adr_0182_b`, docs/quyen-hoan.json) — chủ cho phát hành KHÔNG chờ diễn tập.
--
-- bil_agent_remittance: mỗi dòng gắn ĐÚNG một đơn. Trạng thái đi MỘT chiều: PENDING → CONFIRMED (kèm phiếu SETTLEMENT của chính đơn) hoặc REJECTED (kèm lý do).
--   Danh sách trạng thái là danh sách ĐÓNG theo ADR (Đ2 mục 7, 8) — đổi = ADR mới. Mỗi đơn tối đa MỘT khoản PENDING (chỉ mục duy nhất một phần — Đ2 mục 13 «bấm hai lần»).
--   Người quyết (decided_by) KHÁC người ghi (created_by) — Đ2 mục 8, luật mới cho đường này. Không khoá ngoại sang staff (ADR-0003).
--   Khoản đã quyết không sửa (Đ2 mục 10): sai thì điều chỉnh có người thứ hai duyệt (ADR-0115).
-- bil_remittance_proof: chép bộ cột + trigger của bil_receipt_proof (0158), gắn KHOẢN NỘP thay khoản thu; cùng kho R2 BIEN_LAI, tiền tố khoá riêng 'nop/'.
--   storage_key, content_hash là N3: KHÔNG BAO GIỜ vào nhật ký, DTO, câu lỗi. Ba mốc stored_at / purged_at / r2_deleted_at đi một chiều như 0158.
-- Trigger thêm trên bil_payment_receipt (Đ2 mục 13, chiều ngược): khoản «Công ty thu» do CHÍNH người đang có khoản nộp chờ của đơn ghi ⇒ chặn.

CREATE TABLE bil_agent_remittance (
  id             TEXT PRIMARY KEY,
  order_id       TEXT NOT NULL REFERENCES orders(id),
  agent_party_id TEXT NOT NULL REFERENCES pty_party(id),
  amount         INTEGER NOT NULL CHECK (amount > 0),
  transfer_date  TEXT NOT NULL CHECK (length(transfer_date) = 10 AND transfer_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  status_code    TEXT NOT NULL CHECK (status_code IN ('PENDING', 'CONFIRMED', 'REJECTED')),
  posting_id     TEXT UNIQUE REFERENCES bil_posting(id),
  reject_reason  TEXT CHECK (reject_reason IS NULL OR length(trim(reject_reason)) BETWEEN 5 AND 500),
  decided_at     TEXT,
  decided_by     TEXT,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  CHECK (created_by IS NOT NULL),
  CHECK ((status_code = 'PENDING') = (decided_at IS NULL)),
  CHECK ((status_code = 'PENDING') = (decided_by IS NULL)),
  CHECK ((status_code = 'REJECTED') = (reject_reason IS NOT NULL)),
  CHECK ((status_code = 'CONFIRMED') = (posting_id IS NOT NULL)),
  CHECK (decided_by IS NULL OR decided_by <> created_by)
);
CREATE UNIQUE INDEX bil_agent_remittance_one_pending ON bil_agent_remittance(order_id) WHERE status_code = 'PENDING';
CREATE INDEX bil_agent_remittance_order_ix ON bil_agent_remittance(order_id);
CREATE INDEX bil_agent_remittance_cho_ix ON bil_agent_remittance(created_at) WHERE status_code = 'PENDING';

CREATE TRIGGER bil_agent_remittance_no_delete BEFORE DELETE ON bil_agent_remittance
BEGIN SELECT RAISE(ABORT, 'remittance_no_delete: khoản nộp không xoá'); END;
-- Chèn luôn ở trạng thái chờ (không chèn thẳng khoản đã quyết).
CREATE TRIGGER bil_agent_remittance_ins_pending BEFORE INSERT ON bil_agent_remittance
WHEN NEW.status_code <> 'PENDING'
BEGIN SELECT RAISE(ABORT, 'remittance_insert_pending: khoản nộp mới luôn ở trạng thái chờ Kế toán xác nhận'); END;
-- Chặn INSERT OR REPLACE lách «chỉ-thêm» (REPLACE xoá dòng cũ mà không chạy trigger xoá).
CREATE TRIGGER bil_agent_remittance_no_replace BEFORE INSERT ON bil_agent_remittance
WHEN EXISTS (SELECT 1 FROM bil_agent_remittance a WHERE a.id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'remittance_no_replace: mã khoản nộp đã có'); END;
CREATE TRIGGER bil_agent_remittance_identity BEFORE UPDATE ON bil_agent_remittance
WHEN NEW.id IS NOT OLD.id OR NEW.order_id IS NOT OLD.order_id OR NEW.agent_party_id IS NOT OLD.agent_party_id OR NEW.amount IS NOT OLD.amount
  OR NEW.transfer_date IS NOT OLD.transfer_date OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'remittance_identity: không đổi đơn, đại lý, số tiền, ngày chuyển, người ghi của khoản nộp'); END;
-- Một chiều: khoản đã quyết không đổi gì nữa (Đ2 mục 10).
CREATE TRIGGER bil_agent_remittance_one_way BEFORE UPDATE ON bil_agent_remittance
WHEN OLD.status_code <> 'PENDING'
BEGIN SELECT RAISE(ABORT, 'remittance_decided: khoản nộp đã được quyết, không sửa'); END;
-- Xác nhận phải trỏ một phiếu QUYẾT TOÁN của CHÍNH đơn (Đ2 mục 9 — không thêm loại dòng sổ).
CREATE TRIGGER bil_agent_remittance_posting BEFORE UPDATE OF posting_id ON bil_agent_remittance
WHEN NEW.posting_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bil_posting p WHERE p.id = NEW.posting_id AND p.kind_code = 'SETTLEMENT' AND p.order_id = NEW.order_id)
BEGIN SELECT RAISE(ABORT, 'remittance_posting: khoản nộp chỉ trỏ phiếu quyết toán của chính đơn'); END;

-- Đ2 mục 13 (chiều ngược, VỪA-4b): người đang có khoản nộp chờ của đơn không khai thêm «Công ty thu» cho đơn đó (một lần tiền chỉ khai ở một đường). Máy chủ chặn trước (409);
-- đây là lớp sau cho khe đọc–ghi. Kế toán ghi «Công ty thu» (người ghi khác người nộp) không bị chặn.
CREATE TRIGGER bil_payment_receipt_nop_cho_cong_ty BEFORE INSERT ON bil_payment_receipt
WHEN NEW.collector_role_code = 'COMPANY'
  AND EXISTS (SELECT 1 FROM bil_agent_remittance a WHERE a.order_id = NEW.order_id AND a.status_code = 'PENDING' AND a.created_by = NEW.created_by)
BEGIN SELECT RAISE(ABORT, 'remittance_pending_company: đơn đang có khoản nộp chờ xác nhận của chính người này'); END;

CREATE TABLE bil_remittance_proof (
  id             TEXT PRIMARY KEY,
  remittance_id  TEXT NOT NULL UNIQUE REFERENCES bil_agent_remittance(id),
  storage_key    TEXT NOT NULL UNIQUE CHECK (length(storage_key) = 36 AND substr(storage_key, 1, 4) = 'nop/' AND substr(storage_key, 5) NOT GLOB '*[^0-9a-f]*'),
  content_kind   TEXT NOT NULL CHECK (content_kind IN ('jpg', 'png', 'heic', 'pdf')),
  byte_size      INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  content_hash   TEXT CHECK (content_hash IS NULL OR (length(content_hash) = 64 AND content_hash NOT GLOB '*[^0-9a-f]*')),
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
CREATE INDEX bil_remittance_proof_nguoi_ix ON bil_remittance_proof(created_by, created_at);
CREATE INDEX bil_remittance_proof_cho_ix ON bil_remittance_proof(created_at) WHERE r2_deleted_at IS NULL AND (purged_at IS NOT NULL OR stored_at IS NULL);

CREATE TRIGGER bil_remittance_proof_no_delete BEFORE DELETE ON bil_remittance_proof
BEGIN SELECT RAISE(ABORT, 'proof_no_delete: ảnh biên lai không xoá dòng — quyết xoá bằng purged_at'); END;
CREATE TRIGGER bil_remittance_proof_identity BEFORE UPDATE ON bil_remittance_proof
WHEN NEW.id IS NOT OLD.id OR NEW.remittance_id IS NOT OLD.remittance_id OR NEW.storage_key IS NOT OLD.storage_key OR NEW.content_kind IS NOT OLD.content_kind
  OR NEW.byte_size IS NOT OLD.byte_size OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'proof_identity: không đổi khoản nộp, khoá kho, loại, cỡ, mốc tạo, người tải của ảnh biên lai'); END;
CREATE TRIGGER bil_remittance_proof_hash_one_way BEFORE UPDATE OF content_hash ON bil_remittance_proof
WHEN NEW.content_hash IS NOT NULL AND NEW.content_hash IS NOT OLD.content_hash
BEGIN SELECT RAISE(ABORT, 'proof_hash_one_way: băm của ảnh chỉ được xoá về rỗng (khi quyết xoá)'); END;
CREATE TRIGGER bil_remittance_proof_purge_one_way BEFORE UPDATE ON bil_remittance_proof
WHEN (OLD.purged_at IS NOT NULL AND (NEW.purged_at IS NOT OLD.purged_at OR NEW.purge_reason IS NOT OLD.purge_reason))
  OR (OLD.r2_deleted_at IS NOT NULL AND NEW.r2_deleted_at IS NOT OLD.r2_deleted_at)
  OR (OLD.r2_deleted_at IS NULL AND NEW.r2_deleted_at IS NOT NULL AND OLD.purged_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'proof_purge_one_way: quyết xoá và đã-xoá-khỏi-kho chỉ đi một chiều; đã-xoá-khỏi-kho chỉ sau khi quyết xoá'); END;
CREATE TRIGGER bil_remittance_proof_store_one_way BEFORE UPDATE OF stored_at ON bil_remittance_proof
WHEN (OLD.stored_at IS NOT NULL AND NEW.stored_at IS NOT OLD.stored_at) OR (OLD.stored_at IS NULL AND NEW.stored_at IS NOT NULL AND OLD.purged_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'proof_store_one_way: mốc đã lưu chỉ đặt một lần, và không đặt cho ảnh đã quyết xoá'); END;
CREATE TRIGGER bil_remittance_proof_no_replace BEFORE INSERT ON bil_remittance_proof
WHEN EXISTS (SELECT 1 FROM bil_remittance_proof p WHERE p.id = NEW.id OR p.storage_key = NEW.storage_key OR p.remittance_id = NEW.remittance_id)
BEGIN SELECT RAISE(ABORT, 'proof_no_replace: UNIQUE — mã, khoá kho hoặc khoản nộp đã có ảnh, không ghi đè dòng ảnh'); END;
-- Người tải = người ghi khoản nộp (Đ3 `dai-ly.nop.ghi`: chính đại lý). Khoản không có thật cũng rơi vào đây.
CREATE TRIGGER bil_remittance_proof_author_ins BEFORE INSERT ON bil_remittance_proof
WHEN NOT EXISTS (SELECT 1 FROM bil_agent_remittance a WHERE a.id = NEW.remittance_id AND a.created_by = NEW.created_by)
BEGIN SELECT RAISE(ABORT, 'proof_author_mismatch: ảnh biên lai chỉ gắn vào khoản nộp do chính người tải ghi'); END;
-- Trần 20 ảnh / giờ / tài khoản (ADR-0182 Đ2 mục 5 — số TEP_MOI_GIO, đếm riêng trên bảng này). Chạm trần ⇒ CẢ lô huỷ: không có khoản nộp thiếu ảnh.
CREATE TRIGGER bil_remittance_proof_rate_ins BEFORE INSERT ON bil_remittance_proof
WHEN (SELECT count(*) FROM bil_remittance_proof p WHERE p.created_by = NEW.created_by AND p.created_at > strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at, '-1 hour')) >= 20
BEGIN SELECT RAISE(ABORT, 'proof_rate_limited: mỗi tài khoản tối đa 20 ảnh biên lai mỗi giờ'); END;

-- View công bố của orders cho billing (chỉ khoá): bên đặt + người lập của MỌI đơn — vị từ «đơn có phiếu» (ADR-0182 Đ2 mục 11, 12) ở cổng mở vé và route khoản nộp.
-- (v_ord_don_tra_sau chỉ phủ đơn Trả sau.)
CREATE VIEW v_ord_order_booker AS SELECT id, staff_id, booker_party_id FROM orders;
