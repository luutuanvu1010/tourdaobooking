// Ô nhập tiền dùng chung của form: gõ tự nhóm hàng nghìn (1.350.000); giá trị thật lấy bằng parseMoney.
import { MAX_AMOUNT_VND } from "../src/shared/order-lines";
import { h } from "./dom";
import { grouped, parseMoney } from "./format";

export interface MoneyInputOptions {
  value: number;
  /** Nhãn cho trình đọc màn hình (ô không có <label> nhìn thấy được, vd ô đơn giá trong dòng tiền). */
  label: string;
  onChange: (n: number) => void;
  id?: string;
  className?: string;
}

export function moneyInput(o: MoneyInputOptions): HTMLInputElement {
  const el = h("input", { type: "text", inputMode: "numeric", autocomplete: "off", "aria-label": o.label, id: o.id ?? null, class: o.className ?? "money" });
  setMoneyValue(el, o.value);
  el.addEventListener("input", () => o.onChange(regroupMoney(el)));
  return el;
}

/** Vị trí con trỏ ngay sau `digits` chữ số (bỏ qua dấu chấm nhóm). */
function caretAfterDigits(text: string, digits: number): number {
  if (digits <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) if (/\d/.test(text[i]!) && ++seen === digits) return i + 1;
  return text.length;
}

/** Gõ tự nhóm hàng nghìn: viết lại giá trị đã nhóm, GIỮ con trỏ ở đúng chữ số (gõ/sửa giữa số không nhảy về cuối); trả số tiền. Ô rỗng giữ rỗng. */
export function regroupMoney(el: HTMLInputElement): number {
  const n = Math.min(parseMoney(el.value), MAX_AMOUNT_VND); // ô hiện đúng số đã bị kẹp ở bản nháp (trần 100 tỷ), không lệch
  const digitsBefore = (el.value.slice(0, el.selectionStart ?? el.value.length).match(/\d/g) ?? []).length;
  el.value = el.value.trim() === "" ? "" : grouped(n);
  if (document.activeElement === el) {
    const at = caretAfterDigits(el.value, digitsBefore);
    el.setSelectionRange(at, at);
  }
  return n;
}

/** Ghi giá trị KHÔNG bắn sự kiện. Giá 0 vẫn hiện "0" (em bé miễn phí là giá hợp lệ) trừ khi `zeroAsBlank`. */
export function setMoneyValue(el: HTMLInputElement, n: number, zeroAsBlank = false): void {
  el.value = n === 0 && zeroAsBlank ? "" : grouped(n);
}
