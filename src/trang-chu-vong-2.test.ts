// Trang chủ máy tính vòng 2 (31/10/2026, bản 2.53): khoá CẤU TRÚC mà chủ đã nêu — Lối tắt ngay dưới lời chào (trước dải việc gấp), hai khối chi tiết nằm TRONG cột chính
// (không còn chiếm hàng đầu trang), mỗi khối chỉ 3 dòng và có «Xem tất cả», nhãn «quá N ngày» là viên nhỏ (không còn `.dd-canh-xn` cả hàng), «Cần xem lại» bỏ dòng lặp,
// bề rộng khung chung nâng có chủ đích. Đo thật bằng Chrome ở docs/evidence/2026-10-31-trang-chu-vong-2/. Bài này chỉ đọc tệp nguồn (không dựng DOM).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const doc = (p: string): string => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), "utf8");
const html = doc("public/index.html");
const css = doc("public/app.css");
const home = doc("web/home.ts");
const viTri = (s: string): number => {
  const i = html.indexOf(s);
  assert.ok(i >= 0, `index.html phải có ${s}`);
  return i;
};

test("Lối tắt đứng ngay dưới lời chào, TRƯỚC dải việc gấp và trước lưới hai cột", () => {
  assert.ok(viTri('id="dash-dai"') < viTri('id="dash-loi-tat"'));
  assert.ok(viTri('id="dash-loi-tat"') < viTri('id="dash-gap"'));
  assert.ok(viTri('id="dash-gap"') < viTri('id="dash-grid"'));
  assert.equal(html.match(/id="dash-loi-tat"/g)?.length, 1, "chỉ một thẻ Lối tắt (không còn bản ở cuối lưới)");
});

test("hai khối chi tiết nằm trong cột chính (sau mở #dash-cot-chinh, trước #dash-review), không đứng ngoài lưới", () => {
  const cot = viTri('id="dash-cot-chinh"');
  for (const id of ["dash-doi-chieu", "dash-thu-truoc"]) {
    assert.ok(viTri(`id="${id}"`) > cot && viTri(`id="${id}"`) < viTri('id="dash-review"'), `${id} phải nằm trong cột chính`);
    assert.ok(viTri(`id="${id}"`) > viTri('id="dash-grid"'), `${id} nằm trong #dash-grid`);
  }
});

test("web/home.ts: mỗi khối chi tiết tối đa 3 dòng, «Xem tất cả (N)» mở tại chỗ, nhãn quá hạn là viên nhỏ", () => {
  assert.match(home, /const CT_TOI_DA = 3;/);
  assert.match(home, /Xem tất cả \(\$\{tong\}\)/);
  assert.match(home, /class: "dash-ct-pill"/);
  assert.ok(!home.includes("dd-canh-xn"), "không còn thanh hồng cả hàng");
  assert.ok(!/Còn \$\{.*\} (khoản|việc) nữa/.test(home), "không còn câu «Còn N khoản nữa — mở từng đơn»");
  // chức năng và cổng quyền giữ nguyên
  for (const giu of ["ben-kia-da-nhan", "Xác nhận bên nhận đã nhận tiền", "coKhoiChoDoiChieu", "coKhoiThuTruoc", "/confirm"]) assert.ok(home.includes(giu), `phải còn ${giu}`);
});

test("«Cần xem lại» bỏ dòng lặp với «Đang chờ bạn» CHỈ ở máy tính, và chỉ khi người xem có khối chi tiết (cùng cổng với dòng Đang chờ bạn)", () => {
  assert.match(home, /if \(coKhoiDoiChieu\(staffDangXem\)\) r\.classList\.add\("dash-trung"\)/);
  assert.match(home, /if \(coKhoiThuTruoc\(staffDangXem\)\) r\.classList\.add\("dash-trung"\)/);
  const khoiMayTinh = css.slice(css.indexOf("/* Cột chính: khối chi tiết xếp DƯỚI"));
  assert.match(khoiMayTinh, /\.dash-review-row\.dash-trung \{ display: none; \}/);
  assert.ok(!/\.dash-trung/.test(css.slice(0, css.indexOf("Trang chủ vòng 2 (31/10)"))), "luật ẩn dòng lặp chỉ nằm trong khối vòng 2 (media ≥641px), điện thoại giữ đủ dòng");
});

test("CSS khối chi tiết chỉ dùng token (cột, chiều cao) — không số cứng", () => {
  const khoi = css.slice(css.indexOf(".dash-ct { container-type"), css.indexOf("@media (min-width: 641px) {\n  /* Cột chính: khối chi tiết xếp DƯỚI"));
  assert.ok(khoi.length > 500);
  for (const t of ["--w-ct-ma", "--w-ct-tien", "--w-ct-ngay", "--w-ct-the", "--w-ct-hanh", "--h-ct-mo"]) {
    assert.match(css, new RegExp(`${t}: `), `token ${t} khai ở :root`);
    assert.ok(khoi.includes(`var(${t})`), `${t} được dùng`);
  }
  assert.ok(!/(?<![\d.])(?:[2-9]|\d{2,})\d*px/.test(khoi), "không px cứng trong khối chi tiết (viền 1px là ngoại lệ chung của khung)");
});

test("bề rộng khung chung: trần 1920px (token), biểu mẫu Giao diện giữ trần cũ, Lập đơn giữ --w-form", () => {
  assert.match(css, /--w-noi-dung-max: 1920px;/);
  assert.match(css, /--w-main-hep: 1280px;/);
  assert.match(css, /main\.gd \{ max-width: var\(--w-main-hep\); \}/);
  assert.match(css, /main\.form-page \{ max-width: var\(--w-form\); \}/);
});

// ---- S1 của phiên kiểm độc lập vòng 2: ẩn dòng «Cần xem lại» ở máy tính KHÔNG được làm mất tín hiệu quá hạn ----
import { nguonCanTai, phuDoiChieu, phuThuTruoc, viecCuaBan } from "./shared/viec-cua-ban.ts";
import { NGAY_NHAC_DOI_CHIEU_HIEN_THI } from "./shared/doi-chieu-hien-thi.ts";
import type { PermissionHolder } from "./shared/permissions.ts";

const keToan = { id: "kt", permissions: ["ACCOUNTING"] } as unknown as PermissionHolder;
const sales = { id: "sl", permissions: ["SALES"] } as unknown as PermissionHolder;

test("S1: ca Kế toán có khoản quá hạn (nằm cuối danh sách): dòng «Chờ đối chiếu» ở «Đang chờ bạn» mang số quá hạn, nên ẩn dòng «Cần xem lại» không mất tín hiệu", () => {
  const r = viecCuaBan(keToan, { doiChieu: 54, doiChieuQuaHan: 40, thuTruoc: 7, thuTruocChiTiet: { canChi: 0, qua7Ngay: 2, sapHetHan: 1, conNguoiGiu: 7 } });
  const dc = [...r.the, ...r.conLaiThe].find((t) => t.khoa === "doiChieu");
  assert.equal(dc?.so, 54);
  assert.equal(dc?.phu, `40 khoản quá ${NGAY_NHAC_DOI_CHIEU_HIEN_THI} ngày — cần đối chiếu`);
  const tt = [...r.the, ...r.conLaiThe].find((t) => t.khoa === "thuTruoc");
  assert.equal(tt?.phu, "2 khoản đã duyệt quá 7 ngày · 1 đơn huỷ sắp hết hạn hoàn · 7 đơn còn người chưa nộp tiền");
  assert.equal(phuDoiChieu(0), "Khoản thu chờ Kế toán đối chiếu", "không quá hạn → câu cũ");
  assert.equal(phuDoiChieu(null), "Khoản thu chờ Kế toán đối chiếu");
  assert.equal(phuThuTruoc(null), "Khoản thu trước của đơn huỷ chờ chi hoàn / chuyển");
});

test("S1: web/home.ts đưa khoản quá hạn lên ĐẦU danh sách và dựng nhãn từ hằng số, không chữ cứng", () => {
  assert.match(home, /\[\.\.\.ds\]\.sort\(\(a, b\) => Number\(b\.qua3Ngay\) - Number\(a\.qua3Ngay\)\)/);
  assert.match(home, /\[\.\.\.muc\]\.sort\(\(a, b\) => Number\(b\.canhBao !== null\) - Number\(a\.canhBao !== null\)\)/);
  assert.match(home, /`quá \$\{NGAY_NHAC_DOI_CHIEU_HIEN_THI\} ngày`/);
  assert.ok(!home.includes('"quá 3 ngày"'), "không còn nhãn «quá 3 ngày» viết cứng");
});

test("S1: ca vai KHÔNG có khối chi tiết (Nhân viên lập đơn): không dòng đối chiếu / thu trước nên không dòng «Cần xem lại» nào bị gắn dash-trung", () => {
  assert.ok(!nguonCanTai(sales).includes("doiChieu") && !nguonCanTai(sales).includes("thuTruoc"));
  // dash-trung chỉ gắn khi người xem có khối (cùng cổng với dòng ở «Đang chờ bạn»)
  assert.match(home, /if \(coKhoiDoiChieu\(staffDangXem\)\) r\.classList\.add\("dash-trung"\)/);
  assert.match(home, /if \(coKhoiThuTruoc\(staffDangXem\)\) r\.classList\.add\("dash-trung"\)/);
  const nguon = { doiChieu: 54, doiChieuQuaHan: 40 };
  assert.ok(![...viecCuaBan(sales, nguon).the, ...viecCuaBan(sales, nguon).conLaiThe].some((t) => t.khoa === "doiChieu"));
});

// ---- Responsive (chủ chốt 31/10: giao diện phải xem đúng trên mọi thiết bị): giữ luật bề rộng ----
test("trần 1920px chỉ nằm ở MỘT token; mọi trần bề rộng khác của khung trỏ token, không px mới", () => {
  assert.equal(css.match(/:\s*1920px\s*;/g)?.length, 1, "giá trị 1920px chỉ được KHAI ở token --w-noi-dung-max (chữ trong chú thích không tính)");
  assert.match(css, /--w-noi-dung-max: 1920px;/);
  assert.match(css, /\n  --w-main: var\(--w-noi-dung-max\);/);
  assert.match(css, /\nmain \{ max-width: var\(--w-main\);/);
});

test("trang đọc / biểu mẫu / đăng nhập vẫn có trần hẹp riêng, không giãn theo màn rộng", () => {
  assert.match(css, /main\.form-page \{ max-width: var\(--w-form\); \}/); // Lập đơn
  assert.match(css, /main\.gd \{ max-width: var\(--w-main-hep\); \}/); // Giao diện
  assert.match(css, /\.narrow \{ max-width: var\(--w-narrow\); \}/); // thẻ hẹp (trang Tôi…)
  assert.match(css, /#me, #links, #maintenance[^{]*\{ max-width: var\(--w-narrow\); \}/);
  assert.match(css, /body\.login-page main\.login \{[^}]*max-width: none;/); // đăng nhập có khuôn riêng, không dùng khung main
  assert.match(css, /--w-form: 1120px;/);
  assert.match(css, /--w-main-hep: 1280px;/);
});

test("khối vòng 2 của Trang chủ không thêm bề rộng cứng px (ngoài viền 1px, mốc @media và container)", () => {
  const a = css.indexOf("/* ---------- Trang chủ vòng 2 (31/10)");
  const b = css.indexOf('/* Trang Hướng dẫn + chấm đỏ "có bản mới"');
  assert.ok(a > 0 && b > a);
  const khoi = css.slice(a, b).replace(/@media[^{]*\{/g, "").replace(/@container[^{]*\{/g, "");
  assert.ok(!/(?<![\d.])(?:[2-9]|\d{2,})\d*px/.test(khoi), "chỉ token trong khối vòng 2");
  assert.ok(!/(?:max-|min-)?width:\s*[1-9]/.test(khoi), "không width/max-width/min-width số cứng");
});

test("Lối tắt: thẻ hẹp xếp hai hàng bốn ô (container query), thẻ rộng một hàng — không khe «5 + 3» giữa hai điểm gãy", () => {
  assert.match(css, /\.dash-loi-tat \{ container-type: inline-size;/);
  assert.match(css, /@container \(max-width: 44rem\) \{ \.dash-loi-tat-luoi \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\); \} \}/);
  assert.match(css, /--w-loi-tat-o: 80px;/);
});
