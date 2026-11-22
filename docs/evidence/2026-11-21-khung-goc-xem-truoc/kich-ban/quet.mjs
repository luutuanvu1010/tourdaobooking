// Quét bốn màn mẫu (đã tiêm lớp xem trước khung gốc, hoặc trang như đang có) qua MỌI bề rộng cửa sổ từ 360 tới 1920, bước 20 — tiêu chí nghiệm thu 3 của bản đề xuất luật.
// Mỗi bề rộng đo: tràn ngang; đoạn chữ bị bóp dọc (hộp chữ hẹp hơn 24 px mà cao hơn 3 dòng); khối lệch mép vùng nội dung; phần tử thò ra ngoài khối chứa nó; số kiểu vỏ khối; khoảng cách giữa các khối có thuộc thang không.
// Chạy từ GỐC kho, máy chủ thử đang chạy:
//   node docs/evidence/2026-11-21-khung-goc-xem-truoc/kich-ban/quet.mjs --lop <css> --sap <js> [--man don-hang] [--tu 360 --den 1920 --buoc 20] [--base …] [--ra ~/tourdao-khung-goc-2026-11-21]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { dangNhap, moChrome, sleep } from "../../../../scripts/giao-dien/cdp.mjs";

const lay = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const nha = (p) => resolve(p.replace(/^~/, homedir()));
const base = lay("--base", "http://127.0.0.1:8843");
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error("Chỉ quét trên máy chủ thử cục bộ."); process.exit(2); }
const ra = nha(lay("--ra", "~/tourdao-khung-goc-2026-11-21"));
const LOP = lay("--lop") ? readFileSync(nha(lay("--lop")), "utf8") : null;
const SAP = lay("--sap") ? readFileSync(nha(lay("--sap")), "utf8") : null;
const tu = Number(lay("--tu", "360")), den = Number(lay("--den", "1920")), buoc = Number(lay("--buoc", "20"));
const MAN = [
  { khoa: "don-hang", tk: "sales", trang: "/orders" },
  { khoa: "chi-tiet-don", tk: "sales", trang: "/order?id=e7ee8ad3-713f-4ef4-a8c9-2d74dbac531a" },
  { khoa: "sua-xe", tk: "quantri", trang: "/xe-sua?id=b297adae-d7e8-46f9-a84a-c616b73bb58a" },
  { khoa: "dia-diem", tk: "quantri", trang: "/locations" },
].filter((m) => !lay("--man") || lay("--man").split(",").includes(m.khoa));
const dsTk = Object.fromEntries(JSON.parse(readFileSync(nha(lay("--tk", "~/tourdao-khung-goc-2026-11-21/tai-khoan.json")), "utf8")).taiKhoan.map((t) => [t.khoa, t]));
const THANG = [0, 4, 8, 12, 16, 24, 32, 48];
// Phép đo chạy trong trang (không viết dấu huyền trong khối này: đang nằm trong chuỗi mẫu).
const DO = String.raw`(() => { const main = document.querySelector("main"); const ms = getComputedStyle(main); const m = main.getBoundingClientRect();
  const cl = m.left + parseFloat(ms.paddingLeft), cr = m.right - parseFloat(ms.paddingRight);
  const hien = (el) => { if (el.closest("[hidden], details:not([open]) > :not(summary)")) return false; const r = el.getBoundingClientRect(); if (r.width <= 1 || r.height <= 1) return false; const s = getComputedStyle(el); return s.visibility !== "hidden" && s.display !== "none"; };
  let bop = 0; const vd = []; const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let x = w.nextNode(); x; x = w.nextNode()) { const t = x.textContent.trim(); if (t.length < 6) continue; const p = x.parentElement; if (!hien(p)) continue; const s = getComputedStyle(p); const rg = document.createRange(); rg.selectNodeContents(x); const r = rg.getBoundingClientRect(); const dong = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.4; if (r.width > 0 && r.width < 24 && r.height > dong * 3) { bop++; if (vd.length < 2) vd.push(t.slice(0, 20)); } }
  const khoi = [...main.querySelectorAll(".khoi")].filter(hien);
  // Khối lệch mép: khối cấp ngoài cùng (không nằm trong lưới cột) phải kín vùng nội dung, sai số 1 px.
  const lech = khoi.filter((k) => !k.parentElement.closest(".khoi") && !k.closest(".hai-cot, .luoi") && getComputedStyle(k).backgroundColor !== "rgba(0, 0, 0, 0)").filter((k) => { const r = k.getBoundingClientRect(); return Math.abs(r.left - cl) > 1 || Math.abs(cr - r.right) > 1; }).length;
  // Phần tử thò ra ngoài khối chứa nó (quá 1 px bề ngang).
  let tho = 0; const vdTho = []; for (const k of khoi) { const kr = k.getBoundingClientRect(); for (const e of k.querySelectorAll("*")) { if (!hien(e) || e.closest("svg")) continue; const r = e.getBoundingClientRect(); if (r.right > kr.right + 1 || r.left < kr.left - 1) { tho++; if (vdTho.length < 2) vdTho.push(e.tagName.toLowerCase() + "." + [...e.classList].slice(0, 2).join(".")); } } }
  // Kiểu vỏ: đệm / bo góc / bóng của mọi khối có nền.
  const vo = new Set(khoi.filter((k) => getComputedStyle(k).backgroundColor !== "rgba(0, 0, 0, 0)").map((k) => { const s = getComputedStyle(k); return [s.paddingTop, s.paddingLeft, s.borderTopLeftRadius, s.boxShadow === "none" ? "khong-bong" : "bong"].join("/"); }).map((x) => x.replace(/^0px\/0px/, "bang")));
  // Khoảng cách dọc giữa các con trực tiếp đang hiện của main (trong luồng).
  const con = [...main.children].flatMap((e) => getComputedStyle(e).display === "contents" ? [...e.children] : [e]).filter((e) => hien(e) && !/^(fixed|absolute|sticky)$/.test(getComputedStyle(e).position));
  const nhip = new Set(); for (let i = 1; i < con.length; i++) { const d = Math.round(con[i].getBoundingClientRect().top - con[i - 1].getBoundingClientRect().bottom); if (d >= 0) nhip.add(d); }
  return { noiDung: Math.round(cr - cl), tranNgang: document.documentElement.scrollWidth > innerWidth + 1, bop, vd, lech, tho, vdTho, vo: [...vo], nhip: [...nhip].sort((a, b) => a - b), soKhoi: khoi.length }; })()`;
const mo = async (ngan, url) => { await ngan.s("Page.navigate", { url }); const het = Date.now() + 6000; for (;;) { await sleep(120); if (await ngan.ev("document.readyState").catch(() => "") === "complete" || Date.now() > het) break; }
  await ngan.ev(`new Promise((xong) => { const het = Date.now() + 5000; let t; const thu = () => { if (Date.now() > het || !document.querySelector(".trang-thai-xuong, .xuong, [aria-busy='true'], .skeleton-list:not([hidden])")) { o.disconnect(); xong(); } else t = setTimeout(thu, 250); }; const o = new MutationObserver(() => { clearTimeout(t); t = setTimeout(thu, 350); }); o.observe(document.body, { childList: true, subtree: true }); t = setTimeout(thu, 350); })`).catch(() => {}); await sleep(350); };
const kq = []; let hong = 0;
const chrome = await moChrome();
try {
  for (const tk of [...new Set(MAN.map((m) => m.tk))]) {
    const ngan = await chrome.moNgan(); const t = dsTk[tk];
    await ngan.cookie(await dangNhap(base, t.sdt, t.pin), base);
    for (const m of MAN.filter((x) => x.tk === tk)) {
      for (let w = tu; w <= den; w += buoc) {
        const mob = w < 600;
        await ngan.khung(w, mob ? 844 : 900, mob, 1, mob ? "iphone" : "may-tinh");
        const o = { man: m.khoa, rong: w };
        try {
          await mo(ngan, base + m.trang);
          if (LOP) await ngan.ev(`(() => { const s = document.createElement("style"); s.textContent = ${JSON.stringify(LOP)}; document.head.append(s); })(); 0`);
          if (SAP) await ngan.ev(`(() => { ${SAP}\n })(); 0`);
          if (LOP || SAP) await sleep(250);
          Object.assign(o, await ngan.ev(DO));
        } catch (e) { o.loi = String(e.message ?? e).slice(0, 160); }
        const nhipLa = (o.nhip ?? []).filter((d) => !THANG.includes(d));
        const xau = o.loi || o.tranNgang || o.bop || o.lech || o.tho || (LOP && (o.vo ?? []).filter((v) => !v.startsWith("bang")).length > 1) || (LOP && nhipLa.length);
        if (xau) hong++;
        kq.push({ ...o, nhipLa });
        if (xau) console.log(`✗ ${m.khoa} @${w}: nội dung ${o.noiDung}${o.tranNgang ? " TRÀN NGANG" : ""}${o.bop ? ` · chữ bị bóp ${o.bop} (${o.vd.join(" | ")})` : ""}${o.lech ? ` · khối lệch mép ${o.lech}` : ""}${o.tho ? ` · thò ra ngoài khối ${o.tho} (${o.vdTho.join(", ")})` : ""}${(o.vo ?? []).length > 1 ? ` · vỏ: ${o.vo.join(" ; ")}` : ""}${nhipLa.length ? ` · nhịp ngoài thang: ${nhipLa.join(", ")}` : ""}${o.loi ? " · " + o.loi : ""}`);
      }
      const cua = kq.filter((x) => x.man === m.khoa);
      console.log(`— ${m.khoa}: ${cua.length} bề rộng; tràn ngang ${cua.filter((x) => x.tranNgang).length}; có chữ bị bóp ${cua.filter((x) => x.bop).length}; khối lệch mép ${cua.filter((x) => x.lech).length}; thò ra ngoài khối ${cua.filter((x) => x.tho).length}; kiểu vỏ ${[...new Set(cua.flatMap((x) => x.vo ?? []))].join(" ; ") || "—"}; nhịp gặp ${[...new Set(cua.flatMap((x) => x.nhip ?? []))].sort((a, b) => a - b).join(", ")}`);
    }
    await ngan.dong();
  }
} finally { await chrome.tat(); }
mkdirSync(join(ra, "so-do"), { recursive: true });
const tep = join(ra, "so-do", `quet-${LOP ? "sau" : "truoc"}.json`);
writeFileSync(tep, JSON.stringify({ luc: new Date().toISOString(), tu, den, buoc, ketQua: kq }));
console.log(`Ghi ${tep}: ${kq.length} ô, ${hong} ô có điều phải xem.`);
process.exit(hong ? 2 : 0);
