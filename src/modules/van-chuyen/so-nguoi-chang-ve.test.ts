// SỐ NGƯỜI CHẶNG VỀ ở phía Vận chuyển (kế hoạch 2026-10-01-may-chu-o-moi-chang Task 4, TC-P8; ADR-0054 D10.3, tiêu chí 6): `soNguoi` của chặng đến từ
// `lichChungChang` (= `soNguoiChang`) nên L-D1 (không mở quá số người của chặng) và cổng xuất bến L-B1 (đủ tên theo số người) dùng SỐ NGƯỜI VỀ, không dùng số
// khách cả dịch vụ. Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả (tests/audit/dieu-phoi-khung.mjs). Tên khách là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { DRIVER, LOC, NGAY, SALES, batDongHo, chiTiet, denGio, setup, taoChuyen, tienDo, uuid, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";

/** Đơn đã xác nhận: dịch vụ 4 khách, CHỈ một chặng VỀ đón 13:00 ngày chạy ở bến, trả ở khách sạn; 2 khách có tên; số người chiều về 2 (văn phòng ghi). */
async function donVe(w: any) {
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Liên Hệ Dò Tìm", customerPhone: "0912345678",
      services: [{
        kind: "catalog", catalogCode: "ZA1", pax: { adult: 4, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY,
        legs: [{ direction: "RETURN", pickupDate: NGAY, pickupTime: "13:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Dò Tìm", paxOverride: 2 }],
      }],
      passengers: [{ fullName: "Khách Dò Tìm 1", birthYear: 1990, paxCode: "adult" }, { fullName: "Khách Dò Tìm 2", birthYear: 1991, paxCode: "adult" }],
    },
  });
  assert.equal(r.status, 201, r.text);
  assert.equal((await w.call("POST", `/api/orders/${r.json.order.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  return { id: r.json.order.id, legId: r.json.order.services[0].legs[0].id };
}

test("TC-P8 (L-D1): chặng về 2 người của dịch vụ 4 khách — xếp 3 suất → 409 vượt số người chặng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donVe(w);
    assert.equal(w.q("SELECT pax_override FROM ord_transfer_leg WHERE id = ?", d.legId)[0].pax_override, 2);
    const c = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const ct = await chiTiet(w, c.chuyen.id);
    const ba = await w.call("POST", `/api/van-chuyen/chuyen/${c.chuyen.id}/phan-bo`, { as: SALES, body: { version: ct.chuyen.version, requestId: uuid(), chang: [{ legId: d.legId, soSuat: 3 }] } });
    assert.equal(ba.status, 409, ba.text);
    assert.equal(ba.json.error.code, "vuot_so_nguoi_chang");
  } finally {
    tat();
  }
});

test("TC-P8 (L-B1): xếp đủ 2 suất cho chặng về 2 người; 2/4 khách có tên → cổng xuất bến KHÔNG giữ 'thiếu tên' (xuất bến 200)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donVe(w);
    const c = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const ct = await chiTiet(w, c.chuyen.id);
    const hai = await w.call("POST", `/api/van-chuyen/chuyen/${c.chuyen.id}/phan-bo`, { as: SALES, body: { version: ct.chuyen.version, requestId: uuid(), chang: [{ legId: d.legId, soSuat: 2 }] } });
    assert.equal(hai.status, 200, hai.text);
    denGio("12:40");
    const xb = await tienDo(w, "tai-xe", c.chuyen.id, "xuat-ben");
    assert.equal(xb.status, 200, xb.text);
  } finally {
    tat();
  }
});
