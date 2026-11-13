-- Migration 0162 — nội dung màn bảo trì do Toàn quyền tự sửa (bản mẫu 2c của chủ dự án, 13/11/2026; ADR-0202 đề xuất). CHỈ THÊM một cột. Module maintenance.
-- Số 0160, 0161 đã có ở hai nhánh chưa gộp (chi tiết dịch vụ, cọc văn phòng) nên lấy 0162.
--   content_json  JSON nội dung màn bảo trì: tiêu đề, lời nhắn, nội dung bảo trì, SĐT hỗ trợ, liên kết Zalo, website, lời cảm ơn và năm công tắc ẩn/hiện.
--                 NULL = chưa lưu lần nào ⇒ máy chủ dùng nội dung mặc định (src/shared/maintenance.ts MAINTENANCE_CONTENT_DEFAULT). Máy chủ kiểm trước khi ghi
--                 (checkMaintenanceContent) và kiểm lại khi đọc (contentFromStored: hỏng / sửa tay sai ⇒ mặc định). KHÔNG có CHECK: đường thoát khẩn của bảng
--                 (một câu UPDATE enabled = 0) không được vướng ràng buộc nào.
ALTER TABLE mnt_setting ADD COLUMN content_json TEXT;
