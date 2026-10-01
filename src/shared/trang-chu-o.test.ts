import assert from "node:assert/strict";
import { test } from "node:test";
import { NHOM_O, TOI_DA_O, oTrangChu, type KhoaO } from "./trang-chu-o.ts";
import { PERMISSION_CODES, type PermissionCode } from "./permissions.ts";
import { PAGES } from "./sw-policy.ts";

const who = (...permissions: PermissionCode[]) => ({ id: "staff-1", permissions });
const khoa = (ds: readonly { khoa: KhoaO }[]) => ds.map((o) => o.khoa);

test("Bán hàng: 6 ô, không có ô Tất cả (bản vẽ 1a + ô Điều phối xe theo ô trip.view)", () => {
  const r = oTrangChu(who("SALES"));
  assert.deepEqual(khoa(r.luoi), ["tao-don", "don-hang", "danh-ba", "dieu-phoi", "gop-y", "tro-giup"]);
  assert.equal(r.coTatCa, false);
});

test("Kế toán: không có ô Tạo đơn (ADR-0007), không có ô Tất cả (bản vẽ 1d)", () => {
  const r = oTrangChu(who("ACCOUNTING"));
  assert.deepEqual(khoa(r.luoi), ["don-hang", "danh-ba", "dieu-phoi", "gop-y", "tro-giup"]);
  assert.equal(r.coTatCa, false);
});

test("Quản trị: hơn 8 chức năng → 7 ô đầu theo thứ tự ưu tiên + ô Tất cả (bản vẽ 1b)", () => {
  const r = oTrangChu(who("ADMIN"));
  assert.deepEqual(khoa(r.luoi), ["tao-don", "don-hang", "danh-ba", "dieu-phoi", "xe", "sap-het-han", "dich-vu"]);
  assert.equal(r.coTatCa, true);
});

test("Quản trị: bảng trượt Tất cả chia bốn nhóm, mỗi nhóm đúng các ô người đó được dùng (bản vẽ 1c)", () => {
  const r = oTrangChu(who("ADMIN"));
  assert.deepEqual(
    r.nhom.map((n) => [n.ten, khoa(n.o)]),
    [
      ["Bán hàng", ["tao-don", "don-hang", "danh-ba"]],
      ["Quản lý", ["dich-vu", "tai-khoan", "dia-diem", "giay-to-nguoi"]],
      ["Vận chuyển", ["dieu-phoi", "xe", "sap-het-han", "giay-to-xe", "ly-do"]],
      ["Của tôi", ["gop-y", "tro-giup"]],
    ],
  );
});

test("Toàn quyền: thêm Nhật ký, Phiên đăng nhập, Gửi thông báo, Trợ lý Hỗ trợ, Chính sách điều phối (ô chỉ Toàn quyền)", () => {
  const r = oTrangChu(who("SUPER_ADMIN"));
  const tatCa = r.nhom.flatMap((n) => khoa(n.o));
  for (const k of ["nhat-ky", "phien", "gui-thong-bao", "tro-ly", "chinh-sach"] as const) assert.ok(tatCa.includes(k), k);
  assert.equal(r.coTatCa, true);
  // Quản trị không có các ô đó (ADR-0038: Nhật ký chỉ Toàn quyền; ADR-0075: sổ phiên chỉ Toàn quyền).
  const qt = oTrangChu(who("ADMIN")).nhom.flatMap((n) => khoa(n.o));
  for (const k of ["nhat-ky", "phien", "gui-thong-bao", "tro-ly", "chinh-sach"] as const) assert.ok(!qt.includes(k), `Quản trị không có ${k}`);
});

test("Tài khoản chỉ Toàn quyền thấy GIỐNG HỆT Quản trị + Toàn quyền (bài học hỏi bảng quyền, 2026-10-01)", () => {
  assert.deepEqual(oTrangChu(who("SUPER_ADMIN")), oTrangChu(who("ADMIN", "SUPER_ADMIN")));
});

test("Tài xế công ty kiêm văn phòng có ô Cuốc của tôi; tài khoản chỉ tài xế thì không (họ có tab riêng)", () => {
  assert.ok(oTrangChu(who("SALES", "DRIVER")).nhom.flatMap((n) => khoa(n.o)).includes("cuoc"));
  assert.ok(!oTrangChu(who("DRIVER")).nhom.flatMap((n) => khoa(n.o)).includes("cuoc"));
});

test("Mọi tổ hợp quyền: lưới tối đa 8 chỗ (7 ô + Tất cả khi thừa), lưới ⊂ bảng trượt, không nhóm rỗng, Góp ý + Trợ giúp luôn có", () => {
  const n = PERMISSION_CODES.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    const ma = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const r = oTrangChu(who(...ma));
    const tatCa = r.nhom.flatMap((g) => khoa(g.o));
    assert.ok(r.luoi.length + (r.coTatCa ? 1 : 0) <= TOI_DA_O, `${ma.join("+")}: quá ${TOI_DA_O} chỗ`);
    assert.equal(r.coTatCa, tatCa.length > TOI_DA_O, `${ma.join("+")}: ô Tất cả chỉ khi hơn ${TOI_DA_O} chức năng`);
    if (!r.coTatCa) assert.equal(r.luoi.length, tatCa.length, `${ma.join("+")}: không có Tất cả thì lưới hiện đủ`);
    for (const k of khoa(r.luoi)) assert.ok(tatCa.includes(k), `${ma.join("+")}: ô ${k} của lưới phải có trong bảng trượt`);
    for (const g of r.nhom) assert.ok(g.o.length > 0, `${ma.join("+")}: nhóm ${g.ten} rỗng`);
    assert.ok(tatCa.includes("gop-y") && tatCa.includes("tro-giup"), ma.join("+"));
    assert.equal(new Set(tatCa).size, tatCa.length, `${ma.join("+")}: ô trùng`);
  }
});

test("Mỗi ô trỏ tới một trang có thật (khai ở PAGES); nhãn là chữ cho người đọc, không phải mã thô", () => {
  const r = oTrangChu(who("ADMIN", "SUPER_ADMIN", "SALES", "DRIVER"));
  const trang = new Set(PAGES);
  for (const o of r.nhom.flatMap((g) => g.o)) {
    assert.ok(trang.has(o.href.split("?")[0]!), `${o.khoa}: ${o.href} không có trong PAGES`);
    assert.match(o.nhan, /^\p{Lu}[^-]*$/u, `${o.khoa}: nhãn "${o.nhan}" phải viết hoa chữ đầu, không phải mã`);
  }
  assert.deepEqual(r.nhom.map((g) => g.ten), [...NHOM_O]);
});
