// Luật thuần kiểm đầu vào nhập lô vé (ADR-0153; Task 4c). KHÔNG I/O. Mã vé chỉ được che lại 4 ký tự cuối khi trả về người dùng.
import type { Nhom } from "./rules.ts";

/** Mỗi lần thêm vé vào lô: tối đa bấy nhiêu ảnh (cỡ thân yêu cầu giới hạn riêng ở route). */
export const TOI_DA_VE_MOI_DOT = 10;
/** Một lô tối đa bấy nhiêu vé (đủ cho lô 50 vé của nhà cung cấp, có dư). */
export const TOI_DA_VE_MOI_LO = 100;

type Kq<T> = { ok: true; value: T } | { ok: false; message: string };
const NHOM: readonly Nhom[] = ["ADULT", "CHILD", "SENIOR"];
const laNgay = (s: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
};
const chu = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export interface LoMoi { catalogCode: string; nhomKhach: Nhom; tenSanPham: string }
export function kiemLo(raw: Record<string, unknown>): Kq<LoMoi> {
  const catalogCode = chu(raw.catalogCode);
  const nhom = chu(raw.nhomKhach);
  const tenSanPham = chu(raw.tenSanPham);
  if (catalogCode.length < 1 || catalogCode.length > 40) return { ok: false, message: "Chọn dịch vụ cho cả lô." };
  if (!(NHOM as readonly string[]).includes(nhom)) return { ok: false, message: "Chọn nhóm khách của lô: người lớn, trẻ em hoặc cao tuổi." };
  if (tenSanPham.length < 1 || tenSanPham.length > 200) return { ok: false, message: "Nhập tên sản phẩm in trên vé (tối đa 200 chữ)." };
  return { ok: true, value: { catalogCode, nhomKhach: nhom as Nhom, tenSanPham } };
}

export interface VeNhap { maVe: string; tuNgay: string; denNgay: string; gio: string | null }
export function kiemVeMoi(raw: Record<string, unknown>): Kq<VeNhap> {
  const maVe = chu(raw.maVe);
  const tuNgay = chu(raw.tuNgay);
  const denNgay = chu(raw.denNgay);
  const gio = chu(raw.gio);
  if (!/^[A-Za-z0-9._-]{1,40}$/.test(maVe)) return { ok: false, message: "Mã vé không hợp lệ." };
  if (!laNgay(tuNgay) || !laNgay(denNgay)) return { ok: false, message: "Ngày dùng của vé phải dạng năm-tháng-ngày và có thật." };
  if (denNgay < tuNgay) return { ok: false, message: "Ngày dùng đến phải sau hoặc bằng ngày dùng từ." };
  if (gio !== "" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(gio)) return { ok: false, message: "Giờ in trên vé phải dạng giờ:phút." };
  return { ok: true, value: { maVe, tuNgay, denNgay, gio: gio === "" ? null : gio } };
}

/** Che mã vé: chỉ 4 ký tự cuối. Mã đủ không bao giờ ra khỏi máy chủ ở phản hồi nhập lô. */
export const che4SoCuoi = (ma: string): string => (ma.length <= 4 ? "…" : `…${ma.slice(-4)}`);
