-- Migration 0120 — ADR-0136 Đ10 (accepted 2026-10-25): tin «Đơn … đang chờ xác nhận» vào HỘP THÔNG BÁO của người giữ ô `order.confirm.review`. Module audit.
-- Lỗi bản 2.36: route Gửi xác nhận / Gửi đơn (nhánh A) ghi nhật ký `order_confirm_requested`, mã thuần đã có loại tin `cho_xac_nhan` (HANH_DONG_TIN_DON,
-- loaiTinDon, CAU, ánh xạ báo đẩy), nhưng view hộp thư `v_aud_order_event` (0025) không có hành động đó ⇒ hộp thư không có mục, còn màn hình khoá (đọc
-- chữ từ chính hộp thư qua GET /api/thong-bao/moi-nhat) hiện câu của một tin chưa đọc CŨ HƠN.
-- Dựng lại view (DROP + CREATE — khuôn CHANGE-GUIDE công thức w bước 1; 0025 đã áp remote nên không sửa tệp đó): CÙNG 5 cột, CÙNG điều kiện, chỉ THÊM
-- `order_confirm_requested`. KHÔNG thêm `order_confirm_withdrawn` (loaiTinDon không có nhánh — không thành tin) và KHÔNG thêm `order_handler_refused` (K7,
-- chủ đã quyết — CHANGE-GUIDE công thức w). Tập hành động = ĐÚNG HANH_DONG_TIN_DON (src/shared/thong-bao.ts — bài src/migrations-tin-cho-xac-nhan.test.ts).
-- Người đọc view: chỉ thongbao (câu list_don, list_doi, doi_vua_ghi — các câu con lọc thêm action = 'created' / 'confirmed', không đổi nghĩa).
-- Số: ngày 27/10, `main` (cục bộ lẫn origin) có tới 0119; không nhánh (cục bộ lẫn xa) và không worktree nào giữ số ≥ 0120 ⇒ 0120.
-- HOÀN TÁC: không có migration "down". Muốn quay về thì một migration SAU dựng lại view với 6 hành động của 0025 (mã không phụ thuộc hành động thứ 7 —
-- thiếu dòng thì chỉ thiếu tin, như bản 2.36). View không chứa dữ liệu riêng: gỡ / dựng lại không mất dòng nhật ký nào.
DROP VIEW v_aud_order_event;
CREATE VIEW v_aud_order_event AS                        -- module audit
  SELECT id, order_id, staff_id, action, created_at FROM audit_log
  WHERE order_id IS NOT NULL
    AND action IN ('created', 'order_claimed', 'order_handler_changed', 'confirmed', 'cancelled', 'order_cancelled_by_field', 'order_confirm_requested');
