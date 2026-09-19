import { api, type Staff } from "./api";
import { byId, h, replaceChildren } from "./dom";

/** Khung chung các trang sau đăng nhập: xác thực phiên, dựng thanh đầu trang. Trả nhân viên hiện tại. */
export async function initShell(): Promise<Staff> {
  const { staff } = await api<{ staff: Staff }>("/api/auth/me");
  const logout = h("button", { class: "btn btn-link", type: "button" }, "Đăng xuất");
  logout.addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    location.assign("/login");
  });
  replaceChildren(
    byId("topbar"),
    h("a", { class: "brand", href: "/" }, "Tour Đảo ", h("span", null, "Sales")),
    h("nav", { class: "topnav" }, h("a", { href: "/" }, "Đơn hàng"), h("a", { href: "/order-form" }, "+ Đơn mới"), staff.role === "admin" && h("a", { href: "/catalog" }, "Dịch vụ"), staff.role === "admin" && h("a", { href: "/staff" }, "Nhân viên"), staff.role === "admin" && h("a", { href: "/audit" }, "Nhật ký")),
    h("div", { class: "who" }, h("a", { href: "/account", title: "Đổi PIN" }, staff.fullName), logout),
  );
  return staff;
}

export function showError(el: HTMLElement, message: string | null): void {
  el.textContent = message ?? "";
  el.hidden = !message;
}
