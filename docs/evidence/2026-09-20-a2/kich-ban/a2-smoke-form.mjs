// Kiểm form lập/sửa đơn bằng Chrome thật (khổ iPhone 390×844). Chạy từ GỐC repo:
//   npm run build:web && CHROME_BIN=<đường dẫn tuyệt đối tới kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-form.mjs
import assert from "node:assert/strict";
import { ACCOUNTS, clickText, ok, setInput, sleep, startEnv, vnDate } from "./a2-cdp.mjs";

const env = await startEnv();
try {
  const cards = "document.querySelectorAll('#services .svc')";
  const card = (i) => `${cards}[${i}]`;
  const counter = (i, label) => `${card(i)}.querySelector('.counter-field[aria-label=${JSON.stringify(label)}]')`;

  // ---- 1) trang trống, khung điện thoại ----
  let p = await env.as(ACCOUNTS.salesA, "/order-form");
  await p.waitFor("document.getElementById('services-empty') && !document.getElementById('services-empty').hidden", "trạng thái rỗng");
  assert.match(await p.ev("document.getElementById('services-empty').textContent"), /Chưa có dịch vụ\. Chọn dịch vụ từ danh mục\./);
  assert.equal(await p.ev("!!document.getElementById('tabbar')"), false, "form lập đơn ẩn thanh tab");
  assert.equal(await p.ev("document.getElementById('save').textContent"), "Lưu, chờ xác nhận");
  ok("form trống: trạng thái rỗng, không thanh tab, nút Lưu");

  // ---- 1b) bề mặt Tạo đơn (2026-09-25): tiêu đề, thứ tự mục, nút nhập tay ẩn, mặc định Tiền mặt, "Sử dụng thông tin của tôi" ----
  assert.equal(await p.ev("document.getElementById('form-title').textContent"), "Tạo đơn");
  assert.deepEqual(await p.ev("[...document.querySelectorAll('.form-main > .card > h2')].map((x) => x.textContent)"), ["Chọn ngày", "Dịch vụ", "Thông tin khách hàng", "Thanh toán"]);
  assert.equal(await p.ev("document.getElementById('add-manual').hidden"), true, "nút '+ Dịch vụ nhập tay' ẩn khi danh mục tải được");
  assert.equal(await p.ev("document.getElementById('depositMethod').value"), "cash", "phương thức thanh toán mặc định Tiền mặt");
  assert.match(await p.ev("document.querySelector('label:has(#depositAmount)').textContent"), /^Thanh toán trước/);
  assert.match(await p.ev("document.querySelector('label:has(#depositMethod)').textContent"), /^Phương thức thanh toán/);
  await p.ev("document.getElementById('use-mine').click(); true");
  assert.deepEqual(await p.ev("[document.getElementById('customerName').value, document.getElementById('customerPhone').value, document.getElementById('customerEmail').value]"), [ACCOUNTS.salesA.name, ACCOUNTS.salesA.phone, ""]);
  await p.ev(setInput("document.getElementById('customerName')", ""));
  await p.ev(setInput("document.getElementById('customerPhone')", ""));
  ok("Tạo đơn: thứ tự Chọn ngày → Dịch vụ → Thông tin khách hàng → Thanh toán; nhập tay ẩn; Tiền mặt mặc định; nút 'của tôi' điền tên + SĐT tài khoản");

  // ---- 2) ô chọn danh mục: tìm, kết quả, trạng thái rỗng ----
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.waitFor("document.querySelectorAll('#catalog-list button').length === 3", "3 dịch vụ danh mục hiện");
  await p.ev(setInput("document.getElementById('catalog-q')", "phao"));
  await p.waitFor("document.querySelectorAll('#catalog-list button').length === 1 && /TTB03/.test(document.getElementById('catalog-list').textContent)", "lọc theo 'phao'");
  assert.match(await p.ev("document.getElementById('catalog-list').textContent"), /theo nhóm 5 khách\/lượt/);
  await p.ev(setInput("document.getElementById('catalog-q')", "khong-co"));
  await p.waitFor("/Không tìm thấy dịch vụ/.test(document.getElementById('catalog-list').textContent)", "trạng thái rỗng của danh sách");
  ok("ô chọn danh mục: 3 kết quả, lọc, trạng thái rỗng");

  // ---- 2b) Enter trong ô tìm danh mục KHÔNG gửi cả form đơn hàng (ô tìm nằm trong <form>; nút mặc định của form là "Lưu") ----
  await p.ev(setInput("document.getElementById('catalog-q')", "phao"));
  await p.waitFor("document.querySelectorAll('#catalog-list button').length === 1", "phao (kiểm Enter)");
  await p.ev("document.getElementById('catalog-q').focus(); true");
  // phím Enter THẬT qua CDP: nếu form bị gửi ngầm, form trống này sẽ hiện banner kiểm phía trình duyệt (thiếu tên/SĐT/dịch vụ) ở #save-error
  await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
  await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await sleep(400);
  assert.equal(await p.ev("location.pathname === '/order-form' && document.getElementById('save-error').hidden"), true, "phím Enter thật trong ô tìm không được gửi/kiểm cả form (banner #save-error phải vẫn ẩn)");
  assert.equal(await p.ev("(() => { const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }); document.getElementById('catalog-q').dispatchEvent(e); return e.defaultPrevented; })()"), true, "keydown Enter trên ô tìm bị chặn (defaultPrevented)");
  assert.equal(await p.ev("location.pathname === '/order-form' && document.getElementById('save-error').hidden"), true);
  ok("Enter trong ô tìm danh mục: bị chặn (defaultPrevented), không gửi form, không banner lỗi, vẫn ở /order-form");

  // ---- 3) thêm dịch vụ nhóm (Phao chuối): 7 khách → 2 lượt ----
  await p.ev(setInput("document.getElementById('catalog-q')", "phao"));
  await p.waitFor("document.querySelectorAll('#catalog-list button').length === 1", "phao");
  await p.ev("document.querySelector('#catalog-list button').click(); true");
  await p.waitFor(`${cards}.length === 1`, "thẻ Phao chuối");
  assert.equal(await p.ev(`${card(0)}.querySelector('.svc-name').textContent`), "Phao chuối");
  assert.equal(await p.ev(`${counter(0, "Số khách")}.value`), "1");
  await p.ev(setInput(counter(0, "Số khách"), "7"));
  await p.waitFor(`/7 khách ÷ 5 = 2 lượt \\(làm tròn lên\\)/.test(${card(0)}.querySelector('.svc-group').textContent)`, "dòng chữ số lượt");
  assert.match(await p.ev(`${card(0)}.querySelector('.line:not([hidden]) .line-total').textContent`), /3\.000\.000/);
  assert.equal(await p.ev(`${card(0)}.querySelector('.line:not([hidden]) .tag-price:not([hidden])') === null`), true, "không lệch giá thì không có nhãn");
  ok("dịch vụ nhóm: 7 khách → 2 lượt × 1.500.000 = 3.000.000, dòng chữ 'làm tròn lên'");

  // ---- 4) thêm dịch vụ theo người (Tour 4 đảo): 2 người lớn + 1 trẻ em; đơn giá thương lượng ----
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
  await p.waitFor("document.querySelectorAll('#catalog-list button').length === 1", "TD101");
  await p.ev("document.querySelector('#catalog-list button').click(); true");
  await p.waitFor(`${cards}.length === 2`, "thẻ Tour 4 đảo");
  await p.ev(setInput(counter(1, "Người lớn"), "2"));
  await p.ev(setInput(counter(1, "Trẻ em"), "1"));
  await p.waitFor(`document.querySelector('.svc-total-amount') && /3\\.650\\.000/.test(${card(1)}.querySelector('.svc-total-amount').textContent)`, "tổng thẻ 3.650.000");
  assert.match(await p.ev(`${card(1)}.textContent`), /Trẻ 5–10 tuổi/, "ghi chú loại khách hiện cạnh ô nhập");
  await p.ev(setInput(`${card(1)}.querySelector('.price-field[aria-label="Đơn giá người lớn"]')`, "1300000"));
  await p.waitFor(`${card(1)}.querySelector('.line:not([hidden]) .tag-price:not([hidden])') !== null`, "nhãn Khác giá danh mục");
  assert.match(await p.ev(`${card(1)}.querySelector('.line:not([hidden]) .price-old:not([hidden])').textContent`), /1\.350\.000/);
  assert.match(await p.ev(`${card(1)}.querySelector('.svc-total-amount').textContent`), /3\.550\.000/);
  ok("dịch vụ theo người: 3.650.000; đơn giá 1.300.000 → nhãn 'Khác giá danh mục' + giá danh mục 1.350.000; tổng 3.550.000");

  // ---- 4b) vòng focus của bộ đếm không bị `.counter { overflow: hidden }` cắt: outline lùi vào trong (offset ÂM) ----
  for (const [what, el] of [["nút Tăng", `${card(1)}.querySelector('.counter-btn[aria-label="Tăng Người lớn"]')`], ["ô số", counter(1, "Người lớn")]]) {
    const ring = await p.ev(`(() => { const el = ${el}; el.focus(); const s = getComputedStyle(el); return { focused: document.activeElement === el, style: s.outlineStyle, width: parseFloat(s.outlineWidth), offset: parseFloat(s.outlineOffset) }; })()`);
    assert.ok(ring.focused && ring.style !== "none" && ring.width > 0 && ring.offset < 0, `vòng focus của ${what} bộ đếm phải hiện và lùi vào trong (không bị overflow:hidden cắt): ${JSON.stringify(ring)}`);
  }
  await p.ev("document.activeElement.blur(); true");
  ok("bộ đếm: nút Tăng và ô số có vòng focus 2px lùi vào trong (không bị cắt bởi overflow:hidden)");

  // ---- 5) dịch vụ nhập tay: KHÔNG bao giờ có nhãn lệch giá ----
  await p.ev("document.getElementById('add-manual').click(); true");
  await p.waitFor(`${cards}.length === 3`, "thẻ nhập tay");
  await p.ev(setInput(`${card(2)}.querySelector('input[placeholder="Vd: Xe đưa đón riêng"]')`, "Xe đưa đón riêng"));
  await p.ev(setInput(`${card(2)}.querySelector('.counter-field[aria-label="Số khách (chỉ để vận hành)"]')`, "3"));
  await p.ev(setInput(`${card(2)}.querySelector('input[placeholder="Vd: Xe 7 chỗ 2 chiều"]')`, "Xe 7 chỗ 2 chiều"));
  await p.ev(setInput(`${card(2)}.querySelector('.price-field')`, "800000"));
  await p.waitFor(`/800\\.000/.test(${card(2)}.querySelector('.svc-total-amount').textContent)`, "tổng thẻ nhập tay 800.000");
  assert.equal(await p.ev(`${card(2)}.querySelector('.tag-price') === null`), true, "thẻ nhập tay không có nhãn lệch giá");
  assert.match(await p.ev(`${card(2)}.textContent`), /Tên dịch vụ, không ghi tên khách\./);
  ok("dịch vụ nhập tay: 800.000, không nhãn lệch giá, có dòng nhắc 'không ghi tên khách'");

  // ---- 6) khối thông tin chuyến: thu gọn trên điện thoại, tóm tắt, cảnh báo ----
  assert.equal(await p.ev(`${card(1)}.querySelector('details.trip').open`), false, "≤ 640px: thu gọn");
  assert.equal(await p.ev(`${card(1)}.querySelector('.trip-summary').textContent`), "Chưa có ngày khởi hành");
  assert.equal(await p.ev(`${card(1)}.querySelector('.trip-summary').classList.contains('warn')`), true);
  await p.ev(`${card(1)}.querySelector('details.trip > summary').click(); true`);
  await p.waitFor(`${card(1)}.querySelector('details.trip').open`, "mở khối chuyến");
  assert.equal(await p.ev(`(() => { const t = ${card(1)}.querySelector('details.trip').getBoundingClientRect(); return [...${card(1)}.querySelectorAll('.trip-body input, .trip-body textarea')].every((el) => { const r = el.getBoundingClientRect(); return r.left >= t.left && r.right <= t.right; }); })()`), true, "ô của khối chuyến nằm gọn trong khung (không thò ra ngoài)");
  const dateIn = (k) => `${card(1)}.querySelector('[data-trip="${k}"]')`;
  await p.ev(setInput("document.getElementById('orderDate')", vnDate(-2))); // ADR-0021: ngày chọn một lần cho cả đơn
  await p.waitFor(`/Ngày khởi hành đã qua — vẫn lưu được, nhưng chưa thể xác nhận\\./.test(${card(1)}.querySelector('.svc-warnings').textContent)`, "cảnh báo ngày đã qua");
  await p.ev(setInput("document.getElementById('orderDate')", vnDate(7)));
  await p.ev(setInput(dateIn("departTime"), "07:30"));
  await p.ev(setInput(dateIn("pickupTime"), "08:00"));
  await p.waitFor(`/Giờ đón sau giờ khởi hành/.test(${card(1)}.querySelector('.svc-warnings').textContent)`, "cảnh báo giờ đón sau giờ khởi hành");
  await p.ev(setInput(dateIn("pickupTime"), "07:00"));
  await p.ev(setInput(dateIn("pickupPlace"), "Khách sạn Sunrise"));
  await p.waitFor(`${card(1)}.querySelector('.trip-summary').textContent.endsWith('· 07:30 · đón 07:00 · Khách sạn Sunrise')`, "dòng tóm tắt của khối chuyến");
  assert.match(await p.ev(`${card(1)}.querySelector('label:has([data-trip="checkinDate"])').textContent`), /Để trống = cùng ngày khởi hành\./);
  ok("khối chuyến: thu gọn kèm dòng cảnh báo, cảnh báo ngày đã qua / giờ đón, dòng tóm tắt, nhắc 'cùng ngày'");

  // ---- 7) thanh toán, tóm tắt, kiểm phía trình duyệt ----
  assert.match(await p.ev("document.getElementById('sum-subtotal').textContent"), /7\.350\.000/);
  await p.ev(setInput("document.getElementById('depositAmount')", "1000000"));
  await p.ev(setInput("document.getElementById('depositMethod')", "")); // bỏ mặc định Tiền mặt để kiểm lỗi thiếu phương thức
  assert.match(await p.ev("document.getElementById('sum-remaining').textContent"), /6\.350\.000/);
  await p.ev("document.getElementById('save').click(); true"); // thiếu tên/SĐT khách + chưa chọn hình thức cọc
  await p.waitFor("!document.getElementById('save-error').hidden", "banner kiểm phía trình duyệt");
  assert.equal(await p.ev("(() => { const r = document.getElementById('save-error').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })()"), true, "banner lỗi nằm trong khung nhìn sau khi bấm Lưu (điện thoại)");
  const msg = await p.ev("document.getElementById('save-error').textContent");
  for (const m of ["Nhập tên khách.", "Nhập số điện thoại khách.", "Chọn phương thức thanh toán."]) assert.ok(msg.includes(m), `thiếu "${m}" trong: ${msg}`);
  ok("tóm tắt 7.350.000 / còn lại 6.350.000; bấm Lưu khi thiếu tên, SĐT, phương thức thanh toán → banner nêu đủ");

  // ---- 8) lưu thành công → đơn có đúng dữ liệu (đọc lại qua API) ----
  // 2026-09-26 (DK-T3-01, chủ dự án "loại bỏ hoàn toàn dịch vụ nhập tay"): máy chủ không nhận dịch vụ nhập tay MỚI (400) → xoá thẻ nhập tay của bước 5
  // trước khi lưu; đơn lưu còn HAI dịch vụ danh mục: 3.550.000 (TD101) + 3.000.000 (TTB03) = 6.550.000, cọc 1.000.000 → còn lại 5.550.000.
  await p.ev(`${card(2)}.querySelector('.svc-remove').click(); true`);
  await p.waitFor(`${cards}.length === 2 && /6\\.550\\.000/.test(document.getElementById('sum-subtotal').textContent)`, "đã xoá thẻ nhập tay mới, tạm tính 6.550.000");
  await p.ev(setInput("document.getElementById('customerName')", "Trần Văn Bình"));
  await p.ev(setInput("document.getElementById('customerPhone')", "0901 234 567"));
  await p.ev(setInput("document.getElementById('depositMethod')", "bank_transfer"));
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("location.pathname === '/order'", "chuyển tới trang đơn sau khi lưu", 15000);
  const orderId = await p.ev("new URLSearchParams(location.search).get('id')");
  const detail = await p.ev(`fetch('/api/orders/' + ${JSON.stringify(orderId)}).then((r) => r.json())`);
  assert.equal(detail.order.services.length, 2);
  assert.equal(detail.order.subtotal, 6550000);
  assert.equal(detail.order.remainingAmount, 5550000);
  const tour = detail.order.services.find((s) => s.catalogCode === "TD101");
  assert.deepEqual(tour.items.map((i) => [i.paxCode, i.quantity, i.unitPrice, i.catalogPrice]), [["adult", 2, 1300000, 1350000], ["child", 1, 950000, 950000]]);
  assert.equal(tour.departDate, vnDate(7));
  assert.equal(tour.pickupPlace, "Khách sạn Sunrise");
  assert.equal(detail.order.services.find((s) => s.catalogCode === "TTB03").items[0].quantity, 2, "7 khách nhóm 5 → 2 lượt (máy chủ tự sinh)");
  ok("lưu (sau khi xoá thẻ nhập tay mới): hai dịch vụ, tạm tính 6.550.000, dòng tiền do máy chủ sinh, đơn giá thương lượng và thông tin chuyến đã lưu");
  p.close();

  // ---- 9) sửa nháp: mở lại đúng số khách; đổi số khách → chuyển sang giá danh mục hiện tại ----
  p = await env.as(ACCOUNTS.salesA, `/order-form?id=${orderId}&focus=${tour.id}`);
  await p.waitFor(`${cards}.length === 2`, "hai thẻ khi sửa");
  assert.equal(await p.ev("document.getElementById('form-title').textContent").then((t) => /^Sửa đơn /.test(t)), true);
  assert.equal(await p.ev("document.getElementById('customerName').value"), "Trần Văn Bình");
  assert.equal(await p.ev("document.getElementById('save').textContent"), "Lưu thay đổi");
  const tourIdx = await p.ev(`[...${cards}].findIndex((c) => c.querySelector('.svc-name').textContent === 'Tour 4 đảo Nha Trang')`);
  assert.equal(await p.ev(`${card(tourIdx)}.querySelector('details.trip').open`), true, "?focus= mở khối chuyến của đúng dịch vụ");
  assert.equal(await p.ev(`${counter(tourIdx, "Người lớn")}.value`), "2");
  assert.match(await p.ev(`${card(tourIdx)}.querySelector('.price-field[aria-label="Đơn giá người lớn"]').value`), /1\.300\.000/, "bản chụp giữ đơn giá đã thương lượng");
  // bản chụp chỉ lưu loại khách đã có dòng tiền, nhưng thẻ vẫn cho thêm loại khách khác của danh mục hiện tại
  assert.deepEqual(await p.ev(`[...${card(tourIdx)}.querySelectorAll('.guest-label')].map((e) => e.textContent)`), ["Người lớn", "Trẻ em", "Người cao tuổi", "Em bé"]);
  assert.match(await p.ev(`${card(tourIdx)}.textContent`), /1\.200\.000 ₫ · Từ 60 tuổi/, "loại mới lấy giá và ghi chú của danh mục hiện tại");
  await p.ev(`(() => { const el = ${counter(tourIdx, "Người lớn")}; el.focus(); window.__adult = el; return true; })()`);
  await p.ev(setInput(counter(tourIdx, "Người lớn"), "3"));
  await p.waitFor(`${card(tourIdx)}.querySelector('.line:not([hidden]) .tag-price:not([hidden])') === null`, "đổi số khách → giá danh mục hiện tại, hết nhãn");
  assert.equal(await p.ev("window.__adult.isConnected && document.activeElement === window.__adult"), true, "lần đổi đầu trên thẻ đã lưu KHÔNG dựng lại ô đang gõ (bàn phím iPhone không đóng)");
  assert.match(await p.ev(`${card(tourIdx)}.querySelector('.price-field[aria-label="Đơn giá người lớn"]').value`), /1\.350\.000/);
  ok("sửa nháp: mở đúng dữ liệu, ?focus= mở khối chuyến, đổi số khách chuyển sang giá danh mục hiện tại");

  // ---- 10) xung đột: stale (bản đang gõ mất) và catalog_changed (giữ đơn giá thương lượng) ----
  // (a) người khác sửa đơn trong lúc form đang mở
  const other = await env.as(ACCOUNTS.salesA, "/order-form"); // cùng người lập, phiên khác
  const upd = await other.ev(`(async () => { const d = await fetch('/api/orders/' + ${JSON.stringify(orderId)}).then((r) => r.json());
    const r = await fetch('/api/orders/' + ${JSON.stringify(orderId)} + '/trip', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ expectedUpdatedAt: d.order.updatedAt, services: d.order.services.map((s) => ({ id: s.id, departDate: s.departDate || '', departTime: '', pickupTime: '', pickupPlace: '', checkinDate: '', checkinTime: '', checkinPlace: '', note: 'người khác vừa sửa' })) }) });
    return r.status; })()`);
  assert.equal(upd, 200);
  other.close();
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("!document.getElementById('save-error').hidden && /Đơn vừa được người khác sửa/.test(document.getElementById('save-error').textContent)", "banner stale");
  assert.match(await p.ev("document.getElementById('save-error').textContent"), /Tải lại sẽ bỏ các thay đổi bạn đang gõ\./);
  await p.ev(clickText("#save-error", "Tải lại đơn"));
  await p.waitFor(`document.getElementById('save-error').hidden && ${counter(tourIdx, "Người lớn")}.value === '2'`, "tải lại đơn: form về bản mới, banner ẩn");
  ok("stale: banner nguy hiểm, 'Tải lại đơn' nạp bản mới");

  // (b) giá danh mục đổi giữa lúc mở form và lúc lưu (đơn MỚI, thẻ theo danh mục hiện tại)
  p.close();
  p = await env.as(ACCOUNTS.salesA, "/order-form");
  await p.waitFor("document.getElementById('catalog-q')", "form mới");
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
  await p.waitFor("document.querySelectorAll('#catalog-list button').length === 1", "TD101");
  await p.ev("document.querySelector('#catalog-list button').click(); true");
  await p.waitFor(`${cards}.length === 1`, "thẻ");
  await p.ev(setInput("document.getElementById('orderDate')", vnDate(5)));
  await p.ev(setInput("document.getElementById('customerName')", "Khách Đổi Giá"));
  await p.ev(setInput("document.getElementById('customerPhone')", "0902 222 333"));
  env.sql("UPDATE catalog_item SET price_adult = 1400000 WHERE code = 'TD101'");
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("!document.getElementById('save-error').hidden && /Giá danh mục vừa đổi/.test(document.getElementById('save-error').textContent)", "banner catalog_changed");
  assert.equal(await p.ev("(() => { const r = document.getElementById('save-error').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })()"), true, "banner giá đổi nằm trong khung nhìn (điện thoại)");
  assert.match(await p.ev("document.getElementById('save-error').textContent"), /Tour 4 đảo Nha Trang · Người lớn: 1\.350\.000 ₫ → 1\.400\.000 ₫/);
  assert.match(await p.ev(`${card(0)}.querySelector('.price-field[aria-label="Đơn giá người lớn"]').value`), /1\.400\.000/, "giá mới đã cập nhật vào thẻ");
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("location.pathname === '/order'", "lưu lại được sau khi xem giá mới", 15000);
  ok("catalog_changed: banner nêu 1.350.000 → 1.400.000, giá mới vào thẻ, lưu lại thành công");
  p.close();

  // ---- 10f) I1 / I1-bis qua DOM: thẻ đã lưu (bản chụp, đơn giá thương lượng). Đổi số khách 2 → 3 → 2 phải QUAY LẠI đơn giá + nhãn đã lưu (giống nhánh `kept` của máy chủ);
  //      đơn giá người dùng GÕ khi thẻ đang ở giá hiện tại (3 khách) không được bị đè khi quay về 2 khách; lưu xong máy chủ ghi đúng giá đó và giữ giá danh mục của BẢN CHỤP ----
  const owner = await env.login(ACCOUNTS.salesA);
  const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const created = await fetch(`${env.base}/api/orders`, {
    method: "POST", headers: { "content-type": "application/json", origin: env.base, cookie: `${owner.name}=${owner.value}` },
    body: JSON.stringify({
      customerName: "Khách Quay Về", customerPhone: "0904 444 555", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
      services: [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 1, senior: 0, infant: 0 }, unitPrices: { adult: 1300000, child: 950000 }, catalogPriceSeen: { adult: 1400000, child: 950000 }, ...NO_TRIP, departDate: vnDate(9) }],
    }),
  });
  assert.equal(created.status, 201, `dựng đơn đã lưu: ${created.status}`);
  const backId = (await created.json()).order.id;
  env.sql("UPDATE catalog_item SET price_adult = 1450000 WHERE code = 'TD101'"); // giá danh mục hiện tại 1.450.000 ≠ giá lúc lập 1.400.000
  p = await env.as(ACCOUNTS.salesA, `/order-form?id=${backId}`);
  await p.waitFor(`${cards}.length === 1`, "thẻ đã lưu (kiểm quay về)");
  const priceOf = `${card(0)}.querySelector('.price-field[aria-label="Đơn giá người lớn"]')`;
  const devTag = `${card(0)}.querySelector('.line:not([hidden]) .tag-price:not([hidden])') !== null`;
  const view0 = () => p.ev(`({ adult: ${counter(0, "Người lớn")}.value, price: ${priceOf}.value, tag: ${devTag}, total: ${card(0)}.querySelector('.svc-total-amount').textContent })`);
  assert.deepEqual(await view0(), { adult: "2", price: "1.300.000", tag: true, total: "3.550.000 ₫" }, "mở đơn đã lưu: đơn giá thương lượng + nhãn 'Khác giá danh mục'");
  await p.ev(setInput(counter(0, "Người lớn"), "3"));
  await p.waitFor(`${priceOf}.value === '1.450.000'`, "đổi số khách → giá danh mục hiện tại");
  assert.equal((await view0()).tag, false, "giá hiện tại: hết nhãn");
  await p.ev(setInput(counter(0, "Người lớn"), "2"));
  await p.waitFor(`${priceOf}.value === '1.300.000'`, "quay về 2 khách → đơn giá đã lưu 1.300.000");
  assert.deepEqual(await view0(), { adult: "2", price: "1.300.000", tag: true, total: "3.550.000 ₫" }, "quay về số đã lưu: giá + nhãn + tổng như lúc mở");
  await p.ev(setInput(counter(0, "Người lớn"), "3"));
  await p.waitFor(`${priceOf}.value === '1.450.000'`, "lại sang giá hiện tại");
  await p.ev(setInput(priceOf, "1234000")); // người dùng gõ đơn giá ở giá hiện tại
  await p.waitFor(`${priceOf}.value === '1.234.000'`, "đã gõ 1.234.000");
  await p.ev(setInput(counter(0, "Người lớn"), "2"));
  await p.waitFor(`${counter(0, "Người lớn")}.value === '2' && ${card(0)}.querySelector('.svc-total-amount').textContent === '3.418.000 ₫'`, "quay về 2 khách: đơn giá gõ tay 1.234.000 KHÔNG bị đè (tổng 2 × 1.234.000 + 950.000)");
  assert.deepEqual(await view0(), { adult: "2", price: "1.234.000", tag: true, total: "3.418.000 ₫" });
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("location.pathname === '/order'", "lưu đơn đã sửa", 15000);
  const savedBack = await p.ev(`fetch('/api/orders/' + ${JSON.stringify(backId)}).then((r) => r.json())`);
  assert.deepEqual(savedBack.order.services[0].items.map((i) => [i.paxCode, i.unitPrice, i.catalogPrice]), [["adult", 1234000, 1400000], ["child", 950000, 950000]], "máy chủ giữ bản chụp (giá danh mục 1.400.000, không phải 1.450.000) với đơn giá đã gõ");
  p.close();
  ok("I1 qua DOM: thẻ đã lưu 2 → 3 → 2 quay về 1.300.000 + nhãn + tổng; gõ 1.234.000 ở 3 khách rồi về 2 vẫn 1.234.000; máy chủ lưu đúng và giữ giá danh mục của bản chụp");

  // ---- 10g) Minor 2: lưu thành công phải THAY mục lịch sử của form (location.replace), không thêm mục: Back/bfcache không đưa người dùng về form đã lưu (bấm Lưu lần hai = POST /api/orders lần hai = đơn trùng) ----
  p = await env.as(ACCOUNTS.salesA, "/orders");
  await p.send("Page.navigate", { url: `${env.base}/order-form` }); // đi từ một trang trước tới form: form có một mục lịch sử riêng
  await p.waitFor("location.pathname === '/order-form' && document.getElementById('add-manual') !== null", "form (đi từ trang trước)");
  // 2026-09-26 (DK-T3-01): máy chủ không nhận dịch vụ nhập tay MỚI (chủ dự án "loại bỏ hoàn toàn dịch vụ nhập tay") → bước lưu này dùng thẻ danh mục TD101
  // (trước đây bấm nút ẩn "+ Dịch vụ nhập tay"; lưu nay trả 400 nên kịch bản đổi, không phải lỗi mã).
  // Trang tới bằng Page.navigate (không qua env.as): GET /api/catalog có thể CHƯA xong lúc gõ, và ô tìm chỉ vẽ lại khi focus/gõ → gõ lại mỗi lần thăm dò.
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.waitFor("(() => { const q = document.getElementById('catalog-q'); q.value = 'TD101'; q.dispatchEvent(new Event('input', { bubbles: true })); return document.querySelectorAll('#catalog-list button').length === 1; })()", "TD101 (lịch sử)");
  await p.ev("document.querySelector('#catalog-list button').click(); true");
  await p.waitFor(`${cards}.length === 1`, "thẻ danh mục (lịch sử)");
  await p.ev(setInput("document.getElementById('customerName')", "Khách Lịch Sử"));
  await p.ev(setInput("document.getElementById('customerPhone')", "0903 555 666"));
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("location.pathname === '/order'", "lưu thành công → trang đơn", 15000);
  const nav = (await p.send("Page.getNavigationHistory")).result;
  const navUrls = nav.entries.map((e) => e.url);
  assert.ok(!navUrls.some((u) => u.includes("/order-form")), `lịch sử không còn mục /order-form: ${JSON.stringify(navUrls)}`);
  assert.match(nav.entries[nav.currentIndex].url, /\/order\?id=/, "mục hiện tại là trang đơn vừa lưu");
  p.close();
  ok("lưu thành công thay mục lịch sử của form (location.replace): lịch sử không còn /order-form, mục hiện tại là /order?id=…");

  // ---- 10e) ARIA của danh sách danh mục (I5): danh sách nút thường (không role listbox/option); mục không chọn được dùng aria-disabled (KHÔNG `disabled`) để còn trong cây truy cập ----
  env.sql("INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES ('TDX01','Dịch vụ tính theo giờ','perHour',500000,NULL,NULL,NULL,NULL,NULL,NULL,5,1,'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z')"); // đơn vị chưa hỗ trợ → mục "nhập tay", không chọn được
  p = await env.as(ACCOUNTS.salesA, "/order-form");
  await p.waitFor("document.getElementById('catalog-q')", "form mới (kiểm ARIA)");
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.waitFor("document.querySelectorAll('#catalog-list button').length === 4", "4 mục danh mục (gồm mục không chọn được)");
  const aria = await p.ev(`(() => {
    const list = document.getElementById('catalog-list');
    const btns = [...list.querySelectorAll('button')];
    const x = btns.find((b) => b.textContent.includes('TDX01'));
    x.focus();
    const s = getComputedStyle(x);
    return { listRole: list.getAttribute('role'), withRole: btns.filter((b) => b.hasAttribute('role')).length, options: list.querySelectorAll('[role=option], [role=listbox]').length,
      xAriaDisabled: x.getAttribute('aria-disabled'), xDisabled: x.disabled, xFocusable: document.activeElement === x, xOpacity: s.opacity, xCursor: s.cursor,
      othersAriaDisabled: btns.filter((b) => b !== x && (b.hasAttribute('aria-disabled') || b.disabled)).length, xText: x.textContent };
  })()`);
  assert.deepEqual([aria.listRole, aria.withRole, aria.options], [null, 0, 0], `danh sách là nút thường, không listbox/option: ${JSON.stringify(aria)}`);
  assert.deepEqual([aria.xAriaDisabled, aria.xDisabled, aria.xFocusable, aria.othersAriaDisabled], ["true", false, true, 0], `mục không chọn được dùng aria-disabled (không disabled), vẫn focus được: ${JSON.stringify(aria)}`);
  assert.ok(Number(aria.xOpacity) < 1 && aria.xCursor === "not-allowed", `mục không chọn được hiện mờ + con trỏ not-allowed: ${JSON.stringify(aria)}`);
  assert.match(aria.xText, /nhập tay/, "mục không chọn được có gợi ý 'nhập tay'");
  await p.ev("[...document.querySelectorAll('#catalog-list button')].find((b) => b.textContent.includes('TDX01')).click(); true");
  await sleep(300);
  assert.equal(await p.ev(`${cards}.length === 0 && !document.getElementById('catalog-list').hidden`), true, "bấm mục không chọn được: không thêm thẻ, danh sách vẫn mở");
  await p.ev(setInput("document.getElementById('catalog-q')", "khong-co"));
  await p.waitFor("/Không tìm thấy dịch vụ/.test(document.getElementById('catalog-list').textContent)", "trạng thái rỗng (ARIA)");
  assert.equal(await p.ev("document.querySelector('#catalog-list .catalog-empty').getAttribute('role')"), "status", "trạng thái rỗng là role=status");
  p.close();
  ok("danh sách danh mục: nút thường (không listbox/option); mục 'nhập tay' dùng aria-disabled, mờ, vẫn focus được, bấm không thêm thẻ; trạng thái rỗng role=status");

  // ---- 10c) trần 50 dòng tiền/đơn: nút "+ Thêm dòng" của MỌI thẻ nhập tay cập nhật ngay (tính trên cả đơn) ----
  p = await env.as(ACCOUNTS.salesA, "/order-form");
  await p.waitFor("document.getElementById('add-manual')", "form mới cho kiểm trần dòng");
  await p.ev("document.getElementById('add-manual').click(); document.getElementById('add-manual').click(); true");
  await p.waitFor(`${cards}.length === 2`, "hai thẻ nhập tay");
  const addBtn = (i) => `${card(i)}.querySelector('button.btn-block')`;
  for (let i = 0; i < 24; i++) await p.ev(`${addBtn(0)}.click(); true`); // mỗi thẻ có sẵn 1 dòng: thẻ 0 → 25 dòng
  for (let i = 0; i < 23; i++) await p.ev(`${addBtn(1)}.click(); true`); // thẻ 1 → 24 dòng: tổng 49
  await p.waitFor(`${cards}[0].querySelectorAll('.mline').length === 25 && ${cards}[1].querySelectorAll('.mline').length === 24`, "49 dòng");
  assert.equal(await p.ev(`${addBtn(0)}.disabled || ${addBtn(1)}.disabled`), false, "49 dòng: còn thêm được");
  await p.ev(`${addBtn(1)}.click(); true`); // dòng thứ 50
  await p.waitFor(`${addBtn(0)}.disabled && ${addBtn(1)}.disabled`, "đủ 50 dòng: nút của CẢ HAI thẻ khoá ngay (không trễ một bước)");
  assert.match(await p.ev(`${addBtn(0)}.textContent`), /Đã đủ 50 dòng tiền — không thêm được nữa/, "nút khoá kèm chữ giải thích");
  await p.ev(`${card(0)}.querySelector('.mline button.btn-link').click(); true`); // xoá một dòng ở thẻ 0 → 49
  await p.waitFor(`!${addBtn(0)}.disabled && !${addBtn(1)}.disabled && ${addBtn(0)}.textContent === "+ Thêm dòng"`, "xoá một dòng: nút của cả hai thẻ bật lại, chữ về \"+ Thêm dòng\"");
  p.close();
  ok("trần 50 dòng/đơn: nút '+ Thêm dòng' của cả hai thẻ khoá ngay ở dòng thứ 50 và bật lại khi xoá bớt");

  // ---- 10d) bfcache (I2): sau khi lưu thành công `saving` không bao giờ về false; iOS khôi phục trang từ bộ nhớ đệm khi vuốt Back từ /order → form `inert` + "Đang lưu…" vĩnh viễn (PWA không có nút tải lại) ----
  p = await env.as(ACCOUNTS.salesA, "/order-form");
  await p.waitFor("document.getElementById('add-manual')", "form mới cho kiểm bfcache");
  await p.ev("document.getElementById('add-manual').click(); true");
  await p.waitFor(`${cards}.length === 1`, "thẻ nhập tay (bfcache)");
  await p.ev(setInput("document.getElementById('customerName')", "Khách Bfcache"));
  await p.ev(setInput("document.getElementById('customerPhone')", "0903 333 444"));
  await p.ev(setInput(`${card(0)}.querySelector('input[placeholder="Vd: Xe đưa đón riêng"]')`, "Xe đưa đón riêng"));
  await p.ev(setInput(`${card(0)}.querySelector('input[placeholder="Vd: Xe 7 chỗ 2 chiều"]')`, "Xe 7 chỗ 2 chiều"));
  await p.ev(setInput(`${card(0)}.querySelector('.price-field')`, "500000"));
  const stuck = "document.getElementById('save').textContent === 'Đang lưu…' && document.getElementById('save').disabled && document.getElementById('order-form').hasAttribute('inert')";
  await p.ev("window.fetch = () => new Promise(() => {}); document.getElementById('save').click(); true"); // máy chủ không bao giờ trả lời = trạng thái ngay sau khi lưu thành công, trước khi trang bị thay
  await p.waitFor(stuck, "đang lưu: nút 'Đang lưu…' và form inert");
  await p.ev("window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false })); true"); // tải trang thường: KHÔNG đụng tới trạng thái
  assert.equal(await p.ev(stuck), true, "pageshow không persisted: giữ nguyên trạng thái đang lưu");
  await p.ev("window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); true"); // trang khôi phục từ bfcache
  await p.waitFor("document.getElementById('save').textContent === 'Lưu, chờ xác nhận' && !document.getElementById('save').disabled && !document.getElementById('order-form').hasAttribute('inert')", "pageshow persisted: nút về 'Lưu, chờ xác nhận', bật, form hết inert");
  assert.equal(await p.ev("document.getElementById('customerName').value"), "Khách Bfcache", "dữ liệu đã gõ còn nguyên");
  p.close();
  ok("bfcache: trang khôi phục (pageshow persisted) đang kẹt 'Đang lưu…' → nút về 'Lưu, chờ xác nhận', form hết inert; pageshow thường không đụng tới");

  // ---- 10e) một ngày cho cả đơn (ADR-0021): thẻ không có ô ngày riêng; mọi dịch vụ mang ngày của ô "Chọn ngày" ----
  p = await env.as(ACCOUNTS.salesA, "/order-form");
  await p.waitFor("document.getElementById('add-manual')", "form mới cho kiểm ngày cả đơn");
  await p.ev(setInput("document.getElementById('orderDate')", vnDate(5)));
  await p.ev("document.getElementById('add-manual').click(); document.getElementById('add-manual').click(); true");
  await p.waitFor(`${cards}.length === 2`, "hai thẻ");
  assert.equal(await p.ev(`${cards}[0].querySelector('[data-trip="departDate"]') === null && ${cards}[1].querySelector('[data-trip="departDate"]') === null`), true, "thẻ dịch vụ không còn ô ngày riêng");
  await p.ev(setInput("document.getElementById('orderDate')", vnDate(6)));
  await p.waitFor(`[...${cards}].every((c) => c.querySelector('.trip-summary').textContent.startsWith(${JSON.stringify(vnDate(6).slice(8, 10) + "/" + vnDate(6).slice(5, 7))}))`, "đổi ngày cả đơn: mọi thẻ theo");
  p.close();
  ok("một ngày cho cả đơn: thẻ không có ô ngày riêng; đổi ngày ở 'Chọn ngày' áp cho mọi dịch vụ");

  // ---- 11) quyền: kế toán không lập đơn ----
  p = await env.as(ACCOUNTS.accounting, "/order-form");
  await p.waitFor("!document.getElementById('error').hidden", "banner khoá form");
  assert.equal(await p.ev("document.querySelector('.catalog > p.muted').textContent"), "Đơn này đang khoá.", "lý do khoá ô chọn danh mục: tiếng Việt, không chữ 'Form'");
  assert.match(await p.ev("document.getElementById('error').textContent"), /Tài khoản này không được lập đơn\./);
  assert.equal(await p.ev("document.getElementById('save').disabled"), true);
  await p.ev("window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); true"); // khôi phục từ bfcache: chỉ gỡ khoá "Đang lưu", KHÔNG gỡ nhầm khoá của form đã bị khoá
  assert.equal(await p.ev("document.getElementById('order-form').hasAttribute('inert') && document.getElementById('save').disabled"), true, "pageshow persisted không mở lại form đã bị khoá");
  ok("kế toán mở thẳng /order-form: banner 'không được lập đơn', nút Lưu khoá");
  p.close();

  // ---- 12b) bố cục theo khổ: máy tính 1040 hai cột (cột tóm tắt bên phải, nút Lưu trong khung nhìn); iPad dọc 800 thanh Lưu có nền ----
  p = await env.as(ACCOUNTS.salesA, "/order-form", { width: 1040, height: 800, mobile: false });
  await p.waitFor("document.getElementById('services-empty') && !document.getElementById('services-empty').hidden", "form (máy tính)");
  const lay = await p.ev(`(() => { const a = document.querySelector('.form-main').getBoundingClientRect(); const b = document.querySelector('.form-side').getBoundingClientRect(); const s = document.getElementById('save').getBoundingClientRect();
    return { sideRightOfMain: b.left >= a.right - 1, saveInView: s.top >= 0 && s.bottom <= innerHeight, overflow: document.documentElement.scrollWidth - innerWidth }; })()`);
  assert.deepEqual([lay.sideRightOfMain, lay.saveInView], [true, true], "máy tính: cột tóm tắt bên phải cột form, nút Lưu trong khung nhìn");
  assert.ok(lay.overflow <= 0, "máy tính: không tràn ngang");
  // I6: ≥ 960px banner nằm ở cột phải dính (luôn thấy) → lỗi cuộn tới ô lỗi đầu tiên VÀ đặt focus vào đó
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("!document.getElementById('save-error').hidden", "banner kiểm phía trình duyệt (máy tính)");
  await p.waitFor("document.activeElement === document.getElementById('customerName')", "máy tính: focus vào ô lỗi đầu tiên (Tên khách)");
  assert.equal(await p.ev("(() => { const r = document.getElementById('save-error').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })()"), true, "máy tính: banner ở cột dính nằm trong khung nhìn");
  assert.deepEqual(p.consoleErrors, []);
  p.close();
  p = await env.as(ACCOUNTS.salesA, "/order-form", { width: 800, height: 900, mobile: false });
  await p.waitFor("document.getElementById('services-empty')", "form (iPad dọc)");
  assert.notEqual(await p.ev("getComputedStyle(document.querySelector('.form-actions')).backgroundColor"), "rgba(0, 0, 0, 0)", "iPad dọc: thanh Lưu dính đáy có nền");
  // I6: 641–959px (iPad dọc) là một cột như điện thoại: banner nằm CUỐI form → bấm Lưu khi form trống phải cuộn tới banner, không tới ô lỗi đầu tiên (banner sẽ ngoài khung nhìn)
  assert.ok((await p.ev("document.documentElement.scrollHeight - innerHeight")) > 0, "điều kiện của phép kiểm: trang dài hơn khung nhìn (banner cuối form không tự nằm trong khung nhìn)");
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("!document.getElementById('save-error').hidden", "banner kiểm phía trình duyệt (iPad dọc)");
  await p.waitFor("(() => { const r = document.getElementById('save-error').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })()", "iPad dọc (641–959px): banner lỗi nằm trong khung nhìn sau khi bấm Lưu");
  assert.deepEqual(p.consoleErrors, []);
  p.close();
  ok("bố cục theo khổ: 1040 hai cột + nút Lưu trong khung nhìn, lỗi → focus ô lỗi đầu tiên; 800 thanh Lưu có nền, lỗi → banner trong khung nhìn; không tràn ngang");

  // ---- 12c) khối tóm tắt số tiền ở thanh dính đáy (Bước 2 Đợt B, Fix round 1 — lỗi thứ tự CSS từng làm nó KHÔNG BAO GIỜ hiện):
  //       390px (điện thoại) phải hiện với đúng số tiền; 800px (khổ giữa, vd iPad dọc) và 1040px (máy tính) phải ẩn ----
  p = await env.as(ACCOUNTS.salesA, "/order-form"); // mặc định 390×844 (điện thoại)
  await p.waitFor("document.getElementById('add-manual')", "form mới (khối tóm tắt điện thoại)");
  await p.ev("document.getElementById('add-manual').click(); true");
  await p.waitFor(`${cards}.length === 1`, "thẻ nhập tay (khối tóm tắt)");
  await p.ev(setInput(`${card(0)}.querySelector('input[placeholder="Vd: Xe đưa đón riêng"]')`, "Xe đưa đón riêng"));
  await p.ev(setInput(`${card(0)}.querySelector('input[placeholder="Vd: Xe 7 chỗ 2 chiều"]')`, "Xe 7 chỗ 2 chiều"));
  await p.ev(setInput(`${card(0)}.querySelector('.price-field')`, "500000"));
  await p.waitFor("document.getElementById('mobile-total').textContent.includes('500.000')", "khối tóm tắt điện thoại cập nhật số tiền");
  const readMobileSummary = () => p.ev(`(() => { const s = getComputedStyle(document.querySelector('.mobile-actions-summary')); return { display: s.display, total: document.getElementById('mobile-total').textContent, due: document.getElementById('mobile-due').textContent }; })()`);
  assert.deepEqual(await readMobileSummary(), { display: "block", total: "500.000 ₫", due: "500.000 ₫" }, "390px (điện thoại): khối tóm tắt PHẢI hiện, đúng số tiền");
  await p.send("Emulation.setDeviceMetricsOverride", { width: 800, height: 900, deviceScaleFactor: 1, mobile: false });
  assert.equal((await readMobileSummary()).display, "none", "800px (khổ giữa, vd iPad dọc): khối tóm tắt PHẢI ẩn");
  await p.send("Emulation.setDeviceMetricsOverride", { width: 1040, height: 800, deviceScaleFactor: 1, mobile: false });
  assert.equal((await readMobileSummary()).display, "none", "1040px (máy tính): khối tóm tắt PHẢI ẩn");
  p.close();
  ok("khối tóm tắt số tiền thanh dính đáy: 390px hiện + đúng số tiền, 800px và 1040px ẩn (cascade CSS đúng cả 3 dải khổ)");

  // ---- 12) đo: vùng chạm, cỡ chữ ô gõ, không tràn ngang, không lỗi console ----
  p = await env.as(ACCOUNTS.salesA, "/order-form");
  await p.waitFor("document.getElementById('catalog-q')", "form");
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
  await p.waitFor("document.querySelectorAll('#catalog-list button').length === 1", "TD101");
  await p.ev("document.querySelector('#catalog-list button').click(); true");
  await p.waitFor(`${cards}.length === 1`, "thẻ để đo");
  const m = await p.ev(`(() => {
    const small = [...document.querySelectorAll('.counter-btn, .svc-remove, #save, .catalog-list button, .trip > summary')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.height < 43.5 || r.width < 43.5); }).map((el) => el.className + ' ' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height));
    const smallFont = [...document.querySelectorAll('input, select, textarea')].filter((el) => el.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.id || el.className);
    return { small, smallFont, overflow: document.documentElement.scrollWidth - window.innerWidth };
  })()`);
  assert.deepEqual(m.small, [], `vùng chạm < 44px: ${m.small}`);
  assert.deepEqual(m.smallFont, [], `ô gõ < 16px: ${m.smallFont}`);
  assert.ok(m.overflow <= 0, `tràn ngang ${m.overflow}px ở 390px`);
  assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
  ok("đo: vùng chạm ≥ 44px, ô gõ ≥ 16px, không tràn ngang ở 390px, 0 lỗi console");
  p.close();
} finally {
  await env.stop();
}
console.log("UI SMOKE FORM OK");
