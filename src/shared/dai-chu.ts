// Dải trên trang: MỘT chủ sở hữu (web/dai.ts), một dải hiện một lúc (đặc tả đợt 0, §5.6). Thuần: không DOM.
export type LoaiDai = "xem-nhu-vai" | "bao-tri" | "ngoai-mang" | "thong-bao" | "bao-mat";

/** Thứ tự ưu tiên, trước thắng. */
// «xem-nhu-vai» (ADR-0180) đứng đầu: đang đóng vai thì phải luôn thấy nút Thoát.
export const UU_TIEN: readonly LoaiDai[] = ["xem-nhu-vai", "bao-tri", "ngoai-mang", "thong-bao", "bao-mat"];

export function chonDai(coMat: ReadonlySet<LoaiDai> | readonly LoaiDai[]): LoaiDai | null {
  const co = new Set<LoaiDai>(coMat);
  return UU_TIEN.find((l) => co.has(l)) ?? null;
}

export const TONG_DAI: Record<LoaiDai, { tong: "bien" | "cat" | "do"; hinh: "history" | "clock" | "alertCircle" }> = {
  "xem-nhu-vai": { tong: "cat", hinh: "alertCircle" },
  "bao-tri": { tong: "bien", hinh: "history" },
  "ngoai-mang": { tong: "cat", hinh: "clock" },
  "thong-bao": { tong: "cat", hinh: "clock" },
  "bao-mat": { tong: "do", hinh: "alertCircle" },
};

/** Khi thân trang đã là khối «chưa nạp» (không có dữ liệu cũ, đã có nút Thử lại riêng): dải chỉ báo ngắn, không nút. */
export const CAU_NGOAI_MANG_NGAN = "Đang ngoài mạng";
export const CAU_NGOAI_MANG = CAU_NGOAI_MANG_NGAN + " — dữ liệu lần xem gần nhất";
export const KHOA_DAI_BAO_MAT_DA_DONG = "dai-bao-mat-da-dong";
/** Chiều cao dải của lần vẽ trước trong thẻ (sessionStorage, chỉ một con số) — web/dai.ts giữ chỗ khi khung dựng để dải chèn muộn không đẩy trang (bước 1 khung chung, N10). */
export const KHOA_CAO_DAI = "td_dai_cao";
/** Tiền tố khoá «khối theo quyền đã hiện ở trang này lần trước» (sessionStorage, `td_khoi:<đường trang>` = tên khối cách nhau dấu cách) — web/giu-cho-dai.ts đọc ở đầu
 *  trang để CSS giữ chỗ khối đó từ lần vẽ đầu (bước 1 khung chung, N10). Chỉ tên khối, không dữ liệu. */
export const KHOA_KHOI = "td_khoi:";

export function cauBaoTri(gioDuKien: string | null): string {
  return gioDuKien ? `Đang bảo trì, dự kiến xong ${gioDuKien}` : "Đang bảo trì";
}
