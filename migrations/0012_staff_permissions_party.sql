-- Migration 0012 — quyền app đa trị + tài khoản trỏ hồ sơ + backfill (module staff). Đặc tả N1 (docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md), ADR-0001/0002/0003/0005/0008.
-- Nguồn: mục 3 và 4 của docs/superpowers/specs/2026-09-20-n1-schema-reference.sql (bộ kiểm SQLite đã chạy). Chỉ THÊM — mã cũ vẫn chạy nguyên vẹn (expand–contract).

CREATE TABLE stf_permission_type (
  code        TEXT PRIMARY KEY CHECK (code = upper(code)),
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO stf_permission_type (code, name, description, sort_order) VALUES
  ('SALES', 'Bán hàng', 'Lập và sửa đơn của mình, ghi thu tiền cho đơn của mình', 1),
  ('ACCOUNTING', 'Kế toán', 'Ghi thu/hoàn tiền, sửa tiền sau xác nhận, đánh dấu hoá đơn', 2),
  ('ADMIN', 'Quản trị', 'Mọi thao tác; quản lý tài khoản, quyền, địa điểm, danh mục, hồ sơ', 3),
  ('FIELD', 'Thực hiện', 'Xem và cập nhật việc được giao; không thấy tiền', 4);

CREATE TABLE stf_permission (
  id                   TEXT PRIMARY KEY,
  staff_id             TEXT NOT NULL REFERENCES staff(id),
  permission_type_code TEXT NOT NULL REFERENCES stf_permission_type(code),
  valid_from_at        TEXT NOT NULL,
  valid_to_at          TEXT CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at),
  created_at           TEXT NOT NULL,
  created_by           TEXT,
  updated_at           TEXT NOT NULL,
  updated_by           TEXT
);
CREATE INDEX stf_permission_staff_ix ON stf_permission(staff_id);
CREATE UNIQUE INDEX stf_permission_open_uq ON stf_permission(staff_id, permission_type_code) WHERE valid_to_at IS NULL;


-- Trỏ hồ sơ: thêm cột (KHÔNG dựng lại bảng). NOT NULL được thi hành bằng trigger sau khi backfill.
ALTER TABLE staff ADD COLUMN party_id TEXT REFERENCES pty_party(id);
CREATE UNIQUE INDEX staff_party_uq ON staff(party_id) WHERE party_id IS NOT NULL;                -- một hồ sơ tối đa một tài khoản

-- LEFT JOIN có chủ ý: tài khoản do mã cũ tạo trong khoảng giữa hai lần triển khai chưa có party_id; INNER JOIN sẽ làm biến mất
-- đơn của họ khỏi danh sách đơn và họ khỏi trang Nhân sự (đặc tả N1 §9). Nhãn dự phòng hiện rõ để quản trị viên thấy và xử lý.
CREATE VIEW v_stf_staff_label AS
  SELECT s.id, COALESCE(p.display_name, '(chưa có hồ sơ)') AS label, s.active, s.party_id
  FROM staff s LEFT JOIN pty_party p ON p.id = s.party_id;

-- 4.1 Một hồ sơ PERSON cho mỗi tài khoản (id xác định: 'pty-' || staff.id; tên nguyên văn từ staff.full_name).
INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at)
SELECT 'pty-' || s.id, 'PERSON', trim(s.full_name), s.active, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM staff s;

-- 4.2 Tách họ / tên đệm / tên: tên = từ cuối; họ = từ đầu (nếu có ≥ 2 từ); tên đệm = phần giữa.
INSERT INTO pty_person (party_id, family_name, middle_name, given_name, created_at, updated_at)
SELECT 'pty-' || t.id,
       CASE WHEN instr(t.head, ' ') > 0 THEN substr(t.head, 1, instr(t.head, ' ') - 1) ELSE NULLIF(t.head, '') END,
       CASE WHEN instr(t.head, ' ') > 0 THEN NULLIF(trim(substr(t.head, instr(t.head, ' ') + 1)), '') END,
       t.given,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM (SELECT s.id AS id,
             trim(substr(trim(s.full_name), length(rtrim(trim(s.full_name), replace(trim(s.full_name), ' ', ''))) + 1)) AS given,
             trim(rtrim(trim(s.full_name), replace(trim(s.full_name), ' ', ''))) AS head
      FROM staff s) t;

-- 4.3 Vai trò hồ sơ STAFF (không gắn nơi), hiệu lực từ ngày tạo tài khoản (giờ Việt Nam).
INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at)
SELECT 'ptr-' || s.id, 'pty-' || s.id, 'STAFF', NULL, date(s.created_at, '+7 hours'),
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM staff s;

-- 4.4 Quyền app: sales → SALES, admin → ADMIN (ADR-0005 bước 1; quản trị không cần kèm SALES — ADR-0007).
INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at)
SELECT 'stp-' || s.id, s.id, CASE s.role WHEN 'admin' THEN 'ADMIN' ELSE 'SALES' END,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now') FROM staff s;

-- 4.5 Trỏ tài khoản tới hồ sơ.
UPDATE staff SET party_id = 'pty-' || id WHERE party_id IS NULL;


-- Các trigger bắt buộc party_id (staff_party_required_*) và giữ quản trị viên cuối (stf_permission_keep_admin_upd, staff_keep_admin_upd)
-- KHÔNG nằm ở đây: chúng vào migration 0013 ở LẦN PHÁT HÀNH 2, sau khi Worker mới đã chạy (đặc tả N1 §9; wrangler áp mọi migration chưa áp).
