-- Migration 0191 — ADR-0233 (accepted 2026-11-22) Đ1, Đ3, Đ4: ô tệp của phiếu đăng ký theo vai; «Tệp khác»; 12 tệp mỗi phiếu. Tệp này nhận ba phần; mỗi phần ghi đầu mục.
-- Số: phiên điều phối kế hoạch 16 việc giữ trước 0191 cho Việc 14 (21/11); đã liệt kê migrations/ của mọi nhánh cục bộ: không nhánh nào có 019x.
-- Xây trên lỗ đang hở HC-5.19 (khoá `xay_tren_cho_phep_adr_0233` ở docs/quyen-hoan.json): một bảng mới chỉ thêm, một cột mặc định 0, dựng lại hai view công bố,
-- một dòng dk_policy mới; không đổi dòng dữ liệu nào đang có, không chạm sổ tiền.

-- ===== dang-ky — bảng «vai ↔ ô tệp ↔ bắt buộc / tuỳ chọn / ẩn» (ADR-0233 Đ1) =====
-- NGHĨA của ô (tên hiện, phần, nơi nối lúc duyệt) là mã ở src/shared/dang-ky-o-tep.ts; bảng này chỉ nói vai nào thấy ô nào. Chỉ thêm dòng, không sửa, không xoá:
-- dòng hiệu lực của một khoá (phần, vai, ô) = dòng có `valid_from_at` lớn nhất ≤ lúc xét; tắt một ô = chèn dòng `AN`. `role_code` rỗng = mọi vai của phần đó; dòng có mã vai thắng dòng rỗng cùng ô.
-- `slot` và `role_code` là mã mở (CHECK khuôn, không liệt kê); mã ô máy chưa biết bị bỏ qua ở mã (đóng khi không rõ). Không dữ liệu cá nhân.
CREATE TABLE dk_role_slot (
  id              TEXT PRIMARY KEY,
  part            TEXT NOT NULL CHECK (part IN ('CA_NHAN', 'TO_CHUC')),
  role_code       TEXT NOT NULL DEFAULT '' CHECK (role_code = '' OR (role_code = upper(role_code) AND length(role_code) BETWEEN 2 AND 40 AND role_code NOT GLOB '*[^A-Z0-9_]*')),
  slot            TEXT NOT NULL CHECK (slot = upper(slot) AND length(slot) BETWEEN 2 AND 40 AND slot NOT GLOB '*[^A-Z0-9_]*'),
  mode            TEXT NOT NULL CHECK (mode IN ('BAT_BUOC', 'TUY_CHON', 'AN')),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  valid_from_at   TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT,
  UNIQUE (part, role_code, slot, valid_from_at)
);
CREATE TRIGGER dk_role_slot_no_update BEFORE UPDATE ON dk_role_slot
BEGIN SELECT RAISE(ABORT, 'dk_role_slot_append_only: ô tệp theo vai chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER dk_role_slot_no_delete BEFORE DELETE ON dk_role_slot
BEGIN SELECT RAISE(ABORT, 'dk_role_slot_append_only: ô tệp theo vai không xoá'); END;
-- Gieo giữ đúng hành vi trước ADR-0233 (ảnh căn cước tuỳ chọn; GPKD bắt buộc khi có phần tổ chức; giấy phép thêm tuỳ chọn) + hai ô «Tệp khác» tuỳ chọn (Đ2) — chúng chỉ hiện khi chính sách
-- riêng tư hiện hành có dấu `covers_other_files` (Đ3, phần dưới).
-- Sáu câu chèn riêng, KHÔNG ghép UNION ALL: D1 từ chối «too many terms in compound SELECT» (kịch bản Chrome 22/11 bắt được; SQLite của bài kiểm không có giới hạn này).
INSERT INTO dk_role_slot (id, part, role_code, slot, mode, sort_order, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0191-cccd_mat_truoc', 'CA_NHAN', '', 'CCCD_MAT_TRUOC', 'TUY_CHON', 10, '2026-11-21T00:00:00.000Z', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
INSERT INTO dk_role_slot (id, part, role_code, slot, mode, sort_order, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0191-cccd_mat_sau', 'CA_NHAN', '', 'CCCD_MAT_SAU', 'TUY_CHON', 20, '2026-11-21T00:00:00.000Z', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
INSERT INTO dk_role_slot (id, part, role_code, slot, mode, sort_order, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0191-tep_khac', 'CA_NHAN', '', 'TEP_KHAC', 'TUY_CHON', 90, '2026-11-21T00:00:00.000Z', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
INSERT INTO dk_role_slot (id, part, role_code, slot, mode, sort_order, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0191-gpkd', 'TO_CHUC', '', 'GPKD', 'BAT_BUOC', 10, '2026-11-21T00:00:00.000Z', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
INSERT INTO dk_role_slot (id, part, role_code, slot, mode, sort_order, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0191-giay_phep_them', 'TO_CHUC', '', 'GIAY_PHEP_THEM', 'TUY_CHON', 20, '2026-11-21T00:00:00.000Z', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
INSERT INTO dk_role_slot (id, part, role_code, slot, mode, sort_order, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-0191-tep_khac_to_chuc', 'TO_CHUC', '', 'TEP_KHAC_TO_CHUC', 'TUY_CHON', 90, '2026-11-21T00:00:00.000Z', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);

-- ===== parties — dấu «Thu tệp khác» của chính sách riêng tư (ADR-0233 Đ3; Hiến chương 5.21) =====
-- Cùng khuôn `covers_org_data` (0174): bản chính sách tự nói mình đã nêu việc thu tệp tuỳ ý người đăng ký gửi. Bảng chỉ-thêm ⇒ dấu chỉ đặt lúc đăng bản mới; bản cũ giữ 0 = chưa nêu.
ALTER TABLE pty_privacy_policy ADD COLUMN covers_other_files INTEGER NOT NULL DEFAULT 0 CHECK (covers_other_files IN (0, 1));
-- Hai view công bố thêm cột (DROP + CREATE: không sửa 0174 đã áp remote). Giữ nguyên mọi cột cũ.
DROP VIEW v_pty_privacy_current;
CREATE VIEW v_pty_privacy_current AS
SELECT p.id, p.version, p.purposes, p.body, p.valid_from_at, p.covers_org_data, p.covers_other_files
FROM pty_privacy_policy p
ORDER BY p.version DESC
LIMIT 1;
DROP VIEW v_pty_privacy_effective;
CREATE VIEW v_pty_privacy_effective AS
SELECT p.id, p.version, p.valid_from_at, p.covers_org_data, p.covers_other_files
FROM pty_privacy_policy p
WHERE p.valid_from_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
ORDER BY p.version DESC
LIMIT 1;

-- ===== dang-ky — 12 tệp mỗi phiếu (ADR-0233 Đ4) =====
-- Chép dòng ĐANG hiệu lực (không chép số gieo của 0170: production có thể đã có dòng mới hơn — công tắc nhận đăng ký, loại mở), chỉ đổi photo_max_count; không hạ nếu đã ≥ 12.
-- Mốc mới = «bây giờ», hoặc 1 ms sau mốc của dòng đang hiệu lực nếu mốc đó trùng/sau (cột UNIQUE; bảng chỉ thêm). KHÔNG nhảy qua dòng hẹn giờ tương lai: dòng hẹn (vd hẹn đóng
-- đăng ký) vẫn có hiệu lực đúng giờ của nó, không bị dòng này đè (soát độc lập 21/11). Dòng hẹn đó giữ con số tệp của chính nó.
INSERT INTO dk_policy (id, registration_open, open_role_codes, code_digits, code_ttl_minutes, code_max_attempts, ask_per_mailbox, ask_per_network, ask_window_minutes, ask_global_per_hour,
  session_idle_minutes, session_max_hours, draft_expire_days, supplement_expire_days, activation_days, activation_grace_days, photo_max_mb, photo_max_count, anonymize_days, files_per_network_hour,
  phieu_required_items, valid_from_at, created_at, created_by, updated_at, updated_by)
SELECT 'mig-0191', p.registration_open, p.open_role_codes, p.code_digits, p.code_ttl_minutes, p.code_max_attempts, p.ask_per_mailbox, p.ask_per_network, p.ask_window_minutes, p.ask_global_per_hour,
  p.session_idle_minutes, p.session_max_hours, p.draft_expire_days, p.supplement_expire_days, p.activation_days, p.activation_grace_days, p.photo_max_mb, 12, p.anonymize_days, p.files_per_network_hour,
  p.phieu_required_items,
  strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(p.valid_from_at) + 0.001 / 86400.0)),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL
FROM dk_policy p
WHERE p.valid_from_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AND p.photo_max_count < 12
  AND p.valid_from_at = (SELECT max(valid_from_at) FROM dk_policy WHERE valid_from_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
