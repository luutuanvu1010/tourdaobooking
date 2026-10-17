// Rào tĩnh của khối "Hồ sơ của tôi" (lát H-3 Gói 2): (1) chỉ gọi route /api/parties/cua-toi* và POST /api/parties/chinh-sach-rieng-tu — KHÔNG BAO GIỜ PUT /api/parties/:id hay route
// liên hệ (nợ khoá birthDate / nút Đóng ADDRESS của lát H-1 không chạm tới đây); (2) không innerHTML; (3) ẩn/hiện hỏi bảng quyền bằng can(), không hasPermission; (4) không
// ô tải tệp (ruling R1); (5) web/orders.ts không kéo khối này vào gói (trần gói Đơn hàng).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../web/ho-so-cua-toi.ts", import.meta.url), "utf8");

test("(1) chỉ các route của khối; không PUT /api/parties/:id, không route liên hệ", () => {
  const duong = [...src.matchAll(/["`](\/api\/[^"`$]*)/g)].map((m) => m[1]!);
  assert.ok(duong.length >= 4, "chống bài rỗng");
  for (const d of duong) assert.ok(d.startsWith("/api/parties/cua-toi") || d === "/api/parties/chinh-sach-rieng-tu", `gọi route ngoài khối: ${d}`);
  assert.doesNotMatch(src, /method:\s*"PUT"/);
  assert.doesNotMatch(src, /\/contacts/);
});

test("(2)(3)(4) không innerHTML, hỏi can(), không hasPermission, không input type=file", () => {
  assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML/);
  assert.match(src, /can\(staff, "party\.self\.view", \{ ownerId: staff\.id \}\)/);
  assert.match(src, /can\(staff, "party\.privacy\.policy"\)/);
  assert.doesNotMatch(src, /hasPermission|holdsPartner/);
  assert.doesNotMatch(src, /type:\s*"file"/);
});

test("(5) web/orders.ts không import khối này", () => {
  assert.doesNotMatch(readFileSync(new URL("../web/orders.ts", import.meta.url), "utf8"), /ho-so-cua-toi/);
});

test("(6) vòng sửa 1 (ruling I-2): rút đồng ý được cả phiên bản CŨ đang đồng ý — khối đọc dongYPhienBan; (7) không console (số giấy tờ, ngày sinh, địa chỉ không ra nhật ký trình duyệt)", () => {
  assert.match(src, /\bd\.dongYPhienBan\b/);
  assert.doesNotMatch(src, /\bconsole\./);
});

test("(8) vòng sửa 2 M-1: giá trị khai không ra lưu trữ trình duyệt hay URL — không localStorage / sessionStorage / indexedDB / cookie / history; mọi lần chuyển trang chỉ là hàm tai() với cờ cố định", () => {
  assert.doesNotMatch(src, /\b(localStorage|sessionStorage|indexedDB|caches)\b|document\.cookie|history\.(push|replace)State/);
  // Chỉ một chỗ ghi location: hàm tai() dựng URL từ cờ đã biết (THONG_BAO). Không location.href =, location.assign, window.open, location.hash =.
  // Quét MÃ (bỏ dòng chú thích `//` — chú thích đầu tệp nhắc "location.replace" để giải thích luật).
  const ma = src.split("\n").filter((l) => !l.trimStart().startsWith("//")).join("\n");
  const ghi = [...ma.matchAll(/location\.(replace|assign|href|hash|search)\s*(\(|=(?!=))|window\.open\s*\(/g)].map((m) => m[0]);
  assert.deepEqual(ghi, ["location.replace("], `chỗ ghi location ngoài tai(): ${ghi.join(", ")}`);
  assert.match(src, /const tai = \(co: string\) => location\.replace\(`\/account\?hoso=\$\{co\}#ho-so-cua-toi`\);/);
  // tai() chỉ được gọi với chữ cố định có trong THONG_BAO — không bao giờ với giá trị ô.
  const goi = [...src.matchAll(/\btai\(([^)]*)\)/g)].map((m) => m[1]!.trim()).filter((a) => a !== "co: string");
  assert.ok(goi.length >= 3, "chống bài rỗng");
  for (const a of goi) assert.match(a, /^"(da-gui|da-luu)"$/, `tai() gọi với ${a}`);
});

test("(9) vòng sửa 2 I-1: đăng chính sách có bước xác nhận trong trang (cửa một chiều) — submit chỉ mở hộp xác nhận, lệnh ghi nằm ở nút 'Xác nhận đăng'", () => {
  const khoi = src.slice(src.indexOf("function khoiDangChinhSach"));
  assert.ok(khoi.length > 100, "chống bài rỗng");
  assert.match(khoi, /không gỡ được/);
  assert.match(khoi, /"Xác nhận đăng"/);
  assert.match(khoi, /"Huỷ"/);
  const nop = khoi.slice(khoi.indexOf('form.addEventListener("submit"'));
  const thanNop = nop.slice(0, nop.indexOf("});") + 3);
  assert.ok(thanNop.length > 20, "không thấy thân submit");
  assert.doesNotMatch(thanNop, /api</, "submit gọi thẳng route đăng — thiếu bước xác nhận");
  assert.equal([...khoi.matchAll(/\/api\/parties\/chinh-sach-rieng-tu/g)].length, 1);
});

test("(10) vòng sửa 2 M-6, M-7: max ô ngày sinh theo ngày Việt Nam (vnToday), không toISOString; ô địa chỉ tắt tự điền như form", () => {
  assert.match(src, /max: vnToday\(new Date\(\)\)/);
  assert.doesNotMatch(src, /toISOString\(\)\.slice\(0, 10\)/);
  assert.match(src, /id: "hs-dia-chi", maxlength: 200, autocomplete: "off"/);
  assert.doesNotMatch(src, /street-address/);
});
