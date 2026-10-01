-- Migration 0061 — ADR-0075 (accepted 2026-10-01): SỔ PHIÊN ĐĂNG NHẬP. Mỗi lần cấp phiên mới (PIN hoặc Face ID) là một dòng; không xoá dòng (lịch sử).
-- Kết thúc = đặt ended_at + end_reason (cặp đi cùng nhau). single = 1: tài khoản chịu luật một máy — CSDL chặn hai phiên sống cùng lúc bằng chỉ mục
-- duy nhất có điều kiện (máy chủ cũng kết thúc phiên cũ trong cùng lô; chỉ mục là lưới khi hai lần đăng nhập chạy đua).
-- ip, user_agent là dữ liệu cá nhân: chỉ IT/Toàn quyền và chính chủ tài khoản xem; KHÔNG ghi vào nhật ký.
CREATE TABLE aut_session (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  method TEXT NOT NULL CHECK (method IN ('PIN', 'PIN_MFA', 'PIN_TRUSTED', 'PASSKEY')),
  single INTEGER NOT NULL CHECK (single IN (0, 1)),
  trusted_device_id TEXT,
  device_label TEXT NOT NULL CHECK (length(device_label) BETWEEN 1 AND 80),
  user_agent TEXT CHECK (user_agent IS NULL OR length(user_agent) <= 200),
  ip TEXT CHECK (ip IS NULL OR length(ip) <= 64),
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ended_at TEXT,
  end_reason TEXT CHECK (end_reason IS NULL OR end_reason IN
    ('dang_xuat', 'bi_thay', 'bi_go', 'doi_pin', 'dat_lai_pin', 'tat_hai_lop', 'ngung', 'het_han', 'mat_mien', 'doi_face_id')),
  ended_by TEXT REFERENCES staff(id),
  -- Cột kiểm toán chung (ADR-0003; bài architecture.test.ts đòi cho mọi bảng mới): created_by/updated_by không khoá ngoại, NULL = hệ thống.
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  CHECK ((ended_at IS NULL) = (end_reason IS NULL))
);
CREATE UNIQUE INDEX aut_session_one_live ON aut_session (staff_id) WHERE ended_at IS NULL AND single = 1;
CREATE INDEX aut_session_staff_created ON aut_session (staff_id, created_at);
CREATE INDEX aut_session_live ON aut_session (ended_at, created_at);
-- Module thongbao: máy nhận thông báo màn hình khoá gắn với phiên đã đăng ký nó (ADR-0075 điều 6b). Dòng cũ = NULL (trước phát hành).
ALTER TABLE ntf_push_sub ADD COLUMN session_id TEXT;
