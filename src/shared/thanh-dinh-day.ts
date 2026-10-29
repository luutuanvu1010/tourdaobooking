// Thanh dính đáy trang (đợt 0, K4): trang có một thanh dính đang hiện thì thanh tab dưới đáy tự ẩn — chỉ MỘT thanh dính tại một thời điểm.
export const BO_CHON_THANH_DINH = ".thanh-hanh-dong-cuoi:not(.dp-run-end)";

type PhanTu = { getClientRects?: () => ArrayLike<unknown>; closest: (s: string) => Element | null };

/** Thanh dính đầu tiên đang hiện (có hộp hiển thị) và không nằm trong bảng trượt `.sheet-root`; không có → null. Thiếu `getClientRects` (DOM giả) → coi như ẩn.
 *  Có `viTri` (đọc `position` đã tính) thì chỉ đếm phần tử `fixed` / `sticky`: vài thanh chỉ dính ở ≤ 640 và nằm tĩnh ở 641–899, nơi thanh tab vẫn hiện (Q-2). */
export function thanhDinhHien<T extends PhanTu>(ds: Iterable<T>, viTri?: (e: T) => string): T | null {
  for (const e of ds) if (!e.closest(".sheet-root") && (e.getClientRects?.().length ?? 0) > 0 && (!viTri || /^(fixed|sticky)$/.test(viTri(e)))) return e;
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
