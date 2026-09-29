// MỐC TỐI THIỂU trước giờ khởi hành (ADR-0049 D2; [TK] C17, C18, CH-01, MQ-10; chủ: ĐP2(i)–(v), ĐP3, Q2 = (a)) — luật THUẦN, một nguồn cho máy chủ
// (orders: xác nhận đơn, sửa chặng; van-chuyen: xếp, đổi xe, đổi tài xế) và màn hình (cảnh báo). Không I/O, không import module; import kèm đuôi .ts.
//
// - Mốc là MỘT con số cho cả lúc đặt và lúc xếp (`vc_dispatch_policy.min_lead_minutes`; chủ: luật "ghép điều kiện chung"). Mốc luôn > 0 — KHÔNG tắt được
//   (chủ trả lời lần 9, 29/9: "Không cho tắt"; CHECK ở CSDL + `kiemChinhSachMoi`). Hàm ở đây không có nhánh "tắt" nào.
// - DƯỚI mốc ⇔ (giờ hẹn − bây giờ) < mốc. Còn ĐÚNG mốc là đạt (TC-16: 360 phút đạt, 359 dưới; thiếu một giây cũng dưới).
// - Lúc ĐẶT: lưu nháp được (cảnh báo — ĐP2(v)); xác nhận đơn / sửa ngày, giờ, nơi của chặng đã xác nhận khi dưới mốc → chặn, trừ chặng "đặt gấp".
//   Chặng chưa chốt giờ thì không kiểm (I13 — mốc kiểm lúc điền giờ). Câu SQL xác nhận so CHUỖI "YYYY-MM-DD HH:MM" với `nguongMocVn` — cùng luật với
//   `kiemMocDat` (bài tương đương trong moc-toi-thieu.test.ts khoá điều đó).
// - Lúc XẾP (tính tới giờ XUẤT BẾN dự kiến của chuyến — ĐP2(i)): trong mốc khoá "ai đi xe nào", đổi xe, đổi tài xế (ĐP2(iii)); đổi thứ tự điểm, giờ xe tới
//   vẫn làm được. Xếp chính chặng đã đặt gấp thì qua (ĐP2(ii)). TẠO chuyến mới trong mốc không cần phá lệ (Q2 = (a), 29/9). Phá lệ: chỉ Quản trị, Toàn
//   quyền (ĐP3) — hàm này chỉ nói "cần phá lệ", route quyết ai được.
// - KHOÁ DÍNH (R-P6; chủ trả lời lần 9 "Khoá dính"): chuyến đã vào vùng mốc thì GIỮ khoá dù giờ xuất bến bị dời ra xa. Mốc lúc xếp tính theo
//   min(giờ xuất bến dự kiến SỚM NHẤT từng có, giờ hiện tại) — cột `vc_trip` của migration lõi chuyến (A12) giữ giờ sớm nhất, câu sửa giờ đặt
//   `= MIN(cũ, mới)`. Bản thân lệnh dời giờ KHÔNG bị khoá.
import { msToVnLocal, vnLocalToMs } from "./vn-date.ts";

const PHUT = 60_000;

/**
 * Ngưỡng chuỗi giờ VN "YYYY-MM-DD HH:MM" của (bây giờ + mốc), làm tròn LÊN phút: một chặng (giờ đến phút) có `ngày || ' ' || giờ` < ngưỡng ⇔ dưới mốc.
 * Tính ở máy chủ, truyền vào câu SQL làm tham số (không `date('now')`). Luôn trả chuỗi — không có "không ngưỡng" (mốc không tắt được, GA-5).
 */
export function nguongMocVn(bayGioMs: number, phut: number): string {
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
  | { duoiMoc: false; lyDo: "KHONG_GIO" | "DAT_GAP" | "DU_MOC"; phutConLai: number | null }
  | { duoiMoc: true; phutConLai: number };

/** Số phút còn lại tới giờ hẹn (làm tròn XUỐNG; âm = đã qua) — dùng cho câu "Giờ đón cách bây giờ 4 giờ 10 phút". */
const phutConLai = (moc: number, bayGioMs: number): number => Math.floor((moc - bayGioMs) / PHUT);

/** Mốc lúc ĐẶT cho một chặng: dưới mốc thì xác nhận / sửa chặng đã xác nhận bị chặn (trừ đặt gấp); lưu nháp chỉ cảnh báo. */
export function kiemMocDat(chang: ChangMoc, bayGioMs: number, phut: number): KetQuaMocDat {
  const gio = chang.ngayDon !== null && chang.gioDon !== null ? vnLocalToMs(chang.ngayDon, chang.gioDon) : null;
  if (gio === null) return { duoiMoc: false, lyDo: "KHONG_GIO", phutConLai: null };
  const con = phutConLai(gio, bayGioMs);
  if (chang.datGap) return { duoiMoc: false, lyDo: "DAT_GAP", phutConLai: con };
  return gio - bayGioMs < phut * PHUT ? { duoiMoc: true, phutConLai: con } : { duoiMoc: false, lyDo: "DU_MOC", phutConLai: con };
}

/**
 * Loại lệnh lúc XẾP (một chuyến chưa chạy). `DOI_DI` = dời suất RA khỏi chuyến này; `DOI_DEN` = dời suất VÀO chuyến này (route dời gọi hai lần, mỗi chuyến
 * một lần). `HUY_CO_KHACH` / `HUY_KHONG_KHACH` = huỷ chuyến còn / không còn suất mở (kế hoạch mục 1.7 route 8).
 */
export const LENH_XEP = [
  "TAO", "XEP", "RUT", "DOI_DI", "DOI_DEN", "DOI_XE", "DOI_TAI_XE", "HUY_CO_KHACH", "HUY_KHONG_KHACH", "DOI_THU_TU", "DOI_GIO_XE_TOI",
  // ADR-0050 VK1-B: "cập nhật điểm theo đơn" — không đổi "ai đi xe nào" (ĐP2(iii)) → KHÔNG vào LENH_KHOA_THEO_MOC.
  "DOI_DIEM_THEO_CHANG",
] as const;
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
  | { canPhaLe: false; lyDo: "NGOAI_MOC" | "TAO_CHUYEN" | "DAT_GAP" | "LENH_KHONG_KHOA"; phutConLai: number }
  | { canPhaLe: true; phutConLai: number };

/** Giờ chuyến dùng cho mốc lúc xếp (R-P6 khoá dính): min(giờ sớm nhất từng có, giờ hiện tại) — không bao giờ muộn hơn giờ hiện tại. */
export const gioXetMocXep = (chuyen: ChuyenMocXep): number => Math.min(chuyen.batDauMs, chuyen.batDauSomNhatMs ?? chuyen.batDauMs);
/** Hình tối thiểu của một chuyến cho luật mốc lúc xếp. `batDauSomNhatMs` = giờ xuất bến dự kiến SỚM NHẤT từng có (cột `vc_trip` — A12; chuyến mới = giờ lúc tạo). */
export interface ChuyenMocXep {
  batDauMs: number;
  batDauSomNhatMs: number;
}

/**
 * Giờ xuất bến sớm nhất SAU KHI SỬA giờ xuất bến của chuyến thành `gioMoiMs` (R-P7 — tinh chỉnh R-P6 cho đúng chữ chủ "chuyến đã vào vùng 6 giờ thì giữ
 * khoá dù giờ bị dời ra xa"): nếu lúc sửa chuyến ĐANG trong vùng khoá — `gioXetMocXep(chuyen) < bây giờ + mốc` với mốc của chính sách HIỆN HÀNH — thì giữ
 * khoá dính: `MIN(sớm nhất, giờ mới)`; nếu KHÔNG trong vùng thì đặt lại = giờ mới (dời từ xa không tạo khoá thừa). MỘT luật cho máy chủ lẫn câu SQL của
 * A12 (`earliest_start_ms = CASE WHEN … THEN MIN(…) ELSE ?giờ mới END` — tham số tính bằng chính hàm này, không chép luật vào SQL).
 */
export function batDauSomNhatSauDoiGio(chuyen: ChuyenMocXep, gioMoiMs: number, bayGioMs: number, phut: number): number {
  const trongVung = gioXetMocXep(chuyen) - bayGioMs < phut * PHUT;
  return trongVung ? Math.min(chuyen.batDauSomNhatMs ?? chuyen.batDauMs, gioMoiMs) : gioMoiMs;
}

/** Mốc lúc XẾP cho một lệnh trên một chuyến. `canPhaLe` → route trả 409 `can_pha_le` trừ khi có phá lệ hợp lệ. Khoá dính: xét theo `gioXetMocXep`. */
export function kiemMocXep(chuyen: ChuyenMocXep, bayGioMs: number, phut: number, lenh: LenhMocXep): KetQuaMocXep {
  const gio = gioXetMocXep(chuyen);
  const con = phutConLai(gio, bayGioMs);
  if (gio - bayGioMs >= phut * PHUT) return { canPhaLe: false, lyDo: "NGOAI_MOC", phutConLai: con };
  if (lenh.loai === "TAO") return { canPhaLe: false, lyDo: "TAO_CHUYEN", phutConLai: con };
  if (!(LENH_KHOA_THEO_MOC as readonly LenhXep[]).includes(lenh.loai)) return { canPhaLe: false, lyDo: "LENH_KHONG_KHOA", phutConLai: con };
  if (LENH_DUA_CHANG_VAO.has(lenh.loai) && lenh.datGap === true) return { canPhaLe: false, lyDo: "DAT_GAP", phutConLai: con };
  return { canPhaLe: true, phutConLai: con };
}

/** Mức cảnh báo mốc trên lịch chung (MQ-04; CH-03): dưới mốc → "QUA_MOC" (đỏ); dưới (mốc + cảnh báo) → "SAT_MOC" (vàng); còn lại "BINH_THUONG". */
export function mucMoc(gioMs: number, bayGioMs: number, phut: number, phutCanhBao: number): "QUA_MOC" | "SAT_MOC" | "BINH_THUONG" {
  const con = gioMs - bayGioMs;
  if (con < phut * PHUT) return "QUA_MOC";
  if (con < (phut + phutCanhBao) * PHUT) return "SAT_MOC";
  return "BINH_THUONG";
}

/**
 * Mốc tối thiểu ĐANG HIỆU LỰC (ADR-0049 D2; kế hoạch I25): số phút + khoá dòng chính sách đã dùng. Hàm công bố `mocToiThieuHienHanh` của van-chuyen trả
 * kiểu này; gốc lắp ráp tiêm nó cho orders qua `ctx.mocToiThieu` (Task A10). `null` ở nơi dùng = chưa có chính sách → CHẶN, không đoán con số.
 */
export interface MocToiThieu {
  phut: number;
  policyId: string;
  /** Cảnh báo sát mốc (phút) của CÙNG dòng chính sách (`warn_lead_minutes`) — ruling R-P15: biểu mẫu đơn chưa lưu đọc qua route mốc của cổng orders. */
  canhBaoPhut: number;
}
