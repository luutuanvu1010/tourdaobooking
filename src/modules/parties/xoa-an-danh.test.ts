// Bài luật thuần ẩn danh hoá (ADR-0126; lát H-5 Gói 2, việc 2). Thuần, không I/O. Dấu ẩn danh khớp TỪNG CHỮ với migration *_xoa_an_danh.sql.
// Mọi con số thời hạn nằm ở dữ liệu chính sách — bài này không gieo số ngày nào.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import {
  dauSoGiayTo, DAU_DIA_CHI_PHIEU, DAU_LIEN_HE, DAU_NGAY_SINH_PHIEU, DAU_TEN, giuTen, LY_DO_XOA_TEP_HET_GIU, LY_DO_XOA_TEP_PHIEU, lyDoXoaAnh, phanGiuLai,
  MA_LOI_XU_LY, NHAN_LY_DO_KHONG_XU_LY, trangThaiHan, xetGuiPhieuXoa, xetXuLyPhieuXoa, type LienKetXetAnh,
} from "./xoa-an-danh.ts";

const VIEC0 = { doi: 0, phuTrachDon: 0, laiChuyen: 0, toLaiChuyen: 0, chuXeChuyen: 0, soXe: 0 };

test("dấu số giấy tờ khớp TỪNG CHỮ với trigger của migration *_xoa_an_danh.sql; dài ≤ 40 với mã UUID", () => {
  assert.equal(dauSoGiayTo("0b1e5c2a-0000-4000-8000-00000000000a"), "XOA0B1E5C2A000040008000" + "00000000000A");
  assert.ok(dauSoGiayTo("0b1e5c2a-0000-4000-8000-00000000000a").length <= 40);
  const mig = new URL("../../../migrations/", import.meta.url);
  const sql = readFileSync(new URL(readdirSync(mig).find((f) => f.endsWith("_xoa_an_danh.sql"))!, mig), "utf8");
  assert.match(sql, /'XOA' \|\| upper\(replace\(OLD\.id, '-', ''\)\)/);
  assert.ok(sql.includes(`'${DAU_NGAY_SINH_PHIEU}'`) && sql.includes(`'${DAU_DIA_CHI_PHIEU}'`));
});

test("các dấu khác khớp luật chốt: liên hệ, tên, mã lý do xoá tệp", () => {
  assert.deepEqual({ ...DAU_LIEN_HE }, { value: "Đã xoá", normalized: "XOA" });
  assert.equal(DAU_TEN, "Người đã xoá dữ liệu");
  assert.equal(LY_DO_XOA_TEP_PHIEU, "PHIEU_XOA");
  assert.equal(LY_DO_XOA_TEP_HET_GIU, "HET_LY_DO_GIU");
  for (const m of [LY_DO_XOA_TEP_PHIEU, LY_DO_XOA_TEP_HET_GIU]) assert.match(m, /^[A-Z0-9_]{2,40}$/, "khớp CHECK purge_reason của 0104");
});

test("xét gửi: không hồ sơ / tổ chức / công ty chủ / đang có phiếu chờ → lý do; cá nhân hợp lệ → null (KHÔNG xét đồng ý chính sách)", () => {
  assert.equal(xetGuiPhieuXoa({ coHoSo: false, laCaNhan: false, laCongTyChu: false, coPhieuCho: false }), "khong_ho_so");
  assert.equal(xetGuiPhieuXoa({ coHoSo: true, laCaNhan: false, laCongTyChu: false, coPhieuCho: false }), "khong_ca_nhan");
  assert.equal(xetGuiPhieuXoa({ coHoSo: true, laCaNhan: true, laCongTyChu: true, coPhieuCho: false }), "cong_ty_chu");
  assert.equal(xetGuiPhieuXoa({ coHoSo: true, laCaNhan: true, laCongTyChu: false, coPhieuCho: true }), "dang_cho");
  assert.equal(xetGuiPhieuXoa({ coHoSo: true, laCaNhan: true, laCongTyChu: false, coPhieuCho: false }), null);
});

test("xét xử lý: người gửi; cấp bậc (Quản trị không xử lý phiếu của Quản trị / Nhân sự / Toàn quyền); chủ phiếu mất tài khoản → chỉ Toàn quyền; công ty chủ; đang bận", () => {
  const admin = { id: "a", permissions: ["ADMIN"] as const };
  const sup = { id: "s", permissions: ["SUPER_ADMIN"] as const };
  const p = { createdBy: "u" };
  assert.equal(xetXuLyPhieuXoa({ nguoi: { id: "u", permissions: ["SUPER_ADMIN"] }, phieu: p, chuPhieu: { id: "u", permissions: ["SUPER_ADMIN"] }, laCongTyChu: false, viec: VIEC0 }), "nguoi_gui");
  assert.equal(xetXuLyPhieuXoa({ nguoi: admin, phieu: p, chuPhieu: { id: "u", permissions: ["HR"] }, laCongTyChu: false, viec: VIEC0 }), "cap_bac");
  assert.equal(xetXuLyPhieuXoa({ nguoi: admin, phieu: p, chuPhieu: null, laCongTyChu: false, viec: VIEC0 }), "khong_tai_khoan");
  assert.equal(xetXuLyPhieuXoa({ nguoi: sup, phieu: p, chuPhieu: null, laCongTyChu: false, viec: VIEC0 }), null);
  assert.equal(xetXuLyPhieuXoa({ nguoi: sup, phieu: p, chuPhieu: { id: "u", permissions: ["PARTNER"] }, laCongTyChu: true, viec: VIEC0 }), "cong_ty_chu");
  assert.equal(xetXuLyPhieuXoa({ nguoi: admin, phieu: p, chuPhieu: { id: "u", permissions: ["PARTNER"] }, laCongTyChu: false, viec: { ...VIEC0, laiChuyen: 1 } }), "dang_ban");
  assert.equal(xetXuLyPhieuXoa({ nguoi: admin, phieu: p, chuPhieu: { id: "u", permissions: ["PARTNER"] }, laCongTyChu: false, viec: { ...VIEC0, doi: 2 } }), "dang_ban");
  assert.equal(xetXuLyPhieuXoa({ nguoi: admin, phieu: p, chuPhieu: { id: "u", permissions: ["DRIVER_PARTNER"] }, laCongTyChu: false, viec: VIEC0 }), null);
  // Toàn quyền cũng chịu "đang bận" (brief Step 3)
  assert.equal(xetXuLyPhieuXoa({ nguoi: sup, phieu: p, chuPhieu: null, laCongTyChu: false, viec: { ...VIEC0, soXe: 1 } }), "dang_ban");
  // thứ tự: người gửi thắng công ty chủ; công ty chủ thắng cấp bậc và "không tài khoản"
  assert.equal(xetXuLyPhieuXoa({ nguoi: { id: "u", permissions: ["ADMIN"] }, phieu: p, chuPhieu: { id: "u", permissions: ["HR"] }, laCongTyChu: true, viec: VIEC0 }), "nguoi_gui");
  assert.equal(xetXuLyPhieuXoa({ nguoi: admin, phieu: p, chuPhieu: { id: "u", permissions: ["HR"] }, laCongTyChu: true, viec: VIEC0 }), "cong_ty_chu");
  assert.equal(xetXuLyPhieuXoa({ nguoi: admin, phieu: p, chuPhieu: null, laCongTyChu: true, viec: VIEC0 }), "cong_ty_chu");
});

test("giữ tên (R8): mọi quyền ngoài PARTNER giữ; Đối tác có đơn đã giao / đã huỷ hoặc dòng nợ giữ; Đối tác trắng thì thay", () => {
  const don0 = { giuDaGiao: 0, giuDaHuy: 0 };
  assert.equal(giuTen({ permissions: ["SALES"], don: don0, soDongNo: 0 }), true);
  assert.equal(giuTen({ permissions: ["DRIVER_PARTNER"], don: don0, soDongNo: 0 }), true);
  assert.equal(giuTen({ permissions: ["PARTNER"], don: { giuDaGiao: 1, giuDaHuy: 0 }, soDongNo: 0 }), true);
  assert.equal(giuTen({ permissions: ["PARTNER"], don: { giuDaGiao: 0, giuDaHuy: 1 }, soDongNo: 0 }), true);
  assert.equal(giuTen({ permissions: ["PARTNER"], don: don0, soDongNo: 3 }), true);
  assert.equal(giuTen({ permissions: ["PARTNER"], don: don0, soDongNo: 0 }), false);
  assert.equal(giuTen({ permissions: [], don: don0, soDongNo: 0 }), false, "hồ sơ không tài khoản, không đơn, không nợ thì thay tên");
});

test("phần giữ lại: luôn có danh sách cố định; TEN_HO_SO chỉ khi giữ tên; SDT_DANG_NHAP khi có tài khoản (đ9)", () => {
  assert.ok(phanGiuLai({ giuTen: false, coTaiKhoan: true }).includes("SDT_DANG_NHAP"));
  assert.ok(!phanGiuLai({ giuTen: false, coTaiKhoan: true }).includes("TEN_HO_SO"));
  assert.ok(phanGiuLai({ giuTen: true, coTaiKhoan: true }).includes("TEN_HO_SO"));
  assert.ok(!phanGiuLai({ giuTen: true, coTaiKhoan: false }).includes("SDT_DANG_NHAP"));
  for (const m of ["DON_BAN_CHUP", "HANH_KHACH", "LAN_THU", "SO_TIEN", "YEU_CAU_HOA_DON", "HO_TEN_NHAT_KY", "NHAT_KY_CU_SDT", "PHIEN_DA_BO_IP", "CHU_TU_DO"]) {
    assert.ok(phanGiuLai({ giuTen: false, coTaiKhoan: false }).includes(m), m);
  }
  assert.match(phanGiuLai({ giuTen: true, coTaiKhoan: true }).join(","), /^[A-Z0-9_,]+$/);
  assert.ok(phanGiuLai({ giuTen: true, coTaiKhoan: true }).join(",").length <= 400, "vừa CHECK retained_codes của 0108");
});

test("hạn: rỗng → chưa có hạn (không cảnh báo); trước hạn → còn hạn; đúng hạn và sau → quá hạn", () => {
  assert.equal(trangThaiHan(null, "2026-11-01T00:00:00.000Z"), "chua_co_han");
  assert.equal(trangThaiHan("2026-11-01T00:00:00.000Z", "2026-10-31T23:59:59.999Z"), "con_han");
  assert.equal(trangThaiHan("2026-11-01T00:00:00.000Z", "2026-11-01T00:00:00.000Z"), "qua_han");
});

test("lý do xoá ảnh: còn lý do giữ → null; hết thì mã theo thứ tự ưu tiên HET_QUAN_HE, DA_AN_DANH, DA_HUY, DA_GIA_HAN, HET_HAN, PHIEU_DA_XU_LY, KHONG_NOI", () => {
  const HN = "2026-10-17";
  const sach: LienKetXetAnh = { loai: "PERSON_DOCUMENT", daHuy: false, daAnDanh: false, daGiaHan: false, hetHanNgay: null, coVaiMo: true };
  assert.equal(lyDoXoaAnh([], HN), "KHONG_NOI");
  assert.equal(lyDoXoaAnh([sach], HN), null);
  assert.equal(lyDoXoaAnh([{ ...sach, hetHanNgay: HN }], HN), null, "đúng ngày hết hạn vẫn giữ (>=)");
  assert.equal(lyDoXoaAnh([{ ...sach, hetHanNgay: "2026-10-16" }], HN), "HET_HAN");
  assert.equal(lyDoXoaAnh([{ ...sach, daGiaHan: true }], HN), "DA_GIA_HAN");
  assert.equal(lyDoXoaAnh([{ ...sach, daHuy: true }], HN), "DA_HUY");
  assert.equal(lyDoXoaAnh([{ ...sach, daAnDanh: true }], HN), "DA_AN_DANH");
  assert.equal(lyDoXoaAnh([{ ...sach, coVaiMo: false }], HN), "HET_QUAN_HE");
  assert.equal(lyDoXoaAnh([{ ...sach, coVaiMo: false, hetHanNgay: "2020-01-01" }], HN), "HET_QUAN_HE", "HET_QUAN_HE đứng trước HET_HAN");
  assert.equal(lyDoXoaAnh([{ ...sach, daGiaHan: true, hetHanNgay: "2020-01-01" }], HN), "DA_GIA_HAN", "DA_GIA_HAN đứng trước HET_HAN");
  assert.equal(lyDoXoaAnh([{ loai: "SELF_SUBMISSION", trangThaiPhieu: "CHO_XAC_MINH" }], HN), null);
  assert.equal(lyDoXoaAnh([{ loai: "SELF_SUBMISSION", trangThaiPhieu: "TU_CHOI" }], HN), "PHIEU_DA_XU_LY");
  assert.equal(lyDoXoaAnh([{ loai: "SELF_SUBMISSION", trangThaiPhieu: "RUT" }], HN), "PHIEU_DA_XU_LY");
  // một lý do giữ ở BẤT KỲ dòng nối nào đủ giữ ảnh
  assert.equal(lyDoXoaAnh([{ ...sach, daHuy: true }, sach], HN), null);
  assert.equal(lyDoXoaAnh([{ ...sach, daHuy: true }, { loai: "SELF_SUBMISSION", trangThaiPhieu: "RUT" }], HN), "DA_HUY");
});

test("mã lỗi và câu tiếng Việt cho mọi lý do không xử lý được (route trả 409 hoặc 404, không bao giờ mã thô)", () => {
  assert.deepEqual(MA_LOI_XU_LY, { nguoi_gui: "erasure_self", cong_ty_chu: "owner_company_protected", dang_ban: "erasure_busy" });
  for (const ly of ["nguoi_gui", "cap_bac", "khong_tai_khoan", "cong_ty_chu", "dang_ban"] as const) {
    assert.match(NHAN_LY_DO_KHONG_XU_LY[ly], /[à-ỹ]/, ly);
    assert.doesNotMatch(NHAN_LY_DO_KHONG_XU_LY[ly], /[a-z]+_[a-z]+/, ly);
  }
});
