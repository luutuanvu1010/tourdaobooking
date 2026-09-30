// TỆP SINH TỰ ĐỘNG — KHÔNG SỬA TAY. Sinh lại: `node scripts/sinh-so-do-trang.mjs` (src/shared/tro-ly.test.ts đỏ nếu lệch mã).
// Sơ đồ trang cho trợ lý Hỗ trợ (ADR-0066 điều 3(c)): đường dẫn, tiêu đề, nhãn menu, nhãn nút / mục đọc từ mã giao diện. Chỉ nhãn chữ, không mã, không dữ liệu.
// Không có cột "vai thấy trang": menu dựng theo quyền bằng mã thủ tục, không suy chắc chắn được bằng đọc tĩnh — trợ lý dựa vào hướng dẫn theo vai cho việc đó.

export interface TrangSoDo {
  readonly duongDan: string;
  readonly tieuDe: string;
  /** Nhãn của mục menu trỏ tới trang (thanh bên / thanh tab); rỗng = mở từ trang khác. */
  readonly menu: readonly string[];
  /** Nhãn nút, liên kết dạng nút, tiêu đề mục trên trang. */
  readonly nut: readonly string[];
}

export const SO_DO_TRANG: readonly TrangSoDo[] = [
  {"duongDan":"/","tieuDe":"Trang chủ","menu":["Trang chủ"],"nut":["Trang chủ"]},
  {"duongDan":"/orders","tieuDe":"Đơn hàng","menu":["Đơn hàng"],"nut":["Đơn hàng","Tải thêm","+ Tạo đơn","Xoá lọc","Huỷ","Áp dụng"]},
  {"duongDan":"/order-form","tieuDe":"Tạo đơn","menu":["Tạo đơn"],"nut":["Tạo đơn","Chọn ngày","Dịch vụ","Thanh toán","Thông tin khách hàng","Tóm tắt","+ Dịch vụ nhập tay","Sử dụng thông tin của tôi","Lưu, chờ xác nhận","Quay lại","Người phụ trách","Bỏ chọn — để Chờ nhận"]},
  {"duongDan":"/order","tieuDe":"Chi tiết đơn","menu":[],"nut":["Nhận phụ trách","Thử lại","Người phụ trách","Thanh toán","Thôi","Kế toán","Ghi lần thu","Ghi","Khách hàng","Lịch sử","Xem biên nhận","Đổi khách","Sửa thông tin chuyến"]},
  {"duongDan":"/account","tieuDe":"Tôi","menu":["Tôi","Của tôi"],"nut":["Tôi","Đổi mã PIN","Đổi PIN","Đăng xuất","Danh bạ","Địa điểm","Loại giấy tờ người","Nhật ký","Gửi thông báo","Góp ý / Báo lỗi","Trợ giúp","Giấy tờ của tôi","Xác nhận bằng Face ID","Gỡ","Gỡ tất cả","Đăng nhập bằng Face ID","Bật trên máy này","Thông báo trên điện thoại","Tắt","Bật thông báo trên điện thoại","Chế độ bảo trì"]},
  {"duongDan":"/catalog","tieuDe":"Dịch vụ","menu":["Dịch vụ","Dịch vụ & giá"],"nut":["Danh mục dịch vụ & giá","Đồng bộ ngay từ Google Sheet","Bỏ chọn","Thêm nhóm","Nhóm dịch vụ","Lưu ghi đè","Đóng","Đổi nhóm","Lịch sử nhóm"]},
  {"duongDan":"/staff","tieuDe":"Quản lý tài khoản","menu":["Tài khoản","Quản lý tài khoản"],"nut":["Quản lý tài khoản","Thêm tài khoản","Tạo tài khoản","Đồng bộ danh sách từ Google Sheet…","Sao chép danh sách","Đã ghi lại, ẩn đi","Lưu","Đóng","Vai và quyền","Tạo tài khoản cho người đã chọn","Xem trước dữ liệu từ Google Sheet","Đã có tài khoản"]},
  {"duongDan":"/audit","tieuDe":"Nhật ký","menu":["Nhật ký"],"nut":["Nhật ký hệ thống","Tải thêm"]},
  {"duongDan":"/parties","tieuDe":"Danh bạ","menu":["Danh bạ"],"nut":["Danh bạ","Tìm","+ Hồ sơ mới","Xem thêm","Tạo hồ sơ","Hồ sơ mới","Liên hệ","Công việc tại đâu","Người liên hệ, tài xế","Giấy tờ"]},
  {"duongDan":"/locations","tieuDe":"Địa điểm","menu":["Địa điểm"],"nut":["Địa điểm","Thêm địa điểm","Thêm","Sửa","Lưu","Đóng"]},
  {"duongDan":"/feedback","tieuDe":"Góp ý","menu":["Góp ý / Báo lỗi"],"nut":["Góp ý / Báo lỗi","Gửi yêu cầu mới","Gửi","Huỷ","Yêu cầu của tôi","Hàng đợi","+ Gửi yêu cầu mới","← Quay lại","← Danh sách"]},
  {"duongDan":"/help","tieuDe":"Trợ giúp","menu":["Trợ giúp"],"nut":["Trợ giúp","Hướng dẫn cho bạn","Nhật ký thay đổi","Cần hỗ trợ?","Góp ý / Báo lỗi"]},
  {"duongDan":"/gui-thong-bao","tieuDe":"Gửi thông báo","menu":["Gửi thông báo"],"nut":["Gửi thông báo","Đã gửi","Thu hồi","Giữ lại","Soạn tin"]},
  {"duongDan":"/tai-xe","tieuDe":"Trang chủ","menu":["Trang chủ"],"nut":["Giấy tờ của tôi"]},
  {"duongDan":"/xe","tieuDe":"Xe","menu":["Xe"],"nut":["Xe","Thêm xe"]},
  {"duongDan":"/xe-sua","tieuDe":"Thêm xe","menu":[],"nut":["Thêm xe","Dùng lại xe","Ngừng dùng xe","Giữ nguyên","Ngừng dùng"]},
  {"duongDan":"/xe-chi-tiet","tieuDe":"Chi tiết xe","menu":[],"nut":["Giấy tờ xe","Thêm giấy tờ","Sửa thông tin xe"]},
  {"duongDan":"/giay-to-sap-het-han","tieuDe":"Giấy tờ sắp hết hạn","menu":["Sắp hết hạn"],"nut":["Giấy tờ sắp hết hạn"]},
  {"duongDan":"/loai-giay-to-xe","tieuDe":"Loại giấy tờ xe","menu":["Loại giấy tờ xe"],"nut":["Loại giấy tờ xe"]},
  {"duongDan":"/loai-giay-to-nguoi","tieuDe":"Loại giấy tờ người","menu":["Loại giấy tờ người"],"nut":["Loại giấy tờ người"]},
  {"duongDan":"/chinh-sach-dieu-phoi","tieuDe":"Chính sách điều phối","menu":["Chính sách điều phối"],"nut":["Chính sách điều phối","Lịch sử bản","Đóng","Điều kiện theo cỡ xe, hạng bằng ›","Lưu thành bản mới"]},
  {"duongDan":"/ly-do-dieu-phoi","tieuDe":"Lý do điều phối","menu":["Lý do điều phối"],"nut":["Lý do điều phối","Thêm","Đóng","Lưu"]},
  {"duongDan":"/dieu-kien-xuat-ben","tieuDe":"Điều kiện xuất bến","menu":[],"nut":["Điều kiện xuất bến","Thêm điều kiện","Điều kiện theo cỡ xe","Lưu","Đóng","Số khách theo hạng bằng"]},
  {"duongDan":"/chuyen-sua","tieuDe":"Chuyến mới","menu":[],"nut":["Chuyến mới","Lưu chuyến","Huỷ bỏ"]},
  {"duongDan":"/chuyen","tieuDe":"Chi tiết chuyến","menu":[],"nut":["Cập nhật điểm theo đơn","Điểm dừng","Điều kiện xuất bến","Bản chụp lúc xuất bến","Nhật ký chuyến","Sửa chuyến","Kết thúc chuyến","Kết thúc gián đoạn","Khách trong chuyến","Rút khỏi xe","Chuyển sang xe khác","Đóng"]},
  {"duongDan":"/dieu-phoi","tieuDe":"Điều phối xe","menu":["Điều phối xe"],"nut":["Điều phối xe","+ Chuyến mới","Dòng thời gian theo xe","Cập nhật điểm theo đơn","Bỏ đánh dấu","Xếp vào chuyến","Đóng"]},
  {"duongDan":"/cuoc","tieuDe":"Cuốc của tôi","menu":["Cuốc của tôi"],"nut":["Cuốc của tôi"]},
  {"duongDan":"/cuoc-chuyen","tieuDe":"Chuyến của tôi","menu":[],"nut":["Kết thúc chuyến","Kết thúc gián đoạn","Bấm lại","Đóng","Điều kiện xuất bến","Xuất bến"]},
];
