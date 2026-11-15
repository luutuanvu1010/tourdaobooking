// Việc BÊN NGOÀI của kho ảnh đại diện dịch vụ (ADR-0201 Đ3; binding `ANH_DICH_VU`). Chỉ tệp này của catalog chạm kho (bài src/kho-tep-anh-dich-vu.test.ts).
// KHÁC khuôn kho biên lai (lô D1 trước, đặt kho sau): ở đây ĐẶT KHO TRƯỚC rồi mới chèn dòng chi tiết trỏ tới khoá. Lý do: ảnh đại diện không phải dữ liệu riêng tư
// (Đ3 mục 2), nên đối tượng mồ côi khi lô D1 hỏng là vô hại; còn chèn dòng trước thì lỗi kho sẽ để danh mục trỏ tới ảnh không có. Ảnh cũ không xoá khỏi kho (Đ3 mục 2).
// Hai bài tĩnh đếm chữ gọi hàm kho kèm ngoặc trên mã nguồn thô — chú thích đừng viết kèm ngoặc.
import { LOAI_NOI_DUNG } from "../../shared/tep-dinh-kem.ts";
import type { LoaiAnh } from "../../shared/anh-dich-vu.ts";

/** Đặt ảnh vào kho. Trả true khi đã lưu; lỗi kho chỉ ghi log (route trả 503, chưa ghi dòng nào). */
export async function datAnh(kho: R2Bucket, khoa: string, bytes: Uint8Array, loai: LoaiAnh): Promise<boolean> {
  try {
    await kho.put(khoa, bytes, { httpMetadata: { contentType: LOAI_NOI_DUNG[loai] } });
    return true;
  } catch (e) {
    console.error(JSON.stringify({ level: "error", event: "anh_dich_vu_tai_len_loi", loi: e instanceof Error ? e.name : "unknown" }));
    return false;
  }
}

/** Đọc ảnh theo khoá; không có đối tượng ⇒ null. */
export async function docAnh(kho: R2Bucket, khoa: string): Promise<{ body: ReadableStream; loaiNoiDung: string } | null> {
  const o = await kho.get(khoa);
  if (!o) return null;
  return { body: o.body, loaiNoiDung: o.httpMetadata?.contentType ?? "application/octet-stream" };
}
