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

// Ký tự điều khiển ASCII + dấu tách dòng/đoạn Unicode (U+2028/2029 — giả xuống dòng) + dấu điều hướng hai chiều (U+200E/F, 202A–202E, 2066–2069 — đảo chiều chữ).
// Cố ý KHÔNG bỏ U+200B–200D (khoảng trắng/nối độ rộng 0): cần cho emoji ghép.
const UNICODE_LAYOUT = "\\u2028\\u2029\\u200e\\u200f\\u202a-\\u202e\\u2066-\\u2069";
const CONTROL_KEEP_NEWLINE = new RegExp(`[\\u0000-\\u0009\\u000b-\\u001f\\u007f${UNICODE_LAYOUT}]`, "g");
const CONTROL_ALL = new RegExp(`[\\u0000-\\u001f\\u007f${UNICODE_LAYOUT}]`, "g");

/**
 * Chuỗi tự do đi vào PNG/PDF (điểm đón, nơi check-in, ghi chú): bỏ ký tự điều khiển như booking (`schema.ts` của tourdaovn),
 * để xuống dòng giả không chen vào mẫu xuất. `multiline` = true chỉ giữ dấu xuống dòng; false gộp mọi khoảng trắng thành một dấu cách.
 */
export function cleanText(v: unknown, label: string, max: number, multiline: boolean): TextField {
  if (v === undefined || v === null) return { value: null };
  if (typeof v !== "string") return { value: null, error: `${label} không hợp lệ.` };
  const unified = v.replace(/\r\n?/g, "\n");
  const s = (multiline ? unified.replace(CONTROL_KEEP_NEWLINE, " ") : unified.replace(CONTROL_ALL, " ").replace(/\s+/g, " ")).trim();
  if (!s) return { value: null };
  if (s.length > max) return { value: null, error: `${label} tối đa ${max} ký tự.` };
  return { value: s };
}

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
