// CÁC LỆNH TIẾN ĐỘ của chuyến xe (ADR-0049 D1, D3; ADR-0050 VK1-A; kế hoạch mục 1.5, 1.7 route 21–29 ↔ 31–39; ruling R-P1, R-P14 — Task A15).
// MỖI LỆNH MỘT HÀM, dùng CHUNG cho route tài xế (cổng staff, chuyến mình đang lái) và route văn phòng bấm thay (cổng office) — R-P1: hai bộ route, MỘT luật
// (bài tien-do-mot-luat.test.ts, TC-41). Hàm nhận dữ liệu route đã đọc + người bấm (`bamThay` = không phải tài xế đang lái) + giờ khai (chỉ văn phòng
// 31–38 — thân route đã chặn chỗ khác); làm MỌI kiểm (trạng thái, điểm đã tới, `kiemGioXayRa`, `kiemXuatBen`, `kiemKetThuc`), dựng lô (dieu-phoi.ts), chạy.
// Trả `Response` khi từ chối, `null` khi đã ghi (hoặc không có gì để ghi). KHÔNG gọi hàm hẹp của orders: chặng + tên khách do thân route đọc sau `can()`.
import type { ChangChoChuyen, ChangLichChung } from "../orders";
import { kiemKetThuc, kiemXuatBen } from "../../shared/dieu-phoi-kiem";
import { error } from "../../shared/http";
import { lyDoGiu } from "../../shared/ly-do-giu";
import { msToVnLocal } from "../../shared/vn-date";
import { legFlags, lyDoDangDung, tenDiem, tripsTouching, type AllocRow, type TripRow } from "./chuyen-repo";
import {
  LENH_SUAT, loDaToi, loDoiThuTu, loKetThuc, loKetThucGianDoan, loSuat, loXuatBen, type LenhChung, type LoaiLenhSuat, type XayRa,
} from "./dieu-phoi";
import { chinhSachVao, diemVao, docChung, docNguCanh, suatVao, type NenChuyen } from "./dieu-phoi-doc";
import { kiemGioLenh, ketThucTruoc, vaoGio, type NenGio } from "./dieu-phoi-gio";
import { CHUYEN_CU, chanDaoMoi, chanToiDiemTra, chayLo, loi409 } from "./dieu-phoi-route";
import { chinhSachHienHanh, currentDispatchPolicy } from "./repository";
import type { DoiThuTuThan, KetThucGianDoanThan, TienDoThan } from "./dieu-phoi-than";

const NGAY_MS = 86_400_000;
/** Người bấm: id tài khoản; `bamThay` = văn phòng bấm thay (không phải tài xế đang lái) — nhật ký ghi "văn phòng bấm thay". */
export interface NguoiBam {
  id: string;
  bamThay: boolean;
}
const KHONG_CO_DIEM = () => error(404, "not_found", "Không tìm thấy điểm này trên chuyến.");
const KHONG_CO_SUAT = () => error(404, "not_found", "Không tìm thấy khách này trên chuyến.");

const lenh = (requestId: string, nguoi: NguoiBam, bayGioMs: number): LenhChung => ({ cmd: crypto.randomUUID(), requestId, lucIso: new Date(bayGioMs).toISOString(), nguoiId: nguoi.id });
/**
 * Giờ xảy ra của lệnh — MỘT mốc giờ mỗi request (I33): không khai ⇒ ĐÚNG chuỗi lúc bấm (`MAY_CHU`); khai ⇒ mili-giây văn phòng gửi, định dạng lại bằng
 * `toISOString()` (không lưu chuỗi của trình duyệt).
 */
const xayRaCua = (l: LenhChung, xayRaMs: number | null): XayRa =>
  xayRaMs === null ? { iso: l.lucIso, ms: Date.parse(l.lucIso), nguon: "MAY_CHU" } : { iso: new Date(xayRaMs).toISOString(), ms: xayRaMs, nguon: "VAN_PHONG_KHAI" };
/** Đuôi `detail` nhật ký (danh sách trắng mục 1.1): "văn phòng bấm thay", "xảy ra lúc HH:MM" (giờ VN) khi khai giờ. */
const duoi = (nguoi: NguoiBam, x: XayRa): string => `${nguoi.bamThay ? " · văn phòng bấm thay" : ""}${x.nguon === "VAN_PHONG_KHAI" ? ` · xảy ra lúc ${msToVnLocal(x.ms).time}` : ""}`;
/** Lệnh tiến độ (trừ xuất bến) chỉ khi chuyến ĐANG CHẠY. */
function dangChay(t: TripRow): Response | null {
  if (t.status === "RUNNING") return null;
  if (t.status === "PLANNED") return loi409("chua_xuat_ben", [lyDoGiu("CHUYEN_KHONG_CON_LEN_KE_HOACH", t.code)]);
  return loi409("chuyen_da_ket_thuc", [lyDoGiu("CHUYEN_KHONG_CON_LEN_KE_HOACH", t.code)]);
}
/** Nền giờ của chuyến: sự kiện, kẹp lùi của chính sách HIỆN HÀNH, kết thúc thật của chuyến khác cùng xe / tài xế (chỉ xuất bến cần). */
async function nenGio(db: D1Database, nen: NenChuyen, bayGioMs: number, canTruoc: boolean): Promise<NenGio & { policyId: string | null }> {
  const cs = await chinhSachHienHanh(db);
  const khac = canTruoc ? await tripsTouching(db, nen.trip.planned_start_ms - NGAY_MS, nen.trip.planned_end_ms + NGAY_MS) : [];
  return { events: nen.events, kepLuiPhut: cs?.proxy_backdate_max_minutes ?? null, truoc: ketThucTruoc(khac, nen.trip), bayGioMs, policyId: cs?.id ?? null };
}
/** Khai giờ mà chưa có chính sách (không có kẹp lùi) → chặn, không đoán. */
const CHUA_CO_KEP = () => loi409("chinh_sach_rong", [lyDoGiu("CHINH_SACH_RONG")]);

// ---- Xuất bến (route 21 ↔ 31) ---------------------------------------------------------------------------------------------------------------------------
/**
 * `lich` (chặng quanh ngày chạy) + `hk` (dòng hành khách hiện hành — `rowId` cho bản chốt) do thân route đọc sau `can()`. Cổng xuất bến = `kiemXuatBen` với
 * giờ XẢY RA xuất bến (khoảng nghỉ đo từ đó — I37); đạt ⇒ lô xuất bến (gắn tên còn thiếu, bản chụp ĐẠT, bản chốt, RUNNING). version do máy chủ đọc (I23).
 */
export async function lenhXuatBen(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], hk: readonly ChangChoChuyen[], b: TienDoThan, nguoi: NguoiBam, bayGioMs: number,
): Promise<Response | null> {
  const t = nen.trip;
  if (t.status !== "PLANNED") return loi409(t.status === "RUNNING" ? "da_xuat_ben" : "chuyen_da_ket_thuc", [lyDoGiu("CHUYEN_KHONG_CON_LEN_KE_HOACH", t.code)]);
  const chung = await docChung(db, new Date(bayGioMs).toISOString(), msToVnLocal(bayGioMs).date);
  const nc = await docNguCanh(db, nen, lich, chung, [], bayGioMs);
  const cs = chung.chinhSach;
  const n: NenGio = { events: nen.events, kepLuiPhut: cs?.proxy_backdate_max_minutes ?? null, truoc: ketThucTruoc(nc.chuyenKhacRow, t), bayGioMs };
  if (b.xayRaMs !== null && n.kepLuiPhut === null) return CHUA_CO_KEP();
  const l = lenh(b.requestId, nguoi, bayGioMs);
  const x = xayRaCua(l, b.xayRaMs);
  const gio = kiemGioLenh(n, vaoGio(n, "DEPARTED"), x.ms, b.xayRaMs !== null);
  if (gio) return gio;
  // ADR-0096 Đ2.2 (LC-20): cửa sổ xuất bến theo dòng chính sách hiệu lực TẠI GIỜ XUẤT BẾN — văn phòng khai lùi có thể rơi vào dòng trước; CÙNG dòng trigger
  // vc_trip_departure_window đọc (valid_from_at ≤ departed_at). Không có dòng nào tại giờ đó → chặn (không đoán).
  const csCuaSo = b.xayRaMs === null ? cs : await currentDispatchPolicy(db, x.iso);
  if (cs && !csCuaSo) return loi409("chua_du_dieu_kien_xuat_ben", [lyDoGiu("CHINH_SACH_RONG")]);
  const csVao = chinhSachVao(cs);
  const vao = {
    chuyen: nc.chuyen, suat: nc.suat, chang: [...nc.chang.values()], changNgoai: nc.changNgoai, suatMoCuaChang: nc.suatMoCuaChang, diem: nc.diem, chuyenKhac: nc.chuyenKhac,
    chinhSach: csVao && csCuaSo ? { ...csVao, departureWindowMinutes: csCuaSo.departure_window_minutes } : csVao, hangBang: chung.hangBang, dieuKien: chung.dieuKien, bayGioMs,
    xuatBenMs: x.ms,
  };
  const kq = kiemXuatBen(vao);
  if (!kq.dat || !cs || kq.chup.taiXePartyId === null) return loi409("chua_du_dieu_kien_xuat_ben", kq.lyDo);
  // Bản chốt: khách trỏ DÒNG hành khách hiện hành (của đúng chặng, đúng khoá người — sau khi gắn tên còn thiếu); người đi kèm trỏ hồ sơ.
  const dong = new Map<string, string>();
  for (const ch of hk) for (const p of ch.nguoi) dong.set(`${ch.legId}|${p.personKey}`, p.rowId);
  const gan = new Map(kq.ganTen.map((g) => [g.suatId, g.personKey]));
  const chot: { allocationId: string; passengerRowId: string | null; crewPartyId: string | null }[] = [];
  const mo = nen.allocs.filter((a) => a.valid_to_at === null);
  for (const a of mo) {
    if (a.kind === "CREW") {
      chot.push({ allocationId: a.id, passengerRowId: null, crewPartyId: a.crew_party_id });
      continue;
    }
    const pk = a.passenger_key ?? gan.get(a.id) ?? null;
    if (pk === null) continue; // chính sách không bắt đủ danh sách: suất chưa tên không có dòng bản chốt (câu hỏi Q-A15-1 — R-VC-4 ở A17)
    const row = dong.get(`${a.leg_id}|${pk}`);
    // Lưới THỨ HAI (R-P29; K2e THẤP-3 — GA-69): tới đây chỉ khi đơn đổi GIỮA lúc đọc lịch và lúc đọc hành khách của CHÍNH request này — người trên suất (đã
    // gắn từ trước ⇒ màn tải lại giữ KHACH_DA_DOI; hay vừa được `kiemXuatBen` GÁN TẠM cho suất chưa tên ⇒ suất vẫn chưa tên, màn tải lại giữ THIEU_TEN nếu
    // chính sách bắt đủ danh sách) không còn trong đơn. Trả ĐÚNG lý do màn sẽ hiện khi tải lại: tính lại CHÍNH `kiemXuatBen` với danh sách người vừa đọc (`hk`)
    // — không đoán mã. Tính lại mà vẫn đạt (không bắt đủ danh sách) → 409 `stale` "tải lại" (gán tạm cũ không còn đúng, không ghi).
    if (!row) {
      const moi = new Map(hk.map((ch) => [ch.legId, ch.nguoi.map((p) => p.personKey)]));
      const lai = kiemXuatBen({ ...vao, chang: vao.chang.map((ch) => (moi.has(ch.legId) ? { ...ch, nguoiCuaDon: moi.get(ch.legId)! } : ch)) });
      return lai.dat ? CHUYEN_CU() : loi409("chua_du_dieu_kien_xuat_ben", lai.lyDo);
    }
    chot.push({ allocationId: a.id, passengerRowId: row, crewPartyId: null });
  }
  const soKhach = mo.filter((a) => a.kind === "PASSENGER").length;
  const c = kq.chup;
  // ADR-0056 VK3-A (C7): cổng đạt mà HẾT vi phạm cam kết (vd. đơn tắt xe riêng sau khi đã phá lệ) và chuyến còn cột phá lệ → xoá trong cùng lô, có nhật ký.
  const xoaCamKet = kq.camKet.khoa === null && t.commitment_override_key !== null;
  const lo = loXuatBen(db, {
    ...l, tripId: t.id, version: t.version, xayRa: x, policyId: cs.id, ganTen: kq.ganTen,
    chup: { id: crypto.randomUUID(), xeId: c.xeId, bienSo: c.bienSo, soCho: c.soCho, chuXePartyId: c.chuXePartyId, taiXePartyId: c.taiXePartyId as string, nghiDaDung: c.nghiDaDung ?? t.rest_minutes_snapshot },
    muc: c.muc, chot, soKhach, xoaCamKet,
    detail: `${t.code}: xuất bến · xe ${c.bienSo} · ${soKhach} khách${xoaCamKet ? " · hết vi phạm cam kết — bỏ phá lệ cam kết" : ""}${duoi(nguoi, x)}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? null : r.res;
}

// ---- Xe đã tới điểm (route 22 ↔ 32) --------------------------------------------------------------------------------------------------------------------
export async function lenhDaToi(db: D1Database, nen: NenChuyen, stopId: string, b: TienDoThan, nguoi: NguoiBam, bayGioMs: number): Promise<Response | null> {
  const t = nen.trip;
  const chan = dangChay(t);
  if (chan) return chan;
  const s = nen.stops.find((x) => x.id === stopId);
  if (!s) return KHONG_CO_DIEM();
  if (s.status !== "PENDING") return loi409("diem_da_toi");
  // ADR-0096 Đ1.4 (HT-02): điểm TRẢ còn khách chờ lên mà điểm đón chưa tới → tới điểm đón trước. Mọi suất đã vắng / huỷ → bấm được như cũ.
  if (s.kind === "DROPOFF") {
    const chanTra = chanToiDiemTra(nen.stops, nen.allocs, s.id);
    if (chanTra) return chanTra;
  }
  const n = await nenGio(db, nen, bayGioMs, false);
  if (b.xayRaMs !== null && n.kepLuiPhut === null) return CHUA_CO_KEP();
  const l = lenh(b.requestId, nguoi, bayGioMs);
  const x = xayRaCua(l, b.xayRaMs);
  const gio = kiemGioLenh(n, vaoGio(n, "STOP_ARRIVED", { diemId: s.id }), x.ms, b.xayRaMs !== null);
  if (gio) return gio;
  const ten = s.location_id ? ((await tenDiem(db, [s.location_id])).get(s.location_id) ?? "điểm danh mục") : "nơi tự do";
  const lo = loDaToi(db, { ...l, tripId: t.id, stopId: s.id, xayRa: x, policyId: n.policyId, detail: `${t.code}: tới điểm ${s.seq} (${ten})${duoi(nguoi, x)}` });
  const r = await chayLo(db, lo, b.requestId, 2);
  return r.ok ? null : r.res;
}

// ---- Suất: đã đón / vắng / khách huỷ / đã trả (route 23–26 ↔ 33–36) ------------------------------------------------------------------------------------
const NHAN_LENH_SUAT: Record<LoaiLenhSuat, string> = { DA_DON: "đã đón", VANG: "khách vắng", KHACH_HUY: "khách huỷ tại điểm", DA_TRA: "đã trả" };
async function lenhSuat(lenhSuatLoai: LoaiLenhSuat, db: D1Database, nen: NenChuyen, suatId: string, b: TienDoThan, nguoi: NguoiBam, bayGioMs: number): Promise<Response | null> {
  const t = nen.trip;
  const chan = dangChay(t);
  if (chan) return chan;
  const a: AllocRow | undefined = nen.allocs.find((x) => x.id === suatId && x.valid_to_at === null);
  if (!a) return KHONG_CO_SUAT();
  const k = LENH_SUAT[lenhSuatLoai];
  // HT-16 (ADR-0096 Đ1.4): "Đã trả" khách còn CHỜ LÊN → nói đúng việc phải làm (bấm Đã đón), không "đã có kết quả".
  if (lenhSuatLoai === "DA_TRA" && a.status === "WAITING") return loi409("khach_chua_len");
  if (!(k.tu as readonly string[]).includes(a.status)) return loi409("suat_da_co_ket_qua");
  const diemId = k.phia === "XUONG" ? a.alight_stop_id : a.board_stop_id;
  // "Đã đón / vắng / khách huỷ" đòi xe đã tới điểm LÊN; "đã trả" đòi đã tới điểm XUỐNG (người đi kèm không có điểm) — cùng điều kiện câu chuyển ALLOC_TIEN_DO.
  if (a.kind === "PASSENGER" && !nen.stops.some((s) => s.id === diemId && (s.status === "ARRIVED" || s.status === "DONE"))) return loi409("diem_chua_toi");
  const n = await nenGio(db, nen, bayGioMs, false);
  if (b.xayRaMs !== null && n.kepLuiPhut === null) return CHUA_CO_KEP();
  const l = lenh(b.requestId, nguoi, bayGioMs);
  const x = xayRaCua(l, b.xayRaMs);
  const gio = kiemGioLenh(n, vaoGio(n, k.suKien, { diemId, suatId: a.id, suatMoTuMs: Date.parse(a.valid_from_at) }), x.ms, b.xayRaMs !== null);
  if (gio) return gio;
  const ma = a.leg_id ? ((await legFlags(db, [a.leg_id]))[0]?.order_code ?? null) : null;
  const lo = loSuat(db, {
    ...l, tripId: t.id, suatId: a.id, lenh: lenhSuatLoai, stopId: diemId, diemXet: [...new Set([a.board_stop_id, a.alight_stop_id].filter((d): d is string => d !== null))],
    xayRa: x, policyId: n.policyId, detail: `${t.code}: ${NHAN_LENH_SUAT[lenhSuatLoai]} — ${a.kind === "CREW" ? "người đi kèm" : (ma ?? "khách")}${duoi(nguoi, x)}`,
  });
  const r = await chayLo(db, lo, b.requestId, 2);
  return r.ok ? null : r.res;
}
export const lenhDaDon = (db: D1Database, nen: NenChuyen, suatId: string, b: TienDoThan, nguoi: NguoiBam, bayGioMs: number) => lenhSuat("DA_DON", db, nen, suatId, b, nguoi, bayGioMs);
export const lenhVang = (db: D1Database, nen: NenChuyen, suatId: string, b: TienDoThan, nguoi: NguoiBam, bayGioMs: number) => lenhSuat("VANG", db, nen, suatId, b, nguoi, bayGioMs);
export const lenhKhachHuy = (db: D1Database, nen: NenChuyen, suatId: string, b: TienDoThan, nguoi: NguoiBam, bayGioMs: number) => lenhSuat("KHACH_HUY", db, nen, suatId, b, nguoi, bayGioMs);
export const lenhDaTra = (db: D1Database, nen: NenChuyen, suatId: string, b: TienDoThan, nguoi: NguoiBam, bayGioMs: number) => lenhSuat("DA_TRA", db, nen, suatId, b, nguoi, bayGioMs);

// ---- Kết thúc (route 27 ↔ 37) --------------------------------------------------------------------------------------------------------------------------
export async function lenhKetThuc(db: D1Database, nen: NenChuyen, b: TienDoThan, nguoi: NguoiBam, bayGioMs: number): Promise<Response | null> {
  const t = nen.trip;
  const chan = dangChay(t);
  if (chan) return chan;
  // LC-16: còn khách chưa có kết quả / điểm chưa xong → gợi ý "Kết thúc gián đoạn" (CSDL giữ lần nữa bằng trigger).
  const kk = kiemKetThuc({ suat: nen.allocs.map(suatVao), diem: nen.stops.map(diemVao) });
  if (!kk.duoc) return loi409("con_khach_chua_xong", [], { goiY: kk.goiY, conSuat: kk.conSuat, conDiem: kk.conDiem });
  const n = await nenGio(db, nen, bayGioMs, false);
  if (b.xayRaMs !== null && n.kepLuiPhut === null) return CHUA_CO_KEP();
  const l = lenh(b.requestId, nguoi, bayGioMs);
  const x = xayRaCua(l, b.xayRaMs);
  const gio = kiemGioLenh(n, vaoGio(n, "ENDED"), x.ms, b.xayRaMs !== null);
  if (gio) return gio;
  const lo = loKetThuc(db, { ...l, tripId: t.id, xayRa: x, policyId: n.policyId, detail: `${t.code}: kết thúc${duoi(nguoi, x)}` });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? null : r.res;
}

// ---- Kết thúc gián đoạn (route 28 ↔ 38) ----------------------------------------------------------------------------------------------------------------
export async function lenhKetThucGianDoan(db: D1Database, nen: NenChuyen, b: KetThucGianDoanThan, nguoi: NguoiBam, bayGioMs: number): Promise<Response | null> {
  const t = nen.trip;
  const chan = dangChay(t);
  if (chan) return chan;
  const lyDo = (await lyDoDangDung(db)).find((r) => r.code === b.lyDo && r.reason_group === "KET_THUC_GIAN_DOAN");
  if (!lyDo) return error(400, "invalid_input", "Lý do kết thúc gián đoạn không có trong danh mục.");
  const n = await nenGio(db, nen, bayGioMs, false);
  if (b.xayRaMs !== null && n.kepLuiPhut === null) return CHUA_CO_KEP();
  const l = lenh(b.requestId, nguoi, bayGioMs);
  const x = xayRaCua(l, b.xayRaMs);
  const gio = kiemGioLenh(n, vaoGio(n, "ENDED_INTERRUPTED"), x.ms, b.xayRaMs !== null);
  if (gio) return gio;
  const soDong = nen.allocs.filter((a) => a.valid_to_at === null && (a.status === "WAITING" || a.status === "BOARDED")).length;
  const lo = loKetThucGianDoan(db, {
    ...l, tripId: t.id, xayRa: x, policyId: n.policyId, lyDo: b.lyDo, soSuatDong: soDong,
    detail: `${t.code}: kết thúc gián đoạn — ${lyDo.label}${soDong > 0 ? ` · ${soDong} khách chưa xong` : ""}${duoi(nguoi, x)}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? null : r.res;
}

// ---- Đổi thứ tự điểm chưa tới khi đang chạy (route 29 ↔ 39) — luôn giờ máy chủ ----------------------------------------------------------------------------
export async function lenhDoiThuTu(db: D1Database, nen: NenChuyen, b: DoiThuTuThan, nguoi: NguoiBam, bayGioMs: number): Promise<Response | null> {
  const t = nen.trip;
  const chan = dangChay(t);
  if (chan) return chan;
  for (const d of b.diem) {
    const s = nen.stops.find((x) => x.id === d.id);
    if (!s) return error(400, "invalid_input", "Điểm không thuộc chuyến này.");
    if (s.status !== "PENDING") return loi409("diem_da_toi");
  }
  const moi = new Map(b.diem.map((d) => [d.id, d.thuTu]));
  const sauCung = nen.stops.filter((s) => s.status !== "SKIPPED" && s.status !== "MOVED").map((s) => moi.get(s.id) ?? s.seq);
  if (new Set(sauCung).size !== sauCung.length) return error(400, "invalid_input", "Thứ tự mới trùng với thứ tự của điểm khác.");
  const doi = b.diem.filter((d) => nen.stops.find((s) => s.id === d.id)!.seq !== d.thuTu);
  if (doi.length === 0) return null; // không đổi gì — không ghi
  // ADR-0096 Đ1.3c (LC-19 lớp máy chủ; đường này không có trigger theo dòng — Đ1.6): thứ tự mới làm khách chờ lên bị đảo mới → 409.
  const dao = await chanDaoMoi(db, nen.stops, nen.allocs, doi.map((d) => ({ id: d.id, seq: d.thuTu })));
  if (dao) return dao;
  const cs = await chinhSachHienHanh(db);
  const l = lenh(b.requestId, nguoi, bayGioMs);
  const lo = loDoiThuTu(db, {
    ...l, tripId: t.id, diem: doi.map((d) => ({ id: d.id, seq: d.thuTu })), policyId: cs?.id ?? null,
    detail: `${t.code}: đổi thứ tự ${doi.length} điểm chưa tới${nguoi.bamThay ? " · văn phòng bấm thay" : ""}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? null : r.res;
}
