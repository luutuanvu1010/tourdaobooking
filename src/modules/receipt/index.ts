// Module receipt — BIÊN NHẬN / ảnh xác nhận gửi khách (ADR-0024 đ1, ADR-0026 đ11; kế hoạch sổ tiền lượt 1 Task 8). Hạng KHONG_BANG: không bảng, không câu
// SQL — chỉ chuyển tay cầm `env.DB` cho HÀM CÔNG BỐ của module mình phụ thuộc (orders: chi tiết đơn; billing: đã trả / còn lại; company: hồ sơ công ty chủ)
// rồi dựng `ReceiptDto` theo danh sách trắng (`rules.ts`); sổ đại lý đợt 2: chia phần theo người bán (bản chụp của orders). Chiều phụ thuộc: receipt → orders, billing, parties, company.
import type { PhieuCongNoResponse, QrKhongCoResponse, QrThanhToanResponse, ReceiptResponse } from "../../shared/contracts";
import { UUID_RE, error, json } from "../../shared/http";
import { can, seesOnlyAssignedOrders } from "../../shared/permissions";
import { CAU_PHIEU_CHUA_XAC_NHAN, laTaiKhoanDoiTac, xemDuocPhieuCongNo } from "../../shared/cong-no-dai-ly";
import { route, type AppModule } from "../../shared/router";
import { ketQuaXemDon } from "../../shared/xem-don-nhap";
import { congTyNhanTienKhach, phieuCongNoCuaDon, soTienBienNhan, soTienChoQr } from "../billing";
import { congTyChoBienNhan } from "../company";
import { donChoBienNhan, nguoiLapDoiTacThuan, phanThuongMaiCuaDon } from "../orders";
import { taiKhoanNhanTienHienHanh } from "../parties";
import { dungBienNhan, dungPhieuCongNo, dungQrThanhToan, kiemSoTienQr } from "./rules";

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
      // ADR-0135 Đ1: đơn nháp của người khác → 404 (luật thuần dùng chung); đơn đã xác nhận / huỷ giữ luật cũ.
      const xem = ketQuaXemDon({ coQuyenXem: can(staff, "order.view", scope), status: order.status, laNguoiLap: order.staffId === staff.id, dangCho: false, xetDuyetDuoc: false, chiXemDonDuocGiao: seesOnlyAssignedOrders(staff) });
      if (xem !== "ok") return xem === "404" ? NOT_FOUND() : FORBIDDEN_VIEW();
      if (!can(staff, "money.view", scope) || !can(staff, "contact.view", scope)) return FORBIDDEN_VIEW();
      // Sổ đại lý đợt 2 Task 8 (ADR-0078 điều 10): người bán từng dịch vụ (bản chụp) để chia phần — hàm công bố của orders KHÔNG tự kiểm quyền nên chỉ gọi ở đây,
      // SAU `can(` (src/orders-cong-bo.test.ts). `dungBienNhan` chỉ đọc người bán + tên người bán; mức, a%, người hưởng không bao giờ ra biên nhận.
      const [company, tien, phan, laDoiTacThuan] = await Promise.all([congTyChoBienNhan(env.DB), soTienBienNhan(env.DB, id), phanThuongMaiCuaDon(env.DB, id), nguoiLapDoiTacThuan(env.DB, order.staffId)]);
      if (!company) return error(404, "not_found", "Chưa có thông tin công ty.");
      // ADR-0089 NT-5: thiếu số tiền thì báo, KHÔNG đoán "còn lại = tổng đơn" (đơn huỷ từng bị ghi "còn nợ" vì dự phòng này).
      if (!tien) return error(503, "money_unavailable", "Chưa đọc được số tiền của đơn — tải lại rồi thử lại.");
      const ban = phan ? { chup: phan.chup, ten: phan.ten, congTyChuId: phan.congTyChuId } : null;
      return json({ receipt: dungBienNhan(order, company, tien, ban, laDoiTacThuan) } satisfies ReceiptResponse);
    }),

    // QR thanh toán của MỘT đơn (ADR-0108 đ3; đặc tả QR §7): cổng `orders` (HDV, Đối tác, Thực tập vào được — cổng office sẽ chặn họ). `order.view` TRƯỚC
    // (chỉ-HDV không phụ trách → 404, không dò được đơn có tồn tại), rồi `money.view` phạm vi đơn, rồi mới đọc tiền và tài khoản. Không ghi gì.
    route("GET", "/api/orders/:id/qr-thanh-toan", "orders", async ({ env, url, params, staff, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [order, assigned] = await Promise.all([donChoBienNhan(env.DB, id), isAssigned(id)]);
      if (!order) return NOT_FOUND();
      const scope = { ownerId: order.staffId, assigned };
      // ADR-0135 Đ1: đơn nháp của người khác → 404 (luật thuần dùng chung); đơn đã xác nhận / huỷ giữ luật cũ.
      const xem = ketQuaXemDon({ coQuyenXem: can(staff, "order.view", scope), status: order.status, laNguoiLap: order.staffId === staff.id, dangCho: false, xetDuyetDuoc: false, chiXemDonDuocGiao: seesOnlyAssignedOrders(staff) });
      if (xem !== "ok") return xem === "404" ? NOT_FOUND() : FORBIDDEN_VIEW();
      if (!can(staff, "money.view", scope)) return FORBIDDEN_VIEW();
      // ADR-0135 Đ8: QR chỉ cho đơn ĐÃ XÁC NHẬN (mọi đơn); đặt sau kiểm quyền xem để người không xem được vẫn nhận 404/403.
      if (order.status !== "confirmed") return error(409, "qr_requires_confirmed", "Đơn chưa xác nhận, chưa có mã QR thanh toán.");
      // ADR-0182 Đ2 mục 3: tài khoản Đối tác (ADR-0196 mục 1) không nhận QR giá bán lẻ — số đó lớn hơn số đại lý thật phải nộp. Đại lý dùng phiếu công nợ (QR giá đại lý). Trước mọi đọc số tiền / tài khoản.
      if (laTaiKhoanDoiTac(staff)) return json({ coQr: false } satisfies QrKhongCoResponse);
      // ADR-0178 Đ1 mục 2: đơn mang dấu Tắt (khách trả cho đối tác đã lập đơn) ⇒ không có QR vào tài khoản công ty. Trước mọi đọc số tiền / tài khoản.
      if (!(await congTyNhanTienKhach(env.DB, id))) return json({ coQr: false } satisfies QrKhongCoResponse);
      const tien = await soTienChoQr(env.DB, id);
      if (!tien) return error(503, "money_unavailable", "Chưa đọc được số tiền của đơn — tải lại rồi thử lại.");
      const so = kiemSoTienQr({ daGiao: tien.daGiao, conLai: tien.conLai, soTienRaw: url.searchParams.get("soTien") });
      if (!so.ok) return error(so.status, so.ma, so.cau);
      const tk = await taiKhoanNhanTienHienHanh(env.DB);
      if (!tk) return error(409, "bank_account_missing", "Công ty chưa cài tài khoản nhận tiền — báo người phụ trách hệ thống.");
      const qr = dungQrThanhToan({ maDon: order.orderCode, soTien: so.soTien, conLai: tien.conLai, tk });
      if (!qr.ok) return error(409, "bank_account_invalid", "Tài khoản nhận tiền của công ty chưa đúng dạng — báo người phụ trách hệ thống.");
      return json({ qr: qr.dto } satisfies QrThanhToanResponse);
    }),

    // Phiếu công nợ với Tour Đảo của MỘT đơn đại lý (ADR-0182 Đ2 mục 2; accepted 12/11). Cổng `orders`; `order.view` TRƯỚC (khuôn route QR — không dò được đơn), rồi ô xem phiếu
    // (`xemDuocPhieuCongNo`: Kế toán, Quản trị, Toàn quyền; đại lý chủ đơn). Chỉ đơn ĐÃ XÁC NHẬN. Mọi số do «Công nợ đại lý» của billing tính; route KHÔNG đọc tham số nào của đường dẫn
    // hay thân ngoài mã đơn. QR có bất kể công tắc ADR-0178 Đ1 (tiền đại lý nộp, không phải tiền khách). Không ghi gì.
    route("GET", "/api/orders/:id/cong-no-dai-ly", "orders", async ({ env, params, staff, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [order, assigned] = await Promise.all([donChoBienNhan(env.DB, id), isAssigned(id)]);
      if (!order) return NOT_FOUND();
      const scope = { ownerId: order.staffId, assigned };
      const xem = ketQuaXemDon({ coQuyenXem: can(staff, "order.view", scope), status: order.status, laNguoiLap: order.staffId === staff.id, dangCho: false, xetDuyetDuoc: false, chiXemDonDuocGiao: seesOnlyAssignedOrders(staff) });
      if (xem !== "ok") return xem === "404" ? NOT_FOUND() : FORBIDDEN_VIEW();
      if (!xemDuocPhieuCongNo(staff, order.bookerPartyId)) return FORBIDDEN_VIEW();
      if (order.status !== "confirmed") return error(409, "phieu_requires_confirmed", CAU_PHIEU_CHUA_XAC_NHAN);
      const so = await phieuCongNoCuaDon(env.DB, { id: order.id, booker_party_id: order.bookerPartyId, status: order.status });
      if (!so) return error(409, "khong_phai_don_dai_ly", "Đơn này không phải đơn đại lý, không có phiếu công nợ.");
      const tk = so.phieu.conLai > 0 ? await taiKhoanNhanTienHienHanh(env.DB) : null;
      const p = dungPhieuCongNo({ maDon: order.orderCode, phieu: so.phieu, hanTra: so.hanTra, tk });
      if (!p.ok) return error(409, "bank_account_invalid", "Tài khoản nhận tiền của công ty chưa đúng dạng — báo người phụ trách hệ thống.");
      return json({ phieu: p.dto } satisfies PhieuCongNoResponse);
    }),
  ],
};
