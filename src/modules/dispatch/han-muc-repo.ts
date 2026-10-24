// SQL của hạn mức «Từ chối» (ADR-0032; kế hoạch 2026-10-23 mục 3c) — sổ sự kiện `dsp_release_event`, cài đặt `dsp_refuse_policy`. Module nghiêm: mọi câu qua
// defineSql (câu TĨNH — các mảnh dựng MỘT lần lúc nạp tệp), có trong danh sách tệp SQL của src/architecture.test.ts (EXPLAIN: chỉ bảng `dsp_*`).
// Luật đếm là BẢN SQL của `src/shared/han-muc-tu-choi.ts` (`demTuChoi`); bài song sinh `han-muc-sql.test.ts` chạy cùng bộ ca với bản thuần — đổi luật thì đổi CẢ HAI.
//
// Thứ tự = `seq` (thứ tự chèn toàn bảng). Mọi câu chèn tự cấp `seq` = max + 1 TRONG chính câu (D1 chạy lô tuần tự; chỉ mục duy nhất là lưới).
import { defineSql } from "../../shared/sql-registry.ts";
import type { CaiDatHanMuc, CheDo, LoaiSuKien } from "../../shared/han-muc-tu-choi.ts";

const SEQ_MOI = "(SELECT coalesce(max(seq), 0) + 1 FROM dsp_release_event)";
const COT = "id, seq, party_id, order_id, kind_code, reason_code, occurred_at, created_at, created_by, updated_at, updated_by";

/** Mốc RESET gần nhất của hồ sơ `p` (biểu thức SQL). */
const mocReset = (p: string) => `coalesce((SELECT max(t.seq) FROM dsp_release_event t WHERE t.party_id = ${p} AND t.kind_code = 'RESET'), 0)`;
/**
 * CHUỖI(p, x): số REFUSE của p sau mốc cắt = max(RESET gần nhất, CLAIM/ASSIGN gần nhất của p cho đơn ≠ x mà sau đó p không REFUSE/ABORT đơn đó).
 * `x` = '' ⇒ không loại đơn nào (bảng tổng của văn phòng).
 */
const chuoi = (p: string, x: string) => `(SELECT count(*) FROM dsp_release_event r
  WHERE r.party_id = ${p} AND r.kind_code = 'REFUSE'
    AND r.seq > max(
      ${mocReset(p)},
      coalesce((SELECT max(c.seq) FROM dsp_release_event c
                 WHERE c.party_id = ${p} AND c.kind_code IN ('CLAIM', 'ASSIGN') AND c.order_id <> ${x}
                   AND NOT EXISTS (SELECT 1 FROM dsp_release_event f
                                    WHERE f.party_id = ${p} AND f.order_id = c.order_id AND f.kind_code IN ('REFUSE', 'ABORT') AND f.seq > c.seq)), 0)))`;
/** TUẦN(p, w): số REFUSE của p có occurred_at ≥ đầu tuần w và sau RESET gần nhất. */
const tuan = (p: string, w: string) => `(SELECT count(*) FROM dsp_release_event r
  WHERE r.party_id = ${p} AND r.kind_code = 'REFUSE' AND r.occurred_at >= ${w} AND r.seq > ${mocReset(p)})`;
/** Cài đặt có hiệu lực lúc `n`. */
const caiDat = (n: string) => `(SELECT mode, max_consecutive AS mc, max_per_week AS mw FROM dsp_refuse_policy WHERE valid_from_at <= ${n} ORDER BY valid_from_at DESC LIMIT 1)`;

// ?1 hồ sơ P, ?2 đơn X ('' = không loại), ?3 đầu tuần, ?4 lúc lệnh.
const DEM_TU_CHOI = defineSql("dispatch", "dem_tu_choi", `SELECT p.mode, p.mc, p.mw, ${chuoi("?1", "?2")} AS chuoi, ${tuan("?1", "?3")} AS tuan FROM ${caiDat("?4")} p`);

/**
 * CÂU ĐẦU LÔ TỪ CHỐI (ADR-0032 điều 5): chèn REFUSE ⇔ (b) người gọi ĐANG có dòng phụ trách mở của đơn VÀ (a) không bị chặn hạn mức (chế độ Chặn + người
 * bị giới hạn + chuỗi/tuần đã đủ). Không có dòng cài đặt ⇒ không chèn. ?5 id, ?6 mã lý do, ?7 người ghi, ?8 bị giới hạn (0/1).
 */
const CHEN_TU_CHOI = defineSql(
  "dispatch",
  "chen_tu_choi",
  `INSERT INTO dsp_release_event (${COT})
   SELECT ?5, ${SEQ_MOI}, ?1, ?2, 'REFUSE', ?6, ?4, ?4, ?7, ?4, ?7
   FROM ${caiDat("?4")} p
   WHERE EXISTS (SELECT 1 FROM dsp_assignment WHERE order_id = ?2 AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL AND party_id = ?1)
     AND NOT (?8 = 1 AND p.mode = 'BLOCK' AND (${chuoi("?1", "?2")} >= p.mc OR ${tuan("?1", "?3")} >= p.mw))`,
);

/**
 * CLAIM / ASSIGN / ABORT đứng SAU câu nhật ký `changes() > 0` của lô (khuôn CHANGE-GUIDE công thức f): chỉ chèn khi câu NGAY TRƯỚC đã chèn — lô thua đua
 * không để lại sự kiện. ?1 id, ?2 hồ sơ, ?3 đơn, ?4 loại, ?5 lúc, ?6 người ghi.
 */
const CHEN_SU_KIEN_SAU = defineSql(
  "dispatch",
  "chen_su_kien_sau",
  `INSERT INTO dsp_release_event (${COT}) SELECT ?1, ${SEQ_MOI}, ?2, ?3, ?4, NULL, ?5, ?5, ?6, ?5, ?6 WHERE changes() > 0`,
);
/** ABORT (người phụ trách tự huỷ — Q-P2, chỉ thống kê): như trên + người đó VẪN đang có dòng phụ trách mở của đơn (lô huỷ không đóng dòng). */
const CHEN_ABORT_SAU = defineSql(
  "dispatch",
  "chen_abort_sau",
  `INSERT INTO dsp_release_event (${COT}) SELECT ?1, ${SEQ_MOI}, ?2, ?3, 'ABORT', NULL, ?4, ?4, ?5, ?4, ?5
   WHERE changes() > 0 AND EXISTS (SELECT 1 FROM dsp_assignment WHERE order_id = ?3 AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL AND party_id = ?2)`,
);
/** RESET (Toàn quyền đặt lại): ?1 id, ?2 hồ sơ, ?3 lúc, ?4 người ghi. */
const CHEN_RESET = defineSql("dispatch", "chen_reset", `INSERT INTO dsp_release_event (${COT}) VALUES (?1, ${SEQ_MOI}, ?2, NULL, 'RESET', NULL, ?3, ?3, ?4, ?3, ?4)`);

/** Bảng số lần của văn phòng (ADR điều 8): ?1 mảng JSON hồ sơ, ?2 đầu tuần. Huỷ tuần này KHÔNG bị RESET cắt (G5 — RESET chỉ thuộc hạn mức). */
const DEM_THEO_NGUOI = defineSql(
  "dispatch",
  "dem_theo_nguoi",
  `SELECT j.value AS party_id, ${chuoi("j.value", "''")} AS chuoi, ${tuan("j.value", "?2")} AS tuan,
     (SELECT count(*) FROM dsp_release_event a WHERE a.party_id = j.value AND a.kind_code = 'ABORT' AND a.occurred_at >= ?2) AS huy_tuan,
     (SELECT l.occurred_at FROM dsp_release_event l WHERE l.party_id = j.value AND l.kind_code = 'REFUSE' ORDER BY l.seq DESC LIMIT 1) AS cuoi_luc,
     (SELECT l.reason_code FROM dsp_release_event l WHERE l.party_id = j.value AND l.kind_code = 'REFUSE' ORDER BY l.seq DESC LIMIT 1) AS cuoi_ly_do
   FROM json_each(?1) j`,
);

/** Bảng chọn người (ADR điều 10): các lần Từ chối CHÍNH đơn ?1, mới nhất trước. Nguồn là sổ sự kiện — KHÔNG nhật ký (ADR-0131 giữ nguyên). */
const TU_CHOI_CUA_DON = defineSql(
  "dispatch",
  "tu_choi_cua_don",
  `SELECT party_id, occurred_at, reason_code FROM dsp_release_event WHERE order_id = ?1 AND kind_code = 'REFUSE' ORDER BY seq DESC`,
);

const CAI_DAT_HIEN_HANH = defineSql(
  "dispatch",
  "cai_dat_han_muc_hien_hanh",
  `SELECT mode, max_consecutive AS mc, max_per_week AS mw, valid_from_at FROM dsp_refuse_policy WHERE valid_from_at <= ?1 ORDER BY valid_from_at DESC LIMIT 1`,
);
const CAI_DAT_MOI_NHAT = defineSql("dispatch", "cai_dat_han_muc_moi_nhat", `SELECT max(valid_from_at) AS moc FROM dsp_refuse_policy`);
const CHEN_CAI_DAT = defineSql(
  "dispatch",
  "chen_cai_dat_han_muc",
  `INSERT INTO dsp_refuse_policy (id, mode, max_consecutive, max_per_week, valid_from_at, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?6, ?7)`,
);

// ---- Hàm ----------------------------------------------------------------------------------------------------------------------------------------------

interface DongCaiDat {
  mode: CheDo;
  mc: number;
  mw: number;
}
const thanhCaiDat = (r: DongCaiDat): CaiDatHanMuc => ({ cheDo: r.mode, lienTiep: r.mc, moiTuan: r.mw });

/** Đếm + cài đặt hiện hành cho người P đang Từ chối đơn X (X null = không loại đơn nào). null ⇔ chưa có dòng cài đặt nào hiệu lực. */
export async function demTuChoiCua(
  db: D1Database,
  p: { partyId: string; orderId: string | null; dauTuan: string; luc: string },
): Promise<{ cs: CaiDatHanMuc; dem: { chuoi: number; tuan: number } } | null> {
  const r = await db.prepare(DEM_TU_CHOI).bind(p.partyId, p.orderId ?? "", p.dauTuan, p.luc).first<DongCaiDat & { chuoi: number; tuan: number }>();
  return r ? { cs: thanhCaiDat(r), dem: { chuoi: r.chuoi, tuan: r.tuan } } : null;
}

export interface ThamSoTuChoi {
  id: string;
  partyId: string;
  orderId: string;
  dauTuan: string;
  at: string;
  lyDo: string;
  actorId: string;
  biGioiHan: boolean;
}
export const chenTuChoiStatement = (db: D1Database, t: ThamSoTuChoi): D1PreparedStatement =>
  db.prepare(CHEN_TU_CHOI).bind(t.partyId, t.orderId, t.dauTuan, t.at, t.id, t.lyDo, t.actorId, t.biGioiHan ? 1 : 0);

/** Sự kiện CLAIM/ASSIGN sau câu nhật ký `changes() > 0` của lô Nhận / Giao / lập đơn. */
export const chenSuKienSauStatement = (
  db: D1Database,
  e: { id: string; partyId: string; orderId: string; loai: Extract<LoaiSuKien, "CLAIM" | "ASSIGN">; at: string; actorId: string },
): D1PreparedStatement => db.prepare(CHEN_SU_KIEN_SAU).bind(e.id, e.partyId, e.orderId, e.loai, e.at, e.actorId);

export const chenAbortSauStatement = (db: D1Database, e: { id: string; partyId: string; orderId: string; at: string; actorId: string }): D1PreparedStatement =>
  db.prepare(CHEN_ABORT_SAU).bind(e.id, e.partyId, e.orderId, e.at, e.actorId);

export const chenResetStatement = (db: D1Database, e: { id: string; partyId: string; at: string; actorId: string }): D1PreparedStatement =>
  db.prepare(CHEN_RESET).bind(e.id, e.partyId, e.at, e.actorId);

export interface DemNguoi {
  party_id: string;
  chuoi: number;
  tuan: number;
  huy_tuan: number;
  cuoi_luc: string | null;
  cuoi_ly_do: string | null;
}
export async function demTheoNguoi(db: D1Database, partyIds: readonly string[], dauTuan: string): Promise<DemNguoi[]> {
  if (partyIds.length === 0) return [];
  return (await db.prepare(DEM_THEO_NGUOI).bind(JSON.stringify(partyIds), dauTuan).all<DemNguoi>()).results;
}

export async function tuChoiCuaDon(db: D1Database, orderId: string): Promise<{ party_id: string; occurred_at: string; reason_code: string }[]> {
  return (await db.prepare(TU_CHOI_CUA_DON).bind(orderId).all<{ party_id: string; occurred_at: string; reason_code: string }>()).results;
}

export async function caiDatHienHanh(db: D1Database, luc: string): Promise<(CaiDatHanMuc & { tuLuc: string }) | null> {
  const r = await db.prepare(CAI_DAT_HIEN_HANH).bind(luc).first<DongCaiDat & { valid_from_at: string }>();
  return r ? { ...thanhCaiDat(r), tuLuc: r.valid_from_at } : null;
}
export async function mocCaiDatMoiNhat(db: D1Database): Promise<string | null> {
  return (await db.prepare(CAI_DAT_MOI_NHAT).first<{ moc: string | null }>())?.moc ?? null;
}
export const chenCaiDatStatement = (db: D1Database, c: { id: string; cs: CaiDatHanMuc; tuLuc: string; at: string; actorId: string }): D1PreparedStatement =>
  db.prepare(CHEN_CAI_DAT).bind(c.id, c.cs.cheDo, c.cs.lienTiep, c.cs.moiTuan, c.tuLuc, c.at, c.actorId);

const chu = (v: string): string => `'${v.replaceAll("'", "''")}'`;
/**
 * ADR-0032 «Sửa đổi 2026-10-24 — điều 5» (chủ chọn (A)): ĐIỀU KIỆN của câu nhật ký `refuse_limit_hit` thua đua — câu CUỐI của chính lô Từ chối: lần Từ chối
 * này (`refuseId` = id câu chèn đầu lô) KHÔNG được ghi VÀ người gọi VẪN đang có dòng phụ trách mở của đơn. Hai vế cùng đúng ⇔ câu đầu bị chặn vì hạn mức
 * (cài đặt luôn có — dòng gieo + trigger cấm xoá; người đã bị đổi thì vế hai sai ⇒ không nhật ký, route trả `stale`). Đưa vào `auditStatement(…, onlyIf)`
 * như khuôn `EXISTS (…)` của feedback / thongbao: giá trị là mã do máy chủ sinh / đã kiểm dạng, vẫn thoát dấu nháy.
 */
export const dieuKienVuotLucGhi = (refuseId: string, orderId: string, partyId: string): string =>
  `NOT EXISTS (SELECT 1 FROM dsp_release_event WHERE id = ${chu(refuseId)})
   AND EXISTS (SELECT 1 FROM dsp_assignment WHERE order_id = ${chu(orderId)} AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL AND party_id = ${chu(partyId)})`;
