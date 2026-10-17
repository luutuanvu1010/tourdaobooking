// Rào tĩnh giao diện xoá dữ liệu (ADR-0126; web/CLAUDE.md). Phá thử: thêm h("textarea") vào khung từ chối → (2) đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
const doc = (p: string) => (existsSync(new URL(`../${p}`, import.meta.url)) ? readFileSync(new URL(`../${p}`, import.meta.url), "utf8") : "").replace(/\/\/.*$/gm, "");
const px = doc("web/phieu-xoa.ts");
const hs = doc("web/ho-so-cua-toi.ts");
const ss = doc("web/sessions.ts");
test("(0) chống bài rỗng: các tệp giao diện tồn tại", () => {
  assert.ok(px.length > 500, "web/phieu-xoa.ts chưa có");
  assert.ok(hs.length > 500 && ss.length > 500);
});
test("(1) không innerHTML; chỉ import src/shared không đuôi; không import src/modules", () => {
  for (const ma of [px, hs, ss]) {
    assert.doesNotMatch(ma, /innerHTML|outerHTML|insertAdjacentHTML/);
    assert.doesNotMatch(ma, /src\/modules\//);
    assert.doesNotMatch(ma, /from "\.\.\/src\/shared\/[^"]+\.ts"/);
  }
});
test("(2) từ chối chỉ chọn trong danh sách đóng — không ô chữ tự do", () => {
  assert.doesNotMatch(px, /h\("textarea"|type:\s*"text"/);
  assert.match(px, /LY_DO_TU_CHOI_XOA/);
});
test("(3) Thực hiện và Gửi yêu cầu xoá đều có bước xác nhận hai lần, câu có chữ 'không hoàn tác'", () => {
  assert.match(px, /không hoàn tác/);
  assert.match(hs, /không hoàn tác/);
  assert.match(hs, /xacNhan:\s*true/);
  assert.match(px, /xacNhan:\s*true/);
});
test("(4) trang Tôi chỉ gọi /api/parties/cua-toi* và POST chính sách (rào cũ vẫn giữ); khối Danh bạ chỉ gọi /api/parties/phieu-xoa*, /api/parties/anh-can-xoa*", () => {
  const hsDuong = [...hs.matchAll(/["`](\/api\/[^"`$]*)/g)].map((m) => m[1]!);
  assert.ok(hsDuong.length >= 4, "chống bài rỗng");
  for (const d of hsDuong) assert.match(d, /^\/api\/parties\/(cua-toi|chinh-sach-rieng-tu)/);
  const pxDuong = [...px.matchAll(/["`](\/api\/[^"`$]*)/g)].map((m) => m[1]!);
  assert.ok(pxDuong.length >= 5, "chống bài rỗng");
  for (const d of pxDuong) assert.match(d, /^\/api\/parties\/(phieu-xoa|anh-can-xoa)/);
});
test("(5) web/orders.ts không nhập các khối này (trần gói)", () => {
  assert.doesNotMatch(doc("web/orders.ts"), /phieu-xoa|xoa-an-danh/);
});
test("(6) không hiện dấu ẩn danh như dữ liệu: không chuỗi 1900-01-01, 'XOA' trong mã giao diện", () => {
  for (const ma of [px, hs]) assert.doesNotMatch(ma, /1900-01-01|"XOA/);
});
test("(7) hỏi bảng quyền bằng can(); không hasPermission; không console / lưu trữ trình duyệt; không ô tải tệp", () => {
  for (const ma of [px, hs, ss]) {
    assert.doesNotMatch(ma, /hasPermission|holdsPartner/);
    assert.doesNotMatch(ma, /\bconsole\./);
    assert.doesNotMatch(ma, /\b(localStorage|sessionStorage|indexedDB|caches)\b|document\.cookie|history\.(push|replace)State/);
    assert.doesNotMatch(ma, /type:\s*"file"/);
  }
  assert.match(px, /can\(staff, "party\.erasure\.process"\)/);
  assert.match(ss, /can\(staff, "auth\.session\.policy"\)/);
  assert.match(hs, /can\(staff, "party\.erasure\.request"/);
});
test("(8) khối ảnh hết lý do giữ: dùng mã ẩn danh của ảnh, không khoá kho; chỉ tối đa 50 mã mỗi lần; có xác nhận không hoàn tác", () => {
  assert.doesNotMatch(px, /storage_key|storageKey|khoaKho/);
  assert.match(px, /\b50\b/);
  assert.match(px, /nhanLyDoXoaAnh/);
});
test("(9) trang Phiên chỉ thêm đúng route /api/sessions/an-danh-cu (cùng route cũ), nút tắt khi chính sách chưa có số ngày", () => {
  const duong = [...ss.matchAll(/["`](\/api\/sessions\/an-danh-cu)/g)].length;
  assert.ok(duong >= 2, "cần GET và POST an-danh-cu");
  assert.match(ss, /chưa có thời hạn/);
  assert.match(ss, /không hoàn tác/);
});
test("(10) trang Tôi: thời hạn chỉ hiện khi chính sách có số ngày — có câu lời thường cho trường hợp thiếu, không hằng số ngày", () => {
  assert.match(hs, /chưa ghi thời hạn/);
  assert.match(hs, /hanXuLyXoaNgay/);
  assert.doesNotMatch(hs, /\b(30|45|60|90) ngày\b/);
  assert.match(hs, /daXoa/);
});
