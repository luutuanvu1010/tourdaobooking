// ĐO TỐC ĐỘ CẢM NHẬN (mặt 11 của đề bài 27/10/2026 — tiêu chí số 1 của chủ): Chrome headless + CDP, mạng 4G CHẬM giả lập theo bộ Lighthouse di động
// (tải 1,6 Mbit/s, gửi 750 kbit/s, trễ 150 ms) và CPU chậm 4 lần; khung 390×844 di động. Hai lượt mỗi trang: LẠNH (ngăn trình duyệt mới, chưa có service worker,
// chưa có bộ nhớ đệm) và NÓNG (mở lại lần hai trong cùng ngăn: khung do service worker phục vụ, dữ liệu API vẫn qua mạng — đúng cảnh dùng hằng ngày trên iPhone).
// Số đo mỗi lượt (ms, tính từ lúc bắt đầu điều hướng): TTFB, FCP (vẽ nội dung đầu), LCP, DCL, load, «khung xong» (thanh trên / thanh tab / thanh bên đã có trong
// DOM — do bản nhớ khung ADR-0035), «nội dung xong» (lần biến đổi DOM đáng kể cuối cùng trước 700 ms yên lặng — ước lượng lúc dữ liệu API đã vẽ), CLS (tổng
// layout-shift không do người dùng), tổng việc dài (long task > 50 ms, tính TBT sau FCP), có khung xương / dòng «Đang tải» hay không, cỡ tải (byte chuyển qua mạng
// theo loại: tài liệu, JS, CSS, phông, API) và số yêu cầu API. Thêm: CHUYỂN TRANG (bấm mục thanh tab / thanh bên → FCP và nội dung xong của trang kế, tính từ lúc
// bấm) và PHẢN HỒI CHẠM (bấm một nút mở bảng trượt / bộ lọc → lần biến đổi DOM đầu tiên).
// Chạy từ GỐC kho, máy chủ thử đang chạy; nên chạy KHI MÁY RẢNH (không chạy cùng quét đo khác) vì CPU chậm 4× đo theo đồng hồ thật:
//   node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/do-toc-do.mjs --base http://localhost:8795 --d1 ~/tourdao-ux-2026-10-27-v2/d1 [--bo SUPER_ADMIN,DRIVER_PARTNER] [--trang /orders,…] [--lap 2]
// Kết quả: docs/evidence/2026-10-27-danh-gia-ux-tong-the/so-lieu/toc-do.json (+ bảng in ra màn hình).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dangNhap, moChrome, sleep } from "./cdp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://localhost:8795");
const D1 = arg("--d1", join(homedir(), "tourdao-ux-2026-10-27-v2", "d1"));
const LAP = Number(arg("--lap", "1"));
const CHI_BO = arg("--bo", "SUPER_ADMIN,DRIVER_PARTNER").split(",");
const CHI_TRANG = arg("--trang") ? arg("--trang").split(",") : null;
const maTran = JSON.parse(readFileSync(join(EVID, "ma-tran-quyen.json"), "utf8"));
const dsTk = JSON.parse(readFileSync(arg("--tk", join(HERE, "tai-khoan.json")), "utf8")).taiKhoan;
const tkTheoBo = {};
for (const t of dsTk) { const bo = String(t.bo).split("+")[0]; if (!tkTheoBo[bo]) tkTheoBo[bo] = t; }

const sql = (q) => { try { return JSON.parse(execFileSync("npx", ["wrangler", "d1", "execute", "tourdao-sales-db", "--local", "--persist-to", D1, "--json", "--command", q], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, CI: "1" } }))[0].results; } catch { return []; } };
const mot = (q) => sql(q)[0]?.id ?? null;
const ID = { order: mot("SELECT id FROM orders WHERE status <> 'draft' ORDER BY created_at DESC LIMIT 1"), trip: mot("SELECT id FROM vc_trip ORDER BY created_at DESC LIMIT 1"), xe: mot("SELECT id FROM vc_vehicle LIMIT 1"), ve: mot("SELECT id FROM fbk_ticket ORDER BY created_at DESC LIMIT 1") };
const coId = (p) => ({ "/order": ID.order && `?id=${ID.order}`, "/chuyen": ID.trip && `?id=${ID.trip}`, "/xe-chi-tiet": ID.xe && `?id=${ID.xe}`, "/cuoc-chuyen": ID.trip && `?id=${ID.trip}`, "/feedback": ID.ve && `?id=${ID.ve}` }[p] ?? "");

// Lighthouse "mobile slow 4G" (devtools throttling): 1,6 Mbit/s xuống, 750 kbit/s lên, 150 ms RTT; CPU ×4.
const MANG_4G = { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 };
const CPU = 4;

/** Đoạn cài vào MỌI tài liệu mới: ghi mốc khung xong / nội dung xong / khung xương / layout shift / long task / LCP; đọc mốc bấm của trang trước (chuyển trang). */
const CAI_SAN = `
(() => {
  const S = window.__ux = { khungXong: null, bienDoi: [], khungXuong: false, dangTai: false, cls: 0, longTasks: [], lcp: null, bam: Number(sessionStorage.getItem('__ux_bam') || 0) };
  sessionStorage.removeItem('__ux_bam');
  const now = () => performance.now();
  const mo = new MutationObserver((ds) => {
    let dang = 0;
    for (const m of ds) dang += m.addedNodes.length + m.removedNodes.length + (m.type === 'characterData' ? 1 : 0);
    if (dang === 0) return;
    S.bienDoi.push([now(), dang]);
    // Thẻ <header id="topbar"> có sẵn (rỗng) trong HTML tĩnh; «khung xong» = thanh trên đã có con, hoặc thanh tab / thanh bên đã được dựng.
    if (S.khungXong === null && ((document.getElementById('topbar')?.children.length ?? 0) > 0 || document.getElementById('tabbar') || document.getElementById('sidebar'))) S.khungXong = now();
    if (!S.khungXuong && document.querySelector('[class*=skeleton], [class*=khung-xuong], [aria-busy=true]')) S.khungXuong = true;
    if (!S.dangTai && /Đang tải/.test(document.body?.innerText || '')) S.dangTai = true;
  });
  mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) S.cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) S.longTasks.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) S.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
})();`;

const DOC_SO = `(() => {
  const S = window.__ux || {};
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const fcp = performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint')?.startTime ?? null;
  // Nội dung xong: biến đổi DOM đáng kể (≥ 3 nút) cuối cùng mà sau nó yên lặng ≥ 700 ms.
  const bd = (S.bienDoi || []).filter(([, n]) => n >= 3);
  let noiDung = null;
  for (let i = bd.length - 1; i >= 0; i--) { const t = bd[i][0]; const sau = bd.slice(i + 1).find(([u]) => u - t < 700); if (!sau) { noiDung = t; break; } }
  const tbt = (S.longTasks || []).filter(([s]) => s >= (fcp ?? 0)).reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
  const res = performance.getEntriesByType('resource');
  const loai = (r) => /\\/api\\//.test(r.name) ? 'api' : r.initiatorType === 'css' || /\\.css(\\?|$)/.test(r.name) ? 'css' : /\\.woff2/.test(r.name) ? 'phong' : /\\.js(\\?|$)/.test(r.name) ? 'js' : r.initiatorType === 'img' || /\\.(png|jpg|svg)/.test(r.name) ? 'anh' : 'khac';
  const tai = {};
  for (const r of res) { const k = loai(r); tai[k] = tai[k] || { so: 0, byte: 0, giai: 0 }; tai[k].so++; tai[k].byte += r.transferSize || 0; tai[k].giai += r.decodedBodySize || 0; }
  const apiMax = Math.max(0, ...res.filter((r) => loai(r) === 'api').map((r) => r.responseEnd));
  return {
    ttfb: nav.responseStart, fcp, lcp: S.lcp ?? null, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, khungXong: S.khungXong, noiDungXong: noiDung, apiCuoiVe: apiMax,
    cls: +(S.cls || 0).toFixed(4), tbt: Math.round(tbt), soLongTask: (S.longTasks || []).length, khungXuong: !!S.khungXuong, dangTai: !!S.dangTai,
    taiLieuByte: nav.transferSize || 0, tai, bam: S.bam || 0, chuyenTrangFcp: S.bam ? Math.round(Date.now() - S.bam - (performance.now() - (fcp ?? 0))) : null,
    chuyenTrangNoiDung: S.bam && noiDung ? Math.round(Date.now() - S.bam - (performance.now() - noiDung)) : null,
    tieuDe: document.title, duong: location.pathname,
  };
})()`;

const chrome = await moChrome();
const ketQua = [];
const r = (x) => (x == null ? "—" : Math.round(x));
try {
  for (const bo of CHI_BO) {
    const tk = tkTheoBo[bo];
    if (!tk) { console.log(`⚠ thiếu tài khoản ${bo}`); continue; }
    const info = maTran.bo[bo];
    const dsTrang = (bo === CHI_BO[0] ? info.trang : info.trang.filter((p) => !maTran.bo[CHI_BO[0]].trang.includes(p))).filter((p) => !["/home", "/danh-muc-giay-to"].includes(p));
    for (const duong of [...dsTrang, ...(bo === CHI_BO[0] ? ["/login"] : [])]) {
      if (CHI_TRANG && !CHI_TRANG.includes(duong)) continue;
      for (let lan = 0; lan < LAP; lan++) {
        const ngan = await chrome.moNgan();
        try {
          await ngan.s("Page.addScriptToEvaluateOnNewDocument", { source: CAI_SAN });
          await ngan.khung(390, 844, true);
          await ngan.s("Network.emulateNetworkConditions", MANG_4G);
          await ngan.s("Emulation.setCPUThrottlingRate", { rate: CPU });
          if (duong !== "/login") { const c = await dangNhap(BASE, tk.sdt, tk.pin); await ngan.cookie(c, BASE); }
          const url = BASE + duong + coId(duong);
          const o = { bo, trang: duong, lan };
          // LẠNH
          await ngan.di(url); await sleep(1500);
          o.lanh = await ngan.ev(DOC_SO);
          // Chờ service worker cài xong và NẠP SẴN xong (PRECACHE ~104 mục, tải trong ngữ cảnh SW — không bị mạng giả lập của trang kẹp): tắt
          // kẹp trong lúc chờ để không đo nhầm phần tải nền này vào lượt nóng; ghi lại số mục đã vào cache và thời gian chờ.
          await ngan.s("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
          await ngan.s("Emulation.setCPUThrottlingRate", { rate: 1 });
          const t0 = Date.now(); let truoc = -1, on = 0, soCache = 0;
          for (;;) {
            await sleep(500);
            soCache = await ngan.ev("caches.keys().then(async (ks) => { let n = 0; for (const k of ks) n += (await (await caches.open(k)).keys()).length; return n; })").catch(() => 0);
            on = soCache === truoc ? on + 500 : 0; truoc = soCache;
            if ((on >= 2000 && soCache > 0) || Date.now() - t0 > 60000) break;
          }
          o.napSan = { soMuc: soCache, choMs: Date.now() - t0, coSW: await ngan.ev("!!navigator.serviceWorker.controller || navigator.serviceWorker.getRegistration().then((r) => !!r)").catch(() => false) };
          await ngan.s("Network.emulateNetworkConditions", MANG_4G);
          await ngan.s("Emulation.setCPUThrottlingRate", { rate: CPU });
          // NÓNG (service worker đã cài; mở lại cùng trang — khung từ cache, API vẫn qua mạng 4G chậm)
          await ngan.di(url); await sleep(1500);
          o.nong = await ngan.ev(DOC_SO);
          o.loiConsole = [...ngan.loi];
          ketQua.push(o);
          console.log(`${bo.padEnd(14)} ${duong.padEnd(22)} lạnh: FCP ${r(o.lanh.fcp)} LCP ${r(o.lanh.lcp)} khung ${r(o.lanh.khungXong)} nội dung ${r(o.lanh.noiDungXong)} CLS ${o.lanh.cls} TBT ${o.lanh.tbt} | nóng: FCP ${r(o.nong.fcp)} nội dung ${r(o.nong.noiDungXong)} CLS ${o.nong.cls} | JS ${r((o.lanh.tai.js?.giai ?? 0) / 1024)}K`);
        } catch (e) {
          ketQua.push({ bo, trang: duong, lan, loi: String(e).slice(0, 300) });
          console.log(`✗ ${bo} ${duong}: ${String(e).slice(0, 200)}`);
        } finally { await ngan.dong().catch(() => {}); }
      }
    }
  }

  // CHUYỂN TRANG + PHẢN HỒI CHẠM: Toàn quyền, khung 390 (thanh tab) và 1040 (thanh bên), cùng điều kiện 4G chậm + CPU ×4, trong cùng ngăn (nóng).
  // Bỏ qua khi chạy thử từng trang (--trang) để không đăng nhập (đăng nhập đá phiên của lượt quét đang chạy — ADR-0075).
  const tk = tkTheoBo[CHI_BO[0]];
  const chuyen = [];
  for (const [w, h, mobile, chonLink] of CHI_TRANG ? [] : [[390, 844, true, "#tabbar a[href='/orders'], #tabbar a[href='/order-form'], #tabbar a[href='/']"], [1040, 800, false, "#sidebar a[href='/orders'], #sidebar a[href='/order-form'], #sidebar a[href='/']"]]) {
    const ngan = await chrome.moNgan();
    try {
      await ngan.s("Page.addScriptToEvaluateOnNewDocument", { source: CAI_SAN });
      await ngan.khung(w, h, mobile);
      await ngan.s("Network.emulateNetworkConditions", MANG_4G);
      await ngan.s("Emulation.setCPUThrottlingRate", { rate: CPU });
      const c = await dangNhap(BASE, tk.sdt, tk.pin); await ngan.cookie(c, BASE);
      await ngan.di(BASE + "/"); await sleep(1500); await ngan.di(BASE + "/"); await sleep(1500); // làm nóng
      for (const dich of ["/orders", "/order-form", "/"]) {
        const sel = chonLink.split(", ").find((s) => s.includes(`'${dich}'`));
        const co = await ngan.ev(`(() => { const a = document.querySelector(${JSON.stringify(sel)}); if (!a) return false; sessionStorage.setItem('__ux_bam', String(Date.now())); a.click(); return true; })()`);
        if (!co) { chuyen.push({ kho: w, dich, loi: "không thấy mục điều hướng " + sel }); continue; }
        const het = Date.now() + 15000;
        for (;;) { await sleep(200); const d = await ngan.ev("location.pathname").catch(() => null); if (d === dich || Date.now() > het) break; }
        await sleep(1800);
        const so = await ngan.ev(DOC_SO);
        chuyen.push({ kho: w, dich, chuyenTrangFcp: so.chuyenTrangFcp, chuyenTrangNoiDung: so.chuyenTrangNoiDung, fcp: so.fcp, noiDungXong: so.noiDungXong });
        console.log(`chuyển ${w} → ${dich}: bấm→FCP ${so.chuyenTrangFcp} ms, bấm→nội dung ${so.chuyenTrangNoiDung} ms`);
      }
      // Phản hồi chạm: ở /orders bấm nút «Lọc» (mở bảng trượt); ở / bấm «Tất cả» nếu có.
      const cham = [];
      for (const [duong, chuNut] of [["/orders", "Lọc"], ["/", "Tất cả"]]) {
        await ngan.di(BASE + duong); await sleep(1800);
        const ms = await ngan.ev(`new Promise((res) => { const b = [...document.querySelectorAll('button, a')].find((x) => x.offsetParent !== null && x.textContent.trim().startsWith(${JSON.stringify(chuNut)})); if (!b) return res(null); const t0 = performance.now(); const mo = new MutationObserver(() => { mo.disconnect(); res(Math.round(performance.now() - t0)); }); mo.observe(document.body, { childList: true, subtree: true, attributes: true }); b.click(); setTimeout(() => { mo.disconnect(); res(-1); }, 3000); })`);
        cham.push({ kho: w, trang: duong, nut: chuNut, ms });
        console.log(`chạm ${w} ${duong} «${chuNut}» → biến đổi DOM đầu tiên sau ${ms} ms`);
      }
      chuyen.push({ kho: w, cham });
    } catch (e) { chuyen.push({ kho: w, loi: String(e).slice(0, 300) }); console.log(`✗ chuyển trang ${w}: ${String(e).slice(0, 200)}`); }
    finally { await ngan.dong().catch(() => {}); }
  }
  ketQua.push({ chuyenTrang: chuyen });
} finally {
  await chrome.tat();
  mkdirSync(join(EVID, "so-lieu"), { recursive: true });
  const ra = join(EVID, "so-lieu", `toc-do${CHI_TRANG ? "-tung-trang" : ""}.json`);
  writeFileSync(ra, JSON.stringify({ luc: new Date().toISOString(), base: BASE, dieuKien: { mang: "4G chậm (Lighthouse di động): 1,6 Mbit/s xuống, 750 kbit/s lên, trễ 150 ms", cpu: "chậm 4×", khung: "390×844 di động" }, ketQua }, null, 1));
  console.log(`Ghi ${ra}`);
}
