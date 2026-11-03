import { test } from "node:test";
import assert from "node:assert/strict";
import type { CommissionRuleDto, SupplyTermDto, ThuTraResponse } from "./contracts.ts";
import {
  CAU_CHUA_TIM_DUOC_DOI_TAC,
  CAU_DONG_DONG_MAC_DINH,
  cauCanhBaoDongRieng,
  CAU_DOI_MUC_TRONG_NGAY,
  CAU_KHONG_CO_NGUOI_HUONG,
  LOI_BAC,
  boDongMucTa,
  nhanMucTa,
  NHAN_TRANG_THAI,
  NHAN_LOAI_GOC,
  CAU_LOAI_CO_SAN,
  CAU_CHUA_CO_MUC_LOAI,
  CAU_GHI_DIEU_KIEN_CAP,
  NHAN_CHUA_CO_MUC,
  CAU_NHAC_UU_TIEN,
  CAU_THU_TU_AP_MUC,
  CAU_TRA_THEO_LOAI,
  cauMucCuSeNgung,
  cauSeTao,
  ghepDoiTacRieng,
  dongRiengDoiTac,
  nutDoiNgung,
  ngayDoiSomNhat,
  cauDoiTuNgayMai,
  tomTatMuc,
  xepLoai,
  canXacNhanDongDieuKhoan,
  nhanLoaiDoiTac,
  cauThuTra,
  thuTraThieuMuc,
  coTheTimDoiTac,
  dongDongDuoc,
  locDieuKhoan,
  locMuc,
  nhanDoiTuong,
  nhanMucDto,
  nhanNguoiBan,
  nhanPhamVi,
  tenSauNhanDichVu,
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

test("tenSauNhanDichVu: sau nhãn «Dịch vụ» chỉ in tên (hoặc mã), không lặp chữ «Dịch vụ»; nhóm và mọi dịch vụ giữ chữ như nhanPhamVi", () => {
  assert.equal(tenSauNhanDichVu({ phamVi: "SERVICE", catalogCode: "HONTAM", groupCode: null }, ten), "Hòn Tằm");
  assert.equal(tenSauNhanDichVu({ phamVi: "SERVICE", catalogCode: "MA_LA", groupCode: null }, ten), "MA_LA");
  assert.equal(tenSauNhanDichVu({ phamVi: "GROUP", catalogCode: null, groupCode: "DTH" }, ten), "Nhóm Du thuyền");
  assert.equal(tenSauNhanDichVu({ phamVi: "ALL", catalogCode: null, groupCode: null }, ten), "Mọi dịch vụ");
});

test("nhanMucDto đổi khuôn DTO sang nhanMuc: phần trăm và đồng mỗi khách, không mã thô", () => {
  assert.equal(nhanMucDto({ kieu: "RATE", tyLeBp: 1250, moiKhach: null }), "12,5%");
  assert.equal(nhanMucDto({ kieu: "RATE", tyLeBp: 1000, moiKhach: null }), "10%");
  assert.equal(nhanMucDto({ kieu: "PER_PAX", tyLeBp: null, moiKhach: 50_000 }), "50.000đ/khách");
  for (const m of [{ kieu: "RATE", tyLeBp: 1, moiKhach: null }, { kieu: "PER_PAX", tyLeBp: null, moiKhach: 0 }] as const) assert.doesNotMatch(nhanMucDto(m), /RATE|PER_PAX/);
});

test("nhanDoiTuong: vai và đối tác cụ thể phân biệt bằng chữ nhỏ (hai thứ có thể trùng tên)", () => {
  assert.deepEqual(nhanDoiTuong({ loai: "VAI", code: "TRAVEL_AGENCY", ten: "Đại lý du lịch" }), { ten: "Đại lý du lịch", loai: "Vai người dùng" });
  assert.deepEqual(nhanDoiTuong({ loai: "DOI_TAC", partyId: "pty-1", ten: "Đại Lý A" }), { ten: "Đại Lý A", loai: "Một đối tác" });
  assert.deepEqual(nhanDoiTuong({ loai: "MUC", code: "MT_ABCDEFGH", ten: "TA1" }), { ten: "TA1", loai: "Cấp độ đại lý" }, "ADR-0117 lần 2: dòng của mức TA");
});

test("trạng thái dòng: đang áp / sắp áp / đã đóng; chỉ dòng chưa có ngày kết thúc mới đóng được", () => {
  assert.equal(trangThaiDong({ conHieuLuc: true, denNgay: null }, HOM_NAY), "DANG_AP");
  assert.equal(trangThaiDong({ conHieuLuc: true, denNgay: "2026-12-31" }, HOM_NAY), "DANG_AP");
  assert.equal(trangThaiDong({ conHieuLuc: false, denNgay: null }, HOM_NAY), "SAP_AP", "bắt đầu sau hôm nay, chưa có ngày kết thúc");
  assert.equal(trangThaiDong({ conHieuLuc: false, denNgay: "2026-12-31" }, HOM_NAY), "SAP_AP");
  assert.equal(trangThaiDong({ conHieuLuc: false, denNgay: "2026-10-08" }, HOM_NAY), "DA_DONG");
  assert.deepEqual(NHAN_TRANG_THAI, { DANG_AP: "Đang áp dụng", SAP_AP: "Sắp áp dụng", DA_DONG: "Đã ngừng", DA_HUY: "Đã thay bằng mức mới" }, "ADR-0148: thêm «Đã huỷ»");
  assert.equal(dongDongDuoc({ denNgay: null }), true);
  assert.equal(dongDongDuoc({ denNgay: "2026-12-31" }), false, "đã có ngày kết thúc: máy chủ trả 409 nếu đóng lại");
});

test("locMuc: «đang áp» bỏ dòng đã đóng nhưng giữ dòng sắp áp; tìm theo tên không phân biệt dấu", () => {
  const dong = [
    muc({ id: "a" }),
    muc({ id: "b", doiTuong: { loai: "DOI_TAC", partyId: "p", ten: "Đại Lý Hòn Tằm" }, conHieuLuc: false, tuNgay: "2026-11-01" }),
    muc({ id: "c", conHieuLuc: false, denNgay: "2026-09-30" }),
  ];
  assert.deepEqual(locMuc(dong, { chiConHieuLuc: true, tim: "" }, HOM_NAY, ten).map((d) => d.id), ["a", "b"]);
  assert.deepEqual(locMuc(dong, { chiConHieuLuc: false, tim: "" }, HOM_NAY, ten).map((d) => d.id), ["a", "b", "c"]);
  assert.deepEqual(locMuc(dong, { chiConHieuLuc: false, tim: "dai ly hon tam" }, HOM_NAY, ten).map((d) => d.id), ["b"]);
  assert.deepEqual(locMuc(dong, { chiConHieuLuc: false, tim: "ĐẠI LÝ" }, HOM_NAY, ten).map((d) => d.id), ["a", "b", "c"]);
  assert.deepEqual(locDieuKhoan([dk({ id: "x" }), dk({ id: "y", conHieuLuc: false, denNgay: "2026-01-02" })], true, HOM_NAY).map((d) => d.id), ["x"]);
});

test("locMuc: ô tìm khớp THÊM nhãn phạm vi (tên dịch vụ / nhóm đang hiện ra), tên đối tượng vẫn khớp, không phân biệt hoa thường và dấu", () => {
  const dong = [
    muc({ id: "tat-ca" }),
    muc({ id: "dich-vu", phamVi: "SERVICE", catalogCode: "HONTAM" }),
    muc({ id: "nhom", doiTuong: { loai: "DOI_TAC", partyId: "p", ten: "Đại Lý Nha Trang" }, phamVi: "GROUP", groupCode: "DTH" }),
    muc({ id: "ma-la", phamVi: "SERVICE", catalogCode: "MA_LA" }),
  ];
  const tim = (q: string): string[] => locMuc(dong, { chiConHieuLuc: false, tim: q }, HOM_NAY, ten).map((d) => d.id);
  assert.deepEqual(tim("hòn tằm"), ["dich-vu"], "gõ tên dịch vụ ra đúng các mức của dịch vụ đó");
  assert.deepEqual(tim("HON TAM"), ["dich-vu"], "không phân biệt hoa thường và dấu");
  assert.deepEqual(tim("du thuyen"), ["nhom"], "gõ tên nhóm");
  assert.deepEqual(tim("nha trang"), ["nhom"], "gõ tên đối tác vẫn ra");
  assert.deepEqual(tim("đại lý du lịch"), ["tat-ca", "dich-vu", "ma-la"], "gõ tên loại đối tác vẫn ra");
  assert.deepEqual(tim("mọi dịch vụ"), ["tat-ca"], "gõ «Mọi dịch vụ» ra mức áp cho mọi dịch vụ");
  assert.deepEqual(tim("MA_LA"), ["ma-la"], "dịch vụ thiếu tên trong danh mục: nhãn hiện ra là mã nên khớp mã đó");
  assert.deepEqual(tim("HONTAM"), [], "mã thô của dịch vụ ĐÃ có tên không phải nhãn hiện ra nên không khớp");
});

test("cauThuTra: chín bậc có lời riêng, thiếu mức dùng câu của máy chủ, không người hưởng có câu riêng", () => {
  const base = { ngay: HOM_NAY, nguoiHuong: { loai: "HUONG" as const, vai: ["Đại lý du lịch"] } };
  const co = (bac: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9): ThuTraResponse => ({ ...base, ketQua: { trangThai: "SET", bac, muc: muc({}) } });
  assert.equal(cauThuTra(co(3)), "Áp mức 12,5% — mức riêng của đối tác cho mọi dịch vụ");
  assert.equal(cauThuTra(co(6)), "Áp mức 12,5% — mức của vai trò cho mọi dịch vụ");
  assert.equal(cauThuTra(co(7)), "Áp mức 12,5% — cấp độ đại lý của vai trò cho dịch vụ này");
  assert.equal(cauThuTra(co(8)), "Áp mức 12,5% — cấp độ đại lý của vai trò cho nhóm");
  assert.equal(cauThuTra(co(9)), "Áp mức 12,5% — cấp độ đại lý của vai trò cho mọi dịch vụ");
  const loi = new Set<string>();
  for (const b of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) loi.add(LOI_BAC[b]);
  assert.equal(loi.size, 9, "mỗi bậc một lời khác nhau");
  assert.equal(cauThuTra({ ...base, ketQua: { trangThai: "MISSING", lyDo: "Chưa có mức cho dịch vụ này" } }), "Chưa có mức cho dịch vụ này — cần cài mức (cấp) thì mới tính được hoa hồng.");
  assert.equal(thuTraThieuMuc({ ...base, ketQua: { trangThai: "MISSING", lyDo: "x" } }), true);
  assert.equal(thuTraThieuMuc({ ...base, ketQua: { trangThai: "NONE" } }), false);
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
  assert.equal(CAU_DONG_DONG_MAC_DINH, "Ngừng điều khoản mặc định thì dịch vụ chưa có điều khoản riêng sẽ thiếu người bán cho tới khi mở điều khoản mới. Vẫn ngừng?");
});

test("coTheTimDoiTac giữ ĐÚNG cổng của route nguoi-huong (order.create hoặc partner.commission.write, không giữ quyền Đối tác)", () => {
  const ai = (...p: PermissionCode[]) => ({ id: "x", permissions: p }) as never;
  assert.equal(coTheTimDoiTac(ai("SALES")), true);
  assert.equal(coTheTimDoiTac(ai("ADMIN")), true);
  assert.equal(coTheTimDoiTac(ai("SUPER_ADMIN")), true);
  assert.equal(coTheTimDoiTac(ai("SALES", "PARTNER")), false, "tài khoản lai có quyền Đối tác bị route chặn");
  assert.equal(coTheTimDoiTac(ai("ACCOUNTING", "SALES")), true);
  assert.equal(CAU_CHUA_TIM_DUOC_DOI_TAC, "Tài khoản của bạn chưa tìm được đối tác theo tên. Cần đặt mức riêng cho một đối tác thì nhờ Quản trị hoặc Toàn quyền.", "nói rõ phải làm gì (câu cho tài khoản chưa qua cổng tìm đối tác; ADR-0141 đã nới cổng cho Kế toán)");
});

test("coTheTimDoiTac: Kế toán tìm được, Đối tác và lai thì không (ADR-0141)", () => {
  const ai = (...p: PermissionCode[]) => ({ id: "x", permissions: p }) as never;
  for (const p of ["ACCOUNTING", "SALES", "INTERN", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(coTheTimDoiTac(ai(p)), true, p);
  for (const p of ["PARTNER", "FIELD", "HR", "DRIVER", "DRIVER_PARTNER"] as const) assert.equal(coTheTimDoiTac(ai(p)), false, p);
  assert.equal(coTheTimDoiTac(ai("ACCOUNTING", "PARTNER")), false, "lai Kế toán + Đối tác");
});

test("ADR-0117: nhanLoaiDoiTac — nút Tắt / Bật chỉ ở loại do Kế toán thêm, theo cờ đang bật; loại có sẵn không có nút", () => {
  assert.deepEqual(nhanLoaiDoiTac({ ten: "Công ty lữ hành", coSan: true, dangBat: true }), { nguon: "Có sẵn", trangThai: "", nut: null });
  assert.equal(nhanLoaiDoiTac({ ten: "Khách sạn", coSan: true, dangBat: false }).nut, null, "loại có sẵn dù lệch cờ cũng không có nút");
  assert.deepEqual(nhanLoaiDoiTac({ ten: "Nhân viên spa", coSan: false, dangBat: true }), { nguon: "", trangThai: "", nut: { hanhDong: "tat", nhan: "Tắt", ariaLabel: "Tắt vai trò: Nhân viên spa" } });
  assert.deepEqual(nhanLoaiDoiTac({ ten: "Nhân viên spa", coSan: false, dangBat: false }), { nguon: "", trangThai: "Đã tắt", nut: { hanhDong: "bat", nhan: "Bật", ariaLabel: "Bật vai trò: Nhân viên spa" } });
});

test("ADR-0117 lần 2: «Thử tra» thắng ở bậc 7–9 ⇒ câu kèm TÊN mức TA (N-12); bậc khác không thêm tên", () => {
  const base = { ngay: HOM_NAY, nguoiHuong: { loai: "HUONG" as const, vai: ["Lễ tân khách sạn"] } };
  const dongMuc = muc({ doiTuong: { loai: "MUC", code: "MT_ABCDEFGH", ten: "Đại lý cấp 1" }, phamVi: "SERVICE", catalogCode: "HONTAM", tyLeBp: 1500 });
  assert.equal(cauThuTra({ ...base, ketQua: { trangThai: "SET", bac: 7, muc: dongMuc } }), "Áp mức 15% — cấp độ đại lý của vai trò cho dịch vụ này: «Đại lý cấp 1»");
  assert.equal(cauThuTra({ ...base, ketQua: { trangThai: "SET", bac: 9, muc: { ...dongMuc, phamVi: "ALL", catalogCode: null } } }), "Áp mức 15% — cấp độ đại lý của vai trò cho mọi dịch vụ: «Đại lý cấp 1»");
  assert.doesNotMatch(cauThuTra({ ...base, ketQua: { trangThai: "SET", bac: 7, muc: dongMuc } }), /MT_[A-Z]{8}/, "không lộ mã mức");
  assert.equal(cauThuTra({ ...base, ketQua: { trangThai: "SET", bac: 6, muc: muc({}) } }), "Áp mức 12,5% — mức của vai trò cho mọi dịch vụ", "bậc riêng: không thêm tên");
});

test("ADR-0117 lần 2: nhanMucTa — «Đang dùng» + nút Tắt / «Đã tắt» + nút Bật (theo cờ máy chủ), nhãn nút có tên mức, không mã", () => {
  assert.deepEqual(nhanMucTa({ ten: "Đại lý cấp 1", dangBat: true }), { trangThai: "Đang dùng", nut: { hanhDong: "tat", nhan: "Khoá cấp", ariaLabel: "Khoá cấp: Đại lý cấp 1" } });
  assert.deepEqual(nhanMucTa({ ten: "Đại lý cấp 1", dangBat: false }), { trangThai: "Đã tắt", nut: { hanhDong: "bat", nhan: "Mở lại cấp", ariaLabel: "Mở lại cấp: Đại lý cấp 1" } });
});

test("ADR-0117 lần 2: boDongMucTa — dòng của mức TA chỉ hiện ở mục «Mức TA», không lặp ở «Các mức hiện có»; giữ thứ tự", () => {
  const ds = [muc({ id: "a" }), muc({ id: "b", doiTuong: { loai: "MUC", code: "MT_ABCDEFGH", ten: "Đại lý cấp 1" } }), muc({ id: "c", doiTuong: { loai: "DOI_TAC", partyId: "p", ten: "Đại Lý A" } })];
  assert.deepEqual(boDongMucTa(ds).map((d) => d.id), ["a", "c"]);
});

test("ADR-0117 lần 2: câu cảnh báo khi gắn mức cho loại còn dòng riêng (N-17) và câu luật đổi mức trong ngày — nguyên văn", () => {
  assert.equal(
    cauCanhBaoDongRieng("Lễ tân khách sạn", "Đại lý cấp 1", 2),
    "Đã lưu. Lưu ý: vai trò «Lễ tân khách sạn» (hoặc vai trò khác mà cùng đối tác đang mang) còn 2 mức riêng, và mức riêng được dùng trước cấp «Đại lý cấp 1». Muốn dùng hẳn cấp «Đại lý cấp 1», hãy ngừng các mức riêng đó.",
  );
  assert.match(cauCanhBaoDongRieng("A", "B", 1), /hãy ngừng các mức riêng đó\.$/);
  assert.equal(CAU_DOI_MUC_TRONG_NGAY, "Mỗi vai trò chỉ theo một cấp tại một thời điểm. Muốn chuyển sang cấp khác, bấm «Đổi cấp» và chọn ngày bắt đầu. Cấp vừa chọn hôm nay thì chỉ đổi được từ ngày mai.");
});

test("PR2 T1: nhãn mới và các câu nguyên văn", () => {
  // Chủ chọn 28/10 (thay «Loại gốc»): nhãn ngắn + một câu nói lý do không tắt được.
  assert.equal(NHAN_LOAI_GOC, "Có sẵn");
  assert.equal(CAU_LOAI_CO_SAN, "Vai trò có sẵn đi kèm tài khoản đăng nhập của đối tác nên không tắt được.");
  assert.equal(CAU_CHUA_CO_MUC_LOAI, "Vai trò này chưa có hoa hồng cho dịch vụ nào: đơn đã giao sẽ chờ ở bước «Đã giao» tới khi có mức hoặc Kế toán nhập tay.");
  assert.equal(NHAN_CHUA_CO_MUC, "Chưa có mức");
  assert.equal(CAU_NHAC_UU_TIEN, "Mức riêng được ưu tiên hơn cấp độ đại lý. Mức nào áp cho một đối tác cụ thể: dùng «Kiểm tra hoa hồng».");
  assert.equal(CAU_TRA_THEO_LOAI, "Đang tra theo vai trò. Một đối tác cụ thể của vai trò này có thể có mức riêng hoặc cấp riêng — gõ tên đối tác để chắc.");
  assert.equal(cauMucCuSeNgung("10%", "2026-11-01"), "Mức cũ 10% sẽ ngừng, đến hết 31/10/2026.");
  assert.equal(cauSeTao({ ai: "Đại lý A", dichVu: "Mọi dịch vụ", muc: "10%", tu: "2026-11-01", den: null }), "Sẽ tạo: Đại lý A · Mọi dịch vụ · 10% · từ 01/11/2026, không thời hạn.");
  assert.equal(cauSeTao({ ai: "A", dichVu: "B", muc: "5%", tu: "2026-11-01", den: "2026-12-31" }), "Sẽ tạo: A · B · 5% · từ 01/11/2026 đến 31/12/2026.");
});

test("ADR-0161 Đ2: câu nhắc ghi điều kiện áp dụng của cấp — đúng từng chữ, nói rõ Nền tảng không tự kiểm", () => {
  assert.equal(CAU_GHI_DIEU_KIEN_CAP, "Ghi điều kiện áp dụng ở đây để mọi người đọc (doanh thu, quy mô, cam kết). Nền tảng không tự kiểm điều kiện này.");
});

test("PR2 T1: nhanLoaiDoiTac — loại có sẵn, chỉ «Đã tắt» khi tắt", () => {
  assert.equal(nhanLoaiDoiTac({ ten: "X", coSan: true, dangBat: true }).nguon, "Có sẵn");
  assert.equal(nhanLoaiDoiTac({ ten: "X", coSan: false, dangBat: false }).trangThai, "Đã tắt");
  assert.equal(nhanLoaiDoiTac({ ten: "X", coSan: false, dangBat: true }).trangThai, "");
});

test("PR2 T1: nutDoiNgung — các ca hiện / ẩn nút", () => {
  const d = (o: object) => ({ tuNgay: "2026-01-01", denNgay: null, conHieuLuc: true, ...o });
  assert.deepEqual(nutDoiNgung(d({}), HOM_NAY), { hien: true });
  assert.deepEqual(nutDoiNgung(d({ tuNgay: "2026-11-01", conHieuLuc: false }), HOM_NAY), { hien: false, ghiChu: "chưa tới ngày" });
  assert.deepEqual(nutDoiNgung(d({ denNgay: "2026-12-31" }), HOM_NAY), { hien: false, ghiChu: "ngừng sau 31/12/2026" });
  assert.deepEqual(nutDoiNgung(d({ denNgay: "2026-10-08", conHieuLuc: false }), HOM_NAY), { hien: false, ghiChu: "" });
  // Dòng bắt đầu HÔM NAY: có nút (chủ dự án 28/10 đổi bàn giao 25/10 §4 — trước đó chỉ ghi «đổi hoặc ngừng từ ngày mai», người dùng không tìm thấy nút).
  // Máy chủ đã cho: Đổi từ ngày mai (`kiemDoi`), Ngừng đến hết hôm nay (`kiemNgayDong`). Ngày sớm nhất của hộp Đổi: `ngayDoiSomNhat`.
  assert.deepEqual(nutDoiNgung(d({ tuNgay: HOM_NAY }), HOM_NAY), { hien: true });
  // Bắt đầu hôm nay nhưng đã hẹn ngày ngừng: vẫn ghi ngày ngừng, không nút.
  assert.deepEqual(nutDoiNgung(d({ tuNgay: HOM_NAY, denNgay: "2026-12-31" }), HOM_NAY), { hien: false, ghiChu: "ngừng sau 31/12/2026" });
});

test("Đổi mức bắt đầu hôm nay: ngày sớm nhất là ngày mai, kèm câu nói vì sao", () => {
  assert.equal(ngayDoiSomNhat(HOM_NAY, HOM_NAY), "2026-10-10");
  assert.equal(ngayDoiSomNhat("2026-10-01", HOM_NAY), HOM_NAY);
  assert.equal(cauDoiTuNgayMai(HOM_NAY, HOM_NAY), "Mức cũ bắt đầu hôm nay nên mức mới áp dụng sớm nhất từ ngày mai; đơn xác nhận trong hôm nay vẫn tính theo mức cũ.");
  assert.equal(cauDoiTuNgayMai("2026-10-01", HOM_NAY), "");
});

test("PR2 T1: tomTatMuc — số đứng trước, tên dài vẫn bắt đầu bằng số", () => {
  const dai = "D".repeat(120);
  const t2 = { dichVu: () => dai, nhom: () => undefined };
  const s = tomTatMuc([muc({ id: "a", phamVi: "SERVICE", catalogCode: "X" }), muc({ id: "b", conHieuLuc: false }), muc({ id: "c", kieu: "PER_PAX", tyLeBp: null, moiKhach: 50_000 })], t2);
  assert.match(s, /^12,5% Dịch vụ D+ · 50\.000đ\/khách Mọi dịch vụ$/);
  assert.equal(tomTatMuc([], ten), "");
});

test("PR2 T1: xepLoai — chưa có mức lên đầu rồi theo tên", () => {
  assert.deepEqual(xepLoai([{ ten: "Bé", coMuc: true }, { ten: "An", coMuc: true }, { ten: "Cò", coMuc: false }]).map((x) => x.ten), ["Cò", "An", "Bé"]);
});

test("PR2 T1: ghepDoiTacRieng — mỗi đối tác một dòng, xếp theo tên", () => {
  const dong = [muc({ id: "1", doiTuong: { loai: "DOI_TAC", partyId: "p2", ten: "Zeta" } }), muc({ id: "2", doiTuong: { loai: "DOI_TAC", partyId: "p2", ten: "Zeta" } }), muc({ id: "3" })];
  const gan = [{ id: "g", partyId: "p1", ten: "Alpha", muc: "M", tenMuc: "Cấp 1", tuNgay: "2026-01-01", denNgay: null }];
  assert.deepEqual(ghepDoiTacRieng(dong, gan, "2026-06-01"), [
    { partyId: "p1", ten: "Alpha", mucRieng: false, chinhSach: "Cấp 1" },
    { partyId: "p2", ten: "Zeta", mucRieng: true, chinhSach: null },
  ]);
});

test("PR2 Đợt 3 (R17): ghepDoiTacRieng — mức riêng ĐANG và SẮP áp dụng được tính, dòng đã ngừng thì bỏ", () => {
  const homNay = "2026-06-01";
  const dt = (partyId: string, ten: string) => ({ loai: "DOI_TAC" as const, partyId, ten });
  const dong = [
    muc({ id: "dang", doiTuong: dt("p1", "Đang"), conHieuLuc: true }),
    muc({ id: "sap", doiTuong: dt("p2", "Sắp"), conHieuLuc: false, tuNgay: "2026-07-01" }),
    muc({ id: "ngung", doiTuong: dt("p3", "Ngừng"), conHieuLuc: false, tuNgay: "2026-01-01", denNgay: "2026-03-31" }),
  ];
  assert.deepEqual(ghepDoiTacRieng(dong, [], homNay).map((x) => x.partyId), ["p1", "p2"]);
});

test("R25: dongRiengDoiTac — chỉ dòng của đúng đối tác, theo bộ lọc trạng thái và ô tìm", () => {
  const homNay = "2026-06-01";
  const dt = (partyId: string, ten: string) => ({ loai: "DOI_TAC" as const, partyId, ten });
  const dong = [
    muc({ id: "a", doiTuong: dt("p1", "Hoa Nguyễn"), conHieuLuc: true }),
    muc({ id: "b", doiTuong: dt("p1", "Hoa Nguyễn"), conHieuLuc: false, tuNgay: "2026-01-01", denNgay: "2026-03-31" }),
    muc({ id: "c", doiTuong: dt("p2", "Khác"), conHieuLuc: true }),
    muc({ id: "d" }),
  ];
  const ten = {} as never;
  assert.deepEqual(dongRiengDoiTac(dong, "p1", { chiConHieuLuc: true, tim: "" }, homNay, ten).map((x) => x.id), ["a"]);
  assert.deepEqual(dongRiengDoiTac(dong, "p1", { chiConHieuLuc: false, tim: "" }, homNay, ten).map((x) => x.id), ["a", "b"]);
  assert.deepEqual(dongRiengDoiTac(dong, "p1", { chiConHieuLuc: true, tim: "hoa nguyen" }, homNay, ten).map((x) => x.id), ["a"]);
  assert.deepEqual(dongRiengDoiTac(dong, "p2", { chiConHieuLuc: true, tim: "hoa nguyen" }, homNay, ten).map((x) => x.id), []);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// ADR-0148 Đ1 (lượt 1): nút «Sửa», dòng đã huỷ, câu xem trước
test("ADR-0148: dòng đã huỷ có trạng thái riêng «Đã thay bằng mức mới», bị bộ lọc «Đang và sắp áp dụng» bỏ (như dòng đã ngừng), hiện ở «Tất cả»", async () => {
  const m = await import("./hoa-hong-hien-thi.ts");
  assert.equal(m.NHAN_TRANG_THAI.DA_HUY, "Đã thay bằng mức mới");
  // Dòng huỷ mang conHieuLuc false + ngày kết thúc tương lai hoặc trống — trước đây rơi vào «Sắp áp dụng».
  assert.equal(trangThaiDong({ conHieuLuc: false, denNgay: "2028-01-01", daHuy: true }, HOM_NAY), "DA_HUY");
  assert.equal(trangThaiDong({ conHieuLuc: false, denNgay: null, daHuy: true }, HOM_NAY), "DA_HUY");
  const huy = muc({ id: "huy", conHieuLuc: false, tuNgay: "2027-01-01", denNgay: "2028-01-01", daHuy: true });
  const thay = muc({ id: "thay", conHieuLuc: false, tuNgay: "2027-02-01", denNgay: "2027-12-31", thayCho: "huy" });
  assert.deepEqual(locMuc([huy, thay], { chiConHieuLuc: true, tim: "" }, HOM_NAY, ten).map((x) => x.id), ["thay"]);
  assert.deepEqual(locMuc([huy, thay], { chiConHieuLuc: false, tim: "" }, HOM_NAY, ten).map((x) => x.id), ["huy", "thay"]);
  // Đối tác chỉ còn dòng đã huỷ ⇒ không liệt kê ở «Đối tác có mức riêng…».
  const dt = { loai: "DOI_TAC" as const, partyId: "p9", ten: "Chỉ còn dòng huỷ" };
  assert.deepEqual(ghepDoiTacRieng([muc({ id: "x", doiTuong: dt, conHieuLuc: false, denNgay: null, daHuy: true })], [], HOM_NAY), []);
  assert.deepEqual(dongRiengDoiTac([muc({ id: "x", doiTuong: dt, conHieuLuc: false, daHuy: true })], "p9", { chiConHieuLuc: true, tim: "" }, HOM_NAY, ten), []);
  // Dòng huỷ không có Đổi / Ngừng, không ghi chú «chưa tới ngày».
  assert.deepEqual(nutDoiNgung({ tuNgay: "2027-01-01", denNgay: "2028-01-01", conHieuLuc: false, daHuy: true }, HOM_NAY), { hien: false, ghiChu: "" });
});

test("ADR-0148: nút «Sửa» — dòng chưa huỷ, ngày kết thúc trống hoặc chưa qua (kể cả dòng chưa tới ngày, ví dụ 2027 → 2028 của chủ); quyền = ghi bảng mức và không mang quyền Đối tác", async () => {
  const m = await import("./hoa-hong-hien-thi.ts");
  const d = (o: object) => ({ tuNgay: "2026-01-01", denNgay: null, daHuy: false, ...o });
  assert.equal(m.nutSua(d({ tuNgay: "2027-01-01", denNgay: "2028-01-01" }), HOM_NAY), true, "ví dụ chủ: chưa tới ngày vẫn có Sửa");
  assert.equal(m.nutSua(d({}), HOM_NAY), true);
  assert.equal(m.nutSua(d({ denNgay: HOM_NAY }), HOM_NAY), true, "kết thúc hôm nay = chưa qua");
  assert.equal(m.nutSua(d({ denNgay: "2026-10-08" }), HOM_NAY), false, "đã hết hạn");
  assert.equal(m.nutSua(d({ daHuy: true }), HOM_NAY), false, "đã huỷ");
  const ai = (permissions: PermissionCode[]) => ({ permissions });
  assert.equal(m.coQuyenSua(ai(["ACCOUNTING"])), true);
  assert.equal(m.coQuyenSua(ai(["ADMIN"])), true);
  assert.equal(m.coQuyenSua(ai(["SUPER_ADMIN"])), true);
  for (const p of [["SALES"], ["FIELD"], ["HR"], ["PARTNER"], ["ACCOUNTING", "PARTNER"]] as PermissionCode[][]) assert.equal(m.coQuyenSua(ai(p)), false, p.join("+"));
});

test("ADR-0148: câu xem trước của hộp Sửa theo đường máy chủ trả", async () => {
  const m = await import("./hoa-hong-hien-thi.ts");
  assert.equal(m.cauXemTruocSua({ homNay: HOM_NAY, duong: "HUY_THAY" }), "Chưa có đơn nào dùng mức này — sửa sẽ thay hẳn.");
  assert.equal(m.cauXemTruocSua({ homNay: HOM_NAY, duong: "TU_NGAY", tuNgaySomNhat: "2026-10-10", denNgayToiDa: null }), "Đã có đơn dùng mức này — phần sửa áp từ ngày 10/10/2026; đơn cũ giữ mức cũ.");
  assert.equal(m.cauXemTruocSua({ homNay: HOM_NAY, duong: "HUY_THAY" }, "cấp độ đại lý này"), "Chưa có đơn nào dùng cấp độ đại lý này — sửa sẽ thay hẳn.");
});

// N5 (kế hoạch docs/superpowers/plans/2026-10-29-sua-muc-n5-ke-hoach.md, Task 2): một hàm chia lần gắn dùng chung cho màn «Mức TA» (R1, R2) và hồ sơ Danh bạ (R3).
test("N5 chiaLanGan: đang áp giữ thứ tự máy chủ; sắp áp ngày bắt đầu sớm trước; lịch sử = đã ngừng + đã huỷ, mới → cũ (trùng ngày giữ thứ tự máy chủ)", async () => {
  const m = await import("./hoa-hong-hien-thi.ts");
  const g = (id: string, o: { tuNgay: string; denNgay?: string | null; conHieuLuc?: boolean; daHuy?: boolean }) => ({ id, denNgay: null, conHieuLuc: false, daHuy: false, ...o });
  const ds = [
    g("dang-1", { tuNgay: "2026-09-01", conHieuLuc: true }),
    g("sap-xa", { tuNgay: "2026-12-01" }),
    g("ngung-cu", { tuNgay: "2026-01-01", denNgay: "2026-03-31" }),
    g("sap-gan", { tuNgay: "2026-10-20", denNgay: "2026-11-30" }),
    g("dang-2", { tuNgay: "2026-10-01", denNgay: "2026-10-31", conHieuLuc: true }),
    g("thay", { tuNgay: "2026-11-05" }), // lần thay (chưa huỷ) đứng TRƯỚC lần bị huỷ cùng ngày — máy chủ đã xếp vậy
    g("huy", { tuNgay: "2026-11-05", daHuy: true }),
    g("ngung-moi", { tuNgay: "2026-04-01", denNgay: "2026-08-31" }),
    g("huy-cu", { tuNgay: "2026-09-01", denNgay: "2026-12-31", daHuy: true }),
  ];
  const k = m.chiaLanGan(ds, HOM_NAY);
  assert.deepEqual(k.dangAp.map((x) => x.id), ["dang-1", "dang-2"]);
  assert.deepEqual(k.sapAp.map((x) => x.id), ["sap-gan", "thay", "sap-xa"]);
  assert.deepEqual(k.lichSu.map((x) => x.id), ["huy", "huy-cu", "ngung-moi", "ngung-cu"]);
  assert.equal(k.dangAp.length + k.sapAp.length + k.lichSu.length, ds.length, "không mất, không lặp lần nào");
  assert.deepEqual(m.chiaLanGan([], HOM_NAY), { dangAp: [], sapAp: [], lichSu: [] });
  // Khớp đúng bộ lọc «Đang và sắp áp dụng» của bảng mức: mọi lần trong lịch sử là lần conApHoacSap loại bỏ.
  for (const x of ds) assert.equal(k.lichSu.includes(x), !m.conApHoacSap(x, HOM_NAY), x.id);
});

test("N5 nhãn: «Sắp áp dụng từ <ngày>» (kèm «đến» khi có ngày kết thúc); nút bật lịch sử không bắt đầu bằng chữ của nút ghi", async () => {
  const m = await import("./hoa-hong-hien-thi.ts");
  assert.equal(m.nhanSapAp({ tuNgay: "2026-11-01", denNgay: null }), "Sắp áp dụng từ 01/11/2026");
  assert.equal(m.nhanSapAp({ tuNgay: "2026-11-01", denNgay: "2027-01-31" }), "Sắp áp dụng từ 01/11/2026 đến 31/01/2027");
  assert.equal(m.nhanNutLichSu(3, false), "Xem lịch sử (3)");
  assert.equal(m.nhanNutLichSu(3, true), "Ẩn lịch sử");
  // Kịch bản Chrome đếm nút ghi theo chữ đầu (＋, Thêm, Đổi, Ngừng, Sửa, Tắt, Bật, Áp dụng): nút bật lịch sử là nút xem, không được trùng.
  for (const t of [m.nhanNutLichSu(1, false), m.nhanNutLichSu(1, true)]) assert.ok(!/^(＋|Thêm|Đổi|Ngừng|Sửa|Tắt|Bật|Áp dụng)/.test(t), t);
});

test("câu thứ tự áp mức ghim nguyên văn §5.3", () => {
  assert.equal(CAU_THU_TU_AP_MUC, "Khi tính hoa hồng cho một đơn, Nền tảng thử lần lượt: 1) mức riêng của đối tác, 2) cấp riêng của đối tác, 3) mức riêng của vai trò, 4) cấp của vai trò. Gặp mức nào trước thì dùng mức đó. Trong mỗi bước, xét dịch vụ đó trước, rồi cả nhóm, rồi mọi dịch vụ. Đối tác có cấp riêng thì không xét cấp của vai trò. Muốn biết chắc một đối tác: dùng «Kiểm tra hoa hồng».");
});

// ---- Task 6: câu cố định §5 và luật việc của dòng (đặc tả hoa-hong-cap-dai-ly) ----
import * as HT from "./hoa-hong-hien-thi.ts";

const dv = (code: string, ten: string) => ({ code, groupCode: null, ten });

test("§5.1 dải cảnh báo: câu ghim nguyên văn", () => {
  assert.equal(HT.cauTieuDeDai(3), "Có 3 vai trò còn thiếu mức hôm nay");
  assert.equal(
    HT.CAU_THAN_DAI,
    "Đối tác chỉ thuộc vai trò này và chưa có mức riêng hay cấp riêng sẽ bị chờ ở bước «Đã giao» nếu đơn xác nhận từ hôm nay có dịch vụ chưa có mức. Đối tác thuộc thêm vai trò khác có mức thì vẫn tính theo vai trò đó. Đơn đã xác nhận trước đó không tự tính lại khi thêm mức: Kế toán dùng «Ghi mức tay» cho từng đơn.",
  );
  assert.equal(HT.cauLoaiTatDai(2), "2 vai trò đã tắt: đối tác chỉ mang vai trò đã tắt không được hưởng hoa hồng, đơn của họ bị giữ ở bước Đã giao.");
  assert.equal(HT.CAU_DAI_CHUA_KIEM, "Chưa kiểm được vai trò nào thiếu mức vì không tải được danh mục dịch vụ. Tải lại trang.");
  for (const c of [HT.cauTieuDeDai(1), HT.CAU_THAN_DAI, HT.cauLoaiTatDai(1), HT.CAU_DAI_CHUA_KIEM, HT.cauDongLoaiDai("L", { kieu: "KHONG_CO", thieu: [] }, null)]) {
    assert.ok(!/mở khoá|tự động/u.test(c), c);
  }
});

test("§5.1 cauDongLoaiDai: hai dạng và phụ chú §4.2", () => {
  assert.equal(HT.cauDongLoaiDai("Đại lý", { kieu: "KHONG_CO", thieu: [dv("a", "A")] }, null), "Đại lý: chưa có mức cho dịch vụ nào");
  assert.equal(HT.cauDongLoaiDai("Đại lý", { kieu: "THIEU", thieu: [dv("a", "A"), dv("b", "B")] }, null), "Đại lý: thiếu mức cho 2 dịch vụ (A, B)");
  assert.equal(
    HT.cauDongLoaiDai("Đại lý", { kieu: "THIEU", thieu: [dv("a", "A"), dv("b", "B"), dv("c", "C"), dv("d", "D"), dv("e", "E")] }, null),
    "Đại lý: thiếu mức cho 5 dịch vụ (A, B, C và 2 dịch vụ khác)",
  );
  assert.equal(HT.cauDongLoaiDai("Đại lý", { kieu: "KHONG_CO", thieu: [] }, "2026-11-02"), "Đại lý: chưa có mức cho dịch vụ nào — Có thay đổi sắp áp dụng từ 02/11/2026");
});

test("§4.3 / §4.4 cauNhacCap: năm câu", () => {
  assert.equal(HT.cauNhacCap({ kieu: "DU" }), null);
  assert.equal(HT.cauNhacCap({ kieu: "CHUA_KIEM" }), null);
  assert.equal(HT.cauNhacCap({ kieu: "RONG" }), "Cấp này chưa có mức nào.");
  assert.equal(HT.cauNhacCap({ kieu: "CHUA_AP", sapApTu: "2026-11-02" }), "Hôm nay cấp này chưa áp mức nào; mức đầu tiên áp dụng từ 02/11/2026.");
  assert.equal(HT.cauNhacCap({ kieu: "CHUA_AP", sapApTu: null }), "Hôm nay cấp này chưa áp mức nào.");
  assert.equal(HT.cauNhacCap({ kieu: "THIEU", thieu: [dv("d", "D'")] }), "1 dịch vụ chưa có mức trong cấp này: D'.");
  assert.equal(
    HT.cauNhacCap({ kieu: "THIEU", thieu: [dv("a", "A"), dv("b", "B"), dv("c", "C"), dv("d", "D"), dv("e", "E"), dv("f", "F")] }),
    "6 dịch vụ chưa có mức trong cấp này: A, B, C và 3 dịch vụ khác.",
  );
});

test("§5.2 §5.4 §3 §3.3 câu hộp, huy hiệu, ô trống, xung đột, toast: nguyên văn", () => {
  assert.deepEqual(HT.hopKhoaCap("Đại lý 1"), {
    tieuDe: "Khoá cấp «Đại lý 1»?",
    hauQua:
      "Sau khi khoá: không thêm được vai trò, đối tác hay mức mới vào cấp; các mức đang có chỉ Ngừng được, không Đổi hay Sửa; vai trò và đối tác đang theo cấp vẫn được tính hoa hồng như cũ. Muốn một vai trò thôi theo cấp: «Thôi theo cấp này». Muốn chuyển sang cấp khác: «Đổi cấp». Mở lại bất cứ lúc nào bằng «Mở lại cấp».",
    nhanNguyHiem: "Khoá cấp",
  });
  assert.deepEqual(HT.hopTatLoai("Đại lý"), {
    tieuDe: "Tắt vai trò «Đại lý»?",
    hauQua:
      "Đối tác chỉ thuộc vai trò này sẽ không được hưởng hoa hồng. Đơn của họ xác nhận từ lúc tắt sẽ chờ ở bước «Đã giao» tới khi Kế toán nhập tay («Ghi mức tay»). Đơn đã xác nhận trước lúc tắt giữ nguyên hoa hồng.",
    nhanNguyHiem: "Tắt vai trò",
  });
  assert.equal(HT.NHAN_CAP_DA_KHOA, "Đã khoá — vẫn áp cho vai trò và đối tác đang theo");
  assert.equal(HT.TIEU_DE_DOI_CAP_RIENG, "Đổi cấp riêng");
  assert.equal(HT.NHAN_CAP_MOI, "Cấp mới");
  assert.equal(HT.NHAN_TU_NGAY, "Từ ngày");
  assert.equal(HT.CAU_CHON_NGAY_BAT_DAU, "Chọn ngày bắt đầu.");
  assert.equal(HT.cauCapCuSeNgung("Cấp 3", "2026-11-01"), "Cấp cũ Cấp 3 sẽ ngừng, đến hết 31/10/2026.");
  assert.equal(HT.cauCapCuSeNgung("Cấp 3", ""), "");
  assert.equal(HT.cauCapCuSeNgung("Cấp 3", "2026-11"), "");
  assert.equal(HT.CAU_O_TRONG, "Ô «—» nghĩa là cấp chưa đặt mức riêng cho dịch vụ hoặc nhóm này; đơn sẽ theo mức rộng hơn của cấp (cả nhóm hoặc mọi dịch vụ) nếu có. Muốn biết mức chắc chắn: dùng «Kiểm tra hoa hồng».");
  assert.equal(HT.NHAN_XUNG_DOT, "Hai mức khác nhau");
  assert.equal(
    HT.CAU_XUNG_DOT,
    "Đối tác này mang hai vai trò ra hai mức khác nhau cho cùng một dịch vụ. Đơn của dịch vụ đó bị giữ ở bước Đã giao cho tới khi đặt mức riêng hoặc cấp riêng cho đối tác này.",
  );
  assert.equal(HT.CAU_DUOI_DS_DOI_TAC, "Đối tác không có mức riêng hay cấp riêng không nằm ở đây. Muốn biết một đối tác đang ra mức nào: dùng «Kiểm tra hoa hồng».");
  assert.equal(HT.CAU_KHONG_THAY_DONG, "Không thấy mục này trên trang — tải lại trang.");
});

const DONG_AP = muc({ tuNgay: "2026-01-01", denNgay: null, conHieuLuc: true });
const DONG_SAP = muc({ tuNgay: "2027-01-01", denNgay: null, conHieuLuc: false });

test("§3.1 viecDongMuc", () => {
  const v = { homNay: HOM_NAY, capDangBat: true, ghi: true, sua: true };
  assert.deepEqual(HT.viecDongMuc(DONG_AP, v), ["DOI", "SUA", "NGUNG"]);
  assert.deepEqual(HT.viecDongMuc(DONG_AP, { ...v, capDangBat: null }), ["DOI", "SUA", "NGUNG"]);
  assert.deepEqual(HT.viecDongMuc(DONG_AP, { ...v, capDangBat: false }), ["NGUNG"]); // cấp đang khoá: chỉ còn Ngừng
  assert.deepEqual(HT.viecDongMuc(DONG_AP, { ...v, ghi: false, sua: false }), []); // Bán hàng
  assert.deepEqual(HT.viecDongMuc(DONG_AP, { ...v, sua: false }), ["DOI", "NGUNG"]);
  assert.deepEqual(HT.viecDongMuc(DONG_SAP, v), ["SUA"]); // dòng sắp áp
  assert.deepEqual(HT.viecDongMuc(muc({ daHuy: true }), v), []);
});

test("§3.1 viecLanGan: không lọc theo cấp khoá", () => {
  const v = { homNay: HOM_NAY, ghi: true, sua: true, coDoi: true };
  const ap = { tuNgay: "2026-01-01", denNgay: null, conHieuLuc: true };
  assert.deepEqual(HT.viecLanGan(ap, v), ["DOI", "SUA", "NGUNG"]);
  assert.deepEqual(HT.viecLanGan(ap, { ...v, coDoi: false }), ["SUA", "NGUNG"]);
  assert.deepEqual(HT.viecLanGan(ap, { ...v, ghi: false }), []);
  assert.deepEqual(HT.viecLanGan({ tuNgay: "2027-01-01", denNgay: null, conHieuLuc: false }, v), ["SUA"]);
  assert.deepEqual(HT.viecLanGan({ ...ap, daHuy: true }, v), []);
});

test("ADR-0151 Đ8 cauCapCuDangKhoa nguyên văn; viecLanGan cấp riêng có «Đổi» khi chưa có ngày ngừng", () => {
  assert.equal(HT.cauCapCuDangKhoa("Cấp 3"), "Cấp cũ «Cấp 3» đang khoá. Đổi xong thì không đổi ngược về cấp này được, trừ khi mở lại cấp.");
  const v = { homNay: HOM_NAY, ghi: true, sua: true, coDoi: true };
  assert.ok(HT.viecLanGan({ tuNgay: "2026-01-01", denNgay: null, conHieuLuc: true }, v).includes("DOI"));
  assert.ok(!HT.viecLanGan({ tuNgay: "2026-01-01", denNgay: "2026-12-31", conHieuLuc: true }, v).includes("DOI"));
});

test("§3.2 thuTuMenu và docThe", () => {
  assert.equal(HT.thuTuMenu(["SUA", "NGUNG", "DOI"], true)[0], "DOI");
  assert.deepEqual(HT.thuTuMenu(["SUA", "NGUNG"], true), ["SUA", "NGUNG"]);
  assert.deepEqual(HT.thuTuMenu(["SUA", "NGUNG", "DOI"], false), ["SUA", "NGUNG", "DOI"]);
  assert.equal(HT.docThe("ap-dung"), "cap");
  assert.equal(HT.docThe("thiet-lap"), "cap");
  assert.equal(HT.docThe(null), "cap");
  assert.equal(HT.docThe("rác"), "cap");
  assert.equal(HT.docThe("cap"), "cap");
  assert.equal(HT.docThe("loai"), "loai");
  // Giá trị «doi-tac» còn trong bộ nhớ tạm của phiên cũ (thẻ «Riêng từng đối tác» đã gộp vào thẻ vai): mở thẻ «Vai người dùng».
  assert.equal(HT.docThe("doi-tac"), "loai");
});

// ---- Task 7: cauDai (dải §5.1) ----
test("dải: danh mục lỗi ⇒ chỉ câu chưa kiểm, không số", () => {
  const kq = HT.cauDai([
    { ten: "A", ketQua: { kieu: "CHUA_KIEM" }, sapApTu: null },
    { ten: "B", ketQua: { kieu: "TAT" }, sapApTu: null },
    { ten: "C", ketQua: { kieu: "CHUA_KIEM" }, sapApTu: null },
  ]);
  assert.deepEqual(kq, { tieuDe: null, than: null, dong: [], tat: null, chuaKiem: HT.CAU_DAI_CHUA_KIEM });
  assert.ok(!/\d/.test(HT.CAU_DAI_CHUA_KIEM));
});

test("dải: không có gì để báo ⇒ null (ẩn hẳn)", () => {
  assert.equal(HT.cauDai([]), null);
  assert.equal(HT.cauDai([{ ten: "A", ketQua: { kieu: "DU" }, sapApTu: null }]), null);
});

test("dải: đếm loại thiếu, xếp KHONG_CO trước THIEU, kèm dòng loại tắt", () => {
  const kq = HT.cauDai([
    { ten: "Z", ketQua: { kieu: "THIEU", thieu: [dv("a", "A")] }, sapApTu: null },
    { ten: "Y", ketQua: { kieu: "KHONG_CO", thieu: [dv("a", "A")] }, sapApTu: null },
    { ten: "X", ketQua: { kieu: "DU" }, sapApTu: null },
    { ten: "W", ketQua: { kieu: "TAT" }, sapApTu: null },
  ]);
  assert.ok(kq);
  assert.equal(kq.tieuDe, "Có 2 vai trò còn thiếu mức hôm nay");
  assert.equal(kq.than, HT.CAU_THAN_DAI);
  assert.deepEqual(kq.dong, ["Y: chưa có mức cho dịch vụ nào", "Z: thiếu mức cho 1 dịch vụ (A)"]);
  assert.equal(kq.tat, HT.cauLoaiTatDai(1));
  assert.equal(kq.chuaKiem, null);
});

test("dải: chỉ có loại tắt ⇒ chỉ dòng loại tắt, không tiêu đề", () => {
  const kq = HT.cauDai([{ ten: "W", ketQua: { kieu: "TAT" }, sapApTu: null }]);
  assert.deepEqual(kq, { tieuDe: null, than: null, dong: [], tat: HT.cauLoaiTatDai(1), chuaKiem: null });
});

test("§3.2 docThe: khoá cũ và rác mở thẻ cấp", () => {
  for (const g of ["ap-dung", "thiet-lap", "rác", "", null]) assert.equal(HT.docThe(g), "cap");
});

// ---- Task 8: ma trận các cấp đại lý (đặc tả hoa-hong-cap-dai-ly Q-4, §5.4, tiêu chí 1) ----
import type { GanLoaiMucDto, MucTaDto } from "./contracts.ts";

const dongCap = (cap: string, o: Partial<CommissionRuleDto>): CommissionRuleDto => ({
  id: `${cap}-${o.id ?? "x"}`, doiTuong: { loai: "MUC", code: cap, ten: cap }, phamVi: "ALL", catalogCode: null, groupCode: null, kieu: "RATE", tyLeBp: 1000, moiKhach: null,
  theoLoai: null, tuNgay: "2026-01-01", denNgay: null, ghiChu: null, conHieuLuc: true, daHuy: false, thayCho: null, lyDoSua: null, ...o,
});
const cap = (code: string, ten: string, dong: CommissionRuleDto[], dangBat = true): MucTaDto => ({ code, ten, dangBat, dong, gan: [] });
const GIA_A = { adult: 1_050_000, child: 800_000, senior: 800_000 };
const DM_DV = [
  { code: "S1", name: "Hòn Tằm", groupCode: "G1", unit: "perPax", gia: GIA_A },
  { code: "S2", name: "Hòn Mun", groupCode: "G1", unit: "perPax", gia: GIA_A },
  { code: "S3", name: "Xe đón", groupCode: "G2", unit: "per5Pax", gia: { adult: 1_000_000, child: null, senior: null } },
];
const DM_NHOM = [{ code: "G1", name: "Đảo" }, { code: "G2", name: "Xe" }];

test("tiêu chí 1: cấp chỉ có dòng nhóm G1 ⇒ ô Mọi dịch vụ và ô dịch vụ của G1 là null (không kế thừa); ADR-0161 Đ1: hàng nào cũng có mặt, kể cả hàng chưa ai nhập", () => {
  const a = cap("A", "Cấp A", [dongCap("A", { id: "g1", phamVi: "GROUP", groupCode: "G1", tyLeBp: 1500 })]);
  // Cấp B có dòng ở dịch vụ S1 (thuộc G1) và ở «Mọi dịch vụ»; ô của cấp A ở đó phải «—», không kế thừa dòng nhóm.
  const b = cap("B", "Cấp B", [dongCap("B", { id: "s1", phamVi: "SERVICE", catalogCode: "S1", tyLeBp: 800 }), dongCap("B", { id: "all", tyLeBp: 500 })]);
  const mt = HT.maTranCap({ muc: [a, b], dichVu: DM_DV, nhom: DM_NHOM, homNay: HOM_NAY });
  const iA = mt.cot.findIndex((c) => c.code === "A");
  const hang = (pv: string, code: string | null) => mt.hang.find((x) => x.phamVi === pv && x.code === code);
  assert.ok(hang("ALL", null), "hàng «Mọi dịch vụ» luôn có");
  assert.equal(hang("ALL", null)!.ten, "Mọi dịch vụ");
  assert.equal(hang("ALL", null)!.o[iA]!.nhan, null);
  assert.deepEqual(hang("ALL", null)!.o[iA]!.dong, []);
  assert.ok(hang("SERVICE", "S1"), "hàng dịch vụ S1 có vì cấp B có dòng ở đó");
  assert.equal(hang("SERVICE", "S1")!.o[iA]!.nhan, null);
  assert.deepEqual(hang("GROUP", "G1")!.o[iA]!.nhan, ["15%"]);
  assert.deepEqual(hang("GROUP", "G1")!.o[iA]!.dong.map((r) => r.id), ["g1"], "ô có mức mang đúng dòng để giao diện mở Đổi, Sửa, Ngừng");
  // ADR-0161 Đ1: hàng không ai có dòng VẪN hiện (Kế toán nhập vào đó); ô của nó trống.
  for (const c of ["S2", "S3"]) assert.ok(hang("SERVICE", c), `hàng ${c} hiện dù chưa ai nhập`);
  assert.ok(hang("GROUP", "G2"), "nhóm G2 hiện dù chưa ai nhập");
  assert.ok(hang("SERVICE", "S2")!.o.every((o) => o.nhan === null && o.dong.length === 0));
  assert.deepEqual(mt.hang.map((x) => `${x.phamVi}:${x.code ?? ""}`), ["ALL:", "GROUP:G1", "GROUP:G2", "SERVICE:S1", "SERVICE:S2", "SERVICE:S3"]);
  // Hàng mang giá bán lẻ và nhóm để bảng hiện cột giá và lọc theo nhóm.
  assert.deepEqual([hang("SERVICE", "S1")!.unit, hang("SERVICE", "S1")!.gia, hang("SERVICE", "S1")!.groupCode], ["perPax", GIA_A, "G1"]);
  assert.deepEqual([hang("GROUP", "G1")!.unit, hang("GROUP", "G1")!.gia, hang("GROUP", "G1")!.groupCode], [null, null, "G1"]);
  assert.deepEqual([hang("ALL", null)!.unit, hang("ALL", null)!.gia, hang("ALL", null)!.groupCode], [null, null, null]);
});

test("ADR-0161 Đ1: 120 dịch vụ × 6 cấp, không dòng nào ⇒ 1 + số nhóm + 120 hàng, mỗi hàng 6 ô trống", () => {
  const dv = Array.from({ length: 120 }, (_, i) => ({ code: `D${String(i).padStart(3, "0")}`, name: `Dịch vụ ${i}`, groupCode: `G${i % 8}`, unit: "perPax", gia: GIA_A }));
  const nhom = Array.from({ length: 8 }, (_, i) => ({ code: `G${i}`, name: `Nhóm ${i}` }));
  const muc = Array.from({ length: 6 }, (_, i) => cap(`T${i + 1}`, `TA${i + 1}`, []));
  const mt = HT.maTranCap({ muc, dichVu: dv, nhom, homNay: HOM_NAY });
  assert.equal(mt.cot.length, 6);
  assert.equal(mt.hang.length, 1 + 8 + 120);
  assert.ok(mt.hang.every((x) => x.o.length === 6 && x.o.every((o) => o.nhan === null && o.dong.length === 0)));
});

test("cột theo tên, so số tự nhiên: Cấp 2 trước Cấp 10", () => {
  const c10 = cap("C10", "Cấp 10", [dongCap("C10", { id: "a", tyLeBp: 1000 })], false);
  const c2 = cap("C2", "Cấp 2", [dongCap("C2", { id: "a", tyLeBp: 200 })]);
  const mt = HT.maTranCap({ muc: [c10, c2], dichVu: DM_DV, nhom: DM_NHOM, homNay: HOM_NAY });
  assert.deepEqual(mt.cot, [{ code: "C2", ten: "Cấp 2", dangBat: true }, { code: "C10", ten: "Cấp 10", dangBat: false }]);
  assert.deepEqual(mt.hang[0]!.o.map((x) => x.nhan), [["2%"], ["10%"]], "ô thẳng hàng với cột đã xếp, không theo thứ tự đầu vào");
});

test("dòng sắp áp có nhãn từ ngày; dòng đã ngừng, đã huỷ không vào ô", () => {
  const a = cap("A", "Cấp A", [
    dongCap("A", { id: "dang", tyLeBp: 1000 }),
    dongCap("A", { id: "sap", tyLeBp: 1200, tuNgay: "2026-11-01", conHieuLuc: false }),
    dongCap("A", { id: "ngung", tyLeBp: 900, tuNgay: "2025-01-01", denNgay: "2025-12-31", conHieuLuc: false }),
    dongCap("A", { id: "huy", tyLeBp: 700, denNgay: null, conHieuLuc: false, daHuy: true }),
    dongCap("A", { id: "huy-dv", phamVi: "SERVICE", catalogCode: "S3", tyLeBp: 700, conHieuLuc: false, daHuy: true }),
  ]);
  const mt = HT.maTranCap({ muc: [a], dichVu: DM_DV, nhom: DM_NHOM, homNay: HOM_NAY });
  const hangS3 = mt.hang.find((x) => x.phamVi === "SERVICE" && x.code === "S3")!;
  assert.equal(hangS3.o[0]!.nhan, null, "dòng đã huỷ không vào ô");
  assert.deepEqual(hangS3.o[0]!.dong, [], "dòng đã huỷ không vào ô, nên giao diện không dựng nút việc cho nó");
  assert.deepEqual(mt.hang[0]!.o[0]!.nhan, ["10%", "12% từ 01/11/2026"]);
  assert.deepEqual(mt.hang[0]!.o[0]!.dong.map((r) => r.id), ["dang", "sap"], "ô chỉ mang dòng đang và sắp áp; đã ngừng, đã huỷ bỏ");
});

test("ma trận: dòng trỏ nhóm hay dịch vụ không còn trong danh mục vẫn có hàng (không giấu mức có thật)", () => {
  const a = cap("A", "Cấp A", [dongCap("A", { id: "x", phamVi: "SERVICE", catalogCode: "CU", tyLeBp: 300 })]);
  const mt = HT.maTranCap({ muc: [a], dichVu: DM_DV, nhom: DM_NHOM, homNay: HOM_NAY });
  const h = mt.hang.find((x) => x.code === "CU");
  assert.ok(h);
  assert.deepEqual(h.o[0]!.nhan, ["3%"]);
  assert.deepEqual([h.unit, h.gia, h.groupCode], [null, null, null], "mã không còn trong danh mục: không giá, không nhóm");
  assert.equal(mt.hang.at(-1)!.code, "CU", "mã lạ đứng cuối khối dịch vụ");
});

test("bảng «Mức của cấp»: «Tính bằng», «Áp cho» và ba cột người lớn · trẻ em · người cao tuổi; không theo loại khách thì hai cột sau «—» (ADR-0161 Đ2)", () => {
  assert.deepEqual(HT.cotMucCap(dongCap("A", { kieu: "RATE", tyLeBp: 1250 })), { tinhBang: "Phần trăm", apCho: "Mọi khách như nhau", nguoiLon: "12,5%", treEm: "—", nguoiCaoTuoi: "—" });
  assert.deepEqual(HT.cotMucCap(dongCap("A", { kieu: "PER_PAX", tyLeBp: null, moiKhach: 50000 })), { tinhBang: "Số tiền", apCho: "Mọi khách như nhau", nguoiLon: "50.000đ", treEm: "—", nguoiCaoTuoi: "—" });
  assert.deepEqual(
    HT.cotMucCap(dongCap("A", { kieu: "PER_PAX", tyLeBp: null, moiKhach: 50000, theoLoai: { nguoiLon: 50000, treEm: 30000, nguoiCaoTuoi: 0 } })),
    { tinhBang: "Số tiền", apCho: "Riêng từng loại khách", nguoiLon: "50.000đ", treEm: "30.000đ", nguoiCaoTuoi: "0đ" },
  );
});

test("chi tiết cấp: đếm loại đang theo và đối tác có cấp riêng hôm nay; câu đếm, nhãn việc", () => {
  const g = (id: string, o: Partial<GanLoaiMucDto>): GanLoaiMucDto => ({ id, loai: { code: id, ten: id }, muc: { code: "A", ten: "Cấp A" }, tuNgay: "2026-01-01", denNgay: null, conHieuLuc: true, daHuy: false, thayCho: null, lyDoSua: null, ...o });
  const a: MucTaDto = { ...cap("A", "Cấp A", []), gan: [g("L1", {}), g("L2", { tuNgay: "2026-12-01", conHieuLuc: false }), g("L3", { conHieuLuc: false, denNgay: "2026-01-31" })] };
  const rieng = [
    { id: "r1", partyId: "p1", ten: "P1", muc: "A", tenMuc: "Cấp A", tuNgay: "2026-01-01", denNgay: null },
    { id: "r2", partyId: "p2", ten: "P2", muc: "A", tenMuc: "Cấp A", tuNgay: "2026-12-01", denNgay: null },
    { id: "r3", partyId: "p3", ten: "P3", muc: "B", tenMuc: "Cấp B", tuNgay: "2026-01-01", denNgay: null },
  ];
  assert.deepEqual(HT.demTheoCap(a, rieng, HOM_NAY), { loai: 1, doiTac: 1 });
  assert.equal(HT.cauDemCap({ loai: 1, doiTac: 0 }), "Đang áp dụng cho 1 vai trò và 0 đối tác có cấp riêng.");
  assert.deepEqual([HT.nhanViec("DOI", "dong"), HT.nhanViec("SUA", "dong"), HT.nhanViec("NGUNG", "dong")], ["Đổi", "Sửa", "Ngừng"]);
  assert.deepEqual([HT.nhanViec("DOI", "gan"), HT.nhanViec("SUA", "gan"), HT.nhanViec("NGUNG", "gan")], ["Đổi cấp", "Sửa", "Thôi theo cấp này"]);
  assert.equal(HT.nhanViecKhac("Mọi dịch vụ"), "Thao tác khác: Mọi dịch vụ");
});

test("huyHieuPhu: năm kết quả phủ mức ra đúng tông và chữ của bảng §4.2; CHUA_KIEM không huy hiệu", () => {
  const dv = (code: string, ten: string) => ({ code, groupCode: null, ten });
  assert.deepEqual(HT.huyHieuPhu({ kieu: "TAT" }), { tong: "xam", chu: "Đã tắt" });
  assert.deepEqual(HT.huyHieuPhu({ kieu: "DU" }), { tong: "la", chu: "Đang áp dụng" });
  assert.deepEqual(HT.huyHieuPhu({ kieu: "KHONG_CO", thieu: [dv("A", "A"), dv("B", "B")] }), { tong: "do", chu: "Chưa có mức" });
  assert.deepEqual(HT.huyHieuPhu({ kieu: "THIEU", thieu: [dv("A", "A")] }), { tong: "cat", chu: "Thiếu mức 1 dịch vụ" });
  assert.deepEqual(HT.huyHieuPhu({ kieu: "THIEU", thieu: [dv("A", "A"), dv("B", "B"), dv("C", "C")] }), { tong: "cat", chu: "Thiếu mức 3 dịch vụ" });
  assert.equal(HT.huyHieuPhu({ kieu: "CHUA_KIEM" }), null);
  assert.equal(HT.cauSapApLoai("2026-12-01"), "Có thay đổi sắp áp dụng từ 01/12/2026");
});

test("locBangLoai: «Tất cả» hiện cả dòng đã ngừng và đã huỷ của loại; «Đang và sắp áp dụng» giấu chúng", () => {
  const r = (id: string, o: Partial<CommissionRuleDto>): CommissionRuleDto => muc({ id, doiTuong: { loai: "VAI", code: "L1", ten: "L1" }, ...o });
  const dong = [r("a", {}), r("b", { denNgay: "2026-01-31", conHieuLuc: false }), r("c", { daHuy: true, conHieuLuc: false, denNgay: "2026-01-31" })];
  const homNay = HOM_NAY;
  const loai = [{ code: "L1", ten: "L1" }];
  assert.deepEqual(HT.locBangLoai(loai, dong, { chiConHieuLuc: true, tim: "" }, homNay, ten)[0]!.dong.map((x) => x.id), ["a"]);
  assert.deepEqual(HT.locBangLoai(loai, dong, { chiConHieuLuc: false, tim: "" }, homNay, ten)[0]!.dong.map((x) => x.id), ["a", "b", "c"]);
});

test("Task 10 — thẻ «Riêng từng đối tác»: câu cố định, nhãn cấp riêng, dòng loại của hồ sơ, câu hộp Đặt / Sửa / Ngừng cấp riêng", () => {
  assert.equal(HT.CAU_KHONG_CO_DOI_TAC_RIENG, "Chưa có đối tác nào có mức riêng hoặc cấp riêng.");
  assert.equal(HT.CAU_DT_CHUA_CO_MUC_RIENG, "Đối tác này chưa có mức riêng.");
  assert.equal(HT.CAU_DT_CHUA_CO_CAP_RIENG, "Đối tác này chưa có cấp riêng.");
  assert.equal(HT.CAU_CAP_RIENG_BO_CAP_LOAI, "Đối tác có cấp riêng nên không xét cấp của vai trò.");
  assert.equal(HT.CAU_DAT_CAP_RIENG, "Từ ngày áp dụng, đơn của đối tác này tính theo cấp riêng, không xét cấp của vai trò nữa. Đơn đã xác nhận không đổi.");
  assert.equal(HT.nhanCapRieng("Vàng"), "Cấp riêng: Vàng");
  assert.equal(HT.cauVaiHoSo({ muc: { code: "A", ten: "Vàng", dangBat: true }, tuNgay: "2026-10-01" }), "Đang theo cấp Vàng · áp dụng từ 01/10/2026");
  assert.equal(HT.cauVaiHoSo({ muc: { code: "A", ten: "Vàng", dangBat: true }, tuNgay: null }), "Đang theo cấp Vàng");
  assert.equal(HT.cauVaiHoSo({ muc: null, tuNgay: null }), "Chưa theo cấp độ đại lý nào");
  assert.equal(HT.cauDaDatCapRieng("Vàng", "Công ty A", "2026-11-01"), "«Công ty A» đã theo cấp riêng «Vàng» từ ngày 01/11/2026.");
  assert.equal(HT.CAU_DA_SUA_CAP_RIENG, "Đã sửa cấp riêng.");
  assert.equal(HT.cauNgungCapRieng("Vàng", "Công ty A"), "Ngừng cấp riêng Vàng của Công ty A");
  assert.equal(HT.cauDaNgungCapRieng("Vàng", "Công ty A"), "«Công ty A» đã thôi theo cấp riêng «Vàng».");
  for (const s of [HT.CAU_KHONG_CO_DOI_TAC_RIENG, HT.CAU_DAT_CAP_RIENG, HT.nhanCapRieng("x"), HT.cauNgungCapRieng("x", "y")]) assert.ok(!/chính sách/i.test(s), s);
});

test("§3.3 theChoKetQua: mức riêng đối tác nằm ở thẻ Vai người dùng", () => {
  const set = (bac: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12, doiTuong: CommissionRuleDto["doiTuong"]) => ({ trangThai: "SET" as const, bac, muc: muc({ id: "d1", doiTuong }) });
  const dt = { loai: "DOI_TAC", partyId: "p1", ten: "A" } as const;
  for (const bac of [1, 2, 3] as const) {
    const r = HT.theChoKetQua(set(bac, dt));
    assert.equal(r?.the, "loai", `bậc ${bac}`);
    assert.deepEqual(r?.doiTuong, dt, `bậc ${bac} giữ nguyên đối tượng`);
    assert.equal(r?.dongId, "d1");
  }
  assert.equal(HT.theChoKetQua(set(7, { loai: "MUC", code: "MT_ABCDEFGH", ten: "Vàng" }))?.the, "cap");
});

test("Task 11 — theChoKetQua: «Xem dòng ↓» nhảy đúng thẻ theo bậc; chỉ khi SET; cấp riêng chỉ ở bậc 10–12", () => {
  const set = (bac: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12, doiTuong: CommissionRuleDto["doiTuong"]) => ({ trangThai: "SET" as const, bac, muc: muc({ id: "d1", doiTuong }) });
  assert.deepEqual(HT.theChoKetQua(set(2, { loai: "DOI_TAC", partyId: "p1", ten: "A" })), { the: "loai", dongId: "d1", doiTuong: { loai: "DOI_TAC", partyId: "p1", ten: "A" }, capRieng: false });
  assert.deepEqual(HT.theChoKetQua(set(5, { loai: "VAI", code: "TRAVEL_AGENCY", ten: "Đại lý" })), { the: "loai", dongId: "d1", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY", ten: "Đại lý" }, capRieng: false });
  const m8 = HT.theChoKetQua(set(8, { loai: "MUC", code: "MT_ABCDEFGH", ten: "Vàng" }));
  assert.equal(m8?.the, "cap");
  assert.equal(m8?.capRieng, false);
  const m11 = HT.theChoKetQua(set(11, { loai: "MUC", code: "MT_ABCDEFGH", ten: "Vàng" }));
  assert.equal(m11?.the, "cap");
  assert.equal(m11?.capRieng, true);
  assert.equal(HT.theChoKetQua({ trangThai: "MISSING", lyDo: "x" }), null);
  assert.equal(HT.CAU_CAP_RIENG_DANG_TRA, "— cấp riêng của đối tác đang tra");
});

// ---- ADR-0161 Task 5: luật thuần của bảng nhập (lọc hàng, nhãn giá bán lẻ, xem trước giá đại lý, cấp khoá) ----
const chuanTest = (x: string): string => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

test("locHangMaTran: «Còn thiếu mức» ẩn hàng «Mọi dịch vụ», hàng nhóm và dịch vụ đủ; chỉ giữ dịch vụ thiếu", () => {
  const mt = HT.maTranCap({ muc: [cap("A", "Cấp A", [])], dichVu: DM_DV, nhom: DM_NHOM, homNay: HOM_NAY });
  const thieu = new Set(["S2", "S3"]);
  const ra = HT.locHangMaTran(mt.hang, { tim: "", nhom: null, chiThieu: true }, { thieu, chuan: chuanTest });
  assert.deepEqual(ra.map((x) => x.code), ["S2", "S3"]);
  assert.deepEqual(HT.locHangMaTran(mt.hang, { tim: "", nhom: null, chiThieu: true }, { thieu: new Set(), chuan: chuanTest }), [], "không thiếu gì ⇒ không hàng nào");
});

test("locHangMaTran: chọn nhóm giữ hàng nhóm đó và dịch vụ của nó; không có bộ lọc ⇒ giữ nguyên", () => {
  const mt = HT.maTranCap({ muc: [cap("A", "Cấp A", [])], dichVu: DM_DV, nhom: DM_NHOM, homNay: HOM_NAY });
  const g1 = HT.locHangMaTran(mt.hang, { tim: "", nhom: "G1", chiThieu: false }, { thieu: new Set(), chuan: chuanTest });
  assert.deepEqual(g1.map((x) => `${x.phamVi}:${x.code}`), ["GROUP:G1", "SERVICE:S1", "SERVICE:S2"]);
  assert.deepEqual(HT.locHangMaTran(mt.hang, { tim: "", nhom: null, chiThieu: false }, { thieu: new Set(), chuan: chuanTest }), mt.hang);
});

test("locHangMaTran: ô tìm không phân biệt dấu và hoa thường, khớp tên và mã; kết hợp với nhóm và «còn thiếu»", () => {
  const mt = HT.maTranCap({ muc: [cap("A", "Cấp A", [])], dichVu: DM_DV, nhom: DM_NHOM, homNay: HOM_NAY });
  const loc = (bo: { tim: string; nhom: string | null; chiThieu: boolean }, thieu: string[] = []) => HT.locHangMaTran(mt.hang, bo, { thieu: new Set(thieu), chuan: chuanTest }).map((x) => x.code);
  assert.deepEqual(loc({ tim: "HON TAM", nhom: null, chiThieu: false }), ["S1"]);
  assert.deepEqual(loc({ tim: "hòn", nhom: null, chiThieu: false }), ["S1", "S2"]);
  assert.deepEqual(loc({ tim: "s3", nhom: null, chiThieu: false }), ["S3"], "khớp theo mã");
  assert.deepEqual(loc({ tim: "moi dich vu", nhom: null, chiThieu: false }), [null], "hàng «Mọi dịch vụ» tìm được bằng tên");
  assert.deepEqual(loc({ tim: "hon", nhom: "G1", chiThieu: true }, ["S2"]), ["S2"], "ba bộ lọc cùng lúc là «và»");
});

test("nhanGiaBanLe: theo người một dòng mỗi loại có giá; theo lượt ghi giá mỗi lượt; hàng nhóm / chưa có giá ⇒ rỗng", () => {
  assert.deepEqual(HT.nhanGiaBanLe({ adult: 1_050_000, child: 800_000, senior: 800_000 }, "perPax"), ["Người lớn 1.050.000đ", "Trẻ em 800.000đ", "Người cao tuổi 800.000đ"]);
  assert.deepEqual(HT.nhanGiaBanLe({ adult: 500_000, child: null, senior: null }, "perPax"), ["Người lớn 500.000đ"]);
  assert.deepEqual(HT.nhanGiaBanLe({ adult: 500_000, child: 0, senior: null }, "perPax"), ["Người lớn 500.000đ", "Trẻ em 0đ"], "0đ là có giá");
  assert.deepEqual(HT.nhanGiaBanLe({ adult: 1_000_000, child: null, senior: null }, "per5Pax"), ["1.000.000đ/lượt"]);
  assert.deepEqual(HT.nhanGiaBanLe(null, "perPax"), []);
  assert.deepEqual(HT.nhanGiaBanLe(null, null), []);
  assert.deepEqual(HT.nhanGiaBanLe({ adult: 1, child: null, senior: null }, null), []);
  assert.deepEqual(HT.nhanGiaBanLe({ adult: 1, child: null, senior: null }, "lạ"), [], "đơn vị chưa hỗ trợ: không đoán");
  assert.deepEqual(HT.nhanGiaBanLe({ adult: null, child: null, senior: null }, "perPax"), []);
});

test("cauXemTruocGiaDaiLy: số tiền theo loại khách đi qua hoaHongDong (giá − hoa hồng từng loại)", () => {
  const cau = HT.cauXemTruocGiaDaiLy({ unit: "perPax", gia: GIA_A, kieu: "PER_PAX", tyLeBp: null, moiKhach: 100_000, theoLoai: { treEm: 50_000, nguoiCaoTuoi: 100_000 } });
  assert.equal(cau, "Giá đại lý xem trước: người lớn 950.000đ · trẻ em 750.000đ · người cao tuổi 700.000đ");
});

test("cauXemTruocGiaDaiLy: phần trăm tính trên giá từng loại (làm tròn nửa lên như hoaHongDong); loại không có giá bị bỏ", () => {
  assert.equal(HT.cauXemTruocGiaDaiLy({ unit: "perPax", gia: { adult: 500_000, child: null, senior: null }, kieu: "RATE", tyLeBp: 1800, moiKhach: null, theoLoai: null }), "Giá đại lý xem trước: người lớn 410.000đ");
  // 12,5% × 1.050.000 = 131.250 ⇒ 918.750; × 800.000 = 100.000 ⇒ 700.000.
  assert.equal(HT.cauXemTruocGiaDaiLy({ unit: "perPax", gia: GIA_A, kieu: "RATE", tyLeBp: 1250, moiKhach: null, theoLoai: null }), "Giá đại lý xem trước: người lớn 918.750đ · trẻ em 700.000đ · người cao tuổi 700.000đ");
});

test("cauXemTruocGiaDaiLy: «Mọi khách như nhau» trừ cùng một số cho mọi loại có giá; loại vượt giá không hiện số âm", () => {
  assert.equal(
    HT.cauXemTruocGiaDaiLy({ unit: "perPax", gia: { adult: 300_000, child: 100_000, senior: null }, kieu: "PER_PAX", tyLeBp: null, moiKhach: 150_000, theoLoai: null }),
    "Giá đại lý xem trước: người lớn 150.000đ · trẻ em vượt giá bán",
  );
  const vuot = HT.cauXemTruocGiaDaiLy({ unit: "perPax", gia: { adult: 300_000, child: null, senior: null }, kieu: "PER_PAX", tyLeBp: null, moiKhach: 500_000, theoLoai: null });
  assert.equal(vuot, "Giá đại lý xem trước: người lớn vượt giá bán");
  assert.doesNotMatch(vuot!, /-|−/);
  assert.match(HT.cauXemTruocGiaDaiLy({ unit: "perPax", gia: { adult: 300_000, child: 0, senior: null }, kieu: "PER_PAX", tyLeBp: null, moiKhach: 0, theoLoai: null })!, /trẻ em 0đ/, "giá 0đ là có giá; hoa hồng 0 không vượt");
});

test("cauXemTruocGiaDaiLy: dịch vụ tính theo lượt chỉ lấy số người lớn (đúng hoaHongTheoLuot), nhãn «mỗi lượt», số theo loại bị bỏ qua", () => {
  const g = { adult: 800_000, child: null, senior: null };
  assert.equal(HT.cauXemTruocGiaDaiLy({ unit: "per5Pax", gia: g, kieu: "PER_PAX", tyLeBp: null, moiKhach: 0, theoLoai: { treEm: 9, nguoiCaoTuoi: 9 } }), "Giá đại lý xem trước: mỗi lượt 800.000đ");
  assert.equal(HT.cauXemTruocGiaDaiLy({ unit: "per5Pax", gia: g, kieu: "PER_PAX", tyLeBp: null, moiKhach: 200_000, theoLoai: null }), "Giá đại lý xem trước: mỗi lượt 600.000đ");
  assert.equal(HT.cauXemTruocGiaDaiLy({ unit: "per5Pax", gia: g, kieu: "PER_PAX", tyLeBp: null, moiKhach: 800_001, theoLoai: null }), "Giá đại lý xem trước: mỗi lượt vượt giá bán");
  assert.equal(HT.cauXemTruocGiaDaiLy({ unit: "per5Pax", gia: g, kieu: "RATE", tyLeBp: 1000, moiKhach: null, theoLoai: null }), "Giá đại lý xem trước: mỗi lượt 720.000đ");
});

test("cauXemTruocGiaDaiLy: chưa gõ số, đơn vị lạ, chưa có giá nào ⇒ null (không đoán)", () => {
  const base = { unit: "perPax", gia: GIA_A, kieu: "PER_PAX" as const, tyLeBp: null, moiKhach: null, theoLoai: null };
  assert.equal(HT.cauXemTruocGiaDaiLy(base), null, "số tiền chưa gõ");
  assert.equal(HT.cauXemTruocGiaDaiLy({ ...base, kieu: "RATE" }), null, "phần trăm chưa gõ");
  assert.equal(HT.cauXemTruocGiaDaiLy({ ...base, moiKhach: 1000, unit: "lạ" }), null);
  assert.equal(HT.cauXemTruocGiaDaiLy({ ...base, moiKhach: 1000, gia: { adult: null, child: null, senior: null } }), null);
  assert.equal(HT.cauXemTruocGiaDaiLy({ ...base, moiKhach: 1000, theoLoai: { treEm: 0, nguoiCaoTuoi: 0 }, gia: { adult: null, child: 5000, senior: null } }), "Giá đại lý xem trước: trẻ em 5.000đ", "chỉ loại có giá mới hiện");
});

test("cấp đã khoá: ô có mức chỉ còn «Ngừng», cột mang cờ khoá để giao diện không dựng nút thêm ở ô trống (Review Focus)", () => {
  const khoa = cap("K", "Cấp khoá", [dongCap("K", { id: "d", phamVi: "SERVICE", catalogCode: "S1", tyLeBp: 500 })], false);
  const mt = HT.maTranCap({ muc: [khoa], dichVu: DM_DV, nhom: DM_NHOM, homNay: HOM_NAY });
  assert.equal(mt.cot[0]!.dangBat, false);
  const o = mt.hang.find((x) => x.code === "S1")!.o[0]!;
  assert.equal(o.dong.length, 1);
  for (const r of o.dong) assert.deepEqual(HT.viecDongMuc(r, { homNay: HOM_NAY, capDangBat: mt.cot[0]!.dangBat, ghi: true, sua: true }), ["NGUNG"]);
  assert.ok(mt.hang.find((x) => x.code === "S2")!.o[0]!.dong.length === 0 && mt.cot[0]!.dangBat === false, "ô trống của cấp khoá: giao diện kiểm cột dangBat nên là chữ thường");
});

test("ADR-0161: nhãn «Tính bằng» / «Áp cho» đúng từng chữ; câu nhắc giới hạn và dòng đếm hàng", () => {
  assert.deepEqual([HT.NHAN_TINH_BANG, HT.NHAN_AP_CHO, HT.TINH_BANG_PHAN_TRAM, HT.TINH_BANG_SO_TIEN, HT.AP_CHO_CHUNG, HT.AP_CHO_THEO_LOAI], ["Tính bằng", "Áp cho", "Phần trăm", "Số tiền", "Mọi khách như nhau", "Riêng từng loại khách"]);
  assert.equal(HT.cauGioiHanDangAp({ tranTyLeBp: 5000, buocTien: 1000 }), "Giới hạn đang áp: phần trăm không quá 50%; số tiền chia hết cho 1.000đ (không trả thì gõ 0).");
  assert.equal(HT.cauGioiHanDangAp({ tranTyLeBp: 6050, buocTien: 500 }), "Giới hạn đang áp: phần trăm không quá 60,5%; số tiền chia hết cho 500đ (không trả thì gõ 0).");
  assert.equal(HT.cauDemHangMaTran(3, 129), "Hiện 3 trong 129 hàng.");
});

test("oTrongKeTiep: ô vừa bấm biến khỏi bảng ⇒ ô trống kế tiếp theo thứ tự bảng cũ; không còn ô trống phía sau ⇒ null (về ô Tìm); ô lạ ⇒ null", () => {
  const cu = ["c1|SERVICE|A", "c2|SERVICE|A", "c1|SERVICE|B", "c2|SERVICE|B", "c1|SERVICE|C"];
  // hàng A vừa đủ mức nên rời bảng; hàng B còn ô trống ở cột c2; hàng C còn ô trống ở cột c1
  assert.equal(HT.oTrongKeTiep(cu, "c1|SERVICE|A", new Set(["c2|SERVICE|B", "c1|SERVICE|C"])), "c2|SERVICE|B");
  assert.equal(HT.oTrongKeTiep(cu, "c1|SERVICE|A", new Set(["c1|SERVICE|C"])), "c1|SERVICE|C");
  assert.equal(HT.oTrongKeTiep(cu, "c1|SERVICE|C", new Set(["c2|SERVICE|B"])), null, "chỉ xét ô đứng SAU ô vừa bấm");
  assert.equal(HT.oTrongKeTiep(cu, "c2|SERVICE|B", new Set()), null, "bảng hết ô trống");
  assert.equal(HT.oTrongKeTiep(cu, "khong-co", new Set(["c1|SERVICE|C"])), null, "ô không có trong bảng cũ");
  assert.equal(HT.oTrongKeTiep([], "c1|SERVICE|A", new Set(["c1|SERVICE|A"])), null);
});

// ---- Sửa sau kiểm độc lập (3/11/2026): dịch vụ tính theo lượt thì số tiền là MỖI LƯỢT (máy chủ: `hoaHongTheoLuot`), không phải mỗi khách ----
test("cachGhiTien: dịch vụ tính theo lượt (per5Pax) ⇒ nhãn «mỗi lượt», đuôi «/lượt», không có «Riêng từng loại khách», không gợi ý", () => {
  assert.deepEqual(HT.cachGhiTien({ phamVi: "SERVICE", unit: "per5Pax" }), { donVi: "LUOT", nhan: "Số tiền mỗi lượt (đồng)", goiY: null, coRiengTungLoai: false });
  assert.equal(HT.cachGhiTien({ phamVi: "SERVICE", unit: "per2Pax" }).donVi, "LUOT", "mọi nhóm người từ 2 trở lên đều là lượt");
  assert.equal(HT.cachGhiTien({ phamVi: "SERVICE", unit: " per5Pax " }).donVi, "LUOT", "khoảng trắng thừa không đổi nghĩa (cùng parseUnit với máy chủ)");
});

test("cachGhiTien: dịch vụ tính theo người (perPax) ⇒ như cũ: «mỗi khách», «/khách», có «Riêng từng loại khách», không gợi ý", () => {
  assert.deepEqual(HT.cachGhiTien({ phamVi: "SERVICE", unit: "perPax" }), { donVi: "KHACH", nhan: "Số tiền mỗi khách (đồng)", goiY: null, coRiengTungLoai: true });
});

test("cachGhiTien: đơn vị lạ hoặc thiếu đơn vị ở MỘT dịch vụ ⇒ giữ như cũ, KHÔNG gợi ý (không đoán)", () => {
  for (const unit of ["lạ", "perHour", "per1Pax", "", null]) {
    assert.deepEqual(HT.cachGhiTien({ phamVi: "SERVICE", unit }), { donVi: "KHACH", nhan: "Số tiền mỗi khách (đồng)", goiY: null, coRiengTungLoai: true }, `unit ${JSON.stringify(unit)}`);
  }
});

test("cachGhiTien: phạm vi nhóm hoặc tất cả dịch vụ ⇒ nhãn «mỗi khách» giữ nguyên, thêm đúng một câu gợi ý; «Riêng từng loại khách» vẫn có; đơn vị không ảnh hưởng", () => {
  const CAU = "Dịch vụ tính theo lượt: số này là mỗi lượt.";
  for (const phamVi of ["GROUP", "ALL"] as const) {
    for (const unit of ["perPax", "per5Pax", "lạ", null]) {
      assert.deepEqual(HT.cachGhiTien({ phamVi, unit }), { donVi: "KHACH", nhan: "Số tiền mỗi khách (đồng)", goiY: CAU, coRiengTungLoai: true }, `${phamVi} ${JSON.stringify(unit)}`);
    }
  }
});

test("cachGhiTien: chữ đúng từng chữ (hằng số xuất ra cho giao diện và kịch bản Chrome)", () => {
  assert.deepEqual([HT.NHAN_TIEN_MOI_KHACH, HT.NHAN_TIEN_MOI_LUOT, HT.CAU_GOI_Y_THEO_LUOT], ["Số tiền mỗi khách (đồng)", "Số tiền mỗi lượt (đồng)", "Dịch vụ tính theo lượt: số này là mỗi lượt."]);
});

test("cachGhiTienCuaDong: dòng một dịch vụ tra đơn vị trong danh mục; dòng nhóm, tất cả, dịch vụ không còn trong danh mục ⇒ không đoán lượt", () => {
  const dm = [{ code: "S1", unit: "perPax" }, { code: "S3", unit: "per5Pax" }];
  assert.equal(HT.cachGhiTienCuaDong({ phamVi: "SERVICE", catalogCode: "S3" }, dm).donVi, "LUOT");
  assert.equal(HT.cachGhiTienCuaDong({ phamVi: "SERVICE", catalogCode: "S1" }, dm).donVi, "KHACH");
  assert.equal(HT.cachGhiTienCuaDong({ phamVi: "SERVICE", catalogCode: "CU" }, dm).goiY, null, "dịch vụ không còn trong danh mục: như đơn vị lạ, không gợi ý");
  assert.equal(HT.cachGhiTienCuaDong({ phamVi: "GROUP", catalogCode: null }, dm).goiY, HT.CAU_GOI_Y_THEO_LUOT);
  assert.equal(HT.cachGhiTienCuaDong({ phamVi: "ALL", catalogCode: null }, dm).donVi, "KHACH");
});

test("nhanMucTheoDonVi: chỉ đổi đuôi «/khách» thành «/lượt» ở số tiền của dịch vụ tính theo lượt; phần trăm và nhãn mặc định (nhanMucDto) không đổi", () => {
  const tien = { kieu: "PER_PAX", tyLeBp: null, moiKhach: 50_000 } as const;
  assert.equal(HT.nhanMucTheoDonVi(tien, "LUOT"), "50.000đ/lượt");
  assert.equal(HT.nhanMucTheoDonVi(tien, "KHACH"), "50.000đ/khách");
  assert.equal(HT.nhanMucTheoDonVi({ kieu: "RATE", tyLeBp: 1250, moiKhach: null }, "LUOT"), "12,5%", "phần trăm không có đơn vị");
  assert.equal(HT.nhanMucTheoDonVi({ kieu: "PER_PAX", tyLeBp: null, moiKhach: 0 }, "LUOT"), "0đ/lượt");
  assert.equal(nhanMucDto(tien), "50.000đ/khách", "nhanMucDto giữ nguyên «/khách» (máy chủ và nhiều màn khác dùng)");
  // Dòng cũ còn ba số theo loại trên dịch vụ tính theo lượt: giữ đủ ba số (không giấu dữ liệu), chỉ đổi đuôi.
  assert.equal(HT.nhanMucTheoDonVi({ ...tien, theoLoai: { nguoiLon: 50_000, treEm: 30_000, nguoiCaoTuoi: 0 } }, "LUOT"), "người lớn 50.000đ · trẻ em 30.000đ · người cao tuổi 0đ/lượt");
  assert.equal(HT.nhanMucTheoDonVi({ ...tien, theoLoai: { nguoiLon: 50_000, treEm: 30_000, nguoiCaoTuoi: 0 } }, "KHACH"), "người lớn 50.000đ · trẻ em 30.000đ · người cao tuổi 0đ/khách");
});

test("maTranCap: ô số tiền ở hàng dịch vụ tính theo lượt ghi «/lượt»; hàng theo người, hàng nhóm, «Mọi dịch vụ» vẫn «/khách»; phần trăm không đổi", () => {
  const a = cap("A", "Cấp A", [
    dongCap("A", { id: "s1", phamVi: "SERVICE", catalogCode: "S1", kieu: "PER_PAX", tyLeBp: null, moiKhach: 50_000 }),
    dongCap("A", { id: "s3", phamVi: "SERVICE", catalogCode: "S3", kieu: "PER_PAX", tyLeBp: null, moiKhach: 50_000 }),
    dongCap("A", { id: "s3sap", phamVi: "SERVICE", catalogCode: "S3", kieu: "PER_PAX", tyLeBp: null, moiKhach: 70_000, tuNgay: "2026-11-01", conHieuLuc: false }),
    dongCap("A", { id: "g1", phamVi: "GROUP", groupCode: "G2", kieu: "PER_PAX", tyLeBp: null, moiKhach: 40_000 }),
    dongCap("A", { id: "all", kieu: "PER_PAX", tyLeBp: null, moiKhach: 30_000 }),
  ]);
  const mt = HT.maTranCap({ muc: [a], dichVu: DM_DV, nhom: DM_NHOM, homNay: HOM_NAY });
  const nhan = (pv: string, code: string | null) => mt.hang.find((x) => x.phamVi === pv && x.code === code)!.o[0]!.nhan;
  assert.deepEqual(nhan("SERVICE", "S3"), ["50.000đ/lượt", "70.000đ/lượt từ 01/11/2026"]);
  assert.deepEqual(nhan("SERVICE", "S1"), ["50.000đ/khách"]);
  assert.deepEqual(nhan("GROUP", "G2"), ["40.000đ/khách"]);
  assert.deepEqual(nhan("ALL", null), ["30.000đ/khách"]);
  const b = cap("B", "Cấp B", [dongCap("B", { id: "r", phamVi: "SERVICE", catalogCode: "S3", tyLeBp: 1250 })]);
  assert.deepEqual(HT.maTranCap({ muc: [b], dichVu: DM_DV, nhom: DM_NHOM, homNay: HOM_NAY }).hang.find((x) => x.code === "S3")!.o[0]!.nhan, ["12,5%"]);
});
