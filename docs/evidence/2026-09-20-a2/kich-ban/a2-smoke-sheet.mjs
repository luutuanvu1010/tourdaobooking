// Kiểm bảng "Sửa thông tin chuyến" bằng Chrome thật. Chạy từ GỐC repo:
//   npm run build:web && CHROME_BIN=<đường dẫn tuyệt đối tới kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-sheet.mjs
import assert from "node:assert/strict";
import { ACCOUNTS, clickText, ok, setInput, startEnv, vnDate } from "./a2-cdp.mjs";

const env = await startEnv();
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, {
      method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const pax = (adult, child = 0) => ({ adult, child, senior: 0, infant: 0 });
  const dmy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

  // đơn đã xác nhận: dịch vụ danh mục (đủ trường chuyến) + dịch vụ nhập tay
  const created = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách Bảng Trượt", customerPhone: "0904 111 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [
      { kind: "catalog", catalogCode: "TD101", pax: pax(2, 1), unitPrices: { adult: 1350000, child: 950000 }, catalogPriceSeen: { adult: 1350000, child: 950000 }, ...NO_TRIP, departDate: vnDate(10), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", checkinTime: "09:00", note: "Đón sớm" },
      { kind: "manual", name: "Xe đưa đón riêng", pax: pax(3), items: [{ description: "Xe 7 chỗ 2 chiều", detail: "", quantity: 1, unitPrice: 800000 }], ...NO_TRIP, departDate: vnDate(12), pickupPlace: "Khách sạn Sunrise" },
    ],
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const orderId = created.json.order.id;
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${orderId}/status`, { status: "confirmed" })).status, 200);
  const getOrder = async () => (await call(ACCOUNTS.salesA, "GET", `/api/orders/${orderId}`)).json;
  const tripOf = (s, o = {}) => ({ id: s.id, departDate: s.departDate ?? "", departTime: s.departTime ?? "", pickupTime: s.pickupTime ?? "", pickupPlace: s.pickupPlace ?? "", checkinDate: s.checkinDate ?? "", checkinTime: s.checkinTime ?? "", checkinPlace: s.checkinPlace ?? "", note: s.note ?? "", ...o });
  const before = (await getOrder()).order;

  const sheet = "document.querySelector('.sheet')";
  const group = (i) => `document.querySelectorAll('.sheet .sheet-svc')[${i}]`;
  const field = (i, k) => `${group(i)}.querySelector('[data-trip="${k}"]')`;
  const open = async (p) => {
    await p.ev(clickText("#actions", "Sửa thông tin chuyến"));
    await p.waitFor("document.querySelector('.sheet-root.open') !== null", "bảng mở");
  };
  const closed = "document.querySelector('.sheet-root') === null";
  const facts = (i) => `[...document.querySelectorAll('#order .svc-view')[${i}].querySelectorAll('.svc-facts .kv')].map((k) => [k.children[0].textContent, k.children[1].textContent])`;

  // ---- 1) nút và cấu trúc bảng (khổ iPhone) ----
  let p = await env.as(ACCOUNTS.salesA, `/order?id=${orderId}`);
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 2", "đơn nạp");
  assert.deepEqual(await p.ev("[...document.querySelectorAll('#actions .btn')].map((b) => b.textContent)"), ["Sửa thông tin chuyến", "Huỷ đơn"]);
  await open(p);
  assert.equal(await p.ev(`${sheet}.getAttribute('role')`), "dialog");
  assert.equal(await p.ev(`${sheet}.getAttribute('aria-modal')`), "true");
  assert.equal(await p.ev(`document.getElementById(${sheet}.getAttribute('aria-labelledby')).textContent`), "Sửa thông tin chuyến");
  assert.equal(await p.ev("document.body.classList.contains('sheet-open')"), true, "khoá cuộn nền");
  assert.equal(await p.ev("['main', '#topbar'].every((s) => document.querySelector(s).hasAttribute('inert'))"), true, "nền inert");
  assert.equal(await p.ev(`${sheet}.contains(document.activeElement)`), true, "focus đã vào bảng");
  assert.match(await p.ev(`${sheet}.querySelector('.sheet-warn').textContent`), /Bản xác nhận đã gửi khách trước đó có thể lỗi thời — cần gửi lại\./);
  assert.deepEqual(await p.ev("[...document.querySelectorAll('.sheet .sheet-svc .svc-name')].map((e) => e.textContent)"), ["Tour 4 đảo Nha Trang", "Xe đưa đón riêng"]);
  const vals = (i) => p.ev(`['departDate', 'departTime', 'pickupTime', 'pickupPlace', 'checkinDate', 'checkinTime', 'checkinPlace', 'note'].map((k) => ${field(i, "' + k + '")}.value)`);
  assert.deepEqual(await vals(0), [vnDate(10), "07:30", "07:00", "Bến Cầu Đá", "", "09:00", "", "Đón sớm"]);
  assert.deepEqual(await vals(1), [vnDate(12), "", "", "Khách sạn Sunrise", "", "", "", ""]);
  assert.match(await p.ev(`${group(0)}.querySelector('label:has([data-trip="departDate"])').textContent`), /Ngày khởi hành \(không được xoá\)/);
  assert.match(await p.ev(`${group(0)}.querySelector('label:has([data-trip="checkinDate"])').textContent`), /Để trống = cùng ngày khởi hành\./);
  await p.waitFor(`(() => { const r = ${sheet}.getBoundingClientRect(); return Math.abs(r.bottom - innerHeight) < 1 && Math.abs(r.width - innerWidth) < 1; })()`, "bảng trượt lên sát đáy, rộng hết màn hình");
  ok("bảng mở: dialog + aria-modal, nền inert, khoá cuộn, focus trong bảng, ô điền sẵn ĐẦY ĐỦ, sát đáy ở 390px");

  // ---- 2) ba cách đóng, trả focus về nút mở ----
  const restored = "document.activeElement.dataset.action === 'edit-trip' && !document.querySelector('[inert]') && !document.body.classList.contains('sheet-open')";
  await p.ev("document.querySelector('.sheet-close').click(); true");
  await p.waitFor(`${closed} && ${restored}`, "đóng bằng ✕ + trả focus + hết inert");
  await open(p);
  await p.ev("document.querySelector('.sheet-scrim').click(); true");
  await p.waitFor(`${closed} && ${restored}`, "đóng bằng chạm nền");
  await open(p);
  await p.ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); true");
  await p.waitFor(`${closed} && ${restored}`, "đóng bằng Esc");
  ok("đóng bằng ✕, chạm nền, Esc: bảng biến mất, hết inert/khoá cuộn, focus về nút 'Sửa thông tin chuyến'");

  // ---- 3) chặn Lưu phía trình duyệt: không gửi gì lên máy chủ ----
  await open(p);
  await p.ev(setInput(field(1, "departDate"), ""));
  await p.ev(clickText(".sheet", "Lưu thông tin chuyến"));
  await p.waitFor("/Xe đưa đón riêng: ngày khởi hành không được để trống\\./.test(document.querySelector('.sheet .field-errors').textContent)", "lỗi ngày trống");
  assert.equal(await p.ev("document.querySelectorAll('.sheet .field-error svg').length"), 1, "lỗi có biểu tượng, không chỉ màu");
  await p.ev(setInput(field(1, "departDate"), vnDate(400)));
  await p.waitFor("/ngày khởi hành phải từ \\d\\d\\/\\d\\d\\/\\d{4} đến \\d\\d\\/\\d\\d\\/\\d{4}\\./.test(document.querySelector('.sheet .field-errors').textContent)", "lỗi ngoài khoảng (cập nhật theo lần gõ)");
  assert.equal((await getOrder()).order.updatedAt, before.updatedAt, "bị chặn: máy chủ không nhận gì");
  ok("Lưu bị chặn: ngày trống và ngày ngoài khoảng → lỗi chữ + biểu tượng, đơn ở máy chủ không đổi");

  // ---- 4) mất mạng: giữ nguyên dữ liệu đã gõ ----
  await p.ev(setInput(field(1, "departDate"), vnDate(13)));
  await p.waitFor("document.querySelector('.sheet .field-errors').childElementCount === 0", "hết lỗi khi ngày hợp lệ");
  await p.ev("window.__fetch = window.fetch; window.fetch = () => Promise.reject(new TypeError('offline')); true");
  await p.ev(clickText(".sheet", "Lưu thông tin chuyến"));
  await p.waitFor("!document.querySelector('.sheet .banner').hidden && /Không kết nối được máy chủ\\./.test(document.querySelector('.sheet .banner').textContent)", "banner mất mạng");
  assert.equal(await p.ev(`${field(1, "departDate")}.value`), vnDate(13), "dữ liệu đã gõ còn nguyên");
  assert.equal(await p.ev("document.querySelector('.sheet-foot .btn').disabled"), false, "nút Lưu bật lại");
  await p.ev("window.fetch = window.__fetch; true");
  ok("mất mạng: banner nguy hiểm, dữ liệu đã gõ còn nguyên, nút Lưu bật lại");

  // ---- 4b) đang lưu thì KHÔNG đóng được bảng (đóng sẽ nuốt lỗi của máy chủ): ✕, chạm nền, Esc bị bỏ qua; lỗi hiện ngay trong bảng ----
  await p.ev("window.fetch = () => new Promise((r) => setTimeout(() => r(new Response(JSON.stringify({ error: { code: 'boom', message: 'Lỗi thử từ máy chủ.' } }), { status: 500, headers: { 'content-type': 'application/json' } })), 1200)); true");
  await p.ev(clickText(".sheet", "Lưu thông tin chuyến"));
  await p.waitFor("document.querySelector('.sheet-foot .btn').textContent === 'Đang lưu…'", "đang lưu");
  await p.ev("document.querySelector('.sheet-close').click(); document.querySelector('.sheet-scrim').click(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); true");
  assert.equal(await p.ev("document.querySelector('.sheet') !== null"), true, "đang lưu: ✕, chạm nền và Esc bị bỏ qua");
  await p.waitFor("!document.querySelector('.sheet .banner').hidden && /Lỗi thử từ máy chủ\\./.test(document.querySelector('.sheet .banner').textContent)", "lỗi của máy chủ hiện trong bảng (không bị nuốt)");
  await p.ev("window.fetch = window.__fetch; true");
  ok("đang lưu: ✕, chạm nền, Esc bị bỏ qua; lỗi 500 của máy chủ hiện trong bảng, không bị nuốt");

  // ---- 5) lưu thành công: PUT gửi MỌI dịch vụ, '' xoá trường, phần còn lại nguyên vẹn ----
  await p.ev(setInput(field(1, "pickupTime"), "06:45"));
  await p.ev(setInput(field(0, "pickupPlace"), "")); // xoá điểm đón
  await p.ev(setInput(field(0, "note"), "Đổi giờ đón"));
  await p.ev(clickText(".sheet", "Lưu thông tin chuyến"));
  await p.waitFor(`${closed} && !document.getElementById('error').hidden && /Đã lưu thông tin chuyến\\./.test(document.getElementById('error').textContent)`, "đóng bảng + banner đã lưu", 15000);
  assert.equal(await p.ev("document.getElementById('error').classList.contains('banner-info')"), true);
  assert.equal(await p.ev("document.activeElement.dataset.action === 'edit-trip'"), true, "focus về nút mới sau khi tải lại");
  assert.deepEqual(await p.ev(facts(1)), [["Số khách", "3 khách"], ["Khởi hành", dmy(vnDate(13))], ["Đón", "06:45 · Khách sạn Sunrise"]]);
  assert.deepEqual(await p.ev(facts(0)), [["Số khách", "2 người lớn · 1 trẻ em"], ["Khởi hành", `${dmy(vnDate(10))} · 07:30`], ["Đón", "07:00"], ["Check-in", "Cùng ngày khởi hành · 09:00"], ["Ghi chú", "Đổi giờ đón"]]);
  const after = await getOrder();
  const [s0, s1] = after.order.services;
  assert.deepEqual([s0.departDate, s0.departTime, s0.pickupTime, s0.pickupPlace, s0.checkinTime, s0.note], [vnDate(10), "07:30", "07:00", null, "09:00", "Đổi giờ đón"], "dịch vụ 1: xoá đúng điểm đón, phần khác nguyên vẹn");
  assert.deepEqual([s1.departDate, s1.pickupTime, s1.pickupPlace], [vnDate(13), "06:45", "Khách sạn Sunrise"]);
  assert.equal(after.order.status, "confirmed");
  assert.deepEqual([after.order.total, after.order.subtotal, s0.pax.adult, s1.items[0].unitPrice], [before.total, before.subtotal, 2, 800000], "tiền và số khách không đổi");
  assert.notEqual(after.order.updatedAt, before.updatedAt);
  assert.equal(after.history.at(-1).action, "trip_updated");
  ok("lưu thành công: banner 'Đã lưu…', focus về nút, PUT đủ mọi dịch vụ ('' xoá điểm đón), phần khác/tiền/số khách nguyên vẹn, nhật ký trip_updated");

  // ---- 6) đơn đã đổi ở nơi khác → stale: bản đang gõ nói rõ sẽ mất, nút tải lại ----
  await open(p);
  const d = (await getOrder()).order;
  const other = await call(ACCOUNTS.salesA, "PUT", `/api/orders/${orderId}/trip`, { expectedUpdatedAt: d.updatedAt, services: [tripOf(d.services[0]), tripOf(d.services[1], { pickupPlace: "Bến Ninh Chữ" })] });
  assert.equal(other.status, 200, JSON.stringify(other.json));
  await p.ev(setInput(field(0, "note"), "Xung đột"));
  await p.ev(clickText(".sheet", "Lưu thông tin chuyến"));
  await p.waitFor("!document.querySelector('.sheet .banner').hidden && /Đơn vừa được người khác sửa/.test(document.querySelector('.sheet .banner').textContent)", "banner stale trong bảng");
  assert.match(await p.ev("document.querySelector('.sheet .banner').textContent"), /Tải lại sẽ bỏ các thay đổi bạn đang gõ\./);
  assert.equal(await p.ev("document.querySelector('.sheet') !== null"), true, "bảng vẫn mở");
  await p.ev(clickText(".sheet .banner", "Tải lại đơn"));
  await p.waitFor(`${closed} && /Bến Ninh Chữ/.test(document.getElementById('order').textContent)`, "tải lại: thấy bản của người kia", 15000);
  assert.deepEqual((await p.ev(facts(0)))[4], ["Ghi chú", "Đổi giờ đón"], "bản đang gõ đã bỏ");
  ok("stale: banner trong bảng nói rõ sẽ mất bản đang gõ; 'Tải lại đơn' đóng bảng và nạp bản mới");

  // ---- 7) chuyển động: bảng trượt bình thường, tắt khi prefers-reduced-motion ----
  await open(p);
  assert.notEqual(await p.ev(`getComputedStyle(${sheet}).transitionDuration`), "0s", "có chuyển động mặc định");
  await p.ev("document.querySelector('.sheet-close').click(); true");
  await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await open(p);
  assert.equal(await p.ev(`getComputedStyle(${sheet}).transitionDuration`), "0s", "prefers-reduced-motion: tắt chuyển động");
  await p.ev("document.querySelector('.sheet-close').click(); true");
  await p.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  ok("chuyển động: có mặc định, tắt khi prefers-reduced-motion");

  // ---- 8) đo (khổ iPhone) ----
  await open(p);
  const m = await p.ev(`(() => {
    const tap = [...document.querySelectorAll('.sheet-close, .sheet-foot .btn')].filter((el) => el.getBoundingClientRect().height < 43.5 || el.getBoundingClientRect().width < 43.5).map((el) => el.className);
    const smallFont = [...document.querySelectorAll('.sheet input, .sheet textarea')].filter((el) => el.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.dataset.trip);
    const body = document.querySelector('.sheet-body');
    const s = body.getBoundingClientRect();
    const clipped = [...document.querySelectorAll('.sheet input, .sheet textarea')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < s.left || r.right > s.right); }).map((el) => el.dataset.trip);
    return { tap, smallFont, clipped, bodyOverflow: body.scrollWidth - body.clientWidth, pageOverflow: document.documentElement.scrollWidth - innerWidth };
  })()`);
  assert.deepEqual(m.tap, [], `vùng chạm < 44px: ${m.tap}`);
  assert.deepEqual(m.smallFont, [], `ô gõ < 16px: ${m.smallFont}`);
  assert.deepEqual(m.clipped, [], `ô thò khỏi bảng: ${m.clipped}`);
  assert.ok(m.bodyOverflow <= 0 && m.pageOverflow <= 0, `tràn ngang: ${JSON.stringify(m)}`);
  assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
  p.close();
  ok("đo: nút ≥ 44px, ô gõ ≥ 16px, không tràn ngang, 0 lỗi console");

  // ---- 9) máy tính (1040): hộp giữa màn hình, rộng đúng --w-sheet ----
  p = await env.as(ACCOUNTS.salesA, `/order?id=${orderId}`, { width: 1040, height: 800, mobile: false });
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 2", "đơn (máy tính)");
  await open(p);
  await p.waitFor(`(() => { const r = ${sheet}.getBoundingClientRect(); return Math.abs((r.left + r.right) / 2 - innerWidth / 2) < 1 && r.bottom < innerHeight - 1 && r.top > 1 && getComputedStyle(${sheet}).opacity === '1'; })()`, "hộp giữa màn hình");
  assert.ok((await p.ev(`${sheet}.getBoundingClientRect().width`)) <= 520.5, "rộng tối đa --w-sheet");
  assert.deepEqual(p.consoleErrors, []);
  p.close();
  ok("máy tính: hộp giữa màn hình, rộng ≤ 520px, 0 lỗi console");

  // ---- 10) đơn nháp/huỷ/người khác KHÔNG có nút ----
  const draft = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách Nháp", customerPhone: "0905 111 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "manual", name: "Xe", pax: pax(1), items: [{ description: "Xe", detail: "", quantity: 1, unitPrice: 100000 }], ...NO_TRIP }],
  });
  p = await env.as(ACCOUNTS.salesA, `/order?id=${draft.json.order.id}`);
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 1", "đơn nháp");
  assert.equal(await p.ev("!!document.querySelector('[data-action=\"edit-trip\"]')"), false, "đơn nháp sửa trong form, không có bảng trượt");
  p.close();
  p = await env.as(ACCOUNTS.salesB, `/order?id=${orderId}`);
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 2", "đơn của người khác");
  assert.equal(await p.ev("!!document.querySelector('[data-action=\"edit-trip\"]')"), false, "không phải chủ đơn: không nút");
  p.close();
  ok("đơn nháp và đơn của người khác không có nút 'Sửa thông tin chuyến'");
} finally {
  await env.stop();
}
console.log("UI SMOKE SHEET OK");
