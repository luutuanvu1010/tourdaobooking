-- Module: auth — ADR-0016 (accepted 2026-09-23): đăng nhập nhanh bằng passkey (Face ID/Touch ID/vân tay), song song SĐT + PIN.
-- CHỈ THÊM bảng mới (expand); không đổi bảng cũ. Tiền tố aut_ = module auth (ADR-0016 điều 5).
--   credential_id  id khoá do máy sinh (base64url) — tra khi đăng nhập; UNIQUE chặn gửi lại cùng một lần đăng ký
--   public_key     khoá công khai dạng SPKI DER (base64url); algorithm -7 (ES256) hoặc -257 (RS256), mã kiểm (không CHECK liệt kê)
--   user_handle    16 byte ngẫu nhiên (base64url) gửi làm user.id; mỗi tài khoản một giá trị, KHÔNG chứa thông tin cá nhân
--   sign_count     bộ đếm chữ ký (passkey iCloud thường luôn 0)
--   label          tên máy lấy từ User-Agent ("iPhone", "Máy Mac"…), không chứa SĐT
--   last_used_at   lần dùng gần nhất (ISO UTC) — cũng là chốt "dùng một lần" của thách thức
--   valid_to_at    gỡ = đặt cột này; KHÔNG xoá cứng
CREATE TABLE aut_passkey (
  id TEXT NOT NULL PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  credential_id TEXT NOT NULL UNIQUE CHECK (length(credential_id) BETWEEN 16 AND 1400),
  public_key TEXT NOT NULL CHECK (length(public_key) > 0),
  algorithm INTEGER NOT NULL,
  user_handle TEXT NOT NULL CHECK (length(user_handle) BETWEEN 16 AND 64),
  sign_count INTEGER NOT NULL DEFAULT 0 CHECK (sign_count >= 0),
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 40),
  last_used_at TEXT,
  valid_from_at TEXT NOT NULL,
  valid_to_at TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at)
);
CREATE INDEX aut_passkey_staff_ix ON aut_passkey (staff_id, valid_to_at);
