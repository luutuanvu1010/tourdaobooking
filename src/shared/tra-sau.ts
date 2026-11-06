// Luật thuần của thanh toán trả sau theo hạn mức (ADR-0168). Không I/O; dùng chung máy chủ và giao diện.
// Tiền `INTEGER` VNĐ. Hạn trả theo GIỜ (ADR-0172 Đ3): mốc là dấu thời gian ISO UTC do `toISOString()` sinh, so bằng chuỗi (hai bên cùng dạng) — người gọi truyền `bayGio`.
import { vnToday } from "./vn-date.ts";

export type HinhThucThanhToan = "PREPAID" | "CREDIT";

/** Nhãn hiện cho người dùng (trạng thái thô không lộ ra giao diện). */
export const NHAN_HINH_THUC: Record<HinhThucThanhToan, string> = { PREPAID: "Trả trước", CREDIT: "Trả sau" };

export interface HanMucHieuLuc {
  readonly hanMuc: number;
  /** Thời hạn trả (giờ, từ 1) — ADR-0172 Đ3 mục 1. */
  readonly gioTra: number;
  /** Ân hạn (giờ, từ 0). */
  readonly gioAnHan: number;
  readonly tuNgay: string;
  readonly denNgay: string | null;
}

/** Số tiền hiện cho người dùng: «5.000.000 ₫». */
export const dongTien = (n: number): string => `${Math.trunc(n).toLocaleString("vi-VN")} ₫`;
/** Lý do giữ bước «Đã giao» của đơn Trả sau còn nợ (ADR-0168 Đ3 mục 2) — MỘT câu cho máy chủ và giao diện. */
export const cauChoDoiTacThanhToan = (no: number): string => `Đơn trả sau còn nợ ${dongTien(no)} — chờ đối tác thanh toán.`;
/** Vé chưa mở của đơn Trả sau đã quá hạn còn nợ (ADR-0168 Đ3 mục 1): vé đã mở vẫn xem được. */
export const CAU_VE_QUA_HAN_TRA_SAU = "Đơn trả sau đã quá hạn còn nợ nên vé chưa mở chưa xem hoặc gửi được. Hãy thu đủ tiền, hoặc nhờ Kế toán xử lý.";
/** Cùng tình huống, câu cho người giữ quyền Đối tác: họ không ghi được khoản thu nên không bảo «thu đủ tiền». */
export const CAU_VE_QUA_HAN_TRA_SAU_DOI_TAC = "Đơn trả sau đã quá hạn nên chưa mở được thêm vé. Bạn thanh toán phần còn nợ cho công ty để mở lại.";

/**
 * Nợ của MỘT đơn Trả sau đã xác nhận (ADR-0168 Đ2 mục 2) = max(0, phải thu − số đã về công ty).
 * Số đã về công ty = tổng đã thu ròng − khoản đang chờ đối chiếu − khoản bên đặt tự ghi mà chưa nộp về công ty (kẹp 0).
 * Trả dư ở đơn này không làm nhẹ đơn khác (hàm chỉ nhìn một đơn). Đơn huỷ: không nợ.
 */
export function noMotDon(i: { daHuy: boolean; phaiThu: number; daThuRong: number; dangDoiChieu: number; benDatDangGiu: number }): number {
  if (i.daHuy) return 0;
  const ve = Math.max(0, i.daThuRong - i.dangDoiChieu - i.benDatDangGiu);
  return Math.max(0, i.phaiThu - ve);
}

const GIO_MS = 3_600_000;
/** Trần thợ đặt cho mỗi số giờ (thời hạn trả, ân hạn) để chặn nhập nhầm: 365 ngày (ADR-0172 Đ3 mục 1). */
export const GIO_TOI_DA = 8760;
/** Số giờ thời hạn trả từ 1, ân hạn từ 0, cả hai nguyên và ≤ `GIO_TOI_DA`. */
export function kiemSoGio(gio: unknown, toiThieu: 0 | 1): boolean {
  return typeof gio === "number" && Number.isInteger(gio) && gio >= toiThieu && gio <= GIO_TOI_DA;
}
const congGio = (iso: string, gio: number): string => new Date(Date.parse(iso) + gio * GIO_MS).toISOString();
/** Hạn trả = giờ xác nhận + thời hạn (tính liên tục cả đêm, cuối tuần, ngày lễ — ADR-0173 Đ2 mục 1). Chụp một lần lúc xác nhận. */
export const hanTraTu = (xacNhanLuc: string, gio: number): string => congGio(xacNhanLuc, gio);
/** Hết ân hạn = hạn trả + ân hạn. */
export const hetAnHanTu = (hanTra: string, gioAnHan: number): string => congGio(hanTra, gioAnHan);
/** Cột ngày cũ `term_days` (giữ để lùi về bản trước an toàn, migration 0143): trần giờ/24, kẹp 1..365. */
export const soNgayTuongThich = (gio: number): number => Math.min(365, Math.max(1, Math.ceil(gio / 24)));
/** Cột ngày cũ `credit_due_date`: ngày Việt Nam của mốc. */
export const ngayCuaMoc = (iso: string): string => vnToday(new Date(iso));

export type TrangThaiHan = "trong_han" | "an_han" | "qua_han";
/**
 * ADR-0172 Đ3 mục 3: tới đúng hạn trả vẫn trong hạn; sau hạn trả tới hết ân hạn (kể cả đúng mốc) là ân hạn — chỉ báo; sau mốc hết ân hạn còn nợ là quá hạn — áp luật chặn
 * của ADR-0168. Hết nợ thì luôn «trong_han». So chuỗi ISO (Đ3 mục 4: dấu thời gian đầy đủ, không so theo ngày).
 */
export function trangThaiHan(i: { hanTra: string | null; hetAnHan: string | null; bayGio: string; no: number }): TrangThaiHan {
  if (i.no <= 0 || i.hanTra === null) return "trong_han";
  if (i.hetAnHan !== null && i.bayGio > i.hetAnHan) return "qua_han";
  return i.bayGio > i.hanTra ? "an_han" : "trong_han";
}
/** «Quá hạn» theo nghĩa CHẶN (hết ân hạn còn nợ). Trong ân hạn trả false. */
export const quaHan = (i: { hanTra: string | null; hetAnHan: string | null; bayGio: string; no: number }): boolean => trangThaiHan(i) === "qua_han";

const MOC_GIO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
export type KetQuaNoiHan = { ok: true; hanMoi: string; hetAnHanMoi: string } | { ok: false; status: 400 | 409; ma: string; cau: string };
/**
 * Nới hạn trả của MỘT đơn (ADR-0173 Đ1 mục 3): bắt buộc lý do; hạn mới phải SAU hạn cũ (không rút ngắn); hết ân hạn mới = hạn mới + số giờ ân hạn của CHÍNH đơn
 * (hết ân hạn cũ − hạn cũ), không theo cài đặt hiện hành. Hạn mới không quá 365 ngày kể từ bây giờ (chặn gõ nhầm năm). Mốc chuẩn hoá về `toISOString()`.
 */
export function kiemNoiHan(i: { hanCu: string; hetAnHanCu: string; hanMoi: unknown; lyDo: unknown; bayGio: string }): KetQuaNoiHan {
  if (typeof i.lyDo !== "string" || i.lyDo.trim().length === 0 || i.lyDo.trim().length > 500) {
    return { ok: false, status: 400, ma: "invalid_input", cau: "Ghi lý do (tối đa 500 chữ) trước khi lùi hạn trả." };
  }
  if (typeof i.hanMoi !== "string" || !MOC_GIO_RE.test(i.hanMoi) || Number.isNaN(Date.parse(i.hanMoi))) {
    return { ok: false, status: 400, ma: "invalid_input", cau: "Chọn ngày và giờ hạn trả mới." };
  }
  const hanMoi = new Date(i.hanMoi).toISOString();
  if (hanMoi <= i.hanCu) return { ok: false, status: 409, ma: "han_moi_khong_sau_han_cu", cau: "Hạn trả mới phải sau hạn trả hiện tại. Không rút ngắn được hạn trả." };
  if (Date.parse(hanMoi) > Date.parse(i.bayGio) + GIO_TOI_DA * GIO_MS) return { ok: false, status: 400, ma: "invalid_input", cau: "Hạn trả mới không được quá 365 ngày kể từ bây giờ." };
  const gioAnHanMs = Math.max(0, Date.parse(i.hetAnHanCu) - Date.parse(i.hanCu));
  return { ok: true, hanMoi, hetAnHanMoi: new Date(Date.parse(hanMoi) + gioAnHanMs).toISOString() };
}

export type LoaiTinNhac = "TRUOC_HAN" | "QUA_HAN";
/** Giờ nhắc trước hạn (ADR-0173 Đ3 mục 2). */
export const GIO_NHAC_TRUOC = 6;
/** Tin nhắc tới lúc gửi (chống lặp do bảng `bil_credit_reminder` lo): trong 6 giờ cuối tới đúng hạn trả ⇒ trước hạn; sau hạn trả ⇒ quá hạn. Hết nợ ⇒ không nhắc. */
export function tinNhacDenLuc(i: { hanTra: string | null; bayGio: string; no: number }): LoaiTinNhac[] {
  if (i.no <= 0 || i.hanTra === null) return [];
  if (i.bayGio > i.hanTra) return ["QUA_HAN"];
  return Date.parse(i.bayGio) >= Date.parse(i.hanTra) - GIO_NHAC_TRUOC * GIO_MS ? ["TRUOC_HAN"] : [];
}

export type MaKhongTraSau = "khong_co_han_muc" | "vuot_han_muc" | "co_don_qua_han";

/** Kết quả cổng hạn mức (billing dựng, orders đọc qua `ctx` do gốc lắp ráp tiêm): `version` là phiên bản đã đọc, đưa vào câu gác của lô xác nhận. */
export type KetQuaKiemTraSau = { ok: true; hanMuc: HanMucHieuLuc; version: number } | { ok: false; ma: MaKhongTraSau; cau: string };

/** Lý do một đơn không được xác nhận theo Trả sau (ADR-0168 Đ2 mục 3); `null` = được. */
/** `loai: "sua_tang"` (kế hoạch 2026-11-05 Task 3): `soTienDon` là PHẦN TĂNG của một lần sửa số khách đơn đã xác nhận, `noHienTai` gồm cả nợ của chính đơn đó — câu nói «số tiền tăng thêm». */
export function lyDoKhongTraSau(i: { hanMuc: HanMucHieuLuc | null; noHienTai: number; soTienDon: number; coDonQuaHan: boolean; loai?: "sua_tang" }): { ma: MaKhongTraSau; cau: string } | null {
  if (!i.hanMuc) return { ma: "khong_co_han_muc", cau: "Bên đặt chưa có hạn mức trả sau còn hiệu lực. Hãy chọn trả trước, hoặc nhờ Quản trị hay Toàn quyền cấp hạn mức trả sau cho bên đặt." };
  if (i.coDonQuaHan) return { ma: "co_don_qua_han", cau: "Bên đặt còn đơn trả sau quá hạn chưa thanh toán. Cần thanh toán đủ các đơn đó trước khi đặt thêm đơn trả sau." };
  const conLai = Math.max(0, i.hanMuc.hanMuc - i.noHienTai);
  if (i.soTienDon > conLai) {
    return { ma: "vuot_han_muc", cau: `${i.loai === "sua_tang" ? "Số tiền tăng thêm" : "Đơn trả sau"} ${dongTien(i.soTienDon)} vượt hạn mức khả dụng của bên đặt là ${dongTien(conLai)} (hạn mức ${dongTien(i.hanMuc.hanMuc)}, đang nợ ${dongTien(i.noHienTai)}).` };
  }
  return null;
}

/**
 * MỘT hàm duy nhất quyết định vé có mở được không (ADR-0168 Đ3 mục 1), thay cho so `thuDu` ở các route vé và giao diện vé.
 * Đơn Trả trước: phải thu đủ. Đơn Trả sau: mở được, trừ khi đã HẾT ÂN HẠN còn nợ mà vé CHƯA mở (vé đã mở vẫn xem được; trong ân hạn chưa chặn — ADR-0172 Đ3 mục 3).
 */
export function moVeDuoc(i: { thuDu: boolean; traSau: { hanTra: string | null; hetAnHan: string | null; no: number } | null; veDaMo: boolean; bayGio: string }): boolean {
  if (!i.traSau) return i.thuDu;
  if (i.veDaMo) return true;
  return !quaHan({ ...i.traSau, bayGio: i.bayGio });
}

/**
 * ADR-0173 Đ3 mục 5: không ngừng được hồ sơ đại lý còn đơn Trả sau chưa trả — MỘT câu cho mọi đường ngừng (ngưng tài khoản, bỏ quyền Đối tác, gỡ vai được hưởng cuối cùng,
 * thực hiện phiếu xoá, gộp hồ sơ). Nêu mã đơn (tối đa 5, còn lại đếm).
 */
export function cauConNoTraSau(maDon: readonly string[]): string {
  const dau = maDon.slice(0, 5).join(", ");
  const them = maDon.length > 5 ? ` và ${maDon.length - 5} đơn khác` : "";
  return `Hồ sơ này còn đơn trả sau chưa trả (${dau}${them}) nên chưa ngừng được. Thu đủ các đơn đó trước.`;
}
