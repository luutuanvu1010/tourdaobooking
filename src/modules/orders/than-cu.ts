// ADR-0047 §6 (Phần C — Đợt 8 lộ trình Vận chuyển): nhận diện thân yêu cầu KIỂU CŨ (PWA chưa tải bản ≥ 1.62) và ĐẾM mỗi lần nhận, để chủ dự án biết
// lúc nào không còn máy cũ (cổng trước khi cắt). Dòng đếm = một dòng audit_log `client_outdated_body`: người thao tác + nhãn màn hình, KHÔNG gắn đơn,
// KHÔNG nội dung thân. Tệp này THUẦN (không I/O); hàm ghi dòng đếm `demThanCu` nằm ở repository.ts.

export type LoaiThanCu = "lap_don" | "luu_nhap" | "sua_chuyen";
export const NHAN_THAN_CU: Record<LoaiThanCu, string> = { lap_don: "Lập đơn", luu_nhap: "Lưu nháp", sua_chuyen: "Sửa thông tin chuyến" };

/** Câu trả về máy cũ khi đã cắt (Task 4). Máy cũ hiện băng riêng của nó ("Trang đã cũ…"); câu này cho máy khác / nhật ký Worker. */
export const CAU_CAP_NHAT_APP =
  "Ứng dụng trên máy này là bản cũ nên chưa lưu được giờ đón, nơi đón kiểu mới. Hãy đóng hẳn ứng dụng rồi mở lại (hoặc tải lại trang) để cập nhật, rồi làm lại.";

const laDoiTuong = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const dichVu = (body: unknown): Record<string, unknown>[] =>
  laDoiTuong(body) && Array.isArray(body.services) ? body.services.filter(laDoiTuong) : [];

/** Thân `POST /api/orders` / `PUT /api/orders/:id` kiểu cũ: có dịch vụ KHÔNG có khoá `legs`. */
export const laThanDonCu = (body: unknown): boolean => dichVu(body).some((s) => !("legs" in s));

/** Thân `PUT /api/orders/:id/trip` kiểu cũ: có dịch vụ mang khoá `pickupTime` hoặc `pickupPlace`. */
export const laThanTripCu = (body: unknown): boolean => dichVu(body).some((s) => "pickupTime" in s || "pickupPlace" in s);
