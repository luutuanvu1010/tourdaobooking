// S6 (đòn bẩy sẵn có): Toàn quyền giảm mốc tối thiểu (route chính sách điều phối, chỉ-thêm) — rồi lặp lại các thao tác sát giờ bằng tài khoản Bán hàng.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADM, DRIVER, SALES, SUP, batDongHo, chiTiet, denGio, setup, tienDo, vnMs, xe,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { donXacNhan, ghi, lapDon, lyDoGiu, rut, taiSql, taoChuyenRaw, tom, xep } from "./chung.mjs";

const suatCua = (w, tripId, legId) => w.q("SELECT id FROM vc_trip_allocation WHERE trip_id = ? AND leg_id = ? AND valid_to_at IS NULL", tripId, legId).map((r) => r.id);

test("S6 chính sách: mốc 30 phút — Bán hàng tự xác nhận đơn gấp, tự rút khách huỷ lúc T-45", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "20:00"));
  try {
    const w = setup();
    const d1 = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Sheraton", gio: "07:00" });
    const d2 = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Havana", gio: "07:10" });
    const t = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}`, bd: "06:45", kt: "09:00" });
    const id = t.json.chuyen.id;
    assert.equal((await xep(w, id, [d1, d2].map((d) => ({ legId: d.legId, soSuat: 2 })))).status, 200);
    const cs0 = (await w.call("GET", "/api/van-chuyen/chinh-sach-dieu-phoi", { as: SUP })).json;
    ghi("S6cs.chinhSach.hienHanh", { keys: Object.keys(cs0 ?? {}), hienHanh: cs0?.hienHanh ?? cs0?.chinhSach ?? null });
    const body = { minLeadMinutes: 30, warnLeadMinutes: 30, restMinutes: 30, requireManifest: true, requireContract: false, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 600, tripNoBreakMaxMinutes: 240 };
    ghi("S6cs.doi.ADM", tom(await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { as: ADM, body })));
    const p = await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { as: SUP, body });
    ghi("S6cs.doi.SUP", tom(p));
    denGio("06:00");
    // Đơn gấp đón 07:00 (60 phút) — Bán hàng tự xác nhận?
    const lap = await lapDon(w, { soNguoi: 2, noiDon: "Khách sạn Gấp", gio: "07:00" });
    const o = lap.json.order;
    const x = await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } });
    ghi("S6cs.xacNhanGap.SALES", tom(x));
    const xp = await xep(w, id, [{ legId: o.services[0].legs[0].id, soSuat: 2 }]);
    ghi("S6cs.xepGap.SALES", { ...tom(xp), taiSql: taiSql(w, id) });
    // Huỷ d2 rồi Bán hàng tự rút lúc T-45.
    ghi("S6cs.huy.SALES", tom(await w.call("POST", `/api/orders/${d2.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })));
    const r = await rut(w, id, suatCua(w, id, d2.legId));
    ghi("S6cs.rut.SALES", { ...tom(r), taiSql: taiSql(w, id), lyDoGiu: r.status === 200 ? lyDoGiu(r.json) : null });
    // T-10 (06:35): vào vùng 30 phút → Bán hàng rút lại bị khoá.
    denGio("06:20");
    const ct = await chiTiet(w, id);
    ghi("S6cs.06h20.khoaMoc", { dangKhoa: ct.chuyen.khoaMoc?.dangKhoa });
    const xb = await tienDo(w, "van-phong", id, "xuat-ben");
    ghi("S6cs.xuatBen.06h20", tom(xb));
  } finally {
    tat();
  }
});
