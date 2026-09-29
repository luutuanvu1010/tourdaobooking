// ĐỌC THÂN YÊU CẦU của các lệnh chuyến xe (kế hoạch mục 1.7; contracts: TaoChuyenRequest …). Danh sách TRẮNG từng khoá — khoá lạ bị bỏ qua, không bao giờ
// nhận chữ tự do cho lý do (I18: chỉ MÃ lý do), không nhận giờ ghi nhận / dấu lệnh / khoá nơi từ trình duyệt. Logic thuần (không I/O), trả lời báo tiếng Việt.
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

export interface TaoChuyenThan { requestId: string; xeId: string; taiXePartyId: string; batDauMs: number; ketThucMs: number; nghiPhaLe: { lyDo: string } | null }
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
  return { ok: true, value: { requestId: rid.value, xeId: body.xeId, taiXePartyId: body.taiXePartyId, batDauMs, ketThucMs, nghiPhaLe: nghi.value } };
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
  return {
    ok: true,
    value: {
      version: v.value, requestId: rid.value, xeId: (body.xeId as string | undefined) ?? null, taiXePartyId: (body.taiXePartyId as string | undefined) ?? null, batDauMs, ketThucMs,
      diem, phaLe: phaLe.value, nghiPhaLe: nghi.value,
    },
  };
}

export interface XepThan { version: number; requestId: string; chang: { legId: string; soSuat: number; personKeys: string[] }[]; nguoiDiKem: string[]; phaLe: { lyDo: string } | null }
export function docXep(body: Record<string, unknown> | null): KetQua<XepThan> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const v = docVersion(body);
  if (!v.ok) return v;
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  const chang: XepThan["chang"] = [];
  if (body.chang !== undefined) {
    if (!Array.isArray(body.chang) || body.chang.length > 50) return fail("Danh sách chặng không hợp lệ.");
    for (const c of body.chang) {
      if (!c || typeof c !== "object") return fail("Danh sách chặng không hợp lệ.");
      const x = c as Record<string, unknown>;
      if (!idHopLe(x.legId)) return fail("Chặng không hợp lệ.");
      if (typeof x.soSuat !== "number" || !Number.isInteger(x.soSuat) || x.soSuat < 1 || x.soSuat > 100) return fail("Số người xếp là số nguyên từ 1.");
      const pk = x.personKeys === undefined ? [] : x.personKeys;
      if (!Array.isArray(pk) || pk.length > x.soSuat || !pk.every(idHopLe) || new Set(pk).size !== pk.length) return fail("Danh sách khách có tên không hợp lệ.");
      chang.push({ legId: x.legId, soSuat: x.soSuat, personKeys: [...(pk as string[])] });
    }
    if (new Set(chang.map((c) => c.legId)).size !== chang.length) return fail("Một chặng xuất hiện hai lần.");
  }
  const kem = body.nguoiDiKem === undefined ? [] : body.nguoiDiKem;
  if (!Array.isArray(kem) || kem.length > 10 || !kem.every(idHopLe) || new Set(kem).size !== kem.length) return fail("Danh sách người đi kèm không hợp lệ.");
  if (chang.length === 0 && kem.length === 0) return fail("Chọn chặng hoặc người đi kèm để xếp.");
  const phaLe = docPhaLe(body.phaLe, "Phá lệ");
  if (!phaLe.ok) return phaLe;
  return { ok: true, value: { version: v.value, requestId: rid.value, chang, nguoiDiKem: [...(kem as string[])], phaLe: phaLe.value } };
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
export interface DoiThan extends RutThan { denChuyenId: string; denVersion: number }
export function docDoi(body: Record<string, unknown> | null): KetQua<DoiThan> {
  const r = docRut(body);
  if (!r.ok) return r;
  const b = body!;
  if (!idHopLe(b.denChuyenId)) return fail("Chọn chuyến đích.");
  if (typeof b.denVersion !== "number" || !Number.isInteger(b.denVersion) || b.denVersion < 1) return fail("Thiếu phiên bản chuyến đích — tải lại trang rồi làm lại.");
  return { ok: true, value: { ...r.value, denChuyenId: b.denChuyenId, denVersion: b.denVersion } };
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
export function docCapNhatDiem(body: Record<string, unknown> | null): KetQua<{ version: number; requestId: string }> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const v = docVersion(body);
  if (!v.ok) return v;
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  return { ok: true, value: { version: v.value, requestId: rid.value } };
}
