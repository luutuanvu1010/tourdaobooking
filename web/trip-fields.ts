// Tám ô thông tin chuyến của MỘT dịch vụ (đặc tả 5.1/5.3): dùng ở thẻ dịch vụ của form và ở bảng "Sửa thông tin chuyến" của trang đơn.
import type { TripInput } from "../src/shared/contracts";
import { h } from "./dom";

export interface TripFields {
  root: HTMLElement;
  /** Đặt giá trị các ô theo `trip` (bỏ qua ô đang có focus); KHÔNG bắn onChange. */
  sync(trip: TripInput): void;
}

export function tripFields(o: { trip: TripInput; onChange: (next: TripInput) => void; dateLabel?: string }): TripFields {
  let trip = o.trip;
  const inputs = new Map<keyof TripInput, HTMLInputElement | HTMLTextAreaElement>();
  const change = (k: keyof TripInput, value: string) => {
    trip = { ...trip, [k]: value };
    o.onChange(trip);
  };
  const field = (k: keyof TripInput, type: "date" | "time" | "text", label: string, opts: { wide?: boolean; hint?: string } = {}): HTMLElement => {
    const el = h("input", { type, value: trip[k], autocomplete: "off", maxLength: type === "text" ? 200 : null, "data-trip": k });
    inputs.set(k, el);
    el.addEventListener("input", () => change(k, el.value));
    return h("label", { class: opts.wide ? "span-2" : "" }, label, el, opts.hint ? h("span", { class: "hint" }, opts.hint) : null);
  };
  const note = h("textarea", { maxLength: 1000, value: trip.note, "data-trip": "note" });
  inputs.set("note", note);
  note.addEventListener("input", () => change("note", note.value));

  const root = h(
    "div",
    { class: "trip-body" },
    h("p", { class: "trip-group" }, "Khởi hành"),
    field("departDate", "date", o.dateLabel ?? "Ngày khởi hành"),
    field("departTime", "time", "Giờ khởi hành"),
    h("p", { class: "trip-group" }, "Đón khách"),
    field("pickupTime", "time", "Giờ đón"),
    h("span", null),
    field("pickupPlace", "text", "Điểm đón", { wide: true }),
    h("p", { class: "trip-group" }, "Check-in"),
    field("checkinDate", "date", "Ngày check-in", { hint: "Để trống = cùng ngày khởi hành." }),
    field("checkinTime", "time", "Giờ check-in"),
    field("checkinPlace", "text", "Nơi check-in", { wide: true }),
    h("label", { class: "span-2" }, "Ghi chú dịch vụ", note),
  );

  return {
    root,
    sync(next) {
      trip = next;
      for (const [k, el] of inputs) if (document.activeElement !== el && el.value !== next[k]) el.value = next[k];
    },
  };
}
