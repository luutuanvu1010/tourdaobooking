// TỆP SQL "NỬA NGHIÊM" của chi tiết dịch vụ (ADR-0201 Đ1; hằng `NUA_NGHIEM` ở src/architecture.test.ts). Mọi câu trên `ctl_service_detail` nằm ở đây, qua `defineSql`.
// Import kèm đuôi .ts và KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node). Câu nhật ký do nơi gọi ghép vào lô.
import { defineSql } from "../../shared/sql-registry.ts";
import type { ChiTietDichVu } from "../../shared/chi-tiet-dich-vu.ts";

export interface ChiTietDong extends ChiTietDichVu { tenSheetLucGhi: string; khoaAnh: string | null }

const HIEN_HANH = defineSql("catalog", "service_detail_current", `SELECT code, display_name, description, image_key, sheet_name_at FROM v_ctl_service_detail`);
/** Chi tiết hiện hành của các dịch vụ đã có dòng; dịch vụ không có khoá = chưa có chi tiết (dùng tên Sheet). */
export async function chiTietHienHanh(db: D1Database): Promise<Map<string, ChiTietDong>> {
  const { results } = await db
    .prepare(HIEN_HANH)
    .all<{ code: string; display_name: string | null; description: string | null; image_key: string | null; sheet_name_at: string }>();
  return new Map(results.map((r) => [r.code, { tenHienThi: r.display_name, moTa: r.description, khoaAnh: r.image_key, tenSheetLucGhi: r.sheet_name_at }]));
}

const MOI_NHAT = defineSql("catalog", "service_detail_latest", `SELECT max(valid_from_at) AS moi_nhat FROM ctl_service_detail`);
export const chiTietMoiNhat = async (db: D1Database): Promise<string | null> => (await db.prepare(MOI_NHAT).first<{ moi_nhat: string | null }>())?.moi_nhat ?? null;

const THEM = defineSql(
  "catalog",
  "service_detail_insert",
  `INSERT INTO ctl_service_detail (id, code, display_name, description, image_key, sheet_name_at, valid_from_at, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, ?8, ?7, ?8)`,
);
export const cauThemChiTiet = (
  db: D1Database,
  v: { id: string; ma: string; tenHienThi: string | null; moTa: string | null; khoaAnh: string | null; tenSheet: string; at: string; by: string },
): D1PreparedStatement => db.prepare(THEM).bind(v.id, v.ma, v.tenHienThi, v.moTa, v.khoaAnh, v.tenSheet, v.at, v.by);
