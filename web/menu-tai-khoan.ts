// Menu tên tài khoản (chủ dự án 8/11/2026): bấm tên ở chân thanh bên (máy tính) hoặc ô chữ cái đầu ở thanh trên (điện thoại) mở một menu nhỏ:
// «Xem như vai trò khác» (chỉ Toàn quyền THẬT — ADR-0180; bấm thì mở danh sách vai trò ngay trong menu) rồi «Đăng xuất».
// Không dùng bảng trượt: mã này vào gói MỌI trang (trần dung lượng trang Đơn hàng, src/goi-trang-nhe.test.ts). Máy chủ vẫn là cổng thật (route đòi Toàn quyền thật).
import { ApiError, api, type Staff } from "./api";
import { h } from "./dom";
import { CAU_GOI_Y_XEM_NHU, TIEU_DE_XEM_NHU, hienMucXemNhuVai, luaChonXemNhu } from "../src/shared/xem-nhu-vai-hien-thi";

/** Gắn menu vào nút đã dựng sẵn. Menu đặt cố định theo vị trí nút lúc mở (nút ở nửa dưới màn hình thì menu mở lên trên). */
export function ganMenuTaiKhoan(nut: HTMLButtonElement, staff: Staff, dangXuat: () => void): void {
  nut.setAttribute("aria-haspopup", "menu");
  nut.setAttribute("aria-expanded", "false");
  const menu = h("div", { class: "menu-tk", role: "menu", hidden: true });
  const loi = h("p", { class: "alert", role: "alert", hidden: true });
  if (hienMucXemNhuVai(staff)) {
    const vai = luaChonXemNhu().map((x) => {
      const b = h("button", { type: "button", class: "menu-tk-vai", role: "menuitem" }, x.nhan);
      b.addEventListener("click", () => {
        b.disabled = true;
        api("/api/auth/xem-nhu-vai", { method: "POST", body: { role: x.ma } }).then(
          () => location.replace(location.pathname + location.search),
          (err: unknown) => {
            b.disabled = false;
            loi.textContent = err instanceof ApiError ? err.message : "Không đổi được. Kiểm tra mạng rồi thử lại.";
            loi.hidden = false;
          },
        );
      });
      return b;
    });
    const ds = h("div", { class: "menu-tk-ds", hidden: true }, h("p", { class: "menu-tk-goi-y" }, CAU_GOI_Y_XEM_NHU), loi, ...vai);
    const mo = h("button", { type: "button", class: "menu-tk-muc", role: "menuitem", "aria-expanded": "false" }, `${TIEU_DE_XEM_NHU} ›`);
    mo.addEventListener("click", () => {
      ds.hidden = !ds.hidden;
      mo.setAttribute("aria-expanded", String(!ds.hidden));
    });
    menu.append(mo, ds);
  }
  const ra = h("button", { type: "button", class: "menu-tk-muc menu-tk-ra", role: "menuitem" }, "Đăng xuất");
  ra.addEventListener("click", dangXuat);
  menu.append(ra);
  document.body.append(menu);

  const dong = (traTieuDiem: boolean) => {
    if (menu.hidden) return;
    menu.hidden = true;
    nut.setAttribute("aria-expanded", "false");
    if (traTieuDiem) nut.focus();
  };
  nut.addEventListener("click", () => {
    if (!menu.hidden) return dong(false);
    const r = nut.getBoundingClientRect();
    const s = menu.style;
    s.top = s.bottom = s.left = s.right = "";
    if (r.top > innerHeight / 2) s.bottom = `${innerHeight - r.top + 4}px`;
    else s.top = `${r.bottom + 4}px`;
    if (r.left < innerWidth / 2) s.left = `${Math.max(r.left, 8)}px`;
    else s.right = `${Math.max(innerWidth - r.right, 8)}px`;
    menu.hidden = false;
    nut.setAttribute("aria-expanded", "true");
    menu.querySelector<HTMLElement>("button")?.focus();
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target as Node) && !nut.contains(e.target as Node)) dong(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dong(true);
  });
  window.addEventListener("resize", () => dong(false));
}
