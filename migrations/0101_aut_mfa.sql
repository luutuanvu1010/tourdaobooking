-- Migration 0101 — ADR-0074 (accepted 2026-10-01): bảo mật hai lớp. Yếu tố thuộc TÀI KHOẢN (module auth), không thuộc hồ sơ (điều 4).
-- Cột WHO (created_by / updated_by) là TEXT NULL, không khoá ngoại (ADR-0003; bài architecture.test.ts) — NULL = hệ thống.
CREATE TABLE aut_mfa_factor (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  kind TEXT NOT NULL CHECK (kind IN ('TOTP', 'EMAIL')),
  secret_enc TEXT,              -- TOTP: khoá mã hoá AES-GCM (v1.iv.ct); EMAIL: NULL
  email TEXT,                   -- EMAIL (Phần C): địa chỉ đã xác nhận; TOTP: NULL
  last_totp_step INTEGER NOT NULL DEFAULT 0,
  valid_from_at TEXT NOT NULL,
  valid_to_at TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  CHECK ((kind = 'TOTP' AND secret_enc IS NOT NULL AND email IS NULL) OR (kind = 'EMAIL' AND email IS NOT NULL AND secret_enc IS NULL))
);
CREATE UNIQUE INDEX aut_mfa_factor_one_live ON aut_mfa_factor (staff_id, kind) WHERE valid_to_at IS NULL;
CREATE TABLE aut_mfa_recovery_code (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  batch_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  used_at TEXT,
  revoked_at TEXT
);
CREATE UNIQUE INDEX aut_mfa_recovery_hash ON aut_mfa_recovery_code (staff_id, code_hash);
CREATE TABLE aut_trusted_device (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 80),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  last_used_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  revoke_reason TEXT CHECK (revoke_reason IS NULL OR revoke_reason IN ('quen_may', 'quen_moi_may', 'doi_pin', 'dat_lai_pin', 'tat_hai_lop', 'bi_go', 'ngung'))
);
CREATE INDEX aut_trusted_device_staff ON aut_trusted_device (staff_id, revoked_at);
ALTER TABLE staff ADD COLUMN mfa_grace_until TEXT;   -- hạn ân hạn 14 ngày (tự bật trong phiên)
ALTER TABLE staff ADD COLUMN mfa_enroll_until TEXT;  -- cửa sổ 24 giờ sau khi Quản trị/Toàn quyền tắt lớp hai (bật lại ngay ở bước đăng nhập)
-- Ân hạn 14 ngày cho tài khoản NỘI BỘ đang hoạt động (ADR-0074 điều 1), tính từ lúc migration áp = lúc phát hành.
-- "Nội bộ" = có ít nhất một quyền đang hiệu lực ngoài PARTNER, DRIVER_PARTNER (khớp EXTERNAL_PERMISSIONS — bài (c) đối chiếu).
UPDATE staff SET mfa_grace_until = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+14 days')
WHERE active = 1 AND EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = staff.id AND p.permission_type_code NOT IN ('PARTNER', 'DRIVER_PARTNER') AND p.valid_to_at IS NULL);
