// Kịch bản Chrome vòng 2 (31/10/2026): (A) bề rộng nội dung của MỌI trang chính ở bốn khổ; (B) Trang chủ máy tính với DỮ LIỆU NẶNG.
// Chạy từ GỐC worktree sau `npm run build:web`:  PHA=truoc|sau node docs/evidence/2026-10-31-trang-chu-vong-2/kich-ban/do-trang-chu-vong-2.mjs
// Cơ chế: startEnv của A2 (D1 tạm + wrangler dev, KHÔNG đọc .env / .dev.vars) + dò lỗi hiển thị của phiên đánh giá khung.
// Dữ liệu nặng của Trang chủ: 54 khoản chờ đối chiếu (40 quá 3 ngày), 7 đơn huỷ còn người chưa nộp tiền, 1 góp ý mới — chèn bằng cách thay phản hồi của 4 route đọc
// (/api/ledger/coc, /coc/dem, /api/feedback, /api/feedback/badge) TRONG TRÌNH DUYỆT (Page.addScriptToEvaluateOnNewDocument), dạng đúng theo src/shared/contracts.ts. Phần còn lại (đơn, đơn chờ xác nhận) là dữ liệu thật trong D1 tạm.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const PHA = process.env.PHA ?? "sau";
const OUT = "docs/evidence/2026-10-31-trang-chu-vong-2";
const ANH = `${OUT}/anh-${PHA}`;
mkdirSync(ANH, { recursive: true });
const DO_LOI = readFileSync("docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/do-loi-hien-thi.js", "utf8");
const KQ = { pha: PHA, trang: [], trangChu: [] };
const TODAY = vnDate(0), TOMORROW = vnDate(1), LATER = vnDate(10);

// ---- Dữ liệu nặng (giả ở trình duyệt) ----
const TEN_BEN = ["Đại lý Du lịch Biển Xanh Nha Trang", "Nhà hàng Hải Sản Bình Dân Vịnh Nha Trang", "Công ty TNHH Dịch vụ Lữ hành Sao Biển", "Lễ tân khách sạn Mường Thanh"];
const doiChieu = Array.from({ length: 54 }, (_, i) => {
  const loai = i % 3 === 0 ? "cong_ty" : i % 3 === 1 ? "ben_dat" : "nha_cung_cap";
  return { receiptId: `rc-${i}`, orderId: `ord-${i}`, maDon: `TD-202610${18 + (i % 2)}-${String(i + 1).padStart(4, "0")}`, soTien: [30000, 3000000, 100000, 1300000, 200000, 12345000][i % 6], ngayKhai: i % 2 ? "2026-10-19" : "2026-10-18", qua3Ngay: i < 40, loai, benKia: loai === "cong_ty" ? null : TEN_BEN[i % 4] };
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
const mo = async (acc, path, { width, height }, nang) => {
  const p = await env.openPage({ width, height, mobile: false });
  const c = await env.login(acc);
  await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
  if (nang) await p.send("Page.addScriptToEvaluateOnNewDocument", { source: MOCK });
  await p.send("Page.navigate", { url: env.base + path });
  await p.waitFor("document.readyState === 'complete'", `trang ${path}`);
  return p;
};
const chup = async (p, ten, jpeg) => {
  const r = await p.send("Page.captureScreenshot", jpeg ? { format: "jpeg", quality: 60 } : { format: "png" });
  writeFileSync(`${ANH}/${ten}.${jpeg ? "jpg" : "png"}`, Buffer.from(r.result.data, "base64"));
};
const DO = async (p) => { const k = await p.ev(DO_LOI); k.cat = k.cat.filter((c) => !/visually-hidden/.test(c.el)); /* chữ ẩn chủ ý cho trình đọc màn hình (clip 1px), không phải chữ bị cắt */ return { cat: k.cat.length, che: k.che.length, tran: k.tran.length, rong: k.rong.length, chiTiet: { cat: k.cat.slice(0, 5), tran: k.tran.slice(0, 5) } }; };
const DO_RONG = `(() => {
  const m = document.querySelector('main'); const r = m.getBoundingClientRect(); const vw = innerWidth;
  let phai = 0;
  for (const el of m.querySelectorAll('*')) { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); if (b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none') phai = Math.max(phai, b.right); }
  const bar = document.querySelector('#sidebar, nav.sidebar, aside'); const sb = bar ? Math.round(bar.getBoundingClientRect().width) : null;
  return { vw, scrollW: document.documentElement.scrollWidth, mainTrai: Math.round(r.left), mainRong: Math.round(r.width), mainPhai: Math.round(r.right), noiDungPhai: Math.round(phai), trongPhai: Math.round(vw - phai), thanhBen: sb };
})()`;

try {
  // ===== B. Trang chủ NẶNG: 0 đơn đi hôm nay, 54 đối chiếu, 7 thu trước, 1 góp ý, Quản trị · Toàn quyền =====
  const XEM_TC = `(() => {
    const $ = (s) => document.querySelector(s); const thay = (e) => !!e && e.getClientRects().length > 0;
    const h = (s) => { const e = $(s); return thay(e) ? Math.round(e.getBoundingClientRect().height) : null; };
    const box = (s) => { const e = $(s); if (!thay(e)) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top + scrollY), Math.round(b.width), Math.round(b.height)]; };
    const cot = (s) => { const e = $(s); return thay(e) ? Math.round(e.getBoundingClientRect().bottom + scrollY) : null; };
    return { cao: { doiChieu: h('#dash-doi-chieu'), thuTruoc: h('#dash-thu-truoc'), donDi: h('#dash-today'), canXemLai: h('#dash-review'), dangCho: h('#dash-dang-cho'), doanhThu: h('#dash-so-mt'), loiTat: h('#dash-loi-tat'), gap: h('#dash-gap') },
      hop: { loiTat: box('#dash-loi-tat'), gap: box('#dash-gap'), donDi: box('#dash-today'), doiChieu: box('#dash-doi-chieu'), thuTruoc: box('#dash-thu-truoc'), canXemLai: box('#dash-review'), dangCho: box('#dash-dang-cho'), doanhThu: box('#dash-so-mt') },
      daySauCotChinh: cot('#dash-cot-chinh'), daySauCotPhu: cot('#dash-cot-phu'), caoTrang: document.documentElement.scrollHeight,
      dongDoiChieu: document.querySelectorAll('#dash-doi-chieu-list li').length, dongThuTruoc: document.querySelectorAll('#dash-thu-truoc-list li').length,
      thuTu: ['#dash-dai', '#dash-loi-tat', '#dash-gap', '#dash-today', '#dash-review', '#dash-doi-chieu', '#dash-thu-truoc', '#dash-dang-cho', '#dash-so-mt'].filter((s) => thay($(s))).map((s) => [s, Math.round($(s).getBoundingClientRect().top + scrollY)]),
      lechCot: (() => { const l = [...document.querySelectorAll('#dash-doi-chieu-list li .dash-ct-tien')].map((e) => Math.round(e.getBoundingClientRect().right)); return [...new Set(l)].length; })(),
      pillTrenDong: [...document.querySelectorAll('.dash-ct-pill')].every((e) => { const li = e.closest('li'); return e.getBoundingClientRect().height < li.getBoundingClientRect().height; }),
      vw: innerWidth, scrollW: document.documentElement.scrollWidth, soTrong: ($('#dash-today-empty') && thay($('#dash-today-empty'))) ? $('#dash-today-empty').textContent : null };
  })()`;
  const KHO = [[1366, 650], [1440, 900], [1920, 1080], [1100, 800]];
  const luuTC = async (nhan, nang, acc = ACCOUNTS.chu) => {
    for (const [w, hh] of KHO) {
      const p = await mo(acc, "/", { width: w, height: hh }, nang);
      try {
        await p.waitFor("!document.querySelector('#dash-grid')?.hidden", `lưới ${nhan} ${w}`, 20000);
        await sleep(500);
        const x = await p.ev(XEM_TC); const l = await DO(p);
        const d = { ca: nhan, kho: `${w}x${hh}`, ...x, loi: { cat: l.cat, tran: l.tran, che: l.che }, chiTietLoi: l.chiTiet };
        KQ.trangChu.push(d);
        console.log(`· TC ${nhan} ${w}x${hh}: đối chiếu ${x.cao.doiChieu}px, thu trước ${x.cao.thuTruoc}px, cột chính đáy ${x.daySauCotChinh}, cột phụ đáy ${x.daySauCotPhu}, trang cao ${x.caoTrang}; cắt=${l.cat} tràn=${l.tran} tràn_trang=${x.scrollW > x.vw}`);
        await chup(p, `trang-chu-${nhan}-${w}x${hh}`, false);
      } finally { p.close(); }
    }
  };
  await luuTC("nang-0-don", true);

  // ===== Dữ liệu thật cho các ca sau: 8 đơn đi hôm nay (tên dài), 1 đơn ngày mai, 3 đơn chờ xác nhận =====
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const svc = ({ departDate, pickupTime, pickupPlace, adult }) => ({
    kind: "catalog", pickupChoice: pickupTime ? "DON" : "KHONG_DON", catalogCode: "TTB06", pax: { adult, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800_000 },
    departDate, departTime: "", pickupTime: pickupTime ?? "", pickupPlace: pickupPlace ?? "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "",
  });
  const input = (customerName, customerPhone, services) => ({ customerName, customerPhone, customerEmail: "", customerNote: "", services, discount: 0, paymentNote: "" });
  const draft = async (...a) => { const r = await call(ACCOUNTS.chu, "POST", "/api/orders", input(...a)); assert.equal(r.status, 201, JSON.stringify(r.json)); return r.json.order; };
  const confirm = async (o) => {
    let c = await call(ACCOUNTS.chu, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
    if (c.status === 409) {
      for (const sv of o.services) for (const leg of sv.legs ?? []) await call(ACCOUNTS.chu, "POST", `/api/orders/${o.id}/legs/${leg.id}/short-notice`, { lyDo: "KHAC", ghiChu: null });
      c = await call(ACCOUNTS.chu, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
    }
    assert.equal(c.status, 200, `xác nhận: ${JSON.stringify(c.json)}`);
    return c.json.order;
  };
  const DIA_CHI_DAI = "Khách sạn Mường Thanh Luxury Nha Trang, 60 Trần Phú, phường Lộc Thọ, thành phố Nha Trang, tỉnh Khánh Hòa";
  const chuyen = [
    ["Nguyễn Thị Phương Anh Thư Trần Lê Hoàng Gia Bảo", "0900000401", "06:30", "Bến Cầu Đá", 4, 3_200_000], ["Trần Thị Bích", "0900000402", "07:15", DIA_CHI_DAI, 2, 0],
    ["Lê Quốc Cường", "0900000403", "08:00", "Resort Mường Thanh", 6, 1_000_000], ["Phạm Minh Dũng", "0900000404", "09:30", "Bãi Dài", 3, 0],
    ["Hoàng Văn Em", "0900000405", "10:30", "Sân bay Cam Ranh", 12, 12_345_000], ["Đặng Thị Hồng Nhung Phan Lê Anh", "0900000406", "11:00", DIA_CHI_DAI, 5, 0],
    ["Vũ Đình Khôi", "0900000407", "13:00", "Bến Cầu Đá", 2, 500_000], ["Bùi Thị Lan", "0900000408", "23:30", "Sân bay Cam Ranh", 8, 0],
  ];
  let o1 = null;
  for (const [ten, sdt, gio, noi, nl, daThu] of chuyen) {
    const o = await confirm(await draft(ten, sdt, [svc({ departDate: TODAY, pickupTime: gio, pickupPlace: noi, adult: nl })]));
    o1 ??= o;
    if (daThu > 0) assert.equal((await call(ACCOUNTS.chu, "POST", `/api/orders/${o.id}/payments`, { soTien: daThu, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  }
  await confirm(await draft("Khách Ngày Mai", "0900000409", [svc({ departDate: TOMORROW, pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", adult: 2 })]));
  console.log(`✓ dữ liệu thật: ${chuyen.length} đơn đi hôm nay (tên dài, địa chỉ dài) + 1 ngày mai`);

  // ===== A. Bề rộng mọi trang chính (ca «có đơn», Trang chủ không giả dữ liệu) =====
  const TRANG = [["Trang chủ", "/"], ["Đơn hàng", "/orders"], ["Chi tiết đơn", `/order?id=${o1.id}`], ["Lập đơn", "/order-form"], ["Công nợ", "/so-cong-no"], ["Điều phối", "/dieu-phoi"], ["Hoa hồng", "/hoa-hong"], ["Tôi", "/account"],
    ["Nhật ký", "/audit"], ["Danh bạ", "/parties"], ["Dịch vụ & giá", "/catalog"], ["Tài khoản", "/staff"], ["Xe", "/xe"], ["Góp ý", "/feedback"], ["Chờ xác nhận", "/cho-xac-nhan"], ["Giao diện", "/giao-dien"], ["Địa điểm", "/locations"]];
  const KHO_A = [[1366, 650], [1536, 864], [1920, 1080], [2560, 1300]];
  for (const [ten, path] of process.env.CHI_TC ? [] : TRANG) {
    for (const [w, hh] of KHO_A) {
      const p = await mo(ACCOUNTS.chu, path, { width: w, height: hh }, false);
      try {
        await sleep(1500);
        const x = await p.ev(DO_RONG); const l = await DO(p);
        const dong = { trang: ten, path: path.replace(o1.id, ":id"), kho: `${w}x${hh}`, ...x, loi: { cat: l.cat, tran: l.tran, che: l.che, rong: l.rong }, chiTietLoi: l.chiTiet };
        KQ.trang.push(dong);
        console.log(`· ${ten} ${w}x${hh}: main ${x.mainRong}px (trái ${x.mainTrai}, phải ${x.mainPhai}) trống phải ${x.trongPhai}px; cắt=${l.cat} tràn=${l.tran} tràn_trang=${x.scrollW > x.vw}`);
        if (w === 1920 || w === 2560) await chup(p, `${ten.replace(/[^A-Za-zÀ-ỹ]/g, "")}-${w}x${hh}`, true);
      } finally { p.close(); }
    }
  }

  // ===== B (tiếp). Trang chủ: có đơn đi (5–10 đơn, tên dài) với dữ liệu nặng; rồi ca dải việc gấp bật =====
  await luuTC("nang-8-don", true);
  const staffId = env.sql(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.chu.phone}'`)[0].id;
  const iso = (ms) => new Date(Date.now() - ms).toISOString();
  const cho = async (ten, sdt, ngay, ms) => {
    const o = await draft(ten, sdt, [svc({ departDate: ngay, pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", adult: 2 })]);
    const g = iso(ms), han = new Date(Date.now() - ms + 15 * 60_000).toISOString();
    for (let i = 0; ; i++) { try { env.sql(`INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, created_by, updated_at, updated_by) VALUES ('${randomUUID()}','${o.id}','${g}','${staffId}','${han}','${g}','${staffId}','${g}','${staffId}')`); break; } catch (e) { if (i >= 4) throw e; await sleep(1500); /* SQLITE_BUSY: máy chủ thử đang giữ D1 — thử lại */ } }
  };
  await cho("Chờ A đi hôm nay", "0900000411", TODAY, 10 * 60_000);
  await cho("Chờ B gửi 3 giờ trước", "0900000412", LATER, 3 * 3600_000);
  await luuTC("nang-8-don-dai-gap", true);

  // Thử «Xem tất cả» mở rộng (chỉ 1440x900, chỉ bản sau): đo khối mở + nút «Thu gọn».
  if (PHA === "sau") {
    const p = await mo(ACCOUNTS.chu, "/", { width: 1440, height: 900 }, true);
    try {
      await p.waitFor("!document.querySelector('#dash-grid')?.hidden", "lưới", 20000); await sleep(400);
      assert.equal(await p.ev("document.querySelectorAll('#dash-doi-chieu-list li').length"), 3, "mặc định ba dòng");
      assert.equal(await p.ev("(() => { const b = document.querySelector('#dash-doi-chieu-nut button'); b.click(); return document.querySelectorAll('#dash-doi-chieu-list li').length; })()"), 54, "bấm Xem tất cả → 54 dòng");
      await sleep(200);
      KQ.moRong = { cao: await p.ev("Math.round(document.querySelector('#dash-doi-chieu').getBoundingClientRect().height)"), nut: await p.ev("document.querySelector('#dash-doi-chieu-nut button').textContent"), cuon: await p.ev("(() => { const u = document.querySelector('#dash-doi-chieu-list .dash-ct-ds'); return [u.scrollHeight, u.clientHeight]; })()") };
      await chup(p, "trang-chu-nang-xem-tat-ca-1440x900", false);
      await p.ev("document.querySelector('#dash-doi-chieu-nut button').click()");
      assert.equal(await p.ev("document.querySelectorAll('#dash-doi-chieu-list li').length"), 3, "Thu gọn → 3 dòng");
      console.log("✓ Xem tất cả mở 54 dòng trong khối cuộn, Thu gọn về 3:", JSON.stringify(KQ.moRong));
    } finally { p.close(); }
  }

  // Điện thoại 390: vẫn đủ hai khối chi tiết + Cần xem lại đủ dòng (dòng lặp chỉ ẩn ở máy tính).
  {
    const p = await mo(ACCOUNTS.chu, "/", { width: 390, height: 844, mobile: true }, true);
    try {
      await p.waitFor("!document.querySelector('#dash-grid')?.hidden", "lưới", 20000); await sleep(400);
      const m = await p.ev(`(() => { const v = (s) => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0; };
        return { loiTat: v('#dash-loi-tat'), dangCho: v('#dash-dang-cho'), doiChieu: v('#dash-doi-chieu'), thuTruoc: v('#dash-thu-truoc'), review: v('#dash-review'),
          dongReview: [...document.querySelectorAll('#dash-review-list .dash-review-row')].filter((e) => e.getClientRects().length > 0).length, scrollW: document.documentElement.scrollWidth, vw: innerWidth,
          thuTu: ['#dash-so', '#dash-o', '#dash-doi-chieu', '#dash-thu-truoc', '#dash-review', '#dash-today'].filter(v).map((s) => [s, Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY)]) }; })()`);
      const l = await DO(p);
      console.log("· điện thoại 390:", JSON.stringify(m), "cắt/tràn:", l.cat, l.tran);
      KQ.dienThoai = { ...m, loi: { cat: l.cat, tran: l.tran } };
      await chup(p, "dienthoai-nang-390", false);
    } finally { p.close(); }
  }
  writeFileSync(`${OUT}/so-lieu-${PHA}.json`, JSON.stringify(KQ, null, 1));
  const tong = (a) => a.reduce((t, d) => ({ cat: t.cat + d.loi.cat, tran: t.tran + d.loi.tran, tranTrang: t.tranTrang + (d.scrollW > d.vw ? 1 : 0) }), { cat: 0, tran: 0, tranTrang: 0 });
  console.log("TỔNG trang:", a0(KQ.trang.length), JSON.stringify(tong(KQ.trang)), "| Trang chủ:", KQ.trangChu.length, JSON.stringify(tong(KQ.trangChu)));
} finally {
  await env.stop();
}
function a0(n) { return `${n} lượt đo`; }
