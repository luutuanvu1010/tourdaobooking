// Kiểu và hằng DÙNG CHUNG của điều phối xe (ADR-0049 D1, D2; kế hoạch mục 1.1, I7) — một nguồn cho máy chủ (module van-chuyen) và màn hình (Phần B).
// Logic thuần, không I/O, không import module; import kèm đuôi .ts. Test cạnh tệp: dieu-phoi-kieu.test.ts.
//
// - Tập ĐÓNG của bốn máy trạng thái (chuyến, suất, điểm dừng) khớp `CHECK` của migration lõi chuyến (kế hoạch mục 1.3 — định trọn cả giá trị lượt 2–3).
// - Danh sách MỞ theo lượt (nhóm lý do, loại sự kiện chuyến) kiểm ở MÃ, không `CHECK` liệt kê (docs/ARCHITECTURE.md Phần II "Luật dữ liệu"; I7).
// - Kiểu VÀO của luật thuần mô phỏng đúng hình dữ liệu mà các nguồn sẽ trả (không đọc thẳng bảng): tài xế = hàm công bố `taiXeChoDieuPhoi` của parties
//   (kế hoạch mục 1.1 — không số giấy tờ, không nơi cấp); chặng = hàm hẹp `lichChungChang` của orders (chỉ khoá, mã đơn, ngày giờ, cờ — không tên, không SĐT);
//   chuyến / suất / điểm = bảng `vc_trip*` của chính van-chuyen.
// - Kiểu RA: `KetQuaKiem`, `KetQuaXuatBen`, `BanChup` (khớp cột `vc_trip_departure_check` / `…_item`). Lý do dùng `LyDoGiu` (ly-do-giu.ts — chỗ sống duy nhất).
import type { LyDoGiu } from "./ly-do-giu.ts";

// ---- Danh sách mở (kiểm ở mã) -------------------------------------------------------------------------------------------------------------------------------
/** Nhóm lý do ([TK] §1.9). Máy chỉ rẽ nhánh theo NHÓM; từng lý do là dữ liệu `vc_reason` (Quản trị sửa). Lượt 1 dùng năm nhóm; BAO_HUY_DIEM, TU_CHOI_NHAN từ lượt 2. */
export const NHOM_LY_DO = ["DOI_GIO_XE", "BAO_HUY_DIEM", "PHA_LE", "TU_CHOI_NHAN", "KET_THUC_GIAN_DOAN", "HUY_CHUYEN", "BO_QUA_DIEM", "BAN_XE", "CHI_PHI_XE"] as const;
export type NhomLyDo = (typeof NHOM_LY_DO)[number];
export const NHAN_NHOM_LY_DO: Readonly<Record<NhomLyDo, string>> = {
  DOI_GIO_XE: "Đổi giờ xe tới",
  BAO_HUY_DIEM: "Báo huỷ điểm đón",
  PHA_LE: "Phá lệ",
  TU_CHOI_NHAN: "Không nhận chuyển điểm",
  KET_THUC_GIAN_DOAN: "Kết thúc gián đoạn",
  HUY_CHUYEN: "Huỷ chuyến",
  BO_QUA_DIEM: "Bỏ qua điểm",
  BAN_XE: "Lý do xe bận", // ADR-0055 VK2-A (0071)
  CHI_PHI_XE: "Chi phí xe thuê", // ADR-0057 C3 (0073): lý do điều chỉnh / đảo / giá thoả thuận của chi phí chuyến xe thuê
};
export const isNhomLyDo = (v: unknown): v is NhomLyDo => typeof v === "string" && (NHOM_LY_DO as readonly string[]).includes(v);
/**
 * Mã lý do HỆ THỐNG — máy chủ TỰ ghi (quyết định MAY, không người chọn), mã nguồn tham chiếu như hằng (ruling R-P22 của điều phối, 29/9): KHÔNG ngưng được
 * (route sửa lý do trả 409; DTO có cờ `heThong` để màn ẩn nút). Nhãn, thứ tự vẫn sửa được. Thêm mã hệ thống = thêm vào đây (có bài kiểm).
 */
export const MA_LY_DO_HE_THONG = ["BO_QUA_KHONG_CON_KHACH", "CPX_DOI_CHUYEN", "CPX_HUY_CHUYEN", "CPX_GIA_THOA_THUAN"] as const; // + ba mã máy tự ghi của chi phí xe thuê (ADR-0057: hai mã đảo tự động TC-6 + lý do cố định của giá thoả thuận)
export const laLyDoHeThong = (code: string): boolean => (MA_LY_DO_HE_THONG as readonly string[]).includes(code);

/** Loại sự kiện chuyến (`vc_trip_event.kind`) — một-một với hành động nhật ký `trip_*` của kế hoạch mục 1.1. Lượt 2–3 thêm loại ở đây, không dựng lại bảng. */
export const LOAI_SU_KIEN_CHUYEN = [
  "CREATED", "UPDATED", "CANCELLED",
  "ALLOCATED", "ALLOCATION_REMOVED", "ALLOCATION_MOVED", "ALLOCATION_STOP_CHANGED", "ALLOCATION_PASSENGER_CHANGED",
  "DEPARTED", "STOP_ARRIVED", "PASSENGER_BOARDED", "PASSENGER_NO_SHOW", "PASSENGER_CANCELLED_AT_STOP", "PASSENGER_DROPPED",
  "STOPS_REORDERED", "ENDED", "ENDED_INTERRUPTED",
  // ADR-0052 D5 (Đợt 5): văn phòng thêm điểm / khách vào xe ĐANG CHẠY (D5.1 — đường (1) của LC-15 mới); văn phòng báo huỷ MỘT suất (D5.2 — chỉ đặt cờ).
  "STOP_ADDED_RUNNING", "ALLOCATION_OFFICE_CANCELLED",
  // ADR-0052 D5b (Đợt 5 A-1b — chủ duyệt 5/10): tài xế bổ sung tên MỘT khách chưa có tên (gắn tên suất + dòng hành khách source DRIVER).
  "PASSENGER_NAMED",
] as const;
export type LoaiSuKienChuyen = (typeof LOAI_SU_KIEN_CHUYEN)[number];
export const NHAN_SU_KIEN_CHUYEN: Readonly<Record<LoaiSuKienChuyen, string>> = {
  CREATED: "Tạo chuyến",
  UPDATED: "Sửa chuyến",
  CANCELLED: "Huỷ chuyến",
  ALLOCATED: "Xếp khách lên xe",
  ALLOCATION_REMOVED: "Rút khách khỏi xe",
  ALLOCATION_MOVED: "Dời khách sang chuyến khác",
  ALLOCATION_STOP_CHANGED: "Đổi điểm đón / trả theo đơn", // ADR-0050 VK1-B — lệnh "cập nhật điểm theo đơn" (cùng chuyến; khác ALLOCATION_MOVED — Ruling R-K1)
  ALLOCATION_PASSENGER_CHANGED: "Cập nhật khách theo đơn", // R-P29 (chủ lần 16) — lệnh "cập nhật khách theo đơn" (cùng chuyến; chỉ số lượng, không tên)
  DEPARTED: "Xuất bến",
  STOP_ARRIVED: "Đã tới điểm",
  PASSENGER_BOARDED: "Đã đón",
  PASSENGER_NO_SHOW: "Khách vắng",
  PASSENGER_CANCELLED_AT_STOP: "Khách đã huỷ",
  PASSENGER_DROPPED: "Đã trả",
  STOPS_REORDERED: "Đổi thứ tự điểm",
  ENDED: "Kết thúc",
  ENDED_INTERRUPTED: "Kết thúc gián đoạn",
  STOP_ADDED_RUNNING: "Văn phòng thêm điểm khi xe đang chạy",
  ALLOCATION_OFFICE_CANCELLED: "Văn phòng báo huỷ khách",
  PASSENGER_NAMED: "Tài xế bổ sung tên khách",
};

/**
 * ADR-0050 VK1-A (kế hoạch I35): loại sự kiện TIẾN ĐỘ mà văn phòng bấm thay được KHAI giờ xảy ra (`occurred_source = 'VAN_PHONG_KHAI'`) — tập con của
 * `LOAI_SU_KIEN_CHUYEN`. Mọi loại khác (sự kiện kế hoạch, đổi thứ tự điểm) luôn `MAY_CHU`: giờ xảy ra = giờ ghi nhận. Danh sách ở MÃ (I7), có bài kiểm.
 */
export const LOAI_SU_KIEN_KHAI_GIO = [
  "DEPARTED", "STOP_ARRIVED", "PASSENGER_BOARDED", "PASSENGER_NO_SHOW", "PASSENGER_CANCELLED_AT_STOP", "PASSENGER_DROPPED", "ENDED", "ENDED_INTERRUPTED",
] as const satisfies readonly LoaiSuKienChuyen[];
export type LoaiSuKienKhaiGio = (typeof LOAI_SU_KIEN_KHAI_GIO)[number];
export const isSuKienKhaiGio = (v: unknown): v is LoaiSuKienKhaiGio => typeof v === "string" && (LOAI_SU_KIEN_KHAI_GIO as readonly string[]).includes(v);
/** Ai quyết giờ xảy ra của một sự kiện (`vc_trip_event.occurred_source` — tập đóng, khớp `CHECK` của 0042). */
export const NGUON_GIO_XAY_RA = ["MAY_CHU", "VAN_PHONG_KHAI"] as const;
export type NguonGioXayRa = (typeof NGUON_GIO_XAY_RA)[number];

/** Luật CẤU HÌNH được phá lệ (ADR-0049 D2; [TK] §2.4) — mỗi mã cũng là một mã của `MA_GIU` (cùng chữ, một chỗ sống). Luật lõi LC-01…18 không ai phá lệ. */
// ADR-0056 VK3-A A3: thêm CAM_KET (cam kết xe riêng / số chỗ tối thiểu của khách). THIEU_GIA (ADR-0057 C5) KHÔNG phá lệ được — không thuộc tập này.
export const MA_LUAT_PHA_LE = ["MOC_TOI_THIEU", "KHOANG_NGHI", "CAM_KET"] as const;
export type MaLuatPhaLe = (typeof MA_LUAT_PHA_LE)[number];
export const isMaLuatPhaLe = (v: unknown): v is MaLuatPhaLe => typeof v === "string" && (MA_LUAT_PHA_LE as readonly string[]).includes(v);

// ---- Tập đóng (khớp CHECK của migration lõi chuyến) ------------------------------------------------------------------------------------------------------
export const TRANG_THAI_CHUYEN = ["PLANNED", "RUNNING", "ENDED", "ENDED_INTERRUPTED", "CANCELLED"] as const;
export type TrangThaiChuyen = (typeof TRANG_THAI_CHUYEN)[number];
/** Nhãn tiếng Việt của trạng thái chuyến — MỘT nguồn cho DTO của van-chuyen và màn hình (ADR-0059: khối xe trên chi tiết đơn đổi mã sang chữ ở giao diện). */
export const NHAN_TRANG_THAI_CHUYEN: Readonly<Record<TrangThaiChuyen, string>> = {
  PLANNED: "Đã lên kế hoạch",
  RUNNING: "Đang chạy",
  ENDED: "Đã kết thúc",
  ENDED_INTERRUPTED: "Kết thúc gián đoạn",
  CANCELLED: "Đã huỷ",
};
/** Trạng thái cuối — chuyến không sửa được nữa (LC-06). */
export const TRANG_THAI_CUOI_CHUYEN = ["ENDED", "ENDED_INTERRUPTED", "CANCELLED"] as const satisfies readonly TrangThaiChuyen[];

export const TRANG_THAI_SUAT = ["WAITING", "BOARDED", "NO_SHOW", "CANCELLED_AT_STOP", "DROPPED"] as const;
export type TrangThaiSuat = (typeof TRANG_THAI_SUAT)[number];
/** Kết quả cuối của một suất (LC-16: kết thúc thường chỉ khi mọi suất mở đã có một trong ba). `WAITING`, `BOARDED` đang chiếm chỗ (LC-02). */
export const KET_QUA_CUOI_SUAT = ["DROPPED", "NO_SHOW", "CANCELLED_AT_STOP"] as const satisfies readonly TrangThaiSuat[];

export const TRANG_THAI_DIEM = ["PENDING", "ARRIVED", "DONE", "SKIPPED", "MOVED"] as const;
export type TrangThaiDiem = (typeof TRANG_THAI_DIEM)[number];
export const LOAI_DIEM = ["PICKUP", "DROPOFF"] as const;
export type LoaiDiem = (typeof LOAI_DIEM)[number];
export const LOAI_SUAT = ["PASSENGER", "CREW"] as const;
export type LoaiSuat = (typeof LOAI_SUAT)[number];
/** Rời chuyến = ĐÓNG dòng suất (không đổi trạng thái), kèm một lý do ([TK] §1.12). */
export const LY_DO_DONG_SUAT = ["MOVED", "REMOVED", "TRIP_CANCELLED", "TRIP_INTERRUPTED", "TRANSFERRED", "STOP_CHANGED", "PASSENGER_CHANGED"] as const;
export type LyDoDongSuat = (typeof LY_DO_DONG_SUAT)[number];
/**
 * Lệnh nào đóng suất bằng mã nào — MỘT chỗ (bài kiểm khoá). `MOVED` = dời sang chuyến KHÁC; `STOP_CHANGED` = "cập nhật điểm theo đơn" trên CÙNG chuyến
 * (ADR-0050 VK1-B; Ruling R-K1 — không dùng lại MOVED). `TRANSFERRED` là của lượt 2 (chuyển điểm giữa hai xe) — chưa có lệnh.
 */
export const LENH_DONG_SUAT = {
  RUT: "REMOVED",
  DOI_DI: "MOVED",
  HUY_CO_KHACH: "TRIP_CANCELLED",
  KET_THUC_GIAN_DOAN: "TRIP_INTERRUPTED",
  DOI_DIEM_THEO_CHANG: "STOP_CHANGED",
  // R-P29 (chủ lần 16): "cập nhật khách theo đơn" — suất mang khoá người không còn trong đơn đóng bằng mã RIÊNG (không dùng lại STOP_CHANGED / REMOVED).
  DOI_KHACH_THEO_DON: "PASSENGER_CHANGED",
} as const satisfies Record<string, LyDoDongSuat>;

// ---- Kiểu VÀO của luật thuần ------------------------------------------------------------------------------------------------------------------------------
/** Chính sách điều phối đang hiệu lực (`vc_dispatch_policy`, dòng mới nhất ≤ bây giờ). `null` ở nơi dùng = bảng rỗng → CHẶN, không đoán. */
export interface ChinhSachVao {
  id: string;
  minLeadMinutes: number;
  warnLeadMinutes: number;
  restMinutes: number;
  requireManifest: boolean;
  requireContract: boolean;
  /** ADR-0055 VK2-B (0071): tổng giờ lái tối đa một ngày chạy (phút) — vượt chỉ cảnh báo. */
  dutyDayMaxMinutes: number;
  /** ADR-0055 VK2-B (0071): chuyến dài hơn (phút) → nhắc nghỉ — chỉ cảnh báo. */
  tripNoBreakMaxMinutes: number;
}
/** Dòng hạng bằng đang hiệu lực của MỘT hạng (`vc_license_capacity`). `maxPassengers` null = không giới hạn. Hạng không có dòng → CHẶN (không đoán). */
export interface HangBangVao {
  classCode: string;
  maxPassengers: number | null;
}
/** Điều kiện xuất bến ĐANG HIỆU LỰC (`vc_departure_rule`): xe từ `minCapacity` người → bắt buộc giấy tờ `documentTypeCode` của xe hoặc của tài xế. */
export interface DieuKienVao {
  id: string;
  minCapacity: number;
  subject: "VEHICLE" | "DRIVER";
  documentTypeCode: string;
}
/** Giấy tờ HIỆN HÀNH của xe (không số — số giấy tờ xe không cần cho luật). `expiryDate` null = không hạn. */
export interface GiayToXeVao {
  rowId: string;
  typeCode: string;
  expiryDate: string | null;
}
export interface XeVao {
  id: string;
  bienSo: string;
  /** Số người được chở KHÔNG kể tài xế (`vc_vehicle.passenger_capacity`). */
  soCho: number;
  trangThai: "active" | "maintenance" | "retired";
  chuXePartyId: string;
  /** Chủ xe là hồ sơ công ty chủ (Tour Đảo) — máy chủ tính qua hàm công bố của parties. */
  chuLaCongTy: boolean;
  giayTo: GiayToXeVao[];
}
/** Giấy tờ HIỆN HÀNH của tài xế — đúng hình `taiXeChoDieuPhoi` (kế hoạch mục 1.1): KHÔNG số, không nơi cấp. */
export interface GiayToTaiXeVao {
  rowId: string;
  typeCode: string;
  classCode: string | null;
  expiryDate: string | null;
}
/** Một tài xế — đúng hình phần tử `taiXeChoDieuPhoi` (kế hoạch mục 1.1). */
export interface TaiXeVao {
  partyId: string;
  displayName: string;
  loai: "CONG_TY" | "NHA_XE";
  carrierPartyIds: string[];
  giayTo: GiayToTaiXeVao[];
}
/** Chặng (hàm hẹp `lichChungChang` của orders + số người + khoá người của đơn). Chỉ khoá, mã, ngày giờ, cờ, con số — không tên, không SĐT. */
export interface ChangVao {
  legId: string;
  orderId: string;
  orderCode: string;
  chieu: "OUT" | "RETURN";
  /** Ngày đón dân sự giờ VN "YYYY-MM-DD" — trống chỉ ở đơn nháp chưa có ngày. */
  ngayDon: string | null;
  /** Giờ đón "HH:MM" giờ VN — trống = có hẹn nhưng chưa chốt giờ (không xếp được — I13). */
  gioDon: string | null;
  coNoiTra: boolean;
  donDaXacNhan: boolean;
  donDaHuy: boolean;
  changMo: boolean;
  /** Số người của chặng = số khách hiệu lực của dịch vụ, cả bốn loại tuổi (I12; LC-02 tính khách mọi lứa tuổi). */
  soNguoi: number;
  /** Khoá người (`person_key`) của hành khách HIỆN HÀNH của đơn — chỉ khoá. Số tên của chặng = min(soNguoi, số phần tử) (I12). */
  nguoiCuaDon: string[];
  /** Chặng mang dấu "đặt gấp" (`short_notice_reason` có). */
  datGap: boolean;
  /**
   * ADR-0050 VK1-B: KHOÁ SO SÁNH nơi đón / nơi trả hiện hành (`khoaNoi` của src/shared/khoa-noi.ts, do orders tính trên chữ CHƯA che): `L:<id điểm>` hoặc
   * `T:<sha256 hex>`; `khoaNoiTra` null = chặng chưa có nơi trả. CHỈ để so với `DiemVao.placeKey` — không bao giờ vào DTO, nhật ký, bản chụp.
   */
  khoaNoiDon: string;
  khoaNoiTra: string | null;
  /**
   * ADR-0056 VK3-A (A4): cam kết "xe riêng" của chặng (`exclusive_vehicle`) — chuyến chở chặng này không chở khách của đơn khác. BẮT BUỘC (không `?`):
   * `undefined` không được lặng lẽ hiểu là "không cam kết".
   */
  xeRieng: boolean;
  /** ADR-0056 VK3-A: số chỗ tối thiểu (`min_vehicle_seats`, cùng nghĩa `soCho` — không kể tài xế); null = không cam kết. BẮT BUỘC. */
  choToiThieu: number | null;
}
/** Suất trên chuyến (`vc_trip_allocation`). `mo` = dòng còn hiệu lực (`valid_to_at IS NULL`). */
export interface SuatVao {
  id: string;
  tripId: string;
  loai: LoaiSuat;
  legId: string | null;
  personKey: string | null;
  crewPartyId: string | null;
  boardStopId: string | null;
  alightStopId: string | null;
  trangThai: TrangThaiSuat;
  mo: boolean;
  /** ADR-0050 VK1-A vế 5: giờ ghi nhận MỞ suất (`valid_from_at`, mili-giây) — sự kiện của suất không được xảy ra sớm hơn. */
  moTuMs: number;
}
/** Điểm dừng (`vc_trip_stop`). */
export interface DiemVao {
  id: string;
  tripId: string;
  seq: number;
  loai: LoaiDiem;
  trangThai: TrangThaiDiem;
  /** ADR-0050 VK1-B: khoá so sánh nơi của điểm (`vc_trip_stop.place_key`) — đặt lúc dựng điểm từ chặng, không đổi; CHỈ để so, không hiển thị. */
  placeKey: string;
  /** Giờ xe tới GHI ĐÈ (`planned_date` + `planned_time`, I9) đổi ra mili-giây; null = theo giờ hẹn của chặng ([SOI] K-02: cảnh báo khi muộn hơn giờ hẹn). */
  gioXeToiMs: number | null;
}
/** Khung giờ một chuyến khác, cho luật trùng giờ (LC-03) và khoảng nghỉ (CH-02). */
export interface KhungChuyen {
  id: string;
  ma: string;
  xeId: string;
  taiXePartyId: string | null;
  batDauMs: number;
  ketThucMs: number;
  /** Mốc kết thúc THẬT (`ended_ms`) — chuyến đã kết thúc tính khoảng tới đây (I22). */
  ketThucThatMs: number | null;
  trangThai: TrangThaiChuyen;
  /** Giờ XẢY RA xuất bến (`departed_ms`) — mapper `khungChuyen` luôn đặt; giờ lái dùng cho chuyến đã chạy (ADR-0055 VK2-B). */
  xuatBenMs?: number | null;
}
/** Khung bận CÒN HIỆU LỰC (`vc_unavailability`, withdrawn_at IS NULL — ADR-0055 VK2-A; ADR-0053 D9.1). Đúng một trong xeId / taiXePartyId theo doiTuong. */
export interface KhungBanVao {
  id: string;
  doiTuong: "VEHICLE" | "DRIVER";
  xeId: string | null;
  taiXePartyId: string | null;
  batDauMs: number;
  ketThucMs: number;
  lyDoNhan: string;
}
/** Một chuyến đủ dữ liệu cho cổng xuất bến. */
export interface ChuyenVao {
  id: string;
  ma: string;
  /** Ngày chạy (`service_date`) = ngày VN của giờ bắt đầu (I10). */
  ngayChay: string;
  batDauMs: number;
  ketThucMs: number;
  ketThucThatMs: number | null;
  trangThai: TrangThaiChuyen;
  /** Giờ XẢY RA xuất bến (`departed_ms`) — mapper `chuyenVao` luôn đặt (ADR-0055 VK2-B). */
  xuatBenMs?: number | null;
  xe: XeVao;
  taiXe: TaiXeVao | null;
  /** Khoảng nghỉ đã chụp lúc tạo / sửa (`rest_minutes_snapshot` — 5.6). */
  nghiChup: number;
  /** Đã có Quản trị / Toàn quyền phá lệ khoảng nghỉ (`rest_override_reason_code` có). */
  nghiPhaLe: boolean;
  /** ADR-0057 C2a: cờ xe thuê chụp lúc xếp (`vc_trip.rented = 1`). */
  thue: boolean;
  /** ADR-0057 C5: có nguồn giá (SNAPSHOT / AGREED chưa đảo) — CHỈ cờ, không số tiền (bài số lạ). */
  coNguonGia: boolean;
  /**
   * ADR-0056 VK3-A: khoá tập vi phạm cam kết đã được Quản trị phá lệ (`vc_trip.commitment_override_key`, C4 — chuỗi nối id + con số); null = chưa phá lệ.
   * CHỈ để so với `kiemCamKet(...).khoa` — không bao giờ vào DTO, nhật ký. BẮT BUỘC.
   */
  camKetPhaLeKhoa: string | null;
}

// ---- Kiểu RA của luật thuần -------------------------------------------------------------------------------------------------------------------------------
/**
 * Kết quả kiểm một lệnh (tạo / sửa chuyến, xếp). `chan` = luật lõi hoặc luật không ai phá lệ → 409; `canPhaLe` = luật cấu hình (mốc, khoảng nghỉ) → 409
 * `can_pha_le` trừ khi người có ô `trip.override` gửi phá lệ kèm lý do. `ok` ⇔ cả hai rỗng. Hàm thuần KHÔNG biết quyền người gọi — route quyết.
 */
export interface KetQuaKiem {
  ok: boolean;
  chan: LyDoGiu[];
  canPhaLe: LyDoGiu[];
}
/** Một dòng con của bản chụp điều kiện xuất bến (`vc_trip_departure_check_item`) — khoá + giá trị sửa được tại chỗ (hạng, hạn); KHÔNG số giấy tờ. */
export interface MucChup {
  loai: "GPLX" | "GIAY_TO_XE" | "GIAY_TO_NGUOI" | "DIEU_KIEN";
  vehicleDocumentId: string | null;
  personDocumentId: string | null;
  documentTypeCode: string | null;
  licenseClassCode: string | null;
  expiryDate: string | null;
  ruleId: string | null;
}
/** Bản chụp điều kiện xuất bến (`vc_trip_departure_check` + dòng con) — lưu khoá trước, chỉ chép giá trị còn sửa tại chỗ (biển số, số chỗ, hạng, hạn). */
export interface BanChup {
  policyId: string | null;
  xeId: string;
  bienSo: string;
  soCho: number;
  chuXePartyId: string;
  taiXePartyId: string | null;
  /** Số phút nghỉ đã dùng để kiểm (từ `nghiChup`); null khi không có chuyến trước để so. */
  nghiDaDung: number | null;
  muc: MucChup[];
}
/** Gắn tên còn thiếu lúc xuất bến (I19b): suất chưa tên ← khoá người của đơn chưa có suất mở nào ở chặng đó. */
export interface GanTen {
  suatId: string;
  personKey: string;
}
export interface KetQuaXuatBen {
  dat: boolean;
  lyDo: LyDoGiu[];
  chup: BanChup;
  ganTen: GanTen[];
}
