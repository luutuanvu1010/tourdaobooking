// Dấu "đã nhập phần mềm kế toán" + "Số hoá đơn đã nhập" (ADR-0060) — điều phối nhiều bước có I/O (đọc → luật thuần src/shared/nhap-ke-toan.ts → MỘT
// db.batch: dòng chỉ-thêm có lính gác + nhật ký cùng lô `changes() > 0`). Route (index.ts) hỏi quyền TRƯỚC rồi mới gọi. Không SQL thô (module nghiêm).
// Cờ NỘI BỘ của Kế toán: KHÔNG thay, không tạo, không chuyển trạng thái luồng "yêu cầu xuất hoá đơn" ADR-0004 (ADR-0060 điều 6).
import { auditStatement } from "../audit";
import type { NhapKeToanDongDto, NhapKeToanResponse } from "../../shared/contracts";
import { error } from "../../shared/http";
import { lenhKhongDoi, moTaDauNhap, type NhapKeToanLenh } from "../../shared/nhap-ke-toan";
import { accountingEntriesOfOrder, accountingEntryInsertStatement, orderOwners, orderState, type AccountingEntryDbRow } from "./repository";

const toDto = (r: AccountingEntryDbRow): NhapKeToanDongDto => ({
  id: r.id, daNhap: r.entered === 1, soHoaDon: r.invoice_number, lyDo: r.reason, luc: r.created_at, nguoiBam: r.created_by_label,
});

/** Chủ đơn + trạng thái (qua view công bố của orders) — null = không có đơn. */
export async function donChoNhapKeToan(db: D1Database, orderId: string): Promise<{ ownerId: string; status: "draft" | "confirmed" | "cancelled" } | null> {
  const [owners, st] = await Promise.all([orderOwners(db, [orderId]), orderState(db, orderId)]);
  const ownerId = owners.get(orderId);
  return ownerId && st ? { ownerId, status: st.status } : null;
}

/** Thân GET: trạng thái hiện tại; các dòng trước đó CHỈ khi `coTheGhi` (A-7 — người khác chỉ thấy trạng thái hiện tại). */
export async function docNhapKeToan(db: D1Database, orderId: string, o: { coTheGhi: boolean; status: string }): Promise<NhapKeToanResponse> {
  const rows = await accountingEntriesOfOrder(db, orderId);
  return {
    hienTai: rows[0] ? toDto(rows[0]) : null,
    truocDo: o.coTheGhi ? rows.slice(1).map(toDto) : null,
    coTheGhi: o.coTheGhi,
    donDaXacNhan: o.status === "confirmed",
  };
}

const STALE = () => error(409, "stale", "Dấu nhập phần mềm kế toán của đơn này vừa được người khác đổi. Tải lại đơn rồi thử lại.");
const CHUA_XAC_NHAN = () => error(409, "order_not_confirmed", "Chỉ đánh dấu đã nhập phần mềm kế toán khi đơn đã xác nhận.");

export type KetQuaGhi = { ok: true; doi: boolean } | { ok: false; res: Response };

/**
 * Ghi một lệnh đánh dấu / bỏ dấu. Thứ tự: đọc dòng hiện tại → `truocDo` lệch ⇒ 409 stale → trùng trạng thái ⇒ 200 không đổi (không thêm dòng) → đánh dấu mà
 * đơn chưa xác nhận ⇒ 409 → MỘT lô (dòng có lính gác + nhật ký `changes() > 0`) → không áp (đua) ⇒ đọc lại để chọn 409 stale / 409 chưa xác nhận.
 * Chạy được sau "Đã giao" và "Hoàn thành" (đơn vẫn `confirmed`) — route của billing, không thuộc danh sách khoá NT-F7.
 */
export async function ghiNhapKeToan(
  db: D1Database,
  i: { orderId: string; status: string; lenh: NhapKeToanLenh; staffId: string },
): Promise<KetQuaGhi> {
  const rows = await accountingEntriesOfOrder(db, i.orderId);
  const hienTai = rows[0] ?? null;
  if ((hienTai?.id ?? null) !== i.lenh.truocDo) return { ok: false, res: STALE() };
  if (lenhKhongDoi(hienTai ? { daNhap: hienTai.entered === 1, soHoaDon: hienTai.invoice_number } : null, i.lenh)) return { ok: true, doi: false };
  if (i.lenh.daNhap && i.status !== "confirmed") return { ok: false, res: CHUA_XAC_NHAN() };
  const at = new Date().toISOString();
  const kq = await db.batch([
    accountingEntryInsertStatement(db, {
      id: crypto.randomUUID(), orderId: i.orderId, entered: i.lenh.daNhap, invoiceNumber: i.lenh.soHoaDon, reason: i.lenh.lyDo, at, by: i.staffId,
      expectedCurrentId: i.lenh.truocDo,
    }),
    auditStatement(db, {
      orderId: i.orderId, staffId: i.staffId, action: i.lenh.daNhap ? "order_accounting_entry_marked" : "order_accounting_entry_unmarked", at, detail: moTaDauNhap(i.lenh),
    }, "changes() > 0"),
  ]);
  if ((kq[0]?.meta.changes ?? 0) > 0) return { ok: true, doi: true };
  const lai = await accountingEntriesOfOrder(db, i.orderId);
  if ((lai[0]?.id ?? null) !== i.lenh.truocDo) return { ok: false, res: STALE() };
  return { ok: false, res: CHUA_XAC_NHAN() };
}
