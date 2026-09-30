// Kịch bản Chrome (bằng chứng giao diện) cho ADR-0058 Đ4, Đ8 — Task A7 lượt 1: màn Danh mục (/catalog, chỉ Quản trị / Toàn quyền) quản lý nhóm dịch vụ
// theo khuôn có sẵn của web/catalog.ts: khối "Nhóm dịch vụ" đầu trang (thêm, đổi tên, lên / xuống, tắt / bật; 409 hiện đúng câu máy chủ), cột / dòng "Nhóm",
// ô lọc "Nhóm: …" / "Chưa phân loại", chọn nhiều → "Chuyển N dịch vụ" (≤ 50 một lần), hộp "Sửa giá" có ô chọn nhóm + lịch sử nhóm (tên người ghép từ
// GET /api/staff tải MỘT lần; id không còn → "Người dùng cũ"; null → "Hệ thống").
// Dùng lại cơ chế CDP của A2 (startEnv()/ACCOUNTS từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs). startEnv() chèn 3 dịch vụ giả (TD101/TTB03/TTB06) SAU migration gieo
// nhóm nên cả ba ở "Chưa phân loại"; kịch bản chèn thêm 52 dịch vụ NDV01…NDV52 (để thử > 50), một dịch vụ ẨN chưa phân loại ZZH1 (để thấy "kể cả dịch vụ ẩn" — nợ N-2)
// và hai dòng lịch sử nhóm của TD101 (người ghi NULL → "Hệ thống", id không có → "Người dùng cũ").
// Chỉ đụng D1 tạm. Chạy từ GỐC repo (worktree), sau `npm run build:web` (không cần mạng ngoài):
//   node docs/evidence/2026-09-30-nhom-dich-vu/kich-ban/danh-muc-nhom-smoke.mjs
// Ảnh ghi vào $OUT (mặc định docs/evidence/2026-09-30-nhom-dich-vu).
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, setInput, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-30-nhom-dich-vu";
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
const shot = async (p, name, sel) => {
  // Điện thoại: thanh đầu trang dính che mép trên → lùi thêm một khoảng bằng thanh đó.
  if (sel) await p.ev(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: 'start' }); if (innerWidth < 700) scrollBy(0, -72); true`);
  await sleep(200);
  writeFileSync(join(OUT, name), Buffer.from((await p.send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
};

let passed = 0;
async function step(id, name, fn) {
  try {
    await fn();
    passed++;
    console.log(`✓ ${id}) ${name}`);
  } catch (e) {
    console.log(`✗ ${id}) ${name}\n    ${String(e?.message ?? e).split("\n").join("\n    ")}`);
    console.log(`${passed} bước ✓, 1 bước ✗ (dừng ở bước ${id})`);
    throw e;
  }
}

// ---- Biểu thức đọc DOM ----
const DONG = "[...document.querySelectorAll('#nhom-dv .nhom-dong')]";
const tenNhom = `${DONG}.map((d) => d.querySelector('.nhom-ten')?.textContent ?? '')`;
const dongNhom = (ten) => `${DONG}.find((d) => d.querySelector('.nhom-ten')?.textContent === ${JSON.stringify(ten)})`;
const bamNhom = (ten, act) => `(() => { const b = (${dongNhom(ten)}).querySelector('[data-act="${act}"]'); b.click(); return true; })()`;
const soNhom = (ten) => `(${dongNhom(ten)}).querySelector('.nhom-so').textContent`;
const loiNhom = "(() => { const e = document.getElementById('nhom-loi'); return e.hidden ? '' : e.textContent; })()";
const hangBang = "[...document.querySelectorAll('#list tr[data-code]')].map((r) => r.dataset.code)";
const theThe = "[...document.querySelectorAll('#list-cards [data-code].card')].map((r) => r.dataset.code)";
const nhanLoc = "[...document.getElementById('filter').options].map((o) => o.textContent)";
const chonLoc = (value) => `(() => { const s = document.getElementById('filter'); s.value = ${JSON.stringify(value)}; s.dispatchEvent(new Event('change', { bubbles: true })); return s.value === ${JSON.stringify(value)}; })()`;
const khongTranNgang = "document.documentElement.scrollWidth - innerWidth <= 0";
const lichSu = "[...document.querySelectorAll('#nhom-lich-su li')].map((x) => x.textContent)";
const soPut = (p) => p.requests.filter((r) => r.method === "PUT" && r.url.includes("/api/catalog/group-assignments")).length;
// Đếm từ lần tải trang gần nhất (bước 4 tải lại trang — lần tải mới gọi lại /api/staff là đúng).
let mocTai = 0;
const soStaff = (p) => p.requests.slice(mocTai).filter((r) => r.method === "GET" && new URL(r.url).pathname === "/api/staff").length;
/** Vùng bấm (cao, rộng) nhỏ nhất của các phần tử đang hiện khớp `sel`. */
const vungBam = (sel) => `(() => { const r = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.offsetParent !== null).map((e) => e.getBoundingClientRect()); return r.length ? { n: r.length, h: Math.min(...r.map((x) => x.height)), w: Math.min(...r.map((x) => x.width)) } : { n: 0, h: 0, w: 0 }; })()`;
/** Cỡ chữ nhỏ nhất (px) của các phần tử đang hiện khớp `sel`; không có phần tử nào → 0 (để bước kiểm đỏ thay vì đạt suông). */
const coChu = (sel) => `(() => { const a = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.offsetParent !== null).map((e) => parseFloat(getComputedStyle(e).fontSize)); return a.length ? Math.min(...a) : 0; })()`;

const env = await startEnv();
const loiConsole = [];
const dong = (p) => {
  loiConsole.push(...p.consoleErrors.filter((e) => !/favicon/.test(e)));
  p.close();
};
try {
  // ---- Dữ liệu (D1 tạm) ----
  const T = "'2026-01-01T00:00:00.000Z'";
  const ndv = Array.from({ length: 52 }, (_, i) => `NDV${String(i + 1).padStart(2, "0")}`);
  env.sql(`INSERT INTO catalog_item (code,name,unit,price_adult,sheet_row,in_sheet,first_seen_at,updated_at) VALUES ${[...ndv.map((c, i) => `('${c}','Dịch vụ thử ${i + 1}','perPax',${200000 + i * 1000},${10 + i},1,${T},${T})`), `('ZZH1','Dịch vụ ẩn chưa phân loại','perPax',500000,90,1,${T},${T})`].join(",")}`);
  env.sql(`INSERT INTO catalog_override (code,hidden,updated_at) VALUES ('ZZH1',1,${T})`);
  // Lịch sử nhóm của TD101: 30/09 14:05 (giờ VN) Hệ thống gieo "Tour đảo"; 30/09 15:10 một tài khoản không còn trong danh sách đổi sang "Long Phú".
  env.sql(`INSERT INTO ctl_service_group (id,service_code,group_code,seq,valid_from_at,created_at,created_by,updated_at,updated_by) VALUES
    ('ls-td101-1','TD101','TDA',1,'2026-09-30T07:05:00.000Z','2026-09-30T07:05:00.000Z',NULL,'2026-09-30T07:05:00.000Z',NULL),
    ('ls-td101-2','TD101','LPH',2,'2026-09-30T08:10:00.000Z','2026-09-30T08:10:00.000Z','tai-khoan-da-bi-xoa','2026-09-30T08:10:00.000Z','tai-khoan-da-bi-xoa')`);
  const ad = await env.login(ACCOUNTS.admin);
  const apiGet = async (path) => {
    const r = await fetch(`${env.base}${path}`, { headers: { cookie: `${ad.name}=${ad.value}` } });
    assert.equal(r.status, 200, `${path}: ${r.status}`);
    return r.json();
  };
  const nhomApi = () => apiGet("/api/catalog/groups");
  const g0 = await nhomApi();
  assert.equal(g0.groups.length, 14, "14 nhóm gieo");
  // 3 dịch vụ của startEnv + 52 NDV + ZZH1 (ẩn) chưa phân loại; TD101 ở Long Phú → 55.
  assert.equal(g0.chuaPhanLoai, 55, `chuaPhanLoai của máy chủ = 55 (kể cả ZZH1 ẩn) — là ${g0.chuaPhanLoai}`);
  const TEN14 = [...g0.groups].sort((a, b) => a.sortOrder - b.sortOrder).map((g) => g.name);
  console.log(`  (dữ liệu: 52 dịch vụ NDV + ZZH1 ẩn; TD101 có 2 dòng lịch sử nhóm; máy chủ: 14 nhóm, chuaPhanLoai = ${g0.chuaPhanLoai})`);

  // ================= Máy tính 1040 =================
  const d = await env.as(ACCOUNTS.admin, "/catalog", DESK);

  await step("1", "1040: khối 'Nhóm dịch vụ' ở đầu trang — 14 nhóm theo thứ tự, số dịch vụ mỗi nhóm, dòng 'Chưa phân loại (kể cả dịch vụ ẩn): 55 dịch vụ' khớp máy chủ", async () => {
    await d.waitFor("!!document.getElementById('nhom-dv') && document.querySelectorAll('#nhom-dv .nhom-dong').length > 0", "không thấy khối Nhóm dịch vụ", 10000);
    assert.equal(await d.ev("document.querySelector('#nhom-dv h2').textContent"), "Nhóm dịch vụ");
    assert.deepEqual(await d.ev(tenNhom), TEN14, "thứ tự nhóm = sortOrder của máy chủ");
    assert.equal(await d.ev(soNhom("Long Phú")), "1 dịch vụ");
    assert.equal(await d.ev(soNhom("Tour đảo")), "0 dịch vụ");
    assert.equal(await d.ev("document.getElementById('nhom-chua').textContent"), `Chưa phân loại (kể cả dịch vụ ẩn): ${g0.chuaPhanLoai} dịch vụ`);
    await d.waitFor(`${hangBang}.length === 56`, "bảng đủ 56 dịch vụ");
    assert.equal(await d.ev("[...document.querySelectorAll('table.items thead th')].map((t) => t.textContent.trim()).join('|')"), "Chọn|Mã|Dịch vụ|Nhóm|Đơn vị|Người lớn|Trẻ em|Người cao tuổi|Em bé|");
    assert.equal(await d.ev("document.querySelector('#list tr[data-code=\"TD101\"] .nhom-o').textContent"), "Long Phú");
    assert.equal(await d.ev("document.querySelector('#list tr[data-code=\"NDV01\"] .nhom-o').textContent"), "Chưa phân loại");
    assert.ok(await d.ev(khongTranNgang), "1040: không tràn ngang");
  });

  await step("2", "1040: 'Thêm nhóm' → 'Nhóm thử' hiện cuối khối với '0 dịch vụ'; ô lọc có 'Nhóm: Nhóm thử'; tên trùng → câu tiếng Việt của máy chủ", async () => {
    await d.ev("document.getElementById('nhom-them').click(); true");
    await d.waitFor("!!document.getElementById('nhom-ten-moi')", "ô tên nhóm mới");
    await d.ev(setInput("document.getElementById('nhom-ten-moi')", "Tour đảo"));
    await d.ev("document.querySelector('#nhom-dv [data-act=\"luu-moi\"]').click(); true");
    await d.waitFor(`${loiNhom} !== ''`, "báo lỗi tên trùng");
    const loi = await d.ev(loiNhom);
    assert.match(loi, /Tour đảo/, `câu trùng tên của máy chủ: ${loi}`);
    assert.doesNotMatch(loi, /[a-z]+_[a-z]+/, "không lộ mã lỗi thô");
    assert.equal(await d.ev("document.getElementById('nhom-ten-moi').value"), "Tour đảo", "lỗi 409: chữ đã gõ vẫn còn trong ô");
    await d.ev(setInput("document.getElementById('nhom-ten-moi')", "Nhóm thử"));
    await d.ev("document.querySelector('#nhom-dv [data-act=\"luu-moi\"]').click(); true");
    await d.waitFor(`${tenNhom}.at(-1) === 'Nhóm thử'`, "Nhóm thử cuối khối");
    assert.equal(await d.ev(soNhom("Nhóm thử")), "0 dịch vụ");
    assert.equal(await d.ev(loiNhom), "", "hết lỗi sau khi thêm được");
    assert.ok((await d.ev(nhanLoc)).includes("Nhóm: Nhóm thử"), "ô lọc có Nhóm: Nhóm thử");
    assert.ok((await nhomApi()).groups.some((g) => g.name === "Nhóm thử" && g.active), "máy chủ có Nhóm thử");
  });

  await step("3", "1040: 'Đổi tên' Nhóm thử → 'Nhóm kiểm' — khối, ô lọc, máy chủ cùng đổi", async () => {
    await d.ev(bamNhom("Nhóm thử", "doi-ten"));
    await d.waitFor("!!document.querySelector('#nhom-dv .nhom-ten-sua')", "ô đổi tên");
    await d.ev(setInput("document.querySelector('#nhom-dv .nhom-ten-sua')", "Nhóm kiểm"));
    await d.ev("document.querySelector('#nhom-dv [data-act=\"luu-ten\"]').click(); true");
    await d.waitFor(`${tenNhom}.at(-1) === 'Nhóm kiểm'`, "tên mới trong khối");
    assert.ok((await d.ev(nhanLoc)).includes("Nhóm: Nhóm kiểm") && !(await d.ev(nhanLoc)).includes("Nhóm: Nhóm thử"), "ô lọc đổi theo");
    assert.ok((await nhomApi()).groups.some((g) => g.name === "Nhóm kiểm"), "máy chủ đổi tên");
  });

  await step("4", "1040: 'Lên' đưa Nhóm kiểm lên trên Bus — thứ tự đổi, tải lại trang vẫn giữ (máy chủ đổi sortOrder); 'Xuống' của nhóm cuối bị khoá", async () => {
    const truoc = await d.ev(tenNhom);
    const keTren = truoc.at(-2);
    await d.ev(bamNhom("Nhóm kiểm", "len"));
    await d.waitFor(`JSON.stringify(${tenNhom}.slice(-2)) === ${JSON.stringify(JSON.stringify(["Nhóm kiểm", keTren]))}`, "Nhóm kiểm lên một bậc");
    const api = [...(await nhomApi()).groups].sort((a, b) => a.sortOrder - b.sortOrder).map((g) => g.name);
    assert.deepEqual(api.slice(-2), ["Nhóm kiểm", keTren], `máy chủ: ${api.slice(-3)}`);
    mocTai = d.requests.length;
    await d.send("Page.reload", {});
    await sleep(300);
    await d.waitFor(`${DONG}.length === 15`, "khối sau tải lại", 10000);
    assert.deepEqual((await d.ev(tenNhom)).slice(-2), ["Nhóm kiểm", keTren], "tải lại vẫn giữ thứ tự");
    assert.equal(await d.ev(`(${dongNhom(keTren)}).querySelector('[data-act="xuong"]').disabled`), true, "nhóm cuối: Xuống bị khoá");
    assert.equal(await d.ev(`(${dongNhom(TEN14[0])}).querySelector('[data-act="len"]').disabled`), true, "nhóm đầu: Lên bị khoá");
  });

  await step("5", "1040: 'Tắt' Long Phú (còn 1 dịch vụ) → 409, hiện đúng câu máy chủ 'Nhóm còn 1 dịch vụ, chuyển chúng sang nhóm khác trước.'; tắt Nhóm kiểm (rỗng) → 'Đã tắt', rời ô lọc; 'Bật' lại được", async () => {
    await d.ev(bamNhom("Long Phú", "tat"));
    await d.waitFor(`${loiNhom} !== ''`, "báo 409");
    assert.equal(await d.ev(loiNhom), "Nhóm còn 1 dịch vụ, chuyển chúng sang nhóm khác trước.");
    assert.equal(await d.ev(`!!(${dongNhom("Long Phú")}).querySelector('.badge')`), false, "Long Phú vẫn đang dùng");
    await d.ev(bamNhom("Nhóm kiểm", "tat"));
    await d.waitFor(`(${dongNhom("Nhóm kiểm")}).querySelector('.badge')?.textContent === 'Đã tắt'`, "Nhóm kiểm Đã tắt");
    assert.equal(await d.ev(loiNhom), "", "hết lỗi sau thao tác thành công");
    assert.ok(!(await d.ev(nhanLoc)).includes("Nhóm: Nhóm kiểm"), "nhóm tắt rời ô lọc");
    assert.equal(await d.ev(`(${dongNhom("Nhóm kiểm")}).querySelector('[data-act="bat"]').textContent`), "Bật");
    await d.ev(bamNhom("Nhóm kiểm", "bat"));
    await d.waitFor(`!(${dongNhom("Nhóm kiểm")}).querySelector('.badge')`, "Nhóm kiểm bật lại");
    assert.ok((await nhomApi()).groups.find((g) => g.name === "Nhóm kiểm").active, "máy chủ: đang dùng");
  });

  await step("6", "1040: ô lọc 'Nhóm: Long Phú' → chỉ TD101; 'Chưa phân loại' → 55 dịch vụ (kể cả ZZH1 ẩn)", async () => {
    assert.ok(await d.ev(chonLoc("nhom:LPH")), "có lựa chọn nhom:LPH");
    await d.waitFor(`JSON.stringify(${hangBang}) === '["TD101"]'`, "lọc Long Phú");
    assert.ok(await d.ev(chonLoc("nhom:")), "có lựa chọn Chưa phân loại");
    await d.waitFor(`${hangBang}.length === 55`, "lọc Chưa phân loại = 55");
    assert.ok((await d.ev(hangBang)).includes("ZZH1"), "kể cả dịch vụ ẩn");
    assert.ok((await d.ev(nhanLoc)).includes("Chưa phân loại"));
  });

  await step("7", "1040: 'Chọn tất cả đang hiện' (55) → nút báo 'Tối đa 50 dịch vụ một lần', bấm KHÔNG gửi; chọn 3 → 'Chuyển 3 dịch vụ' sang Thể thao biển = đúng MỘT lần PUT, số nhóm cập nhật, bỏ chọn", async () => {
    await d.ev("document.getElementById('chon-het').click(); true");
    await d.waitFor("document.getElementById('chon-dem').textContent === 'Đã chọn 55 dịch vụ'", "đếm 55");
    assert.equal(await d.ev("document.getElementById('chuyen-nut').textContent"), "Tối đa 50 dịch vụ một lần");
    const put0 = soPut(d);
    await d.ev("document.getElementById('chuyen-nut').click(); true");
    await sleep(500);
    assert.equal(soPut(d), put0, "chọn > 50: không gửi PUT");
    await d.ev("document.getElementById('bo-chon').click(); true");
    await d.waitFor("document.getElementById('chon-dem').textContent === ''", "bỏ chọn");
    for (const c of ["NDV01", "NDV02", "NDV03"]) await d.ev(`document.querySelector('#list input.chon-dv[data-code="${c}"]').click(); true`);
    await d.waitFor("document.getElementById('chon-dem').textContent === 'Đã chọn 3 dịch vụ'", "đếm 3");
    assert.equal(await d.ev("document.getElementById('chuyen-nut').textContent"), "Chuyển 3 dịch vụ");
    assert.ok(await d.ev("(() => { const s = document.getElementById('chuyen-nhom'); s.value = 'TTB'; s.dispatchEvent(new Event('change', { bubbles: true })); return s.value === 'TTB'; })()"), "chọn nhóm đích Thể thao biển");
    await d.ev("document.getElementById('chuyen-nut').click(); true");
    await d.waitFor(`${soNhom("Thể thao biển")} === '3 dịch vụ'`, "Thể thao biển 3 dịch vụ", 10000);
    assert.equal(soPut(d), put0 + 1, "đúng một lần PUT");
    const put = d.requests.filter((r) => r.method === "PUT" && r.url.includes("/api/catalog/group-assignments")).at(-1);
    assert.deepEqual(JSON.parse(put.postData), { codes: ["NDV01", "NDV02", "NDV03"], groupCode: "TTB" });
    assert.equal(await d.ev("document.getElementById('notice').textContent"), "Đã chuyển 3 dịch vụ sang nhóm Thể thao biển.");
    assert.equal(await d.ev("document.getElementById('nhom-chua').textContent"), "Chưa phân loại (kể cả dịch vụ ẩn): 52 dịch vụ");
    assert.equal(await d.ev("document.getElementById('chon-dem').textContent"), "", "hết chọn");
    await d.waitFor(`${hangBang}.length === 52`, "lọc Chưa phân loại còn 52");
    assert.equal((await nhomApi()).chuaPhanLoai, 52, "máy chủ 52");
  });

  await step("8", "1040: hộp 'Sửa giá' TD101 — ô 'Nhóm dịch vụ' = Long Phú, lịch sử 'Người dùng cũ' / 'Hệ thống'; đổi sang Hòn Tằm → dòng mới 'Quản Trị: Long Phú → Hòn Tằm'; /api/staff chỉ tải MỘT lần", async () => {
    assert.ok(await d.ev(chonLoc("")), "bỏ lọc");
    await d.waitFor(`${hangBang}.length === 56`, "bảng đủ");
    await d.ev("[...document.querySelectorAll('#list tr[data-code=\"TD101\"] button')].find((b) => b.textContent === 'Sửa giá').click(); true");
    await d.waitFor("!document.getElementById('edit').hidden && !!document.getElementById('sua-nhom')", "hộp sửa có ô nhóm");
    assert.equal(await d.ev("document.getElementById('sua-nhom').value"), "LPH");
    assert.ok(await d.ev("[...document.getElementById('sua-nhom').options].some((o) => o.value === '' && o.textContent === 'Chưa phân loại')"), "ô nhóm có Chưa phân loại");
    await d.waitFor(`${lichSu}.length === 2`, "lịch sử 2 dòng");
    assert.deepEqual(await d.ev(lichSu), ["30/09 15:10 — Người dùng cũ: Tour đảo → Long Phú", "30/09 14:05 — Hệ thống: Chưa phân loại → Tour đảo"]);
    assert.ok(await d.ev("(() => { const s = document.getElementById('sua-nhom'); s.value = 'HTA'; s.dispatchEvent(new Event('change', { bubbles: true })); return s.value === 'HTA'; })()"));
    await d.ev("document.getElementById('sua-nhom-luu').click(); true");
    await d.waitFor(`${lichSu}.length === 3`, "lịch sử 3 dòng", 10000);
    assert.match((await d.ev(lichSu))[0], /^\d\d\/\d\d \d\d:\d\d — Quản Trị: Long Phú → Hòn Tằm$/);
    await d.waitFor("document.querySelector('#list tr[data-code=\"TD101\"] .nhom-o').textContent === 'Hòn Tằm'", "cột Nhóm của TD101 đổi");
    assert.equal(await d.ev(soNhom("Hòn Tằm")), "1 dịch vụ");
    // Route một dịch vụ (PATCH /api/catalog/:code — Ẩn / Hiện lại) trả `item` thay vào danh sách: cột Nhóm phải giữ nhóm thật, không rơi về "Chưa phân loại".
    await d.ev("[...document.querySelectorAll('#list tr[data-code=\"TD101\"] button')].find((b) => b.textContent === 'Ẩn').click(); true");
    await d.waitFor("[...document.querySelectorAll('#list tr[data-code=\"TD101\"] button')].some((b) => b.textContent === 'Hiện lại')", "TD101 đã ẩn");
    assert.equal(await d.ev("document.querySelector('#list tr[data-code=\"TD101\"] .nhom-o').textContent"), "Hòn Tằm", "ẩn xong vẫn đúng nhóm");
    await d.ev("[...document.querySelectorAll('#list tr[data-code=\"TD101\"] button')].find((b) => b.textContent === 'Hiện lại').click(); true");
    await d.waitFor("[...document.querySelectorAll('#list tr[data-code=\"TD101\"] button')].some((b) => b.textContent === 'Ẩn')", "TD101 hiện lại");
    assert.equal(await d.ev("document.querySelector('#list tr[data-code=\"TD101\"] .nhom-o').textContent"), "Hòn Tằm", "hiện lại vẫn đúng nhóm");
    await d.ev(bamNhom("Long Phú", "tat")); // nay rỗng → tắt được
    await d.waitFor(`(${dongNhom("Long Phú")}).querySelector('.badge')?.textContent === 'Đã tắt'`, "Long Phú rỗng → tắt được");
    await d.ev(bamNhom("Long Phú", "bat"));
    await d.waitFor(`!(${dongNhom("Long Phú")}).querySelector('.badge')`, "bật lại Long Phú");
    await d.ev("[...document.querySelectorAll('#list tr[data-code=\"TTB06\"] button')].find((b) => b.textContent === 'Sửa giá').click(); true");
    await d.waitFor("document.querySelector('#edit h2').textContent.includes('TTB06')", "hộp sửa TTB06");
    await d.waitFor(`${lichSu}.length === 0 && /Chưa có lần đổi nhóm/.test(document.getElementById('edit').textContent)`, "TTB06 chưa có lịch sử");
    assert.equal(soStaff(d), 1, `GET /api/staff đúng một lần — là ${soStaff(d)}`);
    await d.ev("[...document.querySelectorAll('#list tr[data-code=\"TD101\"] button')].find((b) => b.textContent === 'Sửa giá').click(); true");
    await d.waitFor(`${lichSu}.length === 3`, "mở lại TD101: 3 dòng");
    await shot(d, "danh-muc-nhom-1040-sua-lich-su.png", "#edit");
  });

  await step("9", "1040: vùng bấm ≥ 44px (nút khối nhóm, ô chọn, nút chuyển), cỡ chữ ô gõ / ô chọn mới ≥ 16px, không tràn ngang, không lỗi console", async () => {
    await d.ev("document.querySelector('#list input.chon-dv[data-code=\"NDV10\"]').click(); true");
    await d.waitFor("!!document.getElementById('chuyen-nhom')", "thanh chuyển hiện khi có chọn");
    for (const sel of ["#nhom-dv button", "#list label.chon-o", "#chon-bar label.chon-o", "#chon-bar button", "#edit button"]) {
      const v = await d.ev(vungBam(sel));
      assert.ok(v.n > 0 && v.h >= 44 && v.w >= 44, `${sel}: ${JSON.stringify(v)}`);
    }
    assert.ok((await d.ev(coChu("#chuyen-nhom, #sua-nhom"))) >= 16, "ô chọn ≥ 16px");
    await d.ev("document.getElementById('nhom-them').click(); true");
    assert.ok((await d.ev(coChu("#nhom-ten-moi"))) >= 16, "ô tên nhóm ≥ 16px");
    await d.ev("document.querySelector('#nhom-dv [data-act=\"huy-moi\"]').click(); true");
    await d.ev("document.getElementById('bo-chon').click(); true");
    assert.ok(await d.ev(khongTranNgang), "1040: không tràn ngang");
    await d.ev("window.scrollTo(0, 0); true");
    await shot(d, "danh-muc-nhom-1040.png", "#nhom-dv");
    assert.deepEqual(d.consoleErrors.filter((e) => !/favicon/.test(e)), [], "không lỗi console");
  });
  dong(d);

  // ================= Điện thoại 390 =================
  const m = await env.as(ACCOUNTS.admin, "/catalog", MOB);
  await step("10", "390: khối Nhóm dịch vụ + thẻ có dòng 'Nhóm: …' + ô chọn trên thẻ; chọn 2 thẻ → 'Chuyển 2 dịch vụ'; vùng bấm ≥ 44px, chữ ô ≥ 16px, không tràn ngang", async () => {
    await m.waitFor(`${DONG}.length === 15 && ${theThe}.length === 56`, "khối + 56 thẻ", 10000);
    assert.equal(await m.ev("document.querySelector('#list-cards [data-code=\"TD101\"].card .nhom-o').textContent"), "Nhóm: Hòn Tằm");
    assert.equal(await m.ev("document.querySelector('#list-cards [data-code=\"NDV04\"].card .nhom-o').textContent"), "Nhóm: Chưa phân loại");
    assert.equal(await m.ev("document.getElementById('nhom-chua').textContent"), "Chưa phân loại (kể cả dịch vụ ẩn): 52 dịch vụ");
    for (const c of ["NDV04", "NDV05"]) await m.ev(`document.querySelector('#list-cards input.chon-dv[data-code="${c}"]').click(); true`);
    await m.waitFor("document.getElementById('chon-dem').textContent === 'Đã chọn 2 dịch vụ'", "đếm 2");
    assert.equal(await m.ev("document.getElementById('chuyen-nut').textContent"), "Chuyển 2 dịch vụ");
    for (const sel of ["#nhom-dv button", "#list-cards label.chon-o", "#chon-bar label.chon-o", "#chon-bar button"]) {
      const v = await m.ev(vungBam(sel));
      assert.ok(v.n > 0 && v.h >= 44 && v.w >= 44, `${sel}: ${JSON.stringify(v)}`);
    }
    assert.ok((await m.ev(coChu("#chuyen-nhom, #filter, #q"))) >= 16, "ô chọn / ô tìm ≥ 16px");
    assert.ok(await m.ev(khongTranNgang), "390: không tràn ngang");
    await m.ev("window.scrollTo(0, 0); true");
    await shot(m, "danh-muc-nhom-390.png", "#nhom-dv");
    await shot(m, "danh-muc-nhom-390-chon.png", "#chon-bar");
    await m.ev(bamNhom("Tour đảo", "doi-ten"));
    await m.waitFor("!!document.querySelector('#nhom-dv .nhom-ten-sua')", "ô đổi tên 390");
    assert.ok((await m.ev(coChu("#nhom-dv .nhom-ten-sua"))) >= 16, "ô đổi tên ≥ 16px");
    assert.ok(await m.ev(khongTranNgang), "390: đang đổi tên không tràn ngang");
    await m.ev("document.querySelector('#nhom-dv [data-act=\"huy-ten\"]').click(); true");
  });
  dong(m);
  assert.deepEqual(loiConsole, [], "không lỗi console ở mọi trang");
  console.log(`${passed} bước ✓, 0 bước ✗`);
  console.log("DANH MỤC NHÓM SMOKE OK");
} finally {
  await env.stop();
}
