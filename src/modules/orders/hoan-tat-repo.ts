// TỆP SQL "NỬA NGHIÊM" thứ hai của module orders (sổ tiền lượt 1 — ADR-0024 điều 3–4, ADR-0025 điều 3–5; hằng `NUA_NGHIEM` ở src/architecture.test.ts):
// hai mốc "Đã giao – đã thu đủ" / "Hoàn thành" trên đơn. Mọi câu đăng ký bằng `defineSql` (câu TĨNH, tham số ?N) và chịu bài EXPLAIN (chỉ chạm bảng của
// orders / view công bố của module orders được phép phụ thuộc). Tệp này KHÔNG bao giờ đọc bảng/view của billing (ADR-0024 điều 4 — bài "orders không
// nhắc bil_" canh): điều kiện TIỀN của hai bước nằm ở trigger của billing trong CÙNG lô ghi. Import kèm đuôi .ts, không import module khác.
import { defineSql } from "../../shared/sql-registry.ts";

/**
 * Trạng thái đơn cho hai bước chốt: mốc, người lập, khoá lạc quan (`updated_at` + số thứ tự điều chỉnh mới nhất — sửa số khách KHÔNG đổi `updated_at`,
 * kế hoạch §2 / R3), và đơn có người hưởng hoa hồng (`CO_NGUOI_HUONG`: bản chụp hiện hành của đơn, hoặc bên đặt đang mang vai nhóm BÊN NGOÀI qua view công bố của parties).
 */
/**
 * «Đơn có người hưởng hoa hồng» — MỘT luật cho cả hai chỗ (cờ `co_nguoi_huong` để trả câu 409 và điều kiện của câu «Đã giao»), BL-HH-DA-GIAO-KHE:
 * (1) bản chụp thương mại HIỆN HÀNH của đơn (bản không bị bản khác thay) mang người hưởng (`commission_status <> 'NONE'` ⇔ có `beneficiary_party_id`, CHECK ở 0090) —
 * ghim vào chính đơn nên đổi vai bên đặt SAU khi chụp không gỡ được chỗ chặn; (2) dự phòng cũ: bên đặt đang mang vai nhóm bên ngoài (đơn chưa có bản chụp, ví dụ xác nhận trước 0090).
 * `o` = bí danh bảng orders trong câu gọi. Đọc `ord_service_terms` là bảng CỦA orders (không phải bil_ — ADR-0024 điều 4).
 */
const CO_NGUOI_HUONG = (o: string): string =>
  `(EXISTS (SELECT 1 FROM ord_service_terms t WHERE t.order_id = ${o}.id AND t.commission_status <> 'NONE'
        AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id))
     OR EXISTS (SELECT 1 FROM v_pty_open_role_group g WHERE g.party_id = ${o}.booker_party_id AND g.role_group = 'EXTERNAL'))`;

const GIAO_STATE = defineSql(
  "orders",
  "giao_state",
  `SELECT o.id, o.status, o.staff_id, o.updated_at, o.delivered_at, o.delivered_by, o.completed_at, o.completed_by, o.booker_party_id, o.discount, o.total,
     COALESCE((SELECT MAX(a.seq) FROM order_money_adjustment a WHERE a.order_id = o.id), 0) AS adj_seq,
     ${CO_NGUOI_HUONG("o")} AS co_nguoi_huong
   FROM orders o WHERE o.id = ?1`,
);
export interface GiaoStateRow {
  id: string;
  status: "draft" | "confirmed" | "cancelled";
  staff_id: string;
  updated_at: string;
  delivered_at: string | null;
  delivered_by: string | null;
  completed_at: string | null;
  completed_by: string | null;
  booker_party_id: string | null;
  discount: number;
  total: number;
  adj_seq: number;
  co_nguoi_huong: number;
}
export const giaoState = (db: D1Database, orderId: string): Promise<GiaoStateRow | null> => db.prepare(GIAO_STATE).bind(orderId).first<GiaoStateRow>();

/** Ngày đi + tên từng dịch vụ (null = chưa có ngày) — ngày đi MUỘN NHẤT quyết "từ ngày đi trở đi" (ADR-0025 đ3b); thiếu ngày → từ chối (NT-F6c). */
const SERVICE_DATES = defineSql("orders", "service_dates", `SELECT name, depart_date FROM order_service WHERE order_id = ?1 ORDER BY sort_order`);
export async function serviceDates(db: D1Database, orderId: string): Promise<{ name: string; depart_date: string | null }[]> {
  return (await db.prepare(SERVICE_DATES).bind(orderId).all<{ name: string; depart_date: string | null }>()).results;
}

/** Cột nền để tính "phải thu hiện hành" của nhiều đơn (mảng JSON id ở ?1). */
const MONEY_BASE_MANY = defineSql(
  "orders",
  "money_base_many",
  `SELECT o.id, o.status, o.discount, o.total, o.delivered_at, o.completed_at,
     (SELECT MIN(s.depart_date) FROM order_service s WHERE s.order_id = o.id AND s.depart_date IS NOT NULL) AS earliest_depart
   FROM orders o WHERE o.id IN (SELECT value FROM json_each(?1))`,
);
export interface MoneyBaseRow {
  id: string;
  status: "draft" | "confirmed" | "cancelled";
  discount: number;
  total: number;
  delivered_at: string | null;
  completed_at: string | null;
  earliest_depart: string | null;
}
export async function moneyBaseMany(db: D1Database, orderIds: readonly string[]): Promise<MoneyBaseRow[]> {
  if (orderIds.length === 0) return [];
  return (await db.prepare(MONEY_BASE_MANY).bind(JSON.stringify(orderIds)).all<MoneyBaseRow>()).results;
}

/** Id mọi đơn ĐÃ XÁC NHẬN chưa "Đã giao" — ô "Còn thiếu tiền" của Trang chủ (billing tính số, orders chỉ trả tập đơn). */
const CONFIRMED_OPEN_IDS = defineSql("orders", "confirmed_open_ids", `SELECT id FROM orders WHERE status = 'confirmed' AND delivered_at IS NULL`);
export async function confirmedOpenIds(db: D1Database): Promise<string[]> {
  return (await db.prepare(CONFIRMED_OPEN_IDS).all<{ id: string }>()).results.map((r) => r.id);
}

// Điều kiện của câu "Đã giao" (ADR-0025 điều 3 a, b, f; khoá lạc quan R3): đơn đã xác nhận, chưa có mốc; `updated_at` và số thứ tự điều chỉnh mới nhất
// còn ĐÚNG như lúc máy chủ đọc; hôm nay (giờ VN, ?6) ≥ ngày đi muộn nhất; không dịch vụ nào thiếu ngày đi; đơn không có người hưởng hoa hồng (`CO_NGUOI_HUONG`).
const DAT_GIAO_DIEU_KIEN = `id = ?3 AND status = 'confirmed' AND delivered_at IS NULL AND updated_at = ?4
     AND COALESCE((SELECT MAX(a.seq) FROM order_money_adjustment a WHERE a.order_id = orders.id), 0) = ?5
     AND ?6 >= (SELECT MAX(s.depart_date) FROM order_service s WHERE s.order_id = orders.id)
     AND NOT EXISTS (SELECT 1 FROM order_service s WHERE s.order_id = orders.id AND s.depart_date IS NULL)
     AND NOT ${CO_NGUOI_HUONG("orders")}`;
/** Câu "Đã giao" khi KHÔNG có câu bảo vệ đứng trước (Quản trị, Toàn quyền bấm). */
const DAT_GIAO = defineSql("orders", "dat_giao", `UPDATE orders SET delivered_at = ?1, delivered_by = ?2, updated_at = ?1 WHERE ${DAT_GIAO_DIEU_KIEN}`);
/** Câu "Đã giao" ĐỨNG SAU câu bảo vệ người phụ trách của dispatch (mức Hướng dẫn viên): chỉ áp khi câu ngay trước đã áp (`changes() > 0`). */
const DAT_GIAO_SAU_BAO_VE = defineSql("orders", "dat_giao_sau_bao_ve", `UPDATE orders SET delivered_at = ?1, delivered_by = ?2, updated_at = ?1 WHERE ${DAT_GIAO_DIEU_KIEN} AND changes() > 0`);

export interface DatGiaoInput {
  orderId: string;
  at: string;
  by: string;
  expectedUpdatedAt: string;
  expectedAdjSeq: number;
  homNay: string;
  sauCauBaoVe: boolean;
}
export const datGiaoStatement = (db: D1Database, i: DatGiaoInput): D1PreparedStatement =>
  db.prepare(i.sauCauBaoVe ? DAT_GIAO_SAU_BAO_VE : DAT_GIAO).bind(i.at, i.by, i.orderId, i.expectedUpdatedAt, i.expectedAdjSeq, i.homNay);

/** Câu "Hoàn thành" (ADR-0025 điều 6–7): chỉ đặt từ NULL, sau "Đã giao". Trigger `orders_delivered_lock` chỉ cho đúng câu này qua. */
const HOAN_THANH = defineSql(
  "orders",
  "hoan_thanh",
  `UPDATE orders SET completed_at = ?1, completed_by = ?2, updated_at = ?1 WHERE id = ?3 AND delivered_at IS NOT NULL AND completed_at IS NULL`,
);
export const hoanThanhStatement = (db: D1Database, orderId: string, at: string, by: string): D1PreparedStatement => db.prepare(HOAN_THANH).bind(at, by, orderId);
