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
//   4  Quản trị có dòng EMAIL lệch + TOTP: bước hai đăng nhập không có nút gửi email (máy chủ không liệt kê EMAIL)
//   5  console sạch, không lỗi CSP (axe ở bước 1, 2, 3 khi có AXE_JS)
import { createHash, randomBytes } from "node:crypto";

process.env.OUT ??= "docs/evidence/2026-10-01-dang-nhap-c";
const { ACCOUNTS, startEnv, sleep } = await import("../../2026-09-20-a2/kich-ban/a2-cdp.mjs");
const { assert, axe, axeNote, boDem, noOverflowX, shotFull, shotView, txt } = await import("../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs");
const { maHoaKhoa } = await import("../../../../tests/e2e/fake-totp.mjs");

const M = { width: 390, height: 844, mobile: true };
const NARROW = { width: 320, height: 568, mobile: true };
const DESK = { width: 1040, height: 820, mobile: false };
const NV = ACCOUNTS.salesA;
const DIA_CHI = "TuanBao.Thu@Example.com"; // gõ chữ hoa — máy chủ lưu dạng chuẩn hoá
const CHUAN = DIA_CHI.toLowerCase();
const CHE = "t***@example.com";
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
} finally {
  for (const p of pages) p.close();
  await env.stop();
  b.xong();
}
