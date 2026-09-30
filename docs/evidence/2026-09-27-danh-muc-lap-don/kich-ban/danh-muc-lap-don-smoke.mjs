// Kịch bản Chrome (bằng chứng giao diện) cho ADR-0033 (chủ dự án 2026-09-27): form lập đơn đọc danh mục qua GET /api/catalog/for-order
// (route cho người lập đơn, cổng orders + can(order.create)); GET /api/catalog về cổng office. Mang sang từ ca A0 của
// docs/evidence/2026-09-25-gd2/kich-ban/gd2-smoke.mjs (nhánh chưa gộp a0-danh-muc-cho-lap-don), viết lại cho form hiện tại (bản 1.11+: một ngày cho
// cả đơn — ô #orderDate; chọn dịch vụ rồi đặt số khách như docs/evidence/2026-09-26-mo-danh-muc-doi-tac/kich-ban/doi-tac-lap-don-smoke.mjs).
// Dùng lại cơ chế CDP của A2 (startEnv()/ACCOUNTS/ok/setInput/sleep/vnDate từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs); startEnv() đã chèn 3 dịch vụ
// giả (TD101/TTB03/TTB06, đánh dấu "đã đồng bộ") nên không phụ thuộc Google Sheet. Tài khoản Đối tác / Thực tập tạo bằng ADMIN gọi POST /api/staff
// theo vai (Cộng tác viên → PARTNER, Thực tập sinh → INTERN), như tests/e2e/catalog.mjs.
// Mỗi tài khoản (Đối tác, Thực tập) ở 390×844: mở /order-form → danh sách dịch vụ hiện, KHÔNG có "Không tải được danh mục dịch vụ", không cuộn
// ngang; chọn TD101, 2 người lớn → ô đơn giá = giá /api/catalog/for-order trả; điền khách + ngày, "Lưu" → chuyển /order?id= và đơn (API) đúng giá.
// Bán hàng: form như cũ (danh sách hiện). Kế toán mở thẳng /order-form: banner "không được lập đơn", form KHÔNG gọi danh mục.
// Các trang dùng CHUNG kho cookie: mỗi trang đóng xong mới mở trang kế.
// Chạy từ GỐC repo (worktree), sau `npm run build:web` (không cần mạng ngoài — startEnv() mặc định tắt Turnstile/Face ID):
//   node docs/evidence/2026-09-27-danh-muc-lap-don/kich-ban/danh-muc-lap-don-smoke.mjs
// Ghi ảnh vào $OUT/anh/*.png (mặc định docs/evidence/2026-09-27-danh-muc-lap-don/anh).
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = join(process.env.OUT ?? "docs/evidence/2026-09-27-danh-muc-lap-don", "anh");
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const CATALOG_ERR = "Không tải được danh mục dịch vụ";
const PAX = 2;
// CHỈ khung nhìn (không captureBeyondViewport): vùng dính "Tổng cộng/Lưu" ở cuối trang sẽ bị ghép chồng lên danh sách nếu chụp quá khung.
const shot = async (p, name) => writeFileSync(join(OUT, name), Buffer.from((await p.send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
const digits = (s) => Number(String(s ?? "").replace(/\D/g, ""));

let passed = 0;
let failures = 0;
async function step(id, name, fn) {
  try {
    await fn();
    ok(`${id}) ${name}`);
    passed++;
  } catch (e) {
    failures++;
    console.log(`✗ ${id}) ${name}\n    ${String(e?.message ?? e).split("\n").slice(0, 14).join("\n    ")}`);
  }
}

const env = await startEnv();
const notes = [];
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, {
      method,
      headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const randomPhone = () => "09" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  async function makeStaff(name, roles) {
    const r = await call(ACCOUNTS.admin, "POST", "/api/staff", { fullName: name, phone: randomPhone(), roles });
    assert.equal(r.status, 201, `tạo tài khoản "${name}" (${roles.join(",")}): ${r.status} ${JSON.stringify(r.json)}`);
    console.log(`  (dữ liệu: ${name} tạo qua POST /api/staff roles=${JSON.stringify(roles)} → quyền ${JSON.stringify(r.json.staff.permissions)})`);
    return { name, phone: r.json.staff.phone, pin: r.json.pin };
  }

  const CARD = "[...document.querySelectorAll('#services .svc')].find((c) => c.querySelector('.svc-name')?.textContent === 'Tour 4 đảo Nha Trang')";
  const ADULT = `(${CARD}).querySelector('.counter-field[aria-label="Người lớn"]')`;
  const ADULT_PRICE = `(${CARD}).querySelector('.price-field[aria-label="Đơn giá người lớn"]')`;

  /** Mở form, kiểm danh mục nạp được (không lỗi, ≥ 1 mục, không cuộn ngang). Trả trang đang mở. */
  async function openForm(account, label) {
    const p = await env.as(account, "/order-form", MOB);
    await p.waitFor("document.getElementById('catalog-q') !== null", `ô tìm danh mục hiện (${label})`);
    await p.ev("document.getElementById('catalog-q').focus(); true"); // danh sách #catalog-list ẩn tới khi ô tìm nhận focus
    try {
      await p.waitFor("!document.getElementById('catalog-list').hidden && document.querySelectorAll('#catalog-list .catalog-pick').length >= 1", `danh sách dịch vụ có ≥ 1 mục (${label})`, 8000);
    } catch (e) {
      const text = (await p.ev("document.body.textContent")).replace(/\s+/g, " ");
      const reqs = p.requests.filter((r) => r.url.includes("/api/catalog")).map((r) => r.url.replace(env.base, ""));
      p.close();
      throw new Error(`${e.message}\ncó chữ "${CATALOG_ERR}": ${text.includes(CATALOG_ERR)}\nyêu cầu danh mục của trang: ${JSON.stringify(reqs)}`);
    }
    const text = await p.ev("document.body.textContent");
    assert.ok(!text.includes(CATALOG_ERR), `${label}: KHÔNG được có chữ "${CATALOG_ERR}"`);
    const count = await p.ev("document.querySelectorAll('#catalog-list .catalog-pick').length");
    const overflow = await p.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
    assert.ok(overflow <= 1, `${label}: không cuộn ngang ở 390px — lệch ${overflow}px`);
    const reqs = p.requests.filter((r) => r.url.includes("/api/catalog")).map((r) => r.url.replace(env.base, ""));
    assert.ok(reqs.includes("/api/catalog/for-order"), `${label}: form phải gọi /api/catalog/for-order — thấy ${JSON.stringify(reqs)}`);
    assert.ok(!reqs.includes("/api/catalog"), `${label}: form KHÔNG còn gọi /api/catalog — thấy ${JSON.stringify(reqs)}`);
    console.log(`    ${label}: danh sách ${count} mục; yêu cầu danh mục của trang: ${JSON.stringify(reqs)}`);
    return p;
  }

  /** Chọn TD101, đặt 2 người lớn; so ô đơn giá với giá route mới trả cho CHÍNH tài khoản này; điền khách + ngày; Lưu → /order?id=. */
  async function pickAndSave(p, account, label, prefix) {
    const api = await p.ev("(async () => { const r = await fetch('/api/catalog/for-order'); return { status: r.status, body: await r.json() }; })()");
    assert.equal(api.status, 200, `${label}: /api/catalog/for-order trong trang → ${api.status}`);
    assert.equal(api.body.sync.error, null, `${label}: không phải văn phòng nên sync.error = null`);
    const item = api.body.items.find((i) => i.code === "TD101");
    assert.ok(item && item.prices.adult !== null, `${label}: TD101 có trong danh mục, có giá người lớn`);
    const old = await p.ev("(async () => (await fetch('/api/catalog')).status)()");
    notes.push(`${label}: fetch('/api/catalog') trong trang → ${old} (cổng office, ADR-0033)`);
    assert.equal(old, 403, `${label}: GET /api/catalog phải 403 (cổng office)`);

    await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", `lọc còn TD101 (${label})`);
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor(`!!(${CARD})`, `thẻ Tour 4 đảo Nha Trang (${label})`);
    await p.ev(setInput(ADULT, String(PAX)));
    await p.waitFor(`!(${ADULT_PRICE}).closest('.line').hidden`, `dòng tiền người lớn hiện (${label})`);
    await sleep(150);
    const priceRaw = await p.ev(`(${ADULT_PRICE}).value`);
    assert.equal(digits(priceRaw), item.prices.adult, `${label}: ô đơn giá (${priceRaw}) = giá /api/catalog/for-order (${item.prices.adult})`);
    const overflow = await p.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
    assert.ok(overflow <= 1, `${label}: không cuộn ngang sau khi chọn dịch vụ — lệch ${overflow}px`);
    assert.deepEqual(p.consoleErrors, [], `${label}: lỗi console ở form: ${p.consoleErrors}`);
    await shot(p, `${prefix}-390-chon-dich-vu.png`);

    await p.ev(setInput("document.getElementById('customerName')", `Khách ${label}`));
    await p.ev(setInput("document.getElementById('customerPhone')", "0901 222 333"));
    await p.ev(setInput("document.getElementById('orderDate')", vnDate(3)));
    await sleep(200);
    await p.ev("document.getElementById('save').click(); true");
    try {
      await p.waitFor("location.pathname === '/order' && !!new URLSearchParams(location.search).get('id')", `chuyển tới /order?id= sau khi lưu (${label})`, 15000);
    } catch (e) {
      const err = await p.ev("(document.getElementById('save-error')?.hidden ? '' : document.getElementById('save-error')?.textContent) ?? ''").catch(() => "?");
      throw new Error(`${e.message}\n#save-error: ${err}`);
    }
    const orderId = await p.ev("new URLSearchParams(location.search).get('id')");
    await p.waitFor("document.readyState === 'complete'", `trang đơn tải xong (${label})`);
    await sleep(800);
    const r = await call(account, "GET", `/api/orders/${orderId}`);
    assert.equal(r.status, 200, `${label} đọc lại đơn của mình: ${r.status}`);
    const lines = r.json.order.services.flatMap((s) => s.items).map((i) => [i.paxCode, i.quantity, i.unitPrice, i.catalogPrice]);
    assert.deepEqual(lines, [["adult", PAX, item.prices.adult, item.prices.adult]], `${label}: dòng tiền của đơn đã lưu — ${JSON.stringify(lines)}`);
    const orderText = (await p.ev("document.body.textContent")).replace(/\s+/g, " ");
    if (p.consoleErrors.length || /Chưa tải được/.test(orderText)) notes.push(`${label}: trang /order sau khi lưu — lỗi console ${JSON.stringify(p.consoleErrors)}; có "Chưa tải được…": ${/Chưa tải được/.test(orderText)} (có sẵn, ngoài phạm vi: /api/dispatch/handlers 403 với tài khoản chỉ thấy đơn của mình)`);
    await shot(p, `${prefix}-390-da-luu.png`);
    console.log(`    ${label}: đơn ${r.json.order.orderCode} dòng ${JSON.stringify(lines)} tổng ${r.json.order.total}`);
    p.close();
  }

  const partner = await makeStaff("Đối Tác Danh Mục", ["COLLABORATOR"]);
  const intern = await makeStaff("Thực Tập Danh Mục", ["INTERN"]);

  // Bán hàng TRƯỚC (đóng xong mới tới tài khoản kế — kho cookie chung).
  await step("1", "Bán hàng (390): /order-form nạp danh mục như cũ qua /api/catalog/for-order, không lỗi", async () => {
    const p = await openForm(ACCOUNTS.salesA, "Bán hàng");
    await shot(p, "ban-hang-390.png");
    p.close();
  });
  for (const [acc, label, prefix, n] of [[partner, "Đối tác", "doi-tac", "2"], [intern, "Thực tập", "thuc-tap", "3"]]) {
    await step(`${n}a`, `${label} (390): /order-form hiện danh sách dịch vụ, KHÔNG có "${CATALOG_ERR}", không cuộn ngang, form gọi /api/catalog/for-order`, async () => {
      const p = await openForm(acc, label);
      await shot(p, `${prefix}-390-danh-sach.png`);
      p.close();
    });
    await step(`${n}b`, `${label} (390): chọn TD101, ${PAX} người lớn → ô đơn giá đúng giá route mới trả; lưu → /order?id=, đơn đúng giá; /api/catalog 403`, async () => {
      const p = await openForm(acc, label);
      await pickAndSave(p, acc, label, prefix);
    });
  }
  // Kế toán (không có order.create) mở thẳng /order-form: form khoá bằng banner như cũ; KHÔNG gọi danh mục (route mới trả 403 cho Kế toán —
  // gọi thì hiện thêm "Không tải được danh mục dịch vụ — tải lại trang để thử lại", một lời khuyên sai vì tải lại không giúp gì).
  await step("4", `Kế toán (390): /order-form khoá bằng banner "Tài khoản này không được lập đơn.", KHÔNG gọi danh mục, KHÔNG có "${CATALOG_ERR}"`, async () => {
    const p = await env.as(ACCOUNTS.accounting, "/order-form", MOB);
    try {
      await p.waitFor("document.body.textContent.includes('Tài khoản này không được lập đơn.')", "banner không được lập đơn (Kế toán)", 8000);
      await sleep(300);
      const text = await p.ev("document.body.textContent");
      const reqs = p.requests.filter((r) => r.url.includes("/api/catalog")).map((r) => r.url.replace(env.base, ""));
      assert.ok(!text.includes(CATALOG_ERR), `Kế toán: KHÔNG được có "${CATALOG_ERR}" — yêu cầu danh mục: ${JSON.stringify(reqs)}`);
      assert.deepEqual(reqs, [], `Kế toán: form không gọi route danh mục nào — thấy ${JSON.stringify(reqs)}`);
      await shot(p, "ke-toan-390.png");
    } finally {
      p.close();
    }
  });
} finally {
  await env.stop();
}
if (notes.length) console.log(`Ghi nhận (không làm hỏng bước nào):\n  - ${notes.join("\n  - ")}`);
console.log(`${passed} bước ✓, ${failures} bước ✗`);
if (failures) {
  console.log("DANH MỤC LẬP ĐƠN SMOKE HỎNG");
  process.exit(1);
}
console.log("DANH MỤC LẬP ĐƠN SMOKE OK");
