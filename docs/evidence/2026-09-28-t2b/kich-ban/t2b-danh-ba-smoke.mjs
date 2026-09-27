// Kịch bản Chrome T2b — Danh bạ và HỒ SƠ CÔNG TY CHỦ (ADR-0024 điều 6, 6.4, 6.5; câu trả lời của chủ dự án 2026-09-28 "cho Super Admin đổi").
// Chỉ phần mà hàng rào mới BẮT BUỘC (chỉ đạo D7 + D12, nhật ký thi công docs/superpowers/plans/2026-09-28-t2b-thi-cong-nhat-ky.md):
//   A  Quản trị: hồ sơ công ty chủ không có nút sửa; ô "Công việc" không có "Công ty chủ" (cả trên hồ sơ tổ chức khác); bấm "Kết thúc" dòng "Công ty chủ"
//      → báo tiếng Việt (403), không chữ "Toàn quyền", không mã thô
//   B  Người giữ ô company.legal.write (tài khoản CHỈ có quyền Toàn quyền — Ruling T7): hồ sơ công ty chủ sửa được; "Kết thúc" dòng "Công ty chủ" → câu
//      tiếng Việt chỉ cách đổi (409); lựa chọn "Công ty chủ" KHÔNG có trên hồ sơ cá nhân, KHÔNG có trên chính công ty chủ, CÓ trên hồ sơ tổ chức khác;
//      chọn + bấm "Thêm công việc" → câu xác nhận ("Trang đăng nhập và biên nhận…"), rồi ĐỔI thật trên D1 tạm (trigger đổi của migration chạy trên D1)
//      → đúng một công ty chủ, là hồ sơ mới; GET /api/company trả hồ sơ mới
// Dùng lại môi trường A2 (D1 tạm + wrangler dev + Chrome headless qua CDP). Các trang dùng CHUNG kho cookie — mỗi tài khoản làm xong mới mở tài khoản sau;
// tài khoản đổi công ty chủ mở SAU CÙNG. Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-28-t2b/kich-ban/t2b-danh-ba-smoke.mjs
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { insertStaffSql } from "../../../../scripts/staff-lib.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-28-t2b";
const AXE = readFileSync(process.env.AXE_JS, "utf8");
mkdirSync(join(OUT, "anh"), { recursive: true });
const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
/** Tài khoản CHỈ giữ quyền Toàn quyền (SĐT giả của kịch bản) — chỉ tồn tại trong D1 tạm. */
const CHU = { name: "Chủ Chrome", phone: "0900000299", pin: "135791", permissions: ["SUPER_ADMIN"] };
const TEN_CT = "Công ty TNHH Tour Đảo"; // tên gọi gieo ở migration (chân trang đăng nhập đang hiện đúng chữ này)
const TEN_TC = "Pháp nhân Chrome";
const TEN_CN = "Nguyễn Chrome Cá Nhân";

const OPTIONS = `[...([...document.querySelectorAll('#detail h3')].find((h) => h.textContent.trim() === 'Công việc tại đâu').nextElementSibling.nextElementSibling.querySelector('select')?.options ?? [])].map((o) => o.textContent.trim())`;
const ROW_CTC = `[...document.querySelectorAll('#detail table.items tr')].find((tr) => tr.textContent.includes('Công ty chủ') && !tr.classList.contains('row-off'))`;
const NUT = (chu) => `[...document.querySelectorAll('#detail button')].some((b) => b.textContent.trim() === ${JSON.stringify(chu)})`;
const openOwner = (env) => env.sql("SELECT r.party_id, p.display_name FROM pty_party_role r JOIN pty_party p ON p.id = r.party_id WHERE r.role_type_code = 'OWNER_COMPANY' AND r.valid_to_date IS NULL");

const env = await startEnv();
try {
  for (const cau of (await insertStaffSql(CHU)).split("\n")) env.sql(cau);
  const axe = async (p, label) => {
    if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
    const v = await p.ev(`axe.run(document).then((r) => r.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious').map((x) => x.id))`);
    assert.deepEqual(v, [], `axe (${label}): ${JSON.stringify(v)}`);
  };
  async function moHoSo(p, ten) {
    await p.ev(setInput("document.querySelector('#q')", ten));
    await p.ev("document.querySelector('#search-form').requestSubmit(), true");
    await p.waitFor(`[...document.querySelectorAll('#list tr')].some((tr) => tr.textContent.includes(${JSON.stringify(ten)}))`, `danh sách có "${ten}"`);
    await p.ev(`[...document.querySelectorAll('#list tr')].find((tr) => tr.textContent.includes(${JSON.stringify(ten)})).click(), true`);
    await p.waitFor(`!document.querySelector('#detail').hidden && (document.querySelector('#detail h2')?.textContent ?? '').includes(${JSON.stringify(ten)})`, `hồ sơ "${ten}" mở`);
  }
  async function loiSau(p, bieuThucBam) {
    await p.ev(`document.querySelector('#error').hidden = true, true`);
    await p.ev(`${bieuThucBam}, true`);
    await p.waitFor(`!document.querySelector('#error').hidden && document.querySelector('#error').textContent.trim().length > 0`, "báo lỗi hiện");
    return p.ev(`document.querySelector('#error').textContent.trim()`);
  }

  // ---- A. Quản trị (máy tính)
  let p = await env.as(ACCOUNTS.admin, "/parties", DESK);
  await p.waitFor(`!!document.querySelector('#search-form')`, "trang Danh bạ dựng xong");
  // hồ sơ để thử: một tổ chức ĐỦ thông tin biên nhận (số giả) và một cá nhân — tạo qua API bằng chính phiên Quản trị
  const taoTC = await p.ev(`fetch('/api/parties', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'ORGANIZATION', displayName: ${JSON.stringify(TEN_TC)}, legalName: 'CÔNG TY PHÁP NHÂN CHROME', taxCode: '0312345678', address: '3 Đường Chrome' }) }).then((r) => r.json()).then((b) => b.party.id)`);
  assert.equal(await p.ev(`fetch('/api/parties/${taoTC}/contacts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'PHONE', value: '0901 234 567', label: 'Hotline', isPrimary: true }) }).then((r) => r.status)`), 201);
  assert.equal(await p.ev(`fetch('/api/parties', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'PERSON', fullName: ${JSON.stringify(TEN_CN)} }) }).then((r) => r.status)`), 201);
  await moHoSo(p, TEN_CT);
  assert.equal(await p.ev(NUT("Lưu thông tin")), false, "Quản trị không thấy nút sửa hồ sơ công ty chủ");
  assert.equal(await p.ev(NUT("Thêm liên hệ")), false, "Quản trị không thấy nút thêm liên hệ");
  assert.ok(!(await p.ev(OPTIONS)).includes("Công ty chủ"), "ô Công việc của Quản trị không có 'Công ty chủ'");
  assert.equal(await p.ev(`!!${ROW_CTC}`), true, "dòng 'Công ty chủ' hiện trong danh sách công việc");
  let loi = await loiSau(p, `${ROW_CTC}.querySelector('button').click()`);
  assert.match(loi, /người phụ trách hệ thống/, `câu báo (403): ${loi}`);
  assert.doesNotMatch(loi, /Toàn quyền|SQLITE|constraint|forbidden|owner_company/i, `câu báo (403): ${loi}`);
  await p.shot(join(OUT, "anh", "t2b-quan-tri-cong-ty-chu-1040.png"));
  await axe(p, "Quản trị — hồ sơ công ty chủ");
  await moHoSo(p, TEN_TC);
  assert.ok(!(await p.ev(OPTIONS)).includes("Công ty chủ"), "Quản trị: hồ sơ tổ chức khác cũng không có 'Công ty chủ'");
  assert.deepEqual(p.consoleErrors, [], `lỗi console (Quản trị): ${p.consoleErrors}`);
  p.close();
  assert.deepEqual(openOwner(env).map((r) => r.display_name), [TEN_CT], "Quản trị không đổi được gì");
  ok("A. Quản trị: không nút sửa, không có lựa chọn 'Công ty chủ', 'Kết thúc' bị từ chối bằng câu tiếng Việt (không 'Toàn quyền', không mã thô), axe sạch");

  // ---- B. Người giữ ô company.legal.write (chỉ quyền Toàn quyền) — mở SAU CÙNG
  p = await env.as(CHU, "/parties", DESK);
  await p.waitFor(`!!document.querySelector('#search-form')`, "trang Danh bạ dựng xong");
  await moHoSo(p, TEN_CT);
  assert.equal(await p.ev(NUT("Lưu thông tin")), true, "người giữ ô sửa được hồ sơ công ty chủ");
  assert.ok(!(await p.ev(OPTIONS)).includes("Công ty chủ"), "chính công ty chủ: không có lựa chọn 'Công ty chủ'");
  loi = await loiSau(p, `${ROW_CTC}.querySelector('button').click()`);
  assert.match(loi, /Muốn đổi thì gán “Công ty chủ” cho hồ sơ tổ chức khác/, `câu báo (409): ${loi}`);
  assert.doesNotMatch(loi, /Toàn quyền|SQLITE|constraint|owner_company/i, `câu báo (409): ${loi}`);
  assert.deepEqual(openOwner(env).map((r) => r.display_name), [TEN_CT], "kết thúc bị từ chối: vẫn đúng một công ty chủ");
  await moHoSo(p, TEN_CN);
  assert.ok(!(await p.ev(OPTIONS)).includes("Công ty chủ"), "hồ sơ cá nhân: không có lựa chọn 'Công ty chủ'");
  await moHoSo(p, TEN_TC);
  assert.ok((await p.ev(OPTIONS)).includes("Công ty chủ"), "hồ sơ tổ chức khác: CÓ lựa chọn 'Công ty chủ'");
  await p.ev(`(() => { const s = [...document.querySelectorAll('#detail h3')].find((h) => h.textContent.trim() === 'Công việc tại đâu').nextElementSibling.nextElementSibling.querySelector('select'); s.value = 'OWNER_COMPANY'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await p.shot(join(OUT, "anh", "t2b-doi-cong-ty-chu-chon-1040.png"));
  await p.ev(`window.__xacNhan = null; window.confirm = (m) => { window.__xacNhan = m; return true; }; true`);
  await p.ev(`[...document.querySelectorAll('#detail button')].find((b) => b.textContent.trim() === 'Thêm công việc').click(), true`);
  await p.waitFor(`!!${ROW_CTC}`, "hồ sơ mới hiện dòng 'Công ty chủ'");
  const xacNhan = await p.ev("window.__xacNhan");
  assert.match(xacNhan ?? "", /Trang đăng nhập và biên nhận sẽ dùng thông tin của hồ sơ này/, `câu xác nhận: ${xacNhan}`);
  assert.doesNotMatch(xacNhan ?? "", /Toàn quyền/);
  assert.deepEqual(openOwner(env).map((r) => r.party_id), [taoTC], "đổi trên D1: đúng một công ty chủ, là hồ sơ mới (trigger đổi của migration)");
  const congTy = await p.ev(`fetch('/api/company').then((r) => r.json())`);
  assert.equal(congTy.company.name, "CÔNG TY PHÁP NHÂN CHROME", "biên nhận đọc hồ sơ mới");
  await p.shot(join(OUT, "anh", "t2b-doi-cong-ty-chu-xong-1040.png"));
  await axe(p, "Toàn quyền — sau khi đổi");
  assert.deepEqual(p.consoleErrors, [], `lỗi console (đổi): ${p.consoleErrors}`);
  p.close();
  p = await env.as(CHU, "/parties", MOB);
  await p.waitFor(`!!document.querySelector('#search-form')`, "trang Danh bạ (điện thoại)");
  await p.ev(setInput("document.querySelector('#q')", TEN_TC));
  await p.ev("document.querySelector('#search-form').requestSubmit(), true");
  await p.waitFor(`[...document.querySelectorAll('.card-list .card')].some((c) => c.textContent.includes(${JSON.stringify(TEN_TC)}))`, "thẻ hồ sơ mới (điện thoại)");
  await p.ev(`[...document.querySelectorAll('.card-list .card')].find((c) => c.textContent.includes(${JSON.stringify(TEN_TC)})).click(), true`);
  await p.waitFor(`!document.querySelector('#detail').hidden && !!${ROW_CTC}`, "hồ sơ mới mở (điện thoại)");
  await p.shot(join(OUT, "anh", "t2b-cong-ty-chu-moi-390.png"));
  await axe(p, "Toàn quyền — điện thoại");
  assert.deepEqual(p.consoleErrors, [], `lỗi console (điện thoại): ${p.consoleErrors}`);
  p.close();
  ok("B. Người giữ ô: sửa được, 'Kết thúc' → câu chỉ cách đổi, lựa chọn 'Công ty chủ' chỉ trên hồ sơ tổ chức khác, câu xác nhận đúng, đổi thật trên D1, biên nhận đọc hồ sơ mới, axe sạch (1040 + 390)");
} finally {
  await env.stop();
}
console.log("T2B DANH BA SMOKE OK");
