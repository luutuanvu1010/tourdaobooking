// Giấy tờ (ADR-0040 D1, D2) — luật thuần dùng chung server ↔ web/. Không I/O, không import module. Không có số giấy tờ nào ở đây.
// Máy chủ (`parties` cho giấy tờ của người, `van-chuyen` cho giấy tờ xe) và giao diện Phần B cùng import tệp này — một nguồn cho danh sách lý do
// sửa sai, nhãn trạng thái xe, cách tính "còn bao nhiêu ngày" và luật NGÀY chung của mọi giấy tờ (người lẫn xe).
import { isISODate } from "./vn-date.ts";

/** Mã loại giấy tờ CỐ ĐỊNH mà mã nguồn và CHECK/trigger dựa vào (Hiến chương 2.2: đổi bằng ADR, không sửa trong app). */
export const LOAI_CO_DINH = { CCCD: "CCCD", GPLX: "GPLX" } as const;

export type LyDoSuaSai = "SAI_SO" | "SAI_NGAY_CAP" | "SAI_NGAY_HET_HAN" | "SAI_NOI_CAP" | "SAI_HANG" | "NHAP_NHAM_DONG";
export type TruongSua = "number" | "issuedDate" | "expiryDate" | "issuedPlace" | "classCode";

/**
 * Danh sách ĐÓNG lý do sửa sai (ADR-0040 D1: "sửa sai phải có lý do, danh sách đóng"). Mỗi lý do sửa ĐÚNG MỘT trường; NHAP_NHAM_DONG huỷ cả dòng
 * (không xoá — Hiến chương 5.5). `choXe`: lý do dùng được cho giấy tờ XE (giấy tờ xe không có nơi cấp, không có hạng).
 */
export const LY_DO_SUA_SAI: Readonly<Record<LyDoSuaSai, { nhan: string; truong: TruongSua | null; choXe: boolean }>> = {
  SAI_SO: { nhan: "Nhập sai số", truong: "number", choXe: true },
  SAI_NGAY_CAP: { nhan: "Nhập sai ngày cấp", truong: "issuedDate", choXe: true },
  SAI_NGAY_HET_HAN: { nhan: "Nhập sai ngày hết hạn", truong: "expiryDate", choXe: true },
  SAI_NOI_CAP: { nhan: "Nhập sai nơi cấp", truong: "issuedPlace", choXe: false },
  SAI_HANG: { nhan: "Nhập sai hạng", truong: "classCode", choXe: false },
  NHAP_NHAM_DONG: { nhan: "Nhập nhầm cả dòng (huỷ dòng này)", truong: null, choXe: true },
};

export const isLyDoSuaSai = (v: unknown): v is LyDoSuaSai => typeof v === "string" && Object.hasOwn(LY_DO_SUA_SAI, v);

/** Trạng thái xe — tập ĐÓNG, khớp CHECK của migration *_van_chuyen_xe (ADR-0040 D1: đổi bằng ADR). */
export const TRANG_THAI_XE = { active: "Đang dùng", maintenance: "Bảo dưỡng", retired: "Ngừng dùng" } as const;
export type TrangThaiXe = keyof typeof TRANG_THAI_XE;
export const isTrangThaiXe = (v: unknown): v is TrangThaiXe => typeof v === "string" && Object.hasOwn(TRANG_THAI_XE, v);

const MOT_NGAY_MS = 24 * 60 * 60 * 1000;
const ngayUtc = (d: string): number => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));

/**
 * Số ngày từ `homNay` tới `hetHan` (ngày dân sự "YYYY-MM-DD", giờ VN); âm = đã quá hạn. Tính bằng `Date.UTC` của hai chuỗi ngày — không
 * `new Date(chuỗi)` theo múi giờ của máy (máy chủ Worker chạy UTC, điện thoại chạy giờ VN: hai nơi phải ra cùng một số).
 */
export function soNgayConLai(hetHan: string, homNay: string): number {
  return Math.round((ngayUtc(hetHan) - ngayUtc(homNay)) / MOT_NGAY_MS);
}

export type MucHan = "khong-han" | "con-han" | "sap-het" | "het-han";

/** null → "khong-han"; < 0 → "het-han"; 0..nguong → "sap-het" (hôm nay vẫn còn hạn trong ngày); còn lại "con-han". */
export function mucHan(hetHan: string | null, homNay: string, nguongNgay: number): MucHan {
  if (hetHan === null) return "khong-han";
  const con = soNgayConLai(hetHan, homNay);
  if (con < 0) return "het-han";
  return con <= nguongNgay ? "sap-het" : "con-han";
}

export type KetQua<T> = { ok: true; value: T } | { ok: false; message: string };
const rong = (v: unknown): boolean => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

/** Ngày cấp (giấy tờ người lẫn xe): để trống được; có thì "YYYY-MM-DD" đúng lịch và không sau hôm nay (giờ VN, `homNay` do máy chủ đưa). */
export function kiemNgayCap(raw: unknown, homNay: string): KetQua<string | null> {
  if (rong(raw)) return { ok: true, value: null };
  if (typeof raw !== "string" || !isISODate(raw.trim())) return { ok: false, message: "Ngày cấp không hợp lệ (YYYY-MM-DD)." };
  if (raw.trim() > homNay) return { ok: false, message: "Ngày cấp không được sau hôm nay." };
  return { ok: true, value: raw.trim() };
}

/**
 * Ngày hết hạn: để trống = không hạn (ADR-0040 D1). Loại giấy tờ "không có hạn" (`coHan` false) thì không được có ngày hết hạn; có thì "YYYY-MM-DD"
 * đúng lịch và không trước ngày cấp.
 */
export function kiemNgayHetHan(raw: unknown, ngayCap: string | null, coHan: boolean): KetQua<string | null> {
  if (rong(raw)) return { ok: true, value: null };
  if (!coHan) return { ok: false, message: "Loại giấy tờ này không có ngày hết hạn — để trống ô ngày hết hạn." };
  if (typeof raw !== "string" || !isISODate(raw.trim())) return { ok: false, message: "Ngày hết hạn không hợp lệ (YYYY-MM-DD)." };
  if (ngayCap !== null && raw.trim() < ngayCap) return { ok: false, message: "Ngày hết hạn phải từ ngày cấp trở đi." };
  return { ok: true, value: raw.trim() };
}
