-- Migration 0131 — KHO VÉ ĐIỆN TỬ (ADR-0153 Đ1, đã duyệt 31/10; đặc tả docs/superpowers/specs/2026-10-31-ve-dien-tu-design.md §5.1; kế hoạch Task 1).
-- Chỉ THÊM năm bảng của module `ve-dien-tu` (tiền tố vdt_) và trigger. Không đụng bảng cũ, không gieo dữ liệu. Số 0131: main dừng ở 0130 (31/10), không nhánh chưa gộp nào giữ số lớn hơn.
-- Mã vé (`ticket_code`), nội dung QR, khoá kho (`storage_key`) KHÔNG BAO GIỜ vào nhật ký, phản hồi ghi, câu lỗi (kiểm ở mã + bài khoá).
-- Cột `catalog_code`, `order_id`, `order_service_id` là tham chiếu LOGIC sang catalog / orders (không khoá ngoại xuyên module; mã kiểm). Chỉ chạm module khác qua view công bố ở bản sau.
-- HOÀN TÁC: D1 không có "down". Bảng rỗng không ảnh hưởng mã cũ; muốn gỡ thì một migration SAU bỏ trigger / bảng khi chưa có dữ liệu.

-- ===== Lô nhập: MỘT dịch vụ (mã tour) + MỘT nhóm khách, chọn một lần cho cả lô ======================================================================
CREATE TABLE vdt_batch (
  id           TEXT PRIMARY KEY,
  catalog_code TEXT NOT NULL,
  pax_group    TEXT NOT NULL CHECK (pax_group IN ('ADULT', 'CHILD', 'SENIOR')),
  printed_name TEXT NOT NULL CHECK (length(printed_name) BETWEEN 1 AND 200),
  status       TEXT NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'VOID')),
  created_at   TEXT NOT NULL,
  created_by   TEXT,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT
);
CREATE TRIGGER vdt_batch_no_delete BEFORE DELETE ON vdt_batch
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: lô vé không xoá được — vô hiệu lô'); END;
CREATE TRIGGER vdt_batch_keep_key BEFORE UPDATE ON vdt_batch
WHEN NEW.id IS NOT OLD.id OR NEW.pax_group IS NOT OLD.pax_group OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: không đổi mã lô, nhóm khách hay dấu vết tạo của lô'); END;

-- Trạng thái lô một chiều: VOID là cuối (lô đã vô hiệu không sống lại). Mã tour chỉ sửa được khi CHƯA vé nào của lô từng được giữ chỗ (đặc tả §7b.2).
CREATE TRIGGER vdt_batch_one_way BEFORE UPDATE OF status ON vdt_batch
WHEN OLD.status = 'VOID' AND NEW.status <> 'VOID'
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: lô đã vô hiệu không bật lại'); END;
CREATE TRIGGER vdt_batch_code_locked BEFORE UPDATE OF catalog_code ON vdt_batch
WHEN NEW.catalog_code IS NOT OLD.catalog_code AND EXISTS (SELECT 1 FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE t.batch_id = OLD.id)
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: lô đã có vé được giữ chỗ — không đổi mã tour, chỉ thu hồi lô'); END;

-- ===== Vé: một dòng một ảnh. `status` đi MỘT CHIỀU; không xoá ===========================================================================================
CREATE TABLE vdt_ticket (
  id           TEXT PRIMARY KEY,
  batch_id     TEXT NOT NULL REFERENCES vdt_batch (id),
  ticket_code  TEXT NOT NULL,
  valid_from   TEXT NOT NULL CHECK (valid_from GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  valid_to     TEXT NOT NULL CHECK (valid_to GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  slot_time    TEXT,
  storage_key  TEXT NOT NULL,
  content_kind TEXT NOT NULL,
  byte_size    INTEGER NOT NULL CHECK (byte_size > 0),
  content_hash TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'ALLOCATED', 'VOID')),
  stored_at    TEXT,
  purged_at    TEXT,
  r2_deleted_at TEXT,
  created_at   TEXT NOT NULL,
  created_by   TEXT,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT,
  CHECK (valid_to >= valid_from)
);
CREATE UNIQUE INDEX vdt_ticket_code_uq ON vdt_ticket (ticket_code);
CREATE UNIQUE INDEX vdt_ticket_storage_uq ON vdt_ticket (storage_key);
CREATE INDEX vdt_ticket_pick_ix ON vdt_ticket (batch_id, status, valid_to, id);
CREATE TRIGGER vdt_ticket_no_delete BEFORE DELETE ON vdt_ticket
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: vé không xoá được — vô hiệu vé'); END;
-- Không đổi mã vé, khoảng ngày, khoá kho, băm, lô sau khi nhập (sửa sai = vô hiệu vé cũ + nhập vé mới).
CREATE TRIGGER vdt_ticket_keep_key BEFORE UPDATE ON vdt_ticket
WHEN NEW.id IS NOT OLD.id OR NEW.batch_id IS NOT OLD.batch_id OR NEW.ticket_code IS NOT OLD.ticket_code OR NEW.valid_from IS NOT OLD.valid_from OR NEW.valid_to IS NOT OLD.valid_to
  OR NEW.storage_key IS NOT OLD.storage_key OR NEW.content_hash IS NOT OLD.content_hash OR NEW.byte_size IS NOT OLD.byte_size OR NEW.content_kind IS NOT OLD.content_kind
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by OR NEW.slot_time IS NOT OLD.slot_time
  OR (OLD.stored_at IS NOT NULL AND NEW.stored_at IS NOT OLD.stored_at) OR (OLD.purged_at IS NOT NULL AND NEW.purged_at IS NOT OLD.purged_at)
  OR (OLD.r2_deleted_at IS NOT NULL AND NEW.r2_deleted_at IS NOT OLD.r2_deleted_at)
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: không đổi mã vé, khoảng ngày, giờ, khoá kho, băm, dấu vết tạo; các dấu lưu / thu hồi / xoá kho chỉ ghi một lần'); END;
-- Vé mới vào kho luôn ở AVAILABLE (không chèn thẳng ALLOCATED / VOID).
CREATE TRIGGER vdt_ticket_insert_available BEFORE INSERT ON vdt_ticket
WHEN NEW.status <> 'AVAILABLE'
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: vé mới vào kho phải ở trạng thái AVAILABLE'); END;
-- VOID là cuối. ALLOCATED→AVAILABLE (trả vé còn hạn) bị chặn khi vé từng được đọc / giao (`revealed_at` của bất kỳ phân bổ nào): vé đã lộ chỉ còn đường VOID.
CREATE TRIGGER vdt_ticket_one_way BEFORE UPDATE OF status ON vdt_ticket
WHEN (OLD.status = 'VOID' AND NEW.status <> 'VOID')
  OR (OLD.status = 'ALLOCATED' AND NEW.status = 'AVAILABLE' AND EXISTS (SELECT 1 FROM vdt_allocation a WHERE a.ticket_id = OLD.id AND a.revealed_at IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: trạng thái vé chỉ đi một chiều; vé đã lộ không về kho'); END;

-- ===== Phân bổ: vé nào giữ cho dòng dịch vụ nào của đơn nào. CHỈ THÊM; chỉ `revealed_at` và `released_at`+lý do được ghi MỘT lần ======================
CREATE TABLE vdt_allocation (
  id               TEXT PRIMARY KEY,
  ticket_id        TEXT NOT NULL REFERENCES vdt_ticket (id),
  order_id         TEXT NOT NULL,
  order_service_id TEXT NOT NULL,
  pax_group        TEXT NOT NULL CHECK (pax_group IN ('ADULT', 'CHILD', 'SENIOR')),
  slot_no          INTEGER NOT NULL CHECK (slot_no >= 1),
  allocated_at     TEXT NOT NULL,
  allocated_by     TEXT,
  revealed_at      TEXT,
  released_at      TEXT,
  release_reason   TEXT CHECK (release_reason IN ('DON_HUY', 'GIAM_SO_KHACH', 'RUT_XAC_NHAN', 'THU_HOI')),
  created_at       TEXT NOT NULL,
  created_by       TEXT,
  updated_at       TEXT NOT NULL,
  updated_by       TEXT,
  CHECK ((released_at IS NULL) = (release_reason IS NULL))
);
-- Hàng rào chống cấp trùng (P16: bài canh-tranh phải đỏ khi bỏ hai chỉ mục này): một vé chỉ một chỗ đang mở; một vị trí chỉ một vé đang mở.
CREATE UNIQUE INDEX vdt_allocation_ticket_open ON vdt_allocation (ticket_id) WHERE released_at IS NULL;
CREATE UNIQUE INDEX vdt_allocation_slot_open ON vdt_allocation (order_service_id, pax_group, slot_no) WHERE released_at IS NULL;
CREATE INDEX vdt_allocation_order_ix ON vdt_allocation (order_id);
-- Chỉ phân bổ cho vé ĐANG ALLOCATED, đúng nhóm khách của lô và lô còn ACTIVE (giữ chỗ luôn UPDATE vé trước, INSERT phân bổ sau, cùng một lô D1).
CREATE TRIGGER vdt_allocation_insert_guard BEFORE INSERT ON vdt_allocation
WHEN (SELECT t.status FROM vdt_ticket t WHERE t.id = NEW.ticket_id) IS NOT 'ALLOCATED'
  OR (SELECT b.pax_group FROM vdt_batch b JOIN vdt_ticket t ON t.batch_id = b.id WHERE t.id = NEW.ticket_id) IS NOT NEW.pax_group
  OR (SELECT b.status FROM vdt_batch b JOIN vdt_ticket t ON t.batch_id = b.id WHERE t.id = NEW.ticket_id) IS NOT 'ACTIVE'
BEGIN SELECT RAISE(ABORT, 'vdt_one_way: chỉ phân bổ vé đang ALLOCATED, đúng nhóm khách, lô còn hiệu lực'); END;
CREATE TRIGGER vdt_allocation_no_delete BEFORE DELETE ON vdt_allocation
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: phân bổ vé chỉ thêm'); END;
CREATE TRIGGER vdt_allocation_only_stamp BEFORE UPDATE ON vdt_allocation
WHEN NEW.id IS NOT OLD.id OR NEW.ticket_id IS NOT OLD.ticket_id OR NEW.order_id IS NOT OLD.order_id OR NEW.order_service_id IS NOT OLD.order_service_id
  OR NEW.pax_group IS NOT OLD.pax_group OR NEW.slot_no IS NOT OLD.slot_no OR NEW.allocated_at IS NOT OLD.allocated_at OR NEW.allocated_by IS NOT OLD.allocated_by
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR OLD.released_at IS NOT NULL
  OR (OLD.revealed_at IS NOT NULL AND NEW.revealed_at IS NOT OLD.revealed_at)
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: phân bổ chỉ được đóng dấu lộ vé và dấu trả vé, mỗi dấu một lần; dòng đã trả không sửa nữa'); END;

-- ===== Lần giao: thay dấu "like". CHỈ THÊM ==========================================================================================================
CREATE TABLE vdt_delivery (
  id            TEXT PRIMARY KEY,
  allocation_id TEXT NOT NULL REFERENCES vdt_allocation (id),
  channel       TEXT NOT NULL CHECK (channel IN ('ZALO', 'LINK')),
  delivered_by  TEXT,
  delivered_at  TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT
);
CREATE INDEX vdt_delivery_allocation_ix ON vdt_delivery (allocation_id);
CREATE TRIGGER vdt_delivery_no_delete BEFORE DELETE ON vdt_delivery
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: lần giao vé chỉ thêm'); END;
CREATE TRIGGER vdt_delivery_no_update BEFORE UPDATE ON vdt_delivery
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: lần giao vé chỉ thêm, không sửa'); END;

-- ===== Đường dẫn riêng cho khách: CHỈ LƯU BĂM của mã; hạn; thu hồi một lần; đếm lượt mở (ADR-0153 Đ2 — dùng ở Task 7) ======================
CREATE TABLE vdt_guest_link (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL,
  token_hash   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  revoked_at   TEXT,
  opened_count INTEGER NOT NULL DEFAULT 0 CHECK (opened_count >= 0),
  created_at   TEXT NOT NULL,
  created_by   TEXT,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT
);
CREATE UNIQUE INDEX vdt_guest_link_token_uq ON vdt_guest_link (token_hash);
CREATE INDEX vdt_guest_link_order_ix ON vdt_guest_link (order_id);
CREATE TRIGGER vdt_guest_link_no_delete BEFORE DELETE ON vdt_guest_link
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: đường dẫn khách không xoá được — thu hồi'); END;
CREATE TRIGGER vdt_guest_link_only_close BEFORE UPDATE ON vdt_guest_link
WHEN NEW.id IS NOT OLD.id OR NEW.order_id IS NOT OLD.order_id OR NEW.token_hash IS NOT OLD.token_hash OR NEW.expires_at IS NOT OLD.expires_at
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR NEW.opened_count < OLD.opened_count
  OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS NOT OLD.revoked_at)
BEGIN SELECT RAISE(ABORT, 'vdt_append_only: đường dẫn khách chỉ thu hồi một lần và đếm lượt mở tăng dần'); END;
