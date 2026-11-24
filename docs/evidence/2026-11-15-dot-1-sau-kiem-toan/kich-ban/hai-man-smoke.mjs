// Ảnh thật hai màn mới của Đợt 1 (TT1 cảnh báo Danh mục; T3 câu nhắc nhân viên). D1 local tạm, dữ liệu giả. Chạy từ gốc repo.
// Chạy từ GỐC repo, sau `npm run build:web`: AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-15-dot-1-sau-kiem-toan node docs/evidence/2026-11-15-dot-1-sau-kiem-toan/kich-ban/hai-man-smoke.mjs
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { CHU, MOB, assert, axe, axeNote, boDem, dungMoiTruong, noOverflowX, shotFull, sleep, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
const BH = { name: "Bán Hàng Nhắc Giá", phone: "0900000771", pin: "246771", permissions: ["SALES"] };
const RONG = { width: 1280, height: 860, mobile: false };
const OUT = process.env.OUT; const ANH = join(OUT, "anh"); mkdirSync(ANH, { recursive: true });
const { env, call } = await dungMoiTruong([CHU, BH]);
const b = boDem("HAI MAN DOT 1");
try {
  await call(CHU, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: "TD101", canXacNhan: false });
  env.sql(`UPDATE catalog_sync SET problems_json = '[{"row":7,"message":"TD101: giá người lớn «850k» không phải số","code":"TD101","giuLai":true}]' WHERE id = 'default'`);
  const r = await call(BH, "POST", "/api/orders", { customerName: "Khách Nhắc Giá", customerPhone: "0912345678", services: [{ kind: "catalog", catalogCode: "TD101", pickupChoice: "KHONG_DON", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, departDate: vnDate(3), legs: [] }] });
  assert.equal(r.status, 201, r.text);
  const don = r.json.order;
  env.sql("UPDATE catalog_item SET price_adult = 1500000 WHERE code = 'TD101'");
  for (const [khung, hau] of [[MOB, "390"], [RONG, "1280"]]) {
    let p = await env.as(CHU, "/catalog", khung);
    await p.waitFor("document.body.innerText.includes('đang bán theo bản đã lưu')", "cảnh báo Danh mục", 15000);
    await b.step(`${hau}-a`, `${hau}: Danh mục có cảnh báo đỏ dòng Sheet sai, nêu dịch vụ và «đang bán theo bản đã lưu»${axeNote()}`, async () => {
      const t = await p.ev("document.body.innerText");
      assert.match(t, /đang bán theo bản đã lưu/); assert.match(t, /TD101/);
      assert.equal(await p.ev(noOverflowX), true);
      await shotFull(p, `tt1-danh-muc-${hau}.png`);
      await axe(p, `Danh mục ${hau}`);
    });
    p.close();
    p = await env.as(BH, `/order?id=${don.id}`, khung);
    await p.waitFor(`document.body.innerText.includes('đã đổi sau khi lưu đơn nháp')`, "câu nhắc giá đổi");
    await b.step(`${hau}-b`, `${hau}: trang đơn nháp của nhân viên có câu nhắc giá danh mục đã đổi${axeNote()}`, async () => {
      const t = await p.ev("document.body.innerText");
      assert.match(t, /Giá danh mục của «.+» đã đổi sau khi lưu đơn nháp — đơn sẽ xác nhận theo giá đã lưu/);
      assert.equal(await p.ev(noOverflowX), true);
      await shotFull(p, `t3-nhac-gia-${hau}.png`);
      await axe(p, `trang đơn ${hau}`);
    });
    p.close();
  }
} finally { await env.stop?.(); await env.tat?.(); }
b.xong();
