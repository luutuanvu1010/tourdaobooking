// TỆP SQL "NỬA NGHIÊM" của module catalog (ADR-0058 Đ6; hằng `NUA_NGHIEM` ở src/architecture.test.ts). `catalog` còn LEGACY (SQL cũ của repository.ts chưa
// đăng ký, hạn CATALOG_LEGACY_HAN), nhưng MỌI câu SQL MỚI — hai bảng `ctl_group`, `ctl_service_group` — nằm ở tệp này, đăng ký bằng `defineSql` (câu TĨNH,
// tham số ?N) và chịu bài EXPLAIN + bài `.prepare(<chuỗi thô>)`. Không `DELETE`, không `OR REPLACE`. KHÔNG viết câu `ctl_*` ở repository.ts.
// Import kèm đuôi .ts và KHÔNG import module khác lúc chạy (bài kiểm kiến trúc nạp tệp này thẳng bằng Node): câu nhật ký (`auditStatement`) do nơi gọi
// (index.ts) ghép vào lô — các hàm `*Statement`/`themNhom`/`suaNhom`/`ganNhomStatements` chỉ TRẢ câu chuẩn bị, không tự chạy.
// `catalog` chỉ được phụ thuộc `audit`: KHÔNG JOIN view của `staff` ở đây — lịch sử nhóm trả `created_by` (id), tên người do tầng trên ghép.
import { defineSql } from "../../shared/sql-registry.ts";
import type { QuyTacDuaDon } from "../../shared/dua-don-dich-vu.ts";

// ---- Kiểu dòng ------------------------------------------------------------------------------------------------------------------------------

export interface NhomRow {
  code: string;
  name: string;
  sort_order: number;
  active: number;
  /** ADR-0118 Đ1 (0121): 1 = nhóm có đưa đón (mặc định), 0 = máy chủ từ chối ghi / xác nhận chặng đưa đón cho dịch vụ của nhóm. */
  transfer_enabled: number;
  created_at: string;
  updated_at: string;
}
export interface NhomKemDemRow extends NhomRow { service_count: number }
export interface GanHienHanhRow { service_code: string; group_code: string | null }
export interface GanMoiNhatRow { service_code: string; seq: number; group_code: string | null }
export interface TenNhomRow { service_code: string; group_name: string }
export interface LichSuNhomRow { seq: number; valid_from_at: string; created_by: string | null; group_code: string | null; group_name: string | null }

// ---- Câu SQL (đăng ký) ----------------------------------------------------------------------------------------------------------------------

/** Dòng gán MỚI NHẤT (seq lớn nhất) của mỗi dịch vụ = nhóm hiện hành. */
const LATEST = `s.seq = (SELECT MAX(m.seq) FROM ctl_service_group m WHERE m.service_code = s.service_code)`;

const GROUP_LIST_ALL = defineSql(
  "catalog",
  "group_list_all",
  `SELECT g.code, g.name, g.sort_order, g.active, g.transfer_enabled, g.created_at, g.updated_at,
     (SELECT COUNT(*) FROM ctl_service_group s WHERE s.group_code = g.code AND ${LATEST}) AS service_count
   FROM ctl_group g ORDER BY g.sort_order, g.name`,
);
const GROUP_CURRENT_BY_SERVICE = defineSql("catalog", "group_current_by_service", `SELECT s.service_code, s.group_code FROM ctl_service_group s WHERE ${LATEST}`);
const GROUP_GET = defineSql("catalog", "group_get", `SELECT code, name, sort_order, active, transfer_enabled, created_at, updated_at FROM ctl_group WHERE code = ?1`);
const GROUP_COUNT_SERVICES = defineSql("catalog", "group_count_services", `SELECT COUNT(*) AS n FROM ctl_service_group s WHERE s.group_code = ?1 AND ${LATEST}`);
const GROUP_INSERT = defineSql(
  "catalog",
  "group_insert",
  `INSERT INTO ctl_group (code, name, sort_order, active, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, 1, ?4, ?5, ?4, ?5)`,
);
// Khoá lạc quan: chỉ ghi khi `updated_at` còn đúng như lúc người dùng đọc (?7) — `changes = 0` là có người khác vừa sửa (hoặc mã không có).
// Bất biến ADR-0058 "tắt nhóm còn dịch vụ → 409" giữ NGAY TRONG câu (vòng sửa A3, F1): khi tắt (?4 = 0) mà nhóm còn dịch vụ HIỆN HÀNH thì không ghi
// (`changes = 0`) — chặn đua "tầng trên đếm 0 xong, một lô gán chen vào trước khi tắt". Bật / sửa tên (?4 = 1) không bị điều kiện cản.
// ADR-0118 Đ1: ?8 = cờ «Có đưa đón» (0/1; NULL = GIỮ cờ đang có — nơi gọi quên truyền thì không lặng lẽ tắt đưa đón) — tham số THÊM, không động tới ?1–?7 nên điều kiện đua ở ?4 giữ nguyên.
const GROUP_UPDATE = defineSql(
  "catalog",
  "group_update",
  `UPDATE ctl_group SET name = ?2, sort_order = ?3, active = ?4, transfer_enabled = COALESCE(?8, transfer_enabled), updated_at = ?5, updated_by = ?6 WHERE code = ?1 AND updated_at = ?7
     AND (?4 = 1 OR NOT EXISTS (SELECT 1 FROM ctl_service_group s WHERE s.group_code = ?1 AND ${LATEST}))`,
);
const SERVICE_GROUP_LATEST = defineSql(
  "catalog",
  "service_group_latest",
  `SELECT s.service_code, s.seq, s.group_code FROM ctl_service_group s WHERE s.service_code IN (SELECT value FROM json_each(?1)) AND ${LATEST}`,
);
// Tên nhóm HIỆN HÀNH của các mã dịch vụ (chỉ để viết câu báo lỗi cho `orders` qua hàm công bố ở index.ts — ADR-0118 Ruling R-C). Chưa phân loại / chưa gán: không có dòng.
const SERVICE_GROUP_NAMES = defineSql(
  "catalog",
  "service_group_names",
  `SELECT s.service_code, g.name AS group_name FROM ctl_service_group s JOIN ctl_group g ON g.code = s.group_code
   WHERE s.service_code IN (SELECT value FROM json_each(?1)) AND ${LATEST}`,
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

// ---- Ô «Được đón không» của dịch vụ (ADR-0149 Đ1, bảng `ctl_service_transfer_rule`, migration 0127). Dòng MỞ (`valid_to_at IS NULL`) = hiệu lực; không dòng mở = Theo nhóm.
const TRANSFER_RULE_OPEN_ALL = defineSql("catalog", "transfer_rule_open_all", `SELECT service_code, mode FROM ctl_service_transfer_rule WHERE valid_to_at IS NULL`);
const TRANSFER_RULE_OPEN_ONE = defineSql("catalog", "transfer_rule_open_one", `SELECT mode FROM ctl_service_transfer_rule WHERE service_code = ?1 AND valid_to_at IS NULL`);
const TRANSFER_RULE_NEVER_IN = defineSql(
  "catalog",
  "transfer_rule_never_in",
  `SELECT service_code FROM ctl_service_transfer_rule WHERE valid_to_at IS NULL AND mode = 'NEVER' AND service_code IN (SELECT value FROM json_each(?1))`,
);
// Đóng dòng mở — chỉ khi nó vẫn là lựa chọn người dùng đã thấy (?4): khoá lạc quan theo GIÁ TRỊ, `changes = 0` = người khác vừa đổi.
const TRANSFER_RULE_CLOSE = defineSql(
  "catalog",
  "transfer_rule_close",
  `UPDATE ctl_service_transfer_rule SET valid_to_at = ?2, updated_at = ?2, updated_by = ?3 WHERE service_code = ?1 AND valid_to_at IS NULL AND mode = ?4`,
);
// Mở dòng mới — chỉ khi không còn dòng mở (đóng ở câu trước cùng lô, hoặc đang Theo nhóm). Hai lệnh đua: chỉ mục duy nhất một phần chặn lệnh sau.
// ?6 = 1 khi câu NGAY TRƯỚC trong lô là câu đóng (X → Y): chỉ mở khi câu đóng đã đổi dòng (`changes() > 0`) — nếu không, người khác vừa đưa về Theo nhóm và lệnh này
// không được lặng lẽ ghi đè lựa chọn chưa thấy (người kiểm độc lập 29/10, LOW-2). ?6 = 0 khi đang Theo nhóm (không có câu đóng).
const TRANSFER_RULE_OPEN = defineSql(
  "catalog",
  "transfer_rule_open",
  `INSERT INTO ctl_service_transfer_rule (id, service_code, mode, valid_from_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?4, ?5, ?4, ?5 WHERE (?6 = 0 OR changes() > 0) AND NOT EXISTS (SELECT 1 FROM ctl_service_transfer_rule WHERE service_code = ?2 AND valid_to_at IS NULL)`,
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

/** Tên nhóm hiện hành của các mã dịch vụ (mã Chưa phân loại / chưa gán không có khoá). Rỗng → không truy vấn. */
export async function tenNhomCuaCacMa(db: D1Database, codes: readonly string[]): Promise<Map<string, string>> {
  if (codes.length === 0) return new Map();
  const rows = (await db.prepare(SERVICE_GROUP_NAMES).bind(JSON.stringify([...new Set(codes)])).all<TenNhomRow>()).results;
  return new Map(rows.map((r) => [r.service_code, r.group_name]));
}

/** Lịch sử nhóm của MỘT dịch vụ, mới nhất trước: lúc, id người sửa (`null` = hệ thống gieo), nhóm + tên nhóm (`null` = Chưa phân loại). */
export async function lichSuNhom(db: D1Database, serviceCode: string): Promise<LichSuNhomRow[]> {
  return (await db.prepare(SERVICE_GROUP_HISTORY).bind(serviceCode).all<LichSuNhomRow>()).results;
}

/** `service_code → ALWAYS | NEVER` của mọi dịch vụ có dòng mở; mã vắng = Theo nhóm. */
export async function quyTacDuaDonTheoMa(db: D1Database): Promise<Map<string, QuyTacDuaDon>> {
  const rows = (await db.prepare(TRANSFER_RULE_OPEN_ALL).all<{ service_code: string; mode: QuyTacDuaDon }>()).results;
  return new Map(rows.map((r) => [r.service_code, r.mode]));
}

/** Ô «Được đón không» hiện hành của MỘT dịch vụ. */
export async function quyTacDuaDonCua(db: D1Database, serviceCode: string): Promise<QuyTacDuaDon> {
  return (await db.prepare(TRANSFER_RULE_OPEN_ONE).bind(serviceCode).first<{ mode: QuyTacDuaDon }>())?.mode ?? "GROUP";
}

/** Mã nào trong danh sách đang đặt «Không đón» (để `orders` viết câu báo đúng lý do — Ruling R-0149-B). Rỗng → không truy vấn. */
export async function maDangKhongDon(db: D1Database, codes: readonly string[]): Promise<Set<string>> {
  if (codes.length === 0) return new Set();
  const rows = (await db.prepare(TRANSFER_RULE_NEVER_IN).bind(JSON.stringify([...new Set(codes)])).all<{ service_code: string }>()).results;
  return new Set(rows.map((r) => r.service_code));
}

// ---- Ghi (chỉ dựng câu; nơi gọi ghép câu nhật ký rồi chạy MỘT `db.batch`) ------------------------------------------------------------------------

/**
 * Đổi ô «Được đón không» từ `cu` sang `moi` (khác nhau). Trả câu theo thứ tự lô và chỉ số câu `chot` mà `changes > 0` nghĩa là đã đổi thật — nơi gọi đặt câu nhật ký
 * (điều kiện `changes() > 0`) NGAY SAU câu cuối, và báo 409 khi câu chốt không đổi dòng nào (người khác vừa đổi).
 * - Theo nhóm → X: [mở]  · X → Theo nhóm: [đóng]  · X → Y: [đóng, mở] (câu mở chỉ chạy khi câu đóng đã đổi dòng — đóng hụt thì mở cũng hụt, kể cả khi người khác vừa đưa về Theo nhóm).
 */
export function doiQuyTacDuaDonStatements(
  db: D1Database,
  i: { serviceCode: string; cu: QuyTacDuaDon; moi: QuyTacDuaDon; staffId: string; now: string },
): { statements: D1PreparedStatement[]; chot: number } {
  const statements: D1PreparedStatement[] = [];
  if (i.cu !== "GROUP") statements.push(db.prepare(TRANSFER_RULE_CLOSE).bind(i.serviceCode, i.now, i.staffId, i.cu));
  if (i.moi !== "GROUP") statements.push(db.prepare(TRANSFER_RULE_OPEN).bind(crypto.randomUUID(), i.serviceCode, i.moi, i.now, i.staffId, i.cu !== "GROUP" ? 1 : 0));
  return { statements, chot: statements.length - 1 };
}

/** Mã nhóm mới do máy chủ sinh (không bao giờ đổi, không hiện cho người dùng). */
export const maNhomMoi = (): string => `g${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

export interface ThemNhomInput { code: string; name: string; sortOrder: number; staffId: string; now: string }
/** Thêm nhóm (đang bật). Trùng tên với nhóm đang dùng → chỉ mục duy nhất của CSDL chặn (→ 409). */
export function themNhom(db: D1Database, i: ThemNhomInput): D1PreparedStatement {
  return db.prepare(GROUP_INSERT).bind(i.code, i.name, i.sortOrder, i.now, i.staffId);
}

export interface SuaNhomInput { code: string; name: string; sortOrder: number; active: boolean; /** Vắng = giữ cờ đưa đón đang có. */ transferEnabled?: boolean; staffId: string; now: string; updatedAtCu: string }
/**
 * Sửa nhóm có khoá lạc quan theo `updated_at` cũ; `changes = 0` → người khác vừa sửa, HOẶC (khi tắt) nhóm còn dịch vụ hiện hành. Tầng trên đếm trước
 * (`demDichVuCuaNhom`) để trả câu có số; điều kiện trong câu là lưới chặn đua.
 */
export function suaNhom(db: D1Database, i: SuaNhomInput): D1PreparedStatement {
  return db.prepare(GROUP_UPDATE).bind(i.code, i.name, i.sortOrder, i.active ? 1 : 0, i.now, i.staffId, i.updatedAtCu, i.transferEnabled === undefined ? null : i.transferEnabled ? 1 : 0);
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
