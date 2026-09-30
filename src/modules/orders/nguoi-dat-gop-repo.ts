// TỆP SQL "NỬA NGHIÊM" thứ ba của module orders (ADR-0068 Đ1 bước 5, Đ6; hằng `NUA_NGHIEM` ở src/architecture.test.ts): đọc đơn theo người đặt và câu CHƯA CHẠY đổi
// người đặt khi gộp hồ sơ. CHỈ gốc lắp ráp (src/index.ts) gọi — qua ctx.gopHoSo của route gộp ở parties (parties không import orders). Mọi câu qua defineSql,
// đọc hồ sơ CHỈ qua view công bố v_pty_party_label. Import đuôi .ts, không import module khác.
import type { DonCuaNguoiDatTom } from "../../shared/router.ts";
import { defineSql } from "../../shared/sql-registry.ts";

/** Phần điều kiện tiền của trigger orders_money_update (0007) mà bề mặt mới được đọc: đơn thoả điều kiện này thì MỌI câu UPDATE lên nó bị CSDL từ chối.
 * Cố ý chép một PHẦN điều kiện của trigger: sửa một nơi thì sửa nơi kia. KHÔNG đọc ba cột cọc cũ (deposit_amount / deposit_method / remaining_amount) — bài NT-R9
 * (src/coc-cu-khong-doc.test.ts, ADR-0026 đ9) cấm; đơn lệch riêng ở ba cột đó không được báo trước, nhưng trigger vẫn huỷ cả lô gộp (không ghi dở). */
const LECH_TIEN = `(o.subtotal < 0 OR o.discount < 0 OR o.total IS NOT o.subtotal - o.discount)`;
const DON_CUA_NGUOI_DAT = defineSql(
  "orders",
  "don_cua_nguoi_dat",
  `SELECT o.order_code, o.status, o.delivered_at, ${LECH_TIEN} AS lech FROM orders o WHERE o.booker_party_id = ?1 ORDER BY o.order_code`,
);
// ?1 người đặt cũ (A), ?2 người đặt mới (B), ?3 mốc lô (ISO UTC). updated_at tăng NGHIÊM NGẶT (khuôn nextStamp của repository.ts): mốc lô nếu lớn hơn, không
// thì mốc cũ + 1 mili-giây. Lính gác: A còn đang dùng (lô thua cuộc đua gộp — A đã bị lật — thì không chạm đơn nào), B là cá nhân đang dùng.
const DOI_NGUOI_DAT = defineSql(
  "orders",
  "doi_nguoi_dat_gop",
  `UPDATE orders SET booker_party_id = ?2,
     updated_at = CASE WHEN ?3 > updated_at THEN ?3 ELSE strftime('%Y-%m-%dT%H:%M:%fZ', updated_at, '+0.001 seconds') END
   WHERE booker_party_id = ?1 AND status IN ('draft', 'confirmed') AND delivered_at IS NULL
     AND EXISTS (SELECT 1 FROM v_pty_party_label WHERE id = ?1 AND active = 1)
     AND EXISTS (SELECT 1 FROM v_pty_party_label WHERE id = ?2 AND active = 1 AND party_kind = 'PERSON')`,
);

// Kiểu DonCuaNguoiDatTom khai MỘT lần ở src/shared/router.ts (shared không được import module).
export async function donCuaNguoiDat(db: D1Database, partyId: string): Promise<DonCuaNguoiDatTom> {
  const { results } = await db.prepare(DON_CUA_NGUOI_DAT).bind(partyId).all<{ order_code: string; status: string; delivered_at: string | null; lech: number }>();
  const seDoi = results.filter((r) => r.status !== "cancelled" && r.delivered_at === null);
  return {
    doi: seDoi.length,
    giuDaGiao: results.filter((r) => r.delivered_at !== null).length,
    giuDaHuy: results.filter((r) => r.status === "cancelled").length,
    lechTien: seDoi.filter((r) => r.lech === 1).map((r) => r.order_code),
  };
}
export const cauDoiNguoiDat = (db: D1Database, tuPartyId: string, sangPartyId: string, at: string): D1PreparedStatement =>
  db.prepare(DOI_NGUOI_DAT).bind(tuPartyId, sangPartyId, at);
