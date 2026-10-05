-- Đợt 7 (ADR-0056 VK3-A): cam kết với khách trên chặng đưa đón — "xe riêng" và "xe tối thiểu N chỗ" — cộng dấu phá lệ cam kết của chuyến.
-- Chỉ-thêm (expand): bốn cột, không dựng lại bảng, không đụng trigger cũ. Chặng và chuyến cũ nhận mặc định "không cam kết" / "không phá lệ".

-- orders (A1): hai ô cam kết của chặng. Không mang tiền, không mang tên người.
ALTER TABLE ord_transfer_leg ADD COLUMN exclusive_vehicle INTEGER NOT NULL DEFAULT 0 CHECK (exclusive_vehicle IN (0, 1));
ALTER TABLE ord_transfer_leg ADD COLUMN min_vehicle_seats INTEGER CHECK (min_vehicle_seats IS NULL OR min_vehicle_seats BETWEEN 1 AND 100);

-- van-chuyen (A3): dấu Quản trị / Toàn quyền phá lệ cam kết. Khoá chỉ để SO (chuỗi nối id và con số, không tên, không tiền), không bao giờ hiển thị.
-- Cột lý do và khoá đi CẶP: có cả hai hoặc không có cả hai. Chuyến đã kết thúc / huỷ không sửa được (trigger vc_trip_final_frozen, LC-06, có sẵn).
ALTER TABLE vc_trip ADD COLUMN commitment_override_reason_code TEXT REFERENCES vc_reason(code);
ALTER TABLE vc_trip ADD COLUMN commitment_override_key TEXT
  CHECK ((commitment_override_key IS NULL) = (commitment_override_reason_code IS NULL)
         AND (commitment_override_key IS NULL OR length(commitment_override_key) BETWEEN 3 AND 4000));
