// LUẬT TIỀN XE THUÊ (ADR-0057 T1 B2, T2 C6) — MỘT nguồn tính (Hiến chương 5.4). Thuần, không I/O, không import module khác. Mọi đường (lô chuyến, route
// chi phí, bảng kê, sổ vàng) đi qua các hàm ở đây; hàng rào src/tien-xe-mot-nguon.test.ts đỏ khi cộng tiền chi phí ở chỗ khác.
export interface CoXe { code: string; min: number; max: number; active: boolean }
export interface DongGiaThue { id: string; carrierPartyId: string; routeCode: string | null; sizeCode: string | null; amount: number; validFrom: string; validTo: string | null }

const HET = "9999-12-31";
const conHieuLuc = (d: { validFrom: string; validTo: string | null }, ngay: string) => d.validFrom <= ngay && ngay <= (d.validTo ?? HET);

/** Cỡ xe suy từ số khách (không kể tài xế — `vc_vehicle.passenger_capacity`), chỉ cỡ đang dùng. Khoảng không chồng (CSDL giữ) ⇒ nhiều nhất một. */
export function coXeCua(soKhach: number, coXe: readonly CoXe[]): string | null {
  return coXe.find((c) => c.active && c.min <= soKhach && soKhach <= c.max)?.code ?? null;
}

/** ADR-0057 B2: dòng đang hiệu lực vào ngày chạy, đúng nhà xe; (1) khớp tuyến VÀ cỡ, (2) khớp tuyến – cỡ trống, (3) khớp cỡ – tuyến trống. Không có → null. */
export function chonDongGiaThue(v: { carrierPartyId: string; routeCode: string | null; sizeCode: string | null; ngayChay: string }, dong: readonly DongGiaThue[]): DongGiaThue | null {
  const cua = dong.filter((d) => d.carrierPartyId === v.carrierPartyId && conHieuLuc(d, v.ngayChay));
  const bac1 = v.routeCode !== null && v.sizeCode !== null ? cua.find((d) => d.routeCode === v.routeCode && d.sizeCode === v.sizeCode) : undefined;
  const bac2 = v.routeCode !== null ? cua.find((d) => d.routeCode === v.routeCode && d.sizeCode === null) : undefined;
  const bac3 = v.sizeCode !== null ? cua.find((d) => d.routeCode === null && d.sizeCode === v.sizeCode) : undefined;
  return bac1 ?? bac2 ?? bac3 ?? null;
}

/** Dòng (khác `boQuaId`) cùng khoá (nhà xe, tuyến, cỡ — trống so với trống) có khoảng ngày giao với dòng mới (hai đầu tính cả). Lớp máy chủ của trigger chồng giá. */
export function dongChongGia(moi: Omit<DongGiaThue, "id" | "amount">, dong: readonly DongGiaThue[], boQuaId?: string): DongGiaThue | null {
  return dong.find((d) => d.id !== boQuaId && d.carrierPartyId === moi.carrierPartyId && d.routeCode === moi.routeCode && d.sizeCode === moi.sizeCode
    && d.validFrom <= (moi.validTo ?? HET) && moi.validFrom <= (d.validTo ?? HET)) ?? null;
}

/** Số tiền dạng chữ cho nhật ký / lời báo: 1200000 → "1.200.000", −150000 → "−150.000" (tất định, không phụ thuộc Intl). */
export const chuTien = (n: number): string => `${n < 0 ? "−" : ""}${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

// ---- T2: chi phí chuyến (ADR-0057 C3, C4, C6, C8) ----------------------------------------------------------------------------------------------------------
export type LoaiDongChiPhi = "SNAPSHOT" | "AGREED" | "ADJUSTMENT" | "REVERSAL";
export interface DongChiPhi { id: string; kind: LoaiDongChiPhi; amount: number; reversesId: string | null; reasonCode: string | null; createdAt: string }
export type TrangThaiChuyenTien = "PLANNED" | "RUNNING" | "ENDED" | "ENDED_INTERRUPTED" | "CANCELLED";

/** MỘT nguồn tính tổng chi phí chuyến (ADR-0057 C6). Dòng đảo là số có dấu ngược ⇒ tổng = cộng mọi dòng. */
export function tongChiPhiChuyen(dong: readonly DongChiPhi[]): number {
  let t = 0;
  for (const d of dong) t += d.amount;
  return t;
}
const daBiDao = (dong: readonly DongChiPhi[]) => new Set(dong.filter((d) => d.kind === "REVERSAL").map((d) => d.reversesId));
/** Dòng còn hiệu lực: không phải dòng đảo, chưa bị đảo. */
export function dongConHieuLuc(dong: readonly DongChiPhi[]): DongChiPhi[] {
  const dao = daBiDao(dong);
  return dong.filter((d) => d.kind !== "REVERSAL" && !dao.has(d.id));
}
/** Nguồn giá còn hiệu lực (SNAPSHOT | AGREED chưa đảo) — nhiều nhất một (trigger một nguồn giá). */
export function nguonGiaConHieuLuc(dong: readonly DongChiPhi[]): DongChiPhi | null {
  return dongConHieuLuc(dong).find((d) => d.kind === "SNAPSHOT" || d.kind === "AGREED") ?? null;
}
/** Mới nhất trước (createdAt giảm dần, rồi id giảm dần) — "gỡ ngược" theo thời gian trong mỗi nhóm dấu. */
const sapXep = (a: DongChiPhi, b: DongChiPhi) => (a.createdAt === b.createdAt ? (a.id < b.id ? 1 : a.id > b.id ? -1 : 0) : a.createdAt < b.createdAt ? 1 : -1);
/**
 * ADR-0057 C8 "thứ tự đảo": các dòng ÂM trước (đảo ⇒ tổng tăng), rồi DƯƠNG (tổng giảm dần về 0) ⇒ trigger "tổng ≥ 0" canh được từng dòng. Trong mỗi nhóm:
 * mới nhất trước (khớp ví dụ vàng V7: đảo phụ thu rồi mới đảo giá bảng).
 */
export function thuTuDaoTatCa(dong: readonly DongChiPhi[]): DongChiPhi[] {
  const con = dongConHieuLuc(dong);
  return [...con.filter((d) => d.amount < 0).sort(sapXep), ...con.filter((d) => d.amount > 0).sort(sapXep)];
}
/** Cờ xe thuê (ADR C2a): chủ là công ty chủ ⇒ 0; chủ đang mở vai nhà xe ⇒ 1; còn lại (đã thôi vai) ⇒ giữ cờ cũ khi đổi xe (cấm hạ), 0 khi tạo mới. */
export function phanLoaiThue(v: { chuXePartyId: string; congTyChuId: string | null; nhaXeDangMo: ReadonlySet<string>; cuRented: 0 | 1 | null }): 0 | 1 {
  if (v.chuXePartyId === v.congTyChuId) return 0;
  if (v.nhaXeDangMo.has(v.chuXePartyId)) return 1;
  return v.cuRented === 1 ? 1 : 0;
}
/** Tổng tiền các ĐIỀU CHỈNH chưa đảo (cột "Điều chỉnh" của bảng kê — đánh giá bản vẽ Đợt 4 Q2). */
export function tongDieuChinh(dong: readonly DongChiPhi[]): number {
  return tongChiPhiChuyen(dongConHieuLuc(dong).filter((d) => d.kind === "ADJUSTMENT"));
}
/** Tổng bảng kê (nhóm nhà xe / toàn bảng) = cộng các tổng chuyến ĐÃ qua `tongChiPhiChuyen`. */
export const tongBangKe = (chuyen: readonly { tong: number }[]): number => chuyen.reduce((t, c) => t + c.tong, 0);
/**
 * Dòng `d` có ĐƯỢC đảo không (luật cấu trúc — nút "Đảo dòng" của màn; máy chủ kiểm lại ở route): không đảo dòng đảo, không đảo dòng đã bị đảo; nguồn giá
 * (SNAPSHOT / AGREED) chỉ đảo khi chuyến còn lập kế hoạch (ADR C4 — trigger `vc_cost_planned_only`). Tổng sau đảo ≥ 0 KHÔNG xét ở đây (lỗi `tong_am` lúc ghi).
 */
export function daoDuoc(dong: readonly DongChiPhi[], d: DongChiPhi, trangThai: TrangThaiChuyenTien): boolean {
  if (d.kind === "REVERSAL" || daBiDao(dong).has(d.id)) return false;
  if (d.kind === "SNAPSHOT" || d.kind === "AGREED") return trangThai === "PLANNED";
  return true;
}
