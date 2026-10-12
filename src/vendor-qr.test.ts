// web/vendor/qrcode.js là mã bên thứ ba ĐẦU TIÊN chạy trên máy người dùng (ADR-0108 đ3, câu C3): chép NGUYÊN, không gọi mạng, không chạy chuỗi thành mã, không
// ghi HTML thô, không đụng trang / bộ nhớ trình duyệt; không vào package.json; chỉ web/qr-ve.ts import nó. Chưa bài nào khác quét tệp .js trong web/ cho các chữ này.
// Nâng phiên bản bộ vẽ = chép lại NGUYÊN tệp, cập nhật ba dòng đầu, đọc hết lại, rồi cập nhật HASH_THAN dưới đây CÓ CHỦ ĐÍCH (bài hash đỏ là cách để không ai sửa thân tệp lặng lẽ).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("..", import.meta.url));
const src = readFileSync(new URL("../web/vendor/qrcode.js", import.meta.url), "utf8");
const CAM: RegExp[] = [/\binnerHTML\b/, /\bouterHTML\b/, /\binsertAdjacentHTML\b/, /\beval\s*\(/, /\bnew\s+Function\b/, /\bfetch\s*\(/, /\bXMLHttpRequest\b/,
  /\bimportScripts\b/, /\bdocument\.write\b/, /\bWebSocket\b/, /\bsendBeacon\b/, /\bimport\s*\(/,
  // Bộ vẽ chỉ tính ma trận trong bộ nhớ: không có lý do gì chạm trang, bộ nhớ trình duyệt, địa chỉ, luồng nền hay luồng sự kiện (đã quét: 0 chỗ khớp ở bản 2.0.4).
  /\bdocument\b/, /\bwindow\b/, /\bnavigator\b/, /\blocalStorage\b/, /\bsessionStorage\b/, /\blocation\b/, /\bWorker\b/, /\bEventSource\b/];
/** SHA-256 của THÂN tệp = tệp bỏ ba dòng đầu (ghi chú nguồn gốc của Nền tảng). Khớp bản qrcode-generator@2.0.4 đã chép ngày 2026-10-08. */
const HASH_THAN = "ea91d7118a5395289170da848b7c6758b996163bfbccf312591ab65a4911b7c0";

test("tệp bộ vẽ QR không chứa chữ cấm", () => {
  for (const re of CAM) assert.doesNotMatch(src, re, `web/vendor/qrcode.js chứa ${re}`);
});

test("giữ đầu tệp nguồn gốc + dòng giấy phép MIT gốc", () => {
  assert.match(src, /CHÉP NGUYÊN từ gói npm qrcode-generator@/);
  assert.match(src, /integrity: sha512-/);
  assert.match(src, /MIT/);
  assert.match(src, /Kazuhiko Arase/);
});

test("thân tệp đúng hash đã ghim: sửa một byte là đỏ (nâng phiên bản = cập nhật HASH_THAN có chủ đích)", () => {
  const dong = src.split("\n");
  // Ba dòng đầu phải là ghi chú một dòng, không chứa ký tự xuống dòng khác (CR, U+2028, U+2029 cũng kết thúc ghi chú `//` trong JS ⇒ phần sau thành mã chạy được mà hash thân không thấy).
  for (const d of dong.slice(0, 3)) assert.match(d, /^\/\/[^\r\u2028\u2029]*$/, `dòng đầu không phải ghi chú một dòng: ${d.slice(0, 60)}`);
  const than = dong.slice(3).join("\n");
  assert.equal(createHash("sha256").update(than).digest("hex"), HASH_THAN, "thân web/vendor/qrcode.js đã bị đổi: chép lại nguyên bản gốc, hoặc (nâng phiên bản) cập nhật HASH_THAN sau khi đọc hết lại");
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

test("chỉ web/qr-ve.ts nhắc tới bộ vẽ (quét đệ quy web/ kể cả web/sw/ và src/, mọi loại tệp; bắt cả tệp bọc xuất lại)", () => {
  const dung = [...moiTep(join(GOC, "web")), ...moiTep(join(GOC, "src"))]
    .filter((rel) => rel !== "src/vendor-qr.test.ts") // chính bài này phải viết ra chữ cần tìm
    .filter((rel) => /vendor\/qrcode/.test(readFileSync(join(GOC, rel), "utf8")));
  assert.deepEqual(dung, ["web/qr-ve.ts"]);
  // Thư mục vendor không có tệp thứ ba (một tệp bọc đặt ngay trong đó sẽ lọt khỏi bài quét ở trên).
  assert.deepEqual(readdirSync(join(GOC, "web/vendor")).sort(), ["qrcode.d.ts", "qrcode.js"]);
});

test("không thêm bộ vẽ vào package.json (mọi mục khai phụ thuộc, kể cả peerDependencies và overrides)", () => {
  const text = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  const pkg = JSON.parse(text) as Record<string, Record<string, unknown> | undefined>;
  for (const k of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies", "overrides", "resolutions"]) assert.ok(!pkg[k]?.["qrcode-generator"], k);
  assert.doesNotMatch(text, /qrcode/i, "package.json không nhắc tới bộ vẽ ở bất cứ chỗ nào (kể cả override lồng nhau)");
});
