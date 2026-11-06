// Kịch bản Chrome — công tắc «Khách của đối tác trả cho Công ty» (ADR-0178 Phần A, Task A5). Hai khổ 390 và 1040. Trên D1 local tạm, tên và SĐT là GIẢ, không đụng
// dữ liệu thật, không cần mạng ngoài. axe chạy khi có AXE_JS (thiếu thì ghi «chưa chạy axe»).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-06-kenh-thu node docs/evidence/2026-11-06-kenh-thu/kich-ban/kenh-thu-smoke.mjs
// Ca: Quản trị thấy thẻ công tắc, không nút; Toàn quyền thấy nút và TẮT (hộp hỏi lại); Đối tác lập đơn lúc Tắt; văn phòng (Kế toán) mở đơn của Đối tác không hưởng ⇒ không
// lựa chọn người thu, câu «Đối tác lập đơn tự ghi khoản thu của đơn này.»; mở đơn của Đối tác là bên đặt được hưởng ⇒ đúng một lựa chọn «Khách trả cho đại lý ‹tên›»;
// Đối tác mở đơn mình ⇒ đúng một lựa chọn «Tôi thu». Không trang nào có nút «QR thanh toán».
// Trang dùng chung kho cookie: mỗi bước đăng nhập đúng một tài khoản, mở trang của tài khoản đó sau cùng (bước của Đối tác ở cuối mỗi khổ).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CHU, DESK, MOB, OUT, assert, axe, axeNote, boDem, dungMoiTruong, noCode, noOverflowX, sleep, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const QT = { name: "Quản Trị Kênh Thu", phone: "0900000721", pin: "246721", permissions: ["ADMIN"] };
const KT = { name: "Kế Toán Kênh Thu", phone: "0900000722", pin: "246722", permissions: ["ACCOUNTING"] };
const DT_HUONG = { name: "Đại Lý Hưởng", phone: "0900000723", pin: "246723", permissions: ["PARTNER"] };
const DT_LE = { name: "Đối Tác Không Hưởng", phone: "0900000724", pin: "246724", permissions: ["PARTNER"] };
const { env, call } = await dungMoiTruong([CHU, QT, KT, DT_HUONG, DT_LE]);
const b = boDem("KENH THU DOI TAC");
mkdirSync(join(OUT, "anh"), { recursive: true });
const ngay = vnDate(3);
const dung = (r, ma, viec) => assert.ok(Array.isArray(ma) ? ma.includes(r.status) : r.status === ma, `${viec}: ${r.status} ${r.text}`);

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
const docTxt = (p, sel) => p.ev(`((e) => e ? e.innerText.replace(/\\s+/g, ' ').trim() : null)(document.querySelector(${JSON.stringify(sel)}))`);
const hien = (p, sel) => p.ev(`((e) => !!e && e.getClientRects().length > 0)(document.querySelector(${JSON.stringify(sel)}))`);
const luaChon = (p) => p.ev(`[...document.querySelectorAll('#lan-thu-nguoi-thu option')].map((o) => o.textContent.trim())`);

// ---- Dữ liệu: Đại Lý Hưởng mang vai được hưởng (TRAVEL_AGENCY) + mức hoa hồng của vai; Đối Tác Không Hưởng không mang vai nào ----
const [{ party_id: ptyHuong }] = env.sql(`SELECT party_id FROM staff WHERE phone = '${DT_HUONG.phone}'`);
env.sql(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('ptr-kenh-thu-huong', '${ptyHuong}', 'TRAVEL_AGENCY', '2026-01-01', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`);
dung(await call(CHU, "POST", "/api/pricing/hoa-hong", { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 }), 201, "mức hoa hồng của vai");
const tenHuong = (await call(DT_HUONG, "GET", "/api/auth/me")).json?.benDatCuaToi?.ten ?? null;

const dichVu = [{ kind: "catalog", catalogCode: "TD101", pickupChoice: "KHONG_DON", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, departDate: ngay, legs: [] }];
const lapVaGui = async (who) => {
  const r = await call(who, "POST", "/api/orders", { customerName: "Khách Thử Kênh Thu", customerPhone: "0903261101", customerEmail: "", customerNote: "", discount: 0, paymentNote: "", services: dichVu, passengers: [] });
  dung(r, 201, "Đối tác lập đơn");
  const id = r.json.order.id;
  dung(await call(who, "POST", `/api/orders/${id}/gui-don`, {}), [200, 201], "Đối tác gửi đơn");
  let don = (await call(CHU, "GET", `/api/orders/${id}`)).json.order;
  if (don.status !== "confirmed") {
    dung(await call(CHU, "POST", `/api/orders/${id}/status`, { status: "confirmed" }), 200, "văn phòng xác nhận");
    don = (await call(CHU, "GET", `/api/orders/${id}`)).json.order;
  }
  assert.equal(don.status, "confirmed", "đơn đã xác nhận");
  return id;
};

let donLe = null;
let donHuong = null;
const moCapDaiLy = async (who, khung) => {
  const p = await env.as(who, "/cap-dai-ly", khung);
  await p.waitFor(`!!document.querySelector('#kenh-thu-doi-tac')`, "thẻ công tắc");
  return p;
};
const moDon = async (who, id, khung) => {
  const p = await env.as(who, `/order?id=${id}`, khung);
  await p.waitFor(`!!document.querySelector('[data-khoi="thanh-toan"]')`, "khối Thanh toán");
  await sleep(500);
  return p;
};

const buoc = async (khung, hau) => {
  // ---- 1. Quản trị: thấy thẻ, không có nút ----
  let p = await moCapDaiLy(QT, khung);
  await b.step(`${hau}-1`, `${hau}: Quản trị thấy thẻ «Khách của đối tác trả cho Công ty», không có nút đổi; không tràn ngang${axeNote()}`, async () => {
    assert.match(await docTxt(p, "#kenh-thu-doi-tac"), /Khách của đối tác trả cho Công ty/);
    assert.equal(await hien(p, "#kenh-thu-doi"), false, "Quản trị không có nút");
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `01-quan-tri-the-${hau}`, khung);
    await axe(p, `thẻ công tắc Quản trị ${hau}`);
  });
  p.close();
  // ---- 2. Toàn quyền: có nút; khổ đầu bấm Tắt qua hộp hỏi lại ----
  p = await moCapDaiLy(CHU, khung);
  await b.step(`${hau}-2`, `${hau}: Toàn quyền thấy nút; ${donLe ? "công tắc đang Tắt, nút «Bật»" : "bấm «Tắt», hộp hỏi lại, bấm «Tắt» lần nữa ⇒ thẻ ghi Tắt, lịch sử có dòng"}${axeNote()}`, async () => {
    assert.equal(await hien(p, "#kenh-thu-doi"), true, "Toàn quyền có nút");
    if (!donLe) {
      assert.equal(await docTxt(p, "#kenh-thu-doi"), "Tắt");
      await p.ev(`document.querySelector('#kenh-thu-doi').click()`);
      await p.waitFor(`[...document.querySelectorAll('.btn-danger')].some((x) => x.textContent.trim() === 'Tắt' && x.getClientRects().length > 0)`, "hộp hỏi lại");
      await chup(p, `02-toan-quyen-hoi-lai-${hau}`, khung);
      await p.ev(`[...document.querySelectorAll('.btn-danger')].find((x) => x.textContent.trim() === 'Tắt').click()`);
      await p.waitFor(`(document.querySelector('#kenh-thu-trang-thai')?.innerText ?? '').startsWith('Tắt')`, "thẻ ghi Tắt");
      assert.match(await docTxt(p, '[data-khoi="kenh-thu-lich-su"]'), /Tắt ·/);
    }
    assert.equal(await docTxt(p, "#kenh-thu-doi"), "Bật");
    assert.equal(await p.ev(noCode), "");
    await chup(p, `03-toan-quyen-da-tat-${hau}`, khung);
    await axe(p, `thẻ công tắc Toàn quyền ${hau}`);
  });
  p.close();
  if (!donLe) {
    assert.equal((await call(CHU, "GET", "/api/kenh-thu-doi-tac")).json.congTyThu, false, "máy chủ ghi Tắt");
    donLe = await lapVaGui(DT_LE);
    donHuong = await lapVaGui(DT_HUONG);
    const tLe = (await call(KT, "GET", `/api/orders/${donLe}/payments`)).json.kenhThu;
    const tHuong = (await call(KT, "GET", `/api/orders/${donHuong}/payments`)).json.kenhThu;
    console.log(`kenhThu đơn không hưởng: ${JSON.stringify(tLe)} · đơn được hưởng: ${JSON.stringify(tHuong)}`);
  }
  // ---- 3. Văn phòng (Kế toán) mở đơn của Đối tác không hưởng ----
  p = await moDon(KT, donLe, khung);
  await b.step(`${hau}-3`, `${hau}: văn phòng mở đơn dấu Tắt (người lập không phải bên đặt được hưởng) ⇒ không nút «Ghi khoản thu», câu «Đối tác lập đơn tự ghi khoản thu của đơn này.», không QR${axeNote()}`, async () => {
    assert.equal(await docTxt(p, '[data-khoi="doi-tac-tu-ghi"]'), "Đối tác lập đơn tự ghi khoản thu của đơn này.");
    assert.equal(await hien(p, '[data-action="ghi-lan-thu"]'), false);
    assert.equal(await hien(p, '[data-action="qr-thanh-toan"]'), false, "không QR");
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `04-van-phong-doi-tac-tu-ghi-${hau}`, khung);
    await axe(p, `đơn không hưởng ${hau}`);
  });
  p.close();
  // ---- 4. Văn phòng mở đơn của Đối tác là bên đặt được hưởng ----
  p = await moDon(KT, donHuong, khung);
  await b.step(`${hau}-4`, `${hau}: văn phòng mở đơn dấu Tắt (người lập là bên đặt được hưởng) ⇒ đúng một lựa chọn «Khách trả cho đại lý ‹tên›», không QR${axeNote()}`, async () => {
    assert.equal(await hien(p, '[data-action="qr-thanh-toan"]'), false, "không QR");
    await p.ev(`document.querySelector('[data-action="ghi-lan-thu"]').click()`);
    await p.waitFor(`!!document.querySelector('#lan-thu-nguoi-thu')`, "form ghi khoản thu");
    const ds = await luaChon(p);
    assert.equal(ds.length, 1, JSON.stringify(ds));
    assert.match(ds[0], /^Khách trả cho đại lý \S/);
    if (tenHuong) assert.equal(ds[0], `Khách trả cho đại lý ${tenHuong}`);
    await chup(p, `05-van-phong-ben-dat-${hau}`, khung);
    await axe(p, `đơn được hưởng ${hau}`);
  });
  p.close();
  // ---- 5. Đối tác mở đơn mình (SAU CÙNG của khổ này) ----
  p = await moDon(DT_HUONG, donHuong, khung);
  await b.step(`${hau}-5`, `${hau}: Đối tác mở đơn mình ⇒ đúng một lựa chọn «Tôi thu», không QR, ô cỡ 16px${axeNote()}`, async () => {
    assert.equal(await hien(p, '[data-action="qr-thanh-toan"]'), false, "không QR");
    await p.ev(`document.querySelector('[data-action="ghi-lan-thu"]').click()`);
    await p.waitFor(`!!document.querySelector('#lan-thu-nguoi-thu')`, "form ghi khoản thu");
    assert.deepEqual(await luaChon(p), ["Tôi thu"]);
    assert.equal(await p.ev(`getComputedStyle(document.querySelector('#lan-thu-nguoi-thu')).fontSize`), "16px");
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `06-doi-tac-toi-thu-${hau}`, khung);
    await axe(p, `đơn của Đối tác ${hau}`);
  });
  p.close();
};
try {
  await buoc(MOB, "390");
  await buoc(DESK, "1040");
} finally {
  await env.stop?.();
  await env.tat?.();
}
b.xong();
