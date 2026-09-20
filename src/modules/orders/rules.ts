// Luật nghiệp vụ thuần của đơn hàng (spec §2.3): kiểm tra đầu vào, tính tiền, chuyển trạng thái, mã đơn.
// Luật của TỪNG DỊCH VỤ (số khách, thông tin chuyến, dòng tiền sinh từ danh mục) nằm ở ./service-rules.ts.
// Chỉ import file thuần của shared, không chạm I/O để kiểm thử độc lập bằng `npm test`.
import type { DepositMethod, OrderStatus } from "../../shared/contracts.ts";
import { MAX_AMOUNT_VND as MAX_AMOUNT } from "../../shared/order-lines.ts";
import { vnToday } from "../../shared/vn-date.ts";
import { int, text } from "./fields.ts";
import { MAX_LINES_PER_ORDER, MAX_SERVICES, validateService, type ServiceContext, type ServiceFailure, type ValidItem, type ValidService } from "./service-rules.ts";

export type { DepositMethod, OrderStatus, ServiceContext, ValidItem, ValidService };

export const DEPOSIT_METHODS: readonly DepositMethod[] = ["cash", "bank_transfer", "other"];

/** Đơn đã kiểm tra: mọi số tiền dẫn xuất đều do server tính, không lấy từ client. */
export interface ValidOrder {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerNote: string | null;
  services: ValidService[];
  /** Mọi dòng tiền của mọi dịch vụ (theo thứ tự dịch vụ rồi dòng). */
  items: ValidItem[];
  subtotal: number;
  discount: number;
  total: number;
  depositAmount: number;
  depositMethod: DepositMethod | null;
  remainingAmount: number;
  paymentNote: string | null;
  /** Chỉ dùng cho PUT: `updated_at` mà client đã đọc (khoá lạc quan). */
  expectedUpdatedAt: string | null;
}

export type Failure = { ok: false; message: string; code?: ServiceFailure["code"] | "client_outdated"; details?: unknown };
export type Validated = { ok: true; value: ValidOrder } | Failure;

const fail = (message: string): Failure => ({ ok: false, message });

const PHONE_RE = /^\+?[0-9][0-9 .\-]{6,18}[0-9]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateOrder(input: unknown, ctx: ServiceContext): Validated {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail("Dữ liệu đơn không hợp lệ.");
  const b = input as Record<string, unknown>;
  // Tab mở từ trước khi triển khai vẫn gửi `items` phẳng kiểu cũ.
  if (b.services === undefined && Array.isArray(b.items)) return { ok: false, code: "client_outdated", message: "Trang đã cũ, hãy tải lại trang rồi thử lại." };

  const name = text(b.customerName, "Tên khách hàng", 200, true);
  if (name.error) return fail(name.error);
  const phone = text(b.customerPhone, "Số điện thoại khách", 30, true);
  if (phone.error) return fail(phone.error);
  const phoneValue = phone.value!.replace(/\s+/g, " ");
  if (!PHONE_RE.test(phoneValue)) return fail("Số điện thoại khách không hợp lệ.");
  const email = text(b.customerEmail, "Email khách", 200, false);
  if (email.error) return fail(email.error);
  if (email.value && !EMAIL_RE.test(email.value)) return fail("Email khách không hợp lệ.");
  const note = text(b.customerNote, "Ghi chú khách", 2000, false);
  if (note.error) return fail(note.error);
  const paymentNote = text(b.paymentNote, "Ghi chú thanh toán", 1000, false);
  if (paymentNote.error) return fail(paymentNote.error);

  if (!Array.isArray(b.services) || b.services.length === 0) return fail("Đơn cần ít nhất một dịch vụ.");
  if (b.services.length > MAX_SERVICES) return fail(`Đơn tối đa ${MAX_SERVICES} dịch vụ.`);

  const services: ValidService[] = [];
  const usedIds = new Set<string>();
  for (const [i, raw] of b.services.entries()) {
    const r = validateService(raw, i, ctx);
    if (!r.ok) return r;
    if (r.value.id !== null) {
      if (usedIds.has(r.value.id)) return fail(`Dịch vụ ${i + 1}: trùng một dịch vụ đã lưu.`);
      usedIds.add(r.value.id);
    }
    services.push(r.value);
  }
  const items = services.flatMap((s) => s.items);
  if (items.length > MAX_LINES_PER_ORDER) return fail(`Đơn tối đa ${MAX_LINES_PER_ORDER} dòng tiền.`);
  let subtotal = 0;
  for (const it of items) {
    subtotal += it.lineTotal;
    if (subtotal > MAX_AMOUNT) return fail("Tổng tiền vượt giới hạn.");
  }

  const discount = int(b.discount, "Giảm giá", 0, MAX_AMOUNT, 0);
  if (discount.error) return fail(discount.error);
  if (discount.value > subtotal) return fail("Giảm giá không được vượt quá tạm tính.");
  const total = subtotal - discount.value;

  const deposit = int(b.depositAmount, "Tiền cọc", 0, MAX_AMOUNT, 0);
  if (deposit.error) return fail(deposit.error);
  if (deposit.value > total) return fail("Tiền cọc không được vượt quá tổng cộng.");

  let depositMethod: DepositMethod | null = null;
  if (deposit.value > 0) {
    if (!DEPOSIT_METHODS.includes(b.depositMethod as DepositMethod)) return fail("Cần chọn hình thức cọc (tiền mặt, chuyển khoản hoặc khác).");
    depositMethod = b.depositMethod as DepositMethod;
  }

  return {
    ok: true,
    value: {
      customerName: name.value!,
      customerPhone: phoneValue,
      customerEmail: email.value,
      customerNote: note.value,
      services,
      items,
      subtotal,
      discount: discount.value,
      total,
      depositAmount: deposit.value,
      depositMethod,
      remainingAmount: total - deposit.value,
      paymentNote: paymentNote.value,
      expectedUpdatedAt: typeof b.expectedUpdatedAt === "string" && b.expectedUpdatedAt ? b.expectedUpdatedAt : null,
    },
  };
}

// draft → confirmed → cancelled, hoặc draft → cancelled. Không có đường quay lại (§2.3).
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isOrderStatus(v: unknown): v is OrderStatus {
  return v === "draft" || v === "confirmed" || v === "cancelled";
}

/** Tiền tố mã đơn `TD-YYYYMMDD-`; số thứ tự NNNN do repository sinh trong câu INSERT. Ngày tính theo giờ Việt Nam (UTC+7) để đơn cuối ngày không nhảy sang ngày UTC khác. */
export function orderCodePrefix(now: Date): string {
  return `TD-${vnToday(now).replaceAll("-", "")}-`;
}
