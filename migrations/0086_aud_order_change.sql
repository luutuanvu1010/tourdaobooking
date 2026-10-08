-- ADR-0062 Đ1 (accepted 2026-09-30, lượt 1b — chủ gật nới docs/ARCHITECTURE.md Phần II §4 cho ĐÚNG view này) + ADR-0052 D6.2 dòng MQ-07: tin "đơn đổi sau
-- xác nhận" và tin "giờ hẹn chặng đổi khi đã xếp" là HÌNH CHIẾU của audit_log (khuôn v_aud_order_event 0025, v_aud_trip_event 0070, v_aud_account_event 0075).
-- Chỉ THÊM một view công bố của module audit — không bảng, không cột, không sửa view đang có (ADR-0034 điều 5).
-- Có cột `detail` (ngoại lệ có tên của cửa đọc chéo "chỉ khoá + nhãn + cờ"): hàm đọc tin cần chữ có khuôn do máy chủ viết để nêu giá trị cũ → mới.
-- Hàng rào bù: CHỈ module thongbao được nhắc tên view này (bài src/architecture.test.ts); hàm đọc phanDoiCuaTin (src/shared/tin-doi-don.ts) chỉ lấy đoạn có
-- khuôn, không bao giờ in mẩu thô; view lọc ĐÚNG tập nguồn HANH_DONG_TIN_DOI (src/shared/thong-bao.ts — bài src/migrations-tin-doi-don.test.ts so tập).
-- `order_money_adjusted` có sẵn trong danh sách dù chưa route nào ghi (ADR-0062 Đ1 cách (a) — khai trước cho ADR-0063 D1).
-- `leg_id` (MQ-07): dòng sửa / bỏ chặng MỚI ghi target_id = id chặng (target_type vẫn 'order'); dòng cũ target_id = id đơn → leg_id NULL.
-- HOÀN TÁC: không có migration "down". Muốn gỡ thì một migration SAU chạy `DROP VIEW v_aud_order_change;` (mã thongbao phải bỏ câu đọc trước).
CREATE VIEW v_aud_order_change AS
  SELECT id, order_id, staff_id, action, detail, created_at,
         CASE WHEN action IN ('order_leg_updated', 'order_leg_closed') AND target_id <> order_id THEN target_id END AS leg_id
  FROM audit_log
  WHERE order_id IS NOT NULL
    AND action IN ('trip_updated', 'order_leg_updated', 'order_leg_added', 'order_leg_closed', 'order_money_adjusted_by_field', 'order_money_adjusted');
