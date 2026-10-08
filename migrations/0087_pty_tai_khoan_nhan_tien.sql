-- Migration 0087 — TÀI KHOẢN NHẬN TIỀN CỦA CÔNG TY CHỦ (ADR-0108 đ2; đặc tả docs/superpowers/specs/2026-10-08-qr-thanh-toan/README.md §4.1, §6).
-- Module `parties`. Chỉ THÊM: bảng tra cứu ngân hàng + bảng tài khoản (chính sách có hiệu lực, Hiến chương 5.2). Đổi tài khoản = đóng dòng cũ (valid_to) + mở
-- dòng mới trong MỘT lô (route PUT /api/parties/:id/tai-khoan-nhan-tien). Thân trigger chỉ đọc bảng pty_ (module chủ). Câu báo lỗi có tiền tố mã.

-- Ngân hàng Việt Nam (mã, BIN 6 số của NAPAS). Nguồn: danh sách công khai https://api.vietqr.io/v2/banks, đối chiếu ngày 2026-10-08.
-- Đây KHÔNG phải văn bản NAPAS: kiểm thật là chủ dự án quét mã bằng ≥ 2 ứng dụng ngân hàng (đặc tả §8.6). Thêm ngân hàng = migration mới, không sửa tệp này.
CREATE TABLE pty_bank (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  bin        TEXT NOT NULL UNIQUE CHECK (length(bin) = 6 AND bin NOT GLOB '*[^0-9]*'),
  short_name TEXT NOT NULL,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO pty_bank (code, bin, short_name, name, sort_order) VALUES
  ('VCB', '970436', 'Vietcombank', 'Ngân hàng TMCP Ngoại Thương Việt Nam', 1),
  ('ICB', '970415', 'VietinBank', 'Ngân hàng TMCP Công thương Việt Nam', 2),
  ('BIDV', '970418', 'BIDV', 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', 3),
  ('VBA', '970405', 'Agribank', 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', 4),
  ('TCB', '970407', 'Techcombank', 'Ngân hàng TMCP Kỹ thương Việt Nam', 5),
  ('MB', '970422', 'MBBank', 'Ngân hàng TMCP Quân đội', 6),
  ('ACB', '970416', 'ACB', 'Ngân hàng TMCP Á Châu', 7),
  ('VPB', '970432', 'VPBank', 'Ngân hàng TMCP Việt Nam Thịnh Vượng', 8),
  ('TPB', '970423', 'TPBank', 'Ngân hàng TMCP Tiên Phong', 9),
  ('STB', '970403', 'Sacombank', 'Ngân hàng TMCP Sài Gòn Thương Tín', 10),
  ('HDB', '970437', 'HDBank', 'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh', 11),
  ('VIB', '970441', 'VIB', 'Ngân hàng TMCP Quốc tế Việt Nam', 12),
  ('SHB', '970443', 'SHB', 'Ngân hàng TMCP Sài Gòn - Hà Nội', 13),
  ('EIB', '970431', 'Eximbank', 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam', 14),
  ('MSB', '970426', 'MSB', 'Ngân hàng TMCP Hàng Hải Việt Nam', 15),
  ('SEAB', '970440', 'SeABank', 'Ngân hàng TMCP Đông Nam Á', 16),
  ('OCB', '970448', 'OCB', 'Ngân hàng TMCP Phương Đông', 17),
  ('LPB', '970449', 'LPBank', 'Ngân hàng TMCP Lộc Phát Việt Nam', 18),
  ('NAB', '970428', 'NamABank', 'Ngân hàng TMCP Nam Á', 19),
  ('BAB', '970409', 'BacABank', 'Ngân hàng TMCP Bắc Á', 20),
  ('ABB', '970425', 'ABBANK', 'Ngân hàng TMCP An Bình', 21),
  ('VCCB', '970454', 'VietCapitalBank', 'Ngân hàng TMCP Bản Việt', 22),
  ('PVCB', '970412', 'PVcomBank', 'Ngân hàng TMCP Đại Chúng Việt Nam', 23),
  ('KLB', '970452', 'KienLongBank', 'Ngân hàng TMCP Kiên Long', 24),
  ('VIETBANK', '970433', 'VietBank', 'Ngân hàng TMCP Việt Nam Thương Tín', 25),
  ('NCB', '970419', 'NCB', 'Ngân hàng TMCP Quốc Dân', 26),
  ('SGICB', '970400', 'SaigonBank', 'Ngân hàng TMCP Sài Gòn Công Thương', 27),
  ('BVB', '970438', 'BaoVietBank', 'Ngân hàng TMCP Bảo Việt', 28),
  ('PGB', '970430', 'PGBank', 'Ngân hàng TMCP Thịnh vượng và Phát triển', 29),
  ('SCB', '970429', 'SCB', 'Ngân hàng TMCP Sài Gòn', 30);

-- Tài khoản nhận tiền: mỗi hồ sơ tối đa MỘT dòng mở. Lịch sử số nằm trong chính bảng này (nhật ký KHÔNG chép số — Hiến chương 5.12).
CREATE TABLE pty_bank_account (
  id             TEXT PRIMARY KEY,
  party_id       TEXT NOT NULL REFERENCES pty_party(id),
  bank_code      TEXT NOT NULL REFERENCES pty_bank(code),
  account_number TEXT NOT NULL CHECK (length(account_number) BETWEEN 4 AND 19 AND account_number NOT GLOB '*[^0-9]*'),
  account_name   TEXT NOT NULL CHECK (length(account_name) BETWEEN 2 AND 100 AND account_name NOT GLOB '*[^A-Z0-9 ]*'),
  valid_from     TEXT NOT NULL,
  valid_to       TEXT CHECK (valid_to IS NULL OR valid_to >= valid_from),
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT
);
CREATE INDEX pty_bank_account_party_ix ON pty_bank_account(party_id);
CREATE UNIQUE INDEX pty_bank_account_one_open ON pty_bank_account(party_id) WHERE valid_to IS NULL;

-- Chỉ hồ sơ ĐANG mở vai "Công ty chủ" (cùng định nghĩa view v_pty_owner_company) được thêm tài khoản. Vai ở đây là điều kiện DỮ LIỆU, không phải điều kiện quyền.
CREATE TRIGGER pty_bank_account_owner_only BEFORE INSERT ON pty_bank_account
WHEN NOT EXISTS (SELECT 1 FROM pty_party_role r WHERE r.party_id = NEW.party_id AND r.role_type_code = 'OWNER_COMPANY' AND r.valid_to_date IS NULL)
BEGIN SELECT RAISE(ABORT, 'bank_account_not_owner: chỉ hồ sơ đang là công ty chủ có tài khoản nhận tiền'); END;

-- Chỉ được ĐÓNG (đặt valid_to một lần); mọi cột khác giữ nguyên. Đổi tài khoản = mở dòng mới.
CREATE TRIGGER pty_bank_account_close_only BEFORE UPDATE ON pty_bank_account
WHEN OLD.valid_to IS NOT NULL OR NEW.valid_to IS NULL OR NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.bank_code IS NOT OLD.bank_code
  OR NEW.account_number IS NOT OLD.account_number OR NEW.account_name IS NOT OLD.account_name OR NEW.valid_from IS NOT OLD.valid_from
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'bank_account_append_only: tài khoản nhận tiền chỉ được đóng một lần — đổi tài khoản thì mở dòng mới'); END;
CREATE TRIGGER pty_bank_account_no_delete BEFORE DELETE ON pty_bank_account
BEGIN SELECT RAISE(ABORT, 'bank_account_append_only: không xoá tài khoản nhận tiền'); END;
