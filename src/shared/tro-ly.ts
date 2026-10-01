// Luật THUẦN của trợ lý AI "Hỗ trợ" (ADR-0066, accepted 2026-09-30). Không I/O: máy chủ (module tro-ly) gọi, test chạy trực tiếp bằng `node --test`.
// Gồm: hằng gọi mẫu (giá + danh sách mẫu ở tro-ly-mau.ts — ADR-0073), che câu hỏi (điều 5), kho tri thức chia đoạn + tìm theo từ khoá (điều 3), lời nhắc hệ thống (điều 4), đọc phản hồi OpenAI,
// tính chi phí micro-USD và quyết định trần (điều 6). Nguồn tra tài liệu OpenAI: docs/superpowers/specs/2026-09-30-adr-0066-tro-ly-ai-ho-tro.md mục "Thi công".
// ADR-0073: mẫu / giá ở tro-ly-mau.ts, bộ não + lời nhắc mặc định ở tro-ly-bo-nao.ts, lọc số tiền ở tro-ly-loc-tien.ts.
import { HUONG_DAN, viPhamChu } from "./huong-dan.ts";
import { PERMISSION_CODES, PERMISSION_LABEL, type PermissionCode } from "./permissions.ts";
import { SO_DO_TRANG, type MucBoCuc, type TrangSoDo } from "./so-do-trang.ts";
import { DIGIT_RUN, EMAIL_TRONG_CHU, MIN_LONG_DIGIT_RUN } from "./text-guards.ts";
import { GIOI_HAN_TRO_LY as G } from "./tro-ly-gioi-han.ts";
import { CAU_TRUC } from "./tro-ly-cau-truc.ts";
import { KIEN_TRUC } from "./tro-ly-kien-truc.ts";
import { viPhamKyThuat } from "./tro-ly-loc-ky-thuat.ts";
import { MAU_MAC_DINH, timMau, type SoToken } from "./tro-ly-mau.ts";
export { chiPhiMicroUsd } from "./tro-ly-mau.ts";
import { chuSach, type BoNao } from "./tro-ly-bo-nao.ts";
import { dongMai, type XungHo } from "./xung-ho.ts";
export { CAU_TU_CHOI } from "./tro-ly-bo-nao.ts";

// ---------------------------------------------------------------- hằng (ADR-0066 điều 2, 5, 6)

/** Hết giờ gọi OpenAI (ADR-0066 thi công: 20 giây). */
export const HET_GIO_MS = 20_000;
/** Câu hỏi tối đa (ký tự) SAU khi che (ADR-0066 điều 5). */
export const CAU_HOI_TOI_DA = 500;
/**
 * Câu hỏi THÔ tối đa (ký tự) máy chủ chịu che (kiểm độc lập I-1, 30/9): dài hơn ⇒ 400 `CAU_QUA_DAI` ngay, trước khi che — chặn câu cực dài làm Worker tốn CPU.
 * Rộng hơn 500 để câu hợp lệ có SĐT / email dài vẫn được che TRƯỚC rồi mới cắt 500.
 */
export const CAU_HOI_THO_TOI_DA = 2000;
export const CAU_QUA_DAI = "Câu hỏi quá dài — tối đa 500 ký tự.";
/** Ngân sách tài liệu gửi kèm mỗi câu (ADR-0066 điều 3: "tổng ≤ khoảng 6.000 token"). */
export const NGAN_SACH_TOKEN = 6000;
/**
 * ƯỚC LƯỢNG (không đếm thật): 1 token ≈ 3 ký tự chữ tiếng Việt có dấu. Bộ tách từ của OpenAI không chạy được ở máy chủ (không dependency); số thật
 * chỉ biết sau khi gọi (usage). Ước hơi thấp tay (tiếng Việt có dấu thường 2,5–3,5 ký tự/token) — lệch vài trăm token không đổi được chi phí đáng kể.
 */
export const KY_TU_MOI_TOKEN = 3;
export const uocToken = (s: string): number => Math.ceil(s.length / KY_TU_MOI_TOKEN);

export const CHE = "[đã che]";

// ---------------------------------------------------------------- câu báo (lời thường, tiếng Việt)

export const CAU_CHUA_BAT = "Trợ lý chưa bật. Xem hướng dẫn ở Trợ giúp hoặc hỏi Quản trị.";
/** ADR-0066 điều 6 — nguyên văn. */
export const CAU_HET_TRAN_THANG = "Trợ lý tạm nghỉ tới tháng sau — xem Trợ giúp";
export const cauHetTranNgay = (tran: number): string => `Bạn đã hỏi đủ ${tran} câu hôm nay. Mai hỏi tiếp, hoặc xem hướng dẫn ở Trợ giúp.`;
/** Chỉ ô thử của Toàn quyền (khung nhân viên giữ CAU_LOI): mẫu suy nghĩ đã dùng hết token ra mà chưa viết được chữ nào. */
export const CAU_HET_TOKEN_RA = "Mẫu AI đã dùng hết số token trả lời cho phần suy nghĩ trước khi kịp viết câu trả lời. Tăng \"Số token trả lời tối đa\" hoặc giảm \"Mức suy nghĩ\" rồi thử lại.";
export const CAU_LOI = "Trợ lý đang bận hoặc gặp lỗi. Thử lại sau ít phút, hoặc xem hướng dẫn ở Trợ giúp.";
/** ADR-0066 điều 4 — nguyên văn. Từ ADR-0073 (M1) máy chủ KHÔNG còn tự trả câu này (không khớp vẫn gọi mẫu); giữ hằng cho bài kiểm ví dụ cũ của chủ. */
export const CAU_CHUA_CO = "Chưa có trong hướng dẫn — hỏi Quản trị hoặc gửi Góp ý";

// ---------------------------------------------------------------- che câu hỏi (ADR-0066 điều 5)

const DIEU_KHIEN = new RegExp("[\\u0000-\\u001f\\u007f\\u2028\\u2029\\u200e\\u200f\\u202a-\\u202e\\u2066-\\u2069]", "g");
/** Số giấy tờ có chữ cái đầu (hộ chiếu kiểu "C1234567", biển số không tính): một chữ cái Latinh + từ 7 chữ số liền. Dãy toàn số do DIGIT_RUN lo. */
const GIAY_TO_CO_CHU = /\b[A-Za-z]{1,2}\d{7,}\b/g;

/**
 * Che TRƯỚC, cắt SAU (cắt trước thì một SĐT nằm vắt ngang mốc 500 bị cụt dưới ngưỡng 8 chữ số và lọt — advisor 30/9): email, số giấy tờ có chữ đầu,
 * mọi dãy từ 8 chữ số trở lên (SĐT, căn cước, bằng lái — cùng regex + ngưỡng với `text-guards.ts`, MỘT nguồn) → "[đã che]". Bỏ ký tự điều khiển,
 * gộp khoảng trắng, rồi cắt ở `CAU_HOI_TOI_DA` ký tự.
 */
export function cheCauHoi(raw: string): string {
  const s = raw
    .replace(DIEU_KHIEN, " ")
    .replace(EMAIL_TRONG_CHU, CHE)
    .replace(GIAY_TO_CO_CHU, CHE)
    .replace(DIGIT_RUN, (run) => (run.replace(/\D/g, "").length >= MIN_LONG_DIGIT_RUN ? CHE : run))
    .replace(/\s+/g, " ")
    .trim();
  return [...s].slice(0, CAU_HOI_TOI_DA).join("");
}

// ---------------------------------------------------------------- kho tri thức

export interface DoanTriThuc {
  /** Tên mục hiện cho người dùng ở dòng "Nguồn: …" (không chứa dấu ngoặc vuông). */
  readonly ten: string;
  /** Rỗng = cho mọi người; khác rỗng = đoạn của nhóm vai này (ưu tiên khi người hỏi có quyền đó). */
  readonly quyen: readonly PermissionCode[];
  readonly chu: string;
}

const tenSach = (s: string): string => s.replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();
const tenNhom = (tieuDe: string): string => tenSach(tieuDe.split(" — ")[0] ?? tieuDe);

const dsMuc = (ds: readonly MucBoCuc[]): string =>
  ds.map((m, i) => `${i + 1}. ${m.muc}${m.nut.length ? ` — nút: ${m.nut.join(", ")}` : ""}.`).join(" ");

/** Đoạn "Sơ đồ trang › …" (kho c + e): nhóm menu, bố cục từ trên xuống, phần dựng khi trang chạy. Chỉ nhãn chữ đọc từ mã (đã qua bộ lọc lúc sinh). */
export function dongTrang(t: TrangSoDo): string {
  const dong = [`Trang "${t.tieuDe}".`];
  if (t.nhomMenu.length) dong.push(`Trong menu: nhóm ${t.nhomMenu.join(", ")}, mục ${t.menu.join(" / ")}.`);
  else if (t.menu.length) dong.push(`Mở từ thanh tab: ${t.menu.join(", ")}.`);
  else dong.push("Không có mục menu riêng — mở từ trang khác.");
  if (t.boCuc.length) dong.push(`Bố cục từ trên xuống: ${dsMuc(t.boCuc)}`);
  if (t.khiChay.muc.length) dong.push(`Mục hiện khi trang chạy (vị trí tuỳ dữ liệu, có thể nằm trong hộp thoại): ${t.khiChay.muc.join(", ")}.`);
  if (t.khiChay.nut.length) dong.push(`Nút hiện khi trang chạy (tuỳ quyền và trạng thái): ${t.khiChay.nut.join(", ")}.`);
  return dong.join("\n");
}

/**
 * Chia kho: (a) hướng dẫn theo vai — mỗi mục một đoạn + "Bắt đầu nhanh" của mỗi nhóm; (b) kiến trúc lời thường; (d) cấu trúc app tự sinh (ADR-0070 điều 1);
 * (c)+(e) sơ đồ trang và bố cục tự sinh (ADR-0066 điều 3(c), ADR-0070 điều 2) — một đoạn mỗi trang.
 */
export function chiaKho(): DoanTriThuc[] {
  const out: DoanTriThuc[] = [];
  for (const n of HUONG_DAN) {
    const nhom = tenNhom(n.tieuDe);
    out.push({ ten: `${nhom} › Bắt đầu nhanh`, quyen: n.quyen, chu: `${n.gioiThieu}\n${n.batDauNhanh}` });
    for (const m of n.muc) out.push({ ten: `${nhom} › ${tenSach(m.tieuDe)}`, quyen: n.quyen, chu: m.noiDung });
  }
  for (const k of KIEN_TRUC) out.push({ ten: `Cách app vận hành › ${tenSach(k.tieuDe)}`, quyen: [], chu: k.noiDung });
  for (const k of CAU_TRUC) out.push({ ten: `Cấu trúc app › ${tenSach(k.tieuDe)}`, quyen: k.quyen, chu: k.noiDung });
  const daCo = new Set<string>();
  for (const t of SO_DO_TRANG) {
    // "/" và "/home" cùng tiêu đề "Trang chủ" (cùng một màn): giữ trang đầu, tên mục không được trùng.
    if (!t.tieuDe || daCo.has(t.tieuDe)) continue;
    daCo.add(t.tieuDe);
    out.push({ ten: `Sơ đồ trang › ${tenSach(t.tieuDe)}`, quyen: [], chu: dongTrang(t) });
  }
  return out;
}

// ---------------------------------------------------------------- tìm theo từ khoá (BM25 gọn, tiếng Việt bỏ dấu)

/** Bỏ dấu tiếng Việt, về chữ thường; "đ" → "d". */
export const boDau = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase();

/** Từ quá chung (sau khi bỏ dấu) — không mang nghĩa để tìm. */
const TU_DUNG = new Set(
  "la cua va cho toi minh ban co khong thi nao the gi o de duoc mot nhung cac khi trong voi nay do em anh chi a oi nhe vay sao lam bang hay hoac neu roi da dang se can muon ra vao len xuong tu den nhu ma thoi tai ve".split(" "),
);

/** Tách từ (âm tiết) + ghép đôi âm tiết liền nhau (bắt cụm như "dat gap", "don hang"). */
export function tachTu(s: string): string[] {
  const am = boDau(s).split(/[^a-z0-9]+/).filter(Boolean);
  const don = am.filter((t) => !TU_DUNG.has(t) && (t.length > 1 || /\d/.test(t)));
  const doi: string[] = [];
  for (let i = 0; i + 1 < am.length; i++) if (!(TU_DUNG.has(am[i]!) && TU_DUNG.has(am[i + 1]!))) doi.push(`${am[i]}_${am[i + 1]}`);
  return [...don, ...doi];
}

export interface KetQuaTim { readonly doan: DoanTriThuc; readonly diem: number }

const K1 = 1.2;
const B = 0.75;
/** Hệ số ưu tiên: đoạn của nhóm vai người hỏi ×1,5; đoạn chung ×1; đoạn của vai khác ×0,6 (vẫn trả lời được, nhưng xếp sau). */
export const heSoVai = (d: DoanTriThuc, perms: readonly PermissionCode[]): number =>
  d.quyen.length === 0 ? 1 : d.quyen.some((q) => perms.includes(q)) ? 1.5 : 0.6;

/** Điểm từ khoá THÔ (chưa nhân hệ số vai) của MỌI đoạn, cùng thứ tự kho (ADR-0082 Đ3): BM25 + số âm tiết đơn khác nhau khớp + có khớp cặp âm tiết liền nhau. */
export interface DiemTuKhoa { readonly diem: number; readonly soTuDon: number; readonly coCap: boolean }
export function diemTuKhoa(cauHoi: string, kho: readonly DoanTriThuc[]): DiemTuKhoa[] {
  const q = [...new Set(tachTu(cauHoi))];
  if (!q.length) return kho.map(() => ({ diem: 0, soTuDon: 0, coCap: false }));
  const docs = kho.map((d) => tachTu(`${d.ten} ${d.chu}`));
  const avg = docs.reduce((a, d) => a + d.length, 0) / Math.max(1, docs.length);
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  const N = docs.length;
  return docs.map((d) => {
    const tf = new Map<string, number>();
    for (const t of d) tf.set(t, (tf.get(t) ?? 0) + 1);
    let diem = 0;
    let soTuDon = 0;
    let coCap = false;
    for (const t of q) {
      const f = tf.get(t);
      if (!f) continue;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      diem += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.length) / avg)));
      if (t.includes("_")) coCap = true;
      else soTuDon++;
    }
    return { diem, soTuDon, coCap };
  });
}

/** Như diemTuKhoa nhưng `diem` ĐÃ NHÂN hệ số vai — chỗ DUY NHẤT nhân điểm từ khoá với vai (timDoan và chonDoanTron / khopManh cùng dùng). */
export function diemTuKhoaTheoVai(cauHoi: string, kho: readonly DoanTriThuc[], perms: readonly PermissionCode[]): DiemTuKhoa[] {
  return diemTuKhoa(cauHoi, kho).map((x, i) => ({ ...x, diem: x.diem * heSoVai(kho[i]!, perms) }));
}

/** Xếp hạng mọi đoạn theo câu hỏi (BM25 trên tên mục + nội dung, nhân hệ số vai); chỉ trả đoạn có điểm > 0, điểm cao trước (hoà: giữ thứ tự kho). */
export function timDoan(cauHoi: string, perms: readonly PermissionCode[], kho: readonly DoanTriThuc[] = chiaKho()): KetQuaTim[] {
  const out: KetQuaTim[] = [];
  diemTuKhoaTheoVai(cauHoi, kho, perms).forEach((x, i) => {
    if (x.diem > 0) out.push({ doan: kho[i]!, diem: x.diem });
  });
  return out.map((x, i) => ({ x, i })).sort((a, b) => b.x.diem - a.x.diem || a.i - b.i).map(({ x }) => x);
}

/**
 * Lấy đoạn theo thứ tự điểm tới khi hết ngân sách (ước token); đoạn không vừa phần còn lại thì bỏ qua, xét đoạn sau. Tối đa `toiDa` đoạn.
 * `toiDa` 8 → 12 (ADR-0070, 1/10): kho thêm các đoạn cấu trúc app ngắn (~70–250 token) nên 8 đoạn chỉ dùng ~2.500 / 6.000 token và đẩy đoạn liên quan
 * (vd "Mốc 6 giờ và Đặt gấp" cho câu "vì sao không xác nhận được đơn") ra ngoài; ngân sách token vẫn là trần thật.
 * MỘT vòng ngân sách cho cả chonDoan (từ khoá) và chonDoanTron (ADR-0082).
 */
export const SO_DOAN_TOI_DA = 12;
export function layTheoNganSach<T>(ds: readonly T[], doanCua: (x: T) => DoanTriThuc, nganSach = NGAN_SACH_TOKEN, toiDa = SO_DOAN_TOI_DA): T[] {
  const out: T[] = [];
  let con = nganSach;
  for (const x of ds) {
    if (out.length >= toiDa) break;
    const t = uocToken(dinhDangDoan(doanCua(x)));
    if (t > con) continue;
    out.push(x);
    con -= t;
  }
  return out;
}
export function chonDoan(cauHoi: string, perms: readonly PermissionCode[], kho?: readonly DoanTriThuc[], nganSach = NGAN_SACH_TOKEN, toiDa = SO_DOAN_TOI_DA): DoanTriThuc[] {
  return layTheoNganSach(timDoan(cauHoi, perms, kho).map((x) => x.doan), (d) => d, nganSach, toiDa);
}

export const dinhDangDoan = (d: DoanTriThuc): string => `[${d.ten}]\n${d.chu}`;

// ---------------------------------------------------------------- lời nhắc (ADR-0066 điều 4, 5)

/** Tên nhóm vai của người hỏi (chỉ tên nhóm — không tên, SĐT, id người hỏi: ADR-0066 điều 5). */
export const nhomVai = (perms: readonly PermissionCode[]): string => perms.map((p) => PERMISSION_LABEL[p]).join(", ") || "chưa có quyền";

export const KHONG_TIM_THAY = "(không tìm thấy đoạn hướng dẫn liên quan)";

/**
 * Lời nhắc gửi đi = lời nhắc của bộ não (Toàn quyền sửa được TOÀN BỘ — ADR-0073 Đ2) + phần MÁY CHỦ luôn nối SAU nó: dòng "Tên bạn là Mai…" với cách gọi /
 * cách xưng của CHÍNH người hỏi (ADR-0084 Đ3 — chỉ tên gọi, không họ / tên đệm / SĐT / id: Đ4; máy chủ đọc hồ sơ theo phiên, không nhận từ trình duyệt),
 * dòng nhóm vai (chỉ tên nhóm — ADR-0066 điều 5) và khối "TÀI LIỆU:" ở CUỐI (đoạn đã chọn, hoặc ghi chú không tìm thấy — Đ3, M1). Dòng Mai đứng TRƯỚC khối
 * tài liệu (không lẫn vào tài liệu; khối tài liệu vẫn cuối — hàng rào B4). Toàn quyền không chèn / bỏ được hai dòng này hay khối tài liệu (bài tro-ly.test.ts
 * "HÀNG RÀO dungLoiNhac (B4)" + "ADR-0084 Đ3: dòng Mai").
 */
export function dungLoiNhac(loiNhac: string, perms: readonly PermissionCode[], nguoi: XungHo, doan: readonly DoanTriThuc[]): string {
  return [
    loiNhac.trim(),
    "",
    dongMai(nguoi),
    `Người hỏi thuộc nhóm vai: ${nhomVai(perms)}. Ưu tiên cách làm của nhóm vai này.`,
    "",
    "TÀI LIỆU:",
    ...(doan.length ? doan.map(dinhDangDoan) : [KHONG_TIM_THAY]),
  ].join("\n");
}

/** Một lượt hỏi đáp trước — MÁY CHỦ đọc từ tl_hoi_dap (đã che khi lưu), không bao giờ nhận từ trình duyệt (ADR-0073 Đ4). */
export interface LuotTruoc { readonly cauHoi: string; readonly traLoi: string }

/**
 * Thân yêu cầu Responses API (POST /v1/responses) theo bộ não. KHÔNG có `user`, `safety_identifier`, `metadata`, `previous_response_id` (ADR-0066 điều 5,
 * ADR-0082 G2 — ADR-0084 Đ4 giữ nguyên); `store: false`. `nguoi` BẮT BUỘC (không mặc định — mọi nơi gọi, kể cả kiểm trần, phải truyền cùng người hỏi để
 * mức trần tính cả dòng Mai). Có lượt trước ⇒ `input` là danh sách lượt user / assistant rồi câu hỏi mới; không có ⇒ chuỗi câu hỏi (như trước).
 */
export function thanYeuCau(
  b: BoNao, perms: readonly PermissionCode[], nguoi: XungHo, doan: readonly DoanTriThuc[], cauHoiDaChe: string, nho: readonly LuotTruoc[] = [],
): Record<string, unknown> {
  return {
    model: b.mau,
    instructions: dungLoiNhac(b.loiNhac, perms, nguoi, doan),
    input: nho.length
      ? [...nho.flatMap((l) => [{ role: "user", content: l.cauHoi }, { role: "assistant", content: l.traLoi }]), { role: "user", content: cauHoiDaChe }]
      : cauHoiDaChe,
    reasoning: { effort: b.mucSuyNghi },
    text: { verbosity: b.doDai },
    max_output_tokens: b.tokenRaToiDa,
    store: false,
  };
}

/** Ước token VÀO của một thân yêu cầu (lời nhắc + câu hỏi + phần nhớ) — cho kiểm trần trước khi gọi (ADR-0073 Đ7b). */
export const uocTokenVao = (than: Record<string, unknown>): number => uocToken(String(than.instructions ?? "")) + uocToken(JSON.stringify(than.input ?? ""));

/** Phần nhớ (ADR-0073 Đ4): lượt trong 2 giờ gần nhất (giả định bề mặt, đặc tả §7). Số lượt (3) nằm trong câu SQL tĩnh `nho-luot` của repository. */
export const NHO_TRONG_MS = 2 * 60 * 60 * 1000;

/** Truy vấn tìm đoạn (N5): câu hỏi hiện tại NỐI câu hỏi lượt trước gần nhất — câu nối tiếp ("còn trên điện thoại thì sao") không mất ngữ cảnh. */
export const truyVanTim = (cauHoi: string, cauTruoc: string | null): string => (cauTruoc ? `${cauHoi} ${cauTruoc}` : cauHoi);

// ---------------------------------------------------------------- đọc phản hồi + nguồn

export type SuDung = SoToken;
/** `hetToken` chỉ có (= true) khi mẫu trả `status: "incomplete"` + `incomplete_details.reason: "max_output_tokens"` MÀ không có chữ nào: mẫu suy nghĩ đã dùng hết token ra. */
export interface PhanHoiDoc { readonly chu: string; readonly suDung: SuDung | null; readonly hetToken?: true }

const soKhongAm = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/**
 * Đọc phản hồi Responses API: gộp mọi `output[].content[]` kiểu `output_text` của phần tử `type: "message"` (trường `output_text` gộp sẵn chỉ có ở SDK,
 * không có trong JSON thô). `usage` đọc kể cả khi `status` = "incomplete" (vẫn tính tiền — ADR-0066 điều 6). Thân lạ → chữ rỗng, `suDung` null.
 */
export function docPhanHoi(json: unknown): PhanHoiDoc {
  const j = (json ?? {}) as { status?: unknown; incomplete_details?: { reason?: unknown } | null; output?: unknown; usage?: { input_tokens?: unknown; output_tokens?: unknown; input_tokens_details?: { cached_tokens?: unknown } } };
  const phan: string[] = [];
  if (Array.isArray(j.output)) {
    for (const o of j.output as { type?: unknown; content?: unknown }[]) {
      if (o?.type !== "message" || !Array.isArray(o.content)) continue;
      for (const c of o.content as { type?: unknown; text?: unknown }[]) if (c?.type === "output_text" && typeof c.text === "string") phan.push(c.text);
    }
  }
  const u = j.usage;
  const suDung = u && typeof u === "object"
    ? { vao: soKhongAm(u.input_tokens), vaoDem: Math.min(soKhongAm(u.input_tokens_details?.cached_tokens), soKhongAm(u.input_tokens)), ra: soKhongAm(u.output_tokens) }
    : null;
  const chu = phan.join("").trim();
  const het = !chu && j.status === "incomplete" && j.incomplete_details?.reason === "max_output_tokens";
  return het ? { chu, suDung, hetToken: true } : { chu, suDung };
}

/**
 * Tách dòng "Nguồn: [..], [..]" ở cuối câu trả lời (ADR-0073 Đ6): chỉ giữ tên CÓ trong các đoạn đã gửi (danh sách trắng — mẫu bịa tên không lọt ra).
 * KHÔNG có dòng Nguồn ⇒ KHÔNG nguồn (bỏ hành vi "lấy đoạn đầu" của ADR-0066). Bỏ cả kiểm tiền tố câu "chưa có" / từ chối cũ (trượt khi câu bị bọc —
 * ví dụ của chủ 1/10): nguồn chỉ còn phụ thuộc dòng Nguồn hợp lệ. Câu cố định lỗi không qua hàm này (máy chủ ghi nguồn rỗng — S3).
 */
export function tachNguon(chu: string, daGui: readonly DoanTriThuc[]): { traLoi: string; nguon: string[] } {
  const dong = chu.split("\n");
  let i = dong.length - 1;
  while (i >= 0 && !dong[i]!.trim()) i--;
  let nguon: string[] = [];
  if (i >= 0 && /^\s*\**\s*nguồn\s*\**\s*:/iu.test(dong[i]!)) {
    const ten = new Set(daGui.map((d) => d.ten));
    nguon = [...new Set([...dong[i]!.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]!.trim()).filter((t) => ten.has(t)))];
    dong.splice(i, 1);
  }
  return { traLoi: dong.join("\n").trim(), nguon };
}

// ---------------------------------------------------------------- chi phí + trần (ADR-0066 điều 6)

export interface CaiDatTroLy { readonly bat: boolean; readonly tranThangMicroUsd: number; readonly tranNgay: number }
export type QuyetDinh = "tat" | "het_tran_thang" | "het_tran_ngay" | "duoc";

/** Thứ tự: tắt → hết trần tháng (cả công ty) → hết trần ngày (người hỏi). Trần = 0 nghĩa là không cho câu nào. */
export function quyetDinhTran(c: CaiDatTroLy, dung: { readonly soCauHomNay: number; readonly chiPhiThang: number }): QuyetDinh {
  if (!c.bat) return "tat";
  if (dung.chiPhiThang >= c.tranThangMicroUsd) return "het_tran_thang";
  if (dung.soCauHomNay >= c.tranNgay) return "het_tran_ngay";
  return "duoc";
}

/** Khoảng ngày của tháng dương lịch chứa `ngayVn` (YYYY-MM-DD, giờ VN) — so chuỗi được vì cột lưu cùng khuôn. */
export const khoangThang = (ngayVn: string): { tu: string; den: string } => ({ tu: `${ngayVn.slice(0, 7)}-01`, den: `${ngayVn.slice(0, 7)}-31` });

/** Kiểm đầu vào của route cài đặt (Toàn quyền). Trần tháng nhận USD (số, tối đa 2 chữ số lẻ) để người dùng khỏi đọc micro-USD. */
export function kiemCaiDat(body: Record<string, unknown> | null): { ok: true; value: CaiDatTroLy } | { ok: false; message: string } {
  if (!body || typeof body.bat !== "boolean") return { ok: false, message: "Thiếu công tắc bật / tắt." };
  const usd = body.tranThangUsd;
  if (typeof usd !== "number" || !Number.isFinite(usd) || usd < 0 || usd > 100) return { ok: false, message: "Trần chi phí tháng phải từ 0 đến 100 USD." };
  const ngay = body.tranNgay;
  if (typeof ngay !== "number" || !Number.isInteger(ngay) || ngay < 0 || ngay > 200) return { ok: false, message: "Số câu mỗi người mỗi ngày phải là số nguyên từ 0 đến 200." };
  return { ok: true, value: { bat: body.bat, tranThangMicroUsd: Math.round(usd * 1_000_000), tranNgay: ngay } };
}

/**
 * Mọi chữ của kho (tên đoạn + nội dung) qua luật nội dung A3 (không số tiền, chuỗi giống SĐT, email) VÀ bộ lọc tên kỹ thuật (ADR-0070 điều 5 — không tên bảng,
 * đường dẫn API, tệp mã, module, hạ tầng) — chữ này rời máy chủ. Trả các dòng vi phạm.
 */
export function viPhamKho(kho: readonly DoanTriThuc[] = chiaKho()): string[] {
  const out: string[] = [];
  for (const d of kho) {
    const s = `${d.ten}\n${d.chu}`;
    const v = viPhamChu(s) ?? viPhamKyThuat(s);
    if (v) out.push(`${d.ten}: ${v.luat} "${v.khop}"`);
  }
  return out;
}

// ---------------------------------------------------------------- bảng điều khiển của Toàn quyền (ADR-0069)

/**
 * ADR-0069 điều 3: tài khoản dùng được trợ lý khi ÍT NHẤT một quyền của nó đang bật. Mã không có trong `vai` (không có dòng cấu hình) = TẮT (mặc định
 * từ chối). MỘT hàm cho cả hai nơi: máy chủ chặn `POST /api/tro-ly/hoi` (403) và cờ `duocDung` của `GET /api/tro-ly/khung` (giao diện ẩn nút).
 */
export function duocDungTroLy(perms: readonly PermissionCode[], vai: Partial<Record<PermissionCode, boolean>>): boolean {
  return perms.some((p) => vai[p] === true);
}

export const CAU_VAI_TAT = "Trợ lý Hỗ trợ đang tắt với vai của bạn. Xem hướng dẫn ở Trợ giúp hoặc hỏi Quản trị.";

type Kiem<T> = { ok: true; value: T } | { ok: false; message: string };

/** Thân `POST /api/tro-ly/vai`: `{ vai: { <9 mã quyền>: boolean } }` — đủ 9 mã, không mã lạ. */
export function kiemVai(body: Record<string, unknown> | null): Kiem<Record<PermissionCode, boolean>> {
  const v = body?.vai;
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, message: "Thiếu danh sách công tắc theo vai." };
  const o = v as Record<string, unknown>;
  if (Object.keys(o).length !== PERMISSION_CODES.length || !PERMISSION_CODES.every((p) => typeof o[p] === "boolean")) {
    return { ok: false, message: "Công tắc theo vai không hợp lệ — cần đủ 9 vai, mỗi vai bật hoặc tắt." };
  }
  return { ok: true, value: Object.fromEntries(PERMISSION_CODES.map((p) => [p, o[p] as boolean])) as Record<PermissionCode, boolean> };
}

/** Luật nội dung A3 (`viPhamChu` — một nguồn với hướng dẫn và kho tri thức) cho một ô chữ tuỳ chỉnh; trả câu lời thường hoặc null. */
function viPhamO(ten: string, s: string): string | null {
  const v = viPhamChu(s);
  return v ? `${ten} không được chứa ${v.luat} — chữ này được gửi sang máy AI cùng câu hỏi.` : null;
}

export interface LoiDan { readonly cauChao: string; readonly giong: string; readonly loiDanThem: string; readonly cauHoiMau: readonly string[] }

/** Thân lưu lời dặn (ADR-0069 điều 4). "Quay lại bản cũ" gửi lại nội dung bản cũ qua CHÍNH hàm này (bộ lọc chạy lại). */
export function kiemLoiDan(body: Record<string, unknown> | null): Kiem<LoiDan> {
  const cauChao = chuSach(body?.cauChao);
  const giong = chuSach(body?.giong ?? "");
  const loiDanThem = chuSach(body?.loiDanThem ?? "");
  const mau = body?.cauHoiMau ?? [];
  if (cauChao === null || giong === null || loiDanThem === null || !Array.isArray(mau)) return { ok: false, message: "Lời dặn không hợp lệ." };
  if (!cauChao) return { ok: false, message: "Câu chào không được để trống." };
  if (cauChao.length > G.cauChao) return { ok: false, message: `Câu chào tối đa ${G.cauChao} ký tự.` };
  if (giong.length > G.giong) return { ok: false, message: `Giọng trả lời tối đa ${G.giong} ký tự.` };
  if (loiDanThem.length > G.loiDanThem) return { ok: false, message: `Lời dặn thêm tối đa ${G.loiDanThem} ký tự.` };
  const cauHoiMau: string[] = [];
  for (const c of mau) {
    const s = chuSach(c);
    if (s === null) return { ok: false, message: "Câu hỏi mẫu không hợp lệ." };
    const g = s.replace(/\s+/g, " ");
    if (!g || cauHoiMau.includes(g)) continue;
    if (g.length > G.cauMau) return { ok: false, message: `Mỗi câu hỏi mẫu tối đa ${G.cauMau} ký tự.` };
    cauHoiMau.push(g);
  }
  if (cauHoiMau.length > G.soCauMau) return { ok: false, message: `Tối đa ${G.soCauMau} câu hỏi mẫu.` };
  const loi =
    viPhamO("Câu chào", cauChao) ?? viPhamO("Giọng trả lời", giong) ?? viPhamO("Lời dặn thêm", loiDanThem) ??
    cauHoiMau.map((c) => viPhamO("Câu hỏi mẫu", c)).find((x) => x !== null) ?? null;
  if (loi) return { ok: false, message: loi };
  return { ok: true, value: { cauChao, giong, loiDanThem, cauHoiMau } };
}

export interface NguCanh { readonly tieuDe: string; readonly noiDung: string; readonly bat: boolean }
export interface NguCanhHienHanh extends NguCanh { readonly doanId: string }

/** Thân thêm / sửa một đoạn ngữ cảnh. Tiêu đề bỏ ngoặc vuông, gộp khoảng trắng (nó thành tên nguồn "[…]" trong lời nhắc). */
export function kiemNguCanh(body: Record<string, unknown> | null): Kiem<NguCanh> {
  const t = chuSach(body?.tieuDe);
  const n = chuSach(body?.noiDung);
  if (t === null || n === null || typeof body?.bat !== "boolean") return { ok: false, message: "Đoạn ngữ cảnh không hợp lệ." };
  const tieuDe = tenSach(t);
  if (!tieuDe) return { ok: false, message: "Tiêu đề đoạn không được để trống." };
  if (!n) return { ok: false, message: "Nội dung đoạn không được để trống." };
  if (tieuDe.length > G.tieuDeNguCanh) return { ok: false, message: `Tiêu đề đoạn tối đa ${G.tieuDeNguCanh} ký tự.` };
  if (n.length > G.noiDungNguCanh) return { ok: false, message: `Nội dung đoạn tối đa ${G.noiDungNguCanh} ký tự.` };
  const loi = viPhamO("Tiêu đề đoạn", tieuDe) ?? viPhamO("Nội dung đoạn", n);
  if (loi) return { ok: false, message: loi };
  return { ok: true, value: { tieuDe, noiDung: n, bat: body!.bat as boolean } };
}

/** Đoạn ngữ cảnh ĐANG BẬT → đoạn của kho (cho mọi vai), tên "Ngữ cảnh bổ sung › …": không trùng tên mục có sẵn, lọt danh sách trắng nguồn. */
export function doanNguCanh(ds: readonly NguCanhHienHanh[]): DoanTriThuc[] {
  return ds.filter((d) => d.bat).map((d) => ({ ten: `Ngữ cảnh bổ sung › ${tenSach(d.tieuDe)}`, quyen: [], chu: d.noiDung }));
}

/** ADR-0069 điều 2: chỉ 4 ký tự CUỐI của khoá (đã cắt khoảng trắng); khoá ngắn hơn 16 ký tự ⇒ null (4 ký tự của khoá ngắn lộ quá nhiều). */
export function khoaCuoi(khoa: string | null | undefined): string | null {
  const k = khoa?.trim() ?? "";
  return k.length >= 16 ? k.slice(-4) : null;
}

/** "Thử key" (ADR-0069 điều 2; ADR-0073 B10): một câu CỐ ĐỊNH với MẪU ĐANG CHỌN, mức suy nghĩ THẤP NHẤT của mẫu đó — không tài liệu, không id người bấm. */
export function thanThuKhoa(ma: string): Record<string, unknown> {
  const mau = timMau(ma) ?? timMau(MAU_MAC_DINH)!;
  return {
    model: mau.ma,
    instructions: "Trả lời đúng một chữ: được",
    input: "Thử kết nối.",
    reasoning: { effort: mau.mucSuyNghi[0] },
    max_output_tokens: 16,
    store: false,
  };
}

/** Mã lỗi OpenAI được phép đọc — DANH SÁCH TRẮNG. Chữ lỗi (`error.message`) của OpenAI có thể lặp lại một phần khoá: KHÔNG BAO GIỜ đọc / chuyển tiếp nó. */
const MA_LOI_BIET = new Set(["insufficient_quota", "invalid_api_key"]);
export function maLoiOpenAi(json: unknown): string | null {
  const c = (json as { error?: { code?: unknown } } | null)?.error?.code;
  return typeof c === "string" && MA_LOI_BIET.has(c) ? c : null;
}

export type MaThuKhoa = "duoc" | "sai_khoa" | "het_tien" | "gioi_han" | "mau_tu_choi" | "loi_mang" | "loi_khac" | "chua_dat";
const CAU_THU_KHOA: Record<MaThuKhoa, string> = {
  duoc: "Key dùng được — trợ lý gọi được máy AI.",
  sai_khoa: "Sai key — máy AI từ chối key này. Đặt lại key trên Cloudflare.",
  het_tien: "Hết tiền — tài khoản máy AI đã hết hạn mức. Nạp thêm ở trang quản lý của máy AI.",
  gioi_han: "Máy AI đang giới hạn số lần gọi. Thử lại sau ít phút.",
  // ADR-0073 B10: Thử key gọi MẪU ĐANG CHỌN — 400 thường là mẫu không nhận một tham số (mức suy nghĩ, độ dài); khoá vẫn có thể đúng.
  mau_tu_choi: "Mẫu AI đang chọn không nhận cấu hình thử (ví dụ mức suy nghĩ) — chọn mẫu hoặc mức khác ở phần Bộ não rồi thử lại.",
  loi_mang: "Không kết nối được tới máy AI (lỗi mạng hoặc hết giờ chờ). Thử lại sau.",
  loi_khac: "Máy AI báo lỗi khác. Thử lại sau ít phút.",
  chua_dat: "Chưa đặt key — đặt key trên Cloudflare rồi thử lại.",
};
/** Kết quả "Thử key" theo MÃ trạng thái HTTP + mã lỗi đã lọc (không đọc chữ lỗi của OpenAI). */
export function ketQuaThuKhoa(k: { ok: true } | { mang: true } | { chuaDat: true } | { status: number; maLoi: string | null }): { ma: MaThuKhoa; cau: string } {
  const ma: MaThuKhoa =
    "ok" in k ? "duoc"
    : "mang" in k ? "loi_mang"
    : "chuaDat" in k ? "chua_dat"
    : k.status === 401 ? "sai_khoa"
    : k.status === 429 && k.maLoi === "insufficient_quota" ? "het_tien"
    : k.status === 429 ? "gioi_han"
    : k.status === 400 ? "mau_tu_choi"
    : "loi_khac";
  return { ma, cau: CAU_THU_KHOA[ma] };
}
