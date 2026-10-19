// Kịch bản Chrome (bằng chứng giao diện) cho hai lỗi kiểm toán 24/9 vá trên nhánh va-3-loi-kiem-toan:
//   DK-T3-02 (web/staff.ts): nút "Đặt lại PIN" KHÔNG hiện ở hàng/thẻ "(bạn)" của quản trị đang đăng nhập, VẪN hiện ở người khác.
//   DK-T4-02 (web/account.ts myAssignmentCard): HDV chạm lý do huỷ → hỏi lại bằng confirm(); vùng huỷ là khối riêng .myjob-cancel có nút "Thôi".
//   → Từ Task 1.8 ADR-0030 (2026-09-27) phần giao diện DK-T4-02 kiểm ở ../../2026-09-27-tu-choi-huy-hdv/kich-ban/hdv-viec-cua-toi-smoke.mjs (xem ghi chú cuối tệp).
// Dùng lại NGUYÊN cơ chế CDP của A2 (startEnv()/ACCOUNTS/ok/vnDate từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs), mẫu step() ✓/✗ của
// ../../2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs (không dừng ở bước hỏng đầu tiên) và cách gieo tài khoản HDV của v1-nguoi-phu-trach.mjs.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-26-va-3-loi-kiem-toan/kich-ban/va3-smoke.mjs
// Không có AXE_JS → bỏ bước axe và in rõ "chưa chạy axe". Ghi ảnh vào $OUT/anh/*.png (mặc định thư mục bằng chứng này).
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-26-va-3-loi-kiem-toan";
const AXE = process.env.AXE_JS && existsSync(process.env.AXE_JS) ? readFileSync(process.env.AXE_JS, "utf8") : null;
mkdirSync(join(OUT, "anh"), { recursive: true });

const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };

// Tài khoản HDV nội bộ (quyền FIELD) dùng riêng cho kịch bản này — a2-cdp.mjs không có; số 0900000201–207 đã có kịch bản khác dùng.
const HDV = { name: "Hướng Dẫn Huỷ Thử", phone: "0900000261", pin: "246861", permissions: ["FIELD"] };
const CUSTOMER = "Khách Huỷ Thử";

let passed = 0;
let failures = 0;
async function step(id, name, fn) {
  try {
    await fn();
    ok(`${id}) ${name}`);
    passed++;
  } catch (e) {
    failures++;
    const msg = String(e?.message ?? e).split("\n").slice(0, 10).join("\n    ");
    console.log(`✗ ${id}) ${name}\n    ${msg}`);
  }
}

/** axe-core: 0 vi phạm mức critical/serious (cùng ngưỡng dot-a-smoke.mjs / dot-c-smoke.mjs). */
const axe = async (p, label) => {
  if (!AXE) return;
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help })))`);
  const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
  assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
};
const axeNote = () => (AXE ? ", axe không vi phạm critical/serious" : " (chưa chạy axe: thiếu AXE_JS)");

/** Chụp khung nhìn sau khi cuộn phần tử `selector` vào giữa màn hình. */
const shotAt = async (p, selector, name) => {
  await p.ev(`(() => { const el = ${selector}; if (el) el.scrollIntoView({ block: "center" }); return true; })()`);
  await sleep(150);
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, "anh", name), Buffer.from(r.result.data, "base64"));
};

const env = await startEnv();
const pages = [];
try {
  // Đăng nhập có thử lại khi ECONNRESET: sau vài lệnh `wrangler d1 execute` (mỗi lệnh vài giây) kết nối giữ-sống của fetch Node từ vòng chờ
  // máy chủ đã bị máy chủ đóng; lần gửi đầu tiên dùng lại kết nối chết đó → ECONNRESET, máy chủ KHÔNG nhận yêu cầu (không có dòng log).
  // Đã gặp thật 3/3 lần khi chạy trên cây mã cũ ở /tmp (kiểm P16); chỉ thử lại lời gọi đăng nhập (không đổi dữ liệu), không thử lại POST khác.
  const login = async (account) => {
    for (let i = 0; ; i++) {
      try {
        return await env.login(account);
      } catch (e) {
        if (i >= 2 || e?.cause?.code !== "ECONNRESET") throw e;
        await sleep(200);
      }
    }
  };
  const call = async (account, method, path, body) => {
    const c = await login(account);
    const r = await fetch(env.base + path, {
      method,
      headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };

  /**
   * Mở `path` đã đăng nhập bằng `account`, với window.confirm bị THAY TỪ TRƯỚC khi mã trang chạy (Page.addScriptToEvaluateOnNewDocument):
   * hộp confirm gốc của Chrome headless làm treo Runtime.evaluate (ev() không có hạn giờ). Hàm thay ghi mọi lời gọi vào window.__confirmCalls
   * và trả `window.__answer === true` (mặc định false = bấm "Huỷ" ở hộp). Không dùng env.as() vì nó điều hướng ngay, chưa kịp chèn.
   */
  const openAs = async (account, path, viewport) => {
    const p = await env.openPage(viewport);
    pages.push(p);
    await p.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "window.__confirmCalls = []; window.__answer = false; window.confirm = (m) => { window.__confirmCalls.push(String(m)); return window.__answer === true; };",
    });
    const c = await login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
    return p;
  };

  // ---- Dữ liệu (API thật + SQL trên D1 tạm; KHÔNG dùng để kiểm giao diện) ----
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const stmt of (await insertStaffSql(HDV)).split("\n")) env.sql(stmt);
  const hdvStaffId = env.sql(`SELECT id FROM staff WHERE phone = '${HDV.phone}'`)[0].id;
  // Dịch vụ danh mục CHỈ người lớn (perPax) → HDV sửa được số khách → khối dịch vụ CÓ nút "Lưu số khách mới" (dịch vụ nhập tay thì không có,
  // bước d sẽ đạt mà không kiểm gì). Mẫu ZLD1 của v1-nguoi-phu-trach.mjs bước o.
  env.sql(
    "INSERT OR IGNORE INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES ('ZVA3','Tour thử huỷ đơn HDV','perPax',300000,NULL,NULL,NULL,NULL,NULL,NULL,98,1,'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z')",
  );
  const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }; // bước 6 dùng lại
  const created = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: CUSTOMER, customerPhone: "0903 222 333", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "ZVA3", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 300000 }, ...NO_TRIP, departDate: vnDate(3), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá" }],
  });
  assert.equal(created.status, 201, `dựng đơn danh mục: ${created.status} ${JSON.stringify(created.json)}`);
  const order = created.json.order;
  const confirmed = await call(ACCOUNTS.salesA, "POST", `/api/orders/${order.id}/status`, { status: "confirmed" });
  assert.equal(confirmed.status, 200, `xác nhận đơn: ${JSON.stringify(confirmed.json)}`);
  const assigned = await call(ACCOUNTS.salesA, "PUT", `/api/orders/${order.id}/handler`, { staffId: hdvStaffId });
  assert.equal(assigned.status, 200, `giao HDV phụ trách: ${JSON.stringify(assigned.json)}`);
  const statusOf = async () => (await call(ACCOUNTS.salesA, "GET", `/api/orders/${order.id}`)).json.order.status;
  assert.equal(await statusOf(), "confirmed");
  console.log(`  (dữ liệu: đơn ${order.orderCode} "${CUSTOMER}", ngày đi ${vnDate(3)}, đã xác nhận, HDV ${HDV.name} phụ trách)`);

  // ==================================================================================================
  // DK-T3-02 — /staff bằng tài khoản QUẢN TRỊ (mở TRƯỚC: kho cookie chung, trang của HDV mở sau cùng)
  // ==================================================================================================
  /** Nút của hàng/thẻ đang HIỆN THẬT chứa `who` (tên hiển thị). `scope` = 'row' (bảng máy tính) hoặc 'card' (thẻ điện thoại). */
  const staffButtons = (p, scope) =>
    p.ev(`(() => {
      const shown = (el) => el !== null && el.offsetParent !== null;
      const items = ${scope === "row" ? "[...document.querySelectorAll('#list tr')]" : "[...document.querySelectorAll('#list-cards .card')]"};
      const pick = (pred) => items.find(pred) ?? null;
      const me = pick((el) => el.textContent.includes('(bạn)'));
      const sales = pick((el) => el.textContent.includes(${JSON.stringify(ACCOUNTS.salesA.name)}));
      const acc = pick((el) => el.textContent.includes(${JSON.stringify(ACCOUNTS.accounting.name)}) && el.textContent.includes(${JSON.stringify(ACCOUNTS.accounting.phone)}));
      const labels = (el) => (el ? [...el.querySelectorAll('button')].map((b) => b.textContent.trim()) : null);
      return {
        tableShown: shown(document.querySelector('table.items')),
        cardsShown: shown(document.querySelector('#list-cards')),
        meShown: shown(me),
        meName: me ? me.textContent.includes(${JSON.stringify(ACCOUNTS.admin.name)}) : false,
        meButtons: labels(me),
        salesShown: shown(sales),
        salesButtons: labels(sales),
        accShown: shown(acc),
        accButtons: labels(acc),
      };
    })()`);

  await step("1", "Quản lý tài khoản (máy tính 1040): hàng “(bạn)” của quản trị KHÔNG có “Đặt lại PIN” (vẫn có “Sửa”), hàng Bán hàng “Sales Một” VẪN có" + axeNote(), async () => {
    const p = await openAs(ACCOUNTS.admin, "/staff", DESK);
    await p.waitFor("document.querySelectorAll('#list tr').length >= 2", "bảng tài khoản đã dựng");
    const m = await staffButtons(p, "row");
    assert.equal(m.tableShown, true, `bảng phải HIỆN ở máy tính — ${JSON.stringify(m)}`);
    assert.equal(m.meShown && m.meName, true, `hàng “(bạn)” phải là của ${ACCOUNTS.admin.name} và đang hiện — ${JSON.stringify(m)}`);
    assert.ok(m.meButtons.includes("Sửa"), `hàng “(bạn)” phải có “Sửa” (chứng minh hàng đã dựng đủ) — ${JSON.stringify(m.meButtons)}`);
    assert.ok(!m.meButtons.includes("Đặt lại PIN"), `hàng “(bạn)” KHÔNG được có “Đặt lại PIN” — ${JSON.stringify(m.meButtons)}`);
    assert.equal(m.salesShown, true, `hàng Sales Một phải hiện — ${JSON.stringify(m)}`);
    assert.ok(m.salesButtons.includes("Đặt lại PIN"), `hàng Sales Một VẪN phải có “Đặt lại PIN” — ${JSON.stringify(m.salesButtons)}`);
    // ADR-0090 đ2: tài khoản có quyền tiền — Quản trị KHÔNG thấy “Đặt lại PIN” (cờ máy chủ theo dòng), vẫn có “Sửa” (đ3: đổi tên, ngưng).
    assert.equal(m.accShown, true, `hàng Kế Toán phải hiện — ${JSON.stringify(m)}`);
    assert.ok(m.accButtons.includes("Sửa"), `hàng Kế Toán vẫn có “Sửa” — ${JSON.stringify(m.accButtons)}`);
    assert.ok(!m.accButtons.includes("Đặt lại PIN"), `hàng Kế Toán KHÔNG được có “Đặt lại PIN” (ADR-0090) — ${JSON.stringify(m.accButtons)}`);
    await shotAt(p, "[...document.querySelectorAll('#list tr')].find((el) => el.textContent.includes('(bạn)'))", "nhan-vien-ban-may-tinh.png");
    await axe(p, "Quản lý tài khoản máy tính");
    assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
    console.log(`    hàng “(bạn)”: ${JSON.stringify(m.meButtons)} · hàng Sales Một: ${JSON.stringify(m.salesButtons)}`);
    p.close();
  });

  await step("2", "Quản lý tài khoản (điện thoại 390): thẻ “(bạn)” của quản trị KHÔNG có “Đặt lại PIN” (vẫn có “Sửa”), thẻ Bán hàng “Sales Một” VẪN có" + axeNote(), async () => {
    const p = await openAs(ACCOUNTS.admin, "/staff", MOB);
    await p.waitFor("document.querySelectorAll('#list-cards .card').length >= 2", "thẻ tài khoản đã dựng");
    const m = await staffButtons(p, "card");
    assert.equal(m.cardsShown, true, `danh sách thẻ phải HIỆN ở điện thoại — ${JSON.stringify(m)}`);
    assert.equal(m.tableShown, false, `bảng phải ẨN ở điện thoại — ${JSON.stringify(m)}`);
    assert.equal(m.meShown && m.meName, true, `thẻ “(bạn)” phải là của ${ACCOUNTS.admin.name} và đang hiện — ${JSON.stringify(m)}`);
    assert.ok(m.meButtons.includes("Sửa"), `thẻ “(bạn)” phải có “Sửa” — ${JSON.stringify(m.meButtons)}`);
    assert.ok(!m.meButtons.includes("Đặt lại PIN"), `thẻ “(bạn)” KHÔNG được có “Đặt lại PIN” — ${JSON.stringify(m.meButtons)}`);
    assert.equal(m.salesShown, true, `thẻ Sales Một phải hiện — ${JSON.stringify(m)}`);
    assert.ok(m.salesButtons.includes("Đặt lại PIN"), `thẻ Sales Một VẪN phải có “Đặt lại PIN” — ${JSON.stringify(m.salesButtons)}`);
    assert.equal(m.accShown, true, `thẻ Kế Toán phải hiện — ${JSON.stringify(m)}`);
    assert.ok(m.accButtons.includes("Sửa") && !m.accButtons.includes("Đặt lại PIN"), `thẻ Kế Toán: có “Sửa”, KHÔNG “Đặt lại PIN” (ADR-0090) — ${JSON.stringify(m.accButtons)}`);
    await shotAt(p, "[...document.querySelectorAll('#list-cards .card')].find((el) => el.textContent.includes('(bạn)'))", "nhan-vien-ban-dien-thoai.png");
    await axe(p, "Quản lý tài khoản điện thoại");
    assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
    console.log(`    thẻ “(bạn)”: ${JSON.stringify(m.meButtons)} · thẻ Sales Một: ${JSON.stringify(m.salesButtons)}`);
    p.close();
  });

  // ==================================================================================================
  // DK-T4-02 — phần GIAO DIỆN (bước 3–6 cũ: vùng .myjob-cancel + confirm(), dòng "nhờ văn phòng") ĐÃ THAY từ Task 1.8 ADR-0030 (2026-09-27): "Việc của tôi"
  // dựng lại theo bản thiết kế của chủ dự án (web/viec-cua-toi.ts) — huỷ đi qua bảng "Huỷ đơn" hỏi lại (chọn lý do rồi mới bấm được "Huỷ đơn", "Giữ đơn"
  // đóng không gửi), đơn đã đi tour không có nút "Huỷ đơn" (chip "Đã đi tour"; bản thiết kế không có dòng "nhờ văn phòng"). Kiểm ở
  // docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/hdv-viec-cua-toi-smoke.mjs bước 1 (đã đi tour: chỉ "Sửa số khách") và bước 8 (bảng huỷ).
  // Phần máy chủ DK-T4-02 (409 departed) vẫn canh ở tests/e2e/dispatch.mjs mục 13b. Dữ liệu đơn/HDV ở trên giữ nguyên (vô hại) để không đụng bước 1–2.
  void order;
  void statusOf;
  void hdvStaffId;
} finally {
  for (const p of pages) try { p.close(); } catch { /* đã đóng */ }
  await env.stop();
}
console.log(`${passed} bước ✓, ${failures} bước ✗${AXE ? "" : " — CHƯA CHẠY AXE (thiếu AXE_JS)"}`);
if (failures) {
  console.log("VA3 SMOKE HỎNG");
  process.exit(1);
}
console.log("VA3 SMOKE OK");
