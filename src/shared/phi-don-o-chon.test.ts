import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_KHONG_HOP_LE_PHI_DON, CAU_VUOT_TRAN_PHI_DON, DANH_SACH_PHI_DON } from "./phi-don-chon.ts";
import { CHON_SO_KHAC, LUA_CHON_PHI_DON, NHAN_SO_KHAC, O_PHI_TRONG, docSoKhac, mucDaLuuTheoLuot, mucTuO, nhanMucPhi, oTuMuc } from "./phi-don-o-chon.ts";

test("lựa chọn của ô: đúng danh sách dùng chung, «Miễn phí» trước, «Số khác» cuối", () => {
  assert.deepEqual(LUA_CHON_PHI_DON.slice(0, -1).map((l) => l.giaTri), DANH_SACH_PHI_DON.map(String));
  assert.deepEqual(LUA_CHON_PHI_DON.map((l) => l.nhan), ["Miễn phí", "5.000 đ", "10.000 đ", "15.000 đ", "20.000 đ", "30.000 đ", "50.000 đ", "100.000 đ", "Số khác"]);
  assert.equal(LUA_CHON_PHI_DON.at(-1)!.giaTri, CHON_SO_KHAC);
  assert.equal(NHAN_SO_KHAC, "Số khác");
});

test("docSoKhac: chữ số trần hoặc ngăn nghìn đúng nhóm ba; còn lại null", () => {
  for (const [s, n] of [["70000", 70000], ["70.000", 70000], ["6.000.000", 6_000_000], [" 500.000 ", 500000], ["0", 0], ["1", 1]] as const) assert.equal(docSoKhac(s), n, s);
  for (const s of ["", "  ", "70.5", "1.5", "12.50", "7.0000", ".500", "500.", "-5000", "5e3", "5,000", "abc", "70k", "1..000", "0x10"]) assert.equal(docSoKhac(s), null, s);
});

test("mucTuO: chưa chọn = null (gửi null); danh sách; Số khác qua kiemMucChon — cùng câu với máy chủ", () => {
  assert.deepEqual(mucTuO(O_PHI_TRONG), { ok: true, muc: null });
  assert.deepEqual(mucTuO({ chon: "0", khac: "" }), { ok: true, muc: { loai: "DANH_SACH", soTien: 0 } });
  assert.deepEqual(mucTuO({ chon: "30000", khac: "999" }), { ok: true, muc: { loai: "DANH_SACH", soTien: 30000 } });
  assert.deepEqual(mucTuO({ chon: CHON_SO_KHAC, khac: "70.000" }), { ok: true, muc: { loai: "SO_KHAC", soTien: 70000 } });
  assert.deepEqual(mucTuO({ chon: CHON_SO_KHAC, khac: "5.000.000" }), { ok: true, muc: { loai: "SO_KHAC", soTien: 5_000_000 } });
  // [Điểm 5] gõ sai: dấu chấm thập phân, chữ, số âm, 0, trống ⇒ câu «không hợp lệ» của máy chủ; vượt trần ⇒ câu trần.
  for (const khac of ["70.5", "abc", "-5000", "0", ""]) assert.deepEqual(mucTuO({ chon: CHON_SO_KHAC, khac }), { ok: false, cau: CAU_KHONG_HOP_LE_PHI_DON }, khac);
  assert.deepEqual(mucTuO({ chon: CHON_SO_KHAC, khac: "6.000.000" }), { ok: false, cau: CAU_VUOT_TRAN_PHI_DON });
  assert.deepEqual(mucTuO({ chon: "12000", khac: "" }), { ok: false, cau: CAU_KHONG_HOP_LE_PHI_DON }, "giá trị ô chọn bị sửa tay ngoài danh sách");
});

test("oTuMuc ↔ mucTuO đi vòng không mất mức", () => {
  assert.deepEqual(oTuMuc(undefined), O_PHI_TRONG);
  for (const m of [{ loai: "DANH_SACH", soTien: 0 }, { loai: "DANH_SACH", soTien: 100000 }, { loai: "SO_KHAC", soTien: 70000 }, { loai: "SO_KHAC", soTien: 30000 }] as const) {
    assert.deepEqual(mucTuO(oTuMuc(m)), { ok: true, muc: m });
  }
  assert.deepEqual(oTuMuc({ loai: "SO_KHAC", soTien: 1_500_000 }), { chon: CHON_SO_KHAC, khac: "1.500.000" });
});

test("mucDaLuuTheoLuot: chỉ dòng do văn phòng chọn (dòng bảng phí cũ = chưa chọn, ruling P6)", () => {
  const m = mucDaLuuTheoLuot([
    { legId: "a", loaiChon: "DANH_SACH", unitPrice: 30000 },
    { legId: "b", loaiChon: "SO_KHAC", unitPrice: 70000 },
    { legId: "c", loaiChon: null, unitPrice: 35000 },
    { legId: "d", loaiChon: "DANH_SACH", unitPrice: 12000 },
  ]);
  assert.deepEqual([...m.entries()], [["a", { loai: "DANH_SACH", soTien: 30000 }], ["b", { loai: "SO_KHAC", soTien: 70000 }]]);
});

test("nhanMucPhi", () => {
  assert.equal(nhanMucPhi(0), "Miễn phí");
  assert.equal(nhanMucPhi(1_500_000), "1.500.000 đ");
});
