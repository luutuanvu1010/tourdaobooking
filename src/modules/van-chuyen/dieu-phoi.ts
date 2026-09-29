// DỰNG LÔ các lệnh chuyến xe (ADR-0049 D1 "Thứ tự lô"; kế hoạch mục 1.5, Task A13 / A15). Mỗi lệnh trả DANH SÁCH CÂU CÓ NHÃN — bài thứ tự lô
// (thu-tu-lo.test.ts, Task A14) kiểm trên chính danh sách đó: (1) câu cổng đứng đầu (lệnh tiến độ: thứ hai, sau câu chuyển trạng thái suất / điểm);
// (2) NHẬT KÝ ngay sau câu cổng, `changes() > 0`; (3) mọi câu sau mang lính gác dấu lệnh `EXISTS (… last_cmd_id = …)`; (4) câu TRẠNG THÁI CUỐI đứng cuối.
// Tệp này KHÔNG đọc gì (route đọc rồi truyền xuống) và KHÔNG BAO GIỜ gọi hàm hẹp của orders (bài src/orders-cong-bo.test.ts). Nhật ký `trip_*`: orderId
// NULL, targetType "trip" (I17); `detail` chỉ gồm mã chuyến, mã đơn, biển số, con số, nhãn lý do, chiều, tên nơi danh mục (danh sách trắng mục 1.1) —
// không tên khách, năm sinh, SĐT, số giấy tờ, chữ nơi tự do, khoá so sánh nơi.
import { auditStatement, type AuditAction } from "../audit";
import {
  ALLOC_CLOSE, ALLOC_INSERT, ALLOCS_CLOSE_ALL, DRIVER_CLOSE, DRIVER_INSERT, EVENT_INSERT, STOP_INSERT, STOP_SKIP, STOP_UPDATE_PLAN, STOPS_SKIP_ALL, TRIP_CANCEL,
  TRIP_GATE, TRIP_GATE_DOI, TRIP_INSERT, TRIP_UPDATE_PLAN,
} from "./chuyen-repo";
import { LENH_DONG_SUAT, type LoaiSuKienChuyen, type LyDoDongSuat, type MA_LY_DO_HE_THONG, type MaLuatPhaLe } from "../../shared/dieu-phoi-kieu";

export type NhanCau = "CONG" | "CONG_DOI" | "NHAT_KY" | "SU_KIEN" | "GHI" | "TRANG_THAI_CUOI";
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
const chenDiem = (db: D1Database, l: LenhChung, d: DiemMoi): CauCoNhan =>
  ghi(db.prepare(STOP_INSERT).bind(d.id, d.tripId, d.seq, d.loai, d.locationId, d.placeText, d.placeKey, l.cmd, l.lucIso, l.nguoiId));
const chenSuat = (db: D1Database, l: LenhChung, s: SuatMoi): CauCoNhan =>
  ghi(db.prepare(ALLOC_INSERT).bind(s.id, s.tripId, s.loai, s.legId, s.personKey, s.crewPartyId, s.boardStopId, s.alightStopId, l.cmd, l.lucIso, l.nguoiId));
const dongSuat = (db: D1Database, l: LenhChung, tripId: string, suatId: string, lyDo: LyDoDongSuat, gac = tripId): CauCoNhan =>
  ghi(db.prepare(ALLOC_CLOSE).bind(suatId, tripId, l.cmd, lyDo, l.lucIso, l.nguoiId, gac));
const boQuaDiem = (db: D1Database, l: LenhChung, tripId: string, stopId: string, lyDo: string, gac = tripId): CauCoNhan =>
  ghi(db.prepare(STOP_SKIP).bind(stopId, tripId, l.cmd, lyDo, l.lucIso, l.nguoiId, gac));

/** Mã lý do HỆ THỐNG khi một điểm chưa tới không còn suất mở (I20) — thuộc `MA_LY_DO_HE_THONG` (không ngưng được — R-P22). */
export const LY_DO_BO_QUA_KHONG_CON_KHACH: (typeof MA_LY_DO_HE_THONG)[number] = "BO_QUA_KHONG_CON_KHACH";

// ---- Tạo chuyến (route 2) --------------------------------------------------------------------------------------------------------------------------------
export interface LenhTaoChuyen extends LenhChung {
  chuyen: { id: string; ma: string; xeId: string; chuXePartyId: string; ngayChay: string; batDauMs: number; ketThucMs: number; nghiChup: number; nghiPhaLeLyDo: string | null };
  taiXePartyId: string;
  policyId: string | null;
  phaLeNghi: PhaLe | null;
  detail: string;
}
export function loTaoChuyen(db: D1Database, l: LenhTaoChuyen): CauCoNhan[] {
  const c = l.chuyen;
  return [
    { nhan: "CONG", stmt: db.prepare(TRIP_INSERT).bind(c.id, c.ma, c.xeId, c.chuXePartyId, c.ngayChay, c.batDauMs, c.ketThucMs, c.nghiChup, c.nghiPhaLeLyDo, l.cmd, l.lucIso, l.nguoiId) },
    nhatKy(db, l, "trip_created", c.id, l.detail),
    suKien(db, l, { tripId: c.id, loai: "CREATED", phaLe: l.phaLeNghi, policyId: l.policyId }),
    ghi(db.prepare(DRIVER_INSERT).bind(crypto.randomUUID(), c.id, l.taiXePartyId, l.cmd, l.lucIso, l.nguoiId)),
  ];
}

// ---- Sửa chuyến (route 4) --------------------------------------------------------------------------------------------------------------------------------
export interface LenhSuaChuyen extends LenhChung {
  tripId: string;
  version: number;
  moi: { xeId: string; chuXePartyId: string; ngayChay: string; batDauMs: number; ketThucMs: number; batDauSomNhatMs: number; nghiPhaLeLyDo: string | null };
  /** Tài xế MỚI khi đổi (đóng dòng cũ REASSIGNED + mở dòng mới); null = giữ. */
  doiTaiXe: string | null;
  diem: { id: string; seq: number; ngayXeToi: string | null; gioXeToi: string | null }[];
  phaLe: PhaLe | null;
  policyId: string | null;
  detail: string;
}
export function loSuaChuyen(db: D1Database, l: LenhSuaChuyen): CauCoNhan[] {
  const m = l.moi;
  const lo: CauCoNhan[] = [
    cong(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_edited", l.tripId, l.detail),
    suKien(db, l, { tripId: l.tripId, loai: "UPDATED", phaLe: l.phaLe, policyId: l.policyId }),
    ghi(db.prepare(TRIP_UPDATE_PLAN).bind(l.tripId, l.cmd, m.xeId, m.chuXePartyId, m.ngayChay, m.batDauMs, m.ketThucMs, m.batDauSomNhatMs, m.nghiPhaLeLyDo, l.lucIso, l.nguoiId)),
  ];
  if (l.doiTaiXe !== null) {
    lo.push(ghi(db.prepare(DRIVER_CLOSE).bind(l.tripId, l.cmd, "REASSIGNED", l.lucIso, l.nguoiId)));
    lo.push(ghi(db.prepare(DRIVER_INSERT).bind(crypto.randomUUID(), l.tripId, l.doiTaiXe, l.cmd, l.lucIso, l.nguoiId)));
  }
  for (const d of l.diem) lo.push(ghi(db.prepare(STOP_UPDATE_PLAN).bind(d.id, l.tripId, l.cmd, d.seq, d.ngayXeToi, d.gioXeToi, l.lucIso, l.nguoiId)));
  return lo;
}

// ---- Xếp (route 5) ---------------------------------------------------------------------------------------------------------------------------------------
export interface LenhXep extends LenhChung {
  tripId: string;
  version: number;
  diemMoi: DiemMoi[];
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
  detail: string;
}
/** Thứ tự ADR-0049 D1 / [TK] §2.1a: cổng → nhật ký → sự kiện → đóng suất → đóng tài xế → bỏ điểm → trạng thái cuối (CUỐI lô). */
export function loHuy(db: D1Database, l: LenhHuy): CauCoNhan[] {
  return [
    cong(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_cancelled", l.tripId, l.detail),
    suKien(db, l, { tripId: l.tripId, loai: "CANCELLED", soNguoi: l.soSuatMo, phaLe: l.phaLe, policyId: l.policyId }),
    ghi(db.prepare(ALLOCS_CLOSE_ALL).bind(l.tripId, l.cmd, LENH_DONG_SUAT.HUY_CO_KHACH, l.lucIso, l.nguoiId)),
    ghi(db.prepare(DRIVER_CLOSE).bind(l.tripId, l.cmd, "TRIP_CANCELLED", l.lucIso, l.nguoiId)),
    ghi(db.prepare(STOPS_SKIP_ALL).bind(l.tripId, l.cmd, l.lyDo, l.lucIso, l.nguoiId)),
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
  diemBoQua: string[];
  detail: string;
}
export function loCapNhatDiem(db: D1Database, l: LenhCapNhatDiem): CauCoNhan[] {
  const lo: CauCoNhan[] = [
    cong(db, l, l.tripId, l.version),
    nhatKy(db, l, "trip_stops_synced", l.tripId, l.detail),
    suKien(db, l, { tripId: l.tripId, loai: "ALLOCATION_STOP_CHANGED", soNguoi: l.cap.length }),
    ...l.diemMoi.map((d) => chenDiem(db, l, d)),
  ];
  for (const c of l.cap) {
    lo.push(dongSuat(db, l, l.tripId, c.dongId, LENH_DONG_SUAT.DOI_DIEM_THEO_CHANG));
    lo.push(chenSuat(db, l, c.mo));
  }
  lo.push(...l.diemBoQua.map((id) => boQuaDiem(db, l, l.tripId, id, LY_DO_BO_QUA_KHONG_CON_KHACH)));
  return lo;
}
