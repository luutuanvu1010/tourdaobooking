// Kịch bản Chrome — ô MÃ GIAO DỊCH NGÂN HÀNG của Kế toán ở trang đơn (ADR-0092 Đ6; đặc tả docs/superpowers/specs/2026-10-08-qr-thanh-toan/README.md §5, §8.8), hai khổ 390 và 1040:
//   D1. "Công ty đã nhận" (xác nhận khoản chuyển khoản): hai ô mã + số thực chuyển; bỏ trống ⇒ câu của máy chủ, banner nằm trong tầm nhìn (dưới thanh đầu trang), KHÔNG nút
//       "Tải lại đơn"; nhập thiếu một ô ⇒ câu của trình duyệt; đủ ⇒ xác nhận, danh sách lần thu hiện «mã GD … (thực chuyển …)».
//   D2. Cùng mã, số thực chuyển lệch ⇒ 409 mang số đã ghi ⇒ ô điền sẵn số đó; form còn nguyên, banner trong tầm nhìn, không "Tải lại đơn".
//   D3. "Thay lần thu": điền sẵn mã + số thực chuyển của lần cũ; hình thức Tiền mặt ⇒ hai ô ẩn, Chuyển khoản ⇒ hiện lại; ghi xong ⇒ lần mới mang cùng mã (D1 có hai dòng nối).
//   D4. "Ghi lần thu" của Kế toán: ẩn / hiện theo hình thức và người nhận; chuyển khoản – Công ty bỏ trống mã ⇒ câu của máy chủ, form còn mở; đủ ⇒ ghi, hiện mã GD.
//   D5. "Ghi bù lần thu" (đơn Đã giao còn thiếu — dữ liệu cũ, dựng bằng SQL trên D1 tạm: gỡ trigger `bil_posting_delivered_paid`, ghi mốc + phiếu Đã giao): hai ô mã hiện khi chuyển khoản – Công ty; thiếu ⇒ chặn; đủ ⇒ ghi bù, đơn hết thiếu.
//   Cuối mỗi khổ: Bán hàng (khai khoản chờ xác nhận) KHÔNG thấy mã giao dịch hay số thực chuyển ở danh sách lần thu.
// Quy tắc ADR-0074/0075 (xem qr-chung.mjs): dữ liệu dựng bằng API TRƯỚC khi mở trang; mỗi trang đóng trước khi mở trang kế của cùng tài khoản.
// Chạy từ GỐC repo, sau `npm run build:web`, cần axe-core lấy NGOÀI repo (`npm pack axe-core`):
//   AXE_JS=<…/package/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-08-qr-thanh-toan/kich-ban/qr-ma-smoke.mjs
// Ảnh ghi vào docs/evidence/2026-10-08-qr-thanh-toan/ với tiền tố smoke- (đặt OUT=<thư mục> để ghi chỗ khác).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, KHO, TRONG_TAM_NHIN, axeSach, chonGiaTri, chup, chupKhung, docAxe, goiApi, ok, setInput, startEnv } from "./qr-chung.mjs";

const AXE = docAxe();
const env = await startEnv();
try {
  const { call, lapDon } = goiApi(env);
  const TEXT = (sel) => `(document.querySelector(${JSON.stringify(sel)})?.textContent ?? '')`;
  const dAn = (F) => `[...document.querySelectorAll('${F} [data-o]')].map((l) => l.hidden)`;
  const khongTaiLai = `!/Tải lại đơn/.test(document.getElementById('error').textContent)`;
  const khaiCk = async (don, soTien) => assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${don.id}/payments`, { soTien, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty" })).status, 201);
  const mo = async (p, action, khoi) => {
    await p.waitFor(`!!document.querySelector('[data-action="${action}"]')`, `nút ${action}`);
    await p.ev(`document.querySelector('[data-action="${action}"]').click(), true`);
    await p.waitFor(`!!document.querySelector('[data-khoi="${khoi}"]')`, `hàng ${khoi}`);
  };

  for (const [kho, vp] of KHO) {
    const ma = (n) => `FT2610${kho}${n}`; // mã riêng cho từng khổ (D1 tạm dùng chung cả hai khổ)
    // ---- Dựng dữ liệu bằng API (chưa có trang nào mở)
    const donA = await lapDon(`Khách Mã GD A ${kho}`, "0903 444 555");
    const donB = await lapDon(`Khách Mã GD B ${kho}`, "0903 444 556");
    const donX = await lapDon(`Khách Thay Mã ${kho}`, "0903 777 111");
    const donY = await lapDon(`Khách Ghi Thu Mã ${kho}`, "0903 777 222");
    const donZ = await lapDon(`Khách Ghi Bù ${kho}`, "0903 777 333");
    await khaiCk(donA, 300000);
    await khaiCk(donB, 200000);
    await khaiCk(donX, 300000);
    const idThu = (await call(ACCOUNTS.accounting, "GET", `/api/orders/${donX.id}/payments`)).json.keToan.choXacNhan[0];
    assert.ok(idThu, "có lần thu chờ xác nhận");
    const xn = await call(ACCOUNTS.accounting, "POST", `/api/ledger/company-receipts/${idThu}/confirm`, { maGiaoDich: ma(2), soThucChuyen: 300000 });
    assert.equal(xn.status, 200, JSON.stringify(xn.json));
    // Đơn đã giao mà còn thiếu = DỮ LIỆU CŨ (từ trước mốc 0083, khi chưa có trigger khoá "Đã giao ⇒ đã thu bằng phải thu"): API không dựng được. Trên D1 TẠM này (xoá sau khi chạy)
    // gỡ trigger `bil_posting_delivered_paid` rồi ghi thẳng mốc Đã giao + phiếu Đã giao (phải thu 1.350.000, mới thu 350.000 tiền mặt) — cùng cách bài thay-lan-thu.test.ts dựng đơn lệch.
    assert.equal((await call(ACCOUNTS.accounting, "POST", `/api/orders/${donZ.id}/payments`, { soTien: 350000, hinhThuc: "CASH", nguoiThu: "cong_ty" })).status, 201);
    const nguoiBam = env.sql("SELECT id FROM staff ORDER BY rowid LIMIT 1")[0].id;
    const bay = new Date().toISOString();
    env.sql([
      "DROP TRIGGER IF EXISTS bil_posting_delivered_paid",
      `UPDATE orders SET delivered_at = '${bay}', delivered_by = '${nguoiBam}' WHERE id = '${donZ.id}'`,
      `INSERT INTO bil_posting (id, kind_code, order_id, occurred_date, due_snapshot, created_at, created_by, updated_at, updated_by) VALUES ('${randomUUID()}', 'DELIVERED', '${donZ.id}', '${bay.slice(0, 10)}', 1350000, '${bay}', '${nguoiBam}', '${bay}', '${nguoiBam}')`,
    ].join(";\n"));

    // ---- D1. Công ty đã nhận: ô mã + số thực chuyển
    {
      const k = await env.as(ACCOUNTS.accounting, `/order?id=${donA.id}`, vp);
      const F = '[data-khoi="xac-nhan-xac-nhan-ck"]';
      await mo(k, "xac-nhan-ck", "xac-nhan-xac-nhan-ck");
      assert.equal(await k.ev(`document.querySelectorAll('${F} [data-o]').length`), 2, "hai ô: mã giao dịch và số thực chuyển");
      // Bỏ trống ⇒ máy chủ chặn bằng câu tiếng Việt (người dùng đang nhìn hàng xác nhận ở giữa màn hình, banner lỗi nằm đầu trang)
      await k.ev(`document.querySelector('${F}').scrollIntoView({ block: "center" }), true`);
      await k.ev(`document.querySelector('${F} button[type="submit"]').click(), true`);
      await k.waitFor(`/mã giao dịch/i.test(document.getElementById('error').textContent)`, "câu báo thiếu mã");
      assert.equal(await k.ev(TRONG_TAM_NHIN), true, "banner lỗi nằm trong tầm nhìn sau khi bấm Xác nhận (không bị thanh đầu trang che)");
      assert.equal(await k.ev(khongTaiLai), true, "lỗi mã giao dịch không có nút «Tải lại đơn»");
      // Nhập thiếu một ô ⇒ chặn ở trình duyệt
      await k.ev(setInput(`document.querySelector('${F} [data-o="ma-giao-dich"] input')`, ma(1)));
      await k.ev(`document.querySelector('${F} button[type="submit"]').click(), true`);
      await k.waitFor(`/Nhập đủ cả mã giao dịch/.test(document.getElementById('error').textContent)`, "câu báo thiếu số thực chuyển");
      await k.ev(`document.querySelector('${F}').scrollIntoView({ block: "center" }), true`);
      await chup(k, `ke-toan-xac-nhan-ma-${kho}`);
      await axeSach(k, AXE, `Kế toán — hàng Xác nhận đã nhận (${kho})`);
      await k.ev(setInput(`document.querySelector('${F} [data-o="so-thuc-chuyen"] input')`, "300000"));
      await k.ev(`document.querySelector('${F} button[type="submit"]').click(), true`);
      await k.waitFor(`!document.querySelector('[data-action="xac-nhan-ck"]')`, "đã xác nhận", 10000);
      await k.waitFor(`new RegExp('mã GD ${ma(1)} \\\\(thực chuyển 300\\\\.000').test(${TEXT('[data-khoi="lan-thu"]')})`, "dòng lần thu hiện mã GD");
      assert.deepEqual(k.consoleErrors.filter((m) => !/400|409|Failed to load resource/.test(m)), [], `lỗi console: ${k.consoleErrors}`);
      k.close();
      ok(`D1) ${kho}: Kế toán xác nhận CK có mã + số thực chuyển; bỏ trống ⇒ câu máy chủ, banner trong tầm nhìn, không «Tải lại đơn»; danh sách lần thu hiện «mã GD … (thực chuyển …)»; axe sạch`);
    }

    // ---- D2. Cùng mã, số thực chuyển lệch ⇒ 409 mang số đã ghi
    {
      const k = await env.as(ACCOUNTS.accounting, `/order?id=${donB.id}`, vp);
      const F = '[data-khoi="xac-nhan-xac-nhan-ck"]';
      await mo(k, "xac-nhan-ck", "xac-nhan-xac-nhan-ck");
      await k.ev(setInput(`document.querySelector('${F} [data-o="ma-giao-dich"] input')`, ma(1)));
      await k.ev(setInput(`document.querySelector('${F} [data-o="so-thuc-chuyen"] input')`, "250000"));
      await k.ev(`document.querySelector('${F}').scrollIntoView({ block: "center" }), true`);
      await k.ev(`document.querySelector('${F} button[type="submit"]').click(), true`);
      await k.waitFor(`document.querySelector('${F} [data-o="so-thuc-chuyen"] input').value === '300.000'`, "ô số thực chuyển được điền sẵn số đã ghi (409)");
      assert.equal(await k.ev(TRONG_TAM_NHIN), true, "banner 409 nằm trong tầm nhìn");
      assert.equal(await k.ev(khongTaiLai), true, "409 mã giao dịch KHÔNG có nút «Tải lại đơn» (tải lại sẽ xoá số điền sẵn)");
      assert.equal(await k.ev(`document.querySelector('${F} [data-o="so-thuc-chuyen"] input').value`), "300.000", "form còn nguyên, số điền sẵn còn đó");
      assert.equal(await k.ev(`document.querySelector('${F} [data-o="ma-giao-dich"] input').value`), ma(1), "mã đã gõ còn nguyên");
      await chup(k, `ke-toan-lech-so-dien-san-${kho}`);
      await k.ev(`document.querySelector('${F}').scrollIntoView({ block: "center" }), true`);
      await chup(k, `ke-toan-lech-so-dien-san-form-${kho}`);
      k.close();
      ok(`D2) ${kho}: lệch số thực chuyển ⇒ 409 mang số đã ghi ⇒ ô điền sẵn 300.000; banner trong tầm nhìn, không «Tải lại đơn»`);
    }

    // ---- D3. Thay lần thu: điền sẵn, ẩn / hiện theo hình thức, ghi xong lần mới mang cùng mã
    {
      const k = await env.as(ACCOUNTS.accounting, `/order?id=${donX.id}`, vp);
      const F = '[data-khoi="xac-nhan-thay-lan-thu"]';
      await mo(k, "thay-lan-thu", "xac-nhan-thay-lan-thu");
      const d0 = await k.ev(`({ ma: document.querySelector('${F} [data-o="ma-giao-dich"] input').value, so: document.querySelector('${F} [data-o="so-thuc-chuyen"] input').value, an: ${dAn(F)}, hinhThuc: document.querySelectorAll('${F} select')[0].value, nguoi: document.querySelectorAll('${F} select')[1].value })`);
      assert.deepEqual(d0, { ma: ma(2), so: "300.000", an: [false, false], hinhThuc: "BANK_TRANSFER", nguoi: "cong_ty" }, "điền sẵn mã + số thực chuyển của lần thu cũ, hai ô hiện");
      await k.ev(chonGiaTri(`document.querySelectorAll('${F} select')[0]`, "CASH"));
      assert.deepEqual(await k.ev(dAn(F)), [true, true], "tiền mặt: hai ô mã ẩn");
      await k.ev(chonGiaTri(`document.querySelectorAll('${F} select')[0]`, "BANK_TRANSFER"));
      assert.deepEqual(await k.ev(dAn(F)), [false, false], "chuyển khoản + Công ty: hai ô mã hiện lại");
      await k.ev(`document.querySelector('${F}').scrollIntoView({ block: 'center' }), true`);
      await chup(k, `thay-lan-thu-ma-${kho}`);
      await k.ev(setInput(`document.querySelector('${F} input[placeholder^="Vì sao"]')`, "Sửa sai số tiền theo sao kê"));
      await k.ev(`document.querySelector('${F} button[type="submit"]').click(), true`);
      await k.waitFor(`!document.querySelector('${F}')`, "hàng Thay đóng sau khi ghi", 15000);
      await k.waitFor(`new RegExp('mã GD ${ma(2)}').test(${TEXT('[data-khoi="lan-thu"]')})`, "lần thu mới hiện mã GD");
      k.close();
      assert.equal(env.sql(`SELECT count(*) AS n FROM bil_receipt_bank_txn WHERE txn_code = '${ma(2)}'`)[0].n, 2, "mã nối vào cả lần thu cũ lẫn lần thu mới (cũ đã đảo)");
      ok(`D3) ${kho}: Thay lần thu điền sẵn mã + số thực chuyển; ẩn khi tiền mặt, hiện lại khi chuyển khoản; ghi xong lần mới mang cùng mã`);
    }

    // ---- D4. Kế toán «Ghi lần thu»
    {
      const k = await env.as(ACCOUNTS.accounting, `/order?id=${donY.id}`, vp);
      const F = '[data-khoi="form-lan-thu"]';
      await mo(k, "ghi-lan-thu", "form-lan-thu");
      assert.deepEqual(await k.ev(dAn(F)), [false, false], "mặc định Chuyển khoản + Công ty: hiện hai ô mã");
      const sel = (i, v) => chonGiaTri(`document.querySelectorAll('${F} select')[${i}]`, v);
      await k.ev(sel(1, "toi"));
      assert.deepEqual(await k.ev(dAn(F)), [true, true], "«Tôi thu»: ẩn");
      await k.ev(sel(1, "cong_ty"));
      assert.deepEqual(await k.ev(dAn(F)), [false, false], "«Công ty»: hiện lại");
      await k.ev(sel(0, "CASH"));
      assert.deepEqual(await k.ev(dAn(F)), [true, true], "Tiền mặt: ẩn");
      await k.ev(sel(0, "BANK_TRANSFER"));
      await k.ev(setInput(`document.querySelector('${F} input')`, "400000"));
      await k.ev(`document.querySelector('${F}').scrollIntoView({ block: 'center' }), true`);
      await k.ev(`document.querySelector('${F} button[type="submit"]').click(), true`);
      await k.waitFor(`/mã giao dịch/i.test(document.getElementById('error').textContent)`, "câu báo thiếu mã");
      assert.equal(await k.ev(TRONG_TAM_NHIN), true, "banner lỗi mã trong tầm nhìn (thẻ Ghi lần thu nằm dưới)");
      assert.equal(await k.ev(khongTaiLai), true, "không nút «Tải lại đơn»");
      assert.equal(await k.ev(`!!document.querySelector('${F}')`), true, "form còn mở");
      await k.waitFor(`!document.querySelector('${F} button[type="submit"]').disabled`, "nút Ghi bật lại");
      await k.ev(setInput(`document.querySelector('${F} [data-o="ma-giao-dich"] input')`, ma(3)));
      await k.ev(setInput(`document.querySelector('${F} [data-o="so-thuc-chuyen"] input')`, "400000"));
      await k.ev(`document.querySelector('${F} button[type="submit"]').click(), true`);
      await k.waitFor(`new RegExp('mã GD ${ma(3)} \\\\(thực chuyển 400\\\\.000').test(${TEXT('[data-khoi="lan-thu"]')})`, "lần thu mới hiện mã GD", 15000);
      k.close();
      ok(`D4) ${kho}: Kế toán Ghi lần thu — hai ô mã ẩn / hiện đúng theo hình thức + người nhận; bỏ trống ⇒ câu máy chủ, form còn mở; đủ ⇒ ghi, hiện mã GD`);
    }

    // ---- D5. Ghi bù lần thu (đơn Đã giao còn thiếu 1.000.000)
    {
      const k = await env.as(ACCOUNTS.accounting, `/order?id=${donZ.id}`, vp);
      const F = '[data-khoi="xac-nhan-ghi-bu-lan-thu"]';
      await mo(k, "ghi-bu-lan-thu", "xac-nhan-ghi-bu-lan-thu");
      assert.match(await k.ev(`document.querySelector('${F} p').textContent`), /còn thiếu 1\.000\.000/, "đúng số thiếu");
      assert.deepEqual(await k.ev(dAn(F)), [true, true], "mặc định Tiền mặt: hai ô mã ẩn");
      await k.ev(chonGiaTri(`document.querySelectorAll('${F} select')[0]`, "BANK_TRANSFER"));
      assert.deepEqual(await k.ev(dAn(F)), [false, false], "Chuyển khoản + Công ty: hiện hai ô mã");
      await k.ev(setInput(`document.querySelector('${F} input[placeholder^="Vì sao"]')`, "Dữ liệu cũ thiếu khoản chuyển khoản"));
      await k.ev(`document.querySelector('${F}').scrollIntoView({ block: 'center' }), true`);
      await k.ev(`document.querySelector('${F} button[type="submit"]').click(), true`);
      await k.waitFor(`/Nhập đủ cả mã giao dịch|mã giao dịch/i.test(document.getElementById('error').textContent)`, "thiếu mã ⇒ bị chặn");
      assert.equal(await k.ev(TRONG_TAM_NHIN), true, "banner lỗi trong tầm nhìn");
      assert.equal(await k.ev(khongTaiLai), true);
      await k.ev(setInput(`document.querySelector('${F} [data-o="ma-giao-dich"] input')`, ma(4)));
      await k.ev(setInput(`document.querySelector('${F} [data-o="so-thuc-chuyen"] input')`, "1000000"));
      await k.ev(`document.querySelector('${F} button[type="submit"]').click(), true`);
      await k.waitFor(`!document.querySelector('[data-action="ghi-bu-lan-thu"]')`, "ghi bù xong, hết hàng Ghi bù", 15000);
      await k.waitFor(`new RegExp('mã GD ${ma(4)} \\\\(thực chuyển 1\\\\.000\\\\.000').test(${TEXT('[data-khoi="lan-thu"]')})`, "lần thu bù hiện mã GD");
      k.close();
      ok(`D5) ${kho}: Ghi bù lần thu (đơn Đã giao còn thiếu): ô mã hiện khi chuyển khoản – Công ty; thiếu ⇒ chặn; đủ ⇒ ghi bù, hết thiếu, hiện mã GD`);
    }

    // ---- Bán hàng không thấy mã giao dịch / số thực chuyển (chỉ người có quyền ghi sổ thấy)
    {
      const s = await env.as(ACCOUNTS.salesA, `/order?id=${donA.id}`, vp);
      await s.waitFor(`${TEXT('[data-khoi="lan-thu"]')}.length > 0`, "danh sách lần thu");
      const chu = await s.ev(TEXT('[data-khoi="lan-thu"]'));
      assert.doesNotMatch(chu, /mã GD|thực chuyển/, `Bán hàng thấy: ${chu.slice(0, 200)}`);
      assert.equal(await s.ev("document.body.textContent.includes(" + JSON.stringify(ma(1)) + ")"), false, "mã giao dịch không xuất hiện ở bất cứ đâu trên trang của Bán hàng");
      s.close();
      ok(`D6) ${kho}: Bán hàng không thấy mã giao dịch / số thực chuyển`);
    }
  }
} finally {
  await env.stop();
}
console.log("QR-MA-SMOKE XONG");
