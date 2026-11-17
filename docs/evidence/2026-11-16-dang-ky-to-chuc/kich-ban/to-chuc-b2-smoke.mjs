// Kịch bản Chrome + axe — THÀNH VIÊN TỔ CHỨC, MÃ VÀO TỔ CHỨC (ADR-0213 Đ7, Đ8; mốc B2 Task 17). Hai khổ 390 và 1280. CHỈ D1 local tạm (startEnv của a2-cdp.mjs): không remote.
// Luồng chung (mỗi khổ một người được mời, một đơn):
//   1. Người quản lý (anh Nam, Khách sạn Sunrise) — màn tổ chức: nhập số ⇒ «Tạo lời mời» ⇒ mã hiện MỘT lần; khối «Chế độ thành viên».
//   2. 390: người được mời CHƯA có tài khoản — /dang-ky: email → mã → phiếu KHÔNG chọn vai, nhập «Mã vào tổ chức» ⇒ gửi; Quản trị xác minh đạt; Nhân sự duyệt ⇒ liên kết «Thành viên của»;
//      người được mời đặt PIN. 1280: người được mời ĐÃ có tài khoản Đối tác — trang Tôi: mã sai bị từ chối bằng câu tiếng Việt; lời mời gửi tới số của mình ⇒ «Nhận».
//   3. Thành viên: Tạo đơn — nút chính là «Lưu đơn», không «Gửi đơn»; lập đơn Trả sau tư cách Sunrise (LỜI GỌI bằng phiên của trang — không bấm đủ form dịch vụ);
//      trang đơn: không «Gửi đơn», có «Gửi người quản lý xác nhận» ⇒ bấm ⇒ «Rút lại» + câu đang chờ.
//   4. Người quản lý mở đơn: «Gửi đơn» + «Trả lại», không «Xác nhận đơn». 390: «Trả lại» (chọn lý do) ⇒ thành viên gửi lại (bấm). Rồi «Gửi đơn» (dịch vụ cần kiểm vé ⇒ yêu cầu mở).
//   5. Quản trị (văn phòng) mở đơn ⇒ «Còn vé, xác nhận đơn» ⇒ đơn đã xác nhận.   6. Màn tổ chức: «Công nợ của tổ chức» có dòng đơn vừa xác nhận.
//   4b. Sau «Gửi đơn», thành viên mở đơn: câu «đang chờ kiểm vé», không nút nào máy chủ sẽ từ chối.
//   7. (1280) Toàn quyền ở Danh bạ đổi chế độ thành viên ⇒ «Chỉ soạn»; thành viên mở nháp mới thấy câu chế độ «Chỉ soạn»; người quản lý tự mở nháp, «Gửi đơn» ⇒ hết nút ghi.
// LỜI GỌI API (không bấm): mở nhận đăng ký, đặt cờ cần kiểm vé cho TD101, đặt hạn mức Trả sau cho Sunrise (Toàn quyền), lập đơn (thành viên). Mã email do kịch bản gieo vào D1 tạm.
// Cần MẠNG (Turnstile khoá thử ở /dang-ky) và AXE_JS. Chạy từ GỐC repo sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> OUT=docs/evidence/2026-11-16-dang-ky-to-chuc node docs/evidence/2026-11-16-dang-ky-to-chuc/kich-ban/to-chuc-b2-smoke.mjs
// Các trang dùng CHUNG kho cookie: mỗi bước mở trang bằng `env.as` (đăng nhập riêng) và đóng trước khi sang tài khoản khác.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { insertStaffSqlThu, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { OUT as OUT_LIB, axe, axeNote, boDem, click, fetchTrang, noCode, noOverflowX, shotFull, txt, typeInto } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
import { khoaBam } from "../../../../src/modules/dang-ky/phien.ts";

mkdirSync(OUT_LIB + "/anh", { recursive: true });
const SECRET = randomBytes(48).toString("base64url");
const MOB = { width: 390, height: 844, mobile: true };
const RONG = { width: 1280, height: 860, mobile: false };
const CHU = { name: "Toàn Quyền B2", phone: "0900000881", pin: "246881", permissions: ["SUPER_ADMIN"] };
const ADM = { name: "Quản Trị B2", phone: "0900000882", pin: "246882", permissions: ["ADMIN"] };
const HR = { name: "Nhân Sự B2", phone: "0900000883", pin: "246883", permissions: ["HR"] };
const NAM = { name: "Anh Nam B2", phone: "0900000884", pin: "246884", permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" };
const BINH = { name: "Chị Bình Có Tài Khoản", phone: "0900000885", pin: "246885", permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" };
const MOI = { name: "Trần Được Mời", phone: "0913345681", pin: "580931", email: "duoc.moi.b2@example.com" };
const AT = new Date().toISOString();

const env = await startEnv({ turnstile: true, vars: { SESSION_SECRET: SECRET } });
const b = boDem("TO CHUC B2");
try {
  // `wrangler d1 execute --local` có lúc vấp khoá CSDL khi wrangler dev đang ghi (lần chạy đầu 17/11: hai câu đọc hỏng) ⇒ thử lại tối đa ba lần, cách nhau một giây.
  const sql = (s) => { for (let lan = 1; ; lan++) { try { return env.sql(s); } catch (e) { if (lan >= 3) throw e; const t = Date.now(); while (Date.now() - t < 1000) { /* chờ đồng bộ */ } } } };
  const org = randomUUID();
  sql(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${org}', 'ORGANIZATION', 'Khách sạn Sunrise', 1, '${AT}', '${AT}')`);
  sql(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('${randomUUID()}', '${org}', 'TRAVEL_AGENCY', '2026-01-01', '${AT}', '${AT}')`);
  for (const a of [CHU, ADM, HR, NAM, BINH]) for (const stmt of (await insertStaffSqlThu(a)).split("\n")) if (stmt.trim()) sql(stmt);
  const party = (phone) => sql(`SELECT party_id AS p FROM staff WHERE phone = '${phone}'`)[0]?.p;
  sql(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES ('${randomUUID()}', '${party(NAM.phone)}', '${org}', 'MANAGER_OF', '2026-01-01', '${AT}', '${AT}')`);
  sql(`INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by, covers_org_data) VALUES ('cs-b2', 1, 'Xác minh đối tác (bản thử)', 'Bản thử.', '${new Date(Date.now() - 3600000).toISOString()}', '${AT}', 'x', '${AT}', 'x', 0)`);

  // ---- Chuẩn bị bằng lời gọi (Toàn quyền): nhận đăng ký, cờ kiểm vé TD101, hạn mức Trả sau của Sunrise ----
  {
    const p = await env.as(CHU, "/account", RONG);
    const cs = await fetchTrang(p, "GET", "/api/dang-ky/chinh-sach");
    const mo = cs.json.loaiCoThe.filter((l) => l.lyDoChuaMo === null).map((l) => l.ma).slice(0, 1);
    const r1 = await fetchTrang(p, "POST", "/api/dang-ky/chinh-sach", { nhanDangKy: true, loaiMo: mo, dangHieuLuc: cs.json.id });
    assert.ok(r1.status < 300, r1.text);
    const r2 = await fetchTrang(p, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: "TD101", canXacNhan: true });
    assert.equal(r2.status, 200, r2.text);
    const r3 = await fetchTrang(p, "POST", "/api/tra-sau/han-muc", { partyId: org, hanMuc: 20_000_000, gioTra: 36, gioAnHan: 12 });
    assert.equal(r3.status, 201, r3.text);
    p.close();
  }

  const png = (() => {
    const crc = (buf) => { let c = ~0; for (const x of buf) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
    const khoi = (loai, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(loai), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
    const w = 80, hh = 50;
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(hh, 4); ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc((w * 3 + 1) * hh, 0x99); for (let y = 0; y < hh; y++) raw[y * (w * 3 + 1)] = 0;
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), khoi("IHDR", ihdr), khoi("IDAT", deflateSync(raw)), khoi("IEND", Buffer.alloc(0))]);
  })();
  const TEP = join(mkdtempSync(join(tmpdir(), "to-chuc-b2-")), "can-cuoc.png");
  writeFileSync(TEP, png);
  const go = (p, sel, v) => p.ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  const bam = (p, sel) => p.ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
  const co = (p, sel) => p.ev(`!!document.querySelector(${JSON.stringify(sel)})`);
  const tep = async (p, sel) => {
    const doc = await p.send("DOM.getDocument", { depth: -1 });
    const q = await p.send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: sel });
    await p.send("DOM.setFileInputFiles", { nodeId: q.result.nodeId, files: [TEP] });
  };
  const gieoMa = async (email, ma) => {
    const id = randomUUID();
    const emailKey = await khoaBam(SECRET, "email", email);
    const at = new Date(Date.now() + 1000).toISOString();
    sql(`INSERT INTO dk_email_code (id, email_key, code_hash, expires_at, attempts, created_at, updated_at) VALUES ('${id}', '${emailKey}', '${await khoaBam(SECRET, "ma", `${id}:${emailKey}:${ma}`)}', '${new Date(Date.now() + 10 * 60_000).toISOString()}', 0, '${at}', '${at}')`);
  };
  const guiMa = async (p, sel) => {
    await p.waitFor(`!!document.querySelector('#dk-xac-minh-nguoi iframe, #dk-xac-minh-nguoi input[name="cf-turnstile-response"]')`, "widget Turnstile dựng xong", 20000);
    for (let i = 0; i < 40; i++) {
      if ((await p.ev(`(document.querySelector('#dk-xac-minh-nguoi input[name="cf-turnstile-response"]')?.value ?? '').length`)) > 0) break;
      await sleep(500);
    }
    await bam(p, sel);
  };
  const xacNhanHop = async (p, chu) => {
    const sel = `(() => { const b = [...document.querySelectorAll('.btn-danger')].find((x) => x.textContent.trim() === ${JSON.stringify(chu)} && x.getClientRects().length > 0); if (!b) return false; b.click(); return true; })()`;
    await p.waitFor(sel.replace("b.click(); return true;", "return true;"), `hộp hỏi lại «${chu}»`, 8000);
    await p.ev(sel);
  };
  const baoTrang = (p) => p.ev(`[...document.querySelectorAll('.banner, .alert, [role=status], [role=alert]')].filter((x) => !x.hidden && x.getClientRects().length > 0).map((x) => x.innerText.trim()).filter(Boolean).join(' | ')`);
  const coNut = (p, action) => p.ev(`!!document.querySelector('[data-action="${action}"]')`);

  /** Bước 1: người quản lý tạo lời mời cho `so` ⇒ trả mã. */
  const taoLoiMoi = async (khung, hau, so) => {
    const p = await env.as(NAM, `/to-chuc?id=${org}`, khung);
    let ma = "";
    await b.step(`${hau}-1`, `${hau}: người quản lý — «Tạo lời mời» ⇒ mã hiện một lần; khối «Chế độ thành viên» đang «Soạn và gửi»${axeNote()}`, async () => {
      await p.waitFor(`!!document.querySelector('#tc-moi-tao')`, "khối Mời thành viên", 15000);
      assert.match(await p.ev(txt("#tc-cd")), /Đang dùng: Soạn và gửi người quản lý xác nhận/);
      assert.equal(await p.ev(`getComputedStyle(document.querySelector('#tc-moi-so')).fontSize`), "16px", "ô gõ 16px");
      await p.ev(typeInto("#tc-moi-so", so));
      await p.ev(click("#tc-moi-tao"));
      await p.waitFor(`!!document.querySelector('#tc-ma .tc-ma strong') || !document.querySelector('#error').hidden`, "mã hoặc lỗi", 15000);
      assert.equal(await p.ev(`document.querySelector('#error').hidden`), true, `không lỗi: ${await p.ev(txt("#error"))}`);
      ma = await p.ev(`document.querySelector('#tc-ma .tc-ma strong').innerText.trim()`);
      assert.match(ma, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      assert.match(await p.ev(txt("#tc-ma")), /Đã tạo lời mời\. Mã: .+ dùng được tới .+ Hãy gửi mã này cho người được mời\./);
      assert.equal(await p.ev(`document.querySelectorAll('[data-loi-moi]').length`), 1, "danh sách lời mời chưa dùng có một dòng");
      assert.ok(!(await p.ev(`document.body.innerText`)).includes(so), "danh sách không hiện số điện thoại");
      assert.equal(await p.ev(`JSON.stringify(localStorage).includes(${JSON.stringify(ma)})`), false, "mã không vào localStorage");
      assert.equal(await p.ev(noCode), "");
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      await shotFull(p, `b2-moi-thanh-vien-${hau}.png`);
      await axe(p, `màn tổ chức B2 ${hau}`);
    });
    p.close();
    return ma;
  };

  /** Bước 3–6: luồng đơn của thành viên `tv`. */
  const luongDon = async (khung, hau, tv, coTuCachCaNhan) => {
    let donId = null;
    let p = await env.as(tv, "/order-form", khung);
    await b.step(`${hau}-3`, `${hau}: thành viên — Tạo đơn tư cách Sunrise: nút chính «Lưu đơn», không «Gửi đơn»; lập đơn Trả sau (lời gọi); trang đơn có «Gửi người quản lý xác nhận» ⇒ bấm ⇒ «Rút lại»${axeNote()}`, async () => {
      await p.waitFor(`!!document.querySelector('#tu-cach-khoi')`, "khối tư cách", 15000);
      if (coTuCachCaNhan) {
        await p.waitFor(`!!document.querySelector('#tu-cach')`, "ô Tư cách", 10000);
        await p.ev(`(() => { const o = document.querySelector('#tu-cach'); o.value = ${JSON.stringify(org)}; o.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
      }
      assert.match(await p.ev(txt("#ben-dat-chi-doc")), /Bên đặt: Khách sạn Sunrise/);
      await sleep(300);
      const nhanLuu = await p.ev(`[...document.querySelectorAll('button')].filter((x) => x.getClientRects().length > 0).map((x) => x.textContent.trim())`);
      assert.ok(nhanLuu.includes("Lưu đơn (chưa xác nhận)"), `nút lưu: ${nhanLuu.join(", ")}`);
      assert.ok(!nhanLuu.includes("Gửi đơn"), "thành viên không có «Gửi đơn»");
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      await shotFull(p, `b2-thanh-vien-tao-don-${hau}.png`);
      await axe(p, `Tạo đơn thành viên ${hau}`);
      const r = await fetchTrang(p, "POST", "/api/orders", {
        customerName: "Khách Thử B2", customerPhone: "0912345678", tuCach: org, paymentTerm: "CREDIT",
        services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, departDate: vnDate(3) }],
      });
      assert.equal(r.status, 201, r.text);
      donId = r.json.order.id;
      assert.equal(sql(`SELECT acting_link_kind AS k FROM orders WHERE id = '${donId}'`)[0].k, "MEMBER");
      await p.send("Page.navigate", { url: env.base + `/order?id=${donId}` });
      await p.waitFor(`!!document.querySelector('[data-action="gui-quan-ly"]')`, "nút Gửi người quản lý xác nhận", 15000);
      assert.equal(await coNut(p, "gui-don"), false, "không «Gửi đơn»");
      assert.equal(await coNut(p, "gui-xac-nhan"), false, "không «Gửi kiểm vé»");
      await shotFull(p, `b2-thanh-vien-trang-don-${hau}.png`);
      await axe(p, `trang đơn thành viên ${hau}`);
      await p.ev(click('[data-action="gui-quan-ly"]'));
      await p.waitFor(`!!document.querySelector('[data-action="rut-gui-quan-ly"]')`, "nút Rút lại", 15000);
      assert.match(await p.ev(`document.querySelector('[data-thanh-vien="dang-cho"]').innerText`), /đang chờ người quản lý/);
      assert.equal(await p.ev(`[...document.querySelectorAll('#actions a, #actions button')].some((x) => x.textContent.trim() === 'Sửa')`), false, "đang chờ: không «Sửa»");
      assert.equal(sql(`SELECT count(*) AS n FROM ord_member_submit WHERE order_id = '${donId}' AND status = 'MO'`)[0].n, 1);
      await shotFull(p, `b2-thanh-vien-dang-cho-${hau}.png`);
    });
    p.close();

    p = await env.as(NAM, `/order?id=${donId}`, khung);
    await b.step(`${hau}-4`, `${hau}: người quản lý mở nháp thành viên — «Gửi đơn» + «Trả lại», không «Xác nhận đơn»${hau === "390" ? "; «Trả lại» (lý do) rồi thành viên gửi lại" : ""}; «Gửi đơn» ⇒ chờ kiểm vé${axeNote()}`, async () => {
      await p.waitFor(`!!document.querySelector('[data-action="gui-don"]')`, "nút Gửi đơn", 15000);
      assert.equal(await coNut(p, "tra-lai"), true, "có «Trả lại»");
      assert.equal(await p.ev(`[...document.querySelectorAll('#actions button')].some((x) => x.textContent.trim() === 'Xác nhận đơn')`), false, "không «Xác nhận đơn»");
      assert.equal(await coNut(p, "gui-quan-ly"), false);
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      await shotFull(p, `b2-quan-ly-mo-nhap-${hau}.png`);
      await axe(p, `người quản lý mở nháp ${hau}`);
      if (hau === "390") {
        await p.ev(click('[data-action="tra-lai"]'));
        await p.waitFor(`!!document.querySelector('#tra-lai-ly-do')`, "bảng Trả lại", 8000);
        await shotFull(p, `b2-tra-lai-bang-${hau}.png`);
        await axe(p, `bảng Trả lại ${hau}`);
        await p.ev(click('[data-action="tra-lai-gui"]'));
        await p.waitFor(`[...document.querySelectorAll('.sheet-root .o-loi')].some((x) => !x.hidden)`, "chưa chọn lý do ⇒ nhắc", 5000);
        await go(p, "#tra-lai-ly-do", "SAI_SO_KHACH");
        await p.ev(click('[data-action="tra-lai-gui"]'));
        await sleep(1500);
        assert.equal(sql(`SELECT status, reason_code AS r FROM ord_member_submit WHERE order_id = '${donId}' ORDER BY opened_at DESC, rowid DESC LIMIT 1`)[0].r, "SAI_SO_KHACH", `câu báo: ${await baoTrang(p)}`);
        p.close();
        const q = await env.as(tv, `/order?id=${donId}`, khung);
        await q.waitFor(`!!document.querySelector('[data-action="gui-quan-ly"]')`, "thành viên: nút gửi lại", 15000);
        await q.ev(click('[data-action="gui-quan-ly"]'));
        await q.waitFor(`!!document.querySelector('[data-action="rut-gui-quan-ly"]')`, "đã gửi lại", 15000);
        q.close();
        p = await env.as(NAM, `/order?id=${donId}`, khung);
        await p.waitFor(`!!document.querySelector('[data-action="gui-don"]')`, "nút Gửi đơn (lần hai)", 15000);
      }
      await p.ev(click('[data-action="gui-don"]'));
      for (let i = 0; i < 30 && sql(`SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = '${donId}' AND decided_at IS NULL`)[0].n === 0; i++) await sleep(500);
      assert.equal(sql(`SELECT submitted_by AS s FROM ord_confirm_request WHERE order_id = '${donId}' AND decided_at IS NULL`)[0]?.s, sql(`SELECT id FROM staff WHERE phone = '${NAM.phone}'`)[0].id, `yêu cầu mở với người quản lý (câu báo: ${await baoTrang(p)})`);
      assert.equal(sql(`SELECT staff_id AS s FROM orders WHERE id = '${donId}'`)[0].s, sql(`SELECT id FROM staff WHERE phone = '${tv.phone.replace(/\s/g, "")}'`)[0].id, "người lập vẫn là thành viên");
      await sleep(800);
      await shotFull(p, `b2-quan-ly-da-gui-${hau}.png`);
    });
    p.close();

    p = await env.as(tv, `/order?id=${donId}`, khung);
    await b.step(`${hau}-4b`, `${hau}: thành viên mở đơn đã gửi lên (chờ kiểm vé) — câu «đang chờ kiểm vé», không nút gửi người quản lý / Rút lại / Sửa / Huỷ`, async () => {
      await p.waitFor(`!!document.querySelector('[data-thanh-vien="cho-van-phong"]')`, "câu chờ văn phòng", 15000);
      for (const a of ["gui-quan-ly", "rut-gui-quan-ly", "rut-xac-nhan", "gui-don"]) assert.equal(await coNut(p, a), false, a);
      assert.equal(await p.ev(`[...document.querySelectorAll('#actions a, #actions button')].some((x) => ['Sửa', 'Huỷ đơn'].includes(x.textContent.trim()))`), false, "không Sửa / Huỷ");
      // Đối chiếu máy chủ: gửi người quản lý lại bị chặn.
      const r = await fetchTrang(p, "POST", `/api/orders/${donId}/gui-quan-ly`, {});
      assert.equal(r.status, 409, r.text);
      await shotFull(p, `b2-thanh-vien-cho-van-phong-${hau}.png`);
    });
    p.close();

    p = await env.as(ADM, `/order?id=${donId}`, khung);
    await b.step(`${hau}-5`, `${hau}: văn phòng (Quản trị) — «Còn vé, xác nhận đơn» ⇒ đơn đã xác nhận`, async () => {
      await p.waitFor(`!!document.querySelector('[data-action="quyet-dinh-con-ve"]')`, "bảng quyết định", 15000);
      await p.ev(click('[data-action="quyet-dinh-con-ve"]'));
      await p.waitFor(`!!document.querySelector('.sheet-foot-xac-nhan .btn-danger')`, "hộp hỏi lại Còn vé", 8000);
      await p.ev(click(".sheet-foot-xac-nhan .btn-danger"));
      await p.waitFor(`!document.querySelector('[data-action="quyet-dinh-con-ve"]')`, "bảng quyết định biến mất", 15000);
      assert.equal(sql(`SELECT status FROM orders WHERE id = '${donId}'`)[0].status, "confirmed");
    });
    p.close();

    p = await env.as(NAM, `/to-chuc?id=${org}`, khung);
    await b.step(`${hau}-6`, `${hau}: màn tổ chức — «Công nợ của tổ chức» có dòng đơn vừa xác nhận${axeNote()}`, async () => {
      await p.waitFor(`!!document.querySelector('#tc-ts')?.innerText`, "khối công nợ", 15000);
      const ma = sql(`SELECT order_code AS m FROM orders WHERE id = '${donId}'`)[0].m;
      await p.waitFor(`document.querySelector('#tc-ts').innerText.includes(${JSON.stringify(ma)})`, `dòng đơn ${ma}`, 15000);
      assert.match(await p.ev(txt("#tc-ts")), /Đang nợ/);
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      await p.ev(`document.querySelector('#tc-ts').scrollIntoView(), true`);
      await shotFull(p, `b2-cong-no-to-chuc-${hau}.png`);
      await axe(p, `công nợ tổ chức ${hau}`);
    });
    p.close();
  };

  // ======================= 390: người được mời chưa có tài khoản — đăng ký bằng mã =======================
  {
    const ma = await taoLoiMoi(MOB, "390", MOI.phone);
    let p = await env.openPage(MOB);
    await p.send("Network.deleteCookies", { name: "td_dang_ky", url: env.base });
    await p.send("Page.navigate", { url: env.base + "/dang-ky" });
    await p.waitFor("document.readyState === 'complete'", "trang /dang-ky");
    await b.step("390-2a", `390: người được mời — phiếu không chọn vai, nhập «Mã vào tổ chức» ⇒ «Đang chờ xác minh»${axeNote()}`, async () => {
      await p.waitFor(`!!document.querySelector('#dk-email')`, "bước email", 15000);
      await go(p, "#dk-email", MOI.email);
      await guiMa(p, "#dk-gui-ma");
      await p.waitFor(`!!document.querySelector('#dk-ma')`, "bước nhập mã", 15000);
      await gieoMa(MOI.email, "315281");
      await go(p, "#dk-ma", "315281");
      await bam(p, "#dk-xac-nhan-ma");
      await p.waitFor(`!!document.querySelector('#dk-ma-vao')`, "ô Mã vào tổ chức", 15000);
      assert.equal(await p.ev(`getComputedStyle(document.querySelector('#dk-ma-vao')).fontSize`), "16px", "ô gõ 16px");
      await go(p, "#dk-ho-ten", MOI.name);
      await go(p, "#dk-ngay-sinh", "1990-04-05");
      await go(p, "#dk-dien-thoai", MOI.phone);
      await go(p, "#dk-so-cccd", "079090002281");
      await go(p, "#dk-ngay-cap", "2021-01-02");
      await go(p, "#dk-noi-cap", "Cục Cảnh sát (bản thử)");
      for (const o of ["CCCD_MAT_TRUOC", "CCCD_MAT_SAU"]) {
        await tep(p, `#dk-tep-${o}`);
        await p.waitFor(`document.querySelector('[data-trang-thai-tep="${o}"]').innerText === 'Đã gửi'`, `ảnh ${o}`, 20000);
      }
      await p.ev(`document.querySelector('#dk-dong-y').click(), true`);
      // Chưa có mã, chưa chọn vai ⇒ trình duyệt nhắc (không gửi).
      await bam(p, "#dk-gui-phieu");
      await p.waitFor(`!document.querySelector('#dk-loi').hidden`, "nhắc chọn vai hoặc nhập mã", 8000);
      assert.match(await p.ev(txt("#dk-loi")), /hoặc nhập mã vào tổ chức/);
      await go(p, "#dk-ma-vao", ma);
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      await shotFull(p, "b2-dang-ky-ma-vao-390.png");
      await axe(p, "phiếu có mã vào tổ chức 390");
      await bam(p, "#dk-gui-phieu");
      await p.waitFor(`(document.querySelector('#dk-nhan-trang-thai')?.innerText ?? '') === 'Đang chờ xác minh' || (!document.querySelector('#dk-loi').hidden && !document.querySelector('#dk-loi').innerText.includes('hoặc nhập mã'))`, "kết quả gửi", 15000);
      assert.equal(await p.ev(`(document.querySelector('#dk-nhan-trang-thai')?.innerText ?? '')`), "Đang chờ xác minh", `gửi phiếu: ${await p.ev(txt("#dk-loi"))}`);
      assert.equal(sql(`SELECT status FROM pty_org_invite WHERE org_party_id = '${org}'`)[0].status, "GIU_CHO_PHIEU", "lời mời đang giữ cho phiếu");
    });
    p.close();
    const phieu = sql(`SELECT registration_id AS id FROM dk_identity WHERE subject = '${MOI.email}'`)[0]?.id;

    p = await env.as(ADM, "/staff", MOB);
    await b.step("390-2b", "390: Quản trị xác minh đạt phiếu có mã vào tổ chức", async () => {
      await p.waitFor(`!!document.querySelector('[data-phieu="${phieu}"]')`, "thẻ phiếu", 15000);
      await bam(p, `[data-phieu="${phieu}"]`);
      await p.waitFor(`!!document.querySelector('#dk-hc-xac-minh-dat')`, "khung xác minh", 15000);
      for (const m of ["ROLE", "CALLED", "HO_TEN", "NGAY_SINH", "CCCD"]) {
        if (!(await co(p, `[data-muc-dat="${m}"]`))) continue;
        await bam(p, `[data-muc-dat="${m}"]`);
        await p.waitFor(`!(document.querySelector('[data-muc="${m}"]')?.innerText ?? '').includes('Chưa kết luận')`, `mục ${m}`, 10000);
      }
      assert.match(await p.ev(`document.body.innerText`), /Mã vào tổ chức[\s\S]*Người đăng ký có mã vào tổ chức/, "khung xác minh hiện dòng mã vào tổ chức");
      await p.ev(`document.querySelector('input[name="dk-ho-so"][value="MOI"]')?.click(), true`);
      await sleep(300);
      await shotFull(p, "b2-xac-minh-co-ma-390.png");
      await bam(p, "#dk-hc-xac-minh-dat");
      await p.waitFor(`document.body.innerText.includes('Đã xác minh đạt') || document.body.innerText.includes('Chưa')`, "kết quả xác minh", 15000);
      assert.equal(sql(`SELECT status FROM dk_registration WHERE id = '${phieu}'`)[0].status, "CHO_DUYET", await baoTrang(p));
    });
    p.close();

    p = await env.as(HR, "/staff", MOB);
    await b.step("390-2c", "390: Nhân sự duyệt ⇒ tài khoản mới là «Thành viên của» Sunrise; lời mời đã dùng", async () => {
      await p.waitFor(`!!document.querySelector('[data-phieu="${phieu}"]')`, "thẻ chờ duyệt", 15000);
      await bam(p, `[data-phieu="${phieu}"]`);
      await p.waitFor(`!!document.querySelector('#dk-hc-duyet')`, "khung duyệt", 15000);
      assert.match(await p.ev(`document.body.innerText`), /Người đăng ký có mã vào tổ chức/, "khung duyệt hiện dòng mã vào tổ chức");
      assert.equal(await p.ev(`document.querySelector('#dk-hc-duyet').disabled`), false, "phiếu có mã: duyệt được với «không vai riêng»");
      await shotFull(p, "b2-duyet-co-ma-390.png");
      await axe(p, "khung duyệt có mã 390");
      await bam(p, "#dk-hc-duyet");
      await p.waitFor(`document.body.innerText.includes('Đã duyệt.') || [...document.querySelectorAll('.o-loi, .alert')].some((x) => !x.hidden && x.innerText.trim())`, "kết quả duyệt", 15000);
      assert.match(await p.ev(`document.body.innerText`), /Đã duyệt\./, `duyệt: ${await baoTrang(p)}`);
      const pMoi = party(MOI.phone);
      assert.ok(pMoi, "có tài khoản mới");
      assert.equal(sql(`SELECT count(*) AS n FROM v_pty_org_link WHERE org_party_id = '${org}' AND person_party_id = '${pMoi}' AND kind = 'MEMBER'`)[0].n, 1, "liên kết Thành viên của");
      assert.equal(sql(`SELECT status FROM pty_org_invite WHERE org_party_id = '${org}'`)[0].status, "DA_DUNG");
    });
    p.close();

    p = await env.openPage(MOB);
    await p.send("Page.navigate", { url: env.base + "/dang-ky" });
    await p.waitFor("document.readyState === 'complete'", "trang /dang-ky");
    await b.step("390-2d", "390: người được mời đặt PIN ⇒ kích hoạt", async () => {
      await p.waitFor(`(document.querySelector('#dk-nhan-trang-thai')?.innerText ?? '') === 'Đã duyệt'`, "phiếu đã duyệt", 15000);
      await go(p, "#dk-email-pin", MOI.email);
      await guiMa(p, "#dk-gui-ma-pin");
      await p.waitFor(`!!document.querySelector('#dk-ma-pin') && document.querySelector('#dk-ma-pin').getClientRects().length > 0`, "ô mã + PIN", 15000);
      await gieoMa(MOI.email, "740381");
      await go(p, "#dk-ma-pin", "740381");
      await go(p, "#dk-pin", MOI.pin);
      await go(p, "#dk-pin-2", MOI.pin);
      await bam(p, "#dk-dat-pin");
      await p.waitFor(`!!document.querySelector('#dk-da-kich-hoat')`, "đã kích hoạt", 15000);
    });
    p.close();
    await luongDon(MOB, "390", MOI, false);
  }

  // ======================= 1280: người được mời đã có tài khoản Đối tác — «Nhận» ở trang Tôi =======================
  {
    await taoLoiMoi(RONG, "1280", BINH.phone);
    const p = await env.as(BINH, "/account", RONG);
    await b.step("1280-2", `1280: chị Bình (đã có tài khoản) — trang Tôi: mã sai bị từ chối bằng câu tiếng Việt; lời mời gửi tới số của mình ⇒ «Nhận» ⇒ thành viên${axeNote()}`, async () => {
      await p.waitFor(`!!document.querySelector('[data-nhan-loi-moi]')`, "lời mời ở trang Tôi", 15000);
      assert.match(await p.ev(txt("#tc-loi-moi-cua-toi")), /Khách sạn Sunrise/);
      await p.ev(typeInto("#tc-nhan-ma", "ABCD-EFGH"));
      await p.ev(click("#tc-nhan-ma-nut"));
      await p.waitFor(`!document.querySelector('#tc-nhan-bao').hidden`, "câu báo mã sai", 10000);
      assert.match(await p.ev(txt("#tc-nhan-bao")), /Mã vào tổ chức không đúng hoặc không còn dùng được/);
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      await p.ev(`document.querySelector('#to-chuc-cua-toi').scrollIntoView(), true`);
      await shotFull(p, "b2-trang-toi-loi-moi-1280.png");
      await axe(p, "trang Tôi lời mời 1280");
      await p.ev(click("[data-nhan-loi-moi]"));
      await p.waitFor(`(document.querySelector('#tc-nhan-bao')?.innerText ?? '').includes('Bạn đã là thành viên')`, "đã nhận", 10000);
      assert.equal(sql(`SELECT count(*) AS n FROM v_pty_org_link WHERE org_party_id = '${org}' AND person_party_id = '${party(BINH.phone)}' AND kind = 'MEMBER'`)[0].n, 1);
      await sleep(2500); // trang tự tải lại
      await p.waitFor(`!!document.querySelector('[data-thanh-vien-cua]')`, "dòng «Thành viên» ở trang Tôi", 15000);
      await shotFull(p, "b2-trang-toi-da-nhan-1280.png");
    });
    p.close();
    await luongDon(RONG, "1280", BINH, true);

    // ---- 7. Toàn quyền đổi chế độ ở Danh bạ; thành viên thấy câu «Chỉ soạn»; người quản lý gửi lên nháp «Chỉ soạn» ----
    let chiSoanId = null;
    let q = await env.as(CHU, `/parties?id=${org}`, RONG);
    await b.step("1280-7a", `1280: Toàn quyền ở Danh bạ — «Đổi chế độ thành viên» ⇒ «Chỉ soạn»${axeNote()}`, async () => {
      await q.waitFor(`!!document.querySelector('#tc-vp-doi-che-do')`, "nút đổi chế độ", 15000);
      assert.match(await q.ev(txt("#tc-vp-che-do")), /Soạn và gửi người quản lý xác nhận/);
      await q.ev(click("#tc-vp-doi-che-do"));
      await xacNhanHop(q, "Đổi chế độ thành viên");
      await q.waitFor(`(document.querySelector('#tc-vp-che-do')?.innerText ?? '').includes('Chỉ soạn')`, "chế độ mới", 15000);
      await shotFull(q, "b2-danh-ba-che-do-1280.png");
      await axe(q, "Danh bạ chế độ 1280");
    });
    q.close();
    q = await env.as(ADM, `/parties?id=${org}`, RONG);
    await b.step("1280-7b", "1280: Quản trị xem Danh bạ — thấy chế độ, KHÔNG có nút đổi (chỉ Toàn quyền)", async () => {
      await q.waitFor(`!!document.querySelector('#tc-vp-che-do')`, "dòng chế độ", 15000);
      assert.match(await q.ev(txt("#tc-vp-che-do")), /Chỉ soạn/);
      assert.equal(await co(q, "#tc-vp-doi-che-do"), false);
    });
    q.close();
    q = await env.as(BINH, "/account", RONG);
    await b.step("1280-7c", "1280: thành viên ở chế độ «Chỉ soạn» — nháp mới: câu chế độ, không nút gửi người quản lý", async () => {
      const r = await fetchTrang(q, "POST", "/api/orders", {
        customerName: "Khách Thử B2 Hai", customerPhone: "0912345679", tuCach: org,
        services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "TD101", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, departDate: vnDate(4) }],
      });
      assert.equal(r.status, 201, r.text);
      await q.send("Page.navigate", { url: env.base + `/order?id=${r.json.order.id}` });
      await q.waitFor(`!!document.querySelector('[data-thanh-vien="chi-soan"]')`, "câu Chỉ soạn", 15000);
      assert.equal(await coNut(q, "gui-quan-ly"), false);
      assert.equal(await coNut(q, "gui-don"), false);
      await shotFull(q, "b2-thanh-vien-chi-soan-1280.png");
      chiSoanId = r.json.order.id;
    });
    q.close();
    q = await env.as(NAM, `/order?id=${chiSoanId}`, RONG);
    await b.step("1280-7d", "1280: «Chỉ soạn» — người quản lý tự mở nháp thành viên, «Gửi đơn» ⇒ đơn chờ kiểm vé: không còn «Gửi đơn» / «Sửa» / «Huỷ đơn»", async () => {
      await q.waitFor(`!!document.querySelector('[data-action="gui-don"]')`, "nút Gửi đơn", 15000);
      assert.equal(await coNut(q, "tra-lai"), false, "Chỉ soạn: không có lần gửi người quản lý để trả lại");
      await q.ev(click('[data-action="gui-don"]'));
      for (let i = 0; i < 30 && sql(`SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = '${chiSoanId}' AND decided_at IS NULL`)[0].n === 0; i++) await sleep(500);
      await q.send("Page.reload", {});
      await q.waitFor(`!!document.querySelector('#actions')`, "trang đơn sau tải lại", 15000);
      await sleep(800);
      assert.equal(await coNut(q, "gui-don"), false, "không Gửi đơn lại");
      assert.equal(await q.ev(`[...document.querySelectorAll('#actions a, #actions button')].some((x) => ['Sửa', 'Huỷ đơn', 'Xác nhận đơn'].includes(x.textContent.trim()))`), false, "không Sửa / Huỷ / Xác nhận");
      const r = await fetchTrang(q, "POST", `/api/orders/${chiSoanId}/gui-don`, {});
      assert.equal(r.status, 409, r.text);
      await shotFull(q, "b2-quan-ly-chi-soan-da-gui-1280.png");
    });
    q.close();
  }
} finally {
  b.xong();
  await env.stop();
}
