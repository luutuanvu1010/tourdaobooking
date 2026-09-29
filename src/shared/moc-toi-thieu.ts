// MỐC TỐI THIỂU trước giờ khởi hành (ADR-0049 D2; [TK] C17, C18, CH-01, MQ-10; chủ: ĐP2(i)–(v), ĐP3, Q2 = (a)) — luật THUẦN, một nguồn cho máy chủ
// (orders: xác nhận đơn, sửa chặng; van-chuyen: xếp, đổi xe, đổi tài xế) và màn hình (cảnh báo). Không I/O, không import module; import kèm đuôi .ts.
//
// - Mốc là MỘT con số cho cả lúc đặt và lúc xếp (`vc_dispatch_policy.min_lead_minutes`; chủ: luật "ghép điều kiện chung"). Mốc 0 = TẮT mốc (giả định G2).
// - DƯỚI mốc ⇔ (giờ hẹn − bây giờ) < mốc. Còn ĐÚNG mốc là đạt (TC-16: 360 phút đạt, 359 dưới; thiếu một giây cũng dưới).
// - Lúc ĐẶT: lưu nháp được (cảnh báo — ĐP2(v)); xác nhận đơn / sửa ngày, giờ, nơi của chặng đã xác nhận khi dưới mốc → chặn, trừ chặng "đặt gấp".
//   Chặng chưa chốt giờ thì không kiểm (I13 — mốc kiểm lúc điền giờ). Câu SQL xác nhận so CHUỖI "YYYY-MM-DD HH:MM" với `nguongMocVn` — cùng luật với
//   `kiemMocDat` (bài tương đương trong moc-toi-thieu.test.ts khoá điều đó).
// - Lúc XẾP (tính tới giờ XUẤT BẾN dự kiến của chuyến — ĐP2(i)): trong mốc khoá "ai đi xe nào", đổi xe, đổi tài xế (ĐP2(iii)); đổi thứ tự điểm, giờ xe tới
//   vẫn làm được. Xếp chính chặng đã đặt gấp thì qua (ĐP2(ii)). TẠO chuyến mới trong mốc không cần phá lệ (Q2 = (a), 29/9). Phá lệ: chỉ Quản trị, Toàn
//   quyền (ĐP3) — hàm này chỉ nói "cần phá lệ", route quyết ai được.
import { msToVnLocal, vnLocalToMs } from "./vn-date.ts";

const PHUT = 60_000;

/**
 * Ngưỡng chuỗi giờ VN "YYYY-MM-DD HH:MM" của (bây giờ + mốc), làm tròn LÊN phút: một chặng (giờ đến phút) có `ngày || ' ' || giờ` < ngưỡng ⇔ dưới mốc.
 * Tính ở máy chủ, truyền vào câu SQL làm tham số (không `date('now')`). Mốc ≤ 0 (tắt) → null: câu SQL so với NULL không bao giờ đúng ⇒ không chặn.
 */
export function nguongMocVn(bayGioMs: number, phut: number): string | null {
  if (phut <= 0) return null;
  const len = Math.ceil((bayGioMs + phut * PHUT) / PHUT) * PHUT;
  const { date, time } = msToVnLocal(len);
  return `${date} ${time}`;
}

/** Hình tối thiểu của một chặng cho luật mốc lúc đặt. */
export interface ChangMoc {
  ngayDon: string | null;
  gioDon: string | null;
  datGap: boolean;
}
export type KetQuaMocDat =
  | { duoiMoc: false; lyDo: "KHONG_GIO" | "DAT_GAP" | "TAT_MOC" | "DU_MOC"; phutConLai: number | null }
  | { duoiMoc: true; phutConLai: number };

/** Số phút còn lại tới giờ hẹn (làm tròn XUỐNG; âm = đã qua) — dùng cho câu "Giờ đón cách bây giờ 4 giờ 10 phút". */
const phutConLai = (moc: number, bayGioMs: number): number => Math.floor((moc - bayGioMs) / PHUT);

/** Mốc lúc ĐẶT cho một chặng: dưới mốc thì xác nhận / sửa chặng đã xác nhận bị chặn (trừ đặt gấp); lưu nháp chỉ cảnh báo. */
export function kiemMocDat(chang: ChangMoc, bayGioMs: number, phut: number): KetQuaMocDat {
  const gio = chang.ngayDon !== null && chang.gioDon !== null ? vnLocalToMs(chang.ngayDon, chang.gioDon) : null;
  if (gio === null) return { duoiMoc: false, lyDo: "KHONG_GIO", phutConLai: null };
  const con = phutConLai(gio, bayGioMs);
  if (phut <= 0) return { duoiMoc: false, lyDo: "TAT_MOC", phutConLai: con };
  if (chang.datGap) return { duoiMoc: false, lyDo: "DAT_GAP", phutConLai: con };
  return gio - bayGioMs < phut * PHUT ? { duoiMoc: true, phutConLai: con } : { duoiMoc: false, lyDo: "DU_MOC", phutConLai: con };
}

/**
 * Loại lệnh lúc XẾP (một chuyến chưa chạy). `DOI_DI` = dời suất RA khỏi chuyến này; `DOI_DEN` = dời suất VÀO chuyến này (route dời gọi hai lần, mỗi chuyến
 * một lần). `HUY_CO_KHACH` / `HUY_KHONG_KHACH` = huỷ chuyến còn / không còn suất mở (kế hoạch mục 1.7 route 8).
 */
export const LENH_XEP = ["TAO", "XEP", "RUT", "DOI_DI", "DOI_DEN", "DOI_XE", "DOI_TAI_XE", "HUY_CO_KHACH", "HUY_KHONG_KHACH", "DOI_THU_TU", "DOI_GIO_XE_TOI"] as const;
export type LenhXep = (typeof LENH_XEP)[number];
/** Lệnh bị KHOÁ trong mốc (đổi "ai đi xe nào", đổi xe, đổi tài xế — ADR-0049 D2; huỷ chuyến còn khách — kế hoạch route 8). Các lệnh khác không khoá. */
export const LENH_KHOA_THEO_MOC = ["XEP", "RUT", "DOI_DI", "DOI_DEN", "DOI_XE", "DOI_TAI_XE", "HUY_CO_KHACH"] as const satisfies readonly LenhXep[];
/** Lệnh đưa MỘT CHẶNG vào xe — chỉ ở đây cờ "đặt gấp" của chặng miễn phá lệ (ĐP2(ii): "xếp chính chặng đã đặt gấp thì qua"). */
const LENH_DUA_CHANG_VAO = new Set<LenhXep>(["XEP", "DOI_DEN"]);

export interface LenhMocXep {
  loai: LenhXep;
  /** Chặng được đưa vào xe mang dấu đặt gấp (chỉ có tác dụng với XEP, DOI_DEN). */
  datGap?: boolean;
}
export type KetQuaMocXep =
  | { canPhaLe: false; lyDo: "TAT_MOC" | "NGOAI_MOC" | "TAO_CHUYEN" | "DAT_GAP" | "LENH_KHONG_KHOA"; phutConLai: number }
  | { canPhaLe: true; phutConLai: number };

/** Mốc lúc XẾP cho một lệnh trên một chuyến có giờ xuất bến dự kiến `batDauMs`. `canPhaLe` → route trả 409 `can_pha_le` trừ khi có phá lệ hợp lệ. */
export function kiemMocXep(chuyen: { batDauMs: number }, bayGioMs: number, phut: number, lenh: LenhMocXep): KetQuaMocXep {
  const con = phutConLai(chuyen.batDauMs, bayGioMs);
  if (phut <= 0) return { canPhaLe: false, lyDo: "TAT_MOC", phutConLai: con };
  if (chuyen.batDauMs - bayGioMs >= phut * PHUT) return { canPhaLe: false, lyDo: "NGOAI_MOC", phutConLai: con };
  if (lenh.loai === "TAO") return { canPhaLe: false, lyDo: "TAO_CHUYEN", phutConLai: con };
  if (!(LENH_KHOA_THEO_MOC as readonly LenhXep[]).includes(lenh.loai)) return { canPhaLe: false, lyDo: "LENH_KHONG_KHOA", phutConLai: con };
  if (LENH_DUA_CHANG_VAO.has(lenh.loai) && lenh.datGap === true) return { canPhaLe: false, lyDo: "DAT_GAP", phutConLai: con };
  return { canPhaLe: true, phutConLai: con };
}

/**
 * Mức cảnh báo mốc trên lịch chung (MQ-04; CH-03): dưới mốc → "QUA_MOC" (đỏ); dưới (mốc + cảnh báo) → "SAT_MOC" (vàng); còn lại "BINH_THUONG".
 * Mốc tắt (0) thì không bao giờ "QUA_MOC", chỉ còn phần cảnh báo.
 */
export function mucMoc(gioMs: number, bayGioMs: number, phut: number, phutCanhBao: number): "QUA_MOC" | "SAT_MOC" | "BINH_THUONG" {
  const con = gioMs - bayGioMs;
  if (phut > 0 && con < phut * PHUT) return "QUA_MOC";
  if (con < (Math.max(phut, 0) + phutCanhBao) * PHUT) return "SAT_MOC";
  return "BINH_THUONG";
}

/**
 * Mốc tối thiểu ĐANG HIỆU LỰC (ADR-0049 D2; kế hoạch I25): số phút + khoá dòng chính sách đã dùng. Hàm công bố `mocToiThieuHienHanh` của van-chuyen trả
 * kiểu này; gốc lắp ráp tiêm nó cho orders qua `ctx.mocToiThieu` (Task A10). `null` ở nơi dùng = chưa có chính sách → CHẶN, không đoán con số.
 */
export interface MocToiThieu {
  phut: number;
  policyId: string;
}
