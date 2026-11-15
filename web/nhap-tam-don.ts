// ADR-0192 mục 5: dọn bản chụp form đơn trong sessionStorage — một hàm cho ba chỗ: `initShell` của mọi trang (mã người đang đăng nhập: xoá bản của người khác, quá 30 phút, hỏng),
// `logout` và màn bảo trì (mã rỗng: không bản nào khớp ⇒ xoá hết). Không đặt trong `xoaKhungNho` (hàm đó chạy ngay trong `goLogin`, sẽ xoá bản vừa chụp).
// Nằm trong gói mọi trang, kể cả trang Đơn hàng có trần dung lượng: viết gọn có chủ ý (chủ dự án duyệt nới 10/11/2026). sessionStorage bị chặn → bỏ qua, không cản gì.
import { TIEN_TO_NHAP_TAM, nenXoaKhiMoTrang } from "../src/shared/nhap-tam-don";

export function donNhapTam(staffId: string): void {
  try {
    const s = sessionStorage;
    // Giá trị luôn do JSON.stringify ghi (web/order-form.ts) nên JSON.parse không ném trong thực tế; bọc riêng từng khoá tốn ~30 byte vượt mức chủ duyệt — một giá trị bị sửa tay
    // làm dừng vòng ở lần mở trang đó (không lộ gì; bản đó cũng không khôi phục được vì `docBanChup` trả null).
    for (const k in s) if (k.startsWith(TIEN_TO_NHAP_TAM) && nenXoaKhiMoTrang(JSON.parse(s[k]!), staffId, Date.now())) s.removeItem(k);
  } catch {
    // bỏ qua
  }
}
