// Luật thuần của thanh toán trả sau theo hạn mức (ADR-0168; kế hoạch 2026-11-05 Task 1). Không I/O.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lyDoKhongTraSau, NHAN_HINH_THUC, noMotDon, type HanMucHieuLuc } from "./tra-sau.ts";
// Luật giờ (hạn trả, ân hạn, mở vé, nới hạn, tin nhắc): src/shared/tra-sau-gio.test.ts.

const H50: HanMucHieuLuc = { hanMuc: 50_000_000, gioTra: 168, gioAnHan: 0, tuNgay: "2026-11-01", denNgay: null };

test("noMotDon: trả dư kẹp 0, tự ghi «Tôi thu» vẫn tính nợ, đang đối chiếu chưa giảm, đơn huỷ không nợ", () => {
  assert.equal(noMotDon({ daHuy: false, phaiThu: 100, daThuRong: 150, dangDoiChieu: 0, benDatDangGiu: 0 }), 0);
  assert.equal(noMotDon({ daHuy: false, phaiThu: 100, daThuRong: 100, dangDoiChieu: 0, benDatDangGiu: 100 }), 100);
  assert.equal(noMotDon({ daHuy: false, phaiThu: 100, daThuRong: 60, dangDoiChieu: 10, benDatDangGiu: 0 }), 50);
  assert.equal(noMotDon({ daHuy: true, phaiThu: 100, daThuRong: 0, dangDoiChieu: 0, benDatDangGiu: 0 }), 0);
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

test("nhãn hình thức dùng tiếng Việt", () => {
  assert.deepEqual(NHAN_HINH_THUC, { PREPAID: "Thanh toán ngay", CREDIT: "Trả sau" });
});
