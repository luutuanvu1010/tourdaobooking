-- Migration 0157 — ADR-0193 (accepted 2026-11-09) mục 1: công tắc «Bắt buộc giờ đón cho đơn đối tác», module orders. CHỈ THÊM: một bảng mới, hai trigger mới; không đổi bảng, dòng nào đang có.
-- Số: ngày 10/11, `main` tới 0156 và không nhánh / worktree chưa gộp nào có 0157 trở lên ⇒ 0157.
-- Xây trên lỗ đang hở HC-5.19 (khoá `xay_tren_cho_phep_adr_0193` ở docs/quyen-hoan.json): bảng chỉ thêm, gieo MỘT dòng Bật = hành vi hôm nay, không chạm sổ tiền.
-- Khuôn `ord_partner_customer_policy` (0133): đổi = chèn dòng mới; dòng hiệu lực = `valid_from_at` lớn nhất ≤ lúc xét; không có dòng nào thì máy chủ coi là BẬT (`docBatBuocGioDon`).
-- 1 = Bật: đơn có đón của Đối tác mà lượt đầu chưa giờ ⇒ yêu cầu xác nhận chụp cờ «cần chốt giờ» (ADR-0154 Đ1.2, Đ1.3). 0 = Tắt: vẫn qua văn phòng xét, cờ = 0 (ADR-0193 câu (i)).
-- Chụp tại mốc: luật đọc công tắc lúc Gửi đơn; đổi công tắc sau đó không đổi cờ đã chụp. Không dữ liệu cá nhân (chỉ cờ 0/1, mốc giờ, id nhân viên).
CREATE TABLE ord_pickup_time_policy (
  id              TEXT PRIMARY KEY,
  required        INTEGER NOT NULL CHECK (required IN (0, 1)),
  valid_from_at   TEXT NOT NULL UNIQUE,
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
INSERT INTO ord_pickup_time_policy (id, required, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0157', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
CREATE TRIGGER ord_pickup_time_policy_no_update BEFORE UPDATE ON ord_pickup_time_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách bắt buộc giờ đón chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ord_pickup_time_policy_no_delete BEFORE DELETE ON ord_pickup_time_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách bắt buộc giờ đón không xoá'); END;
