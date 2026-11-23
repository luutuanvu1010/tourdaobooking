// Việc BÊN NGOÀI của kho Ảnh bàn giao (ADR-0232 Đ3, Đ5, Đ7; Hiến chương 5.16; khuôn billing/kho-bien-lai.ts): đặt / đọc / xoá đối tượng R2 chạy SAU lô D1.
// Lỗi kho hay lỗi đánh dấu KHÔNG ném — dòng còn «tải dở dang» (stored_at rỗng) hoặc «chờ xoá» (purged_at có, r2_deleted_at rỗng), thấy được ở
// GET /api/anh-ban-giao/cho-xoa và chạy lại ở POST /api/anh-ban-giao/cho-xoa/chay-lai.
// Chỉ tệp này (và index.ts khi đọc ảnh để trả về) của anh-ban-giao chạm kho (bài src/kho-tep-anh-ban-giao.test.ts). Chú thích đừng viết tên hàm kho kèm ngoặc.
import { anhChoDat, danhDauDaLuu, danhDauDaXoaKho, type KhoaAnhRow } from "./repository.ts";

const ghiLoi = (event: string, anhId: string | null, e?: unknown): void =>
  console.error(JSON.stringify({ level: "error", event, anhId, ...(e === undefined ? {} : { loi: e instanceof Error ? e.name : "unknown" }) }));

/** Sau lô D1 đã chèn dòng ảnh: ĐỌC LẠI dòng (chỉ dòng có thật được đặt kho), đặt HAI đối tượng, rồi đánh dấu đã lưu. Không ném. Trả true khi đã lưu xong. */
export async function datAnh(db: D1Database, kho: R2Bucket, v: { anhId: string; nho: Uint8Array; xem: Uint8Array; luc: () => string }): Promise<boolean> {
  try {
    const d = await anhChoDat(db, v.anhId);
    if (!d) return false;
    try {
      await kho.put(d.thumb_key, v.nho, { httpMetadata: { contentType: "image/jpeg" } });
      await kho.put(d.view_key, v.xem, { httpMetadata: { contentType: "image/jpeg" } });
    } catch (e) {
      ghiLoi("anh_ban_giao_tai_len_loi", d.id, e); // dòng ở lại «tải dở dang»; hàng chờ quyết gỡ TAI_LEN_LOI và xoá cả hai khoá
      return false;
    }
    try {
      if ((await danhDauDaLuu(db, d.id, v.luc())) === 1) return true;
      ghiLoi("anh_ban_giao_danh_dau_luu_khong_doi", d.id);
    } catch (e) {
      ghiLoi("anh_ban_giao_danh_dau_luu_loi", d.id, e);
    }
  } catch (e) {
    ghiLoi("anh_ban_giao_doc_lai_loi", null, e);
  }
  return false;
}

/** Xoá cả hai đối tượng của từng ảnh rồi đánh dấu `r2_deleted_at`. Xoá R2 không lỗi khi đối tượng đã mất (chạy lại an toàn). Không ném. */
export async function xoaAnhKhoiKho(db: D1Database, kho: R2Bucket, ds: readonly KhoaAnhRow[], luc: () => string): Promise<{ daXoa: number; loi: number }> {
  let daXoa = 0;
  let loi = 0;
  for (const t of ds) {
    try {
      await kho.delete([t.thumb_key, t.view_key]);
      await danhDauDaXoaKho(db, t.id, luc());
      daXoa++;
    } catch (e) {
      loi++;
      ghiLoi("anh_ban_giao_xoa_kho_loi", t.id, e);
    }
  }
  return { daXoa, loi };
}

/** Đọc MỘT đối tượng (route đã kiểm quyền và GHI NHẬT KÝ trước). Thiếu đối tượng ⇒ null. */
export async function docAnh(kho: R2Bucket, key: string): Promise<R2ObjectBody | null> {
  return kho.get(key);
}
