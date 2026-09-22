// Điều phối có I/O của module orders: dựng ngữ cảnh kiểm (danh mục hiệu lực + dịch vụ đã lưu của đơn) và bản xem đơn kèm
// trạng thái so với danh mục hiện tại. Luật thuần nằm ở rules.ts / service-rules.ts; SQL ở repository.ts.
import type { OrderDetailDto } from "../../shared/contracts";
import { describeBookerChange, type BookerInput } from "../../shared/booker";
import { vnToday } from "../../shared/vn-date";
import { auditStatement } from "../audit";
import { getEffectiveServices } from "../catalog";
import { composePersonName, newPersonStatements, validatePersonFullName, type ContactInput, type RoleInput } from "../parties";
import { applyAdjustmentToOrder } from "./money-adjustment";
import { findOrder, getLatestAdjustment, getStoredServices, type BookerWrite } from "./repository";
import { catalogStatusOf, type ServiceContext } from "./service-rules";

/**
 * Ngữ cảnh cho `validateOrder`: toàn bộ danh mục hiệu lực (~vài chục dòng, kể cả dịch vụ đang ẩn — có cờ `visible`) và, khi SỬA một đơn,
 * các dịch vụ đã lưu của đơn đó (để giữ bản chụp cho nháp cũ).
 */
export async function validationContext(db: D1Database, orderId: string | null): Promise<ServiceContext> {
  const [catalog, stored] = await Promise.all([getEffectiveServices(db), orderId ? getStoredServices(db, orderId) : Promise.resolve([])]);
  return { catalog, stored };
}

/**
 * Đơn đầy đủ; với đơn NHÁP điền thêm `catalogStatus` (giá danh mục đã đổi / dịch vụ đã ẩn) để người sửa biết; với đơn ĐÃ XÁC NHẬN HOẶC ĐÃ HUỶ có
 * dòng điều chỉnh (ADR-0014 điều 6, Phase B), overlay SỐ HIỆN HÀNH (gốc + điều chỉnh gần nhất) — chủ dự án đã chọn: màn hình chính hiện số mới, số
 * gốc xem qua lịch sử đơn (`order.history.view`, đã có). KHÔNG đổi gì trong CSDL ở đây, chỉ dựng lại DTO trả về.
 * CỐ Ý áp cho CẢ đơn đã huỷ (không chỉ đã xác nhận): huỷ đơn (điều 11) không đổi cột tiền, chỉ đổi `status`, nên một đơn từng được sửa số khách
 * rồi bị huỷ sau đó VẪN phải hiện đúng số đã sửa gần nhất — không được "quên" điều chỉnh và lùi lại số gốc chỉ vì đổi trạng thái (bản đầu có lỗi
 * này: chỉ overlay khi `status === "confirmed"`, khiến đơn đã huỷ hiện sai). `draft` không cần xét: không đường nào ghi được điều chỉnh cho đơn
 * nháp (route sửa số khách bắt buộc `status === "confirmed"`), và đơn không có đường quay lại `draft` sau khi đã `confirmed` (`rules.ts` TRANSITIONS).
 */
export async function loadOrderView(db: D1Database, id: string): Promise<OrderDetailDto | null> {
  const order = await findOrder(db, id);
  if (!order) return null;
  if (order.status === "draft") {
    const codes = order.services.flatMap((s) => (s.catalogCode ? [s.catalogCode] : []));
    const catalog = await getEffectiveServices(db, codes);
    return { ...order, services: order.services.map((s) => ({ ...s, catalogStatus: catalogStatusOf(s, s.catalogCode ? catalog.get(s.catalogCode) : undefined) })) };
  }
  const latest = await getLatestAdjustment(db, id);
  return latest ? applyAdjustmentToOrder(order, latest.after) : order;
}

export type ResolvedBooker = { ok: true; write: BookerWrite } | { ok: false; message: string };

/**
 * Người đặt đã kiểm dạng → câu ghi. Hồ sơ có sẵn phải là CÁ NHÂN ĐANG HOẠT ĐỘNG (view công bố `v_pty_party_label`). Hồ sơ mới: cá nhân + SĐT chính +
 * vai CUSTOMER bằng câu của `parties`, CÙNG batch với đơn — ADR-0011 điều 1 (ngoại lệ hẹp của ADR-0007: chỉ hồ sơ MỚI, chỉ CUSTOMER). `current` = người đặt
 * đang lưu trên đơn (để viết mẩu nhật ký "từ A sang B"; tạo đơn = không có).
 */
export async function resolveBooker(
  db: D1Database,
  booker: BookerInput,
  staffId: string,
  now: Date,
  current: { id: string | null; name: string | null } = { id: null, name: null },
): Promise<ResolvedBooker> {
  if (booker.kind === "none") return { ok: true, write: { partyId: null, before: [], note: describeBookerChange(current, { id: null, name: null }) } };
  if (booker.kind === "existing") {
    const row = await db
      .prepare("SELECT display_name, party_kind, active FROM v_pty_party_label WHERE id = ?")
      .bind(booker.partyId)
      .first<{ display_name: string; party_kind: "PERSON" | "ORGANIZATION"; active: number }>();
    if (!row || row.active !== 1) return { ok: false, message: "Hồ sơ khách không còn dùng được, hãy chọn lại." };
    if (row.party_kind !== "PERSON") return { ok: false, message: "Chưa gắn được đại lý vào đơn ở bản này." };
    return { ok: true, write: { partyId: booker.partyId, before: [], note: describeBookerChange(current, { id: booker.partyId, name: row.display_name }) } };
  }
  const name = validatePersonFullName(booker.fullName);
  if (!name.ok) return { ok: false, message: name.message };
  const at = now.toISOString();
  const today = vnToday(now);
  const phone: ContactInput = { kind: "PHONE", value: booker.phone, valueNormalized: booker.phone, label: null, isPrimary: true };
  const role: RoleInput = { roleTypeCode: "CUSTOMER", locationId: null, from: today, to: null };
  const made = newPersonStatements(db, { name: name.value, contacts: [phone], roles: [role], contactsFrom: today }, staffId, at);
  const display = composePersonName(name.value);
  // Nhật ký của hồ sơ: như POST /api/parties (loại + tên), KHÔNG SĐT.
  const log = auditStatement(db, { staffId, action: "party_created", at, targetType: "party", targetId: made.partyId, detail: `cá nhân "${display}" (tạo khi lập/sửa đơn)` });
  return { ok: true, write: { partyId: made.partyId, before: [...made.statements, log], note: describeBookerChange(current, { id: made.partyId, name: display }) } };
}
