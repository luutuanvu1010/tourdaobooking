// ĐỌC + ĐỔI DỮ LIỆU vào luật thuần của điều phối (ADR-0049 D1; kế hoạch mục 1.6, I38, I40; Task A13 / A15). Đọc bảng vc_ của chính module (chuyen-repo.ts),
// chính sách (repository.ts) và hàm công bố `taiXeChoDieuPhoi` của parties. KHÔNG gọi hàm hẹp của orders: dữ liệu chặng (`lichChungChang`) và tên khách
// (`hanhKhachChoChuyen`) do THÂN ROUTE đọc SAU `can()` rồi truyền vào đây (bài src/orders-cong-bo.test.ts). Hàm `…Vao` là đổi dạng THUẦN (không I/O).
import type { KhungBanRow } from "./khung-ban-repo";
import type { KhungTaiXeRow } from "./khung-ban-tai-xe-repo";
import type { ChangLichChung } from "../orders";
import { taiXeChoDieuPhoi, type TaiXeDieuPhoi } from "../parties";
import type {
  ChangVao, ChinhSachVao, ChuyenVao, DieuKienVao, DiemVao, GiayToXeVao, HangBangVao, KhungBanVao, KhungChuyen, SuatVao, TaiXeVao, XeVao,
} from "../../shared/dieu-phoi-kieu";
import { addDays, vnLocalToMs } from "../../shared/vn-date";
import {
  allocsByTrips, allocsOpenByLegs, dieuKienHienHanh, eventsByTrips, giayToXeHienHanh, hangBangHienHanh, legFlags, lyDoDangDung, stopsByTrips, tripById,
  tripsEndedBetween, tripsTouching, xeDieuPhoi, xeTheoId, type AllocRow, type EventRow, type LegFlagRow, type StopRow, type TripRow, type XeDieuPhoiRow,
} from "./chuyen-repo";
import { chinhSachHienHanh, type DispatchPolicyRow } from "./repository";
import { CUA_SO_XUAT_BEN_TOI_DA_PHUT, NGHI_TOI_DA_PHUT } from "./chinh-sach";

const NGAY_MS = 86_400_000;

// ---- Dữ liệu dùng chung của mọi màn điều phối -------------------------------------------------------------------------------------------------------------
export interface DuLieuChung {
  chinhSach: DispatchPolicyRow | null;
  hangBang: HangBangVao[];
  dieuKien: DieuKienVao[];
  lyDo: { code: string; reason_group: string; label: string }[];
  xe: XeDieuPhoiRow[];
  giayToXe: Map<string, GiayToXeVao[]>;
  taiXe: TaiXeDieuPhoi[];
}
export async function docChung(db: D1Database, nowIso: string, homNay: string): Promise<DuLieuChung> {
  const [chinhSach, hangBang, dieuKien, lyDo, xe, taiXe] = await Promise.all([
    chinhSachHienHanh(db), hangBangHienHanh(db, nowIso), dieuKienHienHanh(db, nowIso), lyDoDangDung(db), xeDieuPhoi(db), taiXeChoDieuPhoi(db, { today: homNay }),
  ]);
  return {
    chinhSach,
    hangBang: hangBang.map((h) => ({ classCode: h.license_class_code, maxPassengers: h.max_passengers })),
    dieuKien: dieuKien.flatMap((d) => {
      const code = d.subject === "VEHICLE" ? d.vehicle_document_type_code : d.person_document_type_code;
      return code ? [{ id: d.id, minCapacity: d.min_capacity, subject: d.subject, documentTypeCode: code }] : [];
    }),
    lyDo,
    xe,
    giayToXe: await docGiayToXe(db, xe.map((x) => x.id)),
    taiXe,
  };
}
async function docGiayToXe(db: D1Database, ids: readonly string[]): Promise<Map<string, GiayToXeVao[]>> {
  const out = new Map<string, GiayToXeVao[]>();
  for (const g of await giayToXeHienHanh(db, ids)) out.set(g.vehicle_id, [...(out.get(g.vehicle_id) ?? []), { rowId: g.id, typeCode: g.document_type_code, expiryDate: g.expiry_date }]);
  return out;
}
/** Xe của các chuyến không có trong danh sách chọn (xe đã ngừng sau khi chuyến kết thúc) — đọc thêm để dựng DTO. */
export async function boSungXe(db: D1Database, chung: DuLieuChung, ids: readonly string[]): Promise<void> {
  const thieu = [...new Set(ids)].filter((id) => !chung.xe.some((x) => x.id === id));
  if (thieu.length === 0) return;
  chung.xe.push(...(await xeTheoId(db, thieu)));
  for (const [k, v] of await docGiayToXe(db, thieu)) chung.giayToXe.set(k, v);
}

// ---- Đổi dạng thuần ---------------------------------------------------------------------------------------------------------------------------------------
export const chinhSachVao = (r: DispatchPolicyRow | null): ChinhSachVao | null =>
  r ? { id: r.id, minLeadMinutes: r.min_lead_minutes, warnLeadMinutes: r.warn_lead_minutes, restMinutes: r.rest_minutes, requireManifest: r.require_manifest === 1, requireContract: r.require_contract === 1,
    dutyDayMaxMinutes: r.duty_day_max_minutes, tripNoBreakMaxMinutes: r.trip_no_break_max_minutes, departureWindowMinutes: r.departure_window_minutes } : null;
export const xeVao = (r: XeDieuPhoiRow, giayTo: Map<string, GiayToXeVao[]>): XeVao => ({
  id: r.id, bienSo: r.plate_number, soCho: r.passenger_capacity, trangThai: r.status, chuXePartyId: r.owner_party_id, chuLaCongTy: r.owner_is_company === 1, giayTo: giayTo.get(r.id) ?? [],
});
/**
 * Tài xế theo hồ sơ — từ `taiXeChoDieuPhoi`. Hồ sơ KHÔNG có trong danh sách (không mở vai Tài xế công ty, không thuộc nhà xe nào — R-P8) → tài xế "không
 * thuộc ai": `khongCheo` sai với MỌI xe (LC-13 phần chỉ máy chủ — TC-31), không giấy tờ (GPLX_THIEU). Không đoán.
 */
export function taiXeVao(partyId: string, ds: readonly TaiXeDieuPhoi[]): TaiXeVao {
  const t = ds.find((x) => x.partyId === partyId);
  return t
    ? { partyId: t.partyId, displayName: t.displayName, loai: t.loai, carrierPartyIds: [...t.carrierPartyIds], giayTo: t.giayTo.map((g) => ({ ...g })) }
    : { partyId, displayName: "", loai: "NHA_XE", carrierPartyIds: [], giayTo: [] };
}
/** Khung bận của xe (dòng `khung_ban_*` — đã lọc VEHICLE) → dạng luật thuần (ADR-0055 VK2-A A2 (i)). */
export const khungBanVao = (r: KhungBanRow): KhungBanVao => ({
  id: r.id, doiTuong: "VEHICLE", xeId: r.vehicle_id, taiXePartyId: null, batDauMs: r.start_ms, ketThucMs: r.end_ms, lyDoNhan: r.reason_label,
});
/** Khung bận của TÀI XẾ (dòng `khung_tai_xe_*` — đã lọc DRIVER, không lý do) → dạng luật thuần (ADR-0053 D9 B9.3; kế hoạch A4 T4, G-A4-9). */
export const khungTaiXeVao = (r: KhungTaiXeRow): KhungBanVao => ({
  id: r.id, doiTuong: "DRIVER", xeId: null, taiXePartyId: r.driver_party_id, batDauMs: r.start_ms, ketThucMs: r.end_ms, lyDoNhan: null,
});
export const khungChuyen = (t: TripRow): KhungChuyen => ({
  id: t.id, ma: t.code, xeId: t.vehicle_id, taiXePartyId: t.driver_party_id, batDauMs: t.planned_start_ms, ketThucMs: t.planned_end_ms, ketThucThatMs: t.ended_ms, trangThai: t.status,
  xuatBenMs: t.departed_ms,
});
export const chuyenVao = (t: TripRow, xe: XeVao, taiXe: TaiXeVao | null): ChuyenVao => ({
  id: t.id, ma: t.code, ngayChay: t.service_date, batDauMs: t.planned_start_ms, ketThucMs: t.planned_end_ms, ketThucThatMs: t.ended_ms, trangThai: t.status, xuatBenMs: t.departed_ms, xe, taiXe,
  nghiChup: t.rest_minutes_snapshot, nghiPhaLe: t.rest_override_reason_code !== null, thue: t.rented === 1, coNguonGia: t.co_nguon_gia === 1,
  camKetPhaLeKhoa: t.commitment_override_key, // ADR-0056 VK3-A: chỉ để so với khoá của kiemCamKet
});
export const suatVao = (a: AllocRow): SuatVao => ({
  id: a.id, tripId: a.trip_id, loai: a.kind, legId: a.leg_id, personKey: a.passenger_key, crewPartyId: a.crew_party_id, boardStopId: a.board_stop_id,
  alightStopId: a.alight_stop_id, trangThai: a.status, mo: a.valid_to_at === null, moTuMs: Date.parse(a.valid_from_at),
});
export const diemVao = (s: StopRow): DiemVao => ({
  id: s.id, tripId: s.trip_id, seq: s.seq, loai: s.kind, trangThai: s.status, placeKey: s.place_key,
  gioXeToiMs: s.planned_date !== null && s.planned_time !== null ? vnLocalToMs(s.planned_date, s.planned_time) : null,
});
/** Chặng của `lichChungChang` (đơn ĐÃ XÁC NHẬN, chưa huỷ, chặng mở) → dạng luật thuần. */
export const changVao = (c: ChangLichChung): ChangVao => ({
  legId: c.legId, orderId: c.orderId, orderCode: c.orderCode, chieu: c.direction, ngayDon: c.pickupDate, gioDon: c.pickupTime, coNoiTra: c.noiTra !== null,
  donDaXacNhan: true, donDaHuy: false, changMo: true, soNguoi: c.soNguoi, nguoiCuaDon: [...c.nguoiCuaDon], datGap: c.datGap, khoaNoiDon: c.khoaNoiDon, khoaNoiTra: c.khoaNoiTra,
  xeRieng: c.xeRieng, choToiThieu: c.choToiThieu, // ADR-0056 VK3-A A4
});
/** I38 (R-P9): lý do CỤ THỂ cho chặng có suất mà rơi khỏi `lichChungChang` — theo cờ view công bố; còn mở + đã xác nhận ⇒ ngày đón dời ra ngoài khoảng đọc. */
export function lyDoChangNgoai(f: LegFlagRow): "DON_DA_HUY" | "CHANG_DA_DONG" | "GIO_HEN_NGOAI_CHUYEN" | "CHANG_KHONG_HOP_LE" {
  if (f.is_cancelled === 1) return "DON_DA_HUY";
  if (f.is_open !== 1) return "CHANG_DA_DONG";
  if (f.is_confirmed !== 1) return "CHANG_KHONG_HOP_LE";
  return "GIO_HEN_NGOAI_CHUYEN";
}

// ---- Nền của MỘT chuyến + ngữ cảnh luật -------------------------------------------------------------------------------------------------------------------
export interface NenChuyen {
  trip: TripRow;
  stops: StopRow[];
  allocs: AllocRow[];
  events: EventRow[];
  /** Mọi chặng mà suất KHÁCH (mở hoặc đã đóng) của chuyến trỏ tới. */
  legIds: string[];
  /** Khoảng ngày đọc chặng quanh ngày chạy (I38): ngày chạy ± 1. */
  tu: string;
  den: string;
}
export async function docNen(db: D1Database, tripId: string): Promise<NenChuyen | null> {
  const trip = await tripById(db, tripId);
  if (!trip) return null;
  const [stops, allocs, events] = await Promise.all([stopsByTrips(db, [trip.id]), allocsByTrips(db, [trip.id]), eventsByTrips(db, [trip.id])]);
  return {
    trip, stops, allocs, events,
    legIds: [...new Set(allocs.flatMap((a) => (a.kind === "PASSENGER" && a.leg_id !== null ? [a.leg_id] : [])))],
    tu: addDays(trip.service_date, -1),
    den: addDays(trip.service_date, 1),
  };
}

export interface NguCanhChuyen {
  chuyen: ChuyenVao;
  suat: SuatVao[];
  diem: DiemVao[];
  /** Chặng (của `lichChungChang`) theo id — kể cả chặng của lệnh đang xét. */
  chang: Map<string, ChangVao>;
  changLich: Map<string, ChangLichChung>;
  changNgoai: { legId: string; orderId: string; orderCode: string; lyDo: "DON_DA_HUY" | "CHANG_DA_DONG" | "GIO_HEN_NGOAI_CHUYEN" | "CHANG_KHONG_HOP_LE" }[];
  suatMoCuaChang: SuatVao[];
  chuyenKhac: KhungChuyen[];
  chuyenKhacRow: TripRow[];
}
/**
 * Khung lùi (ms) của chuyến đã kết thúc thật cần đọc cho lệnh xuất bến: giờ xuất bến ≥ khởi hành dự kiến − cửa sổ (LC-20, trần 48 giờ — xuất bến sớm hơn bị
 * `kiemXuatBen` chặn riêng), luật nghỉ nhìn lùi thêm tối đa trần khoảng nghỉ. Dùng TRẦN chứ không dùng số của chính sách hiện hành: dòng chính sách tại giờ
 * khai lùi và bản chụp nghỉ của chuyến có thể khác dòng hiện hành.
 */
const LUI_KET_THUC_THAT_MS = (CUA_SO_XUAT_BEN_TOI_DA_PHUT + NGHI_TOI_DA_PHUT) * 60_000;
/**
 * Ngữ cảnh luật của một chuyến: chặng của suất trên chuyến + chặng `themLegIds` (lệnh xếp / dời) — lấy từ `lich` (route đã đọc qua `lichChungChang`), chặng
 * rơi ra đọc cờ qua view (I38); suất mở của các chặng đó trên MỌI chuyến; chuyến khác chạm khung KẾ HOẠCH ±1 ngày (trùng giờ, nghỉ, đang chạy).
 * `xuatBenDenMs` (lệnh xuất bến và lý do giữ dự phóng — giờ của request): chuyến CHƯA CHẠY đọc thêm mọi chuyến đã KẾT THÚC THẬT trong
 * [khởi hành dự kiến − `LUI_KET_THUC_THAT_MS`, `xuatBenDenMs`] — phủ `[giờ xuất bến − nghỉ, giờ xuất bến]` (CH-02) và mốc chống xuất bến trước khi chuyến
 * trước kết thúc (ADR-0050) với mọi cửa sổ tới 48 giờ; khung kế hoạch ±1 ngày không đủ khi cửa sổ > 24 giờ.
 */
export async function docNguCanh(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], chung: DuLieuChung, themLegIds: readonly string[] = [], xuatBenDenMs: number | null = null,
): Promise<NguCanhChuyen> {
  const legIds = [...new Set([...nen.legIds, ...themLegIds])];
  const changLich = new Map(lich.filter((c) => legIds.includes(c.legId)).map((c) => [c.legId, c]));
  const thieu = legIds.filter((id) => !changLich.has(id));
  const docKetThuc = xuatBenDenMs !== null && nen.trip.status === "PLANNED";
  const [flags, moCuaChang, khac, daKetThuc] = await Promise.all([
    legFlags(db, thieu),
    allocsOpenByLegs(db, legIds),
    tripsTouching(db, nen.trip.planned_start_ms - NGAY_MS, nen.trip.planned_end_ms + NGAY_MS),
    docKetThuc ? tripsEndedBetween(db, nen.trip.planned_start_ms - LUI_KET_THUC_THAT_MS, xuatBenDenMs) : Promise.resolve([]),
  ]);
  await boSungXe(db, chung, [nen.trip.vehicle_id]);
  const xeRow = chung.xe.find((x) => x.id === nen.trip.vehicle_id)!;
  const daCo = new Set(khac.map((t) => t.id));
  const gop = daKetThuc.some((t) => !daCo.has(t.id))
    ? [...khac, ...daKetThuc.filter((t) => !daCo.has(t.id))].sort((a, b) => a.planned_start_ms - b.planned_start_ms || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0))
    : khac;
  const chuyenKhacRow = gop.filter((t) => t.id !== nen.trip.id);
  return {
    chuyen: chuyenVao(nen.trip, xeVao(xeRow, chung.giayToXe), nen.trip.driver_party_id ? taiXeVao(nen.trip.driver_party_id, chung.taiXe) : null),
    suat: nen.allocs.map(suatVao),
    diem: nen.stops.map(diemVao),
    chang: new Map([...changLich].map(([k, v]) => [k, changVao(v)])),
    changLich,
    changNgoai: flags.map((f) => ({ legId: f.id, orderId: f.order_id, orderCode: f.order_code ?? "", lyDo: lyDoChangNgoai(f) })),
    suatMoCuaChang: moCuaChang.map(suatVao),
    chuyenKhac: chuyenKhacRow.map(khungChuyen),
    chuyenKhacRow,
  };
}
