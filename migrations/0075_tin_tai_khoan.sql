-- ADR-0090 đ3 + đ4 bổ sung (chủ đồng ý 2026-10-02, câu (f)): tin "ngưng tài khoản có quyền tiền" vào "Của tôi" của Toàn quyền. Nguồn = hình chiếu audit_log
-- (khuôn v_aud_order_event 0025, v_aud_trip_event 0070). Chỉ THÊM một view công bố của module audit, không bảng mới. CHỈ KHOÁ — không detail. Chỉ hành động
-- staff_suspended (PATCH /api/staff/:id ngưng tài khoản — module accounts); thongbao đọc view này (đã có cạnh thongbao → audit, không nới ranh giới).
CREATE VIEW v_aud_account_event AS
  SELECT id, target_id AS account_id, staff_id, action, created_at FROM audit_log
  WHERE target_type = 'staff' AND target_id IS NOT NULL AND action = 'staff_suspended';
