import { ApiError, api, type Staff, type Api } from "./api";
import { PERMISSION_LABEL, can, hasPermission, isOffice, seesAllOrders } from "../src/shared/permissions";
import { append, byId, h, replaceChildren } from "./dom";
import { initials } from "./format";
import { batDauBangTin } from "./bangtin";
import { helpHasNews, newDot } from "./help-seen";
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
 * /order thuộc tab Đơn hàng, /audit thuộc tab Tôi. Trang Danh bạ/Địa điểm có ở thanh điều hướng trên và ở mục liên kết của tab Tôi (chưa có thiết kế điện thoại riêng).
 */
function tabsFor(admin: boolean, seesAll: boolean, canCreate: boolean): Tab[] {
  const adminTabs: Tab[] =
    admin
      ? [
          { href: "/catalog", label: "Dịch vụ", icon: "services", active: (p) => p === "/catalog" },
          { href: "/staff", label: "Tài khoản", icon: "staff", active: (p) => p === "/staff" },
        ]
      : [];
  const officeTabs: Tab[] = [];
  // Đợt D Task 5 (ADR-0015 điều 4): trang mặc định đổi chỗ — "/" nay là Trang chủ, "/orders" là Đơn hàng.
  // active() của "/" phải khớp CHÍNH XÁC "/" (không dùng startsWith/prefix) để không lỡ sáng đèn cho mọi đường dẫn.
  if (seesAll) officeTabs.push({ href: "/", label: "Trang chủ", icon: "home", active: (p) => p === "/" });
  if (seesAll) officeTabs.push({ href: "/orders", label: "Đơn hàng", icon: "orders", active: (p) => p === "/orders" || p === "/order" });
  if (canCreate) officeTabs.push({ href: "/order-form", label: "Tạo đơn", icon: "plus", active: (p) => p === "/order-form" });
  return [
    ...officeTabs,
    ...adminTabs,
    { href: "/account", label: "Tôi", icon: "me", active: (p) => p === "/account" || p === "/audit" || p === "/help" },
  ];
}

function tabBar(admin: boolean, seesAll: boolean, canCreate: boolean, path: string): HTMLElement {
  return h(
    "nav",
    { id: "tabbar", "aria-label": "Điều hướng chính" },
    ...tabsFor(admin, seesAll, canCreate).map((t) =>
      h("a", { href: t.href, class: t.icon === "plus" ? "tab tab-new" : "tab", "aria-current": t.active(path) ? "page" : false }, h("span", { class: "tab-icon" }, icon(t.icon), t.href === "/account" && helpHasNews() && newDot()), h("span", null, t.label)),
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

/**
 * Số dịch vụ đang lệch giá Sheet (huy hiệu "Dịch vụ & giá" trên thanh bên) — CÙNG PHÉP ĐẾM khối "Cần xem lại" của
 * Trang chủ (Đợt D Task 3, `src/shared/dashboard-review.ts` → `summarizeCatalogConflicts`: `items.filter(i =>
 * i.conflicts.length > 0).length`), không viết lại logic. Gọi thẳng `GET /api/catalog/admin` (đã tự khai
 * `access: "admin"`) TỪ TRÌNH DUYỆT — đúng cách web/home.ts đang làm, không thêm route mới. Chỉ gọi khi ĐÃ BIẾT
 * là admin (tránh 403 cho phần lớn tài khoản mở bất kỳ trang nào). Lỗi mạng → 0, giống feedbackBadge().
 */
async function catalogConflictBadge(): Promise<number> {
  try {
    const { items } = await api<Api.CatalogAdminResponse>("/api/catalog/admin");
    return items.filter((i) => i.conflicts.length > 0).length;
  } catch {
    return 0;
  }
}

/**
 * Huy hiệu "Đơn hàng" = SỐ ĐƠN CHƯA XÁC NHẬN, không phải tổng số đơn (quyết định 8 của chủ dự án,
 * `docs/superpowers/specs/2026-09-23-trang-chu-moi-quyet-dinh.md`). Số này ĐÃ CÓ SẴN ở `GET /api/orders/dashboard`
 * (`draftCount` — cùng số ô "Đơn nháp chưa xác nhận" của Trang chủ), không thêm route mới. Lỗi mạng → 0, giống
 * feedbackBadge(). Route khai cổng "orders" (từ ADR-0019 phần B, hỏi `order.view` + `money.view` + `contact.view` trong thân) nên chỉ gọi khi mục "Đơn hàng" có mặt (điều kiện `seesAll` = xem được mọi đơn).
 */
async function draftOrderBadge(): Promise<number> {
  try {
    const { draftCount } = await api<Api.DashboardResponse>("/api/orders/dashboard");
    return draftCount;
  } catch {
    return 0;
  }
}

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Chỉ gắn khi có NGUỒN THẬT (route đã có sẵn số đó) — không mục nào được vẽ số giả. */
  badge?: () => Promise<number>;
  /** Màu huy hiệu khác màu mặc định (đúng bản mẫu: "Dịch vụ & giá" màu cát, "Góp ý" màu san hô). */
  badgeClass?: string;
  /** Chấm đỏ "Có bản mới" (chỉ mục Trợ giúp): đọc ngay từ máy này, không gọi mạng. */
  dot?: () => boolean;
  active: (path: string) => boolean;
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Ba nhóm của thanh điều hướng dọc (ADR-0015, máy tính ≥900px). Mục nào hiện cho ai giữ ĐÚNG luật đang dùng ở
 * tabsFor()/nav ngang cũ (office/admin/canCreate) — KHÔNG tự đổi bản đồ quyền (đặc tả §3.1). Nhóm rỗng bị lọc ở
 * sidebar() (ẩn cả tiêu đề, đặc tả §3.1).
 */
function navGroups(admin: boolean, seesAll: boolean, office: boolean, canCreate: boolean, path: string): NavGroup[] {
  const sales: NavItem[] = [];
  // Đợt D Task 5 (ADR-0015 điều 4): "/" nay là Trang chủ, "/orders" là Đơn hàng — active() của "/" phải khớp
  // CHÍNH XÁC "/" (không phải mọi đường dẫn bắt đầu bằng "/").
  if (seesAll) sales.push({ href: "/", label: "Trang chủ", icon: "home", active: (p) => p === "/" });
  // Huy hiệu "Đơn hàng" = số đơn CHƯA XÁC NHẬN (quyết định 8 của chủ dự án đã chốt nghĩa của con số này), màu mặc định như bản mẫu.
  if (seesAll) sales.push({ href: "/orders", label: "Đơn hàng", icon: "orders", badge: draftOrderBadge, active: (p) => p === "/orders" || p === "/order" });
  if (canCreate) sales.push({ href: "/order-form", label: "Tạo đơn", icon: "plus", active: (p) => p === "/order-form" });
  if (office) sales.push({ href: "/parties", label: "Danh bạ", icon: "contact-card", active: (p) => p === "/parties" });

  const management: NavItem[] = admin
    ? [
        { href: "/catalog", label: "Dịch vụ & giá", icon: "services", badge: catalogConflictBadge, badgeClass: "sidebar-item-badge-sand", active: (p) => p === "/catalog" },
        { href: "/staff", label: "Quản lý tài khoản", icon: "staff", active: (p) => p === "/staff" },
        { href: "/locations", label: "Địa điểm", icon: "pin", active: (p) => p === "/locations" },
        { href: "/audit", label: "Nhật ký", icon: "history", active: (p) => p === "/audit" },
      ]
    : [];

  const me: NavItem[] = [
    { href: "/account", label: "Của tôi", icon: "me", active: (p) => p === "/account" },
    { href: `/feedback?new=1&from=${encodeURIComponent(path)}`, label: "Góp ý / Báo lỗi", icon: "chat", badge: feedbackBadge, badgeClass: "sidebar-item-badge-accent", active: (p) => p === "/feedback" },
    { href: "/help", label: "Trợ giúp", icon: "help", dot: helpHasNews, active: (p) => p === "/help" },
  ];

  return [
    { title: "BÁN HÀNG", items: sales },
    { title: "QUẢN TRỊ", items: management },
    { title: "TÔI", items: me },
  ];
}

/**
 * `loaders` gom lại lời gọi huy hiệu thay vì bắn ngay: chỉ chạy khi thanh bên THẬT SỰ hiển thị (xem addNav()) —
 * ở khổ điện thoại thanh bên bị CSS ẩn nên ba lời gọi kia chỉ tốn mạng trên chính thiết bị yếu nhất.
 */
function sidebarItem(item: NavItem, path: string, loaders: (() => void)[]): HTMLElement {
  const a = h(
    "a",
    { class: "sidebar-item", href: item.href, "aria-current": item.active(path) ? "page" : false },
    h("span", { class: "sidebar-item-icon" }, icon(item.icon, 18)),
    h("span", { class: "sidebar-item-label" }, item.label, item.dot?.() && newDot()),
  );
  const badge = item.badge;
  if (badge) {
    loaders.push(() => {
      void badge().then((n) => {
        if (n > 0) a.append(h("span", { class: item.badgeClass ? `sidebar-item-badge ${item.badgeClass}` : "sidebar-item-badge" }, String(n)));
      });
    });
  }
  return a;
}

/** Nhóm rỗng ẩn CẢ tiêu đề (đặc tả §3.1) — trả `null` để sidebar() lọc bỏ, không hiện tiêu đề mồ côi. */
function sidebarGroup(group: NavGroup, path: string, loaders: (() => void)[]): HTMLElement | null {
  if (group.items.length === 0) return null;
  return h(
    "div",
    { class: "sidebar-group" },
    h("div", { class: "sidebar-group-title" }, group.title),
    h("div", { class: "sidebar-group-items" }, ...group.items.map((it) => sidebarItem(it, path, loaders))),
  );
}

/**
 * Thanh điều hướng dọc ở máy tính (ADR-0015) — luôn ở trong DOM (CSS ẩn ở <900px, KHÔNG gỡ khỏi cây — DOM phẳng,
 * bài học Đợt C). Cấu trúc đúng bản mẫu: đầu (logo + tên app) → ba nhóm → chân (avatar + tên + vai + đăng xuất).
 * Đăng xuất: bản mẫu không vẽ (ảnh chỉ là một phần khung), nhưng đây là thao tác BẮT BUỘC PHẢI CÒN (trang Tôi
 * cũng có "Đăng xuất" riêng, `web/account.ts`) — thêm một liên kết nhỏ, không đổi khối nào bản mẫu đã vẽ.
 */
function sidebar(admin: boolean, seesAll: boolean, office: boolean, canCreate: boolean, path: string, staff: Staff, loaders: (() => void)[]): HTMLElement {
  const groups = navGroups(admin, seesAll, office, canCreate, path)
    .map((g) => sidebarGroup(g, path, loaders))
    .filter((g): g is HTMLElement => g !== null);
  const roleLabel = staff.permissions.map((p) => PERMISSION_LABEL[p]).join(" · ") || "Chưa có quyền";
  const logoutBtn = h("button", { class: "sidebar-logout", type: "button" }, "Đăng xuất");
  logoutBtn.addEventListener("click", () => void logout());
  return h(
    "nav",
    { id: "sidebar", "aria-label": "Điều hướng chính" },
    h(
      "a",
      { class: "sidebar-head", href: "/" },
      h("span", { class: "brand" }, h("img", { class: "brand-logo", src: "/icons/logo-96.png", alt: "", width: 30, height: 30 }), h("span", { class: "brand-name" }, "Island Booking ", h("span", null, "System"))),
    ),
    h("div", { class: "sidebar-groups" }, ...groups),
    h(
      "div",
      { class: "sidebar-foot" },
      h("span", { class: "sidebar-avatar", "aria-hidden": "true" }, initials(staff.fullName)),
      h("span", { class: "sidebar-who" }, h("span", { class: "sidebar-name" }, staff.fullName), h("span", { class: "sidebar-role" }, roleLabel)),
      logoutBtn,
    ),
  );
}


// Bản sao tên app (nguồn: manifest / src/shared/app-info.ts): KHÔNG import app-info vì nó kéo cả nhật ký thay đổi vào bundle của mọi trang. tests/e2e/pwa.mjs đối chiếu brand với manifest.
const APP_NAME = "Island Booking System";

/**
 * Chữ breadcrumb trên thanh công việc: `data-title` của trang → nhãn mục điều hướng đang mở → tên app.
 * Trang chủ và Đơn hàng cố ý KHÔNG khai `data-title` (thuộc tính đó còn đổi cả giao diện điện thoại — ẩn logo và
 * ẩn `h1` — mà hai màn đó chủ dự án đã duyệt), nên trước đây ô breadcrumb của chúng bỏ trống ở máy tính. Tra nhãn
 * từ `navGroups` với đủ quyền: đây chỉ là tra NHÃN THEO ĐƯỜNG DẪN (nhãn không phụ thuộc quyền); việc mục nào được
 * hiện vẫn do `navGroups(admin, seesAll, office, canCreate)` quyết ở sidebar(), không nới quyền của ai.
 */
function barTitleFor(path: string, dataTitle: string | undefined): string {
  if (dataTitle) return dataTitle;
  for (const group of navGroups(true, true, true, true, path)) {
    const item = group.items.find((it) => it.active(path));
    if (item) return item.label;
  }
  return APP_NAME;
}

/** Đổi tiêu đề trên thanh đầu trang (điện thoại) sau khi trang biết nội dung, vd mã đơn. */
export function setBarTitle(text: string): void {
  const el = document.getElementById("bar-title");
  if (el) el.textContent = text;
}

/**
 * Khung chung các trang sau đăng nhập: vẽ ngay phần không cần biết người dùng (khỏi nháy trắng), rồi xác thực
 * phiên và điền phần còn lại. Trả nhân viên hiện tại.
 *
 * Đợt D Task 4 (ADR-0015): thanh điều hướng NGANG cũ (`nav.topnav` + `.who` trong `#topbar`) đổi thành thanh
 * điều hướng DỌC (`#sidebar`, máy tính ≥900px, CSS ẩn ở khổ hẹp hơn — xem `public/app.css`); `#topbar` thu lại
 * thành thanh công việc: breadcrumb tên trang (tái dùng `.bar-title`/`data-title` đã có) + ô tìm kiếm + nút
 * "Lập đơn mới", và ở điện thoại thêm avatar chữ cái đầu (`.bar-avatar`). Chữ ký và giá trị trả về KHÔNG đổi —
 * 12 trang gọi hàm này không cần sửa gì.
 */
export async function initShell(): Promise<Staff> {
  registerServiceWorker();
  // Nút lùi (history.back) phục hồi trang từ bộ đệm lùi/tiến NGUYÊN TRẠNG, kể cả chấm đỏ vẽ lúc chưa xem /help (tiền lệ: pageshow ở order-form.ts).
  // Trang được phục hồi mà nay đã xem bản mới nhất ⇒ gỡ mọi chấm "Có bản mới" của Trợ giúp (tab Tôi, dòng ở trang Tôi, menu máy tính).
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && !helpHasNews()) for (const dot of document.querySelectorAll(".new-dot")) dot.remove();
  });
  const { title, back, tabbar } = document.body.dataset;
  const path = location.pathname.replace(/\/+$/, "") || "/";

  const backLink = back ? h("a", { class: "bar-back", href: back, "aria-label": "Quay lại" }, icon("back", 26)) : null;
  backLink?.addEventListener("click", (e) => {
    if (history.length > 1) {
      e.preventDefault();
      history.back();
    }
  });
  replaceChildren(
    byId("topbar"),
    backLink,
    h("a", { class: "brand", href: "/" }, h("img", { class: "brand-logo", src: "/icons/logo-96.png", alt: "", width: 30, height: 30 }), h("span", { class: "brand-name" }, "Island Booking ", h("span", null, "System"))),
    // LUÔN dựng (C-1): ở máy tính đây là breadcrumb của mọi trang. Giao diện điện thoại KHÔNG đổi — luật hiển thị ở
    // khổ ≤640px vẫn đòi `body[data-title]`, nên trang không khai `data-title` vẫn hiện logo và không hiện breadcrumb.
    h("span", { class: "bar-title", id: "bar-title" }, barTitleFor(path, title)),
  );

  // Sidebar CẦN biết staff (chân thanh: avatar/tên/vai) nên chỉ dựng được SAU KHI đăng nhập xác nhận — khác tab
  // bar (không cần staff). `has-sidebar` chỉ gắn khi ĐÃ THẬT SỰ dựng #sidebar (không để lưới 236px trống khi
  // mất mạng lúc mở trang — nhánh addNav(false) dưới đây không có staff).
  const addNav = (admin: boolean, seesAll = true, office = seesAll, canCreate = seesAll, staff: Staff | null = null) => {
    if (staff) {
      const badgeLoaders: (() => void)[] = [];
      const nav = sidebar(admin, seesAll, office, canCreate, path, staff, badgeLoaders);
      document.body.prepend(nav);
      document.body.classList.add("has-sidebar");
      // Huy hiệu chỉ nạp khi thanh bên ĐANG HIỂN THỊ THẬT (`offsetParent` null khi CSS ẩn nó ở khổ hẹp). Hỏi chính
      // trình duyệt thay vì chép mốc 641px sang JS: chép số thì lần sửa CSS sau sẽ làm hai nơi lệch nhau mà không ai biết.
      const loadBadges = () => {
        for (const load of badgeLoaders) load();
      };
      if (nav.offsetParent !== null) loadBadges();
      else {
        // Thanh bên chưa hiện lúc dựng khung (điện thoại, hoặc iPad đang dựng đứng): chờ khổ màn hình đổi. Không nạp
        // sẵn thì XOAY iPad 768→1024 sẽ ra thanh bên KHÔNG có huy hiệu nào cho tới khi tải lại trang (hồi quy so với
        // bản trước, bản đó nạp vô điều kiện). Người nghe TỰ GỠ ngay lần nạp đầu nên huy hiệu không bao giờ gọi hai lần.
        const onResize = () => {
          if (nav.offsetParent === null) return; // vẫn đang bị CSS ẩn: chưa tốn lời gọi mạng nào
          window.removeEventListener("resize", onResize);
          loadBadges();
        };
        window.addEventListener("resize", onResize);
      }
    }
    if (tabbar === "off") return;
    document.body.append(tabBar(admin, seesAll, canCreate, path));
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
    addNav(false); // không biết vai khi mất mạng: hiện 4 tab cơ bản để còn điều hướng (QA2 Q2-04); không dựng sidebar (thiếu staff cho chân thanh)
    return new Promise<never>(() => undefined);
  }
  const { staff } = me;
  if (me.maintenance?.on) setMaintenanceStrip(true);
  const admin = hasPermission(staff, "ADMIN");
  const seesAll = seesAllOrders(staff); // Trang chủ, Đơn hàng, ô tìm đơn, huy hiệu đơn nháp
  const office = isOffice(staff); // chỉ mục "Danh bạ" (cổng văn phòng, ADR-0019)
  const canCreate = can(staff, "order.create"); // kế toán xem được đơn nhưng không lập đơn (ADR-0007): ẩn nút thay vì để bị 403 sau khi điền xong

  const avatarEl = h("span", { class: "bar-avatar", "aria-hidden": "true" }, initials(staff.fullName));
  // Ô tìm kiếm/nút "Lập đơn mới" chỉ có ích cho ai thấy được Đơn hàng — cùng đối tượng đang thấy mục "Đơn hàng"
  // trên sidebar (`seesAll`)/nút "Lập đơn mới" trên sidebar (`canCreate`), không mở rộng hơn logic quyền hiện có.
  const search = seesAll
    ? h("input", { type: "search", class: "topbar-search", placeholder: "Tìm mã đơn, tên khách, SĐT…", "aria-label": "Tìm đơn" })
    : null;
  search?.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    // Đợt D Task 5: Đơn hàng dời sang /orders — ô tìm kiếm trên thanh công việc (có ở mọi trang office, kể cả
    // Trang chủ) luôn đưa người dùng về đó kèm bộ lọc, dùng lại tham số `q` mà GET /api/orders đã hỗ trợ.
    location.assign(`/orders?q=${encodeURIComponent((e.target as HTMLInputElement).value.trim())}`);
  });
  const newOrderBtn = canCreate ? h("a", { class: "btn btn-accent topbar-new", href: "/order-form" }, "Tạo đơn") : null;
  append(byId("topbar"), [avatarEl, search, newOrderBtn]);

  addNav(admin, seesAll, office, canCreate, staff);
  batDauBangTin(staff); // Bảng tin (ADR-0022): MỘT kết nối mỗi trang đã đăng nhập; nhánh mất mạng ở trên không tới đây (chưa có `staff`)
  return staff;
}

export function showError(el: HTMLElement, message: string | null): void {
  el.textContent = message ?? "";
  el.hidden = !message;
}
