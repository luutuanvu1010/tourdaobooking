// Luật THUẦN ghép "Đổi sang chặng khác" của bảng "Sửa đưa đón" (C14 — đánh giá ERP 2026-10-07; route `POST /api/orders/:id/legs/:legId/replace`). Không I/O,
// không import module (src/shared/). Import kèm đuôi .ts (chạy trực tiếp bằng `node --test`). Test cạnh tệp: thay-chang.test.ts.
//
// Trong MỘT dịch vụ, theo TỪNG chiều: có ĐÚNG một chặng đã lưu bị bỏ với lý do thuộc `LY_DO_THAY_CHANG` ("Đổi sang chặng khác" hoặc "Nhập nhầm") VÀ ĐÚNG
// một chặng mới cùng chiều → ghép thành MỘT lệnh "thay" (đóng + thêm cùng lô ở máy chủ; lệnh mang đúng lý do người dùng chọn). Mọi trường hợp khác giữ lệnh
// rời như cũ — không đoán: bỏ hai thêm một, bỏ một thêm hai, bỏ hai chặng cùng chiều, lý do "Không cần nữa" (khách bỏ chặng cũ; chặng mới là việc riêng),
// khác chiều.
import type { LyDoDongChang } from "./chang-dua-don.ts";
import type { LegDirection } from "./contracts.ts";

/**
 * Lý do bỏ chặng mà lệnh thay nhận (`reasonCode` của `POST …/legs/:legId/replace`; vắng = REPLACED) — một nguồn cho máy chủ và giao diện (người điều phối quyết
 * 2026-10-08: thêm "Nhập nhầm" để chặng nhập sai được sửa bằng một lệnh, không lưu dở dưới mốc).
 */
export const LY_DO_THAY_CHANG = ["REPLACED", "WRONG_ENTRY"] as const satisfies readonly LyDoDongChang[];
export type LyDoThayChang = (typeof LY_DO_THAY_CHANG)[number];
export const laLyDoThayChang = (v: unknown): v is LyDoThayChang => typeof v === "string" && (LY_DO_THAY_CHANG as readonly string[]).includes(v);

export interface KetQuaGhepThay<B, M> {
  /** Cặp bỏ ↔ thêm gửi bằng MỘT lệnh "thay" — theo thứ tự của danh sách bỏ. */
  thay: { bo: B; moi: M }[];
  /** Chặng bỏ còn lại (giữ thứ tự vào). */
  boLe: B[];
  /** Chặng mới còn lại (giữ thứ tự vào). */
  moiLe: M[];
}

export function ghepThayChang<B extends { leg: { direction: LegDirection }; lyDo: LyDoDongChang }, M extends { direction: LegDirection }>(
  bo: readonly B[],
  moi: readonly M[],
): KetQuaGhepThay<B, M> {
  const cap = new Map<B, M>();
  for (const chieu of ["OUT", "RETURN"] as const) {
    const boChieu = bo.filter((b) => b.leg.direction === chieu);
    const moiChieu = moi.filter((m) => m.direction === chieu);
    if (boChieu.length === 1 && moiChieu.length === 1 && laLyDoThayChang(boChieu[0]!.lyDo)) cap.set(boChieu[0]!, moiChieu[0]!);
  }
  const daGhep = new Set<M>(cap.values());
  return {
    thay: bo.filter((b) => cap.has(b)).map((b) => ({ bo: b, moi: cap.get(b)! })),
    boLe: bo.filter((b) => !cap.has(b)),
    moiLe: moi.filter((m) => !daGhep.has(m)),
  };
}
