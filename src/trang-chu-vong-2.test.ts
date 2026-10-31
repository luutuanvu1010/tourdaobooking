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
