-- Migration 0055 — ADR-0068 Đ3 (gộp hồ sơ cá nhân trùng; accepted — xem docs/adr/ADR-0068-gop-ho-so-ca-nhan.md). CHỈ THÊM. Số 0055 là số GIỮ CHỖ — xác nhận
-- với phiên điều phối chung trước khi gộp main; test tìm tệp theo ĐUÔI tên. Trigger chỉ đọc bảng của chính module parties (Hiến chương 5.3); tên bắt đầu
-- pty_ (không staff_/stf_ — src/migrations-n1.test.ts coi đó là trigger siết B5). REFERENCES chỉ được khi mặc định NULL (SQLite ADD COLUMN).
ALTER TABLE pty_party ADD COLUMN merged_into_id TEXT REFERENCES pty_party(id);
ALTER TABLE pty_party ADD COLUMN merged_at TEXT;
CREATE INDEX pty_party_merged_into_ix ON pty_party(merged_into_id) WHERE merged_into_id IS NOT NULL;

-- Hồ sơ mới không bao giờ sinh ra ở trạng thái "đã gộp".
CREATE TRIGGER pty_party_merge_no_insert BEFORE INSERT ON pty_party
WHEN NEW.merged_into_id IS NOT NULL OR NEW.merged_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'party_merge_insert: hồ sơ mới không được mang sẵn dấu đã gộp'); END;

-- Đặt MỘT lần: đã có đích thì không đổi đích, không xoá, không đổi mốc.
CREATE TRIGGER pty_party_merge_set_once BEFORE UPDATE OF merged_into_id, merged_at ON pty_party
WHEN OLD.merged_into_id IS NOT NULL AND (NEW.merged_into_id IS NOT OLD.merged_into_id OR NEW.merged_at IS NOT OLD.merged_at)
BEGIN SELECT RAISE(ABORT, 'party_merge_set_once: hồ sơ đã gộp — không đổi hay bỏ dấu gộp'); END;

-- Lúc đặt: đích và mốc đi cùng nhau; không trỏ chính mình; nguồn ngưng dùng cùng câu; cả hai là cá nhân; đích đang dùng, chưa gộp; nguồn chưa là đích của
-- hồ sơ nào (không chuỗi — ADR-0068 Đ3).
CREATE TRIGGER pty_party_merge_target BEFORE UPDATE OF merged_into_id, merged_at ON pty_party
WHEN OLD.merged_into_id IS NULL AND (NEW.merged_into_id IS NOT NULL OR NEW.merged_at IS NOT NULL) AND (
  NEW.merged_into_id IS NULL OR NEW.merged_at IS NULL
  OR NEW.merged_into_id = NEW.id
  OR NEW.active <> 0
  OR NEW.party_kind <> 'PERSON'
  OR NOT EXISTS (SELECT 1 FROM pty_party t WHERE t.id = NEW.merged_into_id AND t.party_kind = 'PERSON' AND t.active = 1 AND t.merged_into_id IS NULL)
  OR EXISTS (SELECT 1 FROM pty_party s WHERE s.merged_into_id = NEW.id))
BEGIN SELECT RAISE(ABORT, 'party_merge_target: gộp phải từ hồ sơ cá nhân sang hồ sơ cá nhân đang dùng, chưa gộp, không chuỗi, kèm ngưng dùng và mốc gộp'); END;

-- Hồ sơ đã gộp không mở lại.
CREATE TRIGGER pty_party_merge_no_reopen BEFORE UPDATE OF active ON pty_party
WHEN OLD.merged_into_id IS NOT NULL AND NEW.active <> 0
BEGIN SELECT RAISE(ABORT, 'party_merge_no_reopen: hồ sơ đã gộp — không bật lại'); END;
