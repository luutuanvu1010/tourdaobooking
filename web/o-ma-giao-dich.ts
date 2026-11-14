// Ô "Mã giao dịch ngân hàng" + "Số tiền thực chuyển" dùng chung (ADR-0092 Đ6; kiểm toán 14/11: cả hộp «Xác nhận khoản nộp» của đại lý). Tách khỏi order.ts để web/khoan-nop-ui.ts dùng lại
// MỘT bản — không chép tay, không import vòng (order.ts nhập khoan-nop-ui.ts).
import { ApiError } from "./api";
import { h } from "./dom";
import { parseMoney } from "./format";
import { regroupMoney, setMoneyValue } from "./money-input";

/**
 * Ô "Mã giao dịch ngân hàng" + "Số tiền thực chuyển" (ADR-0092 Đ6) — chỉ dựng cho Kế toán / Toàn quyền; máy chủ quyết khi nào bắt buộc (trống cả hai ⇒ gửi
 * không mã, máy chủ trả câu nếu cần). Lỗi 409 "số thực chuyển lệch" mang số đã ghi của mã (`error.soThucChuyen`) ⇒ điền sẵn để Kế toán đối chiếu sao kê rồi
 * bấm lại — không có route tra mã (trang ghép §0).
 */
export function oMaGiaoDich(macDinh?: { ma?: string; soThucChuyen?: number }): {
  o: HTMLElement[];
  hien: (co: boolean) => void;
  doc: () => { maGiaoDich: string; soThucChuyen: number } | { loi: string } | null;
  tuLoi: (err: unknown) => void;
} {
  const ma = h("input", { type: "text", autocomplete: "off", maxlength: "60", placeholder: "Như in trên sao kê", value: macDinh?.ma ?? "" }) as HTMLInputElement;
  const so = h("input", { type: "text", inputmode: "numeric", autocomplete: "off", placeholder: "Như in trên sao kê" }) as HTMLInputElement;
  if (macDinh?.soThucChuyen) setMoneyValue(so, macDinh.soThucChuyen);
  so.addEventListener("input", () => regroupMoney(so));
  const o = [h("label", { "data-o": "ma-giao-dich" }, "Mã giao dịch ngân hàng", ma), h("label", { "data-o": "so-thuc-chuyen" }, "Số tiền thực chuyển (₫)", so)];
  let dangHien = true;
  return {
    o,
    hien: (co) => {
      dangHien = co;
      for (const x of o) x.hidden = !co;
    },
    doc: () => {
      if (!dangHien) return null;
      const coMa = ma.value.trim() !== "";
      const soN = parseMoney(so.value);
      if (!coMa && soN <= 0) return null;
      if (!coMa || soN <= 0) return { loi: "Nhập đủ cả mã giao dịch ngân hàng và số tiền thực chuyển theo sao kê." };
      return { maGiaoDich: ma.value.trim(), soThucChuyen: soN };
    },
    tuLoi: (err) => {
      if (!(err instanceof ApiError) || err.code !== "bank_txn_amount_mismatch") return;
      const a = (err.details as { soThucChuyen?: unknown } | undefined)?.soThucChuyen;
      if (typeof a === "number") setMoneyValue(so, a);
    },
  };
}
