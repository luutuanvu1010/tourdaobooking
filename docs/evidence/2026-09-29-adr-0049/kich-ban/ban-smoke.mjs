// A4 T9 (ADR-0053 D7.2, D8, D9; kế hoạch docs/superpowers/plans/2026-10-08-giai-doan-3-a4-ke-hoach.md, G-A4-14, G-A4-16, G-A4-19): tài xế đối tác dùng Nền tảng —
// Từ chối chuyến trước hạn, Báo bận của tôi; văn phòng thấy dải "Tài xế bận", nhãn "Bận" ở ô Tài xế, khối "Tài xế đã từ chối". Thứ tự tài khoản (kho cookie
// dùng chung): Tài xế đối tác → Bán hàng → Kế toán (trang của Kế toán mở sau cùng).
//  1) 390 Tài xế đối tác: "/" → /cuoc; bốn tab Trang chủ / Cuốc của tôi / Báo bận của tôi / Tôi; không tràn ngang; axe.
//  2) 390 chuyến TA (ngày mai 20:00, còn hạn): dải "Từ chối được tới …", nút "Từ chối chuyến", thẻ "thấy tên khách và mã đơn từ …"; chuyến TB (sau 3 giờ, đã
//     quá hạn 12 giờ): dải "Đã quá hạn từ chối", nút "Gọi văn phòng" (tel:), KHÔNG nút Từ chối; không mã thô; axe.
//  3) 390 Từ chối TA: tấm chọn lý do → "Xác nhận từ chối" → /cuoc có dải "Đã từ chối chuyến <mã>"; đúng MỘT lệnh POST …/tu-choi.
//  4) 390 /ban: khung trùng TB → dải đỏ có liên kết mở TB; khung ngày kia 08:00–12:00 → "Đã lưu khung bận"; khung thứ hai (ghi bằng phiên của trang) → rút
//     bằng dải hỏi lại trong trang → còn một khung; ô giờ ≥ 16px; không tràn ngang; axe.
//  5) 1040 Tài xế đối tác /ban: thanh bên nhóm TÔI có "Cuốc của tôi", "Báo bận của tôi" (đang sáng).
//  6) 1040 Bán hàng: Điều phối xe ngày kia có dải "Tài xế bận" (tên + nhà xe, KHÔNG lý do); Tạo chuyến ngày kia: ô Tài xế ghi "Bận …"; lưu chuyến 09:00–10:00
//     cho tài xế đó → câu chặn dưới ô Tài xế, không lý do; Chi tiết TA: "… đã từ chối lúc …" + "Lý do: Bận lịch khác".
//  7) 1040 Kế toán: Chi tiết TA có câu từ chối KHÔNG lý do; Điều phối xe không gọi /ban-tai-xe, không dải.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/ban-smoke.mjs
// Mọi tên, SĐT, biển số, số giấy tờ ở đây là GIẢ. Đi đường thật (route API), trừ đọc party id bằng SQL.
import { randomUUID } from "node:crypto";
import { ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungMoiTruong, fetchTrang, noCode, noOverflowX, shotFull, shotView, sleep, txt, typeInto, vnDate } from "./dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("BAN SMOKE");
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const SDT_VP = "0905123456";
const NHA_XE = "Nhà Xe Đông Chrome";
const TEN_TX = "Lê Văn Đông";
/** Giờ treo tường VN của một mốc ms (phút tròn). */
const vn = (ms) => {
  const s = new Date(Math.floor(ms / 60_000) * 60_000 + 7 * 3600e3).toISOString();
  return { ngay: s.slice(0, 10), gio: s.slice(11, 16) };
};
const ddmm = (ngay) => ngay.slice(8, 10) + "/" + ngay.slice(5, 7);

// ---- Dữ liệu ------------------------------------------------------------------------------------------------------------------------------------------------
// Chính sách (Toàn quyền): hạn Từ chối 12 giờ, có số văn phòng → nút "Gọi văn phòng".
dung(await call(CHU, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 2880, refuseLeadMinutes: 720, officePhone: SDT_VP }), 201, "chính sách");
// Nhà xe đang hợp tác + tài xế đối tác (tạo theo vai, như màn Quản lý tài khoản) "Tài xế của" nhà xe + GPLX D2 + xe 15 chỗ của nhà xe.
const nx = await call(ACCOUNTS.admin, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: NHA_XE });
dung(nx, 201, "nhà xe");
const nhaXe = nx.json.party.id;
dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${nhaXe}/roles`, { roleTypeCode: "CARRIER" }), 201, "vai nhà xe");
const tk = await call(CHU, "POST", "/api/staff", { taoHoSoMoi: true, fullName: TEN_TX, phone: "0900000461", roles: ["DRIVER_EXTERNAL"] });
dung(tk, 201, "tài xế đối tác");
const TX = { name: TEN_TX, phone: tk.json.staff.phone, pin: tk.json.pin, permissions: ["DRIVER_PARTNER"] };
const [{ party_id: txParty }] = env.sql(`SELECT party_id FROM staff WHERE id = '${tk.json.staff.id}'`);
dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${nhaXe}/relationships`, { fromPartyId: txParty, toPartyId: nhaXe, relationshipTypeCode: "DRIVES_FOR" }), 201, "Tài xế của");
dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${txParty}/documents`, { typeCode: "GPLX", number: "790100000461", classCode: "D2", expiryDate: vnDate(300) }), 201, "GPLX");
const xe = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber: "79B-461.61", chassisNumber: "KHUNGDONG461", name: "Xe thử nhà xe Đông", passengerCapacity: 15, ownerPartyId: nhaXe });
dung(xe, 201, "xe nhà xe");
const xeId = xe.json.vehicle.id;
const chuyen = async (bd, kt) => {
  const r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId, taiXePartyId: txParty, batDau: bd, ketThuc: kt });
  dung(r, 201, `tạo chuyến ${bd.ngay} ${bd.gio}`);
  return r.json.chuyen;
};
// TA: ngày mai 20:00–21:30 — hạn Từ chối = 08:00 ngày mai (luôn còn). TB: bắt đầu sau 3 giờ — hạn đã qua 9 giờ trước.
const TA = await chuyen({ ngay: vnDate(1), gio: "20:00" }, { ngay: vnDate(1), gio: "21:30" });
const tbBd = vn(Date.now() + 3 * 3600e3);
const tbKt = vn(Date.now() + 4.5 * 3600e3);
const TB = await chuyen(tbBd, tbKt);
const NGAY_KIA = vnDate(2);

try {
  await b.step("1", "390 Tài xế đối tác: “/” → /cuoc; bốn tab (Trang chủ, Cuốc của tôi, Báo bận của tôi, Tôi); không tràn ngang" + axeNote(), async () => {
    const p = await env.as(TX, "/", MOB);
    try {
      await p.waitFor("location.pathname === '/cuoc' && !!document.querySelector('.dp-cuoc-day')", "Cuốc của tôi dựng xong", 12000);
      await sleep(800);
      const tabs = await p.ev("[...document.querySelectorAll('#tabbar a')].filter((a) => a.getClientRects().length > 0).map((a) => ({ href: a.getAttribute('href'), text: a.innerText.replace(/\\s+/g, ' ').trim(), current: a.getAttribute('aria-current') }))");
      assert.deepEqual(tabs, [
        { href: "/tai-xe", text: "Trang chủ", current: null },
        { href: "/cuoc", text: "Cuốc của tôi", current: "page" },
        { href: "/ban", text: "Báo bận của tôi", current: null },
        { href: "/account", text: "Tôi", current: null },
      ]);
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      const calls = apiCalls(p).map((c) => c.path);
      assert.deepEqual(calls.filter((u) => u.startsWith("/api/orders")), [], `không lời gọi màn đơn: ${JSON.stringify(calls)}`);
      assert.deepEqual(calls.filter((u) => u.startsWith("/api/van-chuyen") && !u.startsWith("/api/van-chuyen/cuoc-cua-toi")), [], "tài xế chỉ gọi route tài xế");
      assert.deepEqual(p.consoleErrors, [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
      await axe(p, "cuốc của tôi — tài xế đối tác 390");
      await shotFull(p, "ban-1-cuoc-doi-tac-390.png");
    } finally {
      p.close();
    }
  });

  await b.step("2", "390 TA còn hạn: dải hạn + nút “Từ chối chuyến” + thẻ thấy khách; TB quá hạn: “Gọi văn phòng” tel:, không nút Từ chối" + axeNote(), async () => {
    const p = await env.as(TX, `/cuoc-chuyen?id=${TA.id}`, MOB);
    try {
      await p.waitFor("!!document.querySelector('[data-action=\"tu-choi\"]')", "nút Từ chối của TA", 12000);
      const tieuDe = await p.ev("[...document.querySelectorAll('.banner .banner-title')].map((x) => x.innerText.trim())");
      assert.ok(tieuDe.includes(`Từ chối được tới 08:00 ${ddmm(vnDate(1))}`), JSON.stringify(tieuDe));
      assert.match((await p.ev(txt("[data-cau='thay-khach']"))) ?? "", /^Bạn thấy tên khách và mã đơn từ /);
      assert.equal(await p.ev(noCode), "", "không mã thô");
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      await axe(p, "màn chuyến còn hạn từ chối 390");
      await shotFull(p, "ban-2a-con-han-390.png");
      await p.send("Page.navigate", { url: `${env.base}/cuoc-chuyen?id=${TB.id}` });
      await p.waitFor(`location.search.includes('${TB.id}') && [...document.querySelectorAll('.banner-title')].some((x) => x.innerText.startsWith('Đã quá hạn từ chối'))`, "dải quá hạn của TB", 12000);
      assert.equal(await p.ev("document.querySelector('[data-action=\"tu-choi\"]')"), null, "quá hạn: không nút Từ chối");
      assert.equal(await p.ev("document.querySelector('[data-action=\"goi-van-phong\"]')?.getAttribute('href')"), `tel:${SDT_VP}`);
      assert.equal(await p.ev(txt("[data-action='goi-van-phong']")), "Gọi văn phòng");
      assert.equal(await p.ev(noCode), "", "không mã thô");
      await axe(p, "màn chuyến quá hạn từ chối 390");
      await shotFull(p, "ban-2b-qua-han-390.png");
    } finally {
      p.close();
    }
  });

  await b.step("3", "390 Từ chối TA: chọn lý do → “Xác nhận từ chối” → /cuoc có dải “Đã từ chối chuyến …”; một lệnh POST", async () => {
    const p = await env.as(TX, `/cuoc-chuyen?id=${TA.id}`, MOB);
    try {
      await p.waitFor("!!document.querySelector('[data-action=\"tu-choi\"]')", "nút Từ chối", 12000);
      assert.ok(await p.ev(click("[data-action='tu-choi']")));
      await p.waitFor("!!document.querySelector('.sheet[role=\"dialog\"] [data-action=\"tu-choi-gui\"]')", "tấm Từ chối", 5000);
      assert.equal(await p.ev("document.querySelector('[data-action=\"tu-choi-gui\"]').disabled"), true, "chưa chọn lý do → nút khoá");
      const lyDo = await p.ev("[...document.querySelectorAll('.sheet[role=\"dialog\"] .vc-reason')].map((x) => x.innerText.trim())");
      assert.deepEqual(lyDo, ["Bận lịch khác", "Ốm / việc riêng", "Xe không chạy được", "Khác"]);
      await shotView(p, "ban-3a-tam-tu-choi-390.png");
      assert.ok(await p.ev(click(".sheet[role='dialog'] .vc-reason")));
      assert.ok(await p.ev(click("[data-action='tu-choi-gui']")));
      await p.waitFor(`location.pathname === '/cuoc' && location.search.includes('daTuChoi=')`, "về Cuốc của tôi", 12000);
      await p.waitFor("[...document.querySelectorAll('.banner-title')].some((x) => x.innerText.startsWith('Đã từ chối chuyến'))", "dải đã từ chối", 8000);
      assert.equal(await p.ev("[...document.querySelectorAll('.banner-title')].find((x) => x.innerText.startsWith('Đã từ chối chuyến')).innerText.trim()"), `Đã từ chối chuyến ${TA.ma}`);
      assert.equal(apiCalls(p).filter((c) => c.method === "POST" && c.path.endsWith("/tu-choi")).length, 1, "đúng một lệnh Từ chối");
      await shotFull(p, "ban-3b-da-tu-choi-390.png");
    } finally {
      p.close();
    }
  });

  let lyDoBan = "";
  await b.step("4", "390 /ban: trùng TB → dải đỏ có liên kết TB; lưu khung ngày kia; rút khung thứ hai bằng dải hỏi lại" + axeNote(), async () => {
    const p = await env.as(TX, "/ban", MOB);
    try {
      await p.waitFor("!!document.querySelector('[data-action=\"luu-khung\"]')", "form Báo bận", 12000);
      assert.equal(await p.ev("document.title"), "Báo bận của tôi — Island Booking System");
      const co = parseFloat(await p.ev("getComputedStyle(document.querySelector('#bb-tu')).fontSize"));
      assert.ok(co >= 16, `ô giờ ≥ 16px (iPhone không phóng to): ${co}px`);
      assert.match(await p.ev("document.querySelector('#bb-tu').value"), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "mặc định = phút hiện tại");
      assert.equal(await p.ev("document.querySelector('[data-action=\"luu-khung\"]').disabled"), true, "chưa chọn lý do → nút khoá");
      lyDoBan = await p.ev("document.querySelector('.bb-form .vc-reason').innerText.trim()");
      // (a) trùng chuyến TB đang được xếp → 409, dải đỏ liệt kê TB có liên kết.
      await p.ev(typeInto("#bb-tu", `${tbBd.ngay}T${tbBd.gio}`));
      await p.ev(typeInto("#bb-den", `${tbKt.ngay}T${tbKt.gio}`));
      assert.ok(await p.ev(click(".bb-form .vc-reason")));
      assert.ok(await p.ev(click("[data-action='luu-khung']")));
      await p.waitFor("!!document.querySelector('.banner-danger .bb-trung a')", "dải trùng chuyến", 8000);
      assert.equal(await p.ev("document.querySelector('.banner-danger .bb-trung a').getAttribute('href')"), `/cuoc-chuyen?id=${encodeURIComponent(TB.id)}`);
      assert.match(await p.ev(txt(".banner-danger .bb-trung a")), new RegExp(`^${TB.ma} · `));
      await shotFull(p, "ban-4a-trung-chuyen-390.png");
      // (b) khung ngày kia 08:00–12:00 → lưu.
      await p.ev(typeInto("#bb-tu", `${NGAY_KIA}T08:00`));
      await p.ev(typeInto("#bb-den", `${NGAY_KIA}T12:00`));
      assert.ok(await p.ev(click(".bb-form .vc-reason")));
      assert.ok(await p.ev(click("[data-action='luu-khung']")));
      await p.waitFor("[...document.querySelectorAll('.banner-title')].some((x) => x.innerText === 'Đã lưu khung bận') && document.querySelectorAll('.bb-khung').length === 1", "đã lưu khung", 8000);
      // (c) khung thứ hai ghi bằng PHIÊN CỦA TRANG (ADR-0075 một phiên mỗi tài khoản) → tải lại → rút bằng dải hỏi lại trong trang.
      const ds = await fetchTrang(p, "GET", "/api/van-chuyen/ban/cua-toi");
      const k2 = await fetchTrang(p, "POST", "/api/van-chuyen/ban", { batDau: { ngay: NGAY_KIA, gio: "14:00" }, ketThuc: { ngay: NGAY_KIA, gio: "16:00" }, lyDo: ds.json.lyDo[0].code });
      assert.equal(k2.status, 201, k2.text);
      const k2Id = k2.json.khung.find((k) => k.batDau !== ds.json.khung[0].batDau).id;
      await p.send("Page.navigate", { url: `${env.base}/ban` });
      await p.waitFor("document.querySelectorAll('.bb-khung').length === 2", "hai khung", 8000);
      assert.ok(await p.ev(click(`[data-khung='${k2Id}'] [data-action='rut-khung']`)));
      await p.waitFor(`!!document.querySelector("[data-khung='${k2Id}'] [data-action='rut-xac-nhan']")`, "dải hỏi lại", 5000);
      assert.equal(await p.ev(`document.querySelector("[data-khung='${k2Id}'] .banner-title").innerText.trim()`), "Rút khung này?");
      await shotFull(p, "ban-4b-hoi-rut-390.png");
      assert.ok(await p.ev(click(`[data-khung='${k2Id}'] [data-action='rut-xac-nhan']`)));
      await p.waitFor("[...document.querySelectorAll('.banner-title')].some((x) => x.innerText === 'Đã rút khung bận') && document.querySelectorAll('.bb-khung').length === 1", "đã rút", 8000);
      assert.equal(await p.ev(noCode), "", "không mã thô");
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      assert.deepEqual(p.consoleErrors.filter((x) => !/409/.test(x)), [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
      await axe(p, "Báo bận của tôi 390");
      await shotFull(p, "ban-4c-da-rut-390.png");
    } finally {
      p.close();
    }
  });

  await b.step("5", "1040 Tài xế đối tác /ban: thanh bên có “Cuốc của tôi”, “Báo bận của tôi” (đang sáng)" + axeNote(), async () => {
    const p = await env.as(TX, "/ban", DESK);
    try {
      await p.waitFor("document.querySelectorAll('.bb-khung').length === 1", "trang Báo bận", 12000);
      await sleep(600);
      const side = await p.ev("[...document.querySelectorAll('#sidebar .sidebar-item')].filter((a) => a.getClientRects().length > 0).map((a) => ({ href: a.getAttribute('href'), text: a.innerText.replace(/\\s+/g, ' ').trim(), current: a.getAttribute('aria-current') }))");
      assert.deepEqual(side.slice(0, 4).map((x) => x.href), ["/tai-xe", "/cuoc", "/ban", "/account"], JSON.stringify(side));
      assert.deepEqual(side[2], { href: "/ban", text: "Báo bận của tôi", current: "page" });
      assert.ok(!side.some((x) => /Vận chuyển|Đơn hàng|Danh bạ/.test(x.text)), "không mục văn phòng");
      await axe(p, "Báo bận của tôi 1040");
      await shotFull(p, "ban-5-bao-ban-1040.png");
    } finally {
      p.close();
    }
  });

  await b.step("6", "1040 Bán hàng: dải “Tài xế bận” (không lý do); ô Tài xế ghi “Bận”; lưu chuyến trùng → câu chặn dưới ô Tài xế; Chi tiết TA có lý do Từ chối" + axeNote(), async () => {
    const p = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${NGAY_KIA}`, DESK);
    try {
      await p.waitFor("!document.querySelector('#dp-tx-ban').hidden", "dải Tài xế bận", 12000);
      const dai = await p.ev(txt("#dp-tx-ban"));
      assert.match(dai, new RegExp(`^Tài xế bận từ ${ddmm(NGAY_KIA)} tới `), dai);
      assert.ok(dai.includes(`${TEN_TX} (${NHA_XE})`), dai);
      assert.ok(!dai.includes(lyDoBan), `không lý do "${lyDoBan}": ${dai}`);
      await axe(p, "Điều phối xe có dải Tài xế bận 1040");
      await shotFull(p, "ban-6a-dieu-phoi-tai-xe-ban-1040.png");
      await p.send("Page.navigate", { url: `${env.base}/chuyen-sua?ngay=${NGAY_KIA}` });
      await p.waitFor("!!document.querySelector('#cx-tai-xe')", "form Tạo chuyến", 12000);
      const nhan = await p.ev(`document.querySelector("#cx-tai-xe option[value='${txParty}']").textContent`);
      assert.match(nhan, new RegExp(`^${TEN_TX} · Bận `), nhan);
      await p.ev(typeInto("#cx-xe", xeId));
      await p.ev(typeInto("#cx-tai-xe", txParty));
      await p.ev(typeInto("#cx-tu", "09:00"));
      await p.ev(typeInto("#cx-den", "10:00"));
      assert.ok(await p.ev(click("[data-action='luu-chuyen']")));
      await p.waitFor("!document.querySelector('#cx-tai-xe-error').hidden", "câu chặn dưới ô Tài xế", 10000);
      const chan = await p.ev(txt("#cx-tai-xe-error"));
      assert.match(chan, /bận .*Chọn tài xế khác hoặc đổi giờ chuyến\./, chan);
      assert.ok(!chan.includes(lyDoBan), `câu chặn không lý do: ${chan}`);
      await shotFull(p, "ban-6b-chuyen-sua-ban-1040.png");
      await p.send("Page.navigate", { url: `${env.base}/chuyen?id=${TA.id}` });
      await p.waitFor("!!document.querySelector('[data-khoi=\"tu-choi\"]')", "khối Tài xế đã từ chối", 12000);
      const tc = await p.ev(txt("[data-khoi='tu-choi']"));
      assert.match(tc, new RegExp(`${TEN_TX} đã từ chối lúc \\d{2}:\\d{2}`), tc);
      assert.ok(tc.includes("Lý do: Bận lịch khác"), tc);
      assert.equal(await p.ev(noCode), "", "không mã thô");
      await axe(p, "Chi tiết chuyến có khối từ chối 1040");
      await shotFull(p, "ban-6c-chi-tiet-tu-choi-1040.png");
    } finally {
      p.close();
    }
  });

  await b.step("7", "1040 Kế toán: Chi tiết TA có câu từ chối KHÔNG lý do; Điều phối xe không gọi /ban-tai-xe, không dải", async () => {
    const p = await env.as(ACCOUNTS.accounting, `/chuyen?id=${TA.id}`, DESK);
    try {
      await p.waitFor("!!document.querySelector('[data-khoi=\"tu-choi\"]')", "khối Tài xế đã từ chối", 12000);
      const tc = await p.ev(txt("[data-khoi='tu-choi']"));
      assert.match(tc, new RegExp(`${TEN_TX} đã từ chối lúc \\d{2}:\\d{2}`), tc);
      assert.ok(!tc.includes("Lý do"), `Kế toán không thấy lý do: ${tc}`);
      await shotFull(p, "ban-7a-chi-tiet-ke-toan-1040.png");
      await p.send("Page.navigate", { url: `${env.base}/dieu-phoi?ngay=${NGAY_KIA}` });
      await p.waitFor("!document.querySelector('#dp-trang').hidden", "bảng điều phối", 12000);
      await sleep(800);
      assert.equal(await p.ev("document.querySelector('#dp-tx-ban').hidden"), true, "không dải Tài xế bận");
      assert.deepEqual(apiCalls(p).filter((c) => c.path.includes("ban-tai-xe")), [], "không gọi /ban-tai-xe");
    } finally {
      p.close();
    }
  });
} finally {
  await env.stop();
}
b.xong();
