// Kịch bản KIỂM ĐỘC LẬP vòng 2B Trang chủ (31/10/2026). Chạy từ GỐC một worktree đã `npm run build:web`:
//   CA=trangchu|khe|khac [TAG=sau|main] [OUT=/tmp/x] node <đường dẫn tuyệt đối tới tệp này>
// Dùng startEnv (D1 tạm + wrangler dev, KHÔNG đọc .env/.dev.vars) của A2. Tự viết, độc lập với kịch bản của người thi công.
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, sleep, startEnv, vnDate } from "../../../../evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs";

const CA = process.env.CA ?? "trangchu";
const TAG = process.env.TAG ?? "sau";
const OUT = process.env.OUT ?? `/tmp/kiem2b/${TAG}`;
mkdirSync(OUT, { recursive: true });
const DO_LOI = readFileSync("docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/do-loi-hien-thi.js", "utf8");
const KQ = { ca: CA, tag: TAG, dong: [] };
const TODAY = vnDate(0), LATER = vnDate(10);

const TEN_BEN = ["Đại lý Du lịch Biển Xanh Nha Trang", "Nhà hàng Hải Sản Bình Dân Vịnh Nha Trang", "Công ty TNHH Dịch vụ Lữ hành Sao Biển", "Lễ tân khách sạn Mường Thanh"];
const mkCoc = (nDoiChieu, nQuaHan, nThuTruoc) => {
  // khoản quá hạn nằm CUỐI danh sách theo thứ tự API
  const doiChieu = Array.from({ length: nDoiChieu }, (_, i) => {
    const loai = i % 3 === 0 ? "cong_ty" : i % 3 === 1 ? "ben_dat" : "nha_cung_cap";
    return { receiptId: `rc-${i}`, orderId: `ord-${i}`, maDon: `TD-202610${18 + (i % 2)}-${String(i + 1).padStart(4, "0")}`, soTien: [30000, 3000000, 100000, 1300000, 200000, 12345000][i % 6], ngayKhai: i % 2 ? "2026-10-19" : "2026-10-18", qua3Ngay: i >= nDoiChieu - nQuaHan, loai, benKia: loai === "cong_ty" ? null : TEN_BEN[i % 4] };
  });
  const conNguoiGiu = Array.from({ length: nThuTruoc }, (_, i) => ({ orderId: `huy-${i}`, maDon: `TD-20261018-00${12 + i}`, nguoi: ["Lễ tân khách sạn", "Nguyễn Phú Hải", "HDVTA4"][i % 3], soTien: 100000 * (i + 1) }));
  return { coc: { canChi: [], donHuyGiuCoc: [], conNguoiGiu, doiChieu }, dem: { canChi: 0, duyetQua7Ngay: 0, sapHetHan: 0, conNguoiGiu: nThuTruoc, doiChieuQua3Ngay: nQuaHan } };
};
const gopY1 = { tickets: [{ id: "yc-23", code: "YC-0023", kindName: "Báo lỗi", status: "NEW", statusName: "Mới", lastPublicReplyAt: null, title: "Lỗi thử" }], stats: [] };
const MOCK = ({ coc, dem }, gopY, queue) => `(() => {
  const that = window.fetch.bind(window);
  const tra = (o) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });
  const coc = ${JSON.stringify(coc)}, dem = ${JSON.stringify(dem)}, gopY = ${JSON.stringify(gopY)};
  window.fetch = (input, init) => {
    const u = new URL(typeof input === "string" ? input : input.url, location.href);
    const m = (init?.method ?? "GET").toUpperCase();
    if (m === "GET" && u.pathname === "/api/ledger/coc") return Promise.resolve(tra(coc));
    if (m === "GET" && u.pathname === "/api/ledger/coc/dem") return Promise.resolve(tra(dem));
    if (m === "GET" && u.pathname === "/api/feedback") return Promise.resolve(tra(gopY));
    if (m === "GET" && u.pathname === "/api/feedback/badge") return Promise.resolve(tra({ mine: 0, queue: ${queue} }));
    return that(input, init);
  };
})()`;
const NANG = MOCK(mkCoc(54, 40, 7), gopY1, 1);

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
const chup = async (p, ten) => { const r = await p.send("Page.captureScreenshot", { format: "jpeg", quality: 55 }); writeFileSync(`${OUT}/${ten}.jpg`, Buffer.from(r.result.data, "base64")); };
const DO = async (p) => { const k = await p.ev(DO_LOI); k.cat = k.cat.filter((c) => !/visually-hidden/.test(c.el)); return { cat: k.cat.length, che: k.che.length, tran: k.tran.length, rong: k.rong.length, chiTiet: { cat: k.cat.slice(0, 4), che: k.che.slice(0, 3), tran: k.tran.slice(0, 4) } }; };

// Đo riêng cho Trang chủ.
const XEM = `(() => {
  const $ = (s) => document.querySelector(s); const thay = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const rc = (s) => { const e = $(s); return thay(e) ? e.getBoundingClientRect() : null; };
  const grid = $('#dash-grid');
  const ids = ['#dash-dai','#dash-tim','#dash-o','#dash-so','#dash-cho-dt','#dash-loi-tat','#dash-gap','#dash-today','#dash-review','#dash-doi-chieu','#dash-thu-truoc','#dash-dang-cho','#dash-so-mt'];
  const kh = ids.map((s) => [s, rc(s)]).filter(([, r]) => r);
  const chong = [];
  for (let i = 0; i < kh.length; i++) for (let j = i + 1; j < kh.length; j++) { const a = kh[i][1], b = kh[j][1]; const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (w > 2 && h > 2) chong.push(kh[i][0] + ' x ' + kh[j][0]); }
  const rong = kh.filter(([s, r]) => r.height < 24 || (s !== '#dash-gap' && !$(s).innerText.trim() && !$(s).querySelector('svg,img,canvas'))).map(([s]) => s);
  // Lối tắt: số hàng, số ô mỗi hàng
  const ot = [...document.querySelectorAll('#dash-loi-tat .dash-o-muc')].filter(thay).map((e) => Math.round(e.getBoundingClientRect().top));
  const hang = {}; ot.forEach((t) => { hang[t] = (hang[t] || 0) + 1; });
  const loiTat = Object.values(hang);
  // hai khối chi tiết: cạnh nhau hay chồng dọc
  const dc = rc('#dash-doi-chieu'), tt = rc('#dash-thu-truoc');
  const haiKhoi = dc && tt ? (Math.abs(dc.top - tt.top) < 4 ? 'canh-nhau' : 'doc') : (dc ? 'chi-doi-chieu' : tt ? 'chi-thu-truoc' : 'khong');
  const gap = rc('#dash-gap');
  const gapHang = gap ? [...new Set([...document.querySelectorAll('#dash-gap > *, #dash-gap li, #dash-gap .dash-gap-dong')].filter(thay).map((e) => Math.round(e.getBoundingClientRect().top)))].length : 0;
  // vùng bấm
  const cam = matchMedia('(pointer: coarse)').matches || innerWidth < 1100;
  const bam = [...document.querySelectorAll('main a[href], main button, main input, main select, #tabbar .tab, #tabbar a, #tabbar button')].filter(thay).map((e) => { const r = e.getBoundingClientRect(); return [e.className.toString().split(' ')[0] || e.tagName.toLowerCase(), Math.round(r.width), Math.round(r.height), (e.innerText||'').trim().slice(0,20)]; }).filter(([, w, h]) => h < 40 || w < 40);
  // thanh tab dưới che nội dung cuối: cuộn cuối, phần tử cuối trong main có đáy > đỉnh tabbar?
  const tb = $('#tabbar'); let tabChe = null;
  if (thay(tb)) { window.scrollTo(0, document.documentElement.scrollHeight); const tbt = tb.getBoundingClientRect().top; const xs = [...document.querySelectorAll('main *')].filter(thay); let day = 0; xs.forEach((e) => { day = Math.max(day, e.getBoundingClientRect().bottom); }); tabChe = Math.round(day - tbt); window.scrollTo(0,0); }
  const chuyenDon = thay($('#dash-today')) ? [...document.querySelectorAll('#dash-today li, #dash-today .dash-today-dong')].filter(thay).length : 0;
  const phuDangCho = [...document.querySelectorAll('#dash-dang-cho-ds li')].filter(thay).map((e) => e.textContent.trim().replace(/\\s+/g, ' ').slice(0, 90));
  const pill3 = [...document.querySelectorAll('#dash-doi-chieu-list li')].filter(thay).slice(0, 3).map((li) => (li.querySelector('.dash-ct-pill')?.textContent ?? null));
  const xemLai = [...document.querySelectorAll('#dash-review-list .dash-review-row')].filter(thay).map((e) => e.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60));
  const mDocBot = (() => { const m = $('main').getBoundingClientRect(); return Math.round(m.width); })();
  return { vw: innerWidth, scrollW: document.documentElement.scrollWidth, caoTrang: document.documentElement.scrollHeight, mainRong: mDocBot,
    cot: thay(grid) ? getComputedStyle(grid).gridTemplateColumns : null, loiTatTop: rc('#dash-loi-tat') ? Math.round(rc('#dash-loi-tat').top + scrollY) : null,
    loiTat, haiKhoi, gapHien: !!gap, gapHang, chong, rong, soBamNho: bam.length, bamNho: bam.slice(0, 5), cam, tabChe, chuyenDon, phuDangCho, pill3, xemLai,
    khoiRong: ['#dash-doi-chieu', '#dash-thu-truoc', '#dash-review', '#dash-today', '#dash-dang-cho'].filter((s) => thay($(s)) && !$(s).textContent.trim()) };
})()`;

const KHO = [[360, 740, true], [390, 844, true], [430, 932, true], [844, 390, true], [768, 1024, true], [820, 1180, true], [1024, 768, true], [1180, 820, true], [1280, 720, false], [1366, 768, false], [1536, 864, false], [1920, 1080, false], [2560, 1440, false]];
const CHUP = new Set(["360x740", "430x932", "844x390", "768x1024", "1024x768", "1180x820", "1366x768", "1920x1080", "2560x1440"]);
const VAI = { chu: ACCOUNTS.chu, quanTri: ACCOUNTS.admin, keToan: ACCOUNTS.accounting, nhanVien: ACCOUNTS.salesA };
const chay = async (nhan, mock, vais, kho = KHO, chupVai = ["chu"]) => {
  for (const [vai, acc] of Object.entries(vais)) for (const [w, h, mobile] of kho) {
    const p = await mo(acc, "/", { width: w, height: h, mobile }, mock);
    try {
      await p.waitFor("!document.querySelector('#dash-grid')?.hidden", `lưới ${nhan} ${vai} ${w}`, 25000).catch(() => {});
      await sleep(600);
      const x = await p.ev(XEM); const l = await DO(p);
      KQ.dong.push({ ca: nhan, vai, kho: `${w}x${h}`, ...x, loi: { cat: l.cat, tran: l.tran, che: l.che }, chiTietLoi: l.chiTiet });
      console.log(`· ${nhan} ${vai} ${w}x${h}: cột=${x.cot ? x.cot.split(' ').length : '-'} lốiTắt=${JSON.stringify(x.loiTat)}@${x.loiTatTop} haiKhối=${x.haiKhoi} cắt=${l.cat} tràn=${l.tran} trànTrang=${x.scrollW > x.vw} che=${l.che} chồng=${x.chong.length} rỗng=${x.rong.length}+${x.khoiRong.length} bấm<40=${x.soBamNho} tabChe=${x.tabChe} xemLai=${x.xemLai.length} đangChờ=${x.phuDangCho.length}`);
      if (chupVai.includes(vai) && CHUP.has(`${w}x${h}`)) await chup(p, `tc-${nhan}-${vai}-${w}x${h}`);
    } finally { p.close(); }
  }
};

const call = async (account, method, path, body) => {
  const c = await env.login(account);
  const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const svc = ({ departDate, pickupTime, pickupPlace, adult }) => ({ kind: "catalog", pickupChoice: "DON", catalogCode: "TTB06", pax: { adult, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800_000 }, departDate, departTime: "", pickupTime, pickupPlace, checkinDate: "", checkinTime: "", checkinPlace: "", note: "" });
const draft = async (ten, sdt, services) => { const r = await call(ACCOUNTS.chu, "POST", "/api/orders", { customerName: ten, customerPhone: sdt, customerEmail: "", customerNote: "", services, discount: 0, paymentNote: "" }); assert.equal(r.status, 201, JSON.stringify(r.json)); return r.json.order; };
const confirm = async (o) => {
  let c = await call(ACCOUNTS.chu, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
  if (c.status === 409) { for (const sv of o.services) for (const leg of sv.legs ?? []) await call(ACCOUNTS.chu, "POST", `/api/orders/${o.id}/legs/${leg.id}/short-notice`, { lyDo: "KHAC", ghiChu: null }); c = await call(ACCOUNTS.chu, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" }); }
  assert.equal(c.status, 200, JSON.stringify(c.json)); return c.json.order;
};

try {
  if (CA === "trangchu") {
    // 1) ít dữ liệu: D1 tạm rỗng, không giả
    await chay("it", null, { chu: ACCOUNTS.chu, keToan: ACCOUNTS.accounting });
    // 2) nặng (54 đối chiếu, 40 quá hạn ở CUỐI; 7 thu trước; 0 đơn đi; 1 góp ý)
    await chay("nang", NANG, VAI, KHO, ["chu", "keToan"]);
    // 3) 10 đơn đi tên dài
    const DC = "Khách sạn Mường Thanh Luxury Nha Trang, 60 Trần Phú, phường Lộc Thọ, thành phố Nha Trang, tỉnh Khánh Hòa, Việt Nam, tầng 12 phòng 1205";
    const TEN = "Nguyễn Thị Phương Anh Thư Trần Lê Hoàng Gia Bảo Đặng Võ Phan Bùi Hồ Ngô";
    const gio = ["06:30", "07:15", "08:00", "09:30", "10:30", "11:00", "13:00", "14:30", "16:00", "23:30"];
    for (let i = 0; i < 10; i++) await confirm(await draft(i % 2 ? TEN : `Khách số ${i}`, `09000005${String(i).padStart(2, "0")}`, [svc({ departDate: TODAY, pickupTime: gio[i], pickupPlace: i % 3 ? DC : "Bến Cầu Đá", adult: 2 + i })]));
    console.log("✓ 10 đơn đi hôm nay");
    await chay("10don", NANG, { chu: ACCOUNTS.chu, nhanVien: ACCOUNTS.salesA });
    // 4) dải việc gấp: hai đơn chờ xác nhận
    const staffId = env.sql(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.chu.phone}'`)[0].id;
    const iso = (ms) => new Date(Date.now() - ms).toISOString();
    const cho = async (ten, sdt, ngay, ms) => {
      const o = await draft(ten, sdt, [svc({ departDate: ngay, pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", adult: 2 })]);
      const g = iso(ms), han = new Date(Date.now() - ms + 15 * 60_000).toISOString();
      for (let i = 0; ; i++) { try { env.sql(`INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, created_by, updated_at, updated_by) VALUES ('${randomUUID()}','${o.id}','${g}','${staffId}','${han}','${g}','${staffId}','${g}','${staffId}')`); break; } catch (e) { if (i >= 4) throw e; await sleep(800); } }
    };
    await cho("Chờ A đi hôm nay", "0900000611", TODAY, 10 * 60_000);
    await cho("Chờ B gửi 3 giờ trước", "0900000612", LATER, 3 * 3600_000);
    await chay("gap", NANG, { chu: ACCOUNTS.chu, quanTri: ACCOUNTS.admin });
  }
  if (CA === "khe") {
    for (let w = 600; w <= 1300; w += 20) {
      const p = await mo(ACCOUNTS.chu, "/", { width: w, height: 800, mobile: false }, NANG);
      try {
        await p.waitFor("!document.querySelector('#dash-grid')?.hidden", `khe ${w}`, 25000).catch(() => {}); await sleep(350);
        const x = await p.ev(XEM); const l = await DO(p);
        KQ.dong.push({ ca: "khe", kho: `${w}x800`, ...x, loi: { cat: l.cat, tran: l.tran, che: l.che }, chiTietLoi: l.chiTiet });
        console.log(`· khe ${w}: cột=${x.cot ? x.cot.split(' ').length : '-'} lốiTắt=${JSON.stringify(x.loiTat)} haiKhối=${x.haiKhoi} gấpHàng=${x.gapHang} cắt=${l.cat} tràn=${l.tran} trànTrang=${x.scrollW > x.vw} chồng=${x.chong.length} rỗng=${x.rong.length}`);
      } finally { p.close(); }
    }
  }
  if (CA === "khac") {
    const o = await confirm(await draft("Khách Khung", "0900000701", [svc({ departDate: TODAY, pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", adult: 3 })]));
    const TRANG = [["Đơn hàng", "/orders"], ["Chi tiết đơn", `/order?id=${o.id}`], ["Công nợ", "/so-cong-no"], ["Hoa hồng", "/hoa-hong"], ["Tôi", "/account"], ["Điều phối", "/dieu-phoi"], ["Nhật ký", "/audit"], ["Thiết lập", "/thiet-lap"], ["Lập đơn", "/order-form"], ["Danh bạ", "/parties"]];
    for (const [ten, path] of TRANG) for (const [w, h, mobile] of [[768, 1024, true], [1024, 768, true], [1366, 768, false], [1920, 1080, false]]) {
      const p = await mo(ACCOUNTS.chu, path, { width: w, height: h, mobile }, null);
      try {
        await sleep(1500);
        const x = await p.ev(`({ vw: innerWidth, scrollW: document.documentElement.scrollWidth, main: Math.round((document.querySelector('main')||document.body).getBoundingClientRect().width), cao: document.documentElement.scrollHeight, url: location.pathname })`);
        const l = await DO(p);
        KQ.dong.push({ trang: ten, kho: `${w}x${h}`, ...x, loi: { cat: l.cat, tran: l.tran, che: l.che }, chiTietLoi: l.chiTiet });
        console.log(`· ${ten} ${w}x${h}: main=${x.main} cao=${x.cao} cắt=${l.cat} tràn=${l.tran} trànTrang=${x.scrollW > x.vw} che=${l.che} url=${x.url}`);
        if (w === 1024 && (ten === "Đơn hàng" || ten === "Công nợ")) await chup(p, `khac-${ten.replace(/[^A-Za-z0-9]/g, "")}-${w}`);
      } finally { p.close(); }
    }
  }
  if (CA === "cuoi") {
    // Cuộn tới đáy trang rồi xem: thanh tab dưới (nếu có) có che nội dung cuối không; chụp ảnh đáy trang.
    for (const [vai, acc] of [["keToan", ACCOUNTS.accounting], ["chu", ACCOUNTS.chu]]) for (const [w, h, mobile] of [[360, 740, true], [430, 932, true], [844, 390, true], [768, 1024, true], [820, 1180, true], [1024, 768, true]]) {
      const p = await mo(acc, "/", { width: w, height: h, mobile }, NANG);
      try {
        await p.waitFor("!document.querySelector('#dash-grid')?.hidden", `cuối ${w}`, 25000).catch(() => {}); await sleep(600);
        const x = await p.ev(`(() => { scrollTo(0, document.documentElement.scrollHeight); const tb = document.querySelector('#tabbar'); const tbr = tb && tb.getClientRects().length ? tb.getBoundingClientRect() : null;
          const g = document.querySelector('#dash-grid'); const vis = [...g.querySelectorAll('*')].filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden]'); });
          let day = 0, ten = ''; for (const e of vis) { if (e.closest('ul, .dash-ct-cuon')) { const u = e.closest('ul'); if (u && u.scrollHeight > u.clientHeight + 2) continue; } const b = e.getBoundingClientRect().bottom; if (b > day) { day = b; ten = e.tagName + '.' + e.className.toString().split(' ')[0] + ' ' + (e.innerText||'').trim().slice(0, 30); } }
          return { vh: innerHeight, scrollY: Math.round(scrollY), conLai: Math.round(document.documentElement.scrollHeight - innerHeight - scrollY), tabTop: tbr ? Math.round(tbr.top) : null, tabCao: tbr ? Math.round(tbr.height) : null, noiDungDay: Math.round(day), phanTuDay: ten, chong: tbr ? Math.round(day - tbr.top) : null }; })()`);
        console.log(`· cuối ${vai} ${w}x${h}: ${JSON.stringify(x)}`);
        KQ.dong.push({ ca: "cuoi", vai, kho: `${w}x${h}`, ...x });
        await chup(p, `cuoi-${vai}-${w}x${h}`);
      } finally { p.close(); }
    }
  }
  writeFileSync(`${OUT}/so-lieu-${CA}-${TAG}.json`, JSON.stringify(KQ, null, 1));
} finally {
  await env.stop();
}
