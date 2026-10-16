// Nhãn tiếng Việt của phiếu tự khai (ADR-0124; lát H-3 Gói 2) — MỘT nguồn cho máy chủ (chi tiết nhật ký) và giao diện (trang Tôi). Thuần, không import.
export const NHAN_LOAI_PHIEU: Readonly<Record<string, string>> = { NGAY_SINH: "Ngày sinh", DIA_CHI: "Địa chỉ", GIAY_TO: "Giấy tờ" };
export const NHAN_TRANG_THAI_PHIEU: Readonly<Record<string, string>> = { CHO_XAC_MINH: "Chờ xác minh", DA_CHAP_NHAN: "Đã xác minh", TU_CHOI: "Bị từ chối", RUT: "Đã rút" };
export const nhanLoaiPhieu = (c: string): string => (Object.hasOwn(NHAN_LOAI_PHIEU, c) ? NHAN_LOAI_PHIEU[c]! : "Thông tin");
export const nhanTrangThaiPhieu = (c: string): string => (Object.hasOwn(NHAN_TRANG_THAI_PHIEU, c) ? NHAN_TRANG_THAI_PHIEU[c]! : "Không rõ");
