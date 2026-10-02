// Lưới ô chức năng của Trang chủ điện thoại (bản vẽ "Trang chu dien thoai.dc.html" 1a–1g, Claude Design 2026-09-30; lệnh thiết kế
// docs/superpowers/specs/2026-09-30-trang-chu-dien-thoai-kieu-momo-lenh-claude-design.md — chủ chốt 30/9 câu 1: lưới chứa MỌI chức năng người đó được dùng,
// theo đúng quyền hiện có). Logic thuần, có test cạnh tệp; web/home.ts dựng ô và gắn biểu tượng.
//
// KHÔNG đổi bản đồ quyền: mỗi ô hỏi ĐÚNG câu mà thanh bên máy tính (web/shell.ts navGroups) và trang Tôi (web/account.ts) đang hỏi — `can()` của bảng quyền,
// `isOffice`, `coMucDonHang`, `thayDieuPhoiXe`, `coCuocCuaToi`/`chiTaiXe` — không hỏi mã quyền (web/CLAUDE.md, bài src/giao-dien-hoi-bang-quyen.test.ts).
// Máy chủ vẫn kiểm lại ở từng trang; lưới chỉ là lối vào.
import { thayDieuPhoiXe } from "./dieu-phoi-man.ts";
import { can, isOffice, seesAllOrders, type PermissionHolder } from "./permissions.ts";
import { chiTaiXe, coCuocCuaToi, coMucDonHang } from "./start-page.ts";

/** Tối đa 8 chỗ (2 hàng × 4 — giả định G1 của lệnh thiết kế); người có hơn 8 chức năng: 7 ô đầu + ô "Tất cả" mở bảng trượt. */
export const TOI_DA_O = 8;

/** Bốn nhóm của bảng trượt "Tất cả chức năng" (bản vẽ 1c), đúng thứ tự. */
export const NHOM_O = ["Bán hàng", "Quản lý", "Vận chuyển", "Của tôi"] as const;
export type NhomO = (typeof NHOM_O)[number];

export type KhoaO =
  | "tao-don" | "don-hang" | "danh-ba"
  | "dich-vu" | "tai-khoan" | "phien" | "dia-diem" | "giay-to-nguoi" | "nhat-ky" | "gui-thong-bao" | "tro-ly" | "giao-dien"
  | "dieu-phoi" | "cuoc" | "xe" | "sap-het-han" | "giay-to-xe" | "chinh-sach" | "ly-do"
  | "toi" | "gop-y" | "tro-giup";

export interface OChucNang {
  khoa: KhoaO;
  nhan: string;
  href: string;
}

interface DinhNghiaO extends OChucNang {
  nhom: NhomO;
  co: (who: PermissionHolder) => boolean;
}

const quanLyXe = (who: PermissionHolder): boolean => can(who, "vehicle.manage");

/**
 * Mọi ô, theo thứ tự trong từng nhóm của bảng trượt. Nhãn lấy theo tên đang dùng ở thanh bên / trang Tôi (vd "Loại giấy tờ cá nhân", không phải "Loại giấy tờ
 * người" của bản vẽ) để một chức năng chỉ có một tên trong app. Điều kiện từng ô chép đúng điều kiện của mục cùng tên ở web/shell.ts / web/account.ts.
 */
const DS: readonly DinhNghiaO[] = [
  { khoa: "tao-don", nhan: "Tạo đơn", href: "/order-form", nhom: "Bán hàng", co: (w) => can(w, "order.create") },
  { khoa: "don-hang", nhan: "Đơn hàng", href: "/orders", nhom: "Bán hàng", co: (w) => coMucDonHang({ seesAll: seesAllOrders(w), canCreate: can(w, "order.create") }) },
  { khoa: "danh-ba", nhan: "Danh bạ", href: "/parties", nhom: "Bán hàng", co: isOffice },
  { khoa: "dich-vu", nhan: "Dịch vụ & giá", href: "/catalog", nhom: "Quản lý", co: (w) => can(w, "admin.manage") },
  { khoa: "tai-khoan", nhan: "Quản lý tài khoản", href: "/staff", nhom: "Quản lý", co: (w) => can(w, "account.view") },
  { khoa: "phien", nhan: "Phiên đăng nhập", href: "/sessions", nhom: "Quản lý", co: (w) => can(w, "auth.session.viewAll") },
  { khoa: "dia-diem", nhan: "Địa điểm", href: "/locations", nhom: "Quản lý", co: (w) => can(w, "admin.manage") },
  { khoa: "giay-to-nguoi", nhan: "Loại giấy tờ cá nhân", href: "/loai-giay-to-nguoi", nhom: "Quản lý", co: (w) => can(w, "admin.manage") },
  { khoa: "nhat-ky", nhan: "Nhật ký", href: "/audit", nhom: "Quản lý", co: (w) => can(w, "audit.view") },
  { khoa: "gui-thong-bao", nhan: "Gửi thông báo", href: "/gui-thong-bao", nhom: "Quản lý", co: (w) => can(w, "notice.send") },
  { khoa: "tro-ly", nhan: "Trợ lý Hỗ trợ", href: "/tro-ly-cai-dat", nhom: "Quản lý", co: (w) => can(w, "settings.ops") },
  // ADR-0087 (bản 1.67): màn Giao diện công ty — cùng ô settings.ops với mục "Giao diện" ở thanh bên / trang Tôi.
  { khoa: "giao-dien", nhan: "Giao diện", href: "/giao-dien", nhom: "Quản lý", co: (w) => can(w, "settings.ops") },
  { khoa: "dieu-phoi", nhan: "Điều phối xe", href: "/dieu-phoi", nhom: "Vận chuyển", co: thayDieuPhoiXe },
  // Tài khoản vừa tài xế công ty vừa văn phòng (K2b T2): lối tới "Cuốc của tôi" — tài khoản chỉ tài xế có tab riêng và không ở Trang chủ này.
  { khoa: "cuoc", nhan: "Cuốc của tôi", href: "/cuoc", nhom: "Vận chuyển", co: (w) => coCuocCuaToi(w) && !chiTaiXe(w) },
  { khoa: "xe", nhan: "Xe", href: "/xe", nhom: "Vận chuyển", co: quanLyXe },
  { khoa: "sap-het-han", nhan: "Giấy tờ sắp hết hạn", href: "/giay-to-sap-het-han", nhom: "Vận chuyển", co: quanLyXe },
  { khoa: "giay-to-xe", nhan: "Loại giấy tờ xe", href: "/loai-giay-to-xe", nhom: "Vận chuyển", co: (w) => quanLyXe(w) && can(w, "admin.manage") },
  { khoa: "chinh-sach", nhan: "Chính sách điều phối", href: "/chinh-sach-dieu-phoi", nhom: "Vận chuyển", co: (w) => quanLyXe(w) && can(w, "settings.ops") },
  { khoa: "ly-do", nhan: "Lý do điều phối", href: "/ly-do-dieu-phoi", nhom: "Vận chuyển", co: (w) => quanLyXe(w) && can(w, "admin.manage") },
  { khoa: "gop-y", nhan: "Góp ý / Báo lỗi", href: "/feedback", nhom: "Của tôi", co: () => true },
  { khoa: "tro-giup", nhan: "Trợ giúp", href: "/help", nhom: "Của tôi", co: () => true },
];

/** Thứ tự ưu tiên lên lưới chính (bảng mục 5 của lệnh thiết kế, từ trên xuống); ô ngoài danh sách này xếp sau theo thứ tự của DS. */
const UU_TIEN: readonly KhoaO[] = ["tao-don", "don-hang", "danh-ba", "dieu-phoi", "xe", "sap-het-han", "dich-vu", "tai-khoan", "dia-diem", "cuoc", "gop-y", "tro-giup"];

export interface LuoiTrangChu {
  /** Ô hiện trên lưới chính — đủ hết khi ≤ 8; hơn 8 thì 7 ô đầu (chỗ thứ 8 là ô "Tất cả"). */
  luoi: OChucNang[];
  coTatCa: boolean;
  /** Bảng trượt "Tất cả chức năng": mọi ô người đó dùng được, theo nhóm; nhóm rỗng bị bỏ. */
  nhom: { ten: NhomO; o: OChucNang[] }[];
}

const bo = ({ khoa, nhan, href }: DinhNghiaO): OChucNang => ({ khoa, nhan, href });

/** `bo`: khoá không lên lưới chính (vẫn có trong bảng trượt); `toiDa`: số chỗ của lưới chính, kể cả ô "Tất cả". */
export function oTrangChu(who: PermissionHolder, tuyChon: { bo?: readonly KhoaO[]; toiDa?: number } = {}): LuoiTrangChu {
  const { bo: khongLen = [], toiDa = TOI_DA_O } = tuyChon;
  const duoc = DS.filter((o) => o.co(who));
  const hang = (k: KhoaO): number => {
    const i = UU_TIEN.indexOf(k);
    return i === -1 ? UU_TIEN.length + DS.findIndex((o) => o.khoa === k) : i;
  };
  const xep = duoc.filter((o) => !khongLen.includes(o.khoa)).sort((a, b) => hang(a.khoa) - hang(b.khoa));
  const coTatCa = xep.length > toiDa;
  return {
    luoi: (coTatCa ? xep.slice(0, toiDa - 1) : xep).map(bo),
    coTatCa,
    nhom: NHOM_O.map((ten) => ({ ten, o: duoc.filter((o) => o.nhom === ten).map(bo) })).filter((g) => g.o.length > 0),
  };
}

/**
 * Ô có tab riêng ở thanh tab điện thoại (web/shell.ts tabsFor): điều kiện hiện tab TRÙNG đúng điều kiện ô cùng tên ở DS (order.create, coMucDonHang,
 * admin.manage, account.view) — nên người có ô thì luôn có tab, lưới điện thoại không lặp lại (bản vẽ "Trang chu Quan tri.dc.html" 1c, 1d, bản 1.73).
 */
export const KHOA_CO_TAB: readonly KhoaO[] = ["tao-don", "don-hang", "dich-vu", "tai-khoan"];
/** Lưới điện thoại 1.73: một hàng 4 chỗ (3 ô + "Tất cả" khi thừa). */
export const O_DIEN_THOAI = 4;
export function luoiDienThoai(who: PermissionHolder): LuoiTrangChu {
  return oTrangChu(who, { bo: KHOA_CO_TAB, toiDa: O_DIEN_THOAI });
}
/** Thẻ "Lối tắt" máy tính 1.73: 7 ô + "Tất cả"; bỏ "Tạo đơn" vì thanh trên máy tính đã có nút "Tạo đơn" (bản vẽ 1a, 1b). */
export function loiTatMayTinh(who: PermissionHolder): LuoiTrangChu {
  return oTrangChu(who, { bo: ["tao-don"] });
}

/**
 * Ô "Tôi" — CHỈ dải chào máy tính (bản vẽ "Trang chu may tinh v2.dc.html": đầu nhóm "Của tôi"). Điện thoại có tab "Tôi" ở thanh tab nên lưới và bảng
 * trượt không có ô này. Không hỏi quyền: mọi người vào được trang Tôi của mình (như mục "Của tôi" ở thanh bên).
 */
export const O_TOI: OChucNang = { khoa: "toi", nhan: "Tôi", href: "/account" };

/**
 * Màu của ô theo NHÓM (thị giác 1.70, chủ dự án duyệt 2026-10-02): "chot" = san hô (Tạo đơn — hành động chốt), "vc" = ngọc (Vận chuyển), "toi" = cát (Của tôi,
 * kể cả ô Tôi của máy tính); null = màu biển mặc định (Bán hàng, Quản lý). web/home.ts gắn lớp `dash-o-hop-<màu>`; nhóm lấy từ đúng bảng DS ở trên.
 */
export type MauO = "chot" | "vc" | "toi";
export function mauO(khoa: KhoaO): MauO | null {
  if (khoa === "tao-don") return "chot";
  const nhom = khoa === O_TOI.khoa ? "Của tôi" : DS.find((o) => o.khoa === khoa)?.nhom;
  return nhom === "Vận chuyển" ? "vc" : nhom === "Của tôi" ? "toi" : null;
}

/** Nhóm ô của dải chào máy tính: MỌI chức năng (không giới hạn 8, không ô "Tất cả"), cùng nhóm và thứ tự như bảng trượt điện thoại, thêm ô "Tôi". */
export function nhomMayTinh(who: PermissionHolder): LuoiTrangChu["nhom"] {
  return oTrangChu(who).nhom.map((g) => (g.ten === "Của tôi" ? { ten: g.ten, o: [O_TOI, ...g.o] } : g));
}
