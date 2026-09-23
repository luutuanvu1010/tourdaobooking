// Kiểm giao diện NGƯỜI PHỤ TRÁCH đơn (danh sách + trang đơn + bảng chọn `web/handler-sheet.ts`) bằng Chrome thật. Nằm trong repo, không thêm dependency.
// Dựa trên môi trường của A2 (`../../2026-09-20-a2/kich-ban/a2-cdp.mjs`: D1 tạm + `wrangler dev` + Chrome headless qua CDP; Turnstile TẮT). Chạy từ GỐC repo, sau `npm run build:web`:
//   npm run build:web && AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs
// (`axe-core` lấy bằng `npm pack axe-core` NGOÀI repo; `ONLY=a,b` chỉ chạy vài bước — các bước dùng chung đơn tạo ở bước a nên tự tạo lại khi cần; `OUT=…` đổi thư mục ghi.)
// Ghi: <OUT>/anh/nguoi-phu-trach-*.png và <OUT>/ket-qua-nguoi-phu-trach.json. Mỗi bước in một dòng "✓"/"✗"; thoát mã 1 nếu có bước ✗ (không dừng ở bước hỏng đầu tiên: để thấy toàn bộ "đỏ" trước khi làm).
// Không cần mạng ngoài (danh mục giả do a2-cdp.mjs chèn vào D1 tạm; phông tự lưu trữ). `web/handler-sheet.ts` KHÔNG có test tự động trong repo (như `trip-sheet.ts`): kịch bản này là bằng chứng duy nhất cho nó.
// Tài khoản: A = "Sales Một" (người lập đơn), B = "Sales Hai", C = "Sales Ba" (tạo trong kịch bản: SALES thứ ba), kế toán, quản trị (a2-cdp.mjs); D = "Sales Tư" (tạo giữa chừng rồi cho ngưng).
//
//   a  danh sách đơn: A lập đơn BẰNG GIAO DIỆN → mỗi thẻ hiện "Phụ trách: <tên>" ở khổ 390 VÀ 1040; đúng MỘT lời gọi GET /api/dispatch/handlers cho cả trang, gửi đúng các mã đơn đang hiện
//   b  A đổi người phụ trách sang B bằng bảng chọn → bảng đóng, trang đơn tải lại thấy B + báo "Đã đổi…", trả focus; danh sách và nhật ký đơn thấy B
//   c  ảnh PNG "Xác nhận gửi khách" SAU KHI đổi người in đúng tên B (giống từng byte bản dựng từ tên B, khác bản dựng từ tên A)
//   d  B (không phải người lập) sửa được đơn NHÁP bằng giao diện: nút Sửa hiện, form mở được, lưu (PUT) thành công; B thấy nút "Đổi người phụ trách", không thấy "Nhận phụ trách"
//   e  quyền: C (SALES khác) không thấy nút đổi/nhận (đơn đã có người) và không có Sửa/Xác nhận/Huỷ; kế toán không thấy nút nào; quản trị và người lập vẫn có nút đổi
//   f  đơn CHƯA có người: chip "Chưa có người phụ trách" ở danh sách (390, 1040) và ở trang đơn; C chỉ thấy "Nhận phụ trách"; người lập/quản trị thấy cả giao lẫn nhận; kế toán không có gì; C nhận được → sửa được đơn
//   g  bảng chọn: role=dialog, aria-modal, tên, nền inert, focus trong bảng, Esc / chạm nền / ✕ đóng và trả focus; danh sách khớp GET assignees (không có kế toán), người đang phụ trách bị khoá + chip;
//      "Lưu" chỉ mở khi có lựa chọn; KHOÁ khi đang lưu (nút, danh sách, ✕/Esc/chạm nền không đóng; bấm đúp chỉ gửi một PUT); lỗi tải danh sách → thông báo + Thử lại; focus không rơi ra ngoài bảng (sau Thử lại, sau lỗi khi lưu)
//   h  đổi song song → tải lại + thông báo tiếng Việt: 409 no_change (người khác đã giao đúng người đó), 409 stale (nhận đơn vừa có người), 403 (mất quyền); 400 invalid_assignee (người vừa nghỉ) giữ bảng mở, danh sách làm mới, focus còn trong bảng, axe 0 vi phạm
//      (`stale` thật giữa hai máy chủ là điều kiện đua trong một câu lệnh — đã kiểm ở tests/e2e/dispatch.mjs, không dựng được từ giao diện)
//   i  lỗi lời gọi handlers (chặn mạng / 500 / thiếu khoá): danh sách VẪN hiện, KHÔNG chip sai, không banner lỗi; trang đơn hiện đơn + nút Sửa, khối "chưa tải được" + Thử lại, KHÔNG nút nhận/đổi; Thử lại được
//   j  axe 0 vi phạm (mọi mức) ở mọi trạng thái mới (18: 9 × {390, 1040}, gồm bảng chọn đang tải / lỗi tải / lỗi khi lưu); vùng chạm ≥ 44 px; không tràn ngang ở 390 và 1040
//   k  ảnh 390×844 và 1040×800 (danh sách, trang đơn, bảng chọn, chưa có người, thông báo tải lại, lỗi handlers, lỗi khi lưu)
//   l  console/CSP sạch ở mọi trang đã theo dõi (trừ dòng mạng đã biết của các lỗi cố ý)
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { ACCOUNTS, clickText, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-21-v1-0";
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const AXE = readFileSync(process.env.AXE_JS ?? "", "utf8");
const ANH = join(OUT, "anh");
mkdirSync(ANH, { recursive: true });

const M = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
const A = ACCOUNTS.salesA; // Sales Một — người lập đơn
const B = ACCOUNTS.salesB; // Sales Hai
const ADMIN = ACCOUNTS.admin;
const ACC = ACCOUNTS.accounting;
const C = { name: "Sales Ba", phone: "0900000205", pin: "246813", permissions: ["SALES"] };
const D = { name: "Sales Tư", phone: "0900000206", pin: "246814", permissions: ["SALES"] };

const results = { ghiChu: "Đo bằng Chrome headless trên wrangler dev cục bộ (D1 tạm, danh mục giả); không phải iPhone thật, không phải WebKit.", buoc: [], axe: {}, do: {}, anh: {}, dem: {} };
let failures = 0;
let passed = 0;
async function step(id, name, fn) {
  if (ONLY && !ONLY.includes(id)) return;
  try {
    await fn();
    ok(`${id}) ${name}`);
    passed++;
    results.buoc.push({ id, name, dat: true });
  } catch (e) {
    failures++;
    const msg = (String(e?.message ?? e) + (e?.cause ? ` [nguyên nhân: ${e.cause?.code ?? e.cause?.message ?? e.cause}]` : "")).split("\n").slice(0, 12).join("\n    ");
    console.log(`✗ ${id}) ${name}\n    ${msg}`);
    results.buoc.push({ id, name, dat: false, loi: msg.slice(0, 1200) });
  }
}

// ---- Bộ vẽ ảnh + mô hình thuần đóng gói thành script chạy được trong trang (`__lib`), chỉ dùng ở bước c ----
const LIB_ENTRY = [
  'export { renderConfirmationPng } from "./web/confirmation-image.ts";',
  'export { buildConfirmation } from "./src/shared/order-confirmation.ts";',
].join("\n");
let LIB_JS = null;
let libError = "";
try {
  const r = await build({ stdin: { contents: LIB_ENTRY, resolveDir: process.cwd(), sourcefile: "lib-entry.ts", loader: "ts" }, bundle: true, format: "iife", globalName: "__lib", target: "es2022", write: false, logLevel: "silent" });
  LIB_JS = r.outputFiles[0].text;
} catch (e) {
  libError = String(e?.message ?? e).split("\n").slice(0, 4).join(" | ");
}
// Đếm blob: URL + giữ Blob (CSP `connect-src` không cho fetch("blob:…") — đúng ý; bằng chứng lấy Blob thẳng từ nơi tạo URL).
const BLOB_COUNTERS = `(() => { const c = URL.createObjectURL.bind(URL); window.__blob = { blobs: new Map() }; URL.createObjectURL = (b) => { const u = c(b); window.__blob.blobs.set(u, b); return u; }; })();`;
const PAGE_JS = `(() => { window.__t = {
  blobOf(url) { const b = window.__blob.blobs.get(url); if (!b) throw new Error('không có Blob của ' + url); return b; },
  async sameBytes(a, b) { const [p, q] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()]); if (p.byteLength !== q.byteLength) return false; const u = new Uint8Array(p), v = new Uint8Array(q); for (let i = 0; i < u.length; i++) if (u[i] !== v[i]) return false; return true; },
  async modelOf(orderId, handler) { const [o, c] = await Promise.all([fetch('/api/orders/' + orderId).then((r) => r.json()), fetch('/api/company').then((r) => r.json())]); return __lib.buildConfirmation(o.order, c.company, handler); },
}; })();`;

// ---- Giả lập lời gọi trong trang (sau khi trang tải): mỗi luật { match, method?, mode } — `500`, `empty` (handlers: {}), `gate` (giữ tới khi gọi releaseAll) ----
const HOOK = `(() => {
  if (window.__hook) return true;
  const real = window.fetch.bind(window);
  const json = (status, body) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
  window.__hook = { rules: [] };
  window.fetch = (u, i) => {
    const url = String(u), method = i?.method ?? 'GET';
    const r = window.__hook.rules.find((x) => url.includes(x.match) && (!x.method || x.method === method));
    if (!r) return real(u, i);
    r.hits = (r.hits ?? 0) + 1;
    if (r.mode === '500') return json(500, { error: { code: 'internal', message: 'giả lập' } });
    if (r.mode === 'empty') return json(200, { handlers: {} });
    if (r.mode === '400') return json(400, { error: { code: 'invalid_assignee', message: 'Nhân viên này đã ngưng hoạt động, không thể giao phụ trách.' } });
    if (r.mode === 'gate') return new Promise((resolve) => { (r.pending ??= []).push(() => resolve(real(u, i))); });
    return real(u, i);
  };
  return true;
})()`;
const setRules = (p, rules) => p.ev(`${HOOK}; window.__hook.rules = ${JSON.stringify(rules)}; true`);
const releaseGate = (p) => p.ev("(() => { for (const r of window.__hook.rules) for (const f of r.pending ?? []) f(); return true; })()");
const hits = (p, i = 0) => p.ev(`window.__hook.rules[${i}]?.hits ?? 0`);

// ---- Môi trường ----
const env = await startEnv();
const openedPages = [];
const tracked = []; // [nhãn, trang, danh sách regex dòng lỗi mạng ĐÃ BIẾT] — bước l đọc lại

/**
 * Lời gọi `fetch` của Node (dựng dữ liệu, đăng nhập) đôi khi nhận "fetch failed" khi tái dùng một kết nối keep-alive vừa bị máy chủ đóng (đua giữa hai lần gọi cách nhau lâu vì kịch bản bận thao tác trang);
 * nó không phải lỗi của ứng dụng → thử lại tối đa 3 lần. Không dùng cho lời gọi của TRANG (trình duyệt tự xử lý).
 */
const retryFetch = async (fn) => {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= 2 || !(e instanceof TypeError)) throw e;
      await sleep(300);
    }
  }
};
const login = (account) => retryFetch(() => env.login(account));

/** Mở `path` với phiên của `account`; nạp bộ vẽ khi `lib`. `track`: theo dõi console/CSP ở bước l (`allow`: regex cho dòng lỗi mạng cố ý). */
async function openAs(account, path, { viewport = M, lib = false, track = true, allow = [], blocked = [] } = {}) {
  const p = await env.openPage(viewport);
  openedPages.push(p);
  if (track) tracked.push([`${account.name} ${path}`, p, allow]);
  const c = await login(account);
  await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
  if (blocked.length) await p.send("Network.setBlockedURLs", { urls: blocked });
  await p.send("Page.addScriptToEvaluateOnNewDocument", { source: BLOB_COUNTERS });
  await p.send("Page.navigate", { url: env.base + path });
  await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
  if (lib) {
    assert.ok(LIB_JS, `chưa đóng gói được bộ vẽ (web/confirmation-image.ts): ${libError}`);
    await p.ev(PAGE_JS);
    await p.ev(`${LIB_JS}\n;true`);
  }
  p.vp = viewport;
  return p;
}

const pressEsc = async (p) => {
  await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
};

// ---- Dữ liệu dựng bằng API / SQL (KHÔNG dùng để kiểm giao diện) ----
const call = async (account, method, path, body) => {
  const c = await login(account);
  const r = await retryFetch(() => fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) }));
  return { status: r.status, json: await r.json().catch(() => null) };
};
const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
const pax = (adult) => ({ adult, child: 0, senior: 0, infant: 0 });
const createOrder = async (account, customer) => {
  const r = await call(account, "POST", "/api/orders", {
    customerName: customer, customerPhone: "0903 111 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "manual", name: "Xe đưa đón riêng", pax: pax(3), items: [{ description: "Xe 7 chỗ 2 chiều", detail: "", quantity: 1, unitPrice: 800000 }], ...NO_TRIP, departDate: vnDate(7), departTime: "07:30" }],
  });
  assert.equal(r.status, 201, `dựng đơn: ${r.status} ${JSON.stringify(r.json)}`);
  return r.json.order;
};
/** Đơn CŨ chưa có người phụ trách (như đơn lập trước khi có `dispatch`): đóng dòng HANDLE đang mở (`valid_to_at` = `valid_from_at` thoả CHECK, chỉ mục duy nhất chỉ ràng dòng đang mở). */
const unassign = (orderId) => env.sql(`UPDATE dsp_assignment SET valid_to_at = valid_from_at WHERE order_id = '${orderId}' AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL`);
const handlerOf = async (orderId, account = A) => (await call(account, "GET", `/api/dispatch/handlers?orderIds=${orderId}`)).json.handlers[orderId];
const assigneesApi = async () => (await call(A, "GET", "/api/dispatch/assignees")).json.assignees;
const assignVia = async (account, orderId, who) => {
  const list = await assigneesApi();
  const target = list.find((x) => x.name === who.name);
  assert.ok(target, `${who.name} phải nằm trong danh sách người nhận phụ trách`);
  const r = await call(account, "PUT", `/api/orders/${orderId}/handler`, { staffId: target.staffId });
  assert.equal(r.status, 200, `giao ${who.name}: ${r.status} ${JSON.stringify(r.json)}`);
};

// ---- Biểu thức đọc trang ----
// Đợt E: dòng người phụ trách (`.order-row-handler`) nay nằm trong PHẦN XỔ XUỐNG (`.order-card-details`), anh em —
// không còn là con — của `.order-row` (thẻ `<a>` chỉ còn 2 dòng hiện ngay). Gốc đọc đổi sang `.order-card` (khung
// ngoài); `textContent`/`querySelector` vẫn xuyên qua được phần tử đang ẩn bởi tổ tiên `[hidden]` (không như
// `getBoundingClientRect`) nên các bước b/f/i/j/k đọc TÊN người phụ trách qua `LIST_ROWS` không cần mở thẻ trước.
const LIST_ROWS =
  "[...document.querySelectorAll('#list .order-card')].map((c) => { const a = c.querySelector('.order-row'); const s = c.querySelector('.order-row-handler'); return { id: new URL(a.href).searchParams.get('id'), code: a.querySelector('strong').textContent, handler: s?.textContent ?? null, hidden: s?.hidden ?? null, chip: !!s?.querySelector('.chip') }; })";
const listReady = (n) => `document.querySelectorAll('#list .order-card').length >= ${n} && [...document.querySelectorAll('#list .order-card')].every((c) => { const s = c.querySelector('.order-row-handler'); return s && !s.classList.contains('is-pending'); })`;
/** Bấm mọi nút xổ đang đóng trong `#list`; trả về số nút đã bấm. */
const expandAllCards = (p) => p.ev("(() => { const btns = [...document.querySelectorAll('#list .order-card-toggle[aria-expanded=false]')]; for (const b of btns) b.click(); return btns.length; })()");
const CARD_NAME = "(document.querySelector('.handler-card .handler-name')?.textContent ?? null)";
const CARD_READY = "document.querySelector('.handler-card .handler-name, .handler-card .handler-unknown') !== null";
const CARD_BUTTONS = "[...document.querySelectorAll('.handler-card button')].map((b) => b.textContent)";
const ACTION_BUTTONS = "[...document.querySelectorAll('#actions .btn')].map((b) => b.textContent)";
const BANNER = "(document.getElementById('error').hidden ? '' : document.getElementById('error').textContent)";
const SHEET = "document.querySelector('.sheet-root')";
const CHANGE_BTN = "document.querySelector('[data-action=change-handler]')";
const SHEET_INFO = `(() => {
  const d = document.querySelector('[role=dialog]'); if (!d) return null;
  const t = document.getElementById(d.getAttribute('aria-labelledby') ?? '_'); const root = d.closest('.sheet-root');
  const others = [...document.body.children].filter((el) => el !== root);
  const saveBtn = [...d.querySelectorAll('.sheet-foot button')].find((b) => /^(Lưu người phụ trách|Đang lưu…)$/.test(b.textContent.trim()));
  return {
    modal: d.getAttribute('aria-modal'), title: t?.textContent ?? null, inertAll: others.every((el) => el.hasAttribute('inert')), rootInert: root.hasAttribute('inert'), inertCount: others.length,
    focusIn: d === document.activeElement || d.contains(document.activeElement), bodyOpen: document.body.classList.contains('sheet-open'),
    radios: [...d.querySelectorAll('.pick input[type=radio]')].map((i) => ({ name: i.closest('.pick').querySelector('.pick-name').textContent, disabled: i.matches(':disabled'), checked: i.checked, chip: i.closest('.pick').querySelector('.pick-current')?.textContent ?? null })),
    saveText: saveBtn?.textContent ?? null, saveDisabled: saveBtn?.disabled ?? null,
    status: d.querySelector('[role=status]')?.textContent ?? null, alert: d.querySelector('[role=alert]:not([hidden])')?.textContent ?? null,
    closeDisabled: d.querySelector('.sheet-close')?.disabled ?? null, overflow: document.documentElement.scrollWidth - innerWidth, dialogOverflow: d.scrollWidth - d.clientWidth,
  };
})()`;
const sheetOpen = (p, label) => p.waitFor("document.querySelector('[role=dialog] .pick input[type=radio]') !== null", label ?? "bảng chọn hiện danh sách", 10000);
const openSheet = async (p) => {
  await p.waitFor(`${CHANGE_BTN} !== null`, "nút đổi người phụ trách", 10000);
  await p.ev(`${CHANGE_BTN}.click(); true`);
  await sheetOpen(p);
  await p.waitFor("document.querySelector('.sheet-root').classList.contains('open')", "bảng mở xong", 4000);
};
const pick = (name) => `(() => { const l = [...document.querySelectorAll('.pick')].find((x) => x.querySelector('.pick-name').textContent === ${JSON.stringify(name)}); if (!l) return false; l.querySelector('input').click(); return true; })()`;
const clickSave = (p) => p.ev(clickText(".sheet-foot", "Lưu người phụ trách"));
const waitSheetClosed = (p) => p.waitFor(`${SHEET} === null`, "bảng đóng", 8000);

// ---- Đơn chính: A lập BẰNG GIAO DIỆN (dịch vụ nhập tay — đủ để lập đơn) ----
let mainPromise = null;
function getMain() {
  mainPromise ??= (async () => {
    const p = await openAs(A, "/order-form", { track: false });
    const cards = "document.querySelectorAll('#services .svc')";
    const card = `${cards}[0]`;
    await p.ev("document.getElementById('add-manual').click(); true");
    await p.waitFor(`${cards}.length === 1`, "thẻ nhập tay");
    await p.ev(setInput(`${card}.querySelector('input[placeholder="Vd: Xe đưa đón riêng"]')`, "Xe đưa đón riêng"));
    await p.ev(setInput(`${card}.querySelector('.counter-field[aria-label="Số khách (chỉ để vận hành)"]')`, "3"));
    await p.ev(setInput(`${card}.querySelector('input[placeholder="Vd: Xe 7 chỗ 2 chiều"]')`, "Xe 7 chỗ 2 chiều"));
    await p.ev(setInput(`${card}.querySelector('.price-field')`, "800000"));
    await p.ev(`${card}.querySelector('details.trip > summary').click(); true`);
    await p.waitFor(`${card}.querySelector('details.trip').open`, "mở khối chuyến");
    await p.ev(setInput(`${card}.querySelector('[data-trip="departDate"]')`, vnDate(7)));
    await p.ev(setInput("document.getElementById('customerName')", "Nguyễn Thị Ánh Tuyết"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0912 345 678"));
    await p.ev(setInput("document.getElementById('customerNote')", "Cả nhà ăn chay."));
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("location.pathname === '/order'", "chuyển tới trang đơn sau khi lưu", 15000);
    const id = await p.ev("new URLSearchParams(location.search).get('id')");
    p.close();
    return (await call(A, "GET", `/api/orders/${id}`)).json.order;
  })();
  return mainPromise;
}
let extraPromise = null;
/** Hai đơn nữa để danh sách có nhiều dòng: một của A, một của B. */
function getExtra() {
  extraPromise ??= (async () => ({ a2: await createOrder(A, "Khách Hai (A lập)"), b1: await createOrder(B, "Khách Ba (B lập)") }))();
  return extraPromise;
}

async function shoot(p, name) {
  const vp = p.vp;
  await p.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
  await sleep(700); // hiệu ứng mở bảng (300 ms) xong hẳn trước khi chụp
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(ANH, name), Buffer.from(r.result.data, "base64"));
  results.anh[name] = `${vp.width}×${vp.height}`;
}
const axeRun = async (p, label) => {
  await p.waitFor("!document.querySelector('.sheet-root') || document.querySelector('.sheet-root').classList.contains('open')", "bảng đã mở xong", 4000);
  await sleep(500); // khung mở ≥ 641 px chạy hiệu ứng mờ dần 300 ms: đo tương phản giữa lúc đang mờ cho kết quả sai
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help, mau: x.nodes.slice(0, 2).map((n) => n.target.join(' ')) })))`);
  results.axe[label] = v;
  return v;
};
/** Vùng chạm ≥ 44 px cho mọi điều khiển của khối người phụ trách, bảng chọn và thẻ danh sách; không tràn ngang. */
const measure = async (p, label) => {
  const m = await p.ev(`(() => {
    const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]'); };
    const ctl = [...document.querySelectorAll('.handler-card button, .handler-card a[href], .sheet button, .sheet input, .sheet a[href], #list .order-row, #list .order-card-toggle')].filter(shown);
    return { nho: ctl.filter((el) => { const r = el.getBoundingClientRect(); return r.height < 43.5 || r.width < 43.5; }).map((el) => (el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height)), dieuKhien: ctl.length, trànNgang: document.documentElement.scrollWidth - innerWidth };
  })()`);
  results.do[label] = m;
  return m;
};

try {
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  const seedAccount = async (account) => {
    for (const stmt of (await insertStaffSql(account)).split("\n")) env.sql(stmt);
  };
  await seedAccount(C);

  // ================= a) danh sách đơn =================
  // Đợt E: dòng người phụ trách nay nằm trong phần xổ xuống (mặc định ĐÓNG) — bước này kiểm CẢ hai trạng thái:
  // đóng (đúng 2 dòng, KHÔNG lộ người phụ trách) và mở (bấm nút xổ → hiện đúng tên, nằm gọn trong thẻ).
  await step("a", "danh sách đơn: đóng đúng 2 dòng (không lộ người phụ trách); mở nút xổ thấy “Phụ trách: <tên>”; đúng MỘT lời gọi handlers cho cả trang, gửi đúng các mã đơn đang hiện", async () => {
    const main = await getMain();
    const { a2, b1 } = await getExtra();
    const expected = new Map([[main.id, "Phụ trách: Sales Một"], [a2.id, "Phụ trách: Sales Một"], [b1.id, "Phụ trách: Sales Hai"]]);
    for (const [label, vp] of [["390", M], ["1040", DESK]]) {
      const p = await openAs(A, "/orders", { viewport: vp });
      await p.waitFor(listReady(3), `danh sách có 3 đơn, mỗi thẻ có dòng người phụ trách (${label})`, 10000);
      const rows = await p.ev(LIST_ROWS);
      assert.equal(rows.length, 3, `${label}: số đơn`);
      for (const r of rows) {
        assert.equal(r.handler, expected.get(r.id), `${label}: đơn ${r.code}`);
        assert.equal(r.chip, false, `${label}: đơn đã có người phụ trách KHÔNG có chip`);
      }
      // ĐÓNG (mặc định): nút xổ đóng + vùng chạm ≥44px, dòng người phụ trách KHÔNG lộ (cao 0), không tràn ngang.
      const closed = await p.ev(`(() => {
        const cards = [...document.querySelectorAll('#list .order-card')];
        return {
          tran: document.documentElement.scrollWidth - innerWidth,
          the: cards.map((c) => {
            const t = c.querySelector('.order-card-toggle'), tr = t.getBoundingClientRect(), h = c.querySelector('.order-row-handler').getBoundingClientRect();
            return { expanded: t.getAttribute('aria-expanded'), toggleTapMin: tr.width >= 43.5 && tr.height >= 43.5, handlerAn: h.height === 0 };
          }),
        };
      })()`);
      assert.ok(closed.tran <= 0, `${label}: đóng — tràn ngang ${closed.tran}px`);
      assert.ok(closed.the.every((x) => x.expanded === "false"), `${label}: đóng — nút xổ phải aria-expanded=false: ${JSON.stringify(closed.the)}`);
      assert.ok(closed.the.every((x) => x.toggleTapMin), `${label}: đóng — nút xổ phải ≥44px: ${JSON.stringify(closed.the)}`);
      assert.ok(closed.the.every((x) => x.handlerAn), `${label}: đóng — dòng người phụ trách KHÔNG được lộ: ${JSON.stringify(closed.the)}`);
      // "Đúng 2 dòng" (tiêu chí 1 đặc tả Đợt E) đo bằng CHIỀU CAO THẬT + số hàng thật của dòng 2 (không đếm phần tử).
      // Đo thật (390px): nội dung dòng 2 (SĐT + số khách + đã trả + còn lại) KHÔNG vừa một hàng trong ~326px nội dung
      // còn lại — §A cho phép xuống hàng ở khổ hẹp CÓ CHỦ ĐÍCH ("không phải ràng buộc cứng làm chữ bị cắt"), nên ở
      // 390px chỉ đòi KHÔNG cắt số tiền/SĐT + thẻ vẫn thấp hẳn so với khung 7 dòng cũ (từng ~180–240px). Ở ≥1040px
      // đủ chỗ nên đòi đúng nghĩa đen: dòng 2 không xuống hàng, thẻ đóng thật thấp (2 dòng).
      const wrap = await p.ev(`(() => [...document.querySelectorAll('#list .order-card')].map((c) => {
        const l2 = c.querySelector('.order-card-line2');
        const tops = new Set([...l2.children].map((x) => Math.round(x.getBoundingClientRect().top)));
        const clipped = [...l2.querySelectorAll('span, b')].some((x) => x.scrollWidth > x.clientWidth + 1);
        return { l2Rows: tops.size, cardH: Math.round(c.getBoundingClientRect().height), clipped };
      }))()`);
      if (label === "1040") {
        assert.ok(wrap.every((x) => x.l2Rows === 1), `${label}: đúng 2 dòng — dòng 2 không được xuống hàng ở khổ thường: ${JSON.stringify(wrap)}`);
        assert.ok(wrap.every((x) => x.cardH <= 140), `${label}: thẻ đóng phải thấp (≤140px, đúng 2 dòng thật): ${JSON.stringify(wrap)}`);
      } else {
        assert.ok(wrap.every((x) => !x.clipped), `${label}: dòng 2 KHÔNG được cắt mất số tiền hay số điện thoại: ${JSON.stringify(wrap)}`);
        assert.ok(wrap.every((x) => x.cardH <= 170), `${label}: thẻ đóng vẫn phải thấp hẳn so với khung 7 dòng cũ (≤170px): ${JSON.stringify(wrap)}`);
      }
      results.dem[`the-dong-${label}`] = wrap;
      // MỞ: bấm hết nút xổ → dòng người phụ trách hiện thật (đo chiều cao), nằm gọn trong khung thẻ.
      const n = await expandAllCards(p);
      assert.equal(n, 3, `${label}: mở đủ 3 nút xổ (thấy ${n})`);
      await p.waitFor("[...document.querySelectorAll('#list .order-card-toggle')].every((b) => b.getAttribute('aria-expanded') === 'true')", `mọi thẻ đã mở (${label})`, 4000);
      const layout = await p.ev(`(() => ({ tran: document.documentElement.scrollWidth - innerWidth, cao: [...document.querySelectorAll('#list .order-row-handler')].map((e) => Math.round(e.getBoundingClientRect().height)), trongThe: [...document.querySelectorAll('#list .order-card')].every((c) => { const a = c.getBoundingClientRect(), b = c.querySelector('.order-row-handler').getBoundingClientRect(); return b.left >= a.left - 0.5 && b.right <= a.right + 0.5 && b.top >= a.top - 0.5 && b.bottom <= a.bottom + 0.5; }) }))()`);
      assert.ok(layout.tran <= 0 && layout.trongThe && layout.cao.every((h) => h >= 18), `${label}: bố cục sau khi mở ${JSON.stringify(layout)}`);
      const gets = p.requests.filter((r) => r.url.includes("/api/dispatch/handlers"));
      assert.equal(gets.length, 1, `${label}: đúng một lời gọi handlers cho cả trang (thấy ${gets.length})`);
      assert.deepEqual(new URL(gets[0].url).searchParams.get("orderIds").split(",").sort(), rows.map((r) => r.id).sort(), `${label}: gửi đúng các mã đơn đang hiện`);
      results.dem[`handlers-goi-o-danh-sach-${label}`] = gets.length;
      p.close();
    }
  });

  // ================= b) A đổi sang B =================
  await step("b", "A đổi người phụ trách sang B bằng bảng chọn: bảng đóng, trang đơn tải lại thấy B + báo, trả focus; danh sách và nhật ký thấy B", async () => {
    const main = await getMain();
    await getExtra();
    const p = await openAs(A, `/order?id=${main.id}`);
    await p.waitFor(CARD_READY, "khối Người phụ trách", 10000);
    assert.equal(await p.ev("document.querySelector('.handler-card h2').textContent"), "Người phụ trách");
    assert.equal(await p.ev(CARD_NAME), "Sales Một", "người lập là người phụ trách mặc định");
    assert.deepEqual(await p.ev(CARD_BUTTONS), ["Đổi người phụ trách"], "người phụ trách (cũng là người lập): chỉ có nút đổi, KHÔNG có nút nhận");
    await openSheet(p);
    const info = await p.ev(SHEET_INFO);
    assert.equal(info.title, "Đổi người phụ trách");
    assert.equal(info.saveDisabled, true, "chưa chọn ai thì chưa Lưu được");
    assert.deepEqual(await p.ev(pick("Sales Hai")), true);
    assert.equal((await p.ev(SHEET_INFO)).saveDisabled, false, "đã chọn thì Lưu mở");
    await clickSave(p);
    await waitSheetClosed(p);
    await p.waitFor(`${CARD_NAME} === 'Sales Hai'`, "trang đơn tải lại thấy Sales Hai", 8000);
    assert.equal(await p.ev(BANNER), "Đã đổi người phụ trách sang Sales Hai.", "báo thành công");
    assert.equal(await p.ev("document.getElementById('error').classList.contains('banner-info')"), true);
    assert.deepEqual(await p.ev(CARD_BUTTONS), ["Đổi người phụ trách"], "người lập vẫn đổi lại được (ADR-0009: giữ quyền)");
    assert.equal(await p.ev("document.activeElement === document.querySelector('[data-action=change-handler]')"), true, "focus trở về nút đổi (đã dựng lại)");
    assert.deepEqual(await p.ev("[...document.querySelectorAll('.history li')].map((li) => li.textContent).filter((t) => /Đổi người phụ trách/.test(t)).length"), 1, "nhật ký đơn có một dòng “Đổi người phụ trách”");
    assert.equal((await handlerOf(main.id)).name, "Sales Hai", "máy chủ ghi B");
    const puts = p.requests.filter((r) => r.method === "PUT" && r.url.endsWith("/handler"));
    assert.equal(puts.length, 1);
    assert.deepEqual(Object.keys(JSON.parse(puts[0].postData)), ["staffId"], "chỉ gửi staffId");
    p.close();
    // danh sách sau khi đổi
    const list = await openAs(A, "/orders", { viewport: DESK });
    await list.waitFor(listReady(3), "danh sách");
    assert.equal((await list.ev(LIST_ROWS)).find((r) => r.id === main.id).handler, "Phụ trách: Sales Hai");
    list.close();
  });

  // ================= c) ảnh PNG in đúng tên sau khi đổi =================
  await step("c", "ảnh PNG “Xác nhận gửi khách” SAU KHI đổi người in đúng tên B: giống từng byte bản dựng từ tên B, khác bản dựng từ tên A (người lập)", async () => {
    const main = await getMain();
    const p = await openAs(A, `/order?id=${main.id}`, { lib: true });
    await p.waitFor("document.querySelector('#send button') !== null", "nút Xác nhận gửi khách", 10000);
    await p.ev(clickText("#send", "Xác nhận gửi khách"));
    await p.waitFor("(() => { const i = document.querySelector('.sheet .confirm-img'); return !!i && i.complete && i.naturalWidth > 0; })()", "ảnh xác nhận hiện", 20000);
    const same = (name) => p.ev(`(async () => __t.sameBytes(__t.blobOf(document.querySelector('.sheet a.confirm-download').href), await __lib.renderConfirmationPng(await __t.modelOf(${JSON.stringify(main.id)}, ${JSON.stringify(name)}))))()`);
    assert.equal(await same("Sales Hai"), true, "ảnh phải in tên người phụ trách hiện tại (Sales Hai)");
    assert.equal(await same("Sales Một"), false, "đối chứng: ảnh KHÔNG còn in tên người lập cũ");
    assert.equal((await handlerOf(main.id)).name, "Sales Hai");
    p.close();
  });

  // ================= d) B sửa được đơn nháp =================
  await step("d", "B (không phải người lập) sửa được đơn NHÁP bằng giao diện: nút Sửa, form mở được, lưu thành công; thấy “Đổi người phụ trách”, không thấy “Nhận phụ trách”", async () => {
    const main = await getMain();
    const p = await openAs(B, `/order?id=${main.id}`);
    await p.waitFor(CARD_READY, "khối Người phụ trách", 10000);
    assert.equal(await p.ev(CARD_NAME), "Sales Hai");
    assert.deepEqual(await p.ev(CARD_BUTTONS), ["Đổi người phụ trách"], "người được giao: đổi được, không nhận");
    assert.deepEqual(await p.ev(ACTION_BUTTONS), ["Sửa", "Xác nhận đơn", "Huỷ đơn"], "người phụ trách có đủ nút như người lập");
    assert.ok((await p.ev("document.querySelectorAll('.history li').length")) >= 1, "người phụ trách xem được nhật ký");
    await p.ev(clickText("#actions", "Sửa"));
    await p.waitFor("location.pathname === '/order-form' && /^Sửa đơn /.test(document.getElementById('form-title').textContent) && !document.getElementById('order-form').hasAttribute('inert') && document.querySelectorAll('#services .svc').length >= 1 && document.getElementById('error').hidden", "form sửa mở được (không bị khoá)", 12000);
    await p.ev(setInput("document.getElementById('customerNote')", "Đã đổi bởi người phụ trách Sales Hai."));
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("location.pathname === '/order'", "lưu xong về trang đơn", 15000);
    await p.waitFor("[...document.querySelectorAll('#order .kv')].some((k) => k.textContent.includes('Đã đổi bởi người phụ trách Sales Hai.'))", "trang đơn thấy ghi chú mới", 8000);
    const saved = (await call(A, "GET", `/api/orders/${main.id}`)).json.order;
    assert.equal(saved.customerNote, "Đã đổi bởi người phụ trách Sales Hai.");
    assert.equal(saved.staffName, "Sales Một", "người lập không đổi");
    assert.ok(p.requests.some((r) => r.method === "PUT" && r.url.endsWith(`/api/orders/${main.id}`)), "đã gọi PUT sửa đơn");
    p.close();
  });

  // ================= e) quyền trên trang đơn =================
  await step("e", "quyền: C không thấy nút đổi/nhận và không có Sửa/Xác nhận/Huỷ; kế toán không nút nào; quản trị và người lập có nút đổi", async () => {
    const main = await getMain(); // handler hiện tại: B
    const NO_PERM = /Chỉ Sales Một \(người lập đơn\), người phụ trách đơn hoặc quản trị viên mới được sửa, xác nhận hoặc huỷ đơn này\./;
    const c = await openAs(C, `/order?id=${main.id}`);
    await c.waitFor(CARD_READY, "khối Người phụ trách (C)", 10000);
    assert.equal(await c.ev(CARD_NAME), "Sales Hai");
    assert.deepEqual(await c.ev(CARD_BUTTONS), [], "C: đơn đã có người → không đổi, không nhận");
    assert.deepEqual(await c.ev(ACTION_BUTTONS), []);
    assert.match(await c.ev("document.getElementById('actions').textContent"), NO_PERM, "câu giải thích quyền phải kể cả người phụ trách");
    assert.equal(await c.ev("document.querySelector('#send button')?.textContent"), "Xác nhận gửi khách", "ảnh xác nhận vẫn có cho mọi người xem được đơn");
    c.close();
    const acc = await openAs(ACC, `/order?id=${main.id}`);
    await acc.waitFor(CARD_READY, "khối Người phụ trách (kế toán)", 10000);
    assert.equal(await acc.ev(CARD_NAME), "Sales Hai");
    assert.deepEqual([await acc.ev(CARD_BUTTONS), await acc.ev(ACTION_BUTTONS)], [[], []], "kế toán: không nút nào");
    acc.close();
    const adm = await openAs(ADMIN, `/order?id=${main.id}`);
    await adm.waitFor(CARD_READY, "khối Người phụ trách (quản trị)", 10000);
    assert.deepEqual(await adm.ev(CARD_BUTTONS), ["Đổi người phụ trách"], "quản trị: đổi được, không nhận (đã có người)");
    assert.deepEqual(await adm.ev(ACTION_BUTTONS), ["Sửa", "Xác nhận đơn", "Huỷ đơn"]);
    adm.close();
    const a = await openAs(A, `/order?id=${main.id}`);
    await a.waitFor(CARD_READY, "khối Người phụ trách (người lập)", 10000);
    assert.deepEqual([await a.ev(CARD_BUTTONS), await a.ev(ACTION_BUTTONS)], [["Đổi người phụ trách"], ["Sửa", "Xác nhận đơn", "Huỷ đơn"]], "người lập giữ quyền sau khi giao lại");
    a.close();
  });

  // ================= f) đơn chưa có người phụ trách =================
  let unassigned = null;
  await step("f", "đơn CHƯA có người: chip ở danh sách (390, 1040) và ở trang đơn; C chỉ thấy “Nhận phụ trách”; người lập/quản trị thấy cả giao và nhận; kế toán không gì; C nhận được rồi sửa được đơn", async () => {
    await getMain();
    await getExtra();
    unassigned = await createOrder(A, "Khách Chưa Có Người Phụ Trách");
    unassign(unassigned.id);
    assert.equal(await handlerOf(unassigned.id), null, "tiền đề: đơn chưa có người phụ trách");
    for (const [label, vp] of [["390", M], ["1040", DESK]]) {
      const p = await openAs(C, "/orders", { viewport: vp });
      await p.waitFor(listReady(4), `danh sách có 4 đơn (${label})`, 10000);
      const rows = await p.ev(LIST_ROWS);
      const un = rows.find((r) => r.id === unassigned.id);
      assert.deepEqual([un.handler, un.chip, un.hidden], ["Chưa có người phụ trách", true, false], `${label}: đơn chưa có người → chip`);
      assert.equal(rows.filter((r) => r.chip).length, 1, `${label}: chỉ đơn chưa có người mới có chip`);
      assert.ok(rows.filter((r) => !r.chip).every((r) => /^Phụ trách: /.test(r.handler)), `${label}: các đơn còn lại có tên`);
      p.close();
    }
    for (const [who, expectButtons] of [[A, ["Chọn người phụ trách", "Nhận phụ trách"]], [ADMIN, ["Chọn người phụ trách", "Nhận phụ trách"]], [ACC, []]]) {
      const q = await openAs(who, `/order?id=${unassigned.id}`);
      await q.waitFor(CARD_READY, `khối Người phụ trách (${who.name})`, 10000);
      assert.deepEqual(await q.ev(CARD_BUTTONS), expectButtons, `${who.name}: nút trên đơn chưa có người`);
      q.close();
    }
    const c = await openAs(C, `/order?id=${unassigned.id}`);
    await c.waitFor(CARD_READY, "khối Người phụ trách (C)", 10000);
    assert.equal(await c.ev(CARD_NAME), "Chưa có người phụ trách");
    assert.equal(await c.ev("!!document.querySelector('.handler-card .handler-name .chip')"), true, "hiện dạng chip");
    assert.deepEqual(await c.ev(CARD_BUTTONS), ["Nhận phụ trách"], "C: chỉ được nhận, không được giao cho người khác");
    assert.deepEqual(await c.ev(ACTION_BUTTONS), [], "chưa nhận thì chưa sửa được đơn");
    // C nhận (lưu ý: các trang của Chrome dùng CHUNG một kho cookie — trang của C phải là trang mở SAU CÙNG thì bấm "Nhận" mới đi bằng phiên của C)
    // C nhận
    await c.ev(clickText(".handler-card", "Nhận phụ trách"));
    try {
      await c.waitFor(`${CARD_NAME} === 'Sales Ba'`, "khối hiện Sales Ba sau khi nhận", 8000);
    } catch (e) {
      throw new Error(`${e.message.split("\n")[0]} — thẻ: ${JSON.stringify(await c.ev(CARD_NAME))}; banner: ${JSON.stringify(await c.ev(BANNER))}; nút: ${JSON.stringify(await c.ev(CARD_BUTTONS))}; máy chủ: ${JSON.stringify(await handlerOf(unassigned.id))}`);
    }
    assert.equal(await c.ev(BANNER), "Bạn đã nhận phụ trách đơn này.");
    assert.deepEqual(await c.ev(CARD_BUTTONS), ["Đổi người phụ trách"], "nhận xong: hết nút nhận, có nút đổi");
    assert.deepEqual(await c.ev(ACTION_BUTTONS), ["Sửa", "Xác nhận đơn", "Huỷ đơn"], "nhận xong là sửa được đơn (canModify của máy chủ)");
    assert.equal(await c.ev("document.activeElement === document.querySelector('[data-action=change-handler]')"), true, "focus sang nút đổi");
    assert.equal((await handlerOf(unassigned.id)).name, "Sales Ba");
    const puts = c.requests.filter((r) => r.method === "PUT" && r.url.endsWith("/handler"));
    assert.equal(puts.length, 1);
    assert.equal((await assigneesApi()).find((x) => x.name === "Sales Ba").staffId, JSON.parse(puts[0].postData).staffId, "nhận = gửi staffId của chính mình");
    c.close();
  });

  // ================= g) bảng chọn =================
  await step("g", "bảng chọn: dialog + aria-modal + tên + nền inert + focus; Esc/chạm nền/✕ đóng và trả focus; danh sách khớp API; KHOÁ khi đang lưu; lỗi tải danh sách → Thử lại", async () => {
    const o = await createOrder(A, "Khách Bảng Chọn");
    const api = await assigneesApi();
    assert.ok(!api.some((x) => x.name === "Kế Toán"), "API: kế toán không nằm trong danh sách người nhận");
    const p = await openAs(A, `/order?id=${o.id}`, { allow: [/\/handler$/] });
    await p.waitFor(CARD_READY, "khối Người phụ trách", 10000);
    await openSheet(p);
    let info = await p.ev(SHEET_INFO);
    assert.equal(info.modal, "true");
    assert.equal(info.title, "Đổi người phụ trách");
    assert.deepEqual([info.inertAll, info.rootInert, info.bodyOpen, info.focusIn], [true, false, true, true], `nền inert (${info.inertCount} phần tử), bảng không inert, body.sheet-open, focus trong bảng`);
    assert.deepEqual(info.radios.map((r) => r.name), api.map((x) => x.name), "danh sách hiện đúng thứ tự và đủ người của GET assignees");
    assert.deepEqual(info.radios.filter((r) => r.disabled).map((r) => [r.name, r.chip]), [["Sales Một", "Đang phụ trách"]], "người đang phụ trách bị khoá và có chip");
    assert.equal(info.radios.some((r) => r.name === "Kế Toán"), false);
    assert.equal(info.saveText, "Lưu người phụ trách");
    assert.equal(info.saveDisabled, true);
    // đóng bằng Esc / chạm nền / ✕ và trả focus
    const closedOk = async (how) => {
      await waitSheetClosed(p);
      assert.deepEqual(await p.ev("({ inert: [...document.body.children].filter((el) => el.hasAttribute('inert')).length, open: document.body.classList.contains('sheet-open'), focus: document.activeElement === document.querySelector('[data-action=change-handler]') })"), { inert: 0, open: false, focus: true }, `sau khi đóng bằng ${how}`);
    };
    await pressEsc(p);
    await closedOk("Esc");
    await openSheet(p);
    await p.ev("document.querySelector('.sheet-scrim').click(); true");
    await closedOk("chạm nền");
    await openSheet(p);
    await p.ev("document.querySelector('.sheet .sheet-close').click(); true");
    await closedOk("nút ✕");
    // lỗi tải danh sách → thông báo tiếng Việt + Thử lại; lưu bị khoá
    await setRules(p, [{ match: "/api/dispatch/assignees", mode: "500" }]);
    await p.ev(`${CHANGE_BTN}.click(); true`);
    await p.waitFor("document.querySelector('[role=dialog] [role=alert]:not([hidden])') !== null", "thông báo lỗi tải danh sách", 8000);
    info = await p.ev(SHEET_INFO);
    assert.match(info.alert, /Chưa tải được danh sách nhân viên/);
    assert.equal(info.saveDisabled, true, "chưa có danh sách thì không Lưu được");
    assert.deepEqual(info.radios, []);
    assert.doesNotMatch(info.alert, /500|internal|giả lập/, "không lộ chữ kỹ thuật");
    await setRules(p, []);
    assert.equal(await p.ev("document.activeElement === document.querySelector('[role=dialog] .banner-actions button')"), true, "lỗi tải danh sách: focus nhảy vào nút Thử lại");
    await p.ev(clickText("[role=dialog]", "Thử lại")); // (bấm bằng mã không đổi focus: nút Thử lại đang giữ focus và sắp bị gỡ khỏi DOM khi danh sách nạp lại)
    await sheetOpen(p, "Thử lại ra danh sách");
    assert.equal((await p.ev(SHEET_INFO)).alert, null, "thông báo lỗi biến mất");
    assert.equal((await p.ev(SHEET_INFO)).focusIn, true, "sau Thử lại focus vẫn nằm trong bảng (nút Thử lại đã bị gỡ)");
    // KHOÁ khi đang lưu (PUT bị giữ lại để đo trạng thái "đang lưu")
    await setRules(p, [{ match: "/handler", method: "PUT", mode: "gate" }]);
    await p.ev(pick("Sales Hai"));
    await p.ev(clickText(".sheet-foot", "Lưu người phụ trách"));
    await p.ev(clickText(".sheet-foot", "Đang lưu…")); // bấm đúp khi đang lưu: không gửi thêm
    await p.waitFor("window.__hook.rules[0].hits >= 1", "PUT đã được gửi (đang giữ)", 4000);
    info = await p.ev(SHEET_INFO);
    assert.deepEqual([info.saveText, info.saveDisabled], ["Đang lưu…", true], "nút Lưu đổi chữ và khoá");
    assert.ok(info.radios.every((r) => r.disabled), "cả danh sách bị khoá khi đang lưu");
    assert.equal(info.focusIn, true, "focus không rơi ra ngoài bảng khi nút bị khoá");
    await pressEsc(p);
    await p.ev("document.querySelector('.sheet-scrim').click(); true");
    await p.ev("document.querySelector('.sheet .sheet-close').click(); true");
    await sleep(300);
    assert.notEqual(await p.ev(SHEET_INFO), null, "Esc / chạm nền / ✕ KHÔNG đóng bảng khi đang lưu");
    assert.equal(await hits(p), 1, "đúng một PUT (bấm đúp không gửi thêm)");
    await releaseGate(p);
    await waitSheetClosed(p);
    await p.waitFor(`${CARD_NAME} === 'Sales Hai'`, "sau khi thả, đơn tải lại thấy Sales Hai", 8000);
    assert.equal(await p.ev(BANNER), "Đã đổi người phụ trách sang Sales Hai.");
    p.close();
  });

  // ================= h) đổi song song =================
  await step("h", "đổi song song → tải lại + thông báo: 409 no_change, 409 stale (nhận), 403 (mất quyền); 400 invalid_assignee giữ bảng mở", async () => {
    // 1) no_change: giữa lúc A mở bảng, quản trị đã giao đúng người A định chọn
    const o1 = await createOrder(A, "Khách Đua 1");
    const p1 = await openAs(A, `/order?id=${o1.id}`, { allow: [/\/handler$/] });
    await p1.waitFor(CARD_READY, "trang đơn (A)", 10000);
    await openSheet(p1);
    await assignVia(ADMIN, o1.id, B); // sau lưng giao diện
    await p1.ev(pick("Sales Hai"));
    await clickSave(p1);
    await waitSheetClosed(p1);
    await p1.waitFor(`${CARD_NAME} === 'Sales Hai'`, "tải lại: thấy Sales Hai", 8000);
    assert.equal(await p1.ev(BANNER), "Người này đang phụ trách đơn rồi. Đã tải lại đơn.");
    assert.equal(await p1.ev("document.getElementById('error').classList.contains('banner-info')"), true);
    assert.doesNotMatch(await p1.ev(BANNER), /no_change|409/);
    results.dem["thong-bao-no-change"] = await p1.ev(BANNER);
    p1.close();
    // 2) stale: C mở đơn CHƯA có người (thấy “Nhận phụ trách”), người lập giao cho B trước khi C bấm
    const o2 = await createOrder(A, "Khách Đua 2");
    unassign(o2.id);
    const p2 = await openAs(C, `/order?id=${o2.id}`, { allow: [/\/handler$/] });
    await p2.waitFor(CARD_READY, "trang đơn (C)", 10000);
    assert.deepEqual(await p2.ev(CARD_BUTTONS), ["Nhận phụ trách"]);
    await assignVia(A, o2.id, B);
    await p2.ev(clickText(".handler-card", "Nhận phụ trách"));
    await p2.waitFor(`${CARD_NAME} === 'Sales Hai'`, "tải lại: thấy Sales Hai", 8000);
    assert.equal(await p2.ev(BANNER), "Đơn này vừa có người khác nhận phụ trách. Đã tải lại đơn.");
    assert.equal(await p2.ev("document.getElementById('error').classList.contains('banner-warning')"), true);
    assert.deepEqual(await p2.ev(CARD_BUTTONS), [], "hết nút nhận sau khi tải lại");
    results.dem["thong-bao-stale"] = await p2.ev(BANNER);
    await shoot(p2, "nguoi-phu-trach-tai-lai-390.png");
    p2.close();
    // 3) 403: B đang là người phụ trách và mở bảng; quản trị giao cho C; B chọn người khác → không còn quyền
    const o3 = await createOrder(A, "Khách Đua 3");
    await assignVia(A, o3.id, B);
    const p3 = await openAs(B, `/order?id=${o3.id}`, { allow: [/\/handler$/] });
    await p3.waitFor(`${CARD_NAME} === 'Sales Hai'`, "trang đơn (B)", 10000);
    await openSheet(p3);
    await assignVia(ADMIN, o3.id, C);
    await p3.ev(pick("Sales Một"));
    await clickSave(p3);
    await waitSheetClosed(p3);
    await p3.waitFor(`${CARD_NAME} === 'Sales Ba'`, "tải lại: thấy Sales Ba", 8000);
    assert.equal(await p3.ev(BANNER), "Bạn không còn quyền đổi người phụ trách của đơn này. Đã tải lại đơn.");
    assert.deepEqual(await p3.ev(CARD_BUTTONS), [], "B mất nút đổi (không còn được giao)");
    assert.deepEqual(await p3.ev(ACTION_BUTTONS), [], "và mất quyền sửa đơn");
    results.dem["thong-bao-403"] = await p3.ev(BANNER);
    p3.close();
    // 4) 400 invalid_assignee: người được chọn vừa nghỉ → bảng GIỮ NGUYÊN, hiện chữ của máy chủ, danh sách được làm mới
    await seedAccount(D);
    const o4 = await createOrder(A, "Khách Đua 4");
    const p4 = await openAs(A, `/order?id=${o4.id}`, { allow: [/\/handler$/] });
    await p4.waitFor(CARD_READY, "trang đơn (A)", 10000);
    await openSheet(p4);
    assert.ok((await p4.ev(SHEET_INFO)).radios.some((r) => r.name === "Sales Tư"), "tiền đề: Sales Tư có trong danh sách");
    env.sql(`UPDATE staff SET active = 0 WHERE phone = '${D.phone}'`);
    await p4.ev(pick("Sales Tư"));
    await clickSave(p4);
    await p4.waitFor("document.querySelector('[role=dialog] [role=alert]:not([hidden])') !== null", "thông báo lỗi trong bảng", 8000);
    const info = await p4.ev(SHEET_INFO);
    assert.equal(info.alert.includes("Nhân viên này đã ngưng hoạt động, không thể giao phụ trách."), true, `chữ của máy chủ: ${info.alert}`);
    await p4.waitFor("![...document.querySelectorAll('.pick-name')].some((n) => n.textContent === 'Sales Tư') && document.querySelectorAll('.pick input').length > 0", "danh sách được làm mới, không còn Sales Tư", 8000);
    const after = await p4.ev(SHEET_INFO);
    assert.equal(after.saveDisabled, true, "lựa chọn cũ đã bị bỏ");
    assert.equal(after.focusIn, true, "focus vẫn nằm trong bảng sau lỗi + làm mới danh sách (nút Lưu vừa bị khoá không được để focus rơi ra body)");
    const va = await axeRun(p4, "bang-chon-loi-luu-that-390");
    assert.deepEqual(va, [], `axe (lỗi khi lưu, thật): ${JSON.stringify(va)}`);
    assert.equal((await handlerOf(o4.id)).name, "Sales Một", "không đổi gì ở máy chủ");
    await pressEsc(p4);
    await waitSheetClosed(p4);
    p4.close();
  });

  // ================= i) lỗi lời gọi handlers =================
  await step("i", "lỗi lời gọi handlers (chặn mạng / 500 / thiếu khoá): danh sách VẪN hiện, không chip sai, không banner; trang đơn hiện đơn + nút Sửa, khối “chưa tải được” + Thử lại, KHÔNG nút nhận/đổi", async () => {
    const main = await getMain();
    await getExtra();
    const un = await createOrder(A, "Khách Lỗi Handlers");
    unassign(un.id);
    const noChip = async (p, label) => {
      const rows = await p.ev(LIST_ROWS);
      assert.ok(rows.length >= 3, `${label}: danh sách vẫn hiện ${rows.length} đơn`);
      assert.ok(rows.every((r) => r.hidden === true && r.chip === false && (r.handler ?? "") === ""), `${label}: không dòng người phụ trách, không chip: ${JSON.stringify(rows.map((r) => [r.handler, r.hidden]))}`);
      assert.equal(await p.ev("!!document.body.textContent.match(/Chưa có người phụ trách/)"), false, `${label}: chữ “Chưa có người phụ trách” KHÔNG được xuất hiện khi lời gọi lỗi`);
      assert.equal(await p.ev("document.getElementById('error').hidden"), true, `${label}: không banner lỗi`);
      assert.equal(await p.ev("document.getElementById('empty').hidden"), true);
    };
    // chặn mạng
    let p = await openAs(A, "/orders", { blocked: ["*/api/dispatch/handlers*"], allow: [/ERR_BLOCKED_BY_CLIENT/, /dispatch\/handlers/] });
    await p.waitFor("document.querySelectorAll('#list .order-row').length >= 3 && !document.querySelector('#list .order-row-handler.is-pending')", "danh sách hiện, dòng chờ được gỡ", 10000);
    await noChip(p, "chặn mạng");
    assert.ok(p.failed.length >= 1, "lời gọi thật sự bị chặn");
    p.close();
    // 500 và thiếu khoá (handlers: {})
    for (const [mode, label] of [["500", "500"], ["empty", "thiếu khoá"]]) {
      p = await openAs(A, "/orders", { track: false });
      await p.waitFor(listReady(3), "danh sách xong lần tải đầu");
      await setRules(p, [{ match: "/api/dispatch/handlers", mode }]);
      await p.ev("document.getElementById('q').value = 'Khách'; document.getElementById('q').dispatchEvent(new Event('input', { bubbles: true })); true");
      await p.waitFor("window.__hook.rules[0].hits >= 1", `lời gọi handlers (${label}) đã bị bắt`, 6000);
      await p.waitFor("document.querySelectorAll('#list .order-row').length >= 3 && !document.querySelector('#list .order-row-handler.is-pending')", "danh sách tải lại xong", 8000);
      await noChip(p, label);
      p.close();
    }
    // trang đơn: A (người lập, đơn có người) và C (đơn CHƯA có người) khi handlers lỗi
    p = await openAs(A, `/order?id=${main.id}`, { blocked: ["*/api/dispatch/handlers*"], allow: [/ERR_BLOCKED_BY_CLIENT/, /dispatch\/handlers/] });
    await p.waitFor(CARD_READY, "khối Người phụ trách (lỗi)", 10000);
    assert.equal(await p.ev("document.querySelector('.handler-card .handler-unknown')?.textContent"), "Chưa tải được người phụ trách.");
    assert.deepEqual(await p.ev(CARD_BUTTONS), ["Thử lại"], "chưa biết người phụ trách: KHÔNG nút đổi/nhận, chỉ Thử lại");
    assert.deepEqual(await p.ev(ACTION_BUTTONS), ["Sửa", "Xác nhận đơn", "Huỷ đơn"], "đơn và nút Sửa/Xác nhận/Huỷ (theo canModify của máy chủ) vẫn hiện");
    assert.equal(await p.ev("document.getElementById('error').hidden"), true, "không banner lỗi");
    assert.equal(await p.ev("document.body.textContent.includes('Chưa có người phụ trách')"), false);
    assert.equal(await p.ev("document.querySelectorAll('#order .svc-view').length >= 1"), true, "nội dung đơn vẫn dựng");
    await shoot(p, "nguoi-phu-trach-loi-handlers-390.png");
    await p.send("Network.setBlockedURLs", { urls: [] });
    await p.ev(clickText(".handler-card", "Thử lại"));
    await p.waitFor(`${CARD_NAME} === 'Sales Hai'`, "Thử lại ra người phụ trách", 8000);
    assert.deepEqual(await p.ev(CARD_BUTTONS), ["Đổi người phụ trách"]);
    p.close();
    const c = await openAs(C, `/order?id=${un.id}`, { blocked: ["*/api/dispatch/handlers*"], allow: [/ERR_BLOCKED_BY_CLIENT/, /dispatch\/handlers/] });
    await c.waitFor(CARD_READY, "khối Người phụ trách (C, lỗi)", 10000);
    assert.deepEqual(await c.ev(CARD_BUTTONS), ["Thử lại"], "đơn thật sự chưa có người nhưng chưa biết → KHÔNG mời nhận");
    c.close();
  });

  // ================= j) axe + vùng chạm + tràn ngang =================
  await step("j", "axe 0 vi phạm (mọi mức) ở mọi trạng thái mới; vùng chạm ≥ 44 px; không tràn ngang ở 390 và 1040", async () => {
    const main = await getMain();
    await getExtra();
    const seen = [];
    /** axe + đo ở trạng thái hiện tại của `p`, rồi đóng trang. */
    const check = async (label, p) => {
      const v = await axeRun(p, label);
      assert.deepEqual(v, [], `axe (${label}): ${JSON.stringify(v)}`);
      const m = await measure(p, label);
      assert.deepEqual(m.nho, [], `vùng chạm < 44 px (${label})`);
      assert.ok(m.trànNgang <= 0, `tràn ngang ${m.trànNgang} px (${label})`);
      const info = await p.ev(SHEET_INFO);
      if (info) assert.ok(info.dialogOverflow <= 0 && info.overflow <= 0, `bảng chọn tràn ngang (${label}): ${JSON.stringify([info.dialogOverflow, info.overflow])}`);
      seen.push(label);
      p.close();
    };
    const BLOCK = { blocked: ["*/api/dispatch/handlers*"], allow: [/ERR_BLOCKED_BY_CLIENT/, /dispatch\/handlers/] };
    for (const [label, vp] of [["390", M], ["1040", DESK]]) {
      const un = await createOrder(A, `Khách Chip ${label}`);
      unassign(un.id);
      // danh sách: có tên và có chip (đơn chưa có người)
      let p = await openAs(A, "/orders", { viewport: vp });
      await p.waitFor(listReady(4), "danh sách", 10000);
      assert.equal((await p.ev(LIST_ROWS)).some((r) => r.chip), true, "trạng thái có chip");
      await check(`danh-sach-${label}`, p);
      // trang đơn: người lập, đơn có người, có nút đổi
      p = await openAs(A, `/order?id=${main.id}`, { viewport: vp });
      await p.waitFor(`${CARD_NAME} !== null`, "trang đơn", 10000);
      await check(`trang-don-${label}`, p);
      // trang đơn: chưa có người + hai nút
      p = await openAs(A, `/order?id=${un.id}`, { viewport: vp });
      await p.waitFor(`${CARD_BUTTONS}.length === 2`, "trang đơn chưa có người", 10000);
      await check(`trang-don-chua-co-nguoi-${label}`, p);
      // bảng chọn mở, đã chọn một người
      p = await openAs(A, `/order?id=${main.id}`, { viewport: vp });
      await openSheet(p);
      await p.ev(pick("Sales Ba"));
      await check(`bang-chon-${label}`, p);
      // bảng chọn: lỗi tải danh sách
      p = await openAs(A, `/order?id=${main.id}`, { viewport: vp, allow: [/assignees/] });
      await p.waitFor(`${CHANGE_BTN} !== null`, "nút đổi", 10000);
      await setRules(p, [{ match: "/api/dispatch/assignees", mode: "500" }]);
      await p.ev(`${CHANGE_BTN}.click(); true`);
      await p.waitFor("document.querySelector('[role=dialog] [role=alert]:not([hidden])') !== null", "lỗi tải danh sách", 8000);
      await check(`bang-chon-loi-${label}`, p);
      // bảng chọn: đang tải danh sách
      p = await openAs(A, `/order?id=${main.id}`, { viewport: vp });
      await p.waitFor(`${CHANGE_BTN} !== null`, "nút đổi", 10000);
      await setRules(p, [{ match: "/api/dispatch/assignees", mode: "gate" }]);
      await p.ev(`${CHANGE_BTN}.click(); true`);
      await p.waitFor("document.querySelector('[role=dialog] [role=status]') !== null", "trạng thái đang tải", 8000);
      assert.equal((await p.ev(SHEET_INFO)).status, "Đang tải danh sách nhân viên…");
      await check(`bang-chon-dang-tai-${label}`, p);
      // bảng chọn: lỗi khi lưu (400 invalid_assignee giả lập) — bảng còn mở, banner trong bảng, danh sách làm mới, focus không rơi ra ngoài
      p = await openAs(A, `/order?id=${main.id}`, { viewport: vp });
      await openSheet(p);
      await setRules(p, [{ match: "/handler", method: "PUT", mode: "400" }]);
      await p.ev(pick("Sales Ba"));
      await clickSave(p);
      await p.waitFor("document.querySelector('[role=dialog] [role=alert]:not([hidden])') !== null", "thông báo lỗi khi lưu", 8000);
      await p.waitFor("document.querySelectorAll('.pick input').length > 0 && document.querySelector('[role=dialog] [role=status]') === null", "danh sách được làm mới", 8000);
      const saved = await p.ev(SHEET_INFO);
      assert.equal(saved.focusIn, true, `focus phải còn trong bảng sau lỗi khi lưu (${label})`);
      await shoot(p, `nguoi-phu-trach-bang-chon-loi-luu-${label}.png`);
      await check(`bang-chon-loi-luu-${label}`, p);
      // trang đơn: chưa biết người phụ trách
      p = await openAs(A, `/order?id=${main.id}`, { viewport: vp, ...BLOCK });
      await p.waitFor("document.querySelector('.handler-card .handler-unknown') !== null", "khối chưa biết", 10000);
      await check(`trang-don-chua-biet-${label}`, p);
      // danh sách: lời gọi handlers lỗi
      p = await openAs(A, "/orders", { viewport: vp, ...BLOCK });
      await p.waitFor("document.querySelectorAll('#list .order-row').length >= 3 && !document.querySelector('#list .order-row-handler.is-pending')", "danh sách khi handlers lỗi", 10000);
      await check(`danh-sach-handlers-loi-${label}`, p);
      await assignVia(A, un.id, A); // trả đơn về cho A: các bước sau (ảnh chụp danh sách) không bị ngập trong chip
    }
    results.dem["trang-thai-axe"] = seen;
  });

  // ================= k) ảnh 390×844 và 1040×800 =================
  await step("k", "ảnh 390×844 và 1040×800: danh sách, trang đơn, bảng chọn, đơn chưa có người", async () => {
    const main = await getMain();
    await getExtra();
    for (const [suffix, vp] of [["390", M], ["1040", DESK]]) {
      let p = await openAs(A, "/orders", { viewport: vp, track: false });
      await p.waitFor(listReady(4), "danh sách", 10000);
      await shoot(p, `nguoi-phu-trach-danh-sach-${suffix}.png`);
      p.close();
      p = await openAs(A, `/order?id=${main.id}`, { viewport: vp, track: false });
      await p.waitFor(`${CARD_NAME} !== null`, "trang đơn", 10000);
      await shoot(p, `nguoi-phu-trach-trang-don-${suffix}.png`);
      p.close();
      p = await openAs(A, `/order?id=${main.id}`, { viewport: vp, track: false });
      await openSheet(p);
      await p.ev(pick("Sales Ba"));
      await shoot(p, `nguoi-phu-trach-bang-chon-${suffix}.png`);
      p.close();
    }
    const un = await createOrder(A, "Khách Chưa Có Người (ảnh)");
    unassign(un.id);
    const c = await openAs(C, `/order?id=${un.id}`, { track: false });
    await c.waitFor(`${CARD_NAME} !== null`, "trang đơn chưa có người", 10000);
    await shoot(c, "nguoi-phu-trach-chua-co-nguoi-390.png");
    c.close();
    for (const [suffix, vp] of [["390", M], ["1040", DESK]]) {
      const l = await openAs(C, "/orders", { viewport: vp, track: false });
      await l.waitFor(listReady(4), "danh sách (chip)", 10000);
      await shoot(l, `nguoi-phu-trach-danh-sach-chip-${suffix}.png`);
      l.close();
    }
  });

  // ================= l) console/CSP =================
  await step("l", "console/CSP sạch ở mọi trang đã theo dõi (trừ các dòng mạng đã biết của lỗi cố ý)", async () => {
    assert.ok(ONLY || tracked.length >= 30, `đã theo dõi ${tracked.length} trang`);
    for (const [label, p, allow] of tracked) {
      const csp = p.logEntries.filter((e) => /Content Security Policy|Refused to/i.test(e.text));
      const other = p.logEntries.filter((e) => e.level === "error" && !csp.includes(e) && !allow.some((re) => re.test(`${e.text} ${e.url ?? ""}`)));
      const problems = { csp: csp.map((e) => e.text), other: other.map((e) => `${e.source}: ${e.text} ${e.url ?? ""}`), consoleErrors: [...p.consoleErrors] };
      assert.deepEqual(problems, { csp: [], other: [], consoleErrors: [] }, `${label}: ${JSON.stringify(problems)}`);
    }
    results.dem["trang-theo-doi-console"] = tracked.length;
  });
} finally {
  for (const p of openedPages) p.close();
  await env.stop();
}
results.tongKet = { dat: passed, hong: failures };
writeFileSync(join(OUT, "ket-qua-nguoi-phu-trach.json"), JSON.stringify(results, null, 2) + "\n");
console.log(failures ? `\n${failures} bước ✗ / ${passed} bước ✓` : `\nV1 NGUOI PHU TRACH OK — ${passed} bước ✓`);
process.exitCode = failures ? 1 : 0;
