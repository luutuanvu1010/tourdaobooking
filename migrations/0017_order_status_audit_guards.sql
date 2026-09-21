-- Đối chiếu Oracle TCA bản 2 (docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md, P-2 + P-5). Chỉ THÊM trigger; không đổi bảng, không đổi dữ liệu.
-- Mã đã chặn đủ (canTransition + WHERE status = … trong orders/repository.ts; không có câu sửa/xoá audit_log). Đây là lưới ở CSDL
-- (ADR-0003: toàn vẹn nằm ở CSDL) cho SQL chạy tay trên D1 và cho mã viết sau (N3 thêm đường sửa đơn sau xác nhận).

-- 1) Luật chuyển trạng thái đơn §2.3: draft → confirmed | cancelled, confirmed → cancelled, cancelled → (không đi đâu).
--    `UPDATE OF status` vẫn chạy khi cột có trong SET dù giá trị không đổi → điều kiện `NEW.status IS NOT OLD.status` để câu giữ nguyên trạng thái đi qua.
--    Chạy cùng `orders_confirm_requires_trip` (0008); trigger đó chỉ kiểm đủ chuyến, không kiểm trạng thái nguồn.
CREATE TRIGGER orders_status_transition BEFORE UPDATE OF status ON orders
WHEN NEW.status IS NOT OLD.status
  AND NOT ((OLD.status = 'draft' AND NEW.status IN ('confirmed', 'cancelled'))
        OR (OLD.status = 'confirmed' AND NEW.status = 'cancelled'))
BEGIN SELECT RAISE(ABORT, 'invalid_transition: đơn chỉ đi nháp → xác nhận/huỷ hoặc xác nhận → huỷ'); END;

-- 2) Nhật ký chỉ-thêm (ADR-0003 điều 8: bảng chỉ-thêm không sửa, không xoá). Chặn tai nạn, KHÔNG chặn người cố ý có quyền quản trị D1 (gỡ được trigger).
--    Nếu sau này buộc phải dựng lại audit_log thì PHẢI tạo lại hai trigger này (src/migrations-0017.test.ts kiểm chúng còn tồn tại).
--    DROP TABLE không kích hoạt trigger DELETE nên không cản trình tự dựng lại bảng của ADR-0003 điều 10.
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_append_only: nhật ký không được sửa'); END;

CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_append_only: nhật ký không được xoá'); END;
