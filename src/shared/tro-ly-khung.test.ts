// Luật thuần vị trí / cỡ khung "Hỗ trợ" (kế hoạch docs/superpowers/plans/2026-10-01-khung-tro-ly-keo-doi-co.md, tiêu chí 7).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CO_NHO, LE, docViTri, doiCo, ghiViTri, hopTuViTri, kep, keo, macDinh, viTriTuHop, type Hop, type KhungNhin, type VungAnToan,
} from "./tro-ly-khung.ts";

const AT0: VungAnToan = { tren: 0, phai: 0, duoi: 0, trai: 0 };
const kn = (w: number, h: number, x = 0, y = 0): KhungNhin => ({ x, y, w, h });
/** Hộp nằm trọn trong khung nhìn, chừa lề LE (và vùng an toàn). */
function trongKhung(b: Hop, k: KhungNhin, at: VungAnToan = AT0): void {
  assert.ok(b.x >= k.x + Math.max(LE, at.trai), `trái ${b.x}`);
  assert.ok(b.y >= k.y + Math.max(LE, at.tren), `trên ${b.y}`);
  assert.ok(b.x + b.w <= k.x + k.w - Math.max(LE, at.phai), `phải ${b.x + b.w} > ${k.w}`);
  assert.ok(b.y + b.h <= k.y + k.h - Math.max(LE, at.duoi), `dưới ${b.y + b.h} > ${k.h}`);
}

// Nút "Hỗ trợ" ở góc phải dưới: điện thoại (có thanh tab) đỉnh nút ≈ h − 120; máy tính ≈ h − 68. Khung chừa khoảng đó ở đáy.
const KHO = [
  { w: 320, h: 568, chuaDay: 128 },
  { w: 390, h: 844, chuaDay: 128 },
  { w: 768, h: 1024, chuaDay: 76 },
  { w: 1040, h: 800, chuaDay: 76 },
  { w: 1440, h: 900, chuaDay: 76 },
];

test("mặc định: góc phải dưới ở 5 khổ, trên nút Hỗ trợ, trong khung nhìn", () => {
  for (const k of KHO) {
    const vn = kn(k.w, k.h);
    const b = hopTuViTri(macDinh(vn, AT0, k.chuaDay, 16), vn, AT0);
    trongKhung(b, vn);
    assert.equal(b.x + b.w, k.w - 16, `${k.w}: mép phải thẳng mép phải nút`);
    assert.equal(b.y + b.h, k.h - k.chuaDay, `${k.w}: đáy khung ngay trên nút`);
    assert.ok(b.x + b.w / 2 > k.w / 2 || b.w > k.w * 0.8, `${k.w}: nằm nửa phải`);
    assert.ok(b.y + b.h / 2 > k.h / 2 - 1 || b.h > k.h * 0.5, `${k.w}: nằm nửa dưới`);
  }
});

test("mặc định ở 390×844: cao ≤ nửa chiều cao, diện tích < nửa màn", () => {
  const vn = kn(390, 844);
  const b = hopTuViTri(macDinh(vn, AT0, 128, 16), vn, AT0);
  assert.ok(b.h <= 422, `cao ${b.h}`);
  assert.ok(b.w * b.h < (390 * 844) / 2, `diện tích ${b.w * b.h}`);
  assert.ok(b.w >= CO_NHO.w && b.h >= CO_NHO.h);
});

test("mặc định chừa vùng an toàn iPhone (tai thỏ, thanh home)", () => {
  const at: VungAnToan = { tren: 47, phai: 0, duoi: 34, trai: 0 };
  const vn = kn(390, 844);
  const b = hopTuViTri(macDinh(vn, at, 160, 16), vn, at);
  trongKhung(b, vn, at);
  // Nằm ngang: tai thỏ ở bên phải.
  const ngang = kn(844, 390);
  const atN: VungAnToan = { tren: 0, phai: 47, duoi: 21, trai: 47 };
  const bn = hopTuViTri(macDinh(ngang, atN, 76, 47), ngang, atN);
  trongKhung(bn, ngang, atN);
});

test("kẹp: hộp ra ngoài khung nhìn bị kéo vào, chừa lề LE", () => {
  const vn = kn(390, 844);
  const b = kep({ x: -200, y: -50, w: 300, h: 400 }, vn, AT0);
  assert.deepEqual(b, { x: LE, y: LE, w: 300, h: 400 });
  const c = kep({ x: 900, y: 2000, w: 300, h: 400 }, vn, AT0);
  assert.deepEqual(c, { x: 390 - LE - 300, y: 844 - LE - 400, w: 300, h: 400 });
});

test("kéo: dời theo dx/dy rồi kẹp; kéo quá mép bị giữ lại", () => {
  const vn = kn(1040, 800);
  const b0: Hop = { x: 600, y: 300, w: 360, h: 400 };
  assert.deepEqual(keo(b0, -100, -50, vn, AT0), { x: 500, y: 250, w: 360, h: 400 });
  assert.deepEqual(keo(b0, 5000, 5000, vn, AT0), { x: 1040 - LE - 360, y: 800 - LE - 400, w: 360, h: 400 });
  assert.deepEqual(keo(b0, -5000, -5000, vn, AT0), { x: LE, y: LE, w: 360, h: 400 });
});

test("đổi cỡ bằng tay nắm trên-trái: góc phải dưới đứng yên; nhỏ nhất / lớn nhất", () => {
  const vn = kn(1040, 800);
  const b0: Hop = { x: 600, y: 300, w: 360, h: 400 };
  const to = doiCo(b0, -100, -60, vn, AT0);
  assert.deepEqual(to, { x: 500, y: 240, w: 460, h: 460 });
  const nho = doiCo(b0, 1000, 1000, vn, AT0);
  assert.deepEqual(nho, { x: 960 - CO_NHO.w, y: 700 - CO_NHO.h, w: CO_NHO.w, h: CO_NHO.h }, "không nhỏ hơn cỡ nhỏ nhất");
  const lon = doiCo(b0, -5000, -5000, vn, AT0);
  assert.deepEqual(lon, { x: LE, y: LE, w: 960 - LE, h: 700 - LE }, "không vượt khung nhìn");
});

test("khung nhìn nhỏ hơn cỡ nhỏ nhất (320×568 lúc bàn phím mở): cỡ lớn nhất thắng, vẫn trong khung", () => {
  const vn = kn(320, 290);
  const b = kep({ x: 8, y: 8, w: 400, h: 500 }, vn, AT0);
  trongKhung(b, vn);
  assert.equal(b.w, 320 - 2 * LE);
  assert.equal(b.h, 290 - 2 * LE);
  const r = doiCo({ x: 8, y: 8, w: 304, h: 274 }, 50, 50, vn, AT0);
  trongKhung(r, vn);
});

test("bàn phím ảo làm khung nhìn co: đáy khung vẫn trong khung nhìn (ô gõ không bị khuất)", () => {
  const day = kn(390, 844);
  const v = macDinh(day, AT0, 128, 16);
  const coLai = kn(390, 500); // visualViewport khi bàn phím mở
  const b = hopTuViTri(v, coLai, AT0);
  trongKhung(b, coLai);
  // Khung nhìn bị cuộn (offsetTop > 0): hộp theo khung nhìn đang thấy.
  const cuon = kn(390, 500, 0, 120);
  const c = hopTuViTri(v, cuon, AT0);
  trongKhung(c, cuon);
});

test("xoay máy: vị trí lưu theo mép phải / mép dưới ⇒ vẫn ở góc phải dưới", () => {
  const doc = kn(390, 844);
  const b = hopTuViTri(macDinh(doc, AT0, 128, 16), doc, AT0);
  const v = viTriTuHop(b, doc);
  const ngang = kn(844, 390);
  const n = hopTuViTri(v, ngang, AT0);
  trongKhung(n, ngang);
  assert.equal(n.x + n.w, 844 - 16);
});

test("lưu rồi đọc lại được đúng; giá trị hỏng ⇒ null (dùng mặc định)", () => {
  const v = { phai: 16, day: 128, w: 360, h: 400 };
  assert.deepEqual(docViTri(ghiViTri(v)), v);
  for (const hong of [null, "", "{", "null", "[]", "42", '{"phai":1}', '{"phai":"a","day":1,"w":1,"h":1}', '{"phai":1,"day":1,"w":-5,"h":300}',
    '{"phai":1,"day":1,"w":1e9,"h":300}', '{"phai":NaN}', '{"phai":-9999,"day":1,"w":300,"h":300}']) {
    assert.equal(docViTri(hong), null, String(hong));
  }
});
