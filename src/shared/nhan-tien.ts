// Nhãn khoản khách đã trả — luật THUẦN dùng chung máy chủ ↔ giao diện (ADR-0089 đ3, đ9b; lời chủ 4 câu 2: tiền trả trước là nghĩa vụ của công ty với
// khách, hiển thị "Khách hàng đã trả trước"; lời chủ 5 Đ-4: sau "Đã giao" là "Đã thu"; Đ-6: đơn khách huỷ là "Cọc giữ lại", có hạn hoàn). Nền tảng KHÔNG
// tự gắn nhãn kế toán (đ3). Một hàm cho trang đơn, Việc của tôi, ảnh gửi khách (NT-V1).
import type { NhomHuy } from "./ly-do-huy.ts";

const ngayVn = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function nhanTienDaTra(input: {
  status: "draft" | "confirmed" | "cancelled";
  deliveredAt: string | null;
  /** Nhóm lý do huỷ hiện hành (chỉ đơn huỷ). */
  nhom?: NhomHuy | null;
  /** Hạn hoàn cọc YYYY-MM-DD (chỉ đơn huỷ). */
  han?: string | null;
  homNay?: string;
}): { nhan: string; phu: string | null } {
  if (input.deliveredAt) return { nhan: "Đã thu", phu: null };
  if (input.status === "cancelled" && input.nhom === "KHACH_HUY" && input.han && input.homNay) {
    return input.homNay <= input.han ? { nhan: "Cọc giữ lại – khách huỷ", phu: `còn có thể hoàn tới ${ngayVn(input.han)}` } : { nhan: "Cọc giữ lại", phu: null };
  }
  return { nhan: "Khách hàng đã trả trước", phu: null };
}
