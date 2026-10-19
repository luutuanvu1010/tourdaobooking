// Kiểm C13: ai sửa được chặng đưa đón của đơn đã xác nhận. CHỈ ĐỌC repo. Dữ liệu GIẢ.
import { test } from "node:test";
import { setup, batDongHo, don, SALES, FIELD, PARTNER, INTERN, ADM, LOC, NGAY_SAU } from "../../../../../tests/audit/dieu-phoi-khung.mjs";
const ghi = (n, o) => console.log(`OBS ${n} ${JSON.stringify(o)}`);
const body = (id) => ({
  customerName: "Khách Liên Hệ Dò Tìm", customerPhone: "0912345678", customerNote: "", paymentNote: "",
  services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY_SAU,
    legs: [{ direction: "OUT", pickupDate: NGAY_SAU, pickupTime: "08:00", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" }] }],
  passengers: [{ fullName: "Khách Dò Tìm 1", birthYear: 1990, paxCode: "adult" }, { fullName: "Khách Dò Tìm 2", birthYear: 1991, paxCode: "adult" }],
});
test("C13", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const kq = {};
    const thu = async (ai, as, orderId) => {
      const o = (await w.call("GET", `/api/orders/${orderId}`, { as: ADM })).json.order;
      const l = o.services[0].legs[0];
      const r = await w.call("PUT", `/api/orders/${orderId}/legs/${l.id}`, { as, body: { expectedUpdatedAt: l.updatedAt, leg: { pickupDate: NGAY_SAU, pickupTime: "08:30", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" } } });
      kq[ai] = `${r.status} ${r.json?.error?.code ?? ""}`;
    };
    for (const [ai, id] of [["PARTNER_donMinh", PARTNER], ["INTERN_donMinh", INTERN]]) {
      const a = await w.call("POST", "/api/orders", { as: id, body: body() });
      await w.call("POST", `/api/orders/${a.json.order.id}/status`, { as: id, body: { status: "confirmed" } });
      await thu(ai, id, a.json.order.id);
    }
    const d = await don(w, { ngay: NGAY_SAU, gio: "08:00", handler: FIELD });
    await thu("FIELD_dangPhuTrach", FIELD, d.id);
    await thu("SALES_donMinh", SALES, d.id);
    ghi("C13", kq);
  } finally { tat(); }
});
