-- Module: maintenance — chế độ bảo trì của RIÊNG chủ dự án (docs/HANDOFF-CHE-DO-BAO-TRI.md). Bảng singleton `mnt_setting` (đúng một dòng id = 'default').
-- Khi `enabled = 1`, máy chủ chặn MỌI tài khoản có SĐT không nằm trong `allowed_phones` (kể cả phiên đang mở) bằng 503 `maintenance`; giờ dự kiến hoàn tất là `ends_at`.
--   enabled        0/1. Gieo 0 (TẮT): chạy migration này KHÔNG bật gì.
--   ends_at        giờ dự kiến hoàn tất, ISO UTC; NULL khi tắt. KHÔNG có CHECK chéo cột: đường thoát khẩn là MỘT câu
--                  `UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'` (wrangler d1 execute) và không được vướng ràng buộc nào lúc khẩn cấp.
--   allowed_phones SĐT ĐÃ CHUẨN HOÁ (dạng 0xxxxxxxxx) được dùng app khi đang bật, cách nhau dấu phẩy. Gieo đúng số của chủ dự án; sai số ở đây = tự khoá mình
--                  (src/migrations-maintenance.test.ts kiểm số gieo đi qua normalizePhone ra chính nó).
--   created_by / updated_by: cột WHO của ADR-0003 (TEXT NULL, KHÔNG khoá ngoại, NULL = hệ thống) — người bật/tắt lần cuối nằm ở updated_by, lịch sử ở audit_log (`maintenance_changed`).
-- CHỈ THÊM bảng mới (expand); không đụng bảng đã có.
CREATE TABLE mnt_setting (
  id             TEXT PRIMARY KEY CHECK (id = 'default'),
  enabled        INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  ends_at        TEXT,
  allowed_phones TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT
);

INSERT INTO mnt_setting (id, enabled, ends_at, allowed_phones, created_at, updated_at)
VALUES ('default', 0, NULL, '0989929373', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
