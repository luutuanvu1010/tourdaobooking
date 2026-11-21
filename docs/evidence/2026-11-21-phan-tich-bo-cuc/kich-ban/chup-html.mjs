// Chụp một tệp HTML cục bộ thành ảnh PNG (dùng cho sơ đồ khung gốc đề xuất). Tệp vào và ảnh ra đều nằm NGOÀI kho.
// Chạy từ GỐC kho: node docs/evidence/2026-11-21-phan-tich-bo-cuc/kich-ban/chup-html.mjs <tệp.html> <ảnh.png> [rộng=1600]
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { moChrome, sleep } from "../../../../scripts/giao-dien/cdp.mjs";

const [vao, anh, rong = "1600"] = process.argv.slice(2);
if (!vao || !anh) { console.error("Thiếu tham số: <tệp.html> <ảnh.png> [rộng]"); process.exit(2); }
const chrome = await moChrome();
try {
  const ngan = await chrome.moNgan();
  await ngan.khung(Number(rong), 900, false, 2, "may-tinh");
  await ngan.s("Page.navigate", { url: pathToFileURL(resolve(vao)).href });
  await sleep(900);
  const cao = await ngan.ev("document.documentElement.scrollHeight");
  const r = await ngan.s("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: Number(rong), height: cao, scale: 1 } });
  writeFileSync(resolve(anh), Buffer.from(r.result.data, "base64"));
  console.log("ghi", anh, `${rong}×${cao}`);
  await ngan.dong();
} finally { await chrome.tat(); }
