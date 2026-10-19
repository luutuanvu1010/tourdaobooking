// ADR-0133: hoa hồng "mỗi khách" tách theo loại khách (người lớn, trẻ em, người cao tuổi; em bé luôn 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { hoaHongDong, hoaHongTheoLoai, hoaHongTheoLuot } from "./hoa-hong-dong.ts";

const MUC = { adult: 50_000, child: 30_000, senior: 40_000 };

test("2 người lớn + 1 trẻ em + 1 người cao tuổi + 1 em bé ⇒ 170.000 (em bé không tính)", () => {
  assert.equal(hoaHongTheoLoai(MUC, { adult: 2, child: 1, senior: 1, infant: 1 }), 170_000);
});

test("ô trẻ em bỏ trống = 0 đồng, không lấy theo người lớn (ADR-0133 điều 2)", () => {
  assert.equal(hoaHongTheoLoai({ adult: 50_000, child: 0, senior: 40_000 }, { adult: 2, child: 3, senior: 1 }), 140_000);
});

test("thiếu loại trong số khách ⇒ coi là 0 người", () => {
  assert.equal(hoaHongTheoLoai(MUC, { adult: 1 }), 50_000);
  assert.equal(hoaHongTheoLoai(MUC, {}), 0);
});

test("dịch vụ tính theo nhóm/lượt: mỗi lượt lấy số tiền người lớn (ADR-0133 điều 4)", () => {
  assert.equal(hoaHongTheoLuot(MUC, 3), 150_000);
});

test("số tiền hoặc số khách không hợp lệ ⇒ ném lỗi, không âm thầm ra số lạ", () => {
  assert.throws(() => hoaHongTheoLoai({ adult: -1, child: 0, senior: 0 }, { adult: 1 }));
  assert.throws(() => hoaHongTheoLoai(MUC, { adult: 1.5 }));
  assert.throws(() => hoaHongTheoLoai(MUC, { child: -1 }));
});

test("kiểu cũ PER_PAX không đổi: một số tiền × số khách tính", () => {
  assert.equal(hoaHongDong({ kind: "PER_PAX", rateBp: null, perPaxAmount: 50_000, thanhTien: 0, soKhachTinh: 4 }), 200_000);
  assert.equal(hoaHongDong({ kind: "RATE", rateBp: 1250, perPaxAmount: null, thanhTien: 1_000_000, soKhachTinh: 4 }), 125_000);
});
