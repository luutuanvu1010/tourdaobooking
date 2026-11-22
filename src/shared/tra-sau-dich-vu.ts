// Luật THUẦN «Trả sau theo dịch vụ» (ADR-0178 Đ2; điều kiện đơn sửa bởi ADR-0230 Đ1 mục 2). Không I/O, không import module; một nguồn cho cổng Trả sau của máy chủ
// và (sau này) form lập đơn. Test cạnh tệp: tra-sau-dich-vu.test.ts.
// Hàm này KHÔNG xét bên đặt có phải đối tác được hưởng hay không — việc đó của cổng Trả sau ở `billing`. «Có vé» và «Vé do ai phát» truyền vào là giá trị ĐÃ GỘP
// (dòng riêng / nhóm hiện tại) do `catalog` tính (`coVeTheoMa`, `nguonVeTheoMa`); hàm không tự gộp lại.
import type { NguonVe } from "./nguon-ve.ts";

/** Một dấu đang mở (dòng `valid_to IS NULL` của `bil_service_credit_rule`). */
export interface DauDichVu {
  targetKind: "GROUP" | "SERVICE";
  targetCode: string;
  /** Thời hạn trả (giờ, 1..8760). */
  gioTra: number;
  /** Ân hạn (giờ, 0..8760). */
  gioAnHan: number;
}

/** Một dòng dịch vụ của đơn: `ma` null = dòng nhập tay; `nhom` = nhóm hiện tại của dịch vụ (null = Chưa phân loại). */
export interface DichVuXetTraSau {
  ma: string | null;
  nhom: string | null;
  coVe: boolean;
  nguonVe: NguonVe;
}

/**
 * Đơn đủ điều kiện Trả sau theo dịch vụ ⇒ `{ gioTra, gioAnHan }` (nhỏ nhất trên các dịch vụ «Có vé», lấy độc lập); không đủ ⇒ `null`:
 * đơn rỗng; có dòng nhập tay; không có dịch vụ «Có vé» nào; một dịch vụ «Có vé» có nguồn khác Tour Đảo; một dịch vụ «Có vé» không có dấu riêng lẫn dấu nhóm hiện tại.
 * Dịch vụ không «Có vé» bỏ qua (không cần dấu, không tính số giờ). Dấu của một dịch vụ = dấu SERVICE của nó nếu có, không thì dấu GROUP của nhóm nó.
 */
export function dieuKienTraSauDichVu(dichVu: readonly DichVuXetTraSau[], dau: readonly DauDichVu[]): { gioTra: number; gioAnHan: number } | null {
  if (dichVu.length === 0) return null;
  // Nhập tay xét TRƯỚC khi bỏ qua dòng không vé: dòng nhập tay mang cờ không vé vẫn làm cả đơn không đủ điều kiện.
  if (dichVu.some((d) => d.ma === null)) return null;
  const theoDichVu = new Map<string, DauDichVu>();
  const theoNhom = new Map<string, DauDichVu>();
  for (const x of dau) (x.targetKind === "SERVICE" ? theoDichVu : theoNhom).set(x.targetCode, x);
  let gioTra = Infinity;
  let gioAnHan = Infinity;
  let coDichVuVe = false;
  for (const d of dichVu) {
    if (!d.coVe) continue;
    if (d.nguonVe !== "TOUR_DAO") return null;
    const x = theoDichVu.get(d.ma as string) ?? (d.nhom === null ? undefined : theoNhom.get(d.nhom));
    if (x === undefined) return null;
    coDichVuVe = true;
    gioTra = Math.min(gioTra, x.gioTra);
    gioAnHan = Math.min(gioAnHan, x.gioAnHan);
  }
  return coDichVuVe ? { gioTra, gioAnHan } : null;
}
