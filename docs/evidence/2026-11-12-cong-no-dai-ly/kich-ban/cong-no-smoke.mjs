// Kịch bản Chrome + axe — màn đơn của tài khoản Đối tác sau ADR-0182 phần A (12/11): nút «Tạo biên nhận cho khách», KHÔNG còn «QR thanh toán» (giá bán lẻ),
// nút «Xem công nợ với Tour Đảo» mở «Phiếu công nợ với Tour Đảo» theo giá đại lý có QR; đơn nháp hiện câu chờ xác nhận; văn phòng (Toàn quyền) giữ chữ «Xem ảnh gửi khách».
// Hai khổ 390 và 1280. D1 local tạm; tên, SĐT, số tài khoản là GIẢ. Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-12-cong-no-dai-ly node docs/evidence/2026-11-12-cong-no-dai-ly/kich-ban/cong-no-smoke.mjs
// Trang dùng chung kho cookie: trong mỗi khổ mở trang Đối tác trước, Toàn quyền sau cùng.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CHU, MOB, OUT, assert, axe, axeNote, boDem, dungMoiTruong, noCode, noOverflowX, sleep, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const DOITAC = { name: "Đối Tác Công Nợ", phone: "0900000721", pin: "246721", permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" };
const { env, call } = await dungMoiTruong([CHU, DOITAC]);
const b = boDem("CONG NO DAI LY");
mkdirSync(join(OUT, "anh"), { recursive: true });
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const DESK_RONG = { width: 1280, height: 820, mobile: false };

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
const nut = (p, chu) => p.ev(`[...document.querySelectorAll('button')].some((x) => x.getClientRects().length > 0 && x.innerText.trim() === ${JSON.stringify(chu)})`);
const bam = (p, chu) => p.ev(`(() => { const x = [...document.querySelectorAll('button')].find((e) => e.getClientRects().length > 0 && e.innerText.trim() === ${JSON.stringify(chu)}); if (!x) return false; x.click(); return true; })()`);
const chuTrang = (p) => p.ev(`document.body.innerText.replace(/\\s+/g, ' ')`);

// Gieo: tài khoản nhận tiền của công ty, mức hoa hồng riêng 10% cho hồ sơ đối tác, dịch vụ không cần xác nhận.
const ct = env.sql("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0]?.party_id ?? (await call(CHU, "GET", "/api/company")).json?.partyId;
dung(await call(CHU, "PUT", `/api/parties/${ct}/tai-khoan-nhan-tien`, { maNganHang: "VCB", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TNHH TOUR DAO", truocDo: null }), 200, "cài tài khoản nhận tiền");
dung(await call(CHU, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: "TD101", canXacNhan: false }), 200, "tắt cờ cần xác nhận");
const dichVu = [{ kind: "catalog", catalogCode: "TD101", pickupChoice: "KHONG_DON", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, departDate: vnDate(3), legs: [] }];
const lap = async () => {
  const r = await call(DOITAC, "POST", "/api/orders", { customerName: "Khách Thử Công Nợ", customerPhone: "0903261002", customerEmail: "", customerNote: "", discount: 0, paymentNote: "", services: dichVu, passengers: [] });
  dung(r, 201, "lập đơn");
  return r.json.order;
};
const donNhap = await lap();
dung(await call(CHU, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "DOI_TAC", partyId: donNhap.bookerPartyId }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000, tuNgay: vnDate(0) }), 201, "mức riêng 10%");
const don = await lap();
dung(await call(DOITAC, "POST", `/api/orders/${don.id}/gui-don`, {}), 200, "gửi đơn (đã xác nhận)");
const GIA_DAI_LY = "2.430.000"; // 2 × 1.350.000 − 10%

const buoc = async (khung, hau) => {
  let p = await env.as(DOITAC, `/order?id=${don.id}`, khung);
  await p.waitFor(`[...document.querySelectorAll('button')].some((x) => x.innerText.trim() === 'Xem công nợ với Tour Đảo')`, "thẻ Thanh toán nạp xong");
  await b.step(`${hau}-1`, `${hau}: Đối tác thấy «Tạo biên nhận cho khách» và «Xem công nợ với Tour Đảo», không còn «Xem ảnh gửi khách» và «QR thanh toán»; không tràn ngang; không mã thô${axeNote()}`, async () => {
    assert.equal(await nut(p, "Tạo biên nhận cho khách"), true);
    assert.equal(await nut(p, "Xem ảnh gửi khách"), false);
    assert.equal(await nut(p, "QR thanh toán"), false, "QR giá bán lẻ không còn trên màn Đối tác");
    assert.equal(await p.ev(noOverflowX), true);
    assert.equal(await p.ev(noCode), "");
    await chup(p, `01-doi-tac-don-${hau}`, khung);
    await axe(p, `đơn đối tác ${hau}`);
  });
  await b.step(`${hau}-2`, `${hau}: bấm «Xem công nợ với Tour Đảo» ⇒ phiếu theo giá đại lý ${GIA_DAI_LY} ₫, có mã QR và «Lưu ảnh», nội dung chuyển khoản DL…${axeNote()}`, async () => {
    assert.equal(await bam(p, "Xem công nợ với Tour Đảo"), true);
    await p.waitFor(`!!document.querySelector('[data-khoi="phieu-cong-no"] [data-so="con-lai"]')`, "phiếu nạp xong");
    await sleep(500);
    const t = await chuTrang(p);
    assert.match(t, /Phiếu công nợ với Tour Đảo/);
    assert.match(t, new RegExp(`Tổng công nợ: ${GIA_DAI_LY.replace(/\./g, "\\.")}`));
    assert.match(t, new RegExp(`Công nợ còn lại: ${GIA_DAI_LY.replace(/\./g, "\\.")}`));
    assert.match(t, /DLTD/, "nội dung chuyển khoản có tiền tố DL");
    assert.equal(await p.ev(`!!document.querySelector('[data-khoi="phieu-cong-no"] canvas.qr-anh:not([hidden])')`), true, "có mã QR");
    assert.equal(await nut(p, "Lưu ảnh"), true);
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `02-phieu-cong-no-${hau}`, khung);
    await axe(p, `phiếu công nợ ${hau}`);
  });
  p.close();
  p = await env.as(DOITAC, `/order?id=${donNhap.id}`, khung);
  await p.waitFor(`!!document.querySelector('[data-khoi="thanh-toan"]')`, "đơn nháp nạp xong");
  await b.step(`${hau}-3`, `${hau}: đơn nháp hiện câu «Phiếu công nợ có sau khi đơn được xác nhận.», không có nút phiếu`, async () => {
    await p.waitFor(`!!document.querySelector('[data-khoi="phieu-cong-no-chua"]')`, "câu chờ xác nhận");
    assert.equal(await nut(p, "Xem công nợ với Tour Đảo"), false);
    await chup(p, `03-doi-tac-don-nhap-${hau}`, khung);
  });
  p.close();
  p = await env.as(CHU, `/order?id=${don.id}`, khung);
  await p.waitFor(`[...document.querySelectorAll('button')].some((x) => x.innerText.trim() === 'Xem công nợ với Tour Đảo')`, "trang văn phòng nạp xong");
  await b.step(`${hau}-4`, `${hau}: Toàn quyền (văn phòng) giữ chữ «Xem ảnh gửi khách» và cũng mở được phiếu công nợ${axeNote()}`, async () => {
    assert.equal(await nut(p, "Xem ảnh gửi khách"), true);
    assert.equal(await nut(p, "Tạo biên nhận cho khách"), false);
    await chup(p, `04-van-phong-don-${hau}`, khung);
    await axe(p, `đơn văn phòng ${hau}`);
  });
  p.close();
};

try {
  await buoc(MOB, "390");
  await buoc(DESK_RONG, "1280");
} finally {
  await env.stop?.();
  await env.tat?.();
}
b.xong();
