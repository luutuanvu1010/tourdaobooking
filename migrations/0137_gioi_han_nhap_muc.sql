-- Migration 0137 — ADR-0161 Đ3 (accepted 2026-11-03): GIỚI HẠN NHẬP mức hoa hồng, Toàn quyền đổi được. Module pricing. CHỈ THÊM (expand): một bảng mới, không chạm bảng cũ.
-- Số: ngày 3/11, `main` và mọi nhánh cục bộ lẫn xa có tới 0136 ⇒ 0137.
-- Khuôn `ord_confirm_policy` (0119): chỉ-thêm, dòng hiệu lực = `valid_from_at` lớn nhất; gieo MỘT dòng 50% và 1.000 đ. Đổi = chèn dòng mới (route ghi nhật ký cùng lô).
-- Giới hạn chỉ áp ở MÁY CHỦ lúc nhập mức mới (thêm, Đổi, Sửa có số mới — số 0 luôn nhận); KHÔNG áp lại dòng mức đã có, KHÔNG đụng đơn đã chụp. Vì thế CHECK của cột chỉ giữ biên rộng
-- (phần vạn 1…10000, bước tiền 1…1.000.000), còn cột `prc_commission_rule.rate_bp` / `per_pax_amount` giữ CHECK rộng như hôm nay (giới hạn phải đổi được, không khoá cứng trong CSDL).
-- Không dữ liệu cá nhân trong bảng (chỉ hai con số, mốc giờ, id nhân viên).

CREATE TABLE prc_entry_limit_policy (
  id             TEXT PRIMARY KEY,
  max_rate_bp    INTEGER NOT NULL CHECK (max_rate_bp BETWEEN 1 AND 10000),      -- trần phần trăm khi nhập, phần vạn (5000 = 50%)
  amount_step    INTEGER NOT NULL CHECK (amount_step BETWEEN 1 AND 1000000),    -- bước số tiền: mọi số tiền khác 0 phải chia hết cho số này (đồng)
  valid_from_at  TEXT NOT NULL UNIQUE,
  created_at     TEXT NOT NULL,
  created_by     TEXT,                                                           -- cột WHO không khoá ngoại (ADR-0003)
  updated_at     TEXT NOT NULL,
  updated_by     TEXT
);
INSERT INTO prc_entry_limit_policy (id, max_rate_bp, amount_step, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0137', 5000, 1000, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
CREATE TRIGGER prc_entry_limit_policy_no_update BEFORE UPDATE ON prc_entry_limit_policy
BEGIN SELECT RAISE(ABORT, 'prc_policy_append_only: giới hạn nhập mức hoa hồng chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER prc_entry_limit_policy_no_delete BEFORE DELETE ON prc_entry_limit_policy
BEGIN SELECT RAISE(ABORT, 'prc_policy_append_only: giới hạn nhập mức hoa hồng không xoá'); END;
