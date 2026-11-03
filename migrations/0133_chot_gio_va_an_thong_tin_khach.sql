-- Migration 0133 — ADR-0154 (accepted 2026-11-02) Đ1, Đ2, Đ3: đối tác không nhập giờ đón (văn phòng chốt giờ ở Còn vé), công tắc ẩn thông tin khách,
-- dấu miễn luật thiếu tên. Module orders. CHỈ THÊM (expand): hai cột mới có mặc định hằng, một bảng mới, bốn trigger mới; trigger cũ chỉ đúng MỘT cái được tạo lại (2b, bắt buộc bởi bài NT-R6), bảng cũ không dựng lại.
-- Số: ngày 02/11, mọi nhánh (cục bộ lẫn xa) tới `0132_ve_qr_tran_lo` (nhánh `claude/ve-dien-tu-qr-tran-lo`); nhánh này tới `0131` ⇒ `0133`.
-- Không đổi `v_ord_order_flag` (trigger đang đọc view này) và không đổi `tinhCanXacNhan`: cờ «cần chốt giờ» và dấu «miễn danh sách» là DỮ LIỆU chụp một lần.
-- Không dữ liệu cá nhân trong cột, bảng nào (chỉ cờ 0/1, mốc giờ, id nhân viên).

-- 1) Cờ «cần chốt giờ» của yêu cầu xác nhận (Đ1.2): máy chủ chụp một lần lúc Gửi đơn, khi đơn của tài khoản Đối tác có lượt đầu của một dịch vụ chọn Đón mà chưa có giờ.
--    1 = người xét phải ghi giờ ở Còn vé (409 `pickup_time_required` nếu thiếu); 0 = yêu cầu như hôm nay (mọi yêu cầu cũ). Không đổi sau khi chèn.
ALTER TABLE ord_confirm_request ADD COLUMN pickup_time_required INTEGER NOT NULL DEFAULT 0 CHECK (pickup_time_required IN (0, 1));
CREATE TRIGGER ord_confirm_request_pickup_time_required_immutable BEFORE UPDATE ON ord_confirm_request
WHEN NEW.pickup_time_required IS NOT OLD.pickup_time_required
BEGIN SELECT RAISE(ABORT, 'ord_confirm_request_immutable: không sửa cờ cần chốt giờ của yêu cầu'); END;

-- 2) Dấu «miễn danh sách khách» của đơn (Đ3.1): chụp lúc lập đơn, khi công tắc ẩn thông tin khách BẬT và người lập là tài khoản Đối tác; đổi công tắc sau đó không
--    đổi dấu đơn cũ. 1 = chặng của đơn không bị giữ `THIEU_TEN` lúc cho xe chạy; 0 = mọi đơn khác (mọi đơn cũ). Không đổi sau khi chèn.
ALTER TABLE orders ADD COLUMN manifest_exempt INTEGER NOT NULL DEFAULT 0 CHECK (manifest_exempt IN (0, 1));
CREATE TRIGGER orders_manifest_exempt_immutable BEFORE UPDATE OF manifest_exempt ON orders
WHEN NEW.manifest_exempt IS NOT OLD.manifest_exempt
BEGIN SELECT RAISE(ABORT, 'orders_manifest_exempt_immutable: không sửa dấu miễn danh sách khách của đơn'); END;

-- 2b) Khoá «Đã giao» (0044) liệt kê MỌI cột của `orders` (bài NT-R6 của src/migrations-orders-da-giao.test.ts bắt cột thêm mà quên). Trigger không `ALTER` được: tạo lại đúng nguyên văn
--     của 0044 CỘNG một vế cho cột mới `manifest_exempt`. Chỉ SIẾT: câu «Hoàn thành» kèm đổi dấu miễn danh sách nay cũng bị chặn. Đây là việc DUY NHẤT tệp này làm với trigger cũ.
DROP TRIGGER orders_delivered_lock;
CREATE TRIGGER orders_delivered_lock BEFORE UPDATE ON orders
WHEN OLD.delivered_at IS NOT NULL
  AND NOT (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL
    AND NEW.id IS OLD.id AND NEW.order_code IS OLD.order_code AND NEW.staff_id IS OLD.staff_id AND NEW.status IS OLD.status
    AND NEW.customer_name IS OLD.customer_name AND NEW.customer_phone IS OLD.customer_phone AND NEW.customer_email IS OLD.customer_email
    AND NEW.customer_note IS OLD.customer_note AND NEW.subtotal IS OLD.subtotal AND NEW.discount IS OLD.discount AND NEW.total IS OLD.total
    AND NEW.deposit_amount IS OLD.deposit_amount AND NEW.deposit_method IS OLD.deposit_method AND NEW.remaining_amount IS OLD.remaining_amount
    AND NEW.payment_note IS OLD.payment_note AND NEW.created_at IS OLD.created_at AND NEW.confirmed_at IS OLD.confirmed_at
    AND NEW.booker_party_id IS OLD.booker_party_id AND NEW.delivered_at IS OLD.delivered_at AND NEW.delivered_by IS OLD.delivered_by
    AND NEW.manifest_exempt IS OLD.manifest_exempt)
BEGIN SELECT RAISE(ABORT, 'order_delivered: đơn đã Đã giao – đã thu đủ, không sửa được'); END;

-- 3) Công tắc «Ẩn thông tin khách khi đối tác đặt vé» (Đ2.1) — khuôn `ord_confirm_policy` (0119): đổi = chèn dòng mới; dòng hiệu lực = `valid_from_at` lớn nhất ≤ bây giờ;
--    gieo MỘT dòng 0 (TẮT) nên phát hành không đổi gì cho tới khi Toàn quyền bật (ô `settings.ops`).
CREATE TABLE ord_partner_customer_policy (
  id                  TEXT PRIMARY KEY,
  hide_customer_info  INTEGER NOT NULL CHECK (hide_customer_info IN (0, 1)),
  valid_from_at       TEXT NOT NULL UNIQUE,
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT
);
INSERT INTO ord_partner_customer_policy (id, hide_customer_info, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0133', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
CREATE TRIGGER ord_partner_customer_policy_no_update BEFORE UPDATE ON ord_partner_customer_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách ẩn thông tin khách chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ord_partner_customer_policy_no_delete BEFORE DELETE ON ord_partner_customer_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách ẩn thông tin khách không xoá'); END;
