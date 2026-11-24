// Chụp một tệp HTML thành ảnh PNG. Hai cách:
//   (1) tệp cục bộ (tờ ghép ảnh trước / sau):   node …/chup-html.mjs <tệp.html> <ảnh.png> [--rong 1600]
//   (2) dựng TRÊN nguồn của máy chủ thử để dùng đúng tệp kiểu và phông của Nền tảng (trang số của thang đo):
//       node …/chup-html.mjs <tệp.html> <ảnh.png> --goc http://127.0.0.1:8843 [--lop <css tiêm thêm>] [--rong 1600]
// Ảnh ra phải nằm NGOÀI kho. Chạy từ GỐC kho.
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { moChrome, sleep } from "../../../../scripts/giao-dien/cdp.mjs";

const nha = (p) => resolve(p.replace(/^~/, homedir()));
const lay = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const [vao, anh] = process.argv.slice(2).filter((x, i, a) => !x.startsWith("--") && !(a[i - 1] ?? "").startsWith("--"));
if (!vao || !anh) { console.error("Thiếu tham số: <tệp.html> <ảnh.png>"); process.exit(2); }
const rel = relative(resolve(process.cwd()), nha(anh));
if (!rel.startsWith("..") && !isAbsolute(rel)) { console.error("Ảnh ra nằm trong kho: không ghi."); process.exit(2); }
const rong = Number(lay("--rong", "1600")), goc = lay("--goc"), lop = lay("--lop");
if (goc && !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(goc)) { console.error("--goc chỉ nhận máy chủ thử cục bộ."); process.exit(2); }
const chrome = await moChrome();
try {
  const ngan = await chrome.moNgan();
  await ngan.khung(rong, 900, false, 2, "may-tinh");
  if (goc) {
    await ngan.s("Page.navigate", { url: goc + "/404.html" }); await sleep(700);
    const { result: { frameTree } } = await ngan.s("Page.getFrameTree");
    const kieu = `<link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/giao-dien.css">${lop ? `<style>${readFileSync(nha(lop), "utf8")}</style>` : ""}`;
    await ngan.s("Page.setDocumentContent", { frameId: frameTree.frame.id, html: readFileSync(nha(vao), "utf8").replace("<!--KIEU-NEN-TANG-->", kieu) });
    await sleep(1500);
    await ngan.ev("document.fonts.ready.then(() => 0)");
  } else {
    await ngan.s("Page.navigate", { url: pathToFileURL(nha(vao)).href });
    await sleep(1200);
    await ngan.ev("Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))).then(() => 0)");
  }
  await sleep(300);
  const cao = await ngan.ev("document.documentElement.scrollHeight");
  const r = await ngan.s("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: rong, height: cao, scale: 1 } });
  writeFileSync(nha(anh), Buffer.from(r.result.data, "base64"));
  console.log("ghi", anh, `${rong}×${cao}`);
  await ngan.dong();
} finally { await chrome.tat(); }
