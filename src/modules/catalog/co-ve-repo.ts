// TỆP SQL "NỬA NGHIÊM" của ô «Có vé» (ADR-0174 Đ1; hằng `NUA_NGHIEM` ở src/architecture.test.ts). Mọi câu trên `ctl_service_ticket_flag` nằm ở đây, qua `defineSql`.
// Import kèm đuôi .ts và KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node). Câu nhật ký do nơi gọi ghép vào lô.
import { defineSql } from "../../shared/sql-registry.ts";

export interface CoVeRow { scope: "SERVICE" | "GROUP"; code: string; has_ticket: number }

const CO_VE_HIEN_HANH = defineSql("catalog", "ticket_flag_current", `SELECT scope, code, has_ticket FROM v_ctl_service_ticket_flag`);
export async function coVeHienHanh(db: D1Database): Promise<{ coDichVu: Map<string, boolean>; coNhom: Map<string, boolean> }> {
  const { results } = await db.prepare(CO_VE_HIEN_HANH).all<CoVeRow>();
  const coDichVu = new Map<string, boolean>();
  const coNhom = new Map<string, boolean>();
  for (const r of results) (r.scope === "SERVICE" ? coDichVu : coNhom).set(r.code, r.has_ticket === 1);
  return { coDichVu, coNhom };
}

const CO_VE_MOI_NHAT = defineSql("catalog", "ticket_flag_latest", `SELECT max(valid_from_at) AS moi_nhat FROM ctl_service_ticket_flag`);
export const coVeMoiNhat = async (db: D1Database): Promise<string | null> => (await db.prepare(CO_VE_MOI_NHAT).first<{ moi_nhat: string | null }>())?.moi_nhat ?? null;

const CO_VE_THEM = defineSql(
  "catalog",
  "ticket_flag_insert",
  `INSERT INTO ctl_service_ticket_flag (id, scope, code, has_ticket, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6, ?5, ?6)`,
);
export const cauThemCoVe = (db: D1Database, v: { id: string; pham: "SERVICE" | "GROUP"; ma: string; coVe: boolean; at: string; by: string }): D1PreparedStatement =>
  db.prepare(CO_VE_THEM).bind(v.id, v.pham, v.ma, v.coVe ? 1 : 0, v.at, v.by);
