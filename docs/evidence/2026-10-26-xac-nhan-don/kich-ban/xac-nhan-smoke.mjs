// Bước xác nhận đơn + «Gửi đơn» của Đối tác (ADR-0136, Task 3.5, lần giao L6) trên Chrome thật, D1 tạm, 390 + 1040. Dữ liệu đi đường thật (route API); tên, SĐT GIẢ.
//   1) Đối tác (PARTNER thuần) lập nháp CÓ dịch vụ cờ «cần xác nhận» → trang đơn nháp có «Gửi đơn», KHÔNG có «Gửi xác nhận» / «Xác nhận đơn» → bấm → câu A nguyên văn, dải «Chờ xác nhận», nút «Rút lại».
//   2) Kế toán (người xét duyệt): Trang chủ có thẻ «Đơn chờ xác nhận»; trang /cho-xac-nhan có thẻ đơn (không tên khách / SĐT); mở đơn → bảng «Xác nhận đơn» có Còn vé / Hết vé / Huỷ; không ảnh, không biên nhận.
//   3) Kế toán bấm «Còn vé» → đơn đã xác nhận; Đối tác mở lại thấy đã xác nhận, ảnh «XÁC NHẬN ĐƠN DỊCH VỤ» mở được (Đ11).
//   4) Đối tác lập đơn thường → «Gửi đơn» → nhánh B: câu B nguyên văn rồi hộp ảnh tự mở (Đ13.7).
//   5) Bán hàng (KHÔNG giữ Đối tác): đơn có dịch vụ cờ → nút «Gửi xác nhận» (không «Xác nhận đơn»), đơn thường vẫn «Xác nhận đơn»; «Gửi xác nhận» → dải chờ + «Rút lại».
//   6) HDV (FIELD, người xét duyệt nhưng không lập): thấy thẻ Trang chủ và trang /cho-xac-nhan; trang đơn chờ có bảng quyết định, không nút lập đơn.
//   7) Điều phối: ô đếm đổi chữ thành «CHỜ XÁC NHẬN».
// Trình duyệt dùng chung kho cookie: dựng dữ liệu bằng API XONG mới mở trang; tài khoản mở SAU CÙNG là tài khoản trang cần.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-26-xac-nhan-don node docs/evidence/2026-10-26-xac-nhan-don/kich-ban/xac-nhan-smoke.mjs
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, CHU, DESK, MOB, OUT, assert, axe, axeNote, boDem, click, dungMoiTruong, fetchTrang, noCode, noOverflowX, sleep, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
import { CAU_BAO_GUI_DON } from "../../../../src/shared/gui-don-cau-bao.ts";

const DOITAC = { name: "Đối Tác Gửi Đơn 261", phone: "0900000611", pin: "246611", permissions: ["PARTNER"] };
const HDV = { name: "Hướng Dẫn Kiểm Vé 261", phone: "0900000612", pin: "246612", permissions: ["FIELD"] };
const { env, call } = await dungMoiTruong([CHU, DOITAC, HDV]);
const b = boDem("XAC NHAN DON (Gui don)");
const ngay = vnDate(3);
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const KHACH = { ten: "Khách Thử Xác Nhận", sdt: "0903 261 001" };
const lap = async (who, ma, viec) => {
  const r = await call(who, "POST", "/api/orders", {
    customerName: KHACH.ten, customerPhone: KHACH.sdt, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "catalog", catalogCode: ma, pickupChoice: "KHONG_DON", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: ma === "TD101" ? 1350000 : 800000 }, departDate: ngay, legs: [] }],
    passengers: [],
  });
  dung(r, 201, `lập đơn ${viec}`);
  return r.json.order.id;
};
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
const chu = (sel) => `((el) => el ? el.innerText.replace(/\\s+/g, ' ').trim() : null)(document.querySelector(${JSON.stringify(sel)}))`;
const nut = (nhan) => `[...document.querySelectorAll('main button, main a.btn')].some((x) => x.getClientRects().length > 0 && x.innerText.trim() === ${JSON.stringify(nhan)})`;
const loiConsole = (p, ten) => assert.deepEqual(p.consoleErrors, [], `${ten}: lỗi console ${JSON.stringify(p.consoleErrors)}`);
const khongLo = (txt, ten) => { for (const x of [KHACH.ten, KHACH.sdt, KHACH.sdt.replace(/\s/g, "")]) assert.ok(!txt.includes(x), `${ten}: không được lộ «${x}»`); };

let dungXong = false;
try {
  // ---- Dữ liệu -------------------------------------------------------------------------------------------------------------------------------------------------
  dung(await call(CHU, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: "TD101", canXacNhan: true }), 200, "đặt cờ cần xác nhận cho TD101");
  const dA = await lap(DOITAC, "TD101", "Đối tác dịch vụ cờ (nhánh A)");
  const dB = await lap(DOITAC, "TTB06", "Đối tác dịch vụ thường (nhánh B)");
  const dS = await lap(ACCOUNTS.salesA, "TD101", "Bán hàng dịch vụ cờ");
  const dT = await lap(ACCOUNTS.salesA, "TTB06", "Bán hàng dịch vụ thường");
  dungXong = true;

  // ---- 1) Đối tác ---------------------------------------------------------------------------------------------------------------------------------------------
  let p = await env.as(DOITAC, `/order?id=${dA}`, MOB);
  await b.step("1", `390 Đối tác, nháp có dịch vụ cờ: «Gửi đơn» (không «Gửi xác nhận» / «Xác nhận đơn») → câu A nguyên văn, dải «Chờ xác nhận», «Rút lại»${axeNote()}`, async () => {
    await p.waitFor(nut("Gửi đơn"), "nút Gửi đơn");
    await chup(p, "1-doi-tac-nhap-390", MOB);
    assert.equal(await p.ev(nut("Gửi xác nhận")), false, "Đối tác không thấy «Gửi xác nhận»");
    assert.equal(await p.ev(nut("Xác nhận đơn")), false, "Đối tác không thấy «Xác nhận đơn»");
    assert.equal(await p.ev(noCode), "");
    await axe(p, "Đối tác nháp 390");
    await p.ev(click('[data-action="gui-don"]'));
    await p.waitFor(`!!document.querySelector('[data-khoi="cho-xac-nhan"]')`, "dải Chờ xác nhận");
    const txt = await p.ev("document.querySelector('main').innerText");
    assert.ok(txt.includes(CAU_BAO_GUI_DON.A), `câu A nguyên văn: ${txt.slice(0, 400)}`);
    assert.match(await p.ev(chu('[data-khoi="cho-xac-nhan"]')), /^Chờ xác nhận/);
    assert.equal(await p.ev(nut("Rút lại")), true, "có «Rút lại»");
    assert.equal(await p.ev(nut("Gửi đơn")), false, "đang chờ: hết «Gửi đơn»");
    await chup(p, "1b-doi-tac-cho-390", MOB);
    assert.equal(await p.ev(noOverflowX), true, "390 không tràn ngang");
    await axe(p, "Đối tác chờ 390");
  });
  await b.step("1c", "1040 Đối tác, đơn đang chờ: dải chờ + «Rút lại», không tràn ngang", async () => {
    await doiKhung(p, DESK);
    await p.waitFor(`!!document.querySelector('[data-khoi="cho-xac-nhan"]')`, "dải chờ 1040");
    await chup(p, "1c-doi-tac-cho-1040", DESK);
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "Đối tác chờ 1040");
    loiConsole(p, "Đối tác nhánh A");
  });
  p.close();

  // ---- 4) Đối tác nhánh B (chạy trước khi Kế toán mở trang để kho cookie không lẫn) -------------------------------------------------------------------------
  p = await env.as(DOITAC, `/order?id=${dB}`, MOB);
  await b.step("4", `390 Đối tác, dịch vụ thường: «Gửi đơn» → câu B nguyên văn, rồi hộp ảnh «XÁC NHẬN ĐƠN DỊCH VỤ» tự mở${axeNote()}`, async () => {
    await p.waitFor(nut("Gửi đơn"), "nút Gửi đơn");
    await p.ev(click('[data-action="gui-don"]'));
    await p.waitFor(`document.querySelector('main').innerText.includes(${JSON.stringify(CAU_BAO_GUI_DON.B)})`, "câu B");
    await p.waitFor(`document.body.innerText.includes('XÁC NHẬN ĐƠN DỊCH VỤ') || !!document.querySelector('dialog[open], .modal, .vc-modal, [role="dialog"]')`, "hộp ảnh mở", 12000);
    await chup(p, "4-doi-tac-nhanh-b-390", MOB);
    assert.equal(await p.ev(`!document.querySelector('[data-khoi="cho-xac-nhan"]')`), true, "nhánh B: không còn dải chờ");
    loiConsole(p, "Đối tác nhánh B");
  });
  p.close();

  // ---- 5) Bán hàng --------------------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.salesA, `/order?id=${dS}`, MOB);
  await b.step("5", `390 Bán hàng: đơn có dịch vụ cờ → «Gửi xác nhận» (không «Xác nhận đơn») → dải chờ + «Rút lại»; đơn thường vẫn «Xác nhận đơn"${axeNote()}`, async () => {
    await p.waitFor(nut("Gửi xác nhận"), "nút Gửi xác nhận");
    assert.equal(await p.ev(nut("Xác nhận đơn")), false, "đơn có dịch vụ cờ: không «Xác nhận đơn»");
    assert.equal(await p.ev(nut("Gửi đơn")), false, "Bán hàng thuần không thấy «Gửi đơn»");
    await chup(p, "5-ban-hang-gui-xac-nhan-390", MOB);
    await axe(p, "Bán hàng nháp 390");
    await p.ev(click('[data-action="gui-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('[data-khoi="cho-xac-nhan"]')`, "dải chờ");
    assert.equal(await p.ev(nut("Rút lại")), true);
    await chup(p, "5b-ban-hang-cho-390", MOB);
    await p.send("Page.navigate", { url: `${env.base}/order?id=${dT}` });
    await p.waitFor(`location.search.includes('${dT}') && ${nut("Xác nhận đơn")}`, "đơn thường có «Xác nhận đơn»");
    assert.equal(await p.ev(nut("Gửi xác nhận")), false, "đơn thường: không «Gửi xác nhận»");
    loiConsole(p, "Bán hàng");
  });
  p.close();

  // ---- 2) Kế toán ---------------------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.accounting, "/", DESK);
  await b.step("2", `1040 Kế toán: Trang chủ có thẻ «Đơn chờ xác nhận»; trang /cho-xac-nhan có thẻ đơn, không lộ tên / SĐT khách${axeNote()}`, async () => {
    await p.waitFor(`!!document.querySelector('[data-khoa="donCho"]')`, "thẻ Trang chủ donCho", 12000);
    await chup(p, "2-ke-toan-trang-chu-1040", DESK);
    assert.match(await p.ev(chu('[data-khoa="donCho"]')), /Đơn chờ xác nhận/);
    await p.send("Page.navigate", { url: `${env.base}/cho-xac-nhan` });
    await p.waitFor(`document.querySelectorAll('.cx-the').length >= 2`, "hai thẻ đơn chờ", 12000);
    await chup(p, "2b-ke-toan-danh-sach-1040", DESK);
    khongLo(await p.ev("document.querySelector('main').innerText"), "danh sách chờ");
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "danh sách chờ 1040");
  });
  await b.step("2c", `390 Kế toán mở đơn chờ: bảng «Xác nhận đơn» có Còn vé / Hết vé / Huỷ; không tên khách, không biên nhận${axeNote()}`, async () => {
    await doiKhung(p, MOB);
    await p.send("Page.navigate", { url: `${env.base}/order?id=${dA}` });
    await p.waitFor(`!!document.querySelector('[data-action="quyet-dinh-con-ve"]')`, "bảng quyết định", 12000);
    await chup(p, "2c-ke-toan-bang-390", MOB);
    for (const a of ["quyet-dinh-con-ve", "quyet-dinh-het-ve", "quyet-dinh-huy"]) assert.equal(await p.ev(`!!document.querySelector('[data-action="${a}"]')`), true, a);
    khongLo(await p.ev("document.querySelector('main').innerText"), "trang đơn chờ của người xét duyệt");
    assert.equal(await p.ev(nut("Xem biên nhận")), false, "người xét duyệt không thấy biên nhận");
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "Kế toán bảng 390");
    loiConsole(p, "Kế toán");
  });
  await b.step("3", "Kế toán bấm «Còn vé» → đơn đã xác nhận", async () => {
    await p.ev(click('[data-action="quyet-dinh-con-ve"]'));
    await p.waitFor(`!document.querySelector('[data-action="quyet-dinh-con-ve"]')`, "bảng quyết định biến mất", 12000);
    const r = await fetchTrang(p, "GET", `/api/orders/${dA}`);
    assert.equal(r.json.order.status, "confirmed", r.text.slice(0, 300));
  });
  p.close();

  // ---- 6) HDV -------------------------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(HDV, "/cho-xac-nhan", MOB);
  await b.step("6", `390 HDV (FIELD): trang /cho-xac-nhan mở được, thấy đơn chờ của Bán hàng và nút Kiểm vé; không lộ tên / SĐT khách${axeNote()}`, async () => {
    await p.waitFor(`document.querySelectorAll('.cx-the').length >= 1`, "thẻ đơn chờ cho HDV", 12000);
    await chup(p, "6-hdv-danh-sach-390", MOB);
    khongLo(await p.ev("document.querySelector('main').innerText"), "HDV");
    assert.equal(await p.ev(`!!document.querySelector('[data-action="kiem-ve"]')`), true);
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "HDV danh sách 390");
    await doiKhung(p, DESK);
    await p.waitFor(`document.querySelectorAll('.cx-the').length >= 1`, "1040");
    await chup(p, "6b-hdv-danh-sach-1040", DESK);
    loiConsole(p, "HDV");
  });
  p.close();

  // ---- 3b) Đối tác thấy đã xác nhận + ảnh --------------------------------------------------------------------------------------------------------------------
  p = await env.as(DOITAC, `/order?id=${dA}`, MOB);
  await b.step("3b", `390 Đối tác mở lại đơn: đã xác nhận, không còn dải chờ / Rút lại, có «Xem biên nhận»${axeNote()}`, async () => {
    await p.waitFor(`!document.querySelector('[data-khoi="cho-xac-nhan"]') && ${nut("Xem biên nhận")}`, "đã xác nhận", 12000);
    await chup(p, "3b-doi-tac-da-xac-nhan-390", MOB);
    assert.equal(await p.ev(nut("Rút lại")), false);
    await axe(p, "Đối tác đã xác nhận 390");
    loiConsole(p, "Đối tác đã xác nhận");
  });
  p.close();

  // ---- 7) Điều phối -------------------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.admin, "/dieu-phoi", DESK);
  await b.step("7", "1040 Quản trị, Điều phối: ô đếm đơn nháp đổi chữ thành «CHỜ XÁC NHẬN»", async () => {
    await p.waitFor(`document.body.innerText.includes('CHỜ XÁC NHẬN')`, "ô CHỜ XÁC NHẬN", 12000);
    assert.equal(await p.ev(`document.body.innerText.includes('ĐƠN NHÁP')`), false);
    await chup(p, "7-dieu-phoi-1040", DESK);
    loiConsole(p, "Điều phối");
  });
  p.close();
} catch (e) {
  console.log(`✗ dựng dữ liệu hỏng${dungXong ? " (sau khi dựng)" : ""}: ${String(e?.stack ?? e).split("\n").slice(0, 10).join("\n")}`);
  process.exitCode = 1;
} finally {
  b.xong();
  await env.stop();
}
