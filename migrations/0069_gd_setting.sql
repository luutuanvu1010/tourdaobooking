-- Module: giao-dien (ADR-0087) — giao diện công ty do Toàn quyền chỉnh. Bảng một dòng `gd_setting` (id = 'default').
--   tokens   JSON {"<khoá núm>": "<giá trị>"} — chỉ núm đã đổi khỏi mặc định của public/app.css; '{}' = mặc định. Máy chủ kiểm bằng src/shared/giao-dien.ts
--            trước khi ghi; khi đọc, khoá lạ/sai dạng bị BỎ QUA (docTokensDaLuu) nên dòng cũ không bao giờ làm hỏng trang.
--   version  khoá lạc quan: PUT gửi version đang xem; lệch → 409. Cũng là ETag của GET /api/giao-dien.css.
--   created_by / updated_by: cột WHO (ADR-0003, TEXT NULL, không khoá ngoại). Lịch sử ở audit_log (`giao_dien_changed`).
-- Đường thoát khẩn (giao diện hỏng, không vào được màn chỉnh): UPDATE gd_setting SET tokens = '{}', version = version + 1 WHERE id = 'default';
CREATE TABLE gd_setting (
  id         TEXT PRIMARY KEY CHECK (id = 'default'),
  tokens     TEXT NOT NULL DEFAULT '{}',
  version    INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
INSERT INTO gd_setting (id, tokens, version, created_at, updated_at)
VALUES ('default', '{}', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
