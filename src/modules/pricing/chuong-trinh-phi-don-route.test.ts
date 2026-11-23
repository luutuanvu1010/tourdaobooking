// Chương trình miễn phí đưa đón (ADR-0218 Đ2; kế hoạch 2026-11-18 Task 4 bước 2): route tạo / kết thúc / liệt kê và hàm công bố `chuongTrinhPhiDonHieuLuc`.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Tên người dùng GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { chuongTrinhPhiDonHieuLuc } from "./chuong-trinh-phi-don-repo.ts";
import { addDays, vnToday } from "../../shared/vn-date.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const SA = "33333333-3333-4333-8333-333333333333";
const DT = "66666666-6666-4666-8666-666666666666";
const AT = "2026-10-01T00:00:00.000Z";
const HOM_NAY = vnToday(new Date());
const TU = addDays(HOM_NAY, 2);
const DEN = addDays(HOM_NAY, 30);

function setup() {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [ADM, "0900000006", "Quản Trị", ["ADMIN"]],
    [SA, "0900000003", "Chủ", ["SUPER_ADMIN"]], [DT, "0900000008", "Đối Tác Một", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  for (const code of ["TOUR_A", "TOUR_B"]) w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES (?, ?, 'perPax', 500000, 1, ?, ?)").run(code, `Tour ${code}`, AT, AT);
  return w;
}
type W = ReturnType<typeof setup>;
const tao = (w: W, as: string, body: unknown) => w.call("POST", "/api/pricing/chuong-trinh-phi-don", { as, body });
const mau = (p: Record<string, unknown> = {}) => ({ name: "Miễn phí đón dịp khai trương", scope: "ALL", tripFrom: TU, tripTo: DEN, includePrivate: false, ...p });
const dem = (w: W, sql: string, ...a: unknown[]) => Number(w.q(sql, ...a)[0].n);

test("Quản trị và Toàn quyền tạo được (ALL); Kế toán, Bán hàng, Đối tác ⇒ 403; GET cũng vậy", async () => {
  const w = setup();
  assert.equal((await tao(w, ADM, mau())).status, 201);
  assert.equal((await tao(w, SA, mau({ name: "Đợt hai" }))).status, 201);
  for (const as of [KT, SALES, DT]) {
    assert.equal((await tao(w, as, mau())).status, 403, as);
    assert.equal((await w.call("GET", "/api/pricing/chuong-trinh-phi-don", { as })).status, 403, as);
  }
  assert.equal(dem(w, "SELECT count(*) AS n FROM prc_transfer_fee_program"), 2);
});

test("tạo SERVICES kèm danh sách dịch vụ, PARTNERS kèm hồ sơ; GET trả tên dịch vụ / đối tác và cờ xe riêng", async () => {
  const w = setup();
  const a = await tao(w, ADM, mau({ scope: "SERVICES", services: ["TOUR_A", "TOUR_B"], includePrivate: true }));
  assert.equal(a.status, 201, a.text);
  const b = await tao(w, ADM, mau({ name: "Cho đối tác", scope: "PARTNERS", parties: [`pty-${DT}`] }));
  assert.equal(b.status, 201, b.text);
  const g = await w.call("GET", "/api/pricing/chuong-trinh-phi-don", { as: ADM });
  assert.equal(g.status, 200);
  const ds = g.json.chuongTrinh;
  assert.equal(ds.length, 2);
  const dv = ds.find((x: any) => x.phamVi === "SERVICES");
  assert.deepEqual(dv.dichVu.map((x: any) => x.code).sort(), ["TOUR_A", "TOUR_B"]);
  assert.equal(dv.gomXeRieng, true);
  const dtac = ds.find((x: any) => x.phamVi === "PARTNERS");
  assert.equal(dtac.doiTac[0].id, `pty-${DT}`);
  assert.ok(dtac.doiTac[0].name);
});

test("sai: SERVICES rỗng, mã dịch vụ lạ, PARTNERS rỗng, hồ sơ lạ, ALL kèm danh sách, ngày ngược, đã qua, tên rỗng ⇒ 400, không ghi gì", async () => {
  const w = setup();
  const sai: Record<string, unknown>[] = [
    mau({ scope: "SERVICES", services: [] }), mau({ scope: "SERVICES" }), mau({ scope: "SERVICES", services: ["KHONG_CO"] }),
    mau({ scope: "PARTNERS", parties: [] }), mau({ scope: "PARTNERS", parties: ["khong-co"] }),
    mau({ scope: "ALL", services: ["TOUR_A"] }), mau({ scope: "KHAC" }),
    mau({ tripFrom: DEN, tripTo: TU }), mau({ tripFrom: addDays(HOM_NAY, -9), tripTo: addDays(HOM_NAY, -2) }), mau({ tripFrom: "xx", tripTo: DEN }),
    mau({ name: "   " }), mau({ name: "x".repeat(121) }), mau({ includePrivate: "có" }),
  ];
  for (const [i, b] of sai.entries()) assert.equal((await tao(w, ADM, b)).status, 400, `ca ${i}`);
  assert.equal(dem(w, "SELECT count(*) AS n FROM prc_transfer_fee_program"), 0);
  assert.equal(dem(w, "SELECT count(*) AS n FROM prc_transfer_fee_program_scope"), 0);
});

test("nhật ký tạo có tên chương trình, khoảng ngày, phạm vi; không có SĐT", async () => {
  const w = setup();
  await tao(w, ADM, mau({ scope: "SERVICES", services: ["TOUR_A"] }));
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'prc_transfer_fee_program_created'");
  assert.equal(nk.length, 1);
  assert.match(nk[0].detail, /Miễn phí đón dịp khai trương/);
  assert.match(nk[0].detail, /1 dịch vụ/);
  assert.doesNotMatch(nk[0].detail, /09\d{8}/);
});

test("kết thúc: đặt ended_at; hai lần ⇒ 409; mã lạ ⇒ 404; Kế toán ⇒ 403; hàm hiệu lực không còn trả sau khi kết thúc", async () => {
  const w = setup();
  const id = (await tao(w, ADM, mau())).json.chuongTrinh.id as string;
  const db = w.env.DB;
  assert.equal((await chuongTrinhPhiDonHieuLuc(db, new Date().toISOString())).length, 1);
  assert.equal((await w.call("POST", `/api/pricing/chuong-trinh-phi-don/${id}/ket-thuc`, { as: KT, body: {} })).status, 403);
  assert.equal((await w.call("POST", "/api/pricing/chuong-trinh-phi-don/khong-co/ket-thuc", { as: ADM, body: {} })).status, 404);
  const r = await w.call("POST", `/api/pricing/chuong-trinh-phi-don/${id}/ket-thuc`, { as: ADM, body: {} });
  assert.equal(r.status, 200, r.text);
  assert.equal((await w.call("POST", `/api/pricing/chuong-trinh-phi-don/${id}/ket-thuc`, { as: ADM, body: {} })).status, 409);
  assert.equal(dem(w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_program_ended'"), 1);
  const sau = new Date(Date.now() + 1000).toISOString();
  assert.equal((await chuongTrinhPhiDonHieuLuc(db, sau)).length, 0);
  // mốc trước lúc kết thúc: chương trình vẫn hiệu lực lúc đó
  assert.equal((await chuongTrinhPhiDonHieuLuc(db, "2020-01-01T00:00:00.000Z")).length, 1);
  const g = await w.call("GET", "/api/pricing/chuong-trinh-phi-don", { as: ADM });
  assert.ok(g.json.chuongTrinh[0].ketThucLuc);
});

test("hàm hiệu lực trả đủ phạm vi dịch vụ / đối tác để luật khớp dùng", async () => {
  const w = setup();
  await tao(w, ADM, mau({ scope: "SERVICES", services: ["TOUR_A"] }));
  await tao(w, ADM, mau({ name: "B", scope: "PARTNERS", parties: [`pty-${DT}`] }));
  const ds = await chuongTrinhPhiDonHieuLuc(w.env.DB, new Date().toISOString());
  assert.deepEqual(ds.find((c) => c.scope === "SERVICES")!.services, ["TOUR_A"]);
  assert.deepEqual(ds.find((c) => c.scope === "PARTNERS")!.parties, [`pty-${DT}`]);
  assert.deepEqual(ds.find((c) => c.scope === "SERVICES")!.parties, []);
});
