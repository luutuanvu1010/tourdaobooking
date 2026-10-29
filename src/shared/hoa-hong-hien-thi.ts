// Chữ và luật hiển thị thuần của hai màn «Hoa hồng đối tác» (/hoa-hong) và «Người bán dịch vụ» (/nguoi-ban) — web/hoa-hong.ts, web/nguoi-ban.ts (sổ đại lý đợt 1, Task 10).
// Nhãn mức đi qua MỘT nguồn `nhanMuc` / `nhanTyLeBp` (so-dai-ly-nhan.ts); không mã thô (RATE, PER_PAX, MISSING, NONE…) ra người dùng. Giao diện không tính tiền, không chọn mức:
// «mức nào thắng» do máy chủ trả (`bac`), ở đây chỉ dịch bậc ra lời.
import type { CommissionRuleDto, DoiTuongMucDto, GanLoaiMucDto, LoaiDoiTacDto, MucTaDto, MucTaListResponse, SuaXemTruocResponse, SupplyTermDto, ThuTraResponse } from "./contracts.ts";
import { ngayVN } from "./giay-to-hien-thi.ts";
import { can, holdsPartner, type PermissionHolder } from "./permissions.ts";
import { CAU_THIEU_MUC, nhanMuc, nhanTyLeBp } from "./so-dai-ly-nhan.ts";
import { addDays } from "./vn-date.ts";

export const CAU_KHONG_CO_QUYEN_XEM = "Bạn không có quyền xem trang này.";
/** Thay ô tìm đối tác ở người không qua cổng của route tìm người hưởng (xem `coTheTimDoiTac`). */
export const CAU_CHUA_TIM_DUOC_DOI_TAC = "Tài khoản của bạn chưa tìm được đối tác theo tên. Cần đặt mức riêng cho một đối tác thì nhờ Quản trị hoặc Toàn quyền.";
/** Hộp xác nhận khi đóng dòng «Mọi dịch vụ» của công ty chủ (đặc tả sổ đại lý đợt 1: dòng mặc định gieo sẵn; đóng mà không mở dòng mới thì dịch vụ thiếu người bán). */
export const CAU_DONG_DONG_MAC_DINH = "Ngừng điều khoản mặc định thì dịch vụ chưa có điều khoản riêng sẽ thiếu người bán cho tới khi mở điều khoản mới. Vẫn ngừng?";
export const CAU_KHONG_CO_MUC = "Chưa có mức nào.";
export const CAU_KHONG_CO_DIEU_KHOAN = "Chưa có điều khoản nào.";
export const CAU_KHONG_KHOP_LOC = "Không có dòng nào khớp bộ lọc.";
export const CAU_KHONG_CO_NGUOI_HUONG = "Không có người hưởng hoa hồng";
export const NHAN_CONG_TY = "Tour Đảo (công ty)";

/**
 * Tìm đối tác theo tên (ô «Một đối tác», khối Thử tra, và ô «Đặt qua đối tác» của form lập đơn) gọi `GET /api/pricing/nguoi-huong`; route đó gọi CHÍNH hàm này làm cổng
 * (ADR-0141): người lập đơn (`order.create`) hoặc người đặt mức (`partner.commission.write`, tức Kế toán), và chặn tài khoản có quyền Đối tác. Máy chủ và trang dùng một hàm
 * nên không lệch. Ô «Đặt qua đối tác» trên form lập đơn / trang đơn KHÔNG dùng hàm này mà dùng `coODatQuaDoiTac` (vẫn chỉ `order.create`).
 */
export const coTheTimDoiTac = (s: PermissionHolder): boolean => (can(s, "order.create") || can(s, "partner.commission.write")) && !holdsPartner(s);

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
  return d.loai === "VAI" ? { ten: d.ten, loai: "Loại đối tác" } : d.loai === "MUC" ? { ten: d.ten, loai: "Chính sách" } : { ten: d.ten, loai: "Một đối tác" };
}

export type TrangThaiDong = "DANG_AP" | "SAP_AP" | "DA_DONG" | "DA_HUY";
export const NHAN_TRANG_THAI: Record<TrangThaiDong, string> = { DANG_AP: "Đang áp dụng", SAP_AP: "Sắp áp dụng", DA_DONG: "Đã ngừng", DA_HUY: "Đã huỷ — thay bằng dòng khác" };
/**
 * Đang áp dụng = `conHieuLuc` của máy chủ; chưa tới ngày bắt đầu = «Sắp áp dụng»; còn lại (đã qua ngày kết thúc) = «Đã ngừng». ADR-0148: dòng đã huỷ (nhập sai, đã có dòng
 * thay) = «Đã huỷ» — trước mọi ca khác (dòng huỷ mang ngày kết thúc tương lai hoặc trống, nếu không sẽ rơi vào «Sắp áp dụng»).
 */
export function trangThaiDong(d: { conHieuLuc: boolean; denNgay: string | null; daHuy?: boolean }, homNay: string): TrangThaiDong {
  if (d.daHuy) return "DA_HUY";
  if (d.conHieuLuc) return "DANG_AP";
  return d.denNgay !== null && d.denNgay < homNay ? "DA_DONG" : "SAP_AP";
}
/** Bộ lọc «Đang và sắp áp dụng» giữ dòng này? Bỏ dòng đã ngừng VÀ dòng đã huỷ (hai thứ chỉ hiện ở «Tất cả»). Mọi bộ lọc trạng thái của trang đi qua hàm này. */
export const conApHoacSap = (d: { conHieuLuc: boolean; denNgay: string | null; daHuy?: boolean }, homNay: string): boolean => {
  const tt = trangThaiDong(d, homNay);
  return tt !== "DA_DONG" && tt !== "DA_HUY";
};
/** Dòng chưa có ngày kết thúc (điều khoản người bán: máy chủ chỉ đóng dòng `valid_to` trống). Dòng mức hoa hồng từ ADR-0148 rút ngắn được ngày kết thúc chưa qua (`kiemNgung`). */
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
    (d) => (!bo.chiConHieuLuc || conApHoacSap(d, homNay)) && (tim === "" || chuanTim(d.doiTuong.ten).includes(tim) || chuanTim(nhanPhamVi(d, ten)).includes(tim)),
  );
}
/** Lọc danh sách điều khoản: theo trạng thái. */
export function locDieuKhoan(dong: readonly SupplyTermDto[], chiConHieuLuc: boolean, homNay: string): SupplyTermDto[] {
  return dong.filter((d) => !chiConHieuLuc || conApHoacSap(d, homNay));
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
  7: "chính sách của loại đối tác cho dịch vụ này",
  8: "chính sách của loại đối tác cho nhóm",
  9: "chính sách của loại đối tác cho mọi dịch vụ",
  10: "chính sách riêng của đối tác, dịch vụ này",
  11: "chính sách riêng của đối tác, nhóm",
  12: "chính sách riêng của đối tác, mọi dịch vụ",
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
/** Nhãn năm loại có từ đầu (chủ chọn «Có sẵn» 28/10); tên hằng giữ như cũ (mã nội bộ không đổi theo bảng từ). */
export const NHAN_LOAI_GOC = "Có sẵn";
/** Câu dưới danh sách loại khi có loại có sẵn: nói lý do chúng không có nút Tắt / Bật. */
export const CAU_LOAI_CO_SAN = "Loại có sẵn đi kèm tài khoản đăng nhập của đối tác nên không tắt được.";
export const NHAN_LOAI_DANG_DUNG = "Đang dùng";
export const NHAN_LOAI_DA_TAT = "Đã tắt";
/**
 * Chữ và nút của một dòng loại đối tác. Nút «Tắt» / «Bật» CHỈ có ở loại do Kế toán thêm (`coSan` = false, cờ do máy chủ trả — năm vai bên ngoài có sẵn là vai đăng nhập, máy chủ
 * từ chối đổi chúng); giao diện không tự suy loại nào "do Kế toán thêm". Quyền ghi (`partner.commission.write`) do trang kiểm riêng bằng `can`.
 */
export function nhanLoaiDoiTac(l: Pick<LoaiDoiTacDto, "ten" | "coSan" | "dangBat">): { nguon: typeof NHAN_LOAI_GOC | ""; trangThai: "Đã tắt" | ""; nut: { hanhDong: "tat" | "bat"; nhan: string; ariaLabel: string } | null } {
  return {
    nguon: l.coSan ? NHAN_LOAI_GOC : "",
    trangThai: l.dangBat ? "" : NHAN_LOAI_DA_TAT,
    nut: l.coSan ? null : l.dangBat ? { hanhDong: "tat", nhan: "Tắt", ariaLabel: `Tắt loại: ${l.ten}` } : { hanhDong: "bat", nhan: "Bật", ariaLabel: `Bật loại: ${l.ten}` },
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Mức TA dùng chung (ADR-0117 lần 2): mục «Mức TA» ở /hoa-hong

export const CAU_KHONG_CO_MUC_TA = "Chưa có chính sách nào.";
/** Luật «không đổi mức trong cùng ngày» nói thẳng trên màn (máy chủ chặn hai gắn chồng ngày của một loại, và ngày kết thúc không được trước ngày bắt đầu). */
export const CAU_DOI_MUC_TRONG_NGAY =
  "Mỗi loại chỉ theo một chính sách trong một ngày. Muốn đổi sang chính sách khác từ hôm nay: ngừng áp dụng chính sách cũ đến hết hôm qua, rồi áp dụng chính sách mới từ hôm nay. Áp dụng từ hôm nay thì không đổi được trong cùng ngày.";
/**
 * Cảnh báo vàng (KHÔNG chặn) sau khi áp dụng chính sách cho loại mà máy chủ trả `dongRieng` khác rỗng (N-17): các mức riêng theo loại đó — hoặc theo loại khác mà cùng hồ sơ đang mang — thắng chính sách.
 * Danh sách do MÁY CHỦ tính, nên cảnh báo chỉ có ngay sau lần áp dụng; tải lại trang thì mất.
 */
export const cauCanhBaoDongRieng = (tenLoai: string, tenMuc: string, soDong: number): string =>
  `Đã áp dụng chính sách, nhưng loại «${tenLoai}» (hoặc loại khác mà cùng đối tác đang mang) còn ${soDong} mức riêng đang áp dụng. Mức riêng được ưu tiên hơn chính sách «${tenMuc}». Ngừng các mức riêng này nếu muốn dùng chính sách.`;
/** Trạng thái và nút Tắt / Bật của một mức — theo cờ `dangBat` của máy chủ. Quyền ghi do trang kiểm riêng bằng `can`. */
export function nhanMucTa(m: Pick<MucTaDto, "ten" | "dangBat">): { trangThai: string; nut: { hanhDong: "tat" | "bat"; nhan: string; ariaLabel: string } } {
  return m.dangBat
    ? { trangThai: NHAN_LOAI_DANG_DUNG, nut: { hanhDong: "tat", nhan: "Tắt", ariaLabel: `Tắt chính sách: ${m.ten}` } }
    : { trangThai: NHAN_LOAI_DA_TAT, nut: { hanhDong: "bat", nhan: "Bật", ariaLabel: `Bật chính sách: ${m.ten}` } };
}
/** Bảng «Các mức hiện có» bỏ dòng của mức TA: các dòng đó hiện (và đóng) ở mục «Mức TA», dưới tên mức của chúng. Giữ thứ tự máy chủ trả. */
export const boDongMucTa = (dong: readonly CommissionRuleDto[]): CommissionRuleDto[] => dong.filter((d) => d.doiTuong.loai !== "MUC");

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Trang «Hoa hồng đối tác» thiết kế lại (PR 2): nút Đổi/Ngừng, dòng tóm tắt, câu nhắc, xếp loại, ghép đối tác có mức riêng

/**
 * Nút «Đổi» / «Ngừng» chỉ cho dòng đang áp dụng (kể cả dòng bắt đầu hôm nay — chủ dự án 28/10) và chưa có ngày ngừng; ngược lại trả ghi chú (có thể rỗng).
 * Dòng bắt đầu hôm nay: Đổi sớm nhất từ ngày mai (`ngayDoiSomNhat`, khớp `kiemDoi` của máy chủ), Ngừng sớm nhất đến hết hôm nay (`kiemNgayDong`).
 */
export function nutDoiNgung(d: { tuNgay: string; denNgay: string | null; conHieuLuc: boolean; daHuy?: boolean }, homNay: string): { hien: true } | { hien: false; ghiChu: string } {
  if (d.daHuy) return { hien: false, ghiChu: "" }; // ADR-0148: dòng đã huỷ chỉ còn ở lịch sử, không nút, không ghi chú «chưa tới ngày»
  if (d.conHieuLuc && d.tuNgay <= homNay && d.denNgay === null) return { hien: true };
  if (!d.conHieuLuc && d.tuNgay > homNay) return { hien: false, ghiChu: "chưa tới ngày" };
  if (d.conHieuLuc && d.denNgay !== null && d.denNgay >= homNay) return { hien: false, ghiChu: `ngừng sau ${ngayVN(d.denNgay)}` };
  return { hien: false, ghiChu: "" };
}

/**
 * ADR-0148 Đ1: nút «Sửa» cho dòng chưa huỷ có ngày kết thúc trống hoặc CHƯA QUA — kể cả dòng chưa tới ngày (ví dụ 2027 → 2028 của chủ) và dòng đã hẹn ngày ngừng. Dòng đã hết
 * hạn thì không (máy chủ: «Mức này đã hết hạn nên không sửa được»). Đường huỷ–thay hay «từ ngày» do máy chủ trả ở bước xem trước, giao diện không đoán.
 */
export const nutSua = (d: { denNgay: string | null; daHuy?: boolean }, homNay: string): boolean => !d.daHuy && (d.denNgay === null || d.denNgay >= homNay);
/** Ai thấy nút «Sửa» (tiêu chí 4): người ghi bảng mức (`partner.commission.write`) KHÔNG mang quyền Đối tác — cùng cổng với route Sửa của máy chủ. */
export const coQuyenSua = (s: PermissionHolder): boolean => can(s, "partner.commission.write") && !holdsPartner(s);
/** Câu đầu hộp Sửa, theo đường máy chủ trả ở `GET …/sua`. `cai` = «mức này» (dòng mức) hoặc «chính sách này» (lần áp dụng chính sách). */
export const cauXemTruocSua = (x: SuaXemTruocResponse, cai = "mức này"): string =>
  x.duong === "HUY_THAY" ? `Chưa có đơn nào dùng ${cai} — sửa sẽ thay hẳn.` : `Đã có đơn dùng ${cai} — phần sửa áp từ ngày ${ngayVN(x.tuNgaySomNhat)}; đơn cũ giữ mức cũ.`;

/** Ô «Từ» của hộp «Đổi»: không trước hôm nay và phải sau ngày bắt đầu của mức cũ (máy chủ: `kiemDoi`). Mức cũ bắt đầu hôm nay ⇒ ngày mai. */
export const ngayDoiSomNhat = (tuNgayCu: string, homNay: string): string => (tuNgayCu >= homNay ? addDays(tuNgayCu, 1) : homNay);
/** Câu dưới hộp «Đổi» khi mức cũ bắt đầu hôm nay (rỗng nếu không): vì sao ô «Từ» không chọn được hôm nay, và đơn xác nhận hôm nay vẫn chốt theo mức cũ. */
export const cauDoiTuNgayMai = (tuNgayCu: string, homNay: string): string =>
  tuNgayCu >= homNay ? "Mức cũ bắt đầu hôm nay nên mức mới áp dụng sớm nhất từ ngày mai; đơn xác nhận trong hôm nay vẫn tính theo mức cũ." : "";

/** Tóm tắt các dòng đang áp dụng: số đứng trước (tên dịch vụ dài bị cắt ở giao diện, không mất số), nối bằng « · ». */
export function tomTatMuc(dong: readonly CommissionRuleDto[], ten: TenDanhMuc): string {
  return dong.filter((d) => d.conHieuLuc).map((d) => `${nhanMucDto(d)} ${nhanPhamVi(d, ten)}`).join(" · ");
}

export const CAU_CHUA_CO_MUC_LOAI = "Đơn của loại này sẽ bị giữ ở bước Đã giao cho tới khi có mức";
export const NHAN_CHUA_CO_MUC = "Chưa có mức";
export const CAU_NHAC_UU_TIEN = "Mức riêng được ưu tiên hơn chính sách. Mức nào áp cho một đối tác cụ thể: dùng Tra nhanh.";
export const CAU_TRA_THEO_LOAI = "Đang tra theo loại. Một đối tác cụ thể của loại này có thể có mức riêng hoặc chính sách riêng — gõ tên đối tác để chắc.";
export const cauMucCuSeNgung = (mucCu: string, tuNgay: string): string => `Mức cũ ${mucCu} sẽ ngừng, đến hết ${ngayVN(addDays(tuNgay, -1))}.`;
export const cauSeTao = (v: { ai: string; dichVu: string; muc: string; tu: string; den: string | null }): string =>
  `Sẽ tạo: ${v.ai} · ${v.dichVu} · ${v.muc} · từ ${ngayVN(v.tu)}${v.den ? ` đến ${ngayVN(v.den)}` : ", không thời hạn"}.`;
export const cauCanhBaoTheoChinhSach = (tenChinhSach: string): string => `Loại này đang theo chính sách ${tenChinhSach}. Mức riêng được ưu tiên hơn chính sách.`;

/** Loại chưa có mức lên đầu, rồi theo tên (tiếng Việt). */
export function xepLoai<T extends { ten: string; coMuc: boolean }>(ds: readonly T[]): T[] {
  return [...ds].sort((a, b) => Number(a.coMuc) - Number(b.coMuc) || a.ten.localeCompare(b.ten, "vi"));
}

/** Mỗi đối tác một dòng: có mức riêng đang HOẶC sắp áp dụng (dòng `DOI_TAC`, bỏ dòng đã ngừng — khớp bộ lọc «Đang và sắp áp dụng») và/hoặc chính sách gắn riêng; xếp theo tên. */
export function ghepDoiTacRieng(dong: readonly CommissionRuleDto[], ganRieng: MucTaListResponse["ganRieng"], homNay: string): { partyId: string; ten: string; mucRieng: boolean; chinhSach: string | null }[] {
  const m = new Map<string, { partyId: string; ten: string; mucRieng: boolean; chinhSach: string | null }>();
  for (const d of dong) {
    if (d.doiTuong.loai !== "DOI_TAC" || !conApHoacSap(d, homNay)) continue;
    m.set(d.doiTuong.partyId, { partyId: d.doiTuong.partyId, ten: d.doiTuong.ten, mucRieng: true, chinhSach: null });
  }
  for (const g of ganRieng) {
    const cu = m.get(g.partyId);
    if (cu) cu.chinhSach = g.tenMuc;
    else m.set(g.partyId, { partyId: g.partyId, ten: g.ten, mucRieng: false, chinhSach: g.tenMuc });
  }
  return [...m.values()].sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
}

/** Các dòng mức riêng (`DOI_TAC`) của MỘT đối tác, đã qua bộ lọc: ô tìm khớp tên đối tác → giữ mọi dòng (đã lọc trạng thái); không thì chỉ dòng có dịch vụ khớp. Giữ thứ tự máy chủ trả. */
export function dongRiengDoiTac(dong: readonly CommissionRuleDto[], partyId: string, bo: BoLoc, homNay: string, ten: TenDanhMuc): CommissionRuleDto[] {
  const cua = dong.filter((d) => d.doiTuong.loai === "DOI_TAC" && d.doiTuong.partyId === partyId);
  const tim = chuanTim(bo.tim);
  const tenDt = cua[0]?.doiTuong.ten ?? "";
  if (tim === "" || chuanTim(tenDt).includes(tim)) return cua.filter((d) => !bo.chiConHieuLuc || conApHoacSap(d, homNay));
  return locMuc(cua, bo, homNay, ten);
}

/** «Từ 01/01/2026 · đến 31/12/2026» hoặc «Từ 01/01/2026 · không thời hạn». */
export const nhanHieuLuc = (d: { tuNgay: string; denNgay: string | null }): string => `Từ ${ngayVN(d.tuNgay)} · ${d.denNgay === null ? "không thời hạn" : `đến ${ngayVN(d.denNgay)}`}`;

/** Câu dưới ba ô «Tách theo loại khách» của hộp Thêm mức / Đổi (bàn giao mục 4, ADR-0133). */
export const CAU_THEO_LOAI_KHACH =
  "Nhóm khách nào không trả hoa hồng thì ghi 0; ba ô đều phải điền. Em bé không tính hoa hồng. Dịch vụ tính theo lượt (phao chuối, dù bay): dùng số của người lớn cho mỗi lượt.";

/** Chính sách đang áp dụng cho một loại (gắn còn hiệu lực hôm nay); không có → null. Máy chủ chặn hai gắn chồng ngày nên tối đa một. */
export function chinhSachCuaLoai(mt: MucTaListResponse, loaiCode: string): { gan: GanLoaiMucDto; muc: MucTaDto } | null {
  for (const m of mt.muc) {
    const g = m.gan.find((x) => x.conHieuLuc && x.loai.code === loaiCode);
    if (g) return { gan: g, muc: m };
  }
  return null;
}

/**
 * Bảng «Theo loại đối tác»: mỗi loại kèm các dòng mức RIÊNG của nó đã qua bộ lọc. Ô tìm khớp tên loại → giữ mọi dòng (đã lọc trạng thái) của loại; khớp dòng (dịch vụ) → chỉ dòng khớp.
 * Ô tìm rỗng → mọi loại hiện, kể cả loại chưa có dòng nào. Có chữ tìm mà không khớp gì → loại ẩn.
 */
export function locBangLoai<L extends { code: string; ten: string }>(loai: readonly L[], dong: readonly CommissionRuleDto[], bo: BoLoc, homNay: string, ten: TenDanhMuc): { loai: L; dong: CommissionRuleDto[] }[] {
  const tim = chuanTim(bo.tim);
  const ra: { loai: L; dong: CommissionRuleDto[] }[] = [];
  for (const l of loai) {
    const cua = dong.filter((d) => d.doiTuong.loai === "VAI" && d.doiTuong.code === l.code);
    const theoTrangThai = cua.filter((d) => !bo.chiConHieuLuc || conApHoacSap(d, homNay));
    if (tim === "") ra.push({ loai: l, dong: theoTrangThai });
    else if (chuanTim(l.ten).includes(tim)) ra.push({ loai: l, dong: theoTrangThai });
    else {
      const khop = locMuc(cua, bo, homNay, ten);
      if (khop.length > 0) ra.push({ loai: l, dong: khop });
    }
  }
  return ra;
}
