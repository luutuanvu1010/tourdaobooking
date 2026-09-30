// Trang khởi đầu theo quyền — logic thuần, gọi từ web/home.ts (Trang chủ ở "/"); có test cạnh tệp.
//
// Từ Đợt D, "/" là Trang chủ, gọi `GET /api/orders/dashboard` (cổng "orders" + `can()` không ngữ cảnh trong thân — ADR-0019). Tài khoản dùng được Đơn hàng nhưng
// KHÔNG xem được mọi đơn (`seesAllOrders` sai — thực tế: chỉ có quyền Đối tác/Thực tập/Hướng dẫn viên, hoặc ghép các quyền đó) sẽ nhận 403 ở đó (mục "Đơn hàng"
// của Đối tác/Thực tập: `coMucDonHang`, từ lỗi báo 30/9). Trước Đợt D, "/" chính là Đơn hàng nên họ vào thẳng danh sách đơn của mình — hàm này giữ lại
// hành vi đó (cách sửa A, chủ dự án chốt 2026-09-24): chuyển sang "/orders". Áp cho MỌI đường vào "/" (sau đăng nhập
// PIN/Face ID, mở app PWA, gõ thẳng địa chỉ, "/home" cũ tự chuyển về "/") vì chỉ đặt ở chính trang "/".
// KHÔNG đổi bản đồ quyền, KHÔNG đổi access của route: chỉ ghép hai hàm quyền sẵn có (ADR-0019: "thấy mọi đơn" là câu hỏi của bảng,
// tách khỏi cổng "vào Hồ sơ").
// Chỉ-FIELD: từ ADR-0030 S23-4/S23-5 (FIELD vào cổng "orders", danh sách = đơn mình đang phụ trách, KHÔNG xem được Trang chủ toàn công ty) cũng được
// chuyển sang "/orders" — mã không đổi, `canAccessOrders` tự đúng khi FIELD có trong ORDERS_GATE. Phải phát hành CÙNG lần với nhánh lọc thứ ba của
// `GET /api/orders` (thiếu nó thì HDV rơi vào trang lỗi 403). ADR-0017 ("FIELD xem mọi đơn", ở lại Trang chủ) không thi công nguyên dạng.
// Tài xế (ADR-0040 D3; Ruling R3, R10 của điều phối 2026-09-28): quyền DRIVER không qua cổng orders — ở lại "/" thì Trang chủ gọi dashboard đơn và nhận 403.
// Tài khoản không xem đơn nào mà có DRIVER được đưa sang trang đầu của tài xế. web/home.ts gọi hàm này và `location.replace` TRƯỚC khi tải dashboard
// (web/home.ts:255-258), nên tài khoản đó không bao giờ gọi route dashboard (trừ lời gọi sớm theo bản nhớ khung trên máy dùng chung — kết quả 403 bị bỏ).
import { canAccessOrders, hasPermission, seesAllOrders, type PermissionHolder } from "./permissions.ts";

/**
 * Trang đầu của tài khoản chỉ có phần Tài xế (ADR-0040 D3, Ruling R3): màn "/tai-xe" (màn 07 của bản vẽ docs/design/van-chuyen-1a/ — public/tai-xe.html,
 * web/tai-xe.ts), dựng ở Phần B. Trước đó Ruling R10 tạm dùng trang Tài khoản. Thanh tab / menu của tài xế (web/shell.ts) cũng dựa vào hằng này.
 */
export const TRANG_DAU_TAI_XE = "/tai-xe";

/**
 * "Cuốc của tôi" (ADR-0049 V5, bản vẽ Bảng điều phối 04 — tab mở đầu của tài xế; Q5 điều phối vòng 3): trang đầu của tài xế CÔNG TY. "/tai-xe" giữ giấy tờ
 * (tab "Trang chủ" của tài xế). Thanh tab / menu của tài xế (web/shell.ts) dựa vào hằng này.
 */
export const TRANG_CUOC = "/cuoc";
/** Tài xế công ty (DRIVER — ô trip.view / trip.progress "assigned") có "Cuốc của tôi"; tài xế đối tác (DRIVER_PARTNER) chưa dùng chuyến (ADR-0049 D3 × ADR-0048 D2). */
export const coCuocCuaToi = (who: Pick<PermissionHolder, "permissions">): boolean => hasPermission(who, "DRIVER");

/** Tài khoản "chỉ tài xế" (công ty hoặc đối tác) — trang đầu là /cuoc hoặc /tai-xe: dùng thanh tab / menu của tài xế, mở được /tai-xe. */
export const chiTaiXe = (who: PermissionHolder): boolean => {
  const r = homeRedirect(who);
  return r === TRANG_CUOC || r === TRANG_DAU_TAI_XE;
};

/**
 * Mục / tab "Đơn hàng" (/orders) ở thanh bên máy tính và thanh tab điện thoại. Văn phòng xem mọi đơn (`seesAll`); người lập được đơn mà không xem mọi đơn
 * (Đối tác, Thực tập — `canCreate`) thấy danh sách đơn MÌNH lập (nhánh "mình lập" của GET /api/orders). Lỗi báo 30/9 (L3, giả định bề mặt đảo ngược được):
 * trước đây họ không có mục này, điện thoại không có đường về danh sách đơn. HDV chỉ-FIELD không có (họ dùng "Việc của tôi"); tài xế không có.
 * Nhận đúng HAI cờ đã có trong bản nhớ khung (ADR-0035 — không thêm trường) để khung tạm vẽ đúng ngay. Bài `start-page.test.ts` ghim "lập được đơn ⇒ mở được
 * danh sách đơn mình lập" trên bản đồ quyền.
 */
export const coMucDonHang = (co: { seesAll: boolean; canCreate: boolean }): boolean => co.seesAll || co.canCreate;

/** Đường dẫn phải chuyển sang khi người dùng mở "/", hoặc `null` = ở lại Trang chủ. */
export function homeRedirect(who: PermissionHolder): string | null {
  if (seesAllOrders(who)) return null;
  if (canAccessOrders(who)) return "/orders";
  if (coCuocCuaToi(who)) return TRANG_CUOC;
  if (coPhanTaiXe(who)) return TRANG_DAU_TAI_XE;
  return null;
}

/**
 * Tài khoản có phần Tài xế — tài xế công ty (DRIVER, ADR-0040) hoặc tài xế đối tác (DRIVER_PARTNER, ADR-0048; giả định I2/G1 của kế hoạch: dùng lại trang
 * đầu và thanh tab của tài xế công ty). Một nguồn cho start-page và web/account.ts.
 */
export const coPhanTaiXe = (who: Pick<PermissionHolder, "permissions">): boolean => hasPermission(who, "DRIVER") || hasPermission(who, "DRIVER_PARTNER");
