// web/vendor/qrcode.js là mã bên thứ ba ĐẦU TIÊN chạy trên máy người dùng (ADR-0108 đ3, câu C3): chép NGUYÊN, không gọi mạng, không chạy chuỗi thành mã, không
// ghi HTML thô; không vào package.json; chỉ web/qr-ve.ts import nó. Chưa bài nào khác quét tệp .js trong web/ cho các chữ này.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const src = readFileSync(new URL("../web/vendor/qrcode.js", import.meta.url), "utf8");
const CAM: RegExp[] = [/\binnerHTML\b/, /\bouterHTML\b/, /\binsertAdjacentHTML\b/, /\beval\s*\(/, /\bnew\s+Function\b/, /\bfetch\s*\(/, /\bXMLHttpRequest\b/,
  /\bimportScripts\b/, /\bdocument\.write\b/, /\bWebSocket\b/, /\bsendBeacon\b/, /\bimport\s*\(/];

test("tệp bộ vẽ QR không chứa chữ cấm", () => {
  for (const re of CAM) assert.doesNotMatch(src, re, `web/vendor/qrcode.js chứa ${re}`);
});

test("giữ đầu tệp nguồn gốc + dòng giấy phép MIT gốc", () => {
  assert.match(src, /CHÉP NGUYÊN từ gói npm qrcode-generator@/);
  assert.match(src, /integrity: sha512-/);
  assert.match(src, /MIT/);
  assert.match(src, /Kazuhiko Arase/);
});

test("không thêm vào package.json; chỉ web/qr-ve.ts import bộ vẽ", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as Record<string, Record<string, string> | undefined>;
  for (const k of ["dependencies", "devDependencies", "optionalDependencies"]) assert.ok(!pkg[k]?.["qrcode-generator"], k);
  const dung = readdirSync(new URL("../web/", import.meta.url)).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
    .filter((f) => /vendor\/qrcode/.test(readFileSync(new URL(`../web/${f}`, import.meta.url), "utf8")));
  assert.deepEqual(dung, ["qr-ve.ts"]);
});
