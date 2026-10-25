// Luật THUẦN lập kế hoạch lệnh của bảng "Sửa đưa đón" (C14 — đánh giá ERP 2026-10-07; route `POST /api/orders/:id/legs/:legId/replace`): (1) ghép "Đổi sang
// chặng khác" thành một lệnh thay; (2) kiểm mốc 6 giờ CẢ kế hoạch trước lệnh đầu cho người không có ô đặt gấp. Không I/O, không import module (src/shared/).
// Import kèm đuôi .ts (chạy trực tiếp bằng `node --test`). Test cạnh tệp: thay-chang.test.ts.
//
// Trong MỘT dịch vụ, theo TỪNG chiều: có ĐÚNG một chặng đã lưu bị bỏ với lý do thuộc `LY_DO_THAY_CHANG` ("Đổi sang chặng khác" hoặc "Nhập nhầm") VÀ ĐÚNG
// một chặng mới cùng chiều → ghép thành MỘT lệnh "thay" (đóng + thêm cùng lô ở máy chủ; lệnh mang đúng lý do người dùng chọn). Mọi trường hợp khác giữ lệnh
// rời như cũ — không đoán: bỏ hai thêm một, bỏ một thêm hai, bỏ hai chặng cùng chiều, lý do "Không cần nữa" (khách bỏ chặng cũ; chặng mới là việc riêng),
// khác chiều.
import { chiDoiOPhu, type LyDoDongChang } from "./chang-dua-don.ts";
import { nhanThoiLuong } from "./chinh-sach-hien-thi.ts";
import type { LegDirection } from "./contracts.ts";
import { duoiMocKhiSua } from "./moc-toi-thieu.ts";
import { cleanText } from "./text-guards.ts";

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

// ---- Kiểm mốc CẢ kế hoạch trước lệnh đầu (người điều phối quyết 2026-10-08) -----------------------------------------------------------------------------
// Người KHÔNG có ô đặt gấp (Bán hàng…): nếu một lệnh thêm / sửa / thay trong kế hoạch CHẮC CHẮN bị máy chủ chặn vì dưới mốc thì bảng không gửi lệnh nào (khỏi
// lưu dở: bỏ được mà thêm bị chặn). Máy chủ vẫn là cổng thật — đây chỉ là bước trước. Luật mốc là MỘT: `duoiMocKhiSua` (src/shared/moc-toi-thieu.ts) — đúng hàm
// route thêm / sửa / thay chặng dùng; "chỉ đổi ô phụ thì không xét" là `chiDoiOPhu` — đúng hàm route sửa chặng dùng; chữ tự do chuẩn hoá bằng `cleanText` như
// máy chủ. Lệnh bỏ chặng không có luật mốc.

export interface GioDon {
  pickupDate: string | null;
  pickupTime: string | null;
}
/** Chặng ĐANG LƯU (các trường của `LegDto` máy chủ so). */
export interface ChangDangLuu extends GioDon {
  pickupLocationId: string | null;
  pickupPlace: string | null;
  dropoffLocationId: string | null;
  dropoffPlace: string | null;
}
/** Thân sẽ gửi (các trường của `LegInput`). */
export interface ChangSeGui {
  pickupDate: string;
  pickupTime: string;
  pickupLocationId: string | null;
  pickupPlace: string;
  dropoffLocationId: string | null;
  dropoffPlace: string;
}
export type LenhKeHoach = { loai: "them"; moi: ChangSeGui } | { loai: "sua" | "thay"; cu: ChangDangLuu; moi: ChangSeGui } | { loai: "bo" };
export type XetMoc = { cu: GioDon | null; moi: GioDon } | null;

const chu = (v: string): string | null => cleanText(v, "", Number.MAX_SAFE_INTEGER, false).value;

/**
 * Cặp (chặng cũ, chặng mới) máy chủ sẽ xét mốc cho MỘT lệnh; null = lệnh không xét mốc. Thân gửi đổi ra giá trị máy chủ sẽ hiểu (`kiemChang`): ngày trống =
 * ngày đi (R4b), giờ trống = chưa chốt, chữ tự do qua `cleanText`. Thêm → (null, mới); thay → (cũ, mới); sửa → (cũ, mới), trừ khi ngày, giờ, nơi đón, nơi
 * trả y nguyên (`chiDoiOPhu` — chỉ đổi số hiệu / số người / cam kết xe) → null; bỏ → null.
 */
export function xetMocLenh(l: LenhKeHoach, ngayDi: string | null): XetMoc {
  if (l.loai === "bo") return null;
  const m = l.moi;
  const moi = {
    pickupDate: m.pickupDate.trim() || ngayDi || null, pickupTime: m.pickupTime.trim() || null, pickupLocationId: m.pickupLocationId || null, pickupPlace: chu(m.pickupPlace),
    dropoffLocationId: m.dropoffLocationId || null, dropoffPlace: chu(m.dropoffPlace),
  };
  const gioMoi = { pickupDate: moi.pickupDate, pickupTime: moi.pickupTime };
  if (l.loai === "them") return { cu: null, moi: gioMoi };
  if (l.loai === "sua" && chiDoiOPhu(l.cu, moi)) return null;
  return { cu: { pickupDate: l.cu.pickupDate, pickupTime: l.cu.pickupTime }, moi: gioMoi };
}

/** Lệnh của kế hoạch máy chủ CHẮC CHẮN chặn vì dưới mốc (theo đồng hồ máy này) — giữ thứ tự vào. */
export function lenhChanMoc<T extends { xet: XetMoc }>(ds: readonly T[], mocPhut: number, bayGioMs: number): T[] {
  return ds.filter((l) => l.xet !== null && duoiMocKhiSua(l.xet.cu, l.xet.moi, bayGioMs, mocPhut));
}

/**
 * Câu báo ngay ở bảng (không gửi lệnh nào) cho người có `order.trip.edit` mà KHÔNG có ô đặt gấp — từ ADR-0107 không mã quyền nào như vậy (nhánh dự phòng):
 * "Lượt Chiều đi · Tour đảo đã qua hạn chốt (6 giờ trước giờ đón) — cần đặt gấp; chưa lưu gì." Tên chặng không lặp.
 */
export function cauChanMoc(nhan: readonly string[], mocPhut: number): string {
  return `Lượt ${[...new Set(nhan)].join(", ")} đã qua hạn chốt (${nhanThoiLuong(mocPhut)} trước giờ đón) — cần đặt gấp; chưa lưu gì.`;
}
