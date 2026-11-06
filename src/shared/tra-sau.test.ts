// Luật thuần của thanh toán trả sau theo hạn mức (ADR-0168; kế hoạch 2026-11-05 Task 1). Không I/O.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hanTraTu, lyDoKhongTraSau, moVeDuoc, NHAN_HINH_THUC, noMotDon, quaHan, type HanMucHieuLuc } from "./tra-sau.ts";

const H50: HanMucHieuLuc = { hanMuc: 50_000_000, soNgay: 7, tuNgay: "2026-11-01", denNgay: null };

test("noMotDon: trả dư kẹp 0, tự ghi «Tôi thu» vẫn tính nợ, đang đối chiếu chưa giảm, đơn huỷ không nợ", () => {
  assert.equal(noMotDon({ daHuy: false, phaiThu: 100, daThuRong: 150, dangDoiChieu: 0, benDatDangGiu: 0 }), 0);
  assert.equal(noMotDon({ daHuy: false, phaiThu: 100, daThuRong: 100, dangDoiChieu: 0, benDatDangGiu: 100 }), 100);
  assert.equal(noMotDon({ daHuy: false, phaiThu: 100, daThuRong: 60, dangDoiChieu: 10, benDatDangGiu: 0 }), 50);
  assert.equal(noMotDon({ daHuy: true, phaiThu: 100, daThuRong: 0, dangDoiChieu: 0, benDatDangGiu: 0 }), 0);
});

test("quaHan: đúng ngày hạn chưa quá hạn; hết nợ không quá hạn; không có hạn thì không quá hạn", () => {
  assert.equal(quaHan("2026-11-10", "2026-11-10", 5), false);
  assert.equal(quaHan("2026-11-10", "2026-11-11", 5), true);
  assert.equal(quaHan("2026-11-10", "2026-11-11", 0), false);
  assert.equal(quaHan(null, "2026-11-11", 5), false);
});

test("quaHan theo giờ Việt Nam: 23:30 và 00:30 quanh ngày hạn", () => {
  // vnToday(2026-11-10T16:30Z) = 2026-11-10 23:30 giờ VN; vnToday(2026-11-10T17:30Z) = 2026-11-11 00:30 giờ VN.
  return import("./vn-date.ts").then(({ vnToday }) => {
    assert.equal(quaHan("2026-11-10", vnToday(new Date("2026-11-10T16:30:00Z")), 5), false);
    assert.equal(quaHan("2026-11-10", vnToday(new Date("2026-11-10T17:30:00Z")), 5), true);
  });
});

test("lyDoKhongTraSau: vừa đủ qua, hơn một đồng bị chặn, thiếu hạn mức, đơn quá hạn", () => {
  assert.equal(lyDoKhongTraSau({ hanMuc: H50, noHienTai: 45_000_000, soTienDon: 5_000_000, coDonQuaHan: false }), null);
  const vuot = lyDoKhongTraSau({ hanMuc: H50, noHienTai: 45_000_000, soTienDon: 5_000_001, coDonQuaHan: false });
  assert.equal(vuot?.ma, "vuot_han_muc");
  assert.match(vuot!.cau, /5\.000\.000/); // số còn được dùng
  assert.match(vuot!.cau, /5\.000\.001/); // số tiền đơn
  assert.equal(lyDoKhongTraSau({ hanMuc: null, noHienTai: 0, soTienDon: 1, coDonQuaHan: false })?.ma, "khong_co_han_muc");
  const qua = lyDoKhongTraSau({ hanMuc: H50, noHienTai: 0, soTienDon: 1, coDonQuaHan: true });
  assert.equal(qua?.ma, "co_don_qua_han");
  assert.match(qua!.cau, /quá hạn chưa thanh toán/);
});

test("hanTraTu: cộng ngày qua cuối năm", () => {
  assert.equal(hanTraTu("2026-12-30", 3), "2027-01-02");
});

test("moVeDuoc: Trả trước phải thu đủ; Trả sau mở trước, trừ khi quá hạn mà vé chưa mở", () => {
  assert.equal(moVeDuoc({ thuDu: false, traSau: null, veDaMo: false, homNay: "2026-11-05" }), false);
  assert.equal(moVeDuoc({ thuDu: true, traSau: null, veDaMo: false, homNay: "2026-11-05" }), true);
  assert.equal(moVeDuoc({ thuDu: false, traSau: { hanTra: "2026-11-30", no: 9 }, veDaMo: false, homNay: "2026-11-05" }), true);
  assert.equal(moVeDuoc({ thuDu: false, traSau: { hanTra: "2026-11-01", no: 9 }, veDaMo: false, homNay: "2026-11-05" }), false);
  assert.equal(moVeDuoc({ thuDu: false, traSau: { hanTra: "2026-11-01", no: 9 }, veDaMo: true, homNay: "2026-11-05" }), true);
});

test("nhãn hình thức dùng tiếng Việt", () => {
  assert.deepEqual(NHAN_HINH_THUC, { PREPAID: "Trả trước", CREDIT: "Trả sau" });
});
