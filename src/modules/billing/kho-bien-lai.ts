// Việc BÊN NGOÀI của kho ảnh biên lai (ADR-0196 Đ2, Đ4, Đ7; Hiến chương 5.16; khuôn src/modules/feedback/kho-tep.ts của ADR-0144): đặt / xoá đối tượng R2 chạy SAU
// lô D1 đã ghi. Lỗi kho hay lỗi đánh dấu KHÔNG ném — dòng còn «tải dở dang» (stored_at rỗng) hoặc «chờ xoá» (purged_at có, r2_deleted_at rỗng) để thấy được
// (GET /api/ledger/bien-lai-cho-xoa, kiểm R-BIL-BL1) và chạy lại (POST /api/ledger/bien-lai-cho-xoa/chay-lai).
// KHÁC khuôn feedback (ADR-0196 Đ2 nói rõ): đặt kho hỏng thì KHÔNG quyết xoá ngay — dòng ở lại «tải dở dang» để Kế toán thấy «ảnh chưa tải xong»; lệnh chạy lại
// quyết xoá TAI_LEN_DO_DANG sau CHUA_TAI_DUOC_SAU_MS (khoản thành «Chưa có biên lai», Đ11).
// Chỉ tệp này của billing chạm kho (bài src/kho-tep-bien-lai.test.ts). Hai bài tĩnh đếm chữ gọi hàm kho kèm ngoặc trên mã nguồn thô — chú thích đừng viết kèm ngoặc.
import { LOAI_NOI_DUNG, type LoaiTep } from "../../shared/tep-dinh-kem.ts";
import { anhChoDat, danhDauDaLuu, danhDauDaXoaKho, type AnhCanXoaRow } from "./bien-lai-repo.ts";

const ghiLoi = (event: string, anhId: string | null, e?: unknown): void =>
  console.error(JSON.stringify({ level: "error", event, anhId, ...(e === undefined ? {} : { loi: e instanceof Error ? e.name : "unknown" }) }));

/**
 * Sau lô D1 đã chèn khoản thu + dòng ảnh: ĐỌC LẠI dòng ảnh có thật của khoản thu (chỉ dòng này được đặt kho), đặt đối tượng, rồi đánh dấu đã lưu.
 * KHÔNG BAO GIỜ NÉM (route không được trả 5xx sau lô đã có khoản thu): mọi lỗi chỉ ghi log. Trả true khi ảnh đã lưu xong.
 */
export async function datBienLai(db: D1Database, kho: R2Bucket, v: { receiptId: string; anhId: string; bytes: Uint8Array; loai: LoaiTep; luc: () => string }): Promise<boolean> {
  try {
    const d = (await anhChoDat(db, v.receiptId)).find((x) => x.id === v.anhId);
    if (!d) return false;
    try {
      await kho.put(d.storage_key, v.bytes, { httpMetadata: { contentType: LOAI_NOI_DUNG[v.loai] } });
    } catch (e) {
      ghiLoi("bien_lai_tai_len_loi", d.id, e); // dòng ở lại «tải dở dang» (ADR-0196 Đ2)
      return false;
    }
    try {
      if ((await danhDauDaLuu(db, d.id, v.luc())) === 1) return true;
      ghiLoi("bien_lai_danh_dau_luu_khong_doi", d.id);
    } catch (e) {
      ghiLoi("bien_lai_danh_dau_luu_loi", d.id, e);
    }
  } catch (e) {
    ghiLoi("bien_lai_doc_lai_loi", null, e);
  }
  return false;
}

/** Xoá từng đối tượng rồi đánh dấu `r2_deleted_at`. Xoá R2 vốn không lỗi khi đối tượng đã mất (chạy lại an toàn). Không ném. */
export async function xoaBienLaiKhoiKho(db: D1Database, kho: R2Bucket, ds: readonly AnhCanXoaRow[], luc: () => string): Promise<{ daXoa: number; loi: number }> {
  let daXoa = 0;
  let loi = 0;
  for (const t of ds) {
    try {
      await kho.delete(t.storage_key);
      await danhDauDaXoaKho(db, t.id, luc());
      daXoa++;
    } catch (e) {
      loi++;
      ghiLoi("bien_lai_xoa_kho_loi", t.id, e);
    }
  }
  return { daXoa, loi };
}
