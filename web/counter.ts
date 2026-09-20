// Bộ đếm − / ô số / + (đặc tả 5.1): nút 44px, − vô hiệu ở 0, ô số gõ trực tiếp được (inputmode numeric, 16px để iOS không phóng to).
import { h } from "./dom";

export interface Counter {
  root: HTMLElement;
  input: HTMLInputElement;
  /** Ghi giá trị mà KHÔNG bắn onChange (khi thẻ được cập nhật từ bên ngoài). */
  set(n: number): void;
  setDisabled(disabled: boolean): void;
  /** Viền đỏ (vd vượt 50 khách). */
  setInvalid(invalid: boolean): void;
}

export function counter(o: { label: string; value: number; onChange: (n: number) => void }): Counter {
  const minus = h("button", { type: "button", class: "counter-btn", "aria-label": `Giảm ${o.label}` }, "−");
  const plus = h("button", { type: "button", class: "counter-btn", "aria-label": `Tăng ${o.label}` }, "+");
  const input = h("input", { type: "text", class: "counter-field", inputMode: "numeric", autocomplete: "off", "aria-label": o.label });
  const root = h("div", { class: "counter" }, minus, input, plus);
  let value = 0;

  const paint = (n: number) => {
    value = n;
    minus.disabled = input.disabled || n <= 0;
  };
  const set = (n: number) => {
    input.value = String(n);
    paint(n);
  };
  const change = (n: number) => {
    const v = Math.max(0, Math.trunc(n));
    set(v);
    o.onChange(v);
  };
  minus.addEventListener("click", () => change(value - 1));
  plus.addEventListener("click", () => change(value + 1));
  input.addEventListener("input", () => {
    const digits = input.value.replace(/\D/g, "");
    if (input.value !== digits) input.value = digits; // chỉ chữ số; không đặt lại giá trị khi đang gõ (giữ con trỏ)
    const n = digits === "" ? 0 : Number(digits);
    paint(n);
    o.onChange(n);
  });
  input.addEventListener("blur", () => set(value)); // "07" → "7", "" → "0"
  set(o.value);

  return {
    root,
    input,
    set,
    setDisabled(disabled) {
      input.disabled = disabled;
      plus.disabled = disabled;
      minus.disabled = disabled || value <= 0;
    },
    setInvalid(invalid) {
      root.classList.toggle("invalid", invalid);
    },
  };
}
