// Luật thuần cho "dòng điều chỉnh" số khách sau xác nhận (ADR-0014 điều 6, Phase B). Không I/O. Tái dùng nguyên `snapshotService`/`buildLines`
// đã có (cơ chế "giá lúc lập đơn" của Q11) — KHÔNG viết logic tính giá mới. Dùng chung cho route ghi (dispatch) và overlay đọc (service.ts).
import type { OrderDetailDto, OrderItemDto, OrderServiceDto } from "../../shared/contracts.ts";
import { CAU_THIEU_NGUOI_LON, suaDuaVeKhongNguoiLon } from "../../shared/nguoi-di-kem.ts";
import { PAX_ORDER, availableCodes, thanhTienDong, type GeneratedLine, type PaxCode, type PaxCounts } from "../../shared/order-lines.ts";
import { snapshotService, storedServiceLines, storedUnitPrices, type StoredService } from "./service-rules.ts";
import { hasLongDigitRun, PHONE_IN_TEXT_MESSAGE } from "../../shared/text-guards.ts";

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

/**
 * Tính lại số khách/dòng tiền của MỘT dịch vụ từ danh mục theo số khách mới, dùng ĐƠN GIÁ ĐÃ THOẢ THUẬN đã lưu (`order_item.unit_price`) trên bản
 * chụp lúc lập đơn — không tra danh mục hiện tại, không bao giờ lùi về giá niêm yết (DK-T2-01). Đi qua nguồn duy nhất `storedServiceLines`.
 */
export function recomputeService(stored: StoredService, newPax: PaxCounts): Parsed<{ pax: PaxCounts; lines: GeneratedLine[]; subtotal: number }> {
  if (!snapshotService(stored)) return { ok: false, message: `Dịch vụ "${stored.name}" không sửa được qua đường này (nhập tay hoặc thiếu giá đã lưu).` };
  const built = storedServiceLines(stored, newPax);
  if (!built.ok) return { ok: false, message: `${stored.name}: ${built.message}` };
  return { ok: true, pax: newPax, lines: built.lines, subtotal: built.lines.reduce((n, l) => n + thanhTienDong(l), 0) };
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
 * TRÙNG `serviceId` (hai phần tử hợp lệ, CÙNG dịch vụ — `parseMoneyEditInput` chặn khi GHI, chỉ tới được đây qua dữ liệu hỏng ngoài tầm kiểm):
 * GOM về ĐÚNG MỘT phần tử, phần tử ĐỨNG SAU (trong mảng) thắng. Không dedupe ở đây thì hai nơi tiêu thụ lại tự chọn khác nhau — `applyAdjustmentToOrder`
 * dựng `Map` từ mảng (đứng sau thắng), còn `applyAdjustedPax` dùng `Array.find` (đứng TRƯỚC thắng) — CHÍNH LÀ "hai luật khác nhau ở hai nơi" mà hàm
 * này được viết ra để xoá bỏ, chỉ là ở khâu HỢP GIẢI thay vì khâu lọc dạng. Kết quả trả về vì vậy LUÔN có TỐI ĐA một phần tử cho mỗi `serviceId`.
 */
export function parseAdjustmentAfter(afterJson: string): { serviceId: string; pax: PaxCounts }[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(afterJson);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const bySvc = new Map<string, PaxCounts>();
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.serviceId === "string" && isPaxCounts(e.pax)) bySvc.set(e.serviceId, e.pax); // Map.set: phần tử đứng SAU ghi đè phần tử đứng trước.
  }
  return Array.from(bySvc, ([serviceId, pax]) => ({ serviceId, pax }));
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
  // Lý do đi thẳng vào nhật ký chỉ-thêm (`audit_log.detail`) — chặn dãy số dài giống SĐT bằng ĐÚNG luật + câu của lý do "Khác" khi HDV huỷ đơn
  // (ADR-0037, `src/shared/text-guards.ts`; chủ dự án duyệt 2026-09-30 "Những lỗi của app đã báo sửa luôn"; Hiến chương 5.12: nhật ký không chứa SĐT).
  if (hasLongDigitRun(reason)) return { ok: false, message: PHONE_IN_TEXT_MESSAGE };
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
  items: s.items.map((i) => ({ paxCode: i.paxCode, detail: i.detail, catalogPrice: i.catalogPrice, unitPrice: i.unitPrice })),
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
  lineTotal: thanhTienDong(l),
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

// ---- NGUỒN SỰ THẬT DUY NHẤT cho tiền hiệu lực (Đợt E task 7 — tái phát lần 4 của "hai nơi tính cùng một số theo hai luật khác nhau") --------
//
// LỖI ĐÃ ĐO: đơn có dịch vụ NHẬP TAY + có điều chỉnh → trang chi tiết đơn (applyAdjustmentToOrder, dưới đây) TỰ TÍNH LẠI subtotal từ order_service/
// order_item GỐC nên CÓ cộng dịch vụ nhập tay; còn `/api/orders`/Trang chủ (orders/repository.ts) từng ĐỌC THẲNG cột `order_money_adjustment.
// subtotal_after` — cột này, ở nơi GHI cũ (`orders/index.ts:editMoneyAsHandler`), chỉ cộng dịch vụ TỪ DANH MỤC (vòng lặp chỉ duyệt catalogServices),
// bỏ sót dịch vụ nhập tay → lưu THIẾU. Sửa nơi ghi (mục A) chỉ chữa được đơn TỪ NAY; bảng order_money_adjustment CHỈ-THÊM nên đơn CŨ đã lưu thiếu
// KHÔNG sửa lại được bằng ghi đè. Sửa thật (mục B): nơi ĐỌC (danh sách/Trang chủ) NGỪNG tin cột `subtotal_after` đã lưu — TỰ TÍNH LẠI, đúng CÁCH
// trang chi tiết đã làm đúng từ trước, bằng CHÍNH hai hàm dưới đây. Từ nay CHỈ CÒN MỘT ĐƯỜNG TÍNH: `effectiveService`/`effectiveSubtotal`; mọi bề
// mặt (chi tiết đơn, `/api/orders`, Trang chủ, và nơi GHI khi tính `subtotal_before`/`subtotal_after` mới) đều gọi qua đây, không tự cộng dồn riêng.

/** Đủ dữ liệu của MỘT dịch vụ đã lưu để tính tiền hiệu lực: `items` = dòng tiền ĐÃ LƯU (đóng băng) của dịch vụ — CẢ danh mục lẫn nhập tay. */
export interface SubtotalServiceInput {
  id: string;
  catalogCode: string | null;
  name: string;
  unit: string;
  /** `unitPrice` = đơn giá ĐÃ THOẢ THUẬN (`order_item.unit_price`) — nguồn giá khi tính lại (DK-T2-01); `catalogPrice` chỉ để truy vết. */
  items: { paxCode: PaxCode | null; catalogPrice: number | null; unitPrice: number; lineTotal: number }[];
}

/** Kết quả tính tiền hiệu lực của MỘT dịch vụ. `recomputed` CHỈ có mặt khi dịch vụ THẬT SỰ được tính lại (có trong `after` VÀ recompute thành công) —
 * dùng để dựng lại `pax`/`items` cho DTO chi tiết đơn; vắng mặt (nhập tay, không có trong `after`, hoặc recompute lỗi) = giữ nguyên như đã lưu. */
export interface EffectiveService {
  subtotal: number;
  recomputed?: { pax: PaxCounts; lines: GeneratedLine[] };
}

const ownSubtotal = (items: SubtotalServiceInput["items"]): number => items.reduce((n, i) => n + i.lineTotal, 0);

/** Dựng `StoredService` (dạng luật `recomputeService` cần) từ dữ liệu tiền đã lưu — mang theo ĐƠN GIÁ ĐÃ THOẢ THUẬN của từng dòng (DK-T2-01). */
const storedFromSubtotal = (svc: SubtotalServiceInput, pax: PaxCounts): StoredService => ({
  id: svc.id, catalogCode: svc.catalogCode, name: svc.name, unit: svc.unit, pax,
  items: svc.items.map((i) => ({ paxCode: i.paxCode, detail: null, catalogPrice: i.catalogPrice, unitPrice: i.unitPrice })),
});

/**
 * Tiền hiệu lực của MỘT dịch vụ — NGUỒN DUY NHẤT, mọi hàm/bề mặt khác đều gọi qua đây (không tự viết lại vòng lặp cộng dồn). `newPax` = số khách
 * mới nếu dịch vụ có mặt trong dòng điều chỉnh gần nhất, `undefined` nếu không (nhập tay, hoặc catalog nhưng chưa từng bị điều chỉnh) — trường hợp
 * đó giữ nguyên "own" = tổng `lineTotal` các dòng ĐÃ LƯU của dịch vụ (đây chính là chỗ dịch vụ NHẬP TAY luôn được cộng: nó không bao giờ nằm trong
 * `after` — vì `parseMoneyEditInput` chỉ cho phép liệt kê dịch vụ TỪ DANH MỤC — nên LUÔN rơi vào nhánh "own", không phụ thuộc mã ghi có nhớ cộng nó
 * hay không). An toàn: recompute lỗi (không nên xảy ra — đã kiểm lúc ghi) → cũng lùi về "own" thay vì làm hỏng cả trang.
 */
export function effectiveService(svc: SubtotalServiceInput, newPax: PaxCounts | undefined): EffectiveService {
  if (!newPax) return { subtotal: ownSubtotal(svc.items) };
  const recomputed = recomputeService(storedFromSubtotal(svc, newPax), newPax);
  if (!recomputed.ok) return { subtotal: ownSubtotal(svc.items) };
  return { subtotal: recomputed.subtotal, recomputed: { pax: recomputed.pax, lines: recomputed.lines } };
}

/** Tổng tiền hiệu lực của MỘT ĐƠN — tổng `effectiveService(...).subtotal` của mọi dịch vụ. Dùng ở CẢ nơi GHI (`orders/index.ts:editMoneyAsHandler`,
 * tính `subtotal_before`/`subtotal_after` MỚI) lẫn nơi ĐỌC nhiều đơn (`orders/repository.ts`, danh sách/Trang chủ). `services` PHẢI là MỌI dịch vụ
 * của đơn (kể cả nhập tay) — thiếu dịch vụ nào thì thiếu đúng tiền dịch vụ đó, không có lưới nào khác bù lại. */
export function effectiveSubtotal(services: readonly SubtotalServiceInput[], after: readonly { serviceId: string; pax: PaxCounts }[]): number {
  const byService = new Map(after.map((a) => [a.serviceId, a.pax]));
  return services.reduce((sum, s) => sum + effectiveService(s, byService.get(s.id)).subtotal, 0);
}

const toSubtotalInput = (s: OrderServiceDto): SubtotalServiceInput => ({
  id: s.id, catalogCode: s.catalogCode, name: s.name, unit: s.unit,
  items: s.items.map((i) => ({ paxCode: i.paxCode, catalogPrice: i.catalogPrice, unitPrice: i.unitPrice, lineTotal: i.lineTotal })),
});

/**
 * Áp dòng điều chỉnh GẦN NHẤT (nếu có) lên đơn để hiển thị SỐ HIỆN HÀNH — KHÔNG đổi gì trong CSDL, chỉ dựng lại DTO trả về. MỖI dịch vụ đi qua
 * ĐÚNG MỘT LẦN `effectiveService` (không tính lại subtotal bằng một vòng lặp riêng) — `subtotal` của đơn = tổng các `eff.subtotal`, `services` =
 * dịch vụ nào có `eff.recomputed` thì thay `pax`/`items`, còn lại giữ nguyên. Đây CHÍNH LÀ đường mà `effectiveSubtotal` (dùng ở danh sách/Trang
 * chủ) gọi cho từng đơn — hai bề mặt dùng chung MỘT hàm sơ cấp, không phải hai vòng lặp trông giống nhau.
 */
export function applyAdjustmentToOrder(order: OrderDetailDto, after: readonly { serviceId: string; pax: PaxCounts }[]): OrderDetailDto {
  const byService = new Map(after.map((a) => [a.serviceId, a.pax]));
  let subtotal = 0;
  const services: OrderServiceDto[] = order.services.map((s) => {
    const eff = effectiveService(toSubtotalInput(s), byService.get(s.id));
    subtotal += eff.subtotal;
    return eff.recomputed ? { ...s, pax: eff.recomputed.pax, items: eff.recomputed.lines.map(toItemDto) } : s;
  });
  return { ...order, subtotal, ...effectiveMoney(subtotal, order.discount), services };
}

/**
 * PHẢI THU HIỆN HÀNH — MỘT HÀM (ADR-0109 QĐ1, Hiến chương 5.4): `total` = max(0, `subtotal` hiệu lực − `discount`), từ `subtotal` hiệu lực (gốc hoặc đã cộng
 * điều chỉnh); `discount` KHÔNG đổi qua route sửa số khách (khoá bởi 0081). Trả kèm `giamGiaHieuLuc` = min(`discount`, `subtotal`) — giảm giá THỰC DÙNG (ADR-0109
 * QĐ2), số dẫn xuất do cùng hàm trả về, để `subtotal − giamGiaHieuLuc = total` luôn đúng (biên nhận in số này — QĐ4). Khi tạm tính ≥ giảm giá thì hai số bằng số
 * cũ, nên đơn không âm không đổi đồng nào.
 *
 * Ai dùng: overlay CHI TIẾT một đơn (`applyAdjustmentToOrder`), DANH SÁCH / Trang chủ / phải thu của billing (`orders/repository.ts:computeEffectiveMoney`, gọi bởi
 * `hoan-tat.ts:phaiThuCua`), DTO đơn (`repository.ts:toDto`). Sổ tiền lượt 1 (ADR-0026 đ9): bỏ tham số cọc — "đã thu / còn lại" là số của billing
 * (`billing/rules.ts:conLai`). Bài tĩnh `src/phai-thu-mot-ham.test.ts` cấm chỗ khác trừ / so / kẹp giảm giá ngoài danh sách cho phép.
 *
 * "Một hàm" theo đúng chữ chỉ với đơn ĐÃ điều chỉnh số khách: đơn chưa điều chỉnh dùng thẳng `orders.total` đã lưu — số đó ≥ 0 nhờ trigger 0007
 * `money_invariant` (total = subtotal − discount, remaining = total − cọc ≥ 0), chặn giảm giá > tạm tính lúc lập / lưu nháp (`orders/rules.ts`) và khoá cột tiền
 * sau xác nhận (0081) — phiếu phản biện ADR-0109 (lệch 3, tiền đề sai 2).
 *
 * LUẬT CHO NGƯỜI LÀM SỔ ĐẠI LÝ SAU (ADR-0079, ADR-0081 — chưa thi công; kế hoạch ADR-0109 mục 1c):
 *  1. dòng `GIAM_GIA_BEN_DAT` ghi GIẢM GIÁ HIỆU LỰC = `gross_snapshot − due_snapshot` (ADR-0079 (iv) đã sửa) — không đọc thẳng `orders.discount`;
 *  2. R-BIL-14: đơn có người hưởng có đúng một dòng khi giảm giá hiệu lực > 0, không dòng nào khi = 0 (gồm tạm tính về 0 — SV-SK-10);
 *  3. R-BIL-2: vế giảm giá là giảm giá hiệu lực, cho cả đơn lẻ lẫn đơn đại lý;
 *  4. cảnh báo "Giảm giá đang lớn hơn hoa hồng…" (ADR-0079 :75) so bằng giảm giá hiệu lực;
 *  5. `giamGiaMinhChiu` (ADR-0081) suy từ đẳng thức ADR-0081 :43 nên tự theo số hiệu lực;
 *  6. KHÔNG đổi: hoa hồng RATE tính trước giảm giá cấp đơn, PER_PAX theo số khách, giá vốn trước giảm giá;
 *  7. sổ vàng đại lý (`golden/hoan-tat-cong-no.json`) phải có bản đại lý của SV-SK-04: đại lý chịu 500.000, không phải 800.000;
 *  8. mọi chỗ tính mới phải gọi hàm này hoặc xin thêm vào danh sách cho phép của `src/phai-thu-mot-ham.test.ts`, có người rà.
 */
export function effectiveMoney(subtotal: number, discount: number): { total: number; giamGiaHieuLuc: number } {
  return { total: Math.max(0, subtotal - discount), giamGiaHieuLuc: Math.min(discount, subtotal) };
}

// ---- Quyết định một lần "HDV sửa số khách" (luật THUẦN; `orders/index.ts:editMoneyAsHandler` chỉ đọc/ghi D1 quanh hàm này) ------------------

/**
 * Một phần tử của `before_json`/`after_json`. `unitPrices` = đơn giá đã thoả thuận lúc ghi — CHỈ ĐỂ TRUY VẾT: nơi đọc (`parseAdjustmentAfter`)
 * không mang trường này ra, số hiển thị LUÔN tính lại từ `order_item.unit_price` gốc (một nguồn giá). Dòng ghi trước bản vá DK-T2-01 không có
 * trường này — phát lại vẫn đúng vì đơn giá lấy từ `order_item` gốc, không phải từ JSON.
 */
export interface AdjustmentEntry {
  serviceId: string;
  pax: PaxCounts;
  unitPrices: Partial<Record<PaxCode, number>>;
}

export interface MoneyEditContext {
  /** MỌI dịch vụ của đơn (kể cả nhập tay) với dòng tiền ĐÃ LƯU — từ `repository.ts:getServicesForSubtotal`. */
  services: readonly SubtotalServiceInput[];
  /** Số khách ĐÃ LƯU (order_service gốc) của từng dịch vụ. */
  storedPax: ReadonlyMap<string, PaxCounts>;
  /** `after` của dòng điều chỉnh gần nhất (đã qua `parseAdjustmentAfter`), null nếu chưa có. */
  latestAfter: readonly { serviceId: string; pax: PaxCounts }[] | null;
  /** Thân JSON THÔ của request. */
  body: Record<string, unknown> | null;
}

export type MoneyEditPlan =
  | { ok: true; write: false }
  | { ok: true; write: true; reason: string; before: AdjustmentEntry[]; after: AdjustmentEntry[]; subtotalBefore: number; subtotalAfter: number }
  | { ok: false; code: "invalid_input"; message: string }
  /** ADR-0114 D3: lần sửa này đưa tổng người đi kèm của cả đơn từ ≥ 1 xuống 0 — máy chủ trả 409 `thieu_nguoi_lon` ở CẢ hai đường sửa số khách. */
  | { ok: false; code: "thieu_nguoi_lon"; message: string };

const samePax = (a: PaxCounts, b: PaxCounts): boolean => PAX_ORDER.every((c) => a[c] === b[c]);

/**
 * Luật một lần HDV sửa số khách:
 *  1. Thân yêu cầu hợp lệ (`parseMoneyEditInput` — lý do bắt buộc, đủ mọi dịch vụ từ danh mục).
 *  2. Mọi dịch vụ Y NGUYÊN số khách hiện hành (dòng điều chỉnh gần nhất, hoặc số đã lưu) → `write: false`: KHÔNG ghi dòng điều chỉnh nào
 *     (DK-T2-01: "kiểm lại danh sách, không đổi" từng ghi một dòng và đổi tiền đơn).
 *  3. Tiền trước/sau tính bằng `effectiveSubtotal` (nguồn duy nhất, theo ĐƠN GIÁ ĐÃ THOẢ THUẬN) trên MỌI dịch vụ của đơn.
 * KHÔNG chặn "còn lại" âm (giảm khách làm tổng < cọc) — giữ đúng hành vi trước bản vá DK-T2-01. Đây là việc MỞ, CHƯA quyết, để dành cho thiết
 * kế sổ thu/hoàn tiền (docs/CHANGE-GUIDE.md §4 mục 32).
 */
export function planMoneyEdit(c: MoneyEditContext): MoneyEditPlan {
  const catalog = c.services.filter((s) => s.catalogCode !== null);
  const input = parseMoneyEditInput(c.body, catalog.map((s) => s.id));
  if (!input.ok) return { ok: false, code: "invalid_input", message: input.message };
  const latest = new Map((c.latestAfter ?? []).map((a) => [a.serviceId, a.pax]));

  // ADR-0114 D3 — một cửa cho CẢ HAI đường (văn phòng `money-edit`, hướng dẫn viên `handler-money-edit`): từ chối CHỈ KHI tổng người đi kèm trước lần sửa ≥ 1 và
  // sau lần sửa = 0, tính trên MỌI dịch vụ của đơn. Dịch vụ danh mục: trước = số hiện hành (dòng điều chỉnh gần nhất, không thì số đã lưu), sau = số trong thân;
  // dịch vụ nhập tay (không có trong thân, ô "số khách" ở `adult`) giữ số đã lưu ở cả hai vế. Đơn CŨ không có người lớn (trước ADR) không bị chặn thêm: trước = 0
  // thì không bao giờ rơi vào nhánh này. Đứng TRƯỚC vòng tính tiền để "về 0 hết" ra mã này chứ không phải lỗi dạng chung "nhập số khách".
  const paxTruoc = (s: SubtotalServiceInput) => (s.catalogCode !== null ? latest.get(s.id) : undefined) ?? c.storedPax.get(s.id);
  const paxSau = (s: SubtotalServiceInput) => (s.catalogCode !== null ? input.services.find((x) => x.id === s.id)?.pax : undefined) ?? paxTruoc(s);
  const theoDichVu = (pick: (s: SubtotalServiceInput) => PaxCounts | undefined) => c.services.map((s) => pick(s) ?? {});
  // MỘT luật với báo sớm ở giao diện (bảng "Sửa số khách"): `suaDuaVeKhongNguoiLon` ở src/shared/nguoi-di-kem.ts.
  if (suaDuaVeKhongNguoiLon(theoDichVu(paxTruoc), theoDichVu(paxSau))) return { ok: false, code: "thieu_nguoi_lon", message: CAU_THIEU_NGUOI_LON };

  const before: AdjustmentEntry[] = [];
  const after: AdjustmentEntry[] = [];
  for (const s of catalog) {
    const currentPax = latest.get(s.id) ?? c.storedPax.get(s.id);
    if (!currentPax) return { ok: false, code: "invalid_input", message: `Dịch vụ "${s.name}" thiếu số khách đã lưu.` };
    const stored = storedFromSubtotal(s, currentPax);
    const unitPrices = storedUnitPrices(stored);
    if (!unitPrices) return { ok: false, code: "invalid_input", message: `Dịch vụ "${s.name}" thiếu đơn giá đã lưu.` };
    const beforeCalc = recomputeService(stored, currentPax);
    if (!beforeCalc.ok) return { ok: false, code: "invalid_input", message: beforeCalc.message };
    const newPax = input.services.find((x) => x.id === s.id)!.pax;
    const afterCalc = recomputeService(stored, newPax);
    if (!afterCalc.ok) return { ok: false, code: "invalid_input", message: afterCalc.message };
    before.push({ serviceId: s.id, pax: currentPax, unitPrices });
    after.push({ serviceId: s.id, pax: newPax, unitPrices });
  }
  if (after.every((a, i) => samePax(a.pax, before[i]!.pax))) return { ok: true, write: false };

  const subtotalBefore = effectiveSubtotal(c.services, before);
  const subtotalAfter = effectiveSubtotal(c.services, after);
  return { ok: true, write: true, reason: input.reason, before, after, subtotalBefore, subtotalAfter };
}
