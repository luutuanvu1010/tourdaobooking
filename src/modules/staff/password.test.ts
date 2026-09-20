import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPin, verifyPin } from "./password.ts";
// @ts-expect-error — module .mjs không có khai báo kiểu; đây là đường tạo tài khoản của scripts/
import { insertStaffSql } from "../../../scripts/staff-lib.mjs";

test("băm rồi kiểm PIN: đúng thì qua, sai thì không", async () => {
  const h = await hashPin("482915");
  assert.match(h, /^pbkdf2\$sha256\$100000\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
  assert.ok(await verifyPin("482915", h));
  assert.ok(!(await verifyPin("482916", h)));
});

test("hash do scripts/ tạo được Worker chấp nhận (cùng một định dạng)", async () => {
  const sql: string = await insertStaffSql({ name: "Nguyễn Văn A", phone: "0900000009", pin: "482915", permissions: ["SALES"] });
  const hash = /'(pbkdf2\$[^']+)'/.exec(sql)?.[1];
  assert.ok(hash, sql);
  assert.ok(await verifyPin("482915", hash));
});
