// TỆP SQL "NỬA NGHIÊM" của module catalog (ADR-0058 Đ6; hằng `NUA_NGHIEM` ở src/architecture.test.ts). `catalog` còn LEGACY (SQL cũ của repository.ts chưa
// đăng ký, hạn CATALOG_LEGACY_HAN), nhưng MỌI câu SQL MỚI — hai bảng `ctl_group`, `ctl_service_group` — nằm ở tệp này, đăng ký bằng `defineSql` (câu TĨNH,
// tham số ?N) và chịu bài EXPLAIN + bài `.prepare(<chuỗi thô>)`. Không `DELETE`, không `OR REPLACE`. KHÔNG viết câu `ctl_*` ở repository.ts.
// Import kèm đuôi .ts và KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node): câu nhật ký (`auditStatement`) do nơi gọi
// (index.ts) ghép vào lô — các hàm `*Statement`/`themNhom`/`suaNhom`/`ganNhomStatements` chỉ TRẢ câu chuẩn bị, không tự chạy.
// `catalog` chỉ được phụ thuộc `audit`: KHÔNG JOIN view của `staff` ở đây — lịch sử nhóm trả `created_by` (id), tên người do tầng trên ghép.
import { defineSql } from "../../shared/sql-registry.ts";

// ---- Kiểu dòng ------------------------------------------------------------------------------------------------------------------------------

export interface NhomRow {
  code: string;
  name: string;
  sort_order: number;
  active: number;
  created_at: string;
  updated_at: string;
}
export interface NhomKemDemRow extends NhomRow { service_count: number }
export interface GanHienHanhRow { service_code: string; group_code: string | null }
export interface GanMoiNhatRow { service_code: string; seq: number; group_code: string | null }
export interface LichSuNhomRow { seq: number; valid_from_at: string; created_by: string | null; group_code: string | null; group_name: string | null }

// ---- Câu SQL (đăng ký) ----------------------------------------------------------------------------------------------------------------------

/** Dòng gán MỚI NHẤT (seq lớn nhất) của mỗi dịch vụ = nhóm hiện hành. */
const LATEST = `s.seq = (SELECT MAX(m.seq) FROM ctl_service_group m WHERE m.service_code = s.service_code)`;

const GROUP_LIST_ALL = defineSql(
  "catalog",
  "group_list_all",
  `SELECT g.code, g.name, g.sort_order, g.active, g.created_at, g.updated_at,
     (SELECT COUNT(*) FROM ctl_service_group s WHERE s.group_code = g.code AND ${LATEST}) AS service_count
   FROM ctl_group g ORDER BY g.sort_order, g.name`,
);
const GROUP_CURRENT_BY_SERVICE = defineSql("catalog", "group_current_by_service", `SELECT s.service_code, s.group_code FROM ctl_service_group s WHERE ${LATEST}`);
const GROUP_GET = defineSql("catalog", "group_get", `SELECT code, name, sort_order, active, created_at, updated_at FROM ctl_group WHERE code = ?1`);
const GROUP_COUNT_SERVICES = defineSql("catalog", "group_count_services", `SELECT COUNT(*) AS n FROM ctl_service_group s WHERE s.group_code = ?1 AND ${LATEST}`);
const GROUP_INSERT = defineSql(
  "catalog",
  "group_insert",
  `INSERT INTO ctl_group (code, name, sort_order, active, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, 1, ?4, ?5, ?4, ?5)`,
);
// Khoá lạc quan: chỉ ghi khi `updated_at` còn đúng như lúc người dùng đọc (?7) — `changes = 0` là có người khác vừa sửa (hoặc mã không có).
const GROUP_UPDATE = defineSql(
  "catalog",
  "group_update",
  `UPDATE ctl_group SET name = ?2, sort_order = ?3, active = ?4, updated_at = ?5, updated_by = ?6 WHERE code = ?1 AND updated_at = ?7`,
);
const SERVICE_GROUP_LATEST = defineSql(
  "catalog",
  "service_group_latest",
  `SELECT s.service_code, s.seq, s.group_code FROM ctl_service_group s WHERE s.service_code IN (SELECT value FROM json_each(?1)) AND ${LATEST}`,
);
const SERVICE_GROUP_INSERT = defineSql(
  "catalog",
  "service_group_insert",
  `INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6, ?5, ?6)`,
);
const SERVICE_GROUP_HISTORY = defineSql(
  "catalog",
  "service_group_history",
  `SELECT s.seq, s.valid_from_at, s.created_by, s.group_code, g.name AS group_name
   FROM ctl_service_group s LEFT JOIN ctl_group g ON g.code = s.group_code
   WHERE s.service_code = ?1 ORDER BY s.seq DESC`,
);

// ---- Đọc ------------------------------------------------------------------------------------------------------------------------------------

/** Mọi nhóm (cả nhóm đã tắt) kèm số dịch vụ hiện hành, xếp `sort_order` rồi tên. */
export async function danhSachNhom(db: D1Database): Promise<NhomKemDemRow[]> {
  return (await db.prepare(GROUP_LIST_ALL).all<NhomKemDemRow>()).results;
}

/** Một nhóm theo mã; KHÔNG có → `null` (tầng trên dựa vào đây để phân biệt 404 với 409, không dựa vào chữ lỗi CSDL). */
export async function nhomTheoMa(db: D1Database, code: string): Promise<NhomRow | null> {
  return (await db.prepare(GROUP_GET).bind(code).first<NhomRow>()) ?? null;
}

/** Số dịch vụ hiện hành của một nhóm (luật tắt nhóm còn dịch vụ → 409). */
export async function demDichVuCuaNhom(db: D1Database, code: string): Promise<number> {
  return Number((await db.prepare(GROUP_COUNT_SERVICES).bind(code).first<{ n: number }>())?.n ?? 0);
}

/** `service_code → group_code` hiện hành; dịch vụ chưa từng gán không có khoá, `null` = đã đưa về Chưa phân loại. Nhóm đang tắt VẪN được trả (lọc ở `nhomChoForm`). */
export async function nhomHienHanhTheoMa(db: D1Database): Promise<Map<string, string | null>> {
  const rows = (await db.prepare(GROUP_CURRENT_BY_SERVICE).all<GanHienHanhRow>()).results;
  return new Map(rows.map((r) => [r.service_code, r.group_code]));
}

/** Lịch sử nhóm của MỘT dịch vụ, mới nhất trước: lúc, id người sửa (`null` = hệ thống gieo), nhóm + tên nhóm (`null` = Chưa phân loại). */
export async function lichSuNhom(db: D1Database, serviceCode: string): Promise<LichSuNhomRow[]> {
  return (await db.prepare(SERVICE_GROUP_HISTORY).bind(serviceCode).all<LichSuNhomRow>()).results;
}

// ---- Ghi (chỉ dựng câu; nơi gọi ghép câu nhật ký rồi chạy MỘT `db.batch`) ------------------------------------------------------------------------

/** Mã nhóm mới do máy chủ sinh (không bao giờ đổi, không hiện cho người dùng). */
export const maNhomMoi = (): string => `g${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

export interface ThemNhomInput { code: string; name: string; sortOrder: number; staffId: string; now: string }
/** Thêm nhóm (đang bật). Trùng tên với nhóm đang dùng → chỉ mục duy nhất của CSDL chặn (→ 409). */
export function themNhom(db: D1Database, i: ThemNhomInput): D1PreparedStatement {
  return db.prepare(GROUP_INSERT).bind(i.code, i.name, i.sortOrder, i.now, i.staffId);
}

export interface SuaNhomInput { code: string; name: string; sortOrder: number; active: boolean; staffId: string; now: string; updatedAtCu: string }
/** Sửa nhóm có khoá lạc quan theo `updated_at` cũ; `changes = 0` → người khác vừa sửa. Tắt nhóm còn dịch vụ do tầng trên chặn trước (`demDichVuCuaNhom`). */
export function suaNhom(db: D1Database, i: SuaNhomInput): D1PreparedStatement {
  return db.prepare(GROUP_UPDATE).bind(i.code, i.name, i.sortOrder, i.active ? 1 : 0, i.now, i.staffId, i.updatedAtCu);
}

export interface DoiNhom { serviceCode: string; tuNhom: string | null; denNhom: string | null }

/**
 * Lô gán nhóm: đọc dòng mới nhất của các mã rồi dựng mỗi mã một câu `INSERT` với `seq + 1` (chưa từng gán → 1). Mã đã ở đúng nhóm đích bị BỎ QUA
 * (không câu, không nhật ký; `boQua`). Hai lệnh đua cùng một dịch vụ → `UNIQUE (service_code, seq)` chặn lệnh sau (→ 409). Mã không có trong `catalog_item`
 * hoặc nhóm đích đang tắt / không có: nơi gọi kiểm TRƯỚC (`nhomTheoMa`, danh mục) — CSDL chặn bằng khoá ngoại / trigger nhưng chữ lỗi của nó không dùng để phân loại.
 * `doi` liệt kê từng dịch vụ đổi (cũ → mới bằng MÃ nhóm) để nơi gọi viết dòng nhật ký, mỗi dịch vụ một dòng, cùng lô.
 */
export async function ganNhomStatements(
  db: D1Database,
  i: { codes: readonly string[]; groupCode: string | null; staffId: string; now: string },
): Promise<{ statements: D1PreparedStatement[]; doi: DoiNhom[]; boQua: string[] }> {
  const latest = (await db.prepare(SERVICE_GROUP_LATEST).bind(JSON.stringify(i.codes)).all<GanMoiNhatRow>()).results;
  const theoMa = new Map(latest.map((r) => [r.service_code, r]));
  const statements: D1PreparedStatement[] = [];
  const doi: DoiNhom[] = [];
  const boQua: string[] = [];
  for (const code of i.codes) {
    const cu = theoMa.get(code);
    const tuNhom = cu?.group_code ?? null;
    if (tuNhom === i.groupCode) {
      boQua.push(code);
      continue;
    }
    statements.push(db.prepare(SERVICE_GROUP_INSERT).bind(crypto.randomUUID(), code, i.groupCode, (cu?.seq ?? 0) + 1, i.now, i.staffId));
    doi.push({ serviceCode: code, tuNhom, denNhom: i.groupCode });
  }
  return { statements, doi, boQua };
}
