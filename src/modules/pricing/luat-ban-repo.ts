// SQL của LUẬT BÁN theo loại đối tác (ADR-0146 Đ1, Đ3; ADR-0152 Đ2; kế hoạch 2026-10-30 R-3, T6). Tệp DUY NHẤT của mã chạy được nhắc bảng `prc_sales_block` (hàng rào (a),
// `src/luat-ban-mot-tep.test.ts`); module nghiêm (`STRICT` ở src/architecture.test.ts): câu TĨNH qua `defineSql`, tham số ?N. Đọc xuyên module chỉ qua view công bố
// (`v_ctl_service_attribute`, `v_ctl_attribute_value` của catalog — chỉ khoá / cờ, hàng rào (l2)). Ngày «hôm nay» là ngày Việt Nam do nơi gọi truyền vào (không date('now')).
// Import kèm đuôi .ts và KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node). Không DELETE, không OR REPLACE (bảng chỉ thêm).
import { defineSql } from "../../shared/sql-registry.ts";

export interface LuatBanRow {
  id: string; role_type_code: string; scope: "SERVICE" | "GROUP" | "ATTRIBUTE"; catalog_code: string | null; group_code: string | null; attribute_code: string | null;
  value_code: string | null; valid_from_date: string; valid_to_date: string | null; note: string | null; created_at: string; created_by: string | null; updated_at: string; updated_by: string | null;
}
export interface GiaTriDacDiemRow { attribute_code: string; code: string; active: number; attribute_active: number }

const COT = `id, role_type_code, scope, catalog_code, group_code, attribute_code, value_code, valid_from_date, valid_to_date, note, created_at, created_by, updated_at, updated_by`;
const LB_LIST = defineSql("pricing", "sales_block_list", `SELECT ${COT} FROM prc_sales_block ORDER BY role_type_code, valid_from_date DESC, created_at DESC`);
const LB_GET = defineSql("pricing", "sales_block_get", `SELECT ${COT} FROM prc_sales_block WHERE id = ?1`);
// Luật CÒN HIỆU LỰC ở ngày ?2 của các loại ?1 (mảng JSON) — `chanBan` xét lại `hieuLuc` (một luật hiệu lực; câu này chỉ để đọc ít dòng).
const LB_ON = defineSql(
  "pricing",
  "sales_block_on",
  `SELECT ${COT} FROM prc_sales_block WHERE role_type_code IN (SELECT value FROM json_each(?1)) AND valid_from_date <= ?2 AND (valid_to_date IS NULL OR valid_to_date >= ?2)`,
);
// ADR-0146 Đ1 (409 tắt loại): luật CHƯA HẾT HẠN của một loại — CÙNG vị từ với kiểm định kỳ R-PRC-8 (`CHUA_HET_HAN` của scripts/audit-checks.mjs: kết thúc trống hoặc ≥ hôm nay),
// kể cả luật SẮP áp dụng. Lệch vị từ thì một lần tắt loại hợp lệ theo route sẽ làm kiểm định kỳ đỏ (sổ thi công T3, T6).
const LB_DEM_CHUA_HET_HAN = defineSql("pricing", "sales_block_count_live", `SELECT COUNT(*) AS n FROM prc_sales_block WHERE role_type_code = ?1 AND (valid_to_date IS NULL OR valid_to_date >= ?2) AND (valid_to_date IS NULL OR valid_to_date >= valid_from_date)`);
// ↑ «còn luật» = chưa hết hạn VÀ không phải khoảng rỗng (R-1, ruling điều phối 30/10: «Kết thúc ngay» luật sắp áp dụng ⇒ đến = từ − 1 ⇒ coi như đã kết thúc). CÙNG vị từ
//   với kiểm định kỳ R-PRC-8 (`scripts/audit-checks.mjs`) và trạng thái «Đã kết thúc» (`trangThaiLuat` ở index.ts); bài ở luat-ban-route.test.ts ghim hai câu SQL trùng vế.
const LB_INSERT = defineSql(
  "pricing",
  "sales_block_insert",
  `INSERT INTO prc_sales_block (${COT}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?11, ?12)`,
);
// Đặt ngày kết thúc MỘT lần (trigger `prc_sales_block_close_only` là lưới CSDL); `changes = 0` = người khác vừa kết thúc ⇒ 409 `stale`.
const LB_END = defineSql("pricing", "sales_block_end", `UPDATE prc_sales_block SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND valid_to_date IS NULL`);
// Giá trị hiệu lực của các dịch vụ ?1 (mảng JSON mã) cho mọi đặc điểm — view của catalog tính «riêng thắng chung».
const DAC_DIEM_CUA = defineSql(
  "pricing",
  "service_attributes_of",
  `SELECT catalog_code, attribute_code, value_code FROM v_ctl_service_attribute WHERE catalog_code IN (SELECT value FROM json_each(?1))`,
);
// Một mã giá trị: thuộc đặc điểm nào, giá trị và đặc điểm cha có đang bật (ADR-0152 Đ2 tiêu chí 13; siết sau KĐL-1).
const GIA_TRI = defineSql("pricing", "attribute_value_flags", `SELECT attribute_code, code, active, attribute_active FROM v_ctl_attribute_value WHERE code = ?1`);
const GIA_TRI_NHIEU = defineSql(
  "pricing",
  "attribute_value_flags_many",
  `SELECT attribute_code, code, active, attribute_active FROM v_ctl_attribute_value WHERE code IN (SELECT value FROM json_each(?1))`,
);

export const danhSachLuatBan = async (db: D1Database): Promise<LuatBanRow[]> => (await db.prepare(LB_LIST).all<LuatBanRow>()).results;
export const luatBanTheoId = async (db: D1Database, id: string): Promise<LuatBanRow | null> => (await db.prepare(LB_GET).bind(id).first<LuatBanRow>()) ?? null;
export const luatBanHieuLuc = async (db: D1Database, loai: readonly string[], ngay: string): Promise<LuatBanRow[]> =>
  loai.length === 0 ? [] : (await db.prepare(LB_ON).bind(JSON.stringify([...loai]), ngay).all<LuatBanRow>()).results;
export const demLuatBanChuaHetHan = async (db: D1Database, roleTypeCode: string, homNay: string): Promise<number> =>
  Number((await db.prepare(LB_DEM_CHUA_HET_HAN).bind(roleTypeCode, homNay).first<{ n: number }>())?.n ?? 0);
/** `catalog_code → (attribute_code → value_code)` của các mã. Rỗng → không truy vấn. */
export async function giaTriDacDiemCua(db: D1Database, codes: readonly string[]): Promise<Map<string, Map<string, string>>> {
  const out = new Map<string, Map<string, string>>();
  if (codes.length === 0) return out;
  for (const r of (await db.prepare(DAC_DIEM_CUA).bind(JSON.stringify([...codes])).all<{ catalog_code: string; attribute_code: string; value_code: string }>()).results) {
    const m = out.get(r.catalog_code) ?? new Map<string, string>();
    m.set(r.attribute_code, r.value_code);
    out.set(r.catalog_code, m);
  }
  return out;
}
export const coGiaTri = async (db: D1Database, valueCode: string): Promise<GiaTriDacDiemRow | null> => (await db.prepare(GIA_TRI).bind(valueCode).first<GiaTriDacDiemRow>()) ?? null;
export async function coCacGiaTri(db: D1Database, valueCodes: readonly string[]): Promise<Map<string, GiaTriDacDiemRow>> {
  if (valueCodes.length === 0) return new Map();
  const rows = (await db.prepare(GIA_TRI_NHIEU).bind(JSON.stringify([...new Set(valueCodes)])).all<GiaTriDacDiemRow>()).results;
  return new Map(rows.map((r) => [r.code, r]));
}

export interface ThemLuatBan {
  id: string; roleTypeCode: string; scope: "SERVICE" | "GROUP" | "ATTRIBUTE"; catalogCode: string | null; groupCode: string | null; attributeCode: string | null; valueCode: string | null;
  validFrom: string; validTo: string | null; note: string | null; at: string; by: string;
}
export const themLuatBanStatement = (db: D1Database, v: ThemLuatBan): D1PreparedStatement =>
  db.prepare(LB_INSERT).bind(v.id, v.roleTypeCode, v.scope, v.catalogCode, v.groupCode, v.attributeCode, v.valueCode, v.validFrom, v.validTo, v.note, v.at, v.by);
export const ketThucLuatBanStatement = (db: D1Database, id: string, denNgay: string, at: string, by: string): D1PreparedStatement =>
  db.prepare(LB_END).bind(id, denNgay, at, by);
