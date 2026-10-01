// Kịch bản Chrome — tài khoản THIẾU quyền Quản trị (ADR-0071, ADR-0072 mục 4a; báo cáo nguyên nhân gốc mục 4.3): giao diện phải đọc CÙNG bảng quyền với máy chủ.
// Trước ADR-0072, mọi kịch bản Chrome dùng tài khoản giữ cả Quản trị lẫn Toàn quyền nên trang hỏi "có phải Quản trị" không bao giờ lộ.
//   A. "Chủ thử" (Quản trị + Toàn quyền, ACCOUNTS.chu của a2-cdp) — mốc so: thanh bên (1040) + thanh tab (390).
//   B. Tài khoản CHỈ Toàn quyền: thanh bên / thanh tab GIỐNG HỆT mốc (Toàn quyền = any ở mọi ô), có Dịch vụ & giá, Quản lý tài khoản, Địa điểm, Nhật ký,
//      Gửi thông báo; vào /staff, /catalog, /locations, /audit, /gui-thong-bao, /account (mục bảo trì hiện) — không dòng báo lỗi nào, không lỗi JS.
//   C. Tài khoản CHỈ Nhân sự (HR): thanh bên ĐÚNG [Quản lý tài khoản] + [Của tôi, Góp ý / Báo lỗi, Trợ giúp]; thanh tab [Tài khoản, Tôi]; "/" → /staff;
//      /staff không lỗi; /catalog, /locations, /audit, /gui-thong-bao hiện câu từ chối tiếng Việt (đọc "không lỗi đỏ" = trang được phép không có dòng báo lỗi;
//      trang không được phép hiện câu từ chối, không lỗi JS); trang Tôi không có mục bảo trì, không dòng Địa điểm / Gửi thông báo / Nhật ký.
// Các trang dùng CHUNG kho cookie (CLAUDE.md §10): làm XONG một tài khoản (đóng mọi trang) rồi mới đăng nhập tài khoản sau.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-01-han-che-quan-tri-hcns/kich-ban/quyen-thieu-quan-tri-smoke.mjs
import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const CHI_TOAN_QUYEN = { name: "Chỉ Toàn Quyền", phone: "0900000291", pin: "246891", permissions: ["SUPER_ADMIN"] };
const CHI_NHAN_SU = { name: "Chỉ Nhân Sự", phone: "0900000292", pin: "246892", permissions: ["HR"] };

const env = await startEnv();
let loi = 0;
try {
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const a of [CHI_TOAN_QUYEN, CHI_NHAN_SU]) for (const stmt of (await insertStaffSql(a)).split("\n").filter(Boolean)) env.sql(stmt);
  ok("dựng thêm hai tài khoản trên D1 tạm: chỉ Toàn quyền, chỉ Nhân sự");

  /** Mở trang, chờ khung thật (thanh bên / thanh tab có mục) và hết "đang tải", trả trang. */
  const mo = async (acc, path, vp) => {
    const p = await env.as(acc, path, vp);
    await p.waitFor(vp.mobile ? "document.querySelectorAll('#tabbar .tab').length > 0 && !document.querySelector('#tabbar[data-khung-tam]')" : "document.querySelectorAll('#sidebar .sidebar-item').length > 0 && !document.querySelector('#sidebar[data-khung-tam]')", `khung thật ${path}`);
    await sleep(600); // để các lời gọi API của trang về (lỗi 403 nếu có sẽ hiện ra)
    return p;
  };
  const thanhBen = (p) => p.ev(`[...document.querySelectorAll('#sidebar .sidebar-group')].map((g) => [g.querySelector('.sidebar-group-title').textContent.trim(), [...g.querySelectorAll('.sidebar-item-label')].map((e) => e.textContent.trim())])`);
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
  const quanTriTQ = benTQ.find(([t]) => t === "QUẢN TRỊ")?.[1] ?? [];
  for (const m of ["Dịch vụ & giá", "Quản lý tài khoản", "Địa điểm", "Nhật ký", "Gửi thông báo", "Trợ lý Hỗ trợ"]) assert.ok(quanTriTQ.includes(m), `B. thiếu mục "${m}": ${JSON.stringify(quanTriTQ)}`);
  await p.waitFor("!document.getElementById('maintenance').hidden", "B. mục bảo trì hiện ở trang Tôi", 8000);
  const linkTQ = await p.ev(`[...document.querySelectorAll('main .row-link')].map((a) => a.textContent.trim())`);
  for (const m of ["Địa điểm", "Gửi thông báo", "Nhật ký"]) assert.ok(linkTQ.some((t) => t.startsWith(m)), `B. trang Tôi thiếu dòng "${m}": ${JSON.stringify(linkTQ)}`);
  assert.deepEqual(await baoLoi(p), [], "B. trang Tôi không có dòng báo lỗi");
  assert.deepEqual(p.consoleErrors, [], "B. trang Tôi không lỗi JS");
  p.close();
  ok(`B. chỉ Toàn quyền: thanh bên giống mốc (${quanTriTQ.length} mục QUẢN TRỊ), trang Tôi có mục bảo trì + dòng Địa điểm, Gửi thông báo, Nhật ký`);
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
  assert.deepEqual(await thanhBen(p), [["QUẢN TRỊ", ["Quản lý tài khoản"]], ["TÔI", ["Của tôi", "Góp ý / Báo lỗi", "Trợ giúp"]]], "C. thanh bên Nhân sự");
  assert.equal(await p.ev("document.getElementById('maintenance').hidden"), true, "C. trang Tôi KHÔNG có mục bảo trì");
  const linkNS = await p.ev(`[...document.querySelectorAll('main .row-link')].map((a) => a.textContent.trim())`);
  for (const m of ["Địa điểm", "Gửi thông báo", "Nhật ký", "Danh bạ", "Loại giấy tờ người"]) assert.ok(!linkNS.some((t) => t.startsWith(m)), `C. trang Tôi không được có dòng "${m}": ${JSON.stringify(linkNS)}`);
  assert.deepEqual(await baoLoi(p), [], "C. trang Tôi không có dòng báo lỗi");
  assert.deepEqual(p.consoleErrors, [], "C. trang Tôi không lỗi JS");
  p.close();
  ok(`C. chỉ Nhân sự: thanh bên đúng [Quản lý tài khoản] + [Của tôi, Góp ý / Báo lỗi, Trợ giúp]; trang Tôi: ${JSON.stringify(linkNS)}`);
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
} catch (e) {
  loi = 1;
  console.error(`✗ ${e.message}`);
} finally {
  await env.stop();
}
process.exit(loi);
