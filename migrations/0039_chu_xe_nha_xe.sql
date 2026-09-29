-- Migration 0039 — ADR-0048 D1, B1.1 (accepted 2026-09-28): chủ xe ∈ {công ty chủ đang hiệu lực, hồ sơ đang mở vai Nhà xe đối tác} lúc THÊM xe và lúc
-- ĐỔI chủ xe. Trigger của van-chuyen chỉ đọc VIEW công bố của parties (Hiến chương 5.3; cạnh van-chuyen → parties đã có). Xe cũ không bị chạm: công ty chủ
-- đổi sau này hay nhà xe thôi hợp tác KHÔNG làm xe cũ "sai" (chỉ canh lúc ghi). CHỈ THÊM.
CREATE TRIGGER vc_vehicle_owner_ins BEFORE INSERT ON vc_vehicle
WHEN NEW.owner_party_id NOT IN (SELECT party_id FROM v_pty_owner_company UNION SELECT party_id FROM v_pty_carrier)
BEGIN SELECT RAISE(ABORT, 'vehicle_owner_not_allowed: chủ xe phải là công ty chủ hoặc nhà xe đối tác đang hợp tác'); END;
-- "UPDATE OF" chạy cả khi câu SET nhắc cột mà KHÔNG đổi giá trị (đã thử) — vế IS NOT bắt buộc, không thì sửa tên xe của xe thuộc công ty chủ CŨ bị chặn.
CREATE TRIGGER vc_vehicle_owner_upd BEFORE UPDATE OF owner_party_id ON vc_vehicle
WHEN NEW.owner_party_id IS NOT OLD.owner_party_id
  AND NEW.owner_party_id NOT IN (SELECT party_id FROM v_pty_owner_company UNION SELECT party_id FROM v_pty_carrier)
BEGIN SELECT RAISE(ABORT, 'vehicle_owner_not_allowed: chủ xe phải là công ty chủ hoặc nhà xe đối tác đang hợp tác'); END;
