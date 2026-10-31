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

const KHO = [
  ["đt 360x740", 360, 740, true], ["đt 390x844", 390, 844, true], ["đt 430x932", 430, 932, true], ["đt ngang 844x390", 844, 390, true],
  ["tablet dọc 768x1024", 768, 1024, true], ["tablet dọc 820x1180", 820, 1180, true], ["tablet ngang 1024x768", 1024, 768, true], ["tablet dọc 1024x1366", 1024, 1366, true], ["tablet ngang 1180x820", 1180, 820, true],
  ["laptop 1280x720", 1280, 720, false], ["laptop 1366x768", 1366, 768, false], ["laptop 1536x864", 1536, 864, false], ["màn 1920x1080", 1920, 1080, false], ["màn 2560x1440", 2560, 1440, false],
];
const slug = (t) => t.replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/-+$/, "");
const KQ = { trangChu: [], trang: [], quet: [] };
const tong = { cat: 0, tran: 0, tranTrang: 0, chong: 0 };
const ghi = (dong) => { tong.cat += dong.loi.cat; tong.tran += dong.loi.tran; if (dong.scrollW > dong.vw) tong.tranTrang++; tong.chong += (dong.chong ?? []).length; };

try {
  const trangChu = async (nhan, nang) => {
    for (const [ten, w, h, mobile] of KHO) {
      const p = await mo(ACCOUNTS.chu, "/", { width: w, height: h, mobile }, nang);
      try {
        await p.waitFor("!document.querySelector('#dash-grid')?.hidden", `lưới ${nhan} ${ten}`, 20000);
        await sleep(500);
        const x = await p.ev(XEM); const l = await DO(p);
        const d = { ca: nhan, kho: ten, ...x, loi: { cat: l.cat, che: l.che, tran: l.tran }, chiTietLoi: l.chiTiet };
        KQ.trangChu.push(d); ghi(d);
        console.log(`· TC ${nhan} ${ten}: cắt=${l.cat} tràn=${l.tran} che=${l.che} tràn_trang=${x.scrollW > x.vw} chồng=${x.chong.length} rỗng=${x.rong.length} bấm<44=${x.soBamNho} cột=${x.cot}`);
        await chup(p, `trang-chu-${nhan}-${slug(ten)}`);
      } finally { p.close(); }
    }
  };
  await trangChu("nang", true);

  // dữ liệu thật cho ca ít dữ liệu và các trang khác
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const svc = ({ departDate, pickupTime, pickupPlace, adult }) => ({ kind: "catalog", pickupChoice: "DON", catalogCode: "TTB06", pax: { adult, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800_000 }, departDate, departTime: "", pickupTime, pickupPlace, checkinDate: "", checkinTime: "", checkinPlace: "", note: "" });
  const input = (customerName, customerPhone, services) => ({ customerName, customerPhone, customerEmail: "", customerNote: "", services, discount: 0, paymentNote: "" });
  const draft = async (...a) => { const r = await call(ACCOUNTS.chu, "POST", "/api/orders", input(...a)); assert.equal(r.status, 201, JSON.stringify(r.json)); return r.json.order; };
  const confirm = async (o) => {
    let c = await call(ACCOUNTS.chu, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
    if (c.status === 409) { for (const sv of o.services) for (const leg of sv.legs ?? []) await call(ACCOUNTS.chu, "POST", `/api/orders/${o.id}/legs/${leg.id}/short-notice`, { lyDo: "KHAC", ghiChu: null }); c = await call(ACCOUNTS.chu, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" }); }
    assert.equal(c.status, 200); return c.json.order;
  };
  const DIA_CHI_DAI = "Khách sạn Mường Thanh Luxury Nha Trang, 60 Trần Phú, phường Lộc Thọ, thành phố Nha Trang, tỉnh Khánh Hòa";
  let o1 = null;
  for (const [ten, sdt, gio, noi, nl] of [["Nguyễn Thị Phương Anh Thư Trần Lê Hoàng Gia Bảo", "0900000401", "06:30", "Bến Cầu Đá", 4], ["Trần Thị Bích", "0900000402", "07:15", DIA_CHI_DAI, 2], ["Lê Quốc Cường", "0900000403", "08:00", "Resort Mường Thanh", 6]]) {
    const o = await confirm(await draft(ten, sdt, [svc({ departDate: TODAY, pickupTime: gio, pickupPlace: noi, adult: nl })])); o1 ??= o;
  }
  console.log("✓ ca ít dữ liệu: 3 đơn đi hôm nay, không giả dữ liệu đối chiếu");
  await trangChu("it", false);

  const TRANG = [["Đơn hàng", "/orders"], ["Chi tiết đơn", `/order?id=${o1.id}`], ["Công nợ", "/so-cong-no"], ["Hoa hồng", "/hoa-hong"], ["Tôi", "/account"], ["Điều phối", "/dieu-phoi"]];
  for (const [tenTrang, path] of TRANG) {
    for (const [ten, w, h, mobile] of KHO) {
      const p = await mo(ACCOUNTS.chu, path, { width: w, height: h, mobile }, false);
      try {
        await sleep(1400);
        const x = await p.ev(DO_RONG); const l = await DO(p);
        const d = { trang: tenTrang, kho: ten, ...x, loi: { cat: l.cat, che: l.che, tran: l.tran }, chiTietLoi: l.chiTiet };
        KQ.trang.push(d); ghi(d);
        console.log(`· ${tenTrang} ${ten}: main ${x.main} cắt=${l.cat} tràn=${l.tran} che=${l.che} tràn_trang=${x.scrollW > x.vw}`);
      } finally { p.close(); }
    }
  }

  // Quét «khe» giữa các điểm gãy: Trang chủ dữ liệu nặng, từ 600 tới 1300 css px, bước ~50 (không ảnh).
  for (let w = 600; w <= 1300; w += 50) {
    const p = await mo(ACCOUNTS.chu, "/", { width: w, height: 800, mobile: false }, true);
    try {
      await p.waitFor("!document.querySelector('#dash-grid')?.hidden", `quét ${w}`, 20000); await sleep(350);
      const x = await p.ev(XEM); const l = await DO(p);
      const d = { kho: `${w}x800`, ...x, loi: { cat: l.cat, che: l.che, tran: l.tran }, chiTietLoi: l.chiTiet };
      KQ.quet.push(d); ghi(d);
      console.log(`· quét ${w}: cắt=${l.cat} tràn=${l.tran} tràn_trang=${x.scrollW > x.vw} chồng=${JSON.stringify(x.chong)} rỗng=${JSON.stringify(x.rong)} cột=${x.cot}`);
    } finally { p.close(); }
  }
  writeFileSync(`${OUT}/so-lieu-responsive.json`, JSON.stringify(KQ, null, 1));
  console.log("TỔNG", JSON.stringify(tong), "| lượt:", KQ.trangChu.length, KQ.trang.length, KQ.quet.length);
} finally { await env.stop(); }
