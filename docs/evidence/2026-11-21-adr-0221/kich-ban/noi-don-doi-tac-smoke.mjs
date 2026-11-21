// Kịch bản Chrome + axe — ADR-0221 «Đối tác không nhập nơi đón» (chủ duyệt 21/11/2026). Hai khổ 390 và 1280. Trên D1 local tạm; tên, SĐT, địa chỉ là GIẢ, không đụng dữ liệu thật.
// Chạy từ GỐC repo, sau `npm run build:web` (ảnh để NGOÀI kho — `.gitignore` chặn ảnh trong kho, ADR-0215 Đ3):
//   AXE_JS=$PWD/node_modules/axe-core/axe.min.js OUT=$HOME/tourdao-adr-0221 node docs/evidence/2026-11-21-adr-0221/kich-ban/noi-don-doi-tac-smoke.mjs
// Luồng mỗi khổ: Toàn quyền bật công tắc ở trang Tôi → Đối tác tạo đơn, bấm «Đón»: không ô nào của lượt, «Gửi đơn» được → Bán hàng mở đơn: bảng «Xác nhận đơn» có ô «Nơi đón»,
// thiếu thì báo tại lượt (không gọi máy chủ), điền nơi đón + giờ thì xác nhận được, Chi tiết đơn hiện nơi đón thật → Toàn quyền tắt công tắc: form đối tác trở lại có ô «Nơi đón».
// Trang dùng chung kho cookie: mỗi phần đăng nhập đúng một tài khoản, mở trang của tài khoản đó sau cùng (trang trước đã đóng).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AXE, CHU, MOB, OUT, apiCalls, assert, axe, axeNote, boDem, click, dungMoiTruong, fetchTrang, noCode, noOverflowX, sleep, typeInto, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const DOITAC = { name: "Đối Tác Không Nơi Đón", phone: "0900000721", pin: "246721", permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" }; // ADR-0185: tài khoản Đối tác phải có vai trò đối tác
const BAN = { name: "Bán Hàng Điền Nơi Đón", phone: "0900000722", pin: "246722", permissions: ["SALES"] };
const { env } = await dungMoiTruong([CHU, DOITAC, BAN]);
/** Gọi API bằng một phiên MỚI của `account` (đăng nhập lại mỗi lần): mở trang bằng `env.as` cũng đăng nhập lại nên phiên cũ không dùng tiếp được. KHÔNG gọi cho tài khoản đang có trang mở — dùng `fetchTrang(p, …)`. */
const goi = async (account, method, path, body) => {
  const c = await env.login(account);
  const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* không phải JSON */ }
  return { status: r.status, json, text };
};
const b = boDem("ADR-0221 DOI TAC KHONG NHAP NOI DON");
mkdirSync(join(OUT, "anh"), { recursive: true });
const DESK_RONG = { width: 1280, height: 820, mobile: false };
const TEN_DV = "Tour 4 đảo Nha Trang";
const CHU_TAM = "(chưa ghi nơi đón)";
const GHI_CHU = "Đón ở khách sạn mẫu đường Trần Phú, khoảng 7 giờ";
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
const axeVung = async (p, sel, label) => {
  if (!AXE) return;
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document.querySelector(${JSON.stringify(sel)})).then((r) => r.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious').map((x) => ({ id: x.id, impact: x.impact, target: x.nodes.slice(0, 3).map((n) => n.target.join(' ')) })))`);
  assert.deepEqual(v, [], `axe (${label}): ${JSON.stringify(v)}`);
};
const docTxt = (p, sel) => p.ev(`((e) => e ? e.innerText.replace(/\\s+/g, ' ').trim() : null)(document.querySelector(${JSON.stringify(sel)}))`);
const hien = (p, sel) => p.ev(`((e) => !!e && e.getClientRects().length > 0)(document.querySelector(${JSON.stringify(sel)}))`);
const coChu = (p, chu) => p.ev(`document.querySelector('main').innerText.replace(/\\s+/g, ' ').includes(${JSON.stringify(chu)})`);
const loiConsole = (p, o) => assert.deepEqual(p.consoleErrors, [], `lỗi console (${o}): ${p.consoleErrors}`);

/** Đối tác mở form mới, chọn TD101, 2 người lớn, điền khách + ngày, bấm «Đón». */
const moFormVaChonDon = async (khung) => {
  const p = await env.as(DOITAC, "/order-form", khung);
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.waitFor("/TD101/.test(document.getElementById('catalog-list').textContent)", "ô tìm danh mục có TD101", 12000);
  await p.ev(typeInto("#catalog-q", "TD101"));
  await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "lọc TD101");
  await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
  await p.waitFor(`!!document.querySelector('#services .svc .counter-field[aria-label="Người lớn"]')`, "thẻ dịch vụ");
  await p.ev(typeInto('#services .svc .counter-field[aria-label="Người lớn"]', "2"));
  await p.ev(typeInto("#customerName", "Khách Thử Nơi Đón"));
  await p.ev(typeInto("#customerPhone", "0903 261 221"));
  await p.ev(typeInto("#orderDate", vnDate(3)));
  await sleep(200);
  assert.equal(await p.ev(click('[data-action="them-dua-don"]')), true, "bấm được nút «Đón»");
  await sleep(400);
  return p;
};
/** Trạng thái khối Đưa đón của thẻ đầu: lớp gốc, phần tử của lượt đang HIỆN, nút đang sáng. */
const khoiDuaDon = (p) => p.ev(`(() => {
  const goc = document.querySelector('#services .svc .dd-chon-don')?.parentElement;
  if (!goc) return null;
  const thay = (e) => e.getClientRects().length > 0;
  return {
    anHet: goc.classList.contains('dd-an-het-luot'), chiNoiDon: goc.classList.contains('dd-chi-noi-don'),
    soLuotTrongDom: goc.querySelectorAll('.dd-chang').length,
    oLuotHien: [...goc.querySelectorAll('.dd-chang-khung, .dd-chang-khung *, .dd-nut, .dd-nut *')].filter(thay).length,
    oNoiDonHien: [...goc.querySelectorAll('[data-o$=":don"]')].filter(thay).length,
    nut: [...goc.querySelectorAll('.dd-chon-don button')].filter(thay).map((x) => x.textContent.trim() + ':' + x.getAttribute('aria-pressed')),
    loiHien: [...goc.querySelectorAll('.field-error')].filter((e) => thay(e) && e.textContent.trim() !== '').map((e) => e.textContent.trim()),
  };
})()`);

const buoc = async (khung, hau) => {
  // ---- 1. Toàn quyền bật công tắc ở trang Tôi ----
  let p = await env.as(CHU, "/account", khung);
  await p.waitFor(`!!document.querySelector('#noi-don-cai-dat:not([hidden]) #noi-don-doi')`, "khối công tắc hiện", 12000);
  await b.step(`${hau}-1`, `${hau}: Toàn quyền thấy khối «Đối tác không nhập nơi đón» đang tắt, bấm «Bật đối tác không nhập nơi đón» → «Đang bật.», máy chủ trả bat = true${axeNote()}`, async () => {
    assert.equal(await docTxt(p, "#noi-don-heading"), "Đối tác không nhập nơi đón");
    assert.equal(await docTxt(p, "#noi-don-trang-thai"), "Đang tắt.");
    assert.equal(await docTxt(p, "#noi-don-doi"), "Bật đối tác không nhập nơi đón");
    await p.ev(click("#noi-don-doi"));
    await p.waitFor(`document.querySelector('#noi-don-trang-thai')?.textContent === 'Đang bật.'`, "công tắc bật", 8000);
    assert.equal(await docTxt(p, "#noi-don-doi"), "Tắt đối tác không nhập nơi đón");
    assert.equal((await fetchTrang(p, "GET", "/api/cai-dat/noi-don-doi-tac")).json.bat, true);
    assert.equal((await goi(DOITAC, "GET", "/api/cai-dat/noi-don-doi-tac")).json.apChoToi, true, "áp cho tài khoản giữ quyền Đối tác");
    assert.equal((await goi(BAN, "GET", "/api/cai-dat/noi-don-doi-tac")).json.apChoToi, false, "không áp cho Bán hàng");
    assert.equal(await p.ev(noOverflowX), true);
    await p.ev(`document.querySelector('#noi-don-cai-dat').scrollIntoView({ block: 'center' })`);
    await chup(p, `01-cong-tac-${hau}`, khung);
    // axe chỉ trong khối công tắc: nút hình đại diện `.bar-avatar` của thanh trên (khổ 390) đang bị axe báo «label-content-name-mismatch» với tên tài khoản thử này — có từ trước, ngoài phạm vi ADR-0221.
    await axeVung(p, "#noi-don-cai-dat", `khối công tắc ${hau}`);
    loiConsole(p, "trang Tôi");
  });
  p.close();

  // ---- 2. Đối tác: bấm «Đón» không hiện ô nào của lượt ----
  p = await moFormVaChonDon(khung);
  let donId = "";
  await b.step(`${hau}-2`, `${hau}: Đối tác bấm «Đón» → chỉ còn hai nút «Đón», «Không đón» và ô «Ghi chú đưa đón»; lượt vẫn nằm trong cây DOM nhưng không ô nào của lượt hiện; không lỗi${axeNote()}`, async () => {
    const k = await khoiDuaDon(p);
    assert.ok(k, "có khối Đưa đón");
    assert.equal(k.anHet, true, JSON.stringify(k));
    assert.equal(k.chiNoiDon, false);
    assert.equal(k.soLuotTrongDom, 1, "bấm «Đón» vẫn tạo lượt chiều đi");
    assert.equal(k.oLuotHien, 0, `không phần tử nào của lượt hiện — ${JSON.stringify(k)}`);
    assert.deepEqual(k.nut, ["Đón:true", "Không đón:false"]);
    assert.deepEqual(k.loiHien, []);
    assert.equal(await hien(p, '#services .svc [data-trip-gon="note"]'), true, "ô ghi chú đưa đón hiện");
    await p.ev(typeInto('#services .svc [data-trip-gon="note"]', GHI_CHU));
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `02-form-doi-tac-bat-${hau}`, khung);
    await axe(p, `form đối tác khi bật ${hau}`);
  });
  await b.step(`${hau}-3`, `${hau}: Đối tác bấm «Gửi đơn» → sang trang đơn, đơn chờ văn phòng; lượt lưu chữ tạm; trang đơn ghi «Chưa có nơi đón» và «Văn phòng sẽ điền nơi đón.», không lộ chữ tạm`, async () => {
    await p.ev("document.getElementById('save').click(); true");
    try {
      await p.waitFor("location.pathname === '/order' && !!new URLSearchParams(location.search).get('id')", "chuyển tới /order?id=… sau khi gửi", 15000);
    } catch (e) {
      throw new Error(`${e.message}\n#save-error: ${await p.ev("document.getElementById('save-error')?.textContent ?? ''").catch(() => "?")}`);
    }
    donId = await p.ev("new URLSearchParams(location.search).get('id')");
    await p.waitFor(`document.querySelector('main').innerText.includes('Tổng cộng')`, "trang đơn", 12000);
    await sleep(600);
    const tra = await fetchTrang(p, "GET", `/api/orders/${donId}`);
    dung(tra, 200, "đối tác đọc đơn vừa gửi");
    const r = tra.json;
    assert.ok(r.order, `thân phản hồi: ${tra.text.slice(0, 300)}`);
    const leg = r.order.services[0].legs[0];
    assert.equal(leg.pickupLocationId, null);
    assert.equal(leg.pickupPlace, CHU_TAM, "máy chủ ghi chữ tạm");
    assert.ok(r.xacNhan?.yeuCau, `đơn đang chờ văn phòng — ${JSON.stringify(r.xacNhan).slice(0, 200)}`);
    assert.equal(await coChu(p, "Chưa có nơi đón"), true);
    assert.equal(await coChu(p, "Văn phòng sẽ điền nơi đón."), true);
    assert.equal(await coChu(p, CHU_TAM), false, "không lộ chữ tạm");
    assert.equal(await p.ev(noOverflowX), true);
    await chup(p, `03-don-doi-tac-cho-${hau}`, khung);
    loiConsole(p, "đối tác");
  });
  p.close();

  // ---- 4. Bán hàng: bảng «Xác nhận đơn» ----
  p = await env.as(BAN, `/order?id=${donId}`, khung);
  await p.waitFor(`!!document.querySelector('[data-action="quyet-dinh-con-ve"]')`, "bảng quyết định", 12000);
  const legId = (await fetchTrang(p, "GET", `/api/orders/${donId}`)).json.order.services[0].legs[0].id;
  const O_NOI = `#cx-noi-${legId}`;
  await b.step(`${hau}-4`, `${hau}: Bán hàng thấy ô «Nơi đón … (bắt buộc)» cỡ 16px và ghi chú của đối tác; bấm «Còn vé, xác nhận đơn» khi thiếu → «Ghi nơi đón cho lượt này.» tại lượt, KHÔNG gọi máy chủ${axeNote()}`, async () => {
    assert.equal(await hien(p, O_NOI), true, "ô nơi đón hiện");
    assert.equal(await p.ev(`getComputedStyle(document.querySelector(${JSON.stringify(O_NOI)})).fontSize`), "16px");
    assert.equal(await p.ev(`document.querySelector('label[for="cx-noi-${legId}"] .cx-nhan').textContent`), `Nơi đón · Chiều đi · ${TEN_DV} (bắt buộc)`);
    assert.equal(await docTxt(p, '[data-khoi="ghi-chu-dich-vu"] .cx-ghi-chu-dv'), GHI_CHU, "người xét đọc được ghi chú đưa đón của đối tác ngay trong bảng");
    assert.equal(await coChu(p, "Chưa có nơi đón"), true, "khối Đưa đón của Chi tiết đơn ghi «Chưa có nơi đón»");
    assert.equal(await coChu(p, CHU_TAM), false);
    assert.equal(await coChu(p, "Văn phòng sẽ điền nơi đón."), false, "câu nhắc chỉ dành cho tài khoản Đối tác");
    const truoc = apiCalls(p).filter((x) => x.path.endsWith("/quyet-dinh")).length;
    await p.ev(click('[data-action="quyet-dinh-con-ve"]'));
    await sleep(500);
    assert.equal(await docTxt(p, `#cx-noi-${legId}-loi`), "Ghi nơi đón cho lượt này.");
    assert.equal(await p.ev(`document.querySelector(${JSON.stringify(O_NOI)}).getAttribute('aria-invalid')`), "true");
    assert.equal(await p.ev(`document.activeElement?.id`), `cx-noi-${legId}`, "tiêu điểm vào ô nơi đón");
    assert.equal(await p.ev(`!!document.querySelector('.sheet-foot-xac-nhan')`), false, "chưa mở hộp hỏi lại");
    assert.equal(apiCalls(p).filter((x) => x.path.endsWith("/quyet-dinh")).length, truoc, "không gọi máy chủ");
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(noOverflowX), true);
    await p.ev(`document.querySelector('[data-khoi="xac-nhan-don"]').scrollIntoView({ block: 'start' })`);
    await chup(p, `04-con-ve-thieu-noi-don-${hau}`, khung);
    await axe(p, `bảng Còn vé ${hau}`);
  });
  // Khổ 390: gõ tự do; khổ 1280: chọn điểm danh mục — hai đường gửi `pickupPlace` / `pickupLocationId`.
  const goTuDo = khung.mobile;
  const NOI_GO = "12 Trần Phú, Nha Trang";
  await b.step(`${hau}-5`, `${hau}: điền nơi đón (${goTuDo ? "gõ tự do" : "chọn điểm danh mục"}) + chọn giờ → «Còn vé, xác nhận đơn» → đơn đã xác nhận, lượt có nơi đón thật, Chi tiết đơn không còn «Chưa có nơi đón»`, async () => {
    await p.ev(`document.querySelector(${JSON.stringify(O_NOI)}).click(); document.querySelector(${JSON.stringify(O_NOI)}).focus(); true`);
    let nhanDiem = null;
    if (goTuDo) {
      await p.ev(typeInto(O_NOI, NOI_GO));
      await sleep(200);
      await p.ev(`document.querySelector(${JSON.stringify(O_NOI)}).blur(); true`); // rời ô: chữ đã gõ được giữ thành địa chỉ gõ tự do
    } else {
      await p.waitFor(`document.querySelectorAll('#cx-noi-${legId}-ds [role=option]:not(.dd-goi-y-tu-do)').length > 0`, "danh sách điểm danh mục", 8000);
      nhanDiem = await p.ev(`(() => { const li = document.querySelector('#cx-noi-${legId}-ds [role=option]:not(.dd-goi-y-tu-do)'); const t = li.querySelector('.dd-goi-y-ten').textContent; li.click(); return t; })()`);
    }
    await sleep(300);
    assert.notEqual(await p.ev(`document.querySelector(${JSON.stringify(O_NOI)}).value`), "", "ô hiện nơi vừa ghi");
    await p.waitFor(`document.querySelector('#cx-gio-${legId}').options.length > 2`, "khung giờ đón đã nạp", 8000);
    await p.ev(`(() => { const s = document.querySelector('#cx-gio-${legId}'); s.value = s.options[1].value; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await chup(p, `05-con-ve-da-dien-${hau}`, khung);
    await p.ev(click('[data-action="quyet-dinh-con-ve"]'));
    await p.waitFor(`!!document.querySelector('.sheet-foot-xac-nhan .btn-danger')`, "hộp hỏi lại trước Còn vé, xác nhận đơn", 8000);
    await p.ev(click(".sheet-foot-xac-nhan .btn-danger"));
    try {
      await p.waitFor(`!document.querySelector('[data-action="quyet-dinh-con-ve"]')`, "bảng quyết định biến mất", 12000);
    } catch (e) {
      throw new Error(`${e.message}\ncâu lỗi của bảng: ${await docTxt(p, '[data-khoi="xac-nhan-don"]')}`);
    }
    const o = (await fetchTrang(p, "GET", `/api/orders/${donId}`)).json.order;
    assert.equal(o.status, "confirmed");
    const leg = o.services[0].legs[0];
    if (goTuDo) assert.equal(leg.pickupPlace, NOI_GO);
    else assert.ok(leg.pickupLocationId, "lượt mang điểm danh mục");
    assert.notEqual(leg.pickupLabel, CHU_TAM);
    await sleep(500);
    assert.equal(await coChu(p, "Chưa có nơi đón"), false);
    assert.equal(await coChu(p, goTuDo ? NOI_GO : nhanDiem), true, "Chi tiết đơn hiện nơi đón thật");
    await chup(p, `06-don-da-xac-nhan-${hau}`, khung);
    loiConsole(p, "bán hàng");
  });
  p.close();

  // ---- 6. Toàn quyền tắt công tắc → form đối tác trở lại có ô «Nơi đón» ----
  p = await env.as(CHU, "/account", khung);
  await p.waitFor(`!!document.querySelector('#noi-don-cai-dat:not([hidden]) #noi-don-doi')`, "khối công tắc hiện", 12000);
  await b.step(`${hau}-6`, `${hau}: Toàn quyền bấm «Tắt đối tác không nhập nơi đón» → «Đang tắt.»`, async () => {
    await p.ev(click("#noi-don-doi"));
    await p.waitFor(`document.querySelector('#noi-don-trang-thai')?.textContent === 'Đang tắt.'`, "công tắc tắt", 8000);
    assert.equal((await goi(DOITAC, "GET", "/api/cai-dat/noi-don-doi-tac")).json.apChoToi, false);
  });
  p.close();
  p = await moFormVaChonDon(khung);
  await b.step(`${hau}-7`, `${hau}: công tắc tắt — Đối tác bấm «Đón» → ô «Nơi đón» hiện lại (chế độ một ô), «Gửi đơn» khi chưa điền bị chặn bởi «chưa có nơi đón»`, async () => {
    const k = await khoiDuaDon(p);
    assert.equal(k.anHet, false, JSON.stringify(k));
    assert.equal(k.chiNoiDon, true);
    assert.equal(k.oNoiDonHien, 1, "đúng một ô «Nơi đón» đang hiện");
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("!document.getElementById('save-error').hidden && document.getElementById('save-error').textContent.includes('chưa có nơi đón')", "dải đỏ thiếu nơi đón", 8000);
    assert.equal(await p.ev("location.pathname"), "/order-form", "chưa lưu");
    await chup(p, `07-form-doi-tac-tat-${hau}`, khung);
  });
  p.close();
};

try {
  await buoc(MOB, "390");
  await buoc(DESK_RONG, "1280");
} finally {
  await env.stop?.();
}
b.xong();
