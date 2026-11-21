// Đọc mã QR ở trang Quét vé (web/qr-doc-ve.ts) — Việc 9, 21/11/2026: ảnh chụp 12 MP của iPhone được thu nhỏ trước khi đọc (không đứng hình);
// khung camera chỉ đọc mã đen trên nền trắng (một lượt, không đảo màu) để mỗi ¼ giây đọc nhanh gấp đôi.
import assert from "node:assert/strict";
import { test } from "node:test";
import qrcode from "../web/vendor/qrcode.js";
import { CANH_ANH_QUET, coDoc, docQrTuKhung } from "../web/qr-doc-ve.ts";

/** Vẽ chuỗi thành khung RGBA (đen trên trắng, hoặc đảo màu): mỗi ô `co` điểm ảnh, lề 4 ô. */
function khung(chuoi: string, daoMau = false, co = 4): { data: Uint8ClampedArray; width: number; height: number; colorSpace: "srgb" } {
  const qr = qrcode(0, "M");
  qr.addData(chuoi, "Byte");
  qr.make();
  const so = qr.getModuleCount();
  const canh = (so + 8) * co;
  const nen = daoMau ? 0 : 255;
  const data = new Uint8ClampedArray(canh * canh * 4).fill(nen);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  for (let r = 0; r < so; r++) for (let c = 0; c < so; c++) {
    if (!qr.isDark(r, c)) continue;
    for (let y = 0; y < co; y++) for (let x = 0; x < co; x++) {
      const o = ((r + 4) * co + y) * canh * 4 + ((c + 4) * co + x) * 4;
      data[o] = data[o + 1] = data[o + 2] = 255 - nen;
    }
  }
  return { data, width: canh, height: canh, colorSpace: "srgb" };
}

test("coDoc: ảnh lớn thu nhỏ theo cạnh dài, giữ tỉ lệ; ảnh nhỏ hoặc không đặt trần thì giữ nguyên", () => {
  assert.deepEqual(coDoc(4032, 3024, 1280), { rong: 1280, cao: 960 });
  assert.deepEqual(coDoc(3024, 4032, 1280), { rong: 960, cao: 1280 });
  assert.deepEqual(coDoc(800, 600, 1280), { rong: 800, cao: 600 });
  assert.deepEqual(coDoc(4032, 3024), { rong: 4032, cao: 3024 });
  assert.ok(CANH_ANH_QUET >= 1000 && CANH_ANH_QUET <= 2048);
});

test("docQrTuKhung: đọc mã đen trên trắng; KHÔNG thử đảo màu (mã trắng trên đen trả null)", () => {
  const ma = "TD1.ABCDEFGHJKMNPQRSTVWXYZ01";
  assert.equal(docQrTuKhung(khung(ma) as unknown as ImageData), ma);
  assert.equal(docQrTuKhung(khung(ma, true) as unknown as ImageData), null);
});
