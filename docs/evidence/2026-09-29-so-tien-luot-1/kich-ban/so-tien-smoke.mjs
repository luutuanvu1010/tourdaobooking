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
    services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 },
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
  await p.waitFor("!!document.querySelector('[data-khoi=\"thanh-toan\"]') && /Khách hàng đã trả trước/.test(document.querySelector('[data-khoi=\"thanh-toan\"]').textContent)", "khung Thanh toán có số billing (ADR-0089 đ3: nhãn trước Đã giao)");
  const r1 = await p.ev(kv);
  assert.deepEqual(r1.slice(0, 5), [["Tạm tính", "1.350.000 ₫"], ["Giảm giá", "0 ₫"], ["Tổng cộng", "1.350.000 ₫"], ["Khách hàng đã trả trước", "500.000 ₫"], ["Còn lại", "850.000 ₫"]] /* ADR-0089 đ3 */, JSON.stringify(r1));
  assert.equal(await p.ev("!!document.querySelector('[data-action=\"ghi-lan-thu\"]')"), true, "Bán hàng ghi được lần thu (own)");
  assert.equal(await p.ev("!!document.querySelector('[data-action=\"da-giao\"]')"), false, "Bán hàng KHÔNG có nút Đã giao");
  assert.equal(await p.ev("!!document.querySelector('[data-khoi=\"ke-toan\"], [data-action=\"dao-lan-thu\"], [data-action=\"xac-nhan-ck\"]')"), false, "Bán hàng KHÔNG thấy thao tác Kế toán");
  assert.equal(await p.ev("document.querySelectorAll('[data-khoi=\"lan-thu\"] li').length"), 1, "một lần thu");
  assert.equal(await p.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1"), true, "không tràn ngang 390");
  await p.shot(`${OUT}/1-ban-hang-390.png`);
  p.close();
  ok("Bán hàng 390: Khách hàng đã trả trước 500.000 / Còn lại 850.000 từ billing; có Ghi lần thu; không có Đã giao");

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
  await q.waitFor("[...document.querySelectorAll('.lock-note')].some((n) => /Đơn đã ở bước Đã giao – đã thu đủ/.test(n.textContent))", "câu khoá sau Đã giao", 10000);
  assert.equal(await q.ev("!!document.querySelector('[data-action=\"da-giao\"]')"), false, "hết nút Đã giao");
  assert.equal(await q.ev("!!document.querySelector('[data-action=\"hoan-thanh\"]')"), false, "Quản trị KHÔNG có nút Hoàn thành (order.complete = none)");
  assert.equal(await q.ev("!!document.querySelector('[data-khoi=\"ke-toan\"], [data-action=\"dao-lan-thu\"]')"), false, "Quản trị KHÔNG thấy thao tác Kế toán (ledger.write = none)");
  assert.equal(await q.ev("!!document.querySelector('[data-action=\"ghi-lan-thu\"]')"), false, "đơn đã khoá: không ghi lần thu");
  assert.equal(await q.ev("document.querySelectorAll('.handler-card button').length"), 0, "đơn đã khoá: không nút đổi / nhận người phụ trách");
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

  // ---- 4) Kế toán (390): thao tác đặt TẠM trên trang đơn (điều phối 30/9) — xác nhận CK, ghi hoàn khách trả dư, ghi đã nộp; Đảo đòi lý do ----
  const c2 = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách Kế Toán", customerPhone: "0903 444 555", customerEmail: "", customerNote: "", discount: 0, paymentNote: "",
    services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 },
      departDate: vnDate(3), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
  });
  assert.equal(c2.status, 201, JSON.stringify(c2.json));
  const o2 = c2.json.order;
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${o2.id}/payments`, { soTien: 300000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" })).status, 201);
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${o2.id}/payments`, { soTien: 1200000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  // Đọc bằng tài khoản Toàn quyền (không phải Kế toán): đăng nhập lại Kế toán sẽ thay phiên của trang Kế toán đang mở (ADR-0074, `bi_thay`) và đá trang đó về /login.
  const tien2 = async () => (await call(ACCOUNTS.chu, "GET", `/api/orders/${o2.id}/payments`)).json;
  const t0 = await tien2();
  // ADR-0120 Điều 1: khoản «Công ty thu – CK» do Bán hàng khai KHÔNG sinh tiền nhân viên chưa nộp, chỉ chờ Kế toán xác nhận ⇒ chỉ còn 1.200.000 tiền mặt.
  assert.deepEqual([t0.du, t0.keToan.choXacNhan.length, t0.keToan.dangGiu.map((d) => d.soTien)], [150000, 1, [1200000]]);
  const k = await env.as(ACCOUNTS.accounting, `/order?id=${o2.id}`);
  await k.waitFor("!!document.querySelector('[data-khoi=\"ke-toan\"]') && !!document.querySelector('[data-action=\"xac-nhan-ck\"]')", "khối Kế toán + nút xác nhận CK");
  // (a) Xác nhận CK: bấm lần một chỉ mở hàng xác nhận (không gọi máy chủ), bấm "Công ty đã nhận" mới ghi.
  await k.ev("document.querySelector('[data-action=\"xac-nhan-ck\"]').click(); true");
  await k.waitFor("!!document.querySelector('[data-khoi=\"xac-nhan-xac-nhan-ck\"]')", "hàng xác nhận CK");
  assert.equal((await tien2()).keToan.choXacNhan.length, 1, "chưa bấm lần hai: chưa ghi");
  await k.shot(`${OUT}/5-ke-toan-xac-nhan-ck-390.png`);
  // ADR-0092 Đ6 (C1, 2026-10-08): xác nhận khoản CK – Công ty thu phải kèm mã giao dịch + số thực chuyển theo sao kê (kế hoạch QR + Đ6, Task 10 Bước 10).
  await k.ev(setInput("document.querySelector('[data-khoi=\"xac-nhan-xac-nhan-ck\"] [data-o=\"ma-giao-dich\"] input')", "FT26100800001"));
  await k.ev(setInput("document.querySelector('[data-khoi=\"xac-nhan-xac-nhan-ck\"] [data-o=\"so-thuc-chuyen\"] input')", "300000"));
  await k.ev("document.querySelector('[data-khoi=\"xac-nhan-xac-nhan-ck\"] button[type=\"submit\"]').click(); true");
  await k.waitFor("!document.querySelector('[data-action=\"xac-nhan-ck\"]')", "hết nút xác nhận CK", 10000);
  // Chờ dấu hiệu GHI XONG (chỉ thêm chờ, không đổi khẳng định): nút mở hàng biến mất ngay khi hàng xác nhận mở nên không đủ làm mốc; hàng xác nhận chỉ mất sau khi máy chủ ghi xong và trang tải lại.
  await k.waitFor("!document.querySelector('[data-khoi=\"xac-nhan-xac-nhan-ck\"]')", "hàng xác nhận CK đóng sau khi ghi", 10000);
  assert.deepEqual((await tien2()).keToan.dangGiu.map((d) => d.soTien), [1200000], "sau xác nhận: Bán hàng còn giữ 1.200.000");
  // (b) Đảo đòi lý do: gửi trống → báo lỗi, không ghi; bấm Thôi.
  await k.ev("document.querySelector('[data-action=\"dao-lan-thu\"]').click(); true");
  await k.waitFor("!!document.querySelector('[data-khoi=\"xac-nhan-dao-lan-thu\"]')", "hàng đảo");
  await k.ev("document.querySelector('[data-khoi=\"xac-nhan-dao-lan-thu\"] button[type=\"submit\"]').click(); true");
  await k.waitFor("/Nhập lý do huỷ\\./.test(document.body.textContent)", "báo thiếu lý do"); // ADR-0130: «Đảo» → «Huỷ khoản thu»
  assert.equal((await tien2()).lanThu.filter((l) => l.daDao).length, 0, "không đảo khi thiếu lý do");
  await k.ev("[...document.querySelectorAll('[data-khoi=\"xac-nhan-dao-lan-thu\"] button')].find((b) => b.textContent === 'Thôi').click(); true");
  // (c) Ghi hoàn cho khách trả dư 150.000 (người trả = Bán hàng đang giữ tiền).
  await k.ev("document.querySelector('[data-action=\"ghi-hoan\"]').click(); true");
  await k.waitFor("!!document.querySelector('[data-khoi=\"xac-nhan-ghi-hoan\"]')", "form hoàn");
  assert.equal(await k.ev("document.querySelector('[data-khoi=\"xac-nhan-ghi-hoan\"] input').value"), "150.000", "số hoàn gợi ý = số dư");
  await k.ev("(() => { const s = document.querySelectorAll('[data-khoi=\"xac-nhan-ghi-hoan\"] select'); s[0].value = 'CASH'; s[1].value = s[1].options[1].value; return true; })()");
  await k.ev("document.querySelector('[data-khoi=\"xac-nhan-ghi-hoan\"] button[type=\"submit\"]').click(); true");
  await k.waitFor("!document.querySelector('[data-action=\"ghi-hoan\"]')", "hết nút hoàn (hết dư)", 10000);
  await k.waitFor("!document.querySelector('[data-khoi=\"xac-nhan-ghi-hoan\"]')", "hàng hoàn đóng sau khi ghi", 10000);
  const t1 = await tien2();
  assert.deepEqual([t1.du, t1.conLai, t1.keToan.dangGiu.map((d) => d.soTien)], [0, 0, [1050000]], "hoàn 150.000 từ tiền Bán hàng giữ");
  // (d) Ghi đã nộp về công ty.
  await k.ev("document.querySelector('[data-action=\"da-nop\"]').click(); true");
  await k.waitFor("!!document.querySelector('[data-khoi=\"xac-nhan-da-nop\"]')", "hàng xác nhận nộp");
  await k.ev("document.querySelector('[data-khoi=\"xac-nhan-da-nop\"] button[type=\"submit\"]').click(); true");
  await k.waitFor("!document.querySelector('[data-action=\"da-nop\"]')", "hết nút nộp", 10000);
  await k.waitFor("!document.querySelector('[data-khoi=\"xac-nhan-da-nop\"]')", "hàng xác nhận nộp đóng sau khi ghi", 10000);
  assert.deepEqual((await tien2()).keToan.dangGiu, [], "không còn ai giữ tiền của công ty vì đơn này");
  assert.equal(await k.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1"), true, "không tràn ngang 390");
  await k.shot(`${OUT}/6-ke-toan-sau-390.png`);
  assert.deepEqual([...k.consoleErrors], [], "không lỗi JS");
  k.close();
  ok("Kế toán 390: xác nhận CK (bấm hai lần mới ghi), Đảo đòi lý do, ghi hoàn khách trả dư, ghi đã nộp — số trong sổ khớp từng bước; Bán hàng / Quản trị không thấy các nút này");
} finally {
  await env.stop();
}
