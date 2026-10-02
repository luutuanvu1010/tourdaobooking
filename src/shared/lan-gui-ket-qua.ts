// LỚP CHỐNG GHI TRÙNG (ADR-0094 A-10) — route TẠO bản ghi mới mà trả 200 (không 201) ⇒ không có `Location` ⇒ gửi lặp cùng vé chỉ TẢI LẠI trang. Mỗi mục có
// lý do. Lập bằng tay ở L7 (2026-10-02): mọi route tạo đều trả 201 + `Location` (bài src/lan-gui-location.test.ts + kiểm ở `call()` của khung thử và e2e);
// các route ghi trả 200 còn lại là SỬA / chuyển trạng thái trên một bản ghi đang mở ⇒ tải lại đúng trang đang đứng là kết quả đúng, không cần mục.
// Riêng `POST /api/thong-bao` trả 200 khi trùng `clientRequestId` (cơ chế cũ của Thông báo, ADR-0094 đ10) — nhánh đó cũng gửi `Location`.

export interface MucTaiLai {
  readonly method: "POST" | "PUT" | "PATCH" | "DELETE";
  readonly path: string;
  readonly lyDo: string;
}
export const TAO_TRA_200: readonly MucTaiLai[] = [];
