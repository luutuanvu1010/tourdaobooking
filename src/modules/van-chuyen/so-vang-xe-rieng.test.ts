// SỔ VÀNG VẬN CHUYỂN — VC-05, VC-06 (ADR-0128 Q2, chủ duyệt 2026-10-17): xe RIÊNG không ai ghép thêm khách lẻ, kể cả điều chỉnh khẩn cấp (Bán hàng, sát giờ) lẫn phá lệ (Quản trị, ngoài mốc).
// Chạy CẢ ứng dụng (khung thử harness + D1 node:sqlite). Mốc của khung thử là 360 phút (dòng gieo), nên «sát giờ» = chuyến còn dưới 6 giờ, «ngoài mốc» = chuyến sang ngày sau; nghĩa không đổi
// khi Quản trị đặt mốc 30 phút. Tên, SĐT GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ADM, DRIVER, LOC, NGAY, NGAY_SAU, SALES, batDongHo, don, setup, taoChuyen, uuid, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";

const PL = { lyDo: "PHA_LE_SU_CO" };

async function donXeRieng(w: any, v: { ngay: string; gio: string }) {
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Riêng", customerPhone: "0912345678",
      services: [{
        kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: v.ngay,
        legs: [{ direction: "OUT", pickupDate: v.ngay, pickupTime: v.gio, pickupLocationId: null, pickupPlace: "Khách sạn Riêng", dropoffLocationId: LOC, dropoffPlace: "", exclusiveVehicle: true }],
      }],
      passengers: [1, 2].map((i) => ({ fullName: `Khách Riêng ${i}`, birthYear: 1980 + i, paxCode: "adult" })),
    },
  });
  assert.equal(r.status, 201, r.text);
  const o = r.json.order;
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  return { legId: o.services[0].legs[0].id as string };
}
const phienBan = async (w: any, id: string) => (await w.call("GET", `/api/van-chuyen/chuyen/${id}`, { as: ADM })).json.chuyen.version;
async function xep(w: any, as: string, tripId: string, legId: string, extra: Record<string, unknown> = {}) {
  return w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { as, body: { requestId: uuid(), version: await phienBan(w, tripId), chang: [{ legId, soSuat: 2 }], ...extra } });
}
const soSuKien = (w: any, tripId: string) => w.q("SELECT COUNT(*) n FROM vc_trip_event WHERE trip_id = ? AND kind = 'ALLOCATED'", tripId)[0].n as number;
const cotPhaLe = (w: any, tripId: string) => ({ ...w.q("SELECT commitment_override_reason_code r, commitment_override_key k FROM vc_trip WHERE id = ?", tripId)[0] });

test("VC-05 xe riêng, sát giờ, Bán hàng xếp thêm đơn lẻ: bị chặn cứng, kể cả điều chỉnh khẩn cấp kèm lý do", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const rieng = await donXeRieng(w, { ngay: NGAY, gio: "13:00" });
    const le = await don(w, { gio: "13:00" });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" }); // 05 giờ nữa: dưới mốc
    assert.equal((await xep(w, SALES, t.chuyen.id, rieng.legId, { phaLe: PL })).status, 200, "xếp chính đơn xe riêng được");
    const sk = soSuKien(w, t.chuyen.id);
    const r = await xep(w, SALES, t.chuyen.id, le.legId, { phaLe: PL, camKetPhaLe: PL });
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "chang_khong_hop_le", "chặn cứng — không phải can_pha_le_cam_ket (không còn đường gỡ)");
    assert.equal(cotPhaLe(w, t.chuyen.id).r, null);
    assert.equal(soSuKien(w, t.chuyen.id), sk, "lệnh bị chặn không ghi sự kiện");
  } finally {
    tat();
  }
});

test("VC-06 xe riêng, chuyến còn xa, Quản trị xếp thêm kèm cờ phá lệ: vẫn bị chặn cứng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const rieng = await donXeRieng(w, { ngay: NGAY_SAU, gio: "13:00" });
    const le = await don(w, { ngay: NGAY_SAU, gio: "13:00" });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "11:00", kt: "15:00" }); // sang ngày sau: ngoài mốc
    assert.equal((await xep(w, ADM, t.chuyen.id, rieng.legId)).status, 200);
    const sk = soSuKien(w, t.chuyen.id);
    const r = await xep(w, ADM, t.chuyen.id, le.legId, { camKetPhaLe: PL });
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "chang_khong_hop_le");
    assert.equal(cotPhaLe(w, t.chuyen.id).r, null, "không ghi cột phá lệ");
    assert.equal(soSuKien(w, t.chuyen.id), sk);
  } finally {
    tat();
  }
});
