// DỰNG LÔ các lệnh chuyến xe (ADR-0049 D1 "Thứ tự lô"; kế hoạch mục 1.5, Task A13 / A15). Mỗi lệnh trả DANH SÁCH CÂU CÓ NHÃN — bài thứ tự lô
// (thu-tu-lo.test.ts, Task A14) kiểm trên chính danh sách đó: (1) câu cổng đứng đầu (lệnh tiến độ: thứ hai, sau câu chuyển trạng thái suất / điểm);
// (2) NHẬT KÝ ngay sau câu cổng, `changes() > 0`; (3) mọi câu sau mang lính gác dấu lệnh `EXISTS (… last_cmd_id = …)`; (4) câu TRẠNG THÁI CUỐI đứng cuối.
// Tệp này KHÔNG đọc gì (route đọc rồi truyền xuống) và KHÔNG BAO GIỜ gọi hàm hẹp của orders (bài src/orders-cong-bo.test.ts). Nhật ký `trip_*`: orderId
// NULL, targetType "trip" (I17); `detail` chỉ gồm mã chuyến, mã đơn, biển số, con số, nhãn lý do, chiều, tên nơi danh mục (danh sách trắng mục 1.1) —
// không tên khách, năm sinh, SĐT, số giấy tờ, chữ nơi tự do, khoá so sánh nơi.
import { auditStatement, type AuditAction } from "../audit";
import {
  ALLOC_CLOSE, ALLOC_GAN_TEN, ALLOC_INSERT, ALLOC_TIEN_DO, ALLOCS_CLOSE_ALL, ALLOCS_DONG_GIAN_DOAN, CHECK_INSERT, CHECK_ITEM_INSERT, DRIVER_CLOSE, DRIVER_INSERT,
  EVENT_INSERT, MANIFEST_INSERT, MOC_GOI_INSERT, MOC_XEP_INSERT, STOP_DA_TOI, STOP_INSERT, STOP_SET_SEQ, STOP_SKIP, STOP_UPDATE_PLAN, STOP_XONG_NEU_HET, STOPS_SKIP_ALL, TRIP_CANCEL, TRIP_GATE,
  TRIP_CAM_KET_PHA_LE, TRIP_GATE_CHI_PHI, TRIP_GATE_DANG_CHAY, TRIP_GATE_DOI, TRIP_GATE_THEO_DON, TRIP_GATE_TIEN_DO, TRIP_INSERT, TRIP_KET_THUC, TRIP_UPDATE_PLAN, TRIP_XUAT_BEN,
  ALLOC_OFFICE_CANCEL, MANIFEST_THEM_SAU, TRIP_CHOT, TRIP_GATE_DANG_CHAY_VERSION, ALLOC_DIEU_CHINH_INSERT, EVENT_DIEU_CHINH_INSERT, TRIP_THU_HOI_XUAT_BEN,
  TRANSFER_DONG, TRANSFER_INSERT, TRIP_GATE_CHAY_HOAC_CHO, TRIP_GATE_DE_NGHI, TRIP_GATE_DOI_CHAY, TRANSFER_QUYET, TRANSFER_DUYET, TRANSFER_CHECK_INSERT,
  TRANSFERS_VOID_KHAC, ALLOC_CLOSE_TRANSFER, ALLOC_OPEN_TRANSFER, STOP_SET_MOVED, MANIFEST_CHUYEN_KHACH, TRANSFERS_VOID_BY_STOP, TRANSFERS_VOID_BY_SUAT, TRANSFERS_VOID_BY_TRIP,
} from "./chuyen-repo";
import { cauChiPhi, type KeHoachChiPhi } from "./tien-xe-lo";
import {
  LENH_DONG_SUAT, type GanTen, type LoaiSuKienChuyen, type LyDoDongSuat, type MA_LY_DO_HE_THONG, type MaLuatPhaLe, type MucChup, type NguonGioXayRa, type TrangThaiSuat,
} from "../../shared/dieu-phoi-kieu";

/**
 * Nhãn câu (bài thứ tự lô — thu-tu-lo.test.ts). `CHUYEN_TIEN_DO` = câu chuyển trạng thái suất / điểm của lệnh tiến độ khuôn (a): đứng ĐẦU lô, TỰ gác "chuyến
 * đang chạy" + trạng thái nguồn (không có dấu lệnh — chưa có câu cổng), câu cổng đứng ngay sau với `changes() > 0`. `CONG_MOC` = câu cổng của họ lệnh trên
 * mốc giờ hẹn (ADR-0051 — `lenhDaGoiBao`, `lenhBoDanhDauGoiBao`; không chạm vc_trip).
 */
/**
 * `GHI_NGOAI` (Đợt 5 A-1b — chủ duyệt 5/10, đề xuất luật A-1b mục 2): câu GHI do module KHÁC cấp (orders — dòng hành khách tài xế nhập), không chạm vc_trip nên
 * gác bằng ID NHẬT KÝ của lô (`EXISTS (SELECT 1 FROM audit_log WHERE id = ?)` = dấu lệnh) thay cho `last_cmd_id`. Chỉ `loBoSungTen` được dùng (bài thứ tự lô).
 */
/** `CAM_KET_PHA_LE` (ADR-0056 VK3-A, Đợt 7 Task 4): câu ghi / xoá cột phá lệ cam kết của chuyến — có lính gác dấu lệnh như GHI, nhãn riêng để bài thứ tự lô soi. */
/**
 * `CAU_DON` (ADR-0104 Đ2.3 — nới có tên N1): câu của orders (cổng đơn + nhật ký đơn + câu ghi đơn, đã soạn, CHƯA chạy) đứng ĐẦU lô đồng bộ chuyến theo đơn.
 * Chỉ `loDongBoChuyen` được dùng (bài thứ tự lô — CHO_CAU_DON); van-chuyen chỉ NỐI, không soạn câu nào trên bảng ord_* hay audit_log.
 */
export type NhanCau = "CONG" | "CONG_DOI" | "CHUYEN_TIEN_DO" | "CONG_MOC" | "NHAT_KY" | "SU_KIEN" | "GHI" | "GHI_NGOAI" | "CAM_KET_PHA_LE" | "TRANG_THAI_CUOI" | "CAU_DON";
export interface CauCoNhan {
  nhan: NhanCau;
  stmt: D1PreparedStatement;
  /** Lô nhiều khúc (`loDongBoChuyen`): dấu lệnh của KHÚC chứa câu — bài thứ tự lô tách khúc theo trường này. Lô một lệnh để trống. */
  cmd?: string;
  /**
   * Chỉ câu `SU_KIEN`: khoá của sự kiện lô này sẽ ghi (chuyến, chuyến liên quan, loại, điểm, suất) — `chayLo` so với sự kiện đã mang CÙNG request_id khi lô
   * thua cổng / đụng UNIQUE, để chỉ coi là lệnh lặp khi đúng lệnh này (C38); lệch ⇒ 409 `request_id_reused`.
   */
  suKien?: SuKienCuaLo;
}
/** Khoá sự kiện của một lô (xem `CauCoNhan.suKien`). */
export interface SuKienCuaLo {
  tripId: string;
  relatedTripId: string | null;
  loai: LoaiSuKienChuyen;
  stopId: string | null;
  allocationId: string | null;
}

/** Phần chung của MỌI lệnh: dấu lệnh (id riêng của request = id sự kiện = id nhật ký), request_id của màn hình, MỘT mốc giờ của request (I33), người bấm. */
export interface LenhChung {
  cmd: string;
  requestId: string;
  lucIso: string;
  nguoiId: string;
}
/** Phá lệ đi kèm lệnh (I2): luật cấu hình + mã lý do nhóm PHA_LE + chính sách đã dùng. */
export interface PhaLe {
  luat: MaLuatPhaLe;
  lyDo: string;
  policyId: string | null;
}
interface SuKienVao {
  tripId: string;
  relatedTripId?: string | null;
  loai: LoaiSuKienChuyen;
  stopId?: string | null;
  allocationId?: string | null;
  soNguoi?: number | null;
  phaLe?: PhaLe | null;
  policyId?: string | null;
  decided?: "NGUOI" | "MAY";
}

const nhatKy = (db: D1Database, l: LenhChung, action: AuditAction, tripId: string, detail: string): CauCoNhan => ({
  nhan: "NHAT_KY",
  stmt: auditStatement(db, { id: l.cmd, staffId: l.nguoiId, action, at: l.lucIso, targetType: "trip", targetId: tripId, detail }, "changes() > 0"),
});
/** Sự kiện KẾ HOẠCH (giờ xảy ra = giờ ghi nhận = lúc bấm — `MAY_CHU`). */
const suKien = (db: D1Database, l: LenhChung, e: SuKienVao): CauCoNhan => ({
  nhan: "SU_KIEN",
  stmt: db.prepare(EVENT_INSERT).bind(
    l.cmd, e.tripId, e.relatedTripId ?? null, e.loai, e.stopId ?? null, e.allocationId ?? null, e.soNguoi ?? null, l.requestId, null, e.decided ?? "NGUOI",
    e.phaLe?.luat ?? null, e.phaLe?.lyDo ?? null, e.phaLe?.policyId ?? e.policyId ?? null, l.lucIso, Date.parse(l.lucIso), "MAY_CHU", l.lucIso, l.nguoiId,
  ),
  suKien: { tripId: e.tripId, relatedTripId: e.relatedTripId ?? null, loai: e.loai, stopId: e.stopId ?? null, allocationId: e.allocationId ?? null },
});
const cong = (db: D1Database, l: LenhChung, tripId: string, version: number): CauCoNhan => ({
  nhan: "CONG",
  stmt: db.prepare(TRIP_GATE).bind(tripId, version, l.cmd, l.lucIso, l.nguoiId),
});
const ghi = (stmt: D1PreparedStatement): CauCoNhan => ({ nhan: "GHI", stmt });
/**
 * MQ-09 (ADR-0111, kế hoạch G-A5-13 / T9): tự huỷ đề nghị chuyển khách đang chờ liên quan, trong lô của lệnh làm điểm / chuyến đổi — đứng SAU câu sự kiện,
 * TRƯỚC câu trạng thái cuối; gác chuyến của lô. `theo`: điểm nguồn (Đã tới), điểm lên của suất (Báo huỷ, Điều chỉnh), chuyến là nguồn hoặc đích.
 */
const tuHuyDeNghi = (db: D1Database, l: LenhChung, theo: "DIEM" | "SUAT" | "CHUYEN", id: string, gac: string): CauCoNhan =>
  ghi(db.prepare(theo === "DIEM" ? TRANSFERS_VOID_BY_STOP : theo === "SUAT" ? TRANSFERS_VOID_BY_SUAT : TRANSFERS_VOID_BY_TRIP).bind(id, l.cmd, l.lucIso, l.nguoiId, gac));
/**
 * Cột phá lệ cam kết của chuyến sau lệnh (ADR-0056 VK3-A; kế hoạch C6–C8): `{ lyDo, khoa }` = ghi (Quản trị phá lệ tập vi phạm hiện tại); `{ null, null }` = xoá
 * (lệnh kiểm thấy hết vi phạm mà cột đang có). `null` ở lệnh = không chạm cột.
 */
export interface CamKetLo {
  lyDo: string | null;
  khoa: string | null;
}
/** Câu CAM_KET_PHA_LE: chuyến `tripId`, gác bằng chuyến `gac` mang dấu lệnh (lệnh dời: chuyến ĐÍCH). */
const cauCamKet = (db: D1Database, l: LenhChung, tripId: string, ck: CamKetLo | null, gac = tripId): CauCoNhan[] =>
  ck ? [{ nhan: "CAM_KET_PHA_LE", stmt: db.prepare(TRIP_CAM_KET_PHA_LE).bind(tripId, l.cmd, ck.lyDo, ck.khoa, gac) }] : [];
/** Câu cổng lệnh KẾ HOẠCH trên chuyến ĐANG CHẠY (ADR-0052 D5 — version đúng + RUNNING). */
const congDangChayVersion = (db: D1Database, l: LenhChung, tripId: string, version: number): CauCoNhan => ({
  nhan: "CONG",
  stmt: db.prepare(TRIP_GATE_DANG_CHAY_VERSION).bind(tripId, version, l.cmd, l.lucIso, l.nguoiId),
});
/** Câu cổng của lệnh kế hoạch CHẠM CHI PHÍ (sửa, huỷ — ADR-0057 C4, TC-8): thêm điều kiện "số dòng chi phí vẫn bằng phiên bản đã đọc". */
const congChiPhi = (db: D1Database, l: LenhChung, tripId: string, version: number, phienBanChiPhi: number): CauCoNhan => ({
  nhan: "CONG",
  stmt: db.prepare(TRIP_GATE_CHI_PHI).bind(tripId, version, l.cmd, l.lucIso, l.nguoiId, phienBanChiPhi),
});

// ---- Khuôn dữ liệu của các lệnh --------------------------------------------------------------------------------------------------------------------------
/** Điểm MỚI dựng từ chặng (I40): khoá nơi của chặng; chữ tự do đã che (chỉ hiển thị). */
export interface DiemMoi {
  id: string;
  tripId: string;
  seq: number;
  loai: "PICKUP" | "DROPOFF";
  locationId: string | null;
  placeText: string | null;
  placeKey: string;
}
export interface SuatMoi {
  id: string;
  tripId: string;
  loai: "PASSENGER" | "CREW";
  legId: string | null;
  personKey: string | null;
  crewPartyId: string | null;
  boardStopId: string | null;
  alightStopId: string | null;
}
/** HT-01 (V1.2): đổi số thứ tự MỘT điểm chưa tới (sắp đón trước trả sau khi dựng điểm — `sapLaiDiem`). `gac` = chuyến mang dấu lệnh (lệnh dời: ĐÍCH). */
const doiThuTuDiem = (db: D1Database, l: LenhChung, tripId: string, d: { id: string; seq: number }): CauCoNhan =>
  ghi(db.prepare(STOP_SET_SEQ).bind(d.id, tripId, l.cmd, d.seq, l.lucIso, l.nguoiId));
/** `khiChay` = lệnh trên chuyến ĐANG CHẠY (ADR-0052 D5): điểm mang cờ `added_while_running`, suất mang cờ `added_after_departure` (LC-15 mới đòi). */
const chenDiem = (db: D1Database, l: LenhChung, d: DiemMoi, khiChay = false): CauCoNhan =>
  ghi(db.prepare(STOP_INSERT).bind(d.id, d.tripId, d.seq, d.loai, d.locationId, d.placeText, d.placeKey, l.cmd, l.lucIso, l.nguoiId, khiChay ? 1 : 0));
const chenSuat = (db: D1Database, l: LenhChung, s: SuatMoi, khiChay = false): CauCoNhan =>
  ghi(db.prepare(ALLOC_INSERT).bind(s.id, s.tripId, s.loai, s.legId, s.personKey, s.crewPartyId, s.boardStopId, s.alightStopId, l.cmd, l.lucIso, l.nguoiId, khiChay ? 1 : 0));
const dongSuat = (db: D1Database, l: LenhChung, tripId: string, suatId: string, lyDo: LyDoDongSuat, gac = tripId): CauCoNhan =>
  ghi(db.prepare(ALLOC_CLOSE).bind(suatId, tripId, l.cmd, lyDo, l.lucIso, l.nguoiId, gac));
const boQuaDiem = (db: D1Database, l: LenhChung, tripId: string, stopId: string, lyDo: string, gac = tripId): CauCoNhan =>
  ghi(db.prepare(STOP_SKIP).bind(stopId, tripId, l.cmd, lyDo, l.lucIso, l.nguoiId, gac));

/** Mã lý do HỆ THỐNG khi một điểm chưa tới không còn suất mở (I20) — thuộc `MA_LY_DO_HE_THONG` (không ngưng được — R-P22). */
export const LY_DO_BO_QUA_KHONG_CON_KHACH: (typeof MA_LY_DO_HE_THONG)[number] = "BO_QUA_KHONG_CON_KHACH";

// ---- Tạo chuyến (route 2) --------------------------------------------------------------------------------------------------------------------------------
export interface LenhTaoChuyen extends LenhChung {
  chuyen: {
    id: string; ma: string; xeId: string; chuXePartyId: string; ngayChay: string; batDauMs: number; ketThucMs: number; nghiChup: number; nghiPhaLeLyDo: string | null;
    /** ADR-0057 C2a: cờ xe thuê (`phanLoaiThue`). */ thue: 0 | 1; /** ADR-0057 C2: tuyến (nhãn tra giá). */ tuyen: string | null;
  };
  taiXePartyId: string;
  policyId: string | null;
  phaLeNghi: PhaLe | null;
  /** ADR-0057 C4: chụp giá bảng khi tạo chuyến bằng xe nhà xe (không có dòng đảo). */
  chiPhi: KeHoachChiPhi;
  detail: string;
}
/** Thứ tự: TRIP_INSERT (cổng) → nhật ký → sự kiện → tài xế → CHỤP giá (sau khi chuyến có cờ xe thuê). */
export function loTaoChuyen(db: D1Database, l: LenhTaoChuyen): CauCoNhan[] {
  const c = l.chuyen;
  const cp = cauChiPhi(db, l, c.id, l.chiPhi);
  return [
    { nhan: "CONG", stmt: db.prepare(TRIP_INSERT).bind(c.id, c.ma, c.xeId, c.chuXePartyId, c.ngayChay, c.batDauMs, c.ketThucMs, c.nghiChup, c.nghiPhaLeLyDo, l.cmd, l.lucIso, l.nguoiId, c.thue, c.tuyen) },
    nhatKy(db, l, "trip_created", c.id, l.detail),
    suKien(db, l, { tripId: c.id, loai: "CREATED", phaLe: l.phaLeNghi, policyId: l.policyId }),
    ghi(db.prepare(DRIVER_INSERT).bind(crypto.randomUUID(), c.id, l.taiXePartyId, l.cmd, l.lucIso, l.nguoiId)),
    ...cp.dao,
    ...cp.chup,
  ];
}

// ---- Sửa chuyến (route 4) --------------------------------------------------------------------------------------------------------------------------------
export interface LenhSuaChuyen extends LenhChung {
  tripId: string;
  version: number;
  /** `nghiChup` (N3): khoảng nghỉ chụp sau lệnh — số của chính sách hiện hành khi lệnh đổi giờ / xe / tài xế, không thì số đã chụp. */
  moi: {
    xeId: string; chuXePartyId: string; ngayChay: string; batDauMs: number; ketThucMs: number; batDauSomNhatMs: number; nghiPhaLeLyDo: string | null; thue: 0 | 1; tuyen: string | null;
    nghiChup: number;
  };
  /** Tài xế MỚI khi đổi (đóng dòng cũ REASSIGNED + mở dòng mới); null = giữ. */
  doiTaiXe: string | null;
  diem: { id: string; seq: number; ngayXeToi: string | null; gioXeToi: string | null }[];
  phaLe: PhaLe | null;
  policyId: string | null;
  /** ADR-0057 C4: đảo + chụp lại khi đổi xe / nhà xe / tuyến / ngày chạy; `phienBanChiPhi` = số dòng chi phí đã đọc (câu cổng — TC-8). */
  chiPhi: KeHoachChiPhi;
  phienBanChiPhi: number;
  /** ADR-0056 VK3-A: ghi / xoá cột phá lệ cam kết (null = không chạm). */
  camKet: CamKetLo | null;
  detail: string;
}
/** Thứ tự: cổng (+ phiên bản chi phí) → nhật ký → sự kiện → ĐẢO (âm → dương) → đóng tài xế cũ → ghi chuyến → mở tài xế mới → điểm → CAM KẾT → CHỤP. */
export function loSuaChuyen(db: D1Database, l: LenhSuaChuyen): CauCoNhan[] {
  const m = l.moi;
  const cp = cauChiPhi(db, l, l.tripId, l.chiPhi);
  const lo: CauCoNhan[] = [
    congChiPhi(db, l, l.tripId, l.version, l.phienBanChiPhi),
    nhatKy(db, l, "trip_edited", l.tripId, l.detail),
    suKien(db, l, { tripId: l.tripId, loai: "UPDATED", phaLe: l.phaLe, policyId: l.policyId }),
    ...cp.dao,
  ];
  // Đổi tài xế: ĐÓNG dòng cũ TRƯỚC câu ghi chuyến (trigger LC-13 vc_trip_vehicle_carrier_upd so tài xế ĐANG MỞ với chủ xe MỚI — đổi xe nhà xe ↔ xe công ty /
  // nhà xe khác kèm đổi tài xế trước đây vấp lc13_cross; phát hiện khi thi công ADR-0057 RF1-e/f), MỞ dòng mới SAU.
  if (l.doiTaiXe !== null) lo.push(ghi(db.prepare(DRIVER_CLOSE).bind(l.tripId, l.cmd, "REASSIGNED", l.lucIso, l.nguoiId)));
  lo.push(ghi(db.prepare(TRIP_UPDATE_PLAN).bind(l.tripId, l.cmd, m.xeId, m.chuXePartyId, m.ngayChay, m.batDauMs, m.ketThucMs, m.batDauSomNhatMs, m.nghiPhaLeLyDo, l.lucIso, l.nguoiId, m.thue, m.tuyen, m.nghiChup)));
  if (l.doiTaiXe !== null) lo.push(ghi(db.prepare(DRIVER_INSERT).bind(crypto.randomUUID(), l.tripId, l.doiTaiXe, l.cmd, l.lucIso, l.nguoiId)));
  for (const d of l.diem) lo.push(ghi(db.prepare(STOP_UPDATE_PLAN).bind(d.id, l.tripId, l.cmd, d.seq, d.ngayXeToi, d.gioXeToi, l.lucIso, l.nguoiId)));
  lo.push(...cauCamKet(db, l, l.tripId, l.camKet));
  lo.push(...cp.chup);
  return lo;
}

// ---- Xếp (route 5) ---------------------------------------------------------------------------------------------------------------------------------------
export interface LenhXep extends LenhChung {
  tripId: string;
  version: number;
  diemMoi: DiemMoi[];
  /** HT-01 (V1.2): điểm ĐÃ CÓ đổi số thứ tự để mọi đón của suất đứng trước trả của suất (`sapLaiDiem`); rỗng = không đổi. */
  doiThuTu: { id: string; seq: number }[];
  /** ADR-0051: mốc "giờ hẹn đã biết" của từng chặng được xếp (ngày giờ hẹn đọc trong request) — câu chụp chỉ ghi khi chặng CHƯA có mốc. */
  mocXep: { legId: string; ngay: string; gio: string | null }[];
  suatMoi: SuatMoi[];
  phaLe: PhaLe | null;
  policyId: string | null;
  /** ADR-0056 VK3-A: ghi / xoá cột phá lệ cam kết (null = không chạm). */
  camKet: CamKetLo | null;
  detail: string;
}
export function loXep(db: D1Database, l: LenhXep): CauCoNhan[] {
  return [
    cong(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_allocated", l.tripId, l.detail),
    suKien(db, l, { tripId: l.tripId, loai: "ALLOCATED", soNguoi: l.suatMoi.length, phaLe: l.phaLe, policyId: l.policyId }),
    ...l.diemMoi.map((d) => chenDiem(db, l, d)), // điểm trước suất (khoá ngoại board_stop_id / alight_stop_id)
    ...l.doiThuTu.map((d) => doiThuTuDiem(db, l, l.tripId, d)),
    // ADR-0051: chụp mốc giờ hẹn TRƯỚC câu mở suất (trigger vc_trip_allocation_needs_appt đòi chặng có mốc).
    ...l.mocXep.map((m) => ghi(db.prepare(MOC_XEP_INSERT).bind(crypto.randomUUID(), m.legId, m.ngay, m.gio, l.lucIso, l.nguoiId, l.tripId, l.cmd))),
    ...l.suatMoi.map((s) => chenSuat(db, l, s)), // mỗi suất MỘT câu (trigger sức chứa theo dòng)
    ...cauCamKet(db, l, l.tripId, l.camKet),
  ];
}

// ---- Rút (route 6) ---------------------------------------------------------------------------------------------------------------------------------------
export interface LenhRut extends LenhChung {
  tripId: string;
  version: number;
  suatIds: string[];
  /** Điểm chưa tới không còn suất mở sau lệnh → SKIPPED `BO_QUA_KHONG_CON_KHACH` (I20). */
  diemBoQua: string[];
  phaLe: PhaLe | null;
  policyId: string | null;
  /** ADR-0056 VK3-A, C7: lệnh chỉ GIẢM khách — chỉ XOÁ cột phá lệ cam kết khi hết vi phạm (`{ null, null }`); null = không chạm. */
  camKet: CamKetLo | null;
  detail: string;
}
export function loRut(db: D1Database, l: LenhRut): CauCoNhan[] {
  return [
    cong(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_allocation_removed", l.tripId, l.detail),
    suKien(db, l, { tripId: l.tripId, loai: "ALLOCATION_REMOVED", soNguoi: l.suatIds.length, phaLe: l.phaLe, policyId: l.policyId }),
    ...l.suatIds.map((id) => dongSuat(db, l, l.tripId, id, LENH_DONG_SUAT.RUT)),
    ...l.diemBoQua.map((id) => boQuaDiem(db, l, l.tripId, id, LY_DO_BO_QUA_KHONG_CON_KHACH)),
    ...cauCamKet(db, l, l.tripId, l.camKet),
  ];
}

// ---- Dời sang chuyến khác (route 7 — CỔNG ĐÔI, [TK] §3.3) ---------------------------------------------------------------------------------------------------
export interface LenhDoi extends LenhChung {
  nguon: { tripId: string; version: number };
  dich: { tripId: string; version: number };
  /** Từng suất: đóng ở nguồn (MOVED) NGAY TRƯỚC khi mở suất mới ở đích (cùng chặng, cùng người — LC-01 không vấp). */
  cap: { dongId: string; mo: SuatMoi }[];
  diemMoiDich: DiemMoi[];
  /** HT-01 (V1.2): điểm ĐÃ CÓ của chuyến ĐÍCH đổi số thứ tự (`sapLaiDiem`). */
  doiThuTuDich: { id: string; seq: number }[];
  diemBoQuaNguon: string[];
  phaLe: PhaLe | null;
  policyId: string | null;
  /** ADR-0056 VK3-A: chuyến NGUỒN chỉ xoá (C7 — hết vi phạm); chuyến ĐÍCH ghi (phá lệ) hoặc xoá. null = không chạm. */
  camKetNguon: CamKetLo | null;
  camKetDich: CamKetLo | null;
  detail: string;
}
/**
 * Cổng đôi: câu cổng NGUỒN trước, câu cổng ĐÍCH chỉ thắng khi nguồn đã mang dấu lệnh này ⇒ mọi câu sau GÁC theo chuyến ĐÍCH (hai cổng cùng thắng hoặc không
 * câu nào chạy — không bao giờ nửa lô). Sự kiện ghi trên chuyến ĐÍCH (`related_trip_id` = nguồn) — sự kiện "sửa kế hoạch" của cả hai chuyến (GA-35).
 */
export function loDoi(db: D1Database, l: LenhDoi): CauCoNhan[] {
  const gac = l.dich.tripId;
  const lo: CauCoNhan[] = [
    cong(db, l, l.nguon.tripId, l.nguon.version),
    { nhan: "CONG_DOI", stmt: db.prepare(TRIP_GATE_DOI).bind(l.dich.tripId, l.dich.version, l.cmd, l.lucIso, l.nguoiId, l.nguon.tripId) },
    nhatKy(db, l, "trip_allocation_moved", gac, l.detail),
    suKien(db, l, { tripId: gac, relatedTripId: l.nguon.tripId, loai: "ALLOCATION_MOVED", soNguoi: l.cap.length, phaLe: l.phaLe, policyId: l.policyId }),
    ...l.diemMoiDich.map((d) => chenDiem(db, l, d)),
    ...l.doiThuTuDich.map((d) => doiThuTuDiem(db, l, gac, d)),
  ];
  for (const c of l.cap) {
    lo.push(dongSuat(db, l, l.nguon.tripId, c.dongId, LENH_DONG_SUAT.DOI_DI, gac));
    lo.push(chenSuat(db, l, c.mo));
  }
  lo.push(...l.diemBoQuaNguon.map((id) => boQuaDiem(db, l, l.nguon.tripId, id, LY_DO_BO_QUA_KHONG_CON_KHACH, gac)));
  lo.push(...cauCamKet(db, l, l.nguon.tripId, l.camKetNguon, gac), ...cauCamKet(db, l, gac, l.camKetDich));
  return lo;
}

// ---- Huỷ chuyến (route 8) --------------------------------------------------------------------------------------------------------------------------------
export interface LenhHuy extends LenhChung {
  tripId: string;
  version: number;
  lyDo: string;
  phaLe: PhaLe | null;
  policyId: string | null;
  soSuatMo: number;
  /** ADR-0057 C4: đảo MỌI dòng chi phí còn hiệu lực (âm → dương) khi chuyến còn PLANNED, TRƯỚC câu trạng thái cuối. */
  chiPhi: KeHoachChiPhi;
  phienBanChiPhi: number;
  detail: string;
}
/** Thứ tự ADR-0049 D1 / [TK] §2.1a: cổng → nhật ký → sự kiện → đóng suất → đóng tài xế → bỏ điểm → ĐẢO chi phí (ADR-0057 C4) → trạng thái cuối (CUỐI lô). */
export function loHuy(db: D1Database, l: LenhHuy): CauCoNhan[] {
  return [
    congChiPhi(db, l, l.tripId, l.version, l.phienBanChiPhi),
    nhatKy(db, l, "trip_cancelled", l.tripId, l.detail),
    suKien(db, l, { tripId: l.tripId, loai: "CANCELLED", soNguoi: l.soSuatMo, phaLe: l.phaLe, policyId: l.policyId }),
    ghi(db.prepare(ALLOCS_CLOSE_ALL).bind(l.tripId, l.cmd, LENH_DONG_SUAT.HUY_CO_KHACH, l.lucIso, l.nguoiId)),
    ghi(db.prepare(DRIVER_CLOSE).bind(l.tripId, l.cmd, "TRIP_CANCELLED", l.lucIso, l.nguoiId)),
    ghi(db.prepare(STOPS_SKIP_ALL).bind(l.tripId, l.cmd, l.lyDo, l.lucIso, l.nguoiId)),
    tuHuyDeNghi(db, l, "CHUYEN", l.tripId, l.tripId),
    ...cauChiPhi(db, l, l.tripId, l.chiPhi).dao,
    { nhan: "TRANG_THAI_CUOI", stmt: db.prepare(TRIP_CANCEL).bind(l.tripId, l.cmd, l.lyDo, l.lucIso, l.nguoiId) },
  ];
}

// ---- Cập nhật điểm theo đơn (route 40 — ADR-0050 VK1-B, I42) ----------------------------------------------------------------------------------------------
export interface LenhCapNhatDiem extends LenhChung {
  tripId: string;
  version: number;
  diemMoi: DiemMoi[];
  /** Từng suất lệch: đóng STOP_CHANGED NGAY TRƯỚC khi mở suất mới (cùng chặng, cùng người, WAITING) — LC-02 không vượt chỗ giữa chừng. */
  cap: { dongId: string; mo: SuatMoi }[];
  /** HT-01 (V1.2): điểm ĐÃ CÓ đổi số thứ tự (`sapLaiDiem`; điểm sắp bỏ qua không xét). */
  doiThuTu: { id: string; seq: number }[];
  diemBoQua: string[];
  /** ADR-0056 VK3-A, C7: lệnh chỉ GIẢM khách — chỉ XOÁ cột phá lệ cam kết khi hết vi phạm (`{ null, null }`); null = không chạm. */
  camKet: CamKetLo | null;
  detail: string;
  /**
   * ADR-0052 D5.3a (Đợt 5): chuyến ĐANG CHẠY — cổng có version + RUNNING; điểm mới mang cờ `added_while_running`, suất mở lại mang cờ `added_after_departure`;
   * câu CHỐT `SET version = version` đứng CUỐI (trigger 0076 kiểm "đóng = mở cùng dấu lệnh"). Nơi gọi chỉ đưa suất WAITING ở điểm lên PENDING và KHÔNG bỏ
   * qua điểm (`diemBoQua` rỗng — kế hoạch Task 3).
   */
  dangChay?: boolean;
}
export function loCapNhatDiem(db: D1Database, l: LenhCapNhatDiem): CauCoNhan[] {
  const chay = l.dangChay === true;
  const lo: CauCoNhan[] = [
    chay ? congDangChayVersion(db, l, l.tripId, l.version) : cong(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_stops_synced", l.tripId, l.detail),
    suKien(db, l, { tripId: l.tripId, loai: "ALLOCATION_STOP_CHANGED", soNguoi: l.cap.length }),
    ...l.diemMoi.map((d) => chenDiem(db, l, d, chay)),
    ...l.doiThuTu.map((d) => doiThuTuDiem(db, l, l.tripId, d)),
  ];
  for (const c of l.cap) {
    lo.push(dongSuat(db, l, l.tripId, c.dongId, LENH_DONG_SUAT.DOI_DIEM_THEO_CHANG));
    lo.push(chenSuat(db, l, c.mo, chay));
  }
  lo.push(...l.diemBoQua.map((id) => boQuaDiem(db, l, l.tripId, id, LY_DO_BO_QUA_KHONG_CON_KHACH)));
  lo.push(...cauCamKet(db, l, l.tripId, l.camKet)); // trước câu chốt (xe đang chạy) — nơi gọi không xoá khi xe đang chạy
  if (chay) lo.push({ nhan: "TRANG_THAI_CUOI", stmt: db.prepare(TRIP_CHOT).bind(l.tripId, l.cmd) });
  return lo;
}

// ---- Văn phòng thêm điểm / khách vào xe ĐANG CHẠY (ADR-0052 D5.1 — Đợt 5) --------------------------------------------------------------------------------
export interface LenhThemDiemDangChay extends LenhChung {
  tripId: string;
  version: number;
  diemMoi: DiemMoi[];
  doiThuTu: { id: string; seq: number }[];
  /** ADR-0051: mốc giờ hẹn của chặng — câu chụp chỉ ghi khi chặng CHƯA có mốc (trigger vc_trip_allocation_needs_appt). */
  mocXep: { legId: string; ngay: string; gio: string | null }[];
  suatMoi: SuatMoi[];
  /** Bản chốt dòng thêm sau xuất bến — chỉ suất khách CÓ tên (suất chưa tên vào bản chốt khi được gắn tên). */
  chot: { allocationId: string; passengerRowId: string }[];
  phaLe: PhaLe | null;
  policyId: string | null;
  /** ADR-0056 VK3-A: ghi / xoá cột phá lệ cam kết (null = không chạm). */
  camKet: CamKetLo | null;
  detail: string;
}
/** Cổng (version + RUNNING) → nhật ký → sự kiện STOP_ADDED_RUNNING (đường (1) của LC-15 mới) → điểm (cờ) → sắp thứ tự → mốc → suất (cờ) → bản chốt. */
export function loThemDiemDangChay(db: D1Database, l: LenhThemDiemDangChay): CauCoNhan[] {
  return [
    congDangChayVersion(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_stop_added_running", l.tripId, l.detail),
    suKien(db, l, { tripId: l.tripId, loai: "STOP_ADDED_RUNNING", soNguoi: l.suatMoi.length, phaLe: l.phaLe, policyId: l.policyId }),
    ...l.diemMoi.map((d) => chenDiem(db, l, d, true)),
    ...l.doiThuTu.map((d) => doiThuTuDiem(db, l, l.tripId, d)),
    ...l.mocXep.map((m) => ghi(db.prepare(MOC_XEP_INSERT).bind(crypto.randomUUID(), m.legId, m.ngay, m.gio, l.lucIso, l.nguoiId, l.tripId, l.cmd))),
    ...l.suatMoi.map((s) => chenSuat(db, l, s, true)),
    ...l.chot.map((m) => ghi(db.prepare(MANIFEST_THEM_SAU).bind(crypto.randomUUID(), l.tripId, m.allocationId, m.passengerRowId, l.lucIso, l.nguoiId, l.cmd))),
    ...cauCamKet(db, l, l.tripId, l.camKet),
  ];
}

// ---- Văn phòng báo huỷ MỘT suất (ADR-0052 D5.2 — Đợt 5): chỉ đặt cờ, suất vẫn chiếm chỗ tới khi tài xế ghi "Khách đã huỷ" / "Đã đón" ----------------------
export interface LenhBaoHuy extends LenhChung {
  tripId: string;
  version: number;
  suatId: string;
  lyDo: string;
  detail: string;
}
export function loBaoHuy(db: D1Database, l: LenhBaoHuy): CauCoNhan[] {
  return [
    congDangChayVersion(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_allocation_office_cancelled", l.tripId, l.detail),
    suKien(db, l, { tripId: l.tripId, loai: "ALLOCATION_OFFICE_CANCELLED", allocationId: l.suatId, soNguoi: 1 }),
    ghi(db.prepare(ALLOC_OFFICE_CANCEL).bind(l.suatId, l.tripId, l.cmd, l.lucIso, l.nguoiId, l.lyDo)),
    tuHuyDeNghi(db, l, "SUAT", l.suatId, l.tripId),
  ];
}

// ---- Tài xế bổ sung tên MỘT khách chưa có tên (ADR-0052 D5b — Đợt 5 A-1b, chủ duyệt 5/10) ---------------------------------------------------------------
export interface LenhBoSungTen extends LenhChung {
  tripId: string;
  /** version do MÁY CHỦ đọc (lệnh tài xế không nhận version từ màn). */
  version: number;
  /** Xe đang chạy: cổng RUNNING + bản chốt dòng thêm sau xuất bến; chưa chạy (trong ngày chạy): cổng PLANNED, bản chốt có lúc xuất bến. */
  dangChay: boolean;
  suatId: string;
  /** Khoá người MỚI = id dòng hành khách mới (person_key = id — chuỗi mới). */
  personKey: string;
  /** Câu ghi dòng hành khách do orders cấp (`cauThemHanhKhachTaiXe`) — gác bằng id nhật ký = `cmd`. */
  hanhKhach: D1PreparedStatement;
  detail: string;
}
/** Cổng → nhật ký → sự kiện PASSENGER_NAMED → câu orders (GHI_NGOAI) → gắn tên suất (một lần) → bản chốt dòng thêm sau xuất bến (xe đang chạy). */
export function loBoSungTen(db: D1Database, l: LenhBoSungTen): CauCoNhan[] {
  return [
    l.dangChay ? congDangChayVersion(db, l, l.tripId, l.version) : cong(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_passenger_named", l.tripId, l.detail),
    suKien(db, l, { tripId: l.tripId, loai: "PASSENGER_NAMED", allocationId: l.suatId, soNguoi: 1 }),
    { nhan: "GHI_NGOAI", stmt: l.hanhKhach },
    ghi(db.prepare(ALLOC_GAN_TEN).bind(l.suatId, l.personKey, l.cmd, l.lucIso, l.nguoiId, l.tripId)),
    ...(l.dangChay ? [ghi(db.prepare(MANIFEST_THEM_SAU).bind(crypto.randomUUID(), l.tripId, l.suatId, l.personKey, l.lucIso, l.nguoiId, l.cmd))] : []),
  ];
}

// ---- SỰ KIỆN ĐIỀU CHỈNH CÓ LÝ DO (ADR-0097 — gói A1, V3-B; migration 0085). Chỉ văn phòng bấm (ô trip.progress không ngữ cảnh), chuyến ĐANG CHẠY. ----------
/** Câu sự kiện điều chỉnh (giờ xảy ra = giờ ghi nhận — MAY_CHU), mang mã lý do nhóm DIEU_CHINH. */
const suKienDieuChinh = (db: D1Database, l: LenhChung, tripId: string, loai: "CORRECTION" | "DEPARTURE_REVOKED", allocationId: string | null, lyDo: string): CauCoNhan => ({
  nhan: "SU_KIEN",
  stmt: db.prepare(EVENT_DIEU_CHINH_INSERT).bind(
    l.cmd, tripId, null, loai, null, allocationId, 1, l.requestId, null, "NGUOI", null, null, null, l.lucIso, Date.parse(l.lucIso), "MAY_CHU", l.lucIso, l.nguoiId, lyDo,
  ),
  suKien: { tripId, relatedTripId: null, loai, stopId: null, allocationId },
});
export interface LenhDieuChinh extends LenhChung {
  tripId: string;
  /** version màn văn phòng đang thấy (khuôn lệnh văn phòng trên xe đang chạy — D5): tài xế vừa bấm gì thì lệnh thua cổng → "tải lại". */
  version: number;
  /** Suất cũ (ghi nhầm) — sự kiện CORRECTION trỏ nó; đóng REMOVED rồi mở suất thay thế trỏ về nó (Đ2.3). */
  suatId: string;
  suatMoiId: string;
  trangThaiMoi: TrangThaiSuat;
  lyDo: string;
  /** Bản chốt dòng thêm sau xuất bến cho suất thay thế — chỉ khi suất CÓ tên (dòng hành khách hiện hành của đúng chặng, đúng người). */
  passengerRowId: string | null;
  /** Điểm lên / xuống của suất — bước "điểm tự xong" (Đ2.3: "Đã đón → Vắng" không để điểm trả kẹt ARRIVED). */
  diemXet: string[];
  detail: string;
}
/**
 * Cổng (version + RUNNING) → nhật ký → sự kiện CORRECTION (suất cũ, lý do) → đóng suất cũ (REMOVED, dấu lệnh) → mở suất thay thế (trạng thái mới, cờ thêm sau
 * xuất bến, trỏ suất cũ) → bản chốt (suất có tên) → điểm tự xong → câu CHỐT (trigger vc_trip_correction_balance: đóng đúng một, mở đúng một). Thứ tự đóng TRƯỚC
 * mở: chỉ mục một-suất-mở-mỗi-người và trigger sức chứa cần vậy (ADR-0097 Đ2.3).
 */
export function loDieuChinh(db: D1Database, l: LenhDieuChinh): CauCoNhan[] {
  const xayRa: XayRa = { iso: l.lucIso, ms: Date.parse(l.lucIso), nguon: "MAY_CHU" };
  return [
    congDangChayVersion(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_allocation_corrected", l.tripId, l.detail),
    suKienDieuChinh(db, l, l.tripId, "CORRECTION", l.suatId, l.lyDo),
    dongSuat(db, l, l.tripId, l.suatId, LENH_DONG_SUAT.RUT), // ADR-0097 lựa chọn (b): đóng REMOVED (không thêm giá trị CHECK) — sự kiện CORRECTION phân biệt
    ghi(db.prepare(ALLOC_DIEU_CHINH_INSERT).bind(l.suatMoiId, l.tripId, l.suatId, l.trangThaiMoi, l.cmd, l.lucIso, l.nguoiId)),
    ...(l.passengerRowId ? [ghi(db.prepare(MANIFEST_THEM_SAU).bind(crypto.randomUUID(), l.tripId, l.suatMoiId, l.passengerRowId, l.lucIso, l.nguoiId, l.cmd))] : []),
    ...l.diemXet.map((d) => xongNeuHet(db, l, l.tripId, d, xayRa)),
    tuHuyDeNghi(db, l, "SUAT", l.suatId, l.tripId),
    { nhan: "TRANG_THAI_CUOI", stmt: db.prepare(TRIP_CHOT).bind(l.tripId, l.cmd) },
  ];
}
export interface LenhThuHoiXuatBen extends LenhChung {
  tripId: string;
  version: number;
  lyDo: string;
  detail: string;
}
/**
 * Cổng (version + RUNNING) → nhật ký → sự kiện DEPARTURE_REVOKED (lý do) → RUNNING → PLANNED, xoá giờ xuất bến (trạng thái cuối). Bản chụp lúc xuất bến, bản
 * chốt, sự kiện DEPARTED giữ nguyên (Đ3.4) — xuất bến lại tạo bản chụp mới mang dấu lệnh mới.
 */
export function loThuHoiXuatBen(db: D1Database, l: LenhThuHoiXuatBen): CauCoNhan[] {
  return [
    congDangChayVersion(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_departure_revoked", l.tripId, l.detail),
    suKienDieuChinh(db, l, l.tripId, "DEPARTURE_REVOKED", null, l.lyDo),
    tuHuyDeNghi(db, l, "CHUYEN", l.tripId, l.tripId),
    { nhan: "TRANG_THAI_CUOI", stmt: db.prepare(TRIP_THU_HOI_XUAT_BEN).bind(l.tripId, l.cmd, l.lucIso, l.nguoiId) },
  ];
}

// ---- Cập nhật khách theo đơn (route 41 — R-P29, chủ lần 16; khuôn route 40; ADR-0104 Đ2.11 nút tay dùng chung luật thuần) -----------------------------------
export interface LenhCapNhatKhach extends LenhChung {
  tripId: string;
  version: number;
  /** Suất đóng, mã theo luật của từng chặng (`dongBoChuyenTheoDon`): REMOVED (đơn huỷ / bỏ chặng / đơn không xác nhận / thừa suất chưa tên), PASSENGER_CHANGED (khách đổi). */
  dong: { suatId: string; lyDo: LyDoDongSuat }[];
  /** Suất mở lại sau khi đổi khách (cùng chặng, cùng điểm, khoá rảnh hoặc null). */
  mo: SuatMoi[];
  diemBoQua: string[];
  /** ADR-0056 VK3-A, C7: lệnh chỉ GIẢM khách — chỉ XOÁ cột phá lệ cam kết khi hết vi phạm (`{ null, null }`); null = không chạm. */
  camKet: CamKetLo | null;
  detail: string;
}
/** Cổng → nhật ký → MỘT sự kiện (số = số suất đóng) → ĐÓNG hết rồi MỚI MỞ (LC-02 đếm theo dòng — khuôn khúc của `loDongBoChuyen`) → bỏ điểm → cam kết. */
export function loCapNhatKhach(db: D1Database, l: LenhCapNhatKhach): CauCoNhan[] {
  return [
    cong(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_passengers_synced", l.tripId, l.detail),
    suKien(db, l, { tripId: l.tripId, loai: "ALLOCATION_PASSENGER_CHANGED", soNguoi: l.dong.length }),
    ...l.dong.map((d) => dongSuat(db, l, l.tripId, d.suatId, d.lyDo)),
    ...l.mo.map((s) => chenSuat(db, l, s)),
    ...l.diemBoQua.map((id) => boQuaDiem(db, l, l.tripId, id, LY_DO_BO_QUA_KHONG_CON_KHACH)),
    ...cauCamKet(db, l, l.tripId, l.camKet),
  ];
}

// ---- Đồng bộ chuyến theo đơn (ADR-0104 Đ2 — máy; lô CHUNG với lệnh đơn) -------------------------------------------------------------------------------
/** Một KHÚC chuyến của lô đồng bộ: dấu lệnh + request_id RIÊNG (Đ2.3 — `vc_trip_event.request_id` UNIQUE), cổng hỏi nhật ký đơn `auditIdDon` của đơn `orderId`. */
export interface KhucLoDongBo extends LenhChung {
  tripId: string;
  version: number;
  auditIdDon: string;
  orderId: string;
  /** Đóng trước (mã theo luật: REMOVED / PASSENGER_CHANGED), mở sau — LC-02 đếm theo dòng. */
  dong: { suatId: string; lyDo: LyDoDongSuat }[];
  mo: SuatMoi[];
  diemBoQua: string[];
  /** Chỉ XOÁ cột phá lệ cam kết khi hết vi phạm (`{ null, null }`); null = không chạm. */
  camKet: CamKetLo | null;
  /** Số ghế đổi (đóng + mở) — cột `count` của sự kiện. */
  soNguoi: number;
  detail: string;
}
/**
 * Lô ĐỒNG BỘ CHUYẾN THEO ĐƠN (ADR-0104 Đ2.1, Đ2.3): `[câu đơn…, khúc chuyến 1…, khúc chuyến 2…]`. Câu đơn (`cauDon` — orders soạn, chưa chạy) đứng ĐẦU, giữ
 * nguyên thứ tự (chỉ số kết quả mà route đơn đọc để biết thắng không đổi). Mỗi khúc: cổng theo đơn (`TRIP_GATE_THEO_DON` — đơn thua lặng lẽ ⇒ cổng chuyến
 * thua theo) → nhật ký `trip_order_synced` (`changes() > 0`) → MỘT sự kiện `ALLOCATION_ORDER_SYNCED` (request_id của khúc) → đóng → mở → bỏ điểm → cam kết,
 * mọi câu sau cổng gác `last_cmd_id` = dấu lệnh của khúc. Không câu nào chạm bảng ord_* hay audit_log ngoài phần `cauDon` nối nguyên.
 */
export function loDongBoChuyen(db: D1Database, l: { cauDon: readonly D1PreparedStatement[]; khuc: readonly KhucLoDongBo[] }): CauCoNhan[] {
  return [
    ...l.cauDon.map((stmt): CauCoNhan => ({ nhan: "CAU_DON", stmt })),
    ...l.khuc.flatMap((k) => [
      { nhan: "CONG" as const, stmt: db.prepare(TRIP_GATE_THEO_DON).bind(k.tripId, k.version, k.cmd, k.lucIso, k.nguoiId, k.auditIdDon, k.orderId) },
      nhatKy(db, k, "trip_order_synced", k.tripId, k.detail),
      suKien(db, k, { tripId: k.tripId, loai: "ALLOCATION_ORDER_SYNCED", soNguoi: k.soNguoi }), // decided NGUOI: created_by = người sửa đơn (Đ2.9) hiện trên lịch sử chuyến
      ...k.dong.map((d) => dongSuat(db, k, k.tripId, d.suatId, d.lyDo)),
      ...k.mo.map((s) => chenSuat(db, k, s)),
      ...k.diemBoQua.map((id) => boQuaDiem(db, k, k.tripId, id, LY_DO_BO_QUA_KHONG_CON_KHACH)),
      ...cauCamKet(db, k, k.tripId, k.camKet),
    ].map((c): CauCoNhan => ({ ...c, cmd: k.cmd }))),
  ];
}

// =========================================================================================================================================================
// LỆNH TIẾN ĐỘ (Task A15; kế hoạch mục 1.5; ADR-0050 VK1-A). Sự kiện mang giờ XẢY RA (`occurred_*`) + nguồn: `MAY_CHU` ⇒ đúng CHUỖI lúc bấm của request (I33 —
// CHECK occurred_at = created_at); `VAN_PHONG_KHAI` ⇒ giờ văn phòng khai (đã qua kiemGioXayRa) + chính sách đã dùng (CHECK policy_id). Cột giờ trên điểm /
// chuyến chép ĐÚNG cặp giờ xảy ra của sự kiện cùng lô.
// =========================================================================================================================================================
export interface XayRa {
  iso: string;
  ms: number;
  nguon: NguonGioXayRa;
}
interface SuKienTienDoVao {
  tripId: string;
  loai: LoaiSuKienChuyen;
  stopId?: string | null;
  allocationId?: string | null;
  soNguoi?: number | null;
  xayRa: XayRa;
  policyId: string | null;
}
const suKienTienDo = (db: D1Database, l: LenhChung, e: SuKienTienDoVao): CauCoNhan => ({
  nhan: "SU_KIEN",
  stmt: db.prepare(EVENT_INSERT).bind(
    l.cmd, e.tripId, null, e.loai, e.stopId ?? null, e.allocationId ?? null, e.soNguoi ?? null, l.requestId, null, "NGUOI", null, null, e.policyId,
    e.xayRa.iso, e.xayRa.ms, e.xayRa.nguon, l.lucIso, l.nguoiId,
  ),
  suKien: { tripId: e.tripId, relatedTripId: null, loai: e.loai, stopId: e.stopId ?? null, allocationId: e.allocationId ?? null },
});
const congTienDo = (db: D1Database, l: LenhChung, tripId: string): CauCoNhan => ({ nhan: "CONG", stmt: db.prepare(TRIP_GATE_TIEN_DO).bind(tripId, l.cmd, l.lucIso, l.nguoiId) });
const congDangChay = (db: D1Database, l: LenhChung, tripId: string): CauCoNhan => ({ nhan: "CONG", stmt: db.prepare(TRIP_GATE_DANG_CHAY).bind(tripId, l.cmd, l.lucIso, l.nguoiId) });
const xongNeuHet = (db: D1Database, l: LenhChung, tripId: string, stopId: string, xayRa: XayRa): CauCoNhan =>
  ghi(db.prepare(STOP_XONG_NEU_HET).bind(stopId, tripId, xayRa.iso, l.lucIso, l.nguoiId, l.cmd));

// ---- Xuất bến (route 21 / 31 — lô xuất bến mục 1.5) ---------------------------------------------------------------------------------------------------------
export interface LenhXuatBen extends LenhChung {
  tripId: string;
  /** version do MÁY CHỦ đọc (I23) — lệnh tiến độ không nhận version từ màn. */
  version: number;
  xayRa: XayRa;
  policyId: string;
  ganTen: readonly GanTen[];
  chup: { id: string; xeId: string; bienSo: string; soCho: number; chuXePartyId: string; taiXePartyId: string; nghiDaDung: number };
  muc: readonly MucChup[];
  /** Bản chốt: mỗi suất mở một dòng — khách trỏ DÒNG hành khách đã dùng, người đi kèm trỏ hồ sơ. */
  chot: readonly { allocationId: string; passengerRowId: string | null; crewPartyId: string | null }[];
  soKhach: number;
  /** ADR-0056 VK3-A: cổng thấy HẾT vi phạm cam kết mà chuyến đang có cột phá lệ → xoá hai cột trong cùng lô (trước câu sang RUNNING). */
  xoaCamKet: boolean;
  detail: string;
}
/**
 * Thứ tự (mục 1.5): cổng → nhật ký → sự kiện DEPARTED → gắn tên còn thiếu → bản chụp + dòng con → bản chốt → (xoá phá lệ cam kết) → sang RUNNING (sau bản
 * chụp — LC-05).
 */
export function loXuatBen(db: D1Database, l: LenhXuatBen): CauCoNhan[] {
  const c = l.chup;
  return [
    cong(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_departed", l.tripId, l.detail),
    suKienTienDo(db, l, { tripId: l.tripId, loai: "DEPARTED", soNguoi: l.soKhach, xayRa: l.xayRa, policyId: l.policyId }),
    ...l.ganTen.map((g) => ghi(db.prepare(ALLOC_GAN_TEN).bind(g.suatId, g.personKey, l.cmd, l.lucIso, l.nguoiId, l.tripId))),
    ghi(db.prepare(CHECK_INSERT).bind(c.id, l.tripId, l.cmd, l.policyId, c.xeId, c.bienSo, c.soCho, c.chuXePartyId, c.taiXePartyId, c.nghiDaDung, l.lucIso, l.nguoiId)),
    ...l.muc.map((m) => ghi(db.prepare(CHECK_ITEM_INSERT).bind(
      crypto.randomUUID(), c.id, m.loai, m.vehicleDocumentId, m.personDocumentId, m.documentTypeCode, m.licenseClassCode, m.expiryDate, m.ruleId, l.lucIso, l.nguoiId, l.tripId, l.cmd,
    ))),
    ...l.chot.map((m) => ghi(db.prepare(MANIFEST_INSERT).bind(crypto.randomUUID(), l.tripId, c.id, m.allocationId, m.passengerRowId, m.crewPartyId, l.lucIso, l.nguoiId, l.cmd))),
    ...cauCamKet(db, l, l.tripId, l.xoaCamKet ? { lyDo: null, khoa: null } : null),
    ghi(db.prepare(TRIP_XUAT_BEN).bind(l.tripId, l.cmd, l.xayRa.iso, l.xayRa.ms, l.lucIso, l.nguoiId)),
  ];
}

// ---- Xe đã tới điểm (route 22 / 32) ------------------------------------------------------------------------------------------------------------------------
export interface LenhDaToi extends LenhChung {
  tripId: string;
  stopId: string;
  xayRa: XayRa;
  policyId: string | null;
  detail: string;
}
/** Khuôn (a): chuyển điểm → cổng `changes() > 0` → nhật ký → sự kiện → điểm tự xong nếu không còn ai phải xử lý (I20). */
export function loDaToi(db: D1Database, l: LenhDaToi): CauCoNhan[] {
  return [
    { nhan: "CHUYEN_TIEN_DO", stmt: db.prepare(STOP_DA_TOI).bind(l.stopId, l.tripId, l.xayRa.iso, l.lucIso, l.nguoiId) },
    congTienDo(db, l, l.tripId),
    nhatKy(db, l, "trip_stop_arrived", l.tripId, l.detail),
    suKienTienDo(db, l, { tripId: l.tripId, loai: "STOP_ARRIVED", stopId: l.stopId, xayRa: l.xayRa, policyId: l.policyId }),
    xongNeuHet(db, l, l.tripId, l.stopId, l.xayRa),
    tuHuyDeNghi(db, l, "DIEM", l.stopId, l.tripId),
  ];
}

// ---- Suất: đã đón / vắng / khách huỷ / đã trả (route 23–26 / 33–36) --------------------------------------------------------------------------------------
/** Một lệnh của suất: trạng thái mới, trạng thái nguồn hợp lệ (khớp trigger LC-07), điểm phải đã tới, loại sự kiện, hành động nhật ký. */
export const LENH_SUAT = {
  DA_DON: { moi: "BOARDED", tu: ["WAITING", "NO_SHOW"], phia: "LEN", suKien: "PASSENGER_BOARDED", action: "trip_passenger_boarded" },
  VANG: { moi: "NO_SHOW", tu: ["WAITING"], phia: "LEN", suKien: "PASSENGER_NO_SHOW", action: "trip_passenger_no_show" },
  KHACH_HUY: { moi: "CANCELLED_AT_STOP", tu: ["WAITING"], phia: "LEN", suKien: "PASSENGER_CANCELLED_AT_STOP", action: "trip_passenger_cancelled_at_stop" },
  DA_TRA: { moi: "DROPPED", tu: ["BOARDED"], phia: "XUONG", suKien: "PASSENGER_DROPPED", action: "trip_passenger_dropped" },
} as const satisfies Record<string, { moi: TrangThaiSuat; tu: readonly TrangThaiSuat[]; phia: "LEN" | "XUONG"; suKien: LoaiSuKienChuyen; action: AuditAction }>;
export type LoaiLenhSuat = keyof typeof LENH_SUAT;
export interface LenhSuat extends LenhChung {
  tripId: string;
  suatId: string;
  lenh: LoaiLenhSuat;
  /** Điểm của sự kiện (điểm lên, hoặc điểm xuống khi đã trả) — null với người đi kèm. */
  stopId: string | null;
  /** Điểm xét "tự xong" sau lệnh (điểm lên + điểm xuống của suất). */
  diemXet: readonly string[];
  xayRa: XayRa;
  policyId: string | null;
  detail: string;
}
export function loSuat(db: D1Database, l: LenhSuat): CauCoNhan[] {
  const k = LENH_SUAT[l.lenh];
  return [
    { nhan: "CHUYEN_TIEN_DO", stmt: db.prepare(ALLOC_TIEN_DO).bind(l.suatId, l.tripId, k.moi, l.lucIso, l.nguoiId, JSON.stringify(k.tu), k.phia) },
    congTienDo(db, l, l.tripId),
    nhatKy(db, l, k.action, l.tripId, l.detail),
    suKienTienDo(db, l, { tripId: l.tripId, loai: k.suKien, stopId: l.stopId, allocationId: l.suatId, soNguoi: 1, xayRa: l.xayRa, policyId: l.policyId }),
    ...l.diemXet.map((id) => xongNeuHet(db, l, l.tripId, id, l.xayRa)),
  ];
}

// ---- Kết thúc (route 27 / 37) ------------------------------------------------------------------------------------------------------------------------------
export interface LenhKetThuc extends LenhChung {
  tripId: string;
  xayRa: XayRa;
  policyId: string | null;
  detail: string;
}
/** Khuôn (b): cổng (đang chạy) → nhật ký → sự kiện ENDED → trạng thái cuối (LC-16 ở CSDL giữ "không còn khách / điểm chưa xong"). */
export function loKetThuc(db: D1Database, l: LenhKetThuc): CauCoNhan[] {
  return [
    congDangChay(db, l, l.tripId),
    nhatKy(db, l, "trip_ended", l.tripId, l.detail),
    suKienTienDo(db, l, { tripId: l.tripId, loai: "ENDED", xayRa: l.xayRa, policyId: l.policyId }),
    tuHuyDeNghi(db, l, "CHUYEN", l.tripId, l.tripId),
    { nhan: "TRANG_THAI_CUOI", stmt: db.prepare(TRIP_KET_THUC).bind(l.tripId, l.cmd, "ENDED", null, l.xayRa.iso, l.xayRa.ms, l.lucIso, l.nguoiId) },
  ];
}

// ---- Kết thúc gián đoạn (route 28 / 38 — ADR D1 :110–117; [TK] §2.1a) ---------------------------------------------------------------------------------------
export interface LenhKetThucGianDoan extends LenhKetThuc {
  lyDo: string;
  soSuatDong: number;
}
/**
 * Cổng → nhật ký → sự kiện ENDED_INTERRUPTED (PHẢI đứng trước: hai ngoại lệ trigger — đóng suất khi đang chạy (LC-15), điểm ARRIVED → SKIPPED (LC-07) — tìm sự
 * kiện mang dấu lệnh hiện hành) → đóng suất còn chờ / đang trên xe (TRIP_INTERRUPTED) → bỏ điểm chưa xong → trạng thái cuối.
 */
export function loKetThucGianDoan(db: D1Database, l: LenhKetThucGianDoan): CauCoNhan[] {
  return [
    congDangChay(db, l, l.tripId),
    nhatKy(db, l, "trip_ended_interrupted", l.tripId, l.detail),
    suKienTienDo(db, l, { tripId: l.tripId, loai: "ENDED_INTERRUPTED", soNguoi: l.soSuatDong, xayRa: l.xayRa, policyId: l.policyId }),
    ghi(db.prepare(ALLOCS_DONG_GIAN_DOAN).bind(l.tripId, l.cmd, l.lucIso, l.nguoiId)),
    ghi(db.prepare(STOPS_SKIP_ALL).bind(l.tripId, l.cmd, l.lyDo, l.lucIso, l.nguoiId)),
    tuHuyDeNghi(db, l, "CHUYEN", l.tripId, l.tripId),
    { nhan: "TRANG_THAI_CUOI", stmt: db.prepare(TRIP_KET_THUC).bind(l.tripId, l.cmd, "ENDED_INTERRUPTED", l.lyDo, l.xayRa.iso, l.xayRa.ms, l.lucIso, l.nguoiId) },
  ];
}

// ---- Đổi thứ tự điểm chưa tới khi xe đang chạy (route 29 / 39) — luôn giờ máy chủ (không khai giờ — I35) ------------------------------------------------------
export interface LenhDoiThuTu extends LenhChung {
  tripId: string;
  diem: readonly { id: string; seq: number }[];
  policyId: string | null;
  detail: string;
}
export function loDoiThuTu(db: D1Database, l: LenhDoiThuTu): CauCoNhan[] {
  return [
    congDangChay(db, l, l.tripId),
    nhatKy(db, l, "trip_stops_reordered", l.tripId, l.detail),
    suKienTienDo(db, l, { tripId: l.tripId, loai: "STOPS_REORDERED", soNguoi: l.diem.length, xayRa: { iso: l.lucIso, ms: Date.parse(l.lucIso), nguon: "MAY_CHU" }, policyId: l.policyId }),
    ...l.diem.map((d) => ghi(db.prepare(STOP_SET_SEQ).bind(d.id, l.tripId, l.cmd, d.seq, l.lucIso, l.nguoiId))),
  ];
}

// =========================================================================================================================================================
// CHUYỂN KHÁCH GIỮA HAI XE (ADR-0111, thi hành ADR-0052 D4 / D5c — gói A5). Sự kiện + nhật ký ghi ở chuyến ĐÍCH (B), nguồn (A) ở related_trip_id (G-A5-11);
// nhật ký `detail` chỉ mã chuyến, phạm vi, số khách, mã luật không đạt (không tên, chữ nơi gặp, khoá nơi). Mọi câu sau câu cổng gác theo B. Sự kiện không
// mang luật bị bỏ qua (G-A5-3) — `decided` = MAY khi máy quyết (xác nhận tự động / leo thang), NGUOI còn lại.
// =========================================================================================================================================================
/** Đề nghị mà lô vòng đời nhắm: id, hai chuyến. */
export interface DeNghiLo {
  id: string;
  tuChuyen: string;
  denChuyen: string;
}
export interface LenhGuiDeNghi extends LenhChung {
  /** Chuyến đích + version máy chủ đọc (cổng). */
  dich: { tripId: string; version: number };
  nguonId: string;
  phamVi: "STOP" | "ONBOARD";
  diemId: string | null;
  noiGap: { diaDiemId: string | null; chu: string | null };
  soKhach: number;
  /** Hồ sơ tài xế ĐANG LÁI nguồn (người gửi — LC-14); tài khoản bấm (tài xế, hoặc văn phòng gửi thay cứu hộ) ở `nguoiId`. */
  nguoiGuiPartyId: string;
  detail: string;
}
/** Lô GỬI (LC-14): cổng đích → nhật ký → sự kiện TRANSFER_SENT (đích, nguồn ở related) → dòng đề nghị (id = dấu lệnh; trigger đòi đích mang dấu lệnh = id). */
export function loGuiDeNghi(db: D1Database, l: LenhGuiDeNghi): CauCoNhan[] {
  const b = l.dich.tripId;
  return [
    { nhan: "CONG", stmt: db.prepare(TRIP_GATE_CHAY_HOAC_CHO).bind(b, l.dich.version, l.cmd, l.lucIso, l.nguoiId) },
    nhatKy(db, l, "trip_transfer_sent", b, l.detail),
    suKien(db, l, { tripId: b, relatedTripId: l.nguonId, loai: "TRANSFER_SENT", soNguoi: l.soKhach }),
    ghi(db.prepare(TRANSFER_INSERT).bind(
      l.cmd, l.nguonId, b, l.phamVi, l.diemId, l.noiGap.diaDiemId, l.noiGap.chu, l.soKhach, l.nguoiGuiPartyId, l.nguoiId, l.lucIso, l.requestId, l.nguoiId,
    )),
  ];
}
/** Cổng lô vòng đời ở chuyến đích: đề nghị còn ở một trạng thái thuộc `tu` (bấm hai lần / hai người cùng bấm: một lô thắng). */
const congDeNghi = (db: D1Database, l: LenhChung, r: DeNghiLo, tu: readonly string[]): CauCoNhan => ({
  nhan: "CONG",
  stmt: db.prepare(TRIP_GATE_DE_NGHI).bind(r.denChuyen, l.cmd, l.lucIso, l.nguoiId, r.id, JSON.stringify(tu)),
});
/** Đóng đề nghị không đụng cột quyết định (Rút / Hết hạn — Đ3 (b)), gác chuyến đích. */
const dongDeNghi = (db: D1Database, l: LenhChung, r: DeNghiLo, moi: "WITHDRAWN" | "EXPIRED", tu: readonly string[]): CauCoNhan =>
  ghi(db.prepare(TRANSFER_DONG).bind(r.id, moi, l.cmd, l.lucIso, l.nguoiId, r.denChuyen, JSON.stringify(tu)));

export interface LenhRutDeNghi extends LenhChung {
  deNghi: DeNghiLo;
  soKhach: number;
  detail: string;
}
/** Lô RÚT (tài xế nguồn; chỉ khi Chờ): cổng đích (đề nghị Chờ) → nhật ký → sự kiện TRANSFER_WITHDRAWN → đề nghị WITHDRAWN. */
export function loRutDeNghi(db: D1Database, l: LenhRutDeNghi): CauCoNhan[] {
  const r = l.deNghi;
  return [
    congDeNghi(db, l, r, ["PENDING"]),
    nhatKy(db, l, "trip_transfer_withdrawn", r.denChuyen, l.detail),
    suKien(db, l, { tripId: r.denChuyen, relatedTripId: r.tuChuyen, loai: "TRANSFER_WITHDRAWN", soNguoi: l.soKhach }),
    dongDeNghi(db, l, r, "WITHDRAWN", ["PENDING"]),
  ];
}

/** Một dòng kiểm của lần bấm (luật thuần `kiemChuyen`; tầng theo danh mục — trigger so lại). */
export interface DongKiemLo {
  ma: string;
  tang: "LOI" | "CAU_HINH";
  ketQua: "DAT" | "KHONG_DAT" | "CANH_BAO";
  giaTri: number | null;
  gioiHan: number | null;
}
/** Các dòng kiểm của lần bấm — TRƯỚC câu đổi trạng thái đề nghị (trigger ck_check đòi đề nghị còn Chờ / Leo thang; confirm / escalate đếm đủ dòng). */
const cauKiem = (db: D1Database, l: LenhChung, r: DeNghiLo, kiem: readonly DongKiemLo[]): CauCoNhan[] =>
  kiem.map((k) => ghi(db.prepare(TRANSFER_CHECK_INSERT).bind(crypto.randomUUID(), r.id, l.cmd, k.ma, k.tang, k.ketQua, k.giaTri, k.gioiHan, l.lucIso, l.nguoiId, r.denChuyen)));

export interface LenhKhongNhanDeNghi extends LenhChung {
  deNghi: DeNghiLo;
  /** Hồ sơ tài xế đang lái xe nhận (Đ3 (b) — người quyết lần thứ nhất). */
  taiXePartyId: string;
  lyDo: string;
  soKhach: number;
  detail: string;
}
/** Lô KHÔNG NHẬN (tài xế xe nhận; Chờ, chưa quá hạn): cổng đích → nhật ký → sự kiện TRANSFER_DECLINED → đề nghị DECLINED (lý do nhóm TU_CHOI_NHAN). */
export function loKhongNhanDeNghi(db: D1Database, l: LenhKhongNhanDeNghi): CauCoNhan[] {
  const r = l.deNghi;
  return [
    congDeNghi(db, l, r, ["PENDING"]),
    nhatKy(db, l, "trip_transfer_declined", r.denChuyen, l.detail),
    suKien(db, l, { tripId: r.denChuyen, relatedTripId: r.tuChuyen, loai: "TRANSFER_DECLINED", soNguoi: l.soKhach }),
    ghi(db.prepare(TRANSFER_QUYET).bind(r.id, "DECLINED", l.cmd, l.lucIso, l.nguoiId, l.taiXePartyId, null, l.cmd, l.lyDo, r.denChuyen)),
  ];
}

export interface LenhHetHanDeNghi extends LenhChung {
  deNghi: DeNghiLo;
  soKhach: number;
  detail: string;
}
/** Lô HẾT HẠN (MQ-08 — ghi khi có người bấm tiếp vào đề nghị Chờ đã quá hạn; không Cron): cổng đích → nhật ký → TRANSFER_EXPIRED → đề nghị EXPIRED. */
export function loHetHanDeNghi(db: D1Database, l: LenhHetHanDeNghi): CauCoNhan[] {
  const r = l.deNghi;
  return [
    congDeNghi(db, l, r, ["PENDING"]),
    nhatKy(db, l, "trip_transfer_expired", r.denChuyen, l.detail),
    suKien(db, l, { tripId: r.denChuyen, relatedTripId: r.tuChuyen, loai: "TRANSFER_EXPIRED", soNguoi: l.soKhach, decided: "MAY" }),
    dongDeNghi(db, l, r, "EXPIRED", ["PENDING"]),
  ];
}

export interface LenhLeoThangDeNghi extends LenhChung {
  deNghi: DeNghiLo;
  taiXePartyId: string;
  kiem: DongKiemLo[];
  soKhach: number;
  detail: string;
}
/** Lô LEO THANG (tài xế xe nhận bấm Nhận; có điều kiện không đạt hoặc công tắc tự đồng ý tắt): cổng đích → nhật ký → TRANSFER_ESCALATED → dòng kiểm → ESCALATED. */
export function loLeoThangDeNghi(db: D1Database, l: LenhLeoThangDeNghi): CauCoNhan[] {
  const r = l.deNghi;
  return [
    congDeNghi(db, l, r, ["PENDING"]),
    nhatKy(db, l, "trip_transfer_escalated", r.denChuyen, l.detail),
    suKien(db, l, { tripId: r.denChuyen, relatedTripId: r.tuChuyen, loai: "TRANSFER_ESCALATED", soNguoi: l.soKhach, decided: "MAY" }),
    ...cauKiem(db, l, r, l.kiem),
    ghi(db.prepare(TRANSFER_QUYET).bind(r.id, "ESCALATED", l.cmd, l.lucIso, l.nguoiId, l.taiXePartyId, null, null, null, r.denChuyen)),
  ];
}

/** Một suất chuyển: đóng ở xe nhờ (`dongId`) NGAY TRƯỚC khi mở bản sao ở xe nhận (`moId`, điểm lên / xuống của xe nhận). */
export interface CapChuyenKhach {
  dongId: string;
  moId: string;
  len: string | null;
  xuong: string | null;
}
export interface LenhXacNhanDeNghi extends LenhChung {
  deNghi: DeNghiLo;
  /** Version máy chủ đọc: xe nhờ (đang chạy) và xe nhận. */
  nguonVersion: number;
  dichVersion: number;
  /** Nhận (máy tự xác nhận — từ Chờ, chế độ MAY, ghi hồ sơ tài xế xe nhận) hoặc Duyệt (từ Leo thang, chế độ NGUOI, lý do PHA_LE). */
  quyet: { kieu: "MAY"; taiXePartyId: string } | { kieu: "NGUOI"; lyDo: string };
  kiem: DongKiemLo[];
  diemMoi: DiemMoi[];
  doiThuTu: { id: string; seq: number }[];
  /** Xe nhận đang chạy: điểm mới mang cờ thêm khi chạy (trigger LC-15 đòi sự kiện TRANSFER_CONFIRMED mang dấu lệnh). */
  dichDangChay: boolean;
  cap: CapChuyenKhach[];
  /** STOP: điểm đón nguồn → MOVED; ONBOARD: null. */
  diemNguon: string | null;
  /** Bản chốt dòng thêm sau xuất bến (xe nhận đã xuất bến): khách có tên HOẶC người đi kèm. */
  chot: { allocationId: string; passengerRowId: string | null; crewPartyId: string | null }[];
  /** ADR-0056 VK3-A: cột phá lệ cam kết của xe NHẬN (Duyệt: ghi; hết vi phạm: xoá); null = không chạm. Xe nhờ đang chạy — không chạm (khuôn loCapNhatDiem). */
  camKetDich: CamKetLo | null;
  detail: string;
}
/**
 * Lô XÁC NHẬN (Nhận tự động / Duyệt — ADR-0111 Sửa chữ 1, cổng đôi khuôn loDoi): cổng xe nhờ (đang chạy, version) → cổng xe nhận (đề nghị còn Chờ / Leo
 * thang, xe nhờ đã mang dấu lệnh) → nhật ký → sự kiện TRANSFER_CONFIRMED (trigger LC-15 tìm sự kiện mang dấu lệnh) → dòng kiểm → đề nghị CONFIRMED (trigger
 * suất đòi CONFIRMED trước) → thêm điểm ở xe nhận → sắp lại → từng suất: đóng ở xe nhờ, mở ở xe nhận → điểm nguồn MOVED → bản chốt → tự huỷ đề nghị chờ khác
 * (P4) → cam kết xe nhận. Mọi câu sau cổng gác xe NHẬN.
 */
export function loXacNhanDeNghi(db: D1Database, l: LenhXacNhanDeNghi): CauCoNhan[] {
  const r = l.deNghi;
  const gac = r.denChuyen;
  const may = l.quyet.kieu === "MAY";
  const lo: CauCoNhan[] = [
    congDangChayVersion(db, l, r.tuChuyen, l.nguonVersion),
    {
      nhan: "CONG_DOI",
      stmt: db.prepare(TRIP_GATE_DOI_CHAY).bind(gac, l.dichVersion, l.cmd, l.lucIso, l.nguoiId, r.tuChuyen, r.id, JSON.stringify([may ? "PENDING" : "ESCALATED"])),
    },
    nhatKy(db, l, "trip_transfer_confirmed", gac, l.detail),
    suKien(db, l, { tripId: gac, relatedTripId: r.tuChuyen, loai: "TRANSFER_CONFIRMED", soNguoi: l.cap.length, decided: may ? "MAY" : "NGUOI" }),
    ...cauKiem(db, l, r, l.kiem),
    l.quyet.kieu === "MAY"
      ? ghi(db.prepare(TRANSFER_QUYET).bind(r.id, "CONFIRMED", l.cmd, l.lucIso, l.nguoiId, l.quyet.taiXePartyId, "MAY", l.cmd, null, gac))
      : ghi(db.prepare(TRANSFER_DUYET).bind(r.id, "CONFIRMED", l.cmd, l.lucIso, l.nguoiId, l.quyet.lyDo, null, gac)),
    ...l.diemMoi.map((d) => chenDiem(db, l, d, l.dichDangChay)),
    ...l.doiThuTu.map((d) => doiThuTuDiem(db, l, gac, d)),
  ];
  for (const c of l.cap) {
    lo.push(ghi(db.prepare(ALLOC_CLOSE_TRANSFER).bind(c.dongId, r.tuChuyen, l.cmd, l.lucIso, l.nguoiId, r.id, gac)));
    lo.push(ghi(db.prepare(ALLOC_OPEN_TRANSFER).bind(c.moId, gac, c.dongId, c.len, c.xuong, r.id, l.cmd, l.lucIso, l.nguoiId)));
  }
  if (l.diemNguon !== null) lo.push(ghi(db.prepare(STOP_SET_MOVED).bind(l.diemNguon, r.tuChuyen, l.cmd, l.lucIso, l.nguoiId, gac)));
  lo.push(...l.chot.map((m) => ghi(db.prepare(MANIFEST_CHUYEN_KHACH).bind(crypto.randomUUID(), gac, m.allocationId, m.passengerRowId, m.crewPartyId, l.lucIso, l.nguoiId, l.cmd))));
  lo.push(ghi(db.prepare(TRANSFERS_VOID_KHAC).bind(r.tuChuyen, r.id, l.diemNguon, l.cmd, l.lucIso, l.nguoiId, gac)));
  lo.push(...cauCamKet(db, l, gac, l.camKetDich));
  return lo;
}

export interface LenhBacDeNghi extends LenhChung {
  deNghi: DeNghiLo;
  lyDo: string;
  soKhach: number;
  detail: string;
}
/** Lô BÁC (Quản trị / Toàn quyền; đề nghị Leo thang): cổng đích → nhật ký → TRANSFER_REJECTED → đề nghị REJECTED (lý do nhóm TU_CHOI_NHAN). Suất không đổi. */
export function loBacDeNghi(db: D1Database, l: LenhBacDeNghi): CauCoNhan[] {
  const r = l.deNghi;
  return [
    congDeNghi(db, l, r, ["ESCALATED"]),
    nhatKy(db, l, "trip_transfer_rejected", r.denChuyen, l.detail),
    suKien(db, l, { tripId: r.denChuyen, relatedTripId: r.tuChuyen, loai: "TRANSFER_REJECTED", soNguoi: l.soKhach }),
    ghi(db.prepare(TRANSFER_DUYET).bind(r.id, "REJECTED", l.cmd, l.lucIso, l.nguoiId, null, l.lyDo, r.denChuyen)),
  ];
}

// =========================================================================================================================================================
// HỌ LỆNH TRÊN MỐC GIỜ HẸN (ADR-0051 GB1 — "Đã gọi báo", "Bỏ đánh dấu"; ruling VỪA-2). KHÔNG chạm vc_trip* (không kiểm / tăng version — người xếp xe không
// nhận 409 oan; làm được khi chuyến đang chạy): lô ĐÚNG HAI câu — câu cổng nhãn CONG_MOC (`INSERT … WHERE max(seq) = phienBan`) rồi nhật ký `changes() > 0`.
// Bài thứ tự lô (thu-tu-lo.test.ts) có nhánh ngoại lệ luật 3 LIỆT KÊ TÊN hai hàm này; hàm khác dùng CONG_MOC → đỏ.
// =========================================================================================================================================================
export interface LenhMoc extends LenhChung {
  legId: string;
  /** seq của mốc hiện hành mà màn đã thấy. */
  phienBan: number;
  /** Giờ "đã biết" SAU dòng mới / TRƯỚC dòng mới (Bỏ đánh dấu: đảo của dòng DA_GOI). */
  moi: { ngay: string; gio: string | null };
  cu: { ngay: string; gio: string | null };
  /** Chuyến đang chở khách chờ đón của chặng — đích nhật ký (targetType "trip"; orderId NULL — I17). */
  tripId: string;
  detail: string;
}
const congMoc = (db: D1Database, l: LenhMoc, loai: "DA_GOI" | "BO_DANH_DAU", banChup: string | null): CauCoNhan => ({
  nhan: "CONG_MOC",
  stmt: db.prepare(MOC_GOI_INSERT).bind(l.cmd, l.legId, l.phienBan, loai, l.moi.ngay, l.moi.gio, l.cu.ngay, l.cu.gio, l.requestId, l.lucIso, l.nguoiId, banChup),
});
export function lenhDaGoiBao(db: D1Database, l: LenhMoc): CauCoNhan[] {
  return [congMoc(db, l, "DA_GOI", null), nhatKy(db, l, "trip_appt_called", l.tripId, l.detail)];
}
/** `banChup` (GA-59): kết quả lần đầu — JSON `{ moi, maChuyen }` hoặc `"null"` (không còn mục) — lưu trên dòng mốc để lệnh lặp trả y hệt. */
export function lenhBoDanhDauGoiBao(db: D1Database, l: LenhMoc & { banChup: string }): CauCoNhan[] {
  return [congMoc(db, l, "BO_DANH_DAU", l.banChup), nhatKy(db, l, "trip_appt_call_undone", l.tripId, l.detail)];
}
