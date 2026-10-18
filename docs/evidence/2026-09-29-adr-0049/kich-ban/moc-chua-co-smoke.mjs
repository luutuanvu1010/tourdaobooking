// N-B-3 — 503 `moc_toi_thieu_chua_co` (ADR-0049 D2, I25: chưa có chính sách điều phối đang hiệu lực thì CHẶN, không đoán mốc) ở giao diện: lưu nháp có giờ đón,
// xác nhận đơn, sửa thông tin chuyến đơn đã xác nhận → dải đỏ câu của máy chủ + dòng nói việc cần làm; biểu mẫu không cảnh báo mốc (route mốc 503); Toàn quyền
// lưu bản chính sách đầu tiên thì mọi thứ chạy lại.
// DỰNG "CHÍNH SÁCH RỖNG" TRÊN D1 TẠM CỦA KỊCH BẢN (không sửa máy chủ, không sửa migration): bảng `vc_dispatch_policy` chỉ-thêm có trigger chặn xoá → kịch bản
// `DROP TRIGGER vc_dispatch_policy_no_delete` rồi `DELETE` các dòng, CHỈ trên D1 tạm (tạo mới mỗi lần chạy, xoá khi xong). Trên production không có đường nào
// làm rỗng bảng này — ca này chứng minh giao diện hiện đúng câu nếu máy chủ trả 503.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/moc-chua-co-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Bán hàng → Quản trị → Toàn quyền.
import { ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, shown, txt, typeInto, vnDate } from "./dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("MOC CHUA CO SMOKE");
const MAI = vnDate(1);
const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
const base = { customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "" };
const svc = (ngay, gio) => ({ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, ...NO_TRIP, departDate: ngay, pickupTime: gio, pickupPlace: "Sheraton Nha Trang" });
const CAU_503 = "Chưa có chính sách điều phối đang hiệu lực (hạn chốt trước giờ đón) — báo người phụ trách hệ thống.";
const DONG_503 = "Chưa lưu, xác nhận hay sửa chuyến có giờ đón được cho tới khi Toàn quyền đặt chính sách điều phối.";

try {
  // ---- dữ liệu dựng khi CÒN chính sách (bản gieo 6 giờ) ----
  let r = await call(ACCOUNTS.salesA, "POST", "/api/orders", { ...base, customerName: "Khách Nháp", customerPhone: "0903 000 211", services: [svc(MAI, "10:00")] });
  assert.equal(r.status, 201, r.text);
  const nhap = r.json.order;
  r = await call(ACCOUNTS.admin, "POST", "/api/orders", { ...base, customerName: "Khách Đã Xác Nhận", customerPhone: "0903 000 212", services: [svc(vnDate(3), "09:00")] });
  assert.equal(r.status, 201, r.text);
  const daXn = r.json.order;
  r = await call(ACCOUNTS.admin, "POST", `/api/orders/${daXn.id}/status`, { status: "confirmed" });
  assert.equal(r.status, 200, r.text);
  // ---- làm rỗng chính sách trên D1 TẠM ----
  env.sql("DROP TRIGGER vc_dispatch_policy_no_delete");
  env.sql("DELETE FROM vc_dispatch_policy");
  r = await call(ACCOUNTS.salesA, "GET", "/api/orders/moc-toi-thieu");
  assert.deepEqual([r.status, r.json?.error?.code], [503, "moc_toi_thieu_chua_co"], "chuẩn bị: máy chủ báo chưa có mốc");

  // ---- Bán hàng ----
  const s = await env.as(ACCOUNTS.salesA, "/order-form", DESK);
  await b.step("1", `Biểu mẫu (1040, Bán hàng): route mốc 503 → không dải cảnh báo mốc; bấm Lưu → 503 → dải đỏ câu máy chủ + '${DONG_503}'; không tạo đơn${axeNote()}`, async () => {
    await s.waitFor(`!!document.getElementById('catalog-q')`, "ô tìm danh mục");
    await s.ev("document.getElementById('catalog-q').focus(); true");
    await s.ev(typeInto("#catalog-q", "TD101"));
    await s.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "TD101");
    await s.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await s.waitFor(`document.querySelectorAll('#services .svc').length === 1`, "thẻ dịch vụ");
    await s.ev(typeInto("#orderDate", MAI));
    await s.ev(typeInto(`#services .svc [data-trip="pickupPlace"]`, "Sheraton Nha Trang"));
    await s.ev(typeInto(`#services .svc [data-trip="pickupTime"]`, "10:00"));
    await s.ev(typeInto("#customerName", "Khách Trên Biểu Mẫu"));
    await s.ev(typeInto("#customerPhone", "0903 000 213"));
    assert.ok(apiCalls(s).some((c) => c.method === "GET" && c.path === "/api/orders/moc-toi-thieu"), "biểu mẫu có hỏi route mốc");
    assert.equal(await s.ev(`!!document.querySelector('#services .dg-warn')`), false, "không có mốc thì không cảnh báo (không đoán)");
    await s.ev(click("#save"));
    await s.waitFor(`${txt("#save-error .banner-title")} === ${JSON.stringify(CAU_503)}`, "dải 503 trên biểu mẫu");
    assert.deepEqual(await s.ev(`[...document.querySelectorAll('#save-error .banner-lines li')].map((l) => l.textContent)`), [DONG_503]);
    assert.equal(await s.ev(`document.getElementById('save-error').classList.contains('banner-danger')`), true);
    assert.equal(await s.ev("location.pathname"), "/order-form", "không chuyển trang — đơn chưa lưu");
    assert.equal(await s.ev(noCode), "");
    await axe(s, "biểu mẫu 503");
    await shotFull(s, "b7-503-bieu-mau-may-tinh.png");
  });

  await b.step("2", "Trang đơn nháp (1040, Bán hàng): không có mốc → không khoá Xác nhận; bấm → 503 → dải đỏ câu máy chủ + dòng việc cần làm; đơn vẫn nháp", async () => {
    await s.send("Page.navigate", { url: `${env.base}/order?id=${nhap.id}` });
    await s.waitFor(`[...document.querySelectorAll('#actions button')].some((x) => x.textContent === 'Xác nhận đơn')`, "trang đơn nháp");
    assert.equal(await s.ev(`[...document.querySelectorAll('#actions button')].find((x) => x.textContent === 'Xác nhận đơn').disabled`), false);
    assert.equal(await s.ev(`!!document.querySelector('#order .dg-warn')`), false);
    await s.ev("window.confirm = () => true; true");
    await s.ev(`[...document.querySelectorAll('#actions button')].find((x) => x.textContent === 'Xác nhận đơn').click(); true`);
    await s.waitFor(`${txt("#error .banner-title")} === ${JSON.stringify(CAU_503)}`, "dải 503 trang đơn");
    assert.deepEqual(await s.ev(`[...document.querySelectorAll('#error .banner-lines li')].map((l) => l.textContent)`), [DONG_503]);
    assert.equal((await call(ACCOUNTS.salesA, "GET", `/api/orders/${nhap.id}`)).json.order.status, "draft");
    await axe(s, "trang đơn 503");
    await shotFull(s, "b7-503-don-may-tinh.png");
  });
  s.close();
  const sm = await env.as(ACCOUNTS.salesA, `/order?id=${nhap.id}`, MOB);
  await b.step("3", "390 Bán hàng: cùng dải 503 sau khi bấm Xác nhận; không tràn ngang", async () => {
    await sm.waitFor(`[...document.querySelectorAll('#actions button')].some((x) => x.textContent === 'Xác nhận đơn')`, "trang đơn 390");
    await sm.ev("window.confirm = () => true; true");
    await sm.ev(`[...document.querySelectorAll('#actions button')].find((x) => x.textContent === 'Xác nhận đơn').click(); true`);
    await sm.waitFor(`${txt("#error .banner-title")} === ${JSON.stringify(CAU_503)}`, "dải 503 (390)");
    assert.ok(await sm.ev(noOverflowX));
    await axe(sm, "trang đơn 503 390");
    await shotView(sm, "b7-503-don-dien-thoai.png");
  });
  sm.close();

  // ---- Quản trị ----
  const a = await env.as(ACCOUNTS.admin, `/order?id=${daXn.id}`, DESK);
  await b.step("4", "Sửa thông tin chuyến đơn đã xác nhận (Quản trị): đổi giờ đón → 503 → dải đỏ trong bảng, KHÔNG khung Đặt gấp (không phải 409); không lưu", async () => {
    await a.waitFor(shown('[data-action="edit-trip"]'), "nút sửa chuyến");
    await a.ev(click('[data-action="edit-trip"]'));
    await a.waitFor(shown('.sheet [data-trip="pickupTime"]'), "bảng sửa chuyến");
    await a.ev(typeInto('.sheet [data-trip="pickupTime"]', "09:30"));
    await a.ev(`[...document.querySelectorAll('.sheet .sheet-foot button')].find((x) => x.textContent === 'Lưu thông tin chuyến').click(); true`);
    await a.waitFor(`${txt(".sheet .banner .banner-title")} === ${JSON.stringify(CAU_503)}`, "dải 503 trong bảng");
    assert.deepEqual(await a.ev(`[...document.querySelectorAll('.sheet .banner .banner-lines li')].map((l) => l.textContent)`), [DONG_503]);
    assert.equal(await a.ev(`!!document.querySelector('.sheet .dg-panel')`), false, "503 không mở khung Đặt gấp");
    assert.equal((await call(ACCOUNTS.admin, "GET", `/api/orders/${daXn.id}`)).json.order.services[0].legs[0].pickupTime, "09:00", "không lưu");
    await a.ev("new Promise((r) => setTimeout(r, 600))"); // bảng ≥ 641px hiện dần — chờ xong rồi mới đo tương phản
    await axe(a, "bảng sửa chuyến 503");
    await shotView(a, "b7-503-sua-chuyen-may-tinh.png");
  });
  a.close();

  // ---- Toàn quyền: lưu bản chính sách đầu tiên → chạy lại ----
  const c = await env.as(CHU, "/chinh-sach-dieu-phoi", DESK);
  await b.step("5", "Chính sách điều phối khi CHƯA có bản nào: ô trống, lịch sử 'Chưa có bản nào.'; lưu bản đầu (6 giờ, 2 giờ, 30, 180) → 'Bản 1 Đang dùng'; sau đó route mốc 200 và xác nhận được đơn nháp", async () => {
    await c.waitFor(shown("#cs-form .dp-cs-nums"), "form chính sách");
    assert.deepEqual(await c.ev(`['mocGio','satMocGio','nghiPhut','khaiLuiPhut'].map((t) => document.querySelector('#cs-' + t).value)`), ["", "", "", ""]);
    assert.equal(await c.ev(txt("#cs-lich-su .dp-hist-row")), "Chưa có bản nào.");
    for (const [t, v] of [["mocGio", "6"], ["satMocGio", "2"], ["nghiPhut", "30"], ["khaiLuiPhut", "180"]]) await c.ev(typeInto(`#cs-${t}`, v));
    await c.ev(click(".dp-cs-actions button[type=submit]"));
    await c.waitFor(`${txt("#cs-ok")} === 'Đã lưu bản mới — có hiệu lực từ bây giờ.'`, "lưu bản đầu");
    assert.match(await c.ev(txt("#cs-lich-su .dp-hist-row")), /^Bản 1 Đang dùng Hiệu lực từ /);
    const m = await call(ACCOUNTS.salesA, "GET", "/api/orders/moc-toi-thieu");
    assert.deepEqual([m.status, m.json.mocToiThieuPhut], [200, 360]);
    const x = await call(ACCOUNTS.salesA, "POST", `/api/orders/${nhap.id}/status`, { status: "confirmed" });
    assert.equal(x.status, 200, x.text);
    await axe(c, "chính sách chưa có bản → bản 1");
  });
  await b.step("6", "Không lỗi console ngoài 503 cố ý", async () => {
    for (const [ten, pg] of [["bán hàng", s], ["bán hàng 390", sm], ["quản trị", a], ["toàn quyền", c]]) {
      const loi = pg.consoleErrors.filter((e) => !/Failed to load resource: the server responded with a status of (40[13]|503)/.test(e));
      assert.deepEqual(loi, [], ten);
    }
  });
  c.close();
} finally {
  b.xong();
  await env.stop();
}
