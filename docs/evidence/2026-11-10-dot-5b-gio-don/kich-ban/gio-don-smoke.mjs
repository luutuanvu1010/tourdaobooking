// Đợt 5B — ADR-0193 (công tắc «Bắt buộc giờ đón cho đơn đối tác» + câu (ii)) trên Chrome thật, D1 tạm, ảnh 390 + 1280. Dữ liệu đi đường thật (route API); tên, SĐT GIẢ.
//   1) Toàn quyền mở trang Tôi: khối «Bắt buộc giờ đón cho đơn đối tác» «Đang bật» → bấm «Tắt bắt buộc giờ đón» → «Đang tắt», nút đổi thành «Bật bắt buộc giờ đón» (390 + 1280).
//   2) Đối tác mở nháp có Đón chưa giờ (cách 3 ngày) → bấm «Gửi đơn» → dải «Chờ xác nhận» (vẫn qua văn phòng), không lý do «chưa có giờ đón».
//   3) Quản trị mở đơn chờ → bảng «Xác nhận đơn» → bấm «Còn vé, xác nhận đơn» KHÔNG chọn giờ → hộp hỏi lại → đơn đã xác nhận (không bị đòi giờ).
//   4) Trang đơn đã xác nhận hiện nhắc «Chưa chốt giờ» ở lượt đưa đón (390 + 1280).
//   5) Bán hàng mở nháp có Đón chưa giờ đón HÔM NAY → bấm «Xác nhận đơn» → câu (ii) «Lượt đón ngày … chưa có giờ mà đã sát giờ đón …», đơn vẫn nháp (390 + 1280).
// Trình duyệt dùng chung kho cookie: mỗi bước mở trang bằng tài khoản của bước đó (env.as đặt cookie riêng trước khi mở).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-10-dot-5b-gio-don node docs/evidence/2026-11-10-dot-5b-gio-don/kich-ban/gio-don-smoke.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, CHU, MOB, OUT, assert, axe, axeNote, boDem, click, dungMoiTruong, fetchTrang, noCode, noOverflowX, sleep, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
import { HOP_HOI_TU_DONG } from "../../2026-11-13-buoc-1-khung-chung/kich-ban/hop-hoi-tu-dong.mjs"; // bước 1 khung chung 13/11: trả lời hộp hỏi trong trang (thay confirm() của trình duyệt)

const RONG = { width: 1280, height: 860, mobile: false };
const DOITAC = { name: "Đối Tác Giờ Đón 5B", phone: "0900000651", pin: "246651", permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" };
const { env, call } = await dungMoiTruong([CHU, DOITAC]);
const b = boDem("DOT 5B (cong tac gio don)");
mkdirSync(join(OUT, "anh"), { recursive: true });
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const lapDon = async (who, ngay, viec) => {
  const r = await call(who, "POST", "/api/orders", {
    customerName: "Khách Thử Giờ Đón", customerPhone: "0903 651 001", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "catalog", catalogCode: "TTB06", pickupChoice: "DON", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800000 }, departDate: ngay,
      legs: [{ direction: "OUT", pickupDate: ngay, pickupTime: null, pickupLocationId: null, pickupPlace: "Khách sạn Thử Giờ Đón", dropoffLocationId: LOC, dropoffPlace: "" }] }],
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
const nutChu = (nhan) => `(() => { const el = [...document.querySelectorAll('main button')].find((x) => x.getClientRects().length > 0 && x.innerText.trim() === ${JSON.stringify(nhan)}); if (!el) return false; el.click(); return true; })()`;
const coNut = (nhan) => `[...document.querySelectorAll('main button')].some((x) => x.getClientRects().length > 0 && x.innerText.trim() === ${JSON.stringify(nhan)})`;
const loiConsole = (p, ten) => assert.deepEqual(p.consoleErrors.filter((e) => !/409|Conflict/.test(e)), [], `${ten}: lỗi console ${JSON.stringify(p.consoleErrors)}`);

try {
  const ngayXa = vnDate(3);
  const homNay = vnDate(0);
  const dDT = await lapDon(DOITAC, ngayXa, "Đối tác, Đón chưa giờ cách 3 ngày");
  const dBH = await lapDon(ACCOUNTS.salesA, homNay, "Bán hàng, Đón chưa giờ hôm nay");

  // ---- 1) Toàn quyền tắt công tắc ở trang Tôi ---------------------------------------------------------------------------------------------------------------------
  let p = await env.as(CHU, "/account", MOB);
  await b.step("1", `390 + 1280 Toàn quyền: khối «Bắt buộc giờ đón cho đơn đối tác» Đang bật → bấm «Tắt bắt buộc giờ đón» → Đang tắt${axeNote()}`, async () => {
    await p.waitFor(`!!document.querySelector('#gio-don-doi')`, "nút công tắc giờ đón", 12000);
    assert.equal(await p.ev(chu("#gio-don-heading")), "Bắt buộc giờ đón cho đơn đối tác");
    assert.equal(await p.ev(chu("#gio-don-trang-thai")), "Đang bật.");
    assert.equal(await p.ev(chu("#gio-don-doi")), "Tắt bắt buộc giờ đón");
    await p.ev(`document.querySelector('#gio-don-cai-dat').scrollIntoView()`);
    await chup(p, "1a-toan-quyen-dang-bat-390", MOB);
    await p.ev(click("#gio-don-doi"));
    await p.waitFor(`(document.querySelector('#gio-don-trang-thai')?.innerText ?? '') === 'Đang tắt.'`, "đã tắt", 8000);
    assert.equal(await p.ev(chu("#gio-don-doi")), "Bật bắt buộc giờ đón");
    const r = await fetchTrang(p, "GET", "/api/cai-dat/bat-buoc-gio-don");
    assert.equal(r.json.bat, false, r.text);
    await chup(p, "1b-toan-quyen-da-tat-390", MOB);
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "trang Tôi Toàn quyền 390");
    await doiKhung(p, RONG);
    await p.waitFor(`(document.querySelector('#gio-don-trang-thai')?.innerText ?? '') === 'Đang tắt.'`, "1280 đang tắt", 12000);
    await chup(p, "1c-toan-quyen-da-tat-1280", RONG);
    await axe(p, "trang Tôi Toàn quyền 1280");
    loiConsole(p, "Toàn quyền");
  });
  p.close();

  // ---- 2) Đối tác gửi đơn có đón chưa giờ -------------------------------------------------------------------------------------------------------------------------
  p = await env.as(DOITAC, `/order?id=${dDT}`, MOB);
  await b.step("2", `390 Đối tác: nháp Đón chưa giờ → «Gửi đơn» → dải «Chờ xác nhận», không nêu lý do chưa có giờ đón${axeNote()}`, async () => {
    await p.waitFor(`!!document.querySelector('[data-action="gui-don"]')`, "nút Gửi đơn", 12000);
    await p.ev(click('[data-action="gui-don"]'));
    await p.waitFor(`!!document.querySelector('[data-khoi="cho-xac-nhan"]')`, "dải Chờ xác nhận", 12000);
    const dai = await p.ev(chu('[data-khoi="cho-xac-nhan"]'));
    assert.match(dai, /^Chờ xác nhận/);
    assert.ok(!/chưa có giờ đón/.test(dai), `Tắt: không nêu lý do chưa có giờ (${dai})`);
    await chup(p, "2-doi-tac-da-gui-390", MOB);
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "Đối tác đã gửi 390");
  });
  p.close();

  // ---- 3) Văn phòng bấm Còn vé không điền giờ -----------------------------------------------------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.admin, `/order?id=${dDT}`, MOB);
  await b.step("3", `390 Quản trị: bảng «Xác nhận đơn» → «Còn vé, xác nhận đơn» không chọn giờ → đã xác nhận${axeNote()}`, async () => {
    await p.waitFor(`!!document.querySelector('[data-action="quyet-dinh-con-ve"]')`, "bảng quyết định", 12000);
    await chup(p, "3a-quan-tri-bang-xac-nhan-390", MOB);
    await axe(p, "bảng Xác nhận đơn 390");
    await p.ev(click('[data-action="quyet-dinh-con-ve"]'));
    await p.waitFor(`!!document.querySelector('.sheet-foot-xac-nhan .btn-danger')`, "hộp hỏi lại trước Còn vé", 8000);
    await p.ev(click(".sheet-foot-xac-nhan .btn-danger"));
    await p.waitFor(`!document.querySelector('[data-action="quyet-dinh-con-ve"]')`, "bảng quyết định biến mất", 12000);
    const r = await fetchTrang(p, "GET", `/api/orders/${dDT}`);
    assert.equal(r.json.order.status, "confirmed", r.text.slice(0, 300));
    assert.equal(r.json.order.services[0].legs[0].pickupTime, null, "giờ chưa chốt");
  });

  // ---- 4) Trang đơn hiện nhắc «Chưa chốt giờ» -----------------------------------------------------------------------------------------------------------------------
  await b.step("4", `390 + 1280 trang đơn đã xác nhận: lượt đưa đón hiện «Chưa chốt giờ»${axeNote()}`, async () => {
    await p.send("Page.reload", {});
    await p.waitFor(`document.querySelector('main')?.innerText.includes('Chưa chốt giờ')`, "nhắc Chưa chốt giờ", 12000);
    await chup(p, "4a-don-chua-chot-gio-390", MOB);
    assert.equal(await p.ev(noOverflowX), true);
    await doiKhung(p, RONG);
    await p.waitFor(`document.querySelector('main')?.innerText.includes('Chưa chốt giờ')`, "1280 nhắc Chưa chốt giờ", 12000);
    await chup(p, "4b-don-chua-chot-gio-1280", RONG);
    await axe(p, "trang đơn đã xác nhận 1280");
    loiConsole(p, "Quản trị");
  });
  p.close();

  // ---- 5) Đơn đón hôm nay chưa giờ bị chặn với câu (ii) -----------------------------------------------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.salesA, `/order?id=${dBH}`, MOB);
  await b.step("5", `390 + 1280 Bán hàng: nháp Đón chưa giờ hôm nay → «Xác nhận đơn» → câu (ii), đơn vẫn nháp${axeNote()}`, async () => {
    await p.waitFor(coNut("Xác nhận đơn"), "nút Xác nhận đơn", 12000);
    await p.ev(HOP_HOI_TU_DONG); // bước 1 khung chung 13/11: hộp hỏi trong trang thay confirm()
    await p.ev("window.confirm = () => true");
    assert.equal(await p.ev(nutChu("Xác nhận đơn")), true);
    await p.waitFor(`document.querySelector('main')?.innerText.includes('chưa có giờ mà đã sát giờ đón')`, "câu (ii)", 12000);
    const txt = await p.ev("document.querySelector('main').innerText");
    assert.ok(txt.includes(`Lượt đón ngày ${homNay.slice(8, 10)}/${homNay.slice(5, 7)}/${homNay.slice(0, 4)} chưa có giờ mà đã sát giờ đón — điền giờ đón trước khi xác nhận.`), "câu (ii) đúng chữ, ngày dd/mm/yyyy");
    await chup(p, "5a-ban-hang-chan-cau-ii-390", MOB);
    const r = await fetchTrang(p, "GET", `/api/orders/${dBH}`);
    assert.equal(r.json.order.status, "draft");
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "câu (ii) 390");
    await doiKhung(p, RONG);
    await p.waitFor(coNut("Xác nhận đơn"), "1280 nút Xác nhận đơn", 12000);
    await p.ev(HOP_HOI_TU_DONG); // bước 1 khung chung 13/11: hộp hỏi trong trang thay confirm()
    await p.ev("window.confirm = () => true");
    await p.ev(nutChu("Xác nhận đơn"));
    await p.waitFor(`document.querySelector('main')?.innerText.includes('chưa có giờ mà đã sát giờ đón')`, "1280 câu (ii)", 12000);
    await chup(p, "5b-ban-hang-chan-cau-ii-1280", RONG);
    await axe(p, "câu (ii) 1280");
  });
  p.close();
} catch (e) {
  console.log(`✗ dựng dữ liệu hỏng: ${String(e?.stack ?? e).split("\n").slice(0, 10).join("\n")}`);
  process.exitCode = 1;
} finally {
  b.xong();
  await env.stop();
}
