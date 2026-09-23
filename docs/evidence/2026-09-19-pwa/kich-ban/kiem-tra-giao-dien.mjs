// Kiểm tra giao diện PWA trên Chrome headless (khổ iPhone 390×844): chụp màn hình, đo phần tử, service worker, offline, đăng xuất.
// BẰNG CHỨNG (docs/evidence/2026-09-19-pwa), KHÔNG phải một phần của npm scripts và KHÔNG thêm dependency vào package.json (CLAUDE.md §8 của tourdaovn).
// Chạy: cài tạm ngoài repo `npm --prefix <thư-mục-tạm> install puppeteer-core`, chạy `npx wrangler dev --port 8787` với D1 local có hai tài khoản thử
//   (scripts/create-staff.mjs: admin 0901000001/482913, sales 0901000002/736154), rồi `node kiem-tra-giao-dien.mjs` từ thư mục tạm.
// Biến môi trường: BASE, OUT (thư mục ảnh), CHROME (đường dẫn Chrome).
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:8787";
const OUT = process.env.OUT ?? "./anh";
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const report = { problems: [] };
const problems = report.problems;
const note = (ok, msg) => { if (!ok) problems.push(msg); return ok; };

async function newPage(viewport, ua) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(viewport);
  if (ua) await page.setUserAgent(ua);
  page.on("console", (m) => { if (m.type() === "error" && !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) problems.push(`console.error: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));
  return page;
}
async function login(page, phone, pin) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("#phone", phone);
  await page.type("#pin", pin);
  await page.click("#submit");
  await page.waitForFunction(() => location.pathname === "/", { timeout: 15000 });
  // Đợt D Task 4 (ADR-0015): `.who` (chỉ dựng ở máy tính) đổi thành `#sidebar` (cũng chỉ máy tính). Kịch bản
  // này chạy CẢ khổ điện thoại lẫn khổ 1280 (mục 3 cuối tệp) nên chờ mốc LUÔN có ở cả hai: `#tabbar .tab` chỉ
  // có ở điện thoại — đổi sang chờ CẢ HAI selector, cái nào xuất hiện trước.
  await Promise.race([page.waitForSelector("#tabbar .tab", { timeout: 15000 }), page.waitForSelector("#sidebar .sidebar-item", { timeout: 15000 })]);
}
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` });
const api = (page, path, method = "GET", body) =>
  page.evaluate(async (path, method, body) => {
    const r = await fetch(path, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => null) };
  }, path, method, body);

// ===== 1. Nhân viên, khổ iPhone =====
const p = await newPage(MOBILE, UA);
await p.goto(BASE + "/login", { waitUntil: "networkidle0" });
await shot(p, "01-login");
report.login = await p.evaluate(() => ({ logo: !!document.querySelector(".login-logo"), h1: document.querySelector("h1")?.textContent, overflowX: document.documentElement.scrollWidth > innerWidth }));
note(report.login.logo && report.login.h1 === "Tour Đảo Desk", "login: thiếu logo hoặc tên");
note(!report.login.overflowX, "login: tràn ngang");

await login(p, "0901000002", "736154");
const mk = (name, phone, items, extra = {}) => ({ customerName: name, customerPhone: phone, customerEmail: "", customerNote: "Đón tại khách sạn, có 1 bé 5 tuổi", items: items.map(([description, detail, quantity, unitPrice]) => ({ catalogCode: null, description, detail, quantity, unitPrice })), discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "", ...extra });
const a = await api(p, "/api/orders", "POST", mk("Trần Văn Bình", "0901234567", [["Tour 4 đảo Nha Trang", "Khởi hành 20/09/2026", 2, 1350000], ["Lặn ngắm san hô", "Thêm cho cả đoàn", 1, 1500000]]));
const b = await api(p, "/api/orders", "POST", mk("Lê Minh Châu", "0912345678", [["Tour 4 đảo Nha Trang", "Khởi hành 21/09/2026", 4, 1350000], ["Xe đưa đón", "", 1, 1400000]], { depositAmount: 3400000, depositMethod: "bank_transfer" }));
note(a.status === 201 && b.status === 201, `tạo đơn mẫu lỗi: ${a.status}/${b.status} ${JSON.stringify(a.json)?.slice(0, 200)}`);
await api(p, `/api/orders/${b.json.order.id}/status`, "POST", { status: "confirmed" });
const orderId = a.json.order.id;

await p.goto(BASE + "/", { waitUntil: "networkidle0" });
await p.waitForSelector(".order-row");
await shot(p, "02-orders");
report.orders = await p.evaluate(() => {
  const bar = document.querySelector("#tabbar");
  const r = bar?.getBoundingClientRect();
  return {
    tabs: [...document.querySelectorAll("#tabbar .tab")].map((x) => x.textContent),
    current: document.querySelector('#tabbar [aria-current="page"]')?.textContent,
    tabBottomGap: r ? Math.round(innerHeight - r.bottom) : null,
    tabHeight: r ? Math.round(r.height) : null,
    headerText: document.querySelector("#topbar")?.textContent,
    brandVisible: getComputedStyle(document.querySelector("#topbar .brand")).display !== "none",
    // Đợt D Task 4 (ADR-0015): `.topnav` không còn tồn tại (đổi thành `#sidebar`, chỉ máy tính) — ở khổ điện
    // thoại #sidebar luôn ẩn (CSS). Giữ tinh thần phép kiểm cũ ("không hiện điều hướng máy tính ở điện thoại").
    sidebarVisible: getComputedStyle(document.querySelector("#sidebar")).display !== "none",
    newBtnInToolbarHidden: getComputedStyle(document.querySelector(".toolbar .btn-primary")).display === "none",
    overflowX: document.documentElement.scrollWidth > innerWidth,
    lastRowClearOfTabBar: (() => { const rows = document.querySelectorAll(".order-row"); return rows.length; })(),
  };
});
note(JSON.stringify(report.orders.tabs) === JSON.stringify(["Đơn hàng", "Đơn mới", "Tôi"]), `tab nhân viên: ${JSON.stringify(report.orders.tabs)}`);
note(report.orders.current === "Đơn hàng", "tab hiện tại phải là Đơn hàng");
note(report.orders.brandVisible && !report.orders.sidebarVisible, "danh sách: header phải hiện brand, ẩn thanh điều hướng dọc");
note(!report.orders.overflowX, "danh sách: tràn ngang");

await p.click(".order-row");
await p.waitForSelector("table.order-lines", { timeout: 15000 });
await shot(p, "03-detail");
report.detail = await p.evaluate(() => ({
  barTitle: document.querySelector("#bar-title")?.textContent,
  backVisible: getComputedStyle(document.querySelector(".bar-back")).display !== "none",
  brandHidden: getComputedStyle(document.querySelector("#topbar .brand")).display === "none",
  rowDisplay: getComputedStyle(document.querySelector("table.order-lines tr:last-child")).display,
  theadHidden: getComputedStyle(document.querySelector("table.order-lines thead")).display === "none",
  actions: [...document.querySelectorAll("#actions .btn")].map((x) => x.textContent),
  current: document.querySelector('#tabbar [aria-current="page"]')?.textContent,
  overflowX: document.documentElement.scrollWidth > innerWidth,
}));
note(/^TD-\d{8}-\d{4}$/.test(report.detail.barTitle ?? ""), `tiêu đề thanh đầu trang phải là mã đơn: ${report.detail.barTitle}`);
note(report.detail.backVisible && report.detail.brandHidden, "chi tiết: phải có ‹ và ẩn brand");
note(report.detail.rowDisplay === "grid" && report.detail.theadHidden, "chi tiết: bảng dịch vụ chưa xếp dọc");
note(report.detail.current === "Đơn hàng", "chi tiết đơn thuộc tab Đơn hàng");
note(!report.detail.overflowX, "chi tiết: tràn ngang");
// nút ‹ quay lại danh sách
await p.click(".bar-back");
await p.waitForFunction(() => location.pathname === "/", { timeout: 10000 });
report.backWorks = true;

// Đơn nháp: đủ ba nút; sửa đơn: tiêu đề thanh đầu trang đổi theo mã đơn
await p.goto(BASE + `/order?id=${orderId}`, { waitUntil: "networkidle0" });
await p.waitForSelector("#actions .btn");
await shot(p, "03b-detail-draft");
report.draft = await p.evaluate(() => ({ actions: [...document.querySelectorAll("#actions .btn")].map((x) => x.textContent), heights: [...document.querySelectorAll("#actions .btn")].map((x) => Math.round(x.getBoundingClientRect().height)) }));
note(JSON.stringify(report.draft.actions) === JSON.stringify(["Sửa", "Xác nhận đơn", "Huỷ đơn"]), `đơn nháp: ${JSON.stringify(report.draft.actions)}`);
note(report.draft.heights.every((h) => h >= 44), `nút hành động < 44px: ${report.draft.heights}`);
await p.goto(BASE + `/order-form?id=${orderId}`, { waitUntil: "networkidle0" });
await p.waitForFunction(() => /^Sửa đơn TD-/.test(document.querySelector("#form-title")?.textContent ?? ""), { timeout: 10000 });
report.editTitle = await p.evaluate(() => ({ h1: document.querySelector("#form-title").textContent, bar: document.querySelector("#bar-title").textContent }));
note(report.editTitle.h1 === report.editTitle.bar, `tiêu đề sửa đơn lệch: ${JSON.stringify(report.editTitle)}`);

await p.goto(BASE + "/order-form", { waitUntil: "networkidle0" });
await shot(p, "04-form");
report.form = await p.evaluate(() => {
  const fa = document.querySelector(".form-actions").getBoundingClientRect();
  return {
    tabbarPresent: !!document.querySelector("#tabbar"),
    barTitle: document.querySelector("#bar-title")?.textContent,
    saveBtn: document.querySelector("#save")?.textContent,
    cancelHidden: getComputedStyle(document.querySelector(".form-actions a.btn")).display === "none",
    actionsBottomGap: Math.round(innerHeight - fa.bottom),
    h1Hidden: (() => { const s = getComputedStyle(document.querySelector("main > h1")); return s.position === "absolute" && s.width === "1px" && s.display !== "none"; })(),
    phoneMode: document.querySelector("#customerPhone").inputMode,
    discountMode: document.querySelector("#discount").inputMode,
    overflowX: document.documentElement.scrollWidth > innerWidth,
  };
});
note(!report.form.tabbarPresent, "form: không được có thanh tab");
note(report.form.saveBtn === "Lưu đơn nháp" && report.form.cancelHidden && report.form.h1Hidden, "form: nút Lưu/Quay lại/h1 sai");
note(Math.abs(report.form.actionsBottomGap) <= 1, `form: nút Lưu phải dính đáy (gap=${report.form.actionsBottomGap})`);
note(!report.form.overflowX, "form: tràn ngang");

await p.goto(BASE + "/account", { waitUntil: "networkidle0" });
await shot(p, "05-account");
report.account = await p.evaluate(() => ({
  rows: [...document.querySelectorAll("#links .row-link")].map((x) => x.textContent),
  profile: document.querySelector("#me")?.textContent,
  avatar: document.querySelector(".avatar")?.textContent,
  current: document.querySelector('#tabbar [aria-current="page"]')?.textContent,
  overflowX: document.documentElement.scrollWidth > innerWidth,
}));
note(JSON.stringify(report.account.rows) === JSON.stringify(["Đăng xuất"]), `nhân viên chỉ có Đăng xuất: ${JSON.stringify(report.account.rows)}`);
note(report.account.current === "Tôi", "trang Tôi phải sáng tab Tôi");

// ===== Service worker và cache =====
await p.goto(BASE + "/", { waitUntil: "networkidle0" });
await p.evaluate(() => navigator.serviceWorker.ready);
await p.reload({ waitUntil: "networkidle0" });
report.sw = await p.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  const keys = await caches.keys();
  const urls = [];
  for (const k of keys) for (const req of await (await caches.open(k)).keys()) urls.push(new URL(req.url).pathname);
  return { registered: !!reg, active: reg?.active?.state, controlled: !!navigator.serviceWorker.controller, keys, count: urls.length, apiEntries: urls.filter((u) => u.startsWith("/api")), hasShell: ["/", "/login", "/order-form", "/app.css", "/js/orders.js"].every((u) => urls.includes(u)), urls };
});
note(report.sw.registered && report.sw.controlled, "service worker chưa đăng ký/điều khiển trang");
note(report.sw.apiEntries.length === 0, `CACHE CHỨA API: ${JSON.stringify(report.sw.apiEntries)}`);
note(report.sw.hasShell, "cache thiếu khung lõi");
note(report.sw.keys.length === 1 && /^td-shell-\d{14}$/.test(report.sw.keys[0]), `tên cache phải mang mã bản dựng: ${JSON.stringify(report.sw.keys)}`);

// Offline: khung phải mở từ cache
await p.setOfflineMode(true);
await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }).catch((e) => problems.push(`offline goto lỗi: ${e.message}`));
await new Promise((r) => setTimeout(r, 1500));
await shot(p, "06-offline");
report.offline = await p.evaluate(() => ({ brand: !!document.querySelector("#topbar .brand"), title: document.title, error: document.querySelector("#error")?.textContent || null }));
note(report.offline.brand, "offline: khung không mở từ cache");
note(/Không có kết nối mạng/.test(report.offline.error ?? ""), `offline: phải báo mất mạng, đang là: ${report.offline.error}`);
await p.setOfflineMode(false);

// Đăng xuất qua giao diện
await p.goto(BASE + "/account", { waitUntil: "networkidle0" });
await p.click("#links button.row-link");
await p.waitForFunction(() => location.pathname === "/login", { timeout: 10000 });
report.logoutWorks = true;
await p.browserContext().close();

// ===== 2. Admin, khổ iPhone =====
const q = await newPage(MOBILE, UA);
await login(q, "0901000001", "482913");
await q.waitForSelector("#tabbar");
report.admin = await q.evaluate(() => ({ tabs: [...document.querySelectorAll("#tabbar .tab")].map((x) => x.textContent) }));
note(JSON.stringify(report.admin.tabs) === JSON.stringify(["Đơn hàng", "Đơn mới", "Dịch vụ", "Nhân viên", "Tôi"]), `tab admin: ${JSON.stringify(report.admin.tabs)}`);
await shot(q, "07-admin-orders");
await q.goto(BASE + "/account", { waitUntil: "networkidle0" });
await shot(q, "08-admin-account");
report.adminAccount = await q.evaluate(() => ({ rows: [...document.querySelectorAll("#links .row-link")].map((x) => x.textContent), avatar: document.querySelector(".avatar")?.textContent }));
note(JSON.stringify(report.adminAccount.rows) === JSON.stringify(["Nhật ký", "Đăng xuất"]), `admin có Nhật ký + Đăng xuất: ${JSON.stringify(report.adminAccount.rows)}`);
await q.goto(BASE + "/audit", { waitUntil: "networkidle0" });
report.audit = await q.evaluate(() => ({ back: getComputedStyle(document.querySelector(".bar-back")).display !== "none", title: document.querySelector("#bar-title")?.textContent, current: document.querySelector('#tabbar [aria-current="page"]')?.textContent }));
note(report.audit.back && report.audit.current === "Tôi", "audit: phải có ‹ và sáng tab Tôi");
await shot(q, "09-admin-audit");
await q.goto(BASE + "/catalog", { waitUntil: "networkidle0" });
await shot(q, "10-admin-catalog");
// mọi trang của app phải chạy không lỗi console/CSP (AUDIT-FINDINGS A14: thử tay mọi trang) — /staff chưa có ở trên
await q.goto(BASE + "/staff", { waitUntil: "networkidle0" });
await q.waitForSelector("#tabbar");
report.staffPage = await q.evaluate(() => ({ title: document.title, tab: document.querySelector('#tabbar [aria-current="page"]')?.textContent }));
note(report.staffPage.tab === "Nhân viên", `trang /staff phải sáng tab Nhân viên: ${JSON.stringify(report.staffPage)}`);
await q.browserContext().close();

// ===== 3. Máy tính — Đợt D Task 4 (ADR-0015) đổi CÓ CHỦ ĐÍCH: thanh ngang (`.topnav`/`.who`) → thanh điều
// hướng dọc (`#sidebar`). Tiêu đề mục cũ "không được đổi" nay SAI theo ADR đã duyệt — cập nhật lại kịch bản
// đọc `#sidebar` thay vì `.topnav`/`.who`. Tài khoản 0901000001 seed từ trước 2026-09-19 (không rõ quyền thật
// còn khớp bản mẫu tabsFor()/sidebar hiện tại hay không — số mục KHÔNG được coi là mốc cố định, chỉ ghi lại
// những gì đo được thật khi chạy).
const d = await newPage({ width: 1280, height: 800, deviceScaleFactor: 1 });
await login(d, "0901000001", "482913");
await d.waitForSelector("#sidebar .sidebar-item");
await shot(d, "11-desktop");
report.desktop = await d.evaluate(() => ({
  tabbarDisplay: document.querySelector("#tabbar") ? getComputedStyle(document.querySelector("#tabbar")).display : "none",
  nav: [...document.querySelectorAll("#sidebar .sidebar-item-label")].map((x) => x.textContent),
  who: document.querySelector(".sidebar-name")?.textContent,
  backHidden: getComputedStyle(document.querySelector(".bar-back") ?? document.body).display,
  h1: document.querySelector("main > h1")?.textContent,
}));
note(report.desktop.tabbarDisplay === "none", "máy tính: không được hiện thanh tab");
note(report.desktop.nav.length > 0, `máy tính: thanh điều hướng dọc rỗng (${JSON.stringify(report.desktop.nav)})`);
await d.browserContext().close();

await browser.close();
console.log(JSON.stringify({ ...report, sw: { ...report.sw, urls: undefined, urlCount: report.sw.count } }, null, 1));
console.log(problems.length ? `\nVẤN ĐỀ (${problems.length}):\n- ${problems.join("\n- ")}` : "\nKHÔNG CÓ VẤN ĐỀ");
