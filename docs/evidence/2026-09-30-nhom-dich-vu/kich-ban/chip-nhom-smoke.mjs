// Kịch bản Chrome (bằng chứng giao diện) cho ô chọn dịch vụ của form lập đơn — bản thiết kế lại 18/10/2026 (đặc tả
// docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/DAC-TA.md mục 3A; đề bài PROMPT-CLAUDE-DESIGN.md mục "A. Chọn dịch vụ").
// LỊCH SỬ: 30/9 (ADR-0058 Đ8, Task A6) là hàng chip một nhóm; 13/10 (đợt 1) đổi thành nút xổ xuống + bảng tick NHIỀU nhóm; 18/10 VIẾT LẠI CÓ CHỦ ĐÍCH
// (chủ duyệt 17/10, đề xuất ADR-0130): bỏ nút xổ, bảng tick, "Đóng", "Bỏ chọn hết"; thay bằng
//   ô tìm "Tìm theo tên hoặc mã dịch vụ" (nút ✕ xoá chữ) → MỘT hàng nút nhóm cuộn ngang (CHỌN MỘT, "Tất cả" đầu, không số đếm, mép phải mờ + "›",
//   nhóm đang chọn luôn trong tầm nhìn) → khung danh sách LUÔN MỞ, cao cố định (token --h-danh-sach), đầu khung "N dịch vụ" / "N dịch vụ · <nhóm>".
//   Chạm dòng = thêm dịch vụ: khung đứng yên (không cuộn nhảy, trang không cuộn), dòng hiện "✓ đã thêm", không thông báo nổi, vùng aria-live đọc
//   "Đã thêm <tên>". Gõ chữ: tìm mọi nhóm, chia mục theo nhóm, hàng nhóm về "Tất cả", nhóm hết kết quả mờ + aria-disabled; chạm nhóm còn sáng để thu hẹp,
//   gõ thêm không nhảy; xoá chữ về nhóm trước khi tìm. "Tất cả": dịch vụ gắn sao chỉ ở mục "★ Hay dùng"; chọn một nhóm: sao lên đầu nhóm.
//   Nhớ nhóm THEO TÀI KHOẢN (khoá loc-nhom-dv:<id>, mảng MỘT mã; bản nhớ cũ nhiều nhóm / chuỗi đơn / rác đọc an toàn). Đơn đủ 20 dịch vụ: ô và khung khoá.
//   Máy tính ≥ 960px: nút ‹ › khi rê chuột / focus vào hàng nhóm, phím mũi tên / Home / End đi giữa các nhóm.
// Dùng lại cơ chế CDP của A2 (startEnv()/ACCOUNTS từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs). startEnv() chèn 3 dịch vụ giả (TD101/TTB03/TTB06) SAU migration
// gieo nhóm nên cả ba ở "Chưa phân loại": kịch bản chèn thêm dịch vụ giả rồi dùng Quản trị gán nhóm qua PUT /api/catalog/group-assignments:
//   Thể thao biển (TTB) 23 = TTB03, TTB06 + 21 dịch vụ TTB07…TTB27 (TTB15/16/17 tên có "Hòn Tằm", TTB15 tên có dấu hai chấm);
//   Tour đảo (TDA) 2 = TD101 + TD902 (tên có "Hòn Tằm"); 12 nhóm còn lại mỗi nhóm một dịch vụ G<mã> (GHTA tên có "Hòn Tằm");
//   Chưa phân loại 2 = ZZ01 (bán được) + ZZ02 (đơn vị theo giờ: "chưa hỗ trợ", dòng mờ). Tổng 39.
// Các trang dùng CHUNG kho cookie (CLAUDE.md §10): mỗi trang đóng xong mới mở trang kế; trang của tài khoản đang xét mở SAU CÙNG.
// Chạy từ GỐC repo (worktree), sau `npm run build:web` (không cần mạng ngoài):
//   node docs/evidence/2026-09-30-nhom-dich-vu/kich-ban/chip-nhom-smoke.mjs
// Ảnh ghi vào $OUT (mặc định docs/evidence/2026-10-18-tao-don-thiet-ke-lai/chon-dich-vu — hồ sơ 30/9 và 13/10 giữ nguyên, không ghi đè).
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-18-tao-don-thiet-ke-lai/chon-dich-vu";
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
// Chỉ khung nhìn (vùng dính cuối trang bị ghép chồng nếu chụp quá khung). Cuộn ô danh mục lên đầu khung trước khi chụp.
const shot = async (p, name) => {
  await p.ev("document.querySelector('.catalog').scrollIntoView({ block: 'start' }); scrollBy(0, -140); true"); // trừ thanh trên cùng + thanh bước dính
  await sleep(200);
  await chupTaiCho(p, name);
};
/** Chụp đúng khung nhìn hiện tại, KHÔNG cuộn (giữ trạng thái rê chuột). */
const chupTaiCho = async (p, name) => writeFileSync(join(OUT, name), Buffer.from((await p.send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));

const Q = "document.getElementById('catalog-q')";
const LIST = "document.getElementById('catalog-list')";
const KHUNG = "document.querySelector('.catalog .catalog-khung')";
const HANG = "document.querySelector('.catalog .catalog-hang')";
const CUON = "document.querySelector('.catalog .catalog-hang-cuon')";
const NUTS = "[...document.querySelectorAll('.catalog .catalog-hang-cuon .catalog-nut-nhom')]";
const nut = (ma) => `document.querySelector('.catalog .catalog-hang-cuon .catalog-nut-nhom[data-nhom="${ma}"]')`;
const DANG_CHON = `(${NUTS}.filter((b) => b.getAttribute('aria-checked') === 'true').map((b) => b.dataset.nhom).join('|'))`;
const MO = `${NUTS}.filter((b) => b.getAttribute('aria-disabled') === 'true').map((b) => b.dataset.nhom)`;
const DAU = "document.querySelector('.catalog .catalog-khung .catalog-dau').textContent";
const MA = "[...document.querySelectorAll('#catalog-list .catalog-row')].map((r) => r.dataset.ma)";
const MUC = "[...document.querySelectorAll('#catalog-list .catalog-muc')].map((m) => m.textContent)";
const row = (ma) => `document.querySelector('#catalog-list .catalog-row[data-ma="${ma}"]')`;
const maTrongKhoi = (khoa) => `[...document.querySelectorAll('#catalog-list .catalog-khoi[data-khoa="${khoa}"] .catalog-row')].map((r) => r.dataset.ma)`;
const BAO = "document.querySelector('.catalog .catalog-bao').textContent";
const XOA = "document.querySelector('.catalog .catalog-tim-xoa')";
const CARDS = "document.querySelectorAll('#services .svc')";
const hien = (el) => `(() => { const e = ${el}; return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; })()`;
const khongTranNgang = "document.documentElement.scrollWidth - innerWidth <= 0";
const mau = (token) => `(() => { const s = document.createElement('span'); s.style.color = 'var(${token})'; document.body.append(s); const c = getComputedStyle(s).color; s.remove(); return c; })()`;
const doCuon = `(() => ({ t: Math.round(${LIST}.scrollTop), y: Math.round(scrollY), k: Math.round(${KHUNG}.getBoundingClientRect().top) }))()`;
/** Nút nhóm `ma` nằm trọn trong vùng nhìn thấy của hàng cuộn. */
const trongTam = (ma) => `(() => { const b = ${nut(ma)}, c = ${CUON}.getBoundingClientRect(), r = b.getBoundingClientRect(); return r.left >= c.left - 1 && r.right <= c.right + 1; })()`;
const phim = async (p, key, code) => {
  await p.send("Input.dispatchKeyEvent", { type: "keyDown", key, code: key, windowsVirtualKeyCode: code });
  await p.send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: code });
};
const TAT_CA_NHOM = ["", "TDA", "LPH", "HTA", "VHB", "VIN", "DTH", "TTB", "IRS", "KON", "TTR", "NHD", "TBA", "TXE", "BUS", "chua-phan-loai"];

const env = await startEnv();
const loiConsole = [];
const dong = (p) => {
  loiConsole.push(...p.consoleErrors.filter((e) => !/favicon/.test(e)));
  p.close();
};
try {
  // ---- Dữ liệu ----
  const T = "'2026-01-01T00:00:00.000Z'";
  const them = Array.from({ length: 21 }, (_, i) => `TTB${String(i + 7).padStart(2, "0")}`);
  const TEN_RIENG = { TTB15: ["Motor nước: Jetski L2 (30 phút) Hòn Tằm", 1400000], TTB16: ["Motor nước: Jetski L2 (15 phút) Hòn Tằm", 800000], TTB17: ["Lặn với ống thở (snorkeling) Hòn Tằm", 400000] };
  const NHOM_KHAC = ["LPH", "HTA", "VHB", "VIN", "DTH", "IRS", "KON", "TTR", "NHD", "TBA", "TXE", "BUS"];
  const nhomCon = env.sql("SELECT code FROM ctl_group WHERE active = 1 AND code NOT IN ('TDA','TTB') ORDER BY sort_order").map((r) => r.code);
  assert.deepEqual([...nhomCon].sort(), [...NHOM_KHAC].sort(), `12 nhóm gieo còn lại: ${nhomCon.join(",")}`);
  const dongTTB = them.map((c, i) => {
    const [ten, gia] = TEN_RIENG[c] ?? [`Trò biển ${i + 7}`, 300000 + i * 10000];
    return `('${c}','${ten}','perPax',${gia},${10 + i},1,${T},${T})`;
  });
  const dongNhom = nhomCon.map((g, i) => `('G${g}','${g === "HTA" ? "Vé Hòn Tằm: Cano + tắm bùn + tắm biển" : `Dịch vụ nhóm ${g}`}','perPax',400000,${50 + i},1,${T},${T})`);
  env.sql(`INSERT INTO catalog_item (code,name,unit,price_adult,sheet_row,in_sheet,first_seen_at,updated_at) VALUES ${[
    ...dongTTB,
    ...dongNhom,
    `('TD902','Tour 2 đảo: Hòn Mun + Hòn Tằm + buffet trưa','perPax',1350000,5,1,${T},${T})`,
    `('ZZ01','Dịch vụ mới chưa gán nhóm','perPax',500000,40,1,${T},${T})`,
    `('ZZ02','Dịch vụ tính theo giờ','perHour',500000,41,1,${T},${T})`,
  ].join(",")}`);
  const ad = await env.login(ACCOUNTS.admin);
  const gan = async (codes, groupCode) => {
    const r = await fetch(`${env.base}/api/catalog/group-assignments`, { method: "PUT", headers: { "content-type": "application/json", origin: env.base, cookie: `${ad.name}=${ad.value}` }, body: JSON.stringify({ codes, groupCode }) });
    const text = await r.text();
    assert.equal(r.status, 200, `gán nhóm ${groupCode}: ${r.status} ${text}`);
    return JSON.parse(text);
  };
  assert.equal((await gan(["TTB03", "TTB06", ...them], "TTB")).doi, 23);
  assert.equal((await gan(["TD101", "TD902"], "TDA")).doi, 2);
  for (const g of nhomCon) assert.equal((await gan([`G${g}`], g)).doi, 1);
  const sa = await env.login(ACCOUNTS.salesA);
  const dm = await (await fetch(`${env.base}/api/catalog/for-order`, { headers: { cookie: `${sa.name}=${sa.value}` } })).json();
  assert.equal(dm.items.length, 39, "for-order: 39 dịch vụ");
  assert.equal(dm.items.filter((c) => c.groupCode === "TTB").length, 23, "for-order: 23 dịch vụ TTB");
  assert.deepEqual(dm.items.filter((c) => c.groupCode === null).map((c) => c.code).sort(), ["ZZ01", "ZZ02"], "for-order: ZZ01 + ZZ02 chưa phân loại");
  const TEN_NHOM = dm.groups.map((x) => x.name);
  assert.equal(TEN_NHOM.length, 14, "14 nhóm gieo sẵn");
  ok("Dữ liệu: 39 dịch vụ — Thể thao biển 23, Tour đảo 2, 12 nhóm khác mỗi nhóm 1, Chưa phân loại 2 (ZZ02 chưa hỗ trợ); 'Hòn Tằm' ở Tour đảo, Hòn Tằm, Thể thao biển");

  // ---- 1) Bán hàng A, 390: ô tìm → hàng nhóm → khung luôn mở; không còn nút xổ / bảng tick / Đóng / Bỏ chọn hết ----
  const p = await env.as(ACCOUNTS.salesA, "/order-form", MOB);
  const idA = await p.ev("fetch('/api/auth/me').then((r) => r.json()).then((j) => j.staff.id)");
  await p.waitFor(`${NUTS}.length === 16 && ${MA}.length === 39`, "hàng nhóm 16 nút (Tất cả + 14 nhóm + Chưa phân loại) + khung 39 dòng", 10000);
  assert.deepEqual(await p.ev(`${NUTS}.map((b) => b.dataset.nhom)`), TAT_CA_NHOM, "thứ tự nút: Tất cả, 14 nhóm theo thứ tự Quản trị, Chưa phân loại cuối");
  assert.deepEqual(await p.ev(`${NUTS}.map((b) => b.textContent)`), ["Tất cả", ...TEN_NHOM, "Chưa phân loại"], "chữ trên nút = tên nhóm");
  assert.equal(await p.ev(`${NUTS}.some((b) => /\\d/.test(b.textContent))`), false, "nút nhóm không có số đếm");
  assert.equal(await p.ev(DANG_CHON), "", "mặc định: 'Tất cả' đang chọn (aria-checked) — chọn MỘT");
  assert.equal(await p.ev(`${CUON}.getAttribute('role') + '|' + ${CUON}.getAttribute('aria-label')`), "radiogroup|Nhóm dịch vụ");
  assert.equal(await p.ev(`${NUTS}.every((b) => b.getAttribute('role') === 'radio')`), true, "mỗi nút nhóm là radio");
  assert.equal(await p.ev(`${NUTS}.filter((b) => b.tabIndex === 0).map((b) => b.dataset.nhom).join('|')`), "", "chỉ nút đang chọn nhận Tab (roving tabindex)");
  assert.ok((await p.ev(`Math.min(...${NUTS}.map((b) => b.getBoundingClientRect().height))`)) >= 44, "nút nhóm cao ≥ 44px");
  assert.equal(await p.ev(`${CUON}.scrollWidth > ${CUON}.clientWidth`), true, "390: hàng nhóm dài hơn khung — cuộn ngang được");
  assert.equal(await p.ev(`getComputedStyle(${CUON}).overflowX`), "auto");
  assert.equal(await p.ev(hien("document.querySelector('.catalog .catalog-hang-con')")), true, "mép phải mờ + dấu '›' báo còn nhóm phía sau");
  assert.equal(await p.ev("document.querySelector('.catalog .catalog-hang-con').textContent"), "›");
  assert.equal(await p.ev(`${hien(LIST)} && !${LIST}.hidden`), true, "khung danh sách LUÔN MỞ khi chưa chạm ô tìm");
  assert.equal(await p.ev(`Math.round(parseFloat(getComputedStyle(${LIST}).height))`), 392, "390: khung cao cố định 392px (--h-danh-sach, ~7 dòng)");
  assert.equal(await p.ev(`getComputedStyle(${LIST}).overflowY`), "auto", "khung cuộn bên trong");
  assert.equal(await p.ev(DAU), "39 dịch vụ", "đầu khung đếm từ dữ liệu lúc chạy");
  assert.deepEqual(await p.ev(MUC), [...TEN_NHOM, "Chưa phân loại"], "Tất cả: chia mục theo nhóm (chưa có sao nên không có mục Hay dùng)");
  assert.equal(await p.ev("document.querySelectorAll('#catalog-nhom-nut, #catalog-nhom-bang, .catalog-nhom, .catalog-dong, .catalog-nhom-bo, .catalog-nhom-dong').length"), 0, "không còn nút xổ, bảng tick, nút Đóng, Bỏ chọn hết");
  assert.equal(await p.ev("/Bỏ chọn hết|Đóng/.test(document.querySelector('.catalog').textContent)"), false, "không còn chữ 'Bỏ chọn hết' / 'Đóng'");
  assert.deepEqual(await p.ev(`[${Q}.placeholder, ${Q}.getAttribute('aria-label'), ${Q}.type]`), ["Tìm theo tên hoặc mã dịch vụ", "Tìm theo tên hoặc mã dịch vụ", "search"]);
  assert.equal(await p.ev(`!!(${Q}.compareDocumentPosition(${HANG}) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(${HANG}.compareDocumentPosition(${KHUNG}) & Node.DOCUMENT_POSITION_FOLLOWING)`), true, "thứ tự: ô tìm → hàng nhóm → khung");
  assert.equal(await p.ev(`!!(${KHUNG}.compareDocumentPosition(document.getElementById('services')) & Node.DOCUMENT_POSITION_FOLLOWING)`), true, "thẻ dịch vụ nằm dưới khung");
  assert.equal(await p.ev(`${HANG}.dataset.cho`), "nhom", "điểm gắn data-cho=nhom");
  assert.equal(await p.ev(hien(XOA)), false, "ô trống: chưa có nút ✕");
  assert.ok(await p.ev(khongTranNgang), "390: trang không tràn ngang");
  await shot(p, "390-vua-mo.png");
  // Khung 392px kéo xuống dưới thanh Lưu dính đáy: tiêu đề mục (dính trong khung) KHÔNG được vẽ đè lên thanh (lỗi thấy ở ảnh lần chạy đầu 18/10: "HARBOUR" đè nút Lưu).
  assert.equal(await p.ev(`(() => { const k = ${KHUNG}.getBoundingClientRect(), s = document.getElementById('save').getBoundingClientRect(); return k.bottom > s.top; })()`), true, "tiền đề: khung chạy dưới thanh Lưu ở khung nhìn này");
  // Dò mọi điểm (cách 2px) của dải mà khung và thanh dính đáy chồng lên nhau, ở ba cột: phải là thanh (.form-actions), không phải phần tử của khung.
  assert.deepEqual(await p.ev(`(() => { const k = ${KHUNG}.getBoundingClientRect(), b = document.querySelector('.form-actions').getBoundingClientRect(), ra = []; for (let y = Math.ceil(b.top) + 1; y < Math.min(k.bottom, b.bottom); y += 2) for (const x of [k.left + 8, k.left + k.width / 2, k.right - 8]) { const e = document.elementFromPoint(x, y); if (e && e.closest('.catalog')) ra.push(Math.round(y) + ':' + e.className); } return ra.slice(0, 5); })()`), [], "thanh dính đáy không bị khung (tiêu đề mục dính) vẽ đè");
  ok("390: ô tìm → hàng 16 nút nhóm (Tất cả đầu, không số, chọn một, cuộn ngang, mép mờ + ›) → khung luôn mở 392px '39 dịch vụ' chia mục theo nhóm; không còn nút xổ / bảng tick / Đóng / Bỏ chọn hết");

  // ---- 2) Chạm "Thể thao biển" MỘT lần → khung lọc liền, nhóm vào tầm nhìn, nhớ theo tài khoản ----
  await p.ev(`${nut("TTB")}.click(); true`);
  assert.equal(await p.ev(DANG_CHON), "TTB", "một chạm: Thể thao biển đang chọn, Tất cả bỏ chọn");
  assert.equal(await p.ev(DAU), "23 dịch vụ · Thể thao biển");
  assert.equal(await p.ev(`${MA}.length === 23 && ${MA}.every((c) => c.startsWith('TTB'))`), true, "khung chỉ còn 23 dịch vụ TTB");
  assert.deepEqual(await p.ev(MUC), [], "chọn một nhóm: không chia mục");
  assert.equal(await p.ev(`${hien(LIST)} && ${LIST}.scrollTop === 0`), true, "danh sách không biến mất, về đầu khung");
  assert.equal(await p.ev(trongTam("TTB")), true, "nhóm đang chọn nằm trong tầm nhìn của hàng nhóm");
  assert.equal(await p.ev(`${nut("TTB")}.tabIndex`), 0);
  const KHOA_A = await p.ev("Object.keys(localStorage).find((k) => k.startsWith('loc-nhom-dv:')) ?? ''");
  assert.equal(await p.ev(`localStorage.getItem(${JSON.stringify(KHOA_A)})`), '["TTB"]', "nhớ trên máy: mảng MỘT mã");
  assert.ok(await p.ev(khongTranNgang), "390: không tràn ngang");
  ok("Chạm 'Thể thao biển' một lần: lọc liền 23 dòng, '23 dịch vụ · Thể thao biển', nhóm trong tầm nhìn, nhớ [\"TTB\"] ở loc-nhom-dv:<id>");

  // ---- 3) Một dòng: sao + nút chọn anh em; tên tách trước dấu ':' màu chữ phụ, không cắt; mã ở dòng phụ; giá thẳng cột, không ₫; đơn vị chỉ cho giá nhóm ----
  const r15 = row("TTB15");
  assert.equal(await p.ev(`(() => { const r = ${r15}; return r.children.length === 2 && r.children[0].matches('button.catalog-ghim') && r.children[1].matches('button.catalog-pick') && !r.querySelector('.catalog-pick button'); })()`), true, "dòng = nút sao + nút chọn (anh em, không lồng)");
  assert.equal(await p.ev(`${r15}.querySelector('.catalog-ten').textContent`), "Motor nước: Jetski L2 (30 phút) Hòn Tằm", "tên đủ, không cắt bớt chữ");
  assert.equal(await p.ev(`${r15}.querySelector('.catalog-ten-dau').textContent`), "Motor nước:", "phần trước dấu hai chấm tách riêng");
  assert.equal(await p.ev(`getComputedStyle(${r15}.querySelector('.catalog-ten-dau')).color`), await p.ev(mau("--c-text-muted")), "phần trước ':' màu chữ phụ");
  assert.equal(await p.ev(`getComputedStyle(${r15}.querySelector('.catalog-ten')).color`), await p.ev(mau("--c-text")), "phần sau ':' màu chữ chính");
  assert.equal(await p.ev(`(() => { const t = ${r15}.querySelector('.catalog-ten'), s = getComputedStyle(t); return s.textOverflow !== 'ellipsis' && s.whiteSpace !== 'nowrap' && t.scrollWidth <= t.clientWidth + 1; })()`), true, "tên xuống dòng tự nhiên, không bị cắt");
  assert.equal(await p.ev(`${r15}.querySelector('.catalog-phu .catalog-ma').textContent`), "TTB15", "mã ở dòng phụ");
  assert.equal(await p.ev(`${r15}.querySelector('.catalog-gia-so').textContent`), "1.400.000", "giá người lớn không ký hiệu ₫");
  assert.equal(await p.ev(`/₫/.test(${LIST}.textContent)`), false, "danh sách không có '₫'");
  assert.match(await p.ev(`getComputedStyle(${r15}.querySelector('.catalog-gia-so')).fontVariantNumeric`), /tabular-nums/, "chữ số đều cột");
  assert.equal(await p.ev(`new Set([...document.querySelectorAll('#catalog-list .catalog-gia')].map((g) => Math.round(g.getBoundingClientRect().right))).size`), 1, "cột giá thẳng mép phải");
  assert.equal(await p.ev(`${r15}.querySelector('.catalog-gia-dv')`), null, "dịch vụ theo người: không ghi đơn vị");
  assert.equal(await p.ev(`${row("TTB03")}.querySelector('.catalog-gia-dv').textContent`), "theo nhóm 5 khách/lượt", "dịch vụ theo nhóm: đơn vị dưới giá (unitLabel)");
  assert.ok((await p.ev("Math.min(...[...document.querySelectorAll('#catalog-list .catalog-row')].map((r) => r.getBoundingClientRect().height))")) >= 44, "mỗi dòng cao ≥ 44px");
  assert.equal(await p.ev("[...document.querySelectorAll('#catalog-list .catalog-pick')].some((b) => b.hasAttribute('aria-disabled') || b.hasAttribute('role'))"), false, "dòng chọn được: không aria-disabled, không role");
  ok("Dòng: ☆ + nút chọn anh em ≥ 44px; 'Motor nước:' màu chữ phụ, phần sau màu chính, tên không cắt; mã ở dòng phụ; giá '1.400.000' không ₫, tabular-nums, thẳng mép; chỉ dịch vụ theo nhóm ghi 'theo nhóm 5 khách/lượt'");

  // ---- 4) Chạm dòng Jetski: thêm thẻ, khung đứng yên, '✓ đã thêm' tại chỗ, không thông báo nổi, aria-live đọc ----
  await p.ev(`${KHUNG}.scrollIntoView({ block: 'center' }); (() => { const l = ${LIST}, r = ${r15}; l.scrollTop += r.getBoundingClientRect().top - l.getBoundingClientRect().top - 120; window.__dong = r; return true; })()`);
  await sleep(200);
  const c0 = await p.ev(doCuon);
  assert.ok(c0.t > 0, `tiền đề: khung đã cuộn xuống (scrollTop ${c0.t})`);
  await p.ev("window.__dong.querySelector('.catalog-pick').click(); true");
  await p.waitFor(`${CARDS}.length === 1`, "thẻ Jetski được thêm");
  await sleep(400);
  assert.deepEqual(await p.ev(doCuon), c0, "chạm dòng: khung KHÔNG cuộn nhảy, trang không cuộn");
  assert.equal(await p.ev(`${r15} === window.__dong`), true, "dòng là CHÍNH phần tử cũ (khung không dựng lại)");
  assert.equal(await p.ev("window.__dong.querySelector('.catalog-pick .chip-picked')?.textContent"), "✓ đã thêm", "dòng hiện '✓ đã thêm'");
  await p.waitFor(`${BAO} === 'Đã thêm Motor nước: Jetski L2 (30 phút) Hòn Tằm'`, "vùng aria-live đọc 'Đã thêm <tên>'");
  assert.equal(await p.ev("document.querySelector('.catalog .catalog-bao').getAttribute('aria-live')"), "polite");
  assert.equal(await p.ev("document.querySelectorAll('.toast-bao').length"), 0, "không có thông báo nổi");
  assert.equal(await p.ev(`${Q}.value`), "", "ô tìm không bị đụng");
  assert.equal(await p.ev(`(() => { const k = ${KHUNG}, c = ${CARDS}[0]; return !!(k.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) && c.getBoundingClientRect().top >= k.getBoundingClientRect().bottom; })()`), true, "thẻ mới hiện bên dưới khung");
  await shot(p, "390-the-thao-bien-da-them.png");
  await p.ev("window.__dong.querySelector('.catalog-pick').click(); true");
  await p.waitFor(`${CARDS}.length === 2`, "chạm lại vẫn thêm được (không chặn chọn trùng)");
  assert.equal(await p.ev("window.__dong.querySelectorAll('.chip-picked').length"), 1, "vẫn một nhãn '✓ đã thêm'");
  for (let i = 0; i < 2; i++) await p.ev("document.querySelector('#services .svc .svc-remove').click(); true");
  await p.waitFor(`${CARDS}.length === 0`, "xoá hai thẻ");
  assert.equal(await p.ev(`${r15} === window.__dong && window.__dong.querySelector('.chip-picked') === null`), true, "xoá hết thẻ: nhãn '✓ đã thêm' gỡ tại chỗ");
  ok("Chạm dòng Jetski: thêm thẻ (dưới khung), khung và trang đứng yên, dòng hiện '✓ đã thêm' tại chỗ, không thông báo nổi, aria-live 'Đã thêm …'; chạm lại vẫn thêm; xoá thẻ thì gỡ nhãn tại chỗ");

  // ---- 5) Gõ "hòn tằm": về Tất cả, chia mục theo nhóm, nhóm hết kết quả mờ; thu hẹp; gõ thêm không nhảy; ✕ về nhóm trước khi tìm ----
  await p.ev(setInput(Q, "hòn tằm"));
  await p.waitFor(`${DANG_CHON} === '' && ${DAU} === '5 dịch vụ'`, "gõ chữ: hàng nhóm về Tất cả, 5 kết quả");
  assert.deepEqual(await p.ev(MUC), ["Tour đảo", "Hòn Tằm", "Thể thao biển"], "kết quả chia mục theo nhóm (thứ tự Quản trị)");
  assert.deepEqual((await p.ev(MA)).sort(), ["GHTA", "TD902", "TTB15", "TTB16", "TTB17"]);
  const moDuKien = ["LPH", "VHB", "VIN", "DTH", "IRS", "KON", "TTR", "NHD", "TBA", "TXE", "BUS", "chua-phan-loai"];
  assert.deepEqual(await p.ev(MO), moDuKien, "nhóm không có kết quả: aria-disabled");
  assert.equal(await p.ev(`${NUTS}.filter((b) => b.getAttribute('aria-disabled') === 'true').every((b) => Number(getComputedStyle(b).opacity) < 1)`), true, "nhóm không có kết quả mờ đi");
  assert.equal(await p.ev(`${NUTS}.some((b) => /\\d/.test(b.textContent))`), false, "đang tìm: nút vẫn không có số");
  assert.equal(await p.ev(hien(XOA)), true, "có chữ: hiện nút ✕");
  assert.equal(await p.ev(`${XOA}.getAttribute('aria-label')`), "Xoá chữ tìm");
  await shot(p, "390-go-hon-tam.png");
  await p.ev(`${nut("LPH")}.click(); true`);
  assert.equal(await p.ev(`${DANG_CHON} + '|' + ${DAU}`), "|5 dịch vụ", "chạm nhóm mờ: không có tác dụng");
  await p.ev(`${nut("HTA")}.click(); true`);
  assert.equal(await p.ev(DANG_CHON), "HTA", "chạm nhóm còn sáng: thu hẹp");
  assert.equal(await p.ev(DAU), "1 dịch vụ · Hòn Tằm");
  assert.deepEqual(await p.ev(MA), ["GHTA"]);
  await p.ev(setInput(Q, "hòn tằm: cano"));
  await p.waitFor(`${MA}.join() === 'GHTA'`, "gõ thêm");
  assert.equal(await p.ev(DANG_CHON), "HTA", "đã thu hẹp: gõ thêm KHÔNG nhảy về Tất cả");
  assert.equal(await p.ev(`localStorage.getItem(${JSON.stringify(KHOA_A)})`), '["TTB"]', "chạm nhóm lúc đang tìm không ghi đè bản nhớ");
  await p.ev(`${XOA}.click(); true`);
  await p.waitFor(`${Q}.value === '' && ${DANG_CHON} === 'TTB'`, "✕: xoá chữ, về nhóm đã chọn trước khi tìm");
  assert.equal(await p.ev(DAU), "23 dịch vụ · Thể thao biển");
  assert.equal(await p.ev("document.activeElement && document.activeElement.id"), "catalog-q", "✕: con trỏ về ô tìm");
  assert.equal(await p.ev(hien(XOA)), false, "ô trống: ẩn ✕");
  assert.deepEqual(await p.ev(MO), [], "hết tìm: không nhóm nào mờ");
  await p.ev(setInput(Q, "khong-co"));
  await p.waitFor(`${DAU} === '0 dịch vụ'`, "không khớp");
  assert.match(await p.ev(`${LIST}.textContent`), /Không tìm thấy dịch vụ/);
  assert.equal(await p.ev("document.querySelector('#catalog-list .catalog-empty').getAttribute('role')"), "status");
  assert.deepEqual(await p.ev(MO), TAT_CA_NHOM.slice(1), "không khớp: mọi nhóm mờ (trừ Tất cả)");
  await p.ev(setInput(Q, ""));
  await p.waitFor(`${DANG_CHON} === 'TTB' && ${DAU} === '23 dịch vụ · Thể thao biển'`, "xoá chữ bằng bàn phím: về Thể thao biển");
  ok("Gõ 'hòn tằm': về Tất cả, 3 mục Tour đảo / Hòn Tằm / Thể thao biển, 12 nhóm mờ + aria-disabled (không số); nhóm mờ chạm không tác dụng; thu hẹp Hòn Tằm, gõ thêm không nhảy, không ghi bản nhớ; ✕ về Thể thao biển, con trỏ về ô; không khớp: mọi nhóm mờ, câu 'Không tìm thấy dịch vụ…' role=status");

  // ---- 6) Dòng không chọn được: mờ, aria-disabled (không disabled), chạm không tác dụng ----
  await p.ev(`${nut("chua-phan-loai")}.click(); true`);
  assert.equal(await p.ev(DAU), "2 dịch vụ · Chưa phân loại");
  const dz = await p.ev(`(() => { const b = ${row("ZZ02")}.querySelector('.catalog-pick'), s = getComputedStyle(b); return { aria: b.getAttribute('aria-disabled'), dis: b.disabled, op: Number(s.opacity), cur: s.cursor, text: b.textContent }; })()`);
  assert.deepEqual([dz.aria, dz.dis, dz.op < 1, dz.cur], ["true", false, true, "not-allowed"], `ZZ02: ${JSON.stringify(dz)}`);
  assert.match(dz.text, /chưa hỗ trợ/, "ghi rõ 'chưa hỗ trợ', đọc được bằng trình đọc màn hình");
  assert.equal(await p.ev(`${row("ZZ01")}.querySelector('.catalog-pick').hasAttribute('aria-disabled')`), false);
  const baoTruoc = await p.ev(BAO);
  await p.ev(`${row("ZZ02")}.querySelector('.catalog-pick').click(); true`);
  await sleep(300);
  assert.equal(await p.ev(`${CARDS}.length`), 0, "chạm dòng mờ: không thêm thẻ");
  assert.equal(await p.ev(BAO), baoTruoc, "chạm dòng mờ: không báo gì");
  await p.ev(`${nut("TTB")}.click(); true`);
  ok("Dòng 'chưa hỗ trợ' (ZZ02): aria-disabled=true, không disabled, mờ, con trỏ not-allowed, chạm không thêm thẻ");

  // ---- 7) Sao: bấm đổi tại chỗ; Tất cả → chỉ ở mục '★ Hay dùng'; chọn nhóm → lên đầu nhóm ----
  await p.ev(`(() => { const l = ${LIST}, r = ${row("TTB20")}; l.scrollTop += r.getBoundingClientRect().top - l.getBoundingClientRect().top - 120; window.__sao = r.querySelector('.catalog-ghim'); window.__sao.focus(); return true; })()`);
  await sleep(150);
  const maTruoc = await p.ev(MA);
  const s0 = await p.ev(doCuon);
  assert.equal(await p.ev("window.__sao.textContent + '|' + window.__sao.getAttribute('aria-pressed') + '|' + window.__sao.dataset.ghim"), "☆|false|TTB20");
  await p.ev("window.__sao.click(); true");
  assert.equal(await p.ev("window.__sao.textContent + '|' + window.__sao.getAttribute('aria-pressed')"), "★|true", "gắn sao tại chỗ");
  assert.deepEqual(await p.ev(doCuon), s0, "gắn sao: vị trí cuộn không đổi");
  assert.deepEqual(await p.ev(MA), maTruoc, "gắn sao: thứ tự dòng không đổi (chưa sắp lại)");
  assert.equal(await p.ev(`${row("TTB20")}.querySelector('.catalog-ghim') === window.__sao && document.activeElement === window.__sao`), true, "nút sao cũ, focus giữ nguyên");
  await p.ev(`${nut("")}.click(); true`);
  assert.equal(await p.ev(DAU), "39 dịch vụ");
  assert.equal((await p.ev(MUC))[0], "★ Hay dùng", "Tất cả: mục '★ Hay dùng' đứng đầu");
  assert.deepEqual(await p.ev(maTrongKhoi("hay-dung")), ["TTB20"]);
  assert.equal((await p.ev(maTrongKhoi("TTB"))).includes("TTB20"), false, "dịch vụ có sao KHÔNG lặp ở mục nhóm của nó");
  assert.equal(await p.ev(`${MA}.length`), 39, "không dòng nào lặp");
  await shot(p, "390-tat-ca-hay-dung.png");
  await p.ev(`${nut("TTB")}.click(); true`);
  assert.equal((await p.ev(MA))[0], "TTB20", "chọn nhóm: dịch vụ có sao lên đầu nhóm");
  ok("Sao: bấm đổi ☆/★ tại chỗ (cuộn, thứ tự, focus giữ); Tất cả: TTB20 chỉ ở mục '★ Hay dùng' đầu khung, không lặp; Thể thao biển: TTB20 đứng đầu");

  // ---- 8) Đơn đủ 20 dịch vụ: ô tìm và khung khoá, câu "Đơn đã đủ 20 dịch vụ." ----
  for (let i = 0; i < 20; i++) await p.ev(`${row("TTB15")}.querySelector('.catalog-pick').click(); true`);
  await p.waitFor(`${CARDS}.length === 20`, "20 thẻ");
  await p.waitFor(`${Q}.disabled`, "ô tìm khoá");
  assert.equal(await p.ev("document.querySelector('.catalog > p.muted').textContent"), "Đơn đã đủ 20 dịch vụ.");
  assert.equal(await p.ev(hien("document.querySelector('.catalog > p.muted')")), true);
  assert.equal(await p.ev(`${KHUNG}.inert && ${HANG}.inert`), true, "khung và hàng nhóm khoá (inert)");
  assert.equal(await p.ev(`Number(getComputedStyle(${KHUNG}).opacity) < 1`), true, "khung khoá hiện mờ");
  await p.ev(`${row("TTB16")}.querySelector('.catalog-pick').click(); ${nut("")}.click(); true`);
  await sleep(300);
  assert.equal(await p.ev(`${CARDS}.length + '|' + ${DANG_CHON}`), "20|TTB", "khoá: chạm dòng / nhóm không tác dụng");
  await shot(p, "390-du-20.png");
  await p.ev("document.querySelector('#services .svc .svc-remove').click(); true");
  await p.waitFor(`!${Q}.disabled && !${KHUNG}.inert && !${HANG}.inert && document.querySelector('.catalog > p.muted').hidden`, "bớt một dịch vụ: mở khoá");
  ok("Đơn đủ 20 dịch vụ: ô tìm disabled, khung + hàng nhóm inert và mờ, câu 'Đơn đã đủ 20 dịch vụ.'; chạm không tác dụng; bớt một thì mở lại");

  // ---- 9) Tải lại → nhớ đúng nhóm; bản nhớ cũ / hỏng đọc an toàn ----
  const taiLai = async (pg, what) => {
    await pg.send("Page.reload", {});
    await sleep(300);
    await pg.waitFor(`${NUTS}.length === 16 && ${MA}.length > 0`, what, 10000);
  };
  await taiLai(p, "tải lại");
  assert.equal(await p.ev(DANG_CHON), "TTB", "tải lại: nhớ Thể thao biển");
  assert.equal(await p.ev(DAU), "23 dịch vụ · Thể thao biển");
  assert.equal(await p.ev(trongTam("TTB")), true, "tải lại: nhóm đã nhớ được cuộn vào tầm nhìn");
  assert.equal(await p.ev(`(${MA})[0]`), "TTB20", "sao vẫn nhớ (td.dmLoc.v1)");
  for (const [raw, mong, dau, ten] of [
    ['["TDA","TTB"]', "TDA", "2 dịch vụ · Tour đảo", "bản nhớ cũ nhiều nhóm → nhóm hợp lệ đầu"],
    ['"TTB"', "TTB", "23 dịch vụ · Thể thao biển", "bản nhớ cũ chuỗi đơn"],
    ['["KHONGCO","TTB"]', "TTB", "23 dịch vụ · Thể thao biển", "nhóm đã xoá bị bỏ qua"],
    ['["KHONGCO"]', "", "39 dịch vụ", "toàn nhóm đã xoá → Tất cả"],
    ['"hay-dung"', "", "39 dịch vụ", "mã của bộ lọc đã bỏ → Tất cả"],
    ["{hỏng", "", "39 dịch vụ", "JSON hỏng → Tất cả"],
  ]) {
    await p.ev(`localStorage.setItem(${JSON.stringify(KHOA_A)}, ${JSON.stringify(raw)}); true`);
    await taiLai(p, ten);
    assert.equal(await p.ev(`${DANG_CHON} + '|' + ${DAU}`), `${mong}|${dau}`, ten);
  }
  await p.ev(`localStorage.setItem('td.dmLoc.v1', JSON.stringify({ loc: 'theo-nguoi', ghim: ['TTB06'] })); localStorage.removeItem(${JSON.stringify(KHOA_A)}); true`);
  await taiLai(p, "bản nhớ sao kiểu cũ");
  assert.equal(await p.ev(`${DANG_CHON} + '|' + ${DAU}`), "|39 dịch vụ", "bộ lọc 'theo-nguoi' cũ không lọc ngầm");
  assert.deepEqual(await p.ev(maTrongKhoi("hay-dung")), ["TTB06"], "mã sao của bản nhớ cũ vẫn giữ");
  await p.ev(`${nut("TTB")}.click(); true`);
  assert.equal(await p.ev(`localStorage.getItem(${JSON.stringify(KHOA_A)})`), '["TTB"]');
  dong(p);
  ok("Tải lại: nhớ Thể thao biển (cuộn vào tầm nhìn), sao giữ; bản nhớ cũ nhiều nhóm → nhóm hợp lệ đầu, chuỗi đơn đọc được, nhóm đã xoá / 'hay-dung' / JSON hỏng → Tất cả; bộ lọc 'theo-nguoi' cũ không lọc ngầm");

  // ---- 10) 1040: khung ~8 dòng; ‹ › khi rê chuột / focus; phím mũi tên, Home, End ----
  const d = await env.as(ACCOUNTS.salesA, "/order-form", DESK);
  await d.waitFor(`${NUTS}.length === 16 && ${DANG_CHON} === 'TTB' && ${MA}.length === 23`, "1040: nhớ Thể thao biển", 10000);
  assert.equal(await d.ev(`Math.round(parseFloat(getComputedStyle(${LIST}).height))`), 448, "1040: khung cao 448px (~8 dòng)");
  assert.equal(await d.ev(trongTam("TTB")), true, "1040: nhóm đã nhớ trong tầm nhìn");
  const MUI = "[...document.querySelectorAll('.catalog .catalog-hang-mui')]";
  const muiHien = `${MUI}.filter((b) => b.getClientRects().length > 0).map((b) => b.dataset.huong)`;
  await d.ev(`document.querySelector('.catalog').scrollIntoView({ block: 'center' }); document.activeElement?.blur(); true`);
  await d.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
  await sleep(150);
  assert.deepEqual(await d.ev(muiHien), [], "chưa rê chuột: không có nút ‹ ›");
  const tam = await d.ev(`(() => { const r = ${HANG}.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  await d.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: tam.x, y: tam.y });
  await sleep(150);
  const khiRe = await d.ev(muiHien);
  assert.ok(khiRe.length > 0, `rê chuột lên hàng nhóm: hiện nút ‹ / › (${JSON.stringify(khiRe)})`);
  assert.equal(await d.ev(`${MUI}.every((b) => b.getAttribute('aria-label') && b.tabIndex === -1)`), true, "nút ‹ › có tên, không chen vào thứ tự Tab");
  await chupTaiCho(d, "1040-re-chuot.png"); // không cuộn: cuộn trang làm mất trạng thái rê chuột
  if (khiRe.includes("sau")) {
    const truoc = await d.ev(`${CUON}.scrollLeft`);
    await d.ev("document.querySelector('.catalog .catalog-hang-mui[data-huong=\"sau\"]').click(); true");
    await d.waitFor(`${CUON}.scrollLeft > ${truoc}`, "bấm ›: hàng nhóm cuộn sang phải", 3000);
  } else {
    const truoc = await d.ev(`${CUON}.scrollLeft`);
    await d.ev("document.querySelector('.catalog .catalog-hang-mui[data-huong=\"truoc\"]').click(); true");
    await d.waitFor(`${CUON}.scrollLeft < ${truoc}`, "bấm ‹: hàng nhóm cuộn sang trái", 3000);
  }
  await d.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
  await d.ev(`${nut("TTB")}.focus(); true`);
  await sleep(150);
  assert.ok((await d.ev(muiHien)).length > 0, "focus vào hàng nhóm (không chuột): hiện nút ‹ / ›");
  await phim(d, "ArrowRight", 39);
  await d.waitFor(`${DANG_CHON} === 'IRS'`, "→: sang nhóm kế (I Resort)");
  assert.equal(await d.ev("document.activeElement && document.activeElement.dataset.nhom"), "IRS", "focus theo nhóm vừa chọn");
  assert.equal(await d.ev(DAU), "1 dịch vụ · I Resort");
  assert.equal(await d.ev(trongTam("IRS")), true);
  await phim(d, "ArrowLeft", 37);
  await d.waitFor(`${DANG_CHON} === 'TTB'`, "←: về Thể thao biển");
  await phim(d, "Home", 36);
  await d.waitFor(`${DANG_CHON} === '' && document.activeElement?.dataset.nhom === ''`, "Home: Tất cả");
  await phim(d, "End", 35);
  await d.waitFor(`${DANG_CHON} === 'chua-phan-loai' && document.activeElement?.dataset.nhom === 'chua-phan-loai'`, "End: nhóm cuối");
  assert.equal(await d.ev(trongTam("chua-phan-loai")), true, "End: nhóm cuối cuộn vào tầm nhìn");
  // Phím mũi tên bỏ qua nhóm mờ khi đang tìm.
  await d.ev(`${nut("TDA")}.click(); true`);
  await d.ev(setInput(Q, "hòn tằm"));
  await d.waitFor(`${DAU} === '5 dịch vụ'`, "1040: gõ hòn tằm");
  await d.ev(`${nut("")}.focus(); true`);
  await phim(d, "ArrowRight", 39);
  await d.waitFor(`${DANG_CHON} === 'TDA'`, "→ khi đang tìm: Tour đảo");
  await phim(d, "ArrowRight", 39);
  await d.waitFor(`${DANG_CHON} === 'HTA'`, "→ bỏ qua Long Phú (mờ): Hòn Tằm");
  await d.ev(`${XOA}.click(); true`);
  await d.waitFor(`${DANG_CHON} === 'TDA'`, "✕: về Tour đảo (nhóm trước khi tìm)");
  await d.ev(`${nut("TTB")}.click(); true`);
  assert.ok(await d.ev(khongTranNgang), "1040: không tràn ngang");
  await shot(d, "1040-the-thao-bien.png");
  dong(d);
  ok("1040: khung 448px, nhớ Thể thao biển; ‹ › chỉ hiện khi rê chuột hoặc focus vào hàng nhóm, bấm › / ‹ cuộn hàng; → ← Home End đổi nhóm + focus, bỏ qua nhóm mờ lúc đang tìm");

  // ---- 11) Tài khoản khác (Bán hàng B) cùng hồ sơ trình duyệt → Tất cả (không nhớ lẫn). Trang của B mở SAU CÙNG. ----
  const b = await env.as(ACCOUNTS.salesB, "/order-form", MOB);
  await b.waitFor(`${NUTS}.length === 16 && ${MA}.length > 0`, "B: hàng nhóm", 10000);
  assert.equal(await b.ev(`localStorage.getItem(${JSON.stringify(KHOA_A)})`), '["TTB"]', "tiền đề: bản nhớ của A vẫn nằm trên máy");
  assert.equal(await b.ev(`${DANG_CHON} + '|' + ${DAU}`), "|39 dịch vụ", "tài khoản khác không nhớ lẫn nhóm của A");
  assert.equal(KHOA_A, `loc-nhom-dv:${idA}`, "khoá nhớ = loc-nhom-dv:<id tài khoản>");
  dong(b);
  ok("Bán hàng B cùng máy (A đã nhớ Thể thao biển): B thấy Tất cả — nhớ theo tài khoản");

  // ---- 12) localStorage bị chặn (getItem/setItem/removeItem ném lỗi) → Tất cả, chạm nhóm vẫn lọc, không lỗi console ----
  const c = await env.openPage(MOB);
  await c.send("Page.addScriptToEvaluateOnNewDocument", { source: "for (const k of ['getItem', 'setItem', 'removeItem']) Storage.prototype[k] = function () { throw new DOMException('bị chặn', 'SecurityError'); };" });
  const ck = await env.login(ACCOUNTS.salesA);
  await c.send("Network.setCookie", { name: ck.name, value: ck.value, url: env.base, httpOnly: true });
  await c.send("Page.navigate", { url: `${env.base}/order-form` });
  await c.waitFor(`${NUTS}.length === 16 && ${MA}.length > 0`, "bị chặn: hàng nhóm vẫn hiện", 10000);
  assert.equal(await c.ev("(() => { try { localStorage.getItem('x'); return false; } catch { return true; } })()"), true, "tiền đề: bộ nhớ thật sự bị chặn");
  assert.equal(await c.ev(`${DANG_CHON} + '|' + ${DAU}`), "|39 dịch vụ", "bị chặn → Tất cả");
  await c.ev(`${nut("TTB")}.click(); true`);
  assert.equal(await c.ev(DAU), "23 dịch vụ · Thể thao biển", "bị chặn: chạm nhóm vẫn lọc");
  dong(c);
  assert.deepEqual(loiConsole, [], "không lỗi console ở mọi trang");
  ok("Bộ nhớ trình duyệt bị chặn: Tất cả, chạm nhóm vẫn lọc; không lỗi console ở mọi trang của kịch bản");
  console.log("CHON DICH VU SMOKE OK");
} finally {
  await env.stop();
}
