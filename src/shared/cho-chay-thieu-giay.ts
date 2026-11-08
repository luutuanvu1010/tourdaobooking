// LUẬT THUẦN «Cho chạy dù thiếu giấy tờ» (ADR-0184) — MỘT nguồn cho máy chủ (lệnh cho phép, cổng xuất bến) và màn hình (nhãn vàng, hộp chọn). Không I/O.
// Quyền (chủ chọn D1=b, D2): Kiểm định và Bảo hiểm trách nhiệm dân sự chỉ Toàn quyền; bốn loại còn lại Quản trị hoặc Toàn quyền. Quản trị bắt buộc chọn lý do,
// Toàn quyền được bỏ trống. Giấy tờ của TÀI XẾ không nằm trong luật này (vẫn chặn cứng).
// Lớp CSDL giữ cùng luật: migrations/0147_cho_chay_thieu_giay.sql (các trigger waiver_*).
import type { GiayToXeThieu } from "./dieu-phoi-kieu.ts";
import { can, type PermissionHolder } from "./permissions.ts";

/** Loại giấy tờ xe CHỈ Toàn quyền được cho chạy thiếu (Kiểm định, Bảo hiểm trách nhiệm dân sự). Khớp trigger `waiver_toan_quyen_only` (0147). */
export const GIAY_TO_XE_CHI_TOAN_QUYEN = ["INSPECTION", "TPL_INSURANCE"] as const;
export const laGiayToChiToanQuyen = (code: string): boolean => (GIAY_TO_XE_CHI_TOAN_QUYEN as readonly string[]).includes(code);

/** Ai thấy số chuyến «đã cho chạy dù thiếu giấy tờ» ở Trang chủ: người giữ ô `trip.override` (Quản trị, Toàn quyền) — cùng ô với nút «Cho chạy dù thiếu giấy tờ». Giao diện chỉ ẩn / hiện; route đếm ở van-chuyen hỏi thẳng cùng ô (nới có tên N3 ở `lop-vuot.test.ts`). */
export const thaySoChoChayThieu = (who: PermissionHolder): boolean => can(who, "trip.override");

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

/**
 * MỘT thứ tự duy nhất cho mọi chỗ dựng danh sách / tên loại giấy xe cho người xem (nhãn vàng, hộp «Cho chạy dù thiếu giấy tờ», mục lý do + ghi chú, nhật ký, tin):
 * theo `sort_order` của danh mục loại giấy (`thuTu`: mã loại → thứ hạng), bằng nhau hoặc loại lạ thì theo mã loại. Chỉ sắp ở tầng dựng DTO / chữ — KHÔNG đổi thứ tự
 * câu đọc điều kiện xuất bến (cổng và bản chụp dùng thứ tự đó). Trả mảng mới.
 */
export function sapTheoThuTuLoai<T>(ds: readonly T[], maLoai: (x: T) => string, thuTu: ReadonlyMap<string, number>): T[] {
  const hang = (x: T): number => thuTu.get(maLoai(x)) ?? Number.MAX_SAFE_INTEGER;
  return [...ds].sort((a, b) => hang(a) - hang(b) || (maLoai(a) < maLoai(b) ? -1 : maLoai(a) > maLoai(b) ? 1 : 0));
}
/** Một dòng cho phép của chuyến, đủ để gom lô (câu `cho_phep_thieu_cua_chuyen`). `thuTu` = thứ hạng loại giấy theo danh mục (xem `sapTheoThuTuLoai`). */
export interface DongChoPhepDoc { cmdId: string; tenLoai: string; thuTu: number; lyDoNhan: string | null; ghiChu: string | null }
/**
 * ADR-0184 (P12): gom các dòng cho phép ĐANG TẠO NHÃN VÀNG thành MỖI LÔ (`cmd_id`) một mục — tên các loại giấy (bỏ trùng, giữ thứ tự), nhãn lý do, ghi chú (null = trống).
 * Việc chọn dòng nào đang áp (chuyến chưa chạy: chưa dùng, đúng xe, loại còn thiếu; đã chạy: dòng đã dùng ở bản chụp cuối) do nơi gọi làm; hàm này thuần.
 */
export function gomLoChoChayThieu(dong: readonly DongChoPhepDoc[]): { ten: string[]; lyDo: string | null; ghiChu: string | null }[] {
  const lo = new Map<string, { loai: { ten: string; thuTu: number }[]; lyDo: string | null; ghiChu: string | null }>();
  for (const d of dong) {
    const cu = lo.get(d.cmdId);
    if (cu) {
      if (!cu.loai.some((x) => x.ten === d.tenLoai)) cu.loai.push({ ten: d.tenLoai, thuTu: d.thuTu });
    } else lo.set(d.cmdId, { loai: [{ ten: d.tenLoai, thuTu: d.thuTu }], lyDo: d.lyDoNhan, ghiChu: d.ghiChu });
  }
  return [...lo.values()].map((l) => ({ ten: [...l.loai].sort((a, b) => a.thuTu - b.thuTu || (a.ten < b.ten ? -1 : a.ten > b.ten ? 1 : 0)).map((x) => x.ten), lyDo: l.lyDo, ghiChu: l.ghiChu }));
}
