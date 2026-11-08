import { AUDIT_ACTIONS, HANH_DONG_GHI_TIEN, SILENT_AUDIT_ACTIONS, isAuditAction, laHanhDongThuongMai, type AuditAction, type AuditTargetType } from "../../shared/audit-actions";
import type { AuditEntryDto, AuditListResponse, AuditRecordDto } from "../../shared/contracts";
import { mauLikeChua } from "../../shared/http";
import { HAN_XEM_NHU_VAI_PHUT } from "../../shared/xem-nhu-vai";

export { isAuditAction, type AuditAction, type AuditTargetType };

export interface AuditInput {
  /**
   * id do người gọi chọn (UUID mới) để CÁC CÂU SAU trong cùng batch hỏi "dòng này đã được ghi chưa" (`EXISTS (SELECT 1 FROM audit_log WHERE id = ?)`).
   * Vì dòng chỉ được ghi khi `onlyIf` đúng (vd `changes() > 0`) và id là duy nhất cho request này, đó là cách chắc chắn để biết
   * "UPDATE của chính tôi đã thắng" — khác với so mốc thời gian, có thể trùng khi hai request cùng mili-giây. Bỏ trống = tự sinh.
   */
  id?: string;
  /** Người thao tác; bỏ trống (null) = hệ thống tự làm (vd Cron đồng bộ Sheet). */
  staffId?: string | null;
  action: AuditAction;
  at: string;
  orderId?: string; // hành động thuộc một đơn
  targetType?: AuditTargetType;
  targetId?: string;
  /** Mô tả ngắn cho người đọc. KHÔNG bao giờ đưa PIN hay bí mật vào đây. */
  detail?: string;
}

export type AuditEntry = AuditEntryDto;
export type AuditRecord = AuditRecordDto;

/**
 * ADR-0180 Đ2 — dấu vai: dòng nhật ký ghi lúc Toàn quyền đang "xem như" vai khác mang mã vai đó ở `acting_role`. Worker không bật nodejs_compat (không có
 * AsyncLocalStorage) và ~44 tệp gọi hàm này, nên cột được điền NGAY TRONG câu chèn bằng truy vấn con theo `staff_id` (?3): phiên còn sống, có vai, hoạt động
 * gần nhất trong HAN_XEM_NHU_VAI_PHUT phút + AN_HAN_NHAT_KY_MS (cùng dạng điều kiện với câu xoá vai hết hạn ở auth — hết hạn = `last_seen_at < mốc` hoặc `julianday` NULL —
 * chỉ lùi mốc thêm khoảng nới), và tài khoản
 * THẬT đang giữ Toàn quyền (`v_stf_toan_quyen` — như currentStaff bỏ qua cột vai của người không giữ Toàn quyền). Không có người thao tác (hệ thống):
 * `staff_id = NULL` không khớp dòng nào ⇒ NULL.
 *
 * HẠN CHẾ ĐÃ BIẾT (chấp nhận): tra theo TÀI KHOẢN, không theo phiên. Toàn quyền dùng nhiều máy: máy B không đóng vai vẫn có thể bị gắn dấu khi máy A đang đóng
 * vai trong 60 phút đó (sai về phía gắn thừa). Sát mép 60 phút: currentStaff xét hạn bằng đồng hồ lúc request BẮT ĐẦU, câu này tính mốc lúc dựng câu ghi (muộn
 * hơn) — nên cửa sổ của nhật ký nới thêm AN_HAN_NHAT_KY_MS để thao tác vừa được chạy với vai không bị ghi thiếu dấu. Thiếu dấu vẫn có thể xảy ra nếu request kéo dài
 * quá khoảng nới đó (hiếm); thừa dấu xảy ra trong khoảng nới sau khi vai đã hết hạn. Trong lô bật / thoát: câu nhật ký đứng TRƯỚC câu đổi trạng thái nên dòng `acting_role_set`
 * mang vai ĐANG có trước đó (NULL nếu chưa đóng vai), dòng `acting_role_cleared` mang vai vừa rời.
 *
 * Nợ có tên (docs/SYSTEM-DESIGN.md §16): module audit (LEGACY) đọc thẳng `aut_session` của auth — chưa có view `v_aut_*` (VIEW_PREFIX của bài kiến trúc chưa
 * có `aut`, thêm là nới, cần chủ duyệt). Khi có view thì chỉ đổi tên nguồn trong truy vấn con.
 */
/**
 * Khoảng nới (mili-giây) CHỈ cho cửa sổ gắn dấu của nhật ký, cộng vào HAN_XEM_NHU_VAI_PHUT: bù độ trễ giữa lúc currentStaff xét hạn và lúc câu ghi nhật ký được dựng.
 * Không đổi luật hết hạn của phiên (`daHetHan`, câu xoá vai của auth giữ nguyên) — chỉ làm nhật ký nghiêng về phía gắn thừa.
 */
export const AN_HAN_NHAT_KY_MS = 10_000;

const ACTING_ROLE_SUBQUERY =
  `(SELECT s.acting_role FROM aut_session s
     WHERE s.staff_id = ?3 AND s.ended_at IS NULL AND s.acting_role IS NOT NULL
       AND s.last_seen_at >= ?9 AND julianday(s.last_seen_at) IS NOT NULL
       AND EXISTS (SELECT 1 FROM v_stf_toan_quyen t WHERE t.staff_id = ?3)
     ORDER BY s.last_seen_at DESC LIMIT 1)`;

/**
 * ADR-0187 Đ3 mức (a) — dấu «tự ghi đơn mình lập» (`tu_ghi_don_minh_lap`, migration 0150): 1 khi hành động (?4) thuộc tập ghi tiền HANH_DONG_GHI_TIEN
 * (các route của O_GHI_TIEN) VÀ người lập đơn (?2, view công bố `v_ord_order_owner` của orders) chính là người làm (?3); còn lại NULL. Điền NGAY TRONG câu chèn
 * (cùng lý do với acting_role: ~45 chỗ gọi, truyền tay dễ quên). Danh sách hành động là chuỗi tĩnh dựng lúc nạp mô-đun (đổi tập = đổi mã, không có đầu vào người dùng).
 * Hệ quả có tên: `payment_recorded` không trong tập (dùng chung với luồng Bán hàng khai khoản thu) — khoản thu lên đơn đã huỷ do Kế toán ghi không mang dấu ở nhật ký.
 */
const TU_GHI_SUBQUERY = `(CASE WHEN ?4 IN (${HANH_DONG_GHI_TIEN.map((a) => `'${a}'`).join(", ")})
       AND EXISTS (SELECT 1 FROM v_ord_order_owner o WHERE o.id = ?2 AND o.staff_id = ?3) THEN 1 END)`;

export function insertStatement(db: D1Database, e: AuditInput, onlyIf?: string): D1PreparedStatement {
  // SQL không còn CHECK liệt kê (0007) → chốt ở đây để giá trị lạ không bao giờ vào nhật ký.
  if (!isAuditAction(e.action)) throw new Error(`Hành động nhật ký không hợp lệ: ${String(e.action)}`);
  const targetType = e.targetType ?? (e.orderId ? "order" : null);
  const targetId = e.targetId ?? e.orderId ?? null;
  // Mốc hạn tính theo đồng hồ máy chủ lúc dựng câu, cùng cách currentStaff tính mốc xoá vai hết hạn, lùi thêm khoảng nới AN_HAN_NHAT_KY_MS.
  const mocHan = new Date(Date.now() - HAN_XEM_NHU_VAI_PHUT * 60 * 1000 - AN_HAN_NHAT_KY_MS).toISOString();
  return db
    .prepare(
      `INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at, acting_role, tu_ghi_don_minh_lap)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ${ACTING_ROLE_SUBQUERY}, ${TU_GHI_SUBQUERY} ${onlyIf ? `WHERE ${onlyIf}` : ""}`,
    )
    .bind(e.id ?? crypto.randomUUID(), e.orderId ?? null, e.staffId ?? null, e.action, targetType, targetId, e.detail ?? null, e.at, mocHan);
}

export const SYSTEM_ACTOR_NAME = "Hệ thống (tự động)";

/**
 * Cờ «được trả lại» (ADR-0030 điều 3): trong các đơn `orderIds`, đơn nào có dòng MỚI NHẤT (theo `created_at`, hoà thì `rowid`) trong ba hành động đổi người
 * phụ trách là `order_handler_refused`. Dựng theo MÃ hành động, không đọc `detail`; chỉ trả id. Một tham số JSON (`json_each`) — câu tĩnh dù số id đổi.
 */
export async function listReturnedOrders(db: D1Database, orderIds: readonly string[]): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT a.order_id FROM audit_log a
       WHERE a.order_id IN (SELECT value FROM json_each(?1)) AND a.action = 'order_handler_refused'
         AND a.rowid = (SELECT b.rowid FROM audit_log b
                        WHERE b.order_id = a.order_id AND b.action IN ('order_claimed', 'order_handler_changed', 'order_handler_refused')
                        ORDER BY b.created_at DESC, b.rowid DESC LIMIT 1)`,
    )
    .bind(JSON.stringify(orderIds))
    .all<{ order_id: string }>();
  return results.map((r) => r.order_id);
}

/** Bước K-a (sổ đại lý đợt 1): hành động chở mức thương mại — trang Nhật ký bỏ khi người xem giữ quyền Đối tác. SUY từ bảng hành động (`laHanhDongThuongMai`). */
const THUONG_MAI_AUDIT_ACTIONS: readonly AuditAction[] = (Object.keys(AUDIT_ACTIONS) as AuditAction[]).filter(laHanhDongThuongMai);

export async function listByOrder(db: D1Database, orderId: string): Promise<AuditEntry[]> {
  const { results } = await db
    .prepare(
      `SELECT a.action, a.staff_id, s.label AS staff_name, a.detail, a.created_at
       FROM audit_log a LEFT JOIN v_stf_staff_label s ON s.id = a.staff_id
       WHERE a.order_id = ? ORDER BY a.created_at, a.rowid`,
    )
    .bind(orderId)
    .all<{ action: AuditAction; staff_id: string | null; staff_name: string | null; detail: string | null; created_at: string }>();
  return results.map((r) => ({ action: r.action, staffId: r.staff_id, staffName: r.staff_name ?? SYSTEM_ACTOR_NAME, at: r.created_at, detail: r.detail }));
}

/** Nhật ký toàn hệ thống, mới nhất trước; lọc theo hành động và/hoặc tìm theo đối tượng / tên người thao tác. */
export async function listAll(
  db: D1Database,
  opts: { action: AuditAction | null; q: string; limit: number; offset: number; hideSilent: boolean; hideThuongMai?: boolean },
): Promise<AuditListResponse> {
  const where: string[] = [];
  const binds: (string | number)[] = [];
  if (opts.hideThuongMai) {
    // Bước K-a (sổ đại lý đợt 1): người xem giữ quyền Đối tác → bỏ dòng chở mức thương mại. Lọc TRONG SQL (trước LIMIT) như thao tác im lặng: phân trang và hasMore
    // không lộ số dòng bị giấu; lọc theo `action` của chính các hành động này cũng ra rỗng.
    where.push(`a.action NOT IN (${THUONG_MAI_AUDIT_ACTIONS.map(() => "?").join(", ")})`);
    binds.push(...THUONG_MAI_AUDIT_ACTIONS);
  }
  if (opts.hideSilent) {
    // ADR-0038: người xem không phải Toàn quyền → bỏ thao tác im lặng do người đang giữ Toàn quyền làm. Lọc TRONG SQL (trước LIMIT) để
    // phân trang và hasMore không lộ số dòng bị giấu.
    where.push(`NOT (a.action IN (${SILENT_AUDIT_ACTIONS.map(() => "?").join(", ")}) AND a.staff_id IN (SELECT staff_id FROM v_stf_toan_quyen))`);
    binds.push(...SILENT_AUDIT_ACTIONS);
  }
  if (opts.action) {
    where.push("a.action = ?");
    binds.push(opts.action);
  }
  if (opts.q) {
    const like = mauLikeChua(opts.q); // D1 từ chối mẫu LIKE > 50 byte: chữ dài cắt theo byte
    where.push(
      "(o.order_code LIKE ? ESCAPE '\\' OR s.label LIKE ? ESCAPE '\\' OR t.label LIKE ? ESCAPE '\\' OR pt.display_name LIKE ? ESCAPE '\\' OR (a.target_type = 'catalog' AND a.target_id LIKE ? ESCAPE '\\'))",
    );
    binds.push(like, like, like, like, like);
  }
  // LEFT JOIN: hành động không gắn với đơn (order_id NULL) vẫn phải hiện ra.
  const { results } = await db
    .prepare(
      `SELECT a.id, a.action, a.staff_id, s.label AS staff_name, a.order_id, o.order_code,
              a.target_type, a.target_id, t.label AS target_staff_name, pt.display_name AS target_party_name, lt.name AS target_location_name, a.detail, a.created_at
       FROM audit_log a
       LEFT JOIN v_stf_staff_label s ON s.id = a.staff_id
       LEFT JOIN v_ord_order_label o ON o.id = a.order_id
       LEFT JOIN v_stf_staff_label t ON a.target_type = 'staff' AND t.id = a.target_id
       LEFT JOIN v_pty_party_label pt ON a.target_type = 'party' AND pt.id = a.target_id
       LEFT JOIN v_loc_location_label lt ON a.target_type = 'location' AND lt.id = a.target_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY a.created_at DESC, a.rowid DESC LIMIT ? OFFSET ?`,
    )
    .bind(...binds, opts.limit + 1, opts.offset)
    .all<{
      id: string; action: AuditAction; staff_id: string | null; staff_name: string | null; order_id: string | null; order_code: string | null;
      target_type: AuditTargetType | null; target_id: string | null; target_staff_name: string | null; target_party_name: string | null; target_location_name: string | null; detail: string | null; created_at: string;
    }>();
  const entries = results.slice(0, opts.limit).map((r) => ({
    id: r.id,
    action: r.action,
    staffId: r.staff_id,
    staffName: r.staff_name ?? SYSTEM_ACTOR_NAME,
    at: r.created_at,
    detail: r.detail,
    targetType: r.target_type,
    targetId: r.target_id,
    targetLabel: r.order_code ?? r.target_staff_name ?? r.target_party_name ?? r.target_location_name ?? (r.target_type === "catalog" ? r.target_id : null),
    orderId: r.order_id,
  }));
  return { entries, hasMore: results.length > opts.limit };
}
