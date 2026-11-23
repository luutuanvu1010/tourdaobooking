// TỆP SQL "NỬA NGHIÊM" của «Giá mùa vụ» (ADR-0229 Đ1, Đ3, Đ8; hằng `NUA_NGHIEM` ở src/architecture.test.ts). Mọi câu trên `ctl_seasonal_price`, `ctl_seasonal_price_cap`
// nằm ở đây, qua `defineSql`. Import kèm đuôi .ts và KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node). Câu nhật ký do nơi gọi ghép vào lô.
// Bảng chỉ thêm: không `DELETE`; `UPDATE` chỉ đặt mốc duyệt một lần hoặc mốc kết thúc một lần (trigger `ctl_seasonal_price_one_way` canh lớp CSDL).
import { defineSql } from "../../shared/sql-registry.ts";
import type { PhamViMuaVu, QuyTacMuaVu } from "../../shared/gia-mua-vu.ts";

export interface QuyTacRow {
  id: string;
  scope: PhamViMuaVu;
  catalog_code: string | null;
  group_code: string | null;
  from_date: string;
  to_date: string;
  pct: number;
  amount: number;
  note: string | null;
  created_at: string;
  created_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  ended_at: string | null;
}
const COT = `id, scope, catalog_code, group_code, from_date, to_date, pct, amount, note, created_at, created_by, approved_at, approved_by, ended_at`;

export const thanhQuyTac = (r: QuyTacRow): QuyTacMuaVu => ({
  id: r.id, phamVi: r.scope, ma: (r.scope === "SERVICE" ? r.catalog_code : r.group_code) ?? "", tu: r.from_date, den: r.to_date,
  phanTram: r.pct, soTien: r.amount, daDuyet: r.approved_at !== null, daKetThuc: r.ended_at !== null,
});

// Quy tắc CHƯA KẾT THÚC có ngày cuối từ ?1 trở đi (gồm cả chờ duyệt — màn danh sách và kiểm chồng ngày cần; hàm tính tự bỏ quy tắc chưa duyệt).
const SEASONAL_OPEN_FROM = defineSql("catalog", "seasonal_open_from", `SELECT ${COT} FROM ctl_seasonal_price WHERE ended_at IS NULL AND to_date >= ?1 ORDER BY from_date, created_at, id`);
export async function quyTacChuaKetThuc(db: D1Database, tuNgay: string): Promise<QuyTacRow[]> {
  return (await db.prepare(SEASONAL_OPEN_FROM).bind(tuNgay).all<QuyTacRow>()).results;
}

// Quy tắc chưa kết thúc cùng phạm vi, cùng mã (mọi ngày) — kiểm chồng ngày lúc đặt (Đ3).
const SEASONAL_OPEN_SAME = defineSql(
  "catalog",
  "seasonal_open_same_scope",
  `SELECT ${COT} FROM ctl_seasonal_price WHERE ended_at IS NULL AND scope = ?1 AND (catalog_code = ?2 OR group_code = ?2)`,
);
export async function quyTacCungMa(db: D1Database, scope: PhamViMuaVu, ma: string): Promise<QuyTacRow[]> {
  return (await db.prepare(SEASONAL_OPEN_SAME).bind(scope, ma).all<QuyTacRow>()).results;
}

const SEASONAL_GET = defineSql("catalog", "seasonal_get", `SELECT ${COT} FROM ctl_seasonal_price WHERE id = ?1`);
export async function quyTacTheoId(db: D1Database, id: string): Promise<QuyTacRow | null> {
  return await db.prepare(SEASONAL_GET).bind(id).first<QuyTacRow>();
}

// Đ6: quy tắc theo danh sách mã (kể cả đã kết thúc) — bản chụp của đơn trỏ tới. Tối đa vài chục mã mỗi đơn; truyền dạng JSON để câu tĩnh.
const SEASONAL_BY_IDS = defineSql("catalog", "seasonal_by_ids", `SELECT ${COT} FROM ctl_seasonal_price WHERE id IN (SELECT value FROM json_each(?1))`);
export async function quyTacTheoIds(db: D1Database, ids: readonly string[]): Promise<QuyTacRow[]> {
  if (ids.length === 0) return [];
  return (await db.prepare(SEASONAL_BY_IDS).bind(JSON.stringify([...new Set(ids)])).all<QuyTacRow>()).results;
}

const SEASONAL_INSERT = defineSql(
  "catalog",
  "seasonal_insert",
  `INSERT INTO ctl_seasonal_price (id, scope, catalog_code, group_code, from_date, to_date, pct, amount, note, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?10, ?11)`,
);
export const cauThemQuyTac = (
  db: D1Database,
  v: { id: string; scope: PhamViMuaVu; ma: string; tuNgay: string; denNgay: string; phanTram: number; soTien: number; ghiChu: string | null; at: string; by: string },
): D1PreparedStatement =>
  db.prepare(SEASONAL_INSERT).bind(v.id, v.scope, v.scope === "SERVICE" ? v.ma : null, v.scope === "GROUP" ? v.ma : null, v.tuNgay, v.denNgay, v.phanTram, v.soTien, v.ghiChu, v.at, v.by);

// CỐ Ý không kèm điều kiện trạng thái: duyệt lần hai / duyệt quy tắc đã kết thúc thì trigger ném ABORT, cả lô (kèm câu nhật ký) lùi lại; người tự duyệt bị CHECK chặn.
const SEASONAL_APPROVE = defineSql("catalog", "seasonal_approve", `UPDATE ctl_seasonal_price SET approved_at = ?2, approved_by = ?3, updated_at = ?2, updated_by = ?3 WHERE id = ?1`);
export const cauDuyetQuyTac = (db: D1Database, v: { id: string; at: string; by: string }): D1PreparedStatement => db.prepare(SEASONAL_APPROVE).bind(v.id, v.at, v.by);

const SEASONAL_END = defineSql("catalog", "seasonal_end", `UPDATE ctl_seasonal_price SET ended_at = ?2, ended_by = ?3, updated_at = ?2, updated_by = ?3 WHERE id = ?1`);
export const cauKetThucQuyTac = (db: D1Database, v: { id: string; at: string; by: string }): D1PreparedStatement => db.prepare(SEASONAL_END).bind(v.id, v.at, v.by);

const CAP_CURRENT = defineSql("catalog", "seasonal_cap_current", `SELECT max_pct FROM ctl_seasonal_price_cap ORDER BY created_at DESC, id DESC LIMIT 1`);
/** Trần % hiện hành (Đ8). Bảng gieo sẵn một dòng; thiếu dòng (không nên xảy ra) ⇒ 0, tức không quy tắc % nào qua được — chặt, không đoán. */
export async function tranHienHanh(db: D1Database): Promise<number> {
  return (await db.prepare(CAP_CURRENT).first<{ max_pct: number }>())?.max_pct ?? 0;
}
const CAP_INSERT = defineSql(
  "catalog",
  "seasonal_cap_insert",
  `INSERT INTO ctl_seasonal_price_cap (id, max_pct, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?3, ?4)`,
);
export const cauDatTran = (db: D1Database, v: { id: string; maxPct: number; at: string; by: string }): D1PreparedStatement =>
  db.prepare(CAP_INSERT).bind(v.id, v.maxPct, v.at, v.by);
