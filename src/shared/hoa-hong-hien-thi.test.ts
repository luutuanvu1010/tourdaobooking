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
  canXacNhanDongDieuKhoan,
  nhanLoaiDoiTac,
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
  assert.deepEqual(nhanDoiTuong({ loai: "MUC", code: "MT_ABCDEFGH", ten: "TA1" }), { ten: "TA1", loai: "Mức TA" }, "ADR-0117 lần 2: dòng của mức TA");
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
  assert.equal(cauThuTra(co(7)), "Áp mức 12,5% — mức TA của loại đối tác cho dịch vụ này");
  assert.equal(cauThuTra(co(8)), "Áp mức 12,5% — mức TA của loại đối tác cho nhóm");
  assert.equal(cauThuTra(co(9)), "Áp mức 12,5% — mức TA của loại đối tác cho mọi dịch vụ");
  const loi = new Set<string>();
  for (const b of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) loi.add(LOI_BAC[b]);
  assert.equal(loi.size, 9, "mỗi bậc một lời khác nhau");
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
  assert.equal(CAU_CHUA_TIM_DUOC_DOI_TAC, "Tài khoản của bạn chưa tìm được đối tác theo tên. Cần đặt mức riêng cho một đối tác thì nhờ Quản trị hoặc Toàn quyền.", "nói rõ phải làm gì (Ruling 26: chưa nới cổng, ghi nợ)");
});

test("ADR-0117: nhanLoaiDoiTac — nút Tắt / Bật chỉ ở loại do Kế toán thêm, theo cờ đang bật; loại có sẵn không có nút", () => {
  assert.deepEqual(nhanLoaiDoiTac({ ten: "Công ty lữ hành", coSan: true, dangBat: true }), { nguon: "Có sẵn", trangThai: "Đang dùng", nut: null });
  assert.equal(nhanLoaiDoiTac({ ten: "Khách sạn", coSan: true, dangBat: false }).nut, null, "loại có sẵn dù lệch cờ cũng không có nút");
  assert.deepEqual(nhanLoaiDoiTac({ ten: "Nhân viên spa", coSan: false, dangBat: true }), { nguon: "Do Kế toán thêm", trangThai: "Đang dùng", nut: { hanhDong: "tat", nhan: "Tắt", ariaLabel: "Tắt loại: Nhân viên spa" } });
  assert.deepEqual(nhanLoaiDoiTac({ ten: "Nhân viên spa", coSan: false, dangBat: false }), { nguon: "Do Kế toán thêm", trangThai: "Đã tắt", nut: { hanhDong: "bat", nhan: "Bật", ariaLabel: "Bật loại: Nhân viên spa" } });
});

test("ADR-0117 lần 2: «Thử tra» thắng ở bậc 7–9 ⇒ câu kèm TÊN mức TA (N-12); bậc khác không thêm tên", () => {
  const base = { ngay: HOM_NAY, nguoiHuong: { loai: "HUONG" as const, vai: ["Lễ tân khách sạn"] } };
  const dongMuc = muc({ doiTuong: { loai: "MUC", code: "MT_ABCDEFGH", ten: "Đại lý cấp 1" }, phamVi: "SERVICE", catalogCode: "HONTAM", tyLeBp: 1500 });
  assert.equal(cauThuTra({ ...base, ketQua: { trangThai: "SET", bac: 7, muc: dongMuc } }), "Áp mức 15% — mức TA của loại đối tác cho dịch vụ này: «Đại lý cấp 1»");
  assert.equal(cauThuTra({ ...base, ketQua: { trangThai: "SET", bac: 9, muc: { ...dongMuc, phamVi: "ALL", catalogCode: null } } }), "Áp mức 15% — mức TA của loại đối tác cho mọi dịch vụ: «Đại lý cấp 1»");
  assert.doesNotMatch(cauThuTra({ ...base, ketQua: { trangThai: "SET", bac: 7, muc: dongMuc } }), /MT_[A-Z]{8}/, "không lộ mã mức");
  assert.equal(cauThuTra({ ...base, ketQua: { trangThai: "SET", bac: 6, muc: muc({}) } }), "Áp mức 12,5% — mức của loại đối tác cho mọi dịch vụ", "bậc riêng: không thêm tên");
});

test("ADR-0117 lần 2: nhanMucTa — «Đang dùng» + nút Tắt / «Đã tắt» + nút Bật (theo cờ máy chủ), nhãn nút có tên mức, không mã", () => {
  assert.deepEqual(nhanMucTa({ ten: "Đại lý cấp 1", dangBat: true }), { trangThai: "Đang dùng", nut: { hanhDong: "tat", nhan: "Tắt", ariaLabel: "Tắt mức TA: Đại lý cấp 1" } });
  assert.deepEqual(nhanMucTa({ ten: "Đại lý cấp 1", dangBat: false }), { trangThai: "Đã tắt", nut: { hanhDong: "bat", nhan: "Bật", ariaLabel: "Bật mức TA: Đại lý cấp 1" } });
});

test("ADR-0117 lần 2: boDongMucTa — dòng của mức TA chỉ hiện ở mục «Mức TA», không lặp ở «Các mức hiện có»; giữ thứ tự", () => {
  const ds = [muc({ id: "a" }), muc({ id: "b", doiTuong: { loai: "MUC", code: "MT_ABCDEFGH", ten: "Đại lý cấp 1" } }), muc({ id: "c", doiTuong: { loai: "DOI_TAC", partyId: "p", ten: "Đại Lý A" } })];
  assert.deepEqual(boDongMucTa(ds).map((d) => d.id), ["a", "c"]);
});

test("ADR-0117 lần 2: câu cảnh báo khi gắn mức cho loại còn dòng riêng (N-17) và câu luật đổi mức trong ngày — nguyên văn", () => {
  assert.equal(
    cauCanhBaoDongRieng("Lễ tân khách sạn", "Đại lý cấp 1", 2),
    "Đã gắn, nhưng loại «Lễ tân khách sạn» (hoặc loại khác mà cùng đối tác đang mang) còn 2 dòng mức riêng đang áp. Dòng riêng được ưu tiên hơn mức TA «Đại lý cấp 1». Đóng các dòng này nếu muốn dùng mức TA.",
  );
  assert.match(cauCanhBaoDongRieng("A", "B", 1), /Đóng các dòng này nếu muốn dùng mức TA\.$/);
  assert.equal(CAU_DOI_MUC_TRONG_NGAY, "Mỗi loại chỉ gắn một mức TA trong một ngày. Muốn đổi sang mức khác từ hôm nay: kết thúc gắn cũ tới hôm qua, rồi gắn mức mới từ hôm nay. Gắn bắt đầu từ hôm nay thì không đổi được trong cùng ngày.");
});
