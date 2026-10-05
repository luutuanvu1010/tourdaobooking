// Lý do huỷ đơn — luật THUẦN dùng chung máy chủ ↔ giao diện (ADR-0089 đ8, X-2; lời chủ 5 Đ-2, lời chủ 6 (a); ADR-0030 điều 2). Danh sách ĐÓNG là hằng
// trong mã (ADR-0030 đ2 — không bảng). Mã lưu ở `ord_cancel_reason.reason_code`, nhóm ở `group_code` (danh sách mở kiểm ở MÃ, không CHECK liệt kê).
// Hàm KHÔNG tự hỏi quyền: route tính cờ `coTheChonCongTy` bằng `can(staff, "order.cancel.classify")` viết tường minh (bài permission-enforcement chỉ đếm
// lời gọi trong src/modules/**) rồi truyền vào; giao diện tính cờ bằng chính `can()` đó.
import { hasLongDigitRun, PHONE_IN_TEXT_MESSAGE } from "./text-guards.ts";

/** Nhóm lý do huỷ: quyết định giữ cọc / hạn 60 ngày (ADR-0089 đ5–đ8). */
export type NhomHuy = "KHACH_HUY" | "CONG_TY_HUY" | "LAP_LAI" | "CHUA_KET_LUAN";
export const NHOM_HUY_NHAN: Record<NhomHuy, string> = {
  KHACH_HUY: "Khách huỷ",
  CONG_TY_HUY: "Công ty huỷ",
  LAP_LAI: "Huỷ để lập lại / trùng đơn",
  CHUA_KET_LUAN: "Chưa kết luận",
};

export interface LyDoHuyMuc {
  ma: string;
  nhan: string;
  nhom: NhomHuy;
  /** Chỉ hiện ở hộp huỷ của văn phòng (route /status); mã HDV và mã gieo đơn cũ không chọn được ở đó. */
  chonDuoc: boolean;
}

/** Danh sách đóng (kế hoạch Đợt 1 Task 3). "Khác" bắt ghi chú, nằm ở nhóm "chưa kết luận" tới khi Quản trị phân loại (đ8). */
export const LY_DO_HUY: readonly LyDoHuyMuc[] = [
  { ma: "KHACH_DOI_Y", nhan: "Khách đổi ý", nhom: "KHACH_HUY", chonDuoc: true },
  { ma: "KHACH_DAT_TRUNG", nhan: "Khách đặt trùng", nhom: "LAP_LAI", chonDuoc: true },
  { ma: "SAI_THONG_TIN", nhan: "Sai thông tin — lập lại đơn", nhom: "LAP_LAI", chonDuoc: true },
  { ma: "THOI_TIET", nhan: "Thời tiết / cấm biển", nhom: "CONG_TY_HUY", chonDuoc: true },
  { ma: "HET_CHO", nhan: "Hết chỗ", nhom: "CONG_TY_HUY", chonDuoc: true },
  { ma: "SU_CO_NCC", nhan: "Sự cố nhà cung cấp", nhom: "CONG_TY_HUY", chonDuoc: true },
  { ma: "LOI_CONG_TY", nhan: "Lỗi công ty", nhom: "CONG_TY_HUY", chonDuoc: true },
  { ma: "OTHER", nhan: "Khác", nhom: "CHUA_KET_LUAN", chonDuoc: true },
  // Lý do của HDV qua route hẹp (ADR-0014 đ11, ADR-0030 đ2) — lời chủ (a): "không liên hệ được khách" = khách huỷ.
  { ma: "KHACH_YEU_CAU", nhan: "Khách yêu cầu huỷ", nhom: "KHACH_HUY", chonDuoc: false },
  { ma: "KHONG_LIEN_HE", nhan: "Không liên hệ được với khách", nhom: "KHACH_HUY", chonDuoc: false },
  // Gieo một lần cho đơn huỷ trước khi có lý do bắt buộc (migration Đợt 1 Phần A).
  { ma: "LEGACY", nhan: "Huỷ trước khi có lý do bắt buộc", nhom: "CHUA_KET_LUAN", chonDuoc: false },
];

export const nhanLyDoHuy = (ma: string): string => LY_DO_HUY.find((l) => l.ma === ma)?.nhan ?? "Khác";
export const nhanNhomHuy = (nhom: string): string => NHOM_HUY_NHAN[nhom as NhomHuy] ?? "Chưa kết luận";
export const laNhomHuy = (v: unknown): v is NhomHuy => typeof v === "string" && v in NHOM_HUY_NHAN;

/** Lựa chọn cho hộp "Huỷ đơn" của văn phòng: nhóm "Công ty huỷ" chỉ khi có cờ (Đ-2). */
export function luaChonLyDo(input: { coTheChonCongTy: boolean }): LyDoHuyMuc[] {
  return LY_DO_HUY.filter((l) => l.chonDuoc && (l.nhom !== "CONG_TY_HUY" || input.coTheChonCongTy));
}

export interface LyDoHuy {
  ma: string;
  nhom: NhomHuy;
  ghiChu: string | null;
}
export type DocLyDo = { ok: true; lyDo: LyDoHuy } | { ok: false; status: 400 | 403; message: string };

export const GHI_CHU_HUY_TOI_DA = 300;

/** Kiểm ghi chú của lý do "Khác": bắt buộc, ≤ 300 ký tự, không dãy số giống SĐT (nhật ký chỉ-thêm không xoá được — chặn hẳn). */
function docGhiChu(raw: unknown): { ok: true; value: string } | { ok: false; message: string } {
  const g = typeof raw === "string" ? raw.trim() : "";
  if (g === "") return { ok: false, message: "Cần ghi rõ lý do khi chọn “Khác”." };
  if (g.length > GHI_CHU_HUY_TOI_DA) return { ok: false, message: `Lý do tối đa ${GHI_CHU_HUY_TOI_DA} ký tự.` };
  if (hasLongDigitRun(g)) return { ok: false, message: PHONE_IN_TEXT_MESSAGE };
  return { ok: true, value: g };
}

/** Thân huỷ của văn phòng `{ lyDo, ghiChu? }` (route `POST /api/orders/:id/status` với `to: "cancelled"`). */
export function docLyDoHuy(body: Record<string, unknown> | null | undefined, input: { coTheChonCongTy: boolean }): DocLyDo {
  const ma = body?.lyDo;
  const muc = LY_DO_HUY.find((l) => l.chonDuoc && l.ma === ma);
  if (!muc) return { ok: false, status: 400, message: "Chọn lý do huỷ đơn." };
  if (muc.nhom === "CONG_TY_HUY" && !input.coTheChonCongTy) {
    return { ok: false, status: 403, message: "Chỉ Quản trị hoặc Toàn quyền chọn được lý do thuộc nhóm “Công ty huỷ”." };
  }
  if (muc.ma !== "OTHER") return { ok: true, lyDo: { ma: muc.ma, nhom: muc.nhom, ghiChu: null } };
  const g = docGhiChu(body?.ghiChu);
  if (!g.ok) return { ok: false, status: 400, message: g.message };
  return { ok: true, lyDo: { ma: "OTHER", nhom: "CHUA_KET_LUAN", ghiChu: g.value } };
}

/** Ánh xạ lý do của HDV (route hẹp `handler-cancel`, mã của `dispatch/rules.ts`) sang mã + nhóm (lời chủ (a)). `note` đã được dispatch kiểm. */
export function lyDoHuyCuaHdv(reason: "not_reachable" | "customer_requested" | "other", note: string | undefined): LyDoHuy {
  if (reason === "customer_requested") return { ma: "KHACH_YEU_CAU", nhom: "KHACH_HUY", ghiChu: null };
  if (reason === "not_reachable") return { ma: "KHONG_LIEN_HE", nhom: "KHACH_HUY", ghiChu: null };
  return { ma: "OTHER", nhom: "CHUA_KET_LUAN", ghiChu: note ?? null };
}

/** Thân phân loại `{ nhom, lyDo }` (route `POST /api/orders/:id/cancel-reason` — chỉ từ "chưa kết luận" sang nhóm khác; lý do bắt buộc). */
export function docPhanLoai(body: Record<string, unknown> | null | undefined): { ok: true; nhom: Exclude<NhomHuy, "CHUA_KET_LUAN">; ghiChu: string } | { ok: false; message: string } {
  const nhom = body?.nhom;
  if (!laNhomHuy(nhom) || nhom === "CHUA_KET_LUAN") return { ok: false, message: "Chọn nhóm: khách huỷ, công ty huỷ hoặc huỷ để lập lại / trùng đơn." };
  const g = typeof body?.lyDo === "string" ? body.lyDo.trim() : "";
  if (g === "") return { ok: false, message: "Cần ghi lý do phân loại." };
  if (g.length > GHI_CHU_HUY_TOI_DA) return { ok: false, message: `Lý do tối đa ${GHI_CHU_HUY_TOI_DA} ký tự.` };
  if (hasLongDigitRun(g)) return { ok: false, message: PHONE_IN_TEXT_MESSAGE };
  return { ok: true, nhom, ghiChu: g };
}
