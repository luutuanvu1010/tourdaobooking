-- Migration 0181 — ADR-0221 (accepted 2026-11-21) Đ1: công tắc «Đối tác không nhập nơi đón», module orders. CHỈ THÊM: một bảng mới, hai trigger mới; không đổi bảng, dòng nào đang có.
-- Số: ngày 21/11, nhánh này tới 0180; nhánh chưa gộp khác có 0178, 0179 (phí đón từ giá gốc), không nhánh / worktree nào có 0181 trở lên ⇒ 0181.
-- Xây trên lỗ đang hở HC-5.19 (khoá `xay_tren_cho_phep_adr_0221` ở docs/quyen-hoan.json): bảng chỉ thêm, gieo MỘT dòng Tắt = hành vi hôm nay, không chạm sổ tiền, không đổi `ord_transfer_leg`.
-- Khuôn `ord_pickup_time_policy` (0157): đổi = chèn dòng mới; dòng hiệu lực = `valid_from_at` lớn nhất ≤ lúc xét; không có dòng nào thì máy chủ coi là TẮT (`docKhongNhapNoiDon`).
-- 1 = Bật: tài khoản giữ quyền Đối tác lập / lưu nháp lượt chiều đi không có nơi đón ⇒ máy chủ ghi chữ tạm «(chưa ghi nơi đón)»; văn phòng điền nơi đón lúc «Còn vé».
-- 0 = Tắt: lượt thiếu nơi đón bị từ chối như trước (400). Cổng xác nhận `pickup_place_required` xét theo DỮ LIỆU lượt, không đọc bảng này.
-- Không dữ liệu cá nhân (chỉ cờ 0/1, mốc giờ, id nhân viên).
CREATE TABLE ord_partner_pickup_place_policy (
  id              TEXT PRIMARY KEY,
  khong_nhap      INTEGER NOT NULL CHECK (khong_nhap IN (0, 1)),
  valid_from_at   TEXT NOT NULL UNIQUE,
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
INSERT INTO ord_partner_pickup_place_policy (id, khong_nhap, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0181', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
CREATE TRIGGER ord_partner_pickup_place_policy_no_update BEFORE UPDATE ON ord_partner_pickup_place_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách đối tác không nhập nơi đón chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ord_partner_pickup_place_policy_no_delete BEFORE DELETE ON ord_partner_pickup_place_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách đối tác không nhập nơi đón không xoá'); END;
