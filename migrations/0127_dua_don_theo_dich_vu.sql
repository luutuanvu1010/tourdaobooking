-- Migration 0127 — ĐƯA ĐÓN THEO TỪNG DỊCH VỤ, RIÊNG THẮNG CHUNG (ADR-0149 Đ1, chủ duyệt 2026-10-29; kế hoạch docs/superpowers/plans/2026-10-29-adr-0149-dua-don-theo-dich-vu-ke-hoach.md Task 1).
-- Chỉ THÊM một bảng và DỰNG LẠI view công bố `v_ctl_service_transfer` (cùng tên, cùng hai cột — `orders` đọc view này, mã `orders` không đổi cổng). Số 0127: main dừng ở 0126 (29/10),
-- không nhánh chưa gộp nào giữ số lớn hơn.
-- HOÀN TÁC: D1 không có bước "down". Muốn gỡ thì một migration SAU dựng lại view theo bản 0121 (bỏ phép nối bảng quy tắc); bảng có thể để nguyên (không dòng mở = theo nhóm).

-- ===== catalog: ô «Được đón không» của dịch vụ. Lịch sử chỉ thêm: đổi = đóng dòng mở (`valid_to_at`) rồi chèn dòng mới; «Theo nhóm» = KHÔNG có dòng mở. ===================
CREATE TABLE ctl_service_transfer_rule (
  id            TEXT PRIMARY KEY,
  service_code  TEXT NOT NULL REFERENCES catalog_item (code),
  mode          TEXT NOT NULL CHECK (mode IN ('ALWAYS', 'NEVER')),
  valid_from_at TEXT NOT NULL,
  valid_to_at   TEXT,
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT,
  CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at)
);
-- Tối đa MỘT dòng mở mỗi dịch vụ: view nối theo dòng mở nên không bao giờ nhân dòng; hai lệnh đua cùng mở dòng → lệnh sau bị chặn (→ 409).
CREATE UNIQUE INDEX ctl_service_transfer_rule_open ON ctl_service_transfer_rule (service_code) WHERE valid_to_at IS NULL;
CREATE TRIGGER ctl_service_transfer_rule_no_delete BEFORE DELETE ON ctl_service_transfer_rule
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: quy tắc đưa đón của dịch vụ chỉ thêm'); END;
-- Chỉ một kiểu sửa: ĐÓNG dòng đang mở (đặt `valid_to_at` + `updated_at` / `updated_by` = người đóng), mọi cột khác giữ nguyên; dòng đã đóng không sửa nữa.
CREATE TRIGGER ctl_service_transfer_rule_only_close BEFORE UPDATE ON ctl_service_transfer_rule
WHEN OLD.valid_to_at IS NOT NULL OR NEW.valid_to_at IS NULL OR NEW.id IS NOT OLD.id OR NEW.service_code IS NOT OLD.service_code OR NEW.mode IS NOT OLD.mode
  OR NEW.valid_from_at IS NOT OLD.valid_from_at OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: chỉ được đóng dòng quy tắc đang mở'); END;

-- ===== view công bố cho `orders` (ADR-0118 Đ2, ADR-0149 Đ1): ô riêng của dịch vụ nếu có dòng mở, nếu không thì đúng luật của 0121. =====================================
DROP VIEW v_ctl_service_transfer;
CREATE VIEW v_ctl_service_transfer AS
  SELECT i.code AS catalog_code,
         CASE r.mode
           WHEN 'ALWAYS' THEN 1
           WHEN 'NEVER' THEN 0
           ELSE CASE WHEN g.code IS NOT NULL AND g.active = 1 THEN g.transfer_enabled ELSE 1 END
         END AS transfer_enabled
  FROM catalog_item i
  LEFT JOIN v_ctl_service_group sg ON sg.catalog_code = i.code
  LEFT JOIN ctl_group g ON g.code = sg.group_code
  LEFT JOIN ctl_service_transfer_rule r ON r.service_code = i.code AND r.valid_to_at IS NULL;
