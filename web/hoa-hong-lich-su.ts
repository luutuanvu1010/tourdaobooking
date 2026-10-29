// Huy hiệu trạng thái một dòng có ngày (dòng mức, lần áp dụng chính sách) và khối «Xem lịch sử (n)» dùng chung cho màn «Mức TA» (lần áp dụng chính sách cho loại — R2) và
// hồ sơ Danh bạ (chính sách riêng của đại lý — R3) — N5, kế hoạch docs/superpowers/plans/2026-10-29-sua-muc-n5-ke-hoach.md. Lịch sử chỉ xem: không nút ghi, không lý do sửa
// (cùng khuôn bảng dòng mức). Tệp nhỏ, không trạng thái chung — trang Danh bạ nhúng nó mà không kéo cả bảng mức vào gói.
import { NHAN_TRANG_THAI, nhanHieuLuc, nhanNutLichSu, trangThaiDong, type TrangThaiDong } from "../src/shared/hoa-hong-hien-thi";
import { h } from "./dom";

/** Đang áp: xanh; sắp áp: nháp; đã ngừng, đã huỷ: xám. */
export const huyHieuTrangThai = (tt: TrangThaiDong): HTMLElement =>
  h("span", { class: tt === "DANG_AP" ? "badge badge-confirmed" : tt === "SAP_AP" ? "badge badge-draft" : "badge badge-cancelled" }, NHAN_TRANG_THAI[tt]);

/**
 * Nút bật «Xem lịch sử (n)» + danh sách ẩn các lần đã ngừng / đã huỷ (`ds` = phần `lichSu` của `chiaLanGan`). `id` = mã danh sách (duy nhất trên trang, cho `aria-controls`);
 * `ten(g)` = chữ đầu dòng (tên loại hoặc tên chính sách). Rỗng ⇒ null (không nút).
 */
export function khoiLichSuGan<T extends { id: string; tuNgay: string; denNgay: string | null; conHieuLuc: boolean; daHuy?: boolean }>(
  ds: readonly T[], homNay: string, ten: (g: T) => string, id: string,
): HTMLElement | null {
  if (ds.length === 0) return null;
  const ul = h(
    "ul",
    { class: "hh-tl-gan hh-lich-su", id, hidden: true },
    ...ds.map((g) => h("li", { "data-gan-id": g.id }, h("span", null, h("strong", null, ten(g)), " · ", h("span", { class: "muted" }, nhanHieuLuc(g))), huyHieuTrangThai(trangThaiDong(g, homNay)))),
  );
  const nut = h("button", { type: "button", class: "btn", "aria-expanded": "false", "aria-controls": id }, nhanNutLichSu(ds.length, false));
  nut.addEventListener("click", () => {
    const mo = nut.getAttribute("aria-expanded") !== "true";
    ul.hidden = !mo;
    nut.setAttribute("aria-expanded", String(mo));
    nut.textContent = nhanNutLichSu(ds.length, mo);
  });
  return h("div", { class: "hh-lich-su-khoi" }, nut, ul);
}
