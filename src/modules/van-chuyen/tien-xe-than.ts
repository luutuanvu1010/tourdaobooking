// ĐỌC THÂN YÊU CẦU của route tiền xe thuê (ADR-0057 T1 B5, T2 C9 — kế hoạch Đợt 4 Task 4, 10). Danh sách TRẮNG từng khoá, khoá lạ bỏ qua. Số tiền chỉ nhận
// ở ô người có quyền nhập (giá bảng, giá thoả thuận, điều chỉnh) và phải là số NGUYÊN an toàn (VNĐ). Logic thuần, lời báo tiếng Việt.
import { UUID_RE } from "../../shared/http";
import { isISODate } from "../../shared/vn-date";
import type { KetQua } from "./dieu-phoi-than";

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });
/** Mã tuyến / cỡ xe (máy sinh — `T001`, `S001`; dữ liệu cũ có thể khác): chữ HOA, số, gạch. */
export const MA_TUYEN_CO_RE = /^[A-Z0-9][A-Z0-9_-]{1,29}$/;
const docRequestId = (b: Record<string, unknown>): KetQua<string> =>
  typeof b.requestId === "string" && UUID_RE.test(b.requestId) && b.requestId.length === 36 ? { ok: true, value: b.requestId } : fail("Thiếu mã yêu cầu (requestId) — tải lại trang rồi bấm lại.");
const idHopLe = (v: unknown): v is string => typeof v === "string" && v.length >= 3 && v.length <= 64 && /^[A-Za-z0-9-]+$/.test(v);
const ngayHopLe = (v: unknown): v is string => typeof v === "string" && isISODate(v);
function chuToiDa(v: unknown, toiDa: number, ten: string): KetQua<string | null> {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (typeof v !== "string") return fail(`${ten} không hợp lệ.`);
  const t = v.trim();
  if (t.length > toiDa) return fail(`${ten} tối đa ${toiDa} ký tự.`);
  return { ok: true, value: t === "" ? null : t };
}
const maHoacNull = (v: unknown): KetQua<string | null> =>
  v === undefined || v === null ? { ok: true, value: null } : typeof v === "string" && MA_TUYEN_CO_RE.test(v) ? { ok: true, value: v } : fail("Tuyến hoặc cỡ xe không hợp lệ.");
/** Số tiền VNĐ nguyên dương, tối đa 1 tỷ một chuyến (chặn gõ nhầm thêm số 0). */
export const TIEN_TOI_DA = 1_000_000_000;
const tienDuong = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0 && v <= TIEN_TOI_DA;

export interface ThemGiaThan {
  requestId: string; nhaXePartyId: string; tuyen: string | null; coXe: string | null; soTien: number; tuNgay: string; denNgay: string | null; ghiChu: string | null; thayDongId: string | null;
}
export function docThemGia(body: Record<string, unknown> | null): KetQua<ThemGiaThan> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const rid = docRequestId(body);
  if (!rid.ok) return rid;
  if (!idHopLe(body.nhaXePartyId)) return fail("Chọn nhà xe.");
  const tuyen = maHoacNull(body.tuyen);
  if (!tuyen.ok) return tuyen;
  const coXe = maHoacNull(body.coXe);
  if (!coXe.ok) return coXe;
  if (tuyen.value === null && coXe.value === null) return fail("Chọn tuyến hoặc cỡ xe (ít nhất một).");
  if (!tienDuong(body.soTien)) return fail("Số tiền phải là số nguyên dương (đồng), tối đa 1.000.000.000.");
  if (!ngayHopLe(body.tuNgay)) return fail("Từ ngày: YYYY-MM-DD.");
  if (body.denNgay !== undefined && body.denNgay !== null && !ngayHopLe(body.denNgay)) return fail("Đến ngày: YYYY-MM-DD.");
  const denNgay = (body.denNgay as string | null | undefined) ?? null;
  if (denNgay !== null && denNgay < body.tuNgay) return fail("Đến ngày không được trước từ ngày.");
  const ghiChu = chuToiDa(body.ghiChu, 200, "Ghi chú");
  if (!ghiChu.ok) return ghiChu;
  if (body.thayDongId !== undefined && body.thayDongId !== null && !idHopLe(body.thayDongId)) return fail("Dòng giá cần thay không hợp lệ.");
  return {
    ok: true,
    value: {
      requestId: rid.value, nhaXePartyId: body.nhaXePartyId, tuyen: tuyen.value, coXe: coXe.value, soTien: body.soTien, tuNgay: body.tuNgay, denNgay,
      ghiChu: ghiChu.value, thayDongId: (body.thayDongId as string | null | undefined) ?? null,
    },
  };
}

export function docKetThucGia(body: Record<string, unknown> | null): KetQua<{ denNgay: string }> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  return ngayHopLe(body.denNgay) ? { ok: true, value: { denNgay: body.denNgay } } : fail("Đến ngày: YYYY-MM-DD.");
}

function tenBatBuoc(v: unknown, toiDa: number, ten: string): KetQua<string> {
  if (typeof v !== "string" || v.trim() === "") return fail(`Nhập ${ten}.`);
  const t = v.trim();
  return t.length > toiDa ? fail(`${ten[0]!.toUpperCase()}${ten.slice(1)} tối đa ${toiDa} ký tự.`) : { ok: true, value: t };
}
const thuTu = (v: unknown): KetQua<number | null> =>
  v === undefined || v === null ? { ok: true, value: null } : typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 9999 ? { ok: true, value: v } : fail("Thứ tự là số nguyên từ 0.");

/** Tuyến mới: chỉ TÊN (máy sinh mã — bản vẽ Đợt 4 không có ô mã). */
export function docTuyenMoi(body: Record<string, unknown> | null): KetQua<{ ten: string; thuTu: number | null }> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const ten = tenBatBuoc(body.ten, 120, "tên tuyến");
  if (!ten.ok) return ten;
  const tt = thuTu(body.thuTu);
  if (!tt.ok) return tt;
  return { ok: true, value: { ten: ten.value, thuTu: tt.value } };
}
export function docSuaTuyen(body: Record<string, unknown> | null): KetQua<{ ten: string | null; dangDung: boolean | null; thuTu: number | null }> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const ten = body.ten === undefined ? { ok: true as const, value: null } : tenBatBuoc(body.ten, 120, "tên tuyến");
  if (!ten.ok) return ten;
  if (body.dangDung !== undefined && typeof body.dangDung !== "boolean") return fail("Trạng thái dùng không hợp lệ.");
  const tt = thuTu(body.thuTu);
  if (!tt.ok) return tt;
  return { ok: true, value: { ten: ten.value, dangDung: (body.dangDung as boolean | undefined) ?? null, thuTu: tt.value } };
}

/** Cỡ xe mới: khoảng số khách KHÔNG kể tài xế; nhãn tuỳ chọn (vắng → máy đặt "a–b khách"). */
export function docCoXeMoi(body: Record<string, unknown> | null): KetQua<{ tu: number; den: number; nhan: string | null }> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const so = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 100;
  if (!so(body.tuSoKhach) || !so(body.denSoKhach)) return fail("Số khách là số nguyên từ 1 đến 100 (không kể tài xế).");
  if ((body.denSoKhach as number) < (body.tuSoKhach as number)) return fail("\"Đến\" phải lớn hơn hoặc bằng \"Từ\".");
  const nhan = body.nhan === undefined || body.nhan === null ? { ok: true as const, value: null } : tenBatBuoc(body.nhan, 60, "nhãn cỡ xe");
  if (!nhan.ok) return nhan;
  return { ok: true, value: { tu: body.tuSoKhach as number, den: body.denSoKhach as number, nhan: nhan.value } };
}
export function docSuaCoXe(body: Record<string, unknown> | null): KetQua<{ nhan: string | null; dangDung: boolean | null }> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const nhan = body.nhan === undefined ? { ok: true as const, value: null } : tenBatBuoc(body.nhan, 60, "nhãn cỡ xe");
  if (!nhan.ok) return nhan;
  if (body.dangDung !== undefined && typeof body.dangDung !== "boolean") return fail("Trạng thái dùng không hợp lệ.");
  return { ok: true, value: { nhan: nhan.value, dangDung: (body.dangDung as boolean | undefined) ?? null } };
}
/** Nhãn mặc định của cỡ xe theo khoảng (bản vẽ: "4–7 khách", "45 khách"). */
export const nhanCoXeMacDinh = (tu: number, den: number): string => (tu === den ? `${tu} khách` : `${tu}–${den} khách`);
