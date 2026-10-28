// Thanh dính đáy trang (đợt 0, K4): trang có một thanh dính đang hiện thì thanh tab dưới đáy tự ẩn — chỉ MỘT thanh dính tại một thời điểm.
export const BO_CHON_THANH_DINH = ".thanh-hanh-dong-cuoi:not(.dp-run-end)";

type PhanTu = { getClientRects?: () => ArrayLike<unknown>; closest: (s: string) => Element | null };

/** Thanh dính đầu tiên đang hiện (có hộp hiển thị) và không nằm trong bảng trượt `.sheet-root`; không có → null. Thiếu `getClientRects` (DOM giả) → coi như ẩn. */
export function thanhDinhHien<T extends PhanTu>(ds: Iterable<T>): T | null {
  for (const e of ds) if (!e.closest(".sheet-root") && (e.getClientRects?.().length ?? 0) > 0) return e;
  return null;
}

export const coThanhDinhHien = (ds: Iterable<PhanTu>): boolean => thanhDinhHien(ds) !== null;

/** Gọi `doi(co)` ở lần đầu và chỉ khi `co` đổi so với lần trước (tránh bật/tắt lớp lặp lại mỗi lần DOM biến động). */
export function boTheoDoi(doi: (co: boolean) => void): (co: boolean) => void {
  let truoc: boolean | null = null;
  return (co) => {
    if (co === truoc) return;
    truoc = co;
    doi(co);
  };
}
