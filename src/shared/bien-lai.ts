// Luật THUẦN của ảnh biên lai chuyển khoản (ADR-0196 Đ1, Đ2, Đ9, Đ10): MỘT nguồn cho máy chủ (billing) và giao diện (form «Ghi khoản thu» ở web/order.ts).
// Không I/O ngoài Web Crypto (qua tep-dinh-kem.ts). Máy chủ luôn kiểm lại; giao diện chỉ ẩn/hiện ô chọn ảnh.
import { TOI_DA_BYTE, doDaiBase64, giaiBase64, nhanLoaiTep, type LoaiTep, CAU_SAI_LOAI } from "./tep-dinh-kem.ts";

/**
 * Vị từ con «Công ty thu bằng chuyển khoản» (ADR-0196 Đ1 «Cách làm»; Hiến chương 5.1): người thu là Công ty VÀ cách trả là Chuyển khoản. MỘT nơi định nghĩa —
 * `canDoiChieu` (billing/rules.ts) gọi nó cho nhánh thứ nhất của mình, `canBienLai` gọi nó cộng ba điều còn lại. Bài src/modules/billing/bien-lai-luat.test.ts
 * khoá cặp điều kiện này chỉ nằm ở tệp này.
 */
export const congTyThuChuyenKhoan = (input: { collectorRole: string; method?: string }): boolean =>
  input.collectorRole === "COMPANY" && input.method === "BANK_TRANSFER";

/**
 * Khoản thu này có BẮT BUỘC kèm ảnh biên lai không (ADR-0196 Đ1, câu (a) chủ duyệt 11/11): đủ cả BỐN điều —
 * (1) người ghi giữ quyền Đối tác và KHÔNG giữ quyền Kế toán; (2)+(3) Công ty thu bằng chuyển khoản; (4) `canDoiChieu` trả đúng cho khoản ấy (máy chủ tính trước rồi
 * truyền vào). KHÔNG viết `laDoiTac && canDoiChieu` — `canDoiChieu` còn đúng cho lời khai «khách trả cho bên đặt / tại quầy nhà cung cấp» (phương án a3, chủ không chọn).
 */
export const canBienLai = (input: { laDoiTac: boolean; laKeToan: boolean; collectorRole: string; method?: string; canDoiChieu: boolean }): boolean =>
  input.laDoiTac && !input.laKeToan && congTyThuChuyenKhoan(input) && input.canDoiChieu;

/** Trần độ dài chuỗi base64 của ĐÚNG một tệp 10 MB (đo chuỗi TRƯỚC khi giải). */
export const TOI_DA_BASE64_BIEN_LAI = doDaiBase64(TOI_DA_BYTE);
/** Trần `Content-Length` của lệnh ghi khoản thu KÈM ảnh: base64 của 10 MB + 64 KB cho các trường còn lại (số tiền, ghi chú ≤ 500 ký tự, mã giao dịch, vỏ JSON). */
export const TOI_DA_THAN_KHOAN_THU_CO_ANH = TOI_DA_BASE64_BIEN_LAI + 64 * 1024;

export const CAU_BIEN_LAI_QUA_CO = "Ảnh biên lai không được quá 10 MB.";
const CAU_BIEN_LAI_HONG = "Ảnh biên lai không đọc được. Hãy chọn lại tệp.";

export interface BienLaiDaKiem { bytes: Uint8Array; loai: LoaiTep }
export type KiemBienLai = { ok: true; tep: BienLaiDaKiem | null } | { ok: false; status: 400 | 413 | 415; code: string; message: string };
const hong = (status: 400 | 413 | 415, code: string, message: string): KiemBienLai => ({ ok: false, status, code, message });

/**
 * Trường `bienLai` của thân `POST /api/orders/:id/payments` (ADR-0196 Đ2): vắng / null ⇒ không tệp. Có thì là MỘT đối tượng `{ noiDung }` (base64) — mảng hay
 * hình dạng khác ⇒ 400, nên «đúng một tệp» là tính chất của hình dạng. Thứ tự (khuôn `kiemTepCuaTin`): hình dạng (400) → độ dài chuỗi (413, trước khi giải) →
 * base64 (400) → chữ ký thật (415, `CAU_SAI_LOAI`) → cỡ byte (413). Mã lỗi như `kiemTepCuaTin`.
 */
export function kiemBienLai(raw: unknown): KiemBienLai {
  if (raw === undefined || raw === null) return { ok: true, tep: null };
  if (typeof raw !== "object" || Array.isArray(raw)) return hong(400, "invalid_input", CAU_BIEN_LAI_HONG);
  const s = (raw as Record<string, unknown>).noiDung;
  if (typeof s !== "string") return hong(400, "invalid_input", CAU_BIEN_LAI_HONG);
  if (s.length > TOI_DA_BASE64_BIEN_LAI) return hong(413, "file_too_large", CAU_BIEN_LAI_QUA_CO);
  const bytes = giaiBase64(s);
  if (!bytes || bytes.length === 0) return hong(400, "invalid_input", CAU_BIEN_LAI_HONG);
  const loai = nhanLoaiTep(bytes.subarray(0, 16));
  if (!loai) return hong(415, "unsupported_file_type", CAU_SAI_LOAI);
  if (bytes.length > TOI_DA_BYTE) return hong(413, "file_too_large", CAU_BIEN_LAI_QUA_CO);
  return { ok: true, tep: { bytes, loai } };
}

/**
 * Trạng thái ảnh biên lai của MỘT khoản thu cho người được xem (ADR-0196 Đ10, Đ7, Đ11): DTO chỉ mang trạng thái, không khoá kho.
 * - `CO` — đã lưu, mở được; `CHUA_TAI_XONG` — dòng chưa lưu, chưa quyết xoá (Kế toán thấy «ảnh chưa tải xong»);
 * - `DA_GO` — Toàn quyền đã gỡ (`GO_TEP`) ⇒ «Biên lai đã được gỡ»; `CHUA_CO` — hàng chờ đã dọn dòng tải dở dang ⇒ «Chưa có biên lai».
 */
export type TrangThaiBienLai = "CO" | "CHUA_TAI_XONG" | "DA_GO" | "CHUA_CO";
export const LY_DO_GO_BIEN_LAI = { TAI_LEN_DO_DANG: "TAI_LEN_DO_DANG", GO_TEP: "GO_TEP" } as const;
export function trangThaiBienLai(r: { stored_at: string | null; purged_at: string | null; purge_reason: string | null }): TrangThaiBienLai {
  if (r.purged_at !== null) return r.purge_reason === LY_DO_GO_BIEN_LAI.GO_TEP ? "DA_GO" : "CHUA_CO";
  return r.stored_at !== null ? "CO" : "CHUA_TAI_XONG";
}
