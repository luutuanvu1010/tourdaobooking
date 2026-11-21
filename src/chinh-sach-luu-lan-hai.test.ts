// Trang Chính sách điều phối, biểu mẫu đầy đủ của Toàn quyền: lưu xong phải lưu tiếp được ngay trên cùng trang (lỗi tìm thấy khi đo ngày 21/11/2026).
// Lỗi cũ: `luu()` nâng cờ «đang gửi» (`datDangGui(true)`) trước khi gọi máy chủ nhưng chỉ nhánh lỗi hạ cờ. Nhánh thành công dựng lại biểu mẫu mà không hạ,
// nên mọi lần bấm «Lưu thành bản mới» sau đó thoát ngay ở `if (dangGui) return;`: không gửi gì, không báo gì, câu «Đã lưu bản mới» của lần trước vẫn nằm đó
// và người dùng tưởng lần sửa thứ hai đã được lưu. Đo trên máy thử trước khi sửa: 4 lần bấm, máy chủ nhận 2 lệnh.
// Bài này khoá bằng cách đọc mã: cờ phải được hạ ở MỌI lối ra của lần gửi (khối finally), và mỗi lần gửi xoá câu báo cũ trước khi gọi máy chủ.
// Hành vi thật trên trình duyệt: docs/evidence/2026-11-21-sua-hai-loi-bo-cuc/kich-ban/do-hai-loi.mjs --luu (Toàn quyền lưu hai lần liền, không tải lại trang).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const trang = readFileSync(new URL("../web/chinh-sach-dieu-phoi.ts", import.meta.url), "utf8");

/** Thân của một hàm khai ở mức ngoài cùng của tệp (từ dòng khai tới dấu đóng ở đầu dòng). */
function than(khai: string): string {
  const dau = trang.indexOf(khai);
  assert.ok(dau >= 0, `không thấy «${khai}» trong web/chinh-sach-dieu-phoi.ts: sửa bài kiểm theo`);
  const het = trang.indexOf("\n}\n", dau);
  assert.ok(het > dau, `không thấy chỗ đóng của «${khai}»`);
  return trang.slice(dau, het + 2);
}

test("Toàn quyền: cờ «đang gửi» được hạ ở mọi lối ra của lần lưu, không chỉ ở nhánh lỗi", () => {
  const luu = than("async function luu(): Promise<void> {");
  assert.equal(luu.split("datDangGui(true)").length - 1, 1, "lần lưu phải nâng cờ đúng một chỗ");
  assert.match(luu, /datDangGui\(true\);\s*try \{/, "nâng cờ xong phải vào ngay khối try");
  // Khối finally là thứ cuối cùng của hàm (cho phép vài dòng chú thích trước lệnh hạ cờ).
  assert.match(luu, /\} finally \{\s*(?:\/\/[^\n]*\s*)*datDangGui\(false\);\s*\}\s*\}\s*$/, "thiếu khối finally hạ cờ: lưu thành công một lần thì mọi lần bấm lưu sau bị bỏ qua lặng lẽ");
  assert.equal(luu.split("datDangGui(false)").length - 1, 1, "hạ cờ ở đúng một chỗ (khối finally), không rải theo từng nhánh");
});

test("Toàn quyền: mỗi lần gửi xoá câu báo cũ trước khi gọi máy chủ, và chỉ bỏ qua khi một lần gửi khác đang chạy", () => {
  const luu = than("async function luu(): Promise<void> {");
  const chan = luu.indexOf("if (dangGui) return;");
  const xoaBao = luu.indexOf("showError(okEl, null);");
  const goi = luu.indexOf("await api<");
  assert.ok(chan > 0 && xoaBao > chan && goi > xoaBao, "thứ tự phải là: chặn gửi trùng, xoá câu báo cũ, rồi mới gọi máy chủ");
});

test("Quản trị (chế độ hai số): nút lưu được mở lại sau mỗi lần gửi, kể cả khi lỗi", () => {
  const nhanh = than("async function veMocRieng(): Promise<void> {");
  assert.match(nhanh, /nut\.disabled = true;\s*try \{[\s\S]*\} finally \{\s*nut\.disabled = false;\s*\}/);
});
