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
const KHO = [["tablet dọc 768x1024", 768, 1024, true], ["tablet dọc 820x1180", 820, 1180, true], ["đt ngang 844x390", 844, 390, true], ["đt 390x844", 390, 844, true], ["cửa sổ 899x700", 899, 700, false], ["cửa sổ 900x700", 900, 700, false]];
const DAY = `(async () => {
  window.scrollTo(0, document.documentElement.scrollHeight); await new Promise((r) => setTimeout(r, 250));
  const tb = document.querySelector('#tabbar'); const tbHien = !!tb && tb.getClientRects().length > 0; const tbTop = tbHien ? tb.getBoundingClientRect().top : innerHeight;
  const m = document.querySelector('main'); const cs = getComputedStyle(m);
  // phần tử cuối thật sự thấy được trong main (lá cuối cùng có chữ/nút)
  const la = [...m.querySelectorAll('a, button, li, p, span, h2, h3, div')].filter((e) => e.getClientRects().length > 0 && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 400 && (e.innerText || '').trim()).map((e) => ({ e, b: e.getBoundingClientRect().bottom })).sort((a, b) => b.b - a.b)[0];
  return { tabbar: tbHien, tabbarTop: Math.round(tbTop), tabbarCao: tbHien ? Math.round(tb.getBoundingClientRect().height) : 0, mainPadDay: cs.paddingBottom, mainDay: Math.round(m.getBoundingClientRect().bottom), laCuoiDay: Math.round(la?.b ?? 0), laCuoi: (la?.e.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 40), biChe: tbHien && la ? Math.round(la.b - tbTop) : 0, scrollY: Math.round(scrollY), cao: document.documentElement.scrollHeight, vh: innerHeight, bodyLop: document.body.className };
})()`;
const KQ = { dong: [] };
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const svc = ({ departDate, pickupTime, pickupPlace, adult }) => ({ kind: "catalog", pickupChoice: "DON", catalogCode: "TTB06", pax: { adult, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800_000 }, departDate, departTime: "", pickupTime, pickupPlace, checkinDate: "", checkinTime: "", checkinPlace: "", note: "" });
  const r = await call(ACCOUNTS.chu, "POST", "/api/orders", { customerName: "Nguyễn Văn Thử", customerPhone: "0900000401", customerEmail: "", customerNote: "", services: [svc({ departDate: TODAY, pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", adult: 3 })], discount: 0, paymentNote: "" });
  assert.equal(r.status, 201);
  const o = r.json.order;
  const TRANG = [["Trang chủ nặng", "/", true], ["Đơn hàng", "/orders", false], ["Chi tiết đơn", `/order?id=${o.id}`, false], ["Công nợ", "/so-cong-no", false], ["Hoa hồng", "/hoa-hong", false], ["Tôi", "/account", false], ["Điều phối", "/dieu-phoi", false]];
  for (const [tenTrang, path, nang] of TRANG) for (const [ten, w, h, mobile] of KHO) {
    const p = await mo(ACCOUNTS.chu, path, { width: w, height: h, mobile }, nang);
    try {
      if (path === "/") await p.waitFor("!document.querySelector('#dash-grid')?.hidden", "lưới", 20000);
      await sleep(1300);
      const x = await p.ev(DAY);
      KQ.dong.push({ trang: tenTrang, kho: ten, ...x });
      if (/^(Trang chủ|Đơn hàng|Chi tiết)/.test(tenTrang) && /^(tablet|đt)/.test(ten)) await chup(p, `cuoi-trang-${({ 'Trang chủ nặng': 'trang-chu-nang', 'Đơn hàng': 'don-hang', 'Chi tiết đơn': 'chi-tiet-don' })[tenTrang]}-${ten.replace(/[^0-9x]/g, '')}`);
      console.log(`· ${tenTrang} ${ten}: tabbar=${x.tabbar} (${x.tabbarCao}px) padĐáy=${x.mainPadDay} lá cuối «${x.laCuoi}» đáy ${x.laCuoiDay} so với đỉnh tab ${x.tabbarTop} ⇒ bị che ${x.biChe}px; cuộn ${x.scrollY}/${x.cao}`);
    } finally { p.close(); }
  }
  writeFileSync(`${OUT}/so-lieu-tab-day-${process.env.PHA2 ?? "x"}.json`, JSON.stringify(KQ, null, 1));
} finally { await env.stop(); }
