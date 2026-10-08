// ADR-0109 (phải thu không âm) — phía SỔ TIỀN: phiếu "Đã giao" của đơn bớt khách tới giảm giá > tạm tính chụp `due_snapshot` = 0 (CHECK `due_snapshot ≥ 0`
// của 0045 nhận; trigger `bil_posting_delivered_paid` thoả vì đã thu = 0), rồi "Hoàn thành" được (0083: đã thu = `due_snapshot`). Bài route phía orders
// (TC8, TC8b, TC8c ở src/modules/orders/so-khach-van-phong-route.test.ts) không đọc được bảng `bil_` (ADR-0024 điều 4) nên phần bản chụp nằm ở đây.
// Trước ADR-0109: phải thu −300.000 ⇒ dư 500.000 > đã thu ⇒ hoàn chỉ được 200.000, "Đã giao" 409 `overpaid` mãi (ghim cũ "TC8 — HIỆN TRẠNG CHỜ CHỦ QUYẾT").
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ACC = "33333333-3333-4333-8333-333333333333";
const HDV = "44444444-4444-4444-8444-444444444444";
const vnDay = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const P = (adult: number) => ({ adult, child: 0, senior: 0, infant: 0 });

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000201", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000202", name: "Cúc", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: HDV, phone: "0900000203", name: "Dũng", perms: ["FIELD"] });
  w.sqlite.exec(
    "INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_infant, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 300000, 50000, 1, '2026-01-01', '2026-01-01')",
  );
  return w;
}

/** SV-SK-04: 2 NL × 500.000, giảm 800.000, xác nhận, giao HDV, ngày đi hôm nay; `daTra` công ty thu trước; rồi Kế toán bớt còn 1 NL. */
async function donTongAm(w: any, daTra: number): Promise<string> {
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Thử", customerPhone: "0912345678", discount: 800000,
      services: [{ kind: "catalog", catalogCode: "ZA1", pax: P(2), catalogPriceSeen: { adult: 500000, child: 300000, infant: 50000 }, departDate: vnDay(3) }],
    },
  });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id as string;
  const svc = r.json.order.services[0].id as string;
  assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  assert.equal((await w.call("PUT", `/api/orders/${id}/handler`, { as: SALES, body: { staffId: HDV } })).status, 200);
  w.sqlite.prepare("UPDATE order_service SET depart_date = ? WHERE order_id = ?").run(vnDay(0), id);
  if (daTra > 0) assert.equal((await w.call("POST", `/api/orders/${id}/payments`, { as: ACC, body: { soTien: daTra, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" } })).status, 201);
  const sua = await w.call("POST", `/api/orders/${id}/money-edit`, { as: ACC, body: { lyDo: "BOT_NGUOI", services: [{ id: svc, pax: P(1) }] } });
  assert.equal(sua.status, 200, sua.text);
  return id;
}
const banChup = (w: any, id: string) =>
  (w.sqlite.prepare("SELECT due_snapshot FROM bil_posting WHERE order_id = ? AND kind_code = 'DELIVERED'").all(id) as { due_snapshot: number }[]).map((x) => x.due_snapshot);

test("ADR-0109 bài 3 (SV-SK-08): đã trả 200.000, bớt khách tới giảm giá > tạm tính, hoàn 200.000 → 'Đã giao' 200 với due_snapshot 0 → 'Hoàn thành' 200", async () => {
  const w = setup();
  const id = await donTongAm(w, 200000);
  const hoan = await w.call("POST", "/api/ledger/refunds", { as: ACC, body: { orderId: id, soTien: 200000, hinhThuc: "BANK_TRANSFER", nguoiTra: "cong_ty" } });
  assert.ok([200, 201].includes(hoan.status), hoan.text);
  const giao = await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} });
  assert.equal(giao.status, 200, giao.text);
  assert.deepEqual(banChup(w, id), [0], "phiếu Đã giao chụp phải thu 0");
  const xong = await w.call("POST", `/api/orders/${id}/completed`, { as: ACC });
  assert.equal(xong.status, 200, xong.text);
});

test("ADR-0109 (SV-SK-09): chưa trả đồng nào, bớt khách tới giảm giá > tạm tính → 'Đã giao' 200 với due_snapshot 0 (trước đây 409 overpaid)", async () => {
  const w = setup();
  const id = await donTongAm(w, 0);
  const giao = await w.call("POST", `/api/orders/${id}/delivered`, { as: HDV, body: {} });
  assert.equal(giao.status, 200, giao.text);
  assert.deepEqual(banChup(w, id), [0]);
});
