// Module receipt — BIÊN NHẬN / ảnh xác nhận gửi khách (ADR-0024 đ1, ADR-0026 đ11; kế hoạch sổ tiền lượt 1 Task 8). Hạng KHONG_BANG: không bảng, không câu
// SQL — chỉ chuyển tay cầm `env.DB` cho HÀM CÔNG BỐ của module mình phụ thuộc (orders: chi tiết đơn; billing: đã trả / còn lại; company: hồ sơ công ty chủ)
// rồi dựng `ReceiptDto` theo danh sách trắng (`rules.ts`). Chiều phụ thuộc: receipt → orders, billing, parties, company.
import type { ReceiptResponse } from "../../shared/contracts";
import { UUID_RE, error, json } from "../../shared/http";
import { can, seesOnlyAssignedOrders } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { soTienBienNhan } from "../billing";
import { congTyChoBienNhan } from "../company";
import { donChoBienNhan } from "../orders";
import { dungBienNhan } from "./rules";

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy đơn.");
const FORBIDDEN_VIEW = () => error(403, "forbidden", "Tài khoản này không được xem thông tin này.");

export const receiptModule: AppModule = {
  name: "receipt",
  routes: [
    // Biên nhận của MỘT đơn: khuôn quyền = chi tiết đơn (ADR-0019 đ2) — `order.view` phạm vi đơn (chỉ-FIELD không phụ trách → 404), rồi `money.view` +
    // `contact.view` (biên nhận có tiền và tên/SĐT khách). Người phụ trách KHÔNG nằm ở đây (receipt không phụ thuộc dispatch): trình duyệt tự lấy như trước.
    route("GET", "/api/orders/:id/receipt", "orders", async ({ env, params, staff, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [order, assigned] = await Promise.all([donChoBienNhan(env.DB, id), isAssigned(id)]);
      if (!order) return NOT_FOUND();
      const scope = { ownerId: order.staffId, assigned };
      if (!can(staff, "order.view", scope)) return seesOnlyAssignedOrders(staff) ? NOT_FOUND() : FORBIDDEN_VIEW();
      if (!can(staff, "money.view", scope) || !can(staff, "contact.view", scope)) return FORBIDDEN_VIEW();
      const [company, tien] = await Promise.all([congTyChoBienNhan(env.DB), soTienBienNhan(env.DB, id)]);
      if (!company) return error(404, "not_found", "Chưa có thông tin công ty.");
      // ADR-0089 NT-5: thiếu số tiền thì báo, KHÔNG đoán "còn lại = tổng đơn" (đơn huỷ từng bị ghi "còn nợ" vì dự phòng này).
      if (!tien) return error(503, "money_unavailable", "Chưa đọc được số tiền của đơn — tải lại rồi thử lại.");
      return json({ receipt: dungBienNhan(order, company, tien) } satisfies ReceiptResponse);
    }),
  ],
};
