-- Migration 0089 — ADR-0104 Đ2 (đồng bộ chuyến theo đơn, accepted 2026-10-08; kế hoạch docs/superpowers/plans/2026-10-08-adr-0104-ke-hoach.md mục 2, T2.1).
-- Chỉ THÊM hai view công bố — không bảng, không cột, không trigger, không sửa view đang có (khuôn 0070 / 0086).
--
-- HOÀN TÁC (Down). D1 không có migration "down" và chạy CẢ tệp này khi áp, nên câu gỡ chỉ được nằm trong chú thích. Muốn gỡ thì viết một migration SAU chứa
-- đúng hai câu dưới đây. Điều kiện an toàn trước khi gỡ (thiếu một điều kiện là mọi lệnh đơn có suất trên chuyến chưa chạy sẽ báo lỗi):
--   1. Bản mã đang chạy trên production KHÔNG còn câu nào nhắc hai view này: câu cổng `TRIP_GATE_THEO_DON` và câu đọc `cam_ket_chang`
--      (src/modules/van-chuyen/chuyen-repo.ts) đã gỡ, hàm tiêm `dongBoChuyen` đã gỡ ở src/index.ts — tức là đã phát hành bản mã quay về trước ADR-0104 Đ2.
--   2. Chạy lệnh đếm chỉ-đọc `SELECT count(*) FROM sqlite_master WHERE sql LIKE '%v_aud_order_cmd%' OR sql LIKE '%v_ord_leg_commit%'` trả đúng 2 (chỉ chính
--      hai view; không trigger / view nào khác đọc chúng).
--   3. Không xoá dòng dữ liệu nào: view không chứa dữ liệu riêng, gỡ view không mất nhật ký hay suất.
-- DROP VIEW v_aud_order_cmd;
-- DROP VIEW v_ord_leg_commit;

-- (1) Module audit — HÌNH CHIẾU audit_log cho câu cổng chuyến của máy đồng bộ (Đ2.2 phương án a): câu cổng hỏi "câu cổng đơn đã thắng" bằng
-- `EXISTS (SELECT 1 FROM v_aud_order_cmd WHERE id = :auditIdDon AND order_id = :orderId)` — đơn thua lặng lẽ thì nhật ký đơn không có ⇒ cổng chuyến thua theo.
-- Chỉ khoá + nhãn: không detail, không người, không giờ. Tập hành động = HANH_DONG_CONG_DON (src/shared/dong-bo-chuyen.ts — bài so tập). KHÔNG mở rộng
-- v_aud_order_event (danh sách cho phép của hộp thông báo — thêm vào đó sinh tin mới) và KHÔNG dùng v_aud_order_change (có detail, chỉ thongbao đọc).
CREATE VIEW v_aud_order_cmd AS
  SELECT id, order_id, action FROM audit_log
   WHERE order_id IS NOT NULL
     AND action IN ('cancelled', 'order_cancelled_by_field', 'order_money_adjusted', 'order_money_adjusted_by_field', 'order_passenger_changed',
                    'order_leg_updated', 'order_leg_closed');

-- (2) Module orders — bốn cột CAM KẾT của chặng (ADR-0056 VK3-A, 0077) cho máy đồng bộ xét `kiemCamKet` khi người KHÔNG xếp xe sửa đơn (phán quyết G10 của
-- điều phối: gốc lắp ráp không gọi hàm hẹp `lichChungChang`; van-chuyen đọc cột qua view công bố hẹp, khuôn v_ord_leg_key 0035). Không tên, không nơi.
CREATE VIEW v_ord_leg_commit AS
  SELECT id, order_id, exclusive_vehicle, min_vehicle_seats FROM ord_transfer_leg;
