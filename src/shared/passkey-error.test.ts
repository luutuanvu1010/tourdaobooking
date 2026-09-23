import { test } from "node:test";
import assert from "node:assert/strict";
import { passkeyErrorMessage } from "./passkey-error.ts";

const err = (name: string) => Object.assign(new Error("x"), { name });
test("huỷ Face ID không báo lỗi; máy đã có khoá báo rõ; lỗi khác báo chung, tiếng Việt", () => {
  assert.equal(passkeyErrorMessage(err("NotAllowedError")), null);
  assert.equal(passkeyErrorMessage(err("AbortError")), null);
  assert.equal(passkeyErrorMessage(err("InvalidStateError")), "Máy này đã bật Face ID cho tài khoản.");
  assert.equal(passkeyErrorMessage(err("SecurityError")), "Không dùng được Face ID trên máy này. Hãy đăng nhập bằng PIN.");
  assert.equal(passkeyErrorMessage("lạ"), "Không dùng được Face ID trên máy này. Hãy đăng nhập bằng PIN.");
});
