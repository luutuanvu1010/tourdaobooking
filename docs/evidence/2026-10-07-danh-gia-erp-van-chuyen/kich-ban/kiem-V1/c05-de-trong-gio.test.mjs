// Kiểm phản biện C05 — đơn sát giờ: Bán hàng để TRỐNG giờ đón thì xác nhận được không; sau đó điền giờ / xếp xe được không. Chỉ đọc repo; dữ liệu GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DRIVER, LOC, NGAY, SALES, batDongHo, chiTiet, setup, uuid, vnMs, xe,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { ghi, taoChuyenRaw, tom, xep } from "../sc-ghep/chung.mjs";

test("C05 06:00 nhận đơn đón 07:00 — để trống giờ đón", async () => {
  const tat = batDongHo(vnMs(NGAY, "06:00"));
  try {
    const w = setup();
    const lap = await w.call("POST", "/api/orders", {
      as: SALES,
      body: {
        customerName: "Khách Liên Hệ Dò Tìm", customerPhone: "0912345678", customerNote: "", paymentNote: "",
        services: [{
          kind: "catalog", pickupChoice: "DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY,
          legs: [{ direction: "OUT", pickupDate: NGAY, pickupTime: null, pickupLocationId: null, pickupPlace: "Khách sạn Gấp Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" }],
        }],
        passengers: [{ fullName: "Khách Dò Tìm 1", birthYear: 1990, paxCode: "adult" }, { fullName: "Khách Dò Tìm 2", birthYear: 1991, paxCode: "adult" }],
      },
    });
    ghi("C05.lap", tom(lap));
    assert.equal(lap.status, 201, lap.text);
    const o = lap.json.order;
    const x = await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } });
    ghi("C05.xacNhanKhongGio", tom(x));
    const o2 = (await w.call("GET", `/api/orders/${o.id}`, { as: SALES })).json.order;
    const l = o2.services[0].legs[0];
    const sua = await w.call("PUT", `/api/orders/${o.id}/legs/${l.id}`, {
      as: SALES,
      body: { expectedUpdatedAt: l.updatedAt, leg: { pickupDate: NGAY, pickupTime: "07:00", pickupLocationId: null, pickupPlace: l.pickupPlace, dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "" } },
    });
    ghi("C05.dienGio0700", tom(sua));
    const t = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}`, bd: "06:45", kt: "09:00" });
    ghi("C05.taoChuyen", tom(t));
    if (t.status === 201) {
      const r = await xep(w, t.json.chuyen.id, [{ legId: l.id, soSuat: 2 }]);
      ghi("C05.xepKhongGio", { ...tom(r), lyDo: r.json?.error?.lyDo?.map((z) => z.ma) });
    }
  } finally {
    tat();
  }
});
