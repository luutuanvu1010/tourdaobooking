// Mã giao dịch ngân hàng của lần thu (ADR-0092 Đ6 + ADR-0108 đ4: T1, T2, T4, C1). Luật THUẦN, không I/O. Lớp CSDL: trigger của migration 0088 — cùng ba luật,
// cùng vị từ "còn hiệu lực" của `hieuLuc` (không phải dòng đảo, chưa bị đảo); bài so trigger ↔ hàm ở src/migrations-ma-giao-dich.test.ts.
import { dong } from "./rules.ts";

export const MA_GD_TOI_THIEU = 4;
export const MA_GD_TOI_DA = 40;
const MA_GD_RE = new RegExp(`^[A-Z0-9]{${MA_GD_TOI_THIEU},${MA_GD_TOI_DA}}$`);
/** Trần số tiền — cùng MAX_SO_TIEN của service.ts (10 tỷ đồng). */
const SO_TOI_DA = 10_000_000_000;

/**
 * Chuẩn hoá (đặc tả §5): NFKC (chữ số toàn khổ → ASCII), bỏ dấu cách, '-', '.', '/', đổi in hoa. Còn ký tự khác chữ Latinh không dấu / số, hoặc dài ngoài
 * 4–40 ⇒ null — KHÔNG lặng lẽ bỏ ký tự lạ (một mã gõ sai phải báo, không biến thành mã khác). Ô mã được MIỄN luật chặn dãy ≥ 8 chữ số.
 */
export function chuanHoaMaGiaoDich(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.normalize("NFKC").replace(/[\s./-]/g, "").toUpperCase();
  return MA_GD_RE.test(s) ? s : null;
}

export interface GiaoDich {
  ma: string;
  soThucChuyen: number;
}
const co = (v: unknown): boolean => v !== undefined && v !== null && v !== "";

/**
 * Đọc cặp (mã, số thực chuyển) của MỘT lần thu. `choPhep` = lần thu này nhận mã (CK – Công ty thu, người ghi có ledger.write — hoặc khoản đang xác nhận là
 * CK); `batBuoc` = C1 đòi mã. Không được phép mà vẫn gửi ⇒ lỗi (không im lặng bỏ).
 */
export function docGiaoDich(raw: { maGiaoDich?: unknown; soThucChuyen?: unknown }, o: { choPhep: boolean; batBuoc: boolean }): { ok: true; value: GiaoDich | null } | { ok: false; ma: string; cau: string } {
  const coMa = co(raw.maGiaoDich);
  const coSo = co(raw.soThucChuyen);
  if (!o.choPhep) {
    return coMa || coSo ? { ok: false, ma: "invalid_input", cau: "Mã giao dịch ngân hàng chỉ do Kế toán nhập, cho khoản chuyển khoản vào tài khoản công ty." } : { ok: true, value: null };
  }
  if (!coMa && !coSo) return o.batBuoc ? { ok: false, ma: "bank_txn_required", cau: "Nhập mã giao dịch ngân hàng và số tiền thực chuyển theo sao kê." } : { ok: true, value: null };
  const ma = chuanHoaMaGiaoDich(raw.maGiaoDich);
  if (!ma) return { ok: false, ma: "invalid_input", cau: `Mã giao dịch chỉ gồm chữ không dấu và số, ${MA_GD_TOI_THIEU}–${MA_GD_TOI_DA} ký tự.` };
  const so = raw.soThucChuyen;
  if (typeof so !== "number" || !Number.isInteger(so) || so <= 0 || so > SO_TOI_DA) {
    return { ok: false, ma: "invalid_input", cau: "Số tiền thực chuyển phải là số nguyên dương (đồng), đúng như sao kê." };
  }
  return { ok: true, value: { ma, soThucChuyen: so } };
}

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
