// Sổ đại lý đợt 2, Task 12 — luật THUẦN của giao diện: lựa chọn người thu tiền (khách trả cho đại lý / tại quầy nhà cung cấp), ô «Phần tiền này cho»,
// nhãn lý do «Chụp bù», nhãn loại khoản chờ đối chiếu, cảnh báo giảm giá vượt hoa hồng. Đọc qua không gian tên: thiếu tên (trước khi cài) thì từng bài đỏ riêng.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as B from "./ben-kia-hien-thi.ts";
import { NGHIA_HON_DAO, TU_DA_LOAI } from "./bang-tu-giao-dien.ts";

const DL = { benDat: { ten: "Đại Lý A" }, nhaCungCap: [{ partyId: "pty-ncc", ten: "i-resort" }] };
const giaTri = (ds: readonly { value: string }[]) => ds.map((x) => x.value);

test("lựa chọn người thu tiền: đơn khách lẻ / không đủ điều kiện (benKia null) ⇒ chỉ Công ty và Tôi thu — hai lựa chọn mới ẨN", () => {
  assert.deepEqual(giaTri(B.luaChonNguoiThu(null)), ["cong_ty", "toi"]);
  assert.deepEqual(giaTri(B.luaChonNguoiThu({ benDat: null, nhaCungCap: [] })), ["cong_ty", "toi"]);
});

test("lựa chọn người thu tiền: đơn đại lý có quầy nhà cung cấp ⇒ thêm «Khách trả cho đại lý <tên>» và «Khách trả tại quầy <nhà cung cấp>»", () => {
  const ds = B.luaChonNguoiThu(DL);
  assert.deepEqual(giaTri(ds), ["cong_ty", "toi", "ben_dat", "ncc:pty-ncc"]);
  assert.equal(ds[2]!.nhan, "Khách trả cho đại lý Đại Lý A");
  assert.equal(ds[3]!.nhan, "Khách trả tại quầy i-resort");
  // Chỉ có quầy, không có đại lý hưởng ⇒ không có lựa chọn đại lý.
  assert.deepEqual(giaTri(B.luaChonNguoiThu({ benDat: null, nhaCungCap: DL.nhaCungCap })), ["cong_ty", "toi", "ncc:pty-ncc"]);
});

test("giá trị ô chọn → thân gửi máy chủ đúng hợp đồng LanThuInput.nguoiThu", () => {
  assert.equal(B.nguoiThuTuGiaTri("cong_ty"), "cong_ty");
  assert.equal(B.nguoiThuTuGiaTri("toi"), "toi");
  assert.equal(B.nguoiThuTuGiaTri("ben_dat"), "ben_dat");
  assert.deepEqual(B.nguoiThuTuGiaTri("ncc:pty-ncc"), { nhaCungCapPartyId: "pty-ncc" });
  assert.equal(B.laBenKia("ben_dat"), true);
  assert.equal(B.laBenKia("ncc:pty-ncc"), true);
  assert.equal(B.laBenKia("toi"), false);
});

test("ô «Phần tiền này cho»: chỉ hiện khi đơn có dòng làm đại lý (có nhà cung cấp); chọn quầy nhà cung cấp ⇒ khoá vào đúng nhà cung cấp đó (máy chủ 400 nếu khác)", () => {
  assert.deepEqual(B.oThuCho(null, "cong_ty"), { hien: false, khoa: null });
  assert.deepEqual(B.oThuCho({ benDat: { ten: "Đại Lý A" }, nhaCungCap: [] }, "ben_dat"), { hien: false, khoa: null });
  assert.deepEqual(B.oThuCho(DL, "cong_ty"), { hien: true, khoa: null });
  assert.deepEqual(B.oThuCho(DL, "ncc:pty-ncc"), { hien: true, khoa: "pty-ncc" });
  assert.deepEqual(giaTri(B.luaChonThuCho(DL)), ["", "pty-ncc"]);
  assert.equal(B.luaChonThuCho(DL)[0]!.nhan, "Tour Đảo");
  assert.equal(B.luaChonThuCho(DL)[1]!.nhan, "i-resort");
});

test("câu «chờ Kế toán xác nhận»: chỉ cho người KHÔNG ghi sổ khi chọn hai lựa chọn mới; Kế toán ghi thẳng ⇒ không câu", () => {
  assert.match(B.cauChoKeToan("ben_dat", false) ?? "", /chờ Kế toán xác nhận/);
  assert.match(B.cauChoKeToan("ncc:pty-ncc", false) ?? "", /chờ Kế toán xác nhận/);
  assert.equal(B.cauChoKeToan("ben_dat", true), null);
  assert.equal(B.cauChoKeToan("toi", false), null);
  assert.equal(B.cauChoKeToan("cong_ty", false), null);
});

test("Chụp bù: nhãn lời thường cho cả ba lý do của GET /api/orders/cho-chup-bu (R-52) — không lộ mã thô", () => {
  for (const ma of ["co_nguoi_huong", "nhap_tay", "khach_le"] as const) {
    const nhan = B.nhanLyDoChupBu(ma);
    assert.ok(nhan.length > 5 && !nhan.includes("_"), `${ma}: ${nhan}`);
  }
  assert.equal(new Set((["co_nguoi_huong", "nhap_tay", "khach_le"] as const).map(B.nhanLyDoChupBu)).size, 3, "ba nhãn khác nhau");
  assert.match(B.nhanLyDoChupBu("nhap_tay"), /ghi mức tay/);
});

test("nút «Chụp bù» trong khối Phần đối tác: chỉ đơn đã xác nhận chưa có bản chụp, người có ô ghi tay (không nháp)", () => {
  assert.equal(B.hienNutChupBu(true, { duKien: false, chuaChup: true }), true);
  assert.equal(B.hienNutChupBu(false, { duKien: false, chuaChup: true }), false);
  assert.equal(B.hienNutChupBu(true, { duKien: false, chuaChup: false }), false);
  assert.equal(B.hienNutChupBu(true, { duKien: true, chuaChup: false }), false);
});

test("nhãn loại khoản chờ đối chiếu (Trang chủ Kế toán): ba loại; nút xác nhận đúng route", () => {
  assert.equal(B.nhanKhoanDoiChieu({ loai: "ben_dat", benKia: "Đại Lý A" }), "Khách trả cho đại lý Đại Lý A");
  assert.equal(B.nhanKhoanDoiChieu({ loai: "nha_cung_cap", benKia: "i-resort" }), "Khách trả tại quầy i-resort");
  assert.equal(B.nhanKhoanDoiChieu({ loai: "cong_ty", benKia: null }), "Công ty thu – chuyển khoản");
  assert.equal(B.nutXacNhanDoiChieu("ben_dat"), "Bên kia đã nhận");
  assert.equal(B.nutXacNhanDoiChieu("nha_cung_cap"), "Bên kia đã nhận");
  assert.equal(B.nutXacNhanDoiChieu("cong_ty"), null, "khoản Công ty thu cần mã giao dịch — xác nhận ở trang đơn");
});

test("cảnh báo giảm giá vượt hoa hồng (canhBaoGiamGia.vuot sau xác nhận); trần giảm giá cùng câu với máy chủ", () => {
  const vnd = (n: number) => `${n.toLocaleString("vi-VN")} ₫`;
  assert.equal(B.cauCanhBaoGiamGia(null, vnd), null);
  assert.equal(B.cauCanhBaoGiamGia({ vuot: 50_000 }, vnd), "Giảm giá đang lớn hơn hoa hồng 50.000 ₫ — đại lý chịu phần này.");
  assert.equal(B.CAU_TRAN_HOA_HONG(100_000), "Giảm tối đa 100.000 ₫ (bằng hoa hồng của đơn).");
});

test("lý do giữ «stale» có nút tải lại; lý do khác không", () => {
  assert.equal(B.lyDoCanTaiLai("stale"), true);
  assert.equal(B.lyDoCanTaiLai("reconciling"), false);
});

test("mọi chữ của tệp qua bảng từ ADR-0130", () => {
  const chu = [
    ...B.luaChonNguoiThu(DL).map((x) => x.nhan), ...B.luaChonThuCho(DL).map((x) => x.nhan), B.cauChoKeToan("ben_dat", false)!,
    ...(["co_nguoi_huong", "nhap_tay", "khach_le"] as const).map(B.nhanLyDoChupBu), B.NHAN_O_THU_CHO,
  ];
  for (const c of chu) for (const t of TU_DA_LOAI) assert.ok(!t.cam.test(c.replace(NGHIA_HON_DAO, "")), `«${c}» dính chữ đã loại ${t.cam}`);
});

test("form lập / sửa đơn — ô giảm giá của tài khoản chỉ giá danh mục: Đối tác ĐƯỢC HƯỞNG (máy chủ ép bên đặt về mình) mở ô; Đối tác không hưởng, Thực tập khoá; câu cũ «tạm chưa» bỏ", () => {
  const huong = B.oGiamGiaChiGiaDanhMuc({ laDoiTac: true, laThucTap: false, duocHuong: true });
  assert.equal(huong.khoa, false);
  assert.match(huong.cau, /tới mức hoa hồng của đơn/);
  const khong = B.oGiamGiaChiGiaDanhMuc({ laDoiTac: true, laThucTap: false, duocHuong: false });
  assert.equal(khong.khoa, true);
  assert.ok(!khong.cau.includes("tạm chưa"), khong.cau);
  assert.deepEqual(B.oGiamGiaChiGiaDanhMuc({ laDoiTac: false, laThucTap: true, duocHuong: false }), { khoa: true, cau: "Tài khoản Thực tập không được giảm giá." });
  assert.equal(B.oGiamGiaChiGiaDanhMuc({ laDoiTac: true, laThucTap: true, duocHuong: true }).khoa, true, "Đối tác + Thực tập: máy chủ trần 0");
});

test("form sửa đơn — câu trần theo đơn đã lưu: chỉ khi có người hưởng và tổng hoa hồng đã đủ mức (null = thiếu mức ⇒ không đoán số)", () => {
  assert.equal(B.cauTranGiamGiaForm(null), null);
  assert.match(B.cauTranGiamGiaForm(100_000) ?? "", /^Giảm tối đa 100\.000 ₫ \(bằng hoa hồng của đơn\)\./);
});
