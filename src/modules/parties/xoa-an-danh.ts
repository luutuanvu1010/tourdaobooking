// Luật THUẦN ẩn danh hoá theo phiếu yêu cầu xoá (ADR-0126 đ2, đ3, đ6; lát H-5 Gói 2, việc 2) — module parties. Không I/O.
// Dấu ẩn danh khớp TỪNG CHỮ với migration *_xoa_an_danh.sql (bài xoa-an-danh.test.ts đối chiếu). Mọi số ngày (hạn xử lý, thời hạn giữ) CHỈ đến từ dữ liệu chính sách
// (cột erasure_days / session_retention_days) — mô-đun này KHÔNG có con số thời hạn nào.
import { canManageAccount } from "../../shared/roles.ts";
import type { PermissionCode } from "../../shared/permissions.ts";
import { PHAN_GIU_LAI } from "../../shared/xoa-an-danh-hien-thi.ts";

export const DAU_TEN = "Người đã xoá dữ liệu";
export const DAU_LIEN_HE = { value: "Đã xoá", normalized: "XOA" } as const;
export const DAU_NGAY_SINH_PHIEU = "1900-01-01";
export const DAU_DIA_CHI_PHIEU = "Đã xoá";
export const LY_DO_XOA_TEP_PHIEU = "PHIEU_XOA";
export const LY_DO_XOA_TEP_HET_GIU = "HET_LY_DO_GIU";

/** Dấu số giấy tờ: duy nhất theo DÒNG (không vướng trigger một CCCD một người), KHÔNG suy ra được từ số thật. Khớp `'XOA' || upper(replace(id, '-', ''))` của trigger. */
export const dauSoGiayTo = (id: string): string => "XOA" + id.replace(/-/g, "").toUpperCase();

export type LyDoKhongGuiXoa = "khong_ho_so" | "khong_ca_nhan" | "cong_ty_chu" | "dang_cho";
/** Gửi phiếu xoá KHÔNG xét đồng ý chính sách (quyền xoá không phụ thuộc đồng ý — Review Focus 3). */
export function xetGuiPhieuXoa(v: { coHoSo: boolean; laCaNhan: boolean; laCongTyChu: boolean; coPhieuCho: boolean }): LyDoKhongGuiXoa | null {
  if (!v.coHoSo) return "khong_ho_so";
  if (!v.laCaNhan) return "khong_ca_nhan";
  if (v.laCongTyChu) return "cong_ty_chu";
  if (v.coPhieuCho) return "dang_cho";
  return null;
}

export type LyDoKhongXuLy = "nguoi_gui" | "cap_bac" | "khong_tai_khoan" | "cong_ty_chu" | "dang_ban";
export interface ViecDangMo { doi: number; phuTrachDon: number; laiChuyen: number; toLaiChuyen: number; chuXeChuyen: number; soXe: number }
/** Thứ tự: người gửi → công ty chủ → (không Toàn quyền) chủ phiếu mất tài khoản → (không Toàn quyền) cấp bậc → đang bận (Toàn quyền cũng chịu). */
export function xetXuLyPhieuXoa(v: {
  nguoi: { id: string; permissions: readonly PermissionCode[] };
  phieu: { createdBy: string };
  chuPhieu: { id: string; permissions: readonly PermissionCode[] } | null;
  laCongTyChu: boolean;
  viec: ViecDangMo;
}): LyDoKhongXuLy | null {
  if (v.nguoi.id === v.phieu.createdBy) return "nguoi_gui";
  if (v.laCongTyChu) return "cong_ty_chu";
  const laToanQuyen = v.nguoi.permissions.includes("SUPER_ADMIN");
  if (!laToanQuyen) {
    if (v.chuPhieu === null) return "khong_tai_khoan";
    if (!canManageAccount(v.nguoi.permissions, v.chuPhieu.permissions)) return "cap_bac";
  }
  const { doi, phuTrachDon, laiChuyen, toLaiChuyen, chuXeChuyen, soXe } = v.viec;
  if (doi + phuTrachDon + laiChuyen + toLaiChuyen + chuXeChuyen + soXe > 0) return "dang_ban";
  return null;
}

/** Mã lỗi 409 của route Thực hiện theo lý do; `cap_bac` / `khong_tai_khoan` là 404 (phiếu như không tồn tại với người đó) nên không có mã. */
export const MA_LOI_XU_LY = { nguoi_gui: "erasure_self", cong_ty_chu: "owner_company_protected", dang_ban: "erasure_busy" } as const;
/** Câu tiếng Việt cho từng lý do (dùng ở hàng chờ, xem trước và lỗi 409). */
export const NHAN_LY_DO_KHONG_XU_LY: Readonly<Record<LyDoKhongXuLy, string>> = {
  nguoi_gui: "Bạn là người gửi yêu cầu này — cần một quản trị viên khác xử lý.",
  cap_bac: "Không tìm thấy yêu cầu này.",
  khong_tai_khoan: "Không tìm thấy yêu cầu này.",
  cong_ty_chu: "Hồ sơ công ty chủ không xoá được.",
  dang_ban: "Người này còn việc đang mở (đơn chưa giao, chuyến, xe hoặc phụ trách đơn) — chưa xoá được.",
};

/** Giữ tên (R8): quyền nào ngoài PARTNER (tên là nhãn trên đơn / lệnh / nhật ký — ngoại lệ 5.20), hoặc đơn đã giao / đã huỷ, hoặc dòng nợ. */
export function giuTen(v: { permissions: readonly PermissionCode[]; don: { giuDaGiao: number; giuDaHuy: number }; soDongNo: number }): boolean {
  return v.permissions.some((p) => p !== "PARTNER") || v.don.giuDaGiao + v.don.giuDaHuy > 0 || v.soDongNo > 0;
}

/** Mã phần giữ lại theo thứ tự PHAN_GIU_LAI; hai mã động theo hồ sơ. */
export function phanGiuLai(v: { giuTen: boolean; coTaiKhoan: boolean }): string[] {
  return PHAN_GIU_LAI.map((x) => x.ma).filter((m) => (m === "TEN_HO_SO" ? v.giuTen : m === "SDT_DANG_NHAP" ? v.coTaiKhoan : true));
}

export type TrangThaiHan = "chua_co_han" | "con_han" | "qua_han";
/** Hạn rỗng (chính sách chưa có số) ⇒ không cảnh báo. So chuỗi ISO UTC; đúng hạn đã là quá hạn. */
export function trangThaiHan(dueAt: string | null, nowIso: string): TrangThaiHan {
  if (dueAt === null) return "chua_co_han";
  return nowIso < dueAt ? "con_han" : "qua_han";
}

export type LyDoXoaAnh = "HET_HAN" | "DA_GIA_HAN" | "DA_HUY" | "DA_AN_DANH" | "HET_QUAN_HE" | "PHIEU_DA_XU_LY" | "KHONG_NOI";
/** Dữ kiện MỘT dòng nối tệp → đối tượng (đọc từ CSDL). Giấy tờ (người hoặc tổ chức): đã huỷ / đã ẩn danh / đã có dòng gia hạn / ngày hết hạn / chủ còn vai mở.
 *  Giấy tờ tổ chức không có cột ẩn danh (R4) nên `daAnDanh` luôn false. Phiếu tự khai: trạng thái. */
export type LienKetXetAnh =
  | { loai: "PERSON_DOCUMENT" | "ORG_DOCUMENT"; daHuy: boolean; daAnDanh: boolean; daGiaHan: boolean; hetHanNgay: string | null; coVaiMo: boolean }
  | { loai: "SELF_SUBMISSION"; trangThaiPhieu: string };

const THU_TU_LY_DO: readonly LyDoXoaAnh[] = ["HET_QUAN_HE", "DA_AN_DANH", "DA_HUY", "DA_GIA_HAN", "HET_HAN", "PHIEU_DA_XU_LY", "KHONG_NOI"];

function lyDoCuaLienKet(l: LienKetXetAnh, homNay: string): LyDoXoaAnh[] {
  if (l.loai === "SELF_SUBMISSION") return l.trangThaiPhieu === "CHO_XAC_MINH" ? [] : ["PHIEU_DA_XU_LY"];
  const ds: LyDoXoaAnh[] = [];
  if (!l.coVaiMo) ds.push("HET_QUAN_HE");
  if (l.daAnDanh) ds.push("DA_AN_DANH");
  if (l.daHuy) ds.push("DA_HUY");
  if (l.daGiaHan) ds.push("DA_GIA_HAN");
  if (l.hetHanNgay !== null && l.hetHanNgay < homNay) ds.push("HET_HAN");
  return ds;
}

/** Còn lý do giữ (một dòng nối đủ giữ) ⇒ null. Hết ⇒ mã lý do ưu tiên đầu tiên trong số các dòng nối; không dòng nối ⇒ KHONG_NOI.
 *  CÙNG bảng ca với hình chiếu SQL `listAnhHetLyDoGiu` (bài xoa-an-danh-lenh.test.ts ca (8)). `homNay` = ngày VN (vnToday), KHÔNG date('now'). */
export function lyDoXoaAnh(lienKet: readonly LienKetXetAnh[], homNay: string): LyDoXoaAnh | null {
  if (lienKet.length === 0) return "KHONG_NOI";
  const tatCa = lienKet.map((l) => lyDoCuaLienKet(l, homNay));
  if (tatCa.some((ds) => ds.length === 0)) return null;
  const co = new Set(tatCa.flat());
  return THU_TU_LY_DO.find((m) => co.has(m)) ?? "KHONG_NOI";
}
