// Cổng LUẬT BÁN của `orders` (ADR-0146 Đ3, ADR-0152 Đ2; kế hoạch 2026-10-30 R-2, T8): MỘT hàm cho mọi cửa ghi đơn — lập đơn, lưu nháp, đổi bên đặt, xác nhận (qua dòng đầu
// `kiemCongXacNhan`: `/status`, Gửi đơn, Còn vé), Gửi xác nhận. Không tự đọc bảng nào: chỉ gọi hàm công bố `kiemLuatBan` của `pricing` (nhóm, đặc điểm đọc ở đó qua view của
// catalog). Bài `src/luat-ban-moi-cua.test.ts` canh: mỗi cửa gọi `congLuatBan(`, và không tệp nào khác của `orders` gọi `kiemLuatBan(`.
import { cauBiChan, kiemLuatBan } from "../pricing";
import { error } from "../../shared/http";
import { vnToday } from "../../shared/vn-date";

/**
 * Bên đặt `bookerPartyId` (đã chốt — sau `resolveBooker` / bên đặt đang lưu) + các dòng dịch vụ của đơn. Dòng nhập tay (không mã danh mục) không bị xét. Có luật chặn ⇒ 409
 * `sales_blocked` nêu dịch vụ trúng đầu tiên theo thứ tự trên đơn; không ⇒ null. Ngày xét = ngày Việt Nam lúc thao tác.
 */
export async function congLuatBan(
  db: D1Database,
  v: { bookerPartyId: string | null; dong: readonly { catalogCode: string | null; name: string }[] },
): Promise<Response | null> {
  const ma = v.dong.flatMap((d) => (d.catalogCode ? [d.catalogCode] : []));
  if (!v.bookerPartyId || ma.length === 0) return null;
  const trung = await kiemLuatBan(db, { bookerPartyId: v.bookerPartyId, catalogCodes: ma, ngay: vnToday(new Date()) });
  if (trung.length === 0) return null;
  const biChan = new Set(trung.map((t) => t.catalogCode));
  const dau = v.dong.find((d) => d.catalogCode !== null && biChan.has(d.catalogCode))!;
  const t = trung.find((x) => x.catalogCode === dau.catalogCode)!;
  return error(409, "sales_blocked", cauBiChan({ tenDichVu: dau.name, tenDacDiem: t.tenDacDiem, tenGiaTri: t.tenGiaTri }));
}
