-- Migration 0155 — LƯỢT QUÉT VÉ TOUR ĐẢO (ADR-0175 Đ3 mục 1, đặc tả docs/superpowers/specs/2026-11-05-ve-tour-dao-design.md §2.5; kế hoạch Task 10).
-- Chỉ THÊM bảng `vdt_scan` (chỉ thêm, ở lại): mỗi lượt quét có vé thật ghi một dòng; mã lạ và vé hãng ngoài KHÔNG ghi. Ba kết quả: DA_TINH (tính đã dùng), CHI_XEM, TU_CHOI.
-- «Vé đã dùng» = vé có lượt DA_TINH chưa bỏ; không thêm trạng thái vào `vdt_ticket`. Mã vé không bao giờ nằm ở bảng này (chỉ khoá `ticket_id`).
-- Số 0155: main đã có 0153_thanh_duoi_ghim và nhánh chưa gộp claude/vigilant-euler-751c3a giữ 0154_chinh_sach_giao_dien (kiểm 9/11).
-- CSDL chặn hai lượt DA_TINH chưa bỏ trên một vé từng khách (chỉ mục duy nhất một phần); vé đoàn (`ve_doan = 1`, kể cả lượt một khách) được chừa để quét nhiều đợt.
-- Bỏ lượt quét: chỉ ghi ba cột `voided_*` MỘT lần; mọi cột khác bất biến; không xoá.
-- HOÀN TÁC: bảng rỗng không ảnh hưởng mã cũ; đã có lượt thì không xoá, chỉ bỏ lượt (`voided_*`).

CREATE TABLE vdt_scan (
  id                  TEXT PRIMARY KEY,
  ticket_id           TEXT NOT NULL REFERENCES vdt_ticket (id),
  allocation_id       TEXT REFERENCES vdt_allocation (id),
  order_id            TEXT,
  order_service_id    TEXT,
  ket_qua             TEXT NOT NULL CHECK (ket_qua IN ('DA_TINH', 'CHI_XEM', 'TU_CHOI')),
  ly_do               TEXT,
  so_khach            INTEGER NOT NULL DEFAULT 1 CHECK (so_khach >= 1),
  xac_nhan_lech_ngay  INTEGER CHECK (xac_nhan_lech_ngay IN (0, 1)),
  xac_nhan_chua_thu   INTEGER CHECK (xac_nhan_chua_thu IN (0, 1)),
  xac_nhan_vuot_khach INTEGER CHECK (xac_nhan_vuot_khach IN (0, 1)),
  scanned_at          TEXT NOT NULL,
  scanned_by          TEXT,
  voided_at           TEXT,
  voided_by           TEXT,
  void_reason         TEXT,
  ve_doan             INTEGER NOT NULL DEFAULT 0 CHECK (ve_doan IN (0, 1)),
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  CHECK ((voided_at IS NULL) = (void_reason IS NULL))
);
CREATE INDEX vdt_scan_ticket_ix ON vdt_scan (ticket_id);
CREATE INDEX vdt_scan_service_ix ON vdt_scan (order_service_id);
CREATE INDEX vdt_scan_by_ix ON vdt_scan (scanned_by, scanned_at);
-- Hàng rào chống tính trùng (P16: bài canh tranh phải đỏ khi bỏ chỉ mục này): một vé từng khách chỉ một lượt DA_TINH chưa bỏ.
CREATE UNIQUE INDEX vdt_scan_mot_lan ON vdt_scan (ticket_id) WHERE ket_qua = 'DA_TINH' AND voided_at IS NULL AND ve_doan = 0;
CREATE TRIGGER vdt_scan_no_delete BEFORE DELETE ON vdt_scan
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: lượt quét vé không xoá được — bỏ lượt quét'); END;
-- Chỉ ba cột `voided_*` được đặt, MỘT lần (dòng đã bỏ không sửa nữa); mọi cột khác, kể cả `ket_qua`, bất biến.
CREATE TRIGGER vdt_scan_only_void BEFORE UPDATE ON vdt_scan
WHEN NEW.id IS NOT OLD.id OR NEW.ticket_id IS NOT OLD.ticket_id OR NEW.allocation_id IS NOT OLD.allocation_id OR NEW.order_id IS NOT OLD.order_id
  OR NEW.order_service_id IS NOT OLD.order_service_id OR NEW.ket_qua IS NOT OLD.ket_qua OR NEW.ly_do IS NOT OLD.ly_do OR NEW.so_khach IS NOT OLD.so_khach
  OR NEW.xac_nhan_lech_ngay IS NOT OLD.xac_nhan_lech_ngay OR NEW.xac_nhan_chua_thu IS NOT OLD.xac_nhan_chua_thu OR NEW.xac_nhan_vuot_khach IS NOT OLD.xac_nhan_vuot_khach
  OR NEW.scanned_at IS NOT OLD.scanned_at OR NEW.scanned_by IS NOT OLD.scanned_by OR NEW.ve_doan IS NOT OLD.ve_doan
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR OLD.voided_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: lượt quét chỉ được đóng dấu bỏ lượt, một lần; không sửa cột nào khác'); END;
