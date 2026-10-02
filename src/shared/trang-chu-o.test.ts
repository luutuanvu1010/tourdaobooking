import assert from "node:assert/strict";
import { test } from "node:test";
import { NHOM_O, O_TOI, TOI_DA_O, mauO, nhomMayTinh, oTrangChu, type KhoaO } from "./trang-chu-o.ts";
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

test("Giao diện (ADR-0087): ô chỉ Toàn quyền, cùng câu hỏi với mục thanh bên (ô settings.ops), ở nhóm Quản lý sau Trợ lý Hỗ trợ", () => {
  const ql = (r: ReturnType<typeof oTrangChu>) => khoa(r.nhom.find((g) => g.ten === "Quản lý")?.o ?? []);
  assert.deepEqual(ql(oTrangChu(who("SUPER_ADMIN"))).slice(-2), ["tro-ly", "giao-dien"]);
  assert.ok(!ql(oTrangChu(who("ADMIN"))).includes("giao-dien"), "Quản trị không có ô Giao diện");
  assert.ok(!oTrangChu(who("SALES")).nhom.flatMap((g) => khoa(g.o)).includes("giao-dien"));
});

test("Máy tính: nhóm giống bảng trượt điện thoại + ô Tôi đứng đầu nhóm Của tôi (điện thoại có tab Tôi nên lưới / bảng trượt không có ô này)", () => {
  const n = PERMISSION_CODES.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    const ma = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const dt = oTrangChu(who(...ma));
    const mt = nhomMayTinh(who(...ma));
    assert.deepEqual(mt.map((g) => g.ten), dt.nhom.map((g) => g.ten), ma.join("+"));
    for (const [i, g] of mt.entries()) {
      const goc = khoa(dt.nhom[i]!.o);
      assert.deepEqual(khoa(g.o), g.ten === "Của tôi" ? ["toi", ...goc] : goc, `${ma.join("+")} · ${g.ten}`);
    }
    assert.ok(!dt.nhom.flatMap((g) => khoa(g.o)).includes("toi") && !khoa(dt.luoi).includes("toi"), `${ma.join("+")}: điện thoại không có ô Tôi`);
  }
  assert.deepEqual(O_TOI, { khoa: "toi", nhan: "Tôi", href: "/account" });
  assert.ok(PAGES.includes(O_TOI.href));
});

test("Máy tính, bản vẽ v2 (2/10): đúng các ô của ba vai đã vẽ", () => {
  const mt = (...ma: PermissionCode[]) => nhomMayTinh(who(...ma)).map((g) => [g.ten, khoa(g.o)]);
  assert.deepEqual(mt("SALES"), [["Bán hàng", ["tao-don", "don-hang", "danh-ba"]], ["Vận chuyển", ["dieu-phoi"]], ["Của tôi", ["toi", "gop-y", "tro-giup"]]]);
  assert.deepEqual(mt("ADMIN"), [
    ["Bán hàng", ["tao-don", "don-hang", "danh-ba"]],
    ["Quản lý", ["dich-vu", "tai-khoan", "dia-diem", "giay-to-nguoi"]],
    ["Vận chuyển", ["dieu-phoi", "xe", "sap-het-han", "giay-to-xe", "ly-do"]],
    ["Của tôi", ["toi", "gop-y", "tro-giup"]],
  ]);
  // Toàn quyền: bản vẽ có 8 ô Quản lý (vẽ trước khi 1.67 thêm màn Giao diện); ô Giao diện đứng cuối nhóm.
  assert.deepEqual(mt("SUPER_ADMIN"), [
    ["Bán hàng", ["tao-don", "don-hang", "danh-ba"]],
    ["Quản lý", ["dich-vu", "tai-khoan", "phien", "dia-diem", "giay-to-nguoi", "nhat-ky", "gui-thong-bao", "tro-ly", "giao-dien"]],
    ["Vận chuyển", ["dieu-phoi", "xe", "sap-het-han", "giay-to-xe", "chinh-sach", "ly-do"]],
    ["Của tôi", ["toi", "gop-y", "tro-giup"]],
  ]);
});

// Thị giác 1.69 (chủ dự án duyệt 2/10): ô tô màu theo NHÓM — Tạo đơn san hô (hành động chốt), Vận chuyển ngọc, Của tôi cát; Bán hàng / Quản lý giữ màu biển (null).
test("mauO: màu ô theo nhóm — Tạo đơn chốt, Vận chuyển ngọc, Của tôi (kể cả ô Tôi của máy tính) cát, còn lại màu biển", () => {
  assert.equal(mauO("tao-don"), "chot");
  for (const k of ["don-hang", "danh-ba", "dich-vu", "tai-khoan", "phien", "dia-diem", "giay-to-nguoi", "nhat-ky", "gui-thong-bao", "tro-ly", "giao-dien"] as const) assert.equal(mauO(k), null, k);
  for (const k of ["dieu-phoi", "cuoc", "xe", "sap-het-han", "giay-to-xe", "chinh-sach", "ly-do"] as const) assert.equal(mauO(k), "vc", k);
  for (const k of ["toi", "gop-y", "tro-giup"] as const) assert.equal(mauO(k), "toi", k);
  assert.equal(mauO(O_TOI.khoa), "toi");
  // Mọi ô của mọi nhóm đều có màu đúng theo nhóm của nó (tổ hợp quyền thấy gần đủ ô).
  for (const g of oTrangChu(who("ADMIN", "SUPER_ADMIN", "DRIVER", "SALES")).nhom) {
    for (const o of g.o) assert.equal(mauO(o.khoa), o.khoa === "tao-don" ? "chot" : g.ten === "Vận chuyển" ? "vc" : g.ten === "Của tôi" ? "toi" : null, `${g.ten}: ${o.khoa}`);
  }
});
