// S6 (bổ sung): (a) Quản trị MỘT MÌNH làm trọn đơn gấp (lập, xác nhận, đặt gấp, xếp) lúc 06:00; (b) Quản trị một mình thêm 1 khách vào đơn đã xếp;
// (c) đường A (đặt gấp chặng cũ rồi Bán hàng xếp) để lại dấu gì trong nhật ký / sự kiện chuyến.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADM, DRIVER, SALES, batDongHo, denGio, setup, vnMs, xe,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { demGoi, donXacNhan, ghi, lapDon, taiSql, taoChuyenRaw, tom, xep } from "./chung.mjs";

async function dung(w) {
  const d1 = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Sheraton", gio: "07:00" });
  const t = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}`, bd: "06:45", kt: "09:00" });
  const id = t.json.chuyen.id;
  assert.equal((await xep(w, id, [{ legId: d1.legId, soSuat: 2 }])).status, 200);
  denGio("06:00");
  return { d1, id };
}

test("S6 ADM một mình", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "20:00"));
  try {
    const w = setup();
    const { d1, id } = await dung(w);
    const goi = demGoi(w);
    const buoc = [];
    const lap = await lapDon(w, { as: ADM, soNguoi: 2, noiDon: "Khách sạn Gấp", gio: "07:00" });
    buoc.push(["ADM lập đơn", lap.status, lap.json?.error?.code]);
    const o = lap.json?.order;
    if (o) {
      const legId = o.services[0].legs[0].id;
      const x1 = await w.call("POST", `/api/orders/${o.id}/status`, { as: ADM, body: { status: "confirmed" } });
      buoc.push(["ADM xác nhận", x1.status, x1.json?.error?.code]);
      const g = await w.call("POST", `/api/orders/${o.id}/legs/${legId}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: "" } });
      buoc.push(["ADM đặt gấp", g.status, g.json?.error?.code]);
      const x2 = await w.call("POST", `/api/orders/${o.id}/status`, { as: ADM, body: { status: "confirmed" } });
      buoc.push(["ADM xác nhận lại", x2.status, x2.json?.error?.code]);
      const xp = await xep(w, id, [{ legId, soSuat: 2 }], ADM);
      buoc.push(["ADM xếp", xp.status, xp.json?.error?.code]);
    }
    ghi("S6adm.donGap", { buoc, demGoi: { ...goi.dem }, taiSql: taiSql(w, id) });
    // ADM thêm 1 khách vào d1 (đơn đã xếp)
    const me = await w.call("POST", `/api/orders/${d1.id}/handler-money-edit`, { as: ADM, body: { reason: "Thêm người", services: [{ id: d1.svcId, pax: { adult: 3, child: 0, senior: 0, infant: 0 } }] } });
    ghi("S6adm.themKhach.moneyEdit", tom(me));
    // Dấu vết đường A: Quản trị đặt gấp chặng CŨ d1 rồi Bán hàng xếp (không phá lệ) — nhật ký + sự kiện ghi gì.
    const g1 = await w.call("POST", `/api/orders/${d1.id}/legs/${d1.legId}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: "" } });
    // (đơn d1 vẫn 2 khách vì ADM không sửa được số khách → xếp thêm sẽ vượt số người chặng; chỉ xem nhật ký đặt gấp)
    ghi("S6adm.duongA.datGapChangCu", tom(g1));
    const nk = w.q("SELECT action, detail FROM audit_log WHERE action IN ('order_leg_short_notice') OR action LIKE 'trip_%' ORDER BY rowid").map((r) => ({ ...r }));
    ghi("S6adm.nhatKy", { dong: nk.slice(-6) });
    const pl = w.q("SELECT * FROM vc_trip_event ORDER BY rowid").map((r) => ({ loai: r.kind ?? r.event_kind ?? r.type, phaLe: r.override_rule ?? r.override_code ?? null, keys: Object.keys(r) }));
    ghi("S6adm.suKien", { dong: pl.slice(-3) });
  } finally {
    tat();
  }
});
