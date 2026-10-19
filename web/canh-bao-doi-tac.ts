// Lớp chặn nhầm "Số này là của đối tác …" (thiết kế lại màn Tạo đơn 18/10, đặc tả §3 B): khung nền cát ngay dưới ô SĐT khách, dùng ở form Tạo đơn VÀ bảng "Đổi khách".
// Chỉ dựng DOM; việc tìm đối tác trùng số do web/booker-picker.ts (tra hồ sơ) + `doiTacTrungSo` (src/shared/booker.ts), việc chọn đối tác do nơi gọi (cùng hàm với công tắc "Đơn của").
// Chỉ là gợi ý — không chặn lưu đơn. Khung là vùng thông báo (role="status", đọc lịch sự); nút "Đúng, qua …" và "Không" đều là nút phụ (viền), nút chính của màn là nút Lưu.
import { h, replaceChildren } from "./dom";

export interface DoiTacTrung {
  partyId: string;
  ten: string;
  loai: "PERSON" | "ORGANIZATION";
}

export interface CanhBaoDoiTac {
  root: HTMLElement;
  /** `d` = đối tác trùng số (null = không có / không biết → ẩn khung); `soDt` = số đang gõ: bấm "Không" thì khung không hiện lại cho CÙNG giá trị số này. */
  hien(d: DoiTacTrung | null, soDt: string): void;
}

export function canhBaoDoiTac(o: { onDung: (d: DoiTacTrung) => void }): CanhBaoDoiTac {
  let boQua: string | null = null; // số điện thoại đã bấm "Không"
  const root = h("div", { class: "canh-bao-dt", id: "canh-bao-doi-tac", role: "status", "aria-live": "polite", hidden: true });

  function an(): void {
    replaceChildren(root);
    root.hidden = true;
  }

  function hien(d: DoiTacTrung | null, soDt: string): void {
    if (boQua !== null && soDt !== boQua) boQua = null; // số đã đổi → lần "Không" cũ hết hiệu lực
    if (!d || soDt === boQua) {
      an();
      return;
    }
    const dung = h("button", { type: "button", class: "btn", "data-action": "canh-bao-dung" }, `Đúng, qua ${d.ten}`);
    const khong = h("button", { type: "button", class: "btn", "data-action": "canh-bao-khong" }, "Không");
    dung.addEventListener("click", () => {
      an();
      o.onDung(d);
    });
    khong.addEventListener("click", () => {
      boQua = soDt;
      an();
    });
    replaceChildren(root, h("p", { class: "canh-bao-dt-chu" }, `Số này là của đối tác ${d.ten}. Đơn này đặt qua đối tác đó?`), h("div", { class: "canh-bao-dt-nut" }, dung, khong));
    root.hidden = false;
  }
  return { root, hien };
}
