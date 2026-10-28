// Luật hiển thị THUẦN của tệp kèm tin vé hỗ trợ (ADR-0144 đ2, đ5, đ7; đặc tả 2026-10-28-dinh-kem-ve-ho-tro §3.6): nhãn, cỡ, câu trạng thái, kiểm trước trên máy,
// cỡ ảnh thu nhỏ, khoá «tin đổi trạng thái tệp» của vòng làm mới. Chỉ để báo sớm — máy chủ (`kiemTepCuaTin`) luôn kiểm lại. Không I/O; bài ở tep-hien-thi.test.ts.
import type { FeedbackTepDto } from "./contracts.ts";
import { CAU_QUA_SO_TEP, CAU_QUA_TONG, CAU_SAI_LOAI, TEP_MOI_TIN, TOI_DA_BASE64_TIN, TONG_BYTE_MOI_TIN, doDaiBase64, type LoaiTep } from "./tep-dinh-kem.ts";

/** Cạnh dài tối đa của ảnh sau khi thu nhỏ trên máy người gửi (ADR-0144 đ7). */
export const CANH_DAI_TOI_DA = 2000;
/** Chất lượng JPG khi vẽ lại ảnh. */
export const CHAT_LUONG_JPG = 0.85;
/** Hạn chờ lời gọi gửi tin CÓ tệp (ADR-0144 đ7) — lời gọi thường 45 giây. */
export const HEN_GIO_GUI_TEP_MS = 120_000;

export const CAU_NHAC_GIAY_TO = "Đính kèm ảnh hoặc tài liệu.";
export const CAU_CAN_CHU = "Hãy viết vài chữ kèm tệp.";
export const CAU_DANG_GUI_TEP = "Đang gửi tệp…";
export const CAU_DANG_CHUAN_BI = "Đang chuẩn bị tệp…";
export const NHAN_DINH_KEM = "Đính kèm";
export const NHAN_TAI_VE = "Tải về";
export const NHAN_GO_TEP = "Gỡ tệp";

/** Cỡ tệp cho người đọc: «350 KB», «1,2 MB», «10 MB» (dấu phẩy thập phân, không «,0»). */
export function coTep(n: number): string {
  const kb = Math.round(n / 1024);
  if (kb < 1024) return `${Math.max(1, kb)} KB`;
  return `${String(Math.round(n / 104_857.6) / 10).replace(".", ",")} MB`;
}

/** Nhãn một tệp trong tin: ảnh đánh số theo thứ tự (`thuTu` từ 1), PDF ghi «Tệp PDF» (đặc tả 3.6). */
export const nhanTep = (t: Pick<FeedbackTepDto, "loai" | "kichThuoc">, thuTu: number): string =>
  `${t.loai === "pdf" ? "Tệp PDF" : `Ảnh ${thuTu}`} · ${coTep(t.kichThuoc)}`;

/** Câu cho tệp chưa xem được; tệp đã lưu ⇒ null (vẽ ảnh / nút Tải về). */
export function cauTrangThaiTep(tt: FeedbackTepDto["trangThai"]): string | null {
  if (tt === "DANG_TAI") return "Đang tải tệp…";
  if (tt === "CHUA_TAI_DUOC") return "Tệp chưa tải lên được";
  if (tt === "DA_GO") return "Tệp đã được gỡ";
  return null;
}

/** Câu báo sau khi gửi khi máy chủ trả `tepLoi` > 0 (tin ĐÃ vào luồng, chỉ một số tệp chưa lên kho — ADR-0144 đ2). */
export const cauTepLoi = (n: number): string | null =>
  n > 0 ? `Tin đã gửi, nhưng ${n} tệp chưa tải lên được. Hãy gửi lại ${n === 1 ? "tệp đó" : "các tệp đó"} trong tin mới.` : null;

/** Đường tải một tệp — luôn qua máy chủ (kiểm quyền, ghi nhật ký trước khi đọc kho). */
export const duongTep = (ticketId: string, tepId: string): string => `/api/feedback/${encodeURIComponent(ticketId)}/tep/${encodeURIComponent(tepId)}`;

/** Cỡ vẽ lại của ảnh: cạnh dài ≤ `CANH_DAI_TOI_DA`, giữ tỉ lệ, không cạnh nào về 0. */
export function kichThuocThuNho(rong: number, cao: number): { rong: number; cao: number } {
  const dai = Math.max(rong, cao);
  if (dai <= CANH_DAI_TOI_DA) return { rong, cao };
  const k = CANH_DAI_TOI_DA / dai;
  return { rong: Math.max(1, Math.round(rong * k)), cao: Math.max(1, Math.round(cao * k)) };
}

/**
 * Kiểm trước trên máy các tệp ĐÃ chuẩn bị (sau thu nhỏ) của một tin: loại theo chữ ký (`loai` null = không nhận), số tệp, tổng byte, tổng chuỗi base64.
 * Tổng base64 kiểm riêng vì máy chủ chặn theo tổng chuỗi TRƯỚC khi giải: nhiều tệp lẻ byte có thể vượt dù tổng byte vừa trần. Ổn ⇒ null.
 */
export function kiemTepDaChon(ds: readonly { loai: LoaiTep | null; kichThuoc: number }[]): string | null {
  if (ds.some((t) => t.loai === null)) return CAU_SAI_LOAI;
  if (ds.length > TEP_MOI_TIN) return CAU_QUA_SO_TEP;
  if (ds.reduce((n, t) => n + t.kichThuoc, 0) > TONG_BYTE_MOI_TIN) return CAU_QUA_TONG;
  if (ds.reduce((n, t) => n + doDaiBase64(t.kichThuoc), 0) > TOI_DA_BASE64_TIN) return CAU_QUA_TONG;
  return null;
}

/** Base64 chuẩn (RFC 4648 §4) — chiều ngược của `giaiBase64`. Mã theo khúc để không vượt giới hạn tham số của `String.fromCharCode`. */
export function maBase64(b: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Khoá trạng thái tệp của một tin (mã + trạng thái, theo thứ tự máy chủ trả). */
export const khoaTepCuaTin = (m: { tep: readonly Pick<FeedbackTepDto, "id" | "trangThai">[] }): string => m.tep.map((t) => `${t.id}:${t.trangThai}`).join("|");

/**
 * Vòng làm mới (ADR-0127) nhận lại tin của 30 giây gần nhất: có tin ĐÃ hiện mà khoá tệp khác không? Có ⇒ vẽ lại (tệp lưu xong vài giây sau tin — đặc tả 3.6).
 * Tin chưa từng có không tính ở đây (nhánh «tin mới» đã vẽ lại).
 */
export function tinDoiTep(daCo: readonly { id: string; tep: readonly Pick<FeedbackTepDto, "id" | "trangThai">[] }[], phanHoi: readonly { id: string; tep: readonly Pick<FeedbackTepDto, "id" | "trangThai">[] }[]): boolean {
  const cu = new Map(daCo.map((m) => [m.id, khoaTepCuaTin(m)]));
  return phanHoi.some((m) => cu.has(m.id) && cu.get(m.id) !== khoaTepCuaTin(m));
}
