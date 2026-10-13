// Các ô thông tin chuyến của MỘT dịch vụ (khởi hành, check-in, ghi chú) (đặc tả 5.1/5.3): dùng ở thẻ dịch vụ của form và ở bảng "Sửa thông tin chuyến" của trang đơn.
import type { TripInput } from "../src/shared/contracts";
import { h } from "./dom";
import { khungNhanNoi } from "./o-nhan-noi";

export interface TripFields {
  root: HTMLElement;
  /** Đặt giá trị các ô theo `trip` (bỏ qua ô đang có focus); KHÔNG bắn onChange. */
  sync(trip: TripInput): void;
}

/**
 * `noDepartDate`: form Tạo/sửa đơn — ngày khởi hành chọn MỘT lần cho cả đơn ở đầu trang (ADR-0021), không có ô riêng từng dịch vụ.
 * `nhanNoi` (đợt 1, bảng việc 13/10 #4): nhãn nằm TRONG khung ô (xem `web/o-nhan-noi.ts`) và bỏ hai tiêu đề nhóm "Khởi hành" / "Check-in" (nhãn từng ô đã nói đủ); mặc định tắt — bảng
 * "Sửa thông tin chuyến" của trang đơn giữ nhãn phía trên ô như cũ.
 */
export function tripFields(o: { trip: TripInput; onChange: (next: TripInput) => void; dateLabel?: string; noDepartDate?: boolean; nhanNoi?: boolean }): TripFields {
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
    const hint = opts.hint ? h("span", { class: "hint" }, opts.hint) : null;
    if (o.nhanNoi) return h("label", { class: `o-noi${opts.wide ? " span-2" : ""}` }, khungNhanNoi(label, el), hint);
    return h("label", { class: opts.wide ? "span-2" : "" }, label, el, hint);
  };
  const note = h("textarea", { maxLength: 1000, value: trip.note, "data-trip": "note" });
  inputs.set("note", note);
  note.addEventListener("input", () => change("note", note.value));
  const noteLabel = o.nhanNoi ? h("label", { class: "o-noi span-2" }, khungNhanNoi("Ghi chú dịch vụ", note)) : h("label", { class: "span-2" }, "Ghi chú dịch vụ", note);

  const root = h(
    "div",
    { class: "trip-body" },
    !o.nhanNoi && h("p", { class: "trip-group" }, "Khởi hành"),
    !o.noDepartDate && field("departDate", "date", o.dateLabel ?? "Ngày khởi hành"),
    field("departTime", "time", "Giờ khởi hành"),
    // ADR-0047 Phần B (bản vẽ M1, M4; D4): "Giờ đón / Điểm đón" bỏ khỏi đây — giờ, nơi đón / trả nay ở khối "Đưa đón" (từng chặng).
    !o.nhanNoi && h("p", { class: "trip-group" }, "Check-in"),
    field("checkinDate", "date", "Ngày check-in", { hint: "Để trống = cùng ngày khởi hành." }),
    field("checkinTime", "time", "Giờ check-in"),
    field("checkinPlace", "text", "Nơi check-in", { wide: true }),
    noteLabel,
  );

  return {
    root,
    sync(next) {
      trip = next;
      for (const [k, el] of inputs) if (document.activeElement !== el && el.value !== next[k]) el.value = next[k];
    },
  };
}
