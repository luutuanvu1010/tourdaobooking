// Phần của ORDERS trong lệnh đồng bộ chuyến theo đơn (ADR-0104 Đ2.1, kế hoạch mục 3): số người HIỆU LỰC của từng chặng SAU lệnh và số người lệnh này vừa
// TĂNG ở từng chặng — luật THUẦN, qua ĐÚNG `soNguoiChang` (một luật số người chặng, ADR-0054 D10.3). Không I/O: điểm gọi đọc chặng mở + số khách trước / sau
// từ kế hoạch của chính nó. orders không import van-chuyen — kết quả đi vào `ctx.dongBoChuyen` (gốc lắp ráp nối).
import type { LegDirection, PaxCounts } from "../../shared/contracts";
import { soNguoiChang, tongKhach } from "../../shared/so-nguoi-chang";

/** Chặng mở của đơn — đúng các cột cần cho số người (khuôn `LegRow`). */
export interface ChangSoNguoi {
  id: string;
  order_service_id: string;
  direction: LegDirection;
  pax_override: number | null;
}

export interface SoNguoiSauLenh {
  /** legId → số người của chặng sau lệnh (chỉ chặng có số khách dịch vụ trong `sau`). */
  soNguoiTheoChang: Record<string, number>;
  /** legId → số người lệnh này vừa tăng ở chặng (> 0 mới có mặt) — Q-2 = a: máy chỉ mở thêm tối đa số này. */
  tangTheoChang: Record<string, number>;
}

/**
 * Sửa số khách (văn phòng `money-edit`, HDV `handler-money-edit`): `truoc` / `sau` = số khách hiệu lực của dịch vụ trước / sau lệnh (`soanSuaSoKhach`).
 * Chặng thuộc dịch vụ không có trong `sau` (dịch vụ nhập tay — lệnh không đổi số khách của nó) → không có mặt: máy giữ nguyên chặng đó.
 */
export function soNguoiSauSuaKhach(chang: readonly ChangSoNguoi[], truoc: ReadonlyMap<string, PaxCounts>, sau: ReadonlyMap<string, PaxCounts>): SoNguoiSauLenh {
  const out: SoNguoiSauLenh = { soNguoiTheoChang: {}, tangTheoChang: {} };
  for (const l of chang) {
    const ps = sau.get(l.order_service_id);
    if (!ps) continue;
    const c = { direction: l.direction, paxOverride: l.pax_override };
    const n = soNguoiChang(c, tongKhach(ps));
    const pt = truoc.get(l.order_service_id);
    const tang = n - (pt ? soNguoiChang(c, tongKhach(pt)) : n);
    out.soNguoiTheoChang[l.id] = n;
    if (tang > 0) out.tangTheoChang[l.id] = tang;
  }
  return out;
}
