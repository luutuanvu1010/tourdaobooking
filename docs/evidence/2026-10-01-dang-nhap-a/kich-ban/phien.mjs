// Kịch bản Chrome — sổ phiên đăng nhập, mỗi tài khoản một máy (ADR-0075; Task 9 Phần A). Không cần mạng ngoài.
//   1. Hai "máy" cùng tài khoản thường (Bán hàng — salesA): máy 1 là trang Chrome (kho cookie của Chrome), máy 2 đăng nhập từ Node (kho cookie khác = máy khác).
//      Trước: trang Tôi có mục "Phiên đăng nhập của tôi" (dòng "Máy này", câu "Ứng dụng đã cài và Safari…"), không lỗi JS (kể cả bước gắn lại thông báo của
//      web/shell.ts khi trình duyệt chưa cho phép thông báo). Sau khi máy 2 vào: máy 1 tải lại → về /login với lời báo "Tài khoản vừa đăng nhập trên máy khác lúc HH:MM".
//   2. Toàn quyền (chủ thử, ACCOUNTS.chu — miễn luật một máy nên mở nhiều trang an toàn) mở "Phiên đăng nhập": mục có ở thanh bên; gỡ phiên của salesA bằng hộp xác
//      nhận TRONG TRANG (đếm lời gọi window.confirm = 0); gỡ phiên + đặt lại PIN của salesB → PIN mới hiện một lần; dòng của chính mình không có nút gỡ. 1040 + 390.
//   3. Tài khoản THIẾU ô auth.session.viewAll — chỉ Quản trị (qua cổng "admin" của route nhưng không có ô — đúng bẫy luật 1.52) và Kế toán: không có mục ở thanh bên /
//      trang Tôi; mở thẳng /sessions → đúng một câu từ chối tiếng Việt, không gọi /api/sessions, không lỗi JS.
// Các trang dùng CHUNG kho cookie (CLAUDE.md §10): mỗi bước đóng trang trước khi đăng nhập tài khoản sau; tài khoản thường không bao giờ mở hai trang cùng lúc.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-01-dang-nhap-a/kich-ban/phien.mjs
import assert from "node:assert/strict";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const ANH = join(process.cwd(), "docs", "evidence", "2026-10-01-dang-nhap-a");

const env = await startEnv();
let loi = 0;
try {
  /** Mở trang, chờ khung thật (thanh bên / thanh tab có mục). */
  const mo = async (acc, path, vp) => {
    const p = await env.as(acc, path, vp);
    await p.waitFor(vp.mobile ? "document.querySelectorAll('#tabbar .tab').length > 0 && !document.querySelector('#tabbar[data-khung-tam]')" : "document.querySelectorAll('#sidebar .sidebar-item').length > 0 && !document.querySelector('#sidebar[data-khung-tam]')", `khung thật ${path}`);
    await sleep(600);
    return p;
  };
  const thanhBen = (p) => p.ev(`[...document.querySelectorAll('#sidebar .sidebar-item-label')].map((e) => e.textContent.trim())`);
  const baoLoi = (p) => p.ev(`[...document.querySelectorAll('.alert')].filter((e) => !e.hidden && e.offsetParent !== null && e.textContent.trim()).map((e) => e.textContent.trim())`);
  const dongTo = (p) => p.ev(`[...document.querySelectorAll('main .row-link')].map((a) => a.textContent.trim())`);
  const sid = (phone) => env.sql(`SELECT s.id FROM staff s WHERE s.phone = '${phone}'`)[0].id;

  // ---- 1. Hai máy cùng tài khoản thường
  let p = await mo(ACCOUNTS.salesA, "/account", MOB);
  await p.waitFor("!document.getElementById('my-sessions').hidden", "1. mục Phiên đăng nhập của tôi hiện", 8000);
  const muc = await p.ev(`(() => { const m = document.getElementById('my-sessions'); return { h: m.querySelector('h2').textContent, chu: m.textContent, may: [...m.querySelectorAll('.badge')].map((b) => b.textContent), nut: !!m.querySelector('#my-sessions-logout') }; })()`);
  assert.equal(muc.h, "Máy đang đăng nhập của tôi");
  assert.ok(muc.chu.includes("Ứng dụng đã cài và Safari trên cùng một iPhone tính là hai máy."), "1. có câu Safari + ứng dụng là hai máy");
  assert.ok(muc.may.includes("Máy này") && muc.may.includes("Đang hiệu lực"), `1. dòng Máy này + Đang hiệu lực: ${JSON.stringify(muc.may)}`);
  assert.ok(muc.nut, "1. có nút Đăng xuất trong mục");
  assert.ok(!/bi_thay|dang_xuat|PIN_MFA|PASSKEY/.test(muc.chu), "1. không lộ mã thô");
  await p.ev("document.getElementById('my-sessions').scrollIntoView(), true");
  await p.shot(join(ANH, "01-toi-phien-cua-toi-390.png"));
  const quyenTB = await p.ev("'Notification' in window ? Notification.permission : 'không có'");
  assert.deepEqual(p.consoleErrors, [], "1/4. trang Tôi không lỗi JS (gắn lại thông báo khi chưa cho phép không ném)");
  ok(`1. trang Tôi (390): mục "Phiên đăng nhập của tôi" có dòng Máy này + câu Safari; không lỗi JS (quyền thông báo của trình duyệt: ${quyenTB})`);

  await env.login(ACCOUNTS.salesA); // máy 2: kho cookie của Node, khác Chrome
  await p.send("Page.reload");
  await p.waitFor("location.pathname === '/login' && !document.getElementById('session-ended-banner').hidden", "1. máy 1 về /login với lời báo", 10000);
  const loiBao = await p.ev("document.getElementById('session-ended-text').textContent");
  assert.match(loiBao, /^Tài khoản vừa đăng nhập trên máy khác lúc \d{2}:\d{2}$/, `1. lời báo: ${loiBao}`);
  await p.shot(join(ANH, "02-may-1-bi-thay-390.png"));
  p.close();
  ok(`1. máy 2 đăng nhập → máy 1 tải lại về /login, lời báo "${loiBao}"`);

  // ---- 2. Toàn quyền gỡ phiên
  const idA = sid(ACCOUNTS.salesA.phone);
  const idB = sid(ACCOUNTS.salesB.phone);
  await env.login(ACCOUNTS.salesB); // salesB có một phiên sống (máy Node)
  p = await mo(ACCOUNTS.chu, "/sessions", DESK);
  assert.ok((await thanhBen(p)).includes("Máy đang đăng nhập"), "2. thanh bên có mục Phiên đăng nhập");
  assert.equal(await p.ev("document.querySelector('#sidebar [aria-current=page] .sidebar-item-label')?.textContent.trim()"), "Máy đang đăng nhập", "2. mục đang chọn");
  await p.waitFor("document.querySelectorAll('#list tr[data-phien]').length >= 3", "2. bảng có phiên của salesA, salesB, chủ");
  await p.ev("(window.__soConfirm = 0, window.confirm = () => { window.__soConfirm++; return true; }, true)");
  assert.deepEqual(await baoLoi(p), [], "2. không dòng báo lỗi");
  assert.equal(await p.ev("document.getElementById('chi-song').checked"), true, "2. mặc định chỉ phiên đang hiệu lực");
  const dongChu = await p.ev(`(() => { const tr = [...document.querySelectorAll('#list tr[data-phien]')].find((r) => r.textContent.includes('(máy này)')); return tr ? tr.querySelectorAll('button').length : -1; })()`);
  assert.equal(dongChu, 0, "2. dòng máy này (của chính Toàn quyền) không có nút gỡ");
  await p.shot(join(ANH, "03-phien-dang-nhap-1040.png"));
  // Gỡ phiên salesA (lọc theo tên trước)
  await p.ev(setInput("document.getElementById('tim-ten')", "sales mot"));
  await p.waitFor("document.querySelectorAll('#list tr[data-phien]').length === 1 && document.querySelector('#list tr[data-phien]').textContent.includes('Sales Một')", "2. lọc tên không dấu ra đúng salesA");
  await p.ev("[...document.querySelectorAll('#list tr[data-phien] button')].find((b) => b.textContent === 'Đăng xuất máy này').click(), true");
  await p.waitFor("!!document.querySelector('#list [data-xac-nhan]')", "2. hộp xác nhận trong trang hiện");
  const cauXN = await p.ev("document.querySelector('#list [data-xac-nhan]').textContent");
  assert.ok(cauXN.startsWith("Đăng xuất máy ") && cauXN.includes(" của Sales Một?") && cauXN.includes("Người có PIN vẫn đăng nhập lại được."), `2. câu xác nhận: ${cauXN}`);
  await p.shot(join(ANH, "04-hop-xac-nhan-go-1040.png"));
  await p.ev("[...document.querySelectorAll('#list [data-xac-nhan] button')].find((b) => b.textContent === 'Xác nhận gỡ').click(), true");
  await p.waitFor("!document.getElementById('ok').hidden && document.getElementById('ok').textContent.startsWith('Đã đăng xuất máy ') && document.getElementById('ok').textContent.includes(' của Sales Một.')", "2. báo đã gỡ");
  await p.waitFor("document.querySelectorAll('#list tr[data-phien]').length === 0", "2. salesA không còn phiên đang hiệu lực");
  const [{ end_reason: lyDoA }] = env.sql(`SELECT end_reason FROM aut_session WHERE staff_id = '${idA}' ORDER BY created_at DESC LIMIT 1`);
  assert.equal(lyDoA, "bi_go", "2. dòng phiên salesA kết thúc bi_go");
  await p.shot(join(ANH, "05-da-go-1040.png"));
  ok("2. Toàn quyền: lọc 'sales mot' → Sales Một, Gỡ phiên qua hộp xác nhận trong trang → báo đã gỡ, danh sách trống, CSDL bi_go");
  // Bỏ "Chỉ phiên đang hiệu lực" → thấy phiên đã gỡ với nhãn lời thường
  await p.ev("(document.getElementById('chi-song').click(), true)");
  await p.waitFor("[...document.querySelectorAll('#list tr[data-phien]')].some((r) => r.textContent.includes('Bị IT/Toàn quyền gỡ'))", "2. bỏ lọc: thấy phiên đã gỡ, nhãn lời thường");
  await p.ev("(document.getElementById('chi-song').click(), true)");
  await p.waitFor("document.getElementById('chi-song').checked && document.querySelectorAll('#list tr[data-phien]').length === 0", "2. bật lại lọc");
  // Gỡ phiên + đặt lại PIN cho salesB
  await p.ev(setInput("document.getElementById('tim-ten')", "Sales Hai"));
  await p.waitFor("document.querySelectorAll('#list tr[data-phien]').length === 1", "2. lọc ra salesB");
  await p.ev("[...document.querySelectorAll('#list tr[data-phien] button')].find((b) => b.textContent === 'Đăng xuất mọi máy + đặt lại PIN').click(), true");
  await p.waitFor("!!document.querySelector('#list [data-xac-nhan]')", "2. hộp xác nhận (đặt lại PIN)");
  await p.ev("[...document.querySelectorAll('#list [data-xac-nhan] button')].find((b) => b.textContent === 'Xác nhận gỡ và đặt lại PIN').click(), true");
  await p.waitFor("!document.getElementById('secret').hidden && /^\\d{6}$/.test(document.querySelector('#secret td.pin')?.textContent ?? '')", "2. PIN mới hiện một lần");
  assert.ok((await p.ev("document.getElementById('ok').textContent")).startsWith("Đã đăng xuất máy này và đã đặt lại PIN của Sales Hai"), "2. báo gỡ + đặt lại PIN");
  const [{ end_reason: lyDoB }] = env.sql(`SELECT end_reason FROM aut_session WHERE staff_id = '${idB}' ORDER BY created_at DESC LIMIT 1`);
  assert.equal(lyDoB, "bi_go", "2. phiên salesB kết thúc bi_go (gỡ trước, đặt lại PIN sau)");
  await p.shot(join(ANH, "06-go-va-dat-lai-pin-1040.png"));
  assert.equal(await p.ev("window.__soConfirm"), 0, "2. không lời gọi window.confirm nào");
  assert.deepEqual(p.consoleErrors, [], "2. không lỗi JS");
  p.close();
  ok("2. Gỡ phiên + đặt lại PIN (salesB) → PIN mới hiện một lần, phiên bi_go; 0 lời gọi window.confirm, không lỗi JS");

  // 390: thẻ + hộp xác nhận (gỡ phiên của salesA lần đăng nhập mới)
  await env.login(ACCOUNTS.salesA);
  p = await mo(ACCOUNTS.chu, "/sessions", MOB);
  await p.waitFor("[...document.querySelectorAll('#list-cards [data-phien]')].some((c) => c.textContent.includes('Sales Một'))", "390. thẻ salesA");
  await p.ev("[...document.querySelectorAll('#list-cards [data-phien]')].find((c) => c.textContent.includes('Sales Một')).querySelector('button').click(), true");
  await p.waitFor("!!document.querySelector('#list-cards [data-xac-nhan]')", "390. hộp xác nhận trong thẻ");
  const tran = await p.ev("document.documentElement.scrollWidth <= window.innerWidth");
  assert.ok(tran, "390. không cuộn ngang");
  await p.ev("document.querySelector('#list-cards [data-xac-nhan]').scrollIntoView({ block: 'center' }), true");
  await p.shot(join(ANH, "07-phien-dang-nhap-the-390.png"));
  assert.deepEqual(p.consoleErrors, [], "390. không lỗi JS");
  p.close();
  ok("390: thẻ + hộp xác nhận trong thẻ, không cuộn ngang, không lỗi JS");

  // ---- 3. Tài khoản thiếu ô auth.session.viewAll
  const CAU = "Trang Máy đang đăng nhập chỉ người phụ trách hệ thống (IT, Toàn quyền) xem được.";
  for (const [ten, acc] of [["Quản trị", ACCOUNTS.admin], ["Kế toán", ACCOUNTS.accounting]]) {
    p = await mo(acc, "/account", DESK);
    assert.ok(!(await thanhBen(p)).includes("Máy đang đăng nhập"), `3. ${ten}: thanh bên không có mục`);
    await p.waitFor("!document.getElementById('my-sessions').hidden", `3. ${ten}: vẫn có mục Phiên đăng nhập của tôi`, 8000);
    assert.ok(!(await dongTo(p)).some((t) => t.startsWith("Máy đang đăng nhập")), `3. ${ten}: trang Tôi không có dòng Phiên đăng nhập`);
    assert.deepEqual(p.consoleErrors, [], `3. ${ten}: trang Tôi không lỗi JS`);
    p.close();
    p = await mo(acc, "/sessions", DESK);
    assert.deepEqual(await baoLoi(p), [CAU], `3. ${ten}: đúng một câu từ chối`);
    assert.ok(!p.requests.some((r) => r.url.includes("/api/sessions")), `3. ${ten}: không gọi /api/sessions`);
    assert.equal(await p.ev("document.getElementById('table-card').hidden && document.getElementById('filters').hidden"), true, `3. ${ten}: không dựng bảng / ô lọc`);
    assert.deepEqual(p.consoleErrors, [], `3. ${ten}: /sessions không lỗi JS`);
    if (ten === "Quản trị") await p.shot(join(ANH, "08-quan-tri-bi-tu-choi-1040.png"));
    p.close();
    ok(`3. ${ten}: không mục ở thanh bên / trang Tôi; /sessions → "${CAU}", không gọi API, không lỗi JS`);
  }
} catch (e) {
  loi = 1;
  console.error(`✗ ${e.message}`);
} finally {
  await env.stop();
}
process.exit(loi);
