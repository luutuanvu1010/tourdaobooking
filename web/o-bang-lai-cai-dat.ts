// Khối «Ô bằng lái trên phiếu đăng ký» trong nhóm «Cài đặt lập đơn» ở trang Tôi — Quản trị và Toàn quyền (ADR-0236 Đ3). CHỈ ĐỌC: phiếu đăng ký chưa có ô bằng lái và hạng (ADR-0212 Đ8
// chưa thi công, hằng `CO_O_BANG_LAI` ở src/shared/dang-ky-vai.ts), nên công tắc hiện «Đang tắt» và nút bật bị khoá kèm câu nói lý do. Không gọi API, không lưu gì. Không innerHTML.
import { CO_O_BANG_LAI } from "../src/shared/dang-ky-vai";
import { h, replaceChildren } from "./dom";

// Khi ADR-0212 Đ8 làm xong (`CO_O_BANG_LAI = true`): khối này phải đổi sang công tắc thật có đường ghi ở máy chủ — bài src/o-bang-lai-cai-dat.test.ts đỏ để nhắc.
export function ganCaiDatOBangLai(el: HTMLElement): void {
  if (CO_O_BANG_LAI) return; // chưa có công tắc thật: không hiện một nút bấm không làm gì
  replaceChildren(
    el,
    h("h3", { id: "o-bang-lai-heading" }, "Ô bằng lái trên phiếu đăng ký"),
    h("p", { id: "o-bang-lai-trang-thai" }, "Đang tắt."),
    h("p", { class: "muted", id: "o-bang-lai-ly-do" }, "Chưa bật được: phiếu đăng ký chưa có ô bằng lái và hạng. Ô này sẽ bật được khi phần đăng ký tài xế đối tác làm xong."),
    h("button", { class: "nut", type: "button", id: "o-bang-lai-doi", disabled: true, "aria-describedby": "o-bang-lai-ly-do" }, "Bật ô bằng lái trên phiếu đăng ký"),
  );
  el.hidden = false;
}
