import { ApiError, api, datNguoiDangNhap, type Staff, type Api } from "./api";
import { PERMISSION_LABEL, can, isOffice, seesAllOrders } from "../src/shared/permissions";
import { TRANG_CUOC, TRANG_DAU_TAI_XE, chiTaiXe, coCuocCuaToi, coMucDonHang } from "../src/shared/start-page";
import { thayDieuPhoiXe } from "../src/shared/dieu-phoi-man";
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

/** Trang của phân hệ Vận chuyển (ADR-0040 D1): mục con "Xe" sáng ở cả ba trang xe; ở điện thoại các trang này mở từ trang Tôi nên tab "Tôi" sáng. */
const TRANG_XE = ["/xe", "/xe-sua", "/xe-chi-tiet"];
const TRANG_SAP_HET_HAN = "/giay-to-sap-het-han";
/** Lịch xe bận (ADR-0055 VK2-A, Vận chuyển Đợt 3 — bản vẽ 2/10): mục con sau "Xe", ô vehicle.manage (câu 3.4: chỉ Quản trị + Toàn quyền). */
const TRANG_LICH_XE_BAN = "/lich-xe-ban";
/** Danh mục giấy tờ, tách 2026-09-28 theo chủ dữ liệu (chủ dự án): loại giấy tờ XE là mục con của "Vận chuyển"; loại giấy tờ NGƯỜI (+ hạng giấy phép lái xe)
 *  là mục danh mục chung của nhóm QUẢN TRỊ, sau "Địa điểm". Cả hai theo ô admin.manage (như dòng "Danh mục giấy tờ" cũ). Đường dẫn cũ /danh-muc-giay-to chỉ
 *  còn chuyển hướng (public/danh-muc-giay-to.html, không JS). Ở điện thoại hai trang mở từ trang Tôi nên tab "Tôi" sáng. */
const TRANG_LOAI_GIAY_TO_XE = "/loai-giay-to-xe";
const TRANG_LOAI_GIAY_TO_NGUOI = "/loai-giay-to-nguoi";
/** Bảng điều phối lượt 1 (ADR-0049 + ADR-0050; bản vẽ docs/design/van-chuyen-dieu-phoi/ vo-may-tinh): mục con "Điều phối xe" (ô trip.view — sáng ở cả Chi tiết
 *  chuyến và Tạo / sửa chuyến mở từ đó), "Chính sách điều phối" (ô settings.ops — chỉ Toàn quyền; sáng ở cả trang Điều kiện xuất bến mở từ đó) và "Lý do điều
 *  phối" (ô admin.manage). Điện thoại: các trang này mở từ trang Tôi nên tab "Tôi" sáng. */
const TRANG_DIEU_PHOI = ["/dieu-phoi", "/chuyen", "/chuyen-sua"];
/** Vận chuyển Đợt 5 (bản vẽ V11 bảng 11.1): mục con "Xe đang chạy" ngay sau "Điều phối xe", cùng ô trip.view; chuyến mở từ đây vẫn là Chi tiết chuyến. */
const TRANG_XE_DANG_CHAY = "/xe-dang-chay";
/** "Cuốc của tôi" của tài xế (Q5): danh sách + màn một chuyến (xuất bến / đang chạy). */
const TRANG_CUOC_CAC = [TRANG_CUOC, "/cuoc-chuyen"];
/** A4 T9 (ADR-0053 D9, G-A4-16): "Báo bận của tôi" — chỉ tài khoản "chỉ tài xế" có ô unavailability.self (own, hỏi kèm ngữ cảnh chính mình). */
const TRANG_BAN = "/ban";
const TRANG_CHINH_SACH = ["/chinh-sach-dieu-phoi", "/dieu-kien-xuat-ben"];
const TRANG_LY_DO = "/ly-do-dieu-phoi";
const TRANG_TRO_LY = "/tro-ly-cai-dat"; // ADR-0069: bảng điều khiển trợ lý Hỗ trợ (chỉ Toàn quyền)
const TRANG_GIAO_DIEN = "/giao-dien"; // ADR-0087: màn Giao diện công ty (chỉ Toàn quyền)
/** ADR-0075 điều 7: sổ phiên đăng nhập của mọi tài khoản — chỉ IT/Toàn quyền (ô auth.session.viewAll). Ở điện thoại mở từ trang Tôi nên tab "Tôi" sáng. */
const TRANG_PHIEN = "/sessions";
/** Tiền xe thuê (ADR-0057 T1/T2; bản vẽ Đợt 4 "Chi phí xe thuê"): hai mục con dưới "Vận chuyển", ngay sau "Điều phối xe" — "Bảng giá thuê xe" (ô
 *  transport.rate.view), "Bảng kê chi phí xe" (ô transport.cost.view). Điện thoại: mở từ trang Tôi nên tab "Tôi" sáng. */
const TRANG_BANG_GIA = "/bang-gia-xe";
const TRANG_BANG_KE = "/bang-ke-xe";

interface Tab {
  href: string;
  label: string;
  icon: IconName;
  active: (path: string) => boolean;
}

/**
 * Thanh tab dưới đáy (điện thoại): nhân sự lập được đơn 4 tab, admin 6 tab; kế toán (xem đơn nhưng không lập đơn — ADR-0007) không có tab Đơn mới; tài khoản chỉ-FIELD chỉ có tab Tôi (việc được giao thuộc N2).
 * Đối tác, Thực tập (lập đơn, chỉ xem đơn mình lập): "Đơn hàng" (danh sách đơn của họ — `coMucDonHang`, lỗi báo 30/9 L3), "Tạo đơn", "Tôi".
 * /order thuộc tab Đơn hàng, /audit thuộc tab Tôi. Trang Danh bạ/Địa điểm có ở thanh điều hướng trên và ở mục liên kết của tab Tôi (chưa có thiết kế điện thoại riêng).
 * Tài xế (`taiXe` — tài khoản "chỉ tài xế", `chiTaiXe`; ADR-0040 D3, bản vẽ Vận chuyển vo-dien-thoai role=driver): tab Trang chủ (/tai-xe) + Tôi; tài xế công ty
 * (`cuoc`, Q5 — bản vẽ Bảng điều phối) thêm "Cuốc của tôi" (/cuoc, trang mở đầu) ở giữa. Tài khoản vừa tài xế công ty vừa văn phòng (kiểm độc lập K2b T2,
 * điều phối chốt — giả định bề mặt GA-K2b-T2): KHÔNG thêm tab (thanh tab văn phòng đã đủ chỗ), mở /cuoc từ trang Tôi; thanh bên có mục "Cuốc của tôi" ở nhóm TÔI.
 */
function tabsFor(admin: boolean, seesAll: boolean, canCreate: boolean, taiXe = false, cuoc = false, taiKhoan = admin, baoBan = false): Tab[] {
  // ADR-0071: tab "Tài khoản" theo ô account.view (`taiKhoan`) — Quản trị như cũ, thêm Hành chính nhân sự (và tài khoản chỉ Toàn quyền); "Dịch vụ" giữ theo quyền Quản trị.
  const adminTabs: Tab[] = [
    ...(admin ? [{ href: "/catalog", label: "Dịch vụ", icon: "services" as const, active: (p: string) => p === "/catalog" }] : []),
    ...(taiKhoan ? [{ href: "/staff", label: "Tài khoản", icon: "staff" as const, active: (p: string) => p === "/staff" }] : []),
  ];
  const officeTabs: Tab[] = [];
  // Đợt D Task 5 (ADR-0015 điều 4): trang mặc định đổi chỗ — "/" nay là Trang chủ, "/orders" là Đơn hàng.
  // active() của "/" phải khớp CHÍNH XÁC "/" (không dùng startsWith/prefix) để không lỡ sáng đèn cho mọi đường dẫn.
  if (seesAll) officeTabs.push({ href: "/", label: "Trang chủ", icon: "home", active: (p) => p === "/" });
  if (coMucDonHang({ seesAll, canCreate })) officeTabs.push({ href: "/orders", label: "Đơn hàng", icon: "orders", active: (p) => p === "/orders" || p === "/order" });
  if (canCreate) officeTabs.push({ href: "/order-form", label: "Tạo đơn", icon: "plus", active: (p) => p === "/order-form" });
  if (taiXe) officeTabs.push({ href: TRANG_DAU_TAI_XE, label: "Trang chủ", icon: "home", active: (p) => p === TRANG_DAU_TAI_XE });
  // Q5 (ADR-0049, bản vẽ Bảng điều phối vo-dien-thoai role=driver): tài xế công ty có tab "Cuốc của tôi" (trang mở đầu) giữa "Trang chủ" và "Tôi".
  // A4 T9 (G-A4-16): biểu tượng Cuốc → `assign`; "Báo bận của tôi" → `clock`, ngay sau Cuốc.
  if (cuoc) officeTabs.push({ href: TRANG_CUOC, label: "Cuốc của tôi", icon: "assign", active: (p) => TRANG_CUOC_CAC.includes(p) });
  if (baoBan) officeTabs.push({ href: TRANG_BAN, label: "Báo bận của tôi", icon: "clock", active: (p) => p === TRANG_BAN });
  return [
    ...officeTabs,
    ...adminTabs,
    { href: "/account", label: "Tôi", icon: "me", active: (p) => p === "/account" || p === "/audit" || p === "/help" || p === "/gui-thong-bao" || TRANG_XE.includes(p) || p === TRANG_LICH_XE_BAN || p === TRANG_SAP_HET_HAN || p === TRANG_LOAI_GIAY_TO_XE || p === TRANG_LOAI_GIAY_TO_NGUOI || TRANG_CHINH_SACH.includes(p) || p === TRANG_LY_DO || TRANG_DIEU_PHOI.includes(p) || p === TRANG_TRO_LY || p === TRANG_GIAO_DIEN || p === TRANG_PHIEN || p === TRANG_BANG_GIA || p === TRANG_BANG_KE || p === TRANG_XE_DANG_CHAY || (!cuoc && TRANG_CUOC_CAC.includes(p)) },
  ];
}

function tabBar(admin: boolean, seesAll: boolean, canCreate: boolean, path: string, taiXe = false, cuoc = false, taiKhoan = admin, baoBan = false): HTMLElement {
  return h(
    "nav",
    { id: "tabbar", "aria-label": "Điều hướng chính" },
    ...tabsFor(admin, seesAll, canCreate, taiXe, cuoc, taiKhoan, baoBan).map((t) =>
      h("a", { href: t.href, class: t.icon === "plus" ? "tab tab-new" : "tab", "aria-current": t.active(path) ? "page" : false }, h("span", { class: "tab-icon" }, icon(t.icon), t.href === "/account" && helpHasNews() && newDot()), h("span", null, t.label)),
    ),
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
  /** Mục con (Vận chuyển → Xe, Sắp hết hạn, Loại giấy tờ xe) không có biểu tượng (bản vẽ Vận chuyển). */
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
 * Ba nhóm của thanh điều hướng dọc (ADR-0015, máy tính ≥900px). Mục nào hiện cho ai giữ ĐÚNG luật đang dùng ở
 * tabsFor()/nav ngang cũ (office/admin/canCreate) — KHÔNG tự đổi bản đồ quyền (đặc tả §3.1). Nhóm rỗng bị lọc ở
 * sidebar() (ẩn cả tiêu đề, đặc tả §3.1).
 */
function navGroups(admin: boolean, seesAll: boolean, office: boolean, canCreate: boolean, nhatKy: boolean, path: string, taiXe = false, vehicle = false, danhMuc = false, chinhSach = false, dieuPhoi = false, cuoc = false, taiKhoan = admin, guiThongBao = false, phien = false, bangGia = false, bangKe = false, baoBan = false): NavGroup[] {
  const sales: NavItem[] = [];
  // Đợt D Task 5 (ADR-0015 điều 4): "/" nay là Trang chủ, "/orders" là Đơn hàng — active() của "/" phải khớp
  // CHÍNH XÁC "/" (không phải mọi đường dẫn bắt đầu bằng "/").
  if (seesAll) sales.push({ href: "/", label: "Trang chủ", icon: "home", active: (p) => p === "/" });
  // Huy hiệu "Đơn hàng" = số đơn CHƯA XÁC NHẬN (quyết định 8 của chủ dự án đã chốt nghĩa của con số này), màu mặc định như bản mẫu.
  // Đối tác, Thực tập (lỗi báo 30/9, L3 — `coMucDonHang`): có mục, KHÔNG huy hiệu (số lấy từ route Trang chủ, 403 với họ).
  if (coMucDonHang({ seesAll, canCreate })) sales.push({ href: "/orders", label: "Đơn hàng", icon: "orders", badge: seesAll ? draftOrderBadge : undefined, active: (p) => p === "/orders" || p === "/order" });
  if (canCreate) sales.push({ href: "/order-form", label: "Tạo đơn", icon: "plus", active: (p) => p === "/order-form" });
  if (office) sales.push({ href: "/parties", label: "Danh bạ", icon: "contact-card", active: (p) => p === "/parties" });

  // ADR-0071: "Quản lý tài khoản" theo ô account.view (`taiKhoan`) — Quản trị giữ đúng ba mục như cũ; Hành chính nhân sự chỉ có mục này trong nhóm QUẢN TRỊ.
  const management: NavItem[] = [
    ...(admin ? [{ href: "/catalog", label: "Dịch vụ & giá", icon: "services" as const, badge: catalogConflictBadge, badgeClass: "sidebar-item-badge-sand", active: (p: string) => p === "/catalog" }] : []),
    ...(taiKhoan ? [{ href: "/staff", label: "Quản lý tài khoản", icon: "staff" as const, active: (p: string) => p === "/staff" }] : []),
    // ADR-0075 điều 7 (đặc tả §5b: "trong Quản lý tài khoản"): ngay sau "Quản lý tài khoản" — ô auth.session.viewAll (cờ `phien`, chỉ Toàn quyền).
    ...(phien ? [{ href: TRANG_PHIEN, label: "Phiên đăng nhập", icon: "lock" as const, active: (p: string) => p === TRANG_PHIEN }] : []),
    ...(admin ? [{ href: "/locations", label: "Địa điểm", icon: "pin" as const, active: (p: string) => p === "/locations" }] : []),
  ];
  // Loại giấy tờ cá nhân (danh mục chung — giấy tờ thuộc về người; tách 2026-09-28): ngay sau "Địa điểm", trước "Vận chuyển". Ô admin.manage.
  if (danhMuc) management.push({ href: TRANG_LOAI_GIAY_TO_NGUOI, label: "Loại giấy tờ cá nhân", icon: "doc-check", active: (p) => p === TRANG_LOAI_GIAY_TO_NGUOI });
  // Vận chuyển (ADR-0040 D1, ô vehicle.manage; bản vẽ 00): mục cha sau Địa điểm, luôn mở các mục con; huy hiệu cát ở "Sắp hết hạn" = số giấy đã hết + sắp hết.
  // Mục con "Loại giấy tờ xe" (tách 2026-09-28) cần THÊM ô admin.manage (route sửa danh mục hỏi ô này) — hôm nay mọi người giữ vehicle.manage đều giữ admin.manage.
  // Bảng điều phối lượt 1 (Q-B-4): mục cha hiện khi có ô vehicle.manage HOẶC trip.view; "Điều phối xe" là mục con đầu (ô trip.view — Bán hàng, Kế toán thấy
  // nhóm QUẢN TRỊ chỉ với "Vận chuyển › Điều phối xe", như bản vẽ vo-may-tinh); các mục con cũ giữ nguyên ô của chúng. Không huy hiệu (chưa có nguồn số).
  if (vehicle || dieuPhoi || bangGia || bangKe) {
    management.push({
      href: "", label: "Vận chuyển", icon: "truck", kind: "parent",
      active: (p) => TRANG_DIEU_PHOI.includes(p) || p === TRANG_XE_DANG_CHAY || p === TRANG_BANG_GIA || p === TRANG_BANG_KE || TRANG_XE.includes(p) || p === TRANG_LICH_XE_BAN || p === TRANG_SAP_HET_HAN || p === TRANG_LOAI_GIAY_TO_XE || TRANG_CHINH_SACH.includes(p) || p === TRANG_LY_DO,
    });
    if (dieuPhoi) {
      management.push(
        { href: TRANG_DIEU_PHOI[0]!, label: "Điều phối xe", kind: "sub", active: (p) => TRANG_DIEU_PHOI.includes(p) },
        { href: TRANG_XE_DANG_CHAY, label: "Xe đang chạy", kind: "sub", active: (p) => p === TRANG_XE_DANG_CHAY },
      );
    }
    // Tiền xe thuê (bản vẽ Đợt 4 — thứ tự "Chuyến xe, Bảng giá thuê xe, Bảng kê chi phí xe"; "Chuyến xe" của bản vẽ = "Điều phối xe"): không biểu tượng, không huy hiệu.
    // Gộp Đợt 4 vào Đợt 5: "Xe đang chạy" (Đợt 5) đứng ngay sau "Điều phối xe", trước hai mục tiền xe thuê.
    if (bangGia) management.push({ href: TRANG_BANG_GIA, label: "Bảng giá thuê xe", kind: "sub", active: (p) => p === TRANG_BANG_GIA });
    if (bangKe) management.push({ href: TRANG_BANG_KE, label: "Bảng kê chi phí xe", kind: "sub", active: (p) => p === TRANG_BANG_KE });
  }
  if (vehicle) {
    management.push(
      { href: "/xe", label: "Xe", kind: "sub", active: (p) => TRANG_XE.includes(p) },
      { href: TRANG_LICH_XE_BAN, label: "Lịch xe bận", kind: "sub", active: (p) => p === TRANG_LICH_XE_BAN },
      { href: TRANG_SAP_HET_HAN, label: "Sắp hết hạn", kind: "sub", badge: demSapHetHan, badgeClass: "sidebar-item-badge-sand", active: (p) => p === TRANG_SAP_HET_HAN },
    );
    if (danhMuc) management.push({ href: TRANG_LOAI_GIAY_TO_XE, label: "Loại giấy tờ xe", kind: "sub", active: (p) => p === TRANG_LOAI_GIAY_TO_XE });
    // Bảng điều phối lượt 1 (bản vẽ vo-may-tinh — thứ tự: Điều phối xe, Xe, Sắp hết hạn, Loại giấy tờ xe, Chính sách điều phối, Lý do điều phối).
    if (chinhSach) management.push({ href: TRANG_CHINH_SACH[0]!, label: "Chính sách điều phối", kind: "sub", active: (p) => TRANG_CHINH_SACH.includes(p) });
    if (danhMuc) management.push({ href: TRANG_LY_DO, label: "Lý do điều phối", kind: "sub", active: (p) => p === TRANG_LY_DO });
  }
  // ADR-0038 điều 6: trang Nhật ký chỉ Toàn quyền (ô audit.view — cờ `nhatKy`).
  if (nhatKy) management.push({ href: "/audit", label: "Nhật ký", icon: "history", active: (p) => p === "/audit" });
  // ADR-0034 Task 8: ô notice.send (cờ `guiThongBao`) — tài khoản chỉ Toàn quyền (không có Quản trị) vẫn thấy nhóm QUẢN TRỊ với mục này.
  if (guiThongBao) management.push({ href: "/gui-thong-bao", label: "Gửi thông báo", icon: "megaphone", active: (p) => p === "/gui-thong-bao" });
  // ADR-0069 điều 1: bảng điều khiển trợ lý Hỗ trợ — chỉ Toàn quyền (ô settings.ops, cùng cờ `chinhSach`).
  if (chinhSach) management.push({ href: TRANG_TRO_LY, label: "Trợ lý Hỗ trợ", icon: "chat", active: (p) => p === TRANG_TRO_LY });
  // ADR-0087: màn Giao diện công ty — chỉ Toàn quyền (ô settings.ops, cùng cờ `chinhSach`).
  if (chinhSach) management.push({ href: TRANG_GIAO_DIEN, label: "Giao diện", icon: "palette", active: (p) => p === TRANG_GIAO_DIEN });

  const me: NavItem[] = [
    // Tài xế (ADR-0040 D3): "Trang chủ" của họ là /tai-xe — đứng đầu nhóm TÔI (bản vẽ Vận chuyển: menu tài xế "Trang chủ, Của tôi"; giữ vỏ thật: Góp ý, Trợ giúp).
    ...(taiXe ? [{ href: TRANG_DAU_TAI_XE, label: "Trang chủ", icon: "home" as const, active: (p: string) => p === TRANG_DAU_TAI_XE }] : []),
    ...(cuoc ? [{ href: TRANG_CUOC, label: "Cuốc của tôi", icon: "assign" as const, active: (p: string) => TRANG_CUOC_CAC.includes(p) }] : []),
    ...(baoBan ? [{ href: TRANG_BAN, label: "Báo bận của tôi", icon: "clock" as const, active: (p: string) => p === TRANG_BAN }] : []),
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
function sidebar(admin: boolean, seesAll: boolean, office: boolean, canCreate: boolean, path: string, staff: Staff | null, loaders: (() => void)[], tat = "", nhatKy = false, taiXe = false, vehicle = false, danhMuc = false, chinhSach = false, dieuPhoi = false, cuoc = false, taiKhoan = admin, guiThongBao = false, phien = false, bangGia = false, bangKe = false, baoBan = false): HTMLElement {
  const groups = navGroups(admin, seesAll, office, canCreate, nhatKy, path, taiXe, vehicle, danhMuc, chinhSach, dieuPhoi, cuoc, taiKhoan, guiThongBao, phien, bangGia, bangKe, baoBan)
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
 * Chữ breadcrumb trên thanh công việc: `data-title` của trang → nhãn mục điều hướng đang mở → tên app.
 * Trang chủ và Đơn hàng cố ý KHÔNG khai `data-title` (thuộc tính đó còn đổi cả giao diện điện thoại — ẩn logo và
 * ẩn `h1` — mà hai màn đó chủ dự án đã duyệt), nên trước đây ô breadcrumb của chúng bỏ trống ở máy tính. Tra nhãn
 * từ `navGroups` với đủ quyền: đây chỉ là tra NHÃN THEO ĐƯỜNG DẪN (nhãn không phụ thuộc quyền); việc mục nào được
 * hiện vẫn do `navGroups(admin, seesAll, office, canCreate)` quyết ở sidebar(), không nới quyền của ai.
 */
function barTitleFor(path: string, dataTitle: string | undefined): string {
  if (dataTitle) return dataTitle;
  // `taiXe` true: "/tai-xe" tra ra "Trang chủ" (mục của tài xế đứng SAU "Trang chủ" "/" của nhóm BÁN HÀNG nên không giành đường dẫn "/").
  for (const group of navGroups(true, true, true, true, true, path, true, true, true, true)) {
    const item = group.items.find((it) => it.active(path) && it.kind !== "parent");
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
    h("a", { class: "brand", href: "/" }, h("img", { class: "brand-logo", src: "/icons/logo-96.png", alt: "", width: 30, height: 30, decoding: "sync" }), h("span", { class: "brand-name" }, "Island Booking ", h("span", null, "System"))),
    // LUÔN dựng (C-1): ở máy tính đây là breadcrumb của mọi trang. Giao diện điện thoại KHÔNG đổi — luật hiển thị ở
    // khổ ≤640px vẫn đòi `body[data-title]`, nên trang không khai `data-title` vẫn hiện logo và không hiện breadcrumb.
    h("span", { class: "bar-title", id: "bar-title" }, barTitleFor(path, title)),
  );

  // Sidebar CẦN biết staff (chân thanh: avatar/tên/vai) nên chỉ dựng được SAU KHI đăng nhập xác nhận — khác tab
  // bar (không cần staff). `has-sidebar` chỉ gắn khi ĐÃ THẬT SỰ dựng #sidebar (không để lưới 236px trống khi
  // mất mạng lúc mở trang — nhánh addNav(false) dưới đây không có staff).
  // `tatTam` khác null = vẽ KHUNG TẠM từ bản nhớ (ADR-0035): đánh dấu `data-khung-tam` để gỡ khi /api/auth/me về; chưa nạp huy hiệu.
  // `taiXe` (ADR-0040 D3) không có trong bản nhớ khung (5 trường đã duyệt, ADR-0035 — thêm trường cần ADR): khung tạm của tài xế thiếu tab "Trang chủ" một
  // nhịp, khung thật (sau /api/auth/me) vẽ đủ.
  // `taiKhoan` (ADR-0071, ô account.view) không có trong bản nhớ khung (5 trường đã duyệt, ADR-0035): khung tạm dùng `admin` thay — tài khoản Hành chính nhân sự
  // thiếu mục "Quản lý tài khoản" một nhịp, khung thật vẽ đủ (như tiền lệ `taiXe`).
  const addNav = (admin: boolean, seesAll = true, office = seesAll, canCreate = seesAll, staff: Staff | null = null, tatTam: string | null = null, nhatKy = false, taiXe = false, vehicle = false, danhMuc = false, chinhSach = false, dieuPhoi = false, cuoc = false, taiKhoan = admin, guiThongBao = false, phien = false, bangGia = false, bangKe = false, baoBan = false) => {
    if (staff || tatTam !== null) {
      const badgeLoaders: (() => void)[] = [];
      const nav = sidebar(admin, seesAll, office, canCreate, path, staff, badgeLoaders, tatTam ?? "", nhatKy, taiXe, vehicle, danhMuc, chinhSach, dieuPhoi, cuoc, taiKhoan, guiThongBao, phien, bangGia, bangKe, baoBan);
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
    // Tab "Cuốc của tôi" CHỈ cho tài khoản "chỉ tài xế"; tài khoản vừa tài xế vừa văn phòng (K2b T2) mở /cuoc từ trang Tôi (tab "Tôi" sáng).
    // `baoBan` (A4 T9) không có trong bản nhớ khung (5 trường đã duyệt, ADR-0035): khung tạm thiếu tab "Báo bận" một nhịp, như tiền lệ `taiXe`.
    const tabs = tabBar(admin, seesAll, canCreate, path, taiXe, taiXe && cuoc, taiKhoan, taiXe && baoBan);
    if (tatTam !== null) tabs.dataset.khungTam = "1";
    document.body.append(tabs);
    document.body.classList.add("has-tabbar");
  };
  /** Thanh công việc: avatar (điện thoại) + ô tìm + nút "Tạo đơn" — cùng một cách dựng cho khung tạm và khung thật. */
  const thanhCongViec = (tat: string, seesAll: boolean, canCreate: boolean, tam: boolean) => {
    const avatarEl = h("span", { class: "bar-avatar", "aria-hidden": "true" }, tat);
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
    const nodes = [avatarEl, search, newOrderBtn].filter((n): n is HTMLElement => n !== null);
    if (tam) for (const n of nodes) n.dataset.khungTam = "1";
    append(byId("topbar"), nodes);
  };

  // ADR-0035 điều 3: có bản nhớ khung → vẽ khung NGAY (không chờ mạng). /api/auth/me vẫn là nguồn sự thật: về thì gỡ khung tạm, vẽ lại như cũ.
  const nho = layKhungNho();
  if (nho) {
    thanhCongViec(nho.tat, nho.seesAll, nho.canCreate, true);
    addNav(nho.admin, nho.seesAll, nho.office, nho.canCreate, null, nho.tat);
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
    if (!nho) addNav(false);
    return new Promise<never>(() => undefined);
  }
  const { staff } = me;
  datNguoiDangNhap(staff.id); // ADR-0094: vé chống ghi trùng giữ qua "tải lại trang" theo ngăn của tài khoản này
  if (me.maintenance?.on) setMaintenanceStrip(true);
  // ADR-0072 mục 4a: cờ `admin` (Dịch vụ & giá, Địa điểm, tab Dịch vụ) hỏi bảng quyền — ô admin.manage, cùng ô máy chủ hỏi — không hỏi mã Quản trị.
  const admin = can(staff, "admin.manage");
  const seesAll = seesAllOrders(staff); // Trang chủ, Đơn hàng, ô tìm đơn, huy hiệu đơn nháp
  const office = isOffice(staff); // chỉ mục "Danh bạ" (cổng văn phòng, ADR-0019)
  const canCreate = can(staff, "order.create"); // kế toán xem được đơn nhưng không lập đơn (ADR-0007): ẩn nút thay vì để bị 403 sau khi điền xong

  luuKhungNho({ tat: initials(staff.fullName), admin, seesAll, office, canCreate });
  // Gỡ khung tạm (nếu có) rồi vẽ khung thật trong CÙNG một lượt chạy — trình duyệt không vẽ khung trống ở giữa.
  for (const el of document.querySelectorAll("[data-khung-tam]")) el.remove();
  document.body.classList.remove("has-sidebar", "has-tabbar");
  thanhCongViec(initials(staff.fullName), seesAll, canCreate, false);
  ganThongBao(byId("topbar"), staff); // ADR-0034: chỉ khung THẬT có chuông (khung tạm chưa biết soChuaDoc) — ngay sau thanhCongViec(), trước addNav() (R7)

  // `danhMuc` (ô admin.manage — hai trang Loại giấy tờ xe / người, Lý do điều phối) và `chinhSach` (ô settings.ops — Chính sách điều phối) như `vehicle`: chỉ
  // khung THẬT biết (bản nhớ khung chỉ 5 trường đã duyệt, ADR-0035).
  addNav(admin, seesAll, office, canCreate, staff, null, can(staff, "audit.view"), chiTaiXe(staff), can(staff, "vehicle.manage"), can(staff, "admin.manage"), can(staff, "settings.ops"), thayDieuPhoiXe(staff), coCuocCuaToi(staff), can(staff, "account.view"), can(staff, "notice.send"), can(staff, "auth.session.viewAll"), can(staff, "transport.rate.view"), can(staff, "transport.cost.view"), chiTaiXe(staff) && can(staff, "unavailability.self", { ownerId: staff.id }));
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
