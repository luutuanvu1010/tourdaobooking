// Chữ hiển thị của ba màn tiền xe thuê (bản vẽ Đợt 4 "Chi phí xe thuê": Bảng giá thuê xe, khối Chi phí chuyến, Bảng kê chi phí xe thuê — ADR-0057, ADR-0095).
// Logic THUẦN, KHÔNG tính tiền: mọi số (tổng, tổng nhóm, tổng cộng, điều chỉnh, số chuyến…) do máy chủ trả; ở đây chỉ định dạng (dấu theo số máy chủ trả, ngày
// dd/mm/yyyy) và đọc số NGƯỜI GÕ ở ô nhập để gửi lên (máy chủ kiểm lại). Không import src/modules (web/CLAUDE.md).
import type { DongChiPhiDto, NhomBangKeDto } from "./contracts.ts";
import type { Tone } from "./dieu-phoi-man.ts";
import { addDays, isISODate } from "./vn-date.ts";

export type ToneTienXe = Tone | "navy";

const nf = new Intl.NumberFormat("vi-VN");
const vnd = (n: number): string => `${nf.format(n)} ₫`;

/** "2026-07-01" → "01/07/2026" (thao tác chuỗi — không lệch múi giờ). */
export const ngayVn = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Cột HIỆU LỰC của bảng giá: "01/07/2026 – đang áp" khi chưa có ngày kết thúc. */
export const hieuLuc = (tuNgay: string, denNgay: string | null): string => `${ngayVn(tuNgay)} – ${denNgay ? ngayVn(denNgay) : "đang áp"}`;

/**
 * Đọc số tiền NGƯỜI GÕ ở ô nhập (gửi lên, máy chủ kiểm). Bỏ dấu chấm, khoảng trắng, "₫", "đ". `coDau` (ô điều chỉnh "+ hoặc −"): nhận "-", "−" (U+2212) hoặc
 * "+" ĐẦU chuỗi — `parseMoney` của web/format.ts bỏ mọi ký tự không phải số nên làm mất dấu trừ. Không đọc được → null.
 */
export function docSoTien(text: string, o: { coDau?: boolean } = {}): number | null {
  let t = text.replace(/[\s.₫đĐ]/g, "");
  let dau = 1;
  if (o.coDau && /^[-−+]/.test(t)) {
    dau = t[0] === "+" ? 1 : -1;
    t = t.slice(1);
  }
  if (!/^\d{1,13}$/.test(t)) return null;
  const n = Number(t);
  return dau < 0 ? -n : n;
}

/**
 * Câu báo dưới ô số tiền khi người gõ chưa đúng ĐỊNH DẠNG (vòng vá 1 Đợt 4, L3) — để không gửi 0 rồi nhận câu máy chủ về số 0. Chỉ kiểm định dạng
 * bằng `docSoTien`; KHÔNG kiểm giá trị (số 0, số âm ở ô điều chỉnh… máy chủ quyết). null = đọc được.
 */
export function loiSoTien(text: string, o: { coDau?: boolean } = {}): string | null {
  if (text.trim() === "") return "Nhập số tiền.";
  return docSoTien(text, o) === null ? `Không đọc được số tiền — chỉ gõ chữ số${o.coDau ? ", có thể thêm + hoặc − ở đầu" : ""} (ví dụ 1.250.000).` : null;
}

/** "+ 450.000 ₫" / "− 400.000 ₫" — dấu theo số máy chủ trả (định dạng, không tính). */
export const soTienCoDau = (n: number): string => `${n < 0 ? "−" : "+"} ${vnd(Math.abs(n))}`;

/** Trạng thái dòng giá (máy chủ gắn theo ngày xem) → nhãn + tông chip (bản vẽ 1a: Đang áp xanh lá, Sắp áp xanh biển, Đã kết thúc xám). */
export const NHAN_TRANG_THAI_GIA: Readonly<Record<"DANG_AP" | "SAP_AP" | "DA_KET_THUC", { nhan: string; tone: ToneTienXe }>> = {
  DANG_AP: { nhan: "Đang áp", tone: "ok" },
  SAP_AP: { nhan: "Sắp áp", tone: "unit" },
  DA_KET_THUC: { nhan: "Đã kết thúc", tone: "muted" },
};

/** Gợi ý dưới ô "Từ ngày" của form Đổi giá (bản vẽ 1a). Chỉ định dạng ngày người gõ — máy chủ quyết ngày đóng dòng cũ. */
export const goiYDoiGia = (tuNgay: string): string =>
  isISODate(tuNgay) ? `Dòng cũ sẽ kết thúc ngày ${ngayVn(addDays(tuNgay, -1))}, dòng mới bắt đầu ngày ${ngayVn(tuNgay)}.` : "";

/** Chip loại của một dòng chi phí (bản vẽ 1b). Lý do "Phí huỷ muộn" là điều chỉnh tông đỏ. */
export function chipDongChiPhi(d: Pick<DongChiPhiDto, "loai" | "lyDo">): { nhan: string; tone: ToneTienXe } {
  switch (d.loai) {
    case "SNAPSHOT": return { nhan: "Giá bảng", tone: "ok" };
    case "AGREED": return { nhan: "Giá thoả thuận", tone: "ok" };
    case "REVERSAL": return { nhan: "Đảo", tone: "muted" };
    default: return d.lyDo?.ma === "CPX_HUY_MUON" ? { nhan: "Điều chỉnh · phí huỷ", tone: "danger" } : { nhan: "Điều chỉnh", tone: "unit" };
  }
}

/** Nguồn giá của chuyến (máy chủ trả) → chip. */
export const NHAN_NGUON_GIA: Readonly<Record<"BANG" | "THOA_THUAN" | "NULL", { nhan: string; tone: ToneTienXe }>> = {
  BANG: { nhan: "Giá bảng", tone: "ok" },
  THOA_THUAN: { nhan: "Giá thoả thuận", tone: "ok" },
  NULL: { nhan: "Chưa có giá", tone: "warn" },
};

/**
 * Nguồn giá kèm trạng thái huỷ (vòng vá 1 Đợt 4, L2): chuyến ĐÃ HUỶ mà máy chủ trả nguồn giá rỗng (mọi dòng đã đảo) thì "Chưa có giá" là tông
 * trung tính — không còn việc phải làm; chuyến chưa huỷ giữ tông cảnh báo. Chữ giữ đúng nguồn máy chủ trả, không tự suy "Giá bảng".
 */
export function nhanNguonGia(nguonGia: "BANG" | "THOA_THUAN" | null, daHuy: boolean): { nhan: string; tone: ToneTienXe } {
  const n = NHAN_NGUON_GIA[nguonGia ?? "NULL"];
  return nguonGia === null && daHuy ? { nhan: n.nhan, tone: "muted" } : n;
}

/** Năm nhóm trạng thái của bảng kê (máy chủ phân nhóm) → nhãn + tông (bản vẽ 1c: Đang chạy nền đậm, Chưa chạy xanh biển). Thứ tự = thứ tự ô lọc. */
export const NHAN_NHOM_BANG_KE: Readonly<Record<NhomBangKeDto, { nhan: string; tone: ToneTienXe }>> = {
  DA_PHAT_SINH: { nhan: "Đã phát sinh", tone: "ok" },
  CHUA_CHAY: { nhan: "Chưa chạy", tone: "unit" },
  DANG_CHAY: { nhan: "Đang chạy", tone: "navy" },
  DA_HUY: { nhan: "Đã huỷ", tone: "danger" },
  THIEU_GIA: { nhan: "Chưa có giá", tone: "warn" },
};

/** Dòng tóm tắt đầu bảng kê — số do máy chủ đếm (`soChuyen`, `soNhaXe`, `soThieuGia`). */
export const tomTatBangKe = (r: { soChuyen: number; soNhaXe: number; soThieuGia: number }): string =>
  [`${r.soChuyen} chuyến`, `${r.soNhaXe} nhà xe`, r.soThieuGia > 0 ? `${r.soThieuGia} chuyến chưa có giá` : null].filter(Boolean).join(" · ");

/** Cột ĐIỀU CHỈNH của bảng kê (câu 4.2: SỐ TIỀN máy chủ tính — `tongDieuChinh`) + dòng phụ số điều chỉnh bị đảo do đổi chuyến. */
export function dongDieuChinhBangKe(d: { tongDieuChinh: number; soDieuChinh: number; soDieuChinhBiDao: number }): { so: string; am: boolean; phu: string } {
  const so = d.soDieuChinh === 0 ? "—" : d.tongDieuChinh === 0 ? vnd(0) : soTienCoDau(d.tongDieuChinh);
  return { so, am: d.tongDieuChinh < 0, phu: d.soDieuChinhBiDao > 0 ? `${d.soDieuChinhBiDao} điều chỉnh bị đảo do đổi chuyến` : "" };
}
