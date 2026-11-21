// Đo BỐ CỤC BÊN TRONG từng màn cho đợt phân tích khung gốc 21/11/2026 (hồ sơ: docs/superpowers/specs/2026-11-21-khung-goc-giao-dien/).
// Lưới 15/11 (bước 2) chỉ quản viền ngoài của trang (lề, ba mức bề rộng, nhịp giữa các khối đầu trang). Kịch bản này đo phần lưới đó CHƯA quản:
//   - lớp bọc và các khối cấp 1 trong <main>: lệch trái / phải so với vùng nội dung, bề rộng, vỏ (viền / nền / bóng), đệm, bo góc, trần bề rộng riêng, cách chia cột;
//   - mọi «thẻ» (phần tử có vỏ) ở mọi tầng: bề rộng, đệm, bo góc, kiểu vỏ, lồng mấy tầng;
//   - tiêu đề (cỡ, đậm, lề), ô nhập (rộng, cao, vị trí nhãn), nút (cao, bo, lớp), bảng, thanh dính, cỡ chữ đang dùng, tên lớp đang dùng.
// Dùng lại bảng 87 màn của đợt 20/11 (bộ quyền, trang, mã bản ghi của kho thử) và khung Chrome của scripts/giao-dien/cdp.mjs. Chỉ đăng nhập và GET.
// Ảnh: mỗi màn một ảnh thường và một ảnh «kẻ khung» (vùng nội dung kẻ xanh đứt, khối cấp 1 kẻ đỏ, thẻ kẻ cam). Ảnh và số đo ghi NGOÀI kho.
//
// Chạy từ GỐC kho, máy chủ thử đang chạy:
//   node docs/evidence/2026-11-21-phan-tich-bo-cuc/kich-ban/do-bo-cuc.mjs [--base http://127.0.0.1:8835] [--tk ~/tourdao-danh-gia-2026-11-20/tai-khoan.json]
//     [--ra ~/tourdao-bo-cuc-2026-11-21] [--kho 390x844,1130x820,1440x900,1920x1080] [--anh 390x844,1130x820] [--so 1,2] [--css tệp.css --nhan sau]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { dangNhap, moChrome, sleep } from "../../../../scripts/giao-dien/cdp.mjs";

const lay = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const nha = (p) => resolve(p.replace(/^~/, homedir()));
const base = lay("--base", "http://127.0.0.1:8835");
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) { console.error("Chỉ đo trên máy chủ thử cục bộ."); process.exit(2); }
const ra = nha(lay("--ra", "~/tourdao-bo-cuc-2026-11-21"));
const rel = relative(resolve(process.cwd()), ra);
if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) { console.error(`--ra (${ra}) nằm trong kho: ảnh và số đo không được ghi vào kho.`); process.exit(2); }
const NHAN = lay("--nhan", "truoc");
const CSS = lay("--css") ? readFileSync(nha(lay("--css")), "utf8") : null;
const chon = lay("--so") ? new Set(lay("--so").split(",").map(Number)) : null;
const KHO = lay("--kho", "390x844,1130x820,1440x900,1920x1080").split(",").map((k) => { const [w, h] = k.split("x").map(Number); return { w, h, mobile: w < 600, nhan: k }; });
const KHO_ANH = new Set(lay("--anh", "390x844,1130x820").split(","));

const KHOA_TK = { SALES: "sales", INTERN: "intern", ACCOUNTING: "ketoan", ADMIN: "quantri", FIELD: "hdv", PARTNER: "ctv", SUPER_ADMIN: "toanquyen", DRIVER: "taixe", DRIVER_PARTNER: "taixedt", HR: "nhansu", SALES_MANAGER: "qlbh" };
const dsTk = Object.fromEntries(JSON.parse(readFileSync(nha(lay("--tk", "~/tourdao-danh-gia-2026-11-20/tai-khoan.json")), "utf8")).taiKhoan.map((t) => [t.khoa, t]));
const man = JSON.parse(readFileSync("docs/evidence/2026-11-20-danh-gia-lai-giao-dien/kich-ban/bang-man.json", "utf8") /* đường dẫn tính từ gốc kho */).man.filter((m) => !chon || chon.has(m.so));
const urlCua = (m) => base + m.trang + (m.don && !m.trang.includes("?") ? `?id=${m.don}` : "");
const soCua = (m) => `man-${String(m.so).padStart(3, "0")}`;

// Phép đo chạy TRONG trang. Mọi số đã làm tròn về điểm ảnh; «trai» / «phai» là khoảng lệch so với hai mép vùng nội dung của <main> (đã trừ đệm).
const DO = String.raw`(() => {
  const vw = innerWidth, vh = innerHeight, sy = scrollY;
  const R = (el) => el.getBoundingClientRect();
  const CS = (el) => getComputedStyle(el);
  const n = (v) => Math.round(parseFloat(v) || 0);
  const hien = (el) => { if (el.closest("details:not([open]) > :not(summary)")) return false; const r = R(el); if (r.width <= 1 || r.height <= 1) return false; const s = CS(el); return s.visibility !== "hidden" && s.display !== "none" && +s.opacity !== 0; };
  const trongLuong = (el) => { const p = CS(el).position; return p !== "fixed" && p !== "absolute"; };
  const ten = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += "#" + el.id; const c = [...el.classList].slice(0, 3).join("."); if (c) s += "." + c; return s; };
  const trong = (c) => !c || c === "transparent" || /rgba\(.*,\s*0\)$/.test(c);
  const nenCha = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const b = CS(p).backgroundColor; if (!trong(b)) return b; } return "rgb(255, 255, 255)"; };
  const vo = (el) => { const s = CS(el); const canh = ["Top", "Right", "Bottom", "Left"].filter((k) => parseFloat(s["border" + k + "Width"]) >= 1 && s["border" + k + "Style"] !== "none" && !trong(s["border" + k + "Color"])); const nen = !trong(s.backgroundColor) && s.backgroundColor !== nenCha(el); return { vien: canh.length, vienMau: canh.length ? s["border" + canh[0] + "Color"] : null, nen: nen ? s.backgroundColor : null, bong: !!(s.boxShadow && s.boxShadow !== "none") }; };
  const coVo = (v) => v.vien >= 3 || !!v.nen || v.bong;
  const main = document.querySelector("main");
  if (!main) return { loi: "không có main" };
  const mr = R(main), ms = CS(main);
  const cl = mr.left + parseFloat(ms.paddingLeft), cr = mr.right - parseFloat(ms.paddingRight);
  const viTri = (el) => { const r = R(el); return { trai: Math.round(r.left - cl), phai: Math.round(cr - r.right), rong: Math.round(r.width), cao: Math.round(r.height), y: Math.round(r.top + sy) }; };
  // Con đang hiện, trong luồng; phần tử «display: contents» (không có hộp riêng) thì lấy thẳng các con của nó. (Không dùng dấu huyền trong khối này: đang nằm trong chuỗi mẫu.)
  const conHien = (el) => [...el.children].flatMap((e) => CS(e).display === "contents" ? conHien(e) : (hien(e) && trongLuong(e) ? [e] : []));
  // Hàng ngang đầu tiên có từ hai con trở lên: cách khối này chia cột.
  const hang = (el) => { const nhom = []; for (const e of conHien(el)) { const r = R(e); const g = nhom.find((x) => r.top < x.day - 4 && r.bottom > x.top + 4 && r.left >= x.phai - 2); if (g) { g.khe.push(Math.round(r.left - g.phai)); g.rong.push(Math.round(r.width)); g.phai = r.right; g.day = Math.max(g.day, r.bottom); } else nhom.push({ top: r.top, day: r.bottom, phai: r.right, rong: [Math.round(r.width)], khe: [] }); } const h = nhom.filter((x) => x.rong.length >= 2 && x.rong.some((w) => w >= 120)); return h.length ? { cot: h[0].rong, khe: h[0].khe, soHang: h.length } : null; };
  const nhipCua = (ds) => { const a = []; for (let i = 1; i < ds.length; i++) { const p = R(ds[i - 1]), q = R(ds[i]); if (q.top >= p.bottom - 1) a.push(Math.round(q.top - p.bottom)); } return a; };
  // Mép trái của dòng chữ đầu tiên trong khối (so với mép trái vùng nội dung) và cách căn chữ: để soi «chữ đầu các khối có thẳng một hàng dọc không».
  const chuDau = (el) => { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); for (let x = w.nextNode(); x; x = w.nextNode()) { if (!x.textContent.trim()) continue; const p = x.parentElement; if (!p || !hien(p)) continue; const rg = document.createRange(); rg.selectNodeContents(x); const q = rg.getClientRects()[0]; if (q && q.width > 0) return { trai: Math.round(q.left - cl), canh: CS(p).textAlign, trongNut: !!p.closest("button, a, .nut, .btn, .huy-hieu, .badge, .vien") }; } return null; };
  const NUT = "button, a.nut, a.btn, a[class*='btn'], [role='button'], input[type='submit']";
  const moTa = (el) => { const s = CS(el), v = vo(el); return { ten: ten(el), ...viTri(el), vo: v, coVo: coVo(v), dem: [n(s.paddingTop), n(s.paddingRight), n(s.paddingBottom), n(s.paddingLeft)], bo: n(s.borderTopLeftRadius), ht: s.display, maxW: s.maxWidth === "none" ? null : s.maxWidth, mt: n(s.marginTop), mb: n(s.marginBottom), soCon: conHien(el).length, hang: hang(el), chuDau: chuDau(el), dac: { nut: el.matches(NUT) ? 1 : el.querySelectorAll(NUT).length, o: el.querySelectorAll("input:not([type='hidden']), select, textarea").length, bang: el.querySelectorAll("table").length, td: el.querySelectorAll("h1,h2,h3,h4").length, muc: el.querySelectorAll("li, tr").length, kyTu: (el.textContent || "").trim().length } }; };
  // Đi xuống qua các lớp bọc đơn (main chỉ có một con, con đó không có vỏ): ghi lại từng lớp bọc vì chính nó có thể tự bó bề rộng.
  let goc = main; const boc = [];
  for (let i = 0; i < 4; i++) { const c = conHien(goc); if (c.length === 1 && c[0].children.length > 0 && !/^(TABLE|UL|OL|DL|H1|H2|H3|P|DETAILS)$/.test(c[0].tagName) && !coVo(vo(c[0]))) { boc.push({ ten: ten(c[0]), ...viTri(c[0]), maxW: CS(c[0]).maxWidth === "none" ? null : CS(c[0]).maxWidth }); goc = c[0]; } else break; }
  const con1 = conHien(goc);
  const khoi = con1.map((el) => { const o = moTa(el); const c = conHien(el); o.nhipTrong = [...new Set(nhipCua(c))].sort((a, b) => a - b); const nhom = new Map(); for (const e of c) { const r = R(e); if (r.width < 120 || r.height < 24) continue; const k = ten(e); const g = nhom.get(k); if (g) g.lap++; else nhom.set(k, { ...moTa(e), lap: 1 }); } o.con = [...nhom.values()].slice(0, 12); return o; });
  // Mọi phần tử có vỏ («thẻ») ở mọi tầng; anh em cùng tên lớp gộp một dòng.
  const BO_QUA = /^(BUTTON|INPUT|SELECT|TEXTAREA|LABEL|TD|TH|TR|THEAD|TBODY|SPAN|SVG|IMG|SUMMARY|OPTION|CANVAS|PATH|B|STRONG|EM|I|SMALL|CODE)$/i;
  const tapThe = new Set(); const dsThe = [];
  for (const el of main.querySelectorAll("*")) { if (BO_QUA.test(el.tagName) || !hien(el)) continue; const r = R(el); if (r.width < 160 || r.height < 40) continue; if (el.tagName === "A" && r.height < 56) continue; if (!coVo(vo(el))) continue; tapThe.add(el); dsThe.push(el); }
  const the = []; const daThay = new Map(); const veThe = [];
  for (const el of dsThe) { let sau = 0; for (let p = el.parentElement; p && p !== main; p = p.parentElement) if (tapThe.has(p)) sau++; const k = ten(el) + "|" + sau; const g = daThay.get(k); const r = R(el); if (veThe.length < 400) veThe.push([Math.round(r.left), Math.round(r.top + sy), Math.round(r.width), Math.round(r.height)]); if (g) { g.lap++; continue; } const s = CS(el); const o = { ten: ten(el), sau, ...viTri(el), vo: vo(el), dem: [n(s.paddingTop), n(s.paddingRight), n(s.paddingBottom), n(s.paddingLeft)], bo: n(s.borderTopLeftRadius), lap: 1 }; daThay.set(k, o); the.push(o); }
  // Tiêu đề
  const td = new Map(); for (const el of main.querySelectorAll("h1,h2,h3,h4,h5,legend")) { if (!hien(el)) continue; const s = CS(el); const k = [el.tagName, s.fontSize, s.fontWeight, s.color, n(s.marginTop), n(s.marginBottom), s.textTransform].join("|"); const g = td.get(k); if (g) g.lap++; else td.set(k, { tag: el.tagName.toLowerCase(), lop: [...el.classList].slice(0, 2).join("."), co: parseFloat(s.fontSize), dam: s.fontWeight, mau: s.color, mt: n(s.marginTop), mb: n(s.marginBottom), hoa: s.textTransform, trai: Math.round(R(el).left - cl), chu: el.textContent.trim().slice(0, 28), lap: 1 }); }
  // Ô nhập và vị trí nhãn
  const oMap = new Map(); for (const el of main.querySelectorAll("input,select,textarea")) { const t = (el.getAttribute("type") || el.tagName).toLowerCase(); if (/^(hidden|checkbox|radio|file|range|color|submit|button|reset|image)$/.test(t) || !hien(el)) continue; const r = R(el), s = CS(el); let nhan = "khong"; const lb = (el.labels && el.labels[0]) || el.closest("label"); if (lb && hien(lb)) { const w = document.createTreeWalker(lb, NodeFilter.SHOW_TEXT); let q = null; for (let x = w.nextNode(); x; x = w.nextNode()) { if (!x.textContent.trim() || el.contains(x)) continue; const rg = document.createRange(); rg.selectNodeContents(x); q = rg.getBoundingClientRect(); if (q.width > 0) break; q = null; } if (q) nhan = q.bottom <= r.top + 3 ? "tren" : q.right <= r.left + 3 ? "trai" : q.left >= r.right - 3 ? "phai" : (q.top >= r.top - 2 && q.bottom <= r.bottom + 2) ? "trong" : "khac"; else nhan = "an"; } else if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.placeholder) nhan = "an"; const k = [t, Math.round(r.width), Math.round(r.height), nhan, s.fontSize, n(s.borderTopLeftRadius)].join("|"); const g = oMap.get(k); if (g) g.lap++; else oMap.set(k, { loai: t, lop: [...el.classList].slice(0, 2).join("."), rong: Math.round(r.width), cao: Math.round(r.height), co: parseFloat(s.fontSize), bo: n(s.borderTopLeftRadius), nhan, lap: 1 }); }
  // Nút (ngoài khung điều hướng)
  const nutMap = new Map(); for (const el of document.querySelectorAll("button, a.nut, a.btn, a[class*='btn'], [role='button'], input[type='submit']")) { if (!hien(el) || el.closest("#sidebar, #tabbar, header, .topbar, nav")) continue; const r = R(el), s = CS(el); if (r.height < 20) continue; const lop = [...el.classList].slice(0, 3).join("."); const k = [lop, el.dataset.cap || "", el.dataset.co || "", el.dataset.tong || "", Math.round(r.height), n(s.borderTopLeftRadius), s.backgroundColor, s.fontSize, s.fontWeight].join("|"); const g = nutMap.get(k); if (g) g.lap++; else nutMap.set(k, { lop, cap: el.dataset.cap || "", coData: el.dataset.co || "", tong: el.dataset.tong || "", cao: Math.round(r.height), rong: Math.round(r.width), coChu: parseFloat(s.fontSize), dam: s.fontWeight, bo: n(s.borderTopLeftRadius), nen: s.backgroundColor, mauChu: s.color, vien: n(s.borderTopWidth), chu: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24), trongMain: main.contains(el), lap: 1 }); }
  // Nút chính (kiểu cũ và kiểu mới): đứng ở đâu trong trang — trên / dưới, trái / phải, có dính đáy không.
  const nutChinh = []; for (const el of document.querySelectorAll(".btn-primary, .btn-accent, .btn-chinh, .nut[data-cap='chinh'], button[type='submit']")) { if (!hien(el) || el.closest("#sidebar, #tabbar, header, .topbar, nav") || nutChinh.length >= 8) continue; const r = R(el); let dinhO = ""; for (let p = el; p && p !== document.body; p = p.parentElement) { const vt = CS(p).position; if (vt === "fixed" || vt === "sticky") { dinhO = vt; break; } } nutChinh.push({ chu: (el.textContent || "").trim().slice(0, 28), lop: [...el.classList].slice(0, 3).join("."), trai: Math.round(r.left - cl), phai: Math.round(cr - r.right), rong: Math.round(r.width), y: Math.round(r.top + sy), yKhung: Math.round(r.top), dinh: dinhO, trongMain: main.contains(el) }); }
  // Bảng
  const bang =[...main.querySelectorAll("table")].filter(hien).map((t) => { const td0 = t.querySelector("tbody td") || t.querySelector("td"); const th0 = t.querySelector("th"); const s = td0 ? CS(td0) : null; let cuon = false; for (let p = t.parentElement; p && p !== main; p = p.parentElement) { const ox = CS(p).overflowX; if ((ox === "auto" || ox === "scroll") && p.scrollWidth > p.clientWidth + 1) { cuon = true; break; } } return { ten: ten(t), ...viTri(t), soCot: t.rows[0] ? t.rows[0].cells.length : 0, coO: s ? parseFloat(s.fontSize) : null, demO: s ? [n(s.paddingTop), n(s.paddingRight)] : null, caoDong: td0 ? Math.round(R(td0.parentElement).height) : null, coTh: th0 ? parseFloat(CS(th0).fontSize) : null, hoaTh: th0 ? CS(th0).textTransform : null, damTh: th0 ? CS(th0).fontWeight : null, cuon }; });
  // Thanh dính / nổi
  const dinh = []; for (const el of document.querySelectorAll("body *")) { const s = CS(el); if (s.position !== "fixed" && s.position !== "sticky") continue; if (!hien(el)) continue; const r = R(el); if (r.height < 32 || r.width < vw * 0.4) continue; dinh.push({ ten: ten(el), vt: s.position, top: Math.round(r.top), day: Math.round(vh - r.bottom), cao: Math.round(r.height), rong: Math.round(r.width), trongMain: main.contains(el) }); }
  // Cỡ chữ đang dùng (đếm theo số ký tự) và tên lớp đang dùng trong main
  const chu = new Map(); { const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT); for (let x = w.nextNode(); x; x = w.nextNode()) { const t = x.textContent.trim(); if (!t) continue; const p = x.parentElement; if (!p || !hien(p)) continue; const s = CS(p); const k = parseFloat(s.fontSize) + "/" + s.fontWeight; chu.set(k, (chu.get(k) || 0) + t.length); } }
  const lop = new Set(); for (const el of main.querySelectorAll("[class]")) for (const c of el.classList) lop.add(c);
  const sb = document.querySelector("#sidebar"); const sbr = sb && CS(sb).display !== "none" ? R(sb) : null;
  const tb = document.querySelector("#tabbar"); const tbr = tb && hien(tb) ? R(tb) : null;
  window.__xq = { nd: [Math.round(cl), Math.round(mr.top + sy), Math.round(cr - cl), Math.round(mr.height)], khoi: con1.map((el) => { const r = R(el); return [Math.round(r.left), Math.round(r.top + sy), Math.round(r.width), Math.round(r.height)]; }), the: veThe };
  return {
    vw, vh, caoTrang: document.documentElement.scrollHeight, tranNgang: document.documentElement.scrollWidth > vw + 1,
    rong: document.body.dataset.rong || "", lopBody: document.body.className, lopMain: main.className, tieuDe: (document.querySelector("#bar-title") || {}).textContent || document.title,
    thanhBen: sbr ? Math.round(sbr.width) : 0, thanhDuoi: tbr ? Math.round(tbr.height) : 0,
    main: { trai: Math.round(mr.left), rong: Math.round(mr.width), dem: [n(ms.paddingTop), n(ms.paddingRight), n(ms.paddingBottom), n(ms.paddingLeft)], noiDung: Math.round(cr - cl), maxW: ms.maxWidth },
    boc, khoi, nhip: nhipCua(con1), the, tieuDeTrong: [...td.values()], o: [...oMap.values()].slice(0, 80), nut: [...nutMap.values()].slice(0, 80), nutChinh, bang, dinh, duLieuBody: { ...document.body.dataset }, chu: Object.fromEntries(chu), lop: [...lop],
  };
})()`;
const KE_KHUNG = String.raw`(() => { const q = window.__xq; if (!q) return 0; const d = document.createElement("div"); d.id = "xq-ke-khung"; d.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none";
  const ve = (b, kieu) => { const e = document.createElement("div"); e.style.cssText = "position:absolute;box-sizing:border-box;left:" + b[0] + "px;top:" + b[1] + "px;width:" + b[2] + "px;height:" + b[3] + "px;" + kieu; d.append(e); };
  for (const b of q.the) ve(b, "border:2px solid rgba(255,140,0,.9)");
  for (const b of q.khoi) ve(b, "border:2px solid rgba(220,0,40,.95)");
  ve(q.nd, "border-left:2px dashed rgba(0,90,255,.95);border-right:2px dashed rgba(0,90,255,.95);background:rgba(0,90,255,.03)");
  document.body.append(d); return 1; })()`;

// Đi tới url: chờ tài liệu tải xong, rồi chờ DOM yên 500 ms và hết khung chờ (tối đa 7 s). Bảng tin (SSE) giữ mạng bận nên không chờ «mạng lặng».
const di = async (ngan, url) => {
  await ngan.s("Page.navigate", { url });
  const het = Date.now() + 7000;
  for (;;) { await sleep(120); if (await ngan.ev("document.readyState").catch(() => "") === "complete" || Date.now() > het) break; }
  const con = Math.max(600, het - Date.now());
  await ngan.ev(`new Promise((xong) => { const het = Date.now() + ${con}; let t; const thu = () => { if (Date.now() > het || !document.querySelector(".trang-thai-xuong, .xuong, [aria-busy='true']")) { o.disconnect(); xong(); } else t = setTimeout(thu, 300); }; const o = new MutationObserver(() => { clearTimeout(t); t = setTimeout(thu, 500); }); o.observe(document.body, { childList: true, subtree: true }); t = setTimeout(thu, 500); })`).catch(() => {});
};
const chupCat = async (ngan, tep, caoToiDa) => {
  const cao = await ngan.ev(`Math.min(document.documentElement.scrollHeight, ${caoToiDa})`); const rong = await ngan.ev("innerWidth");
  const r = await ngan.s("Page.captureScreenshot", { format: "jpeg", quality: 62, captureBeyondViewport: true, clip: { x: 0, y: 0, width: rong, height: cao, scale: 1 } });
  if (!r.result?.data) throw new Error(`chụp lỗi: ${JSON.stringify(r.error ?? r).slice(0, 160)}`);
  writeFileSync(tep, Buffer.from(r.result.data, "base64"));
};

mkdirSync(join(ra, "so-do"), { recursive: true });
mkdirSync(join(ra, "anh", NHAN), { recursive: true });
const tepRa = join(ra, "so-do", `bo-cuc-${NHAN}.json`);
const ketQua = existsSync(tepRa) && chon ? JSON.parse(readFileSync(tepRa, "utf8")).ketQua.filter((x) => !chon.has(x.so)) : [];
const theoBo = new Map();
for (const m of man) { if (!theoBo.has(m.bo)) theoBo.set(m.bo, []); theoBo.get(m.bo).push(m); }
const chrome = await moChrome();
let hong = 0;
try {
  for (const [bo, ds] of theoBo) {
    const ngan = await chrome.moNgan();
    if (bo !== "KHACH") { const tk = dsTk[KHOA_TK[bo]]; await ngan.cookie(await dangNhap(base, tk.sdt, tk.pin), base); }
    for (const k of KHO) {
      await ngan.khung(k.w, k.h, k.mobile, 1, k.mobile ? "iphone" : "may-tinh");
      for (const m of ds) {
        const o = { so: m.so, ho: m.ho, bo, trang: m.trang.split("?")[0], kho: k.nhan };
        try {
          await di(ngan, urlCua(m));
          if (CSS) { await ngan.ev(`(() => { const s = document.createElement("style"); s.id = "xem-truoc-khung-goc"; s.textContent = ${JSON.stringify(CSS)}; document.head.append(s); })(); 0`); await sleep(300); }
          await ngan.ev("scrollTo(0,0);0"); await sleep(150);
          o.do = await ngan.ev(DO);
          if (o.do?.loi) throw new Error(o.do.loi);
          if (KHO_ANH.has(k.nhan)) {
            const goc = join(ra, "anh", NHAN, `${soCua(m)}-${k.w}`);
            await chupCat(ngan, `${goc}.jpg`, 2600);
            await ngan.ev(KE_KHUNG); await sleep(80);
            await chupCat(ngan, `${goc}-ke-khung.jpg`, 2600);
          }
        } catch (e) { o.loi = String(e.message ?? e).slice(0, 200); hong++; }
        ketQua.push(o);
        const d = o.do ?? {};
        console.log(`${o.loi ? "✗" : "✓"} ${soCua(m)} ${bo}:${o.trang} @${k.nhan} mức ${d.rong || "—"} nội dung ${d.main?.noiDung} bọc ${d.boc?.length ?? 0} khối ${d.khoi?.length ?? 0} thẻ ${d.the?.length ?? 0}${o.loi ? " " + o.loi : ""}`);
      }
    }
    await ngan.dong();
  }
} finally {
  ketQua.sort((a, b) => a.so - b.so || a.kho.localeCompare(b.kho, "en", { numeric: true }));
  writeFileSync(tepRa, JSON.stringify({ nhan: NHAN, luc: new Date().toISOString(), base, css: !!CSS, kho: KHO.map((k) => k.nhan), ketQua }));
  await chrome.tat();
}
console.log(`Ghi ${tepRa}: ${ketQua.length} ô, ${hong} ô hỏng.`);
process.exit(hong ? 2 : 0);
