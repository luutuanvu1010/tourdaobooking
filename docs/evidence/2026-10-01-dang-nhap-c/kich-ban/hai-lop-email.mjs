// Kịch bản Chrome — yếu tố thứ hai qua email (ADR-0074 điều 4, 7; kế hoạch Phần C Task 3). D1 tạm + wrangler dev + Chrome headless (a2-cdp.mjs), không cần mạng
// ngoài. Không đọc được hộp thư và mã sản phẩm không có công tắc lộ mã: sau khi giao diện bấm gửi, kịch bản GIEO dòng mã (băm) với mã biết trước vào D1 tạm —
// đúng khuôn `gieoMaEmail` của tests/e2e/lib.mjs. Người gửi thư: `FEEDBACK_MAIL_FROM` truyền bằng --var để binding `EMAIL` CỤC BỘ của wrangler dev nhận thư
// (không đi ra ngoài); nếu binding cục bộ không nhận, bước gửi trả 502 và kịch bản báo ✗ đúng chỗ (không giả xanh).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-01-dang-nhap-c/kich-ban/hai-lop-email.mjs
// Ảnh: docs/evidence/2026-10-01-dang-nhap-c/anh/*.png. Mỗi bước in ✓/✗; thoát 1 nếu có bước ✗.
//   1  trang Tôi (Bán hàng, 390): Chưa bật; có "Bật ứng dụng xác thực" và "Nhận mã qua email" → ô địa chỉ (type=email, 16px) → "Gửi mã xác minh" → bước nhập mã
//      chỉ hiện địa chỉ CHE; địa chỉ đầy đủ không có trong localStorage / sessionStorage / URL; ô mã (numeric, one-time-code, 16px); mã sai → báo; mã đúng → 10 mã
//      dự phòng → "Đã bật · Email t***@example.com"; không tràn ngang 390 / 320
//   2  đăng xuất → đăng nhập PIN → bước hai chỉ có email: nút "Gửi mã qua email (t***@example.com)", không có lựa chọn ứng dụng xác thực → bấm gửi → câu "Đã gửi
//      mã tới t***@example.com…" → mã đúng → vào app
//   3  Kế toán (1040): khối Bảo mật đăng nhập KHÔNG có lựa chọn email (máy chủ trả allowed = TOTP)
//   3b nhân viên có CẢ ứng dụng xác thực lẫn email: mặc định mã ứng dụng; gửi email → cách email + liên kết "Dùng mã từ ứng dụng xác thực" → quay lại → vào app
//   4  Quản trị có dòng EMAIL lệch + TOTP: bước hai đăng nhập không có nút gửi email (máy chủ không liệt kê EMAIL)
//   5  console sạch, không lỗi CSP (axe ở bước 1, 2, 3 khi có AXE_JS)
// Phần C Task 4 (các đường giao diện Task 3 đã dựng nhưng chưa chạy Chrome) — mỗi ca hạn mức một tài khoản riêng vì bộ đếm `mfa-mail:<id>` / `mfa:<id>` dùng chung:
//   6  "Đổi email" bằng MÃ DỰ PHÒNG (Bán hàng Hai chỉ có email: ô mã hiện có ghi "Một mã dự phòng (dạng xxxx-xxxx)") → mã tới địa chỉ mới (che) → Đã bật · địa chỉ mới
//   7  "Gỡ email nhận mã" khi email là cách DUY NHẤT của tài khoản nội bộ → 409, câu lời thường tại chỗ, yếu tố còn nguyên
//   8  người chỉ có email thêm ứng dụng xác thực (ô mã hiện có "Một mã dự phòng…") → Đã bật cả hai
//   9  có cả hai → "Gỡ email nhận mã" bằng mã dự phòng → chỉ còn ứng dụng xác thực, nút "Nhận mã qua email" trở lại
//   10 429 hạn mức gửi thư (3 thư / 15 phút): lần gửi thứ tư hiện câu máy chủ "Đã gửi quá nhiều mã qua email…" (tài khoản dùng một lần)
//   11 429 nhập sai ở bước "Xác nhận email": nhập sai liên tiếp → câu cố định "Nhập sai quá nhiều lần…" (tài khoản dùng một lần)
//   12 MÁY CHỦ THỨ HAI không có người gửi (`FEEDBACK_MAIL_FROM` rỗng → máy chủ trả 502 THẬT, không giả lập): trang Tôi bấm "Gửi mã xác minh" → câu
//      "Chưa gửi được email, thử lại hoặc dùng cách khác." tại chỗ, vẫn ở bước nhập địa chỉ
//   13 cùng máy chủ thứ hai: bước hai đăng nhập bấm "Gửi mã qua email (…)" → câu 502 ở ô báo lỗi, chưa chuyển sang "Đã gửi mã"
import { createHash, randomBytes } from "node:crypto";

process.env.OUT ??= "docs/evidence/2026-10-01-dang-nhap-c";
const { ACCOUNTS, startEnv, sleep } = await import("../../2026-09-20-a2/kich-ban/a2-cdp.mjs");
const { assert, axe, axeNote, boDem, noOverflowX, shotFull, shotView, txt } = await import("../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs");
const { base32Encode, maHoaKhoa, totp } = await import("../../../../tests/e2e/fake-totp.mjs");

const M = { width: 390, height: 844, mobile: true };
const NARROW = { width: 320, height: 568, mobile: true };
const DESK = { width: 1040, height: 820, mobile: false };
const NV = ACCOUNTS.salesA;
const DIA_CHI = "TuanBao.Thu@Example.com"; // gõ chữ hoa — máy chủ lưu dạng chuẩn hoá
const CHUAN = DIA_CHI.toLowerCase();
const CHE = "t***@example.com";
const B1 = "BinhMot.Thu@Example.com"; // Bán hàng Hai (bước 6–9, 13)
const B2 = "cuong.hai@example.org";
const B2_CHE = "c***@example.org";
const KHOA = randomBytes(32).toString("base64");

const env = await startEnv({ vars: { MFA_ENCRYPTION_KEY: KHOA, FEEDBACK_MAIL_FROM: "no-reply@tourdao.vn" } });
const b = boDem("HAI LOP EMAIL");
const pages = [];
const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
const go = async (p, path) => {
  await p.send("Page.navigate", { url: env.base + path });
  await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
};
const type = (p, sel, v) => p.ev(`(() => { const el = ${q(sel)}; if (!el) return false; el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
const bam = (p, scope, label) =>
  p.ev(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(scope)} + ' button, ' + ${JSON.stringify(scope)} + ' summary')].find((x) => x.textContent.trim() === ${JSON.stringify(label)} && x.getClientRects().length > 0); if (!b) return false; b.click(); return true; })()`);
const mustBam = async (p, scope, label) => assert.ok(await bam(p, scope, label), `không thấy nút "${label}" trong ${scope}`);
const coNut = (p, scope, label) => p.ev(`[...document.querySelectorAll(${JSON.stringify(scope)} + ' button')].some((x) => x.textContent.trim() === ${JSON.stringify(label)} && x.getClientRects().length > 0)`);
const fontPx = (p, sel) => p.ev(`parseFloat(getComputedStyle(${q(sel)}).fontSize)`);
const dangXuat = (p) => p.ev("fetch('/api/auth/logout', { method: 'POST' }).then(() => true)");
const dienPin = async (p, a) => {
  await go(p, "/login");
  await p.waitFor(`location.pathname === '/login' && !!${q("#phone")} && !${q("#login-form")}.hidden`, "trang đăng nhập sẵn sàng");
  await type(p, "#phone", a.phone);
  await type(p, "#pin", a.pin);
  await p.waitFor(`!${q("#submit")}.disabled`, "nút Đăng nhập bấm được");
  await p.ev(`${q("#submit")}.click(); true`);
};
const khongTranO320 = async (p, viec) => {
  await p.send("Emulation.setDeviceMetricsOverride", { width: NARROW.width, height: NARROW.height, deviceScaleFactor: 2, mobile: true });
  await sleep(250);
  const ok320 = await p.ev(noOverflowX);
  await p.send("Emulation.setDeviceMetricsOverride", { width: M.width, height: M.height, deviceScaleFactor: 2, mobile: true });
  await sleep(150);
  assert.ok(ok320, `tràn ngang ở 320: ${viec}`);
};
const vaoApp = (p) => p.waitFor("location.pathname === '/' && document.readyState === 'complete' && !!document.querySelector('#topbar .bar-title')", "vào Trang chủ", 15000);
const bam256 = (s) => createHash("sha256").update(s).digest("hex");
const idCua = (a) => env.sql(`SELECT id FROM staff WHERE phone = '${a.phone}'`)[0].id;
/** Gieo một mã mở biết trước (khuôn gieoMaEmail của tests/e2e/lib.mjs): huỷ mã mở cũ của (người, mục đích) rồi chèn dòng băm. */
function gieoMa(staffId, email, code, purpose) {
  const id = randomBytes(8).toString("hex");
  const at = new Date().toISOString();
  env.sql(`UPDATE aut_mfa_email_code SET revoked_at = '${at}', updated_at = '${at}' WHERE staff_id = '${staffId}' AND purpose = '${purpose}' AND used_at IS NULL AND revoked_at IS NULL`);
  env.sql(
    "INSERT INTO aut_mfa_email_code (id, staff_id, purpose, email_hash, code_hash, created_at, created_by, updated_at, updated_by, expires_at, attempts, used_at, revoked_at) " +
      `VALUES ('${id}', '${staffId}', '${purpose}', '${bam256(email)}', '${bam256(`${staffId}:${id}:${code}`)}', '${at}', '${staffId}', '${at}', '${staffId}', '${new Date(Date.now() + 600_000).toISOString()}', 0, NULL, NULL)`,
  );
}
/** Địa chỉ đầy đủ không được nằm trong kho trình duyệt hay URL (đặc tả §6 quy tắc 5; brief Task 3). */
const khoTrinhDuyetSach = (p) =>
  p.ev(`(() => { const s = (k) => { let t = ''; for (let i = 0; i < k.length; i++) { const n = k.key(i); t += n + '=' + k.getItem(n) + ';'; } return t.toLowerCase(); }; const all = s(localStorage) + s(sessionStorage) + location.href.toLowerCase(); return !all.includes(${JSON.stringify(CHUAN)}); })()`);
function consoleProblems(p) {
  const csp = p.logEntries.filter((e) => /Content Security Policy|Refused to/i.test(e.text));
  // Tiếng ồn ĐÃ BIẾT: dò phiên 401 ở /api/auth/me của trang đăng nhập; 401 CỐ Ý khi nhập sai mã.
  const noise = (e) => e.source === "network" && /status of 401/.test(e.text) && /\/api\/(auth\/me|account\/mfa\/email\/confirm)$/.test(e.url ?? "");
  return { csp, errors: [...p.consoleErrors, ...p.logEntries.filter((e) => e.level === "error" && !noise(e) && !csp.includes(e)).map((e) => `${e.text} ${e.url ?? ""}`)] };
}
/** Như consoleProblems, cho phép thêm đúng các lỗi mạng CỐ Ý của một bước: `choPhep` = [[mã HTTP, mẫu đường dẫn], …] (Chrome tự ghi "status of N" ở miền Log). */
function loiConsole(p, choPhep) {
  const csp = p.logEntries.filter((e) => /Content Security Policy|Refused to/i.test(e.text));
  const coY = (e) => e.source === "network" && choPhep.some(([st, re]) => new RegExp(`status of ${st}`).test(e.text) && re.test(new URL(e.url ?? "http://x/").pathname));
  const noise = (e) => e.source === "network" && /status of 401/.test(e.text) && /\/api\/auth\/me$/.test(e.url ?? "");
  return { csp, errors: [...p.consoleErrors, ...p.logEntries.filter((e) => e.level === "error" && !noise(e) && !coY(e) && !csp.includes(e)).map((e) => `${e.text} ${e.url ?? ""}`)] };
}
const { insertStaffSql } = await import("../../../../scripts/staff-lib.mjs");
/** Tài khoản Bán hàng dùng một lần (bộ đếm hạn mức theo tài khoản — mỗi ca hạn mức một người). Một lệnh wrangler cho cả lô chèn. */
async function taiKhoanMotLan(ten) {
  const acc = { name: ten, phone: `09${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, pin: String(200000 + Math.floor(Math.random() * 700000)), permissions: ["SALES"] };
  env.sql((await insertStaffSql(acc)).replace(/\n/g, " "));
  return acc;
}

const nv = await env.openPage(M);
pages.push(nv);
const nvId = idCua(NV);

try {
  await b.step("1", `trang Tôi: nhận mã qua email (ô địa chỉ 16px → mã gửi tới địa chỉ che → mã sai báo → mã đúng → 10 mã dự phòng → Đã bật · Email che)${axeNote()}`, async () => {
    await dienPin(nv, NV);
    await vaoApp(nv);
    await go(nv, "/account#mfa");
    await nv.waitFor(`!${q("#mfa")}.hidden`, "khối Bảo mật đăng nhập hiện", 10000);
    assert.match(await nv.ev(txt("#mfa")), /Chưa bật/);
    assert.ok(await coNut(nv, "#mfa", "Bật ứng dụng xác thực"), "thiếu nút Bật ứng dụng xác thực");
    await mustBam(nv, "#mfa", "Nhận mã qua email");
    await nv.waitFor(`!!${q("#mfa-email-input")}`, "ô địa chỉ hiện", 5000);
    assert.equal(await nv.ev(`${q("#mfa-email-input")}.type`), "email");
    assert.ok((await fontPx(nv, "#mfa-email-input")) >= 16, "ô địa chỉ phải ≥ 16px");
    assert.equal(await nv.ev(`!!${q("#mfa-email-current")}`), false, "chưa có yếu tố → không hỏi mã hiện có");
    await type(nv, "#mfa-email-input", DIA_CHI);
    await shotFull(nv, "01-nhap-dia-chi-390.png");
    await axe(nv, "trang Tôi — nhập địa chỉ email");
    await mustBam(nv, "#mfa", "Gửi mã xác minh");
    try {
      await nv.waitFor(`!!${q("#mfa-email-sent")}`, "bước nhập mã hiện (máy chủ gửi được thư)", 10000);
    } catch (e) {
      throw new Error(`${e.message} — câu báo: ${await nv.ev(txt("#mfa-email-enroll .alert"))}`);
    }
    const daGui = await nv.ev(txt("#mfa-email-sent"));
    assert.ok(daGui.includes(CHE), `câu đã gửi phải có địa chỉ che: ${daGui}`);
    assert.ok(!(await nv.ev("document.body.innerText.toLowerCase()")).includes(CHUAN), "địa chỉ đầy đủ không được hiện ngoài ô gõ");
    assert.ok(await khoTrinhDuyetSach(nv), "địa chỉ đầy đủ lọt vào localStorage / sessionStorage / URL");
    assert.equal(await nv.ev(`${q("#mfa-email-code")}.getAttribute('inputmode')`), "numeric");
    assert.equal(await nv.ev(`${q("#mfa-email-code")}.getAttribute('autocomplete')`), "one-time-code");
    assert.ok((await fontPx(nv, "#mfa-email-code")) >= 16, "ô mã phải ≥ 16px");
    assert.ok(await nv.ev(noOverflowX), "tràn ngang ở 390");
    await khongTranO320(nv, "bước nhập mã email");
    await shotFull(nv, "02-nhap-ma-email-390.png");
    await axe(nv, "trang Tôi — nhập mã email");
    gieoMa(nvId, CHUAN, "975310", "enroll");
    await type(nv, "#mfa-email-code", "000001");
    await mustBam(nv, "#mfa", "Xác nhận email");
    await nv.waitFor(`!${q("#mfa-email-enroll .alert")}.hidden`, "báo mã sai", 10000);
    assert.match(await nv.ev(txt("#mfa-email-enroll .alert")), /Mã không đúng hoặc đã hết hạn/);
    await type(nv, "#mfa-email-code", "975310");
    await mustBam(nv, "#mfa", "Xác nhận email");
    await nv.waitFor(`!!${q("#mfa-recovery")}`, "bộ mã dự phòng hiện", 10000);
    assert.equal(await nv.ev("document.querySelectorAll('#mfa-recovery .mfa-codes code').length"), 10);
    assert.equal(await nv.ev(`!!${q("#mfa-strip")}`), false, "dải nhắc phải biến mất sau khi bật");
    await mustBam(nv, "#mfa", "Tôi đã cất mã");
    await nv.waitFor(`/Đã bật/.test(${q("#mfa")}.innerText) && !!${q("#mfa-recovery-left")}`, "khối vẽ lại: Đã bật", 10000);
    assert.match(await nv.ev(txt("#mfa .maint-state")), new RegExp(`Đã bật Email ${CHE.replace(/[*.]/g, "\\$&")}`));
    assert.ok(await coNut(nv, "#mfa", "Đổi email"), "thiếu nút Đổi email");
    assert.ok(!(await nv.ev("document.body.innerText.toLowerCase()")).includes(CHUAN));
    assert.ok(await khoTrinhDuyetSach(nv));
    await shotFull(nv, "03-da-bat-email-390.png");
    await axe(nv, "trang Tôi — đã bật email");
  });

  await b.step("2", `đăng nhập PIN → bước hai chỉ có email: "Gửi mã qua email (${CHE})" → mã đúng → vào app${axeNote()}`, async () => {
    await dangXuat(nv);
    await dienPin(nv, NV);
    await nv.waitFor(`!!${q("#mfa-step")}`, "bước nhập mã hiện", 10000);
    assert.equal(await nv.ev(txt("#mfa-email-send")), `Gửi mã qua email (${CHE})`);
    assert.equal(await nv.ev(`!!${q("#mfa-use-totp")}`), false, "chỉ có email → không có lựa chọn ứng dụng xác thực");
    assert.match(await nv.ev(txt("#mfa-hint")), /Bấm “Gửi mã qua email”/);
    assert.ok((await fontPx(nv, "#mfa-code")) >= 16, "ô mã phải ≥ 16px");
    assert.ok(await nv.ev(noOverflowX), "tràn ngang ở 390");
    await khongTranO320(nv, "bước hai có nút gửi email");
    await shotFull(nv, "04-buoc-hai-email-390.png");
    await axe(nv, "bước hai — chỉ có email");
    await nv.ev(`${q("#mfa-email-send")}.click(); true`);
    await nv.waitFor(`/Đã gửi mã tới/.test(${q("#mfa-hint")}.innerText)`, "câu đã gửi", 10000);
    assert.ok((await nv.ev(txt("#mfa-hint"))).includes(CHE));
    assert.equal(await nv.ev(txt("#mfa-email-send")), `Gửi lại mã qua email (${CHE})`);
    await shotFull(nv, "05-da-gui-ma-390.png");
    gieoMa(nvId, CHUAN, "864201", "login");
    await type(nv, "#mfa-code", "864201");
    await nv.ev(`${q("#mfa-trust")}.checked = false; true`); // không tin máy: bước 3b còn phải thấy bước hai
    await nv.ev(`${q("#mfa-submit")}.click(); true`);
    await vaoApp(nv);
    assert.ok(await khoTrinhDuyetSach(nv));
    const sp = consoleProblems(nv);
    assert.deepEqual(sp.csp, []);
    assert.deepEqual(sp.errors, []);
  });

  await b.step("3", `Kế toán (1040): không có lựa chọn email ở Bảo mật đăng nhập${axeNote()}`, async () => {
    await dangXuat(nv);
    const kt = await env.as(ACCOUNTS.accounting, "/account#mfa", DESK);
    pages.push(kt);
    await kt.waitFor(`!${q("#mfa")}.hidden`, "khối Bảo mật đăng nhập hiện", 10000);
    assert.ok(await coNut(kt, "#mfa", "Bật ứng dụng xác thực"));
    assert.equal(await coNut(kt, "#mfa", "Nhận mã qua email"), false, "Kế toán không được thấy lựa chọn email");
    assert.ok(!/email/i.test(await kt.ev(txt("#mfa"))), "khối của Kế toán không nhắc email");
    await kt.ev(`${q("#mfa")}.scrollIntoView({ block: 'start' }); true`);
    await shotView(kt, "06-ke-toan-khong-co-email-1040.png");
    await axe(kt, "trang Tôi — Kế toán");
    const sp = consoleProblems(kt);
    assert.deepEqual(sp.csp, []);
    assert.deepEqual(sp.errors, []);
    kt.close();
    pages.splice(pages.indexOf(kt), 1);
  });

  await b.step("3b", "nhân viên có CẢ ứng dụng xác thực lẫn email: mặc định mã ứng dụng; bấm gửi email → cách email + liên kết “Dùng mã từ ứng dụng xác thực” → quay lại → mã ứng dụng đúng → vào app", async () => {
    const raw = randomBytes(20);
    const at = new Date().toISOString();
    env.sql(
      "INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) " +
        `VALUES ('${randomBytes(8).toString("hex")}', '${nvId}', 'TOTP', '${maHoaKhoa(KHOA, raw)}', NULL, 0, '${at}', NULL, '${at}', '${nvId}', '${at}', '${nvId}')`,
    );
    await dangXuat(nv);
    await dienPin(nv, NV);
    await nv.waitFor(`!!${q("#mfa-step")}`, "bước nhập mã hiện", 10000);
    assert.match(await nv.ev(txt("#mfa-hint")), /ứng dụng xác thực/, "có TOTP → mặc định mã ứng dụng");
    assert.equal(await nv.ev(txt("#mfa-email-send")), `Gửi mã qua email (${CHE})`);
    assert.equal(await nv.ev(`${q("#mfa-use-totp")}.hidden`), true, "đang ở cách ứng dụng → không hiện liên kết quay lại");
    await nv.ev(`${q("#mfa-email-send")}.click(); true`);
    await nv.waitFor(`/Đã gửi mã tới/.test(${q("#mfa-hint")}.innerText)`, "chuyển sang cách email", 10000);
    assert.equal(await nv.ev(`${q("#mfa-use-totp")}.hidden`), false, "cách email → có liên kết “Dùng mã từ ứng dụng xác thực”");
    await shotFull(nv, "07b-totp-va-email-390.png");
    await nv.ev(`${q("#mfa-use-totp")}.click(); true`);
    assert.match(await nv.ev(txt("#mfa-hint")), /Mở ứng dụng xác thực/);
    await type(nv, "#mfa-code", totp(base32Encode(raw)));
    await nv.ev(`${q("#mfa-submit")}.click(); true`);
    await vaoApp(nv);
  });

  await b.step("4", "Quản trị có dòng EMAIL lệch + ứng dụng xác thực: bước hai không có nút gửi email", async () => {
    const qtId = idCua(ACCOUNTS.admin);
    const at = new Date().toISOString();
    const yeuTo = (kind, secretEnc, email) =>
      `INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) ` +
      `VALUES ('${randomBytes(8).toString("hex")}', '${qtId}', '${kind}', ${secretEnc ? `'${secretEnc}'` : "NULL"}, ${email ? `'${email}'` : "NULL"}, 0, '${at}', NULL, '${at}', '${qtId}', '${at}', '${qtId}')`;
    env.sql(yeuTo("TOTP", maHoaKhoa(KHOA, randomBytes(20)), null));
    env.sql(yeuTo("EMAIL", null, "qt.lech@example.com"));
    await dangXuat(nv);
    await dienPin(nv, ACCOUNTS.admin);
    await nv.waitFor(`!!${q("#mfa-step")}`, "bước nhập mã hiện", 10000);
    assert.equal(await nv.ev(`!!${q("#mfa-email-send")}`), false, "Quản trị không được thấy nút gửi email");
    assert.ok(!(await nv.ev("document.body.innerText")).includes("q***@example.com"));
    assert.match(await nv.ev(txt("#mfa-hint")), /ứng dụng xác thực/);
    await shotFull(nv, "07-quan-tri-khong-co-email-390.png");
  });

  await b.step("5", "console sạch (trang của nhân viên), không lỗi CSP", async () => {
    const sp = consoleProblems(nv);
    assert.deepEqual(sp.csp, []);
    assert.deepEqual(sp.errors, []);
  });

  // ---- Phần C Task 4: các đường còn thiếu (bước 6–11) trên cùng máy chủ có người gửi.
  const SB = ACCOUNTS.salesB;
  const sbId = idCua(SB);
  let duPhong = [];
  let sb = null;
  const goTrangToi = async (p) => {
    await go(p, "/account#mfa");
    await p.waitFor(`!${q("#mfa")}.hidden && !!${q("#mfa-body")}`, "khối Bảo mật đăng nhập hiện", 10000);
  };
  const yeuToSong = (id) => env.sql(`SELECT kind FROM aut_mfa_factor WHERE staff_id = '${id}' AND valid_to_at IS NULL ORDER BY kind`).map((r) => r.kind);
  const nhanO = (p, sel) => p.ev(`${q(sel)}.closest('label').firstChild.textContent`);

  await b.step("6", `"Đổi email" bằng mã dự phòng (chỉ có email): ô mã hiện có "Một mã dự phòng…" → mã tới ${B2_CHE} → Đã bật · ${B2_CHE}${axeNote()}`, async () => {
    sb = await env.as(SB, "/account#mfa", M);
    pages.push(sb);
    await sb.waitFor(`!${q("#mfa")}.hidden`, "khối Bảo mật đăng nhập hiện", 10000);
    // Bật email lần đầu (đường của bước 1) để có bộ mã dự phòng thật.
    await mustBam(sb, "#mfa", "Nhận mã qua email");
    await sb.waitFor(`!!${q("#mfa-email-input")}`, "ô địa chỉ hiện", 5000);
    await type(sb, "#mfa-email-input", B1);
    await mustBam(sb, "#mfa", "Gửi mã xác minh");
    await sb.waitFor(`!!${q("#mfa-email-sent")}`, "bước nhập mã hiện", 10000);
    gieoMa(sbId, B1.toLowerCase(), "246135", "enroll");
    await type(sb, "#mfa-email-code", "246135");
    await mustBam(sb, "#mfa", "Xác nhận email");
    await sb.waitFor(`!!${q("#mfa-recovery")}`, "bộ mã dự phòng hiện", 10000);
    duPhong = await sb.ev("[...document.querySelectorAll('#mfa-recovery .mfa-codes code')].map((c) => c.textContent.trim())");
    assert.equal(duPhong.length, 10);
    await mustBam(sb, "#mfa", "Tôi đã cất mã");
    await sb.waitFor(`/Đã bật/.test(${q("#mfa")}.innerText) && !!${q("#mfa-recovery-left")}`, "khối vẽ lại: Đã bật", 10000);
    // Đổi email: chỉ có email → máy chủ chỉ nhận mã dự phòng; nhãn ô nói đúng điều đó.
    await mustBam(sb, "#mfa", "Đổi email");
    await sb.waitFor(`!!${q("#mfa-email-current")}`, "ô mã hiện có hiện", 5000);
    assert.equal(await nhanO(sb, "#mfa-email-current"), "Một mã dự phòng (dạng xxxx-xxxx)");
    assert.ok((await fontPx(sb, "#mfa-email-current")) >= 16, "ô mã hiện có phải ≥ 16px");
    await type(sb, "#mfa-email-input", B2);
    await type(sb, "#mfa-email-current", duPhong[0]);
    await shotFull(sb, "08-doi-email-ma-du-phong-390.png");
    await axe(sb, "trang Tôi — đổi email bằng mã dự phòng");
    await mustBam(sb, "#mfa", "Gửi mã xác minh");
    await sb.waitFor(`!!${q("#mfa-email-sent")}`, "bước nhập mã của địa chỉ mới", 10000);
    assert.ok((await sb.ev(txt("#mfa-email-sent"))).includes(B2_CHE));
    gieoMa(sbId, B2, "531642", "enroll");
    await type(sb, "#mfa-email-code", "531642");
    await mustBam(sb, "#mfa", "Xác nhận email");
    await sb.waitFor(`${q("#mfa .maint-state")}?.innerText.includes(${JSON.stringify(B2_CHE)})`, "khối vẽ lại với địa chỉ mới", 10000);
    assert.equal(await sb.ev(`!!${q("#mfa-recovery")}`), false, "đổi địa chỉ không sinh bộ mã dự phòng mới");
    assert.deepEqual(yeuToSong(sbId), ["EMAIL"]);
    const body = (await sb.ev("document.body.innerText")).toLowerCase();
    assert.ok(!body.includes(B2) && !body.includes(B1.toLowerCase()), "địa chỉ đầy đủ không hiện");
    assert.match(await sb.ev(txt("#mfa-recovery-left")), /còn 9 mã/);
  });

  await b.step("7", "\"Gỡ email nhận mã\" khi email là cách duy nhất (tài khoản nội bộ) → 409, câu lời thường tại chỗ, yếu tố còn nguyên", async () => {
    await mustBam(sb, "#mfa", "Gỡ email nhận mã");
    await sb.waitFor(`${q("details[data-go=EMAIL]")}.open`, "ô gỡ mở", 5000);
    assert.equal(await sb.ev(`${q("details[data-go=EMAIL] label")}.firstChild.textContent`), "Một mã dự phòng (dạng xxxx-xxxx)");
    await type(sb, "details[data-go=EMAIL] input", duPhong[1]);
    await mustBam(sb, "details[data-go=EMAIL]", "Gỡ email");
    await sb.waitFor(`!${q("details[data-go=EMAIL] .alert")}.hidden`, "báo lỗi tại chỗ", 10000);
    assert.equal(await sb.ev(txt("details[data-go=EMAIL] .alert")), "Tài khoản nội bộ phải giữ ít nhất một cách xác thực.");
    assert.deepEqual(yeuToSong(sbId), ["EMAIL"], "yếu tố email còn nguyên");
    assert.ok(await sb.ev(noOverflowX), "tràn ngang ở 390");
    await shotFull(sb, "09-go-email-cuoi-409-390.png");
  });

  await b.step("8", `người chỉ có email thêm ứng dụng xác thực: ô mã hiện có "Một mã dự phòng…" → Đã bật cả hai${axeNote()}`, async () => {
    await goTrangToi(sb);
    await mustBam(sb, "#mfa", "Bật ứng dụng xác thực");
    await sb.waitFor(`!!${q("#mfa-key")} && !!${q("#mfa-enroll-current")}`, "khoá + ô mã hiện có hiện", 10000);
    assert.equal(await nhanO(sb, "#mfa-enroll-current"), "Một mã dự phòng (dạng xxxx-xxxx)");
    const khoa = (await sb.ev(txt("#mfa-key"))).replace(/\s/g, "");
    await type(sb, "#mfa-enroll-code", totp(khoa));
    await type(sb, "#mfa-enroll-current", duPhong[1]); // mã [1] chưa bị tiêu ở bước 7 (409 trả trước khi kiểm mã)
    await shotFull(sb, "10-chi-email-them-totp-390.png");
    await axe(sb, "trang Tôi — người chỉ có email thêm ứng dụng xác thực");
    await mustBam(sb, "#mfa", "Xác nhận bật");
    await sb.waitFor(`/Ứng dụng xác thực/.test(${q("#mfa .maint-state")}?.innerText ?? '') && ${q("#mfa .maint-state")}.innerText.includes(${JSON.stringify(B2_CHE)})`, "Đã bật cả hai", 10000);
    assert.equal(await sb.ev(`!!${q("#mfa-recovery")}`), false, "không phải yếu tố đầu → không sinh bộ mã mới");
    assert.deepEqual(yeuToSong(sbId), ["EMAIL", "TOTP"]);
  });

  await b.step("9", `có cả hai → "Gỡ email nhận mã" bằng mã dự phòng → chỉ còn ứng dụng xác thực${axeNote()}`, async () => {
    await mustBam(sb, "#mfa", "Gỡ email nhận mã");
    await sb.waitFor(`${q("details[data-go=EMAIL]")}.open`, "ô gỡ mở", 5000);
    assert.equal(await sb.ev(`${q("details[data-go=EMAIL] label")}.firstChild.textContent`), "Mã 6 số từ ứng dụng xác thực hoặc một mã dự phòng");
    await type(sb, "details[data-go=EMAIL] input", duPhong[2]);
    await mustBam(sb, "details[data-go=EMAIL]", "Gỡ email");
    await sb.waitFor(`!!${q("#mfa .maint-state")} && !/Email/.test(${q("#mfa .maint-state")}.innerText) && !${q("details[data-go=EMAIL]")}`, "khối vẽ lại không còn email", 10000);
    assert.deepEqual(yeuToSong(sbId), ["TOTP"]);
    assert.ok(await coNut(sb, "#mfa", "Nhận mã qua email"), "nút Nhận mã qua email trở lại");
    await shotFull(sb, "11-go-email-con-totp-390.png");
    await axe(sb, "trang Tôi — đã gỡ email");
    const sp = loiConsole(sb, [[409, /\/api\/account\/mfa\/remove$/]]);
    assert.deepEqual(sp.csp, []);
    assert.deepEqual(sp.errors, []);
    sb.close();
    pages.splice(pages.indexOf(sb), 1);
  });

  await b.step("10", "429 hạn mức gửi thư: lần gửi thứ tư trong 15 phút → câu máy chủ «Đã gửi quá nhiều mã qua email…» tại chỗ", async () => {
    const acc = await taiKhoanMotLan("Thử Gửi Thư");
    const p = await env.as(acc, "/account#mfa", M);
    pages.push(p);
    await p.waitFor(`!${q("#mfa")}.hidden`, "khối Bảo mật đăng nhập hiện", 10000);
    await mustBam(p, "#mfa", "Nhận mã qua email");
    await p.waitFor(`!!${q("#mfa-email-input")}`, "ô địa chỉ hiện", 5000);
    await type(p, "#mfa-email-input", "han.muc@example.com");
    for (let lan = 1; lan <= 3; lan++) {
      await mustBam(p, "#mfa", "Gửi mã xác minh");
      await p.waitFor(`!!${q("#mfa-email-sent")}`, `lần gửi ${lan} thành công`, 10000);
      await mustBam(p, "#mfa", "Gửi lại mã");
      await p.waitFor(`!!${q("#mfa-email-input")}`, "về bước nhập địa chỉ", 5000);
      assert.equal(await p.ev(`${q("#mfa-email-input")}.value`), "han.muc@example.com", "gửi lại giữ địa chỉ trong ô");
    }
    await mustBam(p, "#mfa", "Gửi mã xác minh");
    await p.waitFor(`!${q("#mfa-email-enroll .alert")}.hidden`, "báo lỗi lần thứ tư", 10000);
    assert.match(await p.ev(txt("#mfa-email-enroll .alert")), /^Đã gửi quá nhiều mã qua email\. Thử lại sau \d+ phút/);
    assert.equal(await p.ev(`!!${q("#mfa-email-sent")}`), false, "không sang bước nhập mã");
    await shotFull(p, "12-han-muc-gui-thu-429-390.png");
    const sp = loiConsole(p, [[429, /\/api\/account\/mfa\/email\/start$/]]);
    assert.deepEqual(sp.csp, []);
    assert.deepEqual(sp.errors, []);
    p.close();
    pages.splice(pages.indexOf(p), 1);
  });

  await b.step("11", "429 nhập sai ở bước «Xác nhận email»: nhập sai liên tiếp → câu cố định «Nhập sai quá nhiều lần…»", async () => {
    const acc = await taiKhoanMotLan("Thử Nhập Sai");
    const p = await env.as(acc, "/account#mfa", M);
    pages.push(p);
    await p.waitFor(`!${q("#mfa")}.hidden`, "khối Bảo mật đăng nhập hiện", 10000);
    await mustBam(p, "#mfa", "Nhận mã qua email");
    await p.waitFor(`!!${q("#mfa-email-input")}`, "ô địa chỉ hiện", 5000);
    await type(p, "#mfa-email-input", "nhap.sai@example.com");
    await mustBam(p, "#mfa", "Gửi mã xác minh");
    await p.waitFor(`!!${q("#mfa-email-sent")}`, "bước nhập mã hiện", 10000);
    gieoMa(idCua(acc), "nhap.sai@example.com", "777888", "enroll");
    let cau = "";
    let lan = 0;
    while (lan < 8 && !/Nhập sai quá nhiều lần/.test(cau)) {
      lan++;
      await p.ev(`${q("#mfa-email-enroll .alert")}.textContent = ''; true`);
      await type(p, "#mfa-email-code", String(100000 + lan));
      await mustBam(p, "#mfa", "Xác nhận email");
      await p.waitFor(`${q("#mfa-email-enroll .alert")}.textContent !== ''`, `câu báo lần ${lan}`, 10000);
      cau = await p.ev(txt("#mfa-email-enroll .alert"));
    }
    assert.equal(cau, "Nhập sai quá nhiều lần. Chờ 15 phút hoặc nhờ Quản trị mở khoá.", `sau ${lan} lần: ${cau}`);
    assert.ok(lan <= 6, `hạn mức 5 lần / 15 phút: tới lần ${lan} mới khoá`);
    // Mã ĐÚNG lúc đang khoá cũng không qua.
    await p.ev(`${q("#mfa-email-enroll .alert")}.textContent = ''; true`);
    await type(p, "#mfa-email-code", "777888");
    await mustBam(p, "#mfa", "Xác nhận email");
    await p.waitFor(`${q("#mfa-email-enroll .alert")}.textContent !== ''`, "câu báo khi đang khoá", 10000);
    assert.match(await p.ev(txt("#mfa-email-enroll .alert")), /Nhập sai quá nhiều lần/);
    assert.deepEqual(yeuToSong(idCua(acc)), [], "chưa lưu yếu tố");
    await shotFull(p, "13-nhap-sai-429-390.png");
    const sp = loiConsole(p, [[401, /\/api\/account\/mfa\/email\/confirm$/], [429, /\/api\/account\/mfa\/email\/confirm$/]]);
    assert.deepEqual(sp.csp, []);
    assert.deepEqual(sp.errors, []);
    p.close();
    pages.splice(pages.indexOf(p), 1);
  });
} finally {
  for (const p of pages) p.close();
  await env.stop();
}

// ---- Bước 12–13: máy chủ THỨ HAI không có người gửi (`FEEDBACK_MAIL_FROM` rỗng ghi đè `.dev.vars`) → máy chủ trả 502 thật (`mail_failed`), không giả lập.
const env2 = await startEnv({ vars: { MFA_ENCRYPTION_KEY: KHOA, FEEDBACK_MAIL_FROM: "" } });
const pages2 = [];
const CAU_502 = "Chưa gửi được email, thử lại hoặc dùng cách khác.";
try {
  await b.step("12", `máy chủ không gửi được thư (502 thật): trang Tôi bấm "Gửi mã xác minh" → câu 502 tại chỗ, vẫn ở bước nhập địa chỉ${axeNote()}`, async () => {
    const p = await env2.as(ACCOUNTS.salesA, "/account#mfa", M);
    pages2.push(p);
    await p.waitFor(`!${q("#mfa")}.hidden`, "khối Bảo mật đăng nhập hiện", 10000);
    await mustBam(p, "#mfa", "Nhận mã qua email");
    await p.waitFor(`!!${q("#mfa-email-input")}`, "ô địa chỉ hiện", 5000);
    await type(p, "#mfa-email-input", DIA_CHI);
    await mustBam(p, "#mfa", "Gửi mã xác minh");
    await p.waitFor(`!${q("#mfa-email-enroll .alert")}.hidden`, "báo lỗi gửi thư", 10000);
    assert.equal(await p.ev(txt("#mfa-email-enroll .alert")), CAU_502);
    assert.equal(await p.ev(`!!${q("#mfa-email-sent")}`), false, "không sang bước nhập mã");
    assert.equal(await p.ev(`${q("#mfa-email-input")}.value`), DIA_CHI, "ô địa chỉ giữ nguyên để thử lại");
    assert.ok(!(await p.ev("document.body.innerText")).includes("send_threw") && !(await p.ev("document.body.innerText")).includes("no_from"), "không lộ mã lỗi nhà cung cấp");
    await shotFull(p, "14-gui-thu-502-trang-toi-390.png");
    await axe(p, "trang Tôi — gửi thư hỏng 502");
    const sp = loiConsole(p, [[502, /\/api\/account\/mfa\/email\/start$/]]);
    assert.deepEqual(sp.csp, []);
    assert.deepEqual(sp.errors, []);
    p.close();
    pages2.splice(pages2.indexOf(p), 1);
  });

  await b.step("13", "máy chủ không gửi được thư (502 thật): bước hai đăng nhập bấm \"Gửi mã qua email (…)\" → câu 502 ở ô báo lỗi, chưa sang \"Đã gửi mã\"", async () => {
    const id = env2.sql(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.salesB.phone}'`)[0].id;
    const at = new Date().toISOString();
    env2.sql(
      "INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) " +
        `VALUES ('${randomBytes(8).toString("hex")}', '${id}', 'EMAIL', NULL, '${B2}', 0, '${at}', NULL, '${at}', '${id}', '${at}', '${id}')`,
    );
    const p = await env2.openPage(M);
    pages2.push(p);
    // Kho cookie chung còn phiên của bước 12: đăng xuất trước (như dangXuat của máy chủ thứ nhất) rồi mới mở trang đăng nhập.
    await p.send("Page.navigate", { url: env2.base + "/login" });
    await p.waitFor("document.readyState === 'complete'", "trang /login tải xong", 15000);
    await dangXuat(p);
    await p.send("Page.navigate", { url: env2.base + "/login" });
    await p.waitFor("document.readyState === 'complete'", "trang /login tải lại xong", 15000);
    await p.waitFor(`location.pathname === '/login' && !!${q("#phone")} && !${q("#login-form")}.hidden`, "trang đăng nhập sẵn sàng", 15000);
    await type(p, "#phone", ACCOUNTS.salesB.phone);
    await type(p, "#pin", ACCOUNTS.salesB.pin);
    await p.waitFor(`!${q("#submit")}.disabled`, "nút Đăng nhập bấm được");
    await p.ev(`${q("#submit")}.click(); true`);
    await p.waitFor(`!!${q("#mfa-step")}`, "bước nhập mã hiện", 10000);
    assert.equal(await p.ev(txt("#mfa-email-send")), `Gửi mã qua email (${B2_CHE})`);
    await p.ev(`${q("#mfa-email-send")}.click(); true`);
    await p.waitFor(`!${q("#error")}.hidden && ${q("#error")}.textContent !== ''`, "báo lỗi gửi thư", 10000);
    assert.equal(await p.ev(txt("#error")), CAU_502);
    assert.equal(await p.ev(txt("#mfa-email-send")), `Gửi mã qua email (${B2_CHE})`, "chưa đổi thành «Gửi lại mã…»");
    assert.doesNotMatch(await p.ev(txt("#mfa-hint")), /Đã gửi mã tới/);
    assert.equal(await p.ev(`${q("#mfa-email-send")}.disabled`), false, "nút gửi bấm lại được");
    await shotFull(p, "15-gui-thu-502-dang-nhap-390.png");
    const sp = loiConsole(p, [[502, /\/api\/auth\/mfa\/email$/]]);
    assert.deepEqual(sp.csp, []);
    assert.deepEqual(sp.errors, []);
  });
} finally {
  for (const p of pages2) p.close();
  await env2.stop();
  b.xong();
}
