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

// ADR-0230 Đ2 (23/11/2026): khối hình thức hiện khi có lựa chọn Trả sau HOẶC «Trả lúc check-in» (biến `coKhoi`), không còn chỉ theo `c.hien`.
test("H1: «Hình thức thanh toán» dời sang chỗ chứa ở cột phải, đứng NGAY TRƯỚC thanh nút gửi; chỗ chứa hiện / ẩn cùng khối lựa chọn hình thức", () => {
  assert.match(doc("public/order-form.html"), /<section id="hinh-thuc-cho"[^>]*hidden><\/section>\s*<div class="form-actions/);
  assert.match(form, /byId\("hinh-thuc-cho"\)\.append\(byId\("tra-sau-khoi"\), byId\("tra-sau-bao"\)\);/);
  assert.match(form, /const coKhoi = c\.hien \|\| checkinDuoc;/);
  assert.match(form, /byId\("hinh-thuc-cho"\)\.hidden = !formGon \|\| !coKhoi;/);
});

test("H1: ba câu giải thích về tiền GẬP (không xoá) sau nút «Giải thích giảm giá, đặt cọc»; tiêu đề «Thanh toán» chỉ ẩn với mắt", () => {
  assert.match(form, /bocGiaiThich\.append\(byId\("dat-coc-goi-y"\), byId\("dat-coc-tra-sau"\)\);/);
  // Việc 5 (b1), 21/11: nhãn theo cờ ô đặt cọc (luật thuần nhanGapGiaiThichTien — bài src/an-o-coc-doi-tac.test.ts).
  assert.match(form, /taoKhoiGap\(\{ ma: "thanh-toan-giai-thich", nhan: nhanGapGiaiThichTien\(coODatCoc\), than: bocGiaiThich \}\)/);
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
  // ADR-0221 (21/11): chế độ một ô «Nơi đón» nhường chỗ khi chế độ ẩn hết lượt đang áp (công tắc «Đối tác không nhập nơi đón» bật VÀ luật an toàn đúng).
  assert.match(khoi, /root\.classList\.toggle\("dd-chi-noi-don", chiNoiDon && !anHetLuot\);/);
  assert.match(css, /\.dd-chi-noi-don \.dd-luoi-noi > \.dd-cot:nth-child\(2\)/, "cột Nơi trả ẩn bằng CSS");
  assert.doesNotMatch(css, /\.dd-chi-noi-don[^{]*\.dd-luoi-noi > \.dd-cot:nth-child\(1\)[^{]*\{[^}]*display: none/, "công tắc tắt / chế độ chiNoiDon: ô Nơi đón không bao giờ bị ẩn");
});

test("ADR-0221: ô «Nơi đón» chỉ bị ẩn bởi lớp dd-an-het-luot — lớp đó chỉ bật khi công tắc đang áp (hàm của trang) VÀ luật thuần duaDonAnHetLuot đúng", () => {
  const khoi = doc("web/khoi-dua-don.ts");
  assert.match(khoi, /const anHet = \(\): boolean => o\.che === "form" && o\.anHetLuot\?\.\(\) === true && duaDonAnHetLuot\(legs, o\.ngayDi\(\)\);/);
  assert.match(khoi, /const anHetLuot = anHet\(\);/);
  assert.match(khoi, /root\.classList\.toggle\("dd-an-het-luot", anHetLuot\);/);
  assert.match(doc("web/service-card.ts"), /anHetLuot: \(\) => o\.khongNhapNoiDon\?\.\(\) === true,/, "thẻ không bật cờ bằng hằng — vắng công tắc thì form không đổi");
  assert.match(css, /\.dd-an-het-luot > \.dd-chang-khung \{ display: none; \}/, "khung lượt ẩn bằng CSS, vẫn nằm trong cây DOM");
  const khac = (css.match(/[^}]*\.dd-luoi-noi > \.dd-cot:nth-child\(1\)[^{]*\{[^}]*display: none/g) ?? []).length;
  assert.equal(khac, 0, "không luật CSS nào khác ẩn riêng cột Nơi đón");
});

test("H3: tài khoản Đối tác — «Nhập khoản thu» chèn ngay sau dòng «Còn lại»; nút phiếu công nợ giao cho khối «Hoa hồng của bạn» và có đường trả về", () => {
  assert.match(don, /kvSo\("Còn lại", vnd\(t\.conLai\), "strong"\)\);\n\s*sauConLai = rows\.length;/); // khung gốc (ADR-0222): dòng tiền của cột phụ dựng bằng kvSo (giá trị canh phải)
  assert.match(don, /if \(laDoiTac && sauConLai >= 0\) \{ ghiThu\.classList\.add\("pay-inline-sau-con-lai"\); rows\.splice\(sauConLai, 0, ghiThu\); \}/);
  assert.match(don, /initPhanDoiTac\(phanDoiTac, \{ nutCuoi: nutCongNoDoiTac,/);
  const pdt = doc("web/phan-doi-tac.ts");
  assert.equal((pdt.match(/traNutCuoi\(\);/g) ?? []).length, 3, "trả nút về thẻ Thanh toán ở cả ba lối: khối lỗi, khối ẩn, khối của văn phòng");
  assert.match(don, /"data-action": "ghi-lan-thu" \}, "Nhập khoản thu"\)/);
  assert.match(don, /"data-action": "cong-no-dai-ly" \}, "Thanh toán đơn này cho công ty Tour Đảo"\)/);
});

// H3 (20/11) đặt mốc cửa sổ 1180 cho hai cột của trang đơn vì cột tiền cố định làm «số tiền, số điện thoại vỡ giữa chừng» ở 900–1179. Từ khung gốc (ADR-0222, chủ dự án duyệt
// hình 21/11/2026 ở cả cửa sổ 1.130) hai cột không theo cửa sổ nữa mà theo bề rộng VÙNG NỘI DUNG: từ 800 chia 7/5 trên lưới 12 (cột tiền co giãn theo trang), hẹp hơn thì một cột.
// Điều H3 canh («không chật tới mức vỡ số») nay do lệnh đo của khung kiểm trên trang thật (0 đoạn chữ bị bóp ở mọi bề rộng); bài này khoá phần đọc được trong mã.
test("H3: trang đơn hai cột theo bề rộng vùng nội dung (từ 800), hẹp hơn thì một cột — không theo mốc cửa sổ", () => {
  assert.match(don, /\n    haiCot\(\n/, "trang đơn dựng hai cột bằng hàm của khung");
  assert.doesNotMatch(don, /order-layout/, "không còn lưới riêng của trang đơn");
  assert.doesNotMatch(css, /\.order-layout/, "luật kiểu của lưới cũ đã gỡ");
  assert.match(css, /body\[data-khung-goc\] \.hai-cot \{ display: grid; grid-template-columns: minmax\(0, 1fr\);/, "mặc định (vùng nội dung hẹp) một cột");
  assert.match(css, /@container trang \(min-width: 800px\) \{\n  body\[data-khung-goc\] \.hai-cot \{ grid-template-columns: repeat\(12, minmax\(0, 1fr\)\); \}/, "hai cột chỉ bật khi vùng nội dung từ 800");
});

test("H4: Kho vé lọc bằng luật thuần, không gọi máy chủ khi lọc", () => {
  const kho = doc("web/ve-kho.ts");
  assert.match(kho, /locKhoVe\(kho, locKho\)/);
  const ve = kho.slice(kho.indexOf("function veKho("), kho.indexOf("async function taiKho("));
  assert.doesNotMatch(ve, /\bapi[<(]/, "lọc chỉ trên dữ liệu đã tải");
});
