-- Migration 0177 — SỐ SÊ-RI CỦA VÉ, DẤU HUỶ VÉ, CỜ NHẬP TAY (ADR-0217 Đ1, Đ2, Đ3; kế hoạch docs/superpowers/plans/2026-11-17-so-seri-ve-thi-cong.md A1).
-- (1) `vdt_serial` (chỉ thêm, ở lại): sổ cấp số sê-ri `VE_` + 8 chữ hoa ngẫu nhiên (Hiến chương 5.26). Số KHÔNG bí mật. Không xoá, không sửa: số đã cấp là của vé đó mãi mãi,
--     kể cả vé đã huỷ hay đã rút. Vé Tour Đảo cần số TRƯỚC khi vẽ ảnh nên số được cấp lúc mở lô và chèn vé sau; số cấp mà chưa có vé vẫn ở sổ.
-- (2) `vdt_ticket` thêm `serial` (duy nhất, không đổi sau khi có), `voided_at`/`voided_by`/`void_reason` (dấu huỷ vé, ghi MỘT lần, chỉ khi `status = 'VOID'`, lý do 5–300 ký tự).
--     Vé đã có được gán số ngay trong tệp này bằng SQL. Vé chèn có số thì số phải nằm sẵn trong sổ và cùng lô. Vé chèn KHÔNG mang số (đường cũ, bài thử chèn thẳng) được trigger
--     cấp số và ghi sổ ngay sau khi chèn, để mọi vé luôn có số; mã ứng dụng luôn truyền số do máy chủ cấp (Tour Đảo: bắt buộc, ở route).
-- (3) `vdt_scan` thêm `nhap_tay` (lượt quét do gõ số sê-ri, bất biến như các cột khác): trigger `vdt_scan_only_void` dựng lại, nguyên văn 0155 thêm cột mới.
-- Số 0177: 0174–0176 đang ở các nhánh đăng ký tài khoản chưa gộp (kiểm 17/11).
-- HOÀN TÁC: D1 không có «down». Bảng và cột thừa không ảnh hưởng mã cũ (mã cũ không đọc chúng); vé đã có số và dấu huỷ thì không bỏ cột, chỉ dừng dùng.

CREATE TABLE vdt_serial (
  serial     TEXT PRIMARY KEY CHECK (serial GLOB 'VE_[A-Z][A-Z][A-Z][A-Z][A-Z][A-Z][A-Z][A-Z]'),
  batch_id   TEXT NOT NULL REFERENCES vdt_batch (id),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE INDEX vdt_serial_batch_ix ON vdt_serial (batch_id);
CREATE TRIGGER vdt_serial_no_delete BEFORE DELETE ON vdt_serial
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: số sê-ri đã cấp không xoá được'); END;
CREATE TRIGGER vdt_serial_no_update BEFORE UPDATE ON vdt_serial
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: số sê-ri đã cấp không sửa được'); END;

ALTER TABLE vdt_ticket ADD COLUMN serial TEXT;
ALTER TABLE vdt_ticket ADD COLUMN voided_at TEXT;
ALTER TABLE vdt_ticket ADD COLUMN voided_by TEXT;
ALTER TABLE vdt_ticket ADD COLUMN void_reason TEXT;

-- Gán số cho vé đã có (mỗi chữ một lần gọi `random()` nên mỗi vé một số khác nhau), rồi ghi sổ. Trigger bảo vệ số được dựng SAU bước này.
UPDATE vdt_ticket SET serial = 'VE_'
  || char(65 + abs(random()) % 26) || char(65 + abs(random()) % 26) || char(65 + abs(random()) % 26) || char(65 + abs(random()) % 26)
  || char(65 + abs(random()) % 26) || char(65 + abs(random()) % 26) || char(65 + abs(random()) % 26) || char(65 + abs(random()) % 26)
  WHERE serial IS NULL;
INSERT INTO vdt_serial (serial, batch_id, created_at, created_by, updated_at, updated_by)
  SELECT serial, batch_id, created_at, created_by, created_at, created_by FROM vdt_ticket;
CREATE UNIQUE INDEX vdt_ticket_serial_uq ON vdt_ticket (serial);

-- Số đã mang thì phải có sẵn trong sổ, đúng lô của vé.
CREATE TRIGGER vdt_ticket_serial_insert BEFORE INSERT ON vdt_ticket
WHEN NEW.serial IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vdt_serial s WHERE s.serial = NEW.serial AND s.batch_id = NEW.batch_id)
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: số sê-ri của vé phải do máy chủ cấp sẵn cho đúng lô'); END;
-- Vé chèn không mang số: cấp số rồi ghi sổ (đường dự phòng; không bao giờ để vé không số).
CREATE TRIGGER vdt_ticket_serial_fill AFTER INSERT ON vdt_ticket
WHEN NEW.serial IS NULL
BEGIN
  UPDATE vdt_ticket SET serial = 'VE_'
    || char(65 + abs(random()) % 26) || char(65 + abs(random()) % 26) || char(65 + abs(random()) % 26) || char(65 + abs(random()) % 26)
    || char(65 + abs(random()) % 26) || char(65 + abs(random()) % 26) || char(65 + abs(random()) % 26) || char(65 + abs(random()) % 26)
    WHERE id = NEW.id;
  INSERT INTO vdt_serial (serial, batch_id, created_at, created_by, updated_at, updated_by)
    SELECT t.serial, t.batch_id, t.created_at, t.created_by, t.created_at, t.created_by FROM vdt_ticket t WHERE t.id = NEW.id;
END;
CREATE TRIGGER vdt_ticket_serial_keep BEFORE UPDATE OF serial ON vdt_ticket
WHEN OLD.serial IS NOT NULL AND NEW.serial IS NOT OLD.serial
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: số sê-ri của vé không đổi'); END;

-- Dấu huỷ vé: ghi MỘT lần, cùng lúc vé sang VOID, kèm lý do 5–300 ký tự. Vé mới vào kho không mang dấu huỷ.
CREATE TRIGGER vdt_ticket_void_insert BEFORE INSERT ON vdt_ticket
WHEN NEW.voided_at IS NOT NULL OR NEW.voided_by IS NOT NULL OR NEW.void_reason IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: vé mới vào kho không mang dấu huỷ'); END;
CREATE TRIGGER vdt_ticket_void_stamp BEFORE UPDATE OF voided_at, voided_by, void_reason ON vdt_ticket
WHEN (NEW.voided_at IS NOT OLD.voided_at OR NEW.voided_by IS NOT OLD.voided_by OR NEW.void_reason IS NOT OLD.void_reason)
  AND (OLD.voided_at IS NOT NULL OR NEW.voided_at IS NULL OR NEW.status <> 'VOID' OR NEW.void_reason IS NULL OR length(NEW.void_reason) NOT BETWEEN 5 AND 300)
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: dấu huỷ vé ghi một lần, cùng lúc vé sang VOID, lý do 5–300 ký tự'); END;

-- Lượt quét: thêm cờ gõ tay; trigger bất biến dựng lại nguyên văn 0155, thêm `nhap_tay`.
ALTER TABLE vdt_scan ADD COLUMN nhap_tay INTEGER NOT NULL DEFAULT 0 CHECK (nhap_tay IN (0, 1));
DROP TRIGGER vdt_scan_only_void;
CREATE TRIGGER vdt_scan_only_void BEFORE UPDATE ON vdt_scan
WHEN NEW.id IS NOT OLD.id OR NEW.ticket_id IS NOT OLD.ticket_id OR NEW.allocation_id IS NOT OLD.allocation_id OR NEW.order_id IS NOT OLD.order_id
  OR NEW.order_service_id IS NOT OLD.order_service_id OR NEW.ket_qua IS NOT OLD.ket_qua OR NEW.ly_do IS NOT OLD.ly_do OR NEW.so_khach IS NOT OLD.so_khach
  OR NEW.xac_nhan_lech_ngay IS NOT OLD.xac_nhan_lech_ngay OR NEW.xac_nhan_chua_thu IS NOT OLD.xac_nhan_chua_thu OR NEW.xac_nhan_vuot_khach IS NOT OLD.xac_nhan_vuot_khach
  OR NEW.scanned_at IS NOT OLD.scanned_at OR NEW.scanned_by IS NOT OLD.scanned_by OR NEW.ve_doan IS NOT OLD.ve_doan OR NEW.nhap_tay IS NOT OLD.nhap_tay
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR OLD.voided_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: lượt quét chỉ được đóng dấu bỏ lượt, một lần; không sửa cột nào khác'); END;
