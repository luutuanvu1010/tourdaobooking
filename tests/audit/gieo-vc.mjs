// HÀM GIEO DÙNG CHUNG cho mọi chỗ chèn THẲNG suất khách bằng SQL (bài migration, ca gieo lỗi R-VC-*, khung thử) — ADR-0051 GB1, Task A-GB bước 0: từ 0043,
// trigger `vc_trip_allocation_needs_appt` chặn suất khách của chặng CHƯA có mốc giờ hẹn. Mã chạy thật mở suất qua lô xếp (chụp mốc XEP cùng lô); khung thử chèn
// thẳng thì gọi `gieoMocXep` trước — MỘT chỗ, không chép tay câu INSERT mốc ở từng tệp (R-VC-17 bắt bộ gieo quên).
// `db`: node:sqlite DatabaseSync (hoặc bất cứ thứ gì có `prepare(sql).run(...)` / `.get(...)`).

/** Dòng mốc XEP (seq 1) cho chặng `leg` nếu chặng CHƯA có mốc; có rồi thì thôi. Trả id dòng mốc (mới hoặc có sẵn). */
export function gieoMocXep(db, leg, { ngay = "2026-10-05", gio = "09:00", luc = "2026-09-29T03:00:00.000Z", id } = {}) {
  const co = db.prepare("SELECT id FROM vc_leg_appt_ack WHERE leg_id = ? AND seq = 1").get(leg);
  if (co) return co.id;
  const moi = id ?? `moc-xep-${leg}`;
  db.prepare(`INSERT INTO vc_leg_appt_ack (id, leg_id, seq, kind, appt_date, appt_time, created_at, updated_at) VALUES (?, ?, 1, 'XEP', ?, ?, ?, ?)`).run(moi, leg, ngay, gio, luc, luc);
  return moi;
}
