// Kịch bản Chrome + axe — «Khách đặt cọc cho đối tác» (ADR-0159; tên và ô ở đơn Trả sau theo ADR-0197, cập nhật 2026-11-11; công tắc ô cọc và thẻ cài đặt theo ADR-0236, 26/11). Hai khổ 390 và 1280. Trên D1 local tạm, tên và SĐT là GIẢ, không đụng dữ liệu thật.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-02-dat-coc node docs/evidence/2026-11-02-dat-coc/kich-ban/dat-coc-smoke.mjs
// Trang dùng chung kho cookie: mỗi phần đăng nhập đúng một tài khoản, mở trang của tài khoản đó sau cùng.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CHU, MOB, OUT, assert, axe, axeNote, boDem, dungMoiTruong, noCode, noOverflowX, sleep, typeInto, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const DOITAC = { name: "Đối Tác Đặt Cọc", phone: "0900000711", pin: "246711", permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" }; // ADR-0185: tài khoản Đối tác phải có vai trò đối tác
const BAN = { name: "Bán Hàng Không Ô Cọc", phone: "0900000712", pin: "246712", permissions: ["SALES"] };
const QT = { name: "Quản Trị Công Tắc Cọc", phone: "0900000713", pin: "246713", permissions: ["ADMIN"] }; // ADR-0236 Đ2: Quản trị KHÔNG thấy, không đổi được công tắc ô cọc (chủ 26/11)
const TQ = { name: "Toàn Quyền Công Tắc Cọc", phone: "0900000715", pin: "246715", permissions: ["SUPER_ADMIN"] }; // ADR-0236 Đ2: chỉ Toàn quyền đổi được
// Một phiên mỗi tài khoản (ADR-0075): TQ mở trang trong trình duyệt, nên lời gọi API bật / tắt dùng tài khoản Toàn quyền THỨ HAI để không đá phiên của trang.
const TQ_API = { name: "Toàn Quyền Gọi API Cọc", phone: "0900000714", pin: "246714", permissions: ["SUPER_ADMIN"] };
const { env, call } = await dungMoiTruong([CHU, DOITAC, BAN, QT, TQ, TQ_API]);
const b = boDem("KHACH DAT COC TRUOC");
mkdirSync(join(OUT, "anh"), { recursive: true });
const ngay = vnDate(3);
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);

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
const dichVu = [{ kind: "catalog", catalogCode: "TD101", pickupChoice: "KHONG_DON", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, departDate: ngay, legs: [] }];
const lap = async (who, coc, term) => {
  const r = await call(who, "POST", "/api/orders", { customerName: "Khách Thử Đặt Cọc", customerPhone: "0903261001", customerEmail: "", customerNote: "", discount: 0, paymentNote: "", services: dichVu, passengers: [], ...(term ? { paymentTerm: term } : {}), ...(coc === undefined ? {} : { declaredDeposit: coc }) });
  dung(r, 201, "lập đơn");
  return r.json.order;
};
const docTxt = (p, sel) => p.ev(`((e) => e ? e.innerText.replace(/\\s+/g, ' ').trim() : null)(document.querySelector(${JSON.stringify(sel)}))`);
const hien = (p, sel) => p.ev(`((e) => !!e && e.getClientRects().length > 0)(document.querySelector(${JSON.stringify(sel)}))`);
const coChu = (p, chu) => p.ev(`document.querySelector('main').innerText.replace(/\\s+/g, ' ').includes(${JSON.stringify(chu)})`);

// Đặt cờ cần xác nhận cho dịch vụ để đơn thứ hai vào hàng chờ của người xét.
dung(await call(CHU, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: "TD101", canXacNhan: true }), 200, "đặt cờ");

const donNhap = await lap(DOITAC, 500000);
const donCho = await lap(DOITAC, 700000);
dung(await call(DOITAC, "POST", `/api/orders/${donCho.id}/gui-don`, {}), 201, "gửi đơn vào hàng chờ");
// ADR-0197: Toàn quyền cấp hạn mức trả sau cho hồ sơ của Đối tác rồi Đối tác lập nháp Trả sau có cọc (gieo TRƯỚC khi mở trang).
dung(await call(CHU, "POST", "/api/tra-sau/han-muc", { partyId: donNhap.bookerPartyId, hanMuc: 50000000, gioTra: 168, gioAnHan: 0, lyDo: "Kịch bản Chrome đặt cọc trả sau" }), 201, "cấp hạn mức");
const donTS = await lap(DOITAC, 300000, "CREDIT");
assert.equal(donTS.paymentTerm, "CREDIT");
const DESK_RONG = { width: 1280, height: 820, mobile: false };

const buoc = async (khung, hau) => {
  // ---- ADR-0236 Đ1 (26/11, lệnh chủ «bật lại đi»): công tắc BẬT (mặc định) ⇒ form Đối tác có lại ô đặt cọc, nháp cũ hiện đúng số đã khai; ô Ghi chú thanh toán VẪN không có chữ gợi ý
  // «nội dung chuyển khoản» (ADR-0225 Đ2 còn hiệu lực). Công tắc TẮT ⇒ ô ẩn như ADR-0225 Đ1. ----
  let p = await env.as(DOITAC, `/order-form?id=${donNhap.id}`, khung);
  await p.waitFor(`!!document.querySelector('#pay-card') && document.querySelector('#customerName') && document.querySelector('#customerName').value !== ''`, "form nạp nháp đã khai cọc");
  await b.step(`${hau}-1`, `${hau}: công tắc Bật ⇒ form Đối tác hiện ô cọc mang số 500.000 đã khai; nút gập «Giải thích giảm giá, đặt cọc»; Ghi chú thanh toán không có chữ gợi ý chuyển khoản; không tràn ngang${axeNote()}`, async () => {
    await sleep(500);
    assert.equal(await hien(p, "#declaredDeposit"), true, "ô cọc hiện");
    assert.equal(Number(String(await p.ev(`document.querySelector('#declaredDeposit').value`)).replace(/\D/g, "")), 500000, "nháp cũ giữ số đã khai");
    assert.equal(await p.ev(`document.querySelector('#paymentNote').placeholder`), "", "không có chữ gợi ý «nội dung chuyển khoản» (ADR-0225 Đ2)");
    const nut = await p.ev(`(() => { const n = document.querySelector('[data-gap="thanh-toan-giai-thich"]'); return n ? { chu: n.textContent, an: n.hidden } : null; })()`);
    assert.ok(nut && !nut.an && nut.chu === "Giải thích giảm giá, đặt cọc", `nút gập nhắc cả đặt cọc: ${JSON.stringify(nut)}`);
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `01-doi-tac-form-${hau}`, khung);
    await axe(p, `form đối tác ${hau}`);
  });
  p.close();
  p = await env.as(DOITAC, `/order-form?id=${donTS.id}`, khung);
  await p.waitFor(`!!document.querySelector('#tra-sau-khoi') && !document.querySelector('#tra-sau-khoi').hidden`, "form nháp Trả sau");
  await b.step(`${hau}-2b`, `${hau}: đơn Trả sau của Đối tác có ô cọc và câu nhắc cọc`, async () => {
    await sleep(500);
    assert.equal(await p.ev(`document.querySelector('input[name="paymentTerm"][value="CREDIT"]').checked`), true, "nháp đang chọn Trả sau");
    assert.equal(await hien(p, "#declaredDeposit"), true);
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `02b-doi-tac-tra-sau-${hau}`, khung);
  });
  p.close();
  // ---- Toàn quyền TẮT công tắc ⇒ form Đối tác không còn ô; bật lại cho các bước sau ----
  dung(await call(QT, "POST", "/api/cai-dat/o-dat-coc-doi-tac", { hien: false }), 403, "Quản trị không tắt được ô cọc");
  dung(await call(TQ_API, "POST", "/api/cai-dat/o-dat-coc-doi-tac", { hien: false }), 200, "Toàn quyền tắt ô cọc");
  p = await env.as(DOITAC, `/order-form?id=${donNhap.id}`, khung);
  await p.waitFor(`!!document.querySelector('#pay-card') && document.querySelector('#customerName') && document.querySelector('#customerName').value !== ''`, "form khi công tắc tắt");
  await b.step(`${hau}-2c`, `${hau}: công tắc Tắt ⇒ form Đối tác không có ô cọc; nút gập không nhắc đặt cọc`, async () => {
    await sleep(500);
    assert.equal(await hien(p, "#declaredDeposit"), false, "ô cọc ẩn");
    assert.equal(await p.ev(`[...document.querySelectorAll('[data-dat-coc]')].some((e) => e.getClientRects().length > 0)`), false, "không có dòng cọc ở Tóm tắt");
    const nut = await p.ev(`(() => { const n = document.querySelector('[data-gap="thanh-toan-giai-thich"]'); return n ? { chu: n.textContent, an: n.hidden } : null; })()`);
    assert.ok(nut === null || nut.an || nut.chu === "Giải thích giảm giá", `nút gập không nhắc đặt cọc: ${JSON.stringify(nut)}`);
    await chup(p, `02c-doi-tac-tat-o-coc-${hau}`, khung);
  });
  p.close();
  dung(await call(TQ_API, "POST", "/api/cai-dat/o-dat-coc-doi-tac", { hien: true }), 200, "Toàn quyền bật lại ô cọc");
  // ---- Trang Tôi của Quản trị: KHÔNG có hai thẻ (chủ 26/11 «không thay đổi quyền của Quản trị») ----
  p = await env.as(QT, "/account", khung);
  await p.waitFor(`document.readyState === "complete" && !!document.querySelector('#cai-dat-lap-don')`, "trang Tôi của Quản trị");
  await b.step(`${hau}-2e`, `${hau}: Quản trị không thấy thẻ «Ô khách đặt cọc cho đối tác» và «Ô bằng lái trên phiếu đăng ký»`, async () => {
    await sleep(1200);
    assert.equal(await p.ev(`!!document.querySelector('#o-dat-coc-doi') || !!document.querySelector('#o-bang-lai-doi')`), false, "Quản trị không có nút");
    assert.equal(await p.ev(`['#o-dat-coc-cai-dat', '#o-bang-lai-cai-dat'].some((s) => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0; })`), false, "hai thẻ ẩn");
  });
  p.close();
  // ---- Trang Tôi của Toàn quyền: hai thẻ cài đặt (ô cọc bật / tắt được, ô bằng lái khoá) ----
  p = await env.as(TQ, "/account", khung);
  await p.waitFor(`!!document.querySelector('#o-dat-coc-doi') && !!document.querySelector('#o-bang-lai-doi')`, "trang Tôi của Toàn quyền");
  await b.step(`${hau}-2d`, `${hau}: Toàn quyền thấy thẻ «Ô khách đặt cọc cho đối tác» (Đang bật, nút Tắt) và thẻ «Ô bằng lái trên phiếu đăng ký» (Đang tắt, nút khoá kèm lý do)${axeNote()}`, async () => {
    await sleep(400);
    assert.equal(await docTxt(p, "#o-dat-coc-trang-thai"), "Đang bật.");
    assert.equal(await docTxt(p, "#o-dat-coc-doi"), "Tắt ô khách đặt cọc cho đối tác");
    assert.equal(await p.ev(`document.querySelector('#o-bang-lai-doi').disabled`), true, "nút bật ô bằng lái khoá");
    assert.equal(await coChu(p, "Chưa bật được: phiếu đăng ký chưa có ô bằng lái và hạng."), true);
    assert.equal(await p.ev(noOverflowX), true);
    await p.ev(`document.querySelector('#cai-dat-lap-don').scrollIntoView()`);
    await chup(p, `02d-toan-quyen-cai-dat-${hau}`, khung);
    await axe(p, `trang Tôi Toàn quyền ${hau}`);
  });
  p.close();
  // ---- Đối tác xem đơn nháp ----
  p = await env.as(DOITAC, `/order?id=${donNhap.id}`, khung);
  await p.waitFor(`document.querySelector('main').innerText.includes('Tổng cộng')`, "trang đơn");
  await b.step(`${hau}-3`, `${hau}: đơn nháp có dòng «Khách đặt cọc cho đối tác (chờ xác nhận)»${axeNote()}`, async () => {
    assert.equal(await coChu(p, "Khách đặt cọc cho đối tác (chờ xác nhận)"), true);
    assert.equal(await p.ev(noCode), "");
    await chup(p, `03-doi-tac-don-nhap-${hau}`, khung);
    await axe(p, `đơn nháp ${hau}`);
  });
  p.close();
  // ---- Bán hàng: không có ô ----
  p = await env.as(BAN, "/order-form", khung);
  await p.waitFor(`!!document.querySelector('#pay-card')`, "form bán hàng");
  await b.step(`${hau}-4`, `${hau}: tài khoản văn phòng không có ô, không có dòng`, async () => {
    await sleep(500);
    assert.equal(await hien(p, "#declaredDeposit"), false);
    assert.equal(await p.ev(`[...document.querySelectorAll('[data-dat-coc]')].some((e) => e.getClientRects().length > 0)`), false);
  });
  p.close();
  // ---- Người xét thấy số trước khi bấm ----
  p = await env.as(CHU, `/order?id=${donCho.id}`, khung);
  await p.waitFor(`document.querySelector('main').innerText.includes('Tổng cộng')`, "trang đơn người xét");
  await b.step(`${hau}-5`, `${hau}: người xét thấy số khai trước khi bấm; tên khách vẫn ẩn${axeNote()}`, async () => {
    assert.equal(await coChu(p, "Khách đặt cọc cho đối tác (chờ xác nhận)"), true, "người xét thấy số");
    assert.equal(await coChu(p, "700.000"), true);
    assert.equal(await coChu(p, "Khách Thử Đặt Cọc"), false, "tên khách vẫn cắt");
    await chup(p, `04-nguoi-xet-${hau}`, khung);
    await axe(p, `người xét ${hau}`);
  });
  p.close();
};
const sau = async (khung, hau) => {
  const p = await env.as(CHU, `/order?id=${donCho.id}`, khung);
  await p.waitFor(`document.querySelector('main').innerText.includes('Tổng cộng')`, "trang đơn sau xác nhận");
  await b.step(`${hau}-6`, `${hau}: sau xác nhận số đọc từ sổ như mọi khoản thu, không còn dòng «chờ xác nhận»${axeNote()}`, async () => {
    await sleep(600);
    assert.equal(await coChu(p, "(chờ xác nhận)"), false);
    assert.equal(await coChu(p, "700.000"), true);
    await chup(p, `05-sau-xac-nhan-${hau}`, khung);
    await axe(p, `sau xác nhận ${hau}`);
  });
  p.close();
};
try {
  await buoc(MOB, "390");
  await buoc(DESK_RONG, "1280");
  const xem = (await call(CHU, "GET", `/api/orders/${donCho.id}`)).json;
  dung(await call(CHU, "POST", `/api/orders/${donCho.id}/quyet-dinh`, { ketQua: "CON_VE", yeuCauId: xem.xacNhan.yeuCau.id, updatedAt: xem.order.updatedAt }), 200, "Còn vé");
  await sau(MOB, "390");
  await sau(DESK_RONG, "1280");
  // Biên nhận: đọc chữ thật để báo chủ (ADR-0159 Hệ quả «chưa kiểm»).
  const bn = (await call(CHU, "GET", `/api/orders/${donCho.id}/receipt`)).json.receipt;
  console.log(`BIÊN NHẬN: daTra=${bn.daTra} conLai=${bn.conLai} total=${bn.total}`);
} finally {
  await env.stop?.();
  await env.tat?.();
}
b.xong();
