-- Migration 0176 — ADR-0213 Đ7 (chủ duyệt 2026-11-16): mốc B2 đợt 2 đăng ký đối tác, Task 15 «Mã vào tổ chức». Số 0176: B1 (0175) là số lớn nhất ở mọi nhánh lúc đặt.
-- CHỈ THÊM bảng, chỉ mục, trigger, một dòng chính sách gieo, một cột. Không sửa dòng dữ liệu cũ nào. Thân trigger chỉ đọc bảng cùng module (Hiến chương 5.3).
-- Mỗi trigger một câu RAISE, câu báo có tiền tố mã. Tệp KHÔNG tự mở/đóng giao dịch. Không `CASE … END)` trong thân trigger.

-- ===== parties: lời mời vào tổ chức theo số điện thoại (Đ7.2) ===========================================================================================
-- id = mã định danh tiền tố MV (Hiến chương 5.26, src/shared/ma-dinh-danh.ts). Mã 8 ký tự KHÔNG BAO GIỜ lưu — chỉ bản băm có khoá (code_hash, N4).
-- phone_key = số đã chuẩn hoá (normalizePhone) của người được mời; sau khi lời mời kết thúc quá 30 ngày thì thay bằng dấu ẩn danh, erased_at ghi lúc ẩn (tác nhân DON_PHIEU_DANG_KY).
-- Trạng thái (tập đóng): MO (mở) · GIU_CHO_PHIEU (đang giữ cho một phiếu đăng ký, không hết hạn trong lúc giữ) · DA_DUNG · DA_HUY · HET_HAN.
-- held_registration_id, created_by, used_by_staff_id, cancelled_by: mã phiếu / mã tài khoản, KHÔNG khoá ngoại (parties không phụ thuộc dang-ky, staff — như created_by).
CREATE TABLE pty_org_invite (
  id                   TEXT PRIMARY KEY,
  org_party_id         TEXT NOT NULL REFERENCES pty_party(id),
  phone_key            TEXT NOT NULL,
  code_hash            TEXT NOT NULL,
  status               TEXT NOT NULL CHECK (status IN ('MO', 'GIU_CHO_PHIEU', 'DA_DUNG', 'DA_HUY', 'HET_HAN')),
  expires_at           TEXT NOT NULL,
  held_registration_id TEXT,
  used_by_staff_id     TEXT,
  used_at              TEXT,
  cancelled_by         TEXT,
  cancelled_at         TEXT,
  erased_at            TEXT,
  created_at           TEXT NOT NULL,
  created_by           TEXT,
  updated_at           TEXT NOT NULL,
  updated_by           TEXT
);
CREATE UNIQUE INDEX pty_org_invite_code_uq ON pty_org_invite(code_hash);
CREATE INDEX pty_org_invite_org_ix ON pty_org_invite(org_party_id, status, created_at);
CREATE INDEX pty_org_invite_phone_ix ON pty_org_invite(phone_key, created_at);
CREATE INDEX pty_org_invite_held_ix ON pty_org_invite(held_registration_id);
-- Lời mời mới luôn MỞ, chưa giữ, chưa dùng, chưa huỷ, chưa ẩn.
CREATE TRIGGER pty_org_invite_insert_open BEFORE INSERT ON pty_org_invite
WHEN NEW.status <> 'MO' OR NEW.held_registration_id IS NOT NULL OR NEW.used_by_staff_id IS NOT NULL OR NEW.used_at IS NOT NULL
  OR NEW.cancelled_by IS NOT NULL OR NEW.cancelled_at IS NOT NULL OR NEW.erased_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'pty_org_invite_insert_open: lời mời mới phải ở trạng thái mở'); END;
-- Cột gốc không đổi; số điện thoại chỉ đổi đúng một lần, trong câu ẩn danh (erased_at từ rỗng sang có); đã ẩn thì không đổi nữa.
CREATE TRIGGER pty_org_invite_fixed BEFORE UPDATE ON pty_org_invite
WHEN NEW.id IS NOT OLD.id OR NEW.org_party_id IS NOT OLD.org_party_id OR NEW.code_hash IS NOT OLD.code_hash OR NEW.expires_at IS NOT OLD.expires_at
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR (NEW.phone_key IS NOT OLD.phone_key AND NOT (OLD.erased_at IS NULL AND NEW.erased_at IS NOT NULL))
  OR (OLD.erased_at IS NOT NULL AND NEW.erased_at IS NOT OLD.erased_at)
BEGIN SELECT RAISE(ABORT, 'pty_org_invite_fixed: cột gốc của lời mời không sửa; số điện thoại chỉ thay một lần khi ẩn danh'); END;
-- Chuyển một chiều: MO → giữ / dùng / huỷ / hết hạn; GIU_CHO_PHIEU → mở lại (bỏ giữ chỗ khi còn hạn) / dùng / huỷ / hết hạn. Ba trạng thái cuối không đổi.
-- status NULL bỏ qua ở đây: đó là lính gác NULL-on-invalid của câu ghi (src/modules/parties/repository.ts) — ràng buộc NOT NULL của cột làm câu hỏng với lỗi nhận ra được.
CREATE TRIGGER pty_org_invite_transition BEFORE UPDATE OF status ON pty_org_invite
WHEN NEW.status IS NOT NULL AND NEW.status IS NOT OLD.status AND NOT (
     (OLD.status = 'MO' AND NEW.status IN ('GIU_CHO_PHIEU', 'DA_DUNG', 'DA_HUY', 'HET_HAN'))
  OR (OLD.status = 'GIU_CHO_PHIEU' AND NEW.status IN ('MO', 'DA_DUNG', 'DA_HUY', 'HET_HAN')))
BEGIN SELECT RAISE(ABORT, 'pty_org_invite_transition: chuyển trạng thái lời mời trái chiều'); END;
-- Hình dạng theo trạng thái: giữ chỗ phải có phiếu, mở thì không; đã dùng / đã huỷ phải có người và giờ (ghi một lần); chỉ ẩn danh lời mời đã kết thúc; ba trạng thái cuối không đổi phiếu giữ.
CREATE TRIGGER pty_org_invite_shape BEFORE UPDATE ON pty_org_invite
WHEN (NEW.status = 'GIU_CHO_PHIEU' AND NEW.held_registration_id IS NULL)
  OR (NEW.status = 'MO' AND NEW.held_registration_id IS NOT NULL)
  OR (NEW.status = 'DA_DUNG' AND (NEW.used_by_staff_id IS NULL OR NEW.used_at IS NULL))
  OR (NEW.status = 'DA_HUY' AND (NEW.cancelled_by IS NULL OR NEW.cancelled_at IS NULL))
  OR (NEW.erased_at IS NOT NULL AND NEW.status IN ('MO', 'GIU_CHO_PHIEU'))
  OR (OLD.used_at IS NOT NULL AND (NEW.used_at IS NOT OLD.used_at OR NEW.used_by_staff_id IS NOT OLD.used_by_staff_id))
  OR (OLD.cancelled_at IS NOT NULL AND (NEW.cancelled_at IS NOT OLD.cancelled_at OR NEW.cancelled_by IS NOT OLD.cancelled_by))
  OR (OLD.status IN ('DA_DUNG', 'DA_HUY', 'HET_HAN') AND NEW.held_registration_id IS NOT OLD.held_registration_id)
BEGIN SELECT RAISE(ABORT, 'pty_org_invite_shape: trạng thái lời mời và cột đi kèm không khớp'); END;
CREATE TRIGGER pty_org_invite_no_delete BEFORE DELETE ON pty_org_invite
BEGIN SELECT RAISE(ABORT, 'pty_org_invite_no_delete: không xoá lời mời'); END;

-- Trần của lời mời (Đ7.3 — dữ liệu chính sách, con số đề xuất của ADR). Chỉ thêm dòng; dòng hiện hành = valid_from_at mới nhất không quá lúc xét.
CREATE TABLE pty_org_invite_policy (
  id                TEXT PRIMARY KEY,
  per_org_per_day   INTEGER NOT NULL CHECK (per_org_per_day > 0),
  open_per_org      INTEGER NOT NULL CHECK (open_per_org > 0),
  per_phone_per_day INTEGER NOT NULL CHECK (per_phone_per_day > 0),
  code_days         INTEGER NOT NULL CHECK (code_days > 0),
  wrong_per_hour    INTEGER NOT NULL CHECK (wrong_per_hour > 0),
  valid_from_at     TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  created_by        TEXT,
  updated_at        TEXT NOT NULL,
  updated_by        TEXT
);
CREATE TRIGGER pty_org_invite_policy_no_update BEFORE UPDATE ON pty_org_invite_policy
BEGIN SELECT RAISE(ABORT, 'pty_org_invite_policy_append_only: chính sách lời mời chỉ thêm dòng mới'); END;
CREATE TRIGGER pty_org_invite_policy_no_delete BEFORE DELETE ON pty_org_invite_policy
BEGIN SELECT RAISE(ABORT, 'pty_org_invite_policy_append_only: chính sách lời mời chỉ thêm dòng mới'); END;
INSERT INTO pty_org_invite_policy (id, per_org_per_day, open_per_org, per_phone_per_day, code_days, wrong_per_hour, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('mv-chinh-sach-1', 10, 20, 3, 7, 5, '2026-11-16T00:00:00.000Z', '2026-11-16T00:00:00.000Z', NULL, '2026-11-16T00:00:00.000Z', NULL);

-- ===== dang-ky: mã định danh lời mời mà phiếu đang dùng (Đ7.5) — phiếu KHÔNG lưu mã, chỉ id lời mời (tham chiếu logic, không khoá ngoại) ====================
ALTER TABLE dk_registration ADD COLUMN invite_id TEXT;
