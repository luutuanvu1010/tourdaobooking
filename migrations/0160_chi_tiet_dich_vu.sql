-- Migration 0160 — ADR-0199 Đ1: chi tiết dịch vụ do Nền tảng giữ (Sheet giữ mã, tên gốc, đơn vị, giá gốc).
-- Bảng CHỈ THÊM theo khuôn `ctl_service_ticket_source` (0151): dòng hiệu lực của mỗi `code` = dòng có `valid_from_at` lớn nhất. Sửa = chèn dòng mới mang đủ giá trị.
--   display_name  — tên hiển thị, thắng tên Sheet ở mọi chỗ đọc danh mục; NULL = dùng tên Sheet. Đơn đã lập giữ tên đã chụp (order_service.name).
--   description   — mô tả, chữ thuần (≤ 2.000 ký tự, kiểm ở máy chủ); NULL = chưa có.
--   image_key     — khoá ảnh đại diện trong kho riêng của danh mục (ADR-0199 Đ3, bước sau); NULL = chưa có ảnh.
--   sheet_name_at — tên Sheet lúc ghi dòng, để báo «Tên trên Sheet đã đổi» (ADR-0199 Đ1 mục 4).
-- Đồng bộ Sheet KHÔNG chạm bảng này. Không gieo dòng nào.
-- Tệp không tự mở, đóng giao dịch: wrangler chạy cả tệp trong một lô.
-- HOÀN TÁC: mã cũ không đọc bảng này; bỏ mã đọc là danh mục trở về tên Sheet. Không xoá bảng khi đã có dòng (lịch sử ai sửa gì).

CREATE TABLE ctl_service_detail (
  id             TEXT PRIMARY KEY,
  code           TEXT NOT NULL,
  display_name   TEXT,
  description    TEXT,
  image_key      TEXT,
  sheet_name_at  TEXT NOT NULL,
  valid_from_at  TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  UNIQUE (code, valid_from_at)
);
CREATE TRIGGER ctl_service_detail_no_update BEFORE UPDATE ON ctl_service_detail
BEGIN SELECT RAISE(ABORT, 'ctl_service_detail_append_only: chi tiết dịch vụ chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ctl_service_detail_no_delete BEFORE DELETE ON ctl_service_detail
BEGIN SELECT RAISE(ABORT, 'ctl_service_detail_append_only: chi tiết dịch vụ không xoá'); END;

-- View: giá trị hiện hành của từng dịch vụ đã có chi tiết. Chỉ module catalog đọc.
CREATE VIEW v_ctl_service_detail AS
  SELECT s.code, s.display_name, s.description, s.image_key, s.sheet_name_at, s.valid_from_at FROM ctl_service_detail s
  WHERE s.valid_from_at = (SELECT max(t.valid_from_at) FROM ctl_service_detail t WHERE t.code = s.code);
