// Luật nghiệp vụ thuần của đơn hàng (spec §2.3): kiểm tra đầu vào, tính tiền, chuyển trạng thái, mã đơn.
// Chỉ import file thuần của shared, không chạm I/O để kiểm thử độc lập bằng `npm test`.
import type { DepositMethod, OrderStatus } from "../../shared/contracts.ts";
import { CATALOG_CODE_RE, MAX_AMOUNT_VND as MAX_AMOUNT } from "../../shared/order-lines.ts";

export type { DepositMethod, OrderStatus };

export const DEPOSIT_METHODS: readonly DepositMethod[] = ["cash", "bank_transfer", "other"];

const MAX_QUANTITY = 100_000;
const MAX_ITEMS = 50;

export interface ValidItem {
  /** Mã dịch vụ nguồn khi dòng sinh từ danh mục; null = nhập tay. Chỉ để truy vết, không ràng buộc giá. */
  catalogCode: string | null;
  description: string;
  detail: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/** Đơn đã kiểm tra: mọi số tiền dẫn xuất đều do server tính, không lấy từ client. */
export interface ValidOrder {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerNote: string | null;
  items: ValidItem[];
  subtotal: number;
  discount: number;
  total: number;
  depositAmount: number;
  depositMethod: DepositMethod | null;
  remainingAmount: number;
  paymentNote: string | null;
}

export type Validated = { ok: true; value: ValidOrder } | { ok: false; message: string };

const fail = (message: string): Validated => ({ ok: false, message });

function text(v: unknown, label: string, max: number, required: boolean): { value: string | null; error?: string } {
  if (v === undefined || v === null || v === "") return required ? { value: null, error: `${label} là bắt buộc.` } : { value: null };
  if (typeof v !== "string") return { value: null, error: `${label} không hợp lệ.` };
  const s = v.trim();
  if (!s) return required ? { value: null, error: `${label} là bắt buộc.` } : { value: null };
  if (s.length > max) return { value: null, error: `${label} tối đa ${max} ký tự.` };
  return { value: s };
}

/** Số tiền/số lượng phải là số nguyên (kiểu number, không nhận chuỗi) trong khoảng cho phép. */
function int(v: unknown, label: string, min: number, max: number, fallback?: number): { value: number; error?: string } {
  if ((v === undefined || v === null) && fallback !== undefined) return { value: fallback };
  if (typeof v !== "number" || !Number.isSafeInteger(v)) return { value: 0, error: `${label} phải là số nguyên.` };
  if (v < min || v > max) return { value: 0, error: `${label} phải từ ${min} đến ${max}.` };
  return { value: v };
}

const PHONE_RE = /^\+?[0-9][0-9 .\-]{6,18}[0-9]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateOrder(input: unknown): Validated {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail("Dữ liệu đơn không hợp lệ.");
  const b = input as Record<string, unknown>;

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

  if (!Array.isArray(b.items) || b.items.length === 0) return fail("Đơn cần ít nhất một dòng dịch vụ.");
  if (b.items.length > MAX_ITEMS) return fail(`Đơn tối đa ${MAX_ITEMS} dòng dịch vụ.`);

  const items: ValidItem[] = [];
  let subtotal = 0;
  for (const [i, raw] of b.items.entries()) {
    const at = `Dòng ${i + 1}`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(`${at} không hợp lệ.`);
    const it = raw as Record<string, unknown>;
    const description = text(it.description, `${at}: tên dịch vụ`, 300, true);
    if (description.error) return fail(description.error);
    const detail = text(it.detail, `${at}: chi tiết`, 1000, false);
    if (detail.error) return fail(detail.error);
    const quantity = int(it.quantity, `${at}: số lượng`, 1, MAX_QUANTITY, 1);
    if (quantity.error) return fail(quantity.error);
    const unitPrice = int(it.unitPrice, `${at}: đơn giá`, 0, MAX_AMOUNT);
    if (unitPrice.error) return fail(unitPrice.error);
    const code = it.catalogCode;
    if (code !== undefined && code !== null && (typeof code !== "string" || !CATALOG_CODE_RE.test(code))) return fail(`${at}: mã dịch vụ không hợp lệ.`);

    const lineTotal = quantity.value * unitPrice.value;
    if (lineTotal > MAX_AMOUNT) return fail(`${at}: thành tiền vượt giới hạn.`);
    subtotal += lineTotal;
    if (subtotal > MAX_AMOUNT) return fail("Tổng tiền vượt giới hạn.");
    items.push({ catalogCode: typeof code === "string" ? code : null, description: description.value!, detail: detail.value, quantity: quantity.value, unitPrice: unitPrice.value, lineTotal });
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
      items,
      subtotal,
      discount: discount.value,
      total,
      depositAmount: deposit.value,
      depositMethod,
      remainingAmount: total - deposit.value,
      paymentNote: paymentNote.value,
    },
  };
}

/** Ai được sửa/xác nhận/huỷ đơn: người lập đơn hoặc admin. Xem đơn thì mọi nhân viên đều được (§2.4-4). */
export function canModify(staff: { id: string; role: "sales" | "admin" }, order: { staffId: string }): boolean {
  return staff.role === "admin" || staff.id === order.staffId;
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

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Tiền tố mã đơn `TD-YYYYMMDD-`; số thứ tự NNNN do repository sinh trong câu INSERT. Ngày tính theo giờ Việt Nam (UTC+7) để đơn cuối ngày không nhảy sang ngày UTC khác. */
export function orderCodePrefix(now: Date): string {
  const d = new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10).replaceAll("-", "");
  return `TD-${d}-`;
}
