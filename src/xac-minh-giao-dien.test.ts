// Rào tĩnh khối Hàng chờ xác minh (ADR-0125 đ6; web/CLAUDE.md). Phá thử: thêm h("textarea") vào khung từ chối → (2) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const doc = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const ma = doc("../web/xac-minh-hang-cho.ts").replace(/\/\/.*$/gm, "");
test("(1) không innerHTML; chỉ import src/shared không đuôi; không import src/modules", () => {
  assert.doesNotMatch(ma, /innerHTML|outerHTML|insertAdjacentHTML/);
  assert.doesNotMatch(ma, /src\/modules\//);
  assert.doesNotMatch(ma, /from "\.\.\/src\/shared\/[^"]+\.ts"/);
});
test("(2) từ chối chỉ chọn trong danh sách đóng — không ô chữ tự do", () => {
  assert.doesNotMatch(ma, /h\("textarea"|type:\s*"text"/);
  assert.match(ma, /LY_DO_TU_CHOI/);
});
test("(3) không sửa trường khai: không gọi PUT /api/parties, không route liên hệ / giấy tờ", () => {
  assert.doesNotMatch(ma, /"PUT"|\/contacts|\/documents/);
});
test("(4) không ghi số đủ vào bộ nhớ lâu dài (localStorage / sessionStorage / caches)", () => {
  assert.doesNotMatch(ma, /localStorage|sessionStorage|caches\./);
});
test("(5) web/orders.ts không nhập khối này (trần gói)", () => {
  assert.doesNotMatch(doc("../web/orders.ts"), /xac-minh/);
});
test("(6) số đủ: không console, không indexedDB / cookie / history, không chuyển trang; chỉ route /api/parties/xac-minh*", () => {
  assert.doesNotMatch(ma, /\bconsole\./);
  assert.doesNotMatch(ma, /indexedDB|document\.cookie|history\.(push|replace)State|location\.(replace|assign|href|hash|search)\b|window\.open/);
  const duong = [...ma.matchAll(/["`](\/api\/[^"`$]*)/g)].map((m) => m[1]!);
  assert.ok(duong.length >= 4, "chống bài rỗng");
  for (const d of duong) assert.ok(d.startsWith("/api/parties/xac-minh"), `gọi route ngoài khối: ${d}`);
});
test("(7) chỉ dò chữ: có nút 'Hiện số', đường xem-so và method POST trong mã (hành vi thật do kịch bản Chrome xac-minh-smoke canh)", () => {
  assert.match(ma, /\/xem-so`/);
  assert.match(ma, /"Hiện số"/);
  assert.match(ma, /method:\s*"POST"/);
});
test("(8) chỉ dò chữ: mã có nhắc xacMinhDuoc, lyDoKhong và câu 'chưa có ảnh' (khoá nút, ẩn nút do kịch bản Chrome xac-minh-smoke canh)", () => {
  assert.match(ma, /xacMinhDuoc/);
  assert.match(ma, /lyDoKhong/);
  assert.match(ma, /chưa có ảnh/);
});
test("(8b) đổi tab 'Đang chờ' / 'Đã xử lý' đều đóng khung chi tiết (khung 'Hiện số' tự ẩn)", () => {
  assert.match(ma, /nutCho\.addEventListener\("click",[^\n]*dongChiTiet\(\)/);
  assert.match(ma, /nutXong\.addEventListener\("click",[^\n]*dongChiTiet\(\)/);
});
test("(9) lỗi hiện câu tiếng Việt của máy chủ (ApiError.message), không mã thô", () => {
  assert.match(ma, /ApiError/);
  assert.match(ma, /\.message/);
  assert.doesNotMatch(ma, /\.code\b/);
});
test("(10) staff.ts gọi khối theo bảng quyền can(staff, \"party.verify\"), không hasPermission", () => {
  const s = doc("../web/staff.ts");
  assert.match(s, /can\(staff, "party\.verify"\)/);
  assert.match(s, /dungHangChoXacMinh\(/);
  assert.doesNotMatch(ma, /hasPermission/);
  assert.match(doc("../public/staff.html"), /<section id="xac-minh"[^>]*hidden/);
});
test("(11) CSS khối .xm-* chỉ dùng token (không hex / rgb / px ngoài 1px)", () => {
  const css = doc("../public/app.css");
  const i = css.indexOf("Hàng chờ xác minh (ADR-0125");
  assert.ok(i > 0, "thiếu khối CSS");
  const khoi = css.slice(i, css.indexOf("/* ----------", i + 10));
  assert.match(khoi, /\.xm-/);
  assert.doesNotMatch(khoi, /#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|\b(?!1px)\d+px\b/);
});
