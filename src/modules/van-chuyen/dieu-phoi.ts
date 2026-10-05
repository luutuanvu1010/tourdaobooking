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
  TRIP_GATE_CHI_PHI, TRIP_GATE_DANG_CHAY, TRIP_GATE_DOI, TRIP_GATE_TIEN_DO, TRIP_INSERT, TRIP_KET_THUC, TRIP_UPDATE_PLAN, TRIP_XUAT_BEN,
  ALLOC_OFFICE_CANCEL, MANIFEST_THEM_SAU, TRIP_CHOT, TRIP_GATE_DANG_CHAY_VERSION,
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
export type NhanCau = "CONG" | "CONG_DOI" | "CHUYEN_TIEN_DO" | "CONG_MOC" | "NHAT_KY" | "SU_KIEN" | "GHI" | "GHI_NGOAI" | "TRANG_THAI_CUOI";
export interface CauCoNhan {
  nhan: NhanCau;
  stmt: D1PreparedStatement;
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
});
const cong = (db: D1Database, l: LenhChung, tripId: string, version: number): CauCoNhan => ({
  nhan: "CONG",
  stmt: db.prepare(TRIP_GATE).bind(tripId, version, l.cmd, l.lucIso, l.nguoiId),
});
const ghi = (stmt: D1PreparedStatement): CauCoNhan => ({ nhan: "GHI", stmt });
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
  moi: { xeId: string; chuXePartyId: string; ngayChay: string; batDauMs: number; ketThucMs: number; batDauSomNhatMs: number; nghiPhaLeLyDo: string | null; thue: 0 | 1; tuyen: string | null };
  /** Tài xế MỚI khi đổi (đóng dòng cũ REASSIGNED + mở dòng mới); null = giữ. */
  doiTaiXe: string | null;
  diem: { id: string; seq: number; ngayXeToi: string | null; gioXeToi: string | null }[];
  phaLe: PhaLe | null;
  policyId: string | null;
  /** ADR-0057 C4: đảo + chụp lại khi đổi xe / nhà xe / tuyến / ngày chạy; `phienBanChiPhi` = số dòng chi phí đã đọc (câu cổng — TC-8). */
  chiPhi: KeHoachChiPhi;
  phienBanChiPhi: number;
  detail: string;
}
/** Thứ tự: cổng (+ phiên bản chi phí) → nhật ký → sự kiện → ĐẢO (âm → dương) → đóng tài xế cũ → ghi chuyến → mở tài xế mới → điểm → CHỤP. */
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
  lo.push(ghi(db.prepare(TRIP_UPDATE_PLAN).bind(l.tripId, l.cmd, m.xeId, m.chuXePartyId, m.ngayChay, m.batDauMs, m.ketThucMs, m.batDauSomNhatMs, m.nghiPhaLeLyDo, l.lucIso, l.nguoiId, m.thue, m.tuyen)));
  if (l.doiTaiXe !== null) lo.push(ghi(db.prepare(DRIVER_INSERT).bind(crypto.randomUUID(), l.tripId, l.doiTaiXe, l.cmd, l.lucIso, l.nguoiId)));
  for (const d of l.diem) lo.push(ghi(db.prepare(STOP_UPDATE_PLAN).bind(d.id, l.tripId, l.cmd, d.seq, d.ngayXeToi, d.gioXeToi, l.lucIso, l.nguoiId)));
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
  detail: string;
}
export function loRut(db: D1Database, l: LenhRut): CauCoNhan[] {
  return [
    cong(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_allocation_removed", l.tripId, l.detail),
    suKien(db, l, { tripId: l.tripId, loai: "ALLOCATION_REMOVED", soNguoi: l.suatIds.length, phaLe: l.phaLe, policyId: l.policyId }),
    ...l.suatIds.map((id) => dongSuat(db, l, l.tripId, id, LENH_DONG_SUAT.RUT)),
    ...l.diemBoQua.map((id) => boQuaDiem(db, l, l.tripId, id, LY_DO_BO_QUA_KHONG_CON_KHACH)),
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

// ---- Cập nhật khách theo đơn (route 41 — R-P29, chủ lần 16; khuôn route 40) --------------------------------------------------------------------------------
export interface LenhCapNhatKhach extends LenhChung {
  tripId: string;
  version: number;
  /** Từng suất khách đã đổi: đóng PASSENGER_CHANGED NGAY TRƯỚC khi mở lại (cùng chặng, cùng điểm, khoá rảnh hoặc null) — hoặc chỉ đóng (đơn giảm người). */
  cap: { dongId: string; mo: SuatMoi | null }[];
  diemBoQua: string[];
  detail: string;
}
export function loCapNhatKhach(db: D1Database, l: LenhCapNhatKhach): CauCoNhan[] {
  const lo: CauCoNhan[] = [
    cong(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_passengers_synced", l.tripId, l.detail),
    suKien(db, l, { tripId: l.tripId, loai: "ALLOCATION_PASSENGER_CHANGED", soNguoi: l.cap.length }),
  ];
  for (const c of l.cap) {
    lo.push(dongSuat(db, l, l.tripId, c.dongId, LENH_DONG_SUAT.DOI_KHACH_THEO_DON));
    if (c.mo) lo.push(chenSuat(db, l, c.mo));
  }
  lo.push(...l.diemBoQua.map((id) => boQuaDiem(db, l, l.tripId, id, LY_DO_BO_QUA_KHONG_CON_KHACH)));
  return lo;
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
  detail: string;
}
/** Thứ tự (mục 1.5): cổng → nhật ký → sự kiện DEPARTED → gắn tên còn thiếu → bản chụp + dòng con → bản chốt → sang RUNNING (sau bản chụp — LC-05). */
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
