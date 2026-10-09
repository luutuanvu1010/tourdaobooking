// Nút "Sửa số khách dịch vụ" trên trang đơn — văn phòng sửa số khách sau xác nhận (ADR-0063 D1, chủ duyệt 2026-10-08 — gói A2). Chrome thật, 390 + 1040,
// không cần mạng ngoài. Chạy từ GỐC repo:
//   npm run build:web && CHROME_BIN=<đường dẫn tuyệt đối tới docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-10-08-a2-so-khach/kich-ban/sua-so-khach-smoke.mjs
// Bảy bước: (1) Bán hàng KHÔNG phải người lập không thấy nút; (2) Kế toán thấy nút, mở bảng: bộ đếm cho loại khách sửa được, dịch vụ nhập tay chỉ xem, bốn
// lý do không ô chữ, nút Lưu khoá tới khi chọn lý do, ô số 16px; (3) bớt 1 người lớn + "Khách bớt người" → lưu, dải "Đã lưu…", tiền tính lại, Lịch sử có dòng
// đúng khuôn; (4) người lập thấy nút; (5) giảm giá lớn hơn tạm tính ở 1040 (ADR-0109): dải vàng kèm câu cảnh báo + câu thường trực ở khối Thanh toán,
// Tổng cộng 0, khách trả dư = đúng số đã trả; (5b) biên nhận in giảm giá hiệu lực, ảnh xác nhận dựng được; (5c) Kế toán 390: câu cảnh báo và "Ghi hoàn cho
// khách" cùng trang, hoàn xong hết "Khách trả dư", câu vẫn đúng; (6) đơn Đã giao: không có nút; (7) không lỗi console, không tràn ngang.
// Có AXE_JS=<…/axe.min.js> thì bước 5 và 5c kiểm axe 0 vi phạm critical/serious.
// Ảnh 01–03 ở thư mục này là hồ sơ ngày 2026-10-08 (gói A2), đóng băng: chạy lại thì đặt OUT sang thư mục mới
// (ADR-0109 dùng OUT=docs/evidence/2026-10-09-adr-0109/anh), đừng ghi đè.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { ACCOUNTS, ok, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-08-a2-so-khach";
mkdirSync(OUT, { recursive: true });
// ADR-0109: kiểm axe-core (0 vi phạm critical/serious) ở bước 5 và 5c khi có AXE_JS (tệp axe.min.js ngoài repo); thiếu biến thì in rõ "bỏ qua".
const AXE = process.env.AXE_JS ? readFileSync(process.env.AXE_JS, "utf8") : null;
async function axeKhong(p, nhan) {
  if (!AXE) return "axe: BỎ QUA (thiếu AXE_JS)";
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev("axe.run(document).then((r) => r.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious').map((x) => ({ id: x.id, impact: x.impact, mau: x.nodes.slice(0, 2).map((n) => n.target.join(' ')) })))");
  assert.deepEqual(v, [], `axe (${nhan}): ${JSON.stringify(v)}`);
  return "axe 0 critical/serious";
}
const NUT = "Sửa số khách dịch vụ";
const nutCo = "[...document.querySelectorAll('#actions .btn')].some((b) => b.textContent === 'Sửa số khách dịch vụ')";
const pairs = "[...document.querySelectorAll('.totals .kv')].map((k) => [k.children[0].textContent, k.children[1].textContent])";

const env = await startEnv();
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, {
      method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const pax = (adult, child = 0) => ({ adult, child, senior: 0, infant: 0 });
  const ngay = vnDate(5);
  const base = { customerName: "Khách Sửa Số Khách", customerPhone: "0903 222 333", customerEmail: "", customerNote: "", paymentNote: "" };
  /** Lập (Bán hàng A), trả trước `daTra`, (tuỳ chọn) đổi dịch vụ thứ hai thành nhập tay khi còn nháp, rồi xác nhận. */
  async function donXacNhan({ services, discount = 0, daTra = 0, nhapTay = false }) {
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", { ...base, discount, services });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    const o = r.json.order;
    if (nhapTay) {
      env.sql(`UPDATE order_service SET catalog_code = NULL, unit = 'manual', name = 'Xe đưa đón riêng' WHERE id = '${o.services[1].id}'`);
      env.sql(`UPDATE order_item SET catalog_code = NULL, pax_code = NULL, catalog_price = NULL, description = 'Xe 7 chỗ 2 chiều', detail = NULL WHERE service_id = '${o.services[1].id}'`);
    }
    if (daTra) assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${o.id}/payments`, { soTien: daTra, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
    const xn = await call(ACCOUNTS.salesA, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
    assert.equal(xn.status, 200, JSON.stringify(xn.json));
    return o.id;
  }
  const td101 = (adult, child = 0) => ({ kind: "catalog", catalogCode: "TD101", pax: pax(adult, child), unitPrices: child ? { adult: 1350000, child: 950000 } : { adult: 1350000 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 }, departDate: ngay });
  const ttb06 = { kind: "catalog", catalogCode: "TTB06", pax: pax(1), catalogPriceSeen: { adult: 800000 }, departDate: ngay };

  // Đơn 1: Tour 4 đảo 2 NL × 1.350.000 + 1 TE × 950.000 = 3.650.000; Xe đưa đón riêng (nhập tay) 800.000 → 4.450.000; khách trả trước 500.000.
  const don1 = await donXacNhan({ services: [td101(2, 1), ttb06], daTra: 500000, nhapTay: true });

  // ---- 1) Bán hàng KHÔNG phải người lập: không có nút ----
  let p = await env.as(ACCOUNTS.salesB, `/order?id=${don1}`);
  await p.waitFor("document.querySelector('#order .badge')?.textContent === 'Đã xác nhận'", "đơn đã xác nhận");
  assert.equal(await p.ev(nutCo), false, "Bán hàng khác không thấy nút");
  p.close();
  ok("1) Bán hàng không phải người lập: không có nút Sửa số khách dịch vụ");

  // ---- 2) Kế toán (390): nút, bảng, bộ đếm, dịch vụ nhập tay chỉ xem, bốn lý do, nút Lưu khoá tới khi chọn, ô 16px ----
  p = await env.as(ACCOUNTS.accounting, `/order?id=${don1}`);
  await p.waitFor(nutCo, "Kế toán thấy nút");
  await p.ev(`[...document.querySelectorAll('#actions .btn')].find((b) => b.textContent === ${JSON.stringify(NUT)}).click()`);
  await p.waitFor("document.querySelector('.sheet-root') !== null && document.querySelector('[data-action=\"luu-so-khach\"]') !== null", "bảng mở");
  const bang = await p.ev(`(() => {
    const s = document.querySelector('.sheet-root');
    return {
      tieuDe: s.querySelector('h2, [id$="-title"]')?.textContent ?? null,
      khoi: [...s.querySelectorAll('.hdv-edit-svc')].map((k) => k.querySelector('.hdv-edit-name').textContent),
      hang: [...s.querySelectorAll('.hdv-pax-row .hdv-pax-label')].map((x) => x.textContent),
      coDinh: [...s.querySelectorAll('.hdv-edit-fixed')].map((x) => x.textContent),
      lyDo: [...s.querySelectorAll('input[name="so-khach-ly-do"]')].map((x) => x.closest('label').textContent),
      oChu: s.querySelectorAll('input[type="text"]:not(.counter-field), textarea').length,
      luuKhoa: s.querySelector('[data-action="luu-so-khach"]').disabled,
      coChu: getComputedStyle(s.querySelector('.counter-field')).fontSize,
    };
  })()`);
  assert.deepEqual(bang.khoi, ["Tour 4 đảo Nha Trang", "Xe đưa đón riêng"]);
  assert.deepEqual(bang.hang, ["Người lớn", "Trẻ em"], "chỉ loại khách có giá đã lưu");
  assert.equal(bang.coDinh.length, 1);
  assert.match(bang.coDinh[0], /không sửa được ở đây$/);
  assert.deepEqual(bang.lyDo, ["Khách thêm người", "Khách bớt người", "Đổi dịch vụ", "Khác"]);
  assert.equal(bang.oChu, 0, "không ô chữ lý do");
  assert.equal(bang.luuKhoa, true, "chưa chọn lý do thì nút Lưu khoá");
  assert.equal(bang.coChu, "16px", "ô số 16px (chống phóng to iOS)");
  await p.shot(`${OUT}/01-bang-sua-so-khach-390.png`);
  ok("2) Kế toán: bảng mở — 2 khối, bộ đếm Người lớn / Trẻ em, dịch vụ nhập tay chỉ xem, 4 lý do, không ô chữ, Lưu khoá, ô 16px");

  // ---- 3) bớt 1 người lớn, chọn "Khách bớt người", lưu → dải "Đã lưu…", tiền tính lại, Lịch sử ----
  await p.ev("document.querySelector('.sheet-root [aria-label=\"Giảm Người lớn — Tour 4 đảo Nha Trang\"]').click()");
  await p.ev("document.querySelector('.sheet-root input[name=\"so-khach-ly-do\"][value=\"BOT_NGUOI\"]').click()");
  assert.equal(await p.ev("document.querySelector('[data-action=\"luu-so-khach\"]').disabled"), false, "chọn lý do xong thì Lưu mở");
  await p.ev("document.querySelector('[data-action=\"luu-so-khach\"]').click()");
  await p.waitFor("document.querySelector('.sheet-root') === null && !document.getElementById('error').hidden", "bảng đóng, có dải báo");
  assert.match(await p.ev("document.getElementById('error').textContent"), /Đã lưu số khách mới, Nền tảng đã tính lại tiền\./);
  assert.equal(await p.ev("document.getElementById('error').classList.contains('banner-info')"), true);
  assert.deepEqual((await p.ev(pairs)).slice(0, 5), [["Tạm tính", "3.100.000 ₫"], ["Giảm giá", "0 ₫"], ["Tổng cộng", "3.100.000 ₫"], ["Khách hàng đã trả trước", "500.000 ₫"], ["Còn lại", "2.600.000 ₫"]]);
  await p.waitFor("[...document.querySelectorAll('.history-detail')].some((d) => d.textContent === 'số khách: Tour 4 đảo Nha Trang: người lớn 2 → 1 · lý do: Khách bớt người')", "dòng Lịch sử đúng khuôn");
  assert.equal(await p.ev("document.activeElement?.dataset?.action ?? null"), "sua-so-khach", "tiêu điểm trả về nút");
  assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
  assert.ok((await p.ev("document.documentElement.scrollWidth - innerWidth")) <= 0, "không tràn ngang 390");
  await p.shot(`${OUT}/02-da-luu-390.png`);
  p.close();
  ok("3) lưu: dải 'Đã lưu số khách mới…', Tạm tính 4.450.000 → 3.100.000, Còn lại 2.600.000, Lịch sử 'người lớn 2 → 1 · lý do: Khách bớt người', không lỗi console");

  // ---- 4) người lập (Bán hàng A) thấy nút ----
  p = await env.as(ACCOUNTS.salesA, `/order?id=${don1}`);
  await p.waitFor(nutCo, "người lập thấy nút");
  p.close();
  ok("4) người lập (Bán hàng) thấy nút");

  // ---- 5) tổng âm ở 1040: 2 NL × 1.350.000 = 2.700.000, giảm 2.000.000 → 700.000, khách trả đủ; Kế toán bớt còn 1 NL → 1.350.000 − 2.000.000: phải thu kẹp 0 (ADR-0109) ----
  const don2 = await donXacNhan({ services: [td101(2)], discount: 2000000, daTra: 700000 });
  p = await env.as(ACCOUNTS.accounting, `/order?id=${don2}`, { width: 1040, height: 900, mobile: false });
  await p.waitFor(nutCo, "Kế toán thấy nút (1040)");
  assert.equal(await p.ev("document.querySelector('[data-canh-bao=\"tong-am\"]') === null"), true, "chưa âm thì không có câu cảnh báo");
  await p.ev(`[...document.querySelectorAll('#actions .btn')].find((b) => b.textContent === ${JSON.stringify(NUT)}).click()`);
  await p.waitFor("document.querySelector('[data-action=\"luu-so-khach\"]') !== null", "bảng mở (1040)");
  await p.ev("document.querySelector('.sheet-root [aria-label=\"Giảm Người lớn — Tour 4 đảo Nha Trang\"]').click()");
  await p.ev("document.querySelector('.sheet-root input[name=\"so-khach-ly-do\"][value=\"BOT_NGUOI\"]').click()");
  await p.ev("document.querySelector('[data-action=\"luu-so-khach\"]').click()");
  await p.waitFor("document.querySelector('.sheet-root') === null && document.getElementById('error').classList.contains('banner-warning')", "dải vàng tổng âm");
  assert.match(await p.ev("document.getElementById('error').textContent"), /Đã lưu số khách mới — giảm giá đang lớn hơn tiền dịch vụ\..*Giảm giá lớn hơn tiền dịch vụ sau khi bớt khách/);
  assert.match(await p.ev("document.querySelector('[data-canh-bao=\"tong-am\"]')?.textContent ?? ''"), /nếu chưa hoàn thì Kế toán hoàn lại cho khách/);
  assert.deepEqual((await p.ev(pairs)).slice(0, 5), [
    ["Tạm tính", "1.350.000 ₫"], ["Giảm giá", "2.000.000 ₫"], ["Tổng cộng", "0 ₫"], ["Khách hàng đã trả trước", "700.000 ₫"], ["Khách trả dư", "700.000 ₫ — chờ Kế toán hoàn"],
  ], "ADR-0109: phải thu 0, dư = đúng số khách đã trả (không phồng 1.350.000)");
  assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
  const axe5 = await axeKhong(p, "5-trang-don-1040");
  await p.shot(`${OUT}/03-tong-am-1040.png`);
  ok(`5) giảm giá vượt tạm tính (1040): dải vàng kèm câu cảnh báo, câu thường trực ở khối Thanh toán, Tổng cộng 0, khách trả dư 700.000 (ADR-0109); ${axe5}`);

  // ---- 5b) biên nhận gửi khách (ADR-0109 QĐ4): in giảm giá HIỆU LỰC — Tạm tính 1.350.000 − Giảm giá 1.350.000 = Tổng cộng 0 ----
  const bn = await p.ev(`fetch('/api/orders/${don2}/receipt').then((r) => r.json()).then((j) => [j.receipt.subtotal, j.receipt.discount, j.receipt.total, j.receipt.daTra, j.receipt.conLai])`);
  assert.deepEqual(bn, [1350000, 1350000, 0, 700000, 0], "biên nhận cân ba dòng");
  await p.ev("document.querySelector('[data-action=\"send-confirmation\"]').click()");
  await p.waitFor("(document.querySelector('.sheet .confirm-img')?.naturalWidth ?? 0) > 0", "ảnh biên nhận dựng xong");
  assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
  await p.shot(`${OUT}/04-bien-nhan-tong-am-1040.png`);
  p.close();
  ok("5b) biên nhận (1040): /receipt [1.350.000, 1.350.000, 0], đã trả 700.000, còn lại 0; ảnh xác nhận dựng được");

  // ---- 5c) Kế toán ở 390: câu cảnh báo (khối Thanh toán) và hàng "Ghi hoàn cho khách" (khối Kế toán) cùng trang; hoàn 700.000 (người trả = Bán hàng A, người
  // đang giữ tiền mặt) → dòng "Khách trả dư" biến mất, Còn lại 0; câu cảnh báo vẫn còn và vẫn đúng ("nếu chưa hoàn…") ----
  p = await env.as(ACCOUNTS.accounting, `/order?id=${don2}`);
  await p.waitFor("document.querySelector('[data-canh-bao=\"tong-am\"]') !== null && document.querySelector('[data-action=\"ghi-hoan\"]') !== null", "câu cảnh báo + nút Ghi hoàn (390)");
  await p.ev("document.querySelector('[data-action=\"ghi-hoan\"]').click()");
  await p.waitFor("document.querySelector('[data-khoi=\"xac-nhan-ghi-hoan\"]') !== null", "hàng Ghi hoàn mở");
  assert.ok((await p.ev("document.documentElement.scrollWidth - innerWidth")) <= 0, "không tràn ngang 390");
  await p.shot(`${OUT}/05-canh-bao-va-ghi-hoan-390.png`);
  const axe5c = await axeKhong(p, "5c-ghi-hoan-390");
  await p.ev("(() => { const f = document.querySelector('[data-khoi=\"xac-nhan-ghi-hoan\"]'); const s = f.querySelectorAll('select'); s[s.length - 1].selectedIndex = 1; f.querySelector('button[type=\"submit\"]').click(); })()");
  await p.waitFor("document.querySelector('[data-action=\"ghi-hoan\"]') === null && [...document.querySelectorAll('.totals .kv')].some((k) => k.children[0].textContent === 'Còn lại')", "đã hoàn: hết dòng Khách trả dư");
  assert.deepEqual((await p.ev(pairs)).slice(0, 5), [["Tạm tính", "1.350.000 ₫"], ["Giảm giá", "2.000.000 ₫"], ["Tổng cộng", "0 ₫"], ["Khách hàng đã trả trước", "0 ₫"], ["Còn lại", "0 ₫"]]);
  assert.match(await p.ev("document.querySelector('[data-canh-bao=\"tong-am\"]')?.textContent ?? ''"), /Khách đã trả bao nhiêu thì số đó là tiền trả dư; nếu chưa hoàn thì Kế toán hoàn lại cho khách/, "câu vẫn còn sau khi hoàn, chữ vẫn đúng");
  assert.deepEqual(p.consoleErrors, [], `lỗi console: ${p.consoleErrors}`);
  await p.shot(`${OUT}/06-da-hoan-390.png`);
  p.close();
  ok(`5c) Kế toán 390: câu cảnh báo + Ghi hoàn cùng trang; hoàn 700.000 → hết "Khách trả dư", Còn lại 0, câu cảnh báo vẫn đúng; ${axe5c}`);

  // ---- 6) đơn Đã giao: không có nút (Kế toán) ----
  const don3 = await donXacNhan({ services: [{ ...td101(1), departDate: vnDate(0) }], daTra: 1350000 });
  env.sql(`UPDATE orders SET delivered_at = '${new Date().toISOString()}', delivered_by = 'chrome-thu' WHERE id = '${don3}'`); // dựng mốc Đã giao bằng SQL trên D1 tạm (trigger 0044 đòi mốc + người bấm cùng lúc)
  p = await env.as(ACCOUNTS.accounting, `/order?id=${don3}`);
  await p.waitFor("document.querySelector('#order .badge') !== null", "đơn Đã giao nạp");
  assert.equal(await p.ev(nutCo), false, "Đã giao: không có nút");
  p.close();
  ok("6) đơn Đã giao: không có nút");
  ok("7) không lỗi console ở bước 3 và 5; không tràn ngang ở 390");
} finally {
  await env.stop();
}
