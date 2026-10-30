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
import { can, canAccessOrders, holdsPartner, isOffice, seesAllOrders, type PermissionHolder } from "./permissions.ts";
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
 * MỌI trang có lối vào. Đường gọi chính của từng trang ở bảng riêng `GOI_CHINH` (`muc-giao-dien-goi.ts`, chỉ bài rào đọc — Ruling R-P27); thêm trang ở
 * đây thì thêm dòng ở bảng đó (typecheck đỏ nếu quên).
 */
export const TRANG = {
  trangChu: { duong: "/", hien: seesAllOrders, tam: (k) => k.seesAll },
  donHang: {
    duong: "/orders",
    cungSang: ["/order"],
    // ADR-0017: hướng dẫn viên (FIELD) cũng có mục này — `canAccessOrders` = cổng "orders" (văn phòng, Đối tác, Thực tập, FIELD). Khung tạm (`tam`) chỉ có bốn cờ (ADR-0035): FIELD thiếu mục một nhịp.
    // Trang /orders của FIELD = đơn mình phụ trách; đơn tự do ở Của tôi › Đơn chờ nhận.
    // `canAccessOrders` là tập cha của `coMucDonHang` nên KHÔNG cần `|| coMucDonHang(...)` (thêm lại sẽ làm gói web/orders.ts chạm trần 96000 byte của bài goi-trang-nhe).
    hien: canAccessOrders,
    tam: (k) => coMucDonHang(k),
  },
  taoDon: { duong: "/order-form", hien: (s) => can(s, "order.create"), tam: (k) => k.canCreate },
  danhBa: { duong: "/parties", hien: isOffice, tam: (k) => k.office },
  dichVu: { duong: "/catalog", hien: (s) => can(s, "admin.manage"), tam: (k) => k.admin },
  // ADR-0071: ô account.view (Quản trị, Nhân sự, Toàn quyền). Bản nhớ khung không có cờ này (ADR-0035): khung tạm dùng `admin` — Nhân sự thiếu mục một nhịp.
  taiKhoan: { duong: "/staff", hien: (s) => can(s, "account.view"), tam: (k) => k.admin },
  phien: { duong: "/sessions", hien: (s) => can(s, "auth.session.viewAll") }, // ADR-0075 điều 7
  // GET /api/locations mở cho mọi tài khoản (form đơn, form chuyến cần danh sách) — trang quản lý chỉ mở cho ô admin.manage (web/locations.ts).
  diaDiem: { duong: "/locations", hien: (s) => can(s, "admin.manage"), moTrang: (s) => can(s, "admin.manage"), tam: (k) => k.admin },
  loaiGiayToNguoi: { duong: "/loai-giay-to-nguoi", hien: (s) => can(s, "admin.manage") },
  // Bảng điều phối (ADR-0049, Q-B-4): ô trip.view không ngữ cảnh — văn phòng.
  dieuPhoi: { duong: "/dieu-phoi", cungSang: ["/chuyen", "/chuyen-sua"], hien: thayDieuPhoiXe },
  xeDangChay: { duong: "/xe-dang-chay", hien: thayDieuPhoiXe },
  // Gói A5 (ADR-0111; bản vẽ V10): duyệt / bác đề nghị chuyển khách leo thang — CHỈ ô trip.override (Quản trị, Toàn quyền). Đường gọi chính hỏi trip.view (rộng hơn).
  deNghi: { duong: "/de-nghi", hien: (s) => thayDieuPhoiXe(s) && can(s, "trip.override") },
  bangGiaXe: { duong: "/bang-gia-xe", hien: (s) => can(s, "transport.rate.view") }, // ADR-0057 T1
  bangKeXe: { duong: "/bang-ke-xe", hien: (s) => can(s, "transport.cost.view") }, // ADR-0057 T2
  xe: { duong: "/xe", cungSang: ["/xe-sua", "/xe-chi-tiet"], hien: quanLyXe }, // ADR-0040 D1
  lichXeBan: { duong: "/lich-xe-ban", hien: quanLyXe }, // ADR-0055 VK2-A
  sapHetHan: { duong: "/giay-to-sap-het-han", hien: quanLyXe },
  // Danh mục loại giấy tờ xe: thêm ô admin.manage (route sửa danh mục hỏi ô này).
  loaiGiayToXe: { duong: "/loai-giay-to-xe", hien: (s) => quanLyXe(s) && can(s, "admin.manage") },
  chinhSachDieuPhoi: {
    duong: "/chinh-sach-dieu-phoi",
    cungSang: ["/dieu-kien-xuat-ben"],
    hien: (s) => quanLyXe(s) && (can(s, "settings.ops") || can(s, "dispatch.policy.lead")), // ADR-0128 Q1: Quản trị vào để đặt mốc ra lệnh (chế độ hẹp)
  },
  lyDoDieuPhoi: { duong: "/ly-do-dieu-phoi", hien: (s) => quanLyXe(s) && can(s, "admin.manage") },
  // Khoá sổ tháng (sổ đại lý đợt 1 Task 12): ô ledger.view không ngữ cảnh — Kế toán, Toàn quyền.
  khoaThang: { duong: "/khoa-thang", hien: (s) => can(s, "ledger.view") },
  // Sổ công nợ theo đối tác (kế hoạch 2026-10-24 P1; bản vẽ 2a): CÙNG ô với route GET /api/ledger — ledger.view không ngữ cảnh (Kế toán, Toàn quyền). Chỉ đọc.
  soCongNo: { duong: "/so-cong-no", hien: (s) => can(s, "ledger.view") },
  // Điều chỉnh công nợ cần người thứ hai duyệt (ADR-0115 đợt 1): xem danh sách = ô gửi (`ledger.write`) HOẶC ô duyệt (`ledger.adjust.approve`; Quản trị chỉ thấy yêu cầu chờ duyệt).
  dieuChinhCongNo: { duong: "/dieu-chinh-cong-no", hien: (s) => (can(s, "ledger.write") || can(s, "ledger.adjust.approve")) && !holdsPartner(s) }, // R-P18: máy chủ chặn tài khoản giữ quyền Đối tác
  // Bảng mức hoa hồng và điều khoản người bán (sổ đại lý đợt 1 Task 10): ô partner.commission.view / supply.terms.view không ngữ cảnh. Bảy route `pricing` chặn THÊM tài khoản giữ quyền
  // Đối tác (kể cả tài khoản lai, Ruling 12) — mục hiện phải chặn CÙNG điều kiện, nếu không tài khoản lai thấy mục mà bấm vào bị 403.
  hoaHong: { duong: "/hoa-hong", hien: (s) => can(s, "partner.commission.view") && !holdsPartner(s) },
  // Luật bán theo loại đối tác (ADR-0146 Đ5; kế hoạch 2026-10-30 T11): CÙNG điều kiện ba route `/api/pricing/luat-ban` — ô sales.block.write và không giữ quyền Đối tác (Q-2 (a)).
  luatBan: { duong: "/luat-ban", hien: (s) => can(s, "sales.block.write") && !holdsPartner(s) },
  nguoiBan: { duong: "/nguoi-ban", hien: (s) => can(s, "supply.terms.view") && !holdsPartner(s) },
  // Chụp bù mức (sổ đại lý đợt 2, Task 12; ADR-0079 điều 7 b2): CÙNG cổng route `GET /api/orders/cho-chup-bu` — ô order.terms.override và không giữ quyền Đối tác (kể cả lai).
  chupBu: { duong: "/chup-bu", hien: (s) => can(s, "order.terms.override") && !holdsPartner(s) },
  // Đơn chờ xác nhận (ADR-0136 Đ6; Task 3.5): CÙNG cổng route `GET /api/orders/cho-xac-nhan` — ô order.confirm.review không ngữ cảnh (Bán hàng, Kế toán, Quản trị, HDV, Toàn quyền).
  choXacNhan: { duong: "/cho-xac-nhan", hien: (s) => can(s, "order.confirm.review") },
  nhatKy: { duong: "/audit", hien: (s) => can(s, "audit.view") }, // ADR-0038 điều 6: chỉ Toàn quyền
  guiThongBao: { duong: "/gui-thong-bao", hien: (s) => can(s, "notice.send") }, // ADR-0034
  troLy: { duong: "/tro-ly-cai-dat", hien: (s) => can(s, "settings.ops") }, // ADR-0069 điều 1
  giaoDien: { duong: "/giao-dien", hien: (s) => can(s, "settings.ops") }, // ADR-0087
  // Trang đầu của tài khoản "chỉ tài xế" (ADR-0040 D3) — web/tai-xe.ts tự chuyển người khác về "/"; giấy tờ của tôi (đường gọi chính) mở cho mọi nhân viên nội bộ.
  trangTaiXe: { duong: TRANG_DAU_TAI_XE, hien: chiTaiXe, moTrang: chiTaiXe },
  // Q5: tài xế công ty. Đường gọi chính cho cả văn phòng (ô trip.view mọi chuyến) — web/cuoc.ts báo "Tài khoản này không có cuốc xe." với người không lái.
  cuoc: { duong: TRANG_CUOC, cungSang: ["/cuoc-chuyen"], hien: coCuocCuaToi, moTrang: coCuocCuaToi },
  // A4 T9 (ADR-0053 D9, G-A4-16): "Báo bận của tôi" — chỉ tài khoản "chỉ tài xế" có ô unavailability.self (own, hỏi kèm ngữ cảnh chính mình).
  ban: { duong: "/ban", hien: (s) => chiTaiXe(s) && can(s, "unavailability.self", { ownerId: s.id }) },
  toi: { duong: "/account", hien: luonCo, tam: luonCo },
  gopY: { duong: "/feedback", hien: luonCo, tam: luonCo },
  troGiup: { duong: "/help", hien: luonCo, tam: luonCo },
  // Trang mục lục Thiết lập (điện thoại, đợt 0 Task 5): sáng ở mọi trang nhóm THIẾT LẬP của thanh bên. Danh sách đường lấy từ mọi dòng THIẾT LẬP của THANH_BEN (kèm trang mở từ chúng).
  thietLap: {
    duong: "/thiet-lap",
    get cungSang(): readonly string[] {
      return [...(THANH_BEN as readonly ChoThanhBen[]).filter((c) => c.nhom === "THIẾT LẬP").flatMap((c) => [TRANG[c.trang].duong, ...((TRANG[c.trang] as TrangDich).cungSang ?? [])])];
    },
    hien: (s) => can(s, "admin.manage"),
    moTrang: (s) => can(s, "admin.manage"),
    tam: (k) => k.admin,
  },
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

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Thanh bên máy tính (ADR-0015, menu theo việc 15/10): năm nhóm; nhóm rỗng ẩn cả tiêu đề (web/shell.ts lọc). HẰNG NGÀY và CHÂN MENU không hiện tiêu đề.
// Lối vào KHÔNG đổi quyền: mục gộp (`gom`) chỉ gom lối vào của các trang cùng điều kiện hiện; bài src/muc-giao-dien-menu-moi.test.ts ép trên mọi tập quyền
// (trang thấy trước đây vẫn tới được, không thấy thêm trang nào).

export const NHOM_THANH_BEN = ["HẰNG NGÀY", "VẬN CHUYỂN", "TIỀN", "THIẾT LẬP", "CHÂN MENU"] as const;
export type NhomThanhBen = (typeof NHOM_THANH_BEN)[number];

export interface NhomGap {
  readonly ma: string;
  readonly nhan: string;
}
const DIEU_PHOI: NhomGap = { ma: "dieu-phoi", nhan: "Điều phối" };

export interface ChoThanhBen extends ChoDat {
  readonly nhom: NhomThanhBen;
  /** Tên biểu tượng ở web/icons.ts (web/shell.ts kiểm kiểu lúc biên dịch). */
  readonly bieuTuong?: string;
  /** Các mục LIỀN NHAU cùng `ma` gập thành một nhóm (web/shell.ts `nutGap`); nhóm chỉ còn một mục hiện thì hiện phẳng. */
  readonly nhomGap?: NhomGap;
  /** Mục gộp: sáng ở trang của BẤT KỲ khoá nào trong `gom` (và trang của chính nó). Các trang gom phải CÙNG điều kiện hiện với mục (bài tập quyền ép). */
  readonly gom?: readonly KhoaTrang[];
  /** Địa chỉ mở riêng theo trang đang đứng (Góp ý: mở form mới, kèm nơi quay về). */
  readonly moTu?: (duongHienTai: string) => string;
}

export const THANH_BEN = [
  { nhom: "HẰNG NGÀY", trang: "trangChu", nhan: "Trang chủ", bieuTuong: "home" },
  // Tài xế: "Trang chủ" của họ là /tai-xe; "Cuốc của tôi" cho mọi tài khoản tài xế công ty (kể cả kiêm văn phòng — K2b T2).
  { nhom: "HẰNG NGÀY", trang: "trangTaiXe", nhan: "Trang chủ", bieuTuong: "home" },
  { nhom: "HẰNG NGÀY", trang: "donHang", nhan: "Đơn hàng", bieuTuong: "orders" },
  { nhom: "HẰNG NGÀY", trang: "danhBa", nhan: "Danh bạ", bieuTuong: "contact-card" },
  { nhom: "HẰNG NGÀY", trang: "cuoc", nhan: "Cuốc của tôi", bieuTuong: "assign" },
  { nhom: "HẰNG NGÀY", trang: "ban", nhan: "Báo bận của tôi", bieuTuong: "clock" },
  { nhom: "VẬN CHUYỂN", trang: "dieuPhoi", nhan: "Điều phối xe", bieuTuong: "truck", nhomGap: DIEU_PHOI },
  { nhom: "VẬN CHUYỂN", trang: "deNghi", nhan: "Đề nghị chuyển khách", bieuTuong: "swap", nhomGap: DIEU_PHOI },
  { nhom: "VẬN CHUYỂN", trang: "xeDangChay", nhan: "Xe đang chạy", bieuTuong: "pin" },
  { nhom: "VẬN CHUYỂN", trang: "xe", nhan: "Xe & giấy tờ", bieuTuong: "doc-check", gom: ["xe", "lichXeBan", "sapHetHan"] },
  // Kiểm số 15/10: hai trang có cùng điều kiện hiện trên mọi tập quyền (tập lệch: 0) nên gộp được.
  { nhom: "VẬN CHUYỂN", trang: "bangGiaXe", nhan: "Giá & chi phí", bieuTuong: "money", gom: ["bangGiaXe", "bangKeXe"] },
  { nhom: "TIỀN", trang: "dieuChinhCongNo", nhan: "Điều chỉnh công nợ", bieuTuong: "money" },
  // Sổ công nợ (25/10) gộp với Khoá sổ tháng — cùng điều kiện hiện (ledger.view không ngữ cảnh); giữ trần 10 mục hiện sẵn của Toàn quyền. Trang Sổ công nợ có lối sang Khoá sổ tháng.
  { nhom: "TIỀN", trang: "soCongNo", nhan: "Sổ công nợ & khoá sổ", bieuTuong: "lock", gom: ["soCongNo", "khoaThang"] },
  { nhom: "THIẾT LẬP", trang: "hoaHong", nhan: "Hoa hồng đối tác" },
  { nhom: "THIẾT LẬP", trang: "luatBan", nhan: "Luật bán" },
  { nhom: "THIẾT LẬP", trang: "nguoiBan", nhan: "Người bán dịch vụ" },
  { nhom: "THIẾT LẬP", trang: "chupBu", nhan: "Chụp bù mức" },
  { nhom: "THIẾT LẬP", trang: "dichVu", nhan: "Dịch vụ & giá" },
  { nhom: "THIẾT LẬP", trang: "diaDiem", nhan: "Địa điểm" },
  { nhom: "THIẾT LẬP", trang: "loaiGiayToNguoi", nhan: "Loại giấy tờ cá nhân" },
  { nhom: "THIẾT LẬP", trang: "loaiGiayToXe", nhan: "Loại giấy tờ xe" },
  { nhom: "THIẾT LẬP", trang: "lyDoDieuPhoi", nhan: "Lý do điều phối" },
  { nhom: "THIẾT LẬP", trang: "chinhSachDieuPhoi", nhan: "Chính sách điều phối" },
  { nhom: "THIẾT LẬP", trang: "taiKhoan", nhan: "Quản lý tài khoản" },
  { nhom: "THIẾT LẬP", trang: "phien", nhan: "Máy đang đăng nhập" },
  { nhom: "THIẾT LẬP", trang: "nhatKy", nhan: "Nhật ký" },
  { nhom: "THIẾT LẬP", trang: "guiThongBao", nhan: "Gửi thông báo" },
  { nhom: "THIẾT LẬP", trang: "troLy", nhan: "Trợ lý Hỗ trợ" },
  { nhom: "THIẾT LẬP", trang: "giaoDien", nhan: "Giao diện" },
  { nhom: "CHÂN MENU", trang: "toi", nhan: "Của tôi", bieuTuong: "me" },
  { nhom: "CHÂN MENU", trang: "gopY", nhan: "Hỗ trợ", bieuTuong: "handset", moTu: (p: string) => `/feedback?new=1&from=${encodeURIComponent(p)}` },
  { nhom: "CHÂN MENU", trang: "troGiup", nhan: "Hướng dẫn", bieuTuong: "help" },
] as const satisfies readonly ChoThanhBen[];

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Thanh tab điện thoại: văn phòng / Đối tác, Thực tập / tài xế, rồi hai tab quản trị, cuối cùng "Tôi".

export interface ChoThanhTab extends ChoDat {
  readonly bieuTuong: string;
}

export const THANH_TAB = [
  { trang: "trangChu", nhan: "Trang chủ", bieuTuong: "home" },
  { trang: "trangTaiXe", nhan: "Trang chủ", bieuTuong: "home" },
  { trang: "donHang", nhan: "Đơn hàng", bieuTuong: "orders" },
  { trang: "taoDon", nhan: "Tạo đơn", bieuTuong: "plus" },
  { trang: "taiKhoan", nhan: "Tài khoản", bieuTuong: "staff", chiKhi: { that: (s: PermissionHolder) => !can(s, "admin.manage") } },
  { trang: "soCongNo", nhan: "Sổ công nợ", bieuTuong: "lock", chiKhi: { that: (s: PermissionHolder) => !can(s, "order.create") } },
  { trang: "danhBa", nhan: "Danh bạ", bieuTuong: "contact-card", chiKhi: { that: (s: PermissionHolder) => can(s, "order.create") && !can(s, "admin.manage") } },
  { trang: "thietLap", nhan: "Thiết lập", bieuTuong: "settings" },
  { trang: "cuoc", nhan: "Cuốc của tôi", bieuTuong: "assign", chiKhi: { that: chiTaiXe } },
  { trang: "ban", nhan: "Báo bận", bieuTuong: "clock" },
  { trang: "gopY", nhan: "Hỗ trợ", bieuTuong: "handset", chiKhi: { that: (s: PermissionHolder) => !seesAllOrders(s) } },
  { trang: "troGiup", nhan: "Hướng dẫn", bieuTuong: "help", chiKhi: { that: (s: PermissionHolder) => !seesAllOrders(s) && !can(s, "order.create") && !chiTaiXe(s) } },
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
  { phan: "dau", trang: "choXacNhan", nhan: "Đơn chờ xác nhận" },
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
  { phan: "sau", trang: "soCongNo", nhan: "Sổ công nợ" },
  { phan: "sau", trang: "khoaThang", nhan: "Khoá sổ tháng" },
  { phan: "sau", trang: "dieuChinhCongNo", nhan: "Điều chỉnh công nợ" },
  { phan: "sau", trang: "hoaHong", nhan: "Hoa hồng đối tác" },
  { phan: "sau", trang: "luatBan", nhan: "Luật bán" },
  { phan: "sau", trang: "nguoiBan", nhan: "Người bán dịch vụ" },
  { phan: "sau", trang: "chupBu", nhan: "Chụp bù mức" },
  { phan: "sau", trang: "nhatKy", nhan: "Nhật ký" },
  { phan: "sau", trang: "phien", nhan: "Máy đang đăng nhập" },
  { phan: "sau", trang: "guiThongBao", nhan: "Gửi thông báo" },
  { phan: "sau", trang: "troLy", nhan: "Trợ lý Hỗ trợ" },
  { phan: "sau", trang: "giaoDien", nhan: "Giao diện" },
  { phan: "sau", trang: "gopY", nhan: "Hỗ trợ", khongSangTabToi: true },
  { phan: "sau", trang: "troGiup", nhan: "Hướng dẫn" },
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

export interface MucThanhBen {
  readonly trang: KhoaTrang;
  readonly nhan: string;
  readonly href: string;
  readonly bieuTuong?: string;
  readonly gom?: readonly KhoaTrang[];
  readonly nhomGap?: NhomGap;
}

/** Mục thanh bên sáng ở đường này: trang của chính nó hoặc của BẤT KỲ khoá nào trong `gom` (mục gộp "Xe & giấy tờ", "Giá & chi phí"). */
export function sangTaiMuc(c: { readonly trang: KhoaTrang; readonly gom?: readonly KhoaTrang[] }, duong: string): boolean {
  return sangTai(c.trang, duong) || (c.gom ?? []).some((k) => sangTai(k, duong));
}

/** Năm nhóm của thanh bên, mỗi nhóm các mục đang hiện theo thứ tự. `duongHienTai` chỉ dùng cho địa chỉ mở riêng. */
export function thanhBen(n: NguoiXem, duongHienTai: string): { nhom: NhomThanhBen; muc: MucThanhBen[] }[] {
  return NHOM_THANH_BEN.map((nhom) => ({
    nhom,
    muc: (THANH_BEN as readonly ChoThanhBen[])
      .filter((c) => c.nhom === nhom && coHien(c, n))
      .map((c): MucThanhBen => ({ trang: c.trang, nhan: c.nhan, href: c.moTu ? c.moTu(duongHienTai) : TRANG[c.trang].duong, bieuTuong: c.bieuTuong, gom: c.gom, nhomGap: c.nhomGap })),
  }));
}

export type KhoiThanhBen = MucThanhBen | { readonly nhomGap: NhomGap; readonly muc: MucThanhBen[] };

/** Gom các mục liền nhau cùng `nhomGap.ma` thành một khối; nhóm chỉ có một mục trả mục phẳng. */
export function gomNhomGap(muc: readonly MucThanhBen[]): KhoiThanhBen[] {
  const kq: KhoiThanhBen[] = [];
  for (let i = 0, j; i < muc.length; i = j) {
    const g = muc[i]!.nhomGap;
    for (j = i + 1; g && muc[j]?.nhomGap?.ma === g.ma; j++);
    kq.push(g && j - i > 1 ? { nhomGap: g, muc: muc.slice(i, j) } : muc[i]!);
  }
  return kq;
}

/** Số khối hiện sẵn trên thanh bên (trần 10): mọi nhóm trừ CHÂN MENU, mỗi nhóm gập đếm 1, THIẾT LẬP đếm 1 khi có mục. */
export function demMucHienSan(nhomHien: ReturnType<typeof thanhBen>): number {
  return nhomHien.reduce((t, g) => t + (g.nhom === "CHÂN MENU" ? 0 : g.nhom === "THIẾT LẬP" ? +!!g.muc.length : gomNhomGap(g.muc).length), 0);
}

/**
 * Nhóm THIẾT LẬP mở sẵn khi: đang đứng trong một trang của nhóm, HOẶC không còn nhóm nào khác ngoài chân menu (vd Nhân sự chỉ có Quản lý tài khoản).
 * Chỉ mục HIỆN cho người này mới tính (`nhomHien` là kết quả `thanhBen()`).
 */
export function thietLapMoSan(nhomHien: readonly { nhom: NhomThanhBen; muc: readonly MucThanhBen[] }[], duong: string): boolean {
  const tl = nhomHien.find((g) => g.nhom === "THIẾT LẬP");
  return !!tl?.muc.length && (!nhomHien.some((g) => g !== tl && g.nhom !== "CHÂN MENU" && g.muc.length) || tl.muc.some((m) => sangTaiMuc(m, duong)));
}

/** Nhãn của trang theo đường (chữ trên thanh công việc khi trang không khai data-title): mục thanh bên ĐẦU TIÊN sáng ở đường này — mọi mục, không xét quyền. */
export function nhanTheoDuong(duong: string): string | null {
  return (THANH_BEN as readonly ChoThanhBen[]).find((c) => sangTaiMuc(c, duong))?.nhan ?? null;
}

/**
 * Trang cha của trang con (đường đi «Trang cha ›» ở thanh trên máy tính): khoá ĐẦU TIÊN theo thứ tự TRANG có `cungSang` chứa đường; trang cấp một → null.
 * Bỏ qua `thietLap`: `cungSang` của nó chỉ tô sáng tab, /thiet-lap chỉ mở cho Quản trị (đặc tả 5.1).
 */
export function trangChaCua(duong: string): { nhan: string; href: string } | null {
  const k = KHOA_TRANG.find((x) => x !== "thietLap" && ((TRANG[x] as TrangDich).cungSang ?? []).includes(duong));
  if (!k) return null;
  const nhan = nhanTheoDuong(TRANG[k].duong) ?? (TRANG_TOI as readonly ChoTrangToi[]).find((c) => c.trang === k)?.nhan ?? THANH_TAB.find((c) => c.trang === k)?.nhan ?? "";
  return { nhan, href: TRANG[k].duong };
}

export interface MucHien {
  readonly trang: KhoaTrang;
  readonly nhan: string;
  readonly href: string;
}
const hienRa = (c: ChoDat): MucHien => ({ trang: c.trang, nhan: c.nhan, href: TRANG[c.trang].duong });

/** Tối đa 5 tab: nhiều hơn thì giữ 4 mục đầu + "Tôi"; "Tạo đơn" đứng giữa nhờ thứ tự khai (bài thanh-tab-theo-bo-quyen). */
export function thanhTab(n: NguoiXem): (MucHien & { readonly bieuTuong: string })[] {
  const t = (THANH_TAB as readonly ChoThanhTab[]).filter((c) => coHien(c, n)).map((c) => ({ ...hienRa(c), bieuTuong: c.bieuTuong }));
  return t.length > 5 ? t.slice(0, 4).concat(t.slice(-1)) : t;
}

export function thanhTren(n: NguoiXem): (MucHien & { readonly kieu: ChoThanhTren["kieu"] })[] {
  return (THANH_TREN as readonly ChoThanhTren[]).filter((c) => coHien(c, n)).map((c) => ({ ...hienRa(c), kieu: c.kieu }));
}

/** Tab "Tôi" sáng ở trang Tôi và các trang mở từ trang Tôi (trừ dòng `khongSangTabToi`) mà người xem KHÔNG có tab riêng (`tabHien` = khoá các tab đang hiện). */
export function sangTabToi(duong: string, tabHien: readonly KhoaTrang[]): boolean {
  if (duong === TRANG.toi.duong) return true;
  return !tabHien.some((k) => sangTai(k, duong)) && (TRANG_TOI as readonly ChoTrangToi[]).some((c) => !c.khongSangTabToi && sangTai(c.trang, duong));
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

/** KHÔNG CÒN DÙNG ở shell (Đợt 0 Task 13: mất mạng thì không dựng điều hướng đoán mò); giữ xuất cho bài ảnh chụp và kịch bản `--so-sanh`. Cũ: mất mạng lúc mở trang, chưa có bản nhớ khung (QA2 Q2-04): không biết vai — bốn tab cơ bản để còn điều hướng; không dựng thanh bên. */
export const KHUNG_MAT_MANG: CoKhungNho = { admin: false, seesAll: true, office: true, canCreate: true };
