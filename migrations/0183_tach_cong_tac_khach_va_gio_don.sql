-- Migration 0183 — ADR-0228 Đ1, Đ3: tách công tắc «Ẩn thông tin khách» (0133) làm hai; công tắc «Đơn đối tác không cần giờ đón». Module orders.
-- CHỈ THÊM: hai bảng mới, bốn trigger mới; không đổi bảng, dòng nào đang có. Số 0183 do phiên điều phối giữ trước (kế hoạch 16 việc 21/11).
-- Xây trên lỗ đang hở HC-5.19 (khoá `xay_tren_cho_phep_adr_0228` ở docs/quyen-hoan.json): bảng chỉ thêm, gieo giữ đúng hành vi hôm nay, không chạm sổ tiền.
-- Khuôn `ord_partner_pickup_place_policy` (0181): đổi = chèn dòng mới; dòng hiệu lực = `valid_from_at` lớn nhất ≤ lúc xét. Không dữ liệu cá nhân (chỉ cờ 0/1, mốc giờ, id nhân viên).

-- 1) «Đối tác không nhập danh sách hành khách» (ADR-0228 Đ1). 1 = Bật: tài khoản Đối tác thuần không có khối Hành khách; máy chủ bỏ khoá `passengers` khi lập / lưu nháp.
--    Gieo bằng ĐÚNG giá trị hiệu lực của công tắc cũ `ord_partner_customer_policy.hide_customer_info` lúc áp migration (hôm nay một công tắc ẩn cả hai khối) ⇒ phát hành không đổi gì.
--    Bảng cũ không có dòng nào (không xảy ra: 0133 gieo một dòng) ⇒ gieo 0. Không có dòng nào lúc đọc ⇒ máy chủ coi là TẮT (`docKhongNhapHanhKhach`).
CREATE TABLE ord_partner_passenger_policy (
  id              TEXT PRIMARY KEY,
  khong_nhap      INTEGER NOT NULL CHECK (khong_nhap IN (0, 1)),
  valid_from_at   TEXT NOT NULL UNIQUE,
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
INSERT INTO ord_partner_passenger_policy (id, khong_nhap, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES (
  'gieo-0183',
  COALESCE((SELECT hide_customer_info FROM ord_partner_customer_policy WHERE valid_from_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ORDER BY valid_from_at DESC LIMIT 1), 0),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL
);
CREATE TRIGGER ord_partner_passenger_policy_no_update BEFORE UPDATE ON ord_partner_passenger_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách đối tác không nhập danh sách hành khách chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ord_partner_passenger_policy_no_delete BEFORE DELETE ON ord_partner_passenger_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách đối tác không nhập danh sách hành khách không xoá'); END;

-- 2) «Đơn đối tác không cần giờ đón» (ADR-0228 Đ3). 1 = Bật: lúc Gửi đơn, lượt đầu có Đón chưa giờ KHÔNG còn là lý do đưa đơn sang văn phòng xét (trừ lượt đã vào hạn chốt — ADR-0193 (ii)).
--    0 = Tắt: như hôm nay (ADR-0154 Đ1.2 + công tắc «Bắt buộc giờ đón» 0157). Gieo MỘT dòng Tắt. Không có dòng nào lúc đọc ⇒ TẮT (`docKhongCanGioDon`).
CREATE TABLE ord_partner_pickup_time_optional_policy (
  id              TEXT PRIMARY KEY,
  khong_can       INTEGER NOT NULL CHECK (khong_can IN (0, 1)),
  valid_from_at   TEXT NOT NULL UNIQUE,
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
INSERT INTO ord_partner_pickup_time_optional_policy (id, khong_can, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0183', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
CREATE TRIGGER ord_partner_pickup_time_optional_policy_no_update BEFORE UPDATE ON ord_partner_pickup_time_optional_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách đơn đối tác không cần giờ đón chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ord_partner_pickup_time_optional_policy_no_delete BEFORE DELETE ON ord_partner_pickup_time_optional_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách đơn đối tác không cần giờ đón không xoá'); END;
