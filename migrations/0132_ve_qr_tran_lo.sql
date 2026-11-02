-- Module: ve-dien-tu (ADR-0156). Chống trùng và trần lô của kho vé điện tử.
--   withdrawn_at  dấu «rút khỏi kho khi chưa từng phát ra»: đặt MỘT lần khi lưu kho R2 hỏng hoặc khi Bỏ lô. Vé mang dấu không còn tính là trùng nên nhập lại được.
--                 Vé VOID vì đã lộ cho khách KHÔNG mang dấu này. Trigger chặn đặt dấu cho vé từng có phân bổ: đặt sai dấu cho vé đã phát ra là bán trùng.
--   Hai chỉ mục duy nhất (mã vé, băm nội dung) chỉ áp cho vé không mang dấu. Chỉ mục mã cũ của 0131 không điều kiện nên phải dựng lại.
--   vdt_setting   bảng một dòng (id = 'default'), khuôn gd_setting của ADR-0087: trần lô do Toàn quyền đặt, `version` là khoá lạc quan; lịch sử ở audit_log (`ve_doi_tran_lo`).
--   Khoảng 1–200 trùng với TRAN_LO_NHO_NHAT / TRAN_LO_LON_NHAT ở src/shared/ve-nhap-lo.ts.
ALTER TABLE vdt_ticket ADD COLUMN withdrawn_at TEXT;
-- Dấu lệnh của lần Bỏ lô thắng (khuôn last_cmd_id của vc_trip): câu rút vé trong cùng lô chỉ chạy khi chính lệnh đó thắng.
ALTER TABLE vdt_batch ADD COLUMN last_cmd_id TEXT;

DROP INDEX vdt_ticket_code_uq;
CREATE UNIQUE INDEX vdt_ticket_code_uq ON vdt_ticket (ticket_code) WHERE withdrawn_at IS NULL;
CREATE UNIQUE INDEX vdt_ticket_hash_uq ON vdt_ticket (content_hash) WHERE withdrawn_at IS NULL;

CREATE TRIGGER vdt_ticket_withdrawn_insert BEFORE INSERT ON vdt_ticket
WHEN NEW.withdrawn_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: vé mới vào kho không mang dấu rút'); END;

CREATE TRIGGER vdt_ticket_withdrawn_guard BEFORE UPDATE OF withdrawn_at ON vdt_ticket
WHEN NEW.withdrawn_at IS NOT OLD.withdrawn_at
  AND (OLD.withdrawn_at IS NOT NULL OR NEW.withdrawn_at IS NULL OR NEW.status <> 'VOID' OR EXISTS (SELECT 1 FROM vdt_allocation a WHERE a.ticket_id = OLD.id))
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: dấu rút chỉ ghi một lần, chỉ cho vé VOID chưa từng được giữ chỗ'); END;

CREATE TABLE vdt_setting (
  id          TEXT PRIMARY KEY CHECK (id = 'default'),
  batch_limit INTEGER NOT NULL DEFAULT 50 CHECK (batch_limit BETWEEN 1 AND 200),
  version     INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
INSERT INTO vdt_setting (id, batch_limit, version, created_at, updated_at)
VALUES ('default', 50, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
CREATE TRIGGER vdt_setting_no_delete BEFORE DELETE ON vdt_setting
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: cài đặt kho vé không xoá được'); END;
