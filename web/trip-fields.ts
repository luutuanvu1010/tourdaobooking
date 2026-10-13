// Các ô thông tin chuyến của MỘT dịch vụ (khởi hành, khách có mặt, ghi chú) (đặc tả 5.1/5.3): dùng ở thẻ dịch vụ của form và ở bảng "Sửa thông tin chuyến" của trang đơn.
import type { TripInput } from "../src/shared/contracts";
import { canHienNgayCoMat } from "../src/shared/trip-form";
import { h } from "./dom";
import { khungNhanNoi } from "./o-nhan-noi";

export interface TripFields {
  root: HTMLElement;
  /** Đặt giá trị các ô theo `trip` (bỏ qua ô đang có focus); KHÔNG bắn onChange. */
  sync(trip: TripInput): void;
}

/**
 * `noDepartDate`: form Tạo/sửa đơn — ngày khởi hành chọn MỘT lần cho cả đơn ở đầu trang (ADR-0021), không có ô riêng từng dịch vụ.
 * `nhanNoi` (đợt 1, bảng việc 13/10 #4): nhãn nằm TRONG khung ô (xem `web/o-nhan-noi.ts`) và bỏ tiêu đề nhóm "Khởi hành" (nhãn từng ô đã nói đủ; nhóm "Khách có mặt" vẫn có tiêu đề vì chữ này chưa quen); mặc định tắt — bảng
 * "Sửa thông tin chuyến" của trang đơn giữ nhãn phía trên ô như cũ.
 */
export function tripFields(o: { trip: TripInput; onChange: (next: TripInput) => void; dateLabel?: string; noDepartDate?: boolean; nhanNoi?: boolean }): TripFields {
  let trip = o.trip;
  const inputs = new Map<keyof TripInput, HTMLInputElement | HTMLTextAreaElement>();
  const change = (k: keyof TripInput, value: string) => {
    trip = { ...trip, [k]: value };
    o.onChange(trip);
  };
  const field = (k: keyof TripInput, type: "date" | "time" | "text", label: string, opts: { wide?: boolean; hint?: string; goiY?: string } = {}): HTMLElement => {
    const el = h("input", { type, value: trip[k], autocomplete: "off", maxLength: type === "text" ? 200 : null, placeholder: opts.goiY ?? null, "data-trip": k });
    inputs.set(k, el);
    el.addEventListener("input", () => change(k, el.value));
    const hint = opts.hint ? h("span", { class: "hint" }, opts.hint) : null;
    if (o.nhanNoi) return h("label", { class: `o-noi${opts.wide ? " span-2" : ""}` }, khungNhanNoi(label, el), hint);
    return h("label", { class: opts.wide ? "span-2" : "" }, label, el, hint);
  };
  // Ngày khách có mặt (cột `checkin_date`): mặc định ẩn (trống = cùng ngày khởi hành); hiện khi đã có giá trị, hoặc khi người dùng bấm lối nhỏ "Có mặt khác ngày" (và giữ hiện suốt lúc sửa).
  let moNgay = false;
  const ngayEl = field("checkinDate", "date", "Ngày khách có mặt", { hint: "Để trống = cùng ngày khởi hành." });
  const nutKhacNgay = h("button", { type: "button", class: "btn btn-link dd-khac-ngay span-2", "data-action": "co-mat-khac-ngay" }, "Có mặt khác ngày");
  const capNhatNgay = () => {
    const hien = canHienNgayCoMat(trip.checkinDate) || moNgay;
    ngayEl.hidden = !hien;
    nutKhacNgay.hidden = hien;
  };
  inputs.get("checkinDate")!.addEventListener("input", () => {
    moNgay = true; // đang sửa ô này thì ô không tự ẩn giữa chừng (vd xoá ngày rồi gõ lại)
    capNhatNgay();
  });
  nutKhacNgay.addEventListener("click", () => {
    moNgay = true;
    capNhatNgay();
    inputs.get("checkinDate")!.focus();
  });
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
    h("p", { class: "trip-group" }, "Khách có mặt"),
    ngayEl,
    field("checkinTime", "time", "Có mặt lúc"),
    field("checkinPlace", "text", "Có mặt tại", { wide: true, goiY: "Ví dụ: Cảng Vinpearl" }),
    nutKhacNgay,
    noteLabel,
  );
  capNhatNgay();

  return {
    root,
    sync(next) {
      trip = next;
      capNhatNgay();
      for (const [k, el] of inputs) if (document.activeElement !== el && el.value !== next[k]) el.value = next[k];
    },
  };
}
