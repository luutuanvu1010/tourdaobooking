// S6 (bổ sung): (a) HDV tăng số khách lúc 06:00 mà không ai xếp thêm → 06:45 xuất bến bị giữ?; (b) Toàn quyền MỘT MÌNH thêm 1 khách — số lệnh.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DRIVER, FIELD, SALES, SUP, batDongHo, chiTiet, denGio, setup, tienDo, uuid, vnMs, xe,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { demGoi, donXacNhan, ghi, lyDoGiu, taiSql, taoChuyenRaw, tom, xep } from "./chung.mjs";

async function dung(w) {
  const d1 = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Sheraton", gio: "07:00" });
  const d2 = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Havana", gio: "07:10" });
  const t = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}`, bd: "06:45", kt: "09:00" });
  const id = t.json.chuyen.id;
  assert.equal((await xep(w, id, [d1, d2].map((d) => ({ legId: d.legId, soSuat: 2 })))).status, 200);
  denGio("06:00");
  return { d1, d2, id };
}
const suaSoKhach = (w, d, as, adult) =>
  w.call("POST", `/api/orders/${d.id}/handler-money-edit`, { as, body: { reason: "Khách báo thêm người sát giờ", services: [{ id: d.svcId, pax: { adult, child: 0, senior: 0, infant: 0 } }] } });

test("S6+(a) HDV +1 khách lúc 06:00, không ai xếp → xuất bến 06:45", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "20:00"));
  try {
    const w = setup();
    const { d1, id } = await dung(w);
    await w.call("PUT", `/api/orders/${d1.id}/handler`, { as: SALES, body: { staffId: FIELD } });
    ghi("S6+a.moneyEdit.FIELD", tom(await suaSoKhach(w, d1, FIELD, 3)));
    denGio("06:45");
    const xb = await tienDo(w, "tai-xe", id, "xuat-ben");
    ghi("S6+a.xuatBen.taiXe", tom(xb));
    // HDV hạ lại số khách (hoàn tác) → xuất bến?
    ghi("S6+a.moneyEdit.FIELD.hoanTac", tom(await suaSoKhach(w, d1, FIELD, 2)));
    const xb2 = await tienDo(w, "tai-xe", id, "xuat-ben");
    ghi("S6+a.xuatBen.taiXe.sauHoanTac", tom(xb2));
  } finally {
    tat();
  }
});

test("S6+(b) Toàn quyền một mình thêm 1 khách lúc 06:00 (chuyến 06:45)", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "20:00"));
  try {
    const w = setup();
    const { d1, id } = await dung(w);
    const goi = demGoi(w);
    const me = await suaSoKhach(w, d1, SUP, 3);
    const c = await chiTiet(w, id, SUP);
    const x = await w.call("POST", `/api/van-chuyen/chuyen/${id}/phan-bo`, { as: SUP, body: { version: c.chuyen.version, requestId: uuid(), chang: [{ legId: d1.legId, soSuat: 1 }], phaLe: { lyDo: "PHA_LE_DON_GAP" } } });
    const ds = (await w.call("GET", `/api/orders/${d1.id}/passengers`, { as: SUP })).json;
    const t = await w.call("POST", `/api/orders/${d1.id}/passengers`, { as: SUP, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [{ fullName: "Khách Thêm Gấp", birthYear: 1988, paxCode: "adult" }], sua: [], huy: [] } });
    ghi("S6+b.SUP", { moneyEdit: me.status, xep: tom(x), themTen: t.status, taiSql: taiSql(w, id), lyDoGiu: lyDoGiu(await chiTiet(w, id, SUP)), demGoi: { ...goi.dem } });
  } finally {
    tat();
  }
});
