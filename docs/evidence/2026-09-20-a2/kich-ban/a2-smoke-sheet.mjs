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
  // 2026-09-26 (DK-T3-01): API không nhận dịch vụ nhập tay MỚI → dựng đơn CŨ: lập với TTB06 (1 × 800.000, cùng số tiền với dòng nhập tay cũ) rồi đổi
  // dịch vụ đó thành nhập tay bằng SQL khi đơn CÒN NHÁP (trigger 0008 khoá dịch vụ của đơn đã xác nhận), sau đó mới xác nhận.
  const created = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách Bảng Trượt", customerPhone: "0904 111 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [
      { kind: "catalog", catalogCode: "TD101", pax: pax(2, 1), unitPrices: { adult: 1350000, child: 950000 }, catalogPriceSeen: { adult: 1350000, child: 950000 }, ...NO_TRIP, departDate: vnDate(10), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", checkinTime: "09:00", note: "Đón sớm" },
      { kind: "catalog", catalogCode: "TTB06", pax: pax(1), catalogPriceSeen: { adult: 800000 }, ...NO_TRIP, departDate: vnDate(10), pickupPlace: "Khách sạn Sunrise" },
    ],
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const orderId = created.json.order.id;
  const manualId = created.json.order.services[1].id;
  env.sql(`UPDATE order_service SET catalog_code = NULL, unit = 'manual', name = 'Xe đưa đón riêng', pax_adult = 3 WHERE id = '${manualId}'`);
  env.sql(`UPDATE order_item SET catalog_code = NULL, pax_code = NULL, catalog_price = NULL, description = 'Xe 7 chỗ 2 chiều', detail = NULL WHERE service_id = '${manualId}'`);
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
  const dateField = "document.querySelector('.sheet [data-trip=\"orderDate\"]')"; // ADR-0021: MỘT ô ngày cho cả đơn
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
  // ADR-0047 Phần B (2026-10-01, D4): bảng này KHÔNG còn ô Giờ đón / Điểm đón — sửa ở bảng "Sửa đưa đón".
  assert.equal(await p.ev("document.querySelectorAll('.sheet [data-trip=\"pickupTime\"], .sheet [data-trip=\"pickupPlace\"]').length"), 0);
  const vals = (i) => p.ev(`['departTime', 'checkinDate', 'checkinTime', 'checkinPlace', 'note'].map((k) => ${field(i, "' + k + '")}.value)`);
  assert.deepEqual(await vals(0), ["07:30", "", "09:00", "", "Đón sớm"]);
  assert.deepEqual(await vals(1), ["", "", "", "", ""]);
  assert.equal(await p.ev(`${dateField}.value`), vnDate(10), "một ô ngày cho cả đơn, điền sẵn ngày đã lưu");
  assert.match(await p.ev(`document.querySelector('.sheet label:has([data-trip="orderDate"])').textContent`), /Ngày khởi hành của cả đơn \(không được xoá\)/);
  assert.equal(await p.ev("document.querySelectorAll('.sheet [data-trip=\"departDate\"]').length"), 0, "nhóm dịch vụ không còn ô ngày riêng");
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

  // ---- 2b) nền (scrim): ở khung hình đầu khi mở (chưa có .open) CHƯA nhận chạm; sau .open thì nhận. Chỉ chứng minh trạng thái `pointer-events` (đọc cùng lượt chạy với lệnh mở); KHÔNG chứng minh
  //      bấm đúp thật không đóng được bảng — `.open` được thêm sau hai khung hình và bảng trượt 300 ms, nên chỉ ~1–2 khung hình đầu được bảo vệ ----
  const opening = await p.ev(`(() => { [...document.querySelectorAll('#actions button')].find((b) => b.textContent === 'Sửa thông tin chuyến').click(); return { pointerEvents: getComputedStyle(document.querySelector('.sheet-scrim')).pointerEvents, opened: document.querySelector('.sheet-root.open') !== null }; })()`); // cùng một lượt chạy: trạng thái đầu, chưa tới khung hình thêm .open
  assert.deepEqual(opening, { pointerEvents: "none", opened: false }, "vừa bấm mở (chưa có .open): scrim không nhận chạm");
  await p.waitFor("document.querySelector('.sheet-root.open') !== null", "bảng mở (kiểm scrim)");
  assert.equal(await p.ev("getComputedStyle(document.querySelector('.sheet-scrim')).pointerEvents"), "auto", "đã .open: scrim nhận chạm (chạm nền đóng bảng)");
  await p.ev("document.querySelector('.sheet-close').click(); true");
  await p.waitFor(`${closed} && ${restored}`, "đóng (kiểm scrim)");
  ok("scrim: chưa nhận chạm ở khung hình đầu khi mở (pointer-events none, chưa .open); sau .open thì nhận (auto)");

  // ---- 3) chặn Lưu phía trình duyệt: không gửi gì lên máy chủ ----
  await open(p);
  await p.ev(setInput(dateField, ""));
  await p.ev(clickText(".sheet", "Lưu thông tin chuyến"));
  await p.waitFor("document.querySelector('.sheet .field-errors').textContent === 'Ngày khởi hành không được để trống.'", "lỗi ngày trống (một lần cho cả đơn)");
  assert.equal(await p.ev("document.querySelectorAll('.sheet .field-error svg').length"), 1, "lỗi có biểu tượng, không chỉ màu");
  await p.ev(setInput(dateField, vnDate(400)));
  await p.waitFor("/^Ngày khởi hành phải từ \\d\\d\\/\\d\\d\\/\\d{4} đến \\d\\d\\/\\d\\d\\/\\d{4}\\./.test(document.querySelector('.sheet .field-errors').textContent)", "lỗi ngoài khoảng (cập nhật theo lần gõ)");
  assert.equal((await getOrder()).order.updatedAt, before.updatedAt, "bị chặn: máy chủ không nhận gì");
  ok("Lưu bị chặn: ngày trống và ngày ngoài khoảng → lỗi chữ + biểu tượng, đơn ở máy chủ không đổi");

  // ---- 4) mất mạng: giữ nguyên dữ liệu đã gõ ----
  await p.ev(setInput(dateField, vnDate(13)));
  await p.waitFor("document.querySelector('.sheet .field-errors').childElementCount === 0", "hết lỗi khi ngày hợp lệ");
  await p.ev("window.__fetch = window.fetch; window.fetch = () => Promise.reject(new TypeError('offline')); true");
  await p.ev(clickText(".sheet", "Lưu thông tin chuyến"));
  await p.waitFor("!document.querySelector('.sheet .banner').hidden && /Không kết nối được máy chủ\\./.test(document.querySelector('.sheet .banner').textContent)", "banner mất mạng");
  assert.equal(await p.ev(`${dateField}.value`), vnDate(13), "dữ liệu đã gõ còn nguyên");
  assert.equal(await p.ev("document.querySelector('.sheet-foot .btn').disabled"), false, "nút Lưu bật lại");
  await p.ev("window.fetch = window.__fetch; true");
  ok("mất mạng: banner nguy hiểm, dữ liệu đã gõ còn nguyên, nút Lưu bật lại");

  // ---- 4a) máy chủ KHÔNG trả lời (I3): api() có hạn 45 s (ở đây rút còn 200 ms) → hết giờ hiện banner mất mạng, nút Lưu bật lại, ✕/Esc đóng được bảng (không kẹt "Đang lưu…") ----
  await p.ev("window.__st = window.setTimeout; window.setTimeout = (fn, ms, ...a) => window.__st(fn, ms === 45000 ? 200 : ms, ...a); window.fetch = (u, o) => new Promise((_, rej) => o?.signal?.addEventListener('abort', () => rej(new DOMException('hết giờ', 'AbortError')))); true");
  const savingNow = await p.ev("(() => { const b = document.querySelector('.sheet-foot .btn'); b.click(); return [b.textContent, b.disabled, document.querySelector('.sheet .banner').hidden]; })()"); // cùng một lượt chạy: trước khi hết giờ
  assert.deepEqual(savingNow, ["Đang lưu…", true, true], "vừa bấm Lưu: 'Đang lưu…', nút khoá, banner cũ đã ẩn");
  await p.waitFor("!document.querySelector('.sheet .banner').hidden && /Không kết nối được máy chủ\\./.test(document.querySelector('.sheet .banner').textContent)", "hết giờ → banner mất mạng (bảng không kẹt 'Đang lưu…')");
  assert.deepEqual(await p.ev("(() => { const b = document.querySelector('.sheet-foot .btn'); return [b.textContent, b.disabled]; })()"), ["Lưu thông tin chuyến", false], "nút Lưu bật lại, chữ về 'Lưu thông tin chuyến'");
  assert.equal(await p.ev(`${dateField}.value`), vnDate(13), "dữ liệu đã gõ còn nguyên");
  await p.ev("window.setTimeout = window.__st; window.fetch = window.__fetch; true");
  await p.ev("document.querySelector('.sheet-close').click(); true");
  await p.waitFor(`${closed} && ${restored}`, "sau hết giờ: đóng được bằng ✕");
  await open(p);
  await p.ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); true");
  await p.waitFor(`${closed} && ${restored}`, "sau hết giờ: đóng được bằng Esc");
  await open(p);
  await p.ev(setInput(dateField, vnDate(13))); // mở lại là nạp lại từ đơn đã lưu: gõ lại ngày cho các nhóm sau
  ok("hết giờ (máy chủ im lặng): banner 'Không kết nối được máy chủ.', nút Lưu bật lại, dữ liệu còn nguyên, ✕ và Esc đóng được bảng");

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
  await p.ev(setInput(field(1, "departTime"), "06:45"));
  await p.ev(setInput(field(0, "note"), "Đổi giờ đón"));
  await p.ev(clickText(".sheet", "Lưu thông tin chuyến"));
  await p.waitFor(`${closed} && !document.getElementById('error').hidden && /Đã lưu thông tin chuyến\\./.test(document.getElementById('error').textContent)`, "đóng bảng + banner đã lưu", 15000);
  assert.equal(await p.ev("document.getElementById('error').classList.contains('banner-info')"), true);
  assert.equal(await p.ev("document.activeElement.dataset.action === 'edit-trip'"), true, "focus về nút mới sau khi tải lại");
  // bản 1.39: dịch vụ cùng ngày với đơn không lặp dòng "Khởi hành" (chỉ còn "Giờ khởi hành" nếu có giờ)
  assert.deepEqual(await p.ev(facts(1)), [["Số khách", "3 khách"], ["Giờ khởi hành", "06:45"]]);
  assert.deepEqual(await p.ev(facts(0)), [["Số khách", "2 người lớn · 1 trẻ em"], ["Giờ khởi hành", "07:30"], ["Check-in", "Cùng ngày khởi hành · 09:00"], ["Ghi chú", "Đổi giờ đón"]]);
  const after = await getOrder();
  const [s0, s1] = after.order.services;
  assert.deepEqual([s0.departDate, s0.departTime, s0.pickupTime, s0.pickupPlace, s0.checkinTime, s0.note], [vnDate(13), "07:30", "07:00", "Bến Cầu Đá", "09:00", "Đổi giờ đón"], "dịch vụ 1: ngày theo ô cả đơn, giờ / điểm đón KHÔNG bị đụng (không gửi), phần khác nguyên vẹn");
  assert.deepEqual([s1.departDate, s1.departTime, s1.pickupTime, s1.pickupPlace], [vnDate(13), "06:45", null, "Khách sạn Sunrise"]);
  assert.equal(after.order.status, "confirmed");
  assert.deepEqual([after.order.total, after.order.subtotal, s0.pax.adult, s1.items[0].unitPrice], [before.total, before.subtotal, 2, 800000], "tiền và số khách không đổi");
  assert.notEqual(after.order.updatedAt, before.updatedAt);
  assert.equal(after.history.at(-1).action, "trip_updated");
  ok("lưu thành công: một ngày cho cả đơn áp cho mọi dịch vụ; banner 'Đã lưu…', focus về nút, PUT đủ mọi dịch vụ ('' xoá điểm đón), phần khác/tiền/số khách nguyên vẹn, nhật ký trip_updated");

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
  assert.deepEqual((await p.ev(facts(0)))[3], ["Ghi chú", "Đổi giờ đón"], "bản đang gõ đã bỏ");
  ok("stale: banner trong bảng nói rõ sẽ mất bản đang gõ; 'Tải lại đơn' đóng bảng và nạp bản mới");

  // ---- 6b) đơn CŨ lệch ngày (trước 1.11, dựng bằng SQL vì API nay chặn): ô cả đơn để trống + dòng giải thích; để trống mà lưu = giữ ngày cũ; chọn ngày = gom cả đơn ----
  env.sql(`UPDATE order_service SET depart_date = '${vnDate(15)}' WHERE order_id = '${orderId}' AND sort_order = 1`);
  await p.ev("location.reload(); true");
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 2", "đơn cũ lệch ngày nạp lại");
  await open(p);
  assert.equal(await p.ev(`${dateField}.value`), "", "đơn lệch ngày: ô cả đơn để trống");
  assert.match(await p.ev("document.querySelector('.sheet-date').textContent"), /Các dịch vụ đang khác ngày/);
  await p.ev(setInput(field(0, "note"), "Chỉ sửa ghi chú"));
  await p.ev(clickText(".sheet", "Lưu thông tin chuyến"));
  await p.waitFor(`${closed} && /Đã lưu thông tin chuyến\\./.test(document.getElementById('error').textContent)`, "đơn cũ: sửa ghi chú lưu được", 15000);
  let legacy = (await getOrder()).order.services;
  assert.deepEqual(legacy.map((s) => s.departDate), [vnDate(13), vnDate(15)], "để trống = giữ ngày cũ của từng dịch vụ");
  await open(p);
  await p.ev(setInput(dateField, vnDate(14)));
  await p.ev(clickText(".sheet", "Lưu thông tin chuyến"));
  await p.waitFor(`${closed} && /Đã lưu thông tin chuyến\\./.test(document.getElementById('error').textContent)`, "đơn cũ: chọn một ngày lưu được", 15000);
  legacy = (await getOrder()).order.services;
  assert.deepEqual(legacy.map((s) => s.departDate), [vnDate(14), vnDate(14)], "chọn ngày = gom cả đơn về một ngày");
  ok("đơn cũ lệch ngày: ô cả đơn trống + giải thích; sửa ghi chú giữ ngày cũ; chọn ngày gom cả đơn về một ngày");

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
    services: [{ kind: "catalog", catalogCode: "TTB06", pax: pax(1), catalogPriceSeen: { adult: 800000 }, ...NO_TRIP }], // 2026-09-26: trước là dịch vụ nhập tay (API nay không nhận mới)
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
