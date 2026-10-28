// Kịch bản Chrome đợt 0 — khung chung (đặc tả docs/superpowers/specs/2026-10-28-dot-0-khung-chung/DAC-TA.md mục 10; kế hoạch Task 15, 12 bước).
// Mỗi bước một khối `buoc()` (✓/✗, không dừng ở bước hỏng đầu tiên), đo bằng getComputedStyle / getClientRects, chụp ảnh vào OUT/anh.
// Thêm các điểm người kiểm các task trước để lại (bước 13–17): thứ tự thanh trên ở 700 và Trang chủ, mặt nạ mờ thanh bên (màn thấp/cao),
// nút Trợ lý ở 390, thanh tab ở trang Hỗ trợ, nút nguy hiểm khi rê chuột và hai nút xếp dọc ở điện thoại.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh [OUT=<thư mục>] node docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/dot-0-smoke.mjs
// Thiếu AXE_JS ⇒ dừng ngay (không có bước "chưa chạy axe"). ONLY=1,4,9 chạy vài bước.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

if (!process.env.AXE_JS) throw new Error("Thiếu biến AXE_JS (axe.min.js ngoài repo) — kịch bản không chạy khi thiếu kiểm màu.");
const AXE = readFileSync(process.env.AXE_JS, "utf8");
const OUT = process.env.OUT ?? "/tmp/dot-0-smoke";
mkdirSync(join(OUT, "anh"), { recursive: true });
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };
const TQ = ACCOUNTS.chu; // Quản trị + Toàn quyền (như tài khoản chủ thật)

const loi = [];
const axeNhe = [];
async function buoc(id, ten, fn) {
  if (ONLY && !ONLY.has(String(id))) return;
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    const msg = String(e?.stack ?? e).split("\n").slice(0, 14).join("\n    ");
    loi.push(`${id}) ${ten}: ${String(e?.message ?? e).split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${msg}`);
  }
}

const env = await startEnv();
const moi = [];
async function mo(acc, path, vp = MOB) {
  const p = await env.as(acc, path, vp);
  moi.push(p);
  await p.waitFor("document.getElementById('topbar')?.children.length > 0 && !document.querySelector('[data-khung-tam]')", `khung trang ${path}`, 12000);
  return p;
}
async function dong(p) {
  try { await p.send("Page.close"); } catch { /* đã đóng */ }
  p.close();
}
async function chup(p, ten) {
  await sleep(500);
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, "anh", `${ten}.png`), Buffer.from(r.result.data, "base64"));
}
async function axeKiem(p, nhan) {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const vi = await p.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }).then((r) => r.violations.map((v) => ({ impact: v.impact, id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })))`);
  const nang = vi.filter((v) => v.impact === "critical" || v.impact === "serious");
  for (const v of vi.filter((x) => !nang.includes(x))) axeNhe.push(`${nhan}: ${v.impact} ${v.id} — ${v.nodes.join(" | ")}`);
  assert.deepEqual(nang, [], `axe nghiêm trọng (${nhan}): ${JSON.stringify(nang)}`);
}
// Gọi API bằng phiên riêng (dựng dữ liệu, không kiểm giao diện). Bán hàng chỉ một phiên: chỉ gọi khi không có trang Bán hàng nào mở.
const call = async (acc, method, path, body) => {
  const c = await env.login(acc);
  const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const hien = (sel) => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && getComputedStyle(e).display !== 'none' && e.getClientRects().length > 0; })()`;
// `#tabbar a > span:last-child` (con TRỰC TIẾP): bộ chọn của brief `#tabbar a span:last-child` còn khớp chấm «Có bản mới» (`.new-dot`, span cuối trong `.tab-icon` của tab Tôi) ⇒ thừa một chuỗi rỗng.
const nhanTab = "[...document.querySelectorAll('#tabbar a > span:last-child')].map((s) => s.textContent.trim())";
const dangSang = (scope) => `[...document.querySelectorAll('${scope} [aria-current]')].map((e) => e.textContent.trim())`;
const thuTuThanhTren = `(() => { const c = [...document.getElementById('topbar').children]; const i = (f) => c.findIndex(f);
  return { tim: i((e) => e.classList.contains('topbar-search')), tao: i((e) => e.classList.contains('topbar-new')), chuong: i((e) => e.classList.contains('bell')), troLy: i((e) => e.id === 'tl-nut'),
    hien: c.filter((e) => e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none').map((e) => e.id || e.className) }; })()`;

try {
  // Dữ liệu: một đơn nháp thật của Bán hàng (bước 6).
  const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const tao = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách Đợt Không", customerPhone: "0903 111 333", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "TTB06", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800000 }, ...NO_TRIP }],
  });
  assert.equal(tao.status, 201, JSON.stringify(tao.json));
  const donId = tao.json.order.id;

  await buoc(1, "390 Bán hàng /orders: thanh tab Trang chủ · Đơn hàng · Tạo đơn · Danh bạ · Tôi, nút thứ 3 là tab-new", async () => {
    const p = await mo(ACCOUNTS.salesA, "/orders");
    await p.waitFor("document.querySelectorAll('#tabbar a').length > 0", "thanh tab");
    assert.deepEqual(await p.ev(nhanTab), ["Trang chủ", "Đơn hàng", "Tạo đơn", "Danh bạ", "Tôi"]);
    assert.equal(await p.ev("document.querySelectorAll('#tabbar a')[2].classList.contains('tab-new')"), true);
    assert.equal(await p.ev(hien("#tabbar")), true);
    await chup(p, "01-ban-hang-orders-390");
    await dong(p);
  });

  await buoc(2, "390 Kế toán /so-cong-no: thanh tab hiện, 4 mục, chỉ «Sổ công nợ» sáng", async () => {
    const p = await mo(ACCOUNTS.accounting, "/so-cong-no");
    await p.waitFor("document.querySelectorAll('#tabbar a').length > 0", "thanh tab");
    await sleep(1500); // dữ liệu về, thanh dính (nếu có) đã hiện
    assert.notEqual(await p.ev("getComputedStyle(document.getElementById('tabbar')).display"), "none");
    assert.equal(await p.ev("document.querySelectorAll('#tabbar a').length"), 4);
    assert.deepEqual(await p.ev(dangSang("#tabbar")), ["Sổ công nợ"]);
    await chup(p, "02-ke-toan-so-cong-no-390");
    await dong(p);
  });

  await buoc(3, "390 Quản trị /xe: thanh dính hiện ⇒ thanh tab display none; /order không mã ⇒ thiếu mã, «Đơn hàng» sáng", async () => {
    const p = await mo(ACCOUNTS.admin, "/xe");
    await p.waitFor("document.querySelector('.vc-bottom-bar')?.getClientRects().length > 0", ".vc-bottom-bar hiện", 10000);
    await p.waitFor("getComputedStyle(document.getElementById('tabbar')).display === 'none'", "thanh tab ẩn khi thanh dính hiện", 3000);
    await chup(p, "03a-quan-tri-xe-390");
    await p.send("Page.navigate", { url: `${env.base}/order?id=` });
    await p.waitFor("!!document.querySelector('[data-loai=\"thieu-ma\"]')", "trạng thái thiếu mã", 10000);
    assert.deepEqual(await p.ev(dangSang("#tabbar")), ["Đơn hàng"]);
    await chup(p, "03b-thieu-ma-don-390");
    await dong(p);
  });

  await buoc(4, "1040 Toàn quyền /: thanh bên 10 khối hiện sẵn, Điều phối gập 2 mục, không .sidebar-new, Tab đầu = «Bỏ qua», Enter vào main", async () => {
    const p = await mo(TQ, "/", DESK);
    await p.waitFor("!!document.querySelector('#sidebar .sidebar-groups')", "thanh bên");
    const khoi = await p.ev(`(() => { const out = []; const g = document.querySelector('#sidebar .sidebar-groups');
      const walk = (el) => { for (const c of el.children) {
        if (c.classList.contains('sidebar-group-toggle')) { out.push(c.firstChild.textContent.trim()); continue; }
        if (c.classList.contains('sidebar-group-items') && c.id) continue; // thân khối gập: không đếm
        if (c.classList.contains('sidebar-item')) { out.push(c.querySelector('.sidebar-item-label').firstChild.textContent.trim()); continue; }
        walk(c); } };
      walk(g); return out; })()`);
    assert.deepEqual(khoi, ["Trang chủ", "Đơn hàng", "Danh bạ", "Điều phối", "Xe đang chạy", "Xe & giấy tờ", "Giá & chi phí", "Điều chỉnh công nợ", "Sổ công nợ & khoá sổ", "Thiết lập"]);
    // Đặc tả/brief gọi id «nhom-dieu-phoi»; mã đặt `nhom-gap-<ma>` (shell.ts sidebarGroup) — dùng id thật.
    assert.equal(await p.ev("!!document.querySelector('button[aria-controls=\"nhom-gap-dieu-phoi\"]')"), true, "nút gập Điều phối");
    await p.ev("document.querySelector('button[aria-controls=\"nhom-gap-dieu-phoi\"]').click(); true");
    await p.waitFor("!document.getElementById('nhom-gap-dieu-phoi').hidden", "khối Điều phối mở");
    assert.deepEqual(await p.ev("[...document.querySelectorAll('#nhom-gap-dieu-phoi .sidebar-item-label')].map((e) => e.firstChild.textContent.trim())"), ["Điều phối xe", "Đề nghị chuyển khách"]);
    assert.equal(await p.ev("document.querySelectorAll('.sidebar-new').length"), 0);
    await chup(p, "04a-toan-quyen-trang-chu-1040");
    await p.ev("document.activeElement?.blur(); window.scrollTo(0,0); true");
    await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
    assert.equal(await p.ev("document.activeElement.classList.contains('bo-qua')"), true, "Tab lần đầu vào «Bỏ qua»");
    assert.equal(await p.ev("getComputedStyle(document.activeElement).transform === 'none' || document.activeElement.getBoundingClientRect().top >= 0"), true, "«Bỏ qua» hiện khi có tiêu điểm");
    await chup(p, "04b-bo-qua-1040");
    await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
    await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await sleep(300);
    assert.equal(await p.ev("document.activeElement.tagName"), "MAIN");
    await dong(p);
  });

  await buoc(5, "1040 Bán hàng /audit: 403 có vỏ, không mục sáng, không ô tìm, nút «Về trang đầu của bạn» → /", async () => {
    const p = await mo(ACCOUNTS.salesA, "/audit", DESK);
    await sleep(1500);
    await chup(p, "05-ban-hang-audit-403-1040");
    assert.equal(await p.ev("document.body.dataset.trangThai ?? null"), "403", "body[data-trang-thai=403]");
    assert.deepEqual(await p.ev("[...document.querySelectorAll('#sidebar [aria-current], #tabbar [aria-current]')].length"), 0);
    assert.equal(await p.ev("document.querySelectorAll('.topbar-search').length"), 0);
    assert.deepEqual(await p.ev("[...document.querySelectorAll('main a.nut')].map((a) => [a.textContent.trim(), a.getAttribute('href')])"), [["Về trang đầu của bạn", "/"]]);
    await dong(p);
  });

  await buoc(6, "1040 Bán hàng /orders: thanh trên ô tìm → Tạo đơn → chuông → Trợ lý, không .tl-fab, tiêu đề cắt; /order?id= có đường dẫn «Đơn hàng ›»", async () => {
    const p = await mo(ACCOUNTS.salesA, "/orders", DESK);
    await p.waitFor("!!document.querySelector('#topbar .bell')", "chuông");
    await p.waitFor("!!document.getElementById('tl-nut')", "nút Trợ lý", 6000);
    const t = await p.ev(thuTuThanhTren);
    assert.ok(t.tim >= 0 && t.tim < t.tao && t.tao < t.chuong && t.chuong < t.troLy, JSON.stringify(t));
    assert.equal(await p.ev("document.querySelectorAll('.tl-fab').length"), 0);
    assert.equal(await p.ev("getComputedStyle(document.querySelector('.bar-title')).overflow"), "hidden");
    await chup(p, "06a-ban-hang-orders-1040");
    await p.send("Page.navigate", { url: `${env.base}/order?id=${donId}` });
    await p.waitFor("document.querySelector('a.bar-duong')?.getClientRects().length > 0", "đường dẫn trang cha", 10000);
    assert.equal(await p.ev("document.querySelector('a.bar-duong').textContent.replace('›','').trim()"), "Đơn hàng");
    await chup(p, "06b-ban-hang-don-1040");
    await dong(p);
  });

  await buoc(7, "/khong-co-trang-nay: 404 + text/html; mở khi đã đăng nhập ⇒ trang 404 có vỏ", async () => {
    const p = await mo(ACCOUNTS.salesA, "/orders");
    const r = await p.ev("fetch('/khong-co-trang-nay').then((x) => [x.status, x.headers.get('content-type')])");
    assert.equal(r[0], 404);
    assert.match(r[1], /text\/html/);
    const a = await p.ev("fetch('/api/khong-co').then(async (x) => [x.status, x.headers.get('content-type')])");
    assert.equal(a[0], 404);
    assert.match(a[1], /json/);
    await p.send("Page.navigate", { url: `${env.base}/khong-co-trang-nay` });
    await p.waitFor("!!document.querySelector('[data-loai=\"404\"]')", "trang 404", 10000);
    assert.equal(await p.ev(hien("#tabbar")), true, "404 giữ thanh tab");
    assert.deepEqual(await p.ev(dangSang("#tabbar")), []);
    await chup(p, "07-404-390");
    await dong(p);
  });

  await buoc(8, "Toàn quyền bật bảo trì: Trang chủ 390 có .dai[data-loai=bao-tri], không viên cũ; tắt lại", async () => {
    const bat = await call(TQ, "PUT", "/api/maintenance", { on: true, endsAt: new Date(Date.now() + 60 * 60e3).toISOString() });
    assert.equal(bat.status, 200, JSON.stringify(bat.json));
    try {
      const p = await mo(TQ, "/");
      await p.waitFor("!!document.querySelector('.dai[data-loai=\"bao-tri\"]')", "dải bảo trì", 10000);
      assert.equal(await p.ev("document.querySelectorAll('.dash-dai-bao-tri, .dash-hero-bao-tri, .maint-strip').length"), 0);
      assert.equal(await p.ev("document.querySelectorAll('#strips .dai').length"), 1, "chỉ một dải");
      await chup(p, "08-bao-tri-trang-chu-390");
      await dong(p);
    } finally {
      const tat = await call(TQ, "PUT", "/api/maintenance", { on: false });
      assert.equal(tat.status, 200, JSON.stringify(tat.json));
    }
  });

  for (const [ten, vp] of [["390", MOB], ["1040", DESK]]) {
    await buoc(9, `axe ${ten}: /orders (Bán hàng), /thiet-lap (Toàn quyền), /audit 403 (Bán hàng) — không lỗi critical/serious`, async () => {
      for (const [acc, path, cho] of [[TQ, "/thiet-lap", "document.querySelectorAll('#tl-muc a.dong').length > 0"], [ACCOUNTS.salesA, "/orders", "document.getElementById('loading').hidden"], [ACCOUNTS.salesA, "/audit", "true"]]) {
        const p = await mo(acc, path, vp);
        await p.waitFor(cho, `${path} tải xong`, 10000);
        await sleep(800);
        await axeKiem(p, `${path} ${ten}`);
        await dong(p);
      }
    });
  }

  await buoc(10, "390 Toàn quyền /dieu-kien-xuat-ben: «Đóng» mở hộp xác nhận alertdialog có nút đỏ; Esc giữ nguyên, không gọi /dong", async () => {
    const p = await mo(TQ, "/dieu-kien-xuat-ben");
    await p.waitFor("!!document.querySelector('[data-action=\"dong-dieu-kien\"]')", "có điều kiện đang mở", 10000);
    await p.ev("document.querySelector('[data-action=\"dong-dieu-kien\"]').click(); true");
    await p.waitFor("!!document.querySelector('[role=\"alertdialog\"]')", "hộp xác nhận");
    await sleep(500);
    assert.equal(await p.ev("!!document.querySelector('[role=\"alertdialog\"] .btn-danger')"), true);
    // Điện thoại: hai nút xếp dọc, nút giữ nằm DƯỚI (sát ngón cái); nút đỏ đặc.
    const nut = await p.ev(`(() => { const d = document.querySelector('[role="alertdialog"]'); const g = [...d.querySelectorAll('.sheet-foot-xac-nhan .btn')].find((b) => !b.classList.contains('btn-danger')); const n = d.querySelector('.btn-danger');
      const rg = g.getBoundingClientRect(), rn = n.getBoundingClientRect(); return { giuTren: rg.top, nguyTren: rn.top, nguyDuoi: rn.bottom, nen: getComputedStyle(n).backgroundColor, chu: getComputedStyle(n).color }; })()`);
    assert.ok(nut.giuTren >= nut.nguyDuoi, `nút giữ phải ở dưới nút nguy hiểm: ${JSON.stringify(nut)}`);
    assert.notEqual(nut.nen, "rgba(0, 0, 0, 0)", `nút nguy hiểm đặc: ${JSON.stringify(nut)}`);
    await axeKiem(p, "hộp xác nhận 390");
    await chup(p, "10a-hop-xac-nhan-390");
    await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await p.waitFor("!document.querySelector('[role=\"alertdialog\"]')", "Esc đóng hộp", 3000);
    await sleep(500);
    assert.equal(p.requests.filter((r) => /\/dong$/.test(r.url)).length, 0, "không gọi /dong");
    await dong(p);
  });

  await buoc(11, "390 Bán hàng /orders: báo ngắn .toast[data-tong=la] nằm trên thanh tab, tự tắt", async () => {
    // Brief ghi "/order-form thêm một dịch vụ" nhưng ô chọn dịch vụ cố ý KHÔNG bật thông báo nổi (web/catalog-picker.ts: vùng aria-live đọc "Đã thêm …"), và ở form
    // lập đơn vùng thông báo đứng DƯỚI thanh bước ở đầu trang (luật M-3), nên phép so với thanh tab không áp ở đó. Dùng đường thật duy nhất bật báo ngắn xanh lá:
    // máy chủ trả "lần bấm trước đã được ghi" (header Idempotent-Replayed) — chỉ phản hồi được thay bằng Fetch của CDP, mã trang chạy nguyên (web/api.ts baoDaGhi).
    const p = await mo(ACCOUNTS.salesA, "/orders");
    await p.waitFor("document.getElementById('loading').hidden", "danh sách về");
    // Bọc fetch của trang chỉ cho MỘT lần gọi /api/orders kế tiếp (mã api.ts chạy nguyên).
    await p.ev(`(() => { const f = window.fetch.bind(window); let lan = 0; window.fetch = (u, o) => { if (!lan && String(u).startsWith('/api/orders?')) { lan = 1;
      return Promise.resolve(new Response(JSON.stringify({ da_ghi_truoc_do: true, ket_qua: null }), { status: 200, headers: { 'content-type': 'application/json', 'Idempotent-Replayed': 'true' } })); } return f(u, o); };
      addEventListener('beforeunload', (e) => { e.preventDefault(); e.returnValue = ''; }); return true; })()`);
    // Gõ vào ô tìm bằng phím thật (trang có kích hoạt của người dùng ⇒ hộp "rời trang?" được phép hiện để chặn lần tải lại của baoDaGhi).
    await p.ev("document.getElementById('q').focus(); true");
    for (const k of "kh") {
      await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, text: k });
      await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: k });
    }
    await p.waitFor("!!document.querySelector('.toast[data-tong=\"la\"]')", "báo ngắn xanh lá", 5000);
    const luc = Date.now(); // mốc toast xuất hiện: phép «tự tắt» đo ở +3,5 s từ đây
    await sleep(400);
    const r = await p.ev(`(() => { const t = document.querySelector('.toast[data-tong="la"]').getBoundingClientRect(); const tb = document.getElementById('tabbar');
      const d = [...document.querySelectorAll('.thanh-hanh-dong-cuoi, .vc-bottom-bar, .form-actions, .chan-dinh')].find((e) => e.offsetParent !== null);
      const day = d ?? (getComputedStyle(tb).display !== 'none' ? tb : null); return { duoi: t.bottom, tren: day ? day.getBoundingClientRect().top : innerHeight, cau: document.querySelector('.toast[data-tong="la"]').textContent }; })()`);
    assert.ok(r.duoi < r.tren, `đáy toast ${r.duoi} phải trên mép ${r.tren}`);
    await chup(p, "11-bao-ngan-390");
    // baoDaGhi tải lại trang sau 1,2 s: hộp "rời trang?" chặn (bấm Ở lại) để đo được lúc toast tự tắt.
    while (Date.now() - luc < 3500) {
      await p.send("Page.handleJavaScriptDialog", { accept: false }); // không có hộp nào: CDP trả lỗi trong kết quả, không ném
      await sleep(100);
    }
    const daTaiLai = await p.ev("performance.getEntriesByType('navigation')[0]?.type === 'reload'");
    if (daTaiLai) console.log("    · trang đã tải lại (hộp «rời trang?» không hiện) — phép đo «tự tắt» chỉ còn nghĩa yếu");
    assert.equal(await p.ev("document.querySelectorAll('.toast[data-tong=\"la\"]').length"), 0, "sau 3,5 s không còn báo ngắn");
    await dong(p);
  });

  await buoc(12, "390 Quản trị /thiet-lap: chỉ «Thiết lập» sáng, ≥ 10 dòng; Bán hàng mở /thiet-lap ⇒ 403", async () => {
    const p = await mo(ACCOUNTS.admin, "/thiet-lap");
    await p.waitFor("document.querySelectorAll('#tl-muc a.dong').length > 0", "mục lục");
    assert.deepEqual(await p.ev(dangSang("#tabbar")), ["Thiết lập"]);
    assert.ok((await p.ev("document.querySelectorAll('a.dong').length")) >= 10);
    await chup(p, "12a-quan-tri-thiet-lap-390");
    await dong(p);
    const q = await mo(ACCOUNTS.salesA, "/thiet-lap");
    await q.waitFor("document.body.dataset.trangThai === '403'", "403", 8000);
    await chup(q, "12b-ban-hang-thiet-lap-403-390");
    await dong(q);
  });

  // ---- Điểm người kiểm task trước để lại ----
  await buoc(13, "thứ tự thanh trên ở 700 (Bán hàng /orders) và 1040 (Trang chủ Bán hàng): Tạo đơn → chuông → Trợ lý", async () => {
    for (const [ten, vp, path] of [["700", { width: 700, height: 900, mobile: false }, "/orders"], ["1040", DESK, "/"]]) {
      const p = await mo(ACCOUNTS.salesA, path, vp);
      await p.waitFor("!!document.querySelector('#topbar .bell') && !!document.getElementById('tl-nut')", "chuông + Trợ lý", 8000);
      const t = await p.ev(thuTuThanhTren);
      assert.ok(t.tao < t.chuong && t.chuong < t.troLy && (t.tim < 0 || t.tim < t.tao), `${ten} ${path}: ${JSON.stringify(t)}`);
      // khoảng cách chuông ↔ Trợ lý: hai nút không chồng nhau
      const kc = await p.ev("(() => { const b = document.querySelector('#topbar .bell').getBoundingClientRect(), t = document.getElementById('tl-nut').getBoundingClientRect(); return t.left - b.right; })()");
      assert.ok(kc >= 0, `${ten}: chuông và Trợ lý chồng nhau (${kc})`);
      await chup(p, `13-thanh-tren-${ten}${path === "/" ? "-trang-chu" : ""}`);
      await dong(p);
    }
  });

  await buoc(14, "1040 Toàn quyền: thanh bên màn thấp (600) và cao (1400) — chụp để soát mặt nạ mờ đè nút THIẾT LẬP", async () => {
    for (const h of [600, 1400]) {
      const p = await mo(TQ, "/orders", { width: 1040, height: h, mobile: false });
      await p.waitFor("!!document.querySelector('#sidebar .sidebar-groups')", "thanh bên");
      const m = await p.ev(`(() => { const g = document.querySelector('#sidebar .sidebar-groups'); const tl = document.querySelector('button[aria-controls="nhom-thiet-lap"]');
        const rg = g.getBoundingClientRect(), rt = tl.getBoundingClientRect(); return { tran: g.scrollHeight > g.clientHeight + 1, matNa: getComputedStyle(g).maskImage || getComputedStyle(g).webkitMaskImage, duoiVung: rg.bottom, duoiNut: rt.bottom }; })()`);
      console.log(`    · cao ${h}: tràn=${m.tran}, mặt nạ=${m.matNa !== "none"}, đáy vùng cuộn ${Math.round(m.duoiVung)}, đáy nút THIẾT LẬP ${Math.round(m.duoiNut)}`);
      await chup(p, `14-thanh-ben-cao-${h}`);
      await dong(p);
    }
  });

  await buoc(15, "390 Bán hàng: nút Trợ lý sau avatar ở thanh trên", async () => {
    const p = await mo(ACCOUNTS.salesA, "/orders");
    await p.waitFor("!!document.getElementById('tl-nut')", "nút Trợ lý", 8000);
    const t = await p.ev(`(() => { const c = [...document.getElementById('topbar').children]; return { avatar: c.findIndex((e) => e.classList.contains('bar-avatar')), troLy: c.findIndex((e) => e.id === 'tl-nut'), hien: document.getElementById('tl-nut').getClientRects().length > 0 }; })()`);
    assert.ok(t.hien && t.avatar >= 0 && t.avatar < t.troLy, JSON.stringify(t));
    await chup(p, "15-tro-ly-390");
    await dong(p);
  });

  await buoc(16, "390 Bán hàng /feedback: thanh tab hiện khi chưa mở yêu cầu; mở yêu cầu ⇒ ẩn, kể cả khi ô trả lời dính đáy bị ẩn (feedback.ts tự gọi datThanhTab(false))", async () => {
    // Một yêu cầu của chính Bán hàng (gọi API khi chưa có trang Bán hàng nào mở — một phiên mỗi tài khoản).
    const yc = await call(ACCOUNTS.salesA, "POST", "/api/feedback", { kind: "BUG", title: "Thử thanh tab đợt 0", body: "Kiểm thanh tab khi mở luồng.", clientRequestId: crypto.randomUUID(), teamId: "fbk-team-ky-thuat", context: { device: "Chrome thử", standalone: false } });
    assert.equal(yc.status, 201, JSON.stringify(yc.json));
    const p = await mo(ACCOUNTS.salesA, "/feedback");
    await sleep(2000);
    assert.equal(await p.ev(hien("#tabbar")), true, "thanh tab hiện ở trang Hỗ trợ");
    assert.equal(await p.ev("document.body.classList.contains('tabbar-an')"), false);
    await chup(p, "16a-ho-tro-390");
    await p.send("Page.navigate", { url: `${env.base}/feedback?id=${yc.json.ticket.id}` });
    await p.waitFor("!!document.querySelector('#fb-tra-loi') && document.querySelector('#fb-tra-loi').offsetParent !== null", "luồng mở, ô trả lời hiện", 10000);
    await sleep(400);
    assert.equal(await p.ev("getComputedStyle(document.getElementById('tabbar')).display"), "none", "mở luồng ⇒ thanh tab ẩn");
    // Ô trả lời (thanh dính) bị ẩn trong lúc luồng còn mở: bộ theo dõi của shell KHÔNG được bật lại thanh tab (lớp tabbar-an do feedback.ts đặt).
    await p.ev("document.getElementById('fb-tra-loi').hidden = true; true");
    await sleep(600);
    const sau = await p.ev("({ hien: getComputedStyle(document.getElementById('tabbar')).display !== 'none', an: document.body.classList.contains('tabbar-an'), luong: document.body.classList.contains('ht-luong-mo') })");
    console.log(`    · ẩn ô trả lời khi luồng mở: thanh tab ${sau.hien ? "HIỆN LẠI" : "vẫn ẩn"} (tabbar-an=${sau.an}, ht-luong-mo=${sau.luong})`);
    await chup(p, "16b-ho-tro-luong-an-o-tra-loi-390");
    assert.equal(sau.hien, false, "luồng còn mở mà thanh tab hiện lại (chồng lên luồng toàn màn)");
    await dong(p);
  });

  await buoc(17, "1040 Toàn quyền: nút nguy hiểm của hộp xác nhận đỏ đặc cả khi rê chuột; hai nút ở hai đầu", async () => {
    const p = await mo(TQ, "/dieu-kien-xuat-ben", DESK);
    await p.waitFor("!!document.querySelector('[data-action=\"dong-dieu-kien\"]')", "có điều kiện đang mở", 10000);
    await p.ev("document.querySelector('[data-action=\"dong-dieu-kien\"]').click(); true");
    await p.waitFor("!!document.querySelector('[role=\"alertdialog\"] .btn-danger')", "hộp xác nhận");
    await sleep(600);
    const doc = (s) => p.ev(`(() => { const n = document.querySelector('[role="alertdialog"] .btn-danger'); const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, nen: getComputedStyle(n).backgroundColor, chu: getComputedStyle(n).color, ${s ?? ""} }; })()`);
    const truoc = await doc();
    await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: truoc.x, y: truoc.y });
    await sleep(300);
    const sau = await doc("rê: n.matches(':hover')");
    console.log(`    · nền ${truoc.nen} → rê ${sau.nen} (hover=${sau["rê"]}); chữ ${sau.chu}`);
    assert.equal(sau["rê"], true, "chuột đang trên nút");
    assert.notEqual(sau.nen, "rgba(0, 0, 0, 0)");
    assert.notEqual(sau.nen, sau.chu, "nền khác màu chữ khi rê");
    const hai = await p.ev(`(() => { const b = [...document.querySelectorAll('[role="alertdialog"] .sheet-foot-xac-nhan .btn')].map((x) => x.getBoundingClientRect()); return Math.abs(b[0].top - b[1].top) < 2 && Math.abs(b[0].left - b[1].left) > 100; })()`);
    assert.equal(hai, true, "máy tính: hai nút cùng hàng, cách xa");
    await chup(p, "17-hop-xac-nhan-re-1040");
    await dong(p);
  });
} finally {
  await env.stop();
}
if (axeNhe.length) console.log(`\naxe nhẹ (ghi báo cáo, không đỏ):\n  ${[...new Set(axeNhe)].join("\n  ")}`);
if (loi.length) {
  console.log(`\n${loi.length} bước đỏ:\n  ${loi.join("\n  ")}`);
  process.exit(1);
}
console.log("\nSMOKE OK (có axe)");
