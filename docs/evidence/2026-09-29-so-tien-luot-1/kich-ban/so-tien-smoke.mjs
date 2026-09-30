// Sổ tiền lượt 1 — kiểm trang đơn bằng Chrome thật (ADR-0025, ADR-0026; kế hoạch Task 10). Chạy từ GỐC repo:
//   npm run build:web && CHROME_BIN=<đường dẫn tuyệt đối tới docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-29-so-tien-luot-1/kich-ban/so-tien-smoke.mjs
// Phạm vi TỐI THIỂU (màn CŨ có phần tiền mới): khung Thanh toán (số từ billing), nút theo quyền, ghi lần thu bằng giao diện, "Đã giao – đã thu đủ" → khoá.
// Hai màn sổ MỚI chưa dựng (ảnh phác ở ../anh-phac/). Các trang dùng CHUNG kho cookie: trang Bán hàng mở trước, Quản trị mở sau cùng.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { ACCOUNTS, clickText, ok, setInput, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = "docs/evidence/2026-09-29-so-tien-luot-1/anh";
mkdirSync(OUT, { recursive: true });
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
  const created = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách Sổ Tiền", customerPhone: "0903 222 333", customerEmail: "", customerNote: "", discount: 0, paymentNote: "",
    services: [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 },
      departDate: vnDate(3), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const o = created.json.order;
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${o.id}/payments`, { soTien: 500000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" })).status, 200);
  // Đã đi tour hôm qua (Đã giao đòi hôm nay ≥ ngày đi muộn nhất) — trường vận hành, sửa được sau xác nhận.
  env.sql(`UPDATE order_service SET depart_date = '${vnDate(-1)}' WHERE order_id = '${o.id}'`);
  const kv = "[...document.querySelectorAll('[data-khoi=\"thanh-toan\"] .kv')].map((k) => [k.children[0].textContent, k.children[1].textContent])";

  // ---- 1) Bán hàng (390): khung Thanh toán đọc số của billing; có "Ghi lần thu"; KHÔNG có "Đã giao" (ô order.handover = none) ----
  const p = await env.as(ACCOUNTS.salesA, `/order?id=${o.id}`);
  await p.waitFor("!!document.querySelector('[data-khoi=\"thanh-toan\"]') && /Đã thu/.test(document.querySelector('[data-khoi=\"thanh-toan\"]').textContent)", "khung Thanh toán có số billing");
  const r1 = await p.ev(kv);
  assert.deepEqual(r1.slice(0, 5), [["Tạm tính", "1.350.000 ₫"], ["Giảm giá", "0 ₫"], ["Tổng cộng", "1.350.000 ₫"], ["Đã thu", "500.000 ₫"], ["Còn lại", "850.000 ₫"]], JSON.stringify(r1));
  assert.equal(await p.ev("!!document.querySelector('[data-action=\"ghi-lan-thu\"]')"), true, "Bán hàng ghi được lần thu (own)");
  assert.equal(await p.ev("!!document.querySelector('[data-action=\"da-giao\"]')"), false, "Bán hàng KHÔNG có nút Đã giao");
  assert.equal(await p.ev("document.querySelectorAll('[data-khoi=\"lan-thu\"] li').length"), 1, "một lần thu");
  assert.equal(await p.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1"), true, "không tràn ngang 390");
  await p.shot(`${OUT}/1-ban-hang-390.png`);
  p.close();
  ok("Bán hàng 390: Đã thu 500.000 / Còn lại 850.000 từ billing; có Ghi lần thu; không có Đã giao");

  // ---- 2) Quản trị (390, mở SAU CÙNG): Đã giao tắt + lý do; ghi lần thu 850.000 bằng giao diện; Đã giao → khoá ----
  const q = await env.as(ACCOUNTS.admin, `/order?id=${o.id}`);
  await q.waitFor("!!document.querySelector('[data-action=\"da-giao\"]')", "nút Đã giao của Quản trị");
  assert.equal(await q.ev("document.querySelector('[data-action=\"da-giao\"]').disabled"), true, "còn thiếu tiền → nút tắt");
  assert.match(await q.ev("document.querySelector('[data-khoi=\"ly-do-giu\"]').textContent"), /^Đang giữ đơn: .+ Ai xử lý: .+\.$/);
  await q.ev("document.querySelector('[data-action=\"ghi-lan-thu\"]').click(); true");
  await q.waitFor("!!document.querySelector('[data-khoi=\"form-lan-thu\"]')", "form ghi lần thu");
  assert.equal(await q.ev("document.querySelector('[data-khoi=\"form-lan-thu\"] select').value"), "BANK_TRANSFER", "hình thức mặc định Chuyển khoản");
  await q.ev(setInput("document.querySelector('[data-khoi=\"form-lan-thu\"] input')", "850000"));
  await q.ev("(() => { const s = document.querySelectorAll('[data-khoi=\"form-lan-thu\"] select'); s[0].value = 'CASH'; s[1].value = 'toi'; return true; })()");
  await q.shot(`${OUT}/2-ghi-lan-thu-390.png`);
  await q.ev("document.querySelector('[data-khoi=\"form-lan-thu\"] button[type=\"submit\"]').click(); true");
  await q.waitFor("[...document.querySelectorAll('[data-khoi=\"thanh-toan\"] .kv')].some((k) => k.children[0].textContent === 'Còn lại' && k.children[1].textContent === '0 ₫')", "Còn lại 0 ₫ sau khi ghi", 10000);
  await q.waitFor("document.querySelector('[data-action=\"da-giao\"]') && !document.querySelector('[data-action=\"da-giao\"]').disabled", "nút Đã giao bật");
  await q.ev("window.confirm = () => true; document.querySelector('[data-action=\"da-giao\"]').click(); true");
  await q.waitFor("[...document.querySelectorAll('.lock-note')].some((n) => /Đơn đã Đã giao – đã thu đủ/.test(n.textContent))", "câu khoá sau Đã giao", 10000);
  assert.equal(await q.ev("!!document.querySelector('[data-action=\"da-giao\"]')"), false, "hết nút Đã giao");
  assert.equal(await q.ev("!!document.querySelector('[data-action=\"hoan-thanh\"]')"), false, "Quản trị KHÔNG có nút Hoàn thành (order.complete = none)");
  assert.equal(await q.ev("!!document.querySelector('[data-action=\"ghi-lan-thu\"]')"), false, "đơn đã khoá: không ghi lần thu");
  assert.ok(/Đã giao – đã thu đủ/.test(await q.ev("document.body.textContent")), "nhãn trạng thái tiếng Việt");
  assert.equal(await q.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1"), true, "không tràn ngang 390");
  await q.shot(`${OUT}/3-da-giao-390.png`);
  const errs = [...q.consoleErrors];
  q.close();
  ok("Quản trị 390: Đã giao tắt + lý do; ghi lần thu qua giao diện (mặc định Chuyển khoản); Đã giao → câu khoá, hết nút ghi / Đã giao, không Hoàn thành");

  // ---- 3) Máy tính 1040: cùng đơn (đã khoá) — bố cục khung Thanh toán ----
  const d = await env.as(ACCOUNTS.admin, `/order?id=${o.id}`, { width: 1040, height: 900, mobile: false });
  await d.waitFor("!!document.querySelector('[data-khoi=\"thanh-toan\"]') && document.querySelectorAll('[data-khoi=\"lan-thu\"] li').length === 2", "hai lần thu");
  assert.equal(await d.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1"), true, "không tràn ngang 1040");
  await d.shot(`${OUT}/4-da-giao-1040.png`);
  d.close();
  ok("Máy tính 1040: khung Thanh toán + hai lần thu, không tràn");
  assert.deepEqual(errs, [], "không lỗi JS trên trang đơn");
} finally {
  await env.stop();
}
