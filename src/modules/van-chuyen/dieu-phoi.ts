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
  TRIP_GATE_DANG_CHAY, TRIP_GATE_DOI, TRIP_GATE_TIEN_DO, TRIP_INSERT, TRIP_KET_THUC, TRIP_UPDATE_PLAN, TRIP_XUAT_BEN,
} from "./chuyen-repo";
import {
  LENH_DONG_SUAT, type GanTen, type LoaiSuKienChuyen, type LyDoDongSuat, type MA_LY_DO_HE_THONG, type MaLuatPhaLe, type MucChup, type NguonGioXayRa, type TrangThaiSuat,
} from "../../shared/dieu-phoi-kieu";

/**
 * Nhãn câu (bài thứ tự lô — thu-tu-lo.test.ts). `CHUYEN_TIEN_DO` = câu chuyển trạng thái suất / điểm của lệnh tiến độ khuôn (a): đứng ĐẦU lô, TỰ gác "chuyến
 * đang chạy" + trạng thái nguồn (không có dấu lệnh — chưa có câu cổng), câu cổng đứng ngay sau với `changes() > 0`. `CONG_MOC` = câu cổng của họ lệnh trên
 * mốc giờ hẹn (ADR-0051 — `lenhDaGoiBao`, `lenhBoDanhDauGoiBao`; không chạm vc_trip).
 */
export type NhanCau = "CONG" | "CONG_DOI" | "CHUYEN_TIEN_DO" | "CONG_MOC" | "NHAT_KY" | "SU_KIEN" | "GHI" | "TRANG_THAI_CUOI";
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
const congMoc = (db: D1Database, l: LenhMoc, loai: "DA_GOI" | "BO_DANH_DAU"): CauCoNhan => ({
  nhan: "CONG_MOC",
  stmt: db.prepare(MOC_GOI_INSERT).bind(l.cmd, l.legId, l.phienBan, loai, l.moi.ngay, l.moi.gio, l.cu.ngay, l.cu.gio, l.requestId, l.lucIso, l.nguoiId),
});
export function lenhDaGoiBao(db: D1Database, l: LenhMoc): CauCoNhan[] {
  return [congMoc(db, l, "DA_GOI"), nhatKy(db, l, "trip_appt_called", l.tripId, l.detail)];
}
export function lenhBoDanhDauGoiBao(db: D1Database, l: LenhMoc): CauCoNhan[] {
  return [congMoc(db, l, "BO_DANH_DAU"), nhatKy(db, l, "trip_appt_call_undone", l.tripId, l.detail)];
}
