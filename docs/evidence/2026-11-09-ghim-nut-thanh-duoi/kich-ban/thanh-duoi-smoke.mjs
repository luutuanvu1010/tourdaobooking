// Kịch bản Chrome — «Nút thanh dưới» tự chọn (ADR-0187 Đ2.3; đặc tả docs/superpowers/specs/2026-11-09-ghim-nut-thanh-duoi-design.md §5 tiêu chí 1, 6).
// Dùng vc-lib.mjs (trên a2-cdp.mjs): D1 local TẠM, tài khoản giả. Khổ điện thoại 375 × 812 (iPhone SE/mini) và máy tính 1040.
//  1) Bán hàng + Kế toán mở trang Tôi (375): thanh dưới mặc định Trang chủ · Đơn hàng · Tạo đơn · Danh bạ · Tôi (thiếu Sổ công nợ — như đo 9/11); mục «Nút thanh dưới»
//     hiện, đánh dấu sẵn bốn nút đang có, có Sổ công nợ để chọn; ảnh truoc-375.png; axe.
//  2) Bỏ Danh bạ, chọn Sổ công nợ, bấm «Lưu» → trang tải lại, thanh dưới Trang chủ · Đơn hàng · Tạo đơn · Sổ công nợ · Tôi; nút Sổ công nợ mở được /so-cong-no; ảnh sau-375.png.
//  3) Máy tính 1040: mục «Nút thanh dưới» không hiện (máy tính không có thanh dưới).
//  4) «Về mặc định» → thanh dưới về như bước 1.
//  5) Bán hàng (một mình) mở trang Tôi: danh sách chọn KHÔNG có Sổ công nợ (chỉ trang mình mở được).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-11-09-ghim-nut-thanh-duoi/kich-ban/thanh-duoi-smoke.mjs
import { mkdirSync } from "node:fs";
process.env.OUT ??= "docs/evidence/2026-11-09-ghim-nut-thanh-duoi";
const { ACCOUNTS, DESK, assert, axe, axeNote, boDem, dungMoiTruong, shotFull, shotView, sleep } = await import("../../2026-09-28-van-chuyen-1a/kich-ban/vc-lib.mjs");
mkdirSync(`${process.env.OUT}/anh`, { recursive: true });

const DT = { width: 375, height: 812, mobile: true };
const LAI = { name: "Kiêm Bán Kế", phone: "0900000431", pin: "246431", permissions: ["SALES", "ACCOUNTING"] };
const dem = boDem("THANH DUOI SMOKE");
const tabs = (p) => p.ev(`[...document.querySelectorAll('#tabbar a')].filter((a) => a.getClientRects().length > 0).map((a) => a.innerText.replace(/\\s+/g, ' ').trim())`);
const chon = (p) => p.ev(`[...document.querySelectorAll('#thanh-duoi label')].map((l) => ({ nhan: l.innerText.trim(), co: l.querySelector('input').checked }))`);
const mucHien = (p) => p.ev(`((el) => !!el && el.getClientRects().length > 0)(document.querySelector('#thanh-duoi'))`);
const choTrangToi = (p) => p.waitFor("!!document.querySelector('#tabbar') && !document.querySelector('#tabbar[data-khung-tam]') && !!document.querySelector('#links a')", "trang Tôi dựng xong khung thật", 15000);

const { env } = await dungMoiTruong([LAI]);
try {
  const p = await env.as(LAI, "/account", DT);
  await dem.step("1", "375: Bán hàng + Kế toán — thanh dưới mặc định thiếu Sổ công nợ; mục «Nút thanh dưới» hiện, có Sổ công nợ để chọn" + axeNote(), async () => {
    await choTrangToi(p);
    await p.waitFor("!!document.querySelector('#thanh-duoi label')", "mục Nút thanh dưới dựng xong", 10000);
    assert.deepEqual(await tabs(p), ["Trang chủ", "Đơn hàng", "Tạo đơn", "Danh bạ", "Tôi"]);
    assert.equal(await mucHien(p), true);
    const c = await chon(p);
    assert.deepEqual(c.filter((x) => x.co).map((x) => x.nhan), ["Trang chủ", "Đơn hàng", "Tạo đơn", "Danh bạ"], "đánh dấu sẵn các nút đang có");
    assert.ok(c.some((x) => x.nhan === "Sổ công nợ" && !x.co), "Sổ công nợ có trong danh sách, chưa chọn");
    assert.ok(!c.some((x) => x.nhan === "Thiết lập"), "không có trang mình không mở được");
    assert.equal(await p.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth"), 0, "không tràn ngang");
    assert.deepEqual(p.consoleErrors, [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
    await axe(p, "/account 375");
    await shotFull(p, "truoc-375.png");
    await p.ev("document.querySelector('#thanh-duoi').scrollIntoView({ block: 'center' })");
    await shotView(p, "truoc-375-khung.png");
  });

  await dem.step("2", "375: bỏ Danh bạ, chọn Sổ công nợ, «Lưu» → thanh dưới có Sổ công nợ và mở được trang", async () => {
    // Đủ 4 ô thì các ô còn lại bị khoá: phải BỎ Danh bạ trước rồi mới chọn được Sổ công nợ (như người dùng thật).
    const o = (t) => `[...document.querySelectorAll('#thanh-duoi label')].find((l) => l.innerText.trim() === ${JSON.stringify(t)}).querySelector('input')`;
    assert.equal(await p.ev(`${o("Sổ công nợ")}.disabled`), true, "đủ 4 ô thì ô chưa chọn bị khoá");
    await p.ev(`${o("Danh bạ")}.click()`);
    assert.equal(await p.ev(`${o("Sổ công nợ")}.disabled`), false, "bỏ một ô thì mở khoá");
    await p.ev(`${o("Sổ công nợ")}.click()`);
    await p.ev("document.querySelector('#thanh-duoi-luu').click()");
    await sleep(800);
    await choTrangToi(p);
    await p.waitFor("[...document.querySelectorAll('#tabbar a')].some((a) => a.innerText.includes('Sổ công nợ'))", "thanh dưới vẽ lại có Sổ công nợ", 15000);
    assert.deepEqual(await tabs(p), ["Trang chủ", "Đơn hàng", "Tạo đơn", "Sổ công nợ", "Tôi"]);
    await p.waitFor("!!document.querySelector('#thanh-duoi-mac-dinh')", "có nút Về mặc định", 10000);
    await shotFull(p, "sau-375.png");
    await p.ev("document.querySelector('#thanh-duoi').scrollIntoView({ block: 'center' })");
    await shotView(p, "sau-375-khung.png");
    await p.ev("[...document.querySelectorAll('#tabbar a')].find((a) => a.innerText.includes('Sổ công nợ')).click()");
    await p.waitFor("location.pathname === '/so-cong-no'", "nút Sổ công nợ mở /so-cong-no", 10000);
    await sleep(1500);
    assert.notEqual(await p.ev("document.body.dataset.trangThai ?? ''"), "403", "trang không báo bị từ chối");
    assert.deepEqual(await tabs(p), ["Trang chủ", "Đơn hàng", "Tạo đơn", "Sổ công nợ", "Tôi"], "thanh dưới giữ ở trang khác");
    await shotFull(p, "so-cong-no-375.png");
  });

  await dem.step("3", "1040: mục «Nút thanh dưới» không hiện ở máy tính", async () => {
    const d = await env.as(LAI, "/account", DESK);
    try {
      await d.waitFor("!!document.querySelector('#links a') && !document.querySelector('[data-khung-tam]')", "trang Tôi máy tính dựng xong", 15000);
      await sleep(600);
      assert.equal(await mucHien(d), false);
    } finally { d.close(); }
  });

  await dem.step("4", "375: «Về mặc định» → thanh dưới về như cũ", async () => {
    await p.send("Page.navigate", { url: env.base + "/account" });
    await choTrangToi(p);
    await p.waitFor("!!document.querySelector('#thanh-duoi-mac-dinh')", "có nút Về mặc định", 10000);
    await p.ev("document.querySelector('#thanh-duoi-mac-dinh').click()");
    await sleep(800);
    await choTrangToi(p);
    await p.waitFor("!document.querySelector('#thanh-duoi-mac-dinh') && !!document.querySelector('#thanh-duoi label')", "đã về mặc định", 15000);
    assert.deepEqual(await tabs(p), ["Trang chủ", "Đơn hàng", "Tạo đơn", "Danh bạ", "Tôi"]);
  });
  p.close();

  await dem.step("5", "375: Bán hàng một mình — danh sách chọn không có Sổ công nợ", async () => {
    const b = await env.as(ACCOUNTS.salesA, "/account", DT);
    try {
      await choTrangToi(b);
      await b.waitFor("!!document.querySelector('#thanh-duoi label')", "mục Nút thanh dưới dựng xong", 10000);
      const c = (await chon(b)).map((x) => x.nhan);
      assert.ok(!c.includes("Sổ công nợ"), JSON.stringify(c));
      assert.ok(c.includes("Danh bạ"), JSON.stringify(c));
    } finally { b.close(); }
  });
} finally {
  dem.xong();
  await env.stop();
}
