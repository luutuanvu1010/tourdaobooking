// ADR-0059 — khối "Xe đón" trên chi tiết đơn (web/order.ts + src/shared/xe-tren-don.ts; route GET /api/van-chuyen/xe-cua-don/:orderId). Dữ liệu điều phối
// dùng chung dp-lib.mjs của ADR-0049 (đường thật qua route) + đơn O6 (4 khách, HDV phụ trách) CHIA HAI XE. Năm bước:
//   1 Thực tập mở đơn mình lập → không khối, không gọi route; 2 HDV mở đơn mình phụ trách → không khối, không gọi route; 3 Kế toán mở O1 → một dòng xe;
//   4 Bán hàng (máy tính) mở O6 → hai dòng xe dưới thông tin chuyến, đúng MỘT lời gọi route, không mã thô; 5 Bán hàng (điện thoại 390) mở O5 chưa xếp →
//   "Chưa xếp xe", không tràn ngang.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-09-30-xe-tren-don node docs/evidence/2026-09-30-xe-tren-don/kich-ban/xe-tren-don-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Thực tập → HDV → Kế toán → Bán hàng (trang mở sau cùng là của Bán hàng — tài khoản cần xem khối).
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  ACCOUNTS, CHU, DESK, MOB, OUT, apiCalls, assert, axe, axeNote, boDem, dungDuLieuDieuPhoi, dungMoiTruong, noCode, noOverflowX, shotFull,
} from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const HDV = { name: "Hướng Dẫn Xe Đơn", phone: "0900000591", pin: "246591", permissions: ["FIELD"] };
const TT = { name: "Thực Tập Xe Đơn", phone: "0900000592", pin: "246592", permissions: ["INTERN"] };
mkdirSync(join(OUT, "anh"), { recursive: true });
const { env, call } = await dungMoiTruong([CHU, HDV, TT]);
const b = boDem("XE TREN DON SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const idCua = (a) => env.sql(`SELECT id FROM staff WHERE phone = '${a.phone}'`)[0].id;

// O6: 4 khách NGAY_XA 12:00, HDV phụ trách (chọn lúc lập — ADR-0030), chia hai xe: X1 = XE_A · Cường (2), X2 = XE_B · An (2).
const donMoi = async (as, soKhach, extra = {}) => {
  const r = await call(as, "POST", "/api/orders", {
    customerName: "Khách Xe Đơn", customerPhone: "0903 555 666", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{
      kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: soKhach, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 },
      departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", departDate: d.NGAY_XA,
      legs: [{ direction: "OUT", pickupDate: d.NGAY_XA, pickupTime: "12:00", pickupLocationId: null, pickupPlace: "InterContinental Nha Trang", dropoffLocationId: "a941dd7d-faab-4098-9ab9-1df7fa6dd551", dropoffPlace: "" }],
    }],
    passengers: Array.from({ length: soKhach }, (_, i) => ({ fullName: `Khách Xe Đơn ${i + 1}`, birthYear: 1985 + i, paxCode: null })),
    ...extra,
  });
  dung(r, 201, "lập đơn");
  return r.json.order;
};
const o6 = await donMoi(ACCOUNTS.salesA, 4, { handlerStaffId: idCua(HDV) });
dung(await call(ACCOUNTS.admin, "POST", `/api/orders/${o6.id}/status`, { status: "confirmed" }), 200, "xác nhận O6");
const legO6 = o6.services[0].legs[0].id;
const chuyen = async (xeId, tx) => {
  const r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId, taiXePartyId: tx.partyId, batDau: { ngay: d.NGAY_XA, gio: "11:30" }, ketThuc: { ngay: d.NGAY_XA, gio: "13:00" } });
  dung(r, 201, "tạo chuyến");
  const x = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${r.json.chuyen.id}/phan-bo`, { version: r.json.chuyen.version, requestId: randomUUID(), chang: [{ legId: legO6, soSuat: 2 }] });
  dung(x, 200, "xếp O6");
};
await chuyen(d.XE_A.id, d.CUONG);
await chuyen(d.XE_B.id, d.AN);
const donTT = await donMoi(TT, 1);

const xeDong = `[...document.querySelectorAll('.xe-don .kv')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`;
const choDon = (p) => p.waitFor(`!!document.querySelector('.svc-view')`, "trang đơn dựng xong");
const goiXe = (p) => apiCalls(p).filter((r) => r.path.startsWith("/api/van-chuyen/xe-cua-don/"));

try {
  await b.step("1", "Thực tập mở đơn mình lập: KHÔNG có khối xe, KHÔNG gọi route xe-cua-don", async () => {
    const p = await env.as(TT, `/order?id=${donTT.id}`, DESK);
    await choDon(p);
    await new Promise((r) => setTimeout(r, 600));
    assert.equal(await p.ev(`document.querySelectorAll('.xe-don').length`), 0);
    assert.equal(goiXe(p).length, 0);
  });

  await b.step("2", "HDV mở đơn O6 mình phụ trách (đơn có hai xe): KHÔNG có khối xe, KHÔNG gọi route; biển số không có trên trang", async () => {
    const p = await env.as(HDV, `/order?id=${o6.id}`, DESK);
    await choDon(p);
    await new Promise((r) => setTimeout(r, 600));
    assert.equal(await p.ev(`document.querySelectorAll('.xe-don').length`), 0);
    assert.equal(goiXe(p).length, 0);
    assert.ok(!(await p.ev(`document.querySelector('main').innerText`)).includes(d.XE_A.plateNumber), "không lộ biển số");
  });

  await b.step("3", `Kế toán mở O1: một dòng "Xe đón — Xe ${d.XE_A.plateNumber} · Tài xế Nguyễn Văn An · 3 khách · Đã lên kế hoạch"`, async () => {
    const p = await env.as(ACCOUNTS.accounting, `/order?id=${d.O1.id}`, DESK);
    await choDon(p);
    await p.waitFor(`(${xeDong}).length === 1`, "khối xe");
    assert.deepEqual(await p.ev(xeDong), [`Xe đón Xe ${d.XE_A.plateNumber} · Tài xế Nguyễn Văn An · 3 khách · Đã lên kế hoạch`]);
  });

  await b.step("4", `Bán hàng (máy tính) mở O6: hai dòng xe NGAY DƯỚI thông tin chuyến (Cường 2 khách, An 2 khách), đúng MỘT lời gọi route, không mã thô${axeNote()}`, async () => {
    const p = await env.as(ACCOUNTS.salesA, `/order?id=${o6.id}`, DESK);
    await choDon(p);
    await p.waitFor(`(${xeDong}).length === 2`, "hai dòng xe");
    assert.deepEqual((await p.ev(xeDong)).sort(), [
      `Xe đón Xe ${d.XE_A.plateNumber} · Tài xế Phạm Văn Cường · 2 khách · Đã lên kế hoạch`,
      `Xe đón Xe ${d.XE_B.plateNumber} · Tài xế Nguyễn Văn An · 2 khách · Đã lên kế hoạch`,
    ].sort());
    assert.equal(await p.ev(`document.querySelector('.xe-don').previousElementSibling?.classList.contains('svc-facts')`), true, "khối xe nằm ngay dưới thông tin chuyến");
    assert.equal(goiXe(p).length, 1);
    assert.equal(await p.ev(noCode), "");
    assert.ok(!(await p.ev(`document.querySelector('.xe-don').innerText`)).match(/09\d{8}|0903/), "không SĐT trong khối xe");
    await axe(p, "chi tiết đơn có khối xe");
    await shotFull(p, "xe-tren-don-ban-hang-may-tinh.png");
  });

  await b.step("5", `Bán hàng (điện thoại 390) mở O5 chưa xếp: "Xe đón — Chưa xếp xe", không tràn ngang`, async () => {
    const p = await env.as(ACCOUNTS.salesA, `/order?id=${d.O5.id}`, MOB);
    await choDon(p);
    await p.waitFor(`(${xeDong}).length === 1`, "khối xe");
    assert.deepEqual(await p.ev(xeDong), ["Xe đón Chưa xếp xe"]);
    assert.equal(await p.ev(noOverflowX), true);
    await shotFull(p, "xe-tren-don-chua-xep-dien-thoai.png");
    const q = await env.as(ACCOUNTS.salesA, `/order?id=${o6.id}`, MOB);
    await choDon(q);
    await q.waitFor(`(${xeDong}).length === 2`, "hai dòng xe (điện thoại)");
    assert.equal(await q.ev(noOverflowX), true, "hai dòng xe dài không tràn ngang ở 390");
    await shotFull(q, "xe-tren-don-hai-xe-dien-thoai.png");
  });
} finally {
  b.xong();
  await env.stop();
}
