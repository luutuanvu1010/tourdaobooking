// Chụp bốn màn mẫu của khung gốc giao diện (bản đề xuất luật: docs/superpowers/specs/2026-11-21-khung-goc-giao-dien/DE-XUAT-ADR-khung-goc-giao-dien.md).
// Hai lượt: «truoc» (trang như đang có) và «sau» (TIÊM lớp kiểu khung gốc + đoạn sắp lại phần tử vào trang đang chạy — KHÔNG sửa mã của Nền tảng).
// Chỉ đăng nhập và GET trên máy chủ thử cục bộ, kho dữ liệu giả. Ảnh ghi NGOÀI kho (ADR-0215 Đ3).
//
// Chạy từ GỐC kho, máy chủ thử đang chạy:
//   node docs/evidence/2026-11-21-khung-goc-xem-truoc/kich-ban/chup.mjs --nhan truoc
//   node docs/evidence/2026-11-21-khung-goc-xem-truoc/kich-ban/chup.mjs --nhan sau --lop docs/evidence/2026-11-21-khung-goc-xem-truoc/lop-xem-truoc/khung-goc.css --sap docs/evidence/2026-11-21-khung-goc-xem-truoc/lop-xem-truoc/sap-lai.js
//   tuỳ chọn: [--base http://127.0.0.1:8843] [--tk ~/tourdao-khung-goc-2026-11-21/tai-khoan.json] [--ra ~/tourdao-khung-goc-2026-11-21] [--man don-hang,chi-tiet-don] [--kho 390x844,1130x820,1440x900]
//             [--rong hai-muc] (đặt thuộc tính xem trước «hai mức bề rộng» lên <html> — chỉ dùng cho ảnh so sánh bề rộng trang)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { dangNhap, moChrome, sleep } from "../../../../scripts/giao-dien/cdp.mjs";

const lay = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const nha = (p) => resolve(p.replace(/^~/, homedir()));
const base = lay("--base", "http://127.0.0.1:8843");
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error("Chỉ chụp trên máy chủ thử cục bộ."); process.exit(2); }
const ra = nha(lay("--ra", "~/tourdao-khung-goc-2026-11-21"));
const rel = relative(resolve(process.cwd()), ra);
if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) { console.error(`--ra (${ra}) nằm trong kho: ảnh không được ghi vào kho.`); process.exit(2); }
const NHAN = lay("--nhan", "truoc");
const LOP = lay("--lop") ? readFileSync(nha(lay("--lop")), "utf8") : null;
const SAP = lay("--sap") ? readFileSync(nha(lay("--sap")), "utf8") : null;
const RONG = lay("--rong", "");
const CAO_DT = Number(lay("--cao-dt", "2200")); // điện thoại: ảnh cao tối đa chừng này; thanh dính đáy nằm ở đáy ảnh như ở đáy màn hình thật
const KHO = lay("--kho", "390x844,1130x820,1440x900").split(",").map((k) => { const [w, h] = k.split("x").map(Number); return { w, h, mobile: w < 600, nhan: k }; });

// Bốn màn mẫu: mỗi khuôn chính một màn. Mã bản ghi là của kho dữ liệu giả đợt 20/11 (bảng màn docs/evidence/2026-11-20-danh-gia-lai-giao-dien/kich-ban/bang-man.json: màn 16, 18, 38, 58).
export const MAN = [
  { khoa: "don-hang", ten: "Đơn hàng", khuon: "Danh sách", tk: "sales", trang: "/orders" },
  { khoa: "chi-tiet-don", ten: "Chi tiết đơn", khuon: "Chi tiết", tk: "sales", trang: "/order?id=e7ee8ad3-713f-4ef4-a8c9-2d74dbac531a" },
  { khoa: "sua-xe", ten: "Sửa xe", khuon: "Biểu mẫu", tk: "quantri", trang: "/xe-sua?id=b297adae-d7e8-46f9-a84a-c616b73bb58a" },
  { khoa: "dia-diem", ten: "Địa điểm", khuon: "Thiết lập", tk: "quantri", trang: "/locations" },
];
const chon = lay("--man") ? new Set(lay("--man").split(",")) : null;
const man = MAN.filter((m) => !chon || chon.has(m.khoa));
const dsTk = Object.fromEntries(JSON.parse(readFileSync(nha(lay("--tk", "~/tourdao-khung-goc-2026-11-21/tai-khoan.json")), "utf8")).taiKhoan.map((t) => [t.khoa, t]));

// Đi tới url: chờ tài liệu tải xong, rồi chờ DOM yên 500 ms và hết khung chờ (tối đa 7 s). Bảng tin (SSE) giữ mạng bận nên không chờ «mạng lặng».
const di = async (ngan, url) => {
  await ngan.s("Page.navigate", { url });
  const het = Date.now() + 7000;
  for (;;) { await sleep(120); if (await ngan.ev("document.readyState").catch(() => "") === "complete" || Date.now() > het) break; }
  const con = Math.max(600, het - Date.now());
  await ngan.ev(`new Promise((xong) => { const het = Date.now() + ${con}; let t; const thu = () => { if (Date.now() > het || !document.querySelector(".trang-thai-xuong, .xuong, [aria-busy='true'], .skeleton-list:not([hidden])")) { o.disconnect(); xong(); } else t = setTimeout(thu, 300); }; const o = new MutationObserver(() => { clearTimeout(t); t = setTimeout(thu, 500); }); o.observe(document.body, { childList: true, subtree: true }); t = setTimeout(thu, 500); })`).catch(() => {});
  await sleep(500); // số tiền, người phụ trách điền sau lần vẽ đầu
};
const chup = async (ngan, tep, caoToiDa) => {
  const cao = await ngan.ev(`Math.min(Math.max(document.documentElement.scrollHeight, innerHeight), ${caoToiDa})`); const rong = await ngan.ev("innerWidth");
  const r = await ngan.s("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: rong, height: cao, scale: 1 } });
  if (!r.result?.data) throw new Error(`chụp lỗi: ${JSON.stringify(r.error ?? r).slice(0, 160)}`);
  writeFileSync(tep, Buffer.from(r.result.data, "base64"));
  return cao;
};
// Số đo gọn để tự soát lớp xem trước: vùng nội dung, tràn ngang, chữ bị bóp dọc (cùng phép đo với quet-be-rong.mjs của đợt phân tích).
const SOAT = String.raw`(() => { const main = document.querySelector("main"); const ms = getComputedStyle(main); const m = main.getBoundingClientRect(); let bop = 0; const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let x = w.nextNode(); x; x = w.nextNode()) { const t = x.textContent.trim(); if (t.length < 6) continue; const p = x.parentElement; const s = getComputedStyle(p); if (s.visibility === "hidden" || s.display === "none" || p.closest("[hidden], details:not([open]) > :not(summary)")) continue; const rg = document.createRange(); rg.selectNodeContents(x); const r = rg.getBoundingClientRect(); const dong = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.4; if (r.width > 0 && r.width < 24 && r.height > dong * 3) bop++; }
  return { noiDung: Math.round(m.width - parseFloat(ms.paddingLeft) - parseFloat(ms.paddingRight)), tranNgang: document.documentElement.scrollWidth > innerWidth + 1, bop, cao: document.documentElement.scrollHeight }; })()`;

mkdirSync(join(ra, "anh", NHAN), { recursive: true });
const theoTk = new Map();
for (const m of man) { if (!theoTk.has(m.tk)) theoTk.set(m.tk, []); theoTk.get(m.tk).push(m); }
const chrome = await moChrome();
let hong = 0;
try {
  for (const [tk, ds] of theoTk) {
    const ngan = await chrome.moNgan();
    const t = dsTk[tk];
    await ngan.cookie(await dangNhap(base, t.sdt, t.pin), base);
    for (const k of KHO) {
      await ngan.khung(k.w, k.h, k.mobile, k.mobile ? 2 : 1, k.mobile ? "iphone" : "may-tinh");
      for (const m of ds) {
        try {
          await di(ngan, base + m.trang);
          if (RONG) await ngan.ev(`document.documentElement.dataset.xemTruocRong = ${JSON.stringify(RONG)}; 0`);
          if (LOP) await ngan.ev(`(() => { const s = document.createElement("style"); s.id = "xem-truoc-khung-goc"; s.textContent = ${JSON.stringify(LOP)}; document.head.append(s); })(); 0`);
          if (SAP) await ngan.ev(`(() => { ${SAP}\n })(); 0`);
          if (LOP || SAP || RONG) await sleep(400);
          await ngan.ev("scrollTo(0,0);0"); await sleep(150);
          const so = await ngan.ev(SOAT);
          // Điện thoại: kéo khung nhìn cao bằng cả trang rồi mới chụp, để thanh dính đáy và thanh tab nằm ở CUỐI ảnh (chụp «vượt khung» thì chúng nằm lơ lửng giữa ảnh).
          if (k.mobile) { await ngan.khung(k.w, Math.min(Math.max(so.cao, k.h), CAO_DT), true, 2, "iphone"); await sleep(350); }
          const tep = join(ra, "anh", NHAN, `${m.khoa}-${k.w}${RONG ? "-" + RONG : ""}.png`);
          await chup(ngan, tep, k.mobile ? CAO_DT : 3200);
          if (k.mobile) await ngan.khung(k.w, k.h, true, 2, "iphone");
          const co = so.tranNgang || so.bop;
          if (co) hong++;
          console.log(`${co ? "✗" : "✓"} ${NHAN} ${m.khoa} @${k.nhan}: nội dung ${so.noiDung}, cao ${so.cao}${so.tranNgang ? ", TRÀN NGANG" : ""}${so.bop ? `, chữ bị bóp ${so.bop}` : ""}${ngan.loi.length ? ` · lỗi trang: ${ngan.loi.slice(0, 2).join(" | ")}` : ""}`);
        } catch (e) { hong++; console.log(`✗ ${NHAN} ${m.khoa} @${k.nhan}: ${String(e.message ?? e).slice(0, 200)}`); }
      }
    }
    await ngan.dong();
  }
} finally { await chrome.tat(); }
process.exit(hong ? 2 : 0);
