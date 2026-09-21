// Kiểm giao diện CHẾ ĐỘ BẢO TRÌ bằng Chrome thật (nằm trong repo, không thêm dependency; KHÔNG cần mạng ngoài — Turnstile TẮT như các kịch bản A2). Chạy từ GỐC repo sau `npm run build:web`:
//   AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/kich-ban/chrome-wrap.sh> [OUT=<thư mục ghi ảnh>] node docs/evidence/2026-09-21-v1-0/kich-ban/v1-bao-tri.mjs
// Phủ: mục bật/tắt ở /account (xác nhận hai bước trong trang, không window.confirm), dải "Đang ở chế độ bảo trì", lớp phủ toàn trang + đếm ngược sống + nút Đăng xuất + tự nhận ra khi chủ tắt,
// banner ở /login, đăng nhập bị 503, hết giờ dự kiến, nhật ký không chứa SĐT, axe-core. Sửa web/maintenance-screen.ts, web/api.ts (phần bảo trì), web/account.ts (mục bảo trì), web/shell.ts (dải) thì chạy lại.
// Môi trường của A2 (D1 tạm + wrangler dev Turnstile TẮT + Chrome CDP). "Chủ" = tài khoản admin thử (được đặt vào mnt_setting.allowed_phones), "nhân viên" = salesA.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const { ACCOUNTS, ok, setInput, sleep, startEnv } = await import(pathToFileURL(join(process.cwd(), "docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs")).href);
const OUT = process.env.OUT ?? "/tmp/bao-tri-ui";
const AXE = readFileSync(process.env.AXE_JS ?? "", "utf8");
mkdirSync(join(OUT, "anh"), { recursive: true });

const env = await startEnv();
// Phiên của nhân viên lấy TRƯỚC khi bật bảo trì (bật rồi thì đăng nhập của họ bị chặn — đúng thứ ta muốn kiểm); các bước sau dùng lại phiên này = "phiên đang mở".
// Các trang Chrome dùng CHUNG một kho cookie (CLAUDE.md §8): phiên của trang nào đang thao tác phải được đặt lại vào kho ngay trước đó (use()).
const salesCookie = await env.login(ACCOUNTS.salesA);
const ownerCookie = await env.login(ACCOUNTS.admin);
const acctCookie = await env.login(ACCOUNTS.accounting);
const use = (page, cookie) => page.send("Network.setCookie", { name: cookie.name, value: cookie.value, url: env.base, httpOnly: true });
async function asCookie(cookie, path) {
  const page = await env.openPage();
  await use(page, cookie);
  await page.send("Page.navigate", { url: env.base + path });
  await page.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
  return page;
}
const failures = [];
const step = async (name, fn) => {
  try {
    await fn();
    ok(name);
  } catch (e) {
    failures.push(name);
    console.log(`✗ ${name}\n   ${String(e.message).split("\n")[0]}`);
  }
};
const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
const text = (page, sel) => page.ev(`${q(sel)}?.textContent ?? null`);
const click = (page, sel) => page.ev(`(() => { const e = ${q(sel)}; if (!e) return false; e.click(); return true; })()`);
const clickByText = (page, scope, label) =>
  page.ev(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(scope)} + ' button')].find((x) => x.textContent.trim() === ${JSON.stringify(label)}); if (!b) return false; b.click(); return true; })()`);
const axeViolations = async (page) => {
  await page.ev(AXE);
  const r = await page.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }).then((x) => x.violations.map((v) => v.id + ' [' + v.nodes.map((n) => n.target.join(' ')).join(' | ') + ']'))`);
  return r;
};

try {
  const OWNER = ACCOUNTS.admin;
  env.sql(`UPDATE mnt_setting SET allowed_phones = '${OWNER.phone}' WHERE id = 'default'`); // chủ thử = admin thử

  // Nhân viên mở sẵn trang Tôi và gõ dở PIN — để thử "dữ liệu đang gõ không mất khi lớp phủ hiện".
  const staffPage = await asCookie(salesCookie, "/account");
  await staffPage.waitFor(`!!${q("#pin-form")}`, "trang Tôi của nhân viên");
  await staffPage.ev(setInput(q("#current"), "246810"));
  await staffPage.ev(setInput(q("#new"), "135791"));
  await staffPage.ev(setInput(q("#confirm"), "135791"));

  // ---- Chủ: trang Tôi ----
  const owner = await asCookie(ownerCookie, "/account");
  await step("chủ thấy mục Chế độ bảo trì (tắt), 3 nút nhanh, ô chọn giờ, chưa có dải", async () => {
    await owner.waitFor(`${q("#maintenance")} && !${q("#maintenance")}.hidden`, "mục bảo trì hiện");
    assert.match(await text(owner, "#maintenance .maint-state"), /Đang tắt/);
    assert.deepEqual(await owner.ev(`[...document.querySelectorAll('#maintenance .maint-quick button')].map((b) => b.textContent)`), ["30 phút", "60 phút", "120 phút"]);
    assert.equal(await owner.ev(`${q("#maint-eta")}.type`), "datetime-local");
    assert.equal(await owner.ev(`parseFloat(getComputedStyle(${q("#maint-eta")}).fontSize)`) >= 16, true, "ô gõ ≥ 16px");
    assert.equal(await owner.ev(`!!${q("#maint-strip")}`), false);
    await owner.shot(join(OUT, "anh/bt-01-trang-toi-tat.png"));
  });

  await step("nhân viên KHÔNG thấy mục (không phải admin) — mở bằng tài khoản kế toán", async () => {
    const acc = await asCookie(acctCookie, "/account");
    await acc.waitFor(`!!${q("#pin-form")}`, "trang Tôi");
    await sleep(600);
    assert.equal(await acc.ev(`${q("#maintenance")}.hidden`), true);
    acc.close();
    await use(owner, ownerCookie); // trả phiên của chủ vào kho cookie chung
  });

  await step("bật mà chưa chọn giờ → báo lỗi, chưa sang bước xác nhận", async () => {
    await clickByText(owner, "#maintenance", "Bật chế độ bảo trì");
    assert.match(await text(owner, "#maintenance [role=alert]"), /chọn thời gian dự kiến hoàn tất/);
    assert.equal(await owner.ev(`!!${q(".maint-confirm")} && !${q(".maint-confirm")}.closest('[hidden]')`), false);
  });

  await step("xác nhận hai bước NGAY TRONG TRANG: chọn 60 phút → cảnh báo đúng chữ → Quay lại → lại xác nhận", async () => {
    await clickByText(owner, ".maint-quick", "60 phút");
    assert.equal(await owner.ev(`[...document.querySelectorAll('.maint-quick button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent).join()`), "60 phút");
    await clickByText(owner, "#maintenance", "Bật chế độ bảo trì");
    await owner.waitFor(`!!${q(".maint-confirm")} && ${q(".maint-confirm")}.offsetParent !== null`, "khối xác nhận hiện");
    assert.match(await text(owner, ".maint-confirm"), /Mọi nhân viên khác sẽ bị chặn ngay, kể cả người đang mở app\. Chỉ bạn dùng được\./);
    assert.match(await text(owner, ".maint-confirm"), /Dự kiến hoàn tất lúc \d\d:\d\d \d\d\/\d\d\/\d{4}\./);
    await owner.shot(join(OUT, "anh/bt-02-xac-nhan.png"));
    assert.equal(await owner.ev(`document.activeElement === ${q(".maint-confirm")}`), true, "tiêu điểm chuyển vào khối xác nhận");
    await clickByText(owner, ".maint-confirm", "Quay lại");
    assert.equal(await owner.ev(`${q(".maint-quick")}.offsetParent !== null`), true, "về lại bước chọn giờ");
    await clickByText(owner, "#maintenance", "Bật chế độ bảo trì");
    await owner.waitFor(`${q(".maint-confirm")}.offsetParent !== null`, "khối xác nhận hiện lại");
  });

  await step("Xác nhận bật → Đang bật + giờ dự kiến + đếm ngược sống + dải trên đầu trang", async () => {
    await clickByText(owner, ".maint-confirm", "Xác nhận bật");
    await owner.waitFor(`/Đang bật/.test(${q("#maintenance .maint-state")}?.textContent ?? '')`, "chuyển sang Đang bật");
    assert.match(await text(owner, "#maintenance .maint-state"), /Dự kiến hoàn tất lúc \d\d:\d\d \d\d\/\d\d\/\d{4}/);
    const a = await text(owner, "#maint-preview .maint-count");
    assert.match(a, /^(59 phút \d\d giây|1 giờ 00 phút 00 giây)$/);
    await sleep(2200);
    const b = await text(owner, "#maint-preview .maint-count");
    assert.notEqual(a, b, "đồng hồ phải chạy");
    assert.match(await text(owner, "#maint-strip"), /^Đang ở chế độ bảo trì — chỉ bạn dùng được$/);
    assert.equal(await owner.ev(`${q("#maint-strip")}.getAttribute('href')`), "/account");
    assert.equal(await owner.ev(`${q("#maint-strip")}.getBoundingClientRect().height >= 44`), true, "dải cao ≥ 44px");
    assert.deepEqual(await owner.ev(`[...document.querySelectorAll('#maintenance button')].map((b) => b.textContent.trim()).filter((t) => t.startsWith('Tắt') || t.startsWith('Cập nhật'))`), ["Cập nhật giờ dự kiến", "Tắt chế độ bảo trì"]);
    await owner.shot(join(OUT, "anh/bt-03-dang-bat.png"));
  });

  await step("chủ vẫn dùng app bình thường khi đang bật (điều hướng sang / và /staff không bị chặn)", async () => {
    const r = await owner.ev(`fetch('/api/auth/me').then((x) => x.status)`);
    assert.equal(r, 200);
    assert.equal(await owner.ev(`fetch('/api/staff').then((x) => x.status)`), 200);
  });

  // ---- Nhân viên bị chặn ----
  await step("nhân viên đang mở app: gửi form → 503 → lớp phủ toàn trang; dữ liệu đang gõ còn nguyên; chỉ MỘT lớp", async () => {
    await use(staffPage, salesCookie);
    await staffPage.ev(`${q("#pin-form")}.requestSubmit()`);
    await staffPage.ev(`${q("#pin-form")}.requestSubmit()`); // hai lời gọi liên tiếp → vẫn một lớp
    await staffPage.waitFor(`!!${q("#maintenance-screen")}`, "lớp phủ hiện");
    assert.equal(await staffPage.ev(`document.querySelectorAll('#maintenance-screen').length`), 1);
    assert.equal(await staffPage.ev(`${q("#maintenance-screen")}.getAttribute('role')`), "alertdialog");
    assert.equal(await staffPage.ev(`${q("#maintenance-screen")}.getAttribute('aria-modal')`), "true");
    const before = await text(staffPage, "#maintenance-screen .maint-msg");
    assert.match(before, /^Hệ thống đang tạm đóng để bảo trì\. Thời gian dự kiến hoàn tất là (59 phút \d\d giây|1 giờ 00 phút 00 giây|[1-5]?\d phút \d\d giây), liên hệ quản trị viên khi cần hỗ trợ thêm \(0989929373\)\.$/);
    assert.equal(await staffPage.ev(`${q("#current")}.value`), "246810", "chữ đang gõ không bị xoá");
    assert.equal(await staffPage.ev(`${q("#new")}.value`), "135791");
    assert.equal(await staffPage.ev(`${q("main")}.hasAttribute('inert')`), true, "trang bên dưới bị vô hiệu với bàn phím/trình đọc");
    assert.equal(await staffPage.ev(`document.activeElement?.textContent`), "Thử lại", "tiêu điểm ở nút Thử lại");
    assert.equal(await staffPage.ev(`${q("#maintenance-screen .maint-count")}.getAttribute('aria-live')`), "off");
    await sleep(2200);
    assert.notEqual(before, await text(staffPage, "#maintenance-screen .maint-msg"), "đếm ngược sống");
    assert.equal(await staffPage.ev(`${q("#maintenance-screen")}.getBoundingClientRect().width === innerWidth`), true, "phủ kín chiều ngang");
    await staffPage.shot(join(OUT, "anh/bt-04-lop-phu-nhan-vien.png"));
  });

  await step("nhân viên mở trang MỚI khi đang bật: /api/auth/me 503 → lớp phủ (không lỗi thô, không về /login)", async () => {
    const p = await asCookie(salesCookie, "/");
    await p.waitFor(`!!${q("#maintenance-screen")}`, "lớp phủ ở trang danh sách");
    assert.equal(await p.ev(`location.pathname`), "/");
    p.close();
  });

  await step("axe-core: lớp phủ bảo trì 0 vi phạm", async () => {
    const v = await axeViolations(staffPage);
    assert.deepEqual(v, []);
  });

  await step("lớp phủ có nút Đăng xuất: bấm → về /login (người bị chặn không còn phiên treo)", async () => {
    assert.deepEqual(await staffPage.ev(`[...document.querySelectorAll('#maintenance-screen button')].map((b) => b.textContent.trim())`), ["Thử lại", "Đăng xuất"]);
    assert.equal(await click(staffPage, "#maintenance-screen .btn-link"), true);
    await staffPage.waitFor(`location.pathname === '/login'`, "về trang đăng nhập sau Đăng xuất", 12000);
  });

  await step("trang đăng nhập khi đang bảo trì: banner (role=status) có đếm ngược, form vẫn dùng được; axe 0 vi phạm", async () => {
    const p = await env.openPage();
    await p.send("Network.clearBrowserCookies"); // chưa đăng nhập
    await p.send("Page.navigate", { url: `${env.base}/login` });
    await p.waitFor(`document.readyState === 'complete' && !${q("#maintenance-banner")}.hidden`, "banner hiện");
    assert.equal(await p.ev(`${q("#maintenance-banner")}.getAttribute('role')`), "status");
    assert.match(await text(p, "#maintenance-text"), /^Hệ thống đang tạm đóng để bảo trì\. Thời gian dự kiến hoàn tất là .+, liên hệ quản trị viên khi cần hỗ trợ thêm \(0989929373\)\.$/);
    assert.equal(await p.ev(`${q("#submit")}.disabled`), false, "nút Đăng nhập vẫn dùng được");
    assert.equal(await p.ev(`!!${q("#maintenance-screen")}`), false, "trang đăng nhập KHÔNG dùng lớp phủ");
    await p.shot(join(OUT, "anh/bt-05-dang-nhap-banner.png"));
    assert.deepEqual(await axeViolations(p), []);
    p.close();
  });

  await step("đăng nhập bị 503 bảo trì: banner giữ nguyên/cập nhật, KHÔNG có lỗi chung ở #error; nút mở lại; chủ đăng nhập được", async () => {
    const p = await env.openPage();
    await p.send("Network.clearBrowserCookies");
    await p.send("Page.navigate", { url: `${env.base}/login` });
    await p.waitFor(`document.readyState === 'complete' && ${q("#submit")} && !${q("#submit")}.disabled`, "form sẵn sàng");
    await p.ev(setInput(q("#phone"), ACCOUNTS.salesA.phone));
    await p.ev(setInput(q("#pin"), ACCOUNTS.salesA.pin));
    await click(p, "#submit");
    await sleep(1500);
    assert.equal(await p.ev(`${q("#error")}.hidden`), true, "không hiện lỗi chung");
    assert.equal(await p.ev(`${q("#maintenance-banner")}.hidden`), false);
    assert.equal(await p.ev(`${q("#submit")}.disabled`), false);
    assert.equal(await p.ev(`location.pathname`), "/login");
    // không tiêu hao lượt thử PIN: bảng login_attempt không có dòng của nhân viên
    assert.deepEqual(env.sql(`SELECT count(*) AS n FROM login_attempt WHERE key = 'phone:${ACCOUNTS.salesA.phone}'`), [{ n: 0 }]);
    await p.ev(setInput(q("#phone"), OWNER.phone));
    await p.ev(setInput(q("#pin"), OWNER.pin));
    await click(p, "#submit");
    await p.waitFor(`location.pathname !== '/login'`, "chủ đăng nhập xong", 12000);
    p.close();
  });

  await step("hết giờ dự kiến: lớp phủ đổi sang câu 'sắp hoàn tất', không có đồng hồ, vẫn chặn", async () => {
    env.sql(`UPDATE mnt_setting SET ends_at = '2026-01-01T00:00:00.000Z' WHERE id = 'default'`);
    const p = await asCookie(salesCookie, "/");
    await p.waitFor(`!!${q("#maintenance-screen")}`, "lớp phủ");
    assert.equal(await text(p, "#maintenance-screen .maint-msg"), "Hệ thống đang tạm đóng để bảo trì và sắp hoàn tất, liên hệ quản trị viên khi cần hỗ trợ thêm (0989929373).");
    assert.equal(await p.ev(`!!${q("#maintenance-screen .maint-count")}`), false);
    p.close();
  });

  await step("chủ tắt bằng nút (một bước): Đang tắt, dải biến mất; nhân viên vào lại được", async () => {
    const o2 = await asCookie(ownerCookie, "/account");
    await o2.waitFor(`/Đang bật/.test(${q("#maintenance .maint-state")}?.textContent ?? '')`, "đang bật");
    assert.equal(await o2.ev(`!!${q("#maint-strip")}`), true);
    await clickByText(o2, "#maintenance", "Tắt chế độ bảo trì");
    await o2.waitFor(`/Đang tắt/.test(${q("#maintenance .maint-state")}?.textContent ?? '')`, "chuyển sang Đang tắt");
    assert.equal(await o2.ev(`!!${q("#maint-strip")}`), false, "dải biến mất ngay, không cần tải lại");
    const p = await asCookie(salesCookie, "/");
    await p.waitFor(`document.readyState === 'complete' && !!${q("main")}`, "trang danh sách");
    await sleep(800);
    assert.equal(await p.ev(`!!${q("#maintenance-screen")}`), false);
    p.close();
    await o2.shot(join(OUT, "anh/bt-06-da-tat.png"));
    o2.close();
  });

  await step("nhật ký: hai dòng 'Đổi chế độ bảo trì' (bật, tắt), không chứa SĐT", async () => {
    const rows = env.sql(`SELECT action, detail FROM audit_log WHERE action = 'maintenance_changed' ORDER BY created_at`);
    assert.ok(rows.length >= 2, JSON.stringify(rows));
    assert.match(rows[0].detail, /^Bật chế độ bảo trì, dự kiến hoàn tất lúc \d\d:\d\d \d\d\/\d\d\/\d{4}$/);
    assert.equal(rows.at(-1).detail, "Tắt chế độ bảo trì");
    for (const r of rows) assert.doesNotMatch(r.detail, /\d{10}/);
  });

  await step("lớp phủ tự nhận ra khi chủ tắt (hỏi lại cấu hình mỗi 20 giây): đổi câu chữ + nút 'Tải lại trang', dừng đếm", async () => {
    env.sql(`UPDATE mnt_setting SET enabled = 1, ends_at = '${new Date(Date.now() + 30 * 60_000).toISOString()}' WHERE id = 'default'`);
    const p = await asCookie(salesCookie, "/");
    await p.waitFor(`!!${q("#maintenance-screen")}`, "lớp phủ");
    env.sql(`UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'`);
    await p.waitFor(`/Hệ thống đã mở lại/.test(${q("#maintenance-screen .maint-msg")}?.textContent ?? '')`, "lớp phủ nhận ra hệ thống đã mở lại", 40000);
    assert.equal(await text(p, "#maintenance-screen .maint-msg"), "Hệ thống đã mở lại. Bấm “Tải lại trang” để tiếp tục; phần chưa lưu trên trang này sẽ mất.");
    assert.equal(await p.ev(`!!${q("#maintenance-screen .maint-count")}`), false);
    assert.equal(await p.ev(`${q("#maintenance-screen .btn-primary")}.textContent`), "Tải lại trang");
    p.close();
  });

  await step("axe-core: trang Tôi của chủ (mục bảo trì đang tắt) 0 vi phạm", async () => {
    const o3 = await asCookie(ownerCookie, "/account");
    await o3.waitFor(`${q("#maintenance")} && !${q("#maintenance")}.hidden`, "mục hiện");
    assert.deepEqual(await axeViolations(o3), []);
    o3.close();
  });
} finally {
  await env.stop();
}
if (failures.length) {
  console.log(`\n${failures.length} bước ✗: ${failures.join(" | ")}`);
  process.exit(1);
}
console.log("\nGiao diện chế độ bảo trì: tất cả bước ✓");
