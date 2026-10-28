// Việc BÊN NGOÀI của kho tệp vé hỗ trợ (ADR-0144 đ2, đ6; Hiến chương 5.16; khuôn src/modules/parties/kho-tep.ts của ADR-0123): đặt / xoá đối tượng R2 chạy SAU lô
// D1 đã ghi. Lỗi kho hay lỗi đánh dấu KHÔNG ném — dòng còn "tải dở dang" (stored_at rỗng) hoặc "chờ xoá" (purged_at có, r2_deleted_at rỗng) để thấy được
// (GET /api/feedback/tep-cho-xoa, kiểm R-FBK-1) và chạy lại (POST /api/feedback/tep-cho-xoa/chay-lai).
// Không import module khác (chạy được bằng node --test): câu nhật ký do route dựng và truyền vào. Chỉ feedback chạm kho này (bài src/kho-tep-ho-tro.test.ts).
// Hai bài tĩnh đếm chữ gọi hàm kho kèm ngoặc trên mã nguồn thô — chú thích ở tệp này đừng viết tên hàm kho kèm ngoặc.
import { LOAI_NOI_DUNG, type LoaiTep } from "../../shared/tep-dinh-kem.ts";
import { listTepChoDat, markTepR2Deleted, markTepStored, type TepCanXoaRow } from "./repository.ts";

const ghiLoi = (event: string, tepId: string | null, e?: unknown): void =>
  console.error(JSON.stringify({ level: "error", event, tepId, ...(e === undefined ? {} : { loi: e instanceof Error ? e.name : "unknown" }) }));

/** Xoá từng đối tượng rồi đánh dấu `r2_deleted_at`. Xoá R2 vốn không lỗi khi đối tượng đã mất (chạy lại an toàn). */
export async function xoaKhoiKho(db: D1Database, kho: R2Bucket, ds: readonly TepCanXoaRow[], luc: () => string): Promise<{ daXoa: number; loi: number }> {
  let daXoa = 0;
  let loi = 0;
  for (const t of ds) {
    try {
      await kho.delete(t.storage_key);
      await markTepR2Deleted(db, t.id, luc());
      daXoa++;
    } catch (e) {
      loi++;
      ghiLoi("ho_tro_tep_xoa_kho_loi", t.id, e);
    }
  }
  return { daXoa, loi };
}

/** Tệp đã kiểm của một tin, giữ trong bộ nhớ từ lúc dựng lô tới lúc đặt kho — tra theo mã tệp (khoá kho đọc lại từ D1, không lấy từ đây). */
export interface TepChuanBi { id: string; bytes: Uint8Array; loai: LoaiTep }

/**
 * Sau lô D1 đã chèn tin + dòng tệp: ĐỌC LẠI dòng tệp có thật của tin (chỉ những dòng này được đặt kho), đặt từng đối tượng, rồi đánh dấu đã lưu.
 * Đặt hỏng ⇒ lô quyết xoá `loQuyetXoa` (câu quyết xoá + nhật ký, do route dựng) rồi xoá kho; đánh dấu hỏng ⇒ dòng còn "tải dở dang".
 * KHÔNG BAO GIỜ NÉM (ADR-0144 đ2 — route không được trả 5xx sau lô có vé, BL-TEP-PHAT-LAI-500): mọi lỗi, kể cả lỗi đọc lại, chỉ ghi log.
 * Trả số tệp CHƯA lưu được (gồm dòng không chèn được vì trần tệp vừa chạm trong khe).
 */
export async function datTepCuaTin(
  db: D1Database, kho: R2Bucket,
  v: { messageId: string; tep: readonly TepChuanBi[]; loQuyetXoa: (tepId: string, at: string) => D1PreparedStatement[]; luc: () => string },
): Promise<number> {
  if (v.tep.length === 0) return 0;
  let daLuu = 0;
  try {
    const theoId = new Map(v.tep.map((t) => [t.id, t]));
    for (const d of await listTepChoDat(db, v.messageId)) {
      const t = theoId.get(d.id);
      if (!t) continue;
      try {
        await kho.put(d.storage_key, t.bytes, { httpMetadata: { contentType: LOAI_NOI_DUNG[t.loai] } });
      } catch (e) {
        ghiLoi("ho_tro_tep_tai_len_loi", d.id, e);
        try {
          await db.batch(v.loQuyetXoa(d.id, v.luc()));
          await xoaKhoiKho(db, kho, [d], v.luc);
        } catch (e2) {
          ghiLoi("ho_tro_tep_danh_dau_xoa_loi", d.id, e2); // dòng còn "tải dở dang" — lệnh chạy lại quyết xoá sau CHUA_TAI_DUOC_SAU_MS
        }
        continue;
      }
      try {
        if ((await markTepStored(db, d.id, v.luc())) === 1) daLuu++;
        else ghiLoi("ho_tro_tep_danh_dau_luu_khong_doi", d.id);
      } catch (e) {
        ghiLoi("ho_tro_tep_danh_dau_luu_loi", d.id, e);
      }
    }
  } catch (e) {
    ghiLoi("ho_tro_tep_doc_lai_loi", null, e);
  }
  return v.tep.length - daLuu;
}
