import assert from "node:assert/strict";
import { test } from "node:test";
import { PERMISSION_CODES, type PermissionCode } from "./shared/permissions.ts";
import { THANH_BEN, TRANG, coHien, thanhBen, thietLapMoSan, type KhoaTrang } from "./shared/muc-giao-dien.ts";

// Mọi trang có mặt ở thanh bên TRƯỚC khi đổi (34 khoá, cây 14/10) — lối vào không được mất.
const TRANG_THANH_BEN_CU: readonly KhoaTrang[] = [
  "trangChu", "donHang", "taoDon", "danhBa", "dichVu", "taiKhoan", "phien", "diaDiem", "loaiGiayToNguoi", "dieuPhoi", "xeDangChay", "deNghi",
  "bangGiaXe", "bangKeXe", "xe", "lichXeBan", "sapHetHan", "loaiGiayToXe", "chinhSachDieuPhoi", "lyDoDieuPhoi", "khoaThang", "dieuChinhCongNo",
  "hoaHong", "nguoiBan", "nhatKy", "guiThongBao", "troLy", "giaoDien", "trangTaiXe", "cuoc", "ban", "toi", "gopY", "troGiup",
];
const holder = (permissions: readonly PermissionCode[]) => ({ id: "x", permissions });

/** Khoá trang còn tới được từ thanh bên mới: mục hiện + mọi khoá trong `gom` của mục hiện. */
function toiDuoc(permissions: readonly PermissionCode[]): Set<KhoaTrang> {
  const out = new Set<KhoaTrang>();
  for (const c of THANH_BEN) {
    if (!coHien(c, { staff: holder(permissions) })) continue;
    out.add(c.trang);
    for (const k of ("gom" in c ? c.gom : []) as readonly KhoaTrang[]) out.add(k);
  }
  return out;
}

test("MỌI tập quyền: trang thấy trước đây vẫn tới được, và không thấy thêm trang nào mới", () => {
  for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
    const p = PERMISSION_CODES.filter((_, i) => m & (1 << i));
    const truoc = new Set(TRANG_THANH_BEN_CU.filter((k) => TRANG[k].hien(holder(p))));
    const sau = toiDuoc(p);
    for (const k of truoc) assert.ok(sau.has(k), `${p.join("+")}: mất lối vào ${k}`);
    for (const k of sau) assert.ok(truoc.has(k), `${p.join("+")}: thấy thêm ${k}`);
  }
});

const SO_MUC_HIEN_SAN = (p: readonly PermissionCode[]): number =>
  thanhBen({ staff: holder(p) }, "/").filter((g) => g.nhom !== "THIẾT LẬP" && g.nhom !== "CHÂN MENU").flatMap((g) => g.muc).filter((m) => !m.noiBat).length;

test("trần 10 mục hiện sẵn (không tính nút Tạo đơn, Thiết lập, chân menu) cho các vai thật", () => {
  const vai: Record<string, PermissionCode[]> = {
    "Bán hàng": ["SALES"], "Kế toán": ["ACCOUNTING"], "Quản trị": ["ADMIN"], "Toàn quyền": ["ADMIN", "SUPER_ADMIN"], "Bán hàng+Kế toán": ["SALES", "ACCOUNTING"],
    "Tài xế": ["DRIVER"], "Tài xế đối tác": ["DRIVER_PARTNER"], "Hướng dẫn viên": ["FIELD"], "Đối tác": ["PARTNER"], "Thực tập": ["INTERN"], "Nhân sự": ["HR"],
  };
  for (const [ten, p] of Object.entries(vai)) assert.ok(SO_MUC_HIEN_SAN(p) <= 10, `${ten}: ${SO_MUC_HIEN_SAN(p)} mục`);
});

test("hướng dẫn viên: có Đơn hàng + chân menu, không có nhóm khác", () => {
  const g = thanhBen({ staff: holder(["FIELD"]) }, "/").filter((x) => x.muc.length);
  assert.deepEqual(g.map((x) => x.nhom), ["HẰNG NGÀY", "CHÂN MENU"]);
  assert.deepEqual(g[0].muc.map((m) => m.nhan), ["Đơn hàng"]);
});

test("Kế toán: Hoa hồng đối tác và Người bán dịch vụ nằm trong Thiết lập (chủ duyệt 14/10)", () => {
  const tl = thanhBen({ staff: holder(["ACCOUNTING"]) }, "/").find((x) => x.nhom === "THIẾT LẬP");
  assert.deepEqual(tl?.muc.map((m) => m.nhan), ["Hoa hồng đối tác", "Người bán dịch vụ"]);
});

test("Quản trị chưa có Phiên đăng nhập, Nhật ký, Chính sách điều phối (chỉ Toàn quyền)", () => {
  const nhan = thanhBen({ staff: holder(["ADMIN"]) }, "/").flatMap((x) => x.muc).map((m) => m.nhan);
  for (const c of ["Phiên đăng nhập", "Nhật ký", "Chính sách điều phối"]) assert.ok(!nhan.includes(c), c);
});

test("Thiết lập đóng sẵn cho Quản trị ở Trang chủ; mở khi đứng ở /locations; mở sẵn cho Nhân sự", () => {
  assert.equal(thietLapMoSan(thanhBen({ staff: holder(["ADMIN"]) }, "/"), "/"), false);
  assert.equal(thietLapMoSan(thanhBen({ staff: holder(["ADMIN"]) }, "/locations"), "/locations"), true);
  assert.equal(thietLapMoSan(thanhBen({ staff: holder(["HR"]) }, "/"), "/"), true);
});
