// Luật THUẦN của kho tệp hồ sơ (ADR-0123 đ2, đ3; Hiến chương 5.22): nhận loại theo CHỮ KÝ thật, giải base64 chặt, trần 10 MB sau giải mã, khoá kho ngẫu nhiên,
// header phản hồi tải xuống. Mã MỚI (khuôn ADR-0041 chưa từng có mã thật) — mỗi ca một dòng tiêu chí.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DO_DANG_SAU_MS, LOAI_NOI_DUNG, TOI_DA_BASE64, TOI_DA_BYTE, TOI_DA_THAN, bamSha256, dauPhanHoiTep, giaiBase64, khoaNgauNhien, kiemTepTaiLen, nhanLoaiTep,
} from "./tep.ts";

const b = (...x: number[]) => new Uint8Array(x);
const ascii = (s: string) => new TextEncoder().encode(s);
const ghep = (...p: Uint8Array[]) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };
const PNG = b(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const heif = (nhan: string) => ghep(b(0, 0, 0, 0x18), ascii("ftyp"), ascii(nhan), b(0, 0, 0, 0));
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");

test("hằng số: 10 MB; trần base64 = 4·⌈10 MB/3⌉; trần thân = trần base64 + 1024; dở dang sau 10 phút", () => {
  assert.equal(TOI_DA_BYTE, 10 * 1024 * 1024);
  assert.equal(TOI_DA_BASE64, Math.ceil(TOI_DA_BYTE / 3) * 4);
  assert.equal(TOI_DA_THAN, TOI_DA_BASE64 + 1024);
  assert.equal(DO_DANG_SAU_MS, 10 * 60 * 1000);
});

test("nhanLoaiTep: JPG, PNG, PDF, HEIC theo chữ ký; HTML, SVG, GIF, ZIP, AVIF, chuỗi HEIF và rỗng → null", () => {
  assert.equal(nhanLoaiTep(b(0xff, 0xd8, 0xff, 0xe0, 0, 0)), "jpg");
  assert.equal(nhanLoaiTep(ghep(PNG, b(0, 0, 0, 0x0d))), "png");
  assert.equal(nhanLoaiTep(ascii("%PDF-1.7\n")), "pdf");
  for (const nhan of ["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1"]) assert.equal(nhanLoaiTep(heif(nhan)), "heic", `HEIF nhãn ${nhan}`);
  for (const [ten, dau] of [
    ["HTML", ascii("<!DOCTYPE html><html>")],
    ["HTML có khoảng trắng đầu", ascii("  <html><script>")],
    ["SVG", ascii("<?xml version=\"1.0\"?><svg")],
    ["SVG trơn", ascii("<svg xmlns=")],
    ["GIF", ascii("GIF89a")],
    ["ZIP / DOCX", b(0x50, 0x4b, 0x03, 0x04)],
    ["AVIF", heif("avif")],
    ["chuỗi ảnh HEIF", heif("msf1")],
    ["PDF lệch byte đầu", ascii(" %PDF-1.7")],
    ["PNG thiếu byte", PNG.subarray(0, 7)],
    ["rỗng", new Uint8Array(0)],
  ] as const) assert.equal(nhanLoaiTep(dau), null, ten);
});

test("giaiBase64: chỉ nhận base64 chuẩn, độ dài chia hết cho 4; data:, khoảng trắng, ký tự lạ, rỗng, không phải chuỗi → null", () => {
  assert.deepEqual(giaiBase64(b64(b(1, 2, 3, 4))), b(1, 2, 3, 4));
  for (const x of ["", "AAA", "AA AA", "data:image/png;base64,AAAA", "AA-_", "====", 42, null, undefined, {}]) assert.equal(giaiBase64(x), null, String(x));
});

test("kiemTepTaiLen: đúng 10 MB qua; 10 MB + 1 byte → 413; chuỗi dài hơn trần base64 → 413 (không giải); HTML → 415 câu tiếng Việt; thiếu → 400", () => {
  const vua = new Uint8Array(TOI_DA_BYTE); vua.set(PNG);
  const k1 = kiemTepTaiLen({ noiDung: b64(vua) });
  assert.equal(k1.ok, true);
  if (k1.ok) { assert.equal(k1.loai, "png"); assert.equal(k1.bytes.length, TOI_DA_BYTE); }
  const qua = new Uint8Array(TOI_DA_BYTE + 1); qua.set(PNG);
  const k2 = kiemTepTaiLen({ noiDung: b64(qua) });
  assert.deepEqual(k2.ok ? null : [k2.status, k2.code], [413, "file_too_large"]);
  const k3 = kiemTepTaiLen({ noiDung: "A".repeat(TOI_DA_BASE64 + 4) });
  assert.deepEqual(k3.ok ? null : [k3.status, k3.code], [413, "file_too_large"]);
  const k4 = kiemTepTaiLen({ noiDung: b64(ascii("<html><script>alert(1)</script></html>")) });
  assert.deepEqual(k4.ok ? null : [k4.status, k4.code, k4.message], [415, "unsupported_file_type", "Chỉ nhận ảnh JPG, PNG, HEIC hoặc tệp PDF."]);
  for (const body of [null, {}, { noiDung: "" }, { noiDung: "@@@@" }, { noiDung: 5 }]) {
    const k = kiemTepTaiLen(body as Record<string, unknown> | null);
    assert.deepEqual(k.ok ? null : [k.status, k.code], [400, "invalid_input"], JSON.stringify(body));
  }
});

test("khoaNgauNhien: pty/ + 32 hex thường, không lặp lại; không chứa gì khác", () => {
  const ds = new Set(Array.from({ length: 200 }, () => khoaNgauNhien()));
  assert.equal(ds.size, 200);
  for (const k of ds) assert.match(k, /^pty\/[0-9a-f]{32}$/);
});

test("bamSha256: SHA-256 hex thường (vector chuẩn của chuỗi 'abc')", async () => {
  assert.equal(await bamSha256(ascii("abc")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("dauPhanHoiTep: no-store, nosniff, CSP sandbox, CORP same-origin; ảnh inline, PDF attachment; tên tải về không mang tên gốc", () => {
  const anh = dauPhanHoiTep({ id: "0123abcd-1111-4111-8111-111111111111", loai: "png" });
  assert.equal(anh["cache-control"], "no-store");
  assert.equal(anh["x-content-type-options"], "nosniff");
  assert.equal(anh["content-security-policy"], "default-src 'none'; sandbox");
  assert.equal(anh["cross-origin-resource-policy"], "same-origin");
  assert.equal(anh["content-type"], "image/png");
  assert.equal(anh["content-disposition"], 'inline; filename="giay-to-0123abcd.png"');
  const pdf = dauPhanHoiTep({ id: "0123abcd-1111-4111-8111-111111111111", loai: "pdf" });
  assert.equal(pdf["content-disposition"], 'attachment; filename="giay-to-0123abcd.pdf"');
  assert.deepEqual(LOAI_NOI_DUNG, { jpg: "image/jpeg", png: "image/png", heic: "image/heic", pdf: "application/pdf" });
});
