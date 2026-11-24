// Kịch bản Chrome bấm thử «Ngừng bán theo ngày» (ADR-0220): đặt khoảng cho TD101, nhãn trên dòng, nút ở nhóm, lập đơn bị chặn (390 + 1280), bảng trượt điện thoại.
// Chỉ đụng D1 tạm. Chạy từ GỐC worktree sau `npm run build:web`: node docs/evidence/2026-11-20-ngung-ban-theo-ngay/kich-ban/ngung-ban-ngay-smoke.mjs. Ảnh chỉ nằm trên máy (ADR-0215 Đ3).
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
const OUT = "docs/evidence/2026-11-20-ngung-ban-theo-ngay";
const DESK = { width: 1280, height: 860, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const chup = async (p, ten) => { await sleep(350); writeFileSync(join(OUT, ten), Buffer.from((await p.send("Page.captureScreenshot", { format: "png" })).result.data, "base64")); console.log("ảnh", ten); };
const env = await startEnv();
try {
  // 1) Quản trị, máy tính: dòng dịch vụ có nút, mở bảng trượt, đặt khoảng
  let p = await env.as(ACCOUNTS.admin, "/catalog", DESK);
  await p.waitFor("document.querySelector('#list tr[data-code=\"TD101\"] [data-action=\"ngung-ban-ngay\"]')", "nút ở dòng TD101", 15000);
  await p.ev("document.querySelector('#list tr[data-code=\"TD101\"]').scrollIntoView({ block: 'center' }); true");
  await chup(p, "1-may-tinh-dong-dich-vu.png");
  await p.ev("document.querySelector('#list tr[data-code=\"TD101\"] [data-action=\"ngung-ban-ngay\"]').click(); true");
  await p.waitFor("document.getElementById('nbn-tu')", "bảng trượt");
  await p.ev(setInput("document.getElementById('nbn-tu')", vnDate(5)));
  await p.ev(setInput("document.getElementById('nbn-den')", vnDate(9)));
  await p.ev(setInput("document.getElementById('nbn-ghi-chu')", "Tàu bảo dưỡng"));
  await chup(p, "2-may-tinh-bang-dat-khoang.png");
  await p.ev("document.querySelector('[data-action=\"ngung-ban-ngay-luu\"]').click(); true");
  await p.waitFor("document.querySelector('#list tr[data-code=\"TD101\"] [data-ngung-ngay]')", "nhãn sau khi lưu");
  console.log("nhãn:", await p.ev("document.querySelector('#list tr[data-code=\"TD101\"] [data-ngung-ngay]').textContent"));
  console.log("toast:", await p.ev("document.querySelector('.toast')?.textContent ?? '(không thấy)'"));
  await p.ev("document.querySelector('#list tr[data-code=\"TD101\"]').scrollIntoView({ block: 'center' }); true");
  await chup(p, "3-may-tinh-sau-khi-luu.png");
  // nhóm: nút ở dòng nhóm
  console.log("nút ở nhóm:", await p.ev("document.querySelectorAll('#nhom-dv [data-action=\"ngung-ban-ngay\"]').length"));
  await p.ev("document.getElementById('nhom-dv').scrollIntoView({ block: 'start' }); true");
  await chup(p, "4-may-tinh-nhom.png");
  // mở lại bảng: thấy khoảng đang có + nút Kết thúc
  await p.ev("document.querySelector('#list tr[data-code=\"TD101\"] [data-action=\"ngung-ban-ngay\"]').click(); true");
  await p.waitFor("document.querySelector('[data-action=\"ngung-ban-ngay-ket-thuc\"]')", "nút Kết thúc");
  await p.ev("document.querySelector('[data-action=\"ngung-ban-ngay-ket-thuc\"]').scrollIntoView({ block: 'center' }); true");
  await chup(p, "5-may-tinh-khoang-dang-co.png");
  console.log("lỗi console (quản trị):", JSON.stringify(p.consoleErrors));
  p.close();
  console.log("bảng:", JSON.stringify(env.sql("SELECT scope, catalog_code, from_date, to_date, note, ended_at FROM ctl_sales_pause")));

  // 2) Bán hàng lập đơn TD101 ngày trong khoảng → bị chặn (điện thoại và máy tính)
  for (const [vp, ten] of [[MOB, "6-dien-thoai-lap-don-bi-chan.png"], [DESK, "7-may-tinh-lap-don-bi-chan.png"]]) {
    p = await env.as(ACCOUNTS.salesA, "/order-form", vp);
    await p.waitFor("document.getElementById('catalog-q')", "form mới", 15000);
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "TD101");
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor("document.querySelectorAll('#services .svc').length === 1", "thẻ");
    await p.ev(setInput("document.getElementById('orderDate')", vnDate(7)));
    await p.ev(setInput("document.getElementById('customerName')", "Khách Thử Ngày Nghỉ"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0902 222 333"));
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("!document.getElementById('save-error').hidden", "banner lỗi", 15000);
    console.log("câu báo:", await p.ev("document.getElementById('save-error').textContent"));
    await p.ev("document.getElementById('save-error').scrollIntoView({ block: 'center' }); true");
    await chup(p, ten);
    p.close();
  }
  console.log("số đơn đã ghi:", JSON.stringify(env.sql("SELECT count(*) AS n FROM orders")));

  // 3) Điện thoại, Quản trị: thẻ dịch vụ + bảng trượt
  p = await env.as(ACCOUNTS.admin, "/catalog", MOB);
  await p.waitFor("document.querySelector('#list-cards [data-code=\"TD101\"] [data-action=\"ngung-ban-ngay\"]')", "nút ở thẻ TD101", 15000);
  await p.ev("document.querySelector('#list-cards [data-code=\"TD101\"]').scrollIntoView({ block: 'center' }); true");
  await chup(p, "8-dien-thoai-the-dich-vu.png");
  await p.ev("document.querySelector('#list-cards [data-code=\"TD101\"] [data-action=\"ngung-ban-ngay\"]').click(); true");
  await p.waitFor("document.getElementById('nbn-tu')", "bảng trượt");
  await chup(p, "9-dien-thoai-bang-truot.png");
  console.log("tràn ngang (điện thoại):", await p.ev("document.documentElement.scrollWidth - innerWidth"));
  p.close();
} finally { await env.stop(); }
