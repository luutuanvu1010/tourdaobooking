// Luật thuần chọn vé (kế hoạch Task 2): không I/O. Ngày dân sự VN `YYYY-MM-DD`, so chuỗi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canVe, chonVe, thieuVe, veDungDuoc, type VeTrong } from "./rules.ts";

const ve = (id: string, from: string, to: string): VeTrong => ({ id, valid_from: from, valid_to: to });

test("emBeKhongCanVe", () => {
  assert.deepEqual(canVe({ adult: 2, child: 1, senior: 0, infant: 1 }), { ADULT: 2, CHILD: 1, SENIOR: 0 });
});
test("canVe: số âm hoặc lẻ không sinh số vé sai", () => {
  assert.deepEqual(canVe({ adult: -1, child: 1.9, senior: 0, infant: 0 }), { ADULT: 0, CHILD: 1, SENIOR: 0 });
});
test("veMotNgayChiKhopDungNgay", () => {
  const v = { valid_from: "2026-10-24", valid_to: "2026-10-24" };
  assert.equal(veDungDuoc(v, "2026-10-24"), true);
  assert.equal(veDungDuoc(v, "2026-10-25"), false);
  assert.equal(veDungDuoc(v, "2026-10-23"), false);
});
test("veChuaToiHanKhongDuocChon; vé hết hạn cũng không", () => {
  const kho = [ve("a", "2026-11-01", "2026-11-30"), ve("b", "2026-09-01", "2026-09-30")];
  assert.deepEqual(chonVe(kho, 2, "2026-10-24"), []);
});
test("veHetHanSomDuocLayTruoc; hoà thì theo id", () => {
  const kho = [ve("c", "2026-10-01", "2026-11-30"), ve("b", "2026-10-01", "2026-10-30"), ve("a", "2026-10-01", "2026-10-30")];
  assert.deepEqual(chonVe(kho, 2, "2026-10-24").map((v) => v.id), ["a", "b"]);
});
test("khoKhongDuThiLayPhanCo", () => {
  const kho = [ve("a", "2026-10-01", "2026-11-30")];
  assert.equal(chonVe(kho, 3, "2026-10-24").length, 1);
  assert.deepEqual(chonVe(kho, 0, "2026-10-24"), []);
});
test("chonVe không đổi mảng đầu vào", () => {
  const kho = [ve("b", "2026-10-01", "2026-11-30"), ve("a", "2026-10-01", "2026-10-30")];
  chonVe(kho, 1, "2026-10-24");
  assert.deepEqual(kho.map((v) => v.id), ["b", "a"]);
});
test("thieuVeKhongAm", () => {
  assert.deepEqual(thieuVe({ ADULT: 2, CHILD: 1, SENIOR: 0 }, { ADULT: 1, CHILD: 3, SENIOR: 0 }), { ADULT: 1, CHILD: 0, SENIOR: 0 });
});
