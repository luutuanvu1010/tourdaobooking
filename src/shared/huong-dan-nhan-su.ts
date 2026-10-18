// Hướng dẫn: Hành chính nhân sự (ADR-0071, bản 1.52). Luật viết ở src/shared/huong-dan.ts.
import type { NhomHuongDan } from "./huong-dan.ts";
import { mucBatHaiLop, mucNhanMaEmail } from "./huong-dan-hai-lop.ts";

export const HD_NHAN_SU: NhomHuongDan = {
  id: "nhan-su",
  tieuDe: "Hành chính nhân sự",
  quyen: ["HR"],
  gioiThieu: "Bạn nhập tài khoản cho mọi người dùng Nền tảng (nhân viên, đối tác, tài xế đối tác), sửa tên, số điện thoại, gán vai và ngưng tài khoản khi nghỉ việc. Bạn không xem đơn, giá hay Danh bạ.",
  batDauNhanh: `1. Mở [[Quản lý tài khoản]], xem cột [[Đăng nhập gần nhất]] để biết ai đã vào Nền tảng.
2. Người mới: gõ ở khung [[Thêm tài khoản]], chọn vai, bấm [[Tạo tài khoản]], gửi riêng PIN cho họ.
3. Người đổi việc: bấm [[Sửa]] ở dòng của họ, đổi vai, bấm [[Lưu]].`,
  muc: [
    {
      tieuDe: "Menu của bạn",
      noiDung: `- Máy tính: nhóm **THIẾT LẬP** có [[Quản lý tài khoản]] (nhóm này tự mở sẵn vì bạn chỉ có một nhóm); chân menu có trang Của tôi, Hỗ trợ, Trợ giúp.
- Điện thoại: tab [[Tài khoản]] và **Tôi** ở đáy màn hình.
- Mở Nền tảng là vào thẳng trang Quản lý tài khoản.`,
    },
    {
      tieuDe: "Tạo tài khoản",
      noiDung: `1. Vào [[Quản lý tài khoản]], khung [[Thêm tài khoản]].
2. Gõ [[Họ tên]] và [[Số điện thoại (tên đăng nhập)]].
3. Nếu Nền tảng hiện hồ sơ khớp (người đã có tài khoản, đối tác, nhân viên), bấm **Dùng hồ sơ này** để không tạo trùng. Nếu Nền tảng chỉ báo "Số hoặc tên này đã có trong Danh bạ" mà không hiện tên: tick **Vẫn tạo hồ sơ mới**, tạo xong nhờ Quản trị gộp hồ sơ trùng.
4. Ở [[Vai và quyền]], tick vai. Nhóm **Nội bộ**: [[Hướng dẫn viên nội bộ]], [[Nhân viên kinh doanh]], [[Thực tập sinh]], [[Kế toán]], [[Tài xế công ty]]. Nhóm **Bên ngoài**: [[Công ty lữ hành]], [[Hướng dẫn viên độc lập]], [[Lễ tân khách sạn]], [[Tài xế taxi (giới thiệu khách)]], [[Cộng tác viên]], [[Tài xế đối tác]].
5. Đọc dòng **Quyền sẽ có** ngay dưới để chắc chắn đúng.
6. Bấm [[Tạo tài khoản]].
7. Bảng PIN hiện **một lần duy nhất**. Bấm [[Sao chép danh sách]] hoặc chép tay, gửi riêng cho người đó, không gửi nhóm chung.
8. Bấm [[Đã ghi lại, ẩn đi]].

Nền tảng tự chặn: một người vừa vai nội bộ vừa vai bên ngoài; vai Tài xế đối tác đi kèm vai khác. Bạn không thấy các vai quản lý (Giám đốc, Điều hành chung, IT, Hành chính nhân sự).

> Ví dụ: Công ty nhận bạn Ngọc làm kinh doanh. Tick Nhân viên kinh doanh, thấy "Quyền sẽ có: Bán hàng", bấm Tạo tài khoản, nhắn riêng PIN và dặn đổi PIN khi vào Nền tảng.`,
    },
    {
      tieuDe: "Đổi vai, sửa tên hoặc số điện thoại, nghỉ việc",
      noiDung: `1. [[Quản lý tài khoản]], ở dòng người đó bấm [[Sửa]].
2. Sửa [[Họ tên]], [[Số điện thoại đăng nhập]] nếu cần. Đổi số là đổi tên đăng nhập của họ.
3. Tick hoặc bỏ tick vai. Xem kỹ dòng **Sẽ thêm** và **Sẽ mất**. Đổi vai có thể đăng xuất máy thừa. Bấm [[Lưu]]; không lưu thì bấm [[Đóng]].
4. **Nghỉ việc**: bấm [[Ngưng]], xác nhận. Họ bị đăng xuất ngay. Quay lại làm thì bấm [[Kích hoạt lại]]. Tài khoản không bao giờ bị xoá.

Bạn chỉ sửa được tài khoản **không có quyền Quản trị hoặc Nhân sự**; trên dòng của họ các nút bị ẩn.`,
    },
    {
      tieuDe: "Điều bạn không làm được — hỏi ai",
      noiDung: `- **Quên PIN, bị khoá, mất máy**: nhờ Quản trị bấm Đặt lại PIN, Mở khoá hoặc Gỡ Face ID.
- **Gán vai quản lý, sửa tài khoản Quản trị hoặc Hành chính nhân sự khác**: hỏi người phụ trách hệ thống.
- **Xem đơn, giá, Danh bạ, danh mục dịch vụ**: không thuộc việc của vai này; cần thì nhờ người phụ trách hệ thống gán thêm vai.
- **Tạo tài khoản báo số đã có tài khoản**: tìm người đó trong danh sách, có thể họ đang bị ngưng.`,
    },
    mucBatHaiLop("noi-bo"), mucNhanMaEmail("noi-bo"),
  ],
};
