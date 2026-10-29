import assert from "node:assert/strict";
import { test } from "node:test";
import { PERMISSION_CODES, type PermissionCode } from "./shared/permissions.ts";
import { THANH_BEN, TRANG, coHien, demMucHienSan, thanhBen, thietLapMoSan, type KhoaTrang } from "./shared/muc-giao-dien.ts";

// Mọi trang có mặt ở thanh bên TRƯỚC khi đổi (cây 14/10) — lối vào không được mất. «Tạo đơn» đã BỎ khỏi thanh bên (Đợt 0, 7/16): nút đó nằm ở thanh trên và tab (THANH_TREN, THANH_TAB).
const TRANG_THANH_BEN_CU: readonly KhoaTrang[] = [
  "trangChu", "donHang", "danhBa", "dichVu", "taiKhoan", "phien", "diaDiem", "loaiGiayToNguoi", "dieuPhoi", "xeDangChay", "deNghi",
  "bangGiaXe", "bangKeXe", "xe", "lichXeBan", "sapHetHan", "loaiGiayToXe", "chinhSachDieuPhoi", "lyDoDieuPhoi", "khoaThang", "dieuChinhCongNo",
  "hoaHong", "nguoiBan", "nhatKy", "guiThongBao", "troLy", "giaoDien", "trangTaiXe", "cuoc", "ban", "toi", "gopY", "troGiup",
  // Thêm sau ảnh chụp 14/10 (trang mới, có chủ đích): sổ đại lý đợt 2 Task 12 — «Chụp bù mức» (ô order.terms.override, không Đối tác).
  "chupBu",
  // Sổ công nợ theo đối tác (kế hoạch 2026-10-24 P1, 25/10): ô ledger.view không ngữ cảnh.
  "soCongNo",
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

// Bài này kiểm: bảng thanh bên (kể cả `gom`) khớp với điều kiện hiện của TRANG — không mất lối vào và không có mục dẫn tới trang mà người đó không thấy.
// Nó so với `TRANG[k].hien` HIỆN TẠI nên KHÔNG bắt được việc nới điều kiện hiện của một trang: bảo đảm "không thấy thêm so với trước" do ảnh chụp
// src/muc-giao-dien-hien-trang.json bắt (ai chụp lại phải đọc phần thay đổi). Không đóng băng mặt nạ cũ.
test("MỌI tập quyền: bảng thanh bên (kể cả gom) khớp điều kiện hiện của TRANG — không mất lối vào, không có mục dẫn tới trang người đó không thấy", () => {
  for (let m = 0; m < 1 << PERMISSION_CODES.length; m++) {
    const p = PERMISSION_CODES.filter((_, i) => m & (1 << i));
    const truoc = new Set(TRANG_THANH_BEN_CU.filter((k) => TRANG[k].hien(holder(p))));
    const sau = toiDuoc(p);
    for (const k of truoc) assert.ok(sau.has(k), `${p.join("+")}: mất lối vào ${k}`);
    for (const k of sau) assert.ok(truoc.has(k), `${p.join("+")}: thấy thêm ${k}`);
  }
});

const SO_MUC_HIEN_SAN = (p: readonly PermissionCode[]): number => demMucHienSan(thanhBen({ staff: holder(p) }, "/"));

test("trần 10 khối hiện sẵn (nhóm gập đếm 1, Thiết lập đếm 1, không tính chân menu) cho các vai thật", () => {
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

test("Kế toán: Hoa hồng đối tác, Người bán dịch vụ (chủ duyệt 14/10) và Chụp bù mức (sổ đại lý đợt 2) nằm trong Thiết lập", () => {
  const tl = thanhBen({ staff: holder(["ACCOUNTING"]) }, "/").find((x) => x.nhom === "THIẾT LẬP");
  assert.deepEqual(tl?.muc.map((m) => m.nhan), ["Hoa hồng đối tác", "Người bán dịch vụ", "Chụp bù mức"]);
});

test("Quản trị chưa có Phiên đăng nhập, Nhật ký (chỉ Toàn quyền); có Chính sách điều phối để đặt mốc (ADR-0128 Q1)", () => {
  const nhan = thanhBen({ staff: holder(["ADMIN"]) }, "/").flatMap((x) => x.muc).map((m) => m.nhan);
  for (const c of ["Phiên đăng nhập", "Nhật ký"]) assert.ok(!nhan.includes(c), c);
  assert.ok(nhan.includes("Chính sách điều phối"));
});

test("Thiết lập đóng sẵn cho Quản trị ở Trang chủ; mở khi đứng ở /locations; mở sẵn cho Nhân sự", () => {
  assert.equal(thietLapMoSan(thanhBen({ staff: holder(["ADMIN"]) }, "/"), "/"), false);
  assert.equal(thietLapMoSan(thanhBen({ staff: holder(["ADMIN"]) }, "/locations"), "/locations"), true);
  assert.equal(thietLapMoSan(thanhBen({ staff: holder(["HR"]) }, "/"), "/"), true);
});

// Đọc mã tĩnh (như các bài *-cong-bo): huy hiệu "dịch vụ lệch giá" của nút Thiết lập gọi route `admin` (GET /api/catalog/dem-xung-dot); chỉ được đăng ký khi nhóm có mục
// "Dịch vụ & giá" — nếu không, Bán hàng, Kế toán, Nhân sự (có Thiết lập, không có mục đó) nhận 403 ở mọi trang.
test("nút Thiết lập chỉ đăng ký lời gọi lệch giá khi nhóm có mục dichVu", async () => {
  const { readFileSync } = await import("node:fs");
  const nguon = readFileSync(new URL("../web/shell.ts", import.meta.url), "utf8");
  const cho = nguon.indexOf("void catalogConflictBadge()");
  assert.ok(cho > 0, "không thấy chỗ đăng ký lời gọi lệch giá của nút Thiết lập");
  assert.match(nguon.slice(Math.max(0, cho - 120), cho), /if \(muc\.some\(\(m\) => m\.trang === "dichVu"\)\)\s*loaders\.push\(\(\) => \{\s*$/, "lời gọi lệch giá phải nằm sau điều kiện nhóm có mục dichVu");
  // Điều kiện đó đúng với bảng: chỉ người thấy dichVu mới có mục này trong Thiết lập.
  const co = (p: PermissionCode[]) => thanhBen({ staff: holder(p) }, "/").find((g) => g.nhom === "THIẾT LẬP")!.muc.some((m) => m.trang === "dichVu");
  assert.equal(co(["SALES"]), false);
  assert.equal(co(["ACCOUNTING"]), false);
  assert.equal(co(["HR"]), false);
  assert.equal(co(["ADMIN"]), true);
});
