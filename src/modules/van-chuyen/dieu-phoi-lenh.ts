// CÁC LỆNH KẾ HOẠCH của chuyến xe (Task A13; kế hoạch mục 1.5, 1.7 route 4–8, 40): đọc (vc_ + chính sách + tài xế) → luật thuần (`kiemTaoSuaChuyen`, `kiemXep`,
// `kiemMocXep`, `noiLechCuaSuat`) → dựng lô (dieu-phoi.ts) → chạy (`chayLo`). Trả `Response` khi từ chối, `null` / số khi đã ghi. KHÔNG gọi hàm hẹp của orders:
// chặng (`lichChungChang`) do thân route đọc sau `can()` và truyền vào (bài src/orders-cong-bo.test.ts).
import type { ChangChoChuyen, ChangLichChung, ChangNhapLichChung } from "../orders";
import type { StaffProfile } from "../../shared/contracts";
import { changXetTheoDon, khoaNguoiRanh, kiemTaoSuaChuyen, kiemXep, moLaiSauDoiKhach, noiLechCuaSuat, suatKhachDaDoi, tenLucXep } from "../../shared/dieu-phoi-kiem";
import { kiemCamKet, type KetQuaCamKet } from "../../shared/cam-ket-xe";
import type { ChangVao, KetQuaKiem, MaLuatPhaLe } from "../../shared/dieu-phoi-kieu";
import type { CanhBaoGioLai } from "../../shared/gio-lai";
import { dungLichChung } from "../../shared/dieu-phoi-lich-chung";
import { error } from "../../shared/http";
import { lyDoGiu, type LyDoGiu } from "../../shared/ly-do-giu";
import { batDauSomNhatSauDoiGio, gioXetMocXep, gioXetSuaChuyen, kiemMocXep, lopVuotNghiCamKet, type LenhVuotMoc } from "../../shared/moc-toi-thieu";
import { addDays, msToVnLocal, vnLocalToMs } from "../../shared/vn-date";
import { khungBanXeTrongKhoang } from "./khung-ban-repo";
import type { LichChungResponse } from "../../shared/contracts";
import { allocsByTrips, allocsOpenByLegs, eventsByTrips, legFlags, stopsByTrips, tenDiem, tripsTouching, type TripRow } from "./chuyen-repo";
import {
  loBaoHuy, loBoSungTen, loCapNhatDiem, loCapNhatKhach, loDoi, loHuy, loRut, loSuaChuyen, loThemDiemDangChay, loXep, type CamKetLo, type DiemMoi, type PhaLe, type SuatMoi,
} from "./dieu-phoi";
import {
  boSungXe, changVao, chinhSachVao, chuyenVao, diemVao, docChung, docNguCanh, khungBanVao, khungChuyen, lyDoChangNgoai, suatVao, taiXeVao, xeVao, type DuLieuChung, type NenChuyen,
} from "./dieu-phoi-doc";
import { canhBaoDto, changLichDto, chuyenTomTat, lyDoDangDung, taiXeChon, xeChon } from "./dieu-phoi-dto";
import {
  chanCoVuot, chanDaoMoi, chayLo, diemChoKhoa, diemKhongConKhach, sapLaiDiem, gioKhanCapNhatKy, gioNgan, loi409, loiKiem, lyDoHopLe, maDonGon, nhanLyDo, phaLeNhatKy, vuotLenh,
  type QuyenVuot, type VuotLenh,
} from "./dieu-phoi-route";
import type { BaoHuyThan, DoiThan, HuyThan, RutThan, SuaChuyenThan, XepThan } from "./dieu-phoi-than";
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
const phaLeCua = (chung: DuLieuChung, luat: MaLuatPhaLe, p: { lyDo: string } | null): PhaLe | null =>
  p ? { luat, lyDo: p.lyDo, policyId: chung.chinhSach?.id ?? null } : null;
/**
 * ADR-0056 VK3-A (kế hoạch C6–C8): cột phá lệ cam kết của MỘT chuyến sau lệnh. `ck` = `kiemCamKet` trên chuyến SAU lệnh (vi phạm kể cả đã phá lệ); `p` =
 * cờ vượt cam kết người gọi gửi (lệnh đã đòi ô theo lớp — `chanCoVuot`, ADR-0104 Đ1; lý do đã kiểm nhóm PHA_LE). Ghi khi còn vi phạm CHƯA phá lệ và có `p`; xoá khi hết vi phạm
 * mà cột đang có; còn lại không chạm (C8: gửi khi không vi phạm → bỏ qua; khoá đã khớp → giữ lần phá lệ cũ). `phaLe` = phá lệ CAM_KET để ghi lên sự kiện khi
 * lệnh không có phá lệ ưu tiên hơn (C6: MOC_TOI_THIEU > KHOANG_NGHI > CAM_KET). `nhatKy` = đoạn nối vào `detail` — KHÔNG BAO GIỜ có khoá (C4).
 */
function camKetSauLenh(
  chung: DuLieuChung, ck: KetQuaCamKet, khoaDangLuu: string | null, p: { lyDo: string } | null, v: VuotLenh | null,
): { lo: CamKetLo | null; phaLe: PhaLe | null; nhatKy: string } {
  // ADR-0104 Đ1 mục 4: đuôi theo lớp lúc ghi (`v` — ngữ cảnh lớp của lệnh; lệnh chỉ giảm khách truyền null cùng p null, không bao giờ ghi mới).
  if (ck.khoa !== null && !ck.daPhaLe && p && v) return { lo: { lyDo: p.lyDo, khoa: ck.khoa }, phaLe: phaLeCua(chung, "CAM_KET", p), nhatKy: phaLeNhatKy("CAM_KET", nhanLyDo(chung, p.lyDo), v) };
  if (ck.khoa === null && khoaDangLuu !== null) return { lo: { lyDo: null, khoa: null }, phaLe: null, nhatKy: " · hết vi phạm cam kết — bỏ phá lệ cam kết" };
  return { lo: null, phaLe: null, nhatKy: "" };
}
/** Trạng thái không còn lập kế hoạch → 409 theo trạng thái (LC-15 / LC-06 lớp route). */
function khongConKeHoach(t: TripRow): Response | null {
  if (t.status === "PLANNED") return null;
  return loi409(t.status === "RUNNING" ? "xe_dang_chay" : "chuyen_da_ket_thuc", [lyDoGiu("CHUYEN_KHONG_CON_LEN_KE_HOACH", t.code)]);
}
/**
 * ADR-0104 Đ1 mục 0: ngữ cảnh lớp theo giờ xét mốc lúc xếp (`gioXetMocXep` — khoá dính) — định nghĩa "dưới mốc" của xếp, rút, huỷ, thêm khách khi xe chạy và
 * chuyến ĐÍCH của dời. Xe đang chạy luôn dưới mốc; không có chính sách → ngoài mốc.
 */
const vuotXep = (t: TripRow, chung: DuLieuChung, bayGioMs: number, lenhMoc: readonly LenhVuotMoc[], quyenVuot: QuyenVuot): VuotLenh =>
  vuotLenh(
    { dangChay: t.status === "RUNNING", gioXetMs: gioXetMocXep({ batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms }) }, bayGioMs,
    chung.chinhSach?.min_lead_minutes ?? null, lenhMoc, quyenVuot,
  );
/** Đuôi nhật ký khi lệnh sắp lại thứ tự điểm (HT-01) — chỉ con số (danh sách trắng mục 1.1). */
const sapNhatKy = (doi: readonly unknown[]): string => (doi.length > 0 ? `; sắp lại thứ tự ${doi.length} điểm (đón trước trả)` : "");
const lenhChung = (requestId: string, staff: StaffProfile, bayGioMs: number) => ({ cmd: crypto.randomUUID(), requestId, lucIso: nowIsoOf(bayGioMs), nguoiId: staff.id });
/**
 * ADR-0056 VK3-A: chặng có suất KHÁCH MỞ trên chuyến (trước lệnh) — MỘT định nghĩa với `kiemXuatBen` (mở + PASSENGER + có chặng), giao với chặng đã đọc qua
 * `lichChungChang`. Chặng rơi khỏi lịch (đơn huỷ, chặng bỏ…) không có dữ liệu cam kết và đã có lý do giữ riêng ⇒ bỏ qua.
 */
function changTrenChuyen(nen: NenChuyen, chang: ReadonlyMap<string, ChangVao>): ChangVao[] {
  return changCuaLeg(legKhachMo(nen.allocs), chang);
}
/** Chặng có suất KHÁCH MỞ (mở + PASSENGER + có chặng) — MỘT định nghĩa cho mọi nơi gọi luật cam kết. */
const legKhachMo = (allocs: NenChuyen["allocs"]): string[] =>
  allocs.flatMap((a) => (a.valid_to_at === null && a.kind === "PASSENGER" && a.leg_id !== null ? [a.leg_id] : []));
function changCuaLeg(legIds: readonly string[], chang: ReadonlyMap<string, ChangVao>): ChangVao[] {
  const ids = [...new Set(legIds)];
  return ids.flatMap((id) => {
    const c = chang.get(id);
    return c ? [c] : [];
  });
}

// ---- Sửa chuyến (route 4) ---------------------------------------------------------------------------------------------------------------------------------
/** `ra.nhacGioLai` (tuỳ chọn): nhắc giờ lái của chuyến sau sửa (ADR-0055 VK2-B B3 — chỉ nhắc); route gắn vào phản hồi `canhBaoLenh`. */
export async function lenhSuaChuyen(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], b: SuaChuyenThan, staff: StaffProfile, bayGioMs: number, quyenVuot: QuyenVuot,
  ra?: { nhacGioLai?: CanhBaoGioLai[] },
): Promise<Response | null> {
  const t = nen.trip;
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  const xeId = b.xeId ?? t.vehicle_id;
  const taiXeId = b.taiXePartyId ?? t.driver_party_id;
  const batDauMs = b.batDauMs ?? t.planned_start_ms;
  // ADR-0104 Đ1 mục 0: "dưới mốc" của lệnh sửa = giờ xét min(cũ, mới, sớm nhất) — CÙNG phép luật khoá đổi xe / đổi tài xế (chủ 2026-10-08 "Cho qua, tính là sát
  // giờ": dời giờ vào mốc trong cùng lệnh thì lệnh đó là sát giờ). Lệnh mốc = đổi xe / đổi tài xế.
  const lenhMoc: LenhVuotMoc[] = [...(xeId !== t.vehicle_id ? (["DOI_XE"] as const) : []), ...(taiXeId !== t.driver_party_id ? (["DOI_TAI_XE"] as const) : [])];
  const vuot = vuotLenh(
    { dangChay: t.status === "RUNNING", gioXetMs: gioXetSuaChuyen(t.planned_start_ms, batDauMs, t.earliest_start_ms) }, bayGioMs, chung.chinhSach?.min_lead_minutes ?? null, lenhMoc, quyenVuot,
  );
  const cam = chanCoVuot({ moc: b.phaLe !== null, nghiCamKet: b.nghiPhaLe !== null || b.camKetPhaLe !== null }, vuot);
  if (cam) return cam;
  if ([b.phaLe, b.nghiPhaLe, b.camKetPhaLe].some((p) => p && !lyDoHopLe(chung, p.lyDo, "PHA_LE"))) return PHA_LE_KHONG_HOP_LE();
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
  // ADR-0096 Đ1.3b/c (gói A1): đổi thứ tự điểm của chuyến KẾ HOẠCH (nút ↑ ↓ của văn phòng đi qua lệnh này) không được làm khách chờ lên bị đảo MỚI — cùng
  // luật với đổi thứ tự khi đang chạy (`chanDaoMoi`). Thứ tự đảo từ trước vẫn sửa dần được.
  const dao = await chanDaoMoi(db, nen.stops, nen.allocs, b.diem.map((d) => ({ id: d.id, seq: d.thuTu })));
  if (dao) return dao;
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
  const changCamKet = changTrenChuyen(nen, new Map(lich.map((c) => [c.legId, changVao(c)])));
  const doiGio = batDauMs !== t.planned_start_ms;
  const doiKetThuc = ketThucMs !== t.planned_end_ms;
  const doiTaiXe = taiXeId !== t.driver_party_id && taiXeId !== null;
  // N3 (báo cáo ERP 2026-10-07; đặc tả 2026-09-29 CH-02 "tạo/sửa chuyến, gán tài xế; chụp vào rest_minutes_snapshot"): lệnh đổi giờ (bắt đầu hoặc kết thúc), xe
  // hoặc tài xế CHỤP LẠI khoảng nghỉ của chính sách HIỆN HÀNH (cùng chỗ lệnh tạo đọc); lệnh khác giữ số đã chụp. Luật kiểm xét khoảng nghỉ theo ĐÚNG số sẽ ghi —
  // cổng xuất bến đọc lại số này (`ChuyenVao.nghiChup`), nên kiểm lúc sửa và xuất bến dùng một con số.
  const nghiChup = doiGio || doiKetThuc || doiXe || doiTaiXe ? (chung.chinhSach?.rest_minutes ?? t.rest_minutes_snapshot) : t.rest_minutes_snapshot;
  const cs = chinhSachVao(chung.chinhSach);
  const kq = kiemTaoSuaChuyen({
    lenh: "SUA",
    chuyen: { id: t.id, batDauMs, ketThucMs, xe: xeVao(xeRow, chung.giayToXe), taiXe: taiXeId ? taiXeVao(taiXeId, chung.taiXe) : null, nghiPhaLe: b.nghiPhaLe !== null || t.rest_override_reason_code !== null },
    cu: { batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms, xeId: t.vehicle_id, taiXePartyId: t.driver_party_id, trangThai: t.status },
    taiTrenChuyen: tai, chuyenKhac: khac.map(khungChuyen), khungBan, chinhSach: cs ? { ...cs, restMinutes: nghiChup } : null, hangBang: chung.hangBang, bayGioMs,
    // ADR-0056 VK3-A: đổi xe → cam kết của khách đang trên chuyến xét lại với xe mới (luật thuần chỉ CHẶN khi đổi xe).
    camKet: doiXe ? { changTrenChuyen: changCamKet, khoaDaPhaLe: t.commitment_override_key } : undefined,
  });
  const chan = loiKiem(kq, vuot, t.status, { moc: b.phaLe !== null, nghi: b.nghiPhaLe !== null || t.rest_override_reason_code !== null, camKet: b.camKetPhaLe !== null });
  if (chan) return chan;
  if (ra) ra.nhacGioLai = kq.nhacGioLai;
  const diemDoi = b.diem.filter((d) => {
    const s = nen.stops.find((x) => x.id === d.id)!;
    return s.seq !== d.thuTu || s.planned_date !== (d.gioXeToi?.ngay ?? null) || s.planned_time !== (d.gioXeToi?.gio ?? null);
  });
  // ADR-0056 VK3-A (khuôn nghiPhaLe): không đổi xe thì cam kết KHÔNG chặn, nhưng vẫn kiểm trên xe hiện tại — đường để Quản trị phá lệ vi phạm sinh ra do SỬA
  // ĐƠN (thân chỉ có camKetPhaLe), và để lệnh thấy hết vi phạm thì xoá cột.
  const camKetKq = kq.camKet ?? kiemCamKet({ xe: { id: xeId, soCho: xeRow.passenger_capacity }, chang: changCamKet, khoaDaPhaLe: t.commitment_override_key });
  const ck = camKetSauLenh(chung, camKetKq, t.commitment_override_key, b.camKetPhaLe, vuot);
  const ghiCamKet = ck.lo !== null && ck.lo.khoa !== null;
  if (!doiGio && !doiKetThuc && !doiXe && !doiTaiXe && !doiTuyen && diemDoi.length === 0 && !b.nghiPhaLe && !ghiCamKet) return null; // không đổi gì — không ghi
  // R-P6 + R-P7: giờ sớm nhất sau khi đổi giờ — MỘT luật (`batDauSomNhatSauDoiGio`, mốc của chính sách HIỆN HÀNH lúc sửa); không đổi giờ thì giữ.
  const phut = chung.chinhSach?.min_lead_minutes ?? 0;
  const somNhat = doiGio ? batDauSomNhatSauDoiGio({ batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms }, batDauMs, bayGioMs, phut) : Math.min(t.earliest_start_ms, batDauMs);
  const phaLe = kq.canPhaLe.some((l) => l.ma === "MOC_TOI_THIEU") ? phaLeCua(chung, "MOC_TOI_THIEU", b.phaLe) : kq.canPhaLe.some((l) => l.ma === "KHOANG_NGHI") ? phaLeCua(chung, "KHOANG_NGHI", b.nghiPhaLe) : null;
  const thay: string[] = [];
  if (doiXe) thay.push(`xe ${chung.xe.find((x) => x.id === t.vehicle_id)?.plate_number ?? "?"} → ${xeRow.plate_number}`);
  if (doiTaiXe) thay.push("đổi tài xế");
  if (doiGio || doiKetThuc) thay.push(`giờ ${gioNgan(t.planned_start_ms, bayGioMs)}–${gioNgan(t.planned_end_ms, bayGioMs)} → ${gioNgan(batDauMs, bayGioMs)}–${gioNgan(ketThucMs, bayGioMs)}`);
  if (diemDoi.length > 0) thay.push(`${diemDoi.length} điểm đổi thứ tự / giờ xe tới`);
  if (doiTuyen) thay.push(`tuyến ${await tenTuyen(db, t.route_code)} → ${await tenTuyen(db, tuyenMoi)}`);
  // ADR-0104 Đ1 mục 4 ("mọi luật bị vượt"): cờ khoảng nghỉ gửi kèm luôn ghi lý do vào cột `rest_override_reason_code` (lô bên dưới) nhưng KHÔNG lên sự kiện
  // (luật thuần nhận cờ nên không báo KHOANG_NGHI còn thiếu) — đuôi nhật ký ghi theo cột đó để nhật ký có đủ luật bị vượt. Sự kiện không đổi (lệch Đ1.5 ca 3).
  const nghiNhatKy = b.nghiPhaLe && phaLe?.luat !== "KHOANG_NGHI" ? phaLeNhatKy("KHOANG_NGHI", nhanLyDo(chung, b.nghiPhaLe.lyDo), vuot) : "";
  const lo = loSuaChuyen(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), tripId: t.id, version: b.version,
    moi: {
      xeId, chuXePartyId: xeRow.owner_party_id, ngayChay: ngayChayMoi, batDauMs, ketThucMs, batDauSomNhatMs: somNhat, nghiPhaLeLyDo: b.nghiPhaLe?.lyDo ?? t.rest_override_reason_code,
      thue, tuyen: tuyenMoi, nghiChup,
    },
    chiPhi: kh.kh, phienBanChiPhi: kh.kh.phienBan,
    doiTaiXe: doiTaiXe ? taiXeId : null,
    diem: diemDoi.map((d) => ({ id: d.id, seq: d.thuTu, ngayXeToi: d.gioXeToi?.ngay ?? null, gioXeToi: d.gioXeToi?.gio ?? null })),
    phaLe: phaLe ?? ck.phaLe, policyId: chung.chinhSach?.id ?? null, camKet: ck.lo,
    detail: `${t.code}: ${thay.join("; ") || `${lopVuotNghiCamKet(vuot.duoiMoc) === "KHAN_CAP" ? "điều chỉnh khẩn cấp" : "phá lệ"} ${b.nghiPhaLe ? "khoảng nghỉ" : "cam kết"}`}${phaLe ? phaLeNhatKy(phaLe.luat, nhanLyDo(chung, phaLe.lyDo), vuot) : ""}${nghiNhatKy}${ck.nhatKy}${gioKhanCapNhatKy([phaLe?.luat, nghiNhatKy ? "KHOANG_NGHI" : null, ck.phaLe?.luat], vuot)}${chiTietChiPhiNhatKy(kh.kh, thue, false, await tenNhaXePhiHuy(db, kh.kh.phiHuyBiDao))}`,
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
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], b: XepThan, staff: StaffProfile, bayGioMs: number, quyenVuot: QuyenVuot,
): Promise<{ loi: Response | null; canhBao: LyDoGiu[] }> {
  const ra = await lenhXepLo(db, nen, lich, b, staff, bayGioMs, quyenVuot);
  return ra instanceof Response || ra === null ? { loi: ra, canhBao: [] } : ra;
}
async function lenhXepLo(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], b: XepThan, staff: StaffProfile, bayGioMs: number, quyenVuot: QuyenVuot,
): Promise<Response | null | { loi: Response | null; canhBao: LyDoGiu[] }> {
  const t = nen.trip;
  const dung = khongConKeHoach(t);
  if (dung) return dung;
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  const vuot = vuotXep(t, chung, bayGioMs, ["XEP"], quyenVuot);
  const cam = chanCoVuot({ moc: b.phaLe !== null, nghiCamKet: b.camKetPhaLe !== null }, vuot);
  if (cam) return cam;
  if ([b.phaLe, b.camKetPhaLe].some((p) => p && !lyDoHopLe(chung, p.lyDo, "PHA_LE"))) return PHA_LE_KHONG_HOP_LE();
  const nc = await docNguCanh(db, nen, lich, chung, b.chang.map((c) => c.legId));
  const ngoai = await loiChangNgoai(db, nc, b.chang.map((c) => c.legId));
  if (ngoai) return ngoai;
  const kq = kiemXep(kiemXepVao(nen, nc, b, chung, bayGioMs, "XEP"));
  const chan = loiKiem(kq, vuot, t.status, { moc: b.phaLe !== null, nghi: true, camKet: b.camKetPhaLe !== null });
  if (chan) return chan;
  const diemMoi: DiemMoi[] = [];
  const suatMoi = suatTheoChang(nen, nc, b.chang, diemMoi);
  for (const p of b.nguoiDiKem) suatMoi.push({ id: crypto.randomUUID(), tripId: t.id, loai: "CREW", legId: null, personKey: null, crewPartyId: p, boardStopId: null, alightStopId: null });
  // HT-01 (V1.2): điểm trả dùng lại có thể đứng trước điểm đón mới → sắp lại điểm chưa tới theo MỌI suất mở sau lệnh (cũ + mới).
  const doiThuTu = sapLaiDiem(nen.stops, diemMoi, t.id, [
    ...nen.allocs.filter((a) => a.valid_to_at === null).map((a) => ({ board: a.board_stop_id, alight: a.alight_stop_id })),
    ...suatMoi.map((s) => ({ board: s.boardStopId, alight: s.alightStopId })),
  ]);
  // C6: sự kiện mang phá lệ MỐC nếu có, không thì CAM_KET; cột chuyến luôn mang dấu cam kết; nhật ký có đoạn cho TỪNG phá lệ.
  const phaLe = kq.canPhaLe.some((l) => l.ma === "MOC_TOI_THIEU") ? phaLeCua(chung, "MOC_TOI_THIEU", b.phaLe) : null;
  const ck = camKetSauLenh(chung, kq.camKet, t.commitment_override_key, b.camKetPhaLe, vuot);
  const ma = maDonGon(b.chang.map((c) => nc.changLich.get(c.legId)!.orderCode));
  const lo = loXep(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), tripId: t.id, version: b.version, diemMoi, doiThuTu, suatMoi, phaLe: phaLe ?? ck.phaLe, policyId: chung.chinhSach?.id ?? null,
    mocXep: mocXepCua(nc, b.chang), camKet: ck.lo,
    detail: `${t.code}: xếp ${suatMoi.length} người${ma ? ` (${ma})` : ""}${sapNhatKy(doiThuTu)}${phaLe ? phaLeNhatKy(phaLe.luat, nhanLyDo(chung, phaLe.lyDo), vuot) : ""}${ck.nhatKy}${gioKhanCapNhatKy([phaLe?.luat, ck.phaLe?.luat], vuot)}`,
  });
  try {
    const r = await chayLo(db, lo, b.requestId);
    return { loi: r.ok ? null : r.res, canhBao: r.ok ? kq.canhBao : [] };
  } catch (e) {
    if (e instanceof Error && /FOREIGN KEY constraint failed/.test(e.message)) return error(400, "invalid_input", "Người đi kèm không có trong hồ sơ.");
    throw e;
  }
}

type NguCanh = Awaited<ReturnType<typeof docNguCanh>>;
/** Chặng không có trong lichChungChang (đơn nháp / đã huỷ / chặng đóng / ngoài khoảng ngày) → 409 lý do CỤ THỂ theo cờ view (I38), không đoán. */
async function loiChangNgoai(db: D1Database, nc: NguCanh, legIds: readonly string[]): Promise<Response | null> {
  const ngoai = legIds.filter((id) => !nc.chang.has(id));
  if (ngoai.length === 0) return null;
  const flags = await legFlags(db, ngoai);
  return loi409("chang_khong_hop_le", ngoai.map((id) => {
    const f = flags.find((x) => x.id === id);
    return f ? lyDoGiu(lyDoChangNgoai(f), f.order_code ?? undefined) : lyDoGiu("CHANG_KHONG_HOP_LE");
  }));
}
/** Dữ liệu vào `kiemXep` cho lệnh đưa chặng vào xe (Xếp — chuyến PLANNED; THEM_KHI_CHAY — xe đang chạy, ADR-0052 D5.1). */
function kiemXepVao(nen: NenChuyen, nc: NguCanh, b: XepThan, chung: DuLieuChung, bayGioMs: number, lenh: "XEP" | "THEM_KHI_CHAY") {
  const t = nen.trip;
  const tai = nen.allocs.filter((a) => a.valid_to_at === null && (a.status === "WAITING" || a.status === "BOARDED")).length;
  return {
    chuyen: { id: t.id, ma: t.code, trangThai: t.status, batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms, soCho: nc.chuyen.xe.soCho, tai },
    them: b.chang.map((c) => ({ chang: nc.chang.get(c.legId)!, soSuatMoi: c.soSuat, personKeys: c.personKeys, suatMoCuaChang: nc.suatMoCuaChang })),
    soNguoiDiKemMoi: b.nguoiDiKem.length, lenh, chinhSach: chinhSachVao(chung.chinhSach), bayGioMs,
    // ADR-0056 VK3-A: cam kết trên chuyến (xếp và thêm khi xe đang chạy — mọi đường đưa khách lên xe xét cùng luật).
    changTrenChuyen: changTrenChuyen(nen, nc.chang), xeId: nc.chuyen.xe.id, camKetPhaLeKhoa: nc.chuyen.camKetPhaLeKhoa,
  };
}
/** ADR-0051: mốc giờ hẹn của từng chặng đưa vào xe (câu chụp chỉ ghi khi chặng CHƯA có mốc). */
const mocXepCua = (nc: NguCanh, chang: XepThan["chang"]) =>
  chang.map((c) => {
    const ch = nc.changLich.get(c.legId)!;
    return { legId: c.legId, ngay: ch.pickupDate, gio: ch.pickupTime };
  });
/** Suất khách mới của các chặng đưa vào xe (điểm theo khoá nơi — `diemChoKhoa` đẩy điểm mới vào `diemMoi`). */
function suatTheoChang(nen: NenChuyen, nc: NguCanh, chang: XepThan["chang"], diemMoi: DiemMoi[]): SuatMoi[] {
  const t = nen.trip;
  const suatMoi: SuatMoi[] = [];
  // I19(a) (làm bù theo kiểm độc lập K2c VỪA-1): khoá thân gửi trước, phần còn lại máy lấp bằng khoá người RẢNH theo thứ tự — MỘT luật với lúc xuất bến
  // (I19b, `khoaNguoiRanh`): hành khách hiện hành của đơn, chưa có suất mở ở chặng (mọi chuyến). "Chưa bị chính lô này dùng": mỗi chặng xuất hiện MỘT lần
  // trong thân (`docXep` → 400 "Một chặng xuất hiện hai lần") và `tenLucXep` không lặp khoá trong một chặng. Hết khoá rảnh → null (I19b bù lúc xuất bến).
  for (const c of chang) {
    const ch = nc.changLich.get(c.legId)!;
    const len = diemChoKhoa(nen.stops, diemMoi, t.id, "PICKUP", ch.khoaNoiDon, ch.noiDonDiemId, ch.noiDon);
    const xuong = ch.khoaNoiTra === null ? null : diemChoKhoa(nen.stops, diemMoi, t.id, "DROPOFF", ch.khoaNoiTra, ch.noiTraDiemId, ch.noiTra);
    const ranh = khoaNguoiRanh({ legId: c.legId, nguoiCuaDon: nc.chang.get(c.legId)!.nguoiCuaDon, suatMoCuaChang: nc.suatMoCuaChang });
    for (const personKey of tenLucXep({ soSuat: c.soSuat, personKeys: c.personKeys, ranh })) {
      suatMoi.push({ id: crypto.randomUUID(), tripId: t.id, loai: "PASSENGER", legId: c.legId, personKey, crewPartyId: null, boardStopId: len, alightStopId: xuong });
    }
  }
  return suatMoi;
}

// ---- Thêm điểm / khách khi xe ĐANG CHẠY (Đợt 5 — ADR-0052 D5.1) ----------------------------------------------------------------------------------------------
const MOC_THEM_KHI_CHAY = "Khách không đặt gấp — cần điều chỉnh khẩn cấp kèm lý do."; // xe đang chạy luôn dưới mốc ⇒ lớp KHAN_CAP (ADR-0104 Đ1)
/**
 * Văn phòng đưa chặng của đơn đã xác nhận vào xe ĐANG CHẠY: cùng luật xếp (`kiemXep` lệnh THEM_KHI_CHAY — số người chặng, số chỗ, tên; mốc như dòng Xếp với
 * xe luôn trong mốc). Điểm mới mang cờ `added_while_running`, suất mang cờ `added_after_departure`; suất CÓ tên vào bản chốt (dòng hành khách hiện hành từ
 * `hk` — thân route đọc sau `can()`). Chuyến chưa chạy → 409 (dùng Xếp); đã kết thúc → 409.
 */
export async function lenhThemDiemDangChay(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], hk: readonly ChangChoChuyen[], b: XepThan, staff: StaffProfile, bayGioMs: number, quyenVuot: QuyenVuot,
): Promise<Response | null> {
  const t = nen.trip;
  const dung = khongDangChay(t);
  if (dung) return dung;
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  const vuot = vuotXep(t, chung, bayGioMs, ["THEM_KHI_CHAY"], quyenVuot);
  const cam = chanCoVuot({ moc: b.phaLe !== null, nghiCamKet: b.camKetPhaLe !== null }, vuot);
  if (cam) return cam;
  if ([b.phaLe, b.camKetPhaLe].some((p) => p && !lyDoHopLe(chung, p.lyDo, "PHA_LE"))) return PHA_LE_KHONG_HOP_LE();
  const nc = await docNguCanh(db, nen, lich, chung, b.chang.map((c) => c.legId));
  const ngoai = await loiChangNgoai(db, nc, b.chang.map((c) => c.legId));
  if (ngoai) return ngoai;
  const kq = kiemXep(kiemXepVao(nen, nc, b, chung, bayGioMs, "THEM_KHI_CHAY"));
  const chan = loiKiem(kq, vuot, t.status, { moc: b.phaLe !== null, nghi: true, camKet: b.camKetPhaLe !== null }, MOC_THEM_KHI_CHAY);
  if (chan) return chan;
  const diemMoi: DiemMoi[] = [];
  const suatMoi = suatTheoChang(nen, nc, b.chang, diemMoi);
  const doiThuTu = sapLaiDiem(nen.stops, diemMoi, t.id, [
    ...nen.allocs.filter((a) => a.valid_to_at === null).map((a) => ({ board: a.board_stop_id, alight: a.alight_stop_id })),
    ...suatMoi.map((s) => ({ board: s.boardStopId, alight: s.alightStopId })),
  ]);
  const dong = new Map<string, string>();
  for (const ch of hk) for (const p of ch.nguoi) dong.set(`${ch.legId}|${p.personKey}`, p.rowId);
  const chot = suatMoi.flatMap((s) => {
    const row = s.personKey !== null && s.legId !== null ? dong.get(`${s.legId}|${s.personKey}`) : undefined;
    return row ? [{ allocationId: s.id, passengerRowId: row }] : [];
  });
  const phaLe = kq.canPhaLe.some((l) => l.ma === "MOC_TOI_THIEU") ? phaLeCua(chung, "MOC_TOI_THIEU", b.phaLe) : null;
  const ck = camKetSauLenh(chung, kq.camKet, t.commitment_override_key, b.camKetPhaLe, vuot);
  const ma = maDonGon(b.chang.map((c) => nc.changLich.get(c.legId)!.orderCode));
  const diemNhatKy = diemMoi.length > 0 ? `; ${diemMoi.length} điểm mới` : "";
  const lo = loThemDiemDangChay(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), tripId: t.id, version: b.version, diemMoi, doiThuTu, mocXep: mocXepCua(nc, b.chang), suatMoi, chot, phaLe: phaLe ?? ck.phaLe,
    policyId: chung.chinhSach?.id ?? null, camKet: ck.lo,
    detail: `${t.code}: thêm ${suatMoi.length} người khi xe đang chạy${ma ? ` (${ma})` : ""}${diemNhatKy}${sapNhatKy(doiThuTu)}${phaLe ? phaLeNhatKy(phaLe.luat, nhanLyDo(chung, phaLe.lyDo), vuot) : ""}${ck.nhatKy}${gioKhanCapNhatKy([phaLe?.luat, ck.phaLe?.luat], vuot)}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? null : r.res;
}
/** Lệnh chỉ dành cho xe đang chạy: chuyến chưa chạy → 409 `chuyen_chua_chay`; đã kết thúc / huỷ → 409 `chuyen_da_ket_thuc`. */
function khongDangChay(t: TripRow): Response | null {
  if (t.status === "RUNNING") return null;
  return t.status === "PLANNED" ? loi409("chuyen_chua_chay") : loi409("chuyen_da_ket_thuc", [lyDoGiu("CHUYEN_KHONG_CON_LEN_KE_HOACH", t.code)]);
}

// ---- Văn phòng báo khách huỷ khi xe đang chạy (Đợt 5 — ADR-0052 D5.2) ------------------------------------------------------------------------------------
/**
 * Chỉ ĐẶT CỜ trên suất khách đang mở, còn chờ (WAITING), chưa báo — suất VẪN chiếm chỗ tới khi tài xế bấm "Khách đã huỷ" (hoặc "Đã đón" nếu báo nhầm). Lý do
 * thuộc nhóm BAO_HUY_DIEM (sai nhóm → 400). Nhật ký: mã chuyến, mã đơn, nhãn lý do — không tên.
 */
export async function lenhBaoHuy(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], suatId: string, b: BaoHuyThan, staff: StaffProfile, bayGioMs: number,
): Promise<Response | null> {
  const t = nen.trip;
  const dung = khongDangChay(t);
  if (dung) return dung;
  const a = nen.allocs.find((x) => x.id === suatId && x.valid_to_at === null && x.kind === "PASSENGER");
  if (!a) return error(400, "invalid_input", "Suất không thuộc chuyến này hoặc đã rời xe.");
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  if (!lyDoHopLe(chung, b.lyDo, "BAO_HUY_DIEM")) return error(400, "invalid_input", "Lý do báo huỷ không có trong danh mục.");
  if (a.office_cancel_at !== null) return loi409("da_bao_huy");
  if (a.status !== "WAITING") return loi409("suat_da_co_ket_qua");
  const maDon = a.leg_id ? (lich.find((c) => c.legId === a.leg_id)?.orderCode ?? "") : "";
  const lo = loBaoHuy(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), tripId: t.id, version: b.version, suatId: a.id, lyDo: b.lyDo,
    detail: `${t.code}: văn phòng báo huỷ 1 khách${maDon ? ` (${maDon})` : ""} — ${nhanLyDo(chung, b.lyDo)}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? null : r.res;
}

// ---- Tài xế bổ sung tên MỘT khách chưa có tên (ADR-0052 D5b — Đợt 5 A-1b, chủ duyệt 5/10) ---------------------------------------------------------------
/**
 * Route đã kiểm: ô `trip.passenger.add` (assigned), người gọi đang lái, trong ngày chạy. Ở đây: chuyến còn lên kế hoạch hoặc đang chạy; suất khách MỞ của đúng
 * chuyến (không có → 404), chưa có tên (409 `suat_da_co_ten`); đơn của chặng còn thiếu tên (409 `don_du_ten` — câu orders còn tự so trong lô). `cauHanhKhach`
 * = lời gọi `cauThemHanhKhachTaiXe` của orders do ROUTE dựng (sau can() — bài src/orders-cong-bo.test.ts); nhận dấu lệnh (= id nhật ký gác câu) + id dòng mới.
 * Nhật ký: mã chuyến, mã đơn, số người — không tên, năm sinh.
 */
export async function lenhBoSungTen(
  db: D1Database, nen: NenChuyen, hk: readonly ChangChoChuyen[], suatId: string, requestId: string,
  cauHanhKhach: (v: { cmd: string; id: string; orderId: string; lucIso: string }) => Promise<D1PreparedStatement>, staff: StaffProfile, bayGioMs: number,
): Promise<Response | null> {
  const t = nen.trip;
  if (t.status !== "PLANNED" && t.status !== "RUNNING") return loi409("chuyen_da_ket_thuc", [lyDoGiu("CHUYEN_KHONG_CON_LEN_KE_HOACH", t.code)]);
  const a = nen.allocs.find((x) => x.id === suatId && x.valid_to_at === null && x.kind === "PASSENGER" && x.leg_id !== null);
  const c = a ? hk.find((x) => x.legId === a.leg_id) : undefined;
  if (!a || !c) return error(404, "not_found", "Không tìm thấy khách này trên chuyến.");
  if (a.passenger_key !== null) return loi409("suat_da_co_ten");
  if (c.nguoi.length >= c.soNguoi) return loi409("don_du_ten");
  const chung = lenhChung(requestId, staff, bayGioMs);
  const id = crypto.randomUUID();
  const lo = loBoSungTen(db, {
    ...chung, tripId: t.id, version: t.version, dangChay: t.status === "RUNNING", suatId: a.id, personKey: id,
    hanhKhach: await cauHanhKhach({ cmd: chung.cmd, id, orderId: c.orderId, lucIso: chung.lucIso }),
    detail: `${t.code}: tài xế bổ sung tên 1 khách (${c.orderCode})`,
  });
  const r = await chayLo(db, lo, requestId);
  return r.ok ? null : r.res;
}

// ---- Rút (route 6) ---------------------------------------------------------------------------------------------------------------------------------------
export async function lenhRut(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], b: RutThan, staff: StaffProfile, bayGioMs: number, quyenVuot: QuyenVuot,
): Promise<Response | null> {
  const t = nen.trip;
  const dung = khongConKeHoach(t);
  if (dung) return dung;
  const mo = nen.allocs.filter((a) => a.valid_to_at === null);
  if (!b.suatIds.every((id) => mo.some((a) => a.id === id))) return error(400, "invalid_input", "Suất không thuộc chuyến này hoặc đã rời xe.");
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  const vuot = vuotXep(t, chung, bayGioMs, ["RUT"], quyenVuot);
  const cam = chanCoVuot({ moc: b.phaLe !== null, nghiCamKet: false }, vuot);
  if (cam) return cam;
  if (b.phaLe && !lyDoHopLe(chung, b.phaLe.lyDo, "PHA_LE")) return PHA_LE_KHONG_HOP_LE();
  const cs = chinhSachVao(chung.chinhSach);
  if (!cs) return loi409("chinh_sach_rong", [lyDoGiu("CHINH_SACH_RONG")]);
  const moc = kiemMocXep({ batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms }, bayGioMs, cs.minLeadMinutes, { loai: "RUT" });
  const kq: KetQuaKiem = { ok: !moc.canPhaLe, chan: [], canPhaLe: moc.canPhaLe ? [lyDoGiu("MOC_TOI_THIEU", t.code)] : [] };
  const chan = loiKiem(kq, vuot, t.status, { moc: b.phaLe !== null, nghi: true, camKet: true }); // C7: rút không bao giờ bị CAM_KET chặn
  if (chan) return chan;
  const conMo = mo.filter((a) => !b.suatIds.includes(a.id)).map((a) => ({ board: a.board_stop_id, alight: a.alight_stop_id }));
  const maDon = new Map(lich.map((c) => [c.legId, c.orderCode]));
  const phaLe = moc.canPhaLe ? phaLeCua(chung, "MOC_TOI_THIEU", b.phaLe) : null;
  const ds = maDonGon(mo.filter((a) => b.suatIds.includes(a.id) && a.leg_id).map((a) => maDon.get(a.leg_id!) ?? ""));
  const ck = await camKetSauGiam(db, t, legKhachMo(nen.allocs.filter((a) => !b.suatIds.includes(a.id))), lich, chung);
  const lo = loRut(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), tripId: t.id, version: b.version, suatIds: b.suatIds, diemBoQua: diemKhongConKhach(nen.stops, t.id, conMo), phaLe,
    policyId: chung.chinhSach?.id ?? null, camKet: ck.lo,
    detail: `${t.code}: rút ${b.suatIds.length} người${ds ? ` (${ds})` : ""}${phaLe ? phaLeNhatKy(phaLe.luat, nhanLyDo(chung, phaLe.lyDo), vuot) : ""}${gioKhanCapNhatKy([phaLe?.luat], vuot)}${ck.nhatKy}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? null : r.res;
}

// ---- Dời sang chuyến khác (route 7 — cổng đôi) -----------------------------------------------------------------------------------------------------------
export async function lenhDoi(
  db: D1Database, nen: NenChuyen, dich: NenChuyen, lich: readonly ChangLichChung[], b: DoiThan, staff: StaffProfile, bayGioMs: number, quyenVuot: QuyenVuot,
): Promise<Response | null> {
  const t = nen.trip;
  const d = dich.trip;
  const dung = khongConKeHoach(t) ?? khongConKeHoach(d);
  if (dung) return dung;
  const mo = nen.allocs.filter((a) => a.valid_to_at === null);
  const di = mo.filter((a) => b.suatIds.includes(a.id));
  if (di.length !== b.suatIds.length) return error(400, "invalid_input", "Suất không thuộc chuyến này hoặc đã rời xe.");
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  // ADR-0104 Đ1 mục 0: lệnh dời xét "dưới mốc" ở chuyến ĐÍCH (nơi khoảng nghỉ, cam kết được kiểm); luật mốc có thể đến từ nguồn (DOI_DI) hoặc đích (DOI_DEN).
  // ADR-0104 Đ1 mục 0: "dưới mốc" của dời xét ở chuyến ĐÍCH. "Còn N phút" (nhật ký) = tới giờ xét mốc SỚM NHẤT của hai chuyến — luật mốc có thể vượt ở
  // nguồn (DOI_DI) khi đích ngoài mốc.
  const vuotDich = vuotXep(d, chung, bayGioMs, ["DOI_DI", "DOI_DEN"], quyenVuot);
  const vuotNguon = vuotXep(t, chung, bayGioMs, ["DOI_DI", "DOI_DEN"], quyenVuot);
  const vuot: VuotLenh = { ...vuotDich, conPhut: Math.min(vuotDich.conPhut ?? Infinity, vuotNguon.conPhut ?? Infinity) };
  const cam = chanCoVuot({ moc: b.phaLe !== null, nghiCamKet: b.camKetPhaLe !== null }, vuot);
  if (cam) return cam;
  if ([b.phaLe, b.camKetPhaLe].some((p) => p && !lyDoHopLe(chung, p.lyDo, "PHA_LE"))) return PHA_LE_KHONG_HOP_LE();
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
    // ADR-0056 VK3-A: cam kết của chuyến ĐÍCH sau lệnh (`nc` dựng từ `dich`).
    changTrenChuyen: changTrenChuyen(dich, nc.chang), xeId: nc.chuyen.xe.id, camKetPhaLeKhoa: nc.chuyen.camKetPhaLeKhoa,
  });
  if (mocDi) kq.canPhaLe.push(lyDoGiu("MOC_TOI_THIEU", t.code));
  // `kq.ok` có thể false CHỈ vì CAM_KET của chuyến ĐÍCH — không nơi nào đọc `ok` ngoài `loiKiem` (lọc theo `co.camKet`, như xếp DOI_DEN).
  kq.ok = kq.chan.length === 0 && kq.canPhaLe.length === 0;
  const chan = loiKiem(kq, vuot, d.status, { moc: b.phaLe !== null, nghi: true, camKet: b.camKetPhaLe !== null });
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
  const phaLe = kq.canPhaLe.some((l) => l.ma === "MOC_TOI_THIEU") ? phaLeCua(chung, "MOC_TOI_THIEU", b.phaLe) : null;
  const ckDich = camKetSauLenh(chung, kq.camKet, d.commitment_override_key, b.camKetPhaLe, vuot);
  const ckNguon = await camKetSauGiam(db, t, legKhachMo(nen.allocs.filter((a) => !b.suatIds.includes(a.id))), lich, chung);
  const ds = maDonGon(legIds.map((id) => nc.changLich.get(id)!.orderCode));
  const lo = loDoi(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), nguon: { tripId: t.id, version: b.version }, dich: { tripId: d.id, version: b.denVersion }, cap, diemMoiDich, doiThuTuDich,
    diemBoQuaNguon: diemKhongConKhach(nen.stops, t.id, conMoNguon), phaLe: phaLe ?? ckDich.phaLe, policyId: chung.chinhSach?.id ?? null,
    camKetNguon: ckNguon.lo, camKetDich: ckDich.lo,
    detail: `${t.code} → ${d.code}: dời ${di.length} người${ds ? ` (${ds})` : ""}${sapNhatKy(doiThuTuDich)}${phaLe ? phaLeNhatKy(phaLe.luat, nhanLyDo(chung, phaLe.lyDo), vuot) : ""}${ckDich.nhatKy}${gioKhanCapNhatKy([phaLe?.luat, ckDich.phaLe?.luat], vuot)}${ckNguon.nhatKy ? ` · ${t.code}:${ckNguon.nhatKy.slice(2)}` : ""}`,
  });
  const r = await chayLo(db, lo, b.requestId, 2);
  return r.ok ? null : r.res;
}

/**
 * ADR-0056 VK3-A, C7: lệnh chỉ GIẢM khách (rút, chuyến NGUỒN của dời, cập nhật khách / điểm theo đơn) ⇒ không bao giờ bị CAM_KET chặn và không bao giờ GHI
 * phá lệ mới. Chuyến đang có cột phá lệ mà sau lệnh hết vi phạm thì xoá cột trong cùng lô (có nhật ký); còn vi phạm thì giữ cột (khoá khác ⇒ cổng xuất bến
 * giữ chuyến). `legIdsSau` = chặng có suất khách MỞ sau lệnh (`legKhachMo`); chặng đọc từ `lich` (route đọc sau `can()`), chặng rơi khỏi lịch bỏ qua như
 * `changTrenChuyen`.
 */
async function camKetSauGiam(
  db: D1Database, t: TripRow, legIdsSau: readonly string[], lich: readonly ChangLichChung[], chung: DuLieuChung,
): Promise<{ lo: CamKetLo | null; nhatKy: string }> {
  if (t.commitment_override_key === null) return { lo: null, nhatKy: "" };
  await boSungXe(db, chung, [t.vehicle_id]);
  const xeRow = chung.xe.find((x) => x.id === t.vehicle_id);
  // Không đọc được xe của chuyến ⇒ không biết số chỗ để kết luận "hết vi phạm" ⇒ GIỮ cột (xoá nhầm là mất dấu phá lệ; cổng xuất bến vẫn tự kiểm lại).
  if (!xeRow) return { lo: null, nhatKy: "" };
  const ck = kiemCamKet({ xe: { id: t.vehicle_id, soCho: xeRow.passenger_capacity }, chang: changCuaLeg(legIdsSau, new Map(lich.map((c) => [c.legId, changVao(c)]))), khoaDaPhaLe: t.commitment_override_key });
  const r = camKetSauLenh(chung, ck, t.commitment_override_key, null, null);
  return { lo: r.lo, nhatKy: r.nhatKy };
}

// ---- Huỷ chuyến (route 8) --------------------------------------------------------------------------------------------------------------------------------
export async function lenhHuy(db: D1Database, nen: NenChuyen, b: HuyThan, staff: StaffProfile, bayGioMs: number, quyenVuot: QuyenVuot): Promise<Response | null> {
  const t = nen.trip;
  const dung = khongConKeHoach(t);
  if (dung) return dung;
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  const vuot = vuotXep(t, chung, bayGioMs, ["HUY_CO_KHACH"], quyenVuot);
  const cam = chanCoVuot({ moc: b.phaLe !== null, nghiCamKet: false }, vuot);
  if (cam) return cam;
  if (!lyDoHopLe(chung, b.lyDo, "HUY_CHUYEN")) return error(400, "invalid_input", "Lý do huỷ chuyến không có trong danh mục.");
  if (b.phaLe && !lyDoHopLe(chung, b.phaLe.lyDo, "PHA_LE")) return PHA_LE_KHONG_HOP_LE();
  const soMo = nen.allocs.filter((a) => a.valid_to_at === null).length;
  const cs = chinhSachVao(chung.chinhSach);
  const moc = soMo > 0 && cs ? kiemMocXep({ batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms }, bayGioMs, cs.minLeadMinutes, { loai: "HUY_CO_KHACH" }).canPhaLe : false;
  const chan = loiKiem({ ok: !moc, chan: [], canPhaLe: moc ? [lyDoGiu("MOC_TOI_THIEU", t.code)] : [] }, vuot, t.status, { moc: b.phaLe !== null, nghi: true, camKet: true });
  if (chan) return chan;
  const phaLe = moc ? phaLeCua(chung, "MOC_TOI_THIEU", b.phaLe) : null;
  // ADR-0057 C4: lô huỷ đảo MỌI dòng chi phí còn hiệu lực (âm → dương) trước câu trạng thái cuối; phiên bản chi phí ở câu cổng (TC-8).
  const cp = await docChiPhiChoLenh(db, { tripId: t.id, chuXe: t.carrier_party_id, homNay: homNay(bayGioMs) });
  const kh = keHoachChiPhiKhiHuy(cp.dong, homNay(bayGioMs));
  const lo = loHuy(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), tripId: t.id, version: b.version, lyDo: b.lyDo, phaLe, policyId: chung.chinhSach?.id ?? null, soSuatMo: soMo,
    chiPhi: kh, phienBanChiPhi: kh.phienBan,
    detail: `${t.code}: huỷ — ${nhanLyDo(chung, b.lyDo)}${soMo > 0 ? ` · còn ${soMo} người` : ""}${phaLe ? phaLeNhatKy(phaLe.luat, nhanLyDo(chung, phaLe.lyDo), vuot) : ""}${gioKhanCapNhatKy([phaLe?.luat], vuot)}${chiTietChiPhiNhatKy(kh, t.rented, true, await tenNhaXePhiHuy(db, kh.phiHuyBiDao))}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? null : r.res;
}

// ---- Cập nhật điểm theo đơn (route 40 — ADR-0050 VK1-B, I42) -----------------------------------------------------------------------------------------------
/** Trả số suất đã đổi điểm (0 = không suất nào lệch, không ghi gì) hoặc `Response` khi từ chối. */
export async function lenhCapNhatDiem(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], b: { version: number; requestId: string }, staff: StaffProfile, bayGioMs: number,
): Promise<Response | { daCapNhat: number; boQua: number }> {
  const t = nen.trip;
  // Đợt 5 D5.3a: xe ĐANG CHẠY cũng cập nhật được — chỉ suất WAITING ở điểm lên PENDING; không phá lệ, không tự bỏ qua điểm.
  const chay = t.status === "RUNNING";
  const dung = chay ? null : khongConKeHoach(t);
  if (dung) return dung;
  const chung = await docChung(db, nowIsoOf(bayGioMs), homNay(bayGioMs));
  // Mốc lúc xếp: lệnh DOI_DIEM_THEO_CHANG KHÔNG khoá (không đổi "ai đi xe nào" — ADR-0050 VK1-B); hỏi CHÍNH luật mốc để đổi luật ở một chỗ là đủ.
  const cs = chinhSachVao(chung.chinhSach);
  if (!chay && cs && kiemMocXep({ batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms }, bayGioMs, cs.minLeadMinutes, { loai: "DOI_DIEM_THEO_CHANG" }).canPhaLe) {
    return loi409("can_pha_le", [lyDoGiu("MOC_TOI_THIEU", t.code)], { canQuyen: false });
  }
  const nc = await docNguCanh(db, nen, lich, chung);
  const diemMoi: DiemMoi[] = [];
  const cap: { dongId: string; mo: SuatMoi }[] = [];
  const doi: string[] = [];
  const nhanDiem = await tenDiem(db, [...new Set([...nen.stops.flatMap((s) => (s.location_id ? [s.location_id] : [])), ...lich.flatMap((c) => [c.noiDonDiemId, c.noiTraDiemId].filter((x): x is string => x !== null))])]);
  const tenNoiNhatKy = (loc: string | null) => (loc ? (nhanDiem.get(loc) ?? "điểm danh mục") : "nơi tự do");
  let boQua = 0;
  for (const a of nen.allocs) {
    if (a.valid_to_at !== null || a.kind !== "PASSENGER" || a.leg_id === null) continue;
    const ch: ChangVao | undefined = nc.chang.get(a.leg_id);
    const lc = nc.changLich.get(a.leg_id);
    if (!ch || !lc) continue; // chặng rơi khỏi lịch: lý do giữ riêng (đơn huỷ / chặng bỏ …) — không "cập nhật điểm" cho khách không còn đi (I38)
    const len = nen.stops.find((s) => s.id === a.board_stop_id);
    const xuong = a.alight_stop_id ? nen.stops.find((s) => s.id === a.alight_stop_id) : undefined;
    const n = noiLechCuaSuat(suatVao(a), len ? diemVao(len) : undefined, xuong ? diemVao(xuong) : undefined, ch);
    if (!n.don && !n.tra) continue;
    if (chay) {
      // Văn phòng đã báo huỷ: khách không đi nữa — không dời điểm (cờ báo huỷ ở trên suất cũ), không tính "bỏ qua".
      if (a.office_cancel_at !== null) continue;
      if (a.status !== "WAITING" || len?.status !== "PENDING") {
        boQua++;
        continue;
      }
    }
    const moiLen = n.don ? diemChoKhoa(nen.stops, diemMoi, t.id, "PICKUP", ch.khoaNoiDon, lc.noiDonDiemId, lc.noiDon) : a.board_stop_id;
    const moiXuong = n.tra && ch.khoaNoiTra !== null ? diemChoKhoa(nen.stops, diemMoi, t.id, "DROPOFF", ch.khoaNoiTra, lc.noiTraDiemId, lc.noiTra) : a.alight_stop_id;
    cap.push({ dongId: a.id, mo: { id: crypto.randomUUID(), tripId: t.id, loai: "PASSENGER", legId: a.leg_id, personKey: a.passenger_key, crewPartyId: null, boardStopId: moiLen, alightStopId: moiXuong } });
    if (n.don) doi.push(`${lc.orderCode}: điểm đón ${tenNoiNhatKy(len?.location_id ?? null)} → ${tenNoiNhatKy(lc.noiDonDiemId)}`);
    if (n.tra) doi.push(`${lc.orderCode}: điểm trả ${xuong ? tenNoiNhatKy(xuong.location_id) : "chưa có"} → ${tenNoiNhatKy(lc.noiTraDiemId)}`);
  }
  if (cap.length === 0) return { daCapNhat: 0, boQua };
  const conMo = [
    ...nen.allocs.filter((a) => a.valid_to_at === null && !cap.some((c) => c.dongId === a.id)).map((a) => ({ board: a.board_stop_id, alight: a.alight_stop_id })),
    ...cap.map((c) => ({ board: c.mo.boardStopId, alight: c.mo.alightStopId })),
  ];
  // Xe đang chạy: KHÔNG tự bỏ qua điểm cũ (kế hoạch Đợt 5 Task 3 — điểm cũ hết khách để tài xế / văn phòng xử lý).
  const diemBoQua = chay ? [] : diemKhongConKhach(nen.stops, t.id, conMo);
  // HT-01 (V1.2): điểm mới của nơi đổi có thể đứng sau điểm trả dùng lại — sắp lại (điểm sắp bỏ qua không xét).
  const doiThuTu = sapLaiDiem(nen.stops, diemMoi, t.id, conMo, diemBoQua);
  // C7: đổi điểm không đổi tập chặng trên xe (mở lại cùng chặng); vi phạm hết do SỬA ĐƠN thì lệnh có việc xoá cột. Xe ĐANG CHẠY: không chạm — cột là dấu phá lệ
  // đã cho xe xuất bến (kiểm định kỳ đọc chuyến đang / đã chạy).
  const ck = chay ? { lo: null, nhatKy: "" } : await camKetSauGiam(db, t, legKhachMo(nen.allocs), lich, chung);
  const lo = loCapNhatDiem(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), tripId: t.id, version: b.version, diemMoi, cap, doiThuTu, diemBoQua, dangChay: chay, camKet: ck.lo,
    detail: `${t.code}: ${[...new Set(doi)].join("; ")}${chay ? " (xe đang chạy)" : ""}${sapNhatKy(doiThuTu)}${ck.nhatKy}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? { daCapNhat: cap.length, boQua } : r.res;
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
  // C7: tập chặng sau lệnh = suất khách mở chưa đóng + suất mở lại (cùng chặng).
  const legSau = [...legKhachMo(nen.allocs.filter((a) => !dong.has(a.id))), ...cap.flatMap((c) => (c.mo?.legId ? [c.mo.legId] : []))];
  const ck = await camKetSauGiam(db, t, legSau, lich, chung);
  const lo = loCapNhatKhach(db, {
    ...lenhChung(b.requestId, staff, bayGioMs), tripId: t.id, version: b.version, cap, diemBoQua: diemKhongConKhach(nen.stops, t.id, conMo), camKet: ck.lo,
    detail: `${t.code}: cập nhật khách theo đơn — ${doi.join("; ")}${ck.nhatKy}`,
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
