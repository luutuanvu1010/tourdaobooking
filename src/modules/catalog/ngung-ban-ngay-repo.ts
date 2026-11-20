// TỆP SQL "NỬA NGHIÊM" của «Ngừng bán theo ngày» (ADR-0220 Đ1; hằng `NUA_NGHIEM` ở src/architecture.test.ts). Mọi câu trên `ctl_sales_pause` nằm ở đây, qua `defineSql`.
// Import kèm đuôi .ts và KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node). Câu nhật ký do nơi gọi ghép vào lô.
// Bảng chỉ thêm: không `DELETE`; câu `UPDATE` duy nhất là đặt mốc kết thúc một lần (trigger `ctl_sales_pause_close_only` canh lớp CSDL).
import { defineSql } from "../../shared/sql-registry.ts";
import type { KhoangNgungBan, PhamViNgungBan } from "./ngung-ban-ngay-rules.ts";

export interface KhoangRow {
  id: string;
  scope: PhamViNgungBan;
  catalog_code: string | null;
  group_code: string | null;
  from_date: string;
  to_date: string;
  note: string | null;
  created_at: string;
  created_by: string | null;
}
const COT = `id, scope, catalog_code, group_code, from_date, to_date, note, created_at, created_by`;

// Khoảng CÒN CHẶN có ngày cuối từ ?1 trở đi (khoảng đã qua không còn chặn được ngày nào người ta lập đơn — nhưng cổng vẫn truyền ngày nhỏ nhất của đơn, không phải hôm nay).
const PAUSE_OPEN_FROM = defineSql("catalog", "sales_pause_open_from", `SELECT ${COT} FROM ctl_sales_pause WHERE ended_at IS NULL AND to_date >= ?1 ORDER BY from_date, created_at, id`);
export async function khoangConChan(db: D1Database, tuNgay: string): Promise<KhoangRow[]> {
  return (await db.prepare(PAUSE_OPEN_FROM).bind(tuNgay).all<KhoangRow>()).results;
}
export const thanhKhoang = (r: KhoangRow): KhoangNgungBan => ({ id: r.id, scope: r.scope, catalogCode: r.catalog_code, groupCode: r.group_code, fromDate: r.from_date, toDate: r.to_date });

const PAUSE_GET = defineSql("catalog", "sales_pause_get", `SELECT ${COT}, ended_at FROM ctl_sales_pause WHERE id = ?1`);
export async function khoangTheoId(db: D1Database, id: string): Promise<(KhoangRow & { ended_at: string | null }) | null> {
  return await db.prepare(PAUSE_GET).bind(id).first<KhoangRow & { ended_at: string | null }>();
}

const PAUSE_INSERT = defineSql(
  "catalog",
  "sales_pause_insert",
  `INSERT INTO ctl_sales_pause (id, scope, catalog_code, group_code, from_date, to_date, note, created_at, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
);
export const cauThemKhoang = (
  db: D1Database,
  v: { id: string; scope: PhamViNgungBan; ma: string; tuNgay: string; denNgay: string; ghiChu: string | null; at: string; by: string },
): D1PreparedStatement => db.prepare(PAUSE_INSERT).bind(v.id, v.scope, v.scope === "SERVICE" ? v.ma : null, v.scope === "GROUP" ? v.ma : null, v.tuNgay, v.denNgay, v.ghiChu, v.at, v.by);

// CỐ Ý không kèm `AND ended_at IS NULL`: khoảng đã kết thúc thì trigger `ctl_sales_pause_close_only` ném ABORT, cả lô (kèm câu nhật ký) lùi lại — hai người
// cùng bấm Kết thúc thì đúng một lần ghi và một dòng nhật ký; nơi gọi bắt lỗi `ctl_append_only` và trả 409.
const PAUSE_END = defineSql("catalog", "sales_pause_end", `UPDATE ctl_sales_pause SET ended_at = ?2, ended_by = ?3 WHERE id = ?1`);
export const cauKetThucKhoang = (db: D1Database, v: { id: string; at: string; by: string }): D1PreparedStatement => db.prepare(PAUSE_END).bind(v.id, v.at, v.by);
