// TỆP SQL "NỬA NGHIÊM" của giá gốc phí đưa đón đọc từ Sheet (ADR-0218 Đ1.3; hằng `NUA_NGHIEM` ở src/architecture.test.ts). Mọi câu trên
// `ctl_service_transfer_price` nằm ở đây, qua `defineSql`. Import kèm đuôi .ts và KHÔNG import module khác lúc chạy.
import { defineSql } from "../../shared/sql-registry.ts";

export type GiaGocPhiDon = { moiKhach: number | null; xeRieng: number | null };

const GIA_GOC_HIEN_TAI = defineSql("catalog", "transfer_price_current", `SELECT catalog_code, per_pax_price, private_price FROM v_ctl_service_transfer_price`);
/** Giá gốc hiện hành của mọi dịch vụ đã có dòng. Dịch vụ không có dòng = chưa có giá (không phải 0). */
export async function giaGocPhiDonHienTai(db: D1Database): Promise<Map<string, GiaGocPhiDon>> {
  const { results } = await db.prepare(GIA_GOC_HIEN_TAI).all<{ catalog_code: string; per_pax_price: number | null; private_price: number | null }>();
  return new Map(results.map((r) => [r.catalog_code, { moiKhach: r.per_pax_price, xeRieng: r.private_price }]));
}

const GIA_GOC_THEO_MA = defineSql(
  "catalog",
  "transfer_price_by_codes",
  `SELECT catalog_code, per_pax_price, private_price FROM v_ctl_service_transfer_price WHERE catalog_code IN (SELECT value FROM json_each(?1))`,
);
/** Giá gốc hiện hành của các mã cho trước (mã không có dòng thì vắng khỏi bản đồ). */
export async function giaGocPhiDonTheoMa(db: D1Database, codes: readonly string[]): Promise<Map<string, GiaGocPhiDon>> {
  if (!codes.length) return new Map();
  const { results } = await db.prepare(GIA_GOC_THEO_MA).bind(JSON.stringify(codes)).all<{ catalog_code: string; per_pax_price: number | null; private_price: number | null }>();
  return new Map(results.map((r) => [r.catalog_code, { moiKhach: r.per_pax_price, xeRieng: r.private_price }]));
}

const GIA_GOC_THEM = defineSql(
  "catalog",
  "transfer_price_insert",
  `INSERT INTO ctl_service_transfer_price (id, catalog_code, per_pax_price, private_price, valid_from_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?5)`,
);
/** Câu thêm một dòng giá gốc (chưa chạy) — nơi gọi gộp vào lô. `id` do hàm sinh để mỗi lần đồng bộ ghi dòng riêng. */
export const cauGhiGiaGocPhiDon = (db: D1Database, v: { catalogCode: string; moiKhach: number | null; xeRieng: number | null; at: string }): D1PreparedStatement =>
  db.prepare(GIA_GOC_THEM).bind(crypto.randomUUID(), v.catalogCode, v.moiKhach, v.xeRieng, v.at);

const DICH_VU_CHUA_CO_GIA = defineSql(
  "catalog",
  "transfer_price_missing",
  `SELECT i.code AS code, i.name AS name
   FROM catalog_item i
   JOIN v_ctl_service_transfer t ON t.catalog_code = i.code AND t.transfer_enabled = 1
   LEFT JOIN v_ctl_service_transfer_price p ON p.catalog_code = i.code
   WHERE i.in_sheet = 1 AND p.per_pax_price IS NULL
   ORDER BY i.code`,
);
/** Dịch vụ còn trên Sheet, đang bật đưa đón, mà chưa có giá gốc đi chung (ô trống hoặc chưa có cột). Ô 0 thì không nằm đây. */
export async function dichVuDuaDonChuaCoGiaGoc(db: D1Database): Promise<{ code: string; name: string }[]> {
  const { results } = await db.prepare(DICH_VU_CHUA_CO_GIA).all<{ code: string; name: string }>();
  return results;
}
