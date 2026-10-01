// ADR-0060 — dấu "đã nhập phần mềm kế toán" trên Chrome thật (390 + 1040). Chạy từ GỐC repo (không cần mạng ngoài, không cần AXE_JS):
//   npm run build:web && CHROME_BIN=<đường dẫn tuyệt đối tới docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-30-adr-0060/kich-ban/nhap-ke-toan-smoke.mjs
// Bước: 1) Kế toán mở đơn đã xác nhận → khối "Phần mềm kế toán" "Chưa nhập…" → Đánh dấu kèm HD-000123 → dòng trạng thái + lịch sử; 2) Bán hàng: thấy dấu,
// không nút; 3) danh sách: nhãn trên thẻ, ô lọc "Nhập phần mềm kế toán" (Kế toán); lọc thiếu ngày → câu lỗi tiếng Việt; 4) Đối tác một mình: trang đơn của
// mình KHÔNG có khối, KHÔNG gửi yêu cầu /nhap-ke-toan; thẻ không nhãn; bảng lọc không có ô; 5) đo tràn ngang, lỗi console.
import assert from "node:assert/strict";
import { ACCOUNTS, ok, setInput, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

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
  const NGAY = vnDate(20);
  const donMoi = async (account) => {
    const r = await call(account, "POST", "/api/orders", {
      customerName: "Khách Kế Toán", customerPhone: "0903 111 222",
      services: [{ kind: "catalog", catalogCode: "TTB06", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800000 }, departDate: NGAY }],
    });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.equal((await call(account, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" })).status, 200);
    return r.json.order.id;
  };
  const don = await donMoi(ACCOUNTS.salesA);
  const tran = "document.documentElement.scrollWidth - innerWidth";
  const khoi = "document.querySelector('[data-khoi=nhap-ke-toan]')";
  const trangThai = "document.querySelector('[data-khoi=nhap-kt-trang-thai]')?.textContent";

  // ---- 1) Kế toán đánh dấu trên trang đơn
  for (const [w, h] of [[390, 844], [1040, 800]]) {
    const p = await env.as(ACCOUNTS.accounting, `/order?id=${don}`, { width: w, height: h, mobile: w < 900 });
    await p.waitFor(`!!${khoi}`, "khối Phần mềm kế toán");
    if (w === 390) {
      assert.equal(await p.ev(trangThai), "Chưa nhập phần mềm kế toán");
      assert.equal(await p.ev("(() => { const b = document.querySelector('[data-action=nhap-kt-danh-dau]'); b.click(); return true; })()"), true);
      await p.waitFor("!!document.querySelector('[data-khoi=xac-nhan-nhap-kt-danh-dau] input')", "ô số hoá đơn");
      assert.equal(await p.ev("getComputedStyle(document.querySelector('[data-khoi=xac-nhan-nhap-kt-danh-dau] input')).fontSize"), "16px", "ô gõ 16px");
      await p.ev(setInput("document.querySelector('[data-khoi=xac-nhan-nhap-kt-danh-dau] input')", "HD-000123"));
      await p.ev("document.querySelector('[data-khoi=xac-nhan-nhap-kt-danh-dau] button[type=submit]').click()");
      await p.waitFor(`${trangThai} === 'Đã nhập phần mềm kế toán · HD-000123'`, "dấu đã nhập hiện trên trang");
      await p.waitFor("[...document.querySelectorAll('.history li')].some((li) => li.textContent.includes('Đánh dấu đã nhập phần mềm kế toán') && li.textContent.includes('HD-000123'))", "dòng lịch sử");
      assert.ok(await p.ev("!!document.querySelector('[data-action=nhap-kt-bo-dau]') && !!document.querySelector('[data-action=nhap-kt-sua-so]')"), "nút Bỏ dấu + Sửa số");
      ok("Kế toán (390): khối 'Chưa nhập…' → Đánh dấu kèm HD-000123 → 'Đã nhập phần mềm kế toán · HD-000123' + dòng lịch sử; ô gõ 16px; có Bỏ dấu / Sửa số");
    } else {
      assert.equal(await p.ev(trangThai), "Đã nhập phần mềm kế toán · HD-000123");
      ok("Kế toán (1040): dấu hiện ở cột bên");
    }
    assert.ok((await p.ev(tran)) <= 0, `tràn ngang ở ${w}px`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console ${w}px`);
    p.close();
  }

  // ---- 2) Bán hàng: thấy dấu, không nút
  {
    const p = await env.as(ACCOUNTS.salesA, `/order?id=${don}`);
    await p.waitFor(`!!${khoi}`, "khối ở trang Bán hàng");
    assert.equal(await p.ev(trangThai), "Đã nhập phần mềm kế toán · HD-000123");
    assert.equal(await p.ev("document.querySelectorAll('[data-action^=nhap-kt-]').length"), 0, "Bán hàng không có nút");
    p.close();
    ok("Bán hàng: thấy 'Đã nhập phần mềm kế toán · HD-000123', không nút ghi");
  }

  // ---- 3) Danh sách: nhãn trên thẻ; bộ lọc của Kế toán có ô; lọc thiếu ngày → câu lỗi
  {
    const p = await env.as(ACCOUNTS.accounting, "/orders");
    await p.waitFor("!!document.querySelector('[data-nhap-ke-toan]')", "nhãn trên thẻ");
    assert.equal(await p.ev("document.querySelector('[data-nhap-ke-toan]').textContent.trim()"), "Đã nhập phần mềm kế toán");
    assert.ok((await p.ev(tran)) <= 0, "tràn ngang danh sách 390");
    await p.ev("document.getElementById('loc-mo').click()");
    await p.waitFor("!!document.getElementById('loc-nhap-kt')", "ô lọc Nhập phần mềm kế toán");
    await p.ev("(() => { const s = document.getElementById('loc-nhap-kt'); s.value = 'chua'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
    await p.ev("document.querySelector('[data-action=ap-dung-loc]').click()");
    await p.waitFor("[...document.querySelectorAll('.vc-field-error')].some((e) => !e.hidden && e.textContent.includes('Từ ngày và Đến ngày'))", "câu lỗi thiếu khoảng ngày");
    await p.ev(setInput("document.getElementById('loc-tu')", NGAY));
    await p.ev(setInput("document.getElementById('loc-den')", NGAY));
    await p.ev("document.querySelector('[data-action=ap-dung-loc]').click()");
    await p.waitFor("[...document.querySelectorAll('.loc-chip-muc')].some((c) => c.textContent.includes('Chưa nhập PM kế toán'))", "chip Chưa nhập");
    await p.waitFor("!document.querySelector('[data-nhap-ke-toan]')", "lọc 'chưa nhập' bỏ đơn đã đánh dấu");
    assert.deepEqual(p.consoleErrors, [], "lỗi console danh sách");
    p.close();
    ok("Danh sách (Kế toán): nhãn 'Đã nhập phần mềm kế toán' trên thẻ; ô lọc có; thiếu ngày → câu lỗi tiếng Việt; lọc 'Chưa nhập' + ngày → chip, đơn đã đánh dấu biến mất");
  }

  // ---- 4) Đối tác một mình (tài khoản dùng một lần)
  {
    const phone = `09${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
    const t = await call(ACCOUNTS.admin, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Đối Tác Kế Toán", phone, permissions: ["PARTNER"] });
    assert.equal(t.status, 201, JSON.stringify(t.json));
    const DT = { phone, pin: t.json.pin };
    const donDT = await donMoi(DT);
    assert.equal((await call(ACCOUNTS.accounting, "POST", `/api/orders/${donDT}/nhap-ke-toan`, { daNhap: true, soHoaDon: "HD-DT-1", truocDo: null })).status, 200);
    const p = await env.as(DT, `/order?id=${donDT}`);
    await p.waitFor("!!document.querySelector('.order-summary-band')", "trang đơn của Đối tác");
    assert.equal(await p.ev(`!!${khoi}`), false, "Đối tác không có khối");
    assert.equal(p.requests.filter((r) => r.url.includes("/nhap-ke-toan")).length, 0, "Đối tác không gửi yêu cầu /nhap-ke-toan");
    assert.equal(await p.ev("document.body.textContent.includes('HD-DT-1') || document.body.textContent.includes('phần mềm kế toán')"), false);
    p.close();
    const l = await env.as(DT, "/orders");
    await l.waitFor("document.querySelectorAll('.order-row').length > 0", "danh sách Đối tác");
    assert.equal(await l.ev("!!document.querySelector('[data-nhap-ke-toan]')"), false, "thẻ không nhãn");
    await l.ev("document.getElementById('loc-mo').click()");
    await l.waitFor("!!document.querySelector('[data-action=ap-dung-loc]')", "bảng lọc");
    assert.equal(await l.ev("!!document.getElementById('loc-nhap-kt')"), false, "không có ô lọc dấu kế toán");
    l.close();
    ok("Đối tác một mình: trang đơn KHÔNG có khối và KHÔNG gửi /nhap-ke-toan; thẻ không nhãn; bảng lọc không có ô");
  }
  console.log("NHAP KE TOAN SMOKE OK");
} finally {
  await env.stop();
}
