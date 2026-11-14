// Kịch bản 2 (trục d): (a) Sales bấm Huỷ sau khi HDV đã huỷ → thông điệp lộ mã thô; (b) kế toán tìm dấu "cần chú ý hoàn cọc";
// (c) đổi PIN ở máy khác giữa lúc đang gõ đơn → mất đơn. D1 TẠM của startEnv(). Chạy từ WT.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, setInput, sleep, startEnv, vnDate } from "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { HOP_HOI_TU_DONG } from "../../../2026-11-13-buoc-1-khung-chung/kich-ban/hop-hoi-tu-dong.mjs"; // bước 1 khung chung 13/11: trả lời hộp hỏi trong trang (thay confirm() của trình duyệt)
const OUT = "/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdao-sales-audit-62ea81/docs/evidence/diem-khuat-2026-09-24/d-t4-t8";
const SP = "/private/tmp/claude-501/-Users-tuanbao-Documents-Projects-ctytnhhtourdao-tourdao-sales--claude-worktrees-tourdao-sales-audit-62ea81/c964efb5-7bf2-4e78-8214-a3e41d4568f4/scratchpad/d-t4-t8";
const MOB = { width: 375, height: 812, mobile: true };
const R = {};
const save = () => writeFileSync(join(SP, "k2-ketqua.json"), JSON.stringify(R, null, 2));
const env = await startEnv();
const call = async (acc, method, path, body, cookie) => {
  const c = cookie ?? (await env.login(acc));
  const r = await fetch(env.base + path, { method, headers: { cookie: `${c.name}=${c.value}`, "content-type": "application/json", origin: env.base, "cf-connecting-ip": `10.8.${Math.floor(Math.random() * 250)}.4` }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null) };
};
try {
  const hdv = await call(ACCOUNTS.admin, "POST", "/api/staff", { fullName: "Hướng Dẫn Hai", phone: "0900000311", roles: ["GUIDE_INTERNAL"] });
  const HDV = { phone: "0900000311", pin: hdv.body.pin, id: hdv.body.staff.id };
  const svc = { kind: "catalog", catalogCode: "TD101", pax: { adult: 6 }, unitPrices: {}, catalogPriceSeen: { adult: 1350000 }, departDate: vnDate(1), departTime: "", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const c = await call(ACCOUNTS.salesA, "POST", "/api/orders", { customerName: "Đoàn cọc 3 triệu", customerPhone: "0911 555 666", services: [svc], depositAmount: 3000000, depositMethod: "bank_transfer" });
  const oid = c.body.order.id;
  R.setup = { create: c.status, confirm: (await call(ACCOUNTS.salesA, "POST", `/api/orders/${oid}/status`, { status: "confirmed" })).status, assign: (await call(ACCOUNTS.salesA, "PUT", `/api/orders/${oid}/handler`, { staffId: HDV.id })).status };

  // (a) Sales đang mở trang đơn; HDV huỷ ở ngoài bến; Sales bấm "Huỷ đơn"
  {
    const p = await env.as(ACCOUNTS.salesA, `/order?id=${oid}`, MOB);
    await p.waitFor("/Đã xác nhận/.test(document.body.textContent)", "trang đơn", 20000);
    R.a_hdvCancel = (await call(HDV, "POST", `/api/orders/${oid}/handler-cancel`, { reason: "customer_requested" })).status;
    await p.ev(HOP_HOI_TU_DONG); // bước 1 khung chung 13/11: hộp hỏi trong trang thay confirm()
    await p.ev("window.confirm = () => true; true");
    await p.ev("[...document.querySelectorAll('#actions button')].find((b) => b.textContent.trim() === 'Huỷ đơn').click(); true");
    await sleep(2500);
    R.a_banner = await p.ev("[...document.querySelectorAll('.banner:not([hidden]), [role=alert]:not([hidden])')].map((e) => e.innerText.trim()).filter(Boolean)");
    await p.shot(join(OUT, "k2a-sales-huy-sau-hdv-thong-diep-ma-tho.png"));
    p.close();
  }
  // (b) Kế toán: tìm đơn bị HDV huỷ có cọc — có dấu "cần chú ý hoàn cọc" không?
  {
    const dash = await call(ACCOUNTS.accounting, "GET", "/api/orders/dashboard");
    R.b_dashboardKeys = Object.keys(dash.body ?? {});
    const list = await call(ACCOUNTS.accounting, "GET", "/api/orders?status=cancelled&limit=30&offset=0");
    R.b_cancelledList = list.body?.orders?.map((o) => ({ code: o.orderCode, deposit: o.depositAmount, keys: Object.keys(o).filter((k) => /refund|attention|flag|cancel|reason/i.test(k)) }));
    const p = await env.as(ACCOUNTS.accounting, "/orders", MOB);
    await p.waitFor("document.querySelectorAll('#list > *').length > 0", "danh sách", 20000);
    await p.ev("document.getElementById('status').value = 'cancelled'; document.getElementById('status').dispatchEvent(new Event('change')); true");
    await sleep(2000);
    R.b_listText = (await p.ev("document.getElementById('list').innerText")).slice(0, 600);
    await p.shot(join(OUT, "k2b-ke-toan-danh-sach-don-huy.png"));
    await p.ev(`location.href = '/order?id=${oid}'; true`);
    await p.waitFor("document.readyState === 'complete' && /Lịch sử/.test(document.body.innerText)", "trang đơn", 20000);
    await sleep(1500);
    R.b_orderText = (await p.ev("document.getElementById('order')?.innerText ?? document.body.innerText")).slice(0, 1500);
    await p.shot(join(OUT, "k2b-ke-toan-trang-don-bi-hdv-huy.png"));
    p.close();
  }
  // (c) Đang gõ đơn ở điện thoại; cùng người đó đổi PIN ở máy tính → phiên điện thoại bị thu hồi → Lưu → mất đơn
  {
    const p = await env.as(ACCOUNTS.salesB, "/order-form", MOB);
    await p.waitFor("document.getElementById('catalog-q') && !document.getElementById('order-form').inert", "form", 20000);
    await p.ev(setInput("document.getElementById('customerName')", "Khách đổi PIN máy khác"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0977 111 222"));
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
    await p.waitFor("document.querySelectorAll('#catalog-list button').length === 1", "TD101");
    await p.ev("document.querySelector('#catalog-list button').click(); true");
    await p.waitFor("document.querySelectorAll('#services .svc').length === 1", "thẻ");
    await p.ev(setInput(`document.querySelector('#services .svc .counter-field[aria-label="Người lớn"]')`, "8"));
    await sleep(1100); // phiên mới phải phát hành ở mili-giây khác
    const other = await env.login(ACCOUNTS.salesB);
    const ch = await call(ACCOUNTS.salesB, "POST", "/api/account/change-pin", { currentPin: ACCOUNTS.salesB.pin, newPin: "135792" }, other);
    R.c_changePin = ch.status;
    await p.ev("document.getElementById('save').click(); true");
    await sleep(3000);
    R.c_after = await p.ev("({ path: location.pathname + location.search, name: document.getElementById('customerName')?.value ?? null, banner: [...document.querySelectorAll('[role=alert]:not([hidden])')].map((e) => e.innerText.trim()).filter(Boolean) })");
    await p.shot(join(OUT, "k2c-doi-pin-may-khac-roi-luu.png"));
    p.close();
  }
} catch (e) { R.error = String(e.stack || e); console.error(e); } finally { save(); await env.stop(); }
console.log(JSON.stringify(R, null, 1));
console.log("XONG");
