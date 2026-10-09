// LỆNH ĐỀ NGHỊ CHUYỂN KHÁCH GIỮA HAI XE (ADR-0111, thi hành ADR-0052 D4 / D5c — gói A5): đọc → luật thuần (src/shared/chuyen-khach.ts) → dựng lô
// (dieu-phoi.ts — mọi câu ghi chuyến ở đó) → chạy (`chayLo`). Trả `Response` khi từ chối. Route đã kiểm quyền + "đang lái" trước khi gọi (404 khi không lái).
// Không tên khách, năm sinh, SĐT trong DTO / nhật ký; chữ nơi gặp (đã che) chỉ ở DTO đề nghị; khoá nơi không bao giờ ra ngoài (LC-18, G-A5-9).
import type { ChangChoChuyen, ChangLichChung } from "../orders";
import type { DeNghiDto, KetQuaDeNghi } from "../../shared/contracts";
import {
  chuanNoiGap, daHetHan, hetHanLucMs, hopDuyet, keHoachDiem, kiemChuyen, kiemGui, NHAN_TRANG_THAI_DE_NGHI, quyetDinhSauKiem, suatCuaDeNghi, trangThaiLucDoc,
  type DongKiemChuyen, type MaLoiGui,
} from "../../shared/chuyen-khach";
import { NHAN_NHOM_LY_DO } from "../../shared/dieu-phoi-kieu";
import { error, UUID_RE } from "../../shared/http";
import { khoaNoi } from "../../shared/khoa-noi";
import { msToVnLocal } from "../../shared/vn-date";
import {
  deNghiById, deNghiCuaChuyen, dieuKienChuyenDangDung, kiemCuaDeNghi, lyDoDangDung, stopsByTrips, tenDiem, tripById, type AllocRow, type DeNghiRow,
} from "./chuyen-repo";
import {
  loBacDeNghi, loGuiDeNghi, loHetHanDeNghi, loKhongNhanDeNghi, loLeoThangDeNghi, loRutDeNghi, loXacNhanDeNghi, type CamKetLo, type CapChuyenKhach, type DeNghiLo,
  type DiemMoi, type DongKiemLo,
} from "./dieu-phoi";
import { boSungXe, chinhSachVao, docChung, docNen, docNguCanh, suatVao, type NenChuyen } from "./dieu-phoi-doc";
import { chayLo, loi409, sapLaiDiem } from "./dieu-phoi-route";
import { currentDispatchPolicy } from "./repository";

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
  // MQ-08 (NT-A5-5): đề nghị Chờ đã quá hạn của xe nhờ đóng Hết hạn TRƯỚC khi gửi đề nghị mới — mỗi đề nghị một lô riêng (một sự kiện mỗi lô — C38), mã lệnh
  // mới (không dùng mã của lệnh gửi: UNIQUE request_id sẽ làm lô gửi thành "lệnh lặp"). Lô hết hạn tăng version xe nhận ⇒ đọc lại version trước lô gửi.
  const quaHan = (await deNghiCuaChuyen(db, [t.id])).filter((r) => r.from_trip_id === t.id && quaHanCho(r, bayGioMs));
  for (const r of quaHan) {
    const k = await chayHetHan(db, r, crypto.randomUUID(), nguoi.staffId, bayGioMs);
    if (k) return k;
  }
  const dVersion = quaHan.some((r) => r.to_trip_id === d.id) ? ((await tripById(db, d.id))?.version ?? d.version) : d.version;
  const l = lenhChung(b.requestId, nguoi.staffId, bayGioMs);
  const lo = loGuiDeNghi(db, {
    ...l, dich: { tripId: d.id, version: dVersion }, nguonId: t.id, phamVi: b.phamVi, diemId: b.diemId, noiGap: b.noiGap, soKhach: theoDiem.length,
    nguoiGuiPartyId: t.driver_party_id!,
    detail: `${t.code} → ${d.code}: đề nghị chuyển ${theoDiem.length} khách (${phamViNhatKy(b.phamVi)})${nguoi.vanPhong ? " · văn phòng gửi thay" : ""}`,
  });
  const r = await chayLo(db, lo, b.requestId);
  return r.ok ? { id: l.cmd } : r.res;
}

// ---- Rút (tài xế xe nhờ) --------------------------------------------------------------------------------------------------------------------------------
/**
 * Chỉ khi Chờ (G-A5-19: Leo thang không rút được). Quá hạn → chính lệnh này đóng Hết hạn (MQ-08 — 200 HET_HAN). Route đã kiểm người bấm đang lái xe nhờ.
 */
export async function lenhRutDeNghi(db: D1Database, r: DeNghiRow, b: { requestId: string }, staffId: string, bayGioMs: number): Promise<{ ketQua: KetQuaDeNghi } | Response> {
  if (r.status === "ESCALATED") return DE_NGHI_DA_LEO_THANG();
  if (r.status !== "PENDING") return daDong(r);
  if (quaHanCho(r, bayGioMs)) return (await chayHetHan(db, r, b.requestId, staffId, bayGioMs)) ?? { ketQua: "HET_HAN" };
  const lo = loRutDeNghi(db, {
    ...lenhChung(b.requestId, staffId, bayGioMs), deNghi: deNghiLo(r), soKhach: r.pax_count,
    detail: `${r.from_code} → ${r.to_code}: rút đề nghị chuyển ${r.pax_count} khách (${phamViNhatKy(r.scope)})`,
  });
  const k = await chayLo(db, lo, b.requestId);
  return k.ok ? { ketQua: "DA_RUT" } : k.res;
}

// ---- Hết hạn (MQ-08: đóng khi có người bấm tiếp vào đề nghị Chờ đã quá hạn — không Cron) ------------------------------------------------------------
function quaHanCho(r: DeNghiRow, bayGioMs: number): boolean {
  return r.status === "PENDING" && daHetHan(Date.parse(r.proposed_at), r.accept_wait_minutes, bayGioMs);
}
/** Đề nghị đã rời Chờ / Leo thang: tự huỷ (P4, MQ-09) → `da_huy`; còn lại → đã đóng. */
const daDong = (r: DeNghiRow): Response => (r.status === "VOID" ? DE_NGHI_DA_HUY() : DE_NGHI_DA_DONG());
async function chayHetHan(db: D1Database, r: DeNghiRow, requestId: string, staffId: string, bayGioMs: number): Promise<Response | null> {
  const lo = loHetHanDeNghi(db, {
    ...lenhChung(requestId, staffId, bayGioMs), deNghi: deNghiLo(r), soKhach: r.pax_count,
    detail: `${r.from_code} → ${r.to_code}: đề nghị chuyển ${r.pax_count} khách (${phamViNhatKy(r.scope)}) hết giờ chờ`,
  });
  const k = await chayLo(db, lo, requestId);
  return k.ok ? null : k.res;
}

// ---- Không nhận (tài xế xe nhận) -----------------------------------------------------------------------------------------------------------------------
const LY_DO_SAI_NHOM = (nhom: keyof typeof NHAN_NHOM_LY_DO) => error(400, "invalid_input", `Lý do không có trong nhóm "${NHAN_NHOM_LY_DO[nhom]}".`);
async function lyDoTrongNhom(db: D1Database, code: string, nhom: string): Promise<boolean> {
  return (await lyDoDangDung(db)).some((x) => x.code === code && x.reason_group === nhom);
}
/** Đ3 (b): chỉ khi Chờ, trước hạn; lý do nhóm TU_CHOI_NHAN; người quyết = tài xế đang lái xe nhận (`taiXePartyId` — route đã kiểm người bấm). */
export async function lenhKhongNhanDeNghi(
  db: D1Database, r: DeNghiRow, b: { requestId: string; lyDo: string }, staffId: string, taiXePartyId: string, bayGioMs: number,
): Promise<{ ketQua: KetQuaDeNghi } | Response> {
  if (!(await lyDoTrongNhom(db, b.lyDo, "TU_CHOI_NHAN"))) return LY_DO_SAI_NHOM("TU_CHOI_NHAN");
  if (r.status !== "PENDING") return daDong(r);
  if (quaHanCho(r, bayGioMs)) return (await chayHetHan(db, r, b.requestId, staffId, bayGioMs)) ?? { ketQua: "HET_HAN" };
  const lo = loKhongNhanDeNghi(db, {
    ...lenhChung(b.requestId, staffId, bayGioMs), deNghi: deNghiLo(r), taiXePartyId, lyDo: b.lyDo, soKhach: r.pax_count,
    detail: `${r.from_code} → ${r.to_code}: xe nhận không nhận ${r.pax_count} khách (${phamViNhatKy(r.scope)})`,
  });
  const k = await chayLo(db, lo, b.requestId);
  return k.ok ? { ketQua: "KHONG_NHAN" } : k.res;
}

// ---- Nhận (tài xế xe nhận) / Duyệt (Quản trị, Toàn quyền) -------------------------------------------------------------------------------------------
/** Dữ liệu của orders do THÂN ROUTE đọc sau `can()` (bài src/orders-cong-bo.test.ts): chặng quanh ngày chạy, hành khách của chặng xe nhờ (bản chốt). */
export interface ChangChoDeNghi {
  lich: readonly ChangLichChung[];
  hk: readonly ChangChoChuyen[];
}
export const DE_NGHI_DA_HUY = () => loi409("da_huy", [], {}, "Đề nghị đã huỷ (khách đã chuyển sang xe khác hoặc chuyến đã đổi) — tải lại.");
const KHACH_DA_DOI = () => loi409("ck_khach_doi", [], {}, "Khách của đề nghị đã đổi từ lúc gửi — tải lại; xe nhờ gửi đề nghị mới nếu còn cần.");
const CHI_BAC = () => loi409("ck_chi_bac", [], {}, "Đề nghị có điều kiện bắt buộc không đạt — chỉ Bác được.");
const KHONG_CO_CHINH_SACH = () => loi409("ck_chua_co_chinh_sach", [], {}, "Chưa có chính sách điều phối hiện hành.");
const dangChiemCho = (a: AllocRow) => a.valid_to_at === null && (a.status === "WAITING" || a.status === "BOARDED");

interface KiemDeNghi {
  dong: DongKiemChuyen[];
  congTacBat: boolean;
  /** Cam kết xe nhận SAU chuyển. */
  camKet: ReturnType<typeof kiemChuyen>["camKet"];
  nguon: NenChuyen;
  dich: NenChuyen;
  suat: AllocRow[];
}
/** Đọc mới (hai chuyến, danh mục, chính sách LÚC BẤM — cùng mốc với trigger, chặng) rồi chạy `kiemChuyen` — MỘT luật cho Nhận và Duyệt. */
async function kiemLai(db: D1Database, r: DeNghiRow, c: ChangChoDeNghi, bayGioMs: number): Promise<KiemDeNghi | Response> {
  const luc = nowIsoOf(bayGioMs);
  const [nguon, dich, danhMuc, cs] = await Promise.all([docNen(db, r.from_trip_id), docNen(db, r.to_trip_id), dieuKienChuyenDangDung(db), currentDispatchPolicy(db, luc)]);
  if (!nguon || !dich) return DE_NGHI_DA_DONG();
  const chinhSach = chinhSachVao(cs);
  if (!cs || !chinhSach) return KHONG_CO_CHINH_SACH();
  const suatNguon = suatCuaDeNghi(r.scope, nguon.allocs.map(suatVao), r.from_stop_id);
  if (suatNguon.length !== r.pax_count) return KHACH_DA_DOI();
  const ids = new Set(suatNguon.map((s) => s.id));
  const suat = nguon.allocs.filter((a) => ids.has(a.id));
  const chung = await docChung(db, luc, msToVnLocal(bayGioMs).date);
  const legKhach = [...new Set(suat.flatMap((a) => (a.kind === "PASSENGER" && a.leg_id ? [a.leg_id] : [])))];
  const nc = await docNguCanh(db, dich, c.lich, chung, legKhach);
  await boSungXe(db, chung, [nguon.trip.vehicle_id]);
  const soChoNguon = chung.xe.find((x) => x.id === nguon.trip.vehicle_id)?.passenger_capacity ?? 0;
  const t = dich.trip;
  const legDich = [...new Set(dich.allocs.flatMap((a) => (a.valid_to_at === null && a.kind === "PASSENGER" && a.leg_id ? [a.leg_id] : [])))];
  const diem = r.from_stop_id ? nguon.stops.find((s) => s.id === r.from_stop_id) ?? null : null;
  const kq = kiemChuyen({
    phamVi: r.scope,
    nguon: { id: nguon.trip.id, soCho: soChoNguon, tai: nguon.allocs.filter(dangChiemCho).length },
    diemNguon: diem ? { id: diem.id, trangThai: diem.status } : null,
    dich: {
      id: t.id, ma: t.code, trangThai: t.status, batDauMs: t.planned_start_ms, batDauSomNhatMs: t.earliest_start_ms, ketThucMs: t.planned_end_ms, ketThucThatMs: t.ended_ms,
      xe: nc.chuyen.xe, taiXe: nc.chuyen.taiXe, camKetPhaLeKhoa: t.commitment_override_key,
    },
    taiDich: dich.allocs.filter(dangChiemCho).length,
    suatChuyen: suatNguon,
    changChuyen: legKhach.flatMap((id) => (nc.chang.has(id) ? [nc.chang.get(id)!] : [])),
    changTrenDich: legDich.flatMap((id) => (nc.chang.has(id) ? [nc.chang.get(id)!] : [])),
    chuyenKhac: nc.chuyenKhac,
    chinhSach, hangBang: chung.hangBang, dieuKien: chung.dieuKien,
    danhMuc: danhMuc.map((m) => ({ code: m.code, tier: m.tier, active: true })),
    bayGioMs,
  });
  return { dong: kq.dong, camKet: kq.camKet, congTacBat: cs.auto_confirm_transfer === 1, nguon, dich, suat };
}
const kiemLo = (dong: readonly DongKiemChuyen[]): DongKiemLo[] => dong.map((d) => ({ ma: d.ma, tang: d.tang, ketQua: d.ketQua, giaTri: d.giaTri, gioiHan: d.gioiHan }));
const khongDatNhatKy = (dong: readonly DongKiemChuyen[]): string => {
  const ma = dong.filter((d) => d.ketQua === "KHONG_DAT").map((d) => d.ma);
  return ma.length > 0 ? ` · không đạt: ${ma.join(", ")}` : "";
};

/**
 * Kế hoạch ghi của lô xác nhận (MỘT luật cho Nhận và Duyệt): điểm ở xe nhận (`keHoachDiem` — ghép theo khoá nơi, nơi gặp luôn điểm mới), sắp lại đón trước
 * trả (`sapLaiDiem`), cặp đóng / mở, bản chốt khi xe nhận đã xuất bến (khách có tên + người đi kèm; khách chưa tên vào bản chốt khi được gắn tên).
 */
async function keHoachXacNhan(r: DeNghiRow, k: KiemDeNghi, hk: readonly ChangChoChuyen[]) {
  const b = k.dich.trip;
  // Nơi gặp (cứu hộ): điểm danh mục → khoá "L:<id>"; chữ → khoá trên chữ ĐÃ CHE (chỉ chữ đã che được lưu — G-A5-9). Điểm nơi gặp luôn là điểm MỚI (không ghép).
  const noiGapKey = r.scope !== "ONBOARD" ? null : r.meet_location_id ? `L:${r.meet_location_id}` : await khoaNoi({ locationId: null, placeText: r.meet_place_text });
  const kh = keHoachDiem({
    suatChuyen: k.suat.map(suatVao),
    diemNguon: k.nguon.stops.map((s) => ({ id: s.id, loai: s.kind, trangThai: s.status, placeKey: s.place_key, seq: s.seq })),
    diemDich: k.dich.stops.map((s) => ({ id: s.id, loai: s.kind, trangThai: s.status, placeKey: s.place_key })),
    noiGapPlaceKey: noiGapKey,
  });
  let seq = Math.max(0, ...k.dich.stops.map((s) => s.seq));
  const diemMoi: DiemMoi[] = [];
  const idCua = new Map<string, string>();
  for (const t of kh.them) {
    const goc = t.noiGap ? null : k.nguon.stops.find((s) => s.kind === t.loai && s.place_key === t.placeKey) ?? null;
    const id = crypto.randomUUID();
    idCua.set(t.khoa, id);
    diemMoi.push({
      id, tripId: b.id, seq: ++seq, loai: t.loai, placeKey: t.placeKey,
      locationId: t.noiGap ? r.meet_location_id : goc?.location_id ?? null,
      placeText: t.noiGap ? (r.meet_location_id ? null : r.meet_place_text) : goc?.place_text ?? null,
    });
  }
  const giai = (x: string | null) => (x === null ? null : idCua.get(x) ?? x);
  const cap: CapChuyenKhach[] = kh.gan.map((g) => ({ dongId: g.suatId, moId: crypto.randomUUID(), len: giai(g.len), xuong: giai(g.xuong) }));
  const doiThuTu = sapLaiDiem(k.dich.stops, diemMoi, b.id, [
    ...k.dich.allocs.filter((a) => a.valid_to_at === null).map((a) => ({ board: a.board_stop_id, alight: a.alight_stop_id })),
    ...cap.map((c) => ({ board: c.len, alight: c.xuong })),
  ]);
  const dong = new Map<string, string>();
  for (const ch of hk) for (const p of ch.nguoi) dong.set(`${ch.legId}|${p.personKey}`, p.rowId);
  type DongChot = { allocationId: string; passengerRowId: string | null; crewPartyId: string | null };
  const chot: DongChot[] = b.status !== "RUNNING" ? [] : cap.flatMap((c): DongChot[] => {
    const a = k.suat.find((x) => x.id === c.dongId)!;
    if (a.kind === "CREW") return a.crew_party_id ? [{ allocationId: c.moId, passengerRowId: null, crewPartyId: a.crew_party_id }] : [];
    const row = a.passenger_key !== null && a.leg_id !== null ? dong.get(`${a.leg_id}|${a.passenger_key}`) : undefined;
    return row ? [{ allocationId: c.moId, passengerRowId: row, crewPartyId: null }] : [];
  });
  return { diemMoi, doiThuTu, cap, chot };
}
async function laCu(res: Response): Promise<boolean> {
  if (res.status !== 409) return false;
  return ((await res.clone().json()) as { error?: { code?: string } }).error?.code === "stale";
}

/**
 * MỘT hàm cho Nhận (tài xế xe nhận) và Duyệt (Quản trị / Toàn quyền, lý do PHA_LE). Đọc mới → kiểm → lô (leo thang / xác nhận). Lô cổng đôi chạy đua với
 * lệnh khác trên một trong hai chuyến (NT-A5-20): thua cổng vì version → đọc lại và thử LẠI MỘT LẦN.
 */
async function quyetDeNghi(
  db: D1Database, rid: string, c: ChangChoDeNghi, b: { requestId: string }, staffId: string, bayGioMs: number,
  quyet: { kieu: "NHAN"; taiXePartyId: string } | { kieu: "DUYET"; lyDo: string },
): Promise<{ ketQua: KetQuaDeNghi } | Response> {
  for (let lan = 0; ; lan++) {
    const r = await deNghiById(db, rid);
    if (!r) return DE_NGHI_DA_DONG();
    if (quyet.kieu === "NHAN") {
      if (r.status !== "PENDING") return daDong(r);
      if (quaHanCho(r, bayGioMs)) return (await chayHetHan(db, r, b.requestId, staffId, bayGioMs)) ?? { ketQua: "HET_HAN" };
    } else if (r.status !== "ESCALATED") return daDong(r);
    const k = await kiemLai(db, r, c, bayGioMs);
    if (k instanceof Response) return k;
    const l = lenhChung(b.requestId, staffId, bayGioMs);
    const truoc = `${r.from_code} → ${r.to_code}: ${phamViNhatKy(r.scope)}, ${r.pax_count} khách`;
    if (quyet.kieu === "NHAN" && quyetDinhSauKiem(k.dong, k.congTacBat) === "ESCALATED") {
      const lo = loLeoThangDeNghi(db, {
        ...l, deNghi: deNghiLo(r), taiXePartyId: quyet.taiXePartyId, kiem: kiemLo(k.dong), soKhach: r.pax_count,
        detail: `${truoc} — chờ văn phòng duyệt${khongDatNhatKy(k.dong)}${k.congTacBat ? "" : " · tự đồng ý đang tắt"}`,
      });
      const x = await chayLo(db, lo, b.requestId);
      if (x.ok) return { ketQua: "LEO_THANG" };
      if (lan === 0 && (await laCu(x.res))) continue;
      return x.res;
    }
    if (quyet.kieu === "DUYET") {
      const cu = await kiemCuaDeNghi(db, [r.id]);
      if (hopDuyet([...cu.map((x) => ({ tang: x.rule_tier, ketQua: x.ket_qua })), ...k.dong]) === "CHI_BAC") return CHI_BAC();
    }
    const kh = await keHoachXacNhan(r, k, c.hk);
    // ADR-0056 A3 (NT-A5-11): Duyệt mà cam kết xe nhận không đạt → ghi khoá phá lệ (lý do của lần duyệt); hết vi phạm mà cột đang có → xoá (chỉ xe chưa chạy —
    // khuôn loCapNhatDiem: không chạm cột khi xe đang chạy). Nhận tự động không bao giờ ghi (CAM_KET_DICH không đạt ⇒ leo thang).
    const ck = k.camKet;
    const camKetDich: CamKetLo | null = quyet.kieu === "DUYET" && ck.khoa !== null && !ck.daPhaLe ? { lyDo: quyet.lyDo, khoa: ck.khoa }
      : ck.khoa === null && k.dich.trip.commitment_override_key !== null && k.dich.trip.status !== "RUNNING" ? { lyDo: null, khoa: null } : null;
    const lo = loXacNhanDeNghi(db, {
      ...l, deNghi: deNghiLo(r), nguonVersion: k.nguon.trip.version, dichVersion: k.dich.trip.version,
      quyet: quyet.kieu === "NHAN" ? { kieu: "MAY", taiXePartyId: quyet.taiXePartyId } : { kieu: "NGUOI", lyDo: quyet.lyDo },
      kiem: kiemLo(k.dong), diemMoi: kh.diemMoi, doiThuTu: kh.doiThuTu, dichDangChay: k.dich.trip.status === "RUNNING", cap: kh.cap,
      diemNguon: r.scope === "STOP" ? r.from_stop_id : null, chot: kh.chot, camKetDich,
      detail: `${truoc} — ${quyet.kieu === "NHAN" ? "máy tự xác nhận" : "văn phòng duyệt"}${kh.diemMoi.length > 0 ? `; ${kh.diemMoi.length} điểm mới ở xe nhận` : ""}${khongDatNhatKy(k.dong)}`,
    });
    const x = await chayLo(db, lo, b.requestId, 2);
    if (x.ok) return { ketQua: "DA_CHUYEN" };
    if (lan === 0 && (await laCu(x.res))) continue;
    return x.res;
  }
}
/** Tài xế xe nhận bấm Nhận (Chờ, trước hạn): mọi điều kiện đạt + công tắc tự đồng ý (chính sách LÚC BẤM) bật → xác nhận (MAY); còn lại leo thang. */
export function lenhNhanDeNghi(
  db: D1Database, rid: string, c: ChangChoDeNghi, b: { requestId: string }, staffId: string, taiXePartyId: string, bayGioMs: number,
): Promise<{ ketQua: KetQuaDeNghi } | Response> {
  return quyetDeNghi(db, rid, c, b, staffId, bayGioMs, { kieu: "NHAN", taiXePartyId });
}
/** ĐP4: chỉ đề nghị Leo thang; lý do nhóm PHA_LE; chạy lại kiểm — có dòng không đạt tầng LOI (mọi lần kiểm) → 409, không ghi. Route đã kiểm trip.override. */
export async function lenhDuyetDeNghi(
  db: D1Database, rid: string, c: ChangChoDeNghi, b: { requestId: string; lyDo: string }, staffId: string, bayGioMs: number,
): Promise<{ ketQua: KetQuaDeNghi } | Response> {
  if (!(await lyDoTrongNhom(db, b.lyDo, "PHA_LE"))) return LY_DO_SAI_NHOM("PHA_LE");
  return quyetDeNghi(db, rid, c, b, staffId, bayGioMs, { kieu: "DUYET", lyDo: b.lyDo });
}

// ---- Bác (Quản trị, Toàn quyền) --------------------------------------------------------------------------------------------------------------------------
/** Chỉ đề nghị Leo thang; lý do nhóm TU_CHOI_NHAN; suất không đổi. Route đã kiểm trip.override. */
export async function lenhBacDeNghi(db: D1Database, r: DeNghiRow, b: { requestId: string; lyDo: string }, staffId: string, bayGioMs: number): Promise<{ ketQua: KetQuaDeNghi } | Response> {
  if (!(await lyDoTrongNhom(db, b.lyDo, "TU_CHOI_NHAN"))) return LY_DO_SAI_NHOM("TU_CHOI_NHAN");
  if (r.status !== "ESCALATED") return daDong(r);
  const lo = loBacDeNghi(db, {
    ...lenhChung(b.requestId, staffId, bayGioMs), deNghi: deNghiLo(r), lyDo: b.lyDo, soKhach: r.pax_count,
    detail: `${r.from_code} → ${r.to_code}: văn phòng không duyệt đề nghị chuyển ${r.pax_count} khách (${phamViNhatKy(r.scope)})`,
  });
  const k = await chayLo(db, lo, b.requestId);
  return k.ok ? { ketQua: "DA_BAC" } : k.res;
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
