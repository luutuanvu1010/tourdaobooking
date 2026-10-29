-- Migration 0125 — ADR-0089 (bảng «Thay câu nào»: ADR-0034 đ1, đ4 + tin "duyệt hoàn" cho Kế toán; kế hoạch Đợt 1 NT-V7 / Task 11): tin «Đơn … đã được duyệt hoàn
-- thu trước cho khách, chờ ghi chi hoàn» vào HỘP THÔNG BÁO của người giữ ô `payment.refund` (Kế toán, Toàn quyền), trừ người duyệt. Chủ dự án 28/10 chọn «Đồng ý,
-- làm trên bản riêng» (một phần của việc đóng lỗ TNV-G1). Module audit.
-- Task 11 dừng ngày 5/10 vì chưa có luật người nhận THEO Ô QUYỀN cho tin về đơn; nay đã có tiền lệ ADR-0136 Đ10 (migration 0120, tin «đang chờ xác nhận» cho ô
-- `order.confirm.review`) — dùng đúng khuôn đó.
-- Dựng lại view (DROP + CREATE — khuôn CHANGE-GUIDE công thức w bước 1; 0120 đã áp remote nên không sửa tệp đó): CÙNG 5 cột, CÙNG điều kiện, chỉ THÊM một
-- hành động `deposit_refund_approved` (nhật ký ghi ở `billing/coc.ts` lệnh duyệt hoàn). KHÔNG thêm `deposit_transfer_approved` (chủ chỉ chọn tin duyệt hoàn)
-- và KHÔNG thêm `order_handler_refused` (K7). Tập hành động = ĐÚNG HANH_DONG_TIN_DON (src/shared/thong-bao.ts — bài src/migrations-tin-cho-xac-nhan.test.ts so
-- tập trên định nghĩa CUỐI của view). Không đẩy màn hình khoá: route duyệt báo Bảng tin bằng `tien` (hanhDongCuaThayDoi = null — bài thong-bao-duyet-hoan.test.ts).
-- Người đọc view: chỉ thongbao (câu list_don, list_doi, doi_vua_ghi — các câu con lọc thêm action, không đổi nghĩa).
-- Số: ngày 28/10, `main` (cục bộ lẫn origin) có tới 0124; không nhánh cục bộ / xa nào giữ số ≥ 0125. Sổ bàn giao nhắc 0122–0123 có thể do một nhánh khác giữ —
-- không dùng hai số đó. Số có thể đổi khi gộp (bài tìm tệp theo ĐUÔI tên, không theo số).
-- HOÀN TÁC: không có migration "down". Muốn quay về thì một migration SAU dựng lại view với 8 hành động của 0120 (mã không phụ thuộc hành động mới — thiếu dòng
-- thì chỉ thiếu tin). View không chứa dữ liệu riêng: gỡ / dựng lại không mất dòng nhật ký nào.
DROP VIEW v_aud_order_event;
CREATE VIEW v_aud_order_event AS                        -- module audit
  SELECT id, order_id, staff_id, action, created_at FROM audit_log
  WHERE order_id IS NOT NULL
    AND action IN ('created', 'order_claimed', 'order_handler_changed', 'confirmed', 'cancelled', 'order_cancelled_by_field', 'order_confirm_requested', 'order_confirm_withdrawn', 'deposit_refund_approved');
