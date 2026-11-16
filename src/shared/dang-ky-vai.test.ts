// Luật nối vai đăng ký với phần của phiếu (ADR-0212 Đ2): bảng thuần dùng chung máy chủ và giao diện.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CO_O_BANG_LAI, DA_CO_THAY_MAT_TO_CHUC, lienKetLoDuyet, lyDoChuaMoDuoc, MOI_TRUONG_MO, phanCuaVai, vaiCaNhanRongDuoc, type MoiTruongMo } from "./dang-ky-vai.ts";

test("phanCuaVai: Công ty lữ hành chỉ ở phần tổ chức; loại do Kế toán thêm ở cá nhân hoặc tổ chức; còn lại cá nhân", () => {
  const ca: [string, boolean, string][] = [
    ["TRAVEL_AGENCY", false, "CHI_TO_CHUC"],
    ["GUIDE_FREELANCE", false, "CA_NHAN"],
    ["HOTEL_RECEPTION", false, "CA_NHAN"],
    ["TAXI_DRIVER", false, "CA_NHAN"],
    ["COLLABORATOR", false, "CA_NHAN"],
    ["DRIVER_EXTERNAL", false, "CA_NHAN"],
    ["LD_THU", true, "CA_NHAN_HOAC_TO_CHUC"],
  ];
  for (const [ma, laLoai, mong] of ca) assert.equal(phanCuaVai(ma, laLoai), mong, ma);
});

test("lyDoChuaMoDuoc: Công ty lữ hành thiếu MỘT trong hai điều kiện ⇒ có câu; đủ cả hai ⇒ null", () => {
  const dk = { coThayMatToChuc: true, chinhSachCoToChuc: true, coOBangLai: true };
  assert.equal(lyDoChuaMoDuoc("TRAVEL_AGENCY", dk), null);
  const thieuThayMat = lyDoChuaMoDuoc("TRAVEL_AGENCY", { ...dk, coThayMatToChuc: false });
  assert.ok(thieuThayMat && /Công ty lữ hành/.test(thieuThayMat) && /phần khai tổ chức|tổ chức/.test(thieuThayMat), String(thieuThayMat));
  const thieuChinhSach = lyDoChuaMoDuoc("TRAVEL_AGENCY", { ...dk, chinhSachCoToChuc: false });
  assert.ok(thieuChinhSach && /chính sách riêng tư/.test(thieuChinhSach), String(thieuChinhSach));
  assert.notEqual(thieuThayMat, thieuChinhSach, "hai thiếu sót, hai câu khác nhau");
  assert.ok(lyDoChuaMoDuoc("TRAVEL_AGENCY", { coThayMatToChuc: false, chinhSachCoToChuc: false, coOBangLai: true }));
});

test("lyDoChuaMoDuoc: Tài xế đối tác chưa mở khi chưa có ô bằng lái — câu nhắc ô bằng lái và bước chọn nhà xe", () => {
  const dk = { coThayMatToChuc: true, chinhSachCoToChuc: true, coOBangLai: false };
  const cau = lyDoChuaMoDuoc("DRIVER_EXTERNAL", dk);
  assert.ok(cau && /Tài xế đối tác/.test(cau) && /bằng lái/.test(cau) && /nhà xe/.test(cau), String(cau));
  assert.equal(lyDoChuaMoDuoc("DRIVER_EXTERNAL", { ...dk, coOBangLai: true }), null);
});

test("lyDoChuaMoDuoc: vai cá nhân thường và loại do Kế toán thêm ⇒ null, bất kể điều kiện", () => {
  const trong = { coThayMatToChuc: false, chinhSachCoToChuc: false, coOBangLai: false };
  for (const ma of ["GUIDE_FREELANCE", "HOTEL_RECEPTION", "TAXI_DRIVER", "COLLABORATOR", "LD_X"]) assert.equal(lyDoChuaMoDuoc(ma, trong), null, ma);
});

test("hằng điều kiện: Task 13 bật phần tổ chức (thay mặt tổ chức); ô bằng lái (Đ8) còn tắt; môi trường mặc định khớp hai hằng", () => {
  assert.equal(DA_CO_THAY_MAT_TO_CHUC, true);
  assert.equal(CO_O_BANG_LAI, false);
  assert.deepEqual(MOI_TRUONG_MO, { coThayMatToChuc: true, coOBangLai: false });
});

test("Đảo hằng (ADR-0212 Đ2, Đ4; ADR-0213 Đ6): BA hành vi đổi CÙNG LÚC — Công ty lữ hành mở được, vai cá nhân rỗng gửi được, lô duyệt mở «Người quản lý của» thay «Người liên hệ của»", () => {
  const tat: MoiTruongMo = { coThayMatToChuc: false, coOBangLai: false };
  const bat: MoiTruongMo = { coThayMatToChuc: true, coOBangLai: false };
  const hanhVi = (mt: MoiTruongMo) => ({
    lt: lyDoChuaMoDuoc("TRAVEL_AGENCY", { coThayMatToChuc: mt.coThayMatToChuc, chinhSachCoToChuc: true, coOBangLai: mt.coOBangLai }) === null,
    rong: vaiCaNhanRongDuoc(mt, true),
    lienKetMoi: lienKetLoDuyet(mt, "MOI"),
  });
  assert.deepEqual(hanhVi(tat), { lt: false, rong: false, lienKetMoi: "CONTACT_OF" });
  assert.deepEqual(hanhVi(bat), { lt: true, rong: true, lienKetMoi: "MANAGER_OF" });
  // Chính sách chưa nêu phần tổ chức ⇒ Công ty lữ hành vẫn chưa mở dù hằng bật.
  assert.ok(lyDoChuaMoDuoc("TRAVEL_AGENCY", { coThayMatToChuc: true, chinhSachCoToChuc: false, coOBangLai: false }));
  // Vai cá nhân rỗng KHÔNG BAO GIỜ gửi được khi không có phần tổ chức.
  assert.equal(vaiCaNhanRongDuoc(bat, false), false);
  // Tổ chức có sẵn (ADR-0212 Đ6, ADR-0213 Đ6; Task 13 vòng sửa 1): bật ⇒ KHÔNG dòng nào (B2: «Thành viên của» khi có lời mời), không bao giờ người quản lý; tắt (mốc A) ⇒ «Người liên hệ của».
  assert.equal(lienKetLoDuyet(bat, "CO_SAN"), null);
  assert.equal(lienKetLoDuyet(tat, "CO_SAN"), "CONTACT_OF");
});
