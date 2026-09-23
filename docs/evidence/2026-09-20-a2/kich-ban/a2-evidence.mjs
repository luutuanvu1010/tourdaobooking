// Bằng chứng giao diện A2 (Hiến pháp §8.2: bằng chứng thay cho lời khai). Đo trên `wrangler dev` cục bộ với D1 tạm, bằng Chrome headless — KHÔNG phải iPhone thật.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-20-a2/kich-ban/a2-evidence.mjs
// Ghi: docs/evidence/2026-09-20-a2/anh/*.png và ket-qua-do.json. Dừng ngay (assert) nếu có lỗi axe critical/serious, vùng chạm < 44px, ô gõ < 16px, tràn ngang hay lỗi console.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, clickText, ok, setInput, sleep, startEnv, vnDate } from "./a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-20-a2";
const AXE = readFileSync(process.env.AXE_JS, "utf8");
mkdirSync(join(OUT, "anh"), { recursive: true });
const result = { ghiChu: "Đo bằng Chrome headless trên wrangler dev cục bộ (D1 tạm); không phải iPhone thật.", axe: {}, do: {}, font: {} };

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
  const M = { width: 390, height: 844, mobile: true };
  const DESK = { width: 1040, height: 800, mobile: false };

  /** Mở trang với phiên của `account`; đặt DPR 1 để ảnh nhỏ và đúng 390 px ngang. */
  const open = async (account, path, vp = M) => {
    const p = await env.as(account, path, vp);
    await p.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
    p.vp = vp;
    return p;
  };
  const write = (name, r) => writeFileSync(join(OUT, "anh", name), Buffer.from(r.result.data, "base64"));
  /**
   * Chụp cả trang / một phần tử: nới khung nhìn bằng ĐÚNG chiều cao trang rồi chụp trong khung. KHÔNG dùng `captureBeyondViewport`: nó vẽ thanh dính/cố định
   * (thanh tiêu đề, thanh tab, thanh Lưu) GIỮA trang và đè lên nội dung — ảnh sai mà kiểm vẫn qua.
   */
  const tall = async (p, shoot) => {
    await p.ev("window.scrollTo(0, 0); true");
    const h = await p.ev("Math.ceil(document.documentElement.scrollHeight)");
    await p.send("Emulation.setDeviceMetricsOverride", { width: p.vp.width, height: Math.max(h, p.vp.height), deviceScaleFactor: 1, mobile: p.vp.mobile });
    await p.ev("new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))");
    try { return await shoot(); } finally { await p.send("Emulation.setDeviceMetricsOverride", { width: p.vp.width, height: p.vp.height, deviceScaleFactor: 1, mobile: p.vp.mobile }); }
  };
  const full = (p, name) => tall(p, async () => write(name, await p.send("Page.captureScreenshot", { format: "png" })));
  const view = async (p, name) => write(name, await p.send("Page.captureScreenshot", { format: "png" }));
  const shotEl = (p, sel, name) => tall(p, async () => {
    const r = await p.ev(`(() => { const b = (${sel}).getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; })()`);
    write(name, await p.send("Page.captureScreenshot", { format: "png", clip: { ...r, scale: 1 } }));
  });

  /** axe-core: 0 vi phạm critical/serious (`strict`); mọi vi phạm được ghi vào ket-qua-do.json. `strict = false` (trang cũ ngoài A2): chỉ ghi lại. */
  const axe = async (p, label, strict = true) => {
    if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
    const v = await p.ev(`axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help, mau: x.nodes.slice(0, 2).map((n) => n.target.join(' ')) })))`);
    result.axe[label] = v;
    const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
    if (strict) assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
  };
  /** Vùng chạm ≥ 44px, ô gõ ≥ 16px, không tràn ngang, 0 lỗi console. */
  const measure = async (p, label) => {
    const m = await p.ev(`(() => {
      const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[inert], [hidden]'); };
      const tap = [...document.querySelectorAll('button, summary, a.btn, .counter-btn')].filter((el) => shown(el) && el.getBoundingClientRect().height < 43.5).map((el) => (el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().height));
      const font = [...document.querySelectorAll('input, select, textarea')].filter((el) => shown(el) && parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.id || el.dataset.trip || el.className);
      return { tapDuoi44: tap, oGoDuoi16: font, trànNgang: document.documentElement.scrollWidth - innerWidth };
    })()`);
    result.do[label] = { ...m, loiConsole: p.consoleErrors.length };
    assert.deepEqual(m.tapDuoi44, [], `vùng chạm < 44px (${label}): ${m.tapDuoi44}`);
    assert.deepEqual(m.oGoDuoi16, [], `ô gõ < 16px (${label}): ${m.oGoDuoi16}`);
    assert.ok(m.trànNgang <= 0, `tràn ngang ${m.trànNgang}px (${label})`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console (${label}): ${p.consoleErrors}`);
  };
  const check = async (p, label) => { await axe(p, label); await measure(p, label); };

  // ================= A) form lập đơn dựng bằng giao diện (khổ iPhone) =================
  let p = await open(ACCOUNTS.salesA, "/order-form");
  await p.waitFor("document.getElementById('services-empty') && !document.getElementById('services-empty').hidden", "form trống");
  await full(p, "tt-form-trong.png");
  await check(p, "form-trong");
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.waitFor("document.querySelectorAll('#catalog-list button').length === 3", "danh sách danh mục");
  await view(p, "tt-ket-qua-tim.png");
  await axe(p, "form-ket-qua-tim");
  await p.ev(setInput("document.getElementById('catalog-q')", "khong-co"));
  await p.waitFor("/Không tìm thấy dịch vụ/.test(document.getElementById('catalog-list').textContent)", "danh sách rỗng");
  await view(p, "tt-ket-qua-rong.png");
  await axe(p, "form-ket-qua-rong");

  const cards = "document.querySelectorAll('#services .svc')";
  const counter = (i, label) => `${cards}[${i}].querySelector('.counter-field[aria-label=${JSON.stringify(label)}]')`;
  const tf = (i, k) => `${cards}[${i}].querySelector('[data-trip="${k}"]')`;
  const pick = async (q) => {
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", q));
    await p.waitFor("document.querySelectorAll('#catalog-list button').length === 1", `kết quả ${q}`);
    await p.ev("document.querySelector('#catalog-list button').click(); true");
  };
  await pick("TD101");
  await p.waitFor(`${cards}.length === 1`, "thẻ 1");
  await p.ev(setInput(counter(0, "Người lớn"), "2"));
  await p.ev(setInput(counter(0, "Trẻ em"), "1"));
  await p.ev(setInput(`${cards}[0].querySelector('.price-field[aria-label="Đơn giá người lớn"]')`, "1300000"));
  await pick("phao");
  await p.waitFor(`${cards}.length === 2`, "thẻ 2");
  await p.ev(setInput(counter(1, "Số khách"), "7"));
  await p.ev("document.getElementById('add-manual').click(); true");
  await p.waitFor(`${cards}.length === 3`, "thẻ 3");
  await p.ev(setInput(`${cards}[2].querySelector('input[placeholder="Vd: Xe đưa đón riêng"]')`, "Xe đưa đón riêng"));
  await p.ev(setInput(`${cards}[2].querySelector('.counter-field[aria-label="Số khách (chỉ để vận hành)"]')`, "3"));
  await p.ev(setInput(`${cards}[2].querySelector('input[placeholder="Vd: Xe 7 chỗ 2 chiều"]')`, "Xe 7 chỗ 2 chiều"));
  await p.ev(setInput(`${cards}[2].querySelector('.price-field')`, "800000"));
  // thẻ 1: khối chuyến mở + cảnh báo ngày đã qua (1c); thẻ 0: khối chuyến điền đủ rồi thu gọn (1b)
  await p.ev(`${cards}[0].querySelector('details.trip > summary').click(); true`);
  for (const [k, v] of [["departDate", vnDate(10)], ["departTime", "07:30"], ["pickupTime", "07:00"], ["pickupPlace", "Khách sạn Sunrise"], ["checkinTime", "09:00"]]) await p.ev(setInput(tf(0, k), v));
  await p.ev(`${cards}[0].querySelector('details.trip > summary').click(); true`);
  await p.waitFor(`!${cards}[0].querySelector('details.trip').open`, "thu gọn khối chuyến thẻ 1");
  await p.ev(`${cards}[1].querySelector('details.trip > summary').click(); true`);
  await p.ev(setInput(tf(1, "departDate"), vnDate(-2)));
  await p.waitFor(`/đã qua/.test(${cards}[1].querySelector('.svc-warnings').textContent)`, "cảnh báo ngày đã qua");
  await shotEl(p, `${cards}[1]`, "1c-khoi-chuyen-mo-canh-bao.png");
  await p.ev(setInput(tf(1, "departDate"), vnDate(10)));
  await p.ev(`${cards}[1].querySelector('details.trip > summary').click(); true`);
  await full(p, "1a-form-3-dich-vu.png");
  await shotEl(p, `${cards}[0].querySelector('details.trip')`, "1b-khoi-chuyen-thu-gon.png");
  await shotEl(p, `${cards}[0]`, "1d-the-theo-nguoi.png");
  await shotEl(p, `${cards}[1]`, "1d-the-theo-nhom.png");
  await shotEl(p, `${cards}[2]`, "1d-the-nhap-tay.png");
  await check(p, "form-3-dich-vu");
  // 1e: vượt 50 khách → viền đỏ + "Tối đa 50 khách."
  await p.ev(setInput(counter(0, "Người lớn"), "51"));
  await p.waitFor(`/Tối đa 50 khách\\./.test(${cards}[0].textContent)`, "lỗi 50 khách");
  await shotEl(p, `${cards}[0]`, "1e-the-loi-50-khach.png");
  await p.ev(setInput(counter(0, "Người lớn"), "2"));
  // 1f: banner kiểm phía trình duyệt (thiếu tên/SĐT/hình thức cọc)
  await p.ev(setInput("document.getElementById('depositAmount')", "500000"));
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("!document.getElementById('save-error').hidden", "banner kiểm phía trình duyệt");
  await view(p, "1f-banner-kiem-tra.png");
  await axe(p, "form-banner-kiem-tra");
  // tt: đang lưu (yêu cầu treo)
  await p.ev(setInput("document.getElementById('customerName')", "Trần Văn Bình"));
  await p.ev(setInput("document.getElementById('customerPhone')", "0901 234 567"));
  await p.ev(setInput("document.getElementById('depositMethod')", "cash"));
  await p.ev("window.fetch = () => new Promise(() => {}); document.getElementById('save').click(); true");
  await p.waitFor("document.getElementById('save').textContent === 'Đang lưu…' && document.getElementById('save').disabled", "trạng thái đang lưu");
  await view(p, "tt-dang-luu.png");
  p.close();
  ok("A) form: trống, tìm, 3 dịch vụ (theo người/nhóm/nhập tay), chuyến thu gọn/mở + cảnh báo, lỗi 50 khách, banner kiểm, đang lưu");

  // ================= B) trang đơn: nháp → thiếu chuyến → đã xác nhận → bảng sửa =================
  const svcTour = (o = {}) => ({ kind: "catalog", catalogCode: "TD101", pax: pax(2, 1), unitPrices: { adult: 1300000, child: 950000 }, catalogPriceSeen: { adult: 1350000, child: 950000 }, ...NO_TRIP, departDate: vnDate(10), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise", checkinTime: "09:00", note: "Đón sớm", ...o });
  const svcBanana = (o = {}) => ({ kind: "catalog", catalogCode: "TTB03", pax: pax(7), unitPrices: { adult: 1500000 }, catalogPriceSeen: { adult: 1500000 }, ...NO_TRIP, departDate: vnDate(10), departTime: "10:00", ...o });
  const svcCar = (o = {}) => ({ kind: "manual", name: "Xe đưa đón riêng", pax: pax(3), items: [{ description: "Xe 7 chỗ 2 chiều", detail: "", quantity: 1, unitPrice: 800000 }], ...NO_TRIP, ...o });
  const base = { customerName: "Trần Văn Bình", customerPhone: "0901 234 567", customerEmail: "", customerNote: "", discount: 100000, depositAmount: 500000, depositMethod: "cash", paymentNote: "" };
  const create = async (body) => {
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", body);
    assert.equal(r.status, 201, JSON.stringify(r.json));
    return r.json.order;
  };
  const main = await create({ ...base, services: [svcTour(), svcBanana(), svcCar()] });
  const items = "document.querySelectorAll('#order .svc-view')";

  p = await open(ACCOUNTS.salesA, `/order?id=${main.id}`);
  await p.waitFor(`${items}.length === 3`, "đơn nháp");
  await full(p, "1h-don-nhap.png");
  await check(p, "don-nhap");
  await p.ev("window.confirm = () => true; true");
  await p.ev(clickText("#actions", "Xác nhận đơn"));
  await p.waitFor("!document.getElementById('error').hidden && /Chưa đủ thông tin chuyến/.test(document.getElementById('error').textContent)", "banner thiếu chuyến");
  await view(p, "1i-don-thieu-chuyen.png");
  await check(p, "don-thieu-chuyen");
  p.close();
  // bổ sung ngày qua API, mở lại, xác nhận bằng giao diện
  const d = (await call(ACCOUNTS.salesA, "GET", `/api/orders/${main.id}`)).json.order;
  const tripOf = (s, o = {}) => ({ id: s.id, departDate: s.departDate ?? "", departTime: s.departTime ?? "", pickupTime: s.pickupTime ?? "", pickupPlace: s.pickupPlace ?? "", checkinDate: s.checkinDate ?? "", checkinTime: s.checkinTime ?? "", checkinPlace: s.checkinPlace ?? "", note: s.note ?? "", ...o });
  assert.equal((await call(ACCOUNTS.salesA, "PUT", `/api/orders/${main.id}/trip`, { expectedUpdatedAt: d.updatedAt, services: [tripOf(d.services[0]), tripOf(d.services[1]), tripOf(d.services[2], { departDate: vnDate(12) })] })).status, 200);
  p = await open(ACCOUNTS.salesA, `/order?id=${main.id}`);
  await p.waitFor(`${items}.length === 3`, "đơn nạp lại");
  await p.ev("window.confirm = () => true; true");
  await p.ev(clickText("#actions", "Xác nhận đơn"));
  await p.waitFor("document.querySelector('#order .badge')?.textContent === 'Đã xác nhận'", "đã xác nhận");
  await full(p, "1j-don-da-xac-nhan.png");
  await check(p, "don-da-xac-nhan");
  await p.ev(clickText("#actions", "Sửa thông tin chuyến"));
  await p.waitFor("document.querySelector('.sheet-root.open') !== null", "bảng sửa mở");
  await p.waitFor("(() => { const r = document.querySelector('.sheet').getBoundingClientRect(); return Math.abs(r.bottom - innerHeight) < 1; })()", "bảng trượt xong");
  await view(p, "1k-bang-sua-chuyen.png");
  await check(p, "bang-sua-chuyen");
  await p.ev(setInput("document.querySelectorAll('.sheet .sheet-svc')[2].querySelector('[data-trip=\"departDate\"]')", ""));
  await p.ev(clickText(".sheet", "Lưu thông tin chuyến"));
  await p.waitFor("document.querySelector('.sheet .field-error') !== null", "lỗi ngày trống trong bảng");
  await view(p, "1k-bang-sua-loi.png");
  p.close();
  ok("B) trang đơn: nháp, thiếu chuyến (banner), đã xác nhận, bảng sửa (bình thường + lỗi)");

  // đơn đã huỷ
  const cancelled = await create({ ...base, customerName: "Khách Đã Huỷ", services: [svcTour()] });
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${cancelled.id}/status`, { status: "cancelled" })).status, 200);
  p = await open(ACCOUNTS.salesA, `/order?id=${cancelled.id}`);
  await p.waitFor(`${items}.length === 1 && document.querySelector('#order .badge').textContent === 'Đã huỷ'`, "đơn đã huỷ");
  await full(p, "tt-don-da-huy.png");
  await check(p, "don-da-huy");
  p.close();

  // ================= C) máy tính (1040) =================
  p = await open(ACCOUNTS.salesA, `/order?id=${main.id}`, DESK);
  await p.waitFor(`${items}.length === 3`, "đơn (máy tính)");
  await full(p, "1g-may-tinh-don.png");
  await axe(p, "may-tinh-don");
  await p.ev(clickText("#actions", "Sửa thông tin chuyến"));
  await p.waitFor("document.querySelector('.sheet-root.open') !== null && getComputedStyle(document.querySelector('.sheet')).opacity === '1'", "bảng (máy tính)");
  await view(p, "1k-may-tinh-bang-sua.png");
  await axe(p, "may-tinh-bang-sua");
  assert.deepEqual(p.consoleErrors, []);
  p.close();
  ok("B–C) đơn đã huỷ, máy tính: trang đơn và bảng sửa");

  // ================= D) xung đột và thẻ theo trạng thái danh mục =================
  const snap = await create({ ...base, customerName: "Khách Bản Chụp", services: [svcTour({ pax: pax(2), unitPrices: { adult: 1350000 } }), svcBanana()] });
  // 1f: catalog_changed — mở form MỚI khi giá còn 1.350.000 rồi đổi giá trước khi Lưu
  p = await open(ACCOUNTS.salesA, "/order-form");
  await p.waitFor("document.getElementById('catalog-q')", "form mới");
  await pick("TD101");
  await p.waitFor(`${cards}.length === 1`, "thẻ");
  await p.ev(setInput(tf(0, "departDate"), vnDate(8)));
  await p.ev(setInput("document.getElementById('customerName')", "Khách Đổi Giá"));
  await p.ev(setInput("document.getElementById('customerPhone')", "0902 222 333"));
  env.sql("UPDATE catalog_item SET price_adult = 1400000 WHERE code = 'TD101'");
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("!document.getElementById('save-error').hidden && /Giá danh mục vừa đổi/.test(document.getElementById('save-error').textContent)", "banner catalog_changed");
  await view(p, "1f-banner-gia-danh-muc-doi.png");
  await axe(p, "form-banner-gia-doi");
  p.close();
  env.sql("UPDATE catalog_item SET in_sheet = 0 WHERE code = 'TTB03'"); // dịch vụ 2 của đơn "Bản Chụp" rời danh mục
  // 1e: thẻ bản chụp (giá đã đổi) và thẻ khoá (dịch vụ rời danh mục); 1f: stale
  p = await open(ACCOUNTS.salesA, `/order-form?id=${snap.id}`);
  await p.waitFor(`${cards}.length === 2`, "form sửa đơn Bản Chụp");
  await shotEl(p, `${cards}[0]`, "1e-the-ban-chup-gia-doi.png");
  await shotEl(p, `${cards}[1]`, "1e-the-khoa.png");
  await check(p, "form-sua-nhap");
  const sd = (await call(ACCOUNTS.salesA, "GET", `/api/orders/${snap.id}`)).json.order;
  assert.equal((await call(ACCOUNTS.salesA, "PUT", `/api/orders/${snap.id}/trip`, { expectedUpdatedAt: sd.updatedAt, services: sd.services.map((s, i) => tripOf(s, i === 0 ? { note: "Người khác vừa sửa" } : {})) })).status, 200); // phải ĐỔI một trường thật: PUT giữ nguyên giá trị là no-op, máy chủ không tăng updatedAt
  await p.ev("document.getElementById('save').click(); true");
  await p.waitFor("!document.getElementById('save-error').hidden && /Đơn vừa được người khác sửa/.test(document.getElementById('save-error').textContent)", "banner stale");
  await view(p, "1f-banner-don-da-doi.png");
  p.close();
  p = await open(ACCOUNTS.salesA, `/order?id=${snap.id}`, DESK);
  await p.waitFor(`${items}.length === 2`, "đơn Bản Chụp (máy tính)");
  assert.equal(await p.ev("document.querySelectorAll('#order .chip-warn, #order .chip-muted').length"), 2, "nhãn 'Giá danh mục đã đổi' và 'Dịch vụ đã ẩn khỏi danh mục'");
  p.close();
  // 1g: form sửa ở máy tính (khối chuyến mở sẵn, cột tóm tắt bên phải)
  p = await open(ACCOUNTS.salesA, `/order-form?id=${snap.id}`, DESK);
  await p.waitFor(`${cards}.length === 2`, "form sửa nháp (máy tính)");
  await full(p, "1g-may-tinh-form.png");
  await axe(p, "may-tinh-form");
  assert.deepEqual(p.consoleErrors, []);
  p.close();
  ok("D) xung đột và trạng thái danh mục: catalog_changed, stale, thẻ bản chụp, thẻ khoá, form máy tính");

  // ================= E) font tự lưu trữ và cache của service worker =================
  p = await open(ACCOUNTS.salesA, `/order?id=${main.id}`);
  await p.waitFor(`${items}.length === 3`, "đơn (đo font)");
  await p.ev("document.fonts.ready.then(() => true)");
  result.font = await p.ev(`(() => {
    const rules = [...document.styleSheets].flatMap((s) => [...s.cssRules]).filter((r) => r.constructor.name === 'CSSFontFaceRule');
    return { soKhaiBao: rules.length, fontDisplay: [...new Set(rules.map((r) => r.style.fontDisplay))], daNap: [...document.fonts].filter((f) => f.status === 'loaded').length,
      chuThan: getComputedStyle(document.body).fontFamily.split(',')[0].trim(), tieuDe: getComputedStyle(document.querySelector('.svc-name')).fontFamily.split(',')[0].trim() };
  })()`);
  assert.equal(result.font.soKhaiBao, 6);
  assert.deepEqual(result.font.fontDisplay, ["swap"]);
  assert.ok(result.font.daNap >= 2, "font được nạp thật");
  assert.match(result.font.chuThan, /Nunito/);
  assert.match(result.font.tieuDe, /Be Vietnam Pro/);
  result.font.datTruocTrongServiceWorker = await p.ev(`(async () => { await navigator.serviceWorker.ready; for (let i = 0; i < 100; i++) { if (await caches.match('/fonts/nunito-latin-viet-var.woff2')) return true; await new Promise((r) => setTimeout(r, 100)); } return false; })()`);
  assert.equal(result.font.datTruocTrongServiceWorker, true, "font nằm trong cache của service worker (mở ngoại tuyến không rơi về system-ui)");
  p.close();
  // chặn mọi tệp woff2 (và bỏ qua service worker): chữ PHẢI vẫn hiện bằng font dự phòng (font-display: swap — không có khoảng chữ tàng hình)
  const blocked = await env.openPage(M);
  const c = await env.login(ACCOUNTS.salesA);
  await blocked.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
  await blocked.send("Network.setBypassServiceWorker", { bypass: true });
  await blocked.send("Network.setCacheDisabled", { cacheDisabled: true });
  await blocked.send("Network.setBlockedURLs", { urls: ["*.woff2"] });
  await blocked.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await blocked.send("Page.navigate", { url: `${env.base}/order?id=${main.id}` });
  await blocked.waitFor(`${items}.length === 3`, "đơn khi font bị chặn");
  result.font.khiBiChan = await blocked.ev(`(() => { const t = document.querySelector('.svc-name'); const r = t.getBoundingClientRect(); return { chuHienRa: r.width > 0 && getComputedStyle(t).visibility === 'visible' && getComputedStyle(t).color !== 'rgba(0, 0, 0, 0)', fontNap: [...document.fonts].filter((f) => f.status === 'loaded').length }; })()`);
  assert.deepEqual(result.font.khiBiChan, { chuHienRa: true, fontNap: 0 });
  write("tt-font-bi-chan.png", await blocked.send("Page.captureScreenshot", { format: "png" }));
  blocked.close();
  ok(`E) font: ${result.font.soKhaiBao} @font-face đều swap; ${result.font.daNap}/${result.font.soKhaiBao} tệp nạp trên trang đo (subset còn lại không dùng đến); 1 tệp dò thấy trong cache service worker; chặn woff2 vẫn hiện chữ`);

  // ================= F) trang NGOÀI phạm vi A2 — kiểm hồi quy CSS dùng chung =================
  // Task 2 đổi cỡ chữ ô gõ TOÀN ứng dụng (13,6 → 16px); Task 8/9 thêm quy tắc `.kv`, `.actions` dùng chung. Chủ dự án ký thị giác cho cả nhánh nên các trang cũ phải có ảnh + đo:
  // không tràn ngang, ô gõ ≥ 16px, 0 lỗi console (chặn). axe trên các trang cũ CHỈ GHI LẠI (không chặn): vi phạm có sẵn từ trước A2 không phải việc của A2, nhưng chủ dự án phải thấy (README).
  result.hoiQuy = {};
  const openAnon = async (path, vp = M) => {
    const p = await env.openPage(vp);
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path}`);
    await p.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
    p.vp = vp;
    return p;
  };
  const OTHERS = [["dang-nhap", "/login", null], ["danh-sach-don", "/orders", ACCOUNTS.admin], ["dich-vu", "/catalog", ACCOUNTS.admin], ["nhan-vien", "/staff", ACCOUNTS.admin], ["ho-so", "/parties", ACCOUNTS.admin], ["dia-diem", "/locations", ACCOUNTS.admin], ["toi", "/account", ACCOUNTS.admin], ["nhat-ky", "/audit", ACCOUNTS.admin]];
  for (const [label, path, account] of OTHERS) {
    p = account ? await open(account, path) : await openAnon(path);
    await sleep(1500); // trang nạp dữ liệu bằng JS sau khi tải xong
    await full(p, `hq-${label}.png`);
    const m = await p.ev(`(() => ({ oGoDuoi16: [...document.querySelectorAll('input, select, textarea')].filter((el) => el.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.id || el.name || el.className), trànNgang: document.documentElement.scrollWidth - innerWidth }))()`);
    result.hoiQuy[label] = { ...m, loiConsole: p.consoleErrors.length };
    assert.deepEqual(m.oGoDuoi16, [], `ô gõ < 16px (${label}): ${m.oGoDuoi16}`);
    assert.ok(m.trànNgang <= 0, `tràn ngang ${m.trànNgang}px (${label})`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console (${label}): ${p.consoleErrors}`);
    await axe(p, `hq-${label}`, false);
    p.close();
  }
  ok("F) 8 trang ngoài A2 (đăng nhập, danh sách đơn, dịch vụ, nhân viên, hồ sơ, địa điểm, tôi, nhật ký): không tràn ngang, ô gõ ≥ 16px, 0 lỗi console; axe đã ghi lại");

  // ================= G) hiệu năng ở đơn cỡ tối đa (20 dịch vụ) =================
  // Mỗi lần gõ vào một ô đơn giá, `recompute()` tính lại tóm tắt tiền và trần dòng của MỌI thẻ. Đo thời gian ĐỒNG BỘ của một sự kiện `input` khi đơn có 20 thẻ nhập tay
  // (Chrome desktop, KHÔNG phải iPhone: iPhone chậm hơn nhiều lần, cần đo trên máy thật). Vượt 100 ms thì DỪNG và ghi số thật — không tự tối ưu trong đợt này.
  p = await open(ACCOUNTS.salesA, "/order-form");
  await p.waitFor("document.getElementById('add-manual')", "form mới (đo hiệu năng)");
  await p.ev("for (let i = 0; i < 20; i++) document.getElementById('add-manual').click(); true");
  await p.waitFor(`${cards}.length === 20`, "20 thẻ nhập tay");
  const ms = await p.ev(`(() => { const el = document.querySelector('#services .svc .price-field'); const t = performance.now(); el.value = '123456'; el.dispatchEvent(new Event('input', { bubbles: true })); return performance.now() - t; })()`);
  // Số trên chỉ gồm JS đồng bộ của sự kiện (không gồm bố cục/vẽ): đo thêm một lần gõ nữa CÓ ép tính bố cục (đọc offsetHeight) để người đọc không hiểu lầm là "nhanh tuyệt đối".
  const msLayout = await p.ev(`(() => { const el = document.querySelector('#services .svc .price-field'); const t = performance.now(); el.value = '654321'; el.dispatchEvent(new Event('input', { bubbles: true })); void document.body.offsetHeight; return performance.now() - t; })()`);
  result.hieuNang = { soDichVu: 20, msMoiLanGo: Math.round(ms * 10) / 10, msMoiLanGoKemBoCuc: Math.round(msLayout * 10) / 10, ghiChu: "Chrome desktop, một lần đo mỗi số. msMoiLanGo = JS đồng bộ của sự kiện input; msMoiLanGoKemBoCuc = cộng cả ép tính bố cục. Không gồm vẽ. iPhone chậm hơn nhiều lần — cần đo trên máy thật." };
  p.close();
  assert.ok(ms < 100, `hiệu năng: một lần gõ vào ô đơn giá ở đơn 20 dịch vụ mất ${ms} ms (ngưỡng 100 ms)`);
  ok(`G) hiệu năng: đơn 20 dịch vụ, một lần gõ vào ô đơn giá = ${result.hieuNang.msMoiLanGo} ms JS đồng bộ (${result.hieuNang.msMoiLanGoKemBoCuc} ms kèm ép bố cục); Chrome desktop, iPhone chậm hơn nhiều lần — cần đo trên máy thật`);

  writeFileSync(join(OUT, "ket-qua-do.json"), JSON.stringify(result, null, 2) + "\n");
} finally {
  await env.stop();
}
console.log("A2 EVIDENCE OK");
