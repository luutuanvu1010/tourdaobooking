// Kịch bản Chrome THẬT cho phí đưa đón DO MÁY TÍNH từ giá gốc Sheet (ADR-0218 Đợt 2, Task 9; thay phi-don-chon-smoke.mjs của ADR-0214 — hồ sơ cũ giữ nguyên). Bấm đến cùng, không chỉ mở trang.
//   1) Bán hàng mở biểu mẫu nháp hai lượt: mỗi lượt hiện «Phí đưa đón: 70.000 đ × 2 khách (giá gốc)» + nút «Đổi phí»; mở ô: số 5.000.001 ⇒ câu trần, lý do trống ⇒ «Nhập lý do đổi phí.», 80.000 + lý do ⇒ hết lỗi; Lưu gửi `doiPhi` (số đổi / null), KHÔNG khoá `phiDon`.
//   2) Trang đơn nháp: «Phí đưa đón (dự kiến)» 2 × 80.000 và 2 × 70.000. 1280 + 375.
//   3) Mở lại ở 375: lượt đã đổi hiện «Bỏ đổi phí» + số và lý do đã lưu.
//   4) Xác nhận đơn ⇒ «Phí đưa đón» (đã chụp).
//   4b) Đối tác: chỉ số máy tính + câu nhắc, không nút «Đổi phí»; Lưu không gửi doiPhi / phiDon.
//   5) Bán hàng khác (người xét) mở đơn Đối tác chờ (ô giá gốc trống): bảng Còn vé có khối phí «chưa tính được»; Còn vé khi chưa đổi ⇒ câu báo tại chỗ; «Đổi phí» + lý do ⇒ xác nhận.
// Dùng khung dp-lib.mjs (D1 tạm + wrangler dev + Chrome headless; Turnstile TẮT; không đụng dữ liệu thật; không cần mạng ngoài).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=<…/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> OUT=docs/evidence/2026-11-phi-don node docs/evidence/2026-11-phi-don/kich-ban/phi-don-chon-smoke.mjs
// `AXE_JS` thiếu thì BỎ QUA kiểm màu và tên bước ghi «(chưa chạy axe: thiếu AXE_JS)». Ảnh `phi-don-chon-*.png` ra thư mục `OUT` (mặc định docs/evidence/2026-11-phi-don).
// Ảnh «mở danh sách»: ô chọn của máy không chụp được khi đang mở trong Chrome không đầu, nên kịch bản tạm đặt `size` cho ô để vẽ danh sách ra trang rồi trả lại (chỉ để chụp).
// Luật một máy (ADR-0075): đăng nhập lại đá phiên cũ — mọi lệnh API làm TRƯỚC khi mở trang; trang Bán hàng A mở trước, trang Bán hàng B (người xét) mở sau cùng.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, assert, axe, axeNote, boDem, click, dungMoiTruong, noCode, noOverflowX, sleep, typeInto, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
import { CAU_VAN_PHONG_DOI_PHI_DON } from "../../../../src/shared/phi-don-gia-goc.ts";

const OUT = process.env.OUT ?? "docs/evidence/2026-11-phi-don";
mkdirSync(OUT, { recursive: true });
const DESK = { width: 1280, height: 900, mobile: false };
const MOB = { width: 375, height: 812, mobile: true };
const NGAY_DI = vnDate(3); // xa hơn mốc 6 giờ: xác nhận không cần đặt gấp
const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (migration 0010)
const TEN_DV = "Tour 4 đảo Nha Trang"; // TD101 của danh mục giả (a2-cdp.mjs)
const DOITAC = { name: "Đối Tác Phí Đón 214", phone: "0900000714", pin: "246714", permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" };

const { env, call } = await dungMoiTruong([DOITAC]);
const b = boDem("PHI DON CHON (ADR-0214)");
const dung = (r, ma, viec) => { assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`); return r.json; };
const so = (s) => Number(String(s).replace(/[^\d]/g, ""));
const loiThat = (p) => p.consoleErrors.filter((e) => !/Failed to load resource/.test(e));
const khoiPhi = (p) => p.ev("(() => { const k = document.querySelector('[data-khoi=phi-dua-don]'); return k ? { tieuDe: k.querySelector('.phi-don-tieu-de').textContent, dong: [...k.querySelectorAll('.kv-phi-don')].map((d) => [d.firstChild.firstChild.textContent, d.querySelector('.phi-don-chi-tiet')?.textContent ?? null, d.lastChild.textContent]), thieu: [...k.querySelectorAll('[data-canh-bao=phi-don-thieu]')].map((x) => x.textContent) } : null; })()");
/**
 * Ảnh đúng khung một phần tử: cuộn về ĐẦU trang rồi cắt theo toạ độ trang với `captureBeyondViewport` — thanh trên dính chỉ nằm ở đỉnh trang nên không đè lên phần tử (vòng sửa 1:
 * cuộn phần tử vào giữa làm thanh trên che dòng đầu của thẻ ở điện thoại).
 */
const anh = async (p, chon, tep) => {
  await sleep(350);
  const r = await p.ev(`(() => { const e = document.querySelector(${JSON.stringify(chon)}); scrollTo(0, 0); const b = e.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height }; })()`);
  await sleep(250);
  const k = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.w + 16, height: r.h + 16, scale: 1 } });
  writeFileSync(join(OUT, tep), Buffer.from(k.result.data, "base64"));
};
const doiKhung = async (p, khung) => {
  await p.send("Emulation.setDeviceMetricsOverride", { width: khung.width, height: khung.height, deviceScaleFactor: khung.mobile ? 2 : 1, mobile: khung.mobile });
  await p.send("Emulation.setTouchEmulationEnabled", { enabled: khung.mobile });
  await p.send("Page.reload", {});
  await sleep(300);
  await p.waitFor("document.readyState === 'complete'", "tải lại theo khổ mới");
};
const ten = (khung) => (khung.mobile ? "dien-thoai" : "may-tinh");
/** Khối «Phí đưa đón» của lượt thứ `i` (0 = chiều đi, 1 = chiều về) trong biểu mẫu (ADR-0218, Task 9). */
const khoiLuot = (i) => `document.querySelectorAll('.dd-phi')[${i}]`;
const nutDoi = (i) => `${khoiLuot(i)}.querySelector('[data-o-phi=nut-doi]')`;
const oGia = (i) => `${khoiLuot(i)}.querySelector('input[data-o-phi=don-gia]')`;
const oLyDo = (i) => `${khoiLuot(i)}.querySelector('input[data-o-phi=ly-do]')`;
const go = (bieuThuc, v) => `(() => { const e = ${bieuThuc}; e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`;
const loiLuot = (i) => `(() => { const g = ${oGia(i)}; const l = document.getElementById(g.getAttribute('aria-describedby')); return l && !l.hidden ? l.textContent : null; })()`;
const mayChu = (i) => `${khoiLuot(i)}.querySelector('[data-o-phi=may]').textContent`;
const moHetLuot = "(() => { for (const b of document.querySelectorAll('.dd-tom-tat')) if (b.getClientRects().length > 0) b.click(); return true; })()";
/** Thẻ dịch vụ của nháp nạp lại đang GẬP: mở thẻ (như người dùng chạm dòng gập) để thấy khối Đưa đón. */
const moThe = "(() => { const b = document.querySelector('[data-action=mo-the]'); const than = document.querySelector('.svc-than'); if (than && than.hidden && b) b.click(); return !document.querySelector('.svc-than').hidden; })()";
const anhLuot = (i) => `.dd-chang[data-chieu=${i === 0 ? "OUT" : "RETURN"}]`;

try {
  // ---- dữ liệu bằng API thật TRƯỚC khi mở trang ---------------------------------------------------------------------------------------------------------------
  const tuLuc = dung(await call(ACCOUNTS.admin, "GET", "/api/pricing/phi-don"), 200, "đọc ngày áp").batDauAp.tuLuc;
  dung(await call(ACCOUNTS.admin, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: vnDate(0), tuLucDaDoc: tuLuc }), 200, "bật phí từ hôm nay");
  const legs = [
    { direction: "OUT", pickupDate: "", pickupTime: "07:00", pickupLocationId: null, pickupPlace: "Khách sạn Thử Phí", dropoffLocationId: BEN, dropoffPlace: "" },
    { direction: "RETURN", pickupDate: NGAY_DI, pickupTime: "16:00", pickupLocationId: BEN, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Thử Phí" },
  ];
  const svc = (l) => [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 2 }, catalogPriceSeen: { adult: 1_350_000, child: 950_000, senior: 1_200_000, infant: 0 }, departDate: NGAY_DI, pickupChoice: "DON", legs: l }];
  // Đơn Đối tác chờ xác nhận lập TRƯỚC khi có giá gốc ⇒ lượt «chưa tính được» (O_TRONG) ⇒ nhánh A.
  const d2 = dung(await call(DOITAC, "POST", "/api/orders", { customerName: "Khách Đối Tác Phí", customerPhone: "0901 218 002", services: svc([{ ...legs[0], pickupTime: "" }]) }), 201, "Đối tác lập nháp một lượt").order;
  const gui = await call(DOITAC, "POST", `/api/orders/${d2.id}/gui-don`, {});
  assert.equal(gui.status, 201, `Đối tác Gửi đơn ⇒ nhánh «chờ xác nhận» vì ô giá gốc trống: ${gui.status} ${gui.text}`);
  const luc = new Date().toISOString();
  env.sql(`INSERT INTO ctl_service_transfer_price (id, catalog_code, per_pax_price, private_price, valid_from_at, created_at, updated_at) VALUES ('${crypto.randomUUID()}', 'TD101', 70000, 300000, '${luc}', '${luc}', '${luc}')`);
  const d1 = dung(await call(ACCOUNTS.salesA, "POST", "/api/orders", { customerName: "Khách Thử Phí", customerPhone: "0901 218 001", services: svc(legs) }), 201, "Bán hàng lập nháp hai lượt").order;
  assert.deepEqual(d1.phiDuaDon?.dong.map((d) => [d.nguon, d.unitPrice]), [["GIA_GOC", 70_000], ["GIA_GOC", 70_000]], "máy chủ: hai lượt tính từ giá gốc");
  const d3 = dung(await call(DOITAC, "POST", "/api/orders", { customerName: "Khách Đối Tác Nháp", customerPhone: "0901 218 003", services: svc([{ ...legs[0], pickupTime: "" }]) }), 201, "Đối tác lập nháp thứ hai (để mở biểu mẫu)").order;

  // ---- 1) Biểu mẫu 1280 --------------------------------------------------------------------------------------------------------------------------------------------
  let p = await env.as(ACCOUNTS.salesA, `/order-form?id=${d1.id}`, DESK);
  await b.step("1", `1280 biểu mẫu: số máy tính + «Đổi phí»; 5.000.001 ⇒ câu trần; lý do trống ⇒ câu thiếu lý do; 80.000 + lý do ⇒ Lưu gửi doiPhi (không khoá phiDon)${axeNote()}`, async () => {
    await p.waitFor("document.querySelectorAll('.dd-tom-tat, .dd-phi').length >= 2", "lượt đã nạp", 15000);
    assert.equal(await p.ev(moThe), true, "mở thẻ dịch vụ");
    await p.ev(moHetLuot);
    await p.waitFor("document.querySelectorAll('.dd-phi').length === 2 && [...document.querySelectorAll('.dd-phi')].every((k) => k.getClientRects().length > 0)", "hai khối phí hiện", 15000);
    for (const i of [0, 1]) assert.equal(await p.ev(mayChu(i)), "Phí đưa đón: 70.000 đ × 2 khách (giá gốc)", "số máy tính của lượt đã lưu");
    assert.equal(await p.ev(`${nutDoi(0)}.textContent`), "Đổi phí");
    assert.equal(await p.ev(`${khoiLuot(0)}.querySelector('.dd-phi-doi').hidden`), true, "chưa đổi: hai ô ẩn");
    assert.equal(await p.ev(`(() => { ${nutDoi(0)}.click(); return !${khoiLuot(0)}.querySelector('.dd-phi-doi').hidden; })()`), true, "bấm «Đổi phí» ⇒ hiện hai ô");
    assert.equal(await p.ev(`${nutDoi(0)}.textContent`), "Bỏ đổi phí");
    assert.equal(await p.ev(`(() => { const e = ${oGia(0)}; return [getComputedStyle(e).fontSize, e.inputMode]; })()`).then((x) => x.join()), "16px,numeric", "ô số tiền 16px, bàn phím số");
    await p.ev(go(oGia(0), "5.000.001"));
    assert.equal(await p.ev(loiLuot(0)), "Đơn giá phí đưa đón phải là số nguyên từ 0 đến 5.000.000 đ.", "câu trần của máy chủ");
    await anh(p, anhLuot(0), "phi-don-gia-goc-form-tran-may-tinh.png");
    await p.ev(go(oGia(0), "80.000"));
    assert.equal(await p.ev(loiLuot(0)), "Nhập lý do đổi phí.", "thiếu lý do");
    await p.ev(go(oLyDo(0), "Khách ở xa trung tâm"));
    assert.equal(await p.ev(loiLuot(0)), null, "đủ số và lý do ⇒ hết lỗi");
    await anh(p, anhLuot(0), "phi-don-gia-goc-form-doi-phi-may-tinh.png");
    await axe(p, "biểu mẫu 1280, hộp đổi phí");
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev("(() => { const b = document.getElementById('save'); if (b.disabled) return false; b.click(); return true; })()"), true, "bấm Lưu");
    await p.waitFor("location.pathname === '/order' && !!document.querySelector('[data-khoi=phi-dua-don]')", "lưu xong về trang đơn", 15000);
    const put = p.requests.find((r) => r.method === "PUT" && new URL(r.url).pathname === `/api/orders/${d1.id}`);
    assert.ok(put, "có lệnh lưu nháp");
    assert.deepEqual(JSON.parse(put.postData).services[0].legs.map((l) => l.doiPhi), [{ donGia: 80000, lyDo: "Khách ở xa trung tâm" }, null], "thân lưu: số đổi của lượt đi, null cho lượt về");
    assert.ok(!put.postData.includes('"phiDon"'), "thân lưu KHÔNG có khoá phiDon (khoá cũ ⇒ client_outdated)");
    assert.deepEqual(loiThat(p), [], `lỗi console: ${loiThat(p)}`);
  });

  // ---- 2) Trang đơn nháp: dòng dự kiến ---------------------------------------------------------------------------------------------------------------------------
  const mongDoi = [["Chiều đi", "2 khách × 80.000 ₫", "160.000 ₫"], ["Chiều về", "2 khách × 70.000 ₫", "140.000 ₫"]];
  for (const khung of [DESK, MOB]) {
    await b.step(`2-${khung.width}`, `${khung.width} trang đơn nháp: «Phí đưa đón (dự kiến)» 2 × 80.000 và 2 × 70.000, tạm tính gồm phí${axeNote()}`, async () => {
      if (khung === MOB) await doiKhung(p, MOB);
      await p.waitFor("!!document.querySelector('[data-khoi=phi-dua-don]')", "mục phí");
      const k = await khoiPhi(p);
      assert.equal(k.tieuDe, "Phí đưa đón (dự kiến)");
      assert.deepEqual(k.dong, mongDoi);
      assert.deepEqual(k.thieu, []);
      const tamTinh = await p.ev("[...document.querySelectorAll('[data-khoi=thanh-toan] .kv')].find((d) => d.firstChild.textContent === 'Tạm tính')?.lastChild.textContent ?? null");
      assert.equal(so(tamTinh), 2 * 1_350_000 + 300_000);
      assert.equal(await p.ev(noOverflowX), true, "không tràn ngang");
      await anh(p, "[data-khoi=thanh-toan]", `phi-don-gia-goc-don-nhap-${ten(khung)}.png`);
      await axe(p, `trang đơn nháp ${khung.width}`);
    });
  }
  p.close();

  // ---- 3) Mở lại biểu mẫu ở 375 ------------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.salesA, `/order-form?id=${d1.id}`, MOB);
  await b.step("3", `375 biểu mẫu nạp lại: lượt đi «Bỏ đổi phí» với 80000 + lý do đã lưu; lượt về «Đổi phí"${axeNote()}`, async () => {
    await p.waitFor("document.querySelectorAll('.dd-tom-tat, .dd-phi').length >= 2", "lượt đã nạp", 15000);
    assert.equal(await p.ev(moThe), true, "mở thẻ dịch vụ");
    await p.ev(moHetLuot);
    await p.waitFor("document.querySelectorAll('.dd-phi').length === 2", "hai khối phí", 15000);
    assert.deepEqual(await p.ev(`[${nutDoi(0)}.textContent, ${nutDoi(1)}.textContent, ${oGia(0)}.value, ${oLyDo(0)}.value]`), ["Bỏ đổi phí", "Đổi phí", "80000", "Khách ở xa trung tâm"], "nạp đúng số đổi đã lưu theo id lượt");
    assert.equal(await p.ev(noOverflowX), true, "375 không tràn ngang");
    await anh(p, anhLuot(0), "phi-don-gia-goc-form-doi-phi-dien-thoai.png");
    await axe(p, "biểu mẫu 375");
    assert.deepEqual(loiThat(p), [], `lỗi console: ${loiThat(p)}`);
  });
  p.close();

  // ---- 4) Xác nhận đơn ⇒ phí đã chụp ----------------------------------------------------------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.salesA, `/order?id=${d1.id}`, DESK);
  await b.step("4", "1280 Bán hàng «Xác nhận đơn» ⇒ mục «Phí đưa đón» (đã chụp), số giữ nguyên", async () => {
    await p.waitFor("!!document.querySelector('[data-khoi=phi-dua-don]')", "trang đơn nháp");
    assert.equal(await p.ev("(() => { const b = [...document.querySelectorAll('button.btn-accent')].find((x) => x.textContent.trim() === 'Xác nhận đơn'); if (!b) return false; b.click(); return true; })()"), true, "bấm «Xác nhận đơn»");
    await p.waitFor("[...document.querySelectorAll('button.btn-danger')].some((x) => x.textContent.trim() === 'Xác nhận đơn')", "hộp hỏi lại");
    await p.ev("[...document.querySelectorAll('button.btn-danger')].find((x) => x.textContent.trim() === 'Xác nhận đơn').click()");
    await p.waitFor("document.querySelector('.phi-don-tieu-de')?.textContent === 'Phí đưa đón'", "đã xác nhận", 15000);
    assert.deepEqual((await khoiPhi(p)).dong, mongDoi);
    await anh(p, "[data-khoi=thanh-toan]", "phi-don-gia-goc-don-da-xac-nhan-may-tinh.png");
    assert.deepEqual(loiThat(p), [], `lỗi console: ${loiThat(p)}`);
  });
  p.close();

  // ---- 4b) Đối tác ---------------------------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(DOITAC, `/order-form?id=${d3.id}`, MOB);
  await b.step("4b", `375 Đối tác mở biểu mẫu nháp có lượt đón: số máy tính + câu «${CAU_VAN_PHONG_DOI_PHI_DON}», không nút «Đổi phí»; Lưu không gửi doiPhi / phiDon${axeNote()}`, async () => {
    await p.waitFor("document.querySelectorAll('.dd-tom-tat, .dd-phi').length >= 1", "lượt đã nạp", 15000);
    assert.equal(await p.ev(moThe), true, "mở thẻ dịch vụ");
    await p.ev(moHetLuot);
    await p.waitFor("!!document.querySelector('[data-o-phi=doi-tac]') && document.querySelector('[data-o-phi=doi-tac]').getClientRects().length > 0", "khối phí của Đối tác", 15000);
    const chu = await p.ev("document.querySelector('[data-o-phi=doi-tac]').textContent");
    assert.ok(chu.includes(CAU_VAN_PHONG_DOI_PHI_DON), chu);
    assert.ok(chu.includes("70.000 đ × 2 khách (giá gốc)"), chu);
    assert.equal(await p.ev("document.querySelectorAll('[data-o-phi=nut-doi], [data-o-phi=don-gia]').length"), 0, "Đối tác không có nút đổi phí");
    assert.equal(await p.ev(noOverflowX), true, "375 không tràn ngang");
    await anh(p, ".dd-chang[data-chieu=OUT]", "phi-don-gia-goc-form-doi-tac-dien-thoai.png");
    await axe(p, "biểu mẫu Đối tác 375");
    assert.equal(await p.ev("(() => { const b = document.getElementById('save'); if (b.disabled) return false; b.click(); return true; })()"), true, "bấm Lưu");
    await p.waitFor("location.pathname === '/order'", "lưu xong về trang đơn", 15000);
    const put = p.requests.find((r) => r.method === "PUT" && new URL(r.url).pathname === `/api/orders/${d3.id}`);
    assert.ok(put, "có lệnh lưu nháp");
    assert.ok(!put.postData.includes('"doiPhi"') && !put.postData.includes('"phiDon"'), "thân lưu của Đối tác không có khoá doiPhi / phiDon");
    assert.deepEqual(loiThat(p), [], `lỗi console: ${loiThat(p)}`);
  });
  p.close();

  // ---- 5) Bán hàng khác (người xét): Còn vé với khối phí (mở SAU CÙNG) -------------------------------------------------------------------------------------------------
  // Giá gốc TD101 bị xoá trên Sheet (dòng mới nhất rỗng): đơn Đối tác chờ vẫn «chưa tính được» lúc người xét mở (nháp tính lại lúc đọc).
  const luc2 = new Date(Date.now() + 2000).toISOString();
  env.sql(`INSERT INTO ctl_service_transfer_price (id, catalog_code, per_pax_price, private_price, valid_from_at, created_at, updated_at) VALUES ('${crypto.randomUUID()}', 'TD101', NULL, NULL, '${luc2}', '${luc2}', '${luc2}')`);
  p = await env.as(ACCOUNTS.salesB, `/order?id=${d2.id}`, DESK);
  const legId = d2.services[0].legs[0].id;
  const chonGio = "(() => { for (const s of document.querySelectorAll('.cx-luot[data-leg-id] select')) { if (s.options.length > 1 && s.value === '') { s.value = s.options[1].value; s.dispatchEvent(new Event('change', { bubbles: true })); } } return true; })()";
  const loiCv = `(() => { const l = document.getElementById('cx-phi-${legId}-loi'); return l && !l.hidden ? l.textContent : null; })()`;
  for (const khung of [DESK, MOB]) {
    await b.step(`5-${khung.width}`, `${khung.width} người xét mở đơn Đối tác chờ: khối phí «chưa tính được»; bấm Còn vé khi chưa đổi ⇒ câu báo tại chỗ, không gọi máy chủ${axeNote()}`, async () => {
      if (khung === MOB) await doiKhung(p, MOB);
      await p.waitFor("!!document.querySelector('[data-khoi=phi-don-con-ve] [data-phi-leg-id]')", "khối phí trong bảng Còn vé", 15000);
      assert.match(await p.ev("document.querySelector('[data-khoi=phi-don-con-ve] .dd-phi-may').textContent"), /chưa tính được/);
      await p.waitFor("[...document.querySelectorAll('.cx-luot[data-leg-id] select')].every((s) => s.options.length > 1)", "khung giờ đã nạp");
      await p.ev(chonGio);
      const truoc = p.requests.filter((r) => r.url.includes("/quyet-dinh")).length;
      await p.ev(click('[data-action="quyet-dinh-con-ve"]'));
      await p.waitFor(`${loiCv} !== null`, "câu báo thiếu phí");
      assert.match(await p.ev(loiCv), /chưa có giá gốc phí đưa đón cho lượt đón chiều đi/);
      assert.equal(p.requests.filter((r) => r.url.includes("/quyet-dinh")).length, truoc, "chưa đổi phí: không gọi máy chủ");
      assert.equal(await p.ev("!document.querySelector('.sheet-foot-xac-nhan .btn-danger')"), true, "không mở hộp hỏi lại");
      await anh(p, "[data-khoi=xac-nhan-don]", `phi-don-gia-goc-con-ve-chua-doi-${ten(khung)}.png`);
      assert.equal(await p.ev(noOverflowX), true, "không tràn ngang");
      assert.equal(await p.ev(noCode), "");
      await axe(p, `bảng Còn vé ${khung.width}`);
    });
  }
  await b.step("5b", "375 «Đổi phí» 20.000 + lý do ⇒ Còn vé ⇒ hộp hỏi lại ⇒ đơn đã xác nhận, dòng 2 khách × 20.000 (số máy chủ tính)", async () => {
    await p.ev(`(() => { document.querySelector('[data-khoi=phi-don-con-ve] [data-o-phi=nut-doi]').click(); return true; })()`);
    await p.ev(go("document.querySelector('[data-khoi=phi-don-con-ve] input[data-o-phi=don-gia]')", "20.000"));
    await p.ev(go("document.querySelector('[data-khoi=phi-don-con-ve] input[data-o-phi=ly-do]')", "Báo giá riêng cho đối tác"));
    await anh(p, "[data-khoi=xac-nhan-don]", "phi-don-gia-goc-con-ve-doi-phi-dien-thoai.png");
    await p.ev(click('[data-action="quyet-dinh-con-ve"]'));
    await p.waitFor("!!document.querySelector('.sheet-foot-xac-nhan .btn-danger')", "hộp hỏi lại", 8000);
    await p.ev(click(".sheet-foot-xac-nhan .btn-danger"));
    await p.waitFor("document.querySelector('.phi-don-tieu-de')?.textContent === 'Phí đưa đón'", "đã xác nhận", 15000);
    const q = p.requests.filter((r) => r.url.includes("/quyet-dinh")).at(-1);
    assert.deepEqual(JSON.parse(q.postData).doiPhi, [{ legId, donGia: 20000, lyDo: "Báo giá riêng cho đối tác" }], "lệnh Còn vé mang số đổi");
    assert.ok(!q.postData.includes('"phiDon"'), "không gửi khoá phiDon");
    assert.deepEqual((await khoiPhi(p)).dong, [["Chiều đi", "2 khách × 20.000 ₫", "40.000 ₫"]]);
    assert.deepEqual(loiThat(p), [], `lỗi console: ${loiThat(p)}`);
  });
  p.close();
} finally {
  b.xong();
  console.log(`Ảnh: ${OUT}/phi-don-gia-goc-*.png`);
  await env.stop();
}
