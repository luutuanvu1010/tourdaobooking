import assert from "node:assert/strict";
import { test } from "node:test";
import { nguonCanTai, viecCuaBan } from "./viec-cua-ban.ts";
import type { PermissionCode } from "./permissions.ts";

const who = (...permissions: PermissionCode[]) => ({ id: "x", permissions });
const day = { nhap: 3, conThieu: { count: 5, total: 18_400_000 }, chuaPhuTrach: 2, chuyenHomNay: 4, xemLai: 3, dieuChinh: 2, gopY: 4 };

test("Bán hàng: nhap · conThieu · chuaPhuTrach · chuyenHomNay, không thẻ của Kế toán/Quản trị", () => {
  assert.deepEqual(viecCuaBan(who("SALES"), day).the.map((t) => t.khoa), ["nhap", "conThieu", "chuaPhuTrach", "chuyenHomNay"]);
});
// Bản đồ thật: Kế toán giữ ledger.adjust.approve (any) nhưng không order.create / admin.manage ⇒ không có chuaPhuTrach.
// Thẻ cọc bị bỏ khỏi đợt 1 (chưa có trang cọc), nên Kế toán còn bốn thẻ này.
test("Kế toán: dieuChinh · nhap · conThieu · chuyenHomNay, không chuaPhuTrach", () => {
  assert.deepEqual(viecCuaBan(who("ACCOUNTING"), day).the.map((t) => t.khoa), ["dieuChinh", "nhap", "conThieu", "chuyenHomNay"]);
});
test("Quản trị: xemLai đứng đầu; không có thẻ Góp ý", () => {
  const r = viecCuaBan(who("ADMIN"), day).the.map((t) => t.khoa);
  assert.equal(r[0], "xemLai");
  assert.ok(!r.includes("gopY"));
});
test("Toàn quyền có thể có thẻ Góp ý khi còn chỗ; thẻ thứ 5 trở đi tính vào conLai", () => {
  const r = viecCuaBan(who("ADMIN", "SUPER_ADMIN"), day);
  assert.equal(r.the.length, 4);
  assert.ok(r.conLai >= 1);
});
test("số 0 thì không có thẻ; nguồn lỗi (null) thì GIỮ thẻ với so = null", () => {
  const r = viecCuaBan(who("SALES"), { ...day, nhap: 0, conThieu: null });
  assert.ok(!r.the.some((t) => t.khoa === "nhap"));
  assert.equal(r.the.find((t) => t.khoa === "conThieu")?.so, null);
});
test("không việc nào → danh sách rỗng, conLai 0", () => {
  assert.deepEqual(viecCuaBan(who("SALES"), { nhap: 0, conThieu: { count: 0, total: 0 }, chuaPhuTrach: 0, chuyenHomNay: 0 }), { the: [], conLai: 0 });
});
test("nguồn chưa tải (khoá vắng) thì không có thẻ, không phải thẻ 0", () => {
  assert.deepEqual(viecCuaBan(who("SALES"), {}).the, []);
});
test("chỉ thẻ đầu 'nhap' là nút chốt (san hô); người khác không có thẻ chốt thừa", () => {
  const the = viecCuaBan(who("SALES"), day).the;
  assert.equal(the.filter((t) => t.chot).length, 1);
  assert.equal(the.find((t) => t.chot)?.khoa, "nhap");
});
test("câu phụ thẻ conThieu nói số tiền còn thu; nguồn lỗi thì không bịa số tiền", () => {
  assert.equal(viecCuaBan(who("SALES"), day).the.find((t) => t.khoa === "conThieu")?.phu, "Còn phải thu 18,4tr");
  const loi = viecCuaBan(who("SALES"), { ...day, conThieu: null }).the.find((t) => t.khoa === "conThieu");
  assert.ok(!/\d/.test(loi?.phu ?? ""));
});
test("thẻ chuaPhuTrach: Bán hàng 'Nhận phụ trách', Quản trị 'Phân công'", () => {
  assert.equal(viecCuaBan(who("SALES"), day).the.find((t) => t.khoa === "chuaPhuTrach")?.nut, "Nhận phụ trách");
  assert.equal(viecCuaBan(who("ADMIN"), { chuaPhuTrach: 2 }).the[0]?.nut, "Phân công");
});
test("nguonCanTai: chỉ nguồn người này dùng; không nguồn quản trị cho Bán hàng/Kế toán", () => {
  assert.deepEqual([...nguonCanTai(who("SALES"))], ["nhap", "conThieu", "chuaPhuTrach", "chuyenHomNay"]);
  assert.deepEqual([...nguonCanTai(who("ACCOUNTING"))], ["dieuChinh", "nhap", "conThieu", "chuyenHomNay"]);
  assert.ok(nguonCanTai(who("ADMIN")).includes("xemLai"));
  assert.ok(!nguonCanTai(who("ADMIN")).includes("gopY"));
  assert.ok(nguonCanTai(who("SUPER_ADMIN")).includes("gopY"));
});
