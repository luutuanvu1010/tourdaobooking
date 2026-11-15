// Soát dòng tiền «tự ghi đơn mình lập» (ADR-0187 Đ3 mức (a)): danh sách cho Sổ công nợ, số cho Trang chủ, lệnh «Đã soát» — điều phối có I/O.
// Route (index.ts) hỏi quyền TRƯỚC (ledger.view để xem, ledger.write để soát; không Đối tác) rồi mới gọi. Luật «người soát khác người ghi» kiểm ở đây (403) VÀ ở trigger 0150.
import { auditStatement } from "../audit";
import { AUDIT_ACTIONS, isAuditAction } from "../../shared/audit-actions";
import type { TuGhiDongDto, TuGhiListResponse } from "../../shared/contracts";
import { error } from "../../shared/http";
import { CAU_DA_SOAT_ROI, CAU_TU_SOAT, MA_TU_SOAT, NGAY_GIU_DA_SOAT, tuGhiDonMinhLap } from "../../shared/tach-nhiem-vu";
import type { KetQua, NguoiGoi } from "./service";
import { chenSoatStatement, danhSachTuGhiRows, demChuaSoat, dongTuGhi, type TuGhiRow } from "./tu-ghi-repo";

const nhanHanhDong = (a: string): string => (isAuditAction(a) ? AUDIT_ACTIONS[a].label : a);

const toDto = (r: TuGhiRow): TuGhiDongDto => ({
  auditId: r.id, orderId: r.order_id, maDon: r.ma_don, nguoiGhiId: r.staff_id, nguoiGhi: r.nguoi_ghi ?? "—", hanhDong: nhanHanhDong(r.action), luc: r.created_at,
  nguoiSoat: r.nguoi_soat, soatLuc: r.soat_luc,
});

export async function danhSachTuGhi(db: D1Database, now = new Date()): Promise<TuGhiListResponse> {
  const moc = new Date(now.getTime() - NGAY_GIU_DA_SOAT * 86_400_000).toISOString();
  const rows = await danhSachTuGhiRows(db, moc);
  return { dong: rows.map(toDto), soChuaSoat: rows.filter((r) => r.soat_boi === null).length };
}

export const soChuaSoat = (db: D1Database): Promise<number> => demChuaSoat(db);

const KHONG_THAY = () => error(404, "not_found", "Không tìm thấy dòng tiền cần soát này.");
const TU_SOAT = () => error(403, MA_TU_SOAT, CAU_TU_SOAT);
const DA_SOAT = () => error(409, "da_soat", CAU_DA_SOAT_ROI);

/**
 * «Đã soát»: người gọi (có ô ledger.write, không Đối tác — route kiểm) xác nhận đã xem một dòng tiền do chính người lập đơn ghi. Thứ tự: đọc dòng → không có / không dấu ⇒ 404 →
 * chính người ghi ⇒ 403 `tu_soat` (so bằng cùng luật thuần `tuGhiDonMinhLap`) → đã soát ⇒ 409 → MỘT lô: dòng soát (trigger kiểm lại) + nhật ký `ledger_self_write_reviewed` (`changes() > 0`).
 * Đua (hai người soát cùng lúc): khoá chính / trigger làm lô hỏng ⇒ đọc lại để trả 409 hoặc 403.
 */
export async function soatTuGhi(db: D1Database, i: { auditId: string; ai: NguoiGoi }): Promise<KetQua<{ orderId: string | null }>> {
  const r = await dongTuGhi(db, i.auditId);
  if (!r) return { ok: false, res: KHONG_THAY() };
  if (tuGhiDonMinhLap(r.staff_id, i.ai.staffId)) return { ok: false, res: TU_SOAT() };
  if (r.soat_boi !== null) return { ok: false, res: DA_SOAT() };
  const at = new Date().toISOString();
  try {
    await db.batch([
      chenSoatStatement(db, { auditId: r.id, orderId: r.order_id, by: i.ai.staffId, at }),
      auditStatement(db, { orderId: r.order_id ?? undefined, staffId: i.ai.staffId, action: "ledger_self_write_reviewed", at, targetType: "ledger", targetId: r.id, detail: nhanHanhDong(r.action) }, "changes() > 0"),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/bil_soat_tu_ghi_khac_nguoi/.test(msg)) return { ok: false, res: TU_SOAT() };
    if (/UNIQUE|PRIMARY KEY/i.test(msg)) return { ok: false, res: DA_SOAT() };
    throw e;
  }
  return { ok: true, value: { orderId: r.order_id } };
}
