// ADR-0135 Đ7 + Đ8, kế hoạch Đợt 2 Task 2.2: màn Tạo đơn không còn ô «Thanh toán trước» / «Hình thức» / «Người thu tiền», không còn lời gọi ghi thu sau khi lưu,
// thanh dính cuối trang không còn dòng trả trước; nút QR ở trang đơn chỉ hiện khi đơn đã xác nhận. Bài khoá chữ nguồn (giao diện thật cần Chrome — kịch bản a2-smoke-form).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const doc = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
// Bỏ chú thích để bài chỉ canh mã/HTML thật chứ không canh lời giải thích lịch sử.
const boChuThich = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/<!--[\s\S]*?-->/g, "");

test("form Tạo đơn: không còn ô / mã / lời gọi trả trước", () => {
  const ts = boChuThich(doc("web/order-form.ts"));
  const html = boChuThich(doc("public/order-form.html"));
  for (const [ten, nguon] of [["web/order-form.ts", ts], ["public/order-form.html", html]] as const) {
    for (const chuoi of ["prepaid", "traTruoc", "tra-truoc", "thutruoc", "/payments", "LanThuInput"]) assert.equal(nguon.includes(chuoi), false, `${ten} còn «${chuoi}»`);
    for (const chu of ["Thanh toán trước", "Hình thức", "Người thu tiền", "Trả trước"]) assert.equal(nguon.includes(chu), false, `${ten} còn chữ «${chu}»`);
  }
});

test("hướng dẫn Bán hàng / Đối tác không còn dặn gõ ô trả trước ở màn Tạo đơn", () => {
  for (const tep of ["huong-dan-ban-hang.ts", "huong-dan-doi-tac.ts", "huong-dan-chung.ts", "huong-dan-quan-tri.ts", "huong-dan-ke-toan.ts"]) {
    const s = doc(`src/shared/${tep}`);
    assert.equal(/Thanh toán trước/.test(s), false, `${tep} còn nhắc ô «Thanh toán trước»`);
    assert.equal(/Người thu tiền\]\]|\*\*Người thu tiền\*\*/.test(s), false, `${tep} còn nhắc ô «Người thu tiền» của màn Tạo đơn`);
  }
  assert.ok(readdirSync(new URL("../src/shared", import.meta.url)).includes("huong-dan-ban-hang.ts"));
});

test("trang đơn: nút QR thanh toán chỉ dựng khi đơn đã xác nhận", () => {
  const ts = doc("web/order.ts");
  const dong = ts.split("\n").find((l) => l.includes("nut.push(nutQr(")) ?? "";
  assert.match(dong, /order\.status === "confirmed"/, `dòng dựng nút QR: ${dong.trim()}`);
});
