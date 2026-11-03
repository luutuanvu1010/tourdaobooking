PRAGMA defer_foreign_keys = ON;
-- Migration 0134 — ADR-0157: lô «Mọi loại khách» cho vé không phân biệt người lớn, trẻ em, người cao tuổi (vé Harbour tiêu chuẩn, chủ xác nhận 2/11/2026).
-- `vdt_batch.pax_group` nhận thêm 'ALL'. SQLite không sửa được CHECK tại chỗ nên dựng lại bảng theo trình tự ADR-0003 điều 10, mọi dòng và mọi trigger giữ nguyên
-- (bài TC7 ở src/modules/ve-dien-tu/lo-moi-loai-khach.test.ts so toàn bộ sqlite_master trước và sau). `vdt_allocation.pax_group` KHÔNG đổi: suất luôn mang loại khách thật.
-- Số 0134: 0133 đã dùng ở nhánh claude/dat-ve-luot-2 chưa gộp. Tệp không tự mở, đóng giao dịch: wrangler chạy cả tệp trong một lô.
-- HOÀN TÁC: chưa có lô 'ALL' thì giá trị thừa trong CHECK không ảnh hưởng mã cũ; đã có lô 'ALL' thì phải quyết định từng lô thuộc loại nào trước khi bỏ.

-- 1. Gỡ trigger nhắc bảng lô ở bảng khác (đổi tên bảng sẽ báo lỗi nếu còn trigger trỏ bảng đã DROP).
DROP TRIGGER vdt_allocation_insert_guard;

-- 2. Bản sao, bảng mới rỗng, đổi tên, nạp lại, bỏ bản sao.
CREATE TABLE vdt_batch_copy AS SELECT * FROM vdt_batch;
CREATE TABLE vdt_batch_new (
  id           TEXT PRIMARY KEY,
  catalog_code TEXT NOT NULL,
  pax_group    TEXT NOT NULL CHECK (pax_group IN ('ADULT', 'CHILD', 'SENIOR', 'ALL')),
  printed_name TEXT NOT NULL CHECK (length(printed_name) BETWEEN 1 AND 200),
  status       TEXT NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'VOID')),
  created_at   TEXT NOT NULL,
  created_by   TEXT,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT,
  last_cmd_id  TEXT
);
DROP TABLE vdt_batch;
ALTER TABLE vdt_batch_new RENAME TO vdt_batch;
INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, created_at, created_by, updated_at, updated_by, last_cmd_id)
  SELECT id, catalog_code, pax_group, printed_name, status, created_at, created_by, updated_at, updated_by, last_cmd_id FROM vdt_batch_copy;
DROP TABLE vdt_batch_copy;

-- 3. Tạo lại trigger của bảng lô, nguyên văn 0131.
CREATE TRIGGER vdt_batch_no_delete BEFORE DELETE ON vdt_batch
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: lô vé không xoá được — vô hiệu lô'); END;
CREATE TRIGGER vdt_batch_keep_key BEFORE UPDATE ON vdt_batch
WHEN NEW.id IS NOT OLD.id OR NEW.pax_group IS NOT OLD.pax_group OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: không đổi mã lô, nhóm khách hay dấu vết tạo của lô'); END;
CREATE TRIGGER vdt_batch_one_way BEFORE UPDATE OF status ON vdt_batch
WHEN OLD.status = 'VOID' AND NEW.status <> 'VOID'
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: lô đã vô hiệu không bật lại'); END;
CREATE TRIGGER vdt_batch_code_locked BEFORE UPDATE OF catalog_code ON vdt_batch
WHEN NEW.catalog_code IS NOT OLD.catalog_code AND EXISTS (SELECT 1 FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE t.batch_id = OLD.id)
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: lô đã có vé được giữ chỗ — không đổi mã tour, chỉ thu hồi lô'); END;

-- 4. Trigger phân bổ: nhận lô đúng loại khách hoặc lô dùng chung. Suất mang 'ALL' đã bị CHECK của vdt_allocation chặn.
CREATE TRIGGER vdt_allocation_insert_guard BEFORE INSERT ON vdt_allocation
WHEN (SELECT t.status FROM vdt_ticket t WHERE t.id = NEW.ticket_id) IS NOT 'ALLOCATED'
  OR ((SELECT b.pax_group FROM vdt_batch b JOIN vdt_ticket t ON t.batch_id = b.id WHERE t.id = NEW.ticket_id) IS NOT NEW.pax_group
    AND (SELECT b.pax_group FROM vdt_batch b JOIN vdt_ticket t ON t.batch_id = b.id WHERE t.id = NEW.ticket_id) IS NOT 'ALL')
  OR (SELECT b.status FROM vdt_batch b JOIN vdt_ticket t ON t.batch_id = b.id WHERE t.id = NEW.ticket_id) IS NOT 'ACTIVE'
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: chỉ phân bổ vé đang ALLOCATED, đúng nhóm khách hoặc lô dùng chung, lô còn hiệu lực'); END;
