// SQL của module thongbao (bảng ntf_*; ADR-0034). Mọi câu qua defineSql, tham số ?N. Đọc xuyên module CHỈ qua view công bố:
// v_aud_order_event (audit), v_ord_order_label + v_ord_order_owner (orders), v_dsp_order_handler + v_dsp_first_handler (dispatch), v_stf_staff_label (staff).
// Không DELETE, không OR REPLACE (R-N1-9).
import { defineSql } from "../../shared/sql-registry.ts";
import type { DongDon, DongThuCong } from "../../shared/thong-bao.ts";

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
  SELECT n.id, n.quan_trong, (n.valid_to IS NOT NULL) AS thu_hoi,
         (SELECT group_concat(t.tag, ' ') FROM ntf_notice_target t WHERE t.notice_id = n.id) AS tags,
         (SELECT a.created_at FROM ntf_ack a WHERE a.notice_id = n.id AND a.staff_id = ?2) AS da_hieu_luc
  FROM ntf_notice n WHERE n.id = ?1`);
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
interface ThuCongLookupRow { id: string; quan_trong: number; thu_hoi: number; tags: string | null; da_hieu_luc: string | null }

export interface ThuCongLookup { id: string; quanTrong: boolean; thuHoi: boolean; nhan: string[]; daHieuLuc: string | null }

export async function listDon(db: D1Database, tu: string): Promise<DongDon[]> {
  const r = (await db.prepare(LIST_DON).bind(tu).all<DonRow>()).results;
  return r.map((x) => ({ id: x.id, orderId: x.order_id, maDon: x.ma_don, action: x.action, actorId: x.actor_id, tenNguoiLam: x.ten_nguoi_lam, luc: x.luc,
    ownerId: x.owner_id, phuTrach: { coNguoi: x.co_nguoi === 1, staffId: x.handler_staff_id }, lapChuaCoNguoi: x.lap_chua_co_nguoi === 1, cungLoLap: x.cung_lo_lap === 1 }));
}
export async function listThuCong(db: D1Database, tu: string, staffId: string): Promise<DongThuCong[]> {
  const r = (await db.prepare(LIST_THU_CONG).bind(tu, staffId).all<ThuCongRow>()).results;
  return r.map((x) => ({ id: x.id, tieuDe: x.tieu_de, noiDung: x.noi_dung, quanTrong: x.quan_trong === 1, nhan: (x.tags ?? "").split(" ").filter(Boolean),
    nguoiGuiId: x.created_by, tenNguoiGui: x.ten_nguoi_gui, luc: x.created_at, thuHoi: x.thu_hoi === 1, daHieuLuc: x.da_hieu_luc }));
}
export async function getThuCong(db: D1Database, id: string, staffId: string): Promise<ThuCongLookup | null> {
  const x = await db.prepare(GET_THU_CONG).bind(id, staffId).first<ThuCongLookupRow>();
  if (!x) return null;
  return { id: x.id, quanTrong: x.quan_trong === 1, thuHoi: x.thu_hoi === 1, nhan: (x.tags ?? "").split(" ").filter(Boolean), daHieuLuc: x.da_hieu_luc };
}
export const getMark = async (db: D1Database, staffId: string) => (await db.prepare(GET_MARK).bind(staffId).first<{ doc_den_luc: string }>())?.doc_den_luc ?? null;
export const upsertMarkStatement = (db: D1Database, staffId: string, at: string) => db.prepare(UPSERT_MARK).bind(staffId, at);
export const insertAckStatement = (db: D1Database, noticeId: string, staffId: string, at: string) => db.prepare(INSERT_ACK).bind(noticeId, staffId, at);
