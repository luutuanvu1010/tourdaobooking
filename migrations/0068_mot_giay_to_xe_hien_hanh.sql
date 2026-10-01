-- ADR-0056 VK3-B (Q-L3-3 = a "Không cho, dùng Gia hạn"): mỗi xe, mỗi loại giấy tờ tối đa MỘT dòng hiện hành. Chỉ THÊM một trigger; KHÔNG sửa dữ liệu cũ
-- (dòng song song đã có: Quản trị huỷ bằng Sửa sai → Nhập nhầm cả dòng; R-VC-11 đếm). Chỉ canh dòng mới KHÔNG nối dòng nào (previous_id IS NULL): dòng gia
-- hạn đã có vc_vehicle_document_renew_ins + vc_vehicle_document_next_uq của 0033. Lớp route trả document_type_exists; lớp này RAISE
-- vehicle_document_type_current → loiRangBuocXe trả document_type_conflict (khuôn R15 ADR-0040: hai lớp, hai mã). Đoạn "hiện hành" là NGUYÊN VĂN HIEN_HANH
-- của src/modules/van-chuyen/repository.ts (bài giay-to-xe.test.ts so chữ). Không áp cho giấy tờ của người.
CREATE TRIGGER vc_vehicle_document_one_current BEFORE INSERT ON vc_vehicle_document
WHEN NEW.previous_id IS NULL AND EXISTS (
  SELECT 1 FROM vc_vehicle_document d
  WHERE d.vehicle_id = NEW.vehicle_id AND d.document_type_code = NEW.document_type_code
    AND (d.voided_at IS NULL AND NOT EXISTS (SELECT 1 FROM vc_vehicle_document n WHERE n.previous_id = d.id AND n.voided_at IS NULL)))
BEGIN SELECT RAISE(ABORT, 'vehicle_document_type_current: xe đã có giấy tờ loại này đang dùng — gia hạn hoặc sửa sai'); END;
