// Khối GẬP của màn Tạo đơn bốn bước (14/10/2026; đặc tả docs/superpowers/specs/2026-10-14-tao-don-bon-buoc/README.md §2.4): một nút "+ Thêm chi tiết …" mở / đóng một khối chứa các ô ít dùng.
// LUẬT AN TOÀN (đây là chỗ dễ hỏng nhất — mất ô là mất dữ liệu): nội dung gập chỉ bị ẨN bằng `hidden`, VẪN nằm trong cây DOM (ô vẫn có giá trị, vẫn gửi lên đúng như form cũ); nút có `aria-expanded` + `aria-controls`;
// khối phải tự mở khi bên trong có giá trị khác mặc định (nơi gọi quyết bằng hàm thuần ở src/shared) và khi Lưu bị từ chối vì ô trong khối (`moKhoiChua` / `moMoiKhoiGap`).
import { h } from "./dom";

export interface KhoiGap {
  /** Nút bật / tắt — nơi gọi đặt vào cây DOM (thường ngay trước `than`). */
  nut: HTMLButtonElement;
  /** Khối chứa ô ít dùng (chính phần tử truyền vào). */
  than: HTMLElement;
  mo(): void;
  dong(): void;
  laMo(): boolean;
  /** Đổi chữ nút (vd nêu thêm "số hiệu chuyến bay" khi chặng có sân bay). */
  datNhan(nhan: string): void;
}

/** Mọi khối gập đã dựng, theo phần tử `than` — để `moKhoiChua` mở đúng khối chứa một ô. */
const dangKy = new WeakMap<Element, KhoiGap>();
let dem = 0;

/**
 * Biến `than` (phần tử có sẵn, chứa các ô) thành khối gập. `ma` = nhãn kỹ thuật cho `data-gap` (kịch bản kiểm tìm nút theo đó); `nhan` = chữ nút, KHÔNG kèm dấu "+" (CSS vẽ dấu theo `aria-expanded`).
 * `mo` = mở sẵn lúc dựng (khi bên trong đã có giá trị).
 */
export function taoKhoiGap(o: {
  ma: string;
  nhan: string;
  than: HTMLElement;
  mo?: boolean;
  /** Nút có sẵn (vd dòng tóm tắt của chặng) thay cho nút dựng sẵn "+ Thêm chi tiết"; vẫn được gắn `data-gap`, `aria-controls` và bật / tắt khi bấm. */
  nut?: HTMLButtonElement;
  /** Gọi mỗi khi trạng thái mở / đóng đổi (kể cả do `moKhoiChua`): nơi gọi giữ trạng thái qua các lần dựng lại, hoặc ẩn / hiện nút. */
  khiDoi?: (mo: boolean) => void;
}): KhoiGap {
  const id = o.than.id || `gap-than-${++dem}`;
  o.than.id = id;
  o.than.setAttribute("data-gap-than", o.ma);
  const nut = o.nut ?? h("button", { type: "button", class: "btn btn-link gap-nut", "data-gap": o.ma, "aria-expanded": "false", "aria-controls": id }, o.nhan);
  if (o.nut) {
    nut.setAttribute("data-gap", o.ma);
    nut.setAttribute("aria-controls", id);
  }
  let mo = false;
  const dat = (v: boolean) => {
    mo = v;
    o.than.hidden = !v;
    nut.setAttribute("aria-expanded", String(v));
    o.khiDoi?.(v);
  };
  const khoi: KhoiGap = {
    nut, than: o.than,
    mo: () => dat(true),
    dong: () => dat(false),
    laMo: () => mo,
    datNhan: (nhan) => { nut.textContent = nhan; },
  };
  nut.addEventListener("click", () => dat(!mo));
  dat(o.mo === true);
  dangKy.set(o.than, khoi);
  return khoi;
}

/**
 * Mở mọi khối gập (và <details> đóng) bọc ngoài `el`: dùng khi cần cho người dùng THẤY một ô (lỗi kiểm ở máy khách chỉ tới ô đó; cuộn / focus vào ô trong khối đang ẩn là vô hiệu).
 * Không làm gì nếu `el` không nằm trong khối nào.
 */
export function moKhoiChua(el: Element | null): void {
  for (let n = el?.closest("[data-gap-than]") ?? null; n; n = n.parentElement?.closest("[data-gap-than]") ?? null) dangKy.get(n)?.mo();
  for (let d = el?.closest("details:not([open])") ?? null; d; d = d.parentElement?.closest("details:not([open])") ?? null) (d as HTMLDetailsElement).open = true;
}

/**
 * Mở MỌI khối gập bên trong `goc` (cả <details>). Dùng khi máy chủ từ chối lưu mà không chỉ ra ô (400 chung): mở hết là cách an toàn — khối nào còn gập thì bên trong chỉ toàn giá trị mặc định
 * (luật tự mở khi có dữ liệu), nên mở thêm không giấu gì và không bao giờ để một ô lỗi nằm trong khối đóng.
 */
export function moMoiKhoiGap(goc: ParentNode): void {
  goc.querySelectorAll("[data-gap-than]").forEach((n) => dangKy.get(n)?.mo());
  goc.querySelectorAll<HTMLDetailsElement>("details:not([open])").forEach((d) => { d.open = true; });
}
