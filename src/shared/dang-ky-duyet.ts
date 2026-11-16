import type { LyDoKhongApCap } from "./cap-se-ap-hien-thi.ts";

// Kiểu dữ liệu của LÔ DUYỆT phiếu đăng ký (ADR-0207 Đ5; đợt 1 Task 8). Chỉ kiểu, không I/O.
// `dang-ky` đọc phiếu, kiểm trước rồi dựng `LoDuyetDangKyVao`; gốc lắp ráp (src/index.ts) ghép câu chưa chạy của dang-ky, parties, staff (và pricing ở Task 11) theo ĐÚNG thứ tự Đ5,
// tiêm cho route qua `ctx.loDuyetDangKy` (ADR-0206 Đ2, ADR-0209 Đ6 — dang-ky không import pricing). Mọi giá trị đã đọc TRƯỚC lô từ bản khai bất biến; mọi mã dòng sinh sẵn.

export interface LoDuyetDangKyVao {
  registrationId: string;
  /** Phiên bản bản khai người duyệt duyệt (câu chốt so với `current_version`). */
  version: number;
  approverId: string;
  /** ISO UTC của lần bấm; `today` = ngày giờ Việt Nam. */
  at: string;
  today: string;
  /** 1 khi Toàn quyền làm cả hai bước (người duyệt = người xác minh và giữ `admin.manage.superadmin`). Ghi lên dòng quyết định và dòng xác minh. */
  co: 0 | 1;
  /**
   * Mã vai: `RoleCode` nhóm bên ngoài, HOẶC mã loại đối tác do Kế toán thêm (`LD_…`, khi `laLoaiDoiTac`). `null` = phiếu «chỉ tổ chức» (mốc B1 Task 13): hồ sơ người không vai riêng,
   * tài khoản chỉ quyền Đối tác (dòng chỉnh tay), BẮT BUỘC `toChuc` với `lienKet = "MANAGER_OF"` (lc1d / LC-1c đọc liên kết).
   */
  roleCode: string | null;
  /** true = loại đối tác (nhóm OTHER, cờ `is_partner_label`): tài khoản nhận quyền Đối tác bằng dòng chỉnh tay (ADR-0212 Đ3). */
  laLoaiDoiTac: boolean;
  /** Tên vai cho chi tiết nhật ký (không dữ liệu cá nhân). */
  roleLabel: string;
  hoSo: { kieu: "MOI" } | { kieu: "CO_SAN"; partyId: string };
  ten: { family: string | null; middle: string | null; given: string };
  gender: string | null;
  birthDate: string | null;
  /** Số đăng nhập đã chuẩn hoá (`normalizePhone`). */
  loginPhone: string;
  lienHe: readonly { kind: "PHONE" | "EMAIL" | "ADDRESS"; value: string; valueNormalized: string }[];
  giayTo: { typeCode: string; number: string | null; numberKey: string | null; classCode: string | null; issuedDate: string | null; issuedPlace: string | null; expiryDate: string | null } | null;
  policyId: string;
  consentedAt: string;
  verifiedBy: string;
  verifiedAt: string;
  /** Mục đã đạt có đích ở hồ sơ: thuộc tính (HO_TEN, NGAY_SINH…) hay loại giấy tờ (CCCD…). */
  mucDat: readonly { loai: "ATTRIBUTE" | "DOCUMENT"; ma: string }[];
  referrerPartyId: string | null;
  /** Hạn đặt PIN (ISO UTC) = lúc duyệt + `dk_policy.activation_days`. */
  deadlineAt: string;
  /** Phần tổ chức của bản khai (ADR-0212 Đ6; đợt 2 Task 7). Vắng = phiếu không có phần tổ chức. */
  toChuc?: LoDuyetToChucVao;
}

/** Một giấy tờ của tổ chức chép một–một từ bản khai (`dk_submission_org`) sang `pty_organization_document`. Số / khoá / nơi cấp là N3: không vào nhật ký. */
export interface OrgDocValues { typeCode: string; number: string; numberKey: string; issuedDate: string | null; issuedPlace: string | null; expiryDate: string | null }

/** Phần tổ chức của lô duyệt (ADR-0212 Đ6). Mọi giá trị đọc TRƯỚC lô từ bản khai bất biến. */
export interface LoDuyetToChucVao {
  /** Kết luận Danh bạ của tổ chức: hồ sơ tổ chức mới, hay gắn hồ sơ tổ chức có sẵn (không bao giờ làm người đăng ký thành người quản lý — Đ5 mục 3). */
  hoSo: { kieu: "MOI" } | { kieu: "CO_SAN"; partyId: string };
  /** Vai của tổ chức (người duyệt chọn; mặc định `dk_registration.org_role_code`); null = không mở vai cho tổ chức (chỉ phiếu mốc A cũ). */
  roleCode: string | null;
  /** Liên kết người → tổ chức (ADR-0213 Đ6; `lienKetLoDuyet`): tổ chức MỚI ⇒ «Người quản lý của»; tổ chức có sẵn ⇒ «Người liên hệ của», không bao giờ người quản lý. */
  lienKet: "MANAGER_OF" | "CONTACT_OF";
  displayName: string;
  legalName: string | null;
  taxCode: string | null;
  address: string | null;
  invoiceEmail: string | null;
  /** Số điện thoại của tổ chức (đã chuẩn hoá cho liên hệ «Số điện thoại»); null = không khai. */
  phone: { value: string; valueNormalized: string } | null;
  gpkd: OrgDocValues;
  giayPhepThem: OrgDocValues | null;
  /** Mục tổ chức đã đạt (CHỈ từ `MUC_XAC_MINH_MO_TO_CHUC` — điều phối PF5). */
  mucDat: readonly { loai: "ATTRIBUTE" | "DOCUMENT"; ma: string }[];
}

export interface LoDuyetDangKyRa {
  partyId: string;
  staffId: string;
  statements: D1PreparedStatement[];
  /**
   * Cấp độ đại lý mặc định (ADR-0209 Đ3, Đ4; Task 12 mục I-1): `viTri` = chỉ số câu 8 trong `statements` (null = không có câu 8); `duDoan` = «cấp sẽ áp» pricing tính lúc ghép lô; `capCau8` = cấp của dòng chính sách mà câu 8 chèn (khi câu chèn thật thì đây là cấp đã áp).
   * Route đọc `kq[viTri].meta.changes` để biết đã ghi hay bỏ qua, rồi cắt tên cấp theo `partner.commission.view` của người duyệt.
   */
  cap: { viTri: number | null; duDoan: { cap: { code: string; ten: string } | null; lyDo: LyDoKhongApCap | null }; capCau8: { code: string; ten: string } | null };
}
