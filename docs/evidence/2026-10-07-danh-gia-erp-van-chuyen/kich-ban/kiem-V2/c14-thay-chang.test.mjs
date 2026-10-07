// Kiểm C14: bảng "Sửa đưa đón" gửi lệnh rời; đóng chặng không xét mốc, thêm chặng thì xét. CHỈ ĐỌC repo. Dữ liệu GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { setup, batDongHo, denGio, don, xe, taoChuyen, xepHet, chiTiet, SALES, ADM, DRIVER, LOC, NGAY } from "../../../../../tests/audit/dieu-phoi-khung.mjs";

const ghi = (n, o) => console.log(`OBS ${n} ${JSON.stringify(o)}`);
const tom = (r) => ({ status: r.status, code: r.json?.error?.code ?? null, msg: r.json?.error?.message ?? null });

test("C14: thay chặng sát giờ bằng Bán hàng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d1 = await don(w, { gio: "13:00", noiDon: "Khách sạn Cũ" });
    const d2 = await don(w, { gio: "13:00", noiDon: "Khách sạn Hai" });
    const d3 = await don(w, { gio: "13:00", noiDon: "Khách sạn Ba" });
    // d3 xếp lên chuyến trước khi tới sát giờ
    const c = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, c, d3, 2);
    denGio("08:00"); // còn 5 giờ tới giờ đón 13:00 — dưới mốc 6 giờ
    const lay = async (id) => (await w.call("GET", `/api/orders/${id}`, { as: SALES })).json.order;
    // (1) Thay chặng của d1: đóng rồi thêm (thứ tự của bảng trượt)
    let o = await lay(d1.id);
    const leg = o.services[0].legs[0];
    const dong = await w.call("POST", `/api/orders/${d1.id}/legs/${leg.id}/close`, { as: SALES, body: { expectedUpdatedAt: leg.updatedAt, reasonCode: "REPLACED" } });
    ghi("C14.dong", tom(dong));
    o = await lay(d1.id);
    const them = await w.call("POST", `/api/orders/${d1.id}/legs`, { as: SALES, body: { expectedUpdatedAt: o.updatedAt, serviceId: o.services[0].id, leg: { direction: "OUT", pickupDate: NGAY, pickupTime: "13:00", pickupLocationId: null, pickupPlace: "Khách sạn Mới", dropoffLocationId: LOC, dropoffPlace: "" } } });
    ghi("C14.them", tom(them));
    o = await lay(d1.id);
    ghi("C14.sau", { status: o.status, soChangMo: o.services[0].legs.length, legs: o.services[0].legs.map((l) => `${l.direction} ${l.pickupTime} ${l.pickupLabel}`) });
    // (2) Sửa thẳng nơi đón của d2 (một lệnh PUT) — có xét mốc
    const o2 = await lay(d2.id);
    const l2 = o2.services[0].legs[0];
    const sua = await w.call("PUT", `/api/orders/${d2.id}/legs/${l2.id}`, { as: SALES, body: { expectedUpdatedAt: l2.updatedAt, leg: { pickupDate: NGAY, pickupTime: "13:00", pickupLocationId: null, pickupPlace: "Khách sạn Hai Mới", dropoffLocationId: LOC, dropoffPlace: "" } } });
    ghi("C14.suaThang", tom(sua));
    // (3) Đóng chặng d3 đang có khách trên chuyến, sát giờ
    const o3 = await lay(d3.id);
    const l3 = o3.services[0].legs[0];
    const dong3 = await w.call("POST", `/api/orders/${d3.id}/legs/${l3.id}/close`, { as: SALES, body: { expectedUpdatedAt: l3.updatedAt, reasonCode: "NOT_NEEDED" } });
    ghi("C14.dongDaXep", tom(dong3));
    const ct = await chiTiet(w, c.chuyen.id);
    ghi("C14.chuyenSauDong", { tai: ct.chuyen.tai, soSuatMo: ct.suat?.filter((s) => s.loai === "PASSENGER").length, lyDoGiu: (ct.chuyen.lyDoGiu ?? ct.lyDoGiu ?? []).map((l) => l.ma), trangThaiSuat: ct.suat?.map((s) => s.trangThai), diem: ct.diem.map((d) => `${d.loai} ${d.tenNoi} ${d.soNguoi}`) });
    // (4) Quản trị thêm lại chặng mới cho d1 sát giờ (có datGap)
    o = await lay(d1.id);
    const themAdm = await w.call("POST", `/api/orders/${d1.id}/legs`, { as: ADM, body: { expectedUpdatedAt: o.updatedAt, serviceId: o.services[0].id, datGap: { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: null }, leg: { direction: "OUT", pickupDate: NGAY, pickupTime: "13:00", pickupLocationId: null, pickupPlace: "Khách sạn Mới", dropoffLocationId: LOC, dropoffPlace: "" } } });
    ghi("C14.themQuanTri", tom(themAdm));
    assert.equal(dong.status, 200);
    assert.equal(them.status, 409);
  } finally { tat(); }
});
