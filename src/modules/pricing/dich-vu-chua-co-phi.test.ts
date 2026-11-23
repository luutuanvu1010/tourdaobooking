// ADR-0218 Đ1.8 — kế hoạch 2026-11-18 Task 5: `GET /api/pricing/phi-don/dich-vu-chua-co-phi` — dịch vụ có đưa đón mà chưa có giá gốc phí đưa đón trên Sheet. Chỉ nhắc, không chặn.
// Chạy CẢ ứng dụng trên SQLite thật. Tên người dùng GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "55555555-5555-4555-8555-555555555555";
const SA = "33333333-3333-4333-8333-333333333333";
const AT = "2026-10-01T00:00:00.000Z";
const URL = "/api/pricing/phi-don/dich-vu-chua-co-phi";

function setup() {
  const w = world();
  for (const [id, phone, name, perms] of [[SALES, "0900000001", "An Bán", ["SALES"]], [ADM, "0900000006", "Quản Trị", ["ADMIN"]], [SA, "0900000003", "Chủ", ["SUPER_ADMIN"]]] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  for (const code of ["T_TRONG", "T_KHONG", "T_CO", "T_KHONG_DON", "T_NGOAI_SHEET"]) {
    w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES (?, ?, 'perPax', 500000, ?, ?, ?)").run(code, `Tour ${code}`, code === "T_NGOAI_SHEET" ? 0 : 1, AT, AT);
  }
  // giá gốc: T_KHONG = 0 (miễn phí), T_CO = 50.000, T_TRONG = ô trống (null)
  const gia = w.sqlite.prepare("INSERT INTO ctl_service_transfer_price (id, catalog_code, per_pax_price, private_price, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?)");
  gia.run("a", "T_KHONG", 0, AT, AT, AT);
  gia.run("b", "T_CO", 50000, AT, AT, AT);
  gia.run("c", "T_TRONG", null, AT, AT, AT);
  return w;
}
// «có đưa đón»: theo nhóm mặc định hoặc quy tắc dịch vụ; T_KHONG_DON bị đặt NEVER.
function tatDon(w: ReturnType<typeof setup>) {
  w.sqlite.prepare("INSERT INTO ctl_service_transfer_rule (id, service_code, mode, valid_from_at, created_at, updated_at) VALUES ('r1', 'T_KHONG_DON', 'NEVER', ?, ?, ?)").run(AT, AT, AT);
}

test("dịch vụ bật đưa đón mà ô trống ⇒ có; ô 0 ⇒ không; ô có số ⇒ không; đặt không đón ⇒ không; đã rời Sheet ⇒ không", async () => {
  const w = setup();
  tatDon(w);
  const r = await w.call("GET", URL, { as: ADM });
  assert.equal(r.status, 200, r.text);
  const ma = r.json.dichVu.map((d: { code: string }) => d.code).sort();
  assert.deepEqual(ma, ["T_TRONG"]);
  assert.equal(r.json.dichVu[0].name, "Tour T_TRONG");
});

test("dịch vụ chưa từng có dòng giá gốc cũng được nhắc (chưa có cột trên Sheet)", async () => {
  const w = setup();
  tatDon(w);
  w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('T_MOI', 'Tour mới', 'perPax', 1, 1, ?, ?)").run(AT, AT);
  const r = await w.call("GET", URL, { as: SA });
  assert.deepEqual(r.json.dichVu.map((d: { code: string }) => d.code).sort(), ["T_MOI", "T_TRONG"]);
});

test("Bán hàng ⇒ 403; Quản trị và Toàn quyền ⇒ 200", async () => {
  const w = setup();
  assert.equal((await w.call("GET", URL, { as: SALES })).status, 403);
  assert.equal((await w.call("GET", URL, { as: ADM })).status, 200);
  assert.equal((await w.call("GET", URL, { as: SA })).status, 200);
});
