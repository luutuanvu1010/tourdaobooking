// Luật THUẦN của dấu "đã nhập phần mềm kế toán" (ADR-0060) — một nguồn cho máy chủ (module billing: kiểm thân lệnh, câu nhật ký) và giao diện (nhãn,
// dòng hiển thị). Không I/O, không import module. Import kèm đuôi .ts (chạy trực tiếp bằng `node --test`). Test cạnh tệp: nhap-ke-toan.test.ts.
import { PHONE_IN_TEXT_MESSAGE, cleanText, hasLongDigitRun } from "./text-guards.ts";
import { UUID_RE } from "./http.ts";

/** Nhãn dấu (chi tiết đơn, thẻ danh sách, lịch sử đơn). */
export const NHAN_DA_NHAP = "Đã nhập phần mềm kế toán";
/** Số hoá đơn tối đa (khớp CHECK của migration *_billing_nhap_ke_toan.sql). */
export const SO_HOA_DON_TOI_DA = 50;
/** Lý do bỏ dấu tối đa (giới hạn ở mã — cột không CHECK độ dài). */
export const LY_DO_TOI_DA = 300;
/** "Số hoá đơn đã nhập" = số tham chiếu trong phần mềm kế toán ngoài: chữ, số, dấu cách, `. / _ - #`. Giữ NGUYÊN VĂN (tiêu chí 1: "· HD-000123"). */
const SO_HOA_DON_RE = /^[\p{L}\p{N} ./_#-]+$/u;
/** Dãy từ 10 chữ số LIỀN trở lên trong số hoá đơn — dấu hiệu SĐT / MST dán nhầm (Hiến chương 5.12). */
const SO_HOA_DON_DAY_DAI_RE = /\d{10,}/;

/** Bộ lọc danh sách đơn "đã / chưa nhập" (ADR-0060 điều 5, A-6): bắt buộc kèm khoảng ngày đi, tối đa NGÀY này (tính CẢ hai đầu). */
export const LOC_NHAP_TOI_DA_NGAY = 92;
/**
 * Trần tập đơn ứng viên của bộ lọc (bài canh cỡ — ADR-0060 điều 5): vượt ⇒ 400 "thu hẹp khoảng ngày", KHÔNG cắt bớt lặng lẽ (cắt thì "chưa nhập" sai).
 * Tập đi vào D1 bằng MỘT tham số JSON (`json_each`) — không đụng trần 100 tham số; trần thật là 2 MB/chuỗi (UUID ≈ 39 byte ⇒ ~50.000 id). Số đo ở
 * nhật ký thi công ADR-0060.
 */
export const LOC_NHAP_TOI_DA_UNG_VIEN = 5000;

export interface NhapKeToanLenh {
  daNhap: boolean;
  soHoaDon: string | null;
  lyDo: string | null;
  truocDo: string | null;
}

/** Kiểm thân `POST /api/orders/:id/nhap-ke-toan` — mọi lỗi 400 bằng câu tiếng Việt TRƯỚC khi chạm CSDL (CHECK không bao giờ lộ ra thành 500). */
export function docLenhNhapKeToan(raw: unknown): { ok: true; lenh: NhapKeToanLenh } | { ok: false; message: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Thiếu thông tin dấu nhập phần mềm kế toán." };
  const b = raw as Record<string, unknown>;
  if (typeof b.daNhap !== "boolean") return { ok: false, message: "Chọn đánh dấu hoặc bỏ dấu đã nhập phần mềm kế toán." };
  if (!("truocDo" in b) || (b.truocDo !== null && (typeof b.truocDo !== "string" || !UUID_RE.test(b.truocDo)))) {
    return { ok: false, message: "Thiếu trạng thái đang xem — tải lại đơn rồi thử lại." };
  }
  const truocDo = b.truocDo as string | null;
  const so = cleanText(b.soHoaDon, "Số hoá đơn", SO_HOA_DON_TOI_DA, false);
  if (so.error) return { ok: false, message: so.error };
  const lyDo = cleanText(b.lyDo, "Lý do", LY_DO_TOI_DA, false);
  if (lyDo.error) return { ok: false, message: lyDo.error };
  if (b.daNhap) {
    if (lyDo.value !== null) return { ok: false, message: "Chỉ ghi lý do khi bỏ dấu." };
    if (so.value !== null && !SO_HOA_DON_RE.test(so.value)) return { ok: false, message: "Số hoá đơn chỉ gồm chữ, số, dấu cách và các dấu . / _ - #." };
    // Hiến chương 5.12 (kiểm độc lập 30/9): số hoá đơn đi NGUYÊN VĂN vào bảng chỉ-thêm và nhật ký chỉ-thêm — chặn dãy ≥ 10 chữ số LIỀN (SĐT, MST dán nhầm);
    // số hoá đơn thật (vd 7–8 chữ số, hoặc có dấu ngăn) vẫn nhận.
    if (so.value !== null && SO_HOA_DON_DAY_DAI_RE.test(so.value)) return { ok: false, message: "Số hoá đơn có dãy số quá dài — có thể là SĐT/MST dán nhầm." };
    return { ok: true, lenh: { daNhap: true, soHoaDon: so.value, lyDo: null, truocDo } };
  }
  if (so.value !== null) return { ok: false, message: "Bỏ đánh dấu thì không kèm số hoá đơn." };
  if (lyDo.value === null) return { ok: false, message: "Bỏ đánh dấu đã nhập phần mềm kế toán phải ghi lý do." };
  // Lý do đi vào bảng chỉ-thêm và nhật ký chỉ-thêm ⇒ CHẶN HẲN dãy số dài (khuôn text-guards.ts: che rồi vẫn ghi là không đủ).
  if (hasLongDigitRun(lyDo.value)) return { ok: false, message: PHONE_IN_TEXT_MESSAGE };
  return { ok: true, lenh: { daNhap: false, soHoaDon: null, lyDo: lyDo.value, truocDo } };
}

/** Một dòng hiển thị: "Đã nhập phần mềm kế toán · HD-000123" / "Bỏ dấu đã nhập phần mềm kế toán — lý do: …". Dùng cho câu nhật ký VÀ màn chi tiết. */
export function moTaDauNhap(d: { daNhap: boolean; soHoaDon: string | null; lyDo: string | null }): string {
  if (d.daNhap) return d.soHoaDon ? `${NHAN_DA_NHAP} · ${d.soHoaDon}` : NHAN_DA_NHAP;
  return `Bỏ đánh dấu đã nhập phần mềm kế toán — lý do: ${d.lyDo ?? ""}`;
}

/** Trạng thái hiện tại trùng lệnh ⇒ không thêm dòng (200, không đổi gì). `hienTai` null = chưa từng đánh dấu (coi như chưa nhập). */
export function lenhKhongDoi(hienTai: { daNhap: boolean; soHoaDon: string | null } | null, lenh: NhapKeToanLenh): boolean {
  const dangNhap = hienTai?.daNhap === true;
  if (!lenh.daNhap) return !dangNhap;
  return dangNhap && (hienTai!.soHoaDon ?? null) === lenh.soHoaDon;
}

/** Hành động nhật ký gắn đơn của dấu này — lịch sử đơn bỏ chúng với người không qua ô `accounting.entry.view` (ADR-0060 điều 3 (ii)). */
export const HANH_DONG_NHAP_KE_TOAN = ["order_accounting_entry_marked", "order_accounting_entry_unmarked"] as const;
export const laDongNhapKeToan = (action: string): boolean => (HANH_DONG_NHAP_KE_TOAN as readonly string[]).includes(action);

/** Số ngày của khoảng [tu, den] tính cả hai đầu (ngày dân sự "YYYY-MM-DD"). */
export function soNgayKhoang(tu: string, den: string): number {
  return Math.round((Date.parse(`${den}T00:00:00Z`) - Date.parse(`${tu}T00:00:00Z`)) / 86_400_000) + 1;
}
