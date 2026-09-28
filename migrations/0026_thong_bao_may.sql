-- Migration 0026 — Thông báo lượt 2: địa chỉ nhận thông báo màn hình khoá (Web Push, ADR-0036). Module thongbao. Chỉ THÊM.
-- Không lưu khoá mã hoá của máy, không lưu nội dung tin; không xoá cứng (hết hiệu lực = revoked_at + revoke_reason).

CREATE TABLE ntf_push_sub (
  id            TEXT PRIMARY KEY,
  staff_id      TEXT NOT NULL,                                   -- chủ máy (không khoá ngoại, như ntf_ack)
  endpoint      TEXT NOT NULL CHECK (length(endpoint) BETWEEN 1 AND 1024),
  thiet_bi      TEXT NOT NULL CHECK (length(thiet_bi) BETWEEN 1 AND 40),
  revoked_at    TEXT,                                            -- UTC; NULL = đang bật
  revoke_reason TEXT,                                            -- tu-tat | dang-xuat | tai-khoan-doi | het-han | doi-tai-khoan (chữ tự do, không CHECK liệt kê)
  created_at TEXT NOT NULL, created_by TEXT, updated_at TEXT NOT NULL, updated_by TEXT
);
CREATE UNIQUE INDEX ntf_push_sub_endpoint_uq ON ntf_push_sub(endpoint) WHERE revoked_at IS NULL;
CREATE INDEX ntf_push_sub_staff_ix ON ntf_push_sub(staff_id) WHERE revoked_at IS NULL;
