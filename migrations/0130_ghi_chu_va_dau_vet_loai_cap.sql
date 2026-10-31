-- Migration 0130 — mã định danh 5.26: ghi chú + dấu vết cho loại đối tác (pty_role_type), ghi chú cho cấp đại lý (prc_rate_tier).
-- CHỈ THÊM CỘT, mọi dòng cũ để NULL (loại có sẵn chưa từng được sửa). Không đụng trigger: prc_rate_tier_update_scope đã cho đổi tên/khoá tên/người-giờ cập nhật,
-- và pty_role_type_partner_label_immutable chỉ canh nhóm + cờ loại đối tác.
ALTER TABLE pty_role_type ADD COLUMN note TEXT CHECK (note IS NULL OR length(note) BETWEEN 1 AND 500);
ALTER TABLE pty_role_type ADD COLUMN created_at TEXT;
ALTER TABLE pty_role_type ADD COLUMN created_by TEXT;
ALTER TABLE pty_role_type ADD COLUMN updated_at TEXT;
ALTER TABLE pty_role_type ADD COLUMN updated_by TEXT;

ALTER TABLE prc_rate_tier ADD COLUMN note TEXT CHECK (note IS NULL OR length(note) BETWEEN 1 AND 500);
