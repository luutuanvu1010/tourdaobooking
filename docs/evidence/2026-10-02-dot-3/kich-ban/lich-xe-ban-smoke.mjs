// Kịch bản Chrome — trang "Lịch xe bận" + dải bận trên Điều phối xe (ADR-0055 VK2-A/B; Vận chuyển Đợt 3 Task 10; bản vẽ docs/design/van-chuyen-dot-3-7/
// Quản lý lịch xe bận.dc.html 2/10). Khổ 1040 + 390. Thứ tự tài khoản: Kế toán TRƯỚC, Quản trị SAU (các trang dùng CHUNG kho cookie — CLAUDE.md §10).
//   1. Kế toán 1040: thanh bên KHÔNG có "Lịch xe bận"; mở thẳng /lich-xe-ban → câu từ chối tiếng Việt, không lưới, không nút.
//   2. Kế toán 1040: /dieu-phoi ngày D → dải "Xe bận 13:00–17:00 · Bảo dưỡng" trên hàng xe A (nằm dưới khối chuyến), không nút.
//   3. Kế toán 390: /dieu-phoi thẻ "Xe" → dòng "Xe bận 13:00–17:00 · Bảo dưỡng" (biểu tượng có sẵn); không tràn ngang.
//   4. Quản trị 1040: /lich-xe-ban?tu=D — tiêu đề, dòng phụ "dd/mm – dd/mm/yyyy · N lịch bận", mục "Lịch xe bận" sáng dưới "Vận chuyển", hàng xe A có khung bận và
//      chuyến CX-… (chỉ mã + giờ, không mã đơn / tên khách), xe B chip "Bảo dưỡng"; không lộ mã thô; axe.
//   5. Khung 23:00 Chủ nhật → 07:00 thứ Hai: tuần chứa Chủ nhật có "từ 23:00", bấm › → ô thứ Hai "đến 07:00".
//   6. "Thêm lịch bận" → form tại chỗ (Xe, Ngày, Đến ngày, Từ, Đến, Lý do = ô chọn) → Lưu → thẻ "18:00–20:00 · Đăng kiểm" hiện; ô gõ ≥ 16px.
//   7. Ghi chồng chuyến → khung lỗi liệt kê mã CX-…; không thêm thẻ.
//   8. ✕ trên thẻ → hộp hỏi "Rút lịch bận … ?" → Rút → thẻ mất.
//   9. Quản trị 390: không tràn ngang trang; cột XE dính trái khi cuộn ngang trong thẻ; form một cột; axe.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài; D1 tạm):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-02-dot-3 node docs/evidence/2026-10-02-dot-3/kich-ban/lich-xe-ban-smoke.mjs
import { randomUUID } from "node:crypto";
import { ACCOUNTS, DESK, MOB, assert, axe, axeNote, boDem, click, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, shown, txt, typeInto, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const { env, call } = await dungMoiTruong();
const dem = boDem("lich-xe-ban-smoke");
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const D = vnDate(2);
const han = vnDate(300);
const ngayCong = (ngay, n) => new Date(Date.parse(`${ngay}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const dow = new Date(`${D}T00:00:00Z`).getUTCDay();
const CN = ngayCong(D, (7 - dow) % 7); // Chủ nhật đầu tiên từ D trở đi
const T2 = ngayCong(CN, 1);
try {
  // ---- dữ liệu (đường thật qua API) ----
  const xe = async (plateNumber, cho) => {
    const r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber, chassisNumber: `XB${plateNumber.replace(/\D/g, "")}`, name: `Xe thử ${plateNumber}`, passengerCapacity: cho });
    dung(r, 201, `thêm xe ${plateNumber}`);
    for (const typeCode of ["INSPECTION", "TPL_INSURANCE"]) dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${r.json.vehicle.id}/giay-to`, { typeCode, number: `${typeCode}-${plateNumber}`, expiryDate: han }), 201, "giấy tờ xe");
    return r.json.vehicle;
  };
  const XE_A = await xe("79A-123.45", 16);
  const XE_B = await xe("79B-678.90", 29);
  const bMoi = (await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/xe/${XE_B.id}`)).json.vehicle;
  dung(await call(ACCOUNTS.admin, "PUT", `/api/van-chuyen/xe/${XE_B.id}`, { plateNumber: bMoi.plateNumber, chassisNumber: bMoi.chassisNumber, name: bMoi.name, modelYear: null, passengerCapacity: 29, status: "maintenance", expectedUpdatedAt: bMoi.updatedAt }), 200, "xe B bảo dưỡng");
  const tk = await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Tài Xế Lịch Bận", phone: "0900000471", roles: ["DRIVER_INTERNAL"] });
  dung(tk, 201, "tài xế");
  const [{ party_id: tx }] = env.sql(`SELECT party_id FROM staff WHERE id = '${tk.json.staff.id}'`);
  dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${tx}/documents`, { typeCode: "GPLX", number: "791234567890", classCode: "D2", expiryDate: han }), 201, "GPLX");
  const t1 = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: XE_A.id, taiXePartyId: tx, batDau: { ngay: D, gio: "09:00" }, ketThuc: { ngay: D, gio: "11:00" } });
  dung(t1, 201, "chuyến T1");
  const MA_T1 = t1.json.chuyen.ma;
  dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${XE_A.id}/ban`, { batDau: { ngay: D, gio: "13:00" }, ketThuc: { ngay: D, gio: "17:00" }, lyDo: "BAN_XE_BAO_DUONG" }), 201, "khung 13–17");
  dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${XE_B.id}/ban`, { batDau: { ngay: CN, gio: "23:00" }, ketThuc: { ngay: T2, gio: "07:00" }, lyDo: "BAN_XE_SUA_CHUA" }), 201, "khung qua đêm CN → T2");

  // ---- 1–3. Kế toán ----
  let p = await env.as(ACCOUNTS.accounting, "/lich-xe-ban", DESK);
  await dem.step("1", "Kế toán 1040: thanh bên không có “Lịch xe bận”; mở thẳng /lich-xe-ban → câu từ chối, không lưới, không nút", async () => {
    await p.waitFor("!document.getElementById('error').hidden", "câu từ chối");
    const labels = await p.ev("[...document.querySelectorAll('#sidebar .sidebar-item-label')].map((e) => e.textContent.trim())");
    assert.ok(!labels.includes("Lịch xe bận"), JSON.stringify(labels));
    assert.match(await p.ev(txt("#error")), /không quản lý được xe/);
    assert.equal(await p.ev(shown("#xb-the")), false);
    assert.equal(await p.ev(shown("#xb-them")), false);
    assert.equal(await p.ev(shown("#xb-nav")), false);
    await shotFull(p, "1-ke-toan-tu-choi-1040.png");
  });
  await p.send("Page.navigate", { url: `${env.base}/dieu-phoi?ngay=${D}` });
  await dem.step("2", "Kế toán 1040: Điều phối xe có dải “Xe bận 13:00–17:00 · Bảo dưỡng” trên hàng xe A, nằm dưới khối chuyến, không nút", async () => {
    await p.waitFor("!!document.querySelector('.dp-tl-ban')", "dải bận");
    const d = await p.ev(`(() => { const b = document.querySelector('.dp-tl-ban'); const k = document.querySelector('.dp-khoi'); return { nhan: b.getAttribute('aria-label'), chu: b.textContent.trim(), z: getComputedStyle(b).zIndex, zKhoi: k ? getComputedStyle(k).zIndex : null, nut: b.querySelectorAll('button').length, bg: getComputedStyle(b).backgroundColor }; })()`);
    assert.equal(d.nhan, "Xe bận 13:00–17:00 · Bảo dưỡng");
    assert.equal(d.chu, "Bảo dưỡng");
    assert.ok(Number(d.z) < Number(d.zKhoi ?? 1), JSON.stringify(d));
    assert.equal(d.nut, 0);
    assert.equal(d.bg, "rgb(254, 243, 199)", "màu nền 'Xe bận' = token --c-xe-ban-bg (#fef3c7)");
    assert.equal(await p.ev(shown(".dp-ban-ds")), false, "máy tính: không lặp danh sách dòng 'Xe bận' (đã có dải trên dòng thời gian)");
    await shotFull(p, "2-dieu-phoi-dai-ban-1040.png");
  });
  p.close();
  p = await env.as(ACCOUNTS.accounting, `/dieu-phoi?ngay=${D}`, MOB);
  await dem.step("3", "Kế toán 390: thẻ “Xe” có dòng “Xe bận 13:00–17:00 · Bảo dưỡng”; không tràn ngang", async () => {
    await p.waitFor("!!document.getElementById('dp-tab-xe')", "thẻ Xe");
    await p.ev(click("#dp-tab-xe"));
    await p.waitFor(shown(".dp-ban-ds"), "dòng xe bận hiện ở điện thoại");
    const dong = await p.ev(`[...document.querySelectorAll('.dp-ban-dong')].map((e) => e.innerText.replace(/\\s+/g, ' ').trim())`);
    assert.ok(dong.includes("79A-123.45 · Xe bận 13:00–17:00 · Bảo dưỡng"), JSON.stringify(dong)); // D có thể là Chủ nhật — thêm dòng khung qua đêm của xe B
    assert.equal(await p.ev(noOverflowX), true);
    await shotFull(p, "3-dieu-phoi-dai-ban-390.png");
  });
  p.close();

  // ---- 4–8. Quản trị 1040 ----
  p = await env.as(ACCOUNTS.admin, `/lich-xe-ban?tu=${D}`, DESK);
  await dem.step("4", "Quản trị 1040: tiêu đề + dòng phụ; mục “Lịch xe bận” sáng; hàng xe A có khung bận và chuyến CX (chỉ mã + giờ); xe B chip “Bảo dưỡng”; không mã thô" + axeNote(), async () => {
    await p.waitFor("!!document.querySelector('.xb-xe')", "lưới");
    assert.equal(await p.ev(txt(".xb-title")), "Lịch xe bận");
    assert.match(await p.ev(txt("#xb-sub")), /^\d\d\/\d\d – \d\d\/\d\d\/\d{4} · \d+ lịch bận$/);
    assert.equal(await p.ev("document.querySelector('#sidebar .sidebar-sub[aria-current=\"page\"]')?.innerText.trim()"), "Lịch xe bận");
    const muc = await p.ev(`[...document.querySelectorAll('.xb-muc')].map((m) => m.innerText.replace(/\\s+/g, ' ').trim())`);
    assert.ok(muc.includes("13:00–17:00 Bảo dưỡng"), JSON.stringify(muc));
    assert.ok(muc.includes(`09:00–11:00 ${MA_T1}`), JSON.stringify(muc));
    assert.equal(await p.ev("document.querySelector('a.xb-muc.is-chuyen').getAttribute('href').startsWith('/chuyen?id=')"), true);
    assert.equal(await p.ev("document.querySelectorAll('a.xb-muc.is-chuyen .xb-x').length"), 0, "chuyến không có ✕");
    assert.doesNotMatch(await p.ev("document.querySelector('main').innerText"), /TD-\d|Khách/);
    assert.ok((await p.ev(`[...document.querySelectorAll('.xb-xe')].map((e) => e.innerText.replace(/\\s+/g, ' ').trim())`)).some((t) => t === "79B-678.90 Xe 29 chỗ Bảo dưỡng"));
    assert.equal(await p.ev(noCode), "");
    assert.match(await p.ev(txt("#xb-chu-thich")), /Xe bận · ô trống là xe rảnh/);
    assert.deepEqual(p.consoleErrors, []);
    await axe(p, "lich-xe-ban 1040");
    await shotFull(p, "4-lich-xe-ban-1040.png");
  });
  await dem.step("5", "Khung 23:00 Chủ nhật → 07:00 thứ Hai: tuần chứa Chủ nhật có “từ 23:00”; bấm › → ô thứ Hai “đến 07:00”", async () => {
    await p.send("Page.navigate", { url: `${env.base}/lich-xe-ban?tu=${CN}` });
    await p.waitFor("!!document.querySelector('.xb-xe')", "lưới tuần Chủ nhật");
    const cnO = await p.ev(`[...document.querySelectorAll('.xb-o-ngay')].filter((_, i) => i % 7 === 6).map((o) => o.innerText.replace(/\\s+/g, ' ').trim())`);
    assert.ok(cnO.includes("từ 23:00 Sửa chữa"), JSON.stringify(cnO));
    await p.ev("document.getElementById('xb-sau').click()");
    await p.waitFor(`location.search.includes(${JSON.stringify(T2)}) || document.querySelector('.xb-dau-ngay .xb-ngay-so')?.textContent === ${JSON.stringify(`${T2.slice(8, 10)}/${T2.slice(5, 7)}`)}`, "sang tuần sau");
    const t2O = await p.ev(`[...document.querySelectorAll('.xb-o-ngay')].filter((_, i) => i % 7 === 0).map((o) => o.innerText.replace(/\\s+/g, ' ').trim())`);
    assert.ok(t2O.includes("đến 07:00 Sửa chữa"), JSON.stringify(t2O));
  });
  await p.send("Page.navigate", { url: `${env.base}/lich-xe-ban?tu=${D}` });
  await p.waitFor("!!document.querySelector('.xb-xe')", "về tuần D");
  await dem.step("6", "“Thêm lịch bận” → form tại chỗ (6 ô, Lý do là ô chọn) → Lưu → thẻ “18:00–20:00 Đăng kiểm”; ô gõ ≥ 16px", async () => {
    await p.ev("document.getElementById('xb-them').click()");
    await p.waitFor(shown("#xb-form"), "form");
    const nhan = await p.ev(`[...document.querySelectorAll('#xb-form .xb-truong')].map((l) => l.firstChild.textContent.trim())`);
    assert.deepEqual(nhan, ["Xe", "Ngày", "Đến ngày", "Từ", "Đến", "Lý do"]);
    assert.equal(await p.ev("document.getElementById('xb-ly-do').tagName"), "SELECT");
    const co = await p.ev(`[...document.querySelectorAll('#xb-form .xb-o')].map((o) => parseFloat(getComputedStyle(o).fontSize))`);
    assert.ok(co.every((x) => x >= 16), JSON.stringify(co));
    await shotView(p, "6a-form-1040.png");
    await p.ev(typeInto("#xb-xe", XE_A.id));
    await p.ev(typeInto("#xb-ngay", D));
    await p.ev(typeInto("#xb-den-ngay", D));
    await p.ev(typeInto("#xb-tu", "18:00"));
    await p.ev(typeInto("#xb-den", "20:00"));
    await p.ev(typeInto("#xb-ly-do", "BAN_XE_DANG_KIEM"));
    await p.ev("document.querySelector('#xb-form [data-action=\"luu-khung\"]').click()");
    await p.waitFor(`[...document.querySelectorAll('.xb-muc')].some((m) => m.innerText.replace(/\\s+/g, ' ').trim() === '18:00–20:00 Đăng kiểm')`, "thẻ mới");
    assert.equal(await p.ev(shown("#xb-form")), false, "form đóng sau khi lưu");
    await shotFull(p, "6b-them-xong-1040.png");
  });
  await dem.step("7", "Ghi chồng chuyến → khung lỗi liệt kê mã chuyến; không thêm thẻ", async () => {
    const truoc = await p.ev("document.querySelectorAll('.xb-muc').length");
    await p.ev("document.getElementById('xb-them').click()");
    await p.waitFor(shown("#xb-form"), "form");
    await p.ev(typeInto("#xb-xe", XE_A.id));
    await p.ev(typeInto("#xb-ngay", D));
    await p.ev(typeInto("#xb-den-ngay", D));
    await p.ev(typeInto("#xb-tu", "08:00"));
    await p.ev(typeInto("#xb-den", "10:00"));
    await p.ev(typeInto("#xb-ly-do", "BAN_XE_SUA_CHUA"));
    await p.ev("document.querySelector('#xb-form [data-action=\"luu-khung\"]').click()");
    await p.waitFor(shown(".xb-form-loi"), "khung lỗi");
    assert.match(await p.ev(txt(".xb-form-loi")), new RegExp(`Xe đang có 1 chuyến trùng: ${MA_T1}`));
    assert.equal(await p.ev("document.querySelectorAll('.xb-muc').length"), truoc);
    await shotView(p, "7-loi-chong-chuyen-1040.png");
    await p.ev("[...document.querySelectorAll('#xb-form button')].find((b) => b.textContent.trim() === 'Đóng').click()");
  });
  await dem.step("8", "✕ trên thẻ → hộp hỏi “Rút lịch bận … ?” → Rút → thẻ mất", async () => {
    const nut = "[...document.querySelectorAll('.xb-muc')].find((m) => m.innerText.includes('Đăng kiểm')).querySelector('.xb-x')";
    assert.match(await p.ev(`${nut}.getAttribute('aria-label')`), /^Rút lịch bận Đăng kiểm 18:00–20:00$/);
    await p.ev(`${nut}.click()`);
    await p.waitFor("!!document.querySelector('.sheet[role=dialog]')", "hộp hỏi");
    assert.match(await p.ev(txt(".sheet-body")), /^Rút lịch bận Đăng kiểm 18:00–20:00 \d\d\/\d\d\? Xe sẽ xếp chuyến được trong giờ này\.$/);
    await shotView(p, "8-hoi-rut-1040.png");
    await p.ev(click("[data-action='rut-xac-nhan']"));
    await p.waitFor(`!document.querySelector('.sheet-root') && ![...document.querySelectorAll('.xb-muc')].some((m) => m.innerText.includes('Đăng kiểm'))`, "thẻ mất");
  });
  p.close();

  // ---- 9. Quản trị 390 ----
  p = await env.as(ACCOUNTS.admin, `/lich-xe-ban?tu=${D}`, MOB);
  await dem.step("9", "Quản trị 390: không tràn ngang; cột XE dính trái khi cuộn ngang; form một cột" + axeNote(), async () => {
    await p.waitFor("!!document.querySelector('.xb-xe')", "lưới");
    assert.equal(await p.ev(noOverflowX), true);
    const dinh = await p.ev(`(() => { const the = document.getElementById('xb-the'); the.scrollLeft = 300; const a = the.getBoundingClientRect().left; const x = document.querySelector('.xb-xe').getBoundingClientRect().left; return { lech: Math.abs(x - a), cuon: the.scrollLeft }; })()`);
    assert.ok(dinh.cuon > 0 && dinh.lech <= 2, JSON.stringify(dinh));
    await p.ev("document.getElementById('xb-the').scrollLeft = 0");
    await shotFull(p, "9a-lich-xe-ban-390.png");
    await p.ev("document.getElementById('xb-them').click()");
    await p.waitFor(shown("#xb-form"), "form");
    const cot = await p.ev(`new Set([...document.querySelectorAll('#xb-form .xb-truong')].map((l) => Math.round(l.getBoundingClientRect().left))).size`);
    assert.equal(cot, 1, "form một cột ở 390");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "lich-xe-ban 390");
    await shotFull(p, "9b-form-390.png");
  });
  p.close();
} finally {
  dem.xong();
  await env.stop();
}
