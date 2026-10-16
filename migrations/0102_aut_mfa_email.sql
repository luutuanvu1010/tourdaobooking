-- Migration 0102 — ADR-0074 (accepted 2026-10-01) điều 4, Phần C: mã gửi qua email cho bước hai lớp. Chỉ thêm bảng.
-- KHÔNG lưu địa chỉ email ở đây (địa chỉ đã xác nhận nằm ở aut_mfa_factor.email) và KHÔNG lưu mã thô: chỉ băm SHA-256.
--   email_hash = SHA-256 của địa chỉ đã chuẩn hoá (cắt khoảng trắng, chữ thường) — mã gửi tới địa chỉ cũ hết tác dụng khi đổi địa chỉ.
--   code_hash  = SHA-256("<staffId>:<id>:<mã>").
-- Mã sống 10 phút (expires_at), tối đa 5 lần nhập (attempts). Không xoá dòng: dùng = used_at, gửi mã mới = revoked_at cho mã mở cũ.
-- Cột WHO (created_by / updated_by) là TEXT NULL, không khoá ngoại (ADR-0003) — NULL = hệ thống.
CREATE TABLE aut_mfa_email_code (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'enroll')),
  email_hash TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  used_at TEXT,
  revoked_at TEXT
);
CREATE INDEX aut_mfa_email_code_staff ON aut_mfa_email_code (staff_id, created_at);
-- Lưới: mỗi (người, mục đích) tối đa MỘT mã còn mở. Lô gửi mã luôn huỷ mã mở cũ trước khi chèn (mã hết hạn chưa dùng cũng bị huỷ ở đó).
CREATE UNIQUE INDEX aut_mfa_email_code_one_open ON aut_mfa_email_code (staff_id, purpose) WHERE used_at IS NULL AND revoked_at IS NULL;
