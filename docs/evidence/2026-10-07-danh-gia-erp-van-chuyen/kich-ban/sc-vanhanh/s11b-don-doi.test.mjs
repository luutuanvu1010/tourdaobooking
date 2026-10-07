// S11b — Đơn đổi sau khi đã xếp (giờ đón, nơi đón, huỷ đơn): tài xế có được báo, màn tài xế hiện gì. S4e — thêm/bớt khách trong mốc 6 giờ trên chuyến chưa chạy.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { SALES, ADM, DRIVER, batDongHo, denGio, setup, xe, taoChuyen, chiTiet, tienDo, donRieng, tom, log, uuid } from "./helpers.mjs";

const tinTX = async (w) => ((await w.call("GET", "/api/thong-bao", { as: DRIVER })).json?.tin ?? []).filter((t) => t.loai === "chuyen").map((t) => t.cau);
test("S11b đơn đổi sau khi xếp", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donRieng(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn A", lienHe: "LH A", sdt: "0911000071", tenKhach: "Khách A" });
    const B = await donRieng(w, { soNguoi: 2, gio: "13:20", noiDon: "Khách sạn B", lienHe: "LH B", sdt: "0911000072", tenKhach: "Khách B" });
    const t = (await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" })).chuyen.id;
    mock.timers.tick(60_000);
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${t}/phan-bo`, { as: SALES, body: { version: (await chiTiet(w, t)).chuyen.version, requestId: uuid(), chang: [A, B].map((d) => ({ legId: d.legId, soSuat: 2 })) } })).status, 200);
    mock.timers.tick(60_000);
    const kq = { tin0: await tinTX(w) };
    const legOf = async (d) => (await w.call("GET", `/api/orders/${d.id}`, { as: SALES })).json.order.services[0].legs[0];
    let l = await legOf(A);
    const e1 = await w.call("PUT", `/api/orders/${A.id}/legs/${l.id}`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg: { pickupDate: l.pickupDate, pickupTime: "13:40", pickupLocationId: null, pickupPlace: l.pickupPlace, dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "" } } });
    kq.sua_gio_A_13_40 = tom(e1);
    mock.timers.tick(60_000);
    kq.tin_sau_sua_gio = await tinTX(w);
    l = await legOf(B);
    const e2 = await w.call("PUT", `/api/orders/${B.id}/legs/${l.id}`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg: { pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: null, pickupPlace: "Khách sạn B MỚI, 99 Trần Phú", dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "" } } });
    kq.sua_noi_B = tom(e2);
    mock.timers.tick(60_000);
    kq.tin_sau_sua_noi = await tinTX(w);
    const tx = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t}`, { as: DRIVER })).json;
    kq.dto_tai_xe_sau_sua = { diem: tx.diem.map((d) => ({ thuTu: d.thuTu, tenNoi: d.tenNoi, gioHen: d.gioHen, soNguoi: d.soNguoi })), dieuKienConThieu: tx.dieuKienConThieu };
    const vp = await chiTiet(w, t, SALES);
    kq.van_phong_ly_do_giu = vp.lyDoGiu ?? vp.chuyen?.lyDoGiu ?? Object.keys(vp);
    // Huỷ đơn A sau khi đã xếp.
    const h = await w.call("POST", `/api/orders/${A.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
    kq.huy_don_A = tom(h);
    mock.timers.tick(60_000);
    kq.tin_sau_huy_don = await tinTX(w);
    const tx2 = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t}`, { as: DRIVER })).json;
    kq.dto_tai_xe_sau_huy_don = { diem: tx2.diem.map((d) => ({ tenNoi: d.tenNoi, soNguoi: d.soNguoi, trangThai: d.trangThai })), soSuat: tx2.suat.length, dieuKienConThieu: tx2.dieuKienConThieu };
    // Đơn A đã huỷ, 11:00 (trong mốc 6 giờ): văn phòng gỡ khách của đơn huỷ khỏi chuyến được không?
    denGio("11:00");
    const sAh = (await chiTiet(w, t, ADM)).suat.filter((s) => s.maDon === A.code).map((s) => s.id);
    kq.SALES_rut_khach_don_huy_11h = tom(await w.call("POST", `/api/van-chuyen/chuyen/${t}/rut`, { as: SALES, body: { version: (await chiTiet(w, t, ADM)).chuyen.version, requestId: uuid(), suatIds: sAh } }));
    kq.SALES_cap_nhat_khach_11h = { ...tom(await w.call("POST", `/api/van-chuyen/chuyen/${t}/cap-nhat-khach`, { as: SALES, body: { version: (await chiTiet(w, t, ADM)).chuyen.version, requestId: uuid() } })) };
    kq.SALES_cap_nhat_diem_11h = { ...tom(await w.call("POST", `/api/van-chuyen/chuyen/${t}/cap-nhat-diem`, { as: SALES, body: { version: (await chiTiet(w, t, ADM)).chuyen.version, requestId: uuid() } })) };
    kq.suat_A_con_mo_sau = w.q("SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ? AND leg_id = ? AND valid_to_at IS NULL", t, A.legId)[0].n;
    kq.dieu_kien_sau = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t}`, { as: DRIVER })).json.dieuKienConThieu.map((x) => x.ma);
    log("S11b.ket_qua", kq);
  } finally { tat(); }
});

test("S4e thêm/bớt khách trong mốc 6 giờ (chuyến chưa chạy)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donRieng(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn A", lienHe: "LH A", sdt: "0911000081", tenKhach: "Khách A" });
    const B = await donRieng(w, { soNguoi: 2, gio: "13:20", noiDon: "Khách sạn B", lienHe: "LH B", sdt: "0911000082", tenKhach: "Khách B" });
    const t = (await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" })).chuyen.id;
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${t}/phan-bo`, { as: SALES, body: { version: (await chiTiet(w, t)).chuyen.version, requestId: uuid(), chang: [{ legId: A.legId, soSuat: 2 }] } })).status, 200);
    denGio("11:00"); // 90 phút trước giờ xuất bến
    const kq = {};
    const v = async () => (await chiTiet(w, t, ADM)).chuyen.version;
    kq.SALES_them_B_11h = tom(await w.call("POST", `/api/van-chuyen/chuyen/${t}/phan-bo`, { as: SALES, body: { version: await v(), requestId: uuid(), chang: [{ legId: B.legId, soSuat: 2 }] } }));
    const sA = (await chiTiet(w, t, ADM)).suat.filter((s) => s.maDon === A.code).map((s) => s.id);
    kq.SALES_rut_A_11h = tom(await w.call("POST", `/api/van-chuyen/chuyen/${t}/rut`, { as: SALES, body: { version: await v(), requestId: uuid(), suatIds: [sA[0]] } }));
    kq.SALES_bao_huy_khi_chua_chay = tom(await w.call("POST", `/api/van-chuyen/chuyen/${t}/phan-bo/${sA[0]}/bao-huy`, { as: SALES, body: { version: await v(), requestId: uuid(), lyDo: "BAO_HUY_KHONG_DI" } }));
    kq.ADM_dat_gap_B = tom(await w.call("POST", `/api/orders/${B.id}/legs/${B.legId}/short-notice`, { as: ADM, body: { lyDo: "KHAC" } }));
    kq.SALES_them_B_sau_dat_gap = tom(await w.call("POST", `/api/van-chuyen/chuyen/${t}/phan-bo`, { as: SALES, body: { version: await v(), requestId: uuid(), chang: [{ legId: B.legId, soSuat: 2 }] } }));
    kq.ADM_rut_A_pha_le = tom(await w.call("POST", `/api/van-chuyen/chuyen/${t}/rut`, { as: ADM, body: { version: await v(), requestId: uuid(), suatIds: [sA[0]], phaLe: { lyDo: "PHA_LE_SU_CO" } } }));
    log("S4e.ket_qua", kq);
  } finally { tat(); }
});
