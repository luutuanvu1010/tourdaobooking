// S5b — Chiều về (RETURN): đơn có chặng đi + chặng về, số người chiều về (paxOverride) khác chiều đi. Xếp chặng về; màn tài xế / chi tiết chuyến.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DRIVER, DRIVER2, NGAY, SALES, batDongHo, denGio, setup, taoChuyen, tienDo, vnMs, xe, uuid,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { donTuy, ghiNhan, legOut, legRet, tt, xepRaw } from "./lib.mjs";

const log = ghiNhan("s5b-chieu-ve");

test("S5b đơn 4 khách: đi 4 người (08:00 KS → bến), về 2 người (15:00 bến → KS) — xếp, màn tài xế", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const d = await donTuy(w, { soNguoi: 4, sdt: "0987000111", legs: [legOut("08:00", "Khách sạn Chiều Về, 12 Trần Phú"), legRet("15:00", "Khách sạn Chiều Về, 12 Trần Phú", { paxOverride: 2 })] });
    if (d.loi) { log("lap_don_loi", { status: d.loi.status, text: d.loi.text.slice(0, 400) }); return; }
    const out = d.legs.find((l) => l.direction === "OUT"), ret = d.legs.find((l) => l.direction === "RETURN");
    log("chang_db", { rows: w.q("SELECT direction, pickup_time, pax_override, pickup_place, dropoff_place FROM ord_transfer_leg WHERE order_id = ? ORDER BY direction", d.id).map((r) => ({ ...r })) });
    const lich = await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES });
    log("lich_chang", { rows: lich.json.chang.filter((c) => c.orderId === d.id).map((c) => ({ chieu: c.chieu, gio: c.gioDon, noiDon: c.noiDon, noiTra: c.noiTra, soNguoi: c.soNguoi, soNguoiCoTen: c.soNguoiCoTen })) });
    // Chuyến đi + chuyến về (cùng xe, cùng tài xế)
    const X = xe(w, 16);
    const Tdi = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "07:50", kt: "09:00" });
    const Tve = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "14:50", kt: "16:00" });
    log("xep_di_4", tt(await xepRaw(w, Tdi.chuyen.id, [{ legId: out.id, soSuat: 4 }])));
    log("xep_ve_3_vuot", tt(await xepRaw(w, Tve.chuyen.id, [{ legId: ret.id, soSuat: 3 }])));
    const v2 = await xepRaw(w, Tve.chuyen.id, [{ legId: ret.id, soSuat: 2 }]);
    log("xep_ve_2", { ...tt(v2), diem: v2.json?.chuyen?.diem?.map((x) => ({ loai: x.loai, ten: x.ten ?? x.noi ?? x.nhan })), lyDoGiu: v2.json?.chuyen?.lyDoGiu?.map((l) => l.ma), canhBaoXep: v2.json?.canhBaoXep?.map((l) => l.ma) });
    // Xếp chặng VỀ vào chuyến buổi sáng (sai chiều giờ) → ?
    const X2 = xe(w, 16);
    const Tsai = await taoChuyen(w, { xe: X2, taiXe: `pty-${DRIVER2}`, bd: "07:50", kt: "09:00" });
    log("xep_ve_vao_chuyen_sang_sai_gio", tt(await xepRaw(w, Tsai.chuyen.id, [{ legId: ret.id, soSuat: 2 }])));
    // Chi tiết văn phòng chuyến về
    const ctv = (await w.call("GET", `/api/van-chuyen/chuyen/${Tve.chuyen.id}`, { as: SALES })).json;
    log("van_phong_chi_tiet_chuyen_ve", { json: JSON.stringify(ctv).slice(0, 2500) });
    // Màn tài xế: trước ngày chạy (22:00 hôm trước) và trong ngày chạy
    const r0 = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${Tve.chuyen.id}`, { as: DRIVER });
    log("tai_xe_chi_tiet_ve_hom_truoc", { status: r0.status, coTen: /Khách Dò Tìm/.test(r0.text), coSdt: /0987000111/.test(r0.text) });
    denGio("14:00");
    const r1 = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${Tve.chuyen.id}`, { as: DRIVER });
    log("tai_xe_chi_tiet_ve_trong_ngay", { status: r1.status, coTen: /Khách Dò Tìm/.test(r1.text), coSdt: /0987000111/.test(r1.text), json: r1.text.slice(0, 3500) });
    const rDi = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${Tdi.chuyen.id}`, { as: DRIVER });
    log("tai_xe_chi_tiet_di_trong_ngay", { status: rDi.status, json: rDi.text.slice(0, 3500) });
    const ds = await w.call("GET", "/api/van-chuyen/cuoc-cua-toi", { as: DRIVER });
    log("tai_xe_danh_sach", { json: JSON.stringify(ds.json).slice(0, 1500) });
  } finally { tat(); }
});

test("S5b.2 xếp chặng VỀ (đón 15:00) vào chuyến sáng 07:50–09:00 → có chặn giờ hẹn ngoài chuyến không; chọn đúng người về bằng personKeys", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const d = await donTuy(w, { soNguoi: 4, legs: [legOut("08:00", "Khách sạn Chiều Về"), legRet("15:00", "Khách sạn Chiều Về", { paxOverride: 2 })] });
    const ret = d.legs.find((l) => l.direction === "RETURN");
    const X = xe(w, 16);
    const Tsang = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "07:50", kt: "09:00" });
    const r = await xepRaw(w, Tsang.chuyen.id, [{ legId: ret.id, soSuat: 2 }]);
    log("S5b2_xep_ve_vao_chuyen_sang", { ...tt(r), lyDoGiu: r.json?.chuyen?.lyDoGiu?.map((l) => `${l.ma}: ${l.loiNhan}`) });
    // Danh sách hành khách đơn (khoá người) — văn phòng chọn đúng 2 người về (1 và 2)
    const pk = await w.call("GET", `/api/orders/${d.id}/passengers`, { as: SALES });
    const lich = await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES });
    log("S5b2_lich_canh_bao", { canhBao: (lich.json?.canhBao ?? []).map((c) => JSON.stringify(c)).slice(0, 10) });
    denGio("07:50");
    const xb = await tienDo(w, "tai-xe", Tsang.chuyen.id, "xuat-ben");
    log("S5b2_xuat_ben_0750_chuyen_sang_mang_khach_hen_1500", tt(xb));
    log("S5b2_db_trip", { rows: w.q("SELECT code, status FROM vc_trip WHERE id = ?", Tsang.chuyen.id).map((x) => ({ ...x })) });
    log("S5b2_passengers_api", { status: pk.status, keys: pk.json ? Object.keys(pk.json) : null, sample: JSON.stringify(pk.json).slice(0, 600) });
  } finally { tat(); }
});

test("S5b.3 văn phòng CHỌN đúng 2 người về (Khách 1, 2) bằng personKeys qua route; trạng thái chặng ở lịch sau khi xếp nhầm chuyến sáng", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const d = await donTuy(w, { soNguoi: 4, legs: [legOut("08:00", "Khách sạn Chiều Về"), legRet("15:00", "Khách sạn Chiều Về", { paxOverride: 2 })] });
    const ret = d.legs.find((l) => l.direction === "RETURN");
    const pk = (await w.call("GET", `/api/orders/${d.id}/passengers`, { as: SALES })).json.passengers;
    const k1 = pk.find((p) => p.fullName === "Khách Dò Tìm 1").personKey, k2 = pk.find((p) => p.fullName === "Khách Dò Tìm 2").personKey;
    const X = xe(w, 16);
    const Tve = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "14:50", kt: "16:00" });
    const r = await xepRaw(w, Tve.chuyen.id, [{ legId: ret.id, soSuat: 2, personKeys: [k1, k2] }]);
    log("S5b3_xep_ve_chon_nguoi_1_2", { ...tt(r), ten: r.json?.suat?.map((s) => s.hoTen) });
    denGio("14:00");
    const c = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${Tve.chuyen.id}`, { as: DRIVER });
    log("S5b3_tai_xe_thay_ten", { status: c.status, ten: c.json?.suat?.map((s) => s.hoTen) });
  } finally { tat(); }
});

test("S5b.4 chặng về 15:00 xếp nhầm vào chuyến sáng → trạng thái chặng ở lịch chung", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    // F8: chặng về xếp nhầm vào chuyến sáng → lịch còn đưa chặng vào cột "Chưa xếp" không
    const w2 = setup();
    const d2 = await donTuy(w2, { soNguoi: 2, legs: [legRet("15:00", "Khách sạn Nhầm Giờ")] });
    const X2 = xe(w2, 16);
    const Ts = await taoChuyen(w2, { xe: X2, taiXe: `pty-${DRIVER}`, bd: "07:50", kt: "09:00" });
    const ch0 = (await w2.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json.chang.find((x) => x.legId === d2.legs[0].id);
    log("S5b4_lich_truoc_xep", { trangThai: ch0?.trangThai, nhanLich: ch0?.nhan });
    await xepRaw(w2, Ts.chuyen.id, [{ legId: d2.legs[0].id, soSuat: 2 }]);
    const ch1 = (await w2.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json.chang.find((x) => x.legId === d2.legs[0].id);
    log("S5b4_lich_sau_xep_nham", { trangThai: ch1?.trangThai, trangThaiNhan: ch1?.trangThaiNhan, nhanLich: ch1?.nhan, soDaXep: ch1?.soDaXep, chuyen: ch1?.chuyen });
  } finally { tat(); }
});
