// ADR-0207 Đ5, Đ7 (đợt 1 Task 7, M3 của vòng kiểm): tài khoản sinh từ phiếu đăng ký đang TẮT (`active = 0`) — đăng nhập PIN qua route thật phải trả 401 `invalid_credentials`,
// KHÔNG phân biệt với «sai PIN» (không lộ rằng tài khoản có tồn tại). Chạy cả ứng dụng trên SQLite thật qua tests/audit/harness.mjs. Đường Face ID: tài khoản tắt không có phiên nên không có
// đường nào gắn khoá Face ID cho nó (các route khoá đòi phiên), và `passkey/login` cũng từ chối chủ khoá không hoạt động (getActiveStaff null) — chưa dựng được bài chữ ký giả ở khung này.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { hashPin } from "./modules/staff/password.ts";

const DOI_TAC = "22222222-2222-4222-8222-222222222222";
const PIN = "135790";

test("đăng nhập PIN đúng của tài khoản đang tắt (chưa kích hoạt) → 401 invalid_credentials, không phiên; đối chứng: bật lên thì 200", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: DOI_TAC, phone: "0900000022", name: "Lễ Tân", perms: ["PARTNER"], vai: "HOTEL_RECEPTION" });
  w.sqlite.prepare("UPDATE staff SET pin_hash = ?, active = 0 WHERE id = ?").run(await hashPin(PIN), DOI_TAC);
  const r = await w.call("POST", "/api/auth/login", { body: { phone: "0900000022", pin: PIN } });
  assert.equal(r.status, 401, r.text);
  assert.equal(JSON.parse(r.text).error.code, "invalid_credentials");
  assert.equal(w.q("SELECT count(*) AS n FROM aut_session WHERE staff_id = ?", DOI_TAC)[0].n, 0, "không cấp phiên");
  w.sqlite.prepare("UPDATE staff SET active = 1 WHERE id = ?").run(DOI_TAC);
  const ok = await w.call("POST", "/api/auth/login", { body: { phone: "0900000022", pin: PIN } });
  assert.equal(ok.status, 200, ok.text);
});
