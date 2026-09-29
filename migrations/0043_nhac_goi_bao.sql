-- 0043 — ADR-0051 GB1 (accepted 29/9, "Trả lời lần 14"): MỐC "GIỜ HẸN ĐÃ BIẾT" của chặng (module van-chuyen, tiền tố vc_). PHẢI lên production CÙNG lần phát
-- hành với 0042 (trigger vc_trip_allocation_needs_appt bám bảng suất của 0042 — suất khách đã mở trước khi có mốc sẽ làm lệnh dời / cập nhật điểm bị chặn;
-- tách hai lần phát hành thì DỪNG, hỏi điều phối: cần bước bù mốc).
-- Dòng ghi nhận CHỈ THÊM (Hiến chương 2.2, 5.5): mỗi dòng trả lời "từ lúc này, giờ hẹn mà bên xe coi là khách đã biết là X, do ai, vì sao". Ba loại (tập đóng):
--   XEP          — máy chụp trong lô XẾP khi chặng LẦN ĐẦU lên xe (không chụp lại khi dời / cập nhật điểm / rút rồi xếp lại — bẫy "tái mốc");
--   DA_GOI       — người bấm "Đã gọi báo" (id = audit_log.id của lệnh — nối một-một, không khoá ngoại, khuôn 0021);
--   BO_DANH_DAU  — dòng ĐẢO của một DA_GOI (khôi phục đúng giờ trước khi bấm).
-- leg_id: tham chiếu LOGIC tới ord_transfer_leg(id) — KHÔNG khoá ngoại (R-P19, chủ chốt 29/9 "Trả lời lần 13"; cùng cách vc_trip_allocation.leg_id). Chặng luôn
-- hợp lệ: dòng XEP chỉ sinh trong lô mở suất (đã qua LC-09); dòng khác đòi chặng còn suất khách chờ đón (trigger …_active). Không tên, không SĐT, không nơi.
-- Thân trigger CHỈ đọc bảng vc_ (Hiến chương 5.3). Câu báo bắt đầu `gb_` → máy chủ đổi thành 409 (loiRangBuocChuyen).
CREATE TABLE vc_leg_appt_ack (
  id              TEXT PRIMARY KEY,
  leg_id          TEXT NOT NULL,
  seq             INTEGER NOT NULL CHECK (seq >= 1),
  kind            TEXT NOT NULL CHECK (kind IN ('XEP', 'DA_GOI', 'BO_DANH_DAU')),
  appt_date       TEXT NOT NULL CHECK (date(appt_date) IS appt_date),
  appt_time       TEXT CHECK (appt_time IS NULL OR appt_time GLOB '[01][0-9]:[0-5][0-9]' OR appt_time GLOB '2[0-3]:[0-5][0-9]'),
  prev_appt_date  TEXT CHECK (prev_appt_date IS NULL OR date(prev_appt_date) IS prev_appt_date),
  prev_appt_time  TEXT CHECK (prev_appt_time IS NULL OR prev_appt_time GLOB '[01][0-9]:[0-5][0-9]' OR prev_appt_time GLOB '2[0-3]:[0-5][0-9]'),
  request_id      TEXT UNIQUE CHECK (request_id IS NULL OR length(request_id) = 36),
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT,
  -- Chuỗi mốc của một chặng: seq 1, 2, 3… (liên tục — trigger …_chain); UNIQUE là lưới cuối nếu "D1 chạy lô lần lượt" sai (ADR-0049 "Chưa kiểm").
  UNIQUE (leg_id, seq),
  CHECK ((seq = 1) = (kind = 'XEP')),
  CHECK ((kind = 'XEP') = (request_id IS NULL)),
  CHECK ((kind = 'XEP') = (prev_appt_date IS NULL)),
  CHECK (kind <> 'XEP' OR prev_appt_time IS NULL),
  -- Dòng người bấm luôn là một THAY ĐỔI (so "IS": giờ NULL = "chưa chốt giờ" là một giá trị).
  CHECK (kind = 'XEP' OR NOT (appt_date IS prev_appt_date AND appt_time IS prev_appt_time))
);

CREATE TRIGGER vc_leg_appt_ack_no_update BEFORE UPDATE ON vc_leg_appt_ack
BEGIN SELECT RAISE(ABORT, 'gb_append_only: mốc giờ hẹn chỉ thêm — không sửa'); END;
CREATE TRIGGER vc_leg_appt_ack_no_delete BEFORE DELETE ON vc_leg_appt_ack
BEGIN SELECT RAISE(ABORT, 'gb_append_only: mốc giờ hẹn chỉ thêm — không xoá'); END;

-- Chuỗi: dòng seq > 1 phải nối đúng dòng seq − 1 (giờ "trước" của dòng mới = giờ của dòng trước). BO_DANH_DAU: dòng trước phải là DA_GOI và dòng mới khôi
-- phục ĐÚNG giờ trước khi bấm (appt_* mới IS prev_appt_* của dòng DA_GOI).
CREATE TRIGGER vc_leg_appt_ack_chain BEFORE INSERT ON vc_leg_appt_ack
WHEN NEW.seq > 1 AND (
  NOT EXISTS (SELECT 1 FROM vc_leg_appt_ack p
               WHERE p.leg_id = NEW.leg_id AND p.seq = NEW.seq - 1 AND p.appt_date IS NEW.prev_appt_date AND p.appt_time IS NEW.prev_appt_time)
  OR (NEW.kind = 'BO_DANH_DAU' AND NOT EXISTS (SELECT 1 FROM vc_leg_appt_ack p
               WHERE p.leg_id = NEW.leg_id AND p.seq = NEW.seq - 1 AND p.kind = 'DA_GOI' AND NEW.appt_date IS p.prev_appt_date AND NEW.appt_time IS p.prev_appt_time)))
BEGIN SELECT RAISE(ABORT, 'gb_chain: chuỗi mốc giờ hẹn không liền mạch'); END;

-- Dòng người bấm chỉ khi chặng còn khách CHỜ ĐÓN trên xe chưa kết thúc (suất khách mở WAITING, chuyến PLANNED / RUNNING).
CREATE TRIGGER vc_leg_appt_ack_active BEFORE INSERT ON vc_leg_appt_ack
WHEN NEW.kind <> 'XEP' AND NOT EXISTS (
  SELECT 1 FROM vc_trip_allocation a JOIN vc_trip t ON t.id = a.trip_id
   WHERE a.leg_id = NEW.leg_id AND a.kind = 'PASSENGER' AND a.valid_to_at IS NULL AND a.status = 'WAITING' AND t.status IN ('PLANNED', 'RUNNING'))
BEGIN SELECT RAISE(ABORT, 'gb_active: chặng không còn khách chờ đón trên xe'); END;

-- Mọi lệnh mở suất KHÁCH (lượt 1: xếp; lượt 2: thêm khách lên xe đang chạy…) phải có mốc của chặng — lô xếp chụp mốc TRƯỚC câu mở suất. leg_id NULL (sai hình)
-- để CHECK của bảng suất báo đúng lỗi.
CREATE TRIGGER vc_trip_allocation_needs_appt BEFORE INSERT ON vc_trip_allocation
WHEN NEW.kind = 'PASSENGER' AND NEW.leg_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vc_leg_appt_ack m WHERE m.leg_id = NEW.leg_id)
BEGIN SELECT RAISE(ABORT, 'gb_needs_appt: chặng chưa có mốc giờ hẹn — lệnh mở suất khách phải chụp mốc cùng lô'); END;
