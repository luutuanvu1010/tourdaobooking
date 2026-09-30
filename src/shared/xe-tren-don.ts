// Luật THUẦN của khối "xe đón" trên chi tiết đơn (ADR-0059) — một nguồn cho giao diện (web/order.ts); máy chủ hỏi CÙNG hai ô ở thân route
// `GET /api/van-chuyen/xe-cua-don/:orderId`. Không I/O, không import module; import kèm đuôi .ts. Test cạnh tệp: xe-tren-don.test.ts.
import type { XeCuaDonXeDto } from "./contracts.ts";
import { NHAN_TRANG_THAI_CHUYEN } from "./dieu-phoi-kieu.ts";
import { can, type PermissionHolder } from "./permissions.ts";

/** Màn chi tiết đơn chỉ gọi route (và chỉ hiện khối) khi CẢ HAI ô đúng, KHÔNG ngữ cảnh: trip.view = any VÀ order.view = any (ADR-0059 điều 4). */
export const duocXemXeTrenDon = (who: PermissionHolder): boolean => can(who, "trip.view") && can(who, "order.view");

export const CHUA_XEP_XE = "Chưa xếp xe";

/** "Xe 79B-123.45 · Tài xế Nguyễn Văn A · 4 khách · Đã lên kế hoạch" — trạng thái đổi sang chữ Việt (không lộ mã thô). */
export function dongXeTrenDon(x: XeCuaDonXeDto): string {
  return [`Xe ${x.bienSo}`, x.tenTaiXe ? `Tài xế ${x.tenTaiXe}` : "Chưa có tài xế", `${x.soKhach} khách`, NHAN_TRANG_THAI_CHUYEN[x.trangThai]].join(" · ");
}
