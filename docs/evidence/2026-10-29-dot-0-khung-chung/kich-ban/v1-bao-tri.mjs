// Kiểm giao diện CHẾ ĐỘ BẢO TRÌ bằng Chrome thật (nằm trong repo, không thêm dependency; KHÔNG cần mạng ngoài — Turnstile TẮT như các kịch bản A2). Chạy từ GỐC repo sau `npm run build:web`:
//   AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/kich-ban/chrome-wrap.sh> [OUT=<thư mục ghi ảnh>] node docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/v1-bao-tri.mjs
// Phủ: mục bật/tắt ở /account (xác nhận hai bước trong trang, không window.confirm), dải "Đang ở chế độ bảo trì", lớp phủ toàn trang + đếm ngược sống + nút Đăng xuất + tự nhận ra khi chủ tắt,
// banner ở /login, đăng nhập bị 503, tự tắt khi hết giờ dự kiến, nhật ký không chứa SĐT, axe-core; khung «Nội dung màn bảo trì» (bản mẫu 2c) + xem trước + lớp phủ dùng nội dung đã lưu. Sửa web/maintenance-screen.ts, web/api.ts (phần bảo trì), web/account.ts (mục bảo trì), web/shell.ts (dải) thì chạy lại.
// Môi trường của A2 (D1 tạm + wrangler dev Turnstile TẮT + Chrome CDP). "Chủ" = tài khoản Toàn quyền thử `chu`, "nhân viên" = salesA. ADR-0071 điều 3: miễn trừ bảo trì
// theo quyền Toàn quyền, KHÔNG theo SĐT — kịch bản cố ý đặt SĐT của nhân viên (không phải của chủ) vào cột cũ mnt_setting.allowed_phones; các bước "nhân viên bị
// chặn" vẫn phải đúng (danh sách SĐT không còn tác dụng), "chủ dùng bình thường" đúng nhờ Toàn quyền.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const { ACCOUNTS, ok, setInput, sleep, startEnv } = await import(pathToFileURL(join(process.cwd(), "docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs")).href);
const OUT = process.env.OUT ?? "/tmp/bao-tri-ui";
const AXE = readFileSync(process.env.AXE_JS ?? "", "utf8");
mkdirSync(join(OUT, "anh"), { recursive: true });

const env = await startEnv();
// Phiên của nhân viên lấy TRƯỚC khi bật bảo trì (bật rồi thì đăng nhập của họ bị chặn — đúng thứ ta muốn kiểm); các bước sau dùng lại phiên này = "phiên đang mở".
// Các trang Chrome dùng CHUNG một kho cookie (CLAUDE.md §8): phiên của trang nào đang thao tác phải được đặt lại vào kho ngay trước đó (use()).
let salesCookie = await env.login(ACCOUNTS.salesA); // let: bước TỰ TẮT lấy phiên mới (Task 15)
const ownerCookie = await env.login(ACCOUNTS.chu);
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
// Lớp phủ bảo trì là `position: fixed`: ảnh chụp cả trang dài (shot) lộ trang bên dưới phía dưới khung nhìn. Ảnh đúng như người dùng thấy = chỉ khung nhìn.
const shotKhungNhin = async (page, path) => { const r = await page.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); writeFileSync(path, Buffer.from(r.result.data, "base64")); };
const text = (page, sel) => page.ev(`${q(sel)}?.textContent ?? null`);
const click = (page, sel) => page.ev(`(() => { const e = ${q(sel)}; if (!e) return false; e.click(); return true; })()`);
const clickByText = (page, scope, label) =>
  page.ev(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(scope)} + ' button')].find((x) => x.textContent.trim() === ${JSON.stringify(label)}); if (!b) return false; b.click(); return true; })()`);
const axeViolations = async (page) => {
  await page.ev(AXE);
  // Task 15 (29/10): tắt RIÊNG luật `meta-viewport` — axe 4.13 xếp `user-scalable=no` (chọn từ trước, có ở mọi trang, không do đợt 0) vào wcag2aa mức vừa;
  // bản gốc 21/9 chạy với axe cũ chưa bắt luật này. Mọi luật khác giữ, vẫn đòi 0 vi phạm.
  const r = await page.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'], rules: { 'meta-viewport': { enabled: false } } }).then((x) => x.violations.map((v) => v.id + ' [' + v.nodes.map((n) => n.target.join(' ')).join(' | ') + ']'))`);
  return r;
};

try {
  const OWNER = ACCOUNTS.chu;
  // ADR-0071 điều 3: SĐT trong danh sách cũ KHÔNG còn được miễn — đặt số của nhân viên vào đó; các bước dưới vẫn đòi nhân viên bị chặn.
  env.sql(`UPDATE mnt_setting SET allowed_phones = '${ACCOUNTS.salesA.phone}' WHERE id = 'default'`);

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
    assert.equal(await owner.ev(`!!${q('.dai[data-loai="bao-tri"]')}`), false);
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
    assert.match(await text(owner, ".maint-confirm"), /Mọi nhân viên khác sẽ bị chặn ngay, kể cả người đang mở Nền tảng\. Chỉ bạn dùng được\./); // Task 15: chữ giao diện «app» → «Nền tảng» (luật 2/10)
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
    assert.match(await text(owner, '.dai[data-loai="bao-tri"]'), /^Đang bảo trì/);
    assert.equal(await owner.ev(`${q('.dai[data-loai="bao-tri"] a')}.getAttribute('href')`), "/account");
    assert.equal(await owner.ev(`${q('.dai[data-loai="bao-tri"]')}.getBoundingClientRect().height >= 44`), true, "dải cao ≥ 44px");
    assert.deepEqual(await owner.ev(`[...document.querySelectorAll('#maintenance button')].map((b) => b.textContent.trim()).filter((t) => t.startsWith('Tắt') || t.startsWith('Đổi giờ'))`), ["Đổi giờ dự kiến", "Tắt chế độ bảo trì"]);
    await owner.shot(join(OUT, "anh/bt-03-dang-bat.png"));
  });

  // Đợt D Task 4 (ADR-0015): ở máy tính body là LƯỚI ba hàng (thanh bên | thanh công việc / dải bảo trì / main) và
  // dải bảo trì được đặt tường minh vào hàng 2 cột 2. Mọi bước khác của kịch bản này chạy ở khổ điện thoại 390px
  // (openPage() mặc định), tức là chỗ ĐẶT MỚI của dải chưa từng được tái hiện — đo ở đây, rồi trả lại khổ cũ.
  await step("dải bảo trì ở khổ máy tính: đúng hàng 2 của lưới, dưới thanh công việc và trên nội dung, không đè lên nhau", async () => {
    await owner.send("Emulation.setDeviceMetricsOverride", { width: 1040, height: 800, deviceScaleFactor: 1, mobile: false });
    const m = await owner.ev(`(() => {
      const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), height: Math.round(b.height) }; };
      return { strip: r('.dai[data-loai="bao-tri"]'), topbar: r('#topbar'), main: r('main'), sidebar: r('#sidebar'), innerWidth, scrollWidth: document.scrollingElement.scrollWidth };
    })()`);
    assert.ok(m.strip, `dải bảo trì phải có mặt ở khổ máy tính — ${JSON.stringify(m)}`);
    assert.ok(m.strip.top >= m.topbar.bottom - 1, `dải phải nằm DƯỚI thanh công việc, không đè lên — ${JSON.stringify(m)}`);
    assert.ok(m.main.top >= m.strip.bottom - 1, `nội dung trang phải bắt đầu DƯỚI dải, không bị dải đè — ${JSON.stringify(m)}`);
    assert.equal(m.strip.left, m.sidebar.right, `dải phải bắt đầu ngay sau thanh bên (cột 2 của lưới) — ${JSON.stringify(m)}`);
    assert.equal(m.strip.right, m.innerWidth, `dải phải chạy hết bề rộng cột nội dung — ${JSON.stringify(m)}`);
    assert.ok(m.scrollWidth <= m.innerWidth + 1, `không được tràn ngang — ${JSON.stringify(m)}`);
    await owner.shot(join(OUT, "anh/bt-03b-dai-bao-tri-may-tinh.png"));
    await owner.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
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
    // Màn mới (bản mẫu chủ dự án 13/11/2026, phương án 2a): tiêu đề + lời nhắn + đồng hồ ba ô + giờ mở lại + nút gọi / Zalo + thẻ website.
    assert.equal(await text(staffPage, "#maintenance-title"), "Hệ thống đang bảo trì");
    assert.match(await text(staffPage, "#maintenance-screen .huy-hieu"), /Đang bảo trì/);
    assert.match(await text(staffPage, "#maintenance-screen .maint-msg"), /^Tour Đảo Booking đang được nâng cấp/);
    const before = await text(staffPage, "#maintenance-screen .maint-o");
    assert.deepEqual(await staffPage.ev(`[...document.querySelectorAll('#maintenance-screen .maint-o-nhan')].map((e) => e.textContent)`), ["giờ", "phút", "giây"]);
    assert.match(await text(staffPage, "#maintenance-screen .maint-mo-lai"), /^Mở lại lúc \d\d:\d\d \d\d\/\d\d\/\d{4}$/);
    assert.deepEqual(await staffPage.ev(`[...document.querySelectorAll('#maintenance-screen .maint-lien-he a')].map((a) => a.getAttribute('href'))`), ["tel:0989929373", "https://zalo.me/0989929373"]);
    assert.equal(await text(staffPage, "#maintenance-screen .maint-lien-he a"), "Gọi 0989 929 373");
    assert.equal(await staffPage.ev(`${q("#maintenance-screen .maint-web")}.getAttribute('href')`), "https://tourdao.vn");
    assert.equal(await staffPage.ev(`${q("#current")}.value`), "246810", "chữ đang gõ không bị xoá");
    assert.equal(await staffPage.ev(`${q("#new")}.value`), "135791");
    assert.equal(await staffPage.ev(`${q("main")}.hasAttribute('inert')`), true, "trang bên dưới bị vô hiệu với bàn phím/trình đọc");
    assert.equal(await staffPage.ev(`document.activeElement?.textContent`), "Thử lại", "tiêu điểm ở nút Thử lại");
    assert.equal(await staffPage.ev(`${q("#maintenance-screen .maint-o")}.getAttribute('role')`), "timer");
    assert.equal(await staffPage.ev(`${q("#maintenance-screen .maint-o")}.getAttribute('aria-live')`), "off");
    await sleep(2200);
    assert.notEqual(before, await text(staffPage, "#maintenance-screen .maint-o"), "đếm ngược sống");
    assert.equal(await staffPage.ev(`${q("#maintenance-screen")}.getBoundingClientRect().width === innerWidth`), true, "phủ kín chiều ngang");
    await shotKhungNhin(staffPage, join(OUT, "anh/bt-04-lop-phu-nhan-vien.png"));
    await staffPage.send("Emulation.setDeviceMetricsOverride", { width: 1040, height: 844, deviceScaleFactor: 1, mobile: false });
    await sleep(300);
    await shotKhungNhin(staffPage, join(OUT, "anh/bt-04-lop-phu-nhan-vien-1040.png"));
    await staffPage.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  });

  await step("nhân viên mở trang MỚI khi đang bật: /api/auth/me 503 → lớp phủ (không lỗi thô, không về /login)", async () => {
    const p = await asCookie(salesCookie, "/");
    await p.waitFor(`!!${q("#maintenance-screen")}`, "lớp phủ ở trang chủ");
    assert.equal(await p.ev(`location.pathname`), "/");
    p.close();
  });

  await step("axe-core: lớp phủ bảo trì 0 vi phạm", async () => {
    const v = await axeViolations(staffPage);
    assert.deepEqual(v, []);
  });

  await step("lớp phủ có nút Đăng xuất: bấm → về /login (người bị chặn không còn phiên treo)", async () => {
    assert.deepEqual(await staffPage.ev(`[...document.querySelectorAll('#maintenance-screen button')].map((b) => b.textContent.trim())`), ["Thử lại", "Đăng xuất"]);
    assert.equal(await click(staffPage, '#maintenance-screen .nut[data-cap="loi"]'), true);
    await staffPage.waitFor(`location.pathname === '/login'`, "về trang đăng nhập sau Đăng xuất", 12000);
  });

  await step("trang đăng nhập khi đang bảo trì: banner (role=status) có đếm ngược, form vẫn dùng được; axe 0 vi phạm", async () => {
    const p = await env.openPage();
    await p.send("Network.clearBrowserCookies"); // chưa đăng nhập
    await p.send("Page.navigate", { url: `${env.base}/login` });
    await p.waitFor(`document.readyState === 'complete' && !${q("#maintenance-banner")}.hidden`, "banner hiện");
    assert.equal(await p.ev(`${q("#maintenance-banner")}.getAttribute('role')`), "status");
    assert.match(await text(p, "#maintenance-text"), /^Hệ thống đang tạm đóng để bảo trì\. Thời gian dự kiến hoàn tất là .+, liên hệ quản trị viên khi cần hỗ trợ thêm \(0989929373\)\.$/);
    // Bản thiết kế Đăng nhập (2026-09-24): nút khoá tới khi gõ đủ SĐT + 6 số PIN — banner bảo trì KHÔNG khoá thêm.
    await p.ev(setInput(q("#phone"), ACCOUNTS.salesA.phone));
    await p.ev(setInput(q("#pin"), ACCOUNTS.salesA.pin));
    await p.waitFor(`!${q("#submit")}.disabled`, "nút Đăng nhập vẫn dùng được (mở khi gõ đủ)");
    assert.equal(await p.ev(`!!${q("#maintenance-screen")}`), false, "trang đăng nhập KHÔNG dùng lớp phủ");
    await p.shot(join(OUT, "anh/bt-05-dang-nhap-banner.png"));
    assert.deepEqual(await axeViolations(p), []);
    p.close();
  });

  await step("đăng nhập bị 503 bảo trì: banner giữ nguyên/cập nhật, KHÔNG có lỗi chung ở #error; nút mở lại; chủ đăng nhập được", async () => {
    const p = await env.openPage();
    await p.send("Network.clearBrowserCookies");
    await p.send("Page.navigate", { url: `${env.base}/login` });
    await p.waitFor(`document.readyState === 'complete' && !!${q("#submit")}`, "form tải xong");
    await p.ev(setInput(q("#phone"), ACCOUNTS.salesA.phone));
    await p.ev(setInput(q("#pin"), ACCOUNTS.salesA.pin));
    await p.waitFor(`!${q("#submit")}.disabled`, "form sẵn sàng (gõ đủ, nút mở)");
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

  await step("TỰ TẮT khi hết giờ dự kiến (chủ dự án 30/9): lớp phủ đang đếm → về 0 → tự báo 'đã mở lại' (trước vòng hỏi 20 giây); banner đăng nhập tự ẩn", async () => {
    const ENDS_SOON = () => new Date(Date.now() + 8000).toISOString();
    // Task 15 (29/10): phiên nhân viên đã kết thúc ở bước «Đăng xuất» phía trên (ADR-0075, một phiên mỗi tài khoản Bán hàng) nên bản cũ mở "/" ra /login, không có
    // lớp phủ, rồi kéo đổ ba bước sau (giờ dự kiến kẹt ở +8 giây). Lấy phiên mới: tắt bảo trì bằng SQL trên D1 tạm, đăng nhập, bật lại.
    env.sql(`UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'`);
    salesCookie = await env.login(ACCOUNTS.salesA);
    env.sql(`UPDATE mnt_setting SET enabled = 1 WHERE id = 'default'`);
    env.sql(`UPDATE mnt_setting SET ends_at = '${ENDS_SOON()}' WHERE id = 'default'`);
    const p = await asCookie(salesCookie, "/");
    await p.waitFor(`!!${q("#maintenance-screen .maint-o")} && !${q("#maintenance-screen .maint-dem")}.hidden`, "lớp phủ có đồng hồ đếm ngược");
    await p.waitFor(`${q("#maintenance-title")}?.textContent === 'Hệ thống đã mở lại'`, "đồng hồ về 0 → lớp phủ hỏi lại ngay, thấy đã mở lại", 15000);
    assert.equal(await p.ev(`${q('#maintenance-screen .nut[data-cap="chinh"]')}.textContent`), "Tải lại trang");
    assert.match(await text(p, "#maintenance-screen .huy-hieu"), /Đã mở lại/);
    assert.equal(await p.ev(`${q("#maintenance-screen .maint-lien-he")}.offsetParent === null`), true, "mở lại thì ẩn nút gọi / Zalo");
    await p.shot(join(OUT, "anh/bt-04b-lop-phu-da-mo-lai.png"));
    p.close();
    env.sql(`UPDATE mnt_setting SET ends_at = '${ENDS_SOON()}' WHERE id = 'default'`);
    const l = await env.openPage();
    await l.send("Network.clearBrowserCookies");
    await l.send("Page.navigate", { url: `${env.base}/login` });
    await l.waitFor(`document.readyState === 'complete' && ${q("#maintenance-banner")}?.hidden === false`, "banner bảo trì đang hiện");
    await l.waitFor(`${q("#maintenance-banner")}.hidden === true`, "đồng hồ về 0 → banner tự ẩn", 15000);
    l.close();
    // Trả giờ tương lai để bước sau (chủ tắt bằng nút) còn thấy "Đang bật".
    env.sql(`UPDATE mnt_setting SET ends_at = '${new Date(Date.now() + 30 * 60_000).toISOString()}' WHERE id = 'default'`);
  });

  await step("chủ tắt bằng nút (một bước): Đang tắt, dải biến mất; nhân viên vào lại được", async () => {
    const o2 = await asCookie(ownerCookie, "/account");
    await o2.waitFor(`/Đang bật/.test(${q("#maintenance .maint-state")}?.textContent ?? '')`, "đang bật");
    assert.equal(await o2.ev(`!!${q('.dai[data-loai="bao-tri"]')}`), true);
    await clickByText(o2, "#maintenance", "Tắt chế độ bảo trì");
    await o2.waitFor(`/Đang tắt/.test(${q("#maintenance .maint-state")}?.textContent ?? '')`, "chuyển sang Đang tắt");
    assert.equal(await o2.ev(`!!${q('.dai[data-loai="bao-tri"]')}`), false, "dải biến mất ngay, không cần tải lại");
    const p = await asCookie(salesCookie, "/");
    await p.waitFor(`document.readyState === 'complete' && !!${q("main")}`, "trang chủ");
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
    await p.waitFor(`${q("#maintenance-title")}?.textContent === 'Hệ thống đã mở lại'`, "lớp phủ nhận ra hệ thống đã mở lại", 40000);
    assert.equal(await text(p, "#maintenance-screen .maint-msg"), "Bảo trì đã xong. Tải lại trang để tiếp tục làm việc.");
    assert.equal(await p.ev(`${q("#maintenance-screen .maint-dem")}.offsetParent === null`), true, "đồng hồ đã ẩn");
    assert.equal(await p.ev(`${q('#maintenance-screen .nut[data-cap="chinh"]')}.textContent`), "Tải lại trang");
    await p.shot(join(OUT, "anh/bt-07-lop-phu-chu-tat.png"));
    p.close();
  });

  // ---- Bản mẫu 2c (13/11/2026): chủ tự sửa nội dung màn bảo trì, xem trước trực tiếp; người bị chặn thấy đúng nội dung đã lưu ----
  await step("chủ sửa nội dung: đủ 7 ô + 5 công tắc, ô gõ ≥ 16px; gõ SĐT / tiêu đề → bản xem trước đổi ngay; tắt «Thẻ website» → thẻ biến mất khỏi xem trước", async () => {
    const o = await asCookie(ownerCookie, "/account");
    await o.waitFor(`!!${q("#maint-nd-tieuDe")}`, "khung nội dung màn bảo trì");
    assert.equal(await o.ev(`document.querySelectorAll('.maint-nd-o').length`), 7);
    assert.equal(await o.ev(`document.querySelectorAll('.maint-nd-cong-tac .dp-switch').length`), 5);
    assert.equal(await o.ev(`${q("#maint-nd-sdt")}.value`), "0989929373", "chưa lưu: điền sẵn mặc định");
    assert.equal(await o.ev(`[...document.querySelectorAll('.maint-nd .o')].every((e) => parseFloat(getComputedStyle(e).fontSize) >= 16)`), true, "ô gõ ≥ 16px");
    // Điện thoại: bản xem trước ẩn tới khi bấm «Xem trước màn bảo trì».
    assert.equal(await o.ev(`${q(".maint-nd-xem")}.offsetParent === null`), true, "390: xem trước ẩn sẵn");
    assert.equal(await clickByText(o, ".maint-nd", "Xem trước màn bảo trì"), true);
    assert.equal(await o.ev(`${q(".maint-nd-xem")}.offsetParent !== null`), true, "bấm thì hiện");
    await o.ev(setInput(q("#maint-nd-tieuDe"), "Nâng cấp bảng giá"));
    await o.ev(setInput(q("#maint-nd-lyDo"), "Cập nhật giá mùa cao điểm."));
    await o.ev(setInput(q("#maint-nd-sdt"), "0905 123 456"));
    await o.ev(setInput(q("#maint-nd-zalo"), "https://zalo.me/0905123456"));
    assert.equal(await text(o, ".maint-xem-truoc .maint-title"), "Nâng cấp bảng giá");
    assert.equal(await text(o, ".maint-xem-truoc .maint-lien-he a"), "Gọi 0905 123 456");
    assert.equal(await text(o, ".maint-xem-truoc .maint-ly-do span:last-child"), "Cập nhật giá mùa cao điểm.");
    assert.equal(await o.ev(`!!${q(".maint-xem-truoc .maint-web")}`), true);
    await o.ev(`${q('.maint-nd-cong-tac:nth-child(5) .dp-switch')}.click()`); // thứ tự: (nhãn nhóm), Nội dung bảo trì, Nút gọi, Nút Zalo, Thẻ website
    assert.equal(await o.ev(`!!${q(".maint-xem-truoc .maint-web")}`), false, "tắt Thẻ website → xem trước bỏ thẻ");
    assert.equal(await o.ev(`${q(".maint-xem-truoc")}.inert && !document.querySelector('.maint-xem-truoc #maintenance-title')`), true, "xem trước không bấm được, không trùng id với lớp phủ thật");
    await o.ev(`${q(".maint-nd")}.scrollIntoView()`);
    await o.shot(join(OUT, "anh/bt-08-sua-noi-dung-390.png"));
    await o.send("Emulation.setDeviceMetricsOverride", { width: 1040, height: 900, deviceScaleFactor: 1, mobile: false });
    assert.equal(await o.ev(`${q(".maint-nd-nut-xem")}.offsetParent === null && ${q(".maint-nd-xem")}.offsetParent !== null`), true, "máy tính: xem trước luôn hiện, không cần nút");
    await o.shot(join(OUT, "anh/bt-08b-sua-noi-dung-1040.png"));
    await o.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    // SĐT sai → báo lỗi tiếng Việt ngay, không gửi.
    await o.ev(setInput(q("#maint-nd-sdt"), "0905"));
    assert.equal(await clickByText(o, ".maint-nd", "Lưu nội dung"), true);
    await o.waitFor(`!${q(".maint-nd .alert")}.hidden`, "báo lỗi SĐT");
    assert.match(await text(o, ".maint-nd .alert"), /10 số/);
    assert.equal(env.sql(`SELECT content_json FROM mnt_setting`)[0].content_json, null, "lỗi thì chưa ghi");
    await o.ev(setInput(q("#maint-nd-sdt"), "0905 123 456"));
    assert.equal(await clickByText(o, ".maint-nd", "Lưu nội dung"), true);
    await o.waitFor(`/Đã lưu/.test(${q(".maint-nd [role=status]")}?.textContent ?? "")`, "đã lưu");
    const luu = JSON.parse(env.sql(`SELECT content_json FROM mnt_setting`)[0].content_json);
    assert.equal(luu.sdt, "0905123456");
    assert.equal(luu.hienWeb, false);
    assert.equal(luu.tieuDe, "Nâng cấp bảng giá");
    o.close();
  });

  await step("nhân viên bị chặn thấy ĐÚNG nội dung chủ đã lưu (tiêu đề, nội dung bảo trì, nút gọi số mới, Zalo mới, không có thẻ website)", async () => {
    env.sql(`UPDATE mnt_setting SET enabled = 1, ends_at = '${new Date(Date.now() + 30 * 60_000).toISOString()}' WHERE id = 'default'`);
    const p = await asCookie(salesCookie, "/");
    await p.waitFor(`!!${q("#maintenance-screen")}`, "lớp phủ");
    assert.equal(await text(p, "#maintenance-title"), "Nâng cấp bảng giá");
    assert.equal(await text(p, "#maintenance-screen .maint-ly-do span:last-child"), "Cập nhật giá mùa cao điểm.");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('#maintenance-screen .maint-lien-he a')].map((a) => a.getAttribute('href'))`), ["tel:0905123456", "https://zalo.me/0905123456"]);
    assert.equal(await p.ev(`!!${q("#maintenance-screen .maint-web")}`), false);
    await shotKhungNhin(p, join(OUT, "anh/bt-09-nhan-vien-thay-noi-dung-moi.png"));
    assert.deepEqual(await axeViolations(p), []);
    env.sql(`UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'`);
    p.close();
  });

  await step("Về mặc định → điền lại nội dung mặc định (chưa ghi); Lưu nội dung → về mặc định", async () => {
    const o = await asCookie(ownerCookie, "/account");
    await o.waitFor(`${q("#maint-nd-sdt")}?.value === "0905123456"`, "mở lại thấy nội dung đã lưu");
    assert.equal(await clickByText(o, ".maint-nd", "Về mặc định"), true);
    assert.equal(await o.ev(`${q("#maint-nd-sdt")}.value`), "0989929373");
    assert.equal(JSON.parse(env.sql(`SELECT content_json FROM mnt_setting`)[0].content_json).sdt, "0905123456", "chưa bấm Lưu thì chưa ghi");
    assert.equal(await clickByText(o, ".maint-nd", "Lưu nội dung"), true);
    await o.waitFor(`/Đã lưu/.test(${q(".maint-nd [role=status]")}?.textContent ?? "")`, "đã lưu");
    assert.equal(JSON.parse(env.sql(`SELECT content_json FROM mnt_setting`)[0].content_json).sdt, "0989929373");
    o.close();
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
