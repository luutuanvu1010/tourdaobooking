// Việc BÊN NGOÀI của kho tệp hồ sơ (ADR-0123 đ6; Hiến chương 5.16): xoá đối tượng R2 chạy SAU lô D1 đã ghi quyết định xoá. Lỗi R2 KHÔNG ném — dòng còn "chờ xoá"
// (purged_at có, r2_deleted_at rỗng) để thấy được (GET /api/parties/tep-cho-xoa, kiểm R-PTY-12) và chạy lại (POST /api/parties/tep-cho-xoa/chay-lai).
// Không import module khác (chạy được bằng node --test). Chỉ parties chạm kho (bài src/kho-tep-ho-so.test.ts).
import { markTepR2Deleted } from "./repository.ts";

export interface TepCanXoa { id: string; storage_key: string }

/** Xoá từng đối tượng rồi đánh dấu `r2_deleted_at`. Xoá R2 vốn không lỗi khi đối tượng đã mất (chạy lại an toàn). */
export async function xoaKhoiKho(db: D1Database, kho: R2Bucket, ds: readonly TepCanXoa[], luc: () => string): Promise<{ daXoa: number; loi: number }> {
  let daXoa = 0;
  let loi = 0;
  for (const t of ds) {
    try {
      await kho.delete(t.storage_key);
      await markTepR2Deleted(db, t.id, luc());
      daXoa++;
    } catch (e) {
      loi++;
      console.error(JSON.stringify({ level: "error", event: "ho_so_tep_xoa_kho_loi", tepId: t.id, loi: e instanceof Error ? e.name : "unknown" }));
    }
  }
  return { daXoa, loi };
}

/** Lô D1 (quyết xoá + nhật ký) TRƯỚC, rồi mới xoá kho. Lô lỗi ⇒ ném lên, KHÔNG chạm kho. */
export async function ghiRoiXoaKho(
  db: D1Database, kho: R2Bucket, lo: D1PreparedStatement[], ds: readonly TepCanXoa[], luc: () => string,
): Promise<{ daXoa: number; loi: number }> {
  if (lo.length > 0) await db.batch(lo);
  return xoaKhoiKho(db, kho, ds, luc);
}
