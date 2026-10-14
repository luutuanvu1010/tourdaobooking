// Kịch bản Chrome (bằng chứng giao diện) cho ADR-0058 Đ8 — nhóm dịch vụ ở ô "Chọn từ danh mục" của form lập đơn.
// Ban đầu (30/9, Task A6) là HÀNG CHIP một nhóm; ĐỢT 1 (13/10, ý chủ "chỉ để lại việc lọc theo nhóm sản phẩm bằng nút xổ xuống + tick chọn") đổi thành MỘT nút xổ xuống
// "Nhóm dịch vụ" (kèm số nhóm đang tick, "Nhóm dịch vụ · 2") trên ô gõ: bảng nhóm mỗi dòng một ô tick (≥ 44px), tick NHIỀU nhóm, không tick = tất cả, "Bỏ chọn hết", đóng bằng nút
// Đóng / Esc / bấm ra ngoài; dấu sao ☆/★ ở đầu dòng và dịch vụ có sao xếp lên trước. Nhớ THEO TÀI KHOẢN trên máy (khoá loc-nhom-dv:<id>, nay là MẢNG mã; bản nhớ cũ một chuỗi vẫn đọc được).
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
  await p.ev("document.querySelector('.catalog').scrollIntoView({ block: 'start' }); scrollBy(0, -80); true"); // trừ chiều cao thanh trên cùng dính
  await sleep(150);
  writeFileSync(join(OUT, name), Buffer.from((await p.send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
};

const NUT = "document.getElementById('catalog-nhom-nut')";
const nhanNut = `${NUT}.firstElementChild.textContent`;
const bangMo = "(!document.getElementById('catalog-nhom-bang').hidden && " + NUT + ".getAttribute('aria-expanded') === 'true')";
const O = "[...document.querySelectorAll('#catalog-nhom-bang input[type=checkbox]')]";
const daTick = `${O}.filter((c) => c.checked).map((c) => c.value)`;
const hang = "[...document.querySelectorAll('#catalog-list .catalog-pick')].map((b) => b.querySelector('strong').textContent)";
const soNhom = "document.querySelector('.catalog-nhom-so-ket-qua').textContent";
const tick = (code) => `(() => { document.querySelector('#catalog-nhom-bang [data-nhom="${code}"]').click(); return true; })()`;
const moBang = `(() => { if (${NUT}.getAttribute('aria-expanded') !== 'true') ${NUT}.click(); return true; })()`;
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

  // ---- 1) Bán hàng A, 390: MỘT nút xổ xuống, không còn hàng chip; mở bảng, tick nhiều nhóm ----
  const p = await env.as(ACCOUNTS.salesA, "/order-form", MOB);
  const idA = await p.ev("fetch('/api/auth/me').then((r) => r.json()).then((j) => j.staff.id)");
  // Khoá nhớ ĐỌC TỪ TRÌNH DUYỆT (không tự dựng) ở bước 1; bước 6 mới khẳng định khoá có id — để bài P16 (bỏ id khỏi khoá) đỏ đúng ở bước "tài khoản khác".
  let KHOA_A = "";
  await p.waitFor(`!!${NUT} && !${NUT}.closest('.catalog-nhom').hidden && ${O}.length === 15`, "nút Nhóm dịch vụ + 15 dòng (14 nhóm + Chưa phân loại)", 10000);
  assert.equal(await p.ev("document.querySelectorAll('.catalog-nhom-nut').length"), 1, "đúng MỘT nút");
  assert.equal(await p.ev(nhanNut), "Nhóm dịch vụ", "chưa tick: không số");
  assert.equal(await p.ev(`${NUT}.getAttribute('aria-expanded')`), "false");
  assert.equal(await p.ev(`document.getElementById(${NUT}.getAttribute('aria-controls')) === document.getElementById('catalog-nhom-bang')`), true, "aria-controls trỏ đúng bảng nhóm");
  assert.equal(await p.ev("document.getElementById('catalog-nhom-bang').hidden"), true, "mặc định bảng đóng");
  // Mọi hàng lọc phụ đã bỏ: không chip, không "Hay dùng", "Theo người", "Giá theo nhóm", "Lọc sẵn có"; hàng chip nhóm cũng không còn.
  assert.equal(await p.ev("document.querySelectorAll('.catalog .loc-nut, .catalog-nhom-chips, .catalog-loc, .catalog-loc-nut, .catalog-hang-nhan, .catalog-nhom-trang-thai').length"), 0, "không còn chip / hàng lọc cũ");
  assert.equal(await p.ev("/Hay dùng|Theo người|Giá theo nhóm|Lọc sẵn có|Đang lọc/.test(document.querySelector('.catalog').textContent)"), false, "không còn chữ của bộ lọc cũ");
  assert.equal(await p.ev("!!document.querySelector('.catalog-nhom[data-cho=\"nhom\"]')"), true, "điểm gắn data-cho=nhom");
  assert.equal(await p.ev(`!!(${NUT}.compareDocumentPosition(document.getElementById('catalog-q')) & Node.DOCUMENT_POSITION_FOLLOWING)`), true, "nút nhóm nằm TRÊN ô gõ");
  assert.equal(await p.ev("document.querySelector('.catalog label.catalog-ten, .catalog > label')"), null, "nhãn 'Chọn từ danh mục' đã ẩn (chữ mờ trong ô)");
  assert.deepEqual(await p.ev("(() => { const q = document.getElementById('catalog-q'); return [q.getAttribute('aria-label'), q.placeholder]; })()"), ["Chọn từ danh mục", "Chọn từ danh mục — gõ tên hoặc mã…"], "tên cho trình đọc màn hình + chữ mờ");
  assert.ok((await p.ev(`${NUT}.getBoundingClientRect().height`)) >= 44, "nút cao ≥ 44px");
  await p.ev(moBang);
  assert.equal(await p.ev(bangMo), true, "bấm nút: bảng mở, aria-expanded=true");
  assert.deepEqual(await p.ev(`${O}.map((c) => c.closest('label').querySelector('.catalog-nhom-ten').textContent)`), [...TEN_NHOM, "Chưa phân loại"], "thứ tự dòng: nhóm theo groups, Chưa phân loại cuối");
  assert.ok((await p.ev(`Math.min(...${O}.map((c) => c.closest('label').getBoundingClientRect().height))`)) >= 44, "mỗi dòng ô tick cao ≥ 44px");
  assert.equal(await p.ev("document.querySelector('.catalog-nhom-bo').disabled"), true, "chưa tick gì: 'Bỏ chọn hết' tắt");
  assert.equal(await p.ev(soNhom), "37 dịch vụ", "không tick = tất cả: 37 dịch vụ (3 gốc + 21 TTB + 12 nhóm khác + ZZ01)");
  assert.ok(await p.ev(khongTranNgang), "390: trang không tràn ngang khi bảng nhóm mở");
  await shot(p, "nhom-xo-xuong-390-mo.png");
  await p.ev(tick("TTB"));
  assert.equal(await p.ev(nhanNut), "Nhóm dịch vụ · 1");
  assert.equal(await p.ev(soNhom), "23 dịch vụ");
  await p.ev(tick("TDA"));
  assert.equal(await p.ev(nhanNut), "Nhóm dịch vụ · 2", "tick thêm nhóm thứ hai → nhớ nhiều nhóm");
  assert.equal(await p.ev(soNhom), "24 dịch vụ", "nhiều nhóm = HOẶC (23 + 1)");
  assert.deepEqual((await p.ev(daTick)).sort(), ["TDA", "TTB"], "hai ô được tick");
  assert.equal(await p.ev("document.querySelector('.catalog-nhom-bo').disabled"), false, "đã tick: 'Bỏ chọn hết' bật");
  KHOA_A = await p.ev("Object.keys(localStorage).find((k) => k.startsWith('loc-nhom-dv:')) ?? ''");
  assert.deepEqual(JSON.parse(await p.ev(`localStorage.getItem(${JSON.stringify(KHOA_A)})`)).sort(), ["TDA", "TTB"], "nhớ trên máy: mảng mã nhóm");
  // Đóng bằng nút Đóng: danh sách hiện đúng 24 dịch vụ của hai nhóm, focus về nút.
  await p.ev("document.querySelector('.catalog-nhom-dong').click(); true");
  assert.equal(await p.ev(bangMo), false, "Đóng: bảng đóng");
  assert.equal(await p.ev(`${NUT}.getAttribute('aria-expanded')`), "false");
  assert.equal(await p.ev("document.activeElement && document.activeElement.id"), "catalog-nhom-nut", "đóng bảng: focus về nút");
  await p.waitFor(`${hang}.length === 24 && ${hang}.every((c) => c.startsWith('TTB') || c === 'TD101')`, "danh sách chỉ 24 dịch vụ của TDA + TTB");
  assert.match(await p.ev("document.querySelector('#catalog-list .catalog-dau').textContent"), /^24 dịch vụĐóng$/);
  await shot(p, "nhom-xo-xuong-390-hai-nhom.png");
  ok("390: một nút 'Nhóm dịch vụ' trên ô gõ (không còn chip / Hay dùng / Lọc sẵn có); bảng 15 dòng ô tick ≥ 44px; tick TTB + TDA → 'Nhóm dịch vụ · 2', 24 dịch vụ (HOẶC); nhớ mảng mã ở loc-nhom-dv:<id>; Đóng → danh sách 24 dòng, focus về nút");

  // ---- 2) Bỏ chọn hết; tìm trong nhóm (VÀ); Esc và bấm ra ngoài đóng bảng ----
  await p.ev(moBang);
  await p.ev("document.querySelector('.catalog-nhom-bo').click(); true");
  assert.equal(await p.ev(nhanNut), "Nhóm dịch vụ", "Bỏ chọn hết → không số");
  assert.deepEqual(await p.ev(daTick), []);
  assert.equal(await p.ev(soNhom), "37 dịch vụ");
  assert.equal(await p.ev(`localStorage.getItem(${JSON.stringify(KHOA_A)})`), null, "Bỏ chọn hết: xoá bản nhớ");
  await p.ev(tick("TTB"));
  await p.ev("document.getElementById('catalog-nhom-nut').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true");
  assert.equal(await p.ev(bangMo), false, "Esc đóng bảng nhóm");
  assert.equal(await p.ev("document.activeElement && document.activeElement.id"), "catalog-nhom-nut", "Esc: focus về nút");
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.ev(setInput("document.getElementById('catalog-q')", "motor"));
  await p.waitFor(`JSON.stringify(${hang}) === '["TTB06"]'`, "tìm 'motor' trong TTB");
  await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
  await p.waitFor(`${hang}.length === 0 && /Không tìm thấy dịch vụ nào khớp trong các nhóm đã đánh dấu/.test(document.getElementById('catalog-list').textContent)`, "TD101 không thuộc TTB → câu nói rõ đang lọc theo nhóm");
  await p.ev(setInput("document.getElementById('catalog-q')", ""));
  await p.waitFor(`${hang}.length === 23`, "xoá tìm → 23");
  await p.ev(moBang);
  assert.equal(await p.ev("document.getElementById('catalog-list').hidden"), true, "mở bảng nhóm: danh sách nhường chỗ");
  await p.ev("document.body.click(); true");
  assert.equal(await p.ev(bangMo), false, "bấm ra ngoài đóng bảng nhóm");
  await p.ev(moBang);
  await p.ev("document.getElementById('catalog-q').click(); true"); // chạm vào ô gõ khi bảng nhóm đang mở
  await p.waitFor("document.getElementById('catalog-nhom-bang').hidden === true && document.getElementById('catalog-list').hidden === false", "chạm ô gõ: bảng nhóm gập, danh sách mở");
  ok("Bỏ chọn hết → tất cả, bản nhớ xoá; tìm 'motor' TRONG nhóm TTB → TTB06; TD101 ngoài nhóm → không thấy; Esc và bấm ra ngoài đóng bảng nhóm; vào ô gõ thì bảng gập");

  // ---- 2b) Dấu sao: bấm chỉ đổi biểu tượng TẠI CHỖ (không dựng lại, không nhảy dòng, không đổi vị trí cuộn); xếp sao lên trước ở lần mở sau; danh sách vẫn mở; chạm lại ô mở; Đóng / Esc; bản nhớ lọc cũ bị bỏ qua ----
  const truoc = await p.ev(hang);
  assert.equal(await p.ev("(() => { const r = document.querySelector('#catalog-list .catalog-row'); return r.firstElementChild.classList.contains('catalog-ghim') && r.lastElementChild.classList.contains('catalog-pick'); })()"), true, "dấu sao ĐỨNG ĐẦU dòng, nút chọn sau nó");
  // Người kiểm 13/10 (60 dịch vụ, 390): dựng lại làm cuộn nhảy 1200 → 0 khi gắn sao và → 2122 khi bỏ sao. Đo cả cuộn trang và cuộn trong khung danh sách, TRƯỚC và SAU mỗi lần bấm.
  const cuon = "(() => ({ y: Math.round(scrollY), t: Math.round(document.getElementById('catalog-list').scrollTop) }))()";
  const sao = (code) => `document.querySelector('#catalog-list [data-ghim="${code}"]')`;
  const giua = truoc[10]; // dòng nằm giữa danh sách, phải cuộn trong khung mới tới
  await p.ev(`document.getElementById('catalog-list').scrollTop = 900; window.__sao = ${sao(giua)}; window.__sao.focus(); true`);
  await sleep(150);
  const o0 = await p.ev(cuon);
  assert.ok(o0.t > 0, `tiền đề: khung danh sách đã cuộn xuống (scrollTop ${o0.t})`);
  await p.ev("window.__sao.click(); true");
  assert.equal(await p.ev("document.getElementById('catalog-list').hidden"), false, "bấm sao: danh sách KHÔNG đóng");
  assert.deepEqual(await p.ev(cuon), o0, "gắn sao: vị trí cuộn KHÔNG đổi");
  assert.deepEqual(await p.ev(hang), truoc, "gắn sao: thứ tự dòng KHÔNG đổi (chưa sắp lại)");
  assert.equal(await p.ev(`${sao(giua)} === window.__sao`), true, "nút sao vẫn là CHÍNH nút cũ (không dựng lại)");
  assert.equal(await p.ev("window.__sao.textContent"), "★");
  assert.equal(await p.ev("window.__sao.getAttribute('aria-pressed')"), "true");
  assert.equal(await p.ev("document.activeElement === window.__sao"), true, "focus vẫn ở nút sao");
  await p.ev("window.__sao.click(); true");
  assert.deepEqual(await p.ev(cuon), o0, "bỏ sao: vị trí cuộn KHÔNG đổi");
  assert.deepEqual(await p.ev(hang), truoc, "bỏ sao: thứ tự dòng không đổi");
  assert.equal(await p.ev("window.__sao.textContent + window.__sao.getAttribute('aria-pressed')"), "☆false");
  assert.equal(await p.ev("document.activeElement === window.__sao"), true, "focus vẫn ở nút sao");
  // Gắn hai sao rồi mở lại danh sách: dịch vụ có sao lên đầu (theo thứ tự danh mục), phần còn lại giữ thứ tự cũ.
  await p.ev(`${sao("TTB09")}.click(); ${sao("TTB06")}.click(); true`);
  assert.deepEqual(await p.ev(hang), truoc, "gắn thêm sao: vẫn chưa sắp lại");
  await shot(p, "nhom-xo-xuong-390-sao-tai-cho.png");
  await p.ev("document.getElementById('catalog-q').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true");
  assert.equal(await p.ev("document.getElementById('catalog-list').hidden"), true);
  await p.ev("document.getElementById('catalog-q').dispatchEvent(new MouseEvent('click', { bubbles: true })); true");
  await p.waitFor("document.getElementById('catalog-list').hidden === false", "mở lại danh sách");
  const sau = await p.ev(hang);
  assert.deepEqual(sau.slice(0, 2), ["TTB06", "TTB09"], "lần mở sau: hai dịch vụ gắn sao lên đầu (theo thứ tự danh mục)");
  assert.deepEqual(sau.slice(2), truoc.filter((c) => c !== "TTB06" && c !== "TTB09"), "phần còn lại giữ thứ tự cũ");
  await shot(p, "nhom-xo-xuong-390-sao-len-dau.png");
  await p.ev(`${sao("TTB06")}.click(); ${sao("TTB09")}.click(); true`);
  await p.ev("document.getElementById('catalog-q').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true");
  await p.ev("document.getElementById('catalog-q').dispatchEvent(new MouseEvent('click', { bubbles: true })); true");
  await p.waitFor(`JSON.stringify(${hang}) === ${JSON.stringify(JSON.stringify(truoc))}`, "bỏ hết sao rồi mở lại → về thứ tự cũ");
  await p.ev(`${sao("TTB09")}.click(); true`); // để lại một sao cho bước tải lại
  assert.match(await p.ev("document.querySelector('#catalog-list .catalog-dau').textContent"), /^23 dịch vụĐóng$/, "đầu danh sách: số dịch vụ + nút Đóng");
  await p.ev("document.querySelector('#catalog-list .catalog-dong').click(); true");
  assert.equal(await p.ev("document.getElementById('catalog-list').hidden"), true, "nút Đóng đóng danh sách");
  await p.ev("document.getElementById('catalog-q').dispatchEvent(new MouseEvent('click', { bubbles: true })); true"); // ô vẫn giữ focus: chỉ có sự kiện bấm, không có focus
  await p.waitFor("document.getElementById('catalog-list').hidden === false", "chạm lại vào ô (đang giữ focus) → danh sách mở");
  await p.ev("document.getElementById('catalog-q').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true");
  assert.equal(await p.ev("document.getElementById('catalog-list').hidden"), true, "Esc đóng danh sách");
  // Bản nhớ CŨ: bộ lọc 'theo-nguoi' / 'hay-dung' (đã bỏ) kèm mã ghim; nhóm kiểu cũ (một chuỗi) → đọc thành một nhóm.
  await p.ev(`localStorage.setItem('td.dmLoc.v1', JSON.stringify({ loc: 'theo-nguoi', ghim: ['TTB06'] })); localStorage.removeItem(${JSON.stringify(KHOA_A)}); true`);
  const cu = await env.as(ACCOUNTS.salesA, "/order-form", MOB);
  await cu.waitFor(`${O}.length === 15`, "bản nhớ cũ: bảng nhóm dựng xong", 10000);
  await cu.ev("document.getElementById('catalog-q').focus(); true");
  await cu.waitFor(`${hang}.length === 37`, "danh sách KHÔNG bị lọc ngầm bởi 'Theo người' đã nhớ");
  assert.equal((await cu.ev(hang))[0], "TTB06", "mã ghim của bản nhớ cũ vẫn giữ: TTB06 có sao → lên đầu");
  await cu.ev(`localStorage.setItem('td.dmLoc.v1', JSON.stringify({ loc: 'hay-dung', ghim: [] })); localStorage.setItem(${JSON.stringify(KHOA_A)}, '"TTB"'); true`);
  await cu.send("Page.reload", {});
  await sleep(300);
  await cu.waitFor(`${O}.length === 15 && JSON.stringify(${daTick}) === '["TTB"]'`, "nhóm kiểu cũ (một chuỗi) → tick đúng một nhóm TTB", 10000);
  assert.equal(await cu.ev(nhanNut), "Nhóm dịch vụ · 1");
  await cu.ev("document.getElementById('catalog-q').focus(); true");
  await cu.waitFor(`${hang}.length === 23`, "bộ lọc 'hay-dung' cũ bị bỏ, chỉ còn nhóm TTB");
  await cu.ev(`localStorage.setItem(${JSON.stringify(KHOA_A)}, '"hay-dung"'); true`);
  await cu.send("Page.reload", {});
  await sleep(300);
  await cu.waitFor(`${O}.length === 15`, "nhóm 'hay-dung' kiểu cũ", 10000);
  assert.deepEqual(await cu.ev(daTick), [], "mã lạ ('hay-dung') bị bỏ qua → không tick nhóm nào, không kẹt");
  assert.equal(await cu.ev(nhanNut), "Nhóm dịch vụ");
  dong(cu);
  ok("Dấu sao: bấm chỉ đổi biểu tượng tại chỗ (cuộn, thứ tự dòng, focus không đổi), lần mở sau TTB06 + TTB09 lên đầu, phần còn lại giữ thứ tự; chạm lại ô, nút Đóng, Esc; bản nhớ cũ ('theo-nguoi', 'hay-dung', nhóm một chuỗi) đọc an toàn, không ai kẹt trong bộ lọc ẩn");

  // ---- 3) Chưa phân loại + nhóm thật (HOẶC); Bỏ chọn hết ----
  await p.ev(`localStorage.removeItem(${JSON.stringify(KHOA_A)}); true`);
  await p.send("Page.reload", {});
  await sleep(300);
  await p.waitFor(`${O}.length === 15`, "sau tải lại", 10000);
  await p.ev(moBang);
  await p.ev(tick("chua-phan-loai"));
  assert.equal(await p.ev(nhanNut), "Nhóm dịch vụ · 1");
  assert.equal(await p.ev(soNhom), "1 dịch vụ");
  await p.ev(tick("TDA"));
  assert.equal(await p.ev(soNhom), "2 dịch vụ", "Chưa phân loại + Tour đảo → ZZ01 + TD101");
  await p.ev("document.querySelector('.catalog-nhom-dong').click(); true");
  await p.waitFor(`JSON.stringify([...${hang}].sort()) === '["TD101","ZZ01"]'`, "danh sách: TD101 + ZZ01");
  await p.ev(moBang);
  await p.ev("document.querySelector('.catalog-nhom-bo').click(); true");
  assert.equal(await p.ev(soNhom), "37 dịch vụ");
  await p.ev("document.querySelector('.catalog-nhom-dong').click(); true");
  await p.waitFor(`${hang}.length === 37`, "Bỏ chọn hết → 37");
  await p.ev(moBang);
  await p.ev(tick("TTB"));
  ok("'Chưa phân loại' + 'Tour đảo' → ZZ01 và TD101 (HOẶC giữa các nhóm); 'Bỏ chọn hết' → đủ 37 dịch vụ");

  // ---- 4) Tải lại → nhớ; nhóm đã nhớ không còn → bỏ riêng nhóm đó ----
  await p.ev("document.querySelector('.catalog-nhom-dong').click(); true");
  await p.send("Page.reload", {});
  await sleep(300);
  await p.waitFor(`${O}.length === 15 && JSON.stringify(${daTick}) === '["TTB"]' && ${nhanNut} === 'Nhóm dịch vụ · 1'`, "tải lại vẫn nhớ TTB", 10000);
  await p.ev(`localStorage.setItem(${JSON.stringify(KHOA_A)}, '["TTB","KHONGCO"]'); true`);
  await p.send("Page.reload", {});
  await sleep(300);
  await p.waitFor(`${O}.length === 15`, "nút nhóm sau tải lại", 10000);
  assert.deepEqual(await p.ev(daTick), ["TTB"], "nhóm đã nhớ không còn trong groups → bỏ riêng nhóm đó, giữ TTB");
  await p.ev(`localStorage.setItem(${JSON.stringify(KHOA_A)}, '["KHONGCO"]'); true`);
  await p.send("Page.reload", {});
  await sleep(300);
  await p.waitFor(`${O}.length === 15`, "nút nhóm sau tải lại (2)", 10000);
  assert.deepEqual(await p.ev(daTick), [], "toàn nhóm không còn → tất cả");
  await p.ev(moBang);
  await p.ev(tick("TTB"));
  assert.ok(await p.ev(khongTranNgang), "390: không tràn ngang");
  dong(p);
  ok("Tải lại → vẫn 'Nhóm dịch vụ · 1' (TTB); bản nhớ có nhóm không còn → bỏ riêng nhóm đó; toàn nhóm không còn → tất cả");

  // ---- 5) 1040: vẫn nhớ, không tràn ----
  const d = await env.as(ACCOUNTS.salesA, "/order-form", DESK);
  await d.waitFor(`${O}.length === 15 && JSON.stringify(${daTick}) === '["TTB"]'`, "1040: nhớ TTB", 10000);
  assert.equal(await d.ev(nhanNut), "Nhóm dịch vụ · 1");
  await d.ev(moBang);
  assert.equal(await d.ev(bangMo), true);
  assert.ok(await d.ev(khongTranNgang), "1040: không tràn ngang");
  await shot(d, "nhom-xo-xuong-1040-mo.png");
  await d.ev("document.querySelector('.catalog-nhom-dong').click(); true");
  await d.waitFor(`${hang}.length === 23`, "1040: 23 TTB");
  await shot(d, "nhom-xo-xuong-1040-the-thao-bien.png");
  dong(d);
  ok("1040: nhớ 'Thể thao biển', bảng nhóm + danh sách 23, không tràn ngang");

  // ---- 6) Tài khoản khác (Bán hàng B) cùng hồ sơ trình duyệt → tất cả (không nhớ lẫn). Trang của B mở SAU CÙNG. ----
  const b = await env.as(ACCOUNTS.salesB, "/order-form", MOB);
  await b.waitFor(`${O}.length === 15`, "B: nút nhóm", 10000);
  assert.equal(await b.ev(`localStorage.getItem(${JSON.stringify(KHOA_A)})`), '["TTB"]', "tiền đề: bản nhớ của A vẫn nằm trên máy");
  assert.deepEqual(await b.ev(daTick), [], "tài khoản khác không nhớ lẫn nhóm của A");
  assert.equal(await b.ev(nhanNut), "Nhóm dịch vụ");
  assert.equal(KHOA_A, `loc-nhom-dv:${idA}`, "khoá nhớ = loc-nhom-dv:<id tài khoản>");
  await shot(b, "nhom-xo-xuong-390-tai-khoan-khac.png");
  dong(b);
  ok("Bán hàng B cùng máy (A đã nhớ 'Thể thao biển'): B thấy 'Nhóm dịch vụ' không số — nhớ theo tài khoản");

  // ---- 7) localStorage bị chặn (getItem/setItem/removeItem ném lỗi) → tất cả, tick vẫn lọc, không lỗi console ----
  const c = await env.openPage(MOB);
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: "for (const k of ['getItem', 'setItem', 'removeItem']) Storage.prototype[k] = function () { throw new DOMException('bị chặn', 'SecurityError'); };" });
  const ck = await env.login(ACCOUNTS.salesA);
  await c.send("Network.setCookie", { name: ck.name, value: ck.value, url: env.base, httpOnly: true });
  await c.send("Page.navigate", { url: `${env.base}/order-form` });
  await c.waitFor(`${O}.length === 15`, "bị chặn: nút nhóm vẫn hiện", 10000);
  assert.equal(await c.ev("(() => { try { localStorage.getItem('x'); return false; } catch { return true; } })()"), true, "tiền đề: bộ nhớ thật sự bị chặn");
  assert.deepEqual(await c.ev(daTick), [], "bị chặn → không tick nhóm nào (A đã nhớ TTB nhưng không đọc được)");
  await c.ev(moBang);
  await c.ev(tick("TTB"));
  await c.waitFor(`${nhanNut} === 'Nhóm dịch vụ · 1' && ${soNhom} === '23 dịch vụ'`, "bị chặn: tick vẫn lọc");
  dong(c);
  assert.deepEqual(loiConsole, [], "không lỗi console ở mọi trang");
  ok("Bộ nhớ trình duyệt bị chặn: không nhóm nào, tick vẫn lọc (23); không lỗi console ở mọi trang của kịch bản");
  console.log("NHOM XO XUONG SMOKE OK");
} finally {
  await env.stop();
}
