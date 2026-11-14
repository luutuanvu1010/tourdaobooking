// Đo LƯỚI BỐ CỤC cho bước 2 (kế hoạch docs/superpowers/plans/2026-11-14-buoc-2-luoi-bo-cuc.md). Dùng lại khung Chrome của bước 0 (cdp.mjs 13/11).
// Mỗi bộ quyền × trang có lối vào × khổ: đo trong trang
//   - lề trái / phải của vùng nội dung (<main>) so với mép khung nhìn hoặc mép thanh bên; đệm của <main>; bề rộng <main> và bề rộng phần có nội dung thật;
//   - nhịp dọc: khoảng cách giữa các khối con trực tiếp liền nhau của <main> (các giá trị khác nhau);
//   - khối «một đầu» (phép đo 30/10: khối rộng ≥ 60 % main mà phần có chữ / ô / nút ≤ 35 % bề rộng);
//   - tràn ngang; thanh bên có hiện không.
// Thêm phép «xê dịch khi dựng khung» (--xe-dich, chỉ khổ có thanh bên): mở lại trang lần hai trong cùng thẻ (đã có bản nhớ khung), ghi vị trí trái của <main>
//   ở LẦN VẼ ĐẦU và sau khi khung dựng xong + tổng layout-shift (CLS) — đo nợ «thanh bên máy tính dựng muộn đẩy nội dung ngang» của bước 1.
// Tuỳ chọn: --css <tệp> tiêm một lớp CSS tạm (xem trước, không sửa mã); --anh <thư mục> chụp ảnh màn đầu + cả trang.
// Chạy từ GỐC kho, máy chủ thử đang chạy:
//   node docs/evidence/2026-11-14-buoc-2-luoi-bo-cuc/kich-ban/do-luoi.mjs --nhan truoc --base http://127.0.0.1:8825 --d1 ~/tourdao-ux-2026-11-14-buoc-2/d1 \
//     --tk ~/tourdao-ux-2026-11-14-buoc-2/tai-khoan.json [--bo SUPER_ADMIN,SALES] [--trang /orders,/] [--kho 390x844,1280x800] [--css tệp.css] [--js tệp.js] [--truoc-js "biểu thức"] [--anh thư-mục] [--xe-dich] [--ra tệp.json]
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dangNhap, moChrome, sleep } from "../../2026-11-13-kiem-giao-dien/kich-ban/cdp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOC = join(homedir(), "tourdao-ux-2026-11-14-buoc-2");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const co = (k) => process.argv.includes(k);
const NHAN = arg("--nhan", "truoc");
const BASE = arg("--base", "http://127.0.0.1:8825");
const D1 = arg("--d1", join(GOC, "d1"));
const CHI_BO = arg("--bo", "SUPER_ADMIN,SALES,ACCOUNTING,PARTNER,DRIVER").split(",");
const CHI_TRANG = arg("--trang") ? arg("--trang").split(",") : null;
const CSS = arg("--css") ? readFileSync(arg("--css"), "utf8") : null;
const JS = arg("--js") ? readFileSync(arg("--js"), "utf8") : null;
const TRUOC_JS = arg("--truoc-js", "");
const ANH = arg("--anh");
const XE_DICH = co("--xe-dich");
const RA = arg("--ra", join(GOC, "so-lieu", `luoi-${NHAN}.json`));
// [rộng, cao, mobile, máy, nhãn]
const KHO_MAC_DINH = "390x844,844x390,820x1180,1180x820,1280x800,1440x900,1920x1080";
const KHO = arg("--kho", KHO_MAC_DINH).split(",").map((k) => { const [w, h] = k.split("x").map(Number); const mobile = w < 900 || (w === 1180 && h === 820); return [w, h, mobile, w < 500 || h < 500 ? "iphone" : mobile ? "ipad" : "may-tinh", k]; });

const maTran = JSON.parse(readFileSync(join(HERE, "..", "..", "2026-11-13-kiem-giao-dien", "ma-tran-quyen.json"), "utf8"));
const dsTk = JSON.parse(readFileSync(arg("--tk", join(GOC, "tai-khoan.json")), "utf8")).taiKhoan;
const tkTheoBo = {};
for (const t of dsTk) { const bo = String(t.bo).split("+")[0]; if (!tkTheoBo[bo]) tkTheoBo[bo] = { phone: t.sdt, pin: t.pin }; }
const sql = (q) => { try { return JSON.parse(execFileSync("npx", ["wrangler", "d1", "execute", "tourdao-sales-db", "--local", "--persist-to", D1, "--json", "--command", q], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, CI: "1" } }))[0].results; } catch { return []; } };
const mot = (q) => sql(q)[0]?.id ?? null;
const ID = {
  order: mot("SELECT id FROM orders WHERE status <> 'draft' ORDER BY created_at DESC LIMIT 1") ?? mot("SELECT id FROM orders LIMIT 1"),
  trip: mot("SELECT id FROM vc_trip ORDER BY created_at DESC LIMIT 1"),
  xe: mot("SELECT id FROM vc_vehicle LIMIT 1"),
};
const coId = (p) => ({ "/order": ID.order && `?id=${ID.order}`, "/chuyen": ID.trip && `?id=${ID.trip}`, "/cuoc-chuyen": ID.trip && `?id=${ID.trip}`, "/xe-chi-tiet": ID.xe && `?id=${ID.xe}` }[p] ?? "");
const tenTep = (p) => (p === "/" ? "trang-chu" : p.slice(1).replace(/[^a-z0-9-]/gi, "_"));

const DO = `(() => {
  const vw = innerWidth, vh = innerHeight;
  const thay = (el) => { if (el.closest("details:not([open]) > :not(summary)")) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity !== 0 && s.position !== "fixed" && s.position !== "absolute"; };
  const ten = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += "#" + el.id; const c = [...el.classList].slice(0, 2).join("."); if (c) s += "." + c; return s; };
  const main = document.querySelector("main");
  if (!main) return { loi: "không có main" };
  const m = main.getBoundingClientRect(), ms = getComputedStyle(main);
  const sb = document.querySelector("#sidebar");
  const sbr = sb && getComputedStyle(sb).display !== "none" ? sb.getBoundingClientRect() : null;
  const mepTrai = sbr ? sbr.right : 0;
  const con = [...main.children].filter(thay);
  let trai = Infinity, phai = -Infinity;
  for (const c of con) { const r = c.getBoundingClientRect(); trai = Math.min(trai, r.left); phai = Math.max(phai, r.right); }
  const nhip = [];
  for (let i = 1; i < con.length; i++) { const a = con[i - 1].getBoundingClientRect(), b = con[i].getBoundingClientRect(); if (b.top >= a.bottom - 1) nhip.push(Math.round(b.top - a.bottom)); }
  // khối «một đầu» (phép 30/10)
  const motDau = [];
  for (const el of main.querySelectorAll("section, article, .the, .card, li, div")) {
    if (!thay(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 0.6 * m.width || r.height > 400 || r.height < 24) continue;
    if (el.children.length < 2 || el.children.length > 8) continue;
    const doan = [];
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 3) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) if (q.width > 0) doan.push([q.left, q.right]); }
      else if (/^(INPUT|SELECT|TEXTAREA|BUTTON|IMG|svg|CANVAS)$/i.test(n.tagName) && thay(n)) { const q = n.getBoundingClientRect(); doan.push([q.left, q.right]); }
    }
    if (!doan.length) continue;
    doan.sort((a, b) => a[0] - b[0]);
    let phu = 0, [a0, b0] = doan[0];
    for (const [a, b] of doan.slice(1)) { if (a > b0) { phu += b0 - a0; [a0, b0] = [a, b]; } else b0 = Math.max(b0, b); }
    phu += b0 - a0;
    if (phu / r.width <= 0.35) motDau.push(ten(el));
  }
  // dòng chữ dài nhất (đoạn văn / ô bảng một dòng): bề rộng hộp chữ lớn nhất trong main
  let dongDai = 0;
  for (const el of main.querySelectorAll("p, li, td, dd, span, div")) { if (el.children.length || !el.textContent.trim() || !thay(el)) continue; const rg = document.createRange(); rg.selectNodeContents(el); for (const q of rg.getClientRects()) dongDai = Math.max(dongDai, q.width); }
  return {
    vw, vh, tranNgang: document.documentElement.scrollWidth > vw + 1, coThanhBen: !!sbr, thanhBenRong: sbr ? Math.round(sbr.width) : 0,
    mainTrai: Math.round(m.left - mepTrai), mainPhai: Math.round(vw - m.right), mainRong: Math.round(m.width),
    demTrai: parseFloat(ms.paddingLeft), demPhai: parseFloat(ms.paddingRight), demTren: parseFloat(ms.paddingTop),
    leTrai: Number.isFinite(trai) ? Math.round(trai - mepTrai) : null, lePhai: Number.isFinite(trai) ? Math.round(vw - phai) : null, noiDungRong: Number.isFinite(trai) ? Math.round(phai - trai) : null,
    nhip: [...new Set(nhip)].sort((a, b) => a - b), soKhoi: con.length, motDau: motDau.length, motDauVd: motDau.slice(0, 5), dongDai: Math.round(dongDai),
    lopMain: main.className, khuon: document.body.dataset.khuon || "", caoTrang: document.documentElement.scrollHeight,
  };
})()`;
// Cài TRƯỚC khi tài liệu chạy: ghi vị trí trái của <main> ở mỗi khung hình + cộng layout-shift.
const THEO_DOI = `(() => { window.__xd = { trai: [], cls: 0, nguon: [] };
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__xd.cls += e.value; for (const s of e.sources || []) { const n = s.node; if (n && n.nodeType === 1) window.__xd.nguon.push((n.id ? "#" + n.id : n.tagName.toLowerCase() + (n.className && typeof n.className === "string" ? "." + n.className.split(" ")[0] : "")) + ":" + Math.round(s.previousRect.x) + "→" + Math.round(s.currentRect.x) + "x," + Math.round(s.previousRect.y) + "→" + Math.round(s.currentRect.y) + "y"); } } }).observe({ type: "layout-shift", buffered: true }); } catch {}
  const buoc = () => { const m = document.querySelector("main"); if (m) { const x = Math.round(m.getBoundingClientRect().left); const a = window.__xd.trai; if (a[a.length - 1] !== x) a.push(x); } requestAnimationFrame(buoc); };
  requestAnimationFrame(buoc); })()`;

// Đi tới url: chờ tài liệu tải xong rồi chờ DOM yên 500 ms (tối đa 6 s). Không dùng `di` của cdp.mjs: kết nối bảng tin (SSE) giữ bộ đếm mạng > 0 nên mỗi trang chờ đủ hạn 8 s.
const di = async (ngan, url) => {
  await ngan.s("Page.navigate", { url });
  const het = Date.now() + 6000;
  for (;;) { await sleep(120); if (await ngan.ev("document.readyState").catch(() => "") === "complete" || Date.now() > het) break; }
  await ngan.ev(`new Promise((xong) => { let t = setTimeout(xong, 500); const o = new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { o.disconnect(); xong(); }, 500); }); o.observe(document.body, { childList: true, subtree: true }); setTimeout(() => { o.disconnect(); xong(); }, ${"${Math.max(500, het - Date.now())}"}); })`).catch(() => {});
};
const ketQua = [];
mkdirSync(dirname(RA), { recursive: true });
if (ANH) mkdirSync(ANH, { recursive: true });
const chrome = await moChrome();
try {
  for (const bo of CHI_BO) {
    const info = maTran.bo[bo];
    const tk = tkTheoBo[bo];
    if (!info || !tk) { console.error("thiếu bộ / tài khoản", bo); continue; }
    const ngan = await chrome.moNgan();
    await ngan.cookie(await dangNhap(BASE, tk.phone, tk.pin), BASE);
    if (XE_DICH) await ngan.s("Page.addScriptToEvaluateOnNewDocument", { source: THEO_DOI });
    const dsTrang = info.trang.filter((p) => !["/home", "/danh-muc-giay-to"].includes(p) && (!CHI_TRANG || CHI_TRANG.includes(p)));
    for (const [w, h, mobile, may, nhanKho] of KHO) {
      await ngan.khung(w, h, mobile, 1, may);
      for (const p of dsTrang) {
        const url = BASE + p + coId(p);
        const o = { bo, trang: p, kho: nhanKho };
        try {
          await di(ngan, url);
          if (XE_DICH) { await sleep(300); await di(ngan, url); await sleep(600); o.xeDich = await ngan.ev("({ trai: window.__xd.trai, cls: +window.__xd.cls.toFixed(4), nguon: [...new Set(window.__xd.nguon)].slice(0, 6) })"); }
          if (JS) await ngan.ev(`${TRUOC_JS};${JS};0`);
          if (CSS) { await ngan.ev(`(() => { const s = document.createElement("style"); s.id = "xem-truoc-buoc-2"; s.textContent = ${JSON.stringify(CSS)}; document.head.append(s); })(); 0`); await sleep(250); }
          await sleep(200);
          o.do = await ngan.ev(DO);
          if (ANH) { await ngan.ev("scrollTo(0,0);0"); const f = join(ANH, `${NHAN}-${bo}-${tenTep(p)}-${nhanKho}.jpg`); await ngan.chup(f, false); if (co("--ca-trang")) await ngan.chup(f.replace(/\.jpg$/, "-ca-trang.jpg")); }
        } catch (e) { o.loi = String(e.message ?? e).slice(0, 200); }
        ketQua.push(o);
        const d = o.do ?? {};
        console.log(`${o.loi ? "✗" : "✓"} ${bo} ${p} ${nhanKho} main ${d.mainRong} lề ${d.leTrai}/${d.lePhai} nội dung ${d.noiDungRong} nhịp [${(d.nhip ?? []).join(",")}] một đầu ${d.motDau}${o.xeDich ? ` xê dịch [${o.xeDich.trai.join("→")}] CLS ${o.xeDich.cls}` : ""}${o.loi ? " " + o.loi : ""}`);
      }
    }
    await ngan.dong();
  }
} finally {
  writeFileSync(RA, JSON.stringify({ nhan: NHAN, luc: new Date().toISOString(), base: BASE, css: !!CSS, ketQua }, null, 1));
  await chrome.tat();
}
console.log("ghi", RA);
