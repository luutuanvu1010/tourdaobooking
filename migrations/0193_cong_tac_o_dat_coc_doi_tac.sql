-- Migration 0193 — ADR-0236 (đề xuất, lệnh chủ 26/11/2026: «1- bật lại đi … cho cả 2 tùy chọn này vào trong bảng điều khiển của Admin , Super Admin») Đ1, Đ2: công tắc «Ô khách đặt cọc cho đối tác», module orders.
-- CHỈ THÊM: một bảng mới, hai trigger mới; không đổi bảng, dòng nào đang có. Số: ngày 26/11, main tới 0192; không nhánh cục bộ nào có 0193 trở lên (kiểm bằng git ls-tree trên mọi nhánh) ⇒ 0193.
-- Khuôn `ord_partner_pickup_place_policy` (0181): đổi = chèn dòng mới; dòng hiệu lực = `valid_from_at` lớn nhất ≤ lúc xét; không có dòng nào thì máy chủ coi là BẬT (`docHienODatCoc` — lệnh chủ «bật lại»).
-- 1 = Bật: form Tạo đơn của tài khoản giữ quyền Đối tác có ô «Khách đặt cọc cho đối tác»; máy chủ nhận lời khai như ADR-0159 / ADR-0197.
-- 0 = Tắt: ô ẩn; tài khoản Đối tác gửi lời khai > 0 bị 409 `o_dat_coc_dang_tat`; thân không có khoá ⇒ giữ số đang lưu; lời khai đã lưu vẫn thành khoản thu tiền mặt khi xác nhận (ADR-0225 Đ1 mục 5).
-- Xây trên lỗ đang hở HC-5.19 (chưa diễn tập khôi phục): bảng chỉ thêm, không chạm sổ tiền, không đổi bảng `orders`. Không dữ liệu cá nhân (chỉ cờ 0/1, mốc giờ, id nhân viên).
CREATE TABLE ord_partner_deposit_field_policy (
  id              TEXT PRIMARY KEY,
  hien            INTEGER NOT NULL CHECK (hien IN (0, 1)),
  valid_from_at   TEXT NOT NULL UNIQUE,
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
INSERT INTO ord_partner_deposit_field_policy (id, hien, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0193', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
CREATE TRIGGER ord_partner_deposit_field_policy_no_update BEFORE UPDATE ON ord_partner_deposit_field_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách ô khách đặt cọc cho đối tác chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ord_partner_deposit_field_policy_no_delete BEFORE DELETE ON ord_partner_deposit_field_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách ô khách đặt cọc cho đối tác không xoá'); END;
