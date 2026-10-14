// Luật nghiệp vụ thuần của đơn hàng (spec §2.3): kiểm tra đầu vào, tính tiền, chuyển trạng thái, mã đơn.
// Luật của TỪNG DỊCH VỤ (số khách, thông tin chuyến, dòng tiền sinh từ danh mục) nằm ở ./service-rules.ts.
// Chỉ import file thuần của shared, không chạm I/O để kiểm thử độc lập bằng `npm test`.
import { parseBooker, type BookerInput } from "../../shared/booker.ts";
import { MAX_CHANG_MOI_DICH_VU, doiNgayChang, kiemChang, tronChangCu, type ChangHopLe } from "../../shared/chang-dua-don.ts";
import type { OrderStatus } from "../../shared/contracts.ts";
import { kiemDanhSachHanhKhach, type HanhKhachHopLe } from "../../shared/hanh-khach.ts";
import { CAU_THIEU_NGUOI_LON, donThieuNguoiLon } from "../../shared/nguoi-di-kem.ts";
import { MAX_AMOUNT_VND as MAX_AMOUNT } from "../../shared/order-lines.ts";
import { UUID_RE } from "../../shared/http.ts";
import { ONE_DATE_MESSAGE, sameDepartDate } from "../../shared/trip-rules.ts";
import { vnToday } from "../../shared/vn-date.ts";
import { int, text } from "./fields.ts";
import { MAX_LINES_PER_ORDER, MAX_SERVICES, validateService, type ServiceContext, type ServiceFailure, type ValidItem, type ValidService } from "./service-rules.ts";

export type { BookerInput, OrderStatus, ServiceContext, ValidItem, ValidService };

/** Đơn đã kiểm tra: mọi số tiền dẫn xuất đều do server tính, không lấy từ client. */
export interface ValidOrder {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerNote: string | null;
  /** Người đặt (N2 lát 1): không gắn / hồ sơ có sẵn / hồ sơ mới. Service kiểm hồ sơ còn dùng được; repository ghi. */
  booker: BookerInput;
  services: ValidService[];
  /** Mọi dòng tiền của mọi dịch vụ (theo thứ tự dịch vụ rồi dòng). */
  items: ValidItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentNote: string | null;
  /** Chỉ dùng cho PUT: `updated_at` mà client đã đọc (khoá lạc quan). */
  expectedUpdatedAt: string | null;
  /**
   * Danh sách hành khách SẼ LƯU (ADR-0047 A2, Ruling R1 — chỉ đơn nháp đi trong thân này). `null` = thân KHÔNG có khoá `passengers` → GIỮ danh sách đang
   * lưu (R2b: máy chưa tải bản mới không xoá mất tên khách). Có khoá (kể cả `[]`) → route hỏi thêm ô `order.passenger.write`.
   */
  passengers: HanhKhachHopLe[] | null;
  /** Thân có khoá `legs` ở dịch vụ (thân mới) — false = đường tương thích (trộn `pickupTime`/`pickupPlace` cũ vào chặng đang lưu, R2b). */
  legsGiven: boolean;
}

export type { ChangHopLe, HanhKhachHopLe };

/**
 * Chặng SẼ LƯU của từng dịch vụ (ADR-0047 A1). Thân MỚI (`services[].legs` — mọi dịch vụ đều phải có khoá, hoặc không dịch vụ nào): kiểm từng chặng
 * (`kiemChang` — ngày đón trống → ngày đi, R4b), `id` phải là chặng CÒN HIỆU LỰC đang lưu của CHÍNH dịch vụ đó. Thân CŨ (không khoá `legs`): chặng đang
 * lưu dời theo ngày đi mới (`doiNgayChang`, R4e), rồi trộn `pickupTime`/`pickupPlace` cũ vào chặng chiều đi đầu (`tronChangCu`, R2b) — khoá vắng = giữ.
 * Điểm danh mục có đang dùng không là việc có I/O (`service.ts:resolveLegPlaces`, R7).
 */
function withLegs(rawServices: readonly unknown[], services: ValidService[], ctx: ServiceContext): { ok: true; services: ValidService[]; legsGiven: boolean } | Failure {
  const hasKey = rawServices.map((raw) => !!raw && typeof raw === "object" && "legs" in (raw as object));
  const legsGiven = hasKey.some(Boolean);
  if (legsGiven && !hasKey.every(Boolean)) return fail("Dữ liệu đưa đón không đồng nhất giữa các dịch vụ — hãy tải lại trang rồi thử lại.");
  const out: ValidService[] = [];
  for (const [i, sv] of services.entries()) {
    const raw = rawServices[i] as Record<string, unknown>;
    const stored = sv.id !== null ? ctx.storedTrips?.get(sv.id) : undefined;
    const at = `Dịch vụ ${i + 1}`;
    if (legsGiven) {
      if (!Array.isArray(raw.legs)) return fail(`${at}: danh sách chặng đưa đón không hợp lệ.`);
      if (raw.legs.length > MAX_CHANG_MOI_DICH_VU) return fail(`${at}: tối đa ${MAX_CHANG_MOI_DICH_VU} chặng đưa đón.`);
      const legs: ChangHopLe[] = [];
      const seen = new Set<string>();
      for (const [j, l] of raw.legs.entries()) {
        const k = kiemChang(l, { at: `${at}, chặng ${j + 1}`, departDate: sv.trip.departDate });
        if (!k.ok) return fail(k.message);
        if (k.value.id !== null) {
          if (!stored?.legs.some((x) => x.id === k.value.id)) return fail(`${at}, chặng ${j + 1}: chặng không thuộc dịch vụ này — hãy tải lại trang rồi thử lại.`);
          if (seen.has(k.value.id)) return fail(`${at}, chặng ${j + 1}: trùng một chặng khác.`);
          seen.add(k.value.id);
        }
        legs.push(k.value);
      }
      out.push({ ...sv, legs });
    } else {
      const shifted = stored ? doiNgayChang(stored.legs, stored.departDate, sv.trip.departDate) : [];
      const cu = { pickupTime: "pickupTime" in raw ? sv.trip.pickupTime : undefined, pickupPlace: "pickupPlace" in raw ? sv.trip.pickupPlace : undefined };
      out.push({ ...sv, legs: tronChangCu(shifted, cu, sv.trip.departDate).legs });
    }
  }
  return { ok: true, services: out, legsGiven };
}

export type Failure = { ok: false; message: string; code?: ServiceFailure["code"] | "client_outdated"; details?: unknown };
export type Validated = { ok: true; value: ValidOrder } | Failure;

const fail = (message: string): Failure => ({ ok: false, message });

const PHONE_RE = /^\+?[0-9][0-9 .\-]{6,18}[0-9]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Người phụ trách do người lập CHỌN ngay lúc lập đơn — trường tuỳ chọn `handlerStaffId` của thân `POST /api/orders` (ADR-0030 S20-4, ADR-0020 điều 1).
 * `hasHandlerPick`: trường CÓ MẶT (khác `undefined` và `null`) — route hỏi quyền chọn (`dispatch.assign`) NGAY khi thấy có mặt, trước khi kiểm dạng,
 * nên Thực tập/Đối tác gửi kèm bất cứ giá trị gì (kể cả chuỗi rỗng) đều 403, không phải 400. Vắng hoặc `null` = không chọn: đơn chờ người nhận (form cũ
 * trong bộ nhớ đệm của ứng dụng không gửi trường này — không vỡ). Luật "ai đủ điều kiện được chọn" KHÔNG ở đây: module dispatch quyết (`checkAssignee`).
 */
export const hasHandlerPick = (body: Record<string, unknown> | null): boolean => body !== null && body.handlerStaffId !== undefined && body.handlerStaffId !== null;

/** Dạng của `handlerStaffId`: vắng/`null` → không chọn (`staffId: null`); có mặt thì phải là mã tài khoản (UUID). */
export function parseHandlerPick(body: Record<string, unknown> | null): { ok: true; staffId: string | null } | Failure {
  if (!hasHandlerPick(body)) return { ok: true, staffId: null };
  const v = body!.handlerStaffId;
  if (typeof v !== "string" || !UUID_RE.test(v)) return fail("Người phụ trách được chọn không hợp lệ. Hãy chọn lại hướng dẫn viên.");
  return { ok: true, staffId: v };
}

/** Tên + SĐT khách (bản chụp trên đơn) — dùng chung cho tạo/sửa đơn và đổi khách. */
function validateCustomer(b: Record<string, unknown>): { ok: true; name: string; phone: string } | Failure {
  const name = text(b.customerName, "Tên khách hàng", 200, true);
  if (name.error) return fail(name.error);
  const phone = text(b.customerPhone, "Số điện thoại khách", 30, true);
  if (phone.error) return fail(phone.error);
  const phoneValue = phone.value!.replace(/\s+/g, " ");
  if (!PHONE_RE.test(phoneValue)) return fail("Số điện thoại khách không hợp lệ.");
  return { ok: true, name: name.value!, phone: phoneValue };
}

export function validateOrder(input: unknown, ctx: ServiceContext): Validated {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail("Dữ liệu đơn không hợp lệ.");
  const b = input as Record<string, unknown>;
  // Tab mở từ trước khi triển khai vẫn gửi `items` phẳng kiểu cũ.
  if (b.services === undefined && Array.isArray(b.items)) return { ok: false, code: "client_outdated", message: "Trang đã cũ, hãy tải lại trang rồi thử lại." };

  const customer = validateCustomer(b);
  if (!customer.ok) return customer;
  const email = text(b.customerEmail, "Email khách", 200, false);
  if (email.error) return fail(email.error);
  if (email.value && !EMAIL_RE.test(email.value)) return fail("Email khách không hợp lệ.");
  const note = text(b.customerNote, "Ghi chú khách", 2000, false);
  if (note.error) return fail(note.error);
  const paymentNote = text(b.paymentNote, "Ghi chú thanh toán", 1000, false);
  if (paymentNote.error) return fail(paymentNote.error);
  const booker = parseBooker(b.bookerPartyId, b.newBooker);
  if (!booker.ok) return fail(booker.message);

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
  if (!sameDepartDate(services.map((s) => s.trip.departDate))) return fail(ONE_DATE_MESSAGE); // ADR-0021
  // ADR-0114 D3: mỗi đơn có ít nhất một người lớn đi cùng, tính trên CẢ ĐƠN (người cao tuổi là người đi kèm; dịch vụ nhập tay / theo nhóm: ô số khách ở `adult`).
  // Lập đơn VÀ lưu nháp cùng đi qua đây; cửa chuyển sang xác nhận (index.ts) và sửa số khách (money-adjustment.ts `planMoneyEdit`) là hai cửa còn lại.
  if (donThieuNguoiLon(services.map((s) => s.pax))) return fail(CAU_THIEU_NGUOI_LON);
  const withLegsResult = withLegs(b.services, services, ctx);
  if (!withLegsResult.ok) return withLegsResult;
  services.splice(0, services.length, ...withLegsResult.services);
  let passengers: HanhKhachHopLe[] | null = null;
  if ("passengers" in b) {
    const p = kiemDanhSachHanhKhach(b.passengers, ctx.today ?? vnToday(new Date()));
    if (!p.ok) return fail(p.message);
    for (const [i, x] of p.value.entries()) {
      if (x.id !== null && !ctx.storedPassengerIds?.has(x.id)) return fail(`Hành khách ${i + 1}: không thuộc đơn này — hãy tải lại trang rồi thử lại.`);
    }
    passengers = p.value;
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

  // Sổ tiền lượt 1 (ADR-0026 đ9): tiền trả trước KHÔNG còn nằm trong đơn — trình duyệt ghi LẦN THU ở bước hai (billing) sau khi đơn đã lưu. Trang lập
  // đơn CŨ (bộ nhớ đệm PWA chưa tải bản mới) còn gửi khoản trả trước trong thân đơn → từ chối rõ ràng thay vì lặng lẽ bỏ mất số tiền đó.
  if (typeof b.depositAmount === "number" && b.depositAmount > 0) {
    return { ok: false, code: "client_outdated", message: "Trang lập đơn đã cũ — tải lại trang rồi nhập tiền trả trước ở mục Thanh toán." };
  }

  return {
    ok: true,
    value: {
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: email.value,
      customerNote: note.value,
      booker: booker.value,
      services,
      items,
      subtotal,
      discount: discount.value,
      total,
      paymentNote: paymentNote.value,
      expectedUpdatedAt: typeof b.expectedUpdatedAt === "string" && b.expectedUpdatedAt ? b.expectedUpdatedAt : null,
      passengers,
      legsGiven: withLegsResult.legsGiven,
    },
  };
}

export interface ValidBookerChange {
  customerName: string;
  customerPhone: string;
  booker: BookerInput;
  expectedUpdatedAt: string;
}

/** `PUT /api/orders/:id/booker` (ADR-0011 điều 2): tên/SĐT trên đơn + người đặt + mốc khoá lạc quan. */
export function validateBookerChange(input: unknown): { ok: true; value: ValidBookerChange } | Failure {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail("Dữ liệu đổi khách không hợp lệ.");
  const b = input as Record<string, unknown>;
  const customer = validateCustomer(b);
  if (!customer.ok) return customer;
  const booker = parseBooker(b.bookerPartyId, b.newBooker);
  if (!booker.ok) return fail(booker.message);
  if (typeof b.expectedUpdatedAt !== "string" || !b.expectedUpdatedAt) return fail("Thiếu expectedUpdatedAt (mốc cập nhật của đơn mà trang đã đọc).");
  return { ok: true, value: { customerName: customer.name, customerPhone: customer.phone, booker: booker.value, expectedUpdatedAt: b.expectedUpdatedAt } };
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
