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
/** Khu của phần tổ chức (ADR-0212 Đ4; giao diện dựng ở đợt 2 Task 8). */
export const KHU_TO_CHUC = ["toChuc", "gpkd", "giayPhepThem", "uyQuyen"] as const;
export type KhuO = (typeof KHU_CA_NHAN)[number] | (typeof KHU_TO_CHUC)[number];
/** `chon`: ô chọn (danh sách giới tính ở tệp này; loại giấy phép thêm do máy chủ đưa); `tich`: ô tích có / không. */
export type KieuO = "text" | "date" | "tel" | "email" | "chon" | "tich";

/** Mô tả ô nhập (chỉ trường nào có ô mới có). `id` giữ nguyên tên cũ để kịch bản Chrome còn tìm được. */
export interface MoTaO {
  readonly id: string;
  readonly nhan: string;
  readonly kieu: KieuO;
  readonly khu: KhuO;
  readonly thuocTinh?: Readonly<Record<string, string | number>>;
  /** Ô chọn mà danh sách lựa chọn do máy chủ đưa lúc chạy (cấu hình công khai), không phải hằng ở tệp này. */
  readonly nguonTuyChon?: "giayPhepThem";
  /** Ô chỉ hiện khi đã chọn loại giấy phép thêm («co-loai»), hoặc khi loại đã chọn có ngày hết hạn («co-han»). */
  readonly hienKhi?: "co-loai" | "co-han";
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
export const CHO_O: readonly { readonly cot: string; readonly hetHan: string }[] = [
  { cot: "license_class_code", hetHan: "2027-03-31" },
  // ADR-0213 Đ7.5 (mốc B2, Task 15): máy chủ nhận «Mã vào tổ chức» từ Task 15; ô trên biểu mẫu dựng ở Task 17 (giao diện lượt B2) — quá hạn là bài đỏ.
  { cot: "invite_id", hetHan: "2026-11-30" },
];

const THONG_TIN_GIAY_TO = { bang: "dk_submission", phan: "CA_NHAN", nhom: "giayTo", batBuoc: false } as const;
const TO_CHUC = { bang: "dk_submission_org", phan: "TO_CHUC", nhom: "toChuc" } as const;
const GIAY_PHEP_THEM_TC = { ...TO_CHUC, nhom: "giayPhepThem", batBuoc: false } as const;
const GIAY_TO_TC = "pty_organization_document";

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
  // Mã vào tổ chức (ADR-0213 Đ7.5): tuỳ chọn; phiếu KHÔNG lưu mã — máy chủ tra bản băm và chỉ lưu mã định danh lời mời vào `dk_registration.invite_id`; không chép sang hồ sơ.
  { khoa: "maVaoToChuc", phan: "CA_NHAN", bang: "dk_registration", cot: ["invite_id"], noiLuu: "CHI_PHIEU", batBuoc: false },
  // ---- Phần tổ chức (ADR-0212 Đ4, phụ lục A.2): thân gửi `toChuc: { … }`; vắng / null = phiếu không có phần tổ chức. Vai của tổ chức (`dk_registration.org_role_code`) đi qua PUT nháp, không ở đây. ----
  { khoa: "toChuc.tenToChuc", ...TO_CHUC, cot: ["display_name"], noiLuu: ["pty_party.display_name"], batBuoc: true, o: { id: "dk-tc-ten", nhan: "Tên tổ chức (tên thường gọi)", kieu: "text", khu: "toChuc", thuocTinh: { maxlength: 200, autocomplete: "organization" } } },
  { khoa: "toChuc.tenPhapLy", ...TO_CHUC, cot: ["legal_name"], noiLuu: ["pty_organization.legal_name"], batBuoc: false, o: { id: "dk-tc-ten-phap-ly", nhan: "Tên pháp lý", kieu: "text", khu: "toChuc", thuocTinh: { maxlength: 300 } } },
  { khoa: "toChuc.maSoThue", ...TO_CHUC, cot: ["tax_code"], noiLuu: ["pty_organization.tax_code"], batBuoc: false, o: { id: "dk-tc-mst", nhan: "Mã số thuế", kieu: "text", khu: "toChuc", thuocTinh: { inputmode: "numeric", autocomplete: "off" } } },
  { khoa: "toChuc.diaChi", ...TO_CHUC, cot: ["address"], noiLuu: ["pty_organization.address"], batBuoc: false, o: { id: "dk-tc-dia-chi", nhan: "Địa chỉ tổ chức", kieu: "text", khu: "toChuc", thuocTinh: { maxlength: 300 } } },
  { khoa: "toChuc.emailHoaDon", ...TO_CHUC, cot: ["invoice_email"], noiLuu: ["pty_organization.invoice_email"], batBuoc: false, o: { id: "dk-tc-email", nhan: "Email nhận hoá đơn", kieu: "email", khu: "toChuc", thuocTinh: { autocomplete: "email" } } },
  { khoa: "toChuc.dienThoai", ...TO_CHUC, cot: ["phone_value"], noiLuu: ["pty_contact_point.value"], batBuoc: false, o: { id: "dk-tc-dien-thoai", nhan: "Số điện thoại tổ chức (không bắt buộc)", kieu: "tel", khu: "toChuc", thuocTinh: { inputmode: "tel" } } },
  { khoa: "toChuc.soGpkd", ...TO_CHUC, cot: ["gpkd_number"], noiLuu: [`${GIAY_TO_TC}.document_number`], batBuoc: true, o: { id: "dk-tc-so-gpkd", nhan: "Số giấy chứng nhận đăng ký kinh doanh", kieu: "text", khu: "gpkd", thuocTinh: { autocomplete: "off" } } },
  { khoa: "toChuc.ngayCapGpkd", ...TO_CHUC, cot: ["gpkd_issued_date"], noiLuu: [`${GIAY_TO_TC}.issued_date`], batBuoc: false, o: { id: "dk-tc-ngay-cap-gpkd", nhan: "Ngày cấp", kieu: "date", khu: "gpkd" } },
  { khoa: "toChuc.noiCapGpkd", ...TO_CHUC, cot: ["gpkd_issued_place"], noiLuu: [`${GIAY_TO_TC}.issued_place`], batBuoc: false, o: { id: "dk-tc-noi-cap-gpkd", nhan: "Nơi cấp", kieu: "text", khu: "gpkd" } },
  { khoa: "toChuc.loaiGiayPhep", ...GIAY_PHEP_THEM_TC, cot: ["extra_type_code"], noiLuu: [`${GIAY_TO_TC}.document_type_code`], o: { id: "dk-tc-loai-gp", nhan: "Giấy phép thêm (không bắt buộc)", kieu: "chon", khu: "giayPhepThem", nguonTuyChon: "giayPhepThem" } },
  { khoa: "toChuc.soGiayPhep", ...GIAY_PHEP_THEM_TC, cot: ["extra_number"], noiLuu: [`${GIAY_TO_TC}.document_number`], o: { id: "dk-tc-so-gp", nhan: "Số giấy phép", kieu: "text", khu: "giayPhepThem", thuocTinh: { autocomplete: "off" }, hienKhi: "co-loai" } },
  { khoa: "toChuc.ngayCapGiayPhep", ...GIAY_PHEP_THEM_TC, cot: ["extra_issued_date"], noiLuu: [`${GIAY_TO_TC}.issued_date`], o: { id: "dk-tc-ngay-cap-gp", nhan: "Ngày cấp", kieu: "date", khu: "giayPhepThem", hienKhi: "co-loai" } },
  { khoa: "toChuc.noiCapGiayPhep", ...GIAY_PHEP_THEM_TC, cot: ["extra_issued_place"], noiLuu: [`${GIAY_TO_TC}.issued_place`], o: { id: "dk-tc-noi-cap-gp", nhan: "Nơi cấp", kieu: "text", khu: "giayPhepThem", hienKhi: "co-loai" } },
  { khoa: "toChuc.hetHanGiayPhep", ...GIAY_PHEP_THEM_TC, cot: ["extra_expiry_date"], noiLuu: [`${GIAY_TO_TC}.expiry_date`], o: { id: "dk-tc-het-han-gp", nhan: "Ngày hết hạn", kieu: "date", khu: "giayPhepThem", hienKhi: "co-han" } },
  { khoa: "toChuc.duocUyQuyen", ...TO_CHUC, cot: ["authority_confirmed_at"], noiLuu: "CHI_PHIEU", batBuoc: true, o: { id: "dk-tc-uy-quyen", nhan: "Tôi được tổ chức cho phép đăng ký thay", kieu: "tich", khu: "uyQuyen" } },
];

/** Cột hệ thống / máy tính của từng bảng — KHÔNG cần trường trỏ tới. Thêm cột vào đây là quyết định có chủ đích (bài khớp cột canh). */
export const COT_HE_THONG: Readonly<Record<string, readonly string[]>> = {
  dk_submission: ["id", "registration_id", "version", "phone_key", "number_key", "erased_at", "created_at", "created_by", "updated_at", "updated_by"],
  pty_person: ["party_id", "created_at", "created_by", "updated_at", "updated_by"],
  pty_person_document: ["id", "party_id", "number_key", "previous_id", "voided_at", "erased_at", "created_at", "created_by", "updated_at", "updated_by"],
  dk_submission_org: ["id", "registration_id", "version", "tax_key", "phone_key", "gpkd_key", "extra_key", "erased_at", "created_at", "created_by", "updated_at", "updated_by"],
  pty_organization: ["party_id", "created_at", "created_by", "updated_at", "updated_by"],
  pty_organization_document: ["id", "party_id", "number_key", "previous_id", "voided_at", "created_at", "created_by", "updated_at", "updated_by"],
};

// ---- Dẫn xuất (thuần) ----
/** Các trường máy chủ nhận ở mức ngoài cùng của thân gửi (`giayTo.x` chỉ góp `giayTo`). */
export const truongGuiMucNgoai = (): string[] => [...new Set(TRUONG_DANG_KY.map((t) => t.khoa.split(".")[0]!))];
/** Các trường con của một nhóm lồng (`giayTo`, `toChuc`) — chỉ một tầng lồng. */
export const truongCon = (nhom: string): string[] => TRUONG_DANG_KY.filter((t) => t.khoa.startsWith(`${nhom}.`)).map((t) => t.khoa.slice(nhom.length + 1));
/** Các trường con của `giayTo`. */
export const truongGiayTo = (): string[] => truongCon("giayTo");
/** Các nhóm lồng của thân gửi (khoá ngoài cùng có trường con). */
export const NHOM_LONG: readonly string[] = [...new Set(TRUONG_DANG_KY.filter((t) => t.khoa.includes(".")).map((t) => t.khoa.split(".")[0]!))];

/** Tập trường máy chủ nhận (dựng từ tệp này, không khai tay). */
export const TRUONG_GUI: readonly string[] = truongGuiMucNgoai();
export const TRUONG_GIAY_TO: readonly string[] = truongGiayTo();
export const TRUONG_TO_CHUC: readonly string[] = truongCon("toChuc");
const laVat = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
/** Thân gửi chỉ có trường trong tệp ánh xạ (kể cả trong mỗi nhóm lồng); trường lạ ⇒ false. */
export const truongDung = (body: Record<string, unknown>): boolean =>
  Object.keys(body).every((k) => TRUONG_GUI.includes(k))
  && NHOM_LONG.every((nhom) => { const con = body[nhom]; return !laVat(con) || Object.keys(con).every((k) => truongCon(nhom).includes(k)); });

export type ODung = MoTaO & { readonly khoa: string; readonly tuyChon?: readonly { readonly value: string; readonly label: string }[] };
const thanhO = (t: TruongDangKy): ODung => ({
  ...t.o!, khoa: t.khoa,
  ...(t.khoa === "gioiTinh" ? { tuyChon: GIOI_TINH.map((g) => ({ value: g, label: GIOI_TINH_NHAN[g] })) } : {}),
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

/**
 * Dựng thân «gửi phiếu» từ giá trị các ô (khoá = `khoa`). Ô trống không gửi; `giayTo` chỉ gửi khi có số, kèm loại cố định. Mọi kiểm giá trị là việc của máy chủ.
 * `coToChuc` đúng ⇒ thân có thêm nhóm tổ chức dựng từ các ô tổ chức (ô tích: «1» ⇒ `true`, còn lại vắng — máy chủ đòi đúng `true`); sai ⇒ KHÔNG có nhóm tổ chức (phiếu không có phần tổ chức).
 */
export function dungThanGui(giaTri: Readonly<Record<string, string>>, chinhSachPhienBan: number, coToChuc = false): Record<string, unknown> {
  const rong = (k: string): string | undefined => { const v = (giaTri[k] ?? "").trim(); return v === "" ? undefined : v; };
  const than: Record<string, unknown> = { chinhSachPhienBan, hoTen: giaTri.hoTen ?? "" };
  for (const t of TRUONG_DANG_KY) if (t.phan === "CA_NHAN" && t.o && !t.khoa.includes(".") && t.khoa !== "hoTen") than[t.khoa] = rong(t.khoa);
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
  if (coToChuc) {
    const toChuc: Record<string, unknown> = {};
    for (const t of TRUONG_DANG_KY) {
      if (t.phan !== "TO_CHUC" || !t.o) continue;
      const con = t.khoa.slice(t.khoa.indexOf(".") + 1);
      const v = rong(t.khoa);
      toChuc[con] = t.o.kieu === "tich" ? (v === "1" ? true : undefined) : v;
    }
    than[NHOM_TO_CHUC] = toChuc;
  }
  return than;
}
/** Tên nhóm lồng của phần tổ chức trong thân gửi (một nơi; web không viết tay tên trường). */
export const NHOM_TO_CHUC: string = NHOM_LONG.find((n) => TRUONG_DANG_KY.some((t) => t.phan === "TO_CHUC" && t.khoa.startsWith(`${n}.`)))!;

/** Giá trị điền sẵn của ô tổ chức từ phần tổ chức của bản khai trước (phiếu CẦN BỔ SUNG). Mã số thuế, số GPKD, số giấy phép, số điện thoại KHÔNG điền lại (máy chủ chỉ trả bản che). */
export function giaTriTruocToChuc(khoa: string, tc: PhieuDangKyDto["toChuc"]): string {
  if (!tc) return "";
  switch (khoa) {
    case "toChuc.tenToChuc": return tc.tenToChuc;
    case "toChuc.tenPhapLy": return tc.tenPhapLy ?? "";
    case "toChuc.diaChi": return tc.diaChi ?? "";
    case "toChuc.emailHoaDon": return tc.emailHoaDon ?? "";
    case "toChuc.ngayCapGpkd": return tc.gpkd.ngayCap ?? "";
    case "toChuc.loaiGiayPhep": return tc.giayPhepThem?.loai ?? "";
    case "toChuc.ngayCapGiayPhep": return tc.giayPhepThem?.ngayCap ?? "";
    case "toChuc.hetHanGiayPhep": return tc.giayPhepThem?.hetHan ?? "";
    default: return "";
  }
}
/** Gợi ý dưới ô tổ chức khi nhập lại bản khai trước (số đã che). */
export function goiYTruocToChuc(khoa: string, tc: PhieuDangKyDto["toChuc"]): string | undefined {
  if (!tc) return undefined;
  if (khoa === "toChuc.maSoThue" && tc.maSoThueChe) return `Số đã khai: ${tc.maSoThueChe}. Hãy nhập lại đủ số.`;
  if (khoa === "toChuc.soGpkd" && tc.gpkd.soChe) return `Số đã khai: ${tc.gpkd.soChe}. Hãy nhập lại đủ số.`;
  if (khoa === "toChuc.soGiayPhep" && tc.giayPhepThem?.soChe) return `Số đã khai: ${tc.giayPhepThem.soChe}. Hãy nhập lại đủ số.`;
  if (khoa === "toChuc.dienThoai" && tc.daKhaiDienThoai) return "Hãy nhập lại số điện thoại.";
  return undefined;
}
