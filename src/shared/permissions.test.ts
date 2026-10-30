import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MA_QUYEN_TIEN, MATRIX, O_GHI_TIEN, PERMISSION_CODES, can, canAccessOrders, chiGiaDanhMuc, coQuyenTien, hasPermission, holdsIntern, holdsPartner, isOffice, isPermissionCode, quyenHienThi, seesOnlyAssignedOrders,
  type OperationCode, type PermissionCode, type Scope,
} from "./permissions.ts";

// BẢN ĐỌC THỨ HAI của bảng ADR-0007 điều 1 SAU khi ADR-0009 đổi ba ô của SALES (order.modify, order.history.view, dispatch.assign: own → ownOrAssigned),
// ADR-0014 thêm PARTNER/SUPER_ADMIN + bốn thao tác mới, và ADR-0018 (giai đoạn 1) thêm cột INTERN TẠM HẸP — viết lại độc lập từ tài liệu ADR, không suy
// ra từ MATRIX. Cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER.
// ADR-0040 D3 + Ruling R2 (điều phối 2026-09-28): cột thứ tám DRIVER (Tài xế) thêm CUỐI — lượt 1a mọi ô nghiệp vụ = none, trừ gửi/xem góp ý của mình.
// ADR-0048 D2 (accepted 2026-09-28): cột thứ chín DRIVER_PARTNER (Tài xế đối tác) thêm CUỐI — mọi ô nghiệp vụ = none, trừ gửi/xem góp ý của mình và xem
// giấy tờ của chính mình (số che). Mọi ô tiền (money.view, order.money.edit, payment.*, invoice.*) = none.
// 3 dòng "feedback.*" là mở rộng của module Góp ý (spec 2026-09-21), không thuộc bảng ADR-0007 gốc.
// ADR-0071 (accepted 2026-10-01): cột thứ mười HR (Nhân sự — vai "Hành chính nhân sự") thêm CUỐI — chỉ ba ô tài khoản (account.create/view/edit) + các ô của
// mọi tài khoản (gửi/xem góp ý của mình, hỏi trợ lý, giấy tờ của chính mình). Ba thao tác MỚI account.*; staff.sheet.sync BỊ XOÁ (gỡ hẳn đồng bộ Sheet nhân viên).
const ADR: Record<string, [Scope, Scope, Scope, Scope, Scope, Scope, Scope, Scope, Scope, Scope]> = {
  "order.view": ["any", "any", "any", "assigned", "own", "any", "own", "none", "none", "none"], // ADR-0030 S23-1: FIELD chỉ đơn ĐANG phụ trách (thay ADR-0017 điều 1)
  "money.view": ["any", "any", "any", "assigned", "own", "any", "own", "none", "none", "none"], // ADR-0030 S23-1/S23-5 (sửa ADR-0019 điều 3: FIELD assigned, không any)
  "order.history.view": ["ownOrAssigned", "any", "any", "assigned", "own", "any", "own", "none", "none", "none"], // ADR-0030 S23-3: kể cả lịch sử đơn mình phụ trách
  "contact.view": ["any", "any", "any", "assigned", "ownOrAssigned", "any", "own", "none", "none", "none"],
  "order.create": ["any", "none", "any", "none", "any", "any", "any", "none", "none", "none"],
  "order.modify": ["ownOrAssigned", "none", "any", "none", "own", "any", "own", "none", "none", "none"],
  "order.trip.edit": ["ownOrAssigned", "none", "any", "none", "none", "any", "none", "none", "none", "none"],
  "order.leg.short_notice": ["any", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0049 D3: ô MỚI — đặt gấp chặng dưới mốc 6 giờ; ADR-0107 (i) NỚI có tên (Điều 9.4, chủ Q-3 a 8/10): + SALES any
  "order.leg.short_notice.view": ["any", "any", "any", "none", "none", "any", "none", "none", "none", "none"], // chủ H4/N-14 (29/9, Trả lời lần 12): ô MỚI — xem ĐỦ dấu đặt gấp; mã khác chỉ cờ
  "order.confirm.review": ["any", "any", "any", "any", "none", "any", "none", "none", "none", "none"], // ADR-0136 Đ4 (chủ duyệt 25/10): ô MỚI — người quyết định đơn đang chờ xác nhận (Còn vé / Hết vé / Huỷ); Đối tác, Thực tập, tài xế, Nhân sự none
  "order.submit": ["none", "none", "none", "none", "own", "any", "none", "none", "none", "none"], // ADR-0136 Đ13.6 (ADR-0018 đ6): ô MỚI — nút «Gửi đơn» của Đối tác (own), Toàn quyền any; mọi mã khác none
  "trip.view": ["any", "any", "any", "none", "none", "any", "none", "assigned", "assigned", "none"], // ADR-0049 D3: ô MỚI — DRIVER assigned (NỚI ghim DRIVER — ĐÃ DUYỆT 2026-09-30 (lần 17), đề xuất luật mục 2); ADR-0053 D7.1 (A4 T6): DRIVER_PARTNER assigned
  "trip.dispatch": ["any", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0049 D3: ô MỚI
  "trip.override": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0049 D3: ô MỚI — phá lệ luật cấu hình, chỉ Quản trị, Toàn quyền (ADR-0104 Đ1: khoảng nghỉ, cam kết khi chuyến ngoài mốc)
  "trip.urgent_adjust": ["any", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0104 Đ1 (Q-1 b): ô MỚI — điều chỉnh khẩn cấp: Bán hàng, Quản trị, Toàn quyền; còn lại none
  "dispatch.policy.lead": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0128 Q1: đặt mốc ra lệnh — Quản trị, Toàn quyền
  "trip.progress": ["any", "none", "any", "none", "none", "any", "none", "assigned", "assigned", "none"], // ADR-0053 D7.1 (A4 T6): DRIVER_PARTNER assigned; ADR-0049 D3 (A15): ô MỚI — lệnh tiến độ; DRIVER assigned (NỚI ghim DRIVER — ĐÃ DUYỆT 2026-09-30 (lần 17), đề xuất luật mục 2); văn phòng bấm thay (R-P1)
  "trip.passenger.add": ["none", "none", "none", "none", "none", "any", "none", "assigned", "none", "none"], // ADR-0052 D5b (Đợt 5 A-1b): ô MỚI — tài xế bổ sung tên khách chưa có tên trên chuyến mình đang lái; DRIVER assigned (nới ghim DRIVER — chủ DUYỆT 5/10, đề xuất luật A-1b mục 1); DRIVER_PARTNER none (chủ 5/10: chỉ tài xế công ty)
  "trip.refuse": ["none", "none", "none", "none", "none", "any", "none", "none", "assigned", "none"], // ADR-0053 D8 (kế hoạch A4 T3; DRIVER_PARTNER assigned ở T6): ô MỚI — tài xế từ chối chuyến MÌNH ĐANG LÁI trước hạn; cũng bật VẾ HẠN của khung xem khách (G-A4-2). T3: chỉ Toàn quyền any; DRIVER_PARTNER lật assigned ở T6; DRIVER none (tài xế công ty không Từ chối — D8.3)
  "unavailability.self": ["none", "none", "none", "none", "none", "any", "none", "none", "own", "none"], // ADR-0053 D9 (kế hoạch A4 T8): ô MỚI — báo bận của CHÍNH tài xế đối tác (ownerId = staff.id); văn phòng không ghi thay; tài xế công ty none (0053:49)
  "trip.transfer": ["none", "none", "none", "none", "none", "any", "none", "assigned", "assigned", "none"], // ADR-0052 D4 :84 (ĐP2 — chủ DUYỆT A-1 30/9) + ADR-0111: ô MỚI — tài xế gửi / rút đề nghị chuyển khách của chuyến MÌNH lái, nhận / không nhận đề nghị gửi tới chuyến MÌNH lái; DRIVER assigned (nới N1, ADR-0052:190); Toàn quyền any nhưng vẫn phải là tài xế đang lái (:84); văn phòng KHÔNG (gửi thay cứu hộ đi ô trip.progress — D5c); DRIVER_PARTNER assigned (nới N4, 12/10: ADR-0053:46 + ADR-0111 N4, sau khi A4 gộp)
  "trip.call_ack": ["ownOrAssigned", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0051 GB2: ô MỚI — "Đã gọi báo" / "Bỏ đánh dấu": người lập / người phụ trách đơn, Quản trị, Toàn quyền
  "order.passenger.write": ["ownOrAssigned", "none", "any", "none", "own", "any", "own", "none", "none", "none"], // ADR-0047 A2: ô MỚI — nhập/sửa (dòng mới)/huỷ dòng trong danh sách hành khách; bằng order.modify
  // ADR-0061 điều 2 (accepted 2026-09-30): ô MỚI — thêm/sửa dịch vụ nhập tay khi công tắc BẬT. ACCOUNTING any nhưng CHƯA có tác dụng (Kế toán không lập/sửa
  // đơn — chủ Q-1 "Giữ quyền sẵn, chờ việc C2"); PARTNER none VÀ máy chủ còn chặn mọi tài khoản có quyền Đối tác (holdsPartner — price-guards.ts).
  "order.service.manual": ["any", "any", "any", "none", "none", "any", "none", "none", "none", "none"],
  "task.progress": ["none", "none", "any", "assigned", "assigned", "any", "none", "none", "none", "none"],
  "order.money.edit": ["own", "any", "any", "assigned", "none", "any", "none", "none", "none", "none"], // ADR-0014 điều 6: FIELD đang phụ trách (đổi từ ADR-0009 điều 1 "KHÔNG đổi")
  "order.cancel": ["none", "none", "none", "assigned", "none", "any", "none", "none", "none", "none"], // ADR-0014 điều 11: thao tác MỚI
  "order.cancel.classify": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0089 đ8 (Đ-2): chọn "Công ty huỷ" + phân loại — Quản trị, Toàn quyền
  "deposit.refund.approve": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0089 đ4a, đ6, X-1, X-4: duyệt hoàn / chuyển, huỷ duyệt, xác nhận hoàn ngoài — Quản trị, Toàn quyền
  "deposit.transfer.approve": ["none", "any", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0120 Điều 2: duyệt chuyển tiền sang đơn mới — Kế toán, Quản trị, Toàn quyền (hoàn vẫn chỉ Quản trị, Toàn quyền)
  "deposit.outside.record": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0089 đ16, X-4: ghi đã hoàn ngoài hệ thống — chỉ Toàn quyền
  "dispatch.assign": ["ownOrAssigned", "none", "any", "none", "none", "any", "none", "none", "none", "none"],
  "dispatch.claim": ["any", "none", "any", "any", "none", "any", "none", "none", "none", "none"], // ADR-0009 điều 2: nhận phụ trách đơn chưa có người (điều kiện do dịch vụ của dispatch kiểm, không phải ô ma trận); ADR-0030 S20-6/S20-12: FIELD any
  "dispatch.guides.view": ["none", "none", "none", "none", "any", "any", "none", "none", "none", "none"], // ADR-0014 điều 9: thao tác MỚI
  "dispatch.refuse": ["assigned", "none", "assigned", "assigned", "none", "any", "none", "none", "none", "none"], // ADR-0030 điều 1: tự trả đơn đang phụ trách; route còn chốt ĐÚNG người phụ trách (cả Toàn quyền)
  // Sổ tiền lượt 1 (ADR-0026 điều 10 + bảng 9 cột của bản làm mới §2, accepted 2026-09-29): FIELD none → assigned, PARTNER none → own, INTERN none → own
  // (giữ năng lực ghi tiền trả trước hôm nay); hoàn khách: ADMIN any → none (H4 "Kế toán ghi"). DRIVER, DRIVER_PARTNER none.
  "payment.receive": ["own", "any", "any", "assigned", "own", "any", "own", "none", "none", "none"],
  "payment.refund": ["none", "any", "none", "none", "none", "any", "none", "none", "none", "none"],
  // Sổ tiền lượt 1 — bốn ô MỚI (bảng 9 cột bản làm mới §2): Đã giao (ADR-0025 đ2), Hoàn thành (đ6), xem sổ / ghi sổ (ADR-0026 đ7, đ10).
  "order.handover": ["none", "none", "any", "assigned", "none", "any", "none", "none", "none", "none"],
  "order.complete": ["none", "any", "none", "none", "none", "any", "none", "none", "none", "none"],
  "ledger.view": ["own", "any", "own", "own", "none", "any", "own", "none", "none", "none"],
  "ledger.write": ["none", "any", "none", "none", "none", "any", "none", "none", "none", "none"],
  // ADR-0115 đợt 1 (Q1 = A): duyệt / từ chối yêu cầu điều chỉnh công nợ — Kế toán, Quản trị, Toàn quyền (khác người tạo — kiểm ở máy chủ + trigger 0094). KHÔNG thuộc O_GHI_TIEN.
  "ledger.adjust.approve": ["none", "any", "any", "none", "none", "any", "none", "none", "none", "none"],
  // Khoá sổ tháng (ADR-0080 phần D1; đặc tả sổ đại lý đợt 1 §6): CHỈ Kế toán, Toàn quyền — Quản trị KHÔNG (lời chủ: "khoá tháng là việc của Kế toán"). Route POST /api/ledger/ky/:period/khoa.
  "ledger.period.close": ["none", "any", "none", "none", "none", "any", "none", "none", "none", "none"],
  "invoice.request": ["own", "any", "any", "none", "none", "any", "none", "none", "none", "none"],
  "invoice.issue": ["none", "any", "any", "none", "none", "any", "none", "none", "none", "none"],
  // ADR-0060 (accepted 2026-09-30): dấu "đã nhập phần mềm kế toán" — ghi chỉ Kế toán + Toàn quyền (không Quản trị); xem = order.view trừ Đối tác none (Q-2 "Không").
  "accounting.entry.mark": ["none", "any", "none", "none", "none", "any", "none", "none", "none", "none"],
  "accounting.entry.view": ["any", "any", "any", "assigned", "none", "any", "own", "none", "none", "none"],
  "party.view": ["any", "any", "any", "none", "none", "any", "none", "none", "none", "none"],
  "party.write": ["any", "any", "any", "none", "none", "any", "none", "none", "none", "none"],
  "party.staff.write": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0013
  "party.personal.view": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0122 đ5: ngày sinh + địa chỉ cá nhân của người khác — Quản trị (theo cấp bậc), Toàn quyền
  "admin.manage": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "none"],
  "admin.manage.superadmin": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0014 điều 2/8: thao tác MỚI
  "account.access.manage": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0042: Quản trị lấy lại (cấp dưới); ADR-0071 điều 1e: HR none
  "account.create": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "any"], // ADR-0071 điều 1b: tạo tài khoản — HCNS + Toàn quyền; Quản trị KHÔNG
  "account.view": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "any"], // ADR-0071 điều 1b: xem danh sách Quản lý tài khoản
  "account.edit": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "any"], // ADR-0071 điều 1b: sửa tên/SĐT, ngưng/mở lại, gán vai thường
  "audit.view": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0038 điều 6
  "feedback.submit": ["any", "any", "any", "any", "any", "any", "any", "any", "any", "any"],
  "feedback.view": ["own", "own", "own", "own", "own", "any", "own", "own", "own", "own"], // ADR-0038: Quản trị any → own
  "feedback.triage": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0038: Quản trị any → none
  "feedback.team.manage": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0119: quản lý nhóm hỗ trợ chỉ Toàn quyền
  "settings.ops": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0019: chỉ Toàn quyền (chế độ bảo trì)
  "order.pool.view": ["none", "none", "none", "any", "none", "any", "none", "none", "none", "none"], // ADR-0030 S23-1: thao tác MỚI — hàng chờ nhận (phần hẹp); Quản trị KHÔNG có (xem mọi đơn qua order.view)
  "notice.send": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0034 điều 7: chỉ Toàn quyền gửi/thu hồi tin thủ công
  "company.legal.write": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0038 điều 7 + ADR-0024 6.4: chỉ Toàn quyền sửa hồ sơ công ty chủ (và đổi công ty chủ — chủ trả lời 2026-09-28)
  "party.document.view": ["own", "own", "own", "own", "none", "any", "own", "own", "own", "own"], // ADR-0040 D2 + R5 (chủ 28/9: "Mọi nhân viên"): giấy tờ của CHÍNH MÌNH, số che; Đối tác không
  "party.document.write": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0040 D2: ghi giấy tờ của người + xem danh sách (số che) của người khác — Quản trị + Toàn quyền
  "party.document.reveal": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0040 D2 sửa bởi ADR-0083 điều 2: "xem đủ số" — CHỈ Toàn quyền; mỗi lần một dòng nhật ký không kèm số
  "party.attachment.view": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0124 đ4 + ADR-0123: mở ảnh giấy tờ của người khác — CHỈ Toàn quyền; nhật ký trước mỗi lần mở
  "party.self.view": ["own", "own", "own", "own", "own", "any", "own", "own", "own", "own"], // ADR-0124 đ4 (lát H-3): hồ sơ của CHÍNH MÌNH — mọi tài khoản; SUPER any (ADR-0014 đ2) nhưng route chỉ phục vụ hồ sơ của phiên
  "party.self.submit": ["own", "own", "own", "own", "own", "any", "own", "own", "own", "own"], // ADR-0124 đ1, đ3, đ4: gửi / rút phiếu tự khai, đồng ý / rút đồng ý chính sách — của chính mình
  "party.privacy.policy": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0126 đ1: đăng chính sách riêng tư — chỉ Toàn quyền
  "party.erasure.request": ["own", "own", "own", "own", "own", "any", "own", "own", "own", "own"], // ADR-0124 đ4 + ADR-0126 đ2 (lát H-5): gửi / rút yêu cầu xoá dữ liệu của CHÍNH MÌNH — mọi tài khoản (kể cả Tài xế đối tác, Nhân sự)
  "party.erasure.process": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0126 đ2 (lát H-5): xử lý phiếu yêu cầu xoá dữ liệu — Quản trị, Toàn quyền (còn hỏi cấp bậc ở route)
  "party.verify": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "any"], // ADR-0125 đ1, đ2 (lát H-4): hàng chờ xác minh phiếu tự khai — Quản trị, Toàn quyền, Nhân sự (HR vẫn party.view = none)
  "party.verify.attachment": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "any"], // ADR-0125 đ1: xem đủ số của phiếu ĐANG CHỜ — nhật ký trước, không số trong nhật ký
  "vehicle.manage": ["none", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0040 D1: xe, giấy tờ xe, danh sách sắp hết hạn — Quản trị + Toàn quyền (ADR-0038 điều 6)
  "transport.rate.view": ["none", "any", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0057 B3: xem bảng giá thuê xe — Kế toán = Quản trị (lần 18), Toàn quyền
  "transport.rate.manage": ["none", "any", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0057 B3: thêm / đóng giá, danh mục tuyến, cỡ xe
  "transport.cost.view": ["none", "any", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0057 C7: chi phí chuyến xe thuê, bảng kê
  "transport.cost.adjust": ["none", "any", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0057 C7: điều chỉnh, đảo, chụp lại, giá thoả thuận
  "assistant.ask": ["any", "any", "any", "any", "any", "any", "any", "any", "any", "any"], // ADR-0066 điều 1: hỏi trợ lý Hỗ trợ — mọi tài khoản đăng nhập
  "auth.session.viewAll": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0075 điều 7: xem sổ phiên của MỌI tài khoản — chỉ Toàn quyền (vai IT mang Toàn quyền)
  "auth.session.revoke": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0075 điều 7: gỡ một phiên đăng nhập — chỉ Toàn quyền
  "auth.session.policy": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0085: chỉ Toàn quyền
  // Sổ đại lý đợt 1 (ADR-0077 điều 11, ADR-0078 điều 6; đặc tả 2026-10-08 §6): xem bảng mức — Bán hàng, Kế toán, Quản trị, Toàn quyền; đặt mức và người bán — Kế toán, Quản trị, Toàn quyền.
  "partner.commission.view": ["any", "any", "any", "none", "none", "any", "none", "none", "none", "none"],
  "partner.commission.write": ["none", "any", "any", "none", "none", "any", "none", "none", "none", "none"],
  "sales.block.write": ["any", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0146 Đ5 (bổ sung 28/10): luật bán theo loại đối tác — Bán hàng, Quản trị, Toàn quyền
  "catalog.attribute.assign": ["any", "none", "any", "none", "none", "any", "none", "none", "none", "none"], // ADR-0152 Đ3: gắn giá trị đặc điểm cho MỘT dịch vụ — Bán hàng, Quản trị, Toàn quyền
  "supply.terms.view": ["none", "any", "any", "none", "none", "any", "none", "none", "none", "none"], // Bán hàng KHÔNG xem tỷ lệ mua lại của nhà cung cấp
  "supply.terms.write": ["none", "any", "any", "none", "none", "any", "none", "none", "none", "none"],
  // Phần đối tác của đơn (đặc tả §6; Task 5): xem bằng order.view (Đối tác own, nhưng nhận DTO hẹp ở route); ghi mức tay — Kế toán, Quản trị, Toàn quyền (Bán hàng KHÔNG).
  "order.terms.view": ["any", "any", "any", "assigned", "own", "any", "own", "none", "none", "none"],
  "order.terms.override": ["none", "any", "any", "none", "none", "any", "none", "none", "none", "none"],
};
const ORDER: readonly PermissionCode[] = ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "SUPER_ADMIN", "INTERN", "DRIVER", "DRIVER_PARTNER", "HR"];
const OPS = Object.keys(ADR) as OperationCode[];

test("bản đồ quyền khớp TỪNG Ô của ADR-0007 + ADR-0009 + ADR-0013 + ADR-0014 + ADR-0018 (giai đoạn 1) + Góp ý + ADR-0019 + ADR-0024 (T2b) + ADR-0030 + ADR-0034 + ADR-0040 + ADR-0047 + ADR-0048 + ADR-0049 + ADR-0071 (mọi thao tác × 10 quyền)", () => {
  for (const op of OPS) assert.equal(ADR[op]!.length, ORDER.length, `bảng ADR: hàng ${op} phải đủ ${ORDER.length} cột`);
  assert.deepEqual([...PERMISSION_CODES], [...ORDER]);
  assert.deepEqual(Object.keys(MATRIX).sort(), Object.keys(ADR).sort(), "MATRIX và ADR phải có cùng danh sách thao tác");
  for (const op of OPS) ORDER.forEach((p, i) => assert.equal(MATRIX[op][p], ADR[op]![i], `${op} × ${p}`));
});

test("ADR-0014 điều 2: SUPER_ADMIN = any ở MỌI thao tác, không ngoại lệ", () => {
  const who = { id: "sa", permissions: ["SUPER_ADMIN"] as const };
  for (const op of Object.keys(MATRIX) as OperationCode[]) assert.equal(can(who, op, { ownerId: "x" }), true, `SUPER_ADMIN × ${op}`);
});

test("ADR-0014: PARTNER chỉ thấy/sửa đơn của mình, không tự nhận việc, không đụng danh bạ/quản trị", () => {
  const partner = { id: "p1", permissions: ["PARTNER"] as const };
  assert.equal(can(partner, "order.view", { ownerId: "p1" }), true);
  assert.equal(can(partner, "order.view", { ownerId: "other" }), false);
  assert.equal(can(partner, "order.view"), false, "không ngữ cảnh = không có gì để xem là của mình");
  assert.equal(can(partner, "order.create"), true);
  assert.equal(can(partner, "order.modify", { ownerId: "p1" }), true);
  assert.equal(can(partner, "order.modify", { ownerId: "other" }), false);
  assert.equal(can(partner, "dispatch.assign"), false);
  assert.equal(can(partner, "dispatch.claim"), false);
  assert.equal(can(partner, "order.money.edit", { ownerId: "p1" }), false);
  assert.equal(can(partner, "order.cancel", { ownerId: "p1", assigned: true }), false);
  assert.equal(can(partner, "party.view"), false);
  assert.equal(can(partner, "party.write"), false);
  assert.equal(can(partner, "party.staff.write"), false);
  assert.equal(can(partner, "admin.manage"), false);
  assert.equal(can(partner, "contact.view", { ownerId: "other", assigned: true }), true, "đơn đang phụ trách sau khi được duyệt xin nhận (điều 10)");
  assert.equal(can(partner, "task.progress", { assigned: true }), true);
  assert.equal(can(partner, "task.progress"), false);
});

test("ADR-0014 điều 6/11: FIELD được sửa tiền và huỷ đơn ĐANG PHỤ TRÁCH, không được lập/sửa/xác nhận đơn", () => {
  const field = { id: "f1", permissions: ["FIELD"] as const };
  assert.equal(can(field, "order.money.edit", { ownerId: "x", assigned: true }), true);
  assert.equal(can(field, "order.money.edit", { ownerId: "x", assigned: false }), false);
  assert.equal(can(field, "order.cancel", { ownerId: "x", assigned: true }), true);
  assert.equal(can(field, "order.cancel", { ownerId: "x", assigned: false }), false);
  assert.equal(can(field, "order.modify", { ownerId: "x", assigned: true }), false, "vẫn không tự xác nhận/sửa nháp — chỉ order.money.edit/order.cancel mở");
  // ADR-0030 S23-1/S23-3 (thay ADR-0014 điều 6 "FIELD không xem đơn"): xem đơn, tiền, liên hệ, lịch sử của đơn ĐANG phụ trách — và CHỈ đơn đó.
  for (const op of ["order.view", "money.view", "contact.view", "order.history.view"] as OperationCode[]) {
    assert.equal(can(field, op, { ownerId: "x", assigned: true }), true, `${op}: đơn đang phụ trách`);
    assert.equal(can(field, op, { ownerId: "x", assigned: false }), false, `${op}: đơn không phụ trách`);
    assert.equal(can(field, op), false, `${op}: không ngữ cảnh (= mọi đơn) → không`);
  }
  assert.equal(can(field, "order.create"), false, "vẫn không lập đơn");
  assert.equal(can(field, "order.pool.view"), true, "hàng chờ nhận (phần hẹp) — ADR-0030 S23-1");
});

test("canAccessOrders: văn phòng, PARTNER, INTERN và (ADR-0030 S23-5) FIELD dùng được route đơn; không quyền nào thì không", () => {
  assert.equal(canAccessOrders({ id: "a", permissions: ["SALES"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["ADMIN"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["SUPER_ADMIN"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["PARTNER"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["INTERN"] }), true);
  assert.equal(canAccessOrders({ id: "a", permissions: ["FIELD"] }), true, "ADR-0030 S23-5: hướng dẫn viên vào cổng orders (mỗi route vẫn tự hỏi can())");
  assert.equal(canAccessOrders({ id: "a", permissions: [] }), false);
});

test("ADR-0018 giai đoạn 1: INTERN lập đơn, xem/sửa đơn của mình; không thấy đơn người khác, không làm người phụ trách, không quản trị", () => {
  const intern = { id: "i1", permissions: ["INTERN"] as const };
  assert.equal(isOffice(intern), false, "không phải văn phòng → dùng trang Đơn hàng như Đối tác");
  assert.equal(can(intern, "order.create"), true);
  assert.equal(can(intern, "order.view", { ownerId: "i1" }), true);
  assert.equal(can(intern, "order.view", { ownerId: "other" }), false);
  assert.equal(can(intern, "order.modify", { ownerId: "i1" }), true);
  assert.equal(can(intern, "order.modify", { ownerId: "other", assigned: true }), false, "chưa là cấp người phụ trách (giai đoạn 2 mở)");
  assert.equal(can(intern, "dispatch.claim"), false);
  assert.equal(can(intern, "party.view"), false);
  assert.equal(can(intern, "admin.manage"), false);
});

// Kết quả mong đợi của can() cho MỘT quyền, theo phạm vi và ngữ cảnh — bảng chân lý viết tay, không dùng lại logic của file nguồn.
const TRUTH: Record<Scope, { none: boolean; mine: boolean; theirs: boolean; assigned: boolean; mineAndAssigned: boolean }> = {
  //             không ctx  của mình  của người khác  được giao  cả hai
  none: { none: false, mine: false, theirs: false, assigned: false, mineAndAssigned: false },
  own: { none: false, mine: true, theirs: false, assigned: false, mineAndAssigned: true },
  assigned: { none: false, mine: false, theirs: false, assigned: true, mineAndAssigned: true },
  ownOrAssigned: { none: false, mine: true, theirs: false, assigned: true, mineAndAssigned: true },
  any: { none: true, mine: true, theirs: true, assigned: true, mineAndAssigned: true },
};

test("can(): mọi ô × mọi ngữ cảnh cho tài khoản một quyền", () => {
  for (const op of OPS) {
    ORDER.forEach((p, i) => {
      const scope = ADR[op]![i]!;
      const who = { id: "u1", permissions: [p] };
      assert.equal(can(who, op), TRUTH[scope].none, `${op} × ${p} không ctx`);
      assert.equal(can(who, op, { ownerId: "u1" }), TRUTH[scope].mine, `${op} × ${p} của mình`);
      assert.equal(can(who, op, { ownerId: "u2" }), TRUTH[scope].theirs, `${op} × ${p} của người khác`);
      assert.equal(can(who, op, { ownerId: "u2", assigned: true }), TRUTH[scope].assigned, `${op} × ${p} được giao`);
      assert.equal(can(who, op, { ownerId: "u1", assigned: true }), TRUTH[scope].mineAndAssigned, `${op} × ${p} của mình + được giao`);
    });
  }
});

test("ADR-0009: người được giao (assigned) sửa được đơn của người khác; người khác không; người lập vẫn được kể cả sau khi giao lại", () => {
  const sales = { id: "u1", permissions: ["SALES"] as const };
  for (const op of ["order.modify", "order.history.view", "dispatch.assign"] as OperationCode[]) {
    assert.equal(can(sales, op, { ownerId: "u2", assigned: true }), true, `${op}: người được giao (không phải người lập)`);
    assert.equal(can(sales, op, { ownerId: "u2", assigned: false }), false, `${op}: người khác, không được giao`);
    assert.equal(can(sales, op, { ownerId: "u2" }), false, `${op}: người khác, chưa biết có được giao không (mặc định từ chối)`);
    assert.equal(can(sales, op, { ownerId: "u1" }), true, `${op}: người lập`);
    assert.equal(can(sales, op, { ownerId: "u1", assigned: false }), true, `${op}: người lập đã giao lại cho người khác vẫn được (ADR-0009 hệ quả)`);
  }
  // Ba thao tác ADR-0009 KHÔNG đổi: sửa tiền/số khách/dịch vụ SAU xác nhận vẫn chỉ của người lập (N3, ADR-0007 điều 3).
  assert.equal(can(sales, "order.money.edit", { ownerId: "u2", assigned: true }), false, "được giao KHÔNG mở order.money.edit");
  assert.equal(can(sales, "order.money.edit", { ownerId: "u1" }), true);
  // Ô `none` không mở dù được giao: kế toán và người thực hiện không sửa đơn.
  for (const p of ["ACCOUNTING", "FIELD"] as const) {
    const who = { id: "u1", permissions: [p] as const };
    for (const op of ["order.modify", "dispatch.assign"] as OperationCode[]) assert.equal(can(who, op, { ownerId: "u2", assigned: true }), false, `${p} × ${op}`);
  }
});

test("ADR-0009 + ADR-0030 S20-6: dispatch.claim — SALES, ADMIN và FIELD nhận được không cần là chủ đơn/người được giao; ACCOUNTING không", () => {
  assert.equal(can({ id: "u1", permissions: ["SALES"] }, "dispatch.claim"), true);
  assert.equal(can({ id: "u1", permissions: ["SALES"] }, "dispatch.claim", { ownerId: "u2" }), true);
  assert.equal(can({ id: "a", permissions: ["ADMIN"] }, "dispatch.claim"), true);
  assert.equal(can({ id: "f", permissions: ["FIELD"] }, "dispatch.claim"), true, "ADR-0030 S20-6/S20-12: hướng dẫn viên tự nhận đơn chờ nhận");
  assert.equal(can({ id: "f", permissions: ["FIELD"] }, "dispatch.assign", { ownerId: "f" }), false, "nhưng vẫn KHÔNG giao cho người khác");
  for (const p of ["ACCOUNTING"] as const) {
    const who = { id: "u1", permissions: [p] as const };
    assert.equal(can(who, "dispatch.claim"), false, p);
    assert.equal(can(who, "dispatch.claim", { ownerId: "u1", assigned: true }), false, `${p} dù là chủ đơn/được giao`);
  }
});

test("nhiều quyền: hợp các ô (SALES + ACCOUNTING sửa tiền đơn người khác được, sửa đơn người khác thì không)", () => {
  const both = { id: "u1", permissions: ["SALES", "ACCOUNTING"] as const };
  assert.equal(can(both, "order.money.edit", { ownerId: "u2" }), true);
  assert.equal(can(both, "order.modify", { ownerId: "u2" }), false);
  assert.equal(can(both, "order.modify", { ownerId: "u1" }), true);
  const sf = { id: "u1", permissions: ["SALES", "FIELD"] as const };
  assert.equal(can(sf, "task.progress", { assigned: true }), true);
  assert.equal(can(sf, "task.progress"), false);
});

test("mặc định từ chối: không quyền, thao tác lạ, chủ đơn thiếu", () => {
  assert.equal(can({ id: "u1", permissions: [] }, "order.view"), false);
  assert.equal(can({ id: "u1", permissions: ["ADMIN"] }, "khong.co" as OperationCode), false);
  assert.equal(can({ id: "u1", permissions: ["SALES"] }, "order.modify", { ownerId: undefined }), false, "thiếu chủ đơn ≠ của mình");
  assert.equal(can({ id: "", permissions: ["SALES"] }, "order.modify", { ownerId: "" }), true, "so sánh id nguyên văn (id rỗng không tồn tại thật)");
});

// Mười hai thao tác hẹp, cố ý KHÔNG mở cho ADMIN (ADR-0014, ADR-0019, ADR-0024, ADR-0030, ADR-0034, ADR-0038): admin.manage.superadmin/order.cancel/
// dispatch.guides.view/settings.ops/order.pool.view/notice.send/feedback.view/feedback.triage/staff.sheet.sync/audit.view/company.legal.write (dispatch.request
// đã bỏ khỏi bản đồ, ADR-0019) chỉ dành cho SUPER_ADMIN hoặc PARTNER/FIELD theo đúng bảng (settings.ops: chỉ Toàn quyền — bật/tắt bảo trì; notice.send: chỉ
// Toàn quyền gửi/thu hồi tin thủ công, ADR-0034 điều 7) — ADMIN vẫn làm được việc tương ứng qua đường khác (permissions route, order.modify, dispatch.assign).
// order.pool.view (ADR-0030 S23-1, quyết định "Quản trị không có ô này"): Quản trị đã thấy ĐỦ mọi đơn qua order.view, không cần phần hẹp của hàng chờ.
// ADR-0071 điều 1b: account.create (Quản trị không tạo tài khoản nữa — chỉ HCNS, Toàn quyền); staff.sheet.sync đã xoá khỏi bản đồ.
// ADR-0038: thêm feedback.view (own — đơn của người khác → không) và feedback.triage (none); điều 6: audit.view (account.access.manage:
// Quản trị lấy lại theo ADR-0042 nên không còn ở đây).
// ADR-0038 điều 7 + ADR-0024 6.4 (T2b): company.legal.write — chỉ Toàn quyền sửa hồ sơ công ty chủ và đổi công ty chủ.
// ADR-0040 D2: party.document.view — ô `own` của Quản trị (giấy tờ của chính mình); Quản trị xem giấy tờ NGƯỜI KHÁC qua party.document.write.
// ADR-0119: feedback.team.manage — quản lý nhóm hỗ trợ chỉ Toàn quyền (Quản trị không có đường tắt vào nhóm nhạy cảm).
const ADMIN_NONE_OPS: readonly OperationCode[] = [
  "admin.manage.superadmin", "order.cancel", "dispatch.guides.view", "settings.ops", "order.pool.view",
  "notice.send", "feedback.view", "feedback.triage", "feedback.team.manage", "account.create", "audit.view", "company.legal.write", "party.document.view",
  "payment.refund", // sổ tiền lượt 1 (ADR-0026 điều 10): hoàn khách chỉ Kế toán, Toàn quyền (H4)
  "order.submit", // ADR-0136 Đ13.6: «Gửi đơn» chỉ Đối tác (own) và Toàn quyền — văn phòng xác nhận thẳng
  "order.complete", "ledger.write", // sổ tiền lượt 1: Hoàn thành / ghi sổ chỉ Kế toán, Toàn quyền (ADR-0025 đ6, ADR-0026 đ10)
  "ledger.view", // ADMIN "own" — chỉ sổ của chính mình (ngữ cảnh ownerId người khác → không)
  "ledger.period.close", // ADR-0080 D1: khoá sổ tháng chỉ Kế toán, Toàn quyền — Quản trị KHÔNG
  "accounting.entry.mark", // ADR-0060: ghi dấu "đã nhập phần mềm kế toán" chỉ Kế toán, Toàn quyền (lời chủ)
  "deposit.outside.record", // ADR-0089 đ16, X-4: ghi "đã hoàn ngoài hệ thống" chỉ Toàn quyền — Quản trị là người XÁC NHẬN (deposit.refund.approve)
  "auth.session.viewAll", "auth.session.revoke", "auth.session.policy", // ADR-0075 điều 7: sổ phiên của mọi người, gỡ phiên — chỉ Toàn quyền (Quản trị không giữ Toàn quyền → 403)
  "party.document.reveal", // ADR-0083 điều 2: xem đủ số giấy tờ chỉ Toàn quyền — Quản trị chỉ thấy số đã che
  "party.attachment.view", // ADR-0124 đ4: mở ảnh giấy tờ chỉ Toàn quyền — Quản trị ghi giấy tờ nhưng không mở ảnh (ruling Q1 kế hoạch H-2 kho tệp)
  "party.self.view", "party.self.submit", // ADR-0124 đ4: ô `own` — Quản trị chỉ hồ sơ của chính mình (ngữ cảnh ownerId người khác → không)
  "party.erasure.request", // ADR-0124 đ4 + ADR-0126 đ2 (lát H-5): ô `own` — gửi / rút yêu cầu xoá dữ liệu của chính mình
  "party.privacy.policy", // ADR-0126 đ1: đăng chính sách riêng tư chỉ Toàn quyền
  "trip.passenger.add", // ADR-0052 D5b (Đợt 5 A-1b): chỉ tài xế đang lái bổ sung tên — văn phòng nhập tên ở đơn (không route văn phòng)
  "trip.refuse", // ADR-0053 D8.3 (kế hoạch A4 T3): Từ chối chuyến chỉ tài xế đang lái — văn phòng không từ chối thay (đổi người bằng xếp xe; N-TU-CHOI)
  "unavailability.self", // ADR-0053 D9 (kế hoạch A4 T8): báo bận của CHÍNH tài xế — văn phòng không ghi thay (xem dải "Tài xế bận" qua trip.dispatch)
  "dispatch.refuse", // ADR-0030 điều 1: Quản trị "assigned" — chỉ đơn mình đang phụ trách (ngữ cảnh không phụ trách → không)
  "trip.transfer", // ADR-0052 D4 :84 + ADR-0111: chỉ tài xế đang lái gửi / nhận đề nghị chuyển khách — Quản trị duyệt / bác qua trip.override
];

test("FIELD không xem đơn/tiền/nhật ký của đơn KHÔNG được giao; ADMIN làm mọi thao tác của bản đồ TRỪ các thao tác hẹp cố ý không mở (ADMIN_NONE_OPS)", () => {
  const field = { id: "f", permissions: ["FIELD"] as const };
  for (const op of ["order.view", "money.view", "order.history.view", "order.create", "order.modify", "party.view", "party.staff.write", "admin.manage"] as OperationCode[]) assert.equal(can(field, op, { ownerId: "x" }), false, op);
  const admin = { id: "a", permissions: ["ADMIN"] as const };
  for (const op of OPS) assert.equal(can(admin, op, { ownerId: "x" }), !ADMIN_NONE_OPS.includes(op), `ADMIN × ${op}`);
});

test("isOffice / hasPermission / isPermissionCode", () => {
  assert.equal(isOffice({ id: "a", permissions: ["FIELD"] }), false);
  assert.equal(isOffice({ id: "a", permissions: ["FIELD", "ACCOUNTING"] }), true);
  assert.equal(hasPermission({ permissions: ["ADMIN"] }, "ADMIN"), true);
  assert.equal(hasPermission({ permissions: ["SALES"] }, "ADMIN"), false);
  assert.equal(isPermissionCode("SALES"), true);
  assert.equal(isPermissionCode("sales"), false);
  assert.equal(isPermissionCode(1), false);
});

// Khoá GIÁ TRỊ (ADR-0033): "được lập đơn ⇒ được xem giá bán lẻ" — điều kiện để `GET /api/catalog/for-order` (chốt chặn `can(order.create)`) không
// 403 oan ở lời hỏi `money.view` { ownerId: staff.id } ngay sau đó (người lập đơn cần giá bán lẻ để chọn dịch vụ). KHÔNG phải phép kiểm tương đương
// lúc chạy: sửa cả hai cột cho khớp nhau thì bài này vẫn xanh — xem giới hạn ở docs/SO-HANG-RAO.md.
test("ADR-0033: mọi mã quyền có order.create ≠ none thì money.view ≠ none (khoá cho GET /api/catalog/for-order)", () => {
  for (const p of PERMISSION_CODES) {
    if (MATRIX["order.create"][p] !== "none") assert.notEqual(MATRIX["money.view"][p], "none", `${p}: order.create ≠ none nhưng money.view = none`);
  }
});

// Khoá GIÁ TRỊ (ADR-0033): "được sửa đơn ⇒ được lập đơn" — `web/order-form.ts` chỉ nạp danh mục khi `can(staff, "order.create")`
// (`if (can(staff, "order.create")) await loadCatalog()`), nên người có `order.modify` mà không có `order.create` sẽ mở form SỬA đơn mà mất danh mục.
// Cũng chỉ khoá giá trị bảng, không phải phép kiểm lúc chạy.
test("ADR-0033: mọi mã quyền có order.modify ≠ none thì có order.create ≠ none (form lập/sửa đơn chỉ nạp danh mục cho người lập đơn)", () => {
  for (const p of PERMISSION_CODES) {
    if (MATRIX["order.modify"][p] !== "none") assert.notEqual(MATRIX["order.create"][p], "none", `${p}: order.modify ≠ none nhưng order.create = none`);
  }
});

// ADR-0030 S23-4 (Review Focus 2): chi tiết đơn không được xem trả 404 (không phải 403) CHỈ cho tài khoản mà mọi ô `order.view` của nó là `none` hoặc
// `assigned` (và có ít nhất một `assigned`) — hôm nay đúng BỐN tập: chỉ-FIELD, FIELD+DRIVER, FIELD+DRIVER_PARTNER, FIELD+DRIVER+DRIVER_PARTNER. Hai tập
// sau BẤT HỢP LỆ về dữ liệu (LC-1b, ADR-0048: tài khoản giữ DRIVER_PARTNER không giữ quyền nào khác — trigger + lời kiểm máy chủ) nhưng hàm thuần không
// biết luật đó: chỉ đọc MATRIX, nơi order.view của DRIVER_PARTNER là none. Đối tác/Thực tập (own) mở đơn người khác vẫn 403.
test("seesOnlyAssignedOrders: trên cả 1024 tập con quyền — đúng bằng định nghĩa từ MATRIX, và hôm nay CHỈ bốn tập có FIELD, không mã 'mọi đơn/của mình' là đúng", () => {
  let count = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const permissions = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const who = { id: "u1", permissions };
    const cells = permissions.map((p) => MATRIX["order.view"][p]);
    const definition = cells.some((c) => c === "assigned") && cells.every((c) => c === "none" || c === "assigned");
    assert.equal(seesOnlyAssignedOrders(who), definition, `định nghĩa lệch: ${permissions.join("+") || "(không quyền)"}`);
    // Hướng dẫn viên kiêm Tài xế: order.view của DRIVER là none (ADR-0040 D3) nên vẫn chỉ xem đơn mình phụ trách.
    // Tài xế đối tác (ADR-0048): order.view của DRIVER_PARTNER cũng none — hai tập có nó là ảnh chụp của hàm thuần, KHÔNG phải tài khoản hợp lệ (LC-1b).
    // ADR-0071: order.view của HR là none — bốn tập trên ghép thêm HR cũng chỉ xem đơn mình phụ trách (ảnh chụp hàm thuần).
    const ANH_CHUP = ["FIELD", "FIELD+DRIVER", "FIELD+DRIVER_PARTNER", "FIELD+DRIVER+DRIVER_PARTNER"].flatMap((x) => [x, `${x}+HR`]);
    assert.equal(seesOnlyAssignedOrders(who), ANH_CHUP.includes(permissions.join("+")), `ảnh chụp hôm nay lệch: ${permissions.join("+") || "(không quyền)"}`);
    count++;
  }
  assert.equal(count, 1024);
});

// ADR-0040 D3 + Ruling R2 (điều phối 2026-09-28): cột Tài xế (DRIVER) — lượt 1a MỌI ô nghiệp vụ = không. Ngoại lệ có tên: gửi/xem góp ý của mình
// (ADR-0038, như mọi tài khoản) và xem giấy tờ của chính mình (ô thêm ở Task A7). Liệt kê TỪNG ô, không suy từ MATRIX: thêm ô mới mà quên cột
// DRIVER thì đỏ ở đây — buộc người thêm QUYẾT giá trị cho tài xế (khuôn bài ghim hàng Đối tác, src/modules/orders/xem-don-theo-quyen.test.ts).
test("ADR-0040 D3 + ADR-0049 D3: MỌI ô của Tài xế (DRIVER) — ghim nguyên dòng", () => {
  const DRIVER_ROW: Record<string, Scope> = {
    "order.view": "none", "money.view": "none", "order.history.view": "none", "contact.view": "none", "order.create": "none", "order.modify": "none",
    "order.trip.edit": "none", "task.progress": "none", "order.money.edit": "none", "order.cancel": "none", "order.cancel.classify": "none", "deposit.refund.approve": "none", "deposit.transfer.approve": "none", "deposit.outside.record": "none", "dispatch.assign": "none", "dispatch.claim": "none",
    "order.passenger.write": "none", // ADR-0047 A2: tài xế KHÔNG đi qua ô này (đường ghi của tài xế, nếu có, do ADR lượt 2 quyết)
    "order.leg.short_notice": "none", // ADR-0049 D3 + ADR-0107: đặt gấp chỉ Bán hàng, Quản trị, Toàn quyền
    "order.leg.short_notice.view": "none", // chủ H4/N-14: tài xế không xem chi tiết đơn (không đổi)
    "order.confirm.review": "none", "order.submit": "none", // ADR-0136 Đ4, Đ13.6: không xét duyệt, không «Gửi đơn»
    "order.service.manual": "none", // ADR-0061 điều 2: tài xế không nhập tay
    "dispatch.guides.view": "none", "dispatch.refuse": "none", "payment.receive": "none", "payment.refund": "none", "invoice.request": "none", "invoice.issue": "none",
    "accounting.entry.mark": "none", "accounting.entry.view": "none", // ADR-0060: tài xế không xem đơn, không ghi dấu kế toán
    "party.view": "none", "party.write": "none", "party.staff.write": "none",
    "party.personal.view": "none", // ADR-0122 đ5
    "admin.manage": "none", "admin.manage.superadmin": "none",
    "account.access.manage": "none", "account.create": "none", "account.view": "none", "account.edit": "none", "audit.view": "none",
    "feedback.submit": "any", "feedback.view": "own", // ngoại lệ có tên (Ruling R2)
    "feedback.triage": "none", "feedback.team.manage": "none", "settings.ops": "none", "order.pool.view": "none", "notice.send": "none", "company.legal.write": "none",
    "party.document.view": "own", // ngoại lệ có tên (Ruling R2, R5): xem giấy tờ của CHÍNH MÌNH, số che
    "party.document.write": "none", "party.document.reveal": "none", "party.attachment.view": "none", "vehicle.manage": "none",
    "party.self.view": "own", "party.self.submit": "own", // ADR-0124 đ4 (lát H-3): ngoại lệ có tên — hồ sơ của CHÍNH MÌNH, như mọi tài khoản
    "party.privacy.policy": "none", // ADR-0126 đ1
    "party.erasure.request": "own", // ADR-0124 đ4 + ADR-0126 đ2 (lát H-5): ngoại lệ có tên — yêu cầu xoá dữ liệu của CHÍNH MÌNH, như mọi tài khoản
    "party.erasure.process": "none", // ADR-0126 đ2 (lát H-5): xử lý phiếu xoá dữ liệu của người khác — không
    "party.verify": "none", "party.verify.attachment": "none", // ADR-0125 đ1
    "transport.rate.view": "none", "transport.rate.manage": "none", // ADR-0057 B3 — tiền xe thuê: không
    "transport.cost.view": "none", "transport.cost.adjust": "none", // ADR-0057 C7 — chi phí xe thuê: không
    // ADR-0049 D3 — NỚI (ĐÃ DUYỆT 2026-09-30 (lần 17), đề xuất luật mục 2): tài xế công ty xem + bấm tiến độ chuyến MÌNH ĐANG LÁI (`assigned` — A13 / A15).
    "trip.view": "assigned", "trip.dispatch": "none", "trip.override": "none", "trip.urgent_adjust": "none", "dispatch.policy.lead": "none", "trip.progress": "assigned", "trip.call_ack": "none",
    // ADR-0052 D5b — NỚI (chủ duyệt 5/10, đề xuất luật A-1b mục 1): tài xế công ty bổ sung tên khách chưa có tên trên chuyến MÌNH ĐANG LÁI (ô assigned thứ ba).
    "trip.passenger.add": "assigned",
    // ADR-0052 D4 — NỚI N1 (chủ duyệt A-1 30/9, ADR-0052:190): tài xế công ty gửi / nhận đề nghị chuyển khách của chuyến MÌNH ĐANG LÁI (ô assigned thứ tư).
    "trip.transfer": "assigned",
    "trip.refuse": "none", // ADR-0053 D8.3: tài xế công ty KHÔNG Từ chối (không có vế hạn của khung xem khách — D7.2)
    "unavailability.self": "none", // ADR-0053 D9 (0053:49): Đợt 6 chỉ mở báo bận cho tài xế đối tác
    // Sổ tiền lượt 1 (bản làm mới §2): tài xế không thu tiền khách — none ở cả bốn ô mới (ledger.view none, không phải own: tài xế không bao giờ là người thu).
    "order.handover": "none", "order.complete": "none", "ledger.view": "none", "ledger.write": "none",
    "ledger.period.close": "none", // khoá sổ tháng (ADR-0080 D1): tài xế không khoá sổ
    "ledger.adjust.approve": "none", // ADR-0115: duyệt điều chỉnh công nợ chỉ Kế toán, Quản trị, Toàn quyền
    "assistant.ask": "any", // ngoại lệ có tên (ADR-0066 điều 1): hỏi trợ lý Hỗ trợ cách dùng app — trợ lý không đọc dữ liệu nghiệp vụ
    "auth.session.viewAll": "none", "auth.session.revoke": "none", "auth.session.policy": "none", // ADR-0075 điều 7: chỉ Toàn quyền
    "partner.commission.view": "none", "partner.commission.write": "none", "supply.terms.view": "none", "supply.terms.write": "none", // sổ đại lý đợt 1: tài xế không xem bảng mức, người bán
    "sales.block.write": "none", // ADR-0146 Đ5: luật bán chỉ Bán hàng, Quản trị, Toàn quyền
    "catalog.attribute.assign": "none", // ADR-0152 Đ3: gắn đặc điểm chỉ Bán hàng, Quản trị, Toàn quyền
    "order.terms.view": "none", "order.terms.override": "none", // Task 5: tài xế không xem phần đối tác của đơn
  };
  assert.deepEqual(Object.fromEntries((Object.keys(MATRIX) as OperationCode[]).map((op) => [op, MATRIX[op].DRIVER])), DRIVER_ROW);
});

// ADR-0048 D2 (accepted 2026-09-28): cột Tài xế đối tác (DRIVER_PARTNER) — MỌI ô nghiệp vụ = không. Ngoại lệ có tên: gửi/xem góp ý của mình (như mọi tài
// khoản) và xem giấy tờ của CHÍNH MÌNH, số che (party.document.view = own — ADR-0040 D2 sửa bởi ADR-0048). Liệt kê TỪNG ô, không suy từ MATRIX: thêm ô
// mới mà quên cột DRIVER_PARTNER thì đỏ ở đây — buộc người thêm QUYẾT giá trị cho tài xế đối tác (khuôn bài ghim hàng DRIVER ở trên).
// MỌI Ô TIỀN (money.view, order.money.edit, payment.receive, payment.refund, invoice.request, invoice.issue) = none — lượt 3 (giá thuê xe) lỡ mở ô tiền
// cho tài xế đối tác thì đỏ ở đây (ADR-0048 D2: "tài xế đối tác không thấy mọi con số tiền, kể cả giá thuê xe ở lượt 3").
test("ADR-0048 D2: MỌI ô của Tài xế đối tác (DRIVER_PARTNER) — ghim nguyên dòng, mọi ô tiền = none", () => {
  const DRIVER_PARTNER_ROW: Record<string, Scope> = {
    "order.view": "none", "money.view": "none", "order.history.view": "none", "contact.view": "none", "order.create": "none", "order.modify": "none",
    "order.trip.edit": "none", "task.progress": "none", "order.money.edit": "none", "order.cancel": "none", "order.cancel.classify": "none", "deposit.refund.approve": "none", "deposit.transfer.approve": "none", "deposit.outside.record": "none", "dispatch.assign": "none", "dispatch.claim": "none",
    "order.passenger.write": "none", // ADR-0047 A2 × ADR-0048 D2 (mọi ô nghiệp vụ của tài xế đối tác = none): không nhập / sửa / huỷ danh sách hành khách
    "order.leg.short_notice": "none", // ADR-0049 D3 × ADR-0048 D2
    "order.leg.short_notice.view": "none", // chủ H4/N-14 × ADR-0048 D2
    "order.confirm.review": "none", "order.submit": "none", // ADR-0136 Đ4, Đ13.6: không xét duyệt, không «Gửi đơn»
    "order.service.manual": "none", // ADR-0061 điều 2 × ADR-0048 D2
    "dispatch.guides.view": "none", "dispatch.refuse": "none", "payment.receive": "none", "payment.refund": "none", "invoice.request": "none", "invoice.issue": "none",
    "accounting.entry.mark": "none", "accounting.entry.view": "none", // ADR-0060: tài xế không xem đơn, không ghi dấu kế toán
    "party.view": "none", "party.write": "none", "party.staff.write": "none",
    "party.personal.view": "none", // ADR-0122 đ5
    "admin.manage": "none", "admin.manage.superadmin": "none",
    "account.access.manage": "none", "account.create": "none", "account.view": "none", "account.edit": "none", "audit.view": "none",
    "feedback.submit": "any", "feedback.view": "own", // ngoại lệ có tên (ADR-0048 D2)
    "feedback.triage": "none", "feedback.team.manage": "none", "settings.ops": "none", "order.pool.view": "none", "notice.send": "none", "company.legal.write": "none",
    "party.document.view": "own", // ngoại lệ có tên (ADR-0048 D2): xem giấy tờ của CHÍNH MÌNH, số che
    "party.document.write": "none", "party.document.reveal": "none", "party.attachment.view": "none", "vehicle.manage": "none",
    "party.self.view": "own", "party.self.submit": "own", // ADR-0124 đ4 (lát H-3): ngoại lệ có tên — hồ sơ của CHÍNH MÌNH, như mọi tài khoản
    "party.privacy.policy": "none", // ADR-0126 đ1
    "party.erasure.request": "own", // ADR-0124 đ4 + ADR-0126 đ2 (lát H-5): ngoại lệ có tên — yêu cầu xoá dữ liệu của CHÍNH MÌNH, như mọi tài khoản
    "party.erasure.process": "none", // ADR-0126 đ2 (lát H-5): xử lý phiếu xoá dữ liệu của người khác — không
    "party.verify": "none", "party.verify.attachment": "none", // ADR-0125 đ1
    "transport.rate.view": "none", "transport.rate.manage": "none", // ADR-0057 B3 — tiền xe thuê: không
    "transport.cost.view": "none", "transport.cost.adjust": "none", // ADR-0057 C7 — chi phí xe thuê: không
    "trip.passenger.add": "none", // ADR-0052 D5b × lời chủ 5/10 ("chỉ tài xế công ty"): tài xế đối tác KHÔNG bổ sung tên
    // NỚI có tên (Điều 9.4) — ADR-0053 D7.1, :49, :200 (kế hoạch A4 T6, NT-1): tài xế đối tác xem + bấm tiến độ + Từ chối chuyến MÌNH ĐANG LÁI. trip.refuse
    // lật CÙNG LÚC với trip.view (vế hạn của khung xem khách áp ngay từ lúc thấy chuyến). Còn none: trip.passenger.add (chủ 5/10, §16), dispatch, override,
    // urgent_adjust, call_ack. 8 ô có tên ≠ none: 4 ô cũ + 3 ô này + trip.transfer (N4 của gói A5, bên dưới).
    // NỚI có tên N4 (Điều 9.4) — ADR-0053 D7.1 :46 (accepted 30/9) + ADR-0111 N4, gói A5 sau khi A4 gộp: tài xế đối tác gửi / nhận đề nghị chuyển khách của
    // chuyến MÌNH ĐANG LÁI (y như cột DRIVER). Mã quyền không đổi ⇒ EXTERNAL_PERMISSIONS và trigger LC-1 không đổi (ADR-0053 :50).
    "trip.transfer": "assigned",
    "trip.refuse": "assigned",
    // NỚI có tên (Điều 9.4) — ADR-0053 D9, :49 (kế hoạch A4 T8, NT-1): báo bận của CHÍNH MÌNH (ownerId = staff.id; route luôn dùng staff.partyId). Ô thứ 8.
    "unavailability.self": "own",
    "trip.view": "assigned", "trip.dispatch": "none", "trip.override": "none", "trip.urgent_adjust": "none", "dispatch.policy.lead": "none", "trip.progress": "assigned", "trip.call_ack": "none", // ADR-0053 D7.1 (A4 T6)
    "order.handover": "none", "order.complete": "none", "ledger.view": "none", "ledger.write": "none", // sổ tiền lượt 1 (bản làm mới §2) — mọi ô tiền = none
    "ledger.period.close": "none", // khoá sổ tháng (ADR-0080 D1): tài xế đối tác không khoá sổ
    "ledger.adjust.approve": "none", // ADR-0115: duyệt điều chỉnh công nợ chỉ Kế toán, Quản trị, Toàn quyền
    "assistant.ask": "any", // ngoại lệ có tên (ADR-0066 điều 1): hỏi trợ lý Hỗ trợ — mọi tài khoản đăng nhập
    "auth.session.viewAll": "none", "auth.session.revoke": "none", "auth.session.policy": "none", // ADR-0075 điều 7: chỉ Toàn quyền
    "partner.commission.view": "none", "partner.commission.write": "none", "supply.terms.view": "none", "supply.terms.write": "none", // sổ đại lý đợt 1: tài xế đối tác không thấy mọi con số hoa hồng
    "sales.block.write": "none", // ADR-0146 Đ5: luật bán chỉ Bán hàng, Quản trị, Toàn quyền
    "catalog.attribute.assign": "none", // ADR-0152 Đ3: gắn đặc điểm chỉ Bán hàng, Quản trị, Toàn quyền
    "order.terms.view": "none", "order.terms.override": "none", // Task 5: tài xế đối tác không thấy phần đối tác của đơn
  };
  assert.deepEqual(Object.fromEntries((Object.keys(MATRIX) as OperationCode[]).map((op) => [op, MATRIX[op].DRIVER_PARTNER])), DRIVER_PARTNER_ROW);
  // NT-1 (kế hoạch A4): đúng 8 ô ≠ none sau T8 — 4 ô cũ (feedback.submit, feedback.view, party.document.view, assistant.ask) + trip.view, trip.progress,
  // trip.refuse (T6) + unavailability.self (T8). Gói A5 (12/10) thêm trip.transfer (nới N4) ⇒ đúng 9 ô. Lát H-3 Gói 2 (ADR-0124 đ4 + Hệ quả — NỚI có chủ ý):
  // party.self.view, party.self.submit = own (hồ sơ của CHÍNH MÌNH) ⇒ đúng 11 ô. Lát H-5 (ADR-0124 đ4 + ADR-0126 đ2): party.erasure.request = own ⇒ đúng 12 ô.
  assert.deepEqual(Object.entries(DRIVER_PARTNER_ROW).filter(([, v]) => v !== "none").map(([k]) => k).sort(),
    ["assistant.ask", "feedback.submit", "feedback.view", "party.document.view", "party.erasure.request", "party.self.submit", "party.self.view", "trip.progress", "trip.refuse", "trip.transfer", "trip.view", "unavailability.self"]);
});

// ADR-0071 (accepted 2026-10-01): cột Nhân sự (HR — vai "Hành chính nhân sự") — chỉ ba ô tài khoản (tạo / xem / sửa); MỌI ô nghiệp vụ khác = none: không đơn,
// tiền, Danh bạ, danh mục, địa điểm, hỗ trợ đăng nhập (account.access.manage), Nhật ký, Góp ý người khác, cài đặt (điều 1e). Ngoại lệ có tên như mọi tài khoản
// nội bộ: gửi/xem góp ý của mình, hỏi trợ lý, xem giấy tờ của CHÍNH MÌNH (R5 "Mọi nhân viên"). Liệt kê TỪNG ô, không suy từ MATRIX: thêm ô mới mà quên cột HR
// thì đỏ ở đây — buộc người thêm QUYẾT giá trị cho Nhân sự.
test("ADR-0071: MỌI ô của Nhân sự (HR) — ghim nguyên dòng, chỉ ba ô tài khoản", () => {
  const HR_ROW: Record<string, Scope> = {
    "order.view": "none", "money.view": "none", "order.history.view": "none", "contact.view": "none", "order.create": "none", "order.modify": "none",
    "order.trip.edit": "none", "order.leg.short_notice": "none", "order.leg.short_notice.view": "none", "order.passenger.write": "none", "order.service.manual": "none",
    "order.confirm.review": "none", "order.submit": "none", // ADR-0136 Đ4, Đ13.6: Nhân sự không xét duyệt, không «Gửi đơn»
    "task.progress": "none", "order.money.edit": "none", "order.cancel": "none", "order.cancel.classify": "none", "deposit.refund.approve": "none", "deposit.transfer.approve": "none", "deposit.outside.record": "none", "dispatch.assign": "none", "dispatch.claim": "none", "dispatch.guides.view": "none", "dispatch.refuse": "none",
    "payment.receive": "none", "payment.refund": "none", "order.handover": "none", "order.complete": "none", "ledger.view": "none", "ledger.write": "none",
    "ledger.period.close": "none", // khoá sổ tháng (ADR-0080 D1): Nhân sự chỉ ba ô tài khoản
    "ledger.adjust.approve": "none", // ADR-0115: duyệt điều chỉnh công nợ chỉ Kế toán, Quản trị, Toàn quyền
    "invoice.request": "none", "invoice.issue": "none", "accounting.entry.mark": "none", "accounting.entry.view": "none",
    "party.view": "none", "party.write": "none", "party.staff.write": "none",
    "party.personal.view": "none", // ADR-0122 đ5
    "admin.manage": "none", "admin.manage.superadmin": "none",
    "account.access.manage": "none", // điều 1e: hỗ trợ đăng nhập vẫn Quản trị + Toàn quyền (ADR-0042)
    "account.create": "any", "account.view": "any", "account.edit": "any", // điều 1b
    "audit.view": "none", "feedback.submit": "any", "feedback.view": "own", "feedback.triage": "none", "feedback.team.manage": "none", "settings.ops": "none", "order.pool.view": "none",
    "notice.send": "none", "company.legal.write": "none",
    "party.document.view": "own", // như mọi tài khoản nội bộ (ADR-0040 D2, R5): giấy tờ của CHÍNH MÌNH, số che
    "party.document.write": "none", "party.document.reveal": "none", "party.attachment.view": "none", "vehicle.manage": "none",
    "party.self.view": "own", "party.self.submit": "own", // ADR-0124 đ4 (lát H-3): ngoại lệ có tên — hồ sơ của CHÍNH MÌNH, như mọi tài khoản
    "party.privacy.policy": "none", // ADR-0126 đ1
    "party.erasure.request": "own", // ADR-0124 đ4 + ADR-0126 đ2 (lát H-5): ngoại lệ có tên — yêu cầu xoá dữ liệu của CHÍNH MÌNH, như mọi tài khoản
    "party.erasure.process": "none", // ADR-0126 đ2 (lát H-5): Nhân sự không xử lý phiếu xoá — chỉ Quản trị, Toàn quyền
    "party.verify": "any", "party.verify.attachment": "any", // ADR-0125 đ1
    "transport.rate.view": "none", "transport.rate.manage": "none", // ADR-0057 B3 — tiền xe thuê: không
    "transport.cost.view": "none", "transport.cost.adjust": "none", // ADR-0057 C7 — chi phí xe thuê: không
    "trip.view": "none", "trip.dispatch": "none", "trip.override": "none", "trip.urgent_adjust": "none", "dispatch.policy.lead": "none", "trip.progress": "none", "trip.call_ack": "none", "trip.passenger.add": "none",
    "trip.refuse": "none", // ADR-0053 D8: Nhân sự không lái chuyến
    "unavailability.self": "none", // ADR-0053 D9: Nhân sự không lái chuyến
    "trip.transfer": "none", // ADR-0111: Nhân sự không điều xe
    "assistant.ask": "any",
    "auth.session.viewAll": "none", "auth.session.revoke": "none", "auth.session.policy": "none", // ADR-0075 điều 7: chỉ Toàn quyền
    "partner.commission.view": "none", "partner.commission.write": "none", "supply.terms.view": "none", "supply.terms.write": "none", // sổ đại lý đợt 1 (ADR-0071: Nhân sự chỉ ba ô tài khoản)
    "sales.block.write": "none", // ADR-0146 Đ5: luật bán chỉ Bán hàng, Quản trị, Toàn quyền
    "catalog.attribute.assign": "none", // ADR-0152 Đ3: gắn đặc điểm chỉ Bán hàng, Quản trị, Toàn quyền
    "order.terms.view": "none", "order.terms.override": "none", // Task 5: Nhân sự không thấy phần đối tác của đơn
  };
  assert.deepEqual(Object.fromEntries((Object.keys(MATRIX) as OperationCode[]).map((op) => [op, MATRIX[op].HR])), HR_ROW);
});

test("quyenHienThi (ADR-0042): người xem không giữ Toàn quyền thấy SUPER_ADMIN thành ADMIN, bỏ trùng, đúng thứ tự; Toàn quyền thấy nguyên", () => {
  assert.deepEqual(quyenHienThi(["SUPER_ADMIN"], false), ["ADMIN"]);
  assert.deepEqual(quyenHienThi(["ADMIN", "SUPER_ADMIN"], false), ["ADMIN"]);
  assert.deepEqual(quyenHienThi(["SUPER_ADMIN", "SALES"], false), ["SALES", "ADMIN"]);
  assert.deepEqual(quyenHienThi(["SALES"], false), ["SALES"]);
  assert.deepEqual(quyenHienThi(["SUPER_ADMIN", "ADMIN"], true), ["ADMIN", "SUPER_ADMIN"]);
});

// ADR-0047 A2: "order.passenger.write mang giá trị bằng order.modify — ai lập, sửa được đơn thì nhập được tên khách của đơn đó". SUY TỪ MATRIX (không
// chép tay): ai đổi một ô của một trong hai hàng mà quên hàng kia thì đỏ ở đây — tách ô nhập tên khách khỏi ô sửa đơn phải là quyết định có chủ đích.
test("ADR-0047 A2: order.passenger.write = order.modify ở MỌI cột quyền (suy từ MATRIX)", () => {
  for (const p of PERMISSION_CODES) assert.equal(MATRIX["order.passenger.write"][p], MATRIX["order.modify"][p], `order.passenger.write × ${p} phải bằng order.modify × ${p}`);
});

// Chủ H4/N-14 (29/9 tối, Trả lời lần 12): xem ĐỦ dấu đặt gấp đúng bốn mã văn phòng (any); Đối tác, HDV, Thực tập, hai mã tài xế none (chỉ cờ / không xem đơn).
test("H4/N-14: ô order.leg.short_notice.view = any ĐÚNG ở SALES, ACCOUNTING, ADMIN, SUPER_ADMIN; mọi mã khác none", () => {
  assert.deepEqual(PERMISSION_CODES.filter((p) => MATRIX["order.leg.short_notice.view"][p] !== "none"), ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"]);
  for (const p of ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(MATRIX["order.leg.short_notice.view"][p], "any");
});

// ADR-0049 D3 (siết): đặt gấp chặng dưới mốc 6 giờ CHỈ Quản trị + Toàn quyền — lỡ mở cho Bán hàng / Thực tập / Đối tác thì đỏ ở đây.
// ADR-0049 D3 (siết, kế hoạch mục 1.2): phá lệ chuyến CHỈ Quản trị + Toàn quyền; mọi mã xem được lịch xe cho mọi chuyến (`trip.view = any`) cũng xem được
// liên hệ khách mọi đơn (`contact.view = any`) — DTO chi tiết chuyến của văn phòng có họ tên khách, bài này chứng minh không lộ thêm cho ai.
test("ADR-0049 D3: trip.override CHỈ ADMIN + SUPER_ADMIN; trip.view = any ⇒ contact.view = any; trip.dispatch không cho Kế toán / HDV / Đối tác / Thực tập / tài xế", () => {
  assert.deepEqual(PERMISSION_CODES.filter((p) => MATRIX["trip.override"][p] !== "none"), ["ADMIN", "SUPER_ADMIN"]);
  for (const p of PERMISSION_CODES) if (MATRIX["trip.view"][p] === "any") assert.equal(MATRIX["contact.view"][p], "any", `${p}: trip.view any mà contact.view không any`);
  assert.deepEqual(PERMISSION_CODES.filter((p) => MATRIX["trip.dispatch"][p] !== "none"), ["SALES", "ADMIN", "SUPER_ADMIN"]);
  // TC-35 (A15): lệnh tiến độ — văn phòng bấm thay (Bán hàng, Quản trị, Toàn quyền — R-P1) + tài xế công ty CHỈ chuyến mình lái; Kế toán KHÔNG.
  // NỚI có tên (kế hoạch A4 §3.1 hàng T6; ADR-0053 :49, :200): + tài xế đối tác, cũng CHỈ chuyến mình lái (assigned).
  assert.deepEqual(PERMISSION_CODES.filter((p) => MATRIX["trip.progress"][p] !== "none"), ["SALES", "ADMIN", "SUPER_ADMIN", "DRIVER", "DRIVER_PARTNER"]);
  assert.equal(MATRIX["trip.progress"].DRIVER, "assigned");
  assert.equal(MATRIX["trip.progress"].DRIVER_PARTNER, "assigned");
});

// ADR-0052 D4 :84 + ADR-0111 (kế hoạch A5 NT-A5-22, siết): ô chuyển khách CHỈ tài xế đang lái (DRIVER assigned) + Toàn quyền (any — vẫn phải là tài xế đang lái
// chuyến, route kiểm). Bán hàng, Quản trị KHÔNG: văn phòng gửi thay cứu hộ đi ô trip.progress (D5c), duyệt / bác đề nghị leo thang đi ô trip.override.
test("ADR-0052 D4 / ADR-0111 / ADR-0053:46 (N4): trip.transfer — SALES, ADMIN = none; SUPER_ADMIN any; DRIVER và DRIVER_PARTNER assigned; PARTNER và mọi vai khác none", () => {
  assert.equal(MATRIX["trip.transfer"].SALES, "none");
  assert.equal(MATRIX["trip.transfer"].ADMIN, "none");
  assert.deepEqual(PERMISSION_CODES.filter((p) => MATRIX["trip.transfer"][p] !== "none"), ["SUPER_ADMIN", "DRIVER", "DRIVER_PARTNER"]);
  assert.equal(MATRIX["trip.transfer"].DRIVER, "assigned");
  assert.equal(MATRIX["trip.transfer"].DRIVER_PARTNER, "assigned");
  assert.equal(MATRIX["trip.transfer"].PARTNER, "none");
});

// ADR-0051 GB2 (siết): người không được đổi giờ hẹn thì không được xác nhận đã báo giờ hẹn — trip.call_ack KHÔNG rộng hơn order.trip.edit ở mọi cột; ai có ô
// này phải thấy được bảng (trip.view = any) và SĐT khách để gọi (contact.view ≠ none).
const BAC: Record<string, number> = { none: 0, own: 1, assigned: 1, ownOrAssigned: 2, any: 3 };
test("ADR-0051 GB2: trip.call_ack ⊆ order.trip.edit theo từng cột; trip.call_ack ≠ none ⇒ trip.view = any và contact.view ≠ none", () => {
  for (const p of PERMISSION_CODES) {
    const a = MATRIX["trip.call_ack"][p];
    const b = MATRIX["order.trip.edit"][p];
    assert.ok(BAC[a]! <= BAC[b]! && !(a === "own" && b === "assigned") && !(a === "assigned" && b === "own"), `${p}: trip.call_ack ${a} rộng hơn order.trip.edit ${b}`);
    if (a !== "none") {
      assert.equal(MATRIX["trip.view"][p], "any", `${p}: có trip.call_ack mà không xem được bảng điều phối`);
      assert.notEqual(MATRIX["contact.view"][p], "none", `${p}: có trip.call_ack mà không thấy SĐT khách để gọi`);
    }
  }
  assert.deepEqual(PERMISSION_CODES.filter((p) => MATRIX["trip.call_ack"][p] !== "none"), ["SALES", "ADMIN", "SUPER_ADMIN"]);
});

// ADR-0104 Đ1 mục 1 (siết, khuôn bài trip.call_ack): ô điều chỉnh khẩn cấp KHÔNG rộng hơn ô xếp xe ở mọi cột — ai vượt mốc được thì phải là người xếp xe được.
test("ADR-0104 Đ1: trip.urgent_adjust ⊆ trip.dispatch theo từng cột; đúng Bán hàng, Quản trị, Toàn quyền = any", () => {
  for (const p of PERMISSION_CODES) {
    const a = MATRIX["trip.urgent_adjust"][p];
    const b = MATRIX["trip.dispatch"][p];
    assert.ok(BAC[a]! <= BAC[b]! && !(a === "own" && b === "assigned") && !(a === "assigned" && b === "own"), `${p}: trip.urgent_adjust ${a} rộng hơn trip.dispatch ${b}`);
  }
  assert.deepEqual(PERMISSION_CODES.filter((p) => MATRIX["trip.urgent_adjust"][p] !== "none"), ["SALES", "ADMIN", "SUPER_ADMIN"]);
  for (const p of ["SALES", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(MATRIX["trip.urgent_adjust"][p], "any");
});

// Khoá GIÁ TRỊ (ADR-0059): route `GET /api/van-chuyen/xe-cua-don/:orderId` (xe trên chi tiết đơn) hỏi `can(trip.view)` VÀ `can(order.view)` không ngữ cảnh,
// và màn chi tiết đơn chỉ gọi route khi cả hai đúng. Bài này giữ nghĩa "người xem được Bảng điều phối (trip.view = any) thì xem được mọi đơn": ai sau này nới
// trip.view = any cho một quyền không xem được mọi đơn (vd Thực tập, HDV) thì đỏ ở đây — phải quyết lại bằng ADR, không lặng lẽ mở xe trên đơn / lịch xe cho
// họ. Không phải phép kiểm lúc chạy (thân route vẫn hỏi cả hai ô) — xem docs/SO-HANG-RAO.md.
test("ADR-0059: mọi mã quyền có trip.view = any thì có order.view = any (xe trên chi tiết đơn chỉ cho người đã xem được Bảng điều phối)", () => {
  for (const p of PERMISSION_CODES) {
    if (MATRIX["trip.view"][p] === "any") assert.equal(MATRIX["order.view"][p], "any", `${p}: trip.view = any nhưng order.view = ${MATRIX["order.view"][p]}`);
  }
});

// ADR-0107 (i) — NỚI có tên (Điều 9.4; chủ chọn Q-3 a ngày 2026-10-08): thêm SALES. Không phạm vi đơn ở ô này; bốn lệnh sửa / thêm / thay chặng và `PUT …/trip`
// vẫn hỏi `order.trip.edit` (SALES ownOrAssigned) trước, nên Bán hàng chỉ kèm dấu cho đơn mình lập hoặc phụ trách — bài phạm vi ở dat-gap-sat-gio.test.ts.
test("ADR-0049 D3 + ADR-0107 (i): ô order.leg.short_notice ĐÚNG SALES + ADMIN + SUPER_ADMIN (any); mọi mã khác none", () => {
  const co = PERMISSION_CODES.filter((p) => MATRIX["order.leg.short_notice"][p] !== "none");
  assert.deepEqual(co, ["SALES", "ADMIN", "SUPER_ADMIN"]);
  for (const p of co) assert.equal(MATRIX["order.leg.short_notice"][p], "any", p);
});

// ADR-0060 (siết): ghi dấu "đã nhập phần mềm kế toán" CHỈ Kế toán + Toàn quyền (lời chủ — Quản trị KHÔNG); ô xem KHÔNG rộng hơn order.view ở mọi cột
// (một người không xem được đơn thì không thấy dấu kế toán của đơn đó); Đối tác none (Q-2 "Không").
test("ADR-0060: accounting.entry.mark ≠ none ĐÚNG ở ACCOUNTING, SUPER_ADMIN (any); accounting.entry.view ⊆ order.view theo từng cột; PARTNER none", () => {
  assert.deepEqual(PERMISSION_CODES.filter((p) => MATRIX["accounting.entry.mark"][p] !== "none"), ["ACCOUNTING", "SUPER_ADMIN"]);
  for (const p of ["ACCOUNTING", "SUPER_ADMIN"] as const) assert.equal(MATRIX["accounting.entry.mark"][p], "any");
  for (const p of PERMISSION_CODES) {
    const a = MATRIX["accounting.entry.view"][p];
    const b = MATRIX["order.view"][p];
    assert.ok(BAC[a]! <= BAC[b]! && !(a === "own" && b === "assigned") && !(a === "assigned" && b === "own"), `${p}: accounting.entry.view ${a} rộng hơn order.view ${b}`);
  }
  assert.equal(MATRIX["accounting.entry.view"].PARTNER, "none");
});

// ADR-0057 B3, C7 (chủ lần 18 "Hai vai giống hệt"): Quản trị = Kế toán ở MỌI ô transport.*; Toàn quyền any; mọi cột khác none (kể cả HR — ADR-0071).
test("ADR-0057: ô transport.* — ADMIN = ACCOUNTING = any, SUPER_ADMIN any, mọi cột khác none", () => {
  const ops = (Object.keys(MATRIX) as OperationCode[]).filter((op) => op.startsWith("transport."));
  assert.ok(ops.length >= 2, "chống bài rỗng");
  for (const op of ops) {
    const r = MATRIX[op];
    assert.equal(r.ADMIN, r.ACCOUNTING, `${op}: Quản trị phải ngang Kế toán`);
    assert.deepEqual(r, { SALES: "none", ACCOUNTING: "any", ADMIN: "any", FIELD: "none", PARTNER: "none", SUPER_ADMIN: "any", INTERN: "none", DRIVER: "none", DRIVER_PARTNER: "none", HR: "none" }, op);
  }
});

// ADR-0090 đ0 (Q-T1): "tài khoản có quyền tiền" = giữ ít nhất một ô GHI TIỀN mà Quản trị không có. Bốn ô ghim tay (đọc độc lập từ ADR); danh sách mã quyền
// SUY từ MATRIX — thêm một mã giữ một trong bốn ô thì hàm tự nhận, không sửa tay.
test("ADR-0090 đ0: bốn ô ghi tiền, Quản trị = none; mã quyền tiền suy từ bảng = Kế toán + Toàn quyền", () => {
  assert.deepEqual([...O_GHI_TIEN], ["ledger.write", "payment.refund", "order.complete", "accounting.entry.mark"]);
  for (const o of O_GHI_TIEN) assert.equal(MATRIX[o].ADMIN, "none", `${o}: Quản trị phải là none (đ0)`);
  assert.deepEqual([...MA_QUYEN_TIEN], ["ACCOUNTING", "SUPER_ADMIN"]);
  assert.deepEqual([...MA_QUYEN_TIEN], PERMISSION_CODES.filter((p) => O_GHI_TIEN.some((o) => MATRIX[o][p] !== "none")), "suy từ MATRIX, không chép tay");
  assert.equal(coQuyenTien(["SALES"]), false);
  assert.equal(coQuyenTien(["ADMIN"]), false, "Quản trị không phải tài khoản tiền");
  assert.equal(coQuyenTien(["HR"]), false);
  assert.equal(coQuyenTien(["SALES", "ACCOUNTING"]), true);
  assert.equal(coQuyenTien(["SUPER_ADMIN"]), true);
  assert.equal(coQuyenTien([]), false);
});

// Khoá GIÁ TRỊ (sổ đại lý đợt 1, Task 5): người thấy tỷ lệ mua lại của nhà cung cấp phải thấy phần đối tác của đơn, người thấy phần đối tác của đơn phải thấy tiền. Chỉ khoá giá trị bảng,
// KHÔNG phải phép kiểm lúc chạy (sửa hai cột cho khớp nhau thì bài vẫn xanh — xem giới hạn ở docs/SO-HANG-RAO.md).
test("sổ đại lý: supply.terms.view ⊆ order.terms.view ⊆ money.view ở mọi cột; DRIVER, DRIVER_PARTNER, HR = none ở các ô mới", () => {
  // Thứ tự rộng hẹp: none ⊂ own, assigned ⊂ ownOrAssigned ⊂ any.
  const le = (a: Scope, b: Scope) => a === "none" || b === "any" || a === b || (b === "ownOrAssigned" && (a === "own" || a === "assigned"));
  for (const p of PERMISSION_CODES) {
    assert.ok(le(MATRIX["supply.terms.view"][p], MATRIX["order.terms.view"][p]), `${p}: supply.terms.view ⊆ order.terms.view`);
    assert.ok(le(MATRIX["order.terms.view"][p], MATRIX["money.view"][p]), `${p}: order.terms.view ⊆ money.view`);
  }
  for (const op of ["partner.commission.view", "partner.commission.write", "order.terms.view", "order.terms.override", "supply.terms.view", "supply.terms.write", "ledger.period.close"] as const)
    for (const p of ["DRIVER", "DRIVER_PARTNER", "HR"] as const) assert.equal(MATRIX[op][p], "none", `${op}/${p}`);
});

test("sổ đại lý: ghi mức tay (order.terms.override) chỉ Kế toán, Quản trị, Toàn quyền — Bán hàng, Hướng dẫn viên, Đối tác, Thực tập KHÔNG; Đối tác xem được đơn CỦA MÌNH, không đơn người khác", () => {
  const ai = (permissions: PermissionCode[], op: OperationCode, ctx = {}) => can({ id: "u1", permissions }, op, ctx);
  for (const p of ["ACCOUNTING", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(ai([p], "order.terms.override"), true, p);
  for (const p of ["SALES", "FIELD", "PARTNER", "INTERN"] as const) assert.equal(ai([p], "order.terms.override", { ownerId: "u1", assigned: true }), false, p);
  assert.equal(ai(["PARTNER"], "order.terms.view", { ownerId: "u1" }), true);
  assert.equal(ai(["PARTNER"], "order.terms.view", { ownerId: "u2" }), false);
  assert.equal(ai(["FIELD"], "order.terms.view", { assigned: true }), true);
  assert.equal(ai(["FIELD"], "order.terms.view", { assigned: false }), false);
  assert.equal(ai(["SALES"], "supply.terms.view"), false, "Bán hàng thấy hoa hồng, không thấy tỷ lệ mua lại của nhà cung cấp");
});

// ADR-0100 (accepted 2026-10-03; K-B-1 kiểm toán 12/10): luật giá R2/R3 (chỉ giá danh mục, không giảm giá) áp cho Đối tác VÀ Thực tập — "có quyền … là áp",
// kể cả kèm quyền nội bộ khác. MỘT hàm thuần `chiGiaDanhMuc` cho máy chủ lẫn form lập đơn. Kỳ vọng VIẾT TAY (không suy từ MATRIX); `holdsPartner` KHÔNG đổi nghĩa
// (còn dùng cho R1 nhập tay, DTO thương mại hẹp, Nhật ký…) nên bài này quét lại nó cạnh hàm mới.
test("ADR-0100: chiGiaDanhMuc trên cả 1024 tập con quyền — đúng khi có PARTNER hoặc có INTERN (kể cả kèm quyền nội bộ), và holdsPartner / holdsIntern giữ nguyên nghĩa", () => {
  let count = 0;
  let bitChan = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const permissions = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const who = { id: "u1", permissions };
    const ten = permissions.join("+") || "(không quyền)";
    const mong = permissions.includes("PARTNER") || permissions.includes("INTERN");
    assert.equal(chiGiaDanhMuc(who), mong, `chiGiaDanhMuc: ${ten}`);
    assert.equal(holdsPartner(who), permissions.includes("PARTNER"), `holdsPartner đổi nghĩa: ${ten}`);
    assert.equal(holdsIntern(who), permissions.includes("INTERN"), `holdsIntern: ${ten}`);
    if (mong) bitChan++;
    count++;
  }
  assert.equal(count, 1024);
  assert.equal(bitChan, 1024 - 256, "chống bài rỗng: 768 tập có PARTNER hoặc INTERN, 256 tập không có cả hai"); // 8 mã còn lại → 2^8 tập không PARTNER, không INTERN
});

test("ADR-0100: Thực tập đứng một mình, Thực tập kèm Bán hàng / Quản trị / Toàn quyền / HDV đều bị áp; Bán hàng, Kế toán, Quản trị, Toàn quyền, HDV, Nhân sự đứng một mình KHÔNG", () => {
  const ai = (...permissions: PermissionCode[]) => ({ id: "u1", permissions });
  for (const lai of [["INTERN"], ["INTERN", "SALES"], ["INTERN", "ADMIN"], ["SUPER_ADMIN", "INTERN"], ["FIELD", "INTERN"], ["PARTNER", "INTERN"]] as PermissionCode[][])
    assert.equal(chiGiaDanhMuc(ai(...lai)), true, lai.join("+"));
  for (const p of ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN", "FIELD", "HR", "DRIVER"] as const) assert.equal(chiGiaDanhMuc(ai(p)), false, p);
  assert.equal(chiGiaDanhMuc(ai()), false);
});

test("ADR-0124 đ4 (lát H-3): party.self.view / party.self.submit trên cả 1024 tập con quyền — chính mình: được khi có ít nhất một quyền; người khác / không ngữ cảnh: chỉ khi có Toàn quyền; party.privacy.policy chỉ Toàn quyền", () => {
  let count = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const permissions = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const who = { id: "u1", permissions };
    const coSup = permissions.includes("SUPER_ADMIN");
    const ten = permissions.join("+") || "(không quyền)";
    for (const op of ["party.self.view", "party.self.submit"] as const) {
      assert.equal(can(who, op, { ownerId: "u1" }), permissions.length > 0, `${op} chính mình: ${ten}`);
      assert.equal(can(who, op, { ownerId: "u2" }), coSup, `${op} người khác: ${ten}`);
      assert.equal(can(who, op), coSup, `${op} không ngữ cảnh: ${ten}`);
    }
    assert.equal(can(who, "party.privacy.policy", { ownerId: "u1" }), coSup, `party.privacy.policy: ${ten}`);
    count++;
  }
  assert.equal(count, 1024);
});

test("ADR-0124 đ4 (lát H-5): party.erasure.request — mọi cột own (kể cả Tài xế đối tác, Nhân sự), Toàn quyền any; trên cả 1024 tập con quyền như party.self.*", () => {
  assert.deepEqual(MATRIX["party.erasure.request"], { SALES: "own", ACCOUNTING: "own", ADMIN: "own", FIELD: "own", PARTNER: "own", SUPER_ADMIN: "any", INTERN: "own", DRIVER: "own", DRIVER_PARTNER: "own", HR: "own" });
  let count = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const permissions = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const who = { id: "u1", permissions };
    const coSup = permissions.includes("SUPER_ADMIN");
    const ten = permissions.join("+") || "(không quyền)";
    assert.equal(can(who, "party.erasure.request", { ownerId: "u1" }), permissions.length > 0, `chính mình: ${ten}`);
    assert.equal(can(who, "party.erasure.request", { ownerId: "u2" }), coSup, `người khác: ${ten}`);
    assert.equal(can(who, "party.erasure.request"), coSup, `không ngữ cảnh: ${ten}`);
    count++;
  }
  assert.equal(count, 1024);
});

test("ADR-0126 đ2 (lát H-5): party.erasure.process — chỉ Quản trị và Toàn quyền; trên cả 1024 tập con quyền: được khi có ADMIN hoặc SUPER_ADMIN, có hay không có ngữ cảnh (HR, Đối tác... không)", () => {
  assert.deepEqual(MATRIX["party.erasure.process"], { SALES: "none", ACCOUNTING: "none", ADMIN: "any", FIELD: "none", PARTNER: "none", SUPER_ADMIN: "any", INTERN: "none", DRIVER: "none", DRIVER_PARTNER: "none", HR: "none" });
  let count = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const permissions = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const who = { id: "u1", permissions };
    const duoc = permissions.includes("ADMIN") || permissions.includes("SUPER_ADMIN");
    const ten = permissions.join("+") || "(không quyền)";
    assert.equal(can(who, "party.erasure.process"), duoc, `không ngữ cảnh: ${ten}`);
    assert.equal(can(who, "party.erasure.process", { ownerId: "u1" }), duoc, `chính mình: ${ten}`);
    assert.equal(can(who, "party.erasure.process", { ownerId: "u2" }), duoc, `người khác: ${ten}`);
    count++;
  }
  assert.equal(count, 1024);
});

test("ADR-0125 đ1, đ2: party.verify / party.verify.attachment — ADMIN, HR, SUPER_ADMIN any; mọi cột khác none; HR vẫn không Danh bạ, không dữ liệu cá nhân", () => {
  for (const op of ["party.verify", "party.verify.attachment"] as const) {
    assert.deepEqual(MATRIX[op], { SALES: "none", ACCOUNTING: "none", ADMIN: "any", FIELD: "none", PARTNER: "none", SUPER_ADMIN: "any", INTERN: "none", DRIVER: "none", DRIVER_PARTNER: "none", HR: "any" });
  }
  assert.equal(MATRIX["party.view"].HR, "none");
  assert.equal(MATRIX["party.personal.view"].HR, "none");
  assert.equal(MATRIX["party.document.reveal"].ADMIN, "none");
  assert.equal(MATRIX["party.document.reveal"].HR, "none");
});

test("ADR-0125: HR đúng năm ô `any` ngoài hai ô của mọi tài khoản nội bộ", () => {
  const MOI_TAI_KHOAN = new Set(["feedback.submit", "assistant.ask"]);
  const hrAny = Object.entries(MATRIX).filter(([, r]) => r.HR === "any").map(([k]) => k).filter((k) => !MOI_TAI_KHOAN.has(k)).sort();
  assert.deepEqual(hrAny, ["account.create", "account.edit", "account.view", "party.verify", "party.verify.attachment"]);
});

test("ADR-0125 đ1 (lát H-4): party.verify / party.verify.attachment trên cả 1024 tập con quyền — được khi có ADMIN, HR hoặc SUPER_ADMIN, có hay không có ngữ cảnh", () => {
  let count = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const permissions = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const who = { id: "u1", permissions };
    const duoc = permissions.includes("ADMIN") || permissions.includes("HR") || permissions.includes("SUPER_ADMIN");
    const ten = permissions.join("+") || "(không quyền)";
    for (const op of ["party.verify", "party.verify.attachment"] as const) {
      assert.equal(can(who, op), duoc, `${op}: ${ten}`);
      assert.equal(can(who, op, { ownerId: "u2" }), duoc, `${op} (ngữ cảnh người khác): ${ten}`);
    }
    count++;
  }
  assert.equal(count, 1024);
});

// HÀNG RÀO (i) của ADR-0152 Đ6 (kế hoạch 2026-10-30 T5; ghi ở docs/SO-HANG-RAO.md): ai định nghĩa được đặc điểm (admin.manage) thì đặt được luật bán — ở MỌI cột. Khoá GIÁ TRỊ bảng,
// không phải phép kiểm lúc chạy. Vế thứ hai (catalog.attribute.assign ⊆ sales.block.write) thêm cùng ô gắn đặc điểm ở T7.
test("(i) ADR-0152 Đ6: admin.manage ≠ none ⇒ sales.block.write ≠ none ở mọi cột; sales.block.write đúng Bán hàng, Quản trị, Toàn quyền = any (ADR-0146 Đ5)", () => {
  for (const p of PERMISSION_CODES)
    if (MATRIX["admin.manage"][p] !== "none") assert.notEqual(MATRIX["sales.block.write"][p], "none", `${p}: admin.manage ${MATRIX["admin.manage"][p]} mà sales.block.write = none`);
  assert.deepEqual(PERMISSION_CODES.filter((p) => MATRIX["sales.block.write"][p] !== "none"), ["SALES", "ADMIN", "SUPER_ADMIN"]);
  for (const p of ["SALES", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(MATRIX["sales.block.write"][p], "any", p);
});

// HÀNG RÀO (i) vế hai (ADR-0152 Đ3, Đ6; kế hoạch T5→T7): người gắn giá trị đặc điểm cho dịch vụ (đổi được kết quả luật bán — Đ4) không rộng hơn người đặt luật bán, ở MỌI cột.
// Bỏ Bán hàng khỏi ô luật bán (ADR-0146 «Điều chủ cần biết») thì bài này đỏ, buộc bỏ luôn ở ô gắn — không để lại cửa sau.
test("(i) ADR-0152 Đ6: catalog.attribute.assign ≠ none ⇒ sales.block.write ≠ none ở mọi cột; catalog.attribute.assign đúng Bán hàng, Quản trị, Toàn quyền = any (ADR-0152 Đ3)", () => {
  for (const p of PERMISSION_CODES)
    if (MATRIX["catalog.attribute.assign"][p] !== "none") assert.notEqual(MATRIX["sales.block.write"][p], "none", `${p}: catalog.attribute.assign ${MATRIX["catalog.attribute.assign"][p]} mà sales.block.write = none`);
  assert.deepEqual(PERMISSION_CODES.filter((p) => MATRIX["catalog.attribute.assign"][p] !== "none"), ["SALES", "ADMIN", "SUPER_ADMIN"]);
  for (const p of ["SALES", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(MATRIX["catalog.attribute.assign"][p], "any", p);
});
