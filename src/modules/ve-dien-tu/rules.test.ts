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

// ---- ADR-0217 Đ3: bảng quyết định huỷ vé lẻ và tình trạng vé ----
import { NHAN_TINH_TRANG_VE, quyetHuyVe, tinhTrangVe, type DuLieuHuyVe } from "./rules.ts";
const dl = (o: Partial<DuLieuHuyVe> = {}): DuLieuHuyVe => ({ nguon: "TOUR_DAO", trangThai: "AVAILABLE", coPhanBoMo: false, daLo: false, daDung: false, ...o });

test("quyetHuyVe: đúng bảng ADR-0217 Đ3 mục 2", () => {
  // Trong kho: cả hai nguồn huỷ được, không trả suất
  assert.deepEqual(quyetHuyVe(dl()), { loai: "HUY", traSuat: false, daLo: false });
  assert.deepEqual(quyetHuyVe(dl({ nguon: "HANG_NGOAI" })), { loai: "HUY", traSuat: false, daLo: false });
  // Đã giữ cho đơn, chưa mở: trả suất cả hai nguồn
  assert.deepEqual(quyetHuyVe(dl({ trangThai: "ALLOCATED", coPhanBoMo: true })), { loai: "HUY", traSuat: true, daLo: false });
  assert.deepEqual(quyetHuyVe(dl({ nguon: "HANG_NGOAI", trangThai: "ALLOCATED", coPhanBoMo: true })), { loai: "HUY", traSuat: true, daLo: false });
  // Đã mở / đã gửi, chưa dùng: Tour Đảo huỷ (báo gửi lại); hãng ngoài 409
  assert.deepEqual(quyetHuyVe(dl({ trangThai: "ALLOCATED", coPhanBoMo: true, daLo: true })), { loai: "HUY", traSuat: true, daLo: true });
  assert.deepEqual(quyetHuyVe(dl({ nguon: "HANG_NGOAI", trangThai: "ALLOCATED", coPhanBoMo: true, daLo: true })), { loai: "TU_CHOI", ma: "ve_hang_ngoai_da_mo" });
  // Đã dùng: không huỷ (Tour Đảo); thắng cả vé đã mở
  assert.deepEqual(quyetHuyVe(dl({ trangThai: "ALLOCATED", coPhanBoMo: true, daLo: true, daDung: true })), { loai: "TU_CHOI", ma: "ve_da_dung" });
  // Đã huỷ rồi
  assert.deepEqual(quyetHuyVe(dl({ trangThai: "VOID" })), { loai: "TU_CHOI", ma: "ve_da_huy" });
  assert.deepEqual(quyetHuyVe(dl({ trangThai: "VOID", daDung: true })), { loai: "TU_CHOI", ma: "ve_da_huy" });
});

test("tinhTrangVe: năm tình trạng, thứ tự Đã huỷ > Đã dùng > Đã gửi khách > Đã giữ cho đơn > Trong kho", () => {
  assert.equal(tinhTrangVe(dl()), "TRONG_KHO");
  assert.equal(tinhTrangVe(dl({ trangThai: "ALLOCATED", coPhanBoMo: true })), "DA_GIU");
  assert.equal(tinhTrangVe(dl({ trangThai: "ALLOCATED", coPhanBoMo: true, daLo: true })), "DA_GUI");
  assert.equal(tinhTrangVe(dl({ trangThai: "ALLOCATED", coPhanBoMo: true, daLo: true, daDung: true })), "DA_DUNG");
  assert.equal(tinhTrangVe(dl({ trangThai: "VOID", daDung: true })), "DA_HUY");
  assert.deepEqual(NHAN_TINH_TRANG_VE, { TRONG_KHO: "Trong kho", DA_GIU: "Đã giữ cho đơn", DA_GUI: "Đã gửi khách", DA_DUNG: "Đã dùng", DA_HUY: "Đã huỷ" });
});
