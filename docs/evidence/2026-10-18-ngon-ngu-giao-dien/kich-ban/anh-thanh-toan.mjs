// Rà soát ngôn ngữ giao diện 18/10 — chụp ảnh thẻ Thanh toán của trang đơn TRƯỚC và SAU khi đổi chữ (đặc tả
// docs/superpowers/specs/2026-10-18-ra-soat-ngon-ngu-giao-dien.md). Chạy từ GỐC repo, trên D1 tạm (không đụng dữ liệu thật):
//   npm run build:web && ANH=truoc node docs/evidence/2026-10-18-ngon-ngu-giao-dien/kich-ban/anh-thanh-toan.mjs
//   (sau khi sửa: ANH=sau). Chỉ dò nút theo `data-action` (không theo chữ) để cùng một kịch bản chạy được cả hai bản.
// Các trang dùng CHUNG kho cookie: trang Bán hàng mở trước, Kế toán mở sau cùng.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { ACCOUNTS, ok, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const PHA = process.env.ANH ?? "truoc";
const OUT = `docs/evidence/2026-10-18-ngon-ngu-giao-dien/anh/${PHA}`;
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
    customerName: "Khách Thử Chữ", customerPhone: "0903 222 444", customerEmail: "", customerNote: "", discount: 0, paymentNote: "",
    services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 },
      departDate: vnDate(3), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const o = created.json.order;
  // Hai khoản Bán hàng ghi: tiền mặt tự cầm, và chuyển khoản khai vào công ty (chờ Kế toán xác nhận).
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${o.id}/payments`, { soTien: 300000, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${o.id}/payments`, { soTien: 200000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" })).status, 201);
  // Kế toán ghi thêm một khoản tiền mặt rồi huỷ nó (để thấy dòng gốc đã huỷ + dòng ngược trên danh sách).
  assert.equal((await call(ACCOUNTS.accounting, "POST", `/api/orders/${o.id}/payments`, { soTien: 150000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
  const tt = await call(ACCOUNTS.accounting, "GET", `/api/orders/${o.id}/payments`);
  assert.equal(tt.status, 200);
  const nham = tt.json.lanThu.find((l) => l.soTien === 150000);
  assert.ok(nham, JSON.stringify(tt.json.lanThu));
  const huy = await call(ACCOUNTS.accounting, "POST", "/api/ledger/adjustments", { loai: "dao_lan_thu", receiptId: nham.id, lyDo: "Ghi nhầm, khách chưa trả khoản này" });
  assert.ok(huy.status < 300, JSON.stringify(huy.json));

  const choThe = "!!document.querySelector('[data-khoi=\"lan-thu\"]')";
  const cuonToi = "document.querySelector('[data-khoi=\"thanh-toan\"]').scrollIntoView({ block: 'start' }); true";

  // ---- 1) Bán hàng (390): thẻ Thanh toán, nút ghi khoản thu ----
  const p = await env.as(ACCOUNTS.salesA, `/order?id=${o.id}`);
  await p.waitFor(choThe, "danh sách khoản thu (Bán hàng)");
  await p.ev(cuonToi);
  await p.shot(`${OUT}/1-ban-hang-thanh-toan-390.png`);
  await p.ev("document.querySelector('[data-action=\"ghi-lan-thu\"]').click(); true");
  await p.waitFor("!!document.querySelector('[data-khoi=\"form-lan-thu\"]')", "form ghi khoản thu");
  await p.shot(`${OUT}/2-ban-hang-form-ghi-390.png`);
  p.close();
  ok(`[${PHA}] Bán hàng 390: thẻ Thanh toán + form ghi`);

  // ---- 2) Kế toán (390 và 1040, mở SAU CÙNG): nút Xác nhận / Sửa (Thay) / Huỷ (Đảo) trên từng khoản; dòng đã huỷ + dòng ngược ----
  for (const vp of [{ width: 390, height: 844, mobile: true }, { width: 1040, height: 900, mobile: false }]) {
    const q = await env.as(ACCOUNTS.accounting, `/order?id=${o.id}`, vp);
    await q.waitFor("!!document.querySelector('[data-action=\"thay-lan-thu\"]')", "nút sửa khoản thu (Kế toán)");
    await q.ev(cuonToi);
    await q.shot(`${OUT}/3-ke-toan-thanh-toan-${vp.width}.png`);
    if (vp.width === 390) {
      await q.ev("document.querySelector('[data-action=\"thay-lan-thu\"]').click(); true");
      await q.waitFor("[...document.querySelectorAll('input')].some((i) => /10 ký tự/.test(i.placeholder))", "hộp sửa khoản thu mở");
      await q.shot(`${OUT}/4-ke-toan-hop-sua-390.png`);
      await q.ev("location.reload(); true");
      await q.waitFor("!!document.querySelector('[data-action=\"dao-lan-thu\"]')", "nút huỷ khoản thu (Kế toán)");
      await q.ev("document.querySelector('[data-action=\"dao-lan-thu\"]').click(); true");
      await q.waitFor("[...document.querySelectorAll('input')].some((i) => /bắt buộc/.test(i.placeholder))", "hộp huỷ khoản thu mở");
      await q.shot(`${OUT}/5-ke-toan-hop-huy-390.png`);
    }
    assert.deepEqual(q.consoleErrors, [], `lỗi console: ${q.consoleErrors.join(" | ")}`);
    q.close();
  }
  ok(`[${PHA}] Kế toán 390 + 1040: thẻ Thanh toán, hộp sửa, hộp huỷ`);
} finally {
  await env.stop();
}
