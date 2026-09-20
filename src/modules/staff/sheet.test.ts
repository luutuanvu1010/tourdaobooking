import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePersonFullName } from "../parties/rules.ts";
import { parseStaffSheet } from "./sheet.ts";

const csv = (lines: string[]) => lines.join("\n");
/** Cùng hàm kiểm tên mà Worker tiêm vào (staff/index.ts) — giới hạn 60/100/60 chỉ có MỘT nguồn ở module parties. */
const nameProblem = (full: string): string | null => {
  const r = validatePersonFullName(full);
  return r.ok ? null : r.message;
};
const parse = (text: string) => parseStaffSheet(text, nameProblem);

test("đọc ứng viên, chuẩn hoá SĐT, bỏ dòng ghi chú/trống", () => {
  const r = parse(
    csv([
      "STT,Tên người dùng,Số điện thoại ",
      "1,Trần Văn Một,0911111111",
      '2,"Lê, Thị ""Hai""",+84 922 222 222',
      "3,Phạm  Ba,0933.333.333",
      ",,",
      "Ghi chú:,Số điện thoại sẽ là tài khoản đăng nhập,",
    ]),
  );
  assert.ok(r.ok);
  assert.deepEqual(r.candidates.map((c) => [c.name, c.phone]), [
    ["Trần Văn Một", "0911111111"],
    ['Lê, Thị "Hai"', "0922222222"],
    ["Phạm Ba", "0933333333"],
  ]);
  assert.equal(r.problems.length, 0);
});

test("báo vấn đề: thiếu SĐT, SĐT sai, trùng, thiếu tên", () => {
  const r = parse(csv(["STT,Tên người dùng,Số điện thoại", "1,A,", "2,B,12345", "3,C,0911111111", "4,D,091 111 1111", "5,,0922222222"]));
  assert.ok(r.ok);
  assert.deepEqual(r.candidates.map((c) => c.phone), ["0911111111"]);
  assert.equal(r.problems.length, 4);
  assert.match(r.problems[0]!.message, /chưa có số điện thoại/);
  assert.match(r.problems[1]!.message, /không hợp lệ/);
  assert.match(r.problems[2]!.message, /trùng/);
  assert.match(r.problems[3]!.message, /chưa có họ tên/);
});

test("Sheet mẫu chưa có SĐT: không có ứng viên, không lỗi", () => {
  const r = parse(csv(["STT,Tên người dùng,Số điện thoại ", "1,Phong,", "2,,", "3,,"]));
  assert.ok(r.ok);
  assert.equal(r.candidates.length, 0);
});

test("Sheet không cấp quyền: bỏ qua cột Vai trò", () => {
  const r = parse(csv(["Tên người dùng,Số điện thoại,Vai trò", "Kẻ giả danh,0911111111,admin"]));
  assert.ok(r.ok);
  assert.deepEqual(Object.keys(r.candidates[0]!).sort(), ["name", "phone", "row"]);
});

test("thiếu cột bắt buộc", () => {
  const r = parse("Cột lạ,Khác\n1,2");
  assert.ok(!r.ok);
  assert.equal(r.reason, "missing_columns");
});

// Vòng sửa 1 Task B1: tên vượt giới hạn của pty_person phải thành "dòng có vấn đề", KHÔNG được lọt vào candidates —
// nếu lọt, cả đợt "Áp dụng" (một db.batch()) sẽ vỡ vì CHECK và trả 500.
test("dòng có họ tên vượt giới hạn của hồ sơ bị loại thành vấn đề, không phá cả đợt", () => {
  const tooLong = Array(25).fill("Nguyen").join(" "); // 174 ký tự: lọt trần 200 cũ nhưng vỡ CHECK middle_name
  const r = parse(csv(["Tên người dùng,Số điện thoại", `${tooLong},0911111111`, "Trần Văn Hai,0922222222"]));
  assert.ok(r.ok);
  assert.deepEqual(r.candidates.map((c) => c.name), ["Trần Văn Hai"], "dòng tốt vẫn được giữ");
  assert.equal(r.problems.length, 1);
  assert.equal(r.problems[0]!.row, 2);
  assert.match(r.problems[0]!.message, /tên đệm tối đa 100/);
});
