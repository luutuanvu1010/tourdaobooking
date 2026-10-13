// ADR-0114 D3 — luật thuần "mỗi đơn có ít nhất một người lớn đi cùng". Bài canh: người đi kèm = người lớn + người cao tuổi (điều khoản 1);
// dịch vụ theo nhóm / nhập tay chỉ có ô "số khách" ở `adult` nên tự được tính là người lớn (điều khoản 2); tính trên CẢ ĐƠN, không từng dịch vụ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_THIEU_NGUOI_LON, donThieuNguoiLon, soNguoiDiKem } from "./nguoi-di-kem.ts";

test("soNguoiDiKem: chỉ trẻ em và em bé → 0; người cao tuổi tính là người đi kèm; người lớn + người cao tuổi cộng lại", () => {
  assert.equal(soNguoiDiKem({ adult: 0, child: 2, senior: 0, infant: 1 }), 0);
  assert.equal(soNguoiDiKem({ adult: 0, senior: 2 }), 2);
  assert.equal(soNguoiDiKem({ adult: 3, child: 1, senior: 2, infant: 4 }), 5);
  assert.equal(soNguoiDiKem({}), 0, "thiếu khoá = 0");
});

test("donThieuNguoiLon: tính trên CẢ ĐƠN — một dịch vụ toàn trẻ em vẫn qua nếu dịch vụ khác có người lớn", () => {
  assert.equal(donThieuNguoiLon([{ adult: 0, child: 3 }, { adult: 0 }]), true);
  assert.equal(donThieuNguoiLon([{ adult: 0, child: 3 }, { adult: 1 }]), false);
  assert.equal(donThieuNguoiLon([{ adult: 0, child: 0, senior: 0, infant: 5 }]), true, "chỉ em bé");
  assert.equal(donThieuNguoiLon([{ adult: 0, senior: 2 }]), false, "đơn toàn người cao tuổi lập được (điều khoản 1)");
  assert.equal(donThieuNguoiLon([]), true, "đơn không có dịch vụ nào cũng là thiếu người lớn");
});

test("CAU_THIEU_NGUOI_LON: nguyên văn ADR-0114, tiếng Việt có dấu, KHÔNG có chữ số", () => {
  assert.equal(CAU_THIEU_NGUOI_LON, "Đơn cần ít nhất một người lớn đi cùng; trẻ em và em bé không đi một mình.");
  assert.doesNotMatch(CAU_THIEU_NGUOI_LON, /\d/);
});
