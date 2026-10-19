// TRẠNG THÁI CỦA MỘT CHẶNG — hình chiếu tính lúc đọc, không lưu cột nào ([TK] §2.5 phần lượt 1; ADR-0049 D1 "lịch chung là hình chiếu"). MỘT nguồn cho bảng
// điều phối, màn tài xế và (lượt 2) màn "dòng dữ liệu". Không I/O, không import module; import kèm đuôi .ts. Test cạnh tệp.
//
//  ĐƠN NHÁP ─xác nhận─► CHƯA XẾP ──xếp đủ suất──► ĐÃ XẾP ──xe xuất bến──► CHỜ ĐÓN ──► ĐÃ ĐÓN n/N ──► ĐÃ TRẢ ──► XONG
//  (chỉ đếm)            ├ sát mốc / quá mốc        ├ xếp một phần             ├ vắng k người
//                       └ đặt gấp (nhãn)           └ (giữ: lý do — của CHUYẾN) └ khách đã huỷ
//  chặng đóng / đơn huỷ mà còn suất đang chiếm chỗ → GIỮ; không còn → ĐÃ BỎ. Xe gián đoạn: suất đã đóng → phần chưa đi quay về CHƯA XẾP.
import type { ChangVao, ChinhSachVao, SuatVao, TrangThaiChuyen } from "./dieu-phoi-kieu.ts";
import { KET_QUA_CUOI_SUAT } from "./dieu-phoi-kieu.ts";
import { mucMoc } from "./moc-toi-thieu.ts";
import { vnLocalToMs } from "./vn-date.ts";

export const TRANG_THAI_CHANG = ["DON_NHAP", "CHUA_XEP", "DA_XEP", "CHO_DON", "DA_DON", "DA_TRA", "XONG", "GIU", "DA_BO"] as const;
export type TrangThaiChang = (typeof TRANG_THAI_CHANG)[number];
export const NHAN_TRANG_THAI_CHANG: Readonly<Record<TrangThaiChang, string>> = {
  DON_NHAP: "Đơn nháp",
  CHUA_XEP: "Chưa xếp",
  DA_XEP: "Đã xếp",
  CHO_DON: "Chờ đón",
  DA_DON: "Đã đón",
  DA_TRA: "Đã trả",
  XONG: "Xong",
  GIU: "Giữ: đơn huỷ hoặc lượt đưa đón đã bỏ còn khách trên xe",
  DA_BO: "Đã bỏ",
};
export const NHAN_CHANG = ["QUA_MOC", "SAT_MOC", "DAT_GAP", "CHUA_CHOT_GIO", "XEP_MOT_PHAN", "THUA_SUAT", "VANG", "KHACH_HUY"] as const;
export type NhanChang = (typeof NHAN_CHANG)[number];

export interface TrangThaiChangRa {
  trangThai: TrangThaiChang;
  nhan: NhanChang[];
  soNguoi: number;
  /** Suất đang mở của chặng trên chuyến chưa huỷ. */
  soDaXep: number;
  /** Đã lên xe + đã trả (ĐÃ ĐÓN n/N). */
  soDaDon: number;
  soDaTra: number;
  soVang: number;
  soKhachHuy: number;
}

const CUOI_CHUYEN: readonly TrangThaiChuyen[] = ["ENDED", "ENDED_INTERRUPTED"];

/**
 * Trạng thái một chặng từ suất của nó (mọi chuyến) và trạng thái các chuyến đó. `suat` có thể chứa suất của chặng khác (bị lọc theo `legId`); `chuyen`
 * cần đủ các chuyến mà suất mở trỏ tới. Nhãn mốc chỉ cho phần CHƯA xếp, khi chặng có giờ và có chính sách (chính sách rỗng → không đoán).
 */
export function trangThaiChang(
  chang: ChangVao,
  suat: SuatVao[],
  chuyen: { id: string; trangThai: TrangThaiChuyen }[],
  chinhSach: ChinhSachVao | null,
  bayGioMs: number,
): TrangThaiChangRa {
  const ttChuyen = new Map(chuyen.map((c) => [c.id, c.trangThai]));
  const mo = suat.filter((s) => s.mo && s.legId === chang.legId && ttChuyen.get(s.tripId) !== "CANCELLED");
  const dem = (xs: readonly string[]) => mo.filter((s) => xs.includes(s.trangThai)).length;
  const soDaDon = dem(["BOARDED", "DROPPED"]);
  const soDaTra = dem(["DROPPED"]);
  const soVang = dem(["NO_SHOW"]);
  const soKhachHuy = dem(["CANCELLED_AT_STOP"]);
  const nhan: NhanChang[] = [];
  const gioMs = chang.ngayDon !== null && chang.gioDon !== null ? vnLocalToMs(chang.ngayDon, chang.gioDon) : null;
  if (mo.length < chang.soNguoi && gioMs !== null && chinhSach) {
    const m = mucMoc(gioMs, bayGioMs, chinhSach.minLeadMinutes, chinhSach.warnLeadMinutes);
    if (m !== "BINH_THUONG") nhan.push(m);
  }
  if (chang.datGap) nhan.push("DAT_GAP");
  if (chang.gioDon === null) nhan.push("CHUA_CHOT_GIO");
  if (mo.length > 0 && mo.length < chang.soNguoi) nhan.push("XEP_MOT_PHAN");
  if (mo.length > chang.soNguoi) nhan.push("THUA_SUAT");
  if (soVang > 0) nhan.push("VANG");
  if (soKhachHuy > 0) nhan.push("KHACH_HUY");
  const ra = (trangThai: TrangThaiChang): TrangThaiChangRa => ({ trangThai, nhan, soNguoi: chang.soNguoi, soDaXep: mo.length, soDaDon, soDaTra, soVang, soKhachHuy });

  if (!chang.donDaXacNhan && !chang.donDaHuy) return ra("DON_NHAP");
  if (chang.donDaHuy || !chang.changMo) return ra(mo.some((s) => s.trangThai === "WAITING" || s.trangThai === "BOARDED") ? "GIU" : "DA_BO");
  if (mo.length === 0) return ra("CHUA_XEP");
  if (mo.every((s) => (KET_QUA_CUOI_SUAT as readonly string[]).includes(s.trangThai))) {
    return ra(mo.every((s) => CUOI_CHUYEN.includes(ttChuyen.get(s.tripId) ?? "PLANNED")) ? "XONG" : "DA_TRA");
  }
  if (soDaDon > 0) return ra("DA_DON");
  if (mo.some((s) => ttChuyen.get(s.tripId) === "RUNNING")) return ra("CHO_DON");
  return ra("DA_XEP");
}
