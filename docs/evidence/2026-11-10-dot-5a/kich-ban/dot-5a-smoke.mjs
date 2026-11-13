// Kịch bản Chrome Đợt 5A (kế hoạch docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md, Task 5A.4): ADR-0191 (PIN đầu của tài khoản xem mọi khách do Nhân sự tạo
// thì Quản trị cấp) và ADR-0192 (giữ chữ đã gõ ở form đơn khi hết phiên, bản chụp tạm trong sessionStorage). Kiểm bằng ảnh thật, không sửa mã sản phẩm.
//   1  Nhân sự (chỉ HR) tạo tài khoản Bán hàng trên màn Quản lý tài khoản (bấm thật): hộp «Tài khoản mới» hiện câu chờ Quản trị cấp PIN, không PIN, không chữ "null". 390 + 1280
//      (hai tài khoản, vì hộp mất khi tải lại). Ca API: Nhân sự gán thêm vai Bán hàng cho tài khoản Tài xế công ty ⇒ 403, vai không đổi.
//   2  Quản trị bấm «Đặt lại PIN» ở tài khoản đó (1280 rồi 390, không tải lại) → hộp PIN mới; PIN sau cùng đăng nhập được qua API, PIN trước đó thì không.
//   3  Bán hàng gõ form lập đơn (tên khách, SĐT, ghi chú khách, một dịch vụ) → xoá cookie bằng CDP → bấm Lưu → về /login (bản chụp có trong sessionStorage, không có ở
//      localStorage) → đăng nhập lại CÙNG NGƯỜI qua giao diện đăng nhập, TRÊN CÙNG THẺ (sessionStorage theo thẻ) → về form, chữ còn, kho hết khoá td-nhap-don:*. 390 + 1280.
//      3E: sửa đơn có sẵn (/order-form?id=…) cùng chu trình ⇒ chữ đã sửa còn; 3F đối chứng: mở sửa đơn bình thường ⇒ nạp đúng dữ liệu máy chủ (bản sửa chưa lưu không lọt).
//   4  hết phiên giữa form rồi NGƯỜI KHÁC đăng nhập cùng thẻ: form trống; kho không còn khoá của người trước (phần dọn ở initShell, commit 479ea519a). 390 + 1280.
//   5  Đối tác bấm «Gửi đơn»: lời gọi lưu thành công, lời gọi gửi (…/gui-don) bị giữ lại trong trang cho tới khi xoá xong cookie (CDP) ⇒ máy chủ trả 401 → /login →
//      đăng nhập lại → về trang đơn đã tạo (/order?id=…&guiloi=1), không mở lại form; danh sách đơn của Đối tác không có đơn trùng; đơn vẫn là nháp. 390 + 1280.
//   6  6a có bản chụp (hết phiên như cảnh 3), đăng nhập lại cùng người nhưng vào /orders trước ⇒ khoá của chính mình CÒN (trong hạn); 6b bấm «Đăng xuất» ở trang Tôi ⇒
//      kho hết khoá; 6c đặt tay khoá của chính mình chụp 31 phút trước + khoá mới của người khác, đăng nhập, mở /orders ⇒ initShell xoá cả hai.
// Cách giữ lời gọi gửi: `openPage` của a2-cdp.mjs không nhận sự kiện CDP Fetch.requestPaused (bộ nghe chỉ giữ vài loại sự kiện, cổng CDP không lộ ra), nên kịch bản
//   bọc `window.fetch` của trang: lời gọi tới …/gui-don chờ cờ `__tha`; Node thấy cờ `__cho` thì Network.clearBrowserCookies rồi bật `__tha` — cookie gắn lúc gửi thật nên
//   lời gọi đi KHÔNG có cookie (tương đương xoá cookie ngay sau khi lưu thành công). Bằng chứng máy chủ trả 401: về /login, bản chụp loại «da-tao», đơn vẫn nháp.
// Kho cookie chung + một phiên mỗi tài khoản (ADR-0075): dựng dữ liệu bằng API TRƯỚC khi mở trang; thứ tự trang Nhân sự → Quản trị → Bán hàng → Đối tác → Bán hàng (cảnh 4, 6).
// Chạy từ GỐC repo (worktree), sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe-core/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-10-dot-5a node docs/evidence/2026-11-10-dot-5a/kich-ban/dot-5a-smoke.mjs
//   Thiếu AXE_JS thì bỏ qua kiểm màu (in ghi chú).
// Mọi tên, SĐT ở đây là GIẢ (SĐT 0900000951–0900000969).
process.env.OUT ??= "docs/evidence/2026-11-10-dot-5a";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, OUT, apiCalls, assert, axe, axeNote, boDem, click, dungMoiTruong, fetchTrang, noCode, noOverflowX, sleep, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
import { CAU_CHO_QUAN_TRI_CAP_PIN, CAU_VAI_XEM_KHACH_NHO_QUAN_TRI } from "../../../../src/shared/xem-moi-khach.ts";
import { TIEN_TO_NHAP_TAM } from "../../../../src/shared/nhap-tam-don.ts";
import { cauLoiGuiDon } from "../../../../src/shared/xac-nhan-hien-thi.ts";
import { HOP_HOI_TU_DONG } from "../../2026-11-13-buoc-1-khung-chung/kich-ban/hop-hoi-tu-dong.mjs"; // bước 1 khung chung 13/11: trả lời hộp hỏi trong trang (thay confirm() của trình duyệt)

const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1280, height: 820, mobile: false };
const NHAN_SU = { name: "Nhân Sự Năm A", phone: "0900000951", pin: "246951", permissions: ["HR"] };
const DOITAC = { name: "Đối Tác Năm A", phone: "0900000952", pin: "246952", permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" };
const BH1 = { name: "Bán Hàng Năm A Một", phone: "0900000953", pin: "246953", permissions: ["SALES"] };
const BH2 = { name: "Bán Hàng Năm A Hai", phone: "0900000954", pin: "246954", permissions: ["SALES"] };
const MOI_390 = { ten: "Bán Hàng Mới Năm A", sdt: "0900000955" };
const MOI_1280 = { ten: "Bán Hàng Mới Năm B", sdt: "0900000956" };
const TAI_XE = { ten: "Tài Xế Năm A", sdt: "0900000957" };
const DON_CO_SAN = { ten: "Khách Đơn Có Sẵn", sdt: "0900 000 960", note: "Ghi chú gốc của đơn có sẵn" };

const { env, call } = await dungMoiTruong([NHAN_SU, DOITAC, BH1, BH2]);
const b = boDem("DOT 5A (ADR-0191, ADR-0192)");
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const idCua = (phone) => env.sql(`SELECT id FROM staff WHERE phone = '${phone}'`)[0].id;

// ---- Dựng dữ liệu bằng API (trước khi mở trang của đúng tài khoản) ----------------------------------------------------------------------------------------
let dungXong = false;
let ID_TAI_XE, ID_DON;
const ketQuaApi = {};
try {
  // Nhân sự tạo Tài xế công ty (không xem khách) ⇒ vẫn nhận PIN; rồi gán thêm vai Bán hàng ⇒ 403 (ADR-0191 mục 3a).
  const tx = await call(NHAN_SU, "POST", "/api/staff", { taoHoSoMoi: true, fullName: TAI_XE.ten, phone: TAI_XE.sdt, roles: ["DRIVER_INTERNAL"] });
  dung(tx, 201, "Nhân sự tạo tài xế");
  ketQuaApi.taiXeCoPin = typeof tx.json.pin === "string" && /^\d{6}$/.test(tx.json.pin);
  ID_TAI_XE = tx.json.staff.id;
  const ganVai = await call(NHAN_SU, "PUT", `/api/staff/${ID_TAI_XE}/roles`, { roles: ["DRIVER_INTERNAL", "SALES_STAFF"] });
  ketQuaApi.gan = { status: ganVai.status, message: ganVai.json?.error?.message ?? null };
  ketQuaApi.vaiSau = env.sql(`SELECT permission_type_code AS ma FROM stf_permission WHERE staff_id = '${ID_TAI_XE}' AND valid_to_at IS NULL ORDER BY 1`).map((r) => r.ma);
  // Đơn nháp có sẵn của Bán hàng 1 (cho ca sửa đơn 3E / 3F).
  const don = await call(BH1, "POST", "/api/orders", {
    customerName: DON_CO_SAN.ten, customerPhone: DON_CO_SAN.sdt, customerEmail: "", customerNote: DON_CO_SAN.note, discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "catalog", catalogCode: "TD101", pickupChoice: "KHONG_DON", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, departDate: vnDate(8), departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", legs: [] }],
  });
  dung(don, 201, "đơn nháp có sẵn");
  ID_DON = don.json.order.id;
  dungXong = true;
} catch (e) {
  console.log(`✗ dựng dữ liệu hỏng — không chạy bước nào:\n    ${String(e?.stack ?? e).split("\n").slice(0, 10).join("\n    ")}`);
  process.exitCode = 1;
}

// ---- Tiện ích ------------------------------------------------------------------------------------------------------------------------------------------------
/** Ảnh cả trang: kéo khung nhìn cao bằng trang rồi chụp, xong trả khung cũ (khuôn dot-2-smoke). */
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
/** Đổi khổ KHÔNG tải lại (giữ hộp đang mở). */
const doiKhoGiuTrang = async (p, khung) => {
  await p.send("Emulation.setDeviceMetricsOverride", { width: khung.width, height: khung.height, deviceScaleFactor: khung.mobile ? 2 : 1, mobile: khung.mobile });
  await p.send("Emulation.setTouchEmulationEnabled", { enabled: khung.mobile });
  await sleep(300);
};
const gan = (sel, v) => `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`;
const giaTri = (sel) => `document.querySelector(${JSON.stringify(sel)})?.value ?? null`;
const KHOA_PHIEN = `Object.keys(sessionStorage).filter((k) => k.startsWith(${JSON.stringify(TIEN_TO_NHAP_TAM)}))`;
const KHOA_LOCAL = `Object.keys(localStorage).filter((k) => k.startsWith(${JSON.stringify(TIEN_TO_NHAP_TAM)}))`;
const docBan = (staffId) => `(() => { const r = sessionStorage.getItem(${JSON.stringify(TIEN_TO_NHAP_TAM)} + ${JSON.stringify(staffId)}); if (r === null) return null; try { const o = JSON.parse(r); return { loai: o.loai, staffId: o.staffId, orderId: o.orderId ?? null, coO: !!o.o }; } catch { return 'hong'; } })()`;
const CARDS = "document.querySelectorAll('#services .svc')";
const adultCounter = `${CARDS}[0]?.querySelector('.counter-field[aria-label="Người lớn"]')`;

/** Chọn dịch vụ danh mục theo mã (ô tìm chỉ vẽ lại khi focus / gõ → gõ lại mỗi lần thăm dò). */
async function chonDichVu(p, ma) {
  const truoc = await p.ev(`${CARDS}.length`);
  const end = Date.now() + 15000;
  for (;;) {
    await p.ev("document.getElementById('catalog-q')?.focus(); true");
    await p.ev(gan("#catalog-q", ma));
    await sleep(250);
    if (await p.ev(`document.querySelectorAll('#catalog-list .catalog-pick').length === 1`)) break;
    if (Date.now() > end) throw new Error(`không thấy dịch vụ ${ma} trong ô tìm`);
  }
  await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
  await p.waitFor(`${CARDS}.length === ${truoc + 1}`, `thẻ dịch vụ ${ma}`, 10000);
}
/** Điền form lập đơn (văn phòng hoặc Đối tác): ô khách nếu đang hiện, ngày, một dịch vụ, 2 người lớn, «Không đón» nếu dịch vụ đòi chọn. */
async function dienForm(p, { ten, sdt, note, ngay }) {
  await p.waitFor("!!document.getElementById('catalog-q')", "form đơn đã dựng", 15000);
  await p.ev(gan("#orderDate", ngay));
  const coKhach = await p.ev("document.getElementById('customerName').getClientRects().length > 0");
  if (coKhach) {
    await p.ev(gan("#customerName", ten));
    await p.ev(gan("#customerPhone", sdt));
    await p.ev(gan("#customerNote", note));
  }
  await chonDichVu(p, "TD101");
  if (await p.ev(`!!(${adultCounter})`)) await p.ev(`(() => { const el = ${adultCounter}; el.value = '2'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await p.ev(click('[data-action="chon-khong-don"]'));
  await sleep(300);
  return coKhach;
}
/** Bấm Lưu (hoặc Gửi đơn) và chờ về /login; form bị chặn ở trình duyệt thì ném lỗi kèm câu báo. */
async function luuVaChoLogin(p, ms = 15000) {
  await p.ev("document.getElementById('save').click(); true");
  const end = Date.now() + ms;
  for (;;) {
    if (await p.ev("location.pathname === '/login'").catch(() => false)) break;
    const loi = await p.ev("(() => { const e = document.getElementById('save-error'); return e && !e.hidden ? e.innerText : null; })()").catch(() => null);
    if (loi) throw new Error(`Lưu bị chặn ở trình duyệt / máy chủ: ${loi}`);
    if (Date.now() > end) throw new Error(`hết giờ chờ về /login (đang ở ${await p.ev("location.href").catch(() => "?")})`);
    await sleep(150);
  }
  await p.waitFor("document.readyState === 'complete' && !!document.getElementById('login-form')", "trang đăng nhập đã tải");
}
/** Đăng nhập qua GIAO DIỆN trên CÙNG thẻ (sessionStorage theo thẻ). Lời mời Face ID (nếu có) → «Để sau». Bước hai lớp ⇒ ném lỗi (không mong đợi). */
async function dangNhapGiaoDien(p, acct) {
  // Nút Đăng nhập chỉ bật khi đã biết cấu hình VÀ hai ô hợp lệ (syncSubmit ở web/login.ts) → gõ trước rồi mới chờ.
  await p.waitFor("!!document.getElementById('phone') && !!document.getElementById('pin')", "ô đăng nhập", 10000);
  await p.ev(gan("#phone", acct.phone));
  await p.ev(gan("#pin", acct.pin));
  await p.waitFor("!document.getElementById('submit').disabled", "nút Đăng nhập bật sau khi gõ", 10000);
  await p.ev("document.getElementById('login-form').requestSubmit(); true");
  const end = Date.now() + 15000;
  for (;;) {
    const o = await p.ev("({ path: location.pathname, loi: (() => { const e = document.getElementById('error'); return e && !e.hidden ? e.innerText : null; })(), moi: !!document.getElementById('passkey-invite') && !document.getElementById('passkey-invite').hidden, haiLop: !!document.querySelector('#login-form[hidden]') })").catch(() => ({ path: "?" }));
    if (o.path && o.path !== "/login" && o.path !== "?") return;
    if (o.loi) throw new Error(`đăng nhập giao diện lỗi: ${o.loi}`);
    if (o.moi) { await p.ev("(() => { const x = [...document.querySelectorAll('#passkey-invite button')].find((b) => b.textContent.trim() === 'Để sau'); x?.click(); return true; })()"); }
    else if (o.haiLop) throw new Error("đăng nhập đòi bước hai lớp — không mong đợi ở tài khoản thử");
    if (Date.now() > end) throw new Error("hết giờ chờ rời /login sau đăng nhập");
    await sleep(150);
  }
}

const ID_BH1 = dungXong ? idCua(BH1.phone) : null;
const ID_DT = dungXong ? idCua(DOITAC.phone) : null;
const tom = {}; // tóm tắt in cuối

try {
if (dungXong) {
  try {
    // ==== Cảnh 1: Nhân sự tạo tài khoản Bán hàng =================================================================================================================
    await b.step("1-api", "Nhân sự tạo Tài xế công ty (API) ⇒ nhận PIN; gán thêm vai Bán hàng ⇒ 403 đúng câu, quyền tài xế không đổi", async () => {
      assert.equal(ketQuaApi.taiXeCoPin, true, "tài khoản không xem khách vẫn nhận PIN");
      assert.deepEqual(ketQuaApi.gan, { status: 403, message: CAU_VAI_XEM_KHACH_NHO_QUAN_TRI });
      assert.deepEqual(ketQuaApi.vaiSau, ["DRIVER"], "quyền sau lần gán bị chặn vẫn chỉ Tài xế");
    });
    const box = (code) => `document.querySelector('#add-perms input[type=checkbox][data-kind=role][value=${code}]')`;
    const taoQuaGiaoDien = async (p, moi) => {
      await p.waitFor(`!!${box("SALES_STAFF")}`, "khối chọn vai đã dựng", 15000);
      if (!(await p.ev(`${box("SALES_STAFF")}.checked`))) await p.ev(`${box("SALES_STAFF")}.click(), true`);
      await p.ev(gan("#add-name", moi.ten));
      await p.ev(gan("#add-phone", moi.sdt));
      await sleep(900); // tra hồ sơ khớp sau 300 ms ngừng gõ (khuôn vai-smoke)
      await p.ev("(() => { const k = document.querySelector('#add-khop'); const c = k && !k.hidden ? k.querySelector('label.check input') : null; if (c && !c.checked) c.click(); return true; })()");
      await p.ev("document.querySelector('#add-form button[type=submit]').click(), true");
      await p.waitFor("!document.querySelector('#secret').hidden", "hộp «Tài khoản mới» hiện", 12000);
      await p.waitFor(`[...document.querySelectorAll('#list tr, #list-cards .card')].some((x) => x.textContent.includes(${JSON.stringify(moi.ten)}))`, "danh sách có tài khoản mới", 10000);
    };
    const kiemHop = async (p, moi) => {
      const t = await p.ev("document.querySelector('#secret').innerText");
      assert.ok(t.includes(CAU_CHO_QUAN_TRI_CAP_PIN), `hộp phải có câu chờ Quản trị cấp PIN: ${t}`);
      assert.ok(t.includes(moi.ten) && t.includes(moi.sdt), "hộp nêu tên và SĐT tài khoản mới");
      assert.equal(await p.ev("document.querySelector('#secret td.pin') === null"), true, "không có ô PIN");
      assert.ok(!/(^|\D)\d{6}(\D|$)/.test(t), `hộp không được có dãy 6 số (PIN): ${t}`);
      assert.ok(!/null|undefined|NaN/.test(t), `hộp lộ chữ kỹ thuật: ${t}`);
      assert.equal(await p.ev(noCode), "", "trang không lộ mã kỹ thuật / null");
      const [row] = env.sql(`SELECT s.id, (SELECT group_concat(permission_type_code) FROM stf_permission p WHERE p.staff_id = s.id AND p.valid_to_at IS NULL) AS q FROM staff s WHERE s.phone = '${moi.sdt}'`);
      assert.ok(row && /SALES/.test(row.q), `D1: tài khoản đã tạo, có quyền Bán hàng (${JSON.stringify(row)})`);
    };
    let p = await env.as(NHAN_SU, "/staff", MOB);
    await b.step("1a", `390 Nhân sự tạo tài khoản Bán hàng trên giao diện: hộp hiện câu chờ Quản trị cấp PIN, không PIN, không "null"${axeNote()}`, async () => {
      await taoQuaGiaoDien(p, MOI_390);
      await kiemHop(p, MOI_390);
      assert.equal(await p.ev(noOverflowX), true, "390 không tràn ngang");
      await p.ev("document.querySelector('#secret').scrollIntoView({ block: 'start' }); true");
      await chup(p, "1a-nhan-su-cho-cap-pin-390", MOB);
      await axe(p, "Nhân sự chờ cấp PIN 390");
    });
    await b.step("1b", `1280 Nhân sự tạo tài khoản Bán hàng thứ hai: cùng hộp chờ cấp PIN${axeNote()}`, async () => {
      await p.send("Emulation.setDeviceMetricsOverride", { width: DESK.width, height: DESK.height, deviceScaleFactor: 1, mobile: false });
      await p.send("Emulation.setTouchEmulationEnabled", { enabled: false });
      await p.send("Page.reload", {});
      await sleep(400);
      await p.waitFor("document.readyState === 'complete'", "tải lại 1280");
      await taoQuaGiaoDien(p, MOI_1280);
      await kiemHop(p, MOI_1280);
      assert.equal(await p.ev(noOverflowX), true, "1280 không tràn ngang");
      await chup(p, "1b-nhan-su-cho-cap-pin-1280", DESK);
      await axe(p, "Nhân sự chờ cấp PIN 1280");
    });
    p.close();

    // ==== Cảnh 2: Quản trị đặt lại PIN =========================================================================================================================
    p = await env.as(ACCOUNTS.admin, "/staff", DESK);
    await p.ev(HOP_HOI_TU_DONG); // bước 1 khung chung 13/11: hộp hỏi trong trang thay confirm()
    await p.ev("window.confirm = () => true; true"); // confirm() gốc của Chrome headless làm treo Runtime.evaluate
    const datLaiPin = async (vung, cu) => {
      await p.waitFor(`[...document.querySelectorAll(${JSON.stringify(vung)})].some((x) => x.textContent.includes(${JSON.stringify(MOI_390.ten)}) && [...x.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Đặt lại PIN'))`, `nút Đặt lại PIN ở ${vung}`, 12000);
      await p.ev(`[...[...document.querySelectorAll(${JSON.stringify(vung)})].find((x) => x.textContent.includes(${JSON.stringify(MOI_390.ten)})).querySelectorAll('button')].find((b) => b.textContent.trim() === 'Đặt lại PIN').click(), true`);
      await p.waitFor(`!document.querySelector('#secret').hidden && !!document.querySelector('#secret td.pin') && document.querySelector('#secret td.pin').textContent.trim() !== ${JSON.stringify(cu ?? "")}`, "hộp PIN mới", 12000);
      return p.ev("document.querySelector('#secret td.pin').textContent.trim()");
    };
    let pin1, pin2;
    await b.step("2a", `1280 Quản trị bấm «Đặt lại PIN» ở tài khoản Nhân sự vừa tạo → hộp «PIN mới» có PIN 6 số${axeNote()}`, async () => {
      pin1 = await datLaiPin("#list tr");
      assert.match(pin1, /^\d{6}$/);
      assert.ok((await p.ev("document.querySelector('#secret').innerText")).includes(MOI_390.sdt));
      await p.ev("document.querySelector('#secret').scrollIntoView({ block: 'start' }); true");
      await chup(p, "2a-quan-tri-pin-moi-1280", DESK);
      await axe(p, "Quản trị PIN mới 1280");
    });
    await b.step("2b", `390 (đổi khổ không tải lại) Quản trị đặt lại PIN lần nữa ở thẻ điện thoại → PIN mới khác${axeNote()}`, async () => {
      await p.ev(`[...document.querySelectorAll('#secret button')].find((b) => b.textContent.trim() === 'Đã ghi lại, ẩn đi')?.click(); true`);
      await doiKhoGiuTrang(p, MOB);
      pin2 = await datLaiPin("#list-cards .card", pin1);
      assert.match(pin2, /^\d{6}$/);
      assert.equal(await p.ev(noOverflowX), true, "390 không tràn ngang");
      await p.ev("document.querySelector('#secret').scrollIntoView({ block: 'start' }); true");
      await chup(p, "2b-quan-tri-pin-moi-390", MOB);
      await axe(p, "Quản trị PIN mới 390");
    });
    p.close();
    await b.step("2c", "PIN sau cùng đăng nhập được (API, quyền Bán hàng); PIN trước đó bị từ chối", async () => {
      assert.ok(pin2, "chưa có PIN từ bước 2b");
      const sai = await fetch(`${env.base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: env.base }, body: JSON.stringify({ phone: MOI_390.sdt, pin: pin1 }) });
      assert.equal(sai.status, 401, "PIN cũ (lần đặt lại thứ nhất) không còn dùng được");
      const c = await env.login({ phone: MOI_390.sdt, pin: pin2 }); // ném nếu ≠ 200
      const me = await (await fetch(`${env.base}/api/auth/me`, { headers: { cookie: `${c.name}=${c.value}` } })).json();
      assert.ok(me.staff.permissions.includes("SALES"), `me: ${JSON.stringify(me.staff.permissions)}`);
    });

    // ==== Cảnh 3: Bán hàng hết phiên giữa form, đăng nhập lại cùng người =========================================================================================
    const chuTrinh3 = async (khung, nhan, du) => {
      const pg = await env.as(BH1, "/order-form", khung);
      try {
        await b.step(`3${nhan}`, `${khung.width} Bán hàng gõ form → xoá cookie → Lưu → /login (bản chụp ở sessionStorage, không ở localStorage) → đăng nhập lại cùng người → chữ còn, kho hết khoá${axeNote()}`, async () => {
          await dienForm(pg, du);
          assert.equal(await pg.ev(giaTri("#customerName")), du.ten);
          await chup(pg, `3${nhan}-truoc-het-phien-${khung.width}`, khung);
          await pg.send("Network.clearBrowserCookies");
          await luuVaChoLogin(pg);
          const ban = await pg.ev(docBan(ID_BH1));
          assert.deepEqual(ban, { loai: "form", staffId: ID_BH1, orderId: null, coO: true }, "pagehide đã ghi bản chụp giá trị ô của đúng người");
          assert.deepEqual(await pg.ev(KHOA_LOCAL), [], "không ghi gì vào localStorage");
          await chup(pg, `3${nhan}-trang-dang-nhap-${khung.width}`, khung);
          await dangNhapGiaoDien(pg, BH1);
          await pg.waitFor(`location.pathname === '/order-form' && document.getElementById('customerName')?.value === ${JSON.stringify(du.ten)}`, "về form, tên khách được điền lại", 15000);
          await sleep(500);
          assert.deepEqual(await pg.ev(`[${giaTri("#customerName")}, ${giaTri("#customerPhone")}, ${giaTri("#customerNote")}, ${giaTri("#orderDate")}]`), [du.ten, du.sdt, du.note, du.ngay], "các ô khách và ngày còn nguyên");
          assert.equal(await pg.ev(`${CARDS}.length`), 1, "một thẻ dịch vụ");
          assert.match(await pg.ev(`${CARDS}[0].textContent`), /Tour 4 đảo/, "thẻ dịch vụ Tour 4 đảo");
          assert.equal(await pg.ev(`${adultCounter}?.value`), "2", "2 người lớn");
          assert.deepEqual(await pg.ev(KHOA_PHIEN), [], "khôi phục một lần: kho không còn khoá td-nhap-don:*");
          assert.equal(await pg.ev(noOverflowX), true);
          await chup(pg, `3${nhan}-sau-dang-nhap-lai-${khung.width}`, khung);
          await axe(pg, `form khôi phục ${khung.width}`);
        });
      } finally {
        pg.close();
      }
    };
    await chuTrinh3(MOB, "a", { ten: "Khách Giữ Chữ Năm A", sdt: "0900 000 961", note: "Ghi chú giữ chữ thử 5A (390)", ngay: vnDate(7) });
    await chuTrinh3(DESK, "b", { ten: "Khách Giữ Chữ Năm B", sdt: "0900 000 962", note: "Ghi chú giữ chữ thử 5A (1280)", ngay: vnDate(9) });

    // 3E — sửa đơn có sẵn, hết phiên, đăng nhập lại ⇒ chữ đã sửa còn.
    const SUA = { ten: "Khách Đơn Có Sẵn Đã Sửa", note: "Ghi chú đã sửa trước khi hết phiên" };
    p = await env.as(BH1, `/order-form?id=${ID_DON}`, MOB);
    await b.step("3e", `390 sửa đơn có sẵn (/order-form?id=…): đổi tên + ghi chú → xoá cookie → Lưu → đăng nhập lại → chữ đã sửa còn; máy chủ vẫn giữ bản cũ${axeNote()}`, async () => {
      await p.waitFor(`document.getElementById('customerName')?.value === ${JSON.stringify(DON_CO_SAN.ten)}`, "đơn có sẵn đã nạp", 15000);
      await sleep(500);
      await p.ev(gan("#customerName", SUA.ten));
      await p.ev(gan("#customerNote", SUA.note));
      await chup(p, "3e-sua-don-truoc-het-phien-390", MOB);
      await p.send("Network.clearBrowserCookies");
      await luuVaChoLogin(p);
      assert.deepEqual(await p.ev(docBan(ID_BH1)), { loai: "form", staffId: ID_BH1, orderId: ID_DON, coO: true }, "bản chụp gắn mã đơn đang sửa");
      await dangNhapGiaoDien(p, BH1);
      await p.waitFor(`location.pathname === '/order-form' && new URLSearchParams(location.search).get('id') === ${JSON.stringify(ID_DON)} && document.getElementById('customerName')?.value === ${JSON.stringify(SUA.ten)}`, "về form sửa đơn, tên đã sửa còn", 15000);
      await sleep(500);
      assert.deepEqual(await p.ev(`[${giaTri("#customerName")}, ${giaTri("#customerPhone")}, ${giaTri("#customerNote")}]`), [SUA.ten, DON_CO_SAN.sdt, SUA.note]);
      assert.equal(await p.ev(`${CARDS}.length`), 1);
      assert.deepEqual(await p.ev(KHOA_PHIEN), [], "kho không còn khoá");
      const may = (await fetchTrang(p, "GET", `/api/orders/${ID_DON}`)).json.order;
      assert.deepEqual([may.customerName, may.customerNote], [DON_CO_SAN.ten, DON_CO_SAN.note], "máy chủ chưa nhận bản sửa (lần Lưu bị 401)");
      await chup(p, "3e-sua-don-sau-dang-nhap-lai-390", MOB);
      await axe(p, "sửa đơn khôi phục 390");
    });
    p.close();
    // 3F — đối chứng: mở sửa đơn bình thường (không bản chụp) ⇒ nạp đúng dữ liệu máy chủ.
    p = await env.as(BH1, `/order-form?id=${ID_DON}`, DESK);
    await b.step("3f", `1280 đối chứng: mở sửa đơn bình thường ⇒ nạp đúng dữ liệu máy chủ (bản sửa chưa lưu không lọt), không khoá td-nhap-don:*${axeNote()}`, async () => {
      await p.waitFor(`document.getElementById('customerName')?.value === ${JSON.stringify(DON_CO_SAN.ten)}`, "đơn nạp theo máy chủ", 15000);
      await sleep(500);
      assert.deepEqual(await p.ev(`[${giaTri("#customerName")}, ${giaTri("#customerPhone")}, ${giaTri("#customerNote")}]`), [DON_CO_SAN.ten, DON_CO_SAN.sdt, DON_CO_SAN.note]);
      assert.equal(await p.ev(`${adultCounter}?.value`), "2");
      assert.deepEqual(await p.ev(KHOA_PHIEN), []);
      assert.equal(await p.ev(noOverflowX), true);
      await chup(p, "3f-doi-chung-mo-sua-don-1280", DESK);
      await axe(p, "đối chứng sửa đơn 1280");
    });
    p.close();

    // ==== Cảnh 5: Đối tác gửi đơn, lời gọi gửi hết phiên =========================================================================================================
    const GIU_GUI = `(() => { if (window.__giuGui) return true; window.__giuGui = true; window.__cho = false; window.__tha = false; const f0 = window.fetch.bind(window);
      window.fetch = async (u, o) => { if (String(typeof u === 'string' ? u : u?.url ?? '').includes('/gui-don')) { window.__cho = true; while (!window.__tha) await new Promise((r) => setTimeout(r, 50)); } return f0(u, o); }; return true; })()`;
    let soDonDoiTac = 0;
    const chuTrinh5 = async (khung, nhan, du) => {
      const pg = await env.as(DOITAC, "/order-form", khung);
      try {
        await b.step(`5${nhan}`, `${khung.width} Đối tác «Gửi đơn»: lưu xong, lời gọi gửi đi không cookie ⇒ 401 → /login → đăng nhập lại → về trang đơn đã tạo (guiloi=1), không mở lại form; không đơn trùng; đơn vẫn nháp${axeNote()}`, async () => {
          await pg.ev(GIU_GUI);
          const coKhach = await dienForm(pg, du);
          tom[`5${nhan}-khoi-khach-hien`] = coKhach;
          assert.match(await pg.ev("document.getElementById('save').innerText"), /Gửi đơn/, "nút chính là «Gửi đơn»");
          await chup(pg, `5${nhan}-doi-tac-truoc-gui-${khung.width}`, khung);
          await pg.ev("document.getElementById('save').click(); true");
          const end = Date.now() + 15000;
          for (;;) {
            if (await pg.ev("window.__cho === true")) break;
            const loi = await pg.ev("(() => { const e = document.getElementById('save-error'); return e && !e.hidden ? e.innerText : null; })()");
            if (loi) throw new Error(`Gửi đơn bị chặn trước khi lưu: ${loi}`);
            if (Date.now() > end) throw new Error("lời gọi gửi không tới (lưu chưa xong?)");
            await sleep(100);
          }
          soDonDoiTac++;
          await pg.send("Network.clearBrowserCookies");
          await pg.ev("window.__tha = true; true");
          await pg.waitFor("location.pathname === '/login'", "về /login sau 401 của lời gọi gửi", 15000);
          await pg.waitFor("document.readyState === 'complete' && !!document.getElementById('login-form')", "trang đăng nhập đã tải");
          const ban = await pg.ev(docBan(ID_DT));
          assert.equal(ban?.loai, "da-tao", `bản chụp «đơn đã tạo»: ${JSON.stringify(ban)}`);
          assert.equal(ban.coO, false, "bản «đơn đã tạo» không mang giá trị ô");
          const idTao = ban.orderId;
          await dangNhapGiaoDien(pg, DOITAC);
          await pg.waitFor(`location.pathname === '/order' && new URLSearchParams(location.search).get('id') === ${JSON.stringify(idTao)}`, "về trang đơn đã tạo", 15000);
          // Trang đơn bỏ `guiloi` / `gui` khỏi địa chỉ NGAY khi mở (web/order.ts thamSoGui) → đọc lời điều hướng đã gửi và câu báo đang hiện.
          const dieuHuong = pg.requests.filter((r) => r.method === "GET" && new URL(r.url).pathname === "/order").map((r) => new URL(r.url).search);
          assert.deepEqual(dieuHuong, [`?id=${encodeURIComponent(idTao)}&guiloi=1`], `điều hướng tới trang đơn đúng nhánh «gửi chưa được» (guiloi=1), không phải gui=A|B: ${JSON.stringify(dieuHuong)}`);
          const cauLoi = cauLoiGuiDon("");
          await pg.waitFor(`document.querySelector('main')?.innerText.includes(${JSON.stringify(cauLoi)})`, `câu báo «${cauLoi}» trên trang đơn`, 12000);
          const posts = apiCalls(pg).filter((r) => r.method === "POST" && r.path === "/api/orders");
          assert.equal(posts.length, 1, "chỉ MỘT lần POST /api/orders trong thẻ này (không mở lại form để lưu lần hai)");
          const guis = apiCalls(pg).filter((r) => r.method === "POST" && r.path.endsWith("/gui-don"));
          assert.equal(guis.length, 1, "chỉ một lời gọi gửi (lời gọi bị 401)");
          const ds = (await fetchTrang(pg, "GET", "/api/orders")).json.orders;
          assert.equal(ds.length, soDonDoiTac, `danh sách đơn của Đối tác có đúng ${soDonDoiTac} đơn (không trùng): ${JSON.stringify(ds.map((o) => o.id))}`);
          assert.ok(ds.some((o) => o.id === idTao));
          const ct = (await fetchTrang(pg, "GET", `/api/orders/${idTao}`)).json.order;
          assert.equal(ct.status, "draft", `đơn vẫn là nháp (lời gọi gửi không tới máy chủ với phiên hợp lệ): ${ct.status}`);
          assert.deepEqual(await pg.ev(KHOA_PHIEN), [], "kho không còn khoá");
          tom[`5${nhan}-cau-tren-trang-don`] = await pg.ev("document.querySelector('main').innerText.split('\\n').filter((x) => /gửi/i.test(x)).slice(0, 3)");
          assert.equal(await pg.ev(noOverflowX), true);
          await chup(pg, `5${nhan}-doi-tac-ve-trang-don-${khung.width}`, khung);
          await axe(pg, `trang đơn sau gửi hết phiên ${khung.width}`);
        });
      } finally {
        pg.close();
      }
    };
    await chuTrinh5(MOB, "a", { ten: "Khách Đối Tác Năm A", sdt: "0900 000 963", note: "Ghi chú đối tác 390", ngay: vnDate(10) });
    await chuTrinh5(DESK, "b", { ten: "Khách Đối Tác Năm B", sdt: "0900 000 964", note: "Ghi chú đối tác 1280", ngay: vnDate(11) });

    // ==== Cảnh 4: hết phiên rồi NGƯỜI KHÁC đăng nhập cùng thẻ (phần dọn ở initShell — commit 479ea519a) ======================================================
    const ID_BH2 = idCua(BH2.phone);
    const chuTrinh4 = async (khung, nhan, du) => {
      const pg = await env.as(BH1, "/order-form", khung);
      try {
        let daVe = false;
        await b.step(`4${nhan}-chuan-bi`, `${khung.width} Bán hàng 1 gõ form → xoá cookie → Lưu → /login (bản chụp của Bán hàng 1 có trong kho) → Bán hàng 2 đăng nhập trên cùng thẻ → về form`, async () => {
          await dienForm(pg, du);
          await pg.send("Network.clearBrowserCookies");
          await luuVaChoLogin(pg);
          assert.equal((await pg.ev(docBan(ID_BH1)))?.loai, "form", "bản chụp của Bán hàng 1 có trong kho trước khi người khác đăng nhập");
          await dangNhapGiaoDien(pg, BH2);
          await pg.waitFor("location.pathname === '/order-form' && !!document.getElementById('catalog-q')", "về form", 15000);
          await sleep(2000);
          daVe = true;
        });
        await b.step(`4${nhan}-form-trong`, `${khung.width} form trống với người khác (không lọt tên, ghi chú, dịch vụ của người trước)${axeNote()}`, async () => {
          assert.ok(daVe, "bước chuẩn bị hỏng");
          assert.deepEqual(await pg.ev(`[${giaTri("#customerName")}, ${giaTri("#customerPhone")}, ${giaTri("#customerNote")}, ${CARDS}.length]`), ["", "", "", 0]);
          assert.ok(!(await pg.ev("document.querySelector('main').innerText")).includes(du.ten), "chữ của người trước không hiện ở đâu trên trang");
          assert.equal(await pg.ev(noOverflowX), true);
          await chup(pg, `4${nhan}-nguoi-khac-form-trong-${khung.width}`, khung);
          await axe(pg, `form trống người khác ${khung.width}`);
        });
        await b.step(`4${nhan}-kho-sach`, `${khung.width} kho sessionStorage không còn khoá của người trước (initShell dọn), cũng không có khoá của người mới`, async () => {
          assert.ok(daVe, "bước chuẩn bị hỏng");
          assert.equal(await pg.ev(docBan(ID_BH1)), null, `còn khoá của Bán hàng 1: ${JSON.stringify(await pg.ev(KHOA_PHIEN))}`);
          assert.deepEqual(await pg.ev(KHOA_PHIEN), []);
        });
      } finally {
        pg.close();
      }
    };
    await chuTrinh4(MOB, "a", { ten: "Khách Người Trước Năm A", sdt: "0900 000 965", note: "Ghi chú của người trước (390)", ngay: vnDate(7) });
    await chuTrinh4(DESK, "b", { ten: "Khách Người Trước Năm B", sdt: "0900 000 966", note: "Ghi chú của người trước (1280)", ngay: vnDate(8) });

    // ==== Cảnh 6: bản chụp của CHÍNH MÌNH còn khi mở trang khác; Đăng xuất xoá hết; bản quá hạn / của người khác bị initShell xoá ==================================
    const veLoginNext = async (pg, next) => {
      await pg.send("Page.navigate", { url: `${env.base}/login?next=${encodeURIComponent(next)}` });
      await pg.waitFor("location.pathname === '/login' && document.readyState === 'complete' && !!document.getElementById('login-form')", "trang đăng nhập (next khác)", 10000);
    };
    const choTrangXong = async (pg, path) => {
      await pg.waitFor(`location.pathname === ${JSON.stringify(path)} && document.readyState === 'complete' && !!document.querySelector('#topbar *')`, `trang ${path} đã dựng khung`, 15000);
      await sleep(1500); // initShell (/api/auth/me + dọn) xong
    };
    p = await env.as(BH1, "/order-form", MOB);
    let co6 = false;
    await b.step("6a", `390 hết phiên giữa form (như cảnh 3) → đăng nhập lại cùng người nhưng vào /orders trước → khoá của chính mình CÒN (trong hạn)${axeNote()}`, async () => {
      await dienForm(p, { ten: "Khách Cảnh Sáu", sdt: "0900 000 967", note: "Ghi chú cảnh 6", ngay: vnDate(7) });
      await p.send("Network.clearBrowserCookies");
      await luuVaChoLogin(p);
      assert.equal((await p.ev(docBan(ID_BH1)))?.loai, "form");
      await veLoginNext(p, "/orders"); // cùng thẻ: sessionStorage giữ nguyên
      await dangNhapGiaoDien(p, BH1);
      await choTrangXong(p, "/orders");
      assert.deepEqual(await p.ev(docBan(ID_BH1)), { loai: "form", staffId: ID_BH1, orderId: null, coO: true }, "initShell không xoá bản chụp của chính mình còn trong hạn");
      assert.equal(await p.ev(noOverflowX), true);
      await chup(p, "6a-mo-trang-khac-khoa-con-390", MOB);
      await axe(p, "Đơn hàng sau đăng nhập lại 390");
      co6 = true;
    });
    await b.step("6b", "390 bấm «Đăng xuất» trên giao diện (trang Tôi) → về /login, kho không còn khoá td-nhap-don:*", async () => {
      assert.ok(co6, "bước 6a hỏng");
      await p.send("Page.navigate", { url: `${env.base}/account` });
      await choTrangXong(p, "/account");
      assert.equal((await p.ev(docBan(ID_BH1)))?.loai, "form", "khoá vẫn còn ngay trước khi đăng xuất (mở trang Tôi không xoá)");
      const nut = `[...document.querySelectorAll('main button')].find((x) => x.textContent.trim() === 'Đăng xuất' && x.getClientRects().length > 0)`;
      await p.waitFor(`!!(${nut})`, "nút Đăng xuất ở trang Tôi", 10000);
      await p.ev(`(${nut}).click(), true`);
      await p.waitFor("location.pathname === '/login' && document.readyState === 'complete'", "về /login sau Đăng xuất", 15000);
      assert.deepEqual(await p.ev(KHOA_PHIEN), [], "Đăng xuất xoá mọi khoá td-nhap-don:*");
      await chup(p, "6b-dang-xuat-kho-sach-390", MOB);
    });
    await b.step("6c", "1280 đặt tay hai khoá (của chính mình nhưng chụp 31 phút trước; của người khác, mới) rồi đăng nhập, mở /orders → initShell xoá cả hai", async () => {
      await doiKhoGiuTrang(p, DESK);
      const khoa = (id, at) => `sessionStorage.setItem(${JSON.stringify(TIEN_TO_NHAP_TAM)} + ${JSON.stringify(id)}, JSON.stringify({ loai: 'form', staffId: ${JSON.stringify(id)}, at: ${at}, orderId: null, updatedAt: null, o: { than: { customerName: 'Khách Đặt Tay' } } }))`;
      await p.ev(`${khoa(ID_BH1, "Date.now() - 31 * 60 * 1000")}; ${khoa(ID_BH2, "Date.now()")}; true`);
      assert.equal((await p.ev(KHOA_PHIEN)).length, 2, "đã đặt hai khoá");
      await veLoginNext(p, "/orders");
      assert.equal((await p.ev(KHOA_PHIEN)).length, 2, "trang đăng nhập không xoá khoá");
      await dangNhapGiaoDien(p, BH1);
      await choTrangXong(p, "/orders");
      assert.deepEqual(await p.ev(KHOA_PHIEN), [], `còn khoá: ${JSON.stringify(await p.ev(KHOA_PHIEN))}`);
      await chup(p, "6c-khoa-qua-han-nguoi-khac-bi-xoa-1280", DESK);
    });
    p.close();
  } finally {
    if (Object.keys(tom).length) console.log(`\nghi nhận: ${JSON.stringify(tom)}`);
    b.xong();
  }
}
} finally {
  await env.stop();
}
