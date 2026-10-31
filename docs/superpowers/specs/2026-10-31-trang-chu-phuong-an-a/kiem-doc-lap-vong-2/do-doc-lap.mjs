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
  if (CA === "trangchu") {
    const nang = MOCK(mkCoc(54, 40, 7), gopY1, 1);
    await chay("a-nang", nang);
    await chay("a2-nang-quahan-cuoi", MOCK(mkCoc(54, 40, 7, true), gopY1, 1), { chu: ACCOUNTS.chu }, [], [[1440, 900]], false);
    await chay("d-it", MOCK(mkCoc(0, 0, 0), gopY0, 0));

    // tương tác: Xem tất cả, Bên kia đã nhận (mock POST ghi lại đường dẫn)
    {
      const p = await mo(ACCOUNTS.chu, "/", { width: 1440, height: 900 }, nang);
      try {
        await p.waitFor("!document.querySelector('#dash-grid')?.hidden", "lưới", 25000); await sleep(500);
        const t = KQ.tuongTac;
        t.macDinh = await p.ev("[document.querySelectorAll('#dash-doi-chieu-list li').length, document.querySelectorAll('#dash-thu-truoc-list li').length]");
        t.nutTen = await p.ev("[document.querySelector('#dash-doi-chieu-nut button')?.textContent, document.querySelector('#dash-thu-truoc-nut button')?.textContent]");
        t.moDc = await p.ev("(() => { document.querySelector('#dash-doi-chieu-nut button').click(); const u = document.querySelector('#dash-doi-chieu-list ul'); return { dong: u.querySelectorAll('li').length, nut: document.querySelector('#dash-doi-chieu-nut button').textContent, expanded: document.querySelector('#dash-doi-chieu-nut button').getAttribute('aria-expanded'), cuon: [u.scrollHeight, u.clientHeight], caoKhoi: Math.round(document.querySelector('#dash-doi-chieu').getBoundingClientRect().height) }; })()");
        await sleep(200); await chup(p, "tc-xem-tat-ca-chu-1440x900");
        t.moTt = await p.ev("(() => { document.querySelector('#dash-thu-truoc-nut button').click(); return { dong: document.querySelectorAll('#dash-thu-truoc-list li').length, nut: document.querySelector('#dash-thu-truoc-nut button').textContent }; })()");
        // nút «Bên kia đã nhận» trên dòng cuộn xa (dòng thứ 30)
        t.nutDong = await p.ev("(() => { const li = document.querySelectorAll('#dash-doi-chieu-list li')[29]; const b = li.querySelector('button[data-action=ben-kia-da-nhan]'); li.scrollIntoView({block:'center'}); const r = b ? b.getBoundingClientRect() : null; const u = document.querySelector('#dash-doi-chieu-list ul').getBoundingClientRect(); return { co: !!b, chu: b?.textContent, trongKhungCuon: !!r && r.top >= u.top - 1 && r.bottom <= u.bottom + 1, loai: li.dataset.loai }; })()");
        // bấm nút của một dòng loại ben_dat (có nút), xác nhận hộp thoại, ghi POST
        const bam = await p.ev("(() => { const b = [...document.querySelectorAll('#dash-doi-chieu-list button[data-action=ben-kia-da-nhan]')][0]; b.click(); return b.textContent; })()");
        await sleep(400);
        t.hopThoai = await p.ev("(() => { const d = document.querySelector('dialog[open], .modal, [role=dialog]'); return d ? d.textContent.trim().replace(/\\s+/g,' ').slice(0,160) : null; })()");
        await p.ev("(() => { const ds = [...document.querySelectorAll('dialog[open] button, [role=dialog] button, .modal button')]; const b = ds.find((x) => /Xác nhận/.test(x.textContent) && !/Huỷ|Thôi/.test(x.textContent)) ?? ds[ds.length-1]; b?.click(); return ds.map((x)=>x.textContent.trim()); })()");
        await sleep(800);
        t.bam = bam; t.posts = await p.ev("window.__posts");
        const them = await p.ev("document.querySelector('#dash-doi-chieu-nut button')?.textContent");
        t.sauBam = them;
        console.log("✓ tương tác:", JSON.stringify(t));
      } finally { p.close(); }
    }

    // ===== Dữ liệu thật: 10 đơn đi hôm nay tên/địa chỉ rất dài (b), rồi dải gấp (c) =====
    const call = async (account, method, path, body) => {
      const c = await env.login(account);
      const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: r.status, json: await r.json().catch(() => null) };
    };
    const svc = ({ departDate, pickupTime, pickupPlace, adult }) => ({ kind: "catalog", pickupChoice: pickupTime ? "DON" : "KHONG_DON", catalogCode: "TTB06", pax: { adult, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800_000 }, departDate, departTime: "", pickupTime: pickupTime ?? "", pickupPlace: pickupPlace ?? "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" });
    const draft = async (ten, sdt, services) => { const r = await call(ACCOUNTS.chu, "POST", "/api/orders", { customerName: ten, customerPhone: sdt, customerEmail: "", customerNote: "", services, discount: 0, paymentNote: "" }); assert.equal(r.status, 201, JSON.stringify(r.json)); return r.json.order; };
    const confirm = async (o) => {
      let c = await call(ACCOUNTS.chu, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
      if (c.status === 409) { for (const sv of o.services) for (const leg of sv.legs ?? []) await call(ACCOUNTS.chu, "POST", `/api/orders/${o.id}/legs/${leg.id}/short-notice`, { lyDo: "KHAC", ghiChu: null }); c = await call(ACCOUNTS.chu, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" }); }
      assert.equal(c.status, 200, JSON.stringify(c.json)); return c.json.order;
    };
    const DC = "Khách sạn Mường Thanh Luxury Nha Trang, 60 Trần Phú, phường Lộc Thọ, thành phố Nha Trang, tỉnh Khánh Hòa, Việt Nam, tầng 12 phòng 1205";
    const TEN = "Nguyễn Thị Phương Anh Thư Trần Lê Hoàng Gia Bảo Đặng Võ Phan Bùi Hồ Ngô";
    const gio = ["06:30", "07:15", "08:00", "09:30", "10:30", "11:00", "13:00", "14:30", "16:00", "23:30"];
    let o1 = null;
    for (let i = 0; i < 10; i++) { const o = await confirm(await draft(i % 2 ? TEN : `Khách số ${i}`, `09000005${String(i).padStart(2, "0")}`, [svc({ departDate: TODAY, pickupTime: gio[i], pickupPlace: i % 3 ? DC : "Bến Cầu Đá", adult: 2 + i })])); o1 ??= o; }
    console.log("✓ 10 đơn đi hôm nay");
    await chay("b-10-don-dai", nang, { chu: ACCOUNTS.chu, nhanVien: ACCOUNTS.salesA }, ["chu"]);
    const staffId = env.sql(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.chu.phone}'`)[0].id;
    const iso = (ms) => new Date(Date.now() - ms).toISOString();
    const cho = async (ten, sdt, ngay, ms) => {
      const o = await draft(ten, sdt, [svc({ departDate: ngay, pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", adult: 2 })]);
      const g = iso(ms), han = new Date(Date.now() - ms + 15 * 60_000).toISOString();
      for (let i = 0; ; i++) { try { env.sql(`INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, created_by, updated_at, updated_by) VALUES ('${randomUUID()}','${o.id}','${g}','${staffId}','${han}','${g}','${staffId}','${g}','${staffId}')`); break; } catch (e) { if (i >= 4) throw e; await sleep(800); } }
    };
    await cho("Chờ A đi hôm nay", "0900000611", TODAY, 10 * 60_000);
    await cho("Chờ B gửi 3 giờ trước", "0900000612", LATER, 3 * 3600_000);
    await chay("c-gap", nang, { chu: ACCOUNTS.chu, quanTri: ACCOUNTS.admin }, ["chu"]);
    KQ.o1 = o1.id;
  }
  if (CA === "khung") {
    const o = await (async () => {
      const c = await env.login(ACCOUNTS.chu);
      const h = { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` };
      const sv = { kind: "catalog", pickupChoice: "DON", catalogCode: "TTB06", pax: { adult: 3, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800_000 }, departDate: TODAY, departTime: "", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
      const r = await fetch(env.base + "/api/orders", { method: "POST", headers: h, body: JSON.stringify({ customerName: "Khách Khung", customerPhone: "0900000701", customerEmail: "", customerNote: "", services: [sv], discount: 0, paymentNote: "" }) });
      return (await r.json()).order;
    })();
    const TRANG = [["Trang chủ", "/"], ["Đơn hàng", "/orders"], ["Chi tiết đơn", `/order?id=${o.id}`], ["Lập đơn", "/order-form"], ["Công nợ", "/so-cong-no"], ["Điều phối", "/dieu-phoi"], ["Hoa hồng", "/hoa-hong"], ["Tôi", "/account"], ["Nhật ký", "/audit"], ["Danh bạ", "/parties"], ["Dịch vụ & giá", "/catalog"], ["Giao diện", "/giao-dien"], ["Thiết lập", "/thiet-lap"], ["Góp ý", "/feedback"],
      ["Luật bán", "/luat-ban"], ["Gửi thông báo", "/gui-thong-bao"], ["Phiên", "/sessions"], ["Tài khoản", "/staff"], ["Xe", "/xe"], ["Chờ xác nhận", "/cho-xac-nhan"], ["Địa điểm", "/locations"], ["Chuyến", "/chuyen"], ["Cước", "/cuoc"], ["Trợ lý cài đặt", "/tro-ly-cai-dat"], ["Chính sách điều phối", "/chinh-sach-dieu-phoi"], ["Người bán", "/nguoi-ban"], ["Đặc điểm dịch vụ", "/dac-diem-dich-vu"], ["Khoá tháng", "/khoa-thang"], ["Điều chỉnh công nợ", "/dieu-chinh-cong-no"], ["Hướng dẫn", "/help"]];
    for (const [ten, path] of TRANG) for (const [w, hh] of [[1536, 864], [1920, 1080], [2560, 1300]]) {
      const p = await mo(ACCOUNTS.chu, path, { width: w, height: hh }, null);
      try {
        await sleep(1600);
        const x = await p.ev(`(() => { const m = document.querySelector('main'); if (!m) return null; const r = m.getBoundingClientRect(); let phai = 0; for (const el of m.querySelectorAll('*')) { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); if (b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none') phai = Math.max(phai, b.right); }
          const dai = [...m.querySelectorAll('p, li, .muted, td')].map((e) => e.getBoundingClientRect().width).reduce((a, b) => Math.max(a, b), 0);
          return { vw: innerWidth, scrollW: document.documentElement.scrollWidth, mainRong: Math.round(r.width), mainTrai: Math.round(r.left), trongPhai: Math.round(innerWidth - phai), caoTrang: document.documentElement.scrollHeight, khoiChuRongNhat: Math.round(dai), url: location.pathname }; })()`);
        const l = await DO(p);
        KQ.khung.push({ trang: ten, path: path.replace(o.id, ":id"), kho: `${w}x${hh}`, ...x, loi: { cat: l.cat, tran: l.tran, che: l.che }, chiTietLoi: l.chiTiet });
        console.log(`· ${ten} ${w}: main ${x?.mainRong} trốngPhải ${x?.trongPhai} cắt=${l.cat} tràn=${l.tran} trànTrang=${x ? x.scrollW > x.vw : "?"} url=${x?.url}`);
        if (w >= 1920) await chup(p, `khung-${ten.replace(/[^A-Za-zÀ-ỹ0-9]/g, "")}-${w}x${hh}`);
      } finally { p.close(); }
    }
  }
  writeFileSync(`${OUT}/so-lieu-${CA}-${PHA}.json`, JSON.stringify(KQ, null, 1));
} finally {
  await env.stop();
}
