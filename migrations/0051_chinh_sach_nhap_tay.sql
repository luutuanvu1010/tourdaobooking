-- Migration 0051 — ADR-0061 (accepted 2026-09-30): CHÍNH SÁCH "Dịch vụ nhập tay" (công tắc của Toàn quyền). Module orders (tiền tố ord_). CHỈ THÊM.
-- Số 0051: do điều phối chung cấp 30/9 (0050 = tro_ly; 0046–0049 giữ chỗ cho nhánh khác — docs/CHANGE-GUIDE.md công thức d).
-- Khuôn vc_dispatch_policy (0041): dòng hiệu lực = valid_from_at lớn nhất ≤ bây giờ; đổi = chèn dòng mới, máy chủ đặt valid_from_at = lúc ghi, không lùi
-- (route POST /api/cai-dat/nhap-tay, ô settings.ops). Bảng rỗng (không thể xảy ra sau migration này) ⇒ máy chủ coi như TẮT (ADR-0061 A-8, Hiến chương 5.7).
-- Gieo MỘT dòng enabled = 0: mặc định TẮT (ADR-0061 điều 1, tiêu chí 1). created_at của dòng gieo = mốc phát hành ADR-0061 — kiểm định kỳ R-ORD-NT1
-- (scripts/audit-checks.mjs) chỉ xét đơn tạo sau mốc này. Không dữ liệu cá nhân.
CREATE TABLE ord_manual_service_policy (
  id             TEXT PRIMARY KEY,
  enabled        INTEGER NOT NULL CHECK (enabled IN (0, 1)),   -- 1 = BẬT (nội bộ được thêm dịch vụ nhập tay), 0 = TẮT
  valid_from_at  TEXT NOT NULL UNIQUE,                           -- hiệu lực từ (ISO UTC)
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT
);
INSERT INTO ord_manual_service_policy (id, enabled, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0051', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
CREATE TRIGGER ord_manual_service_policy_no_update BEFORE UPDATE ON ord_manual_service_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách nhập tay chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER ord_manual_service_policy_no_delete BEFORE DELETE ON ord_manual_service_policy
BEGIN SELECT RAISE(ABORT, 'ord_policy_append_only: chính sách nhập tay không xoá'); END;
