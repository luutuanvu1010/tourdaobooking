// Bài NỐI DÂY của đặc tả docs/superpowers/specs/2026-11-20-sua-giao-dien-bon-y-cua-chu.md (H1–H4, chủ duyệt 20/11/2026): canh các điểm mà kịch bản Chrome không chạy trong `npm test`.
// Khớp mẫu chữ trong mã giao diện — đổi cấu trúc thì bài đỏ để người sửa đọc lại đặc tả. Luật thuần có bài riêng: src/shared/loc-kho-ve.test.ts, src/shared/form-dat-ve.test.ts (`duaDonChiNoiDon`).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const doc = (tep: string): string => readFileSync(new URL(`../${tep}`, import.meta.url), "utf8");
const form = doc("web/order-form.ts");
const don = doc("web/order.ts");
const css = doc("public/app.css");

test("H1: khối «Người phụ trách» của form lập đơn ẩn với form Đối tác, và chỉ với form đó", () => {
  assert.match(form, /const banHangAn = !canNv\(staff, "dispatch\.sales\.invitees"\) \|\| formGon;/);
});

test("H1: «Hình thức thanh toán» dời sang chỗ chứa ở cột phải, đứng NGAY TRƯỚC thanh nút gửi; chỗ chứa hiện / ẩn cùng lựa chọn Trả sau", () => {
  assert.match(doc("public/order-form.html"), /<section id="hinh-thuc-cho"[^>]*hidden><\/section>\s*<div class="form-actions/);
  assert.match(form, /byId\("hinh-thuc-cho"\)\.append\(byId\("tra-sau-khoi"\), byId\("tra-sau-bao"\)\);/);
  assert.match(form, /byId\("hinh-thuc-cho"\)\.hidden = !formGon \|\| !c\.hien;/);
});

test("H1: ba câu giải thích về tiền GẬP (không xoá) sau nút «Giải thích giảm giá, đặt cọc»; tiêu đề «Thanh toán» chỉ ẩn với mắt", () => {
  assert.match(form, /bocGiaiThich\.append\(byId\("dat-coc-goi-y"\), byId\("dat-coc-tra-sau"\)\);/);
  assert.match(form, /taoKhoiGap\(\{ ma: "thanh-toan-giai-thich", nhan: "Giải thích giảm giá, đặt cọc", than: bocGiaiThich \}\)/);
  assert.match(form, /if \(gapGiaiThich && !discountEl\.readOnly\) gapGiaiThich\.than\.prepend\(hint\);/, "ô giảm giá đang khoá thì lý do khoá hiện ngay dưới ô, không gập");
  assert.match(form, /byId\("pay-title"\)\.classList\.add\("visually-hidden"\);/);
  // Cả ba thay đổi nằm trong nhánh form gọn của Đối tác: form văn phòng không đổi.
  const nhanh = form.slice(form.indexOf("if (formGon) {"), form.indexOf("duocDatGap = can("));
  for (const dau of ["pay-title", "hinh-thuc-cho", "thanh-toan-giai-thich"]) assert.ok(nhanh.includes(dau), `«${dau}» phải nằm trong nhánh form Đối tác`);
});

test("H2 phương án nhẹ: form Đối tác bật chế độ một ô «Nơi đón» qua luật thuần, phần ẩn chỉ ẩn bằng lớp CSS", () => {
  assert.match(doc("web/service-card.ts"), /chiNoiDon: o\.formGonDoiTac === true/);
  const khoi = doc("web/khoi-dua-don.ts");
  assert.match(khoi, /const chiNoiDon = o\.che === "form" && o\.chiNoiDon === true && duaDonChiNoiDon\(legs, o\.ngayDi\(\)\);/);
  assert.match(khoi, /root\.classList\.toggle\("dd-chi-noi-don", chiNoiDon\);/);
  assert.match(css, /\.dd-chi-noi-don \.dd-luoi-noi > \.dd-cot:nth-child\(2\)/, "cột Nơi trả ẩn bằng CSS");
  assert.doesNotMatch(css, /\.dd-chi-noi-don[^{]*\.dd-luoi-noi > \.dd-cot:nth-child\(1\)[^{]*\{[^}]*display: none/, "ô Nơi đón không bao giờ bị ẩn");
});

test("H3: tài khoản Đối tác — «Nhập khoản thu» chèn ngay sau dòng «Còn lại»; nút phiếu công nợ giao cho khối «Hoa hồng của bạn» và có đường trả về", () => {
  assert.match(don, /kv\("Còn lại", vnd\(t\.conLai\), "strong"\)\);\n\s*sauConLai = rows\.length;/);
  assert.match(don, /if \(laDoiTac && sauConLai >= 0\) \{ ghiThu\.classList\.add\("pay-inline-sau-con-lai"\); rows\.splice\(sauConLai, 0, ghiThu\); \}/);
  assert.match(don, /initPhanDoiTac\(phanDoiTac, \{ nutCuoi: nutCongNoDoiTac,/);
  const pdt = doc("web/phan-doi-tac.ts");
  assert.equal((pdt.match(/traNutCuoi\(\);/g) ?? []).length, 3, "trả nút về thẻ Thanh toán ở cả ba lối: khối lỗi, khối ẩn, khối của văn phòng");
  assert.match(don, /"data-action": "ghi-lan-thu" \}, "Nhập khoản thu"\)/);
  assert.match(don, /"data-action": "cong-no-dai-ly" \}, "Thanh toán đơn này cho công ty Tour Đảo"\)/);
});

test("H3: trang đơn một cột khi màn dưới 1180 (trên 900 mới có lưới hai cột)", () => {
  assert.match(css, /@media \(max-width: 1179px\) \{[^\n]*\n\s*\.order-layout \{ grid-template-columns: minmax\(0, 1fr\); \}/);
});

test("H4: Kho vé lọc bằng luật thuần, không gọi máy chủ khi lọc", () => {
  const kho = doc("web/ve-kho.ts");
  assert.match(kho, /locKhoVe\(kho, locKho\)/);
  const ve = kho.slice(kho.indexOf("function veKho("), kho.indexOf("async function taiKho("));
  assert.doesNotMatch(ve, /\bapi[<(]/, "lọc chỉ trên dữ liệu đã tải");
});
