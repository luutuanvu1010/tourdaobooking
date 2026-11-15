// Kịch bản Chrome + axe — CA BIÊN LAI của QR thanh toán (ADR-0196, Đợt 6A, 2026-11-11). Tách khỏi qr-smoke.mjs vì cần tài khoản Đối tác (khung dp-lib dựng thêm tài khoản)
// và vì bước B/C của qr-smoke.mjs đang đỏ sẵn (ghi đầu tệp đó) — ca biên lai phải chạy tới được. Hai khổ 390 và 1280. D1 local tạm, tên / SĐT GIẢ.
//   1. Đối tác mở đơn đã xác nhận, «Ghi khoản thu»: chọn «Công ty» + «Chuyển khoản» ⇒ hiện ô «Ảnh biên lai chuyển khoản»; chọn tiền mặt ⇒ ẩn.
//   2. Lưu khi CHƯA chọn ảnh ⇒ câu «Chọn ảnh biên lai…», chưa gửi gì (không khoản thu mới).
//   3. Chọn ảnh PNG ⇒ lưu được, báo «chờ Kế toán xác nhận»; dòng khoản thu có «Xem biên lai» (Đối tác chính chủ); không tràn ngang; axe.
//   4. Kế toán mở đơn: dòng khoản thu có «Xem biên lai» cạnh «Xác nhận đã nhận»; liên kết mở ảnh 200 image/png; không lộ khoá kho; axe.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-08-qr-thanh-toan node docs/evidence/2026-10-08-qr-thanh-toan/kich-ban/bien-lai-smoke.mjs
// Ảnh ghi vào <OUT>/anh-bien-lai/. Trang dùng chung kho cookie: mỗi trang đóng trước khi mở trang của tài khoản khác.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { deflateSync } from "node:zlib";
import { CHU, MOB, OUT, assert, axe, axeNote, boDem, dungMoiTruong, noOverflowX, sleep, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const DT = { name: "Đối Tác Biên Lai", phone: "0900000741", pin: "246741", permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" };
const KT = { name: "Kế Toán Biên Lai", phone: "0900000742", pin: "246742", permissions: ["ACCOUNTING"] };
const RONG = { width: 1280, height: 860, mobile: false };
const KHUNG = [["390", MOB], ["1280", RONG]];
const { env, call } = await dungMoiTruong([CHU, DT, KT]);
const b = boDem("BIEN LAI CHUYEN KHOAN");
const ANH = join(OUT, "anh-bien-lai");
mkdirSync(ANH, { recursive: true });
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);

/** PNG thật 40×20 màu xám (trình duyệt giải được ⇒ đi đường thu nhỏ ra JPG). */
function pngThat() {
  const crc = (buf) => { let c = ~0; for (const x of buf) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
  const khoi = (loai, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(loai), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const w = 40, h = 20;
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h, 0x88); for (let y = 0; y < h; y++) raw[y * (w * 3 + 1)] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), khoi("IHDR", ihdr), khoi("IDAT", deflateSync(raw)), khoi("IEND", Buffer.alloc(0))]);
}
const TEP_ANH = join(mkdtempSync(join(tmpdir(), "bien-lai-")), "bien-lai.png");
writeFileSync(TEP_ANH, pngThat());

const chup = async (p, ten, khung) => {
  await sleep(400);
  const cao = await p.ev("Math.ceil(document.documentElement.scrollHeight)");
  const dat = (hh) => p.send("Emulation.setDeviceMetricsOverride", { width: khung.width, height: hh, deviceScaleFactor: khung.mobile ? 2 : 1, mobile: khung.mobile });
  await dat(Math.max(khung.height, cao));
  await sleep(350);
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(ANH, `${ten}.png`), Buffer.from(r.result.data, "base64"));
  await dat(khung.height);
  await sleep(200);
};
const chon = (sel, v) => `(() => { const s = document.querySelector(${JSON.stringify(sel)}); s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
const hien = (sel) => `((e) => !!e && e.getClientRects().length > 0)(document.querySelector(${JSON.stringify(sel)}))`;
const soKhoan = (id) => Number(env.sql(`SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = '${id}'`)?.[0]?.n ?? NaN);

// ---- Dữ liệu (API, chưa mở trang nào): mỗi khổ một đơn của Đối tác, gửi đơn ⇒ đã xác nhận (dịch vụ không cần xét).
dung(await call(CHU, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: "TD101", canXacNhan: false }), 200, "tắt cờ xét");
const donTheoKho = new Map();
for (const [kho] of KHUNG) {
  const r = await call(DT, "POST", "/api/orders", {
    customerName: `Khách Biên Lai ${kho}`, customerPhone: "0903741" + kho.padStart(3, "0").slice(-3), customerEmail: "", customerNote: "", discount: 0, paymentNote: "", passengers: [],
    services: [{ kind: "catalog", catalogCode: "TD101", pickupChoice: "KHONG_DON", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, departDate: vnDate(4), legs: [] }],
  });
  dung(r, 201, `lập đơn ${kho}`);
  dung(await call(DT, "POST", `/api/orders/${r.json.order.id}/gui-don`, {}), 200, `gửi đơn ${kho}`);
  donTheoKho.set(kho, r.json.order);
}

for (const [kho, khung] of KHUNG) {
  const don = donTheoKho.get(kho);
  // ---- Đối tác ----
  let p = await env.as(DT, `/order?id=${don.id}`, khung);
  await p.waitFor(`!!document.querySelector('[data-action="ghi-lan-thu"]')`, "nút Ghi khoản thu");
  await p.ev(`document.querySelector('[data-action="ghi-lan-thu"]').click(), true`);
  await p.waitFor(`!!document.querySelector('[data-khoi="form-lan-thu"]')`, "form khoản thu");
  await b.step(`${kho}-1`, `${kho}: Đối tác chọn «Công ty» + «Chuyển khoản» ⇒ hiện ô «Ảnh biên lai chuyển khoản»; tiền mặt ⇒ ẩn`, async () => {
    await p.ev(chon("#lan-thu-nguoi-thu", "cong_ty"));
    await p.ev(chon('[data-khoi="form-lan-thu"] select', "BANK_TRANSFER"));
    await sleep(150);
    assert.equal(await p.ev(hien('[data-khoi="bien-lai"]')), true, "ô ảnh hiện");
    assert.match(await p.ev(`document.querySelector('[data-khoi="bien-lai"]').innerText`), /Ảnh biên lai chuyển khoản/);
    await p.ev(chon('[data-khoi="form-lan-thu"] select', "CASH"));
    await sleep(150);
    assert.equal(await p.ev(hien('[data-khoi="bien-lai"]')), false, "tiền mặt: ô ảnh ẩn");
    await p.ev(chon('[data-khoi="form-lan-thu"] select', "BANK_TRANSFER"));
  });
  await b.step(`${kho}-2`, `${kho}: lưu khi CHƯA chọn ảnh ⇒ câu «Chọn ảnh biên lai…», không khoản thu mới`, async () => {
    const truoc = soKhoan(don.id);
    await p.ev(`(() => { const o = document.querySelector('[data-khoi="form-lan-thu"] input[inputmode="numeric"]'); o.value = '300000'; o.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    await p.ev(`document.querySelector('[data-khoi="form-lan-thu"] button[type="submit"]').click(), true`);
    await sleep(500);
    assert.equal(await p.ev(`document.body.innerText.includes('Chọn ảnh biên lai chuyển khoản trước khi lưu')`), true);
    assert.equal(soKhoan(don.id), truoc);
    await chup(p, `01-thieu-anh-${kho}`, khung);
  });
  await b.step(`${kho}-3`, `${kho}: chọn ảnh PNG ⇒ lưu, báo chờ Kế toán; dòng khoản thu có «Xem biên lai»; không tràn ngang${axeNote()}`, async () => {
    const doc = await p.send("DOM.getDocument", { depth: -1 });
    const q = await p.send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: "#lan-thu-bien-lai" });
    await p.send("DOM.setFileInputFiles", { nodeId: q.result.nodeId, files: [TEP_ANH] });
    await chup(p, `02-da-chon-anh-${kho}`, khung);
    await p.ev(`document.querySelector('[data-khoi="form-lan-thu"] button[type="submit"]').click(), true`);
    await p.waitFor(`!!document.querySelector('[data-action="xem-bien-lai"]')`, "nút Xem biên lai sau khi lưu");
    assert.equal(await p.ev(`document.body.innerText.includes('chờ Kế toán xác nhận')`), true);
    const d = env.sql(`SELECT p.content_kind, p.stored_at FROM bil_receipt_proof p JOIN bil_payment_receipt r ON r.id = p.receipt_id WHERE r.order_id = '${don.id}'`);
    assert.equal(d.length, 1);
    assert.equal(d[0].content_kind, "jpg", "ảnh mở được ⇒ thu nhỏ ra JPG trên máy (bỏ thông tin ẩn)");
    assert.ok(d[0].stored_at);
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `03-doi-tac-da-gui-${kho}`, khung);
    await axe(p, `trang đơn Đối tác ${kho}`);
  });
  p.close();
  // ---- Kế toán ----
  p = await env.as(KT, `/order?id=${don.id}`, khung);
  await p.waitFor(`!!document.querySelector('[data-action="xem-bien-lai"]')`, "Kế toán thấy Xem biên lai");
  await b.step(`${kho}-4`, `${kho}: Kế toán thấy «Xem biên lai» cạnh «Xác nhận đã nhận»; liên kết mở ảnh 200 image/jpeg; không khoá kho trên trang${axeNote()}`, async () => {
    const li = `document.querySelector('[data-action="xem-bien-lai"]').closest('li')`;
    assert.equal(await p.ev(`${li}.innerText.includes('Xác nhận đã nhận')`), true, "cùng dòng với nút xác nhận");
    const kq = await p.ev(`(async () => { const r = await fetch(document.querySelector('[data-action="xem-bien-lai"]').href); return [r.status, r.headers.get('content-type'), r.headers.get('cache-control')]; })()`);
    assert.deepEqual(kq, [200, "image/jpeg", "no-store"]);
    assert.equal(await p.ev(`/bln\\//.test(document.documentElement.outerHTML)`), false);
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `04-ke-toan-${kho}`, khung);
    await axe(p, `trang đơn Kế toán ${kho}`);
  });
  p.close();
}
b.xong();
await env.stop();
