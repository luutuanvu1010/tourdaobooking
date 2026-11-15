import { test } from "node:test";
import assert from "node:assert/strict";
import { ANH_TOI_DA_BYTE, TOI_DA_THAN_ANH, duongAnhDichVu, kiemAnhDichVu } from "./anh-dich-vu.ts";
import { doDaiBase64 } from "./tep-dinh-kem.ts";

const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const PDF = new TextEncoder().encode("%PDF-1.7 tệp thử nghiệm....");

test("nhận ảnh JPG và PNG theo chữ ký thật", () => {
  const j = kiemAnhDichVu({ noiDung: b64(JPG) });
  assert.equal(j.ok && j.tep?.loai, "jpg");
  const p = kiemAnhDichVu({ noiDung: b64(PNG) });
  assert.equal(p.ok && p.tep?.loai, "png");
});

test("noiDung null = gỡ ảnh đại diện", () => {
  assert.deepEqual(kiemAnhDichVu({ noiDung: null }), { ok: true, tep: null });
});

test("PDF, HEIC hay chữ ký lạ → 415; base64 hỏng / hình dạng sai → 400", () => {
  const pdf = kiemAnhDichVu({ noiDung: b64(PDF) });
  assert.equal(!pdf.ok && pdf.status, 415);
  for (const sai of [null, undefined, [], "x", {}, { noiDung: 5 }, { noiDung: "không phải base64!" }, { noiDung: "" }]) {
    const r = kiemAnhDichVu(sai);
    assert.equal(!r.ok && r.status, 400, JSON.stringify(sai));
  }
});

test("quá 1 MB → 413, kể cả trước khi giải (đo chuỗi)", () => {
  const to = new Uint8Array(ANH_TOI_DA_BYTE + 1);
  to.set(JPG);
  const r = kiemAnhDichVu({ noiDung: b64(to) });
  assert.equal(!r.ok && r.status, 413);
  const dai = kiemAnhDichVu({ noiDung: "A".repeat(doDaiBase64(ANH_TOI_DA_BYTE) + 4) });
  assert.equal(!dai.ok && dai.status, 413);
  assert.ok(TOI_DA_THAN_ANH > doDaiBase64(ANH_TOI_DA_BYTE));
});

test("đường xem ảnh mang dấu phiên bản để trình duyệt không giữ ảnh cũ", () => {
  assert.equal(duongAnhDichVu("ZA1", "anh/0123456789abcdef0123456789abcdef"), "/api/catalog/ZA1/anh?v=0123456789ab");
  assert.equal(duongAnhDichVu("A B", "anh/ff"), "/api/catalog/A%20B/anh?v=ff");
});
