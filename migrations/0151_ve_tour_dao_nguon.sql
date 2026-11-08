-- Migration 0151 — ADR-0175 Đ1.1, Đ1.2: nguồn vé.
-- (1) `vdt_batch.source`: lô vé hãng ngoài (`HANG_NGOAI`, mặc định, mọi lô cũ) hay vé Tour Đảo (`TOUR_DAO`); chọn lúc tạo lô, không đổi sau đó (trigger).
--     Không luật vé nào đọc Người bán dịch vụ (`prc_supply_term`). Lần dựng lại bảng `vdt_batch` sau này (khuôn 0134) PHẢI mang theo cột `source` và trigger `vdt_batch_source_locked`.
-- (2) Ô «Vé do ai phát» chỉ trên từng dịch vụ (không theo nhóm), bảng CHỈ THÊM theo khuôn `ctl_service_ticket_flag` (0142): dòng hiệu lực của mỗi `code` = dòng có
--     `valid_from_at` lớn nhất. Không có dòng là `HANG_NGOAI` (luật ở src/shared/nguon-ve.ts). Không gieo dòng nào: mọi dịch vụ đang là vé hãng ngoài.
-- Tệp không tự mở, đóng giao dịch: wrangler chạy cả tệp trong một lô.
-- HOÀN TÁC: chưa có lô `TOUR_DAO` và chưa có dòng ở `ctl_service_ticket_source` thì cột và bảng thừa không ảnh hưởng mã cũ (mã cũ không đọc chúng); có rồi thì
-- phải quyết định số phận từng lô Tour Đảo trước khi bỏ, không xoá thẳng.

ALTER TABLE vdt_batch ADD COLUMN source TEXT NOT NULL DEFAULT 'HANG_NGOAI' CHECK (source IN ('HANG_NGOAI', 'TOUR_DAO'));
CREATE TRIGGER vdt_batch_source_locked BEFORE UPDATE OF source ON vdt_batch
WHEN NEW.source IS NOT OLD.source
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: nguồn vé của lô chọn lúc tạo, không đổi được'); END;

CREATE TABLE ctl_service_ticket_source (
  id             TEXT PRIMARY KEY,
  code           TEXT NOT NULL,
  source         TEXT NOT NULL CHECK (source IN ('HANG_NGOAI', 'TOUR_DAO')),
  valid_from_at  TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  UNIQUE (code, valid_from_at)
);
CREATE TRIGGER ctl_service_ticket_source_no_update BEFORE UPDATE ON ctl_service_ticket_source
BEGIN SELECT RAISE(ABORT, 'ctl_service_ticket_source_append_only: ô Vé do ai phát chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ctl_service_ticket_source_no_delete BEFORE DELETE ON ctl_service_ticket_source
BEGIN SELECT RAISE(ABORT, 'ctl_service_ticket_source_append_only: ô Vé do ai phát không xoá'); END;

-- View công bố: giá trị hiện hành của từng dịch vụ đã đặt ô.
CREATE VIEW v_ctl_service_ticket_source AS
  SELECT s.code, s.source FROM ctl_service_ticket_source s
  WHERE s.valid_from_at = (SELECT max(t.valid_from_at) FROM ctl_service_ticket_source t WHERE t.code = s.code);
