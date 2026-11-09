-- 0153 — Nút thanh dưới người dùng tự chọn (ADR-0187 Đ2.3, accepted 2026-11-08). Đặc tả docs/superpowers/specs/2026-11-09-ghim-nut-thanh-duoi-design.md.
-- Số 0153: 0150 đã ở main, 0151–0152 ở nhánh claude/ve-tour-dao-thi-cong chưa nhập (kiểm mọi nhánh 9/11).
-- CHỈ MỞ RỘNG: một bảng mới của module staff. Không sửa dữ liệu cũ. Tệp KHÔNG tự mở/đóng giao dịch.
--
-- Một dòng mỗi tài khoản, ghi đè tại chỗ: đây là SỞ THÍCH HIỂN THỊ, không phải quyền (ADR-0187 Trang ghép mục 1) — lịch sử nằm ở nhật ký (`bottom_tabs_changed`).
-- `trang` = khoá trang cách nhau dấu phẩy, đúng thứ tự người chọn (tối đa 4; nút «Tôi» luôn có nên không lưu); NULL = «Về mặc định» (không xoá dòng).
-- Khoá hợp lệ kiểm ở mã (`kiemGhim` / `docGhim` của src/shared/muc-giao-dien.ts), không CHECK liệt kê (src/CLAUDE.md «Dữ liệu»).
CREATE TABLE stf_thanh_duoi (
  staff_id   TEXT PRIMARY KEY REFERENCES staff(id),
  trang      TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
