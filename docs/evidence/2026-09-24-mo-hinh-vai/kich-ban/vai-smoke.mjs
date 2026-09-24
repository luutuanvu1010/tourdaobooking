// Kịch bản Chrome cho khối "Vai và quyền" của trang Nhân viên (ADR-0018 giai đoạn 1): chọn vai theo nhóm, xem trước quyền, luật cứng ở giao diện
// (LC-3: chọn một nhóm thì tắt nhóm kia; LC-4: Quản trị không chọn được vai Giám đốc/Điều hành; LC-1: tài khoản bên ngoài không cộng tay quyền khác),
// tạo tài khoản theo vai, đổi vai và thấy "Sẽ mất", Thực tập sinh mở "/" được đưa sang Đơn hàng. Dùng lại môi trường A2 (D1 tạm + wrangler dev + Chrome
// headless qua CDP). Các trang dùng CHUNG kho cookie — trang của Thực tập sinh mở SAU CÙNG.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-24-mo-hinh-vai/kich-ban/vai-smoke.mjs
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, clickText, ok, setInput, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-24-mo-hinh-vai";
const AXE = readFileSync(process.env.AXE_JS, "utf8");
mkdirSync(join(OUT, "anh"), { recursive: true });
const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const NAME = "Kế Toán Chrome";
const INTERN_PHONE = "0912345679";

const box = (scope, kind, code) => `document.querySelector(${JSON.stringify(`${scope} input[type=checkbox][data-kind=${kind}][value=${code}]`)})`;
const preview = (scope) => `document.querySelector(${JSON.stringify(`${scope} [data-role-preview]`)}).textContent`;

const env = await startEnv();
try {
  const axe = async (p, label) => {
    if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
    const v = await p.ev(`axe.run(document).then((r) => r.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious').map((x) => x.id))`);
    assert.deepEqual(v, [], `axe (${label}): ${JSON.stringify(v)}`);
  };

  // ---- A. Form thêm (máy tính): 11 vai, Giám đốc/Điều hành tắt cho Quản trị; chọn Kế toán → nhóm Bên ngoài tắt, xem trước "Kế toán"
  let p = await env.as(ACCOUNTS.admin, "/staff", DESK);
  await p.waitFor(`!!${box("#add-perms", "role", "ACCOUNTANT")}`, "khối chọn vai đã dựng");
  assert.equal(await p.ev(`document.querySelectorAll('#add-perms input[data-kind=role]').length`), 11);
  assert.equal(await p.ev(`${box("#add-perms", "role", "DIRECTOR")}.disabled && ${box("#add-perms", "role", "OPERATIONS_MANAGER")}.disabled`), true, "LC-4: Quản trị không chọn được vai Giám đốc/Điều hành");
  await p.ev(`(${box("#add-perms", "role", "ACCOUNTANT")}).click(), true`);
  assert.equal(await p.ev(`${box("#add-perms", "role", "COLLABORATOR")}.disabled`), true, "LC-3: chọn vai nội bộ thì tắt nhóm bên ngoài");
  assert.match(await p.ev(preview("#add-perms")), /Quyền sẽ có: Kế toán\./);
  await p.ev(setInput("document.querySelector('#add-name')", NAME));
  await p.ev(setInput("document.querySelector('#add-phone')", "0912345678"));
  await p.shot(join(OUT, "anh", "vai-them-may-tinh.png"));
  await p.ev("document.querySelector('#add-form').requestSubmit(), true");
  await p.waitFor(`[...document.querySelectorAll('#list tr')].some((tr) => tr.textContent.includes(${JSON.stringify(NAME)}) && tr.textContent.includes('Kế toán'))`, "dòng mới hiện vai Kế toán");
  ok("thêm tài khoản theo vai: LC-4 + LC-3 ở giao diện, xem trước đúng, danh sách hiện vai");
  // Đóng hộp "Tài khoản mới" trước khi qua bước B/C: hộp này dùng lại ở bước C cho Thực tập sinh — để mở sẽ khiến điều kiện chờ PIN ở bước C
  // đã ĐÚNG NGAY TỪ ĐẦU (còn PIN cũ của Kế Toán Chrome), đọc nhầm PIN cũ thay vì PIN thật của Thực tập sinh (đã kiểm bằng tay, xem báo cáo).
  assert.equal(await p.ev(clickText("#secret", "Đã ghi lại, ẩn đi")), true);

  // ---- B. Sửa: đổi sang Cộng tác viên → nhóm Nội bộ tắt, xem trước "Sẽ mất: Kế toán", cộng tay quyền nội bộ bị tắt (LC-1)
  await p.ev(`[...document.querySelectorAll('#list tr')].find((tr) => tr.textContent.includes(${JSON.stringify(NAME)})).querySelector('button').click(), true`);
  await p.waitFor(`!!${box("#edit", "role", "ACCOUNTANT")} && ${box("#edit", "role", "ACCOUNTANT")}.checked`, "hộp sửa mở với vai hiện tại");
  await p.ev(`(${box("#edit", "role", "ACCOUNTANT")}).click(), (${box("#edit", "role", "COLLABORATOR")}).click(), true`);
  assert.equal(await p.ev(`${box("#edit", "role", "SALES_STAFF")}.disabled`), true, "LC-3 ở hộp sửa");
  const text = await p.ev(preview("#edit"));
  assert.match(text, /Quyền sẽ có: Đối tác\./);
  assert.match(text, /Sẽ mất: Kế toán\./, "Review Focus 3: báo trước quyền sẽ mất");
  assert.equal(await p.ev(`${box("#edit", "add", "SALES")}.disabled`), true, "LC-1: không cộng tay quyền nội bộ cho vai bên ngoài");
  await p.shot(join(OUT, "anh", "vai-sua-may-tinh.png"));
  assert.equal(await p.ev(clickText("#edit", "Lưu")), true);
  await p.waitFor(`[...document.querySelectorAll('#list tr')].some((tr) => tr.textContent.includes(${JSON.stringify(NAME)}) && tr.textContent.includes('Cộng tác viên'))`, "dòng hiện vai mới");
  assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
  ok("đổi vai: xem trước 'Sẽ mất', LC-1/LC-3 ở giao diện, lưu xong danh sách hiện vai mới");

  // ---- C. Tạo một Thực tập sinh (dùng ở E), đọc PIN hiện một lần
  await p.ev(`(${box("#add-perms", "role", "INTERN")}).click(), true`);
  await p.ev(setInput("document.querySelector('#add-name')", "Thực Tập Chrome"));
  await p.ev(setInput("document.querySelector('#add-phone')", INTERN_PHONE));
  await p.ev("document.querySelector('#add-form').requestSubmit(), true");
  await p.waitFor(`!document.querySelector('#secret').hidden && !!document.querySelector('#secret td.pin')`, "hiện PIN tài khoản mới");
  const internPin = await p.ev(`document.querySelector('#secret td.pin').textContent.trim()`);
  p.close();

  // ---- D. Điện thoại (quản trị): thẻ hiện vai, axe sạch
  p = await env.as(ACCOUNTS.admin, "/staff", MOB);
  await p.waitFor(`[...document.querySelectorAll('.card-list .card')].some((c) => c.textContent.includes('Cộng tác viên'))`, "thẻ hiện vai");
  await p.shot(join(OUT, "anh", "vai-dien-thoai.png"));
  await axe(p, "Nhân viên điện thoại");
  assert.deepEqual(p.consoleErrors, [], `lỗi console (điện thoại): ${p.consoleErrors}`);
  p.close();
  ok("điện thoại: thẻ hiện vai, axe không vi phạm critical/serious");

  // ---- E. Thực tập sinh mở "/" → được đưa sang Đơn hàng (mở SAU CÙNG: kho cookie dùng chung)
  p = await env.as({ phone: INTERN_PHONE, pin: internPin }, "/", MOB);
  await p.waitFor(`location.pathname === '/orders'`, "Thực tập sinh mở '/' được đưa sang Đơn hàng");
  await p.waitFor(`document.readyState === 'complete'`, "trang Đơn hàng tải xong");
  await p.shot(join(OUT, "anh", "vai-thuc-tap-don-hang.png"));
  assert.deepEqual(p.consoleErrors, [], `lỗi console (Thực tập sinh): ${p.consoleErrors}`);
  p.close();
  ok("Thực tập sinh: vào thẳng Đơn hàng, không lỗi console");
} finally {
  await env.stop();
}
console.log("VAI SMOKE OK");
