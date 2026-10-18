// Rà soát ngôn ngữ lượt 2 (18/10) — ảnh TRƯỚC / SAU khi đổi chữ bảy khái niệm (hồ sơ docs/superpowers/specs/2026-10-18-ra-soat-ngon-ngu-luot-2.md).
// Ba trang tiêu biểu: đơn nháp có lượt đưa đón (form lập đơn), «Máy đang đăng nhập của tôi», Chính sách điều phối (hạn chốt).
// Chạy từ GỐC repo, trên D1 tạm (không đụng dữ liệu thật): bản mã TRƯỚC khi đổi chữ → ANH=truoc; bản mới → ANH=sau
//   npm run build:web && ANH=sau node docs/evidence/2026-10-18-ngon-ngu-luot-2/kich-ban/anh-doi-chu.mjs
// Chỉ chụp, không khẳng định chữ (để một kịch bản chạy được ở cả hai bản). Bán hàng mở trước, Toàn quyền mở SAU CÙNG (kho cookie chung).
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { ACCOUNTS, ok, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const PHA = process.env.ANH ?? "sau";
const OUT = process.env.OUT ?? `docs/evidence/2026-10-18-ngon-ngu-luot-2/anh/${PHA}`;
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
  const NGAY = vnDate(5);
  const created = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách Thử Chữ", customerPhone: "0903 222 666", customerEmail: "", customerNote: "", discount: 0, paymentNote: "",
    services: [{ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, unitPrices: { adult: 1350000 },
      departDate: NGAY, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "",
      legs: [{ direction: "OUT", pickupDate: NGAY, pickupTime: "07:30", pickupLocationId: null, pickupPlace: "Khách sạn Sunrise", dropoffLocationId: null, dropoffPlace: "Cảng Cầu Đá" }] }],
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const o = created.json.order;

  // ---- 1) Bán hàng 390: form sửa đơn nháp — khối đưa đón ----
  const f = await env.as(ACCOUNTS.salesA, `/order-form?id=${o.id}`);
  await f.waitFor("!!document.querySelector('.dd-chang')", "khối đưa đón trên form");
  await f.ev("document.querySelector('.dd-chang').closest('.svc, section, .card')?.scrollIntoView({ block: 'start' }); true");
  await f.shot(`${OUT}/1-form-luot-dua-don-390.png`);
  f.close();
  // ---- 2) Bán hàng 390: trang máy đang đăng nhập của tôi ----
  const s = await env.as(ACCOUNTS.salesA, "/sessions");
  await s.waitFor("!!document.querySelector('h1') && document.body.innerText.length > 200", "trang đăng nhập của tôi");
  await s.shot(`${OUT}/2-may-dang-dang-nhap-390.png`);
  s.close();
  ok(`[${PHA}] Bán hàng: form đưa đón, trang máy đang đăng nhập`);

  // ---- 3) Toàn quyền 1040 (mở sau cùng): Chính sách điều phối ----
  const c = await env.as(ACCOUNTS.chu, "/chinh-sach-dieu-phoi", { width: 1040, height: 900, mobile: false });
  await c.waitFor("!!document.querySelector('input') && document.body.innerText.length > 300", "trang chính sách điều phối");
  await c.shot(`${OUT}/3-chinh-sach-dieu-phoi-1040.png`);
  c.close();
  ok(`[${PHA}] Toàn quyền: chính sách điều phối`);
  console.log(`ANH DOI CHU ${PHA.toUpperCase()} OK`);
} finally {
  await env.stop();
}
