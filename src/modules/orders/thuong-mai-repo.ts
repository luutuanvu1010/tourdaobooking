// SQL bản chụp thương mại (ord_service_terms — đặc tả §5). Tệp NỬA NGHIÊM của orders (src/architecture.test.ts NUA_NGHIEM): defineSql + EXPLAIN.
// Câu chụp trong lô gác bằng CHUỖI changes() > 0 (CHANGE-GUIDE f) — không đọc audit_log. Riêng «Chụp bù» (đợt 2): câu cổng đầu lô so `updated_at` (khoá lạc quan của đơn).
import { defineSql } from "../../shared/sql-registry.ts";
import type { HoiDaChup } from "../../shared/router.ts";
import type { DongGhiChup, TermRowDb } from "./thuong-mai.ts";

const COT = `id, order_id, order_service_id, beneficiary_party_id, commission_status, missing_reason, commission_kind, commission_rate_bp, commission_per_pax, commission_rule_id,
  supply_status, seller_party_id, supplier_party_id, cost_rate_bp, supply_term_id, source, reason, supersedes_id, captured_date, created_at, created_by, updated_at, updated_by`;
const CHUP_CHUOI = defineSql("orders", "terms_insert_chain",
  `INSERT INTO ord_service_terms (${COT}) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?20, ?21 WHERE changes() > 0`);
// ADR-0133: ba số tiền theo loại, ngay SAU câu chụp của dòng đó trong cùng chuỗi `changes() > 0` (câu chụp thua ⇒ 0 dòng ⇒ câu này cũng không ghi, và câu chụp kế tiếp cũng vậy).
const CHUP_PAX = defineSql("orders", "terms_pax_insert_chain",
  `INSERT INTO ord_service_terms_pax (terms_id, adult_amount, child_amount, senior_amount, created_at, created_by, updated_at, updated_by) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?5, ?6 WHERE changes() > 0`);
const GHI_TAY = defineSql("orders", "terms_insert_manual",
  `INSERT INTO ord_service_terms (${COT}) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?20, ?21
   WHERE EXISTS (SELECT 1 FROM orders o WHERE o.id = ?2 AND o.status = 'confirmed' AND o.delivered_at IS NULL)`);
// Chạy đua ghi tay ↔ «Đã giao» (chủ duyệt 19/10, I-2 người kiểm Task 3+4): lô ghi tay đổi `orders.updated_at` NGAY SAU câu chèn bản MANUAL (chỉ khi câu đó đã chèn — `changes() > 0`),
// để lô «Đã giao» đang chạy dở (đọc bản chụp rồi `db.batch` với khoá lạc quan `updated_at`) thua và trả 409, không ghi sổ theo mức cũ.
// Mốc mới LUÔN LỚN HƠN mốc cũ (cùng ý `nextStamp` của repository.ts, tính NGAY TRONG câu — người kiểm Task 6 I-1): đồng hồ máy chủ lùi / cùng mili-giây với lần ghi
// trước thì lấy mốc cũ + 1 ms, để khoá lạc quan `updated_at = ?` của lô khác luôn phân biệt «đã có người ghi».
const MOC_TANG = "CASE WHEN ?1 > updated_at THEN ?1 ELSE strftime('%Y-%m-%dT%H:%M:%fZ', updated_at, '+0.001 seconds') END";
const DOI_MOC_SAU_GHI_TAY = defineSql("orders", "terms_manual_touch_order",
  `UPDATE orders SET updated_at = ${MOC_TANG} WHERE id = ?2 AND status = 'confirmed' AND delivered_at IS NULL AND changes() > 0`);
// «Chụp bù» (sổ đại lý đợt 2, Task 6 — ADR-0079 điều 7 b2, C4 = A): CỔNG đầu lô. Đơn còn y như lúc route đọc (khoá lạc quan `updated_at`), đã xác nhận, chưa «Đã giao», CHƯA có bản
// chụp nào ⇒ đổi `updated_at` (cùng lý do với ghi tay) và mở chuỗi `changes() > 0` cho các câu chụp sau. Người khác vừa chụp / sửa đơn ⇒ 0 dòng, cả lô không áp.
const KHOA_CHUP_BU = defineSql("orders", "terms_backfill_gate",
  `UPDATE orders SET updated_at = ${MOC_TANG} WHERE id = ?2 AND status = 'confirmed' AND delivered_at IS NULL AND updated_at = ?3
     AND NOT EXISTS (SELECT 1 FROM ord_service_terms t WHERE t.order_id = ?2)`);
// Danh sách chờ chụp bù: đơn đã xác nhận, chưa «Đã giao», CHƯA có bản chụp nào. Hai cờ để route chọn lý do: có dòng nhập tay; bên đặt «đặc biệt» — ĐÚNG phần bù của điều kiện bên
// đặt (b1) ở migration chụp bù tự động và câu đếm chỉ-đọc (vai đang mở được hưởng / nhóm bên ngoài / loại đối tác; không phải công ty chủ). Chỉ khoá + nhãn, không tên / SĐT khách.
const CHO_CHUP_BU = defineSql("orders", "terms_backfill_pending",
  `SELECT o.id, o.order_code, o.confirmed_at, o.created_at, b.display_name AS ben_dat,
     EXISTS (SELECT 1 FROM order_service m WHERE m.order_id = o.id AND m.catalog_code IS NULL) AS co_nhap_tay,
     (o.booker_party_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM v_pty_owner_company c WHERE c.party_id = o.booker_party_id)
       AND EXISTS (SELECT 1 FROM v_pty_open_role vr JOIN v_pty_role_type rt ON rt.code = vr.role_type_code WHERE vr.party_id = o.booker_party_id
         AND (vr.role_type_code IN (SELECT role_type_code FROM v_prc_beneficiary_role) OR vr.role_group = 'EXTERNAL' OR rt.is_partner_label = 1))) AS ben_dat_doi_tac
   FROM orders o LEFT JOIN v_pty_party_label b ON b.id = o.booker_party_id
   WHERE o.status = 'confirmed' AND o.delivered_at IS NULL AND NOT EXISTS (SELECT 1 FROM ord_service_terms t WHERE t.order_id = o.id)
   ORDER BY COALESCE(o.confirmed_at, o.created_at), o.order_code`);
const HIEN_HANH = defineSql("orders", "terms_current",
  `SELECT t.id, t.order_service_id, t.beneficiary_party_id, t.commission_status, t.missing_reason, t.commission_kind, t.commission_rate_bp, t.commission_per_pax, t.commission_rule_id,
     t.supply_status, t.seller_party_id, t.supplier_party_id, t.cost_rate_bp, t.supply_term_id, t.source, t.captured_date,
     x.adult_amount AS pax_adult, x.child_amount AS pax_child, x.senior_amount AS pax_senior
   FROM ord_service_terms t LEFT JOIN ord_service_terms_pax x ON x.terms_id = t.id WHERE t.order_id = ?1 AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id)`);
const DEM = defineSql("orders", "terms_count", "SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?1");
// Tên hồ sơ (người hưởng, người bán) cho DTO văn phòng: view công bố của parties, chỉ khoá + nhãn. Hồ sơ không còn trong view ⇒ DTO ghi "Hồ sơ không còn".
const NHAN_HO_SO = defineSql("orders", "party_labels", "SELECT id, display_name FROM v_pty_party_label WHERE id IN (SELECT value FROM json_each(?1))");
// Hồ sơ có đang mang vai Nhà cung cấp không (người bán ghi tay phải là Tour Đảo hoặc nhà cung cấp — cùng luật trigger prc_seller_not_supplier của bảng điều khoản).
const LA_NHA_CUNG_CAP = defineSql("orders", "is_supplier", "SELECT 1 AS ok FROM v_pty_open_role WHERE party_id = ?1 AND role_type_code = 'SUPPLIER' LIMIT 1");
// Nhóm hiện hành của một mã dịch vụ — CÙNG view công bố `v_ctl_service_group` mà trigger `prc_supply_term_x3` đọc, để luật X3 ở đường ghi tay và ở bảng điều khoản nhận nhóm theo một nguồn.
const NHOM_CUA_MA = defineSql("orders", "service_group_of", "SELECT group_code FROM v_ctl_service_group WHERE catalog_code = ?1");

// «Đã chụp chưa» (ADR-0148 Đ1, kế hoạch Q1): ngày chụp GẦN NHẤT. Đếm MỌI bản chụp trỏ dòng — cả bản đã bị thay và bản MANUAL (ghi tay chỉ đổi người bán chép mã dòng của bản
// trước, `apGhiTay`): thừa chứ không thiếu — coi «đã chụp» khi thật ra chưa chỉ mất đường huỷ hẳn, không mất dữ liệu. Gắn ↔ chính sách: bản chụp không ghi gắn nào đã dùng ⇒ hỏi
// qua dòng mức của chính sách (view công bố `v_prc_commission_rule`, chỉ khoá + mã), ngày chụp trong khoảng của gắn, (gắn đối tác) người hưởng = hồ sơ.
const CHUP_GAN_NHAT_MUC = defineSql("orders", "terms_last_capture_rule", "SELECT MAX(captured_date) AS d FROM ord_service_terms WHERE commission_rule_id = ?1");
const CHUP_GAN_NHAT_GAN = defineSql("orders", "terms_last_capture_tier",
  `SELECT MAX(t.captured_date) AS d FROM ord_service_terms t JOIN v_prc_commission_rule r ON r.id = t.commission_rule_id
   WHERE r.target_tier_code = ?1 AND t.captured_date >= ?2 AND t.captured_date <= COALESCE(?3, '9999-12-31') AND (?4 IS NULL OR t.beneficiary_party_id = ?4)`);

const bindDong =(st: D1PreparedStatement, d: DongGhiChup) => st.bind(d.id, d.orderId, d.serviceId, d.beneficiaryPartyId, d.commissionStatus, d.missingReason, d.commissionKind, d.rateBp, d.perPax,
  d.ruleId, d.supplyStatus, d.sellerPartyId, d.supplierPartyId, d.costRateBp, d.termId, d.source, d.reason, d.supersedesId, d.capturedDate, d.at, d.by);
/** Mỗi dòng một câu `INSERT … SELECT … WHERE changes() > 0`: đặt SAU câu nhật ký `confirmed` (chính nó `changes() > 0`) thì chuỗi nối từ câu `UPDATE orders` — lệnh thua không ghi gì. */
export const cauChupChuoi = (db: D1Database, rows: readonly DongGhiChup[]): D1PreparedStatement[] => rows.flatMap((d) => [
  bindDong(db.prepare(CHUP_CHUOI), d),
  ...(d.theoLoai ? [db.prepare(CHUP_PAX).bind(d.id, d.theoLoai.adult, d.theoLoai.child, d.theoLoai.senior, d.at, d.by)] : []),
]);
/** Ghi tay (đơn đã xác nhận, chưa giao): lính gác ngay trong câu, không phụ thuộc câu trước. */
export const cauGhiTay = (db: D1Database, d: DongGhiChup): D1PreparedStatement => bindDong(db.prepare(GHI_TAY), d);
/**
 * Ghi tay kèm ba số theo loại (ADR-0133): ghi tay chỉ đổi người bán thì bản mới GIỮ ba số của bản trước (`apGhiTay` chép `hoaHong`), nên phải có dòng phụ đi cùng — nếu không hoa hồng
 * lặng lẽ quay về cách tính cũ (lỗi người kiểm 19/10). Câu phụ `WHERE changes() > 0` đứng ngay sau câu ghi tay: lô thua thì không ghi gì. Phần tử đầu LUÔN là câu ghi tay (nơi gọi đọc `kq[0]`).
 */
export const cauGhiTayKemPax = (db: D1Database, d: DongGhiChup): D1PreparedStatement[] => [
  cauGhiTay(db, d),
  ...(d.theoLoai ? [db.prepare(CHUP_PAX).bind(d.id, d.theoLoai.adult, d.theoLoai.child, d.theoLoai.senior, d.at, d.by)] : []),
];
/** Ghi tay: câu đổi `orders.updated_at` đứng NGAY SAU `cauGhiTay` trong cùng lô (chỉ áp khi bản MANUAL đã chèn). */
export const cauDoiMocSauGhiTay = (db: D1Database, orderId: string, at: string): D1PreparedStatement => db.prepare(DOI_MOC_SAU_GHI_TAY).bind(at, orderId);
/** «Chụp bù»: câu CỔNG đầu lô (khoá lạc quan + «chưa có bản chụp nào»); các câu `cauChupChuoi` đứng ngay sau. */
export const cauKhoaChupBu = (db: D1Database, v: { orderId: string; at: string; expectedUpdatedAt: string }): D1PreparedStatement =>
  db.prepare(KHOA_CHUP_BU).bind(v.at, v.orderId, v.expectedUpdatedAt);
export interface ChoChupBuRow { id: string; order_code: string; confirmed_at: string | null; created_at: string; ben_dat: string | null; co_nhap_tay: number; ben_dat_doi_tac: number | null }
export const donChoChupBu = async (db: D1Database): Promise<ChoChupBuRow[]> => (await db.prepare(CHO_CHUP_BU).all<ChoChupBuRow>()).results;
/** Bản chụp HIỆN HÀNH của đơn: dòng chưa bị bản nào thay thế (`supersedes_id` trỏ tới nó). */
export const banChupHienHanh = async (db: D1Database, orderId: string): Promise<TermRowDb[]> => (await db.prepare(HIEN_HANH).bind(orderId).all<TermRowDb>()).results;
export const demBanChup = async (db: D1Database, orderId: string): Promise<number> => Number((await db.prepare(DEM).bind(orderId).first<{ n: number }>())?.n ?? 0);
export const tenHoSo = async (db: D1Database, ids: readonly string[]): Promise<Map<string, string>> =>
  ids.length === 0 ? new Map() : new Map((await db.prepare(NHAN_HO_SO).bind(JSON.stringify([...new Set(ids)])).all<{ id: string; display_name: string }>()).results.map((r) => [r.id, r.display_name] as const));
/** Nhóm hiện hành của mã dịch vụ; null = Chưa phân loại hoặc mã không có trong danh mục. */
export const nhomCuaMa = async (db: D1Database, catalogCode: string): Promise<string | null> => (await db.prepare(NHOM_CUA_MA).bind(catalogCode).first<{ group_code: string | null }>())?.group_code ?? null;
export const laNhaCungCap = async(db: D1Database, partyId: string): Promise<boolean> => (await db.prepare(LA_NHA_CUNG_CAP).bind(partyId).first()) !== null;
/**
 * ADR-0148 Đ1: ngày chụp gần nhất của một dòng mức / một gắn ↔ chính sách (null = chưa có bản chụp nào). CHỈ gốc lắp ráp gọi (tiêm vào `ctx.hoiDaChup` cho route của pricing — bài
 * siết ở src/architecture.test.ts). MỘT truy vấn.
 */
export const ngayChupGanNhat = async (db: D1Database, q: HoiDaChup): Promise<string | null> =>
  (q.loai === "MUC" ? await db.prepare(CHUP_GAN_NHAT_MUC).bind(q.ruleId).first<{ d: string | null }>()
    : await db.prepare(CHUP_GAN_NHAT_GAN).bind(q.tierCode, q.tu, q.den, q.partyId).first<{ d: string | null }>())?.d ?? null;
