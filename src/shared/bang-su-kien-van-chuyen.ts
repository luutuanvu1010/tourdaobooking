// BẢNG SỰ KIỆN VẬN CHUYỂN (việc 6b, 2026-10-09 — ĐỀ XUẤT, chủ chưa duyệt làm luật). Mỗi dòng = MỘT lệnh làm đổi dữ liệu chuyến xe (`vc_trip*`, ngoại trừ dòng chi phí `vc_trip_cost_line`), ghi mốc giờ
// hẹn (`vc_leg_appt_ack`), hoặc lệnh đơn làm máy đổi chuyến theo đơn (gọi `ctx.dongBoChuyen`) — kèm lệnh đơn đổi giờ chặng đã xếp mà KHÔNG đồng bộ (`PUT /trip`,
// G17) và các lệnh A5 đã duyệt nhưng chưa có mã (ADR-0111 Đ3). Mọi thứ khác (cấu hình, xe, giá, chi phí xe thuê) ở `NGOAI_PHAM_VI_*` kèm lý do.
//
// NGHĨA CỦA BẢNG: bảng ghi ĐÚNG những gì MÃ đang làm (bài `src/bang-su-kien-van-chuyen.test.ts` đối chiếu hai chiều). Chỗ mã khác chữ ADR đã duyệt, hoặc khác
// một quy tắc chung suy từ bảng (QT1…QT3), ghi ở `CHO_LECH` — không sửa mã ở việc này. Thêm lệnh mới: khai dòng ở đây TRƯỚC khi viết mã (dòng `chua_co_ma`).
// Cột "bảng bị ghi" (`bang`) và "luật" (`luat`) chỉ là chữ — dựa vào kỷ luật, bài không đối chiếu được.
// Logic thuần, không I/O, không import module (src/shared/ — luật kiến trúc).
import type { AuditAction } from "./audit-actions.ts";
import type { ThayDoiChuyen } from "./bang-tin.ts";
import type { LoaiSuKienChuyen, MaLuatPhaLe } from "./dieu-phoi-kieu.ts";
import { PERMISSION_CODES, PERMISSION_LABEL, type OperationCode, type PermissionCode, type Scope } from "./permissions.ts";
import type { LoaiTinChuyen } from "./tin-chuyen.ts";

// ---- Người mẫu (bài gọi hàm tin thật với từng người mẫu) ------------------------------------------------------------------------------------------------
/**
 * TX_* = tài khoản Tài xế công ty: ĐANG LÁI (dòng lái mở trước sự kiện, còn mở), VỪA XẾP (dòng lái mở đúng lúc sự kiện), VỪA GỠ (dòng lái đóng đúng lúc sự
 * kiện), NGUỒN (lái chuyến nguồn của lệnh dời / chuyển khách), KHÁC (không lái chuyến nào). Văn phòng: Bán hàng (không dính đơn), Bán hàng lập đơn, Bán hàng
 * đang PHỤ TRÁCH đơn (người lập là người khác), Kế toán,
 * Quản trị, Toàn quyền; HDV phụ trách đơn; NGUOI_LAM = người bấm lệnh (Bán hàng) — không bao giờ tự nhận tin của mình.
 */
export const NGUOI_MAU = [
  "TX_DANG_LAI", "TX_VUA_XEP", "TX_VUA_GO", "TX_NGUON", "TX_KHAC", "BAN_HANG", "BAN_HANG_LAP_DON", "BAN_HANG_PHU_TRACH", "KE_TOAN", "QUAN_TRI", "TOAN_QUYEN", "HDV_PHU_TRACH", "NGUOI_LAM",
] as const;
export type NguoiMau = (typeof NGUOI_MAU)[number];
/** Tài xế có dòng lái bao lúc sự kiện (ADR-0052 D6.2 "tài xế có dòng lái mở lúc sự kiện"). */
const TX_LUC: readonly NguoiMau[] = ["TX_DANG_LAI", "TX_VUA_XEP", "TX_VUA_GO"];
/** Người có `trip.dispatch` không ngữ cảnh (ô `any`): Bán hàng, Quản trị, Toàn quyền. */
const DIEU_PHOI: readonly NguoiMau[] = ["BAN_HANG", "BAN_HANG_LAP_DON", "BAN_HANG_PHU_TRACH", "QUAN_TRI", "TOAN_QUYEN"];
/** Người lập + người phụ trách đơn là văn phòng (có `trip.view`) — người nhận "khách vắng", "gọi báo khách" (ADR-0052 D6.2). */
const LAP_VA_PHU_TRACH: readonly NguoiMau[] = ["BAN_HANG_LAP_DON", "BAN_HANG_PHU_TRACH"];
export const NHAN_NGUOI_MAU: Readonly<Record<NguoiMau, string>> = {
  TX_DANG_LAI: "tài xế đang lái", TX_VUA_XEP: "tài xế vừa được xếp", TX_VUA_GO: "tài xế vừa bị gỡ", TX_NGUON: "tài xế chuyến nguồn", TX_KHAC: "tài xế khác",
  BAN_HANG: "Bán hàng", BAN_HANG_LAP_DON: "người lập đơn (Bán hàng)", BAN_HANG_PHU_TRACH: "người phụ trách đơn (Bán hàng)", KE_TOAN: "Kế toán", QUAN_TRI: "Quản trị", TOAN_QUYEN: "Toàn quyền",
  HDV_PHU_TRACH: "HDV phụ trách đơn", NGUOI_LAM: "người bấm",
};

/** Loại tin: loại của `tinChuyenCho`, hai loại của tin giờ hẹn MQ-07 (`tinGioHenCho`), và `chua_dat` cho lệnh chưa có mã. */
export type LoaiTin = LoaiTinChuyen | "gio_hen_tai_xe" | "gio_hen_goi_bao" | "chua_dat";
export interface NguoiNhan {
  ai: readonly NguoiMau[];
  loai: LoaiTin;
  /** Vắng = mọi tình huống khả thi của dòng; `xe_dang_chay` = chỉ khi chuyến đã xuất bến lúc sự kiện; `bo_qua_luat` = chỉ khi sự kiện mang luật bị bỏ qua. */
  khi?: "xe_dang_chay" | "bo_qua_luat";
}
/** `khach` = HANH_DONG_TIN_KHACH (xếp / rút / dời — có điều kiện); `thuong` = HANH_DONG_TIN_THUONG; `gio_hen` = HANH_DONG_TIN_GIO_HEN (việc nhật ký đơn). */
export interface Tin {
  nhom: "khach" | "thuong" | "gio_hen";
  nhan: readonly NguoiNhan[];
}

export interface RouteDong {
  phuongThuc: "POST" | "PUT";
  duongDan: string;
  cong: "office" | "staff" | "orders";
  /** Ô quyền route hỏi. Dòng chưa có mã: tên dự kiến (chuỗi). */
  o: OperationCode | string;
  /** Cách hỏi: `khong` = `can(staff, ô)` không ngữ cảnh (chỉ ô `any` qua); còn lại có ngữ cảnh; `MATRIX_TRUC_TIEP` = đọc thẳng ma trận (route HDV sửa số khách). */
  ngucanh: "khong" | "assigned" | "ownerId" | "ownerId+assigned" | "MATRIX_TRUC_TIEP";
  /** Ai có ô này (mọi cột khác `none` của ma trận) — bài so với `MATRIX`. */
  ai: Partial<Record<PermissionCode, Scope>>;
  /** Hàm xử lý mà thân route gọi. */
  ham: string;
  /** Ô hỏi ĐẦU TIÊN trong thân (lọc thô trước khi đọc chuyến) khi khác `o` — vd. route tài xế hỏi `trip.view` trước `trip.progress`. */
  oDau?: OperationCode;
}
export type LoaiLenh = "ke_hoach" | "tien_do" | "dieu_chinh" | "may_dong_bo" | "don_khong_dong_bo" | "moc_gio_hen" | "chuyen_khach";
export interface DongSuKien {
  id: string;
  ten: string;
  loai: LoaiLenh;
  trangThai: "co_ma" | "chua_co_ma";
  routes: readonly RouteDong[];
  /** Trạng thái chuyến lúc lệnh chạy được (tình huống bài xét tin). */
  trangThaiChuyen: readonly ("PLANNED" | "RUNNING")[];
  /** Luật cấu hình bỏ qua được (lớp theo ADR-0104 Đ1: `trip.urgent_adjust` dưới mốc / `trip.override` ngoài mốc). Rỗng = không bỏ qua được luật nào. */
  vuot: readonly MaLuatPhaLe[];
  luat: string;
  bang: readonly string[];
  suKien: LoaiSuKienChuyen | string | null;
  nhatKy: AuditAction | string | null;
  /** Việc nhật ký phía ĐƠN (orders) cùng lô. */
  nhatKyDon?: readonly AuditAction[];
  /** Hàm dựng lô ở `src/modules/van-chuyen/dieu-phoi.ts` (bài thứ tự lô). `loKhoa` = khoá của `LENH_SUAT` khi một hàm dựng lô phục vụ nhiều lệnh. */
  lo: string | null;
  loKhoa?: string;
  /** Ai báo Bảng tin / tin: `route` = thân route gọi `baoThayDoiChuyen`; `may_dong_bo` = qua `dongBoChuyen` (gốc lắp ráp báo từng khúc thắng); `khong`. */
  bao: "route" | "may_dong_bo" | "khong";
  /** Sự kiện ghi ở chuyến ĐÍCH, chuyến nguồn ở `related_trip_id` (dời khách, chuyển khách). */
  suKienCoChuyenNguon?: true;
  tin: Tin | null;
  /** Tin sinh từ việc nhật ký phía ĐƠN (`nhom: "gio_hen"` — MQ-07). */
  tinDon?: Tin;
  /** Loại thay đổi Bảng tin (`thayDoiCuaHanhDongChuyen`); `bangTinXeChay` khi chuyến đã xuất bến lúc sự kiện (vắng = như `bangTin`). */
  bangTin: ThayDoiChuyen | null;
  bangTinXeChay?: ThayDoiChuyen;
  nguon: string;
}

// ---- Ô quyền (chép từ ma trận — bài so lại) -----------------------------------------------------------------------------------------------------------------
const O_DIEU_PHOI = { SALES: "any", ADMIN: "any", SUPER_ADMIN: "any" } as const;
// A4 (ADR-0053 D7.1 :46, :51): tài xế đối tác có `trip.view`, `trip.progress` = assigned — khai TRƯỚC mã (luật bảng 2026-10-09); bài (c) đỏ tới khi lật ô (T6).
const O_TIEN_DO = { SALES: "any", ADMIN: "any", SUPER_ADMIN: "any", DRIVER: "assigned", DRIVER_PARTNER: "assigned" } as const;
const O_SUA_CHUYEN_DON = { SALES: "ownOrAssigned", ADMIN: "any", SUPER_ADMIN: "any" } as const;
/** Ô `trip.transfer` (ADR-0052 D4.3; ADR-0111 N1; ADR-0053 :46 — nới N4: tài xế đối tác `assigned`, mở sau khi A4 gộp). */
const O_CHUYEN_KHACH = { SUPER_ADMIN: "any", DRIVER: "assigned", DRIVER_PARTNER: "assigned" } as const;
const O_VUOT = { ADMIN: "any", SUPER_ADMIN: "any" } as const;
const vp = (duongDan: string, o: OperationCode, ai: RouteDong["ai"], ham: string, ngucanh: RouteDong["ngucanh"] = "khong"): RouteDong =>
  ({ phuongThuc: "POST", duongDan, cong: "office", o, ngucanh, ai, ham });
/** Cặp route tiến độ: tài xế bấm (cổng staff, ô assigned) ↔ văn phòng bấm thay (cổng office, ô không ngữ cảnh) — CÙNG một hàm xử lý. */
const capTienDo = (duoi: string, ham: string): RouteDong[] => [
  { phuongThuc: "POST", duongDan: `/api/van-chuyen/cuoc-cua-toi/:id${duoi}`, cong: "staff", o: "trip.progress", oDau: "trip.view", ngucanh: "assigned", ai: O_TIEN_DO, ham },
  vp(`/api/van-chuyen/chuyen/:id${duoi}`, "trip.progress", O_TIEN_DO, ham),
];
const LO_CHUNG = ["vc_trip", "vc_trip_event", "audit_log"] as const;

// ---- Các dòng ----------------------------------------------------------------------------------------------------------------------------------------------
export const BANG_SU_KIEN_VAN_CHUYEN: readonly DongSuKien[] = [
  // Kế hoạch chuyến (văn phòng) — ADR-0049 D1; lớp bỏ qua luật: ADR-0104 Đ1 mục 2.
  {
    id: "tao-chuyen", ten: "Tạo chuyến", loai: "ke_hoach", trangThai: "co_ma",
    routes: [vp("/api/van-chuyen/chuyen", "trip.dispatch", O_DIEU_PHOI, "loTaoChuyen")], trangThaiChuyen: ["PLANNED"], vuot: ["KHOANG_NGHI"],
    luat: "xe đang dùng, tài xế không chéo xe (LC-13), không trùng giờ, khung bận xe, giờ lái; chụp giá xe thuê",
    bang: [...LO_CHUNG, "vc_trip_driver", "vc_trip_cost_line"], suKien: "CREATED", nhatKy: "trip_created", lo: "loTaoChuyen", bao: "route",
    tin: { nhom: "thuong", nhan: [{ ai: TX_LUC, loai: "xep_lai" }] }, bangTin: "tao", nguon: "ADR-0049 D1; ADR-0104 Đ1.2; ADR-0052 D6.2",
  },
  {
    id: "sua-chuyen", ten: "Sửa chuyến (giờ, xe, tài xế, điểm)", loai: "ke_hoach", trangThai: "co_ma",
    routes: [{ ...vp("/api/van-chuyen/chuyen/:id", "trip.dispatch", O_DIEU_PHOI, "lenhSuaChuyen"), phuongThuc: "PUT" }], trangThaiChuyen: ["PLANNED"],
    vuot: ["MOC_TOI_THIEU", "KHOANG_NGHI", "CAM_KET"], luat: "như tạo chuyến + cam kết xe riêng của khách đang trên xe; đổi xe / tài xế dưới mốc",
    bang: [...LO_CHUNG, "vc_trip_driver", "vc_trip_stop", "vc_trip_cost_line"], suKien: "UPDATED", nhatKy: "trip_edited", lo: "loSuaChuyen", bao: "route",
    tin: { nhom: "thuong", nhan: [{ ai: ["TX_DANG_LAI"], loai: "doi_chuyen" }, { ai: ["TX_VUA_XEP"], loai: "xep_lai" }, { ai: ["TX_VUA_GO"], loai: "go_lai" }] },
    bangTin: "sua", nguon: "ADR-0049 D1; ADR-0104 Đ1.2, Đ1.6; ADR-0052 D6.2",
  },
  {
    id: "xep", ten: "Xếp khách lên xe", loai: "ke_hoach", trangThai: "co_ma",
    routes: [vp("/api/van-chuyen/chuyen/:id/phan-bo", "trip.dispatch", O_DIEU_PHOI, "lenhXep")], trangThaiChuyen: ["PLANNED"], vuot: ["MOC_TOI_THIEU", "CAM_KET"],
    luat: "sức chứa (LC-02), mỗi khách một suất mở (LC-01), đơn đã xác nhận, chặng có mốc giờ hẹn", bang: [...LO_CHUNG, "vc_trip_stop", "vc_trip_allocation", "vc_leg_appt_ack"],
    suKien: "ALLOCATED", nhatKy: "trip_allocated", lo: "loXep", bao: "route",
    tin: { nhom: "khach", nhan: [{ ai: TX_LUC, loai: "khan_cap", khi: "bo_qua_luat" }] }, bangTin: "xep", nguon: "ADR-0049 D1; ADR-0104 Đ1.6 + CAO-C (SYSTEM-DESIGN §16)",
  },
  {
    id: "them-diem-xe-chay", ten: "Thêm điểm / khách khi xe đang chạy", loai: "ke_hoach", trangThai: "co_ma",
    routes: [vp("/api/van-chuyen/chuyen/:id/them-diem", "trip.dispatch", O_DIEU_PHOI, "lenhThemDiemDangChay")], trangThaiChuyen: ["RUNNING"], vuot: ["MOC_TOI_THIEU", "CAM_KET"],
    luat: "chuyến đang chạy (LC-15 đường 1), sức chứa; luôn dưới mốc nên là điều chỉnh khẩn cấp trừ chặng đặt gấp",
    bang: [...LO_CHUNG, "vc_trip_stop", "vc_trip_allocation", "vc_leg_appt_ack", "vc_trip_manifest"], suKien: "STOP_ADDED_RUNNING", nhatKy: "trip_stop_added_running",
    lo: "loThemDiemDangChay", bao: "route", tin: { nhom: "thuong", nhan: [{ ai: TX_LUC, loai: "xe_chay_doi", khi: "xe_dang_chay" }] }, bangTin: "xe_chay",
    nguon: "ADR-0052 D5.1; ADR-0104 Đ1.2",
  },
  {
    id: "bao-huy-khach", ten: "Văn phòng báo khách huỷ (xe đang chạy)", loai: "ke_hoach", trangThai: "co_ma",
    routes: [vp("/api/van-chuyen/chuyen/:id/phan-bo/:aid/bao-huy", "trip.dispatch", O_DIEU_PHOI, "lenhBaoHuy")], trangThaiChuyen: ["RUNNING"], vuot: [],
    luat: "chỉ đặt cờ, suất vẫn chiếm chỗ; lý do nhóm BAO_HUY_DIEM; báo lần hai → 409", bang: [...LO_CHUNG, "vc_trip_allocation"],
    suKien: "ALLOCATION_OFFICE_CANCELLED", nhatKy: "trip_allocation_office_cancelled", lo: "loBaoHuy", bao: "route",
    tin: { nhom: "thuong", nhan: [{ ai: TX_LUC, loai: "xe_chay_doi", khi: "xe_dang_chay" }] }, bangTin: "xe_chay", nguon: "ADR-0052 D5.2, D6.2",
  },
  {
    id: "rut", ten: "Rút khách khỏi xe", loai: "ke_hoach", trangThai: "co_ma",
    routes: [vp("/api/van-chuyen/chuyen/:id/rut", "trip.dispatch", O_DIEU_PHOI, "lenhRut")], trangThaiChuyen: ["PLANNED"], vuot: ["MOC_TOI_THIEU"],
    luat: "điểm hết khách bỏ qua; cam kết xét lại sau giảm (rút không bị cam kết chặn)", bang: [...LO_CHUNG, "vc_trip_allocation", "vc_trip_stop"],
    suKien: "ALLOCATION_REMOVED", nhatKy: "trip_allocation_removed", lo: "loRut", bao: "route",
    tin: { nhom: "khach", nhan: [{ ai: TX_LUC, loai: "khan_cap", khi: "bo_qua_luat" }] }, bangTin: "rut", nguon: "ADR-0049 D1; ADR-0104 Đ1.6 + CAO-C",
  },
  {
    id: "doi", ten: "Dời khách sang chuyến khác", loai: "ke_hoach", trangThai: "co_ma",
    routes: [vp("/api/van-chuyen/chuyen/:id/doi", "trip.dispatch", O_DIEU_PHOI, "lenhDoi")], trangThaiChuyen: ["PLANNED"], vuot: ["MOC_TOI_THIEU", "CAM_KET"],
    luat: "cổng đôi (nguồn rồi đích); sức chứa đích; sự kiện ghi ở chuyến đích", bang: [...LO_CHUNG, "vc_trip_allocation", "vc_trip_stop"],
    suKien: "ALLOCATION_MOVED", nhatKy: "trip_allocation_moved", lo: "loDoi", bao: "route", suKienCoChuyenNguon: true,
    tin: { nhom: "khach", nhan: [{ ai: TX_LUC, loai: "khan_cap", khi: "bo_qua_luat" }, { ai: ["TX_NGUON"], loai: "khan_cap", khi: "bo_qua_luat" }] }, bangTin: "doi",
    nguon: "ADR-0049 D1; ADR-0104 Đ1.6 + phiếu kiểm D1 CAO-2",
  },
  {
    id: "huy-chuyen", ten: "Huỷ chuyến", loai: "ke_hoach", trangThai: "co_ma",
    routes: [vp("/api/van-chuyen/chuyen/:id/huy", "trip.dispatch", O_DIEU_PHOI, "lenhHuy")], trangThaiChuyen: ["PLANNED"], vuot: ["MOC_TOI_THIEU"],
    luat: "chuyến còn khách dưới mốc → điều chỉnh khẩn cấp; đóng mọi suất, dòng lái, điểm; huỷ chi phí xe thuê",
    bang: [...LO_CHUNG, "vc_trip_allocation", "vc_trip_driver", "vc_trip_stop", "vc_trip_cost_line"], suKien: "CANCELLED", nhatKy: "trip_cancelled", lo: "loHuy", bao: "route",
    tin: { nhom: "thuong", nhan: [{ ai: TX_LUC, loai: "huy_chuyen" }] }, bangTin: "huy", nguon: "ADR-0049 D1; ADR-0104 Đ1.2; ADR-0052 D6.2",
  },
  {
    id: "cap-nhat-diem", ten: "Cập nhật điểm theo đơn (nút tay)", loai: "ke_hoach", trangThai: "co_ma",
    routes: [vp("/api/van-chuyen/chuyen/:id/cap-nhat-diem", "trip.dispatch", O_DIEU_PHOI, "lenhCapNhatDiem")], trangThaiChuyen: ["PLANNED", "RUNNING"], vuot: [],
    luat: "máy tự tìm suất lệch nơi; không khoá theo mốc; không lệch → không ghi", bang: [...LO_CHUNG, "vc_trip_stop", "vc_trip_allocation"],
    suKien: "ALLOCATION_STOP_CHANGED", nhatKy: "trip_stops_synced", lo: "loCapNhatDiem", bao: "route",
    // ADR-0112 Đ2: xe CHƯA chạy cũng báo tài xế đang lái (cùng loại, cùng câu với xe đang chạy) — từ mốc phát hành (Đ5).
    tin: { nhom: "thuong", nhan: [{ ai: TX_LUC, loai: "xe_chay_doi" }] }, bangTin: "cap_nhat", bangTinXeChay: "xe_chay",
    nguon: "ADR-0050 VK1-B; ADR-0052 D5.3a, D6.1; ADR-0112 Đ2",
  },
  {
    id: "cap-nhat-khach", ten: "Cập nhật khách theo đơn (nút tay)", loai: "ke_hoach", trangThai: "co_ma",
    routes: [vp("/api/van-chuyen/chuyen/:id/cap-nhat-khach", "trip.dispatch", O_DIEU_PHOI, "lenhCapNhatKhach")], trangThaiChuyen: ["PLANNED"], vuot: [],
    luat: "cùng luật thuần với máy đồng bộ (đơn huỷ, chặng đóng, khách đổi, thừa suất); không khoá theo mốc", bang: [...LO_CHUNG, "vc_trip_allocation", "vc_trip_stop"],
    suKien: "ALLOCATION_PASSENGER_CHANGED", nhatKy: "trip_passengers_synced", lo: "loCapNhatKhach", bao: "route",
    // ADR-0112 Đ1: nút tay báo tài xế đang lái cùng tin "khach_doi" với máy đồng bộ — nhóm tin THƯỜNG, từ mốc phát hành (Đ5).
    tin: { nhom: "thuong", nhan: [{ ai: TX_LUC, loai: "khach_doi" }] }, bangTin: "cap_nhat",
    nguon: "R-P29 (chủ lần 16); ADR-0104 Đ2.11; ADR-0112 Đ1",
  },

  // Tiến độ (tài xế bấm ↔ văn phòng bấm thay) — ADR-0049 D3; giờ xảy ra: ADR-0050 VK1-A.
  {
    id: "xuat-ben", ten: "Xuất bến", loai: "tien_do", trangThai: "co_ma", routes: capTienDo("/xuat-ben", "lenhXuatBen"), trangThaiChuyen: ["PLANNED"], vuot: [],
    luat: "điều kiện xuất bến (giấy tờ xe, bằng lái, khoảng nghỉ, cửa sổ giờ); chốt danh sách", bang: [...LO_CHUNG, "vc_trip_allocation", "vc_trip_departure_check", "vc_trip_departure_check_item", "vc_trip_manifest"],
    suKien: "DEPARTED", nhatKy: "trip_departed", lo: "loXuatBen", bao: "route", tin: null, bangTin: "xuat_ben", nguon: "ADR-0049 D3; ADR-0050 VK1-A",
  },
  {
    id: "da-toi", ten: "Xe đã tới điểm", loai: "tien_do", trangThai: "co_ma", routes: capTienDo("/diem/:sid/da-toi", "lenhDaToi"), trangThaiChuyen: ["RUNNING"], vuot: [],
    luat: "chuyến đang chạy; điểm chưa tới", bang: [...LO_CHUNG, "vc_trip_stop"], suKien: "STOP_ARRIVED", nhatKy: "trip_stop_arrived", lo: "loDaToi", bao: "route",
    tin: null, bangTin: "tien_do", nguon: "ADR-0049 D3",
  },
  {
    id: "da-don", ten: "Đã đón khách", loai: "tien_do", trangThai: "co_ma", routes: capTienDo("/phan-bo/:aid/don", "lenhDaDon"), trangThaiChuyen: ["RUNNING"], vuot: [],
    luat: "điểm lên đã tới; từ Chờ / Vắng (LC-07)", bang: [...LO_CHUNG, "vc_trip_allocation", "vc_trip_stop"], suKien: "PASSENGER_BOARDED", nhatKy: "trip_passenger_boarded",
    lo: "loSuat", loKhoa: "DA_DON", bao: "route", tin: null, bangTin: "tien_do", nguon: "ADR-0049 D3",
  },
  {
    id: "vang", ten: "Khách vắng", loai: "tien_do", trangThai: "co_ma", routes: capTienDo("/phan-bo/:aid/vang", "lenhVang"), trangThaiChuyen: ["RUNNING"], vuot: [],
    luat: "điểm lên đã tới; từ Chờ", bang: [...LO_CHUNG, "vc_trip_allocation", "vc_trip_stop"], suKien: "PASSENGER_NO_SHOW", nhatKy: "trip_passenger_no_show",
    lo: "loSuat", loKhoa: "VANG", bao: "route", tin: { nhom: "thuong", nhan: [{ ai: LAP_VA_PHU_TRACH, loai: "khach_vang" }] }, bangTin: "vang",
    nguon: "ADR-0049 D3; ADR-0052 D6.2 (người lập + phụ trách có trip.view)",
  },
  {
    id: "khach-huy-tai-diem", ten: "Khách đã huỷ tại điểm", loai: "tien_do", trangThai: "co_ma", routes: capTienDo("/phan-bo/:aid/khach-huy", "lenhKhachHuy"),
    trangThaiChuyen: ["RUNNING"], vuot: [], luat: "điểm lên đã tới; từ Chờ", bang: [...LO_CHUNG, "vc_trip_allocation", "vc_trip_stop"], suKien: "PASSENGER_CANCELLED_AT_STOP",
    nhatKy: "trip_passenger_cancelled_at_stop", lo: "loSuat", loKhoa: "KHACH_HUY", bao: "route", tin: null, bangTin: "tien_do", nguon: "ADR-0049 D3; ADR-0052 D5.2",
  },
  {
    id: "da-tra", ten: "Đã trả khách", loai: "tien_do", trangThai: "co_ma", routes: capTienDo("/phan-bo/:aid/tra", "lenhDaTra"), trangThaiChuyen: ["RUNNING"], vuot: [],
    luat: "điểm xuống đã tới; từ Đã đón", bang: [...LO_CHUNG, "vc_trip_allocation", "vc_trip_stop"], suKien: "PASSENGER_DROPPED", nhatKy: "trip_passenger_dropped",
    lo: "loSuat", loKhoa: "DA_TRA", bao: "route", tin: null, bangTin: "tien_do", nguon: "ADR-0049 D3",
  },
  {
    id: "ket-thuc", ten: "Kết thúc chuyến", loai: "tien_do", trangThai: "co_ma", routes: capTienDo("/ket-thuc", "lenhKetThuc"), trangThaiChuyen: ["RUNNING"], vuot: [],
    luat: "không còn khách / điểm chưa xong (LC-16 ở CSDL)", bang: [...LO_CHUNG], suKien: "ENDED", nhatKy: "trip_ended", lo: "loKetThuc", bao: "route", tin: null,
    bangTin: "ket_thuc", nguon: "ADR-0049 D3",
  },
  {
    id: "ket-thuc-gian-doan", ten: "Kết thúc chuyến gián đoạn", loai: "tien_do", trangThai: "co_ma", routes: capTienDo("/ket-thuc-gian-doan", "lenhKetThucGianDoan"),
    trangThaiChuyen: ["RUNNING"], vuot: [], luat: "lý do nhóm KET_THUC_GIAN_DOAN; đóng suất còn lại, bỏ điểm", bang: [...LO_CHUNG, "vc_trip_allocation", "vc_trip_stop"],
    suKien: "ENDED_INTERRUPTED", nhatKy: "trip_ended_interrupted", lo: "loKetThucGianDoan", bao: "route", tin: { nhom: "thuong", nhan: [{ ai: DIEU_PHOI, loai: "gian_doan" }] },
    bangTin: "gian_doan", nguon: "ADR-0049 D3; ADR-0052 D6.2 (người có trip.dispatch any)",
  },
  {
    id: "doi-thu-tu", ten: "Đổi thứ tự điểm khi đang chạy", loai: "tien_do", trangThai: "co_ma", routes: capTienDo("/thu-tu", "lenhDoiThuTu"), trangThaiChuyen: ["RUNNING"],
    vuot: [], luat: "chỉ chặn ngược thứ tự mới (đón trước trả)", bang: [...LO_CHUNG, "vc_trip_stop"], suKien: "STOPS_REORDERED", nhatKy: "trip_stops_reordered", lo: "loDoiThuTu",
    bao: "route", tin: null, bangTin: "tien_do", nguon: "ADR-0049 D3; ADR-0110",
  },
  {
    id: "bo-sung-ten", ten: "Tài xế bổ sung tên khách", loai: "tien_do", trangThai: "co_ma",
    routes: [{ phuongThuc: "POST", duongDan: "/api/van-chuyen/cuoc-cua-toi/:id/hanh-khach", cong: "staff", o: "trip.passenger.add", ngucanh: "assigned", ai: { SUPER_ADMIN: "any", DRIVER: "assigned" }, ham: "lenhBoSungTen" }],
    trangThaiChuyen: ["PLANNED", "RUNNING"], vuot: [], luat: "chuyến mình đang lái, trong ngày chạy; cùng luật nhập tên ở đơn",
    bang: [...LO_CHUNG, "vc_trip_allocation", "vc_trip_manifest", "ord_passenger (câu do orders cấp)"], suKien: "PASSENGER_NAMED", nhatKy: "trip_passenger_named", lo: "loBoSungTen",
    bao: "route", tin: null, bangTin: "sua", nguon: "ADR-0052 D5b",
  },

  // A4 (ADR-0053 D8): tài xế đối tác TỪ CHỐI chuyến trước hạn — chỉ người đang lái bấm (văn phòng không từ chối thay — :105, :224; mục N-TU-CHOI). Khai TRƯỚC
  // mã (luật bảng 2026-10-09); có mã từ A4 T7. Loại tin
  // "tu_choi" (D8.4 bước 5: người có trip.dispatch — không tên, không lý do, không mã đơn); tài xế bị đóng dòng là chính người bấm (E3) nên không nhận.
  {
    id: "tu-choi", ten: "Tài xế đối tác từ chối chuyến (trước hạn)", loai: "tien_do", trangThai: "co_ma",
    routes: [{ phuongThuc: "POST", duongDan: "/api/van-chuyen/cuoc-cua-toi/:id/tu-choi", cong: "staff", o: "trip.refuse", ngucanh: "assigned", ai: { SUPER_ADMIN: "any", DRIVER_PARTNER: "assigned" }, ham: "lenhTuChoi" }],
    trangThaiChuyen: ["PLANNED"], vuot: [],
    luat: "chuyến mình đang lái, chưa chạy, trước hạn từ chối của cặp (khoá dính, B8.3 — lớp CSDL so giờ CSDL); lý do nhóm TU_CHOI_CHUYEN; người đóng = chính tài xế (B8.2); chuyến không có suất đang mở nhận chuyển vào (ADR-0113)",
    bang: [...LO_CHUNG, "vc_trip_driver"], suKien: "DRIVER_REFUSED", nhatKy: "trip_driver_refused", lo: "loTuChoi", bao: "route",
    tin: { nhom: "thuong", nhan: [{ ai: DIEU_PHOI, loai: "tu_choi" }] }, bangTin: "sua", nguon: "ADR-0053 D8.3, D8.4 (bước 5), D8.6; kế hoạch A4 G-A4-14, G-A4-15; ADR-0113",
  },

  // Điều chỉnh có lý do (chỉ văn phòng) — ADR-0097.
  {
    id: "dieu-chinh-suat", ten: "Văn phòng điều chỉnh kết quả một khách", loai: "dieu_chinh", trangThai: "co_ma",
    routes: [vp("/api/van-chuyen/chuyen/:id/phan-bo/:aid/dieu-chinh", "trip.progress", O_TIEN_DO, "lenhDieuChinhSuat")], trangThaiChuyen: ["RUNNING"], vuot: [],
    luat: "chuyến đang chạy; bảng điều chỉnh được phép; lý do nhóm DIEU_CHINH", bang: [...LO_CHUNG, "vc_trip_allocation", "vc_trip_manifest", "vc_trip_stop"],
    suKien: "CORRECTION", nhatKy: "trip_allocation_corrected", lo: "loDieuChinh", bao: "route",
    tin: { nhom: "thuong", nhan: [{ ai: TX_LUC, loai: "xe_chay_doi", khi: "xe_dang_chay" }, { ai: DIEU_PHOI, loai: "dieu_chinh" }] }, bangTin: "xe_chay",
    nguon: "ADR-0097 Đ2, Đ5",
  },
  {
    id: "thu-hoi-xuat-ben", ten: "Văn phòng thu hồi xuất bến", loai: "dieu_chinh", trangThai: "co_ma",
    routes: [vp("/api/van-chuyen/chuyen/:id/thu-hoi-xuat-ben", "trip.progress", O_TIEN_DO, "lenhThuHoiXuatBen")], trangThaiChuyen: ["RUNNING"], vuot: [],
    luat: "chưa có sự kiện tiến độ sau xuất bến; về Chưa chạy", bang: [...LO_CHUNG], suKien: "DEPARTURE_REVOKED", nhatKy: "trip_departure_revoked", lo: "loThuHoiXuatBen",
    bao: "route", tin: { nhom: "thuong", nhan: [{ ai: TX_LUC, loai: "thu_hoi_xuat_ben" }, { ai: DIEU_PHOI, loai: "dieu_chinh" }] }, bangTin: "sua", nguon: "ADR-0097 Đ3, Đ5",
  },

  // Lệnh đơn làm MÁY đổi chuyến theo đơn — ADR-0104 Đ2.4 (tám điểm gọi). Máy chỉ ghi chuyến chưa chạy (Đ2.7).
  ...([
    ["dong-bo-sua-chang", "Sửa chặng (số người, giờ, nơi) — máy cập nhật chuyến", "PUT", "/api/orders/:id/legs/:legId", "orders", "order.trip.edit", "ownerId+assigned", O_SUA_CHUYEN_DON, "soanSuaChang", ["order_leg_updated"]],
    ["dong-bo-bo-chang", "Bỏ chặng — máy cập nhật chuyến", "POST", "/api/orders/:id/legs/:legId/close", "orders", "order.trip.edit", "ownerId+assigned", O_SUA_CHUYEN_DON, "soanSuaChang", ["order_leg_closed"]],
    ["dong-bo-thay-chang", "Thay chặng — máy cập nhật chuyến", "POST", "/api/orders/:id/legs/:legId/replace", "orders", "order.trip.edit", "ownerId+assigned", O_SUA_CHUYEN_DON, "soanThayChang", ["order_leg_closed", "order_leg_added"]],
    ["dong-bo-hanh-khach", "Thêm / sửa / huỷ khách của đơn — máy cập nhật chuyến", "POST", "/api/orders/:id/passengers", "orders", "order.passenger.write", "ownerId+assigned",
      { SALES: "ownOrAssigned", ADMIN: "any", PARTNER: "own", SUPER_ADMIN: "any", INTERN: "own" }, "soanDoiKhach", ["order_passenger_changed"]],
    ["dong-bo-so-khach-vp", "Văn phòng sửa số khách — máy cập nhật chuyến", "POST", "/api/orders/:id/money-edit", "office", "order.money.edit", "ownerId",
      { SALES: "own", ACCOUNTING: "any", ADMIN: "any", FIELD: "assigned", SUPER_ADMIN: "any" }, "soanSuaSoKhach", ["order_money_adjusted"]],
    ["dong-bo-huy-don", "Huỷ đơn — máy cập nhật chuyến", "POST", "/api/orders/:id/status", "orders", "order.modify", "ownerId+assigned",
      { SALES: "ownOrAssigned", ADMIN: "any", PARTNER: "own", SUPER_ADMIN: "any", INTERN: "own" }, "soanHuyDon", ["cancelled"]],
    ["dong-bo-hdv-huy-don", "HDV huỷ đơn đang phụ trách — máy cập nhật chuyến", "POST", "/api/orders/:id/handler-cancel", "staff", "order.cancel", "assigned",
      { FIELD: "assigned", SUPER_ADMIN: "any" }, "cancelOrderByHandler", ["order_cancelled_by_field"]],
    ["dong-bo-hdv-so-khach", "HDV sửa số khách — máy cập nhật chuyến", "POST", "/api/orders/:id/handler-money-edit", "staff", "order.money.edit", "MATRIX_TRUC_TIEP",
      { FIELD: "assigned", SUPER_ADMIN: "any" }, "editMoneyAsHandler", ["order_money_adjusted_by_field"]],
  ] as const).map(([id, ten, phuongThuc, duongDan, cong, o, ngucanh, ai, ham, nhatKyDon]): DongSuKien => ({
    id, ten, loai: "may_dong_bo", trangThai: "co_ma", routes: [{ phuongThuc, duongDan, cong, o, ngucanh, ai, ham }], trangThaiChuyen: ["PLANNED"], vuot: [],
    luat: "cổng đơn thắng thì mới ghi chuyến (v_aud_order_cmd); chỉ chuyến chưa chạy; trần 74 câu phần chuyến; không miễn luật lõi",
    bang: ["câu đơn (orders)", ...LO_CHUNG, "vc_trip_allocation", "vc_trip_stop"], suKien: "ALLOCATION_ORDER_SYNCED", nhatKy: "trip_order_synced", nhatKyDon, lo: "loDongBoChuyen",
    bao: "may_dong_bo", tin: { nhom: "thuong", nhan: [{ ai: TX_LUC, loai: "khach_doi" }] },
    // MQ-07 (ADR-0052 D6.2): sửa chặng đang có suất mở → tin giờ hẹn cho tài xế đang lái + người lập / phụ trách qua được ô "Đã gọi báo".
    ...((nhatKyDon as readonly string[]).includes("order_leg_updated")
      ? { tinDon: { nhom: "gio_hen", nhan: [{ ai: TX_LUC, loai: "gio_hen_tai_xe" }, { ai: LAP_VA_PHU_TRACH, loai: "gio_hen_goi_bao" }] } as const }
      : {}),
    bangTin: "cap_nhat", nguon: "ADR-0104 Đ2.4, Đ2.9, Đ2.10; ADR-0052 D6.2 (MQ-07)",
  })),

  // Lệnh đơn đổi giờ / nơi chặng đã xếp KHÔNG qua máy đồng bộ (ADR-0104 Đ2.4 "Không cần hook … VK1-B giữ + nút"; phán quyết G8).
  {
    id: "sua-thong-tin-chuyen-don", ten: "Sửa thông tin chuyến của đơn (ngày đi, giờ đón — bảng cũ)", loai: "don_khong_dong_bo", trangThai: "co_ma",
    routes: [{ phuongThuc: "PUT", duongDan: "/api/orders/:id/trip", cong: "orders", o: "order.trip.edit", ngucanh: "ownerId+assigned", ai: O_SUA_CHUYEN_DON, ham: "updateTrip" }],
    trangThaiChuyen: ["PLANNED"], vuot: [], luat: "đơn đã xác nhận đổi chặng dưới mốc → cần đặt gấp (Quản trị, Toàn quyền); chuyến chỉ hiện lý do giữ, người xếp xe bấm nút",
    bang: ["orders", "ord_transfer_leg", "audit_log"], suKien: null, nhatKy: null, nhatKyDon: ["trip_updated", "order_leg_updated"], lo: null, bao: "khong", tin: null,
    // G17 (việc 6, gộp 2a7973d4): mỗi chặng đổi ngày / giờ ghi thêm `order_leg_updated` (target = chặng, cùng lô, `changes() > 0`) → tin giờ hẹn MQ-07.
    tinDon: { nhom: "gio_hen", nhan: [{ ai: TX_LUC, loai: "gio_hen_tai_xe" }, { ai: LAP_VA_PHU_TRACH, loai: "gio_hen_goi_bao" }] },
    bangTin: null,
    nguon: "ADR-0047 R2c; ADR-0104 Đ2.4; ADR-0052 D6.2 (MQ-07); G8, G17 (sổ thi công 2026-10-08)",
  },

  // Mốc giờ hẹn "đã gọi báo khách" — ADR-0051 GB1, GB2 (không chạm vc_trip; ngoại lệ có tên ở bài thứ tự lô).
  {
    id: "da-goi-bao", ten: "Đánh dấu đã gọi báo khách giờ hẹn mới", loai: "moc_gio_hen", trangThai: "co_ma",
    routes: [{ ...vp("/api/van-chuyen/chang/:legId/da-goi-bao", "trip.call_ack", { SALES: "ownOrAssigned", ADMIN: "any", SUPER_ADMIN: "any" }, "xuLyMoc", "ownerId+assigned"), oDau: "trip.view" }],
    trangThaiChuyen: ["PLANNED", "RUNNING"], vuot: [], luat: "giờ hẹn còn cần gọi; giờ hẹn không vừa đổi", bang: ["vc_leg_appt_ack", "audit_log"], suKien: null,
    nhatKy: "trip_appt_called", lo: "lenhDaGoiBao", bao: "khong", tin: null, bangTin: null, nguon: "ADR-0051 GB1, GB2",
  },
  {
    id: "bo-danh-dau-goi-bao", ten: "Bỏ đánh dấu đã gọi báo", loai: "moc_gio_hen", trangThai: "co_ma",
    routes: [{ ...vp("/api/van-chuyen/chang/:legId/bo-danh-dau-goi-bao", "trip.call_ack", { SALES: "ownOrAssigned", ADMIN: "any", SUPER_ADMIN: "any" }, "xuLyMoc", "ownerId+assigned"), oDau: "trip.view" }],
    trangThaiChuyen: ["PLANNED", "RUNNING"], vuot: [], luat: "dấu gần nhất là Đã gọi", bang: ["vc_leg_appt_ack", "audit_log"], suKien: null, nhatKy: "trip_appt_call_undone",
    lo: "lenhBoDanhDauGoiBao", bao: "khong", tin: null, bangTin: null, nguon: "ADR-0051 GB1, GB2",
  },

  // Chuyển khách giữa hai xe — A5, ADR-0111 (thi hành ADR-0052 D4, D5c). Sự kiện ghi ở chuyến ĐÍCH, chuyến nguồn ở `related_trip_id` (Đ3 (d)); nhật ký `target_id`
  // = chuyến đích, `detail` chỉ mã chuyến, phạm vi, số khách, mã luật không đạt (không tên, năm sinh, SĐT, chữ nơi gặp, khoá nơi). Không lệnh nào bỏ qua luật theo
  // lớp `trip.urgent_adjust` (vuot rỗng): mốc 6 giờ / khoảng nghỉ / cam kết là luật CAU_HINH — không đạt thì LEO THANG, Quản trị / Toàn quyền duyệt bằng ô
  // `trip.override` kèm lý do PHA_LE (ADR-0052 D4.2 ĐP4; ADR-0111 Đ1, Đ2, N2). Đặt gấp KHÔNG miễn (Đ6). Lý do Không nhận / Bác: nhóm TU_CHOI_NHAN.
  // Rút lại / tự huỷ (VOID) không sinh tin. Bảng tin: xác nhận = "doi" (khách đổi xe), còn lại "sua" (giả định của người thi công — ADR không nói).
  {
    id: "a5-gui", ten: "Gửi đề nghị chuyển khách (tài xế nhờ xe khác / văn phòng gửi thay cứu hộ)", loai: "chuyen_khach", trangThai: "co_ma",
    routes: [
      { phuongThuc: "POST", duongDan: "/api/van-chuyen/cuoc-cua-toi/:id/de-nghi", cong: "staff", o: "trip.transfer", ngucanh: "assigned", ai: O_CHUYEN_KHACH, ham: "lenhGuiDeNghi" },
      vp("/api/van-chuyen/chuyen/:id/cuu-ho", "trip.progress", O_TIEN_DO, "lenhGuiDeNghi"),
    ],
    trangThaiChuyen: ["PLANNED", "RUNNING"], vuot: [],
    luat: "LC-14: nguồn ĐANG CHẠY, người gửi đang lái nguồn (văn phòng chỉ gửi thay cứu hộ ONBOARD — STOP → 403); đích cùng ngày, có tài xế đang lái khác tài xế nguồn; STOP: điểm chưa tới, mọi suất Chờ, không suất phụ xe; ONBOARD: đích ĐANG CHẠY (Đ4), một nơi gặp; chụp số khách và chính sách hiện hành (hạn chờ)",
    bang: [...LO_CHUNG, "vc_transfer_request"], suKien: "TRANSFER_SENT", nhatKy: "trip_transfer_sent", lo: "loGuiDeNghi", bao: "route", suKienCoChuyenNguon: true,
    tin: { nhom: "thuong", nhan: [{ ai: TX_LUC, loai: "de_nghi_toi" }] }, bangTin: "sua", nguon: "ADR-0111 Đ3 (b), (d), Đ4, Đ6; ADR-0052 D4.1, D4.2 (LC-14), D5c",
  },
  {
    id: "a5-rut-lai", ten: "Tài xế nguồn rút lại đề nghị", loai: "chuyen_khach", trangThai: "co_ma",
    routes: [{ phuongThuc: "POST", duongDan: "/api/van-chuyen/de-nghi/:rid/rut", cong: "staff", o: "trip.transfer", ngucanh: "assigned", ai: O_CHUYEN_KHACH, ham: "lenhRutDeNghi" }],
    trangThaiChuyen: ["PLANNED", "RUNNING"], vuot: [], luat: "người bấm đang lái chuyến nguồn; đề nghị còn Chờ trả lời và chưa quá hạn; không tin",
    bang: [...LO_CHUNG, "vc_transfer_request"], suKien: "TRANSFER_WITHDRAWN", nhatKy: "trip_transfer_withdrawn", lo: "loRutDeNghi", bao: "route", suKienCoChuyenNguon: true,
    tin: null, bangTin: "sua", nguon: "ADR-0111 Đ3 (b), (d); ADR-0052 D4.1",
  },
  {
    id: "a5-khong-nhan", ten: "Tài xế xe nhận bấm Không nhận", loai: "chuyen_khach", trangThai: "co_ma",
    routes: [{ phuongThuc: "POST", duongDan: "/api/van-chuyen/de-nghi/:rid/khong-nhan", cong: "staff", o: "trip.transfer", ngucanh: "assigned", ai: O_CHUYEN_KHACH, ham: "lenhKhongNhanDeNghi" }],
    trangThaiChuyen: ["PLANNED", "RUNNING"], vuot: [],
    luat: "người bấm đang lái chuyến đích (máy chủ; CSDL: decided_by_party_id = tài xế đang lái đích); đề nghị Chờ, chưa quá hạn; lý do bắt buộc nhóm TU_CHOI_NHAN",
    bang: [...LO_CHUNG, "vc_transfer_request"], suKien: "TRANSFER_DECLINED", nhatKy: "trip_transfer_declined", lo: "loKhongNhanDeNghi", bao: "route", suKienCoChuyenNguon: true,
    tin: { nhom: "thuong", nhan: [{ ai: ["TX_NGUON"], loai: "de_nghi_ket_qua" }] }, bangTin: "sua", nguon: "ADR-0111 Đ3 (b), (d) (tin mới cho tài xế nguồn); ADR-0052 D4.1",
  },
  {
    id: "a5-het-han", ten: "Đề nghị hết hạn (đóng khi có người bấm tiếp vào đề nghị quá hạn)", loai: "chuyen_khach", trangThai: "co_ma", routes: [],
    trangThaiChuyen: ["PLANNED", "RUNNING"], vuot: [],
    luat: "MQ-08: hạn = giờ gửi + accept_wait_minutes của chính sách lúc gửi; đọc không ghi, không cron; tài xế nhận bấm Nhận / Không nhận muộn → đóng Hết hạn (200, ketQua HET_HAN)",
    bang: [...LO_CHUNG, "vc_transfer_request"], suKien: "TRANSFER_EXPIRED", nhatKy: "trip_transfer_expired", lo: "loHetHanDeNghi", bao: "route", suKienCoChuyenNguon: true,
    tin: { nhom: "thuong", nhan: [{ ai: TX_LUC, loai: "de_nghi_ket_qua" }, { ai: ["TX_NGUON"], loai: "de_nghi_ket_qua" }] }, bangTin: "sua", nguon: "ADR-0111 Đ3 (c), (d); ADR-0052 D4.2 MQ-08",
  },
  {
    id: "a5-leo-thang", ten: "Đề nghị leo thang chờ Quản trị (luật không đạt hoặc tắt tự đồng ý)", loai: "chuyen_khach", trangThai: "co_ma", routes: [],
    trangThaiChuyen: ["PLANNED", "RUNNING"], vuot: [],
    luat: "tài xế nhận bấm Nhận; kiemChuyen 11 luật (vc_transfer_rule): có luật không đạt, hoặc công tắc tự đồng ý (chính sách lúc bấm) tắt; ghi dòng kiểm; không đổi suất",
    bang: [...LO_CHUNG, "vc_transfer_request", "vc_transfer_check"], suKien: "TRANSFER_ESCALATED", nhatKy: "trip_transfer_escalated", lo: "loLeoThangDeNghi", bao: "route",
    suKienCoChuyenNguon: true, tin: { nhom: "thuong", nhan: [{ ai: ["QUAN_TRI", "TOAN_QUYEN"], loai: "de_nghi_can_duyet" }] }, bangTin: "sua",
    nguon: "ADR-0111 Đ1, Đ2, Đ3 (c), (d); ADR-0052 D4.2 MQ-02/MQ-03",
  },
  {
    id: "a5-xac-nhan", ten: "Đề nghị được xác nhận — khách sang xe nhận (máy tự đồng ý / Quản trị duyệt)", loai: "chuyen_khach", trangThai: "co_ma",
    routes: [
      { phuongThuc: "POST", duongDan: "/api/van-chuyen/de-nghi/:rid/nhan", cong: "staff", o: "trip.transfer", ngucanh: "assigned", ai: O_CHUYEN_KHACH, ham: "lenhNhanDeNghi" },
      vp("/api/van-chuyen/de-nghi/:rid/duyet", "trip.override", O_VUOT, "lenhDuyetDeNghi"),
    ],
    trangThaiChuyen: ["PLANNED", "RUNNING"], vuot: [],
    luat: "cổng đôi (nguồn rồi đích); Nhận: mọi luật đạt + công tắc bật → MAY; Duyệt: đề nghị leo thang mà mọi dòng không đạt (mọi lần kiểm) là CAU_HINH → NGUOI, lý do PHA_LE, cam kết đích ghi khoá; đóng suất nguồn TRANSFERRED rồi mở suất đích giữ trạng thái; STOP: điểm nguồn MOVED; ONBOARD kèm phụ xe; danh sách mới nếu đích đã xuất bến; tự huỷ đề nghị chờ khác (P4)",
    bang: [...LO_CHUNG, "vc_transfer_request", "vc_transfer_check", "vc_trip_allocation", "vc_trip_stop", "vc_trip_manifest"], suKien: "TRANSFER_CONFIRMED",
    nhatKy: "trip_transfer_confirmed", lo: "loXacNhanDeNghi", bao: "route", suKienCoChuyenNguon: true,
    tin: { nhom: "thuong", nhan: [{ ai: TX_LUC, loai: "de_nghi_ket_qua" }, { ai: ["TX_NGUON"], loai: "de_nghi_ket_qua" }] }, bangTin: "doi",
    nguon: "ADR-0111 Đ2, Đ3, Đ4, Sửa chữ 1 (thứ tự lô), P4; ADR-0052 D4.2, D5c",
  },
  {
    id: "a5-bac", ten: "Quản trị bác đề nghị leo thang", loai: "chuyen_khach", trangThai: "co_ma",
    routes: [vp("/api/van-chuyen/de-nghi/:rid/bac", "trip.override", O_VUOT, "lenhBacDeNghi")],
    trangThaiChuyen: ["PLANNED", "RUNNING"], vuot: [], luat: "đề nghị đang leo thang; lý do bắt buộc nhóm TU_CHOI_NHAN; không đổi suất",
    bang: [...LO_CHUNG, "vc_transfer_request"], suKien: "TRANSFER_REJECTED", nhatKy: "trip_transfer_rejected", lo: "loBacDeNghi", bao: "route", suKienCoChuyenNguon: true,
    tin: { nhom: "thuong", nhan: [{ ai: TX_LUC, loai: "de_nghi_ket_qua" }, { ai: ["TX_NGUON"], loai: "de_nghi_ket_qua" }] }, bangTin: "sua", nguon: "ADR-0111 Đ3 (b), (d); ADR-0052 D4.2",
  },
];

// ---- Ngoài phạm vi (kèm lý do) ------------------------------------------------------------------------------------------------------------------------------
/** Việc nhật ký nhóm "Điều phối xe" (hoặc tên `trip_*`) KHÔNG phải lệnh đổi chuyến. */
export const NGOAI_PHAM_VI_NHAT_KY: Readonly<Record<string, string>> = {
  dispatch_policy_changed: "cấu hình (chính sách điều phối)",
  departure_rule_added: "cấu hình (điều kiện xuất bến)",
  departure_rule_closed: "cấu hình (điều kiện xuất bến)",
  license_capacity_changed: "cấu hình (số khách theo hạng bằng)",
  trip_reason_added: "danh mục lý do",
  trip_reason_updated: "danh mục lý do",
  transfer_template_set: "mẫu đưa đón của dịch vụ (danh mục)",
  trip_cost_adjusted: "chi phí xe thuê — chỉ dòng chi phí, không đổi chuyến, không sự kiện chuyến (ADR-0057)",
  trip_cost_reversed: "chi phí xe thuê (ADR-0057)",
  trip_cost_snapshot: "chi phí xe thuê (ADR-0057)",
  trip_cost_agreed: "chi phí xe thuê (ADR-0057)",
  rental_rate_added: "bảng giá thuê xe",
  rental_rate_closed: "bảng giá thuê xe",
  route_saved: "danh mục tuyến",
  vehicle_size_saved: "danh mục cỡ xe",
  driver_unavailability_added: "khung bận của tài xế (ADR-0053 D9) — không ghi chuyến, không sự kiện chuyến, không tin (D9.4); luật chéo với chuyến ở trigger + LC-03",
  driver_unavailability_withdrawn: "khung bận của tài xế (ADR-0053 D9)",
};
/** Route ghi của van-chuyen / dispatch KHÔNG phải lệnh đổi chuyến (bài: thân route không được gọi `baoThayDoiChuyen` / `dongBoChuyen`). */
export const NGOAI_PHAM_VI_ROUTE: Readonly<Record<string, string>> = {
  "POST /api/van-chuyen/xe": "hồ sơ xe",
  "PUT /api/van-chuyen/xe/:id": "hồ sơ xe",
  "POST /api/van-chuyen/xe/:id/giay-to": "giấy tờ xe",
  "POST /api/van-chuyen/xe/:id/giay-to/:did/gia-han": "giấy tờ xe",
  "POST /api/van-chuyen/xe/:id/giay-to/:did/sua-sai": "giấy tờ xe",
  "POST /api/van-chuyen/xe/:id/ban": "lịch xe bận (luật chéo với chuyến ở trigger, không ghi chuyến)",
  "POST /api/van-chuyen/xe/:id/ban/:bid/rut": "lịch xe bận",
  // A4 (ADR-0053 D9): khung bận của CHÍNH tài xế đối tác — luật chéo với chuyến ở trigger B9.2, B9.3; không ghi chuyến, không sự kiện chuyến, không tin (D9.4).
  "POST /api/van-chuyen/ban": "khung bận của tài xế (ADR-0053 D9)",
  "POST /api/van-chuyen/ban/:id/rut": "khung bận của tài xế (ADR-0053 D9)",
  "POST /api/van-chuyen/chinh-sach-dieu-phoi": "cấu hình",
  "POST /api/van-chuyen/moc-ra-lenh": "cấu hình",
  "POST /api/van-chuyen/dieu-kien": "cấu hình",
  "POST /api/van-chuyen/dieu-kien/:id/dong": "cấu hình",
  "POST /api/van-chuyen/hang-bang": "cấu hình",
  "POST /api/van-chuyen/ly-do": "danh mục lý do",
  "PUT /api/van-chuyen/ly-do/:code": "danh mục lý do",
  "POST /api/van-chuyen/mau-chang/:code": "mẫu đưa đón",
  "POST /api/van-chuyen/loai-giay-to-xe": "danh mục giấy tờ xe",
  "PUT /api/van-chuyen/loai-giay-to-xe/:code": "danh mục giấy tờ xe",
  "POST /api/van-chuyen/nguong-het-han": "cấu hình",
  "POST /api/van-chuyen/bang-gia": "bảng giá thuê xe",
  "POST /api/van-chuyen/bang-gia/:id/ket-thuc": "bảng giá thuê xe",
  "POST /api/van-chuyen/tuyen": "danh mục tuyến",
  "PUT /api/van-chuyen/tuyen/:code": "danh mục tuyến",
  "POST /api/van-chuyen/co-xe": "danh mục cỡ xe",
  "PUT /api/van-chuyen/co-xe/:code": "danh mục cỡ xe",
  "POST /api/van-chuyen/chuyen/:id/chi-phi/dieu-chinh": "chi phí xe thuê",
  "POST /api/van-chuyen/chuyen/:id/chi-phi/dao": "chi phí xe thuê",
  "POST /api/van-chuyen/chuyen/:id/chi-phi/chup-lai": "chi phí xe thuê",
  "POST /api/van-chuyen/chuyen/:id/chi-phi/gia-thoa-thuan": "chi phí xe thuê",
  "PUT /api/orders/:id/handler": "đổi người phụ trách đơn (dispatch)",
  "POST /api/orders/:id/handler-refuse": "trả đơn — không đổi khách / chặng; người phụ trách không ở trong chuyến",
  // Route đơn GHI chặng / hành khách mà không đổi chuyến (ADR-0104 Đ2.4 "Không cần hook" — đã đối chiếu mọi route ghi của orders, dispatch).
  "POST /api/orders": "lập đơn — chặng mới chưa có suất",
  "PUT /api/orders/:id": "chỉ đơn nháp — đơn nháp không có suất (lc09)",
  "POST /api/orders/:id/legs": "thêm chặng mới — chưa có suất",
  "POST /api/orders/:id/legs/:legId/short-notice": "dấu đặt gấp — không đổi người / chặng / giờ",
};
/**
 * Ngoại lệ route đơn được miễn KHÔNG miễn cả route: ghim ĐÚNG tập hàm ghi chặng / hành khách / huỷ đơn mà thân route được chạm (phiếu kiểm vòng 2,
 * VỪA-1). Route ở NGOAI_PHAM_VI_ROUTE chạm hàm ghi đơn phải có mục ở đây, và tập hàm thân route chạm phải BẰNG tập khai — chạm thêm hàm (vd. `changeLeg`) → đỏ.
 */
export const HAM_GHI_DON_DUOC_CHAM: Readonly<Record<string, readonly string[]>> = {
  "POST /api/orders": ["createOrder"],
  "PUT /api/orders/:id": ["updateDraftOrder"],
  "POST /api/orders/:id/legs": ["addLeg"],
  "POST /api/orders/:id/legs/:legId/short-notice": ["legShortNotice"],
};

// ---- Quy tắc chung suy từ bảng (máy kiểm) và chỗ lệch ---------------------------------------------------------------------------------------------------
/**
 * QT1 — văn phòng (hoặc máy) đổi một chuyến đang có tài xế ⇒ tài xế đang lái nhận tin. Xét mọi dòng có mã thuộc loại kế hoạch, máy đồng bộ, đơn không đồng bộ,
 * điều chỉnh, và tiến độ có route văn phòng bấm thay; mọi tình huống khả thi (trạng thái chuyến × có / không bỏ qua luật).
 * QT2 — lệnh có bỏ qua luật ⇒ tài xế đang lái nhận tin (lời chủ 2026-10-08 "Báo mọi lệnh có bỏ qua luật").
 * QT3 — lệnh tiến độ có cả nút tài xế lẫn nút văn phòng bấm thay, cùng một hàm xử lý.
 */
export const QUY_TAC = {
  QT1: "Văn phòng hoặc máy đổi một chuyến đang có tài xế thì tài xế đang lái được báo",
  QT2: "Lệnh có bỏ qua luật thì tài xế đang lái được báo",
  QT3: "Lệnh tiến độ có cả nút tài xế lẫn nút văn phòng bấm thay, cùng một cách xử lý",
} as const;
export type MaQuyTac = keyof typeof QUY_TAC;
export interface DauHieu {
  /** Đường dẫn từ gốc repo. Với `soLan`: thư mục — đếm `chua` trên mọi tệp .ts (trừ *.test.ts) trong thư mục đó. */
  tep: string;
  /** Số lần `chua` xuất hiện (đã che chú thích) — thêm một chỗ ghi mới ở bất kỳ tệp nào cũng làm bài đỏ, buộc người sửa xem lại mục lệch. */
  soLan?: number;
  /** Chỉ xét thân hàm này (từ `function <ham>` tới khai báo `export` kế tiếp). */
  ham?: string;
  chua?: string;
  khongChua?: string;
}
export interface ChoLech {
  id: string;
  /** DA_DUYET = ngoại lệ chủ / ADR đã chọn; LECH_ADR = mã khác chữ ADR đã duyệt; CHUA_CO_LUAT = quy tắc chung bị phá mà chưa văn bản nào quyết. */
  loai: "DA_DUYET" | "LECH_ADR" | "CHUA_CO_LUAT";
  muc: "CAO" | "VUA" | "THAP" | null;
  dong: readonly string[];
  /** Quy tắc máy kiểm mà mục này miễn (bài: mọi vi phạm phải có mục; mục không còn vi phạm nào → đỏ). Vắng = mục chỉ là chữ (kèm dấu hiệu nếu có). */
  quyTac?: MaQuyTac;
  /** Chỉ miễn tình huống KHÔNG bỏ qua luật. */
  chiKhiKhongBoQua?: true;
  maLam: string;
  adrNoi: string;
  deNghi: string;
  /** Việc đã có trong bảng việc (vd. "việc 6 — G17"). */
  viec?: string;
  /** Dấu hiệu mã còn lệch — hết đúng (đã sửa) thì bài đỏ, nhắc xoá / sửa mục này. */
  dauHieu?: DauHieu;
}
export const CHO_LECH: readonly ChoLech[] = [
  {
    id: "N-BAM-THAY", loai: "DA_DUYET", muc: null, quyTac: "QT1",
    dong: ["xuat-ben", "da-toi", "da-don", "vang", "khach-huy-tai-diem", "da-tra", "ket-thuc", "ket-thuc-gian-doan", "doi-thu-tu"],
    maLam: "Văn phòng bấm thay tiến độ (xuất bến, đã đón, vắng, kết thúc…) trên chuyến của tài xế — tài xế không nhận tin đẩy, chỉ màn đang mở tự tải lại.",
    adrNoi: "ADR-0049 D3, ADR-0050 VK1-A không nói tới; chủ quyết 2026-10-09 (trang trình câu 3): giữ như hiện tại.",
    deNghi: "Giữ; xem lại ở việc 9 (màn tài xế).",
  },
  {
    id: "N-XEP-RUT-DOI", loai: "DA_DUYET", muc: null, dong: ["xep", "rut", "doi"], quyTac: "QT1", chiKhiKhongBoQua: true,
    maLam: "Xếp / rút / dời khách bình thường (không bỏ qua luật) không báo tài xế.",
    adrNoi: "ADR-0104 Đ1.6 + lời chủ 2026-10-08 \"Báo mọi lệnh có bỏ qua luật\" (CAO-C, SYSTEM-DESIGN §16): chỉ báo khi bỏ qua luật.",
    deNghi: "Giữ.",
  },
  {
    id: "N-BO-SUNG-TEN", loai: "DA_DUYET", muc: null, dong: ["bo-sung-ten"], quyTac: "QT3",
    maLam: "Chỉ tài xế có nút bổ sung tên khách; văn phòng nhập tên ở đơn.", adrNoi: "ADR-0052 D5b.", deNghi: "Giữ.",
  },
  {
    id: "G8", loai: "DA_DUYET", muc: null, dong: ["sua-thong-tin-chuyen-don"],
    maLam: "Bảng cũ \"Sửa thông tin chuyến\" (thân kiểu cũ, giờ và nơi đều rỗng) đóng được chặng của đơn đã xác nhận mà không gọi máy đồng bộ — suất trên chuyến chỉ hiện lý do giữ, người xếp xe gỡ bằng nút tay.",
    adrNoi: "ADR-0104 Đ2.4: route này không cần máy đồng bộ; phán quyết G8 (sổ thi công 2026-10-08) giữ nguyên, đường thân cũ mất khi ngừng nhận bản cũ.",
    deNghi: "Giữ; mở lại nếu chủ đếm thấy máy bản cũ còn dùng đáng kể.",
    dauHieu: { tep: "src/modules/orders/service.ts", ham: "keHoachChangTrip", chua: "kind: \"close\"" },
  },
  {
    id: "BANG-TIN-BO-SUNG-TEN", loai: "CHUA_CO_LUAT", muc: "THAP", dong: ["bo-sung-ten"],
    maLam: "Tài xế bổ sung tên khách: Bảng tin gửi loại \"sửa chuyến\" vì việc này không có dòng riêng trong bảng loại thay đổi (rơi vào mặc định).",
    adrNoi: "ADR-0052 D6.4 không nói; các việc khác đều có dòng riêng.", deNghi: "Thêm dòng riêng (\"tien_do\") khi sửa tệp tin chuyến lần tới — chỉ đổi màn tự tải lại.",
    dauHieu: { tep: "src/shared/tin-chuyen.ts", khongChua: "trip_passenger_named" },
  },
  {
    id: "N-TU-CHOI", loai: "DA_DUYET", muc: null, dong: ["tu-choi"], quyTac: "QT3",
    maLam: "Chỉ tài xế đang lái có nút Từ chối chuyến; văn phòng không có nút từ chối thay — muốn đổi người thì sửa chuyến (xếp tài xế khác).",
    adrNoi: "ADR-0053 D8.3 (:105) và tiêu chí (:224): Toàn quyền không từ chối thay — đổi người bằng xếp xe.", deNghi: "Giữ.",
  },
  {
    id: "TAI-XE-DOI-TAC", loai: "LECH_ADR", muc: null, dong: ["bo-sung-ten"],
    maLam: "Tài xế đối tác (từ A4 có ô xem chuyến, tiến độ, Từ chối, Báo bận) KHÔNG có ô bổ sung tên khách. Ô chuyển khách `trip.transfer` đã mở (A5, N4): tài xế đối tác vừa gửi vừa nhận được khách chuyển; chuyến đã nhận khách chuyển vào thì không Từ chối được (ADR-0113).",
    adrNoi: "ADR-0053 D7.1 (:46) nới hai ô này cho tài xế đối tác. Bổ sung tên: chủ 5/10 (a) chọn \"chỉ tài xế công ty\" — lệch có chủ ý, ghi SYSTEM-DESIGN §16 (A4 T11). Chuyển khách: ô `trip.transfer` (assigned) do A5 mở theo N4 — đã có.",
    deNghi: "Bổ sung tên: giữ, trình chủ ra dòng lịch sử / ADR mới (§16). Chuyển khách: xong (A5 tạo ô `trip.transfer`, cột DRIVER_PARTNER = assigned).",
    viec: "việc 8 — A5 (ô chuyển khách): xong; còn lại phần bổ sung tên (lệch có chủ ý)",
  },
];

// ---- Bản đầy đủ cho người kiểm (sinh từ dữ liệu) ----------------------------------------------------------------------------------------------------------
const ten = (p: PermissionCode) => PERMISSION_LABEL[p];
const aiDuoc = (r: RouteDong): string =>
  PERMISSION_CODES.filter((p) => r.ai[p]).map((p) => `${ten(p)}${r.ai[p] === "any" ? "" : ` (${r.ai[p]})`}`).join(", ") || "—";
const moTaTin = (t: Tin | null): string =>
  t ? t.nhan.map((n) => `${n.ai.map((a) => NHAN_NGUOI_MAU[a]).join(" / ")}: ${n.loai}${n.khi ? ` (khi ${n.khi === "xe_dang_chay" ? "xe đang chạy" : "bỏ qua luật"})` : ""}`).join("; ") : "không ai";
const o = (s: string) => s.replace(/\|/g, "\\|");

/** Bảng đầy đủ (Markdown) — tệp `01-bang-day-du.md` sinh từ hàm này. */
export function veBangDayDu(): string {
  const dong = BANG_SU_KIEN_VAN_CHUYEN;
  const out: string[] = [
    "# Bảng sự kiện Vận chuyển — bản đầy đủ cho người kiểm",
    "",
    "> Sinh từ `src/shared/bang-su-kien-van-chuyen.ts` (hàm `veBangDayDu`). Đây là bản chụp ngày lập; bản sống là tệp mã. Sinh lại:",
    "> `node -e \"import('./src/shared/bang-su-kien-van-chuyen.ts').then((m) => process.stdout.write(m.veBangDayDu()))\" > <tệp>`",
    "",
    `Tổng: ${dong.length} lệnh (${dong.filter((d) => d.trangThai === "co_ma").length} có mã, ${dong.filter((d) => d.trangThai === "chua_co_ma").length} chưa có mã).`,
    "",
    "| # | Lệnh | Route (cổng) | Ô quyền — ai bấm được | Bỏ qua luật | Sự kiện chuyến | Nhật ký | Lô | Tin — ai nhận | Bảng tin | Bảng bị ghi | Nguồn |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  dong.forEach((d, i) => {
    const routes = d.routes.map((r) => `\`${r.phuongThuc} ${r.duongDan}\` (${r.cong})`).join("<br>") || "chưa có";
    const quyen = d.routes.map((r) => `\`${r.o}\`${r.ngucanh === "khong" ? "" : ` [${r.ngucanh}]`}: ${aiDuoc(r)}`).join("<br>") || "dự kiến `trip.transfer`";
    const nk = [d.nhatKy, ...(d.nhatKyDon ?? [])].filter((x) => x).map((x) => `\`${x}\``).join(", ");
    const tin = d.tinDon ? `${moTaTin(d.tin)}; giờ hẹn: ${moTaTin(d.tinDon)}` : moTaTin(d.tin);
    const bt = d.bangTin ? `${d.bangTin}${d.bangTinXeChay && d.bangTinXeChay !== d.bangTin ? ` / xe chạy: ${d.bangTinXeChay}` : ""}` : "—";
    out.push(
      `| ${i + 1} | ${o(d.ten)}${d.trangThai === "chua_co_ma" ? " *(chưa có mã)*" : ""} | ${routes} | ${o(quyen)} | ${d.vuot.join(", ") || "—"} | ${d.suKien ?? "—"} | ${nk || "—"} | ${d.lo ? `\`${d.lo}${d.loKhoa ? `:${d.loKhoa}` : ""}\`` : "—"} | ${o(tin)} | ${bt} | ${d.bang.join(", ")} | ${o(d.nguon)} |`,
    );
  });
  out.push("", "## Quy tắc chung (máy kiểm)", "");
  for (const [k, v] of Object.entries(QUY_TAC)) out.push(`- **${k}** — ${v}.`);
  out.push("", "## Chỗ lệch và ngoại lệ", "", "| Mã | Loại | Mức | Lệnh | Quy tắc | Mã đang làm | Văn bản nói | Đề nghị |", "|---|---|---|---|---|---|---|---|");
  for (const l of CHO_LECH) {
    out.push(`| ${l.id} | ${l.loai} | ${l.muc ?? "—"} | ${l.dong.join(", ")} | ${l.quyTac ?? "—"} | ${o(l.maLam)} | ${o(l.adrNoi)} | ${o(l.deNghi)}${l.viec ? ` (${l.viec})` : ""} |`);
  }
  out.push("", "## Ngoài phạm vi", "", "Việc nhật ký:", "");
  for (const [k, v] of Object.entries(NGOAI_PHAM_VI_NHAT_KY)) out.push(`- \`${k}\` — ${v}`);
  out.push("", "Route ghi:", "");
  for (const [k, v] of Object.entries(NGOAI_PHAM_VI_ROUTE)) {
    const ham = HAM_GHI_DON_DUOC_CHAM[k];
    out.push(`- \`${k}\` — ${v}${ham ? ` (chỉ được chạm: ${ham.map((x) => `\`${x}\``).join(", ")})` : ""}`);
  }
  out.push("");
  return out.join("\n");
}
