// Việc BÊN NGOÀI của kho vé điện tử (ADR-0153 Đ1 mục 7, ĐỀ XUẤT; Hiến chương 5.22; khuôn src/modules/feedback/kho-tep.ts của ADR-0144): đặt / xoá đối tượng R2 chạy SAU lô D1
// đã ghi dòng vé. Lỗi kho KHÔNG ném (không được trả 5xx sau lô đã ghi): vé chưa lưu được thì quyết xoá (VOID) nên không bao giờ được giữ chỗ; đối tượng chờ xoá còn thấy được
// và chạy lại được. Không import module khác (chạy được bằng node --test). Chỉ ve-dien-tu chạm kho này (bài src/kho-tep-ve-dien-tu.test.ts).
// Hai bài tĩnh đếm chữ gọi hàm kho kèm ngoặc trên mã nguồn thô — chú thích ở tệp này đừng viết tên hàm kho kèm ngoặc.
import { LOAI_NOI_DUNG, type LoaiTep } from "../../shared/tep-dinh-kem.ts";
import { NGAY_LUU_ANH_LO_HUY } from "../../shared/ve-nhap-lo.ts";
import { cauRutVeChuaPhat, danhDauDaLuu, danhDauDaXoaR2, listChoXoa, listVeChoDat, type VeCanXoa } from "./repository.ts";

const ghiLoi = (event: string, veId: string | null, e?: unknown): void =>
  console.error(JSON.stringify({ level: "error", event, veId, ...(e === undefined ? {} : { loi: e instanceof Error ? e.name : "unknown" }) }));

/** Xoá từng đối tượng rồi đánh dấu `r2_deleted_at`. Xoá R2 vốn không lỗi khi đối tượng đã mất (chạy lại an toàn). */
export async function xoaKhoiKho(db: D1Database, kho: R2Bucket, ds: readonly VeCanXoa[], luc: () => string): Promise<{ daXoa: number; loi: number }> {
  let daXoa = 0;
  let loi = 0;
  for (const v of ds) {
    try {
      await kho.delete(v.storage_key);
      await danhDauDaXoaR2(db, v.id, luc());
      daXoa++;
    } catch (e) {
      loi++;
      ghiLoi("ve_dien_tu_xoa_kho_loi", v.id, e);
    }
  }
  return { daXoa, loi };
}

/** Lần chạy định kỳ: xoá ảnh đã quyết xoá khi đã quá hạn lưu (lô đã huỷ lưu `NGAY_LUU_ANH_LO_HUY` ngày; Hiến chương 5.16: thấy được ở `R-VDT-5`, chạy lại không cần người). KHÔNG BAO GIỜ NÉM. */
export async function donHangChoXoa(db: D1Database, kho: R2Bucket, gioiHan: number, luc: () => string): Promise<void> {
  try {
    const truocMoc = new Date(Date.parse(luc()) - NGAY_LUU_ANH_LO_HUY * 24 * 3600 * 1000).toISOString();
    await xoaKhoiKho(db, kho, await listChoXoa(db, truocMoc, gioiHan), luc);
  } catch (e) {
    ghiLoi("ve_dien_tu_don_hang_cho_loi", null, e);
  }
}

/** Byte vé đã kiểm của một lô, giữ trong bộ nhớ từ lúc dựng lô tới lúc đặt kho — tra theo mã vé (khoá kho đọc lại từ D1, không lấy từ đây). */
export interface VeChuanBi { id: string; bytes: Uint8Array; loai: LoaiTep }

/**
 * Sau lô D1 đã chèn các dòng vé (`stored_at` rỗng): ĐỌC LẠI dòng vé có thật của lô (chỉ những dòng này được đặt kho), đặt từng đối tượng, rồi đánh dấu đã lưu.
 * Đặt hỏng ⇒ rút vé (VOID, `purged_at`, `withdrawn_at`: chưa từng phát ra nên gửi lại được, ADR-0156 Đ2 mục 2) rồi thử xoá kho; đánh dấu hỏng ⇒ dòng còn "tải dở dang" (không bao giờ được giữ chỗ).
 * KHÔNG BAO GIỜ NÉM. Trả số vé CHƯA lưu được.
 */
export async function datVeVaoKho(db: D1Database, kho: R2Bucket, v: { batchId: string; ve: readonly VeChuanBi[]; luc: () => string }): Promise<number> {
  if (v.ve.length === 0) return 0;
  let daLuu = 0;
  try {
    const theoId = new Map(v.ve.map((x) => [x.id, x]));
    for (const d of await listVeChoDat(db, v.batchId)) {
      const x = theoId.get(d.id);
      if (!x) continue;
      try {
        await kho.put(d.storage_key, x.bytes, { httpMetadata: { contentType: LOAI_NOI_DUNG[x.loai] } });
      } catch (e) {
        ghiLoi("ve_dien_tu_tai_len_loi", d.id, e);
        try {
          await db.batch([cauRutVeChuaPhat(db, d.id, v.luc(), null)]);
          await xoaKhoiKho(db, kho, [d], v.luc);
        } catch (e2) {
          ghiLoi("ve_dien_tu_danh_dau_xoa_loi", d.id, e2);
        }
        continue;
      }
      try {
        if ((await danhDauDaLuu(db, d.id, v.luc())) === 1) daLuu++;
        // Vé vừa bị rút trong khe (huỷ lô xen giữa): dòng vé đã ở hàng chờ xoá, lần chạy định kỳ sau hạn lưu sẽ xoá đối tượng vừa đặt.
        else ghiLoi("ve_dien_tu_danh_dau_luu_khong_doi", d.id);
      } catch (e) {
        ghiLoi("ve_dien_tu_danh_dau_luu_loi", d.id, e);
      }
    }
  } catch (e) {
    ghiLoi("ve_dien_tu_doc_lai_loi", null, e);
  }
  return v.ve.length - daLuu;
}
