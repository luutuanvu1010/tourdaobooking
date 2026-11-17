// Luật thuần của TỔ CHỨC trên phiếu đăng ký (ADR-0212 Đ4, Đ7; đợt 2 Task 5): chuẩn hoá mã số thuế, số GPKD, kiểm hình thức phần tổ chức của bản khai. Không I/O, không import module;
// máy chủ (`dang-ky`) và giao diện cùng import. Mã số thuế, số GPKD, số giấy phép là dữ liệu N3 (Đ7): câu báo lỗi ở đây KHÔNG BAO GIỜ nhắc lại giá trị đã khai.
import { chuanHoaSo, kiemNgayCap, kiemNgayHetHan, type KetQua } from "./giay-to.ts";
import { normalizePhone } from "./phone.ts";

const loi = (message: string): { ok: false; message: string } => ({ ok: false, message });
const rong = (v: unknown): boolean => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
const gon = (s: string): string => s.normalize("NFC").trim().replace(/\s+/g, " ");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Mã loại giấy tờ tổ chức CỐ ĐỊNH (CHECK / trigger của migration 0103 dựa vào nó). */
export const MA_GPKD = "GPKD";

/**
 * Mã số thuế: 10 chữ số, hoặc 10 chữ số + 3 số chi nhánh (viết liền 13 số hay có dấu `-`); bỏ mọi khoảng trắng. Khoá = 10 số, có hậu tố thì thêm `-` và 3 số —
 * hai cách viết của cùng một mã (`0123456789-001`, `0123456789 001`, `0123456789001`) ra cùng khoá. Sai khuôn ⇒ null. `hien` = cách viết chuẩn (lưu ở phiếu).
 */
export function chuanHoaMaSoThue(raw: string): { hien: string; khoa: string } | null {
  const m = /^(\d{10})(?:-?(\d{3}))?$/.exec(raw.normalize("NFC").replace(/\s+/g, ""));
  if (!m) return null;
  const khoa = m[2] ? `${m[1]}-${m[2]}` : m[1]!;
  return { hien: khoa, khoa };
}

/** Số GPKD (và số giấy phép thêm): luật `number_key` của giấy tờ cá nhân (`chuanHoaSo`) — chữ HOA, bỏ khoảng trắng . - /; khoá chỉ gồm chữ số và chữ cái không dấu, 1–40 ký tự. */
export function chuanHoaSoGpkd(raw: string): { hien: string; khoa: string } | null {
  const hien = gon(raw);
  if (hien.length === 0 || hien.length > 40) return null;
  const khoa = chuanHoaSo(hien);
  return /^[0-9A-Z]{1,40}$/.test(khoa) ? { hien, khoa } : null;
}

/** Danh mục loại giấy tờ của tổ chức đọc từ CSDL cho một lần kiểm (`pty_organization_document_type`). */
export interface DanhMucGiayToToChuc {
  loai: ReadonlyMap<string, { hasExpiry: boolean; active: boolean }>;
}

/** Phần tổ chức đã kiểm, đúng cột của `dk_submission_org` (trừ cột hệ thống). */
export interface PhanToChucMoi {
  displayName: string; legalName: string | null; taxCode: string | null; taxKey: string | null; address: string | null; invoiceEmail: string | null;
  phoneValue: string | null; phoneKey: string | null;
  gpkdNumber: string; gpkdKey: string; gpkdIssuedDate: string | null; gpkdIssuedPlace: string | null;
  extraTypeCode: string | null; extraNumber: string | null; extraKey: string | null; extraIssuedDate: string | null; extraIssuedPlace: string | null; extraExpiryDate: string | null;
}

function chuTuyChon(v: unknown, nhan: string, max: number): KetQua<string | null> {
  if (rong(v)) return { ok: true, value: null };
  if (typeof v !== "string") return loi(`${nhan} không hợp lệ.`);
  const s = gon(v);
  return s.length > max ? loi(`${nhan} tối đa ${max} ký tự.`) : { ok: true, value: s };
}

const TRUONG_GIAY_PHEP = ["soGiayPhep", "ngayCapGiayPhep", "noiCapGiayPhep", "hetHanGiayPhep"] as const;

/**
 * Kiểm HÌNH THỨC phần tổ chức của bản khai (`toChuc` trong thân «gửi phiếu»). Bắt buộc: tên tổ chức, số GPKD, xác nhận «được tổ chức cho phép đăng ký thay». Mục bắt buộc để
 * được xác minh (tên pháp lý, mã số thuế…) là dữ liệu của `parties`, không kiểm ở đây. Giấy phép thêm: chọn loại thì mới khai số / ngày / nơi cấp; loại phải đang bật và khác GPKD.
 */
export function kiemPhanToChuc(raw: Record<string, unknown>, dm: DanhMucGiayToToChuc, homNay: string): KetQua<PhanToChucMoi> {
  if (typeof raw.tenToChuc !== "string" || rong(raw.tenToChuc)) return loi("Tên tổ chức là bắt buộc.");
  const displayName = gon(raw.tenToChuc);
  if (displayName.length > 200) return loi("Tên tổ chức tối đa 200 ký tự.");
  const legal = chuTuyChon(raw.tenPhapLy, "Tên pháp lý", 300);
  if (!legal.ok) return legal;
  let taxCode: string | null = null;
  let taxKey: string | null = null;
  if (!rong(raw.maSoThue)) {
    const t = typeof raw.maSoThue === "string" ? chuanHoaMaSoThue(raw.maSoThue) : null;
    if (!t) return loi("Mã số thuế gồm 10 chữ số, hoặc 10 chữ số kèm 3 số chi nhánh (ví dụ dạng 10 số-3 số).");
    taxCode = t.hien;
    taxKey = t.khoa;
  }
  const address = chuTuyChon(raw.diaChi, "Địa chỉ tổ chức", 300);
  if (!address.ok) return address;
  let invoiceEmail: string | null = null;
  if (!rong(raw.emailHoaDon)) {
    const e = typeof raw.emailHoaDon === "string" ? raw.emailHoaDon.trim().toLowerCase() : "";
    if (e.length > 200 || !EMAIL_RE.test(e)) return loi("Email nhận hoá đơn không hợp lệ.");
    invoiceEmail = e;
  }
  let phoneValue: string | null = null;
  let phoneKey: string | null = null;
  if (!rong(raw.dienThoai)) {
    const p = typeof raw.dienThoai === "string" ? normalizePhone(raw.dienThoai.trim()) : null;
    if (!p) return loi("Số điện thoại của tổ chức không hợp lệ (cần 10 số, bắt đầu bằng 0 hoặc +84).");
    phoneValue = (raw.dienThoai as string).trim();
    phoneKey = p;
  }
  if (rong(raw.soGpkd)) return loi("Số giấy chứng nhận đăng ký kinh doanh là bắt buộc.");
  const gpkd = typeof raw.soGpkd === "string" ? chuanHoaSoGpkd(raw.soGpkd) : null;
  if (!gpkd) return loi("Số giấy chứng nhận đăng ký kinh doanh chỉ gồm chữ số và chữ cái không dấu (có thể có khoảng trắng, dấu chấm, gạch), tối đa 40 ký tự.");
  const ngayCapGpkd = kiemNgayCap(raw.ngayCapGpkd, homNay);
  if (!ngayCapGpkd.ok) return ngayCapGpkd;
  const noiCapGpkd = chuTuyChon(raw.noiCapGpkd, "Nơi cấp", 200);
  if (!noiCapGpkd.ok) return noiCapGpkd;

  let extra: Pick<PhanToChucMoi, "extraTypeCode" | "extraNumber" | "extraKey" | "extraIssuedDate" | "extraIssuedPlace" | "extraExpiryDate"> = {
    extraTypeCode: null, extraNumber: null, extraKey: null, extraIssuedDate: null, extraIssuedPlace: null, extraExpiryDate: null,
  };
  if (rong(raw.loaiGiayPhep)) {
    if (TRUONG_GIAY_PHEP.some((k) => !rong(raw[k]))) return loi("Chọn loại giấy phép thêm trước khi khai số, ngày, nơi cấp.");
  } else {
    const ma = raw.loaiGiayPhep;
    const loai = typeof ma === "string" && ma !== MA_GPKD ? dm.loai.get(ma) : undefined;
    if (!loai || !loai.active) return loi("Loại giấy phép thêm không có trong danh mục hoặc đã ngưng dùng.");
    let so: { hien: string; khoa: string } | null = null;
    if (!rong(raw.soGiayPhep)) {
      so = typeof raw.soGiayPhep === "string" ? chuanHoaSoGpkd(raw.soGiayPhep) : null;
      if (!so) return loi("Số giấy phép chỉ gồm chữ số và chữ cái không dấu (có thể có khoảng trắng, dấu chấm, gạch), tối đa 40 ký tự.");
    }
    const ngayCap = kiemNgayCap(raw.ngayCapGiayPhep, homNay);
    if (!ngayCap.ok) return ngayCap;
    const hetHan = kiemNgayHetHan(raw.hetHanGiayPhep, ngayCap.value, loai.hasExpiry);
    if (!hetHan.ok) return hetHan;
    const noiCap = chuTuyChon(raw.noiCapGiayPhep, "Nơi cấp giấy phép", 200);
    if (!noiCap.ok) return noiCap;
    extra = { extraTypeCode: ma as string, extraNumber: so?.hien ?? null, extraKey: so?.khoa ?? null, extraIssuedDate: ngayCap.value, extraIssuedPlace: noiCap.value, extraExpiryDate: hetHan.value };
  }
  if (raw.duocUyQuyen !== true) return loi("Hãy xác nhận bạn được tổ chức cho phép đăng ký thay.");
  return {
    ok: true,
    value: {
      displayName, legalName: legal.value, taxCode, taxKey, address: address.value, invoiceEmail, phoneValue, phoneKey,
      gpkdNumber: gpkd.hien, gpkdKey: gpkd.khoa, gpkdIssuedDate: ngayCapGpkd.value, gpkdIssuedPlace: noiCapGpkd.value, ...extra,
    },
  };
}

// ---- ADR-0213 Đ2, Đ6 (mốc B1, Task 10): liên kết người → tổ chức; lý do của lệnh văn phòng ---------------------------------------------------------------
/**
 * «Người quản lý của» (MANAGER_OF) và «Thành viên của» (MEMBER_OF) — chỉ đường riêng của màn tổ chức ghi được (Đ2.7). Một nguồn cho máy chủ (route quan hệ chung của
 * Danh bạ từ chối, `parties/rules.ts` tái xuất) và giao diện (Danh bạ ẩn nút «Kết thúc» của hai loại này).
 */
export const LIEN_KET_TO_CHUC: readonly string[] = ["MANAGER_OF", "MEMBER_OF"];
export const laLienKetToChuc = (code: string): boolean => LIEN_KET_TO_CHUC.includes(code);

/** Lý do (tập đóng) văn phòng chọn khi giao, chuyển, gỡ người quản lý hay gỡ thành viên (Đ6: «Văn phòng làm thì kèm lý do thuộc danh sách đóng»). Nhãn: chờ chủ chọn. */
export const MA_LY_DO_TO_CHUC = ["THEO_YEU_CAU_TO_CHUC", "NGUOI_QUAN_LY_NGHI_VIEC", "GIAO_LAN_DAU", "SAI_NGUOI", "KHAC_DA_GOI_XAC_NHAN"] as const;
export type MaLyDoToChuc = (typeof MA_LY_DO_TO_CHUC)[number];
export const NHAN_LY_DO_TO_CHUC: Record<MaLyDoToChuc, string> = {
  THEO_YEU_CAU_TO_CHUC: "Theo yêu cầu của tổ chức",
  NGUOI_QUAN_LY_NGHI_VIEC: "Người quản lý đã nghỉ việc",
  GIAO_LAN_DAU: "Giao lần đầu",
  SAI_NGUOI: "Gắn nhầm người",
  KHAC_DA_GOI_XAC_NHAN: "Lý do khác, đã gọi điện xác nhận",
};
export const laMaLyDoToChuc = (v: unknown): v is MaLyDoToChuc => typeof v === "string" && (MA_LY_DO_TO_CHUC as readonly string[]).includes(v);

/**
 * ADR-0213 Đ8.1 (mốc B1 Task 12): ai bấm «Gửi đơn» lên Tour Đảo. Đơn lập theo tư cách TỔ CHỨC (`tuCachCuaDon(acting_link_kind)` = "TO_CHUC") ⇒ CHỈ người quản lý có hiệu lực (Đ2.8) —
 * thành viên không bao giờ gửi thẳng; đơn cá nhân / đơn không tư cách ⇒ người lập như hôm nay (ADR-0136). Hàm thuần — route `gui-don` tính hai cờ.
 */
export function duocGuiLenTourDao(v: { tuCach: "CA_NHAN" | "TO_CHUC" | null; laNguoiLap: boolean; laQuanLyCoHieuLuc: boolean }): boolean {
  return v.tuCach === "TO_CHUC" ? v.laQuanLyCoHieuLuc : v.laNguoiLap;
}

// ---- ADR-0213 Đ8.2 (mốc B2, Task 16): lý do người quản lý trả lại nháp của thành viên — tập đóng (CHECK của ord_member_submit.reason_code cùng tập).
export const MA_LY_DO_TRA_LAI = ["SAI_DICH_VU", "SAI_NGAY", "SAI_SO_KHACH", "KHONG_DAT_NUA", "KHAC"] as const;
export type MaLyDoTraLai = (typeof MA_LY_DO_TRA_LAI)[number];
/** Nhãn hiện cho người quản lý ở hộp «Trả lại» (Task 17; AI viết, chờ chủ chọn — bảng tham chiếu). Khoá = tập đóng ở trên. */
export const NHAN_LY_DO_TRA_LAI: Readonly<Record<MaLyDoTraLai, string>> = {
  SAI_DICH_VU: "Sai dịch vụ", SAI_NGAY: "Sai ngày", SAI_SO_KHACH: "Sai số khách", KHONG_DAT_NUA: "Khách không đặt nữa", KHAC: "Lý do khác",
};
/** Hai chế độ thành viên (Đ8.2) — tên nguyên văn ADR-0213. */
export const NHAN_CHE_DO_THANH_VIEN = { CHI_SOAN: "Chỉ soạn", SOAN_VA_GUI: "Soạn và gửi người quản lý xác nhận" } as const;
export const laMaLyDoTraLai = (v: unknown): v is MaLyDoTraLai => typeof v === "string" && (MA_LY_DO_TRA_LAI as readonly string[]).includes(v);

// ---- ADR-0213 Đ7 (mốc B2, Task 15): mã vào tổ chức ---------------------------------------------------------------------------------------------------------
/** Bảng chữ của mã máy cấp: bỏ `0 O 1 I L` (dễ nhầm khi đọc qua điện thoại) — 31 ký tự. */
export const BANG_CHU_MA_VAO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
/** Độ dài mã (chưa kể dấu `-` khi hiện). */
export const DO_DAI_MA_VAO = 8;

/** Mã máy cấp: 8 ký tự từ `BANG_CHU_MA_VAO`; `bytes` lấy từ `crypto.getRandomValues` ở nơi gọi (bỏ byte rơi vào phần dư để không lệch phân bố). Thiếu byte ⇒ ném lỗi. */
export function sinhMaVao(bytes: Uint8Array): string {
  const n = BANG_CHU_MA_VAO.length;
  const tran = 256 - (256 % n); // 248: byte ≥ tran bị bỏ
  let ma = "";
  for (const b of bytes) {
    if (b >= tran) continue;
    ma += BANG_CHU_MA_VAO[b % n];
    if (ma.length === DO_DAI_MA_VAO) return ma;
  }
  throw new Error("sinhMaVao: không đủ byte ngẫu nhiên");
}

/**
 * Chuẩn hoá mã người dùng gõ: chữ HOA, bỏ `-` và mọi khoảng trắng; đúng 8 chữ cái/chữ số không dấu ⇒ mã, sai khuôn ⇒ null. `ab12cd34`, `AB12 CD34`, `ab12-cd34` ra cùng `AB12CD34`.
 * Nhận cả ký tự máy không bao giờ cấp (`0 O 1 I L`): mã như thế chỉ đơn giản là không khớp bản băm nào — vẫn tính một lần gõ sai (Review Focus 3).
 */
export function chuanHoaMaVao(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.normalize("NFC").toUpperCase().replace(/[\s-]+/g, "");
  return new RegExp(`^[A-Z0-9]{${DO_DAI_MA_VAO}}$`).test(s) ? s : null;
}

/** Cách hiện mã: `XXXX-XXXX`. */
export const hienMaVao = (ma: string): string => `${ma.slice(0, 4)}-${ma.slice(4)}`;

/** Câu trả lời DUY NHẤT của lệnh tạo lời mời (Đ7.1) — cùng câu dù số được mời có tài khoản hay chưa. `ngay` dạng dd/mm/yyyy. */
export const cauTaoLoiMoi = (ma: string, ngay: string): string => `Đã tạo lời mời. Mã: ${hienMaVao(ma)}, dùng được tới ${ngay}. Hãy gửi mã này cho người được mời.`;
/** Vượt trần theo số điện thoại (Đ7.3): câu trung tính, không mã. */
export const CAU_TRAN_THEO_SO = "Chưa tạo được lời mời cho số này lúc này, hãy thử lại sau";
/** Mã sai / hết hạn / không cùng số / đã dùng — MỘT câu trung tính cho người đăng ký và người nhận (không nói lý do nào). */
export const CAU_MA_VAO_SAI = "Mã vào tổ chức không đúng hoặc không còn dùng được.";
