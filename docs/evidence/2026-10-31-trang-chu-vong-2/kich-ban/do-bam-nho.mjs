// Kịch bản Chrome vòng 2 (31/10/2026): (A) bề rộng nội dung của MỌI trang chính ở bốn khổ; (B) Trang chủ máy tính với DỮ LIỆU NẶNG.
// Chạy từ GỐC worktree sau `npm run build:web`:  PHA=truoc|sau node docs/evidence/2026-10-31-trang-chu-vong-2/kich-ban/do-trang-chu-vong-2.mjs
// Cơ chế: startEnv của A2 (D1 tạm + wrangler dev, KHÔNG đọc .env / .dev.vars) + dò lỗi hiển thị của phiên đánh giá khung.
// Dữ liệu nặng của Trang chủ: 54 khoản chờ đối chiếu (40 quá 3 ngày), 7 đơn huỷ còn người chưa nộp tiền, 1 góp ý mới — chèn bằng cách thay phản hồi của 4 route đọc
// (/api/ledger/coc, /coc/dem, /api/feedback, /api/feedback/badge) TRONG TRÌNH DUYỆT (Page.addScriptToEvaluateOnNewDocument), dạng đúng theo src/shared/contracts.ts. Phần còn lại (đơn, đơn chờ xác nhận) là dữ liệu thật trong D1 tạm.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const PHA = "responsive";
const OUT = "docs/evidence/2026-10-31-trang-chu-vong-2";
const ANH = `${OUT}/anh-responsive`;
mkdirSync(ANH, { recursive: true });
const DO_LOI = readFileSync("docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/do-loi-hien-thi.js", "utf8");

const TODAY = vnDate(0), TOMORROW = vnDate(1), LATER = vnDate(10);

// ---- Dữ liệu nặng (giả ở trình duyệt) ----
const TEN_BEN = ["Đại lý Du lịch Biển Xanh Nha Trang", "Nhà hàng Hải Sản Bình Dân Vịnh Nha Trang", "Công ty TNHH Dịch vụ Lữ hành Sao Biển", "Lễ tân khách sạn Mường Thanh"];
const doiChieu = Array.from({ length: 54 }, (_, i) => {
  const loai = i % 3 === 0 ? "cong_ty" : i % 3 === 1 ? "ben_dat" : "nha_cung_cap";
  return { receiptId: `rc-${i}`, orderId: `ord-${i}`, maDon: `TD-202610${18 + (i % 2)}-${String(i + 1).padStart(4, "0")}`, soTien: [30000, 3000000, 100000, 1300000, 200000, 12345000][i % 6], ngayKhai: i % 2 ? "2026-10-19" : "2026-10-18", qua3Ngay: process.env.QUA_CUOI ? i >= 14 : i < 40, /* QUA_CUOI=1: 40 khoản quá hạn nằm CUỐI danh sách (ca S1 của phiên kiểm độc lập) */ loai, benKia: loai === "cong_ty" ? null : TEN_BEN[i % 4] };
});
const coc = {
  canChi: [], donHuyGiuCoc: [],
  conNguoiGiu: ["Lễ tân khách sạn", "Nguyễn Phú Hải", "HDVTA4", "Lễ tân khách sạn", "Nguyễn Phú Hải", "Nguyễn Phú Hải", "Lễ tân khách sạn"].map((nguoi, i) => ({ orderId: `huy-${i}`, maDon: `TD-20261018-00${12 + i}`, nguoi, soTien: [200000, 100000, 100000, 100000, 100000, 100000, 1020000][i] })),
  doiChieu,
};
const dem = { canChi: 0, duyetQua7Ngay: 0, sapHetHan: 0, conNguoiGiu: 7, doiChieuQua3Ngay: 40 };
const gopY = { tickets: [{ id: "yc-23", code: "YC-0023", kindName: "Báo lỗi", status: "NEW", statusName: "Mới", lastPublicReplyAt: null, title: "Lỗi thử" }], stats: [] };
const MOCK = `(() => {
  const that = window.fetch.bind(window);
  const tra = (o) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });
  const coc = ${JSON.stringify(coc)}, dem = ${JSON.stringify(dem)}, gopY = ${JSON.stringify(gopY)};
  window.fetch = (input, init) => {
    const u = new URL(typeof input === "string" ? input : input.url, location.href);
    const m = (init?.method ?? "GET").toUpperCase();
    if (m === "GET" && u.pathname === "/api/ledger/coc") return Promise.resolve(tra(coc));
    if (m === "GET" && u.pathname === "/api/ledger/coc/dem") return Promise.resolve(tra(dem));
    if (m === "GET" && u.pathname === "/api/feedback") return Promise.resolve(tra(gopY));
    if (m === "GET" && u.pathname === "/api/feedback/badge") return Promise.resolve(tra({ mine: 0, queue: 1 }));
    return that(input, init);
  };
})()`;

const env = await startEnv();
const mo = async (acc, path, { width, height, mobile }, nang) => {
  const p = await env.openPage({ width, height, mobile });
  const c = await env.login(acc);
  await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
  if (nang) await p.send("Page.addScriptToEvaluateOnNewDocument", { source: MOCK });
  await p.send("Page.navigate", { url: env.base + path });
  await p.waitFor("document.readyState === 'complete'", `trang ${path}`);
  return p;
};
const chup = async (p, ten) => { const r = await p.send("Page.captureScreenshot", { format: "jpeg", quality: 62 }); writeFileSync(`${ANH}/${ten}.jpg`, Buffer.from(r.result.data, "base64")); };
const DO = async (p) => { const k = await p.ev(DO_LOI); k.cat = k.cat.filter((c) => !/visually-hidden/.test(c.el)); return { cat: k.cat.length, che: k.che.length, tran: k.tran.length, chiTiet: { cat: k.cat.slice(0, 4), che: k.che.slice(0, 4), tran: k.tran.slice(0, 4) } }; };
// Trang chủ: chồng lấn giữa các khối, khối rỗng, vùng bấm < 44px ở các thành phần MỚI của vòng 2.
const XEM = `(() => {
  const thay = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const ids = ['#dash-dai','#dash-tim','#dash-o','#dash-so','#dash-cho-dt','#dash-loi-tat','#dash-gap','#dash-today','#dash-review','#dash-doi-chieu','#dash-thu-truoc','#dash-dang-cho','#dash-so-mt'];
  const kh = ids.map((s) => [s, document.querySelector(s)]).filter(([, e]) => thay(e)).map(([s, e]) => [s, e.getBoundingClientRect()]);
  const chong = [];
  for (let i = 0; i < kh.length; i++) for (let j = i + 1; j < kh.length; j++) { const a = kh[i][1], b = kh[j][1]; const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (w > 2 && h > 2) chong.push(kh[i][0] + ' x ' + kh[j][0]); }
  const rong = kh.filter(([s, r]) => r.height < 24 || (s !== '#dash-gap' && !document.querySelector(s).innerText.trim() && !document.querySelector(s).querySelector('svg,img,canvas'))).map(([s]) => s);
  const bam = [...document.querySelectorAll('.dash-ct-nut, .dash-loi-tat .dash-o-muc, #dash-o .dash-o-muc, .dash-day, .dash-dc-dong, .dash-gap .btn, #dash-doi-chieu button, .dash-today-all')].filter(thay).map((e) => { const r = e.getBoundingClientRect(); return [e.className.toString().split(' ')[0], Math.round(r.width), Math.round(r.height)]; }).filter(([, w, h]) => h < 44 || w < 44);
  const cot = getComputedStyle(document.querySelector('#dash-grid')).gridTemplateColumns;
  return { vw: innerWidth, scrollW: document.documentElement.scrollWidth, chong, rong, bamNho: bam.slice(0, 6), soBamNho: bam.length, hienDoiChieu: thay(document.querySelector('#dash-doi-chieu')), hienLoiTat: thay(document.querySelector('#dash-loi-tat')), hienGap: thay(document.querySelector('#dash-gap')), cot: thay(document.querySelector('#dash-grid')) ? cot : null, caoTrang: document.documentElement.scrollHeight };
})()`;
const DO_RONG = `({ vw: innerWidth, scrollW: document.documentElement.scrollWidth, main: Math.round(document.querySelector('main').getBoundingClientRect().width) })`;

const TODAY0 = 0;
const BAM = `(() => [...document.querySelectorAll('main a, main button, main summary, main input:not([type=hidden]), main select')].filter((e) => e.getClientRects().length > 0).map((e) => { const r = e.getBoundingClientRect(); return { lop: (e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 2).join('.')), chu: (e.innerText || e.value || e.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim().slice(0, 30), rong: Math.round(r.width), cao: Math.round(r.height), trongMuc: !!e.closest('li, .dash-ct-dong, p, .muted') }; }).filter((x) => x.cao < 40 || x.rong < 40))()`;
const KQ = [];
try {
  for (const [ten, w, h] of [["768x1024", 768, 1024], ["390x844", 390, 844], ["1280x720", 1280, 720]]) {
    const p = await mo(ACCOUNTS.chu, "/", { width: w, height: h, mobile: w < 900 }, true);
    try {
      await p.waitFor("!document.querySelector('#dash-grid')?.hidden", "lưới", 20000); await sleep(700);
      const ds = await p.ev(BAM);
      KQ.push({ kho: ten, ds });
      console.log(`· ${ten}: ${ds.length} phần tử < 40px`); for (const x of ds) console.log("   ", x.lop, `«${x.chu}»`, x.rong + "x" + x.cao, x.trongMuc ? "(liên kết chữ trong dòng/đoạn)" : "");
    } finally { p.close(); }
  }
  writeFileSync(`${OUT}/so-lieu-bam-nho.json`, JSON.stringify(KQ, null, 1));
} finally { await env.stop(); }
