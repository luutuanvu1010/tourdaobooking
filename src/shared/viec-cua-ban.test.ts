import assert from "node:assert/strict";
import { test } from "node:test";
import { cauTomTatViec, nguonCanTai, soXemLai, viecCuaBan } from "./viec-cua-ban.ts";
import { PERMISSION_CODES, seesAllOrders } from "./permissions.ts";
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
// Đặc tả §9.3: bốn thẻ Quản trị đợt 1 = Cần xem lại · Đơn nháp · Chưa phụ trách · Chuyến hôm nay (dieuChinh, conThieu xếp sau).
test("Quản trị: đúng bốn thẻ xemLai · nhap · chuaPhuTrach · chuyenHomNay; không Góp ý", () => {
  const r = viecCuaBan(who("ADMIN"), day);
  assert.deepEqual(r.the.map((t) => t.khoa), ["xemLai", "nhap", "chuaPhuTrach", "chuyenHomNay"]);
  assert.equal(r.conLai, 2);
});
test("Toàn quyền: cùng bốn thẻ đầu; Góp ý (nếu có) xếp sau dieuChinh/conThieu", () => {
  const r = viecCuaBan(who("ADMIN", "SUPER_ADMIN"), day);
  assert.deepEqual(r.the.map((t) => t.khoa), ["xemLai", "nhap", "chuaPhuTrach", "chuyenHomNay"]);
  assert.deepEqual(nguonCanTai(who("ADMIN", "SUPER_ADMIN")).slice(-3), ["dieuChinh", "conThieu", "gopY"]);
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
  assert.equal(viecCuaBan(who("SALES"), day).the.find((t) => t.khoa === "conThieu")?.phu, "Còn phải thu 18,4tr ₫");
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

test("1024 tập quyền: không xem mọi đơn ⇒ không thẻ đơn/tiền/chuyến và không đòi nguồn đó", () => {
  const DON = ["nhap", "conThieu", "chuaPhuTrach", "chuyenHomNay"];
  const dayDu = { ...day, conThieu: { count: 5, total: 1 } };
  let xet = 0;
  for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
    const w = who(...PERMISSION_CODES.filter((_, i) => m & (1 << i)));
    if (seesAllOrders(w)) continue;
    xet++;
    assert.ok(!viecCuaBan(w, dayDu).the.some((t) => DON.includes(t.khoa)), `thẻ đơn lọt cho ${w.permissions.join("+")}`);
    assert.ok(!nguonCanTai(w).some((k) => DON.includes(k)), `nguồn đơn bị đòi cho ${w.permissions.join("+")}`);
  }
  assert.ok(xet > 0);
});
test("nút theo quyền thật: Xác nhận đơn chỉ khi sửa được đơn; Ghi thu chỉ khi ghi được sổ", () => {
  const nut = (w: ReturnType<typeof who>, k: string) => viecCuaBan(w, day).the.find((t) => t.khoa === k);
  assert.equal(nut(who("SALES"), "nhap")?.nut, "Xác nhận đơn");
  assert.equal(nut(who("ACCOUNTING"), "nhap")?.nut, "Xem đơn nháp");
  assert.equal(nut(who("ACCOUNTING"), "nhap")?.chot, false);
  assert.equal(nut(who("ACCOUNTING"), "conThieu")?.nut, "Ghi thu");
  assert.equal(nut(who("SALES"), "conThieu")?.nut, "Xem đơn");
  assert.equal(nut(who("SALES"), "nhap")?.href, "/orders");
  for (const w of [who("SALES"), who("ACCOUNTING"), who("ADMIN"), who("ADMIN", "SUPER_ADMIN")]) {
    assert.ok(viecCuaBan(w, day).the.filter((t) => t.chot).length <= 1);
  }
});

test("soXemLai: số dịch vụ lệch giá + số giấy tờ sắp hết hạn; KHÔNG cộng góp ý; không có bảng thì 0", () => {
  assert.equal(soXemLai(null), 0);
  assert.equal(soXemLai({ catalogConflict: { moreCount: 2 }, expiringDocs: { count: 4 } }), 7);
  assert.equal(soXemLai({ catalogConflict: null, expiringDocs: { count: 4 } }), 4);
  assert.equal(soXemLai({ catalogConflict: { moreCount: 0 }, expiringDocs: null }), 1);
});
test("cauTomTatViec: 'Có N việc chờ bạn — gấp nhất: <nhãn thường> (<số>).'; N gồm cả thẻ dồn; không thẻ thì null", () => {
  const r = viecCuaBan(who("ADMIN"), day);
  assert.equal(cauTomTatViec(r.the, r.conLai), "Có 6 việc chờ bạn — gấp nhất: cần xem lại (3).");
  assert.equal(cauTomTatViec([], 0), null);
});
test("cauTomTatViec: số chưa tải (null) thì không viết số", () => {
  const r = viecCuaBan(who("SALES"), { ...day, nhap: null });
  assert.equal(cauTomTatViec(r.the, r.conLai), "Có 4 việc chờ bạn — gấp nhất: đơn nháp.");
});
