// Kịch bản Chrome — Vé hỗ trợ đợt 2a (ADR-0127, Việc 5 của docs/superpowers/plans/2026-10-16-ve-ho-tro-dot-2a.md): khung trò chuyện tự làm mới, mức ưu tiên,
// đơn liên quan, «Giao cho người khác». Khuôn: docs/evidence/2026-10-15-ve-ho-tro/kich-ban/ve-ho-tro-smoke.mjs.
//   0. Dữ liệu bằng API TRƯỚC khi mở trang (luật một máy ADR-0075): Toàn quyền thêm Kế toán (Thành viên) + Bán hàng Hai (Trưởng nhóm) vào nhóm Kế toán;
//      Bán hàng Một lập một đơn.
//   1. Bán hàng Một (390): form có ô «Đơn liên quan» (mã đơn + «Chờ xác nhận», không mã thô); gửi tới Kế toán kèm đơn → luồng có «Đơn liên quan: <mã>» là liên kết
//      mở đơn; «Mức ưu tiên: Thường» chỉ đọc; không ô chọn mức, không nút giao việc. Tin của mình là bong bóng bên phải.
//   2. HAI NGƯỜI cùng lúc: trang Bán hàng Một để mở; Kế toán ghi từ Node (phiên đăng nhập MỘT lần, không mở trang Kế toán lúc này):
//      a. trả lời ⇒ hiện ở trang kia ≤ 10 giây, không tải lại trang; bản nháp đang gõ + con trỏ trong ô trả lời còn nguyên; bong bóng người khác bên trái;
//      b. ghi chú nội bộ KHÔNG bao giờ hiện ở người gửi; c. đổi mức Khẩn + tiếp nhận ⇒ đầu phiếu đổi theo (≤ 10 giây);
//      d. mốc `since` của lời gọi làm mới = tin mới nhất − 30 giây; mọi lời gọi là GET, không chồng nhau;
//      e. đang đọc giữa trang: tin mới tới không làm nhảy cuộn; đang ở cuối trang: cuộn theo tin mới;
//      f. tab ẩn (visibilitychange): không gọi làm mới; hiện lại: gọi ngay.
//   3. Kế toán (1040): hàng đợi có nhãn «Khẩn» (không chữ URGENT); luồng có ô «Mức ưu tiên» = Khẩn, ghi chú nội bộ viền riêng; đổi sang Cao (PATCH …/xu-ly {priority});
//      Thành viên thường không có nút «Giao cho người khác».
//   4. Bán hàng Hai — Trưởng nhóm (390): «Giao cho người khác» ⇒ danh sách không có người gửi; giao cho Kế Toán ⇒ «Người xử lý: Kế Toán»; vùng chạm ≥ 44px, ô gõ ≥ 16px,
//      không tràn ngang, axe. Khoá tài khoản Kế toán (D1 tạm) ⇒ lần làm mới kế tiếp hiện «Chưa ai nhận» + tên người giữ trước mờ.
//   5. Toàn quyền chuyển phiếu sang Kỹ thuật (Node) ⇒ trang Trưởng nhóm Kế toán hiện «Phiếu này không còn trong nhóm của bạn.», ẩn ô trả lời, DỪNG làm mới.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài; D1 tạm; ~2 phút vì chờ chu kỳ làm mới 5 giây):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh [OUT=<thư mục ảnh>] node docs/evidence/2026-10-16-ve-ho-tro-2a/kich-ban/ve-ho-tro-2a-smoke.mjs
// Thiếu AXE_JS: DỪNG ngay (không coi là xanh nếu chưa kiểm màu).
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

if (!process.env.AXE_JS) {
  console.error("✗ thiếu AXE_JS (đường dẫn axe.min.js) — kịch bản này không chạy nửa vời");
  process.exit(2);
}
const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-16-ve-ho-tro-2a/anh");
mkdirSync(OUT, { recursive: true });
const AXE = readFileSync(process.env.AXE_JS, "utf8");
const KE_TOAN = "fbk-team-ke-toan";
const KY_THUAT = "fbk-team-ky-thuat";
const LUI_MS = 30_000;

const env = await startEnv();
let loi = 0;
try {
  const goi = async (cookie, method, path, body) => {
    const r = await fetch(env.base + path, { method, headers: { cookie: `${cookie.name}=${cookie.value}`, origin: env.base, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const call = async (account, method, path, body) => goi(await env.login(account), method, path, body);
  const axe = async (p, label) => {
    if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
    // Tắt đúng một luật `meta-viewport` như mọi kịch bản Chrome của Nền tảng (thẻ viewport tắt phóng to theo thiết kế PWA).
    const v = await p.ev("axe.run(document, { rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help })))");
    const bad = v.filter((x) => x.impact === "serious" || x.impact === "critical");
    assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
  };
  const khoMay = async (p, label) => {
    const m = await p.ev("({ rong: document.documentElement.scrollWidth, nho: [...document.querySelectorAll('main input:not([type=checkbox]), main select, main textarea')].filter((e) => e.offsetParent !== null && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.id || e.tagName) })");
    assert.ok(m.rong <= 390, `${label}: tràn ngang ${m.rong}`);
    assert.deepEqual(m.nho, [], `${label}: ô gõ dưới 16px`);
  };
  const chamNho = (p, sel) => p.ev(`[...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.offsetParent !== null && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim() || e.id || e.tagName)`);
  const lamMoi = (p) => p.requests.filter((r) => r.url.includes("/messages?since="));
  const thoiDiem = (u) => new URL(u).searchParams.get("since");
  const coTin = (chu) => `[...document.querySelectorAll('#fb-tin-ds [data-tin]')].some((e) => e.textContent.includes(${JSON.stringify(chu)}))`;

  // ---- 0. dữ liệu
  const ds = await call(ACCOUNTS.chu, "GET", "/api/staff");
  assert.equal(ds.status, 200, "0. Toàn quyền đọc danh sách tài khoản");
  const idCua = (a) => ds.json.staff.find((s) => s.phone === a.phone).id;
  const idKeToan = idCua(ACCOUNTS.accounting);
  for (const [id, role] of [[idKeToan, "MEMBER"], [idCua(ACCOUNTS.salesB), "LEAD"]]) {
    const r = await call(ACCOUNTS.chu, "PUT", `/api/feedback/admin/teams/${KE_TOAN}/members/${id}`, { role });
    assert.equal(r.status, 200, `0. thêm thành viên: ${JSON.stringify(r.json)}`);
  }
  const don = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách Kiểm Hỗ Trợ", customerPhone: "0909 000 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{ kind: "catalog", catalogCode: "TTB06", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800000 }, departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
  });
  assert.equal(don.status, 201, `0. lập đơn: ${JSON.stringify(don.json)}`);
  const donId = don.json.order?.id ?? don.json.id;
  const donMa = don.json.order?.orderCode ?? don.json.orderCode;
  assert.ok(donId && donMa, `0. đơn có id + mã: ${JSON.stringify(don.json).slice(0, 200)}`);
  ok(`0. nhóm Kế toán: Kế Toán (Thành viên), Sales Hai (Trưởng nhóm); Bán hàng Một lập đơn ${donMa}`);

  // ---- 1. Bán hàng Một gửi kèm đơn liên quan
  let p = await env.as(ACCOUNTS.salesA, "/feedback?new=1", MOB);
  await p.waitFor("!document.getElementById('new-card').hidden && !document.getElementById('new-order-label').hidden && document.querySelectorAll('#new-order option').length >= 2", "1. form mở, có ô Đơn liên quan");
  const luaChon = await p.ev("[...document.querySelectorAll('#new-order option')].map((o) => o.textContent)");
  assert.equal(luaChon[0], "Không gắn đơn", "1. lựa chọn đầu: không gắn đơn");
  assert.ok(luaChon.includes(`${donMa} · Chờ xác nhận`), `1. dòng đơn = mã + trạng thái tiếng Việt: ${JSON.stringify(luaChon)}`);
  assert.ok(!luaChon.some((x) => /draft|confirmed|cancelled/.test(x)), "1. không lộ mã trạng thái thô");
  assert.ok(p.requests.some((r) => r.url.endsWith("/api/feedback/my-orders")), "1. danh sách lấy từ my-orders");
  await p.ev(setInput("document.getElementById('new-team')", KE_TOAN));
  await p.ev(setInput("document.getElementById('new-order')", donId));
  await p.ev(setInput("document.getElementById('new-title')", "Đơn này tính sai tiền cọc"));
  await p.ev(setInput("document.getElementById('new-body')", "Tiền cọc hiện 0 đ nhưng khách đã chuyển."));
  await khoMay(p, "1. form 390");
  await p.shot(join(OUT, "01-ban-hang-form-don-lien-quan-390.png"));
  await p.ev("document.getElementById('new-submit').click()");
  await p.waitFor("location.search.includes('id=') && !!document.querySelector('#thread h2') && !!document.getElementById('fb-tin-ds')", "1. mở luồng sau khi gửi", 10000);
  const ticketId = new URLSearchParams(await p.ev("location.search")).get("id");
  const guiDi = JSON.parse(p.requests.find((r) => r.method === "POST" && r.url.endsWith("/api/feedback")).postData);
  assert.equal(guiDi.orderId, donId, "1. thân gửi có orderId");
  assert.equal("priority" in guiDi, false, "1. người gửi không gửi mức ưu tiên");
  const dongDon = await p.ev("({ chu: document.getElementById('fb-don')?.textContent, href: document.querySelector('#fb-don a')?.getAttribute('href') })");
  assert.equal(dongDon.chu, `Đơn liên quan: ${donMa}`, "1. dòng Đơn liên quan");
  assert.equal(dongDon.href, `/order?id=${donId}`, "1. liên kết mở đơn");
  assert.equal(await p.ev("document.getElementById('fb-uu-tien-nhan')?.textContent"), "Mức ưu tiên: Thường", "1. người gửi chỉ thấy nhãn mức");
  assert.equal(await p.ev("!!document.getElementById('fb-uu-tien') || !!document.querySelector('[data-giao]')"), false, "1. không ô chọn mức, không nút giao việc");
  assert.equal(await p.ev("document.querySelectorAll('#fb-tin-ds .fb-tin.is-minh').length"), 1, "1. tin đầu là của mình (bong bóng phải)");
  ok(`1. Bán hàng Một: ô Đơn liên quan «${donMa} · Chờ xác nhận», gửi kèm orderId; luồng có liên kết mở đơn; mức ưu tiên chỉ đọc`);

  // ---- 2. hai người cùng lúc (trang Bán hàng Một vẫn mở; Kế toán ghi từ Node bằng MỘT phiên)
  const kt = await env.login(ACCOUNTS.accounting);
  await p.ev("(() => { const t = document.querySelector('#thread textarea'); t.focus(); t.value = 'Bản nháp đang gõ dở'; t.dispatchEvent(new Event('input', { bubbles: true })); return true; })()");
  const daGoiTruoc = lamMoi(p).length;
  const tra = await goi(kt, "POST", `/api/feedback/${ticketId}/messages`, { body: "Kế toán đã nhận, đang kiểm sổ.", internal: false });
  assert.equal(tra.status, 201, `2. Kế toán trả lời: ${tra.status} ${JSON.stringify(tra.json)}`);
  const noiBo = await goi(kt, "POST", `/api/feedback/${ticketId}/messages`, { body: "NỘI BỘ: đối chiếu sao kê", internal: true });
  assert.equal(noiBo.status, 201, `2. ghi chú nội bộ: ${noiBo.status}`);
  const t0 = Date.now();
  await p.waitFor(coTin("Kế toán đã nhận"), "2a. trả lời hiện ở người gửi", 10000);
  const giay = (Date.now() - t0) / 1000;
  const sau = await p.ev("({ nhap: document.querySelector('#thread textarea').value, focus: document.activeElement === document.querySelector('#thread textarea'), chu: document.getElementById('thread').textContent, khac: [...document.querySelectorAll('#fb-tin-ds .fb-tin')].map((e) => ({ minh: e.classList.contains('is-minh'), trai: Math.round(e.getBoundingClientRect().left), phai: Math.round(e.getBoundingClientRect().right) })), khung: (() => { const r = document.getElementById('fb-tin-ds').getBoundingClientRect(); return { trai: Math.round(r.left), phai: Math.round(r.right) }; })() })");
  assert.equal(sau.nhap, "Bản nháp đang gõ dở", "2a. bản nháp còn nguyên");
  assert.equal(sau.focus, true, "2a. con trỏ vẫn ở ô trả lời");
  assert.ok(!sau.chu.includes("NỘI BỘ") && !sau.chu.includes("Ghi chú nội bộ"), "2b. người gửi KHÔNG thấy ghi chú nội bộ");
  const [minh, khac] = [sau.khac.find((x) => x.minh), sau.khac.find((x) => !x.minh)];
  assert.ok(minh.phai === sau.khung.phai && minh.trai > sau.khung.trai, `2a. tin mình sát phải: ${JSON.stringify(minh)} / ${JSON.stringify(sau.khung)}`);
  assert.ok(khac.trai === sau.khung.trai && khac.phai < sau.khung.phai, `2a. tin người khác sát trái: ${JSON.stringify(khac)}`);
  assert.ok(lamMoi(p).length > daGoiTruoc, "2a. có gọi tuyến làm mới");
  assert.equal(p.requests.filter((r) => r.url.includes(`/api/feedback/${ticketId}`) && r.method === "GET" && !r.url.includes("/messages")).length, 1, "2a. không tải lại phiếu (chỉ một lần mở chi tiết)");

  const doiMuc = await goi(kt, "PATCH", `/api/feedback/${ticketId}/xu-ly`, { priority: "URGENT" });
  assert.equal(doiMuc.status, 200, `2c. Kế toán đổi mức: ${JSON.stringify(doiMuc.json)}`);
  const tiepNhan = await goi(kt, "PATCH", `/api/feedback/${ticketId}/xu-ly`, { status: "ACK" });
  assert.equal(tiepNhan.status, 200, `2c. Kế toán tiếp nhận: ${JSON.stringify(tiepNhan.json)}`);
  await p.waitFor("document.getElementById('fb-uu-tien-nhan')?.textContent === 'Mức ưu tiên: Khẩn' && document.querySelector('#thread .fb-status-nhan').textContent.includes('Đã tiếp nhận')", "2c. đầu phiếu đổi theo", 10000);
  assert.equal(await p.ev("document.querySelector('#thread textarea').value"), "Bản nháp đang gõ dở", "2c. dựng lại đầu phiếu không mất bản nháp");
  assert.ok(!(await p.ev("document.getElementById('thread').textContent")).includes("URGENT"), "2c. không lộ mã URGENT");

  // 2d. mốc since: chờ thêm một vòng sau khi đã có đủ tin rồi so với tin mới nhất máy chủ trả (đọc bằng Node, phiên Kế toán).
  const nVong = lamMoi(p).length;
  for (let i = 0; i < 30 && lamMoi(p).length <= nVong; i++) await sleep(500);
  const chiTiet = await goi(kt, "GET", `/api/feedback/${ticketId}`);
  const moiNhatNguoiGui = chiTiet.json.messages.filter((m) => !m.internal).map((m) => Date.parse(m.createdAt)).reduce((a, b) => Math.max(a, b));
  const sinceCuoi = thoiDiem(lamMoi(p).at(-1).url);
  assert.equal(sinceCuoi, new Date(moiNhatNguoiGui - LUI_MS).toISOString(), "2d. since = tin mới nhất − 30 giây");
  assert.ok(lamMoi(p).every((r) => r.method === "GET"), "2d. tuyến làm mới chỉ GET");
  // Không chồng: khoảng cách giữa hai lần gọi liên tiếp ≥ ~5 giây (đo bằng Resource Timing của trang).
  const moc = await p.ev("performance.getEntriesByType('resource').filter((e) => e.name.includes('/messages?since=')).map((e) => [e.startTime, e.responseEnd])");
  for (let i = 1; i < moc.length; i++) assert.ok(moc[i][0] >= moc[i - 1][1], `2d. lần gọi ${i} bắt đầu trước khi lần trước xong: ${JSON.stringify(moc.slice(i - 1, i + 1))}`);
  ok(`2a–d. tin của người kia hiện sau ${giay.toFixed(1)} giây, không tải lại trang, bản nháp + con trỏ còn; không thấy ghi chú nội bộ; đầu phiếu đổi Khẩn / Đã tiếp nhận; since = tin mới nhất − 30 giây; không chồng lời gọi`);

  // 2e. cuộn: thêm vài tin dài để trang dài hơn khung nhìn.
  for (let i = 1; i <= 4; i++) assert.equal((await goi(kt, "POST", `/api/feedback/${ticketId}/messages`, { body: `Tin dài số ${i}: ${"nội dung kiểm cuộn trang ".repeat(12)}`, internal: false })).status, 201);
  await p.waitFor(coTin("Tin dài số 4"), "2e. bốn tin dài đã hiện", 12000);
  const dai = await p.ev("document.documentElement.scrollHeight - window.innerHeight");
  assert.ok(dai > 300, `2e. trang đủ dài để cuộn: ${dai}`);
  await p.ev("window.scrollTo(0, 200), true");
  await sleep(300);
  assert.equal((await goi(kt, "POST", `/api/feedback/${ticketId}/messages`, { body: "Tin khi đang đọc giữa trang", internal: false })).status, 201);
  await p.waitFor(coTin("Tin khi đang đọc giữa trang"), "2e. tin mới khi đang đọc giữa trang", 12000);
  assert.equal(await p.ev("Math.round(window.scrollY)"), 200, "2e. đang đọc giữa trang: không nhảy cuộn");
  await p.ev("window.scrollTo(0, document.documentElement.scrollHeight), true");
  await sleep(300);
  assert.equal((await goi(kt, "POST", `/api/feedback/${ticketId}/messages`, { body: "Tin khi đang ở cuối trang", internal: false })).status, 201);
  await p.waitFor(coTin("Tin khi đang ở cuối trang"), "2e. tin mới khi ở cuối trang", 12000);
  await sleep(300);
  assert.ok(await p.ev("window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2"), "2e. đang ở cuối: cuộn theo tin mới");
  await p.shot(join(OUT, "02-ban-hang-tro-chuyen-390.png"));

  // 2f. tab ẩn: không gọi; hiện lại: gọi ngay.
  await p.ev("(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); return true; })()");
  await sleep(600);
  const anTruoc = lamMoi(p).length;
  await sleep(12_000);
  assert.equal(lamMoi(p).length, anTruoc, "2f. tab ẩn 12 giây: không gọi làm mới");
  await p.ev("(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); return true; })()");
  for (let i = 0; i < 10 && lamMoi(p).length === anTruoc; i++) await sleep(100);
  assert.ok(lamMoi(p).length > anTruoc, "2f. hiện lại: gọi ngay (≤ 1 giây)");
  assert.deepEqual(p.consoleErrors, [], "2. không lỗi JS");
  p.close();
  ok("2e–f. đang đọc giữa trang không nhảy cuộn; ở cuối thì cuộn theo; tab ẩn không gọi, hiện lại gọi ngay");

  // ---- 3. Kế toán (Thành viên): nhãn Khẩn ở hàng đợi, ô mức ưu tiên, không giao việc
  p = await env.as(ACCOUNTS.accounting, "/feedback", DESK);
  await p.waitFor("!!document.querySelector('#tabs [data-tab=queue]')", "3. có tab hàng đợi");
  await p.ev("document.querySelector('#tabs [data-tab=queue]').click()");
  await p.waitFor(`!!document.querySelector('#list [data-ticket="${ticketId}"] [data-uu-tien]')`, "3. nhãn mức ở hàng đợi");
  const nhanHangDoi = await p.ev(`({ nhan: document.querySelector('#list [data-ticket="${ticketId}"] [data-uu-tien]').textContent, chu: document.getElementById('list').textContent })`);
  assert.equal(nhanHangDoi.nhan, "Khẩn", "3. nhãn «Khẩn»");
  assert.ok(!/URGENT|HIGH|NORMAL/.test(nhanHangDoi.chu), "3. hàng đợi không lộ mã mức thô");
  await p.shot(join(OUT, "03-ke-toan-hang-doi-1040.png"));
  p.close();
  p = await env.as(ACCOUNTS.accounting, `/feedback?id=${ticketId}`, DESK);
  await p.waitFor("!!document.getElementById('fb-uu-tien')", "3. ô chọn mức");
  assert.equal(await p.ev("document.getElementById('fb-uu-tien').value"), "URGENT", "3. ô mức đang Khẩn");
  assert.deepEqual(await p.ev("[...document.querySelectorAll('#fb-uu-tien option')].map((o) => o.textContent)"), ["Thường", "Cao", "Khẩn"], "3. ba mức tiếng Việt");
  assert.equal(await p.ev("document.querySelectorAll('#fb-tin-ds .fb-tin.is-noi-bo').length"), 1, "3. ghi chú nội bộ có viền riêng");
  assert.equal(await p.ev("!!document.querySelector('[data-giao]')"), false, "3. Thành viên thường không có «Giao cho người khác»");
  await p.ev(setInput("document.getElementById('fb-uu-tien')", "HIGH"));
  for (let i = 0; i < 40 && !p.requests.some((r) => r.method === "PATCH"); i++) await sleep(100);
  const patchMuc = p.requests.filter((r) => r.method === "PATCH");
  assert.deepEqual(patchMuc.map((r) => [new URL(r.url).pathname, JSON.parse(r.postData)]), [[`/api/feedback/${ticketId}/xu-ly`, { priority: "HIGH" }]], "3. đổi mức đi PATCH …/xu-ly {priority}");
  await p.waitFor("document.getElementById('fb-uu-tien')?.value === 'HIGH'", "3. sau khi nạp lại: Cao");
  await p.shot(join(OUT, "04-ke-toan-luong-1040.png"));
  assert.deepEqual(p.consoleErrors, [], "3. không lỗi JS");
  p.close();
  ok("3. Kế toán: hàng đợi «Khẩn»; ô Mức ưu tiên ba mức tiếng Việt, đổi sang Cao qua /xu-ly; ghi chú nội bộ viền riêng; không có nút giao việc");

  // ---- 4. Bán hàng Hai — Trưởng nhóm: giao cho người khác (390)
  p = await env.as(ACCOUNTS.salesB, `/feedback?id=${ticketId}`, MOB);
  await p.waitFor("!!document.querySelector('[data-giao]')", "4. có nút «Giao cho người khác»");
  assert.equal(await p.ev("document.querySelector('[data-giao]').textContent"), "Giao cho người khác");
  await p.ev("document.querySelector('[data-giao]').click()");
  await p.waitFor("document.querySelectorAll('#fb-giao-chon option').length > 0", "4. danh sách thành viên");
  const nguoiChon = await p.ev("[...document.querySelectorAll('#fb-giao-chon option')].map((o) => o.textContent)");
  assert.deepEqual(nguoiChon.sort(), ["Kế Toán · Thành viên", "Sales Hai · Trưởng nhóm"], `4. danh sách không có người gửi: ${JSON.stringify(nguoiChon)}`);
  assert.ok(p.requests.some((r) => r.url.includes(`/api/feedback/teams/${KE_TOAN}/members?ticket=${ticketId}`)), "4. tải members?ticket=");
  await khoMay(p, "4. luồng 390 (Trưởng nhóm)");
  assert.deepEqual(await chamNho(p, "#thread button, #thread select"), [], "4. vùng chạm ≥ 44px");
  await axe(p, "/feedback?id 390 (Trưởng nhóm, ô giao việc mở)");
  await p.shot(join(OUT, "05-truong-nhom-giao-viec-390.png"));
  await p.ev(setInput("document.getElementById('fb-giao-chon')", idKeToan));
  await p.ev("[...document.querySelectorAll('#fb-giao button')].find((b) => b.textContent.trim() === 'Giao').click()");
  await p.waitFor("document.getElementById('fb-nguoi-xu-ly')?.textContent.includes('Người xử lý: Kế Toán')", "4. đã giao cho Kế Toán");
  const giao = p.requests.filter((r) => r.method === "PATCH").map((r) => JSON.parse(r.postData));
  assert.deepEqual(giao, [{ assigneeId: idKeToan }], "4. giao bằng PATCH …/xu-ly {assigneeId}");
  // Khoá tài khoản Kế toán thẳng trên D1 tạm ⇒ lần làm mới kế tiếp: «Chưa ai nhận» + tên người giữ trước mờ.
  env.sql(`UPDATE staff SET active = 0 WHERE id = '${idKeToan}'`);
  await p.waitFor("document.getElementById('fb-nguoi-xu-ly')?.textContent.includes('Chưa ai nhận') && !!document.querySelector('#fb-nguoi-xu-ly .fb-ten-mo')", "4. người giữ bị khoá ⇒ chưa ai nhận, tên mờ", 12000);
  assert.ok((await p.ev("document.querySelector('#fb-nguoi-xu-ly .fb-ten-mo').textContent")).includes("Kế Toán"), "4. tên người giữ trước");
  await axe(p, "/feedback?id 390 (người giữ đã khoá)");
  await p.shot(join(OUT, "06-truong-nhom-nguoi-giu-da-khoa-390.png"));
  ok("4. Trưởng nhóm: «Giao cho người khác» (không có người gửi) → «Người xử lý: Kế Toán»; khoá Kế toán ⇒ tự hiện «Chưa ai nhận» + tên mờ; ≥ 44px, ≥ 16px, không tràn, axe");

  // ---- 5. chuyển nhóm khi trang Trưởng nhóm Kế toán đang mở ⇒ dừng làm mới
  const chuyen = await call(ACCOUNTS.chu, "POST", `/api/feedback/${ticketId}/transfer`, { teamId: KY_THUAT, reason: "Lỗi hiển thị, không phải công nợ" });
  assert.equal(chuyen.status, 200, `5. chuyển nhóm: ${JSON.stringify(chuyen.json)}`);
  await p.waitFor("document.getElementById('fb-lam-moi-dung')?.textContent === 'Phiếu này không còn trong nhóm của bạn.' && document.getElementById('fb-tra-loi').hidden", "5. câu báo + ẩn ô trả lời", 12000);
  const dungLuc = lamMoi(p).length;
  await sleep(11_000);
  assert.equal(lamMoi(p).length, dungLuc, "5. đã dừng làm mới");
  assert.equal(await p.ev("document.getElementById('error').hidden"), true, "5. không bật dòng lỗi chung");
  await p.shot(join(OUT, "07-truong-nhom-phieu-da-chuyen-390.png"));
  p.close();
  ok("5. phiếu bị chuyển sang Kỹ thuật ⇒ «Phiếu này không còn trong nhóm của bạn.», ẩn ô trả lời, dừng làm mới");

  // ---- 6. ảnh máy tính của người gửi (bố cục 2 cột) — sau cùng vì Bán hàng Một đăng nhập lại
  p = await env.as(ACCOUNTS.salesA, `/feedback?id=${ticketId}`, DESK);
  await p.waitFor(coTin("Tin khi đang ở cuối trang"), "6. luồng 1040");
  await axe(p, "/feedback?id 1040 (người gửi)");
  await p.shot(join(OUT, "08-ban-hang-tro-chuyen-1040.png"));
  assert.deepEqual(p.consoleErrors, [], "6. không lỗi JS");
  p.close();
  ok("6. người gửi ở 1040: bong bóng, axe");
} catch (e) {
  loi = 1;
  console.error(`✗ ${e.message}`);
} finally {
  await env.stop();
}
process.exit(loi);
