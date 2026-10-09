import { test } from "node:test";
import assert from "node:assert/strict";
import type { CommissionRuleDto, SupplyTermDto, ThuTraResponse } from "./contracts.ts";
import {
  CAU_CHUA_TIM_DUOC_DOI_TAC,
  CAU_DONG_DONG_MAC_DINH,
  CAU_KHONG_CO_NGUOI_HUONG,
  LOI_BAC,
  NHAN_TRANG_THAI,
  canXacNhanDongDieuKhoan,
  cauThuTra,
  coTheTimDoiTac,
  dongDongDuoc,
  locDieuKhoan,
  locMuc,
  nhanDoiTuong,
  nhanMucDto,
  nhanNguoiBan,
  nhanPhamVi,
  nhanTyLeMua,
  trangThaiDong,
} from "./hoa-hong-hien-thi.ts";
import type { PermissionCode } from "./permissions.ts";

const HOM_NAY = "2026-10-09";
const ten = {
  dichVu: (c: string) => ({ HONTAM: "Hòn Tằm" })[c],
  nhom: (c: string) => ({ DTH: "Du thuyền" })[c],
};
const muc = (o: Partial<CommissionRuleDto>): CommissionRuleDto => ({
  id: "m1", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY", ten: "Đại lý du lịch" }, phamVi: "ALL", catalogCode: null, groupCode: null, kieu: "RATE", tyLeBp: 1250, moiKhach: null,
  tuNgay: "2026-01-01", denNgay: null, ghiChu: null, conHieuLuc: true, ...o,
});
const dk = (o: Partial<SupplyTermDto>): SupplyTermDto => ({
  id: "d1", phamVi: "ALL", catalogCode: null, groupCode: null, nguoiBan: { partyId: "pty-cty", ten: "Công ty Tour Đảo", laCongTy: true }, tyLeMuaBp: null,
  tuNgay: "2026-01-01", denNgay: null, ghiChu: null, conHieuLuc: true, ...o,
});

test("nhanPhamVi: có tên thì in tên, thiếu tên thì in mã, «Mọi dịch vụ» khi áp cho tất cả", () => {
  assert.equal(nhanPhamVi({ phamVi: "ALL", catalogCode: null, groupCode: null }, ten), "Mọi dịch vụ");
  assert.equal(nhanPhamVi({ phamVi: "SERVICE", catalogCode: "HONTAM", groupCode: null }, ten), "Dịch vụ Hòn Tằm");
  assert.equal(nhanPhamVi({ phamVi: "SERVICE", catalogCode: "MA_LA", groupCode: null }, ten), "Dịch vụ MA_LA");
  assert.equal(nhanPhamVi({ phamVi: "GROUP", catalogCode: null, groupCode: "DTH" }, ten), "Nhóm Du thuyền");
  assert.equal(nhanPhamVi({ phamVi: "GROUP", catalogCode: null, groupCode: "TXE" }, ten), "Nhóm TXE");
});

test("nhanMucDto đổi khuôn DTO sang nhanMuc: phần trăm và đồng mỗi khách, không mã thô", () => {
  assert.equal(nhanMucDto({ kieu: "RATE", tyLeBp: 1250, moiKhach: null }), "12,5%");
  assert.equal(nhanMucDto({ kieu: "RATE", tyLeBp: 1000, moiKhach: null }), "10%");
  assert.equal(nhanMucDto({ kieu: "PER_PAX", tyLeBp: null, moiKhach: 50_000 }), "50.000đ/khách");
  for (const m of [{ kieu: "RATE", tyLeBp: 1, moiKhach: null }, { kieu: "PER_PAX", tyLeBp: null, moiKhach: 0 }] as const) assert.doesNotMatch(nhanMucDto(m), /RATE|PER_PAX/);
});

test("nhanDoiTuong: vai và đối tác cụ thể phân biệt bằng chữ nhỏ (hai thứ có thể trùng tên)", () => {
  assert.deepEqual(nhanDoiTuong({ loai: "VAI", code: "TRAVEL_AGENCY", ten: "Đại lý du lịch" }), { ten: "Đại lý du lịch", loai: "Loại đối tác" });
  assert.deepEqual(nhanDoiTuong({ loai: "DOI_TAC", partyId: "pty-1", ten: "Đại Lý A" }), { ten: "Đại Lý A", loai: "Một đối tác" });
});

test("trạng thái dòng: đang áp / sắp áp / đã đóng; chỉ dòng chưa có ngày kết thúc mới đóng được", () => {
  assert.equal(trangThaiDong({ conHieuLuc: true, denNgay: null }, HOM_NAY), "DANG_AP");
  assert.equal(trangThaiDong({ conHieuLuc: true, denNgay: "2026-12-31" }, HOM_NAY), "DANG_AP");
  assert.equal(trangThaiDong({ conHieuLuc: false, denNgay: null }, HOM_NAY), "SAP_AP", "bắt đầu sau hôm nay, chưa có ngày kết thúc");
  assert.equal(trangThaiDong({ conHieuLuc: false, denNgay: "2026-12-31" }, HOM_NAY), "SAP_AP");
  assert.equal(trangThaiDong({ conHieuLuc: false, denNgay: "2026-10-08" }, HOM_NAY), "DA_DONG");
  assert.deepEqual(NHAN_TRANG_THAI, { DANG_AP: "Đang áp", SAP_AP: "Sắp áp", DA_DONG: "Đã đóng" });
  assert.equal(dongDongDuoc({ denNgay: null }), true);
  assert.equal(dongDongDuoc({ denNgay: "2026-12-31" }), false, "đã có ngày kết thúc: máy chủ trả 409 nếu đóng lại");
});

test("locMuc: «đang áp» bỏ dòng đã đóng nhưng giữ dòng sắp áp; tìm theo tên không phân biệt dấu", () => {
  const dong = [
    muc({ id: "a" }),
    muc({ id: "b", doiTuong: { loai: "DOI_TAC", partyId: "p", ten: "Đại Lý Hòn Tằm" }, conHieuLuc: false, tuNgay: "2026-11-01" }),
    muc({ id: "c", conHieuLuc: false, denNgay: "2026-09-30" }),
  ];
  assert.deepEqual(locMuc(dong, { chiConHieuLuc: true, tim: "" }, HOM_NAY).map((d) => d.id), ["a", "b"]);
  assert.deepEqual(locMuc(dong, { chiConHieuLuc: false, tim: "" }, HOM_NAY).map((d) => d.id), ["a", "b", "c"]);
  assert.deepEqual(locMuc(dong, { chiConHieuLuc: false, tim: "dai ly hon tam" }, HOM_NAY).map((d) => d.id), ["b"]);
  assert.deepEqual(locMuc(dong, { chiConHieuLuc: false, tim: "ĐẠI LÝ" }, HOM_NAY).map((d) => d.id), ["a", "b", "c"]);
  assert.deepEqual(locDieuKhoan([dk({ id: "x" }), dk({ id: "y", conHieuLuc: false, denNgay: "2026-01-02" })], true, HOM_NAY).map((d) => d.id), ["x"]);
});

test("cauThuTra: sáu bậc có lời riêng, thiếu mức dùng câu của máy chủ, không người hưởng có câu riêng", () => {
  const base = { ngay: HOM_NAY, nguoiHuong: { loai: "HUONG" as const, vai: ["Đại lý du lịch"] } };
  const co = (bac: 1 | 2 | 3 | 4 | 5 | 6): ThuTraResponse => ({ ...base, ketQua: { trangThai: "SET", bac, muc: muc({}) } });
  assert.equal(cauThuTra(co(3)), "Áp mức 12,5% — mức riêng của đối tác cho mọi dịch vụ");
  assert.equal(cauThuTra(co(6)), "Áp mức 12,5% — mức của loại đối tác cho mọi dịch vụ");
  const loi = new Set<string>();
  for (const b of [1, 2, 3, 4, 5, 6] as const) loi.add(LOI_BAC[b]);
  assert.equal(loi.size, 6, "mỗi bậc một lời khác nhau");
  assert.equal(cauThuTra({ ...base, ketQua: { trangThai: "MISSING", lyDo: "Chưa có mức cho dịch vụ này" } }), "Chưa có mức cho dịch vụ này");
  assert.equal(cauThuTra({ ...base, ketQua: { trangThai: "NONE" } }), CAU_KHONG_CO_NGUOI_HUONG);
  assert.equal(CAU_KHONG_CO_NGUOI_HUONG, "Không có người hưởng hoa hồng");
  assert.equal(cauThuTra({ ...base, ketQua: { trangThai: "SET", bac: 1, muc: muc({ kieu: "PER_PAX", tyLeBp: null, moiKhach: 50_000 }) } }), "Áp mức 50.000đ/khách — mức riêng của đối tác cho dịch vụ này");
});

test("người bán và tỷ lệ mua lại; dòng mặc định của công ty cần hộp xác nhận riêng, câu nguyên văn", () => {
  assert.equal(nhanNguoiBan({ ten: "Công ty Tour Đảo", laCongTy: true }), "Tour Đảo (công ty)");
  assert.equal(nhanNguoiBan({ ten: "i-resort", laCongTy: false }), "i-resort");
  assert.equal(nhanTyLeMua(null), "—");
  assert.equal(nhanTyLeMua(8000), "80%");
  assert.equal(nhanTyLeMua(7550), "75,5%");
  assert.equal(canXacNhanDongDieuKhoan(dk({})), true);
  assert.equal(canXacNhanDongDieuKhoan(dk({ phamVi: "GROUP", groupCode: "DTH" })), false, "công ty bán một nhóm: đóng thẳng");
  assert.equal(canXacNhanDongDieuKhoan(dk({ nguoiBan: { partyId: "pty-ncc", ten: "i-resort", laCongTy: false } })), false, "nhà cung cấp bán mọi dịch vụ không phải dòng mặc định");
  assert.equal(CAU_DONG_DONG_MAC_DINH, "Đóng dòng mặc định thì dịch vụ chưa có điều khoản riêng sẽ thiếu người bán cho tới khi mở dòng mới. Vẫn đóng?");
});

test("coTheTimDoiTac giữ ĐÚNG cổng của route nguoi-huong (order.create, không giữ quyền Đối tác): Kế toán chưa tìm được", () => {
  const ai = (...p: PermissionCode[]) => ({ id: "x", permissions: p }) as never;
  assert.equal(coTheTimDoiTac(ai("SALES")), true);
  assert.equal(coTheTimDoiTac(ai("ADMIN")), true);
  assert.equal(coTheTimDoiTac(ai("SUPER_ADMIN")), true);
  assert.equal(coTheTimDoiTac(ai("ACCOUNTING")), false, "Kế toán không có order.create");
  assert.equal(coTheTimDoiTac(ai("SALES", "PARTNER")), false, "tài khoản lai có quyền Đối tác bị route chặn");
  assert.equal(coTheTimDoiTac(ai("ACCOUNTING", "SALES")), true);
  assert.match(CAU_CHUA_TIM_DUOC_DOI_TAC, /^Tài khoản của bạn chưa tìm được đối tác/);
});
