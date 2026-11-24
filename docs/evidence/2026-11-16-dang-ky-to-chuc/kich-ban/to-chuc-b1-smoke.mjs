// Kịch bản Chrome + axe — TƯ CÁCH VÀ NGƯỜI QUẢN LÝ TỔ CHỨC (ADR-0213, mốc B1 Task 14). Hai khổ 390 và 1280. CHỈ D1 local tạm (startEnv của a2-cdp.mjs): không remote, không cần mạng ngoài.
//   1. Người quản lý (anh Nam, vừa là đại lý cá nhân vừa quản lý Khách sạn Sunrise): màn Tạo đơn có ô «Tư cách» (hai mục), chọn Sunrise ⇒ dòng «Bên đặt: Khách sạn Sunrise»;
//      nhớ lựa chọn khi tải lại; lập đơn theo tư cách Sunrise (lời gọi bằng phiên của trang) ⇒ trang đơn ghi bên đặt là Sunrise.
//   2. Trang Tôi: mục «Hồ sơ tổ chức» ⇒ màn người quản lý: thành viên (chị Lan), nút «Chuyển quyền quản lý» ⇒ hộp hỏi lại ⇒ yêu cầu đang chờ.
//   3. Toàn quyền ở Danh bạ (hồ sơ Sunrise): thấy người quản lý, yêu cầu chờ; chọn chị Lan + lý do ⇒ «Chuyển quyền quản lý» ⇒ người quản lý mới. Dòng quan hệ «Người quản lý của» /
//      «Thành viên của» KHÔNG có nút «Kết thúc».
//   4. Anh Nam mở lại màn tổ chức ⇒ bị từ chối bằng câu tiếng Việt (không còn là người quản lý).
// Chạy từ GỐC repo sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> OUT=docs/evidence/2026-11-16-dang-ky-to-chuc node docs/evidence/2026-11-16-dang-ky-to-chuc/kich-ban/to-chuc-b1-smoke.mjs
// Các trang dùng CHUNG kho cookie: mỗi bước mở trang bằng `env.as` (đăng nhập riêng); tài khoản của trang cần kiểm được mở SAU CÙNG ở bước đó.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { insertStaffSqlThu, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { OUT as OUT_LIB, axe, axeNote, boDem, click, fetchTrang, noOverflowX, shotFull, shown, txt, typeInto } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

mkdirSync(OUT_LIB + "/anh", { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const RONG = { width: 1280, height: 860, mobile: false };
const CHU = { name: "Toàn Quyền Tổ Chức", phone: "0900000871", pin: "246871", permissions: ["SUPER_ADMIN"] };
const NAM = { name: "Anh Nam Thử", phone: "0900000872", pin: "246872", permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" };
const LAN = { name: "Chị Lan Thử", phone: "0900000873", pin: "246873", permissions: ["PARTNER"], vai: "TRAVEL_AGENCY" };
const AT = new Date().toISOString();
const NAY = vnDate(0);

const env = await startEnv();
const b = boDem("TU CACH VA TO CHUC B1");
try {
  const org = randomUUID();
  const sql = (s) => env.sql(s);
  sql(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${org}', 'ORGANIZATION', 'Khách sạn Sunrise', 1, '${AT}', '${AT}')`);
  sql(`INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('${randomUUID()}', '${org}', 'TRAVEL_AGENCY', '2026-01-01', '${AT}', '${AT}')`);
  for (const a of [CHU, NAM, LAN]) for (const stmt of (await insertStaffSqlThu(a)).split("\n")) if (stmt.trim()) sql(stmt);
  const party = (phone) => sql(`SELECT party_id AS p FROM staff WHERE phone = '${phone}'`)[0].p;
  const [pNam, pLan] = [party(NAM.phone), party(LAN.phone)];
  for (const [p, loai] of [[pNam, "MANAGER_OF"], [pLan, "MEMBER_OF"]]) {
    sql(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES ('${randomUUID()}', '${p}', '${org}', '${loai}', '2026-01-01', '${AT}', '${AT}')`);
  }
  let donId = null;

  for (const [khung, hau] of [[MOB, "390"], [RONG, "1280"]]) {
    let p = await env.as(NAM, "/order-form", khung);
    await b.step(`${hau}-1`, `${hau}: Tạo đơn — ô «Tư cách» có hai mục; chọn Sunrise ⇒ «Bên đặt: Khách sạn Sunrise»; tải lại vẫn nhớ${axeNote()}`, async () => {
      await p.waitFor(`!!document.querySelector('#tu-cach')`, "ô Tư cách", 15000);
      assert.equal(await p.ev(`document.querySelectorAll('#tu-cach option').length`), 2);
      await p.ev(`(() => { const o = document.querySelector('#tu-cach'); o.value = [...o.options].find((x) => x.textContent.includes('Sunrise')).value; o.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
      assert.match(await p.ev(txt("#ben-dat-chi-doc")), /Bên đặt: Khách sạn Sunrise/);
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      await shotFull(p, `tu-cach-tao-don-${hau}.png`);
      await axe(p, `Tạo đơn ${hau}`);
      await p.send("Page.reload");
      await p.waitFor(`!!document.querySelector('#tu-cach')`, "ô Tư cách sau tải lại", 15000);
      assert.match(await p.ev(txt("#ben-dat-chi-doc")), /Bên đặt: Khách sạn Sunrise/, "nhớ lựa chọn cuối");
    });
    await b.step(`${hau}-1b`, `${hau}: lập đơn theo tư cách Sunrise ⇒ trang đơn ghi bên đặt là Sunrise`, async () => {
      const r = await fetchTrang(p, "POST", "/api/orders", {
        customerName: "Khách Thử", customerPhone: "0912345678", tuCach: org,
        services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, departDate: vnDate(3) }],
      });
      assert.equal(r.status, 201, r.text);
      donId = r.json.order.id;
      assert.equal(sql(`SELECT booker_party_id AS b FROM orders WHERE id = '${donId}'`)[0].b, org);
      await p.send("Page.navigate", { url: env.base + `/order?id=${donId}` });
      await p.waitFor(`document.body.innerText.includes('Khách sạn Sunrise')`, "trang đơn ghi Sunrise", 15000);
      await shotFull(p, `tu-cach-trang-don-${hau}.png`);
    });
    p.close();
  }

  for (const [khung, hau] of [[MOB, "390"], [RONG, "1280"]]) {
    let p = await env.as(NAM, "/account", khung);
    await b.step(`${hau}-2`, `${hau}: Trang Tôi › «Hồ sơ tổ chức» ⇒ màn người quản lý; «Chuyển quyền quản lý» cho chị Lan ⇒ yêu cầu chờ${axeNote()}`, async () => {
      await p.waitFor(`document.querySelector('#to-chuc-cua-toi') && !document.querySelector('#to-chuc-cua-toi').hidden`, "mục Hồ sơ tổ chức", 15000);
      await p.send("Page.navigate", { url: env.base + `/to-chuc?id=${org}` });
      await p.waitFor(`!!document.querySelector('[data-chuyen]')`, "danh sách thành viên", 15000);
      assert.match(await p.ev(txt("#tc-tv")), /Chị Lan Thử/);
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      await shotFull(p, `to-chuc-nguoi-quan-ly-${hau}.png`);
      await axe(p, `màn tổ chức ${hau}`);
      if (hau === "390") {
        await p.ev(click("[data-chuyen]"));
        await p.waitFor(`!!document.querySelector('.btn-danger')`, "hộp hỏi lại", 8000);
        await p.ev(click(".btn-danger"));
        await p.waitFor(`!!document.querySelector('#tc-yeu-cau')`, "yêu cầu đang chờ", 15000);
        assert.equal(sql(`SELECT count(*) AS n FROM pty_org_transfer_request WHERE org_party_id = '${org}' AND status = 'MO'`)[0].n, 1);
      }
    });
    p.close();
  }

  for (const [khung, hau] of [[MOB, "390"], [RONG, "1280"]]) {
    let p = await env.as(CHU, `/parties?id=${org}`, khung);
    await b.step(`${hau}-3`, `${hau}: Danh bạ — khối «Người quản lý tổ chức»; không có nút «Kết thúc» ở quan hệ tổ chức${hau === "1280" ? "; chuyển quyền cho chị Lan" : ""}${axeNote()}`, async () => {
      await p.waitFor(`!!document.querySelector('#tc-vp-ql')`, "khối người quản lý", 15000);
      assert.match(await p.ev(txt("#tc-vp-ql")), /Anh Nam Thử/);
      assert.ok(await p.ev(`!!document.querySelector('[data-yeu-cau]')`), "thấy yêu cầu chuyển đang chờ");
      assert.equal(await p.ev(`[...document.querySelectorAll('#detail tr')].filter((r) => /Người quản lý của|Thành viên của/.test(r.innerText) && [...r.querySelectorAll('button')].some((x) => x.textContent.trim() === 'Kết thúc')).length`), 0, "không nút Kết thúc ở quan hệ tổ chức");
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      await shotFull(p, `danh-ba-to-chuc-${hau}.png`);
      await axe(p, `Danh bạ tổ chức ${hau}`);
      if (hau === "1280") {
        await p.ev(typeInto("#tc-vp-tim", "Lan"));
        await p.waitFor(`document.querySelectorAll('#tc-vp-chon option').length > 0`, "kết quả tìm", 10000);
        await p.ev(`(() => { const o = document.querySelector('#tc-vp-chon'); o.value = [...o.options].find((x) => x.textContent.includes('Lan')).value; return true; })()`);
        await p.ev(`(() => { const o = document.querySelector('#tc-vp-ly-do'); o.value = 'THEO_YEU_CAU_TO_CHUC'; return true; })()`);
        await p.ev(click("#tc-vp-giao"));
        const nutXacNhan = `(() => { const b = [...document.querySelectorAll('.btn-danger')].find((x) => x.textContent.trim() === 'Chuyển quyền quản lý' && x.getClientRects().length > 0); if (!b) return false; b.click(); return true; })()`;
        await p.waitFor(nutXacNhan.replace("b.click(); return true;", "return true;"), "hộp hỏi lại", 8000);
        await p.ev(nutXacNhan);
        await p.waitFor(`(document.querySelector('#tc-vp-ql')?.innerText ?? '').includes('Chị Lan Thử') || [...document.querySelectorAll('#to-chuc-van-phong .alert')].some((x) => !x.hidden && x.innerText)`, "kết quả lệnh chuyển", 15000);
        const loiChuyen = await p.ev(`[...document.querySelectorAll('#to-chuc-van-phong .alert')].filter((x) => !x.hidden).map((x) => x.innerText).join(' | ')`);
        assert.match(await p.ev(txt("#tc-vp-ql")), /Chị Lan Thử/, `người quản lý mới (câu báo: ${loiChuyen})`);
        assert.equal(sql(`SELECT count(*) AS n FROM v_pty_org_link WHERE org_party_id = '${org}' AND kind = 'MANAGER'`)[0].n, 1);
        assert.equal(sql(`SELECT person_party_id AS p FROM v_pty_org_link WHERE org_party_id = '${org}' AND kind = 'MANAGER'`)[0].p, pLan);
        await shotFull(p, `danh-ba-da-chuyen-${hau}.png`);
      }
    });
    p.close();
  }

  const p = await env.as(NAM, `/to-chuc?id=${org}`, RONG);
  await b.step("4", "Anh Nam không còn là người quản lý ⇒ màn tổ chức báo bằng câu tiếng Việt", async () => {
    await p.waitFor(`(document.querySelector('#error')?.innerText ?? '').length > 0`, "câu báo", 15000);
    assert.match(await p.ev(txt("#error")), /Chỉ người quản lý của tổ chức/);
    await sleep(200);
  });
  p.close();
} finally {
  b.xong();
  await env.stop();
}
