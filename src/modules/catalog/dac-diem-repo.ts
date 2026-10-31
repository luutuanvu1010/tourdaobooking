// TỆP SQL "NỬA NGHIÊM" thứ hai của module catalog (ADR-0152 Đ1, Đ6 (f); hằng `NUA_NGHIEM` ở src/architecture.test.ts). MỌI câu trên ba bảng `ctl_attribute`,
// `ctl_attribute_value`, `ctl_attribute_assignment` (migration 0128) nằm ở tệp này, đăng ký bằng `defineSql` (câu TĨNH, tham số ?N) và chịu bài EXPLAIN + bài
// `.prepare(<chuỗi thô>)`. Không `DELETE`, không `OR REPLACE`. Bài (f) (`src/dac-diem-chi-mot-tep.test.ts`) bắt mọi tệp mã chạy khác nhắc ba bảng này.
// Import kèm đuôi .ts và KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node). Câu nhật ký do nơi gọi (index.ts) ghép vào lô —
// các hàm ghi ở đây chỉ TRẢ câu chuẩn bị, không tự chạy. Đọc TÊN đặc điểm / giá trị chỉ ở đây (hàng rào (l2)): view công bố chỉ có khoá.
import { defineSql } from "../../shared/sql-registry.ts";

// ---- Kiểu dòng ------------------------------------------------------------------------------------------------------------------------------

export interface DacDiemRow { code: string; name: string; sort_order: number; active: number; created_at: string; updated_at: string }
export interface GiaTriRow extends DacDiemRow { attribute_code: string }
export interface HieuLucRow { catalog_code: string; attribute_code: string; value_code: string; source: "SERVICE" | "GROUP" }
export interface GanNhomRow { group_code: string; attribute_code: string; value_code: string }
export interface DichVuDacDiemRow { code: string; in_sheet: number; hidden: number; first_seen_at: string }
export interface TenGiaTriRow { value_code: string; value_name: string; attribute_name: string }

// ---- Câu SQL (đăng ký) ----------------------------------------------------------------------------------------------------------------------

const ATTR_LIST = defineSql("catalog", "attr_list", `SELECT code, name, sort_order, active, created_at, updated_at FROM ctl_attribute ORDER BY sort_order, name`);
const ATTR_GET = defineSql("catalog", "attr_get", `SELECT code, name, sort_order, active, created_at, updated_at FROM ctl_attribute WHERE code = ?1`);
const ATTR_VALUE_LIST = defineSql(
  "catalog",
  "attr_value_list",
  `SELECT code, attribute_code, name, sort_order, active, created_at, updated_at FROM ctl_attribute_value ORDER BY attribute_code, sort_order, name`,
);
const ATTR_VALUE_GET = defineSql(
  "catalog",
  "attr_value_get",
  `SELECT code, attribute_code, name, sort_order, active, created_at, updated_at FROM ctl_attribute_value WHERE code = ?1`,
);
// Giá trị HIỆU LỰC (riêng thắng chung) — đọc view của chính module: một nguồn sự thật, không viết lại phép ở TypeScript.
const ATTR_EFFECTIVE_ALL = defineSql("catalog", "attr_effective_all", `SELECT catalog_code, attribute_code, value_code, source FROM v_ctl_service_attribute`);
const ATTR_GROUP_OPEN_ALL = defineSql(
  "catalog",
  "attr_group_open_all",
  `SELECT group_code, attribute_code, value_code FROM ctl_attribute_assignment WHERE group_code IS NOT NULL AND valid_to_at IS NULL`,
);
const ATTR_SERVICE_OPEN_ONE = defineSql(
  "catalog",
  "attr_service_open_one",
  `SELECT value_code FROM ctl_attribute_assignment WHERE service_code = ?1 AND attribute_code = ?2 AND valid_to_at IS NULL`,
);
const ATTR_GROUP_OPEN_ONE = defineSql(
  "catalog",
  "attr_group_open_one",
  `SELECT value_code FROM ctl_attribute_assignment WHERE group_code = ?1 AND attribute_code = ?2 AND valid_to_at IS NULL`,
);
const ATTR_COUNT_OPEN_BY_ATTRIBUTE = defineSql(
  "catalog",
  "attr_count_open_by_attribute",
  `SELECT COUNT(*) AS n FROM ctl_attribute_assignment WHERE attribute_code = ?1 AND valid_to_at IS NULL`,
);
const ATTR_COUNT_OPEN_BY_VALUE = defineSql(
  "catalog",
  "attr_count_open_by_value",
  `SELECT COUNT(*) AS n FROM ctl_attribute_assignment WHERE value_code = ?1 AND valid_to_at IS NULL`,
);
// Tên đặc điểm + tên giá trị của các mã giá trị — chỉ để viết câu báo (409 `sales_blocked`) qua hàm công bố hẹp `tenDacDiemTheoMa` của index.ts (ADR-0152 Đ2, R-3).
const ATTR_NAMES_BY_VALUE = defineSql(
  "catalog",
  "attr_names_by_value",
  `SELECT v.code AS value_code, v.name AS value_name, a.name AS attribute_name FROM ctl_attribute_value v JOIN ctl_attribute a ON a.code = v.attribute_code
   WHERE v.code IN (SELECT value FROM json_each(?1))`,
);
// Dịch vụ của danh mục cho danh sách «chưa khai» / «mới, đang theo nhóm» (ADR-0152 Đ5): còn trên Sheet, bị ẩn, lần đầu thấy.
const ATTR_SERVICES = defineSql(
  "catalog",
  "attr_services",
  `SELECT i.code, i.in_sheet, COALESCE(o.hidden, 0) AS hidden, i.first_seen_at FROM catalog_item i LEFT JOIN catalog_override o ON o.code = i.code ORDER BY i.code`,
);

const ATTR_INSERT = defineSql(
  "catalog",
  "attr_insert",
  `INSERT INTO ctl_attribute (code, name, sort_order, active, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, 1, ?4, ?5, ?4, ?5)`,
);
const ATTR_VALUE_INSERT = defineSql(
  "catalog",
  "attr_value_insert",
  `INSERT INTO ctl_attribute_value (code, attribute_code, name, sort_order, active, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?5, ?6)`,
);
// Khoá lạc quan theo `updated_at` cũ (?7). Tắt (?4 = 0) chỉ ghi khi không còn dòng gắn mở — lưới chặn đua trong câu (trigger R-8 của 0128 là lưới CSDL).
const ATTR_UPDATE = defineSql(
  "catalog",
  "attr_update",
  `UPDATE ctl_attribute SET name = ?2, sort_order = ?3, active = ?4, updated_at = ?5, updated_by = ?6 WHERE code = ?1 AND updated_at = ?7
     AND (?4 = 1 OR NOT EXISTS (SELECT 1 FROM ctl_attribute_assignment s WHERE s.attribute_code = ?1 AND s.valid_to_at IS NULL))`,
);
const ATTR_VALUE_UPDATE = defineSql(
  "catalog",
  "attr_value_update",
  `UPDATE ctl_attribute_value SET name = ?2, sort_order = ?3, active = ?4, updated_at = ?5, updated_by = ?6 WHERE code = ?1 AND updated_at = ?7
     AND (?4 = 1 OR NOT EXISTS (SELECT 1 FROM ctl_attribute_assignment s WHERE s.value_code = ?1 AND s.valid_to_at IS NULL))`,
);
// Đóng dòng mở — chỉ khi nó vẫn là giá trị người dùng đã thấy (?5): khoá lạc quan theo GIÁ TRỊ, `changes = 0` = người khác vừa đổi (409 `stale`).
const ATTR_CLOSE_SERVICE = defineSql(
  "catalog",
  "attr_close_service",
  `UPDATE ctl_attribute_assignment SET valid_to_at = ?3, updated_at = ?3, updated_by = ?4 WHERE service_code = ?1 AND attribute_code = ?2 AND valid_to_at IS NULL AND value_code = ?5`,
);
const ATTR_CLOSE_GROUP = defineSql(
  "catalog",
  "attr_close_group",
  `UPDATE ctl_attribute_assignment SET valid_to_at = ?3, updated_at = ?3, updated_by = ?4 WHERE group_code = ?1 AND attribute_code = ?2 AND valid_to_at IS NULL AND value_code = ?5`,
);
// Mở dòng mới — chỉ khi không còn dòng mở. ?7 = 1 khi câu NGAY TRƯỚC trong lô là câu đóng (đổi x → y): chỉ mở khi câu đóng đã đổi dòng (`changes() > 0`), để không
// lặng lẽ ghi đè giá trị người khác vừa đặt (khuôn `transfer_rule_open`, 0127). ?7 = 0 khi đang chưa có giá trị riêng.
const ATTR_OPEN_SERVICE = defineSql(
  "catalog",
  "attr_open_service",
  `INSERT INTO ctl_attribute_assignment (id, service_code, group_code, attribute_code, value_code, valid_from_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, NULL, ?3, ?4, ?5, ?5, ?6, ?5, ?6 WHERE (?7 = 0 OR changes() > 0)
     AND NOT EXISTS (SELECT 1 FROM ctl_attribute_assignment WHERE service_code = ?2 AND attribute_code = ?3 AND valid_to_at IS NULL)`,
);
const ATTR_OPEN_GROUP = defineSql(
  "catalog",
  "attr_open_group",
  `INSERT INTO ctl_attribute_assignment (id, service_code, group_code, attribute_code, value_code, valid_from_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, NULL, ?2, ?3, ?4, ?5, ?5, ?6, ?5, ?6 WHERE (?7 = 0 OR changes() > 0)
     AND NOT EXISTS (SELECT 1 FROM ctl_attribute_assignment WHERE group_code = ?2 AND attribute_code = ?3 AND valid_to_at IS NULL)`,
);

// ---- Đọc ------------------------------------------------------------------------------------------------------------------------------------

/** Mọi đặc điểm (cả đã tắt), xếp `sort_order` rồi tên. */
export async function danhSachDacDiem(db: D1Database): Promise<DacDiemRow[]> {
  return (await db.prepare(ATTR_LIST).all<DacDiemRow>()).results;
}
/** Một đặc điểm theo mã; không có → `null` (tầng trên phân biệt 404 với 409 bằng điều này, không bằng chữ lỗi CSDL). */
export async function dacDiemTheoMa(db: D1Database, code: string): Promise<DacDiemRow | null> {
  return (await db.prepare(ATTR_GET).bind(code).first<DacDiemRow>()) ?? null;
}
/** Mọi giá trị (cả đã tắt) của mọi đặc điểm. */
export async function danhSachGiaTri(db: D1Database): Promise<GiaTriRow[]> {
  return (await db.prepare(ATTR_VALUE_LIST).all<GiaTriRow>()).results;
}
export async function giaTriTheoMa(db: D1Database, code: string): Promise<GiaTriRow | null> {
  return (await db.prepare(ATTR_VALUE_GET).bind(code).first<GiaTriRow>()) ?? null;
}
/** Giá trị hiệu lực của mọi (dịch vụ, đặc điểm) có giá trị — từ view `v_ctl_service_attribute`. */
export async function giaTriHieuLucTatCa(db: D1Database): Promise<HieuLucRow[]> {
  return (await db.prepare(ATTR_EFFECTIVE_ALL).all<HieuLucRow>()).results;
}
/** Giá trị gắn THEO NHÓM đang mở (mọi nhóm, kể cả nhóm đang tắt — lọc ở tầng trên). */
export async function giaTriTheoNhomDangMo(db: D1Database): Promise<GanNhomRow[]> {
  return (await db.prepare(ATTR_GROUP_OPEN_ALL).all<GanNhomRow>()).results;
}
/** Giá trị RIÊNG đang mở của một dịch vụ cho một đặc điểm; `null` = theo nhóm. */
export async function giaTriRiengDangMo(db: D1Database, serviceCode: string, attributeCode: string): Promise<string | null> {
  return (await db.prepare(ATTR_SERVICE_OPEN_ONE).bind(serviceCode, attributeCode).first<{ value_code: string }>())?.value_code ?? null;
}
/** Giá trị đang mở của một nhóm cho một đặc điểm; `null` = nhóm chưa có giá trị chung. */
export async function giaTriNhomDangMo(db: D1Database, groupCode: string, attributeCode: string): Promise<string | null> {
  return (await db.prepare(ATTR_GROUP_OPEN_ONE).bind(groupCode, attributeCode).first<{ value_code: string }>())?.value_code ?? null;
}
/** Số dòng gắn đang mở dùng một đặc điểm (luật tắt còn dùng → 409 `attribute_in_use`). */
export async function demGanMoCuaDacDiem(db: D1Database, attributeCode: string): Promise<number> {
  return Number((await db.prepare(ATTR_COUNT_OPEN_BY_ATTRIBUTE).bind(attributeCode).first<{ n: number }>())?.n ?? 0);
}
/** Số dòng gắn đang mở dùng một giá trị. */
export async function demGanMoCuaGiaTri(db: D1Database, valueCode: string): Promise<number> {
  return Number((await db.prepare(ATTR_COUNT_OPEN_BY_VALUE).bind(valueCode).first<{ n: number }>())?.n ?? 0);
}
/** `value_code → { dacDiem, giaTri }` (tên) của các mã giá trị được hỏi. Rỗng → không truy vấn. */
export async function tenCuaGiaTri(db: D1Database, valueCodes: readonly string[]): Promise<Map<string, { dacDiem: string; giaTri: string }>> {
  if (valueCodes.length === 0) return new Map();
  const rows = (await db.prepare(ATTR_NAMES_BY_VALUE).bind(JSON.stringify([...new Set(valueCodes)])).all<TenGiaTriRow>()).results;
  return new Map(rows.map((r) => [r.value_code, { dacDiem: r.attribute_name, giaTri: r.value_name }]));
}
/** Dịch vụ của danh mục (mọi mã, kể cả đã rời Sheet / bị ẩn — lọc ở luật thuần `chuaKhai`, `moiTheoNhom`). */
export async function dichVuChoDacDiem(db: D1Database): Promise<DichVuDacDiemRow[]> {
  return (await db.prepare(ATTR_SERVICES).all<DichVuDacDiemRow>()).results;
}

// ---- Ghi (chỉ dựng câu; nơi gọi ghép câu nhật ký rồi chạy MỘT `db.batch`) ------------------------------------------------------------------------

export interface ThemDacDiemInput {
  code: string;
  name: string;
  sortOrder: number;
  values: readonly { code: string; name: string; sortOrder: number }[];
  staffId: string;
  now: string;
}
/** Thêm một đặc điểm (đang bật) kèm các giá trị (đang bật) — câu theo thứ tự lô. Trùng tên đang dùng → chỉ mục duy nhất của CSDL chặn (→ 409). */
export function themDacDiemStatements(db: D1Database, i: ThemDacDiemInput): D1PreparedStatement[] {
  return [
    db.prepare(ATTR_INSERT).bind(i.code, i.name, i.sortOrder, i.now, i.staffId),
    ...i.values.map((v) => db.prepare(ATTR_VALUE_INSERT).bind(v.code, i.code, v.name, v.sortOrder, i.now, i.staffId)),
  ];
}
/** Thêm một giá trị (đang bật) cho đặc điểm có sẵn. */
export function themGiaTri(db: D1Database, i: { code: string; attributeCode: string; name: string; sortOrder: number; staffId: string; now: string }): D1PreparedStatement {
  return db.prepare(ATTR_VALUE_INSERT).bind(i.code, i.attributeCode, i.name, i.sortOrder, i.now, i.staffId);
}

export interface SuaDinhNghiaInput { code: string; name: string; sortOrder: number; active: boolean; staffId: string; now: string; updatedAtCu: string }
/** Sửa đặc điểm, khoá lạc quan theo `updated_at` cũ; `changes = 0` → người khác vừa sửa HOẶC (khi tắt) còn dòng gắn mở. Tầng trên đếm trước để trả câu có số. */
export function suaDacDiem(db: D1Database, i: SuaDinhNghiaInput): D1PreparedStatement {
  return db.prepare(ATTR_UPDATE).bind(i.code, i.name, i.sortOrder, i.active ? 1 : 0, i.now, i.staffId, i.updatedAtCu);
}
/** Sửa giá trị — như `suaDacDiem`. */
export function suaGiaTri(db: D1Database, i: SuaDinhNghiaInput): D1PreparedStatement {
  return db.prepare(ATTR_VALUE_UPDATE).bind(i.code, i.name, i.sortOrder, i.active ? 1 : 0, i.now, i.staffId, i.updatedAtCu);
}

/**
 * Đổi giá trị của MỘT đích (dịch vụ hoặc nhóm) cho một đặc điểm từ `cu` sang `moi` (khác nhau; `null` = chưa có dòng mở — «theo nhóm» với dịch vụ, «chưa có giá trị chung»
 * với nhóm). Trả câu theo thứ tự lô và chỉ số câu `chot` mà `changes > 0` nghĩa là đã đổi thật — nơi gọi đặt câu nhật ký (điều kiện `changes() > 0`) NGAY SAU câu cuối,
 * và báo 409 `stale` khi câu chốt không đổi dòng nào.
 * - null → x: [mở]  · x → null: [đóng]  · x → y: [đóng, mở] (câu mở chỉ chạy khi câu đóng đã đổi dòng).
 */
export function doiGiaTriStatements(
  db: D1Database,
  i: { dich: { loai: "SERVICE" | "GROUP"; code: string }; attributeCode: string; cu: string | null; moi: string | null; staffId: string; now: string },
): { statements: D1PreparedStatement[]; chot: number } {
  const dong = i.dich.loai === "SERVICE" ? ATTR_CLOSE_SERVICE : ATTR_CLOSE_GROUP;
  const mo = i.dich.loai === "SERVICE" ? ATTR_OPEN_SERVICE : ATTR_OPEN_GROUP;
  const statements: D1PreparedStatement[] = [];
  if (i.cu !== null) statements.push(db.prepare(dong).bind(i.dich.code, i.attributeCode, i.now, i.staffId, i.cu));
  if (i.moi !== null) statements.push(db.prepare(mo).bind(crypto.randomUUID(), i.dich.code, i.attributeCode, i.moi, i.now, i.staffId, i.cu !== null ? 1 : 0));
  return { statements, chot: statements.length - 1 };
}

/** Lỗi lô gắn do THUA KHOÁ khi đua (KĐL-2 NÊN SỬA 1): chỉ mục «một dòng mở» (UNIQUE) hoặc trigger 0128 của dòng gắn (giá trị / đặc điểm / nhóm vừa bị tắt, giá trị lệch,
 *  dòng vừa bị đóng). Ở tệp này vì là tệp duy nhất được nhắc tên bảng (hàng rào (f)). Lỗi khác (D1 hỏng, câu sai) KHÔNG phải thua khoá. */
export const laThuaKhoaGan = (e: unknown): boolean =>
  /UNIQUE constraint failed: ctl_attribute_assignment\.|\b(ctl_attribute_inactive|ctl_attribute_mismatch|ctl_append_only):/.test(e instanceof Error ? e.message : String(e));
