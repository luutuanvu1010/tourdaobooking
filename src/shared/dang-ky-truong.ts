// TỆP ÁNH XẠ TRƯỜNG ĐĂNG KÝ ↔ CỘT (ADR-0212 Đ8, Đ9; phụ lục A.1; đợt 2 Task 3). MỘT nơi duy nhất nói: biểu mẫu `web/dang-ky.ts` có những ô nào, máy chủ nhận những trường nào
// trong thân «gửi phiếu», mỗi trường vào cột nào của phiếu và về đâu sau khi duyệt. Giao diện dựng ô từ `oCuaKhu`, máy chủ dựng tập trường nhận từ `TRUONG_DANG_KY`,
// thân gửi dựng bằng `dungThanGui` — nên thêm một ô chỉ có một chỗ phải sửa, và bài `src/dang-ky-truong-khop-cot.test.ts` đỏ khi biểu mẫu, máy chủ và cột lệch nhau.
// Tệp thuần: không đọc CSDL, không chạm DOM; `web/` và `src/modules/` cùng import được.
import type { PhieuDangKyDto } from "./contracts.ts";
import { GIOI_TINH, GIOI_TINH_NHAN } from "./xung-ho.ts";

export type PhanDangKy = "CA_NHAN" | "TO_CHUC";
export type NhomTruong = "giayTo" | "toChuc" | "giayPhepThem";
/** Khu của biểu mẫu cá nhân (thứ tự hiện trên trang). */
export const KHU_CA_NHAN = ["thongTin", "canCuoc", "gioiThieu"] as const;
export type KhuO = (typeof KHU_CA_NHAN)[number];
export type KieuO = "text" | "date" | "tel" | "chon";

/** Mô tả ô nhập (chỉ trường nào có ô mới có). `id` giữ nguyên tên cũ để kịch bản Chrome còn tìm được. */
export interface MoTaO {
  readonly id: string;
  readonly nhan: string;
  readonly kieu: KieuO;
  readonly khu: KhuO;
  readonly thuocTinh?: Readonly<Record<string, string | number>>;
}

export interface TruongDangKy {
  /** Tên trường trong thân lệnh gửi; trường lồng nhau viết `giayTo.number`. */
  readonly khoa: string;
  readonly phan: PhanDangKy;
  readonly nhom?: NhomTruong;
  readonly bang: "dk_submission" | "dk_submission_org" | "dk_registration" | "pty_registration_attachment";
  /** Cột của `bang` mà trường này ghi vào («một trường → ba cột» cho họ tên). */
  readonly cot: readonly string[];
  /** Nơi lưu sau duyệt, dạng `bang.cột`; «CHI_PHIEU» = chỉ nằm ở phiếu, không chép sang hồ sơ. */
  readonly noiLuu: readonly string[] | "CHI_PHIEU";
  readonly batBuoc: boolean;
  /** Ô nhập trên biểu mẫu; vắng ⇒ trường KHÔNG phải ô (giá trị cố định, chờ ô, hoặc dữ kiện do trang tự đưa vào). */
  readonly o?: MoTaO;
  /** Giá trị cố định giao diện gửi cứng (không có ô). */
  readonly coDinh?: string;
}

/** Cột có trong phiếu nhưng CHƯA có ô — có hạn, quá hạn là bài đỏ (ADR-0212 Đ8; Ruling R7). Hạn = lúc mở Tài xế đối tác. */
export const CHO_O: readonly { readonly cot: string; readonly hetHan: string }[] = [{ cot: "license_class_code", hetHan: "2027-03-31" }];

const THONG_TIN_GIAY_TO = { bang: "dk_submission", phan: "CA_NHAN", nhom: "giayTo", batBuoc: false } as const;

export const TRUONG_DANG_KY: readonly TruongDangKy[] = [
  { khoa: "chinhSachPhienBan", phan: "CA_NHAN", bang: "dk_submission", cot: ["policy_id", "consented_at"], noiLuu: ["pty_consent.policy_id"], batBuoc: true },
  {
    khoa: "hoTen", phan: "CA_NHAN", bang: "dk_submission", cot: ["family_name", "middle_name", "given_name"], noiLuu: ["pty_person.family_name", "pty_person.middle_name", "pty_person.given_name"], batBuoc: true,
    o: { id: "dk-ho-ten", nhan: "Họ tên", kieu: "text", khu: "thongTin", thuocTinh: { autocomplete: "name" } },
  },
  {
    khoa: "gioiTinh", phan: "CA_NHAN", bang: "dk_submission", cot: ["gender"], noiLuu: ["pty_person.gender"], batBuoc: false,
    o: { id: "dk-gioi-tinh", nhan: "Giới tính", kieu: "chon", khu: "thongTin" },
  },
  {
    khoa: "ngaySinh", phan: "CA_NHAN", bang: "dk_submission", cot: ["birth_date"], noiLuu: ["pty_person.birth_date"], batBuoc: false,
    o: { id: "dk-ngay-sinh", nhan: "Ngày sinh", kieu: "date", khu: "thongTin" },
  },
  {
    khoa: "dienThoai", phan: "CA_NHAN", bang: "dk_submission", cot: ["phone_value"], noiLuu: ["staff.phone", "pty_contact_point.value"], batBuoc: false,
    o: { id: "dk-dien-thoai", nhan: "Số điện thoại", kieu: "tel", khu: "thongTin", thuocTinh: { autocomplete: "tel", inputmode: "tel" } },
  },
  {
    khoa: "diaChi", phan: "CA_NHAN", bang: "dk_submission", cot: ["address_value"], noiLuu: ["pty_contact_point.value"], batBuoc: false,
    o: { id: "dk-dia-chi", nhan: "Địa chỉ", kieu: "text", khu: "thongTin", thuocTinh: { autocomplete: "street-address" } },
  },
  { khoa: "giayTo.typeCode", ...THONG_TIN_GIAY_TO, cot: ["document_type_code"], noiLuu: ["pty_person_document.document_type_code"], coDinh: "CCCD" },
  {
    khoa: "giayTo.number", ...THONG_TIN_GIAY_TO, cot: ["document_number"], noiLuu: ["pty_person_document.document_number"],
    o: { id: "dk-so-cccd", nhan: "Số căn cước", kieu: "text", khu: "canCuoc", thuocTinh: { inputmode: "numeric", autocomplete: "off" } },
  },
  { khoa: "giayTo.classCode", ...THONG_TIN_GIAY_TO, cot: ["license_class_code"], noiLuu: ["pty_person_document.license_class_code"] },
  { khoa: "giayTo.issuedDate", ...THONG_TIN_GIAY_TO, cot: ["issued_date"], noiLuu: ["pty_person_document.issued_date"], o: { id: "dk-ngay-cap", nhan: "Ngày cấp", kieu: "date", khu: "canCuoc" } },
  { khoa: "giayTo.issuedPlace", ...THONG_TIN_GIAY_TO, cot: ["issued_place"], noiLuu: ["pty_person_document.issued_place"], o: { id: "dk-noi-cap", nhan: "Nơi cấp", kieu: "text", khu: "canCuoc" } },
  { khoa: "giayTo.expiryDate", ...THONG_TIN_GIAY_TO, cot: ["expiry_date"], noiLuu: ["pty_person_document.expiry_date"], o: { id: "dk-het-han", nhan: "Ngày hết hạn", kieu: "date", khu: "canCuoc" } },
  {
    khoa: "nguoiGioiThieu", phan: "CA_NHAN", bang: "dk_submission", cot: ["referrer_text"], noiLuu: "CHI_PHIEU", batBuoc: false,
    o: { id: "dk-gioi-thieu", nhan: "Người giới thiệu (không bắt buộc)", kieu: "text", khu: "gioiThieu", thuocTinh: { maxlength: 200 } },
  },
];

/** Cột hệ thống / máy tính của từng bảng — KHÔNG cần trường trỏ tới. Thêm cột vào đây là quyết định có chủ đích (bài khớp cột canh). */
export const COT_HE_THONG: Readonly<Record<string, readonly string[]>> = {
  dk_submission: ["id", "registration_id", "version", "phone_key", "number_key", "erased_at", "created_at", "created_by", "updated_at", "updated_by"],
  pty_person: ["party_id", "created_at", "created_by", "updated_at", "updated_by"],
  pty_person_document: ["id", "party_id", "number_key", "previous_id", "voided_at", "erased_at", "created_at", "created_by", "updated_at", "updated_by"],
};

// ---- Dẫn xuất (thuần) ----
/** Các trường máy chủ nhận ở mức ngoài cùng của thân gửi (`giayTo.x` chỉ góp `giayTo`). */
export const truongGuiMucNgoai = (): string[] => [...new Set(TRUONG_DANG_KY.map((t) => t.khoa.split(".")[0]!))];
/** Các trường con của `giayTo`. */
export const truongGiayTo = (): string[] => TRUONG_DANG_KY.filter((t) => t.khoa.startsWith("giayTo.")).map((t) => t.khoa.slice("giayTo.".length));

/** Tập trường máy chủ nhận (dựng từ tệp này, không khai tay). */
export const TRUONG_GUI: readonly string[] = truongGuiMucNgoai();
export const TRUONG_GIAY_TO: readonly string[] = truongGiayTo();
const laVat = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
/** Thân gửi chỉ có trường trong tệp ánh xạ (kể cả trong `giayTo`); trường lạ ⇒ false. */
export const truongDung = (body: Record<string, unknown>): boolean =>
  Object.keys(body).every((k) => TRUONG_GUI.includes(k)) && (!laVat(body.giayTo) || Object.keys(body.giayTo).every((k) => TRUONG_GIAY_TO.includes(k)));

export type ODung = MoTaO & { readonly khoa: string; readonly tuyChon?: readonly { readonly value: string; readonly label: string }[] };
const thanhO = (t: TruongDangKy): ODung => ({
  ...t.o!, khoa: t.khoa,
  ...(t.o!.kieu === "chon" ? { tuyChon: GIOI_TINH.map((g) => ({ value: g, label: GIOI_TINH_NHAN[g] })) } : {}),
});
/** Các ô của một phần biểu mẫu, đúng thứ tự khai. */
export const oCuaPhan = (phan: PhanDangKy): ODung[] => TRUONG_DANG_KY.filter((t) => t.phan === phan && t.o).map(thanhO);
/** Các ô của một khu. */
export const oCuaKhu = (phan: PhanDangKy, khu: KhuO): ODung[] => TRUONG_DANG_KY.filter((t) => t.phan === phan && t.o?.khu === khu).map(thanhO);

type BanKhaiTruoc = PhieuDangKyDto["banKhaiTruoc"];
/** Giá trị điền sẵn của một ô từ bản khai lần trước (phiếu CẦN BỔ SUNG). Số giấy tờ, số điện thoại KHÔNG điền lại (máy chủ chỉ trả bản che). */
export function giaTriTruoc(khoa: string, bk: BanKhaiTruoc): string {
  if (!bk) return "";
  switch (khoa) {
    case "hoTen": return bk.hoTen;
    case "gioiTinh": return bk.gioiTinh ?? "";
    case "ngaySinh": return bk.ngaySinh ?? "";
    case "diaChi": return bk.diaChi ?? "";
    case "giayTo.issuedDate": return bk.giayTo?.ngayCap ?? "";
    case "giayTo.expiryDate": return bk.giayTo?.hetHan ?? "";
    default: return "";
  }
}
/** Gợi ý dưới ô khi nhập lại bản khai trước (số đã che). */
export function goiYTruoc(khoa: string, bk: BanKhaiTruoc): string | undefined {
  if (!bk) return undefined;
  if (khoa === "dienThoai" && bk.daKhaiDienThoai) return "Hãy nhập lại số điện thoại.";
  if (khoa === "giayTo.number" && bk.giayTo?.soChe) return `Số đã khai: ${bk.giayTo.soChe}. Hãy nhập lại đủ số.`;
  return undefined;
}

/** Dựng thân «gửi phiếu» từ giá trị các ô (khoá = `khoa`). Ô trống không gửi; `giayTo` chỉ gửi khi có số, kèm loại cố định. Mọi kiểm giá trị là việc của máy chủ. */
export function dungThanGui(giaTri: Readonly<Record<string, string>>, chinhSachPhienBan: number): Record<string, unknown> {
  const rong = (k: string): string | undefined => { const v = (giaTri[k] ?? "").trim(); return v === "" ? undefined : v; };
  const than: Record<string, unknown> = { chinhSachPhienBan, hoTen: giaTri.hoTen ?? "" };
  for (const t of TRUONG_DANG_KY) if (t.o && !t.khoa.includes(".") && t.khoa !== "hoTen") than[t.khoa] = rong(t.khoa);
  const giayTo: Record<string, unknown> = {};
  for (const t of TRUONG_DANG_KY) {
    if (!t.khoa.startsWith("giayTo.")) continue;
    const con = t.khoa.slice("giayTo.".length);
    giayTo[con] = t.coDinh ?? (t.o ? rong(t.khoa) ?? null : undefined);
  }
  if (rong("giayTo.number")) {
    giayTo.number = rong("giayTo.number");
    than.giayTo = giayTo;
  }
  return than;
}
