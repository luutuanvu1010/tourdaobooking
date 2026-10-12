import { ApiError, api, datNguoiDangNhap, type Staff, type Api } from "./api";
import { PERMISSION_LABEL } from "../src/shared/permissions";
import {
  CHA_THANH_BEN,
  KHUNG_MAT_MANG,
  THANH_BEN,
  THANH_TAB,
  coKhungNho,
  nhanTheoDuong,
  sangTabToi,
  sangTai,
  thanhBen,
  thanhTab,
  thanhTren,
  type KhoaTrang,
  type NguoiXem,
} from "../src/shared/muc-giao-dien";
import { append, byId, h, replaceChildren } from "./dom";
import { initials } from "./format";
import { batDauBangTin } from "./bangtin";
import { helpHasNews, newDot } from "./help-seen";
import { APP_NAME } from "./phien-ban"; // bản sao nhẹ của app-info (app-info kéo cả nhật ký thay đổi vào gói mọi trang); tests/e2e/pwa.mjs đối chiếu brand với manifest
import { icon, type IconName } from "./icons";
import { layKhungNho, luuKhungNho, xoaKhungNho } from "./khung-nho";
import { demSapHetHan } from "./vc-dem";
import { registerServiceWorker } from "./pwa";
import { ganThongBao } from "./thong-bao-ui";
import { KHOA_GAN_PHIEN_THONG_BAO, thietBiTu } from "./push-ui";
import { ganTroLy } from "./tro-ly";

// MỤC NÀO HIỆN CHO AI (thanh bên, thanh tab, thanh trên) KHAI Ở MỘT NƠI: src/shared/muc-giao-dien.ts — tệp này chỉ vẽ danh sách bảng đó trả về, không tự hỏi quyền.
// Rào máy: src/muc-hien-mo-duoc-{1,2,3}.test.ts (mục hiện ⇔ đường gọi chính của trang không bị máy chủ từ chối, 1024 tập quyền), src/muc-giao-dien-hien-trang.test.ts.
// Biểu tượng khai trong bảng phải là tên có ở web/icons.ts — kiểm lúc biên dịch (thêm mục với tên sai ⇒ `npm run typecheck` đỏ).
([] as (
  | Extract<(typeof THANH_BEN)[number], { bieuTuong: string }>["bieuTuong"]
  | (typeof THANH_TAB)[number]["bieuTuong"]
  | (typeof CHA_THANH_BEN)[keyof typeof CHA_THANH_BEN]["bieuTuong"]
)[]) satisfies readonly IconName[];

/**
 * Thanh tab dưới đáy (điện thoại). Tab nào hiện cho ai: `thanhTab()` của bảng mục (src/shared/muc-giao-dien.ts — THANH_TAB). Tóm tắt hôm nay: văn phòng lập được đơn
 * có Trang chủ / Đơn hàng / Tạo đơn; Kế toán (xem đơn, không lập — ADR-0007) không có Tạo đơn; Đối tác, Thực tập: Đơn hàng (đơn của họ — lỗi báo 30/9 L3) + Tạo đơn;
 * tài khoản "chỉ tài xế" (ADR-0040 D3): Trang chủ (/tai-xe), tài xế công ty thêm "Cuốc của tôi" (Q5); tài khoản vừa tài xế vừa văn phòng KHÔNG thêm tab (GA-K2b-T2),
 * mở /cuoc từ trang Tôi; Quản trị thêm Dịch vụ, ô account.view thêm Tài khoản (ADR-0071); ai cũng có "Tôi" (sáng ở các trang mở từ trang Tôi — `sangTabToi`).
 */
function tabBar(n: NguoiXem, path: string): HTMLElement {
  const tabs = thanhTab(n);
  const coTabCuoc = tabs.some((t) => t.trang === "cuoc");
  return h(
    "nav",
    { id: "tabbar", "aria-label": "Điều hướng chính" },
    ...tabs.map((t) => {
      // active của "/" khớp CHÍNH XÁC "/" (sangTai so bằng, không so tiền tố) để không sáng đèn cho mọi đường dẫn.
      const sang = t.trang === "toi" ? sangTabToi(path, coTabCuoc) : sangTai(t.trang, path);
      return h(
        "a",
        { href: t.href, class: t.bieuTuong === "plus" ? "tab tab-new" : "tab", "aria-current": sang ? "page" : false },
        h("span", { class: "tab-icon" }, icon(t.bieuTuong as IconName), t.trang === "toi" && helpHasNews() && newDot()),
        h("span", null, t.nhan),
      );
    }),
  );
}

const MAINTENANCE_STRIP_ID = "maint-strip";
/**
 * Dải mảnh dưới thanh đầu trang: "Đang ở chế độ bảo trì — chỉ tài khoản Toàn quyền dùng được" (liên kết tới trang Tôi, nơi tắt). Chỉ tài khoản Toàn quyền (ADR-0071) tới được app lúc bảo trì nên chỉ họ thấy dải này;
 * gọi lại với `on = false` để gỡ (trang Tôi gọi ngay sau khi bật/tắt, khỏi phải tải lại trang).
 */
/** `#strips` (dải mảnh dưới thanh đầu trang, dùng chung với `.ntf-strip` của Thông báo — ADR-0034) — tạo lười, cái nào chạy trước tạo (R7). */
function stripsEl(): HTMLElement {
  let el = document.getElementById("strips");
  if (!el) {
    el = h("div", { id: "strips" });
    document.getElementById("topbar")?.after(el);
  }
  return el;
}

export function setMaintenanceStrip(on: boolean): void {
  document.getElementById(MAINTENANCE_STRIP_ID)?.remove();
  if (on) stripsEl().append(h("a", { class: "maint-strip", id: MAINTENANCE_STRIP_ID, href: "/account" }, "Đang ở chế độ bảo trì — chỉ tài khoản Toàn quyền dùng được"));
}

/** Huỷ thông báo màn hình khoá (Web Push) của ĐÚNG MÁY NÀY trước khi đăng xuất — ADR-0046 (thay ADR-0036 điều 6): đăng xuất
 * chỉ tắt máy đang đăng xuất; các máy khác của cùng tài khoản vẫn đăng nhập nên vẫn nhận (trước đây `tatCa: true` tắt MỌI
 * máy — đăng xuất ở máy tính làm điện thoại mất thông báo, gốc lỗi chủ báo 28/9). Dựa vào kỷ luật phía trình duyệt
 * (`/api/auth/logout` là route công khai, không đọc phiên). Máy chưa từng bật (không có subscription cục bộ) → không có
 * gì để tắt, không gọi máy chủ. `dangXuat: true` để máy chủ ghi lý do `dang-xuat` (khác người dùng tự bấm "Tắt"). */
async function tatThongBaoMayNay(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api("/api/account/thong-bao/may/huy", { method: "POST", body: { endpoint: sub.endpoint, dangXuat: true } }).catch(() => undefined);
        await sub.unsubscribe().catch(() => undefined);
      }
    }
  } catch {
    // bất kỳ lỗi nào (mạng, trình duyệt lạ…): bỏ qua, đăng xuất vẫn tiếp tục ngay sau đây.
  }
}

export async function logout(): Promise<void> {
  xoaKhungNho(); // ADR-0035: máy dùng chung — người sau không thấy khung của người trước
  await Promise.race([tatThongBaoMayNay(), new Promise((resolve) => setTimeout(resolve, 2000))]);
  await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  location.assign("/login");
}

/**
 * ADR-0075 điều 6b: sau đăng nhập, gửi lại địa chỉ nhận thông báo của MÁY NÀY (nếu đã cho phép và đang có đăng ký) để đăng ký mang mã phiên mới — lần đăng nhập
 * máy khác sau đó tắt mọi đăng ký trừ đăng ký của phiên mới nhất. Tối đa một lần mỗi phiên của thẻ (cờ sessionStorage; trang /login xoá cờ). Mọi lỗi bị nuốt —
 * không chặn trang. Không xin quyền, không tạo đăng ký mới (việc đó chỉ ở mục Thông báo của trang Tài khoản).
 */
async function ganPhienThongBaoMayNay(): Promise<void> {
  try {
    if (sessionStorage.getItem(KHOA_GAN_PHIEN_THONG_BAO) === "1") return;
    if (!("Notification" in window) || Notification.permission !== "granted" || !("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await api("/api/account/thong-bao/may", { method: "POST", body: { endpoint: sub.endpoint, thietBi: thietBiTu(navigator.userAgent) } });
    sessionStorage.setItem(KHOA_GAN_PHIEN_THONG_BAO, "1");
  } catch {
    // mạng, trình duyệt lạ, sessionStorage bị chặn: bỏ qua — lần tải trang sau thử lại
  }
}

/**
 * Số mục chưa đọc của Góp ý (phản hồi mới cho tôi + yêu cầu chờ admin). Lỗi mạng → 0, không làm hỏng khung. MỘT lời gọi mỗi lần mở trang dù nhiều nơi cùng cần
 * (thanh bên + dải chào Trang chủ máy tính, thanh bên + trang Tôi) — giữ lời hỏi đang chạy, cùng cách web/vc-dem.ts.
 */
let feedbackBadgeHoi: Promise<number> | null = null;
export function feedbackBadge(): Promise<number> {
  feedbackBadgeHoi ??= api<Api.FeedbackBadgeResponse>("/api/feedback/badge").then(
    (b) => b.mine + b.queue,
    () => 0,
  );
  return feedbackBadgeHoi;
}

/**
 * Số dịch vụ đang lệch giá Sheet (huy hiệu "Dịch vụ & giá" trên thanh bên) — CÙNG PHÉP ĐẾM khối "Cần xem lại" của Trang chủ (`summarizeCatalogConflicts`: số dịch vụ
 * có ít nhất một xung đột giá), nhưng gọi route đếm riêng `GET /api/catalog/dem-xung-dot` (cổng admin + `admin.manage`, MỘT con số) thay vì tải nguyên
 * `GET /api/catalog/admin` (cả danh mục kèm giá) ở MỌI trang (nghiên cứu tốc độ 2026-10-02, đợt 1 việc 3). Chỉ gọi khi ĐÃ BIẾT là admin (tránh 403 cho phần lớn tài
 * khoản mở bất kỳ trang nào). Lỗi mạng → 0, giống feedbackBadge().
 */
async function catalogConflictBadge(): Promise<number> {
  try {
    return (await api<Api.CatalogConflictCountResponse>("/api/catalog/dem-xung-dot")).conflictCount;
  } catch {
    return 0;
  }
}

/**
 * Huy hiệu "Đơn hàng" = SỐ ĐƠN CHƯA XÁC NHẬN, không phải tổng số đơn (quyết định 8 của chủ dự án,
 * `docs/superpowers/specs/2026-09-23-trang-chu-moi-quyet-dinh.md`). Lấy bằng route đếm riêng `GET /api/orders/dem-nhap` (MỘT câu D1, cùng số `draftCount` của Trang chủ)
 * thay vì tải nguyên `GET /api/orders/dashboard` (~15 câu) ở MỌI trang (nghiên cứu tốc độ 2026-10-02, đợt 1 việc 3). Lỗi mạng → 0, giống feedbackBadge(). Route khai cổng
 * "orders" và hỏi cùng ba ô quyền với dashboard (`order.view` + `money.view` + `contact.view`) nên chỉ gắn cho người xem được mọi đơn (`seesAll`) — mục "Đơn hàng" của
 * Đối tác/Thực tập không có huy hiệu.
 */
async function draftOrderBadge(): Promise<number> {
  try {
    return (await api<Api.DraftCountResponse>("/api/orders/dem-nhap")).draftCount;
  } catch {
    return 0;
  }
}

interface NavItem {
  href: string;
  label: string;
  /** Mục con (Vận chuyển → Xe, Sắp hết hạn, …) không có biểu tượng (bản vẽ Vận chuyển). */
  icon?: IconName;
  /** "parent": mục cha KHÔNG phải liên kết, luôn mở (bản vẽ Vận chuyển, quyết định 1); "sub": mục con thụt lề. */
  kind?: "parent" | "sub";
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
 * Phần CHỈ TRÌNH BÀY của mục thanh bên (không quyết ai thấy mục — việc đó ở bảng mục): huy hiệu số và chấm "Có bản mới".
 * "Đơn hàng" = số đơn CHƯA XÁC NHẬN (quyết định 8 của chủ dự án), chỉ cho người xem mọi đơn (route đếm hỏi cùng ba ô với dashboard) — mục "Đơn hàng" của Đối tác,
 * Thực tập (lỗi báo 30/9 L3) không có huy hiệu. "Sắp hết hạn" (Vận chuyển, ADR-0040 D1) = số giấy đã hết + sắp hết.
 */
function trinhBay(k: KhoaTrang, seesAll: boolean): Pick<NavItem, "badge" | "badgeClass" | "dot"> {
  switch (k) {
    case "donHang":
      return seesAll ? { badge: draftOrderBadge } : {};
    case "dichVu":
      return { badge: catalogConflictBadge, badgeClass: "sidebar-item-badge-sand" };
    case "sapHetHan":
      return { badge: demSapHetHan, badgeClass: "sidebar-item-badge-sand" };
    case "gopY":
      return { badge: feedbackBadge, badgeClass: "sidebar-item-badge-accent" };
    case "troGiup":
      return { dot: helpHasNews };
    default:
      return {};
  }
}

/**
 * Ba nhóm của thanh điều hướng dọc (ADR-0015, máy tính ≥900px): mục nào hiện cho ai do `thanhBen()` của bảng mục quyết (src/shared/muc-giao-dien.ts —
 * THANH_BEN, cùng bảng quyền với máy chủ). Nhóm rỗng bị lọc ở sidebar() (ẩn cả tiêu đề, đặc tả §3.1). Mục cha "Vận chuyển" sáng khi đang ở trang của BẤT KỲ mục con nào.
 */
function navGroups(n: NguoiXem, path: string): NavGroup[] {
  const seesAll = ("staff" in n ? coKhungNho(n.staff) : n.khungNho).seesAll;
  return thanhBen(n, path).map(({ nhom, muc }) => ({
    title: nhom,
    items: muc.map((m): NavItem =>
      m.kieu === "cha"
        ? { href: "", label: m.nhan, icon: m.bieuTuong as IconName, kind: "parent", active: (p) => m.con.some((k) => sangTai(k, p)) }
        : {
            href: m.href,
            label: m.nhan,
            ...(m.bieuTuong ? { icon: m.bieuTuong as IconName } : {}),
            ...(m.con ? { kind: "sub" as const } : {}),
            ...trinhBay(m.trang, seesAll),
            active: (p) => sangTai(m.trang, p),
          },
    ),
  }));
}

/**
 * `loaders` gom lại lời gọi huy hiệu thay vì bắn ngay: chỉ chạy khi thanh bên THẬT SỰ hiển thị (xem addNav()) —
 * ở khổ điện thoại thanh bên bị CSS ẩn nên ba lời gọi kia chỉ tốn mạng trên chính thiết bị yếu nhất.
 */
function sidebarItem(item: NavItem, path: string, loaders: (() => void)[]): HTMLElement {
  const iconEl = item.icon ? h("span", { class: "sidebar-item-icon" }, icon(item.icon, 18)) : null;
  const labelEl = h("span", { class: "sidebar-item-label" }, item.label, item.dot?.() && newDot());
  // Mục cha "Vận chuyển": chữ trắng khi đang ở một mục con, nền sáng chỉ ở mục con đang chọn (bản vẽ 00).
  if (item.kind === "parent") return h("div", { class: item.active(path) ? "sidebar-item sidebar-parent is-open-parent" : "sidebar-item sidebar-parent" }, iconEl, labelEl);
  const a = h(
    "a",
    { class: item.kind === "sub" ? "sidebar-item sidebar-sub" : "sidebar-item", href: item.href, "aria-current": item.active(path) ? "page" : false },
    iconEl,
    labelEl,
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
function sidebar(n: NguoiXem, path: string, staff: Staff | null, loaders: (() => void)[], tat = ""): HTMLElement {
  const groups = navGroups(n, path)
    .map((g) => sidebarGroup(g, path, loaders))
    .filter((g): g is HTMLElement => g !== null);
  // `staff` null = khung tạm từ bản nhớ (ADR-0035): chân thanh chỉ có chữ cái đầu, tên/vai điền khi /api/auth/me về.
  const roleLabel = staff ? staff.permissions.map((p) => PERMISSION_LABEL[p]).join(" · ") || "Chưa có quyền" : "";
  const logoutBtn = h("button", { class: "sidebar-logout", type: "button" }, "Đăng xuất");
  logoutBtn.addEventListener("click", () => void logout());
  return h(
    "nav",
    { id: "sidebar", "aria-label": "Điều hướng chính" },
    h(
      "a",
      { class: "sidebar-head", href: "/" },
      h("span", { class: "brand" }, h("img", { class: "brand-logo", src: "/icons/logo-96.png", alt: "", width: 30, height: 30, decoding: "sync" }), h("span", { class: "brand-name" }, "Island Booking ", h("span", null, "System"))),
    ),
    h("div", { class: "sidebar-groups" }, ...groups),
    h(
      "div",
      { class: "sidebar-foot" },
      h("span", { class: "sidebar-avatar", "aria-hidden": "true" }, staff ? initials(staff.fullName) : tat),
      h("span", { class: "sidebar-who" }, h("span", { class: "sidebar-name" }, staff?.fullName ?? ""), h("span", { class: "sidebar-role" }, roleLabel)),
      logoutBtn,
    ),
  );
}


/**
 * Chữ breadcrumb trên thanh công việc: `data-title` của trang → nhãn mục thanh bên ĐẦU TIÊN sáng ở đường này (`nhanTheoDuong` — tra mọi mục, không xét
 * quyền: nhãn không phụ thuộc quyền, việc mục nào hiện vẫn do thanh bên quyết) → tên app. Trang chủ, Đơn hàng, trang đầu tài xế cố ý KHÔNG khai `data-title`
 * (thuộc tính đó còn đổi giao diện điện thoại — ẩn logo và `h1` — mà các màn đó chủ dự án đã duyệt). "/tai-xe" tra ra "Trang chủ" (mục của tài xế).
 */
function barTitleFor(path: string, dataTitle: string | undefined): string {
  return dataTitle || nhanTheoDuong(path) || APP_NAME;
}

/**
 * Bên đặt mà MÁY CHỦ sẽ ép cho tài khoản Đối tác này (trường `benDatCuaToi` của `GET /api/auth/me` — sổ đại lý đợt 1, Task 11; Ruling 21). Gán sau khi `initShell()` có phản hồi `/me`, trước đó null.
 * Form lập đơn chỉ ĐỌC để hiện dòng "Bên đặt: <tên>"; giao diện không tự suy luật. Không đưa vào bản nhớ khung (ADR-0035: năm trường đã duyệt, không thêm).
 */
let benDatMayChuEp: { partyId: string; ten: string } | null = null;
export const benDatCuaToi = (): { partyId: string; ten: string } | null => benDatMayChuEp;

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
    h("a", { class: "brand", href: "/" }, h("img", { class: "brand-logo", src: "/icons/logo-96.png", alt: "", width: 30, height: 30, decoding: "sync" }), h("span", { class: "brand-name" }, "Island Booking ", h("span", null, "System"))),
    // LUÔN dựng (C-1): ở máy tính đây là breadcrumb của mọi trang. Giao diện điện thoại KHÔNG đổi — luật hiển thị ở
    // khổ ≤640px vẫn đòi `body[data-title]`, nên trang không khai `data-title` vẫn hiện logo và không hiện breadcrumb.
    h("span", { class: "bar-title", id: "bar-title" }, barTitleFor(path, title)),
  );

  // Sidebar CẦN biết staff (chân thanh: avatar/tên/vai) nên chỉ dựng được SAU KHI đăng nhập xác nhận — khác tab
  // bar (không cần staff). `has-sidebar` chỉ gắn khi ĐÃ THẬT SỰ dựng #sidebar (không để lưới 236px trống khi
  // mất mạng lúc mở trang — nhánh mất mạng dưới đây không có staff).
  // `tatTam` khác null = vẽ KHUNG TẠM từ bản nhớ (ADR-0035): đánh dấu `data-khung-tam` để gỡ khi /api/auth/me về; chưa nạp huy hiệu. Khung tạm chỉ biết bốn cờ
  // của bản nhớ (5 trường đã duyệt — thêm trường cần ADR): mục nào vẽ được ở khung tạm khai `tam` trong bảng mục; mục khác (tab "Trang chủ" của tài xế,
  // "Quản lý tài khoản" của Hành chính nhân sự — bảng dùng `admin` thay ô account.view…) thiếu một nhịp, khung thật (sau /api/auth/me) vẽ đủ.
  const addNav = (n: NguoiXem, staff: Staff | null, tatTam: string | null) => {
    if (staff || tatTam !== null) {
      const badgeLoaders: (() => void)[] = [];
      const nav = sidebar(n, path, staff, badgeLoaders, tatTam ?? "");
      document.body.prepend(nav);
      document.body.classList.add("has-sidebar");
      // Huy hiệu chỉ nạp khi thanh bên ĐANG HIỂN THỊ THẬT (`offsetParent` null khi CSS ẩn nó ở khổ hẹp). Hỏi chính
      // trình duyệt thay vì chép mốc 641px sang JS: chép số thì lần sửa CSS sau sẽ làm hai nơi lệch nhau mà không ai biết.
      const loadBadges = () => {
        for (const load of badgeLoaders) load();
      };
      if (tatTam !== null) nav.dataset.khungTam = "1";
      else if (nav.offsetParent !== null) loadBadges();
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
    const tabs = tabBar(n, path);
    if (tatTam !== null) tabs.dataset.khungTam = "1";
    document.body.append(tabs);
    document.body.classList.add("has-tabbar");
  };
  /** Thanh công việc: avatar (điện thoại) + ô tìm + nút "Tạo đơn" — cùng một cách dựng cho khung tạm và khung thật. */
  const thanhCongViec = (tat: string, n: NguoiXem, tam: boolean) => {
    const nodes: HTMLElement[] = [h("span", { class: "bar-avatar", "aria-hidden": "true" }, tat)];
    // Ô tìm đơn / nút "Tạo đơn": ai thấy do `thanhTren()` của bảng mục quyết (THANH_TREN) — cùng đối tượng với mục "Trang chủ" / "Tạo đơn" của thanh bên.
    for (const m of thanhTren(n)) {
      if (m.kieu === "o-tim") {
        const search = h("input", { type: "search", class: "topbar-search", placeholder: "Tìm mã đơn, tên khách, SĐT…", "aria-label": m.nhan });
        search.addEventListener("keydown", (e: KeyboardEvent) => {
          if (e.key !== "Enter") return;
          // Đợt D Task 5: ô tìm (có ở mọi trang của người xem mọi đơn, kể cả Trang chủ) luôn đưa về Đơn hàng kèm bộ lọc — tham số `q` của GET /api/orders.
          location.assign(`${m.href}?q=${encodeURIComponent((e.target as HTMLInputElement).value.trim())}`);
        });
        nodes.push(search);
      } else nodes.push(h("a", { class: "btn btn-accent topbar-new", href: m.href }, m.nhan));
    }
    if (tam) for (const el of nodes) el.dataset.khungTam = "1";
    append(byId("topbar"), nodes);
  };

  // ADR-0035 điều 3: có bản nhớ khung → vẽ khung NGAY (không chờ mạng). /api/auth/me vẫn là nguồn sự thật: về thì gỡ khung tạm, vẽ lại như cũ.
  const nho = layKhungNho();
  if (nho) {
    thanhCongViec(nho.tat, { khungNho: nho }, true);
    addNav({ khungNho: nho }, null, nho.tat);
  }
  let me: Api.MeResponse;
  try {
    me = await api<Api.MeResponse>("/api/auth/me");
  } catch (err) {
    if (err instanceof ApiError) {
      for (const el of document.querySelectorAll("[data-khung-tam]")) el.remove(); // lỗi thật (vd 500): không để khung tạm mồ côi
      document.body.classList.remove("has-sidebar", "has-tabbar");
      throw err;
    }
    // Mất mạng (khung vẫn mở được từ cache): báo rõ thay vì để trang trống, rồi giữ lời gọi treo như goLogin() ở api.ts.
    const el = document.getElementById("error");
    if (el) showError(el, "Không có kết nối mạng. Kiểm tra Wi-Fi hoặc 4G rồi mở lại app.");
    // Không biết vai khi mất mạng: hiện 4 tab cơ bản để còn điều hướng (QA2 Q2-04); không dựng sidebar (thiếu staff cho chân thanh).
    // Có khung tạm từ bản nhớ (ADR-0035) thì giữ nó — đủ mục đúng vai hơn 4 tab cơ bản.
    if (!nho) addNav({ khungNho: KHUNG_MAT_MANG }, null, null);
    return new Promise<never>(() => undefined);
  }
  const { staff } = me;
  benDatMayChuEp = me.benDatCuaToi ?? null;
  datNguoiDangNhap(staff.id); // ADR-0094: vé chống ghi trùng giữ qua "tải lại trang" theo ngăn của tài khoản này
  if (me.maintenance?.on) setMaintenanceStrip(true);
  // Bốn cờ của bản nhớ khung hỏi CÙNG bảng quyền với máy chủ (ADR-0072 mục 4a: `admin` là ô admin.manage, không hỏi mã Quản trị) — `coKhungNho` của bảng mục.
  luuKhungNho({ tat: initials(staff.fullName), ...coKhungNho(staff) });
  // Gỡ khung tạm (nếu có) rồi vẽ khung thật trong CÙNG một lượt chạy — trình duyệt không vẽ khung trống ở giữa.
  for (const el of document.querySelectorAll("[data-khung-tam]")) el.remove();
  document.body.classList.remove("has-sidebar", "has-tabbar");
  thanhCongViec(initials(staff.fullName), { staff }, false);
  ganThongBao(byId("topbar"), staff); // ADR-0034: chỉ khung THẬT có chuông (khung tạm chưa biết soChuaDoc) — ngay sau thanhCongViec(), trước addNav() (R7)

  addNav({ staff }, staff, null);
  batDauBangTin(staff); // Bảng tin (ADR-0022): MỘT kết nối mỗi trang đã đăng nhập; nhánh mất mạng ở trên không tới đây (chưa có `staff`)
  void ganPhienThongBaoMayNay(); // ADR-0075 điều 6b: đăng ký thông báo của máy này mang mã phiên mới
  // Trợ lý Hỗ trợ (ADR-0066 điều 9): nút nổi ở mọi trang đã đăng nhập (initShell không chạy ở /login). CẢ khi đang bảo trì: lúc đó chỉ tài khoản Toàn quyền
  // mới qua được máy chủ (ADR-0071), đúng những người đang dùng app — ẩn trợ lý với họ là sai (chủ báo 30/9 "chưa thấy trợ lý bật lên" khi bảo trì đang bật).
  // ADR-0069 điều 3: nút chỉ dựng khi máy chủ báo tài khoản được dùng (vai đang bật) — hỏi không chặn khung trang.
  void ganTroLy(staff);
  return staff;
}

export function showError(el: HTMLElement, message: string | null): void {
  el.textContent = message ?? "";
  el.hidden = !message;
}
