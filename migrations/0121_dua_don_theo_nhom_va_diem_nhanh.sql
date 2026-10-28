-- Migration 0121 — ĐƯA ĐÓN THEO NHÓM DỊCH VỤ VÀ ĐIỂM CHỌN NHANH (ADR-0118, chủ duyệt 2026-10-14; Đợt 2 lượt 1; kế hoạch docs/superpowers/plans/2026-10-14-dot-2-luot-1-ke-hoach.md Task 1).
-- Chỉ THÊM: hai cột và MỘT view. Không đổi `ord_transfer_leg`, không đụng tiền. Số 0121 (28/10, dựng lại nhánh 14/10 trên main): số tạm cũ 0098; main dừng ở 0120, không nhánh chưa gộp nào giữ số lớn hơn.
-- HOÀN TÁC: D1 không có bước "down". Muốn gỡ thì một migration SAU chạy `DROP VIEW v_ctl_service_transfer;` (mã `orders` phải bỏ đọc view ở bản phát hành TRƯỚC đó — expand–contract
-- hai lần phát hành); hai cột có thể để nguyên (mặc định 1 / NULL = như chưa có tính năng). Áp migration TRƯỚC khi triển khai mã đọc view (npm run trien-khai đã đúng thứ tự).

-- ===== catalog: cờ "Có đưa đón" của nhóm dịch vụ (Đ1). Mặc định BẬT cho mọi nhóm sẵn có và nhóm tạo sau; Quản trị tắt ở màn Danh mục. ====================================
ALTER TABLE ctl_group ADD COLUMN transfer_enabled INTEGER NOT NULL DEFAULT 1 CHECK (transfer_enabled IN (0, 1));

-- ===== catalog: view công bố cho `orders` (Đ2) — với mỗi mã dịch vụ trong danh mục, đưa đón có được ghi không. ==============================================================
-- Nguồn: nhóm HIỆN HÀNH của mã (v_ctl_service_group = dòng gán có seq lớn nhất) rồi cờ của nhóm đó.
--   - nhóm đang bật + cờ 0  → 0 (không đưa đón);
--   - Chưa phân loại (group_code NULL), chưa từng gán, hoặc nhóm đã NGƯNG DÙNG (active = 0) → 1. Nhóm ngưng dùng không còn dịch vụ (luật tắt nhóm của ADR-0058) nên chỉ là đáp án rõ ràng cho
--     dữ liệu sửa tay; CÙNG luật với `nhomChoForm` (dịch vụ của nhóm tắt coi như Chưa phân loại) để form (DTO) và máy chủ không bao giờ khác nhau.
-- Chỉ khoá + cờ; không tên nhóm. `orders` đọc view này, KHÔNG đọc `ctl_group` (bài src/orders-khong-doc-nhom-truc-tiep.test.ts).
CREATE VIEW v_ctl_service_transfer AS
  SELECT i.code AS catalog_code,
         CASE WHEN g.code IS NOT NULL AND g.active = 1 THEN g.transfer_enabled ELSE 1 END AS transfer_enabled
  FROM catalog_item i
  LEFT JOIN v_ctl_service_group sg ON sg.catalog_code = i.code
  LEFT JOIN ctl_group g ON g.code = sg.group_code;

-- ===== locations: thứ tự "Chọn nhanh" của địa điểm (Đ4). NULL = không chọn nhanh; 1–99 = hiện thành nút theo thứ tự. ================================================================
ALTER TABLE loc_location ADD COLUMN quick_pick_order INTEGER CHECK (quick_pick_order IS NULL OR quick_pick_order BETWEEN 1 AND 99);

-- Gieo hai điểm của chủ (ADR-0118 Đ4). `UPDATE … WHERE code = …` chạm 0 dòng nếu mã không còn — an toàn; Quản trị thêm / bỏ sau ở màn Địa điểm.
UPDATE loc_location SET quick_pick_order = 1 WHERE code = 'CANG_VINPEARL';
UPDATE loc_location SET quick_pick_order = 2 WHERE code = 'BEN_TAU_NHA_TRANG';
