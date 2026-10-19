// ADR-0133: hoa hồng "mỗi khách" tách theo loại khách (người lớn, trẻ em, người cao tuổi; em bé luôn 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { hoaHongDong, hoaHongTheoLoai, hoaHongTheoLuot } from "./hoa-hong-dong.ts";

const MUC = { adult: 50_000, child: 30_000, senior: 40_000 };

test("2 người lớn + 1 trẻ em + 1 người cao tuổi + 1 em bé ⇒ 170.000 (em bé không tính)", () => {
  assert.equal(hoaHongTheoLoai(MUC, { adult: 2, child: 1, senior: 1, infant: 1 }), 170_000);
});

test("trẻ em gõ 0 ⇒ 0 đồng cho trẻ em, không lấy theo người lớn (ADR-0133 điều 2)", () => {
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

import { tinhDongDoiTac, type BanChup } from "./hoa-hong-dong.ts";
const chup = (theoLoai: { adult: number; child: number; senior: number } | null): BanChup => ({ serviceId: "s", beneficiaryPartyId: "p",
  hoaHong: { status: "SET", kind: "PER_PAX", rateBp: null, perPax: 50_000, ruleId: "r", theoLoai }, cungUng: { status: "MISSING" } });

test("tinhDongDoiTac: có ba số ⇒ theo từng loại; dịch vụ theo nhóm (pax null) ⇒ số người lớn × lượt; không có ba số ⇒ như cũ", () => {
  const ba = { adult: 50_000, child: 30_000, senior: 40_000 };
  assert.equal(tinhDongDoiTac(chup(ba), { thanhTien: 1_000_000, soKhachTinh: 4, pax: { adult: 2, child: 1, senior: 1 } }).hoaHong, 170_000);
  assert.equal(tinhDongDoiTac(chup(ba), { thanhTien: 1_000_000, soKhachTinh: 3, pax: null }).hoaHong, 150_000);
  assert.equal(tinhDongDoiTac(chup(null), { thanhTien: 1_000_000, soKhachTinh: 4, pax: { adult: 2, child: 1, senior: 1 } }).hoaHong, 200_000);
  assert.equal(tinhDongDoiTac(chup(null), { thanhTien: 1_000_000, soKhachTinh: 4 }).hoaHong, 200_000, "nơi gọi cũ chưa truyền pax vẫn chạy khi không có ba số");
  assert.throws(() => tinhDongDoiTac(chup(ba), { thanhTien: 1_000_000, soKhachTinh: 4 }), /số khách theo loại/, "có ba số mà thiếu pax ⇒ ném lỗi, không đoán");
});
