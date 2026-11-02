// Kịch bản Chrome + axe — «Khách đặt cọc trước» (ADR-0159). Hai khổ 390 và 1040. Trên D1 local tạm, tên và SĐT là GIẢ, không đụng dữ liệu thật.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-02-dat-coc node docs/evidence/2026-11-02-dat-coc/kich-ban/dat-coc-smoke.mjs
// Trang dùng chung kho cookie: mỗi phần đăng nhập đúng một tài khoản, mở trang của tài khoản đó sau cùng.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CHU, DESK, MOB, OUT, assert, axe, axeNote, boDem, dungMoiTruong, noCode, noOverflowX, sleep, typeInto, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const DOITAC = { name: "Đối Tác Đặt Cọc", phone: "0900000711", pin: "246711", permissions: ["PARTNER"] };
const BAN = { name: "Bán Hàng Không Ô Cọc", phone: "0900000712", pin: "246712", permissions: ["SALES"] };
const { env, call } = await dungMoiTruong([CHU, DOITAC, BAN]);
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
const lap = async (who, coc) => {
  const r = await call(who, "POST", "/api/orders", { customerName: "Khách Thử Đặt Cọc", customerPhone: "0903261001", customerEmail: "", customerNote: "", discount: 0, paymentNote: "", services: dichVu, passengers: [], ...(coc === undefined ? {} : { declaredDeposit: coc }) });
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

const buoc = async (khung, hau) => {
  // ---- Đối tác: form có ô, tóm tắt có hai dòng ----
  let p = await env.as(DOITAC, `/order-form?id=${donNhap.id}`, khung);
  await p.waitFor(`document.querySelector('#declaredDeposit') && document.querySelector('#declaredDeposit').value === '500.000'`, "form nạp số đã khai");
  await b.step(`${hau}-1`, `${hau}: Đối tác thấy ô «Khách đặt cọc trước» cỡ 16px, tóm tắt đủ hai dòng, số đúng; gõ tự nhóm hàng nghìn; không tràn ngang${axeNote()}`, async () => {
    assert.equal(await hien(p, "#declaredDeposit"), true);
    assert.equal(await p.ev(`getComputedStyle(document.querySelector('#declaredDeposit')).fontSize`), "16px");
    if (khung.mobile) {
      await p.ev(`document.querySelector('#sum-mo').click()`);
      await sleep(200);
      assert.match(await docTxt(p, "#sum-chi-tiet"), /Khách đặt cọc trước 500\.000.*Khách còn phải trả 2\.200\.000/);
    } else {
      assert.match(await docTxt(p, ".summary-card"), /Khách đặt cọc trước 500\.000.*Khách còn phải trả 2\.200\.000/);
    }
    await p.ev(typeInto("#declaredDeposit", "900000"));
    await sleep(200);
    assert.equal(await p.ev(`document.querySelector('#declaredDeposit').value`), "900.000", "ô tự nhóm hàng nghìn");
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `01-doi-tac-form-${hau}`, khung);
    await axe(p, `form đối tác ${hau}`);
  });
  await b.step(`${hau}-2`, `${hau}: khai vượt tổng ⇒ form báo lời thường, chưa gửi đi`, async () => {
    await p.ev(typeInto("#declaredDeposit", "99000000"));
    await sleep(200);
    await p.ev(`document.querySelector('#save').click()`);
    await sleep(600);
    assert.equal(await p.ev(`document.body.innerText.replace(/\\s+/g, ' ').includes('không được lớn hơn tổng tiền')`), true);
    await chup(p, `02-doi-tac-vuot-tong-${hau}`, khung);
  });
  p.close();
  // ---- Đối tác xem đơn nháp ----
  p = await env.as(DOITAC, `/order?id=${donNhap.id}`, khung);
  await p.waitFor(`document.querySelector('main').innerText.includes('Tổng cộng')`, "trang đơn");
  await b.step(`${hau}-3`, `${hau}: đơn nháp có dòng «Khách đặt cọc trước (chờ xác nhận)»${axeNote()}`, async () => {
    assert.equal(await coChu(p, "Khách đặt cọc trước (chờ xác nhận)"), true);
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
    assert.equal(await coChu(p, "Khách đặt cọc trước (chờ xác nhận)"), true, "người xét thấy số");
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
  await buoc(DESK, "1040");
  const xem = (await call(CHU, "GET", `/api/orders/${donCho.id}`)).json;
  dung(await call(CHU, "POST", `/api/orders/${donCho.id}/quyet-dinh`, { ketQua: "CON_VE", yeuCauId: xem.xacNhan.yeuCau.id, updatedAt: xem.order.updatedAt }), 200, "Còn vé");
  await sau(MOB, "390");
  await sau(DESK, "1040");
  // Biên nhận: đọc chữ thật để báo chủ (ADR-0159 Hệ quả «chưa kiểm»).
  const bn = (await call(CHU, "GET", `/api/orders/${donCho.id}/receipt`)).json.receipt;
  console.log(`BIÊN NHẬN: daTra=${bn.daTra} conLai=${bn.conLai} total=${bn.total}`);
} finally {
  await env.stop?.();
  await env.tat?.();
}
b.xong();
