// CÁC LỆNH KẾ HOẠCH của chuyến xe (Task A13; kế hoạch mục 1.5, 1.7 route 4–8, 40): đọc (vc_ + chính sách + tài xế) → luật thuần (`kiemTaoSuaChuyen`, `kiemXep`,
// `kiemMocXep`, `noiLechCuaSuat`) → dựng lô (dieu-phoi.ts) → chạy (`chayLo`). Trả `Response` khi từ chối, `null` / số khi đã ghi. KHÔNG gọi hàm hẹp của orders:
// chặng (`lichChungChang`) do thân route đọc sau `can()` và truyền vào (bài src/orders-cong-bo.test.ts).
import type { ChangLichChung, ChangNhapLichChung } from "../orders";
import type { StaffProfile } from "../../shared/contracts";
import { changXetTheoDon, khoaNguoiRanh, kiemTaoSuaChuyen, kiemXep, moLaiSauDoiKhach, noiLechCuaSuat, suatKhachDaDoi, tenLucXep } from "../../shared/dieu-phoi-kiem";
import type { ChangVao, KetQuaKiem } from "../../shared/dieu-phoi-kieu";
import type { CanhBaoGioLai } from "../../shared/gio-lai";
import { dungLichChung } from "../../shared/dieu-phoi-lich-chung";
import { error } from "../../shared/http";
import { lyDoGiu, type LyDoGiu } from "../../shared/ly-do-giu";
import { batDauSomNhatSauDoiGio, kiemMocXep } from "../../shared/moc-toi-thieu";
import { addDays, msToVnLocal, vnLocalToMs } from "../../shared/vn-date";
import { khungBanXeTrongKhoang } from "./khung-ban-repo";
import type { LichChungResponse } from "../../shared/contracts";
import { allocsByTrips, allocsOpenByLegs, eventsByTrips, legFlags, stopsByTrips, tenDiem, tripsTouching, type TripRow } from "./chuyen-repo";
import { loCapNhatDiem, loCapNhatKhach, loDoi, loHuy, loRut, loSuaChuyen, loXep, type DiemMoi, type PhaLe, type SuatMoi } from "./dieu-phoi";
import {
  boSungXe, changVao, chinhSachVao, chuyenVao, diemVao, docChung, docNguCanh, khungBanVao, khungChuyen, lyDoChangNgoai, suatVao, taiXeVao, xeVao, type DuLieuChung, type NenChuyen,
} from "./dieu-phoi-doc";
import { canhBaoDto, changLichDto, chuyenTomTat, lyDoDangDung, taiXeChon, xeChon } from "./dieu-phoi-dto";
import { chayLo, diemChoKhoa, diemKhongConKhach, sapLaiDiem, gioNgan, loi409, loiKiem, lyDoHopLe, maDonGon, nhanLyDo, phaLeNhatKy } from "./dieu-phoi-route";
import type { DoiThan, HuyThan, RutThan, SuaChuyenThan, XepThan } from "./dieu-phoi-than";
import { phanLoaiThue } from "./tien-xe";
import { chiTietChiPhiNhatKy, keHoachChiPhiKhiDoi, keHoachChiPhiKhiHuy } from "./tien-xe-lo";
import { docChiPhiChoLenh, tenNhaXePhiHuy, tenTuyen, tenTuyenDangDung } from "./tien-xe-lenh";
import { cauNhaXeThoi } from "./rules";

const TUYEN_KHONG_HOP_LE = () => error(400, "invalid_input", "Tuyến không có hoặc đã ngưng dùng.");
const NHA_XE_THOI_HOP_TAC = (v: { doiTuyen: boolean; doiNgay: boolean }) => error(409, "carrier_inactive", cauNhaXeThoi(v));

const NGAY_MS = 86_400_000;
const nowIsoOf = (ms: number) => new Date(ms).toISOString();
const homNay = (ms: number) => msToVnLocal(ms).date;
const PHA_LE_KHONG_HOP_LE = () => error(400, "invalid_input", "Lý do phá lệ không có trong danh mục.");
const phaLeCua = (chung: DuLieuChung, luat: "MOC_TOI_THIEU" | "KHOANG_NGHI", p: { lyDo: string } | null): PhaLe | null =>
  p ? { luat, lyDo: p.lyDo, policyId: chung.chinhSach?.id ?? null } : null;
/** Trạng thái không còn lập kế hoạch → 409 theo trạng thái (LC-15 / LC-06 lớp route). */
function khongConKeHoach(t: TripRow): Response | null {
  if (t.status === "PLANNED") return null;
  return loi409(t.status === "RUNNING" ? "xe_dang_chay" : "chuyen_da_ket_thuc", [lyDoGiu("CHUYEN_KHONG_CON_LEN_KE_HOACH", t.code)]);
}
/** Đuôi nhật ký khi lệnh sắp lại thứ tự điểm (HT-01) — chỉ con số (danh sách trắng mục 1.1). */
const sapNhatKy = (doi: readonly unknown[]): string => (doi.length > 0 ? `; sắp lại thứ tự ${doi.length} điểm (đón trước trả)` : "");
const lenhChung = (requestId: string, staff: StaffProfile, bayGioMs: number) => ({ cmd: crypto.randomUUID(), requestId, lucIso: nowIsoOf(bayGioMs), nguoiId: staff.id });

// ---- Sửa chuyến (route 4) ---------------------------------------------------------------------------------------------------------------------------------
/** `ra.nhacGioLai` (tuỳ chọn): nhắc giờ lái của chuyến sau sửa (ADR-0055 VK2-B B3 — chỉ nhắc); route gắn vào phản hồi `canhBaoLenh`. */
export async function lenhSuaChuyen(db: D1Database, nen: NenChuyen, b: SuaChuyenThan, staff: StaffProfile, bayGioMs: number, ra?: { nhacGioLai?: CanhBaoGioLai[] }): Promise<Response | null> {
  const t = nen.trip;
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  if ((b.phaLe && !lyDoHopLe(chung, b.phaLe.lyDo, "PHA_LE")) || (b.nghiPhaLe && !lyDoHopLe(chung, b.nghiPhaLe.lyDo, "PHA_LE"))) return PHA_LE_KHONG_HOP_LE();
  const xeId = b.xeId ?? t.vehicle_id;
  const taiXeId = b.taiXePartyId ?? t.driver_party_id;
  const batDauMs = b.batDauMs ?? t.planned_start_ms;
  const ketThucMs = b.ketThucMs ?? t.planned_end_ms;
  const xeRow = chung.xe.find((x) => x.id === xeId);
  if (!xeRow) return error(400, "invalid_input", "Xe không có hoặc đã ngừng dùng.");
  // ADR-0057 C2: tuyến (vắng = giữ). Đổi sang tuyến khác phải là tuyến đang dùng.
  const tuyenMoi = b.tuyen === undefined ? t.route_code : b.tuyen;
  const doiTuyen = tuyenMoi !== t.route_code;
  if (doiTuyen && tuyenMoi !== null && (await tenTuyenDangDung(db, tuyenMoi)) === null) return TUYEN_KHONG_HOP_LE();
  // LC-13 phần CHỈ máy chủ giữ (R-P8): tài xế MỚI không có trong `taiXeChoDieuPhoi` → chéo xe – tài xế (không báo nhầm "chưa có GPLX").
  if (b.taiXePartyId !== null && b.taiXePartyId !== t.driver_party_id && !chung.taiXe.some((x) => x.partyId === b.taiXePartyId)) {
    return loi409("cheo_xe_tai_xe", [lyDoGiu("CHEO_XE_TAI_XE")]);
  }
  for (const d of b.diem) {
    const s = nen.stops.find((x) => x.id === d.id);
    if (!s) return error(400, "invalid_input", "Điểm không thuộc chuyến này.");
    if (s.status !== "PENDING") return error(409, "diem_da_toi", "Điểm đã tới hoặc đã bỏ qua — không đổi thứ tự, giờ xe tới.");
  }
  // ADR-0057 C2a, C4 (Cần chủ 3 = A): cờ xe thuê CHỈ tính lại khi đổi xe (trigger vc_trip_rented_alone chặn đổi riêng cờ; chuyến cũ cờ 0 sửa giờ vẫn được); chi phí
  // tính lại khi đổi xe / nhà xe / tuyến / NGÀY chạy (ngày VN của giờ bắt đầu — dời giờ trong cùng ngày không tính lại). Xét TRƯỚC luật chéo xe – tài xế: chuyến
  // của nhà xe đã thôi hợp tác mà cần tính lại giá ⇒ 409 `carrier_inactive` bằng câu ADR C4 (không để lại dòng đảo lẻ).
  const doiXe = xeId !== t.vehicle_id;
  const ngayChayMoi = msToVnLocal(batDauMs).date;
  const cp = await docChiPhiChoLenh(db, { tripId: t.id, chuXe: xeRow.owner_party_id, homNay: homNay(bayGioMs) });
  const thue = doiXe ? phanLoaiThue({ chuXePartyId: xeRow.owner_party_id, congTyChuId: cp.congTyChuId, nhaXeDangMo: cp.nhaXeDangMo, cuRented: t.rented }) : t.rented;
  const doiNgay = ngayChayMoi !== t.service_date;
  const kh = keHoachChiPhiKhiDoi({
    dong: cp.dong, homNay: homNay(bayGioMs), rentedMoi: thue, chuXeMoi: xeRow.owner_party_id, nhaXeDangMo: cp.nhaXeDangMo, laTaoMoi: false, doiXeHoacNhaXe: doiXe, doiTuyen,
    doiNgay, tuyenMoi, soChoMoi: xeRow.passenger_capacity, ngayChayMoi, gia: cp.gia, coXe: cp.coXe,
  });
  if (!kh.ok) return NHA_XE_THOI_HOP_TAC({ doiTuyen, doiNgay: doiNgay && !doiXe });
  const khac = (await tripsTouching(db, Math.min(batDauMs, t.planned_start_ms) - NGAY_MS, Math.max(ketThucMs, t.planned_end_ms) + NGAY_MS)).filter((x) => x.id !== t.id);
  const tai = nen.allocs.filter((a) => a.valid_to_at === null && (a.status === "WAITING" || a.status === "BOARDED")).length;
  // ADR-0055 VK2-A A2 (i): khung bận còn hiệu lực giao giờ MỚI là khoảng chặn (lớp máy chủ nói trước bằng lời; trigger vc_trip_unavailable_upd là lưới thứ hai).
  const khungBan = (await khungBanXeTrongKhoang(db, batDauMs, ketThucMs)).map(khungBanVao);
  const kq = kiemTaoSuaChuyen({
    lenh: "SUA",
    chuyen: { id: t.id, batDauMs, ketThucMs, xe: xeVao(xeRow, chung.giayToXe), taiXe: taiXeId ? taiXeVao(taiXeId, chung.taiXe) : null, nghiPhaLe: b.nghiPhaLe !== null || t.rest_override_reason_code !== null },
    cu: { batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms, xeId: t.vehicle_id, taiXePartyId: t.driver_party_id, trangThai: t.status },
    taiTrenChuyen: tai, chuyenKhac: khac.map(khungChuyen), khungBan, chinhSach: chinhSachVao(chung.chinhSach), hangBang: chung.hangBang, bayGioMs,
  });
  const chan = loiKiem(kq, staff, t.status, { moc: b.phaLe !== null, nghi: b.nghiPhaLe !== null || t.rest_override_reason_code !== null });
  if (chan) return chan;
  if (ra) ra.nhacGioLai = kq.nhacGioLai;
  const doiGio = batDauMs !== t.planned_start_ms;
  const doiTaiXe = taiXeId !== t.driver_party_id && taiXeId !== null;
  const diemDoi = b.diem.filter((d) => {
    const s = nen.stops.find((x) => x.id === d.id)!;
    return s.seq !== d.thuTu || s.planned_date !== (d.gioXeToi?.ngay ?? null) || s.planned_time !== (d.gioXeToi?.gio ?? null);
  });
  if (!doiGio && ketThucMs === t.planned_end_ms && !doiXe && !doiTaiXe && !doiTuyen && diemDoi.length === 0 && !b.nghiPhaLe) return null; // không đổi gì — không ghi
  // R-P6 + R-P7: giờ sớm nhất sau khi đổi giờ — MỘT luật (`batDauSomNhatSauDoiGio`, mốc của chính sách HIỆN HÀNH lúc sửa); không đổi giờ thì giữ.
  const phut = chung.chinhSach?.min_lead_minutes ?? 0;
  const somNhat = doiGio ? batDauSomNhatSauDoiGio({ batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms }, batDauMs, bayGioMs, phut) : Math.min(t.earliest_start_ms, batDauMs);
  const phaLe = kq.canPhaLe.some((l) => l.ma === "MOC_TOI_THIEU") ? phaLeCua(chung, "MOC_TOI_THIEU", b.phaLe) : kq.canPhaLe.some((l) => l.ma === "KHOANG_NGHI") ? phaLeCua(chung, "KHOANG_NGHI", b.nghiPhaLe) : null;
  const thay: string[] = [];
  if (doiXe) thay.push(`xe ${chung.xe.find((x) => x.id === t.vehicle_id)?.plate_number ?? "?"} → ${xeRow.plate_number}`);
  if (doiTaiXe) thay.push("đổi tài xế");
  if (doiGio || ketThucMs !== t.planned_end_ms) thay.push(`giờ ${gioNgan(t.planned_start_ms, bayGioMs)}–${gioNgan(t.planned_end_ms, bayGioMs)} → ${gioNgan(batDauMs, bayGioMs)}–${gioNgan(ketThucMs, bayGioMs)}`);
  if (diemDoi.length > 0) thay.push(`${diemDoi.length} điểm đổi thứ tự / giờ xe tới`);
  if (doiTuyen) thay.push(`tuyến ${await tenTuyen(db, t.route_code)} → ${await tenTuyen(db, tuyenMoi)}`);
  const lo = loSuaChuyen(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), tripId: t.id, version: b.version,
    moi: {
      xeId, chuXePartyId: xeRow.owner_party_id, ngayChay: ngayChayMoi, batDauMs, ketThucMs, batDauSomNhatMs: somNhat, nghiPhaLeLyDo: b.nghiPhaLe?.lyDo ?? t.rest_override_reason_code,
      thue, tuyen: tuyenMoi,
    },
    chiPhi: kh.kh, phienBanChiPhi: kh.kh.phienBan,
    doiTaiXe: doiTaiXe ? taiXeId : null,
    diem: diemDoi.map((d) => ({ id: d.id, seq: d.thuTu, ngayXeToi: d.gioXeToi?.ngay ?? null, gioXeToi: d.gioXeToi?.gio ?? null })),
    phaLe, policyId: chung.chinhSach?.id ?? null,
    detail: `${t.code}: ${thay.join("; ") || "phá lệ khoảng nghỉ"}${phaLe ? phaLeNhatKy(phaLe.luat, nhanLyDo(chung, phaLe.lyDo)) : ""}${chiTietChiPhiNhatKy(kh.kh, thue, false, await tenNhaXePhiHuy(db, kh.kh.phiHuyBiDao))}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? null : r.res;
}

// ---- Xếp (route 5) ---------------------------------------------------------------------------------------------------------------------------------------
/**
 * `loi` null = đã xếp. `canhBao` = cảnh báo sớm của `kiemXep` (chặng chưa có nơi trả / chưa đủ tên — lời chủ 1/10 "chỉ cảnh báo, không chặn"): lệnh VẪN chạy,
 * route gắn vào phản hồi (`canhBaoXep`). Lần gửi lại cùng `requestId` (lô đã chạy) không tính lại — phản hồi không có cảnh báo.
 */
export async function lenhXep(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], b: XepThan, staff: StaffProfile, bayGioMs: number,
): Promise<{ loi: Response | null; canhBao: LyDoGiu[] }> {
  const ra = await lenhXepLo(db, nen, lich, b, staff, bayGioMs);
  return ra instanceof Response || ra === null ? { loi: ra, canhBao: [] } : ra;
}
async function lenhXepLo(db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], b: XepThan, staff: StaffProfile, bayGioMs: number): Promise<Response | null | { loi: Response | null; canhBao: LyDoGiu[] }> {
  const t = nen.trip;
  const dung = khongConKeHoach(t);
  if (dung) return dung;
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  if (b.phaLe && !lyDoHopLe(chung, b.phaLe.lyDo, "PHA_LE")) return PHA_LE_KHONG_HOP_LE();
  const nc = await docNguCanh(db, nen, lich, chung, b.chang.map((c) => c.legId));
  // Chặng không có trong lichChungChang (đơn nháp / đã huỷ / chặng đóng / ngoài khoảng ngày) → lý do CỤ THỂ theo cờ view (I38), không đoán.
  const ngoai = b.chang.filter((c) => !nc.chang.has(c.legId));
  if (ngoai.length > 0) {
    const flags = await legFlags(db, ngoai.map((c) => c.legId));
    return loi409("chang_khong_hop_le", ngoai.map((c) => {
      const f = flags.find((x) => x.id === c.legId);
      return f ? lyDoGiu(lyDoChangNgoai(f), f.order_code ?? undefined) : lyDoGiu("CHANG_KHONG_HOP_LE");
    }));
  }
  const tai = nen.allocs.filter((a) => a.valid_to_at === null && (a.status === "WAITING" || a.status === "BOARDED")).length;
  const xe = nc.chuyen.xe;
  const kq = kiemXep({
    chuyen: { id: t.id, ma: t.code, trangThai: t.status, batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms, soCho: xe.soCho, tai },
    them: b.chang.map((c) => ({ chang: nc.chang.get(c.legId)!, soSuatMoi: c.soSuat, personKeys: c.personKeys, suatMoCuaChang: nc.suatMoCuaChang })),
    soNguoiDiKemMoi: b.nguoiDiKem.length, lenh: "XEP", chinhSach: chinhSachVao(chung.chinhSach), bayGioMs,
  });
  const chan = loiKiem(kq, staff, t.status, { moc: b.phaLe !== null, nghi: true });
  if (chan) return chan;
  const diemMoi: DiemMoi[] = [];
  const suatMoi: SuatMoi[] = [];
  // I19(a) (làm bù theo kiểm độc lập K2c VỪA-1): khoá thân gửi trước, phần còn lại máy lấp bằng khoá người RẢNH theo thứ tự — MỘT luật với lúc xuất bến
  // (I19b, `khoaNguoiRanh`): hành khách hiện hành của đơn, chưa có suất mở ở chặng (mọi chuyến). "Chưa bị chính lô này dùng": mỗi chặng xuất hiện MỘT lần
  // trong thân (`docXep` → 400 "Một chặng xuất hiện hai lần") và `tenLucXep` không lặp khoá trong một chặng. Hết khoá rảnh → null (I19b bù lúc xuất bến).
  for (const c of b.chang) {
    const ch = nc.changLich.get(c.legId)!;
    const len = diemChoKhoa(nen.stops, diemMoi, t.id, "PICKUP", ch.khoaNoiDon, ch.noiDonDiemId, ch.noiDon);
    const xuong = ch.khoaNoiTra === null ? null : diemChoKhoa(nen.stops, diemMoi, t.id, "DROPOFF", ch.khoaNoiTra, ch.noiTraDiemId, ch.noiTra);
    const ranh = khoaNguoiRanh({ legId: c.legId, nguoiCuaDon: nc.chang.get(c.legId)!.nguoiCuaDon, suatMoCuaChang: nc.suatMoCuaChang });
    for (const personKey of tenLucXep({ soSuat: c.soSuat, personKeys: c.personKeys, ranh })) {
      suatMoi.push({ id: crypto.randomUUID(), tripId: t.id, loai: "PASSENGER", legId: c.legId, personKey, crewPartyId: null, boardStopId: len, alightStopId: xuong });
    }
  }
  for (const p of b.nguoiDiKem) suatMoi.push({ id: crypto.randomUUID(), tripId: t.id, loai: "CREW", legId: null, personKey: null, crewPartyId: p, boardStopId: null, alightStopId: null });
  // HT-01 (V1.2): điểm trả dùng lại có thể đứng trước điểm đón mới → sắp lại điểm chưa tới theo MỌI suất mở sau lệnh (cũ + mới).
  const doiThuTu = sapLaiDiem(nen.stops, diemMoi, t.id, [
    ...nen.allocs.filter((a) => a.valid_to_at === null).map((a) => ({ board: a.board_stop_id, alight: a.alight_stop_id })),
    ...suatMoi.map((s) => ({ board: s.boardStopId, alight: s.alightStopId })),
  ]);
  const phaLe = kq.canPhaLe.length > 0 ? phaLeCua(chung, "MOC_TOI_THIEU", b.phaLe) : null;
  const ma = maDonGon(b.chang.map((c) => nc.changLich.get(c.legId)!.orderCode));
  const lo = loXep(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), tripId: t.id, version: b.version, diemMoi, doiThuTu, suatMoi, phaLe, policyId: chung.chinhSach?.id ?? null,
    mocXep: b.chang.map((c) => {
      const ch = nc.changLich.get(c.legId)!;
      return { legId: c.legId, ngay: ch.pickupDate, gio: ch.pickupTime };
    }),
    detail: `${t.code}: xếp ${suatMoi.length} người${ma ? ` (${ma})` : ""}${sapNhatKy(doiThuTu)}${phaLe ? phaLeNhatKy(phaLe.luat, nhanLyDo(chung, phaLe.lyDo)) : ""}`,
  });
  try {
    const r = await chayLo(db, lo, b.requestId);
    return { loi: r.ok ? null : r.res, canhBao: r.ok ? kq.canhBao : [] };
  } catch (e) {
    if (e instanceof Error && /FOREIGN KEY constraint failed/.test(e.message)) return error(400, "invalid_input", "Người đi kèm không có trong hồ sơ.");
    throw e;
  }
}

// ---- Rút (route 6) ---------------------------------------------------------------------------------------------------------------------------------------
export async function lenhRut(db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], b: RutThan, staff: StaffProfile, bayGioMs: number): Promise<Response | null> {
  const t = nen.trip;
  const dung = khongConKeHoach(t);
  if (dung) return dung;
  const mo = nen.allocs.filter((a) => a.valid_to_at === null);
  if (!b.suatIds.every((id) => mo.some((a) => a.id === id))) return error(400, "invalid_input", "Suất không thuộc chuyến này hoặc đã rời xe.");
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  if (b.phaLe && !lyDoHopLe(chung, b.phaLe.lyDo, "PHA_LE")) return PHA_LE_KHONG_HOP_LE();
  const cs = chinhSachVao(chung.chinhSach);
  if (!cs) return loi409("chinh_sach_rong", [lyDoGiu("CHINH_SACH_RONG")]);
  const moc = kiemMocXep({ batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms }, bayGioMs, cs.minLeadMinutes, { loai: "RUT" });
  const kq: KetQuaKiem = { ok: !moc.canPhaLe, chan: [], canPhaLe: moc.canPhaLe ? [lyDoGiu("MOC_TOI_THIEU", t.code)] : [] };
  const chan = loiKiem(kq, staff, t.status, { moc: b.phaLe !== null, nghi: true });
  if (chan) return chan;
  const conMo = mo.filter((a) => !b.suatIds.includes(a.id)).map((a) => ({ board: a.board_stop_id, alight: a.alight_stop_id }));
  const maDon = new Map(lich.map((c) => [c.legId, c.orderCode]));
  const phaLe = moc.canPhaLe ? phaLeCua(chung, "MOC_TOI_THIEU", b.phaLe) : null;
  const ds = maDonGon(mo.filter((a) => b.suatIds.includes(a.id) && a.leg_id).map((a) => maDon.get(a.leg_id!) ?? ""));
  const lo = loRut(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), tripId: t.id, version: b.version, suatIds: b.suatIds, diemBoQua: diemKhongConKhach(nen.stops, t.id, conMo), phaLe,
    policyId: chung.chinhSach?.id ?? null, detail: `${t.code}: rút ${b.suatIds.length} người${ds ? ` (${ds})` : ""}${phaLe ? phaLeNhatKy(phaLe.luat, nhanLyDo(chung, phaLe.lyDo)) : ""}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? null : r.res;
}

// ---- Dời sang chuyến khác (route 7 — cổng đôi) -----------------------------------------------------------------------------------------------------------
export async function lenhDoi(
  db: D1Database, nen: NenChuyen, dich: NenChuyen, lich: readonly ChangLichChung[], b: DoiThan, staff: StaffProfile, bayGioMs: number,
): Promise<Response | null> {
  const t = nen.trip;
  const d = dich.trip;
  const dung = khongConKeHoach(t) ?? khongConKeHoach(d);
  if (dung) return dung;
  const mo = nen.allocs.filter((a) => a.valid_to_at === null);
  const di = mo.filter((a) => b.suatIds.includes(a.id));
  if (di.length !== b.suatIds.length) return error(400, "invalid_input", "Suất không thuộc chuyến này hoặc đã rời xe.");
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  if (b.phaLe && !lyDoHopLe(chung, b.phaLe.lyDo, "PHA_LE")) return PHA_LE_KHONG_HOP_LE();
  const cs = chinhSachVao(chung.chinhSach);
  const legIds = [...new Set(di.flatMap((a) => (a.leg_id ? [a.leg_id] : [])))];
  const nc = await docNguCanh(db, dich, lich, chung, legIds);
  const ngoai = legIds.filter((id) => !nc.chang.has(id));
  if (ngoai.length > 0) {
    const flags = await legFlags(db, ngoai);
    return loi409("chang_khong_hop_le", ngoai.map((id) => {
      const f = flags.find((x) => x.id === id);
      return f ? lyDoGiu(lyDoChangNgoai(f), f.order_code ?? undefined) : lyDoGiu("CHANG_KHONG_HOP_LE");
    }));
  }
  // Chuyến nguồn: mốc (DOI_DI). Chuyến đích: luật xếp (DOI_DEN — chặng đặt gấp qua), suất đang mở của chặng TRỪ chính các suất sẽ đóng (L-D1).
  const mocDi = cs ? kiemMocXep({ batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms }, bayGioMs, cs.minLeadMinutes, { loai: "DOI_DI" }).canPhaLe : false;
  const taiDich = dich.allocs.filter((a) => a.valid_to_at === null && (a.status === "WAITING" || a.status === "BOARDED")).length;
  const conMoCuaChang = nc.suatMoCuaChang.filter((s) => !b.suatIds.includes(s.id));
  const kq = kiemXep({
    chuyen: { id: d.id, ma: d.code, trangThai: d.status, batDauMs: d.planned_start_ms, batDauSomNhatMs: d.earliest_start_ms, soCho: nc.chuyen.xe.soCho, tai: taiDich },
    them: legIds.map((legId) => ({
      chang: nc.chang.get(legId)!, soSuatMoi: di.filter((a) => a.leg_id === legId).length,
      personKeys: di.filter((a) => a.leg_id === legId && a.passenger_key).map((a) => a.passenger_key!), suatMoCuaChang: conMoCuaChang,
    })),
    soNguoiDiKemMoi: di.filter((a) => a.kind === "CREW").length, lenh: "DOI_DEN", chinhSach: cs, bayGioMs,
  });
  if (mocDi) kq.canPhaLe.push(lyDoGiu("MOC_TOI_THIEU", t.code));
  kq.ok = kq.chan.length === 0 && kq.canPhaLe.length === 0;
  const chan = loiKiem(kq, staff, d.status, { moc: b.phaLe !== null, nghi: true });
  if (chan) return chan;
  const diemMoiDich: DiemMoi[] = [];
  const cap = di.map((a) => {
    let len: string | null = null;
    let xuong: string | null = null;
    if (a.kind === "PASSENGER" && a.leg_id) {
      const ch = nc.changLich.get(a.leg_id)!;
      len = diemChoKhoa(dich.stops, diemMoiDich, d.id, "PICKUP", ch.khoaNoiDon, ch.noiDonDiemId, ch.noiDon);
      xuong = ch.khoaNoiTra === null ? null : diemChoKhoa(dich.stops, diemMoiDich, d.id, "DROPOFF", ch.khoaNoiTra, ch.noiTraDiemId, ch.noiTra);
    }
    return { dongId: a.id, mo: { id: crypto.randomUUID(), tripId: d.id, loai: a.kind, legId: a.leg_id, personKey: a.passenger_key, crewPartyId: a.crew_party_id, boardStopId: len, alightStopId: xuong } };
  });
  const conMoNguon = mo.filter((a) => !b.suatIds.includes(a.id)).map((a) => ({ board: a.board_stop_id, alight: a.alight_stop_id }));
  // HT-01 (V1.2): sắp lại điểm chưa tới của chuyến ĐÍCH theo suất mở của đích sau lệnh (cũ + suất dời tới).
  const doiThuTuDich = sapLaiDiem(dich.stops, diemMoiDich, d.id, [
    ...dich.allocs.filter((a) => a.valid_to_at === null).map((a) => ({ board: a.board_stop_id, alight: a.alight_stop_id })),
    ...cap.map((c) => ({ board: c.mo.boardStopId, alight: c.mo.alightStopId })),
  ]);
  const phaLe = kq.canPhaLe.length > 0 ? phaLeCua(chung, "MOC_TOI_THIEU", b.phaLe) : null;
  const ds = maDonGon(legIds.map((id) => nc.changLich.get(id)!.orderCode));
  const lo = loDoi(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), nguon: { tripId: t.id, version: b.version }, dich: { tripId: d.id, version: b.denVersion }, cap, diemMoiDich, doiThuTuDich,
    diemBoQuaNguon: diemKhongConKhach(nen.stops, t.id, conMoNguon), phaLe, policyId: chung.chinhSach?.id ?? null,
    detail: `${t.code} → ${d.code}: dời ${di.length} người${ds ? ` (${ds})` : ""}${sapNhatKy(doiThuTuDich)}${phaLe ? phaLeNhatKy(phaLe.luat, nhanLyDo(chung, phaLe.lyDo)) : ""}`,
  });
  const r = await chayLo(db, lo, b.requestId, 2);
  return r.ok ? null : r.res;
}

// ---- Huỷ chuyến (route 8) --------------------------------------------------------------------------------------------------------------------------------
export async function lenhHuy(db: D1Database, nen: NenChuyen, b: HuyThan, staff: StaffProfile, bayGioMs: number): Promise<Response | null> {
  const t = nen.trip;
  const dung = khongConKeHoach(t);
  if (dung) return dung;
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  if (!lyDoHopLe(chung, b.lyDo, "HUY_CHUYEN")) return error(400, "invalid_input", "Lý do huỷ chuyến không có trong danh mục.");
  if (b.phaLe && !lyDoHopLe(chung, b.phaLe.lyDo, "PHA_LE")) return PHA_LE_KHONG_HOP_LE();
  const soMo = nen.allocs.filter((a) => a.valid_to_at === null).length;
  const cs = chinhSachVao(chung.chinhSach);
  const moc = soMo > 0 && cs ? kiemMocXep({ batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms }, bayGioMs, cs.minLeadMinutes, { loai: "HUY_CO_KHACH" }).canPhaLe : false;
  const chan = loiKiem({ ok: !moc, chan: [], canPhaLe: moc ? [lyDoGiu("MOC_TOI_THIEU", t.code)] : [] }, staff, t.status, { moc: b.phaLe !== null, nghi: true });
  if (chan) return chan;
  const phaLe = moc ? phaLeCua(chung, "MOC_TOI_THIEU", b.phaLe) : null;
  // ADR-0057 C4: lô huỷ đảo MỌI dòng chi phí còn hiệu lực (âm → dương) trước câu trạng thái cuối; phiên bản chi phí ở câu cổng (TC-8).
  const cp = await docChiPhiChoLenh(db, { tripId: t.id, chuXe: t.carrier_party_id, homNay: homNay(bayGioMs) });
  const kh = keHoachChiPhiKhiHuy(cp.dong, homNay(bayGioMs));
  const lo = loHuy(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), tripId: t.id, version: b.version, lyDo: b.lyDo, phaLe, policyId: chung.chinhSach?.id ?? null, soSuatMo: soMo,
    chiPhi: kh, phienBanChiPhi: kh.phienBan,
    detail: `${t.code}: huỷ — ${nhanLyDo(chung, b.lyDo)}${soMo > 0 ? ` · còn ${soMo} người` : ""}${phaLe ? phaLeNhatKy(phaLe.luat, nhanLyDo(chung, phaLe.lyDo)) : ""}${chiTietChiPhiNhatKy(kh, t.rented, true, await tenNhaXePhiHuy(db, kh.phiHuyBiDao))}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? null : r.res;
}

// ---- Cập nhật điểm theo đơn (route 40 — ADR-0050 VK1-B, I42) -----------------------------------------------------------------------------------------------
/** Trả số suất đã đổi điểm (0 = không suất nào lệch, không ghi gì) hoặc `Response` khi từ chối. */
export async function lenhCapNhatDiem(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], b: { version: number; requestId: string }, staff: StaffProfile, bayGioMs: number,
): Promise<Response | number> {
  const t = nen.trip;
  const dung = khongConKeHoach(t);
  if (dung) return dung;
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  // Mốc lúc xếp: lệnh DOI_DIEM_THEO_CHANG KHÔNG khoá (không đổi "ai đi xe nào" — ADR-0050 VK1-B); hỏi CHÍNH luật mốc để đổi luật ở một chỗ là đủ.
  const cs = chinhSachVao(chung.chinhSach);
  if (cs && kiemMocXep({ batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms }, bayGioMs, cs.minLeadMinutes, { loai: "DOI_DIEM_THEO_CHANG" }).canPhaLe) {
    return loi409("can_pha_le", [lyDoGiu("MOC_TOI_THIEU", t.code)], { canQuyen: false });
  }
  const nc = await docNguCanh(db, nen, lich, chung);
  const diemMoi: DiemMoi[] = [];
  const cap: { dongId: string; mo: SuatMoi }[] = [];
  const doi: string[] = [];
  const nhanDiem = await tenDiem(db, [...new Set([...nen.stops.flatMap((s) => (s.location_id ? [s.location_id] : [])), ...lich.flatMap((c) => [c.noiDonDiemId, c.noiTraDiemId].filter((x): x is string => x !== null))])]);
  const tenNoiNhatKy = (loc: string | null) => (loc ? (nhanDiem.get(loc) ?? "điểm danh mục") : "nơi tự do");
  for (const a of nen.allocs) {
    if (a.valid_to_at !== null || a.kind !== "PASSENGER" || a.leg_id === null) continue;
    const ch: ChangVao | undefined = nc.chang.get(a.leg_id);
    const lc = nc.changLich.get(a.leg_id);
    if (!ch || !lc) continue; // chặng rơi khỏi lịch: lý do giữ riêng (đơn huỷ / chặng bỏ …) — không "cập nhật điểm" cho khách không còn đi (I38)
    const len = nen.stops.find((s) => s.id === a.board_stop_id);
    const xuong = a.alight_stop_id ? nen.stops.find((s) => s.id === a.alight_stop_id) : undefined;
    const n = noiLechCuaSuat(suatVao(a), len ? diemVao(len) : undefined, xuong ? diemVao(xuong) : undefined, ch);
    if (!n.don && !n.tra) continue;
    const moiLen = n.don ? diemChoKhoa(nen.stops, diemMoi, t.id, "PICKUP", ch.khoaNoiDon, lc.noiDonDiemId, lc.noiDon) : a.board_stop_id;
    const moiXuong = n.tra && ch.khoaNoiTra !== null ? diemChoKhoa(nen.stops, diemMoi, t.id, "DROPOFF", ch.khoaNoiTra, lc.noiTraDiemId, lc.noiTra) : a.alight_stop_id;
    cap.push({ dongId: a.id, mo: { id: crypto.randomUUID(), tripId: t.id, loai: "PASSENGER", legId: a.leg_id, personKey: a.passenger_key, crewPartyId: null, boardStopId: moiLen, alightStopId: moiXuong } });
    if (n.don) doi.push(`${lc.orderCode}: điểm đón ${tenNoiNhatKy(len?.location_id ?? null)} → ${tenNoiNhatKy(lc.noiDonDiemId)}`);
    if (n.tra) doi.push(`${lc.orderCode}: điểm trả ${xuong ? tenNoiNhatKy(xuong.location_id) : "chưa có"} → ${tenNoiNhatKy(lc.noiTraDiemId)}`);
  }
  if (cap.length === 0) return 0;
  const conMo = [
    ...nen.allocs.filter((a) => a.valid_to_at === null && !cap.some((c) => c.dongId === a.id)).map((a) => ({ board: a.board_stop_id, alight: a.alight_stop_id })),
    ...cap.map((c) => ({ board: c.mo.boardStopId, alight: c.mo.alightStopId })),
  ];
  const diemBoQua = diemKhongConKhach(nen.stops, t.id, conMo);
  // HT-01 (V1.2): điểm mới của nơi đổi có thể đứng sau điểm trả dùng lại — sắp lại (điểm sắp bỏ qua không xét).
  const doiThuTu = sapLaiDiem(nen.stops, diemMoi, t.id, conMo, diemBoQua);
  const lo = loCapNhatDiem(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), tripId: t.id, version: b.version, diemMoi, cap, doiThuTu, diemBoQua,
    detail: `${t.code}: ${[...new Set(doi)].join("; ")}${sapNhatKy(doiThuTu)}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? cap.length : r.res;
}

// ---- Cập nhật khách theo đơn (route 41 — R-P29, chủ lần 16; khuôn route 40) ------------------------------------------------------------------------------
/**
 * Máy tự tìm MỌI suất khách mở mang khoá người KHÔNG còn trong đơn (`suatKhachDaDoi` — CÙNG định nghĩa với lý do giữ KHACH_DA_DOI của `kiemXuatBen`, cùng
 * điều kiện chặng `changXetTheoDon`): đóng PASSENGER_CHANGED; mở lại tới số người của chặng (`moLaiSauDoiKhach`), khoá rảnh theo thứ tự (`khoaNguoiRanh` —
 * MỘT luật với I19) hoặc null; điểm hết khách → SKIPPED. Không suất nào đã đổi → 0, KHÔNG ghi (kể cả version cũ — I42). Không khoá theo mốc (máy theo đúng
 * đơn). Nhật ký + sự kiện chỉ SỐ khách, mã đơn — không tên.
 */
export async function lenhCapNhatKhach(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], b: { version: number; requestId: string }, staff: StaffProfile, bayGioMs: number,
): Promise<Response | number> {
  const t = nen.trip;
  const dung = khongConKeHoach(t);
  if (dung) return dung;
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  const cs = chinhSachVao(chung.chinhSach);
  if (cs && kiemMocXep({ batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms }, bayGioMs, cs.minLeadMinutes, { loai: "DOI_KHACH_THEO_DON" }).canPhaLe) {
    return loi409("can_pha_le", [lyDoGiu("MOC_TOI_THIEU", t.code)], { canQuyen: false });
  }
  const nc = await docNguCanh(db, nen, lich, chung);
  const cap: { dongId: string; mo: SuatMoi | null }[] = [];
  const doi: string[] = [];
  const legIds = [...new Set(nc.suat.filter((s) => s.mo && s.loai === "PASSENGER" && s.legId !== null).map((s) => s.legId as string))];
  for (const legId of legIds) {
    const ch = nc.chang.get(legId);
    if (!ch || !changXetTheoDon(ch)) continue;
    const lech = suatKhachDaDoi({ legId, nguoiCuaDon: ch.nguoiCuaDon, suat: nc.suat });
    if (lech.length === 0) continue;
    const soMo = nc.suatMoCuaChang.filter((s) => s.mo && s.legId === legId).length;
    const ranh = khoaNguoiRanh({ legId, nguoiCuaDon: ch.nguoiCuaDon, suatMoCuaChang: nc.suatMoCuaChang });
    const khoa = moLaiSauDoiKhach({ soNguoi: ch.soNguoi, soMoSauDong: soMo - lech.length, soDong: lech.length, ranh });
    lech.forEach((s, i) => cap.push({
      dongId: s.id,
      mo: i < khoa.length
        ? { id: crypto.randomUUID(), tripId: t.id, loai: "PASSENGER", legId, personKey: khoa[i] ?? null, crewPartyId: null, boardStopId: s.boardStopId, alightStopId: s.alightStopId }
        : null,
    }));
    doi.push(`${ch.orderCode}: ${lech.length} khách${khoa.length < lech.length ? ` (bớt ${lech.length - khoa.length} chỗ)` : ""}`);
  }
  if (cap.length === 0) return 0;
  const dong = new Set(cap.map((c) => c.dongId));
  const conMo = [
    ...nen.allocs.filter((a) => a.valid_to_at === null && !dong.has(a.id)).map((a) => ({ board: a.board_stop_id, alight: a.alight_stop_id })),
    ...cap.flatMap((c) => (c.mo ? [{ board: c.mo.boardStopId, alight: c.mo.alightStopId }] : [])),
  ];
  const lo = loCapNhatKhach(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), tripId: t.id, version: b.version, cap, diemBoQua: diemKhongConKhach(nen.stops, t.id, conMo),
    detail: `${t.code}: cập nhật khách theo đơn — ${doi.join("; ")}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? cap.length : r.res;
}

// ---- Lịch chung ngày D (route 1) ---------------------------------------------------------------------------------------------------------------------------
export async function dungLichNgay(
  db: D1Database, ngay: string, trips: readonly TripRow[], lich: { chang: readonly ChangLichChung[]; nhap: readonly ChangNhapLichChung[] },
  nhanNhanVien: (ids: readonly string[]) => Promise<Map<string, string> | null>, bayGioMs: number, xemNhapChoDatGap: boolean,
): Promise<LichChungResponse> {
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  const ids = trips.map((t) => t.id);
  const [stops, allocs, events] = await Promise.all([stopsByTrips(db, ids), allocsByTrips(db, ids), eventsByTrips(db, ids)]);
  const legTrip = [...new Set(allocs.flatMap((a) => (a.kind === "PASSENGER" && a.leg_id ? [a.leg_id] : [])))];
  const changNgay = lich.chang.filter((c) => c.pickupDate === ngay || legTrip.includes(c.legId));
  const thieu = legTrip.filter((id) => !changNgay.some((c) => c.legId === id));
  const allLegs = [...new Set([...changNgay.map((c) => c.legId), ...legTrip])];
  const minStart = Math.min(Date.parse(`${ngay}T00:00:00+07:00`), ...trips.map((t) => t.planned_start_ms));
  const maxEnd = Math.max(Date.parse(`${ngay}T23:59:59+07:00`), ...trips.map((t) => t.planned_end_ms));
  // ADR-0055 VK2-A A4: dải bận của ngày D — khoảng chặn bằng nửa đêm VN [00:00 D, 00:00 D+1) (Review Focus 1), KHÔNG nửa đêm UTC.
  const tuNgayMs = vnLocalToMs(ngay, "00:00")!;
  const denNgayMs = vnLocalToMs(addDays(ngay, 1), "00:00")!;
  const [flags, moCuaChang, khac, khungBan] = await Promise.all([
    legFlags(db, thieu), allocsOpenByLegs(db, allLegs), tripsTouching(db, minStart - NGAY_MS, maxEnd + NGAY_MS), khungBanXeTrongKhoang(db, tuNgayMs, denNgayMs),
  ]);
  const xeIds = [...new Set([...trips.map((t) => t.vehicle_id), ...khungBan.map((k) => k.vehicle_id)])];
  await boSungXe(db, chung, xeIds);
  const chuyen = trips.map((t) => chuyenVao(t, xeVao(chung.xe.find((x) => x.id === t.vehicle_id)!, chung.giayToXe), t.driver_party_id ? taiXeVao(t.driver_party_id, chung.taiXe) : null));
  const khacNgoai = khac.filter((t) => !ids.includes(t.id));
  const ra = dungLichChung({
    chang: changNgay.map(changVao),
    changNgoai: flags.map((f) => ({ legId: f.id, orderCode: f.order_code ?? "", lyDo: lyDoChangNgoai(f) })),
    nhap: lich.nhap.filter((n) => n.pickupDate === ngay).map((n) => ({ legId: n.legId, orderId: n.orderId, orderCode: n.orderCode, ngayDon: n.pickupDate, gioDon: n.pickupTime, datGap: n.datGap })),
    chuyen,
    suat: [...allocs.map(suatVao), ...moCuaChang.filter((a) => !ids.includes(a.trip_id)).map(suatVao)],
    diem: stops.map(diemVao),
    chuyenKhac: khacNgoai.map(khungChuyen),
    chinhSach: chinhSachVao(chung.chinhSach), hangBang: chung.hangBang, dieuKien: chung.dieuKien, bayGioMs,
  });
  const nhan = await nhanNhanVien([...new Set(events.flatMap((e) => (e.created_by && e.occurred_source === "VAN_PHONG_KHAI" ? [e.created_by] : [])))]);
  const tripTheoId = new Map([...trips, ...khacNgoai].map((t) => [t.id, t]));
  const moTatCa = [...allocs, ...moCuaChang.filter((a) => !ids.includes(a.trip_id))];
  return {
    ngay,
    mocToiThieuPhut: chung.chinhSach?.min_lead_minutes ?? null,
    canhBaoPhut: chung.chinhSach?.warn_lead_minutes ?? null,
    chang: ra.chang.map((x) => changLichDto(changNgay.find((c) => c.legId === x.chang.legId)!, x.trangThai, moTatCa, tripTheoId)),
    chuyen: trips.map((t) => chuyenTomTat(t, {
      xe: chung.xe.find((x) => x.id === t.vehicle_id), chung, stops, allocs, events, lyDoGiu: ra.chuyen.find((c) => c.id === t.id)?.lyDoGiu ?? [], nhan, bayGioMs,
    })),
    soNhap: ra.soNhap,
    nhapChoDatGap: xemNhapChoDatGap ? ra.nhapChoDatGap.map((n) => ({ legId: n.legId, orderId: n.orderId, maDon: n.orderCode, ngayDon: n.ngayDon ?? ngay, gioDon: n.gioDon })) : [],
    canhBao: ra.canhBao.map(canhBaoDto),
    lyDo: lyDoDangDung(chung),
    xe: xeChon(chung),
    taiXe: taiXeChon(chung),
    khungBanXe: khungBan.map((k) => ({
      id: k.id, xeId: k.vehicle_id, bienSo: chung.xe.find((x) => x.id === k.vehicle_id)?.plate_number ?? "", batDau: new Date(k.start_ms).toISOString(), ketThuc: new Date(k.end_ms).toISOString(), lyDo: k.reason_label,
    })),
  };
}
