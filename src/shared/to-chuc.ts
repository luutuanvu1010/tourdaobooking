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
