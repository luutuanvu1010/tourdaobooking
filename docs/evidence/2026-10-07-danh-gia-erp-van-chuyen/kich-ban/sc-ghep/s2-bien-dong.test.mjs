// S2 — Biến động sau khi xếp (ngoài mốc 6 giờ): (a) thêm 1 khách vào đơn đã xếp; (b) bớt 1 khách; (c) đổi nơi đón; (d) huỷ đơn đã xếp; (e) thêm đơn mới.
// Đồng hồ giả 2027-03-10 06:00 VN, chuyến chạy 2027-03-11 06:30–10:00 (ngoài vùng khoá 6 giờ).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADM, DRIVER, FIELD, NGAY, SALES, SUP, batDongHo, chiTiet, setup, uuid, vnMs, xe,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { demGoi, donXacNhan, ghi, lyDoGiu, rut, taiSql, taoChuyenRaw, tom, xep } from "./chung.mjs";

const suatCua = (w, tripId, legId) =>
  w.q("SELECT id, passenger_key k, status FROM vc_trip_allocation WHERE trip_id = ? AND leg_id = ? AND valid_to_at IS NULL ORDER BY rowid", tripId, legId).map((r) => ({ ...r }));
const capNhat = async (w, tripId, duoi, as = SALES) =>
  w.call("POST", `/api/van-chuyen/chuyen/${tripId}/${duoi}`, { as, body: { version: (await chiTiet(w, tripId)).chuyen.version, requestId: uuid() } });
const trangThaiChang = async (w, legId) => {
  const l = (await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json;
  const c = l.chang.find((x) => x.legId === legId);
  return c ? { trangThai: c.trangThai, nhan: c.trangThaiNhan, soNguoi: c.soNguoi, soDaXep: c.soDaXep } : null;
};
const suaSoKhach = (w, d, as, adult) =>
  w.call("POST", `/api/orders/${d.id}/handler-money-edit`, { as, body: { reason: "Khách báo thêm / bớt người", services: [{ id: d.svcId, pax: { adult, child: 0, senior: 0, infant: 0 } }] } });

async function dung(w) {
  const d1 = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Sheraton", gio: "07:00" });
  const d2 = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Havana", gio: "07:10" });
  const d3 = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Liberty", gio: "07:20" });
  const d4 = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Novotel", gio: "07:30" });
  const t = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}` });
  assert.equal(t.status, 201, t.text);
  const id = t.json.chuyen.id;
  const r = await xep(w, id, [d1, d2, d3, d4].map((d) => ({ legId: d.legId, soSuat: 2 })));
  assert.equal(r.status, 200, r.text);
  return { d1, d2, d3, d4, id };
}

test("S2(a) thêm 1 khách vào đơn đã xếp", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    const { d2, id } = await dung(w);
    const goi = demGoi(w);
    // Đường 1: sửa đơn (form đơn) sau xác nhận.
    const put = await w.call("PUT", `/api/orders/${d2.id}`, { as: SALES, body: { expectedUpdatedAt: "x" } });
    ghi("S2a.PUT_order.SALES", tom(put));
    // Đường 2: route "sửa số khách" của người phụ trách.
    ghi("S2a.moneyEdit.SALES", tom(await suaSoKhach(w, d2, SALES, 3)));
    ghi("S2a.moneyEdit.ADM", tom(await suaSoKhach(w, d2, ADM, 3)));
    const giao = await w.call("PUT", `/api/orders/${d2.id}/handler`, { as: SALES, body: { staffId: FIELD } });
    ghi("S2a.giaoHDV", tom(giao));
    const me = await suaSoKhach(w, d2, FIELD, 3);
    ghi("S2a.moneyEdit.FIELD_dangPhuTrach", { ...tom(me), json: me.json });
    const ct = await chiTiet(w, id);
    ghi("S2a.sau.chuyen", { taiSql: taiSql(w, id), suat: suatCua(w, id, d2.legId).length, lyDoGiu: lyDoGiu(ct), lich: await trangThaiChang(w, d2.legId) });
    const ck = await capNhat(w, id, "cap-nhat-khach");
    ghi("S2a.capNhatKhach", { ...tom(ck), daCapNhat: ck.json?.daCapNhat, taiSql: taiSql(w, id) });
    const x = await xep(w, id, [{ legId: d2.legId, soSuat: 1 }]);
    ghi("S2a.xepThem1", { ...tom(x), taiSql: taiSql(w, id), lyDoGiu: x.status === 200 ? lyDoGiu(x.json) : null, canhBaoXep: x.json?.canhBaoXep?.map((l) => l.ma) });
    // Bổ sung tên khách thứ 3 ở đơn (Bán hàng — người lập).
    const ds = (await w.call("GET", `/api/orders/${d2.id}/passengers`, { as: SALES })).json;
    const ten = await w.call("POST", `/api/orders/${d2.id}/passengers`, { as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [{ fullName: "Khách Thêm Dò Tìm", birthYear: 1985, paxCode: "adult" }], sua: [], huy: [] } });
    ghi("S2a.themTen", tom(ten));
    ghi("S2a.cuoi", { lyDoGiu: lyDoGiu(await chiTiet(w, id)), lich: await trangThaiChang(w, d2.legId), suat: suatCua(w, id, d2.legId) });
    ghi("S2a.demGoi", { ...goi.dem });
  } finally {
    tat();
  }
});

test("S2(a') thêm TÊN khách vượt số khách (không đổi số khách) — chuyến có biết không", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    const { d2, id } = await dung(w);
    const ds = (await w.call("GET", `/api/orders/${d2.id}/passengers`, { as: SALES })).json;
    const ten = await w.call("POST", `/api/orders/${d2.id}/passengers`, { as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [{ fullName: "Khách Thứ Ba Dò Tìm", birthYear: 1985, paxCode: "adult" }], sua: [], huy: [] } });
    ghi("S2a2.themTenVuot", { ...tom(ten), keys: ten.json ? Object.keys(ten.json) : null, vuot: ten.json?.vuotSoKhach ?? ten.json?.nhieuHonSoKhach ?? null });
    ghi("S2a2.chuyen", { taiSql: taiSql(w, id), lyDoGiu: lyDoGiu(await chiTiet(w, id)), lich: await trangThaiChang(w, d2.legId) });
  } finally {
    tat();
  }
});

test("S2(b) bớt 1 khách của đơn đã xếp", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    const { d3, id } = await dung(w);
    const goi = demGoi(w);
    const me = await suaSoKhach(w, d3, SUP, 1);
    ghi("S2b.moneyEdit.SUP", tom(me));
    ghi("S2b.sau", { taiSql: taiSql(w, id), lyDoGiu: lyDoGiu(await chiTiet(w, id)), lich: await trangThaiChang(w, d3.legId) });
    const ck = await capNhat(w, id, "cap-nhat-khach");
    ghi("S2b.capNhatKhach", { ...tom(ck), daCapNhat: ck.json?.daCapNhat, taiSql: taiSql(w, id) });
    const s = suatCua(w, id, d3.legId);
    const r = await rut(w, id, [s[1].id]);
    ghi("S2b.rut1", { ...tom(r), taiSql: taiSql(w, id), lyDoGiu: r.status === 200 ? lyDoGiu(r.json) : null });
    ghi("S2b.demGoi", { ...goi.dem });
  } finally {
    tat();
  }
});

test("S2(c) đổi nơi đón của một đơn đã xếp", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    const { d4, id } = await dung(w);
    const o = (await w.call("GET", `/api/orders/${d4.id}`, { as: SALES })).json.order;
    const l = o.services[0].legs[0];
    const goi = demGoi(w);
    const sua = await w.call("PUT", `/api/orders/${d4.id}/legs/${l.id}`, {
      as: SALES,
      body: { expectedUpdatedAt: l.updatedAt, leg: { pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: null, pickupPlace: "Khách sạn Mới Đổi", dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "" } },
    });
    ghi("S2c.suaChang", tom(sua));
    const ct = await chiTiet(w, id);
    ghi("S2c.sau", { lyDoGiu: lyDoGiu(ct), diem: ct.diem.map((d) => `${d.thuTu}.${d.tenNoi}${d.lechDon ? " [lệch]" : ""}`) });
    const cd = await capNhat(w, id, "cap-nhat-diem");
    ghi("S2c.capNhatDiem", { ...tom(cd), daCapNhat: cd.json?.daCapNhat, diem: cd.json?.diem?.map((d) => `${d.thuTu}.${d.loai} ${d.tenNoi} ${d.gioHen?.gio ?? "-"} ${d.trangThai}`), lyDoGiu: cd.status === 200 ? lyDoGiu(cd.json) : null });
    // Đổi GIỜ đón (07:30 → 09:30, còn trong khung chuyến): chuyến biết không, ai được nhắc.
    const o2 = (await w.call("GET", `/api/orders/${d4.id}`, { as: SALES })).json.order;
    const l2 = o2.services[0].legs[0];
    const suaGio = await w.call("PUT", `/api/orders/${d4.id}/legs/${l2.id}`, {
      as: SALES,
      body: { expectedUpdatedAt: l2.updatedAt, leg: { pickupDate: l2.pickupDate, pickupTime: "09:30", pickupLocationId: null, pickupPlace: l2.pickupPlace, dropoffLocationId: l2.dropoffLocationId, dropoffPlace: l2.dropoffPlace ?? "" } },
    });
    ghi("S2c.suaGio", tom(suaGio));
    const ct2 = await chiTiet(w, id);
    ghi("S2c.sauSuaGio", { lyDoGiu: lyDoGiu(ct2), goiBao: ct2.goiBao?.map((g) => ({ maDon: g.maDon, cu: g.gioHenDoi?.cu?.gio, moi: g.gioHenDoi?.moi?.gio })), diem: ct2.diem.map((d) => `${d.thuTu}.${d.tenNoi} ${d.gioHen?.gio ?? "-"}`) });
    ghi("S2c.demGoi", { ...goi.dem });
  } finally {
    tat();
  }
});

test("S2(d) huỷ đơn đã xếp (ngoài mốc)", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    const { d1, id } = await dung(w);
    const goi = demGoi(w);
    const h = await w.call("POST", `/api/orders/${d1.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
    ghi("S2d.huy", tom(h));
    const ct = await chiTiet(w, id);
    ghi("S2d.sau", { taiSql: taiSql(w, id), suatD1: suatCua(w, id, d1.legId), lyDoGiu: lyDoGiu(ct), tai: ct.chuyen.tai });
    const ck = await capNhat(w, id, "cap-nhat-khach");
    ghi("S2d.capNhatKhach", { ...tom(ck), daCapNhat: ck.json?.daCapNhat, taiSql: taiSql(w, id) });
    const r = await rut(w, id, suatCua(w, id, d1.legId).map((s) => s.id));
    ghi("S2d.rut", { ...tom(r), taiSql: taiSql(w, id), lyDoGiu: r.status === 200 ? lyDoGiu(r.json) : null, diem: r.json?.diem?.map((d) => `${d.thuTu}.${d.tenNoi} ${d.trangThai}`) });
    ghi("S2d.demGoi", { ...goi.dem });
  } finally {
    tat();
  }
});

test("S2(e) thêm đơn MỚI vào chuyến đã có", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    const { id } = await dung(w);
    const d5 = await donXacNhan(w, { soNguoi: 3, noiDon: "Nhà riêng 45 Hùng Vương", gio: "07:05" });
    const goi = demGoi(w);
    const r = await xep(w, id, [{ legId: d5.legId, soSuat: 3 }]);
    ghi("S2e.xep", { ...tom(r), taiSql: taiSql(w, id), diem: r.json?.diem?.map((d) => `${d.thuTu}.${d.loai} ${d.tenNoi} ${d.gioHen?.gio ?? "-"}`) });
    ghi("S2e.demGoi", { ...goi.dem });
  } finally {
    tat();
  }
});
