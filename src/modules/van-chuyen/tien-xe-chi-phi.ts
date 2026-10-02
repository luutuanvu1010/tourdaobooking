// ROUTE CHI PHÍ CHUYẾN XE THUÊ của Kế toán / Quản trị (ADR-0057 T2 C5, C8, C9 — kế hoạch Đợt 4 Task 10): xem chi phí, điều chỉnh, đảo dòng, lấy lại giá bảng,
// nhập giá thoả thuận, bảng kê. Đọc → luật thuần (tien-xe.ts) → lô [câu ghi gác PHIÊN BẢN CHI PHÍ, nhật ký `changes() > 0`] → phản hồi. Mọi tổng qua
// `tongChiPhiChuyen` / `tongBangKe` (hàng rào src/tien-xe-mot-nguon.test.ts). Thân route ở index.ts hỏi `can()` trước rồi gọi các hàm ở đây.
import { auditStatement } from "../audit";
import { nhaXeDangHopTac } from "../parties";
import type { BangKeResponse, ChiPhiChuyenDto, NhomBangKeDto, StaffProfile } from "../../shared/contracts";
import { laLyDoHeThong } from "../../shared/dieu-phoi-kieu";
import { error } from "../../shared/http";
import { tripById, type TripRow } from "./chuyen-repo";
import { findVehicle } from "./repository";
import { CAU_CHI_PHI_VUA_DOI, CAU_NHA_XE_THOI, CAU_TONG_AM, loiRangBuocChuyen } from "./rules";
import { chonDongGiaThue, chuTien, coXeCua, daoDuoc, nguonGiaConHieuLuc, nhaXeChiuChiPhi, tongChiPhiChuyen, type DongChiPhi } from "./tien-xe";
import { bangKeDto, chiPhiChuyenDto } from "./tien-xe-dto";
import { dongCua } from "./tien-xe-lo";
import {
  COST_ADJUST_KT, COST_AGREED_KT, COST_REVERSE_KT, COST_SNAPSHOT_KT, bangKeLines, bangKeTrips, costLinesOfTrip, costReasons, findCostLine, findRoute, listRoutes, listSizes,
  partyName, ratesOfCarrier, type CostLineRow,
} from "./tien-xe-repo";
import type { DaoDongThan, DieuChinhThan, ThoaThuanThan } from "./tien-xe-than";

const KHONG_CO_CHUYEN = () => error(404, "not_found", "Không tìm thấy chuyến xe.");
const VUA_DOI = () => error(409, "chi_phi_vua_doi", CAU_CHI_PHI_VUA_DOI);
const TONG_AM = () => error(409, "tong_am", CAU_TONG_AM);
const NHA_XE_THOI = () => error(409, "carrier_inactive", CAU_NHA_XE_THOI);
const LY_DO_SAI = () => error(400, "invalid_input", "Lý do không có trong danh mục chi phí xe.");

/** Nhà xe chịu chi phí — MỘT luật (`nhaXeChiuChiPhi`) cho màn chi phí, dòng điều chỉnh và bảng kê. */
const nhaXeCuaChiPhi = (rows: readonly CostLineRow[], trip: TripRow): string =>
  nhaXeChiuChiPhi(rows.map((r) => ({ kind: r.kind, carrierPartyId: r.carrier_party_id })), trip.carrier_party_id);

// ---- Xem -------------------------------------------------------------------------------------------------------------------------------------------------
export async function docChiPhiChuyen(db: D1Database, tripId: string, nhanNhanVien: (ids: readonly string[]) => Promise<Map<string, string> | null>): Promise<ChiPhiChuyenDto | null> {
  const trip = await tripById(db, tripId);
  if (!trip) return null;
  const [rows, reasons, dangMo] = await Promise.all([costLinesOfTrip(db, trip.id), costReasons(db), nhaXeDangHopTac(db)]);
  const nx = nhaXeCuaChiPhi(rows, trip);
  const [ten, tuyen, nhan] = await Promise.all([
    partyName(db, nx), trip.route_code ? findRoute(db, trip.route_code) : Promise.resolve(null),
    nhanNhanVien([...new Set(rows.flatMap((r) => (r.created_by ? [r.created_by] : [])))]),
  ]);
  return chiPhiChuyenDto({
    trip, rows, reasons, nhan, nhaXe: trip.rented === 1 || rows.length > 0 ? { partyId: nx, ten: ten ?? "" } : null,
    tuyen: trip.route_code ? { ma: trip.route_code, ten: tuyen?.name ?? trip.route_code } : null, nhaXeDangHopTac: dangMo.some((c) => c.partyId === nx),
  });
}

// ---- Ghi (chung) -----------------------------------------------------------------------------------------------------------------------------------------
type KetQuaGhi = { ok: true; lap: boolean } | { ok: false; res: Response };
/** Gửi lại cùng requestId (= id dòng): dòng đã có ⇒ 200 kết quả hiện tại; dòng của chuyến khác ⇒ 409. */
async function daGhi(db: D1Database, requestId: string, tripId: string): Promise<KetQuaGhi | null> {
  const r = await findCostLine(db, requestId);
  if (!r) return null;
  return r.trip_id === tripId ? { ok: true, lap: true } : { ok: false, res: error(409, "request_trung", "Mã yêu cầu đã dùng — tải lại trang rồi bấm lại.") };
}
async function chayGhi(db: D1Database, lo: D1PreparedStatement[]): Promise<KetQuaGhi> {
  try {
    const kq = await db.batch(lo);
    return (kq[0]?.meta.changes ?? 0) === 0 ? { ok: false, res: VUA_DOI() } : { ok: true, lap: false };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (/UNIQUE constraint failed: vc_trip_cost_line\.id/.test(m)) return { ok: true, lap: true };
    const r = loiRangBuocChuyen(m);
    if (r) return { ok: false, res: error(r.status, r.code, r.message) };
    throw e;
  }
}
const nhatKy = (db: D1Database, v: { id: string; staff: StaffProfile; at: string; action: "trip_cost_adjusted" | "trip_cost_reversed" | "trip_cost_snapshot" | "trip_cost_agreed"; tripId: string; detail: string }) =>
  auditStatement(db, { id: v.id, staffId: v.staff.id, action: v.action, at: v.at, targetType: "trip", targetId: v.tripId, detail: v.detail }, "changes() > 0");
async function nguCanh(db: D1Database, tripId: string): Promise<{ trip: TripRow; rows: CostLineRow[]; dong: DongChiPhi[]; tenNhaXe: string } | null> {
  const trip = await tripById(db, tripId);
  if (!trip) return null;
  const rows = await costLinesOfTrip(db, trip.id);
  return { trip, rows, dong: rows.map(dongCua), tenNhaXe: (await partyName(db, nhaXeCuaChiPhi(rows, trip))) ?? "nhà xe" };
}
const chiTiet = (trip: TripRow, tenNhaXe: string, truoc: number, sau: number, nhan: string) => `${trip.code} · ${tenNhaXe} · chi phí ${chuTien(truoc)} → ${chuTien(sau)} · ${nhan}`;
/** Lý do người ghi: nhóm chi phí xe, đang dùng, không phải mã hệ thống, không phải "Giá thoả thuận trước". */
async function lyDoNguoiGhi(db: D1Database, ma: string): Promise<string | null> {
  const r = (await costReasons(db)).find((x) => x.code === ma);
  return r && r.active === 1 && !laLyDoHeThong(r.code) && r.code !== "CPX_GIA_THOA_THUAN" ? r.label : null;
}

// ---- Điều chỉnh (ADR-0057 C4, C8; Q-T6; TC-11) -------------------------------------------------------------------------------------------------------------
export async function lenhDieuChinh(db: D1Database, tripId: string, b: DieuChinhThan, staff: StaffProfile, now: Date, homNay: string): Promise<KetQuaGhi | null> {
  const lap = await daGhi(db, b.requestId, tripId);
  if (lap) return lap;
  const nc = await nguCanh(db, tripId);
  if (!nc) return null;
  const nhan = await lyDoNguoiGhi(db, b.lyDo);
  if (!nhan) return { ok: false, res: LY_DO_SAI() };
  // TC-11: chỉ chuyến đã từng có dòng chi phí. Chuyến KHÔNG còn là xe thuê mà chưa huỷ: không ghi (R-VC-COST-3 — câu hỏi cho chủ ở báo cáo).
  if (nc.rows.length === 0) return { ok: false, res: error(409, "chua_co_chi_phi", "Chuyến này chưa có chi phí nào để điều chỉnh.") };
  if (nc.trip.rented === 0 && nc.trip.status !== "CANCELLED") return { ok: false, res: error(409, "khong_phai_xe_thue", "Chuyến này không còn là xe thuê — không ghi chi phí xe thuê.") };
  if (b.phienBanChiPhi !== nc.rows.length) return { ok: false, res: VUA_DOI() };
  const truoc = tongChiPhiChuyen(nc.dong);
  if (truoc + b.soTien < 0) return { ok: false, res: TONG_AM() };
  const at = now.toISOString();
  return chayGhi(db, [
    db.prepare(COST_ADJUST_KT).bind(b.requestId, nc.trip.id, nhaXeCuaChiPhi(nc.rows, nc.trip), b.soTien, b.lyDo, b.ghiChu, b.ngay ?? homNay, b.requestId, at, staff.id, b.phienBanChiPhi),
    nhatKy(db, { id: b.requestId, staff, at, action: "trip_cost_adjusted", tripId: nc.trip.id, detail: chiTiet(nc.trip, nc.tenNhaXe, truoc, truoc + b.soTien, nhan) }),
  ]);
}

// ---- Đảo dòng (ADR-0057 C4, C8 — V9) -----------------------------------------------------------------------------------------------------------------------
export async function lenhDaoDong(db: D1Database, tripId: string, b: DaoDongThan, staff: StaffProfile, now: Date, homNay: string): Promise<KetQuaGhi | null> {
  const lap = await daGhi(db, b.requestId, tripId);
  if (lap) return lap;
  const nc = await nguCanh(db, tripId);
  if (!nc) return null;
  const nhan = await lyDoNguoiGhi(db, b.lyDo);
  if (!nhan) return { ok: false, res: LY_DO_SAI() };
  const i = nc.rows.findIndex((r) => r.id === b.dongId);
  if (i < 0) return { ok: false, res: error(404, "not_found", "Không tìm thấy dòng chi phí này của chuyến.") };
  const goc = nc.dong[i]!;
  if (b.phienBanChiPhi !== nc.rows.length) return { ok: false, res: VUA_DOI() };
  if (!daoDuoc(nc.dong, goc, nc.trip.status)) {
    const nguon = goc.kind === "SNAPSHOT" || goc.kind === "AGREED";
    return {
      ok: false,
      res: error(409, "khong_dao_duoc", goc.kind !== "REVERSAL" && nguon && !nc.dong.some((d) => d.reversesId === goc.id)
        ? "Giá đã chụp không đảo được sau khi xe chạy — dùng điều chỉnh."
        : "Dòng này đã được đảo hoặc là dòng đảo."),
    };
  }
  const truoc = tongChiPhiChuyen(nc.dong);
  if (truoc - goc.amount < 0) return { ok: false, res: TONG_AM() };
  const at = now.toISOString();
  return chayGhi(db, [
    db.prepare(COST_REVERSE_KT).bind(b.requestId, nc.trip.id, nc.rows[i]!.carrier_party_id, -goc.amount, goc.id, b.lyDo, b.ghiChu, b.ngay ?? homNay, b.requestId, at, staff.id, b.phienBanChiPhi),
    nhatKy(db, { id: b.requestId, staff, at, action: "trip_cost_reversed", tripId: nc.trip.id, detail: chiTiet(nc.trip, nc.tenNhaXe, truoc, truoc - goc.amount, nhan) }),
  ]);
}

/** Điều kiện chung của "lấy lại giá bảng" và "giá thoả thuận" (ADR-0057 C5): chưa xuất bến, xe thuê, chưa có nguồn giá, nhà xe đang hợp tác. */
async function kiemDatGia(db: D1Database, nc: { trip: TripRow; dong: DongChiPhi[] }, phienBan: number, rowsLen: number): Promise<Response | null> {
  if (nc.trip.status !== "PLANNED") return error(409, "chuyen_khong_con_ke_hoach", "Chỉ đặt giá khi chuyến chưa xuất bến — sau đó dùng điều chỉnh.");
  if (nc.trip.rented !== 1) return error(409, "khong_phai_xe_thue", "Chuyến này không phải xe thuê — không cần giá.");
  const nguon = nguonGiaConHieuLuc(nc.dong);
  if (nguon?.kind === "SNAPSHOT") return error(409, "da_co_gia", "Chuyến đã có giá bảng — đảo giá bảng trước nếu muốn dùng giá thoả thuận.");
  if (nguon?.kind === "AGREED") return error(409, "da_co_gia", "Chuyến đã có giá thoả thuận — đảo giá cũ trước nếu muốn nhập lại.");
  if (phienBan !== rowsLen) return VUA_DOI();
  if (!(await nhaXeDangHopTac(db)).some((c) => c.partyId === nc.trip.carrier_party_id)) return NHA_XE_THOI();
  return null;
}

// ---- Lấy lại giá bảng (ADR-0057 C5 "Chụp lại" — ngoại lệ có chủ ý của mốc lúc xếp) ------------------------------------------------------------------------
export async function lenhChupLai(db: D1Database, tripId: string, b: { requestId: string; phienBanChiPhi: number }, staff: StaffProfile, now: Date, homNay: string): Promise<KetQuaGhi | null> {
  const lap = await daGhi(db, b.requestId, tripId);
  if (lap) return lap;
  const nc = await nguCanh(db, tripId);
  if (!nc) return null;
  const chan = await kiemDatGia(db, nc, b.phienBanChiPhi, nc.rows.length);
  if (chan) return { ok: false, res: chan };
  const [xe, gia, co] = await Promise.all([findVehicle(db, nc.trip.vehicle_id), ratesOfCarrier(db, nc.trip.carrier_party_id), listSizes(db, homNay)]);
  const soCho = xe?.passenger_capacity ?? 0;
  const sizeCode = coXeCua(soCho, co.map((c) => ({ code: c.code, min: c.min_passengers, max: c.max_passengers, active: c.active === 1 })));
  const g = chonDongGiaThue(
    { carrierPartyId: nc.trip.carrier_party_id, routeCode: nc.trip.route_code, sizeCode, ngayChay: nc.trip.service_date },
    gia.map((r) => ({ id: r.id, carrierPartyId: r.carrier_party_id, routeCode: r.route_code, sizeCode: r.vehicle_size_code, amount: r.amount, validFrom: r.valid_from_date, validTo: r.valid_to_date })),
  );
  if (!g) return { ok: false, res: error(409, "khong_co_gia_bang", "Chưa có giá bảng cho chuyến này — nhập giá thoả thuận.") };
  const at = now.toISOString();
  const truoc = tongChiPhiChuyen(nc.dong);
  return chayGhi(db, [
    db.prepare(COST_SNAPSHOT_KT).bind(b.requestId, nc.trip.id, nc.trip.carrier_party_id, g.amount, g.id, nc.trip.route_code, sizeCode, soCho, nc.trip.service_date, b.requestId, at, staff.id, b.phienBanChiPhi),
    nhatKy(db, { id: b.requestId, staff, at, action: "trip_cost_snapshot", tripId: nc.trip.id, detail: chiTiet(nc.trip, nc.tenNhaXe, truoc, truoc + g.amount, "lấy lại giá bảng") }),
  ]);
}

// ---- Giá thoả thuận trước (ADR-0057 C5 — chủ lần 18) -----------------------------------------------------------------------------------------------------
export async function lenhGiaThoaThuan(db: D1Database, tripId: string, b: ThoaThuanThan, staff: StaffProfile, now: Date): Promise<KetQuaGhi | null> {
  const lap = await daGhi(db, b.requestId, tripId);
  if (lap) return lap;
  const nc = await nguCanh(db, tripId);
  if (!nc) return null;
  const chan = await kiemDatGia(db, nc, b.phienBanChiPhi, nc.rows.length);
  if (chan) return { ok: false, res: chan };
  const at = now.toISOString();
  const truoc = tongChiPhiChuyen(nc.dong);
  return chayGhi(db, [
    db.prepare(COST_AGREED_KT).bind(b.requestId, nc.trip.id, nc.trip.carrier_party_id, b.soTien, b.ghiChu, nc.trip.service_date, b.requestId, at, staff.id, b.phienBanChiPhi),
    nhatKy(db, { id: b.requestId, staff, at, action: "trip_cost_agreed", tripId: nc.trip.id, detail: chiTiet(nc.trip, nc.tenNhaXe, truoc, truoc + b.soTien, "giá thoả thuận trước") }),
  ]);
}

// ---- Bảng kê -------------------------------------------------------------------------------------------------------------------------------------------------
/** Nhóm + lọc theo NHÀ XE CHỊU CHI PHÍ (`nhaXeChiuChiPhi` — không theo chủ xe hiện tại của chuyến): đọc mọi chuyến của khoảng, lọc nhà xe ở luật. */
export async function docBangKe(db: D1Database, v: { tu: string; den: string; nhaXe: string | null; nhom: NhomBangKeDto | null }): Promise<BangKeResponse> {
  const [trips, lines, tuyen] = await Promise.all([bangKeTrips(db, v.tu, v.den, null), bangKeLines(db, v.tu, v.den), listRoutes(db)]);
  const theoChuyen = new Map<string, { kind: CostLineRow["kind"]; carrierPartyId: string }[]>();
  for (const r of lines) theoChuyen.set(r.trip_id, [...(theoChuyen.get(r.trip_id) ?? []), { kind: r.kind, carrierPartyId: r.carrier_party_id }]);
  const nhaXeCua = new Map(trips.map((t) => [t.id, nhaXeChiuChiPhi(theoChuyen.get(t.id) ?? [], t.carrier_party_id)]));
  const ids = [...new Set(nhaXeCua.values())];
  const ten = new Map(await Promise.all(ids.map(async (id) => [id, (await partyName(db, id)) ?? ""] as const)));
  return bangKeDto({
    tu: v.tu, den: v.den, nhaXePartyId: v.nhaXe, nhom: v.nhom, trips: trips.filter((t) => v.nhaXe === null || nhaXeCua.get(t.id) === v.nhaXe), lines,
    tenTuyen: new Map(tuyen.map((t) => [t.code, t.name])), nhaXeCua, tenNhaXe: ten,
  });
}

export { KHONG_CO_CHUYEN };
