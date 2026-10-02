// ADR-0094 đ4, T15 (phần máy chủ): thiếu / ngắn khoá LAN_GUI_SECRET ⇒ checkConfig báo, MỌI API (kể cả công khai, kể cả đọc) trả 500
// server_misconfigured — khoá phải có trước lần triển khai mang lớp vé. Chạy CẢ ứng dụng qua tests/audit/harness.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  return w;
}

test("khung thử có khoá LAN_GUI_SECRET ≥ 32 ⇒ API chạy bình thường", async () => {
  const w = setup();
  assert.ok(typeof w.env.LAN_GUI_SECRET === "string" && w.env.LAN_GUI_SECRET.length >= 32, "khung thử phải dựng env có khoá");
  assert.equal((await w.call("GET", "/api/auth/me", { as: SALES })).status, 200);
});

for (const [ten, gan] of [["thiếu", undefined], ["rỗng", ""], ["31 ký tự", "z".repeat(31)]] as const) {
  test(`khoá ${ten} ⇒ GET có đăng nhập, GET công khai, POST đều 500 server_misconfigured`, async () => {
    const w = setup();
    if (gan === undefined) delete w.env.LAN_GUI_SECRET;
    else w.env.LAN_GUI_SECRET = gan;
    for (const [m, p, as] of [["GET", "/api/auth/me", SALES], ["GET", "/api/auth/config", undefined], ["POST", "/api/feedback", SALES]] as const) {
      const r = await w.call(m, p, { as, body: m === "POST" ? { kind: "gop_y", message: "x" } : undefined });
      assert.equal(r.status, 500, `${m} ${p}: ${r.text}`);
      assert.equal(r.json?.error?.code, "server_misconfigured");
    }
  });
}

test("khoá đúng 32 ký tự ⇒ chạy", async () => {
  const w = setup();
  w.env.LAN_GUI_SECRET = "z".repeat(32);
  assert.equal((await w.call("GET", "/api/auth/me", { as: SALES })).status, 200);
});
