// Luật thuần THÂN ROUTE khung bận của xe (ADR-0055 VK2-A A5–A6). Không I/O. Giờ nhập là giờ VN ("ngay" + "gio") → mốc máy bằng vnLocalToMs (MỘT hàm đổi giờ
// VN của cả dự án). KHÔNG import dieu-phoi-than.ts: tệp đó import không đuôi → `node --test` không nạp được (bài thuần phải import kèm đuôi .ts).
import { nhanKhoangGio } from "../../shared/khung-ban.ts";
import { vnLocalToMs } from "../../shared/vn-date.ts";

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const GIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function docGioVn(v: unknown): number | null {
  if (!v || typeof v !== "object") return null;
  const { ngay, gio } = v as Record<string, unknown>;
  return typeof ngay === "string" && typeof gio === "string" && NGAY_RE.test(ngay) && GIO_RE.test(gio) ? vnLocalToMs(ngay, gio) : null;
}

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });
export interface KhungBanMoi { batDauMs: number; ketThucMs: number; lyDo: string }
/** ADR-0055 G-A1: một khung bận của xe dài tối đa 31 ngày (K7). */
export const KHUNG_XE_TOI_DA_NGAY = 31;
const MA_LY_DO_RE = /^[A-Z][A-Z0-9_]{1,39}$/;

/** Thân `{ batDau: {ngay, gio}, ketThuc: {ngay, gio}, lyDo }`. Bắt đầu trong quá khứ được nếu kết thúc sau bây giờ (K4); khung đã qua → 400. */
export function kiemKhungBanMoi(body: Record<string, unknown> | null, bayGioMs: number): Result<KhungBanMoi> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const batDauMs = docGioVn(body.batDau);
  const ketThucMs = docGioVn(body.ketThuc);
  if (batDauMs === null || ketThucMs === null) return fail("Giờ bắt đầu, giờ kết thúc: ngày YYYY-MM-DD và giờ HH:MM.");
  if (ketThucMs <= batDauMs) return fail("Giờ kết thúc phải sau giờ bắt đầu.");
  if (ketThucMs <= bayGioMs) return fail("Khung này đã qua — chỉ ghi khung còn tới hoặc đang diễn ra.");
  if (ketThucMs - batDauMs > KHUNG_XE_TOI_DA_NGAY * 86_400_000) return fail(`Một khung bận dài tối đa ${KHUNG_XE_TOI_DA_NGAY} ngày — xe nằm xưởng lâu hơn thì đổi trạng thái xe sang Bảo dưỡng.`);
  if (typeof body.lyDo !== "string" || !MA_LY_DO_RE.test(body.lyDo)) return fail("Chọn lý do xe bận.");
  return { ok: true, value: { batDauMs, ketThucMs, lyDo: body.lyDo } };
}
export function kiemRutKhung(body: Record<string, unknown> | null): Result<{ version: number }> {
  const v = body?.version;
  return typeof v === "number" && Number.isInteger(v) && v >= 1 ? { ok: true, value: { version: v } } : fail("Thiếu phiên bản khung — tải lại trang rồi làm lại.");
}
/** Nhật ký (ADR-0055 A6): biển số + khung giờ VN + nhãn lý do — không dữ liệu cá nhân. */
export const chiTietNhatKyKhung = (bienSo: string, k: { batDauMs: number; ketThucMs: number }, lyDoNhan: string, rut = false): string =>
  `xe ${bienSo}: ${rut ? "rút khung bận" : "bận"} ${nhanKhoangGio(k.batDauMs, k.ketThucMs)} · ${lyDoNhan}`;
export const CAU_KHUNG_VUA_DOI = "Khung bận vừa được người khác rút hoặc lịch xe vừa đổi — tải lại rồi làm lại.";
/** Lỗi CSDL (lưới thứ hai) → mã lớp CSDL KHÁC mã lớp route (khuôn R15). Lỗi lạ → null (ném tiếp). */
export function loiRangBuocKhungBan(message: string): { status: number; code: string; message: string } | null {
  // ADR-0053 D9 B9.2 (0092): khung bận của TÀI XẾ chồng chuyến người đó đang được xếp — lớp máy chủ đã kiểm trước; tới đây là văn phòng vừa xếp giữa lúc đọc
  // và lúc ghi. TRƯỚC dòng của xe (`unavailability_overlaps_trip` không khớp tên trigger tài xế nhờ \b … _trip).
  if (/\bunavailability_overlaps_driver_trip/.test(message)) return { status: 409, code: "khung_ban_chong_chuyen_tai_xe_csdl", message: "Bạn vừa được xếp chuyến trùng giờ này — tải lại để xem chuyến, từ chối chuyến (nếu còn hạn) hoặc gọi văn phòng." };
  if (/\bunavailability_overlaps_trip/.test(message)) return { status: 409, code: "khung_ban_chong_chuyen_csdl", message: "Xe vừa được xếp chuyến trùng giờ này — tải lại để xem chuyến, dời hoặc đổi xe chuyến đó trước." };
  if (/vc_unavailability_append_only/.test(message)) return { status: 409, code: "khung_ban_vua_doi", message: CAU_KHUNG_VUA_DOI };
  if (/\bunavailability_reason_group|FOREIGN KEY constraint failed/.test(message)) return { status: 400, code: "invalid_input", message: "Lý do không có trong danh mục lý do xe bận." };
  return null;
}
