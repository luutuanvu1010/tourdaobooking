-- Migration 0168 — ADR-0208 (accepted) Đ1, Đ5 + ADR-0210 (accepted) Đ1: tệp chờ của phiếu đăng ký đối tác, mục bắt buộc để được «Đã xác minh», hai view công bố (đợt 1, Task 5). Module parties. CHỈ THÊM.
-- Số: `main` và mọi nhánh / worktree chưa gộp tới 0167 ⇒ 0168.
-- Nội dung tệp KHÔNG nằm trong D1 — ở kho R2 `HO_SO`, khoá `pty/` + 32 hex như pty_attachment (để lúc duyệt dùng lại đúng khoá, không chép tệp). Không lưu tên tệp gốc.
-- storage_key và content_hash là dữ liệu hạng N3 (ảnh giấy tờ — Hiến chương 5.20): KHÔNG BAO GIỜ vào nhật ký, DTO, câu báo lỗi.
-- `registration_id` là mã phiếu do module dang-ky truyền vào — chuỗi, KHÔNG khoá ngoại sang bảng của module khác (ADR-0003). Trigger chỉ đọc bảng pty_*.
-- Chỉ-thêm: không xoá dòng; nội dung bất biến; các mốc đi MỘT chiều (như pty_attachment, thêm mốc «đã chuyển»):
--   stored_at      rỗng → có: đối tượng R2 đã đặt xong (ghi D1 TRƯỚC, đặt R2 SAU).
--   purged_at      rỗng → có, CÙNG LÚC purge_reason và content_hash → rỗng: quyết gỡ đã ghi trong lô D1 (phiếu kết thúc không được duyệt, thay tệp, tải lỗi).
--   r2_deleted_at  rỗng → có, chỉ SAU purged_at: đối tượng R2 đã xoá (việc bên ngoài chạy sau lô — Hiến chương 5.16).
--   transferred_at rỗng → có, CÙNG LÚC content_hash → rỗng: lô duyệt đã chèn dòng pty_attachment dùng lại đúng khoá kho. Dòng đã chuyển KHÔNG bao giờ bị gỡ hay xoá kho từ đây
--                  (khoá kho nay thuộc dòng pty_attachment). Bất biến: một khoá kho không vừa nằm ở dòng chờ chưa chuyển, vừa ở pty_attachment (kiểm R-PTY-DK1).

CREATE TABLE pty_registration_attachment (
  id               TEXT PRIMARY KEY,
  registration_id  TEXT NOT NULL CHECK (length(registration_id) BETWEEN 1 AND 100),
  slot             TEXT NOT NULL CHECK (slot = upper(slot) AND length(slot) BETWEEN 2 AND 40 AND slot NOT GLOB '*[^A-Z0-9_]*'),   -- ô của tệp trong phiếu (vd căn cước mặt trước)
  storage_key      TEXT NOT NULL UNIQUE CHECK (length(storage_key) = 36 AND substr(storage_key, 1, 4) = 'pty/' AND substr(storage_key, 5) NOT GLOB '*[^0-9a-f]*'),
  content_kind     TEXT NOT NULL CHECK (content_kind IN ('jpg', 'png', 'heic', 'pdf')),
  byte_size        INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),   -- 10 MB là TRẦN CẤU TRÚC (khuôn pty_attachment); trần thật 5 MB ở dk_policy.photo_max_mb, bị CHECK ≤ 10 ở 0167
  content_hash     TEXT CHECK (content_hash IS NULL OR (length(content_hash) = 64 AND content_hash NOT GLOB '*[^0-9a-f]*')),
  stored_at        TEXT,
  purged_at        TEXT,
  purge_reason     TEXT CHECK (purge_reason IS NULL OR (purge_reason = upper(purge_reason) AND length(purge_reason) BETWEEN 2 AND 40 AND purge_reason NOT GLOB '*[^A-Z0-9_]*')),
  r2_deleted_at    TEXT,
  transferred_at   TEXT,
  created_at       TEXT NOT NULL,
  created_by       TEXT,                                                   -- mã danh tính của người đăng ký (không khoá ngoại); CHECK bên dưới: không rỗng
  updated_at       TEXT NOT NULL,
  updated_by       TEXT,
  CHECK (created_by IS NOT NULL),
  CHECK ((purged_at IS NULL) = (purge_reason IS NULL)),
  CHECK ((content_hash IS NOT NULL) = (purged_at IS NULL AND transferred_at IS NULL)),
  CHECK (r2_deleted_at IS NULL OR purged_at IS NOT NULL),
  CHECK (transferred_at IS NULL OR (stored_at IS NOT NULL AND purged_at IS NULL))
);
CREATE INDEX pty_registration_attachment_reg_ix ON pty_registration_attachment(registration_id, slot);
CREATE INDEX pty_registration_attachment_cho_ix ON pty_registration_attachment(created_at) WHERE r2_deleted_at IS NULL AND transferred_at IS NULL AND (purged_at IS NOT NULL OR stored_at IS NULL);

CREATE TRIGGER pty_registration_attachment_no_delete BEFORE DELETE ON pty_registration_attachment
BEGIN SELECT RAISE(ABORT, 'registration_attachment_no_delete: tệp chờ không xoá dòng — quyết gỡ bằng purged_at'); END;
CREATE TRIGGER pty_registration_attachment_no_replace BEFORE INSERT ON pty_registration_attachment
WHEN EXISTS (SELECT 1 FROM pty_registration_attachment a WHERE a.id = NEW.id OR a.storage_key = NEW.storage_key)
BEGIN SELECT RAISE(ABORT, 'registration_attachment_no_replace: UNIQUE — id hoặc khoá kho đã có, không ghi đè dòng tệp chờ'); END;
CREATE TRIGGER pty_registration_attachment_insert_clean BEFORE INSERT ON pty_registration_attachment
WHEN NEW.stored_at IS NOT NULL OR NEW.purged_at IS NOT NULL OR NEW.r2_deleted_at IS NOT NULL OR NEW.transferred_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'registration_attachment_insert_clean: dòng tệp chờ mới phải ở trạng thái chưa lưu, chưa gỡ, chưa chuyển'); END;
CREATE TRIGGER pty_registration_attachment_identity BEFORE UPDATE ON pty_registration_attachment
WHEN NEW.id IS NOT OLD.id OR NEW.registration_id IS NOT OLD.registration_id OR NEW.slot IS NOT OLD.slot OR NEW.storage_key IS NOT OLD.storage_key
  OR NEW.content_kind IS NOT OLD.content_kind OR NEW.byte_size IS NOT OLD.byte_size OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'registration_attachment_identity: không đổi phiếu, ô, khoá kho, loại, cỡ, mốc tạo của tệp chờ'); END;
CREATE TRIGGER pty_registration_attachment_hash_one_way BEFORE UPDATE OF content_hash ON pty_registration_attachment
WHEN NEW.content_hash IS NOT NULL AND NEW.content_hash IS NOT OLD.content_hash
BEGIN SELECT RAISE(ABORT, 'registration_attachment_hash_one_way: băm của tệp chờ chỉ được xoá về rỗng (khi gỡ hoặc chuyển)'); END;
CREATE TRIGGER pty_registration_attachment_purge_one_way BEFORE UPDATE ON pty_registration_attachment
WHEN (OLD.purged_at IS NOT NULL AND (NEW.purged_at IS NOT OLD.purged_at OR NEW.purge_reason IS NOT OLD.purge_reason))
  OR (OLD.r2_deleted_at IS NOT NULL AND NEW.r2_deleted_at IS NOT OLD.r2_deleted_at)
  OR (OLD.r2_deleted_at IS NULL AND NEW.r2_deleted_at IS NOT NULL AND OLD.purged_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'registration_attachment_purge_one_way: quyết gỡ và đã-xoá-khỏi-kho chỉ đi một chiều; đã-xoá-khỏi-kho chỉ sau khi quyết gỡ'); END;
CREATE TRIGGER pty_registration_attachment_store_one_way BEFORE UPDATE OF stored_at ON pty_registration_attachment
WHEN (OLD.stored_at IS NOT NULL AND NEW.stored_at IS NOT OLD.stored_at) OR (OLD.stored_at IS NULL AND NEW.stored_at IS NOT NULL AND (OLD.purged_at IS NOT NULL OR OLD.transferred_at IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'registration_attachment_store_one_way: mốc đã lưu chỉ đặt một lần, và không đặt cho tệp đã quyết gỡ'); END;
CREATE TRIGGER pty_registration_attachment_transfer_one_way BEFORE UPDATE OF transferred_at ON pty_registration_attachment
WHEN (OLD.transferred_at IS NOT NULL AND NEW.transferred_at IS NOT OLD.transferred_at)
  OR (OLD.transferred_at IS NULL AND NEW.transferred_at IS NOT NULL AND (OLD.stored_at IS NULL OR OLD.purged_at IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'registration_attachment_transfer_one_way: mốc đã chuyển chỉ đặt một lần, chỉ cho tệp đã lưu và chưa gỡ'); END;
CREATE TRIGGER pty_registration_attachment_no_purge_after_transfer BEFORE UPDATE OF purged_at ON pty_registration_attachment
WHEN OLD.transferred_at IS NOT NULL AND NEW.purged_at IS NOT OLD.purged_at
BEGIN SELECT RAISE(ABORT, 'registration_attachment_transferred: khoá kho đã thuộc dòng tệp của hồ sơ — không gỡ qua dòng chờ'); END;

-- Mục bắt buộc để hồ sơ được «Đã xác minh» (ADR-0210 Đ1). CHỈ THÊM. Một «bản danh sách» = mọi dòng cùng (loại hồ sơ, valid_from_at); bản hiệu lực = bản có valid_from_at lớn nhất ≤ lúc xét
-- (view bên dưới). Bỏ một mục = thêm bản mới không có mục đó. Mã chỉ chọn trong TẬP ĐÓNG mà phiếu đăng ký đã có ô để khai (src/shared/dau-xac-minh.ts, MUC_XAC_MINH_MO; bài đối chiếu hai bên):
-- thêm mục ngoài tập = sửa mã thêm ô vào phiếu TRƯỚC, rồi tạo lại trigger này.
CREATE TABLE pty_verification_requirement (
  id             TEXT PRIMARY KEY,
  subject_kind   TEXT NOT NULL CHECK (subject_kind IN ('PERSON', 'ORGANIZATION')),
  item_kind      TEXT NOT NULL CHECK (item_kind IN ('ATTRIBUTE', 'DOCUMENT')),
  item_code      TEXT NOT NULL CHECK (item_code = upper(item_code) AND length(item_code) BETWEEN 2 AND 40 AND item_code NOT GLOB '*[^A-Z0-9_]*'),
  valid_from_at  TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  UNIQUE (subject_kind, valid_from_at, item_kind, item_code)
);
CREATE INDEX pty_verification_requirement_ix ON pty_verification_requirement(subject_kind, valid_from_at);
CREATE TRIGGER pty_verification_requirement_no_update BEFORE UPDATE ON pty_verification_requirement
BEGIN SELECT RAISE(ABORT, 'verification_requirement_append_only: mục bắt buộc chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER pty_verification_requirement_no_delete BEFORE DELETE ON pty_verification_requirement
BEGIN SELECT RAISE(ABORT, 'verification_requirement_append_only: mục bắt buộc không xoá'); END;
CREATE TRIGGER pty_verification_requirement_item_closed BEFORE INSERT ON pty_verification_requirement
WHEN NOT ((NEW.item_kind = 'ATTRIBUTE' AND NEW.item_code IN ('HO_TEN', 'NGAY_SINH')) OR (NEW.item_kind = 'DOCUMENT' AND NEW.item_code IN ('CCCD')))
  AND NEW.item_code = upper(NEW.item_code) AND length(NEW.item_code) BETWEEN 2 AND 40 AND NEW.item_code NOT GLOB '*[^A-Z0-9_]*'   -- sai khuôn thì để CHECK báo (trigger BEFORE chạy trước CHECK)
BEGIN SELECT RAISE(ABORT, 'verification_requirement_item_closed: mục này chưa có ô khai trong phiếu đăng ký — thêm ô vào phiếu trước'); END;
-- Mặc định đề xuất cho CÁ NHÂN (ADR-0210 Đ1): họ tên, ngày sinh, một căn cước còn hiệu lực. Danh sách cho tổ chức để đợt 2 đặt.
INSERT INTO pty_verification_requirement (id, subject_kind, item_kind, item_code, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES
  ('gieo-0168-ho-ten',    'PERSON', 'ATTRIBUTE', 'HO_TEN',    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL),
  ('gieo-0168-ngay-sinh', 'PERSON', 'ATTRIBUTE', 'NGAY_SINH', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL),
  ('gieo-0168-cccd',      'PERSON', 'DOCUMENT',  'CCCD',      strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);

-- View công bố 1 (ADR-0210 Đ1, ADR-0002 đ3): danh sách mục bắt buộc ĐANG hiệu lực theo từng loại hồ sơ. Module khác (dang-ky, accounts) đọc view này, không đọc bảng.
CREATE VIEW v_pty_verification_requirement AS
SELECT r.subject_kind, r.item_kind, r.item_code, r.valid_from_at
FROM pty_verification_requirement r
WHERE r.valid_from_at = (SELECT MAX(x.valid_from_at) FROM pty_verification_requirement x
                         WHERE x.subject_kind = r.subject_kind AND x.valid_from_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

-- View công bố 2: phiên bản chính sách quyền riêng tư MỚI NHẤT (cùng nghĩa «hiện hành» với trigger của phiếu tự khai: version lớn nhất). Phiếu đăng ký ghi policy_id này lúc người đăng ký đồng ý.
CREATE VIEW v_pty_privacy_current AS
SELECT p.id, p.version, p.purposes, p.body, p.valid_from_at
FROM pty_privacy_policy p
ORDER BY p.version DESC
LIMIT 1;

-- View công bố 3: phiên bản chính sách riêng tư ĐANG CÓ HIỆU LỰC (valid_from_at <= bây giờ, version lớn nhất) — cùng nghĩa «hiện hành» với `chinhSachRiengTuCongKhai` (GET cau-hinh, GET chinh-sach-rieng-tu)
-- và hàm CURRENT_POLICY của parties. Khác view trên ở chỗ bản có ngày hiệu lực ở tương lai KHÔNG tính: phiếu đăng ký ghi policy_id từ view này, nên đồng ý đúng bản mà người đăng ký đang thấy (đợt 1 Task 4, vòng sửa 1).
CREATE VIEW v_pty_privacy_effective AS
SELECT p.id, p.version, p.valid_from_at
FROM pty_privacy_policy p
WHERE p.valid_from_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
ORDER BY p.version DESC
LIMIT 1;

-- Bộ đếm tệp tải lên mỗi giờ mỗi địa chỉ mạng (ADR-0208 Đ2, dk_policy.files_per_network_hour). Module dang-ky; để CHUNG tệp migration này vì route tải tệp ra đời cùng Task 5.
-- Không dùng `login_attempt` của auth: cửa sổ ở đó cố định 15 phút và mỗi lần đặt chỗ xoá dòng quá 15 phút của MỌI khoá. Đếm theo cửa sổ `at_ms`; dòng ra khỏi cửa sổ một giờ bị tác nhân
-- dọn phiếu XOÁ (bảng kỹ thuật như dk_email_code — ngoại lệ có tên XOA_CUNG_KY_THUAT của R-N1-9 ở src/architecture.test.ts, đợt 1 Task 9, chờ chủ duyệt).
-- ip_key là địa chỉ mạng (N2): không vào nhật ký, DTO, câu báo lỗi.
CREATE TABLE dk_upload_attempt (
  id          TEXT PRIMARY KEY,
  ip_key      TEXT NOT NULL CHECK (length(ip_key) BETWEEN 1 AND 100),
  at_ms       INTEGER NOT NULL,
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
CREATE INDEX dk_upload_attempt_ix ON dk_upload_attempt(ip_key, at_ms);

-- Cổng trạng thái của lệnh «thêm tệp» (ADR-0208 Đ2): dòng lịch sử THEM_TEP là câu CUỐI trong lô tải (sau câu chèn tệp của parties); phiếu không còn ở ĐANG ĐIỀN / CẦN BỔ SUNG thì trigger làm hỏng
-- CẢ LÔ (D1 hoàn tác), nên dòng tệp vừa chèn cũng mất — parties không phải đọc bảng dk_. Trigger chỉ đọc bảng dk_*.
CREATE TRIGGER dk_event_tep_status BEFORE INSERT ON dk_event
WHEN NEW.command = 'THEM_TEP' AND NOT EXISTS (SELECT 1 FROM dk_registration r WHERE r.id = NEW.registration_id AND r.status IN ('DANG_DIEN', 'CAN_BO_SUNG'))
BEGIN SELECT RAISE(ABORT, 'dk_event_tep_status: phiếu không còn nhận tệp (chỉ khi đang điền hoặc cần bổ sung)'); END;

-- Loại quan hệ «Người giới thiệu của» (ADR-0207 Đ2 mục 5, Đ5 câu 9; đợt 1 Task 8): chiều đọc như CONTACT_OF / DRIVES_FOR — from = người giới thiệu, to = hồ sơ được giới thiệu. Chỉ ghi nhận, không sinh tiền.
INSERT INTO pty_relationship_type (code, name, sort_order) VALUES ('REFERRED_BY', 'Người giới thiệu của', 3);

-- View công bố 4 (ADR-0210 Đ2, Task 10): DỮ KIỆN xác minh theo TỪNG mục bắt buộc của MỖI hồ sơ — hàm thuần `tinhDauXacMinh` (src/shared/dau-xac-minh.ts) đổi dữ kiện thành ba dấu; view không tự
-- tính dấu vì SQLite không nhận tham số ngày (so hạn căn cước với `vnToday`). KHÔNG số giấy tờ, KHÔNG dữ liệu cá nhân. Hồ sơ đã gộp (`merged_into_id`) lấy dữ kiện của hồ sơ chính (`party_id` vẫn là hồ sơ hỏi).
-- Loại hồ sơ chưa có mục bắt buộc (tổ chức) vẫn ra MỘT hàng với item_kind NULL, để cờ vai đối tác không mất. `is_partner`: mang vai đối tác đang mở (v_pty_party_partner_label). `anonymized`: đã có lệnh xoá DA_THUC_HIEN.
-- Giấy tờ hiện hành = dòng cùng loại chưa huỷ, chưa ẩn danh, chưa có dòng gia hạn chưa huỷ nối tiếp. `ever_passed`: từng có «đạt» (mục thuộc tính; hoặc dòng giấy tờ BẤT KỲ cùng loại của hồ sơ).
-- Dấu CHỈ ĐỂ BIẾT (Đ5): chỉ ba màn ở Đ3 đọc view này; không luật đơn, tiền, đăng nhập nào đọc (bài src/dau-xac-minh-chi-de-biet.test.ts).
CREATE VIEW v_pty_verification_facts AS
SELECT x.party_id, x.subject_kind, x.item_kind, x.item_code, x.is_partner, x.anonymized, x.doc_id, d.expiry_date,
  CASE x.item_kind
    WHEN 'ATTRIBUTE' THEN (SELECT v.outcome FROM pty_verification v WHERE v.party_id = x.eff_id AND v.target_kind = 'ATTRIBUTE' AND v.attribute_code = x.item_code
                            ORDER BY v.created_at DESC, v.rowid DESC LIMIT 1)
    WHEN 'DOCUMENT' THEN (SELECT v.outcome FROM pty_verification v WHERE v.party_id = x.eff_id AND v.target_kind = 'PERSON_DOCUMENT' AND v.target_id = x.doc_id
                           ORDER BY v.created_at DESC, v.rowid DESC LIMIT 1)
  END AS last_outcome,
  CASE x.item_kind
    WHEN 'ATTRIBUTE' THEN EXISTS (SELECT 1 FROM pty_verification v WHERE v.party_id = x.eff_id AND v.target_kind = 'ATTRIBUTE' AND v.attribute_code = x.item_code AND v.outcome = 'DA_XAC_MINH')
    WHEN 'DOCUMENT' THEN EXISTS (SELECT 1 FROM pty_verification v JOIN pty_person_document g ON g.id = v.target_id
                                  WHERE v.party_id = x.eff_id AND v.target_kind = 'PERSON_DOCUMENT' AND v.outcome = 'DA_XAC_MINH' AND g.document_type_code = x.item_code)
    ELSE 0
  END AS ever_passed
FROM (
  SELECT p.id AS party_id, COALESCE(p.merged_into_id, p.id) AS eff_id, p.party_kind AS subject_kind, r.item_kind, r.item_code,
    EXISTS (SELECT 1 FROM v_pty_party_partner_label l WHERE l.party_id IN (p.id, COALESCE(p.merged_into_id, p.id))) AS is_partner,
    EXISTS (SELECT 1 FROM pty_erasure_request e WHERE e.party_id = COALESCE(p.merged_into_id, p.id) AND e.status = 'DA_THUC_HIEN') AS anonymized,
    CASE WHEN r.item_kind = 'DOCUMENT' THEN
      (SELECT g.id FROM pty_person_document g
        WHERE g.party_id = COALESCE(p.merged_into_id, p.id) AND g.document_type_code = r.item_code AND g.voided_at IS NULL AND g.erased_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM pty_person_document n WHERE n.previous_id = g.id AND n.voided_at IS NULL)
        ORDER BY g.created_at DESC, g.id DESC LIMIT 1)
    END AS doc_id
  FROM pty_party p LEFT JOIN v_pty_verification_requirement r ON r.subject_kind = p.party_kind
) x LEFT JOIN pty_person_document d ON d.id = x.doc_id;

-- Đ1b (ADR-0210, Task 10): đổi họ tên của hồ sơ cá nhân đã xác minh ⇒ «cần xác minh lại» cho mục HO_TEN, trong CÙNG câu sửa, MỌI đường (sửa hồ sơ, đổi tên tài khoản, đường nào thêm sau này).
-- Cơ chế là trigger vì có hai câu sửa tên riêng (UPDATE_PERSON, RENAME_PERSON) và sẽ có thêm; một chỗ giữ luật thì không đường nào lọt. Chỉ ghi khi tên THẬT SỰ đổi và kết luận mới nhất của HO_TEN đang là «đạt»
-- (như ngày sinh: đã cần lại / từ chối thì không thêm). Câu ẩn danh (AN_DANH_NGUOI) đánh dấu mọi mục trước khi sửa tên nên không ghi trùng.
CREATE TRIGGER pty_person_name_reverify AFTER UPDATE OF family_name, middle_name, given_name ON pty_person
WHEN (OLD.family_name IS NOT NEW.family_name OR OLD.middle_name IS NOT NEW.middle_name OR OLD.given_name IS NOT NEW.given_name)
  AND (SELECT v.outcome FROM pty_verification v WHERE v.party_id = NEW.party_id AND v.target_kind = 'ATTRIBUTE' AND v.attribute_code = 'HO_TEN' ORDER BY v.created_at DESC, v.rowid DESC LIMIT 1) = 'DA_XAC_MINH'
BEGIN
  INSERT INTO pty_verification (id, party_id, target_kind, target_id, attribute_code, outcome, reason_code, verifier_touched_account, created_at, created_by, updated_at, updated_by)
  VALUES (lower(hex(randomblob(16))), NEW.party_id, 'ATTRIBUTE', NULL, 'HO_TEN', 'CAN_XAC_MINH_LAI', NULL, 0, NEW.updated_at, NEW.updated_by, NEW.updated_at, NEW.updated_by);
END;
