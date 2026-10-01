// SQL của bảng `dsp_*` (migration 0014) — người phụ trách đơn = dòng `HANDLE` hạt đơn đang mở (ADR-0006 điều 3). Mọi câu đi qua defineSql
// (ADR-0002 điều 8(b)) và tệp này import bằng đuôi .ts để bài kiểm kiến trúc nạp được. Đọc hồ sơ/tài khoản CHỈ qua view công bố (`v_dsp_order_handler`
// đã ghép nhãn); KHÔNG đọc `audit_log`, `orders`, `staff`… trực tiếp.
//
// Đổi người = ĐÓNG dòng cũ + MỞ dòng mới trong MỘT `db.batch()` (không xoá cứng). Câu chốt thắng/thua là câu ĐẦU của batch; mỗi câu sau nó chỉ áp dụng
// khi câu NGAY TRƯỚC đã áp dụng (`changes() > 0`): `changes()` là số dòng của câu ghi vừa xong, nên chuỗi chốt → mở dòng mới → nhật ký chỉ đi tiếp khi
// câu trước đó thắng — bên thua không để lại dòng nào, kể cả dòng nhật ký.
import { defineSql } from "../../shared/sql-registry.ts";

export interface HandlerRow {
  order_id: string;
  party_id: string;
  /** Tài khoản của hồ sơ đó; null nếu hồ sơ chưa/không còn tài khoản. */
  staff_id: string | null;
  label: string;
}

const COLUMNS = "order_id, party_id, staff_id, label";

// `json_each(?1)` nhận MẢNG JSON các id: câu SQL vẫn TĨNH dù số id thay đổi (tối đa 100 — luật ở rules.ts).
const HANDLERS_OF_ORDERS = defineSql("dispatch", "handlers_of_orders", `SELECT ${COLUMNS} FROM v_dsp_order_handler WHERE order_id IN (SELECT value FROM json_each(?1))`);
const HANDLER_OF_ORDER = defineSql("dispatch", "handler_of_order", `SELECT ${COLUMNS} FROM v_dsp_order_handler WHERE order_id = ?1`);
const IS_HANDLER = defineSql("dispatch", "is_handler", "SELECT 1 AS ok FROM v_dsp_order_handler WHERE order_id = ?1 AND staff_id = ?2");
const HANDLED_ORDER_IDS = defineSql("dispatch", "handled_order_ids", "SELECT order_id FROM v_dsp_order_handler WHERE staff_id = ?1");

// Dòng HANDLE mới: ?1 id, ?2 đơn, ?3 hồ sơ người nhận, ?4 thời điểm (UTC), ?5 người thao tác (cột WHO: TEXT NULL, không khoá ngoại — ADR-0003).
const INSERT_COLUMNS = "id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by";
const NEW_ROW = "?1, ?2, 'HANDLE', ?3, 'PENDING', ?4, ?4, ?5, ?4, ?5";
/** Đơn MỚI: người được CHỌN lúc lập đơn (gộp vào batch tạo đơn — ADR-0030 S20-4; đơn vừa tạo trong cùng lô nên chưa thể có dòng nào đang mở). */
const INSERT_HANDLER = defineSql("dispatch", "insert_handler", `INSERT INTO dsp_assignment (${INSERT_COLUMNS}) VALUES (${NEW_ROW})`);
/** Sau câu ĐÓNG dòng cũ: chỉ mở dòng mới nếu câu đóng đã áp dụng. */
const INSERT_HANDLER_AFTER_CLOSE = defineSql("dispatch", "insert_handler_after_close", `INSERT INTO dsp_assignment (${INSERT_COLUMNS}) SELECT ${NEW_ROW} WHERE changes() > 0`);
/** Nhận đơn CHƯA có người phụ trách: chính câu mở dòng là câu chốt — chỉ chèn khi lúc ghi vẫn chưa có dòng đang mở (chỉ mục duy nhất là lưới cuối). */
const INSERT_HANDLER_IF_NONE = defineSql(
  "dispatch",
  "insert_handler_if_none",
  `INSERT INTO dsp_assignment (${INSERT_COLUMNS}) SELECT ${NEW_ROW}
   WHERE NOT EXISTS (SELECT 1 FROM dsp_assignment WHERE order_id = ?2 AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL)`,
);
// ĐÓNG dòng cũ — câu chốt của đổi người: chỉ áp dụng nếu người phụ trách đang mở VẪN là ?2 (người route đã đọc). `max` giữ `valid_to_at >= valid_from_at`
// (CHECK của bảng) dù đồng hồ hai máy chủ lệch nhau vài mili-giây.
// KHOÁ LẠC QUAN THEO GIÁ TRỊ `party_id`, KHÔNG theo phiên bản dòng: không chặn ABA. Nếu giữa lúc route đọc (người A) và lúc ghi, người phụ trách đi A → B → A (dòng A thứ hai)
// thì câu chốt vẫn thắng và đóng dòng A thứ hai. Đây là "lost update" LÀNH TÍNH và có chủ ý: khi ghi, trạng thái thật vẫn là "A phụ trách" đúng như người thao tác đã thấy,
// mọi lần đổi trung gian đều còn nguyên trong lịch sử và nhật ký, và bất biến "mỗi đơn đúng một HANDLE đang mở" không bị vi phạm. Muốn chặn cả ABA thì phải so khớp id dòng
// HANDLE (hoặc thêm số phiên bản) — chưa cần vì không mất dữ liệu nào; đừng "sửa" bằng cách bỏ điều kiện `party_id`, đó mới là điều làm bên thua đua ghi đè người thắng.
const CLOSE_HANDLER = defineSql(
  "dispatch",
  "close_handler",
  `UPDATE dsp_assignment SET valid_to_at = max(?3, valid_from_at), updated_at = ?3, updated_by = ?4
   WHERE order_id = ?1 AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL AND party_id = ?2`,
);

export async function findHandlersOf(db: D1Database, orderIds: readonly string[]): Promise<HandlerRow[]> {
  return (await db.prepare(HANDLERS_OF_ORDERS).bind(JSON.stringify(orderIds)).all<HandlerRow>()).results;
}

export const findHandlerOf = (db: D1Database, orderId: string): Promise<HandlerRow | null> => db.prepare(HANDLER_OF_ORDER).bind(orderId).first<HandlerRow>();

/** `staffId` có phải người phụ trách đang mở của đơn không. */
export async function isHandler(db: D1Database, staffId: string, orderId: string): Promise<boolean> {
  return (await db.prepare(IS_HANDLER).bind(orderId, staffId).first()) !== null;
}

/** Mọi đơn mà `staffId` ĐANG là người phụ trách (HANDLE đang mở) — dùng cho GET /api/dispatch/mine (màn "việc của tôi"). */
export async function findHandledOrderIds(db: D1Database, staffId: string): Promise<string[]> {
  const { results } = await db.prepare(HANDLED_ORDER_IDS).bind(staffId).all<{ order_id: string }>();
  return results.map((r) => r.order_id);
}

/** Dòng HANDLE mới. `at` (UTC) = lúc có hiệu lực; `actorId` = người thao tác (cột WHO). */
export interface NewHandler {
  id: string;
  orderId: string;
  partyId: string;
  at: string;
  actorId: string | null;
}

const bindNew = (db: D1Database, sql: string, h: NewHandler): D1PreparedStatement => db.prepare(sql).bind(h.id, h.orderId, h.partyId, h.at, h.actorId);

export const insertHandlerStatement = (db: D1Database, h: NewHandler): D1PreparedStatement => bindNew(db, INSERT_HANDLER, h);
export const insertHandlerAfterCloseStatement = (db: D1Database, h: NewHandler): D1PreparedStatement => bindNew(db, INSERT_HANDLER_AFTER_CLOSE, h);
export const insertHandlerIfNoneStatement = (db: D1Database, h: NewHandler): D1PreparedStatement => bindNew(db, INSERT_HANDLER_IF_NONE, h);

/** Câu chốt: đóng dòng đang mở của `partyId` (người phụ trách route đã đọc). `meta.changes` = 0 ⇒ người phụ trách đã đổi giữa lúc đọc và ghi. */
export const closeHandlerStatement = (db: D1Database, orderId: string, partyId: string, at: string, actorId: string): D1PreparedStatement =>
  db.prepare(CLOSE_HANDLER).bind(orderId, partyId, at, actorId);

// ---- Sổ tiền lượt 1 (ADR-0024 điều 2, ADR-0025 điều 3c/5) ------------------------------------------------------------------------------------------
/**
 * CÂU BẢO VỆ "người này VẪN là người phụ trách đang mở của đơn" cho lô "Đã giao – đã thu đủ" của billing (cạnh billing → dispatch CHỈ cho câu này — ADR-0024
 * đ2): không đổi giá trị nào (`updated_at = updated_at`), chỉ để `changes()` = 1 khi còn đúng người; câu `orders` đứng ngay sau có `AND changes() > 0`.
 * Đổi người phụ trách KHÔNG đổi `orders.updated_at`, nên khoá lạc quan của đơn không bắt được — câu này đóng khe đó.
 */
const GUARD_HANDLER = defineSql(
  "dispatch",
  "guard_handler",
  `UPDATE dsp_assignment SET updated_at = updated_at WHERE order_id = ?1 AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL AND party_id = ?2`,
);
export const guardHandlerStatement = (db: D1Database, orderId: string, partyId: string): D1PreparedStatement => db.prepare(GUARD_HANDLER).bind(orderId, partyId);

/** Đơn đã "Đã giao – đã thu đủ" chưa (view công bố của orders) — route ghi của dispatch từ chối sớm (ADR-0025 điều 5, bản làm mới §3 mục 12). */
const ORDER_DELIVERED = defineSql("dispatch", "order_delivered", `SELECT delivered_at FROM v_ord_order_state WHERE id = ?1`);
export async function orderDelivered(db: D1Database, orderId: string): Promise<boolean> {
  return ((await db.prepare(ORDER_DELIVERED).bind(orderId).first<{ delivered_at: string | null }>())?.delivered_at ?? null) !== null;
}

/** ADR-0068 Đ2: số đơn CHƯA XONG (chưa huỷ, chưa Đã giao) mà hồ sơ ?1 đang là người phụ trách (HANDLE đang mở). Đọc trạng thái đơn qua view công bố của orders. */
const SO_DON_DANG_PHU_TRACH = defineSql(
  "dispatch",
  "so_don_dang_phu_trach",
  `SELECT count(*) AS n FROM dsp_assignment a JOIN v_ord_order_state o ON o.id = a.order_id
   WHERE a.party_id = ?1 AND a.task_kind_code = 'HANDLE' AND a.valid_to_at IS NULL AND o.status <> 'cancelled' AND o.delivered_at IS NULL`,
);
export async function soDonDangPhuTrach(db: D1Database, partyId: string): Promise<number> {
  return (await db.prepare(SO_DON_DANG_PHU_TRACH).bind(partyId).first<{ n: number }>())?.n ?? 0;
}
