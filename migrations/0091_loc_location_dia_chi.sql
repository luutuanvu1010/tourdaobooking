-- ADR-0105 mục 6 (accepted 2026-10-08, lượt duyệt 8b câu 1, Q-1 b — nút "Chỉ đường" trên màn tài xế): chỉ THÊM một view công bố của module locations —
-- không bảng, không cột, không trigger; KHÔNG đổi v_loc_location_label (nhiều module đọc view đó).
-- Cột: id (khoá), address (nhãn địa chỉ của nơi — chữ Quản trị nhập ở màn "Địa điểm", ≤ 300 ký tự, có thể NULL), active (cờ). View mang `address` ngoài khuôn
-- "khoá + nhãn + cờ" (docs/ARCHITECTURE.md Phần II mục 4) vì ADR-0105 do chủ duyệt nêu đích danh view và cột (phán quyết G18-D; tiền lệ view mang dữ liệu qua ADR:
-- v_pty_person_xung_ho, v_ord_cancel_state). Người đọc hôm nay: van-chuyen, câu stops_by_trips → khoá DTO tài xế `diaChiChiDuong` (CHỈ GET /cuoc-cua-toi/:id
-- trong ngày chạy). View công bố là hợp đồng giữa hai module (cửa một chiều). Số 0091: 0089 = aud_order_cmd (ADR-0104 Đ2), 0090 = so_dai_ly_dot_1 (nhánh Sổ đại lý).
-- HOÀN TÁC: D1 không có bước "down". Muốn gỡ thì một migration SAU chạy `DROP VIEW v_loc_location_dia_chi;` — mã van-chuyen phải bỏ LEFT JOIN ở bản phát
-- hành TRƯỚC đó (expand–contract hai lần phát hành). Áp migration TRƯỚC khi triển khai mã đọc view (npm run trien-khai đã đúng thứ tự).
CREATE VIEW v_loc_location_dia_chi AS
  SELECT id, address, active FROM loc_location;
