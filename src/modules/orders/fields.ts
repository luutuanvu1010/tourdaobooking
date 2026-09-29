// Bộ đọc trường đầu vào thuần cho luật đơn hàng: chuỗi, số nguyên, ngày, giờ. Không I/O.
import { isHHMM, isISODate } from "../../shared/vn-date.ts";

export type TextField = { value: string | null; error?: string };

/** Chuỗi khách/đơn: chỉ trim. Rỗng → null (hoặc lỗi nếu bắt buộc). */
export function text(v: unknown, label: string, max: number, required: boolean): TextField {
  if (v === undefined || v === null || v === "") return required ? { value: null, error: `${label} là bắt buộc.` } : { value: null };
  if (typeof v !== "string") return { value: null, error: `${label} không hợp lệ.` };
  const s = v.trim();
  if (!s) return required ? { value: null, error: `${label} là bắt buộc.` } : { value: null };
  if (s.length > max) return { value: null, error: `${label} tối đa ${max} ký tự.` };
  return { value: s };
}

/** Số tiền/số lượng phải là số nguyên (kiểu number, không nhận chuỗi) trong khoảng cho phép. */
export function int(v: unknown, label: string, min: number, max: number, fallback?: number): { value: number; error?: string } {
  if ((v === undefined || v === null) && fallback !== undefined) return { value: fallback };
  if (typeof v !== "number" || !Number.isSafeInteger(v)) return { value: 0, error: `${label} phải là số nguyên.` };
  if (v < min || v > max) return { value: 0, error: `${label} phải từ ${min} đến ${max}.` };
  return { value: v };
}

/**
 * Chuỗi tự do đi vào PNG/PDF (điểm đón, nơi check-in, ghi chú) — luật làm sạch nay ở `src/shared/text-guards.ts` (ADR-0047: chặng đưa đón kiểm ở luật
 * thuần dùng chung, không import module); xuất lại ở đây để mã cũ của orders không đổi. MỘT luật cho mọi nơi đón.
 */
export { cleanText } from "../../shared/text-guards.ts";

/** Ngày YYYY-MM-DD đúng lịch. Rỗng/vắng → null. */
export function dateField(v: unknown, label: string): TextField {
  if (v === undefined || v === null || v === "") return { value: null };
  if (typeof v !== "string" || !isISODate(v.trim())) return { value: null, error: `${label} không hợp lệ (định dạng YYYY-MM-DD).` };
  return { value: v.trim() };
}

/** Giờ HH:MM từ 00:00 đến 23:59. Rỗng/vắng → null. */
export function timeField(v: unknown, label: string): TextField {
  if (v === undefined || v === null || v === "") return { value: null };
  if (typeof v !== "string" || !isHHMM(v.trim())) return { value: null, error: `${label} không hợp lệ (định dạng HH:MM).` };
  return { value: v.trim() };
}
