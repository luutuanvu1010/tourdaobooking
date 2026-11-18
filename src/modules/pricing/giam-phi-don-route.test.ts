// Mức giảm phí đưa đón theo cấp (ADR-0218 Đ1.4; kế hoạch 2026-11-18 Task 3): route Kế toán đặt, kết thúc, và hàm công bố `mucGiamPhiDonTheoNgay`.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Tên người dùng GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { mucGiamPhiDonTheoNgay } from "./giam-phi-don-repo.ts";
import { addDays, vnToday } from "../../shared/vn-date.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666";
const SA = "33333333-3333-4333-8333-333333333333";
type W = ReturnType<typeof world>;
const HOM_NAY = vnToday(new Date());
const NGAY1 = addDays(HOM_NAY, 3);
const NGAY2 = addDays(HOM_NAY, 10);

async function setup() {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [ADM, "0900000006", "Quản Trị", ["ADMIN"]],
    [SA, "0900000003", "Chủ", ["SUPER_ADMIN"]], [DT, "0900000008", "Đối Tác Một", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  const r = await w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten: "Đại lý cấp 3" } });
  assert.equal(r.status, 201, r.text);
  return { w, c3: r.json.muc.code as string };
}
const dat = (w: W, as: string, body: unknown) => w.call("POST", "/api/pricing/giam-phi-don", { as, body });

test("Kế toán đặt mức → 200/201, GET thấy; nhật ký có hành động mới, không ghi tên người", async () => {
  const { w, c3 } = await setup();
  const r = await dat(w, KT, { tierCode: c3, amount: 20000, validFromDate: NGAY1 });
  assert.ok(r.status === 200 || r.status === 201, r.text);
  const g = await w.call("GET", "/api/pricing/giam-phi-don", { as: KT });
  assert.equal(g.status, 200, g.text);
  const d = g.json.dong.find((x: any) => x.tierCode === c3);
  assert.equal(d.amount, 20000);
  assert.equal(d.validFromDate, NGAY1);
  assert.equal(d.validToDate, null);
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'prc_transfer_fee_discount_set'");
  assert.equal(nk.length, 1);
  assert.match(nk[0].detail, /chưa đặt → 20\.000/);
});

test("Quản trị đặt được; Bán hàng và Đối tác ⇒ 403 (GET và POST)", async () => {
  const { w, c3 } = await setup();
  assert.ok([200, 201].includes((await dat(w, ADM, { tierCode: c3, amount: 1000, validFromDate: NGAY1 })).status));
  assert.equal((await dat(w, SALES, { tierCode: c3, amount: 1000, validFromDate: NGAY2 })).status, 403);
  assert.equal((await dat(w, DT, { tierCode: c3, amount: 1000, validFromDate: NGAY2 })).status, 403);
  assert.equal((await w.call("GET", "/api/pricing/giam-phi-don", { as: DT })).status, 403);
  assert.equal(w.q("SELECT count(*) AS n FROM prc_transfer_fee_tier_discount")[0].n, 1);
});

test("amount âm / 5.000.001 / số lẻ / chữ, ngày quá khứ, cấp lạ ⇒ 400", async () => {
  const { w, c3 } = await setup();
  for (const amount of [-1, 5000001, 1.5, "abc", null]) assert.equal((await dat(w, KT, { tierCode: c3, amount, validFromDate: NGAY1 })).status, 400, String(amount));
  assert.equal((await dat(w, KT, { tierCode: c3, amount: 1000, validFromDate: addDays(HOM_NAY, -1) })).status, 400);
  assert.equal((await dat(w, KT, { tierCode: c3, amount: 1000, validFromDate: "không phải ngày" })).status, 400);
  assert.equal((await dat(w, KT, { tierCode: "KHONG-CO", amount: 1000, validFromDate: NGAY1 })).status, 400);
  assert.equal(w.q("SELECT count(*) AS n FROM prc_transfer_fee_tier_discount")[0].n, 0);
});

test("amount 0 được nhận (không giảm); 5.000.000 được nhận", async () => {
  const { w, c3 } = await setup();
  assert.ok([200, 201].includes((await dat(w, KT, { tierCode: c3, amount: 0, validFromDate: NGAY1 })).status));
  const r2 = await w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten: "Đại lý cấp 1" } });
  assert.ok([200, 201].includes((await dat(w, KT, { tierCode: r2.json.muc.code, amount: 5000000, validFromDate: NGAY1 })).status));
});

test("đặt chồng không có thayCho ⇒ 409; đặt lại bằng thayCho từ ngày sau ⇒ dòng cũ đóng đúng ngày trước", async () => {
  const { w, c3 } = await setup();
  await dat(w, KT, { tierCode: c3, amount: 20000, validFromDate: NGAY1 });
  assert.equal((await dat(w, KT, { tierCode: c3, amount: 30000, validFromDate: NGAY2 })).status, 409);
  const cu = (await w.call("GET", "/api/pricing/giam-phi-don", { as: KT })).json.dong[0];
  const r = await dat(w, KT, { tierCode: c3, amount: 30000, validFromDate: NGAY2, thayCho: { id: cu.id, expectedUpdatedAt: cu.updatedAt } });
  assert.ok([200, 201].includes(r.status), r.text);
  const hang = w.q("SELECT amount, valid_from_date AS tu, valid_to_date AS den FROM prc_transfer_fee_tier_discount ORDER BY valid_from_date");
  assert.deepEqual(hang.map((x: any) => ({ ...x })), [{ amount: 20000, tu: NGAY1, den: addDays(NGAY2, -1) }, { amount: 30000, tu: NGAY2, den: null }]);
  // dấu cũ (đã bị đổi) ⇒ 409
  const lai = await dat(w, KT, { tierCode: c3, amount: 1, validFromDate: addDays(NGAY2, 5), thayCho: { id: cu.id, expectedUpdatedAt: cu.updatedAt } });
  assert.equal(lai.status, 409);
  assert.equal(w.q("SELECT count(*) AS n FROM prc_transfer_fee_tier_discount")[0].n, 2);
});

test("thayCho: ngày bắt đầu không sau ngày bắt đầu của dòng cũ ⇒ 400", async () => {
  const { w, c3 } = await setup();
  await dat(w, KT, { tierCode: c3, amount: 20000, validFromDate: NGAY2 });
  const cu = (await w.call("GET", "/api/pricing/giam-phi-don", { as: KT })).json.dong[0];
  const r = await dat(w, KT, { tierCode: c3, amount: 1, validFromDate: NGAY1, thayCho: { id: cu.id, expectedUpdatedAt: cu.updatedAt } });
  assert.equal(r.status, 400, r.text);
});

test("kết thúc: đóng dòng đã bắt đầu, nhật ký riêng; kết thúc hai lần ⇒ 409; sai mốc ⇒ 409; Bán hàng ⇒ 403", async () => {
  const { w, c3 } = await setup();
  // dòng đã bắt đầu: chèn thẳng (route chỉ nhận ngày từ hôm nay trở đi)
  w.sqlite.prepare("INSERT INTO prc_transfer_fee_tier_discount (id, tier_code, amount, valid_from_date, created_at, updated_at) VALUES ('g1', ?, 15000, ?, '2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z')").run(c3, addDays(HOM_NAY, -5));
  assert.equal((await w.call("POST", "/api/pricing/giam-phi-don/g1/ket-thuc", { as: SALES, body: { expectedUpdatedAt: "2026-11-01T00:00:00.000Z" } })).status, 403);
  assert.equal((await w.call("POST", "/api/pricing/giam-phi-don/g1/ket-thuc", { as: KT, body: { expectedUpdatedAt: "sai" } })).status, 409);
  const r = await w.call("POST", "/api/pricing/giam-phi-don/g1/ket-thuc", { as: KT, body: { expectedUpdatedAt: "2026-11-01T00:00:00.000Z" } });
  assert.equal(r.status, 200, r.text);
  assert.equal(w.q("SELECT valid_to_date AS d FROM prc_transfer_fee_tier_discount WHERE id = 'g1'")[0].d, HOM_NAY);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_discount_ended'")[0].n, 1);
  const lai = await w.call("POST", "/api/pricing/giam-phi-don/g1/ket-thuc", { as: KT, body: { expectedUpdatedAt: "2026-11-01T00:00:00.000Z" } });
  assert.equal(lai.status, 409);
  assert.equal((await w.call("POST", "/api/pricing/giam-phi-don/khong-co/ket-thuc", { as: KT, body: { expectedUpdatedAt: "x" } })).status, 404);
});

test("mucGiamPhiDonTheoNgay trả đúng mức theo ngày; null khi cấp chưa đặt", async () => {
  const { w, c3 } = await setup();
  await dat(w, KT, { tierCode: c3, amount: 20000, validFromDate: NGAY1 });
  const cu = (await w.call("GET", "/api/pricing/giam-phi-don", { as: KT })).json.dong[0];
  await dat(w, KT, { tierCode: c3, amount: 30000, validFromDate: NGAY2, thayCho: { id: cu.id, expectedUpdatedAt: cu.updatedAt } });
  const db = w.env.DB;
  assert.equal(await mucGiamPhiDonTheoNgay(db, c3, HOM_NAY), null);
  assert.equal(await mucGiamPhiDonTheoNgay(db, c3, NGAY1), 20000);
  assert.equal(await mucGiamPhiDonTheoNgay(db, c3, addDays(NGAY2, -1)), 20000);
  assert.equal(await mucGiamPhiDonTheoNgay(db, c3, NGAY2), 30000);
  assert.equal(await mucGiamPhiDonTheoNgay(db, "KHAC", NGAY2), null);
});
