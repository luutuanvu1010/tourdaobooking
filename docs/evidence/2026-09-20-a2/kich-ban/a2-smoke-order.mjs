// Kiểm trang đơn bằng Chrome thật (khổ iPhone 390×844). Chạy từ GỐC repo:
//   npm run build:web && CHROME_BIN=<đường dẫn tuyệt đối tới kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-order.mjs
import assert from "node:assert/strict";
import { ACCOUNTS, clickText, ok, setInput, startEnv, vnDate } from "./a2-cdp.mjs";

const env = await startEnv();
try {
  // gọi API với phiên đã đăng nhập (dựng dữ liệu; KHÔNG dùng để kiểm giao diện)
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
  const base = { customerName: "Khách Trang Đơn", customerPhone: "0903 111 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "" };

  // đơn 1: nháp, dịch vụ danh mục có đơn giá thương lượng + dịch vụ nhập tay CHƯA có ngày (xác nhận sẽ thiếu)
  // 2026-09-26 (DK-T3-01, chủ dự án "loại bỏ hoàn toàn dịch vụ nhập tay"): API không nhận dịch vụ nhập tay MỚI → dựng đơn CŨ: lập với TTB06 (1 người lớn
  // × 800.000 — cùng số tiền với dòng nhập tay cũ nên tổng đơn không đổi) rồi đổi dịch vụ đó thành nhập tay bằng SQL khi đơn còn nháp.
  const created = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    ...base, discount: 100000,
    services: [
      { kind: "catalog", catalogCode: "TD101", pax: pax(2, 1), unitPrices: { adult: 1300000, child: 950000 }, catalogPriceSeen: { adult: 1350000, child: 950000 }, ...NO_TRIP, departTime: "07:30", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", checkinTime: "09:00" },
      { kind: "catalog", catalogCode: "TTB06", pax: pax(1), catalogPriceSeen: { adult: 800000 }, ...NO_TRIP },
    ],
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const order = created.json.order;
  // Sổ tiền lượt 1 (ADR-0026 đ9): tiền trả trước = LẦN THU của billing (trước đây là cột cọc trên đơn).
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${order.id}/payments`, { soTien: 500000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  env.sql(`UPDATE order_service SET catalog_code = NULL, unit = 'manual', name = 'Xe đưa đón riêng', pax_adult = 3 WHERE id = '${order.services[1].id}'`);
  env.sql(`UPDATE order_item SET catalog_code = NULL, pax_code = NULL, catalog_price = NULL, description = 'Xe 7 chỗ 2 chiều', detail = NULL WHERE service_id = '${order.services[1].id}'`);
  // ADR-0021: API nay chặn đơn lệch ngày ("có ngày" + "chưa có ngày"); ca này chỉ còn ở đơn CŨ → dựng lại bằng SQL: dịch vụ danh mục có ngày, dịch vụ nhập tay trống ngày
  env.sql(`UPDATE order_service SET depart_date = '${vnDate(10)}' WHERE id = '${order.services[0].id}'`);
  const svc = (i) => `document.querySelectorAll('#order .svc-view')[${i}]`;
  const pairs = (root, sel) => `[...${root}.querySelectorAll(${JSON.stringify(sel)})].map((k) => [k.children[0].textContent, k.children[1].textContent])`;

  // ---- 1) đơn nháp: hai khối dịch vụ, chip, số khách, chuyến, dòng tiền, nhãn lệch giá, tổng, thanh toán, nút ----
  let p = await env.as(ACCOUNTS.salesA, `/order?id=${order.id}`);
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 2", "hai khối dịch vụ");
  assert.equal(await p.ev("document.querySelector('#order .badge').textContent"), "Chờ xác nhận"); // ADR-0030 điều 3, Q-A2 — Task 1.7
  assert.equal(await p.ev(`${svc(0)}.querySelector('.svc-name').textContent`), "Tour 4 đảo Nha Trang");
  assert.deepEqual(await p.ev(`[...${svc(0)}.querySelectorAll('.chip')].map((c) => c.textContent)`), ["theo người", "TD101"]);
  assert.deepEqual(await p.ev(pairs(svc(0), ".svc-facts .kv")), [
    // bản 1.39: cùng ngày với đơn (dải đầu trang) → không lặp dòng "Khởi hành", chỉ còn "Giờ khởi hành"
    ["Số khách", "2 người lớn · 1 trẻ em"], ["Giờ khởi hành", "07:30"], ["Đón", "07:00 · Bến Cầu Đá"], ["Check-in", "Cùng ngày khởi hành · 09:00"],
  ]);
  const lines0 = await p.ev(`[...${svc(0)}.querySelectorAll('.line-view')].map((l) => [l.querySelector('.line-name').textContent, l.querySelector('.line-calc').textContent, l.querySelector('.line-total').textContent, !!l.querySelector('.tag-price'), l.querySelector('.price-old')?.textContent ?? null])`);
  assert.match(lines0[0][0], /^Tour 4 đảo Nha Trang/);
  assert.deepEqual(lines0[0].slice(1), ["2 × 1.300.000 ₫", "2.600.000 ₫", true, "giá danh mục 1.350.000 ₫"]);
  assert.deepEqual(lines0[1].slice(1), ["1 × 950.000 ₫", "950.000 ₫", false, null]);
  assert.equal(await p.ev(`${svc(0)}.querySelector('.svc-total-amount').textContent`), "3.550.000 ₫");
  // dịch vụ nhập tay: chip 'nhập tay', chưa có ngày → dòng cảnh báo, KHÔNG nhãn lệch giá
  assert.deepEqual(await p.ev(`[...${svc(1)}.querySelectorAll('.chip')].map((c) => c.textContent)`), ["nhập tay"]);
  assert.deepEqual(await p.ev(pairs(svc(1), ".svc-facts .kv")), [["Số khách", "3 khách"], ["Khởi hành", "Chưa có ngày khởi hành"]]);
  assert.equal(await p.ev(`${svc(1)}.querySelectorAll('.kv-warn').length`), 1);
  assert.equal(await p.ev(`${svc(1)}.querySelector('.tag-price') === null`), true, "dịch vụ nhập tay không có nhãn lệch giá");
  assert.deepEqual(await p.ev(pairs("document", ".totals .kv")).then((r) => r.slice(0, 5)), [
    ["Tạm tính", "4.350.000 ₫"], ["Giảm giá", "100.000 ₫"], ["Tổng cộng", "4.250.000 ₫"], ["Đã thu", "500.000 ₫"], ["Còn lại", "3.750.000 ₫"],
  ]);
  assert.deepEqual(await p.ev("[...document.querySelectorAll('#actions .btn')].map((b) => b.textContent)"), ["Sửa", "Xác nhận đơn", "Huỷ đơn"]);
  assert.equal(await p.ev("!!document.querySelector('.lock-note')"), false, "đơn nháp không có dòng nhắc khoá");
  assert.ok((await p.ev("document.querySelectorAll('.history li').length")) >= 1, "chủ đơn thấy lịch sử");
  ok("đơn nháp: 2 khối dịch vụ, chip, số khách, chuyến, dòng tiền, nhãn lệch giá (chỉ dịch vụ danh mục), tổng, thanh toán, 3 nút");

  // ---- 2) xác nhận khi thiếu ngày → banner danh sách thiếu + liên kết Sửa; máy chủ không đổi gì ----
  await p.ev("window.confirm = () => true; true");
  await p.ev(clickText("#actions", "Xác nhận đơn"));
  await p.waitFor("!document.getElementById('error').hidden && /Chưa đủ thông tin chuyến để xác nhận đơn\\./.test(document.getElementById('error').textContent)", "banner incomplete_trip");
  assert.equal(await p.ev("document.getElementById('error').getAttribute('role')"), "alert");
  assert.equal(await p.ev("document.getElementById('error').classList.contains('banner-danger')"), true);
  assert.deepEqual(await p.ev("[...document.querySelectorAll('#error .banner-lines li')].map((li) => li.firstChild.textContent)"), ["Xe đưa đón riêng — chưa có ngày khởi hành"]);
  assert.deepEqual(await p.ev("[...document.querySelectorAll('#error button')].map((b) => b.textContent)"), [], "banner incomplete_trip chỉ có liên kết 'Sửa' — KHÔNG có nút 'Tải lại đơn' (ma trận đặc tả 5.2: cột Hành động '—'; 409 khác ở trang đơn mới có nút)");
  const editHref = await p.ev("document.querySelector('#error .banner-edit').getAttribute('href')");
  assert.equal(editHref, `/order-form?id=${order.id}&focus=${order.services[1].id}`);
  assert.ok((await p.ev("(() => { const r = document.querySelector('#error .banner-edit').getBoundingClientRect(); return Math.min(r.width, r.height); })()")) >= 43.5, "liên kết Sửa rộng và cao ≥ 44px");
  assert.equal(await p.ev("[...document.querySelectorAll('#actions button')].every((b) => !b.disabled)"), true, "nút bật lại sau lỗi");
  assert.equal((await call(ACCOUNTS.salesA, "GET", `/api/orders/${order.id}`)).json.order.status, "draft", "xác nhận thất bại không đổi trạng thái");
  ok("xác nhận thiếu ngày: banner nguy hiểm, dòng 'Xe đưa đón riêng — chưa có ngày khởi hành' + liên kết Sửa đúng dịch vụ (KHÔNG có nút 'Tải lại đơn'), đơn vẫn nháp");

  // ---- 3) liên kết "Sửa" mở form đúng thẻ (khối chuyến mở sẵn) ----
  await p.send("Page.navigate", { url: env.base + editHref });
  await p.waitFor("location.pathname === '/order-form' && document.querySelectorAll('#services .svc').length === 2", "form mở lại đơn");
  assert.equal(await p.ev("document.querySelectorAll('#services .svc')[1].querySelector('details.trip').open"), true, "thẻ được nhắm mở sẵn khối chuyến");
  assert.equal(await p.ev("document.querySelectorAll('#services .svc')[0].querySelector('details.trip').open"), false);
  // 2026-09-26 (DK-T3-01): dịch vụ nhập tay ĐÃ LƯU hiện CHỈ XEM — không ô tên/mô tả/đơn giá, không "+ Thêm dòng"/"Xoá dòng"; vẫn có bộ đếm số khách,
  // khối chuyến và nút "Xoá" dịch vụ; có dòng chú thích. Thẻ danh mục cạnh nó không đổi (vẫn có ô đơn giá).
  const frozen = await p.ev(`(() => { const c = document.querySelectorAll('#services .svc')[1];
    return { inputs: [...c.querySelectorAll('input:not(.counter-field)')].filter((i) => !i.closest('details.trip')).length, priceFields: c.querySelectorAll('.price-field').length,
      buttons: [...c.querySelectorAll('button')].filter((b) => !b.closest('details.trip') && !b.closest('.counter')).map((b) => b.textContent.trim()),
      counter: !!c.querySelector('.counter-field[aria-label="Số khách (chỉ để vận hành)"]'), note: c.querySelector('.svc-locked')?.textContent ?? null,
      name: c.querySelector('.svc-name').textContent, line: c.querySelector('.mline')?.textContent ?? null, total: c.querySelector('.svc-total-amount').textContent,
      catalogPriceFields: document.querySelectorAll('#services .svc')[0].querySelectorAll('.price-field').length }; })()`);
  assert.deepEqual([frozen.inputs, frozen.priceFields, frozen.buttons, frozen.counter], [0, 0, ["Xoá"], true], `thẻ nhập tay đã lưu chỉ xem (chỉ còn bộ đếm + Xoá): ${JSON.stringify(frozen)}`);
  assert.equal(frozen.note, "Dịch vụ nhập tay đã ngừng — chỉ xem; muốn đổi thì xoá và chọn từ danh mục.");
  assert.deepEqual([frozen.name, frozen.total], ["Xe đưa đón riêng", "800.000 ₫"]);
  assert.match(frozen.line ?? "", /Xe 7 chỗ 2 chiều.*1 × 800\.000 ₫ =.*800\.000 ₫/);
  assert.ok(frozen.catalogPriceFields > 0, "thẻ danh mục vẫn có ô đơn giá");
  p.close();
  ok("liên kết 'Sửa': form mở đúng thẻ, khối chuyến mở sẵn; thẻ nhập tay đã lưu chỉ xem (không ô tên/giá, còn số khách + Xoá, có chú thích)");

  // ---- 3b) (2026-09-26, DK-T3-01) LƯU form sửa đơn nháp CŨ có dịch vụ nhập tay: đổi số khách của thẻ nhập tay rồi Lưu → máy chủ nhận (tên + dòng tiền
  //      gửi lại nguyên văn), dịch vụ vẫn là nhập tay, tiền không đổi, số khách mới được lưu. Đơn RIÊNG (không đụng luồng của đơn 1). ----
  {
    const c3 = await call(ACCOUNTS.salesA, "POST", "/api/orders", { ...base, customerName: "Khách Nhập Tay Cũ", services: [{ kind: "catalog", catalogCode: "TTB06", pax: pax(1), catalogPriceSeen: { adult: 800000 }, ...NO_TRIP, departDate: vnDate(9) }] });
    assert.equal(c3.status, 201, JSON.stringify(c3.json));
    const sid = c3.json.order.services[0].id;
    env.sql(`UPDATE order_service SET catalog_code = NULL, unit = 'manual', name = 'Xe đưa đón riêng', pax_adult = 3 WHERE id = '${sid}'`);
    env.sql(`UPDATE order_item SET catalog_code = NULL, pax_code = NULL, catalog_price = NULL, description = 'Xe 7 chỗ 2 chiều', detail = NULL WHERE service_id = '${sid}'`);
    const q = await env.as(ACCOUNTS.salesA, `/order-form?id=${c3.json.order.id}`);
    await q.waitFor("document.querySelectorAll('#services .svc').length === 1 && !!document.querySelector('#services .svc .svc-locked')", "form sửa đơn cũ có thẻ nhập tay chỉ xem");
    await q.ev(setInput("document.querySelector('#services .svc .counter-field[aria-label=\"Số khách (chỉ để vận hành)\"]')", "4"));
    await q.ev("document.getElementById('save').click(); true");
    await q.waitFor("location.pathname === '/order'", "lưu thành công → trang đơn", 15000);
    const saved = (await call(ACCOUNTS.salesA, "GET", `/api/orders/${c3.json.order.id}`)).json.order;
    assert.deepEqual([saved.services[0].kind, saved.services[0].name, saved.services[0].pax.adult, saved.subtotal], ["manual", "Xe đưa đón riêng", 4, 800000], JSON.stringify(saved.services[0]));
    assert.deepEqual(saved.services[0].items.map((i) => [i.description, i.quantity, i.unitPrice]), [["Xe 7 chỗ 2 chiều", 1, 800000]]);
    assert.deepEqual(q.consoleErrors, []);
    q.close();
  }
  ok("lưu form sửa đơn nháp cũ có dịch vụ nhập tay (đổi số khách 3 → 4): máy chủ nhận, dịch vụ vẫn nhập tay, tiền giữ 800.000");

  // ---- 4) bổ sung ngày qua API rồi xác nhận bằng giao diện: khoá, biểu tượng khoá, chỉ còn 'Huỷ đơn' ----
  const d = (await call(ACCOUNTS.salesA, "GET", `/api/orders/${order.id}`)).json.order;
  const tripOf = (s, o = {}) => ({ id: s.id, departDate: s.departDate ?? "", departTime: s.departTime ?? "", pickupTime: s.pickupTime ?? "", pickupPlace: s.pickupPlace ?? "", checkinDate: s.checkinDate ?? "", checkinTime: s.checkinTime ?? "", checkinPlace: s.checkinPlace ?? "", note: s.note ?? "", ...o });
  const put = await call(ACCOUNTS.salesA, "PUT", `/api/orders/${order.id}/trip`, { expectedUpdatedAt: d.updatedAt, services: [tripOf(d.services[0]), tripOf(d.services[1], { departDate: vnDate(10) })] });
  assert.equal(put.status, 200, JSON.stringify(put.json));
  p = await env.as(ACCOUNTS.salesA, `/order?id=${order.id}`);
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 2", "đơn nạp lại");
  await p.ev("window.confirm = () => true; true");
  await p.ev(clickText("#actions", "Xác nhận đơn"));
  await p.waitFor("document.querySelector('#order .badge')?.textContent === 'Đã xác nhận'", "đã xác nhận");
  assert.match(await p.ev("document.querySelector('.lock-note').textContent"), /Đơn đã xác nhận: dịch vụ, số khách và tiền đã khoá\. Chỉ sửa được thông tin chuyến\./);
  assert.equal(await p.ev("document.querySelectorAll('#order .svc-view .lock').length"), 4, "mỗi dịch vụ: khoá ở Số khách và ở Tổng dịch vụ");
  const confirmedBtns = await p.ev("[...document.querySelectorAll('#actions .btn')].map((b) => b.textContent)");
  assert.ok(confirmedBtns.includes("Huỷ đơn") && !confirmedBtns.includes("Sửa") && !confirmedBtns.includes("Xác nhận đơn"), `đơn đã xác nhận: có 'Huỷ đơn', không còn 'Sửa'/'Xác nhận đơn' (từ Task 9 có thêm 'Sửa thông tin chuyến'): ${confirmedBtns}`);
  // bản 1.39: dải đầu trang ghi số khách đủ chữ (không "NL/TE"), không tràn ngang ở 390px
  const band = await p.ev("({ pax: [...document.querySelectorAll('.order-summary-band .grid4 > div')][2].querySelector('.value').textContent, over: document.documentElement.scrollWidth - innerWidth })");
  assert.match(band.pax, /^\d+ người lớn, \d+ trẻ em$/, `dải đầu: ${band.pax}`);
  assert.ok(band.over <= 0, `tràn ngang ${band.over}px`);
  assert.equal(await p.ev("document.getElementById('error').hidden"), true);
  assert.deepEqual(await p.ev(pairs(svc(1), ".svc-facts .kv")), [["Số khách", "3 khách"]]); // bản 1.39: cùng ngày với đơn, không giờ → không còn dòng "Khởi hành"
  p.close();
  ok("đơn đã xác nhận: dòng nhắc khoá, 4 biểu tượng khoá, hết nút 'Sửa'/'Xác nhận đơn', còn 'Huỷ đơn'; dịch vụ nhập tay đã có ngày");

  // ---- 5) nhãn trạng thái danh mục CHỈ cho đơn nháp ----
  const second = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    ...base, customerName: "Khách Nhãn Danh Mục",
    services: [
      { kind: "catalog", catalogCode: "TD101", pax: pax(1), unitPrices: { adult: 1350000 }, catalogPriceSeen: { adult: 1350000 }, ...NO_TRIP, departDate: vnDate(8) },
      { kind: "catalog", catalogCode: "TTB03", pax: pax(5), unitPrices: { adult: 1500000 }, catalogPriceSeen: { adult: 1500000 }, ...NO_TRIP, departDate: vnDate(8) },
    ],
  });
  assert.equal(second.status, 201, JSON.stringify(second.json));
  env.sql("UPDATE catalog_item SET price_adult = 1400000 WHERE code = 'TD101'");
  env.sql("UPDATE catalog_item SET in_sheet = 0 WHERE code = 'TTB03'");
  p = await env.as(ACCOUNTS.salesA, `/order?id=${second.json.order.id}`);
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 2", "đơn nháp thứ hai");
  assert.deepEqual(await p.ev(`[...${svc(0)}.querySelectorAll('.chip')].map((c) => c.textContent)`), ["theo người", "TD101", "Giá danh mục đã đổi"]);
  assert.deepEqual(await p.ev(`[...${svc(1)}.querySelectorAll('.chip')].map((c) => c.textContent)`), ["theo nhóm 5 khách/lượt", "TTB03", "Dịch vụ đã ẩn khỏi danh mục"]);
  assert.equal(await p.ev(`${svc(0)}.querySelector('.tag-price') === null`), true, "giá thực tế bằng giá lúc lập → không nhãn lệch giá dù danh mục đã đổi");
  // huỷ đơn nháp → huy hiệu Đã huỷ, không còn nút, hết nhãn
  await p.ev("window.confirm = () => true; true");
  await p.ev(clickText("#actions", "Huỷ đơn"));
  await p.waitFor("document.querySelector('#order .badge')?.textContent === 'Đã huỷ'", "đã huỷ");
  assert.equal(await p.ev("document.querySelector('#order .badge').classList.contains('badge-cancelled')"), true);
  assert.equal(await p.ev("document.querySelectorAll('#actions .btn').length"), 0);
  // Chỉ đếm nhãn DANH MỤC (nằm trong khối dịch vụ .svc-view): từ ADR-0030 S20-4 đơn mới không tự gắn người lập, nên khối "Người phụ trách" của #order
  // có chip "Chờ nhận" dùng CHUNG lớp .chip-warn (web/order.ts, handlerCard) — không phải nhãn danh mục (Task 1.9 thu hẹp bộ chọn, không đổi ý bài).
  assert.equal(await p.ev("document.querySelectorAll('#order .svc-view .chip-warn, #order .svc-view .chip-muted').length"), 0, "đơn đã huỷ không có nhãn danh mục (máy chủ chỉ điền cho đơn nháp)");
  p.close();
  // đơn 1 đã xác nhận: danh mục đã đổi giá và ẩn dịch vụ nhưng KHÔNG nhãn
  p = await env.as(ACCOUNTS.salesA, `/order?id=${order.id}`);
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 2", "đơn 1");
  assert.equal(await p.ev("document.querySelectorAll('#order .svc-view .chip-warn, #order .svc-view .chip-muted').length"), 0, "đơn đã xác nhận không có nhãn danh mục");
  p.close();
  ok("nhãn 'Giá danh mục đã đổi' / 'Dịch vụ đã ẩn khỏi danh mục' chỉ ở đơn nháp; đơn huỷ: huy hiệu xám, không nút, không nhãn");

  // ---- 5b) đổi trạng thái THÀNH CÔNG nhưng tải lại đơn lỗi (I4): banner "Không tải được đơn." PHẢI có nút "Tải lại đơn" (PWA standalone không có tải lại của trình duyệt) ----
  const quick = { ...base, services: [{ kind: "catalog", catalogCode: "TTB06", pax: pax(1), catalogPriceSeen: { adult: 800000 }, ...NO_TRIP }] }; // 2026-09-26: trước là dịch vụ nhập tay (API nay không nhận mới)
  const third = await call(ACCOUNTS.salesA, "POST", "/api/orders", { ...quick, customerName: "Khách Tải Lại" });
  assert.equal(third.status, 201, JSON.stringify(third.json));
  p = await env.as(ACCOUNTS.salesA, `/order?id=${third.json.order.id}`);
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 1", "đơn nháp thứ ba");
  // sau lời gọi POST /status đầu tiên, mọi GET /api/orders/<id> ném TypeError (mất mạng đúng lúc tải lại)
  await p.ev(`(() => { window.confirm = () => true; window.__fetch = window.fetch; let afterStatus = false; window.fetch = (u, o) => { const method = o?.method ?? 'GET'; if (afterStatus && method === 'GET' && /^\\/api\\/orders\\/[^/]+$/.test(String(u))) return Promise.reject(new TypeError('offline')); if (method === 'POST' && /\\/status$/.test(String(u))) afterStatus = true; return window.__fetch(u, o); }; return true; })()`);
  await p.ev(clickText("#actions", "Huỷ đơn"));
  await p.waitFor("!document.getElementById('error').hidden && /Không tải được đơn\\./.test(document.getElementById('error').textContent)", "banner 'Không tải được đơn.'");
  assert.equal(await p.ev("[...document.querySelectorAll('#error button')].some((b) => b.textContent === 'Tải lại đơn')"), true, "banner 'Không tải được đơn.' có nút 'Tải lại đơn'");
  await p.ev("window.fetch = window.__fetch; true");
  await p.ev(clickText("#error", "Tải lại đơn"));
  await p.waitFor("document.querySelector('#order .badge')?.textContent === 'Đã huỷ' && document.getElementById('error').hidden", "tải lại: huy hiệu 'Đã huỷ', banner ẩn");
  assert.equal(await p.ev("document.querySelectorAll('#actions .btn').length"), 0, "đơn đã huỷ: hết nút");
  p.close();
  ok("đổi trạng thái xong mà tải lại lỗi: banner 'Không tải được đơn.' có nút 'Tải lại đơn'; bấm → huy hiệu 'Đã huỷ', banner ẩn");

  // ---- 5c) 409 ở trang đơn (I4): đơn đã đổi trạng thái ở nơi khác → banner PHẢI có nút "Tải lại đơn", không chỉ chữ ----
  const fourth = await call(ACCOUNTS.salesA, "POST", "/api/orders", { ...quick, customerName: "Khách Đổi Ở Nơi Khác" });
  assert.equal(fourth.status, 201, JSON.stringify(fourth.json));
  p = await env.as(ACCOUNTS.salesA, `/order?id=${fourth.json.order.id}`);
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 1", "đơn nháp thứ tư");
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${fourth.json.order.id}/status`, { status: "cancelled" })).status, 200, "đơn bị huỷ ở nơi khác");
  await p.ev("window.confirm = () => true; true");
  await p.ev(clickText("#actions", "Huỷ đơn")); // trang cũ vẫn tưởng đơn còn nháp → 409 invalid_transition
  await p.waitFor("!document.getElementById('error').hidden && /Không thể chuyển đơn từ/.test(document.getElementById('error').textContent)", "banner 409 invalid_transition");
  assert.equal(await p.ev("[...document.querySelectorAll('#error button')].some((b) => b.textContent === 'Tải lại đơn')"), true, "409 ở trang đơn có nút 'Tải lại đơn'");
  await p.ev(clickText("#error", "Tải lại đơn"));
  await p.waitFor("document.querySelector('#order .badge')?.textContent === 'Đã huỷ' && document.getElementById('error').hidden", "tải lại: thấy trạng thái mới");
  p.close();
  ok("409 ở trang đơn (đơn đã đổi ở nơi khác): banner có nút 'Tải lại đơn'; bấm → thấy trạng thái mới");

  // ---- 6) quyền: SALES khác không sửa được và không thấy lịch sử; kế toán thấy lịch sử, không nút ----
  p = await env.as(ACCOUNTS.salesB, `/order?id=${order.id}`);
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 2", "salesB xem đơn của salesA");
  // (v1.0: người phụ trách đơn cũng sửa được — ADR-0009 — nên câu giải thích quyền phải kể cả người phụ trách; đổi cùng lúc với chữ ở web/order.ts.)
  assert.match(await p.ev("document.getElementById('actions').textContent"), /Chỉ Sales Một \(người lập đơn\), người phụ trách đơn hoặc quản trị viên mới được sửa, xác nhận hoặc huỷ đơn này\./);
  assert.equal(await p.ev("document.querySelectorAll('#actions .btn').length"), 0);
  assert.equal(await p.ev("!document.querySelector('.history')"), true, "history rỗng → ẩn khối Lịch sử, không lỗi");
  assert.deepEqual(p.consoleErrors, []);
  p.close();
  p = await env.as(ACCOUNTS.accounting, `/order?id=${order.id}`);
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 2", "kế toán xem đơn");
  assert.ok((await p.ev("document.querySelectorAll('.history li').length")) >= 1, "kế toán thấy nhật ký mọi đơn");
  assert.equal(await p.ev("document.querySelectorAll('#actions .btn').length"), 0);
  p.close();
  ok("quyền: SALES khác không nút và không lịch sử (không lỗi); kế toán thấy lịch sử, không nút");

  // ---- 7) lỗi tải: mã lạ và thiếu mã ----
  p = await env.as(ACCOUNTS.salesA, "/order?id=khong-co");
  await p.waitFor("!document.getElementById('error').hidden", "banner lỗi tải");
  assert.equal(await p.ev("document.getElementById('error').classList.contains('banner-danger')"), true);
  p.close();
  p = await env.as(ACCOUNTS.salesA, "/order");
  await p.waitFor("!document.getElementById('error').hidden && /Thiếu mã đơn\\./.test(document.getElementById('error').textContent)", "banner thiếu mã");
  p.close();
  ok("lỗi tải: mã lạ và thiếu mã hiện banner nguy hiểm");

  // ---- 8) đo trên đơn 1 (khổ iPhone) và khổ máy tính ----
  p = await env.as(ACCOUNTS.salesA, `/order?id=${order.id}`);
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 2", "đo: đơn 1");
  const m = await p.ev(`(() => {
    const small = [...document.querySelectorAll('#actions .btn, #actions button, #actions a')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height < 43.5; }).map((el) => el.textContent);
    return { small, overflow: document.documentElement.scrollWidth - window.innerWidth };
  })()`);
  assert.deepEqual(m.small, [], `nút < 44px: ${m.small}`);
  assert.ok(m.overflow <= 0, `tràn ngang ${m.overflow}px ở 390px`);
  assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
  p.close();
  p = await env.as(ACCOUNTS.salesA, `/order?id=${order.id}`, { width: 1040, height: 800, mobile: false });
  await p.waitFor("document.querySelectorAll('#order .svc-view').length === 2", "đo: máy tính");
  assert.ok((await p.ev("document.documentElement.scrollWidth - window.innerWidth")) <= 0, "tràn ngang ở 1040px");
  assert.deepEqual(p.consoleErrors, []);
  p.close();
  ok("đo: nút ≥ 44px, không tràn ngang ở 390px và 1040px, 0 lỗi console");
} finally {
  await env.stop();
}
console.log("UI SMOKE ORDER OK");
