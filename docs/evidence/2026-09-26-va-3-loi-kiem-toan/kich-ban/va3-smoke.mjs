// Kịch bản Chrome (bằng chứng giao diện) cho hai lỗi kiểm toán 24/9 vá trên nhánh va-3-loi-kiem-toan:
//   DK-T3-02 (web/staff.ts): nút "Đặt lại PIN" KHÔNG hiện ở hàng/thẻ "(bạn)" của quản trị đang đăng nhập, VẪN hiện ở người khác.
//   DK-T4-02 (web/account.ts myAssignmentCard): HDV chạm lý do huỷ → hỏi lại bằng confirm(); vùng huỷ là khối riêng .myjob-cancel có nút "Thôi".
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
    services: [{ kind: "catalog", catalogCode: "ZVA3", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 300000 }, ...NO_TRIP, departDate: vnDate(3), departTime: "07:30", pickupTime: "07:00", pickupPlace: "Bến Cầu Đá" }],
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
      const labels = (el) => (el ? [...el.querySelectorAll('button')].map((b) => b.textContent.trim()) : null);
      return {
        tableShown: shown(document.querySelector('table.items')),
        cardsShown: shown(document.querySelector('#list-cards')),
        meShown: shown(me),
        meName: me ? me.textContent.includes(${JSON.stringify(ACCOUNTS.admin.name)}) : false,
        meButtons: labels(me),
        salesShown: shown(sales),
        salesButtons: labels(sales),
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
    await shotAt(p, "[...document.querySelectorAll('#list-cards .card')].find((el) => el.textContent.includes('(bạn)'))", "nhan-vien-ban-dien-thoai.png");
    await axe(p, "Quản lý tài khoản điện thoại");
    assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
    console.log(`    thẻ “(bạn)”: ${JSON.stringify(m.meButtons)} · thẻ Sales Một: ${JSON.stringify(m.salesButtons)}`);
    p.close();
  });

  // ==================================================================================================
  // DK-T4-02 — /account "Việc của tôi" bằng tài khoản HDV (FIELD) — mở SAU CÙNG
  // ==================================================================================================
  const CARD = `[...document.querySelectorAll('#myjobs .myjob-card')].find((c) => c.textContent.includes(${JSON.stringify(order.orderCode)}))`;
  const clickIn = (text) => `(() => { const c = ${CARD}; const b = c && [...c.querySelectorAll('button')].find((x) => x.textContent.trim() === ${JSON.stringify(text)} && x.offsetParent !== null); if (!b) return false; b.click(); return true; })()`;
  const REASON = "Khách yêu cầu huỷ";
  /** Cấu trúc + trạng thái vùng huỷ của thẻ đơn. */
  const cancelState = (p) =>
    p.ev(`(() => {
      const card = ${CARD};
      if (!card) return { card: false };
      const zone = card.querySelector('.myjob-cancel');
      const btns = [...card.querySelectorAll('button')];
      const byText = (t) => btns.find((b) => b.textContent.trim() === t) ?? null;
      const cancelBtn = byText('Huỷ đơn này');
      const save = byText('Lưu số khách mới');
      const reasons = ['Không liên hệ được với khách', 'Khách yêu cầu huỷ'].map(byText);
      const close = byText('Thôi');
      const shown = (el) => el !== null && el.offsetParent !== null;
      const inZone = (el) => el !== null && zone !== null && zone.contains(el);
      const saveR = save ? save.getBoundingClientRect() : null;
      const firstR = reasons[0] ? reasons[0].getBoundingClientRect() : null;
      return {
        card: true,
        zone: zone !== null,
        zoneDirectChildOfCard: zone !== null && zone.parentElement === card,
        zoneInsideService: zone !== null && zone.closest('.myjob-service') !== null,
        zoneBorderTop: zone ? getComputedStyle(zone).borderTopWidth + ' ' + getComputedStyle(zone).borderTopStyle : null,
        cancelBtnShown: shown(cancelBtn),
        cancelBtnInZone: inZone(cancelBtn),
        saveExists: save !== null,
        saveInService: save !== null && save.closest('.myjob-service') !== null,
        saveInZone: inZone(save),
        reasonsShown: reasons.map(shown),
        reasonsInZone: reasons.map(inZone),
        reasonsDanger: reasons.map((b) => b !== null && b.classList.contains('btn-danger')),
        reasonsInService: reasons.map((b) => b !== null && b.closest('.myjob-service') !== null),
        closeShown: shown(close),
        closeInZone: inZone(close),
        title: zone ? (zone.querySelector('.myjob-cancel-title')?.textContent ?? null) : null,
        gapSaveToReasonPx: saveR && firstR && firstR.height > 0 ? Math.round(firstR.top - saveR.bottom) : null,
      };
    })()`);
  const handlerCancelPosts = (p) => p.requests.filter((r) => r.method === "POST" && r.url.includes("/handler-cancel")).length;

  // Bước 3: máy tính — mở vùng huỷ, kiểm cấu trúc (d), chụp, axe, rồi "Thôi" (b).
  await step("3", "Việc của tôi (máy tính 1040): chạm “Huỷ đơn này” → hiện vùng “Huỷ đơn” (2 nút lý do + “Thôi”) trong khối .myjob-cancel riêng, KHÔNG nằm trong khối dịch vụ có “Lưu số khách mới”; “Thôi” đóng vùng, hiện lại “Huỷ đơn này”" + axeNote(), async () => {
    const p = await openAs(HDV, "/account", DESK);
    await p.waitFor(`!!(${CARD})`, "thẻ đơn trong “Việc của tôi”", 10000);
    let s = await cancelState(p);
    assert.equal(s.saveExists && s.saveInService, true, `khối dịch vụ phải CÓ nút “Lưu số khách mới” (đơn danh mục) — ${JSON.stringify(s)}`);
    assert.equal(s.cancelBtnShown, true, `nút “Huỷ đơn này” phải hiện trước khi chạm — ${JSON.stringify(s)}`);
    assert.deepEqual(s.reasonsShown, [false, false], "chưa chạm thì chưa có nút lý do");
    assert.ok(await p.ev(clickIn("Huỷ đơn này")), "chạm “Huỷ đơn này”");
    await p.waitFor(`(() => { const c = ${CARD}; return !!c && [...c.querySelectorAll('.myjob-cancel button')].some((b) => b.textContent.trim() === 'Thôi' && b.offsetParent !== null); })()`, "vùng huỷ mở");
    s = await cancelState(p);
    assert.equal(s.zone && s.zoneDirectChildOfCard, true, `.myjob-cancel phải là con TRỰC TIẾP của thẻ đơn — ${JSON.stringify(s)}`);
    assert.equal(s.zoneInsideService, false, `.myjob-cancel KHÔNG được nằm trong .myjob-service — ${JSON.stringify(s)}`);
    assert.equal(s.cancelBtnShown, false, `“Huỷ đơn này” ẩn khi vùng đang mở — ${JSON.stringify(s)}`);
    assert.equal(s.cancelBtnInZone, true, `“Huỷ đơn này” nằm trong .myjob-cancel — ${JSON.stringify(s)}`);
    assert.deepEqual(s.reasonsShown, [true, true], `2 nút lý do phải hiện — ${JSON.stringify(s)}`);
    assert.deepEqual(s.reasonsInZone, [true, true], `2 nút lý do phải nằm trong .myjob-cancel — ${JSON.stringify(s)}`);
    assert.deepEqual(s.reasonsInService, [false, false], `nút lý do KHÔNG được nằm trong khối dịch vụ — ${JSON.stringify(s)}`);
    assert.deepEqual(s.reasonsDanger, [true, true], `nút lý do kiểu nguy hiểm (btn-danger) — ${JSON.stringify(s)}`);
    assert.equal(s.closeShown && s.closeInZone, true, `nút “Thôi” hiện, trong .myjob-cancel — ${JSON.stringify(s)}`);
    assert.equal(s.saveInZone, false, `“Lưu số khách mới” KHÔNG được nằm trong .myjob-cancel — ${JSON.stringify(s)}`);
    assert.equal(s.title, "Huỷ đơn", `tiêu đề vùng — ${JSON.stringify(s)}`);
    assert.equal(s.zoneBorderTop, "1px solid", `vùng huỷ có đường ngăn phía trên — ${JSON.stringify(s)}`);
    assert.deepEqual(await p.ev("window.__confirmCalls"), [], "mở vùng huỷ chưa hỏi confirm");
    await shotAt(p, `(${CARD}).querySelector('.myjob-cancel')`, "huy-don-mo-may-tinh.png");
    await axe(p, "Việc của tôi máy tính (vùng huỷ mở)");
    console.log(`    cấu trúc: ${JSON.stringify({ zoneDirectChildOfCard: s.zoneDirectChildOfCard, zoneInsideService: s.zoneInsideService, zoneBorderTop: s.zoneBorderTop, gapSaveToReasonPx: s.gapSaveToReasonPx })}`);
    // b) "Thôi"
    assert.ok(await p.ev(clickIn("Thôi")), "chạm “Thôi”");
    s = await cancelState(p);
    assert.equal(s.cancelBtnShown, true, `“Thôi” → “Huỷ đơn này” hiện lại — ${JSON.stringify(s)}`);
    assert.deepEqual(s.reasonsShown, [false, false], `“Thôi” → nút lý do biến mất — ${JSON.stringify(s)}`);
    assert.equal(s.closeShown, false, `“Thôi” → vùng đóng — ${JSON.stringify(s)}`);
    assert.equal(handlerCancelPosts(p), 0, "không có POST handler-cancel");
    assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
    p.close();
  });

  // Bước 4–6: điện thoại 390 — mở vùng, chụp, axe; a) confirm trả false; b) "Thôi"; c) confirm trả true (huỷ thật, bước phá huỷ để CUỐI).
  const mob = await openAs(HDV, "/account", MOB);
  await step("4", "Việc của tôi (điện thoại 390): vùng “Huỷ đơn” mở, cùng cấu trúc (khối .myjob-cancel riêng, ngoài khối dịch vụ có “Lưu số khách mới”)" + axeNote(), async () => {
    await mob.waitFor(`!!(${CARD})`, "thẻ đơn trong “Việc của tôi”", 10000);
    assert.ok(await mob.ev(clickIn("Huỷ đơn này")), "chạm “Huỷ đơn này”");
    await mob.waitFor(`(() => { const c = ${CARD}; return !!c && [...c.querySelectorAll('.myjob-cancel button')].some((b) => b.textContent.trim() === 'Thôi' && b.offsetParent !== null); })()`, "vùng huỷ mở");
    const s = await cancelState(mob);
    assert.equal(s.saveExists && s.saveInService && !s.saveInZone, true, `“Lưu số khách mới” trong khối dịch vụ, ngoài vùng huỷ — ${JSON.stringify(s)}`);
    assert.equal(s.zoneDirectChildOfCard && !s.zoneInsideService, true, `.myjob-cancel riêng, ngoài .myjob-service — ${JSON.stringify(s)}`);
    assert.deepEqual([s.reasonsShown, s.reasonsInZone, s.reasonsInService], [[true, true], [true, true], [false, false]], `nút lý do — ${JSON.stringify(s)}`);
    assert.equal(s.closeShown && s.closeInZone, true, `nút “Thôi” — ${JSON.stringify(s)}`);
    const overflow = await mob.ev("document.documentElement.scrollWidth - document.documentElement.clientWidth");
    assert.ok(overflow <= 1, `không tràn ngang ở 390px — lệch ${overflow}px`);
    await shotAt(mob, `(${CARD}).querySelector('.myjob-cancel')`, "huy-don-mo-dien-thoai.png");
    await axe(mob, "Việc của tôi điện thoại (vùng huỷ mở)");
    console.log(`    khoảng cách từ đáy “Lưu số khách mới” tới đỉnh nút lý do đầu: ${s.gapSaveToReasonPx}px`);
  });

  await step("5a", `confirm trả false: chạm “${REASON}” → confirm gọi ĐÚNG 1 lần, chữ có mã đơn + tên khách + “không thể hoàn tác”; KHÔNG có POST handler-cancel; đơn VẪN “confirmed” (API bằng Sales)`, async () => {
    await mob.ev("window.__answer = false; true");
    assert.ok(await mob.ev(clickIn(REASON)), `chạm “${REASON}”`);
    await sleep(700); // POST (nếu có) là bất đồng bộ — đợi rồi mới đếm
    const calls = await mob.ev("window.__confirmCalls");
    assert.equal(calls.length, 1, `confirm phải được gọi đúng 1 lần — ${JSON.stringify(calls)}`);
    assert.ok(calls[0].includes(order.orderCode), `chữ confirm phải có mã đơn ${order.orderCode} — ${calls[0]}`);
    assert.ok(calls[0].includes(CUSTOMER), `chữ confirm phải có tên khách — ${calls[0]}`);
    assert.ok(calls[0].includes("không thể hoàn tác"), `chữ confirm phải có “không thể hoàn tác” — ${calls[0]}`);
    assert.equal(handlerCancelPosts(mob), 0, "KHÔNG được có POST handler-cancel khi bấm Huỷ ở hộp");
    assert.equal(await statusOf(), "confirmed", "đơn phải vẫn “confirmed”");
    const s = await cancelState(mob);
    assert.deepEqual(s.reasonsShown, [true, true], `vùng lý do vẫn mở sau khi từ chối — ${JSON.stringify(s)}`);
    console.log(`    chữ confirm: “${calls[0]}”`);
  });

  await step("5b", "“Thôi” đóng vùng huỷ, nút “Huỷ đơn này” hiện lại, vẫn không có POST handler-cancel", async () => {
    assert.ok(await mob.ev(clickIn("Thôi")), "chạm “Thôi”");
    const s = await cancelState(mob);
    assert.equal(s.cancelBtnShown, true, `“Huỷ đơn này” hiện lại — ${JSON.stringify(s)}`);
    assert.deepEqual(s.reasonsShown, [false, false], `nút lý do biến mất — ${JSON.stringify(s)}`);
    assert.equal(s.closeShown, false, `“Thôi” biến mất — ${JSON.stringify(s)}`);
    assert.equal(handlerCancelPosts(mob), 0, "không có POST handler-cancel");
    assert.equal(await statusOf(), "confirmed");
  });

  await step("5c", `confirm trả true: mở lại vùng, chạm “${REASON}” → đúng 1 POST handler-cancel, đơn thành “cancelled” (API bằng Sales), thẻ biến khỏi “Việc của tôi”`, async () => {
    assert.ok(await mob.ev(clickIn("Huỷ đơn này")), "chạm lại “Huỷ đơn này”");
    await mob.waitFor(`(() => { const c = ${CARD}; return !!c && [...c.querySelectorAll('.myjob-cancel button')].some((b) => b.textContent.trim() === ${JSON.stringify(REASON)} && b.offsetParent !== null); })()`, "vùng huỷ mở lại");
    await mob.ev("window.__answer = true; true");
    assert.ok(await mob.ev(clickIn(REASON)), `chạm “${REASON}”`);
    await mob.waitFor(`!(${CARD})`, "thẻ đơn biến khỏi “Việc của tôi”", 10000);
    const calls = await mob.ev("window.__confirmCalls");
    assert.equal(calls.length, 2, `tổng số lần confirm = 2 (1 từ chối + 1 đồng ý) — ${JSON.stringify(calls)}`);
    assert.equal(handlerCancelPosts(mob), 1, "đúng 1 POST handler-cancel");
    assert.equal(await statusOf(), "cancelled", "đơn phải thành “cancelled”");
    const empty = await mob.ev("document.querySelector('#myjobs').textContent");
    assert.ok(empty.includes("Bạn chưa được giao phụ trách đơn nào."), `khối “Việc của tôi” còn lại: ${empty}`);
    assert.deepEqual(mob.consoleErrors, [], `lỗi console: ${mob.consoleErrors}`);
  });
  mob.close();

  // Bước 6 (thêm bởi NGƯỜI THI CÔNG phần máy chủ DK-T4-02, 2026-09-26 — chủ dự án chốt: tour đã qua ngày đi thì HDV không huỷ được nữa, ngay trong
  // ngày đi vẫn huỷ được): đơn thứ hai, xác nhận + giao HDV, rồi đẩy ngày đi về HÔM QUA bằng SQL trên D1 tạm (trigger 0008 không khoá depart_date).
  // Đặt SAU 5c vì 5c khẳng định "Việc của tôi" rỗng sau khi huỷ đơn thứ nhất.
  await step("6", "Việc của tôi (máy tính 1040): tour đã qua ngày đi → KHÔNG có nút “Huỷ đơn này”, có dòng nhắc “nhờ văn phòng”; “Lưu số khách mới” vẫn còn (sửa số khách giữ như cũ)" + axeNote(), async () => {
    const created2 = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
      customerName: "Khách Tour Đã Đi", customerPhone: "0903 222 444", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
      services: [{ kind: "catalog", catalogCode: "ZVA3", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 300000 }, ...NO_TRIP, departDate: vnDate(3), departTime: "07:30" }],
    });
    assert.equal(created2.status, 201, `dựng đơn thứ hai: ${JSON.stringify(created2.json)}`);
    const o2 = created2.json.order;
    assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${o2.id}/status`, { status: "confirmed" })).status, 200, "xác nhận đơn thứ hai");
    assert.equal((await call(ACCOUNTS.salesA, "PUT", `/api/orders/${o2.id}/handler`, { staffId: hdvStaffId })).status, 200, "giao HDV đơn thứ hai");
    env.sql(`UPDATE order_service SET depart_date = '${vnDate(-1)}' WHERE order_id = '${o2.id}'`);
    const p = await openAs(HDV, "/account", DESK);
    const CARD2 = `[...document.querySelectorAll('#myjobs .myjob-card')].find((c) => c.textContent.includes(${JSON.stringify(o2.orderCode)}))`;
    await p.waitFor(`!!(${CARD2})`, "thẻ đơn đã qua ngày đi trong “Việc của tôi”", 10000);
    const s = await p.ev(`(() => {
      const c = ${CARD2};
      const btns = [...c.querySelectorAll('button')].map((b) => b.textContent.trim());
      const zone = c.querySelector('.myjob-cancel');
      return { btns, zoneText: zone ? zone.textContent.trim() : null };
    })()`);
    assert.ok(!s.btns.includes("Huỷ đơn này"), `tour đã qua ngày đi KHÔNG được có nút “Huỷ đơn này” — ${JSON.stringify(s)}`);
    assert.ok(s.btns.includes("Lưu số khách mới"), `sửa số khách giữ như cũ — ${JSON.stringify(s)}`);
    assert.match(s.zoneText ?? "", /Tour đã qua ngày đi — muốn huỷ đơn, nhờ văn phòng\./, `dòng nhắc — ${JSON.stringify(s)}`);
    await shotAt(p, `(${CARD2}).querySelector('.myjob-cancel')`, "tour-da-qua-ngay-di-may-tinh.png");
    await axe(p, "Việc của tôi máy tính (tour đã qua ngày đi)");
    assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
    console.log(`    nút trên thẻ: ${JSON.stringify(s.btns)} · vùng huỷ: “${s.zoneText}”`);
    p.close();
  });
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
