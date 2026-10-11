// Chữ và luật hiển thị thuần của hai màn «Hoa hồng đối tác» (/hoa-hong) và «Người bán dịch vụ» (/nguoi-ban) — web/hoa-hong.ts, web/nguoi-ban.ts (sổ đại lý đợt 1, Task 10).
// Nhãn mức đi qua MỘT nguồn `nhanMuc` / `nhanTyLeBp` (so-dai-ly-nhan.ts); không mã thô (RATE, PER_PAX, MISSING, NONE…) ra người dùng. Giao diện không tính tiền, không chọn mức:
// «mức nào thắng» do máy chủ trả (`bac`), ở đây chỉ dịch bậc ra lời.
import type { CommissionRuleDto, DoiTuongMucDto, SupplyTermDto, ThuTraResponse } from "./contracts.ts";
import { can, holdsPartner, type PermissionHolder } from "./permissions.ts";
import { nhanMuc, nhanTyLeBp } from "./so-dai-ly-nhan.ts";

export const CAU_KHONG_CO_QUYEN_XEM = "Bạn không có quyền xem trang này.";
/** Thay ô tìm đối tác ở người không qua cổng của route tìm người hưởng (xem `coTheTimDoiTac`). */
export const CAU_CHUA_TIM_DUOC_DOI_TAC = "Tài khoản của bạn chưa tìm được đối tác theo tên. Cần đặt mức riêng cho một đối tác thì nhờ Quản trị hoặc Toàn quyền.";
/** Hộp xác nhận khi đóng dòng «Mọi dịch vụ» của công ty chủ (đặc tả sổ đại lý đợt 1: dòng mặc định gieo sẵn; đóng mà không mở dòng mới thì dịch vụ thiếu người bán). */
export const CAU_DONG_DONG_MAC_DINH = "Đóng dòng mặc định thì dịch vụ chưa có điều khoản riêng sẽ thiếu người bán cho tới khi mở dòng mới. Vẫn đóng?";
export const CAU_KHONG_CO_MUC = "Chưa có mức nào.";
export const CAU_KHONG_CO_DIEU_KHOAN = "Chưa có điều khoản nào.";
export const CAU_KHONG_KHOP_LOC = "Không có dòng nào khớp bộ lọc.";
export const CAU_KHONG_CO_NGUOI_HUONG = "Không có người hưởng hoa hồng";
export const NHAN_CONG_TY = "Tour Đảo (công ty)";

/**
 * Tìm đối tác theo tên (ô «Một đối tác», khối Thử tra) gọi `GET /api/pricing/nguoi-huong`, route đó hỏi `order.create` và chặn tài khoản có quyền Đối tác.
 * Hàm này giữ ĐÚNG cổng ấy để trang không hiện ô tìm mà máy chủ chắc chắn từ chối. Kế toán KHÔNG có `order.create` nên chưa tìm được — nếu chủ đổi cổng của route
 * thì đổi hàm này theo (một nơi).
 */
export const coTheTimDoiTac = (s: PermissionHolder): boolean => can(s, "order.create") && !holdsPartner(s);

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Bảng mức

export interface TenDanhMuc {
  /** Tên dịch vụ theo mã (danh mục đã nạp); không có → undefined. */
  dichVu(code: string): string | undefined;
  /** Tên nhóm theo mã; không có → undefined. */
  nhom(code: string): string | undefined;
}

/** «Dịch vụ HONTAM» / «Nhóm Du thuyền» / «Mọi dịch vụ». Có tên thì in tên, không thì in mã (nhóm đã tắt không còn trong danh mục cho form đơn). */
export function nhanPhamVi(d: { phamVi: "SERVICE" | "GROUP" | "ALL"; catalogCode: string | null; groupCode: string | null }, ten: TenDanhMuc): string {
  if (d.phamVi === "ALL") return "Mọi dịch vụ";
  if (d.phamVi === "GROUP") return `Nhóm ${d.groupCode === null ? "" : (ten.nhom(d.groupCode) ?? d.groupCode)}`.trim();
  return `Dịch vụ ${d.catalogCode === null ? "" : (ten.dichVu(d.catalogCode) ?? d.catalogCode)}`.trim();
}

/** Mức của một dòng, từ DTO (`kieu/tyLeBp/moiKhach`) sang khuôn của `nhanMuc` (`kind/rateBp/perPax`): «12,5%» / «50.000đ/khách». */
export const nhanMucDto = (m: { kieu: "RATE" | "PER_PAX"; tyLeBp: number | null; moiKhach: number | null }): string => nhanMuc({ kind: m.kieu, rateBp: m.tyLeBp, perPax: m.moiKhach });

/** Cột «Áp cho»: tên (vai hoặc đối tác) và một chữ nhỏ nói đó là loại đối tác hay một đối tác — hai thứ có thể trùng tên. */
export function nhanDoiTuong(d: DoiTuongMucDto): { ten: string; loai: string } {
  return d.loai === "VAI" ? { ten: d.ten, loai: "Loại đối tác" } : { ten: d.ten, loai: "Một đối tác" };
}

export type TrangThaiDong = "DANG_AP" | "SAP_AP" | "DA_DONG";
export const NHAN_TRANG_THAI: Record<TrangThaiDong, string> = { DANG_AP: "Đang áp", SAP_AP: "Sắp áp", DA_DONG: "Đã đóng" };
/** Đang áp = `conHieuLuc` của máy chủ; chưa tới ngày bắt đầu = «Sắp áp»; còn lại (đã qua ngày kết thúc) = «Đã đóng». */
export function trangThaiDong(d: { conHieuLuc: boolean; denNgay: string | null }, homNay: string): TrangThaiDong {
  if (d.conHieuLuc) return "DANG_AP";
  return d.denNgay !== null && d.denNgay < homNay ? "DA_DONG" : "SAP_AP";
}
/** Nút «Đóng» chỉ cho dòng chưa có ngày kết thúc (máy chủ chỉ đóng dòng `valid_to` trống; dòng đã có ngày kết thúc thì 409). */
export const dongDongDuoc = (d: { denNgay: string | null }): boolean => d.denNgay === null;

const chuanTim = (s: string): string => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

export interface BoLoc {
  /** true = chỉ dòng đang áp và sắp áp (bỏ dòng đã đóng); false = tất cả. */
  readonly chiConHieuLuc: boolean;
  /** Ô tìm theo tên đối tượng (loại đối tác hoặc đối tác) HOẶC theo nhãn phạm vi đang hiện («Dịch vụ Hòn Tằm», «Nhóm Du thuyền», «Mọi dịch vụ»); không phân biệt dấu, hoa thường; rỗng = không lọc. */
  readonly tim: string;
}
/**
 * Lọc danh sách mức trên máy: theo trạng thái và theo ô tìm (đặc tả sổ đại lý đợt 1 §11: «lọc theo vai / đối tác / dịch vụ»). Ô tìm khớp tên đối tượng và nhãn phạm vi — đúng chữ người dùng
 * đang thấy ở bảng (`nhanPhamVi`, có tên thì in tên, thiếu tên thì in mã), không khớp mã thô của dịch vụ đã có tên. Giữ thứ tự máy chủ trả.
 */
export function locMuc(dong: readonly CommissionRuleDto[], bo: BoLoc, homNay: string, ten: TenDanhMuc): CommissionRuleDto[] {
  const tim = chuanTim(bo.tim);
  return dong.filter(
    (d) => (!bo.chiConHieuLuc || trangThaiDong(d, homNay) !== "DA_DONG") && (tim === "" || chuanTim(d.doiTuong.ten).includes(tim) || chuanTim(nhanPhamVi(d, ten)).includes(tim)),
  );
}
/** Lọc danh sách điều khoản: theo trạng thái. */
export function locDieuKhoan(dong: readonly SupplyTermDto[], chiConHieuLuc: boolean, homNay: string): SupplyTermDto[] {
  return dong.filter((d) => !chiConHieuLuc || trangThaiDong(d, homNay) !== "DA_DONG");
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Thử tra

/** Lời của bậc thắng (máy chủ đánh số 1…6: riêng đối tác trước, loại đối tác sau; trong mỗi bên: dịch vụ, nhóm, mọi dịch vụ). */
export const LOI_BAC: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: "mức riêng của đối tác cho dịch vụ này",
  2: "mức riêng của đối tác cho nhóm",
  3: "mức riêng của đối tác cho mọi dịch vụ",
  4: "mức của loại đối tác cho dịch vụ này",
  5: "mức của loại đối tác cho nhóm",
  6: "mức của loại đối tác cho mọi dịch vụ",
};

/** Dòng kết quả của Thử tra: «Áp mức 12,5% — mức riêng của đối tác cho nhóm»; thiếu mức → câu lý do của máy chủ (đã là tiếng Việt); không người hưởng → câu riêng. */
export function cauThuTra(r: ThuTraResponse): string {
  const k = r.ketQua;
  if (k.trangThai === "NONE") return CAU_KHONG_CO_NGUOI_HUONG;
  if (k.trangThai === "MISSING") return k.lyDo;
  return `Áp mức ${nhanMucDto(k.muc)} — ${LOI_BAC[k.bac]}`;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Điều khoản người bán

/** Người bán: công ty chủ ghi «Tour Đảo (công ty)», nhà cung cấp ghi tên hồ sơ. */
export const nhanNguoiBan = (n: { ten: string; laCongTy: boolean }): string => (n.laCongTy ? NHAN_CONG_TY : n.ten);
/** Tỷ lệ Tour Đảo mua lại: chỉ có khi nhà cung cấp bán; Tour Đảo bán thì «—». */
export const nhanTyLeMua = (bp: number | null): string => (bp === null ? "—" : nhanTyLeBp(bp));
/** Đóng dòng này cần hộp xác nhận riêng: dòng «Mọi dịch vụ» của công ty chủ (dòng mặc định). */
export const canXacNhanDongDieuKhoan = (d: SupplyTermDto): boolean => d.phamVi === "ALL" && d.nguoiBan.laCongTy;
