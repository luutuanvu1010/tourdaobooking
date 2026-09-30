import { test } from "node:test";
import assert from "node:assert/strict";
import { canHuyDangKyCu } from "./push-khoa.ts";

const khoa = "BPoEGnoWd7-yBQh3y8R5_0yKPU8QdStKZ0yTnNX8CeCyEZDqg1qlJfCSvQfV0Kv5z2YzF2rRk7m1Nf2p0xQJ7sM";
const bytes = (b64u: string): ArrayBuffer => {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64u.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
};

test("cùng khoá VAPID ⇒ KHÔNG huỷ đăng ký cũ (giữ nguyên địa chỉ, chỉ gửi lại lên máy chủ)", () => {
  assert.equal(canHuyDangKyCu(bytes(khoa), khoa), false);
});

test("khác khoá VAPID ⇒ phải huỷ trước (subscribe với khoá khác ném InvalidStateError)", () => {
  const khac = "B" + "A".repeat(86);
  assert.equal(canHuyDangKyCu(bytes(khac), khoa), true);
});

test("không đọc được khoá của đăng ký cũ ⇒ huỷ cho chắc (hành vi cũ)", () => {
  assert.equal(canHuyDangKyCu(null, khoa), true);
});
