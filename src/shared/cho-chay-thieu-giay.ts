// LUẬT THUẦN «Cho chạy dù thiếu giấy tờ» (ADR-0184) — MỘT nguồn cho máy chủ (lệnh cho phép, cổng xuất bến) và màn hình (nhãn vàng, hộp chọn). Không I/O.
// Quyền (chủ chọn D1=b, D2): Kiểm định và Bảo hiểm trách nhiệm dân sự chỉ Toàn quyền; bốn loại còn lại Quản trị hoặc Toàn quyền. Quản trị bắt buộc chọn lý do,
// Toàn quyền được bỏ trống. Giấy tờ của TÀI XẾ không nằm trong luật này (vẫn chặn cứng).
// Lớp CSDL giữ cùng luật: migrations/0147_cho_chay_thieu_giay.sql (các trigger waiver_*).
import type { GiayToXeThieu } from "./dieu-phoi-kieu.ts";

/** Loại giấy tờ xe CHỈ Toàn quyền được cho chạy thiếu (Kiểm định, Bảo hiểm trách nhiệm dân sự). Khớp trigger `waiver_toan_quyen_only` (0147). */
export const GIAY_TO_XE_CHI_TOAN_QUYEN = ["INSPECTION", "TPL_INSURANCE"] as const;
export const laGiayToChiToanQuyen = (code: string): boolean => (GIAY_TO_XE_CHI_TOAN_QUYEN as readonly string[]).includes(code);

/** Nhóm lý do (`vc_reason.reason_group`) của việc cho chạy thiếu giấy tờ. */
export const NHOM_LY_DO_THIEU_GIAY = "CHO_CHAY_THIEU_GIAY";
/** Mã lý do «Khác» — chọn thì phải gõ ghi chú. */
export const MA_LY_DO_THIEU_GIAY_KHAC = "THIEU_GIAY_KHAC";
/** Chữ nút và tên nhóm lý do (chủ chọn 2026-11-07; mỗi khái niệm một tên). */
export const NUT_CHO_CHAY_THIEU_GIAY = "Cho chạy dù thiếu giấy tờ";
/** Ghi chú tự do dài 10–200 ký tự sau khi bỏ khoảng trắng hai đầu (khớp CHECK của `vc_trip_departure_waiver.note`). */
export const GHI_CHU_TOI_THIEU = 10;
export const GHI_CHU_TOI_DA = 200;

/** Nhãn vàng — MỘT hàm dựng chữ cho mọi màn: «Xe thiếu A, B — đã cho chạy». Không số giấy tờ. */
export function nhanChoChayThieu(tenLoai: readonly string[]): string {
  return `Xe thiếu ${tenLoai.join(", ")} — đã cho chạy`;
}

export type MaLoiChoChayThieu = "giay_to_khong_thieu" | "chi_toan_quyen" | "thieu_ly_do" | "ly_do_sai_nhom" | "thieu_ghi_chu" | "trong";

/**
 * Kiểm yêu cầu «Cho chạy dù thiếu giấy tờ». `thieu` = loại xe đang thiếu (tính bằng `giayToXeConThieu` lúc lệnh chạy); `yeuCau` = các loại người dùng chọn;
 * `coOToanQuyen` = có ô `trip.override.giay_to_cung`; `lyDoHopLe` = lý do (nếu có) thuộc nhóm `CHO_CHAY_THIEU_GIAY` (máy chủ tra danh mục). Ghi chú chỉ khoảng
 * trắng → null. Thứ tự mã lỗi: trống → không thiếu → chỉ Toàn quyền → lý do → ghi chú.
 */
export function kiemChoChayThieu(v: {
  thieu: readonly GiayToXeThieu[];
  yeuCau: readonly string[];
  coOToanQuyen: boolean;
  lyDo: string | null;
  lyDoHopLe: boolean;
  ghiChu: string | null;
}): { ok: true; ghiChu: string | null } | { ok: false; ma: MaLoiChoChayThieu } {
  if (v.yeuCau.length === 0) return { ok: false, ma: "trong" };
  const dangThieu = new Set(v.thieu.map((t) => t.documentTypeCode));
  if (v.yeuCau.some((c) => !dangThieu.has(c))) return { ok: false, ma: "giay_to_khong_thieu" };
  if (!v.coOToanQuyen && v.yeuCau.some(laGiayToChiToanQuyen)) return { ok: false, ma: "chi_toan_quyen" };
  if (v.lyDo === null) {
    if (!v.coOToanQuyen) return { ok: false, ma: "thieu_ly_do" };
  } else if (!v.lyDoHopLe) return { ok: false, ma: "ly_do_sai_nhom" };
  const ghiChu = v.ghiChu === null || v.ghiChu.trim() === "" ? null : v.ghiChu.trim();
  if (v.lyDo === MA_LY_DO_THIEU_GIAY_KHAC && (ghiChu === null || ghiChu.length < GHI_CHU_TOI_THIEU)) return { ok: false, ma: "thieu_ghi_chu" };
  // Ghi chú đã gõ thì phải vừa khuôn CSDL (10–200) — báo sớm bằng câu tiếng Việt thay vì để trigger/CHECK từ chối.
  if (ghiChu !== null && (ghiChu.length < GHI_CHU_TOI_THIEU || ghiChu.length > GHI_CHU_TOI_DA)) return { ok: false, ma: "thieu_ghi_chu" };
  return { ok: true, ghiChu };
}
