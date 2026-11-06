// Luật thuần của màn «Cấp độ đại lý» (đặc tả 2026-11-04-man-cap-dai-ly): tìm theo tên, lọc «Chưa có cấp», nhãn dòng, giới hạn số dòng vẽ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHU_MAN, SO_DONG_MOI_LAN, locDong, nhanLoaiHoSo, nhanTaiKhoan, nhanVaiTro, suaDuocDong } from "./cap-dai-ly-hien-thi.ts";
import type { CapDaiLyDongDto, NguonCap } from "./contracts.ts";

const dong = (ten: string, nguon: NguonCap, tk = false): CapDaiLyDongDto => ({
  partyId: ten, ten, loaiHoSo: "ORGANIZATION", vaiTro: [{ code: "A", ten: "Đại lý" }, { code: "B", ten: "Lễ tân" }], coTaiKhoan: tk,
  cap: { partyId: ten, nguon, cap: null, coMucRieng: false, rieng: null, sapApTu: null, doiDuoc: true },
});
const DS = [dong("Lữ hành Biển Xanh", "CHUA_CO"), dong("Khách sạn Đà Nẵng", "RIENG"), dong("Chị Mai", "THEO_VAI"), dong("Hai Vai", "XUNG_DOT")];
const ten = (x: CapDaiLyDongDto[]) => x.map((d) => d.ten);

test("tìm theo tên: bỏ dấu, không phân biệt hoa thường, bỏ khoảng trắng thừa; ô rỗng ⇒ tất cả", () => {
  assert.deepEqual(ten(locDong(DS, { tim: "  bien  xanh ", chiChuaCoCap: false })), ["Lữ hành Biển Xanh"]);
  assert.deepEqual(ten(locDong(DS, { tim: "ĐÀ NẴNG", chiChuaCoCap: false })), ["Khách sạn Đà Nẵng"]);
  assert.deepEqual(ten(locDong(DS, { tim: "   ", chiChuaCoCap: false })), ten(DS));
  assert.deepEqual(locDong(DS, { tim: "không có ai", chiChuaCoCap: false }), []);
});

test("lọc «Chưa có cấp» chỉ giữ nguồn CHUA_CO (hai vai trò khác cấp không tính); kết hợp được với ô tìm", () => {
  assert.deepEqual(ten(locDong(DS, { tim: "", chiChuaCoCap: true })), ["Lữ hành Biển Xanh"]);
  assert.deepEqual(locDong(DS, { tim: "chi mai", chiChuaCoCap: true }), []);
});

test("nhãn: loại hồ sơ, tài khoản, vai trò đều tiếng Việt, không mã thô", () => {
  assert.equal(nhanLoaiHoSo("PERSON"), "Cá nhân");
  assert.equal(nhanLoaiHoSo("ORGANIZATION"), "Tổ chức");
  assert.equal(nhanTaiKhoan(true), "Có tài khoản");
  assert.equal(nhanTaiKhoan(false), "Chưa có tài khoản");
  assert.equal(nhanVaiTro(DS[0]!), "Đại lý, Lễ tân");
});

test("chữ: câu không có cấp nói rõ và tên trang đích khớp nhãn thanh bên; số dòng mỗi lần vẽ hợp lý", () => {
  assert.equal(CHU_MAN.trangHoaHong, "Hoa hồng đối tác");
  assert.match(CHU_MAN.khongCoCap, /[Cc]hưa có cấp độ đại lý nào/);
  assert.ok(SO_DONG_MOI_LAN >= 50 && SO_DONG_MOI_LAN <= 500);
});

test("suaDuocDong: còn cấp đang bật ⇒ mở; hết cấp ⇒ chỉ hồ sơ đang có cấp riêng mở (để «Dùng cấp theo vai trò»), không ô chọn rỗng cho hồ sơ khác", () => {
  const coRieng = { cap: { ...dong("x", "RIENG").cap, rieng: { id: "g", tuNgay: "2026-01-01", denNgay: null } } };
  const khong = dong("y", "CHUA_CO");
  assert.equal(suaDuocDong(true, khong), true);
  assert.equal(suaDuocDong(true, coRieng), true);
  assert.equal(suaDuocDong(false, coRieng), true);
  assert.equal(suaDuocDong(false, khong), false);
});
