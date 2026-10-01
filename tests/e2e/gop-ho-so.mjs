// Gộp hồ sơ cá nhân (ADR-0068) — e2e MỎNG trên API thật (D1 local tạm, wrangler dev). Ca chi tiết ở npm test (khung thử). Ở đây: C2, T1, G1–G3, G7 (một đơn
// nháp), G9, G12 (Bán hàng 403), G13 (hai yêu cầu SONG SONG qua HTTP thật). Cuối lượt, run.mjs chạy audit-invariants --strict (có R-PTY-MERGE-*).
import assert from "node:assert/strict";
import { ACCOUNTS, call, ensureFakeCatalog, orderInput, randomPhone, session, sql, sqlRows } from "./lib.mjs";

await ensureFakeCatalog(); // orderInput() dùng danh mục giả ZE1 (không cần Sheet thật).
const ADMIN = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);
const tag = String(Date.now()).slice(-6);
const TEN = `Gộp Thử ${tag} Phương`;
const soX = randomPhone();

let r = await call(ADMIN, "POST", "/api/parties", { kind: "PERSON", fullName: TEN, contacts: [{ kind: "PHONE", value: soX }] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const A = r.body.party.id;
assert.equal((await call(ADMIN, "POST", `/api/parties/${A}/roles`, { roleTypeCode: "BOAT_CAPTAIN" })).status, 201);

// C2: tạo tài khoản cùng tên, không cờ → 409 kèm A, không lộ SĐT của A; có cờ → 201
r = await call(ADMIN, "POST", "/api/staff", { fullName: TEN, phone: randomPhone(), roles: ["SALES_STAFF"] });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "party_match_exists");
assert.ok(r.body.error.khop.some((k) => k.id === A));
assert.ok(!JSON.stringify(r.body).includes(soX));
r = await call(ADMIN, "POST", "/api/staff", { fullName: TEN, phone: randomPhone(), roles: ["SALES_STAFF"], taoHoSoMoi: true });
assert.equal(r.status, 201, JSON.stringify(r.body));
const B = r.body.staff.partyId;
console.log("✓ C2: chặn tạo trùng; cờ “vẫn tạo hồ sơ mới”");

r = await call(ADMIN, "GET", "/api/parties/duplicates");
assert.equal(r.status, 200);
assert.ok(r.body.pairs.some((p) => [p.a.id, p.b.id].sort().join() === [A, B].sort().join() && p.lyDo.includes("NAME")));
console.log("✓ T1: cặp nghi trùng theo tên");

r = await call(SALES, "POST", "/api/orders", orderInput());
assert.equal(r.status, 201, JSON.stringify(r.body));
const donId = r.body.order.id;
await sql(`UPDATE orders SET booker_party_id = '${A}' WHERE id = '${donId}'`);

assert.equal((await call(SALES, "POST", `/api/parties/${A}/merge/preview`, { intoPartyId: B })).status, 403);
r = await call(ADMIN, "POST", `/api/parties/${A}/merge/preview`, { intoPartyId: B });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.chan, []);
assert.equal(r.body.donDoi, 1);
console.log("✓ G10 xem trước; G12 Bán hàng 403");

const [g1, g2] = await Promise.all([
  call(ADMIN, "POST", `/api/parties/${A}/merge`, { intoPartyId: B, xacNhan: TEN }),
  call(ADMIN, "POST", `/api/parties/${A}/merge`, { intoPartyId: B, xacNhan: TEN }),
]);
assert.deepEqual([g1.status, g2.status].sort(), [200, 409], `${JSON.stringify(g1.body)} ${JSON.stringify(g2.body)}`);
console.log("✓ G13: hai yêu cầu song song — một thành công");

r = await call(SALES, "GET", `/api/parties/lookup?phone=${soX}`);
assert.deepEqual(r.body.matches.map((m) => m.id), [B]);
r = await call(ADMIN, "GET", `/api/parties/${A}`);
assert.equal(r.body.party.mergedInto.id, B);
assert.equal(r.body.party.editable, false);
assert.equal((await sqlRows(`SELECT booker_party_id b FROM orders WHERE id = '${donId}'`))[0].b, B);
const nhatKy = await sqlRows(`SELECT target_id t, detail d FROM audit_log WHERE action = 'party_merged' AND target_id IN ('${A}', '${B}')`);
assert.equal(nhatKy.length, 2);
assert.ok(nhatKy.every((x) => !x.d.includes(soX)));
console.log("✓ G1–G3, G7, G9: SĐT sang B, A chỉ đọc, đơn nháp đổi người đặt, hai dòng nhật ký sạch");
