// TỆP SQL "NỬA NGHIÊM" của ô «Hotline trên vé» (ADR-0231; hằng `NUA_NGHIEM` ở src/architecture.test.ts). Mọi câu trên `ctl_service_support_phone` nằm ở đây, qua `defineSql`.
// Import kèm đuôi .ts và KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node). Câu nhật ký do nơi gọi ghép vào lô; số không vào nhật ký.
import { defineSql } from "../../shared/sql-registry.ts";

const SO_HO_TRO_HIEN_HANH = defineSql("catalog", "support_phone_current", `SELECT code, phone FROM v_ctl_service_support_phone`);
/** Số hiện hành của các dịch vụ đã đặt số; dịch vụ không có khoá thì vé in hotline công ty. */
export async function soHoTroHienHanh(db: D1Database): Promise<Map<string, string>> {
  const { results } = await db.prepare(SO_HO_TRO_HIEN_HANH).all<{ code: string; phone: string }>();
  return new Map(results.map((r) => [r.code, r.phone]));
}

const SO_HO_TRO_MOI_NHAT = defineSql("catalog", "support_phone_latest", `SELECT max(valid_from_at) AS moi_nhat FROM ctl_service_support_phone`);
export const soHoTroMoiNhat = async (db: D1Database): Promise<string | null> => (await db.prepare(SO_HO_TRO_MOI_NHAT).first<{ moi_nhat: string | null }>())?.moi_nhat ?? null;

const SO_HO_TRO_THEM = defineSql(
  "catalog",
  "support_phone_insert",
  `INSERT INTO ctl_service_support_phone (id, code, phone, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?4, ?5)`,
);
export const cauThemSoHoTro = (db: D1Database, v: { id: string; ma: string; so: string | null; at: string; by: string }): D1PreparedStatement =>
  db.prepare(SO_HO_TRO_THEM).bind(v.id, v.ma, v.so, v.at, v.by);
