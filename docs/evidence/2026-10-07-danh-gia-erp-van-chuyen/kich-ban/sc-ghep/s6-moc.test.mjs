// S6 — Mốc 6 giờ THẬT (chính sách gieo 360 phút, không mốc giả). Chuyến 06:45–09:00 ngày 2027-03-11, khách xếp từ tối hôm trước (20:00);
// đồng hồ tiến tới 06:00 (45 phút trước giờ chạy) rồi: (i) đơn gấp mới đón 07:00; (ii) thêm 1 khách vào đơn đã xếp; (iii) bớt 1 khách; (iv) huỷ đơn đã xếp.
// Đếm bước + vai cần. Kiểm Bán hàng (SALES), Quản trị (ADM), Toàn quyền (SUP), Hướng dẫn viên phụ trách (FIELD).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADM, DRIVER, FIELD, NGAY, SALES, SUP, batDongHo, chiTiet, denGio, setup, tienDo, uuid, vnMs, xe,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { donXacNhan, ghi, lapDon, lyDoGiu, rut, taiSql, taoChuyenRaw, tom, xep } from "./chung.mjs";

const tom2 = (r) => ({ ...tom(r), canQuyen: r.json?.error?.canQuyen, legs: r.json?.error?.legs });
const suatCua = (w, tripId, legId) =>
  w.q("SELECT id, passenger_key k, status FROM vc_trip_allocation WHERE trip_id = ? AND leg_id = ? AND valid_to_at IS NULL ORDER BY rowid", tripId, legId).map((r) => ({ ...r }));
const datGap = (w, d, as) => w.call("POST", `/api/orders/${d.id}/legs/${d.legId}/short-notice`, { as, body: { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: "" } });
const suaSoKhach = (w, d, as, adult) =>
  w.call("POST", `/api/orders/${d.id}/handler-money-edit`, { as, body: { reason: "Khách báo thêm / bớt người sát giờ", services: [{ id: d.svcId, pax: { adult, child: 0, senior: 0, infant: 0 } }] } });

/** Tối 20:00 hôm trước: 3 đơn (2 khách mỗi đơn) đã xếp lên chuyến 06:45. Đồng hồ sau đó tới 06:00. */
async function dung(w) {
  const d1 = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Sheraton", gio: "07:00" });
  const d2 = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Havana", gio: "07:10" });
  const d3 = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Liberty", gio: "07:20" });
  const t = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}`, bd: "06:45", kt: "09:00" });
  assert.equal(t.status, 201, t.text);
  const id = t.json.chuyen.id;
  const r = await xep(w, id, [d1, d2, d3].map((d) => ({ legId: d.legId, soSuat: 2 })));
  assert.equal(r.status, 200, r.text);
  denGio("06:00");
  return { d1, d2, d3, id };
}

test("S6(i) đơn GẤP mới đón 07:00 lúc 06:00 → xác nhận, đặt gấp, xếp vào chuyến 06:45", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "20:00"));
  try {
    const w = setup();
    const { id } = await dung(w);
    const ct0 = await chiTiet(w, id);
    ghi("S6i.chuyen.khoaMoc", { khoaMoc: ct0.chuyen.khoaMoc?.dangKhoa, mocPhut: ct0.mocToiThieuPhut });
    const buoc = [];
    const lap = await lapDon(w, { soNguoi: 2, noiDon: "Khách sạn Gấp", gio: "07:00" });
    buoc.push(["SALES lập đơn (nháp)", lap.status]);
    ghi("S6i.lap", { ...tom2(lap), canhBaoMoc: lap.json?.canhBaoMoc ?? lap.json?.mocToiThieu ?? Object.keys(lap.json ?? {}) });
    const o = lap.json.order;
    const d = { id: o.id, legId: o.services[0].legs[0].id, svcId: o.services[0].id };
    const x1 = await w.call("POST", `/api/orders/${d.id}/status`, { as: SALES, body: { status: "confirmed" } });
    buoc.push(["SALES xác nhận", x1.status, x1.json?.error?.code]);
    ghi("S6i.xacNhan.SALES", tom2(x1));
    const g1 = await datGap(w, d, SALES);
    buoc.push(["SALES đặt gấp", g1.status, g1.json?.error?.code]);
    ghi("S6i.datGap.SALES", tom2(g1));
    const g2 = await datGap(w, d, ADM);
    buoc.push(["ADM đặt gấp", g2.status]);
    ghi("S6i.datGap.ADM", tom2(g2));
    const x2 = await w.call("POST", `/api/orders/${d.id}/status`, { as: SALES, body: { status: "confirmed" } });
    buoc.push(["SALES xác nhận lại", x2.status]);
    ghi("S6i.xacNhan2.SALES", tom2(x2));
    const xp = await xep(w, id, [{ legId: d.legId, soSuat: 2 }]);
    buoc.push(["SALES xếp vào chuyến trong vùng khoá", xp.status, xp.json?.error?.code]);
    ghi("S6i.xep.SALES", { ...tom2(xp), taiSql: taiSql(w, id), diem: xp.json?.diem?.map((z) => `${z.thuTu}.${z.tenNoi} ${z.gioHen?.gio ?? "-"}`) });
    ghi("S6i.buoc", { buoc, soLenhGhi: buoc.length });
  } finally {
    tat();
  }
});

test("S6(ii) thêm 1 khách vào đơn ĐÃ XẾP lúc 06:00 (chuyến 06:45) — đường A (đặt gấp) và đường B (phá lệ)", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "20:00"));
  try {
    const w = setup();
    const { d1, d2, id } = await dung(w);
    // Ai sửa được số khách lúc này?
    ghi("S6ii.moneyEdit.SALES", tom2(await suaSoKhach(w, d1, SALES, 3)));
    ghi("S6ii.moneyEdit.ADM", tom2(await suaSoKhach(w, d1, ADM, 3)));
    const giao = await w.call("PUT", `/api/orders/${d1.id}/handler`, { as: SALES, body: { staffId: FIELD } });
    ghi("S6ii.giaoHDV.SALES", tom2(giao));
    const me = await suaSoKhach(w, d1, FIELD, 3);
    ghi("S6ii.moneyEdit.FIELD", tom2(me));
    ghi("S6ii.sauSua", { lyDoGiu: lyDoGiu(await chiTiet(w, id)) });
    // Bán hàng xếp thêm 1 → mốc?
    const x1 = await xep(w, id, [{ legId: d1.legId, soSuat: 1 }]);
    ghi("S6ii.xep.SALES", tom2(x1));
    // Bán hàng gửi phá lệ → ?
    const x1b = await xep(w, id, [{ legId: d1.legId, soSuat: 1 }], SALES, { phaLe: { lyDo: "PHA_LE_DON_GAP" } });
    ghi("S6ii.xep.SALES_phaLe", tom2(x1b));
    // Đường A: Quản trị đặt gấp chặng cũ → Bán hàng xếp.
    const g = await datGap(w, d1, ADM);
    ghi("S6ii.A.datGap.ADM", tom2(g));
    const xa = await xep(w, id, [{ legId: d1.legId, soSuat: 1 }]);
    ghi("S6ii.A.xep.SALES", { ...tom2(xa), taiSql: taiSql(w, id), lyDoGiu: xa.status === 200 ? lyDoGiu(xa.json) : null });
    // Đường B: đơn d2 — Toàn quyền sửa số khách, Quản trị xếp kèm phá lệ.
    ghi("S6ii.B.moneyEdit.SUP", tom2(await suaSoKhach(w, d2, SUP, 3)));
    const xb = await xep(w, id, [{ legId: d2.legId, soSuat: 1 }], ADM, { phaLe: { lyDo: "PHA_LE_DON_GAP" } });
    ghi("S6ii.B.xep.ADM_phaLe", { ...tom2(xb), taiSql: taiSql(w, id), lyDoGiu: xb.status === 200 ? lyDoGiu(xb.json) : null });
    // Tên khách thêm (đủ tên bắt buộc theo chính sách gieo).
    for (const d of [d1, d2]) {
      const ds = (await w.call("GET", `/api/orders/${d.id}/passengers`, { as: SALES })).json;
      const t = await w.call("POST", `/api/orders/${d.id}/passengers`, { as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [{ fullName: "Khách Thêm Gấp", birthYear: 1988, paxCode: "adult" }], sua: [], huy: [] } });
      ghi(`S6ii.themTen.${d === d1 ? "d1" : "d2"}`, tom2(t));
    }
    ghi("S6ii.cuoi", { lyDoGiu: lyDoGiu(await chiTiet(w, id)), taiSql: taiSql(w, id) });
    denGio("06:45");
    const xbn = await tienDo(w, "van-phong", id, "xuat-ben");
    ghi("S6ii.xuatBen", tom2(xbn));
  } finally {
    tat();
  }
});

test("S6(iii) bớt 1 khách và (iv) huỷ đơn đã xếp lúc 06:00 — rút suất trong vùng khoá; xuất bến khi chưa rút", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "20:00"));
  try {
    const w = setup();
    const { d2, d3, id } = await dung(w);
    // (iii) bớt 1 khách của d2 (Toàn quyền sửa số khách).
    ghi("S6iii.moneyEdit.SUP", tom2(await suaSoKhach(w, d2, SUP, 1)));
    ghi("S6iii.sau", { lyDoGiu: lyDoGiu(await chiTiet(w, id)) });
    const s2 = suatCua(w, id, d2.legId);
    ghi("S6iii.rut.SALES", tom2(await rut(w, id, [s2[1].id])));
    // (iv) huỷ đơn d3.
    const h = await w.call("POST", `/api/orders/${d3.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
    ghi("S6iv.huy.SALES", tom2(h));
    ghi("S6iv.sau", { taiSql: taiSql(w, id), suatD3: suatCua(w, id, d3.legId).map((s) => s.status), lyDoGiu: lyDoGiu(await chiTiet(w, id)) });
    ghi("S6iv.rut.SALES", tom2(await rut(w, id, suatCua(w, id, d3.legId).map((s) => s.id))));
    // Tới giờ chạy mà chưa ai phá lệ: xuất bến?
    denGio("06:45");
    const xb1 = await tienDo(w, "van-phong", id, "xuat-ben");
    ghi("S6iv.xuatBen.chuaRut.vanPhong", tom2(xb1));
    const xb1t = await tienDo(w, "tai-xe", id, "xuat-ben");
    ghi("S6iv.xuatBen.chuaRut.taiXe", tom2(xb1t));
    // Quản trị phá lệ rút cả hai.
    const r = await rut(w, id, [s2[1].id, ...suatCua(w, id, d3.legId).map((s) => s.id)], ADM, { phaLe: { lyDo: "PHA_LE_SU_CO" } });
    ghi("S6iv.rut.ADM_phaLe", { ...tom2(r), taiSql: taiSql(w, id), lyDoGiu: r.status === 200 ? lyDoGiu(r.json) : null });
    const xb2 = await tienDo(w, "van-phong", id, "xuat-ben");
    ghi("S6iv.xuatBen.sauRut", tom2(xb2));
  } finally {
    tat();
  }
});

test("S6(v) xe ĐÃ xuất bến (06:46): thêm 1 khách đơn đã có / đơn gấp mới bằng them-diem", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "20:00"));
  try {
    const w = setup();
    const { d1, id } = await dung(w);
    denGio("06:45");
    const xb = await tienDo(w, "van-phong", id, "xuat-ben");
    ghi("S6v.xuatBen", tom2(xb));
    denGio("06:46");
    const giao = await w.call("PUT", `/api/orders/${d1.id}/handler`, { as: SALES, body: { staffId: FIELD } });
    const me = await suaSoKhach(w, d1, FIELD, 3);
    ghi("S6v.moneyEdit.FIELD", { giao: giao.status, ...tom2(me) });
    const c = await chiTiet(w, id);
    const td = await w.call("POST", `/api/van-chuyen/chuyen/${id}/them-diem`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), chang: [{ legId: d1.legId, soSuat: 1 }] } });
    ghi("S6v.themDiem.SALES", tom2(td));
    const c2 = await chiTiet(w, id);
    const tda = await w.call("POST", `/api/van-chuyen/chuyen/${id}/them-diem`, { as: ADM, body: { version: c2.chuyen.version, requestId: uuid(), chang: [{ legId: d1.legId, soSuat: 1 }], phaLe: { lyDo: "PHA_LE_DON_GAP" } } });
    ghi("S6v.themDiem.ADM_phaLe", { ...tom2(tda), taiSql: taiSql(w, id) });
  } finally {
    tat();
  }
});
