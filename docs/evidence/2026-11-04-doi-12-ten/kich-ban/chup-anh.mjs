// Ảnh thật các màn đổi hình dạng sau khi đổi 12 tên nút (ADR-0166): chủ xem trước khi nhập. Chrome thật, D1 tạm, dữ liệu đi đường thật qua route. Mọi tên, SĐT là GIẢ.
// Chỉ chụp, không kiểm hành vi: hành vi do `src/**/*.test.ts` và các kịch bản khác canh. Tìm nút theo CHỮ để ảnh đỏ ngay khi chữ lệch.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   OUT=docs/evidence/2026-11-04-doi-12-ten CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-11-04-doi-12-ten/kich-ban/chup-anh.mjs
import { ACCOUNTS, CHU, MOB, assert, click, dungMoiTruong, shotView, sleep, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const MAY = { width: 1280, height: 800, mobile: false };
const KHO = [["390", MOB], ["1280", MAY]];
const { env, call } = await dungMoiTruong([CHU]);
const ngay = vnDate(3);
const dung = (r, ma, viec) => { assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`); return r.json; };
const lap = async (ma) => dung(await call(ACCOUNTS.salesA, "POST", "/api/orders", {
  customerName: "Khách Thử Ảnh", customerPhone: "0903 261 001", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
  services: [{ kind: "catalog", catalogCode: ma, pickupChoice: "KHONG_DON", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: ma === "TD101" ? 1350000 : 800000 }, serviceDate: ngay }],
  passengers: [],
}), 201, `lập đơn ${ma}`).order.id;
const nutChu = (chu, pham = "body") => `[...document.querySelectorAll(${JSON.stringify(pham + " button, " + pham + " a")})].find((x) => x.getClientRects().length > 0 && x.textContent.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(chu)})`;
const coNut = (chu, pham) => `!!${nutChu(chu, pham)}`;
const bam = async (p, chu, pham) => assert.equal(await p.ev(`(() => { const e = ${nutChu(chu, pham)}; if (!e) return false; e.click(); return true; })()`), true, `nút «${chu}»`);
const cuonToi = (p, chu) => p.ev(`(() => { const e = ${nutChu(chu)}; if (!e) return false; e.scrollIntoView({ block: 'center' }); return true; })()`);
const anh = (ten) => `${ten}.png`;

try {
  const cap = dung(await call(ACCOUNTS.accounting, "POST", "/api/pricing/muc-ta", { ten: "Cấp Vàng" }), 201, "cấp").muc.code;
  dung(await call(CHU, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: "TD101", canXacNhan: true }), 200, "cờ cần xác nhận");
  // Một dịch vụ khác hai dịch vụ lập đơn: vừa ghi đè giá vừa ngừng bán, để cả ba nút mới cùng hiện trên dòng.
  const dsDv = dung(await call(ACCOUNTS.admin, "GET", "/api/catalog/admin"), 200, "danh mục quản trị").items;
  const dv = dsDv.find((x) => x.code !== "TD101" && x.code !== "TTB06");
  assert.ok(dv, "có dịch vụ thứ ba");
  dung(await call(ACCOUNTS.admin, "PATCH", `/api/catalog/${encodeURIComponent(dv.code)}`, { prices: { adult: 999000 }, hidden: true }), 200, `ghi đè giá + ngừng bán ${dv.code}`);

  // Lập đơn TRƯỚC khi mở trang: đăng nhập lại trong trình duyệt làm phiên của `call` hết hiệu lực.
  const donTheoKho = {};
  for (const [kho] of KHO) donTheoKho[kho] = { dS: await lap("TD101"), dG: await lap("TD101"), dT: await lap("TTB06") };

  for (const [kho, khung] of KHO) {
    // Câu 1: hai nút ở chi tiết cấp, hộp của từng nút.
    let p = await env.as(ACCOUNTS.accounting, "/hoa-hong", khung);
    await p.waitFor("!!document.querySelector('#hh-the-cap .hh-cap')", "trang Hoa hồng", 15000);
    await p.ev(`(() => { const b = [...document.querySelectorAll('[data-chon-cap="${cap}"]')].find((x) => x.offsetParent !== null); b.click(); return true; })()`);
    await p.waitFor(`!!document.querySelector('#hh-cap-ct[data-cap="${cap}"]')`, "chi tiết cấp");
    await p.waitFor(coNut("Gán cho đối tác", "#hh-cap-ct"), "nút Gán cho đối tác");
    await cuonToi(p, "Gán cho đối tác");
    await shotView(p, anh(`cau-1-hai-nut-${kho}`));
    await bam(p, "Gán cho đối tác", "#hh-cap-ct");
    await p.waitFor("!!document.querySelector('.sheet')", "hộp cấp riêng");
    await shotView(p, anh(`cau-1-hop-gan-doi-tac-${kho}`));
    p.close();

    // Câu 2, 12: dòng vừa ngừng bán vừa ghi đè giá. Chỉ lọc «Đang ghi đè giá» để dòng đó nằm trong khung.
    p = await env.as(ACCOUNTS.admin, "/catalog", khung);
    await p.waitFor(coNut("Bỏ ghi đè giá"), "nút Bỏ ghi đè giá", 15000);
    await cuonToi(p, "Bỏ ghi đè giá");
    await shotView(p, anh(`cau-2-12-dich-vu-${kho}`));
    p.close();

    // Câu 5: nút lưu ở form; câu 8: Gửi kiểm vé; câu 5: hộp ảnh.
    const { dS, dG, dT } = donTheoKho[kho];
    p = await env.as(ACCOUNTS.salesA, "/order-form", khung);
    await p.waitFor("!!document.getElementById('save')", "form lập đơn", 15000);
    await sleep(600);
    await p.ev("document.getElementById('save').scrollIntoView({ block: 'center' }), true");
    await shotView(p, anh(`cau-5-nut-luu-${kho}`));
    await p.send("Page.navigate", { url: `${env.base}/order?id=${dS}` });
    await p.waitFor(coNut("Gửi kiểm vé"), "nút Gửi kiểm vé", 15000);
    await cuonToi(p, "Gửi kiểm vé");
    await shotView(p, anh(`cau-8-gui-kiem-ve-${kho}`));
    await p.send("Page.navigate", { url: `${env.base}/order?id=${dT}` });
    await p.waitFor(coNut("Xem biên nhận"), "nút Xem biên nhận", 15000);
    await bam(p, "Xem biên nhận");
    await p.waitFor("!!document.getElementById('confirm-sheet-title')", "hộp ảnh");
    await sleep(800);
    await shotView(p, anh(`cau-5-hop-anh-${kho}`));
    await p.send("Page.navigate", { url: `${env.base}/order?id=${dG}` });
    await p.waitFor(coNut("Gửi kiểm vé"), "nút Gửi kiểm vé (đơn sẽ gửi)", 15000);
    await bam(p, "Gửi kiểm vé");
    await p.waitFor(`!!document.querySelector('[data-khoi="cho-xac-nhan"]')`, "đơn đã gửi kiểm vé");
    // Câu 5: danh sách của người lập phân biệt đơn chưa gửi và đơn đang chờ người kiểm vé.
    await p.send("Page.navigate", { url: `${env.base}/orders` });
    await p.waitFor("document.querySelectorAll('main .badge-draft').length >= 2", "danh sách đơn", 15000);
    const nhanDon = await p.ev("[...document.querySelectorAll('main .badge-draft')].map((x) => x.textContent.trim())");
    assert.ok(nhanDon.includes("Chưa xác nhận") && nhanDon.includes("Chờ xác nhận"), `danh sách phải có cả hai nhãn: ${nhanDon.join(", ")}`);
    await shotView(p, anh(`cau-5-danh-sach-${kho}`));
    p.close();

    // Câu 4: bảng quyết định và hộp hỏi lại. Chỉ mở hộp, không bấm xác nhận.
    p = await env.as(ACCOUNTS.accounting, `/order?id=${dG}`, khung);
    await p.waitFor(`!!document.querySelector('[data-action="quyet-dinh-con-ve"]')`, "bảng quyết định", 15000);
    await p.ev(`document.querySelector('[data-action="quyet-dinh-con-ve"]').scrollIntoView({ block: 'center' }), true`);
    // Khối quyết định phải trải hết bề ngang thanh công cụ: lưới hai cột của điện thoại từng ép nó vào một cột, chữ tràn khỏi viền.
    assert.equal(await p.ev("(() => { const k = document.querySelector('.cx-bang').getBoundingClientRect().width; const t = document.getElementById('actions').getBoundingClientRect().width; return Math.abs(k - t) <= 1 || innerWidth > 640; })()"), true, `khối Xác nhận đơn hẹp hơn thanh công cụ ở khổ ${kho}`);
    await shotView(p, anh(`cau-4-bang-${kho}`));
    await p.ev(click('[data-action="quyet-dinh-con-ve"]'));
    await p.waitFor("!!document.querySelector('.sheet-foot-xac-nhan .btn-danger')", "hộp hỏi lại");
    await shotView(p, anh(`cau-4-hop-${kho}`));
    p.close();
    console.log(`✓ xong khổ ${kho}`);
  }
  console.log("ĐÃ CHỤP");
} catch (e) {
  console.error("LỖI:", e?.stack ?? e);
  process.exitCode = 1;
} finally {
  await env.stop();
}
