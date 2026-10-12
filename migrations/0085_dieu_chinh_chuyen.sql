-- ADR-0097 (accepted 2026-10-03 — "Duyệt ADR-0097 và ADR-0098"): SỰ KIỆN ĐIỀU CHỈNH CÓ LÝ DO cho chuyến xe. Gói A1, lộ trình 3/10 V3-B. Gỡ HT-03 phần "gỡ"
-- (xuất bến nhầm không thu hồi được), HT-04 (bấm nhầm "Đã đón" / "Khách đã huỷ" không sửa được). Không ghi đè: mỗi lần sửa sai là MỘT lô chỉ-thêm.
--
-- Cách thực hiện "đóng CORRECTED" theo lựa chọn (b) đã duyệt cùng ADR ("Cửa một chiều / hai chiều"): KHÔNG dựng lại vc_trip_allocation để thêm giá trị
-- close_reason — suất cũ đóng bằng giá trị sẵn có REMOVED trong lô có sự kiện CORRECTION (closed_cmd_id = dấu lệnh), suất thay thế mang cột mới
-- corrects_allocation_id trỏ về suất cũ.
--
-- Nội dung:
--   (1) Cột mới: vc_trip_allocation.corrects_allocation_id (bất biến — LC-04 dựng lại); vc_trip_event.reason_code (lý do của sự kiện điều chỉnh — nhóm DIEU_CHINH;
--       chọn cách thi công: ADR ghi "sự kiện CORRECTION (lý do, trạng thái trước → sau)", không cột sẵn nào chứa được — override_* gắn với phá lệ bằng CHECK).
--       Trạng thái trước → sau đọc từ hai suất (suất cũ giữ nguyên trạng thái khi đóng; suất thay thế mang trạng thái mới).
--   (2) Phạm vi sự kiện điều chỉnh (vc_trip_event_dieu_chinh_scope): CORRECTION / DEPARTURE_REVOKED chỉ trên chuyến ĐANG CHẠY, có lý do nhóm DIEU_CHINH;
--       CORRECTION trỏ một suất KHÁCH của chính chuyến; loại sự kiện khác không mang reason_code.
--   (3) LC-07 chuyến (ADR-0097 Đ4): thêm MỘT cạnh RUNNING → PLANNED, chỉ khi sự kiện của last_cmd_id là DEPARTURE_REVOKED của chính chuyến; trigger riêng
--       vc_trip_revoke_no_progress chặn khi đã có sự kiện tiến độ sau sự kiện DEPARTED cuối (thứ tự CHÈN — rowid; không tính DEPARTED / DEPARTURE_REVOKED).
--   (4) LC-15 (ADR-0097 Đ4): ngoại lệ thứ hai — lô CORRECTION đóng ĐÚNG suất của sự kiện (REMOVED) và mở MỘT suất thay thế cùng chặng, cùng người, cùng
--       điểm lên / xuống, added_after_departure = 1, trạng thái theo BẢNG ĐIỀU CHỈNH của ADR-0097 Đ2.4 (kể cả điều kiện "điểm chưa DONE") — luật lõi ở CẢ
--       trigger lẫn máy chủ (src/shared/dieu-chinh-suat.ts).
--   (5) Câu chốt cuối lô (TRIP_CHOT `SET version = version`): vc_trip_correction_balance kiểm "đóng đúng một, mở đúng một suất trỏ về suất đã đóng";
--       vc_trip_stop_changed_balance (0076) dựng lại CHỈ cho lô ALLOCATION_STOP_CHANGED (hôm nay chỉ lô đó dùng câu chốt ⇒ tương đương) — không thì lô điều chỉnh
--       (suất mở cùng dấu lệnh, suất cũ đóng REMOVED) bị nó chặn nhầm.
--   (6) Nhóm lý do DIEU_CHINH (Đ2.5, danh sách đóng, không ô chữ tự do): Bấm nhầm, Khách đổi ý tại điểm, Khác (dòng cuối — luật gieo G4).
--
-- Không có down migration (P1, chỉ thêm tệp). HOÀN TÁC: migration MỚI — DROP ba trigger mới (vc_trip_event_dieu_chinh_scope, vc_trip_revoke_no_progress,
-- vc_trip_correction_balance) và tạo lại năm trigger dựng lại ở đây theo đúng thân của 0042 (vc_trip_status_forward) / 0076 (vc_trip_allocation_identity,
-- vc_trip_running_locked_alloc_ins, vc_trip_running_locked_alloc_close, vc_trip_stop_changed_balance); hai cột mới để nguyên (NULL ở mọi dòng cũ); ba lý do
-- DIEU_CHINH ngưng ở màn Lý do điều phối. Dữ liệu đã ghi bằng lệnh mới là chỉ-thêm (một chiều) — hoàn tác luật không xoá được sự kiện / suất thay thế. Hoặc
-- khôi phục cả D1 bằng Time Travel về điểm trước lần áp.

-- ---- (1) Cột mới -----------------------------------------------------------------------------------------------------------------------------------------
ALTER TABLE vc_trip_allocation ADD COLUMN corrects_allocation_id TEXT REFERENCES vc_trip_allocation(id);
ALTER TABLE vc_trip_event ADD COLUMN reason_code TEXT REFERENCES vc_reason(code);

DROP TRIGGER vc_trip_allocation_identity;
CREATE TRIGGER vc_trip_allocation_identity BEFORE UPDATE ON vc_trip_allocation
WHEN NEW.id IS NOT OLD.id OR NEW.trip_id IS NOT OLD.trip_id OR NEW.kind IS NOT OLD.kind OR NEW.leg_id IS NOT OLD.leg_id
  OR NEW.crew_party_id IS NOT OLD.crew_party_id OR NEW.board_stop_id IS NOT OLD.board_stop_id OR NEW.alight_stop_id IS NOT OLD.alight_stop_id
  OR NEW.valid_from_at IS NOT OLD.valid_from_at OR NEW.added_after_departure IS NOT OLD.added_after_departure OR NEW.opened_cmd_id IS NOT OLD.opened_cmd_id
  OR NEW.corrects_allocation_id IS NOT OLD.corrects_allocation_id
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'lc04_identity: không đổi chuyến, chặng, điểm lên / xuống của suất — đổi điểm thì đóng suất và mở suất mới'); END;

-- ---- (2) Phạm vi sự kiện điều chỉnh ----------------------------------------------------------------------------------------------------------------------
CREATE TRIGGER vc_trip_event_dieu_chinh_scope BEFORE INSERT ON vc_trip_event
WHEN (NEW.kind IN ('CORRECTION', 'DEPARTURE_REVOKED') AND (
        NEW.reason_code IS NULL OR (SELECT reason_group FROM vc_reason WHERE code = NEW.reason_code) IS NOT 'DIEU_CHINH'
        OR (SELECT status FROM vc_trip WHERE id = NEW.trip_id) IS NOT 'RUNNING'))
  OR (NEW.kind = 'CORRECTION' AND (NEW.allocation_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM vc_trip_allocation a WHERE a.id = NEW.allocation_id AND a.trip_id = NEW.trip_id AND a.kind = 'PASSENGER' AND a.valid_to_at IS NULL)))
  OR (NEW.kind NOT IN ('CORRECTION', 'DEPARTURE_REVOKED') AND NEW.reason_code IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'dc_scope: điều chỉnh chỉ trên chuyến đang chạy, có lý do nhóm Điều chỉnh, trỏ một suất khách đang mở của chính chuyến'); END;

-- ---- (3) LC-07 chuyến: cạnh RUNNING → PLANNED có điều kiện ------------------------------------------------------------------------------------------------
DROP TRIGGER vc_trip_status_forward;
CREATE TRIGGER vc_trip_status_forward BEFORE UPDATE OF status ON vc_trip
WHEN NEW.status IS NOT OLD.status
  AND NOT ((OLD.status = 'PLANNED' AND NEW.status IN ('RUNNING', 'CANCELLED')) OR (OLD.status = 'RUNNING' AND NEW.status IN ('ENDED', 'ENDED_INTERRUPTED'))
        OR (OLD.status = 'RUNNING' AND NEW.status = 'PLANNED'
            AND EXISTS (SELECT 1 FROM vc_trip_event e WHERE e.id = NEW.last_cmd_id AND e.trip_id = NEW.id AND e.kind = 'DEPARTURE_REVOKED')))
BEGIN SELECT RAISE(ABORT, 'lc07_forward: trạng thái chuyến chỉ đi tiến'); END;
-- Đ3.2: chưa có sự kiện tiến độ nào sau lô xuất bến. "Sau" = chèn sau (rowid) sự kiện DEPARTED cuối của chuyến; sự kiện của chính lô thu hồi, sự kiện DEPARTED
-- và DEPARTURE_REVOKED không tính (lần thu hồi trước + xuất bến lại cùng mili-giây không chặn nhầm). Máy chủ kiểm cùng luật trước (lenhThuHoiXuatBen).
CREATE TRIGGER vc_trip_revoke_no_progress BEFORE UPDATE OF status ON vc_trip
WHEN OLD.status = 'RUNNING' AND NEW.status = 'PLANNED' AND EXISTS (
  SELECT 1 FROM vc_trip_event x WHERE x.trip_id = NEW.id AND x.id <> NEW.last_cmd_id AND x.kind NOT IN ('DEPARTED', 'DEPARTURE_REVOKED')
     AND x.rowid > (SELECT max(d.rowid) FROM vc_trip_event d WHERE d.trip_id = NEW.id AND d.kind = 'DEPARTED'))
BEGIN SELECT RAISE(ABORT, 'dc_revoke_progress: chuyến đã có tiến độ sau xuất bến — không thu hồi được'); END;

-- ---- (4) LC-15 dựng lại: ngoại lệ thứ hai (lô CORRECTION) -------------------------------------------------------------------------------------------------
-- Chèn: suất thay thế trỏ ĐÚNG suất của sự kiện (corrects_allocation_id = allocation_id của sự kiện mang dấu lệnh hiện hành), suất đó vừa đóng REMOVED cùng
-- dấu lệnh, cùng chặng / người / điểm lên / điểm xuống, trạng thái mới theo bảng Đ2.4 (kể cả "điểm lên / xuống chưa DONE"). Chuyến không chạy: không ai chèn
-- suất mang corrects_allocation_id. Đóng: lô CORRECTION chỉ đóng ĐÚNG suất khách của sự kiện, bằng REMOVED, dấu lệnh hiện hành.
DROP TRIGGER vc_trip_running_locked_alloc_ins;
CREATE TRIGGER vc_trip_running_locked_alloc_ins BEFORE INSERT ON vc_trip_allocation
WHEN ((SELECT status FROM vc_trip WHERE id = NEW.trip_id) = 'RUNNING' AND NOT (
        NEW.added_after_departure = 1 AND NEW.kind = 'PASSENGER' AND NEW.opened_cmd_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
                     WHERE t.id = NEW.trip_id AND t.last_cmd_id = NEW.opened_cmd_id AND (
                       (e.kind = 'STOP_ADDED_RUNNING' AND NEW.corrects_allocation_id IS NULL)
                       OR (e.kind = 'ALLOCATION_STOP_CHANGED' AND NEW.corrects_allocation_id IS NULL AND EXISTS (
                             SELECT 1 FROM vc_trip_allocation c WHERE c.trip_id = NEW.trip_id AND c.leg_id IS NEW.leg_id AND c.passenger_key IS NEW.passenger_key
                               AND c.close_reason = 'STOP_CHANGED' AND c.closed_cmd_id = NEW.opened_cmd_id))
                       OR (e.kind = 'CORRECTION' AND NEW.corrects_allocation_id IS e.allocation_id AND EXISTS (
                             SELECT 1 FROM vc_trip_allocation c WHERE c.id = NEW.corrects_allocation_id AND c.trip_id = NEW.trip_id AND c.kind = 'PASSENGER'
                               AND c.leg_id IS NEW.leg_id AND c.passenger_key IS NEW.passenger_key AND c.board_stop_id IS NEW.board_stop_id
                               AND c.alight_stop_id IS NEW.alight_stop_id AND c.close_reason = 'REMOVED' AND c.closed_cmd_id = NEW.opened_cmd_id
                               AND ((c.status = 'BOARDED' AND NEW.status = 'WAITING'
                                       AND (SELECT s.status FROM vc_trip_stop s WHERE s.id = c.board_stop_id) IS NOT 'DONE')
                                 OR (c.status = 'BOARDED' AND NEW.status IN ('NO_SHOW', 'CANCELLED_AT_STOP'))
                                 OR (c.status = 'CANCELLED_AT_STOP' AND NEW.status IN ('BOARDED', 'NO_SHOW'))
                                 OR (c.status IN ('CANCELLED_AT_STOP', 'NO_SHOW') AND NEW.status = 'WAITING'
                                       AND (SELECT s.status FROM vc_trip_stop s WHERE s.id = c.board_stop_id) IS NOT 'DONE')
                                 OR (c.status = 'NO_SHOW' AND NEW.status = 'CANCELLED_AT_STOP')
                                 OR (c.status = 'DROPPED' AND NEW.status = 'BOARDED'
                                       AND (SELECT s.status FROM vc_trip_stop s WHERE s.id = c.alight_stop_id) IS NOT 'DONE'))))))))
  OR ((SELECT status FROM vc_trip WHERE id = NEW.trip_id) <> 'RUNNING' AND (NEW.added_after_departure = 1 OR NEW.corrects_allocation_id IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'lc15_running: xe đang chạy — chỉ thêm khách bằng lệnh Thêm điểm, Cập nhật điểm theo đơn hoặc Điều chỉnh của văn phòng'); END;
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
  AND NOT (NEW.close_reason = 'REMOVED' AND OLD.kind = 'PASSENGER'
           AND EXISTS (SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
                        WHERE t.id = NEW.trip_id AND e.kind = 'CORRECTION' AND e.allocation_id = OLD.id AND NEW.closed_cmd_id = t.last_cmd_id))
BEGIN SELECT RAISE(ABORT, 'lc15_running: xe đang chạy — không rút khách (chỉ đổi điểm cho khách đang chờ ở điểm chưa tới, hoặc điều chỉnh của văn phòng)'); END;

-- ---- (5) Câu chốt cuối lô --------------------------------------------------------------------------------------------------------------------------------
DROP TRIGGER vc_trip_stop_changed_balance;
CREATE TRIGGER vc_trip_stop_changed_balance AFTER UPDATE OF version ON vc_trip
WHEN NEW.version = OLD.version AND EXISTS (SELECT 1 FROM vc_trip_event k WHERE k.id = NEW.last_cmd_id AND k.kind = 'ALLOCATION_STOP_CHANGED') AND EXISTS (
  SELECT 1 FROM vc_trip_allocation x
   WHERE x.trip_id = NEW.id AND ((x.close_reason = 'STOP_CHANGED' AND x.closed_cmd_id = NEW.last_cmd_id) OR x.opened_cmd_id = NEW.last_cmd_id)
     AND (SELECT count(*) FROM vc_trip_allocation c WHERE c.trip_id = NEW.id AND c.close_reason = 'STOP_CHANGED' AND c.closed_cmd_id = NEW.last_cmd_id
            AND c.leg_id IS x.leg_id AND c.passenger_key IS x.passenger_key)
      <> (SELECT count(*) FROM vc_trip_allocation o WHERE o.trip_id = NEW.id AND o.opened_cmd_id = NEW.last_cmd_id
            AND o.leg_id IS x.leg_id AND o.passenger_key IS x.passenger_key))
BEGIN SELECT RAISE(ABORT, 'd53a_balance: cập nhật điểm phải mở lại đúng mỗi khách vừa đóng, cùng chuyến, cùng chặng'); END;
CREATE TRIGGER vc_trip_correction_balance AFTER UPDATE OF version ON vc_trip
WHEN NEW.version = OLD.version AND EXISTS (SELECT 1 FROM vc_trip_event k WHERE k.id = NEW.last_cmd_id AND k.kind = 'CORRECTION') AND NOT (
  (SELECT count(*) FROM vc_trip_allocation c WHERE c.trip_id = NEW.id AND c.closed_cmd_id = NEW.last_cmd_id) = 1
  AND (SELECT count(*) FROM vc_trip_allocation o WHERE o.trip_id = NEW.id AND o.opened_cmd_id = NEW.last_cmd_id) = 1
  AND EXISTS (SELECT 1 FROM vc_trip_allocation o JOIN vc_trip_event k ON k.id = NEW.last_cmd_id
               WHERE o.trip_id = NEW.id AND o.opened_cmd_id = NEW.last_cmd_id AND o.corrects_allocation_id = k.allocation_id))
BEGIN SELECT RAISE(ABORT, 'dc_balance: điều chỉnh phải đóng đúng một suất và mở đúng một suất thay thế trỏ về nó'); END;

-- ---- (6) Lý do điều chỉnh (nhóm DIEU_CHINH) --------------------------------------------------------------------------------------------------------------
INSERT INTO vc_reason (code, reason_group, label, sort_order, created_at, updated_at) VALUES
  ('DIEU_CHINH_BAM_NHAM', 'DIEU_CHINH', 'Bấm nhầm', 1, '2026-10-08T00:00:00.000Z', '2026-10-08T00:00:00.000Z'),
  ('DIEU_CHINH_KHACH_DOI_Y', 'DIEU_CHINH', 'Khách đổi ý tại điểm', 2, '2026-10-08T00:00:00.000Z', '2026-10-08T00:00:00.000Z'),
  ('DIEU_CHINH_KHAC', 'DIEU_CHINH', 'Khác', 99, '2026-10-08T00:00:00.000Z', '2026-10-08T00:00:00.000Z');
