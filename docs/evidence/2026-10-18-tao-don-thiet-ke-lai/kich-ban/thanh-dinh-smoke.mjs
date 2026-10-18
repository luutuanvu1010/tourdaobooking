// Kịch bản Chrome — thanh dính cuối trang, thang nút ba cấp, thanh toán chỉ hiện ô khi có trả trước, lỗi lưu ngay trên nút Lưu (màn Tạo đơn thiết kế lại 18/10/2026, Việc 8;
// đặc tả docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/DAC-TA.md mục 3D + PROMPT-CLAUDE-DESIGN.md "Thanh toán" / "Điện thoại bỏ khối Tóm tắt"; tiêu chí 5, 8).
// Việc 8 CHỈ đổi cách hiện: tiền vẫn do `orderSummary` (src/shared/service-form.ts) xem trước, máy chủ tính lại (`buildLines`); thân gửi so từng byte ở than-gui.mjs (CACH=tratruoc).
// Kiểm (tài khoản Bán hàng, D1 tạm, không cần mạng ngoài, KHÔNG chụp ảnh):
//   390×844 (chạm thật bằng cảm ứng):
//     1) không thấy khối Tóm tắt; dòng "N dịch vụ · Tổng X ₫" ở thanh dính là một NÚT (type=button, ≥ 44px, aria-expanded/aria-controls), bảng chi tiết đang ẩn;
//     2) chạm dòng tổng → bảng chi tiết trên thanh: Tạm tính, Giảm giá, Tổng cộng (= #sum-total = #mobile-total), câu "Số này chỉ để xem trước; hệ thống tính lại khi lưu."; chạm lại → đóng;
//     3) trả trước: chưa nhập → "Hình thức", "Người nhận tiền" và câu ghi sổ ẩn; gõ 2.000.000 → hiện, thanh có "Trả trước 2.000.000 ₫", bảng chi tiết có "Thanh toán trước (ghi sau khi lưu)"; xoá số → ẩn;
//     4) thang nút ba cấp: quét KIỂU ĐÃ TÍNH của mọi nút đang hiện trong form (thẻ mở, chặng đưa đón, khối gập mở, trả trước đã nhập): đúng một nút chính (#save), không nút
//        viên thuốc / nền xanh nhạt / nét đứt (nút đang được chọn — aria-pressed / aria-checked — không tính là "nền xanh nhạt");
//     5) Lưu bị từ chối (thiếu tên khách) khi đang ở đầu trang: #save-error nằm TRONG thanh dính, kề ngay trên #save, trong khung nhìn; ô lỗi nằm giữa thanh bước và thanh dính (không bị che);
//     6) Lưu bị từ chối vì thẻ đang GẬP (số khách 0), người dùng ở cuối form: thẻ tự mở, ô số khách có tiêu điểm, nằm giữa thanh bước và thanh dính;
//     6b) khung lỗi dài (thanh dính cao ≥ 250px), Lưu từ cuối form, lỗi đầu tiên là ô SĐT: ô được cuộn tới sát dưới thanh bước, không bị thanh dính che (cuộn "giữa khung" để nó khuất dưới thanh);
//     7) mất mạng khi Lưu: câu của src/shared/order-errors.ts (NETWORK_BANNER) hiện trong thanh, kề trên #save; trang KHÔNG nhảy;
//     8) cảnh báo tiền (giảm giá > tạm tính): #sum-warning — chữ của orderSummary — trong thanh, phía trên #save, thấy được khi đang ở đầu trang;
//     7b) (vòng sửa 1, I-1) sửa đơn, Lưu gặp 409 stale: nút "Tải lại đơn" trong khung lỗi (trong thanh dính) hiện, ≥ 44px, trong khung nhìn, không bị che;
//     9) form trống, bảng chi tiết ĐÓNG, Lưu: khung lỗi cuộn bên trong (overflow-y auto), thanh dính không cao quá 60% khung nhìn; không có thông báo nổi;
//   375×667 (iPhone màn nhỏ, vòng sửa 1):
//     9b) (I-2) bảng chi tiết ĐANG MỞ + khung lỗi dài, Lưu từ cuối form: bảng tự gập, ô SĐT (lỗi đầu tiên) không bị thanh dính che, thanh ≤ 60% khung nhìn;
//     9c) (M-3) thông báo nổi Bảng tin (chèn một a.toast vào vùng .toast-vung thật) nằm dưới thanh bước và trên thanh dính — thanh bước đang dính và lúc ở đầu trang;
//   1040×768 (chuột thật):
//     10) cột phải: Tóm tắt (có dòng Giảm giá) → Người phụ trách → thanh nút [cảnh báo tiền, lỗi lưu, Lưu, Quay lại]; dòng tổng điện thoại không hiện;
//     11) trả trước ẩn / hiện như bước 3;
//     12) Lưu bị từ chối: #save-error kề trên #save, cả hai trong khung 1040×768; tiêu điểm ở ô lỗi đầu tiên;
//     12b) (M-3) thông báo nổi dưới thanh bước — đang dính và đầu trang;
//     13) thang nút như bước 4.
//   Việc 9: 390-7c — Lưu gặp 503 «chưa có chính sách điều phối» (đường 503 khi Lưu không còn kịch bản nào phủ): câu máy chủ + dòng giải thích trong thanh, kề trên #save,
//     trang không nhảy, form không khoá, Lưu bấm lại được; 375-9c thêm (nợ T8(c)) — cuộn khi thanh bước đang dính không ghi lại --toast-tren; 1040-12c (nợ T8(a)) —
//     nút trong khung lỗi («Tải lại trang» của 409 client_outdated) giữ cỡ theo chữ, không kéo rộng hết cột phải.
//   Danh mục thử được GIEO NHÓM ở đầu kịch bản (vòng sửa 1, M-2) để hàng nút nhóm hiện; nút nhóm đang chọn là trạng thái, được miễn khỏi phép "một nút chính" (xem QUET_NUT).
//   AXE_JS (tuỳ chọn): axe-core ở 390 (bảng chi tiết mở) và 1040 — không vi phạm critical/serious. Thiếu biến thì in rõ "chưa chạy axe".
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, danh mục giả (TD101, TTB03 Phao chuối, TTB06 Motor nước).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/thanh-dinh-smoke.mjs
// Mỗi bước chạy riêng; cuối cùng in "THANH DINH SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { cham, goChu } from "./cham-that.mjs";

const AXE = process.env.AXE_JS && existsSync(process.env.AXE_JS) ? readFileSync(process.env.AXE_JS, "utf8") : null;
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 768, mobile: false };
const NHO = { width: 375, height: 667, mobile: true }; // iPhone màn nhỏ (SE / 8) — vòng sửa 1
const NGAY = vnDate(5);
const env = await startEnv();
const loi = [];
async function buoc(id, ten, fn) {
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    loi.push(`${id}) ${ten}: ${String(e?.message ?? e).split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${String(e?.message ?? e).split("\n").slice(0, 8).join("\n    ")}`);
  }
}

const THE = "document.querySelectorAll('#services .svc')";
const the = (i) => `${THE}[${i}]`;
const nut = (i) => `${the(i)}.querySelector('.svc-mo')`;
const demDem = (i, nhan) => `${the(i)}.querySelector('.counter-field[aria-label=${JSON.stringify(nhan)}]')`;
const hien = (sel) => `(() => { const e = ${sel}; return !!e && e.getClientRects().length > 0; })()`;
const THANH = "document.querySelector('#order-form .form-actions')";
const MO = "document.getElementById('sum-mo')";
const BANG = "document.getElementById('sum-chi-tiet')";
/** Phần tử nằm giữa đáy thanh dính đầu trang (thanh bước; điện thoại còn thanh trên cùng) và đỉnh thanh dính cuối trang — tức không bị che. */
const khongBiChe = (sel) => `(() => { const e = ${sel}; if (!e) return 'không có phần tử'; const r = e.getBoundingClientRect(); if (r.height === 0) return 'đang ẩn';
  const tren = Math.max(document.querySelector('.buoc-thanh')?.getBoundingClientRect().bottom ?? 0, document.getElementById('topbar')?.getBoundingClientRect().bottom ?? 0);
  const duoi = (${THANH}).getBoundingClientRect().top;
  return r.top >= tren - 1 && r.bottom <= Math.min(duoi, innerHeight) + 1 ? true : JSON.stringify({ top: Math.round(r.top), bottom: Math.round(r.bottom), tren: Math.round(tren), duoi: Math.round(duoi) }); })()`;
/** Các dòng `.kv` đang hiện của một khối: [nhãn, giá trị] (bỏ chữ phụ trong nhãn thành một dòng). */
const dongKv = (sel) => `[...(${sel}).querySelectorAll('.kv')].filter((x) => x.getClientRects().length > 0).map((x) => [x.firstElementChild.textContent.replace(/\\s+/g, ' ').trim(), x.lastElementChild.textContent.trim()])`;
/** Vị trí lỗi lưu so với nút Lưu. */
const viTriLoi = `(() => { const e = document.getElementById('save-error'), s = document.getElementById('save'), bar = ${THANH}; const re = e.getBoundingClientRect(), rs = s.getBoundingClientRect();
  return { hien: !e.hidden, trongThanh: bar.contains(e), keTren: e.nextElementSibling === s, khoang: Math.round(rs.top - re.bottom), trongKhung: re.top >= 0 && rs.bottom <= innerHeight, cao: Math.round(re.height) }; })()`;
/** Quét kiểu đã tính của mọi nút đang hiện trong form (thang nút ba cấp — đặc tả mục 3D, tiêu chí 8). */
const QUET_NUT = `(() => {
  const mau = (v) => { const d = document.createElement('div'); d.style.background = v; document.body.append(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; };
  const DAC = mau('var(--c-primary)'), NHAT = new Set([mau('var(--c-primary-soft)'), mau('var(--c-btn-soft-bg)')]);
  const XANH = (() => { const d = document.createElement('div'); d.style.color = 'var(--c-primary)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; })();
  const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const ten = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase()) + (e.classList.length ? '.' + [...e.classList].join('.') : '') + ' "' + e.textContent.replace(/\\s+/g, ' ').trim().slice(0, 28) + '"';
  const dangChon = (e) => e.getAttribute('aria-pressed') === 'true' || e.getAttribute('aria-checked') === 'true' || e.getAttribute('aria-selected') === 'true';
  // Ruling của điều phối (vòng sửa 1, M-2, 18/10): nút nhóm ĐANG CHỌN của hàng nhóm dịch vụ (radio trong radiogroup "Nhóm dịch vụ", nền xanh đậm) là TRẠNG THÁI của bộ lọc
  // — cho biết danh sách đang lọc theo nhóm nào — không phải nút hành động, nên KHÔNG tính vào "một nút chính duy nhất". Chỉ miễn đúng phần tử này (lớp + role + aria-checked
  // + nằm trong radiogroup); nó vẫn được ghi vào trangThaiChon để thấy phép quét đã chạy trên dữ liệu có chip. Kiểu chip không đổi.
  const laTrangThaiChon = (e) => e.matches('.catalog-nut-nhom[role="radio"][aria-checked="true"]') && !!e.closest('[role="radiogroup"]');
  const out = { chinh: [], btnPrimary: [], vienThuoc: [], nenNhat: [], netDut: [], loiNhoKhongXanh: [], trangThaiChon: [], soNut: 0, soChip: 0 };
  for (const e of [...document.querySelectorAll('#order-form button, #order-form a.btn, #order-form [role=button]')].filter(vis)) {
    out.soNut++;
    if (e.matches('.catalog-nut-nhom')) out.soChip++;
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    if (s.backgroundColor === DAC) (laTrangThaiChon(e) ? out.trangThaiChon : out.chinh).push(ten(e));
    if (e.classList.contains('btn-primary')) out.btnPrimary.push(ten(e));
    if ([s.borderTopStyle, s.borderRightStyle, s.borderBottomStyle, s.borderLeftStyle, s.outlineStyle].includes('dashed')) out.netDut.push(ten(e));
    if (r.height >= 20 && r.width > r.height * 1.3 && parseFloat(s.borderTopLeftRadius) >= r.height / 2 - 0.5) out.vienThuoc.push(ten(e));
    if (!dangChon(e) && NHAT.has(s.backgroundColor)) out.nenNhat.push(ten(e));
    // Lối nhỏ (chữ xanh): mọi .btn-link trừ lối nhỏ mang nghĩa xoá (chữ đỏ: .danger, "Xoá" hành khách).
    if (e.classList.contains('btn-link') && !e.matches('.danger, .hk-xoa') && s.color !== XANH) out.loiNhoKhongXanh.push(ten(e) + ' ' + s.color);
  }
  return out; })()`;
const kiemThangNut = async (p, kho) => {
  const q = await p.ev(QUET_NUT);
  console.log(`   ${kho}: quét ${q.soNut} nút đang hiện (${q.soChip} nút nhóm; trạng thái chọn: ${q.trangThaiChon.join(", ")})`);
  assert.ok(q.soChip >= 3 && q.trangThaiChon.length === 1, `phép quét phải chạy trên dữ liệu CÓ hàng nút nhóm (gieo ở đầu kịch bản) và nhận ra đúng một nút nhóm đang chọn: ${q.soChip} nút nhóm, ${q.trangThaiChon.length} đang chọn; nền xanh đậm khác: ${JSON.stringify(q.chinh)}`);
  assert.deepEqual({ chinh: q.chinh.map((x) => x.split(" ")[0]), btnPrimary: q.btnPrimary.map((x) => x.split(" ")[0]) }, { chinh: ["#save.btn.btn-primary"], btnPrimary: ["#save.btn.btn-primary"] }, `một nút chính duy nhất: ${JSON.stringify({ chinh: q.chinh, btnPrimary: q.btnPrimary })}`);
  assert.deepEqual({ vienThuoc: q.vienThuoc, nenNhat: q.nenNhat, netDut: q.netDut, loiNhoKhongXanh: q.loiNhoKhongXanh }, { vienThuoc: [], nenNhat: [], netDut: [], loiNhoKhongXanh: [] }, "không nút viên thuốc / nền xanh nhạt / nét đứt; lối nhỏ chữ xanh");
};
const runAxe = async (p, nhan) => {
  if (!AXE) return;
  await p.ev(`${AXE}; true`);
  const v = await p.ev("axe.run(document, { resultTypes: ['violations'] }).then((r) => r.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious').map((x) => x.id + ': ' + x.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')))");
  assert.deepEqual(v, [], `axe (${nhan}): ${v.join("; ")}`);
};

try {
  // M-2 (vòng sửa 1): gieo nhóm cho danh mục thử để hàng nút nhóm HIỆN ("Tất cả", "Tour đảo", "Thể thao biển", …) — phép quét thang nút phải chạy trên dữ liệu có chip.
  // startEnv() chèn TD101 / TTB03 / TTB06 SAU migration gieo nhóm nên cả ba "Chưa phân loại"; Quản trị gán nhóm qua route thật (như chip-nhom-smoke.mjs). Không đổi giá / thân gửi.
  const ad = await env.login(ACCOUNTS.admin);
  for (const [codes, groupCode] of [[["TTB03", "TTB06"], "TTB"], [["TD101"], "TDA"]]) {
    const r = await fetch(`${env.base}/api/catalog/group-assignments`, { method: "PUT", headers: { "content-type": "application/json", origin: env.base, cookie: `${ad.name}=${ad.value}` }, body: JSON.stringify({ codes, groupCode }) });
    assert.equal(r.status, 200, `gán nhóm ${groupCode}: ${r.status} ${await r.text()}`);
  }
  const chon = async (p, tim, soThe) => {
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", tim));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", `lọc ${tim}`);
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor(`${THE}.length === ${soThe}`, `thẻ thứ ${soThe}`);
    await sleep(200);
  };
  const moForm = async (vp) => {
    const p = await env.as(ACCOUNTS.salesA, "/order-form", vp);
    await p.waitFor("!!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "ô tìm danh mục sẵn sàng", 15000);
    await sleep(600);
    await p.ev(setInput("document.getElementById('orderDate')", NGAY));
    return p;
  };
  /** Đơn mẫu: TD101 (2 người lớn), TTB06 (2 người lớn), tên + SĐT khách, giảm giá 100.000. */
  const donMau = async (p) => {
    await chon(p, "TD101", 1);
    await p.ev(setInput(demDem(0, "Người lớn"), "2"));
    await chon(p, "TTB06", 2);
    await p.ev(setInput(demDem(1, "Người lớn"), "2"));
    await p.ev(setInput("document.getElementById('customerName')", "Khách Thanh Dính"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0912345691"));
    await p.ev(setInput("document.getElementById('discount')", "100000"));
    await sleep(200);
  };
  const traTruocAn = `['prepaid-method-field', 'prepaid-collector-field', 'prepaid-hint'].map((id) => document.getElementById(id).getClientRects().length === 0)`;
  const kiemTraTruoc = async (p, mobile) => {
    assert.deepEqual(await p.ev(traTruocAn), [true, true, true], "chưa nhập trả trước: Hình thức, Người nhận tiền, câu ghi sổ ẩn");
    await cham(p, mobile, "document.getElementById('prepaidAmount')");
    await goChu(p, "2000000");
    await sleep(150);
    assert.equal(await p.ev("document.getElementById('prepaidAmount').value"), "2.000.000");
    assert.deepEqual(await p.ev(traTruocAn), [false, false, false], "đã nhập trả trước: hai ô và câu ghi sổ hiện");
    assert.equal(await p.ev("document.getElementById('prepaid-hint').textContent"), "Tiền trả trước được ghi vào sổ ngay sau khi lưu đơn.");
    await p.ev(setInput("document.getElementById('prepaidAmount')", ""));
    await sleep(150);
    assert.deepEqual(await p.ev(traTruocAn), [true, true, true], "xoá số trả trước: ẩn lại");
  };

  // ============================== 390 ==============================
  let p = await moForm(MOB);
  await buoc("390-1", "không thấy khối Tóm tắt; dòng tổng ở thanh dính là nút mở bảng chi tiết (type=button, ≥ 44px, aria-expanded, aria-controls), bảng đang ẩn", async () => {
    assert.equal(await p.ev("document.querySelector('.summary-card').getClientRects().length"), 0, "khối Tóm tắt không hiện ở điện thoại");
    const t = await p.ev(`(() => { const b = ${MO}; if (!b) return null; const r = b.getBoundingClientRect(); return { type: b.type, cao: r.height >= 44, exp: b.getAttribute('aria-expanded'), ctl: b.getAttribute('aria-controls'), trongThanh: !!b.closest('.form-actions'), bangAn: document.getElementById(b.getAttribute('aria-controls'))?.hidden ?? null, dong: document.querySelector('.mobile-sum-line > span:first-child')?.textContent ?? null }; })()`);
    assert.deepEqual(t, { type: "button", cao: true, exp: "false", ctl: "sum-chi-tiet", trongThanh: true, bangAn: true, dong: "0 dịch vụ · Tổng 0 ₫" });
  });

  await buoc("390-2", "chạm dòng tổng → bảng chi tiết trên thanh: Tạm tính, Giảm giá, Tổng cộng (= #sum-total = #mobile-total), câu xem trước; chạm lại → đóng; không thông báo nổi", async () => {
    await donMau(p);
    assert.equal(await p.ev("document.querySelectorAll('.toast, .toast-bao').length"), 0, "không có thông báo nổi sau khi thêm dịch vụ");
    assert.match(await p.ev("document.querySelector('.mobile-sum-line > span:first-child').textContent"), /^2 dịch vụ · Tổng 4\.200\.000 ₫$/);
    await cham(p, true, MO, false);
    const b = await p.ev(`({ an: ${BANG}.hidden, exp: ${MO}.getAttribute('aria-expanded'), chu: ${MO}.textContent.includes('Thu gọn'), dong: ${dongKv(BANG)}, cau: ${BANG}.querySelector('.summary-note')?.textContent ?? null,
      sumTotal: document.getElementById('sum-total').textContent, sumSub: document.getElementById('sum-subtotal').textContent, mob: document.getElementById('mobile-total').textContent,
      trongKhung: (() => { const r = ${BANG}.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })(), trongThanh: ${THANH}.contains(${BANG}) })`);
    assert.deepEqual({ an: b.an, exp: b.exp, chu: b.chu, trongKhung: b.trongKhung, trongThanh: b.trongThanh }, { an: false, exp: "true", chu: true, trongKhung: true, trongThanh: true }, "bảng mở, nằm trên thanh, trong khung nhìn");
    assert.deepEqual(b.dong, [["Tạm tính", b.sumSub], ["Giảm giá", "100.000 ₫"], ["Tổng cộng", b.sumTotal]], "các dòng của bảng chi tiết");
    assert.equal(b.sumTotal, "4.200.000 ₫");
    assert.equal(b.mob, b.sumTotal, "tổng trên thanh = #sum-total");
    assert.equal(b.cau, "Số này chỉ để xem trước; hệ thống tính lại khi lưu.");
    await runAxe(p, "390, bảng chi tiết mở");
    await cham(p, true, MO, false);
    assert.deepEqual(await p.ev(`({ an: ${BANG}.hidden, exp: ${MO}.getAttribute('aria-expanded'), chu: ${MO}.textContent.includes('Chi tiết') })`), { an: true, exp: "false", chu: true }, "chạm lại → đóng");
  });

  await buoc("390-3", "trả trước: chưa nhập → hai ô + câu ghi sổ ẩn; gõ 2.000.000 → hiện, thanh 'Trả trước 2.000.000 ₫', bảng chi tiết có 'Thanh toán trước (ghi sau khi lưu)'; xoá số → ẩn", async () => {
    assert.deepEqual(await p.ev(traTruocAn), [true, true, true], "chưa nhập trả trước: Hình thức, Người nhận tiền, câu ghi sổ ẩn");
    await cham(p, true, "document.getElementById('prepaidAmount')");
    await goChu(p, "2000000");
    await sleep(150);
    assert.deepEqual(await p.ev(traTruocAn), [false, false, false], "đã nhập trả trước: hai ô và câu ghi sổ hiện");
    assert.equal(await p.ev("document.getElementById('mobile-prepaid-row').hidden ? null : document.getElementById('mobile-prepaid-row').textContent"), "Trả trước 2.000.000 ₫");
    await cham(p, true, MO, false);
    assert.deepEqual((await p.ev(dongKv(BANG))).at(-1), ["Thanh toán trước (ghi sau khi lưu)", "2.000.000 ₫"], "bảng chi tiết có dòng trả trước");
    await cham(p, true, MO, false);
    await p.ev(setInput("document.getElementById('prepaidAmount')", ""));
    await sleep(150);
    assert.deepEqual(await p.ev(traTruocAn), [true, true, true], "xoá số trả trước: ẩn lại");
    assert.equal(await p.ev("document.getElementById('mobile-prepaid-row').hidden"), true);
  });

  await buoc("390-4", "thang nút ba cấp: đúng một nút chính (#save); không nút viên thuốc / nền xanh nhạt / nét đứt (thẻ mở, chặng đưa đón, khối 'Email, ghi chú' mở, trả trước đã nhập)", async () => {
    if ((await p.ev(`${nut(1)}.getAttribute('aria-expanded')`)) === "false") await cham(p, true, nut(1));
    await p.ev(`${the(1)}.querySelector('[data-action="them-dua-don"]')?.click(); true`);
    await sleep(200);
    await p.ev("document.querySelector('[data-gap=\"khach\"]')?.getAttribute('aria-expanded') === 'false' && document.querySelector('[data-gap=\"khach\"]').click(); true");
    await p.ev(setInput("document.getElementById('prepaidAmount')", "500000"));
    await sleep(200);
    await kiemThangNut(p, "390");
    await p.ev(setInput("document.getElementById('prepaidAmount')", ""));
    // Bỏ chặng vừa thêm (chưa có nơi đón — sẽ chặn Lưu ở bước sau; ở form, chặng chưa lưu bỏ ngay không hỏi).
    await p.ev(`${the(1)}.querySelector('[data-action="bo-chang"]').click(); true`);
    await p.waitFor(`${the(1)}.querySelectorAll('.dd-chang').length === 0`, "đã bỏ chặng");
  });

  await buoc("390-5", "Lưu bị từ chối (thiếu tên) khi đang ở đầu trang: #save-error trong thanh dính, kề ngay trên #save, trong khung nhìn; ô tên nằm giữa thanh bước và thanh dính", async () => {
    await p.ev(setInput("document.getElementById('customerName')", ""));
    await p.ev("window.scrollTo(0, 0); true");
    await sleep(200);
    await cham(p, true, "document.getElementById('save')", false);
    await p.waitFor("!document.getElementById('save-error').hidden", "khung lỗi lưu");
    await sleep(400);
    const v = await p.ev(viTriLoi);
    assert.deepEqual({ trongThanh: v.trongThanh, keTren: v.keTren, trongKhung: v.trongKhung }, { trongThanh: true, keTren: true, trongKhung: true }, JSON.stringify(v));
    assert.ok(v.khoang >= 0 && v.khoang <= 16, `khoảng lỗi → nút Lưu ${v.khoang}px`);
    assert.equal(await p.ev(khongBiChe("document.getElementById('customerName')")), true, "ô tên không bị thanh dính che");
    await p.ev(setInput("document.getElementById('customerName')", "Khách Thanh Dính"));
  });

  assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), [], "không lỗi console (390, trang 1)");
  p.close();

  // Trang mới (bước 6–8): lỗi thẻ chỉ "hiện" sau lần bấm Lưu đầu — trang 1 đã bấm Lưu nên thẻ thiếu số khách ở đó tự mở NGAY khi gõ 0 (luật "thẻ có lỗi chặn Lưu luôn mở").
  p = await moForm(MOB);
  await buoc("390-6", "Lưu bị từ chối vì thẻ GẬP thiếu số khách, người dùng ở cuối form: thẻ tự mở, ô số khách có tiêu điểm, không bị thanh dính che", async () => {
    await donMau(p);
    await p.ev(setInput(demDem(0, "Người lớn"), "0"));
    await sleep(150);
    assert.equal(await p.ev(`${nut(0)}.getAttribute('aria-expanded')`), "false", "ĐẦU: thẻ TD101 đang gập (lỗi chưa hiện vì chưa bấm Lưu lần nào)");
    await p.ev("window.scrollTo(0, document.documentElement.scrollHeight); true");
    await sleep(200);
    await cham(p, true, "document.getElementById('save')", false);
    await p.waitFor("!document.getElementById('save-error').hidden", "khung lỗi lưu");
    await sleep(400);
    assert.equal(await p.ev(`${nut(0)}.getAttribute('aria-expanded')`), "true", "thẻ TD101 tự mở");
    const o = `${the(0)}.querySelector('.counter-field')`;
    assert.equal(await p.ev(`document.activeElement === ${o}`), true, `tiêu điểm ở ô số khách đầu tiên (đang ở: ${await p.ev("document.activeElement?.outerHTML.slice(0, 120) ?? null")})`);
    assert.equal(await p.ev(khongBiChe(o)), true, "ô số khách không bị thanh dính che");
    await p.ev(setInput(demDem(0, "Người lớn"), "2"));
  });

  await buoc("390-6b", "khung lỗi dài (thanh dính cao): Lưu từ cuối form, lỗi đầu tiên là ô SĐT ở đầu form → ô được cuộn tới sát dưới thanh bước, không bị thanh dính che", async () => {
    await p.ev(setInput("document.getElementById('customerPhone')", ""));
    await p.ev(setInput(demDem(0, "Người lớn"), "0"));
    await p.ev(setInput(demDem(1, "Người lớn"), "0"));
    await p.ev(setInput("document.getElementById('discount')", "99000000"));
    await p.ev("window.scrollTo(0, document.documentElement.scrollHeight); true");
    await sleep(200);
    await cham(p, true, "document.getElementById('save')", false);
    await p.waitFor("!document.getElementById('save-error').hidden", "khung lỗi lưu");
    await sleep(400);
    const cao = await p.ev(`Math.round(${THANH}.getBoundingClientRect().height)`);
    console.log(`   390-6b: thanh dính cao ${cao}px (khung lỗi ${await p.ev("document.getElementById('save-error').querySelectorAll('li').length")} dòng)`);
    assert.ok(cao >= 250, `kịch bản phải dựng được thanh dính cao (đang ${cao}px)`);
    assert.equal(await p.ev(khongBiChe("document.getElementById('customerPhone')")), true, "ô SĐT (lỗi đầu tiên) không bị thanh dính che");
    await p.ev(setInput("document.getElementById('customerPhone')", "0912345691"));
    await p.ev(setInput(demDem(0, "Người lớn"), "2"));
    await p.ev(setInput(demDem(1, "Người lớn"), "2"));
    await p.ev(setInput("document.getElementById('discount')", "100000"));
    await sleep(150);
  });

  await buoc("390-7", "mất mạng khi Lưu: câu của order-errors.ts trong thanh, kề trên #save; trang không nhảy", async () => {
    await p.ev("window.scrollTo(0, 0); true");
    await sleep(200);
    await p.ev("(() => { const f = window.fetch; let mot = true; window.fetch = (u, o) => { if (mot && String(u).endsWith('/api/orders') && o?.method === 'POST') { mot = false; return Promise.reject(new TypeError('Failed to fetch')); } return f(u, o); }; return true; })()");
    const truoc = await p.ev("Math.round(scrollY)");
    await cham(p, true, "document.getElementById('save')", false);
    await p.waitFor("!document.getElementById('save-error').hidden && document.getElementById('save-error').textContent.includes('Không kết nối được máy chủ.')", "câu mất mạng");
    await sleep(400);
    assert.match(await p.ev("document.getElementById('save-error').textContent"), /Dữ liệu bạn đã nhập vẫn còn — kiểm tra kết nối rồi bấm Lưu lại\./);
    const v = await p.ev(viTriLoi);
    assert.deepEqual({ trongThanh: v.trongThanh, keTren: v.keTren, trongKhung: v.trongKhung }, { trongThanh: true, keTren: true, trongKhung: true }, JSON.stringify(v));
    const sau = await p.ev("Math.round(scrollY)");
    assert.ok(Math.abs(sau - truoc) <= 2, `trang nhảy từ ${truoc} tới ${sau}`);
  });

  await buoc("390-7c", "Việc 9: Lưu gặp 503 'chưa có chính sách điều phối': câu máy chủ + dòng giải thích trong thanh, kề trên #save; trang không nhảy; form không khoá, Lưu bấm lại được", async () => {
    await p.ev("window.scrollTo(0, 0); true");
    await sleep(200);
    // 503 ở lần POST đầu, thân lỗi đúng dạng máy chủ (src/modules/orders/index.ts MOC_CHUA_CO) — từ đây đường vẽ khung lỗi y như 503 thật (order-errors.ts → banner.ts).
    await p.ev(`(() => { const f = window.fetch; let mot = true; window.fetch = (u, o) => { if (mot && String(u).endsWith('/api/orders') && o?.method === 'POST') { mot = false;
      return Promise.resolve(new Response(JSON.stringify({ error: { code: 'moc_toi_thieu_chua_co', message: 'Chưa có chính sách điều phối đang hiệu lực (mốc tối thiểu) — báo người phụ trách hệ thống.' } }), { status: 503, headers: { 'content-type': 'application/json' } })); } return f(u, o); }; return true; })()`);
    const truoc = await p.ev("Math.round(scrollY)");
    await cham(p, true, "document.getElementById('save')", false);
    await p.waitFor("!document.getElementById('save-error').hidden && document.getElementById('save-error').textContent.includes('Chưa có chính sách điều phối')", "khung lỗi 503");
    await sleep(400);
    assert.match(await p.ev("document.getElementById('save-error').textContent"), /Chưa lưu, xác nhận hay sửa chuyến có giờ đón được cho tới khi Toàn quyền đặt chính sách điều phối\./);
    const v = await p.ev(viTriLoi);
    assert.deepEqual({ trongThanh: v.trongThanh, keTren: v.keTren, trongKhung: v.trongKhung }, { trongThanh: true, keTren: true, trongKhung: true }, JSON.stringify(v));
    const sau = await p.ev("Math.round(scrollY)");
    assert.ok(Math.abs(sau - truoc) <= 2, `trang nhảy từ ${truoc} tới ${sau}`);
    assert.deepEqual(await p.ev("[document.getElementById('save').disabled, document.getElementById('customerName').disabled, location.pathname]"), [false, false, "/order-form"], "form không khoá, chưa rời trang, Lưu bấm lại được");
  });

  await buoc("390-8", "cảnh báo tiền (giảm giá > tạm tính): #sum-warning — chữ của orderSummary — trong thanh, phía trên #save, thấy được khi ở đầu trang", async () => {
    await p.ev(setInput("document.getElementById('discount')", "99000000"));
    await p.ev("window.scrollTo(0, 0); true");
    await sleep(250);
    const w = await p.ev(`(() => { const w = document.getElementById('sum-warning'), s = document.getElementById('save'); const rw = w.getBoundingClientRect(), rs = s.getBoundingClientRect();
      return { an: w.hidden, chu: w.textContent, trongThanh: ${THANH}.contains(w), tren: rw.bottom <= rs.top, trongKhung: rw.top >= 0 && rw.bottom <= innerHeight }; })()`);
    assert.deepEqual(w, { an: false, chu: "Giảm giá đang lớn hơn tạm tính.", trongThanh: true, tren: true, trongKhung: true });
    await p.ev(setInput("document.getElementById('discount')", "100000"));
    await sleep(150);
    assert.equal(await p.ev("document.getElementById('sum-warning').hidden"), true);
  });
  assert.deepEqual(p.consoleErrors.filter((e) => !/favicon|Failed to fetch/.test(e)), [], "không lỗi console (390, trang 2)");
  p.close();

  // I-1 (vòng sửa 1): khung lỗi lưu nay nằm TRONG thanh nút; luật điện thoại cũ "ẩn nút không phải nút chính của thanh" (Quay lại) từng ẩn luôn nút hành động của khung lỗi.
  p = await moForm(MOB);
  await buoc("390-7b", "409 'đơn vừa được người khác sửa' khi sửa đơn ở điện thoại: khung lỗi trong thanh dính có nút 'Tải lại đơn' hiện, ≥ 44px, trong khung nhìn, không bị che", async () => {
    await donMau(p);
    await cham(p, true, "document.getElementById('save')", false);
    await p.waitFor("location.pathname === '/order'", "lưu đơn xong sang trang đơn", 15000);
    const id = new URLSearchParams(await p.ev("location.search")).get("id");
    p.close();
    p = await env.as(ACCOUNTS.salesA, `/order-form?id=${id}`, MOB);
    await p.waitFor("document.getElementById('customerName').value === 'Khách Thanh Dính' && !document.getElementById('save').disabled", "form sửa đã nạp đơn", 15000);
    await sleep(600);
    // 409 `stale` ở lần PUT đầu, thân lỗi đúng dạng máy chủ ({ error: { code, message } }): từ đây đường vẽ khung lỗi y như 409 thật (order-errors.ts → banner.ts).
    await p.ev(`(() => { const f = window.fetch; let mot = true; window.fetch = (u, o) => { if (mot && /\\/api\\/orders\\/[^/?]+$/.test(String(u)) && o?.method === 'PUT') { mot = false;
      return Promise.resolve(new Response(JSON.stringify({ error: { code: 'stale', message: 'Đơn đã đổi.' } }), { status: 409, headers: { 'content-type': 'application/json' } })); } return f(u, o); }; return true; })()`);
    await p.ev("window.scrollTo(0, 0); true");
    await sleep(200);
    await cham(p, true, "document.getElementById('save')", false);
    await p.waitFor("!document.getElementById('save-error').hidden && document.getElementById('save-error').textContent.includes('Đơn vừa được người khác sửa')", "khung lỗi 409 stale");
    await sleep(300);
    const n = await p.ev(`(() => { const b = [...document.querySelectorAll('#save-error button')].find((x) => x.textContent === 'Tải lại đơn'); if (!b) return 'không có nút Tải lại đơn';
      const r = b.getBoundingClientRect(); const t = r.height > 0 ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
      return { hien: r.height > 0 && getComputedStyle(b).display !== 'none', cao: r.height >= 44, trongKhung: r.top >= 0 && r.bottom <= innerHeight, khongBiChe: !!t && (t === b || b.contains(t)) }; })()`);
    assert.deepEqual(n, { hien: true, cao: true, trongKhung: true, khongBiChe: true }, "nút 'Tải lại đơn' trong khung lỗi");
  });
  p.close();

  p = await moForm(MOB);
  await buoc("390-9", "form trống, Lưu: khung lỗi cuộn bên trong (overflow-y auto), thanh dính không cao quá 60% khung nhìn", async () => {
    await cham(p, true, "document.getElementById('save')", false);
    await p.waitFor("!document.getElementById('save-error').hidden", "khung lỗi lưu");
    await sleep(300);
    const v = await p.ev(`({ tran: getComputedStyle(document.getElementById('save-error')).overflowY, thanh: Math.round(${THANH}.getBoundingClientRect().height), vh: innerHeight, keTren: document.getElementById('save-error').nextElementSibling === document.getElementById('save') })`);
    assert.equal(v.tran, "auto", "khung lỗi cuộn bên trong");
    assert.ok(v.thanh <= v.vh * 0.6, `thanh dính cao ${v.thanh}px / khung ${v.vh}px`);
    assert.equal(v.keTren, true);
    assert.equal(await p.ev(khongBiChe("document.getElementById('customerName')")), true, "ô tên (lỗi đầu tiên) không bị thanh dính che");
    assert.equal(await p.ev("document.querySelectorAll('.toast, .toast-bao').length"), 0, "không có thông báo nổi");
  });
  p.close();

  // ============================== 375×667 (iPhone màn nhỏ) ==============================
  p = await moForm(NHO);
  await buoc("375-9b", "I-2: bảng chi tiết tiền ĐANG MỞ, khung lỗi dài, Lưu từ cuối form ở 375×667: bảng tự gập, ô SĐT (lỗi đầu tiên) không bị thanh dính che, thanh ≤ 60% khung nhìn", async () => {
    await donMau(p);
    await p.ev(setInput("document.getElementById('customerPhone')", ""));
    await p.ev(setInput(demDem(0, "Người lớn"), "0"));
    await p.ev(setInput(demDem(1, "Người lớn"), "0"));
    await p.ev(setInput("document.getElementById('discount')", "99000000"));
    await sleep(150);
    await cham(p, true, MO, false);
    assert.equal(await p.ev(`${BANG}.hidden`), false, "ĐẦU: bảng chi tiết đang mở");
    await p.ev("window.scrollTo(0, document.documentElement.scrollHeight); true");
    await sleep(200);
    await cham(p, true, "document.getElementById('save')", false);
    await p.waitFor("!document.getElementById('save-error').hidden", "khung lỗi lưu");
    await sleep(400);
    const v = await p.ev(`({ bangAn: ${BANG}.hidden, exp: ${MO}.getAttribute('aria-expanded'), thanh: Math.round(${THANH}.getBoundingClientRect().height), vh: innerHeight })`);
    console.log(`   375-9b: thanh dính cao ${v.thanh}px / ${v.vh}px`);
    assert.deepEqual({ bangAn: v.bangAn, exp: v.exp }, { bangAn: true, exp: "false" }, "Lưu bị từ chối dưới 960px: bảng chi tiết tự gập");
    assert.equal(await p.ev(khongBiChe("document.getElementById('customerPhone')")), true, "ô SĐT (lỗi đầu tiên) không bị thanh dính che");
    assert.ok(v.thanh <= v.vh * 0.6, `thanh dính cao ${v.thanh}px / khung ${v.vh}px`);
  });

  // M-3 (vòng sửa 1): thông báo nổi của Bảng tin không được che thanh bước. Chèn một `a.toast` vào ĐÚNG vùng `.toast-vung` mà web/toast.ts dùng (cùng CSS, cùng chỗ) —
  // chỉ kiểm vị trí, không kiểm Bảng tin (kết nối WebSocket thật có kịch bản riêng).
  const themThongBao = "(() => { const v = document.querySelector('.toast-vung'); if (!v) return false; const a = document.createElement('a'); a.className = 'toast'; a.href = '#'; a.textContent = 'Đơn TD20261018 vừa được cập nhật'; v.append(a); return true; })()";
  const viTriThongBao = `(() => { const t = document.querySelector('.toast-vung .toast:last-child'), b = document.querySelector('.buoc-thanh'), bar = ${THANH}, top = document.getElementById('topbar');
    const rt = t.getBoundingClientRect(), rb = b.getBoundingClientRect(), rs = bar.getBoundingClientRect();
    return { duoiThanhBuoc: rt.top >= rb.bottom - 1, trenThanhDinh: rt.bottom <= rs.top + 1, dinh: Math.abs(rb.top - (top?.getBoundingClientRect().bottom ?? 0)) <= 1, toast: [Math.round(rt.top), Math.round(rt.bottom)], buoc: [Math.round(rb.top), Math.round(rb.bottom)], thanhDinh: Math.round(rs.top) }; })()`;
  await buoc("375-9c", "M-3: thông báo nổi (Bảng tin) ở 375×667 nằm dưới thanh bước, trên thanh dính — khi thanh bước đang dính và khi ở đầu trang (dải nhắc đẩy thanh bước xuống)", async () => {
    await p.ev(setInput("document.getElementById('customerPhone')", "0912345691"));
    await p.ev(setInput(demDem(0, "Người lớn"), "2"));
    await p.ev(setInput(demDem(1, "Người lớn"), "2"));
    await p.ev(setInput("document.getElementById('discount')", "100000"));
    await p.ev("window.scrollTo(0, 700); true");
    await sleep(300);
    // Nợ T8(c) (Việc 9): thanh bước đang dính (đứng yên) thì cuộn KHÔNG ghi lại --toast-tren mỗi khung hình — chỉ ghi khi số đo đổi. Đếm lời gọi setProperty('--toast-tren').
    await p.ev("(() => { const st = document.documentElement.style, f = st.setProperty.bind(st); window.__ghiToast = 0; window.__cuon = 0; st.setProperty = (k, v, pr) => { if (k === '--toast-tren') window.__ghiToast++; return f(k, v, pr); }; addEventListener('scroll', () => window.__cuon++, { passive: true }); return true; })()");
    for (const y of [690, 680, 670, 660, 650, 660, 670, 680, 690, 700]) {
      await p.ev(`window.scrollTo(0, ${y}); true`);
      await sleep(60);
    }
    const ghi = await p.ev("({ ghi: window.__ghiToast, cuon: window.__cuon })");
    assert.ok(ghi.cuon >= 5, `tiền đề: trang thật sự cuộn (${JSON.stringify(ghi)})`);
    assert.equal(ghi.ghi, 0, `thanh bước đứng yên khi cuộn: không ghi lại --toast-tren (${JSON.stringify(ghi)})`);
    assert.equal(await p.ev(themThongBao), true, "có vùng thông báo .toast-vung");
    await sleep(200);
    const dinh = await p.ev(viTriThongBao);
    assert.equal(dinh.dinh, true, `thanh bước phải đang dính sát dưới thanh đầu trang: ${JSON.stringify(dinh)}`);
    assert.deepEqual({ duoiThanhBuoc: dinh.duoiThanhBuoc, trenThanhDinh: dinh.trenThanhDinh }, { duoiThanhBuoc: true, trenThanhDinh: true }, `thanh bước đang dính: ${JSON.stringify(dinh)}`);
    await p.ev("window.scrollTo(0, 0); true");
    await sleep(300);
    const dau = await p.ev(viTriThongBao);
    assert.deepEqual({ duoiThanhBuoc: dau.duoiThanhBuoc, trenThanhDinh: dau.trenThanhDinh }, { duoiThanhBuoc: true, trenThanhDinh: true }, `đầu trang: ${JSON.stringify(dau)}`);
    await p.ev("document.querySelectorAll('.toast-vung .toast').forEach((x) => x.remove()); true");
  });
  p.close();

  // ============================== 1040 ==============================
  p = await moForm(DESK);
  await buoc("1040-10", "cột phải: Tóm tắt (có dòng Giảm giá) → Người phụ trách → thanh nút [cảnh báo tiền, lỗi lưu, Lưu, Quay lại]; dòng tổng điện thoại không hiện", async () => {
    await donMau(p);
    const c = await p.ev(`(() => { const ma = (e) => e.id || e.className.split(' ')[0] || e.tagName.toLowerCase();
      return { cot: [...document.querySelector('.form-side').children].filter((e) => !e.hidden).map(ma), thanh: [...${THANH}.children].map(ma),
        tomTat: ${hien("document.querySelector('.summary-card')")}, nutDong: ${hien(MO)}, dong: ${dongKv("document.querySelector('.summary-card')")} }; })()`);
    assert.equal(c.tomTat, true, "Tóm tắt hiện ở máy tính");
    assert.equal(c.nutDong, false, "dòng tổng điện thoại không hiện");
    assert.deepEqual(c.cot, ["card", "owner-card", "form-actions"], "thứ tự cột phải");
    assert.deepEqual(c.thanh.slice(-4), ["sum-warning", "save-error", "save", "btn"], "thanh nút: cảnh báo tiền, lỗi lưu, Lưu, Quay lại");
    assert.deepEqual(c.dong.map((x) => x[0]), ["Dịch vụ", "Tạm tính", "Giảm giá", "Tổng cộng"], "dòng của Tóm tắt");
    assert.deepEqual(c.dong.slice(1), [["Tạm tính", "4.300.000 ₫"], ["Giảm giá", "100.000 ₫"], ["Tổng cộng", "4.200.000 ₫"]]);
  });

  await buoc("1040-11", "trả trước ẩn / hiện như ở 390", async () => {
    await kiemTraTruoc(p, false);
  });

  await buoc("1040-12", "Lưu bị từ chối: #save-error kề trên #save, cả hai trong khung 1040×768; tiêu điểm ở ô lỗi đầu tiên", async () => {
    await p.ev(setInput("document.getElementById('customerName')", ""));
    await p.ev("window.scrollTo(0, 0); true");
    await cham(p, false, "document.getElementById('save')", false);
    await p.waitFor("!document.getElementById('save-error').hidden", "khung lỗi lưu");
    await sleep(400);
    const v = await p.ev(viTriLoi);
    assert.deepEqual({ keTren: v.keTren, trongKhung: v.trongKhung }, { keTren: true, trongKhung: true }, JSON.stringify(v));
    assert.equal(await p.ev("document.activeElement?.id"), "customerName", "tiêu điểm ở ô tên");
    await p.ev(setInput("document.getElementById('customerName')", "Khách Thanh Dính"));
    await runAxe(p, "1040, có lỗi lưu");
  });

  await buoc("1040-12b", "M-3: thông báo nổi (Bảng tin) ở 1040 nằm dưới thanh bước — khi thanh bước đang dính và khi ở đầu trang", async () => {
    const doViTri = `(() => { const t = document.querySelector('.toast-vung .toast:last-child'), b = document.querySelector('.buoc-thanh'); const rt = t.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return { duoiThanhBuoc: rt.top >= rb.bottom - 1, toast: [Math.round(rt.top), Math.round(rt.bottom)], buoc: [Math.round(rb.top), Math.round(rb.bottom)] }; })()`;
    await p.ev("window.scrollTo(0, 700); true");
    await sleep(300);
    assert.equal(await p.ev(themThongBao), true, "có vùng thông báo .toast-vung");
    await sleep(200);
    const dinh = await p.ev(doViTri);
    assert.equal(dinh.duoiThanhBuoc, true, `thanh bước đang dính: ${JSON.stringify(dinh)}`);
    await p.ev("window.scrollTo(0, 0); true");
    await sleep(300);
    const dau = await p.ev(doViTri);
    assert.equal(dau.duoiThanhBuoc, true, `đầu trang: ${JSON.stringify(dau)}`);
    await p.ev("document.querySelectorAll('.toast-vung .toast').forEach((x) => x.remove()); true");
  });

  await buoc("1040-12c", "nợ T8(a) (Việc 9): ≥ 960px nút trong khung lỗi (409 'Trang đã cũ' → 'Tải lại trang') giữ cỡ theo chữ, không kéo rộng hết cột; Lưu vẫn rộng hết cột", async () => {
    await p.ev(`(() => { const f = window.fetch; let mot = true; window.__gia409 = 0; window.fetch = (u, o) => { if (mot && String(u).endsWith('/api/orders') && o?.method === 'POST') { mot = false; window.__gia409++;
      return Promise.resolve(new Response(JSON.stringify({ error: { code: 'client_outdated', message: 'Trang đã cũ.' } }), { status: 409, headers: { 'content-type': 'application/json' } })); } return f(u, o); }; return true; })()`);
    // Cuộn cho Lưu vào khung nhìn rồi mới bấm: ở đầu trang 1040×768, khung lỗi cũ của bước 12 (vẫn hiện) đẩy Lưu xuống 753–799px — nửa dưới nút ngoài khung, cú bấm giữa nút rơi ra ngoài.
    await p.ev("document.getElementById('save').scrollIntoView({ block: 'nearest' }); true");
    await sleep(200);
    await cham(p, false, "document.getElementById('save')", false);
    await p.waitFor("[...document.querySelectorAll('#save-error button')].some((b) => b.textContent === 'Tải lại trang')", "khung lỗi 409 client_outdated có nút 'Tải lại trang'").catch(async (e) => {
      throw new Error(`${e.message} — chẩn đoán: ${JSON.stringify(await p.ev("(() => { const s = document.getElementById('save').getBoundingClientRect(), t = document.elementFromPoint(s.left + s.width / 2, s.top + s.height / 2); return { post: window.__gia409, khung: document.getElementById('save-error').hidden ? '(ẩn)' : document.getElementById('save-error').textContent, tieuDiem: document.activeElement?.id || document.activeElement?.className || '', ten: document.getElementById('customerName').value, luu: [Math.round(s.top), Math.round(s.bottom), innerHeight], diemLuu: t ? (t.id || t.className || t.tagName) : null }; })()"))}`);
    });
    const w = await p.ev(`(() => { const b = [...document.querySelectorAll('#save-error button')].find((x) => x.textContent === 'Tải lại trang'), sv = document.getElementById('save'), bar = ${THANH};
      return { nut: Math.round(b.getBoundingClientRect().width), luu: Math.round(sv.getBoundingClientRect().width), thanh: Math.round(bar.getBoundingClientRect().width), cao: b.getBoundingClientRect().height >= 44 }; })()`);
    assert.ok(w.nut < w.thanh * 0.8, `nút 'Tải lại trang' không kéo rộng hết cột: ${JSON.stringify(w)}`);
    assert.ok(Math.abs(w.luu - w.thanh) <= 1, `Lưu vẫn rộng hết cột: ${JSON.stringify(w)}`);
    assert.equal(w.cao, true, "nút cao ≥ 44px");
    await p.ev("document.getElementById('save-error').hidden = true; true"); // dọn khung cho bước quét thang nút
  });

  await buoc("1040-13", "thang nút ba cấp ở 1040 (như 390-4)", async () => {
    if ((await p.ev(`${nut(1)}.getAttribute('aria-expanded')`)) === "false") await cham(p, false, nut(1));
    await p.ev(`${the(1)}.querySelector('[data-action="them-dua-don"]')?.click(); true`);
    await sleep(200);
    await p.ev("document.querySelector('[data-gap=\"khach\"]')?.getAttribute('aria-expanded') === 'false' && document.querySelector('[data-gap=\"khach\"]').click(); true");
    await p.ev(setInput("document.getElementById('prepaidAmount')", "500000"));
    await sleep(200);
    await kiemThangNut(p, "1040");
    // Khối Người phụ trách sau khi đã chọn một người (nút "HDV: …" + "Bỏ chọn — để Chờ nhận"): quét lại.
    await p.ev("document.querySelector('#owner-card [data-action=\"pick-handler\"]').click(); true");
    await p.waitFor("!!document.querySelector('.assignee-root .assignee-person')", "bảng chọn người phụ trách có người", 10000);
    await p.ev("document.querySelector('.assignee-root .assignee-person').click(); true");
    await p.waitFor("!!document.querySelector('#owner-card .owner-current')", "khối Người phụ trách đã chọn");
    await sleep(200);
    await kiemThangNut(p, "1040, đã chọn người phụ trách");
  });
  assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), [], "không lỗi console (1040)");
  p.close();
} finally {
  await env.stop();
}
if (!AXE) console.log("(chưa chạy axe: thiếu AXE_JS)");
if (loi.length) {
  console.log(`\nTHANH DINH SMOKE ĐỎ (${loi.length} bước):\n- ${loi.join("\n- ")}`);
  process.exit(1);
}
console.log("THANH DINH SMOKE OK");
