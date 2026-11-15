// dang-ky/xac-minh.ts — luật thuần của bước xác minh phiếu đăng ký (ADR-0207 Đ2, Đ3; ADR-0210 Đ1). Không I/O. Route ở xac-minh-route.ts; câu ghi ở repository.ts.
import { laMaLyDoPhieu, type MaLyDoPhieu } from "../../shared/dang-ky-hien-thi.ts";

export type KetQuaMuc = "DAT" | "KHONG_DAT";
export type Kiem<T> = { ok: true; value: T } | { ok: false; message: string };

const MA_PHIEU_RE = /^DK_[A-Z]{8}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const laMaPhieu = (s: unknown): s is string => typeof s === "string" && MA_PHIEU_RE.test(s);
export const laMaTep = (s: unknown): s is string => typeof s === "string" && UUID_RE.test(s);
const MA_MUC_RE = /^[A-Z][A-Z0-9_]{1,39}$/;

/**
 * Mục phải kết luận «đạt» trước khi «xác minh đạt» (ADR-0210 Đ1): HỢP của mục chỉ phiếu cần (chính sách đăng ký, cách nhau dấu phẩy) và mục bắt buộc của hồ sơ (parties).
 * Thứ tự cố định (phiếu trước, rồi hồ sơ), không trùng.
 */
export function mucBatBuoc(phieuChiCan: string, mucHoSo: readonly string[]): string[] {
  const rieng = phieuChiCan.split(",").map((x) => x.trim()).filter((x) => MA_MUC_RE.test(x));
  return [...new Set([...rieng, ...mucHoSo])];
}

/** Mục chưa «đạt» ở bản kết luận MỚI NHẤT của bản khai hiện hành (chưa kết luận, hay «không đạt»). */
export function mucChuaDat(batBuoc: readonly string[], moiNhat: ReadonlyMap<string, KetQuaMuc>): string[] {
  return batBuoc.filter((m) => moiNhat.get(m) !== "DAT");
}

/** Số bản khai người xác minh đã xem (lấy từ GET phiếu): số nguyên ≥ 1. */
const laPhienBan = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 1;
const khongThua = (body: Record<string, unknown>, cho: readonly string[]): boolean => Object.keys(body).every((k) => cho.includes(k));

/** Thân `ket-luan`: `{ muc, dat, lyDo?, phienBan }`. «không đạt» đòi một mã lý do trong danh sách đóng; «đạt» không kèm lý do. Mục phải thuộc tập mục bắt buộc. */
export function kiemKetLuan(body: Record<string, unknown> | null, batBuoc: readonly string[]): Kiem<{ muc: string; dat: boolean; lyDo: MaLyDoPhieu | null; phienBan: number }> {
  if (!body || !khongThua(body, ["muc", "dat", "lyDo", "phienBan"]) || !laPhienBan(body.phienBan)) return { ok: false, message: "Yêu cầu không hợp lệ." };
  const phienBan = body.phienBan;
  if (typeof body.muc !== "string" || !batBuoc.includes(body.muc)) return { ok: false, message: "Mục này không nằm trong các mục cần xác minh." };
  if (typeof body.dat !== "boolean") return { ok: false, message: "Hãy chọn «Đạt» hoặc «Không đạt»." };
  if (body.dat) return body.lyDo === undefined || body.lyDo === null ? { ok: true, value: { muc: body.muc, dat: true, lyDo: null, phienBan } } : { ok: false, message: "Kết luận «Đạt» không kèm lý do." };
  if (!laMaLyDoPhieu(body.lyDo)) return { ok: false, message: "Hãy chọn một lý do trong danh sách." };
  return { ok: true, value: { muc: body.muc, dat: false, lyDo: body.lyDo, phienBan } };
}

/** Thân `bo-sung`, `tu-choi`: `{ lyDo, phienBan }` — một mã trong danh sách đóng và số bản khai người xác minh đã xem; không trường nào khác. */
export function kiemLyDo(body: Record<string, unknown> | null): Kiem<{ lyDo: MaLyDoPhieu; phienBan: number }> {
  if (!body || !khongThua(body, ["lyDo", "phienBan"]) || !laMaLyDoPhieu(body.lyDo) || !laPhienBan(body.phienBan)) return { ok: false, message: "Hãy chọn một lý do trong danh sách." };
  return { ok: true, value: { lyDo: body.lyDo, phienBan: body.phienBan } };
}

export type HoSoDich = { kieu: "MOI" } | { kieu: "CO_SAN"; partyId: string };
const PARTY_ID_RE = /^[A-Za-z0-9_-]{1,100}$/;

/**
 * Thân `dat`: `{ phienBan, hoSo?: { kieu: "MOI" } | { kieu: "CO_SAN"; partyId }, nguoiGioiThieuPartyId? }`. `hoSo` là KẾT LUẬN DANH BẠ; vắng mặt thì dùng kết luận đã ghi trước đó (nếu có —
 * không có thì route trả 409). Người giới thiệu: mã hồ sơ, tuỳ chọn.
 */
export function kiemDat(body: Record<string, unknown> | null): Kiem<{ hoSo: HoSoDich | null; nguoiGioiThieuPartyId: string | null; phienBan: number }> {
  const loi = { ok: false, message: "Yêu cầu không hợp lệ." } as const;
  if (!body || !khongThua(body, ["hoSo", "nguoiGioiThieuPartyId", "phienBan"]) || !laPhienBan(body.phienBan)) return loi;
  let hoSo: HoSoDich | null = null;
  const h = body.hoSo;
  if (h !== undefined && h !== null) {
    if (typeof h !== "object" || Array.isArray(h)) return loi;
    const o = h as Record<string, unknown>;
    if (o.kieu === "MOI" && khongThua(o, ["kieu"])) hoSo = { kieu: "MOI" };
    else if (o.kieu === "CO_SAN" && khongThua(o, ["kieu", "partyId"]) && typeof o.partyId === "string" && PARTY_ID_RE.test(o.partyId)) hoSo = { kieu: "CO_SAN", partyId: o.partyId };
    else return loi;
  }
  const g = body.nguoiGioiThieuPartyId;
  if (g !== undefined && g !== null && !(typeof g === "string" && PARTY_ID_RE.test(g))) return loi;
  return { ok: true, value: { hoSo, nguoiGioiThieuPartyId: typeof g === "string" ? g : null, phienBan: body.phienBan } };
}

/** Gói lỗi lô → 409 có câu rõ (trigger của phiếu). null = không phải lỗi của bước này. */
export function loiLoXacMinh(e: unknown): { status: 409; code: string; message: string } | null {
  const m = e instanceof Error ? e.message : "";
  if (m.includes("dk_registration_transition")) return { status: 409, code: "registration_state_changed", message: "Phiếu vừa được người khác xử lý. Hãy mở lại phiếu." };
  return null;
}
