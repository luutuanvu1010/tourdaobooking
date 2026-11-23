import assert from "node:assert/strict";
import { test } from "node:test";
import { cauDauTraSau, dauHieuLucCuaDichVu, docOGio, hauQuaDatDau, type DauHienThi } from "./tra-sau-dich-vu-hien-thi.ts";

const dau = (targetKind: "GROUP" | "SERVICE", targetCode: string, gioTra: number, gioAnHan = 0): DauHienThi => ({ targetKind, targetCode, gioTra, gioAnHan });

test("câu tóm tắt dấu: đúng tên «Trả sau theo dịch vụ», ân hạn 0 nói «không ân hạn», theo nhóm có chú thích", () => {
  assert.equal(cauDauTraSau({ gioTra: 24, gioAnHan: 6 }, false), "Trả sau theo dịch vụ: trả trong 24 giờ, ân hạn 6 giờ");
  assert.equal(cauDauTraSau({ gioTra: 48, gioAnHan: 0 }, false), "Trả sau theo dịch vụ: trả trong 48 giờ, không ân hạn");
  assert.equal(cauDauTraSau({ gioTra: 1, gioAnHan: 2 }, true), "Trả sau theo dịch vụ: trả trong 1 giờ, ân hạn 2 giờ (theo nhóm)");
});

test("dấu hiệu lực của một dịch vụ: dấu riêng thắng dấu nhóm; không có nhóm hay không dấu thì null (cùng cách tra với dieuKienTraSauDichVu)", () => {
  const ds = [dau("GROUP", "N1", 24, 6), dau("SERVICE", "A", 12, 1), dau("SERVICE", "N1", 99)];
  assert.deepEqual(dauHieuLucCuaDichVu("A", "N1", ds), { dau: ds[1], theoNhom: false });
  assert.deepEqual(dauHieuLucCuaDichVu("B", "N1", ds), { dau: ds[0], theoNhom: true });
  assert.equal(dauHieuLucCuaDichVu("B", null, ds), null);
  assert.equal(dauHieuLucCuaDichVu("B", "N2", ds), null);
  // mã dịch vụ trùng mã nhóm không lẫn: dịch vụ "N1" lấy dấu SERVICE "N1"
  assert.deepEqual(dauHieuLucCuaDichVu("N1", null, ds), { dau: ds[2], theoNhom: false });
});

test("đọc ô số giờ: số nguyên trong khoảng máy chủ nhận; sai thì câu báo tiếng Việt", () => {
  assert.deepEqual(docOGio(" 24 ", 1, "Thời hạn trả"), { gio: 24 });
  assert.deepEqual(docOGio("0", 0, "Ân hạn"), { gio: 0 });
  assert.deepEqual(docOGio("8760", 1, "Thời hạn trả"), { gio: 8760 });
  for (const [chu, toiThieu] of [["", 1], ["0", 1], ["1.5", 0], ["-1", 0], ["8761", 0], ["abc", 0], ["1e2", 0]] as const) {
    const kq = docOGio(chu, toiThieu, "Ân hạn");
    assert.ok("loi" in kq, `«${chu}» phải báo lỗi`);
    assert.match((kq as { loi: string }).loi, /^Ân hạn phải là số giờ nguyên từ (0|1) tới 8760\.$/);
  }
});

test("hậu quả khi đặt: nói không cần hạn mức, vé hiện ngay, không có trần số tiền; nhóm nói thêm dịch vụ thêm vào sau này", () => {
  for (const loai of ["SERVICE", "GROUP"] as const) {
    const c = hauQuaDatDau(loai, { gioTra: 24, gioAnHan: 6 });
    assert.match(c, /không cần hạn mức/);
    assert.match(c, /vé hiện ngay/);
    assert.match(c, /không có trần số tiền/i);
    assert.match(c, /24 giờ/);
  }
  assert.match(hauQuaDatDau("GROUP", { gioTra: 24, gioAnHan: 0 }), /thêm vào nhóm sau này/);
  assert.doesNotMatch(hauQuaDatDau("SERVICE", { gioTra: 24, gioAnHan: 0 }), /thêm vào nhóm sau này/);
});
