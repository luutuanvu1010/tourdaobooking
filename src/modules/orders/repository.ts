import { auditStatement } from "../audit";
import type { OrderDetailDto, OrderDto, OrderItemDto, OrderServiceDto, OrderSummaryDto } from "../../shared/contracts";
import { escapeLike } from "../../shared/http";
import type { PaxCode, PaxCounts } from "../../shared/order-lines";
import { orderCodePrefix, type DepositMethod, type OrderStatus, type ValidOrder } from "./rules";
import { confirmWindow, summarizeDeviations, type StoredService, type ValidService, type ValidTrip } from "./service-rules";

interface OrderRow {
  id: string;
  order_code: string;
  staff_id: string;
  staff_name: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_note: string | null;
  subtotal: number;
  discount: number;
  total: number;
  deposit_amount: number;
  deposit_method: DepositMethod | null;
  remaining_amount: number;
  payment_note: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
}

interface ServiceRow {
  id: string;
  catalog_code: string | null;
  name: string;
  unit: string;
  pax_adult: number;
  pax_child: number;
  pax_senior: number;
  pax_infant: number;
  depart_date: string | null;
  depart_time: string | null;
  pickup_time: string | null;
  pickup_place: string | null;
  checkin_date: string | null;
  checkin_time: string | null;
  checkin_place: string | null;
  note: string | null;
}

interface ItemRow {
  id: string;
  service_id: string | null;
  catalog_code: string | null;
  pax_code: PaxCode | null;
  description: string;
  detail: string | null;
  quantity: number;
  unit_price: number;
  catalog_price: number | null;
  line_total: number;
}

const ORDER_SELECT = `SELECT o.*, s.label AS staff_name FROM orders o JOIN v_stf_staff_label s ON s.id = o.staff_id`;
const SERVICE_SELECT = `SELECT id, catalog_code, name, unit, pax_adult, pax_child, pax_senior, pax_infant, depart_date, depart_time, pickup_time, pickup_place,
  checkin_date, checkin_time, checkin_place, note FROM order_service WHERE order_id = ? ORDER BY sort_order`;
const ITEM_SELECT = `SELECT id, service_id, catalog_code, pax_code, description, detail, quantity, unit_price, catalog_price, line_total FROM order_item WHERE order_id = ? ORDER BY sort_order`;

function toDto(r: OrderRow): OrderDto {
  return {
    id: r.id,
    orderCode: r.order_code,
    staffId: r.staff_id,
    staffName: r.staff_name,
    status: r.status,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    customerNote: r.customer_note,
    subtotal: r.subtotal,
    discount: r.discount,
    total: r.total,
    depositAmount: r.deposit_amount,
    depositMethod: r.deposit_method,
    remainingAmount: r.remaining_amount,
    paymentNote: r.payment_note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    confirmedAt: r.confirmed_at,
  };
}

const paxOf = (s: ServiceRow): PaxCounts => ({ adult: s.pax_adult, child: s.pax_child, senior: s.pax_senior, infant: s.pax_infant });
const tripOf = (s: ServiceRow): ValidTrip => ({
  departDate: s.depart_date,
  departTime: s.depart_time,
  pickupTime: s.pickup_time,
  pickupPlace: s.pickup_place,
  checkinDate: s.checkin_date,
  checkinTime: s.checkin_time,
  checkinPlace: s.checkin_place,
  note: s.note,
});

function groupItems(rows: ItemRow[]): Map<string, ItemRow[]> {
  const by = new Map<string, ItemRow[]>();
  for (const i of rows) {
    if (!i.service_id) continue; // sau migration 0008 mọi dòng đều có dịch vụ
    const list = by.get(i.service_id);
    if (list) list.push(i);
    else by.set(i.service_id, [i]);
  }
  return by;
}

const toItemDto = (i: ItemRow): OrderItemDto => ({
  id: i.id,
  catalogCode: i.catalog_code,
  paxCode: i.pax_code,
  description: i.description,
  detail: i.detail,
  quantity: i.quantity,
  unitPrice: i.unit_price,
  catalogPrice: i.catalog_price,
  lineTotal: i.line_total,
});

/** Đơn + dịch vụ + dòng tiền. `catalogStatus` luôn null ở đây — do lớp điều phối (service.ts) điền cho đơn nháp. */
export async function findOrder(db: D1Database, id: string): Promise<OrderDetailDto | null> {
  const [orderRes, servicesRes, itemsRes] = await db.batch([
    db.prepare(`${ORDER_SELECT} WHERE o.id = ?`).bind(id),
    db.prepare(SERVICE_SELECT).bind(id),
    db.prepare(ITEM_SELECT).bind(id),
  ]);
  const row = (orderRes!.results as OrderRow[])[0];
  if (!row) return null;
  const items = groupItems(itemsRes!.results as ItemRow[]);
  const services = (servicesRes!.results as ServiceRow[]).map(
    (s): OrderServiceDto => ({
      id: s.id,
      kind: s.catalog_code === null ? "manual" : "catalog",
      catalogCode: s.catalog_code,
      name: s.name,
      unit: s.unit,
      pax: paxOf(s),
      ...tripOf(s),
      items: (items.get(s.id) ?? []).map(toItemDto),
      catalogStatus: null,
    }),
  );
  return { ...toDto(row), services };
}

export type StoredServiceRow = StoredService & { trip: ValidTrip };

/** Dịch vụ đã lưu của đơn ở dạng luật cần: đủ để dựng "bản chụp" (Q11) và so sánh thay đổi chuyến (Q9). */
export async function getStoredServices(db: D1Database, orderId: string): Promise<StoredServiceRow[]> {
  const [servicesRes, itemsRes] = await db.batch([db.prepare(SERVICE_SELECT).bind(orderId), db.prepare(ITEM_SELECT).bind(orderId)]);
  const items = groupItems(itemsRes!.results as ItemRow[]);
  return (servicesRes!.results as ServiceRow[]).map((s) => ({
    id: s.id,
    catalogCode: s.catalog_code,
    name: s.name,
    unit: s.unit,
    pax: paxOf(s),
    trip: tripOf(s),
    items: (items.get(s.id) ?? []).map((i) => ({ paxCode: i.pax_code, detail: i.detail, catalogPrice: i.catalog_price })),
  }));
}

export async function getMeta(db: D1Database, id: string): Promise<{ status: OrderStatus; staffId: string; updatedAt: string } | null> {
  const row = await db
    .prepare("SELECT status, staff_id, updated_at FROM orders WHERE id = ?")
    .bind(id)
    .first<{ status: OrderStatus; staff_id: string; updated_at: string }>();
  return row ? { status: row.status, staffId: row.staff_id, updatedAt: row.updated_at } : null;
}

export async function listOrders(
  db: D1Database,
  opts: { q: string; status: OrderStatus | null; limit: number; offset: number },
): Promise<{ orders: OrderSummaryDto[]; hasMore: boolean }> {
  const where: string[] = [];
  const binds: (string | number)[] = [];
  if (opts.status) {
    where.push("o.status = ?");
    binds.push(opts.status);
  }
  if (opts.q) {
    const like = `%${escapeLike(opts.q)}%`;
    where.push(`(o.order_code LIKE ? ESCAPE '\\' OR o.customer_name LIKE ? ESCAPE '\\' OR o.customer_phone LIKE ? ESCAPE '\\' OR s.label LIKE ? ESCAPE '\\')`);
    binds.push(like, like, like, like);
  }
  const sql = `${ORDER_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY o.created_at DESC, o.rowid DESC LIMIT ? OFFSET ?`;
  const { results } = await db
    .prepare(sql)
    .bind(...binds, opts.limit + 1, opts.offset)
    .all<OrderRow>();
  const page = results.slice(0, opts.limit).map((r) => {
    const d = toDto(r);
    return {
      id: d.id,
      orderCode: d.orderCode,
      status: d.status,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      total: d.total,
      remainingAmount: d.remainingAmount,
      staffName: d.staffName,
      createdAt: d.createdAt,
    };
  });
  return { orders: page, hasMore: results.length > opts.limit };
}

const isCodeCollision = (e: unknown) => e instanceof Error && /UNIQUE constraint failed: orders\.order_code/.test(e.message);

/** Mốc `updated_at` mới, luôn LỚN HƠN mốc cũ (dù đồng hồ lệch/cùng mili-giây) để điều kiện khoá lạc quan phân biệt được "đã ghi" với "chưa ghi". */
function nextStamp(prev: string): string {
  const p = Date.parse(prev);
  return new Date(Number.isNaN(p) ? Date.now() : Math.max(Date.now(), p + 1)).toISOString();
}

interface Guard {
  sql: string;
  binds: (string | number)[];
}

/**
 * Câu ghi chỉ chạy khi UPDATE đầu của CHÍNH request này đã thắng: dòng nhật ký mang id riêng của request (xem `AuditInput.id`) chỉ được chèn
 * khi `changes() > 0`, nên có mặt ⇔ UPDATE đã áp dụng (đơn còn nháp và đúng mốc `updated_at`). Không dùng so mốc thời gian vì hai request
 * cùng mili-giây có thể tính ra cùng mốc mới, khi đó bên thua vẫn lọt qua và xoá/ghi đè bản của bên thắng.
 */
const wonGuard = (auditId: string): Guard => ({ sql: "EXISTS (SELECT 1 FROM audit_log WHERE id = ?)", binds: [auditId] });

function insertRow(db: D1Database, table: string, cols: string[], values: (string | number | null)[], guard?: Guard): D1PreparedStatement {
  const marks = cols.map(() => "?").join(", ");
  if (!guard) return db.prepare(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${marks})`).bind(...values);
  return db.prepare(`INSERT INTO ${table} (${cols.join(", ")}) SELECT ${marks} WHERE ${guard.sql}`).bind(...values, ...guard.binds);
}

const SERVICE_COLS = [
  "id", "order_id", "sort_order", "catalog_code", "name", "unit", "pax_adult", "pax_child", "pax_senior", "pax_infant",
  "depart_date", "depart_time", "pickup_time", "pickup_place", "checkin_date", "checkin_time", "checkin_place", "note",
];
const ITEM_COLS = ["id", "order_id", "service_id", "catalog_code", "pax_code", "description", "detail", "quantity", "unit_price", "catalog_price", "line_total", "sort_order"];

/** INSERT các dịch vụ rồi các dòng tiền của chúng (dịch vụ trước vì dòng tiền trỏ khoá ngoại vào dịch vụ). */
function serviceInserts(db: D1Database, orderId: string, services: ValidService[], guard?: Guard): D1PreparedStatement[] {
  const stmts: D1PreparedStatement[] = [];
  const ids = services.map((s) => s.id ?? crypto.randomUUID());
  services.forEach((s, i) => {
    const t = s.trip;
    stmts.push(
      insertRow(
        db, "order_service", SERVICE_COLS,
        [ids[i]!, orderId, i, s.catalogCode, s.name, s.unit, s.pax.adult, s.pax.child, s.pax.senior, s.pax.infant,
          t.departDate, t.departTime, t.pickupTime, t.pickupPlace, t.checkinDate, t.checkinTime, t.checkinPlace, t.note],
        guard,
      ),
    );
  });
  let sort = 0;
  services.forEach((s, i) => {
    for (const it of s.items) {
      stmts.push(
        insertRow(
          db, "order_item", ITEM_COLS,
          [crypto.randomUUID(), orderId, ids[i]!, it.catalogCode, it.paxCode, it.description, it.detail, it.quantity, it.unitPrice, it.catalogPrice, it.lineTotal, sort++],
          guard,
        ),
      );
    }
  });
  return stmts;
}

/**
 * Tạo đơn + dịch vụ + dòng tiền + nhật ký trong một transaction. order_code được sinh NGAY TRONG câu INSERT
 * (mã lớn nhất của ngày + 1) nên việc đọc-rồi-ghi là một bước nguyên tử: D1 ghi tuần tự, nhiều người
 * tạo cùng lúc vẫn ra mã khác nhau. UNIQUE vẫn là lưới an toàn cuối; nếu đụng thì thử lại.
 */
export async function createOrder(db: D1Database, staffId: string, order: ValidOrder): Promise<string> {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; ; attempt++) {
    const now = new Date();
    const prefix = orderCodePrefix(now);
    const id = crypto.randomUUID();
    const at = now.toISOString();
    try {
      await db.batch([
        db
          .prepare(
            `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, customer_email, customer_note,
               subtotal, discount, total, deposit_amount, deposit_method, remaining_amount, payment_note, created_at, updated_at)
             SELECT ?, ? || printf('%04d', COALESCE((SELECT MAX(CAST(substr(order_code, length(?) + 1) AS INTEGER)) FROM orders WHERE order_code LIKE ?), 0) + 1),
               ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?`,
          )
          .bind(
            id, prefix, prefix, `${prefix}%`, staffId, order.customerName, order.customerPhone, order.customerEmail, order.customerNote,
            order.subtotal, order.discount, order.total, order.depositAmount, order.depositMethod, order.remainingAmount, order.paymentNote, at, at,
          ),
        ...serviceInserts(db, id, order.services),
        auditStatement(db, { orderId: id, staffId, action: "created", at, detail: summarizeDeviations(order.items) }),
      ]);
      return id;
    } catch (e) {
      if (!isCodeCollision(e) || attempt >= MAX_ATTEMPTS) throw e;
    }
  }
}

/**
 * Sửa đơn (chỉ khi còn `draft` VÀ `updated_at` còn khớp mốc client đã đọc). Trả false nếu UPDATE đầu không áp dụng (đơn đã đổi trạng thái
 * hoặc đã bị người khác sửa) — khi đó MỌI câu sau đều không chạy vì cùng mang `wonGuard`.
 * Thứ tự cố định vì khoá ngoại: xoá dòng tiền → xoá dịch vụ → thêm dịch vụ → thêm dòng tiền. Audit đứng ngay sau UPDATE (idiom `changes() > 0`).
 */
export async function updateDraftOrder(db: D1Database, id: string, staffId: string, order: ValidOrder & { expectedUpdatedAt: string }): Promise<boolean> {
  const at = nextStamp(order.expectedUpdatedAt);
  const auditId = crypto.randomUUID();
  const guard = wonGuard(auditId);
  const results = await db.batch([
    db
      .prepare(
        `UPDATE orders SET customer_name = ?, customer_phone = ?, customer_email = ?, customer_note = ?,
           subtotal = ?, discount = ?, total = ?, deposit_amount = ?, deposit_method = ?, remaining_amount = ?, payment_note = ?, updated_at = ?
         WHERE id = ? AND status = 'draft' AND updated_at = ?`,
      )
      .bind(
        order.customerName, order.customerPhone, order.customerEmail, order.customerNote,
        order.subtotal, order.discount, order.total, order.depositAmount, order.depositMethod, order.remainingAmount, order.paymentNote, at, id, order.expectedUpdatedAt,
      ),
    auditStatement(db, { id: auditId, orderId: id, staffId, action: "updated", at, detail: summarizeDeviations(order.items) }, "changes() > 0"),
    db.prepare(`DELETE FROM order_item WHERE order_id = ? AND ${guard.sql}`).bind(id, ...guard.binds),
    db.prepare(`DELETE FROM order_service WHERE order_id = ? AND ${guard.sql}`).bind(id, ...guard.binds),
    ...serviceInserts(db, id, order.services, guard),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}

/**
 * Xác nhận đơn: điều kiện "có dịch vụ, mọi dịch vụ có ngày khởi hành trong [hôm nay, +365 ngày] và ≥ 1 khách" nằm TRONG câu UPDATE
 * (không đọc-rồi-ghi ở route) nên người khác lưu nháp xoá ngày ngay trước đó cũng không thể tạo ra đơn xác nhận thiếu chuyến.
 * Trigger `orders_confirm_requires_trip` (0008) là lưới thứ hai cho phần không đổi của luật. Trả false nếu điều kiện không còn đúng.
 * `prevUpdatedAt` là mốc `updated_at` route đọc lúc kiểm quyền: mốc mới đi qua `nextStamp` nên luôn lớn hơn nó (như `updateDraftOrder`/`updateTrip`),
 * để client còn giữ mốc cũ không lọt qua khoá lạc quan của `PUT /trip` dù xác nhận rơi vào cùng mili-giây với một lần ghi khác.
 */
export async function confirmOrder(db: D1Database, id: string, staffId: string, today: string, prevUpdatedAt: string, detail?: string): Promise<boolean> {
  const at = nextStamp(prevUpdatedAt);
  const { from, to } = confirmWindow(today);
  const results = await db.batch([
    db
      .prepare(
        `UPDATE orders SET status = 'confirmed', updated_at = ?, confirmed_at = ?
         WHERE id = ? AND status = 'draft'
           AND EXISTS (SELECT 1 FROM order_service WHERE order_id = orders.id)
           AND NOT EXISTS (
             SELECT 1 FROM order_service s WHERE s.order_id = orders.id
               AND (s.depart_date IS NULL OR s.depart_date < ? OR s.depart_date > ? OR s.pax_adult + s.pax_child + s.pax_senior + s.pax_infant < 1))`,
      )
      .bind(at, at, id, from, to),
    auditStatement(db, { orderId: id, staffId, action: "confirmed", at, detail }, "changes() > 0"),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}

/** Huỷ đơn có điều kiện `status = from` (chống hai người đổi cùng lúc). Trả false nếu điều kiện không còn đúng. Mốc `updated_at` mới = `nextStamp(prevUpdatedAt)` (xem `confirmOrder`). */
export async function cancelOrder(db: D1Database, id: string, staffId: string, from: OrderStatus, prevUpdatedAt: string): Promise<boolean> {
  const at = nextStamp(prevUpdatedAt);
  const results = await db.batch([
    db.prepare(`UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = ?`).bind(at, id, from),
    auditStatement(db, { orderId: id, staffId, action: "cancelled", at }, "changes() > 0"),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}

/**
 * Sửa trường vận hành của các dịch vụ (Q9): đơn nháp HOẶC đã xác nhận, còn khớp mốc `updated_at`. Số khách, dịch vụ, tiền không đổi ở đây
 * (trigger 0008 chặn nếu một đường code quên). Trả false nếu đơn đã huỷ / đã bị người khác sửa.
 */
export async function updateTrip(
  db: D1Database,
  orderId: string,
  staffId: string,
  updates: { id: string; trip: ValidTrip }[],
  expectedUpdatedAt: string,
  detail: string,
): Promise<boolean> {
  const at = nextStamp(expectedUpdatedAt);
  const auditId = crypto.randomUUID();
  const guard = wonGuard(auditId);
  const results = await db.batch([
    db.prepare(`UPDATE orders SET updated_at = ? WHERE id = ? AND status IN ('draft', 'confirmed') AND updated_at = ?`).bind(at, orderId, expectedUpdatedAt),
    auditStatement(db, { id: auditId, orderId, staffId, action: "trip_updated", at, detail }, "changes() > 0"),
    ...updates.map(({ id, trip: t }) =>
      db
        .prepare(
          `UPDATE order_service SET depart_date = ?, depart_time = ?, pickup_time = ?, pickup_place = ?, checkin_date = ?, checkin_time = ?, checkin_place = ?, note = ?
           WHERE id = ? AND order_id = ? AND ${guard.sql}`,
        )
        .bind(t.departDate, t.departTime, t.pickupTime, t.pickupPlace, t.checkinDate, t.checkinTime, t.checkinPlace, t.note, id, orderId, ...guard.binds),
    ),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}
