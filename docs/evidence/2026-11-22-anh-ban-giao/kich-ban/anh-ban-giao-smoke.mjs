// Kịch bản Chrome ADR-0232 (22/11) — «Ảnh bàn giao» ở trang chi tiết đơn: Bán hàng chọn ảnh qua ô tệp THẬT (máy nén JPEG ở trình duyệt) rồi «Gửi ảnh»; «Xem 1 ảnh»
// hiện lưới ảnh nhỏ; bấm ảnh mở bảng xem ảnh lớn; Kế toán chỉ xem (không có form gửi); Toàn quyền thấy «Ẩn ảnh», «Xoá hẳn ảnh». Khổ 390 và 1040. D1 tạm, không chạm production.
// Chạy từ gốc repo sau `npm run build:web`: AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh, ngoài kho>
//   node docs/evidence/2026-11-22-anh-ban-giao/kich-ban/anh-ban-giao-smoke.mjs
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
const W = process.cwd();
const L = await import(`${W}/docs/evidence/2026-10-30-luat-ban-dac-diem/kich-ban/lb-chung.mjs`);
const { ACCOUNTS, KHO, axeKiem, bam, bocucSach, buoc, chup, choHop, goiApi, ketThuc, sleep, startEnv, taoMoTrang } = L;

/** PNG 640×480 dải màu (trông như ảnh chụp) — máy nén ở trình duyệt đổi sang JPEG hai cỡ. */
const png = (() => {
  const crc = (buf) => { let c = ~0; for (const x of buf) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
  const khoi = (loai, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(loai), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const w = 640, hh = 480;
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(hh, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * hh);
  for (let y = 0; y < hh; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = (x * 255) / w; raw[o + 1] = 120 + (y * 100) / hh; raw[o + 2] = 200 - (x * 120) / w; }
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), khoi("IHDR", ihdr), khoi("IDAT", deflateSync(raw)), khoi("IEND", Buffer.alloc(0))]);
})();
const TEP = join(mkdtempSync(join(tmpdir(), "anh-ban-giao-smoke-")), "giao-ve.png");
writeFileSync(TEP, png);
const datTep = async (p, sel) => {
  const doc = await p.send("DOM.getDocument", { depth: -1 });
  const q = await p.send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: sel });
  await p.send("DOM.setFileInputFiles", { nodeId: q.result.nodeId, files: [TEP] });
  await p.ev(`document.querySelector(${JSON.stringify(sel)}).dispatchEvent(new Event('change', { bubbles: true })), true`);
};

const env = await startEnv();
try {
  const { call, lapDon } = goiApi(env);
  const cs = await call(ACCOUNTS.chu, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: "THỬ ảnh bàn giao", noiDung: "THỬ — toàn văn, không phải văn bản pháp lý.", soNamGiuAnh: 5 });
  assert.equal(cs.status, 201, JSON.stringify(cs.json));
  const moTrang = taoMoTrang(env);

  for (const [kho, vp] of KHO) {
    const don = await lapDon(`Khách Ảnh Bàn Giao ${kho}`, kho === "390" ? "0913570390" : "0913571040", 2);
    const duong = `/order?id=${don.id}`;
    let p = await moTrang(ACCOUNTS.salesA, duong, vp);
    await buoc(`${kho}.1`, "Bán hàng: khối Ảnh bàn giao chưa có ảnh, có form gửi", async () => {
      await p.waitFor("!!document.querySelector('#anh-ban-giao:not([hidden]) .abg-form')", "khối Ảnh bàn giao có form");
      await p.ev("document.getElementById('anh-ban-giao').scrollIntoView(), true");
      await chup(p, `${kho}-1-chua-co-anh`, false);
    });
    await buoc(`${kho}.2`, "Bán hàng chọn ảnh, bấm «Gửi ảnh» ⇒ khối làm mới, có nút «Xem 1 ảnh»", async () => {
      await datTep(p, "#anh-ban-giao input[type=file]");
      assert.equal(await bam(p, "#anh-ban-giao .abg-form button"), true);
      await p.waitFor("[...document.querySelectorAll('#anh-ban-giao button')].some((b) => b.textContent === 'Xem 1 ảnh')", "nút Xem 1 ảnh");
      assert.equal(await p.ev("[...document.querySelectorAll('#anh-ban-giao button')].find((b) => b.textContent === 'Xem 1 ảnh').click(), true"), true);
      await p.waitFor("!!document.querySelector('#anh-ban-giao .abg-the img')", "lưới ảnh nhỏ");
      await sleep(300);
      await p.ev("document.getElementById('anh-ban-giao').scrollIntoView(), true");
      await chup(p, `${kho}-2-da-gui-luoi`, false);
      await axeKiem(p, `${kho} khối ảnh bàn giao`);
      await bocucSach(p, `${kho} trang đơn có ảnh bàn giao`);
    });
    await buoc(`${kho}.3`, "Bấm ảnh nhỏ ⇒ bảng xem ảnh lớn (Bán hàng không có nút ẩn / xoá)", async () => {
      assert.equal(await bam(p, "#anh-ban-giao .abg-the"), true);
      await choHop(p);
      await p.waitFor("(() => { const i = document.querySelector('.sheet img.abg-lon'); return !!i && i.complete && i.naturalWidth > 0; })()", "ảnh lớn tải xong");
      assert.equal(await p.ev("[...document.querySelectorAll('.sheet button')].some((b) => /Ẩn ảnh|Xoá hẳn ảnh/.test(b.textContent))"), false);
      await chup(p, `${kho}-3-anh-lon`, false);
    });
    await p.close?.();

    p = await moTrang(ACCOUNTS.accounting, duong, vp);
    await buoc(`${kho}.4`, "Kế toán: thấy «Xem 1 ảnh», KHÔNG có form gửi", async () => {
      await p.waitFor("!!document.querySelector('#anh-ban-giao:not([hidden])')", "khối Ảnh bàn giao");
      assert.equal(await p.ev("!!document.querySelector('#anh-ban-giao .abg-form')"), false);
      await p.ev("document.getElementById('anh-ban-giao').scrollIntoView(), true");
      await chup(p, `${kho}-4-ke-toan`, false);
    });
    await p.close?.();

    p = await moTrang(ACCOUNTS.chu, duong, vp);
    await buoc(`${kho}.5`, "Toàn quyền: bảng xem ảnh có «Ẩn ảnh», «Xoá hẳn ảnh»; bấm «Xoá hẳn ảnh» lần đầu chỉ hỏi lại", async () => {
      await p.waitFor("[...document.querySelectorAll('#anh-ban-giao button')].some((b) => b.textContent === 'Xem 1 ảnh')", "nút Xem 1 ảnh");
      await p.ev("[...document.querySelectorAll('#anh-ban-giao button')].find((b) => b.textContent === 'Xem 1 ảnh').click(), true");
      await p.waitFor("!!document.querySelector('#anh-ban-giao .abg-the')", "lưới");
      assert.equal(await bam(p, "#anh-ban-giao .abg-the"), true);
      await choHop(p);
      const nut = await p.ev("[...document.querySelectorAll('.sheet button')].map((b) => b.textContent).join('|')");
      assert.match(nut, /Ẩn ảnh/);
      assert.match(nut, /Xoá hẳn ảnh/);
      assert.equal(await p.ev("[...document.querySelectorAll('.sheet button')].find((b) => b.textContent === 'Xoá hẳn ảnh').click(), true"), true);
      await p.waitFor("[...document.querySelectorAll('.sheet button')].some((b) => b.textContent === 'Bấm lần nữa để xoá hẳn')", "hỏi lại");
      await chup(p, `${kho}-5-toan-quyen`, false);
      await axeKiem(p, `${kho} bảng xem ảnh của Toàn quyền`);
    });
    await p.close?.();
  }
} finally {
  await env.stop?.();
}
ketThuc("ANH BAN GIAO");
