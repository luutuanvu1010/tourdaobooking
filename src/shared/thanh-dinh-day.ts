// Thanh dính đáy trang (đợt 0, K4): trang có một thanh dính đang hiện thì thanh tab dưới đáy tự ẩn — chỉ MỘT thanh dính tại một thời điểm.
export const BO_CHON_THANH_DINH = ".thanh-hanh-dong-cuoi:not(.dp-run-end)";

type PhanTu = { getClientRects?: () => ArrayLike<unknown>; closest: (s: string) => Element | null };

/** Có phần tử nào đang hiện (có hộp hiển thị) và không nằm trong bảng trượt `.sheet-root`. Thiếu `getClientRects` (DOM giả) → false. */
export function coThanhDinhHien(ds: Iterable<PhanTu>): boolean {
  for (const e of ds) if (!e.closest(".sheet-root") && (e.getClientRects?.().length ?? 0) > 0) return true;
  return false;
}
