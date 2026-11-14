// Kịch bản Chrome + axe — KHOẢN NỘP CỦA ĐẠI LÝ (ADR-0182 phần B, 13/11). Hai khổ 390 và 1280. D1 local tạm; tên, SĐT, số tài khoản là GIẢ.
//   1. Đối tác gửi đơn (nhánh B) ⇒ màn đơn có câu nhắc «Đơn đã được xác nhận. Bạn có thể chuyển tiền và gửi biên lai…».
//   2. Mở «Phiếu công nợ với Tour Đảo» ⇒ có nút «Đã chuyển tiền»; bấm ⇒ biểu mẫu có số còn phải nộp, «Khách đã trả bạn 2.700.000 ₫», ô ảnh biên lai.
//   3. Gửi khi chưa chọn ảnh ⇒ câu «Chọn ảnh biên lai…», chưa ghi gì; chọn PNG ⇒ gửi được; phiếu mở lại: khoản «Chờ Kế toán xác nhận», QR ẩn, câu «Đơn đang có khoản chờ…».
//   4. Kế toán mở trang Sổ công nợ ⇒ khối «Khoản nộp chờ xác nhận (1)» có mã đơn; mở đơn ⇒ phiếu có «Xem biên lai», «Xác nhận đã nhận», «Từ chối».
//   5. Kế toán bấm «Xác nhận đã nhận» (hộp hỏi lại) ⇒ phiếu: «Kế toán đã xác nhận», Công nợ còn lại 0.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-13-khoan-nop-dai-ly node docs/evidence/2026-11-13-khoan-nop-dai-ly/kich-ban/khoan-nop-smoke.mjs
// Trang dùng chung kho cookie: mỗi trang đóng trước khi mở trang của tài khoản khác.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { deflateSync } from "node:zlib";
import { CHU, MOB, OUT, assert, axe, axeNote, boDem, dungMoiTruong, noCode, noOverflowX, sleep, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const DT = { name: "Đối Tác Khoản Nộp", phone: "0900000761", pin: "246761", permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" };
const KT = { name: "Kế Toán Khoản Nộp", phone: "0900000762", pin: "246762", permissions: ["ACCOUNTING"] };
const RONG = { width: 1280, height: 860, mobile: false };
const { env, call } = await dungMoiTruong([CHU, DT, KT]);
const b = boDem("KHOAN NOP DAI LY");
const ANH = join(OUT, "anh");
mkdirSync(ANH, { recursive: true });
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);

function pngThat() {
  const crc = (buf) => { let c = ~0; for (const x of buf) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
  const khoi = (loai, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(loai), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const w = 40, h = 20;
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h, 0x88); for (let y = 0; y < h; y++) raw[y * (w * 3 + 1)] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), khoi("IHDR", ihdr), khoi("IDAT", deflateSync(raw)), khoi("IEND", Buffer.alloc(0))]);
}
const TEP_ANH = join(mkdtempSync(join(tmpdir(), "khoan-nop-")), "bien-lai.png");
writeFileSync(TEP_ANH, pngThat());

const chup = async (p, ten, khung) => {
  await sleep(400);
  const cao = await p.ev("Math.ceil(document.documentElement.scrollHeight)");
  const dat = (h) => p.send("Emulation.setDeviceMetricsOverride", { width: khung.width, height: h, deviceScaleFactor: khung.mobile ? 2 : 1, mobile: khung.mobile });
  await dat(Math.max(khung.height, cao));
  await sleep(350);
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(ANH, `${ten}.png`), Buffer.from(r.result.data, "base64"));
  await dat(khung.height);
  await sleep(200);
};
const nut = (p, chu) => p.ev(`[...document.querySelectorAll('button')].some((x) => x.getClientRects().length > 0 && x.innerText.trim() === ${JSON.stringify(chu)})`);
const bam = (p, chu) => p.ev(`(() => { const x = [...document.querySelectorAll('button')].find((e) => e.getClientRects().length > 0 && e.innerText.trim() === ${JSON.stringify(chu)}); if (!x) return false; x.click(); return true; })()`);
const chuTrang = (p) => p.ev(`document.body.innerText.replace(/\\s+/g, ' ')`);

// Gieo: tài khoản nhận tiền công ty, dịch vụ không cần xác nhận, mức hoa hồng riêng 10% của hồ sơ đối tác (từ đơn nháp đầu tiên).
const ct = env.sql("SELECT party_id FROM v_pty_owner_company LIMIT 1")[0]?.party_id;
dung(await call(CHU, "PUT", `/api/parties/${ct}/tai-khoan-nhan-tien`, { maNganHang: "VCB", soTaiKhoan: "0011001234567", chuTaiKhoan: "CONG TY TNHH TOUR DAO", truocDo: null }), 200, "cài tài khoản nhận tiền");
dung(await call(CHU, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: "TD101", canXacNhan: false }), 200, "tắt cờ cần xác nhận");
const dichVu = [{ kind: "catalog", catalogCode: "TD101", pickupChoice: "KHONG_DON", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, departDate: vnDate(3), legs: [] }];
const lap = async () => {
  const r = await call(DT, "POST", "/api/orders", { customerName: "Khách Thử Khoản Nộp", customerPhone: "0903261003", customerEmail: "", customerNote: "", discount: 0, paymentNote: "", paymentTerm: "PREPAID", services: dichVu, passengers: [] });
  dung(r, 201, "lập đơn");
  return r.json.order;
};
const dau = await lap();
dung(await call(CHU, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "DOI_TAC", partyId: dau.bookerPartyId }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000, tuNgay: vnDate(0) }), 201, "mức riêng 10%");
const KHACH_TRA = "2.700.000";
const GIA_DAI_LY = "2.430.000";
const soNop = (id) => env.sql(`SELECT count(*) AS n FROM bil_agent_remittance WHERE order_id = '${id}'`)[0].n;

// Mỗi khổ một đơn, lập + gửi TRƯỚC khi mở trình duyệt (đăng nhập trình duyệt bằng tài khoản Đối tác đá phiên của lời gọi API — luật một máy).
// Trang đơn nhận `?gui=B` như khi biểu mẫu lập đơn chuyển tới sau «Gửi đơn».
const DON = {};
for (const hau of ["390", "1280"]) {
  DON[hau] = await lap();
  dung(await call(DT, "POST", `/api/orders/${DON[hau].id}/gui-don`, {}), 200, "gửi đơn");
}

const buoc = async (khung, hau) => {
  const don = DON[hau];
  let p = await env.as(DT, `/order?id=${don.id}&gui=B`, khung);
  await p.waitFor(`[...document.querySelectorAll('button')].some((x) => x.innerText.trim() === 'Xem công nợ với Tour Đảo')`, "thẻ Thanh toán nạp xong");
  await b.step(`${hau}-1`, `${hau}: câu nhắc sau Gửi đơn (nhánh B) có «chuyển tiền và gửi biên lai ở mục Xem công nợ với Tour Đảo»; không mã thô${axeNote()}`, async () => {
    const t = await chuTrang(p);
    assert.match(t, /Đơn đã được xác nhận\. Bạn có thể chuyển tiền và gửi biên lai ở mục Xem công nợ với Tour Đảo\./);
    assert.equal(await p.ev(noCode), "");
    await chup(p, `01-nhac-sau-gui-don-${hau}`, khung);
    await axe(p, `đơn đối tác sau gửi ${hau}`);
  });
  await b.step(`${hau}-2`, `${hau}: phiếu có «Đã chuyển tiền»; biểu mẫu có số còn phải nộp ${GIA_DAI_LY} ₫, «Khách đã trả bạn ${KHACH_TRA} ₫», ô ảnh biên lai${axeNote()}`, async () => {
    assert.equal(await bam(p, "Xem công nợ với Tour Đảo"), true);
    await p.waitFor(`!!document.querySelector('[data-action="da-chuyen-tien"]')`, "nút Đã chuyển tiền");
    await p.ev(`document.querySelector('[data-action="da-chuyen-tien"]').click(), true`);
    await p.waitFor(`!!document.querySelector('[data-khoi="form-nop"]')`, "biểu mẫu khoản nộp");
    const t = await chuTrang(p);
    assert.match(t, new RegExp(`còn phải nộp ${GIA_DAI_LY.replace(/\./g, "\\.")}`));
    assert.match(t, new RegExp(`Khách đã trả bạn ${KHACH_TRA.replace(/\./g, "\\.")}`));
    assert.equal(await p.ev(`!!document.querySelector('#nop-bien-lai')`), true);
    assert.equal(await p.ev(`getComputedStyle(document.querySelector('#nop-so-tien')).fontSize`), "16px", "ô gõ 16px");
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `02-bieu-mau-nop-${hau}`, khung);
    await axe(p, `biểu mẫu khoản nộp ${hau}`);
  });
  await b.step(`${hau}-3`, `${hau}: gửi khi chưa chọn ảnh ⇒ câu «Chọn ảnh biên lai…», chưa ghi; chọn PNG ⇒ gửi được, phiếu mở lại có khoản «Chờ Kế toán xác nhận», QR ẩn${axeNote()}`, async () => {
    await p.ev(`document.querySelector('[data-action="da-chuyen-tien-gui"]').click(), true`);
    await sleep(500);
    assert.equal(await p.ev(`document.body.innerText.includes('Chọn ảnh biên lai chuyển khoản trước khi gửi')`), true);
    assert.equal(soNop(don.id), 0);
    const doc = await p.send("DOM.getDocument", { depth: -1 });
    const q = await p.send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: "#nop-bien-lai" });
    await p.send("DOM.setFileInputFiles", { nodeId: q.result.nodeId, files: [TEP_ANH] });
    await p.ev(`document.querySelector('[data-action="da-chuyen-tien-gui"]').click(), true`);
    await p.waitFor(`!!document.querySelector('[data-khoan-nop][data-trang-thai="PENDING"]')`, "phiếu mở lại có khoản chờ", 15000);
    assert.equal(soNop(don.id), 1);
    const t = await chuTrang(p);
    assert.match(t, /Chờ Kế toán xác nhận/);
    assert.match(t, /Đơn đang có khoản chờ Kế toán xác nhận\./);
    assert.equal(await p.ev(`!!document.querySelector('[data-khoi="phieu-cong-no"] canvas.qr-anh:not([hidden])')`), false, "QR ẩn khi có khoản chờ");
    assert.equal(await nut(p, "Đã chuyển tiền"), false, "không gửi thêm khi đang có khoản chờ");
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `03-khoan-cho-${hau}`, khung);
    await axe(p, `phiếu có khoản chờ ${hau}`);
  });
  p.close();
  p = await env.as(KT, "/so-cong-no", khung);
  await p.waitFor(`!!document.querySelector('[data-khoi="khoan-nop-cho"]:not([hidden])')`, "khối khoản nộp chờ ở Sổ công nợ");
  await b.step(`${hau}-4`, `${hau}: Kế toán — Sổ công nợ có khối «Khoản nộp chờ xác nhận» với mã đơn${axeNote()}`, async () => {
    const t = await chuTrang(p);
    assert.match(t, /Khoản nộp chờ xác nhận \(\d+\)/);
    assert.match(t, new RegExp(don.orderCode));
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `04-so-cong-no-cho-${hau}`, khung);
    await axe(p, `Sổ công nợ ${hau}`);
  });
  p.close();
  p = await env.as(KT, `/order?id=${don.id}`, khung);
  await p.waitFor(`[...document.querySelectorAll('button')].some((x) => x.innerText.trim() === 'Xem công nợ với Tour Đảo')`, "đơn của Kế toán nạp xong");
  await b.step(`${hau}-5`, `${hau}: Kế toán mở phiếu ⇒ «Xem biên lai», «Xác nhận đã nhận», «Từ chối»; xác nhận (hỏi lại trong dòng) ⇒ «Kế toán đã xác nhận», Công nợ còn lại 0${axeNote()}`, async () => {
    assert.equal(await bam(p, "Xem công nợ với Tour Đảo"), true);
    await p.waitFor(`!!document.querySelector('[data-action="xac-nhan-nop"]')`, "nút xác nhận khoản nộp");
    assert.equal(await p.ev(`!!document.querySelector('[data-action="xem-bien-lai-nop"]')`), true);
    assert.equal(await nut(p, "Từ chối"), true);
    await chup(p, `05-ke-toan-phieu-${hau}`, khung);
    await axe(p, `phiếu của Kế toán ${hau}`);
    await p.ev(`document.querySelector('[data-action="xac-nhan-nop"]').click(), true`);
    await sleep(400);
    // Hỏi lại ngay trong dòng khoản nộp (phiếu đã là bảng trượt): hàng xác nhận có nút «Xác nhận đã nhận» thứ hai.
    await p.waitFor(`!!document.querySelector('[data-action="xac-nhan-nop-chac"]')`, "hàng hỏi lại");
    await chup(p, `05b-hoi-lai-${hau}`, khung);
    await p.ev(`document.querySelector('[data-action="xac-nhan-nop-chac"]').click(), true`);
    await p.waitFor(`!!document.querySelector('[data-khoan-nop][data-trang-thai="CONFIRMED"]')`, "khoản đã xác nhận", 15000);
    const t = await chuTrang(p);
    assert.match(t, /Kế toán đã xác nhận/);
    assert.match(t, /Công nợ còn lại: 0/);
    await chup(p, `06-da-xac-nhan-${hau}`, khung);
  });
  p.close();
};

try {
  await buoc(MOB, "390");
  await buoc(RONG, "1280");
} finally {
  await env.stop?.();
  await env.tat?.();
}
b.xong();
