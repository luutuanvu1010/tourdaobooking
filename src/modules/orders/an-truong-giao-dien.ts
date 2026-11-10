// Chính sách giao diện ADR-0194 đợt 1 áp ở MÁY CHỦ cho form Tạo đơn: hai hàm THUẦN (không I/O) — trường ẩn thì bỏ khoá / giữ giá trị đang lưu; trường bắt buộc thì kiểm khi nhận.
// Máy chủ quyết, không tin trình duyệt (kể cả bản giao diện cũ trong bộ nhớ đệm PWA vẫn gửi trường đã ẩn). KHÔNG chạm luật nền: tên, SĐT, dịch vụ, tiền, ngày đi không nằm trong danh mục ẩn được
// (`src/shared/ui-truong.ts`); nơi gọi chỉ áp khi công tắc ADR-0154 KHÔNG đang áp cho tài khoản (một nơi quyết mỗi trường lúc chuyển).
import type { TruongDaGiai } from "../../shared/ui-truong";
import type { ValidOrder } from "./rules";

const laDoiTuong = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

/** Ba trường chữ tuỳ chọn của Tạo đơn mà chính sách có thể ẩn — khi ẩn lúc SỬA thì GIỮ giá trị đang lưu. */
export interface TuyChonDangLuu { customerEmail: string | null; customerNote: string | null; paymentNote: string | null }
const CHU_TUY_CHON = ["customerEmail", "customerNote", "paymentNote"] as const;

/** Tách chính sách đã giải của người gọi thành tập trường ẨN và tập trường BẮT BUỘC của màn Tạo đơn. */
export function truongTaoDon(ds: readonly TruongDaGiai[]): { an: ReadonlySet<string>; batBuoc: ReadonlySet<string> } {
  const tao = ds.filter((d) => d.man === "tao-don");
  return { an: new Set(tao.filter((d) => d.an).map((d) => d.truong)), batBuoc: new Set(tao.filter((d) => d.batBuoc && !d.an).map((d) => d.truong)) };
}

/**
 * Viết lại thân yêu cầu theo tập trường ẨN: `passengers` ⇒ bỏ khoá (thân không có khoá ⇒ `validateOrder` trả `passengers = null` ⇒ danh sách đang lưu giữ nguyên, không xoá–chèn lại);
 * email / ghi chú khách / ghi chú thanh toán ⇒ LẬP (`luu = null`): rỗng; SỬA nháp: giá trị ĐANG LƯU. Trả đối tượng MỚI; không ẩn gì ⇒ trả đúng thân gốc. Thân không phải đối tượng: trả nguyên.
 */
export function thanKhiAnTruong<T>(body: T, an: ReadonlySet<string>, luu: TuyChonDangLuu | null): T | Record<string, unknown> {
  if (!laDoiTuong(body) || an.size === 0) return body;
  const ra: Record<string, unknown> = { ...body };
  if (an.has("passengers")) delete ra.passengers;
  for (const k of CHU_TUY_CHON) if (an.has(k)) ra[k] = luu ? (luu[k] ?? "") : "";
  return ra;
}

const NHAN: Readonly<Record<string, string>> = { customerEmail: "Email khách", customerNote: "Ghi chú khách", paymentNote: "Ghi chú thanh toán", passengers: "Danh sách khách" };
const CO_CHU = (v: string | null): boolean => typeof v === "string" && v.trim() !== "";

/**
 * Trường BẮT BUỘC còn thiếu ở đơn ĐÃ qua `validateOrder` (giá trị hiệu lực sau khi trường ẩn đã được viết lại). Danh sách khách: `passengers` null = thân không có khoá ⇒ theo `soKhachDangLuu`
 * (sửa nháp: số khách đang lưu; lập: `null` ⇒ thiếu). Trả câu tiếng Việt cho 400, hoặc `null` nếu đủ. Chỉ nêu MỘT trường đầu tiên (thứ tự cố định).
 */
export function thieuBatBuoc(v: Pick<ValidOrder, "customerEmail" | "customerNote" | "paymentNote" | "passengers">, batBuoc: ReadonlySet<string>, soKhachDangLuu: number | null): string | null {
  for (const k of CHU_TUY_CHON) if (batBuoc.has(k) && !CO_CHU(v[k])) return `Cần nhập «${NHAN[k]}».`;
  if (batBuoc.has("passengers")) {
    const so = v.passengers === null ? (soKhachDangLuu ?? 0) : v.passengers.length;
    if (so === 0) return `Cần nhập «${NHAN.passengers}».`;
  }
  return null;
}
