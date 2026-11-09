// Luật thuần kiểm đầu vào nhập lô vé (ADR-0153; Task 4c). KHÔNG I/O. Mã vé chỉ được che lại 4 ký tự cuối khi trả về người dùng.
import { DANG_MA_VE } from "../../shared/ve-nhap-lo.ts";
import type { NhomLo } from "./rules.ts";
import { DANG_MA_VE_TD } from "../../shared/ma-ve-tour-dao.ts";
import { isNguonVe, type NguonVe } from "../../shared/nguon-ve.ts";

type Kq<T> = { ok: true; value: T } | { ok: false; message: string };
const NHOM_LO: readonly NhomLo[] = ["ADULT", "CHILD", "SENIOR", "ALL"];
const laNgay = (s: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
};
const chu = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export interface LoMoi { catalogCode: string; nhomKhach: NhomLo; tenSanPham: string; nguon: NguonVe }
export function kiemLo(raw: Record<string, unknown>): Kq<LoMoi> {
  const catalogCode = chu(raw.catalogCode);
  const nhom = chu(raw.nhomKhach);
  const tenSanPham = chu(raw.tenSanPham);
  if (catalogCode.length < 1 || catalogCode.length > 40) return { ok: false, message: "Chọn dịch vụ cho cả lô." };
  if (!(NHOM_LO as readonly string[]).includes(nhom)) return { ok: false, message: "Chọn loại khách của lô: người lớn, trẻ em, cao tuổi hoặc mọi loại khách." };
  if (tenSanPham.length < 1 || tenSanPham.length > 200) return { ok: false, message: "Nhập tên sản phẩm in trên vé (tối đa 200 chữ)." };
  // ADR-0175 Đ1.1: thiếu nguồn ⇒ vé hãng ngoài (hành vi cũ không đổi); nguồn lạ ⇒ từ chối, không đoán.
  const nguon = raw.nguon === undefined ? "HANG_NGOAI" : raw.nguon;
  if (!isNguonVe(nguon)) return { ok: false, message: "Chọn Vé do ai phát cho cả lô." };
  return { ok: true, value: { catalogCode, nhomKhach: nhom as NhomLo, tenSanPham, nguon } };
}

export interface VeNhap { maVe: string; tuNgay: string; denNgay: string; gio: string | null }
/** ADR-0175 Đ1.6: lô Tour Đảo chỉ nhận `DANG_MA_VE_TD`; lô hãng ngoài từ chối tiền tố `TD1.`. Câu lỗi không nhắc lại mã. */
export function kiemVeMoi(raw: Record<string, unknown>, nguon: NguonVe): Kq<VeNhap> {
  const maVe = chu(raw.maVe);
  const tuNgay = chu(raw.tuNgay);
  const denNgay = chu(raw.denNgay);
  const gio = chu(raw.gio);
  if (!DANG_MA_VE.test(maVe)) return { ok: false, message: "Mã vé không hợp lệ." };
  if (nguon === "TOUR_DAO" ? !DANG_MA_VE_TD.test(maVe) : maVe.startsWith("TD1.")) return { ok: false, message: "Mã vé không hợp lệ." };
  if (!laNgay(tuNgay) || !laNgay(denNgay)) return { ok: false, message: "Ngày dùng của vé phải dạng năm-tháng-ngày và có thật." };
  if (denNgay < tuNgay) return { ok: false, message: "Ngày dùng đến phải sau hoặc bằng ngày dùng từ." };
  if (gio !== "" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(gio)) return { ok: false, message: "Giờ in trên vé phải dạng giờ:phút." };
  return { ok: true, value: { maVe, tuNgay, denNgay, gio: gio === "" ? null : gio } };
}

/** Che mã vé: chỉ 4 ký tự cuối. Mã đủ không bao giờ ra khỏi máy chủ ở phản hồi nhập lô. */
export const che4SoCuoi = (ma: string): string => (ma.length <= 4 ? "…" : `…${ma.slice(-4)}`);
