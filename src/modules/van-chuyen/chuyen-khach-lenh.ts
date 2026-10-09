// LỆNH ĐỀ NGHỊ CHUYỂN KHÁCH GIỮA HAI XE (ADR-0111, thi hành ADR-0052 D4 / D5c — gói A5): đọc → luật thuần (src/shared/chuyen-khach.ts) → dựng lô
// (dieu-phoi.ts — mọi câu ghi chuyến ở đó) → chạy (`chayLo`). Trả `Response` khi từ chối. Route đã kiểm quyền + "đang lái" trước khi gọi (404 khi không lái).
// Không tên khách, năm sinh, SĐT trong DTO / nhật ký; chữ nơi gặp (đã che) chỉ ở DTO đề nghị; khoá nơi không bao giờ ra ngoài (LC-18, G-A5-9).
import type { DeNghiDto } from "../../shared/contracts";
import { chuanNoiGap, daHetHan, hetHanLucMs, hopDuyet, kiemGui, NHAN_TRANG_THAI_DE_NGHI, suatCuaDeNghi, trangThaiLucDoc, type MaLoiGui } from "../../shared/chuyen-khach";
import { error, UUID_RE } from "../../shared/http";
import { deNghiById, kiemCuaDeNghi, lyDoDangDung, stopsByTrips, tenDiem, type DeNghiRow } from "./chuyen-repo";
import { loGuiDeNghi, loRutDeNghi, type DeNghiLo } from "./dieu-phoi";
import { suatVao, type NenChuyen } from "./dieu-phoi-doc";
import { chayLo, loi409 } from "./dieu-phoi-route";

type KetQua<T> = { ok: true; value: T } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });
const MA_RE = /^[A-Z][A-Z0-9_]{1,39}$/;
const idHopLe = (v: unknown): v is string => typeof v === "string" && v.length >= 3 && v.length <= 64 && /^[A-Za-z0-9-]+$/.test(v);
const docRequestId = (b: Record<string, unknown>): KetQua<string> =>
  typeof b.requestId === "string" && UUID_RE.test(b.requestId) && b.requestId.length === 36 ? { ok: true, value: b.requestId } : fail("Thiếu mã yêu cầu (requestId) — tải lại trang rồi bấm lại.");

// ---- Đọc thân yêu cầu (danh sách TRẮNG khoá) ------------------------------------------------------------------------------------------------------------
export interface GuiThan {
  requestId: string;
  denChuyenId: string;
  phamVi: "STOP" | "ONBOARD";
  diemId: string | null;
  noiGap: { diaDiemId: string | null; chu: string | null };
}
/** Thân lệnh gửi. STOP: `diemId` bắt buộc, không nơi gặp; ONBOARD: đúng MỘT nơi gặp (địa điểm hoặc chữ — chữ được che dãy số dài, tối đa 200 ký tự). */
export function docGuiDeNghi(body: Record<string, unknown> | null): KetQua<GuiThan> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  if (!idHopLe(body.denChuyenId)) return fail("Chọn xe nhận.");
  if (body.phamVi !== "STOP" && body.phamVi !== "ONBOARD") return fail("Phạm vi chuyển: STOP (một điểm đón) hoặc ONBOARD (cứu hộ).");
  if (body.phamVi === "STOP") {
    if (!idHopLe(body.diemId)) return fail("Chọn điểm đón cần nhờ xe khác.");
    if (body.noiGap !== undefined && body.noiGap !== null) return fail("Nhờ đón một điểm thì không ghi nơi gặp.");
    return { ok: true, value: { requestId: rid.value, denChuyenId: body.denChuyenId, phamVi: "STOP", diemId: body.diemId, noiGap: { diaDiemId: null, chu: null } } };
  }
  if (body.diemId !== undefined && body.diemId !== null) return fail("Cứu hộ chuyển cả xe — không chọn điểm đón.");
  const g = body.noiGap && typeof body.noiGap === "object" ? (body.noiGap as Record<string, unknown>) : {};
  const n = chuanNoiGap({ diaDiemId: g.diaDiemId, chu: g.chu });
  if (!n.ok) return fail(n.loi);
  return { ok: true, value: { requestId: rid.value, denChuyenId: body.denChuyenId, phamVi: "ONBOARD", diemId: null, noiGap: { diaDiemId: n.diaDiemId, chu: n.chu } } };
}
/** Thân chỉ có mã lệnh (Rút, Nhận). */
export function docMaLenhDeNghi(body: Record<string, unknown> | null): KetQua<{ requestId: string }> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const rid = docRequestId(body);
  return rid.ok ? { ok: true, value: { requestId: rid.value } } : rid;
}
/** Thân có MÃ lý do (Không nhận / Bác: nhóm TU_CHOI_NHAN; Duyệt: nhóm PHA_LE — lệnh kiểm nhóm với danh mục đang dùng). */
export function docLyDoDeNghi(body: Record<string, unknown> | null): KetQua<{ requestId: string; lyDo: string }> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  return typeof body.lyDo === "string" && MA_RE.test(body.lyDo) ? { ok: true, value: { requestId: rid.value, lyDo: body.lyDo } } : fail("Chọn một lý do trong danh mục.");
}

// ---- Câu từ chối --------------------------------------------------------------------------------------------------------------------------------------
const CAU_LOI_GUI: Readonly<Record<MaLoiGui, string>> = {
  ck_nguon_khong_chay: "Chỉ nhờ xe khác khi xe của bạn đang chạy.",
  ck_dich_khong_hop_le: "Xe nhận không còn nhận khách được (đã kết thúc hoặc đã huỷ).",
  ck_cuu_ho_chi_xe_dang_chay: "Cứu hộ chỉ nhờ được xe đang chạy.",
  ck_khac_ngay: "Xe nhận chạy ngày khác.",
  ck_dich_chua_co_tai_xe: "Xe nhận chưa có tài xế.",
  ck_cung_tai_xe: "Xe nhận do chính tài xế của xe này lái.",
  ck_diem_khong_cho: "Điểm đón này đã tới, đã bỏ qua hoặc không thuộc xe này.",
  ck_khong_co_khach: "Không có khách nào để chuyển.",
  ck_suat_khong_cho: "Ở điểm này có khách đã có kết quả (đã đón / vắng) hoặc có người đi kèm — không chuyển cả điểm được.",
};
const KHONG_CO_DIA_DIEM = () => error(400, "invalid_input", "Địa điểm nơi gặp không có trong danh mục.");
export const DE_NGHI_DA_DONG = () => loi409("ck_de_nghi_da_dong", [], {}, "Đề nghị đã được trả lời hoặc đã đóng — tải lại.");
export const DE_NGHI_DA_LEO_THANG = () => loi409("da_leo_thang", [], {}, "Đề nghị đang chờ văn phòng duyệt — không rút được.");
export const DE_NGHI_HET_GIO = () => loi409("ck_het_gio", [], {}, "Đề nghị đã hết giờ chờ — tải lại.");
const nowIsoOf = (ms: number) => new Date(ms).toISOString();
const lenhChung = (requestId: string, nguoiId: string, bayGioMs: number) => ({ cmd: crypto.randomUUID(), requestId, lucIso: nowIsoOf(bayGioMs), nguoiId });
const deNghiLo = (r: Pick<DeNghiRow, "id" | "from_trip_id" | "to_trip_id">): DeNghiLo => ({ id: r.id, tuChuyen: r.from_trip_id, denChuyen: r.to_trip_id });
const phamViNhatKy = (p: "STOP" | "ONBOARD") => (p === "STOP" ? "một điểm đón" : "cứu hộ");

// ---- Gửi (tài xế xe nhờ; văn phòng gửi thay cứu hộ) ---------------------------------------------------------------------------------------------------
export interface NguoiGui {
  /** Tài khoản bấm (tài xế xe nhờ, hoặc văn phòng gửi thay cứu hộ — `proposed_by_staff_id`). */
  staffId: string;
  /** Văn phòng gửi thay (nhật ký ghi "văn phòng gửi thay"). */
  vanPhong: boolean;
}
/**
 * LC-14 lớp máy chủ (`kiemGui`) rồi lô gửi. Người gửi (hồ sơ) = tài xế ĐANG LÁI xe nhờ (`nen.trip.driver_party_id`) — route đã kiểm người bấm là chính tài xế
 * đó (hoặc văn phòng có trip.progress gửi thay cứu hộ). Version xe nhận do máy chủ đọc (`dich.trip.version`). Trả id đề nghị (= dấu lệnh lô gửi).
 */
export async function lenhGuiDeNghi(db: D1Database, nen: NenChuyen, dich: NenChuyen | null, b: GuiThan, nguoi: NguoiGui, bayGioMs: number): Promise<{ id: string } | Response> {
  const t = nen.trip;
  if (!dich) return error(404, "not_found", "Không tìm thấy xe nhận.");
  const d = dich.trip;
  const suat = nen.allocs.map(suatVao);
  const diem = b.diemId === null ? null : nen.stops.find((s) => s.id === b.diemId) ?? null;
  const theoDiem = suatCuaDeNghi(b.phamVi, suat, b.diemId);
  const loi = kiemGui({
    phamVi: b.phamVi, nguonId: t.id, dichId: d.id,
    nguon: { trangThai: t.status, ngayChay: t.service_date, taiXePartyId: t.driver_party_id },
    dich: { trangThai: d.status, ngayChay: d.service_date, taiXePartyId: d.driver_party_id },
    diem: diem ? { tripId: diem.trip_id, loai: diem.kind, trangThai: diem.status } : null,
    suatTaiDiem: theoDiem,
  });
  if (loi) return loi409(loi, [], {}, CAU_LOI_GUI[loi]);
  if (t.driver_party_id === null) return loi409("ck_nguon_chua_co_tai_xe", [], {}, "Xe nhờ chưa có tài xế đang lái — không gửi đề nghị được.");
  if (b.noiGap.diaDiemId !== null && !(await tenDiem(db, [b.noiGap.diaDiemId])).has(b.noiGap.diaDiemId)) return KHONG_CO_DIA_DIEM();
  const l = lenhChung(b.requestId, nguoi.staffId, bayGioMs);
  const lo = loGuiDeNghi(db, {
    ...l, dich: { tripId: d.id, version: d.version }, nguonId: t.id, phamVi: b.phamVi, diemId: b.diemId, noiGap: b.noiGap, soKhach: theoDiem.length,
    nguoiGuiPartyId: t.driver_party_id!,
    detail: `${t.code} → ${d.code}: đề nghị chuyển ${theoDiem.length} khách (${phamViNhatKy(b.phamVi)})${nguoi.vanPhong ? " · văn phòng gửi thay" : ""}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? { id: l.cmd } : r.res;
}

// ---- Rút (tài xế xe nhờ) --------------------------------------------------------------------------------------------------------------------------------
/** Chỉ khi Chờ và chưa quá hạn (G-A5-19: Leo thang không rút được). Route đã kiểm người bấm đang lái xe nhờ. */
export async function lenhRutDeNghi(db: D1Database, r: DeNghiRow, b: { requestId: string }, staffId: string, bayGioMs: number): Promise<Response | null> {
  if (r.status === "ESCALATED") return DE_NGHI_DA_LEO_THANG();
  if (r.status !== "PENDING") return DE_NGHI_DA_DONG();
  if (daHetHan(Date.parse(r.proposed_at), r.accept_wait_minutes, bayGioMs)) return DE_NGHI_HET_GIO();
  const lo = loRutDeNghi(db, {
    ...lenhChung(b.requestId, staffId, bayGioMs), deNghi: deNghiLo(r), soKhach: r.pax_count,
    detail: `${r.from_code} → ${r.to_code}: rút đề nghị chuyển ${r.pax_count} khách (${phamViNhatKy(r.scope)})`,
  });
  const k = await chayLo(db, lo, b.requestId);
  return k.ok ? null : k.res;
}

// ---- DTO --------------------------------------------------------------------------------------------------------------------------------------------
/**
 * DTO đề nghị (LC-18). `vanPhong` = kèm dòng kiểm của lần bấm gần nhất + hộp duyệt (Leo thang). Tên điểm đón: tên danh mục hoặc chữ đã che của điểm; nơi gặp:
 * tên danh mục hoặc chữ đã che. Nhãn lý do theo danh mục đang dùng (mã ngưng dùng → hiện mã).
 */
export async function deNghiDto(db: D1Database, rows: readonly DeNghiRow[], bayGioMs: number, vanPhong: boolean): Promise<DeNghiDto[]> {
  if (rows.length === 0) return [];
  const stops = await stopsByTrips(db, [...new Set(rows.filter((r) => r.from_stop_id !== null).map((r) => r.from_trip_id))]);
  const diemCua = new Map(stops.map((s) => [s.id, s]));
  const ten = await tenDiem(db, [...new Set(rows.flatMap((r) => (r.meet_location_id ? [r.meet_location_id] : [])))]);
  const lyDo = new Map((await lyDoDangDung(db)).map((x) => [x.code, x.label]));
  const kiem = vanPhong ? await kiemCuaDeNghi(db, rows.map((r) => r.id)) : [];
  return rows.map((r) => {
    const s = r.from_stop_id ? diemCua.get(r.from_stop_id) : undefined;
    const guiMs = Date.parse(r.proposed_at);
    const tt = trangThaiLucDoc({ trangThai: r.status, guiLucMs: guiMs, phutCho: r.accept_wait_minutes }, bayGioMs);
    const ma = r.decline_reason_code ?? r.reject_reason_code ?? r.override_reason_code;
    const dto: DeNghiDto = {
      id: r.id, tuChuyenId: r.from_trip_id, tuMaChuyen: r.from_code, denChuyenId: r.to_trip_id, denMaChuyen: r.to_code, phamVi: r.scope, soKhach: r.pax_count,
      diemId: r.from_stop_id, tenDiem: s ? s.location_name ?? s.place_text : null,
      noiGap: r.scope === "ONBOARD" ? (r.meet_location_id ? ten.get(r.meet_location_id) ?? null : r.meet_place_text) : null,
      trangThai: tt, nhanTrangThai: NHAN_TRANG_THAI_DE_NGHI[tt], guiLuc: r.proposed_at, hanLuc: nowIsoOf(hetHanLucMs(guiMs, r.accept_wait_minutes)), quyetLuc: r.decided_at,
      lyDo: ma ? lyDo.get(ma) ?? ma : null,
    };
    if (vanPhong) {
      const cua = kiem.filter((k) => k.transfer_id === r.id);
      const lanCuoi = cua.length === 0 ? null : cua[cua.length - 1]!.cmd_id;
      dto.kiem = cua.filter((k) => k.cmd_id === lanCuoi).map((k) => ({ ma: k.rule_code, nhan: k.label, tang: k.rule_tier, ketQua: k.ket_qua, giaTri: k.gia_tri, gioiHan: k.gioi_han }));
      if (r.status === "ESCALATED") dto.hop = hopDuyet(cua.map((k) => ({ tang: k.rule_tier, ketQua: k.ket_qua })));
    }
    return dto;
  });
}
export async function motDeNghiDto(db: D1Database, id: string, bayGioMs: number, vanPhong: boolean): Promise<DeNghiDto | null> {
  const r = await deNghiById(db, id);
  return r ? (await deNghiDto(db, [r], bayGioMs, vanPhong))[0]! : null;
}
