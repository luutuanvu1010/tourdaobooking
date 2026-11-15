// Kịch bản Chrome + axe — ĐĂNG KÝ ĐỐI TÁC đợt 1 (ADR-0206 … ADR-0210; Task 12, 15/11/2026). Hai khổ 390 và 1280. CHỈ D1 local tạm (startEnv của a2-cdp.mjs): không remote,
// không `wrangler dev --remote`. Tên, email, số điện thoại, số căn cước là GIẢ.
//   0. Công tắc «Nhận đăng ký mới» đang TẮT (bản gieo): màn Đăng nhập có lối «Đăng ký làm đối tác»; /dang-ky nói «Tour Đảo tạm ngừng nhận đăng ký mới.», không có biểu mẫu phiếu.
//   Rồi kịch bản BẬT công tắc và mở bốn loại đối tác trên D1 tạm (thêm một dòng dk_policy), thêm một phiên bản chính sách riêng tư.
//   1. Người đăng ký: email → (Turnstile khoá thử) Gửi mã → nhập mã → điền phiếu, hai ảnh căn cước, đồng ý → Gửi phiếu ⇒ «Đang chờ xác minh».
//   2. Quản trị: Quản lý tài khoản › Phiếu đăng ký đối tác ⇒ mở phiếu, năm mục «Đạt», «Hồ sơ mới» ⇒ «Xác minh đạt».
//   3. Nhân sự: mở phiếu chờ duyệt ⇒ «Duyệt mở tài khoản»; hàng chờ ghi «Chưa kích hoạt»; danh sách tài khoản ghi «Chưa kích hoạt».
//   4. Người đăng ký: /dang-ky ⇒ phiếu «Đã duyệt» ⇒ Gửi mã (mới) → nhập mã + mã PIN hai lần ⇒ «Đã kích hoạt tài khoản».
//   5. Đăng nhập bằng số điện thoại đã khai + mã PIN vừa đặt ở màn Đăng nhập ⇒ rời /login.
// THƯ: chạy cục bộ không có thư thật (thiếu FEEDBACK_MAIL_FROM thì máy chủ không gửi, chỉ ghi `dk_mail_failed`). Kịch bản lấy mã như khung thử (`gieoMa` của
// src/modules/dang-ky/kich-hoat-route.test.ts, `gieoMaEmail` của tests/e2e/lib.mjs): GIEO một dòng dk_email_code mới hơn với mã biết trước, băm đúng như route xin mã (khoaBam của
// src/modules/dang-ky/phien.ts) bằng SESSION_SECRET của máy chủ tạm (truyền bằng --var). Không có đường lộ mã nào trong mã sản phẩm.
// Cần MẠNG (widget Turnstile tải script của Cloudflare, máy chủ gọi siteverify với khoá thử). Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> OUT=docs/evidence/2026-11-15-dang-ky node docs/evidence/2026-11-15-dang-ky/kich-ban/dang-ky-smoke.mjs
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { insertStaffSqlThu, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { axe, axeNote, boDem, noOverflowX } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
import { khoaBam } from "../../../../src/modules/dang-ky/phien.ts";

const OUT = process.env.OUT ?? "docs/evidence/2026-11-15-dang-ky";
const ANH = OUT;
mkdirSync(ANH, { recursive: true });
const SECRET = randomBytes(48).toString("base64url");
const MOB = { width: 390, height: 844, mobile: true };
const RONG = { width: 1280, height: 860, mobile: false };
const ADM = { name: "Quản Trị Đăng Ký", phone: "0900000851", pin: "246851", permissions: ["ADMIN"] };
const HR = { name: "Nhân Sự Đăng Ký", phone: "0900000852", pin: "246852", permissions: ["HR"] };
const PIN_MOI = "580927";

const env = await startEnv({ turnstile: true, vars: { SESSION_SECRET: SECRET } });
const b = boDem("DANG KY DOI TAC");
try {
  for (const a of [ADM, HR]) for (const stmt of (await insertStaffSqlThu(a)).split("\n")) if (stmt.trim()) env.sql(stmt);

  const png = (() => {
    const crc = (buf) => { let c = ~0; for (const x of buf) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
    const khoi = (loai, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(loai), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
    const w = 80, hh = 50;
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(hh, 4); ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc((w * 3 + 1) * hh, 0x99); for (let y = 0; y < hh; y++) raw[y * (w * 3 + 1)] = 0;
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), khoi("IHDR", ihdr), khoi("IDAT", deflateSync(raw)), khoi("IEND", Buffer.alloc(0))]);
  })();
  const TEP = join(mkdtempSync(join(tmpdir(), "dang-ky-smoke-")), "can-cuoc.png");
  writeFileSync(TEP, png);

  const chup = async (p, ten, khung) => {
    await sleep(400);
    const cao = await p.ev("Math.ceil(document.documentElement.scrollHeight)");
    const dat = (h) => p.send("Emulation.setDeviceMetricsOverride", { width: khung.width, height: h, deviceScaleFactor: khung.mobile ? 2 : 1, mobile: khung.mobile });
    await dat(Math.max(khung.height, cao));
    await sleep(300);
    const r = await p.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(ANH, `${ten}.png`), Buffer.from(r.result.data, "base64"));
    await dat(khung.height);
    await sleep(150);
  };
  const chu = (p) => p.ev(`document.body.innerText.replace(/\\s+/g, ' ')`);
  const go = (p, sel, v) => p.ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  const bam = (p, sel) => p.ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
  const mo = async (khung, duong) => {
    const p = await env.openPage(khung);
    await p.send("Page.navigate", { url: env.base + duong });
    await p.waitFor("document.readyState === 'complete'", `trang ${duong}`);
    return p;
  };
  const tep = async (p, sel) => {
    const doc = await p.send("DOM.getDocument", { depth: -1 });
    const q = await p.send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: sel });
    await p.send("DOM.setFileInputFiles", { nodeId: q.result.nodeId, files: [TEP] });
  };
  /** Gieo mã email mới cho `email` (khuôn gieoMa của bài kích hoạt) — mới hơn mã máy chủ vừa sinh nên là «mã gần nhất». */
  const gieoMa = async (email, ma) => {
    const id = randomUUID();
    const emailKey = await khoaBam(SECRET, "email", email);
    const at = new Date(Date.now() + 1000).toISOString();
    env.sql(`INSERT INTO dk_email_code (id, email_key, code_hash, expires_at, attempts, created_at, updated_at) VALUES ('${id}', '${emailKey}', '${await khoaBam(SECRET, "ma", `${id}:${emailKey}:${ma}`)}', '${new Date(Date.now() + 10 * 60_000).toISOString()}', 0, '${at}', '${at}')`);
  };
  /** Bấm «Gửi mã» khi Turnstile (khoá thử) đã cho token: trang tự chặn khi chưa có token — chờ tới khi lời nhắc không còn. */
  const guiMa = async (p, sel) => {
    await p.waitFor(`!!document.querySelector('#dk-xac-minh-nguoi iframe, #dk-xac-minh-nguoi input[name="cf-turnstile-response"]')`, "widget Turnstile dựng xong", 20000);
    for (let i = 0; i < 40; i++) {
      const tok = await p.ev(`(document.querySelector('#dk-xac-minh-nguoi input[name="cf-turnstile-response"]')?.value ?? '').length`);
      if (tok > 0) break;
      await sleep(500);
    }
    await bam(p, sel);
  };

  // ---- 0. Công tắc TẮT (bản gieo) ----
  for (const [khung, hau] of [[MOB, "390"], [RONG, "1280"]]) {
    await b.step(`${hau}-0`, `${hau}: màn Đăng nhập có lối «Đăng ký làm đối tác»; công tắc tắt ⇒ /dang-ky nói «Tour Đảo tạm ngừng nhận đăng ký mới.», không biểu mẫu phiếu${axeNote()}`, async () => {
      const p = await mo(khung, "/login");
      await p.waitFor(`!!document.querySelector('#lien-ket-dang-ky')`, "liên kết đăng ký");
      assert.equal(await p.ev(`document.querySelector('#lien-ket-dang-ky').innerText.trim()`), "Đăng ký làm đối tác");
      assert.equal(await p.ev(`document.querySelector('#lien-ket-dang-ky').getClientRects().length > 0`), true, "liên kết hiện");
      await chup(p, `01-dang-nhap-lien-ket-${hau}`, khung);
      await p.send("Page.navigate", { url: env.base + "/dang-ky" });
      await p.waitFor(`!!document.querySelector('#dk-dong')`, "câu đóng đăng ký", 15000);
      const t = await chu(p);
      assert.match(t, /Tour Đảo tạm ngừng nhận đăng ký mới\./);
      assert.equal(await p.ev(`!!document.querySelector('#dk-ho-ten')`), false, "không có biểu mẫu phiếu");
      assert.equal(await p.ev(noOverflowX), true);
      await chup(p, `02-dong-dang-ky-${hau}`, khung);
      await axe(p, `dang-ky đóng ${hau}`);
      p.close();
    });
  }
  // Bật công tắc + mở bốn loại trên D1 TẠM (chỉ thêm dòng); chính sách riêng tư phiên bản 1.
  const nay = new Date().toISOString(); // SAU dòng gieo của migration (mốc lúc áp migration) để dòng này là dòng hiệu lực
  env.sql(`INSERT INTO dk_policy (id, registration_open, open_role_codes, code_digits, code_ttl_minutes, code_max_attempts, ask_per_mailbox, ask_per_network, ask_window_minutes, ask_global_per_hour,
    session_idle_minutes, session_max_hours, draft_expire_days, supplement_expire_days, activation_days, activation_grace_days, photo_max_mb, photo_max_count, anonymize_days, files_per_network_hour,
    phieu_required_items, valid_from_at, created_at, created_by, updated_at, updated_by)
    SELECT 'mo-smoke', 1, 'GUIDE_FREELANCE,HOTEL_RECEPTION,TAXI_DRIVER,COLLABORATOR', code_digits, code_ttl_minutes, code_max_attempts, ask_per_mailbox, ask_per_network, ask_window_minutes, ask_global_per_hour,
    session_idle_minutes, session_max_hours, draft_expire_days, supplement_expire_days, activation_days, activation_grace_days, photo_max_mb, photo_max_count, anonymize_days, files_per_network_hour,
    phieu_required_items, '${nay}', '${nay}', NULL, '${nay}', NULL FROM dk_policy WHERE id = 'gieo-0167'`);
  if (env.sql("SELECT count(*) AS n FROM pty_privacy_policy")[0].n === 0) {
    env.sql(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES ('cs-smoke', 1, 'Xác minh đối tác (bản thử)', 'Bản thử của chính sách riêng tư.\nTour Đảo chỉ dùng thông tin để xác minh đối tác.', '${nay}', '${nay}', 'kich-ban', '${nay}', 'kich-ban')`);
  }

  let so = 0;
  for (const [khung, hau] of [[MOB, "390"], [RONG, "1280"]]) {
    so++;
    const email = `nguoi.dang.ky.${hau}@example.com`;
    const dienThoai = `0912 345 6${String(70 + so).padStart(2, "0")}`;
    const dtKhoa = dienThoai.replace(/\s/g, "");
    let p = await env.openPage(khung);
    await p.send("Network.deleteCookies", { name: "td_dang_ky", url: env.base }); // kho cookie dùng chung: bỏ phiên đăng ký của khổ trước
    await p.send("Page.navigate", { url: env.base + "/dang-ky" });
    await p.waitFor("document.readyState === 'complete'", "trang /dang-ky");
    await b.step(`${hau}-1`, `${hau}: email → Gửi mã → nhập mã → điền phiếu, hai ảnh, đồng ý → Gửi phiếu ⇒ «Đang chờ xác minh»${axeNote()}`, async () => {
      await p.waitFor(`!!document.querySelector('#dk-email')`, "bước email", 15000);
      assert.equal(await p.ev(`!!document.querySelector('#dk-dong')`), false, "công tắc đã bật: không còn câu đóng");
      assert.equal(await p.ev(`getComputedStyle(document.querySelector('#dk-email')).fontSize`), "16px", "ô gõ 16px");
      await chup(p, `03-buoc-email-${hau}`, khung);
      await axe(p, `bước email ${hau}`);
      await go(p, "#dk-email", email);
      await guiMa(p, "#dk-gui-ma");
      await p.waitFor(`!!document.querySelector('#dk-ma')`, "bước nhập mã", 15000);
      await gieoMa(email, "315274");
      await go(p, "#dk-ma", "315274");
      await bam(p, "#dk-xac-nhan-ma");
      await p.waitFor(`!!document.querySelector('#dk-ho-ten')`, "biểu mẫu phiếu", 15000);
      await go(p, "#dk-vai", "GUIDE_FREELANCE");
      await sleep(600);
      await go(p, "#dk-ho-ten", `Nguyễn Thử Đăng Ký ${hau}`);
      await go(p, "#dk-ngay-sinh", "1990-05-06");
      await go(p, "#dk-dien-thoai", dienThoai);
      await go(p, "#dk-dia-chi", "12 Đường Thử, Nha Trang");
      await go(p, "#dk-so-cccd", `0790900012${String(30 + so)}`);
      await go(p, "#dk-ngay-cap", "2021-01-02");
      await go(p, "#dk-noi-cap", "Cục Cảnh sát (bản thử)");
      await go(p, "#dk-het-han", "2040-01-02");
      for (const o of ["CCCD_MAT_TRUOC", "CCCD_MAT_SAU"]) {
        await tep(p, `#dk-tep-${o}`);
        await p.waitFor(`document.querySelector('[data-trang-thai-tep="${o}"]').innerText === 'Đã gửi'`, `ảnh ${o} đã gửi`, 20000);
      }
      await p.ev(`document.querySelector('#dk-dong-y').click(), true`);
      await chup(p, `04-phieu-dang-dien-${hau}`, khung);
      await axe(p, `phiếu đang điền ${hau}`);
      await bam(p, "#dk-gui-phieu");
      await p.waitFor(`(document.querySelector('#dk-nhan-trang-thai')?.innerText ?? '') === 'Đang chờ xác minh'`, "trang trạng thái sau gửi", 15000);
      const t = await chu(p);
      assert.match(t, /Ảnh mặt trước căn cước: Đã gửi/);
      assert.equal(await p.ev(noOverflowX), true);
      await chup(p, `05-trang-thai-cho-xac-minh-${hau}`, khung);
      await axe(p, `trạng thái chờ xác minh ${hau}`);
    });
    p.close();
    const phieu = env.sql(`SELECT registration_id AS id FROM dk_identity WHERE subject = '${email}'`)[0]?.id;

    p = await env.as(ADM, "/staff", khung);
    await b.step(`${hau}-2`, `${hau}: Quản trị — hàng chờ phiếu đăng ký ⇒ mở phiếu, năm mục «Đạt», «Hồ sơ mới», «Xác minh đạt»${axeNote()}`, async () => {
      assert.ok(phieu, "có mã phiếu");
      await p.waitFor(`!!document.querySelector('[data-phieu="${phieu}"]')`, "thẻ phiếu trong hàng chờ", 15000);
      await bam(p, `[data-phieu="${phieu}"]`);
      await p.waitFor(`!!document.querySelector('#dk-hc-xac-minh-dat')`, "khung xác minh", 15000);
      for (const m of ["ROLE", "CALLED", "HO_TEN", "NGAY_SINH", "CCCD"]) {
        await bam(p, `[data-muc-dat="${m}"]`);
        await p.waitFor(`(document.querySelector('[data-muc="${m}"]')?.innerText ?? '').includes('Đạt') && !(document.querySelector('[data-muc="${m}"]')?.innerText ?? '').includes('Chưa kết luận')`, `mục ${m} đạt`, 10000);
      }
      await p.ev(`document.querySelector('input[name="dk-ho-so"][value="MOI"]').click(), true`);
      await sleep(300);
      await chup(p, `06-quan-tri-xac-minh-${hau}`, khung);
      await axe(p, `khung xác minh ${hau}`);
      await bam(p, "#dk-hc-xac-minh-dat");
      await p.waitFor(`document.body.innerText.includes('Đã xác minh đạt')`, "báo xác minh đạt", 15000);
      assert.equal(env.sql(`SELECT status FROM dk_registration WHERE id = '${phieu}'`)[0].status, "CHO_DUYET");
    });
    p.close();

    p = await env.as(HR, "/staff", khung);
    await b.step(`${hau}-3`, `${hau}: Nhân sự — «Duyệt mở tài khoản» ⇒ hàng chờ và danh sách tài khoản ghi «Chưa kích hoạt»${axeNote()}`, async () => {
      await p.waitFor(`!!document.querySelector('[data-phieu="${phieu}"]')`, "thẻ phiếu chờ duyệt", 15000);
      await bam(p, `[data-phieu="${phieu}"]`);
      await p.waitFor(`!!document.querySelector('#dk-hc-duyet')`, "khung duyệt", 15000);
      const t0 = await chu(p);
      const khung0 = t0.slice(t0.indexOf("Duyệt phiếu"));
      for (const bi of ["Số căn cước", `0790900012${String(30 + so)}`, "1990-05-06", "Đường Thử", "Ảnh mặt"]) assert.ok(!khung0.includes(bi), `Nhân sự không thấy ${bi}`);
      await go(p, "#dk-hc-vai", "COLLABORATOR");
      assert.equal(await p.ev(`document.querySelector('#dk-hc-doi-vai').hidden`), false, "đổi vai ⇒ câu cấp theo vai trò mới");
      await go(p, "#dk-hc-vai", "GUIDE_FREELANCE");
      await chup(p, `07-nhan-su-duyet-${hau}`, khung);
      await axe(p, `khung duyệt ${hau}`);
      await bam(p, "#dk-hc-duyet");
      await p.waitFor(`document.body.innerText.includes('Đã duyệt.')`, "báo đã duyệt", 15000);
      await p.waitFor(`(document.querySelector('[data-phieu="${phieu}"]')?.innerText ?? '').includes('Chưa kích hoạt')`, "hàng chờ: Chưa kích hoạt", 15000);
      await p.send("Page.reload", {});
      await p.waitFor(`[...document.querySelectorAll('[data-chua-kich-hoat]')].length > 0`, "danh sách tài khoản: Chưa kích hoạt", 15000);
      assert.equal(env.sql(`SELECT active FROM staff WHERE phone = '${dtKhoa}'`)[0].active, 0);
      await chup(p, `08-chua-kich-hoat-${hau}`, khung);
    });
    p.close();

    p = await mo(khung, "/dang-ky");
    await b.step(`${hau}-4`, `${hau}: người đăng ký — phiếu «Đã duyệt» ⇒ Gửi mã mới → mã + mã PIN ⇒ «Đã kích hoạt tài khoản»${axeNote()}`, async () => {
      // Phiên đăng ký của bước 1 còn hạn (cùng kho cookie): vào thẳng phiếu.
      await p.waitFor(`(document.querySelector('#dk-nhan-trang-thai')?.innerText ?? '') === 'Đã duyệt'`, "phiếu đã duyệt", 15000);
      await chup(p, `09-da-duyet-dat-pin-${hau}`, khung);
      await axe(p, `đặt PIN ${hau}`);
      await go(p, "#dk-email-pin", email);
      await guiMa(p, "#dk-gui-ma-pin");
      await p.waitFor(`!!document.querySelector('#dk-ma-pin') && document.querySelector('#dk-ma-pin').getClientRects().length > 0`, "ô mã + PIN", 15000);
      await gieoMa(email, "740318");
      await go(p, "#dk-ma-pin", "740318");
      await go(p, "#dk-pin", PIN_MOI);
      await go(p, "#dk-pin-2", PIN_MOI);
      await bam(p, "#dk-dat-pin");
      await p.waitFor(`!!document.querySelector('#dk-da-kich-hoat')`, "đã kích hoạt", 15000);
      assert.equal(env.sql(`SELECT active FROM staff WHERE phone = '${dtKhoa}'`)[0].active, 1);
      await chup(p, `10-da-kich-hoat-${hau}`, khung);
      await axe(p, `đã kích hoạt ${hau}`);
    });
    await b.step(`${hau}-5`, `${hau}: đăng nhập bằng số điện thoại đã khai + mã PIN vừa đặt ⇒ rời màn Đăng nhập`, async () => {
      await p.send("Network.deleteCookies", { name: "td_session", url: env.base }); // kho cookie dùng chung: bỏ phiên của Nhân sự (bước 3) — người đăng ký chưa từng đăng nhập
      await bam(p, "#dk-sang-dang-nhap");
      await p.waitFor(`location.pathname === '/login' && !!document.querySelector('#phone')`, "màn Đăng nhập", 15000);
      await go(p, "#phone", dtKhoa);
      await go(p, "#pin", PIN_MOI);
      for (let i = 0; i < 40; i++) {
        if (await p.ev(`document.querySelector('#submit')?.disabled === false`)) break;
        await sleep(500);
      }
      await bam(p, "#submit");
      await p.waitFor(`location.pathname !== '/login' || !!document.querySelector('#passkey-invite:not([hidden])') || !!document.querySelector('[data-buoc-hai], #mfa-form')`, "đăng nhập xong", 20000);
      await sleep(1500);
      await chup(p, `11-dang-nhap-xong-${hau}`, khung);
      assert.ok(env.sql(`SELECT last_login_at FROM staff WHERE phone = '${dtKhoa}'`)[0].last_login_at, "có lần đăng nhập");
    });
    p.close();
  }
} finally {
  b.xong();
  await env.stop();
}
