import { auditStatement } from "../audit";
import type { OrderDetailDto, OrderDto, OrderItemDto, OrderSummaryDto } from "../../shared/contracts";
import { escapeLike } from "../../shared/http";
import { orderCodePrefix, type DepositMethod, type OrderStatus, type ValidOrder } from "./rules";

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

interface ItemRow {
  id: string;
  catalog_code: string | null;
  description: string;
  detail: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

const ORDER_SELECT = `SELECT o.*, s.full_name AS staff_name FROM orders o JOIN staff s ON s.id = o.staff_id`;

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

export async function findOrder(db: D1Database, id: string): Promise<OrderDetailDto | null> {
  const [orderRes, itemsRes] = await db.batch([
    db.prepare(`${ORDER_SELECT} WHERE o.id = ?`).bind(id),
    db.prepare(`SELECT id, catalog_code, description, detail, quantity, unit_price, line_total FROM order_item WHERE order_id = ? ORDER BY sort_order`).bind(id),
  ]);
  const row = (orderRes!.results as OrderRow[])[0];
  if (!row) return null;
  const items = (itemsRes!.results as ItemRow[]).map((i): OrderItemDto => ({
    id: i.id,
    catalogCode: i.catalog_code,
    description: i.description,
    detail: i.detail,
    quantity: i.quantity,
    unitPrice: i.unit_price,
    lineTotal: i.line_total,
  }));
  return { ...toDto(row), items };
}

export async function getMeta(db: D1Database, id: string): Promise<{ status: OrderStatus; staffId: string } | null> {
  const row = await db.prepare("SELECT status, staff_id FROM orders WHERE id = ?").bind(id).first<{ status: OrderStatus; staff_id: string }>();
  return row ? { status: row.status, staffId: row.staff_id } : null;
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
    where.push(`(o.order_code LIKE ? ESCAPE '\\' OR o.customer_name LIKE ? ESCAPE '\\' OR o.customer_phone LIKE ? ESCAPE '\\' OR s.full_name LIKE ? ESCAPE '\\')`);
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

function itemInserts(db: D1Database, orderId: string, order: ValidOrder, guardDraft: boolean): D1PreparedStatement[] {
  const cols = "id, order_id, catalog_code, description, detail, quantity, unit_price, line_total, sort_order";
  return order.items.map((it, idx) => {
    const values = [crypto.randomUUID(), orderId, it.catalogCode, it.description, it.detail, it.quantity, it.unitPrice, it.lineTotal, idx];
    if (!guardDraft) return db.prepare(`INSERT INTO order_item (${cols}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(...values);
    return db
      .prepare(`INSERT INTO order_item (${cols}) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'draft')`)
      .bind(...values, orderId);
  });
}

/**
 * Tạo đơn + các dòng + nhật ký trong một transaction. order_code được sinh NGAY TRONG câu INSERT
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
        ...itemInserts(db, id, order, false),
        auditStatement(db, { orderId: id, staffId, action: "created", at }),
      ]);
      return id;
    } catch (e) {
      if (!isCodeCollision(e) || attempt >= MAX_ATTEMPTS) throw e;
    }
  }
}

/** Sửa đơn (chỉ khi còn `draft`). Trả false nếu đơn không còn ở trạng thái draft tại thời điểm ghi. */
export async function updateDraftOrder(db: D1Database, id: string, staffId: string, order: ValidOrder): Promise<boolean> {
  const at = new Date().toISOString();
  const results = await db.batch([
    db
      .prepare(
        `UPDATE orders SET customer_name = ?, customer_phone = ?, customer_email = ?, customer_note = ?,
           subtotal = ?, discount = ?, total = ?, deposit_amount = ?, deposit_method = ?, remaining_amount = ?, payment_note = ?, updated_at = ?
         WHERE id = ? AND status = 'draft'`,
      )
      .bind(
        order.customerName, order.customerPhone, order.customerEmail, order.customerNote,
        order.subtotal, order.discount, order.total, order.depositAmount, order.depositMethod, order.remainingAmount, order.paymentNote, at, id,
      ),
    // changes() ở đây là số dòng của UPDATE ngay trên: chỉ ghi nhật ký nếu đơn thực sự còn draft.
    auditStatement(db, { orderId: id, staffId, action: "updated", at }, "changes() > 0"),
    db.prepare("DELETE FROM order_item WHERE order_id = ? AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'draft')").bind(id, id),
    ...itemInserts(db, id, order, true),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}

/** Đổi trạng thái có điều kiện `status = from` (chống hai người đổi cùng lúc). Trả false nếu điều kiện không còn đúng. */
export async function transitionOrder(
  db: D1Database,
  id: string,
  staffId: string,
  from: OrderStatus,
  to: "confirmed" | "cancelled",
): Promise<boolean> {
  const at = new Date().toISOString();
  const results = await db.batch([
    db
      .prepare(`UPDATE orders SET status = ?, updated_at = ?, confirmed_at = CASE WHEN ? = 'confirmed' THEN ? ELSE confirmed_at END WHERE id = ? AND status = ?`)
      .bind(to, at, to, at, id, from),
    auditStatement(db, { orderId: id, staffId, action: to, at }, "changes() > 0"),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}
