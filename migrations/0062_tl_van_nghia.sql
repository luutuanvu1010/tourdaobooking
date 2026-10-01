-- Module: tro-ly — dấu vân nghĩa (embedding OpenAI) của đoạn kho tri thức trợ lý Hỗ trợ (ADR-0082 Đ2, accepted 2026-10-01). Expand: MỘT bảng mới chỉ-thêm.
-- Số TẠM 0062: main tới 0060_tl_bo_nao, 0061_aut_session ở nhánh đăng nhập ⇒ ai gộp sau đổi tên tệp lên số lớn nhất lúc gộp + 1
-- (bài src/migrations-tro-ly-van-nghia.test.ts tìm theo đuôi tên).
--
-- tl_van_nghia — CHỈ véc-tơ của NỘI DUNG KHO (hướng dẫn, kiến trúc lời thường, cấu trúc / sơ đồ trang, ngữ cảnh bổ sung đã lọc); KHÔNG câu hỏi, không dữ liệu
--   khách / nhân viên (trang ghép §7 đặc tả). Không route nào đọc / ghi trực tiếp; máy chủ tính bù khi trả lời câu hỏi / ô thử.
--   khoa        SHA-256 hex (64 ký tự) của "đoạn đã định dạng|mã mẫu|số chiều" — đổi một chữ của đoạn ⇒ khoá mới ⇒ tính bù đúng đoạn đó.
--   mau         mã mẫu embedding (hằng trong mã, src/shared/tro-ly-van-nghia.ts) — không CHECK liệt kê.
--   so_chieu    số chiều (tham số `dimensions`); > 0.
--   vec         float32 thứ tự byte của máy (little-endian), dài ĐÚNG so_chieu × 4 byte; typeof phải là 'blob' (bind sai kiểu ⇒ lỗi ồn ào, không rác).
--   created_by / updated_by luôn NULL (= hệ thống — luật ADR-0003); updated_at = created_at (không sửa).
-- Ghi bằng INSERT … ON CONFLICT(khoa) DO NOTHING (nhiều câu hỏi đồng thời cùng tính bù không lỗi, không trùng); cấm OR REPLACE. Dòng cũ không còn dùng thì bỏ mặc.
CREATE TABLE tl_van_nghia (
  khoa       TEXT PRIMARY KEY CHECK (length(khoa) = 64),
  mau        TEXT NOT NULL,
  so_chieu   INTEGER NOT NULL CHECK (so_chieu > 0),
  vec        BLOB NOT NULL CHECK (typeof(vec) = 'blob' AND length(vec) = so_chieu * 4),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE TRIGGER tl_van_nghia_no_update BEFORE UPDATE ON tl_van_nghia
BEGIN SELECT RAISE(ABORT, 'tl_append_only: dấu vân nghĩa chỉ thêm, không sửa'); END;
CREATE TRIGGER tl_van_nghia_no_delete BEFORE DELETE ON tl_van_nghia
BEGIN SELECT RAISE(ABORT, 'tl_append_only: dấu vân nghĩa không xoá'); END;
