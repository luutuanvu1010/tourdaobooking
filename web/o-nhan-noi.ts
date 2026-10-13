// Ô có NHÃN NỔI (bảng việc 13/10, #4 — chủ muốn "ẩn nhãn, dùng chữ mờ trong ô" ở màn Tạo đơn): nhãn nằm TRONG khung ô, thành một dòng chữ nhỏ phía trên giá trị; ô gõ còn trống và chưa
// focus thì nhãn nằm giữa ô như chữ mờ (cỡ ô gõ); ô đã có giá trị / đang gõ thì nhãn thu nhỏ lên trên (CSS `.o-noi*` trong public/app.css, dùng `:placeholder-shown`).
// Vì sao không dùng chữ mờ (placeholder) thuần: ô ngày / giờ trên iPhone luôn hiện `dd/mm/yyyy` / `--:--` của máy nên không đặt được chữ mờ của mình, và ô đã có giá trị (Sửa đơn)
// thì chữ mờ biến mất — nhãn nổi vẫn còn nên người dùng luôn biết ô này là gì. Ô ngày / giờ / ô chọn một luôn ở trạng thái "đã thu nhỏ" (class `o-noi-co-dinh`).
// Giữ `<label>` thật bao ô (tên cho trình đọc màn hình, bấm nhãn là focus ô). Dùng ở form Tạo/sửa đơn; các bảng trượt ở trang đơn giữ nhãn như cũ (opt-in).
import { h } from "./dom";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type Con = Node | string | null | false | undefined;

/** Ô luôn ở trạng thái nhãn thu nhỏ (máy tự vẽ chữ trong ô, hoặc ô chọn một có sẵn giá trị). */
function coDinh(c: Control): boolean {
  return c instanceof HTMLSelectElement || (c instanceof HTMLInputElement && ["date", "time", "month", "datetime-local"].includes(c.type));
}

/**
 * Bọc `control` thành khung nhãn nổi: `<span class="o-noi-khung">control + <span class="o-noi-chu">nhan</span></span>`. Nhãn đứng SAU ô (CSS dùng `~`). `khungClass` thêm class cho khung
 * (vd `dd-gio`, `dd-hau-to-khung`); `giua` là phần tử chen giữa ô và nhãn (vd chữ mờ "Chưa chốt giờ", hậu tố "chỗ"). Ô gõ không có chữ mờ riêng được đặt `placeholder=" "` để `:placeholder-shown` đúng.
 */
export function khungNhanNoi(nhan: string, control: Control, o: { khungClass?: string; giua?: Con[] } = {}): HTMLElement {
  if ((control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) && !coDinh(control) && control.getAttribute("placeholder") === null) control.setAttribute("placeholder", " ");
  const chu = h("span", { class: "o-noi-chu" }, nhan);
  const co = coDinh(control);
  // Ô luôn thu nhỏ: nhãn đứng TRƯỚC ô trong cây DOM — chữ của `<label>` bắt đầu bằng tên ô (nếu để sau thì ô chọn một chen cả danh sách lựa chọn vào đầu chữ của nhãn). Ô gõ: nhãn SAU ô vì CSS đổi kiểu theo trạng thái của ô (`~`).
  return h("span", { class: `o-noi-khung${co ? " o-noi-co-dinh" : ""}${o.khungClass ? ` ${o.khungClass}` : ""}` }, ...(co ? [chu, control, ...(o.giua ?? [])] : [control, ...(o.giua ?? []), chu]));
}

/** `<label class="o-noi">` bao khung nhãn nổi và (ngoài khung) các dòng phụ — gợi ý, lỗi — như nhãn cũ vẫn bao chúng. */
export function oNhanNoi(nhan: string, control: Control, o: { khungClass?: string; giua?: Con[]; labelClass?: string; phu?: Con[] } = {}): HTMLElement {
  return h("label", { class: `o-noi${o.labelClass ? ` ${o.labelClass}` : ""}` }, khungNhanNoi(nhan, control, o), ...(o.phu ?? []));
}
