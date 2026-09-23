import { test } from "node:test";
import assert from "node:assert/strict";
import { CborError, decodeCbor } from "./cbor.ts";
import { cborEncode } from "../../../tests/e2e/fake-authenticator.mjs";

const hex = (s: string) => Uint8Array.from(s.match(/../g)?.map((b) => parseInt(b, 16)) ?? []);

test("giải đúng các kiểu cơ bản (vector của RFC 8949 phụ lục A)", () => {
  assert.equal(decodeCbor(hex("00")).value, 0);
  assert.equal(decodeCbor(hex("17")).value, 23);
  assert.equal(decodeCbor(hex("1818")).value, 24);
  assert.equal(decodeCbor(hex("1903e8")).value, 1000);
  assert.equal(decodeCbor(hex("1a000f4240")).value, 1000000);
  assert.equal(decodeCbor(hex("1b000000e8d4a51000")).value, 1000000000000);
  assert.equal(decodeCbor(hex("20")).value, -1);
  assert.equal(decodeCbor(hex("3903e7")).value, -1000);
  assert.deepEqual(decodeCbor(hex("4401020304")).value, Uint8Array.of(1, 2, 3, 4));
  assert.equal(decodeCbor(hex("6449455446")).value, "IETF");
  assert.deepEqual(decodeCbor(hex("83010203")).value, [1, 2, 3]);
  assert.equal(decodeCbor(hex("f4")).value, false);
  assert.equal(decodeCbor(hex("f5")).value, true);
  assert.equal(decodeCbor(hex("f6")).value, null);
});

test("map với khoá số âm (khoá COSE) và lồng nhau; khớp với bộ mã hoá của authenticator giả", () => {
  const input = new Map<number | string, unknown>([[1, 2], [3, -7], [-1, 1], [-2, new Uint8Array(32).fill(7)], ["x", [1, new Map([["a", true]])]]]);
  const { value, end } = decodeCbor(cborEncode(input));
  assert.ok(value instanceof Map);
  assert.equal(value.get(3), -7);
  assert.deepEqual(value.get(-2), new Uint8Array(32).fill(7));
  assert.deepEqual(((value.get("x") as unknown[])[1] as Map<string, unknown>).get("a"), true);
  assert.equal(end, cborEncode(input).length);
});

test("trả `end` đúng khi còn dữ liệu phía sau (khoá COSE nằm trước phần mở rộng trong authData)", () => {
  const bytes = Uint8Array.of(...cborEncode(new Map([[1, 2]])), 0xa0);
  const first = decodeCbor(bytes);
  assert.equal(first.end, 3);
  assert.equal(decodeCbor(bytes, first.end).end, 4);
});

test("từ chối dữ liệu hỏng/nguy hiểm", () => {
  const bad = (h: string) => assert.throws(() => decodeCbor(hex(h)), CborError, h);
  bad("");            // rỗng
  bad("19ff");        // cụt giữa số
  bad("44010203");    // chuỗi byte khai 4, chỉ có 3
  bad("5f");          // độ dài không xác định
  bad("c0");          // tag (kiểu 6) không hỗ trợ
  bad("f7");          // undefined/simple khác
  bad("fb3ff199999999999a"); // số thực
  bad("9bffffffffffffffff"); // mảy khai quá lớn
  bad("a201020103");  // khoá map trùng
  bad("a1f501");      // khoá map không phải số/chuỗi
  bad("1bffffffffffffffff"); // số nguyên vượt 2^53
  bad("818181818181818181818100"); // lồng quá sâu (> 8)
  bad("62c328");      // UTF-8 hỏng
});
