-- 0150 — Tách nhiệm vụ mức (a) «đánh dấu, không chặn» (ADR-0187 Đ3, chủ duyệt 2026-11-08 «Duyệt, mức a»).
-- Đặc tả docs/superpowers/specs/2026-11-08-tach-nhiem-vu-muc-a-design.md. Số 0150: 0147–0149 đang ở nhánh khác chưa nhập (kiểm mọi nhánh 8/11).
-- CHỈ MỞ RỘNG: hai cột dấu nullable, một view công bố, một bảng sổ soát chỉ-thêm. Không sửa dữ liệu cũ. Tệp KHÔNG tự mở/đóng giao dịch. Không `CASE … END` trong trigger.

-- 1. Dấu «tự ghi đơn mình lập» trên dòng nhật ký: 1 hoặc NULL. Hàm ghi duy nhất `insertStatement` (module audit) điền tự động bằng truy vấn con:
--    hành động thuộc tập ghi tiền (HANH_DONG_GHI_TIEN ở src/shared/audit-actions.ts) VÀ người lập đơn (v_ord_order_owner) là staff_id của dòng.
ALTER TABLE audit_log ADD COLUMN tu_ghi_don_minh_lap INTEGER CHECK (tu_ghi_don_minh_lap IS NULL OR tu_ghi_don_minh_lap = 1);

-- 2. Dấu trên phiếu sổ (billing): 1 hoặc NULL. Mọi câu chèn phiếu điền tự động khi người gọi đi qua route của nhóm ghi tiền (cờ `ghiTien` của NguoiGoi) VÀ
--    người lập đơn là created_by. Phiếu nộp gộp nhiều đơn (order_id NULL) không mang dấu — dấu ở từng dòng nhật ký theo đơn.
ALTER TABLE bil_posting ADD COLUMN tu_ghi_don_minh_lap INTEGER CHECK (tu_ghi_don_minh_lap IS NULL OR tu_ghi_don_minh_lap = 1);

-- 3. View công bố của audit: dòng nhật ký có dấu — chỉ khoá (không detail), để billing dựng danh sách «Cần người thứ hai soát» và trigger dưới tra.
CREATE VIEW v_aud_tu_ghi AS
  SELECT id, order_id, staff_id, action, created_at FROM audit_log WHERE tu_ghi_don_minh_lap = 1;

-- 4. Sổ soát (billing, CHỈ-THÊM): mỗi dòng nhật ký có dấu được soát tối đa MỘT lần (khoá chính). Không tiền, không dữ liệu cá nhân.
--    Luật tiền ở CSDL (Hiến chương 5.1): chỉ soát dòng CÓ dấu, và người soát KHÁC người ghi (máy chủ kiểm trước, trigger kiểm lại).
CREATE TABLE bil_soat_tu_ghi (
  audit_id   TEXT PRIMARY KEY,
  order_id   TEXT REFERENCES orders(id),
  soat_boi   TEXT NOT NULL,
  soat_luc   TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE TRIGGER bil_soat_tu_ghi_khac_nguoi BEFORE INSERT ON bil_soat_tu_ghi
WHEN NOT EXISTS (SELECT 1 FROM v_aud_tu_ghi a WHERE a.id = NEW.audit_id AND a.staff_id IS NOT NEW.soat_boi)
BEGIN SELECT RAISE(ABORT, 'bil_soat_tu_ghi_khac_nguoi: chỉ soát được dòng có dấu tự ghi đơn mình lập, và người soát phải khác người ghi'); END;
CREATE TRIGGER bil_soat_tu_ghi_no_update BEFORE UPDATE ON bil_soat_tu_ghi
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dòng soát không sửa'); END;
CREATE TRIGGER bil_soat_tu_ghi_no_delete BEFORE DELETE ON bil_soat_tu_ghi
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dòng soát không xoá'); END;
