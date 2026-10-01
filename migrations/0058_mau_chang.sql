-- Migration 0058 — MẪU CHẶNG THEO DỊCH VỤ ("dịch vụ đưa đón mấy chiều", ADR-0054 D10.1 — đã duyệt; chủ trả lời lần 17 Q-L4-A "Phần Vận chuyển") + NƠI TRẢ
-- MẶC ĐỊNH (ADR nháp docs/superpowers/specs/2026-10-01-de-xuat-adr-noi-tra-mac-dinh.md D1 — chủ duyệt 1/10 Q-D = A; số ADR chốt lúc gộp). Module van-chuyen
-- (bảng của nó). Kế hoạch docs/superpowers/plans/2026-10-01-may-chu-o-moi-chang-ke-hoach.md Task 6 + 7.2 (bảng chưa lên `main` ⇒ cột nơi trả vào CÙNG
-- `CREATE TABLE`, viết bằng `CHECK` bảng).
--
-- - CHỈ THÊM: mỗi lần Quản trị đổi là một dòng MỚI mang ĐỦ `mode`, `return_time_hint`, `default_dropoff_location_id`; dòng hiệu lực của một dịch vụ = dòng
--   `valid_from_at` lớn nhất đã tới; không có dòng = NONE (không đưa đón). Trigger cấm UPDATE / DELETE.
-- - `code`: mã dịch vụ của Danh mục — tham chiếu LOGIC, KHÔNG khoá ngoại (dòng Sheet có thể biến mất rồi quay lại; tiền lệ R-P19). van-chuyen KHÔNG đọc bảng
--   catalog. Đồng bộ Sheet 15 phút không chạm bảng này.
-- - `mode`: tập ĐÓNG, định trọn (CHECK). `return_time_hint` (HH:MM giờ VN) chỉ có khi hai chiều.
-- - `default_dropoff_location_id`: ĐIỂM danh mục (khoá ngoại `loc_location`, NO ACTION — khuôn vc_trip_stop.location_id của 0042; cạnh van-chuyen → locations
--   đã có) — nơi trả chiều đi, cũng là nơi đón chiều về (hàm thuần `changMacDinh`). Chỉ có nghĩa khi có đưa đón (NT-D1). "Đang dùng" kiểm ở route.
-- - Mẫu chỉ là GỢI Ý ở form (ADR-0054 D10.2): máy chủ không tự tạo chặng, không tự điền nơi trả, đổi mẫu không đổi đơn đã có.
CREATE TABLE vc_leg_template (
  id                          TEXT PRIMARY KEY,
  code                        TEXT NOT NULL CHECK (length(code) BETWEEN 1 AND 40),
  mode                        TEXT NOT NULL CHECK (mode IN ('NONE', 'ONE_WAY', 'ROUND_TRIP')),
  return_time_hint            TEXT CHECK (return_time_hint IS NULL OR (length(return_time_hint) = 5 AND return_time_hint GLOB '[0-2][0-9]:[0-5][0-9]' AND return_time_hint <= '23:59')),
  default_dropoff_location_id TEXT REFERENCES loc_location(id),
  valid_from_at               TEXT NOT NULL,
  created_at                  TEXT NOT NULL,
  created_by                  TEXT,
  updated_at                  TEXT NOT NULL,
  updated_by                  TEXT,
  UNIQUE (code, valid_from_at),
  CHECK (return_time_hint IS NULL OR mode = 'ROUND_TRIP'),
  CHECK (default_dropoff_location_id IS NULL OR mode <> 'NONE')
);
CREATE TRIGGER vc_leg_template_no_update BEFORE UPDATE ON vc_leg_template
BEGIN SELECT RAISE(ABORT, 'vc_leg_template_append_only: mẫu đưa đón chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER vc_leg_template_no_delete BEFORE DELETE ON vc_leg_template
BEGIN SELECT RAISE(ABORT, 'vc_leg_template_append_only: mẫu đưa đón không xoá'); END;
