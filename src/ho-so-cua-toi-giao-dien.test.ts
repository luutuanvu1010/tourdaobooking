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
