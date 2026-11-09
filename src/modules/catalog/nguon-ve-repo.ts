// TỆP SQL "NỬA NGHIÊM" của ô «Vé do ai phát» (ADR-0175 Đ1.2; hằng `NUA_NGHIEM` ở src/architecture.test.ts). Mọi câu trên `ctl_service_ticket_source` nằm ở đây, qua `defineSql`.
// Import kèm đuôi .ts và KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node). Câu nhật ký do nơi gọi ghép vào lô.
import { defineSql } from "../../shared/sql-registry.ts";
import type { NguonVe } from "../../shared/nguon-ve.ts";

const NGUON_VE_HIEN_HANH = defineSql("catalog", "ticket_source_current", `SELECT code, source FROM v_ctl_service_ticket_source`);
/** Giá trị hiện hành của các dịch vụ đã đặt ô; dịch vụ không có khoá là vé hãng ngoài (`nguonVeCua`). */
export async function nguonVeHienHanh(db: D1Database): Promise<Map<string, NguonVe>> {
  const { results } = await db.prepare(NGUON_VE_HIEN_HANH).all<{ code: string; source: NguonVe }>();
  return new Map(results.map((r) => [r.code, r.source]));
}

const NGUON_VE_MOI_NHAT = defineSql("catalog", "ticket_source_latest", `SELECT max(valid_from_at) AS moi_nhat FROM ctl_service_ticket_source`);
export const nguonVeMoiNhat = async (db: D1Database): Promise<string | null> => (await db.prepare(NGUON_VE_MOI_NHAT).first<{ moi_nhat: string | null }>())?.moi_nhat ?? null;

const NGUON_VE_THEM = defineSql(
  "catalog",
  "ticket_source_insert",
  `INSERT INTO ctl_service_ticket_source (id, code, source, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?4, ?5)`,
);
export const cauThemNguonVe = (db: D1Database, v: { id: string; ma: string; nguon: NguonVe; at: string; by: string }): D1PreparedStatement =>
  db.prepare(NGUON_VE_THEM).bind(v.id, v.ma, v.nguon, v.at, v.by);
