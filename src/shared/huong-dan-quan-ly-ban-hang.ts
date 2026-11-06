// Hướng dẫn: Quản lý bán hàng (ADR-0169). Luật viết ở src/shared/huong-dan.ts.
import type { NhomHuongDan } from "./huong-dan.ts";

export const HD_QUAN_LY_BAN_HANG: NhomHuongDan = {
  id: "quan-ly-ban-hang",
  tieuDe: "Quản lý bán hàng",
  quyen: ["SALES_MANAGER"],
  gioiThieu: "Bạn làm được mọi việc của Bán hàng (xem nhóm Bán hàng), thêm hai việc: chọn vé nào phải chờ kiểm vé, và ngừng bán hoặc mở bán lại một dịch vụ. Bạn không sửa giá, không đồng bộ danh mục, không sửa nhóm dịch vụ: các việc đó của Quản trị.",
  batDauNhanh: `1. Mở [[Dịch vụ & giá]].
2. Gõ tên vé ở ô **Tìm vé**, ví dụ «buffet».
3. Gạt công tắc **Cần kiểm vé** ở dòng vé đó, hoặc bấm [[Ngừng bán]] nếu tạm không bán dịch vụ này.`,
  muc: [
    {
      tieuDe: "Menu của bạn",
      noiDung: `- Máy tính: nhóm **THIẾT LẬP** có [[Dịch vụ & giá]]; các mục khác giống Bán hàng.
- Điện thoại: Trang chủ có ô [[Dịch vụ & giá]].`,
    },
    {
      tieuDe: "Chọn vé cần kiểm vé",
      noiDung: `1. Vào [[Dịch vụ & giá]], tìm vé cần đổi.
2. Gạt công tắc **Cần kiểm vé** ở dòng vé. Muốn áp cho mọi vé của một nhóm thì gạt công tắc **Cả nhóm cần kiểm vé** ở dòng nhóm.
3. Vé đã gạt riêng không đổi theo nhóm nữa.

Vé được bật phải chờ người kiểm vé báo còn vé rồi đơn mới được xác nhận. Đơn đã xác nhận không đổi. Mỗi lần gạt đều được ghi vào nhật ký.`,
    },
    {
      tieuDe: "Ngừng bán, mở bán lại",
      noiDung: `1. Vào [[Dịch vụ & giá]], tìm dịch vụ.
2. Bấm [[Ngừng bán]]. Dòng đó hiện chữ **Đã ngừng bán**, và người lập đơn không chọn được dịch vụ này nữa.
3. Khi bán lại được, bấm [[Mở bán lại]].`,
    },
    {
      tieuDe: "Việc cần nhờ người khác",
      noiDung: `- Sửa giá, đồng bộ danh mục, sửa nhóm dịch vụ: nhờ Quản trị.
- Công tắc **Nhân viên tự kiểm vé đơn mình lập**: nhờ người giữ Toàn quyền.
- Gán hoặc gỡ vai trò Quản lý bán hàng cho người khác: chỉ Quản trị hoặc Toàn quyền làm được, Nhân sự không làm được.`,
    },
  ],
};
