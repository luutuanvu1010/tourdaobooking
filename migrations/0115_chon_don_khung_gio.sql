-- Migration 0115 — ADR-0134 (accepted 2026-10-19): CHỌN ĐÓN THEO DỊCH VỤ + KHUNG GIỜ ĐÓN TRÊN CHẶNG + CHÍNH SÁCH KHUNG GIỜ. Module orders. CHỈ THÊM (expand).
-- Số: ADR ghi số tạm 0114; ngay trước khi tạo tệp (19/10), 0112–0113 (nhánh objective-euclid) và 0114 (nhánh chiết khấu theo loại khách) đã bị giữ ⇒ 0115.
-- Không dựng lại bảng, không chạm trigger cũ (trigger khoá "Đã giao" của 0044 không liệt kê cột ⇒ tự phủ cột mới). Không dữ liệu cá nhân.
--
-- 1) `order_service.pickup_choice` (Đ1): mã 'DON' | 'KHONG_DON' kiểm ở MÃ (`laLuaChonDon`, src/shared/khung-gio-don.ts), không CHECK liệt kê; NULL = chưa chọn
--    hoặc đơn cũ. Bắt buộc ở cửa xác nhận (Đ2, `thieuChonDon`), không ở lưu nháp; đơn đã xác nhận / đã huỷ không bao giờ bị đòi chọn lại.
ALTER TABLE order_service ADD COLUMN pickup_choice TEXT;

-- 2) `ord_transfer_leg.pickup_slot_end` (Đ3): giờ CUỐI khung (HH:MM, giá trị chụp — không khoá tới bảng khung); `pickup_time` = giờ ĐẦU khung = giờ hẹn (Đ4).
--    NULL = "Giờ khác" hoặc chưa chọn. CHECK cột tham chiếu cột khác của dòng khi ADD COLUMN: tiền lệ 0040 / 0058 (đã chạy trên D1 local và production).
ALTER TABLE ord_transfer_leg ADD COLUMN pickup_slot_end TEXT
  CHECK (pickup_slot_end IS NULL OR ((pickup_slot_end GLOB '[01][0-9]:[0-5][0-9]' OR pickup_slot_end GLOB '2[0-3]:[0-5][0-9]')
    AND pickup_time IS NOT NULL AND pickup_slot_end > pickup_time));

-- 3) Chính sách khung giờ đón (Đ5, Đ6) — khuôn `ord_manual_service_policy` (0052): dòng hiệu lực = `valid_from_at` lớn nhất ≤ bây giờ; đổi = chèn dòng mới
--    (route POST /api/cai-dat/khung-gio-don, ô settings.ops), máy chủ đặt `valid_from_at` = max(lúc ghi, mới nhất + 1 ms). `slots_json` = mảng
--    [{"tu":"HH:MM","den":"HH:MM"}] 1–12 khung, tu < den, không chồng nhau, sắp tăng — kiểm ở MÃ (`kiemDanhSachKhung`), không ở CSDL.
CREATE TABLE ord_pickup_slot_policy (
  id             TEXT PRIMARY KEY,
  slots_json     TEXT NOT NULL,
  note           TEXT NOT NULL CHECK (length(note) BETWEEN 1 AND 200),   -- câu lưu ý hiện dưới hàng khung
  valid_from_at  TEXT NOT NULL UNIQUE,                                   -- hiệu lực từ (ISO UTC)
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT
);
INSERT INTO ord_pickup_slot_policy (id, slots_json, note, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES (
  'gieo-0115',
  '[{"tu":"07:30","den":"08:00"},{"tu":"08:00","den":"08:30"},{"tu":"08:30","den":"09:00"},{"tu":"09:00","den":"09:30"},{"tu":"09:30","den":"10:00"}]',
  'Giờ đón thực tế có thể điều chỉnh cho phù hợp tình hình hoạt động.',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL
);
CREATE TRIGGER ord_pickup_slot_policy_no_update BEFORE UPDATE ON ord_pickup_slot_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách khung giờ đón chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ord_pickup_slot_policy_no_delete BEFORE DELETE ON ord_pickup_slot_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách khung giờ đón không xoá'); END;
