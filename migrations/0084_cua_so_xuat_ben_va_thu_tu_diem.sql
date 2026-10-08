-- Migration 0084 — ADR-0096 (accepted 2026-10-03) Đ1 + Đ2, gói A1 (lộ trình 3/10 V3-A). Module van-chuyen (tiền tố vc_). CHỈ THÊM: một cột chính sách có
-- DEFAULT (tiền lệ 0071) + hai trigger mới trên cạnh PLANNED → RUNNING của vc_trip (cùng chỗ LC-05 `vc_trip_running_requires_check`). Không dữ liệu cá nhân.
-- KHÔNG làm Đ3 (LC-21) — chủ chưa đọc chữ Đ3.
--
-- Đ2 (LC-20) — cửa sổ xuất bến: chỉ xuất bến khi giờ xuất bến (departed_ms — giờ xảy ra: tài xế = giờ máy chủ, văn phòng = giờ khai trong khoảng kẹp) ≥ giờ
--   khởi hành dự kiến − cửa sổ của DÒNG CHÍNH SÁCH HIỆU LỰC TẠI giờ xuất bến (valid_from_at mới nhất ≤ departed_at). 720 phút (12 giờ — lời chủ) là giá trị
--   MẶC ĐỊNH TRONG BẢNG, không phải hằng trong mã: máy chủ, giao diện, trigger luôn đọc cột này. Không tìm được dòng chính sách → CHẶN (nhánh NOT EXISTS
--   viết tường minh vì WHEN ra NULL thì trigger không chạy). Không có đường phá lệ cho ai.
--   Thêm cột có DEFAULT: LỆCH khuôn I43 như 0071 (câu chèn quên cột được điền 720 thay vì bị chặn) — bù bằng bài "câu chèn chính sách liệt kê đủ cột"
--   (src/modules/van-chuyen/chinh-sach.test.ts) và thân yêu cầu BẮT BUỘC số này (kiemChinhSachMoi).
-- Đ1 (LC-19) — điểm đón trước điểm trả: không xuất bến khi còn suất MỞ đang CHỜ LÊN (WAITING) của chuyến có seq(điểm xuống) ≤ seq(điểm lên). Suất đã lên /
--   đã xuống / vắng / huỷ tại điểm không xét (Đ1.1). Đổi thứ tự khi ĐANG CHẠY không có trigger theo dòng (Đ1.6 — lô đổi nhiều điểm đi qua trạng thái trung
--   gian): lớp máy chủ (`daoMoiSauDoi`) + bất biến R-VC-THU-TU (scripts/audit-checks.mjs) — "phát hiện, không chặn".
-- Trigger chỉ đọc bảng vc_ (Hiến chương 5.3); so trên giờ máy chủ đã ghi vào dòng, không dùng giờ hệ thống của CSDL (MỘT mốc giờ mỗi request).
-- Lỗi RAISE mang tiền tố lc19_ / lc20_ → máy chủ đổi thành 409 trip_rule (`loiRangBuocChuyen`, rules.ts).
--
-- HOÀN TÁC (D1 không có migration ngược): gỡ luật = migration MỚI `DROP TRIGGER vc_trip_departure_stop_order; DROP TRIGGER vc_trip_departure_window;`
-- (cột departure_window_minutes giữ lại — vô hại, bỏ theo expand–contract ở lần phát hành sau nếu cần), cùng lần bỏ hai kiểm ở `kiemXuatBen`. Sai nặng ngay
-- sau khi áp: khôi phục Time Travel về điểm khôi phục chụp TRƯỚC khi áp (mất mọi ghi sau điểm đó — chủ quyết).

ALTER TABLE vc_dispatch_policy ADD COLUMN departure_window_minutes INTEGER NOT NULL DEFAULT 720 CHECK (departure_window_minutes BETWEEN 60 AND 2880);

-- LC-19 (ADR-0096 Đ1.2, lớp CSDL).
CREATE TRIGGER vc_trip_departure_stop_order BEFORE UPDATE OF status ON vc_trip
WHEN NEW.status = 'RUNNING' AND OLD.status = 'PLANNED' AND EXISTS (
  SELECT 1 FROM vc_trip_allocation a
    JOIN vc_trip_stop b ON b.id = a.board_stop_id
    JOIN vc_trip_stop d ON d.id = a.alight_stop_id
   WHERE a.trip_id = NEW.id AND a.valid_to_at IS NULL AND a.status = 'WAITING' AND d.seq <= b.seq)
BEGIN SELECT RAISE(ABORT, 'lc19_tra_truoc_don: điểm trả đứng trước điểm đón của khách chờ lên — đổi thứ tự điểm rồi xuất bến'); END;

-- LC-20 (ADR-0096 Đ2.5, lớp CSDL). departed_ms NULL không thể đi cùng RUNNING (CHECK của 0042) — vẫn chặn tường minh để WHEN không ra NULL.
CREATE TRIGGER vc_trip_departure_window BEFORE UPDATE OF status ON vc_trip
WHEN NEW.status = 'RUNNING' AND OLD.status = 'PLANNED' AND (
  NEW.departed_ms IS NULL OR NEW.departed_at IS NULL
  OR NOT EXISTS (SELECT 1 FROM vc_dispatch_policy p WHERE p.valid_from_at <= NEW.departed_at)
  OR NEW.departed_ms < NEW.planned_start_ms - 60000 * (
    SELECT p.departure_window_minutes FROM vc_dispatch_policy p WHERE p.valid_from_at <= NEW.departed_at ORDER BY p.valid_from_at DESC LIMIT 1))
BEGIN SELECT RAISE(ABORT, 'lc20_ngoai_cua_so: chưa tới giờ được xuất bến theo cửa sổ của chính sách điều phối'); END;
