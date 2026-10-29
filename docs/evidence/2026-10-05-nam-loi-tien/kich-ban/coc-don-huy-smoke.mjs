// GHI CHÚ 28/10/2026 (đóng TNV-G1): sửa ba chỗ đỏ có sẵn — ghi thu SAU khi xác nhận (ADR-0135 Đ7: nháp không ghi thu được), nhãn nay là «Thu trước giữ lại – khách huỷ»
// (đổi chữ «cọc»), dòng đã chi nay là «Đã hoàn trả» (chủ 28/10, SV-DH-04); `OUT=…` đổi thư mục ảnh để không ghi đè ảnh có ngày 5/10. Phần Trang chủ Kế toán và dòng
// «Đã trả lại khách trước khi huỷ»: docs/evidence/2026-10-28-dong-tnv-g1/kich-ban/thu-truoc-smoke.mjs.
// Đơn huỷ và cọc (ADR-0089; năm lỗi tiền Đợt 1 Phần C) — kiểm trang đơn bằng Chrome thật. Chạy từ GỐC repo:
//   npm run build:web && CHROME_BIN=<đường dẫn tuyệt đối tới docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-10-05-nam-loi-tien/kich-ban/coc-don-huy-smoke.mjs
// Phạm vi: hộp "Huỷ đơn" bắt chọn lý do (nhóm "Công ty huỷ" chỉ Quản trị thấy); trang đơn huỷ KHÔNG còn "Còn lại", có nhãn "Cọc giữ lại – khách huỷ";
// Quản trị bấm "Duyệt hoàn cọc" bằng giao diện; Kế toán thấy "Ghi chi hoàn" và ghi được; Bán hàng không thấy nút tiền. Ảnh ở ../anh/ để chủ duyệt hàng nút
// (GĐ kế hoạch §3.5 — không vẽ màn mới). Các trang dùng CHUNG kho cookie: mỗi bước mở trang của tài khoản đó NGAY TRƯỚC khi dùng.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { ACCOUNTS, ok, setInput, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-05-nam-loi-tien/anh";
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
    customerName: "Khách Huỷ Cọc", customerPhone: "0903 444 555", customerEmail: "", customerNote: "", discount: 0, paymentNote: "",
    services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 },
      departDate: vnDate(10), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const o = created.json.order;
  assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" })).status, 200);
  assert.equal((await call(ACCOUNTS.accounting, "POST", `/api/orders/${o.id}/payments`, { soTien: 500000, hinhThuc: "BANK_TRANSFER", nguoiThu: "cong_ty", maGiaoDich: "FTCOC0001", soThucChuyen: 500000 })).status, 201); // Kế toán ghi CK – Công ty thu ⇒ đòi mã giao dịch (ADR-0092 Đ6)

  // ---- 1) Bán hàng: hộp Huỷ đơn bắt chọn lý do, KHÔNG có nhóm Công ty huỷ; huỷ "Khách đổi ý" ----
  let p = await env.as(ACCOUNTS.salesA, `/order?id=${o.id}`);
  await p.waitFor("!!document.querySelector('[data-action=\"cancel-order\"]')", "nút Huỷ đơn");
  await p.ev("document.querySelector('[data-action=\"cancel-order\"]').click(), true");
  await p.waitFor("!!document.querySelector('[data-khoi=\"huy-don\"]')", "hàng chọn lý do");
  const luaChon = await p.ev("[...document.querySelectorAll('[data-khoi=\"huy-don\"] input[name=\"huy-ly-do\"]')].map((i) => i.value)");
  assert.ok(luaChon.includes("KHACH_DOI_Y") && luaChon.includes("OTHER") && !luaChon.includes("THOI_TIET"), `Bán hàng không thấy nhóm Công ty huỷ: ${luaChon}`);
  assert.equal(await p.ev("document.querySelector('[data-khoi=\"huy-don\"] button[type=submit]').disabled"), true, "chưa chọn lý do → nút Huỷ đơn tắt");
  await p.ev("document.querySelector('[data-khoi=\"huy-don\"] input[value=\"OTHER\"]').click(), true");
  assert.equal(await p.ev("document.querySelector('[data-khoi=\"huy-don\"] input[type=text]').hidden"), false, "chọn Khác → hiện ô ghi rõ");
  assert.equal(await p.ev("document.querySelector('[data-khoi=\"huy-don\"] button[type=submit]').disabled"), true, "Khác chưa ghi rõ → nút tắt");
  await p.shot(`${OUT}/huy-don-chon-ly-do-390.png`);
  await p.ev("document.querySelector('[data-khoi=\"huy-don\"] input[value=\"KHACH_DOI_Y\"]').click(), true");
  await p.ev("document.querySelector('[data-khoi=\"huy-don\"] button[type=submit]').click(), true");
  await p.waitFor("document.querySelector('#order .badge')?.textContent === 'Đã huỷ'", "đơn đã huỷ");
  await p.waitFor("!!document.querySelector('[data-khoi=\"coc-don-huy\"]')", "khối tiền đơn huỷ");
  const text = await p.ev("document.querySelector('[data-khoi=\"thanh-toan\"]').textContent");
  assert.ok(!/Còn lại/.test(text), "trang đơn huỷ không còn 'Còn lại'");
  assert.ok(/Thu trước giữ lại – khách huỷ/.test(text) && /còn có thể hoàn tới/.test(text), text);
  assert.equal(await p.ev("!!document.querySelector('[data-action=\"coc-duyet\"]')"), false, "Bán hàng không thấy Duyệt hoàn cọc");
  await p.shot(`${OUT}/don-huy-ban-hang-390.png`);
  p.close();
  ok("Bán hàng 390: huỷ bắt chọn lý do (không nhóm Công ty huỷ; Khác bắt ghi rõ); đơn huỷ không còn 'Còn lại', nhãn 'Thu trước giữ lại – khách huỷ' + hạn; không nút tiền");

  // ---- 2) Quản trị: Duyệt hoàn cọc bằng giao diện ----
  p = await env.as(ACCOUNTS.admin, `/order?id=${o.id}`);
  await p.waitFor("!!document.querySelector('[data-action=\"coc-duyet\"]')", "nút Duyệt hoàn cọc");
  await p.ev("document.querySelector('[data-action=\"coc-duyet\"]').click(), true");
  await p.waitFor("!!document.querySelector('[data-khoi=\"xac-nhan-coc-duyet\"]')", "hàng duyệt");
  const inputs = "document.querySelectorAll('[data-khoi=\"xac-nhan-coc-duyet\"] input')";
  await p.ev(setInput(`${inputs}[0]`, "200000"));
  await p.ev(setInput(`${inputs}[2]`, "Khách xin lại một phần"));
  await p.ev("document.querySelector('[data-khoi=\"xac-nhan-coc-duyet\"] button[type=submit]').click(), true");
  await p.waitFor("!!document.querySelector('[data-khoi=\"khoan-duyet\"]')", "khoản duyệt hiện");
  assert.equal(await p.ev("!!document.querySelector('[data-action=\"coc-chi\"]')"), false, "Quản trị không chi (người duyệt không tự chi; ô payment.refund)");
  await p.shot(`${OUT}/don-huy-quan-tri-390.png`);
  p.close();
  ok("Quản trị 390: Duyệt hoàn cọc 200.000 bằng giao diện; khoản duyệt hiện; không có nút Ghi chi hoàn");

  // ---- 3) Kế toán (1040): thấy người giữ tiền + Ghi chi hoàn; ghi được ----
  p = await env.as(ACCOUNTS.accounting, `/order?id=${o.id}`, { width: 1040, height: 900, mobile: false });
  await p.waitFor("!!document.querySelector('[data-action=\"coc-chi\"]')", "nút Ghi chi hoàn");
  await p.ev("document.querySelector('[data-action=\"coc-chi\"]').click(), true");
  await p.waitFor("!!document.querySelector('[data-khoi=\"xac-nhan-coc-chi\"]')", "hàng chi");
  await p.ev("document.querySelector('[data-khoi=\"xac-nhan-coc-chi\"] button[type=submit]').click(), true");
  await p.waitFor("/Đã hoàn trả/.test(document.querySelector('[data-khoi=\"coc-don-huy\"]').textContent) && !document.querySelector('[data-action=\"coc-chi\"]')", "đã chi");
  const ct = await p.ev("document.querySelector('[data-khoi=\"coc-don-huy\"]').textContent");
  assert.ok(/Công ty còn giữ300\.000/.test(ct.replace(/\s+/g, "")) || /300\.000/.test(ct), ct);
  assert.equal(await p.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth"), 0, "không tràn ngang 1040");
  await p.shot(`${OUT}/don-huy-ke-toan-1040.png`);
  p.close();
  ok("Kế toán 1040: Ghi chi hoàn theo khoản duyệt → 'Đã hoàn trả', công ty còn giữ 300.000; không tràn");
} finally {
  await env.stop();
}
