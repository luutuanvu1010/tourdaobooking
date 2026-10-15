// Kịch bản Chrome — trang Hỗ trợ theo nhóm (Vé hỗ trợ đợt 1, ADR-0119, Việc 7 của docs/superpowers/plans/2026-10-15-ve-ho-tro-dot-1.md).
//   0. Dữ liệu dựng bằng API TRƯỚC khi mở trang (luật một máy ADR-0075): Toàn quyền thêm Kế toán vào nhóm Kế toán; thêm một tài khoản chỉ Đối tác.
//   1. Bán hàng (1040): menu ghi «Hỗ trợ»; form có ô «Gửi tới nhóm» (4 nhóm, mặc định Kỹ thuật, có dòng mô tả); KHÔNG có tab «Hàng đợi nhóm»;
//      gửi tới Kế toán → mở luồng, phụ đề có «Kế toán»; không có nút đổi trạng thái, không có ô ghi chú nội bộ.
//   2. Kế toán (1040): có tab «Hàng đợi nhóm», KHÔNG có «Quản lý nhóm»; lời gọi hàng đợi không mang `status=` rỗng; phiếu có «Chưa ai nhận» + «Nhận việc»;
//      bấm → «Người xử lý: Kế Toán» (máy chủ tự chuyển Mới → Đã tiếp nhận); lọc «Chưa ai nhận» → rỗng; mở luồng → «Đang xử lý» gọi PATCH …/xu-ly (KHÔNG gọi tuyến cũ PATCH /api/feedback/:id);
//      ghi một ghi chú nội bộ và một trả lời.
//   3. Bán hàng (390): thấy «Đang xử lý», thấy trả lời, KHÔNG thấy ghi chú nội bộ; không tràn ngang; ô gõ ≥ 16px; axe.
//   4. Bán hàng Hai (ngoài nhóm): mở thẳng phiếu → báo lỗi, không có tiêu đề phiếu.
//   5. Đối tác (390): ô «Gửi tới nhóm» ẩn (chỉ một nhóm Kỹ thuật).
//   6. Toàn quyền (1040 + 390): tab «Quản lý nhóm»: 4 nhóm; Kế toán có thành viên «Kế Toán»; Kỹ thuật không có nút «Ngưng»; axe ở 390.
// Mỗi bước dùng phiên riêng qua env.as và đóng trang trước khi mở trang kế (các trang dùng CHUNG kho cookie, CLAUDE.md §10).
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài; D1 tạm):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh [OUT=<thư mục ảnh>] node docs/evidence/2026-10-15-ve-ho-tro/kich-ban/ve-ho-tro-smoke.mjs
// Thiếu AXE_JS: chạy hết nhưng BỎ QUA kiểm màu (in rõ dòng «bỏ qua kiểm màu») — khi đó KHÔNG coi là xanh đầy đủ.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, setInput, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-15-ve-ho-tro/anh");
mkdirSync(OUT, { recursive: true });
const AXE = process.env.AXE_JS ? readFileSync(process.env.AXE_JS, "utf8") : null;
const KE_TOAN = "fbk-team-ke-toan";
const KY_THUAT = "fbk-team-ky-thuat";
const DOI_TAC = { name: "Đối Tác Hỗ Trợ", phone: "0900000391", pin: "135791", permissions: ["PARTNER"] };

const env = await startEnv();
let loi = 0;
try {
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const stmt of (await insertStaffSql(DOI_TAC)).split("\n")) env.sql(stmt);

  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { cookie: `${c.name}=${c.value}`, origin: env.base, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const khungThat = (p, vp) => p.waitFor(vp.mobile ? "document.querySelectorAll('#tabbar .tab').length > 0 && !document.querySelector('#tabbar[data-khung-tam]')" : "document.querySelectorAll('#sidebar .sidebar-item').length > 0 && !document.querySelector('#sidebar[data-khung-tam]')", "khung thật");
  const tabs = (p) => p.ev("[...document.querySelectorAll('#tabs [data-tab]')].map((b) => b.textContent.trim())");
  const axe = async (p, label) => {
    if (!AXE) return console.log(`… bỏ qua kiểm màu (axe) ở ${label}: thiếu AXE_JS`);
    if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
    // Tắt đúng một luật `meta-viewport` như mọi kịch bản Chrome của Nền tảng (thẻ viewport tắt phóng to theo thiết kế PWA — so-dai-ly-smoke.mjs, qr-chung.mjs).
    const v = await p.ev("axe.run(document, { rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help })))");
    const bad = v.filter((x) => x.impact === "serious" || x.impact === "critical");
    assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
  };
  const khoMay = async (p, label) => {
    const m = await p.ev("({ rong: document.documentElement.scrollWidth, nho: [...document.querySelectorAll('main input:not([type=checkbox]), main select, main textarea')].filter((e) => e.offsetParent !== null && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.id || e.tagName) })");
    assert.ok(m.rong <= 390, `${label}: tràn ngang ${m.rong}`);
    assert.deepEqual(m.nho, [], `${label}: ô gõ dưới 16px`);
  };

  // ---- 0. dữ liệu
  const ds = await call(ACCOUNTS.chu, "GET", "/api/staff");
  assert.equal(ds.status, 200, "0. Toàn quyền đọc danh sách tài khoản");
  const idKeToan = ds.json.staff.find((s) => s.phone === ACCOUNTS.accounting.phone).id;
  const them = await call(ACCOUNTS.chu, "PUT", `/api/feedback/admin/teams/${KE_TOAN}/members/${idKeToan}`, { role: "MEMBER" });
  assert.equal(them.status, 200, `0. thêm Kế toán vào nhóm: ${JSON.stringify(them.json)}`);
  ok("0. Kế toán là thành viên nhóm Kế toán; có thêm một tài khoản chỉ Đối tác");

  // ---- 1. Bán hàng gửi tới Kế toán
  let p = await env.as(ACCOUNTS.salesA, "/feedback?new=1&from=%2Forders", DESK);
  await khungThat(p, DESK);
  await p.waitFor("document.querySelectorAll('#new-team option').length === 4 && !document.getElementById('new-card').hidden", "1. form mở, 4 nhóm");
  const nav = await p.ev("[...document.querySelectorAll('#sidebar .sidebar-item-label')].map((e) => e.textContent.trim())");
  assert.ok(nav.includes("Hỗ trợ") && !nav.includes("Góp ý / Báo lỗi"), `1. menu ghi «Hỗ trợ»: ${JSON.stringify(nav)}`);
  assert.equal(await p.ev("document.querySelector('h1').textContent"), "Hỗ trợ", "1. tiêu đề trang");
  assert.equal(await p.ev("document.getElementById('new-team-label').hidden"), false, "1. ô chọn nhóm hiện");
  assert.equal(await p.ev("document.getElementById('new-team').value"), KY_THUAT, "1. mặc định Kỹ thuật");
  assert.deepEqual(await tabs(p), ["Yêu cầu của tôi"], "1. Bán hàng không có tab hàng đợi / quản lý");
  await p.ev(setInput("document.getElementById('new-team')", KE_TOAN));
  assert.ok((await p.ev("document.getElementById('new-team-hint').textContent")).length > 0, "1. dòng mô tả nhóm hiện");
  await p.ev(setInput("document.getElementById('new-title')", "Hỏi công nợ tháng 9"));
  await p.ev(setInput("document.getElementById('new-body')", "Công nợ đại lý A lệch so với sổ."));
  await p.shot(join(OUT, "01-ban-hang-form-1040.png"));
  await p.ev("document.getElementById('new-submit').click()");
  await p.waitFor("location.search.includes('id=') && !!document.querySelector('#thread h2')", "1. mở luồng sau khi gửi", 10000);
  const ticketId = new URLSearchParams(await p.ev("location.search")).get("id");
  const goi = p.requests.find((r) => r.method === "POST" && r.url.endsWith("/api/feedback"));
  assert.equal(JSON.parse(goi.postData).teamId, KE_TOAN, "1. thân gửi có teamId Kế toán");
  const phuDe = await p.ev("document.querySelector('#thread h2 + p').textContent");
  assert.ok(phuDe.startsWith("Kế toán"), `1. phụ đề có tên nhóm: ${phuDe}`);
  assert.equal(await p.ev("document.querySelectorAll('#thread [data-to]').length"), 0, "1. người gửi không có nút đổi trạng thái");
  assert.equal(await p.ev("document.querySelectorAll('#thread input[type=checkbox]').length"), 0, "1. người gửi không có ô ghi chú nội bộ");
  assert.deepEqual(p.consoleErrors, [], "1. không lỗi JS");
  p.close();
  ok(`1. Bán hàng: menu «Hỗ trợ»; chọn Kế toán, gửi → luồng «${phuDe}»; không nút xử lý, không ô ghi chú nội bộ`);

  // ---- 2. Kế toán: hàng đợi, nhận việc, tiếp nhận, ghi chú nội bộ + trả lời
  p = await env.as(ACCOUNTS.accounting, "/feedback", DESK);
  await p.waitFor("document.querySelectorAll('#tabs [data-tab]').length > 0", "2. tab dựng xong");
  assert.deepEqual(await tabs(p), ["Yêu cầu của tôi", "Hàng đợi nhóm"], "2. Kế toán có hàng đợi, không quản lý nhóm");
  await p.ev("document.querySelector('#tabs [data-tab=queue]').click()");
  await p.waitFor(`!!document.querySelector('#list [data-ticket="${ticketId}"]')`, "2. phiếu có ở hàng đợi");
  const goiHangDoi = p.requests.filter((r) => r.url.includes("/api/feedback/queue")).map((r) => r.url);
  assert.ok(goiHangDoi.length > 0 && goiHangDoi.every((u) => !/[?&]status=(&|$)/.test(u)), `2. không gửi status rỗng: ${JSON.stringify(goiHangDoi)}`);
  const dong = `document.querySelector('#list [data-ticket="${ticketId}"]')`;
  assert.ok((await p.ev(`${dong}.textContent`)).includes("Chưa ai nhận"), "2. nhãn «Chưa ai nhận»");
  await p.shot(join(OUT, "02-ke-toan-hang-doi-1040.png"));
  await p.ev(`${dong}.querySelector('[data-nhan-viec]').click()`);
  await p.waitFor(`${dong} && ${dong}.textContent.includes('Người xử lý: Kế Toán') && !${dong}.querySelector('[data-nhan-viec]')`, "2. đã nhận việc");
  await p.ev("document.querySelector('[data-loc=UNASSIGNED]').click()");
  await p.waitFor(`document.querySelector('[data-loc=UNASSIGNED]').getAttribute('aria-pressed') === 'true' && !document.querySelector('#list [data-ticket="${ticketId}"]')`, "2. lọc Chưa ai nhận → phiếu biến mất");
  p.close();
  p = await env.as(ACCOUNTS.accounting, `/feedback?id=${ticketId}`, DESK);
  // Nhận việc tự chuyển Mới → Đã tiếp nhận (máy chủ, claimStatement); bước kế: Đang xử lý.
  await p.waitFor("document.querySelector('#thread .fb-status-nhan')?.textContent.includes('Đã tiếp nhận') && !!document.querySelector('#thread [data-to=IN_PROGRESS]')", "2. đã tiếp nhận, có nút sang Đang xử lý");
  assert.ok((await p.ev("document.getElementById('fb-nguoi-xu-ly').textContent")).includes("Người xử lý: Kế Toán"), "2. khối người xử lý");
  await p.ev("document.querySelector('#thread [data-to=IN_PROGRESS]').click()");
  await p.waitFor("document.querySelector('#thread .fb-status-nhan').textContent.includes('Đang xử lý')", "2. đang xử lý");
  const patch = p.requests.filter((r) => r.method === "PATCH").map((r) => new URL(r.url).pathname);
  assert.deepEqual(patch, [`/api/feedback/${ticketId}/xu-ly`], "2. đổi trạng thái đi tuyến /xu-ly, không đi tuyến cũ");
  await p.ev(setInput("document.querySelector('#thread textarea')", "Ghi chú: kiểm sổ trước"));
  await p.ev("(() => { document.querySelector('#thread input[type=checkbox]').checked = true; return true; })()");
  await p.ev("[...document.querySelectorAll('#thread button')].find((b) => b.textContent.trim() === 'Gửi').click()");
  await p.waitFor("[...document.querySelectorAll('#thread .card')].some((c) => c.textContent.includes('Ghi chú: kiểm sổ trước'))", "2. ghi chú nội bộ đã ghi");
  await p.ev(setInput("document.querySelector('#thread textarea')", "Đã nhận, sẽ đối chiếu trong hôm nay."));
  await p.ev("[...document.querySelectorAll('#thread button')].find((b) => b.textContent.trim() === 'Gửi').click()");
  await p.waitFor("[...document.querySelectorAll('#thread .card')].some((c) => c.textContent.includes('sẽ đối chiếu'))", "2. trả lời đã ghi");
  assert.equal(await p.ev("!!document.getElementById('fb-chuyen')"), false, "2. thành viên thường không có khối Chuyển nhóm");
  await p.shot(join(OUT, "03-ke-toan-luong-1040.png"));
  assert.deepEqual(p.consoleErrors, [], "2. không lỗi JS");
  p.close();
  ok("2. Kế toán: hàng đợi nhóm (không status rỗng), Nhận việc → «Người xử lý: Kế Toán», lọc Chưa ai nhận rỗng; nhận việc tự sang Đã tiếp nhận; Đang xử lý qua /xu-ly; ghi chú nội bộ + trả lời");

  // ---- 3. Bán hàng 390: không thấy ghi chú nội bộ
  p = await env.as(ACCOUNTS.salesA, `/feedback?id=${ticketId}`, MOB);
  await p.waitFor("!!document.querySelector('#thread .fb-status-nhan')", "3. luồng dựng xong");
  const tt = await p.ev("({ nhan: document.querySelector('#thread .fb-status-nhan').textContent, chu: document.getElementById('thread').textContent })");
  assert.ok(tt.nhan.includes("Đang xử lý"), `3. trạng thái: ${tt.nhan}`);
  assert.ok(tt.chu.includes("sẽ đối chiếu"), "3. thấy trả lời");
  assert.ok(!tt.chu.includes("kiểm sổ trước") && !tt.chu.includes("Ghi chú nội bộ"), "3. KHÔNG thấy ghi chú nội bộ");
  await khoMay(p, "3. /feedback?id 390");
  await axe(p, "/feedback?id 390 (Bán hàng)");
  await p.shot(join(OUT, "04-ban-hang-luong-390.png"));
  p.close();
  ok("3. Bán hàng (390): «Đang xử lý», thấy trả lời, không thấy ghi chú nội bộ; không tràn ngang, ô gõ ≥ 16px");

  // ---- 4. người ngoài nhóm
  p = await env.as(ACCOUNTS.salesB, `/feedback?id=${ticketId}`, DESK);
  await p.waitFor("!!document.getElementById('fb-loi-mo')?.textContent.trim()", "4. câu báo không mở được hiện trong khung luồng");
  assert.equal(await p.ev("!!document.querySelector('#thread h2')"), false, "4. không có tiêu đề phiếu");
  assert.ok(!(await p.ev("document.body.textContent")).includes("Hỏi công nợ tháng 9"), "4. không lộ tiêu đề phiếu ở đâu trên trang");
  p.close();
  ok("4. Bán hàng Hai (ngoài nhóm): mở thẳng phiếu → báo lỗi, không lộ tiêu đề");

  // ---- 5. Đối tác: không có ô chọn nhóm
  p = await env.as(DOI_TAC, "/feedback?new=1", MOB);
  await p.waitFor("!document.getElementById('new-card').hidden", "5. form mở");
  assert.equal(await p.ev("document.getElementById('new-team-label').hidden"), true, "5. ô «Gửi tới nhóm» ẩn với tài khoản bên ngoài");
  assert.equal(await p.ev("document.querySelectorAll('#new-team option').length"), 1, "5. chỉ một nhóm");
  p.close();
  ok("5. Đối tác: ô «Gửi tới nhóm» ẩn (chỉ nhóm Kỹ thuật)");

  // ---- 6. Toàn quyền: quản lý nhóm
  for (const vp of [DESK, MOB]) {
    p = await env.as(ACCOUNTS.chu, "/feedback", vp);
    await p.waitFor("document.querySelectorAll('#tabs [data-tab]').length > 0", "6. tab dựng xong");
    assert.deepEqual(await tabs(p), ["Yêu cầu của tôi", "Hàng đợi nhóm", "Quản lý nhóm"], "6. Toàn quyền có đủ ba tab");
    await p.ev("document.querySelector('#tabs [data-tab=teams]').click()");
    await p.waitFor("document.querySelectorAll('#list [data-team]').length === 4", "6. bốn nhóm");
    const kt = await p.ev(`document.querySelector('#list [data-team="${KE_TOAN}"]').textContent`);
    assert.ok(kt.includes("Kế Toán") && kt.includes("Thành viên") && kt.includes("Nhạy cảm"), `6. thẻ Kế toán: ${kt.slice(0, 200)}`);
    const nutKyThuat = await p.ev(`[...document.querySelectorAll('#list [data-team="${KY_THUAT}"] button')].map((b) => b.textContent.trim())`);
    assert.ok(!nutKyThuat.includes("Ngưng"), `6. Kỹ thuật không có nút Ngưng: ${JSON.stringify(nutKyThuat)}`);
    if (vp.mobile) {
      await khoMay(p, "6. Quản lý nhóm 390");
      await axe(p, "/feedback Quản lý nhóm 390");
    }
    await p.shot(join(OUT, `05-toan-quyen-quan-ly-nhom-${vp.width}.png`));
    assert.deepEqual(p.consoleErrors, [], "6. không lỗi JS");
    p.close();
  }
  ok("6. Toàn quyền (1040 + 390): ba tab; Quản lý nhóm 4 nhóm, Kế toán có «Kế Toán · Thành viên», Kỹ thuật không có nút Ngưng");
} catch (e) {
  loi = 1;
  console.error(`✗ ${e.message}`);
} finally {
  await env.stop();
}
process.exit(loi);
