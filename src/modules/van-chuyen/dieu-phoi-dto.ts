// DTO VĂN PHÒNG của điều phối xe (ADR-0049 kế hoạch mục 1.8; ADR-0050 bảng "Nơi dùng giờ nào"; ruling R-P11, R-P12, R-P13, R-P16, R-P20). Dựng MỚI TỪNG KHOÁ
// (khuôn `pool.ts` — không trải đối tượng nguồn). KHÔNG BAO GIỜ đưa ra: khoá so sánh nơi (`place_key`, `khoaNoiDon/Tra` — ADR-0050 VK1-B), tiền, ghi chú đơn,
// người lập, người phụ trách, SĐT, số giấy tờ, nơi cấp. Họ tên + năm sinh khách CHỈ ở chi tiết chuyến (R-P1: `trip.view = any` ⇒ `contact.view = any`).
import type { ChangLichChung } from "../orders";
import type {
  BanChupDto, CanhBaoLichDto, ChangLichDto, ChuyenTomTatDto, DiemChuyenDto, GioVnDto, KhoaMocDto, LyDoDangDungDto, LyDoGiuDto, MocTienDoDto, NhatKyChuyenDto,
  SuatChuyenDto, TaiXeChonDto, XeChonDto, XeCuaDonResponse,
} from "../../shared/contracts";
import { NHAN_SU_KIEN_CHUYEN, NHAN_TRANG_THAI_CHUYEN, isNhomLyDo, type ChangVao, type LoaiSuKienChuyen } from "../../shared/dieu-phoi-kieu";
import { noiLechCuaSuat } from "../../shared/dieu-phoi-kiem";
import { NHAN_CANH_BAO_LICH, type CanhBaoLich } from "../../shared/dieu-phoi-lich-chung";
import { NHAN_TRANG_THAI_CHANG, type TrangThaiChangRa } from "../../shared/dieu-phoi-trang-thai";
import { NHAN_AI_XU_LY, lyDoTheoMoc, type LyDoGiu } from "../../shared/ly-do-giu";
import { chuyenDuoiMoc, gioXetMocXep } from "../../shared/moc-toi-thieu";
import { maskLongDigits } from "../../shared/text-guards";
import { chuoiDichChiDuong } from "../../shared/chi-duong";
import { msToVnLocal, vnLocalToMs } from "../../shared/vn-date";
import type { AllocRow, BanChupRow, EventRow, StopRow, TripRow, XeCuaDonRow, XeDieuPhoiRow } from "./chuyen-repo";
import { diemVao, suatVao, type DuLieuChung } from "./dieu-phoi-doc";

const PHUT = 60_000;
// Nhãn trạng thái chuyến nay ở src/shared/dieu-phoi-kieu.ts (một nguồn cho máy chủ + màn chi tiết đơn — ADR-0059); xuất lại để nơi gọi cũ không đổi.
export { NHAN_TRANG_THAI_CHUYEN };
export const gioVn = (ms: number): GioVnDto => {
  const { date, time } = msToVnLocal(ms);
  return { ngay: date, gio: time };
};
/**
 * ADR-0104 Đ1 mục 9 ★: lý do giữ của MỘT chuyến theo lớp — "dưới mốc" lúc đọc (giờ xét mốc xếp, cùng phép `khoaMoc`; xe đang chạy luôn dưới mốc; không có
 * chính sách → ngoài mốc) chọn ai xử lý khoảng nghỉ / nghỉ thiếu / cam kết (`lyDoTheoMoc`). Một chỗ cho lịch, chi tiết, cuốc tài xế, 409 xuất bến.
 */
export function lyDoGiuCuaChuyen(t: TripRow, lyDo: readonly LyDoGiu[], bayGioMs: number, phut: number | null): LyDoGiu[] {
  const duoiMoc = chuyenDuoiMoc({ dangChay: t.status === "RUNNING", gioXetMs: gioXetMocXep({ batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms }) }, bayGioMs, phut);
  return lyDo.map((l) => lyDoTheoMoc(l, duoiMoc));
}
export const lyDoGiuDto = (l: LyDoGiu): LyDoGiuDto => ({ ma: l.ma, loiNhan: l.loiNhan, aiXuLy: l.aiXuLy, aiXuLyNhan: NHAN_AI_XU_LY[l.aiXuLy] });
export const canhBaoDto = (c: CanhBaoLich): CanhBaoLichDto => ({ loai: c.loai, nhan: NHAN_CANH_BAO_LICH[c.loai], legId: c.legId, tripId: c.tripId, maDon: c.orderCode });
/** Tên nơi của điểm: tên danh mục, hoặc chữ tự do ĐÃ CHE dãy số (lưu đã che — che lần nữa cho chắc). */
export const tenNoi = (s: StopRow): string => s.location_name ?? maskLongDigits(s.place_text ?? "");
/** ADR-0105 mục 3: chuỗi đích chỉ đường — điểm danh mục: địa chỉ (đã trim) nếu có, không thì tên; chữ tự do: ĐÚNG `tenNoi` (đã che). Không bao giờ place_key. */
export const chuoiDichCuaDiem = (s: StopRow): string => chuoiDichChiDuong({ laDanhMuc: s.location_id !== null, diaChi: s.location_address, tenNoi: tenNoi(s) });

/**
 * Một mốc tiến độ (ADR-0050 VK1-A): giờ xảy ra + giờ ghi nhận; `nguoiBam` CHỈ khi văn phòng khai giờ (R-P11) — chuỗi tên hiển thị từ hàm tiêm `nhanNhanVien`
 * (R-P20); thiếu nhãn (không tiêm / tài khoản không còn) → bỏ khoá, không đoán.
 */
export function mocTienDo(e: EventRow | undefined, nhan: ReadonlyMap<string, string> | null): MocTienDoDto | null {
  if (!e) return null;
  const vanPhongKhai = e.occurred_source === "VAN_PHONG_KHAI";
  const ten = vanPhongKhai && e.created_by !== null ? nhan?.get(e.created_by) : undefined;
  return { gioXayRa: gioVn(e.occurred_ms), gioGhiNhan: gioVn(Date.parse(e.created_at)), vanPhongKhai, ...(ten !== undefined ? { nguoiBam: ten } : {}) };
}
const suKienCuoi = (events: readonly EventRow[], tripId: string, loai: readonly string[], loc: (e: EventRow) => boolean = () => true): EventRow | undefined =>
  [...events].reverse().find((e) => e.trip_id === tripId && loai.includes(e.kind) && loc(e));

/** R-P13: khoá mốc lúc xếp theo khoá DÍNH (R-P6/R-P7) — cùng hàm `gioXetMocXep` với luật xếp; màn không tự tính theo giờ hiện tại. */
export function khoaMoc(t: TripRow, bayGioMs: number, phut: number | null): KhoaMocDto {
  const gio = gioXetMocXep({ batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms });
  const tuLucMs = phut === null ? gio : gio - phut * PHUT;
  return { dangKhoa: t.status === "PLANNED" && phut !== null && bayGioMs >= tuLucMs, tuLuc: gioVn(tuLucMs), tuLucMs };
}

export const xeChon = (chung: DuLieuChung): XeChonDto[] =>
  chung.xe.filter((x) => x.status !== "retired").map((x) => ({
    id: x.id, bienSo: x.plate_number, soCho: x.passenger_capacity, trangThai: x.status as "active" | "maintenance", chuXe: x.owner_name, chuLaCongTy: x.owner_is_company === 1,
  }));
export function taiXeChon(chung: DuLieuChung): TaiXeChonDto[] {
  const tenChu = new Map(chung.xe.map((x) => [x.owner_party_id, x.owner_name]));
  return chung.taiXe.map((t) => ({ partyId: t.partyId, ten: t.displayName, loai: t.loai, nhaXe: t.carrierPartyIds.map((id) => tenChu.get(id) ?? "Nhà xe") }));
}
export const lyDoDangDung = (chung: DuLieuChung): LyDoDangDungDto[] =>
  chung.lyDo.flatMap((r) => (isNhomLyDo(r.reason_group) ? [{ code: r.code, nhom: r.reason_group, nhan: r.label }] : []));

/** Tóm tắt một chuyến (lịch chung + đầu chi tiết). */
export function chuyenTomTat(
  t: TripRow, v: { xe: XeDieuPhoiRow | undefined; chung: DuLieuChung; stops: readonly StopRow[]; allocs: readonly AllocRow[]; events: readonly EventRow[]; lyDoGiu: readonly LyDoGiu[];
    nhan: ReadonlyMap<string, string> | null; bayGioMs: number;
    /** ADR-0104 Đ2.7: chặng (có suất trên các chuyến đang dựng) thuộc đơn ĐÃ HUỶ — cờ `is_cancelled` của view công bố (cùng nguồn lý do giữ DON_DA_HUY). */
    legDonHuy: ReadonlySet<string> },
): ChuyenTomTatDto {
  const tx = t.driver_party_id ? v.chung.taiXe.find((x) => x.partyId === t.driver_party_id) : undefined;
  const tai = v.allocs.filter((a) => a.trip_id === t.id && a.valid_to_at === null && (a.status === "WAITING" || a.status === "BOARDED")).length;
  return {
    id: t.id,
    ma: t.code,
    trangThai: t.status,
    trangThaiNhan: NHAN_TRANG_THAI_CHUYEN[t.status],
    version: t.version,
    ngayChay: t.service_date,
    batDau: gioVn(t.planned_start_ms),
    ketThuc: gioVn(t.planned_end_ms),
    batDauMs: t.planned_start_ms,
    ketThucMs: t.planned_end_ms,
    xe: { id: t.vehicle_id, bienSo: v.xe?.plate_number ?? "", soCho: v.xe?.passenger_capacity ?? 0, chuXe: v.xe?.owner_name ?? "", chuLaCongTy: v.xe?.owner_is_company === 1 },
    taiXe: t.driver_party_id ? { partyId: t.driver_party_id, ten: tx?.displayName ?? "(không còn là tài xế)", loai: tx?.loai ?? "NHA_XE" } : null,
    tai,
    lyDoGiu: lyDoGiuCuaChuyen(t, v.lyDoGiu, v.bayGioMs, v.chung.chinhSach?.min_lead_minutes ?? null).map(lyDoGiuDto),
    khoaMoc: khoaMoc(t, v.bayGioMs, v.chung.chinhSach?.min_lead_minutes ?? null),
    xuatBen: t.departed_at === null ? null : mocTienDo(suKienCuoi(v.events, t.id, ["DEPARTED"]), v.nhan), // ADR-0097 Đ3: thu hồi xuất bến → chưa xuất bến
    ketThucThat: mocTienDo(suKienCuoi(v.events, t.id, ["ENDED", "ENDED_INTERRUPTED"]), v.nhan),
    diem: v.stops.filter((s) => s.trip_id === t.id).map((s) => ({
      id: s.id, thuTu: s.seq, loai: s.kind, tenNoi: tenNoi(s), trangThai: s.status, daToi: mocTienDo(suKienCuoi(v.events, t.id, ["STOP_ARRIVED"], (e) => e.stop_id === s.id), v.nhan),
    })),
    // ADR-0104 Đ1 mục 5: từ sự kiện ĐÃ ĐỌC (`eventsByTrips` — sự kiện của chuyến kể cả dời vào / ra, GA-35); không câu đọc mới.
    khanCap: v.events.some((e) => (e.trip_id === t.id || e.related_trip_id === t.id) && e.override_rule_code === "MOC_TOI_THIEU"),
    // ADR-0104 Đ2.7 (T2.16): xe đang chạy còn khách CHỜ ĐÓN của đơn huỷ mà văn phòng chưa Báo huỷ (khuôn `daBaoHuy` của máy — nhắc tới khi báo huỷ hết).
    coKhachDonHuy: t.status === "RUNNING" && v.allocs.some((a) =>
      a.trip_id === t.id && a.valid_to_at === null && a.kind === "PASSENGER" && a.status === "WAITING" && a.office_cancel_at === null && a.leg_id !== null && v.legDonHuy.has(a.leg_id)),
  };
}

/** Chặng của lịch chung (I12: số người có tên = min(số người, số hành khách hiện hành của đơn)). */
export function changLichDto(c: ChangLichChung, tt: TrangThaiChangRa, allocs: readonly AllocRow[], trips: ReadonlyMap<string, TripRow>): ChangLichDto {
  const chuyen = [...new Set(allocs.filter((a) => a.leg_id === c.legId && a.valid_to_at === null).map((a) => a.trip_id))]
    .flatMap((id) => (trips.has(id) && trips.get(id)!.status !== "CANCELLED" ? [{ id, ma: trips.get(id)!.code }] : []));
  return {
    legId: c.legId, orderId: c.orderId, maDon: c.orderCode, tenDichVu: c.serviceName, chieu: c.direction, ngayDon: c.pickupDate, gioDon: c.pickupTime, noiDon: c.noiDon,
    noiTra: c.noiTra, soNguoi: c.soNguoi, soNguoiCoTen: Math.min(c.soNguoi, c.nguoiCuaDon.length), soHieuChuyenBay: c.soHieuChuyenBay, xeRieng: c.xeRieng, choToiThieu: c.choToiThieu, datGap: c.datGap, trangThai: tt.trangThai,
    trangThaiNhan: NHAN_TRANG_THAI_CHANG[tt.trangThai], nhan: [...tt.nhan], soDaXep: tt.soDaXep, soDaDon: tt.soDaDon, soDaTra: tt.soDaTra, soVang: tt.soVang,
    soKhachHuy: tt.soKhachHuy, chuyen,
  };
}

/** Điểm của chi tiết chuyến: giờ hẹn sớm nhất (điểm đón), số người, R-P16 `lechDon` (cùng hàm so `noiLechCuaSuat` — không trả khoá). */
export function diemChuyenDto(
  s: StopRow, v: { allocs: readonly AllocRow[]; chang: ReadonlyMap<string, ChangVao>; stops: readonly StopRow[]; events: readonly EventRow[]; nhan: ReadonlyMap<string, string> | null },
): DiemChuyenDto {
  const moTaiDiem = v.allocs.filter((a) => a.valid_to_at === null && a.kind === "PASSENGER" && (s.kind === "PICKUP" ? a.board_stop_id === s.id : a.alight_stop_id === s.id));
  let gioHen: number | null = null;
  let lech = false;
  for (const a of moTaiDiem) {
    const ch = a.leg_id ? v.chang.get(a.leg_id) : undefined;
    if (!ch) continue;
    if (s.kind === "PICKUP" && ch.ngayDon !== null && ch.gioDon !== null) {
      const ms = vnLocalToMs(ch.ngayDon, ch.gioDon);
      if (ms !== null && (gioHen === null || ms < gioHen)) gioHen = ms;
    }
    const len = v.stops.find((x) => x.id === a.board_stop_id);
    const xuong = a.alight_stop_id === null ? undefined : v.stops.find((x) => x.id === a.alight_stop_id);
    const n = noiLechCuaSuat(suatVao(a), len ? diemVao(len) : undefined, xuong ? diemVao(xuong) : undefined, ch);
    if (s.kind === "PICKUP" ? n.don : n.tra) lech = true;
  }
  return {
    id: s.id, thuTu: s.seq, loai: s.kind, tenNoi: tenNoi(s), diemDanhMucId: s.location_id, gioHen: gioHen === null ? null : gioVn(gioHen),
    gioXeToi: s.planned_date !== null && s.planned_time !== null ? { ngay: s.planned_date, gio: s.planned_time } : null, trangThai: s.status, soNguoi: moTaiDiem.length,
    lechDon: lech, daToi: mocTienDo(suKienCuoi(v.events, s.trip_id, ["STOP_ARRIVED"], (e) => e.stop_id === s.id), v.nhan), themKhiChay: s.added_while_running === 1,
  };
}

/** Suất ĐANG MỞ của chi tiết chuyến (văn phòng): họ tên + năm sinh qua `hanhKhachChoChuyen` (route đọc sau `can(trip.view)` — R-P1). */
export function suatChuyenDto(
  a: AllocRow,
  v: { changLich: ReadonlyMap<string, ChangLichChung>; changNgoai: readonly { legId: string; orderCode: string }[]; ten: ReadonlyMap<string, { fullName: string; birthYear: number }>;
    events: readonly EventRow[]; nhan: ReadonlyMap<string, string> | null; tenDiKem?: ReadonlyMap<string, string>; lyDoNhan: ReadonlyMap<string, string> },
): SuatChuyenDto {
  const ch = a.leg_id ? v.changLich.get(a.leg_id) : undefined;
  const maDon = ch?.orderCode ?? (a.leg_id ? v.changNgoai.find((x) => x.legId === a.leg_id)?.orderCode ?? null : null);
  const nguoi = a.passenger_key ? v.ten.get(a.passenger_key) : undefined;
  return {
    id: a.id, loai: a.kind, maDon, legId: a.leg_id, chieu: ch?.direction ?? null, diemLen: a.board_stop_id, diemXuong: a.alight_stop_id, trangThai: a.status,
    soHieuChuyenBay: ch?.soHieuChuyenBay ?? null,
    gioHen: ch && ch.pickupDate !== null && ch.pickupTime !== null ? { ngay: ch.pickupDate, gio: ch.pickupTime } : null, // C33: giờ hẹn từng đoàn ở điểm gộp
    coTen: a.passenger_key !== null,
    ...(nguoi ? { hoTen: nguoi.fullName, namSinh: nguoi.birthYear } : {}),
    ...(a.kind === "CREW" && a.crew_party_id !== null && v.tenDiKem?.has(a.crew_party_id) ? { tenNguoiDiKem: v.tenDiKem.get(a.crew_party_id)! } : {}),
    daDon: mocTienDo(suKienCuoi(v.events, a.trip_id, ["PASSENGER_BOARDED"], (e) => e.allocation_id === a.id), v.nhan),
    daTra: mocTienDo(suKienCuoi(v.events, a.trip_id, ["PASSENGER_DROPPED"], (e) => e.allocation_id === a.id), v.nhan),
    // Đợt 5 D5.2: giờ + nhãn lý do; KHÔNG người bấm (cột office_cancel_by không đọc ra).
    vanPhongBaoHuy: a.office_cancel_at !== null && a.office_cancel_reason_code !== null
      ? { luc: gioVn(Date.parse(a.office_cancel_at)), lyDoNhan: v.lyDoNhan.get(a.office_cancel_reason_code) ?? "Khách huỷ" }
      : null,
  };
}

/** Nhật ký chuyến: loại (nhãn), giờ xảy ra / ghi nhận, người bấm (nhãn — R-P20), máy hay người, số người, phá lệ (mã luật + nhãn lý do). */
export function nhatKyChuyenDto(events: readonly EventRow[], nhan: ReadonlyMap<string, string> | null, lyDo: ReadonlyMap<string, string>, tripId: string): NhatKyChuyenDto[] {
  return events.map((e) => ({
    id: e.id,
    loai: e.kind,
    nhan: NHAN_SU_KIEN_CHUYEN[e.kind as LoaiSuKienChuyen] ?? "Sự kiện chuyến",
    gioXayRa: gioVn(e.occurred_ms),
    gioGhiNhan: gioVn(Date.parse(e.created_at)),
    vanPhongKhai: e.occurred_source === "VAN_PHONG_KHAI",
    nguoiBam: e.decided_mode === "MAY" || e.created_by === null ? null : (nhan?.get(e.created_by) ?? null),
    may: e.decided_mode === "MAY",
    soNguoi: e.count,
    phaLe: e.override_rule_code && e.override_reason_code ? { luat: e.override_rule_code, lyDoNhan: lyDo.get(e.override_reason_code) ?? "Phá lệ" } : null,
    chuyenKhac: e.trip_id !== tripId,
  }));
}

export function banChupDto(b: { chup: BanChupRow; muc: { item_kind: string; document_type_code: string | null; license_class_code: string | null; expiry_date: string | null }[] } | null): BanChupDto | null {
  if (!b) return null;
  return {
    ketQua: b.chup.ket_qua, luc: gioVn(Date.parse(b.chup.checked_at)), bienSo: b.chup.plate_number, soCho: b.chup.passenger_capacity, nghiDaDung: b.chup.rest_minutes_used,
    muc: b.muc.map((m) => ({ loai: m.item_kind, loaiGiayTo: m.document_type_code, hang: m.license_class_code, hetHan: m.expiry_date })), soNguoiChot: b.chup.so_chot,
  };
}

/**
 * ADR-0059 — DTO xe trên chi tiết đơn, DỰNG MỚI TỪNG KHOÁ (danh sách trắng): mỗi chặng mở của đơn một mục (chưa xếp → `xe` rỗng), mỗi chuyến chưa huỷ chở khách
 * của chặng một dòng. Không id / mã chuyến, không SĐT, không tên khách, không khoá nơi.
 */
export function xeCuaDonDto(legIds: readonly string[], rows: readonly XeCuaDonRow[]): XeCuaDonResponse {
  return {
    chang: legIds.map((legId) => ({
      legId,
      xe: rows.filter((r) => r.leg_id === legId).map((r) => ({ bienSo: r.plate_number, tenTaiXe: r.driver_name, soKhach: r.so_khach, trangThai: r.status })),
    })),
  };
}
