import { test } from "node:test";
import assert from "node:assert/strict";
import { LOC_CHUA_GAN, LOC_TAT_CA, chonLocHopLe, locTheoVai, nutLocVai } from "./loc-tai-khoan.ts";
import { ROLES, type RoleCode } from "./roles.ts";

const tk = (id: string, roles: RoleCode[]) => ({ id, roles });
// Bốn tài khoản: hai người bán hàng (một người kiêm thực tập — hai vai), một công ty lữ hành, một tài khoản chưa gán vai.
const ban = tk("ban", ["SALES_STAFF"]);
const kiem = tk("kiem", ["INTERN", "SALES_STAFF"]); // viết NGƯỢC thứ tự ROLE_CODES: thứ tự nút vẫn theo ROLE_CODES
const luHanh = tk("lu-hanh", ["TRAVEL_AGENCY"]);
const chua = tk("chua", []);
const ds = [ban, kiem, luHanh, chua];

test("nutLocVai: «Tất cả» đầu tiên kèm tổng; các vai theo thứ tự ROLE_CODES, chỉ vai có tài khoản; «Chưa gán vai trò» cuối; tài khoản hai vai đếm ở cả hai nút", () => {
  assert.deepEqual(nutLocVai(ds, {}), [
    { khoa: LOC_TAT_CA, nhan: "Tất cả", soLuong: 4 },
    { khoa: "SALES_STAFF", nhan: ROLES.SALES_STAFF.name, soLuong: 2 },
    { khoa: "INTERN", nhan: ROLES.INTERN.name, soLuong: 1 },
    { khoa: "TRAVEL_AGENCY", nhan: ROLES.TRAVEL_AGENCY.name, soLuong: 1 },
    { khoa: LOC_CHUA_GAN, nhan: "Chưa gán vai trò", soLuong: 1 },
  ]);
  assert.equal(LOC_TAT_CA, "tat-ca");
  assert.equal(LOC_CHUA_GAN, "chua-gan");
});

test("nutLocVai: không có tài khoản nào chưa gán vai thì không có nút «Chưa gán vai trò»; vai không ai giữ không có nút; danh sách rỗng chỉ còn «Tất cả (0)»", () => {
  const khoa = nutLocVai([ban, luHanh], {}).map((n) => n.khoa);
  assert.deepEqual(khoa, [LOC_TAT_CA, "SALES_STAFF", "TRAVEL_AGENCY"]);
  assert.ok(!khoa.includes("DIRECTOR"), "vai Giám đốc không ai giữ thì không có nút");
  assert.deepEqual(nutLocVai([], {}), [{ khoa: LOC_TAT_CA, nhan: "Tất cả", soLuong: 0 }]);
});

test("nutLocVai: tên vai hiện hành (tenVai) thắng tên gốc ROLES; vai thiếu trong tenVai dùng tên gốc", () => {
  const nut = nutLocVai(ds, { SALES_STAFF: "Nhân viên bán tour" });
  assert.equal(nut.find((n) => n.khoa === "SALES_STAFF")?.nhan, "Nhân viên bán tour");
  assert.equal(nut.find((n) => n.khoa === "INTERN")?.nhan, ROLES.INTERN.name, "INTERN không có trong tenVai → tên gốc");
});

test("locTheoVai: «Tất cả» trả đủ theo thứ tự cũ; mã vai trả tài khoản mang vai đó (kể cả tài khoản hai vai); «Chưa gán vai trò» trả tài khoản roles rỗng", () => {
  assert.deepEqual(locTheoVai(ds, LOC_TAT_CA), ds);
  assert.deepEqual(locTheoVai(ds, "SALES_STAFF").map((a) => a.id), ["ban", "kiem"]);
  assert.deepEqual(locTheoVai(ds, "INTERN").map((a) => a.id), ["kiem"]);
  assert.deepEqual(locTheoVai(ds, LOC_CHUA_GAN).map((a) => a.id), ["chua"]);
  assert.equal(locTheoVai(ds, "SALES_STAFF")[0], ban, "trả lại chính đối tượng của danh sách (giữ kiểu, không sao chép)");
});

test("chonLocHopLe: khoá còn nút thì giữ; null, chữ rác hoặc khoá không còn nút (vai không còn ai giữ) thì về «Tất cả»", () => {
  const nut = nutLocVai(ds, {});
  assert.equal(chonLocHopLe("INTERN", nut), "INTERN");
  assert.equal(chonLocHopLe(LOC_CHUA_GAN, nut), LOC_CHUA_GAN);
  assert.equal(chonLocHopLe(LOC_TAT_CA, nut), LOC_TAT_CA);
  assert.equal(chonLocHopLe(null, nut), LOC_TAT_CA);
  assert.equal(chonLocHopLe("rác", nut), LOC_TAT_CA);
  assert.equal(chonLocHopLe("DIRECTOR", nut), LOC_TAT_CA, "vai hợp lệ nhưng không còn tài khoản nào → không còn nút → về Tất cả");
  // Sau khi người cuối cùng giữ vai INTERN bị đổi vai: nút INTERN mất, lựa chọn đã nhớ phải rơi về «Tất cả», không để bảng trống không lý do.
  assert.equal(chonLocHopLe("INTERN", nutLocVai([ban, luHanh], {})), LOC_TAT_CA);
});
