// Phần tiền có nguồn là khoản khai (ADR-0159, I-5) — dùng chung cho `tienDonVe` (vé) và `noTheoDon` (nợ Trả sau, ADR-0168): MỘT bản, không viết hai.
import { GHI_CHU_KHOAN_LOI_KHAI, donCuaKhoan } from "./coc-repo";
import { receiptsOfOrder, type ReceiptDbRow } from "./repository";

export type PhanKhai = { receiptId: string; collectorPartyId: string | null; soTien: number };
/** Cột cần của một khoản thu để tìm phần khai — đủ cho cả đọc từng đơn và đọc nhiều đơn một lượt. */
export type KhoanDon = Pick<ReceiptDbRow, "id" | "kind_code" | "amount" | "collector_party_id" | "reverses_id" | "note" | "transfer_of_id">;

/**
 * Phần tiền có nguồn là khoản khai trên một đơn: khoản mang dấu, và khoản chuyển từ đơn huỷ (đi ngược `transfer_of_id`, kể cả chuyển nhiều lần): khoản «Chuyển từ đơn huỷ» không mang dấu,
 * nếu bỏ qua thì tiền vẫn ở tay đối tác mà vé đơn nhận mở (I-5). Tự quyết: đơn nguồn vừa có khoản khai vừa có khoản khác, sổ không nói phần chuyển lấy từ đâu ⇒ lấy từ khoản khai trước.
 * Cọc «Tôi thu» thuần tuý chuyển sang tính 0. Không đọc được đơn nguồn, hoặc gặp vòng: coi cả khoản là khoản khai.
 */
export async function phanKhaiCuaDon(db: D1Database, receipts: readonly KhoanDon[], daQua: ReadonlySet<string>): Promise<PhanKhai[]> {
  const out: PhanKhai[] = [];
  for (const r of receipts) {
    if (r.reverses_id !== null || receipts.some((y) => y.reverses_id === r.id)) continue;
    if (r.kind_code === "CUSTOMER_PAYMENT" && r.note === GHI_CHU_KHOAN_LOI_KHAI) {
      out.push({ receiptId: r.id, collectorPartyId: r.collector_party_id, soTien: r.amount });
    } else if (r.transfer_of_id !== null) {
      const nguon = await donCuaKhoan(db, r.transfer_of_id);
      let tuKhai = r.amount;
      if (nguon !== null && !daQua.has(nguon)) {
        const phan = await phanKhaiCuaDon(db, await receiptsOfOrder(db, nguon), new Set([...daQua, nguon]));
        tuKhai = Math.min(r.amount, phan.reduce((s, p) => s + p.soTien, 0));
      }
      if (tuKhai > 0) out.push({ receiptId: r.id, collectorPartyId: r.collector_party_id, soTien: tuKhai });
    }
  }
  return out;
}

