// Mã giao dịch ngân hàng của lần thu (ADR-0092 Đ6 + ADR-0108 đ4: T1, T2, T4, C1). Luật THUẦN, không I/O. Lớp CSDL: trigger của migration 0088 — cùng ba luật,
// cùng vị từ "còn hiệu lực" của `hieuLuc` (không phải dòng đảo, chưa bị đảo); bài so trigger ↔ hàm ở src/migrations-ma-giao-dich.test.ts.
import { dong } from "./rules.ts";

/** Một dòng nối CÒN HIỆU LỰC của cùng mã (mọi đơn): lần thu, đơn, số tiền lần thu, số thực chuyển ghi trên dòng nối. */
export interface DongMa {
  receiptId: string;
  orderId: string;
  soTien: number;
  soThucChuyen: number;
}
export type KiemMa =
  | { ok: true }
  | { ok: false; ma: "bank_txn_duplicate" | "bank_txn_amount_mismatch" | "bank_txn_over"; cau: string; soThucChuyen?: number };

/**
 * Ba luật chặn (đặc tả §5): trùng mã cùng đơn; số thực chuyển khác số đã ghi cho mã (T2); tổng các lần thu gắn mã vượt số thực chuyển. `daCo` = dòng nối còn
 * hiệu lực của cùng mã, ĐÃ loại các lần thu sắp bị thay (Thay lần thu) và ĐÃ gồm các gắn trước đó trong cùng lệnh.
 */
export function kiemMaGiaoDich(i: { soThucChuyen: number; soTien: number; orderId: string; daCo: readonly DongMa[] }): KiemMa {
  if (i.daCo.some((d) => d.orderId === i.orderId)) {
    return { ok: false, ma: "bank_txn_duplicate", cau: "Mã giao dịch này đã gắn với một lần thu khác của đơn này — một khoản chuyển không xác nhận hai lần cho cùng đơn." };
  }
  const a = i.daCo[0]?.soThucChuyen;
  if (a !== undefined && a !== i.soThucChuyen) {
    return {
      ok: false, ma: "bank_txn_amount_mismatch", soThucChuyen: a,
      cau: `Mã này đã ghi số tiền thực chuyển ${dong(a)} — nhập đúng số đó theo sao kê. Lần trước nhập nhầm thì sửa bằng “Đảo” (trước Đã giao) hoặc “Thay lần thu”.`,
    };
  }
  const tong = i.daCo.reduce((s, d) => s + d.soTien, 0) + i.soTien;
  if (tong > i.soThucChuyen) return { ok: false, ma: "bank_txn_over", cau: `Tổng các lần thu gắn mã này (${dong(tong)}) vượt số tiền thực chuyển ${dong(i.soThucChuyen)}.` };
  return { ok: true };
}
