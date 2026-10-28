// Dải trên trang: MỘT chủ sở hữu (web/dai.ts), một dải hiện một lúc (đặc tả đợt 0, §5.6). Thuần: không DOM.
export type LoaiDai = "bao-tri" | "ngoai-mang" | "thong-bao" | "bao-mat";

/** Thứ tự ưu tiên, trước thắng. */
export const UU_TIEN: readonly LoaiDai[] = ["bao-tri", "ngoai-mang", "thong-bao", "bao-mat"];

export function chonDai(coMat: ReadonlySet<LoaiDai> | readonly LoaiDai[]): LoaiDai | null {
  const co = new Set<LoaiDai>(coMat);
  return UU_TIEN.find((l) => co.has(l)) ?? null;
}

export const TONG_DAI: Record<LoaiDai, { tong: "bien" | "cat" | "do"; hinh: "history" | "clock" | "alertCircle" }> = {
  "bao-tri": { tong: "bien", hinh: "history" },
  "ngoai-mang": { tong: "cat", hinh: "clock" },
  "thong-bao": { tong: "cat", hinh: "clock" },
  "bao-mat": { tong: "do", hinh: "alertCircle" },
};

export const CAU_NGOAI_MANG = "Đang ngoài mạng — dữ liệu lần xem gần nhất";
export const KHOA_DAI_BAO_MAT_DA_DONG = "dai-bao-mat-da-dong";

export function cauBaoTri(gioDuKien: string | null): string {
  return gioDuKien ? `Đang bảo trì, dự kiến xong ${gioDuKien}` : "Đang bảo trì";
}
