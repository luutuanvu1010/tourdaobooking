// Luật thuần phiếu TỰ KHAI hồ sơ (ADR-0124; Hiến chương 5.21, 5.23; lát H-3 Gói 2) — module parties. Không I/O, không SQL. Import kèm đuôi .ts.
// Giá trị khai là ĐỀ XUẤT: tệp này chỉ kiểm hình thức, không đọc / ghi giá trị hiện hành. Câu báo lỗi không nhắc lại giá trị khai (số giấy tờ, địa chỉ, ngày sinh).
import { kiemThemGiayTo, type DanhMucGiayTo, type GiayToNhap } from "./giay-to.ts";
import { kiemNgaySinh, validateContact, type Result } from "./rules.ts";

export const LOAI_PHIEU = ["NGAY_SINH", "DIA_CHI", "GIAY_TO"] as const;
export type LoaiPhieu = (typeof LOAI_PHIEU)[number];
export const laLoaiPhieu = (v: unknown): v is LoaiPhieu => typeof v === "string" && (LOAI_PHIEU as readonly string[]).includes(v);
export type PhieuNhap = { loai: "NGAY_SINH"; ngaySinh: string } | { loai: "DIA_CHI"; diaChi: string } | { loai: "GIAY_TO"; giayTo: GiayToNhap };

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });
const TRUONG: Record<LoaiPhieu, "ngaySinh" | "diaChi" | "giayTo"> = { NGAY_SINH: "ngaySinh", DIA_CHI: "diaChi", GIAY_TO: "giayTo" };

/** Thân POST /api/parties/cua-toi/phieu (trừ chinhSachId — route kiểm): `{ loai, ngaySinh? | diaChi? | giayTo? }`. Trường của loại khác phải vắng (một phiếu một loại — R4). */
export function kiemPhieuTuKhai(body: Record<string, unknown> | null, dm: DanhMucGiayTo): Result<PhieuNhap> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const loai = body.loai;
  if (!laLoaiPhieu(loai)) return fail("Chọn thông tin muốn khai: ngày sinh, địa chỉ hoặc giấy tờ.");
  const thua = Object.values(TRUONG).filter((k) => k !== TRUONG[loai] && body[k] !== undefined && body[k] !== null);
  if (thua.length > 0) return fail("Mỗi lần chỉ khai một loại thông tin.");
  if (loai === "NGAY_SINH") {
    const r = kiemNgaySinh(body.ngaySinh, dm.homNay);
    if (!r.ok) return r;
    if (!r.value) return fail("Nhập ngày sinh.");
    return { ok: true, value: { loai, ngaySinh: r.value } };
  }
  if (loai === "DIA_CHI") {
    if (typeof body.diaChi !== "string" || !body.diaChi.trim()) return fail("Nhập địa chỉ.");
    const r = validateContact({ kind: "ADDRESS", value: body.diaChi });
    return r.ok ? { ok: true, value: { loai, diaChi: r.value.value } } : r;
  }
  const g = body.giayTo;
  if (!g || typeof g !== "object" || Array.isArray(g)) return fail("Nhập thông tin giấy tờ.");
  const r = kiemThemGiayTo(g as Record<string, unknown>, dm);
  return r.ok ? { ok: true, value: { loai, giayTo: r.value } } : r;
}

/** Trần hợp lý của một số ngày (100 năm) — chỉ chặn nhập nhầm; KHÔNG phải thời hạn mặc định (con số thật do chính sách quyết, chờ luật sư — ADR-0126 đ2). */
const TRAN_SO_NGAY = 36_500;
function kiemSoNgay(v: unknown, ten: string): Result<number | null> {
  if (v === undefined || v === null) return { ok: true, value: null };
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > TRAN_SO_NGAY) return fail(`${ten} cần là số nguyên từ 1 đến ${TRAN_SO_NGAY.toLocaleString("vi-VN")} (hoặc để trống).`);
  return { ok: true, value: v };
}

/**
 * Thân POST /api/parties/chinh-sach-rieng-tu: `{ mucDich, noiDung, hanXuLyXoaNgay?, hanGiuPhienNgay? }` — trần = CHECK của pty_privacy_policy (0103). Hai số ngày (ADR-0126 đ2, đ8;
 * migration 0108) tuỳ chọn: số nguyên ≥ 1, hoặc vắng / null = chưa có số (không hạn). Mã KHÔNG gieo con số nào.
 */
export function kiemChinhSach(body: Record<string, unknown> | null): Result<{ mucDich: string; noiDung: string; hanXuLyXoaNgay: number | null; hanGiuPhienNgay: number | null }> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const mucDich = typeof body.mucDich === "string" ? body.mucDich.normalize("NFC").trim() : "";
  const noiDung = typeof body.noiDung === "string" ? body.noiDung.normalize("NFC").trim() : "";
  if (mucDich.length < 1 || mucDich.length > 2000) return fail("Mục đích thu thập cần từ 1 đến 2.000 ký tự.");
  if (noiDung.length < 1 || noiDung.length > 20000) return fail("Toàn văn chính sách cần từ 1 đến 20.000 ký tự.");
  const xoa = kiemSoNgay(body.hanXuLyXoaNgay, "Số ngày xử lý yêu cầu xoá");
  if (!xoa.ok) return xoa;
  const phien = kiemSoNgay(body.hanGiuPhienNgay, "Số ngày giữ IP và thông tin của máy đã đăng xuất");
  if (!phien.ok) return phien;
  return { ok: true, value: { mucDich, noiDung, hanXuLyXoaNgay: xoa.value, hanGiuPhienNgay: phien.value } };
}

export interface TinhTrangTuKhai { coHoSo: boolean; laCaNhan: boolean; daGop: boolean; coChinhSach: boolean; daDongY: boolean }
export interface LyDo { code: string; message: string }
export const CAU_KHONG_GUI = {
  chuaHoSo: "Tài khoản này chưa gắn hồ sơ nên chưa tự khai được. Hãy báo quản trị viên.",
  toChuc: "Hồ sơ tổ chức chưa tự khai được trên Nền tảng. Hãy báo quản trị viên để cập nhật.",
  daGop: "Hồ sơ của bạn đã được gộp vào hồ sơ khác. Hãy báo quản trị viên.",
  chuaChinhSach: "Chưa có chính sách riêng tư nên chưa gửi được thông tin. Hãy quay lại sau.",
  chuaDongY: "Bạn cần đọc và đồng ý chính sách riêng tư hiện hành trước khi gửi thông tin.",
} as const;
/** Lý do không GHI được gì (đồng ý, phiếu) vì HỒ SƠ — null = hồ sơ hợp lệ. */
export function lyDoKhongGhi(t: Pick<TinhTrangTuKhai, "coHoSo" | "laCaNhan" | "daGop">): LyDo | null {
  if (!t.coHoSo) return { code: "no_party", message: CAU_KHONG_GUI.chuaHoSo };
  if (!t.laCaNhan) return { code: "self_person_only", message: CAU_KHONG_GUI.toChuc };
  if (t.daGop) return { code: "party_merged", message: CAU_KHONG_GUI.daGop };
  return null;
}
/** Lý do không GỬI được phiếu — null = gửi được (một nguồn cho cờ `coTheGui` của GET và chặn của POST). */
export function lyDoKhongGui(t: TinhTrangTuKhai): LyDo | null {
  return lyDoKhongGhi(t)
    ?? (!t.coChinhSach ? { code: "no_privacy_policy", message: CAU_KHONG_GUI.chuaChinhSach } : null)
    ?? (!t.daDongY ? { code: "consent_required", message: CAU_KHONG_GUI.chuaDongY } : null);
}
