// Quét màn qua nhiều bề rộng cửa sổ để tìm khoảng bề rộng làm vỡ bố cục (lỗi mà phép đo hai khổ 390 / 1280 không thấy).
// Với mỗi bề rộng: đếm đoạn chữ bị bóp hẹp tới mức mỗi dòng chỉ còn một hai ký tự (hộp chữ hẹp hơn 24 px mà cao hơn 3 dòng), và trang có tràn ngang không.
// Hai cách chạy (từ GỐC kho, máy chủ thử đang chạy):
//   một màn, quét mịn:  node docs/evidence/2026-11-21-phan-tich-bo-cuc/kich-ban/quet-be-rong.mjs --bo SALES --trang /orders [--tu 900 --den 1500 --buoc 20]
//   cả 87 màn, vài mốc: node docs/evidence/2026-11-21-phan-tich-bo-cuc/kich-ban/quet-be-rong.mjs --tat-ca [--rong 700,820,900,1000,1100,1180] [--ra ~/tourdao-bo-cuc-2026-11-21]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { dangNhap, moChrome, sleep } from "../../../../scripts/giao-dien/cdp.mjs";

const lay = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const nha = (p) => resolve(p.replace(/^~/, homedir()));
const base = lay("--base", "http://127.0.0.1:8835");
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error("Chỉ đo trên máy chủ thử cục bộ."); process.exit(2); }
const KHOA_TK = { SALES: "sales", INTERN: "intern", ACCOUNTING: "ketoan", ADMIN: "quantri", FIELD: "hdv", PARTNER: "ctv", SUPER_ADMIN: "toanquyen", DRIVER: "taixe", DRIVER_PARTNER: "taixedt", HR: "nhansu", SALES_MANAGER: "qlbh" };
const dsTk = Object.fromEntries(JSON.parse(readFileSync(nha(lay("--tk", "~/tourdao-danh-gia-2026-11-20/tai-khoan.json")), "utf8")).taiKhoan.map((t) => [t.khoa, t]));
const DO = String.raw`(() => { const main = document.querySelector("main"); if (!main) return { loi: "không có main" }; const bop = []; const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let x = w.nextNode(); x; x = w.nextNode()) { const t = x.textContent.trim(); if (t.length < 6) continue; const p = x.parentElement; const s = getComputedStyle(p); if (s.visibility === "hidden" || s.display === "none" || p.closest("details:not([open]) > :not(summary)")) continue; const rg = document.createRange(); rg.selectNodeContents(x); const r = rg.getBoundingClientRect(); const dong = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.4; if (r.width > 0 && r.width < 24 && r.height > dong * 3) bop.push(t.slice(0, 24)); }
  const sb = document.querySelector("#sidebar"); const m = main.getBoundingClientRect(); const ms = getComputedStyle(main);
  return { vw: innerWidth, thanhBen: sb && getComputedStyle(sb).display !== "none" ? Math.round(sb.getBoundingClientRect().width) : 0, noiDung: Math.round(m.width - parseFloat(ms.paddingLeft) - parseFloat(ms.paddingRight)), bop: bop.length, vd: bop.slice(0, 2), tranNgang: document.documentElement.scrollWidth > innerWidth + 1 }; })()`;
const mo = async (ngan, url) => { await ngan.s("Page.navigate", { url }); const het = Date.now() + 6000; for (;;) { await sleep(150); if (await ngan.ev("document.readyState").catch(() => "") === "complete" || Date.now() > het) break; } await sleep(900); };
const chrome = await moChrome();
try {
  if (process.argv.includes("--tat-ca")) {
    const ra = nha(lay("--ra", "~/tourdao-bo-cuc-2026-11-21"));
    const RONG = lay("--rong", "700,820,900,1000,1100,1180").split(",").map(Number);
    const man = JSON.parse(readFileSync("docs/evidence/2026-11-20-danh-gia-lai-giao-dien/kich-ban/bang-man.json", "utf8")).man; // đường dẫn tính từ gốc kho
    const theoBo = new Map(); for (const m of man) { if (!theoBo.has(m.bo)) theoBo.set(m.bo, []); theoBo.get(m.bo).push(m); }
    const kq = [];
    for (const [bo, ds] of theoBo) {
      const ngan = await chrome.moNgan();
      if (bo !== "KHACH") { const tk = dsTk[KHOA_TK[bo]]; await ngan.cookie(await dangNhap(base, tk.sdt, tk.pin), base); }
      for (const w of RONG) {
        await ngan.khung(w, 820, false, 1, "may-tinh");
        for (const m of ds) {
          const o = { so: m.so, bo, trang: m.trang.split("?")[0], rong: w };
          try { await mo(ngan, base + m.trang + (m.don && !m.trang.includes("?") ? `?id=${m.don}` : "")); Object.assign(o, await ngan.ev(DO)); } catch (e) { o.loi = String(e.message ?? e).slice(0, 160); }
          kq.push(o);
          if (o.bop || o.tranNgang || o.loi) console.log(`! màn ${m.so} ${bo}:${o.trang} @${w}: chữ bị bóp dọc ${o.bop ?? "?"}${o.tranNgang ? ", TRÀN NGANG" : ""}${o.loi ? ", lỗi " + o.loi : ""}${o.vd?.length ? " (vd: " + o.vd.join(" | ") + ")" : ""}`);
        }
      }
      await ngan.dong();
    }
    mkdirSync(join(ra, "so-do"), { recursive: true });
    writeFileSync(join(ra, "so-do", "quet-be-rong.json"), JSON.stringify({ luc: new Date().toISOString(), rong: RONG, ketQua: kq }));
    const co = kq.filter((x) => x.bop || x.tranNgang);
    console.log(`Xong ${kq.length} ô (${man.length} màn × ${RONG.length} bề rộng); ô có lỗi: ${co.length}; màn có lỗi: ${new Set(co.map((x) => x.so)).size}; ô không đo được: ${kq.filter((x) => x.loi).length}.`);
  } else {
    const bo = lay("--bo", "SALES"), trang = lay("--trang", "/orders");
    const tu = Number(lay("--tu", "900")), den = Number(lay("--den", "1500")), buoc = Number(lay("--buoc", "20"));
    const ngan = await chrome.moNgan(); const tk = dsTk[KHOA_TK[bo]];
    await ngan.cookie(await dangNhap(base, tk.sdt, tk.pin), base);
    for (let w = tu; w <= den; w += buoc) {
      await ngan.khung(w, 820, false, 1, "may-tinh");
      await mo(ngan, base + trang);
      const o = await ngan.ev(DO);
      console.log(`${String(w).padStart(5)}  thanh bên ${String(o.thanhBen).padStart(3)}  nội dung ${String(o.noiDung).padStart(4)}  chữ bị bóp dọc ${String(o.bop).padStart(3)}${o.tranNgang ? "  TRÀN NGANG" : ""}${o.vd.length ? "  vd: " + o.vd.join(" | ") : ""}`);
    }
    await ngan.dong();
  }
} finally { await chrome.tat(); }
