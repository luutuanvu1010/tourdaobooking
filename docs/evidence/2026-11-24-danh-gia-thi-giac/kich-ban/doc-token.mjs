// Đọc bộ token ĐANG CÓ HIỆU LỰC trên máy thử (app.css + tệp giao diện công ty đã đặt giống bản chạy thật): tên token ở :root và giá trị trình duyệt tính ra.
// Mục đích: so «số màu, cỡ chữ, bo góc… thật sự hiện trên màn» (do-thi-giac.js) với «số token khai». Để trình duyệt tự giải var(), color-mix(), calc() thay vì đoán bằng tay.
// Chạy từ GỐC kho: node docs/evidence/2026-11-24-danh-gia-thi-giac/kich-ban/doc-token.mjs [--base http://127.0.0.1:8851] [--ra ~/tourdao-thi-giac-2026-11-24]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const lay = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const base = lay("--base") ?? "http://127.0.0.1:8851";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error("Chỉ đọc trên máy chủ thử cục bộ."); process.exit(2); }
const ra = resolve((lay("--ra") ?? join(homedir(), "tourdao-thi-giac-2026-11-24")).replace(/^~/, homedir()));
const { moChrome, dangNhap, sleep } = await import(pathToFileURL(join(process.cwd(), "scripts/giao-dien/cdp.mjs")).href);
const tk = JSON.parse(readFileSync(join(ra, "tai-khoan.json"), "utf8")).taiKhoan.find((t) => t.khoa === "sales");
const TRONG_TRANG = `(() => {
  const ten = new Map(); // tên token → { nguon: Set(tệp), tho: giá trị thô cuối cùng ở :root }
  for (const sh of document.styleSheets) {
    let rules; try { rules = sh.cssRules; } catch { continue; }
    const nguon = (sh.href || "inline").replace(location.origin, "").split("?")[0];
    const di = (rs, trongMedia) => { for (const r of rs) {
      if (r.cssRules && r.type !== 1) { di(r.cssRules, true); continue; }
      if (r.type !== 1 || !/(^|,)\\s*:root\\s*(,|$)/.test(r.selectorText)) continue;
      for (const p of r.style) if (p.startsWith("--")) { const x = ten.get(p) ?? { nguon: new Set(), tho: null, trongMedia: false }; x.nguon.add(nguon); if (!trongMedia) x.tho = r.style.getPropertyValue(p).trim(); else x.trongMedia = true; ten.set(p, x); }
    } };
    di(rules, false);
  }
  const que = document.createElement("div"); que.style.cssText = "position:absolute;left:-9999px;top:0;"; document.body.appendChild(que);
  const kq = [];
  for (const [t, x] of ten) {
    const tho = getComputedStyle(document.documentElement).getPropertyValue(t).trim();
    que.style.color = "rgb(1, 2, 3)"; que.style.color = "var(" + t + ")"; const mau = getComputedStyle(que).color;
    que.style.color = "";
    que.style.width = "12345px"; que.style.width = "var(" + t + ")"; const rong = getComputedStyle(que).width;
    que.style.width = "";
    const laMau = /^(#|rgb|hsl|color-mix|oklch|var\\(--c-)/.test(tho) || (mau !== "rgb(1, 2, 3)" && /^--c-/.test(t));
    kq.push({ ten: t, tho, nguon: [...x.nguon], loai: laMau && mau !== "rgb(1, 2, 3)" ? "mau" : (rong !== "12345px" && /px$/.test(rong) && !/^\\d+$/.test(tho) ? "do-dai" : "khac"), mau: laMau ? mau : null, px: rong !== "12345px" ? parseFloat(rong) : null });
  }
  que.remove();
  return kq;
})()`;
const chrome = await moChrome({});
try {
  const ngan = await chrome.moNgan();
  await ngan.cookie(await dangNhap(base, tk.sdt, tk.pin), base);
  await ngan.khung(1280, 800, false, 1);
  await ngan.di(base + "/orders");
  await sleep(900);
  const token = await ngan.ev(TRONG_TRANG);
  const giaoDien = await (await fetch(base + "/giao-dien.css")).text();
  mkdirSync(join(ra, "so-do"), { recursive: true });
  writeFileSync(join(ra, "so-do", "token.json"), JSON.stringify({ luc: new Date().toISOString(), giaoDien, token }, null, 1));
  const dem = (l) => token.filter((t) => t.loai === l).length;
  console.log(`Token ở :root: ${token.length} (màu ${dem("mau")}, độ dài ${dem("do-dai")}, khác ${dem("khac")}). Ghi ${join(ra, "so-do", "token.json")}`);
} finally { await chrome.tat(); }
