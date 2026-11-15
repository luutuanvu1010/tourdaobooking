-- Migration 0140 — ADR-0142 Đ7 (thiết kế L9; kế hoạch «Bán hàng phụ trách đơn» Task 6): năm hành động mới vào HỘP THÔNG BÁO — lời mời (`sales_invited`), nhận phụ trách
-- (`sales_owner_claimed`), đổi Bán hàng phụ trách (`sales_owner_changed`), X từ chối (`sales_invite_refused`) và Hoàn thành (`order_completed`, hôm nay chưa báo ai). Module audit.
-- Dựng lại view (DROP + CREATE — khuôn CHANGE-GUIDE công thức w bước 1; 0125 đã áp remote nên không sửa tệp đó): CÙNG 5 cột, CÙNG điều kiện `order_id IS NOT NULL`, CÙNG chín hành động của 0125
-- (kể cả `order_confirm_withdrawn` mà bộ lọc `yeuCauDaKhep` của 0120 cần, và `deposit_refund_approved` của 0125), chỉ THÊM năm hành động trên. KHÔNG thêm `order_handler_refused`
-- (chủ để sau — docs/BACKLOG.md mục 3). Tập hành động = ĐÚNG HANH_DONG_TIN_DON (src/shared/thong-bao.ts — bài src/migrations-tin-cho-xac-nhan.test.ts so tập trên định nghĩa CUỐI của view).
-- Người đọc view: chỉ thongbao (câu list_don, list_doi, doi_vua_ghi — các câu con lọc thêm action, không đổi nghĩa). Dòng nhật ký mới không có chi tiết nào thongbao đọc: view vẫn chỉ khoá.
-- Số: ngày 5/11, `main` có tới 0137; nhánh này đã dùng 0138 (bảng Bán hàng phụ trách). Một nhánh khác (claude/partner-type-ta-oracle-18-efd687) giữ `0139_tra_sau_han_muc.sql` và KHÔNG đụng view này
-- (đã kiểm: không nhắc `v_aud_order_event`) — wrangler theo dõi theo TÊN đầy đủ nên hai tệp cùng số 0139 chấp nhận được (như hai tệp `0016_*`); bài tìm tệp theo ĐUÔI tên, không theo số.
-- HOÀN TÁC: không có migration "down". Muốn quay về thì một migration SAU dựng lại view với chín hành động của 0125 (mã không phụ thuộc hành động mới — thiếu dòng thì chỉ thiếu tin).
-- View không chứa dữ liệu riêng: gỡ / dựng lại không mất dòng nhật ký nào.
DROP VIEW v_aud_order_event;
CREATE VIEW v_aud_order_event AS                        -- module audit
  SELECT id, order_id, staff_id, action, created_at FROM audit_log
  WHERE order_id IS NOT NULL
    AND action IN ('created', 'order_claimed', 'order_handler_changed', 'confirmed', 'cancelled', 'order_cancelled_by_field', 'order_confirm_requested', 'order_confirm_withdrawn', 'deposit_refund_approved',
                   'sales_invited', 'sales_owner_claimed', 'sales_owner_changed', 'sales_invite_refused', 'order_completed');
