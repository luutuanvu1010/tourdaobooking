// TỆP SQL "NỬA NGHIÊM" của module orders (ADR-0047 A3, Ruling R5; hằng `NUA_NGHIEM` ở src/architecture.test.ts). `orders` còn ở LEGACY (SQL cũ của
// repository.ts chưa đăng ký), nhưng MỌI câu SQL MỚI của orders — chặng đưa đón `ord_transfer_leg`, hành khách `ord_passenger`, số khách hiệu lực —
// nằm ở tệp này, đăng ký bằng `defineSql` (câu TĨNH, tham số ?N) và chịu bài EXPLAIN (chỉ chạm bảng của orders / view công bố / khoá ngoại được phép)
// cùng bài `.prepare(<chuỗi thô>)`. KHÔNG viết câu `ord_*` thô ở repository.ts — repository.ts GỌI các hàm/câu ở đây.
// Import kèm đuôi .ts và KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node): câu nhật ký (`auditStatement`) do nơi
// gọi ghép vào lô.
import { defineSql } from "../../shared/sql-registry.ts";

// ---- Số khách hiệu lực (ADR-0047 A3) -----------------------------------------------------------------------------------------------------------

/** Số khách ĐÃ LƯU của các dịch vụ theo id (mảng JSON ở ?1 — câu vẫn tĩnh dù số id đổi). */
const SERVICE_PAX_BY_IDS = defineSql(
  "orders",
  "service_pax_by_ids",
  `SELECT id, order_id, pax_adult, pax_child, pax_senior, pax_infant FROM order_service WHERE id IN (SELECT value FROM json_each(?1))`,
);

export interface ServicePaxRow {
  id: string;
  order_id: string;
  pax_adult: number;
  pax_child: number;
  pax_senior: number;
  pax_infant: number;
}

/** Dòng số khách đã lưu của các dịch vụ trong `serviceIds` (id lạ: không có dòng). Rỗng → không truy vấn. */
export async function servicePaxByIds(db: D1Database, serviceIds: readonly string[]): Promise<ServicePaxRow[]> {
  if (serviceIds.length === 0) return [];
  return (await db.prepare(SERVICE_PAX_BY_IDS).bind(JSON.stringify(serviceIds)).all<ServicePaxRow>()).results;
}
