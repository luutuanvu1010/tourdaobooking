// Lý do huỷ đơn (ADR-0089 đ8, X-2; lời chủ (a)) — luật thuần dùng chung máy chủ ↔ giao diện. Kế hoạch Đợt 1 Task 3, H-C4.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LY_DO_HUY, docLyDoHuy, luaChonLyDo, lyDoHuyCuaHdv, nhanLyDoHuy, nhanNhomHuy } from "./ly-do-huy.ts";

test("danh sách lý do theo nhóm: khách huỷ, lập lại / trùng, công ty huỷ, 'Khác' = chưa kết luận", () => {
  const nhom = (ma: string) => LY_DO_HUY.find((l) => l.ma === ma)?.nhom;
  assert.equal(nhom("KHACH_DOI_Y"), "KHACH_HUY");
  assert.equal(nhom("KHACH_DAT_TRUNG"), "LAP_LAI");
  assert.equal(nhom("SAI_THONG_TIN"), "LAP_LAI");
  for (const m of ["THOI_TIET", "HET_CHO", "SU_CO_NCC", "LOI_CONG_TY"]) assert.equal(nhom(m), "CONG_TY_HUY", m);
  assert.equal(nhom("OTHER"), "CHUA_KET_LUAN");
  assert.equal(nhanLyDoHuy("THOI_TIET"), "Thời tiết / cấm biển");
  assert.equal(nhanNhomHuy("CHUA_KET_LUAN"), "Chưa kết luận");
});

test("H-C4 (Đ-2): chỉ người có cờ 'phân loại' thấy và chọn được nhóm Công ty huỷ — cờ do route tính bằng can(), hàm không tự hỏi quyền", () => {
  assert.ok(!luaChonLyDo({ coTheChonCongTy: false }).some((l) => l.nhom === "CONG_TY_HUY"));
  assert.ok(luaChonLyDo({ coTheChonCongTy: true }).some((l) => l.nhom === "CONG_TY_HUY"));
  const cam = docLyDoHuy({ lyDo: "THOI_TIET" }, { coTheChonCongTy: false });
  assert.deepEqual(cam, { ok: false, status: 403, message: "Chỉ Quản trị hoặc Toàn quyền chọn được lý do thuộc nhóm “Công ty huỷ”." });
  assert.deepEqual(docLyDoHuy({ lyDo: "THOI_TIET" }, { coTheChonCongTy: true }), { ok: true, lyDo: { ma: "THOI_TIET", nhom: "CONG_TY_HUY", ghiChu: null } });
});

test("NT-L1 (đ8): thiếu lý do → 400; lý do lạ → 400; 'Khác' thiếu ghi chú → 400; ghi chú có dãy số giống SĐT → 400; ghi chú các mã khác bị bỏ qua", () => {
  const ok = { coTheChonCongTy: false };
  assert.deepEqual(docLyDoHuy({}, ok), { ok: false, status: 400, message: "Chọn lý do huỷ đơn." });
  assert.deepEqual(docLyDoHuy({ lyDo: "BLA" }, ok), { ok: false, status: 400, message: "Chọn lý do huỷ đơn." });
  assert.deepEqual(docLyDoHuy({ lyDo: "OTHER" }, ok), { ok: false, status: 400, message: "Cần ghi rõ lý do khi chọn “Khác”." });
  assert.deepEqual(docLyDoHuy({ lyDo: "OTHER", ghiChu: "   " }, ok), { ok: false, status: 400, message: "Cần ghi rõ lý do khi chọn “Khác”." });
  const sdt = docLyDoHuy({ lyDo: "OTHER", ghiChu: "gọi 0912 345 678" }, ok);
  assert.equal(sdt.ok ? 0 : sdt.status, 400);
  assert.deepEqual(docLyDoHuy({ lyDo: "OTHER", ghiChu: " Khách ốm " }, ok), { ok: true, lyDo: { ma: "OTHER", nhom: "CHUA_KET_LUAN", ghiChu: "Khách ốm" } });
  assert.deepEqual(docLyDoHuy({ lyDo: "KHACH_DOI_Y", ghiChu: "x" }, ok), { ok: true, lyDo: { ma: "KHACH_DOI_Y", nhom: "KHACH_HUY", ghiChu: null } });
  assert.equal(docLyDoHuy({ lyDo: "OTHER", ghiChu: "a".repeat(301) }, ok).ok, false, "ghi chú tối đa 300 ký tự");
  assert.equal(docLyDoHuy({ lyDo: "LEGACY" }, { coTheChonCongTy: true }).ok, false, "mã gieo đơn cũ không chọn được");
});

test("NT-L4 (lời chủ (a)): lý do của HDV ánh xạ nhóm — 'Khách yêu cầu huỷ' và 'Không liên hệ được với khách' = khách huỷ; 'Khác' = chưa kết luận", () => {
  assert.deepEqual(lyDoHuyCuaHdv("customer_requested", undefined), { ma: "KHACH_YEU_CAU", nhom: "KHACH_HUY", ghiChu: null });
  assert.deepEqual(lyDoHuyCuaHdv("not_reachable", undefined), { ma: "KHONG_LIEN_HE", nhom: "KHACH_HUY", ghiChu: null });
  assert.deepEqual(lyDoHuyCuaHdv("other", "Khách ốm"), { ma: "OTHER", nhom: "CHUA_KET_LUAN", ghiChu: "Khách ốm" });
});
