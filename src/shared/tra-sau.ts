// Luật thuần của thanh toán trả sau theo hạn mức (ADR-0168). Không I/O; dùng chung máy chủ và giao diện.
// Tiền `INTEGER` VNĐ. Hạn trả theo GIỜ (ADR-0172 Đ3): mốc là dấu thời gian ISO UTC do `toISOString()` sinh, so bằng chuỗi (hai bên cùng dạng) — người gọi truyền `bayGio`.
import { vnToday } from "./vn-date.ts";

export type HinhThucThanhToan = "PREPAID" | "CREDIT";

/** Nhãn hiện cho người dùng (trạng thái thô không lộ ra giao diện). */
export const NHAN_HINH_THUC: Record<HinhThucThanhToan, string> = { PREPAID: "Thanh toán ngay", CREDIT: "Trả sau" };

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

/** Lô mang câu gác phiên bản hạn mức thua (trigger `bil_credit_guard_version` — có lệnh khác vừa đổi hạn mức / nợ của cùng bên). MỘT nơi nhận dạng cho mọi module (orders, parties). */
export const laLoiPhienBanTraSau = (e: unknown): boolean => /\bcredit_version_stale:/.test(e instanceof Error ? e.message : String(e));

/** `tra_sau_dich_vu_khong_dau` (ADR-0230 Đ1 mục 4): đơn đã xác nhận theo dịch vụ mà lần sửa làm đơn hết đủ điều kiện. */
export type MaKhongTraSau = "khong_co_han_muc" | "vuot_han_muc" | "co_don_qua_han" | "tra_sau_dich_vu_khong_dau";
/** Loại Trả sau chụp lên đơn lúc xác nhận (`orders.credit_basis`, migration 0187). */
export type CoSoTraSau = "LIMIT" | "SERVICE";
/** Tên hiện của hai loại (docs/BANG-THAM-CHIEU.md: «Trả sau theo dịch vụ»). */
export const NHAN_CO_SO_TRA_SAU: Record<CoSoTraSau, string> = { LIMIT: "Trả sau theo hạn mức", SERVICE: "Trả sau theo dịch vụ" };
export const CAU_TRA_SAU_DICH_VU_KHONG_DAU =
  "Đơn trả sau theo dịch vụ chỉ nhận dịch vụ vé Tour Đảo có dấu Trả sau theo dịch vụ. Bỏ dịch vụ này, hoặc huỷ đơn và lập lại với hình thức khác.";

/**
 * Câu hỏi gửi cổng Trả sau (orders → gốc lắp ráp → billing). `maDichVu`: mã danh mục các dòng dịch vụ của đơn (null = dòng nhập tay) — có thì cổng xét được Trả sau theo dịch vụ;
 * vắng ⇒ chỉ xét hạn mức (đổi bên đặt, gộp hồ sơ). `coSo`: ép loại — đơn ĐÃ xác nhận giữ loại đã chụp (sửa tăng): SERVICE hết đủ điều kiện ⇒ `tra_sau_dich_vu_khong_dau`.
 */
export interface HoiTraSau {
  benDat: string;
  soTienDon: number;
  boQuaDon?: string;
  loai?: "sua_tang" | "doi_ben";
  maDichVu?: readonly (string | null)[];
  coSo?: CoSoTraSau;
}

/** Kết quả cổng hạn mức (billing dựng, orders đọc qua `ctx` do gốc lắp ráp tiêm): `version` là phiên bản đã đọc, đưa vào câu gác của lô xác nhận. */
/** `gioTra` / `gioAnHan`: số giờ của LOẠI được chọn (SERVICE: nhỏ nhất của các dấu; LIMIT: của hạn mức) — lô xác nhận chụp hạn trả theo hai số này. `hanMuc` null được ở SERVICE. */
export type KetQuaKiemTraSau =
  | { ok: true; coSo: CoSoTraSau; gioTra: number; gioAnHan: number; hanMuc: HanMucHieuLuc | null; version: number }
  | { ok: false; ma: MaKhongTraSau; cau: string };

const CAU_CO_DON_QUA_HAN = "Bên đặt còn đơn trả sau quá hạn chưa thanh toán. Cần thanh toán đủ các đơn đó trước khi đặt thêm đơn trả sau.";
/** Lý do một đơn không được xác nhận theo Trả sau (ADR-0168 Đ2 mục 3); `null` = được. */
/** `loai: "doi_ben"` (ADR-0188): đổi bên đặt / gộp hồ sơ với `soTienDon: 0` — nơi gọi dùng câu riêng của mình, chỉ đọc `ma`. */
/** `loai: "sua_tang"` (kế hoạch 2026-11-05 Task 3): `soTienDon` là PHẦN TĂNG của một lần sửa số khách đơn đã xác nhận, `noHienTai` gồm cả nợ của chính đơn đó — câu nói «số tiền tăng thêm». */
export function lyDoKhongTraSau(i: { hanMuc: HanMucHieuLuc | null; noHienTai: number; soTienDon: number; coDonQuaHan: boolean; loai?: "sua_tang" | "doi_ben" }): { ma: MaKhongTraSau; cau: string } | null {
  // ADR-0230 Đ1 mục 3 (Kiểm): quá hạn xét TRƯỚC thiếu hạn mức — bên đặt còn đơn Trả sau (bất kỳ loại) hết ân hạn còn nợ luôn nhận «có đơn quá hạn».
  if (i.coDonQuaHan) return { ma: "co_don_qua_han", cau: CAU_CO_DON_QUA_HAN };
  if (!i.hanMuc) return { ma: "khong_co_han_muc", cau: "Bên đặt chưa có hạn mức trả sau còn hiệu lực. Hãy chọn thanh toán ngay, hoặc nhờ Quản trị hay Toàn quyền cấp hạn mức trả sau cho bên đặt." };
  const conLai = Math.max(0, i.hanMuc.hanMuc - i.noHienTai);
  if (i.soTienDon > conLai) {
    return { ma: "vuot_han_muc", cau: `${i.loai === "sua_tang" ? "Số tiền tăng thêm" : "Đơn trả sau"} ${dongTien(i.soTienDon)} vượt hạn mức khả dụng của bên đặt là ${dongTien(conLai)} (hạn mức ${dongTien(i.hanMuc.hanMuc)}, đang nợ ${dongTien(i.noHienTai)}).` };
  }
  return null;
}

/**
 * Chọn LOẠI Trả sau cho một đơn (ADR-0230 Đ1 mục 2–3) — MỘT luật cho cổng lưu, cổng xác nhận, cổng sửa tăng (billing gọi sau khi đọc số).
 * `laDoiTacHuong`: bên đặt đang mang loại đối tác được hưởng hoa hồng (cùng định nghĩa hạn mức — trigger `bil_credit_limit_party_ok`). `dichVu`: kết quả `dieuKienTraSauDichVu`
 * (null = đơn không đủ điều kiện dấu). `noHanMuc`: nợ của các đơn Trả sau theo hạn mức (không gồm nợ theo dịch vụ). `coDonQuaHan`: mọi loại.
 * Đủ điều kiện theo dịch vụ ⇒ SERVICE: không kiểm hạn mức, vẫn chặn khi có đơn quá hạn. Không ⇒ LIMIT như ADR-0168. `coSo` ép loại (đơn đã chụp loại).
 */
export function quyetTraSau(i: {
  laDoiTacHuong: boolean; dichVu: { gioTra: number; gioAnHan: number } | null; hanMuc: HanMucHieuLuc | null; noHanMuc: number; soTienDon: number; coDonQuaHan: boolean;
  loai?: "sua_tang" | "doi_ben"; coSo?: CoSoTraSau;
}): { ok: true; coSo: CoSoTraSau; gioTra: number; gioAnHan: number; hanMuc: HanMucHieuLuc | null } | { ok: false; ma: MaKhongTraSau; cau: string } {
  const theoDichVu = i.coSo !== "LIMIT" && i.laDoiTacHuong ? i.dichVu : null;
  if (i.coSo === "SERVICE" && theoDichVu === null) return { ok: false, ma: "tra_sau_dich_vu_khong_dau", cau: CAU_TRA_SAU_DICH_VU_KHONG_DAU };
  if (theoDichVu) {
    if (i.coDonQuaHan) return { ok: false, ma: "co_don_qua_han", cau: CAU_CO_DON_QUA_HAN };
    return { ok: true, coSo: "SERVICE", gioTra: theoDichVu.gioTra, gioAnHan: theoDichVu.gioAnHan, hanMuc: i.hanMuc };
  }
  const ly = lyDoKhongTraSau({ hanMuc: i.hanMuc, noHienTai: i.noHanMuc, soTienDon: i.soTienDon, coDonQuaHan: i.coDonQuaHan, ...(i.loai ? { loai: i.loai } : {}) });
  if (ly) return { ok: false, ...ly };
  return { ok: true, coSo: "LIMIT", gioTra: i.hanMuc!.gioTra, gioAnHan: i.hanMuc!.gioAnHan, hanMuc: i.hanMuc };
}

/**
 * ADR-0198 Đ1 mục 1: «đối tác» = tài khoản giữ quyền Đối tác và KHÔNG giữ quyền Kế toán (cùng cách nhận diện của ADR-0196 mục 1). Chỉ đổi điều người đó NHÌN THẤY
 * (câu báo, chữ trên màn hình, lựa chọn sẵn). Ngoại lệ DUY NHẤT (ADR-0224 Đ2.1, sửa ADR-0198 Đ1.1): cổng lưu đơn `congTraSauKhiLuu` dùng nó để TỪ CHỐI «Thanh toán ngay»
 * khi Trả sau dùng được — chỉ siết, không bao giờ cho thêm quyền.
 */
export const laDoiTacTraSau = (who: { readonly permissions: readonly string[] }): boolean => who.permissions.includes("PARTNER") && !who.permissions.includes("ACCOUNTING");

/** ADR-0198 Đ1.4 (chữ theo cột «Khuyến nghị»): câu vượt hạn mức gửi cho đối tác — không số tiền. */
export const CAU_VUOT_HAN_MUC_DOI_TAC = "Đơn này vượt mức được trả sau. Chọn Thanh toán ngay, hoặc liên hệ Tour Đảo.";

/** Câu của kết quả cổng hạn mức theo NGƯỜI GỬI: đối tác bị chặn vì vượt hạn mức thì nhận câu không số; mã lỗi và mọi câu khác giữ nguyên (ADR-0198 Đ1.4). */
export const cauKhongTraSauChoNguoiGui = (kq: { ma: MaKhongTraSau; cau: string }, laDoiTac: boolean): string =>
  laDoiTac && kq.ma === "vuot_han_muc" ? CAU_VUOT_HAN_MUC_DOI_TAC : kq.cau;

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
