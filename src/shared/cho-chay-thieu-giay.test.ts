// ADR-0184: luật thuần «Cho chạy dù thiếu giấy tờ» — quyền theo loại giấy, lý do, ghi chú, nhãn vàng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GIAY_TO_XE_CHI_TOAN_QUYEN, gomLoChoChayThieu, kiemChoChayThieu, laGiayToChiToanQuyen, nhanChoChayThieu, NUT_CHO_CHAY_THIEU_GIAY } from "./cho-chay-thieu-giay.ts";
import type { GiayToXeThieu } from "./dieu-phoi-kieu.ts";

const thieu = (...codes: string[]): GiayToXeThieu[] => codes.map((c, i) => ({ documentTypeCode: c, expiryDate: null, ruleId: `r${i}` }));
const goc = { thieu: thieu("REGISTRATION", "INSPECTION"), yeuCau: ["REGISTRATION"], coOToanQuyen: false, lyDo: "THIEU_GIAY_GIA_HAN" as string | null, lyDoHopLe: true, ghiChu: null as string | null };

test("laGiayToChiToanQuyen: chỉ Kiểm định và Bảo hiểm trách nhiệm dân sự", () => {
  assert.deepEqual([...GIAY_TO_XE_CHI_TOAN_QUYEN], ["INSPECTION", "TPL_INSURANCE"]);
  assert.equal(laGiayToChiToanQuyen("INSPECTION"), true);
  assert.equal(laGiayToChiToanQuyen("TPL_INSURANCE"), true);
  for (const c of ["REGISTRATION", "CONTRACT_BADGE", "TRIP_MONITOR", "DRIVER_CAMERA", "LOAI_MOI"]) assert.equal(laGiayToChiToanQuyen(c), false, c);
});

test("nhanChoChayThieu: một loại; hai loại nối bằng «, »", () => {
  assert.equal(nhanChoChayThieu(["Kiểm định"]), "Xe thiếu Kiểm định — đã cho chạy");
  assert.equal(nhanChoChayThieu(["Kiểm định", "Đăng ký xe"]), "Xe thiếu Kiểm định, Đăng ký xe — đã cho chạy");
  assert.equal(NUT_CHO_CHAY_THIEU_GIAY, "Cho chạy dù thiếu giấy tờ");
});

test("kiemChoChayThieu: ca qua", () => {
  assert.deepEqual(kiemChoChayThieu(goc), { ok: true, ghiChu: null }, "Quản trị, loại mềm, có lý do");
  assert.deepEqual(kiemChoChayThieu({ ...goc, yeuCau: ["INSPECTION"], coOToanQuyen: true, lyDo: null, lyDoHopLe: false }), { ok: true, ghiChu: null }, "Toàn quyền không lý do");
  assert.deepEqual(kiemChoChayThieu({ ...goc, yeuCau: ["REGISTRATION", "INSPECTION"], coOToanQuyen: true }), { ok: true, ghiChu: null });
  assert.deepEqual(kiemChoChayThieu({ ...goc, lyDo: "THIEU_GIAY_KHAC", ghiChu: "  đang chờ tem kiểm định  " }), { ok: true, ghiChu: "đang chờ tem kiểm định" }, "«Khác» + ghi chú ≥ 10 ký tự sau trim, trim lại");
  assert.deepEqual(kiemChoChayThieu({ ...goc, coOToanQuyen: true, lyDo: "THIEU_GIAY_KHAC", ghiChu: "0123456789" }), { ok: true, ghiChu: "0123456789" }, "đúng 10 ký tự");
});

test("kiemChoChayThieu: ghi chú chỉ khoảng trắng → null (không lỗi)", () => {
  assert.deepEqual(kiemChoChayThieu({ ...goc, ghiChu: "   \t " }), { ok: true, ghiChu: null });
  assert.deepEqual(kiemChoChayThieu({ ...goc, coOToanQuyen: true, lyDo: null, lyDoHopLe: false, ghiChu: "" }), { ok: true, ghiChu: null });
});

test("kiemChoChayThieu: từng mã lỗi", () => {
  const ma = (v: Parameters<typeof kiemChoChayThieu>[0]) => {
    const r = kiemChoChayThieu(v);
    return r.ok ? "ok" : r.ma;
  };
  assert.equal(ma({ ...goc, yeuCau: [] }), "trong");
  assert.equal(ma({ ...goc, yeuCau: ["CONTRACT_BADGE"] }), "giay_to_khong_thieu", "loại không thiếu");
  assert.equal(ma({ ...goc, yeuCau: ["REGISTRATION", "TRIP_MONITOR"] }), "giay_to_khong_thieu", "một loại trong danh sách không thiếu");
  assert.equal(ma({ ...goc, yeuCau: ["INSPECTION"] }), "chi_toan_quyen", "Quản trị + Kiểm định");
  assert.equal(ma({ ...goc, thieu: thieu("TPL_INSURANCE"), yeuCau: ["TPL_INSURANCE"] }), "chi_toan_quyen", "Quản trị + Bảo hiểm");
  assert.equal(ma({ ...goc, yeuCau: ["REGISTRATION", "INSPECTION"] }), "chi_toan_quyen", "lẫn loại chỉ Toàn quyền → từ chối cả lô");
  assert.equal(ma({ ...goc, lyDo: null, lyDoHopLe: false }), "thieu_ly_do", "Quản trị không lý do");
  assert.equal(ma({ ...goc, lyDoHopLe: false }), "ly_do_sai_nhom");
  assert.equal(ma({ ...goc, coOToanQuyen: true, lyDoHopLe: false }), "ly_do_sai_nhom", "Toàn quyền chọn lý do sai nhóm vẫn lỗi");
  assert.equal(ma({ ...goc, lyDo: "THIEU_GIAY_KHAC" }), "thieu_ghi_chu", "«Khác» không ghi chú");
  assert.equal(ma({ ...goc, lyDo: "THIEU_GIAY_KHAC", ghiChu: "   " }), "thieu_ghi_chu", "«Khác» ghi chú chỉ khoảng trắng");
  assert.equal(ma({ ...goc, lyDo: "THIEU_GIAY_KHAC", ghiChu: "  ngắn   " }), "thieu_ghi_chu", "«Khác» ghi chú < 10 ký tự sau trim");
  assert.equal(ma({ ...goc, coOToanQuyen: true, lyDo: "THIEU_GIAY_KHAC", ghiChu: null }), "thieu_ghi_chu", "Toàn quyền đã chọn «Khác» vẫn cần ghi chú");
  assert.equal(ma({ ...goc, ghiChu: "x".repeat(201) }), "thieu_ghi_chu", "ghi chú quá dài (CHECK CSDL 200)");
});

test("gomLoChoChayThieu (ADR-0184 P12): mỗi lô (cmd) một mục — tên loại bỏ trùng giữ thứ tự, lý do và ghi chú của lô, null giữ nguyên", () => {
  assert.deepEqual(gomLoChoChayThieu([]), []);
  assert.deepEqual(
    gomLoChoChayThieu([
      { cmdId: "a", tenLoai: "Đăng ký xe", lyDoNhan: "Giấy đang gia hạn", ghiChu: "chờ cấp lại" },
      { cmdId: "a", tenLoai: "Bảo hiểm", lyDoNhan: "Giấy đang gia hạn", ghiChu: "chờ cấp lại" },
      { cmdId: "a", tenLoai: "Bảo hiểm", lyDoNhan: "Giấy đang gia hạn", ghiChu: "chờ cấp lại" },
      { cmdId: "b", tenLoai: "Kiểm định", lyDoNhan: null, ghiChu: null },
    ]),
    [{ ten: ["Đăng ký xe", "Bảo hiểm"], lyDo: "Giấy đang gia hạn", ghiChu: "chờ cấp lại" }, { ten: ["Kiểm định"], lyDo: null, ghiChu: null }],
  );
});
