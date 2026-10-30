// Menu «⋯» (việc khác) của một dòng ở trang «Hoa hồng đối tác» — đặc tả hoa-hong-cap-dai-ly §3.2, Q-6. Không thêm thành phần mới: bảng trượt `moBangTruot` có sẵn
// (Esc, chạm nền, nền `inert`, trả tiêu điểm về nút mở). Thân bảng là danh sách nút `.nut[data-cap="phu"]` rộng hết hàng, mỗi nút một việc nơi gọi đã lọc theo luật §3.1.
import { nhanViecKhac } from "../src/shared/hoa-hong-hien-thi";
import { moBangTruot } from "./bang-truot";
import { h } from "./dom";

/** Nút «⋯» (vùng chạm ≥ 44px) mang `aria-haspopup="dialog"` và `aria-label="Việc khác: <tên dòng>"`. */
export function nutViecKhac(tenDong: string, mo: () => void): HTMLButtonElement {
  const n = h("button", { type: "button", class: "nut hh-viec-khac", "data-cap": "loi", "aria-haspopup": "dialog", "aria-label": nhanViecKhac(tenDong) }, "⋯");
  n.addEventListener("click", mo);
  return n;
}

/**
 * Mở bảng trượt tiêu đề là tên dòng, mỗi việc một nút. Bấm một việc: đóng bảng và TRẢ tiêu điểm về nút «⋯» trước, rồi mới chạy việc — hộp của việc đó lấy phần tử đang có tiêu
 * điểm làm nút mở (`moHop` ở web/hoa-hong-hop.ts), và `moBangTruot` / `hoiXacNhan` không mở khi còn một bảng đang mở.
 */
export function moViecKhac(o: { tenDong: string; viec: { nhan: string; chay: () => void }[]; opener: HTMLElement }): void {
  const nut = o.viec.map((v) => h("button", { type: "button", class: "nut hh-viec-nut", "data-cap": "phu" }, v.nhan));
  const bang = moBangTruot({ title: o.tenDong, body: [h("div", { class: "hh-viec-ds" }, ...nut)], foot: [], opener: o.opener });
  if (!bang) return;
  nut.forEach((b, i) =>
    b.addEventListener("click", () => {
      bang.close();
      o.viec[i]!.chay();
    }),
  );
}
