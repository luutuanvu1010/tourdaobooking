// Kiểm C12: Đối tác bật "xe riêng" trên đơn của mình, tự xác nhận; tiền có đổi không. CHỈ ĐỌC repo. Dữ liệu GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { setup, batDongHo, PARTNER, INTERN, LOC, NGAY_SAU } from "../../../../../tests/audit/dieu-phoi-khung.mjs";
const ghi = (n, o) => console.log(`OBS ${n} ${JSON.stringify(o)}`);
const than = (xeRieng) => ({
  customerName: "Khách Liên Hệ Dò Tìm", customerPhone: "0912345678", customerNote: "", paymentNote: "",
  services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY_SAU,
    legs: [{ direction: "OUT", pickupDate: NGAY_SAU, pickupTime: "08:00", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "", exclusiveVehicle: xeRieng, minVehicleSeats: xeRieng ? 15 : null }] }],
  passengers: [{ fullName: "Khách Dò Tìm 1", birthYear: 1990, paxCode: "adult" }, { fullName: "Khách Dò Tìm 2", birthYear: 1991, paxCode: "adult" }],
});
test("C12: Đối tác / Thực tập bật xe riêng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    for (const [ai, id] of [["PARTNER", PARTNER], ["INTERN", INTERN]]) {
      const a = await w.call("POST", "/api/orders", { as: id, body: than(true) });
      const b = await w.call("POST", "/api/orders", { as: id, body: than(false) });
      const oa = a.json?.order, ob = b.json?.order;
      ghi(`C12.${ai}.lap`, { xeRieng: a.status, thuong: b.status, err: a.json?.error?.message ?? null, legXeRieng: oa?.services?.[0]?.legs?.[0]?.exclusiveVehicle, choToiThieu: oa?.services?.[0]?.legs?.[0]?.minVehicleSeats, tongXeRieng: oa?.subtotal ?? oa?.total, tongThuong: ob?.subtotal ?? ob?.total });
      if (oa) {
        const x = await w.call("POST", `/api/orders/${oa.id}/status`, { as: id, body: { status: "confirmed" } });
        ghi(`C12.${ai}.tuXacNhan`, { status: x.status, code: x.json?.error?.code ?? null, trangThai: x.json?.order?.status });
      }
    }
  } finally { tat(); }
});
