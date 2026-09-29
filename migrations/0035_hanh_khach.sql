-- Migration 0035 — DANH SÁCH HÀNH KHÁCH + ba view công bố chỉ khoá + cờ (ADR-0047 A2, A3, accepted 2026-09-28; module orders; kế hoạch
-- docs/superpowers/plans/2026-09-29-adr-0047-thi-cong.md mục 1.1, 1.5). Chỉ THÊM (phát hành 1).
-- Hành khách = dòng NHẸ của đơn (họ tên + năm sinh — luật vận tải khách theo hợp đồng), KHÔNG phải hồ sơ Bên (ADR-0001 mục 7 giữ nguyên). Dữ liệu cá
-- nhân: nhật ký, Bảng tin, thông báo chỉ ghi SỐ LƯỢNG (Hiến chương 5.12). Lưu ít nhất 3 năm, không xoá cứng sau xác nhận.
-- Chuỗi phiên bản của MỘT người: `person_key` = id của dòng đầu chuỗi, chép sang mọi dòng thay thế. Sau xác nhận: sửa tên = dòng MỚI trỏ `previous_id`
-- vào dòng hiện hành; nhập nhầm = `voided_at`. Module khác tham chiếu NGƯỜI bằng `person_key`, một BẢN TÊN đã dùng bằng `id` dòng (không bao giờ đổi).

CREATE TABLE ord_passenger (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL REFERENCES orders(id),
  full_name    TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 100),
  -- Năm sinh BẮT BUỘC (luật vận tải cần năm sinh). Khoảng hẹp hơn (≤ 120 năm, ≤ năm nay) kiểm ở máy chủ (src/shared/hanh-khach.ts).
  birth_year   INTEGER NOT NULL CHECK (birth_year BETWEEN 1900 AND 2100),
  pax_code     TEXT CHECK (pax_code IS NULL OR pax_code IN ('adult', 'child', 'senior', 'infant')),
  previous_id  TEXT REFERENCES ord_passenger(id) CHECK (previous_id IS NULL OR previous_id <> id),
  person_key   TEXT NOT NULL,
  voided_at    TEXT,
  -- Tập đóng. 'DRIVER' định sẵn để khỏi dựng lại bảng — CHỈ dùng khi ADR lượt 2 mở đường ghi cho tài xế (kiểm định kỳ R-ORD-11 báo nếu có dòng).
  source       TEXT NOT NULL DEFAULT 'OFFICE' CHECK (source IN ('OFFICE', 'DRIVER')),
  created_at   TEXT NOT NULL,
  created_by   TEXT,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT
);
CREATE INDEX ord_passenger_order_ix ON ord_passenger(order_id);
CREATE INDEX ord_passenger_person_ix ON ord_passenger(person_key);
-- Một dòng thay thế CÒN HIỆU LỰC cho mỗi dòng (khuôn pty_person_document_next_uq, 0032): chuỗi không tách nhánh.
CREATE UNIQUE INDEX ord_passenger_next_uq ON ord_passenger(previous_id) WHERE previous_id IS NOT NULL AND voided_at IS NULL;

-- Không xoá cứng sau xác nhận. Đơn NHÁP: lưu nháp xoá–chèn lại cả danh sách cùng lô (ADR-0047 A2; lệch có chủ ý hẹp của Hiến chương 5.5 — chủ trả lời Q0
-- 2026-09-29 "Cách 1: chỉ giữ bản cuối"; ngoại lệ có tên XOA_CUNG_NHAP ở src/architecture.test.ts).
CREATE TRIGGER ord_passenger_no_delete BEFORE DELETE ON ord_passenger
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'passenger_frozen: đơn không còn nháp — nhập nhầm thì huỷ dòng'); END;

-- Chỉ-thêm sau xác nhận: không sửa đè cột nội dung (chỉ được đặt `voided_at`/`updated_*`).
CREATE TRIGGER ord_passenger_frozen_update BEFORE UPDATE ON ord_passenger
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
  AND (NEW.id IS NOT OLD.id OR NEW.order_id IS NOT OLD.order_id OR NEW.full_name IS NOT OLD.full_name OR NEW.birth_year IS NOT OLD.birth_year
    OR NEW.pax_code IS NOT OLD.pax_code OR NEW.previous_id IS NOT OLD.previous_id OR NEW.person_key IS NOT OLD.person_key OR NEW.source IS NOT OLD.source
    OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by)
BEGIN SELECT RAISE(ABORT, 'passenger_frozen: không sửa đè — sửa tên thì thêm dòng mới'); END;

-- Dòng đã huỷ không sửa được (kể cả bỏ huỷ).
CREATE TRIGGER ord_passenger_voided BEFORE UPDATE ON ord_passenger
WHEN OLD.voided_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'passenger_voided: dòng đã huỷ — không sửa, không bỏ huỷ'); END;

-- Dòng đã có dòng thay thế chưa huỷ không sửa được. "Huỷ người" huỷ mọi dòng của chuỗi MỚI trước CŨ sau (Ruling R8) nên đi qua được trigger này.
CREATE TRIGGER ord_passenger_superseded BEFORE UPDATE ON ord_passenger
WHEN EXISTS (SELECT 1 FROM ord_passenger n WHERE n.previous_id = OLD.id AND n.voided_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'passenger_superseded: dòng đã có dòng thay thế'); END;

-- Chuỗi đúng: dòng đầu có person_key = id; dòng thay thế nối dòng CHƯA huỷ của CÙNG người (person_key), CÙNG đơn.
CREATE TRIGGER ord_passenger_chain_ins BEFORE INSERT ON ord_passenger
WHEN (NEW.previous_id IS NULL AND NEW.person_key IS NOT NEW.id)
  OR (NEW.previous_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM ord_passenger p WHERE p.id = NEW.previous_id AND p.order_id = NEW.order_id AND p.person_key = NEW.person_key AND p.voided_at IS NULL))
BEGIN SELECT RAISE(ABORT, 'passenger_chain: dòng thay thế phải nối dòng chưa huỷ của cùng người, cùng đơn'); END;

-- Ba view công bố CHỈ khoá + cờ (ADR-0047 A3; ADR-0002 điều 3) — cho trigger của module khác (Vận chuyển, lượt sau) giữ luật ở tầng CSDL mà không đọc
-- bảng của orders (Hiến chương 5.3). Không tên, không năm sinh, không tiền. Không dùng tên `v_ord_order_state` (ADR-0024 còn proposed).
CREATE VIEW v_ord_order_flag AS
  SELECT id, status = 'confirmed' AS is_confirmed, status = 'cancelled' AS is_cancelled FROM orders;

CREATE VIEW v_ord_leg_key AS
  SELECT id, order_id, order_service_id, closed_at IS NULL AS is_open FROM ord_transfer_leg;

-- has_current_row = người đó còn ít nhất một dòng chưa huỷ và không có dòng thay thế chưa huỷ (dòng hiện hành).
CREATE VIEW v_ord_passenger_key AS
  SELECT p.person_key AS person_key, p.order_id AS order_id,
         max(p.voided_at IS NULL AND NOT EXISTS (SELECT 1 FROM ord_passenger n WHERE n.previous_id = p.id AND n.voided_at IS NULL)) AS has_current_row
  FROM ord_passenger p
  GROUP BY p.person_key, p.order_id;
