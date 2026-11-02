// web/vendor/jsqr.cjs là mã bên thứ ba thứ hai chạy trên máy người dùng (ADR-0156 Đ4, khuôn ADR-0108 đ3): chép NGUYÊN, không gọi mạng, không chạy chuỗi thành mã, không ghi HTML thô,
// không đụng trang / bộ nhớ trình duyệt; không vào package.json; chỉ web/qr-doc-ve.ts import nó. Nâng phiên bản = chép lại NGUYÊN tệp, cập nhật ba dòng đầu, đọc hết lại, rồi cập nhật HASH_THAN có chủ đích.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import qrcode from "../web/vendor/qrcode.js";

const GOC = fileURLToPath(new URL("..", import.meta.url));
const src = readFileSync(new URL("../web/vendor/jsqr.cjs", import.meta.url), "utf8");
// Cùng danh sách với src/vendor-qr.test.ts, TRỪ `location`: ở tệp này đó là tên biến nội bộ của bộ đọc (vị trí mã trong ảnh), không phải địa chỉ trang (đã đọc: không có `location.` nào chỉ địa chỉ).
const CAM: RegExp[] = [/\binnerHTML\b/, /\bouterHTML\b/, /\binsertAdjacentHTML\b/, /\beval\s*\(/, /\bnew\s+Function\b/, /\bfetch\s*\(/, /\bXMLHttpRequest\b/,
  /\bimportScripts\b/, /\bdocument\b/, /\bWebSocket\b/, /\bsendBeacon\b/, /\bimport\s*\(/, /\bwindow\b/, /\bnavigator\b/, /\blocalStorage\b/, /\bsessionStorage\b/, /\bWorker\b/, /\bEventSource\b/];
/** SHA-256 của THÂN tệp = tệp bỏ ba dòng đầu. Khớp dist/jsQR.js của jsqr@1.4.0 đã chép ngày 2026-11-02. */
const HASH_THAN = "bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859";

/** Nạp đúng cách trang nạp: CommonJS, `module.exports` là hàm đọc. */
const napBoDoc = (): ((data: Uint8ClampedArray, w: number, h: number) => { data: string } | null) => createRequire(import.meta.url)("../web/vendor/jsqr.cjs");

test("tệp bộ đọc QR không chứa chữ cấm", () => {
  for (const re of CAM) assert.doesNotMatch(src, re, `web/vendor/jsqr.cjs chứa ${re}`);
});

test("giữ đầu tệp nguồn gốc + toàn văn giấy phép Apache-2.0", () => {
  assert.match(src, /CHÉP NGUYÊN từ gói npm jsqr@1\.4\.0/);
  assert.match(src, /integrity: sha512-/);
  assert.match(src, /Apache-2\.0/);
  assert.match(readFileSync(new URL("../web/vendor/jsqr.LICENSE.txt", import.meta.url), "utf8"), /Apache License\s+Version 2\.0/);
});

test("thân tệp đúng hash đã ghim: sửa một byte là đỏ", () => {
  const dong = src.split("\n");
  for (const d of dong.slice(0, 3)) assert.match(d, /^\/\/[^\r\u2028\u2029]*$/, `dòng đầu không phải ghi chú một dòng: ${d.slice(0, 60)}`);
  assert.equal(createHash("sha256").update(dong.slice(3).join("\n")).digest("hex"), HASH_THAN, "thân web/vendor/jsqr.cjs đã bị đổi: chép lại nguyên bản gốc, hoặc (nâng phiên bản) cập nhật HASH_THAN sau khi đọc hết lại");
});

/** Mọi tệp (đệ quy) dưới `thuMuc`, trả đường dẫn tương đối so với gốc kho; bỏ thư mục `web/vendor` và `node_modules`. */
function moiTep(thuMuc: string): string[] {
  const ra: string[] = [];
  for (const ten of readdirSync(thuMuc)) {
    const day = join(thuMuc, ten);
    const rel = relative(GOC, day).split("\\").join("/");
    if (rel === "web/vendor" || ten === "node_modules") continue;
    if (statSync(day).isDirectory()) ra.push(...moiTep(day));
    else ra.push(rel);
  }
  return ra;
}

test("chỉ web/qr-doc-ve.ts nhắc tới bộ đọc (quét đệ quy web/ và src/, mọi loại tệp)", () => {
  const dung = [...moiTep(join(GOC, "web")), ...moiTep(join(GOC, "src"))]
    .filter((rel) => rel !== "src/vendor-jsqr.test.ts")
    .filter((rel) => /vendor\/jsqr/.test(readFileSync(join(GOC, rel), "utf8")));
  assert.deepEqual(dung, ["web/qr-doc-ve.ts"]);
});

test("không thêm bộ đọc vào package.json", () => {
  assert.doesNotMatch(readFileSync(new URL("../package.json", import.meta.url), "utf8"), /jsqr/i);
});

/** Vẽ chuỗi thành điểm ảnh RGBA đen trên trắng: mỗi ô `co` điểm ảnh, lề trắng 4 ô. */
function veDiemAnh(chuoi: string, co = 4): { data: Uint8ClampedArray; canh: number } {
  const qr = qrcode(0, "M");
  qr.addData(chuoi, "Byte");
  qr.make();
  const so = qr.getModuleCount();
  const canh = (so + 8) * co;
  const data = new Uint8ClampedArray(canh * canh * 4).fill(255);
  for (let r = 0; r < so; r++) for (let c = 0; c < so; c++) {
    if (!qr.isDark(r, c)) continue;
    for (let y = 0; y < co; y++) for (let x = 0; x < co; x++) {
      const o = ((r + 4) * co + y) * canh * 4 + ((c + 4) * co + x) * 4;
      data[o] = 0; data[o + 1] = 0; data[o + 2] = 0;
    }
  }
  return { data, canh };
}

test("đọc đúng chuỗi 36 chữ số do bộ vẽ QR tạo; ảnh trắng không có mã thì trả null", () => {
  const doc = napBoDoc();
  const chuoi = "123456789012345678901234900000000001";
  const { data, canh } = veDiemAnh(chuoi);
  assert.equal(doc(data, canh, canh)?.data, chuoi);
  assert.equal(doc(new Uint8ClampedArray(400 * 400 * 4).fill(255), 400, 400), null);
});
