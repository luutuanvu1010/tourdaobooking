// 2026-10-27: phần kiểm trang Hỗ trợ (/feedback) của kịch bản này THAY BẰNG docs/evidence/2026-10-27-ho-tro-thiet-ke-lai/kich-ban/ho-tro-smoke.mjs; các phần khác còn dùng. KHÔNG chạy lại phần /feedback (chữ cũ «Hàng đợi nhóm», «Quản lý nhóm», «Trợ giúp»).
// Kịch bản Chrome — tài khoản THIẾU quyền Quản trị (ADR-0071, ADR-0072 mục 4a; báo cáo nguyên nhân gốc mục 4.3): giao diện phải đọc CÙNG bảng quyền với máy chủ.
// Trước ADR-0072, mọi kịch bản Chrome dùng tài khoản giữ cả Quản trị lẫn Toàn quyền nên trang hỏi "có phải Quản trị" không bao giờ lộ.
//   A. "Chủ thử" (Quản trị + Toàn quyền, ACCOUNTS.chu của a2-cdp) — mốc so: thanh bên (1040) + thanh tab (390).
//   B. Tài khoản CHỈ Toàn quyền: thanh bên / thanh tab GIỐNG HỆT mốc (Toàn quyền = any ở mọi ô), có Dịch vụ & giá, Quản lý tài khoản, Địa điểm, Nhật ký,
//      Gửi thông báo; vào /staff, /catalog, /locations, /audit, /gui-thong-bao, /account (mục bảo trì hiện) — không dòng báo lỗi nào, không lỗi JS.
//   C. Tài khoản CHỈ Nhân sự (HR): thanh bên ĐÚNG [Quản lý tài khoản] + [Của tôi, Hỗ trợ, Hướng dẫn]; thanh tab [Tài khoản, Tôi]; "/" → /staff;
//      /staff không lỗi; /catalog, /locations, /audit, /gui-thong-bao hiện câu từ chối tiếng Việt (đọc "không lỗi đỏ" = trang được phép không có dòng báo lỗi;
//      trang không được phép hiện câu từ chối, không lỗi JS); trang Tôi không có mục bảo trì, không dòng Địa điểm / Gửi thông báo / Nhật ký; C2: gõ SĐT của một
//      khách → chỉ câu "đã có trong Danh bạ", không tên (ADR-0071 điều 3b), tick "Vẫn tạo hồ sơ mới" rồi tạo được.
//   D. ADR-0083 điều 1d: màn Sửa tài khoản của một tài khoản CHƯA gán vai (quyền kiểu cũ) — Quản trị thấy dòng báo "đang dùng quyền cũ" nhưng KHÔNG có khối
//      "Quyền cũ"; tài khoản chỉ Toàn quyền thấy khối đó (hỏi can(admin.manage.superadmin) — cùng bảng với máy chủ).
// Các trang dùng CHUNG kho cookie (CLAUDE.md §10): làm XONG một tài khoản (đóng mọi trang) rồi mới đăng nhập tài khoản sau.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-01-han-che-quan-tri-hcns/kich-ban/quyen-thieu-quan-tri-smoke.mjs
import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, setInput, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const CHI_TOAN_QUYEN = { name: "Chỉ Toàn Quyền", phone: "0900000291", pin: "246891", permissions: ["SUPER_ADMIN"] };
const CHI_NHAN_SU = { name: "Chỉ Nhân Sự", phone: "0900000292", pin: "246892", permissions: ["HR"] };
const KIEU_CU = { name: "Bán Hàng Kiểu Cũ", phone: "0900000294", pin: "246894", permissions: ["SALES"] }; // insertStaffSql: không gán vai = quyền kiểu cũ

const env = await startEnv();
let loi = 0;
try {
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const a of [CHI_TOAN_QUYEN, CHI_NHAN_SU, KIEU_CU]) for (const stmt of (await insertStaffSql(a)).split("\n").filter(Boolean)) env.sql(stmt);
  ok("dựng thêm ba tài khoản trên D1 tạm: chỉ Toàn quyền, chỉ Nhân sự, Bán hàng kiểu cũ (chưa gán vai)");

  /** Mở trang, chờ khung thật (thanh bên / thanh tab có mục) và hết "đang tải", trả trang. */
  const mo = async (acc, path, vp) => {
    const p = await env.as(acc, path, vp);
    await p.waitFor(vp.mobile ? "document.querySelectorAll('#tabbar .tab').length > 0 && !document.querySelector('#tabbar[data-khung-tam]')" : "document.querySelectorAll('#sidebar .sidebar-item').length > 0 && !document.querySelector('#sidebar[data-khung-tam]')", `khung thật ${path}`);
    await sleep(600); // để các lời gọi API của trang về (lỗi 403 nếu có sẽ hiện ra)
    return p;
  };
  // Menu theo việc (15/10): HẰNG NGÀY không có tiêu đề, THIẾT LẬP là nút thu gọn (đọc cả mục trong DOM dù nhóm đóng), CHÂN MENU nằm ở `.sidebar-foot` (không phải `.sidebar-group`).
  const thanhBen = (p) => p.ev(`[...document.querySelectorAll('#sidebar .sidebar-group')].map((g) => [g.querySelector('.sidebar-group-title')?.textContent.trim() ?? (g.querySelector('.sidebar-group-toggle') ? 'THIẾT LẬP' : 'HẰNG NGÀY'), [...g.querySelectorAll('.sidebar-item-label')].map((e) => e.textContent.trim())]).concat([['CHÂN MENU', [...document.querySelectorAll('#sidebar .sidebar-foot .sidebar-item-label')].map((e) => e.textContent.trim())]])`);
  const thanhTab = (p) => p.ev(`[...document.querySelectorAll('#tabbar .tab')].map((t) => t.textContent.trim())`);
  /** Mọi khối báo lỗi đang HIỆN trên trang (`.alert` không hidden, có chữ). */
  const baoLoi = (p) => p.ev(`[...document.querySelectorAll('.alert')].filter((e) => !e.hidden && e.offsetParent !== null && e.textContent.trim()).map((e) => e.textContent.trim())`);

  // ---- A. mốc: Quản trị + Toàn quyền
  let p = await mo(ACCOUNTS.chu, "/account", DESK);
  const mocBen = await thanhBen(p);
  p.close();
  p = await mo(ACCOUNTS.chu, "/account", MOB);
  const mocTab = await thanhTab(p);
  p.close();
  ok(`A. mốc Quản trị + Toàn quyền: thanh bên ${JSON.stringify(mocBen)}; thanh tab ${JSON.stringify(mocTab)}`);

  // ---- B. chỉ Toàn quyền
  p = await mo(CHI_TOAN_QUYEN, "/account", DESK);
  const benTQ = await thanhBen(p);
  assert.deepEqual(benTQ, mocBen, "B. thanh bên chỉ Toàn quyền phải GIỐNG HỆT Quản trị + Toàn quyền (Toàn quyền = any ở mọi ô)");
  const quanTriTQ = benTQ.find(([t]) => t === "THIẾT LẬP")?.[1] ?? [];
  for (const m of ["Dịch vụ & giá", "Quản lý tài khoản", "Địa điểm", "Nhật ký", "Gửi thông báo", "Trợ lý Hỗ trợ", "Giao diện"]) assert.ok(quanTriTQ.includes(m), `B. thiếu mục "${m}": ${JSON.stringify(quanTriTQ)}`);
  await p.waitFor("!document.getElementById('maintenance').hidden", "B. mục bảo trì hiện ở trang Tôi", 8000);
  const linkTQ = await p.ev(`[...document.querySelectorAll('main .row-link')].map((a) => a.textContent.trim())`);
  for (const m of ["Địa điểm", "Gửi thông báo", "Nhật ký"]) assert.ok(linkTQ.some((t) => t.startsWith(m)), `B. trang Tôi thiếu dòng "${m}": ${JSON.stringify(linkTQ)}`);
  assert.deepEqual(await baoLoi(p), [], "B. trang Tôi không có dòng báo lỗi");
  assert.deepEqual(p.consoleErrors, [], "B. trang Tôi không lỗi JS");
  p.close();
  ok(`B. chỉ Toàn quyền: thanh bên giống mốc (${quanTriTQ.length} mục THIẾT LẬP), trang Tôi có mục bảo trì + dòng Địa điểm, Gửi thông báo, Nhật ký`);
  p = await mo(CHI_TOAN_QUYEN, "/account", MOB);
  assert.deepEqual(await thanhTab(p), mocTab, "B. thanh tab chỉ Toàn quyền phải giống mốc");
  p.close();
  ok(`B. thanh tab (390) giống mốc: ${JSON.stringify(mocTab)}`);
  for (const path of ["/", "/staff", "/catalog", "/locations", "/audit", "/gui-thong-bao"]) {
    p = await mo(CHI_TOAN_QUYEN, path, DESK);
    assert.deepEqual(await baoLoi(p), [], `B. ${path}: không dòng báo lỗi`);
    assert.deepEqual(p.consoleErrors, [], `B. ${path}: không lỗi JS`);
    p.close();
    ok(`B. chỉ Toàn quyền vào ${path}: không dòng báo lỗi, không lỗi JS`);
  }

  // ---- C. chỉ Nhân sự (mở SAU CÙNG)
  p = await mo(CHI_NHAN_SU, "/account", DESK);
  assert.deepEqual(await thanhBen(p), [["THIẾT LẬP", ["Quản lý tài khoản"]], ["CHÂN MENU", ["Của tôi", "Hỗ trợ", "Hướng dẫn"]]], "C. thanh bên Nhân sự (menu theo việc 15/10)");
  assert.equal(await p.ev("document.getElementById('maintenance').hidden"), true, "C. trang Tôi KHÔNG có mục bảo trì");
  const linkNS = await p.ev(`[...document.querySelectorAll('main .row-link')].map((a) => a.textContent.trim())`);
  for (const m of ["Địa điểm", "Gửi thông báo", "Nhật ký", "Danh bạ", "Loại giấy tờ cá nhân"]) assert.ok(!linkNS.some((t) => t.startsWith(m)), `C. trang Tôi không được có dòng "${m}": ${JSON.stringify(linkNS)}`);
  assert.deepEqual(await baoLoi(p), [], "C. trang Tôi không có dòng báo lỗi");
  assert.deepEqual(p.consoleErrors, [], "C. trang Tôi không lỗi JS");
  p.close();
  ok(`C. chỉ Nhân sự: thanh bên đúng [Quản lý tài khoản] + [Của tôi, Hỗ trợ, Hướng dẫn]; trang Tôi: ${JSON.stringify(linkNS)}`);
  p = await mo(CHI_NHAN_SU, "/account", MOB);
  assert.deepEqual(await thanhTab(p), ["Tài khoản", "Tôi"], "C. thanh tab Nhân sự");
  p.close();
  ok("C. thanh tab (390): [Tài khoản, Tôi]");
  p = await mo(CHI_NHAN_SU, "/", DESK);
  await p.waitFor("location.pathname === '/staff'", "C. '/' chuyển sang /staff", 8000);
  p.close();
  ok("C. mở '/' → /staff");
  p = await mo(CHI_NHAN_SU, "/staff", DESK);
  await p.waitFor("document.querySelectorAll('#list .card, #list tr, #list li, main [data-staff-id]').length > 0 || document.body.innerText.includes('Chỉ Nhân Sự')", "C. danh sách tài khoản có dữ liệu", 8000);
  assert.deepEqual(await baoLoi(p), [], "C. /staff không dòng báo lỗi");
  assert.deepEqual(p.consoleErrors, [], "C. /staff không lỗi JS");
  p.close();
  ok("C. /staff: không dòng báo lỗi, không lỗi JS");

  // C2. ADR-0071 điều 3b: Nhân sự gõ đúng SĐT của một KHÁCH trong Danh bạ → khối hồ sơ khớp chỉ có câu "đã có trong Danh bạ", không tên khách, không danh sách;
  // nút Tạo tắt tới khi tick "Vẫn tạo hồ sơ mới"; tick rồi tạo được. Khách dựng bằng phiên Quản trị gọi thẳng API (không qua trang — kho cookie giữ nguyên).
  const TEN_KHACH = "Khách Bí Mật Chrome";
  const SO_KHACH = "0912777888";
  const ckQT = await env.login(ACCOUNTS.admin);
  const taoKhach = await fetch(`${env.base}/api/parties`, { method: "POST", headers: { "content-type": "application/json", origin: env.base, cookie: `${ckQT.name}=${ckQT.value}` }, body: JSON.stringify({ kind: "PERSON", fullName: TEN_KHACH, contacts: [{ kind: "PHONE", value: SO_KHACH }] }) });
  assert.equal(taoKhach.status, 201, `tạo khách: ${taoKhach.status}`);
  p = await mo(CHI_NHAN_SU, "/staff", DESK);
  await p.waitFor("!!document.querySelector('#add-perms input[data-kind=role][value=SALES_STAFF]')", "C2. form Thêm tài khoản có khối vai");
  await p.ev(setInput("document.querySelector('#add-name')", "Người Mới Hoàn Toàn"));
  await p.ev(setInput("document.querySelector('#add-phone')", SO_KHACH));
  await p.waitFor("!document.querySelector('#add-khop').hidden", "C2. khối hồ sơ khớp hiện", 8000);
  const khoi = await p.ev(`(() => { const k = document.querySelector('#add-khop'); const nut = document.querySelector('#add-form button[type=submit]'); return { chu: k.textContent, li: k.querySelectorAll('li').length, tat: nut.disabled }; })()`);
  assert.ok(khoi.chu.includes("Số hoặc tên này đã có trong Danh bạ. Vẫn tạo được hồ sơ mới; sau đó nhờ Quản trị gộp hồ sơ trùng."), `C2. câu báo: ${khoi.chu}`);
  assert.ok(!khoi.chu.includes("Bí Mật"), `C2. không lộ tên khách: ${khoi.chu}`);
  assert.equal(khoi.li, 0, "C2. không có danh sách hồ sơ (không id/tên)");
  assert.equal(khoi.tat, true, "C2. nút Tạo tắt khi chưa tick 'Vẫn tạo hồ sơ mới'");
  // Gửi khi chưa tick (requestSubmit bỏ qua nút tắt) → 409. Chủ dự án 2026-10-01: câu "đã có trong Danh bạ" hiện ĐÚNG MỘT lần (ở khối hồ sơ khớp), #error không
  // lặp lại. Đếm phản hồi 409 bằng bọc fetch để biết máy chủ đã trả (không còn chờ #error hiện được).
  await p.ev("(window.__so409 = 0, window.fetch = ((f) => async (...a) => { const r = await f(...a); if (r.status === 409) window.__so409++; return r; })(window.fetch), true)");
  await p.ev("(document.querySelector('#add-perms input[data-kind=role][value=SALES_STAFF]').click(), document.querySelector('#add-form').requestSubmit(), true)");
  await p.waitFor("window.__so409 > 0", "C2. máy chủ trả 409", 8000);
  await sleep(300);
  const sau409 = await p.ev(`(() => { const t = document.body.innerText; const cau = 'đã có trong Danh bạ'; return { lan: t.split(cau).length - 1, loiAn: document.getElementById('error').hidden || !document.getElementById('error').textContent.trim(), khoi: !document.querySelector('#add-khop').hidden && document.querySelector('#add-khop').textContent.includes(cau) }; })()`);
  assert.equal(sau409.lan, 1, `C2. sau 409 câu "đã có trong Danh bạ" phải hiện đúng một lần: ${JSON.stringify(sau409)}`);
  assert.equal(sau409.khoi, true, "C2. câu ở khối hồ sơ khớp");
  assert.equal(sau409.loiAn, true, "C2. ô báo lỗi không lặp câu");
  await p.ev("(document.querySelector('#add-khop label.check input').click(), true)");
  assert.equal(await p.ev("document.querySelector('#add-form button[type=submit]').disabled"), false, "C2. tick xong nút Tạo mở");
  await p.ev("(document.querySelector('#add-form').requestSubmit(), true)");
  await p.waitFor("!document.querySelector('#secret').hidden && !!document.querySelector('#secret td.pin')", "C2. tạo xong, hiện PIN", 8000);
  assert.deepEqual(p.consoleErrors, [], "C2. không lỗi JS");
  p.close();
  ok("C2. Nhân sự gõ SĐT của khách: chỉ câu 'đã có trong Danh bạ' (sau 409 vẫn đúng một lần), không tên, không danh sách, nút Tạo tắt; tick 'Vẫn tạo hồ sơ mới' → tạo được");
  const TU_CHOI = {
    "/catalog": "Chỉ quản trị viên được vào trang này.",
    "/locations": "Chỉ quản trị viên được vào trang này.",
    "/audit": "Trang Nhật ký chỉ người phụ trách hệ thống xem được.",
    "/gui-thong-bao": "Chỉ người phụ trách hệ thống dùng được trang này.",
  };
  for (const [path, cau] of Object.entries(TU_CHOI)) {
    p = await mo(CHI_NHAN_SU, path, DESK);
    assert.deepEqual(await baoLoi(p), [cau], `C. ${path}: đúng một câu từ chối tiếng Việt`);
    assert.deepEqual(p.consoleErrors, [], `C. ${path}: không lỗi JS`);
    p.close();
    ok(`C. ${path}: câu từ chối "${cau}", không lỗi JS`);
  }

  // ---- D. ADR-0083 điều 1d: khối "Quyền cũ" chỉ người hỏi được ô admin.manage.superadmin. Quản trị trước, chỉ Toàn quyền SAU CÙNG (chung kho cookie).
  const moSua = async (acc) => {
    const p = await mo(acc, "/staff", DESK);
    await p.waitFor(`[...document.querySelectorAll('#list tr')].some((tr) => tr.textContent.includes(${JSON.stringify(KIEU_CU.name)}))`, "D. dòng tài khoản kiểu cũ", 8000);
    await p.ev(`([...[...document.querySelectorAll('#list tr')].find((tr) => tr.textContent.includes(${JSON.stringify(KIEU_CU.name)})).querySelectorAll('button')].find((b) => b.textContent.trim() === 'Sửa').click(), true)`);
    await p.waitFor("!document.querySelector('#edit').hidden && !!document.querySelector('#edit h2')", "D. hộp Sửa mở", 8000);
    return p;
  };
  const khoiQuyenCu = (p) => p.ev(`(() => { const e = document.querySelector('#edit'); return { baoCu: e.textContent.includes('đang dùng quyền cũ'), quyenCu: [...e.querySelectorAll('details summary')].some((x) => x.textContent.includes('Quyền cũ')), oTick: [...e.querySelectorAll('details')].filter((d) => d.querySelector('summary')?.textContent.includes('Quyền cũ')).reduce((n, d) => n + d.querySelectorAll('input[type=checkbox]').length, 0) }; })()`); // chỉ đếm ô của khối "Quyền cũ" (khối Vai và quyền cũng có <details>)
  p = await moSua(ACCOUNTS.admin);
  const qt = await khoiQuyenCu(p);
  assert.deepEqual(qt, { baoCu: true, quyenCu: false, oTick: 0 }, `D. Quản trị: ${JSON.stringify(qt)}`);
  assert.deepEqual(p.consoleErrors, [], "D. Quản trị: không lỗi JS");
  p.close();
  ok("D. Quản trị mở Sửa tài khoản kiểu cũ: có dòng báo 'đang dùng quyền cũ', KHÔNG có khối 'Quyền cũ'");
  p = await moSua(CHI_TOAN_QUYEN);
  const tq = await khoiQuyenCu(p);
  assert.equal(tq.baoCu, true, `D. Toàn quyền: ${JSON.stringify(tq)}`);
  assert.equal(tq.quyenCu, true, `D. Toàn quyền thấy khối 'Quyền cũ': ${JSON.stringify(tq)}`);
  assert.ok(tq.oTick > 0, "D. khối 'Quyền cũ' có ô tick quyền");
  assert.deepEqual(p.consoleErrors, [], "D. Toàn quyền: không lỗi JS");
  p.close();
  ok(`D. chỉ Toàn quyền mở Sửa tài khoản kiểu cũ: thấy khối 'Quyền cũ' (${tq.oTick} ô tick)`);
} catch (e) {
  loi = 1;
  console.error(`✗ ${e.message}`);
} finally {
  await env.stop();
}
process.exit(loi);
