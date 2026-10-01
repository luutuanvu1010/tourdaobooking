// Luật THUẦN tìm đoạn theo nghĩa của trợ lý Hỗ trợ (ADR-0082, accepted 2026-10-01). Không I/O (băm dùng crypto.subtle — có cả ở Worker và Node 22).
// Gồm: mẫu + giá embedding (hằng — Đ1), khoá đoạn (Đ2, V1), cô-sin, mã hoá véc-tơ float32 ↔ BLOB, chia lô (API + D1), đọc phản hồi Embeddings,
// mức trần trên (Đ5(1)), tiền tính bù ước (Đ5(2)), chọn đoạn trộn RRF (Đ3 — Task 2). Máy chủ (src/modules/tro-ly/van-nghia.ts) gọi; giao diện KHÔNG import.
// Giá tra 2026-10-01 (đã mở được): developers.openai.com/api/docs/models/text-embedding-3-small ($0,02 / 1M token);
// developers.openai.com/api/reference/resources/embeddings/methods/create (≤ 2.048 đầu vào, ≤ 8.192 token / đầu vào, ≤ 300.000 token / yêu cầu; `dimensions` cho text-embedding-3).
import { chiPhiToiDa } from "./tro-ly-mau.ts";
import type { PermissionCode } from "./permissions.ts";
import { NGAN_SACH_TOKEN, SO_DOAN_TOI_DA, diemTuKhoaTheoVai, heSoVai, layTheoNganSach, uocToken, type DoanTriThuc } from "./tro-ly.ts";

export const MAU_NHUNG = "text-embedding-3-small";
/** Số chiều rút gọn qua tham số `dimensions` (giả định bề mặt của đặc tả §6 — đổi số = mọi khoá đổi = tính lại cả kho một lần). */
export const SO_CHIEU_NHUNG = 512;
/** micro-USD / 1 triệu token (0,02 USD). */
export const GIA_NHUNG = 20_000;
export const NGAY_TRA_GIA_NHUNG = "2026-10-01";
export const NGUON_GIA_NHUNG = "https://developers.openai.com/api/docs/models/text-embedding-3-small";
/** Hạn giờ riêng của một lần gọi Embeddings (Đ4) — ngắn hơn HET_GIO_MS 20 giây của mẫu trả lời. */
export const HET_GIO_NHUNG_MS = 8_000;
/** Lô API: ≤ 2.048 đầu vào; giữ 256 cho thân yêu cầu nhỏ. */
export const LO_NHUNG_DAU_VAO = 256;
/** Lô API: ≤ 300.000 token / yêu cầu; ước 1 token ≈ 3 ký tự có thể thấp ⇒ chừa ba lần. */
export const LO_NHUNG_TOKEN_UOC = 100_000;
/** Số câu INSERT một `db.batch` khi ghi tl_van_nghia (mỗi câu 5 tham số — xa trần 100 tham số / câu của D1). */
export const LO_GHI_D1 = 50;

/** V1: SHA-256 hex của `${chữ}|${mẫu}|${số chiều}` — chữ = đoạn đã định dạng (`dinhDangDoan`). */
export async function khoaDoan(chu: string, mau: string = MAU_NHUNG, soChieu: number = SO_CHIEU_NHUNG): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${chu}|${mau}|${soChieu}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** micro-USD, làm tròn LÊN (P1). */
export const chiPhiNhungMicroUsd = (token: number): number => (token > 0 ? Math.ceil((token * GIA_NHUNG) / 1_000_000) : 0);

export function cosin(a: Float32Array, b: Float32Array): number {
  if (!a.length || a.length !== b.length) return -1;
  let t = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    t += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? t / Math.sqrt(na * nb) : -1;
}

/** float32 → byte (thứ tự byte của máy — Worker và Node đều little-endian). Chép ra bộ đệm riêng: véc-tơ con (byteOffset ≠ 0) vẫn đúng. */
export const vecSangBlob = (v: Float32Array): Uint8Array => new Uint8Array(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength));

/** BLOB do D1 / node:sqlite trả (ArrayBuffer, Uint8Array / view khác, hoặc mảng số 0–255) → float32; sai độ dài / dạng lạ ⇒ null (Review Focus 3). */
export function blobSangVec(x: unknown, soChieu: number): Float32Array | null {
  let u: Uint8Array | null = null;
  if (x instanceof ArrayBuffer) u = new Uint8Array(x);
  else if (ArrayBuffer.isView(x)) u = new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
  else if (Array.isArray(x) && x.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) u = Uint8Array.from(x as number[]);
  if (!u || u.byteLength !== soChieu * 4) return null;
  return new Float32Array(u.slice().buffer); // slice ⇒ bộ đệm mới, căn lề 4 byte
}

export function chiaLo<T>(ds: readonly T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < ds.length; i += n) out.push(ds.slice(i, i + n));
  return out;
}

/** Chia các đầu vào thành lô theo trần số đầu vào VÀ trần token ước; giữ thứ tự. */
export function chiaLoNhung(chu: readonly string[], toiDaDauVao: number = LO_NHUNG_DAU_VAO, toiDaToken: number = LO_NHUNG_TOKEN_UOC): string[][] {
  const out: string[][] = [];
  let lo: string[] = [];
  let tok = 0;
  for (const s of chu) {
    const t = uocToken(s);
    if (lo.length && (lo.length >= toiDaDauVao || tok + t > toiDaToken)) {
      out.push(lo);
      lo = [];
      tok = 0;
    }
    lo.push(s);
    tok += t;
  }
  if (lo.length) out.push(lo);
  return out;
}

/** Thân POST /v1/embeddings — ĐÚNG bốn khoá; KHÔNG `user` / định danh người hỏi (G2). */
export const thanNhung = (dauVao: readonly string[]): Record<string, unknown> => ({
  model: MAU_NHUNG, input: [...dauVao], dimensions: SO_CHIEU_NHUNG, encoding_format: "float",
});

/** Đọc phản hồi Embeddings: xếp theo `index`; thiếu / trùng / sai số chiều / số lạ ⇒ null. `token` = usage.prompt_tokens, thiếu ⇒ null (người gọi ƯỚC). */
export function docPhanHoiNhung(json: unknown, soDauVao: number, soChieu: number = SO_CHIEU_NHUNG): { vec: Float32Array[]; token: number | null } | null {
  const j = (json ?? {}) as { data?: unknown; usage?: { prompt_tokens?: unknown } };
  if (!Array.isArray(j.data) || j.data.length !== soDauVao) return null;
  const vec: (Float32Array | undefined)[] = new Array(soDauVao);
  for (const o of j.data as { index?: unknown; embedding?: unknown }[]) {
    const i = o?.index;
    if (typeof i !== "number" || !Number.isInteger(i) || i < 0 || i >= soDauVao || vec[i]) return null;
    const e = o.embedding;
    if (!Array.isArray(e) || e.length !== soChieu || !e.every((x) => typeof x === "number" && Number.isFinite(x))) return null;
    vec[i] = Float32Array.from(e as number[]);
  }
  const p = j.usage?.prompt_tokens;
  return { vec: vec as Float32Array[], token: typeof p === "number" && Number.isFinite(p) && p >= 0 ? Math.ceil(p) : null };
}

/**
 * Đ5(1) — mức trần trên của MỘT lượt, kiểm TRƯỚC mọi lần gọi API: token vào của thân yêu cầu CHƯA có tài liệu (lời nhắc + nhớ + câu hỏi) + NGAN_SACH_TOKEN
 * (tài liệu tối đa) theo giá vào, + token ra tối đa theo giá ra, + tiền embedding ước của truy vấn tìm.
 */
export const mucTranTren = (mau: string, tokenVaoKhongTaiLieu: number, tokenRaToiDa: number, truyVan: string): number =>
  chiPhiToiDa(mau, tokenVaoKhongTaiLieu + NGAN_SACH_TOKEN, tokenRaToiDa) + chiPhiNhungMicroUsd(uocToken(truyVan));

/** Đ5(2) — tiền embedding ƯỚC của các đoạn sẽ tính bù. */
export const tienBuUoc = (chu: readonly string[]): number => chiPhiNhungMicroUsd(chu.reduce((a, s) => a + uocToken(s), 0));

// ---------------------------------------------------------------- chọn đoạn trộn (Đ3)

/** Ngưỡng cô-sin (R3 của kế hoạch — đánh giá lại bằng 12 câu mẫu sau triển khai; đổi = sửa hằng + bài thuần). */
export const NGUONG_COSIN = 0.3;
/** Hằng k của Reciprocal Rank Fusion (giá trị chuẩn). */
export const K_RRF = 60;
/** Khớp mạnh nhánh 2: điểm từ khoá (đã nhân vai) ≥ 0,7 × điểm cao nhất VÀ ≥ 2 âm tiết đơn khác nhau của câu hỏi. */
export const TY_LE_DIEM_MANH = 0.7;
export const SO_TU_MANH = 2;

export interface DoanDaChon { readonly doan: DoanTriThuc; readonly theoNghia: boolean; readonly theoTuKhoa: boolean }

/** Điểm từ khoá đã nhân vai (diemTuKhoaTheoVai — MỘT lần BM25) + cờ khớp mạnh — dùng chung cho khopManh và chonDoanTron. */
function tuKhoaVaManh(cauHoi: string, kho: readonly DoanTriThuc[], perms: readonly PermissionCode[]): { bm: number[]; manh: boolean[] } {
  const tk = diemTuKhoaTheoVai(cauHoi, kho, perms);
  const bm = tk.map((x) => x.diem);
  const max = Math.max(0, ...bm);
  const manh = tk.map((x) => x.coCap || (max > 0 && x.diem >= TY_LE_DIEM_MANH * max && x.soTuDon >= SO_TU_MANH));
  return { bm, manh };
}

/**
 * Khớp từ khoá MẠNH (Đ3): ≥ 1 cặp âm tiết liền nhau của câu hỏi, HOẶC (điểm BM25 ĐÃ NHÂN vai ≥ 0,7 × điểm cao nhất VÀ ≥ 2 âm tiết đơn khác nhau).
 * Khớp lẻ một chữ phổ biến ("dùng", "app") không đủ.
 */
export function khopManh(cauHoi: string, kho: readonly DoanTriThuc[], perms: readonly PermissionCode[]): boolean[] {
  return tuKhoaVaManh(cauHoi, kho, perms).manh;
}

/**
 * C1: điểm trộn RRF của hạng BM25 (đã nhân vai, chỉ đoạn > 0) và hạng cô-sin (đã nhân vai, chỉ đoạn ≥ ngưỡng); bỏ đoạn cô-sin < ngưỡng TRỪ đoạn khớp mạnh;
 * rồi ngân sách token + tối đa 12 đoạn (layTheoNganSach — chung với chonDoan). `vecDoan[i]` null = đoạn chưa có dấu vân (không tín hiệu nghĩa).
 * Không còn đoạn ⇒ [] (người gọi viết KHONG_TIM_THAY như cũ).
 */
export function chonDoanTron(
  cauHoi: string, vecCauHoi: Float32Array, kho: readonly DoanTriThuc[], vecDoan: readonly (Float32Array | null)[], perms: readonly PermissionCode[],
  nganSach = NGAN_SACH_TOKEN, toiDa = SO_DOAN_TOI_DA,
): DoanDaChon[] {
  const { bm, manh } = tuKhoaVaManh(cauHoi, kho, perms);
  const cs = kho.map((_, i) => { const v = vecDoan[i]; return v ? cosin(vecCauHoi, v) : -1; });
  const hang = (diem: readonly number[], co: (i: number) => boolean): Map<number, number> => {
    const ds = kho.map((_, i) => i).filter(co).sort((a, b) => diem[b]! - diem[a]! || a - b);
    return new Map(ds.map((i, h) => [i, h + 1]));
  };
  const hangTuKhoa = hang(bm, (i) => bm[i]! > 0);
  const hangNghia = hang(cs.map((c, i) => c * heSoVai(kho[i]!, perms)), (i) => cs[i]! >= NGUONG_COSIN);
  const ung: { i: number; diem: number; theoNghia: boolean; theoTuKhoa: boolean }[] = [];
  kho.forEach((_, i) => {
    const theoNghia = cs[i]! >= NGUONG_COSIN;
    if (!theoNghia && !manh[i]) return;
    const rB = hangTuKhoa.get(i);
    const rC = hangNghia.get(i);
    ung.push({ i, diem: (rB ? 1 / (K_RRF + rB) : 0) + (rC ? 1 / (K_RRF + rC) : 0), theoNghia, theoTuKhoa: bm[i]! > 0 });
  });
  ung.sort((a, b) => b.diem - a.diem || a.i - b.i);
  return layTheoNganSach(ung, (x) => kho[x.i]!, nganSach, toiDa).map((x) => ({ doan: kho[x.i]!, theoNghia: x.theoNghia, theoTuKhoa: x.theoTuKhoa }));
}

/** Đường lùi (Đ4): đoạn chọn bằng chonDoan (luật cũ) — cờ khớp từ khoá, không khớp nghĩa. */
export const daChonTuKhoa = (ds: readonly DoanTriThuc[]): DoanDaChon[] => ds.map((doan) => ({ doan, theoNghia: false, theoTuKhoa: true }));
