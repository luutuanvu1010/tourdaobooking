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
// ADR-0068 Đ9 (C1): form Thêm tài khoản tra hồ sơ khớp sau 300 ms ngừng gõ; có hồ sơ khớp thì nút Tạo tắt tới khi chọn hồ sơ hoặc tick "Vẫn tạo hồ sơ mới".
// requestSubmit() bỏ qua nút tắt → máy chủ trả 409 → kịch bản treo. Nên: chờ lần tra xong, có khối thì tick ô (tên/số ở đây là người MỚI), rồi mới gửi.
const guiThem = async (p) => {
  await new Promise((r) => setTimeout(r, 900));
  await p.ev("(() => { const k = document.querySelector('#add-khop'); const c = k && !k.hidden ? k.querySelector('label.check input') : null; if (c && !c.checked) c.click(); return true; })()");
  await p.ev("document.querySelector('#add-form').requestSubmit(), true");
};
const preview = (scope) => `document.querySelector(${JSON.stringify(`${scope} [data-role-preview]`)}).textContent`;

const env = await startEnv();
try {
  const axe = async (p, label) => {
    if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
    const v = await p.ev(`axe.run(document).then((r) => r.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious').map((x) => x.id))`);
    assert.deepEqual(v, [], `axe (${label}): ${JSON.stringify(v)}`);
  };

  // ---- A. Form thêm (máy tính): Quản trị thấy 10 ô vai — 13 vai trừ 3 vai chỉ Toàn quyền gán (Giám đốc, Điều hành chung, IT) bị ẨN hẳn từ ADR-0042
  // (trước đây là "tắt"; kịch bản cũ khoá 11 ô + ".disabled" đã đỏ sẵn từ ADR-0042 — đo ở Task A0 Vận chuyển 1a: 9 ô); ADR-0040 D3 thêm "Tài xế công ty"
  // (nhóm Nội bộ). Chọn Kế toán → nhóm Bên ngoài tắt, xem trước "Kế toán".
  let p = await env.as(ACCOUNTS.admin, "/staff", DESK);
  await p.waitFor(`!!${box("#add-perms", "role", "ACCOUNTANT")}`, "khối chọn vai đã dựng");
  assert.equal(await p.ev(`document.querySelectorAll('#add-perms input[data-kind=role]').length`), 11); // ADR-0048 D2: + "Tài xế đối tác" (nhóm Bên ngoài) — 14 vai trừ 3 vai chỉ Toàn quyền gán
  assert.equal(await p.ev(`${box("#add-perms", "role", "DIRECTOR")} === null && ${box("#add-perms", "role", "OPERATIONS_MANAGER")} === null && ${box("#add-perms", "role", "IT")} === null`), true, "LC-4 + ADR-0042: Quản trị không thấy vai chỉ Toàn quyền gán");
  // ADR-0040 D3 (Ruling R12): ô "Tài xế công ty" ở nhóm Nội bộ; chọn thử → xem trước "Quyền sẽ có: Tài xế." rồi bỏ chọn (không ảnh hưởng các bước sau).
  assert.equal(await p.ev(`${box("#add-perms", "role", "DRIVER_INTERNAL")}.closest('label').textContent.trim()`), "Tài xế công ty");
  assert.equal(await p.ev(`${box("#add-perms", "role", "DRIVER_INTERNAL")}.closest('label').parentElement.querySelector('strong').textContent.trim()`), "Nội bộ", "vai Tài xế công ty nằm ở nhóm Nội bộ");
  await p.ev(`(${box("#add-perms", "role", "DRIVER_INTERNAL")}).click(), true`);
  assert.match(await p.ev(preview("#add-perms")), /Quyền sẽ có: Tài xế\./);
  await p.ev(`(${box("#add-perms", "role", "DRIVER_INTERNAL")}).click(), true`);
  ok("ADR-0040 D3: màn Quản lý tài khoản có ô 'Tài xế công ty' ở nhóm Nội bộ; chọn → xem trước 'Tài xế'");
  await p.ev(`(${box("#add-perms", "role", "ACCOUNTANT")}).click(), true`);
  assert.equal(await p.ev(`${box("#add-perms", "role", "COLLABORATOR")}.disabled`), true, "LC-3: chọn vai nội bộ thì tắt nhóm bên ngoài");
  assert.match(await p.ev(preview("#add-perms")), /Quyền sẽ có: Kế toán\./);
  await p.ev(setInput("document.querySelector('#add-name')", NAME));
  await p.ev(setInput("document.querySelector('#add-phone')", "0912345678"));
  await p.shot(join(OUT, "anh", "vai-them-may-tinh.png"));
  await guiThem(p);
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

  // ---- B2 (ADR-0048 D2, Task B1 — LC-1b ở giao diện): ô "Tài xế đối tác" ở nhóm Bên ngoài; KHOÁ CHÉO với vai bên ngoài khác (một người chọn một);
  // cộng tay quyền khác cho vai đó bị tắt (tài khoản lai); tạo tài khoản "Tài xế taxi" rồi ĐỔI sang "Tài xế đối tác" → lưu được (tiêu chí 5b). Máy chủ vẫn
  // là nơi quyết (Task A2) — đây chỉ là gương ở giao diện, dùng chung hàm thuần vaiTaiXeDoiTacXungDot / taiKhoanLaiProblem của src/shared/roles.ts.
  const TX_NAME = "Tài Xế Taxi Chrome";
  assert.equal(await p.ev(`${box("#add-perms", "role", "DRIVER_EXTERNAL")}.closest('label').textContent.trim()`), "Tài xế đối tác");
  assert.equal(await p.ev(`${box("#add-perms", "role", "DRIVER_EXTERNAL")}.closest('label').parentElement.querySelector('strong').textContent.trim()`), "Bên ngoài");
  await p.ev(`(${box("#add-perms", "role", "TAXI_DRIVER")}).click(), true`);
  assert.equal(await p.ev(`${box("#add-perms", "role", "DRIVER_EXTERNAL")}.disabled`), true, "B1: chọn 'Tài xế taxi' thì 'Tài xế đối tác' bị tắt");
  assert.equal(await p.ev(`${box("#add-perms", "role", "COLLABORATOR")}.disabled`), false, "hai vai bên ngoài sinh Đối tác vẫn chọn chung được");
  assert.equal(await p.ev(`${box("#add-perms", "add", "DRIVER_PARTNER")}.disabled`), true, "B1: vai sinh Đối tác không cộng tay được Tài xế đối tác (tài khoản lai)");
  await p.ev(`(${box("#add-perms", "role", "TAXI_DRIVER")}).click(), (${box("#add-perms", "role", "DRIVER_EXTERNAL")}).click(), true`);
  for (const r of ["TAXI_DRIVER", "COLLABORATOR", "TRAVEL_AGENCY"]) {
    assert.equal(await p.ev(`${box("#add-perms", "role", r)}.disabled`), true, `B1: chọn 'Tài xế đối tác' thì ${r} bị tắt`);
  }
  assert.equal(await p.ev(`${box("#add-perms", "add", "PARTNER")}.disabled`), true, "B1: 'Tài xế đối tác' không cộng tay được Đối tác (tài khoản lai)");
  assert.match(await p.ev(preview("#add-perms")), /Quyền sẽ có: Tài xế đối tác\./);
  await p.ev(`(${box("#add-perms", "role", "DRIVER_EXTERNAL")}).click(), (${box("#add-perms", "role", "TAXI_DRIVER")}).click(), true`);
  await p.ev(setInput("document.querySelector('#add-name')", TX_NAME));
  await p.ev(setInput("document.querySelector('#add-phone')", "0912345681"));
  await guiThem(p);
  await p.waitFor(`[...document.querySelectorAll('#list tr')].some((tr) => tr.textContent.includes(${JSON.stringify(TX_NAME)}) && tr.textContent.includes('Tài xế taxi'))`, "dòng mới hiện vai Tài xế taxi");
  assert.equal(await p.ev(clickText("#secret", "Đã ghi lại, ẩn đi")), true);
  await p.ev(`[...document.querySelectorAll('#list tr')].find((tr) => tr.textContent.includes(${JSON.stringify(TX_NAME)})).querySelector('button').click(), true`);
  await p.waitFor(`!!${box("#edit", "role", "TAXI_DRIVER")} && ${box("#edit", "role", "TAXI_DRIVER")}.checked`, "hộp sửa mở với vai Tài xế taxi");
  assert.equal(await p.ev(`${box("#edit", "role", "DRIVER_EXTERNAL")}.disabled`), true, "B1 ở hộp sửa: đang giữ 'Tài xế taxi' thì 'Tài xế đối tác' bị tắt");
  await p.ev(`(${box("#edit", "role", "TAXI_DRIVER")}).click(), (${box("#edit", "role", "DRIVER_EXTERNAL")}).click(), true`);
  const txt = await p.ev(preview("#edit"));
  assert.match(txt, /Quyền sẽ có: Tài xế đối tác\./);
  assert.match(txt, /Sẽ mất: Đối tác\./);
  await p.shot(join(OUT, "anh", "vai-tai-xe-doi-tac-may-tinh.png"));
  assert.equal(await p.ev(clickText("#edit", "Lưu")), true);
  await p.waitFor(`[...document.querySelectorAll('#list tr')].some((tr) => tr.textContent.includes(${JSON.stringify(TX_NAME)}) && tr.textContent.includes('Tài xế đối tác'))`, "5b: đổi sang Tài xế đối tác lưu được, danh sách hiện vai mới");
  assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
  ok("ADR-0048 B1: 'Tài xế đối tác' ở nhóm Bên ngoài, khoá chéo với vai bên ngoài khác và cộng tay lai; đổi 'Tài xế taxi' → 'Tài xế đối tác' lưu được (5b)");

  // ---- C. Tạo một Thực tập sinh (dùng ở E), đọc PIN hiện một lần
  await p.ev(`(${box("#add-perms", "role", "INTERN")}).click(), true`);
  await p.ev(setInput("document.querySelector('#add-name')", "Thực Tập Chrome"));
  await p.ev(setInput("document.querySelector('#add-phone')", INTERN_PHONE));
  await guiThem(p);
  await p.waitFor(`!document.querySelector('#secret').hidden && !!document.querySelector('#secret td.pin')`, "hiện PIN tài khoản mới");
  const internPin = await p.ev(`document.querySelector('#secret td.pin').textContent.trim()`);

  // ---- C2 (Ruling R26). Hồ sơ có sẵn đang giữ vai Kế toán (dữ liệu cũ — chèn thẳng vào D1 tạm): bấm "Dùng hồ sơ có sẵn" thì vai Kế toán được
  // chọn sẵn, vai người dùng đã tích (Nhân viên kinh doanh) vẫn giữ; lưu được và danh sách hiện đủ hai vai.
  const KT_NAME = "Kế Toán Có Sẵn Chrome";
  const KT_PHONE = "0912345680";
  const ktParty = await p.ev(`fetch('/api/parties', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'PERSON', fullName: ${JSON.stringify(KT_NAME)}, contacts: [{ kind: 'PHONE', value: ${JSON.stringify(KT_PHONE)} }] }) }).then((r) => r.json()).then((b) => b.party.id)`);
  env.sql(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('chrome-r26', '${ktParty}', 'ACCOUNTANT', NULL, '2026-09-01', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z')`);
  await p.ev(`(${box("#add-perms", "role", "SALES_STAFF")}).click(), true`);
  await p.ev(setInput("document.querySelector('#add-phone')", KT_PHONE));
  // ADR-0068 C1: khối #add-khop liệt kê mọi hồ sơ khớp; bấm "Dùng hồ sơ này" ở đúng dòng của hồ sơ có sẵn.
  await p.waitFor(`[...document.querySelectorAll('#add-khop li')].some((li) => li.textContent.includes(${JSON.stringify(KT_NAME)}))`, "khối hồ sơ khớp có hồ sơ có sẵn");
  assert.equal(await p.ev(`(() => { const li = [...document.querySelectorAll('#add-khop li')].find((x) => x.textContent.includes(${JSON.stringify(KT_NAME)})); const b = [...li.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Dùng hồ sơ này'); if (!b) return false; b.click(); return true; })()`), true, "nút Dùng hồ sơ này");
  await p.waitFor(`${box("#add-perms", "role", "ACCOUNTANT")}.checked`, "R26: vai Kế toán hồ sơ đang giữ được chọn sẵn");
  assert.equal(await p.ev(`${box("#add-perms", "role", "SALES_STAFF")}.checked`), true, "R26: vai người dùng đã tích vẫn giữ");
  assert.match(await p.ev(preview("#add-perms")), /Kế toán/);
  await p.ev("document.querySelector('#add-form').requestSubmit(), true");
  await p.waitFor(`[...document.querySelectorAll('#list tr')].some((tr) => tr.textContent.includes(${JSON.stringify(KT_NAME)}) && tr.textContent.includes('Nhân viên kinh doanh') && tr.textContent.includes('Kế toán'))`, "R26: tài khoản mới mang đủ hai vai");
  assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
  ok("R26: dùng hồ sơ có sẵn chọn sẵn vai hồ sơ đang giữ, giữ vai đã tích, lưu được");
  p.close();

  // ---- D. Điện thoại (quản trị): thẻ hiện vai, axe sạch
  p = await env.as(ACCOUNTS.admin, "/staff", MOB);
  await p.waitFor(`[...document.querySelectorAll('.card-list .card')].some((c) => c.textContent.includes('Cộng tác viên'))`, "thẻ hiện vai");
  await p.shot(join(OUT, "anh", "vai-dien-thoai.png"));
  await axe(p, "Nhân viên điện thoại");
  assert.deepEqual(p.consoleErrors, [], `lỗi console (điện thoại): ${p.consoleErrors}`);
  p.close();
  ok("điện thoại: thẻ hiện vai, axe không vi phạm critical/serious");

  // ---- D2. Hồ sơ (máy tính, quản trị): vai từ mô hình mới hiện "Đổi ở màn Quản lý tài khoản" (không nút Kết thúc), ô thêm vai trò không có
  // mục Nội bộ/Bên ngoài — chỉ gán/gỡ ở trang Nhân viên (R18, web/parties.ts dòng ~248/~250).
  p = await env.as(ACCOUNTS.admin, "/parties", DESK);
  await p.ev(setInput("document.querySelector('#q')", NAME));
  await p.ev("document.querySelector('#search-form').requestSubmit(), true");
  await p.waitFor(`[...document.querySelectorAll('#list tr')].some((tr) => tr.textContent.includes(${JSON.stringify(NAME)}))`, "danh sách hồ sơ hiện Kế Toán Chrome");
  await p.ev(`[...document.querySelectorAll('#list tr')].find((tr) => tr.textContent.includes(${JSON.stringify(NAME)})).click(), true`);
  const roleRow = `[...document.querySelectorAll('#detail table.items tr')].find((tr) => tr.textContent.includes('Cộng tác viên'))`;
  await p.waitFor(`!document.querySelector('#detail').hidden && !!${roleRow}`, "hồ sơ mở, dòng vai Cộng tác viên hiện");
  assert.equal(await p.ev(`${roleRow}.textContent.includes('Đổi ở màn Quản lý tài khoản')`), true, "R18: vai từ mô hình mới hiện 'Đổi ở màn Quản lý tài khoản'");
  assert.equal(await p.ev(`${roleRow}.querySelector('button') === null`), true, "R18: vai từ mô hình mới không có nút Kết thúc");
  const addRoleOptions = `[...document.querySelectorAll('#detail h3')].find((h) => h.textContent.trim() === 'Công việc tại đâu').nextElementSibling.nextElementSibling.querySelector('select').querySelectorAll('option')`;
  const options = await p.ev(`[...${addRoleOptions}].map((o) => o.textContent.trim())`);
  assert.ok(options.includes("Khách hàng"), `ô thêm vai trò thiếu mục nhóm khác (vd Khách hàng): ${JSON.stringify(options)}`);
  const ACCOUNT_ROLE_NAMES = ["Giám đốc", "Điều hành chung", "Hướng dẫn viên nội bộ", "Nhân viên kinh doanh", "Thực tập sinh", "Kế toán", "Tài xế công ty", "Công ty lữ hành", "Hướng dẫn viên độc lập", "Lễ tân khách sạn", "Tài xế taxi", "Cộng tác viên", "Tài xế đối tác"];
  assert.deepEqual(options.filter((o) => ACCOUNT_ROLE_NAMES.includes(o)), [], `R18: ô thêm vai trò không được có mục Nội bộ/Bên ngoài, thấy: ${JSON.stringify(options)}`);
  // T2b (ADR-0024 6.5; chủ 2026-09-28): "Công ty chủ" không phải vai gán thường — chỉ người giữ ô company.legal.write thấy, trên hồ sơ tổ chức (t2b-danh-ba-smoke.mjs).
  assert.ok(!options.includes("Công ty chủ"), `ô thêm vai trò của Quản trị không được có "Công ty chủ", thấy: ${JSON.stringify(options)}`);
  await p.shot(join(OUT, "anh", "vai-ho-so-may-tinh.png"));
  assert.deepEqual(p.consoleErrors, [], `lỗi console (hồ sơ): ${p.consoleErrors}`);
  p.close();
  ok("hồ sơ: vai mô hình mới hiện 'Đổi ở màn Quản lý tài khoản' (không nút Kết thúc), ô thêm vai trò không có Nội bộ/Bên ngoài (R18)");

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
