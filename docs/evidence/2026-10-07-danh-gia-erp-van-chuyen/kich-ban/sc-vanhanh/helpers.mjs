// Trợ giúp chung cho các bài sc-vanhanh. Dữ liệu GIẢ.
import assert from "node:assert/strict";
import { SALES, LOC, NGAY, uuid } from "../../../../../tests/audit/dieu-phoi-khung.mjs";
export * from "../../../../../tests/audit/dieu-phoi-khung.mjs";

/** Đơn đã xác nhận, MỖI đơn có tên/SĐT liên hệ, nơi đón, giờ đón RIÊNG (khác `don()` của khung — SĐT cứng 0912345678). */
export async function donRieng(w, v) {
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: v.lienHe, customerPhone: v.sdt, customerNote: "Ghi chú đơn Dò Tìm", paymentNote: "Thanh toán Dò Tìm",
      services: [{
        kind: "catalog", pickupChoice: "DON", catalogCode: "ZA1", pax: { adult: v.soNguoi, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: v.ngay ?? NGAY,
        legs: [{ direction: "OUT", pickupDate: v.ngay ?? NGAY, pickupTime: v.gio, pickupLocationId: null, pickupPlace: v.noiDon, dropoffLocationId: LOC, dropoffPlace: "" }],
      }],
      passengers: Array.from({ length: v.soNguoi }, (_x, i) => ({ fullName: `${v.tenKhach} ${i + 1}`, birthYear: (v.namSinh ?? 1980) + i, paxCode: "adult" })),
    },
  });
  assert.equal(r.status, 201, r.text);
  const o = r.json.order;
  const x = await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(x.status, 200, x.text);
  return { id: o.id, code: o.orderCode, legId: o.services[0].legs[0].id, ...v };
}
export const tom = (r) => ({ status: r.status, code: r.json?.error?.code ?? null, message: r.json?.error?.message ?? null, extra: r.json?.error ? Object.fromEntries(Object.entries(r.json.error).filter(([k]) => !["code", "message"].includes(k))) : undefined });
export const log = (nhan, obj) => console.log(`=== ${nhan} ${JSON.stringify(obj)}`);
export const vnLuc = (iso) => (iso ? new Date(Date.parse(iso) + 7 * 3600e3).toISOString().slice(11, 19) + " VN" : null);
export { uuid };
