// Danh sách mẫu AI ĐÓNG của trợ lý Hỗ trợ + giá + chi phí (ADR-0073 Đ1, Đ7b). Thuần, KHÔNG import gì: trang Trợ lý Hỗ trợ (web/tro-ly-cai-dat.ts) dùng
// để hiện giá ước tính mà không kéo kho tri thức vào bundle. Thêm mẫu = thêm một dòng + test (không cần ADR mới nếu cùng Responses API — ADR-0073 Đ1).
// Giá: micro-USD cho 1 TRIỆU token (1 USD / 1M token = 1.000.000 ở đây) — số nguyên, tính không sai số dấu phẩy động. Tra trang chính thức, ghi ngày.
// Tra 2026-10-01 (đã mở được): developers.openai.com/api/docs/models/gpt-5-nano ($0,05 / $0,005 / $0,40), …/gpt-5-mini ($0,25 / $0,025 / $2), …/gpt-5 ($1,25 / $0,125 / $10).
// Mức suy nghĩ: trang mẫu KHÔNG liệt kê; theo phán quyết D1 dùng minimal/low/medium/high (họ GPT-5, cookbook "GPT-5 New Params and Tools"); KHÔNG chép none/xhigh/max của mẫu đời sau.

export type MucSuyNghi = "minimal" | "low" | "medium" | "high";
export type DoDai = "low" | "medium" | "high";
export interface GiaMau { readonly vao: number; readonly vaoDem: number; readonly ra: number }
export interface MauAi {
  readonly ma: string;
  readonly ten: string;
  readonly gia: GiaMau;
  /** reasoning.effort mẫu này nhận, từ thấp tới cao — phần tử ĐẦU là mức thấp nhất (Thử key dùng mức này). */
  readonly mucSuyNghi: readonly MucSuyNghi[];
  readonly ngayTraGia: string;
  readonly nguonGia: string;
}

const MUC_GPT5: readonly MucSuyNghi[] = ["minimal", "low", "medium", "high"];

export const DANH_SACH_MAU: readonly MauAi[] = [
  { ma: "gpt-5-nano", ten: "GPT-5 nano (rẻ nhất)", gia: { vao: 50_000, vaoDem: 5_000, ra: 400_000 }, mucSuyNghi: MUC_GPT5, ngayTraGia: "2026-10-01", nguonGia: "https://developers.openai.com/api/docs/models/gpt-5-nano" },
  { ma: "gpt-5-mini", ten: "GPT-5 mini", gia: { vao: 250_000, vaoDem: 25_000, ra: 2_000_000 }, mucSuyNghi: MUC_GPT5, ngayTraGia: "2026-10-01", nguonGia: "https://developers.openai.com/api/docs/models/gpt-5-mini" },
  { ma: "gpt-5", ten: "GPT-5 (khôn nhất)", gia: { vao: 1_250_000, vaoDem: 125_000, ra: 10_000_000 }, mucSuyNghi: MUC_GPT5, ngayTraGia: "2026-10-01", nguonGia: "https://developers.openai.com/api/docs/models/gpt-5" },
];

export const MAU_MAC_DINH = "gpt-5-nano";
export const DO_DAI: readonly DoDai[] = ["low", "medium", "high"];
export const MUC_NHAN: Record<MucSuyNghi, string> = { minimal: "Tối thiểu", low: "Thấp", medium: "Vừa", high: "Cao" };
export const DO_DAI_NHAN: Record<DoDai, string> = { low: "Ngắn", medium: "Vừa", high: "Dài" };
/** Ước tính thô một câu (B1): ngân sách tài liệu 6.000 token (= NGAN_SACH_TOKEN của tro-ly.ts — tro-ly.test.ts ghim bằng nhau) + token ra tối đa. */
export const TOKEN_VAO_UOC_MOT_CAU = 6000;

export const timMau = (ma: string | null | undefined): MauAi | null => DANH_SACH_MAU.find((m) => m.ma === ma) ?? null;
const giaCua = (ma: string | null | undefined): GiaMau => (timMau(ma) ?? DANH_SACH_MAU[0]!).gia;

export interface SoToken { readonly vao: number; readonly vaoDem: number; readonly ra: number }

/** micro-USD, làm tròn LÊN: ((vào − đệm) × giá vào + đệm × giá đệm + ra × giá ra) / 1.000.000. Mẫu null / lạ ⇒ giá nano (lượt trước ADR-0073 — B8). */
export function chiPhiMicroUsd(u: SoToken | null, ma?: string | null): number {
  if (!u) return 0;
  const g = giaCua(ma);
  const khongDem = Math.max(0, u.vao - u.vaoDem);
  return Math.ceil((khongDem * g.vao + u.vaoDem * g.vaoDem + u.ra * g.ra) / 1_000_000);
}

/** Chi phí TỐI ĐA của một lượt trước khi gọi (Đ7b): token vào ước × giá vào + token ra tối đa × giá ra (token suy nghĩ nằm trong token ra). */
export const chiPhiToiDa = (ma: string, tokenVaoUoc: number, tokenRaToiDa: number): number =>
  chiPhiMicroUsd({ vao: tokenVaoUoc, vaoDem: 0, ra: tokenRaToiDa }, ma);

/** Ước tính thô một câu cho bảng điều khiển (B1) — chưa tính token suy nghĩ vượt trần và phần nhớ. */
export const uocMotCauMicroUsd = (ma: string, tokenRaToiDa: number): number => chiPhiToiDa(ma, TOKEN_VAO_UOC_MOT_CAU, tokenRaToiDa);

/** Trần tháng (ADR-0066 điều 6 + ADR-0073 Đ7b): đã chạm trần, HOẶC đã dùng + chi phí tối đa của lượt sắp gọi vượt trần ⇒ không gọi. */
export const vuotTranThang = (daDung: number, toiDa: number, tran: number): boolean => daDung >= tran || daDung + toiDa > tran;
