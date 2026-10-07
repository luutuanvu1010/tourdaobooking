import { test } from "node:test";
import { tinChuyenCho, laHanhDongTinChuyen } from "../../../../../src/shared/tin-chuyen.ts";

test("C15: ai nhận tin khi khách vắng / khách huỷ tại điểm", () => {
  const sales = { id: "s1", permissions: ["SALES"], partyId: "p-s1" } as any;
  const field = { id: "f1", permissions: ["FIELD"], partyId: "p-f1" } as any;
  const partner = { id: "pt1", permissions: ["PARTNER"], partyId: "p-pt1" } as any;
  const mk = (action: string) => ({ id: "e1", tripId: "t1", actorId: "drv", action, luc: "2027-03-11T06:00:00.000Z", maChuyen: "CX-1103-01", ngayChay: "2027-03-11", lai: [], xuatBen: "2027-03-11T05:00:00.000Z",
    don: [{ orderId: "o1", maDon: "TD-1", ownerId: "s1", handlerStaffId: "f1" }, { orderId: "o2", maDon: "TD-2", ownerId: "pt1", handlerStaffId: null }] }) as any;
  const kq = {
    vang_sales: tinChuyenCho(sales, mk("trip_passenger_no_show"))?.loai ?? null,
    vang_field: tinChuyenCho(field, mk("trip_passenger_no_show"))?.loai ?? null,
    vang_partner: tinChuyenCho(partner, mk("trip_passenger_no_show"))?.loai ?? null,
    huy_sales: tinChuyenCho(sales, mk("trip_passenger_cancelled_at_stop"))?.loai ?? null,
    huy_laTin: laHanhDongTinChuyen("trip_passenger_cancelled_at_stop"),
  };
  console.log(JSON.stringify(kq));
});
