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
