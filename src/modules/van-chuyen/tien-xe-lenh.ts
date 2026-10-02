// XỬ LÝ ROUTE TIỀN XE THUÊ (ADR-0057 T1 B4/B5, T2 C9 — kế hoạch Đợt 4 Task 4, 10): đọc → luật thuần (tien-xe.ts) → lô (`db.batch`, nhật ký cùng lô, C10)
// → phản hồi. Thân route ở index.ts chỉ hỏi `can()` rồi gọi các hàm ở đây. Lỗi CSDL dịch sang 409 bằng lời ở `loiTienXe` (KHÔNG đụng `loiRangBuocChuyen`).
import { auditStatement } from "../audit";
import { nhaXeDangHopTac, ownerCompany } from "../parties";
import type { BangGiaResponse, StaffProfile } from "../../shared/contracts";
import { error } from "../../shared/http";
import { addDays } from "../../shared/vn-date";
import { chuTien, dongChongGia, type DongGiaThue } from "./tien-xe";
import { bangGiaDto, coXeDto, tuyenDto } from "./tien-xe-dto";
import {
  closeRateStatement, findRate, findRoute, findSize, inactiveCarriersWithOpenRate, insertRateStatement, insertRouteStatement, insertSizeStatement, listRoutes, listSizes, partyName,
  ratesOfCarrier, routeCount, sizeCount, updateRouteStatement, updateSizeStatement, type RateRow, type RouteRow, type SizeRow,
} from "./tien-xe-repo";
import { nhanCoXeMacDinh, type ThemGiaThan } from "./tien-xe-than";

/** Nguồn phân loại xe thuê (ADR-0057 C2a) — hàm công bố của parties (không thêm hàm "isCarrier"): công ty chủ hiện tại + nhà xe đang hợp tác. */
export async function docPhanLoai(db: D1Database): Promise<{ congTyChuId: string | null; nhaXeDangMo: ReadonlySet<string> }> {
  const [cty, nx] = await Promise.all([ownerCompany(db), nhaXeDangHopTac(db)]);
  return { congTyChuId: cty?.partyId ?? null, nhaXeDangMo: new Set(nx.map((c) => c.partyId)) };
}

/** Câu lời theo bản vẽ Đợt 4 (ADR-0057 B4 lớp máy chủ). */
export const CAU_NHA_XE_THOI_GIA = "Nhà xe này đã thôi hợp tác — không thể thêm giá mới.";
const GIA_CHONG = () => error(409, "gia_chong", "Nhà xe đã có giá cùng tuyến, cùng cỡ trong khoảng ngày này.");
const NHA_XE_THOI = () => error(409, "nha_xe_khong_hop_tac", CAU_NHA_XE_THOI_GIA);
const CO_XE_CHONG = () => error(409, "co_xe_chong", "Khoảng số khách chồng với cỡ xe đang dùng — ngưng cỡ cũ trước, hoặc chọn khoảng khác.");

/** Lỗi ràng buộc CSDL của bảng giá / tuyến / cỡ → 409 bằng lời; không khớp → null (ném lại). */
export function loiTienXe(message: string): Response | null {
  if (/\bvc_rate_overlap:/.test(message)) return GIA_CHONG();
  if (/\bvc_rate_carrier:/.test(message)) return NHA_XE_THOI();
  if (/\bvc_size_overlap:/.test(message)) return CO_XE_CHONG();
  if (/\bvc_rate_append_only:/.test(message)) return error(409, "gia_vua_doi", "Dòng giá vừa được người khác kết thúc — tải lại rồi làm lại.");
  return null;
}
async function chay(db: D1Database, lo: D1PreparedStatement[]): Promise<{ ok: true; kq: D1Result[] } | { ok: false; res: Response }> {
  try {
    return { ok: true, kq: await db.batch(lo) };
  } catch (e) {
    const r = loiTienXe(e instanceof Error ? e.message : String(e));
    if (r) return { ok: false, res: r };
    throw e;
  }
}

const dongGia = (r: RateRow): DongGiaThue => ({
  id: r.id, carrierPartyId: r.carrier_party_id, routeCode: r.route_code, sizeCode: r.vehicle_size_code, amount: r.amount, validFrom: r.valid_from_date, validTo: r.valid_to_date,
});
const theoMa = <T extends { code: string }>(ds: readonly T[]): Map<string, T> => new Map(ds.map((x) => [x.code, x]));
const moTaKhoa = (tuyen: RouteRow | undefined | null, co: SizeRow | undefined | null) =>
  [tuyen ? `tuyến ${tuyen.name}` : null, co ? `cỡ ${co.label}` : null].filter(Boolean).join(", ");

// ---- Đọc bảng giá ---------------------------------------------------------------------------------------------------------------------------------------
export async function docBangGia(db: D1Database, nhaXe: string | null, ngay: string): Promise<BangGiaResponse> {
  const [tuyen, coXe, dangMo, daThoi] = await Promise.all([listRoutes(db), listSizes(db, ngay), nhaXeDangHopTac(db), inactiveCarriersWithOpenRate(db, ngay)]);
  const dong = nhaXe ? await ratesOfCarrier(db, nhaXe) : [];
  const mt = theoMa(tuyen);
  const mc = theoMa(coXe);
  return {
    ngay, nhaXePartyId: nhaXe,
    dong: dong.map((r) => bangGiaDto(r, ngay, mt, mc)),
    tuyen: tuyen.map(tuyenDto),
    coXe: coXe.map((c) => coXeDto(c, true)),
    nhaXe: [
      ...dangMo.map((c) => ({ partyId: c.partyId, ten: c.displayName, dangHopTac: true })),
      ...daThoi.map((c) => ({ partyId: c.party_id, ten: c.display_name, dangHopTac: false })),
    ],
  };
}

// ---- Thêm giá (tuỳ chọn "thay dòng X": đóng X ở ngày trước ngày bắt đầu mới + thêm dòng mới trong MỘT lô) ----------------------------------------------
/** Trả dòng đã ghi (201) — hoặc dòng cũ khi gửi lại cùng `requestId` (= id dòng giá; 200) — hoặc `Response` lỗi. */
export async function lenhThemGia(db: D1Database, b: ThemGiaThan, staff: StaffProfile, nowIso: string): Promise<{ row: RateRow; lap: boolean } | Response> {
  const cu = await findRate(db, b.requestId);
  if (cu) return cu.carrier_party_id === b.nhaXePartyId ? { row: cu, lap: true } : error(409, "request_trung", "Mã yêu cầu đã dùng — tải lại trang rồi bấm lại.");
  const nhaXe = (await nhaXeDangHopTac(db)).find((c) => c.partyId === b.nhaXePartyId);
  if (!nhaXe) return NHA_XE_THOI();
  const tuyen = b.tuyen === null ? null : await findRoute(db, b.tuyen);
  if (b.tuyen !== null && (!tuyen || tuyen.active !== 1)) return error(400, "invalid_input", "Tuyến không có hoặc đã ngưng dùng.");
  const co = b.coXe === null ? null : await findSize(db, b.coXe);
  if (b.coXe !== null && (!co || co.active !== 1)) return error(400, "invalid_input", "Cỡ xe không có hoặc đã ngưng dùng.");
  const dong = (await ratesOfCarrier(db, b.nhaXePartyId)).map(dongGia);
  let thay: DongGiaThue | null = null;
  if (b.thayDongId !== null) {
    thay = dong.find((d) => d.id === b.thayDongId) ?? null;
    if (!thay) return error(404, "not_found", "Không tìm thấy dòng giá cần thay của nhà xe này.");
    if (thay.validTo !== null) return error(409, "thay_khong_hop_le", "Dòng giá này đã kết thúc — thêm giá mới thay vì đổi giá.");
    if (thay.routeCode !== b.tuyen || thay.sizeCode !== b.coXe) return error(409, "thay_khong_hop_le", "Đổi giá giữ nguyên tuyến và cỡ xe của dòng cũ.");
    if (!(thay.validFrom < b.tuNgay)) return error(409, "thay_khong_hop_le", "Giá mới phải bắt đầu sau ngày bắt đầu của giá cũ.");
  }
  const moi = { carrierPartyId: b.nhaXePartyId, routeCode: b.tuyen, sizeCode: b.coXe, validFrom: b.tuNgay, validTo: b.denNgay };
  if (dongChongGia(moi, dong, thay?.id)) return GIA_CHONG();
  const ngayDong = thay ? addDays(b.tuNgay, -1) : null;
  const khoa = moTaKhoa(tuyen, co);
  const lo: D1PreparedStatement[] = [];
  if (thay && ngayDong) lo.push(closeRateStatement(db, thay.id, ngayDong, nowIso, staff.id));
  lo.push(insertRateStatement(db, { id: b.requestId, carrier: b.nhaXePartyId, route: b.tuyen, size: b.coXe, amount: b.soTien, from: b.tuNgay, to: b.denNgay, note: b.ghiChu, replaces: thay?.id ?? null }, nowIso, staff.id));
  lo.push(auditStatement(db, {
    staffId: staff.id, action: "rental_rate_added", at: nowIso, targetType: "trip", targetId: b.requestId,
    detail: `${nhaXe.displayName} · ${khoa} · ${thay ? `${chuTien(thay.amount)} → ` : ""}${chuTien(b.soTien)} đ/chuyến · từ ${b.tuNgay}${b.denNgay ? ` đến ${b.denNgay}` : ""}${thay ? ` (giá cũ kết thúc ${ngayDong})` : ""}`,
  }));
  const r = await chay(db, lo);
  if (!r.ok) return r.res;
  if (thay && (r.kq[0]?.meta.changes ?? 0) === 0) {
    // Dòng cũ vừa được người khác kết thúc: dòng mới đã ghi (trigger chồng giá đã cho qua ⇒ không chồng) — báo để người dùng xem lại.
    return error(409, "gia_vua_doi", "Giá cũ vừa được người khác kết thúc — giá mới đã lưu, tải lại để xem.");
  }
  return { row: (await findRate(db, b.requestId))!, lap: false };
}

// ---- Kết thúc giá (được cả với nhà xe đã thôi hợp tác — ADR-0057 B4) ------------------------------------------------------------------------------------
export async function lenhKetThucGia(db: D1Database, id: string, denNgay: string, staff: StaffProfile, nowIso: string): Promise<RateRow | Response> {
  const r = await findRate(db, id);
  if (!r) return error(404, "not_found", "Không tìm thấy dòng giá.");
  if (r.valid_to_date !== null) return error(409, "gia_da_ket_thuc", "Dòng giá này đã kết thúc.");
  if (denNgay < r.valid_from_date) return error(400, "invalid_input", "Ngày kết thúc không được trước ngày bắt đầu của giá.");
  const [ten, tuyen, co] = await Promise.all([
    partyName(db, r.carrier_party_id), r.route_code ? findRoute(db, r.route_code) : null, r.vehicle_size_code ? findSize(db, r.vehicle_size_code) : null,
  ]);
  const kq = await chay(db, [
    closeRateStatement(db, id, denNgay, nowIso, staff.id),
    auditStatement(db, {
      staffId: staff.id, action: "rental_rate_closed", at: nowIso, targetType: "trip", targetId: id,
      detail: `${ten ?? "nhà xe"} · ${moTaKhoa(tuyen, co)} · ${chuTien(r.amount)} đ/chuyến · kết thúc ${denNgay}`,
    }, "changes() > 0"),
  ]);
  if (!kq.ok) return kq.res;
  if ((kq.kq[0]?.meta.changes ?? 0) === 0) return error(409, "gia_vua_doi", "Dòng giá vừa được người khác kết thúc — tải lại rồi làm lại.");
  return (await findRate(db, id))!;
}

// ---- Tuyến, cỡ xe (danh mục — mã máy sinh) --------------------------------------------------------------------------------------------------------------
/** Mã máy sinh: tiền tố + số thứ tự 3 chữ số (T001, S001…); trùng (hai người cùng thêm) → thử số kế. */
const maSinh = (tienTo: string, n: number) => `${tienTo}${String(n).padStart(3, "0")}`;
export async function lenhThemTuyen(db: D1Database, v: { ten: string; thuTu: number | null }, staff: StaffProfile, nowIso: string): Promise<RouteRow | Response> {
  const dem = await routeCount(db);
  for (let lan = 0; lan < 5; lan++) {
    const code = maSinh("T", dem + 1 + lan);
    try {
      await db.batch([
        insertRouteStatement(db, { code, name: v.ten, sortOrder: v.thuTu ?? 0 }, nowIso, staff.id),
        auditStatement(db, { staffId: staff.id, action: "route_saved", at: nowIso, targetType: "trip", targetId: code, detail: `Thêm tuyến ${v.ten}` }),
      ]);
      return (await findRoute(db, code))!;
    } catch (e) {
      if (e instanceof Error && /UNIQUE constraint failed: vc_route\.code/.test(e.message)) continue;
      throw e;
    }
  }
  return error(409, "stale", "Danh mục tuyến vừa đổi — thử lại.");
}
export async function lenhSuaTuyen(
  db: D1Database, code: string, v: { ten: string | null; dangDung: boolean | null; thuTu: number | null }, staff: StaffProfile, nowIso: string,
): Promise<RouteRow | Response> {
  const cu = await findRoute(db, code);
  if (!cu) return error(404, "not_found", "Không tìm thấy tuyến.");
  const moi = { code, name: v.ten ?? cu.name, active: v.dangDung ?? cu.active === 1, sortOrder: v.thuTu ?? cu.sort_order };
  const doi = [moi.name !== cu.name ? `tên ${cu.name} → ${moi.name}` : null, moi.active !== (cu.active === 1) ? (moi.active ? "dùng lại" : "ngưng dùng") : null].filter(Boolean);
  await db.batch([
    updateRouteStatement(db, moi, nowIso, staff.id),
    auditStatement(db, { staffId: staff.id, action: "route_saved", at: nowIso, targetType: "trip", targetId: code, detail: `Tuyến ${moi.name}: ${doi.join(", ") || "đổi thứ tự"}` }),
  ]);
  return (await findRoute(db, code))!;
}
export async function lenhThemCoXe(db: D1Database, v: { tu: number; den: number; nhan: string | null }, staff: StaffProfile, nowIso: string): Promise<SizeRow | Response> {
  const dem = await sizeCount(db);
  const nhan = v.nhan ?? nhanCoXeMacDinh(v.tu, v.den);
  for (let lan = 0; lan < 5; lan++) {
    const code = maSinh("S", dem + 1 + lan);
    const kq = await chay(db, [
      insertSizeStatement(db, { code, label: nhan, min: v.tu, max: v.den, sortOrder: 0 }, nowIso, staff.id),
      auditStatement(db, { staffId: staff.id, action: "vehicle_size_saved", at: nowIso, targetType: "trip", targetId: code, detail: `Thêm cỡ xe ${nhan} (${v.tu}–${v.den} khách)` }),
    ]).catch((e: unknown) => {
      if (e instanceof Error && /UNIQUE constraint failed: vc_vehicle_size\.code/.test(e.message)) return null;
      throw e;
    });
    if (kq === null) continue;
    if (!kq.ok) return kq.res;
    return (await findSize(db, code))!;
  }
  return error(409, "stale", "Danh mục cỡ xe vừa đổi — thử lại.");
}
export async function lenhSuaCoXe(db: D1Database, code: string, v: { nhan: string | null; dangDung: boolean | null }, staff: StaffProfile, nowIso: string): Promise<SizeRow | Response> {
  const cu = await findSize(db, code);
  if (!cu) return error(404, "not_found", "Không tìm thấy cỡ xe.");
  const moi = { code, label: v.nhan ?? cu.label, active: v.dangDung ?? cu.active === 1 };
  const doi = [moi.label !== cu.label ? `nhãn ${cu.label} → ${moi.label}` : null, moi.active !== (cu.active === 1) ? (moi.active ? "dùng lại" : "ngưng dùng") : null].filter(Boolean);
  const kq = await chay(db, [
    updateSizeStatement(db, moi, nowIso, staff.id),
    auditStatement(db, { staffId: staff.id, action: "vehicle_size_saved", at: nowIso, targetType: "trip", targetId: code, detail: `Cỡ xe ${moi.label}: ${doi.join(", ") || "không đổi"}` }),
  ]);
  if (!kq.ok) return kq.res;
  return (await findSize(db, code))!;
}
