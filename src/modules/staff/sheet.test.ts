import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStaffSheet } from "./sheet.ts";

const csv = (lines: string[]) => lines.join("\n");

test("đọc ứng viên, chuẩn hoá SĐT, bỏ dòng ghi chú/trống", () => {
  const r = parseStaffSheet(
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
  const r = parseStaffSheet(csv(["STT,Tên người dùng,Số điện thoại", "1,A,", "2,B,12345", "3,C,0911111111", "4,D,091 111 1111", "5,,0922222222"]));
  assert.ok(r.ok);
  assert.deepEqual(r.candidates.map((c) => c.phone), ["0911111111"]);
  assert.equal(r.problems.length, 4);
  assert.match(r.problems[0]!.message, /chưa có số điện thoại/);
  assert.match(r.problems[1]!.message, /không hợp lệ/);
  assert.match(r.problems[2]!.message, /trùng/);
  assert.match(r.problems[3]!.message, /chưa có họ tên/);
});

test("Sheet mẫu chưa có SĐT: không có ứng viên, không lỗi", () => {
  const r = parseStaffSheet(csv(["STT,Tên người dùng,Số điện thoại ", "1,Phong,", "2,,", "3,,"]));
  assert.ok(r.ok);
  assert.equal(r.candidates.length, 0);
});

test("Sheet không cấp quyền: bỏ qua cột Vai trò", () => {
  const r = parseStaffSheet(csv(["Tên người dùng,Số điện thoại,Vai trò", "Kẻ giả danh,0911111111,admin"]));
  assert.ok(r.ok);
  assert.deepEqual(Object.keys(r.candidates[0]!).sort(), ["name", "phone", "row"]);
});

test("thiếu cột bắt buộc", () => {
  const r = parseStaffSheet("Cột lạ,Khác\n1,2");
  assert.ok(!r.ok);
  assert.equal(r.reason, "missing_columns");
});
