-- Migration 0190 — ADR-0232 (accepted 2026-11-22): «Ảnh bàn giao» — ảnh chụp lúc làm việc gắn vào đơn, trên R2 (binding ANH_BAN_GIAO). Module anh-ban-giao (tiền tố abg_).
-- CHỈ THÊM. Xây trên lỗ đang hở HC-5.19 (khoá `xay_tren_cho_phep_adr_0232`, docs/quyen-hoan.json; chủ bỏ điều kiện diễn tập 22/11).
-- Khuôn bil_receipt_proof (0158). Nội dung ảnh KHÔNG nằm trong D1 — chỉ ở kho R2 riêng, khoá ngẫu nhiên không mang nghĩa (Hiến chương 5.22). Không tên tệp gốc,
-- không toạ độ, không giờ chụp của máy (Đ2). thumb_key, view_key, content_hash, hidden_reason là hạng N3; note là N2 — KHÔNG BAO GIỜ vào nhật ký, câu báo lỗi.
-- Người tải ở created_by — không khoá ngoại sang staff (ADR-0003). Đơn / dịch vụ / lượt đón của module orders: đọc qua view v_ord_* (không khoá ngoại xuyên module).
-- "Chỉ-thêm": không xoá dòng; nội dung bất biến; các mốc đi MỘT chiều:
--   stored_at     rỗng → có: HAI đối tượng R2 (ảnh nhỏ, ảnh xem) đã đặt xong (lô D1 TRƯỚC, đặt R2 SAU — mọi đối tượng trong kho luôn có dòng ở đây).
--   purged_at     rỗng → có, CÙNG LÚC purge_reason, content_hash → rỗng (và note được phép về rỗng): quyết gỡ đã ghi trong lô D1.
--   r2_deleted_at rỗng → có, chỉ SAU purged_at: hai đối tượng R2 đã xoá (việc bên ngoài chạy sau lô — Hiến chương 5.16).
--   erasure_request_id rỗng → có: ảnh được đánh dấu vào một yêu cầu xoá (biến thể 7B); không đổi, không bỏ.
--   hidden_at/by/reason rỗng → có (cùng lúc): Toàn quyền ẩn (Đ7); không bỏ ẩn.
-- HẠN GIỮ (Đ7): retain_until do máy chủ tính lúc tải = giờ tải + số năm của chính sách riêng tư đang hiệu lực (Đ2, Đ10). Trigger so với GIỜ HỆ THỐNG của SQLite
-- (strftime 'now', cùng khuôn chuỗi với toISOString) — không tin mốc người gọi đưa. Trước hạn, chỉ ba ngoại lệ có tên: TAI_LEN_LOI (ảnh chưa từng lưu xong),
-- GIAY_TO_CHUP_NHAM (Đ8, Hiến chương 5.25), XOA_THEO_YEU_CAU kèm yêu cầu có thật (biến thể 7B). HET_HAN chỉ sau hạn. Danh sách mã lý do ĐÓNG theo ADR.

CREATE VIEW v_ord_service_key AS                            -- module orders: khoá dịch vụ trên đơn (để module khác kiểm «dịch vụ thuộc đơn»)
  SELECT id, order_id FROM order_service;

CREATE TABLE abg_erasure_request (
  id            TEXT PRIMARY KEY,
  source        TEXT NOT NULL CHECK (source IN ('PHIEU', 'KHACH')),       -- PHIEU = phiếu xoá của người có tài khoản (ADR-0126); KHACH = khách không tài khoản báo qua kênh liên hệ
  phieu_id      TEXT,                                                     -- mã pty_erasure_request (không khoá ngoại xuyên module)
  channel_note  TEXT CHECK (channel_note IS NULL OR length(trim(channel_note)) BETWEEN 3 AND 300),  -- kênh và cách xác minh người yêu cầu (N2)
  executed_at   TEXT,                                                     -- lúc các ảnh của yêu cầu đã được quyết gỡ (PHIEU: lô thực hiện phiếu; KHACH: ngay)
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT,
  CHECK (created_by IS NOT NULL),
  CHECK ((source = 'PHIEU') = (phieu_id IS NOT NULL)),
  CHECK ((source = 'KHACH') = (channel_note IS NOT NULL))
);
CREATE INDEX abg_erasure_request_phieu_ix ON abg_erasure_request(phieu_id) WHERE phieu_id IS NOT NULL;
CREATE TRIGGER abg_erasure_request_no_delete BEFORE DELETE ON abg_erasure_request
BEGIN SELECT RAISE(ABORT, 'erasure_request_no_delete: yêu cầu xoá ảnh không xoá dòng'); END;
CREATE TRIGGER abg_erasure_request_identity BEFORE UPDATE ON abg_erasure_request
WHEN NEW.id IS NOT OLD.id OR NEW.source IS NOT OLD.source OR NEW.phieu_id IS NOT OLD.phieu_id OR NEW.channel_note IS NOT OLD.channel_note
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by OR (OLD.executed_at IS NOT NULL AND NEW.executed_at IS NOT OLD.executed_at)
BEGIN SELECT RAISE(ABORT, 'erasure_request_identity: yêu cầu xoá ảnh không đổi nguồn, mã phiếu, ghi chú; mốc thực hiện chỉ đặt một lần'); END;

CREATE TABLE abg_photo (
  id                  TEXT PRIMARY KEY,
  order_id            TEXT NOT NULL,
  order_service_id    TEXT,
  transfer_leg_id     TEXT,
  task_kind           TEXT NOT NULL CHECK (task_kind IN ('GIAO_KHACH', 'GIAO_TAI_XE', 'KHAC')),
  note                TEXT CHECK (note IS NULL OR length(trim(note)) BETWEEN 1 AND 200),
  thumb_key           TEXT NOT NULL UNIQUE CHECK (length(thumb_key) = 36 AND substr(thumb_key, 1, 4) = 'abg/' AND substr(thumb_key, 5) NOT GLOB '*[^0-9a-f]*'),
  view_key            TEXT NOT NULL UNIQUE CHECK (length(view_key) = 36 AND substr(view_key, 1, 4) = 'abg/' AND substr(view_key, 5) NOT GLOB '*[^0-9a-f]*'),
  thumb_size          INTEGER NOT NULL CHECK (thumb_size BETWEEN 1 AND 102400),
  view_size           INTEGER NOT NULL CHECK (view_size BETWEEN 1 AND 614400),
  content_hash        TEXT CHECK (content_hash IS NULL OR (length(content_hash) = 64 AND content_hash NOT GLOB '*[^0-9a-f]*')),  -- SHA-256 hex của ảnh xem
  retain_until        TEXT NOT NULL,
  stored_at           TEXT,
  purged_at           TEXT,
  purge_reason        TEXT CHECK (purge_reason IS NULL OR (purge_reason = upper(purge_reason) AND length(purge_reason) BETWEEN 2 AND 40 AND purge_reason NOT GLOB '*[^A-Z0-9_]*')),
  erasure_request_id  TEXT REFERENCES abg_erasure_request(id),
  r2_deleted_at       TEXT,
  hidden_at           TEXT,
  hidden_by           TEXT,
  hidden_reason       TEXT CHECK (hidden_reason IS NULL OR length(trim(hidden_reason)) BETWEEN 3 AND 300),
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  CHECK (created_by IS NOT NULL),
  CHECK (order_service_id IS NULL OR transfer_leg_id IS NULL),
  CHECK (retain_until > created_at),
  CHECK ((purged_at IS NULL) = (purge_reason IS NULL)),
  CHECK ((purged_at IS NULL) = (content_hash IS NOT NULL)),
  CHECK (r2_deleted_at IS NULL OR purged_at IS NOT NULL),
  CHECK ((hidden_at IS NULL) = (hidden_by IS NULL) AND (hidden_at IS NULL) = (hidden_reason IS NULL))
);
CREATE INDEX abg_photo_order_ix ON abg_photo(order_id, created_at);
CREATE INDEX abg_photo_nguoi_ix ON abg_photo(created_by, created_at);   -- trần TEP_MOI_GIO ảnh / giờ / tài khoản
CREATE INDEX abg_photo_yeu_cau_ix ON abg_photo(erasure_request_id) WHERE erasure_request_id IS NOT NULL;
CREATE INDEX abg_photo_cho_ix ON abg_photo(created_at) WHERE r2_deleted_at IS NULL AND (purged_at IS NOT NULL OR stored_at IS NULL);
CREATE INDEX abg_photo_han_ix ON abg_photo(retain_until) WHERE purged_at IS NULL;

CREATE TRIGGER abg_photo_no_delete BEFORE DELETE ON abg_photo
BEGIN SELECT RAISE(ABORT, 'photo_no_delete: ảnh bàn giao không xoá dòng — quyết gỡ bằng purged_at'); END;
-- Ghi chú chỉ được về rỗng, và chỉ trong CÙNG câu quyết gỡ (ẩn danh khi xoá theo yêu cầu / giấy tờ chụp nhầm).
CREATE TRIGGER abg_photo_identity BEFORE UPDATE ON abg_photo
WHEN NEW.id IS NOT OLD.id OR NEW.order_id IS NOT OLD.order_id OR NEW.order_service_id IS NOT OLD.order_service_id OR NEW.transfer_leg_id IS NOT OLD.transfer_leg_id
  OR NEW.task_kind IS NOT OLD.task_kind OR NEW.thumb_key IS NOT OLD.thumb_key OR NEW.view_key IS NOT OLD.view_key OR NEW.thumb_size IS NOT OLD.thumb_size
  OR NEW.view_size IS NOT OLD.view_size OR NEW.retain_until IS NOT OLD.retain_until OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR (NEW.note IS NOT OLD.note AND NOT (NEW.note IS NULL AND OLD.purged_at IS NULL AND NEW.purged_at IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'photo_identity: không đổi đơn, đích, loại việc, khoá kho, cỡ, hạn giữ, mốc tạo, người tải; ghi chú chỉ về rỗng lúc quyết gỡ'); END;
CREATE TRIGGER abg_photo_hash_one_way BEFORE UPDATE OF content_hash ON abg_photo
WHEN NEW.content_hash IS NOT NULL AND NEW.content_hash IS NOT OLD.content_hash
BEGIN SELECT RAISE(ABORT, 'photo_hash_one_way: băm của ảnh chỉ được xoá về rỗng (khi quyết gỡ)'); END;
CREATE TRIGGER abg_photo_purge_one_way BEFORE UPDATE ON abg_photo
WHEN (OLD.purged_at IS NOT NULL AND (NEW.purged_at IS NOT OLD.purged_at OR NEW.purge_reason IS NOT OLD.purge_reason))
  OR (OLD.r2_deleted_at IS NOT NULL AND NEW.r2_deleted_at IS NOT OLD.r2_deleted_at)
  OR (OLD.r2_deleted_at IS NULL AND NEW.r2_deleted_at IS NOT NULL AND OLD.purged_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'photo_purge_one_way: quyết gỡ và đã-xoá-khỏi-kho chỉ đi một chiều; đã-xoá-khỏi-kho chỉ sau khi quyết gỡ'); END;
CREATE TRIGGER abg_photo_store_one_way BEFORE UPDATE OF stored_at ON abg_photo
WHEN (OLD.stored_at IS NOT NULL AND NEW.stored_at IS NOT OLD.stored_at) OR (OLD.stored_at IS NULL AND NEW.stored_at IS NOT NULL AND OLD.purged_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'photo_store_one_way: mốc đã lưu chỉ đặt một lần, và không đặt cho ảnh đã quyết gỡ'); END;
CREATE TRIGGER abg_photo_mark_one_way BEFORE UPDATE OF erasure_request_id ON abg_photo
WHEN OLD.erasure_request_id IS NOT NULL AND NEW.erasure_request_id IS NOT OLD.erasure_request_id
BEGIN SELECT RAISE(ABORT, 'photo_mark_one_way: ảnh đã đánh dấu vào một yêu cầu xoá thì không đổi, không bỏ'); END;
CREATE TRIGGER abg_photo_hide_one_way BEFORE UPDATE ON abg_photo
WHEN OLD.hidden_at IS NOT NULL AND (NEW.hidden_at IS NOT OLD.hidden_at OR NEW.hidden_by IS NOT OLD.hidden_by OR NEW.hidden_reason IS NOT OLD.hidden_reason)
BEGIN SELECT RAISE(ABORT, 'photo_hide_one_way: ảnh đã ẩn thì không bỏ ẩn, không đổi lý do'); END;
-- HẠN GIỮ (ADR-0232 Đ7, Đ8). Giờ so là giờ hệ thống của SQLite.
CREATE TRIGGER abg_photo_retention_hold BEFORE UPDATE OF purged_at ON abg_photo
WHEN OLD.purged_at IS NULL AND NEW.purged_at IS NOT NULL
  AND NOT (NEW.purge_reason = 'HET_HAN' AND strftime('%Y-%m-%dT%H:%M:%fZ', 'now') >= OLD.retain_until)
  AND NOT (NEW.purge_reason = 'TAI_LEN_LOI' AND OLD.stored_at IS NULL)
  AND NOT (NEW.purge_reason = 'GIAY_TO_CHUP_NHAM')
  AND NOT (NEW.purge_reason = 'XOA_THEO_YEU_CAU' AND NEW.erasure_request_id IS NOT NULL
           AND EXISTS (SELECT 1 FROM abg_erasure_request r WHERE r.id = NEW.erasure_request_id))
BEGIN SELECT RAISE(ABORT, 'photo_retention_hold: ảnh bàn giao chưa tới hạn giữ — chỉ gỡ được khi ảnh lọt giấy tờ, khi có yêu cầu xoá, hoặc khi chưa tải lên xong'); END;

-- Chặn INSERT OR REPLACE lách "chỉ-thêm" (khuôn 0104/0124/0158).
CREATE TRIGGER abg_photo_no_replace BEFORE INSERT ON abg_photo
WHEN EXISTS (SELECT 1 FROM abg_photo p WHERE p.id = NEW.id OR p.thumb_key = NEW.thumb_key OR p.view_key = NEW.view_key OR p.thumb_key = NEW.view_key OR p.view_key = NEW.thumb_key)
BEGIN SELECT RAISE(ABORT, 'photo_no_replace: UNIQUE — mã hoặc khoá kho đã có, không ghi đè dòng ảnh'); END;
-- Ảnh mới chỉ cho dòng sạch: chưa lưu, chưa gỡ, chưa ẩn, chưa đánh dấu xoá.
CREATE TRIGGER abg_photo_clean_ins BEFORE INSERT ON abg_photo
WHEN NEW.stored_at IS NOT NULL OR NEW.purged_at IS NOT NULL OR NEW.r2_deleted_at IS NOT NULL OR NEW.hidden_at IS NOT NULL OR NEW.erasure_request_id IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'photo_clean_ins: ảnh mới không mang sẵn mốc lưu, gỡ, ẩn hay yêu cầu xoá'); END;
-- Đơn phải đã xác nhận (không nháp, không huỷ — ADR-0232 Đ5).
CREATE TRIGGER abg_photo_order_ins BEFORE INSERT ON abg_photo
WHEN NOT EXISTS (SELECT 1 FROM v_ord_order_state s WHERE s.id = NEW.order_id AND s.status = 'confirmed')
BEGIN SELECT RAISE(ABORT, 'photo_order_not_confirmed: ảnh bàn giao chỉ gắn đơn đã xác nhận'); END;
CREATE TRIGGER abg_photo_target_ins BEFORE INSERT ON abg_photo
WHEN (NEW.order_service_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM v_ord_service_key k WHERE k.id = NEW.order_service_id AND k.order_id = NEW.order_id))
  OR (NEW.transfer_leg_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM v_ord_leg_key k WHERE k.id = NEW.transfer_leg_id AND k.order_id = NEW.order_id))
BEGIN SELECT RAISE(ABORT, 'photo_target_mismatch: dịch vụ hoặc lượt đón không thuộc đơn này'); END;
-- Trần 20 ảnh / giờ / tài khoản (TEP_MOI_GIO — bài src/migrations-anh-ban-giao.test.ts ghim số) và 30 ảnh còn hiện mỗi đơn (Đ5).
CREATE TRIGGER abg_photo_rate_ins BEFORE INSERT ON abg_photo
WHEN (SELECT count(*) FROM abg_photo p WHERE p.created_by = NEW.created_by AND p.created_at > strftime('%Y-%m-%dT%H:%M:%fZ', NEW.created_at, '-1 hour')) >= 20
BEGIN SELECT RAISE(ABORT, 'photo_rate_limited: mỗi tài khoản tối đa 20 ảnh bàn giao mỗi giờ'); END;
CREATE TRIGGER abg_photo_order_full_ins BEFORE INSERT ON abg_photo
WHEN (SELECT count(*) FROM abg_photo p WHERE p.order_id = NEW.order_id AND p.purged_at IS NULL AND p.hidden_at IS NULL) >= 30
BEGIN SELECT RAISE(ABORT, 'photo_order_full: mỗi đơn tối đa 30 ảnh bàn giao'); END;

-- Số năm giữ ảnh bàn giao của từng bản chính sách riêng tư (ADR-0232 Đ10): trống = bản này chưa có mục ảnh ⇒ máy chủ không nhận ảnh mới. Chỉ thêm cột, KHÔNG dựng lại view
-- v_pty_privacy_* (module anh-ban-giao không đọc view — gốc lắp ráp tiêm hàm đọc của parties).
ALTER TABLE pty_privacy_policy ADD COLUMN photo_retention_years INTEGER CHECK (photo_retention_years IS NULL OR photo_retention_years BETWEEN 1 AND 20);
