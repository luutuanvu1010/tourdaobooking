// Lưới ô chức năng của Trang chủ điện thoại (bản vẽ "Trang chu dien thoai.dc.html" 1a–1g, Claude Design 2026-09-30; lệnh thiết kế
// docs/superpowers/specs/2026-09-30-trang-chu-dien-thoai-kieu-momo-lenh-claude-design.md — chủ chốt 30/9 câu 1: lưới chứa MỌI chức năng người đó được dùng,
// theo đúng quyền hiện có). Logic thuần, có test cạnh tệp; web/home.ts dựng ô và gắn biểu tượng.
//
// KHÔNG đổi bản đồ quyền: mỗi ô trỏ tới MỘT trang của bảng mục (src/shared/muc-giao-dien.ts — TRANG): đường trang và ai thấy lấy từ đó, cùng câu mà thanh bên
// máy tính và trang Tôi hỏi; ô hẹp hơn trang thì khai `chiKhi` (bài rào src/muc-hien-mo-duoc-{1,2,3}.test.ts đòi ghi lý do). Máy chủ vẫn kiểm lại ở từng trang; lưới chỉ
// là lối vào.
import { TRANG, coHien, type ChoDat } from "./muc-giao-dien.ts";
import type { PermissionHolder } from "./permissions.ts";
import { chiTaiXe } from "./start-page.ts";

/** Tối đa 8 chỗ (2 hàng × 4 — giả định G1 của lệnh thiết kế); người có hơn 8 chức năng: 7 ô đầu + ô "Tất cả" mở bảng trượt. */
export const TOI_DA_O = 8;

/** Bốn nhóm của bảng trượt "Tất cả chức năng" (bản vẽ 1c), đúng thứ tự. */
export const NHOM_O = ["Bán hàng", "Quản lý", "Vận chuyển", "Của tôi"] as const;
export type NhomO = (typeof NHOM_O)[number];

export type KhoaO =
  | "tao-don" | "don-hang" | "danh-ba"
  | "dich-vu" | "tai-khoan" | "phien" | "dia-diem" | "giay-to-nguoi" | "nhat-ky" | "gui-thong-bao" | "tro-ly" | "giao-dien"
  | "dieu-phoi" | "bang-gia-xe" | "bang-ke-xe" | "cuoc" | "xe" | "sap-het-han" | "giay-to-xe" | "chinh-sach" | "ly-do"
  | "toi" | "gop-y" | "tro-giup";

export interface OChucNang {
  khoa: KhoaO;
  nhan: string;
  href: string;
}

export interface DinhNghiaO extends ChoDat {
  readonly khoa: KhoaO;
  readonly nhom: NhomO;
}

/**
 * Mọi ô, theo thứ tự trong từng nhóm của bảng trượt. Nhãn lấy theo tên đang dùng ở thanh bên / trang Tôi (vd "Loại giấy tờ cá nhân", không phải "Loại giấy tờ
 * người" của bản vẽ) để một chức năng chỉ có một tên trong Nền tảng. Ai thấy ô và đường mở: trang `trang` của bảng mục (thêm `chiKhi` nếu ô hẹp hơn trang).
 */
export const O_TRANG_CHU: readonly DinhNghiaO[] = [
  { khoa: "tao-don", nhan: "Tạo đơn", nhom: "Bán hàng", trang: "taoDon" },
  { khoa: "don-hang", nhan: "Đơn hàng", nhom: "Bán hàng", trang: "donHang" },
  { khoa: "danh-ba", nhan: "Danh bạ", nhom: "Bán hàng", trang: "danhBa" },
  { khoa: "dich-vu", nhan: "Dịch vụ & giá", nhom: "Quản lý", trang: "dichVu" },
  { khoa: "tai-khoan", nhan: "Quản lý tài khoản", nhom: "Quản lý", trang: "taiKhoan" },
  { khoa: "phien", nhan: "Máy đang đăng nhập", nhom: "Quản lý", trang: "phien" },
  { khoa: "dia-diem", nhan: "Địa điểm", nhom: "Quản lý", trang: "diaDiem" },
  { khoa: "giay-to-nguoi", nhan: "Loại giấy tờ cá nhân", nhom: "Quản lý", trang: "loaiGiayToNguoi" },
  { khoa: "nhat-ky", nhan: "Nhật ký", nhom: "Quản lý", trang: "nhatKy" },
  { khoa: "gui-thong-bao", nhan: "Gửi thông báo", nhom: "Quản lý", trang: "guiThongBao" },
  { khoa: "tro-ly", nhan: "Trợ lý Hỗ trợ", nhom: "Quản lý", trang: "troLy" },
  { khoa: "giao-dien", nhan: "Giao diện", nhom: "Quản lý", trang: "giaoDien" }, // ADR-0087 (bản 1.67)
  { khoa: "dieu-phoi", nhan: "Điều phối xe", nhom: "Vận chuyển", trang: "dieuPhoi" },
  { khoa: "bang-gia-xe", nhan: "Bảng giá thuê xe", nhom: "Vận chuyển", trang: "bangGiaXe" }, // Tiền xe thuê (bản vẽ Đợt 4)
  { khoa: "bang-ke-xe", nhan: "Bảng kê chi phí xe", nhom: "Vận chuyển", trang: "bangKeXe" },
  // Tài khoản vừa tài xế công ty vừa văn phòng (K2b T2): lối tới "Cuốc của tôi" — tài khoản chỉ tài xế có tab riêng và không ở Trang chủ này.
  { khoa: "cuoc", nhan: "Cuốc của tôi", nhom: "Vận chuyển", trang: "cuoc", chiKhi: { that: (w) => !chiTaiXe(w) } },
  { khoa: "xe", nhan: "Xe", nhom: "Vận chuyển", trang: "xe" },
  { khoa: "sap-het-han", nhan: "Giấy tờ sắp hết hạn", nhom: "Vận chuyển", trang: "sapHetHan" },
  { khoa: "giay-to-xe", nhan: "Loại giấy tờ xe", nhom: "Vận chuyển", trang: "loaiGiayToXe" },
  { khoa: "chinh-sach", nhan: "Chính sách điều phối", nhom: "Vận chuyển", trang: "chinhSachDieuPhoi" },
  { khoa: "ly-do", nhan: "Lý do điều phối", nhom: "Vận chuyển", trang: "lyDoDieuPhoi" },
  { khoa: "gop-y", nhan: "Hỗ trợ", nhom: "Của tôi", trang: "gopY" },
  { khoa: "tro-giup", nhan: "Trợ giúp", nhom: "Của tôi", trang: "troGiup" },
];
const DS = O_TRANG_CHU;

/** Thứ tự ưu tiên lên lưới chính (bảng mục 5 của lệnh thiết kế, từ trên xuống); ô ngoài danh sách này xếp sau theo thứ tự của DS. */
const UU_TIEN: readonly KhoaO[] = ["tao-don", "don-hang", "danh-ba", "dieu-phoi", "xe", "sap-het-han", "dich-vu", "tai-khoan", "dia-diem", "cuoc", "gop-y", "tro-giup"];

export interface LuoiTrangChu {
  /** Ô hiện trên lưới chính — đủ hết khi ≤ 8; hơn 8 thì 7 ô đầu (chỗ thứ 8 là ô "Tất cả"). */
  luoi: OChucNang[];
  coTatCa: boolean;
  /** Bảng trượt "Tất cả chức năng": mọi ô người đó dùng được, theo nhóm; nhóm rỗng bị bỏ. */
  nhom: { ten: NhomO; o: OChucNang[] }[];
}

const bo = ({ khoa, nhan, trang }: DinhNghiaO): OChucNang => ({ khoa, nhan, href: TRANG[trang].duong });

/** `bo`: khoá không lên lưới chính (vẫn có trong bảng trượt); `toiDa`: số chỗ của lưới chính, kể cả ô "Tất cả". */
export function oTrangChu(who: PermissionHolder, tuyChon: { bo?: readonly KhoaO[]; toiDa?: number } = {}): LuoiTrangChu {
  const { bo: khongLen = [], toiDa = TOI_DA_O } = tuyChon;
  const duoc = DS.filter((o) => coHien(o, { staff: who }));
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
 * Ô có tab riêng ở thanh tab điện thoại (THANH_TAB của bảng mục): tab và ô cùng trỏ một trang của bảng mục, không dòng nào hẹp hơn trang — nên người có ô thì
 * luôn có tab, lưới điện thoại không lặp lại (bản vẽ "Trang chu Quan tri.dc.html" 1c, 1d, bản 1.73).
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
export const O_TOI: OChucNang = { khoa: "toi", nhan: "Tôi", href: TRANG.toi.duong };

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
