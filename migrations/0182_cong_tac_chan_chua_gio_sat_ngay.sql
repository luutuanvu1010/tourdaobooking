-- Migration 0182 — ADR-0227 (đề xuất 2026-11-21, việc 7 kế hoạch 16 việc) Đ1: công tắc «Chặn đơn chưa có giờ đón khi sát ngày đón», module orders. CHỈ THÊM: một bảng mới, hai trigger mới; không đổi bảng, dòng nào đang có.
-- Số: ngày 21/11, main tới 0181; không nhánh / worktree nào có 0182 trở lên (kiểm bằng git ls-tree trên mọi nhánh cục bộ) ⇒ 0182 (số do phiên điều phối giữ trước cho việc 7).
-- Xây trên lỗ đang hở HC-5.19: bảng chỉ thêm, gieo MỘT dòng Bật = hành vi hôm nay (ADR-0193 câu (ii)), không chạm sổ tiền, không đổi `ord_transfer_leg`. Khoá cho phép chờ chủ duyệt ADR-0227.
-- Khuôn `ord_pickup_time_policy` (0157): đổi = chèn dòng mới; dòng hiệu lực = `valid_from_at` lớn nhất ≤ lúc xét; không có dòng nào thì máy chủ coi là BẬT (`docChanChuaGioSatNgay`).
-- 1 = Bật: lượt đón CHƯA giờ mà ngày đón đã vào hạn chốt ⇒ không xác nhận được (409 `chua_gio_sat_ngay`, vế SQL trong `ORDER_CONFIRM`) — đúng ADR-0193 câu (ii).
-- 0 = Tắt: bỏ chặn đó; cổng hạn chốt / Đặt gấp cho lượt ĐÃ có giờ và điều phối (không xếp xe cho lượt chưa giờ) giữ nguyên.
-- Không dữ liệu cá nhân (chỉ cờ 0/1, mốc giờ, id nhân viên).
CREATE TABLE ord_pickup_deadline_policy (
  id              TEXT PRIMARY KEY,
  chan            INTEGER NOT NULL CHECK (chan IN (0, 1)),
  valid_from_at   TEXT NOT NULL UNIQUE,
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
INSERT INTO ord_pickup_deadline_policy (id, chan, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0182', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
CREATE TRIGGER ord_pickup_deadline_policy_no_update BEFORE UPDATE ON ord_pickup_deadline_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách chặn đơn chưa có giờ đón chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ord_pickup_deadline_policy_no_delete BEFORE DELETE ON ord_pickup_deadline_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách chặn đơn chưa có giờ đón không xoá'); END;
