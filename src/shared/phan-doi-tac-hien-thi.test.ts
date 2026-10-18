// Quyết định thuần của giao diện "bên đặt là đối tác" (sổ đại lý đợt 1, Task 11): ô "Đặt qua đối tác", dòng chỉ đọc của Đối tác, khối "Phần đối tác", bảng "Ghi mức tay".
// Cổng ẩn/hiện được nối với ROUTE THẬT ở src/modules/pricing/o-dat-qua-noi-cong.test.ts; thân ghi tay được nối với `kiemThanGhiTay` của máy chủ ở src/modules/orders/ghi-tay-nhap-noi.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, type PermissionCode } from "./permissions.ts";
import {
  CAU_CHO_CAI_MUC, MOI_KHACH_TOI_DA, TIEU_DE_DOI_TAC, TIEU_DE_LOI, TIEU_DE_VAN_PHONG, canhBaoThieuMuc, chuHoaHongDoiTac, chuNhaCungCap, chuTongHoaHong, coODatQuaDoiTac, coXemNguoiBan, coXemPhanDoiTac, demLyDo, docThanGhiTay,
  docTienTay, docTyLeTay, duocGhiTay, ghiChuTrangThai, gopBenDat, hienNutGhiTay, khoiBenDatForm, nhanBenDat, nhanNguoiHuong, nhanSdtKhach, nhanTenKhach, noiNapBenDat, type FormGhiTay,
} from "./phan-doi-tac-hien-thi.ts";

const staff = (...permissions: PermissionCode[]) => ({ id: "s1", permissions });
const AGENCY = { partyId: "pty-1", ten: "Đại lý Một" };

test("coODatQuaDoiTac: người lập đơn KHÔNG giữ quyền Đối tác — mọi tài khoản lai SALES/ADMIN + PARTNER đều không thấy", () => {
  assert.equal(coODatQuaDoiTac(staff("SALES")), true);
  assert.equal(coODatQuaDoiTac(staff("ADMIN")), true);
  assert.equal(coODatQuaDoiTac(staff("SUPER_ADMIN")), true);
  assert.equal(coODatQuaDoiTac(staff("SALES", "PARTNER")), false, "lai Bán hàng + Đối tác");
  assert.equal(coODatQuaDoiTac(staff("ADMIN", "PARTNER")), false, "lai Quản trị + Đối tác");
  assert.equal(coODatQuaDoiTac(staff("PARTNER")), false);
  assert.equal(coODatQuaDoiTac(staff("ACCOUNTING")), false, "Kế toán không lập đơn");
  assert.equal(coODatQuaDoiTac(staff("FIELD")), false);
  assert.equal(coODatQuaDoiTac(staff("HR")), false);
});

test("khoiBenDatForm: Đối tác được hưởng ⇒ dòng chỉ đọc; Đối tác khác / lai ⇒ ô tra SĐT như cũ; văn phòng ⇒ ô tra SĐT + ô Đặt qua đối tác", () => {
  assert.deepEqual(khoiBenDatForm(staff("PARTNER"), AGENCY), { kieu: "chi-doc", benDat: AGENCY });
  assert.deepEqual(khoiBenDatForm(staff("PARTNER"), null), { kieu: "tra-sdt" });
  assert.deepEqual(khoiBenDatForm(staff("PARTNER"), undefined), { kieu: "tra-sdt" }, "máy chủ cũ chưa có trường: không đoán");
  assert.deepEqual(khoiBenDatForm(staff("SALES", "PARTNER"), null), { kieu: "tra-sdt" }, "lai KHÔNG có ô Đặt qua đối tác");
  assert.deepEqual(khoiBenDatForm(staff("SALES", "PARTNER"), AGENCY), { kieu: "chi-doc", benDat: AGENCY }, "lai mà hồ sơ được hưởng: máy chủ ép ⇒ dòng chỉ đọc");
  assert.deepEqual(khoiBenDatForm(staff("SALES"), null), { kieu: "tra-sdt-va-dat-qua" });
  assert.deepEqual(khoiBenDatForm(staff("SALES"), AGENCY), { kieu: "tra-sdt-va-dat-qua" }, "không giữ quyền Đối tác thì bỏ qua trường lạ");
  assert.deepEqual(khoiBenDatForm(staff("ACCOUNTING"), null), { kieu: "tra-sdt" });
});

test("gopBenDat: dòng chỉ đọc hoặc đã chọn đại lý thắng ô tra SĐT; không thì giữ nguyên điều ô tra SĐT gửi", () => {
  const tra = { bookerPartyId: null } as const;
  const traMoi = { newBooker: { fullName: "A", phone: "0900000000" } };
  assert.deepEqual(gopBenDat({ chiDoc: null, daChon: null, tra }), tra);
  assert.deepEqual(gopBenDat({ chiDoc: null, daChon: null, tra: traMoi }), traMoi);
  assert.deepEqual(gopBenDat({ chiDoc: null, daChon: AGENCY, tra: traMoi }), { bookerPartyId: "pty-1" }, "đã chọn đại lý: bỏ qua hồ sơ mới của ô tra SĐT");
  assert.deepEqual(gopBenDat({ chiDoc: AGENCY, daChon: null, tra }), { bookerPartyId: "pty-1" });
  assert.deepEqual(gopBenDat({ chiDoc: AGENCY, daChon: { partyId: "pty-2", ten: "Khác" }, tra }), { bookerPartyId: "pty-1" }, "hai bên cùng có (không xảy ra trên giao diện thật): bên máy chủ ép thắng, vì máy chủ cũng ép như vậy");
});

test("noiNapBenDat: mở lại nháp — bên đặt là đối tác thì vào ô Đặt qua đối tác (khi có ô), không thì vào ô tra SĐT", () => {
  assert.equal(noiNapBenDat({ coODatQua: true, bookerLaDoiTac: true, bookerPartyId: "pty-1" }), "dat-qua");
  assert.equal(noiNapBenDat({ coODatQua: true, bookerLaDoiTac: false, bookerPartyId: "pty-9" }), "tra-sdt");
  assert.equal(noiNapBenDat({ coODatQua: true, bookerLaDoiTac: true, bookerPartyId: null }), "tra-sdt", "không có hồ sơ thì không có gì để nạp");
  assert.equal(noiNapBenDat({ coODatQua: false, bookerLaDoiTac: true, bookerPartyId: "pty-1" }), "tra-sdt", "không có ô thì giữ như hôm nay (Đối tác / lai)");
});

test("nhanBenDat: nhãn theo cờ máy chủ trả, không suy", () => {
  assert.equal(nhanBenDat(true), "Bên đặt (đối tác)");
  assert.equal(nhanBenDat(false), "Hồ sơ khách");
});

test("cổng khối Phần đối tác: xem theo order.terms.view; ghi tay chỉ khi đúng quyền, không giữ Đối tác, đơn đã xác nhận, chưa Đã giao; người bán chỉ khi có supply.terms.view", () => {
  const don = { staffId: "s1" };
  assert.equal(coXemPhanDoiTac(staff("SALES"), don), true);
  assert.equal(coXemPhanDoiTac(staff("PARTNER"), don), true);
  assert.equal(coXemPhanDoiTac(staff("DRIVER"), don), false);
  assert.equal(coXemPhanDoiTac(staff("HR"), don), false);
  const xacNhan = { status: "confirmed", deliveredAt: null };
  assert.equal(duocGhiTay(staff("ACCOUNTING"), xacNhan), true);
  assert.equal(duocGhiTay(staff("ADMIN"), xacNhan), true);
  assert.equal(duocGhiTay(staff("SALES"), xacNhan), false, "Bán hàng không ghi mức tay");
  assert.equal(duocGhiTay(staff("ACCOUNTING", "PARTNER"), xacNhan), false, "lai Kế toán + Đối tác bị từ chối ở máy chủ");
  assert.equal(duocGhiTay(staff("ACCOUNTING"), { status: "draft", deliveredAt: null }), false);
  assert.equal(duocGhiTay(staff("ACCOUNTING"), { status: "cancelled", deliveredAt: null }), false);
  assert.equal(duocGhiTay(staff("ACCOUNTING"), { status: "confirmed", deliveredAt: "2026-10-01T00:00:00.000Z" }), false, "đã giao");
  assert.equal(coXemNguoiBan(staff("ACCOUNTING")), true);
  assert.equal(coXemNguoiBan(staff("SALES")), false);
  assert.equal(coXemNguoiBan(staff("ACCOUNTING", "PARTNER")), false);
  assert.equal(hienNutGhiTay(true, { duKien: false, chuaChup: false }), true);
  assert.equal(hienNutGhiTay(true, { duKien: true, chuaChup: false }), false, "nháp: dự kiến, chưa có bản chụp để ghi đè");
  assert.equal(hienNutGhiTay(true, { duKien: false, chuaChup: true }), false);
  assert.equal(hienNutGhiTay(false, { duKien: false, chuaChup: false }), false);
});

test("chữ hiển thị của khối: người hưởng, trạng thái, cảnh báo thiếu mức, tổng chưa đủ, nhà cung cấp, Đối tác chờ cài mức", () => {
  const f = (n: number) => `${n}đ`;
  assert.equal(nhanNguoiHuong({ nguoiHuong: { ten: "Đại lý Một" } }), "Người hưởng: Đại lý Một");
  assert.equal(nhanNguoiHuong({ nguoiHuong: null }), "Không có người hưởng hoa hồng");
  assert.equal(ghiChuTrangThai({ duKien: true, chuaChup: false }), "Dự kiến — tính theo bảng mức hôm nay, chưa lưu");
  assert.equal(ghiChuTrangThai({ duKien: false, chuaChup: true }), "Đơn xác nhận trước khi có bảng mức");
  assert.equal(ghiChuTrangThai({ duKien: false, chuaChup: false }), null);
  assert.equal(canhBaoThieuMuc("Chưa có mức cho dịch vụ này"), "Chưa có mức cho đối tác này — cần cài mức (cấp) thì mới tính được hoa hồng; đơn bị giữ ở bước Đã giao.");
  assert.equal(canhBaoThieuMuc("Hai mức khác nhau cùng áp — Kế toán chọn một"), "Hai mức khác nhau cùng áp — Kế toán chọn một — cần cài mức (cấp) thì mới tính được hoa hồng; đơn bị giữ ở bước Đã giao.");
  assert.doesNotMatch(canhBaoThieuMuc("Chưa có mức cho dịch vụ này") ?? "", /MISSING|RULE_CONFLICT|NO_RULE/);
  assert.equal(canhBaoThieuMuc(null), null);
  assert.equal(chuTongHoaHong(null, f), "Chưa đủ mức");
  assert.equal(chuTongHoaHong(0, f), "0đ", "0 là số thật (đơn không người hưởng), không phải thiếu");
  assert.equal(chuTongHoaHong(120000, f), "120000đ");
  assert.equal(chuHoaHongDoiTac(null, f), "Chờ Công ty cài mức");
  assert.equal(chuHoaHongDoiTac(500, f), "500đ");
  assert.equal(chuNhaCungCap({ tyLeMua: "70%", giaVon: 350000 }, f), "Mua lại 70% — giá vốn 350000đ");
  assert.equal(CAU_CHO_CAI_MUC, "Đang chờ Công ty cài mức cho một số dịch vụ");
});

test("docTyLeTay / docTienTay: cùng luật với máy chủ (phần vạn nguyên, 0–100%; đồng nguyên, trần 100.000.000)", () => {
  assert.deepEqual(docTyLeTay("12,5"), { ok: true, bp: 1250 });
  assert.deepEqual(docTyLeTay("12.5"), { ok: true, bp: 1250 });
  assert.deepEqual(docTyLeTay(" 15% "), { ok: true, bp: 1500 });
  assert.deepEqual(docTyLeTay("0"), { ok: true, bp: 0 });
  assert.deepEqual(docTyLeTay("100"), { ok: true, bp: 10000 });
  assert.deepEqual(docTyLeTay("0,01"), { ok: true, bp: 1 });
  for (const sai of ["", "abc", "12,555", "100,01", "101", "-1", "1e2", "12,5%x"]) assert.equal(docTyLeTay(sai).ok, false, sai);
  assert.deepEqual(docTienTay("50.000"), { ok: true, dong: 50_000 });
  assert.deepEqual(docTienTay("0"), { ok: true, dong: 0 });
  assert.deepEqual(docTienTay("100.000.000"), { ok: true, dong: MOI_KHACH_TOI_DA });
  for (const sai of ["", "50,5", "-1", "abc", "100.000.001", "1234567890"]) assert.equal(docTienTay(sai).ok, false, sai);
});

test("demLyDo: đếm ký tự sau khi cắt khoảng trắng; báo còn thiếu khi dưới 10", () => {
  assert.equal(demLyDo(""), "0 ký tự — cần ít nhất 10");
  assert.equal(demLyDo("  ngắn  "), "4 ký tự — cần ít nhất 10");
  assert.equal(demLyDo("đủ mười ký tự"), "13/300 ký tự");
  assert.equal(demLyDo("a".repeat(300)), "300/300 ký tự");
  assert.equal(demLyDo("a".repeat(301)), "301/300 ký tự — quá dài");
});

const CTY = "pty-cong-ty";
const form = (p: Partial<FormGhiTay> = {}): FormGhiTay => ({ kieu: "RATE", tyLe: "10", moiKhach: "", nguoiBan: { loai: "KHONG_DOI" }, lyDo: "Khách quen, đã thoả thuận mức mới", ...p });

test("docThanGhiTay: dựng đúng thân cho từng kiểu; phần 'Không đổi' không gửi", () => {
  assert.deepEqual(docThanGhiTay(form(), CTY), { ok: true, body: { lyDo: "Khách quen, đã thoả thuận mức mới", hoaHong: { kieu: "RATE", tyLeBp: 1000 } } });
  assert.deepEqual(docThanGhiTay(form({ kieu: "PER_PAX", moiKhach: "50.000" }), CTY), { ok: true, body: { lyDo: "Khách quen, đã thoả thuận mức mới", hoaHong: { kieu: "PER_PAX", moiKhach: 50_000 } } });
  assert.deepEqual(docThanGhiTay(form({ kieu: "KHONG_DOI", nguoiBan: { loai: "TOUR_DAO" } }), CTY), { ok: true, body: { lyDo: "Khách quen, đã thoả thuận mức mới", nguoiBan: { partyId: CTY } } });
  assert.deepEqual(
    docThanGhiTay(form({ kieu: "RATE", tyLe: "15", nguoiBan: { loai: "NHA_CUNG_CAP", partyId: "pty-ncc", tyLeMua: "70" } }), CTY),
    { ok: true, body: { lyDo: "Khách quen, đã thoả thuận mức mới", hoaHong: { kieu: "RATE", tyLeBp: 1500 }, nguoiBan: { partyId: "pty-ncc", tyLeMuaBp: 7000 } } },
  );
  const kq = docThanGhiTay(form({ lyDo: "   Khách quen, đã thoả thuận mức mới   " }), CTY);
  assert.ok(kq.ok && kq.body.lyDo === "Khách quen, đã thoả thuận mức mới", "lý do cắt khoảng trắng hai đầu");
});

test("docThanGhiTay: lỗi gom theo ô, không gửi khi còn lỗi", () => {
  const loi = (f: FormGhiTay, cty: string | null = CTY) => {
    const k = docThanGhiTay(f, cty);
    assert.equal(k.ok, false);
    return k.ok ? [] : k.loi;
  };
  assert.deepEqual(loi(form({ tyLe: "abc" })).map((l) => l.truong), ["muc"]);
  assert.deepEqual(loi(form({ kieu: "PER_PAX", moiKhach: "" })).map((l) => l.truong), ["muc"]);
  assert.deepEqual(loi(form({ kieu: "KHONG_DOI" })).map((l) => l.truong), ["chung"], "không đổi gì cả");
  assert.deepEqual(loi(form({ lyDo: "ngắn" })).map((l) => l.truong), ["lyDo"]);
  assert.deepEqual(loi(form({ lyDo: "a".repeat(301) })).map((l) => l.truong), ["lyDo"]);
  assert.deepEqual(loi(form({ lyDo: "gọi 0905123456 nhé ạ" })).map((l) => l.truong), ["lyDo"]);
  assert.deepEqual(loi(form({ kieu: "KHONG_DOI", nguoiBan: { loai: "NHA_CUNG_CAP", partyId: "", tyLeMua: "70" } })).map((l) => l.truong), ["nguoiBan"]);
  assert.deepEqual(loi(form({ kieu: "KHONG_DOI", nguoiBan: { loai: "NHA_CUNG_CAP", partyId: "pty-ncc", tyLeMua: "" } })).map((l) => l.truong), ["tyLeMua"]);
  assert.deepEqual(loi(form({ kieu: "KHONG_DOI", nguoiBan: { loai: "TOUR_DAO" } }), null).map((l) => l.truong), ["nguoiBan"], "chưa biết Tour Đảo là hồ sơ nào thì không đoán");
  assert.deepEqual(loi(form({ tyLe: "x", lyDo: "" })).map((l) => l.truong).sort(), ["lyDo", "muc"], "gom nhiều lỗi một lượt");
});

test("mọi tập quyền: cổng ẩn/hiện của khối không bao giờ mở cho tài khoản giữ quyền Đối tác ngoài việc XEM", () => {
  const n = PERMISSION_CODES.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const perms = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const s = staff(...perms);
    if (perms.includes("PARTNER")) {
      assert.equal(duocGhiTay(s, { status: "confirmed", deliveredAt: null }), false, perms.join("+"));
      assert.equal(coXemNguoiBan(s), false, perms.join("+"));
      assert.equal(coODatQuaDoiTac(s), false, perms.join("+"));
    }
  }
});

// Task 14, nợ (e) (T11 M5): khối «Phần đối tác» ở nhánh LỖI chưa biết người xem là văn phòng hay Đối tác (dạng chỉ biết khi tải được). Tiêu đề lỗi phải trung tính — không là «Phần đối tác» (sai với Đối tác) hay «Hoa hồng của bạn» (sai với văn phòng).
test("tiêu đề khối lỗi trung tính: khác tiêu đề văn phòng và tiêu đề Đối tác, không nhắc «đối tác» lẫn «của bạn»", () => {
  assert.equal(TIEU_DE_LOI, "Hoa hồng");
  assert.notEqual(TIEU_DE_LOI, TIEU_DE_VAN_PHONG);
  assert.notEqual(TIEU_DE_LOI, TIEU_DE_DOI_TAC);
  assert.ok(!/đối tác|của bạn/i.test(TIEU_DE_LOI), "không gán nhầm dạng nào cho người xem");
  assert.equal(TIEU_DE_VAN_PHONG, "Phần đối tác", "tiêu đề khi CÓ dữ liệu không đổi");
  assert.equal(TIEU_DE_DOI_TAC, "Hoa hồng của bạn", "tiêu đề khi CÓ dữ liệu không đổi");
});

// Màn Tạo đơn thiết kế lại (18/10/2026), Task 3: nhãn tên / SĐT khách theo việc đã chọn đối tác hay chưa.
test("nhanTenKhach / nhanSdtKhach: nhãn đổi khi đã chọn đối tác (người đặt khác người đi tour)", () => {
  assert.equal(nhanTenKhach(false), "Tên khách đi tour *");
  assert.equal(nhanTenKhach(true), "Tên khách đi tour *");
  assert.equal(nhanSdtKhach(false), "Số điện thoại *");
  assert.equal(nhanSdtKhach(true), "Số điện thoại khách *");
});

// Phán quyết đặc tả mục 6 ("Đối tác, Thực tập"): bảng quyền THẬT có cho Thực tập thấy công tắc "Đơn của" không. Chỉ đọc bảng — không đổi quyền nào.
test("Thực tập (chỉ INTERN) THẤY công tắc «Đơn của» — theo bảng quyền thật, order.create của INTERN là «any» và INTERN không phải Đối tác", () => {
  assert.equal(coODatQuaDoiTac(staff("INTERN")), true, "tài khoản chỉ giữ INTERN thấy công tắc");
  assert.deepEqual(khoiBenDatForm(staff("INTERN"), null), { kieu: "tra-sdt-va-dat-qua" });
  assert.equal(coODatQuaDoiTac(staff("INTERN", "PARTNER")), false, "Thực tập kèm Đối tác (lai) thì không");
});
