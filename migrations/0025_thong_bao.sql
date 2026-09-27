-- Migration 0025 — Thông báo hệ thống lượt 1 (module thongbao, ADR-0034). Đặc tả: docs/superpowers/specs/2026-09-27-thong-bao-he-thong-design.md. Chỉ THÊM.
-- Tin về đơn KHÔNG có bảng: là hình chiếu của audit_log qua v_aud_order_event (ADR-0034 điều 1). Bảng dưới đây chỉ cho tin thủ công.

CREATE TABLE ntf_notice (
  id                TEXT PRIMARY KEY,
  tieu_de           TEXT NOT NULL CHECK (length(trim(tieu_de)) BETWEEN 1 AND 120),
  noi_dung          TEXT NOT NULL CHECK (length(trim(noi_dung)) BETWEEN 1 AND 2000),
  quan_trong        INTEGER NOT NULL DEFAULT 0 CHECK (quan_trong IN (0, 1)),
  client_request_id TEXT NOT NULL,                     -- chống gửi trùng khi bấm hai lần (cùng người gửi)
  valid_to          TEXT,                              -- UTC; NULL = còn hiệu lực; đặt = đã thu hồi (không xoá cứng)
  created_at        TEXT NOT NULL,
  created_by        TEXT,                              -- người gửi (WHO: không khoá ngoại)
  updated_at        TEXT NOT NULL,
  updated_by        TEXT
);
CREATE UNIQUE INDEX ntf_notice_request_uq ON ntf_notice(created_by, client_request_id);
CREATE INDEX ntf_notice_created_ix ON ntf_notice(created_at);

CREATE TABLE ntf_notice_target (
  notice_id  TEXT NOT NULL REFERENCES ntf_notice(id),
  tag        TEXT NOT NULL CHECK (tag = 'noi-bo' OR tag GLOB 'quyen:[A-Z]*'),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  PRIMARY KEY (notice_id, tag)
);

CREATE TABLE ntf_ack (
  notice_id  TEXT NOT NULL REFERENCES ntf_notice(id),
  staff_id   TEXT NOT NULL,                            -- người bấm "Đã hiểu" (không khoá ngoại)
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  PRIMARY KEY (notice_id, staff_id)
);
CREATE TRIGGER ntf_ack_frozen_update BEFORE UPDATE ON ntf_ack
BEGIN SELECT RAISE(ABORT, 'append_only: xác nhận đã hiểu không sửa được'); END;
CREATE TRIGGER ntf_ack_frozen_delete BEFORE DELETE ON ntf_ack
BEGIN SELECT RAISE(ABORT, 'append_only: xác nhận đã hiểu không xoá được'); END;

CREATE TABLE ntf_read_mark (
  staff_id    TEXT PRIMARY KEY,                        -- mỗi tài khoản một mốc; chỉ chính tài khoản đặt
  doc_den_luc TEXT NOT NULL,                           -- UTC: mọi tin tới lúc này coi là đã đọc (mở hộp = đọc hết)
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);

-- View công bố (đọc xuyên module chỉ qua view — ADR-0002). Chủ sở hữu ghi ở docs/data-dictionary.json.
CREATE VIEW v_aud_order_event AS                        -- module audit
  SELECT id, order_id, staff_id, action, created_at FROM audit_log
  WHERE order_id IS NOT NULL
    AND action IN ('created', 'order_claimed', 'order_handler_changed', 'confirmed', 'cancelled', 'order_cancelled_by_field');
CREATE VIEW v_ord_order_owner AS                        -- module orders: người lập đơn
  SELECT id, staff_id FROM orders;
CREATE VIEW v_dsp_first_handler AS                      -- module dispatch: lúc đơn có người phụ trách LẦN ĐẦU (X2)
  SELECT order_id, MIN(valid_from_at) AS first_at FROM dsp_assignment
  WHERE task_kind_code = 'HANDLE' AND order_id IS NOT NULL GROUP BY order_id;
