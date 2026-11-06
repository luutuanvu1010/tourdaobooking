// ADR-0178 Đ1 mục 1 (Task A2): công tắc «Khách của đối tác trả cho Công ty» qua ROUTE THẬT trên khung thử (cả ứng dụng + SQLite).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { kenhThuHienTai } from "./kenh-thu.ts";

const SA = "55555555-5555-4555-8555-555555555555";
const QT = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const SALES = "11111111-1111-4111-8111-111111111111";
const DT = "66666666-6666-4666-8666-666666666666";

type W = ReturnType<typeof world>;
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SA, "0900000006", "Toàn Quyền", ["SUPER_ADMIN"]], [QT, "0900000003", "Quản Trị", ["ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [SALES, "0900000001", "An Bán", ["SALES"]], [DT, "0900000007", "Đối Tác", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  return w;
}
const doi = (w: W, as: string, body: unknown) => w.call("POST", "/api/kenh-thu-doi-tac", { as, body });
const dem = (w: W, sql: string) => Number(w.q(sql)[0].n);
const dangMo = (w: W) => dem(w, "SELECT COUNT(*) AS n FROM bil_partner_channel_setting WHERE valid_to IS NULL");
const nhatKy = (w: W) => dem(w, "SELECT COUNT(*) AS n FROM audit_log WHERE action = 'partner_channel_set'");

test("chưa có dòng nào ⇒ Bật (1); GET trả mặc định Bật, lịch sử rỗng", async () => {
  const w = setup();
  assert.equal(await kenhThuHienTai(w.env.DB), 1);
  const r = await w.call("GET", "/api/kenh-thu-doi-tac", { as: SA });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { congTyThu: true, tuLuc: null, lichSu: [] });
});

test("Toàn quyền đổi sang Tắt: dòng cũ đóng, dòng mới hiệu lực, một dòng nhật ký, GET đọc lại đúng", async () => {
  const w = setup();
  assert.equal((await doi(w, SA, { congTyThu: true })).status, 200); // dòng đầu (Bật) — đổi từ mặc định vẫn là «không đổi»
  assert.equal(dem(w, "SELECT COUNT(*) AS n FROM bil_partner_channel_setting"), 0, "đúng giá trị đang có (mặc định Bật) ⇒ không thêm dòng");
  const r = await doi(w, SA, { congTyThu: false });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.congTyThu, false);
  assert.equal(await kenhThuHienTai(w.env.DB), 0);
  assert.equal(dangMo(w), 1);
  assert.equal(nhatKy(w), 1);
  assert.equal(String(w.q("SELECT detail FROM audit_log WHERE action = 'partner_channel_set'")[0].detail), "Tắt");
  const r2 = await doi(w, SA, { congTyThu: true });
  assert.equal(r2.status, 200, r2.text);
  assert.equal(dem(w, "SELECT COUNT(*) AS n FROM bil_partner_channel_setting WHERE valid_to IS NOT NULL"), 1, "dòng Tắt đã đóng");
  assert.equal(dangMo(w), 1);
  assert.equal(nhatKy(w), 2);
  const g = await w.call("GET", "/api/kenh-thu-doi-tac", { as: KT });
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.congTyThu, true);
  assert.equal(g.json.lichSu.length, 2);
  assert.equal(g.json.lichSu[0].congTyThu, true);
  assert.equal(g.json.lichSu[0].nguoiDoi, "Toàn Quyền");
  assert.equal(g.json.tuLuc, g.json.lichSu[0].tuLuc);
  assert.ok(!JSON.stringify(g.json).includes("0900000006"), "không lộ SĐT");
});

test("Quản trị, Kế toán, Bán hàng, Đối tác đổi ⇒ 403, không dòng, không nhật ký", async () => {
  const w = setup();
  for (const as of [QT, KT, SALES, DT]) assert.equal((await doi(w, as, { congTyThu: false })).status, 403, as);
  assert.equal(dem(w, "SELECT COUNT(*) AS n FROM bil_partner_channel_setting"), 0);
  assert.equal(nhatKy(w), 0);
});

test("xem: Kế toán, Quản trị được; Bán hàng, Đối tác 403", async () => {
  const w = setup();
  for (const as of [KT, QT]) assert.equal((await w.call("GET", "/api/kenh-thu-doi-tac", { as })).status, 200, as);
  for (const as of [SALES, DT]) assert.equal((await w.call("GET", "/api/kenh-thu-doi-tac", { as })).status, 403, as);
});

test("thân sai kiểu ⇒ 400, không đổi gì", async () => {
  const w = setup();
  for (const body of [{}, { congTyThu: "false" }, { congTyThu: 0 }, { congTyThu: null }, null]) assert.equal((await doi(w, SA, body)).status, 400, JSON.stringify(body));
  assert.equal(dem(w, "SELECT COUNT(*) AS n FROM bil_partner_channel_setting"), 0);
});

test("hai lần đổi liền nhau (hai tab) ⇒ đúng một dòng đang mở, cả hai có nhật ký, dòng sau cùng thắng", async () => {
  const w = setup();
  const [a, b] = await Promise.all([doi(w, SA, { congTyThu: false }), doi(w, SA, { congTyThu: false })]);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.equal(dangMo(w), 1);
  await doi(w, SA, { congTyThu: true });
  await doi(w, SA, { congTyThu: false });
  assert.equal(dangMo(w), 1);
  assert.equal(await kenhThuHienTai(w.env.DB), 0);
});

test("đổi sang đúng giá trị đang có ⇒ 200, không thêm dòng, không thêm nhật ký", async () => {
  const w = setup();
  await doi(w, SA, { congTyThu: false });
  const truoc = [dem(w, "SELECT COUNT(*) AS n FROM bil_partner_channel_setting"), nhatKy(w)];
  const r = await doi(w, SA, { congTyThu: false });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([dem(w, "SELECT COUNT(*) AS n FROM bil_partner_channel_setting"), nhatKy(w)], truoc);
});

test("CSDL: không xoá, không sửa giá trị dòng đã ghi", async () => {
  const w = setup();
  await doi(w, SA, { congTyThu: false });
  assert.throws(() => w.sqlite.prepare("DELETE FROM bil_partner_channel_setting").run(), /bil_append_only/);
  assert.throws(() => w.sqlite.prepare("UPDATE bil_partner_channel_setting SET company_collects = 1").run(), /bil_append_only/);
});
