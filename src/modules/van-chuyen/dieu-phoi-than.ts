// ĐỌC THÂN YÊU CẦU của các lệnh chuyến xe (kế hoạch mục 1.7; contracts: TaoChuyenRequest …). Danh sách TRẮNG từng khoá — khoá lạ bị bỏ qua, không bao giờ
// nhận chữ tự do cho lý do (I18: chỉ MÃ lý do), không nhận giờ ghi nhận / dấu lệnh / khoá nơi từ trình duyệt. Logic thuần (không I/O), trả lời báo tiếng Việt.
import { TOI_DA_CHANG_MOT_LAN } from "../../shared/dieu-phoi-loc";
import { UUID_RE } from "../../shared/http";
import { vnLocalToMs } from "../../shared/vn-date";

export type KetQua<T> = { ok: true; value: T } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });
const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const GIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MA_RE = /^[A-Z][A-Z0-9_]{1,39}$/;

/** `{ ngay: "YYYY-MM-DD", gio: "HH:MM" }` giờ VN → mili-giây; sai khuôn → null. */
export function docGioVn(v: unknown): number | null {
  if (!v || typeof v !== "object") return null;
  const { ngay, gio } = v as Record<string, unknown>;
  if (typeof ngay !== "string" || typeof gio !== "string" || !NGAY_RE.test(ngay) || !GIO_RE.test(gio)) return null;
  return vnLocalToMs(ngay, gio);
}
const docRequestId = (b: Record<string, unknown>): KetQua<string> =>
  typeof b.requestId === "string" && UUID_RE.test(b.requestId) && b.requestId.length === 36 ? { ok: true, value: b.requestId } : fail("Thiếu mã yêu cầu (requestId) — tải lại trang rồi bấm lại.");
const docVersion = (b: Record<string, unknown>): KetQua<number> =>
  typeof b.version === "number" && Number.isInteger(b.version) && b.version >= 1 ? { ok: true, value: b.version } : fail("Thiếu phiên bản chuyến (version) — tải lại trang rồi làm lại.");
/** Phá lệ `{ lyDo }` — chỉ MÃ lý do (nhóm, đang dùng: route kiểm với danh mục). Vắng → null. */
function docPhaLe(v: unknown, ten: string): KetQua<{ lyDo: string } | null> {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (typeof v !== "object") return fail(`${ten}: chọn một lý do.`);
  const lyDo = (v as Record<string, unknown>).lyDo;
  return typeof lyDo === "string" && MA_RE.test(lyDo) ? { ok: true, value: { lyDo } } : fail(`${ten}: chọn một lý do trong danh mục.`);
}
const idHopLe = (v: unknown): v is string => typeof v === "string" && v.length >= 3 && v.length <= 64 && /^[A-Za-z0-9-]+$/.test(v);
/** ADR-0057 C2: mã tuyến (nhãn tra giá thuê) — chuỗi mã hoặc null (bỏ tuyến). Có / đang dùng: lệnh kiểm với danh mục. */
const MA_TUYEN_RE = /^[A-Z0-9][A-Z0-9_-]{1,29}$/;
const tuyenHopLe = (v: unknown): v is string | null => v === null || (typeof v === "string" && MA_TUYEN_RE.test(v));

export interface TaoChuyenThan { requestId: string; xeId: string; taiXePartyId: string; batDauMs: number; ketThucMs: number; nghiPhaLe: { lyDo: string } | null; tuyen: string | null }
export function docTaoChuyen(body: Record<string, unknown> | null): KetQua<TaoChuyenThan> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  if (!idHopLe(body.xeId)) return fail("Chọn xe.");
  if (!idHopLe(body.taiXePartyId)) return fail("Chọn tài xế.");
  const batDauMs = docGioVn(body.batDau);
  const ketThucMs = docGioVn(body.ketThuc);
  if (batDauMs === null || ketThucMs === null) return fail("Giờ bắt đầu, giờ kết thúc dự kiến: ngày YYYY-MM-DD và giờ HH:MM.");
  const nghi = docPhaLe(body.nghiPhaLe, "Phá lệ khoảng nghỉ");
  if (!nghi.ok) return nghi;
  if (body.tuyen !== undefined && !tuyenHopLe(body.tuyen)) return fail("Tuyến không hợp lệ.");
  return { ok: true, value: { requestId: rid.value, xeId: body.xeId, taiXePartyId: body.taiXePartyId, batDauMs, ketThucMs, nghiPhaLe: nghi.value, tuyen: (body.tuyen as string | null | undefined) ?? null } };
}

export interface SuaChuyenThan {
  version: number;
  requestId: string;
  xeId: string | null;
  taiXePartyId: string | null;
  batDauMs: number | null;
  ketThucMs: number | null;
  diem: { id: string; thuTu: number; gioXeToi: { ngay: string; gio: string } | null }[];
  phaLe: { lyDo: string } | null;
  nghiPhaLe: { lyDo: string } | null;
  /** ADR-0057 C2: vắng (undefined) = giữ tuyến; null = bỏ tuyến; mã = đổi tuyến. */
  tuyen: string | null | undefined;
  /** ADR-0056 VK3-A: phá lệ cam kết xe riêng / số chỗ (Quản trị / Toàn quyền). Vắng → null. */
  camKetPhaLe: { lyDo: string } | null;
}
export function docSuaChuyen(body: Record<string, unknown> | null): KetQua<SuaChuyenThan> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const v = docVersion(body);
  if (!v.ok) return v;
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  if (body.xeId !== undefined && !idHopLe(body.xeId)) return fail("Chọn xe.");
  if (body.taiXePartyId !== undefined && !idHopLe(body.taiXePartyId)) return fail("Chọn tài xế.");
  const batDauMs = body.batDau === undefined ? null : docGioVn(body.batDau);
  const ketThucMs = body.ketThuc === undefined ? null : docGioVn(body.ketThuc);
  if ((body.batDau !== undefined && batDauMs === null) || (body.ketThuc !== undefined && ketThucMs === null)) return fail("Giờ: ngày YYYY-MM-DD và giờ HH:MM.");
  const diem: SuaChuyenThan["diem"] = [];
  if (body.diem !== undefined) {
    if (!Array.isArray(body.diem) || body.diem.length > 200) return fail("Danh sách điểm không hợp lệ.");
    for (const d of body.diem) {
      if (!d || typeof d !== "object") return fail("Danh sách điểm không hợp lệ.");
      const x = d as Record<string, unknown>;
      if (!idHopLe(x.id) || typeof x.thuTu !== "number" || !Number.isInteger(x.thuTu) || x.thuTu < 1 || x.thuTu > 500) return fail("Thứ tự điểm là số nguyên từ 1.");
      if (x.gioXeToi !== null && x.gioXeToi !== undefined && docGioVn(x.gioXeToi) === null) return fail("Giờ xe tới: ngày YYYY-MM-DD và giờ HH:MM.");
      const g = x.gioXeToi as { ngay: string; gio: string } | null | undefined;
      diem.push({ id: x.id, thuTu: x.thuTu, gioXeToi: g ? { ngay: g.ngay, gio: g.gio } : null });
    }
    if (new Set(diem.map((d) => d.id)).size !== diem.length) return fail("Một điểm xuất hiện hai lần.");
  }
  const phaLe = docPhaLe(body.phaLe, "Phá lệ");
  if (!phaLe.ok) return phaLe;
  const nghi = docPhaLe(body.nghiPhaLe, "Phá lệ khoảng nghỉ");
  if (!nghi.ok) return nghi;
  const camKet = docPhaLe(body.camKetPhaLe, "Phá lệ cam kết");
  if (!camKet.ok) return camKet;
  if (body.tuyen !== undefined && !tuyenHopLe(body.tuyen)) return fail("Tuyến không hợp lệ.");
  return {
    ok: true,
    value: {
      version: v.value, requestId: rid.value, xeId: (body.xeId as string | undefined) ?? null, taiXePartyId: (body.taiXePartyId as string | undefined) ?? null, batDauMs, ketThucMs,
      diem, phaLe: phaLe.value, nghiPhaLe: nghi.value, tuyen: body.tuyen as string | null | undefined, camKetPhaLe: camKet.value,
    },
  };
}

export interface XepThan {
  version: number; requestId: string; chang: { legId: string; soSuat: number; personKeys: string[] }[]; nguoiDiKem: string[]; phaLe: { lyDo: string } | null;
  /** ADR-0056 VK3-A: phá lệ cam kết xe riêng / số chỗ (xếp và thêm khi xe đang chạy). Vắng → null. */
  camKetPhaLe: { lyDo: string } | null;
}
export function docXep(body: Record<string, unknown> | null): KetQua<XepThan> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const v = docVersion(body);
  if (!v.ok) return v;
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  const chang: XepThan["chang"] = [];
  if (body.chang !== undefined) {
    if (!Array.isArray(body.chang) || body.chang.length > TOI_DA_CHANG_MOT_LAN) return fail("Danh sách lượt đưa đón không hợp lệ."); // C34: một con số với màn (src/shared/dieu-phoi-loc.ts)
    for (const c of body.chang) {
      if (!c || typeof c !== "object") return fail("Danh sách lượt đưa đón không hợp lệ.");
      const x = c as Record<string, unknown>;
      if (!idHopLe(x.legId)) return fail("Lượt đưa đón không hợp lệ.");
      if (typeof x.soSuat !== "number" || !Number.isInteger(x.soSuat) || x.soSuat < 1 || x.soSuat > 100) return fail("Số người xếp là số nguyên từ 1.");
      const pk = x.personKeys === undefined ? [] : x.personKeys;
      if (!Array.isArray(pk) || pk.length > x.soSuat || !pk.every(idHopLe) || new Set(pk).size !== pk.length) return fail("Danh sách khách có tên không hợp lệ.");
      chang.push({ legId: x.legId, soSuat: x.soSuat, personKeys: [...(pk as string[])] });
    }
    if (new Set(chang.map((c) => c.legId)).size !== chang.length) return fail("Một lượt đưa đón xuất hiện hai lần.");
  }
  const kem = body.nguoiDiKem === undefined ? [] : body.nguoiDiKem;
  if (!Array.isArray(kem) || kem.length > 10 || !kem.every(idHopLe) || new Set(kem).size !== kem.length) return fail("Danh sách người đi kèm không hợp lệ.");
  if (chang.length === 0 && kem.length === 0) return fail("Chọn lượt đưa đón hoặc người đi kèm để xếp.");
  const phaLe = docPhaLe(body.phaLe, "Phá lệ");
  if (!phaLe.ok) return phaLe;
  const camKet = docPhaLe(body.camKetPhaLe, "Phá lệ cam kết");
  if (!camKet.ok) return camKet;
  return { ok: true, value: { version: v.value, requestId: rid.value, chang, nguoiDiKem: [...(kem as string[])], phaLe: phaLe.value, camKetPhaLe: camKet.value } };
}
function docSuatIds(v: unknown): KetQua<string[]> {
  return Array.isArray(v) && v.length >= 1 && v.length <= 100 && v.every(idHopLe) && new Set(v).size === v.length ? { ok: true, value: [...(v as string[])] } : fail("Chọn ít nhất một suất.");
}
export interface RutThan { version: number; requestId: string; suatIds: string[]; phaLe: { lyDo: string } | null }
export function docRut(body: Record<string, unknown> | null): KetQua<RutThan> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const v = docVersion(body);
  if (!v.ok) return v;
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  const ids = docSuatIds(body.suatIds);
  if (!ids.ok) return ids;
  const phaLe = docPhaLe(body.phaLe, "Phá lệ");
  if (!phaLe.ok) return phaLe;
  return { ok: true, value: { version: v.value, requestId: rid.value, suatIds: ids.value, phaLe: phaLe.value } };
}
/** `camKetPhaLe` (ADR-0056 VK3-A): chỉ chuyến ĐÍCH cần (dời đến xét như xếp); rút không nhận khoá này (C7). */
export interface DoiThan extends RutThan { denChuyenId: string; denVersion: number; camKetPhaLe: { lyDo: string } | null }
export function docDoi(body: Record<string, unknown> | null): KetQua<DoiThan> {
  const r = docRut(body);
  if (!r.ok) return r;
  const b = body!;
  if (!idHopLe(b.denChuyenId)) return fail("Chọn chuyến đích.");
  if (typeof b.denVersion !== "number" || !Number.isInteger(b.denVersion) || b.denVersion < 1) return fail("Thiếu phiên bản chuyến đích — tải lại trang rồi làm lại.");
  const camKet = docPhaLe(b.camKetPhaLe, "Phá lệ cam kết");
  if (!camKet.ok) return camKet;
  return { ok: true, value: { ...r.value, denChuyenId: b.denChuyenId, denVersion: b.denVersion, camKetPhaLe: camKet.value } };
}
export interface HuyThan { version: number; requestId: string; lyDo: string; phaLe: { lyDo: string } | null }
export function docHuy(body: Record<string, unknown> | null): KetQua<HuyThan> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const v = docVersion(body);
  if (!v.ok) return v;
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  if (typeof body.lyDo !== "string" || !MA_RE.test(body.lyDo)) return fail("Chọn lý do huỷ chuyến.");
  const phaLe = docPhaLe(body.phaLe, "Phá lệ");
  if (!phaLe.ok) return phaLe;
  return { ok: true, value: { version: v.value, requestId: rid.value, lyDo: body.lyDo, phaLe: phaLe.value } };
}
/**
 * Đợt 5 D5.1 — "Thêm điểm khi xe đang chạy": thân như lệnh xếp (`chang[].soSuat`, `personKeys`, `phaLe`) nhưng KHÔNG người đi kèm (hướng dẫn viên không lên
 * xe giữa đường qua lệnh này) và phải có ít nhất một chặng.
 */
export function docThemDiem(body: Record<string, unknown> | null): KetQua<XepThan> {
  if (body && body.nguoiDiKem !== undefined && !(Array.isArray(body.nguoiDiKem) && body.nguoiDiKem.length === 0)) return fail("Xe đang chạy không thêm người đi kèm.");
  const r = docXep(body);
  if (!r.ok) return r;
  if (r.value.chang.length === 0) return fail("Chọn lượt đưa đón để thêm vào xe.");
  return r;
}
/** Đợt 5 D5.2 — văn phòng báo khách huỷ: `lyDo` = mã trong nhóm BAO_HUY_DIEM (route kiểm nhóm — sai nhóm 400). */
export interface BaoHuyThan { version: number; requestId: string; lyDo: string }
export function docBaoHuy(body: Record<string, unknown> | null): KetQua<BaoHuyThan> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const v = docVersion(body);
  if (!v.ok) return v;
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  if (typeof body.lyDo !== "string" || !MA_RE.test(body.lyDo)) return fail("Chọn lý do khách huỷ.");
  return { ok: true, value: { version: v.value, requestId: rid.value, lyDo: body.lyDo } };
}
export function docCapNhatDiem(body: Record<string, unknown> | null): KetQua<{ version: number; requestId: string }> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const v = docVersion(body);
  if (!v.ok) return v;
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  return { ok: true, value: { version: v.value, requestId: rid.value } };
}

// ---- Sự kiện điều chỉnh có lý do (ADR-0097 — gói A1, V3-B) --------------------------------------------------------------------------------------------
// Không nhận giờ xảy ra (giờ ghi = lúc bấm), không nhận chữ tự do (Đ2.5 — chỉ MÃ lý do nhóm DIEU_CHINH; route kiểm nhóm + đang dùng — sai 400).
const TRANG_THAI_DICH = ["WAITING", "BOARDED", "NO_SHOW", "CANCELLED_AT_STOP"] as const;
export interface DieuChinhSuatThan { version: number; requestId: string; trangThai: (typeof TRANG_THAI_DICH)[number]; lyDo: string }
export function docDieuChinhSuat(body: Record<string, unknown> | null): KetQua<DieuChinhSuatThan> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const v = docVersion(body);
  if (!v.ok) return v;
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  const tt = body.trangThai;
  if (typeof tt !== "string" || !(TRANG_THAI_DICH as readonly string[]).includes(tt)) return fail("Chọn kết quả đúng của khách.");
  if (typeof body.lyDo !== "string" || !MA_RE.test(body.lyDo)) return fail("Chọn lý do điều chỉnh.");
  return { ok: true, value: { version: v.value, requestId: rid.value, trangThai: tt as DieuChinhSuatThan["trangThai"], lyDo: body.lyDo } };
}
export interface ThuHoiXuatBenThan { version: number; requestId: string; lyDo: string }
export function docThuHoiXuatBen(body: Record<string, unknown> | null): KetQua<ThuHoiXuatBenThan> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const v = docVersion(body);
  if (!v.ok) return v;
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  if (typeof body.lyDo !== "string" || !MA_RE.test(body.lyDo)) return fail("Chọn lý do thu hồi lệnh cho xe chạy.");
  return { ok: true, value: { version: v.value, requestId: rid.value, lyDo: body.lyDo } };
}

// ---- Lệnh TIẾN ĐỘ (Task A15; ADR-0050 VK1-A, I34) ----------------------------------------------------------------------------------------------------------
// `xayRaLuc` — giờ XẢY RA văn phòng khai: CHỈ route văn phòng 31–38 nhận (`nhanXayRa: true`). Route tài xế 21–29 và route 39 (đổi thứ tự) gửi khoá này →
// 400 `xay_ra_khong_nhan` (không lặng lẽ bỏ qua — TC-38). Chuỗi ISO BẮT BUỘC có múi giờ; máy chủ chỉ giữ mili-giây rồi tự định dạng lại (I33).
export type KetQuaTienDo<T> = { ok: true; value: T } | { ok: false; message: string; code: "invalid_input" | "xay_ra_khong_nhan" };
const XAY_RA_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const KHONG_NHAN = (): { ok: false; message: string; code: "xay_ra_khong_nhan" } => ({
  ok: false, code: "xay_ra_khong_nhan", message: "Lệnh này không khai giờ được — giờ ghi là lúc bấm.",
});
const sai = (message: string): { ok: false; message: string; code: "invalid_input" } => ({ ok: false, message, code: "invalid_input" });
function docXayRa(body: Record<string, unknown>, nhanXayRa: boolean): KetQuaTienDo<number | null> {
  if (!("xayRaLuc" in body)) return { ok: true, value: null };
  if (!nhanXayRa) return KHONG_NHAN();
  const v = body.xayRaLuc;
  if (v === null) return { ok: true, value: null };
  if (typeof v !== "string" || !XAY_RA_RE.test(v)) return sai("Giờ xảy ra: chuỗi ngày giờ có múi giờ (vd 2026-09-30T07:31:00+07:00).");
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? { ok: true, value: ms } : sai("Giờ xảy ra không hợp lệ.");
}
export interface TienDoThan { requestId: string; xayRaMs: number | null }
export function docTienDo(body: Record<string, unknown> | null, v: { nhanXayRa: boolean }): KetQuaTienDo<TienDoThan> {
  if (!body) return sai("Dữ liệu không hợp lệ.");
  const x = docXayRa(body, v.nhanXayRa);
  if (!x.ok) return x;
  const rid = docRequestId(body);
  if (!rid.ok) return sai(rid.message);
  return { ok: true, value: { requestId: rid.value, xayRaMs: x.value } };
}
export interface KetThucGianDoanThan extends TienDoThan { lyDo: string }
export function docKetThucGianDoan(body: Record<string, unknown> | null, v: { nhanXayRa: boolean }): KetQuaTienDo<KetThucGianDoanThan> {
  const t = docTienDo(body, v);
  if (!t.ok) return t;
  const lyDo = body!.lyDo;
  if (typeof lyDo !== "string" || !MA_RE.test(lyDo)) return sai("Chọn lý do kết thúc gián đoạn.");
  return { ok: true, value: { ...t.value, lyDo } };
}
/** Từ chối chuyến (ADR-0053 D8.6; kế hoạch A4 T7): `{ lyDo, requestId }` — luôn giờ máy chủ (`xayRaLuc` → 400 `xay_ra_khong_nhan`), version do máy chủ đọc. */
export interface TuChoiThan { requestId: string; lyDo: string }
export function docTuChoi(body: Record<string, unknown> | null): KetQuaTienDo<TuChoiThan> {
  const t = docTienDo(body, { nhanXayRa: false });
  if (!t.ok) return t;
  const lyDo = body!.lyDo;
  if (typeof lyDo !== "string" || !MA_RE.test(lyDo)) return sai("Chọn lý do từ chối chuyến.");
  return { ok: true, value: { requestId: t.value.requestId, lyDo } };
}
/** G-A4-15 bước (2): đọc LỎNG mã yêu cầu (hợp khuôn thì lấy, không thì null) — để nhận ra lệnh lặp của chính mình TRƯỚC khi xét đang lái; không trả 400. */
export const requestIdLong = (body: Record<string, unknown> | null): string | null => {
  if (!body) return null;
  const r = docRequestId(body);
  return r.ok ? r.value : null;
};
export interface DoiThuTuThan { requestId: string; diem: { id: string; thuTu: number }[] }
/** Đổi thứ tự khi đang chạy — luôn giờ máy chủ: `xayRaLuc` → 400 `xay_ra_khong_nhan` ở CẢ route 29 lẫn 39. */
export function docDoiThuTu(body: Record<string, unknown> | null): KetQuaTienDo<DoiThuTuThan> {
  if (!body) return sai("Dữ liệu không hợp lệ.");
  const x = docXayRa(body, false);
  if (!x.ok) return x;
  const rid = docRequestId(body);
  if (!rid.ok) return sai(rid.message);
  if (!Array.isArray(body.diem) || body.diem.length < 1 || body.diem.length > 200) return sai("Chọn thứ tự các điểm chưa tới.");
  const diem: DoiThuTuThan["diem"] = [];
  for (const d of body.diem) {
    if (!d || typeof d !== "object") return sai("Danh sách điểm không hợp lệ.");
    const r = d as Record<string, unknown>;
    if (!idHopLe(r.id) || typeof r.thuTu !== "number" || !Number.isInteger(r.thuTu) || r.thuTu < 1 || r.thuTu > 500) return sai("Thứ tự điểm là số nguyên từ 1.");
    diem.push({ id: r.id, thuTu: r.thuTu });
  }
  if (new Set(diem.map((d) => d.id)).size !== diem.length || new Set(diem.map((d) => d.thuTu)).size !== diem.length) return sai("Một điểm hoặc một thứ tự xuất hiện hai lần.");
  return { ok: true, value: { requestId: rid.value, diem } };
}

/**
 * Thân "Bổ sung tên" của tài xế (ADR-0052 D5b — Đợt 5 A-1b): `{ requestId, suatId, fullName, birthYear, paxCode }`. Ở đây chỉ đọc mã yêu cầu + suất; họ tên,
 * năm sinh, loại khách do route kiểm bằng `kiemHanhKhachTaiXe` của orders (CÙNG luật nhập tên ở đơn). Không nhận giờ xảy ra.
 */
export function docBoSungTen(body: Record<string, unknown> | null): KetQuaTienDo<{ requestId: string; suatId: string }> {
  if (!body) return sai("Dữ liệu không hợp lệ.");
  const x = docXayRa(body, false);
  if (!x.ok) return x;
  const rid = docRequestId(body);
  if (!rid.ok) return sai(rid.message);
  if (!idHopLe(body.suatId)) return sai("Chọn khách cần bổ sung tên.");
  return { ok: true, value: { requestId: rid.value, suatId: body.suatId } };
}

// ---- Họ lệnh mốc giờ hẹn (ADR-0051 — "Đã gọi báo", "Bỏ đánh dấu") — chỉ mã / số / ngày giờ, không chữ tự do (lần 12 câu 1; I18) -----------------------------
function docPhienBan(b: Record<string, unknown>): KetQua<number> {
  return typeof b.phienBan === "number" && Number.isInteger(b.phienBan) && b.phienBan >= 1 && b.phienBan <= 10_000 ? { ok: true, value: b.phienBan } : fail("Thiếu phiên bản mốc giờ hẹn — tải lại.");
}
export interface DaGoiBaoThan { requestId: string; phienBan: number; gioMoi: { ngay: string; gio: string | null } }
export function docDaGoiBao(body: Record<string, unknown> | null): KetQua<DaGoiBaoThan> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  const pb = docPhienBan(body);
  if (!pb.ok) return pb;
  const g = body.gioMoi as Record<string, unknown> | null | undefined;
  if (!g || typeof g !== "object" || typeof g.ngay !== "string" || !NGAY_RE.test(g.ngay) || !(g.gio === null || (typeof g.gio === "string" && GIO_RE.test(g.gio)))) {
    return fail("Giờ hẹn mới: ngày YYYY-MM-DD và giờ HH:MM (hoặc null = chưa chốt giờ).");
  }
  return { ok: true, value: { requestId: rid.value, phienBan: pb.value, gioMoi: { ngay: g.ngay, gio: g.gio as string | null } } };
}
export function docBoDanhDauGoiBao(body: Record<string, unknown> | null): KetQua<{ requestId: string; phienBan: number; gioMoi: null }> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  const pb = docPhienBan(body);
  if (!pb.ok) return pb;
  return { ok: true, value: { requestId: rid.value, phienBan: pb.value, gioMoi: null } };
}
