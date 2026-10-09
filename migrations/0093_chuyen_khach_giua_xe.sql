-- Migration 0093 — CHUYỂN KHÁCH GIỮA HAI XE (gói A, việc 8 — A5). Thi hành ADR-0052 D4, D5c theo ADR-0111 Đ1–Đ6 (accepted 2026-10-08, lượt 8d-1 + 8d-2).
-- Module van-chuyen (tiền tố vc_), chủ mọi bảng dưới đây. Trigger chỉ đọc bảng vc_ (Hiến chương 5.3) — "tài khoản bấm là đúng tài xế" chỉ máy chủ kiểm
-- (module không có cạnh tới staff; docs/SO-HANG-RAO.md ghi "dựa vào máy chủ").
--
-- HOÀN TÁC (D1 không có migration ngược — viết migration MỚI):
--   1. DROP TRIGGER các trigger MỚI của tệp này: vc_transfer_rule_no_delete, vc_transfer_rule_identity, vc_transfer_request_no_delete,
--      vc_transfer_request_lc14, vc_transfer_request_identity, vc_transfer_request_status_forward, vc_transfer_request_cot_quyet_dinh,
--      vc_transfer_request_nguoi_nhan, vc_transfer_request_han_cho, vc_transfer_request_dong_trong_lo, vc_transfer_request_ly_do,
--      vc_transfer_request_confirm_may, vc_transfer_request_escalate_has_evidence, vc_transfer_request_confirm_core, vc_transfer_check_no_update,
--      vc_transfer_check_no_delete, vc_transfer_check_rule, vc_trip_allocation_transfer_ins, vc_trip_allocation_transfer_close.
--   2. Dựng lại năm trigger bị thay theo đúng thân cũ: vc_trip_allocation_identity, vc_trip_running_locked_alloc_ins, vc_trip_running_locked_alloc_close,
--      vc_trip_revoke_no_progress theo migrations/0085_dieu_chinh_chuyen.sql; vc_trip_running_locked_stop_ins theo migrations/0076_xe_dang_chay.sql.
--   3. Hai bảng vc_transfer_request, vc_transfer_check (và danh mục vc_transfer_rule) chỉ DROP khi còn rỗng; đã có dòng thì giữ (chỉ-thêm, là chứng cứ).
--   4. Cột thêm để nguyên (NULL / mặc định ở dòng cũ): vc_trip_allocation.transfer_id, .closed_transfer_id; vc_dispatch_policy.accept_wait_minutes,
--      .auto_confirm_transfer. Bốn lý do TU_CHOI_NHAN: ngưng ở màn Lý do điều phối (không xoá).
--   Dữ liệu đã ghi bằng lệnh chuyển khách là chỉ-thêm (một chiều): hoàn tác luật không xoá được đề nghị / suất đã chuyển. Sai nặng ngay sau khi áp:
--   khôi phục Time Travel về điểm khôi phục chụp TRƯỚC khi áp (mất mọi ghi sau điểm đó — chủ quyết).
--
-- Nội dung:
--   (1) Đ1 — danh mục điều kiện vc_transfer_rule (11 dòng, hai tầng LOI / CAU_HINH); chỉ migration ghi; không xoá; code, tier bất biến.
--   (2) Đề nghị vc_transfer_request (ADR-0052 D4.1 + Đ3 (b), (c)): id = DẤU LỆNH của lô gửi (= id sự kiện TRANSFER_SENT ở chuyến đích); LC-14 (vế Đ4:
--       ONBOARD chỉ sang xe ĐANG CHẠY); đồ thị trạng thái; bảng đặt cột quyết định Đ3 (b); người nhận là tài xế đang lái xe nhận; hạn chờ theo chính sách
--       LÚC GỬI; công tắc tự đồng ý theo chính sách LÚC QUYẾT; ESCALATED → CONFIRMED đọc MỌI dòng kiểm (ADR-0052:80); mọi lần đóng nằm trong lô của nguồn
--       hoặc đích. KHÔNG có chỉ mục duy nhất trên đề nghị đang chờ (P4 — một điểm gửi được cho nhiều xe cùng lúc).
--   (3) Dòng kiểm vc_transfer_check — chỉ-thêm, cột có kiểu, tầng khớp danh mục, chỉ luật đang dùng, chính sách hiện hành lúc kiểm, ghi trong lô của đích.
--   (4) Suất: transfer_id (đề nghị đã MỞ suất — bất biến) + closed_transfer_id (đề nghị đã ĐÓNG suất — đặt một lần trong câu đóng) (Đ3 (a)).
--   (5) LC-15 dựng lại: đường thứ tư "đề nghị CONFIRMED" cho mở suất (kể cả CREW — Đ4), đóng TRANSFERRED, thêm điểm ở xe nhận đang chạy.
--   (6) Đ5 — thu hồi xuất bến: chặt ở chuyến nguồn (đã giao khách), nới ở chuyến đích (đề nghị chưa thành không là tiến độ).
--   (7) Chính sách: accept_wait_minutes (10), auto_confirm_transfer (1). (8) Bốn lý do TU_CHOI_NHAN (dùng cho Không nhận và Bác).
-- Lỗi RAISE mang tiền tố lc14_ / lc15_ / ck_ → máy chủ đổi thành 409 (loiRangBuocChuyen, rules.ts).

-- ---- (1) Danh mục điều kiện chuyển (Đ1) ---------------------------------------------------------------------------------------------------------------
CREATE TABLE vc_transfer_rule (
  code        TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 3 AND 40),
  label       TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 80),
  tier        TEXT NOT NULL CHECK (tier IN ('LOI', 'CAU_HINH')),
  sort_order  INTEGER NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL
);
CREATE TRIGGER vc_transfer_rule_no_delete BEFORE DELETE ON vc_transfer_rule
BEGIN SELECT RAISE(ABORT, 'ck_rule_append_only: điều kiện chuyển khách không xoá — tắt bằng active = 0'); END;
CREATE TRIGGER vc_transfer_rule_identity BEFORE UPDATE ON vc_transfer_rule
WHEN NEW.code IS NOT OLD.code OR NEW.tier IS NOT OLD.tier OR NEW.created_at IS NOT OLD.created_at
BEGIN SELECT RAISE(ABORT, 'ck_rule_identity: không đổi mã, tầng của điều kiện chuyển khách'); END;
INSERT INTO vc_transfer_rule (code, label, tier, sort_order, created_at) VALUES
  ('SUC_CHUA_DICH', 'Xe nhận còn đủ chỗ', 'LOI', 1, '2026-10-09T00:00:00.000Z'),
  ('SUC_CHUA_NGUON', 'Xe nhờ chỉ bớt khách', 'LOI', 2, '2026-10-09T00:00:00.000Z'),
  ('TRUNG_GIO_DICH', 'Xe nhận không trùng giờ chuyến khác', 'LOI', 3, '2026-10-09T00:00:00.000Z'),
  ('KHOANG_NGHI_DICH', 'Đủ khoảng nghỉ trước chuyến sau của tài xế xe nhận', 'CAU_HINH', 4, '2026-10-09T00:00:00.000Z'),
  ('MOC_TOI_THIEU', 'Còn đủ mốc tối thiểu trước giờ xe nhận chạy', 'CAU_HINH', 5, '2026-10-09T00:00:00.000Z'),
  ('HANG_BANG_DICH', 'Bằng lái tài xế xe nhận đủ hạng', 'LOI', 6, '2026-10-09T00:00:00.000Z'),
  ('GIAY_TO_DICH', 'Giấy tờ xe nhận còn hạn', 'LOI', 7, '2026-10-09T00:00:00.000Z'),
  ('KHONG_CHEO', 'Hai xe, hai tài xế khác nhau', 'LOI', 8, '2026-10-09T00:00:00.000Z'),
  ('DIEM_CHUA_TOI', 'Xe nhờ chưa tới điểm đón', 'LOI', 9, '2026-10-09T00:00:00.000Z'),
  ('CAM_KET_DICH', 'Giữ cam kết xe với khách trên xe nhận', 'CAU_HINH', 10, '2026-10-09T00:00:00.000Z'),
  ('CHANG_KHACH_HIEU_LUC', 'Chặng của khách còn hiệu lực', 'LOI', 11, '2026-10-09T00:00:00.000Z');

-- ---- (7) Chính sách: hai cột (Toàn quyền đổi — settings.ops). DEFAULT cho dòng cũ: LỆCH khuôn I43 như 0071 / 0084 — bù bằng bài "câu chèn chính sách
-- liệt kê đủ cột" (src/modules/van-chuyen/chinh-sach.test.ts) và thân route bắt buộc gửi hai số này. ---------------------------------------------------------
ALTER TABLE vc_dispatch_policy ADD COLUMN accept_wait_minutes INTEGER NOT NULL DEFAULT 10 CHECK (accept_wait_minutes BETWEEN 1 AND 120);
ALTER TABLE vc_dispatch_policy ADD COLUMN auto_confirm_transfer INTEGER NOT NULL DEFAULT 1 CHECK (auto_confirm_transfer IN (0, 1));

-- ---- (2) Đề nghị chuyển khách ------------------------------------------------------------------------------------------------------------------------------
-- id = dấu lệnh của lô gửi = id sự kiện TRANSFER_SENT (ở chuyến đích, related_trip_id = nguồn). request_id = mã lệnh của lần gửi (lệnh dùng lại).
-- Không tên khách, không số giấy tờ. meet_place_text = chữ nơi gặp ĐÃ CHE dãy ≥ 8 chữ số (máy chủ che trước khi ghi) — không vào nhật ký, không vào tin.
CREATE TABLE vc_transfer_request (
  id                     TEXT PRIMARY KEY CHECK (length(id) = 36),
  from_trip_id           TEXT NOT NULL REFERENCES vc_trip(id),
  to_trip_id             TEXT NOT NULL REFERENCES vc_trip(id),
  scope                  TEXT NOT NULL CHECK (scope IN ('STOP', 'ONBOARD')),
  from_stop_id           TEXT REFERENCES vc_trip_stop(id),
  meet_location_id       TEXT REFERENCES loc_location(id),
  meet_place_text        TEXT CHECK (meet_place_text IS NULL OR length(trim(meet_place_text)) BETWEEN 1 AND 200),
  pax_count              INTEGER NOT NULL CHECK (pax_count BETWEEN 1 AND 1000),
  proposed_by_party_id   TEXT NOT NULL REFERENCES pty_party(id),
  proposed_by_staff_id   TEXT NOT NULL,
  proposed_at            TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'PENDING'
                           CHECK (status IN ('PENDING', 'WITHDRAWN', 'DECLINED', 'EXPIRED', 'VOID', 'CONFIRMED', 'ESCALATED', 'REJECTED')),
  decided_mode           TEXT CHECK (decided_mode IS NULL OR decided_mode IN ('MAY', 'NGUOI')),
  decided_by             TEXT,
  decided_at             TEXT,
  decided_cmd_id         TEXT CHECK (decided_cmd_id IS NULL OR length(decided_cmd_id) = 36),
  decided_by_party_id    TEXT REFERENCES pty_party(id),
  closed_cmd_id          TEXT CHECK (closed_cmd_id IS NULL OR length(closed_cmd_id) = 36),
  policy_id              TEXT NOT NULL REFERENCES vc_dispatch_policy(id),
  decline_reason_code    TEXT REFERENCES vc_reason(code),
  override_reason_code   TEXT REFERENCES vc_reason(code),
  reject_reason_code     TEXT REFERENCES vc_reason(code),
  request_id             TEXT NOT NULL UNIQUE CHECK (length(request_id) = 36),
  created_at             TEXT NOT NULL,
  created_by             TEXT,
  updated_at             TEXT NOT NULL,
  updated_by             TEXT,
  CHECK (from_trip_id <> to_trip_id),
  -- Đúng trường theo phạm vi (ADR-0052 D4.1): STOP ⇒ một điểm nguồn, không nơi gặp; ONBOARD ⇒ không điểm nguồn, đúng MỘT nơi gặp.
  CHECK (scope <> 'STOP' OR (from_stop_id IS NOT NULL AND meet_location_id IS NULL AND meet_place_text IS NULL)),
  CHECK (scope <> 'ONBOARD' OR (from_stop_id IS NULL AND (meet_location_id IS NULL) <> (meet_place_text IS NULL))),
  -- Cột quyết định đi cùng nhau (Đ3 (b)); có ⇔ đã có người / máy quyết lần thứ nhất (đề nghị rút / hết hạn / huỷ từ Chờ thì không có).
  CHECK ((decided_at IS NULL) = (decided_by IS NULL) AND (decided_at IS NULL) = (decided_cmd_id IS NULL) AND (decided_at IS NULL) = (decided_by_party_id IS NULL)),
  CHECK (status NOT IN ('PENDING', 'WITHDRAWN', 'EXPIRED') OR decided_at IS NULL),
  CHECK (status NOT IN ('CONFIRMED', 'ESCALATED', 'DECLINED', 'REJECTED') OR decided_at IS NOT NULL),
  CHECK (decided_at IS NULL OR decided_at >= proposed_at),
  CHECK ((decided_mode IS NOT NULL) = (status = 'CONFIRMED')),
  -- closed_cmd_id có giá trị ⇔ trạng thái cuối.
  CHECK ((closed_cmd_id IS NULL) = (status IN ('PENDING', 'ESCALATED'))),
  CHECK ((decline_reason_code IS NOT NULL) = (status = 'DECLINED')),
  CHECK ((reject_reason_code IS NOT NULL) = (status = 'REJECTED')),
  CHECK ((override_reason_code IS NOT NULL) = (status = 'CONFIRMED' AND decided_mode = 'NGUOI'))
);
CREATE INDEX vc_transfer_request_from_ix ON vc_transfer_request(from_trip_id, status);
CREATE INDEX vc_transfer_request_to_ix ON vc_transfer_request(to_trip_id, status);
CREATE INDEX vc_transfer_request_stop_ix ON vc_transfer_request(from_stop_id);
CREATE TRIGGER vc_transfer_request_no_delete BEFORE DELETE ON vc_transfer_request
BEGIN SELECT RAISE(ABORT, 'ck_append_only: đề nghị chuyển khách không xoá'); END;

-- LC-14 (ADR-0052 D4.2 + ADR-0111 Đ4): đề nghị chỉ sinh ở trạng thái Chờ, TRONG lô gửi (sự kiện TRANSFER_SENT mang dấu lệnh hiện hành của chuyến đích, nguồn
-- ở related_trip_id, cùng mã lệnh); nguồn ĐANG CHẠY; đích chưa chạy hoặc đang chạy, CÙNG ngày; ONBOARD ⇒ đích ĐANG CHẠY; người gửi (hồ sơ) là tài xế đang
-- lái nguồn; đích có tài xế đang lái KHÁC người gửi; STOP: điểm đón chưa tới của nguồn, mọi suất mở ở điểm là khách đang chờ, số khách = số suất đó;
-- ONBOARD: số khách = mọi suất mở chờ / đã lên của nguồn (kể cả người đi kèm). Chính sách = dòng hiện hành lúc gửi.
CREATE TRIGGER vc_transfer_request_lc14 BEFORE INSERT ON vc_transfer_request
WHEN NEW.status <> 'PENDING' OR NEW.decided_at IS NOT NULL OR NEW.closed_cmd_id IS NOT NULL
  OR NOT EXISTS (SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
                  WHERE t.id = NEW.to_trip_id AND t.last_cmd_id = NEW.id AND e.trip_id = NEW.to_trip_id AND e.kind = 'TRANSFER_SENT'
                    AND e.related_trip_id = NEW.from_trip_id AND e.request_id = NEW.request_id)
  OR (SELECT status FROM vc_trip WHERE id = NEW.from_trip_id) IS NOT 'RUNNING'
  OR (SELECT status FROM vc_trip WHERE id = NEW.to_trip_id) NOT IN ('PLANNED', 'RUNNING')
  OR (NEW.scope = 'ONBOARD' AND (SELECT status FROM vc_trip WHERE id = NEW.to_trip_id) IS NOT 'RUNNING')
  OR (SELECT service_date FROM vc_trip WHERE id = NEW.to_trip_id) IS NOT (SELECT service_date FROM vc_trip WHERE id = NEW.from_trip_id)
  OR NOT EXISTS (SELECT 1 FROM vc_trip_driver d WHERE d.trip_id = NEW.from_trip_id AND d.valid_to_at IS NULL AND d.driver_party_id = NEW.proposed_by_party_id)
  OR NOT EXISTS (SELECT 1 FROM vc_trip_driver d WHERE d.trip_id = NEW.to_trip_id AND d.valid_to_at IS NULL AND d.driver_party_id <> NEW.proposed_by_party_id)
  OR (NEW.scope = 'STOP' AND (
        NOT EXISTS (SELECT 1 FROM vc_trip_stop s WHERE s.id = NEW.from_stop_id AND s.trip_id = NEW.from_trip_id AND s.kind = 'PICKUP' AND s.status = 'PENDING')
        OR EXISTS (SELECT 1 FROM vc_trip_allocation a WHERE a.trip_id = NEW.from_trip_id AND a.board_stop_id = NEW.from_stop_id AND a.valid_to_at IS NULL
                     AND (a.kind <> 'PASSENGER' OR a.status <> 'WAITING'))
        OR NEW.pax_count IS NOT (SELECT count(*) FROM vc_trip_allocation a
                                  WHERE a.trip_id = NEW.from_trip_id AND a.board_stop_id = NEW.from_stop_id AND a.valid_to_at IS NULL)))
  OR (NEW.scope = 'ONBOARD' AND NEW.pax_count IS NOT (
        SELECT count(*) FROM vc_trip_allocation a WHERE a.trip_id = NEW.from_trip_id AND a.valid_to_at IS NULL AND a.status IN ('WAITING', 'BOARDED')))
  OR NEW.policy_id IS NOT (SELECT p.id FROM vc_dispatch_policy p WHERE p.valid_from_at <= NEW.proposed_at ORDER BY p.valid_from_at DESC LIMIT 1)
BEGIN SELECT RAISE(ABORT, 'lc14_transfer: đề nghị chuyển khách sai điều kiện gửi (xe nhờ đang chạy, xe nhận cùng ngày có tài xế khác, đúng điểm / đúng số khách)'); END;

-- Nội dung đề nghị không đổi sau khi gửi; chỉ trạng thái đi tiến + cột quyết định theo bảng Đ3 (b).
CREATE TRIGGER vc_transfer_request_identity BEFORE UPDATE ON vc_transfer_request
WHEN NEW.id IS NOT OLD.id OR NEW.from_trip_id IS NOT OLD.from_trip_id OR NEW.to_trip_id IS NOT OLD.to_trip_id OR NEW.scope IS NOT OLD.scope
  OR NEW.from_stop_id IS NOT OLD.from_stop_id OR NEW.meet_location_id IS NOT OLD.meet_location_id OR NEW.meet_place_text IS NOT OLD.meet_place_text
  OR NEW.pax_count IS NOT OLD.pax_count OR NEW.proposed_by_party_id IS NOT OLD.proposed_by_party_id OR NEW.proposed_by_staff_id IS NOT OLD.proposed_by_staff_id
  OR NEW.proposed_at IS NOT OLD.proposed_at OR NEW.policy_id IS NOT OLD.policy_id OR NEW.request_id IS NOT OLD.request_id
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'ck_identity: nội dung đề nghị chuyển khách không đổi sau khi gửi'); END;
-- Đồ thị (ADR-0052:61): PENDING → WITHDRAWN | DECLINED | EXPIRED | VOID | CONFIRMED | ESCALATED; ESCALATED → CONFIRMED | REJECTED | VOID. Mọi UPDATE phải đổi
-- trạng thái theo một cạnh này (không sửa cột khi giữ nguyên trạng thái; trạng thái cuối không sửa).
CREATE TRIGGER vc_transfer_request_status_forward BEFORE UPDATE ON vc_transfer_request
WHEN NOT ((OLD.status = 'PENDING' AND NEW.status IN ('WITHDRAWN', 'DECLINED', 'EXPIRED', 'VOID', 'CONFIRMED', 'ESCALATED'))
       OR (OLD.status = 'ESCALATED' AND NEW.status IN ('CONFIRMED', 'REJECTED', 'VOID')))
BEGIN SELECT RAISE(ABORT, 'ck_forward: trạng thái đề nghị chuyển khách chỉ đi tiến'); END;
-- Bảng đặt cột Đ3 (b). Rời Chờ sang Xác nhận / Leo thang / Không nhận: chế độ MAY khi xác nhận; dấu lệnh đóng = dấu lệnh quyết (leo thang: chưa đóng).
-- Leo thang sang Xác nhận / Bác: ghi lại người, giờ, dấu lệnh quyết ĐÚNG một lần (dấu lệnh mới), giữ hồ sơ tài xế đã bấm Nhận; chế độ NGUOI khi xác nhận.
-- Rút / Hết hạn / Huỷ: không đụng cột quyết định.
CREATE TRIGGER vc_transfer_request_cot_quyet_dinh BEFORE UPDATE ON vc_transfer_request
WHEN (OLD.status = 'PENDING' AND NEW.status IN ('CONFIRMED', 'ESCALATED', 'DECLINED') AND (
        NEW.decided_mode IS NOT (CASE WHEN NEW.status = 'CONFIRMED' THEN 'MAY' END)
        OR (NEW.status <> 'ESCALATED' AND NEW.closed_cmd_id IS NOT NEW.decided_cmd_id)))
  OR (OLD.status = 'ESCALATED' AND NEW.status IN ('CONFIRMED', 'REJECTED') AND (
        NEW.decided_by_party_id IS NOT OLD.decided_by_party_id OR NEW.decided_cmd_id IS OLD.decided_cmd_id OR NEW.decided_at < OLD.decided_at
        OR NEW.decided_mode IS NOT (CASE WHEN NEW.status = 'CONFIRMED' THEN 'NGUOI' END) OR NEW.closed_cmd_id IS NOT NEW.decided_cmd_id))
  OR (NEW.status IN ('WITHDRAWN', 'EXPIRED', 'VOID') AND (
        NEW.decided_by IS NOT OLD.decided_by OR NEW.decided_at IS NOT OLD.decided_at OR NEW.decided_cmd_id IS NOT OLD.decided_cmd_id
        OR NEW.decided_by_party_id IS NOT OLD.decided_by_party_id OR NEW.decided_mode IS NOT OLD.decided_mode))
BEGIN SELECT RAISE(ABORT, 'ck_decided: cột quyết định của đề nghị đặt sai theo cạnh trạng thái (ADR-0111 Đ3 b)'); END;
-- Đ3 (b): người được ghi là người quyết lần thứ nhất là TÀI XẾ ĐANG LÁI xe nhận (tài khoản bấm đúng người đó: chỉ máy chủ kiểm — "dựa vào máy chủ").
CREATE TRIGGER vc_transfer_request_nguoi_nhan BEFORE UPDATE ON vc_transfer_request
WHEN OLD.status = 'PENDING' AND NEW.status IN ('CONFIRMED', 'ESCALATED', 'DECLINED') AND NOT EXISTS (
  SELECT 1 FROM vc_trip_driver d WHERE d.trip_id = NEW.to_trip_id AND d.valid_to_at IS NULL AND d.driver_party_id = NEW.decided_by_party_id)
BEGIN SELECT RAISE(ABORT, 'ck_nguoi_nhan: người nhận đề nghị phải là tài xế đang lái xe nhận'); END;
-- MQ-08: hạn chờ = giờ gửi + accept_wait_minutes của dòng chính sách LÚC GỬI (policy_id). Tài xế nhận chỉ trả lời TRƯỚC hạn; Hết hạn chỉ ghi TỪ hạn trở đi.
-- (Leo thang không hết hạn — ADR-0052:61.) Giờ so là chuỗi ISO máy chủ (toISOString) — strftime('%f') cho cùng khuôn.
CREATE TRIGGER vc_transfer_request_han_cho BEFORE UPDATE ON vc_transfer_request
WHEN OLD.status = 'PENDING' AND (
  (NEW.status IN ('CONFIRMED', 'ESCALATED', 'DECLINED') AND NEW.decided_at >= strftime('%Y-%m-%dT%H:%M:%fZ', OLD.proposed_at,
      '+' || (SELECT p.accept_wait_minutes FROM vc_dispatch_policy p WHERE p.id = OLD.policy_id) || ' minutes'))
  OR (NEW.status = 'EXPIRED' AND NEW.updated_at < strftime('%Y-%m-%dT%H:%M:%fZ', OLD.proposed_at,
      '+' || (SELECT p.accept_wait_minutes FROM vc_dispatch_policy p WHERE p.id = OLD.policy_id) || ' minutes')))
BEGIN SELECT RAISE(ABORT, 'ck_han_cho: đề nghị đã quá hạn chờ (hoặc chưa tới hạn mà ghi hết hạn)'); END;
-- Mọi lần quyết / đóng nằm TRONG lô của chuyến nguồn hoặc chuyến đích (dấu lệnh = last_cmd_id của một trong hai) — kể cả tự huỷ (MQ-09, P4, Đ5).
CREATE TRIGGER vc_transfer_request_dong_trong_lo BEFORE UPDATE ON vc_transfer_request
WHEN (NEW.closed_cmd_id IS NOT NULL AND NEW.closed_cmd_id NOT IN (SELECT t.last_cmd_id FROM vc_trip t WHERE t.id IN (NEW.from_trip_id, NEW.to_trip_id)))
  OR (NEW.decided_cmd_id IS NOT OLD.decided_cmd_id AND NEW.decided_cmd_id IS NOT (SELECT t.last_cmd_id FROM vc_trip t WHERE t.id = NEW.to_trip_id))
BEGIN SELECT RAISE(ABORT, 'ck_trong_lo: đề nghị chỉ đổi trong lô của xe nhờ hoặc xe nhận'); END;
-- Nhóm lý do: Không nhận / Bác — TU_CHOI_NHAN; Duyệt — PHA_LE (ADR-0052 D4.1; ADR-0111 Đ2).
CREATE TRIGGER vc_transfer_request_ly_do BEFORE UPDATE ON vc_transfer_request
WHEN (NEW.decline_reason_code IS NOT NULL AND (SELECT reason_group FROM vc_reason WHERE code = NEW.decline_reason_code) IS NOT 'TU_CHOI_NHAN')
  OR (NEW.reject_reason_code IS NOT NULL AND (SELECT reason_group FROM vc_reason WHERE code = NEW.reject_reason_code) IS NOT 'TU_CHOI_NHAN')
  OR (NEW.override_reason_code IS NOT NULL AND (SELECT reason_group FROM vc_reason WHERE code = NEW.override_reason_code) IS NOT 'PHA_LE')
BEGIN SELECT RAISE(ABORT, 'ck_ly_do: lý do sai nhóm (Không nhận / Bác: nhóm Không nhận chuyển điểm; Duyệt: nhóm phá lệ)'); END;
-- MQ-02/MQ-03 — máy tự xác nhận: có ĐỦ dòng kiểm của lần bấm cho mọi điều kiện đang dùng, không dòng nào KHONG_DAT, và công tắc tự đồng ý của dòng
-- chính sách hiện hành LÚC QUYẾT (decided_at — không đọc policy_id lúc gửi) đang bật (Đ3 (c)).
CREATE TRIGGER vc_transfer_request_confirm_may BEFORE UPDATE ON vc_transfer_request
WHEN OLD.status = 'PENDING' AND NEW.status = 'CONFIRMED' AND (
  EXISTS (SELECT 1 FROM vc_transfer_rule r WHERE r.active = 1 AND NOT EXISTS (
            SELECT 1 FROM vc_transfer_check c WHERE c.transfer_id = NEW.id AND c.cmd_id = NEW.decided_cmd_id AND c.rule_code = r.code))
  OR EXISTS (SELECT 1 FROM vc_transfer_check c WHERE c.transfer_id = NEW.id AND c.cmd_id = NEW.decided_cmd_id AND c.ket_qua = 'KHONG_DAT')
  OR (SELECT p.auto_confirm_transfer FROM vc_dispatch_policy p WHERE p.valid_from_at <= NEW.decided_at ORDER BY p.valid_from_at DESC LIMIT 1) IS NOT 1)
BEGIN SELECT RAISE(ABORT, 'ck_confirm_may: máy chỉ tự xác nhận khi đủ dòng kiểm, mọi điều kiện đạt và công tắc tự đồng ý đang bật'); END;
-- Leo thang phải có bằng chứng: đủ dòng kiểm của lần bấm, và (có dòng KHONG_DAT, hoặc công tắc tự đồng ý lúc quyết đang tắt).
CREATE TRIGGER vc_transfer_request_escalate_has_evidence BEFORE UPDATE ON vc_transfer_request
WHEN OLD.status = 'PENDING' AND NEW.status = 'ESCALATED' AND (
  EXISTS (SELECT 1 FROM vc_transfer_rule r WHERE r.active = 1 AND NOT EXISTS (
            SELECT 1 FROM vc_transfer_check c WHERE c.transfer_id = NEW.id AND c.cmd_id = NEW.decided_cmd_id AND c.rule_code = r.code))
  OR (NOT EXISTS (SELECT 1 FROM vc_transfer_check c WHERE c.transfer_id = NEW.id AND c.cmd_id = NEW.decided_cmd_id AND c.ket_qua = 'KHONG_DAT')
      AND (SELECT p.auto_confirm_transfer FROM vc_dispatch_policy p WHERE p.valid_from_at <= NEW.decided_at ORDER BY p.valid_from_at DESC LIMIT 1) IS 1))
BEGIN SELECT RAISE(ABORT, 'ck_escalate: leo thang phải có dòng kiểm không đạt hoặc công tắc tự đồng ý đang tắt'); END;
-- ĐP4 + Đ3 (b): Quản trị / Toàn quyền duyệt đề nghị leo thang chỉ khi KHÔNG có dòng kiểm KHONG_DAT tầng LOI ở BẤT KỲ lần kiểm nào của đề nghị (mọi cmd_id —
-- ADR-0052:80), có lý do (cột ở CHECK), và lần duyệt đã chạy lại đủ dòng kiểm (dấu lệnh duyệt).
CREATE TRIGGER vc_transfer_request_confirm_core BEFORE UPDATE ON vc_transfer_request
WHEN OLD.status = 'ESCALATED' AND NEW.status = 'CONFIRMED' AND (
  EXISTS (SELECT 1 FROM vc_transfer_check c WHERE c.transfer_id = NEW.id AND c.ket_qua = 'KHONG_DAT' AND c.rule_tier = 'LOI')
  OR EXISTS (SELECT 1 FROM vc_transfer_rule r WHERE r.active = 1 AND NOT EXISTS (
               SELECT 1 FROM vc_transfer_check c WHERE c.transfer_id = NEW.id AND c.cmd_id = NEW.decided_cmd_id AND c.rule_code = r.code)))
BEGIN SELECT RAISE(ABORT, 'ck_confirm_core: đề nghị có điều kiện lõi không đạt — chỉ Bác được'); END;

-- ---- (3) Dòng kiểm ----------------------------------------------------------------------------------------------------------------------------------------
CREATE TABLE vc_transfer_check (
  id             TEXT PRIMARY KEY,
  transfer_id    TEXT NOT NULL REFERENCES vc_transfer_request(id),
  cmd_id         TEXT NOT NULL CHECK (length(cmd_id) = 36),
  rule_code      TEXT NOT NULL REFERENCES vc_transfer_rule(code),
  rule_tier      TEXT NOT NULL CHECK (rule_tier IN ('LOI', 'CAU_HINH')),
  ket_qua        TEXT NOT NULL CHECK (ket_qua IN ('DAT', 'KHONG_DAT', 'CANH_BAO')),
  gia_tri        INTEGER,
  gioi_han       INTEGER,
  policy_row_id  TEXT NOT NULL REFERENCES vc_dispatch_policy(id),
  checked_at     TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL CHECK (updated_at = created_at),
  updated_by     TEXT CHECK (updated_by IS created_by),
  UNIQUE (transfer_id, cmd_id, rule_code)
);
CREATE TRIGGER vc_transfer_check_no_update BEFORE UPDATE ON vc_transfer_check
BEGIN SELECT RAISE(ABORT, 'ck_append_only: dòng kiểm chuyển khách chỉ thêm'); END;
CREATE TRIGGER vc_transfer_check_no_delete BEFORE DELETE ON vc_transfer_check
BEGIN SELECT RAISE(ABORT, 'ck_append_only: dòng kiểm chuyển khách chỉ thêm'); END;
-- Tầng = tầng của danh mục; chỉ điều kiện đang dùng; chính sách = dòng hiện hành lúc kiểm; ghi trong lô của xe nhận khi đề nghị còn Chờ / Leo thang.
CREATE TRIGGER vc_transfer_check_rule BEFORE INSERT ON vc_transfer_check
WHEN NEW.rule_tier IS NOT (SELECT r.tier FROM vc_transfer_rule r WHERE r.code = NEW.rule_code)
  OR (SELECT r.active FROM vc_transfer_rule r WHERE r.code = NEW.rule_code) IS NOT 1
  OR NEW.policy_row_id IS NOT (SELECT p.id FROM vc_dispatch_policy p WHERE p.valid_from_at <= NEW.checked_at ORDER BY p.valid_from_at DESC LIMIT 1)
  OR NOT EXISTS (SELECT 1 FROM vc_transfer_request q JOIN vc_trip t ON t.id = q.to_trip_id
                  WHERE q.id = NEW.transfer_id AND q.status IN ('PENDING', 'ESCALATED') AND t.last_cmd_id = NEW.cmd_id)
BEGIN SELECT RAISE(ABORT, 'ck_check: dòng kiểm sai tầng / điều kiện đã tắt / sai chính sách / ngoài lô của xe nhận'); END;

-- ---- (4) Suất: hai cột của Đ3 (a) -----------------------------------------------------------------------------------------------------------------------
-- TRANSFERRED ⇔ có closed_transfer_id (CHECK dùng IS: close_reason NULL ở suất đang mở).
ALTER TABLE vc_trip_allocation ADD COLUMN transfer_id TEXT REFERENCES vc_transfer_request(id);
ALTER TABLE vc_trip_allocation ADD COLUMN closed_transfer_id TEXT REFERENCES vc_transfer_request(id)
  CHECK ((close_reason IS 'TRANSFERRED') = (closed_transfer_id IS NOT NULL));
DROP TRIGGER vc_trip_allocation_identity;
CREATE TRIGGER vc_trip_allocation_identity BEFORE UPDATE ON vc_trip_allocation
WHEN NEW.id IS NOT OLD.id OR NEW.trip_id IS NOT OLD.trip_id OR NEW.kind IS NOT OLD.kind OR NEW.leg_id IS NOT OLD.leg_id
  OR NEW.crew_party_id IS NOT OLD.crew_party_id OR NEW.board_stop_id IS NOT OLD.board_stop_id OR NEW.alight_stop_id IS NOT OLD.alight_stop_id
  OR NEW.valid_from_at IS NOT OLD.valid_from_at OR NEW.added_after_departure IS NOT OLD.added_after_departure OR NEW.opened_cmd_id IS NOT OLD.opened_cmd_id
  OR NEW.corrects_allocation_id IS NOT OLD.corrects_allocation_id OR NEW.transfer_id IS NOT OLD.transfer_id
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'lc04_identity: không đổi chuyến, chặng, điểm lên / xuống của suất — đổi điểm thì đóng suất và mở suất mới'); END;
-- Mở suất mang transfer_id: chỉ trong lô xác nhận của ĐÚNG đề nghị (CONFIRMED, chuyến đích = chuyến của suất, dấu lệnh đóng của đề nghị = dấu lệnh mở suất =
-- dấu lệnh hiện hành của chuyến đích — cùng nghĩa cho MAY và NGUOI); suất là bản sao của MỘT suất nguồn vừa đóng bằng chính đề nghị đó trong lô (cùng loại,
-- chặng, người, người đi kèm, trạng thái); cờ "thêm sau xuất bến" = xe nhận đang chạy. Suất mới không mang closed_transfer_id.
CREATE TRIGGER vc_trip_allocation_transfer_ins BEFORE INSERT ON vc_trip_allocation
WHEN NEW.closed_transfer_id IS NOT NULL
  OR (NEW.transfer_id IS NOT NULL AND (
        NEW.corrects_allocation_id IS NOT NULL
        OR NEW.added_after_departure IS NOT (CASE WHEN (SELECT status FROM vc_trip WHERE id = NEW.trip_id) = 'RUNNING' THEN 1 ELSE 0 END)
        OR NOT EXISTS (
          SELECT 1 FROM vc_transfer_request r JOIN vc_trip t ON t.id = r.to_trip_id
           WHERE r.id = NEW.transfer_id AND r.status = 'CONFIRMED' AND r.to_trip_id = NEW.trip_id AND r.closed_cmd_id = NEW.opened_cmd_id
             AND t.last_cmd_id = NEW.opened_cmd_id
             AND (r.scope = 'ONBOARD' OR (NEW.kind = 'PASSENGER' AND NEW.status = 'WAITING'))
             AND EXISTS (SELECT 1 FROM vc_trip_allocation c
                          WHERE c.trip_id = r.from_trip_id AND c.closed_transfer_id = r.id AND c.closed_cmd_id = NEW.opened_cmd_id
                            AND c.kind = NEW.kind AND c.leg_id IS NEW.leg_id AND c.passenger_key IS NEW.passenger_key
                            AND c.crew_party_id IS NEW.crew_party_id AND c.status = NEW.status))))
BEGIN SELECT RAISE(ABORT, 'lc15_transfer: suất chuyển sang chỉ mở trong lô xác nhận đúng đề nghị, chép đúng một suất vừa rời xe nhờ'); END;
-- closed_transfer_id chỉ đặt trong câu ĐÓNG; đóng TRANSFERRED chỉ trong lô xác nhận đúng đề nghị có chuyến nguồn = chuyến của suất (STOP: đúng suất khách
-- đang chờ ở điểm của đề nghị; ONBOARD: suất chờ / đã lên).
CREATE TRIGGER vc_trip_allocation_transfer_close BEFORE UPDATE ON vc_trip_allocation
WHEN (NEW.closed_transfer_id IS NOT OLD.closed_transfer_id AND NOT (OLD.valid_to_at IS NULL AND NEW.valid_to_at IS NOT NULL))
  OR (OLD.valid_to_at IS NULL AND NEW.valid_to_at IS NOT NULL AND NEW.close_reason IS 'TRANSFERRED' AND NOT EXISTS (
        SELECT 1 FROM vc_transfer_request r JOIN vc_trip t ON t.id = r.from_trip_id
         WHERE r.id = NEW.closed_transfer_id AND r.status = 'CONFIRMED' AND r.from_trip_id = NEW.trip_id AND r.closed_cmd_id = NEW.closed_cmd_id
           AND t.last_cmd_id = NEW.closed_cmd_id
           AND ((r.scope = 'ONBOARD' AND OLD.status IN ('WAITING', 'BOARDED'))
             OR (r.scope = 'STOP' AND OLD.kind = 'PASSENGER' AND OLD.status = 'WAITING' AND OLD.board_stop_id = r.from_stop_id))))
BEGIN SELECT RAISE(ABORT, 'lc15_transfer: suất chỉ rời xe theo đề nghị chuyển khách đã xác nhận trong chính lô đó'); END;

-- ---- (5) LC-15 dựng lại: đường thứ tư "đề nghị CONFIRMED" (ADR-0052 D4.2; ADR-0111 Đ3 (b), Đ4) ---------------------------------------------------------
-- Thân 0085 giữ nguyên ba nhánh cũ (chỉ PASSENGER); thêm nhánh TRANSFER_CONFIRMED cho cả PASSENGER lẫn CREW — chi tiết khớp đề nghị ở
-- vc_trip_allocation_transfer_ins.
DROP TRIGGER vc_trip_running_locked_alloc_ins;
CREATE TRIGGER vc_trip_running_locked_alloc_ins BEFORE INSERT ON vc_trip_allocation
WHEN ((SELECT status FROM vc_trip WHERE id = NEW.trip_id) = 'RUNNING' AND NOT (
        (NEW.added_after_departure = 1 AND NEW.kind = 'PASSENGER' AND NEW.opened_cmd_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
                     WHERE t.id = NEW.trip_id AND t.last_cmd_id = NEW.opened_cmd_id AND (
                       (e.kind = 'STOP_ADDED_RUNNING' AND NEW.corrects_allocation_id IS NULL)
                       OR (e.kind = 'ALLOCATION_STOP_CHANGED' AND NEW.corrects_allocation_id IS NULL AND EXISTS (
                             SELECT 1 FROM vc_trip_allocation c WHERE c.trip_id = NEW.trip_id AND c.leg_id IS NEW.leg_id AND c.passenger_key IS NEW.passenger_key
                               AND c.close_reason = 'STOP_CHANGED' AND c.closed_cmd_id = NEW.opened_cmd_id))
                       OR (e.kind = 'CORRECTION' AND NEW.corrects_allocation_id IS e.allocation_id AND EXISTS (
                             SELECT 1 FROM vc_trip_allocation c WHERE c.id = NEW.corrects_allocation_id AND c.trip_id = NEW.trip_id AND c.kind = 'PASSENGER'
                               AND c.leg_id IS NEW.leg_id AND c.passenger_key IS NEW.passenger_key AND c.board_stop_id IS NEW.board_stop_id
                               AND c.alight_stop_id IS NEW.alight_stop_id AND c.close_reason = 'REMOVED' AND c.closed_cmd_id = NEW.opened_cmd_id
                               AND ((c.status = 'BOARDED' AND NEW.status = 'WAITING'
                                       AND (SELECT s.status FROM vc_trip_stop s WHERE s.id = c.board_stop_id) IS NOT 'DONE')
                                 OR (c.status = 'BOARDED' AND NEW.status IN ('NO_SHOW', 'CANCELLED_AT_STOP'))
                                 OR (c.status = 'CANCELLED_AT_STOP' AND NEW.status IN ('BOARDED', 'NO_SHOW'))
                                 OR (c.status IN ('CANCELLED_AT_STOP', 'NO_SHOW') AND NEW.status = 'WAITING'
                                       AND (SELECT s.status FROM vc_trip_stop s WHERE s.id = c.board_stop_id) IS NOT 'DONE')
                                 OR (c.status = 'NO_SHOW' AND NEW.status = 'CANCELLED_AT_STOP')
                                 OR (c.status = 'DROPPED' AND NEW.status = 'BOARDED'
                                       AND (SELECT s.status FROM vc_trip_stop s WHERE s.id = c.alight_stop_id) IS NOT 'DONE')))))))
        OR (NEW.added_after_departure = 1 AND NEW.transfer_id IS NOT NULL AND NEW.opened_cmd_id IS NOT NULL AND NEW.corrects_allocation_id IS NULL
            AND EXISTS (SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
                         WHERE t.id = NEW.trip_id AND t.last_cmd_id = NEW.opened_cmd_id AND e.kind = 'TRANSFER_CONFIRMED' AND e.trip_id = NEW.trip_id))))
  OR ((SELECT status FROM vc_trip WHERE id = NEW.trip_id) <> 'RUNNING' AND (NEW.added_after_departure = 1 OR NEW.corrects_allocation_id IS NOT NULL))
BEGIN SELECT RAISE(ABORT, 'lc15_running: xe đang chạy — chỉ thêm khách bằng lệnh Thêm điểm, Cập nhật điểm theo đơn, Điều chỉnh của văn phòng hoặc Nhận chuyển khách'); END;
DROP TRIGGER vc_trip_running_locked_alloc_close;
CREATE TRIGGER vc_trip_running_locked_alloc_close BEFORE UPDATE OF valid_to_at ON vc_trip_allocation
WHEN OLD.valid_to_at IS NULL AND NEW.valid_to_at IS NOT NULL
  AND (SELECT status FROM vc_trip WHERE id = NEW.trip_id) = 'RUNNING'
  AND NOT (NEW.close_reason = 'TRIP_INTERRUPTED' AND EXISTS (
             SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
              WHERE t.id = NEW.trip_id AND t.status = 'RUNNING' AND e.kind = 'ENDED_INTERRUPTED'))
  AND NOT (NEW.close_reason = 'STOP_CHANGED' AND OLD.status = 'WAITING' AND OLD.kind = 'PASSENGER'
           AND EXISTS (SELECT 1 FROM vc_trip_stop s WHERE s.id = OLD.board_stop_id AND s.status = 'PENDING')
           AND EXISTS (SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
                        WHERE t.id = NEW.trip_id AND e.kind = 'ALLOCATION_STOP_CHANGED' AND NEW.closed_cmd_id = t.last_cmd_id))
  AND NOT (NEW.close_reason = 'REMOVED' AND OLD.kind = 'PASSENGER'
           AND EXISTS (SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
                        WHERE t.id = NEW.trip_id AND e.kind = 'CORRECTION' AND e.allocation_id = OLD.id AND NEW.closed_cmd_id = t.last_cmd_id))
  AND NOT (NEW.close_reason = 'TRANSFERRED' AND NEW.closed_transfer_id IS NOT NULL
           AND EXISTS (SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
                        WHERE t.id = NEW.trip_id AND e.kind = 'TRANSFER_CONFIRMED' AND e.related_trip_id = NEW.trip_id AND NEW.closed_cmd_id = t.last_cmd_id))
BEGIN SELECT RAISE(ABORT, 'lc15_running: xe đang chạy — không rút khách (chỉ đổi điểm cho khách đang chờ ở điểm chưa tới, điều chỉnh của văn phòng, hoặc chuyển khách đã xác nhận)'); END;
DROP TRIGGER vc_trip_running_locked_stop_ins;
CREATE TRIGGER vc_trip_running_locked_stop_ins BEFORE INSERT ON vc_trip_stop
WHEN ((SELECT status FROM vc_trip WHERE id = NEW.trip_id) = 'RUNNING' AND NOT (
        NEW.added_while_running = 1 AND EXISTS (SELECT 1 FROM vc_trip t JOIN vc_trip_event e ON e.id = t.last_cmd_id
                                                 WHERE t.id = NEW.trip_id
                                                   AND (e.kind IN ('STOP_ADDED_RUNNING', 'ALLOCATION_STOP_CHANGED')
                                                     OR (e.kind = 'TRANSFER_CONFIRMED' AND e.trip_id = NEW.trip_id)))))
  OR ((SELECT status FROM vc_trip WHERE id = NEW.trip_id) <> 'RUNNING' AND NEW.added_while_running = 1)
BEGIN SELECT RAISE(ABORT, 'lc15_running: xe đang chạy — chỉ thêm điểm bằng lệnh Thêm điểm của văn phòng, Cập nhật điểm theo đơn hoặc Nhận chuyển khách'); END;

-- ---- (6) Đ5 — thu hồi xuất bến -----------------------------------------------------------------------------------------------------------------------------
-- Chặn khi có (sau sự kiện DEPARTED cuối của chuyến, theo thứ tự chèn): một sự kiện của chính chuyến KHÔNG thuộc danh sách loại trừ mới (đề nghị chưa thành
-- không là tiến độ), HOẶC một sự kiện TRANSFER_CONFIRMED có related_trip_id = chuyến (xe đã giao khách cho xe khác). Máy chủ kiểm cùng luật trước.
DROP TRIGGER vc_trip_revoke_no_progress;
CREATE TRIGGER vc_trip_revoke_no_progress BEFORE UPDATE OF status ON vc_trip
WHEN OLD.status = 'RUNNING' AND NEW.status = 'PLANNED' AND EXISTS (
  SELECT 1 FROM vc_trip_event x
   WHERE x.id <> NEW.last_cmd_id
     AND ((x.trip_id = NEW.id AND x.kind NOT IN ('DEPARTED', 'DEPARTURE_REVOKED', 'TRANSFER_SENT', 'TRANSFER_WITHDRAWN', 'TRANSFER_DECLINED',
                                                  'TRANSFER_EXPIRED', 'TRANSFER_ESCALATED', 'TRANSFER_REJECTED'))
       OR (x.related_trip_id = NEW.id AND x.kind = 'TRANSFER_CONFIRMED'))
     AND x.rowid > (SELECT max(d.rowid) FROM vc_trip_event d WHERE d.trip_id = NEW.id AND d.kind = 'DEPARTED'))
BEGIN SELECT RAISE(ABORT, 'dc_revoke_progress: chuyến đã có tiến độ sau xuất bến — không thu hồi được'); END;

-- ---- (8) Lý do Không nhận / Bác (nhóm TU_CHOI_NHAN — đã định trong NHOM_LY_DO; 0041 ghi "chưa gieo"). Bốn dòng đúng chữ tệp tình huống
-- golden/dieu-phoi-luot-2/xe-a-b-luot-2-chuyen-khach.json ($nen.lyDo.TU_CHOI_NHAN, chủ xác nhận hộp 4); dòng cuối nhãn "Khác" theo luật gieo G4 (mỗi nhóm
-- đúng một "Khác" — tiền lệ 0076: bản vẽ ghi "Lý do khác", gieo "Khác"). -----------------------------------------------------------------------------
INSERT INTO vc_reason (code, reason_group, label, sort_order, created_at, updated_at) VALUES
  ('TU_CHOI_DAY_CHO', 'TU_CHOI_NHAN', 'Xe đã đầy chỗ', 1, '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z'),
  ('TU_CHOI_KHONG_KIP', 'TU_CHOI_NHAN', 'Không kịp giờ', 2, '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z'),
  ('TU_CHOI_SU_CO', 'TU_CHOI_NHAN', 'Đang xử lý sự cố', 3, '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z'),
  ('TU_CHOI_KHAC', 'TU_CHOI_NHAN', 'Khác', 99, '2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z');
