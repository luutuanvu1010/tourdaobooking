// Kịch bản Chrome — mục "Chính sách đăng nhập" ở trang Phiên đăng nhập (ADR-0085; Task 8). Không cần mạng ngoài.
//   1. Toàn quyền (ACCOUNTS.chu = Quản trị + Toàn quyền, miễn luật một máy nên mở nhiều trang an toàn) mở /sessions ở 1040: #policy-card có 9 dòng quyền + dòng
//      "Toàn quyền" ("Luôn nhiều máy"); chọn Đối tác = Nhiều máy → dải cảnh báo bên ngoài đúng chữ đặc tả; "Tất cả một máy" → dải biến mất; chọn Bán hàng = Nhiều máy
//      → "Lưu chính sách" → hộp xác nhận TRONG TRANG "Sẽ đăng xuất 0 máy của 0 người. Lưu?" → "Xác nhận lưu" → báo "Đã lưu…"; D1 có dòng SALES multi=1 hiện hành.
//      Đếm window.confirm = 0.
//   2. Cùng trang ở 390: mục hiện, không cuộn ngang.
//   3. Chỉ Quản trị (qua cổng route "admin" nhưng không có ô auth.session.policy) và Kế toán: mở /sessions → #policy-card ẩn, không gọi /api/sessions/policy, không lỗi JS.
//   4. finally: khôi phục chính sách bằng API (GET bản đang có → PUT về Một máy với banDangXem vừa đọc).
// Các trang dùng CHUNG kho cookie (CLAUDE.md §10): mỗi bước đóng trang trước khi đăng nhập tài khoản sau.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-01-chinh-sach-dang-nhap/kich-ban/chinh-sach.mjs
import assert from "node:assert/strict";
import { join } from "node:path";
import { ACCOUNTS, ok, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { CANH_BAO_NHIEU_MAY_BEN_NGOAI } from "../../../../src/shared/chinh-sach-dang-nhap.ts";

const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const ANH = join(process.cwd(), "docs", "evidence", "2026-10-01-chinh-sach-dang-nhap");

const env = await startEnv();
let loi = 0;
try {
  const mo = async (acc, path, vp) => {
    const p = await env.as(acc, path, vp);
    await p.waitFor(vp.mobile ? "document.querySelectorAll('#tabbar .tab').length > 0 && !document.querySelector('#tabbar[data-khung-tam]')" : "document.querySelectorAll('#sidebar .sidebar-item').length > 0 && !document.querySelector('#sidebar[data-khung-tam]')", `khung thật ${path}`);
    await sleep(600);
    return p;
  };
  const chonRadio = (p, quyen, nhieu) => p.ev(`(document.querySelector('input[name="pol-${quyen}"][value="${nhieu ? 1 : 0}"]').click(), true)`);
  const nutTheoChu = (p, chu) => p.ev(`(([...document.querySelectorAll('#policy-card button')].find((b) => b.textContent === ${JSON.stringify(chu)}).click()), true)`);

  // ---- 1. Toàn quyền đổi chính sách ở 1040
  let p = await mo(ACCOUNTS.chu, "/sessions", DESK);
  await p.waitFor("!document.getElementById('policy-card').hidden && document.querySelectorAll('#policy-card tr[data-quyen]').length === 10", "1. mục có 9 dòng quyền + dòng Toàn quyền", 10000);
  await p.ev("(window.__soConfirm = 0, window.confirm = () => { window.__soConfirm++; return true; }, true)");
  const dongToanQuyen = await p.ev("document.querySelector('#policy-card tr[data-quyen=\"SUPER_ADMIN\"]').textContent");
  assert.ok(dongToanQuyen.includes("Toàn quyền") && dongToanQuyen.includes("Luôn nhiều máy"), `1. dòng Toàn quyền: ${dongToanQuyen}`);
  assert.equal(await p.ev("document.querySelectorAll('#policy-card input[type=radio]:checked[value=\"0\"]').length"), 9, "1. mặc định cả 9 quyền Một máy");
  assert.equal(await p.ev("!!document.querySelector('#policy-card [data-canh-bao]')"), false, "1. chưa có cảnh báo");
  assert.equal(await p.ev("[...document.querySelectorAll('#policy-card button')].some((b) => b.textContent === 'Lưu chính sách')"), false, "1. chưa đổi gì thì chưa có nút Lưu");
  await chonRadio(p, "PARTNER", true);
  await p.waitFor("!!document.querySelector('#policy-card [data-canh-bao=\"ben-ngoai\"]')", "1. dải cảnh báo bên ngoài hiện");
  assert.equal(await p.ev("document.querySelector('#policy-card [data-canh-bao]').textContent"), CANH_BAO_NHIEU_MAY_BEN_NGOAI, "1. đúng chữ cảnh báo của đặc tả");
  await p.shot(join(ANH, "01-canh-bao-ben-ngoai-1040.png"));
  await nutTheoChu(p, "Tất cả một máy");
  await p.waitFor("!document.querySelector('#policy-card [data-canh-bao]')", "1. 'Tất cả một máy' → dải cảnh báo biến mất");
  await chonRadio(p, "SALES", true);
  await p.waitFor("[...document.querySelectorAll('#policy-card button')].some((b) => b.textContent === 'Lưu chính sách')", "1. nút Lưu chính sách hiện");
  await nutTheoChu(p, "Lưu chính sách");
  await p.waitFor("!!document.querySelector('#policy-card .maint-confirm')", "1. hộp xác nhận trong trang");
  assert.equal(await p.ev("document.querySelector('#policy-card .maint-confirm p').textContent"), "Sẽ đăng xuất 0 máy của 0 người. Lưu?", "1. câu xác nhận");
  await p.shot(join(ANH, "02-hop-xac-nhan-1040.png"));
  await nutTheoChu(p, "Xác nhận lưu");
  await p.waitFor("/^Đã lưu\\./.test(document.querySelector('#policy-card .alert.ok')?.textContent ?? '')", "1. báo Đã lưu");
  const dongSales = env.sql("SELECT multi FROM aut_session_policy WHERE permission_code = 'SALES' AND valid_to_at IS NULL");
  assert.deepEqual(dongSales.map((r) => r.multi), [1], "1. D1: SALES multi=1 hiện hành");
  assert.equal(await p.ev("window.__soConfirm"), 0, "1. không lời gọi window.confirm nào");
  assert.deepEqual(p.consoleErrors, [], "1. không lỗi JS");
  await p.shot(join(ANH, "03-da-luu-1040.png"));
  p.close();
  ok("1. Toàn quyền: 9 dòng + dòng Toàn quyền; cảnh báo bên ngoài hiện/ẩn; xem trước → xác nhận trong trang → Đã lưu; D1 SALES multi=1; 0 window.confirm");

  // ---- 2. Điện thoại 390
  p = await mo(ACCOUNTS.chu, "/sessions", MOB);
  await p.waitFor("!document.getElementById('policy-card').hidden && document.querySelectorAll('#policy-card tr[data-quyen]').length === 10", "2. mục hiện ở 390", 10000);
  assert.ok(await p.ev("document.documentElement.scrollWidth <= window.innerWidth"), "2. không cuộn ngang");
  assert.deepEqual(p.consoleErrors, [], "2. không lỗi JS");
  await p.shot(join(ANH, "04-chinh-sach-390.png"));
  p.close();
  ok("2. 390: mục hiện, không cuộn ngang, không lỗi JS");

  // ---- 3. Tài khoản thiếu ô auth.session.policy
  for (const [ten, acc] of [["Quản trị", ACCOUNTS.admin], ["Kế toán", ACCOUNTS.accounting]]) {
    p = await mo(acc, "/sessions", DESK);
    await sleep(800);
    assert.equal(await p.ev("document.getElementById('policy-card').hidden"), true, `3. ${ten}: #policy-card ẩn`);
    assert.ok(!p.requests.some((r) => r.url.includes("/api/sessions/policy")), `3. ${ten}: không gọi /api/sessions/policy`);
    assert.deepEqual(p.consoleErrors, [], `3. ${ten}: không lỗi JS`);
    p.close();
    ok(`3. ${ten}: không có mục chính sách, không gọi API chính sách, không lỗi JS`);
  }
} catch (e) {
  loi = 1;
  console.error(`✗ ${e.message}`);
} finally {
  // 4. Khôi phục chính sách bằng API (GET bản đang có → PUT về Một máy với banDangXem vừa đọc).
  try {
    const c = await env.login(ACCOUNTS.chu);
    const hdr = { cookie: `${c.name}=${c.value}`, origin: env.base, "content-type": "application/json" };
    const { rows } = await (await fetch(`${env.base}/api/sessions/policy`, { headers: hdr })).json();
    const thayDoi = rows.filter((r) => r.multi).map((r) => ({ permissionCode: r.permissionCode, multi: false, banDangXem: r.banId }));
    if (thayDoi.length > 0) {
      const r = await fetch(`${env.base}/api/sessions/policy`, { method: "PUT", headers: hdr, body: JSON.stringify({ thayDoi }) });
      assert.equal(r.status, 200, `4. khôi phục chính sách: ${r.status}`);
    }
    ok("4. khôi phục chính sách về Một máy bằng API");
  } catch (e) {
    loi = 1;
    console.error(`✗ khôi phục: ${e.message}`);
  }
  await env.stop();
}
process.exit(loi);
