// Bộ dựng LÔ gộp hồ sơ (ADR-0068 Đ1) từ kế hoạch thuần (gop.ts): câu CHƯA chạy, mỗi câu mang lính gác trạng thái (repository.ts — kế hoạch R1). Thứ tự CỐ ĐỊNH:
// liên hệ (đóng A → mở B) → công việc (đóng A → mở B; vai Nhà xe có ở B TRƯỚC quan hệ "Tài xế của" → B — trigger drives_for_carrier kiểm lúc chèn) → quan hệ
// (đóng A → mở B) → giấy tờ (huỷ mới → cũ, rồi chép sang B — trigger *_superseded, *_cccd_one_person_ins). Route ghép tiếp: câu đổi người đặt đơn
// (ctx.gopHoSo.cauDoiDon, TRƯỚC câu lật) → `lat` → hai dòng nhật ký `changes() > 0`. Không import module khác (chạy được bằng node --test).
import type { KeHoachGop } from "./gop.ts";
import {
  gopChepGiayToStatement, gopDongLienHeStatement, gopDongQuanHeStatement, gopDongVaiStatement, gopHuyGiayToStatement, gopLatStatement, gopMoLienHeStatement,
  gopMoQuanHeStatement, gopMoVaiStatement, type GopDocRow,
} from "./repository.ts";

export interface LoGop { truocDon: D1PreparedStatement[]; lat: D1PreparedStatement }

export function loGop(
  db: D1Database,
  v: { a: string; b: string; ke: KeHoachGop; giayToDu: ReadonlyMap<string, GopDocRow>; homNay: string; at: string; actorId: string },
): LoGop {
  const { a, b, ke, homNay, at, actorId } = v;
  const n = { a, b, at, actorId };
  const du = (id: string): GopDocRow => {
    const r = v.giayToDu.get(id);
    if (!r) throw new Error(`loGop: thiếu dòng giấy tờ ${id} trong giayToDu`);
    return r;
  };
  const s: D1PreparedStatement[] = [
    ...ke.lienHe.dong.map((c) => gopDongLienHeStatement(db, { ...n, id: c.id, homNay })),
    ...ke.lienHe.mo.map((m) =>
      gopMoLienHeStatement(db, { ...n, kind: m.tu.kind, value: m.tu.value, valueNormalized: m.tu.valueNormalized, label: m.tu.label, isPrimary: m.chinh, from: homNay })),
    ...ke.congViec.dong.map((r) => gopDongVaiStatement(db, { ...n, id: r.id, homNay })),
    ...ke.congViec.mo.map((r) => gopMoVaiStatement(db, { ...n, code: r.code, locationId: r.locationId, from: homNay, to: r.validTo })),
    ...ke.quanHe.dong.map((x) => gopDongQuanHeStatement(db, { ...n, id: x.id, homNay })),
    ...ke.quanHe.mo.map((m) => gopMoQuanHeStatement(db, { ...n, fromId: m.fromId, toId: m.toId, typeCode: m.tu.typeCode, from: homNay, to: m.tu.validTo })),
    ...ke.giayTo.huy.map((d) => gopHuyGiayToStatement(db, { ...n, id: d.id, expectedUpdatedAt: du(d.id).updated_at })),
    ...ke.giayTo.chep.map((d) => gopChepGiayToStatement(db, { ...n, du: du(d.id) })),
  ];
  return { truocDon: s, lat: gopLatStatement(db, { ...n, homNay }) };
}
