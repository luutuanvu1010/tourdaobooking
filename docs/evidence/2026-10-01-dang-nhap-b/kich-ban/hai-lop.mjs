// Kịch bản Chrome — giao diện bảo mật hai lớp (ADR-0074; kế hoạch Phần B Task 7, bước 2). D1 tạm + wrangler dev + Chrome headless (a2-cdp.mjs), không cần mạng
// ngoài. Mã 6 số tính bằng bộ TOTP giả của e2e (tests/e2e/fake-totp.mjs), khoá đọc từ CHÍNH chữ trên màn hình (người dùng gõ tay cũng đọc chỗ đó).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-01-dang-nhap-b/kich-ban/hai-lop.mjs
// Ảnh: docs/evidence/2026-10-01-dang-nhap-b/anh/*.png. Mỗi bước in ✓/✗; thoát 1 nếu có bước ✗.
//   1  dải nhắc "Còn 14 ngày để bật bảo mật hai lớp — Bật ngay" ở Trang chủ (390 + 1040), dẫn tới /account#mfa
//   2  trang Tôi → Bảo mật đăng nhập: Chưa bật + câu bắt buộc; "Bật ứng dụng xác thực" → nút "Mở ứng dụng xác thực" là liên kết otpauth:// (không SĐT), mã QR vẽ
//      xong, khoá dạng chữ, ô mã 6 số (numeric, one-time-code, 16px); mã đúng → 10 mã dự phòng + chữ đỏ; dải nhắc biến mất; "Đã bật", còn 10 mã
//   3  đăng xuất → đăng nhập PIN → bước "Nhập mã xác thực" (ô 16px, "Tin máy này 30 ngày" chọn sẵn); mã vừa dùng lúc bật → báo sai; mã mới → vào app
//   4  đăng xuất → đăng nhập PIN trên CÙNG máy (đã tin) → vào thẳng, không hỏi mã; trang Tôi có dòng máy được tin "Máy này"
//   5  "Quên mọi máy" → đăng xuất → đăng nhập → "Dùng mã dự phòng" → mã dự phòng → "Còn 9 mã dự phòng chưa dùng." → Tiếp tục → vào app
//   6  Quản trị (1040): nhãn "Hai lớp: Đã bật" ở dòng nhân viên, nút "Tắt bảo mật hai lớp" chỉ ở dòng máy chủ cho phép (không ở dòng của mình, không ở Toàn
//      quyền); hộp xác nhận TRONG trang → tắt → nhãn "Hai lớp: Chưa bật (hạn …)"
//   7  nhân viên đăng nhập PIN trong 24 giờ → bước "Bật lại bảo mật hai lớp" → bật → 10 mã dự phòng → vào app
//   8  sai mã nhiều lần ở bước hai → đúng câu "Nhập sai quá nhiều lần. Chờ 15 phút hoặc nhờ Quản trị mở khoá." (không hứa mã dự phòng)
//   9  console sạch, không lỗi CSP (không tràn ngang 390 / 320 kiểm ngay ở bước 2, 3, 7; axe khi có AXE_JS ở bước 2, 3, 6)
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

process.env.OUT ??= "docs/evidence/2026-10-01-dang-nhap-b";
const { ACCOUNTS, startEnv, sleep } = await import("../../2026-09-20-a2/kich-ban/a2-cdp.mjs");
const { assert, axe, axeNote, boDem, noOverflowX, shotFull, shotView, txt } = await import("../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs");
const { totp } = await import("../../../../tests/e2e/fake-totp.mjs");

// Chữ đúng: đọc từ mã nguồn (một nguồn), không chép tay.
const hienThi = readFileSync("src/shared/hai-lop-hien-thi.ts", "utf8");
const CAU_429 = hienThi.match(/CAU_SAI_QUA_NHIEU_HAI_LOP = "([^"]+)"/)?.[1];
const CHU_DO = hienThi.match(/CHU_DO_MA_DU_PHONG = "([^"]+)"/)?.[1];
assert.ok(CAU_429 && CHU_DO, "không đọc được câu 429 / chữ đỏ từ src/shared/hai-lop-hien-thi.ts");

const M = { width: 390, height: 844, mobile: true };
const NARROW = { width: 320, height: 568, mobile: true };
const DESK = { width: 1040, height: 820, mobile: false };
const NV = ACCOUNTS.salesA; // nhân viên nội bộ (Bán hàng) — có 14 ngày ân hạn từ lúc gieo (staff-lib.mjs)

const env = await startEnv({ vars: { MFA_ENCRYPTION_KEY: randomBytes(32).toString("base64") } });
const b = boDem("HAI LOP");
const pages = [];
const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
const go = async (p, path) => {
  await p.send("Page.navigate", { url: env.base + path });
  await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
};
const type = (p, sel, v) => p.ev(`(() => { const el = ${q(sel)}; if (!el) return false; el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
const bam = (p, scope, label) =>
  p.ev(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(scope)} + ' button, ' + ${JSON.stringify(scope)} + ' a, ' + ${JSON.stringify(scope)} + ' summary')].find((x) => x.textContent.trim() === ${JSON.stringify(label)} && x.getClientRects().length > 0); if (!b) return false; b.click(); return true; })()`);
const mustBam = async (p, scope, label) => assert.ok(await bam(p, scope, label), `không thấy nút "${label}" trong ${scope}`);
const fontPx = (p, sel) => p.ev(`parseFloat(getComputedStyle(${q(sel)}).fontSize)`);
const dangXuat = (p) => p.ev("fetch('/api/auth/logout', { method: 'POST' }).then(() => true)");
const dienPin = async (p, a) => {
  await go(p, "/login");
  try {
    await p.waitFor(`location.pathname === '/login' && !!${q("#phone")} && !${q("#login-form")}.hidden`, "trang đăng nhập sẵn sàng");
  } catch (e) {
    throw new Error(`${e.message}\n    đang ở: ${await p.ev("location.href + ' | form ẩn=' + document.querySelector('#login-form')?.hidden + ' | ' + (document.querySelector('main')?.innerText ?? '').slice(0, 300)")}`);
  }
  await type(p, "#phone", a.phone);
  await type(p, "#pin", a.pin);
  await p.waitFor(`!${q("#submit")}.disabled`, "nút Đăng nhập bấm được");
  await p.ev(`${q("#submit")}.click(); true`);
};
/** Thu khung nhìn về 320 (iPhone SE), kiểm không tràn ngang, rồi trả về 390. */
const khongTranO320 = async (p, viec) => {
  await p.send("Emulation.setDeviceMetricsOverride", { width: NARROW.width, height: NARROW.height, deviceScaleFactor: 2, mobile: true });
  await sleep(250);
  const ok320 = await p.ev(noOverflowX);
  await p.send("Emulation.setDeviceMetricsOverride", { width: M.width, height: M.height, deviceScaleFactor: 2, mobile: true });
  await sleep(150);
  assert.ok(ok320, `tràn ngang ở 320: ${viec}`);
};
const vaoApp = (p) => p.waitFor("location.pathname === '/' && document.readyState === 'complete' && !!document.querySelector('#topbar .bar-title')", "vào Trang chủ", 15000);
const khoaTrenManHinh = async (p) => (await p.ev(`${q("#mfa-key")}?.textContent ?? ''`)).replace(/\s+/g, "");
/** Mã của bước sau (máy chủ nhận bước +1; luôn MỚI hơn bước vừa tiêu — chống dùng lại). */
const maMoi = (secret) => totp(secret, Date.now() + 30_000);
function consoleProblems(p) {
  const csp = p.logEntries.filter((e) => /Content Security Policy|Refused to/i.test(e.text));
  // Tiếng ồn ĐÃ BIẾT: dò phiên 401 ở /api/auth/me của trang đăng nhập; 401/429 CỐ Ý ở bước nhập mã.
  const noise = (e) => e.source === "network" && /status of (401|429)/.test(e.text) && /\/api\/auth\/(me|mfa\/verify)$/.test(e.url ?? "");
  return { csp, errors: [...p.consoleErrors, ...p.logEntries.filter((e) => e.level === "error" && !noise(e) && !csp.includes(e)).map((e) => `${e.text} ${e.url ?? ""}`)] };
}

let secret = "";
let maDuPhong = [];
let maBat = "";
const nv = await env.openPage(M);
pages.push(nv);

try {
  await b.step("1", "dải nhắc ân hạn ở Trang chủ (390 + 1040), dẫn tới /account#mfa", async () => {
    await dienPin(nv, NV);
    await vaoApp(nv);
    await nv.waitFor(`!!${q("#mfa-strip")}`, "dải nhắc hiện", 10000);
    assert.equal(await nv.ev(txt("#mfa-strip")), "Còn 14 ngày để bật bảo mật hai lớp — Bật ngay");
    assert.equal(await nv.ev(`new URL(${q("#mfa-strip")}.href).pathname + new URL(${q("#mfa-strip")}.href).hash`), "/account#mfa");
    await shotFull(nv, "01-dai-nhac-390.png");
    await nv.send("Emulation.setDeviceMetricsOverride", { width: DESK.width, height: DESK.height, deviceScaleFactor: 1, mobile: false });
    await go(nv, "/");
    await nv.waitFor(`!!${q("#mfa-strip")}`, "dải nhắc hiện ở máy tính", 10000);
    // Lần mở thứ hai trong cùng thẻ dùng kết quả đã nhớ: không gọi lại /api/account/mfa.
    const goi = nv.requests.filter((r) => new URL(r.url).pathname === "/api/account/mfa").length;
    assert.equal(goi, 1, `/api/account/mfa gọi ${goi} lần (phải nhớ trong sessionStorage)`);
    await shotView(nv, "02-dai-nhac-1040.png");
    await nv.send("Emulation.setDeviceMetricsOverride", { width: M.width, height: M.height, deviceScaleFactor: 2, mobile: true });
  });

  await b.step("2", `trang Tôi: bật ứng dụng xác thực (otpauth, QR, Chép khoá, ô 16px) → 10 mã dự phòng + chữ đỏ → Đã bật${axeNote()}`, async () => {
    await go(nv, "/account#mfa");
    await nv.waitFor(`!${q("#mfa")}.hidden`, "khối Bảo mật đăng nhập hiện", 10000);
    assert.match(await nv.ev(txt("#mfa")), /Chưa bật/);
    assert.match(await nv.ev(txt("#mfa-required")), /phải bật bảo mật hai lớp\. Hạn bật:/);
    await mustBam(nv, "#mfa", "Bật ứng dụng xác thực");
    await nv.waitFor(`!!${q("#mfa-key")} && ${q(".mfa-qr")}.width > 0`, "khoá + mã QR hiện", 10000);
    const href = await nv.ev(`${q("a.mfa-open")}.getAttribute('href')`);
    assert.match(href, /^otpauth:\/\/totp\/Tour%20%C4%90%E1%BA%A3o(:|%3A)/); // máy chủ mã hoá cả dấu ":" của nhãn (Task 5 — chưa thử trên Google Authenticator thật)
    assert.match(href, /[?&]secret=[A-Z2-7]+/);
    assert.ok(!href.includes(NV.phone), "otpauth không được chứa SĐT");
    assert.equal(await nv.ev(txt("a.mfa-open")), "Mở ứng dụng xác thực");
    assert.ok(await nv.ev(`[...document.querySelectorAll('#mfa button')].some((x) => x.textContent.trim() === 'Chép khoá')`), "thiếu nút Chép khoá"); // (headless không có quyền bộ nhớ tạm: không bấm)
    secret = await khoaTrenManHinh(nv);
    assert.equal(new URL(href.replace("otpauth://", "https://")).searchParams.get("secret"), secret, "khoá dạng chữ khớp khoá trong otpauth");
    assert.equal(await nv.ev(`${q("#mfa-enroll-code")}.getAttribute('inputmode')`), "numeric");
    assert.equal(await nv.ev(`${q("#mfa-enroll-code")}.getAttribute('autocomplete')`), "one-time-code");
    assert.ok((await fontPx(nv, "#mfa-enroll-code")) >= 16, "ô mã phải ≥ 16px");
    assert.ok(await nv.ev(noOverflowX), "tràn ngang ở 390");
    await khongTranO320(nv, "khối bật ứng dụng xác thực");
    await nv.ev(`${q("#mfa-heading")}.scrollIntoView({ block: 'start' }); true`);
    await shotView(nv, "03-bat-ung-dung-xac-thuc-390.png");
    maBat = totp(secret);
    await type(nv, "#mfa-enroll-code", maBat);
    await mustBam(nv, "#mfa", "Xác nhận bật");
    await nv.waitFor(`!!${q("#mfa-recovery")}`, "bộ mã dự phòng hiện", 10000);
    maDuPhong = await nv.ev(`[...document.querySelectorAll('#mfa-recovery .mfa-codes code')].map((c) => c.textContent)`);
    assert.equal(maDuPhong.length, 10);
    for (const c of maDuPhong) assert.match(c, /^[23456789a-z]{4}-[23456789a-z]{4}$/);
    assert.equal(await nv.ev(txt("#mfa-recovery .mfa-warn")), CHU_DO);
    assert.ok(await nv.ev(`getComputedStyle(${q("#mfa-recovery .mfa-warn")}).color !== getComputedStyle(${q("#mfa-recovery .muted")}).color`), "chữ cảnh báo phải khác màu chữ thường");
    assert.equal(await nv.ev(`!!${q("#mfa-strip")}`), false, "dải nhắc phải biến mất sau khi bật");
    assert.equal(await nv.ev(`!!${q("#mfa-required")}`), false, "câu bắt buộc phải gỡ ngay khi đã bật");
    assert.match(await nv.ev(txt("#mfa .maint-state")), /Đã bật/);
    await shotFull(nv, "04-ma-du-phong-390.png");
    await axe(nv, "trang Tôi — mã dự phòng");
    await mustBam(nv, "#mfa", "Tôi đã cất mã");
    await nv.waitFor(`/Đã bật/.test(${q("#mfa")}.innerText) && !!${q("#mfa-recovery-left")}`, "khối vẽ lại: Đã bật", 10000);
    assert.equal(await nv.ev(txt("#mfa-recovery-left")), "Mã dự phòng: còn 10 mã chưa dùng.");
    await shotFull(nv, "05-da-bat-390.png");
    await axe(nv, "trang Tôi — đã bật");
  });

  await b.step("3", `đăng nhập hai bước: bước "Nhập mã xác thực" (ô 16px, tin máy chọn sẵn); mã đã dùng → báo sai; mã mới → vào app${axeNote()}`, async () => {
    await dangXuat(nv);
    await dienPin(nv, NV);
    await nv.waitFor(`!!${q("#mfa-step")}`, "bước nhập mã hiện", 10000);
    assert.equal(await nv.ev(`${q("#login-form")}.hidden`), true, "form PIN phải ẩn");
    assert.equal(await nv.ev(txt("#mfa-step h2")), "Nhập mã xác thực");
    assert.equal(await nv.ev(`${q("#mfa-code")}.getAttribute('inputmode')`), "numeric");
    assert.equal(await nv.ev(`${q("#mfa-code")}.getAttribute('autocomplete')`), "one-time-code");
    assert.ok((await fontPx(nv, "#mfa-code")) >= 16, "ô mã phải ≥ 16px");
    assert.equal(await nv.ev(`${q("#mfa-trust")}.checked`), true, "Tin máy này 30 ngày phải chọn sẵn");
    assert.ok(await nv.ev(noOverflowX), "tràn ngang ở 390");
    await khongTranO320(nv, "bước nhập mã");
    await shotFull(nv, "06-buoc-hai-dang-nhap-390.png");
    await axe(nv, "bước nhập mã");
    await type(nv, "#mfa-code", maBat); // mã đã tiêu lúc bật (chống dùng lại)
    await nv.ev(`${q("#mfa-submit")}.click(); true`);
    await nv.waitFor(`!${q("#error")}.hidden`, "báo mã sai", 10000);
    assert.match(await nv.ev(txt("#error")), /Mã không đúng hoặc đã dùng/);
    await type(nv, "#mfa-code", maMoi(secret));
    await nv.ev(`${q("#mfa-submit")}.click(); true`);
    await vaoApp(nv);
  });

  await b.step("4", "đăng nhập lại trên máy đã tin: không hỏi mã; trang Tôi có máy được tin \"Máy này\"", async () => {
    await dangXuat(nv);
    await dienPin(nv, NV);
    await vaoApp(nv);
    await go(nv, "/account");
    await nv.waitFor(`!!${q("#mfa-devices")}`, "danh sách máy được tin", 10000);
    assert.match(await nv.ev(txt("#mfa-devices")), /Máy này/);
    assert.equal(await nv.ev("document.querySelectorAll('#mfa-devices [data-may-tin]').length"), 1);
    await shotFull(nv, "07-may-duoc-tin-390.png");
  });

  await b.step("5", "\"Quên mọi máy\" → đăng nhập bằng mã dự phòng → còn 9 mã → vào app", async () => {
    await nv.ev("window.confirm = () => true; true");
    await mustBam(nv, "#mfa", "Quên mọi máy");
    await nv.waitFor(`!!${q("#mfa-devices")} && document.querySelectorAll('#mfa-devices [data-may-tin]').length === 0`, "máy được tin đã quên", 10000);
    await dangXuat(nv);
    await dienPin(nv, NV);
    await nv.waitFor(`!!${q("#mfa-step")}`, "bước nhập mã hiện (máy đã bị quên)", 10000);
    await mustBam(nv, "#mfa-step", "Dùng mã dự phòng");
    assert.equal(await nv.ev(`${q("#mfa-code")}.getAttribute('inputmode')`), "text");
    assert.equal(await nv.ev(`${q("#mfa-code")}.maxLength`), 9);
    await nv.ev(`${q("#mfa-trust")}.checked = false; true`);
    await type(nv, "#mfa-code", maDuPhong[0].toUpperCase()); // máy chủ tự chuẩn hoá chữ hoa
    assert.equal(await nv.ev(`${q("#mfa-code")}.value`), maDuPhong[0].toUpperCase(), "ô mã dự phòng không được lọc mất chữ cái");
    await shotFull(nv, "08-dang-nhap-ma-du-phong-390.png");
    await nv.ev(`${q("#mfa-submit")}.click(); true`);
    await nv.waitFor(`!!${q("#mfa-recovery-left")}`, "báo số mã còn lại", 10000);
    assert.equal(await nv.ev(txt("#mfa-recovery-left")), "Còn 9 mã dự phòng chưa dùng.");
    await shotFull(nv, "09-con-9-ma-390.png");
    await nv.ev(`${q("#mfa-continue")}.click(); true`);
    await vaoApp(nv);
  });

  await b.step("6", `Quản trị (1040): nhãn "Hai lớp", nút "Tắt bảo mật hai lớp" theo cờ máy chủ, hộp xác nhận trong trang → tắt${axeNote()}`, async () => {
    const qt = await env.as(ACCOUNTS.admin, "/staff", DESK);
    pages.push(qt);
    await qt.waitFor("document.querySelectorAll('#list tr').length > 3", "danh sách tài khoản", 10000);
    const dong = (ten) => `[...document.querySelectorAll('#list tr')].find((tr) => tr.cells[0]?.innerText.includes(${JSON.stringify(ten)}))`;
    assert.match(await qt.ev(`${dong(NV.name)}.innerText`), /Hai lớp: Đã bật/);
    assert.match(await qt.ev(`${dong(ACCOUNTS.salesB.name)}.innerText`), /Hai lớp: Chưa bật \(hạn \d{2}\/\d{2}\)/);
    const coNut = (ten) => qt.ev(`[...${dong(ten)}.querySelectorAll('button')].some((x) => x.textContent.trim() === 'Tắt bảo mật hai lớp')`);
    assert.equal(await coNut(NV.name), true, "dòng nhân viên phải có nút");
    assert.equal(await coNut(ACCOUNTS.admin.name), false, "dòng của chính mình không có nút");
    assert.equal(await coNut(ACCOUNTS.chu.name), false, "Quản trị không tắt được của Toàn quyền");
    await qt.ev(`[...${dong(NV.name)}.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Tắt bảo mật hai lớp').click(); true`);
    await qt.waitFor(`!${q("#edit")}.hidden && !!${q("#mfa-reset-confirm")}`, "hộp xác nhận trong trang", 5000);
    assert.match(await qt.ev(txt("#edit")), /24 giờ/);
    await shotView(qt, "10-hop-tat-hai-lop-1040.png");
    await axe(qt, "Quản lý tài khoản — hộp tắt");
    await qt.ev(`${q("#mfa-reset-confirm")}.click(); true`);
    await qt.waitFor(`!!${q("#mfa-reset-done")}`, "báo đã tắt", 10000);
    await qt.waitFor(`/Hai lớp: Chưa bật/.test(${dong(NV.name)}.innerText)`, "nhãn đổi sang Chưa bật", 10000);
    await shotView(qt, "11-da-tat-1040.png");
    const sp = consoleProblems(qt);
    assert.deepEqual(sp.csp, []);
    assert.deepEqual(sp.errors, []);
  });

  await b.step("7", "nhân viên đăng nhập trong 24 giờ: bước \"Bật lại bảo mật hai lớp\" → bật → 10 mã → vào app", async () => {
    // Các trang dùng CHUNG kho cookie: bước 6 đặt cookie phiên của Quản trị → đăng xuất phiên đó trước (phiên của nhân viên đã bị máy chủ kết thúc khi tắt).
    await dangXuat(nv);
    await dienPin(nv, NV);
    await nv.waitFor(`!!${q("#mfa-step")} && !!${q("#mfa-key")}`, "bước bật lại hiện kèm khoá", 10000);
    assert.equal(await nv.ev(txt("#mfa-step h2")), "Bật lại bảo mật hai lớp");
    assert.match(await nv.ev(`${q("a.mfa-open")}.getAttribute('href')`), /^otpauth:\/\/totp\//);
    assert.ok(await nv.ev(noOverflowX), "tràn ngang ở 390");
    await shotFull(nv, "12-bat-lai-khi-dang-nhap-390.png");
    secret = await khoaTrenManHinh(nv);
    await type(nv, "#mfa-enroll-code", totp(secret));
    await mustBam(nv, "#mfa-step", "Xác nhận bật");
    await nv.waitFor(`!!${q("#mfa-recovery")}`, "bộ mã dự phòng mới", 10000);
    assert.equal(await nv.ev("document.querySelectorAll('#mfa-recovery .mfa-codes code').length"), 10);
    await shotFull(nv, "13-bat-lai-ma-du-phong-390.png");
    await mustBam(nv, "#mfa-step", "Tôi đã cất mã, vào Nền tảng");
    await vaoApp(nv);
  });

  await b.step("8", "sai mã nhiều lần ở bước hai → đúng câu 429 của ruling (không hứa mã dự phòng)", async () => {
    await dangXuat(nv);
    await dienPin(nv, NV);
    await nv.waitFor(`!!${q("#mfa-step")}`, "bước nhập mã hiện", 10000);
    for (let i = 0; i < 7; i++) {
      await type(nv, "#mfa-code", "000000");
      await nv.ev(`${q("#error")}.hidden = true; ${q("#mfa-submit")}.click(); true`);
      await nv.waitFor(`!${q("#error")}.hidden && !${q("#mfa-submit")}.disabled`, `lần sai ${i + 1} có câu báo`, 10000);
      if ((await nv.ev(txt("#error"))) === CAU_429) break;
    }
    assert.equal(await nv.ev(txt("#error")), CAU_429);
    await shotFull(nv, "14-khoa-sai-nhieu-lan-390.png");
  });

  await b.step("9", "console sạch (mọi trang đã mở của nhân viên), không lỗi CSP", async () => {
    const sp = consoleProblems(nv);
    assert.deepEqual(sp.csp, []);
    assert.deepEqual(sp.errors, []);
  });
} finally {
  for (const p of pages) p.close();
  await env.stop();
  b.xong();
}
