// BẢNG MỤC GIAO DIỆN — MỘT nơi khai lối vào các trang: thanh bên máy tính, thanh tab điện thoại, thanh trên, trang "Tôi" (ô Trang chủ ở trang-chu-o.ts dùng
// lại TRANG ở đây). Thuần (không DOM): web/shell.ts, web/account.ts, src/shared/trang-chu-o.ts, bộ sinh kho trợ lý và bài node cùng đọc.
//
// Luật (bước K-c sổ đại lý đợt 1; neo Hiến chương K4 "một bản đồ quyền, mọi route hỏi can()" và web/CLAUDE.md "ẩn/hiện hỏi CÙNG bảng với máy chủ; máy chủ
// luôn kiểm lại"): MỤC HIỆN ⇔ GỌI ĐƯỜNG CHÍNH CỦA TRANG BẰNG CHÍNH TÀI KHOẢN ĐÓ KHÔNG BỊ TỪ CHỐI và trang không tự chặn ở trình duyệt (`moTrang`). Rào
// máy: src/muc-hien-mo-duoc-{1,2,3}.test.ts — luật và danh sách chờ chủ ở tests/audit/muc-hien-mo-duoc-khung.mjs (1024 tập quyền × mọi dòng, gọi route thật
// qua khung thử). Ai thấy mục nào hôm nay ghim ở src/muc-giao-dien-hien-trang.test.ts.
//
// THÊM MỘT TRANG CÓ LỐI VÀO: một dòng ở TRANG (đường trang + ĐƯỜNG GỌI CHÍNH + ai thấy — hỏi `can()` / hàm danh tính có sẵn, không hỏi mã quyền thô; trang tự
// chặn ở trình duyệt chặt hơn đường gọi chính thì khai `moTrang` và cho trang gọi `moTrang(k, staff)`), rồi một dòng chỗ đặt ở mỗi nơi cần (chữ, nhóm, thứ
// tự — thứ tự thanh bên và trang Tôi khác nhau nên mỗi nơi một danh sách). Dòng mới tự vào cả hai bài. Đủ việc khi thêm trang: docs/CHANGE-GUIDE.md công thức
// "thêm trang".
// Không có điều kiện nào ở web/shell.ts, web/account.ts: hai tệp đó chỉ vẽ danh sách hàm dưới đây trả về.
import { thayDieuPhoiXe } from "./dieu-phoi-man.ts";
import { can, holdsPartner, isOffice, seesAllOrders, type PermissionHolder } from "./permissions.ts";
import { TRANG_CUOC, TRANG_DAU_TAI_XE, chiTaiXe, coCuocCuaToi, coMucDonHang } from "./start-page.ts";

/** Đường gọi chính của một trang: lời gọi mà trang cần để làm việc của nó (đọc, không ghi). Máy chủ không từ chối nó ⇔ trang mở được. */
export type GoiChinh = `GET /api/${string}`;

/**
 * Bốn cờ của "bản nhớ khung" (ADR-0035 điều 3 — chỉ các trường đã duyệt, web/khung-nho.ts): khung tạm vẽ ngay khi mở trang, trước khi /api/auth/me về.
 * Khung tạm luôn là TẬP CON của khung thật (bài rào kiểm), nên không bao giờ hiện thêm mục nào.
 */
export interface CoKhungNho {
  readonly admin: boolean;
  readonly seesAll: boolean;
  readonly office: boolean;
  readonly canCreate: boolean;
}

/** Người xem: tài khoản thật (sau /api/auth/me), hoặc chỉ bản nhớ khung (khung tạm / mất mạng). */
export type NguoiXem = { readonly staff: PermissionHolder } | { readonly khungNho: CoKhungNho };

export interface TrangDich {
  /** Đường trang. */
  readonly duong: string;
  /** Trang khác cùng làm sáng mục này (mở từ trang này). */
  readonly cungSang?: readonly string[];
  /** Đường gọi chính. `null` chỉ khi có trong danh sách MIỄN của bài rào kèm lý do (thiếu ⇒ bài đỏ "chưa khai"). */
  readonly goi: GoiChinh | null;
  /** Ai thấy lối vào trang. */
  readonly hien: (s: PermissionHolder) => boolean;
  /**
   * Chốt chặn PHÍA TRÌNH DUYỆT của chính trang (trang tự báo lỗi / chuyển đi khi sai) — CHỈ khai khi nó CHẶT hơn đường gọi chính (máy chủ cho gọi mà trang vẫn
   * không mở cho người đó). Trang phải dùng chính hàm này qua `moTrang(k, staff)` — bảng và trang là MỘT nguồn. Không khai ⇒ trang mở cho ai qua đường gọi chính.
   */
  readonly moTrang?: (s: PermissionHolder) => boolean;
  /** Khung tạm (chỉ bốn cờ của bản nhớ khung). Không khai ⇒ không vẽ ở khung tạm; khung thật vẽ sau một nhịp. */
  readonly tam?: (k: CoKhungNho) => boolean;
}

const quanLyXe = (s: PermissionHolder): boolean => can(s, "vehicle.manage");
const luonCo = (): boolean => true;

/**
 * MỌI trang có lối vào. `goi` của trang chỉ cần đăng nhập là /api/auth/me (initShell gọi ở mọi trang). Đường có tham số bắt buộc ghi kèm tham số hợp lệ
 * (vd bảng kê: khoảng ngày) — thiếu thì máy chủ trả 400 trước khi xét quyền, bài rào coi 400 là mã lạ (đỏ).
 */
export const TRANG = {
  trangChu: { duong: "/", goi: "GET /api/orders/dashboard", hien: seesAllOrders, tam: (k) => k.seesAll },
  donHang: {
    duong: "/orders",
    cungSang: ["/order"],
    goi: "GET /api/orders",
    hien: (s) => coMucDonHang({ seesAll: seesAllOrders(s), canCreate: can(s, "order.create") }),
    tam: (k) => coMucDonHang(k),
  },
  taoDon: { duong: "/order-form", goi: "GET /api/catalog/for-order", hien: (s) => can(s, "order.create"), tam: (k) => k.canCreate },
  danhBa: { duong: "/parties", goi: "GET /api/parties", hien: isOffice, tam: (k) => k.office },
  dichVu: { duong: "/catalog", goi: "GET /api/catalog/admin", hien: (s) => can(s, "admin.manage"), tam: (k) => k.admin },
  // ADR-0071: ô account.view (Quản trị, Nhân sự, Toàn quyền). Bản nhớ khung không có cờ này (ADR-0035): khung tạm dùng `admin` — Nhân sự thiếu mục một nhịp.
  taiKhoan: { duong: "/staff", goi: "GET /api/staff", hien: (s) => can(s, "account.view"), tam: (k) => k.admin },
  phien: { duong: "/sessions", goi: "GET /api/sessions", hien: (s) => can(s, "auth.session.viewAll") }, // ADR-0075 điều 7
  // GET /api/locations mở cho mọi tài khoản (form đơn, form chuyến cần danh sách) — trang quản lý chỉ mở cho ô admin.manage (web/locations.ts).
  diaDiem: { duong: "/locations", goi: "GET /api/locations", hien: (s) => can(s, "admin.manage"), moTrang: (s) => can(s, "admin.manage"), tam: (k) => k.admin },
  loaiGiayToNguoi: { duong: "/loai-giay-to-nguoi", goi: "GET /api/parties/documents/meta", hien: (s) => can(s, "admin.manage") },
  // Bảng điều phối (ADR-0049, Q-B-4): ô trip.view không ngữ cảnh — văn phòng.
  dieuPhoi: { duong: "/dieu-phoi", cungSang: ["/chuyen", "/chuyen-sua"], goi: "GET /api/van-chuyen/lich", hien: thayDieuPhoiXe },
  xeDangChay: { duong: "/xe-dang-chay", goi: "GET /api/van-chuyen/lich", hien: thayDieuPhoiXe },
  // Gói A5 (ADR-0111; bản vẽ V10): duyệt / bác đề nghị chuyển khách leo thang — CHỈ ô trip.override (Quản trị, Toàn quyền). Đường gọi chính hỏi trip.view (rộng hơn).
  deNghi: { duong: "/de-nghi", goi: "GET /api/van-chuyen/de-nghi", hien: (s) => thayDieuPhoiXe(s) && can(s, "trip.override") },
  bangGiaXe: { duong: "/bang-gia-xe", goi: "GET /api/van-chuyen/bang-gia", hien: (s) => can(s, "transport.rate.view") }, // ADR-0057 T1
  bangKeXe: { duong: "/bang-ke-xe", goi: "GET /api/van-chuyen/chi-phi?tu=2026-10-01&den=2026-10-01", hien: (s) => can(s, "transport.cost.view") }, // ADR-0057 T2
  xe: { duong: "/xe", cungSang: ["/xe-sua", "/xe-chi-tiet"], goi: "GET /api/van-chuyen/xe", hien: quanLyXe }, // ADR-0040 D1
  lichXeBan: { duong: "/lich-xe-ban", goi: "GET /api/van-chuyen/ban-xe", hien: quanLyXe }, // ADR-0055 VK2-A
  sapHetHan: { duong: "/giay-to-sap-het-han", goi: "GET /api/van-chuyen/sap-het-han", hien: quanLyXe },
  // Danh mục loại giấy tờ xe: thêm ô admin.manage (route sửa danh mục hỏi ô này).
  loaiGiayToXe: { duong: "/loai-giay-to-xe", goi: "GET /api/van-chuyen/meta", hien: (s) => quanLyXe(s) && can(s, "admin.manage") },
  chinhSachDieuPhoi: {
    duong: "/chinh-sach-dieu-phoi",
    cungSang: ["/dieu-kien-xuat-ben"],
    goi: "GET /api/van-chuyen/chinh-sach-dieu-phoi",
    hien: (s) => quanLyXe(s) && can(s, "settings.ops"),
  },
  lyDoDieuPhoi: { duong: "/ly-do-dieu-phoi", goi: "GET /api/van-chuyen/ly-do", hien: (s) => quanLyXe(s) && can(s, "admin.manage") },
  // Khoá sổ tháng (sổ đại lý đợt 1 Task 12): ô ledger.view không ngữ cảnh — Kế toán, Toàn quyền.
  khoaThang: { duong: "/khoa-thang", goi: "GET /api/ledger/ky", hien: (s) => can(s, "ledger.view") },
  // Điều chỉnh công nợ cần người thứ hai duyệt (ADR-0115 đợt 1): xem danh sách = ô gửi (`ledger.write`) HOẶC ô duyệt (`ledger.adjust.approve`; Quản trị chỉ thấy yêu cầu chờ duyệt).
  dieuChinhCongNo: { duong: "/dieu-chinh-cong-no", goi: "GET /api/ledger/adjustment-requests", hien: (s) => can(s, "ledger.write") || can(s, "ledger.adjust.approve") },
  // Bảng mức hoa hồng và điều khoản người bán (sổ đại lý đợt 1 Task 10): ô partner.commission.view / supply.terms.view không ngữ cảnh. Bảy route `pricing` chặn THÊM tài khoản giữ quyền
  // Đối tác (kể cả tài khoản lai, Ruling 12) — mục hiện phải chặn CÙNG điều kiện, nếu không tài khoản lai thấy mục mà bấm vào bị 403.
  hoaHong: { duong: "/hoa-hong", goi: "GET /api/pricing/hoa-hong", hien: (s) => can(s, "partner.commission.view") && !holdsPartner(s) },
  nguoiBan: { duong: "/nguoi-ban", goi: "GET /api/pricing/cung-ung", hien: (s) => can(s, "supply.terms.view") && !holdsPartner(s) },
  nhatKy: { duong: "/audit", goi: "GET /api/audit", hien: (s) => can(s, "audit.view") }, // ADR-0038 điều 6: chỉ Toàn quyền
  guiThongBao: { duong: "/gui-thong-bao", goi: "GET /api/thong-bao/da-gui", hien: (s) => can(s, "notice.send") }, // ADR-0034
  troLy: { duong: "/tro-ly-cai-dat", goi: "GET /api/tro-ly/cai-dat", hien: (s) => can(s, "settings.ops") }, // ADR-0069 điều 1
  giaoDien: { duong: "/giao-dien", goi: "GET /api/giao-dien", hien: (s) => can(s, "settings.ops") }, // ADR-0087
  // Trang đầu của tài khoản "chỉ tài xế" (ADR-0040 D3) — web/tai-xe.ts tự chuyển người khác về "/"; giấy tờ của tôi (đường gọi chính) mở cho mọi nhân viên nội bộ.
  trangTaiXe: { duong: TRANG_DAU_TAI_XE, goi: "GET /api/parties/documents/mine", hien: chiTaiXe, moTrang: chiTaiXe },
  // Q5: tài xế công ty. Đường gọi chính cho cả văn phòng (ô trip.view mọi chuyến) — web/cuoc.ts báo "Tài khoản này không có cuốc xe." với người không lái.
  cuoc: { duong: TRANG_CUOC, cungSang: ["/cuoc-chuyen"], goi: "GET /api/van-chuyen/cuoc-cua-toi", hien: coCuocCuaToi, moTrang: coCuocCuaToi },
  // A4 T9 (ADR-0053 D9, G-A4-16): "Báo bận của tôi" — chỉ tài khoản "chỉ tài xế" có ô unavailability.self (own, hỏi kèm ngữ cảnh chính mình).
  ban: { duong: "/ban", goi: "GET /api/van-chuyen/ban/cua-toi", hien: (s) => chiTaiXe(s) && can(s, "unavailability.self", { ownerId: s.id }) },
  toi: { duong: "/account", goi: "GET /api/auth/me", hien: luonCo, tam: luonCo },
  gopY: { duong: "/feedback", goi: "GET /api/feedback/mine", hien: luonCo, tam: luonCo },
  troGiup: { duong: "/help", goi: "GET /api/auth/me", hien: luonCo, tam: luonCo },
} as const satisfies Record<string, TrangDich>;

export type KhoaTrang = keyof typeof TRANG;
export const KHOA_TRANG = Object.keys(TRANG) as KhoaTrang[];

/** Một chỗ đặt hẹp hơn điều kiện của trang (vd tab chỉ cho tài khoản "chỉ tài xế"). Bài rào đòi ghi tập "được mà ẩn" của dòng đó kèm lý do. */
export interface ChiKhi {
  readonly that: (s: PermissionHolder) => boolean;
  /** Ở khung tạm; không khai ⇒ dòng không vẽ ở khung tạm. */
  readonly tam?: (k: CoKhungNho) => boolean;
}

/** Một dòng đặt lối vào trang `trang` ở một nơi (thanh bên, tab, thanh trên, trang Tôi, ô Trang chủ). */
export interface ChoDat {
  readonly trang: KhoaTrang;
  readonly nhan: string;
  readonly chiKhi?: ChiKhi;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Thanh bên máy tính (ADR-0015): ba nhóm; nhóm rỗng ẩn cả tiêu đề (web/shell.ts lọc).

export const NHOM_THANH_BEN = ["BÁN HÀNG", "QUẢN TRỊ", "TÔI"] as const;
export type NhomThanhBen = (typeof NHOM_THANH_BEN)[number];

/** Mục cha (không phải liên kết, luôn mở — bản vẽ Vận chuyển quyết định 1): hiện khi có ít nhất một mục con hiện; sáng khi đang ở trang của mục con bất kỳ. */
export const CHA_THANH_BEN = { "Vận chuyển": { bieuTuong: "truck" } } as const;
export type ChaThanhBen = keyof typeof CHA_THANH_BEN;

export interface ChoThanhBen extends ChoDat {
  readonly nhom: NhomThanhBen;
  /** Tên biểu tượng ở web/icons.ts (web/shell.ts kiểm kiểu lúc biên dịch). Mục con không có biểu tượng (bản vẽ Vận chuyển). */
  readonly bieuTuong?: string;
  readonly cha?: ChaThanhBen;
  /** Địa chỉ mở riêng theo trang đang đứng (Góp ý: mở form mới, kèm nơi quay về). */
  readonly moTu?: (duongHienTai: string) => string;
}

export const THANH_BEN = [
  { nhom: "BÁN HÀNG", trang: "trangChu", nhan: "Trang chủ", bieuTuong: "home" },
  { nhom: "BÁN HÀNG", trang: "donHang", nhan: "Đơn hàng", bieuTuong: "orders" },
  { nhom: "BÁN HÀNG", trang: "taoDon", nhan: "Tạo đơn", bieuTuong: "plus" },
  { nhom: "BÁN HÀNG", trang: "danhBa", nhan: "Danh bạ", bieuTuong: "contact-card" },
  { nhom: "QUẢN TRỊ", trang: "dichVu", nhan: "Dịch vụ & giá", bieuTuong: "services" },
  { nhom: "QUẢN TRỊ", trang: "taiKhoan", nhan: "Quản lý tài khoản", bieuTuong: "staff" },
  { nhom: "QUẢN TRỊ", trang: "phien", nhan: "Phiên đăng nhập", bieuTuong: "lock" },
  { nhom: "QUẢN TRỊ", trang: "diaDiem", nhan: "Địa điểm", bieuTuong: "pin" },
  { nhom: "QUẢN TRỊ", trang: "loaiGiayToNguoi", nhan: "Loại giấy tờ cá nhân", bieuTuong: "doc-check" },
  // Vận chuyển — thứ tự bản vẽ: Điều phối xe, Xe đang chạy, Đề nghị chuyển khách, Bảng giá thuê xe, Bảng kê chi phí xe, Xe, Lịch xe bận, Sắp hết hạn, Loại giấy tờ xe, Chính sách, Lý do.
  { nhom: "QUẢN TRỊ", cha: "Vận chuyển", trang: "dieuPhoi", nhan: "Điều phối xe" },
  { nhom: "QUẢN TRỊ", cha: "Vận chuyển", trang: "xeDangChay", nhan: "Xe đang chạy" },
  { nhom: "QUẢN TRỊ", cha: "Vận chuyển", trang: "deNghi", nhan: "Đề nghị chuyển khách" },
  { nhom: "QUẢN TRỊ", cha: "Vận chuyển", trang: "bangGiaXe", nhan: "Bảng giá thuê xe" },
  { nhom: "QUẢN TRỊ", cha: "Vận chuyển", trang: "bangKeXe", nhan: "Bảng kê chi phí xe" },
  { nhom: "QUẢN TRỊ", cha: "Vận chuyển", trang: "xe", nhan: "Xe" },
  { nhom: "QUẢN TRỊ", cha: "Vận chuyển", trang: "lichXeBan", nhan: "Lịch xe bận" },
  { nhom: "QUẢN TRỊ", cha: "Vận chuyển", trang: "sapHetHan", nhan: "Sắp hết hạn" },
  { nhom: "QUẢN TRỊ", cha: "Vận chuyển", trang: "loaiGiayToXe", nhan: "Loại giấy tờ xe" },
  { nhom: "QUẢN TRỊ", cha: "Vận chuyển", trang: "chinhSachDieuPhoi", nhan: "Chính sách điều phối" },
  { nhom: "QUẢN TRỊ", cha: "Vận chuyển", trang: "lyDoDieuPhoi", nhan: "Lý do điều phối" },
  { nhom: "QUẢN TRỊ", trang: "khoaThang", nhan: "Khoá sổ tháng", bieuTuong: "lock" },
  { nhom: "QUẢN TRỊ", trang: "dieuChinhCongNo", nhan: "Điều chỉnh công nợ", bieuTuong: "money" },
  { nhom: "QUẢN TRỊ", trang: "hoaHong", nhan: "Hoa hồng đối tác", bieuTuong: "money" },
  { nhom: "QUẢN TRỊ", trang: "nguoiBan", nhan: "Người bán dịch vụ", bieuTuong: "assign" },
  { nhom: "QUẢN TRỊ", trang: "nhatKy", nhan: "Nhật ký", bieuTuong: "history" },
  { nhom: "QUẢN TRỊ", trang: "guiThongBao", nhan: "Gửi thông báo", bieuTuong: "megaphone" },
  { nhom: "QUẢN TRỊ", trang: "troLy", nhan: "Trợ lý Hỗ trợ", bieuTuong: "chat" },
  { nhom: "QUẢN TRỊ", trang: "giaoDien", nhan: "Giao diện", bieuTuong: "palette" },
  // Tài xế: "Trang chủ" của họ là /tai-xe — đứng đầu nhóm TÔI; "Cuốc của tôi" cho mọi tài khoản tài xế công ty (kể cả kiêm văn phòng — K2b T2).
  { nhom: "TÔI", trang: "trangTaiXe", nhan: "Trang chủ", bieuTuong: "home" },
  { nhom: "TÔI", trang: "cuoc", nhan: "Cuốc của tôi", bieuTuong: "assign" },
  { nhom: "TÔI", trang: "ban", nhan: "Báo bận của tôi", bieuTuong: "clock" },
  { nhom: "TÔI", trang: "toi", nhan: "Của tôi", bieuTuong: "me" },
  { nhom: "TÔI", trang: "gopY", nhan: "Góp ý / Báo lỗi", bieuTuong: "chat", moTu: (p: string) => `/feedback?new=1&from=${encodeURIComponent(p)}` },
  { nhom: "TÔI", trang: "troGiup", nhan: "Trợ giúp", bieuTuong: "help" },
] as const satisfies readonly ChoThanhBen[];

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Thanh tab điện thoại: văn phòng / Đối tác, Thực tập / tài xế, rồi hai tab quản trị, cuối cùng "Tôi".

export interface ChoThanhTab extends ChoDat {
  readonly bieuTuong: string;
}

export const THANH_TAB = [
  { trang: "trangChu", nhan: "Trang chủ", bieuTuong: "home" },
  { trang: "donHang", nhan: "Đơn hàng", bieuTuong: "orders" },
  { trang: "taoDon", nhan: "Tạo đơn", bieuTuong: "plus" },
  { trang: "trangTaiXe", nhan: "Trang chủ", bieuTuong: "home" },
  // Tab "Cuốc của tôi" CHỈ cho tài khoản "chỉ tài xế" (Q5); tài khoản vừa tài xế vừa văn phòng mở /cuoc từ trang Tôi (GA-K2b-T2: không thêm tab).
  { trang: "cuoc", nhan: "Cuốc của tôi", bieuTuong: "assign", chiKhi: { that: chiTaiXe } },
  // A4 T9: tab "Báo bận của tôi" ngay sau Cuốc, cùng đối tượng "chỉ tài xế"; không có ở khung tạm (bản nhớ khung chỉ 4 cờ đã duyệt, ADR-0035) — thiếu một nhịp như tiền lệ tài xế.
  { trang: "ban", nhan: "Báo bận của tôi", bieuTuong: "clock" },
  { trang: "dichVu", nhan: "Dịch vụ", bieuTuong: "services" },
  { trang: "taiKhoan", nhan: "Tài khoản", bieuTuong: "staff" },
  { trang: "toi", nhan: "Tôi", bieuTuong: "me" },
] as const satisfies readonly ChoThanhTab[];

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Thanh trên (thanh công việc): ô tìm đơn và nút "Tạo đơn".

export interface ChoThanhTren extends ChoDat {
  readonly kieu: "o-tim" | "nut";
}

export const THANH_TREN = [
  // Ô tìm chỉ cho người xem mọi đơn (cùng đối tượng với mục "Trang chủ"); Đối tác, Thực tập tìm trong danh sách đơn của mình.
  { kieu: "o-tim", trang: "donHang", nhan: "Tìm đơn", chiKhi: { that: seesAllOrders, tam: (k: CoKhungNho) => k.seesAll } },
  { kieu: "nut", trang: "taoDon", nhan: "Tạo đơn" },
] as const satisfies readonly ChoThanhTren[];

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Trang "Tôi" (điện thoại): khối đầu → nhóm VẬN CHUYỂN (chỉ dựng khi có dòng mở nhóm) → khối sau (rồi nút Đăng xuất do web/account.ts thêm).

export interface ChoTrangToi extends ChoDat {
  readonly phan: "dau" | "van-chuyen" | "sau";
  /** Dòng này một mình KHÔNG mở nhóm VẬN CHUYỂN (chỉ nằm trong nhóm đã mở vì việc khác). */
  readonly khongMoNhom?: true;
  /** Tab "Tôi" KHÔNG sáng ở trang này (giữ như cũ: Danh bạ, Địa điểm, Góp ý). */
  readonly khongSangTabToi?: true;
}

export const TRANG_TOI = [
  { phan: "dau", trang: "danhBa", nhan: "Danh bạ", khongSangTabToi: true },
  { phan: "dau", trang: "diaDiem", nhan: "Địa điểm", khongSangTabToi: true },
  { phan: "dau", trang: "loaiGiayToNguoi", nhan: "Loại giấy tờ cá nhân" },
  { phan: "van-chuyen", trang: "dieuPhoi", nhan: "Điều phối xe" },
  { phan: "van-chuyen", trang: "xeDangChay", nhan: "Xe đang chạy" },
  { phan: "van-chuyen", trang: "deNghi", nhan: "Đề nghị chuyển khách" },
  { phan: "van-chuyen", trang: "bangGiaXe", nhan: "Bảng giá thuê xe" },
  { phan: "van-chuyen", trang: "bangKeXe", nhan: "Bảng kê chi phí xe" },
  // Tài khoản vừa tài xế công ty vừa văn phòng (GA-K2b-T2): lối tới "Cuốc của tôi" ở điện thoại; tài khoản chỉ tài xế có tab riêng.
  { phan: "van-chuyen", trang: "cuoc", nhan: "Cuốc của tôi", khongMoNhom: true, chiKhi: { that: (s: PermissionHolder) => !chiTaiXe(s) } },
  { phan: "van-chuyen", trang: "xe", nhan: "Xe" },
  { phan: "van-chuyen", trang: "lichXeBan", nhan: "Lịch xe bận" },
  { phan: "van-chuyen", trang: "sapHetHan", nhan: "Giấy tờ sắp hết hạn" },
  { phan: "van-chuyen", trang: "loaiGiayToXe", nhan: "Loại giấy tờ xe" },
  { phan: "van-chuyen", trang: "chinhSachDieuPhoi", nhan: "Chính sách điều phối" },
  { phan: "van-chuyen", trang: "lyDoDieuPhoi", nhan: "Lý do điều phối" },
  { phan: "sau", trang: "khoaThang", nhan: "Khoá sổ tháng" },
  { phan: "sau", trang: "dieuChinhCongNo", nhan: "Điều chỉnh công nợ" },
  { phan: "sau", trang: "hoaHong", nhan: "Hoa hồng đối tác" },
  { phan: "sau", trang: "nguoiBan", nhan: "Người bán dịch vụ" },
  { phan: "sau", trang: "nhatKy", nhan: "Nhật ký" },
  { phan: "sau", trang: "phien", nhan: "Phiên đăng nhập" },
  { phan: "sau", trang: "guiThongBao", nhan: "Gửi thông báo" },
  { phan: "sau", trang: "troLy", nhan: "Trợ lý Hỗ trợ" },
  { phan: "sau", trang: "giaoDien", nhan: "Giao diện" },
  { phan: "sau", trang: "gopY", nhan: "Góp ý / Báo lỗi", khongSangTabToi: true },
  { phan: "sau", trang: "troGiup", nhan: "Trợ giúp" },
] as const satisfies readonly ChoTrangToi[];

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Tính danh sách hiện

/** Dòng có hiện cho người xem này không: điều kiện của trang VÀ (nếu có) điều kiện hẹp của chỗ đặt. Khung tạm: chỉ trang/chỗ có khai `tam`. */
export function coHien(c: ChoDat, n: NguoiXem): boolean {
  const t: TrangDich = TRANG[c.trang];
  if ("staff" in n) return t.hien(n.staff) && (c.chiKhi ? c.chiKhi.that(n.staff) : true);
  return (t.tam?.(n.khungNho) ?? false) && (c.chiKhi ? (c.chiKhi.tam?.(n.khungNho) ?? false) : true);
}

/** Trang `k` tự mở cho người này (chốt chặn phía trình duyệt — `moTrang`; trang không khai ⇒ đúng). web/locations.ts, web/cuoc.ts, web/tai-xe.ts gọi hàm này. */
export function moTrang(k: KhoaTrang, s: PermissionHolder): boolean {
  return (TRANG[k] as TrangDich).moTrang?.(s) ?? true;
}

/** Trang đang mở có làm sáng mục của trang `k` không (đường trang hoặc trang mở từ nó). */
export function sangTai(k: KhoaTrang, duong: string): boolean {
  const t: TrangDich = TRANG[k];
  return duong === t.duong || (t.cungSang ?? []).includes(duong);
}

export type MucThanhBen =
  | { readonly kieu: "cha"; readonly nhan: ChaThanhBen; readonly bieuTuong: string; readonly con: readonly KhoaTrang[] }
  | { readonly kieu: "muc"; readonly trang: KhoaTrang; readonly nhan: string; readonly href: string; readonly bieuTuong?: string; readonly con: boolean };

/** Ba nhóm của thanh bên, mỗi nhóm các mục đang hiện theo thứ tự; mục cha chèn ngay trước mục con hiện đầu tiên. `duongHienTai` chỉ dùng cho địa chỉ mở riêng. */
export function thanhBen(n: NguoiXem, duongHienTai: string): { nhom: NhomThanhBen; muc: MucThanhBen[] }[] {
  return NHOM_THANH_BEN.map((nhom) => {
    const muc: MucThanhBen[] = [];
    const daCoCha = new Set<ChaThanhBen>();
    for (const c of THANH_BEN as readonly ChoThanhBen[]) {
      if (c.nhom !== nhom || !coHien(c, n)) continue;
      if (c.cha && !daCoCha.has(c.cha)) {
        daCoCha.add(c.cha);
        const cha = c.cha;
        muc.push({ kieu: "cha", nhan: cha, bieuTuong: CHA_THANH_BEN[cha].bieuTuong, con: (THANH_BEN as readonly ChoThanhBen[]).filter((x) => x.cha === cha).map((x) => x.trang) });
      }
      muc.push({ kieu: "muc", trang: c.trang, nhan: c.nhan, href: c.moTu ? c.moTu(duongHienTai) : TRANG[c.trang].duong, bieuTuong: c.bieuTuong, con: c.cha !== undefined });
    }
    return { nhom, muc };
  });
}

/** Nhãn của trang theo đường (chữ trên thanh công việc khi trang không khai data-title): mục thanh bên ĐẦU TIÊN sáng ở đường này — mọi mục, không xét quyền. */
export function nhanTheoDuong(duong: string): string | null {
  return (THANH_BEN as readonly ChoThanhBen[]).find((c) => sangTai(c.trang, duong))?.nhan ?? null;
}

export interface MucHien {
  readonly trang: KhoaTrang;
  readonly nhan: string;
  readonly href: string;
}
const hienRa = (c: ChoDat): MucHien => ({ trang: c.trang, nhan: c.nhan, href: TRANG[c.trang].duong });

export function thanhTab(n: NguoiXem): (MucHien & { readonly bieuTuong: string })[] {
  return (THANH_TAB as readonly ChoThanhTab[]).filter((c) => coHien(c, n)).map((c) => ({ ...hienRa(c), bieuTuong: c.bieuTuong }));
}

export function thanhTren(n: NguoiXem): (MucHien & { readonly kieu: ChoThanhTren["kieu"] })[] {
  return (THANH_TREN as readonly ChoThanhTren[]).filter((c) => coHien(c, n)).map((c) => ({ ...hienRa(c), kieu: c.kieu }));
}

/** Tab "Tôi" sáng ở trang Tôi và các trang mở từ trang Tôi (trừ dòng `khongSangTabToi`); trang của "Cuốc của tôi" chỉ khi không có tab Cuốc riêng. */
export function sangTabToi(duong: string, coTabCuoc: boolean): boolean {
  if (duong === TRANG.toi.duong) return true;
  return (TRANG_TOI as readonly ChoTrangToi[]).some((c) => !c.khongSangTabToi && !(c.trang === "cuoc" && coTabCuoc) && sangTai(c.trang, duong));
}

/** Trang Tôi: `vanChuyen` null = không dựng nhóm VẬN CHUYỂN (không dòng nào mở nhóm hiện) — khối đầu và khối sau gộp một danh sách như cũ. */
export function trangToi(s: PermissionHolder): { dau: MucHien[]; vanChuyen: MucHien[] | null; sau: MucHien[] } {
  const hien = (TRANG_TOI as readonly ChoTrangToi[]).filter((c) => coHien(c, { staff: s }));
  const vc = hien.filter((c) => c.phan === "van-chuyen");
  return {
    dau: hien.filter((c) => c.phan === "dau").map(hienRa),
    vanChuyen: vc.some((c) => !c.khongMoNhom) ? vc.map(hienRa) : null,
    sau: hien.filter((c) => c.phan === "sau").map(hienRa),
  };
}

/** Bốn cờ ghi vào bản nhớ khung (ADR-0035) — hỏi CÙNG bảng quyền như khung thật. */
export function coKhungNho(s: PermissionHolder): CoKhungNho {
  return { admin: can(s, "admin.manage"), seesAll: seesAllOrders(s), office: isOffice(s), canCreate: can(s, "order.create") };
}

/** Mất mạng lúc mở trang, chưa có bản nhớ khung (QA2 Q2-04): không biết vai — bốn tab cơ bản để còn điều hướng; không dựng thanh bên. */
export const KHUNG_MAT_MANG: CoKhungNho = { admin: false, seesAll: true, office: true, canCreate: true };
