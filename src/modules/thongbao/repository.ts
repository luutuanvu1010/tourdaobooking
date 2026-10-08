// SQL của module thongbao (bảng ntf_*; ADR-0034 + ADR-0036). Mọi câu qua defineSql, tham số ?N. Đọc xuyên module CHỈ qua view công bố:
// v_aud_order_event + v_aud_order_change + v_aud_trip_event + v_aud_account_event (audit), v_ord_order_label + v_ord_order_owner (orders), v_dsp_order_handler + v_dsp_first_handler (dispatch), v_stf_staff_label (staff).
// Không DELETE, không OR REPLACE (R-N1-9).
import { defineSql } from "../../shared/sql-registry.ts";
import type { DongDon, DongThuCong } from "../../shared/thong-bao.ts";
import { HANH_DONG_TIN_CHUYEN, type DonCuaTin, type DongChuyenTho } from "../../shared/tin-chuyen.ts";

const LIST_DON = defineSql("thongbao", "list_don", `
  SELECT e.id, e.order_id, o.order_code AS ma_don, e.action, e.staff_id AS actor_id, s.label AS ten_nguoi_lam, e.created_at AS luc,
         w.staff_id AS owner_id, (h.order_id IS NOT NULL) AS co_nguoi, h.staff_id AS handler_staff_id,
         (f.first_at IS NULL OR f.first_at > e.created_at) AS lap_chua_co_nguoi,
         (e.action = 'order_handler_changed' AND EXISTS (SELECT 1 FROM v_aud_order_event c
            WHERE c.order_id = e.order_id AND c.action = 'created' AND c.created_at = e.created_at)) AS cung_lo_lap
  FROM v_aud_order_event e
  JOIN v_ord_order_label o ON o.id = e.order_id
  JOIN v_ord_order_owner w ON w.id = e.order_id
  LEFT JOIN v_dsp_order_handler h ON h.order_id = e.order_id
  LEFT JOIN v_dsp_first_handler f ON f.order_id = e.order_id
  LEFT JOIN v_stf_staff_label s ON s.id = e.staff_id
  WHERE e.created_at >= ?1
  ORDER BY e.created_at DESC LIMIT 3000`);
// ADR-0062 Đ1 + ADR-0052 D6.2 MQ-07: dòng ĐỔI (v_aud_order_change — CHỈ module này đọc, có `detail`) từ max(cửa sổ 30 ngày ?1, mốc bắt đầu ?2).
// "Sau xác nhận" TÍNH từ nhật ký: có dòng `confirmed` của đơn TRƯỚC dòng đổi (v_aud_order_event, KHÔNG cửa sổ — đơn xác nhận 40 ngày trước vẫn đúng).
const DOI_CHON = `
  SELECT e.id, e.order_id, o.order_code AS ma_don, e.action, e.detail, e.leg_id, e.staff_id AS actor_id, s.label AS ten_nguoi_lam, e.created_at AS luc,
         w.staff_id AS owner_id, (h.order_id IS NOT NULL) AS co_nguoi, h.staff_id AS handler_staff_id,
         EXISTS (SELECT 1 FROM v_aud_order_event c WHERE c.order_id = e.order_id AND c.action = 'confirmed' AND c.created_at < e.created_at) AS sau_xac_nhan
  FROM v_aud_order_change e
  JOIN v_ord_order_label o ON o.id = e.order_id
  JOIN v_ord_order_owner w ON w.id = e.order_id
  LEFT JOIN v_dsp_order_handler h ON h.order_id = e.order_id
  LEFT JOIN v_stf_staff_label s ON s.id = e.staff_id`;
const LIST_DOI = defineSql("thongbao", "list_doi", `${DOI_CHON}
  WHERE e.created_at >= ?1 AND e.created_at >= ?2
  ORDER BY e.created_at DESC LIMIT 3000`);
// Gõ cửa (ADR-0062 Đ4): dòng đổi MỚI NHẤT của người vừa làm trên đơn này, ghi từ ?3 — gốc lắp ráp gọi ngay sau lệnh đổi (route không truyền chữ nhật ký).
const DOI_VUA_GHI = defineSql("thongbao", "doi_vua_ghi", `${DOI_CHON}
  WHERE e.order_id = ?1 AND e.staff_id = ?2 AND e.created_at >= ?3
  ORDER BY e.created_at DESC LIMIT 1`);
const LIST_THU_CONG = defineSql("thongbao", "list_thu_cong", `
  SELECT n.id, n.tieu_de, n.noi_dung, n.quan_trong, n.created_by, COALESCE(s.label, '') AS ten_nguoi_gui, n.created_at, (n.valid_to IS NOT NULL) AS thu_hoi,
         (SELECT group_concat(t.tag, ' ') FROM ntf_notice_target t WHERE t.notice_id = n.id) AS tags,
         (SELECT a.created_at FROM ntf_ack a WHERE a.notice_id = n.id AND a.staff_id = ?2) AS da_hieu_luc
  FROM ntf_notice n LEFT JOIN v_stf_staff_label s ON s.id = n.created_by
  WHERE n.valid_to IS NULL AND (n.created_at >= ?1 OR (n.quan_trong = 1 AND NOT EXISTS (SELECT 1 FROM ntf_ack a WHERE a.notice_id = n.id AND a.staff_id = ?2)))
  ORDER BY n.created_at DESC LIMIT 500`);
// Tra một tin thủ công theo id, KHÔNG qua cửa sổ 30 ngày (khác LIST_THU_CONG): route "đã hiểu" phải tìm được tin quan trọng dù đã quá hạn giữ,
// và bấm lần hai (đã "Đã hiểu" từ trước) vẫn phải thấy tin để trả OK thay vì 404 (đặc tả §7; rà soát trước thi công, mục R5).
const GET_THU_CONG = defineSql("thongbao", "get_thu_cong", `
  SELECT n.id, n.quan_trong, n.created_by, (n.valid_to IS NOT NULL) AS thu_hoi,
         (SELECT group_concat(t.tag, ' ') FROM ntf_notice_target t WHERE t.notice_id = n.id) AS tags,
         (SELECT a.created_at FROM ntf_ack a WHERE a.notice_id = n.id AND a.staff_id = ?2) AS da_hieu_luc
  FROM ntf_notice n WHERE n.id = ?1`);
const FIND_BY_REQUEST = defineSql("thongbao", "find_by_request", `SELECT id FROM ntf_notice WHERE created_by = ?1 AND client_request_id = ?2`);
// Mối lo 4 (điều phối, rà soát Task 6): chống trùng bằng findByRequest ĐẦU route chỉ bắt được bấm-hai-lần TUẦN TỰ. Hai yêu cầu gửi
// THẬT SỰ ĐỒNG THỜI (hai tab) đều có thể qua được lần tra đó trước khi dòng đầu ghi xong. Theo đúng khuôn đã có ở module feedback
// (fbk_ticket, cùng mục đích chống trùng theo client_request_id): MỘT câu INSERT … SELECT … WHERE NOT EXISTS (cùng người gửi + cùng
// mã yêu cầu) — D1 tuần tự hoá các lời gọi batch() nên hai yêu cầu song song không cùng lọt qua điều kiện này; bên thua chèn 0 dòng,
// route tra lại findByRequest sau batch() để lấy id của bên thắng và trả 200 thay vì tưởng lỗi.
const INSERT_NOTICE = defineSql("thongbao", "insert_notice", `
  INSERT INTO ntf_notice (id, tieu_de, noi_dung, quan_trong, client_request_id, created_at, created_by, updated_at, updated_by)
  SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?6, ?7
  WHERE NOT EXISTS (SELECT 1 FROM ntf_notice WHERE created_by = ?7 AND client_request_id = ?5)`);
// Chèn nhóm nhận CHỈ khi tin ?1 vừa được chèn thật ở câu trên (cùng khuôn insertFirstMessageStatement của feedback) — nếu tin thua cuộc
// đua ở trên (bị bỏ qua vì đã có người khác chèn trước), các dòng nhóm nhận của yêu cầu thua cũng không được chèn theo một id "ma".
const INSERT_TARGET = defineSql("thongbao", "insert_target", `
  INSERT INTO ntf_notice_target (notice_id, tag, created_at, created_by, updated_at, updated_by)
  SELECT ?1, ?2, ?3, ?4, ?3, ?4 WHERE EXISTS (SELECT 1 FROM ntf_notice WHERE id = ?1)`);
const REVOKE = defineSql("thongbao", "revoke", `UPDATE ntf_notice SET valid_to = ?2, updated_at = ?2, updated_by = ?3 WHERE id = ?1 AND valid_to IS NULL`);
// created_by (người GỬI) bắt buộc phải có ở đây: soNguoiNhan/daHieu/chuaHieu phải loại NGƯỜI GỬI khỏi nhóm nhận, KHÔNG phải người
// đang xem — với ≥ 2 Toàn quyền, người xem X khác người gửi Y, lọc theo `staff.id` (người xem) sẽ để Y kẹt mãi ở "Chưa hiểu" và bỏ
// sót X (người kiểm độc lập, lượt sửa cuối Task 6).
const LIST_SENT = defineSql("thongbao", "list_sent", `
  SELECT n.id, n.tieu_de, n.quan_trong, n.created_at, n.valid_to, n.created_by,
         (SELECT group_concat(t.tag, ' ') FROM ntf_notice_target t WHERE t.notice_id = n.id) AS tags
  FROM ntf_notice n ORDER BY n.created_at DESC LIMIT 100`);
const LIST_ACKS = defineSql("thongbao", "list_acks", `SELECT staff_id, created_at FROM ntf_ack WHERE notice_id = ?1`);
const GET_NOTICE = defineSql("thongbao", "get_notice", `
  SELECT n.id, n.valid_to, n.created_by, (SELECT group_concat(t.tag, ' ') FROM ntf_notice_target t WHERE t.notice_id = n.id) AS tags FROM ntf_notice n WHERE n.id = ?1`);
const GET_MARK = defineSql("thongbao", "get_mark", `SELECT doc_den_luc FROM ntf_read_mark WHERE staff_id = ?1`);
const UPSERT_MARK = defineSql("thongbao", "upsert_mark", `
  INSERT INTO ntf_read_mark (staff_id, doc_den_luc, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?2, ?1, ?2, ?1)
  ON CONFLICT (staff_id) DO UPDATE SET doc_den_luc = excluded.doc_den_luc, updated_at = excluded.updated_at, updated_by = excluded.updated_by`);
const INSERT_ACK = defineSql("thongbao", "insert_ack", `
  INSERT INTO ntf_ack (notice_id, staff_id, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?2, ?3, ?2)
  ON CONFLICT (notice_id, staff_id) DO NOTHING`);

interface DonRow { id: string; order_id: string; ma_don: string; action: string; actor_id: string | null; ten_nguoi_lam: string | null; luc: string;
  owner_id: string; co_nguoi: number; handler_staff_id: string | null; lap_chua_co_nguoi: number; cung_lo_lap: number }
interface ThuCongRow { id: string; tieu_de: string; noi_dung: string; quan_trong: number; created_by: string; ten_nguoi_gui: string; created_at: string;
  thu_hoi: number; tags: string | null; da_hieu_luc: string | null }
interface ThuCongLookupRow { id: string; quan_trong: number; created_by: string | null; thu_hoi: number; tags: string | null; da_hieu_luc: string | null }

export interface ThuCongLookup { id: string; quanTrong: boolean; thuHoi: boolean; nhan: string[]; daHieuLuc: string | null; nguoiGuiId: string | null }

export async function listDon(db: D1Database, tu: string): Promise<DongDon[]> {
  const r = (await db.prepare(LIST_DON).bind(tu).all<DonRow>()).results;
  return r.map((x) => ({ id: x.id, orderId: x.order_id, maDon: x.ma_don, action: x.action, actorId: x.actor_id, tenNguoiLam: x.ten_nguoi_lam, luc: x.luc,
    ownerId: x.owner_id, phuTrach: { coNguoi: x.co_nguoi === 1, staffId: x.handler_staff_id }, lapChuaCoNguoi: x.lap_chua_co_nguoi === 1, cungLoLap: x.cung_lo_lap === 1 }));
}
interface DoiRow { id: string; order_id: string; ma_don: string; action: string; detail: string | null; leg_id: string | null; actor_id: string | null;
  ten_nguoi_lam: string | null; luc: string; owner_id: string; co_nguoi: number; handler_staff_id: string | null; sau_xac_nhan: number }
/** Dòng đổi (ADR-0062) dạng DongDon — `chuyenCuaChang` (MQ-07) do index.ts ghép từ hàm tiêm. */
const dongDoi = (x: DoiRow): DongDon => ({ id: x.id, orderId: x.order_id, maDon: x.ma_don, action: x.action, actorId: x.actor_id, tenNguoiLam: x.ten_nguoi_lam, luc: x.luc,
  ownerId: x.owner_id, phuTrach: { coNguoi: x.co_nguoi === 1, staffId: x.handler_staff_id }, lapChuaCoNguoi: false, cungLoLap: false,
  detail: x.detail, sauXacNhan: x.sau_xac_nhan === 1, legId: x.leg_id });
export async function listDoi(db: D1Database, tu: string, mocTinDoi: string): Promise<DongDon[]> {
  return (await db.prepare(LIST_DOI).bind(tu, mocTinDoi).all<DoiRow>()).results.map(dongDoi);
}
/** Dòng đổi mới nhất của `actorId` trên đơn, ghi từ `tuLuc` (= mốc bắt đầu request — chỉ dòng do chính request ghi) — null = lệnh không ghi dòng đổi (vd số khách y nguyên, đặt gấp, ghi lần thu). */
export async function doiVuaGhi(db: D1Database, orderId: string, actorId: string, tuLuc: string): Promise<DongDon | null> {
  const r = await db.prepare(DOI_VUA_GHI).bind(orderId, actorId, tuLuc).first<DoiRow>();
  return r ? dongDoi(r) : null;
}
export async function listThuCong(db: D1Database, tu: string, staffId: string): Promise<DongThuCong[]> {
  const r = (await db.prepare(LIST_THU_CONG).bind(tu, staffId).all<ThuCongRow>()).results;
  return r.map((x) => ({ id: x.id, tieuDe: x.tieu_de, noiDung: x.noi_dung, quanTrong: x.quan_trong === 1, nhan: (x.tags ?? "").split(" ").filter(Boolean),
    nguoiGuiId: x.created_by, tenNguoiGui: x.ten_nguoi_gui, luc: x.created_at, thuHoi: x.thu_hoi === 1, daHieuLuc: x.da_hieu_luc }));
}
export async function getThuCong(db: D1Database, id: string, staffId: string): Promise<ThuCongLookup | null> {
  const x = await db.prepare(GET_THU_CONG).bind(id, staffId).first<ThuCongLookupRow>();
  if (!x) return null;
  return {
    id: x.id, quanTrong: x.quan_trong === 1, thuHoi: x.thu_hoi === 1, nhan: (x.tags ?? "").split(" ").filter(Boolean),
    daHieuLuc: x.da_hieu_luc, nguoiGuiId: x.created_by,
  };
}
export const getMark = async (db: D1Database, staffId: string) => (await db.prepare(GET_MARK).bind(staffId).first<{ doc_den_luc: string }>())?.doc_den_luc ?? null;
export const upsertMarkStatement = (db: D1Database, staffId: string, at: string) => db.prepare(UPSERT_MARK).bind(staffId, at);
export const insertAckStatement = (db: D1Database, noticeId: string, staffId: string, at: string) => db.prepare(INSERT_ACK).bind(noticeId, staffId, at);

export const findByRequest = async (db: D1Database, staffId: string, req: string) => (await db.prepare(FIND_BY_REQUEST).bind(staffId, req).first<{ id: string }>())?.id ?? null;
export const insertNoticeStatement = (db: D1Database, a: { id: string; tieuDe: string; noiDung: string; quanTrong: boolean; req: string; at: string; by: string }) =>
  db.prepare(INSERT_NOTICE).bind(a.id, a.tieuDe, a.noiDung, a.quanTrong ? 1 : 0, a.req, a.at, a.by);
export const insertTargetStatement = (db: D1Database, noticeId: string, tag: string, at: string, by: string) => db.prepare(INSERT_TARGET).bind(noticeId, tag, at, by);
export const revokeStatement = (db: D1Database, id: string, at: string, by: string) => db.prepare(REVOKE).bind(id, at, by);
export async function listSent(db: D1Database) {
  return (await db.prepare(LIST_SENT).all<{ id: string; tieu_de: string; quan_trong: number; created_at: string; valid_to: string | null; created_by: string | null; tags: string | null }>()).results;
}
export async function listAcks(db: D1Database, id: string) {
  return (await db.prepare(LIST_ACKS).bind(id).all<{ staff_id: string; created_at: string }>()).results;
}
export const getNotice = (db: D1Database, id: string) => db.prepare(GET_NOTICE).bind(id).first<{ id: string; valid_to: string | null; created_by: string | null; tags: string | null }>();

// ---- Web Push (ADR-0036): ntf_push_sub — địa chỉ nhận thông báo màn hình khoá của từng máy. ----

const LIST_MAY_DANG_BAT = defineSql("thongbao", "list_may_dang_bat", `SELECT staff_id, endpoint FROM ntf_push_sub WHERE revoked_at IS NULL`);
const DEM_MAY = defineSql("thongbao", "dem_may", `SELECT COUNT(*) AS n FROM ntf_push_sub WHERE staff_id = ?1 AND revoked_at IS NULL`);
// I-2 (vòng rà 2026-09-28): "đang bật trên MÁY NÀY" — chỉ đúng dòng của CHÍNH staff gọi (?1) khớp endpoint của máy đang mở (?2) và còn hiệu
// lực; không đọc dòng của staff khác (không lộ ai đang bật máy nào). `soMay` (DEM_MAY) là tổng theo tài khoản, không phân biệt được máy nào.
const MAY_NAY = defineSql("thongbao", "may_nay", `SELECT 1 FROM ntf_push_sub WHERE staff_id = ?1 AND endpoint = ?2 AND revoked_at IS NULL`);
// Máy dùng chung đổi chủ (đăng ký cùng endpoint bằng tài khoản khác): huỷ dòng đang bật của NGƯỜI KHÁC trước khi chèn dòng mới —
// tránh đụng UNIQUE INDEX (endpoint) WHERE revoked_at IS NULL. `by` = người vừa thao tác đăng ký (chủ MỚI của máy).
const THU_HOI_MAY_NGUOI_KHAC = defineSql("thongbao", "thu_hoi_may_nguoi_khac", `
  UPDATE ntf_push_sub SET revoked_at = ?2, revoke_reason = 'doi-tai-khoan', updated_at = ?2, updated_by = ?3
  WHERE endpoint = ?1 AND staff_id != ?3 AND revoked_at IS NULL`);
// Đăng ký lại cùng máy (cùng người, cùng endpoint, dòng đang bật) bằng phiên KHÁC (ADR-0075 điều 6b — web/shell.ts gửi lại sau mỗi lần đăng nhập): chỉ gắn
// mã phiên mới (?2); cùng phiên thì không ghi gì. Máy đã bị tắt (vd `bi-thay`) KHÔNG mở lại dòng cũ: câu BAT_MAY dưới chèn dòng mới (dòng cũ giữ làm lịch sử;
// chỉ mục duy nhất ntf_push_sub_endpoint_uq chỉ xét dòng đang bật).
const GAN_PHIEN_MAY = defineSql("thongbao", "gan_phien_may", `
  UPDATE ntf_push_sub SET session_id = ?2, updated_at = ?4, updated_by = ?3
  WHERE endpoint = ?1 AND staff_id = ?3 AND revoked_at IS NULL AND session_id IS NOT ?2`);
// Bật lại cùng máy (cùng người, cùng endpoint) = không chèn thêm: WHERE NOT EXISTS chỉ chèn khi CHƯA có dòng đang bật với endpoint này
// (dòng của người khác đã bị câu THU_HOI huỷ ngay trước, trong cùng batch()). `session_id` (?6) = phiên đang đăng ký (ADR-0075 điều 6b).
const BAT_MAY = defineSql("thongbao", "bat_may", `
  INSERT INTO ntf_push_sub (id, staff_id, endpoint, thiet_bi, created_at, created_by, updated_at, updated_by, session_id)
  SELECT ?1, ?2, ?3, ?4, ?5, ?2, ?5, ?2, ?6
  WHERE NOT EXISTS (SELECT 1 FROM ntf_push_sub WHERE endpoint = ?3 AND revoked_at IS NULL)`);
// Tắt máy của staffId: `endpoint = NULL` (tham số ?2) = mọi máy của người đó; câu SQL tĩnh theo khuôn `?N IS NULL OR …`.
// `updated_by` (?5) = người thao tác: chính chủ máy (tu-tat, dang-xuat) hoặc NULL = hệ thống (tai-khoan-doi — tắt kèm khi tài khoản đổi;
// ai làm thay đổi đó đã có trong audit_log của chính thao tác), theo khuôn HET_HAN bên dưới.
const TAT_MAY = defineSql("thongbao", "tat_may", `
  UPDATE ntf_push_sub SET revoked_at = ?4, revoke_reason = ?3, updated_at = ?4, updated_by = ?5
  WHERE staff_id = ?1 AND revoked_at IS NULL AND (?2 IS NULL OR endpoint = ?2)`);
// Máy bị đăng xuất vì đăng nhập máy khác (ADR-0075 điều 6b): tắt MỌI đăng ký đang bật của tài khoản trừ đăng ký mang đúng phiên mới (?2) — kể cả đăng ký
// cũ session_id NULL (trước phát hành). ?2 NULL = tắt hết. updated_by = NULL (hệ thống — lần đăng nhập đã có dòng aut_session của chính nó).
const TAT_MAY_TRU_PHIEN = defineSql("thongbao", "tat_may_tru_phien", `
  UPDATE ntf_push_sub SET revoked_at = ?3, revoke_reason = 'bi-thay', updated_at = ?3, updated_by = NULL
  WHERE staff_id = ?1 AND revoked_at IS NULL AND (session_id IS NULL OR ?2 IS NULL OR session_id <> ?2)`);
// IT/Toàn quyền gỡ MỘT phiên (ADR-0075 điều 6b — "của đúng máy đó"): tắt CHỈ các đăng ký mang đúng mã phiên bị gỡ (?2 = mảng JSON mã phiên) của tài khoản ?1;
// máy khác của cùng tài khoản (phiên khác) và đăng ký cũ session_id NULL (trước phát hành — không biết thuộc máy nào) KHÔNG đụng. Lý do 'bi-go';
// updated_by = NULL (hệ thống — người gỡ đã có ở aut_session.ended_by và nhật ký session_revoked của chính thao tác).
const TAT_MAY_CUA_PHIEN = defineSql("thongbao", "tat_may_cua_phien", `
  UPDATE ntf_push_sub SET revoked_at = ?3, revoke_reason = 'bi-go', updated_at = ?3, updated_by = NULL
  WHERE staff_id = ?1 AND revoked_at IS NULL AND session_id IN (SELECT value FROM json_each(?2))`);
// ADR-0085 Q3: máy bị kết thúc vì Toàn quyền LƯU CHÍNH SÁCH (siết theo tập, nhiều tài khoản một lúc) — tắt CHỈ đăng ký mang đúng các phiên đó, lý do mat-mien.
// Không lọc theo tài khoản (danh sách phiên đã đủ hẹp — phiên thuộc đúng một tài khoản); không tắt máy được giữ, không tắt đăng ký chưa gắn phiên (session_id NULL).
const TAT_MAY_CUA_CAC_PHIEN = defineSql("thongbao", "tat_may_cua_cac_phien", `
  UPDATE ntf_push_sub SET revoked_at = ?2, revoke_reason = 'mat-mien', updated_at = ?2, updated_by = NULL
  WHERE revoked_at IS NULL AND session_id IN (SELECT value FROM json_each(?1))`);
// Hết hiệu lực (dịch vụ đẩy trả 410) — không phải hành động của một người, updated_by = NULL ("hệ thống", theo khuôn migrations-dispatch).
const HET_HAN = defineSql("thongbao", "het_han_may", `
  UPDATE ntf_push_sub SET revoked_at = ?2, revoke_reason = 'het-han', updated_at = ?2, updated_by = NULL
  WHERE revoked_at IS NULL AND endpoint IN (SELECT value FROM json_each(?1))`);

export async function listMayDangBat(db: D1Database): Promise<{ staff_id: string; endpoint: string }[]> {
  return (await db.prepare(LIST_MAY_DANG_BAT).all<{ staff_id: string; endpoint: string }>()).results;
}
export const demMay = async (db: D1Database, staffId: string): Promise<number> =>
  (await db.prepare(DEM_MAY).bind(staffId).first<{ n: number }>())?.n ?? 0;
export const mayDangBat = async (db: D1Database, staffId: string, endpoint: string): Promise<boolean> =>
  (await db.prepare(MAY_NAY).bind(staffId, endpoint).first()) !== null;
export function batMayStatements(db: D1Database, a: { id: string; staffId: string; endpoint: string; thietBi: string; at: string; sessionId: string | null }): D1PreparedStatement[] {
  return [
    db.prepare(THU_HOI_MAY_NGUOI_KHAC).bind(a.endpoint, a.at, a.staffId),
    db.prepare(GAN_PHIEN_MAY).bind(a.endpoint, a.sessionId, a.staffId, a.at),
    db.prepare(BAT_MAY).bind(a.id, a.staffId, a.endpoint, a.thietBi, a.at, a.sessionId),
  ];
}
/** Tắt mọi máy nhận của tài khoản trừ máy mang phiên `giuPhien` (ADR-0075 điều 6b). Chưa chạy. */
export const tatMayTruPhienStatement = (db: D1Database, staffId: string, giuPhien: string | null, at: string): D1PreparedStatement =>
  db.prepare(TAT_MAY_TRU_PHIEN).bind(staffId, giuPhien, at);
/** Tắt CHỈ máy nhận mang đúng các phiên `sessionIds`, nhiều tài khoản một lúc (Toàn quyền lưu chính sách đăng nhập — ADR-0085 Q3, lý do mat-mien). Chưa chạy. */
export const tatMayCuaCacPhienStatement = (db: D1Database, sessionIds: readonly string[], at: string): D1PreparedStatement =>
  db.prepare(TAT_MAY_CUA_CAC_PHIEN).bind(JSON.stringify(sessionIds), at);
/** Tắt CHỈ các máy nhận mang đúng các phiên `sessionIds` của tài khoản (IT/Toàn quyền gỡ phiên — ADR-0075 điều 6b). Chưa chạy. */
export const tatMayCuaPhienStatement = (db: D1Database, staffId: string, sessionIds: readonly string[], at: string): D1PreparedStatement =>
  db.prepare(TAT_MAY_CUA_PHIEN).bind(staffId, JSON.stringify(sessionIds), at);
export const tatMayStatement = (db: D1Database, staffId: string, endpoint: string | null, lyDo: string, at: string, by: string | null): D1PreparedStatement =>
  db.prepare(TAT_MAY).bind(staffId, endpoint, lyDo, at, by);
export const hetHanStatement = (db: D1Database, endpoints: string[], at: string): D1PreparedStatement =>
  db.prepare(HET_HAN).bind(JSON.stringify(endpoints), at);

// ADR-0052 D6.1: tin chuyến đọc v_aud_trip_event (audit) — chỉ khoá; danh sách hành động truyền bằng tham số JSON từ HANH_DONG_TIN_CHUYEN (một nguồn).
const LIST_TIN_CHUYEN = defineSql("thongbao", "list_tin_chuyen", `
  SELECT e.id, e.trip_id, e.staff_id AS actor_id, e.action, e.created_at AS luc FROM v_aud_trip_event e
  WHERE e.created_at >= ?1 AND e.action IN (SELECT value FROM json_each(?2)) ORDER BY e.created_at DESC LIMIT 3000`);
const TIN_CHUYEN_THEO_ID = defineSql("thongbao", "tin_chuyen_theo_id",
  `SELECT e.id, e.trip_id, e.staff_id AS actor_id, e.action, e.created_at AS luc FROM v_aud_trip_event e WHERE e.id = ?1`);
const DON_CHO_TIN = defineSql("thongbao", "don_cho_tin", `
  SELECT o.id AS order_id, o.order_code AS ma_don, w.staff_id AS owner_id, h.staff_id AS handler_staff_id
  FROM v_ord_order_label o JOIN v_ord_order_owner w ON w.id = o.id LEFT JOIN v_dsp_order_handler h ON h.order_id = o.id
  WHERE o.id IN (SELECT value FROM json_each(?1))`);

interface TinChuyenRow { id: string; trip_id: string; actor_id: string | null; action: string; luc: string }
const tho = (r: TinChuyenRow): DongChuyenTho => ({ id: r.id, tripId: r.trip_id, actorId: r.actor_id, action: r.action, luc: r.luc });
export async function listTinChuyen(db: D1Database, tu: string): Promise<DongChuyenTho[]> {
  return (await db.prepare(LIST_TIN_CHUYEN).bind(tu, JSON.stringify(HANH_DONG_TIN_CHUYEN)).all<TinChuyenRow>()).results.map(tho);
}
export async function tinChuyenTheoId(db: D1Database, id: string): Promise<DongChuyenTho | null> {
  const r = await db.prepare(TIN_CHUYEN_THEO_ID).bind(id).first<TinChuyenRow>();
  return r ? tho(r) : null;
}
// ADR-0090 đ3: tin "ngưng tài khoản giữ tiền" đọc v_aud_account_event (audit, migration 0075) — chỉ khoá; nhãn tên qua v_stf_staff_label (staff). Quyền của
// tài khoản bị ngưng do index.ts ghép từ staff (listStaffAccounts) — không đọc bảng của module khác.
const LIST_TIN_TAI_KHOAN = defineSql("thongbao", "list_tin_tai_khoan", `
  SELECT e.id, e.account_id, e.staff_id AS actor_id, e.created_at AS luc, s.label AS ten_nguoi_lam, COALESCE(t.label, '') AS ten_tai_khoan
  FROM v_aud_account_event e LEFT JOIN v_stf_staff_label s ON s.id = e.staff_id LEFT JOIN v_stf_staff_label t ON t.id = e.account_id
  WHERE e.created_at >= ?1 ORDER BY e.created_at DESC LIMIT 500`);
export interface TinTaiKhoanTho { id: string; accountId: string; actorId: string | null; luc: string; tenNguoiLam: string | null; tenTaiKhoan: string }
export async function listTinTaiKhoan(db: D1Database, tu: string): Promise<TinTaiKhoanTho[]> {
  const r = (await db.prepare(LIST_TIN_TAI_KHOAN).bind(tu).all<{ id: string; account_id: string; actor_id: string | null; luc: string; ten_nguoi_lam: string | null; ten_tai_khoan: string }>()).results;
  return r.map((x) => ({ id: x.id, accountId: x.account_id, actorId: x.actor_id, luc: x.luc, tenNguoiLam: x.ten_nguoi_lam, tenTaiKhoan: x.ten_tai_khoan }));
}
export async function donChoTin(db: D1Database, orderIds: readonly string[]): Promise<DonCuaTin[]> {
  if (orderIds.length === 0) return [];
  const r = (await db.prepare(DON_CHO_TIN).bind(JSON.stringify([...new Set(orderIds)])).all<{ order_id: string; ma_don: string; owner_id: string; handler_staff_id: string | null }>()).results;
  return r.map((x) => ({ orderId: x.order_id, maDon: x.ma_don, ownerId: x.owner_id, handlerStaffId: x.handler_staff_id }));
}
