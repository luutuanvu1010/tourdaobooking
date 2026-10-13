// Kịch bản Chrome (bằng chứng giao diện) cho ADR-0058 Đ8 — Task A6 lượt 1: chip "Nhóm dịch vụ" ở ô "Chọn từ danh mục" của form lập đơn.
// Chủ chọn CÁCH 1 (câu Q1, 30/9 — ảnh phác docs/design/nhom-dich-vu-2026-09-30/): hàng RIÊNG có nhãn "Nhóm dịch vụ" dưới hàng lọc 1.42, kết hợp VÀ với hàng đó
// và ô tìm; chip 1.42 "Theo nhóm" đổi chữ thành "Giá theo nhóm"; dòng "Đang lọc: <nhóm> — N dịch vụ · Bỏ lọc"; nhớ THEO TÀI KHOẢN trên máy (khoá loc-nhom-dv:<id>).
// Dùng lại cơ chế CDP của A2 (startEnv()/ACCOUNTS từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs). startEnv() chèn 3 dịch vụ giả (TD101/TTB03/TTB06) SAU migration gieo nhóm,
// nên cả ba ở "Chưa phân loại": kịch bản chèn thêm 21 dịch vụ TTB giả + 1 dịch vụ ZZ01 rồi dùng tài khoản Quản trị gán nhóm qua PUT /api/catalog/group-assignments
// (TTB = 23 dịch vụ như hôm nay, TD101 → Tour đảo, ZZ01 để "Chưa phân loại").
// Các trang dùng CHUNG kho cookie (CLAUDE.md §10): mỗi trang đóng xong mới mở trang kế; trang của tài khoản đang xét mở SAU CÙNG.
// Chạy từ GỐC repo (worktree), sau `npm run build:web` (không cần mạng ngoài):
//   node docs/evidence/2026-09-30-nhom-dich-vu/kich-ban/chip-nhom-smoke.mjs
// Ảnh ghi vào $OUT (mặc định docs/evidence/2026-09-30-nhom-dich-vu).
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-30-nhom-dich-vu";
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
// Chỉ khung nhìn (vùng dính "Tổng cộng/Lưu" cuối trang bị ghép chồng nếu chụp quá khung). Cuộn ô danh mục lên đầu khung trước khi chụp.
const shot = async (p, name) => {
  await p.ev("document.querySelector('.catalog').scrollIntoView({ block: 'start' }); true");
  await sleep(150);
  writeFileSync(join(OUT, name), Buffer.from((await p.send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
};

const CHIP = "[...document.querySelectorAll('.catalog-nhom .catalog-nhom-nut')]";
const nhanChip = `${CHIP}.map((b) => b.textContent)`;
const dangBam = `${CHIP}.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent)`;
const trangThai = "(() => { const s = document.querySelector('.catalog-nhom-trang-thai'); return s.hidden ? '' : s.textContent; })()";
const hang = "[...document.querySelectorAll('#catalog-list .catalog-pick')].map((b) => b.querySelector('strong').textContent)";
const bamNhom = (code) => `(() => { const b = document.querySelector('.catalog-nhom [data-nhom="${code}"]'); b.click(); return true; })()`;
const khongTranNgang = "document.documentElement.scrollWidth - innerWidth <= 0";

const env = await startEnv();
const loiConsole = [];
const dong = (p) => {
  loiConsole.push(...p.consoleErrors.filter((e) => !/favicon/.test(e)));
  p.close();
};
try {
  // ---- Dữ liệu: 21 dịch vụ TTB giả + ZZ01; Quản trị gán nhóm (TTB 23, TD101 → TDA, ZZ01 để Chưa phân loại) ----
  const T = "'2026-01-01T00:00:00.000Z'";
  const them = Array.from({ length: 21 }, (_, i) => `TTB${String(i + 7).padStart(2, "0")}`);
  // `groups` của for-order chỉ gồm nhóm có ≥ 1 dịch vụ đang hiện (ADR-0058 Đ5): thêm một dịch vụ giả cho mỗi nhóm còn lại để đủ 14 chip như dữ liệu thật.
  const NHOM_KHAC = ["LPH", "HTA", "VHB", "VIN", "DTH", "IRS", "KON", "TTR", "NHD", "TBA", "TXE", "BUS"];
  const nhomCon = env.sql("SELECT code FROM ctl_group WHERE active = 1 AND code NOT IN ('TDA','TTB') ORDER BY sort_order").map((r) => r.code);
  assert.deepEqual([...nhomCon].sort(), [...NHOM_KHAC].sort(), `12 nhóm gieo còn lại: ${nhomCon.join(",")}`);
  env.sql(`INSERT INTO catalog_item (code,name,unit,price_adult,sheet_row,in_sheet,first_seen_at,updated_at) VALUES ${[...them.map((c, i) => `('${c}','Trò biển ${i + 7}','perPax',${300000 + i * 10000},${10 + i},1,${T},${T})`), ...nhomCon.map((g, i) => `('G${g}','Dịch vụ nhóm ${g}','perPax',400000,${50 + i},1,${T},${T})`), `('ZZ01','Dịch vụ mới chưa gán nhóm','perPax',500000,40,1,${T},${T})`].join(",")}`);
  const ad = await env.login(ACCOUNTS.admin);
  const gan = async (codes, groupCode) => {
    const r = await fetch(`${env.base}/api/catalog/group-assignments`, { method: "PUT", headers: { "content-type": "application/json", origin: env.base, cookie: `${ad.name}=${ad.value}` }, body: JSON.stringify({ codes, groupCode }) });
    const text = await r.text();
    assert.equal(r.status, 200, `gán nhóm ${groupCode}: ${r.status} ${text}`);
    return JSON.parse(text);
  };
  assert.equal((await gan(["TTB03", "TTB06", ...them], "TTB")).doi, 23);
  assert.equal((await gan(["TD101"], "TDA")).doi, 1);
  for (const g of nhomCon) assert.equal((await gan([`G${g}`], g)).doi, 1);
  const sa = await env.login(ACCOUNTS.salesA);
  const dm = await (await fetch(`${env.base}/api/catalog/for-order`, { headers: { cookie: `${sa.name}=${sa.value}` } })).json();
  assert.equal(dm.items.filter((c) => c.groupCode === "TTB").length, 23, "for-order: 23 dịch vụ TTB");
  assert.deepEqual(dm.items.filter((c) => c.groupCode === null).map((c) => c.code), ["ZZ01"], "for-order: chỉ ZZ01 chưa phân loại");
  const TEN_NHOM = dm.groups.map((x) => x.name);
  assert.equal(TEN_NHOM.length, 14, "14 nhóm gieo sẵn");
  ok(`Dữ liệu: Quản trị gán 23 dịch vụ vào "Thể thao biển", TD101 vào "Tour đảo", một dịch vụ cho mỗi nhóm khác; for-order trả 14 nhóm, ZZ01 chưa phân loại`);

  // ---- 1) Bán hàng A, 390: hàng chip, bấm TTB → 23, danh sách chỉ TTB ----
  const p = await env.as(ACCOUNTS.salesA, "/order-form", MOB);
  const idA = await p.ev("fetch('/api/auth/me').then((r) => r.json()).then((j) => j.staff.id)");
  // Khoá nhớ ĐỌC TỪ TRÌNH DUYỆT (không tự dựng) ở bước 1; bước 6 mới khẳng định khoá có id — để bài P16 (bỏ id khỏi khoá) đỏ đúng ở bước "tài khoản khác".
  let KHOA_A = "";
  await p.waitFor(`${CHIP}.length === 17`, "17 chip (Tất cả + ★ Hay dùng + 14 nhóm + Chưa phân loại)", 10000);
  assert.deepEqual(await p.ev(nhanChip), ["Tất cả", "★ Hay dùng", ...TEN_NHOM, "Chưa phân loại"], "thứ tự chip: Tất cả, ★ Hay dùng, nhóm theo groups, Chưa phân loại");
  assert.deepEqual(await p.ev(dangBam), ["Tất cả"], "mặc định Tất cả");
  // Đợt 1 (13/10, #3): hàng "Lọc sẵn có" đã bỏ; "Nhóm dịch vụ" nằm TRÊN ô gõ; "Theo người" / "Giá theo nhóm" không còn nút.
  assert.deepEqual(await p.ev("[...document.querySelectorAll('.catalog-hang-nhan')].map((x) => x.textContent)"), ["Nhóm dịch vụ"]);
  assert.equal(await p.ev("document.querySelectorAll('.catalog-loc, .catalog-loc-nut').length"), 0, "không còn hàng Lọc sẵn có");
  assert.equal(await p.ev("/Theo người|Giá theo nhóm|Lọc sẵn có/.test(document.querySelector('.catalog').textContent)"), false, "không còn chữ của hàng cũ");
  assert.equal(await p.ev("!!document.querySelector('.catalog-nhom[data-cho=\"nhom\"]')"), true, "điểm gắn data-cho=nhom");
  assert.equal(await p.ev("!!(document.querySelector('.catalog-nhom').compareDocumentPosition(document.getElementById('catalog-q')) & Node.DOCUMENT_POSITION_FOLLOWING)"), true, "hàng nhóm nằm TRÊN ô gõ");
  assert.equal(await p.ev("document.querySelector('.catalog label')"), null, "nhãn 'Chọn từ danh mục' đã ẩn (chữ mờ trong ô)");
  assert.deepEqual(await p.ev("(() => { const q = document.getElementById('catalog-q'); return [q.getAttribute('aria-label'), q.placeholder]; })()"), ["Chọn từ danh mục", "Chọn từ danh mục — gõ tên hoặc mã…"], "tên cho trình đọc màn hình + chữ mờ");
  assert.ok((await p.ev(`Math.min(...${CHIP}.map((b) => b.getBoundingClientRect().height))`)) >= 44, "chip nhóm cao ≥ 44px");
  assert.ok(await p.ev(khongTranNgang), "390: trang không tràn ngang dù 17 chip");
  assert.equal(await p.ev("(() => { const r = document.querySelector('.catalog-nhom-chips'); return r.scrollWidth > r.clientWidth && getComputedStyle(r).overflowX === 'auto'; })()"), true, "hàng chip trượt ngang");
  assert.equal(await p.ev(trangThai), "", "Tất cả: không dòng Đang lọc");
  await p.ev(bamNhom("TTB"));
  await p.waitFor(`${trangThai} === 'Đang lọc: Thể thao biển — 23 dịch vụ · Bỏ lọc'`, "nhãn Đang lọc 23");
  assert.equal(await p.ev("document.querySelector('.catalog-nhom-trang-thai').getAttribute('role')"), "status");
  assert.deepEqual(await p.ev(dangBam), ["Thể thao biển"]);
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.waitFor(`${hang}.length === 23 && ${hang}.every((c) => c.startsWith('TTB'))`, "danh sách chỉ 23 dịch vụ TTB");
  KHOA_A = await p.ev("Object.keys(localStorage).find((k) => k.startsWith('loc-nhom-dv:')) ?? ''");
  assert.equal(await p.ev(`localStorage.getItem(${JSON.stringify(KHOA_A)})`), '"TTB"', "bấm chip → nhớ trên máy");
  await shot(p, "chip-nhom-390-the-thao-bien.png");
  ok("390: hàng 'Nhóm dịch vụ' trên ô gõ, không còn 'Lọc sẵn có' (17 chip gồm ★ Hay dùng, ≥44px, trượt ngang, trang không tràn); bấm Thể thao biển → 'Đang lọc: Thể thao biển — 23 dịch vụ', danh sách chỉ TTB; nhớ ở loc-nhom-dv:<id>");

  // ---- 2) Tìm trong nhóm; VÀ với "★ Hay dùng" ----
  await p.ev(setInput("document.getElementById('catalog-q')", "motor"));
  await p.waitFor(`JSON.stringify(${hang}) === '["TTB06"]'`, "tìm 'motor' trong TTB");
  assert.equal(await p.ev(trangThai), "Đang lọc: Thể thao biển — 1 dịch vụ · Bỏ lọc");
  await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
  await p.waitFor(`${hang}.length === 0 && /Không tìm thấy dịch vụ/.test(document.getElementById('catalog-list').textContent)`, "TD101 không thuộc TTB → không thấy");
  await p.ev(setInput("document.getElementById('catalog-q')", ""));
  await p.waitFor(`${hang}.length === 23`, "xoá tìm → 23");
  await p.ev("document.querySelector('#catalog-list [data-ghim=\"TTB06\"]').click(); true");
  await p.ev("document.querySelector('#catalog-list [data-ghim=\"TTB09\"]').click(); true");
  // Đợt 1 (13/10): "★ Hay dùng" là MỘT chip của hàng nhóm, loại trừ với nhóm (chọn Hay dùng → bỏ nhóm; chọn nhóm → bỏ Hay dùng).
  await p.ev("document.querySelector('.catalog-nhom [data-loc=\"hay-dung\"]').click(); true");
  await p.waitFor(`JSON.stringify(${hang}) === '["TTB06","TTB09"]' && ${trangThai} === 'Đang lọc: ★ Hay dùng — 2 dịch vụ · Bỏ lọc'`, "★ Hay dùng: hai dịch vụ đã ghim");
  assert.deepEqual(await p.ev(dangBam), ["★ Hay dùng"], "chỉ MỘT chip đang bật: Hay dùng (nhóm Thể thao biển tắt)");
  await shot(p, "chip-nhom-390-hay-dung.png");
  await p.ev(bamNhom("TDA"));
  await p.waitFor(`JSON.stringify(${hang}) === '["TD101"]' && ${trangThai} === 'Đang lọc: Tour đảo — 1 dịch vụ · Bỏ lọc'`, "chọn nhóm Tour đảo → Hay dùng tắt");
  assert.deepEqual(await p.ev(dangBam), ["Tour đảo"]);
  assert.equal(await p.ev("JSON.parse(localStorage.getItem('td.dmLoc.v1')).loc"), null, "chọn nhóm → bản nhớ Hay dùng tắt");
  await p.ev(bamNhom("TTB"));
  ok("Tìm 'motor' TRONG nhóm → TTB06 (1 dịch vụ); TD101 ngoài nhóm → không thấy; ★ Hay dùng (chip riêng, loại trừ nhóm) → 2 dịch vụ đã ghim; chọn nhóm khác → Hay dùng tắt");

  // ---- 2b) Đợt 1: mở danh sách bằng chạm, đóng bằng Esc / nút Đóng, dấu sao ở đầu dòng, bộ lọc ẩn đã nhớ bị bỏ ----
  assert.equal(await p.ev("(() => { const r = document.querySelector('#catalog-list .catalog-row'); return r.firstElementChild.classList.contains('catalog-ghim') && r.lastElementChild.classList.contains('catalog-pick'); })()"), true, "dấu sao ĐỨNG ĐẦU dòng, nút chọn sau nó");
  assert.equal(await p.ev("(() => { const b = document.querySelector('#catalog-list .catalog-pick'); return [b.querySelector('.catalog-ten')?.textContent.length > 0, b.querySelector('.catalog-phu strong')?.textContent.length > 0]; })().every(Boolean)"), true, "dòng: tên + dòng phụ có mã");
  assert.match(await p.ev("document.querySelector('#catalog-list .catalog-dau').textContent"), /^23 dịch vụĐóng$/, "đầu danh sách: số dịch vụ + nút Đóng");
  await p.ev("document.querySelector('#catalog-list .catalog-dong').click(); true");
  assert.equal(await p.ev("document.getElementById('catalog-list').hidden"), true, "nút Đóng đóng danh sách");
  await p.ev("document.getElementById('catalog-q').dispatchEvent(new MouseEvent('click', { bubbles: true })); true"); // ô vẫn giữ focus: chỉ có sự kiện bấm, không có focus
  await p.waitFor("document.getElementById('catalog-list').hidden === false", "chạm lại vào ô (đang giữ focus) → danh sách mở");
  await p.ev("document.getElementById('catalog-q').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true");
  assert.equal(await p.ev("document.getElementById('catalog-list').hidden"), true, "Esc đóng danh sách");
  await p.ev("document.getElementById('catalog-q').dispatchEvent(new MouseEvent('click', { bubbles: true })); true");
  await p.ev(`localStorage.setItem('td.dmLoc.v1', JSON.stringify({ loc: 'theo-nguoi', ghim: ['TTB06'] })); true`);
  const bo2b = await env.as(ACCOUNTS.salesA, "/order-form", MOB);
  await bo2b.waitFor(`${CHIP}.length === 17`, "17 chip (bản nhớ cũ 'Theo người')", 10000);
  await bo2b.ev("document.getElementById('catalog-q').focus(); true");
  await bo2b.waitFor(`${hang}.length >= 20`, "danh sách không bị lọc ngầm bởi 'Theo người' đã nhớ");
  assert.equal(await bo2b.ev(trangThai).then((s) => s.includes("Theo người")), false);
  dong(bo2b);
  ok("Chạm lại ô đang giữ focus → danh sách mở; nút Đóng và Esc đóng; dấu sao đứng đầu dòng; bản nhớ cũ 'Theo người' bị bỏ (không lọc ngầm)");

  // ---- 3) Chưa phân loại; Bỏ lọc ----
  await p.ev(bamNhom("chua-phan-loai"));
  await p.waitFor(`JSON.stringify(${hang}) === '["ZZ01"]' && ${trangThai} === 'Đang lọc: Chưa phân loại — 1 dịch vụ · Bỏ lọc'`, "Chưa phân loại → ZZ01");
  assert.equal(await p.ev("document.getElementById('catalog-list').hidden"), false, "bấm chip nhóm: danh sách KHÔNG đóng");
  await p.ev("document.querySelector('.catalog-nhom-bo').click(); true");
  await p.waitFor(`JSON.stringify(${dangBam}) === '["Tất cả"]' && ${trangThai} === ''`, "Bỏ lọc → Tất cả");
  assert.equal(await p.ev("document.getElementById('catalog-list').hidden"), false, "bấm Bỏ lọc: danh sách KHÔNG đóng");
  assert.equal(await p.ev(`${hang}.length`), 37, "Tất cả: đủ 37 dịch vụ danh mục (3 gốc + 21 TTB + 12 nhóm khác + ZZ01)");
  assert.equal(await p.ev(`localStorage.getItem(${JSON.stringify(KHOA_A)})`), null, "Tất cả: xoá bản nhớ");
  await p.ev(bamNhom("TTB"));
  ok("'Chưa phân loại' → chỉ ZZ01; 'Bỏ lọc' → Tất cả, dòng Đang lọc ẩn, bản nhớ xoá");

  // ---- 4) Tải lại → nhớ; nhóm đã nhớ không còn → Tất cả ----
  await p.send("Page.reload", {});
  await sleep(300);
  await p.waitFor(`JSON.stringify(${dangBam}) === '["Thể thao biển"]' && ${trangThai} === 'Đang lọc: Thể thao biển — 23 dịch vụ · Bỏ lọc'`, "tải lại vẫn nhớ TTB", 10000);
  await p.ev(`localStorage.setItem(${JSON.stringify(KHOA_A)}, '"KHONGCO"'); true`);
  await p.send("Page.reload", {});
  await sleep(300);
  await p.waitFor(`${CHIP}.length === 17`, "chip sau tải lại", 10000);
  assert.deepEqual(await p.ev(dangBam), ["Tất cả"], "nhóm đã nhớ không còn trong groups → Tất cả");
  await p.ev(bamNhom("TTB"));
  assert.ok(await p.ev(khongTranNgang), "390: không tràn ngang");
  dong(p);
  ok("Tải lại → vẫn 'Thể thao biển' (23); bản nhớ là nhóm không còn → 'Tất cả'");

  // ---- 5) 1040: vẫn nhớ, không tràn ----
  const d = await env.as(ACCOUNTS.salesA, "/order-form", DESK);
  await d.waitFor(`JSON.stringify(${dangBam}) === '["Thể thao biển"]'`, "1040: nhớ TTB", 10000);
  assert.equal(await d.ev("(() => { const r = document.querySelector('.catalog-nhom-chips').getBoundingClientRect(); const c = document.querySelector('.catalog-nhom-nut[aria-pressed=\"true\"]').getBoundingClientRect(); return c.left >= r.left - 1 && c.right <= r.right + 1; })()"), true, "chip nhớ từ lần trước trượt vào tầm nhìn");
  assert.ok(await d.ev(khongTranNgang), "1040: không tràn ngang");
  await d.ev("document.getElementById('catalog-q').focus(); true");
  await d.waitFor(`${hang}.length === 23`, "1040: 23 TTB");
  await shot(d, "chip-nhom-1040-the-thao-bien.png");
  dong(d);
  ok("1040: nhớ 'Thể thao biển', danh sách 23, không tràn ngang");

  // ---- 6) Tài khoản khác (Bán hàng B) cùng hồ sơ trình duyệt → Tất cả (không nhớ lẫn). Trang của B mở SAU CÙNG. ----
  const b = await env.as(ACCOUNTS.salesB, "/order-form", MOB);
  await b.waitFor(`${CHIP}.length === 17`, "B: chip nhóm", 10000);
  assert.equal(await b.ev(`localStorage.getItem(${JSON.stringify(KHOA_A)})`), '"TTB"', "tiền đề: bản nhớ của A vẫn nằm trên máy");
  assert.deepEqual(await b.ev(dangBam), ["Tất cả"], "tài khoản khác không nhớ lẫn nhóm của A");
  assert.equal(await b.ev(trangThai), "");
  assert.equal(KHOA_A, `loc-nhom-dv:${idA}`, "khoá nhớ = loc-nhom-dv:<id tài khoản>");
  await shot(b, "chip-nhom-390-tai-khoan-khac.png");
  dong(b);
  ok("Bán hàng B cùng máy (A đã nhớ 'Thể thao biển'): B thấy 'Tất cả' — nhớ theo tài khoản");

  // ---- 7) localStorage bị chặn (getItem/setItem/removeItem ném lỗi) → Tất cả, bấm chip vẫn lọc, không lỗi console ----
  const c = await env.openPage(MOB);
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: "for (const k of ['getItem', 'setItem', 'removeItem']) Storage.prototype[k] = function () { throw new DOMException('bị chặn', 'SecurityError'); };" });
  const ck = await env.login(ACCOUNTS.salesA);
  await c.send("Network.setCookie", { name: ck.name, value: ck.value, url: env.base, httpOnly: true });
  await c.send("Page.navigate", { url: `${env.base}/order-form` });
  await c.waitFor(`${CHIP}.length === 17`, "bị chặn: chip nhóm vẫn hiện", 10000);
  assert.equal(await c.ev("(() => { try { localStorage.getItem('x'); return false; } catch { return true; } })()"), true, "tiền đề: bộ nhớ thật sự bị chặn");
  assert.deepEqual(await c.ev(dangBam), ["Tất cả"], "bị chặn → Tất cả (A đã nhớ TTB nhưng không đọc được)");
  await c.ev(bamNhom("TTB"));
  await c.waitFor(`${trangThai} === 'Đang lọc: Thể thao biển — 23 dịch vụ · Bỏ lọc'`, "bị chặn: bấm chip vẫn lọc");
  dong(c);
  assert.deepEqual(loiConsole, [], "không lỗi console ở mọi trang");
  ok("Bộ nhớ trình duyệt bị chặn: 'Tất cả', bấm chip vẫn lọc (23); không lỗi console ở mọi trang của kịch bản");
  console.log("CHIP NHOM SMOKE OK");
} finally {
  await env.stop();
}
