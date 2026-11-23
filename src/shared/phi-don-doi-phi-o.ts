// Ô «Đổi phí» của một lượt đón (ADR-0218 Đ1.5, Task 9): giá trị ô ↔ số đổi gửi lên máy chủ. Thuần, dùng ở biểu mẫu đơn và bảng Còn vé. KHÔNG tính tiền: số máy tính là số máy chủ trả
// (`OrderDto.phiDuaDon`). Kiểm bằng ĐÚNG `kiemDoiPhi` của máy chủ nên câu báo giống hệt câu 400. Thay `phi-don-o-chon.ts` (ADR-0214: chọn mức trong danh sách) cho đường đơn.
import { kiemDoiPhi, type DoiPhi } from "./phi-don-gia-goc.ts";
import { CHU_MIEN_PHI, TEN_PHI_DUA_DON, soTien } from "./phi-don-hien-thi.ts";

/** Chữ nút mở ô đổi (tên chờ chủ chọn — `cho-chon`, phương án khuyến nghị «Đổi phí»). */
export const NHAN_NUT_DOI_PHI = "Đổi phí";
export const NHAN_NUT_BO_DOI_PHI = "Bỏ đổi phí";
export const NHAN_O_LY_DO_DOI_PHI = "Lý do đổi phí";
export const NHAN_O_DON_GIA_MOI_KHACH = "Phí mỗi khách (đ)";
export const NHAN_O_DON_GIA_CA_CHUYEN = "Phí cả chuyến (đ)";
export const CHU_CHUA_CO_SO_MAY = "Nền tảng sẽ tính phí khi bạn lưu đơn.";

/** Giá trị ô: `doi` = người lập đang ĐỔI số máy tính (đủ hai ô); `donGia` = chữ ở ô số tiền; `lyDo` = chữ ở ô lý do. */
export interface DoiPhiO { doi: boolean; donGia: string; lyDo: string }
export const O_DOI_PHI_TRONG: DoiPhiO = { doi: false, donGia: "", lyDo: "" };

/** Đọc chữ ô số tiền: chỉ chữ số trần («70000») hoặc ngăn nghìn bằng dấu chấm đúng nhóm ba («70.000»). Dấu chấm thập phân, chữ, dấu trừ, dấu phẩy ⇒ null. */
export function docDonGia(s: string): number | null {
  const t = s.trim();
  if (!/^(\d{1,3}(\.\d{3})+|\d{1,15})$/.test(t)) return null;
  const n = Number(t.replace(/\./g, ""));
  return Number.isSafeInteger(n) ? n : null;
}

/** Ô → số đổi gửi lên: không đổi ⇒ `null` (bỏ đổi — máy tính lại); sai ⇒ câu báo của máy chủ. */
export function doiPhiTuO(o: DoiPhiO): { ok: true; doiPhi: DoiPhi | null } | { ok: false; cau: string } {
  if (!o.doi) return { ok: true, doiPhi: null };
  const k = kiemDoiPhi({ donGia: docDonGia(o.donGia) ?? Number.NaN, lyDo: o.lyDo });
  return k.ok ? { ok: true, doiPhi: k.doiPhi } : { ok: false, cau: k.cau };
}

/** Dòng phí đã lưu → ô (nạp lại đơn nháp): chỉ dòng nguồn DOI_TAY là «đang đổi»; còn lại không đổi. */
export function oTuDong(d: { nguon: "DOI_TAY" | "CHUONG_TRINH" | "GIA_GOC" | null; unitPrice: number; lyDoDoi: string | null } | undefined): DoiPhiO {
  if (!d || d.nguon !== "DOI_TAY") return O_DOI_PHI_TRONG;
  return { doi: true, donGia: String(d.unitPrice), lyDo: d.lyDoDoi ?? "" };
}

const NHAN_NGUON = { DOI_TAY: "đã đổi số", CHUONG_TRINH: "chương trình miễn phí", GIA_GOC: "giá gốc" } as const;
/** Chữ số máy tính của một lượt đã có dòng phí: «50.000 đ × 2 khách (giá gốc)», «Miễn phí (chương trình «…»)». */
export function chuSoMay(d: { nguon: "DOI_TAY" | "CHUONG_TRINH" | "GIA_GOC" | null; kind: "PER_PAX" | "PER_TRIP"; unitPrice: number; quantity: number; tenChuongTrinh: string | null }): string {
  const nguon = d.nguon === null ? "" : d.nguon === "CHUONG_TRINH" && d.tenChuongTrinh ? ` (chương trình «${d.tenChuongTrinh}»)` : ` (${NHAN_NGUON[d.nguon]})`;
  if (d.unitPrice === 0) return `${CHU_MIEN_PHI}${nguon}`;
  return `${soTien(d.unitPrice)} đ × ${d.quantity} ${d.kind === "PER_PAX" ? "khách" : "chuyến"}${nguon}`;
}
export const nhanKhoiSoMay = (): string => `${TEN_PHI_DUA_DON} do Nền tảng tính`;
/** Nhãn ô số tiền theo kiểu lượt (mỗi khách / cả chuyến). */
export const nhanODonGia = (xeRieng: boolean): string => (xeRieng ? NHAN_O_DON_GIA_CA_CHUYEN : NHAN_O_DON_GIA_MOI_KHACH);
