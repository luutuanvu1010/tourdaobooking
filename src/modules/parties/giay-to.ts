// Luật thuần giấy tờ của NGƯỜI (ADR-0040 D2) — module parties. Không I/O, không SQL (SQL chỉ ở repository.ts). Import bằng đuôi .ts.
// Số giấy tờ và nơi cấp là dữ liệu cá nhân: KHÔNG BAO GIỜ vào nhật ký, Bảng tin, thông báo, câu báo lỗi (ADR-0040 D2). Hàm dựng chi tiết nhật ký dưới đây
// không nhận số hay nơi cấp — lỡ truyền vào ô trước/sau cũng bị bỏ (chỉ nhận ngày YYYY-MM-DD cho lý do về ngày, tên hạng cho lý do về hạng).
import { LOAI_CO_DINH, LY_DO_SUA_SAI, isLyDoSuaSai, kiemNgayCap, kiemNgayHetHan, type LyDoSuaSai, type TruongSua } from "../../shared/giay-to.ts";
import { isISODate } from "../../shared/vn-date.ts";
import type { Result } from "./rules.ts";

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });
const rong = (v: unknown): boolean => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
const squash = (s: string): string => s.trim().replace(/\s+/g, " ");

/** Số đã chuẩn hoá để so trùng (CCCD) và che: NFC, chữ HOA, bỏ khoảng trắng . - / */
export function chuanHoaSo(so: string): string {
  return so.normalize("NFC").toUpperCase().replace(/[\s.\-/]/g, "");
}

/** "••••" + 4 ký tự cuối khi số chuẩn hoá dài ≥ 8; ngắn hơn → "••••" (4 ký tự cuối gần là cả số). null → null. */
export function cheSo(numberKey: string | null): string | null {
  if (numberKey === null) return null;
  return numberKey.length >= 8 ? `••••${numberKey.slice(-4)}` : "••••";
}

/** Danh mục đọc từ CSDL cho một lần kiểm: mọi loại (kể cả đã ngưng — sửa sai dòng cũ vẫn cần `hasExpiry`) và mọi hạng; `homNay` giờ VN. */
export interface DanhMucGiayTo {
  loai: ReadonlyMap<string, { hasExpiry: boolean; active: boolean }>;
  hang: ReadonlyMap<string, { active: boolean }>;
  homNay: string;
}

/** Một dòng giấy tờ đã kiểm (thêm / gia hạn), hoặc dòng hiện hành đọc từ CSDL (sửa sai). `number` = chuỗi người nhập (đã gọn khoảng trắng). */
export interface GiayToNhap {
  typeCode: string;
  number: string | null;
  numberKey: string | null;
  classCode: string | null;
  issuedDate: string | null;
  issuedPlace: string | null;
  expiryDate: string | null;
}

const LOAI_SAI = "Loại giấy tờ không có trong danh mục hoặc đã ngưng dùng.";

/** Số theo loại: CCCD đúng 12 chữ số; GPLX 5–20 ký tự [0-9A-Z]; loại khác không bắt buộc, có thì 1–40 ký tự [0-9A-Z] (sau chuẩn hoá). Câu báo không nhắc số. */
function kiemSo(typeCode: string, raw: unknown): Result<{ number: string | null; numberKey: string | null }> {
  const batBuoc = typeCode === LOAI_CO_DINH.CCCD || typeCode === LOAI_CO_DINH.GPLX;
  if (rong(raw)) return batBuoc ? fail("Cần nhập số của giấy tờ này.") : { ok: true, value: { number: null, numberKey: null } };
  if (typeof raw !== "string") return fail("Số giấy tờ không hợp lệ.");
  const number = squash(raw);
  if (number.length > 40) return fail("Số giấy tờ tối đa 40 ký tự.");
  const numberKey = chuanHoaSo(number);
  if (typeCode === LOAI_CO_DINH.CCCD) {
    if (!/^\d{12}$/.test(numberKey)) return fail("Số căn cước công dân phải đủ 12 chữ số.");
  } else if (typeCode === LOAI_CO_DINH.GPLX) {
    if (!/^[0-9A-Z]{5,20}$/.test(numberKey)) return fail("Số giấy phép lái xe gồm 5–20 chữ số hoặc chữ cái không dấu.");
  } else if (!/^[0-9A-Z]{1,40}$/.test(numberKey)) {
    return fail("Số giấy tờ chỉ gồm chữ số và chữ cái không dấu (có thể có khoảng trắng, dấu chấm, gạch).");
  }
  return { ok: true, value: { number, numberKey } };
}

/** Hạng: bắt buộc với GPLX và phải là hạng đang dùng; loại khác không được có hạng. */
function kiemHang(typeCode: string, raw: unknown, dm: DanhMucGiayTo): Result<string | null> {
  if (typeCode !== LOAI_CO_DINH.GPLX) return rong(raw) ? { ok: true, value: null } : fail("Chỉ giấy phép lái xe mới có hạng.");
  if (typeof raw !== "string" || dm.hang.get(raw)?.active !== true) return fail("Chọn hạng giấy phép lái xe (hạng đang dùng).");
  return { ok: true, value: raw };
}

/** Nơi cấp: để trống được; có thì gọn khoảng trắng, 1–200 ký tự. */
function kiemNoiCap(raw: unknown): Result<string | null> {
  if (rong(raw)) return { ok: true, value: null };
  if (typeof raw !== "string") return fail("Nơi cấp không hợp lệ.");
  const v = squash(raw);
  return v.length > 200 ? fail("Nơi cấp tối đa 200 ký tự.") : { ok: true, value: v };
}

/** Phần chung của thêm và gia hạn: loại (đang dùng), số, hạng, ngày cấp, ngày hết hạn, nơi cấp. */
function kiemDong(typeCode: string, soRaw: unknown, hangRaw: unknown, b: Record<string, unknown>, dm: DanhMucGiayTo): Result<GiayToNhap> {
  const loai = dm.loai.get(typeCode);
  if (!loai || !loai.active) return fail(LOAI_SAI);
  const so = kiemSo(typeCode, soRaw);
  if (!so.ok) return so;
  const hang = kiemHang(typeCode, hangRaw, dm);
  if (!hang.ok) return hang;
  const cap = kiemNgayCap(b.issuedDate, dm.homNay);
  if (!cap.ok) return cap;
  const het = kiemNgayHetHan(b.expiryDate, cap.value, loai.hasExpiry);
  if (!het.ok) return het;
  const noi = kiemNoiCap(b.issuedPlace);
  if (!noi.ok) return noi;
  return { ok: true, value: { typeCode, number: so.value.number, numberKey: so.value.numberKey, classCode: hang.value, issuedDate: cap.value, issuedPlace: noi.value, expiryDate: het.value } };
}

/** Thân POST /api/parties/:id/documents — `{ typeCode, number?, classCode?, issuedDate?, issuedPlace?, expiryDate? }`. */
export function kiemThemGiayTo(body: Record<string, unknown> | null, dm: DanhMucGiayTo): Result<GiayToNhap> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (typeof body.typeCode !== "string") return fail(LOAI_SAI);
  return kiemDong(body.typeCode, body.number, body.classCode, body, dm);
}

/**
 * Gia hạn (POST …/documents/:did/renew): dòng MỚI cùng loại. KHÔNG gửi số (thiếu/null/rỗng) ⇒ CHÉP số của dòng trước — số đầy đủ không bao giờ phải ra
 * trình duyệt để gia hạn (Review Focus 3). Không gửi hạng ⇒ chép hạng của dòng trước (vẫn phải là hạng đang dùng). Ngày cấp, ngày hết hạn, nơi cấp lấy từ thân.
 */
export function kiemGiaHan(body: Record<string, unknown> | null, truoc: { typeCode: string; number: string | null; classCode: string | null }, dm: DanhMucGiayTo): Result<GiayToNhap> {
  const b = body ?? {};
  return kiemDong(truoc.typeCode, rong(b.number) ? truoc.number : b.number, rong(b.classCode) ? truoc.classCode : b.classCode, b, dm);
}

export type SuaSai =
  | { lyDo: LyDoSuaSai; huy: true; expectedUpdatedAt: string }
  | { lyDo: LyDoSuaSai; huy: false; truong: TruongSua; giaTri: string | null; expectedUpdatedAt: string };

/**
 * Sửa sai DÒNG HIỆN HÀNH (POST …/documents/:did/correct) — `{ reason, value?, expectedUpdatedAt }`. Lý do thuộc danh sách đóng `LY_DO_SUA_SAI`; mỗi lý do
 * sửa đúng MỘT trường; giá trị mới phải khác giá trị đang có và qua đúng luật của trường. "Nhập nhầm cả dòng" = huỷ dòng, không nhận giá trị.
 * `dm.loai` phải có loại của dòng (kể cả loại đã ngưng — sửa dữ liệu cũ vẫn được).
 */
export function kiemSuaSai(body: Record<string, unknown> | null, hienHanh: GiayToNhap, dm: DanhMucGiayTo): Result<SuaSai> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  if (!isLyDoSuaSai(body.reason)) return fail("Lý do sửa sai không có trong danh sách — chọn một lý do.");
  if (typeof body.expectedUpdatedAt !== "string" || !body.expectedUpdatedAt) return fail("Thiếu mốc cập nhật (expectedUpdatedAt) — hãy tải lại trang.");
  const lyDo = body.reason;
  const expectedUpdatedAt = body.expectedUpdatedAt;
  const truong = LY_DO_SUA_SAI[lyDo].truong;
  if (truong === null) return body.value === undefined ? { ok: true, value: { lyDo, huy: true, expectedUpdatedAt } } : fail("Huỷ dòng nhập nhầm không kèm giá trị mới.");
  if (!("value" in body)) return fail("Thiếu giá trị mới cho mục cần sửa.");
  const giong = (): { ok: false; message: string } => fail("Giá trị mới giống giá trị đang có — không có gì để sửa.");
  const xong = (giaTri: string | null): Result<SuaSai> => ({ ok: true, value: { lyDo, huy: false, truong, giaTri, expectedUpdatedAt } });
  const loai = dm.loai.get(hienHanh.typeCode);
  switch (truong) {
    case "number": {
      const so = kiemSo(hienHanh.typeCode, body.value);
      if (!so.ok) return so;
      return so.value.numberKey === hienHanh.numberKey ? giong() : xong(so.value.number);
    }
    case "issuedDate": {
      const cap = kiemNgayCap(body.value, dm.homNay);
      if (!cap.ok) return cap;
      if (cap.value !== null && hienHanh.expiryDate !== null && hienHanh.expiryDate < cap.value) return fail("Ngày cấp không được sau ngày hết hạn.");
      return cap.value === hienHanh.issuedDate ? giong() : xong(cap.value);
    }
    case "expiryDate": {
      const het = kiemNgayHetHan(body.value, hienHanh.issuedDate, loai?.hasExpiry ?? true);
      if (!het.ok) return het;
      return het.value === hienHanh.expiryDate ? giong() : xong(het.value);
    }
    case "issuedPlace": {
      const noi = kiemNoiCap(body.value);
      if (!noi.ok) return noi;
      return noi.value === hienHanh.issuedPlace ? giong() : xong(noi.value);
    }
    case "classCode": {
      if (hienHanh.typeCode !== LOAI_CO_DINH.GPLX) return fail("Giấy tờ này không có hạng.");
      const hang = kiemHang(LOAI_CO_DINH.GPLX, body.value, dm);
      if (!hang.ok) return hang;
      return hang.value === hienHanh.classCode ? giong() : xong(hang.value);
    }
  }
}

/**
 * `detail` của nhật ký giấy tờ — CHỈ tên loại, tên hạng, ngày (YYYY-MM-DD), nhãn lý do (ADR-0040 D2: nhật ký không bao giờ chứa số giấy tờ, nơi cấp, chữ tự do
 * của giấy tờ). Chữ ký không có ô số / nơi cấp; `truoc`/`sau` chỉ được dùng cho lý do về NGÀY (phải đúng khuôn YYYY-MM-DD) và về HẠNG (tên hạng) — với lý do
 * khác (số, nơi cấp, huỷ dòng) hàm BỎ QUA chúng, để lỡ truyền số vào cũng không lọt ra nhật ký.
 *   thêm:     "Căn cước công dân (CCCD), hết hạn 2030-01-01" · "Khám sức khoẻ, không hạn" · "Giấy phép lái xe hạng D2, hết hạn 2031-01-01"
 *   gia hạn:  "Giấy phép lái xe hạng D2: gia hạn, hết hạn 2029-01-01 → 2031-01-01"
 *   sửa sai:  "Căn cước công dân (CCCD): Nhập sai ngày hết hạn (2030-01-01 → 2031-01-01)" · "…: Nhập sai số"
 */
export function chiTietNhatKy(v: { loai: string; hang?: string | null; hetHan?: string | null; giaHan?: boolean; lyDo?: LyDoSuaSai; truoc?: string | null; sau?: string | null }): string {
  const ten = v.hang ? `${v.loai} ${v.hang.replace(/^Hạng\b/, "hạng")}` : v.loai;
  const ngay = (d: string | null | undefined): string => (d && isISODate(d) ? d : "không hạn");
  if (v.lyDo) {
    const nhan = LY_DO_SUA_SAI[v.lyDo].nhan;
    const truong = LY_DO_SUA_SAI[v.lyDo].truong;
    if (truong === "issuedDate" || truong === "expiryDate") {
      const hop = (d: string | null | undefined): string | null => (d === null || d === undefined ? "trống" : isISODate(d) ? d : null);
      const [a, b] = [hop(v.truoc), hop(v.sau)];
      return a !== null && b !== null ? `${v.loai}: ${nhan} (${a} → ${b})` : `${v.loai}: ${nhan}`;
    }
    if (truong === "classCode" && v.truoc && v.sau && /^Hạng /.test(v.truoc) && /^Hạng /.test(v.sau) && v.truoc.length <= 60 && v.sau.length <= 60) {
      return `${v.loai}: ${nhan} (${v.truoc} → ${v.sau})`;
    }
    return `${v.loai}: ${nhan}`;
  }
  if (v.giaHan) return `${ten}: gia hạn, hết hạn ${ngay(v.truoc)} → ${ngay(v.sau)}`;
  return `${ten}, ${v.hetHan && isISODate(v.hetHan) ? `hết hạn ${v.hetHan}` : "không hạn"}`;
}
