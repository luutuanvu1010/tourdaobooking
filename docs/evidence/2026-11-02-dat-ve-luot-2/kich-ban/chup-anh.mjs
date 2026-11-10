// Ảnh chụp THẬT cho «Đặt vé của đối tác» lượt 2 (2026-11-02, Task 5.3 bản rút gọn theo lời chủ): Chrome headless thật, D1 tạm, KHÔNG production. CHỈ khổ 390 (điện thoại, tỷ lệ 2), ba cảnh:
//   1. form-doi-tac-bat-390.png: form Tạo đơn của Đối tác khi công tắc «Ẩn thông tin khách khi đối tác đặt vé» BẬT.
//   2. con-ve-bat-buoc-390.png: bảng Còn vé của Kế toán, lượt đầu chưa giờ có «(bắt buộc)».
//   3. cot-cap-390.png: Quản lý tài khoản, cột «Cấp độ đại lý» của tài khoản đối tác.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-11-02-dat-ve-luot-2/kich-ban/chup-anh.mjs
// Ảnh ghi vào $OUT (mặc định docs/evidence/2026-11-02-dat-ve-luot-2/).
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-11-02-dat-ve-luot-2";
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };

const env = await startEnv();
const pages = [];
try {
  const login = async (account) => {
    for (let i = 0; ; i++) {
      try { return await env.login(account); } catch (e) { if (i >= 2 || e?.cause?.code !== "ECONNRESET") throw e; await sleep(200); }
    }
  };
  const call = async (account, method, path, body) => {
    const c = await login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  const openAs = async (account, path) => {
    const p = await env.openPage(MOB);
    pages.push(p);
    const c = await login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
    return p;
  };
  // Ẩn thanh bám đáy / đỉnh (fixed) rồi chụp toàn trang; sau chụp trả lại.
  const chup = async (p, duongDan) => {
    for (let i = 0; i < 4; i++) {
      await p.ev(`(() => { for (const e of document.querySelectorAll('body *')) { if (e.dataset.anTam !== undefined) continue; if (getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().top > innerHeight * 0.5) { e.dataset.anTam = e.style.display; e.style.display = 'none'; } } return true; })()`);
      await sleep(250);
    }
    await p.shot(duongDan);
  };

  // ---- dữ liệu ----
  const PARTNER = { name: "Đối Tác Chụp Ảnh", phone: "0900000291", pin: "246891", permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" };
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const stmt of (await insertStaffSql(PARTNER)).split("\n")) env.sql(stmt);
  // Cảnh 2: đơn đối tác có Đón, không giờ, gửi đi (chờ xác nhận) — làm TRƯỚC khi bật công tắc để khỏi đụng khối khách.
  const ngay = vnDate(5);
  const don = phai(await call(PARTNER, "POST", "/api/orders", {
    customerName: "Khách Chụp Ảnh", customerPhone: "0903261777", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, departDate: ngay, note: "Khách muốn đón khoảng 7 giờ 30", legs: [{ direction: "OUT", pickupDate: ngay, pickupTime: null, pickupLocationId: null, pickupPlace: "Khách sạn Biển Xanh", dropoffLocationId: null, dropoffPlace: "Bến tàu" }] }],
    passengers: [],
  }), 201, "lập đơn đối tác").order;
  phai(await call(PARTNER, "POST", `/api/orders/${don.id}/gui-don`, {}), 201, "gửi đơn");
  // Cảnh 3: tài khoản đối tác mang vai trò, để cột cấp có dòng.
  phai(await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Đại Lý Chụp Cấp", phone: "0900000383", roles: ["TRAVEL_AGENCY"] }), 201, "tài khoản mang vai trò");
  // Công tắc BẬT (Toàn quyền).
  phai(await call(ACCOUNTS.chu, "POST", "/api/cai-dat/an-thong-tin-khach", { bat: true }), 200, "bật công tắc");

  // ---- 1: form đối tác khi công tắc bật ----
  let p = await openAs(PARTNER, "/order-form");
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length >= 3", "danh mục hiện dịch vụ", 10000);
  await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
  await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "lọc TD101");
  await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
  await sleep(500);
  await chup(p, join(OUT, "form-doi-tac-bat-390.png"));
  p.close();
  console.log("  ✓ cảnh 1 form đối tác công tắc bật");

  // ---- 2: bảng Còn vé của Kế toán ----
  p = await openAs(ACCOUNTS.accounting, `/order?id=${don.id}`);
  await p.waitFor("document.querySelector('main').innerText.includes('bắt buộc')", "bảng Còn vé có «(bắt buộc)»", 15000);
  await sleep(400);
  await chup(p, join(OUT, "con-ve-bat-buoc-390.png"));
  p.close();
  console.log("  ✓ cảnh 2 bảng Còn vé");

  // ---- 3: cột Cấp độ đại lý ----
  p = await openAs(ACCOUNTS.admin, "/staff");
  await p.waitFor("!!document.querySelector('.cot-cap')", "cột cấp đã dựng", 15000);
  await sleep(400);
  await chup(p, join(OUT, "cot-cap-390.png"));
  p.close();
  console.log("  ✓ cảnh 3 cột cấp");
  console.log("CHUP ANH OK");
} finally {
  for (const p of pages) try { p.close(); } catch { /* đã đóng */ }
  await env.stop();
}
