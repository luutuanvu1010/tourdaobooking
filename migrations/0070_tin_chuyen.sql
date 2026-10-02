-- ADR-0052 D6.1 (lượt A-1, đã duyệt 2026-09-30): nguồn TIN CHUYẾN = hình chiếu audit_log (khuôn v_aud_order_event, 0025). Chỉ THÊM một view công bố của
-- module audit. CHỈ KHOÁ — không detail (không tên, không nơi). id = id lệnh = id vc_trip_event. Mọi hành động trip_* (Bảng tin cần mọi lệnh; hộp thông
-- báo lọc theo HANH_DONG_TIN_CHUYEN ở mã — src/shared/tin-chuyen.ts).
CREATE VIEW v_aud_trip_event AS
  SELECT id, target_id AS trip_id, staff_id, action, created_at FROM audit_log
  WHERE target_type = 'trip' AND target_id IS NOT NULL AND action LIKE 'trip\_%' ESCAPE '\';
