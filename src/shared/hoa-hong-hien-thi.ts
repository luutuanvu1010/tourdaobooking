// Chữ và luật hiển thị thuần của hai màn «Hoa hồng đối tác» (/hoa-hong) và «Người bán dịch vụ» (/nguoi-ban) — web/hoa-hong.ts, web/nguoi-ban.ts (sổ đại lý đợt 1, Task 10).
// Nhãn mức đi qua MỘT nguồn `nhanMuc` / `nhanTyLeBp` (so-dai-ly-nhan.ts); không mã thô (RATE, PER_PAX, MISSING, NONE…) ra người dùng. Giao diện không tính tiền, không chọn mức:
// «mức nào thắng» do máy chủ trả (`bac`), ở đây chỉ dịch bậc ra lời.
import type { CommissionRuleDto, DoiTuongMucDto, LoaiDoiTacDto, MucTaDto, SupplyTermDto, ThuTraResponse } from "./contracts.ts";
import { can, holdsPartner, type PermissionHolder } from "./permissions.ts";
import { CAU_THIEU_MUC, nhanMuc, nhanTyLeBp } from "./so-dai-ly-nhan.ts";

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

/**
 * Mức của một dòng, từ DTO (`kieu/tyLeBp/moiKhach`) sang khuôn của `nhanMuc` (`kind/rateBp/perPax`): «12,5%» / «50.000đ/khách». Có `theoLoai` (ADR-0133) thì nêu đủ ba số,
 * ô khai 0 hiện «0đ»: «người lớn 50.000đ · trẻ em 30.000đ · người cao tuổi 0đ/khách».
 */
export const nhanMucDto = (m: { kieu: "RATE" | "PER_PAX"; tyLeBp: number | null; moiKhach: number | null; theoLoai?: { nguoiLon: number; treEm: number; nguoiCaoTuoi: number } | null }): string =>
  nhanMuc({ kind: m.kieu, rateBp: m.tyLeBp, perPax: m.moiKhach, theoLoai: m.theoLoai ? { adult: m.theoLoai.nguoiLon, child: m.theoLoai.treEm, senior: m.theoLoai.nguoiCaoTuoi } : null });

/** Cột «Áp cho»: tên (vai, đối tác hoặc mức TA) và một chữ nhỏ nói đó là loại đối tác, một đối tác hay một mức TA — các thứ có thể trùng tên. */
export function nhanDoiTuong(d: DoiTuongMucDto): { ten: string; loai: string } {
  return d.loai === "VAI" ? { ten: d.ten, loai: "Loại đối tác" } : d.loai === "MUC" ? { ten: d.ten, loai: "Mức TA" } : { ten: d.ten, loai: "Một đối tác" };
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

/** Lời của bậc thắng (máy chủ đánh số 1…9: riêng đối tác trước, riêng loại đối tác sau, mức TA của loại cuối cùng; trong mỗi bên: dịch vụ, nhóm, mọi dịch vụ). */
// ADR-0138: 10–12 = mức TA gắn riêng cho đối tác (ưu tiên sau 1–3, trước 4–6; số giữ nghĩa các bậc cũ). `bac >= 7` = mọi bậc mức TA (cả riêng lẫn theo loại).
export const LOI_BAC: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12, string> = {
  1: "mức riêng của đối tác cho dịch vụ này",
  2: "mức riêng của đối tác cho nhóm",
  3: "mức riêng của đối tác cho mọi dịch vụ",
  4: "mức của loại đối tác cho dịch vụ này",
  5: "mức của loại đối tác cho nhóm",
  6: "mức của loại đối tác cho mọi dịch vụ",
  7: "mức TA của loại đối tác cho dịch vụ này",
  8: "mức TA của loại đối tác cho nhóm",
  9: "mức TA của loại đối tác cho mọi dịch vụ",
  10: "mức TA gắn riêng cho đối tác, dịch vụ này",
  11: "mức TA gắn riêng cho đối tác, nhóm",
  12: "mức TA gắn riêng cho đối tác, mọi dịch vụ",
};

/** Dòng kết quả của Thử tra: «Áp mức 12,5% — mức riêng của đối tác cho nhóm»; thiếu mức → câu lý do của máy chủ (đã là tiếng Việt); không người hưởng → câu riêng. */
/** Kết quả «Thử tra» thiếu mức → giao diện tô đỏ. */
export const thuTraThieuMuc = (r: ThuTraResponse): boolean => r.ketQua.trangThai === "MISSING";

export function cauThuTra(r: ThuTraResponse): string {
  const k = r.ketQua;
  if (k.trangThai === "NONE") return CAU_KHONG_CO_NGUOI_HUONG;
  if (k.trangThai === "MISSING") return `${k.lyDo} — ${CAU_THIEU_MUC}.`;
  // Bậc 7–9: kèm TÊN mức TA (N-12) — tên Kế toán đặt, không bao giờ mã máy.
  const tenMuc = k.bac >= 7 && k.muc.doiTuong.loai === "MUC" ? `: «${k.muc.doiTuong.ten}»` : "";
  return `Áp mức ${nhanMucDto(k.muc)} — ${LOI_BAC[k.bac]}${tenMuc}`;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Điều khoản người bán

/** Người bán: công ty chủ ghi «Tour Đảo (công ty)», nhà cung cấp ghi tên hồ sơ. */
export const nhanNguoiBan = (n: { ten: string; laCongTy: boolean }): string => (n.laCongTy ? NHAN_CONG_TY : n.ten);
/** Tỷ lệ Tour Đảo mua lại: chỉ có khi nhà cung cấp bán; Tour Đảo bán thì «—». */
export const nhanTyLeMua = (bp: number | null): string => (bp === null ? "—" : nhanTyLeBp(bp));
/** Đóng dòng này cần hộp xác nhận riêng: dòng «Mọi dịch vụ» của công ty chủ (dòng mặc định). */
export const canXacNhanDongDieuKhoan = (d: SupplyTermDto): boolean => d.phamVi === "ALL" && d.nguoiBan.laCongTy;

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Loại đối tác (ADR-0117 lần 1): mục «Loại đối tác» ở /hoa-hong

export const CAU_KHONG_CO_LOAI = "Chưa có loại đối tác nào.";
export const NHAN_LOAI_CO_SAN = "Có sẵn";
export const NHAN_LOAI_DO_KE_TOAN = "Do Kế toán thêm";
export const NHAN_LOAI_DANG_DUNG = "Đang dùng";
export const NHAN_LOAI_DA_TAT = "Đã tắt";
/**
 * Chữ và nút của một dòng loại đối tác. Nút «Tắt» / «Bật» CHỈ có ở loại do Kế toán thêm (`coSan` = false, cờ do máy chủ trả — năm vai bên ngoài có sẵn là vai đăng nhập, máy chủ
 * từ chối đổi chúng); giao diện không tự suy loại nào "do Kế toán thêm". Quyền ghi (`partner.commission.write`) do trang kiểm riêng bằng `can`.
 */
export function nhanLoaiDoiTac(l: Pick<LoaiDoiTacDto, "ten" | "coSan" | "dangBat">): { nguon: string; trangThai: string; nut: { hanhDong: "tat" | "bat"; nhan: string; ariaLabel: string } | null } {
  return {
    nguon: l.coSan ? NHAN_LOAI_CO_SAN : NHAN_LOAI_DO_KE_TOAN,
    trangThai: l.dangBat ? NHAN_LOAI_DANG_DUNG : NHAN_LOAI_DA_TAT,
    nut: l.coSan ? null : l.dangBat ? { hanhDong: "tat", nhan: "Tắt", ariaLabel: `Tắt loại: ${l.ten}` } : { hanhDong: "bat", nhan: "Bật", ariaLabel: `Bật loại: ${l.ten}` },
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Mức TA dùng chung (ADR-0117 lần 2): mục «Mức TA» ở /hoa-hong

export const CAU_KHONG_CO_MUC_TA = "Chưa có mức TA nào.";
/** Luật «không đổi mức trong cùng ngày» nói thẳng trên màn (máy chủ chặn hai gắn chồng ngày của một loại, và ngày kết thúc không được trước ngày bắt đầu). */
export const CAU_DOI_MUC_TRONG_NGAY =
  "Mỗi loại chỉ gắn một mức TA trong một ngày. Muốn đổi sang mức khác từ hôm nay: kết thúc gắn cũ tới hôm qua, rồi gắn mức mới từ hôm nay. Gắn bắt đầu từ hôm nay thì không đổi được trong cùng ngày.";
/**
 * Cảnh báo vàng (KHÔNG chặn) sau khi gắn loại vào mức mà máy chủ trả `dongRieng` khác rỗng (N-17): các dòng riêng theo loại đó — hoặc theo loại khác mà cùng hồ sơ đang mang — thắng mức TA.
 * Danh sách dòng do MÁY CHỦ tính (giao diện không tự suy «loại khác cùng hồ sơ mang»), nên cảnh báo chỉ có ngay sau lần gắn; tải lại trang thì mất.
 */
export const cauCanhBaoDongRieng = (tenLoai: string, tenMuc: string, soDong: number): string =>
  `Đã gắn, nhưng loại «${tenLoai}» (hoặc loại khác mà cùng đối tác đang mang) còn ${soDong} dòng mức riêng đang áp. Dòng riêng được ưu tiên hơn mức TA «${tenMuc}». Đóng các dòng này nếu muốn dùng mức TA.`;
/** Trạng thái và nút Tắt / Bật của một mức — theo cờ `dangBat` của máy chủ. Quyền ghi do trang kiểm riêng bằng `can`. */
export function nhanMucTa(m: Pick<MucTaDto, "ten" | "dangBat">): { trangThai: string; nut: { hanhDong: "tat" | "bat"; nhan: string; ariaLabel: string } } {
  return m.dangBat
    ? { trangThai: NHAN_LOAI_DANG_DUNG, nut: { hanhDong: "tat", nhan: "Tắt", ariaLabel: `Tắt mức TA: ${m.ten}` } }
    : { trangThai: NHAN_LOAI_DA_TAT, nut: { hanhDong: "bat", nhan: "Bật", ariaLabel: `Bật mức TA: ${m.ten}` } };
}
/** Bảng «Các mức hiện có» bỏ dòng của mức TA: các dòng đó hiện (và đóng) ở mục «Mức TA», dưới tên mức của chúng. Giữ thứ tự máy chủ trả. */
export const boDongMucTa = (dong: readonly CommissionRuleDto[]): CommissionRuleDto[] => dong.filter((d) => d.doiTuong.loai !== "MUC");
