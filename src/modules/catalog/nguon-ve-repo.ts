// TỆP SQL "NỬA NGHIÊM" của ô «Vé do ai phát» (ADR-0175 Đ1.2; theo nhóm ADR-0230 Đ3; hằng `NUA_NGHIEM` ở src/architecture.test.ts). Mọi câu trên `ctl_service_ticket_source`
// (theo dịch vụ) và `ctl_group_ticket_source` (theo nhóm) nằm ở đây, qua `defineSql`.
// Import kèm đuôi .ts và KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node). Câu nhật ký do nơi gọi ghép vào lô.
import { defineSql } from "../../shared/sql-registry.ts";
import type { NguonVe } from "../../shared/nguon-ve.ts";

const NGUON_VE_HIEN_HANH = defineSql("catalog", "ticket_source_current", `SELECT code, source FROM v_ctl_service_ticket_source`);
const NGUON_VE_NHOM_HIEN_HANH = defineSql("catalog", "group_ticket_source_current", `SELECT group_code, source FROM v_ctl_group_ticket_source`);
/** Giá trị hiện hành đã đặt: theo dịch vụ và theo nhóm. Gộp thành giá trị của một dịch vụ bằng `nguonVeCua` (src/shared/nguon-ve.ts). */
export async function nguonVeHienHanh(db: D1Database): Promise<{ nguonDichVu: Map<string, NguonVe>; nguonNhom: Map<string, NguonVe> }> {
  const [dv, nhom] = await Promise.all([
    db.prepare(NGUON_VE_HIEN_HANH).all<{ code: string; source: NguonVe }>(),
    db.prepare(NGUON_VE_NHOM_HIEN_HANH).all<{ group_code: string; source: NguonVe }>(),
  ]);
  return { nguonDichVu: new Map(dv.results.map((r) => [r.code, r.source])), nguonNhom: new Map(nhom.results.map((r) => [r.group_code, r.source])) };
}

const NGUON_VE_MOI_NHAT = defineSql("catalog", "ticket_source_latest", `SELECT max(valid_from_at) AS moi_nhat FROM ctl_service_ticket_source`);
export const nguonVeMoiNhat = async (db: D1Database): Promise<string | null> => (await db.prepare(NGUON_VE_MOI_NHAT).first<{ moi_nhat: string | null }>())?.moi_nhat ?? null;

const NGUON_VE_NHOM_MOI_NHAT = defineSql("catalog", "group_ticket_source_latest", `SELECT max(valid_from_at) AS moi_nhat FROM ctl_group_ticket_source`);
export const nguonVeNhomMoiNhat = async (db: D1Database): Promise<string | null> => (await db.prepare(NGUON_VE_NHOM_MOI_NHAT).first<{ moi_nhat: string | null }>())?.moi_nhat ?? null;

const NGUON_VE_THEM = defineSql(
  "catalog",
  "ticket_source_insert",
  `INSERT INTO ctl_service_ticket_source (id, code, source, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?4, ?5)`,
);
export const cauThemNguonVe = (db: D1Database, v: { id: string; ma: string; nguon: NguonVe; at: string; by: string }): D1PreparedStatement =>
  db.prepare(NGUON_VE_THEM).bind(v.id, v.ma, v.nguon, v.at, v.by);

const NGUON_VE_NHOM_THEM = defineSql(
  "catalog",
  "group_ticket_source_insert",
  `INSERT INTO ctl_group_ticket_source (id, group_code, source, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?4, ?5)`,
);
export const cauThemNguonVeNhom = (db: D1Database, v: { id: string; nhom: string; nguon: NguonVe; at: string; by: string }): D1PreparedStatement =>
  db.prepare(NGUON_VE_NHOM_THEM).bind(v.id, v.nhom, v.nguon, v.at, v.by);
