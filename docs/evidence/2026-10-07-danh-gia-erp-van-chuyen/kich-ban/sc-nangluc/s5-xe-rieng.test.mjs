// S5 — Chuyến riêng lẻ (xe riêng một đoàn): đơn khai cam kết xe riêng + số chỗ tối thiểu; xếp; ghép đơn khác; xe ít chỗ hơn cam kết.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADM, DRIVER, DRIVER2, NGAY, SALES, batDongHo, denGio, setup, taoChuyen, tienDo, vnMs, xe, uuid,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { donTuy, ghiNhan, legOut, tt, xepRaw } from "./lib.mjs";

const log = ghiNhan("s5-xe-rieng");

test("S5.1 đơn xe riêng ≥15 chỗ: xếp lên xe 16 chỗ; ghép đơn khác; Quản trị phá lệ; xuất bến", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const A = await donTuy(w, { soNguoi: 4, legs: [legOut("09:10", "Biệt thự Riêng A", { exclusiveVehicle: true, minVehicleSeats: 15 })], tenGoc: "Khách Riêng" });
    const B = await donTuy(w, { soNguoi: 2, legs: [legOut("09:20", "Khách sạn Ghép B")] });
    log("cot_cam_ket_A", { rows: w.q("SELECT exclusive_vehicle, min_vehicle_seats, pax_override FROM ord_transfer_leg WHERE id = ?", A.legs[0].id).map((r) => ({ ...r })) });
    // Lịch chung: chặng chưa xếp có hiện cờ xe riêng không?
    const lich = await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES });
    const txt = JSON.stringify(lich.json);
    const chA = (lich.json?.chuaXep ?? lich.json?.chang ?? []).find?.((c) => c.legId === A.legs[0].id);
    log("lich_chua_xep_A", { status: lich.status, topKeys: Object.keys(lich.json ?? {}), changA: chA ?? null, coChuXeRieng: /xeRieng|exclusive/.test(txt) });
    const X16 = xe(w, 16);
    const T = await taoChuyen(w, { xe: X16, taiXe: `pty-${DRIVER}`, bd: "09:00", kt: "10:30" });
    const r1 = await xepRaw(w, T.chuyen.id, [{ legId: A.legs[0].id, soSuat: 4 }]);
    log("xep_A_vao_xe16", { ...tt(r1), lyDoGiu: r1.json?.chuyen?.lyDoGiu?.map((l) => l.ma) });
    const r2 = await xepRaw(w, T.chuyen.id, [{ legId: B.legs[0].id, soSuat: 2 }]);
    log("xep_B_ghep_vao_xe_rieng_SALES", tt(r2));
    const r3 = await xepRaw(w, T.chuyen.id, [{ legId: B.legs[0].id, soSuat: 2 }], ADM, { camKetPhaLe: { lyDo: "PHA_LE_KHAC" } });
    log("xep_B_ghep_ADM_pha_le", { ...tt(r3), lyDoGiu: r3.json?.chuyen?.lyDoGiu?.map((l) => l.ma) });
    log("db_trip_pha_le_cam_ket", { rows: w.q("SELECT code, commitment_override_reason_code, length(commitment_override_key) AS len_khoa FROM vc_trip WHERE id = ?", T.chuyen.id).map((r) => ({ ...r })) });
    log("db_suat", { rows: w.q("SELECT a.kind, a.leg_id = ? AS la_A, count(*) n FROM vc_trip_allocation a WHERE a.trip_id = ? AND a.valid_to_at IS NULL GROUP BY 1, 2", A.legs[0].id, T.chuyen.id).map((r) => ({ ...r })) });
  } finally { tat(); }
});

test("S5.2 đơn xe riêng ≥15 chỗ xếp lên xe 7 chỗ / xe 16 chỗ của tài xế khác; tạo chuyến có xét cam kết không", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const A = await donTuy(w, { soNguoi: 4, legs: [legOut("09:10", "Biệt thự Riêng A", { exclusiveVehicle: true, minVehicleSeats: 15 })] });
    const X7 = xe(w, 7);
    const T7 = await taoChuyen(w, { xe: X7, taiXe: `pty-${DRIVER}`, bd: "09:00", kt: "10:30" });
    log("tao_chuyen_xe7_ok_khong_xet_cam_ket", { ma: T7.chuyen.ma });
    const r = await xepRaw(w, T7.chuyen.id, [{ legId: A.legs[0].id, soSuat: 4 }]);
    log("xep_A_vao_xe7_SALES", tt(r));
    const ra = await xepRaw(w, T7.chuyen.id, [{ legId: A.legs[0].id, soSuat: 4 }], ADM, { camKetPhaLe: { lyDo: "PHA_LE_KHAC" } });
    log("xep_A_vao_xe7_ADM_pha_le", { ...tt(ra), lyDoGiu: ra.json?.chuyen?.lyDoGiu?.map((l) => l.ma) });
    // Đổi xe sang 16 chỗ (PUT) → khoá phá lệ có còn khớp không
    const X16 = xe(w, 16);
    const ct = (await w.call("GET", `/api/van-chuyen/chuyen/${T7.chuyen.id}`, { as: SALES })).json;
    const p = await w.call("PUT", `/api/van-chuyen/chuyen/${T7.chuyen.id}`, { as: SALES, body: { version: ct.chuyen.version, requestId: uuid(), xeId: X16 } });
    log("doi_sang_xe16_SALES", { ...tt(p), lyDoGiu: p.json?.chuyen?.lyDoGiu?.map((l) => l.ma) });
    log("db_sau_doi", { rows: w.q("SELECT commitment_override_reason_code, commitment_override_key IS NOT NULL AS co_khoa FROM vc_trip WHERE id = ?", T7.chuyen.id).map((x) => ({ ...x })) });
  } finally { tat(); }
});

test("S5.3 đơn xe riêng: tắt cam kết SAU khi đã ghép (sửa chặng) / bật cam kết SAU khi đã ghép → cổng xuất bến", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const A = await donTuy(w, { soNguoi: 2, legs: [legOut("09:10", "Biệt thự Riêng A")] });
    const B = await donTuy(w, { soNguoi: 2, legs: [legOut("09:20", "Khách sạn Ghép B")] });
    const X = xe(w, 16);
    const T = await taoChuyen(w, { xe: X, taiXe: `pty-${DRIVER}`, bd: "09:00", kt: "10:30" });
    log("xep_A_B_ghep_thuong", tt(await xepRaw(w, T.chuyen.id, [{ legId: A.legs[0].id, soSuat: 2 }, { legId: B.legs[0].id, soSuat: 2 }])));
    // Bán hàng bật xe riêng cho A SAU khi đã ghép
    const g = (await w.call("GET", `/api/orders/${A.id}`, { as: ADM })).json.order;
    const l = g.services[0].legs[0];
    const leg = { pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace ?? "", dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "", exclusiveVehicle: true };
    const s = await w.call("PUT", `/api/orders/${A.id}/legs/${l.id}`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg } });
    log("bat_xe_rieng_sau_khi_ghep", { status: s.status, code: s.json?.error?.code ?? null, text: s.status !== 200 ? s.text.slice(0, 300) : undefined });
    const ct = (await w.call("GET", `/api/van-chuyen/chuyen/${T.chuyen.id}`, { as: SALES })).json;
    log("chuyen_bi_giu_sau_bat", { lyDoGiu: ct.chuyen.lyDoGiu?.map((x) => `${x.ma}: ${x.loiNhan}`) });
    denGio("08:55");
    log("xuat_ben_sau_bat_xe_rieng", tt(await tienDo(w, "tai-xe", T.chuyen.id, "xuat-ben")));
  } finally { tat(); }
});
