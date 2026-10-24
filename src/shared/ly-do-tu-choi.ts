// Lý do «Từ chối» đơn của người đang phụ trách (ADR-0030 điều 2) — luật THUẦN dùng chung máy chủ ↔ giao diện. Danh sách ĐÓNG là hằng trong mã (không
// bảng), KHÔNG có ô chữ — kể cả «Khác» (ADR-0037 chỉ mở ô chữ cho HDV huỷ, không cho Từ chối).
// MÃ LÀ HỢP ĐỒNG với ADR-0032 (accepted): dòng `REFUSE` của sổ sự kiện phân công lưu đúng mã này (kế hoạch 2026-10-20 mục 3b) — không đổi tên mã sau khi
// phát hành. Nhật ký `order_handler_refused` chỉ ghi NHÃN (Q2 (a), chủ 2026-10-23).

export interface LyDoTuChoiMuc {
  ma: MaLyDoTuChoi;
  nhan: string;
}

export const MA_LY_DO_TU_CHOI = ["BAN_LICH", "OM_VIEC_RIENG", "KHONG_PHU_HOP", "OTHER"] as const;
export type MaLyDoTuChoi = (typeof MA_LY_DO_TU_CHOI)[number];

const NHAN: Readonly<Record<MaLyDoTuChoi, string>> = {
  BAN_LICH: "Bận lịch khác",
  OM_VIEC_RIENG: "Ốm / việc riêng",
  KHONG_PHU_HOP: "Không phù hợp tuyến/dịch vụ",
  OTHER: "Khác",
};

export const LY_DO_TU_CHOI: readonly LyDoTuChoiMuc[] = MA_LY_DO_TU_CHOI.map((ma) => ({ ma, nhan: NHAN[ma] }));

const laMa = (v: unknown): v is MaLyDoTuChoi => typeof v === "string" && (MA_LY_DO_TU_CHOI as readonly string[]).includes(v);

export const nhanLyDoTuChoi = (ma: MaLyDoTuChoi): string => NHAN[ma];

const CAU_BAO = `Hãy chọn một lý do từ chối: ${LY_DO_TU_CHOI.map((l) => `"${l.nhan}"`).join(", ")}.`;

/** Thân `POST /api/orders/:id/handler-refuse`: đúng `{ lyDo: <mã> }`. Khoá nào khác (ghi chú, note…) → lỗi: Từ chối không có ô chữ. */
export function docLyDoTuChoi(body: Record<string, unknown> | null): { ok: true; ma: MaLyDoTuChoi; nhan: string } | { ok: false; message: string } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return { ok: false, message: CAU_BAO };
  if (Object.keys(body).some((k) => k !== "lyDo")) return { ok: false, message: `Từ chối không kèm ghi chú. ${CAU_BAO}` };
  const ma = body.lyDo;
  if (!laMa(ma)) return { ok: false, message: CAU_BAO };
  return { ok: true, ma, nhan: NHAN[ma] };
}
