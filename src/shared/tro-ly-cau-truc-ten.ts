// BẢNG TÊN LỜI THƯỜNG cho kho (d) "cấu trúc app" của trợ lý Hỗ trợ (ADR-0070 điều 1). VIẾT TAY — một nơi duy nhất dịch mã kỹ thuật sang lời thường.
// Bộ sinh `scripts/sinh-so-do-trang.mjs` đọc bảng này cùng `ALLOWED_EDGES` (src/architecture.test.ts), `MATRIX` (src/shared/permissions.ts), `PAGES` và
// bố cục trang, rồi sinh `src/shared/tro-ly-cau-truc.ts`. Thêm module hoặc ô quyền mà thiếu tên ở đây ⇒ bộ sinh NÉM LỖI ⇒ `npm run build:web` và `npm test` đỏ.
// Tên thừa (module / ô không còn trong mã) cũng ném lỗi.
//
// LUẬT VIẾT (chữ ở đây được gửi sang OpenAI): lời thường cho NGƯỜI DÙNG, không tên bảng / cột / hàm / tệp / đường dẫn API, không máy chủ, hạ tầng, không số
// tiền, SĐT, email. Bộ sinh chạy `viPhamChu` (src/shared/huong-dan.ts) + `viPhamKyThuat` (src/shared/tro-ly-loc-ky-thuat.ts) trên mọi chữ sinh ra và ném lỗi
// khi vi phạm. Chỉ ghi điều người dùng THẤY được; khoá (mã module, mã ô) ở bên trái KHÔNG BAO GIỜ đi ra ngoài.
// Nguồn tham khảo khi soạn: docs/so-do-kien-truc/README.md (KHÔNG gửi nguyên văn — ADR-0070 điều 1).
import type { OperationCode, PermissionCode } from "./permissions.ts";

export interface TenLoiThuong {
  /** Tên ngắn (dùng trong câu "Dựa vào: …", danh sách vai làm được). */
  readonly ten: string;
  /** Một hai câu: lo việc gì, người dùng thấy nó ở đâu. */
  readonly moTa: string;
}

/** Mỗi module của `src/modules/*` và mỗi nút của `ALLOWED_EDGES` (kể cả phân hệ đã khai ranh giới mà chưa có thư mục). */
export const TEN_PHAN_HE: Readonly<Record<string, TenLoiThuong>> = {
  accounts: { ten: "Quản lý tài khoản", moTa: "Tạo tài khoản đăng nhập cho nhân viên, đối tác, tài xế (Hành chính nhân sự hoặc người phụ trách hệ thống); gán vai; ngưng tài khoản khi nghỉ việc; đặt lại PIN, gỡ Face ID, mở khoá (Quản trị). Làm ở trang Quản lý tài khoản." },
  audit: { ten: "Nhật ký", moTa: "Ghi dấu vết ai làm gì, lúc nào, cho mọi thay đổi quan trọng của mọi phân hệ. Lịch sử của một đơn lấy từ đây; trang Nhật ký toàn hệ thống chỉ Toàn quyền xem." },
  auth: { ten: "Đăng nhập", moTa: "Đăng nhập bằng số điện thoại và mã PIN hoặc Face ID, giữ phiên đăng nhập, tạm khoá khi nhập sai nhiều lần." },
  bangtin: { ten: "Bảng tin", moTa: "Báo tức thì cho mọi màn hình đang mở khi một đơn vừa đổi, nên danh sách đơn tự cập nhật mà không cần tải lại trang." },
  billing: { ten: "Sổ tiền", moTa: "Ghi các lần thu tiền của đơn, bấm Đã giao và Hoàn thành, sổ công nợ của từng người và công ty, ghi hoàn tiền cho khách." },
  catalog: { ten: "Dịch vụ và giá", moTa: "Danh mục dịch vụ tour và bảng giá, đồng bộ từ bảng tính Google của công ty; người lập đơn chọn dịch vụ từ danh mục này." },
  company: { ten: "Thông tin công ty", moTa: "Tên, mã số thuế, địa chỉ, đường dây nóng của Tour Đảo, hiện trên biên nhận gửi khách và trang đăng nhập." },
  dispatch: { ten: "Người phụ trách đơn", moTa: "Giao, nhận, đổi người phụ trách một đơn; hàng chờ nhận cho đơn chưa có ai phụ trách; hướng dẫn viên huỷ hoặc sửa số khách đơn mình phụ trách." },
  feedback: { ten: "Góp ý / Báo lỗi", moTa: "Mọi tài khoản gửi góp ý hoặc báo lỗi và theo dõi yêu cầu của mình; Toàn quyền tiếp nhận và trả lời." },
  "giao-dien": { ten: "Giao diện công ty", moTa: "Màu thanh trên, màu nút chính, phông chữ và cỡ chữ chung cho cả công ty; chỉ người phụ trách hệ thống chỉnh, ai cũng thấy kết quả. Có kiểm chữ đủ dễ đọc trước khi lưu và ghi nhật ký mỗi lần đổi." },
  "lan-gui": { ten: "Chống ghi trùng", moTa: "Khi mạng chập chờn mà bấm Lưu lại, Nền tảng nhận ra lần bấm trước đã được ghi nên không ghi thêm lần nữa, và báo \"Lần bấm trước đã được ghi\". Chạy ngầm cho mọi thao tác lưu, không có màn hình riêng." },
  locations: { ten: "Địa điểm", moTa: "Danh sách nơi đón, nơi trả dùng chung khi lập đơn và xếp chuyến; Quản trị thêm, sửa ở trang Địa điểm." },
  maintenance: { ten: "Chế độ bảo trì", moTa: "Khi bật, chỉ người phụ trách hệ thống còn dùng được app; mọi người khác, kể cả Quản trị, thấy màn hình bảo trì. Chỉ người phụ trách hệ thống bật, tắt." },
  orders: { ten: "Đơn hàng", moTa: "Lập, sửa, xác nhận, huỷ đơn; dịch vụ của đơn, chặng đưa đón (giờ, nơi đón), danh sách hành khách. Tiền của đơn do app tự tính từ giá danh mục và số khách." },
  parties: { ten: "Danh bạ", moTa: "Hồ sơ khách, đại lý, nhân viên, hướng dẫn viên, tài xế, nhà xe đối tác và công ty chủ; liên hệ, công việc, giấy tờ của người (số giấy tờ luôn bị che)." },
  pricing: { ten: "Chính sách giá", moTa: "Chiết khấu, hoa hồng theo ngày — đang chuẩn bị, app chưa dùng." },
  receipt: { ten: "Biên nhận", moTa: "Dựng ảnh biên nhận gửi khách từ đơn, số tiền đã trả, còn lại và thông tin công ty." },
  staff: { ten: "Tài khoản nhân viên", moTa: "Giữ tài khoản và các quyền của từng người; tên hiển thị lấy từ hồ sơ trong Danh bạ." },
  thongbao: { ten: "Thông báo", moTa: "Hình chuông ở đầu trang, dải tin quan trọng phải bấm Đã hiểu, thông báo trên điện thoại; Toàn quyền gửi thông báo thủ công." },
  "tro-ly": { ten: "Trợ lý Hỗ trợ", moTa: "Trả lời cách dùng app dựa trên hướng dẫn và sơ đồ app; không xem được dữ liệu thật. Toàn quyền bật, tắt theo vai ở trang Trợ lý Hỗ trợ." },
  "van-chuyen": { ten: "Vận chuyển", moTa: "Xe, giấy tờ xe, tài xế và bảng Điều phối xe: xếp khách của nhiều đơn lên một chuyến, tài xế bấm tiến độ. Có Lịch xe bận cho xe vào xưởng." },
};

/**
 * Lý do một phân hệ dựa vào phân hệ khác (khoá "<phân hệ>><phân hệ được dựa vào>", tuỳ chọn). Khoá phải là cạnh có thật trong `ALLOWED_EDGES`, không thì bộ
 * sinh ném lỗi (cạnh đã bỏ mà lý do còn = chữ sai).
 */
export const LY_DO_PHU_THUOC: Readonly<Record<string, string>> = {
  "van-chuyen>orders": "lấy khách và chặng đưa đón từ đơn đã xác nhận",
  "van-chuyen>parties": "lấy tài xế, nhà xe và giấy tờ của tài xế",
  "van-chuyen>locations": "điểm đón, điểm trả của chuyến",
  "dispatch>orders": "người phụ trách gắn với một đơn",
  "orders>catalog": "đơn chọn dịch vụ và giá từ danh mục",
  "orders>parties": "khách của đơn là một hồ sơ trong Danh bạ",
  "orders>locations": "nơi đón, nơi trả của chặng",
  "billing>orders": "lần thu tiền gắn với một đơn",
  "receipt>orders": "biên nhận lấy dịch vụ và khách từ đơn",
  "receipt>billing": "biên nhận lấy số đã trả, còn lại từ sổ tiền",
  "thongbao>orders": "tin báo khi đơn được xác nhận, giao, nhận, huỷ",
  "auth>maintenance": "đang bảo trì thì chặn đăng nhập",
};

/**
 * Mỗi ô quyền của `MATRIX`. `ten` dùng trong danh sách "vai làm được / không làm được" nên viết như một việc ("xác nhận, sửa, huỷ đơn").
 * Kiểu `Record<OperationCode, …>` nên `tsc` cũng bắt thiếu; bộ sinh bắt lần nữa (và bắt tên thừa).
 */
export const TEN_THAO_TAC: Readonly<Record<OperationCode, TenLoiThuong>> = {
  "order.view": { ten: "xem đơn", moTa: "Mở danh sách đơn và trang chi tiết đơn." },
  "money.view": { ten: "xem tiền của đơn", moTa: "Thấy thành tiền, tổng, đã trả, còn lại của đơn và giá trong danh mục." },
  "order.history.view": { ten: "xem lịch sử sửa đơn", moTa: "Xem ai đã sửa đơn, lúc nào." },
  "contact.view": { ten: "xem liên hệ khách", moTa: "Thấy tên, số điện thoại khách, nơi đón, giờ đón và danh sách hành khách của đơn." },
  "order.create": { ten: "lập đơn mới", moTa: "Dùng trang Tạo đơn; đơn mới là của người lập." },
  "order.modify": { ten: "sửa, xác nhận, huỷ đơn", moTa: "Sửa đơn đang chờ xác nhận, bấm Xác nhận đơn, huỷ đơn." },
  "order.trip.edit": { ten: "sửa thông tin chuyến sau xác nhận", moTa: "Sửa giờ đón, nơi đón, ghi chú của đơn đã xác nhận." },
  "order.leg.short_notice": { ten: "duyệt Đặt gấp", moTa: "Cho phép xác nhận chặng có giờ đón cách hiện tại dưới mốc 6 giờ, kèm lý do." },
  "order.leg.short_notice.view": { ten: "xem chi tiết dấu Đặt gấp", moTa: "Thấy lý do, người duyệt và lúc duyệt Đặt gấp của chặng." },
  "order.passenger.write": { ten: "nhập danh sách hành khách", moTa: "Thêm, sửa, huỷ dòng họ tên và năm sinh hành khách của đơn." },
  "order.service.manual": { ten: "thêm dịch vụ nhập tay", moTa: "Gõ tên và giá một dịch vụ không có trong danh mục, khi Toàn quyền đang bật Dịch vụ nhập tay." },
  "task.progress": { ten: "cập nhật tiến độ việc được giao", moTa: "Báo tiến độ việc được giao trên đơn." },
  "order.money.edit": { ten: "sửa số khách sau xác nhận", moTa: "Hướng dẫn viên đang phụ trách sửa số khách của đơn đã xác nhận, tới hết ngày đi, kèm lý do; app ghi thành dòng điều chỉnh." },
  "order.cancel": { ten: "huỷ đơn mình phụ trách theo quyền hướng dẫn viên (kèm lý do)", moTa: "Hướng dẫn viên huỷ đơn mình đang phụ trách (đơn đã xác nhận, trước ngày đi), luôn kèm lý do. Người lập đơn huỷ đơn bằng việc sửa, xác nhận, huỷ đơn." },
  "dispatch.assign": { ten: "giao, đổi người phụ trách", moTa: "Chọn hoặc đổi người phụ trách một đơn." },
  "dispatch.claim": { ten: "nhận đơn đang chờ", moTa: "Bấm nhận phụ trách một đơn chưa có người phụ trách." },
  "dispatch.guides.view": { ten: "xem danh sách hướng dẫn viên", moTa: "Danh sách hẹp các hướng dẫn viên nội bộ." },
  "payment.receive": { ten: "ghi lần thu tiền", moTa: "Ghi số tiền khách đã trả cho đơn ở mục Thanh toán của trang đơn." },
  "payment.refund": { ten: "ghi hoàn tiền cho khách", moTa: "Ghi khoản trả lại khách trong sổ." },
  "order.handover": { ten: "bấm Đã giao (đã thu đủ)", moTa: "Báo đơn đã phục vụ xong và đã thu đủ tiền." },
  "order.complete": { ten: "bấm Hoàn thành", moTa: "Kế toán chốt đơn sau khi đối chiếu tiền." },
  "ledger.view": { ten: "xem sổ công nợ", moTa: "Xem sổ của mình, hoặc sổ mọi người và công ty." },
  "ledger.write": { ten: "ghi sổ công nợ", moTa: "Xác nhận công ty đã nhận tiền, ghi nộp, trả, điều chỉnh, đảo dòng sổ." },
  "invoice.request": { ten: "yêu cầu xuất hoá đơn", moTa: "Ghi yêu cầu và thông tin xuất hoá đơn." },
  "invoice.issue": { ten: "đánh dấu đã xuất hoá đơn", moTa: "Ghi hoá đơn đã xuất." },
  "accounting.entry.mark": { ten: "đánh dấu đã nhập phần mềm kế toán", moTa: "Ghi đơn đã nhập vào phần mềm kế toán và số hoá đơn đã nhập." },
  "accounting.entry.view": { ten: "xem dấu đã nhập phần mềm kế toán", moTa: "Thấy nhãn đã nhập phần mềm kế toán trên đơn." },
  "party.view": { ten: "xem Danh bạ", moTa: "Xem hồ sơ khách, đại lý và người trong Danh bạ." },
  "party.write": { ten: "thêm, sửa hồ sơ trong Danh bạ", moTa: "Tạo, sửa hồ sơ khách, đại lý, người chưa có tài khoản." },
  "party.staff.write": { ten: "sửa hồ sơ người có tài khoản", moTa: "Sửa tên, liên hệ của hồ sơ gắn với một tài khoản." },
  "admin.manage": { ten: "quản trị danh mục", moTa: "Quản lý địa điểm, dịch vụ và giá, các danh mục cài đặt, vai trong Danh bạ." },
  "admin.manage.superadmin": { ten: "gán, gỡ quyền Toàn quyền", moTa: "Cấp hoặc bỏ quyền Toàn quyền của một tài khoản." },
  "account.access.manage": { ten: "đặt lại PIN, gỡ Face ID, mở khoá", moTa: "Giúp tài khoản khác đăng nhập lại." },
  "account.create": { ten: "thêm tài khoản", moTa: "Tạo tài khoản mới (nhân viên, đối tác, tài xế đối tác) ở trang Quản lý tài khoản." },
  "account.view": { ten: "xem danh sách tài khoản", moTa: "Mở trang Quản lý tài khoản." },
  "account.edit": { ten: "sửa tài khoản", moTa: "Sửa tên, số điện thoại, ngưng hoặc mở lại, gán vai cho tài khoản cấp dưới." },
  "audit.view": { ten: "xem trang Nhật ký", moTa: "Xem nhật ký toàn hệ thống." },
  "feedback.submit": { ten: "gửi góp ý, báo lỗi", moTa: "Gửi góp ý hoặc báo lỗi từ mục Góp ý / Báo lỗi." },
  "feedback.view": { ten: "xem góp ý", moTa: "Xem yêu cầu góp ý mình đã gửi (Toàn quyền xem mọi yêu cầu)." },
  "feedback.triage": { ten: "tiếp nhận góp ý", moTa: "Đổi trạng thái, người xử lý, ghi chú nội bộ cho góp ý." },
  "settings.ops": { ten: "cài đặt vận hành", moTa: "Bảo trì, chính sách điều phối, trợ lý Hỗ trợ và các cài đặt chung." },
  "order.pool.view": { ten: "xem hàng chờ nhận", moTa: "Xem các đơn chưa có người phụ trách để bấm nhận." },
  "notice.send": { ten: "gửi thông báo thủ công", moTa: "Gửi, thu hồi thông báo và xem ai đã bấm Đã hiểu." },
  "company.legal.write": { ten: "sửa thông tin công ty chủ", moTa: "Sửa tên, mã số thuế, địa chỉ, liên hệ của công ty chủ hoặc đổi công ty chủ." },
  "party.document.view": { ten: "xem giấy tờ của mình", moTa: "Xem giấy tờ của chính mình ở trang Tôi (số bị che)." },
  "party.document.write": { ten: "ghi giấy tờ của người", moTa: "Thêm, gia hạn, sửa sai giấy tờ của người và xem danh sách giấy tờ (số bị che)." },
  "party.document.reveal": { ten: "xem đủ số giấy tờ", moTa: "Bấm Xem đủ số; mỗi lần xem được ghi lại." },
  "vehicle.manage": { ten: "quản lý xe và giấy tờ xe", moTa: "Thêm, sửa xe, giấy tờ xe, xem danh sách sắp hết hạn." },
  "transport.rate.view": { ten: "xem bảng giá thuê xe", moTa: "Xem giá thuê xe theo chuyến của từng nhà xe." },
  "transport.rate.manage": { ten: "nhập bảng giá thuê xe", moTa: "Thêm, kết thúc giá thuê xe; sửa danh mục tuyến và cỡ xe." },
  "transport.cost.view": { ten: "xem chi phí xe thuê", moTa: "Xem chi phí từng chuyến xe thuê và bảng kê chi phí theo nhà xe." },
  "transport.cost.adjust": { ten: "sửa chi phí xe thuê", moTa: "Nhập giá thoả thuận, lấy lại giá bảng, điều chỉnh hoặc đảo chi phí chuyến xe thuê." },
  "trip.view": { ten: "xem chuyến xe", moTa: "Xem bảng Điều phối xe và chi tiết chuyến (tài xế: chỉ chuyến mình lái)." },
  "trip.dispatch": { ten: "tạo, xếp, sửa, huỷ chuyến", moTa: "Tạo chuyến, xếp khách lên chuyến, rút, dời, huỷ chuyến." },
  "trip.override": { ten: "phá lệ khi điều xe", moTa: "Cho chuyến đi dù vướng luật cấu hình như mốc tối thiểu, khoảng nghỉ, kèm lý do." },
  "trip.progress": { ten: "bấm tiến độ chuyến", moTa: "Xuất bến, đã đón, đã trả, kết thúc chuyến (văn phòng bấm thay được)." },
  "trip.call_ack": { ten: "ghi đã gọi báo khách", moTa: "Đánh dấu đã gọi báo khách giờ hẹn mới của chặng." },
  "trip.passenger.add": { ten: "tài xế bổ sung tên khách", moTa: "Tài xế nhập họ tên, năm sinh cho khách chưa có tên trên chuyến mình đang lái, trong ngày chạy." },
  "assistant.ask": { ten: "hỏi trợ lý Hỗ trợ", moTa: "Hỏi cách dùng app qua nút Hỗ trợ." },
  "auth.session.viewAll": { ten: "xem phiên đăng nhập của mọi người", moTa: "Xem ai đang đăng nhập trên máy nào, lúc nào, bằng cách nào." },
  "auth.session.revoke": { ten: "gỡ phiên đăng nhập", moTa: "Đăng xuất ngay một máy đang đăng nhập của tài khoản khác." },
  "auth.session.policy": { ten: "đặt chính sách đăng nhập", moTa: "Chọn quyền nào chỉ đăng nhập một máy, quyền nào được nhiều máy." },
};

/**
 * Ô HẸP (kiểm độc lập 1/10, I-1, I-2): ô mà bảng quyền ghi RỘNG hơn điều máy chủ thực sự cho hôm nay. Kho chỉ tính các vai trong `chiVai` (giữ phạm vi của
 * bảng); vai khác coi như "không làm được". `lyDo` chỉ để người đọc mã (không gửi đi). Bộ sinh ném lỗi nếu ô không còn, hoặc `chiVai` có vai mà bảng ghi
 * "none" (ô hẹp chỉ được THU HẸP, không được mở rộng). Khi route rộng được làm: xoá dòng ở đây trong cùng commit.
 */
export const O_HEP: Readonly<Partial<Record<OperationCode, { readonly chiVai: readonly PermissionCode[]; readonly lyDo: string }>>> = {
  "order.money.edit": {
    chiVai: ["FIELD", "SUPER_ADMIN"],
    lyDo: "Route duy nhất hỏi ô này là POST /api/orders/:id/handler-money-edit (module dispatch): chỉ quyền có ô CHÍNH XÁC 'assigned' và đang được giao, cộng Toàn quyền. Ô 'own'/'any' của Bán hàng, Kế toán, Quản trị dành cho route khác CHƯA làm.",
  },
  "order.service.manual": {
    chiVai: ["SALES", "ADMIN", "SUPER_ADMIN"],
    lyDo: "permissions.ts: ô 'any' của Kế toán CHƯA có tác dụng — Kế toán không lập / sửa đơn (order.create, order.modify = none); chờ việc C2.",
  },
};

/** Một bước của luồng chính (ADR-0070 điều 1: đơn → xác nhận → phụ trách → xếp xe → tiền → hoàn tất). */
export interface BuocLuong {
  readonly ten: string;
  /** Bước này là gì, lời thường. */
  readonly moTa: string;
  /** Vì sao bước này phải đứng trước bước sau / vì sao hay bị chặn. */
  readonly viSao: string;
  /** Ô quyền quyết định ai làm được bước này — bộ sinh tính "Ai làm được" từ `MATRIX`. Ô chưa có máy chủ hỏi ⇒ bộ sinh ném lỗi. */
  readonly thaoTac: readonly OperationCode[];
  /** Trang làm bước này (đường dẫn trong `PAGES`) — bộ sinh gắn tiêu đề trang, nhóm menu. Trang không còn ⇒ ném lỗi. */
  readonly trang?: string;
  /** Mục trên trang (tiêu đề mục trong bố cục, hoặc "Thanh nút cuối trang") — bộ sinh gắn các nút THẬT của mục đó. Mục không còn ⇒ ném lỗi. */
  readonly muc?: string;
}

export const LUONG_CHINH: readonly BuocLuong[] = [
  {
    ten: "Lập đơn và lưu nháp",
    moTa: "Người lập chọn ngày, dịch vụ, khách rồi bấm nút lưu ở cuối biểu mẫu. Đơn vừa lưu là đơn nháp, trạng thái Chờ xác nhận: lưu nháp được cả khi chưa đủ thông tin, sửa thoải mái.",
    viSao: "Đơn nháp chưa báo ai và chưa khoá gì, để người lập sửa cho đúng trước khi chốt.",
    thaoTac: ["order.create"],
    trang: "/order-form",
    muc: "Thanh nút cuối trang",
  },
  {
    ten: "Xác nhận đơn",
    moTa: "Trên trang đơn bấm Xác nhận đơn. Sau khi xác nhận, dịch vụ, số khách và tiền bị khoá với người lập đơn, chỉ còn sửa được thông tin chuyến; riêng hướng dẫn viên đang phụ trách vẫn sửa được số khách tới hết ngày đi.",
    viSao: "Xác nhận là lúc chốt với khách: từ đây app mới báo cho người liên quan, và chỉ đơn đã xác nhận mới xếp lên chuyến xe. Không xác nhận được thường vì: tài khoản không phải người lập hay người phụ trách đơn (hoặc vai không có quyền sửa đơn); giờ đón cách hiện tại dưới 6 giờ mà Quản trị chưa duyệt Đặt gấp; đơn đã huỷ.",
    thaoTac: ["order.modify", "order.leg.short_notice"],
    trang: "/order",
  },
  {
    ten: "Người phụ trách",
    moTa: "Mỗi đơn có một người phụ trách lo đơn tới ngày đi. Người lập chọn ngay khi lập, hoặc đơn nằm ở hàng chờ để hướng dẫn viên, nhân viên bấm nhận.",
    viSao: "Có người phụ trách thì đơn có người lo; hướng dẫn viên chỉ thấy đơn khi đang là người phụ trách.",
    thaoTac: ["dispatch.assign", "dispatch.claim"],
  },
  {
    ten: "Xếp xe",
    moTa: "Ở bảng Điều phối xe, khách của nhiều đơn đã xác nhận được xếp lên một chuyến; tài xế bấm tiến độ.",
    viSao: "Chỉ đơn đã xác nhận mới xếp lên chuyến, vì trước đó giờ đón, số khách còn đổi. Chuyến chỉ xuất bến khi đủ điều kiện (giấy tờ xe còn hạn, bằng lái đúng hạng, đủ tên khách, đủ chỗ).",
    thaoTac: ["trip.dispatch", "trip.progress"],
    trang: "/dieu-phoi",
  },
  {
    ten: "Thu tiền",
    moTa: "Tiền của đơn do app tự tính. Mỗi lần khách trả tiền thì ghi một lần thu ở mục Thanh toán của trang đơn; Kế toán ghi sổ công nợ.",
    viSao: "Không ai gõ tay được tổng tiền, để số trên biên nhận luôn khớp giá danh mục và số khách.",
    thaoTac: ["payment.receive", "ledger.write"],
  },
  {
    ten: "Đã giao và Hoàn thành",
    moTa: "Phục vụ xong và thu đủ thì bấm Đã giao; Kế toán đối chiếu tiền rồi bấm Hoàn thành.",
    viSao: "Đã giao đứng trước Hoàn thành để người đi tour báo xong trước, Kế toán chốt sau khi đối chiếu.",
    thaoTac: ["order.handover", "order.complete"],
  },
];
