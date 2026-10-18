// Rà soát ngôn ngữ lượt 2 (18/10) — hai lỗi nút ở thẻ Thanh toán của trang đơn (hồ sơ docs/superpowers/specs/2026-10-18-ra-soat-ngon-ngu-giao-dien.md §5):
//   (1) "Sửa khoản thu đã ghi" hiện trên khoản «Công ty thu – CK» còn chờ xác nhận (máy chủ luôn từ chối 409 ck_cho_xac_nhan);
//   (3) câu "… vào tài khoản?" hiện cả với khoản tiền mặt nhân viên khai "Công ty thu".
// (Lỗi (2) — nút huỷ trên dòng trả lại / đơn huỷ: chủ chọn "chưa đổi, để duyệt sau", không có trong kịch bản này.)
// Chạy từ GỐC repo, trên D1 tạm (không đụng dữ liệu thật):
//   npm run build:web && ANH=truoc node docs/evidence/2026-10-18-ngon-ngu-luot-2/kich-ban/nut-khoan-thu.mjs   (bản cũ: chỉ chụp)
//   npm run build:web && ANH=sau   node docs/evidence/2026-10-18-ngon-ngu-luot-2/kich-ban/nut-khoan-thu.mjs   (bản mới: chụp + khẳng định)
// Một trang duy nhất (Kế toán) — kho cookie chung không ảnh hưởng.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { ACCOUNTS, ok, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const PHA = process.env.ANH ?? "sau";
const OUT = `docs/evidence/2026-10-18-ngon-ngu-luot-2/anh/${PHA}`;
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
    customerName: "Khách Thử Nút", customerPhone: "0903 222 555", customerEmail: "", customerNote: "", discount: 0, paymentNote: "",
    services: [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 },
      departDate: vnDate(3), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const o = created.json.order;
  // Bán hàng khai hai khoản "Công ty thu": tiền mặt 300.000 và chuyển khoản 200.000 — cả hai chờ Kế toán xác nhận. Kế toán tự ghi 150.000 tiền mặt (khoản thường).
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${o.id}/payments`, { soTien: 300000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${o.id}/payments`, { soTien: 200000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" })).status, 201);
  assert.equal((await call(ACCOUNTS.accounting, "POST", `/api/orders/${o.id}/payments`, { soTien: 150000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
  const tt = (await call(ACCOUNTS.chu, "GET", `/api/orders/${o.id}/payments`)).json;
  const theoSo = (so) => tt.lanThu.find((l) => l.soTien === so);
  assert.deepEqual([theoSo(300000), theoSo(200000)].map((l) => tt.keToan.choXacNhan.includes(l.id)), [true, true], "hai khoản Bán hàng khai đang chờ xác nhận");
  assert.equal(tt.keToan.choXacNhan.includes(theoSo(150000).id), false);
  // Máy chủ kiểm lại: sửa khoản CK đang chờ bị từ chối (đây là lý do ẩn nút).
  const thay = await call(ACCOUNTS.accounting, "POST", "/api/ledger/receipt-replacements", {
    orderId: o.id, cu: [theoSo(200000).id], lyDo: "Thử sửa khoản đang chờ xác nhận", moi: [{ soTien: 200000, hinhThuc: "CASH", nguoiThu: "cong_ty" }],
  });
  assert.deepEqual([thay.status, thay.json?.error?.code], [409, "ck_cho_xac_nhan"], JSON.stringify(thay.json));

  // Mỗi khoản thu = một mục có nút; đọc số tiền + các nút trong mục đó.
  const docMuc = `[...document.querySelectorAll('[data-khoi="lan-thu"] li')].map((li) => ({ chu: li.textContent, nut: [...li.querySelectorAll('[data-action]')].map((b) => b.dataset.action) }))`;
  const q = await env.as(ACCOUNTS.accounting, `/order?id=${o.id}`, { width: 390, height: 844, mobile: true });
  await q.waitFor("!!document.querySelector('[data-action=\"xac-nhan-ck\"]')", "nút xác nhận đã nhận (Kế toán)");
  await q.ev("document.querySelector('[data-khoi=\"thanh-toan\"]').scrollIntoView({ block: 'start' }); true");
  await q.shot(`${OUT}/1-ke-toan-khoan-thu-390.png`);
  const muc = await q.ev(docMuc);
  const mucCo = (so) => muc.find((m) => m.chu.includes(so));
  if (PHA === "sau") {
    assert.equal(mucCo("200.000").nut.includes("thay-lan-thu"), false, `khoản CK đang chờ: không có nút sửa — ${JSON.stringify(muc)}`);
    assert.equal(mucCo("300.000").nut.includes("thay-lan-thu"), false, "khoản tiền mặt đang chờ: không có nút sửa");
    assert.equal(mucCo("150.000").nut.includes("thay-lan-thu"), true, "khoản thường: vẫn có nút sửa");
    assert.equal(mucCo("200.000").nut.includes("xac-nhan-ck"), true, "khoản CK đang chờ: vẫn có nút xác nhận");
  }
  ok(`[${PHA}] Kế toán 390: nút trên từng khoản — ${muc.map((m) => `${m.chu.match(/[\d.]+ ₫/)?.[0]}: ${m.nut.join(",")}`).join(" | ")}`);

  // Câu xác nhận của khoản tiền mặt.
  await q.ev(`[...document.querySelectorAll('[data-khoi="lan-thu"] li')].find((li) => li.textContent.includes('300.000')).querySelector('[data-action="xac-nhan-ck"]').click(); true`);
  await q.waitFor("!!document.querySelector('[data-khoi=\"xac-nhan-xac-nhan-ck\"]')", "hàng xác nhận (tiền mặt)");
  const cauTM = await q.ev("document.querySelector('[data-khoi=\"xac-nhan-xac-nhan-ck\"]').textContent");
  await q.ev("document.querySelector('[data-khoi=\"xac-nhan-xac-nhan-ck\"]').scrollIntoView({ block: 'center' }); true");
  await q.shot(`${OUT}/2-ke-toan-xac-nhan-tien-mat-390.png`);
  if (PHA === "sau") {
    assert.doesNotMatch(cauTM, /tài khoản/, cauTM);
    assert.match(cauTM, /Công ty đã nhận đủ 300\.000 ₫ tiền mặt\?/, cauTM);
  }
  ok(`[${PHA}] câu xác nhận tiền mặt: ${cauTM.slice(0, 120)}`);
  assert.deepEqual(q.consoleErrors, [], `lỗi console: ${q.consoleErrors.join(" | ")}`);
  q.close();
  console.log(`NUT KHOAN THU ${PHA.toUpperCase()} OK`);
} finally {
  await env.stop();
}
