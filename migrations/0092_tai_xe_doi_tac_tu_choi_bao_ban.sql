-- Migration 0092 — ADR-0053 (accepted 2026-09-30) D8 Từ chối chuyến, D9 Báo bận của tài xế đối tác; kế hoạch A4 T2
-- (docs/superpowers/plans/2026-10-08-giai-doan-3-a4-ke-hoach.md — số tạm 0091 ở kế hoạch đã đổi thành 0092: 0091 thuộc ADR-0105). Module van-chuyen (vc_).
-- CHỈ THÊM: cột mới, bảng mới, trigger mới, gieo dữ liệu; DUY NHẤT một DROP — trigger chặn khung DRIVER `vc_unavailability_driver_closed` của 0071, đúng như
-- 0071 và ADR-0053 D9.1 đã hẹn ("bỏ trigger đó bằng migration mới"). Không sửa 0041 / 0042 / 0071 (đã áp remote).
-- Trigger CHỈ đọc / ghi bảng vc_ (Hiến chương 5.3; ADR-0024 điều 5).
--
-- NGOẠI LỆ CÓ TÊN "GIỜ CSDL" (B8.3, ADR-0053 :122): trigger `vc_trip_driver_refuse_deadline` là trigger ĐẦU TIÊN so với giờ hiện tại của CSDL —
-- `CAST(strftime('%s','now') AS INTEGER) * 1000` (làm tròn xuống giây ⇒ lỏng hơn cổng máy chủ tối đa 1 giây; cổng máy chủ là lớp chính — G-A4-4). Ghi chú
-- "không dùng giờ hệ thống của CSDL" của 0084:14 KHÔNG áp cho trigger này. Bài thử: luật đồng hồ ở kế hoạch A4 §2 (gieo giờ tương đối giờ thật; bài route
-- Từ chối đặt đồng hồ giả bằng giờ thật — tránh bom hẹn giờ).
--
-- Tiền tố câu báo (máy chủ đổi mã — rules.ts `loiRangBuocChuyen`, khung-ban.ts `loiRangBuocKhungBan`):
--   tc82_ (B8.2), tc83_ (B8.3 → 409 refuse_deadline_passed), tc84_ (B8.4), rd_ (hạn chỉ giảm / khoá cột / không xoá),
--   lc03_driver_unavailable (B9.3 — khớp sẵn `lc0[1-9]_` kể cả Worker cũ), unavailability_overlaps_driver_trip (B9.2).
--
-- HOÀN TÁC (D1 không có Down): migration MỚI — DROP TRIGGER mọi trigger tạo ở đây; CREATE TRIGGER vc_unavailability_driver_closed lại y nguyên 0071:56-58;
-- KHÔNG DROP bảng hay cột (cột / bảng thừa vô hại với Worker cũ: mã cũ không ghi REFUSED, không ghi khung DRIVER; trigger hạn chỉ thêm dòng); đóng ô quyền
-- (`trip.refuse`, `unavailability.self`, cột DRIVER_PARTNER của `trip.view`, `trip.progress`) bằng mã.
-- CỬA MỘT CHIỀU (không thu hồi được): dữ liệu khách đã hiện cho tài xế đối tác; dòng REFUSED (dòng lái đóng không mở lại); dòng hạn (chỉ giảm, không xoá).
-- Khôi phục toàn bộ CSDL bằng Time Travel chỉ khi có thảm hoạ — không nằm trong đường hoàn tác thường.

-- ---- D8.1 Dữ liệu Từ chối ---------------------------------------------------------------------------------------------------------------------------------
-- Lý do Từ chối có khi và chỉ khi dòng đóng `REFUSED` (B8.4 — `IS`: close_reason NULL không làm CHECK lọt, G-A4-22). Người đóng theo HỒ SƠ (so cùng module).
ALTER TABLE vc_trip_driver ADD COLUMN refuse_reason_code TEXT REFERENCES vc_reason(code) CHECK ((close_reason IS 'REFUSED') = (refuse_reason_code IS NOT NULL));
ALTER TABLE vc_trip_driver ADD COLUMN closed_by_party_id TEXT REFERENCES pty_party(id);

-- Hạn Từ chối theo CẶP (tài xế, chuyến) — "khoá dính" D8.2: chèn khi cặp được xếp LẦN ĐẦU, xếp lại đúng người dùng lại dòng cũ, chỉ GIẢM, không xoá.
CREATE TABLE vc_refuse_deadline (
  trip_id          TEXT NOT NULL REFERENCES vc_trip(id),
  driver_party_id  TEXT NOT NULL REFERENCES pty_party(id),
  deadline_ms      INTEGER NOT NULL,
  lead_minutes     INTEGER NOT NULL CHECK (lead_minutes BETWEEN 1 AND 2880),
  created_at       TEXT NOT NULL,
  created_by       TEXT,
  updated_at       TEXT NOT NULL,
  updated_by       TEXT,
  PRIMARY KEY (trip_id, driver_party_id)
);
CREATE TRIGGER vc_refuse_deadline_no_delete BEFORE DELETE ON vc_refuse_deadline
BEGIN SELECT RAISE(ABORT, 'rd_no_delete: hạn từ chối không xoá'); END;
-- Chỉ GIẢM nghiêm; không đổi cặp, số phút đã chụp, mốc tạo (sửa dòng mà hạn không giảm — kể cả chỉ đổi updated_* — đều bị chặn).
CREATE TRIGGER vc_refuse_deadline_only_decrease BEFORE UPDATE ON vc_refuse_deadline
WHEN NOT (NEW.deadline_ms < OLD.deadline_ms)
  OR NEW.trip_id IS NOT OLD.trip_id OR NEW.driver_party_id IS NOT OLD.driver_party_id OR NEW.lead_minutes IS NOT OLD.lead_minutes
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'rd_only_decrease: hạn từ chối chỉ được giảm, không đổi cặp hay số phút'); END;

-- Chính sách (D8.1, lời chủ 6.3): số phút hạn Từ chối (gieo 720 = 12 giờ; 60–2880) và SĐT văn phòng (cho nút "Gọi văn phòng"; dạng 0xxxxxxxxx — src/shared/
-- phone.ts). Thêm cột có DEFAULT: LỆCH khuôn I43 có ghi (như 0071, 0084) — bù bằng bài "câu chèn chính sách liệt kê đủ cột" và thân yêu cầu bắt buộc.
ALTER TABLE vc_dispatch_policy ADD COLUMN refuse_lead_minutes INTEGER NOT NULL DEFAULT 720 CHECK (refuse_lead_minutes BETWEEN 60 AND 2880);
ALTER TABLE vc_dispatch_policy ADD COLUMN office_phone TEXT CHECK (office_phone IS NULL OR (length(office_phone) = 10 AND office_phone GLOB '0[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'));

-- Gieo hạn cho MỌI dòng lái đang mở lúc áp (ADR-0053 D8.1; G-A4-23): giờ xuất bến dự kiến − 720 phút.
INSERT INTO vc_refuse_deadline (trip_id, driver_party_id, deadline_ms, lead_minutes, created_at, created_by, updated_at, updated_by)
SELECT d.trip_id, d.driver_party_id, t.planned_start_ms - 720 * 60000, 720,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL
  FROM vc_trip_driver d JOIN vc_trip t ON t.id = d.trip_id
 WHERE d.valid_to_at IS NULL
   AND NOT EXISTS (SELECT 1 FROM vc_refuse_deadline r WHERE r.trip_id = d.trip_id AND r.driver_party_id = d.driver_party_id);

-- Trigger hạn — phủ MỌI đường xếp tài xế (tạo, sửa, Đ1 khẩn cấp, cứu hộ A5, đường sau này — ADR-0053 :91; G-A4-3). Số phút = chính sách hiệu lực tại lúc mở
-- dòng lái; không có dòng chính sách nào khớp → 720 (G-A4-27). Cặp đã có dòng → giữ dòng cũ (khoá dính).
CREATE TRIGGER vc_trip_driver_refuse_deadline_ins AFTER INSERT ON vc_trip_driver
WHEN NEW.valid_to_at IS NULL
BEGIN
  INSERT INTO vc_refuse_deadline (trip_id, driver_party_id, deadline_ms, lead_minutes, created_at, created_by, updated_at, updated_by)
  SELECT NEW.trip_id, NEW.driver_party_id, t.planned_start_ms - p.lm * 60000, p.lm, NEW.created_at, NEW.created_by, NEW.created_at, NEW.created_by
    FROM vc_trip t,
         (SELECT COALESCE((SELECT x.refuse_lead_minutes FROM vc_dispatch_policy x WHERE x.valid_from_at <= NEW.valid_from_at ORDER BY x.valid_from_at DESC LIMIT 1), 720) AS lm) p
   WHERE t.id = NEW.trip_id
     AND NOT EXISTS (SELECT 1 FROM vc_refuse_deadline r WHERE r.trip_id = NEW.trip_id AND r.driver_party_id = NEW.driver_party_id);
END;
-- Dời giờ chuyến (ADR-0053 D8.1, nguyên văn :91): chỉ chạm dòng THẬT SỰ giảm — dời muộn không cập nhật dòng nào, nên trigger "chỉ giảm" không bắn.
CREATE TRIGGER vc_trip_refuse_deadline_move AFTER UPDATE OF planned_start_ms ON vc_trip
BEGIN
  UPDATE vc_refuse_deadline
     SET deadline_ms = NEW.planned_start_ms - lead_minutes * 60000, updated_at = NEW.updated_at, updated_by = NEW.updated_by
   WHERE trip_id = NEW.id AND deadline_ms > NEW.planned_start_ms - lead_minutes * 60000;
END;

-- ---- D8.5 Bất biến Từ chối (lớp CSDL) — chỉ xét lệnh ĐÓNG một dòng đang mở (dòng đã đóng: lc04_close_once của 0042 chặn trước) -------------------------
-- Không chèn thẳng dòng REFUSED: Từ chối là đóng một dòng lái đang mở.
CREATE TRIGGER vc_trip_driver_refused_insert BEFORE INSERT ON vc_trip_driver
WHEN NEW.close_reason = 'REFUSED' OR NEW.refuse_reason_code IS NOT NULL OR NEW.closed_by_party_id IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'tc82_insert: từ chối là đóng dòng lái đang mở — không chèn dòng đã đóng'); END;
-- B8.2: REFUSED ⇒ người đóng là chính tài xế của dòng.
CREATE TRIGGER vc_trip_driver_refused_by_self BEFORE UPDATE ON vc_trip_driver
WHEN OLD.valid_to_at IS NULL AND NEW.close_reason = 'REFUSED' AND NEW.closed_by_party_id IS NOT OLD.driver_party_id
BEGIN SELECT RAISE(ABORT, 'tc82_self: chỉ chính tài xế từ chối chuyến của mình'); END;
-- B8.3: REFUSED chỉ khi chuyến PLANNED và giờ CSDL hiện tại ≤ hạn của cặp (NGOẠI LỆ "giờ CSDL" — xem đầu tệp).
CREATE TRIGGER vc_trip_driver_refuse_deadline BEFORE UPDATE ON vc_trip_driver
WHEN OLD.valid_to_at IS NULL AND NEW.close_reason = 'REFUSED' AND (
  NOT EXISTS (SELECT 1 FROM vc_trip t WHERE t.id = NEW.trip_id AND t.status = 'PLANNED')
  OR NOT EXISTS (SELECT 1 FROM vc_refuse_deadline r
                  WHERE r.trip_id = NEW.trip_id AND r.driver_party_id = NEW.driver_party_id
                    AND r.deadline_ms >= CAST(strftime('%s', 'now') AS INTEGER) * 1000))
BEGIN SELECT RAISE(ABORT, 'tc83_deadline: đã quá hạn từ chối hoặc chuyến không còn chưa chạy'); END;
-- B8.4: lý do Từ chối thuộc nhóm TU_CHOI_CHUYEN (CHECK không đọc được vc_reason).
CREATE TRIGGER vc_trip_driver_refuse_reason BEFORE UPDATE ON vc_trip_driver
WHEN OLD.valid_to_at IS NULL AND NEW.refuse_reason_code IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM vc_reason r WHERE r.code = NEW.refuse_reason_code AND r.reason_group = 'TU_CHOI_CHUYEN')
BEGIN SELECT RAISE(ABORT, 'tc84_reason: lý do từ chối không thuộc nhóm từ chối chuyến'); END;

-- ---- D9 Báo bận của tài xế ---------------------------------------------------------------------------------------------------------------------------------
-- Mở khung DRIVER (0071 đã hẹn — ADR-0053 D9.1).
DROP TRIGGER vc_unavailability_driver_closed;
-- B9.2 (Q-L3-C = a): không ghi khung bận chồng chuyến tài xế đang được xếp (chưa kết thúc, chưa huỷ — nửa mở, so giờ dự kiến như khung xe K8).
CREATE TRIGGER vc_unavailability_overlaps_driver_trip BEFORE INSERT ON vc_unavailability
WHEN NEW.subject = 'DRIVER' AND EXISTS (
  SELECT 1 FROM vc_trip_driver d JOIN vc_trip t ON t.id = d.trip_id
   WHERE d.driver_party_id = NEW.driver_party_id AND d.valid_to_at IS NULL AND t.status IN ('PLANNED', 'RUNNING')
     AND t.planned_start_ms < NEW.end_ms AND NEW.start_ms < t.planned_end_ms)
BEGIN SELECT RAISE(ABORT, 'unavailability_overlaps_driver_trip: tài xế đang có chuyến trùng khung bận — từ chối chuyến (nếu còn hạn) hoặc gọi văn phòng'); END;
-- B9.3 (LC-03 mở rộng): không xếp tài xế vào chuyến chồng khung bận CÒN HIỆU LỰC (chưa rút) của người đó — KHÔNG so giờ CSDL.
CREATE TRIGGER vc_trip_driver_unavailable_ins BEFORE INSERT ON vc_trip_driver
WHEN NEW.valid_to_at IS NULL AND EXISTS (
  SELECT 1 FROM vc_trip t JOIN vc_unavailability u
      ON u.subject = 'DRIVER' AND u.driver_party_id = NEW.driver_party_id AND u.withdrawn_at IS NULL
   WHERE t.id = NEW.trip_id AND t.status <> 'CANCELLED' AND u.start_ms < t.planned_end_ms AND t.planned_start_ms < u.end_ms)
BEGIN SELECT RAISE(ABORT, 'lc03_driver_unavailable: tài xế có khung bận trùng giờ chuyến'); END;
-- Dời giờ chuyến: tài xế ĐANG MỞ của chính chuyến (lô sửa chuyến đóng tài xế cũ TRƯỚC câu ghi chuyến, mở tài xế mới SAU — dieu-phoi.ts loSuaChuyen).
CREATE TRIGGER vc_trip_driver_unavailable_upd BEFORE UPDATE OF planned_start_ms, planned_end_ms ON vc_trip
WHEN NEW.status <> 'CANCELLED'
  AND (NEW.planned_start_ms IS NOT OLD.planned_start_ms OR NEW.planned_end_ms IS NOT OLD.planned_end_ms)
  AND EXISTS (
  SELECT 1 FROM vc_trip_driver d JOIN vc_unavailability u
      ON u.subject = 'DRIVER' AND u.driver_party_id = d.driver_party_id AND u.withdrawn_at IS NULL
   WHERE d.trip_id = NEW.id AND d.valid_to_at IS NULL AND u.start_ms < NEW.planned_end_ms AND NEW.planned_start_ms < u.end_ms)
BEGIN SELECT RAISE(ABORT, 'lc03_driver_unavailable: tài xế có khung bận trùng giờ chuyến'); END;

-- ---- Gieo lý do hai nhóm mới (danh sách nhóm kiểm ở MÃ — NHOM_LY_DO). Tiền tố mã khác "TU_CHOI" (nhóm TU_CHOI_NHAN) và "BAN_XE" (G-A4-11).
INSERT INTO vc_reason (code, reason_group, label, sort_order, created_at, updated_at) VALUES
  ('TCC_BAN_LICH_KHAC', 'TU_CHOI_CHUYEN', 'Bận lịch khác', 1, '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z'),
  ('TCC_OM_VIEC_RIENG', 'TU_CHOI_CHUYEN', 'Ốm / việc riêng', 2, '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z'),
  ('TCC_XE_KHONG_CHAY', 'TU_CHOI_CHUYEN', 'Xe không chạy được', 3, '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z'),
  ('TCC_KHAC', 'TU_CHOI_CHUYEN', 'Khác', 99, '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z'),
  ('BTX_VIEC_RIENG', 'BAN_TAI_XE', 'Việc riêng', 1, '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z'),
  ('BTX_OM', 'BAN_TAI_XE', 'Ốm', 2, '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z'),
  ('BTX_KHAC', 'BAN_TAI_XE', 'Khác', 99, '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z');
