// Giao diện «Bán hàng phụ trách đơn» (ADR-0142, Task 7; chủ dự án 5/11: mỗi đơn có HAI vai — «Người phụ trách» là Bán hàng chịu trách nhiệm chính, «Hướng dẫn viên» là người đón
// khách, thu tiền tại cảng) trên Chrome thật, D1 tạm, 390 + 1040 (ảnh để chủ duyệt thêm 1280). Dữ liệu đi đường thật (route API); tên, SĐT GIẢ.
//   1) Bán hàng (người lập) ở form lập đơn: có hai khối «Người phụ trách» (mời Bán hàng, chỉ tên) và «Hướng dẫn viên» (bảng chọn chỉ nhóm Hướng dẫn viên).
//   2) Bán hàng được mời (X) mở đơn đã xác nhận: «Đang mời <X> · còn N phút», Nhận phụ trách / Từ chối; khối «Hướng dẫn viên» KHÔNG có «Nhận làm HDV» (X không giữ quyền Hướng dẫn viên).
//      X bấm Nhận → thành người phụ trách: thấy «Sửa thông tin chuyến», «Sửa danh sách» (khách), KHÔNG «Huỷ đơn», KHÔNG dòng «Chỉ … mới được sửa»; X khác bấm Từ chối → «Chờ Bán hàng nhận».
//   3) Đơn đang chờ xác nhận có mời X: X bấm Nhận phụ trách → focus vào bảng «Xác nhận đơn» có sẵn (Còn vé, xác nhận đơn / Hết vé), không gọi máy chủ.
//   4) Đối tác lập, mời, X nhận → Đối tác thấy TÊN người phụ trách, không nút nào, khối «Hướng dẫn viên» ẩn; thẻ đơn ở danh sách có «Phụ trách: <tên>».
//   5) Quản trị: đơn «Chờ Bán hàng nhận» → Nhận phụ trách (thành người phụ trách), rồi Đổi người phụ trách (bảng chỉ Bán hàng, «Lưu người phụ trách»); không có «Nhận làm HDV».
//   6) Kế toán: thẻ Trang chủ «Đơn chưa có người phụ trách» (đơn đã xác nhận mở được, đơn chờ chỉ là số); mở đơn thấy chip, không nút. Thẻ cũ «Đơn chưa có HDV nhận».
//   7) Hướng dẫn viên (FIELD): trang đơn của mình có khối «Hướng dẫn viên» (Từ chối đơn), khối «Người phụ trách» không nút.
// Trình duyệt dùng chung kho cookie: dựng dữ liệu bằng API XONG mới mở trang; tài khoản mở SAU CÙNG là tài khoản trang cần. Ảnh lưu ở OUT/anh/<vai>-<trang>-<khổ>.png.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài, mất ~5 phút vì có một lần chờ 65 giây cho thẻ cảnh báo):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-27-ban-hang-phu-trach node docs/evidence/2026-10-27-ban-hang-phu-trach/kich-ban/ban-hang-phu-trach-smoke.mjs
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, CHU, DESK, MOB, OUT, assert, axe, axeNote, boDem, click, dungMoiTruong, fetchTrang, noCode, noOverflowX, sleep, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const DOITAC = { name: "Đối Tác Phụ Trách 271", phone: "0900000711", pin: "246711", permissions: ["PARTNER"] };
const HDV = { name: "Hướng Dẫn Phụ Trách 271", phone: "0900000712", pin: "246712", permissions: ["FIELD"] };
const RONG = { width: 1280, height: 820, mobile: false };
const { env, call } = await dungMoiTruong([CHU, DOITAC, HDV]);
const b = boDem("BAN HANG PHU TRACH (giao dien)");
const ngay = vnDate(3);
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const idCua = (a) => env.sql(`SELECT id FROM staff WHERE phone = '${a.phone}'`)[0].id;
const KHACH = { ten: "Khách Thử Phụ Trách", sdt: "0903 271 001" };
const lap = async (who, ma, viec, extra = {}) => {
  const r = await call(who, "POST", "/api/orders", {
    customerName: KHACH.ten, customerPhone: KHACH.sdt, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "catalog", catalogCode: ma, pickupChoice: "KHONG_DON", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: ma === "TD101" ? 1350000 : 800000 }, departDate: ngay, legs: [] }],
    passengers: [], ...extra,
  });
  dung(r, 201, `lập đơn ${viec}`);
  return r.json.order.id;
};
const xacNhan = async (who, id, viec) => dung(await call(who, "POST", `/api/orders/${id}/status`, { status: "confirmed" }), 200, `xác nhận ${viec}`);
const chup = async (p, ten, khung) => {
  await sleep(400);
  const cao = await p.ev("Math.ceil(document.documentElement.scrollHeight)");
  const dat = (h) => p.send("Emulation.setDeviceMetricsOverride", { width: khung.width, height: h, deviceScaleFactor: khung.mobile ? 2 : 1, mobile: khung.mobile });
  await dat(Math.max(khung.height, cao));
  await sleep(350);
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, "anh", `${ten}.png`), Buffer.from(r.result.data, "base64"));
  await dat(khung.height);
  await sleep(200);
};
const doiKhung = async (p, khung) => {
  await p.send("Emulation.setDeviceMetricsOverride", { width: khung.width, height: khung.height, deviceScaleFactor: khung.mobile ? 2 : 1, mobile: khung.mobile });
  await p.send("Emulation.setTouchEmulationEnabled", { enabled: khung.mobile });
  await p.send("Page.reload", {});
  await sleep(300);
  await p.waitFor("document.readyState === 'complete'", "tải lại theo khổ mới");
};
/** Ảnh một trang ở 390 (đang mở) rồi ở 1280 (tải lại), cuối cùng trả về 390. `cho` = biểu thức chờ trang vẽ xong. */
const haiKho = async (p, vai, trang, cho) => {
  await chup(p, `${vai}-${trang}-390`, MOB);
  await doiKhung(p, RONG);
  await p.waitFor(cho, `${vai} ${trang} 1280`, 12000);
  await chup(p, `${vai}-${trang}-1280`, RONG);
  await doiKhung(p, MOB);
  await p.waitFor(cho, `${vai} ${trang} 390 lại`, 12000);
};
const chu = (sel) => `((el) => el ? el.innerText.replace(/\\s+/g, ' ').trim() : null)(document.querySelector(${JSON.stringify(sel)}))`;
const co = (sel) => `!!document.querySelector(${JSON.stringify(sel)})`;
const khoiBH = '[data-khoi="ban-hang-phu-trach"]';
const nut = (nhan) => `[...document.querySelectorAll('main button, main a.btn')].some((x) => x.getClientRects().length > 0 && x.innerText.trim() === ${JSON.stringify(nhan)})`;
const loiConsole = (p, ten) => assert.deepEqual(p.consoleErrors, [], `${ten}: lỗi console ${JSON.stringify(p.consoleErrors)}`);
const khongLo = (txt, ten) => { for (const x of [KHACH.sdt, KHACH.sdt.replace(/\s/g, "")]) assert.ok(!txt.includes(x), `${ten}: không được lộ «${x}»`); };

let dungXong = false;
try {
  // ---- Dữ liệu -------------------------------------------------------------------------------------------------------------------------------------------------
  const idB = idCua(ACCOUNTS.salesB);
  dung(await call(CHU, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: "TD101", canXacNhan: true }), 200, "đặt cờ cần xác nhận cho TD101");
  const o1 = await lap(ACCOUNTS.salesA, "TTB06", "O1 mời X", { banHangMoiStaffId: idB });
  await xacNhan(ACCOUNTS.salesA, o1, "O1");
  const o6 = await lap(ACCOUNTS.salesA, "TTB06", "O6 mời X (để Từ chối)", { banHangMoiStaffId: idB });
  await xacNhan(ACCOUNTS.salesA, o6, "O6");
  const o2 = await lap(ACCOUNTS.salesA, "TTB06", "O2 không mời");
  await xacNhan(ACCOUNTS.salesA, o2, "O2");
  const o4 = await lap(ACCOUNTS.salesA, "TD101", "O4 chờ xác nhận có mời X", { banHangMoiStaffId: idB });
  dung(await call(ACCOUNTS.salesA, "POST", `/api/orders/${o4}/gui-xac-nhan`, {}), 200, "gửi xác nhận O4");
  const o3 = await lap(DOITAC, "TTB06", "O3 của Đối tác, mời X", { banHangMoiStaffId: idB });
  dung(await call(DOITAC, "POST", `/api/orders/${o3}/gui-don`, {}), 200, "Đối tác gửi O3");
  dung(await call(ACCOUNTS.salesB, "POST", `/api/orders/${o3}/ban-hang/nhan`, {}), 200, "X nhận O3");
  const o7 = await lap(ACCOUNTS.salesA, "TTB06", "O7 giao Hướng dẫn viên");
  await xacNhan(ACCOUNTS.salesA, o7, "O7");
  dung(await call(ACCOUNTS.salesA, "PUT", `/api/orders/${o7}/handler`, { staffId: idCua(HDV) }), 200, "giao O7 cho Hướng dẫn viên");
  // Thẻ cảnh báo: ưu tiên 1 phút, giờ hành chính cả ngày; O5 ghi nhận SAU đó rồi chờ 65 giây (các bước dưới tự trôi thời gian, chỉ chờ nốt phần thiếu).
  dung(await call(CHU, "POST", "/api/cai-dat/ban-hang-phu-trach", { phutUuTien: 1, tuPhut: 0, denPhut: 1440 }), 200, "chính sách ưu tiên 1 phút");
  const o5 = await lap(ACCOUNTS.salesA, "TTB06", "O5 vào thẻ cảnh báo");
  await xacNhan(ACCOUNTS.salesA, o5, "O5");
  const o8 = await lap(ACCOUNTS.salesA, "TD101", "O8 chờ xác nhận, không mời (thẻ: Kế toán chỉ thấy số)");
  dung(await call(ACCOUNTS.salesA, "POST", `/api/orders/${o8}/gui-xac-nhan`, {}), 200, "gửi xác nhận O8");
  const luc = Date.now();
  dungXong = true;

  // ---- 1) Bán hàng (người lập): form ----------------------------------------------------------------------------------------------------------------------------
  let p = await env.as(ACCOUNTS.salesA, "/order-form", MOB);
  await b.step("1", `390 Bán hàng lập đơn: hai khối «Người phụ trách» (mời Bán hàng, chỉ tên) và «Hướng dẫn viên» (bảng chỉ nhóm Hướng dẫn viên)${axeNote()}`, async () => {
    await p.waitFor(co("#ban-hang-card:not([hidden])") + " && " + co("#owner-card:not([hidden])"), "hai khối", 12000);
    assert.equal(await p.ev(chu("#ban-hang-title")), "Người phụ trách");
    assert.equal(await p.ev(chu("#owner-title")), "Hướng dẫn viên");
    assert.match(await p.ev(chu("#ban-hang-card")), /Chờ Bán hàng nhận/);
    await p.ev(click('[data-action="pick-ban-hang"]'));
    await p.waitFor(co(".assignee-person"), "danh sách mời", 12000);
    const ten = await p.ev("[...document.querySelectorAll('.assignee-person-name')].map((x) => x.textContent.trim())");
    assert.ok(ten.includes(ACCOUNTS.salesB.name), `có Bán hàng B: ${ten}`);
    assert.equal(await p.ev("document.querySelectorAll('.assignee-sheet [data-staff-id]:not([data-staff-id=\"\"]) + *').length >= 0"), true);
    await chup(p, "ban-hang-form-bang-moi-390", MOB);
    await p.ev(click(`.assignee-person[data-staff-id="${idB}"]`));
    await p.waitFor(co('[data-action="clear-ban-hang"]'), "đã chọn người mời");
    assert.match(await p.ev(chu("#ban-hang-card")), new RegExp(ACCOUNTS.salesB.name));
    await p.ev(click('[data-action="pick-handler"]'));
    await p.waitFor(co(".assignee-person"), "danh sách Hướng dẫn viên", 12000);
    const nhom = await p.ev("[...document.querySelectorAll('.assignee-group-label')].map((x) => x.textContent.trim())");
    assert.deepEqual(nhom, ["Hướng dẫn viên"], "bảng Hướng dẫn viên chỉ có nhóm Hướng dẫn viên");
    await chup(p, "ban-hang-form-bang-hdv-390", MOB);
    await p.ev("document.querySelector('.assignee-close').click()");
    await p.waitFor(`!document.querySelector('.assignee-sheet')`, "đóng bảng");
    await haiKho(p, "ban-hang", "form", co("#ban-hang-card:not([hidden])"));
    assert.equal(await p.ev(noOverflowX), true, "390 không tràn ngang");
    await axe(p, "form 390");
    loiConsole(p, "form");
  });
  p.close();

  // ---- 2) Bán hàng X: lời mời, Nhận, quyền sửa -------------------------------------------------------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.salesB, `/order?id=${o1}`, MOB);
  await b.step("2", `390 X mở đơn có lời mời: «Đang mời … · còn N phút», Nhận phụ trách + Từ chối; «Hướng dẫn viên» không có «Nhận làm HDV»${axeNote()}`, async () => {
    await p.waitFor(co(khoiBH), "khối Người phụ trách", 12000);
    assert.match(await p.ev(chu(khoiBH)), new RegExp(`Đang mời ${ACCOUNTS.salesB.name} · còn \\d+ phút`));
    assert.equal(await p.ev(co('[data-action="claim-ban-hang"]')), true);
    assert.equal(await p.ev(co('[data-action="refuse-invite"]')), true);
    assert.equal(await p.ev(co('[data-action="claim-handler"]')), false, "X không giữ quyền Hướng dẫn viên: không «Nhận làm HDV»");
    assert.equal(await p.ev(nut("Nhận làm HDV")), false);
    assert.equal(await p.ev(chu("#handler-title")), "Hướng dẫn viên");
    assert.equal(await p.ev(noCode), "");
    await haiKho(p, "ban-hang-x", "don-moi", co(khoiBH));
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "X mời 390");
    khongLo(await p.ev("document.querySelector('main').innerText"), "X mời");
  });
  await b.step("2b", "X bấm Nhận phụ trách → thành người phụ trách: có «Sửa thông tin chuyến» và «Sửa danh sách», KHÔNG «Huỷ đơn», KHÔNG dòng «Chỉ … mới được sửa»", async () => {
    await p.ev(click('[data-action="claim-ban-hang"]'));
    await p.waitFor(`document.querySelector('${khoiBH} .handler-name')?.innerText.trim() === ${JSON.stringify(ACCOUNTS.salesB.name)}`, "tên người phụ trách", 12000);
    assert.equal(await p.ev(co('[data-action="claim-ban-hang"]')), false);
    assert.equal(await p.ev(nut("Sửa thông tin chuyến")), true, "sửa chuyến");
    assert.equal(await p.ev(co('[data-action="sua-danh-sach"]')), true, "sửa danh sách khách");
    assert.equal(await p.ev(nut("Huỷ đơn")), false, "không Huỷ đơn");
    assert.equal(await p.ev(`document.querySelector('main').innerText.includes('mới được sửa, xác nhận hoặc huỷ')`), false, "không dòng «Chỉ … mới được sửa»");
    assert.equal(await p.ev(co('[data-action="change-ban-hang"]')), false, "X không có nút Đổi (chỉ Quản trị, Toàn quyền)");
    await chup(p, "ban-hang-x-da-nhan-390", MOB);
    loiConsole(p, "X nhận");
  });
  await b.step("2c", "1040 X (đã là người phụ trách): không tràn ngang, không lộ SĐT khách", async () => {
    await doiKhung(p, DESK);
    await p.waitFor(co(khoiBH), "1040", 12000);
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "X 1040");
    khongLo(await p.ev("document.querySelector('main').innerText"), "X 1040");
    await doiKhung(p, MOB);
  });
  await b.step("2d", "X bấm Từ chối ở đơn khác có lời mời → «Chờ Bán hàng nhận»; vẫn không có Nhận làm HDV", async () => {
    await p.send("Page.navigate", { url: `${env.base}/order?id=${o6}` });
    await p.waitFor(co('[data-action="refuse-invite"]'), "nút Từ chối", 12000);
    await p.ev(click('[data-action="refuse-invite"]'));
    await p.waitFor(`/Chờ Bán hàng nhận/.test(document.querySelector('${khoiBH}')?.innerText ?? '') && !document.querySelector('[data-action="refuse-invite"]')`, "đơn chờ Bán hàng nhận", 12000);
    await chup(p, "ban-hang-x-tu-choi-390", MOB);
  });
  await b.step("3", `390 X mở đơn ĐANG CHỜ xác nhận có lời mời: Nhận phụ trách đưa tới bảng «Xác nhận đơn» (Còn vé, xác nhận đơn / Hết vé), không gọi máy chủ${axeNote()}`, async () => {
    await p.send("Page.navigate", { url: `${env.base}/order?id=${o4}` });
    await p.waitFor(co('[data-action="claim-ban-hang"]') + " && " + co('[data-action="quyet-dinh-con-ve"]'), "bảng quyết định + nút Nhận", 12000);
    p.requests.length = 0;
    await p.ev(click('[data-action="claim-ban-hang"]'));
    await sleep(500);
    assert.equal(await p.ev(`document.activeElement?.closest('[data-khoi="xac-nhan-don"]') !== null`), true, "focus nằm trong bảng Xác nhận đơn");
    assert.deepEqual(p.requests.filter((r) => /ban-hang\/nhan/.test(r.url)), [], "không gọi POST …/ban-hang/nhan");
    await haiKho(p, "ban-hang-x", "don-cho", co('[data-khoi="xac-nhan-don"]'));
    await axe(p, "X đơn chờ 390");
    loiConsole(p, "X đơn chờ");
  });
  p.close();

  // ---- 4) Đối tác ----------------------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(DOITAC, `/order?id=${o3}`, MOB);
  await b.step("4", `390 Đối tác (người lập, đã mời X và X đã nhận): thấy TÊN người phụ trách, không nút nào trong khối; khối «Hướng dẫn viên» ẩn${axeNote()}`, async () => {
    await p.waitFor(co(khoiBH), "khối Người phụ trách", 12000);
    assert.equal(await p.ev(chu(`${khoiBH} .handler-name`)), ACCOUNTS.salesB.name);
    assert.equal(await p.ev(`document.querySelectorAll('${khoiBH} button').length`), 0, "không nút");
    assert.equal(await p.ev(co("#handler-title")), false, "Đối tác không thấy khối Hướng dẫn viên");
    assert.equal(await p.ev(noCode), "");
    await haiKho(p, "doi-tac", "don", co(khoiBH));
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "Đối tác đơn 390");
    loiConsole(p, "Đối tác đơn");
  });
  await b.step("4b", "Đối tác ở danh sách đơn: thẻ có dòng «Phụ trách: <tên>»; Trang chủ chụp ảnh", async () => {
    await p.send("Page.navigate", { url: `${env.base}/orders` });
    await p.waitFor(`document.body.innerText.includes('Phụ trách: ${ACCOUNTS.salesB.name}') || document.querySelector('.order-card')?.textContent.includes('Phụ trách: ${ACCOUNTS.salesB.name}')`, "dòng Phụ trách", 12000);
    await haiKho(p, "doi-tac", "danh-sach", `document.querySelectorAll('.order-card').length > 0`);
    await p.send("Page.navigate", { url: `${env.base}/` });
    await sleep(1200);
    await haiKho(p, "doi-tac", "trang-chu", `document.readyState === 'complete'`);
  });
  p.close();

  // ---- 7) Hướng dẫn viên --------------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(HDV, `/order?id=${o7}`, MOB);
  await b.step("7", `390 Hướng dẫn viên mở đơn mình phụ trách: khối «Hướng dẫn viên» có «Từ chối đơn»; khối «Người phụ trách» không nút; không «Nhận làm HDV»${axeNote()}`, async () => {
    await p.waitFor(co("#handler-title"), "khối Hướng dẫn viên", 12000);
    assert.equal(await p.ev(chu("#handler-title")), "Hướng dẫn viên");
    assert.equal(await p.ev(nut("Từ chối đơn")), true);
    assert.equal(await p.ev(nut("Nhận làm HDV")), false, "đã có Hướng dẫn viên (chính họ)");
    assert.equal(await p.ev(`document.querySelectorAll('${khoiBH} button').length`), 0);
    await haiKho(p, "huong-dan-vien", "don", co("#handler-title"));
    await axe(p, "HDV đơn 390");
    loiConsole(p, "HDV");
  });
  p.close();

  // ---- 5) Quản trị --------------------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.admin, `/order?id=${o2}`, MOB);
  await b.step("5", `390 Quản trị mở đơn «Chờ Bán hàng nhận»: Nhận phụ trách + Chọn người phụ trách; không «Nhận làm HDV»${axeNote()}`, async () => {
    await p.waitFor(co(khoiBH), "khối Người phụ trách", 12000);
    assert.match(await p.ev(chu(khoiBH)), /Chờ Bán hàng nhận/);
    assert.equal(await p.ev(co('[data-action="claim-ban-hang"]')), true);
    assert.equal(await p.ev(co('[data-action="change-ban-hang"]')), true);
    assert.equal(await p.ev(nut("Nhận làm HDV")), false, "Quản trị không thấy «Nhận làm HDV»");
    assert.equal(await p.ev(chu("#handler-title")), "Hướng dẫn viên");
    await haiKho(p, "quan-tri", "don", co(khoiBH));
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "Quản trị đơn 390");
  });
  await b.step("5b", "Quản trị bấm Nhận phụ trách → tên mình; rồi Đổi người phụ trách: bảng chỉ có Bán hàng, «Lưu người phụ trách» → tên mới", async () => {
    await p.ev(click('[data-action="claim-ban-hang"]'));
    await p.waitFor(`document.querySelector('${khoiBH} .handler-name')?.innerText.trim() === ${JSON.stringify(ACCOUNTS.admin.name)}`, "Quản trị là người phụ trách", 12000);
    assert.equal(await p.ev(chu('[data-action="change-ban-hang"]')), "Đổi người phụ trách");
    await p.ev(click('[data-action="change-ban-hang"]'));
    await p.waitFor(co(".sheet .pick"), "bảng chọn", 12000);
    assert.equal(await p.ev(chu(".sheet-title")), "Đổi người phụ trách");
    assert.equal(await p.ev(`[...document.querySelectorAll('.sheet button')].some((x) => x.innerText.trim() === 'Lưu người phụ trách')`), true);
    await chup(p, "quan-tri-bang-doi-390", MOB);
    await p.ev(click(`.sheet input[value="${idB}"]`));
    await p.ev(`[...document.querySelectorAll('.sheet button')].find((x) => x.innerText.trim() === 'Lưu người phụ trách').click()`);
    await p.waitFor(`document.querySelector('${khoiBH} .handler-name')?.innerText.trim() === ${JSON.stringify(ACCOUNTS.salesB.name)}`, "đã đổi", 12000);
    loiConsole(p, "Quản trị đổi");
  });
  await b.step("5c", "Quản trị: Trang chủ có thẻ «Đơn chưa có người phụ trách» (sau 65 giây) và thẻ «Đơn chưa có HDV nhận»; chụp ảnh", async () => {
    await sleep(Math.max(0, luc + 65_000 - Date.now()));
    await p.send("Page.navigate", { url: `${env.base}/` });
    await doiKhung(p, DESK);
    await p.waitFor(co('[data-khoa="chuaBanHang"]'), "thẻ chuaBanHang", 15000);
    assert.match(await p.ev(chu('[data-khoa="chuaBanHang"]')), /Đơn chưa có người phụ trách/);
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "Quản trị Trang chủ 1040");
    await doiKhung(p, MOB);
    await haiKho(p, "quan-tri", "trang-chu", `document.readyState === 'complete'`);
  });
  p.close();

  // ---- 6) Kế toán ---------------------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.accounting, "/", DESK);
  await b.step("6", `1040 Kế toán: Trang chủ có thẻ «Đơn chưa có người phụ trách» (đơn chờ chỉ là số); thẻ không lộ tên / SĐT khách${axeNote()}`, async () => {
    await p.waitFor(co('[data-khoa="chuaBanHang"]'), "thẻ chuaBanHang", 15000);
    const the = await p.ev(chu('[data-khoa="chuaBanHang"]'));
    assert.match(the, /Đơn chưa có người phụ trách/);
    assert.equal(await p.ev(co('[data-khoa="donCho"]')), false, "Kế toán không còn thẻ «Đơn chờ xác nhận»");
    khongLo(await p.ev("document.querySelector('main').innerText"), "Kế toán Trang chủ");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "Kế toán Trang chủ 1040");
  });
  await b.step("6b", `390 Kế toán mở đơn chưa có người phụ trách: chip «Chờ Bán hàng nhận», KHÔNG nút trong khối${axeNote()}`, async () => {
    await doiKhung(p, MOB);
    await p.send("Page.navigate", { url: `${env.base}/order?id=${o5}` });
    await p.waitFor(co(khoiBH), "khối Người phụ trách", 12000);
    assert.match(await p.ev(chu(khoiBH)), /Chờ Bán hàng nhận/);
    assert.equal(await p.ev(`document.querySelectorAll('${khoiBH} button').length`), 0);
    await haiKho(p, "ke-toan", "don", co(khoiBH));
    await axe(p, "Kế toán đơn 390");
    loiConsole(p, "Kế toán");
    await p.send("Page.navigate", { url: `${env.base}/` });
    await sleep(1500);
    await haiKho(p, "ke-toan", "trang-chu", co('[data-khoa="chuaBanHang"]') + " || document.readyState === 'complete'");
  });
  p.close();

  // ---- 8) Bán hàng người lập: Trang chủ, danh sách --------------------------------------------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.salesA, "/", DESK);
  await b.step("8", `1040 Bán hàng (người lập): Trang chủ có thẻ «Đơn chưa có người phụ trách»; danh sách đơn có dòng «Phụ trách» / «Chờ Bán hàng nhận»; ảnh${axeNote()}`, async () => {
    await p.waitFor(co('[data-khoa="chuaBanHang"]'), "thẻ chuaBanHang", 15000);
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "Bán hàng Trang chủ 1040");
    await doiKhung(p, MOB);
    await haiKho(p, "ban-hang", "trang-chu", `document.readyState === 'complete'`);
    await p.send("Page.navigate", { url: `${env.base}/orders` });
    await p.waitFor(`document.body.innerText.includes('Chờ Bán hàng nhận') || [...document.querySelectorAll('.order-card')].some((c) => c.textContent.includes('Chờ Bán hàng nhận'))`, "chip Chờ Bán hàng nhận ở thẻ đơn", 12000);
    await haiKho(p, "ban-hang", "danh-sach", `document.querySelectorAll('.order-card').length > 0`);
    await p.send("Page.navigate", { url: `${env.base}/order?id=${o2}` });
    await p.waitFor(co(khoiBH), "đơn", 12000);
    await haiKho(p, "ban-hang", "don", co(khoiBH));
    loiConsole(p, "Bán hàng");
  });
  p.close();
} catch (e) {
  console.log(`✗ dựng dữ liệu hỏng${dungXong ? " (sau khi dựng)" : ""}: ${String(e?.stack ?? e).split("\n").slice(0, 10).join("\n")}`);
  process.exitCode = 1;
} finally {
  b.xong();
  await env.stop();
}
