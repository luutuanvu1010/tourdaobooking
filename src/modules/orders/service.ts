// Điều phối có I/O của module orders: dựng ngữ cảnh kiểm (danh mục hiệu lực + dịch vụ đã lưu của đơn) và bản xem đơn kèm
// trạng thái so với danh mục hiện tại. Luật thuần nằm ở rules.ts / service-rules.ts; SQL ở repository.ts.
import type { OrderDetailDto } from "../../shared/contracts";
import { getEffectiveServices } from "../catalog";
import { findOrder, getStoredServices } from "./repository";
import { catalogStatusOf, type ServiceContext } from "./service-rules";

/**
 * Ngữ cảnh cho `validateOrder`: toàn bộ danh mục hiệu lực (~vài chục dòng, kể cả dịch vụ đang ẩn — có cờ `visible`) và, khi SỬA một đơn,
 * các dịch vụ đã lưu của đơn đó (để giữ bản chụp cho nháp cũ).
 */
export async function validationContext(db: D1Database, orderId: string | null): Promise<ServiceContext> {
  const [catalog, stored] = await Promise.all([getEffectiveServices(db), orderId ? getStoredServices(db, orderId) : Promise.resolve([])]);
  return { catalog, stored };
}

/** Đơn đầy đủ; với đơn NHÁP điền thêm `catalogStatus` (giá danh mục đã đổi / dịch vụ đã ẩn) để người sửa biết. */
export async function loadOrderView(db: D1Database, id: string): Promise<OrderDetailDto | null> {
  const order = await findOrder(db, id);
  if (!order || order.status !== "draft") return order;
  const codes = order.services.flatMap((s) => (s.catalogCode ? [s.catalogCode] : []));
  const catalog = await getEffectiveServices(db, codes);
  return { ...order, services: order.services.map((s) => ({ ...s, catalogStatus: catalogStatusOf(s, s.catalogCode ? catalog.get(s.catalogCode) : undefined) })) };
}
