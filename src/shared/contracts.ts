// HỢP ĐỒNG API giữa Worker và giao diện (web/). Chỉ chứa kiểu — không có mã chạy.
// Server khai kiểu trả về theo file này (và `satisfies` ở chỗ trả JSON); web/api.ts re-export. Đổi một bên mà quên bên kia → typecheck báo.
import type { AuditAction, AuditTargetType } from "./audit-actions.ts";
import type { CatalogService, PaxCode, PaxCounts, Prices } from "./order-lines.ts";
import type { FeedbackKind, FeedbackStatus } from "./feedback-catalog.ts";
import type { LyDoSuaSai } from "./giay-to.ts";
import type { NhomLyDo } from "./dieu-phoi-kieu.ts";
import type { PermissionCode } from "./permissions.ts";
import type { RoleCode } from "./roles.ts";

export type { AuditAction, AuditTargetType, FeedbackKind, FeedbackStatus, CatalogService, LyDoSuaSai, PaxCode, PaxCounts, PermissionCode, Prices, RoleCode };

// ---- Nhân viên / phiên -------------------------------------------------------
export interface StaffProfile {
  id: string;
  /** Tên hiển thị lấy từ hồ sơ (pty_party.display_name), không phải cột staff.full_name (cột chết). */
  fullName: string;
  phone: string;
  /** Hồ sơ của tài khoản; null chỉ trong khoảng giữa hai lần triển khai N1 (đặc tả N1 §9). */
  partyId: string | null;
  /** Quyền trong app (ADR-0005), đọc từ stf_permission — KHÔNG phải vai trò hồ sơ (HDV, tài xế…). */
  permissions: PermissionCode[];
}

/** Hồ sơ đầy đủ cho màn hình quản trị. */
export interface StaffAccount extends StaffProfile {
  active: boolean;
  createdAt: string;
  /** Lần đăng nhập thành công gần nhất (ISO UTC); null = chưa từng đăng nhập (kể từ khi có cột này). Đăng nhập PIN (`POST /api/auth/login`) và đăng nhập Face ID (`POST /api/auth/passkey/login`) đều ghi — đổi PIN/làm mới phiên thì không (ADR-0016). */
  lastLoginAt: string | null;
}

export interface StaffAccountDto extends StaffAccount {
  /** Đang bị khoá đăng nhập do nhập sai PIN quá nhiều lần. */
  locked: boolean;
  /** Số passkey (Face ID) còn hiệu lực. */
  passkeyCount: number;
  /** Vai với Tour Đảo đang mở (ADR-0018). Rỗng = tài khoản chưa chuyển sang cách mới (đang dùng quyền cũ). */
  roles: RoleCode[];
}

/** Thân yêu cầu PUT /api/staff/:id/permissions: TOÀN BỘ tập quyền mong muốn (không rỗng). */
export interface StaffPermissionsRequest { permissions: PermissionCode[] }
/** Thân PUT /api/staff/:id/roles: TOÀN BỘ tập vai mong muốn (không rỗng) + chỉnh tay (lý do bắt buộc khi có). */
export interface StaffRolesRequest { roles: RoleCode[]; adds?: PermissionCode[]; removes?: PermissionCode[]; reason?: string }
/** Vai + chỉnh tay đang có; `reason` = lý do của lần chỉnh tay gần nhất (giao diện điền sẵn), null khi không chỉnh tay. */
export interface StaffRolesResponse { roles: RoleCode[]; adds: PermissionCode[]; removes: PermissionCode[]; reason: string | null }

/** `maintenance` chỉ có ở `GET /api/auth/me` (không có ở phản hồi đăng nhập): chế độ bảo trì đang BẬT thì chỉ Toàn quyền mới tới được đây (ADR-0071), để giao diện hiện dải "Đang ở chế độ bảo trì". */
export interface MeResponse { staff: StaffProfile; maintenance?: MaintenanceStatusDto }
/**
 * `GET /api/auth/config` (công khai): khoá site để trang đăng nhập dựng widget Turnstile; null = máy chủ không bật Turnstile (đừng dựng widget, đăng nhập không cần token).
 * `maintenance`: trang đăng nhập hiện banner + đếm ngược khi đang bảo trì. KHÔNG lộ ai được phép.
 */
export interface AuthConfigResponse {
  turnstileSiteKey: string | null;
  maintenance: MaintenanceStatusDto;
  /** Máy chủ bật đăng nhập bằng Face ID — PASSKEY_RP_ID/PASSKEY_ORIGIN hợp lệ. */
  passkey: boolean;
  /** Số phiên bản đang chạy (= APP_VERSION, từ nhật ký thay đổi). Công khai; scripts/kiem-phien-ban.mjs so với bản ở máy trước/sau deploy. */
  version: string;
  /** Tên gọi của hồ sơ công ty chủ (ADR-0024 6.2) — chân trang đăng nhập. null = chưa có / đọc lỗi → trang giữ chữ tĩnh. */
  companyName: string | null;
  /** Mã số thuế của hồ sơ công ty chủ (6.2). null như trên. */
  companyTaxCode: string | null;
}

// ---- Đăng nhập bằng Face ID (passkey, ADR-0016; đặc tả 2026-09-23-passkey-design.md) ----
export interface PasskeyDto { id: string; label: string; createdAt: string; lastUsedAt: string | null }
export interface PasskeyListResponse { passkeys: PasskeyDto[] }
export interface PasskeyResponse { passkey: PasskeyDto }
export interface PasskeyDescriptorJson { type: "public-key"; id: string }
/** Cho navigator.credentials.get — mọi trường nhị phân là base64url. */
export interface PasskeyRequestOptionsResponse {
  publicKey: { challenge: string; rpId: string; timeout: number; userVerification: "required"; allowCredentials: PasskeyDescriptorJson[] };
}
/** Cho navigator.credentials.create — mọi trường nhị phân là base64url. */
export interface PasskeyCreationOptionsResponse {
  publicKey: {
    challenge: string;
    rp: { id: string; name: string };
    user: { id: string; name: string; displayName: string };
    pubKeyCredParams: { type: "public-key"; alg: number }[];
    timeout: number;
    attestation: "none";
    authenticatorSelection: { residentKey: "required"; requireResidentKey: true; userVerification: "required" };
    excludeCredentials: PasskeyDescriptorJson[];
  };
}
/** Dạng JSON của PublicKeyCredential gửi lên máy chủ (base64url). */
export interface PasskeyCredentialJson {
  id: string;
  rawId: string;
  type: "public-key";
  response: { clientDataJSON: string; attestationObject?: string; authenticatorData?: string; signature?: string; userHandle?: string | null };
}

// ---- Chế độ bảo trì (src/shared/maintenance.ts; module `maintenance`) ----
export interface MaintenanceStatusDto {
  on: boolean;
  /** Giờ dự kiến hoàn tất (ISO UTC); null khi tắt hoặc bật mà chưa có giờ. */
  endsAt: string | null;
}
/** `GET`/`PUT /api/maintenance` (chỉ Toàn quyền — ô settings.ops, ADR-0071 điều 3c): `canToggle` luôn true khi qua chốt (giữ trường cho giao diện). */
export interface MaintenanceResponse extends MaintenanceStatusDto { canToggle: boolean }

// ---- Công tắc "Dịch vụ nhập tay" (ADR-0061 điều 6; module `orders`) ----
/**
 * `GET`/`POST /api/cai-dat/nhap-tay`: `batNhapTay` = công tắc đang BẬT; `duocDung` = CHÍNH người gọi có được nhập tay không (`duocNhapTay` của máy chủ —
 * form lập đơn hiện nút "+ Dịch vụ nhập tay" theo trường này); `doiDuoc` = người gọi bật/tắt được không (ô `settings.ops` — màn cài đặt của Toàn quyền).
 */
export interface NhapTayResponse { batNhapTay: boolean; duocDung: boolean; doiDuoc: boolean }
/** Thân `POST /api/cai-dat/nhap-tay` (chỉ Toàn quyền). */
export interface NhapTayRequest { batNhapTay: boolean }
/** Thân `PUT /api/maintenance`. `endsAt` bắt buộc khi `on = true`. */
export interface MaintenanceRequest { on: boolean; endsAt?: string }
/** Thân `error` của phản hồi 503 `maintenance` (mọi `/api/*` cần đăng nhập với người bị chặn, và `POST /api/auth/login`): `endsAt` để giao diện dựng đồng hồ đếm ngược mà không cần gọi thêm. */
export interface MaintenanceErrorBody { code: "maintenance"; message: string; endsAt: string | null }
export interface StaffListResponse { staff: StaffAccountDto[] }
export interface StaffResponse { staff: StaffAccountDto }
export interface StaffWithPinResponse { staff: StaffAccountDto; pin: string }

// ---- Đơn hàng ----------------------------------------------------------------
export type OrderStatus = "draft" | "confirmed" | "cancelled";

export interface OrderItemDto {
  id: string;
  /** Mã dịch vụ nguồn khi dòng sinh từ danh mục; null = nhập tay. */
  catalogCode: string | null;
  /** Loại khách của dòng (dịch vụ tính theo nhóm: "adult" = số khách); null = nhập tay. */
  paxCode: PaxCode | null;
  description: string;
  detail: string | null;
  quantity: number;
  unitPrice: number;
  /** Giá danh mục hiệu lực lúc lập dòng; null = nhập tay. Lệch giá = `unitPrice ≠ catalogPrice` (hàm `priceDeviation` ở order-lines). */
  catalogPrice: number | null;
  lineTotal: number;
}

/** So với danh mục hiện tại — chỉ tính cho đơn nháp, dịch vụ từ danh mục. */
export type CatalogStatus = "ok" | "price_changed" | "unavailable";
export type MissingReason = "no_date" | "past_date" | "too_far" | "no_guests";
export interface TripGapDto { serviceId: string; name: string; reasons: MissingReason[] }
export interface CatalogChangeDto { serviceIndex: number; catalogCode: string; pax: PaxCode; seen: number; current: number }

/** Thông tin chuyến của một dịch vụ (ngày YYYY-MM-DD, giờ HH:MM theo giờ Việt Nam). */
export interface TripInfoDto {
  departDate: string | null;
  departTime: string | null;
  pickupTime: string | null;
  pickupPlace: string | null;
  /** null = cùng ngày khởi hành. */
  checkinDate: string | null;
  checkinTime: string | null;
  checkinPlace: string | null;
  note: string | null;
}

/**
 * Một dịch vụ trong chi tiết đơn. Từ ADR-0047 (phát hành 1): `pickupTime`/`pickupPlace` (kế thừa từ `TripInfoDto`) là DẪN XUẤT của chặng chiều đi đầu
 * (`chieuDiDau`, src/shared/chang-dua-don.ts — nơi = tên điểm danh mục hoặc chữ), không còn đọc từ cột cũ; `legs` = mọi chặng CÒN HIỆU LỰC.
 */
export interface OrderServiceDto extends TripInfoDto {
  id: string;
  kind: "catalog" | "manual";
  catalogCode: string | null;
  name: string;
  /** Chuỗi đơn vị của Sheet lúc lập đơn; "manual" = nhập tay. */
  unit: string;
  pax: PaxCounts;
  items: OrderItemDto[];
  catalogStatus: CatalogStatus | null;
  /** Chặng đưa đón còn hiệu lực (ADR-0047 A1), xếp theo ngày, giờ đón, chiều. Rỗng = không có hẹn đón. */
  legs: LegDto[];
}

export interface OrderDto {
  id: string;
  orderCode: string;
  staffId: string;
  staffName: string;
  /** Hồ sơ người đặt (N2 lát 1, ADR-0011); null = chưa gắn (đơn cũ hoặc bỏ qua). */
  bookerPartyId: string | null;
  /** Nhãn hồ sơ người đặt (view `v_pty_party_label`); null khi chưa gắn. */
  bookerName: string | null;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerNote: string | null;
  subtotal: number;
  discount: number;
  /** Tổng khách phải trả HIỆN HÀNH (sau điều chỉnh). Ba cột cọc cũ KHÔNG còn trong DTO (ADR-0026 đ9): "đã thu / còn lại" lấy qua route của billing. */
  total: number;
  paymentNote: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  /** Mốc "Đã giao – đã thu đủ" (ADR-0024 đ3) — có ⇒ đơn bị khoá. Nhãn hiển thị suy ra (`nhanTrangThaiDon`, src/shared/trang-thai-don.ts). */
  deliveredAt: string | null;
  /** Mốc "Hoàn thành" (Kế toán). */
  completedAt: string | null;
}

export interface OrderDetailDto extends OrderDto {
  services: OrderServiceDto[];
}

/** Thông tin chuyến rút gọn cho thẻ trong danh sách đơn — lấy từ dịch vụ ĐẦU TIÊN theo sort_order của đơn (không gộp nhiều dịch vụ). */
export interface OrderSummaryTripDto {
  departDate: string | null;
  pickupTime: string | null;
  pickupPlace: string | null;
}

export type OrderSummaryDto = Pick<
  OrderDto,
  "id" | "orderCode" | "status" | "customerName" | "customerPhone" | "customerNote" | "total" | "staffName" | "createdAt" | "deliveredAt" | "completedAt"
> & {
  /** Tên các dịch vụ theo đúng thứ tự trong đơn (sort_order) — client tự quyết hiện đầu + "+N dịch vụ" hay liệt kê hết (§7 mục 3). */
  serviceNames: string[];
  /** Tổng số khách theo loại, CỘNG DỒN mọi dịch vụ của đơn. */
  pax: PaxCounts;
  /** Của dịch vụ ĐẦU TIÊN (sort_order nhỏ nhất); mọi trường null nếu đơn chưa có dịch vụ nào. */
  trip: OrderSummaryTripDto;
  /**
   * ADR-0060 A-12: nhãn "Đã nhập phần mềm kế toán" trên thẻ. CHỈ có (true) khi dấu hiện tại là đã nhập VÀ người xem qua ô `accounting.entry.view` với đơn
   * đó; mọi trường hợp khác VẮNG khoá (không gửi false — người không được xem không suy ra được gì).
   */
  nhapKeToan?: true;
};

/** Thông tin chuyến client gửi lên: "" = chưa có. */
export interface TripInput {
  departDate: string;
  departTime: string;
  pickupTime: string;
  pickupPlace: string;
  checkinDate: string;
  checkinTime: string;
  checkinPlace: string;
  note: string;
}

/**
 * Một dịch vụ trong đơn. `catalog`: chỉ gửi mã + số khách + đơn giá thực tế; dòng tiền do MÁY CHỦ sinh (không nhận số lượng từ client).
 * `id` = dịch vụ đã lưu của chính đơn này (giữ bản chụp nếu mã và số khách không đổi).
 */
export type ServiceInput = {
  id?: string;
  pax: PaxCounts;
  /**
   * Chặng đưa đón của dịch vụ (ADR-0047 A1). CÓ khoá (kể cả `[]`) = danh sách mới, thay hẳn chặng đang lưu (đơn nháp). VẮNG = giữ chặng đang lưu, trộn
   * `pickupTime`/`pickupPlace` cũ vào chặng chiều đi đầu (tương thích phát hành 1 — R2b; máy chưa tải bản mới).
   */
  legs?: LegInput[];
} & TripInput &
  (
    | {
        kind: "catalog";
        catalogCode: string;
        /** Đơn giá thực tế từng loại có khách (mặc định giao diện = giá danh mục); vắng = giá danh mục. */
        unitPrices: Partial<Record<PaxCode, number>>;
        /** Giá danh mục mà form đang hiển thị; lệch giá hiện tại → 409 `catalog_changed`. */
        catalogPriceSeen: Partial<Record<PaxCode, number>>;
      }
    | { kind: "manual"; name: string; items: { description: string; detail: string; quantity: number; unitPrice: number }[] }
  );

/** Dữ liệu client gửi lên khi tạo/sửa đơn: chỉ các trường nhập, KHÔNG có số dẫn xuất — server tự tính (§2.3). */
export interface OrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNote: string;
  services: ServiceInput[];
  discount: number;
  paymentNote: string;
  /** Gắn hồ sơ có sẵn (id `pty_party`, chỉ cá nhân đang hoạt động); null/vắng = không gắn. Không gửi kèm `newBooker`. */
  bookerPartyId?: string | null;
  /** Tạo hồ sơ cá nhân mới + vai CUSTOMER cùng lúc lưu đơn (ADR-0011 điều 1). Không gửi kèm `bookerPartyId`. */
  newBooker?: { fullName: string; phone: string } | null;
  /**
   * Danh sách hành khách của đơn NHÁP (ADR-0047 A2, Ruling R1). CÓ khoá (kể cả `[]`) = danh sách mới, thay hẳn danh sách đang lưu; VẮNG = giữ danh sách
   * đang lưu (máy chưa tải bản mới không xoá mất tên khách). Có khoá thì máy chủ hỏi thêm ô `order.passenger.write`.
   */
  passengers?: PassengerInput[];
  /** Bắt buộc khi sửa (PUT): `updatedAt` của đơn mà form đã đọc — lệch → 409 `stale`. */
  expectedUpdatedAt?: string;
  /**
   * CHỈ khi lập (POST /api/orders; PUT bỏ qua): người phụ trách người lập chọn ngay trong form (mã tài khoản — ADR-0030 S20-4). Vắng/`null` = không chọn
   * (đơn "Chờ nhận"). Người gọi không có `dispatch.assign` trên đơn của mình → 403; người được chọn không đủ điều kiện → 400 `invalid_assignee`, không tạo đơn.
   */
  handlerStaffId?: string | null;
}

// ---- Chặng đưa đón + hành khách (ADR-0047) ---------------------------------------------------------------------------------------------------

/** Chiều của chặng đưa đón (tập đóng, ADR-0047 A1): chiều đi / chiều về. Không lộ mã ra người dùng — nhãn ở `CHIEU_LABEL` (src/shared/chang-dua-don.ts). */
export type LegDirection = "OUT" | "RETURN";

/**
 * Một chặng client gửi lên (thân `POST/PUT /api/orders` trong `services[].legs`, hoặc `POST /api/orders/:id/legs`). `""` = chưa có. Nơi đón: ĐÚNG MỘT trong
 * `pickupLocationId` (điểm danh mục đang dùng) / `pickupPlace` (chữ tự do); nơi trả: TỐI ĐA MỘT. `id` = chặng đã lưu của chính dịch vụ này (lưu nháp giữ id).
 */
export interface LegInput {
  id?: string;
  direction: LegDirection;
  pickupDate: string;
  pickupTime: string;
  pickupLocationId: string | null;
  pickupPlace: string;
  dropoffLocationId: string | null;
  dropoffPlace: string;
  /**
   * Số hiệu chuyến bay (ADR-0055 VK2-C): máy chủ bỏ khoảng trắng + chữ HOA, khuôn `^[A-Z0-9]{2}[0-9]{1,4}[A-Z]?$`; `""` = xoá. VẮNG khoá = GIỮ giá trị đang lưu
   * (lưu nháp, sửa chặng). Ghi theo ô của route chứa chặng (nháp `order.modify`, sau xác nhận `order.trip.edit`); không xét mốc 6 giờ.
   */
  flightCode?: string;
  /**
   * Số người RIÊNG của chặng VỀ (ADR-0054 D10.3): số nguyên ≥ 1, ≤ số khách hiệu lực của dịch vụ (L-R1); `null` = theo số khách dịch vụ. Chỉ chặng `RETURN`.
   * Chỉ văn phòng ghi (`order.trip.edit`) — lưu nháp gửi giá trị KHÁC bản đang lưu mà không có ô → 403; VẮNG khoá = giữ. Không xét mốc 6 giờ.
   */
  paxOverride?: number | null;
}
/** `PUT /api/orders/:id/legs/:legId` — sửa trường vận hành của chặng (không đổi chiều, không đổi dịch vụ). */
export type LegEditInput = Omit<LegInput, "id" | "direction">;

/** Một chặng CÒN HIỆU LỰC trả về trong chi tiết đơn. `pickupLabel`/`dropoffLabel` = tên điểm danh mục hoặc chữ tự do (null = nơi trả chưa chốt). */
export interface LegDto {
  id: string;
  direction: LegDirection;
  pickupDate: string | null;
  pickupTime: string | null;
  pickupLocationId: string | null;
  pickupPlace: string | null;
  pickupLabel: string;
  dropoffLocationId: string | null;
  dropoffPlace: string | null;
  dropoffLabel: string | null;
  updatedAt: string;
  /** Số hiệu chuyến bay (ADR-0055 VK2-C C3 — ai xem được chặng thì thấy); null = chưa có. */
  flightCode: string | null;
  /** Số người riêng của chặng VỀ (ADR-0054 D10.3); null = theo số khách dịch vụ. */
  paxOverride: number | null;
  /**
   * Dấu ĐẶT GẤP của chặng (ADR-0049 D2; chủ H4 / N-14, 29/9): `null` = chặng không đặt gấp. Văn phòng (ô `order.leg.short_notice.view`) nhận ĐỦ
   * (`DatGapDayDuDto`); Đối tác, HDV, Thực tập CHỈ nhận cờ `{ daDuyet: true }` — khoá lý do, người, lúc, ghi chú VẮNG MẶT.
   */
  datGap: DatGapDto | null;
}
/** Cờ "đặt gấp — Quản trị đã duyệt" (mã không có ô xem đủ). */
export interface DatGapCoDto { daDuyet: true }
/** Dấu đặt gấp ĐỦ (văn phòng): mã + nhãn lý do, TÊN HIỂN THỊ người duyệt (không SĐT; null = tài khoản không còn hồ sơ), lúc duyệt (ISO UTC), ghi chú đã che số. */
export interface DatGapDayDuDto { daDuyet: true; lyDo: string; lyDoNhan: string; nguoiDuyet: string | null; luc: string; ghiChu: string | null }
export type DatGapDto = DatGapCoDto | DatGapDayDuDto;

/** Hành khách client gửi lên (thân `POST/PUT /api/orders` khoá `passengers`, hoặc `them`/`sua` của `POST /api/orders/:id/passengers`). */
export interface PassengerInput {
  /** Lưu nháp: `rowId` của dòng đã lưu (giữ id). Sau xác nhận (`sua`): dùng `personKey`. */
  id?: string;
  fullName: string;
  birthYear: number;
  paxCode: PaxCode | null;
}
/** Một người trong danh sách hiện hành (dòng chưa huỷ, không có dòng thay thế chưa huỷ). */
export interface PassengerDto {
  personKey: string;
  rowId: string;
  fullName: string;
  birthYear: number;
  paxCode: PaxCode | null;
  updatedAt: string;
}
/** `GET/POST /api/orders/:id/passengers`. `vuotSoKhach` = số người có tên > số khách hiệu lực của dịch vụ đông nhất (R9) — chỉ là cờ. */
export interface PassengerListResponse {
  passengers: PassengerDto[];
  soNguoiCoTen: number;
  soKhachDoan: number;
  vuotSoKhach: boolean;
  orderUpdatedAt: string;
}
/** `POST /api/orders/:id/passengers` (đơn đã xác nhận): thêm dòng mới, sửa = dòng mới trỏ dòng hiện hành, huỷ = mọi dòng của người đó. */
export interface PassengerChangeInput {
  expectedUpdatedAt: string;
  them: PassengerInput[];
  sua: (PassengerInput & { personKey: string })[];
  huy: string[];
}

/** `PUT /api/orders/:id/trip` — sửa trường vận hành (đơn nháp hoặc đã xác nhận). */
export interface TripUpdateInput {
  expectedUpdatedAt: string;
  services: ({ id: string } & TripInput)[];
}

/** `PUT /api/orders/:id/booker` — đổi khách (hồ sơ người đặt + tên/SĐT chụp trên đơn) của đơn nháp hoặc đã xác nhận (ADR-0011 điều 2). */
export interface BookerChangeInput {
  customerName: string;
  customerPhone: string;
  bookerPartyId?: string | null;
  newBooker?: { fullName: string; phone: string } | null;
  expectedUpdatedAt: string;
}

/** Thân lỗi có thêm dữ liệu: 409 `incomplete_trip` (xác nhận thiếu chuyến) và 409 `catalog_changed` (giá danh mục vừa đổi). */
export interface IncompleteTripBody { error: { code: "incomplete_trip"; message: string; missing: TripGapDto[] } }
export interface CatalogChangedBody { error: { code: "catalog_changed"; message: string; changes: CatalogChangeDto[] } }

export interface OrderListResponse { orders: OrderSummaryDto[]; hasMore: boolean }
/**
 * ADR-0067: một người đã từng lập đơn — cho ô "Người lập" của bộ lọc danh sách đơn (chỉ người xem mọi đơn). DANH SÁCH TRẮNG: mã tài khoản, tên hiển thị
 * (như "Người lập: …" trên thẻ đơn), ngày dân sự giờ Việt Nam của đơn gần nhất (chỉ để phân biệt tên trùng). KHÔNG BAO GIỜ: SĐT, email, trạng thái
 * nghỉ, vai, mã quyền, số đơn, tiền.
 */
export interface NguoiLapDto { id: string; ten: string; ganNhat: string }
export interface NguoiLapResponse { nguoiLap: NguoiLapDto[] }
/** Cảnh báo mốc tối thiểu khi LƯU NHÁP (ADR-0049 I27 — không chặn lưu): chặng có giờ, chưa đặt gấp, dưới mốc. `legKey` = id chặng. */
export interface CanhBaoMocDto { legKey: string; phutConLai: number }
/**
 * `canhBaoMoc`, `mocToiThieuPhut` (ADR-0049 I27, I31) có ở phản hồi LẬP / SỬA NHÁP (`POST/PUT /api/orders`) — màn hình hiện cảnh báo sau lần lưu; vắng ở các
 * route khác. `mocToiThieuPhut` null = nháp không chặng (không hỏi mốc).
 */
export interface OrderResponse { order: OrderDetailDto; canhBaoMoc?: CanhBaoMocDto[]; mocToiThieuPhut?: number | null }
/** `mocToiThieuPhut` (ADR-0049 I31): mốc tối thiểu đang hiệu lực (phút) để biểu mẫu cảnh báo trước khi xác nhận; null = chưa có chính sách. */
export interface OrderDetailResponse { order: OrderDetailDto; history: AuditEntryDto[]; canModify: boolean; mocToiThieuPhut: number | null }
/** 409 xác nhận đơn khi còn chặng dưới mốc chưa đặt gấp (ADR-0049 D2). */
/** `GET /api/orders/moc-toi-thieu` (ruling R-P15): mốc tối thiểu + cảnh báo sát mốc (phút) của chính sách HIỆN HÀNH — chỉ để biểu mẫu đơn chưa lưu hiển thị. */
export interface MocToiThieuResponse { mocToiThieuPhut: number; canhBaoPhut: number }
export interface ShortNoticeRequiredBody { error: { code: "short_notice_required"; message: string; legs: { legId: string; phutConLai: number }[] } }

/** Một dịch vụ trong PHẦN HẸP của hàng chờ nhận (ADR-0030 S23-2) — ĐÚNG bốn khoá này. `pickupPlace` (và `name`) đã che mọi dãy từ 8 chữ số. */
export interface PoolServiceDto {
  name: string;
  pax: PaxCounts;
  pickupPlace: string | null;
  pickupTime: string | null;
}
/**
 * Một đơn trong hàng chờ nhận `GET /api/orders/pool` (ADR-0030 S23-1, S23-2) — PHẦN HẸP, ĐÚNG bốn khoá: không tên/SĐT/email khách, không tiền, không
 * ghi chú, không lịch sử, không người lập. `departDate` = ngày đi (ngày khởi hành lớn nhất; null nếu chưa có ngày). Dựng ở `orders/pool.ts` (danh sách
 * trường được phép); thêm khoá = sửa cả bài khoá `src/modules/orders/pool.test.ts`.
 */
export interface PoolOrderDto {
  orderId: string;
  orderCode: string;
  departDate: string | null;
  services: PoolServiceDto[];
}
/** Đơn chờ nhận: chưa có người phụ trách đang mở, chưa huỷ, chưa qua ngày đi — xếp ngày đi gần nhất trước, chưa có ngày xuống cuối. */
export interface PoolResponse { orders: PoolOrderDto[] }

/**
 * `GET /api/orders/dashboard` (Trang chủ mới, `access: "office"`) — tổng quan cho nhân viên văn phòng.
 * `today`: đơn confirmed mà dịch vụ SỚM NHẤT có ngày đón (bỏ qua dịch vụ không có ngày) rơi đúng hôm nay.
 * `draftCount`: đơn nháp chưa xác nhận.
 * `unassignedCount`: đơn nháp hoặc đã xác nhận (không tính đơn huỷ) chưa có người phụ trách — ADR-0020 điều 7 (M1 = A), ADR-0030 S20-13.
 * `revenueWeek`: doanh thu (tổng `total` hiện hành) của CHÍNH người xem trong tuần `from`..`to` (thứ Hai–Chủ nhật, giờ Việt Nam, hai đầu bao gồm).
 * `revenueWeek.daily`: ĐÚNG 7 phần tử (thứ Hai→Chủ nhật, cùng số hiện hành), ngày không có đơn vẫn có phần tử `total: 0` — dữ liệu cho
 * biểu đồ cột "Doanh thu của tôi" (Đợt D Task 2).
 */
export interface DashboardResponse {
  today: OrderSummaryDto[];
  /** Chuyến đón ngày mai / ngày kia — cùng luật và cùng người xem như `today` (góp ý YC-0007). */
  tomorrow: OrderSummaryDto[];
  dayAfter: OrderSummaryDto[];
  draftCount: number;
  unassignedCount: number;
  revenueWeek: { total: number; count: number; from: string; to: string; daily: { date: string; total: number }[] };
}

// ---- Nhật ký -----------------------------------------------------------------
export interface AuditEntryDto {
  action: AuditAction;
  staffId: string | null;
  staffName: string;
  at: string;
  detail: string | null;
}

export interface AuditRecordDto extends AuditEntryDto {
  id: string;
  targetType: AuditTargetType | null;
  targetId: string | null;
  /** Nhãn dễ đọc của đối tượng: mã đơn, tên nhân viên hoặc mã dịch vụ. */
  targetLabel: string | null;
  /** Có giá trị khi đối tượng là đơn — để giao diện tạo liên kết. */
  orderId: string | null;
}

export interface AuditListResponse { entries: AuditRecordDto[]; hasMore: boolean }

// ---- Danh mục dịch vụ --------------------------------------------------------
/** Dịch vụ như nhân viên bán hàng thấy (giá đã áp ghi đè của Admin). */
export interface CatalogServiceDto extends CatalogService {
  supported: boolean;
  /** ADR-0058 Đ5: nhóm hiện hành; `null` = chưa phân loại HOẶC nhóm đang tắt. */
  groupCode: string | null;
}

/** ADR-0058 Đ5: nhóm cho form đơn — chỉ nhóm đang dùng có ≥ 1 dịch vụ đang hiện, xếp theo thứ tự. */
export interface CatalogGroupDto { code: string; name: string }
/** ADR-0058 Đ4: nhóm như Quản trị thấy (kể cả nhóm tắt); `soDichVu` = số dịch vụ hiện hành; `updatedAt` dùng làm `expectedUpdatedAt` khi sửa. */
export interface CatalogAdminGroupDto extends CatalogGroupDto { sortOrder: number; active: boolean; soDichVu: number; updatedAt: string }

export interface CatalogConflictDto { code: PaxCode; base: number | null; current: number | null; override: number }

export interface CatalogAdminItemDto {
  code: string;
  name: string;
  unit: string;
  supported: boolean;
  inSheet: boolean;
  notes: CatalogService["notes"];
  sheetPrices: Prices;
  prices: Prices;
  hidden: boolean;
  overridden: PaxCode[];
  conflicts: CatalogConflictDto[];
  overrideUpdatedAt: string | null;
  updatedAt: string;
  /** ADR-0058 Đ5: nhóm hiện hành thật (kể cả nhóm đang tắt); `null` = chưa phân loại. */
  groupCode: string | null;
}

export interface CatalogSyncStateDto {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastErrorCode: string | null;
  lastError: string | null;
  itemCount: number | null;
  problems: { row: number; message: string }[];
}

export interface CatalogPublicResponse { items: CatalogServiceDto[]; sync: { lastSuccessAt: string | null; error: string | null }; groups: CatalogGroupDto[] }
export interface CatalogAdminResponse { items: CatalogAdminItemDto[]; sync: CatalogSyncStateDto; groups: CatalogAdminGroupDto[] }
/** `GET /api/catalog/groups` — `chuaPhanLoai` = số dịch vụ của danh mục (kể cả ẩn / đã rời Sheet) không có nhóm hiện hành. */
export interface CatalogGroupsResponse { groups: CatalogAdminGroupDto[]; chuaPhanLoai: number }
/** `POST /api/catalog/groups` (201), `PATCH /api/catalog/groups/:code`. */
export interface CatalogGroupResponse { group: CatalogAdminGroupDto }
/** `PUT /api/catalog/group-assignments` — `doi` số dịch vụ đổi nhóm thật, `boQua` số mã đã ở đúng nhóm (không ghi). */
export interface CatalogGroupAssignResponse { doi: number; boQua: number }
/** `GET /api/catalog/:code/group-history` — mới nhất trước; `createdBy` là id tài khoản (`null` = Hệ thống gieo); `nhom` là tên (`null` = Chưa phân loại). */
export interface CatalogGroupHistoryResponse { items: { luc: string; createdBy: string | null; nhom: string | null }[] }
export interface CatalogItemResponse { item: CatalogAdminItemDto }
export interface CatalogSyncResponse {
  ok: true;
  added: number;
  changed: number;
  hidden: number;
  unchanged: number;
  itemCount: number;
  problems: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
}

// ---- Thông tin công ty (module company) --------------------------------------
/** Hồ sơ công ty hiển thị công khai (màn đăng nhập, xác nhận đơn). Cố ý KHÔNG có số Zalo, đường dẫn logo, người sửa. */
export interface CompanyDto {
  /** Tên pháp lý đúng như trong hồ sơ ("CÔNG TY TNHH TOUR ĐẢO"). */
  name: string;
  taxCode: string;
  address: string;
  hotline: string;
  /** Có thể chưa khai → null. */
  email: string | null;
}

export interface CompanyResponse { company: CompanyDto }

// ---- Người phụ trách đơn (module dispatch; ADR-0006, ADR-0009) ---------------
/** Người phụ trách đang mở của một đơn: người nhận trách nhiệm chăm sóc khách (gọi xác nhận, đón); sửa được đơn như người lập. Chỉ tên, KHÔNG có SĐT. */
export interface HandlerDto {
  partyId: string;
  /** Tài khoản của người đó; null nếu hồ sơ chưa/không còn tài khoản. */
  staffId: string | null;
  name: string;
}

/** `GET /api/dispatch/handlers?orderIds=a,b,c` (tối đa 100 id): mọi id gửi lên đều có mặt; `null` = đơn chưa có người phụ trách (hoặc không có đơn đó). */
export interface HandlersResponse { handlers: Record<string, HandlerDto | null> }

/**
 * Nhân sự có thể được giao phụ trách (`checkAssignee` của dispatch): đang hoạt động, có hồ sơ, không mang quyền Đối tác, và có quyền Bán hàng, Quản trị
 * (kể cả Toàn quyền) hoặc Hướng dẫn viên (cấp hẹp — ADR-0014 điều 6, ADR-0030). Chỉ tên, KHÔNG có SĐT.
 */
export interface AssigneeDto {
  staffId: string;
  partyId: string;
  name: string;
  /**
   * Nhãn nhóm HIỂN THỊ để bảng chọn gom người ("Hướng dẫn viên" / "Bán hàng" / "Quản trị" — Task 1.8 phần b ADR-0030), máy chủ tính bằng
   * `assigneeRoleLabel` (`src/shared/assignee-pick.ts`): một nhãn cho mỗi người, ưu tiên Hướng dẫn viên > Quản trị > Bán hàng. KHÔNG phải luật quyền.
   */
  roleLabel: string;
}
export interface AssigneesResponse { assignees: AssigneeDto[] }

/** `PUT /api/orders/:id/handler` — đặt/đổi người phụ trách (hoặc tự nhận khi đơn chưa có người: `staffId` = chính mình). */
export interface SetHandlerInput { staffId: string }
export interface SetHandlerResponse { handler: HandlerDto }
export interface HandlerCancelResponse { ok: true }
export interface HandlerMoneyEditResponse { ok: true }

/**
 * Màn "việc của tôi" (`GET /api/dispatch/mine`, module dispatch — ADR-0014 điều 6/11, ADR-0030 S23-8). Viết ĐỘC LẬP, KHÔNG `Pick`/`Omit` từ
 * `OrderDto`/`OrderServiceDto`/`OrderItemDto` — mỗi trường ở đây là một quyết định có chủ ý, một lần đổi kiểu dữ liệu đơn sau này không được tự lọt
 * thêm trường nào (giá từng dòng, giảm giá, ghi chú thanh toán… vẫn KHÔNG có). Từ Task 1.8 (chủ dự án quyết 2026-09-27: HDV cần biết còn thu bao
 * nhiêu) có ĐÚNG ba trường tiền cấp đơn — `total`, `depositAmount`, `remainingAmount` — số HIỆN HÀNH sau điều chỉnh (ADR-0017 điều 5), dựa trên ô
 * `money.view` phạm vi `assigned` đã cấp cho HDV (ADR-0017, thu hẹp ở ADR-0030 S23-5); route hỏi ô đó (ADR-0019 điều 2). Không có bảng giá, không
 * có tiền từng dịch vụ.
 */
export interface MyAssignmentServiceDto extends TripInfoDto {
  id: string;
  name: string;
  /** null = nhập tay — CHỈ ĐỌC ở màn này (route handler-money-edit chỉ nhận dịch vụ từ danh mục). */
  catalogCode: string | null;
  pax: PaxCounts;
  /** Loại khách sửa được cho dịch vụ này (rỗng nếu nhập tay hoặc thiếu giá đã chụp) — KHÔNG lộ giá, chỉ nói được sửa loại nào. */
  editablePaxCodes: PaxCode[];
}
export interface MyAssignmentDto {
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  /** Từ bản 1.6: đơn NHÁP cũng có trong danh sách (không chỉ đã xác nhận) — giao diện dùng `status` để ẩn nút huỷ/sửa số khách (`myJobActions`). */
  status: OrderStatus;
  /** Tổng tiền của đơn (VNĐ), số hiện hành sau điều chỉnh số khách — cùng số với `OrderDto.total` của chi tiết đơn. "Đã thu / còn thu" lấy qua
   *  `POST /api/ledger/balances` (billing — ADR-0026 đ9), không nằm ở đây. */
  total: number;
  services: MyAssignmentServiceDto[];
}
export interface MyAssignmentsResponse { assignments: MyAssignmentDto[] }

// ---- Địa điểm (module locations) ---------------------------------------------
export interface LocationTypeDto {
  code: string;
  name: string;
}

export interface LocationDto {
  id: string;
  code: string;
  name: string;
  locationTypeCode: string;
  locationTypeName: string;
  address: string | null;
  sortOrder: number;
  active: boolean;
  /** Mốc cập nhật cuối — gửi lại làm `expectedUpdatedAt` khi sửa (khoá lạc quan). */
  updatedAt: string;
}

export interface LocationListResponse { locations: LocationDto[]; types: LocationTypeDto[] }
export interface LocationResponse { location: LocationDto }

// ---- Hồ sơ (module parties) --------------------------------------------------
export type PartyKind = "PERSON" | "ORGANIZATION";

export interface ContactPointDto {
  id: string;
  kind: "PHONE" | "EMAIL";
  value: string;
  label: string | null;
  isPrimary: boolean;
  /** Ngày dân sự giờ Việt Nam (YYYY-MM-DD). `validTo` null = còn hiệu lực. */
  validFrom: string;
  validTo: string | null;
}

export interface PartyRoleDto {
  id: string;
  roleTypeCode: string;
  roleName: string;
  locationId: string | null;
  locationName: string | null;
  validFrom: string;
  validTo: string | null;
}

export interface PartyRelationshipDto {
  id: string;
  typeCode: string;
  typeName: string;
  fromPartyId: string;
  fromPartyName: string;
  toPartyId: string;
  toPartyName: string;
  validFrom: string;
  validTo: string | null;
}

export interface PartyListItemDto {
  id: string;
  kind: PartyKind;
  displayName: string;
  active: boolean;
  primaryPhone: string | null;
  /** Mã vai trò đang hiệu lực hôm nay (giờ VN). */
  roleCodes: string[];
}

export interface PartyDto extends PartyListItemDto {
  familyName: string | null;
  middleName: string | null;
  givenName: string | null;
  legalName: string | null;
  taxCode: string | null;
  address: string | null;
  invoiceEmail: string | null;
  contacts: ContactPointDto[];
  roles: PartyRoleDto[];
  relationships: PartyRelationshipDto[];
  createdAt: string;
  /** Mốc cập nhật cuối — gửi lại làm `expectedUpdatedAt` khi sửa (khoá lạc quan). */
  updatedAt: string;
  /** ADR-0013 điều 6: hồ sơ gắn một tài khoản (kể cả tài khoản đang ngưng). Không kèm id/quyền của tài khoản. */
  accountLinked: boolean;
  /** ADR-0013 điều 6: NGƯỜI ĐANG XEM sửa được tên/liên hệ của hồ sơ này (máy chủ tính). Chỉ để ẩn/hiện nút; máy chủ vẫn chặn. */
  editable: boolean;
  /** ADR-0068: hồ sơ này đã gộp vào hồ sơ nào (null = chưa gộp). Hồ sơ đã gộp chỉ đọc (`editable` = false). */
  mergedInto: PartyMergeRef | null;
  /** ADR-0068: các hồ sơ đã gộp VÀO hồ sơ này. */
  mergedFrom: PartyMergeRef[];
}

export interface PartyListResponse { parties: PartyListItemDto[]; hasMore: boolean }
export interface PartyLookupResponse { matches: PartyListItemDto[] }
export interface PartyResponse { party: PartyDto }
export interface PartyMetaResponse {
  /** MỌI loại vai (cả vai đã ngưng — để hiện đúng tên); `group` OTHER là vai gán được ở trang Danh bạ (/parties), INTERNAL/EXTERNAL chỉ gán ở màn Quản lý tài khoản (/staff) (ADR-0018). */
  roleTypes: { code: string; name: string; group: "INTERNAL" | "EXTERNAL" | "OTHER"; active: boolean }[];
  relationshipTypes: { code: string; name: string }[];
}

// ---- Gộp hồ sơ cá nhân (ADR-0068) — liên hệ chỉ hiện cho người giữ admin.manage (vốn thấy liên hệ ở Danh bạ); KHÔNG BAO GIỜ số giấy tờ. ----
export interface PartyMergeRef { id: string; displayName: string; mergedAt: string }
export type MergeItemKind = "LIEN_HE" | "CONG_VIEC" | "QUAN_HE" | "GIAY_TO";
export interface MergeItemDto { loai: MergeItemKind; nhan: string; ghiChu: string | null }
export interface MergePreviewResponse {
  source: { id: string; displayName: string };
  target: { id: string; displayName: string };
  /** Lý do chặn (rỗng = gộp được). `message` tiếng Việt để hiện thẳng. */
  chan: { code: string; message: string }[];
  chuyen: MergeItemDto[];
  giu: MergeItemDto[];
  bo: MergeItemDto[];
  /** Số đơn đổi người đặt sang hồ sơ chính (nháp + đã xác nhận chưa giao). */
  donDoi: number;
  /** Số đơn giữ ở hồ sơ phụ (đã giao + đã huỷ). */
  donGiu: number;
  /** Số dòng công nợ còn hiệu lực giữ ở hồ sơ phụ (sổ "theo người" của hồ sơ chính không thấy). */
  dongNoGiu: number;
}
export type LyDoKhopDto = "PHONE" | "NAME" | "LOGIN_PHONE";
export interface PartyDuplicatePairDto { a: PartyListItemDto; b: PartyListItemDto; lyDo: LyDoKhopDto[]; aCoTaiKhoan: boolean; bCoTaiKhoan: boolean }
export interface PartyDuplicatesResponse { pairs: PartyDuplicatePairDto[]; conNua: boolean }
/** Hồ sơ cá nhân khớp khi Thêm tài khoản (ADR-0068 Đ9) — không SĐT của hồ sơ. */
/** `vaiTaiKhoan`: mã các vai tài khoản (ROLE_CODES) hồ sơ đang mở — để form Thêm tài khoản chọn sẵn (Ruling R26) mà không phải đọc hồ sơ qua Danh bạ (Hành chính
 * nhân sự không xem Danh bạ, ADR-0071). Cùng thông tin với `vai` (tên), chỉ ở dạng mã. */
export interface PartyMatchDto { id: string; displayName: string; lyDo: ("PHONE" | "NAME")[]; vai: string[]; vaiTaiKhoan: RoleCode[]; coTaiKhoan: boolean }
/** ADR-0071 điều 3b: `coHoSoKhacTrongDanhBa` = có hồ sơ trùng mà người gọi không được thấy (không xem Danh bạ — Hành chính nhân sự): khách, hồ sơ không vai tài
 * khoản. Không kèm id, tên, vai. Người xem được Danh bạ thấy mọi hồ sơ trùng trong `khop` nên cờ luôn false. */
export interface PartyMatchResponse { khop: PartyMatchDto[]; coHoSoKhacTrongDanhBa: boolean }

// ---- Giấy tờ của người (ADR-0040 D2; module parties) — số LUÔN che ở mọi DTO dưới đây; số đầy đủ CHỈ có ở PersonDocumentRevealResponse. ----
export interface PersonDocumentDto {
  id: string;
  typeCode: string;
  typeName: string;
  classCode: string | null;
  className: string | null;
  /** "••••6789" (4 ký tự cuối của số đã chuẩn hoá; số ngắn hơn 8 ký tự → "••••"); null = giấy không có số. */
  maskedNumber: string | null;
  issuedDate: string | null;
  issuedPlace: string | null;
  /** null = không hạn. */
  expiryDate: string | null;
  /** Số ngày còn lại tới ngày hết hạn (giờ VN); null = không hạn; âm = đã quá hạn. */
  daysLeft: number | null;
  /** Dòng này GIA HẠN dòng nào (giao diện gom "Lịch sử (N)" theo chuỗi này). */
  previousId: string | null;
  /** Chưa huỷ và không có dòng gia hạn còn hiệu lực — chỉ dòng hiện hành gia hạn / sửa sai được. */
  current: boolean;
  voided: boolean;
  /** Khoá lạc quan của sửa sai (`expectedUpdatedAt`). */
  updatedAt: string;
}
export interface PersonDocumentListResponse { documents: PersonDocumentDto[] }
/** Chỉ ở POST /api/parties/:id/documents/:did/reveal ("Xem đủ số", ô party.document.reveal; mỗi lần một dòng nhật ký KHÔNG kèm số). */
export interface PersonDocumentRevealResponse { number: string }
export interface DocumentTypeDto { code: string; name: string; hasExpiry: boolean; sortOrder: number; active: boolean; updatedAt: string }
export interface LicenseClassDto { code: string; name: string; sortOrder: number; active: boolean; updatedAt: string }
export interface PersonDocumentMetaResponse { types: DocumentTypeDto[]; classes: LicenseClassDto[] }
/** Thân POST /api/parties/:id/documents. */
export interface PersonDocumentAddRequest {
  typeCode: string;
  number?: string | null;
  classCode?: string | null;
  issuedDate?: string | null;
  issuedPlace?: string | null;
  expiryDate?: string | null;
}
/** Thân POST …/documents/:did/renew — KHÔNG gửi `number` (hoặc null) thì máy chủ chép số của dòng trước; không gửi `classCode` thì chép hạng. */
export type PersonDocumentRenewRequest = Omit<PersonDocumentAddRequest, "typeCode">;
/** Thân POST …/documents/:did/correct (người) và …/giay-to/:did/sua-sai (xe) — `reason` thuộc LY_DO_SUA_SAI; `value` của đúng trường; NHAP_NHAM_DONG không gửi `value`. */
export interface DocumentCorrectRequest { reason: LyDoSuaSai; value?: string | null; expectedUpdatedAt: string }

// ---- Vận chuyển (ADR-0040 D1; module van-chuyen) ----
export type VehicleStatus = "active" | "maintenance" | "retired";
export interface VehicleDto {
  id: string;
  plateNumber: string;
  chassisNumber: string | null;
  name: string;
  modelYear: number | null;
  /** Số người được chở KHÔNG kể tài xế (giấy cũ ghi 16 chỗ thì là 15). */
  passengerCapacity: number;
  status: VehicleStatus;
  validFrom: string;
  /** Ngày ngừng dùng; null = chưa ngừng. */
  validTo: string | null;
  /** Giấy tờ xe hiện hành gần hạn nhất theo ngưỡng đang hiệu lực: "expired" đã hết, "soon" sắp hết, "none" không có (xe đã ngừng: luôn "none"). */
  alert: "none" | "soon" | "expired";
  /** Tên loại giấy gần hạn nhất và số ngày còn lại (âm = đã quá) — null khi `alert` = "none". */
  alertTypeName: string | null;
  alertDaysLeft: number | null;
  /** Số giấy hiện hành đã hết + sắp hết hạn (bản vẽ màn 01: "… · 2 giấy sắp hết hạn"). */
  alertCount: number;
  updatedAt: string;
  /** ADR-0048 D1: chủ xe — hồ sơ công ty chủ hoặc hồ sơ nhà xe đối tác. */
  ownerPartyId: string;
  /** Tên hiển thị của chủ xe (không liên hệ, không MST). */
  ownerName: string;
  /** Chủ xe là công ty chủ HIỆN TẠI (false = nhà xe, hoặc công ty chủ cũ sau khi đổi công ty chủ). */
  ownerIsCompany: boolean;
}
export interface VehicleDocumentDto {
  id: string;
  typeCode: string;
  typeName: string;
  /** Giấy tờ XE: số đầy đủ (không phải dữ liệu cá nhân — giả định G4); nhật ký vẫn không ghi số. */
  number: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  daysLeft: number | null;
  previousId: string | null;
  current: boolean;
  voided: boolean;
  updatedAt: string;
}
export interface VehicleListResponse { vehicles: VehicleDto[] }
export interface VehicleResponse { vehicle: VehicleDto; documents: VehicleDocumentDto[] }
/** Thân POST /api/van-chuyen/xe (thêm) — số khung bắt buộc ở máy chủ (Ruling R9). `status` mặc định "active" (xe mới không "retired"). */
export interface VehicleCreateRequest {
  plateNumber: string;
  chassisNumber: string;
  name: string;
  modelYear?: number | null;
  passengerCapacity: number;
  status?: "active" | "maintenance";
  validFrom?: string;
  /** ADR-0048 D1: chủ xe — vắng = công ty chủ; khác thì phải là hồ sơ nhà xe đang hợp tác (409 vehicle_owner_not_carrier). */
  ownerPartyId?: string;
}
/** GET /api/van-chuyen/meta — danh mục loại giấy tờ xe (cả loại đã ngưng, để hiện đúng tên dòng cũ) + ngưỡng "sắp hết hạn" đang hiệu lực (số ngày). */
export interface VanChuyenMetaResponse { documentTypes: DocumentTypeDto[]; warnDays: number }
/** Một dòng "giấy tờ sắp hết hạn" (xe hoặc tài xế) — KHÔNG có số giấy tờ (ADR-0040 D1, D2). */
export interface ExpiringItemDto {
  kind: "vehicle" | "person";
  /** id xe hoặc id hồ sơ người (bấm dòng mở chi tiết xe / hồ sơ ở Danh bạ). */
  targetId: string;
  /** Xe: "biển số · tên xe"; người: tên hiển thị. */
  label: string;
  typeName: string;
  className: string | null;
  expiryDate: string;
  daysLeft: number;
  level: "soon" | "expired";
  /** ADR-0048 D1: tên nhà xe (xe của nhà xe; tài xế đối tác: tên các nhà xe nối ", "); null = của công ty chủ hiện tại / tài xế công ty. Chỉ tên. */
  ownerLabel: string | null;
}
/** GET /api/van-chuyen/sap-het-han — `count` = số dòng (đã hết + sắp hết) cho huy hiệu trên menu (R15 điểm 2). */
export interface ExpiringListResponse { warnDays: number; count: number; items: ExpiringItemDto[] }
/** ADR-0048 D1: một nhà xe đang hợp tác — tên, loại hồ sơ, số xe CHƯA NGỪNG, số tài xế "thuộc". Không liên hệ, không MST. */
export interface CarrierDto { partyId: string; name: string; kind: "PERSON" | "ORGANIZATION"; vehicleCount: number; driverCount: number }
/** GET /api/van-chuyen/nha-xe — công ty chủ (null nếu chưa có) + nhà xe đang hợp tác, xếp theo tên. */
export interface CarrierListResponse { ownerCompany: { partyId: string; name: string } | null; carriers: CarrierDto[] }
/** Thân PUT /api/van-chuyen/xe/:id — đủ trường + khoá lạc quan. "Ngừng dùng" = status "retired"; "Dùng lại xe" = status "active"/"maintenance" (R15). */
export interface VehicleUpdateRequest {
  plateNumber: string;
  chassisNumber: string;
  name: string;
  modelYear: number | null;
  passengerCapacity: number;
  status: VehicleStatus;
  expectedUpdatedAt: string;
  /** ADR-0048 D1, Q1 = (a): sửa chủ xe khi nhập nhầm — vắng = giữ chủ; khác chủ hiện tại thì phải là công ty chủ / nhà xe đang hợp tác (409 vehicle_owner_not_carrier). */
  ownerPartyId?: string;
}

// ---- Góp ý / Báo lỗi (module feedback) ----
export interface FeedbackContextDto {
  path?: string;
  orderCode?: string;
  device?: string;
  standalone?: boolean;
  appVersion?: string;
}

export interface FeedbackCreateInput {
  kind: FeedbackKind;
  title: string;
  body: string;
  /** UUID sinh một lần khi mở form; gửi lại cùng mã thì trả yêu cầu cũ (chống trùng khi mạng yếu). */
  clientRequestId: string;
  context?: FeedbackContextDto;
}

export interface FeedbackTicketDto {
  id: string;
  /** Mã người đọc, vd YC-0007. */
  code: string;
  kind: FeedbackKind;
  kindName: string;
  status: FeedbackStatus;
  statusName: string;
  title: string;
  context: FeedbackContextDto;
  submitterId: string;
  submitterName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  resolvedIn: string | null;
  lastActivityAt: string;
  lastPublicReplyAt: string | null;
  createdAt: string;
  /** Có gì mới người xem chưa đọc (chấm đỏ). */
  unread: boolean;
  /** Chỉ admin thấy: true = email báo admin chưa gửi được. */
  mailPending: boolean;
}

export interface FeedbackMessageDto {
  id: string;
  authorId: string;
  authorName: string | null;
  body: string;
  internal: boolean;
  createdAt: string;
  mine: boolean;
}

export interface FeedbackStatRow {
  /** Tuần theo strftime('%Y-%W') của created_at. */
  week: string;
  kind: FeedbackKind;
  status: FeedbackStatus;
  count: number;
}

export interface FeedbackListResponse {
  tickets: FeedbackTicketDto[];
}
export interface FeedbackQueueResponse extends FeedbackListResponse {
  stats: FeedbackStatRow[];
}
export interface FeedbackDetailResponse {
  ticket: FeedbackTicketDto;
  messages: FeedbackMessageDto[];
  canTriage: boolean;
}
export interface FeedbackBadgeResponse {
  /** Số yêu cầu CỦA TÔI có phản hồi mới. */
  mine: number;
  /** Số yêu cầu chờ admin (0 với người không phải admin). */
  queue: number;
}

// ---- Thông báo hệ thống (ADR-0034) --------------------------------------------
export type LoaiTin = "thu_cong" | "lap" | "cho_nhan" | "nhan" | "giao" | "xac_nhan" | "huy";
export interface TinDto {
  id: string;
  loai: LoaiTin;
  /** Câu đã dựng ở máy chủ (tin về đơn) hoặc tiêu đề (tin thủ công). Không chứa tên người làm nếu người xem không được xem lịch sử đơn. */
  cau: string;
  maDon: string | null;
  noiDung: string | null; // chỉ tin thủ công
  nguoiGui: string | null; // chỉ tin thủ công
  /** Nhãn tiếng Việt "Gửi cho" (K3): "Toàn công ty" cho `noi-bo`, tên (các) nhóm quyền cho tin gửi theo nhóm; chỉ tin thủ công, `null` cho tin về đơn. */
  nhomNhan: string | null;
  quanTrong: boolean;
  daHieuLuc: string | null; // tin quan trọng: lúc người xem bấm Đã hiểu
  lienKet: string | null; // tin về đơn
  luc: string; // ISO UTC
  cuaToi: boolean;
  chuaDoc: boolean;
  mo: boolean; // tin chờ nhận đã có người nhận (X2)
}
// quanTrongChuaHieu: tin quan trọng CHƯA "Đã hiểu" của ngăn "Của tôi", tính trên tập ĐÃ LỌC QUYỀN TRƯỚC KHI CẮT TRẦN TOI_DA_TIN — không bị
// ghim mất khi hộp có > 100 tin mới hơn (X4 đứng trên trần; sửa vòng kiểm Task 5→6, một nguồn luật ở locHopThongBao).
export interface HopThongBaoResponse { tin: TinDto[]; soChuaDoc: number; quanTrongChuaHieu: TinDto[] }
export interface TomTatThongBaoResponse { soChuaDoc: number; quanTrongChuaHieu: { id: string; tieuDe: string; nguoiGui: string; luc: string }[] }
export type NguoiNhanTin = "noi-bo" | PermissionCode[];
export interface GuiThongBaoRequest { tieuDe: string; noiDung: string; nguoiNhan: NguoiNhanTin; quanTrong: boolean; clientRequestId: string }
export interface TinDaGuiDto { id: string; tieuDe: string; nguoiNhan: NguoiNhanTin; quanTrong: boolean; luc: string; thuHoiLuc: string | null; soNguoiNhan: number; soDaHieu: number }
export interface DaGuiResponse { tin: TinDaGuiDto[] }
export interface NguoiDaHieuResponse { daHieu: { ten: string; quyen: string; luc: string }[]; chuaHieu: { ten: string; quyen: string }[] }

// ---- Thông báo màn hình khoá / Web Push (ADR-0036) -----------------------------
// `mayNay`: chỉ đúng khi tham số truy vấn `endpoint` khớp MỘT dòng đang bật CỦA CHÍNH staff gọi route (I-2, vòng rà 2026-09-28)
// — không hỏi thì luôn `false`; không lộ máy của người khác (tự lọc theo `staff.id` ở máy chủ, không nhận staff id từ ngoài).
export interface MayThongBaoResponse { khoa: string | null; soMay: number; mayNay: boolean }
// `imLang` (ADR-0039): đang giờ yên lặng (22:00–06:00 VN) VÀ tin không quan trọng — service worker hiện `silent: true` (không rung/kêu).
export interface MoiNhatResponse { tin: { cau: string; lienKet: string | null } | null; imLang: boolean }

// ---- Chính sách điều phối xe (ADR-0049 D2, lát 1.1; module van-chuyen) -------------------------------------------------------------------------------------
// Dòng có ngày hiệu lực, CHỈ THÊM: máy chủ đặt `validFrom` = lúc lưu (thân yêu cầu KHÔNG gửi ngày hiệu lực — I28). `current` = dòng đang hiệu lực.
export interface DispatchPolicyDto {
  id: string;
  /** Mốc tối thiểu (phút) — một con số cho cả lúc đặt và lúc xếp; luôn > 0 (không tắt được — chủ trả lời lần 9). */
  minLeadMinutes: number;
  warnLeadMinutes: number;
  restMinutes: number;
  requireManifest: boolean;
  /** Luôn false: khoá ở CSDL tới khi có ADR hợp đồng (ĐP7). */
  requireContract: boolean;
  /** ADR-0050 VK1-A: kẹp lùi tối đa (phút) khi văn phòng bấm thay khai giờ xảy ra (1…1440; gieo 180). */
  proxyBackdateMaxMinutes: number;
  validFrom: string;
  current: boolean;
  /** R-P23: "ai lưu" — TÊN hiển thị người lưu bản này (hàm tiêm nhãn R-P20; không SĐT, không id); null = bản gieo / khung thử không tiêm nhãn. */
  nguoiLuu: string | null;
}
/** GET/POST /api/van-chuyen/chinh-sach-dieu-phoi — bản đang hiệu lực + lịch sử mọi bản (mới trước). */
export interface DispatchPolicyResponse { current: DispatchPolicyDto | null; history: DispatchPolicyDto[] }
export interface DispatchPolicyCreateRequest {
  minLeadMinutes: number;
  warnLeadMinutes: number;
  restMinutes: number;
  requireManifest: boolean;
  /** BẮT BUỘC (kế hoạch I43): thiếu → 400, không chép ngầm từ dòng cũ. */
  proxyBackdateMaxMinutes: number;
  requireContract?: false;
}
export interface DepartureRuleDto {
  id: string;
  /** Áp cho xe từ số người này trở lên. */
  minCapacity: number;
  subject: "VEHICLE" | "DRIVER";
  documentTypeCode: string;
  /** Tên loại giấy tờ XE (danh mục của van-chuyen); giấy tờ của NGƯỜI chỉ có mã (danh mục của parties — màn hình tra tên ở /api/parties/documents/meta). */
  documentTypeName: string | null;
  validFrom: string;
  validTo: string | null;
  active: boolean;
}
/** GET/POST /api/van-chuyen/dieu-kien, POST …/dieu-kien/:id/dong — mọi điều kiện, đang áp trước. */
export interface DepartureRuleListResponse { rules: DepartureRuleDto[] }
export interface DepartureRuleCreateRequest { minCapacity: number; subject: "VEHICLE" | "DRIVER"; documentTypeCode: string }
export interface LicenseCapacityDto {
  id: string;
  classCode: string;
  /** null = không giới hạn. */
  maxPassengers: number | null;
  validFrom: string;
  current: boolean;
}
/** GET/POST /api/van-chuyen/hang-bang — `current`: một dòng đang hiệu lực mỗi hạng; `history`: mọi dòng. */
export interface LicenseCapacityResponse { current: LicenseCapacityDto[]; history: LicenseCapacityDto[] }
export interface LicenseCapacityCreateRequest { classCode: string; maxPassengers: number | null }
export interface TripReasonDto {
  code: string;
  group: NhomLyDo;
  groupLabel: string;
  label: string;
  active: boolean;
  sortOrder: number;
  updatedAt: string;
  /** R-P22: mã lý do HỆ THỐNG (máy tự dùng) — không ngưng được; màn ẩn nút "Ngưng". */
  heThong: boolean;
}
/** GET/POST /api/van-chuyen/ly-do, PUT …/ly-do/:code (Quản trị) — danh mục lý do theo nhóm. */
export interface TripReasonListResponse { reasons: TripReasonDto[] }
export interface TripReasonCreateRequest { code: string; group: NhomLyDo; label: string; sortOrder?: number }
export interface TripReasonUpdateRequest { label: string; sortOrder: number; active: boolean; expectedUpdatedAt: string }

// ---- Chuyến xe, lịch chung (ADR-0049 D1–D3 lát 1.5 / 1.6; ADR-0050; kế hoạch mục 1.7, 1.8; module van-chuyen) ------------------------------------------------
// Tên khoá tiếng Việt (mục 1.8). KHÔNG BAO GIỜ có: tiền, ghi chú đơn, người lập, người phụ trách, số giấy tờ, nơi cấp, khoá so sánh nơi (`L:…` / `T:…` —
// ADR-0050 VK1-B), SĐT (trừ `lienHe` của DTO tài xế trong ngày chạy — A15). Giờ hiển thị luôn là giờ VN.
/** Ngày + giờ VN ("YYYY-MM-DD", "HH:MM"). */
export interface GioVnDto { ngay: string; gio: string }
/** Một lý do giữ / chặn (src/shared/ly-do-giu.ts — chỗ sống duy nhất); `aiXuLyNhan` = nhãn "Văn phòng" / "Quản trị" / "Toàn quyền". */
export interface LyDoGiuDto { ma: string; loiNhan: string; aiXuLy: "VAN_PHONG" | "QUAN_TRI" | "TOAN_QUYEN"; aiXuLyNhan: string }
/**
 * Một mốc tiến độ (ADR-0050 VK1-A — bảng "Nơi dùng giờ nào"): giờ XẢY RA + giờ GHI NHẬN; `vanPhongKhai` = văn phòng bấm thay khai giờ; `nguoiBam` = TÊN
 * HIỂN THỊ người bấm, CHỈ có khi `vanPhongKhai` (R-P11: chuỗi tên, không SĐT, không id).
 */
export interface MocTienDoDto { gioXayRa: GioVnDto; gioGhiNhan: GioVnDto; vanPhongKhai: boolean; nguoiBam?: string }
/** Khoá theo mốc tối thiểu lúc xếp (R-P13 — khoá dính R-P6/R-P7): `dangKhoa` tính bằng hàm thuần ở máy chủ; `tuLuc` = lúc bắt đầu khoá (giờ VN). */
export interface KhoaMocDto { dangKhoa: boolean; tuLuc: GioVnDto; tuLucMs: number }
export interface LyDoDangDungDto { code: string; nhom: NhomLyDo; nhan: string }
/** Xe để chọn (văn phòng không có ô vehicle.manage nên không gọi /xe — mục 1.8). */
export interface XeChonDto { id: string; bienSo: string; soCho: number; trangThai: "active" | "maintenance"; chuXe: string; chuLaCongTy: boolean }
/** Tài xế để chọn (hàm công bố `taiXeChoDieuPhoi` của parties — không số, không nơi cấp). */
export interface TaiXeChonDto { partyId: string; ten: string; loai: "CONG_TY" | "NHA_XE"; nhaXe: string[] }
export interface CanhBaoLichDto { loai: string; nhan: string; legId: string | null; tripId: string | null; maDon: string | null }
export interface ChuyenTomTatDto {
  id: string;
  ma: string;
  trangThai: "PLANNED" | "RUNNING" | "ENDED" | "ENDED_INTERRUPTED" | "CANCELLED";
  trangThaiNhan: string;
  version: number;
  ngayChay: string;
  batDau: GioVnDto;
  ketThuc: GioVnDto;
  batDauMs: number;
  ketThucMs: number;
  xe: { id: string; bienSo: string; soCho: number; chuXe: string; chuLaCongTy: boolean };
  taiXe: { partyId: string; ten: string; loai: "CONG_TY" | "NHA_XE" } | null;
  /** Suất đang chiếm chỗ (chờ đón + đã lên), kể cả người đi kèm. */
  tai: number;
  /** Lý do GIỮ (chuyến chưa chạy, dự phóng "xuất bến đúng giờ"); rỗng = đủ điều kiện. */
  lyDoGiu: LyDoGiuDto[];
  khoaMoc: KhoaMocDto;
  xuatBen: MocTienDoDto | null;
  ketThucThat: MocTienDoDto | null;
  diem: { id: string; thuTu: number; loai: "PICKUP" | "DROPOFF"; tenNoi: string; trangThai: string; daToi: MocTienDoDto | null }[];
}
export interface ChangLichDto {
  legId: string;
  orderId: string;
  maDon: string;
  tenDichVu: string;
  chieu: "OUT" | "RETURN";
  ngayDon: string;
  gioDon: string | null;
  noiDon: string;
  noiTra: string | null;
  soNguoi: number;
  /** Số người đã có tên = min(số người, số hành khách hiện hành của đơn) — I12. */
  soNguoiCoTen: number;
  datGap: boolean;
  trangThai: string;
  trangThaiNhan: string;
  nhan: string[];
  soDaXep: number;
  soDaDon: number;
  soDaTra: number;
  soVang: number;
  soKhachHuy: number;
  chuyen: { id: string; ma: string }[];
}
/** GET /api/van-chuyen/lich?ngay= — lịch chung ngày D (hình chiếu lúc đọc). `mocToiThieuPhut` / `canhBaoPhut`: R-P12 (null = chưa có chính sách). */
export interface LichChungResponse {
  ngay: string;
  mocToiThieuPhut: number | null;
  canhBaoPhut: number | null;
  chang: ChangLichDto[];
  chuyen: ChuyenTomTatDto[];
  /** Số chặng của đơn NHÁP (chỉ đếm — I11). */
  soNhap: number;
  /** Chặng nháp dưới mốc chờ duyệt đặt gấp — CHỈ người có ô `order.leg.short_notice` (khác: mảng rỗng). */
  nhapChoDatGap: { legId: string; orderId: string; maDon: string; ngayDon: string; gioDon: string | null }[];
  canhBao: CanhBaoLichDto[];
  lyDo: LyDoDangDungDto[];
  xe: XeChonDto[];
  taiXe: TaiXeChonDto[];
}
export interface DiemChuyenDto {
  id: string;
  thuTu: number;
  loai: "PICKUP" | "DROPOFF";
  /** Tên điểm danh mục hoặc chữ tự do ĐÃ CHE dãy số. */
  tenNoi: string;
  diemDanhMucId: string | null;
  /** Giờ hẹn sớm nhất của các chặng đón tại điểm (điểm trả: null). */
  gioHen: GioVnDto | null;
  /** Giờ xe tới GHI ĐÈ (null = theo giờ hẹn). */
  gioXeToi: GioVnDto | null;
  trangThai: "PENDING" | "ARRIVED" | "DONE" | "SKIPPED" | "MOVED";
  soNguoi: number;
  /** R-P16: nơi hiện hành của chặng khác điểm này (khoá so sánh nơi lệch — KHÔNG trả khoá, chỉ cờ). */
  lechDon: boolean;
  daToi: MocTienDoDto | null;
}
export interface SuatChuyenDto {
  id: string;
  loai: "PASSENGER" | "CREW";
  maDon: string | null;
  legId: string | null;
  chieu: "OUT" | "RETURN" | null;
  diemLen: string | null;
  diemXuong: string | null;
  trangThai: "WAITING" | "BOARDED" | "NO_SHOW" | "CANCELLED_AT_STOP" | "DROPPED";
  /** Số hiệu chuyến bay của CHẶNG của suất (ADR-0055 VK2-C C3; gắn vào suất, không vào điểm dừng — ruling T1); null = chưa có / suất người đi kèm. */
  soHieuChuyenBay: string | null;
  /** Có tên khách chưa (khoá người đã gắn). */
  coTen: boolean;
  /** Họ tên + năm sinh — CHỈ ở chi tiết chuyến của văn phòng (R-P1; `trip.view = any` ⇒ `contact.view = any`) và DTO tài xế trong ngày chạy (A15). */
  hoTen?: string;
  namSinh?: number;
  daDon: MocTienDoDto | null;
  daTra: MocTienDoDto | null;
}
export interface NhatKyChuyenDto {
  id: string;
  loai: string;
  nhan: string;
  gioXayRa: GioVnDto;
  gioGhiNhan: GioVnDto;
  vanPhongKhai: boolean;
  /** Tên hiển thị người bấm (hàm tiêm `nhanNhanVien` — R-P20; không SĐT, không id); null = máy / không rõ. */
  nguoiBam: string | null;
  may: boolean;
  soNguoi: number | null;
  phaLe: { luat: string; lyDoNhan: string } | null;
}
export interface BanChupDto {
  ketQua: "DAT" | "KHONG_DAT";
  luc: GioVnDto;
  bienSo: string;
  soCho: number;
  nghiDaDung: number;
  /** Dòng con: loại, mã loại giấy tờ, hạng, hạn — KHÔNG số giấy tờ. */
  muc: { loai: string; loaiGiayTo: string | null; hang: string | null; hetHan: string | null }[];
  soNguoiChot: number;
}
/** GET /api/van-chuyen/chuyen/:id (và phản hồi mọi lệnh ghi của văn phòng). */
export interface ChuyenChiTietResponse {
  chuyen: ChuyenTomTatDto & { nghiPhaLe: boolean; lyDoHuy: string | null; lyDoKetThuc: string | null };
  diem: DiemChuyenDto[];
  suat: SuatChuyenDto[];
  canhBao: CanhBaoLichDto[];
  nhatKy: NhatKyChuyenDto[];
  banChup: BanChupDto | null;
  lyDo: LyDoDangDungDto[];
  xe: XeChonDto[];
  taiXe: TaiXeChonDto[];
  mocToiThieuPhut: number | null;
  canhBaoPhut: number | null;
  /** R-P14 (A15): giờ sớm nhất văn phòng khai được cho từng lệnh bấm thay. */
  gioSomNhatKhai: GioSomNhatKhaiDto;
  /** ADR-0051 (A-GB): mỗi chặng có suất trên chuyến mà còn mục "Giờ hẹn đổi — gọi báo khách" hoặc đang mang dấu "đã gọi báo". */
  goiBao: GoiBaoChangDto[];
  /**
   * CHỈ ở phản hồi lệnh xếp (`POST …/chuyen/:id/phan-bo`) khi có: cảnh báo sớm CHUA_CO_NOI_TRA / THIEU_TEN của chặng vừa xếp (cùng luật cổng xuất bến —
   * `lyDoNoiTra` / `lyDoThieuTen` ở src/shared/dieu-phoi-kiem.ts). Chỉ nhắc — lệnh đã chạy. Mã đơn + số tên thiếu, không tên khách.
   */
  canhBaoXep?: LyDoGiuDto[];
}

// ---- Nhắc "gọi báo khách" khi giờ hẹn đổi (ADR-0051 GB1, GB2 — Task A-GB) --------------------------------------------------------------------------------
// KHÔNG BAO GIỜ: tên khách, năm sinh, SĐT, người lập, người phụ trách, khoá so sánh nơi. Giờ = giờ VN; `gio` null = "chưa chốt giờ".
export interface GioHenDto { ngay: string; gio: string | null }
/** Mục "Giờ hẹn đổi — gọi báo khách": cũ (mốc "đã biết") → mới (giờ hiện hành trên đơn); `phienBan` gửi lại khi bấm; `baoDuoc` = máy chủ tính bằng can(trip.call_ack…). */
export interface GioHenDoiDto { cu: GioHenDto; moi: GioHenDto; phienBan: number; maChuyen: string[]; baoDuoc: boolean }
/** Dấu "đã gọi báo khách (tên, HH:MM)": `nguoiBam` = nhãn tên (không SĐT, không id); `boDuoc` = được bấm "Bỏ đánh dấu". */
export interface DaGoiBaoDto { cu: GioHenDto; moi: GioHenDto; luc: string; nguoiBam: string | null; phienBan: number; boDuoc: boolean }
export interface GoiBaoChangDto { legId: string; maDon: string | null; gioHenDoi: GioHenDoiDto | null; daGoiBao: DaGoiBaoDto | null }
/** Một mục của danh sách nhắc (`GET /api/van-chuyen/nhac-goi-khach`). */
export interface MucNhacGoiDto { legId: string; orderCode: string; chieu: "OUT" | "RETURN"; noiDon: string; ngayChuyen: string; gioHenDoi: GioHenDoiDto }
export interface NhacGoiKhachResponse { tu: string; den: string; muc: MucNhacGoiDto[] }
/** `POST /api/van-chuyen/chang/:legId/da-goi-bao` — `gioMoi` = giờ "mới" màn đã hiện (`gio` null = chưa chốt giờ). Không nhận chữ nào khác. */
export interface DaGoiBaoRequest { requestId: string; phienBan: number; gioMoi: GioHenDto }
/** `POST /api/van-chuyen/chang/:legId/bo-danh-dau-goi-bao`. */
export interface BoDanhDauGoiBaoRequest { requestId: string; phienBan: number }
/** Phá lệ đi kèm lệnh (I2) — chỉ ô `trip.override` (Quản trị, Toàn quyền); `lyDo` = mã lý do nhóm PHA_LE đang dùng. */
export interface PhaLeRequest { lyDo: string }
/** POST /api/van-chuyen/chuyen — tạo chuyến. */
export interface TaoChuyenRequest {
  requestId: string;
  xeId: string;
  taiXePartyId: string;
  batDau: GioVnDto;
  ketThuc: GioVnDto;
  /** Phá lệ khoảng nghỉ (luật KHOANG_NGHI). */
  nghiPhaLe?: PhaLeRequest;
}
/** PUT /api/van-chuyen/chuyen/:id — sửa kế hoạch (khoá `version`). Vắng = giữ. */
export interface SuaChuyenRequest {
  version: number;
  requestId: string;
  xeId?: string;
  taiXePartyId?: string;
  batDau?: GioVnDto;
  ketThuc?: GioVnDto;
  /** Thứ tự + giờ xe tới của điểm (chưa tới); `gioXeToi` null = theo giờ hẹn. */
  diem?: { id: string; thuTu: number; gioXeToi: GioVnDto | null }[];
  phaLe?: PhaLeRequest;
  nghiPhaLe?: PhaLeRequest;
}
/** POST /api/van-chuyen/chuyen/:id/phan-bo — xếp khách theo chặng (tách đoàn: `soSuat` < số người) và / hoặc người đi kèm. */
export interface XepRequest {
  version: number;
  requestId: string;
  chang?: { legId: string; soSuat: number; personKeys?: string[] }[];
  nguoiDiKem?: string[];
  phaLe?: PhaLeRequest;
}
export interface RutRequest { version: number; requestId: string; suatIds: string[]; phaLe?: PhaLeRequest }
export interface DoiRequest { version: number; requestId: string; denChuyenId: string; denVersion: number; suatIds: string[]; phaLe?: PhaLeRequest }
export interface HuyChuyenRequest { version: number; requestId: string; lyDo: string; phaLe?: PhaLeRequest }
export interface CapNhatDiemRequest { version: number; requestId: string }
/** Phản hồi "cập nhật điểm theo đơn" (I42): số suất đã đổi điểm (0 = không suất nào lệch — không ghi gì). */
export interface CapNhatDiemResponse extends ChuyenChiTietResponse { daCapNhat: number }
/**
 * `POST /api/van-chuyen/chuyen/:id/cap-nhat-khach` (R-P29, chủ lần 16 — khuôn route 40): thân như `CapNhatDiemRequest`. `daCapNhat` = số suất khách ĐÃ ĐỔI
 * được xử lý (đóng PASSENGER_CHANGED; mở lại tới số người của chặng). 0 = không có gì lệch (không ghi). Phản hồi KHÔNG tên (GA-55).
 */
export interface CapNhatKhachResponse extends ChuyenChiTietResponse { daCapNhat: number }
/**
 * 409 của lệnh chuyến: `lyDo` = mọi lý do (luật thuần); `canQuyen` (can_pha_le) = người gọi có ô trip.override (đưa hộp phá lệ).
 * A15: `gio_xay_ra_ngoai_khoang` kèm `maGio` (mã kiemGioXayRa), `somNhat` (giờ sớm nhất khai được — R-P14; null = không phút nào) và `mocChan` (mốc gây chặn:
 * mã chuyến trước + giờ, hoặc nhãn sự kiện + giờ — không tên người); `con_khach_chua_xong` kèm `goiY` "KET_THUC_GIAN_DOAN" + số suất / điểm còn dở.
 */
export interface LenhChuyenLoiBody {
  error: {
    code: string;
    message: string;
    lyDo?: LyDoGiuDto[];
    canQuyen?: boolean;
    maGio?: string[];
    somNhat?: GioVnDto | null;
    mocChan?: MocChanDto | null;
    goiY?: "KET_THUC_GIAN_DOAN";
    conSuat?: number;
    conDiem?: number;
  };
}
/** Mốc gây chặn giờ khai (R-P14): `loai` KEP (giới hạn khai lùi) / SU_KIEN (một mốc đã ghi của chuyến) / CHUYEN_TRUOC (chuyến trước của xe / tài xế) / MO_SUAT. */
export interface MocChanDto { loai: "KEP" | "SU_KIEN" | "CHUYEN_TRUOC" | "MO_SUAT"; nhan: string; maChuyen: string | null; gio: GioVnDto }
/**
 * R-P14 — `GET /api/van-chuyen/chuyen/:id` → `gioSomNhatKhai`: giờ SỚM NHẤT văn phòng khai được cho từng lệnh bấm thay có khai giờ (phút chẵn, giờ VN; tính
 * bằng CHÍNH `kiemGioXayRa` với kẹp lùi của chính sách hiện hành). `null` = lệnh không áp (sai trạng thái) hoặc không phút nào hợp lệ (để "lúc bấm").
 * `lenXe` dùng cho đã đón / vắng / khách huỷ (cùng chặn dưới); `tra` cho đã trả.
 */
export interface GioSomNhatKhaiDto {
  xuatBen: GioVnDto | null;
  ketThuc: GioVnDto | null;
  diem: { id: string; daToi: GioVnDto | null }[];
  suat: { id: string; lenXe: GioVnDto | null; tra: GioVnDto | null }[];
}

// ---- Lệnh TIẾN ĐỘ (ADR-0049 D3; kế hoạch mục 1.7 route 19–29 tài xế, 31–39 văn phòng bấm thay — R-P1; Task A15) ------------------------------------------
/**
 * Thân lệnh tiến độ (xuất bến, đã tới, đã đón, vắng, khách huỷ, đã trả, kết thúc). `xayRaLuc` (chuỗi ISO CÓ múi giờ) CHỈ route văn phòng 31–38 nhận — văn
 * phòng khai giờ xảy ra khi khác lúc bấm (ADR-0050 VK1-A, I34); route tài xế 21–29 và route 39 gửi khoá này → 400 `xay_ra_khong_nhan`.
 */
export interface TienDoRequest { requestId: string; xayRaLuc?: string }
export interface KetThucGianDoanRequest extends TienDoRequest { lyDo: string }
/** Đổi thứ tự điểm CHƯA TỚI khi xe đang chạy (route 29 / 39) — không khai giờ. */
export interface DoiThuTuRequest { requestId: string; diem: { id: string; thuTu: number }[] }

/**
 * DTO TÀI XẾ (kế hoạch mục 1.8; ruling R-P11, R-P17) — dựng MỚI từng khoá (src/modules/van-chuyen/tai-xe-dto.ts). KHÔNG BAO GIỜ: tiền, dịch vụ khác, ghi chú
 * đơn, người lập, người phụ trách, số giấy tờ, hạn GPLX, khoá so sánh nơi. `hoTen`, `namSinh`, `lienHe` CHỈ trong ngày chạy (hôm nay là ngày chạy, hoặc chuyến
 * đang chạy đã xuất bến từ ngày chạy trở đi — ADR-0053 D7.2, Q-L3-B; xuất bến tối hôm trước không mở sớm) — ngoài ngày chạy các khoá đó VẮNG MẶT (không phải chuỗi rỗng). `lienHe` chỉ ở `GET /cuoc-cua-toi/:id` (phản hồi lệnh tiến độ không kèm —
 * màn tải lại chi tiết).
 */
export interface DieuKienConThieuDto { ma: string; loiNhan: string; aiXuLy: "VAN_PHONG" | "QUAN_TRI" | "TOAN_QUYEN" }
/** Route 19 — một chuyến của "Cuốc của tôi" (R-P17): không tên, không SĐT. */
export interface CuocCuaToiItemDto {
  id: string;
  ma: string;
  gioXuatBen: GioVnDto;
  trangThai: "PLANNED" | "RUNNING" | "ENDED" | "ENDED_INTERRUPTED" | "CANCELLED";
  trangThaiNhan: string;
  bienSo: string;
  soKhach: number;
  soDiemDon: number;
  soDiemTra: number;
  dieuKienConThieu: DieuKienConThieuDto[];
}
export interface CuocCuaToiResponse { tu: string; den: string; chuyen: CuocCuaToiItemDto[] }
/**
 * ADR-0059 — `GET /api/van-chuyen/xe-cua-don/:orderId`: xe chở từng chặng ĐANG MỞ của một đơn, DANH SÁCH TRẮNG (Hiến chương 4.4). Mỗi chặng một mục (kể cả
 * chặng chưa xếp — `xe` rỗng); mỗi xe = một chuyến chưa huỷ có suất khách ĐANG MỞ của chặng. KHÔNG BAO GIỜ: SĐT tài xế, tên / năm sinh khách, khoá so sánh
 * nơi, mã / id chuyến, tiền, giấy tờ. `trangThai` là mã — giao diện đổi sang chữ bằng `NHAN_TRANG_THAI_CHUYEN` (src/shared/dieu-phoi-kieu.ts).
 */
export interface XeCuaDonXeDto {
  bienSo: string;
  /** Tên hiển thị hồ sơ tài xế đang mở dòng lái; null = chuyến chưa có tài xế. */
  tenTaiXe: string | null;
  /** Số suất hành khách ĐANG MỞ của chặng trên chuyến này. */
  soKhach: number;
  trangThai: "PLANNED" | "RUNNING" | "ENDED" | "ENDED_INTERRUPTED" | "CANCELLED";
}
export interface XeCuaDonChangDto { legId: string; xe: XeCuaDonXeDto[] }
export interface XeCuaDonResponse { chang: XeCuaDonChangDto[] }
/** Route 20 (và phản hồi lệnh tiến độ của tài xế) — chi tiết một chuyến mình đang lái. */
export interface CuocChiTietResponse {
  chuyen: {
    id: string;
    ma: string;
    bienSo: string;
    soCho: number;
    gioBatDau: GioVnDto;
    gioKetThuc: GioVnDto;
    trangThai: "PLANNED" | "RUNNING" | "ENDED" | "ENDED_INTERRUPTED" | "CANCELLED";
    trangThaiNhan: string;
    xuatBen: MocTienDoDto | null;
    ketThucThat: MocTienDoDto | null;
  };
  diem: {
    id: string;
    thuTu: number;
    loai: "PICKUP" | "DROPOFF";
    tenNoi: string;
    gioHen: GioVnDto | null;
    gioXeToi: GioVnDto | null;
    trangThai: "PENDING" | "ARRIVED" | "DONE" | "SKIPPED" | "MOVED";
    soNguoi: number;
    daToi: MocTienDoDto | null;
  }[];
  suat: {
    id: string;
    maDon: string | null;
    diemLen: string | null;
    diemXuong: string | null;
    trangThai: "WAITING" | "BOARDED" | "NO_SHOW" | "CANCELLED_AT_STOP" | "DROPPED";
    daDon: MocTienDoDto | null;
    daTra: MocTienDoDto | null;
    /** Số hiệu chuyến bay của chặng — CÓ MỌI LÚC như giờ, nơi hẹn (ADR-0055 C3, G-C1: không kèm tên không chỉ ra một người). */
    soHieuChuyenBay: string | null;
    hoTen?: string;
    namSinh?: number;
  }[];
  lienHe?: { maDon: string; tenLienHe: string; sdtLienHe: string }[];
  dieuKienConThieu: DieuKienConThieuDto[];
  /** Lý do kết thúc gián đoạn đang dùng (I5). */
  lyDo: { code: string; nhan: string }[];
  trongNgayChay: boolean;
}

// ---- Mẫu đưa đón theo dịch vụ (ADR-0054 D10.1–D10.2; ADR nháp nơi trả mặc định docs/superpowers/specs/2026-10-01-de-xuat-adr-noi-tra-mac-dinh.md) ------------
/** Một BẢN mẫu (màn Danh mục, cổng admin): chế độ, giờ gợi ý chiều về, nơi trả mặc định (tên + còn dùng), lúc hiệu lực (ISO UTC). */
export interface MauChangBanDto {
  mode: "NONE" | "ONE_WAY" | "ROUND_TRIP";
  returnTimeHint: string | null;
  noiTraMacDinh: { id: string; ten: string; dangDung: boolean } | null;
  tuLuc: string;
}
/** `GET/POST /api/van-chuyen/mau-chang/:code` — lịch sử (mới trước) + bản hiện hành (null = chưa cài = không đưa đón). */
export interface MauChangLichSuResponse {
  code: string;
  hienHanh: MauChangBanDto | null;
  lichSu: MauChangBanDto[];
}
/**
 * `GET /api/van-chuyen/mau-chang` (cổng orders + `order.create`) — mẫu HIỆN HÀNH theo mã dịch vụ, ĐÚNG ba khoá mỗi mã (danh sách trắng): chế độ, giờ gợi ý, nơi trả
 * mặc định `{ id, ten }` hoặc null (chưa cài / điểm đã ngưng). Mã vắng = không đưa đón. Form đưa vào `changMacDinh` (src/shared/chang-mac-dinh.ts).
 */
export interface MauChangFormResponse {
  mauChang: Record<string, { mode: "NONE" | "ONE_WAY" | "ROUND_TRIP"; returnTimeHint: string | null; noiTraMacDinh: { id: string; ten: string } | null }>;
}

// ---- Sổ tiền lượt 1 (module billing — ADR-0024, ADR-0025, ADR-0026) -----------------------------------------------------------------------------
// Số "đã thu / còn lại / dư" LUÔN do máy chủ tính (billing/rules.ts `conLai` — một hàm); trình duyệt chỉ vẽ. Không SĐT, không tên khách ở sổ.

/** Lý do đơn đang bị giữ (chưa "Đã giao" / chưa "Hoàn thành" được) + ai phải xử lý (Hiến chương 5.7). */
export interface LyDoGiuDonDto {
  ma: string;
  cau: string;
  aiXuLy: string;
}

/** Một lần thu trên màn đơn (nội bộ). Nhãn đã là tiếng Việt; mã thô không lộ ra. */
export interface LanThuDto {
  id: string;
  /** true = trả lại khách (hoàn). */
  traLai: boolean;
  soTien: number;
  hinhThuc: string;
  /** "Công ty", tên người thu, hoặc "Chưa rõ". */
  nguoiThu: string;
  nguoiThuChuaRo: boolean;
  giaiDoan: string;
  ngayPhatSinh: string;
  daDao: boolean;
  laDongDao: boolean;
  nguoiGhi: string | null;
  ghiChu: string | null;
  ghiLuc: string;
}

/** `GET /api/orders/:id/payments` — tiền của MỘT đơn + lý do đang giữ + nút nào được hiện (máy chủ vẫn kiểm lại khi bấm). */
export interface OrderPaymentsResponse {
  phaiThu: number;
  daThu: number;
  conLai: number;
  du: number;
  chuaRo: number;
  lanThu: LanThuDto[];
  deliveredAt: string | null;
  completedAt: string | null;
  /** null = đủ điều kiện "Đã giao" (hoặc đã Đã giao — xem deliveredAt). */
  lyDoChuaGiao: LyDoGiuDonDto | null;
  lyDoChuaHoanThanh: LyDoGiuDonDto | null;
  /** Số tiền của công ty người đang xem còn giữ vì đơn này (hộp xác nhận "Bạn đang giữ X ₫ của công ty"). */
  banDangGiu: number;
  coTheGhiThu: boolean;
  /** Người xem ĐƯỢC bấm (ô quyền) — nút hiện; `coTheGiao` = được bấm VÀ đủ điều kiện ngay lúc này (nút bật). */
  quyenGiao: boolean;
  coTheGiao: boolean;
  quyenHoanThanh: boolean;
  coTheHoanThanh: boolean;
  /** Người xem được chọn người thu khác mình / Công ty, và chọn ngày phát sinh khác hôm nay (Kế toán, Toàn quyền). */
  laKeToan: boolean;
  /**
   * Thao tác Kế toán đặt TẠM trên trang đơn (điều phối 30/9 — hai màn sổ riêng chờ chủ vẽ lại): CHỈ có khi `laKeToan`, còn lại `null`.
   * `dangGiu` = ai đang giữ tiền của công ty VÌ ĐƠN NÀY (số dư dương của sổ, theo đơn); `choXacNhan` = id lần thu "Công ty thu – CK" chưa được xác nhận.
   */
  keToan: { dangGiu: { partyId: string; ten: string; soTien: number }[]; choXacNhan: string[] } | null;
}

/** Thân ghi một lần thu (`POST /api/orders/:id/payments`, và `lanThu` tuỳ chọn của `POST /api/orders/:id/delivered`). */
export interface LanThuInput {
  soTien: number;
  hinhThuc: "CASH" | "BANK_TRANSFER" | "OTHER";
  /** "toi" = chính người ghi; "cong_ty" = Công ty thu (chuyển khoản vào tài khoản công ty…); { partyId } = người khác — CHỈ Kế toán / Toàn quyền. */
  nguoiThu: "toi" | "cong_ty" | { partyId: string };
  ngayPhatSinh?: string;
  ghiChu?: string;
}

/** `POST /api/ledger/balances` — tiền từng đơn (chỉ đơn người gọi được xem tiền; đơn khác bị bỏ khỏi kết quả). */
export interface LedgerBalancesResponse {
  balances: Record<string, { phaiThu: number; daThu: number; conLai: number; du: number; chuaRo: number; daGiao: boolean; hoanThanh: boolean }>;
}

/** `GET /api/ledger/unpaid-summary` — ô "Còn thiếu tiền" của Trang chủ (đơn đã xác nhận chưa Đã giao còn phải thu). */
export interface UnpaidSummaryResponse {
  count: number;
  total: number;
  /** Ngày đi sớm nhất trong các đơn còn thiếu tiền (null nếu không đơn nào). */
  earliestDate: string | null;
}

/** Một dòng "Sổ của tôi" (`GET /api/ledger/mine`): mã đơn, ngày, loại, số tiền (dương = mình giữ thêm), số dư sau dòng — KHÔNG tên/SĐT khách. */
export interface SoCuaToiDongDto {
  maDon: string | null;
  ngay: string;
  loai: string;
  soTien: number;
  soDu: number;
}
export interface SoCuaToiResponse {
  dangGiu: number;
  dong: SoCuaToiDongDto[];
}

/** `GET /api/ledger` (Kế toán, Toàn quyền): số dư từng bên với công ty, khoản "Công ty thu" chờ xác nhận, lần thu chưa rõ người thu. */
export interface SoCongNoResponse {
  soDu: { partyId: string; ten: string; dangGiu: number }[];
  choXacNhan: { receiptId: string; orderId: string; maDon: string | null; soTien: number; ngay: string; nguoiKhai: string }[];
  chuaRo: { receiptId: string; orderId: string; maDon: string | null; soTien: number; ngay: string }[];
}

// ---- Biên nhận (module receipt — ADR-0024 đ1, ADR-0026 đ11) -------------------------------------------------------------------------------------
// DANH SÁCH TRẮNG: máy chủ dựng TỪNG trường dưới đây từ dữ liệu của orders / billing / company — KHÔNG trải đối tượng nguồn. KHÔNG BAO GIỜ có: a%, giá vốn,
// giá danh mục, chiết khấu, hoa hồng, công nợ, tên người thu, hình thức thu, ghi chú nội bộ, mã danh mục, id. Thêm trường = sửa bài
// src/modules/receipt/bien-nhan.test.ts (danh sách khoá + số lạ 480.017).
export interface ReceiptLineDto {
  description: string;
  detail: string | null;
  quantity: number;
  /** Đơn giá BÁN LẺ trên đơn (máy chủ tính). */
  unitPrice: number;
  lineTotal: number;
}
export interface ReceiptServiceDto {
  name: string;
  /** Đơn vị (để in số khách "2 người lớn" hay "N khách"); "manual" = nhập tay. */
  unit: string;
  pax: PaxCounts;
  departDate: string | null;
  departTime: string | null;
  pickupTime: string | null;
  pickupPlace: string | null;
  checkinDate: string | null;
  checkinTime: string | null;
  checkinPlace: string | null;
  items: ReceiptLineDto[];
}
export interface ReceiptDto {
  company: CompanyDto;
  orderCode: string;
  /** Khoá (chọn màu huy hiệu) + nhãn tiếng Việt (`trangThaiHienThi`). */
  status: { khoa: "draft" | "confirmed" | "cancelled" | "delivered" | "completed"; nhan: string };
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerNote: string | null;
  services: ReceiptServiceDto[];
  subtotal: number;
  discount: number;
  total: number;
  /** Đã trả trước (billing `conLai` — một hàm). */
  daTra: number;
  /** Còn lại (≥ 0). */
  conLai: number;
}
export interface ReceiptResponse { receipt: ReceiptDto }

// ---- Trợ lý Hỗ trợ (ADR-0066, module tro-ly) ----
/** Thân `POST /api/tro-ly/hoi`. Máy chủ che SĐT / email / số giấy tờ và cắt 500 ký tự trước khi gửi đi. `cuocTroChuyen` (ADR-0073 Đ4): mã ngẫu nhiên khung sinh —
 *  máy chủ tự lấy ≤ 3 lượt trước của CHÍNH người hỏi cùng mã; trình duyệt KHÔNG gửi nội dung lượt trước. Sai dạng ⇒ 400; thiếu / null ⇒ không nhớ. */
export interface TroLyHoiRequest { cauHoi: string; cuocTroChuyen?: string | null }
/** Phản hồi 200 của `POST /api/tro-ly/hoi`: câu trả lời (chữ thường) + tên các mục hướng dẫn đã dùng. Lỗi: 503 `tro_ly_chua_bat`, 429 `tro_ly_het_tran_ngay` /
 *  `tro_ly_het_tran_thang`, 502 `tro_ly_loi` — `error.message` là câu tiếng Việt hiện thẳng cho người dùng. */
export interface TroLyHoiResponse { traLoi: string; nguon: string[] }
/**
 * `GET`/`POST /api/tro-ly/cai-dat` (chỉ Toàn quyền — ô settings.ops; ADR-0069 điều 1, 2, 3, 6). `coKhoa`: máy chủ đã có khoá OpenAI chưa; `khoaCuoi`: TỐI ĐA
 * 4 ký tự cuối của khoá (null khi chưa có hoặc khoá ngắn) — không bao giờ trả đủ khoá. `vai`: công tắc hiện hành của 9 mã quyền. `theoVai`: tháng này, đọc
 * từ lịch sử hỏi đáp (một câu của tài khoản nhiều quyền tính cho mỗi quyền của nó). `soLuotThuThang`: số lượt Thử key / ô thử tháng này (ADR-0073 T6) —
 * không nằm trong soCauThang, soCauHomNay; chiPhiThangUsd GỒM chúng.
 */
export interface TroLyCaiDatResponse {
  bat: boolean; tranThangUsd: number; tranNgay: number; coKhoa: boolean; khoaCuoi: string | null; thang: string; chiPhiThangUsd: number; soCauThang: number;
  soCauHomNay: number; soLuotThuThang: number; vai: Record<PermissionCode, boolean>; theoVai: { vai: PermissionCode; soCau: number; chiPhiUsd: number }[];
}
export interface TroLyCaiDatRequest { bat: boolean; tranThangUsd: number; tranNgay: number }

/** ADR-0060: một dòng dấu "đã nhập phần mềm kế toán" (bảng chỉ-thêm). `nguoiBam` = tên hiển thị (không SĐT). */
export interface NhapKeToanDongDto { id: string; daNhap: boolean; soHoaDon: string | null; lyDo: string | null; luc: string; nguoiBam: string | null }
/**
 * `GET /api/orders/:id/nhap-ke-toan` (ADR-0060 điều 4). `hienTai` null = chưa từng đánh dấu. `truocDo` (A-7): các dòng TRƯỚC dòng hiện tại, mới nhất trước —
 * CHỈ có cho người giữ ô `accounting.entry.mark`, còn lại null. `coTheGhi` = có ô ghi; `donDaXacNhan` = đánh dấu được lúc này (đơn đã xác nhận).
 */
export interface NhapKeToanResponse { hienTai: NhapKeToanDongDto | null; truocDo: NhapKeToanDongDto[] | null; coTheGhi: boolean; donDaXacNhan: boolean }
/** Thân `POST /api/orders/:id/nhap-ke-toan`: `truocDo` = id dòng hiện tại người dùng đang thấy (null = chưa có dòng) — khoá lạc quan. */
export interface NhapKeToanInput { daNhap: boolean; soHoaDon?: string | null; lyDo?: string | null; truocDo: string | null }
/** `GET /api/tro-ly/khung` (mọi tài khoản đăng nhập): có được dùng trợ lý không (ADR-0069 điều 3 — giao diện ẩn nút) + câu chào, câu hỏi mẫu (điều 4). */
export interface TroLyKhungResponse { duocDung: boolean; cauChao: string; cauHoiMau: string[] }
/** `POST /api/tro-ly/vai` (Toàn quyền): đủ 9 mã quyền. Trả lại `TroLyCaiDatResponse`. */
export interface TroLyVaiRequest { vai: Record<PermissionCode, boolean> }
/** Lời dặn (ADR-0069 điều 4). `POST /api/tro-ly/loi-dan` nhận đúng dạng này; "quay lại bản cũ" = gửi lại nội dung của bản cũ. */
export interface TroLyLoiDan { cauChao: string; giong: string; loiDanThem: string; cauHoiMau: string[] }
export interface TroLyLoiDanResponse { hienHanh: TroLyLoiDan; cacBan: (TroLyLoiDan & { id: string; luc: string; nguoi: string | null })[] }
/** Đoạn ngữ cảnh bổ sung. `POST /api/tro-ly/ngu-canh` thêm đoạn; `PUT /api/tro-ly/ngu-canh/:id` sửa / bật / tắt (= bản mới). */
export interface TroLyNguCanhRequest { tieuDe: string; noiDung: string; bat: boolean }
export interface TroLyNguCanhResponse { doan: { doanId: string; tieuDe: string; noiDung: string; bat: boolean; luc: string }[] }
/** `GET /api/tro-ly/lich-su?tu=&den=&nguoi=&vai=&q=&trang=` (Toàn quyền). Câu hỏi là bản ĐÃ CHE. `vai` là nhãn tiếng Việt. */
export interface TroLyLichSuResponse {
  dong: { id: string; nguoi: string; vai: string[]; cauHoi: string; traLoi: string; nguon: string[]; chiPhiUsd: number; ketQua: string; luc: string }[];
  coThem: boolean;
  nguoi: { staffId: string; ten: string }[];
}
/** `POST /api/tro-ly/thu-khoa` (Toàn quyền): kết quả lời thường. */
export interface TroLyThuKhoaResponse { ma: "duoc" | "sai_khoa" | "het_tien" | "gioi_han" | "mau_tu_choi" | "loi_mang" | "loi_khac" | "chua_dat"; cau: string }
/** ADR-0073: một mẫu của danh sách đóng. `gia` = micro-USD cho 1 triệu token; `mucSuyNghi` có nhãn tiếng Việt; `uocMotCauUsd` = ước tính thô một câu với số token ra của bộ não hiện hành. */
export interface TroLyMauDto { ma: string; ten: string; gia: { vao: number; vaoDem: number; ra: number }; mucSuyNghi: { ma: string; nhan: string }[]; ngayTraGia: string; uocMotCauUsd: number }
/** Bộ não (ADR-0073 Đ1, Đ2) — thân `PUT /api/tro-ly/bo-nao` và `boNao` của `POST /api/tro-ly/thu`. */
export interface TroLyBoNao { mau: string; mucSuyNghi: string; doDai: string; tokenRaToiDa: number; loiNhac: string }
/** `GET`/`PUT /api/tro-ly/bo-nao` (Toàn quyền). `macDinh` = chưa có bản nào hoặc lời nhắc đang đúng bản mặc định. */
export interface TroLyBoNaoResponse {
  hienHanh: TroLyBoNao; macDinh: boolean; loiNhacMacDinh: string; danhSachMau: TroLyMauDto[]; doDai: { ma: string; nhan: string }[]; ghiChuUocTinh: string;
}
/** `GET /api/tro-ly/bo-nao/lich-su` (Toàn quyền): 30 bản mới nhất; `phanDoi` = phần đổi so với bản trước (lời thường, không nội dung). */
export interface TroLyBoNaoLichSuResponse { cacBan: (TroLyBoNao & { id: string; luc: string; nguoi: string | null; phanDoi: string })[] }
/** `POST /api/tro-ly/thu` (Toàn quyền — ADR-0073 Đ5): cấu hình CHƯA lưu + câu hỏi + MỘT vai giả định. Chạy đúng đường ống thật; tính vào trần TIỀN tháng,
 *  không tính trần lượt ngày; không ghi lịch sử hỏi đáp; chạy được khi trợ lý đang tắt. Mẫu từ chối cấu hình (OpenAI 400) ⇒ 502 mã `mau_tu_choi`, câu lời thường. */
export interface TroLyThuRequest { boNao: TroLyBoNao; cauHoi: string; vai: PermissionCode }
export interface TroLyThuResponse { traLoi: string; nguon: string[]; tokenVao: number; tokenRa: number; chiPhiMicroUsd: number; chiPhiUsd: number; mau: string }
