import { api, type Staff, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { icon, type IconName } from "./icons";
import { registerServiceWorker } from "./pwa";

interface Tab {
  href: string;
  label: string;
  icon: IconName;
  active: (path: string) => boolean;
}

/** Thanh tab dưới đáy (điện thoại): nhân viên 3 tab, admin 5 tab. /order thuộc tab Đơn hàng, /audit thuộc tab Tôi. */
function tabsFor(staff: Staff): Tab[] {
  const adminTabs: Tab[] =
    staff.role === "admin"
      ? [
          { href: "/catalog", label: "Dịch vụ", icon: "services", active: (p) => p === "/catalog" },
          { href: "/staff", label: "Nhân viên", icon: "staff", active: (p) => p === "/staff" },
        ]
      : [];
  return [
    { href: "/", label: "Đơn hàng", icon: "orders", active: (p) => p === "/" || p === "/order" },
    { href: "/order-form", label: "Đơn mới", icon: "plus", active: (p) => p === "/order-form" },
    ...adminTabs,
    { href: "/account", label: "Tôi", icon: "me", active: (p) => p === "/account" || p === "/audit" },
  ];
}

function tabBar(staff: Staff, path: string): HTMLElement {
  return h(
    "nav",
    { id: "tabbar", "aria-label": "Điều hướng chính" },
    ...tabsFor(staff).map((t) =>
      h("a", { href: t.href, class: t.icon === "plus" ? "tab tab-new" : "tab", "aria-current": t.active(path) ? "page" : false }, h("span", { class: "tab-icon" }, icon(t.icon)), h("span", null, t.label)),
    ),
  );
}

export async function logout(): Promise<void> {
  await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  location.assign("/login");
}

/** Đổi tiêu đề trên thanh đầu trang (điện thoại) sau khi trang biết nội dung, vd mã đơn. */
export function setBarTitle(text: string): void {
  const el = document.getElementById("bar-title");
  if (el) el.textContent = text;
}

/** Khung chung các trang sau đăng nhập: vẽ ngay phần không cần biết người dùng (khỏi nháy trắng), rồi xác thực phiên và điền phần còn lại. Trả nhân viên hiện tại. */
export async function initShell(): Promise<Staff> {
  registerServiceWorker();
  const { title, back, tabbar } = document.body.dataset;
  const path = location.pathname.replace(/\/+$/, "") || "/";

  const backLink = back ? h("a", { class: "bar-back", href: back, "aria-label": "Quay lại" }, icon("back", 26)) : null;
  backLink?.addEventListener("click", (e) => {
    if (history.length > 1) {
      e.preventDefault();
      history.back();
    }
  });
  const nav = h("nav", { class: "topnav" });
  const who = h("div", { class: "who" });
  replaceChildren(
    byId("topbar"),
    backLink,
    h("a", { class: "brand", href: "/" }, h("img", { class: "brand-logo", src: "/icons/logo-96.png", alt: "", width: 30, height: 30 }), "Tour Đảo ", h("span", null, "Desk")),
    title ? h("span", { class: "bar-title", id: "bar-title" }, title) : null,
    nav,
    who,
  );

  const { staff } = await api<Api.MeResponse>("/api/auth/me");
  const admin = staff.role === "admin";
  const logoutBtn = h("button", { class: "btn btn-link", type: "button" }, "Đăng xuất");
  logoutBtn.addEventListener("click", () => void logout());
  replaceChildren(
    nav,
    h("a", { href: "/" }, "Đơn hàng"),
    h("a", { href: "/order-form" }, "+ Đơn mới"),
    admin && h("a", { href: "/catalog" }, "Dịch vụ"),
    admin && h("a", { href: "/staff" }, "Nhân viên"),
    admin && h("a", { href: "/audit" }, "Nhật ký"),
  );
  replaceChildren(who, h("a", { href: "/account", title: "Tôi" }, staff.fullName), logoutBtn);
  if (tabbar !== "off") {
    document.body.append(tabBar(staff, path));
    document.body.classList.add("has-tabbar");
  }
  return staff;
}

export function showError(el: HTMLElement, message: string | null): void {
  el.textContent = message ?? "";
  el.hidden = !message;
}
