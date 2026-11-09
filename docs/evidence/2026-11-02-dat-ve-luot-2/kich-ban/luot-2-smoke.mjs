// Kịch bản Chrome — Đặt vé của đối tác, lượt 2, các màn hình của ADR-0154 (kế hoạch lượt 2 Đợt 3, Task 3.4). Tệp RIÊNG, độc lập với cot-cap-smoke.mjs (cột «Cấp độ đại lý», Đợt 4).
// Khuôn: docs/evidence/2026-10-26-xac-nhan-don/kich-ban/xac-nhan-smoke.mjs + dp-lib.mjs; 390 + 1040. Dữ liệu đi đường thật (route API) trên D1 tạm + wrangler dev + Chrome headless qua CDP — không --remote, không production.
// Tên, số điện thoại GIẢ. Các bước (số theo kế hoạch; THỨ TỰ CHẠY là 1, 2, 3, 4b, 4, 5, rồi dựng đơn «không cần danh sách khách», 6, 8, 9, 10, 7 — vì 6, 8, 9, 10 cần công tắc đang BẬT, 7 tắt nó):
//   1. Đối tác 390 mở nháp cũ (đã lưu giờ đón 08:00): form KHÔNG có ô giờ, dòng tóm tắt «Văn phòng sẽ báo giờ đón»; Lưu → giờ lượt đầu về trống; «Gửi đơn» → câu A.
//   2. Kế toán 1040, /cho-xac-nhan: các thẻ đơn chờ nêu «Chưa có giờ đón».
//   3. Kế toán 390 mở đơn: ghi chú dịch vụ ở trên (số dài đã che), bấm «Còn vé» khi chưa chọn giờ → báo tại chỗ, KHÔNG gọi máy chủ; chọn khung → «Còn vé» → đã xác nhận.
//   4. Đơn đi ngày mai (dưới hạn chốt 48 giờ đặt bằng chính sách): 4b Kế toán thấy câu nhờ Bán hàng / Quản trị, không nút «Đặt gấp»; «Còn vé» bị 409 nhưng bảng giữ giờ đã chọn. 4 Bán hàng «Đặt gấp» ngay ở bảng rồi «Còn vé» → xác nhận, lượt mang dấu đặt gấp.
//   5. Toàn quyền bật công tắc ở trang Tôi (1040); Quản trị không thấy khối.
//   6. Đối tác 390 (công tắc BẬT): không khối Khách hàng (trừ «Ngày khởi hành»), không khối Hành khách; lập đơn được.
//   8. Tài khoản lai Đối tác + Bán hàng (công tắc BẬT): vẫn thấy hai khối.
//   9. Chi tiết chuyến có đơn mang dấu «không cần danh sách»: dòng «Đủ tên khách» có dấu riêng, không ✓ / ✕, không tính «chưa đạt», chip «Đạt hết», nút «Cho xe chạy thay tài xế» bấm được, hộp «Cho xe chạy» nêu câu «Không cần danh sách khách: <mã đơn>».
//  10. Trang đơn đó: khối Hành khách đổi câu thiếu tên thành «Đơn này không cần đủ tên để xe chạy».
//   7. Đối tác 390 mở form khi công tắc BẬT, Toàn quyền TẮT công tắc, bấm Lưu → máy chủ từ chối, khối Khách hàng và Hành khách tự hiện lại, tiêu điểm vào ô tên.
// Phần này KHÔNG canh được (không bài nào mở được ở đây): đơn đi hôm nay sát giờ (đồng hồ máy chủ không giả được); câu cảnh báo «Xác nhận đơn» của đơn nháp mang dấu (có bài thuần canh); màn tài xế giữ nguyên.
// Thứ tự (ADR-0075 + kho cookie dùng chung): mọi lời gọi API dựng dữ liệu làm TRƯỚC khi mở trang của đúng tài khoản đó; chỗ cần gọi API giữa chừng dùng `goiMoi` (đăng nhập mới, chỉ đá phiên của chính tài khoản đó).
// CHƯA CHẠY lần nào khi viết (Task 3.4 cấm chạy kịch bản Chrome): nếu một bước đỏ vì dữ liệu dựng chưa đúng (quyền của tài khoản dựng, xếp chuyến, giấy tờ xe, tài khoản lai Đối tác + Bán hàng bị chặn…), sửa phần «Dựng dữ liệu», không sửa mã giao diện.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-02-dat-ve-luot-2 node docs/evidence/2026-11-02-dat-ve-luot-2/kich-ban/luot-2-smoke.mjs
// Cuối: "LUOT 2 SMOKE OK (<n> bước)" hoặc danh sách bước đỏ (thoát 1). Thiếu AXE_JS ⇒ dừng ngay.
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

process.env.OUT ??= join(process.cwd(), "docs/evidence/2026-11-02-dat-ve-luot-2");
if (!process.env.AXE_JS) {
  console.error("Thiếu AXE_JS (đường dẫn axe.min.js) — dừng, vì kịch bản này đòi axe-core.");
  process.exit(2);
}
mkdirSync(join(process.env.OUT, "anh"), { recursive: true });
// dp-lib đọc OUT và AXE_JS khi nạp ⇒ nhập SAU khi đã đặt biến môi trường.
const { ACCOUNTS, CHU, DESK, LOC_BEN_TAU, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, fetchTrang, noCode, noOverflowX, shotView, shown, sleep, txt, typeInto, vnDate } = await import("../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs");
const { CAU_BAO_GUI_DON } = await import("../../../../src/shared/gui-don-cau-bao.ts");
const { CAU_NHO_DAT_GAP, CAU_THIEU_GIO_LUOT } = await import("../../../../src/shared/xac-nhan-hien-thi.ts");
const { CAU_VAN_PHONG_BAO_GIO } = await import("../../../../src/shared/chang-form.ts");
const { cauThieuTen } = await import("../../../../src/shared/canh-bao-xac-nhan.ts");

const DOITAC = { name: "Đối Tác Lượt Hai", phone: "0900000621", pin: "246621", permissions: ["PARTNER"] };
const LAI = { name: "Đối Tác Kiêm Bán Hàng", phone: "0900000622", pin: "246622", permissions: ["PARTNER", "SALES"] };
const KHACH = { ten: "Khách Thử Lượt Hai", sdt: "0903261777" };
const GHI_CHU = "Đón 7h cổng khách sạn, SĐT khách 0903261777";
const CHINH_SACH = (phut) => ({ minLeadMinutes: phut, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 2880, refuseLeadMinutes: 720, officePhone: null, acceptWaitMinutes: 10, autoConfirmTransfer: true });

const { env, call } = await dungMoiTruong([CHU, DOITAC, LAI]);
const b = boDem("LUOT 2 SMOKE");
const pages = [];
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const mo = async (account, path, khung) => {
  const p = await env.as(account, path, khung);
  pages.push(p);
  return p;
};
/** Gọi API bằng ĐĂNG NHẬP MỚI (phiên cũ của chính tài khoản đó, nếu đang mở ở trang, bị đá — dùng khi trang của tài khoản đó đã đóng). */
const goiMoi = async (account, method, path, body) => {
  const c = await env.login(account);
  const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* không phải JSON */ }
  return { status: r.status, json, text };
};
const loiConsole = (p, ten) => assert.deepEqual(p.consoleErrors, [], `${ten}: lỗi console ${JSON.stringify(p.consoleErrors)}`);
const khongLo = (chu, ten) => { for (const x of [KHACH.sdt, `0903 261 777`]) assert.ok(!chu.includes(x), `${ten}: không được lộ «${x}»`); };
const thanTrang = "document.querySelector('main').innerText";
const nut = (nhan) => `[...document.querySelectorAll('main button, main a.btn')].some((x) => x.getClientRects().length > 0 && x.innerText.trim() === ${JSON.stringify(nhan)})`;
const chonOption = (sel, viTri) => `(() => { const s = document.querySelector(${JSON.stringify(sel)}); if (!s) return false; s.selectedIndex = ${viTri}; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); return s.value; })()`;
/** Mọi ô giờ gõ (type=time) trong khối đưa đón có đang HIỆN không. */
const oGioDangHien = `[...document.querySelectorAll('.dd input[type="time"]')].filter((x) => x.getClientRects().length > 0).length`;

const NGAY_XA = vnDate(5);
const NGAY_KHOA = vnDate(1);
const donDoiTac = (ngay, gio, ghiChu = "") => call(DOITAC, "POST", "/api/orders", {
  customerName: KHACH.ten, customerPhone: KHACH.sdt, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
  services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, departDate: ngay, note: ghiChu, legs: [{ direction: "OUT", pickupDate: ngay, pickupTime: gio, pickupLocationId: null, pickupPlace: "Sheraton Nha Trang", dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" }] }],
  passengers: [],
});

try {
  // ---- Dựng dữ liệu (API thật; không dùng để kiểm giao diện) -------------------------------------------------------------------------------------------------
  const nen = await dungDuLieuDieuPhoi(env, call); // xe, tài xế, chuyến mẫu; kết thúc bằng chính sách 48 giờ (mọi lượt đón ngày mai thành «dưới hạn chốt»)
  const taoDon = async (ngay, gio, ghiChu, viec) => {
    const r = await donDoiTac(ngay, gio, ghiChu);
    dung(r, 201, `lập đơn ${viec}`);
    return r.json.order.id;
  };
  const guiDon = async (id, viec) => dung(await call(DOITAC, "POST", `/api/orders/${id}/gui-don`, {}), 201, `gửi đơn ${viec}`);
  const dX = await taoDon(NGAY_XA, "08:00", "", "nháp cũ đã lưu giờ (bước 1)"); // gửi ở bước 1 bằng nút
  const dY = await taoDon(NGAY_XA, null, GHI_CHU, "chờ chốt giờ, ngày xa (bước 3)");
  const dW = await taoDon(NGAY_KHOA, null, "", "chờ chốt giờ, ngày mai — Kế toán (bước 4b)");
  const dZ = await taoDon(NGAY_KHOA, null, "", "chờ chốt giờ, ngày mai — Bán hàng (bước 4)");
  for (const [id, viec] of [[dY, "dY"], [dW, "dW"], [dZ, "dZ"]]) await guiDon(id, viec);

  // ---- 1) Đối tác: form không ô giờ, Lưu xoá giờ lượt đầu, Gửi đơn → câu A ----------------------------------------------------------------------------------
  let p = await mo(DOITAC, `/order-form?id=${dX}`, MOB);
  await b.step("1", `390 Đối tác mở nháp cũ: không ô giờ, tóm tắt «${CAU_VAN_PHONG_BAO_GIO}»; Lưu → giờ lượt đầu trống; «Gửi đơn» → câu A${axeNote()}`, async () => {
    await p.waitFor(`!!document.querySelector('.dd-chang')`, "khối đưa đón của form", 15000);
    assert.equal(await p.ev(oGioDangHien), 0, "form đối tác không hiện ô giờ nào");
    assert.ok((await p.ev(`document.querySelector('.dd').textContent`)).includes(CAU_VAN_PHONG_BAO_GIO), "dòng tóm tắt nói văn phòng báo giờ");
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "form Đối tác 390");
    await shotView(p, "1-doi-tac-form-390.png");
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("location.pathname === '/order'", "sang trang đơn sau khi Lưu", 15000);
    const r = await fetchTrang(p, "GET", `/api/orders/${dX}`);
    assert.equal(r.json.order.services[0].legs[0].pickupTime, null, `giờ lượt đầu phải về trống: ${r.text.slice(0, 300)}`);
    await p.waitFor(nut("Gửi đơn"), "nút Gửi đơn");
    await p.ev(click('[data-action="gui-don"]'));
    await p.waitFor(`document.querySelector('main').innerText.includes(${JSON.stringify(CAU_BAO_GUI_DON.A)})`, "câu A", 12000);
    loiConsole(p, "Đối tác bước 1");
  });
  p.close();

  // ---- 2) Kế toán: danh sách đơn chờ nêu «Chưa có giờ đón» -------------------------------------------------------------------------------------------------
  p = await mo(ACCOUNTS.accounting, "/cho-xac-nhan", DESK);
  await b.step("2", `1040 Kế toán, /cho-xac-nhan: các thẻ đơn chờ nêu «Chưa có giờ đón», không lộ tên / SĐT khách${axeNote()}`, async () => {
    await p.waitFor(`document.querySelectorAll('.cx-the').length >= 4`, "bốn thẻ đơn chờ", 15000);
    const so = await p.ev(`[...document.querySelectorAll('.cx-the')].filter((t) => t.innerText.includes('Chưa có giờ đón')).length`);
    assert.ok(so >= 4, `bốn đơn chờ đều nêu «Chưa có giờ đón» (đang thấy ${so})`);
    khongLo(await p.ev(thanTrang), "danh sách chờ");
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "danh sách chờ 1040");
    await shotView(p, "2-ke-toan-danh-sach-1040.png");
  });

  // ---- 3) Kế toán mở đơn: ghi chú, thiếu giờ báo tại chỗ, chọn khung → Còn vé ---------------------------------------------------------------------------------
  const legY = (await fetchTrang(p, "GET", `/api/orders/${dY}`)).json.order.services[0].legs[0].id;
  await b.step("3", `390 Kế toán mở đơn xa ngày: ghi chú dịch vụ đã che số, thiếu giờ báo tại chỗ (không gọi máy chủ), chọn khung → «Còn vé» → đã xác nhận${axeNote()}`, async () => {
    await p.send("Emulation.setDeviceMetricsOverride", { width: MOB.width, height: MOB.height, deviceScaleFactor: 2, mobile: true });
    await p.send("Page.navigate", { url: `${env.base}/order?id=${dY}` });
    await p.waitFor(`!!document.getElementById('cx-gio-${legY}')`, "ô giờ của lượt đầu", 15000);
    const ghiChu = await p.ev(txt('[data-khoi="ghi-chu-dich-vu"]'));
    assert.ok(ghiChu.includes("Đón 7h cổng khách sạn"), `ghi chú dịch vụ hiện: ${ghiChu}`);
    khongLo(ghiChu, "ghi chú dịch vụ");
    assert.equal(await p.ev(`(() => { const g = document.querySelector('[data-khoi="ghi-chu-dich-vu"]'), o = document.querySelector('.cx-luot'); return !!g && !!o && !!(g.compareDocumentPosition(o) & Node.DOCUMENT_POSITION_FOLLOWING); })()`), true, "ghi chú đứng TRÊN các lượt");
    assert.equal(await p.ev(shown('[data-moc="duoi"]')), false, "ngày xa: không dưới hạn chốt");
    const truoc = apiCalls(p).filter((c) => c.method === "POST" && c.path.includes("/quyet-dinh")).length;
    await p.ev(click('[data-action="quyet-dinh-con-ve"]'));
    await p.waitFor(`((e) => !!e && e.getClientRects().length > 0)(document.getElementById('cx-gio-${legY}-loi'))`, "câu báo thiếu giờ");
    assert.equal(await p.ev(txt(`#cx-gio-${legY}-loi`)), CAU_THIEU_GIO_LUOT);
    assert.equal(await p.ev(`document.activeElement && document.activeElement.id`), `cx-gio-${legY}`, "tiêu điểm vào ô giờ thiếu");
    assert.equal(apiCalls(p).filter((c) => c.method === "POST" && c.path.includes("/quyet-dinh")).length, truoc, "thiếu giờ thì KHÔNG gọi máy chủ");
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "Kế toán bảng Còn vé 390");
    await shotView(p, "3-ke-toan-thieu-gio-390.png");
    await p.waitFor(`document.getElementById('cx-gio-${legY}').options.length > 2`, "các khung giờ nạp xong", 12000);
    await p.ev(chonOption(`#cx-gio-${legY}`, 1));
    await p.ev(click('[data-action="quyet-dinh-con-ve"]'));
    await p.waitFor(`!!document.querySelector('.sheet-foot-xac-nhan .btn-danger')`, "hộp hỏi lại trước Còn vé, xác nhận đơn (ADR-0166)", 8000);
    await p.ev(click('.sheet-foot-xac-nhan .btn-danger'));
    await p.waitFor(`!document.querySelector('[data-action="quyet-dinh-con-ve"]')`, "bảng quyết định biến mất", 15000);
    const r = await fetchTrang(p, "GET", `/api/orders/${dY}`);
    assert.equal(r.json.order.status, "confirmed", r.text.slice(0, 300));
    assert.notEqual(r.json.order.services[0].legs[0].pickupTime, null, "giờ khung đã ghi vào lượt");
    loiConsole(p, "Kế toán bước 3");
  });

  // ---- 4b) Kế toán, đơn ngày mai: câu nhờ, «Còn vé» bị 409 nhưng bảng giữ giờ -----------------------------------------------------------------------------------
  const legW = (await fetchTrang(p, "GET", `/api/orders/${dW}`)).json.order.services[0].legs[0].id;
  await b.step("4b", `390 Kế toán, đơn ngày mai: dưới hạn chốt hiện câu nhờ Bán hàng / Quản trị, KHÔNG có «Đặt gấp»; «Còn vé» bị từ chối mà bảng còn nguyên, giờ đã chọn còn${axeNote()}`, async () => {
    await p.send("Page.navigate", { url: `${env.base}/order?id=${dW}` });
    await p.waitFor(`!!document.getElementById('cx-gio-${legW}') && document.getElementById('cx-gio-${legW}').options.length > 2`, "ô giờ và khung", 15000);
    await p.ev(chonOption(`#cx-gio-${legW}`, 1));
    await p.waitFor(shown('[data-moc="duoi"]'), "vùng dưới hạn chốt hiện");
    assert.ok((await p.ev(txt('[data-moc="duoi"]'))).includes(CAU_NHO_DAT_GAP), "câu nhờ đặt gấp");
    assert.equal(await p.ev(shown('[data-action="mo-dat-gap"]')), false, "Kế toán không có nút «Đặt gấp»");
    const giaTri = await p.ev(`document.getElementById('cx-gio-${legW}').value`);
    await p.ev(click('[data-action="quyet-dinh-con-ve"]'));
    await p.waitFor(`!!document.querySelector('.sheet-foot-xac-nhan .btn-danger')`, "hộp hỏi lại trước Còn vé, xác nhận đơn (ADR-0166)", 8000);
    await p.ev(click('.sheet-foot-xac-nhan .btn-danger'));
    await p.waitFor(`!!document.querySelector('main .alert, main .banner[role="alert"], main [role="alert"]:not([hidden])')`, "câu từ chối của máy chủ", 12000);
    assert.equal(await p.ev(`!!document.querySelector('[data-action="quyet-dinh-con-ve"]')`), true, "bảng còn nguyên (không tải lại đơn)");
    assert.equal(await p.ev(`document.getElementById('cx-gio-${legW}').value`), giaTri, "giờ đã chọn còn giữ");
    assert.equal((await fetchTrang(p, "GET", `/api/orders/${dW}`)).json.order.status, "draft", "đơn chưa xác nhận");
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "Kế toán dưới hạn chốt 390");
    await shotView(p, "4b-ke-toan-cau-nho-390.png"); // không kiểm lỗi console: máy chủ trả 409 có chủ đích, trình duyệt ghi dòng lỗi mạng
  });
  p.close();

  // ---- 4) Bán hàng đặt gấp ngay ở bảng ---------------------------------------------------------------------------------------------------------------------
  p = await mo(ACCOUNTS.salesA, `/order?id=${dZ}`, DESK);
  await b.step("4", `1040 Bán hàng, đơn ngày mai: chọn khung → «Đặt gấp» chọn lý do ngay ở bảng (chưa gọi máy chủ) → «Còn vé» → đã xác nhận, lượt mang dấu đặt gấp${axeNote()}`, async () => {
    const legZ = (await fetchTrang(p, "GET", `/api/orders/${dZ}`)).json.order.services[0].legs[0].id;
    await p.waitFor(`!!document.getElementById('cx-gio-${legZ}') && document.getElementById('cx-gio-${legZ}').options.length > 2`, "ô giờ và khung", 15000);
    await p.ev(chonOption(`#cx-gio-${legZ}`, 1));
    await p.waitFor(shown('[data-moc="duoi"]'), "vùng dưới hạn chốt");
    await p.ev(click('[data-action="mo-dat-gap"]'));
    await p.waitFor(shown('[data-dg="ly-do"]'), "khung đặt gấp mở");
    await p.ev(`(() => { const s = document.querySelector('[data-dg="ly-do"]'); s.value = 'KHACH_DOAN_GOI_GAP'; s.dispatchEvent(new Event('change', { bubbles: true })); return s.value; })()`);
    const truoc = apiCalls(p).filter((c) => c.method === "POST").length;
    await p.ev(click('[data-action="duyet-dat-gap"]'));
    await p.waitFor(`document.querySelector('[data-moc="duoi"] .dg-warn-sub')?.innerText.startsWith('Đã chọn lý do đặt gấp')`, "câu đã chọn lý do");
    assert.equal(apiCalls(p).filter((c) => c.method === "POST").length, truoc, "Ghi đặt gấp ở bảng chỉ giữ giấy, chưa gọi máy chủ");
    await shotView(p, "4-ban-hang-dat-gap-1040.png");
    await axe(p, "Bán hàng đặt gấp 1040");
    await p.ev(click('[data-action="quyet-dinh-con-ve"]'));
    await p.waitFor(`!!document.querySelector('.sheet-foot-xac-nhan .btn-danger')`, "hộp hỏi lại trước Còn vé, xác nhận đơn (ADR-0166)", 8000);
    await p.ev(click('.sheet-foot-xac-nhan .btn-danger'));
    await p.waitFor(`!document.querySelector('[data-action="quyet-dinh-con-ve"]')`, "bảng quyết định biến mất", 15000);
    const r = await fetchTrang(p, "GET", `/api/orders/${dZ}`);
    assert.equal(r.json.order.status, "confirmed", r.text.slice(0, 300));
    assert.notEqual(r.json.order.services[0].legs[0].datGap, null, "lượt mang dấu đặt gấp");
    loiConsole(p, "Bán hàng bước 4");
  });
  p.close();

  // ---- 5) Toàn quyền bật công tắc; Quản trị không thấy khối ------------------------------------------------------------------------------------------------
  p = await mo(ACCOUNTS.chu, "/account", DESK);
  await b.step("5", `1040 Toàn quyền bật «Ẩn thông tin khách khi đối tác đặt vé» ở trang Tôi; Quản trị không thấy khối${axeNote()}`, async () => {
    await p.waitFor(`!!document.getElementById('an-khach-doi') && !document.getElementById('an-khach-cai-dat').hidden`, "khối công tắc hiện cho Toàn quyền", 15000);
    assert.equal(await p.ev(txt("#an-khach-trang-thai")), "Đang tắt.");
    await p.ev(click("#an-khach-doi"));
    await p.waitFor(`document.getElementById('an-khach-trang-thai')?.innerText.trim() === 'Đang bật.'`, "công tắc bật", 12000);
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "trang Tôi, công tắc bật");
    await shotView(p, "5-toan-quyen-cong-tac-1040.png");
    p.close();
    const q = await mo(ACCOUNTS.admin, "/account", DESK);
    await q.waitFor("document.readyState === 'complete'", "trang Tôi của Quản trị");
    await sleep(1200); // đủ để một lời gọi hỏi công tắc (nếu có) trả về
    assert.equal(await q.ev(`document.getElementById('an-khach-cai-dat').hidden`), true, "Quản trị không thấy khối");
    assert.equal(await q.ev(`!document.getElementById('an-khach-doi')`), true, "không có nút đổi công tắc");
    q.close();
  });

  // ---- Dựng đơn «không cần danh sách khách» (công tắc đang BẬT) ----------------------------------------------------------------------------------------------
  // Chính sách tạm đặt lại mốc 6 giờ (cửa sổ cho xe chạy vẫn 48 giờ) để đơn ngày mai xác nhận không cần đặt gấp; Đối tác không gửi thông tin khách (máy chủ điền lại và gắn dấu).
  dung(await goiMoi(CHU, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", CHINH_SACH(360)), 201, "mốc 6 giờ cho đơn không cần danh sách");
  const mien = await goiMoi(DOITAC, "POST", "/api/orders", {
    discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, departDate: NGAY_KHOA, legs: [{ direction: "OUT", pickupDate: NGAY_KHOA, pickupTime: "13:30", pickupLocationId: null, pickupPlace: "Sheraton Nha Trang", dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" }] }],
  });
  dung(mien, 201, "Đối tác lập đơn không khách (công tắc bật)");
  const donMien = mien.json.order;
  // Đơn dựng qua API có sẵn giờ đón nên Gửi đơn tự xác nhận (ADR-0154 Đ1.7), không qua văn phòng.
  const guiMien = await goiMoi(DOITAC, "POST", `/api/orders/${donMien.id}/gui-don`, {});
  dung(guiMien, 200, "gửi đơn không cần danh sách");
  assert.equal(guiMien.json.nhanh, "B", "đơn có giờ đón tự xác nhận");
  const xacNhan = await goiMoi(ACCOUNTS.admin, "GET", `/api/orders/${donMien.id}`);
  dung(xacNhan, 200, "Quản trị đọc đơn không cần danh sách");
  const legMien = xacNhan.json.order.services[0].legs[0].id;
  const ds = await goiMoi(ACCOUNTS.admin, "GET", `/api/orders/${donMien.id}/passengers`);
  dung(ds, 200, "danh sách hành khách của đơn không cần danh sách");
  dung(await goiMoi(ACCOUNTS.admin, "POST", `/api/orders/${donMien.id}/passengers`, { expectedUpdatedAt: ds.json.orderUpdatedAt, them: [{ fullName: "Hành Khách Một Chrome", birthYear: 1985, paxCode: null }], sua: [], huy: [] }), 200, "văn phòng ghi tên một khách");
  const t5 = await goiMoi(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: nen.XE_A.id, taiXePartyId: nen.AN.partyId, batDau: { ngay: NGAY_KHOA, gio: "13:00" }, ketThuc: { ngay: NGAY_KHOA, gio: "14:30" } });
  dung(t5, 201, "chuyến cho đơn không cần danh sách");
  const xep = await goiMoi(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${t5.json.chuyen.id}/phan-bo`, { version: t5.json.chuyen.version, requestId: randomUUID(), chang: [{ legId: legMien, soSuat: 2 }] });
  dung(xep, 200, "xếp đơn không cần danh sách vào chuyến");
  const chuyenMien = xep.json.chuyen;

  // ---- 6) Đối tác với công tắc BẬT ------------------------------------------------------------------------------------------------------------------------------
  p = await mo(DOITAC, "/order-form", MOB);
  await b.step("6", `390 Đối tác (công tắc BẬT): không khối Khách hàng (trừ Ngày khởi hành), không khối Hành khách; chọn dịch vụ, ngày, Lưu → lập được đơn${axeNote()}`, async () => {
    await p.waitFor(`!!document.querySelector('[data-buoc-khoi="khach"][data-an-khach]')`, "khối khách đã ẩn", 15000);
    assert.equal(await p.ev(shown("#customerName")), false, "không ô tên khách");
    assert.equal(await p.ev(shown("#customerPhone")), false, "không ô SĐT khách");
    assert.equal(await p.ev(shown("#orderDate")), true, "«Ngày khởi hành» còn");
    assert.equal(await p.ev(shown("#hk-card")), false, "không khối Hành khách");
    assert.equal(await p.ev(`document.querySelector('[data-buoc-khoi="khach"]').innerText.includes('Khách hàng')`), false, "không tiêu đề «Khách hàng»");
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "form Đối tác, khối khách ẩn 390");
    await shotView(p, "6-doi-tac-an-khach-390.png");
    await p.ev(`document.querySelector('#catalog-list .catalog-pick').click(); true`);
    await p.ev(typeInto("#orderDate", vnDate(5)));
    await p.waitFor(`!!document.querySelector('[data-action="chon-khong-don"]') || !!document.querySelector('.svc-card, .dich-vu-card')`, "thẻ dịch vụ", 10000);
    await p.ev(click('[data-action="chon-khong-don"]')); // dịch vụ đòi chọn Đón / Không đón thì chọn «Không đón»; không đòi thì không có nút này (click trả false)
    await sleep(200);
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("location.pathname === '/order' && !!new URLSearchParams(location.search).get('id')", "chuyển tới /order?id=… sau khi Lưu", 15000);
    loiConsole(p, "Đối tác bước 6");
  });
  p.close();

  // ---- 8) Tài khoản lai vẫn thấy hai khối ------------------------------------------------------------------------------------------------------------------------
  p = await mo(LAI, "/order-form", MOB);
  await b.step("8", `390 Tài khoản lai Đối tác + Bán hàng (công tắc BẬT): vẫn thấy khối Khách hàng và Hành khách${axeNote()}`, async () => {
    await p.waitFor(shown("#customerName"), "ô tên khách hiện", 15000);
    await sleep(600); // công tắc (nếu bị áp nhầm) chỉ ẩn sau khi máy chủ trả lời
    assert.equal(await p.ev(shown("#customerName")), true, "ô tên khách còn");
    assert.equal(await p.ev(`!document.querySelector('[data-an-khach]')`), true, "khối khách không bị ẩn");
    assert.equal(await p.ev(shown("#hk-card")), true, "khối Hành khách còn");
    await axe(p, "form tài khoản lai 390");
    await shotView(p, "8-tai-khoan-lai-390.png");
    loiConsole(p, "Tài khoản lai");
  });
  p.close();

  // ---- 9, 10) Quản trị: chi tiết chuyến và trang đơn của đơn không cần danh sách -----------------------------------------------------------------------------
  p = await mo(ACCOUNTS.admin, `/chuyen?id=${chuyenMien.id}`, DESK);
  await b.step("9", `1040 Chi tiết chuyến có đơn không cần danh sách: dòng «Đủ tên khách» có dấu riêng (không ✓ / ✕), chip «Đạt hết», «Cho xe chạy thay tài xế» bấm được, hộp nêu «Không cần danh sách khách: ${donMien.orderCode}»${axeNote()}`, async () => {
    await p.waitFor(`document.querySelectorAll('.dp-cond').length > 0`, "bảng điều kiện", 15000);
    const dong = `document.querySelector('.dp-cond[data-khong-can="true"]')`;
    assert.equal(await p.ev(`!!${dong}`), true, "có dòng «không cần»");
    const chu = await p.ev(`${dong}.innerText.replace(/\\s+/g, ' ')`);
    assert.ok(chu.includes("Đủ tên khách") && chu.includes(`Không cần danh sách khách: ${donMien.orderCode}`), `chữ của dòng: ${chu}`);
    assert.ok(!/[✓✕]/.test(chu), "không dấu ✓ / ✕");
    assert.equal(await p.ev(`${dong}.querySelector('.dp-cond-mark').getAttribute('aria-label')`), "Không cần");
    assert.equal(await p.ev(`[...document.querySelectorAll('.dp-cond')].filter((x) => x.dataset.dat === 'false' && x.dataset.khongCan !== 'true').length`), 0, "không dòng nào chưa đạt");
    assert.ok((await p.ev(`document.getElementById('ct-dk-title').closest('.dp-card-head').innerText`)).includes("Đạt hết"), "chip «Đạt hết»");
    assert.equal(await p.ev(`(() => { const x = document.querySelector('[data-action="xuat-ben-thay"]'); return !!x && !x.disabled; })()`), true, "«Cho xe chạy thay tài xế» bấm được");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "chi tiết chuyến 1040");
    await shotView(p, "9-chi-tiet-chuyen-1040.png");
    await p.ev(click('[data-action="xuat-ben-thay"]'));
    await p.waitFor(`document.body.innerText.includes('Đạt đủ') && document.body.innerText.includes(${JSON.stringify(`Không cần danh sách khách: ${donMien.orderCode}`)})`, "hộp «Cho xe chạy» nêu câu không cần", 10000);
    await shotView(p, "9b-hop-cho-xe-chay-1040.png");
    loiConsole(p, "Quản trị bước 9");
  });
  await b.step("10", `1040 Trang đơn không cần danh sách: khối Hành khách nói «Đơn này không cần đủ tên để xe chạy», không còn «cần đủ trước khi xe chạy»${axeNote()}`, async () => {
    await p.send("Page.navigate", { url: `${env.base}/order?id=${donMien.id}` });
    await p.waitFor(`!!document.querySelector('[data-khoi="hanh-khach"]')`, "khối Hành khách", 15000);
    const khoi = await p.ev(`document.querySelector('[data-khoi="hanh-khach"]').innerText.replace(/\\s+/g, ' ')`);
    assert.ok(khoi.includes(cauThieuTen(1, true)), `câu thiếu tên theo dấu: ${khoi}`);
    assert.ok(!khoi.includes("cần đủ trước khi xe chạy"), "không còn câu cũ");
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "trang đơn không cần danh sách 1040");
    await shotView(p, "10-trang-don-1040.png");
    loiConsole(p, "Quản trị bước 10");
  });
  p.close();

  // ---- 7) Công tắc vừa tắt khi form đang ẩn ----------------------------------------------------------------------------------------------------------------------
  p = await mo(DOITAC, "/order-form", MOB);
  await b.step("7", `390 Đối tác mở form khi công tắc BẬT, Toàn quyền TẮT công tắc, bấm Lưu → lỗi của máy chủ, khối Khách hàng và Hành khách tự hiện lại, tiêu điểm vào ô tên${axeNote()}`, async () => {
    await p.waitFor(`!!document.querySelector('[data-buoc-khoi="khach"][data-an-khach]')`, "khối khách đã ẩn", 15000);
    await p.ev(`document.querySelector('#catalog-list .catalog-pick').click(); true`);
    await p.ev(typeInto("#orderDate", vnDate(5)));
    await sleep(300);
    await p.ev(click('[data-action="chon-khong-don"]'));
    dung(await goiMoi(CHU, "POST", "/api/cai-dat/an-thong-tin-khach", { bat: false }), 200, "Toàn quyền tắt công tắc giữa lúc Đối tác đang soạn");
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor(`!document.querySelector('[data-an-khach]')`, "khối khách tự hiện lại", 15000);
    assert.equal(await p.ev(shown("#customerName")), true, "ô tên khách hiện lại");
    assert.equal(await p.ev(`document.activeElement && document.activeElement.id`), "customerName", "tiêu điểm vào ô tên");
    assert.equal(await p.ev(`(() => { const e = document.getElementById('save-error'); return !!e && !e.hidden && e.textContent.trim().length > 0; })()`), true, "câu lỗi của máy chủ còn hiện");
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "form Đối tác sau khi công tắc tắt 390");
    await shotView(p, "7-doi-tac-cong-tac-vua-tat-390.png"); // không kiểm lỗi console: máy chủ trả 400 có chủ đích
  });
  p.close();
} finally {
  for (const pg of pages) try { pg.close(); } catch { /* đã đóng */ }
  await env.stop();
}
b.xong();
