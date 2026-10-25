// Hướng dẫn: Tài xế (bản 1.40). Luật viết ở src/shared/huong-dan.ts; nguồn đối chiếu docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/tai-xe.md.
import type { NhomHuongDan } from "./huong-dan.ts";
import { mucBatHaiLop, mucNhanMaEmail } from "./huong-dan-hai-lop.ts";

export const HD_TAI_XE: NhomHuongDan = {
  id: "tai-xe",
  tieuDe: "Tài xế",
  quyen: ["DRIVER", "DRIVER_PARTNER"],
  gioiThieu:
    "Bạn là tài xế. Bạn xem cuốc mình lái, bấm từng bước khi chạy và xem hạn giấy tờ của mình. Bạn không thấy đơn hàng hay tiền.",
  batDauNhanh: `> Lưu ý: cuốc hiện ở đây khi văn phòng xếp bạn lái. Thấy "Không có cuốc nào." nghĩa là bạn chưa được xếp chuyến nào.

> Lưu ý: tài xế của nhà xe đối tác đọc thêm mục "Tài xế nhà xe đối tác" (từ chối chuyến, báo bận).

1. Mở Nền tảng. Bạn vào thẳng [[Cuốc của tôi]].
2. Xem ba nhóm **Hôm nay**, **Ngày mai**, **Ngày kia**. Vào [[Tôi]] bật thông báo để được báo khi được xếp chuyến.
3. Bấm [[Trang chủ]] để xem **Giấy tờ của tôi** và hạn từng giấy.
4. Bấm [[Xem tất cả]] để xem đủ danh sách giấy tờ.
5. Giấy tờ sai hoặc sắp hết hạn: báo văn phòng.`,
  muc: [
    {
      tieuDe: "Menu của bạn",
      noiDung: `Trên điện thoại, thanh dưới đáy có: [[Trang chủ]], [[Cuốc của tôi]], [[Tôi]]. Tài xế nhà xe đối tác có thêm [[Báo bận của tôi]].
- [[Trang chủ]]: lời chào và hai giấy tờ sắp hết hạn nhất.
- [[Cuốc của tôi]]: các chuyến hôm nay, ngày mai và ngày kia.
- [[Báo bận của tôi]]: ghi giờ bạn bận để văn phòng không xếp chuyến.
- [[Tôi]]: đủ **Giấy tờ của tôi**, đổi PIN, bật thông báo.

Trên máy tính, menu bên trái có các mục trên, cùng [[Của tôi]], [[Hỗ trợ]], [[Trợ giúp]].`,
    },
    {
      tieuDe: "Xem cuốc và chuẩn bị",
      noiDung: `1. Ở [[Cuốc của tôi]], mỗi thẻ có: giờ xe chạy, mã chuyến, trạng thái, biển số, số khách, số điểm đón, số điểm trả.
2. Thẻ ghi **Bị giữ** kèm dòng "(văn phòng lo)": chuyến còn thiếu giấy tờ hay thông tin. Bạn không cần làm gì. Riêng thiếu tên khách của chuyến hôm nay: tài xế công ty tự bổ sung được (mục "Tình huống hay gặp").
3. Bấm vào thẻ để mở chuyến.
4. Trước khi chạy, bạn thấy các điểm theo thứ tự: điểm đón có giờ hẹn, điểm trả, số khách mỗi điểm. Tài xế công ty, trong ngày chạy, thấy thêm tên, năm sinh từng khách và dòng "Liên hệ" kèm số ở mỗi điểm đón. Bấm vào số là gọi được.
5. Mục **Điều kiện cho xe chạy** ghi đạt hay chưa. Còn thiếu thì nút [[Cho xe chạy]] bị khoá.

> Ví dụ: Anh Tâm lái xe 16 chỗ. Sáng nay có 2 điểm đón ở hai khách sạn trong Nha Trang, hẹn 06:40 và 06:55, rồi trả khách ở cảng Cầu Đá.`,
    },
    {
      tieuDe: "Chạy một chuyến",
      noiDung: `1. Xe lăn bánh thì bấm [[Cho xe chạy]]. Giờ ghi là lúc bấm.
2. Tới điểm đón, bấm [[Đã tới]].
3. Với từng khách, bấm [[Đã đón]], [[Vắng]] hoặc [[Khách đã huỷ]].
4. Dưới điểm đón có dòng "Liên hệ" kèm số. Bấm vào số là gọi được.
5. Tới điểm trả, bấm [[Đã trả]]. Chưa bấm Đã tới ở điểm này thì Nền tảng tự ghi luôn.
6. Trả hết khách thì bấm [[Kết thúc chuyến]]. Còn khách chưa xong thì nút chưa bấm được.

> Ví dụ: Anh Tâm tới khách sạn đầu, bấm Đã tới, bấm Đã đón cho 7 khách. Tới cảng Cầu Đá, bấm Đã trả rồi Kết thúc chuyến.`,
    },
    {
      tieuDe: "Tình huống hay gặp",
      noiDung: `- **Khách tới trễ sau khi đã bấm Vắng:** dòng khách đó vẫn còn nút [[Đã đón]].
- **Bấm nhầm Đã đón hoặc Khách đã huỷ:** màn không còn nút sửa. Gọi văn phòng.
- **Văn phòng vừa thêm điểm:** dải trên cùng báo điểm mới (giờ đón, số khách), điểm đó có nhãn **Mới thêm** và đã nằm trong lộ trình. Đọc xong bấm [[Đã xem]].
- **Khách chưa có tên (chỉ tài xế công ty):** trong ngày chạy, khối **Suất của khách** báo thiếu tên, ghi "Điểm 2 · Khách 1" trùng với dòng "Khách 1" dưới điểm 2. Hỏi khách, bấm [[Bổ sung tên]], nhập họ tên, năm sinh rồi bấm [[Lưu]].
- **Chuyến có từ hai điểm trả (tài xế công ty):** dưới tên mỗi khách có dòng "Trả khách ở: …" cho biết khách xuống ở điểm nào.
- **Văn phòng đã báo huỷ:** vẫn tới điểm. Gặp khách thì bấm [[Đã đón]]; không gặp thì bấm [[Khách đã huỷ]] để trả chỗ.
- **Muốn ghé điểm khác trước:** khi xe đang chạy, điểm chưa tới có nút mũi tên lên và mũi tên xuống để đổi thứ tự.
- **Cần đường tới điểm:** trong ngày chạy, mỗi điểm chưa xong có nhóm **Chỉ đường**. Bấm [[Google Maps]] để mở bản đồ với điểm đến điền sẵn; iPhone, iPad, máy Mac có thêm [[Apple Maps]]. Bản đồ chỉ nhận địa chỉ điểm đến, không nhận tên hay số điện thoại khách. Điểm đã xong hoặc chuyến đã kết thúc thì không còn nút. Điểm chưa có địa chỉ thì bản đồ tìm theo tên điểm, có thể sai — báo văn phòng.
- **Xe hỏng, không đi tiếp được:**
  1. Bấm [[Chuyển khách sang xe khác]], chọn một xe đang chạy còn đủ chỗ, gõ nơi gặp, bấm [[Gửi đề nghị]].
  2. Tài xế xe kia bấm Nhận thì khách trên xe và khách đang chờ đã sang xe đó. Hết giờ chờ hoặc bị từ chối thì gọi văn phòng.
  3. Bấm [[Kết thúc gián đoạn]], chọn lý do, bấm [[Kết thúc gián đoạn]] trong bảng. Văn phòng nhận tin ngay và xếp xe cho khách còn lại.
- **Không kịp tới một điểm đón:** ở điểm đó bấm [[Nhờ xe khác đón]], chọn xe cùng ngày, bấm [[Gửi đề nghị]]. Chưa ai nhận thì khách vẫn ở xe bạn; không cần nữa thì bấm [[Rút lại]].
- **Xe khác nhờ bạn đón khách:** thẻ đề nghị hiện trên chuyến của bạn, có đếm ngược giờ chờ. Bấm [[Nhận]] để nhận khách, hoặc [[Không nhận]] rồi chọn lý do. Có lúc Nền tảng cần văn phòng duyệt; kết quả báo sau.
- **Mất mạng:** dòng chưa gửi ghi **Chưa gửi được** kèm nút [[Bấm lại]]. Có mạng thì bấm lại đúng dòng đó. Máy không tự gửi lại. **Đừng tắt Nền tảng** trước khi bấm lại. Lỡ tắt thì gọi văn phòng bấm thay.
- **Chỉ thấy "Khách 1", "Khách 2":** tên, năm sinh và số liên hệ khách chỉ hiện **trong ngày chạy**. Xe chạy từ tối hôm trước cũng không hiện sớm.
- **Mở lại chuyến đang chạy:** ở [[Cuốc của tôi]], bấm [[Mở chuyến đang chạy]].`,
    },
    {
      tieuDe: "Điều bạn không làm được — hỏi ai",
      noiDung: `- **Xem đơn, giá, tiền, danh bạ khách:** không được.
- **Nhận chuyến, đổi xe, đổi giờ, thêm bớt khách:** văn phòng làm. Tài xế công ty chỉ bổ sung tên cho khách đã có chỗ.
- **Sửa giấy tờ của mình:** báo văn phòng cập nhật.
- **Chuyến Bị giữ:** văn phòng lo.
- **Sửa giờ đã bấm:** không được, gọi văn phòng.`,
    },
    {
      tieuDe: "Tài xế nhà xe đối tác",
      noiDung: `Nếu bạn là tài xế của nhà xe khác:
- Bạn xem cuốc và bấm các bước chạy như tài xế công ty, trừ bổ sung tên khách.
- **Từ chối chuyến:** chuyến chưa chạy có dải "Từ chối được tới …". Không chạy được thì bấm [[Từ chối chuyến]], chọn lý do, bấm [[Xác nhận từ chối]]. Chuyến rời khỏi Cuốc của bạn, văn phòng xếp người khác. Quá giờ đó thì không từ chối được nữa: bấm [[Gọi văn phòng]].
- **Tên khách và số liên hệ:** chỉ hiện sau khi bạn bấm [[Cho xe chạy]], sớm nhất từ giờ ghi ở dòng "Bạn thấy tên khách và số liên hệ sau khi bấm “Cho xe chạy”, sớm nhất từ …".
- **Báo bận:** ở [[Báo bận của tôi]], chọn giờ bắt đầu, giờ kết thúc, lý do rồi bấm [[Lưu khung bận]]. Văn phòng chỉ thấy bạn bận, không thấy lý do. Giờ đó trùng chuyến bạn đang được xếp thì không lưu được: từ chối chuyến đó trước (nếu còn hạn) hoặc gọi văn phòng. Hết bận thì bấm [[Rút khung bận]].
- Số giấy tờ bị che một phần. Bạn không thấy đơn, giá hay tin nội bộ của công ty.
- Giấy tờ sai hoặc có giấy mới: báo văn phòng, hoặc bấm [[Hỗ trợ]].`,
    },
    {
      tieuDe: "Câu hỏi thường gặp",
      noiDung: `### Sao hôm nay không có cuốc nào?
Văn phòng chưa xếp bạn lái chuyến nào. Khi được xếp, đổi hay huỷ chuyến, bạn nhận thông báo (nếu đã bật).

### Thông báo "Văn phòng vừa điều chỉnh chuyến" là gì? (tài xế công ty)
Văn phòng vừa xếp thêm, rút hay chuyển khách trên chuyến bạn lái, và đã bỏ qua một luật (có ghi lý do). Thông báo ghi "điều chỉnh khẩn cấp" nghĩa là việc này làm sát giờ chạy. Bạn mở thông báo để xem lại điểm đón và số khách.

### Giờ ghi có phải giờ tôi bấm không?
Đúng. Bạn không tự sửa giờ được.

### Nhãn hạn giấy tờ nghĩa là gì?
- **Còn … ngày**: còn hạn.
- **Hết hạn hôm nay** hoặc **Đã hết hạn … ngày**: báo văn phòng ngay.
- **Không hạn**: giấy không có ngày hết hạn.`,
    },
    mucBatHaiLop("tai-xe"), mucNhanMaEmail("tai-xe"),
  ],
};
