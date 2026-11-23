-- Migration 0185 — ADR-0231: «Hotline trên vé» của vé Tour Đảo.
-- (1) Ô theo từng dịch vụ (không theo nhóm), bảng CHỈ THÊM theo khuôn `ctl_service_ticket_source` (0151): dòng hiệu lực của mỗi `code` = dòng có `valid_from_at`
--     lớn nhất. `phone` NULL = đã xoá số, vé dùng hotline công ty chủ. Không có dòng = như NULL. Số lưu dạng chuẩn chỉ chữ số; luật kiểm ở src/shared/so-ho-tro.ts.
--     Không gieo dòng nào: mọi dịch vụ đang in hotline công ty như cũ.
-- (2) `vdt_batch.support_phone`: bản chụp số in trên vé của lô Tour Đảo, chụp lúc mở lô, không đổi sau đó (trigger). NULL = lô cũ hoặc lô hãng ngoài.
--     Lần dựng lại bảng `vdt_batch` sau này (khuôn 0134) PHẢI mang theo cột này và trigger `vdt_batch_support_phone_locked`.
-- Số không vào nhật ký. Tệp không tự mở, đóng giao dịch: wrangler chạy cả tệp trong một lô.
-- HOÀN TÁC: mã cũ không đọc bảng và cột mới, nên để nguyên là an toàn; không xoá bảng khi đã có dòng (lịch sử ai đặt số).

CREATE TABLE ctl_service_support_phone (
  id             TEXT PRIMARY KEY,
  code           TEXT NOT NULL,
  phone          TEXT,
  valid_from_at  TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  UNIQUE (code, valid_from_at)
);
CREATE TRIGGER ctl_service_support_phone_no_update BEFORE UPDATE ON ctl_service_support_phone
BEGIN SELECT RAISE(ABORT, 'ctl_service_support_phone_append_only: ô Hotline trên vé chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ctl_service_support_phone_no_delete BEFORE DELETE ON ctl_service_support_phone
BEGIN SELECT RAISE(ABORT, 'ctl_service_support_phone_append_only: ô Hotline trên vé không xoá'); END;

-- View công bố: số hiện hành của từng dịch vụ đã đặt số (dịch vụ đã xoá số không có dòng).
CREATE VIEW v_ctl_service_support_phone AS
  SELECT s.code, s.phone FROM ctl_service_support_phone s
  WHERE s.phone IS NOT NULL
    AND s.valid_from_at = (SELECT max(t.valid_from_at) FROM ctl_service_support_phone t WHERE t.code = s.code);

ALTER TABLE vdt_batch ADD COLUMN support_phone TEXT;
CREATE TRIGGER vdt_batch_support_phone_locked BEFORE UPDATE OF support_phone ON vdt_batch
WHEN NEW.support_phone IS NOT OLD.support_phone
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: hotline trên vé của lô chụp lúc tạo, không đổi được'); END;
