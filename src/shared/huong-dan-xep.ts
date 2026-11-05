// Xếp các mục Hướng dẫn theo vai vào nhóm việc cho danh sách ở thẻ Hướng dẫn (bản vẽ A). Thuần. Mỗi mục đúng một chỗ: huong-dan-bai.test.ts đỏ nếu thiếu hay thừa.
// Dạng: tên nhóm việc → [tên mục, màn của mục]. Màn là khoá TRANG (máy điền dòng «Ở …»), `DON` là trang đơn, null là không gắn màn nào.
import type { KhoaTrang } from "./muc-giao-dien.ts";

export const DON = "don";
export type NoiMuc = KhoaTrang | typeof DON | null;
export type XepNhom = Readonly<Record<string, readonly (readonly [string, NoiMuc])[]>>;

const VUONG = (...ten: string[]): readonly (readonly [string, NoiMuc])[] => ten.map((t) => [t, null] as const);

export const XEP: Readonly<Record<string, XepNhom>> = {
  chung: {
    "Cho mọi người": [
      ["Đăng nhập", null], ["Đăng nhập bằng Face ID", "toi"], ["Cài Nền tảng lên iPhone", null], ["Bật thông báo trên điện thoại", "toi"],
      ["Chuông thông báo và Bảng tin", null], ["Trang Tôi, đổi PIN, đăng xuất", "toi"], ["Mỗi tài khoản một máy", null], ["Hướng dẫn và Hỗ trợ", "gopY"],
      ["Hỏi trợ lý Hỗ trợ", null], ["Khi Nền tảng đang bảo trì", null], ["Câu hỏi thường gặp", null],
    ],
  },
  "ban-hang": {
    "Bắt đầu": [["Menu của bạn", null], ["Danh sách đơn và Trang chủ", "donHang"], ["Thông báo", null]],
    "Đơn hàng": [
      ["Lập đơn mới", "taoDon"], ["Sửa đơn chưa xác nhận", DON], ["Xác nhận đơn", DON], ["Người phụ trách đơn", DON],
      ["Đơn của đối tác chờ xác nhận: kiểm vé", "choXacNhan"],
    ],
    "Gửi cho khách": [["Gửi ảnh biên nhận cho khách", DON]],
    "Xe và dịch vụ": [["Điều phối xe", "dieuPhoi"], ["Luật bán và đặc điểm dịch vụ", "luatBan"]],
    "Khi vướng": VUONG("Tình huống hay gặp", "Thực tập — khác Bán hàng ở đâu", "Điều bạn không làm được — hỏi ai", "Câu hỏi thường gặp"),
  },
  hdv: {
    "Bắt đầu": [["Menu của bạn", null], ["Thông báo", null]],
    "Đơn của tôi": [
      ["Nhận một đơn đang chờ", "donHang"], ["Xem và lo đơn của mình", "donHang"], ["Sửa số khách", DON], ["Huỷ đơn", DON], ["Trả đơn (Từ chối)", DON],
      ["Thu tiền và bấm Xác nhận đã thu đủ sau dịch vụ", DON], ["Đơn của đối tác chờ xác nhận: kiểm vé", "choXacNhan"],
    ],
    "Khi vướng": VUONG("Tình huống hay gặp", "Điều bạn không làm được — hỏi ai", "Câu hỏi thường gặp"),
    "Bảo mật": [["Bật bảo mật hai lớp", "toi"], ["Nhận mã đăng nhập qua email", "toi"]],
  },
  "ke-toan": {
    "Bắt đầu": [["Menu của bạn", null], ["Xem tình hình chung ở Trang chủ", "trangChu"]],
    "Đơn và tiền": [
      ["Tìm và lọc đơn", "donHang"], ["Xem tiền của một đơn", DON], ["Sửa số khách đơn đã xác nhận", DON], ["Mở biên nhận để gửi khách", DON],
      ["Đơn của đối tác chờ xác nhận: kiểm vé", "choXacNhan"],
    ],
    "Sổ và hoa hồng": [
      ["Đặt mức hoa hồng cho đối tác", "hoaHong"], ["Thêm vai trò", "hoaHong"], ["Cấp độ đại lý", "hoaHong"], ["Chụp bù, ghi mức tay cho một đơn", "chupBu"],
      ["Khoá sổ tháng", "soCongNo"], ["Điều chỉnh công nợ (cần người khác duyệt)", "dieuChinhCongNo"],
    ],
    "Khác": [["Xem Điều phối xe (chỉ xem)", "dieuPhoi"], ["Danh bạ", "danhBa"]],
    "Khi vướng": VUONG("Tình huống hay gặp", "Điều bạn không làm được — hỏi ai", "Câu hỏi thường gặp"),
  },
  "doi-tac": {
    "Bắt đầu": [["Menu của bạn", null], ["Đăng nhập và đổi mã PIN", "toi"]],
    "Đơn của tôi": [
      ["Lập đơn cho khách", "taoDon"], ["Sửa đơn nháp", DON], ["Xác nhận đơn", DON], ["Gửi biên nhận cho khách", DON], ["Huỷ đơn", DON], ["Xem lại đơn của mình", "donHang"],
    ],
    "Hoa hồng": [["Xem hoa hồng của bạn", null]],
    "Khi vướng": VUONG("Tình huống hay gặp", "Điều bạn không làm được — hỏi ai", "Câu hỏi thường gặp"),
    "Bảo mật": [["Bật bảo mật hai lớp", "toi"], ["Nhận mã đăng nhập qua email", "toi"]],
  },
  "tai-xe": {
    "Chạy xe": [["Menu của bạn", null], ["Xem cuốc và chuẩn bị", "cuoc"], ["Chạy một chuyến", "cuoc"], ["Tài xế nhà xe đối tác", null]],
    "Khi vướng": VUONG("Tình huống hay gặp", "Điều bạn không làm được — hỏi ai", "Câu hỏi thường gặp"),
    "Bảo mật": [["Bật bảo mật hai lớp", "toi"], ["Nhận mã đăng nhập qua email", "toi"]],
  },
  "quan-ly-ban-hang": {
    "Dịch vụ & giá": [["Menu của bạn", null], ["Chọn vé cần kiểm vé", "dichVu"], ["Ngừng bán, mở bán lại", "dichVu"], ["Việc cần nhờ người khác", null]],
  },
  "nhan-su": {
    "Tài khoản": [["Menu của bạn", null], ["Tạo tài khoản", "taiKhoan"], ["Đổi vai trò, sửa tên hoặc số điện thoại, nghỉ việc", "taiKhoan"]],
    "Khi vướng": VUONG("Điều bạn không làm được — hỏi ai"),
    "Bảo mật": [["Bật bảo mật hai lớp", "toi"], ["Nhận mã đăng nhập qua email", "toi"]],
  },
  "quan-tri": {
    "Bắt đầu": [["Menu của bạn", null]],
    "Tài khoản": [["Tài khoản cho nhân viên mới", "taiKhoan"], ["Đổi vai trò, sửa tên hoặc số điện thoại", "taiKhoan"], ["Quên PIN, bị khoá, mất máy, nghỉ việc", "taiKhoan"]],
    "Danh bạ": [["Danh bạ: thêm và tìm hồ sơ", "danhBa"], ["Danh bạ: sửa chi tiết, liên hệ, công việc, tài xế", "danhBa"], ["Giấy tờ của người", "danhBa"]],
    "Đơn và dịch vụ": [
      ["Dịch vụ & giá (Google Sheet)", "dichVu"], ["Đặc điểm dịch vụ và luật bán", "dacDiem"], ["Người phụ trách đơn", DON], ["Đặt gấp (giờ đón đã qua hạn chốt)", DON],
    ],
    "Xe": [["Xe và giấy tờ xe", "xe"], ["Điều chỉnh khẩn cấp và phá lệ", "dieuPhoi"]],
    "Tiền": [["Duyệt điều chỉnh công nợ", "dieuChinhCongNo"]],
    "Cài đặt": [["Các danh mục cài đặt", null], ["Chỉ tài khoản Toàn quyền", null]],
    "Khi vướng": VUONG("Tình huống hay gặp", "Điều bạn không làm được — hỏi ai", "Câu hỏi thường gặp"),
  },
};
