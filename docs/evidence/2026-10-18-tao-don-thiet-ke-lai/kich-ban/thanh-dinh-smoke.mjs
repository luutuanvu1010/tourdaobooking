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
//     9) form trống, Lưu: khung lỗi cuộn bên trong (overflow-y auto), thanh dính không cao quá 60% khung nhìn; không có thông báo nổi;
//   1040×768 (chuột thật):
//     10) cột phải: Tóm tắt (có dòng Giảm giá) → Người phụ trách → thanh nút [cảnh báo tiền, lỗi lưu, Lưu, Quay lại]; dòng tổng điện thoại không hiện;
//     11) trả trước ẩn / hiện như bước 3;
//     12) Lưu bị từ chối: #save-error kề trên #save, cả hai trong khung 1040×768; tiêu điểm ở ô lỗi đầu tiên;
//     13) thang nút như bước 4.
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
  const out = { chinh: [], btnPrimary: [], vienThuoc: [], nenNhat: [], netDut: [], loiNhoKhongXanh: [], soNut: 0 };
  for (const e of [...document.querySelectorAll('#order-form button, #order-form a.btn, #order-form [role=button]')].filter(vis)) {
    out.soNut++;
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    if (s.backgroundColor === DAC) out.chinh.push(ten(e));
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
  console.log(`   ${kho}: quét ${q.soNut} nút đang hiện`);
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
