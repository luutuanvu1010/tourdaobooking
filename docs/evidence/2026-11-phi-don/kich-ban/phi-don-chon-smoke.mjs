// Kịch bản Chrome THẬT cho phí đưa đón DO VĂN PHÒNG CHỌN (ADR-0214, Task 6). Bấm đến cùng, không chỉ mở trang:
//   1) Bán hàng mở biểu mẫu sửa đơn nháp có hai lượt (chưa chọn phí): mỗi lượt có ô «Phí đưa đón» (Chưa chọn, Miễn phí, 5.000 … 100.000 đ, Số khác). Chiều đi chọn «Số khác»,
//      gõ 6.000.000 ⇒ câu trần «Mức phí tối đa 5.000.000 đ.»; gõ 70.5 ⇒ câu «không hợp lệ» (cùng câu máy chủ); gõ 70.000 ⇒ hết lỗi. Chiều về chọn 30.000 đ. Lưu ⇒ thân gửi có
//      `phiDon` cho cả hai lượt ⇒ về trang đơn.
//   2) Trang đơn nháp: «Phí đưa đón (dự kiến)» — chiều đi 2 khách × 70.000, chiều về 2 khách × 30.000 (số do máy chủ tính). 1280 + 375.
//   3) Mở lại biểu mẫu ở 375: ô của hai lượt hiện ĐÚNG mức đã lưu (Số khác 70.000, 30.000 đ) — lần lưu sau không xoá mức. Ảnh ô mở danh sách và câu trần ở 375.
//   4) Bán hàng bấm «Xác nhận đơn» qua hộp hỏi lại ⇒ mục thành «Phí đưa đón» (đã chụp).
//   5) Đối tác lập đơn có lượt đón và Gửi đơn bằng API (không gửi mức; đơn vào «chờ xác nhận»). Quản trị mở đơn: bảng «Xác nhận đơn» có ô phí cho lượt chưa có mức; bấm
//      «Còn vé, xác nhận đơn» khi chưa chọn ⇒ câu «Chọn phí đưa đón cho lượt đón chiều đi của dịch vụ … trước khi xác nhận.», không gọi máy chủ; chọn 20.000 đ ⇒ xác nhận,
//      đơn có dòng 2 khách × 20.000. Ảnh bảng ở 1280 + 375.
// Dùng khung dp-lib.mjs (D1 tạm + wrangler dev + Chrome headless; Turnstile TẮT; không đụng dữ liệu thật; không cần mạng ngoài).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=<…/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> OUT=docs/evidence/2026-11-phi-don node docs/evidence/2026-11-phi-don/kich-ban/phi-don-chon-smoke.mjs
// `AXE_JS` thiếu thì BỎ QUA kiểm màu và tên bước ghi «(chưa chạy axe: thiếu AXE_JS)». Ảnh `phi-don-chon-*.png` ra thư mục `OUT` (mặc định docs/evidence/2026-11-phi-don).
// Ảnh «mở danh sách»: ô chọn của máy không chụp được khi đang mở trong Chrome không đầu, nên kịch bản tạm đặt `size` cho ô để vẽ danh sách ra trang rồi trả lại (chỉ để chụp).
// Luật một máy (ADR-0075): đăng nhập lại đá phiên cũ — mọi lệnh API làm TRƯỚC khi mở trang; trang Bán hàng mở trước, trang Quản trị mở sau cùng.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, assert, axe, axeNote, boDem, click, dungMoiTruong, noCode, noOverflowX, sleep, typeInto, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
import { CAU_KHONG_HOP_LE_PHI_DON, CAU_VUOT_TRAN_PHI_DON } from "../../../../src/shared/phi-don-chon.ts";

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
/** Ảnh đúng khung một phần tử: cuộn phần tử vào giữa rồi cắt theo toạ độ trang (thanh trên dính không đè lên phần tử). */
const anh = async (p, chon, tep) => {
  await sleep(350);
  const r = await p.ev(`(() => { const e = document.querySelector(${JSON.stringify(chon)}); e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height }; })()`);
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
/** Ô phí của lượt thứ `i` (0 = chiều đi, 1 = chiều về) trong biểu mẫu. */
const oPhi = (i) => `document.querySelectorAll('select[data-phi-don=chon]')[${i}]`;
const chonPhi = (i, v) => `(() => { const s = ${oPhi(i)}; s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event('change', { bubbles: true })); return s.value; })()`;
const goKhac = (i, v) => `(() => { const e = document.querySelectorAll('input[data-phi-don=so-khac]')[${i}]; e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`;
const loiLuot = (i) => `(() => { const s = ${oPhi(i)}; const l = document.getElementById(s.getAttribute('aria-describedby')); return l && !l.hidden ? l.textContent : null; })()`;
/** Mở danh sách để chụp: đặt `size` tạm (ô chọn của máy không chụp được khi đang mở). */
const moDanhSach = (i, mo) => `(() => { const s = ${oPhi(i)}; if (${mo}) s.size = s.options.length; else s.removeAttribute('size'); return s.options.length; })()`;
/** Thẻ dịch vụ của nháp nạp lại đang GẬP: mở thẻ (như người dùng chạm dòng gập) để thấy khối Đưa đón. */
const moThe = "(() => { const b = document.querySelector('[data-action=mo-the]'); const than = document.querySelector('.svc-than'); if (than && than.hidden && b) b.click(); return !document.querySelector('.svc-than').hidden; })()";
const anhLuot = (i) => `.dd-chang[data-chieu=${i === 0 ? "OUT" : "RETURN"}]`;

try {
  // ---- dữ liệu bằng API thật TRƯỚC khi mở trang ---------------------------------------------------------------------------------------------------------------
  const tuLuc = dung(await call(ACCOUNTS.admin, "GET", "/api/pricing/phi-don"), 200, "đọc ngày áp").batDauAp.tuLuc;
  dung(await call(ACCOUNTS.admin, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: vnDate(0), tuLucDaDoc: tuLuc }), 200, "bật phí từ hôm nay (bảng mức để trống — ADR-0214 không cần)");
  const legs = [
    { direction: "OUT", pickupDate: "", pickupTime: "07:00", pickupLocationId: null, pickupPlace: "Khách sạn Thử Phí", dropoffLocationId: BEN, dropoffPlace: "" },
    { direction: "RETURN", pickupDate: NGAY_DI, pickupTime: "16:00", pickupLocationId: BEN, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Thử Phí" },
  ];
  const svc = (l) => [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 2 }, catalogPriceSeen: { adult: 1_350_000, child: 950_000, senior: 1_200_000, infant: 0 }, departDate: NGAY_DI, pickupChoice: "DON", legs: l }];
  const d1 = dung(await call(ACCOUNTS.salesA, "POST", "/api/orders", { customerName: "Khách Thử Phí", customerPhone: "0901 214 001", services: svc(legs) }), 201, "Bán hàng lập nháp hai lượt, chưa chọn phí").order;
  assert.deepEqual(d1.phiDuaDon?.thieu.map((t) => t.direction), ["OUT", "RETURN"], "máy chủ: hai lượt «chưa chọn»");
  const d2 = dung(await call(DOITAC, "POST", "/api/orders", { customerName: "Khách Đối Tác Phí", customerPhone: "0901 214 002", services: svc([{ ...legs[0], pickupTime: "" }]) }), 201, "Đối tác lập nháp một lượt").order;
  const gui = await call(DOITAC, "POST", `/api/orders/${d2.id}/gui-don`, {});
  assert.equal(gui.status, 201, `Đối tác Gửi đơn ⇒ nhánh «chờ xác nhận» vì lượt chưa có phí: ${gui.status} ${gui.text}`);

  // ---- 1) Biểu mẫu 1280: chọn phí, câu trần, câu không hợp lệ, Lưu ------------------------------------------------------------------------------------------------
  let p = await env.as(ACCOUNTS.salesA, `/order-form?id=${d1.id}`, DESK);
  await b.step("1", `1280 biểu mẫu: hai ô «Phí đưa đón»; Số khác 6.000.000 ⇒ câu trần; 70.5 ⇒ câu không hợp lệ; 70.000 + 30.000 đ ⇒ Lưu gửi phiDon cả hai lượt${axeNote()}`, async () => {
    await p.waitFor("document.querySelectorAll('select[data-phi-don=chon]').length === 2", "hai ô phí (lượt chưa chọn mở sẵn)", 15000);
    assert.equal(await p.ev(moThe), true, "mở thẻ dịch vụ");
    assert.deepEqual(await p.ev(`[...${oPhi(0)}.options].map((o) => o.textContent)`), ["Chưa chọn", "Miễn phí", "5.000 đ", "10.000 đ", "15.000 đ", "20.000 đ", "30.000 đ", "50.000 đ", "100.000 đ", "Số khác"]);
    assert.equal(await p.ev(`${oPhi(0)}.value`), "", "lượt chưa chọn hiện «Chưa chọn», không tự Miễn phí");
    assert.equal(await p.ev(moDanhSach(0, true)), 10);
    await anh(p, anhLuot(0), "phi-don-chon-form-danh-sach-may-tinh.png");
    await p.ev(moDanhSach(0, false));
    assert.equal(await p.ev(chonPhi(0, "khac")), "khac");
    assert.equal(await p.ev("document.querySelectorAll('input[data-phi-don=so-khac]')[0].getClientRects().length > 0"), true, "chọn Số khác ⇒ hiện ô gõ số");
    assert.equal(await p.ev("(() => { const e = document.querySelectorAll('input[data-phi-don=so-khac]')[0]; return [getComputedStyle(e).fontSize, e.inputMode]; })()").then((x) => x.join()), "16px,numeric", "ô gõ 16px, bàn phím số");
    await p.ev(goKhac(0, "6.000.000"));
    assert.equal(await p.ev(loiLuot(0)), CAU_VUOT_TRAN_PHI_DON, "6.000.000 ⇒ câu trần của máy chủ");
    await anh(p, anhLuot(0), "phi-don-chon-form-so-khac-tran-may-tinh.png");
    await axe(p, "biểu mẫu 1280, câu trần");
    await p.ev(goKhac(0, "70.5"));
    assert.equal(await p.ev(loiLuot(0)), CAU_KHONG_HOP_LE_PHI_DON, "70.5 ⇒ câu không hợp lệ (không đọc thành 705)");
    await p.ev(goKhac(0, "70.000"));
    assert.equal(await p.ev(loiLuot(0)), null, "70.000 ⇒ hết lỗi");
    assert.equal(await p.ev(chonPhi(1, "30000")), "30000");
    await anh(p, anhLuot(1), "phi-don-chon-form-chon-muc-may-tinh.png");
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev("(() => { const b = document.getElementById('save'); if (b.disabled) return false; b.click(); return true; })()"), true, "bấm Lưu");
    await p.waitFor("location.pathname === '/order' && !!document.querySelector('[data-khoi=phi-dua-don]')", "lưu xong về trang đơn", 15000);
    const put = p.requests.find((r) => r.method === "PUT" && new URL(r.url).pathname === `/api/orders/${d1.id}`);
    assert.ok(put, "có lệnh lưu nháp");
    assert.deepEqual(JSON.parse(put.postData).services[0].legs.map((l) => l.phiDon), [{ loai: "SO_KHAC", soTien: 70000 }, { loai: "DANH_SACH", soTien: 30000 }], "thân lưu mang phiDon của cả hai lượt");
    assert.deepEqual(loiThat(p), [], `lỗi console: ${loiThat(p)}`);
  });

  // ---- 2) Trang đơn nháp: dòng dự kiến ---------------------------------------------------------------------------------------------------------------------------
  const mongDoi = [["Chiều đi", "2 khách × 70.000 ₫", "140.000 ₫"], ["Chiều về", "2 khách × 30.000 ₫", "60.000 ₫"]];
  for (const khung of [DESK, MOB]) {
    await b.step(`2-${khung.width}`, `${khung.width} trang đơn nháp: «Phí đưa đón (dự kiến)» 2 × 70.000 và 2 × 30.000, không băng «chưa chọn», tạm tính gồm phí${axeNote()}`, async () => {
      if (khung === MOB) await doiKhung(p, MOB);
      await p.waitFor("!!document.querySelector('[data-khoi=phi-dua-don]')", "mục phí");
      const k = await khoiPhi(p);
      assert.equal(k.tieuDe, "Phí đưa đón (dự kiến)");
      assert.deepEqual(k.dong, mongDoi);
      assert.deepEqual(k.thieu, [], "đã chọn đủ ⇒ không còn câu «Chọn phí đưa đón cho lượt đón …»");
      const tamTinh = await p.ev("[...document.querySelectorAll('[data-khoi=thanh-toan] .kv')].find((d) => d.firstChild.textContent === 'Tạm tính')?.lastChild.textContent ?? null");
      assert.equal(so(tamTinh), 2 * 1_350_000 + 200_000);
      assert.equal(await p.ev(noOverflowX), true, "không tràn ngang");
      await anh(p, "[data-khoi=thanh-toan]", `phi-don-chon-don-nhap-${ten(khung)}.png`);
      await axe(p, `trang đơn nháp ${khung.width}`);
    });
  }
  p.close();

  // ---- 3) Mở lại biểu mẫu ở 375: ô hiện đúng mức đã lưu; ảnh danh sách + câu trần (không lưu) ---------------------------------------------------------------------
  p = await env.as(ACCOUNTS.salesA, `/order-form?id=${d1.id}`, MOB);
  await b.step("3", `375 biểu mẫu nạp lại: Số khác 70.000 và 30.000 đ giữ nguyên; ảnh danh sách và câu trần ở điện thoại${axeNote()}`, async () => {
    await p.waitFor("document.querySelectorAll('select[data-phi-don=chon]').length === 2", "hai ô phí", 15000);
    assert.equal(await p.ev(moThe), true, "mở thẻ dịch vụ");
    // Lượt đã chọn phí và đủ nơi đón thì hiện GỌN một dòng (dòng tóm tắt kèm « · Phí …»): bấm để mở như người dùng.
    assert.deepEqual(await p.ev("[...document.querySelectorAll('.dd-tom-tat')].map((b) => b.textContent.includes('· Phí '))"), [true, true], "dòng tóm tắt lượt gọn có mức phí đã chọn");
    await p.ev("(() => { for (const b of document.querySelectorAll('.dd-tom-tat')) if (b.getClientRects().length > 0) b.click(); return true; })()");
    await p.waitFor("document.querySelectorAll('input[data-phi-don=so-khac]')[0].getClientRects().length > 0", "lượt mở ra");
    assert.deepEqual(await p.ev(`[${oPhi(0)}.value, document.querySelectorAll('input[data-phi-don=so-khac]')[0].value, ${oPhi(1)}.value]`), ["khac", "70.000", "30000"], "nạp đúng mức đã lưu theo id lượt");
    assert.equal(await p.ev(noOverflowX), true, "375 không tràn ngang");
    await p.ev(moDanhSach(1, true));
    await anh(p, anhLuot(1), "phi-don-chon-form-danh-sach-dien-thoai.png");
    await p.ev(moDanhSach(1, false));
    await p.ev(goKhac(0, "6.000.000"));
    assert.equal(await p.ev(loiLuot(0)), CAU_VUOT_TRAN_PHI_DON);
    await anh(p, anhLuot(0), "phi-don-chon-form-so-khac-tran-dien-thoai.png");
    await axe(p, "biểu mẫu 375, câu trần");
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
    await anh(p, "[data-khoi=thanh-toan]", "phi-don-chon-don-da-xac-nhan-may-tinh.png");
    assert.deepEqual(loiThat(p), [], `lỗi console: ${loiThat(p)}`);
  });
  p.close();

  // ---- 5) Quản trị: Còn vé với ô chọn phí cho đơn Đối tác (mở SAU CÙNG) --------------------------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.admin, `/order?id=${d2.id}`, DESK);
  const chonGio = "(() => { for (const s of document.querySelectorAll('.cx-luot[data-leg-id] select')) { if (s.options.length > 1 && s.value === '') { s.value = s.options[1].value; s.dispatchEvent(new Event('change', { bubbles: true })); } } return true; })()";
  const oCv = "document.querySelector('[data-khoi=phi-don-con-ve] select[data-phi-don=chon]')";
  for (const khung of [DESK, MOB]) {
    await b.step(`5-${khung.width}`, `${khung.width} Quản trị mở đơn Đối tác đang chờ: bảng «Xác nhận đơn» có ô phí cho lượt chưa có mức; chưa chọn mà bấm Còn vé ⇒ câu báo tại chỗ${axeNote()}`, async () => {
      if (khung === MOB) await doiKhung(p, MOB);
      await p.waitFor("!!document.querySelector('[data-khoi=phi-don-con-ve]')", "ô phí trong bảng Còn vé", 15000);
      assert.equal(await p.ev(`document.querySelectorAll('[data-khoi=phi-don-con-ve] select[data-phi-don=chon]').length`), 1, "một lượt chưa có mức");
      await p.waitFor("[...document.querySelectorAll('.cx-luot[data-leg-id] select')].every((s) => s.options.length > 1)", "khung giờ đã nạp");
      await p.ev(chonGio);
      const truoc = p.requests.filter((r) => r.url.includes("/quyet-dinh")).length;
      await p.ev(click('[data-action="quyet-dinh-con-ve"]'));
      await p.waitFor(`(() => { const s = ${oCv}; const l = document.getElementById(s.getAttribute('aria-describedby')); return l && !l.hidden; })()`, "câu báo thiếu phí");
      assert.equal(await p.ev(`document.getElementById(${oCv}.getAttribute('aria-describedby')).textContent`), `Chọn phí đưa đón cho lượt đón chiều đi của dịch vụ ${TEN_DV} trước khi xác nhận.`);
      assert.equal(p.requests.filter((r) => r.url.includes("/quyet-dinh")).length, truoc, "chưa chọn phí: không gọi máy chủ");
      assert.equal(await p.ev("!document.querySelector('.sheet-foot-xac-nhan .btn-danger')"), true, "không mở hộp hỏi lại");
      await p.ev(`(() => { const s = ${oCv}; s.value = '20000'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
      assert.equal(await p.ev(noOverflowX), true, "không tràn ngang");
      assert.equal(await p.ev(noCode), "");
      await anh(p, "[data-khoi=xac-nhan-don]", `phi-don-chon-con-ve-${ten(khung)}.png`);
      await axe(p, `bảng Còn vé ${khung.width}`);
    });
  }
  await b.step("5b", "375 Còn vé với 20.000 đ ⇒ hộp hỏi lại ⇒ đơn đã xác nhận, dòng 2 khách × 20.000 (số máy chủ tính)", async () => {
    await p.ev(click('[data-action="quyet-dinh-con-ve"]'));
    await p.waitFor("!!document.querySelector('.sheet-foot-xac-nhan .btn-danger')", "hộp hỏi lại", 8000);
    await p.ev(click(".sheet-foot-xac-nhan .btn-danger"));
    await p.waitFor("document.querySelector('.phi-don-tieu-de')?.textContent === 'Phí đưa đón'", "đã xác nhận", 15000);
    const q = p.requests.filter((r) => r.url.includes("/quyet-dinh")).at(-1);
    assert.deepEqual(JSON.parse(q.postData).phiDon.map((x) => x.muc), [{ loai: "DANH_SACH", soTien: 20000 }], "lệnh Còn vé mang mức đã chọn");
    assert.deepEqual((await khoiPhi(p)).dong, [["Chiều đi", "2 khách × 20.000 ₫", "40.000 ₫"]]);
    assert.deepEqual(loiThat(p), [], `lỗi console: ${loiThat(p)}`);
  });
  p.close();
} finally {
  b.xong();
  console.log(`Ảnh: ${OUT}/phi-don-chon-*.png`);
  await env.stop();
}
