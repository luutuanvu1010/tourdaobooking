// Hướng dẫn: Tài xế (bản 1.40). Luật viết ở src/shared/huong-dan.ts; nguồn đối chiếu docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/tai-xe.md.
import type { NhomHuongDan } from "./huong-dan.ts";

export const HD_TAI_XE: NhomHuongDan = {
  id: "tai-xe",
  tieuDe: "Tài xế",
  quyen: ["DRIVER", "DRIVER_PARTNER"],
  gioiThieu:
    "Bạn là tài xế. Tài xế công ty xem cuốc mình lái hôm nay và ngày mai, bấm từng bước khi chạy. Mọi tài xế xem được hạn giấy tờ của mình. Bạn không thấy đơn hàng hay tiền.",
  batDauNhanh: `> Lưu ý: cuốc hiện ở đây khi văn phòng xếp bạn lái. Thấy "Không có cuốc nào." nghĩa là bạn chưa được xếp chuyến nào.

> Lưu ý: tài xế của nhà xe đối tác chưa có phần cuốc xe — chỉ làm bước 3–5, rồi đọc mục cuối "Tài xế nhà xe đối tác".

1. Mở app. Bạn vào thẳng [[Cuốc của tôi]].
2. Xem ba nhóm **Hôm nay**, **Ngày mai**, **Ngày kia**. Vào [[Tôi]] bật thông báo để được báo khi được xếp chuyến.
3. Bấm [[Trang chủ]] để xem **Giấy tờ của tôi** và hạn từng giấy.
4. Bấm [[Xem tất cả]] để xem đủ danh sách giấy tờ.
5. Giấy tờ sai hoặc sắp hết hạn: báo văn phòng.`,
  muc: [
    {
      tieuDe: "Menu của bạn",
      noiDung: `Trên điện thoại, thanh dưới đáy của tài xế công ty có: [[Trang chủ]], [[Cuốc của tôi]], [[Tôi]]. Tài xế nhà xe đối tác chỉ có [[Trang chủ]] và [[Tôi]].
- [[Trang chủ]]: lời chào và hai giấy tờ sắp hết hạn nhất.
- [[Cuốc của tôi]]: các chuyến hôm nay, ngày mai và ngày kia.
- [[Tôi]]: đủ **Giấy tờ của tôi**, đổi PIN, bật thông báo.

Trên máy tính, menu bên trái có: [[Trang chủ]], [[Cuốc của tôi]], [[Của tôi]], [[Góp ý / Báo lỗi]], [[Trợ giúp]].`,
    },
    {
      tieuDe: "Xem cuốc và chuẩn bị",
      noiDung: `1. Ở [[Cuốc của tôi]], mỗi thẻ có: giờ xuất bến, mã chuyến, trạng thái, biển số, số khách, số điểm đón, số điểm trả.
2. Thẻ ghi **Bị giữ** kèm dòng "(văn phòng lo)": chuyến còn thiếu giấy tờ hay thông tin. Bạn không cần làm gì.
3. Bấm vào thẻ để mở chuyến.
4. Trước khi chạy, bạn thấy các điểm theo thứ tự: điểm đón có giờ hẹn, điểm trả, số khách mỗi điểm.
5. Mục **Điều kiện xuất bến** ghi đạt hay chưa. Còn thiếu thì nút [[Xuất bến]] bị khoá.

> Ví dụ: Anh Tâm lái xe 16 chỗ. Sáng nay có 2 điểm đón ở hai khách sạn trong Nha Trang, hẹn 06:40 và 06:55, rồi trả khách ở cảng Cầu Đá.`,
    },
    {
      tieuDe: "Chạy một chuyến",
      noiDung: `1. Xe lăn bánh thì bấm [[Xuất bến]]. Giờ ghi là lúc bấm.
2. Tới điểm đón, bấm [[Đã tới]].
3. Với từng khách, bấm [[Đã đón]], [[Vắng]] hoặc [[Khách đã huỷ]].
4. Dưới điểm đón có dòng "Liên hệ" kèm số. Bấm vào số là gọi được.
5. Tới điểm trả, bấm [[Đã trả]]. Chưa bấm Đã tới ở điểm này thì app tự ghi luôn.
6. Trả hết khách thì bấm [[Kết thúc chuyến]]. Còn khách chưa xong thì nút chưa bấm được.

> Ví dụ: Anh Tâm tới khách sạn đầu, bấm Đã tới, bấm Đã đón cho 7 khách. Tới cảng Cầu Đá, bấm Đã trả rồi Kết thúc chuyến.`,
    },
    {
      tieuDe: "Tình huống hay gặp",
      noiDung: `- **Khách tới trễ sau khi đã bấm Vắng:** dòng khách đó vẫn còn nút [[Đã đón]].
- **Bấm nhầm Đã đón hoặc Khách đã huỷ:** màn không còn nút sửa. Gọi văn phòng.
- **Văn phòng vừa thêm điểm:** dải trên cùng báo điểm mới (giờ đón, số khách), điểm đó có nhãn **Mới thêm** và đã nằm trong lộ trình. Đọc xong bấm [[Đã xem]].
- **Văn phòng đã báo huỷ:** vẫn tới điểm. Gặp khách thì bấm [[Đã đón]]; không gặp thì bấm [[Khách đã huỷ]] để trả chỗ.
- **Muốn ghé điểm khác trước:** khi xe đang chạy, điểm chưa tới có nút mũi tên lên và mũi tên xuống để đổi thứ tự.
- **Xe hỏng, không đi tiếp được:**
  1. Bấm [[Kết thúc gián đoạn]].
  2. Chọn một lý do trong danh sách.
  3. Bấm [[Kết thúc gián đoạn]] trong bảng. Rồi gọi văn phòng ngay.
- **Mất mạng:** dòng chưa gửi ghi **Chưa gửi được** kèm nút [[Bấm lại]]. Có mạng thì bấm lại đúng dòng đó. Máy không tự gửi lại. **Đừng tắt app** trước khi bấm lại. Lỡ tắt thì gọi văn phòng bấm thay.
- **Chỉ thấy "Khách 1", "Khách 2":** tên, năm sinh và số liên hệ khách chỉ hiện **trong ngày chạy**. Xuất bến từ tối hôm trước cũng không hiện sớm.
- **Mở lại chuyến đang chạy:** ở [[Cuốc của tôi]], bấm [[Mở chuyến đang chạy]].`,
    },
    {
      tieuDe: "Điều bạn không làm được — hỏi ai",
      noiDung: `- **Xem đơn, giá, tiền, danh bạ khách:** không được.
- **Nhận chuyến, đổi xe, đổi giờ, thêm bớt khách:** văn phòng làm.
- **Sửa giấy tờ của mình:** báo văn phòng cập nhật.
- **Chuyến Bị giữ:** văn phòng lo.
- **Sửa giờ đã bấm:** không được, gọi văn phòng.`,
    },
    {
      tieuDe: "Tài xế nhà xe đối tác",
      noiDung: `Nếu bạn là tài xế của nhà xe khác:
- Bạn đăng nhập và xem **Giấy tờ của tôi** ở [[Trang chủ]] và [[Tôi]]. Số giấy tờ bị che một phần.
- Trang chủ ghi "Cuốc xe của bạn sẽ hiện ở đây". Bạn chưa xem chuyến và chưa bấm được các bước chạy (chưa có ở bản này).
- Bạn không thấy đơn, giá hay tin nội bộ của công ty.
- Giấy tờ sai hoặc có giấy mới: báo văn phòng, hoặc bấm [[Góp ý / Báo lỗi]].`,
    },
    {
      tieuDe: "Câu hỏi thường gặp",
      noiDung: `### Sao hôm nay không có cuốc nào?
Văn phòng chưa xếp bạn lái chuyến nào. Khi được xếp, đổi hay huỷ chuyến, bạn nhận thông báo (nếu đã bật).

### Giờ ghi có phải giờ tôi bấm không?
Đúng. Bạn không tự sửa giờ được.

### Nhãn hạn giấy tờ nghĩa là gì?
- **Còn … ngày**: còn hạn.
- **Hết hạn hôm nay** hoặc **Đã hết hạn … ngày**: báo văn phòng ngay.
- **Không hạn**: giấy không có ngày hết hạn.`,
    },
  ],
};
