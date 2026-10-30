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
  NHAN_CHUA_CO_MUC,
  CAU_NHAC_UU_TIEN,
  CAU_THU_TU_AP_MUC,
  CAU_TRA_THEO_LOAI,
  cauMucCuSeNgung,
  cauSeTao,
  cauCanhBaoTheoChinhSach,
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
  assert.deepEqual(nhanDoiTuong({ loai: "MUC", code: "MT_ABCDEFGH", ten: "TA1" }), { ten: "TA1", loai: "Cấp đại lý" }, "ADR-0117 lần 2: dòng của mức TA");
});

test("trạng thái dòng: đang áp / sắp áp / đã đóng; chỉ dòng chưa có ngày kết thúc mới đóng được", () => {
  assert.equal(trangThaiDong({ conHieuLuc: true, denNgay: null }, HOM_NAY), "DANG_AP");
  assert.equal(trangThaiDong({ conHieuLuc: true, denNgay: "2026-12-31" }, HOM_NAY), "DANG_AP");
  assert.equal(trangThaiDong({ conHieuLuc: false, denNgay: null }, HOM_NAY), "SAP_AP", "bắt đầu sau hôm nay, chưa có ngày kết thúc");
  assert.equal(trangThaiDong({ conHieuLuc: false, denNgay: "2026-12-31" }, HOM_NAY), "SAP_AP");
  assert.equal(trangThaiDong({ conHieuLuc: false, denNgay: "2026-10-08" }, HOM_NAY), "DA_DONG");
  assert.deepEqual(NHAN_TRANG_THAI, { DANG_AP: "Đang áp dụng", SAP_AP: "Sắp áp dụng", DA_DONG: "Đã ngừng", DA_HUY: "Đã huỷ — thay bằng dòng khác" }, "ADR-0148: thêm «Đã huỷ»");
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
  assert.equal(cauThuTra(co(6)), "Áp mức 12,5% — mức của loại đối tác cho mọi dịch vụ");
  assert.equal(cauThuTra(co(7)), "Áp mức 12,5% — cấp đại lý của loại đối tác cho dịch vụ này");
  assert.equal(cauThuTra(co(8)), "Áp mức 12,5% — cấp đại lý của loại đối tác cho nhóm");
  assert.equal(cauThuTra(co(9)), "Áp mức 12,5% — cấp đại lý của loại đối tác cho mọi dịch vụ");
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
  assert.deepEqual(nhanLoaiDoiTac({ ten: "Nhân viên spa", coSan: false, dangBat: true }), { nguon: "", trangThai: "", nut: { hanhDong: "tat", nhan: "Tắt", ariaLabel: "Tắt loại: Nhân viên spa" } });
  assert.deepEqual(nhanLoaiDoiTac({ ten: "Nhân viên spa", coSan: false, dangBat: false }), { nguon: "", trangThai: "Đã tắt", nut: { hanhDong: "bat", nhan: "Bật", ariaLabel: "Bật loại: Nhân viên spa" } });
});

test("ADR-0117 lần 2: «Thử tra» thắng ở bậc 7–9 ⇒ câu kèm TÊN mức TA (N-12); bậc khác không thêm tên", () => {
  const base = { ngay: HOM_NAY, nguoiHuong: { loai: "HUONG" as const, vai: ["Lễ tân khách sạn"] } };
  const dongMuc = muc({ doiTuong: { loai: "MUC", code: "MT_ABCDEFGH", ten: "Đại lý cấp 1" }, phamVi: "SERVICE", catalogCode: "HONTAM", tyLeBp: 1500 });
  assert.equal(cauThuTra({ ...base, ketQua: { trangThai: "SET", bac: 7, muc: dongMuc } }), "Áp mức 15% — cấp đại lý của loại đối tác cho dịch vụ này: «Đại lý cấp 1»");
  assert.equal(cauThuTra({ ...base, ketQua: { trangThai: "SET", bac: 9, muc: { ...dongMuc, phamVi: "ALL", catalogCode: null } } }), "Áp mức 15% — cấp đại lý của loại đối tác cho mọi dịch vụ: «Đại lý cấp 1»");
  assert.doesNotMatch(cauThuTra({ ...base, ketQua: { trangThai: "SET", bac: 7, muc: dongMuc } }), /MT_[A-Z]{8}/, "không lộ mã mức");
  assert.equal(cauThuTra({ ...base, ketQua: { trangThai: "SET", bac: 6, muc: muc({}) } }), "Áp mức 12,5% — mức của loại đối tác cho mọi dịch vụ", "bậc riêng: không thêm tên");
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
    "Đã áp dụng cấp đại lý, nhưng loại «Lễ tân khách sạn» (hoặc loại khác mà cùng đối tác đang mang) còn 2 mức riêng đang áp dụng. Mức riêng được ưu tiên hơn cấp đại lý «Đại lý cấp 1». Ngừng các mức riêng này nếu muốn dùng cấp đại lý.",
  );
  assert.match(cauCanhBaoDongRieng("A", "B", 1), /Ngừng các mức riêng này nếu muốn dùng cấp đại lý\.$/);
  assert.equal(CAU_DOI_MUC_TRONG_NGAY, "Mỗi loại chỉ theo một cấp đại lý trong một ngày. Muốn đổi sang cấp khác từ hôm nay: ngừng áp dụng cấp cũ đến hết hôm qua, rồi áp dụng cấp mới từ hôm nay. Áp dụng từ hôm nay thì không đổi được trong cùng ngày.");
});

test("PR2 T1: nhãn mới và các câu nguyên văn", () => {
  // Chủ chọn 28/10 (thay «Loại gốc»): nhãn ngắn + một câu nói lý do không tắt được.
  assert.equal(NHAN_LOAI_GOC, "Có sẵn");
  assert.equal(CAU_LOAI_CO_SAN, "Loại có sẵn đi kèm tài khoản đăng nhập của đối tác nên không tắt được.");
  assert.equal(CAU_CHUA_CO_MUC_LOAI, "Đơn của loại này sẽ bị giữ ở bước Đã giao cho tới khi có mức");
  assert.equal(NHAN_CHUA_CO_MUC, "Chưa có mức");
  assert.equal(CAU_NHAC_UU_TIEN, "Mức riêng được ưu tiên hơn cấp đại lý. Mức nào áp cho một đối tác cụ thể: dùng Tra nhanh.");
  assert.equal(CAU_TRA_THEO_LOAI, "Đang tra theo loại. Một đối tác cụ thể của loại này có thể có mức riêng hoặc cấp riêng — gõ tên đối tác để chắc.");
  assert.equal(cauMucCuSeNgung("10%", "2026-11-01"), "Mức cũ 10% sẽ ngừng, đến hết 31/10/2026.");
  assert.equal(cauSeTao({ ai: "Đại lý A", dichVu: "Mọi dịch vụ", muc: "10%", tu: "2026-11-01", den: null }), "Sẽ tạo: Đại lý A · Mọi dịch vụ · 10% · từ 01/11/2026, không thời hạn.");
  assert.equal(cauSeTao({ ai: "A", dichVu: "B", muc: "5%", tu: "2026-11-01", den: "2026-12-31" }), "Sẽ tạo: A · B · 5% · từ 01/11/2026 đến 31/12/2026.");
  assert.equal(cauCanhBaoTheoChinhSach("Cấp 1"), "Loại này đang theo cấp đại lý Cấp 1. Mức riêng được ưu tiên hơn cấp đại lý.");
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
test("ADR-0148: dòng đã huỷ có trạng thái riêng «Đã huỷ — thay bằng dòng khác», bị bộ lọc «Đang và sắp áp dụng» bỏ (như dòng đã ngừng), hiện ở «Tất cả»", async () => {
  const m = await import("./hoa-hong-hien-thi.ts");
  assert.equal(m.NHAN_TRANG_THAI.DA_HUY, "Đã huỷ — thay bằng dòng khác");
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
  assert.equal(m.cauXemTruocSua({ homNay: HOM_NAY, duong: "HUY_THAY" }, "cấp đại lý này"), "Chưa có đơn nào dùng cấp đại lý này — sửa sẽ thay hẳn.");
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
  assert.equal(CAU_THU_TU_AP_MUC, "Mức nào áp cho một đơn: mức riêng của đối tác → cấp riêng của đối tác → mức riêng của loại đối tác → cấp đại lý của loại. Trong mỗi bước: dịch vụ đó → nhóm dịch vụ → mọi dịch vụ. Đối tác có cấp riêng thì không xét cấp của loại. Muốn biết chắc cho một đối tác: dùng Tra nhanh.");
});
