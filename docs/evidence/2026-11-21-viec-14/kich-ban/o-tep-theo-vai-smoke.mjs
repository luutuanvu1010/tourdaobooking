// Kịch bản Chrome Việc 14 (ADR-0233, đề xuất): ô tệp của phiếu đăng ký theo vai, «Tệp khác», câu báo tệp Word, ô ngoài vai còn tệp có nút gỡ. Chỉ D1 TẠM, không cần mạng ngoài
// (không qua bước email / Turnstile: phiếu và cookie đăng ký gieo thẳng — phần email đã có ở dang-ky-smoke.mjs). Ảnh .png chỉ nằm trên máy (.gitignore, ADR-0215 Đ3).
// Chạy từ gốc kho, sau `npm run build:web`:
//   AXE_JS=$PWD/node_modules/axe-core/axe.min.js OUT=docs/evidence/2026-11-21-viec-14 node docs/evidence/2026-11-21-viec-14/kich-ban/o-tep-theo-vai-smoke.mjs
// Bước (mỗi khổ 390 và 1280, phiếu riêng):
//   1. Chính sách riêng tư có dấu tổ chức + «tệp khác» ⇒ biểu mẫu có khu «Tệp khác» với ô TEP_KHAC; bật phần tổ chức ⇒ ô GPKD và «Tệp khác của tổ chức».
//   2. Chọn tệp Word (.docx) ở ô «Tệp khác» ⇒ câu «Tệp Word: hãy lưu thành PDF rồi gửi.»; chọn ảnh PNG ⇒ «Đã gửi».
//   3. Thêm dòng ẩn «Tệp khác» cho đúng vai của phiếu ⇒ tải lại: ô vẫn hiện vì còn tệp, kèm «Bỏ ảnh này»; bấm ⇒ gỡ xong, ô biến mất ở lần tải sau.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { axe, axeNote, boDem, noOverflowX } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
import { DK_COOKIE, taoPhienDangKy } from "../../../../src/modules/dang-ky/phien.ts";

const OUT = process.env.OUT ?? "docs/evidence/2026-11-21-viec-14";
mkdirSync(OUT, { recursive: true });
const SECRET = randomBytes(48).toString("base64url");
const MOB = { width: 390, height: 844, mobile: true };
const RONG = { width: 1280, height: 860, mobile: false };
// Mỗi khổ một vai: dòng «ẩn Tệp khác» của bước 3 chỉ áp cho vai của phiếu khổ đó.
const VAI_390 = "TAXI_DRIVER";
const VAI_1280 = "HOTEL_RECEPTION";

const png = (() => {
  const crc = (buf) => { let c = ~0; for (const x of buf) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
  const khoi = (loai, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(loai), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const w = 80, hh = 50;
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(hh, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * hh, 0x77); for (let y = 0; y < hh; y++) raw[y * (w * 3 + 1)] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), khoi("IHDR", ihdr), khoi("IDAT", deflateSync(raw)), khoi("IEND", Buffer.alloc(0))]);
})();
const THU = mkdtempSync(join(tmpdir(), "viec14-smoke-"));
const TEP_PNG = join(THU, "giay-to-khac.png");
const TEP_WORD = join(THU, "giay-to.docx");
writeFileSync(TEP_PNG, png);
writeFileSync(TEP_WORD, Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(200, 1)]));

const env = await startEnv({ vars: { SESSION_SECRET: SECRET } });
const b = boDem("O TEP THEO VAI");
try {
  const nay = new Date(Date.now() - 60_000).toISOString();
  env.sql(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by, covers_org_data, covers_other_files) VALUES ('cs-v14', 1, 'Xác minh đối tác (bản thử)', 'Bản thử.', '${nay}', '${nay}', 'kich-ban', '${nay}', 'kich-ban', 1, 1)`);
  env.sql(`INSERT INTO dk_policy (id, registration_open, open_role_codes, code_digits, code_ttl_minutes, code_max_attempts, ask_per_mailbox, ask_per_network, ask_window_minutes, ask_global_per_hour, session_idle_minutes, session_max_hours, draft_expire_days, supplement_expire_days, activation_days, activation_grace_days, photo_max_mb, photo_max_count, anonymize_days, files_per_network_hour, phieu_required_items, valid_from_at, created_at, created_by, updated_at, updated_by)
    SELECT 'v14-mo', 1, '${VAI_390},${VAI_1280},TRAVEL_AGENCY', code_digits, code_ttl_minutes, code_max_attempts, ask_per_mailbox, ask_per_network, ask_window_minutes, ask_global_per_hour, session_idle_minutes, session_max_hours, draft_expire_days, supplement_expire_days, activation_days, activation_grace_days, photo_max_mb, photo_max_count, anonymize_days, files_per_network_hour, phieu_required_items, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), created_at, created_by, updated_at, updated_by
    FROM dk_policy ORDER BY valid_from_at DESC LIMIT 1`);

  const chup = async (p, ten, khung) => {
    await sleep(400);
    const cao = await p.ev("Math.ceil(document.documentElement.scrollHeight)");
    const dat = (h) => p.send("Emulation.setDeviceMetricsOverride", { width: khung.width, height: h, deviceScaleFactor: khung.mobile ? 2 : 1, mobile: khung.mobile });
    await dat(Math.max(khung.height, cao));
    await sleep(300);
    const r = await p.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(OUT, `${ten}.png`), Buffer.from(r.result.data, "base64"));
    await dat(khung.height);
    await sleep(150);
  };
  const chon = async (p, sel, tep) => {
    const doc = await p.send("DOM.getDocument", { depth: -1 });
    const q = await p.send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: sel });
    await p.send("DOM.setFileInputFiles", { nodeId: q.result.nodeId, files: [tep] });
  };
  const hien = (sel) => `(() => { const el = document.querySelector(${JSON.stringify(sel)}); return !!el && el.getClientRects().length > 0; })()`;
  /** Phiếu ĐANG ĐIỀN đã lưu vai `VAI` (đối số) + cookie đăng ký; mở /dang-ky. */
  const moPhieu = async (khung, ma, VAI) => {
    const at = new Date().toISOString();
    const ident = randomUUID();
    env.sql(`INSERT INTO dk_registration (id, kind, status, role_code, created_at, updated_at, expires_at) VALUES ('${ma}', 'PERSON', 'DANG_DIEN', '${VAI}', '${at}', '${at}', '${new Date(Date.now() + 7 * 86_400_000).toISOString()}')`);
    env.sql(`INSERT INTO dk_identity (id, registration_id, provider, subject, contact_email, created_at, updated_at) VALUES ('${ident}', '${ma}', 'EMAIL', '${ma.toLowerCase()}@example.com', '${ma.toLowerCase()}@example.com', '${at}', '${at}')`);
    const p = await env.openPage(khung);
    await p.send("Network.setCookie", { name: DK_COOKIE, value: await taoPhienDangKy(SECRET, ma, ident, Date.now()), url: `${env.base}/api/dang-ky/`, path: "/api/dang-ky", httpOnly: true });
    await p.send("Page.navigate", { url: env.base + "/dang-ky" });
    await p.waitFor(`!!document.querySelector('#dk-vai')`, "biểu mẫu phiếu", 15000);
    return p;
  };

  for (const [khung, hau, ma, VAI] of [[MOB, "390", "DK_VIECMOTA", VAI_390], [RONG, "1280", "DK_VIECMOTB", VAI_1280]]) {
    let p;
    await b.step(`${hau}-1`, `${hau}: chính sách có dấu «tệp khác» ⇒ khu «Tệp khác» có ô; ô căn cước vẫn ở khu căn cước; bật phần tổ chức ⇒ ô GPKD và «Tệp khác của tổ chức»${axeNote()}`, async () => {
      p = await moPhieu(khung, ma, VAI);
      await p.waitFor(hien("#dk-tep-TEP_KHAC"), "ô «Tệp khác» hiện");
      assert.equal(await p.ev(hien("#dk-tep-CCCD_MAT_TRUOC")), true);
      assert.equal(await p.ev(`document.querySelector('[data-khu="tepKhac"] h2').innerText.trim()`), "Tệp khác");
      assert.equal(await p.ev(`!!document.querySelector('[data-khu="tepKhac"] #dk-tep-TEP_KHAC')`), true, "ô Tệp khác nằm ở khu riêng");
      assert.equal(await p.ev(noOverflowX), true);
      await chup(p, `01-tep-khac-ca-nhan-${hau}`, khung);
      await axe(p, `phiếu có Tệp khác ${hau}`);
      await p.ev(`(() => { const c = document.querySelector('#dk-cong-tac-to-chuc'); c.click(); return true; })()`);
      await p.waitFor(hien("#dk-tep-GPKD"), "ô GPKD hiện");
      await p.waitFor(hien("#dk-tep-TEP_KHAC_TO_CHUC"), "ô Tệp khác của tổ chức hiện");
      assert.equal(await p.ev(`(() => { const k = [...document.querySelectorAll('#dk-phan-to-chuc [data-khu]')].map((x) => x.dataset.khu); return k.indexOf('tepKhacToChuc') < k.indexOf('uyQuyen'); })()`), true, "«Tệp khác của tổ chức» đứng trước «Xác nhận»");
      assert.equal(await p.ev(`[...document.querySelectorAll('[data-khu="tepKhac"] .nhan')].every((x) => x.classList.contains('visually-hidden'))`), true, "không lặp chữ «Tệp khác» ngay dưới tiêu đề khu");
      await chup(p, `02-phan-to-chuc-${hau}`, khung);
      await axe(p, `phần tổ chức ${hau}`);
      await p.ev(`(() => { const c = document.querySelector('#dk-cong-tac-to-chuc'); c.click(); return true; })()`);
    });
    await b.step(`${hau}-2`, `${hau}: tệp Word ⇒ «Tệp Word: hãy lưu thành PDF rồi gửi.»; ảnh PNG ⇒ «Đã gửi»`, async () => {
      await chon(p, "#dk-tep-TEP_KHAC", TEP_WORD);
      await p.waitFor(`document.querySelector('#dk-loi-tep-TEP_KHAC')?.innerText === 'Tệp Word: hãy lưu thành PDF rồi gửi.' && document.querySelector('#dk-loi').hidden`, "câu tệp Word");
      await chup(p, `03-tep-word-${hau}`, khung);
      await chon(p, "#dk-tep-TEP_KHAC", TEP_PNG);
      await p.waitFor(`document.querySelector('[data-trang-thai-tep="TEP_KHAC"]')?.innerText === 'Đã gửi'`, "Đã gửi", 20000);
      assert.equal(await p.ev(`document.querySelector('#dk-loi-tep-TEP_KHAC').hidden`), true, "gửi được thì câu lỗi của ô tắt");
      assert.equal(await p.ev(hien("#dk-go-tep-TEP_KHAC")), true, "ô Tệp khác có «Bỏ ảnh này»");
      assert.equal(env.sql(`SELECT count(*) AS n FROM pty_registration_attachment WHERE registration_id = '${ma}' AND slot = 'TEP_KHAC' AND purged_at IS NULL`)[0].n, 1);
    });
    await b.step(`${hau}-3`, `${hau}: ô bị ẩn cho vai của phiếu mà còn tệp ⇒ vẫn hiện kèm «Bỏ ảnh này»; gỡ xong thì lần tải sau ô biến mất${axeNote()}`, async () => {
      const at = new Date(Date.now() - 1000).toISOString();
      env.sql(`INSERT INTO dk_role_slot (id, part, role_code, slot, mode, sort_order, valid_from_at, created_at, updated_at) VALUES ('${randomUUID()}', 'CA_NHAN', '${VAI}', 'TEP_KHAC', 'AN', 90, '${at}', '${at}', '${at}')`);
      await p.send("Page.reload");
      await p.waitFor(`!!document.querySelector('#dk-vai')`, "biểu mẫu sau tải lại", 15000);
      await p.waitFor(hien("#dk-go-tep-TEP_KHAC"), "«Bỏ ảnh này» của ô ngoài vai");
      await chup(p, `04-o-ngoai-vai-con-tep-${hau}`, khung);
      await axe(p, `ô ngoài vai ${hau}`);
      await p.ev(`(() => { document.querySelector('#dk-go-tep-TEP_KHAC').click(); return true; })()`);
      await p.waitFor(`document.querySelector('[data-trang-thai-tep="TEP_KHAC"]')?.innerText === 'Chưa gửi'`, "đã gỡ");
      await p.send("Page.reload");
      await p.waitFor(`!!document.querySelector('#dk-vai')`, "biểu mẫu sau tải lại", 15000);
      await sleep(300);
      assert.equal(await p.ev(hien("#dk-tep-TEP_KHAC")), false, "ô bị ẩn, không còn tệp ⇒ không hiện");
      assert.equal(await p.ev(hien("#dk-tep-CCCD_MAT_TRUOC")), true);
      p.close();
    });
  }
} finally {
  b.xong();
  await env.stop();
}
