// Kịch bản Chrome + axe — ĐĂNG KÝ ĐỐI TÁC đợt 2 lượt A: PHẦN TỔ CHỨC (ADR-0212; Task 8, 16/11/2026). Hai khổ 390 và 1280. CHỈ D1 local tạm (startEnv của a2-cdp.mjs): không remote.
//   0. D1 tạm gieo: chính sách riêng tư CÓ dấu «thu thông tin tổ chức» + một loại do Kế toán thêm `LD_THU`. Toàn quyền: khối «Nhận đăng ký mới» — «Công ty lữ hành» hiện mờ kèm lý do; mở `LD_THU`, Bật, Lưu.
//   1. Người đăng ký: email → mã → bật «Tôi đăng ký cho cả tổ chức» → điền → ảnh GPKD. (390) Lối thoát: tắt công tắc khi còn ảnh ⇒ hỏi «Bỏ ảnh và phần tổ chức · Thôi» ⇒ bỏ ảnh ⇒ bật lại, tải lại ảnh. Gửi phiếu.
//   2. Quản trị: màn xác minh có HAI nhóm mục, khối «Thông tin tổ chức» (số che), «Đối chiếu Danh bạ cho tổ chức» ⇒ «Xác minh đạt».
//   3. Nhân sự: màn duyệt hiện mục tổ chức và kết luận Danh bạ của tổ chức ⇒ «Duyệt mở tài khoản» ⇒ có hồ sơ tổ chức mới.   4. Người đăng ký đặt PIN.
// Cần MẠNG (Turnstile khoá thử) và AXE_JS. Chạy từ GỐC repo sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> OUT=docs/evidence/2026-11-16-dang-ky-to-chuc node docs/evidence/2026-11-16-dang-ky-to-chuc/kich-ban/dang-ky-to-chuc-smoke.mjs
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { insertStaffSqlThu, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { axe, axeNote, boDem, noOverflowX } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
import { khoaBam } from "../../../../src/modules/dang-ky/phien.ts";

const OUT = process.env.OUT ?? "docs/evidence/2026-11-16-dang-ky-to-chuc";
const ANH = OUT;
mkdirSync(ANH, { recursive: true });
const SECRET = randomBytes(48).toString("base64url");
const MOB = { width: 390, height: 844, mobile: true };
const RONG = { width: 1280, height: 860, mobile: false };
const ADM = { name: "Quản Trị Đăng Ký", phone: "0900000861", pin: "246861", permissions: ["ADMIN"] };
const HR = { name: "Nhân Sự Đăng Ký", phone: "0900000862", pin: "246862", permissions: ["HR"] };
const CHU = { name: "Toàn Quyền Đăng Ký", phone: "0900000863", pin: "246863", permissions: ["SUPER_ADMIN"] };
const PIN_MOI = "580927";

const env = await startEnv({ turnstile: true, vars: { SESSION_SECRET: SECRET } });
const b = boDem("DANG KY TO CHUC");
try {
  for (const a of [ADM, HR, CHU]) for (const stmt of (await insertStaffSqlThu(a)).split("\n")) if (stmt.trim()) env.sql(stmt);

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

  const nay = new Date().toISOString();
  env.sql(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by, covers_org_data) VALUES ('cs-to-chuc', 1, 'Xác minh đối tác (bản thử)', 'Bản thử của chính sách riêng tư.', '${new Date(Date.now() - 3600000).toISOString()}', '${nay}', 'x', '${nay}', 'x', 1)`);
  env.sql(`INSERT INTO pty_role_type (code, name, sort_order, active, role_group, is_partner_label, created_at, created_by, updated_at, updated_by) VALUES ('LD_THU', 'Công ty thử nghiệm', 150, 1, 'OTHER', 1, '${nay}', 'x', '${nay}', 'x')`);
  const dem = async (p, sel) => p.ev(`document.querySelectorAll(${JSON.stringify(sel)}).length`);

  for (const [khung, hau] of [[MOB, "390"], [RONG, "1280"]]) {
    const p = await env.as(CHU, "/staff", khung);
    await b.step(`${hau}-0`, `${hau}: Toàn quyền — khối «Nhận đăng ký mới»: vai chưa đủ điều kiện hiện mờ kèm lý do; mở «Công ty thử nghiệm», Bật, Lưu${axeNote()}`, async () => {
      await p.waitFor(`!!document.querySelector('#dk-cs-luu')`, "khối Nhận đăng ký mới", 15000);
      assert.ok(await p.ev(`[...document.querySelectorAll('input[name=dk-cs-loai]:disabled')].every((x) => x.closest('label').innerText.includes('Chưa mở được')) && document.querySelectorAll('input[name=dk-cs-loai]:disabled').length >= 1`), "vai chưa đủ điều kiện: khoá, kèm lý do");
      assert.ok(Number(await p.ev(`getComputedStyle(document.querySelector('input[name=dk-cs-loai]:disabled').closest('label')).opacity`)) < 1, "hiện mờ");
      if (hau === "390") {
        await p.ev(`document.querySelector('input[name=dk-cs-loai][value=LD_THU]').click(), true`);
        await p.ev(`document.querySelector('#dk-cs-bat').click(), true`);
        await bam(p, "#dk-cs-luu");
        await p.waitFor(`(document.querySelector('#dk-cs-bao')?.innerText ?? '').includes('đang nhận đăng ký mới')`, "báo đã lưu", 15000);
      }
      await p.ev(`document.querySelector('#dang-ky-cs').scrollIntoView(), true`);
      await chup(p, `00-toan-quyen-nhan-dang-ky-${hau}`, khung);
      await axe(p, `khối Nhận đăng ký mới ${hau}`);
    });
    p.close();
  }

  let so = 0;
  for (const [khung, hau] of [[MOB, "390"], [RONG, "1280"]]) {
    so++;
    const email = `cong.ty.dang.ky.${hau}@example.com`;
    const dienThoai = `0913 345 6${String(70 + so).padStart(2, "0")}`;
    const dtKhoa = dienThoai.replace(/\s/g, "");
    let p = await env.openPage(khung);
    await p.send("Network.deleteCookies", { name: "td_dang_ky", url: env.base });
    await p.send("Page.navigate", { url: env.base + "/dang-ky" });
    await p.waitFor("document.readyState === 'complete'", "trang /dang-ky");
    await b.step(`${hau}-1`, `${hau}: người đăng ký — phiếu có phần tổ chức${hau === "390" ? " (kèm lối thoát bỏ ảnh)" : ""} ⇒ «Đang chờ xác minh»${axeNote()}`, async () => {
      await p.waitFor(`!!document.querySelector('#dk-email')`, "bước email", 15000);
      await go(p, "#dk-email", email);
      await guiMa(p, "#dk-gui-ma");
      await p.waitFor(`!!document.querySelector('#dk-ma')`, "bước nhập mã", 15000);
      await gieoMa(email, "315274");
      await go(p, "#dk-ma", "315274");
      await bam(p, "#dk-xac-nhan-ma");
      await p.waitFor(`!!document.querySelector('#dk-ho-ten')`, "biểu mẫu phiếu", 15000);
      assert.equal(await dem(p, "#dk-cong-tac-to-chuc"), 1, "công tắc tổ chức hiện (chính sách có dấu)");
      assert.equal(await p.ev(`document.querySelector('#dk-phan-to-chuc').hidden`), true, "phần tổ chức ẩn khi công tắc tắt");
      assert.equal(await p.ev(`[...document.querySelectorAll('#dk-vai option')].some((o) => o.value === 'TRAVEL_AGENCY')`), false);
      await go(p, "#dk-vai", "GUIDE_FREELANCE");
      await sleep(500);
      await p.ev(`document.querySelector('#dk-cong-tac-to-chuc').click(), true`);
      await p.waitFor(`document.querySelector('#dk-phan-to-chuc').hidden === false`, "phần tổ chức mở", 5000);
      await go(p, "#dk-vai-to-chuc", "LD_THU");
      await sleep(500);
      if (hau === "390") {
        // Chính sách mất dấu tổ chức khi phiếu còn ảnh GPKD (mốc A kiểm cuối I-1): công tắc ẩn, nhưng ảnh vẫn gỡ được ngay trên trang.
        await tep(p, "#dk-tep-GPKD");
        await p.waitFor(`document.querySelector('[data-trang-thai-tep="GPKD"]').innerText === 'Đã gửi'`, "ảnh GPKD đã gửi (trước khi chính sách đổi)", 20000);
        const t2 = new Date(Date.now() - 120000).toISOString();
        env.sql(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by, covers_org_data) VALUES ('cs-ban-2', 2, 'm', 'Bản không có phần tổ chức.', '${t2}', '${t2}', 'x', '${t2}', 'x', 0)`);
        await p.send("Page.reload", {});
        await p.waitFor(`!!document.querySelector('#dk-ho-ten')`, "phiếu sau khi chính sách đổi", 15000);
        assert.equal(await dem(p, "#dk-cong-tac-to-chuc"), 0, "công tắc ẩn khi chính sách không còn dấu tổ chức");
        assert.equal(await dem(p, "#dk-to-chuc-dong"), 1, "câu báo + ô ảnh còn lại");
        assert.equal(await p.ev(`document.querySelector('#dk-go-tep-GPKD').hidden`), false, "«Bỏ ảnh này» hiện dù công tắc ẩn");
        await chup(p, `01b-chinh-sach-mat-dau-to-chuc-con-anh-${hau}`, khung);
        await axe(p, `chính sách mất dấu tổ chức, còn ảnh ${hau}`);
        await bam(p, "#dk-go-tep-GPKD");
        await p.waitFor(`document.querySelector('[data-trang-thai-tep="GPKD"]').innerText === 'Chưa gửi'`, "đã bỏ ảnh", 10000);
        assert.equal(env.sql(`SELECT count(*) AS n FROM pty_registration_attachment WHERE slot = 'GPKD' AND purged_at IS NULL`)[0].n, 0);
        const t3 = new Date(Date.now() - 60000).toISOString();
        env.sql(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by, covers_org_data) VALUES ('cs-ban-3', 3, 'm', 'Bản có phần tổ chức.', '${t3}', '${t3}', 'x', '${t3}', 'x', 1)`);
        await p.send("Page.reload", {});
        await p.waitFor(`!!document.querySelector('#dk-cong-tac-to-chuc')`, "công tắc hiện lại khi chính sách có dấu", 15000);
        assert.equal(await p.ev(`document.querySelector('#dk-cong-tac-to-chuc').checked`), true, "vai tổ chức đã lưu ⇒ công tắc bật");
        assert.equal(await p.ev(`document.querySelector('#dk-vai-to-chuc').value`), "LD_THU");
      }
      assert.equal(await p.ev(`document.querySelector('#dk-tc-so-gp').closest('label').hidden`), true, "chưa chọn loại giấy phép thêm: ô số ẩn");
      await go(p, "#dk-tc-ten", `Công ty Thử ${hau}`);
      await go(p, "#dk-tc-ten-phap-ly", `Công ty TNHH Thử ${hau}`);
      await go(p, "#dk-tc-mst", `03123456${70 + so}`);
      await go(p, "#dk-tc-dia-chi", "1 Đường Thử, Nha Trang");
      await go(p, "#dk-tc-email", `hoadon.${hau}@example.com`);
      await go(p, "#dk-tc-so-gpkd", `4201${so}00123`);
      await go(p, "#dk-tc-ngay-cap-gpkd", "2019-03-04");
      await go(p, "#dk-tc-noi-cap-gpkd", "Sở Kế hoạch (bản thử)");
      await go(p, "#dk-tc-loai-gp", "TRANSPORT");
      assert.equal(await p.ev(`document.querySelector('#dk-tc-so-gp').closest('label').hidden`), false, "chọn loại: ô số hiện");
      await go(p, "#dk-tc-so-gp", `GP${so}77`);
      await go(p, "#dk-tc-ngay-cap-gp", "2020-01-01");
      await go(p, "#dk-tc-het-han-gp", "2030-01-01");
      await tep(p, "#dk-tep-GPKD");
      await p.waitFor(`document.querySelector('[data-trang-thai-tep="GPKD"]').innerText === 'Đã gửi'`, "ảnh GPKD đã gửi", 20000);
      if (hau === "390") {
        // Lối thoát (ruling điều phối): tắt công tắc khi còn ảnh ⇒ hỏi; «Thôi» giữ nguyên; bỏ ảnh thì ô về «Chưa gửi».
        await p.ev(`document.querySelector('#dk-cong-tac-to-chuc').click(), true`);
        await p.waitFor(`document.querySelector('#dk-hoi-bo-to-chuc').hidden === false`, "hỏi bỏ ảnh", 5000);
        assert.equal(await p.ev(`document.querySelector('#dk-cong-tac-to-chuc').checked`), true, "chưa bỏ khi chưa xác nhận");
        await chup(p, `01-hoi-bo-phan-to-chuc-${hau}`, khung);
        await bam(p, "#dk-go-anh-bo-to-chuc");
        await p.waitFor(`document.querySelector('#dk-phan-to-chuc').hidden === true`, "phần tổ chức đóng", 10000);
        assert.equal(env.sql(`SELECT count(*) AS n FROM pty_registration_attachment WHERE slot = 'GPKD' AND purged_at IS NULL`)[0].n, 0, "ảnh GPKD đã gỡ");
        assert.equal(env.sql(`SELECT org_role_code AS r FROM dk_registration WHERE id = (SELECT registration_id FROM dk_identity WHERE subject = '${email}')`)[0].r, null, "vai tổ chức đã xoá khỏi bản nháp");
        await p.ev(`document.querySelector('#dk-cong-tac-to-chuc').click(), true`);
        await go(p, "#dk-vai-to-chuc", "LD_THU");
        await sleep(500);
        await tep(p, "#dk-tep-GPKD");
        await p.waitFor(`document.querySelector('[data-trang-thai-tep="GPKD"]').innerText === 'Đã gửi'`, "ảnh GPKD gửi lại", 20000);
      }
      await go(p, "#dk-ho-ten", `Trần Đại Diện ${hau}`);
      await go(p, "#dk-ngay-sinh", "1985-02-03");
      await go(p, "#dk-dien-thoai", dienThoai);
      await go(p, "#dk-so-cccd", `0790900022${String(30 + so)}`);
      await go(p, "#dk-ngay-cap", "2021-01-02");
      await go(p, "#dk-noi-cap", "Cục Cảnh sát (bản thử)");
      for (const o of ["CCCD_MAT_TRUOC", "CCCD_MAT_SAU"]) {
        await tep(p, `#dk-tep-${o}`);
        await p.waitFor(`document.querySelector('[data-trang-thai-tep="${o}"]').innerText === 'Đã gửi'`, `ảnh ${o}`, 20000);
      }
      await p.ev(`document.querySelector('#dk-tc-uy-quyen').click(), true`);
      await p.ev(`document.querySelector('#dk-dong-y').click(), true`);
      assert.equal(await p.ev(`getComputedStyle(document.querySelector('#dk-tc-ten')).fontSize`), "16px", "ô gõ 16px");
      assert.equal(await p.ev(noOverflowX), true);
      await chup(p, `02-phieu-to-chuc-${hau}`, khung);
      await axe(p, `phiếu có phần tổ chức ${hau}`);
      await bam(p, "#dk-gui-phieu");
      await p.waitFor(`(document.querySelector('#dk-nhan-trang-thai')?.innerText ?? '') === 'Đang chờ xác minh' || !document.querySelector('#dk-loi').hidden`, "kết quả gửi", 15000);
      const loiGui = await p.ev(`document.querySelector('#dk-loi').hidden ? '' : document.querySelector('#dk-loi').innerText`);
      assert.equal(loiGui, "", `gửi phiếu không báo lỗi: ${loiGui}`);
      await p.waitFor(`(document.querySelector('#dk-nhan-trang-thai')?.innerText ?? '') === 'Đang chờ xác minh'`, "trạng thái sau gửi", 15000);
      assert.match(await chu(p), /Ảnh giấy chứng nhận đăng ký kinh doanh: Đã gửi/);
      assert.equal(env.sql(`SELECT count(*) AS n FROM dk_submission_org`)[0].n, so);
      await chup(p, `03-cho-xac-minh-${hau}`, khung);
    });
    p.close();
    const phieu = env.sql(`SELECT registration_id AS id FROM dk_identity WHERE subject = '${email}'`)[0]?.id;

    p = await env.as(ADM, "/staff", khung);
    await b.step(`${hau}-2`, `${hau}: Quản trị — hai nhóm mục, khối «Thông tin tổ chức» (số che), đối chiếu Danh bạ cho tổ chức ⇒ «Xác minh đạt»${axeNote()}`, async () => {
      await p.waitFor(`!!document.querySelector('[data-phieu="${phieu}"]')`, "thẻ phiếu", 15000);
      await bam(p, `[data-phieu="${phieu}"]`);
      await p.waitFor(`!!document.querySelector('#dk-hc-xac-minh-dat') && !!document.querySelector('#dk-hc-to-chuc')`, "khung xác minh có khối tổ chức", 15000);
      const t = await p.ev(`document.querySelector('#dk-hc-to-chuc').innerText.replace(/\\s+/g, ' ')`);
      assert.match(t, /Công ty Thử/); assert.match(t, /Công ty thử nghiệm/); assert.match(t, /Giấy phép kinh doanh vận tải/);
      assert.ok(!t.includes(`4201${so}00123`) && !t.includes(`03123456${70 + so}`), "số đầy đủ không hiện");
      assert.ok(!/TRANSPORT|LD_THU/.test(t), "không lộ mã thô");
      for (const m of ["ROLE", "CALLED", "HO_TEN", "NGAY_SINH", "CCCD"]) {
        if (!(await dem(p, `[data-muc-dat="${m}"]`))) continue;
        await bam(p, `[data-muc-dat="${m}"]`);
        await p.waitFor(`!(document.querySelector('[data-muc="${m}"]')?.innerText ?? '').includes('Chưa kết luận')`, `mục ${m}`, 10000);
      }
      const mucTc = await p.ev(`[...document.querySelectorAll('#dk-hc-muc-to-chuc [data-muc-dat]')].map((x) => x.dataset.mucDat)`);
      assert.ok(mucTc.length >= 1, "có mục của tổ chức");
      for (const m of mucTc) {
        await bam(p, `#dk-hc-muc-to-chuc [data-muc-dat="${m}"]`);
        await p.waitFor(`!(document.querySelector('#dk-hc-muc-to-chuc [data-muc="${m}"]')?.innerText ?? '').includes('Chưa kết luận')`, `mục tổ chức ${m}`, 10000);
      }
      assert.equal(await dem(p, "#dk-hc-muc-to-chuc [data-muc]") , mucTc.length, "kết luận mục cá nhân không làm mất nhóm tổ chức");
      await p.ev(`document.querySelector('input[name="dk-ho-so"][value="MOI"]').click(), true`);
      await p.ev(`document.querySelector('input[name="dk-ho-so-to-chuc"][value="MOI"]').click(), true`);
      await sleep(300);
      await chup(p, `04-quan-tri-xac-minh-${hau}`, khung);
      await axe(p, `xác minh có tổ chức ${hau}`);
      await bam(p, "#dk-hc-xac-minh-dat");
      await p.waitFor(`document.body.innerText.includes('Đã xác minh đạt')`, "báo xác minh đạt", 15000);
      assert.equal(env.sql(`SELECT status FROM dk_registration WHERE id = '${phieu}'`)[0].status, "CHO_DUYET");
    });
    p.close();

    p = await env.as(HR, "/staff", khung);
    await b.step(`${hau}-3`, `${hau}: Nhân sự — màn duyệt có mục và kết luận Danh bạ của tổ chức ⇒ «Duyệt mở tài khoản» ⇒ hồ sơ tổ chức mới${axeNote()}`, async () => {
      await p.waitFor(`!!document.querySelector('[data-phieu="${phieu}"]')`, "thẻ chờ duyệt", 15000);
      await bam(p, `[data-phieu="${phieu}"]`);
      await p.waitFor(`!!document.querySelector('#dk-hc-duyet')`, "khung duyệt", 15000);
      const t = await chu(p);
      assert.match(t, /Kết luận Danh bạ của tổ chức/); assert.match(t, /Hồ sơ tổ chức mới/);
      for (const bi of ["03123456", "00123", `4201${so}`]) assert.ok(!t.includes(bi), `Nhân sự không thấy ${bi}`);
      await chup(p, `05-nhan-su-duyet-${hau}`, khung);
      await axe(p, `duyệt có tổ chức ${hau}`);
      await bam(p, "#dk-hc-duyet");
      await p.waitFor(`document.body.innerText.includes('Đã duyệt.')`, "báo đã duyệt", 15000);
      assert.equal(env.sql(`SELECT count(*) AS n FROM pty_organization WHERE legal_name = 'Công ty TNHH Thử ${hau}'`)[0].n, 1, "hồ sơ tổ chức mới");
    });
    p.close();

    p = await mo(khung, "/dang-ky");
    await b.step(`${hau}-4`, `${hau}: người đăng ký — phiếu «Đã duyệt» ⇒ đặt PIN ⇒ «Đã kích hoạt tài khoản»${axeNote()}`, async () => {
      await p.waitFor(`(document.querySelector('#dk-nhan-trang-thai')?.innerText ?? '') === 'Đã duyệt'`, "phiếu đã duyệt", 15000);
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
      await chup(p, `06-da-kich-hoat-${hau}`, khung);
    });
    p.close();
  }
} finally {
  b.xong();
  await env.stop();
}
