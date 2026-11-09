// Luật THUẦN quét vé Tour Đảo (ADR-0175 Đ3; đặc tả docs/superpowers/specs/2026-11-05-ve-tour-dao-design.md §2.5). Không I/O, không import module.
// Thứ tự kiểm đúng bảng §2.5: mã lạ/hãng ngoài → huỷ → chưa giao → hạn → đã dùng → ba cảnh báo vàng (lệch ngày, chưa thu đủ, vượt số khách) → xanh.
import type { NguonVe } from "./nguon-ve.ts";

export type MauQuet = "DO" | "VANG" | "XANH";
export type MaQuet = "KHONG_PHAI_VE_TD" | "VE_DA_HUY" | "CHUA_GIAO" | "HET_HAN" | "CHUA_TOI_NGAY" | "DA_DUNG" | "LECH_NGAY" | "CHUA_THU_DU" | "VUOT_KHACH" | "HOP_LE";
export type GhiQuet = "DA_TINH" | "CHI_XEM" | "TU_CHOI";

export type VeQuet = {
  nguon: NguonVe;
  trangThaiVe: string;
  trangThaiDon: string | null;
  /** Vé đã được giao cho khách (có phân bổ `revealed_at`). */
  daMo: boolean;
  tuNgay: string;
  denNgay: string;
  daDung: { luc: string; nguoi: string } | null;
  /** Ngày đi hiện hành của dòng dịch vụ; null = chưa có. */
  ngayDi: string | null;
  /** Kết quả `veMoDuocTheoVe` (Trả sau trong hạn là true); false = đơn chưa thu đủ. */
  moTheoTien: boolean;
  soLuotDaTinh: number;
  soKhachHieuLuc: number;
};

export type XacNhanQuet = { lechNgay: boolean; chuaThu: boolean; vuotKhach: boolean };

/** Một nơi khai câu chữ cho người quét. «Đã dùng» được máy chủ nối thêm giờ và tên người. Tên chữ chờ chủ chọn (ADR-0175 mục tên). */
export const CAU_QUET: Readonly<Record<MaQuet, string>> = {
  KHONG_PHAI_VE_TD: "Không phải vé Tour Đảo",
  VE_DA_HUY: "Vé đã huỷ",
  CHUA_GIAO: "Vé chưa được giao cho khách, báo văn phòng",
  HET_HAN: "Vé hết hạn",
  CHUA_TOI_NGAY: "Chưa tới ngày dùng",
  DA_DUNG: "Đã dùng",
  LECH_NGAY: "Ngày đi của đơn khác hôm nay. Bấm xác nhận nếu vẫn cho khách đi",
  CHUA_THU_DU: "Đơn chưa thu đủ, báo văn phòng trước khi thu khách",
  VUOT_KHACH: "Số vé đã dùng đã đủ số khách của đơn. Bấm xác nhận nếu vẫn cho khách đi",
  HOP_LE: "Vé hợp lệ",
};

/** Cảnh báo vàng mà vé này đang gặp (chưa xét người quét đã xác nhận chưa). */
export function canXacNhanQuet(v: VeQuet, homNay: string): XacNhanQuet {
  return {
    lechNgay: v.ngayDi !== null && v.ngayDi !== homNay,
    chuaThu: !v.moTheoTien,
    vuotKhach: v.soLuotDaTinh >= v.soKhachHieuLuc,
  };
}

const DO = (ma: MaQuet): { mau: MauQuet; ma: MaQuet; ghi: GhiQuet | null } => ({ mau: "DO", ma, ghi: "TU_CHOI" });

export function ketQuaQuet(
  v: VeQuet | null,
  ngu: { homNay: string; quyenTinh: boolean; xacNhan: XacNhanQuet },
): { mau: MauQuet; ma: MaQuet; ghi: GhiQuet | null } {
  if (v === null || v.nguon === "HANG_NGOAI") return { mau: "DO", ma: "KHONG_PHAI_VE_TD", ghi: null };
  if (v.trangThaiVe === "VOID" || v.trangThaiDon === "cancelled") return DO("VE_DA_HUY");
  if (!v.daMo || v.trangThaiDon === null) return DO("CHUA_GIAO");
  if (ngu.homNay > v.denNgay) return DO("HET_HAN");
  if (ngu.homNay < v.tuNgay) return DO("CHUA_TOI_NGAY");
  if (v.daDung !== null) return DO("DA_DUNG");
  const can = canXacNhanQuet(v, ngu.homNay);
  if (can.lechNgay && !ngu.xacNhan.lechNgay) return { mau: "VANG", ma: "LECH_NGAY", ghi: null };
  if (can.chuaThu && !ngu.xacNhan.chuaThu) return { mau: "VANG", ma: "CHUA_THU_DU", ghi: null };
  if (can.vuotKhach && !ngu.xacNhan.vuotKhach) return { mau: "VANG", ma: "VUOT_KHACH", ghi: null };
  return { mau: "XANH", ma: "HOP_LE", ghi: ngu.quyenTinh ? "DA_TINH" : "CHI_XEM" };
}
