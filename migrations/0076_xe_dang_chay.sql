-- ADR-0052 D5 (lượt A-1, thu gọn — lời chủ 2026-10-02 chiều): XE ĐANG CHẠY. Kế hoạch `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-05-xe-dang-chay.md` Task 1.
-- Chỉ thêm cột + bỏ / tạo lại trigger của 0042 (0042 đã áp production từ bản 1.38 — không sửa tệp cũ, P1). KHÔNG bảng mới. Luật lõi ở CẢ trigger (đây) lẫn
-- máy chủ (`dieu-phoi-lenh.ts`). D4 (chuyển điểm giữa hai xe) HOÃN tới mốc: khi làm sẽ bỏ + tạo lại ba trigger LC-15 dưới đây thêm một lần (đường thứ tư
-- "đề nghị CONFIRMED", cột transfer_id) — lát này KHÔNG thêm transfer_id "để sẵn".
--
-- LC-15 MỚI (thay câu ADR-0049 "khoá hẳn"): chuyến RUNNING chỉ mở / đóng suất, thêm điểm qua BA đường có tên —
--   (1) D5.1 văn phòng thêm điểm / khách: sự kiện mang dấu lệnh hiện hành của chuyến = STOP_ADDED_RUNNING; suất mới added_after_departure = 1, điểm mới
--       added_while_running = 1;
--   (2) Kết thúc gián đoạn (giữ nguyên ADR-0049): đóng TRIP_INTERRUPTED khi sự kiện dấu lệnh = ENDED_INTERRUPTED;
--   (3) D5.3a cập nhật điểm theo đơn: sự kiện dấu lệnh = ALLOCATION_STOP_CHANGED; đóng STOP_CHANGED chỉ suất WAITING ở điểm lên PENDING (closed_cmd_id = dấu
--       lệnh) → mở lại cùng chuyến, cùng chặng, cùng người (opened_cmd_id = dấu lệnh) → CÂU CHỐT cuối lô (`UPDATE vc_trip SET version = version WHERE id = ?
--       AND last_cmd_id = ?`) kiểm "mỗi nhóm (chặng, người) số đóng = số mở cùng dấu lệnh, cùng chuyến" (trigger vc_trip_stop_changed_balance).
--   Báo huỷ (D5.2) chỉ đặt cờ office_cancel_*, không mở / đóng suất. Vẫn cấm: đổi xe, đổi tài xế, rút / dời suất (REMOVED, MOVED), STOP_CHANGED suất đã
--   BOARDED hoặc điểm đã tới.

-- ---- Cột mới ---------------------------------------------------------------------------------------------------------------------------------------------
-- Dấu lệnh mở / đóng suất (D5.3a): máy chủ ghi ở MỌI câu mở / đóng từ bản này (dòng cũ NULL). Đặt một lần: opened_cmd_id bất biến (LC-04 dưới); closed_cmd_id
-- chỉ có khi suất đã đóng (CHECK) và suất đã đóng không sửa được nữa (vc_trip_allocation_close_once của 0042).
ALTER TABLE vc_trip_allocation ADD COLUMN opened_cmd_id TEXT;
ALTER TABLE vc_trip_allocation ADD COLUMN closed_cmd_id TEXT CHECK (closed_cmd_id IS NULL OR valid_to_at IS NOT NULL);
-- Văn phòng báo huỷ một suất (D5.2): ba cột cùng có / cùng vắng (CHECK ở cột cuối — đã thử trên node:sqlite, Task 0 bước 6). Đặt MỘT lần, chỉ trên suất WAITING
-- đang mở của chuyến đang chạy, trong lô có sự kiện ALLOCATION_OFFICE_CANCELLED (trigger vc_trip_allocation_office_cancel_once).
ALTER TABLE vc_trip_allocation ADD COLUMN office_cancel_at TEXT;
ALTER TABLE vc_trip_allocation ADD COLUMN office_cancel_by TEXT;
ALTER TABLE vc_trip_allocation ADD COLUMN office_cancel_reason_code TEXT REFERENCES vc_reason(code)
  CHECK ((office_cancel_at IS NULL) = (office_cancel_reason_code IS NULL) AND (office_cancel_by IS NULL) = (office_cancel_reason_code IS NULL));
-- Điểm thêm khi xe đang chạy (D5.1, D5.3a). Bất biến (vc_trip_stop_identity dựng lại dưới).
ALTER TABLE vc_trip_stop ADD COLUMN added_while_running INTEGER NOT NULL DEFAULT 0 CHECK (added_while_running IN (0, 1));

-- ---- LC-04 dựng lại: thêm cột mới vào danh sách bất biến -------------------------------------------------------------------------------------------------
DROP TRIGGER vc_trip_stop_identity;
CREATE TRIGGER vc_trip_stop_identity BEFORE UPDATE ON vc_trip_stop
WHEN NEW.id IS NOT OLD.id OR NEW.trip_id IS NOT OLD.trip_id OR NEW.kind IS NOT OLD.kind OR NEW.location_id IS NOT OLD.location_id
  OR NEW.place_text IS NOT OLD.place_text OR NEW.place_key IS NOT OLD.place_key OR NEW.added_while_running IS NOT OLD.added_while_running
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'lc04_identity: không đổi chuyến, loại, nơi, khoá nơi, cờ thêm khi chạy của điểm dừng'); END;
DROP TRIGGER vc_trip_allocation_identity;
CREATE TRIGGER vc_trip_allocation_identity BEFORE UPDATE ON vc_trip_allocation
WHEN NEW.id IS NOT OLD.id OR NEW.trip_id IS NOT OLD.trip_id OR NEW.kind IS NOT OLD.kind OR NEW.leg_id IS NOT OLD.leg_id
  OR NEW.crew_party_id IS NOT OLD.crew_party_id OR NEW.board_stop_id IS NOT OLD.board_stop_id OR NEW.alight_stop_id IS NOT OLD.alight_stop_id
  OR NEW.valid_from_at IS NOT OLD.valid_from_at OR NEW.added_after_departure IS NOT OLD.added_after_departure OR NEW.opened_cmd_id IS NOT OLD.opened_cmd_id
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'lc04_identity: không đổi chuyến, chặng, điểm lên / xuống của suất — đổi điểm thì đóng suất và mở suất mới'); END;

-- ---- D5.2 báo huỷ: đặt MỘT lần, chỉ suất WAITING đang mở của chuyến đang chạy, trong lô "báo huỷ", lý do nhóm BAO_HUY_DIEM -----------------------------
CREATE TRIGGER vc_trip_allocation_office_cancel_once BEFORE UPDATE OF office_cancel_at, office_cancel_by, office_cancel_reason_code ON vc_trip_allocation
WHEN (OLD.office_cancel_at IS NOT NULL AND (NEW.office_cancel_at IS NOT OLD.office_cancel_at OR NEW.office_cancel_by IS NOT OLD.office_cancel_by
        OR NEW.office_cancel_reason_code IS NOT OLD.office_cancel_reason_code))
  OR (OLD.office_cancel_at IS NULL AND NEW.office_cancel_at IS NOT NULL AND (
        OLD.status <> 'WAITING' OR NEW.status <> 'WAITING' OR OLD.valid_to_at IS NOT NULL OR NEW.valid_to_at IS NOT NULL OR OLD.kind <> 'PASSENGER'
        OR (SELECT reason_group FROM vc_reason WHERE code = NEW.office_cancel_reason_code) IS NOT 'BAO_HUY_DIEM'
        OR NOT EXISTS (SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
                        WHERE t.id = NEW.trip_id AND t.status = 'RUNNING' AND e.kind = 'ALLOCATION_OFFICE_CANCELLED' AND e.allocation_id = NEW.id)))
BEGIN SELECT RAISE(ABORT, 'd52_office_cancel: báo huỷ chỉ đặt một lần, cho khách đang chờ trên xe đang chạy, lý do nhóm Báo huỷ điểm đón'); END;

-- ---- LC-15 dựng lại (ba đường có tên) ------------------------------------------------------------------------------------------------------------------
DROP TRIGGER vc_trip_running_locked_alloc_ins;
CREATE TRIGGER vc_trip_running_locked_alloc_ins BEFORE INSERT ON vc_trip_allocation
WHEN ((SELECT status FROM vc_trip WHERE id = NEW.trip_id) = 'RUNNING' AND NOT (
        NEW.added_after_departure = 1 AND NEW.kind = 'PASSENGER' AND NEW.opened_cmd_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
                     WHERE t.id = NEW.trip_id AND t.last_cmd_id = NEW.opened_cmd_id AND (
                       e.kind = 'STOP_ADDED_RUNNING'
                       OR (e.kind = 'ALLOCATION_STOP_CHANGED' AND EXISTS (
                             SELECT 1 FROM vc_trip_allocation c WHERE c.trip_id = NEW.trip_id AND c.leg_id IS NEW.leg_id AND c.passenger_key IS NEW.passenger_key
                               AND c.close_reason = 'STOP_CHANGED' AND c.closed_cmd_id = NEW.opened_cmd_id))))))
  OR ((SELECT status FROM vc_trip WHERE id = NEW.trip_id) <> 'RUNNING' AND NEW.added_after_departure = 1)
BEGIN SELECT RAISE(ABORT, 'lc15_running: xe đang chạy — chỉ thêm khách bằng lệnh Thêm điểm của văn phòng hoặc Cập nhật điểm theo đơn'); END;
DROP TRIGGER vc_trip_running_locked_alloc_close;
CREATE TRIGGER vc_trip_running_locked_alloc_close BEFORE UPDATE OF valid_to_at ON vc_trip_allocation
WHEN OLD.valid_to_at IS NULL AND NEW.valid_to_at IS NOT NULL
  AND (SELECT status FROM vc_trip WHERE id = NEW.trip_id) = 'RUNNING'
  AND NOT (NEW.close_reason = 'TRIP_INTERRUPTED' AND EXISTS (
             SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
              WHERE t.id = NEW.trip_id AND t.status = 'RUNNING' AND e.kind = 'ENDED_INTERRUPTED'))
  AND NOT (NEW.close_reason = 'STOP_CHANGED' AND OLD.status = 'WAITING' AND OLD.kind = 'PASSENGER'
           AND EXISTS (SELECT 1 FROM vc_trip_stop s WHERE s.id = OLD.board_stop_id AND s.status = 'PENDING')
           AND EXISTS (SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
                        WHERE t.id = NEW.trip_id AND e.kind = 'ALLOCATION_STOP_CHANGED' AND NEW.closed_cmd_id = t.last_cmd_id))
BEGIN SELECT RAISE(ABORT, 'lc15_running: xe đang chạy — không rút khách (chỉ đổi điểm cho khách đang chờ ở điểm chưa tới)'); END;
DROP TRIGGER vc_trip_running_locked_stop_ins;
CREATE TRIGGER vc_trip_running_locked_stop_ins BEFORE INSERT ON vc_trip_stop
WHEN ((SELECT status FROM vc_trip WHERE id = NEW.trip_id) = 'RUNNING' AND NOT (
        NEW.added_while_running = 1 AND EXISTS (SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
                                                 WHERE t.id = NEW.trip_id AND e.kind IN ('STOP_ADDED_RUNNING', 'ALLOCATION_STOP_CHANGED'))))
  OR ((SELECT status FROM vc_trip WHERE id = NEW.trip_id) <> 'RUNNING' AND NEW.added_while_running = 1)
BEGIN SELECT RAISE(ABORT, 'lc15_running: xe đang chạy — chỉ thêm điểm bằng lệnh Thêm điểm của văn phòng hoặc Cập nhật điểm theo đơn'); END;

-- ---- D5.3a câu chốt: mỗi nhóm (chặng, người — suất chưa tên: theo chặng) đóng STOP_CHANGED = mở cùng dấu lệnh, CÙNG chuyến --------------------------------
-- Chỉ câu chốt `SET version = version` (NEW.version = OLD.version) kích hoạt kiểm; câu cổng của mọi lệnh khác (`version + 1`) không bị bắt nhầm.
CREATE TRIGGER vc_trip_stop_changed_balance AFTER UPDATE OF version ON vc_trip
WHEN NEW.version = OLD.version AND EXISTS (
  SELECT 1 FROM vc_trip_allocation x
   WHERE x.trip_id = NEW.id AND ((x.close_reason = 'STOP_CHANGED' AND x.closed_cmd_id = NEW.last_cmd_id) OR x.opened_cmd_id = NEW.last_cmd_id)
     AND (SELECT count(*) FROM vc_trip_allocation c WHERE c.trip_id = NEW.id AND c.close_reason = 'STOP_CHANGED' AND c.closed_cmd_id = NEW.last_cmd_id
            AND c.leg_id IS x.leg_id AND c.passenger_key IS x.passenger_key)
      <> (SELECT count(*) FROM vc_trip_allocation o WHERE o.trip_id = NEW.id AND o.opened_cmd_id = NEW.last_cmd_id
            AND o.leg_id IS x.leg_id AND o.passenger_key IS x.passenger_key))
BEGIN SELECT RAISE(ABORT, 'd53a_balance: cập nhật điểm phải mở lại đúng mỗi khách vừa đóng, cùng chuyến, cùng chặng'); END;

-- ---- Lý do báo huỷ (nhóm BAO_HUY_DIEM — đã định trong NHOM_LY_DO; 0041 ghi "chưa gieo"). Ba lý do đúng chữ bản vẽ V11 "Báo huỷ một suất"; dòng cuối "Khác" (luật gieo G4 — bản vẽ ghi "Lý do khác") -----------------------
INSERT INTO vc_reason (code, reason_group, label, sort_order, created_at, updated_at) VALUES
  ('BAO_HUY_KHONG_DI', 'BAO_HUY_DIEM', 'Khách báo không đi', 1, '2026-10-05T00:00:00.000Z', '2026-10-05T00:00:00.000Z'),
  ('BAO_HUY_DOI_LICH', 'BAO_HUY_DIEM', 'Khách đổi lịch', 2, '2026-10-05T00:00:00.000Z', '2026-10-05T00:00:00.000Z'),
  ('BAO_HUY_KHONG_LIEN_LAC', 'BAO_HUY_DIEM', 'Khách không liên lạc được', 3, '2026-10-05T00:00:00.000Z', '2026-10-05T00:00:00.000Z'),
  ('BAO_HUY_KHAC', 'BAO_HUY_DIEM', 'Khác', 99, '2026-10-05T00:00:00.000Z', '2026-10-05T00:00:00.000Z');
