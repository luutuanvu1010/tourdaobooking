import { test } from "node:test";
import assert from "node:assert/strict";
import { PARTY_ID_RE } from "./party-id.ts";

const U = "0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0";

test("PARTY_ID_RE: UUID và pty-<uuid> hợp lệ; tiền tố khác, rỗng, chữ hoa, thừa ký tự thì không", () => {
  assert.ok(PARTY_ID_RE.test(U));
  assert.ok(PARTY_ID_RE.test(`pty-${U}`));
  for (const bad of ["", "pty-x", `ptr-${U}`, U.toUpperCase(), `${U}x`, `x${U}`]) assert.equal(PARTY_ID_RE.test(bad), false, bad);
});
