// Luật THUẦN ghép "Đổi sang chặng khác" của bảng "Sửa đưa đón" (C14 — đánh giá ERP 2026-10-07; route `POST /api/orders/:id/legs/:legId/replace`). Không I/O,
// không import module (src/shared/). Import kèm đuôi .ts (chạy trực tiếp bằng `node --test`). Test cạnh tệp: thay-chang.test.ts.
//
// Trong MỘT dịch vụ, theo TỪNG chiều: có ĐÚNG một chặng đã lưu bị bỏ với lý do "Đổi sang chặng khác" (REPLACED) VÀ ĐÚNG một chặng mới cùng chiều → ghép
// thành MỘT lệnh "thay" (đóng + thêm cùng lô ở máy chủ). Mọi trường hợp khác giữ lệnh rời như cũ — không đoán: bỏ hai thêm một, bỏ một thêm hai, bỏ hai chặng
// cùng chiều mà chỉ một chặng có lý do REPLACED, lý do khác (Nhập nhầm, Không cần nữa — ghép thì máy chủ ghi đè lý do thành REPLACED), khác chiều.
import type { LyDoDongChang } from "./chang-dua-don.ts";
import type { LegDirection } from "./contracts.ts";

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
    if (boChieu.length === 1 && moiChieu.length === 1 && boChieu[0]!.lyDo === "REPLACED") cap.set(boChieu[0]!, moiChieu[0]!);
  }
  const daGhep = new Set<M>(cap.values());
  return {
    thay: bo.filter((b) => cap.has(b)).map((b) => ({ bo: b, moi: cap.get(b)! })),
    boLe: bo.filter((b) => !cap.has(b)),
    moiLe: moi.filter((m) => !daGhep.has(m)),
  };
}
