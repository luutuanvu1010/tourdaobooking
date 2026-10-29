// Đọc ô nhập của màn bảng mức / người bán (thuần). Tỷ lệ lưu bằng PHẦN VẠN nguyên (12,5% = 1250) — không số thực ở bất kỳ đâu.
// Máy chủ vẫn kiểm lại mọi thân gửi (src/modules/pricing/rules.ts); ở đây chỉ để báo lỗi ngay dưới ô trước khi gửi, bằng chữ tiếng Việt.
import { nhanDong } from "./so-dai-ly-nhan.ts";
import { hasLongDigitRun, PHONE_IN_TEXT_MESSAGE } from "./text-guards.ts";
import { isISODate } from "./vn-date.ts";

export function docTyLePhanTram(raw: string): { ok: true; bp: number } | { ok: false; message: string } {
  const s = raw.trim().replace(/%$/, "").trim();
  const m = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(s);
  if (!m) return { ok: false, message: "Tỷ lệ là số từ 0 tới 100, tối đa hai chữ số sau dấu phẩy (vd 12,5)." };
  const bp = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0");
  return bp <= 10_000 ? { ok: true, bp } : { ok: false, message: "Tỷ lệ không quá 100%." };
}

/** Trần «Số tiền mỗi khách» (đồng): MỘT định nghĩa duy nhất — giao diện (ô nhập), `kiemThanMuc` của máy chủ (src/modules/pricing/rules.ts) và thân ghi mức tay (src/modules/orders/thuong-mai.ts) cùng nhập hằng này; bài `src/modules/pricing/tran-moi-khach.test.ts` quét để không ai viết lại số thẳng. */
export const MOI_KHACH_TOI_DA = 100_000_000;

export function docTienMoiKhach(raw: string): { ok: true; dong: number } | { ok: false; message: string } {
  const s = raw.trim().replace(/\./g, "");
  if (!/^\d+$/.test(s)) return { ok: false, message: "Số tiền mỗi khách là số nguyên đồng (vd 50.000)." };
  const dong = Number(s); // số dài tới đâu cũng chỉ là «lớn hơn trần» (dãy rất dài thành Infinity) — nhận đúng câu nói rõ trần, không câu «số nguyên đồng»
  if (dong > MOI_KHACH_TOI_DA) return { ok: false, message: `Số tiền mỗi khách không quá ${nhanDong(MOI_KHACH_TOI_DA)}đ.` };
  return { ok: true, dong };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Đọc cả form thành thân gửi máy chủ. Lỗi gom theo ô (người dùng thấy hết một lượt, không phải sửa từng lỗi một); thân chỉ có khi KHÔNG có lỗi nào.

export type PhamViForm = "SERVICE" | "GROUP" | "ALL";
export type TruongLoi = "doiTuong" | "phamVi" | "muc" | "tuNgay" | "denNgay" | "ghiChu" | "nguoiBan" | "tyLeMua" | "loai" | "mucTa" | "lyDo";
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

/** `theoLoai` (ADR-0133): số tiền trẻ em / người cao tuổi; người lớn là `moiKhach`. Chỉ có khi người dùng bật «tách theo loại khách». */
type MucGui = { kieu: "RATE"; tyLeBp: number } | { kieu: "PER_PAX"; moiKhach: number; theoLoai?: { treEm: number; nguoiCaoTuoi: number } };
/** Ba ô tuỳ chọn «tách theo loại khách» (ADR-0133): công tắc + hai ô tiền; người lớn dùng ô «Số tiền mỗi khách». */
interface FormTheoLoai { theoLoai?: boolean; treEm?: string; nguoiCaoTuoi?: string }
/** Một ô tiền theo loại (ADR-0133 điều 2, sửa 2026-10-19): BẮT BUỘC điền — bỏ trống là lỗi, không tự lấy 0 (không trả thì gõ 0); còn lại cùng luật với ô «Số tiền mỗi khách». */
function docOTheoLoai(raw: string | undefined, ten: string, loi: LoiO[]): number | null {
  if ((raw ?? "").trim() === "") {
    loi.push({ truong: "muc", message: `Nhập số tiền mỗi khách của ${ten}. Không trả thì gõ 0.` });
    return null;
  }
  const r = docTienMoiKhach(raw!);
  if (r.ok) return r.dong;
  loi.push({ truong: "muc", message: `Số tiền ${ten} là số nguyên đồng, không âm, không quá ${nhanDong(MOI_KHACH_TOI_DA)}đ (vd 30.000). Không trả thì gõ 0.` });
  return null;
}
/** Ô «Kiểu mức» + «Phần trăm» / «Số tiền mỗi khách» — dùng chung cho dòng theo loại / đối tác và dòng của mức TA. */
function docMucForm(f: { kieu: "RATE" | "PER_PAX"; tyLe: string; moiKhach: string } & FormTheoLoai, loi: LoiO[]): MucGui | null {
  if (f.kieu === "RATE") {
    const r = docTyLePhanTram(f.tyLe);
    if (r.ok) return { kieu: "RATE", tyLeBp: r.bp };
    loi.push({ truong: "muc", message: r.message });
    return null;
  }
  const r = docTienMoiKhach(f.moiKhach);
  if (!r.ok) {
    loi.push({ truong: "muc", message: r.message });
    return null;
  }
  if (!f.theoLoai) return { kieu: "PER_PAX", moiKhach: r.dong };
  const treEm = docOTheoLoai(f.treEm, "trẻ em", loi), nguoiCaoTuoi = docOTheoLoai(f.nguoiCaoTuoi, "người cao tuổi", loi);
  return treEm === null || nguoiCaoTuoi === null ? null : { kieu: "PER_PAX", moiKhach: r.dong, theoLoai: { treEm, nguoiCaoTuoi } };
}

export interface FormMuc extends FormPhamViNgay, FormTheoLoai {
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
} & MucGui;

/** Thân `POST /api/pricing/hoa-hong` từ các ô của form «Thêm mức». */
export function docThanMuc(f: FormMuc): KetDocForm<ThanMucGui> {
  const loi: LoiO[] = [];
  const dt = f.doiTuong;
  if (dt === null || (dt.loai === "VAI" ? dt.code === "" : dt.partyId === "")) loi.push({ truong: "doiTuong", message: "Chọn một loại đối tác hoặc một đối tác." });
  const pv = docPhamViNgay(f, loi);
  const muc = docMucForm(f, loi);
  if (loi.length > 0 || dt === null || muc === null) return { ok: false, loi };
  return { ok: true, body: { doiTuong: dt, ...pv, ...muc } };
}

/** Ô của hộp «Đổi»: như «Thêm mức» nhưng không có đối tượng / phạm vi (máy chủ chép từ dòng cũ). */
export interface FormDoiMuc extends FormTheoLoai {
  kieu: "RATE" | "PER_PAX";
  tyLe: string;
  moiKhach: string;
  tuNgay: string;
  denNgay: string;
  ghiChu: string;
}
export type ThanDoiMucGui = Omit<PhamViNgayBody, "phamVi" | "catalogCode" | "groupCode"> & MucGui;
/** Thân `POST /api/pricing/hoa-hong/:id/doi` (máy chủ: `kiemThanDoiMuc`): chỉ mức, ngày, ghi chú — KHÔNG mang `doiTuong`, `phamVi`, `catalogCode`, `groupCode`. */
export function docThanDoiMuc(f: FormDoiMuc): KetDocForm<ThanDoiMucGui> {
  const loi: LoiO[] = [];
  const { phamVi: _bo, ...pv } = docPhamViNgay({ phamVi: "ALL", catalogCode: "", groupCode: "", tuNgay: f.tuNgay, denNgay: f.denNgay, ghiChu: f.ghiChu }, loi);
  const muc = docMucForm(f, loi);
  if (loi.length > 0 || muc === null) return { ok: false, loi };
  return { ok: true, body: { ...pv, ...muc } };
}

// ---- Mức TA (ADR-0117 lần 2) ----
/** Ô của form «Thêm dòng» cho một mức TA: như «Thêm mức» nhưng không có «Áp cho» — đích là chính mức (mã mức đi trên đường dẫn). */
export interface FormDongMucTa extends FormPhamViNgay, FormTheoLoai {
  kieu: "RATE" | "PER_PAX";
  tyLe: string;
  moiKhach: string;
}
export type ThanDongMucTaGui = PhamViNgayBody & MucGui;
/** Thân `POST /api/pricing/muc-ta/:code/dong` (máy chủ: `kiemThanDongMucTa`). */
export function docThanDongMucTa(f: FormDongMucTa): KetDocForm<ThanDongMucTaGui> {
  const loi: LoiO[] = [];
  const pv = docPhamViNgay(f, loi);
  const muc = docMucForm(f, loi);
  if (loi.length > 0 || muc === null) return { ok: false, loi };
  return { ok: true, body: { ...pv, ...muc } };
}

/** Ô của form «Gắn loại vào mức TA»: mã loại, mã mức (rỗng = chưa chọn), ngày bắt đầu, ngày kết thúc (không bắt buộc). */
export interface FormGan {
  loai: string;
  muc: string;
  tuNgay: string;
  denNgay: string;
}
export type ThanGanGui = { loai: string; muc: string; tuNgay: string; denNgay?: string };
/** Thân `POST /api/pricing/muc-ta/gan` (máy chủ: `kiemThanGan`). */
export function docThanGan(f: FormGan): KetDocForm<ThanGanGui> {
  const loi: LoiO[] = [];
  const loai = f.loai.trim();
  const muc = f.muc.trim();
  const tu = f.tuNgay.trim();
  const den = f.denNgay.trim();
  if (loai === "") loi.push({ truong: "loai", message: "Chọn một loại đối tác." });
  if (muc === "") loi.push({ truong: "mucTa", message: "Chọn một chính sách." });
  if (!isISODate(tu)) loi.push({ truong: "tuNgay", message: "Chọn ngày bắt đầu." });
  if (den !== "") {
    if (!isISODate(den)) loi.push({ truong: "denNgay", message: "Ngày kết thúc không hợp lệ." });
    else if (isISODate(tu) && den < tu) loi.push({ truong: "denNgay", message: "Ngày kết thúc không được trước ngày bắt đầu." });
  }
  if (loi.length > 0) return { ok: false, loi };
  return { ok: true, body: den === "" ? { loai, muc, tuNgay: tu } : { loai, muc, tuNgay: tu, denNgay: den } };
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

/**
 * Lý do của nút «Sửa» (ADR-0148 Đ1): MỘT luật cho hộp Sửa ở giao diện và cho máy chủ (`kiemSua`, src/modules/pricing/rules.ts) — 10–300 ký tự sau khi bỏ khoảng trắng hai đầu,
 * không dãy số dài (lý do lưu ở `change_reason`, không vào nhật ký).
 */
export function docLyDoSua(raw: unknown): { ok: true; value: string } | { ok: false; message: string } {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (s.length < 10) return { ok: false, message: "Ghi lý do sửa (ít nhất 10 ký tự)." };
  if (s.length > 300) return { ok: false, message: "Lý do tối đa 300 ký tự." };
  if (hasLongDigitRun(s)) return { ok: false, message: PHONE_IN_TEXT_MESSAGE };
  return { ok: true, value: s };
}
