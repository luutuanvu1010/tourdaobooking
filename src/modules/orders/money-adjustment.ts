// Luật thuần cho "dòng điều chỉnh" số khách sau xác nhận (ADR-0014 điều 6, Phase B). Không I/O. Tái dùng nguyên `snapshotService`/`buildLines`
// đã có (cơ chế "giá lúc lập đơn" của Q11) — KHÔNG viết logic tính giá mới. Dùng chung cho route ghi (dispatch) và overlay đọc (service.ts).
import type { OrderDetailDto, OrderItemDto, OrderServiceDto } from "../../shared/contracts.ts";
import { availableCodes, buildLines, type GeneratedLine, type PaxCode, type PaxCounts } from "../../shared/order-lines.ts";
import { snapshotService, type StoredService } from "./service-rules.ts";

const PAX_CODES: readonly PaxCode[] = ["adult", "child", "senior", "infant"];

export type Parsed<T> = ({ ok: true } & T) | { ok: false; message: string };

/**
 * Đụng "đã có dòng điều chỉnh với `seq` này" (chỉ mục duy nhất `idx_order_money_adjustment_seq`, migration `0021`) — nghĩa là ai đó vừa ghi
 * trước, KHÔNG phải lỗi hệ thống. Cùng khuôn `isOpenHandlerCollision` (`dispatch/rules.ts`). Dạng lỗi thật (node:sqlite, chỉ mục nhiều cột):
 * "UNIQUE constraint failed: order_money_adjustment.order_id, order_money_adjustment.seq" — D1 có thể thêm tiền tố "D1_ERROR: "/hậu tố
 * ": SQLITE_CONSTRAINT", nên chỉ so khớp một phần chuỗi (không neo đầu/cuối).
 */
export const isAdjustmentSeqCollision = (e: unknown): boolean =>
  e instanceof Error && /UNIQUE constraint failed: order_money_adjustment\.order_id, order_money_adjustment\.seq/.test(e.message);

/** Tính lại số khách/dòng tiền của MỘT dịch vụ từ danh mục theo số khách mới, dùng giá đã chụp lúc lập đơn — không tra danh mục hiện tại. */
export function recomputeService(stored: StoredService, newPax: PaxCounts): Parsed<{ pax: PaxCounts; lines: GeneratedLine[]; subtotal: number }> {
  const snap = snapshotService(stored);
  if (!snap) return { ok: false, message: `Dịch vụ "${stored.name}" không sửa được qua đường này (nhập tay hoặc thiếu giá đã lưu).` };
  const built = buildLines(snap, newPax);
  if (!built.ok) return { ok: false, message: `${stored.name}: ${built.message}` };
  return { ok: true, pax: newPax, lines: built.lines, subtotal: built.lines.reduce((n, l) => n + l.quantity * l.unitPrice, 0) };
}

/** MỘT định nghĩa "pax hợp lệ" cho cả nơi GHI (`parseMoneyEditInput`, ở đây) và nơi ĐỌC (`parseAdjustmentAfter`, ngay dưới). */
export function isPaxCounts(v: unknown): v is PaxCounts {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return PAX_CODES.every((c) => typeof o[c] === "number" && Number.isInteger(o[c]) && (o[c] as number) >= 0);
}

/**
 * MỘT hàm phân tích `after_json` DUY NHẤT — "số khách hiệu lực" của từng dịch vụ của dòng điều chỉnh gần nhất. `repository.ts:getLatestAdjustment`
 * (trang chi tiết MỘT đơn) VÀ `repository.ts:getLatestAdjustments` (danh sách/Trang chủ, nhiều đơn) đều gọi ĐÚNG hàm này để lấy `after` — không
 * còn tự phân tích riêng (kiểm độc lập Đợt E vòng 2 — Lỗi 1: trước bản sửa này, `repository.ts` lọc bằng `isPaxCounts` còn `money-adjustment.ts`
 * (đường chi tiết đơn, qua `applyAdjustmentToOrder`) hoàn toàn KHÔNG lọc — CÙNG một `after_json` hỏng dạng mềm (mảng đọc được, một phần tử thiếu
 * trường `pax`) cho ra HAI số khách khác nhau trên hai bề mặt: `/orders`/Trang chủ đúng số gốc, trang chi tiết hiện số bịa từ dữ liệu thiếu).
 * Dung nạp MỌI kiểu hỏng của `after_json` bằng cách BỎ QUA phần dữ liệu hỏng — KHÔNG BAO GIỜ ném lỗi ra ngoài (Lỗi 2 độc lập đợt này: trước bản
 * sửa này, một phần tử không phải object — vd `null` — làm `applyAdjustedPax`/`applyAdjustmentToOrder` truy cập `.serviceId` trên giá trị đó và
 * ném `TypeError`, không được bắt ở đâu cả nên sập MỌI request `/api/orders`/`/api/orders/dashboard`, cho MỌI nhân viên, không riêng đơn hỏng):
 *  - `after_json` không phải JSON hợp lệ (JSON.parse ném lỗi) → coi như chưa có điều chỉnh nào (mảng rỗng).
 *  - JSON hợp lệ nhưng không phải mảng (object, số, chuỗi, `null`…) → mảng rỗng.
 *  - một phần tử không phải object (`null`, số, chuỗi, mảng con…) → BỎ QUA riêng phần tử đó, các phần tử khác vẫn xét.
 *  - phần tử thiếu `serviceId` (không phải chuỗi) hoặc `pax` không phải `PaxCounts` hợp lệ (thiếu trường, giá trị không phải số nguyên ≥ 0…) →
 *    BỎ QUA riêng phần tử đó — dịch vụ tương ứng rơi về số ĐÃ LƯU (đúng nguyên tắc "sự kiện thay đổi thì các yếu tố phụ thuộc phải đổi theo",
 *    ở đây "sự kiện" là dữ liệu điều chỉnh KHÔNG đáng tin thì "yếu tố phụ thuộc" phải lùi về nguồn còn đáng tin — số đã lưu).
 * KHÔNG kiểm `serviceId` có khớp dịch vụ thật của đơn hay không — đó là việc của `R-ORD-5` (`scripts/audit-checks.mjs`, tầng dữ liệu); một
 * `serviceId` lạ ở đây chỉ đơn giản không khớp dịch vụ nào ở nơi gọi (`Map.get` trả `undefined`), không gây lỗi.
 */
export function parseAdjustmentAfter(afterJson: string): { serviceId: string; pax: PaxCounts }[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(afterJson);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: { serviceId: string; pax: PaxCounts }[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.serviceId === "string" && isPaxCounts(e.pax)) out.push({ serviceId: e.serviceId, pax: e.pax });
  }
  return out;
}

/**
 * Thân `POST /api/orders/:id/handler-money-edit`: `{ reason, services: [{ id, pax }] }`. `storedCatalogServiceIds` = id của mọi dịch vụ TỪ DANH MỤC
 * (không phải nhập tay) hiện có của đơn — thân yêu cầu PHẢI liệt kê ĐÚNG tập này, không thiếu không thừa (mục 6 đặc tả — để `after_json` luôn đủ
 * cho mọi dịch vụ từ danh mục, "trạng thái hiện tại" chỉ cần đọc dòng điều chỉnh gần nhất, không phải gộp nhiều dòng).
 */
export function parseMoneyEditInput(
  body: Record<string, unknown> | null,
  storedCatalogServiceIds: readonly string[],
): Parsed<{ reason: string; services: { id: string; pax: PaxCounts }[] }> {
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) return { ok: false, message: "Cần nhập lý do sửa." };
  if (!Array.isArray(body?.services)) return { ok: false, message: "Thiếu danh sách dịch vụ." };
  const services: { id: string; pax: PaxCounts }[] = [];
  for (const raw of body.services) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Danh sách dịch vụ không hợp lệ." };
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || !storedCatalogServiceIds.includes(r.id)) return { ok: false, message: "Có dịch vụ không thuộc đơn này." };
    if (!isPaxCounts(r.pax)) return { ok: false, message: "Số khách không hợp lệ." };
    services.push({ id: r.id, pax: r.pax });
  }
  const ids = new Set(services.map((s) => s.id));
  if (ids.size !== services.length) return { ok: false, message: "Một dịch vụ bị liệt kê hai lần." };
  if (ids.size !== storedCatalogServiceIds.length || !storedCatalogServiceIds.every((id) => ids.has(id))) {
    return { ok: false, message: "Cần liệt kê đủ mọi dịch vụ từ danh mục của đơn, không thiếu không thừa." };
  }
  return { ok: true, reason, services };
}

const toStoredService = (s: OrderServiceDto): StoredService => ({
  id: s.id,
  catalogCode: s.catalogCode,
  name: s.name,
  unit: s.unit,
  pax: s.pax,
  items: s.items.map((i) => ({ paxCode: i.paxCode, detail: i.detail, catalogPrice: i.catalogPrice })),
});

const toItemDto = (l: GeneratedLine): OrderItemDto => ({
  id: `${l.catalogCode}:${l.pax}`,
  catalogCode: l.catalogCode,
  paxCode: l.pax,
  description: l.description,
  detail: l.detail || null,
  quantity: l.quantity,
  unitPrice: l.unitPrice,
  catalogPrice: l.catalogPrice,
  lineTotal: l.quantity * l.unitPrice,
});

/**
 * Loại khách SỬA ĐƯỢC của một dịch vụ (dùng cho "Việc của tôi" — `orders/index.ts:getMyAssignments`) — tính từ BẢN CHỤP GỐC (mọi loại khách từng
 * có giá đã lưu ở `order_item` lúc xác nhận đơn), KHÔNG phải từ số khách/dòng HIỆN HÀNH. Lý do (lỗi thật tìm được lúc kiểm độc lập 2026-09-22):
 * dịch vụ theo người có nhiều loại khách, một lần sửa trước đưa một loại về 0 khiến `buildLines` bỏ hẳn dòng đó — nếu tính từ items sau overlay,
 * loại khách đó "biến mất" khỏi ô nhập vĩnh viễn dù giá gốc vẫn còn và máy chủ vẫn chấp nhận đặt lại > 0 (`recomputeService` dùng bản chụp, không
 * tra danh mục hiện tại). Gọi hàm này với dịch vụ GỐC (`findOrder`, trước overlay), không phải dịch vụ đã overlay của `loadOrderView`.
 */
export function editablePaxCodesOf(original: OrderServiceDto): readonly PaxCode[] {
  if (original.catalogCode === null) return [];
  const snap = snapshotService(toStoredService(original));
  return snap ? availableCodes(snap) : [];
}

/**
 * Áp dòng điều chỉnh GẦN NHẤT (nếu có) lên đơn để hiển thị SỐ HIỆN HÀNH — KHÔNG đổi gì trong CSDL, chỉ dựng lại DTO trả về. Dịch vụ có mặt trong
 * `after` được tính lại bằng `recomputeService`; dịch vụ vắng mặt (nhập tay, hoặc đơn CHƯA có điều chỉnh — `after = []`) giữ nguyên như đã lưu.
 * An toàn: nếu tính lại lỗi (không nên xảy ra — đã kiểm lúc ghi), giữ dịch vụ đó như đã lưu thay vì làm hỏng cả trang.
 */
export function applyAdjustmentToOrder(order: OrderDetailDto, after: readonly { serviceId: string; pax: PaxCounts }[]): OrderDetailDto {
  const byService = new Map(after.map((a) => [a.serviceId, a.pax]));
  let subtotal = 0;
  const services: OrderServiceDto[] = order.services.map((s) => {
    const own = s.items.reduce((n, i) => n + i.lineTotal, 0);
    const newPax = byService.get(s.id);
    if (!newPax) {
      subtotal += own;
      return s;
    }
    const recomputed = recomputeService(toStoredService(s), newPax);
    if (!recomputed.ok) {
      subtotal += own;
      return s;
    }
    subtotal += recomputed.subtotal;
    return { ...s, pax: recomputed.pax, items: recomputed.lines.map(toItemDto) };
  });
  return { ...order, subtotal, ...effectiveMoney(subtotal, order.discount, order.depositAmount), services };
}

/**
 * `total`/`remainingAmount` từ `subtotal` hiệu lực (gốc hoặc đã cộng điều chỉnh) — `discount`/`depositAmount` KHÔNG đổi qua route sửa số khách
 * (chỉ FIELD sửa số khách/dịch vụ, không đụng cọc/giảm giá). Dùng chung cho overlay CHI TIẾT một đơn (`applyAdjustmentToOrder`) và DANH SÁCH
 * nhiều đơn (`orders/repository.ts:listOrders`) — hai nơi trước đây tính lệch nhau (danh sách hiện số gốc, chi tiết hiện số mới).
 */
export function effectiveMoney(subtotal: number, discount: number, depositAmount: number): { total: number; remainingAmount: number } {
  const total = subtotal - discount;
  return { total, remainingAmount: total - depositAmount };
}
