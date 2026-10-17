-- ADR-0129 Q4 = (a) (chủ dự án duyệt 2026-10-17): tài xế CÔNG TY (không thuộc nhà xe nào) được lái xe của NHÀ XE thuê. Chiều ngược giữ nguyên: tài xế nhà xe không lái xe công ty
-- và không lái xe nhà xe khác. Hạng bằng lái và giấy tờ xe vẫn do máy chủ (kiemLai) và cổng xuất bến giữ; chuyến mang cảnh báo CHEO_XE_TAI_XE ở lịch chung.
-- CHỈ thay hai trigger của LC-13 (0042): vc_trip_driver_carrier_ins và vc_trip_vehicle_carrier_upd. Không đụng dữ liệu, không đổi cột. Hoàn tác: chạy lại hai câu CREATE TRIGGER của 0042.
-- "Tài xế công ty đang mở vai DRIVER_INTERNAL" vẫn chỉ máy chủ giữ (taiXeChoDieuPhoi — R-P8), như phía xe công ty từ trước; CSDL chỉ biết "không thuộc nhà xe nào".

DROP TRIGGER IF EXISTS vc_trip_driver_carrier_ins;
CREATE TRIGGER vc_trip_driver_carrier_ins BEFORE INSERT ON vc_trip_driver
WHEN NEW.valid_to_at IS NULL AND (
  (EXISTS (SELECT 1 FROM vc_trip t JOIN v_pty_carrier c ON c.party_id = t.carrier_party_id WHERE t.id = NEW.trip_id)
    AND NOT EXISTS (SELECT 1 FROM vc_trip t JOIN v_pty_carrier_driver cd ON cd.carrier_party_id = t.carrier_party_id
                     WHERE t.id = NEW.trip_id AND cd.driver_party_id = NEW.driver_party_id)
    AND EXISTS (SELECT 1 FROM v_pty_carrier_driver cd WHERE cd.driver_party_id = NEW.driver_party_id))
  OR (NOT EXISTS (SELECT 1 FROM vc_trip t JOIN v_pty_carrier c ON c.party_id = t.carrier_party_id WHERE t.id = NEW.trip_id)
    AND EXISTS (SELECT 1 FROM v_pty_carrier_driver cd WHERE cd.driver_party_id = NEW.driver_party_id)))
BEGIN SELECT RAISE(ABORT, 'lc13_cross: tài xế không thuộc chủ của xe'); END;

DROP TRIGGER IF EXISTS vc_trip_vehicle_carrier_upd;
CREATE TRIGGER vc_trip_vehicle_carrier_upd BEFORE UPDATE OF vehicle_id, carrier_party_id ON vc_trip
WHEN (NEW.vehicle_id IS NOT OLD.vehicle_id OR NEW.carrier_party_id IS NOT OLD.carrier_party_id) AND (
  NEW.carrier_party_id IS NOT (SELECT owner_party_id FROM vc_vehicle WHERE id = NEW.vehicle_id)
  OR (EXISTS (SELECT 1 FROM v_pty_carrier c WHERE c.party_id = NEW.carrier_party_id)
    AND EXISTS (SELECT 1 FROM vc_trip_driver d WHERE d.trip_id = NEW.id AND d.valid_to_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM v_pty_carrier_driver cd WHERE cd.carrier_party_id = NEW.carrier_party_id AND cd.driver_party_id = d.driver_party_id)
      AND EXISTS (SELECT 1 FROM v_pty_carrier_driver cd2 WHERE cd2.driver_party_id = d.driver_party_id)))
  OR (NOT EXISTS (SELECT 1 FROM v_pty_carrier c WHERE c.party_id = NEW.carrier_party_id)
    AND EXISTS (SELECT 1 FROM vc_trip_driver d JOIN v_pty_carrier_driver cd ON cd.driver_party_id = d.driver_party_id
                 WHERE d.trip_id = NEW.id AND d.valid_to_at IS NULL)))
BEGIN SELECT RAISE(ABORT, 'lc13_cross: tài xế không thuộc chủ của xe mới'); END;
