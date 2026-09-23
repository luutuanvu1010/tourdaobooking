import { ApiError, api, type Staff, type Api } from "./api";
import { can, hasPermission, isOffice } from "../src/shared/permissions";
import { byId, h, replaceChildren } from "./dom";
import { icon, type IconName } from "./icons";
import { registerServiceWorker } from "./pwa";

interface Tab {
  href: string;
  label: string;
  icon: IconName;
  active: (path: string) => boolean;
}

/**
 * Thanh tab dưới đáy (điện thoại): nhân sự lập được đơn 4 tab, admin 6 tab; kế toán (xem đơn nhưng không lập đơn — ADR-0007) không có tab Đơn mới; tài khoản chỉ-FIELD chỉ có tab Tôi (việc được giao thuộc N2).
 * /order thuộc tab Đơn hàng, /audit thuộc tab Tôi. Trang Hồ sơ/Địa điểm có ở thanh điều hướng trên và ở mục liên kết của tab Tôi (chưa có thiết kế điện thoại riêng).
 */
function tabsFor(admin: boolean, office: boolean, canCreate: boolean): Tab[] {
  const adminTabs: Tab[] =
    admin
      ? [
          { href: "/catalog", label: "Dịch vụ", icon: "services", active: (p) => p === "/catalog" },
          { href: "/staff", label: "Nhân viên", icon: "staff", active: (p) => p === "/staff" },
        ]
      : [];
  const officeTabs: Tab[] = [];
  if (office) officeTabs.push({ href: "/home", label: "Trang chủ", icon: "home", active: (p) => p === "/home" });
  if (office) officeTabs.push({ href: "/", label: "Đơn hàng", icon: "orders", active: (p) => p === "/" || p === "/order" });
  if (canCreate) officeTabs.push({ href: "/order-form", label: "Đơn mới", icon: "plus", active: (p) => p === "/order-form" });
  return [
    ...officeTabs,
    ...adminTabs,
    { href: "/account", label: "Tôi", icon: "me", active: (p) => p === "/account" || p === "/audit" },
  ];
}

function tabBar(admin: boolean, office: boolean, canCreate: boolean, path: string): HTMLElement {
  return h(
    "nav",
    { id: "tabbar", "aria-label": "Điều hướng chính" },
    ...tabsFor(admin, office, canCreate).map((t) =>
      h("a", { href: t.href, class: t.icon === "plus" ? "tab tab-new" : "tab", "aria-current": t.active(path) ? "page" : false }, h("span", { class: "tab-icon" }, icon(t.icon)), h("span", null, t.label)),
    ),
  );
}

const MAINTENANCE_STRIP_ID = "maint-strip";
/**
 * Dải mảnh dưới thanh đầu trang: "Đang ở chế độ bảo trì — chỉ bạn dùng được" (liên kết tới trang Tôi, nơi tắt). Chỉ người ĐƯỢC PHÉP tới được app lúc bảo trì nên chỉ họ thấy dải này;
 * gọi lại với `on = false` để gỡ (trang Tôi gọi ngay sau khi bật/tắt, khỏi phải tải lại trang).
 */
export function setMaintenanceStrip(on: boolean): void {
  document.getElementById(MAINTENANCE_STRIP_ID)?.remove();
  if (on) document.getElementById("topbar")?.after(h("a", { class: "maint-strip", id: MAINTENANCE_STRIP_ID, href: "/account" }, "Đang ở chế độ bảo trì — chỉ bạn dùng được"));
}

export async function logout(): Promise<void> {
  await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  location.assign("/login");
}

/** Số mục chưa đọc của Góp ý (phản hồi mới cho tôi + yêu cầu chờ admin). Lỗi mạng → 0, không làm hỏng khung. */
export async function feedbackBadge(): Promise<number> {
  try {
    const b = await api<Api.FeedbackBadgeResponse>("/api/feedback/badge");
    return b.mine + b.queue;
  } catch {
    return 0;
  }
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
    h("a", { class: "brand", href: "/" }, h("img", { class: "brand-logo", src: "/icons/logo-96.png", alt: "", width: 30, height: 30 }), "Tour Đảo ", h("span", null, "Booking")),
    title ? h("span", { class: "bar-title", id: "bar-title" }, title) : null,
    nav,
    who,
  );

  const addTabBar = (admin: boolean, office = true, canCreate = office) => {
    if (tabbar === "off") return;
    document.body.append(tabBar(admin, office, canCreate, path));
    document.body.classList.add("has-tabbar");
  };
  let me: Api.MeResponse;
  try {
    me = await api<Api.MeResponse>("/api/auth/me");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Mất mạng (khung vẫn mở được từ cache): báo rõ thay vì để trang trống, rồi giữ lời gọi treo như goLogin() ở api.ts.
    const el = document.getElementById("error");
    if (el) showError(el, "Không có kết nối mạng. Kiểm tra Wi-Fi hoặc 4G rồi mở lại app.");
    addTabBar(false); // không biết vai khi mất mạng: hiện 3 tab cơ bản để còn điều hướng (QA2 Q2-04)
    return new Promise<never>(() => undefined);
  }
  const { staff } = me;
  if (me.maintenance?.on) setMaintenanceStrip(true);
  const admin = hasPermission(staff, "ADMIN");
  const office = isOffice(staff);
  const canCreate = can(staff, "order.create"); // kế toán xem được đơn nhưng không lập đơn (ADR-0007): ẩn nút thay vì để bị 403 sau khi điền xong
  const logoutBtn = h("button", { class: "btn btn-link", type: "button" }, "Đăng xuất");
  logoutBtn.addEventListener("click", () => void logout());
  replaceChildren(
    nav,
    office && h("a", { href: "/home" }, "Trang chủ"),
    office && h("a", { href: "/" }, "Đơn hàng"),
    canCreate && h("a", { href: "/order-form" }, "+ Đơn mới"),
    office && h("a", { href: "/parties" }, "Hồ sơ"),
    admin && h("a", { href: "/catalog" }, "Dịch vụ"),
    admin && h("a", { href: "/staff" }, "Nhân viên"),
    admin && h("a", { href: "/locations" }, "Địa điểm"),
    admin && h("a", { href: "/audit" }, "Nhật ký"),
  );
  const feedbackLink = h("a", { href: `/feedback?new=1&from=${encodeURIComponent(path)}` }, "Góp ý");
  nav.append(feedbackLink);
  void feedbackBadge().then((n) => {
    if (n > 0) feedbackLink.append(" ", h("span", { class: "badge badge-cancelled" }, String(n)));
  });
  replaceChildren(who, h("a", { href: "/account", title: "Tôi" }, staff.fullName), logoutBtn);
  addTabBar(admin, office, canCreate);
  return staff;
}

export function showError(el: HTMLElement, message: string | null): void {
  el.textContent = message ?? "";
  el.hidden = !message;
}
