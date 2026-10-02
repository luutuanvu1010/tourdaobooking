// Kịch bản Chrome — màn "Giao diện" (ADR-0087, Task 5): chỉ Toàn quyền (ô settings.ops) chỉnh được; xem trước NGAY trên trang; "Áp dụng cho mọi người" lưu cho cả công ty.
//   1. Bán hàng: thanh bên KHÔNG có "Giao diện"; mở thẳng /giao-dien → câu "Chỉ người phụ trách hệ thống…", không có ô chỉnh.
//   2. Toàn quyền (1040): thanh bên có "Giao diện"; 4 nhóm; "Áp dụng" khoá khi chưa đổi.
//   3. Đổi "Nền thanh trên" sang #0c4a6e → thanh trên rgb(12, 74, 110) NGAY (xem trước); hiện lỗi "khó đọc"; "Áp dụng" khoá.
//   3b. Chỉnh ô màu liên tiếp: ô chọn màu KHÔNG bị dựng lại (cùng một phần tử trước/sau).
//   4. Đổi "Chữ thanh trên" sang #ffffff → hết lỗi, "Áp dụng" mở; bấm → hộp xác nhận trong trang → "Áp dụng" → lưu, không lỗi.
//   5. Tải lại /orders → thanh trên rgb(12, 74, 110) ngay sau khi trang tải xong (kèm /api/giao-dien.css).
//   6. Chặn /api/giao-dien.css (CDP Network.setBlockedURLs) → tải lại → thanh trên về mặc định, trang không vỡ.
//   7. "Về mặc định toàn bộ" → Áp dụng → /orders thanh trên về mặc định.
//   8. 390: không tràn ngang, ô gõ ≥ 16px, axe không có vi phạm serious/critical.
// Mỗi bước dùng phiên riêng qua env.as và đóng trang trước khi mở trang kế (các trang dùng CHUNG kho cookie, CLAUDE.md §10).
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài; D1 tạm):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh [OUT=<thư mục ảnh>] node docs/evidence/2026-10-02-giao-dien/kich-ban/giao-dien-smoke.mjs
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-02-giao-dien/anh");
mkdirSync(OUT, { recursive: true });
const AXE = readFileSync(process.env.AXE_JS, "utf8");
const NEN_BAR = "document.querySelector('#topbar') && getComputedStyle(document.querySelector('#topbar')).backgroundColor";

const env = await startEnv();
let loi = 0;
try {
  const khungThat = (p, vp) => p.waitFor(vp.mobile ? "document.querySelectorAll('#tabbar .tab').length > 0 && !document.querySelector('#tabbar[data-khung-tam]')" : "document.querySelectorAll('#sidebar .sidebar-item').length > 0 && !document.querySelector('#sidebar[data-khung-tam]')", "khung thật");
  const muc = (p) => p.ev("[...document.querySelectorAll('#sidebar .sidebar-item-label')].map((e) => e.textContent.trim())");
  const loiHien = (p) => p.ev("[...document.querySelectorAll('.gd-loi')].filter((e) => !e.hidden && e.textContent.trim()).map((e) => e.textContent.trim())");
  const bar = (p) => p.ev(NEN_BAR);
  const doiMau = (p, khoa, mau) => p.ev(setInput(`document.getElementById('gd-${khoa}')`, mau));
  const apDungDuoc = (p) => p.ev("!document.getElementById('gd-ap-dung').disabled");
  const luuLenMayChu = async (p) => {
    await p.ev("document.getElementById('gd-ap-dung').click()");
    await p.waitFor("!document.getElementById('gd-xac-nhan').hidden", "hộp xác nhận hiện trong trang");
    await p.ev("[...document.querySelectorAll('#gd-xac-nhan button')].find((b) => b.textContent.trim() === 'Áp dụng').click()");
    await p.waitFor("document.getElementById('gd-xac-nhan').hidden && document.getElementById('gd-ap-dung').disabled", "đã lưu (nút Áp dụng khoá lại)");
    assert.equal(await p.ev("document.getElementById('error').hidden"), true, "lưu xong không có dòng báo lỗi");
  };
  const axe = async (p, label) => {
    if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
    const v = await p.ev("axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help })))");
    const bad = v.filter((x) => x.impact === "serious" || x.impact === "critical");
    assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
  };

  // ---- 1. Bán hàng
  let p = await env.as(ACCOUNTS.salesA, "/orders", DESK);
  await khungThat(p, DESK);
  assert.ok(!(await muc(p)).includes("Giao diện"), "1. Bán hàng không được thấy mục Giao diện");
  const macDinhBar = await bar(p);
  await p.send("Page.navigate", { url: env.base + "/giao-dien" });
  await p.waitFor("document.readyState === 'complete' && !document.getElementById('error').hidden", "1. câu từ chối hiện");
  const tc = await p.ev("({ chu: document.getElementById('error').textContent, nhom: document.querySelectorAll('#gd-form fieldset').length, hienForm: document.getElementById('gd-form').offsetParent !== null })");
  assert.ok(tc.chu.includes("Chỉ người phụ trách hệ thống"), `1. câu: ${tc.chu}`);
  assert.equal(tc.nhom, 0, "1. không có ô chỉnh");
  assert.equal(tc.hienForm, false, "1. form ẩn");
  assert.deepEqual(p.consoleErrors, [], "1. không lỗi JS");
  p.close();
  ok(`1. Bán hàng: thanh bên không có "Giao diện"; mở thẳng → "${tc.chu}", không có ô chỉnh (nền thanh trên mặc định ${macDinhBar})`);

  // ---- 2. Toàn quyền
  p = await env.as(ACCOUNTS.chu, "/giao-dien", DESK);
  await khungThat(p, DESK);
  await p.waitFor("document.querySelectorAll('#gd-form fieldset').length === 4", "2. bốn nhóm");
  assert.ok((await muc(p)).includes("Giao diện"), "2. thanh bên có Giao diện");
  assert.equal(await apDungDuoc(p), false, "2. 'Áp dụng' khoá khi chưa đổi");
  assert.equal(await p.ev("document.getElementById('gd-bo').disabled"), true, "2. 'Bỏ thay đổi' khoá khi chưa đổi");
  const soDong = await p.ev("document.querySelectorAll('.gd-dong').length");
  assert.ok(soDong >= 20, `2. đủ dòng chỉnh: ${soDong}`);
  await p.shot(join(OUT, "01-giao-dien-1040-mac-dinh.png"));
  ok(`2. Toàn quyền: thanh bên có Giao diện; 4 nhóm, ${soDong} dòng; 'Áp dụng' và 'Bỏ thay đổi' khoá khi chưa đổi`);

  p.close();

  // ---- 3. xem trước ngay + lỗi tương phản. Thanh trên dùng --c-bar-bg ở khổ điện thoại; ở máy tính (có thanh bên) thanh trên dùng nền thẻ
  // (app.css `body.has-sidebar #topbar`) nên các bước 3–7 đo ở 390. Khung xem trước `.gd-xem-thanh` dùng --c-bar-bg ở mọi khổ.
  p = await env.as(ACCOUNTS.chu, "/giao-dien", MOB);
  await khungThat(p, MOB);
  await p.waitFor("document.querySelectorAll('#gd-form fieldset').length === 4", "3. bốn nhóm");
  await p.ev("(() => { window.__o = document.getElementById('gd-nen-thanh-tren'); return true; })()");
  await doiMau(p, "nen-thanh-tren", "#0c4a6e");
  assert.equal(await bar(p), "rgb(12, 74, 110)", "3. thanh trên đổi NGAY (xem trước)");
  assert.equal(await p.ev("getComputedStyle(document.querySelector('.gd-xem-thanh')).backgroundColor"), "rgb(12, 74, 110)", "3. khung xem trước đổi theo");
  const l3 = await loiHien(p);
  assert.ok(l3.some((t) => t.includes("khó đọc")), `3. phải có lỗi "khó đọc": ${JSON.stringify(l3)}`);
  assert.ok(!l3.some((t) => /#[0-9a-f]{3,6}|settings\./i.test(t)), `3. lỗi không lộ mã thô: ${JSON.stringify(l3)}`);
  assert.equal(await apDungDuoc(p), false, "3. 'Áp dụng' khoá khi có lỗi");
  assert.equal(await p.ev("document.getElementById('gd-nen-thanh-tren').closest('.gd-dong').classList.contains('is-doi')"), true, "3. dòng đã đổi có lớp is-doi");
  assert.equal(await p.ev("!!document.getElementById('gd-nen-thanh-tren').closest('.gd-dong').querySelector('.btn-link:not([hidden])')"), true, "3. dòng đã đổi có nút 'Về mặc định'");
  await p.shot(join(OUT, "02-giao-dien-1040-loi-tuong-phan.png"));
  ok(`3. đổi Nền thanh trên → thanh trên rgb(12, 74, 110) ngay; lỗi "${l3[0]}"; 'Áp dụng' khoá`);

  // ---- 3b. không dựng lại ô màu
  await doiMau(p, "nen-thanh-tren", "#0c4a6f");
  await doiMau(p, "nen-thanh-tren", "#0c4a6e");
  assert.equal(await p.ev("window.__o === document.getElementById('gd-nen-thanh-tren')"), true, "3b. ô chọn màu vẫn là CÙNG một phần tử sau nhiều lần chỉnh");
  ok("3b. ô chọn màu không bị dựng lại khi chỉnh liên tiếp");

  // ---- 4. sửa lỗi, áp dụng
  await doiMau(p, "chu-thanh-tren", "#ffffff");
  assert.deepEqual(await loiHien(p), [], "4. hết lỗi");
  assert.equal(await apDungDuoc(p), true, "4. 'Áp dụng' mở");
  await luuLenMayChu(p);
  const css = await p.ev("fetch('/api/giao-dien.css').then((r) => r.text())");
  assert.ok(css.includes("#0c4a6e"), `4. /api/giao-dien.css có giá trị mới: ${css.slice(0, 200)}`);
  assert.deepEqual(p.consoleErrors, [], "4. không lỗi JS");
  p.close();
  ok("4. đổi Chữ thanh trên → hết lỗi, 'Áp dụng' mở; hộp xác nhận trong trang → lưu; /api/giao-dien.css có giá trị mới");

  // ---- 5. trang khác thấy ngay
  p = await env.as(ACCOUNTS.chu, "/orders", MOB);
  assert.equal(await bar(p), "rgb(12, 74, 110)", "5. /orders: thanh trên đã mang màu công ty ngay khi tải xong");
  await p.shot(join(OUT, "03-orders-1040-mau-cong-ty.png"));
  p.close();
  ok("5. tải /orders → thanh trên rgb(12, 74, 110) ngay sau khi tải xong");

  // ---- 6. mất /api/giao-dien.css
  p = await env.openPage(MOB);
  const ck = await env.login(ACCOUNTS.chu);
  await p.send("Network.setCookie", { name: ck.name, value: ck.value, url: env.base, httpOnly: true });
  await p.send("Network.setBlockedURLs", { urls: ["*/api/giao-dien.css*"] });
  await p.send("Page.navigate", { url: env.base + "/orders" });
  await p.waitFor("document.readyState === 'complete'", "6. /orders tải xong");
  await khungThat(p, MOB);
  assert.equal(await bar(p), macDinhBar, "6. không có tệp giao diện → thanh trên mặc định");
  assert.ok(p.failed.length > 0, "6. yêu cầu bị chặn thật");
  assert.equal(await p.ev("document.querySelectorAll('#tabbar .tab').length > 1"), true, "6. trang không vỡ (thanh tab vẫn dựng)");
  p.close();
  ok(`6. chặn /api/giao-dien.css → thanh trên ${macDinhBar} (mặc định), trang vẫn dựng`);

  // ---- 7. về mặc định toàn bộ
  p = await env.as(ACCOUNTS.chu, "/giao-dien", MOB);
  await p.waitFor("document.querySelectorAll('#gd-form fieldset').length === 4 && document.getElementById('gd-nen-thanh-tren').value === '#0c4a6e'", "7. nạp bản đã lưu");
  await p.ev("document.getElementById('gd-mac-dinh').click()");
  assert.equal(await bar(p), macDinhBar, "7. xem trước về mặc định ngay");
  assert.equal(await apDungDuoc(p), true, "7. 'Áp dụng' mở (khác bản đã lưu)");
  await luuLenMayChu(p);
  p.close();
  p = await env.as(ACCOUNTS.chu, "/orders", MOB);
  assert.equal(await bar(p), macDinhBar, "7. /orders: thanh trên về mặc định");
  p.close();
  ok("7. 'Về mặc định toàn bộ' → Áp dụng → /orders thanh trên về mặc định");

  // ---- 8. 390
  p = await env.as(ACCOUNTS.chu, "/giao-dien", MOB);
  await p.waitFor("document.querySelectorAll('#gd-form fieldset').length === 4", "8. bốn nhóm");
  const m = await p.ev("({ rong: document.documentElement.scrollWidth, nho: [...document.querySelectorAll('#gd-form input:not([type=color]), #gd-form select')].filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.id) })");
  assert.ok(m.rong <= 390, `8. tràn ngang: scrollWidth ${m.rong}`);
  assert.deepEqual(m.nho, [], `8. ô gõ dưới 16px: ${JSON.stringify(m.nho)}`);
  await axe(p, "/giao-dien 390");
  await p.shot(join(OUT, "04-giao-dien-390.png"));
  assert.deepEqual(p.consoleErrors, [], "8. không lỗi JS");
  p.close();
  ok("8. 390: không tràn ngang, ô gõ ≥ 16px, axe không vi phạm serious/critical");
} catch (e) {
  loi = 1;
  console.error(`✗ ${e.message}`);
} finally {
  await env.stop();
}
process.exit(loi);
