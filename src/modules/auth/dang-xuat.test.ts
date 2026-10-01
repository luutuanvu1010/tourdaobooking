// POST /api/auth/logout (route công khai): kết thúc dòng phiên 'dang_xuat' (ADR-0075, Task 4) và LUÔN xoá cookie — kể cả khi ghi CSDL hỏng
// (đợt sửa sau kiểm độc lập 2026-10-01, T3): lỗi ghi chỉ để lại một dòng log `logout_end_failed` (chỉ câu lỗi — không token / IP / User-Agent), trả 200.
// Chạy CẢ ứng dụng trên SQLite thật qua tests/audit/harness.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  return w;
}
const xoaCookie = (r: any): boolean => /td_session=;/.test(r.headers.get("set-cookie") ?? "") || /td_session=[^;]*;[^,]*Max-Age=0/i.test(r.headers.get("set-cookie") ?? "");

test("đăng xuất: dòng phiên kết thúc 'dang_xuat', cookie bị xoá, 200", async () => {
  const w = setup();
  const tk = await w.token(SALES);
  const sid = tk.split(".")[2]!;
  const r = await w.call("POST", "/api/auth/logout", { headers: { cookie: `td_session=${tk}` }, body: {} });
  assert.equal(r.status, 200, r.text);
  assert.ok(xoaCookie(r), `phải xoá cookie: ${r.headers.get("set-cookie")}`);
  assert.equal(w.q("SELECT end_reason FROM aut_session WHERE id = ?", sid)[0].end_reason, "dang_xuat");
});

test("đăng xuất khi ghi CSDL hỏng: VẪN xoá cookie, trả 200; một dòng log logout_end_failed chỉ có câu lỗi (không token)", async (t) => {
  const w = setup();
  const tk = await w.token(SALES);
  w.sqlite.exec("CREATE TRIGGER hong_ghi_phien BEFORE UPDATE ON aut_session BEGIN SELECT RAISE(ABORT, 'lỗi ghi giả lập'); END");
  const dong: string[] = [];
  t.mock.method(console, "error", (...a: unknown[]) => void dong.push(a.map(String).join(" ")));
  const r = await w.call("POST", "/api/auth/logout", { headers: { cookie: `td_session=${tk}` }, body: {} });
  assert.equal(r.status, 200, r.text);
  assert.ok(xoaCookie(r), `phải xoá cookie dù ghi hỏng: ${r.headers.get("set-cookie")}`);
  const log = dong.filter((d) => d.includes("logout_end_failed"));
  assert.equal(log.length, 1, `đúng một dòng log: ${JSON.stringify(dong)}`);
  assert.ok(log[0]!.includes("lỗi ghi giả lập"), "log có câu lỗi");
  assert.ok(!log[0]!.includes(tk) && !log[0]!.includes(tk.split(".")[2]!), "log không chứa token / mã phiên");
});
