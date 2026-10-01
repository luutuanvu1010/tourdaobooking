// BẢN ĐỒ QUYỀN → THAO TÁC (ADR-0007) — MỘT NƠI DUY NHẤT trong mã (P6). Logic thuần: server (kiểm quyền) và web/ (ẩn/hiện) cùng import.
// Mặc định từ chối (Điều 8.5): thao tác lạ hoặc ô không khai = không được. Quyền app KHÔNG phải vai trò hồ sơ (ADR-0005): vai trò
// hồ sơ (HDV, tài xế…) không bao giờ là điều kiện ở đây (R-N1-12).

export const PERMISSION_CODES = ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "SUPER_ADMIN", "INTERN", "DRIVER", "DRIVER_PARTNER", "HR"] as const;
export type PermissionCode = (typeof PERMISSION_CODES)[number];

export const PERMISSION_LABEL: Record<PermissionCode, string> = {
  SALES: "Bán hàng",
  ACCOUNTING: "Kế toán",
  ADMIN: "Quản trị",
  FIELD: "Hướng dẫn viên",
  PARTNER: "Đối tác",
  SUPER_ADMIN: "Toàn quyền", // ADR-0018 điều 4: bỏ chữ Anh "Super Admin" lộ ra người dùng
  INTERN: "Thực tập", // ADR-0018 điều 4
  DRIVER: "Tài xế", // ADR-0040 D3: tài xế công ty là nhân viên có tài khoản (vai "Tài xế công ty", mã vai DRIVER_INTERNAL)
  DRIVER_PARTNER: "Tài xế đối tác", // ADR-0048 D2: tài xế của nhà xe đối tác (vai "Tài xế đối tác", mã vai DRIVER_EXTERNAL) — khác quyền DRIVER
  HR: "Nhân sự", // ADR-0071 điều 1a: vai "Hành chính nhân sự" (mã vai HR_STAFF) — tạo / xem / sửa tài khoản; không đơn, tiền, Danh bạ, danh mục
};

export const isPermissionCode = (v: unknown): v is PermissionCode => typeof v === "string" && (PERMISSION_CODES as readonly string[]).includes(v);

/**
 * QUYỀN BÊN NGOÀI — MỘT hằng cho hai luật (ADR-0048 B2.1, thay `EXTERNAL_ALLOWED` cũ của roles.ts):
 * (1) LC-1 (ADR-0018 điều 5 sửa bởi ADR-0048): tài khoản mang vai bên ngoài chỉ giữ các quyền này — `effectivePermissions`, `roleAssignmentProblem`
 *     (roles.ts), ô tick ở web/role-picker.ts; trigger LC-1 của migration *_tai_xe_doi_tac giữ CÙNG tập (src/migrations-tai-xe-doi-tac.test.ts đối chiếu
 *     theo hành vi — thêm mã ở đây thì phải tạo lại trigger bằng migration mới);
 * (2) nghĩa "Toàn công ty" (ADR-0034 điều 6 sửa bởi ADR-0048): `laNoiBo` = có ít nhất một quyền KHÔNG thuộc tập này (thong-bao.ts).
 */
export const EXTERNAL_PERMISSIONS = ["PARTNER", "DRIVER_PARTNER"] as const satisfies readonly PermissionCode[];
/** Mã quyền này có thuộc EXTERNAL_PERMISSIONS không (đọc hằng trên — không phải tập thứ hai). */
export const isExternalPermission = (p: PermissionCode): boolean => (EXTERNAL_PERMISSIONS as readonly PermissionCode[]).includes(p);

/**
 * Phạm vi của một ô: `none` không được; `own` chỉ đơn của mình (`orders.staff_id`); `assigned` chỉ việc đang được giao (N2);
 * `ownOrAssigned` một trong hai; `any` tất cả.
 */
export type Scope = "none" | "own" | "assigned" | "ownOrAssigned" | "any";

/**
 * Thứ tự cột của mỗi hàng ở MATRIX. `INTERN` thêm CUỐI (ADR-0018), `DRIVER` thêm CUỐI (ADR-0040 D3), `DRIVER_PARTNER` thêm CUỐI (ADR-0048 D2, cột thứ 9),
 * `HR` thêm CUỐI (ADR-0071, cột thứ 10) để thứ tự các mảng quyền cũ không đổi.
 */
type Row = Record<PermissionCode, Scope>;
const row = (
  SALES: Scope, ACCOUNTING: Scope, ADMIN: Scope, FIELD: Scope, PARTNER: Scope, SUPER_ADMIN: Scope, INTERN: Scope, DRIVER: Scope, DRIVER_PARTNER: Scope, HR: Scope,
): Row => ({
  SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR,
});

/**
 * Bản đồ ADR-0007 điều 1 (ADMIN làm được mọi thao tác) đã đổi theo ADR-0009, ADR-0014 (thêm PARTNER/SUPER_ADMIN, bốn thao tác mới), cộng 3 thao tác
 * Góp ý (`feedback.*` — mở rộng của module Góp ý, không thuộc bảng ADR-0007 gốc).
 * "Của mình" = người lập đơn (với `feedback.view` là người GỬI yêu cầu); "được giao" = người phụ trách đang mở của đơn
 * (do `dispatch` cung cấp hàm `isOrderHandler`, gốc lắp ráp `src/index.ts` tiêm vào `ctx.isAssigned` — ADR-0007 điều 4(b); route nào cần thì gọi và truyền kết quả vào
 * `can(who, op, { ownerId, assigned })`). Route KHÔNG truyền `assigned` thì ô `ownOrAssigned` chạy như `own`.
 * Có route dùng: order.create/history.view/modify/trip.edit/money.edit/pool.view (module orders), dispatch.assign/claim/cancel (module dispatch),
 * feedback.submit/view/triage (module feedback), party.view/write/staff.write (module parties).
 * `SUPER_ADMIN` = `any` ở MỌI thao tác, không ngoại lệ (ADR-0014 điều 2) — kể cả các thao tác dưới đây chưa có route dùng.
 * Thao tác của N2/N3 (task.progress, payment.*, invoice.*) và ADR-0014 Phase C (dispatch.guides.view) có mặt để test khoá bản
 * đồ; CHƯA có route dùng (thi công ở phiên sau). `order.cancel`/`order.money.edit` (FIELD) đã có route thật (`POST /api/orders/:id/handler-cancel`,
 * `POST /api/orders/:id/handler-money-edit`, module dispatch — ADR-0014 điều 11/6, Phase B; `order.money.edit` ghi qua "dòng điều chỉnh" chỉ-thêm
 * ở bảng `order_money_adjustment`, không sửa đè `order_service`/`order_item`/cột tiền của `orders`).
 * ADR-0018 giai đoạn 1: cột INTERN TẠM HẸP (lập đơn; xem/sửa đơn của mình); giai đoạn 2 đổi sang giá trị đích của đặc tả §5.
 * ADR-0030 lượt 1 (S23-1, S23-3, S23-5, S20-6, S20-12 — thay ADR-0017 điều 1, không thi công ADR-0017 nguyên dạng): cột FIELD xem đơn/tiền/liên hệ/lịch sử
 * của đơn ĐANG PHỤ TRÁCH (`assigned`), tự nhận đơn chờ nhận (`dispatch.claim` any — chốt Nhận + chặn tài khoản lai ở route), xem hàng chờ (`order.pool.view`).
 * ADR-0040 D3 (Ruling R2 của điều phối 2026-09-28): cột DRIVER (Tài xế công ty) — lượt 1a MỌI ô nghiệp vụ = none (không thấy đơn, tiền, khách, danh mục giá,
 * hồ sơ người khác); ngoại lệ có tên: gửi/xem góp ý của mình (như mọi tài khoản) và xem giấy tờ của chính mình. Có bài ghim cả hàng (permissions.test.ts).
 * ADR-0048 D2 (accepted 2026-09-28): cột DRIVER_PARTNER (Tài xế đối tác — người của nhà xe đối tác) — MỌI ô nghiệp vụ = none, kể cả MỌI ô tiền; ngoại lệ có
 * tên: gửi/xem góp ý của mình và xem giấy tờ của chính mình (số che). Không vào cổng nào ngoài "staff". Có bài ghim cả hàng (permissions.test.ts).
 * ADR-0071 (accepted 2026-10-01): cột HR (Nhân sự — vai "Hành chính nhân sự") — CHỈ ba ô tài khoản (account.create/view/edit) + các ô của mọi tài khoản nội bộ
 * (gửi/xem góp ý của mình, hỏi trợ lý, giấy tờ của chính mình). Vào cổng "staff" và cổng "accounts". Có bài ghim cả hàng (permissions.test.ts).
 */
export const MATRIX = {
  "order.view": row("any", "any", "any", "assigned", "own", "any", "own", "none", "none", "none"), // xem đơn — FIELD: chỉ đơn đang phụ trách (ADR-0030 S23-1); chi tiết đơn khác → 404 (seesOnlyAssignedOrders)
  "money.view": row("any", "any", "any", "assigned", "own", "any", "own", "none", "none", "none"), // xem tiền, bảng giá danh mục — FIELD assigned (ADR-0030 S23-5): tiền đơn mình phụ trách, KHÔNG bảng giá (for-order chặn ở order.create)
  "order.history.view": row("ownOrAssigned", "any", "any", "assigned", "own", "any", "own", "none", "none", "none"), // nhật ký/lịch sử sửa đơn (ADR-0009: cả người phụ trách; ADR-0030 S23-3: FIELD đơn đang phụ trách)
  "contact.view": row("any", "any", "any", "assigned", "ownOrAssigned", "any", "own", "none", "none", "none"), // tên/SĐT khách, điểm đón, giờ — PARTNER: own (đơn tự lập) + assigned (đơn được duyệt "xin nhận", ADR-0014 điều 10). NGOẠI LỆ CÓ TÊN (ADR-0030 S23-2): nơi đón/giờ đón ở PHẦN HẸP của hàng chờ (order.pool.view) không đòi ô này — nơi đón đã che dãy số. Nay gồm HỌ TÊN + NĂM SINH của từng hành khách (ADR-0047 A2 — GET /api/orders/:id/passengers)
  "order.create": row("any", "none", "any", "none", "any", "any", "any", "none", "none", "none"), // lập đơn (đơn mới luôn là của người lập)
  "order.modify": row("ownOrAssigned", "none", "any", "none", "own", "any", "own", "none", "none", "none"), // sửa, xác nhận, huỷ đơn (ADR-0009: cả người phụ trách; ADR-0014: PARTNER của mình)
  "order.trip.edit": row("ownOrAssigned", "none", "any", "none", "none", "any", "none", "none", "none", "none"), // thông tin vận hành sau xác nhận
  // ADR-0049 D3: ĐẶT GẤP chặng dưới mốc tối thiểu (route POST /api/orders/:id/legs/:legId/short-notice + nhánh `datGap` của lệnh sửa chặng) — chỉ Quản trị,
  // Toàn quyền (ĐP2, chủ Q3 29/9). Không phạm vi đơn: Quản trị duyệt đặt gấp cho mọi đơn.
  "order.leg.short_notice": row("none", "none", "any", "none", "none", "any", "none", "none", "none", "none"),
  // Chủ trả lời H4 / N-14 (29/9 tối, "Trả lời lần 12"): XEM ĐỦ dấu đặt gấp trên chi tiết đơn (mã + nhãn lý do, tên người duyệt, lúc duyệt, ghi chú đã che
  // số) — văn phòng (Bán hàng, Kế toán, Quản trị, Toàn quyền). Mã khác xem được đơn (Đối tác, HDV, Thực tập) chỉ nhận cờ "đặt gấp — Quản trị đã duyệt"
  // (`legs[].datGap = { daDuyet: true }`). Không phạm vi đơn: phạm vi đã do order.view quyết. Hỏi ở `loadOrderView` qua `xemDuDatGap` (orders/index.ts).
  "order.leg.short_notice.view": row("any", "any", "any", "none", "none", "any", "none", "none", "none", "none"),
  "order.passenger.write": row("ownOrAssigned", "none", "any", "none", "own", "any", "own", "none", "none", "none"), // ADR-0047 A2: nhập, sửa (dòng mới), huỷ dòng trong danh sách hành khách — bằng order.modify; tài xế không đi qua ô này
  // ADR-0061 điều 2 (accepted 2026-09-30): thêm / sửa tên-giá DỊCH VỤ NHẬP TAY khi công tắc nhập tay đang BẬT. Không phạm vi đơn (đơn nào lập/sửa được vẫn do
  // order.create / order.modify quyết). Hỏi ở MỘT hàm `duocNhapTay` (orders/price-guards.ts): Đối tác TRƯỚC (holdsPartner — tài khoản lai cũng bị chặn), rồi
  // công tắc, rồi ô này. ACCOUNTING any nhưng CHƯA CÓ TÁC DỤNG: Kế toán không lập / sửa đơn (order.create, order.modify = none) — chủ Q-1 "Giữ quyền sẵn,
  // chờ việc C2" (route sửa đơn sau xác nhận tương lai phải gọi duocNhapTay).
  "order.service.manual": row("any", "any", "any", "none", "none", "any", "none", "none", "none", "none"),
  "task.progress": row("none", "none", "any", "assigned", "assigned", "any", "none", "none", "none", "none"), // cập nhật trạng thái việc được giao — PARTNER chỉ có tác dụng khi đang phụ trách (ADR-0014 điều 10)
  "order.money.edit": row("own", "any", "any", "assigned", "none", "any", "none", "none", "none", "none"), // số khách, dịch vụ, tiền sau xác nhận — ADR-0014 điều 6, route: POST /api/orders/:id/handler-money-edit (module dispatch, FIELD)
  "order.cancel": row("none", "none", "none", "assigned", "none", "any", "none", "none", "none", "none"), // huỷ đơn đang phụ trách, lý do bắt buộc — ADR-0014 điều 11, route: POST /api/orders/:id/handler-cancel (module dispatch)
  "dispatch.assign": row("ownOrAssigned", "none", "any", "none", "none", "any", "none", "none", "none", "none"), // đặt/đổi người phụ trách và nhiệm vụ (ADR-0009: cả người phụ trách hiện tại)
  "dispatch.claim": row("any", "none", "any", "any", "none", "any", "none", "none", "none", "none"), // nhận phụ trách đơn CHƯA có người (ADR-0009; điều kiện "chưa có người" do dịch vụ của dispatch kiểm, không phải ô này) — FIELD any (ADR-0030 S20-6/S20-12); chốt Nhận (đã huỷ/qua ngày đi) + chặn tài khoản có quyền Đối tác ở route PUT /api/orders/:id/handler
  "dispatch.guides.view": row("none", "none", "none", "none", "any", "any", "none", "none", "none", "none"), // danh sách hẹp hướng dẫn viên nội bộ — thao tác MỚI (ADR-0014 điều 9, chưa có route)
  // Sổ tiền lượt 1 (ADR-0026 điều 10, bảng 9 cột bản làm mới §2 — accepted 2026-09-29): ghi LẦN THU trước "Đã giao" (route POST /api/orders/:id/payments,
  // module billing). FIELD assigned (HDV đang phụ trách ghi tiền mình thu trước chuyến), PARTNER own, INTERN own — thay ô cọc trên form đơn của mình.
  // Người thu ∈ {chính mình, Công ty} trừ Kế toán/Toàn quyền (kiểm ở route, không phải ô này).
  "payment.receive": row("own", "any", "any", "assigned", "own", "any", "own", "none", "none", "none"),
  // Ghi HOÀN KHÁCH (route POST /api/ledger/refunds, module billing) — ADR-0026 điều 10: ADMIN any → none (H4 "Kế toán ghi", thận trọng).
  "payment.refund": row("none", "any", "none", "none", "none", "any", "none", "none", "none", "none"),
  // Sổ tiền lượt 1 — BỐN Ô MỚI (bảng 9 cột bản làm mới §2, accepted 2026-09-29), mỗi ô có route hỏi nó ở module billing:
  // "Đã giao – đã thu đủ" (ADR-0025 đ2): HDV đang phụ trách (assigned), Quản trị, Toàn quyền — Bán hàng, Kế toán KHÔNG (chủ chọn A 30/9). Route POST /api/orders/:id/delivered.
  "order.handover": row("none", "none", "any", "assigned", "none", "any", "none", "none", "none", "none"),
  // "Hoàn thành" (ADR-0025 đ6): Kế toán, Toàn quyền — Quản trị KHÔNG. Route POST /api/orders/:id/completed.
  "order.complete": row("none", "any", "none", "none", "none", "any", "none", "none", "none", "none"),
  // Xem sổ công nợ (ADR-0026 đ7, đ10): own = "Sổ của tôi" (GET /api/ledger/mine); any = sổ mọi bên (GET /api/ledger). Đối tác none ở lượt 1; tài xế none.
  "ledger.view": row("own", "any", "own", "own", "none", "any", "own", "none", "none", "none"),
  // Ghi sổ (ADR-0026 đ5, đ8): xác nhận công ty đã nhận, nộp/trả, điều chỉnh, đảo; cũng là "Kế toán" khi ghi lần thu (ghi người thu khác, chọn ngày phát sinh).
  "ledger.write": row("none", "any", "none", "none", "none", "any", "none", "none", "none", "none"),
  "invoice.request": row("own", "any", "any", "none", "none", "any", "none", "none", "none", "none"), // ghi yêu cầu hoá đơn + thông tin xuất
  "invoice.issue": row("none", "any", "any", "none", "none", "any", "none", "none", "none", "none"), // đánh dấu hoá đơn đã xuất
  // ADR-0060 (accepted 2026-09-30): dấu "đã nhập phần mềm kế toán" + "Số hoá đơn đã nhập" (bảng chỉ-thêm bil_accounting_entry, module billing). KHÔNG dùng lại
  // invoice.issue (khác nghĩa, có Quản trị — R-K1). Ghi: Kế toán + Toàn quyền (route POST /api/orders/:id/nhap-ke-toan). Xem: MỘT ô quyết cả chi tiết đơn,
  // nhãn/lọc danh sách đơn, dòng nhật ký order_accounting_entry_* trong lịch sử đơn — bằng order.view trừ Đối tác none (Q-2 "Không"); bài ghim ⊆ order.view.
  "accounting.entry.mark": row("none", "any", "none", "none", "none", "any", "none", "none", "none", "none"),
  "accounting.entry.view": row("any", "any", "any", "assigned", "none", "any", "own", "none", "none", "none"),
  "party.view": row("any", "any", "any", "none", "none", "any", "none", "none", "none", "none"), // xem hồ sơ khách/đại lý
  "party.write": row("any", "any", "any", "none", "none", "any", "none", "none", "none", "none"), // tạo/sửa hồ sơ KHÔNG gắn tài khoản (khách, đại lý, HDV/tài xế chưa có tài khoản) — ADR-0007, ADR-0013
  "party.staff.write": row("none", "none", "any", "none", "none", "any", "none", "none", "none", "none"), // sửa hồ sơ GẮN TÀI KHOẢN (tên, liên hệ) — ADR-0013; ADMIN còn phải quản được tài khoản đó (cấp bậc, ADR-0014 điều 8: ctx.partyAccount)
  "admin.manage": row("none", "none", "any", "none", "none", "any", "none", "none", "none", "none"), // tài khoản, quyền, địa điểm, danh mục, vai trò hồ sơ, gộp hồ sơ — ADR-0014 điều 8: "cấp dưới" nằm NGOÀI MATRIX (canManageAccount)
  "admin.manage.superadmin": row("none", "none", "none", "none", "none", "any", "none", "none", "none", "none"), // gán/gỡ quyền SUPER_ADMIN của một tài khoản — thao tác MỚI (ADR-0014 điều 2/8)
  // ADR-0038 điều 6 (sửa bởi ADR-0042, ADR-0071): việc KỸ THUẬT tách khỏi admin.manage — Nhật ký chỉ Toàn quyền; đăng nhập (PIN, Face ID, mở khoá) Quản trị làm được cho cấp dưới
  // (HCNS KHÔNG — ADR-0071 điều 1e). Route vẫn hỏi admin.manage TRƯỚC (hàng rào cổng quản trị), rồi hỏi ô dưới. Đồng bộ nhân viên từ Google Sheet (staff.sheet.sync) đã GỠ HẲN (ADR-0071 điều 2).
  "account.access.manage": row("none", "none", "any", "none", "none", "any", "none", "none", "none", "none"), // đặt lại PIN, gỡ Face ID, mở khoá đăng nhập của tài khoản khác — ADR-0042: Quản trị lấy lại (vẫn chỉ cấp dưới, luật mayManage)
  // ADR-0071 điều 1b (accepted 2026-10-01): Quản lý tài khoản. TẠO tài khoản (mọi loại — nội bộ, đối tác, tài xế đối tác): chỉ HCNS (HR) + Toàn quyền — Quản trị KHÔNG.
  // XEM danh sách / SỬA (tên, SĐT, ngưng / mở lại, gán vai thường): Quản trị, HCNS, Toàn quyền. Cấp bậc (canManageAccount, src/shared/roles.ts) + luật vai (superAdminOnly,
  // LC-4) vẫn hỏi SAU ô này. Route: POST /api/staff (+ GET /api/staff/ho-so-khop của luồng tạo) hỏi account.create; GET /api/staff, PATCH /api/staff/:id,
  // GET|PUT /api/staff/:id/roles, PUT /api/staff/:id/permissions hỏi account.view / account.edit (cổng router "accounts" = ACCOUNTS_GATE).
  "account.create": row("none", "none", "none", "none", "none", "any", "none", "none", "none", "any"),
  "account.view": row("none", "none", "any", "none", "none", "any", "none", "none", "none", "any"),
  "account.edit": row("none", "none", "any", "none", "none", "any", "none", "none", "none", "any"),
  "audit.view": row("none", "none", "none", "none", "none", "any", "none", "none", "none", "none"), // xem trang Nhật ký toàn hệ thống (GET /api/audit)
  "feedback.submit": row("any", "any", "any", "any", "any", "any", "any", "any", "any", "any"), // gửi báo lỗi/đề xuất (mọi tài khoản đăng nhập)
  "feedback.view": row("own", "own", "own", "own", "own", "any", "own", "own", "own", "own"), // xem yêu cầu: chỉ của mình (ownerId = người gửi); đọc mọi yêu cầu chỉ Toàn quyền (ADR-0038)
  "feedback.triage": row("none", "none", "none", "none", "none", "any", "none", "none", "none", "none"), // tiếp nhận: đổi trạng thái/người xử lý, ghi chú nội bộ, hàng đợi — chỉ Toàn quyền (ADR-0038)
  "settings.ops": row("none", "none", "none", "none", "none", "any", "none", "none", "none", "none"), // cài đặt vận hành: chế độ bảo trì (ADR-0019); thời hạn nhận, giờ làm việc (giai đoạn 5 mô hình vai — đặc tả §5, §9)
  // hàng chờ nhận — PHẦN HẸP của đơn chưa có người phụ trách (ADR-0030 S23-1, S23-2; route GET /api/orders/pool, module orders, còn chặn tài khoản có quyền
  // Đối tác). ADMIN "none": Quản trị đã thấy đủ mọi đơn qua order.view. Nơi đón/giờ đón ở phần hẹp là NGOẠI LỆ CÓ TÊN của chú thích ô contact.view (không
  // đòi contact.view; nơi đón đã che dãy từ 8 chữ số — src/modules/orders/pool.ts).
  "order.pool.view": row("none", "none", "none", "any", "none", "any", "none", "none", "none", "none"),
  "notice.send": row("none", "none", "none", "none", "none", "any", "none", "none", "none", "none"), // gửi/thu hồi thông báo thủ công, xem ai đã hiểu — chỉ Toàn quyền (ADR-0034 điều 7)
  // ADR-0038 điều 7 + ADR-0024 6.4 (T2b): sửa định danh (tên, MST, địa chỉ), liên hệ, công việc của hồ sơ công ty chủ và ĐỔI công ty chủ (gán vai
  // "Công ty chủ" — chủ trả lời 2026-09-28) — chỉ Toàn quyền. party.write / party.staff.write / admin.manage từ chối hồ sơ này (module parties).
  "company.legal.write": row("none", "none", "none", "none", "none", "any", "none", "none", "none", "none"),
  // ADR-0040 D2 (giấy tờ của NGƯỜI — số CCCD, số bằng lái là dữ liệu cá nhân; party.view / party.write KHÔNG mở giấy tờ):
  // xem giấy tờ của CHÍNH MÌNH (số che) — mọi tài khoản nội bộ (Ruling R5: chủ trả lời 28/9 "Mọi nhân viên"), Đối tác không (Ruling R4: route cổng
  // "staff", thân route hỏi ô này với ownerId = chính người gọi). Route: GET /api/parties/documents/mine. ADR-0048 D2 (sửa ADR-0040 D2): "… mọi tài khoản nội
  // bộ VÀ tài khoản Tài xế đối tác, phạm vi của mình".
  "party.document.view": row("own", "own", "own", "own", "none", "any", "own", "own", "own", "own"),
  // ghi giấy tờ của người (thêm, gia hạn, sửa sai) + xem danh sách giấy tờ (số che) của người khác — Quản trị + Toàn quyền; Quản trị còn theo luật cấp bậc
  // khi hồ sơ gắn tài khoản (Ruling R8). Route: GET/POST /api/parties/:id/documents…, GET /api/parties/documents/meta.
  "party.document.write": row("none", "none", "any", "none", "none", "any", "none", "none", "none", "none"),
  // "xem đủ số" giấy tờ của người — Quản trị + Toàn quyền (+ cấp bậc, Ruling R8); mỗi lần xem một dòng nhật ký KHÔNG kèm số, ghi TRƯỚC khi trả số.
  // Route DUY NHẤT trả số đầy đủ: POST /api/parties/:id/documents/:did/reveal.
  "party.document.reveal": row("none", "none", "any", "none", "none", "any", "none", "none", "none", "none"),
  // ADR-0040 D1: quản lý xe, giấy tờ xe, xem danh sách giấy tờ sắp hết hạn (xe + tài xế, không số) — Quản trị + Toàn quyền (việc kinh doanh, ADR-0038
  // điều 6). Route: /api/van-chuyen/* (module van-chuyen, cổng office). Danh mục loại giấy tờ xe: admin.manage; ngưỡng sắp hết hạn: settings.ops.
  "vehicle.manage": row("none", "none", "any", "none", "none", "any", "none", "none", "none", "none"),
  // ADR-0049 D3 (Task A13): CHUYẾN XE. `trip.view` — xem lịch chung, chi tiết chuyến (văn phòng: Bán hàng, Kế toán, Quản trị, Toàn quyền; Tài xế công ty:
  // CHỈ chuyến mình đang lái — `assigned` = dòng lái mở trên chuyến, tính trong van-chuyen, route tài xế A15). NỚI bài ghim hàng DRIVER — ĐÃ DUYỆT 2026-09-30 (lần 17)
  // (đề xuất luật mục 2). `trip.dispatch` — tạo / sửa / xếp / rút / dời / huỷ chuyến, cập nhật điểm theo đơn (Bán hàng, Quản trị, Toàn quyền). `trip.override`
  // — phá lệ luật CẤU HÌNH (mốc tối thiểu, khoảng nghỉ) — chỉ Quản trị, Toàn quyền (ĐP3). Luật lõi LC-01…18 không ai phá lệ.
  "trip.view": row("any", "any", "any", "none", "none", "any", "none", "assigned", "none", "none"),
  "trip.dispatch": row("any", "none", "any", "none", "none", "any", "none", "none", "none", "none"),
  "trip.override": row("none", "none", "any", "none", "none", "any", "none", "none", "none", "none"),
  // ADR-0049 D3 (Task A15): lệnh TIẾN ĐỘ (xuất bến, đã tới, đã đón, vắng, khách huỷ, đã trả, kết thúc, kết thúc gián đoạn, đổi thứ tự điểm khi đang chạy).
  // Tài xế công ty: CHỈ chuyến mình đang lái (`assigned` — route tài xế `…/cuoc-cua-toi/*`, cổng staff). Văn phòng (Bán hàng, Quản trị, Toàn quyền) bấm thay
  // qua route RIÊNG `…/chuyen/:id/<lệnh>` (cổng office — R-P1), cùng một hàm xử lý. Kế toán: không. NỚI bài ghim hàng DRIVER — ĐÃ DUYỆT 2026-09-30 (lần 17) (đề xuất luật mục 2).
  "trip.progress": row("any", "none", "any", "none", "none", "any", "none", "assigned", "none", "none"),
  // ADR-0051 GB2 (Task A-GB): ghi / bỏ dấu "đã gọi báo khách" giờ hẹn mới của chặng đang trên xe — "đơn của ai người đó lo" (Hiến chương 5.8, ĐP6): Bán hàng
  // CHỈ đơn mình lập hoặc mình đang phụ trách (route truyền cả ownerId lẫn assigned — ctx.isAssigned của người phụ trách ĐƠN); Quản trị, Toàn quyền mọi chặng.
  // Ô riêng (không dùng lại order.trip.edit — một mã một nghĩa, R-K1); bài ghim: không rộng hơn order.trip.edit ở mọi cột.
  "trip.call_ack": row("ownOrAssigned", "none", "any", "none", "none", "any", "none", "none", "none", "none"),
  // ADR-0066 điều 1 (accepted 2026-09-30): hỏi trợ lý AI "Hỗ trợ" cách dùng app — MỌI tài khoản đăng nhập (cả 9 mã quyền). Route POST /api/tro-ly/hoi
  // (module tro-ly, cổng staff). Trợ lý không đọc dữ liệu nghiệp vụ nên ô này không mở gì ngoài kho hướng dẫn (ngoại lệ có tên ở ba bài ghim hàng tài xế / Nhân sự).
  "assistant.ask": row("any", "any", "any", "any", "any", "any", "any", "any", "any", "any"),
} as const satisfies Record<string, Row>;

export type OperationCode = keyof typeof MATRIX;

export interface PermissionHolder {
  readonly id: string;
  readonly permissions: readonly PermissionCode[];
}

/** Ngữ cảnh của một thao tác: `ownerId` = người lập đơn; `assigned` = người dùng đang được giao (N2, do gốc lắp ráp tiêm). */
export interface OperationContext {
  readonly ownerId?: string;
  readonly assigned?: boolean;
}

/**
 * ADR-0042: Toàn quyền là vai ẩn — người xem không giữ Toàn quyền thấy tài khoản Toàn quyền như Quản trị thường (SUPER_ADMIN → ADMIN,
 * bỏ trùng, giữ thứ tự chuẩn). Chỉ dùng cho dữ liệu TRẢ VỀ người khác xem; không dùng để quyết quyền.
 */
export function quyenHienThi(perms: readonly PermissionCode[], viewerSeesHidden: boolean): PermissionCode[] {
  if (viewerSeesHidden) return PERMISSION_CODES.filter((p) => perms.includes(p));
  const set = new Set<PermissionCode>(perms.map((p) => (p === "SUPER_ADMIN" ? "ADMIN" : p)));
  return PERMISSION_CODES.filter((p) => set.has(p));
}

export const hasPermission = (who: { readonly permissions: readonly PermissionCode[] }, code: PermissionCode): boolean => who.permissions.includes(code);

function allows(scope: Scope | undefined, whoId: string, ctx: OperationContext): boolean {
  const own = ctx.ownerId !== undefined && ctx.ownerId === whoId;
  switch (scope) {
    case "any":
      return true;
    case "own":
      return own;
    case "assigned":
      return ctx.assigned === true;
    case "ownOrAssigned":
      return own || ctx.assigned === true;
    default:
      return false;
  }
}

/** Người dùng được làm thao tác `op` không — hợp các ô của mọi quyền họ có. Thao tác lạ → false. */
export function can(who: PermissionHolder, op: OperationCode, ctx: OperationContext = {}): boolean {
  const cells = (MATRIX as Record<string, Row | undefined>)[op];
  if (!cells) return false;
  return who.permissions.some((p) => allows(cells[p], who.id, ctx));
}

/**
 * ADR-0019: CỔNG của router = danh sách mã quyền KHAI TƯỜNG MINH (không suy từ ô nào). Cổng chỉ LỌC THÔ; mỗi route sau cổng vẫn phải gọi `can()`
 * trong thân xử lý (hàng rào 2). Đổi danh sách = sửa `src/shared/cong-quyen.test.ts` trong cùng commit.
 */
export const ADMIN_GATE = ["ADMIN", "SUPER_ADMIN"] as const satisfies readonly PermissionCode[];
/**
 * ADR-0071 điều 1b: Quản lý tài khoản (`GET|POST /api/staff`, `GET /api/staff/ho-so-khop`, `PATCH /api/staff/:id`, `GET|PUT /api/staff/:id/roles`,
 * `PUT /api/staff/:id/permissions`) — Quản trị, Toàn quyền, Nhân sự. Mỗi mã ở đây phải có `account.view` ≠ none (bài đối chiếu ở cong-quyen.test.ts). Route hỗ
 * trợ đăng nhập (reset-pin, unlock, passkeys) GIỮ cổng "admin": Nhân sự không qua.
 */
export const ACCOUNTS_GATE = ["ADMIN", "SUPER_ADMIN", "HR"] as const satisfies readonly PermissionCode[];
/**
 * Văn phòng: Hồ sơ, danh mục `GET /api/catalog`, danh sách người được giao. KHÔNG gồm FIELD (Q3 của chủ dự án): hướng dẫn viên chỉ xem đơn mình phụ
 * trách và hàng chờ (ADR-0030 S23-1/S23-5 — ADR-0017 "FIELD xem mọi đơn" không thi công nguyên dạng).
 */
export const OFFICE_GATE = ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"] as const satisfies readonly PermissionCode[];
/**
 * Màn đơn: `/api/orders*`, Trang chủ, người phụ trách của đơn. Mỗi mã ở đây phải có `order.view` ≠ none (bài kiểm đối chiếu). FIELD vào cổng này từ ADR-0030
 * S23-5 (sửa ADR-0019 điều 1), CÙNG lần phát hành với nhánh lọc thứ ba của `GET /api/orders` và chi tiết 404 (S23-4) — mọi route sau cổng tự hỏi `can()`.
 */
export const ORDERS_GATE = ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "SUPER_ADMIN", "INTERN"] as const satisfies readonly PermissionCode[];

const holdsAny = (who: { readonly permissions: readonly PermissionCode[] }, gate: readonly PermissionCode[]): boolean => who.permissions.some((p) => gate.includes(p));
export const passesAdminGate = (who: PermissionHolder): boolean => holdsAny(who, ADMIN_GATE);
/** Qua cổng "accounts" (Quản lý tài khoản — ADR-0071). Mỗi route sau cổng vẫn tự hỏi `can(account.*)`. */
export const passesAccountsGate = (who: PermissionHolder): boolean => holdsAny(who, ACCOUNTS_GATE);
/** Qua cổng "office" (vào Hồ sơ…). KHÔNG dùng để hiện Trang chủ/Đơn hàng — dùng `seesAllOrders`. */
export const isOffice = (who: PermissionHolder): boolean => holdsAny(who, OFFICE_GATE);
/** Qua cổng "orders". Mỗi route đơn vẫn tự gọi `can()` để kiểm phạm vi. */
export const canAccessOrders = (who: PermissionHolder): boolean => holdsAny(who, ORDERS_GATE);
/** Xem được MỌI đơn (không ngữ cảnh): hiện Trang chủ, mục "Đơn hàng", ô tìm đơn; `homeRedirect` giữ người này ở Trang chủ. Là câu hỏi của BẢNG, không phải cổng. */
export const seesAllOrders = (who: PermissionHolder): boolean => can(who, "order.view");
/**
 * CHỈ xem được đơn mình ĐANG PHỤ TRÁCH (ADR-0030 S23-4): mọi ô `order.view` của các quyền người đó là `none` hoặc `assigned`, và có ít nhất một `assigned`
 * (hôm nay: đúng tài khoản chỉ-FIELD). Chi tiết đơn không được xem trả 404 CHO NGƯỜI NÀY (như đơn không tồn tại — hướng dẫn viên không dò được đơn của người
 * khác); người có ô `own` (Đối tác, Thực tập) hay `any` vẫn nhận 403 như cũ (Review Focus 2). Câu hỏi của BẢNG, không phải cổng.
 */
export const seesOnlyAssignedOrders = (who: Pick<PermissionHolder, "permissions">): boolean => {
  const cells = who.permissions.map((p) => MATRIX["order.view"][p]);
  return cells.some((c) => c === "assigned") && cells.every((c) => c === "none" || c === "assigned");
};

/**
 * Tài khoản CÓ quyền Đối tác (`PARTNER`), kể cả khi kèm quyền khác — chủ dự án chốt 2026-09-26: "Có quyền Đối tác là áp". Đường quản trị cũ
 * (`POST /api/staff` không kèm vai, `PUT /api/staff/:id/permissions`) vẫn gán được PARTNER cùng quyền nội bộ mà luật LC-1 của mô hình vai không
 * chạy; nếu chỉ xét "mọi quyền đều là PARTNER" thì tài khoản lai lọt R2/R3 (người kiểm độc lập chứng minh 26/9: PARTNER+FIELD lập đơn 1đ → 201).
 * Chỉ xét MÃ QUYỀN, không xét vai hồ sơ (vai hồ sơ không bao giờ là điều kiện — `src/CLAUDE.md`).
 * Dùng ở máy chủ (`orders/price-guards.ts`: R2 đơn giá = giá danh mục, R3 trần giảm giá) và ở form lập đơn (khoá ô đơn giá, ô giảm giá).
 */
export const holdsPartner = (who: Pick<PermissionHolder, "permissions">): boolean => who.permissions.includes("PARTNER");
