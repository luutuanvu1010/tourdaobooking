// Kịch bản ảnh biên nhận HD-02-DT (chạy từ gốc repo; cần `npm run build:web` không bắt buộc, kịch bản tự gói bộ vẽ thật).
// esbuild gói ĐÚNG `web/confirmation-image.ts` + `src/shared/order-confirmation.ts` thành một trang, nhúng logo và phông bằng data URI,
// rồi Chrome chạy ngầm: `--dump-dom` đọc các phép vẽ (JSON) và `--screenshot` chụp ảnh.
//   MOC=1 node …/mau-hd-02-dt.mjs   → ghi phép vẽ mẫu nội bộ vào noi-bo-truoc-khi-sua.json (chụp TRƯỚC khi sửa bộ vẽ)
//   node …/mau-hd-02-dt.mjs         → so mẫu nội bộ với mốc, kiểm mẫu đối tác, ghi ảnh vào ../anh/
// Biến môi trường: CHROME_BIN (đường dẫn Chrome), MOC.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const ROOT = resolve(process.cwd());
const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = resolve(HERE, "..");
const MOC_FILE = join(HERE, "noi-bo-truoc-khi-sua.json");
const CHROME = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const tmp = mkdtempSync(join(tmpdir(), "mau-hd-02-dt-"));

const entry = `
import { buildConfirmation, HANDLER_HIDDEN } from ${JSON.stringify(ROOT + "/src/shared/order-confirmation.ts")};
import { prepareConfirmation, renderConfirmationPng } from ${JSON.stringify(ROOT + "/web/confirmation-image.ts")};
const company = { name: "CÔNG TY TNHH TOUR ĐẢO", taxCode: "4201234567", address: "12 Trần Phú, phường Lộc Thọ, Nha Trang, Khánh Hòa", hotline: "0905 123 456", email: "booking@tourdao.vn" };
const svc = (name, ngay, gio, dg, items, gia) => ({ name, unit: "perPax", pax: { adult: 2, child: gia ? 0 : 1, senior: 0, infant: 0 }, departDate: ngay, departTime: gio, pickupTime: dg ? "07:15" : null, pickupPlace: dg, checkinDate: null, checkinTime: null, checkinPlace: null, giaKhacCongBo: false, items });
const base = (mau, status, huy) => ({
  mau, company, orderCode: "TD-251126-0042", status,
  createdAt: "2026-11-06T03:15:00.000Z", customerName: "Nguyễn Thị Lan", customerPhone: "0912 345 678", customerEmail: null, customerNote: "Có một bé 4 tuổi, cần áo phao trẻ em.",
  services: [
    svc("Tour 4 đảo Nha Trang", "2026-11-25", "08:00", "Khách sạn Mường Thanh Luxury, 60 Trần Phú", [
      { description: "Người lớn", detail: null, quantity: 2, unitPrice: 650000, lineTotal: 1300000 },
      { description: "Trẻ em", detail: "Trẻ 5–10 tuổi", quantity: 1, unitPrice: 450000, lineTotal: 450000 }]),
    svc("Vé VinWonders Nha Trang", "2026-11-26", null, null, [{ description: "Người lớn", detail: null, quantity: 2, unitPrice: 950000, lineTotal: 1900000 }], true),
  ],
  subtotal: 3650000, discount: 0, total: 3650000, daTra: huy ? 300000 : 500000, conLai: huy ? 0 : 3150000, huy,
  phan: huy ? [] : [{ nguoiBan: "CÔNG TY TNHH TOUR ĐẢO", vaiTourDao: "nguoi_ban", dichVu: [], tong: 3650000, giamGia: 0, daTra: 500000, conLai: 3150000, traTaiQuay: false }],
});
const HUY = { nhom: "KHACH_HUY", daTra: 300000, dangDoiChieu: 0, hoanTruocHuy: 0, daDuyet: 0, daChi: 0, daChuyen: 0, daDuyetChuyen: 0, han: "2026-12-01" };
const ca = [
  ["noi-bo", base("noi_bo", { khoa: "confirmed", nhan: "Đã xác nhận" }, null)],
  ["doi-tac", base("doi_tac", { khoa: "confirmed", nhan: "Đã xác nhận" }, null)],
  ["doi-tac-huy", base("doi_tac", { khoa: "cancelled", nhan: "Đã huỷ" }, HUY)],
];
(async () => {
  const out = document.getElementById("out"); const ops = {};
  try {
    for (const [ten, r] of ca) {
      const model = buildConfirmation(r, HANDLER_HIDDEN);
      ops[ten] = (await prepareConfirmation(model)).layout.ops;
      const blob = await renderConfirmationPng(model);
      const img = document.createElement("img"); img.id = ten; img.src = URL.createObjectURL(blob); img.width = 720;
      if (ten === window.__CHUP) out.append(img);
    }
    document.getElementById("json").textContent = JSON.stringify(ops);
    document.body.dataset.xong = "1";
  } catch (e) { document.getElementById("json").textContent = "LOI: " + String(e && e.message || e); }
})();
`;
writeFileSync(join(tmp, "entry.ts"), entry);

const logo = "data:image/png;base64," + readFileSync(`${ROOT}/public/icons/icon-192.png`).toString("base64");
const res = await build({
  entryPoints: [join(tmp, "entry.ts")], bundle: true, write: false, format: "iife", target: "es2022",
  plugins: [{ name: "logo", setup(b) { b.onLoad({ filter: /confirmation-image\.ts$/ }, (a) => ({ contents: readFileSync(a.path, "utf8").replace('"/icons/icon-192.png"', JSON.stringify(logo)), loader: "ts" })); } }],
});
const bundle = res.outputFiles[0].text;
const css = readFileSync(`${ROOT}/public/app.css`, "utf8").replace(/url\("\/fonts\/([a-z0-9-]+\.woff2)"\)/g, (_, f) => `url("data:font/woff2;base64,${readFileSync(`${ROOT}/public/fonts/${f}`).toString("base64")}")`);
const trang = (chup) => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>${css}</style><style>body{margin:0;background:#fff}#json{display:none}img{display:block}</style></head><body><div id="out"></div><pre id="json"></pre><script>window.__CHUP=${JSON.stringify(chup)}</script><script>${bundle}</script></body></html>`;

const chrome = (file, extra) => execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--user-data-dir=${mkdtempSync(join(tmp, "p-"))}`, "--virtual-time-budget=20000", ...extra, "file://" + file], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });

// 1) phép vẽ
const f0 = join(tmp, "ops.html"); writeFileSync(f0, trang(""));
const dom = chrome(f0, ["--dump-dom"]);
const m = dom.match(/<pre id="json"[^>]*>([\s\S]*?)<\/pre>/);
assert.ok(m, "không đọc được JSON trong trang");
const txt = m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
if (txt.startsWith("LOI:")) throw new Error(txt);
const ops = JSON.parse(txt);

if (process.env.MOC) {
  writeFileSync(MOC_FILE, JSON.stringify(ops["noi-bo"], null, 1) + "\n");
  console.log("✓ mốc nội bộ");
  process.exit(0);
}

assert.ok(existsSync(MOC_FILE), "thiếu noi-bo-truoc-khi-sua.json; chạy MOC=1 trước");
assert.deepEqual(ops["noi-bo"], JSON.parse(readFileSync(MOC_FILE, "utf8")), "phép vẽ mẫu nội bộ lệch mốc");
console.log("✓ nội bộ giống mốc");
for (const ten of ["doi-tac", "doi-tac-huy"]) {
  const o = ops[ten];
  assert.ok(!o.some((x) => x.kind === "logo"), `${ten}: còn phép vẽ logo`);
  const mm = o.filter((x) => x.kind === "text" && x.tag === "ma-mau");
  assert.equal(mm.length, 1, `${ten}: phải có đúng một ma-mau`);
  assert.equal(mm[0].text, "Mẫu HD-02-DT");
  assert.ok(!o.some((x) => x.kind === "text" && x.text.includes("MST")), `${ten}: còn chữ MST`);
}
console.log("✓ đối tác: không phép vẽ logo, có ma-mau «Mẫu HD-02-DT», không chữ MST");

// 2) ảnh: chụp từng ảnh một (cửa sổ đủ rộng/cao; ảnh hiển thị 720 px)
for (const ten of ["noi-bo", "doi-tac", "doi-tac-huy"]) {
  const f = join(tmp, `${ten}.html`); writeFileSync(f, trang(ten));
  const cao = Math.ceil(ops[ten].reduce((mx, x) => Math.max(mx, x.y ?? x.y2 ?? 0, (x.y ?? 0) + (x.h ?? 0), (x.y ?? 0) + (x.size ?? 0)), 0)) + 60;
  chrome(f, [`--screenshot=${join(EVID, "anh", ten + ".png")}`, `--window-size=720,${cao}`]);
}
console.log("✓ ảnh ghi ở docs/evidence/2026-11-06-bien-nhan-doi-tac/anh/");
