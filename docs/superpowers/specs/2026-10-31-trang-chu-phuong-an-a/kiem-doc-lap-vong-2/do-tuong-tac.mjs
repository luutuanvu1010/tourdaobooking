// Kịch bản KIỂM ĐỘC LẬP vòng 2 Trang chủ (31/10/2026). Chạy từ GỐC một worktree đã `npm run build:web`:
//   PHA=truoc|sau [CA=trangchu|khung] node <đường dẫn tuyệt đối tới tệp này>
// Dùng lại startEnv (D1 tạm + wrangler dev, KHÔNG đọc .env/.dev.vars) của A2 và dò lỗi hiển thị của phiên đánh giá khung. Tự viết, không chép số của người thi công.
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, sleep, startEnv, vnDate } from "./../../../../evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs";

const PHA = process.env.PHA ?? "sau";
const CA = process.env.CA ?? "trangchu";
const OUT = process.env.OUT ?? `/tmp/kiem-vong2/${PHA}`;
mkdirSync(OUT, { recursive: true });
const DO_LOI = readFileSync("docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/do-loi-hien-thi.js", "utf8");
const KQ = { pha: PHA, ca: CA, trangChu: [], khung: [], tuongTac: {} };
const TODAY = vnDate(0), LATER = vnDate(10);

const TEN_BEN = ["Đại lý Du lịch Biển Xanh Nha Trang", "Nhà hàng Hải Sản Bình Dân Vịnh Nha Trang", "Công ty TNHH Dịch vụ Lữ hành Sao Biển", "Lễ tân khách sạn Mường Thanh"];
const mkCoc = (nDoiChieu, nQuaHan, nThuTruoc, daoThuTu = false) => {
  // daoThuTu: khoản quá hạn nằm CUỐI danh sách (ba dòng đầu là khoản mới) — kiểm xem tín hiệu quá hạn có mất khi gọn ba dòng
  const doiChieu = Array.from({ length: nDoiChieu }, (_, i) => {
    const loai = i % 3 === 0 ? "cong_ty" : i % 3 === 1 ? "ben_dat" : "nha_cung_cap";
    const qua = daoThuTu ? i >= nDoiChieu - nQuaHan : i < nQuaHan;
    return { receiptId: `rc-${i}`, orderId: `ord-${i}`, maDon: `TD-202610${18 + (i % 2)}-${String(i + 1).padStart(4, "0")}`, soTien: [30000, 3000000, 100000, 1300000, 200000, 12345000][i % 6], ngayKhai: i % 2 ? "2026-10-19" : "2026-10-18", qua3Ngay: qua, loai, benKia: loai === "cong_ty" ? null : TEN_BEN[i % 4] };
  });
  const conNguoiGiu = Array.from({ length: nThuTruoc }, (_, i) => ({ orderId: `huy-${i}`, maDon: `TD-20261018-00${12 + i}`, nguoi: ["Lễ tân khách sạn", "Nguyễn Phú Hải", "HDVTA4"][i % 3], soTien: 100000 * (i + 1) }));
  return { coc: { canChi: [], donHuyGiuCoc: [], conNguoiGiu, doiChieu }, dem: { canChi: 0, duyetQua7Ngay: 0, sapHetHan: 0, conNguoiGiu: nThuTruoc, doiChieuQua3Ngay: nQuaHan } };
};
const gopY1 = { tickets: [{ id: "yc-23", code: "YC-0023", kindName: "Báo lỗi", status: "NEW", statusName: "Mới", lastPublicReplyAt: null, title: "Lỗi thử" }], stats: [] };
const gopY0 = { tickets: [], stats: [] };
const MOCK = ({ coc, dem }, gopY, queue) => `(() => {
  const that = window.fetch.bind(window); window.__posts = [];
  const tra = (o) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });
  const coc = ${JSON.stringify(coc)}, dem = ${JSON.stringify(dem)}, gopY = ${JSON.stringify(gopY)};
  window.fetch = (input, init) => {
    const u = new URL(typeof input === "string" ? input : input.url, location.href);
    const m = (init?.method ?? "GET").toUpperCase();
    if (m === "GET" && u.pathname === "/api/ledger/coc") return Promise.resolve(tra(coc));
    if (m === "GET" && u.pathname === "/api/ledger/coc/dem") return Promise.resolve(tra(dem));
    if (m === "GET" && u.pathname === "/api/feedback") return Promise.resolve(tra(gopY));
    if (m === "GET" && u.pathname === "/api/feedback/badge") return Promise.resolve(tra({ mine: 0, queue: ${queue} }));
    if (m === "POST" && /counterparty-receipts/.test(u.pathname)) { window.__posts.push(u.pathname + " " + (init?.body ?? "")); return Promise.resolve(tra({ ok: true })); }
    return that(input, init);
  };
})()`;

const env = await startEnv();
const mo = async (acc, path, { width, height, mobile = false }, mock) => {
  const p = await env.openPage({ width, height, mobile });
  const c = await env.login(acc);
  await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
  if (mock) await p.send("Page.addScriptToEvaluateOnNewDocument", { source: mock });
  await p.send("Page.navigate", { url: env.base + path });
  await p.waitFor("document.readyState === 'complete'", `trang ${path}`);
  return p;
};
const chup = async (p, ten) => {
  const r = await p.send("Page.captureScreenshot", { format: "jpeg", quality: 55 });
  writeFileSync(`${OUT}/${ten}.jpg`, Buffer.from(r.result.data, "base64"));
};
const DO = async (p) => { const k = await p.ev(DO_LOI); k.cat = k.cat.filter((c) => !/visually-hidden/.test(c.el)); return { cat: k.cat.length, che: k.che.length, tran: k.tran.length, rong: k.rong.length, chiTiet: { cat: k.cat.slice(0, 4), tran: k.tran.slice(0, 4) } }; };

const XEM = `(() => {
  const $ = (s) => document.querySelector(s); const thay = (e) => !!e && e.getClientRects().length > 0;
  const top = (s) => { const e = $(s); return thay(e) ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
  const bot = (s) => { const e = $(s); return thay(e) ? Math.round(e.getBoundingClientRect().bottom + scrollY) : null; };
  const hh = (s) => { const e = $(s); return thay(e) ? Math.round(e.getBoundingClientRect().height) : null; };
  const m = $('main').getBoundingClientRect();
  let phai = 0; for (const el of $('main').querySelectorAll('*')) { const b = el.getBoundingClientRect(); const st = getComputedStyle(el); if (b.width > 0 && b.height > 0 && st.visibility !== 'hidden' && st.display !== 'none') phai = Math.max(phai, b.right); }
  const hien = (s) => [...document.querySelectorAll(s)].filter(thay);
  const thuTu = ['#dash-dai', '#dash-loi-tat', '#dash-gap', '#dash-today', '#dash-review', '#dash-doi-chieu', '#dash-thu-truoc', '#dash-dang-cho', '#dash-so-mt', '#dash-so', '#dash-o'].filter((s) => thay($(s))).map((s) => [s, top(s)]);
  const cotC = bot('#dash-cot-chinh'), cotP = bot('#dash-cot-phu');
  return { vw: innerWidth, scrollW: document.documentElement.scrollWidth, caoTrang: document.documentElement.scrollHeight, mainRong: Math.round(m.width), trongPhai: Math.round(innerWidth - phai),
    thuTu, loiTatTop: top('#dash-loi-tat'), cotChinhDay: cotC, cotPhuDay: cotP, chenhCot: cotC && cotP ? cotC - cotP : null,
    cao: { doiChieu: hh('#dash-doi-chieu'), thuTruoc: hh('#dash-thu-truoc'), donDi: hh('#dash-today'), xemLai: hh('#dash-review'), dangCho: hh('#dash-dang-cho'), doanhThu: hh('#dash-so-mt') },
    dongDoiChieu: hien('#dash-doi-chieu-list li').length, dongThuTruoc: hien('#dash-thu-truoc-list li').length,
    dongXemLai: hien('#dash-review-list .dash-review-row').map((e) => e.textContent.trim().replace(/\\s+/g, ' ').slice(0, 70)),
    dongDangCho: hien('#dash-dang-cho-ds li').map((e) => e.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60)),
    khoiRong: ['#dash-doi-chieu', '#dash-thu-truoc', '#dash-review', '#dash-today', '#dash-dang-cho'].filter((s) => thay($(s)) && !$(s).textContent.trim()),
    gapHien: thay($('#dash-gap')), soTrong: thay($('#dash-today-empty')) ? $('#dash-today-empty').textContent.trim().slice(0, 60) : null,
    pillCao: hien('.dash-ct-pill').slice(0, 3).map((e) => Math.round(e.getBoundingClientRect().height)) };
})()`;

const KHO = [[1366, 650], [1440, 900], [1920, 1080], [1100, 800]];
const VAI = { chu: ACCOUNTS.chu, quanTri: ACCOUNTS.admin, keToan: ACCOUNTS.accounting, nhanVien: ACCOUNTS.salesA };
const chay = async (nhan, mock, vais = VAI, chupAnh = ["chu"], kho = KHO, dt = true) => {
  for (const [vai, acc] of Object.entries(vais)) {
    const list = [...kho.map(([w, h]) => [w, h, false]), ...(dt ? [[390, 844, true]] : [])];
    for (const [w, hh, mobile] of list) {
      const p = await mo(acc, "/", { width: w, height: hh, mobile }, mock);
      try {
        await p.waitFor("!document.querySelector('#dash-grid')?.hidden", `lưới ${nhan} ${vai} ${w}`, 25000).catch(() => {});
        await sleep(600);
        const x = await p.ev(XEM); const l = await DO(p);
        KQ.trangChu.push({ ca: nhan, vai, kho: `${w}x${hh}`, ...x, loi: { cat: l.cat, tran: l.tran, che: l.che }, chiTietLoi: l.chiTiet });
        console.log(`· ${nhan} ${vai} ${w}x${hh}: lốiTắt@${x.loiTatTop} trốngPhải=${x.trongPhai} chênhCột=${x.chenhCot} cao=${x.caoTrang} cắt=${l.cat} tràn=${l.tran} trànTrang=${x.scrollW > x.vw} xemLai=${x.dongXemLai.length} đangChờ=${x.dongDangCho.length} khốiRỗng=${x.khoiRong.length}`);
        if (chupAnh.includes(vai)) await chup(p, `tc-${nhan}-${vai}-${w}x${hh}`);
      } finally { p.close(); }
    }
  }
};

try {
  const nang = MOCK(mkCoc(54, 40, 7), gopY1, 1);
  const p = await mo(ACCOUNTS.chu, "/", { width: 1440, height: 900 }, nang);
  try {
    await p.waitFor("!document.querySelector('#dash-grid')?.hidden", "lưới", 25000); await sleep(500);
    await p.ev("document.querySelector('#dash-doi-chieu-nut button').click()"); await sleep(200);
    const bam = await p.ev("(() => { const b = [...document.querySelectorAll('#dash-doi-chieu-list li')][29].querySelector('button[data-action=ben-kia-da-nhan]'); b.click(); return [b.textContent, b.closest('li').dataset.receiptId]; })()");
    await sleep(500);
    const hop = await p.ev("(() => { const d = document.querySelector('[role=alertdialog]'); return d ? d.textContent.trim().replace(/\\s+/g,' ').slice(0,200) : null; })()");
    await p.ev("document.querySelector('[role=alertdialog] .btn-danger')?.click()"); await sleep(1500);
    const kq = { bam, hop, posts: await p.ev("window.__posts"), moConDo: await p.ev("document.querySelector('#dash-doi-chieu-nut button')?.textContent"), dong: await p.ev("document.querySelectorAll('#dash-doi-chieu-list li').length") };
    console.log("TUONGTAC", JSON.stringify(kq));
  } finally { p.close(); }
} finally { await env.stop(); }
