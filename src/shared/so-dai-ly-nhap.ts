// Đọc ô nhập của màn bảng mức / người bán (thuần). Tỷ lệ lưu bằng PHẦN VẠN nguyên (12,5% = 1250) — không số thực ở bất kỳ đâu.
// Máy chủ vẫn kiểm lại mọi thân gửi (src/modules/pricing/rules.ts); ở đây chỉ để báo lỗi ngay dưới ô trước khi gửi, bằng chữ tiếng Việt.
import { isISODate } from "./vn-date.ts";

export function docTyLePhanTram(raw: string): { ok: true; bp: number } | { ok: false; message: string } {
  const s = raw.trim().replace(/%$/, "").trim();
  const m = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(s);
  if (!m) return { ok: false, message: "Tỷ lệ là số từ 0 tới 100, tối đa hai chữ số sau dấu phẩy (vd 12,5)." };
  const bp = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0");
  return bp <= 10_000 ? { ok: true, bp } : { ok: false, message: "Tỷ lệ không quá 100%." };
}

export function docTienMoiKhach(raw: string): { ok: true; dong: number } | { ok: false; message: string } {
  const s = raw.trim().replace(/\./g, "");
  if (!/^\d{1,9}$/.test(s)) return { ok: false, message: "Số tiền mỗi khách là số nguyên đồng (vd 50.000)." };
  return { ok: true, dong: Number(s) };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Đọc cả form thành thân gửi máy chủ. Lỗi gom theo ô (người dùng thấy hết một lượt, không phải sửa từng lỗi một); thân chỉ có khi KHÔNG có lỗi nào.

export type PhamViForm = "SERVICE" | "GROUP" | "ALL";
export type TruongLoi = "doiTuong" | "phamVi" | "muc" | "tuNgay" | "denNgay" | "ghiChu" | "nguoiBan" | "tyLeMua";
export interface LoiO {
  readonly truong: TruongLoi;
  readonly message: string;
}
export type KetDocForm<T> = { ok: true; body: T } | { ok: false; loi: LoiO[] };

/** Ghi chú ≤ 200 ký tự (cùng trần với máy chủ; luật «không dãy số dài» chỉ máy chủ giữ — lỗi đó hiện ở dòng báo lỗi chung). */
export const GHI_CHU_MUC_TOI_DA = 200;

interface FormPhamViNgay {
  phamVi: PhamViForm;
  /** Mã dịch vụ đã chọn (rỗng = chưa chọn). */
  catalogCode: string;
  /** Mã nhóm đã chọn (rỗng = chưa chọn). */
  groupCode: string;
  tuNgay: string;
  denNgay: string;
  ghiChu: string;
}
type PhamViNgayBody = { phamVi: PhamViForm; catalogCode?: string; groupCode?: string; tuNgay: string; denNgay?: string; ghiChu?: string };

function docPhamViNgay(f: FormPhamViNgay, loi: LoiO[]): PhamViNgayBody {
  const body: PhamViNgayBody = { phamVi: f.phamVi, tuNgay: f.tuNgay.trim() };
  if (f.phamVi === "SERVICE") {
    if (f.catalogCode.trim() === "") loi.push({ truong: "phamVi", message: "Chọn một dịch vụ." });
    else body.catalogCode = f.catalogCode.trim();
  } else if (f.phamVi === "GROUP") {
    if (f.groupCode.trim() === "") loi.push({ truong: "phamVi", message: "Chọn một nhóm dịch vụ." });
    else body.groupCode = f.groupCode.trim();
  }
  if (!isISODate(body.tuNgay)) loi.push({ truong: "tuNgay", message: "Chọn ngày bắt đầu." });
  const den = f.denNgay.trim();
  if (den !== "") {
    if (!isISODate(den)) loi.push({ truong: "denNgay", message: "Ngày kết thúc không hợp lệ." });
    else if (isISODate(body.tuNgay) && den < body.tuNgay) loi.push({ truong: "denNgay", message: "Ngày kết thúc không được trước ngày bắt đầu." });
    else body.denNgay = den;
  }
  const ghiChu = f.ghiChu.trim();
  if (ghiChu.length > GHI_CHU_MUC_TOI_DA) loi.push({ truong: "ghiChu", message: `Ghi chú tối đa ${GHI_CHU_MUC_TOI_DA} ký tự.` });
  else if (ghiChu !== "") body.ghiChu = ghiChu;
  return body;
}

export interface FormMuc extends FormPhamViNgay {
  /** Áp cho một loại đối tác (mã vai) hoặc một đối tác cụ thể (mã hồ sơ); `null` = chưa chọn. */
  doiTuong: { loai: "VAI"; code: string } | { loai: "DOI_TAC"; partyId: string } | null;
  kieu: "RATE" | "PER_PAX";
  /** Ô «Phần trăm» (khi kieu = RATE). */
  tyLe: string;
  /** Ô «Số tiền mỗi khách» (khi kieu = PER_PAX). */
  moiKhach: string;
}
export type ThanMucGui = PhamViNgayBody & {
  doiTuong: { loai: "VAI"; code: string } | { loai: "DOI_TAC"; partyId: string };
} & ({ kieu: "RATE"; tyLeBp: number } | { kieu: "PER_PAX"; moiKhach: number });

/** Thân `POST /api/pricing/hoa-hong` từ các ô của form «Thêm mức». */
export function docThanMuc(f: FormMuc): KetDocForm<ThanMucGui> {
  const loi: LoiO[] = [];
  const dt = f.doiTuong;
  if (dt === null || (dt.loai === "VAI" ? dt.code === "" : dt.partyId === "")) loi.push({ truong: "doiTuong", message: "Chọn một loại đối tác hoặc một đối tác." });
  const pv = docPhamViNgay(f, loi);
  let muc: { kieu: "RATE"; tyLeBp: number } | { kieu: "PER_PAX"; moiKhach: number } | null = null;
  if (f.kieu === "RATE") {
    const r = docTyLePhanTram(f.tyLe);
    if (r.ok) muc = { kieu: "RATE", tyLeBp: r.bp };
    else loi.push({ truong: "muc", message: r.message });
  } else {
    const r = docTienMoiKhach(f.moiKhach);
    if (r.ok) muc = { kieu: "PER_PAX", moiKhach: r.dong };
    else loi.push({ truong: "muc", message: r.message });
  }
  if (loi.length > 0 || dt === null || muc === null) return { ok: false, loi };
  return { ok: true, body: { doiTuong: dt, ...pv, ...muc } };
}

export interface FormDieuKhoan extends FormPhamViNgay {
  /** Mã hồ sơ người bán (công ty chủ hoặc một nhà cung cấp); rỗng = chưa chọn. */
  nguoiBanPartyId: string;
  /** Người bán đang chọn có phải công ty chủ không — công ty bán thì KHÔNG ghi tỷ lệ mua lại, nhà cung cấp bán thì bắt buộc. */
  laCongTy: boolean;
  /** Ô «Tỷ lệ mua lại» (chỉ đọc khi người bán là nhà cung cấp). */
  tyLeMua: string;
}
export type ThanDieuKhoanGui = PhamViNgayBody & { nguoiBanPartyId: string; tyLeMuaBp?: number };

/** Thân `POST /api/pricing/cung-ung` từ các ô của form «Thêm điều khoản». */
export function docThanDieuKhoan(f: FormDieuKhoan): KetDocForm<ThanDieuKhoanGui> {
  const loi: LoiO[] = [];
  if (f.nguoiBanPartyId.trim() === "") loi.push({ truong: "nguoiBan", message: "Chọn người bán." });
  const pv = docPhamViNgay(f, loi);
  let tyLeMuaBp: number | undefined;
  if (!f.laCongTy && f.nguoiBanPartyId.trim() !== "") {
    const r = docTyLePhanTram(f.tyLeMua);
    if (r.ok) tyLeMuaBp = r.bp;
    else loi.push({ truong: "tyLeMua", message: f.tyLeMua.trim() === "" ? "Nhà cung cấp bán thì phải ghi tỷ lệ Tour Đảo mua lại." : r.message });
  }
  if (loi.length > 0) return { ok: false, loi };
  return { ok: true, body: { ...pv, nguoiBanPartyId: f.nguoiBanPartyId.trim(), ...(tyLeMuaBp === undefined ? {} : { tyLeMuaBp }) } };
}

/** Ngày kết thúc mặc định của hộp «Đóng»: hôm nay, nhưng không trước ngày bắt đầu của dòng (dòng bắt đầu sau hôm nay đóng được từ chính ngày bắt đầu). */
export function ngayDongMacDinh(homNay: string, tuNgay: string): string {
  return tuNgay > homNay ? tuNgay : homNay;
}

/** Thân `POST …/:id/dong`; lỗi nếu ngày không hợp lệ hoặc trước ngày bắt đầu của dòng. */
export function docNgayDong(raw: string, tuNgay: string): { ok: true; body: { denNgay: string } } | { ok: false; message: string } {
  const s = raw.trim();
  if (!isISODate(s)) return { ok: false, message: "Chọn ngày kết thúc." };
  if (s < tuNgay) return { ok: false, message: "Ngày kết thúc không được trước ngày bắt đầu của dòng." };
  return { ok: true, body: { denNgay: s } };
}
