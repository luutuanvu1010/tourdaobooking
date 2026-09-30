// Hướng dẫn: Phần chung (bản 1.40). Luật viết ở src/shared/huong-dan.ts; nguồn đối chiếu docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/chung.md.
import type { NhomHuongDan } from "./huong-dan.ts";

export const HD_CHUNG: NhomHuongDan = {
  id: "chung",
  tieuDe: "Phần chung — cho mọi người",
  quyen: [],
  gioiThieu: "Những việc ai cũng cần: đăng nhập, cài app lên điện thoại, nhận thông báo, đổi PIN, gửi góp ý. Mọi tên người, khách sạn, biển số trong hướng dẫn đều là ví dụ.",
  batDauNhanh: `1. Mở app, gõ [[Số điện thoại]] và [[Mã PIN 6 số]], bấm [[Đăng nhập]].
2. Vào trang **Tôi**, mục [[Đổi mã PIN]]: đổi PIN công ty cấp sang PIN chỉ bạn biết.
3. Trên iPhone: mở bằng Safari, bấm [[Chia sẻ]] rồi **Thêm vào MH chính**.
4. Mở app từ biểu tượng, vào **Tôi**, bấm [[Bật thông báo trên điện thoại]].
5. Gặp lỗi hay cần hỏi: bấm [[Góp ý / Báo lỗi]].`,
  muc: [
    {
      tieuDe: "Đăng nhập",
      noiDung: `1. Gõ [[Số điện thoại]] công ty đã đăng ký cho bạn.
2. Gõ [[Mã PIN 6 số]]. Muốn xem lại số vừa gõ, bấm [[Hiện]].
3. Nếu có ô xác minh người thật, chờ ô đó báo xong.
4. Bấm [[Đăng nhập]].

- Báo sai số điện thoại hoặc PIN: gõ lại, ô PIN tự xoá.
- Báo "Nhập sai quá nhiều lần": chờ đủ số phút, hoặc nhờ Quản trị bấm [[Mở khoá]].
- Ô xác minh báo lỗi: bấm [[Thử lại]], vẫn lỗi thì tải lại trang.

> Ví dụ: Chị Thu gõ số điện thoại và PIN, bấm Đăng nhập, vào thẳng Trang chủ.`,
    },
    {
      tieuDe: "Đăng nhập bằng Face ID",
      noiDung: `Chỉ có khi công ty đã mở tính năng này và máy hỗ trợ. Chỉ bật trên điện thoại riêng của bạn.

1. Đăng nhập bằng PIN. App hỏi có bật Face ID không.
2. Gõ lại PIN ở ô [[Nhập lại PIN để xác nhận]], bấm [[Bật]].
3. Bấm [[Tiếp tục với Face ID]] và nhìn vào máy. Chưa muốn thì bấm [[Để sau]].
4. Lần sau, ở màn đăng nhập bấm nút hình Face ID cạnh nút Đăng nhập.

Bật sau cũng được: trang **Tôi**, mục [[Đăng nhập bằng Face ID]]. Gỡ ở máy nào thì bấm [[Gỡ]]; nghi lộ PIN thì bấm [[Gỡ tất cả]].`,
    },
    {
      tieuDe: "Cài app lên iPhone",
      noiDung: `1. Mở địa chỉ app bằng **Safari**.
2. Bấm [[Chia sẻ]], chọn **Thêm vào MH chính**, rồi **Thêm**.
3. Từ nay mở app bằng biểu tượng "Island Booking" trên màn hình chính.
4. Lần đầu mở từ biểu tượng phải đăng nhập lại một lần.

> Lưu ý: máy đã cài bản cũ có thể vẫn hiện tên cũ dưới biểu tượng. Xoá biểu tượng rồi cài lại để đổi tên.`,
    },
    {
      tieuDe: "Bật thông báo trên điện thoại",
      noiDung: `Bật xong, điện thoại rung và hiện tin ngay cả khi khoá màn hình.

1. Cài app ra màn hình chính trước, mở app từ biểu tượng.
2. Vào **Tôi**, mục [[Thông báo trên điện thoại]].
3. Bấm [[Bật thông báo trên điện thoại]], chọn **Cho phép**.
4. Thấy dòng **Đang bật trên máy này** là xong. Muốn tắt: bấm [[Tắt]].

- Từ 22 giờ đến 6 giờ sáng tin vẫn hiện nhưng không rung, trừ tin quan trọng.
- Lỡ chặn thông báo: vào **Cài đặt** của iPhone, chọn **Thông báo**, chọn Island Booking, bật lại.
- Đổi PIN, bị gỡ Face ID hoặc tài khoản bị ngưng thì thông báo tự tắt, phải bật lại.
- Đăng xuất ở máy nào thì chỉ máy đó thôi nhận tin.
- Không thấy mục này nghĩa là công ty chưa mở tính năng.`,
    },
    {
      tieuDe: "Chuông thông báo và Bảng tin",
      noiDung: `1. Bấm hình chuông ở đầu trang. Số đỏ là tin chưa đọc.
2. Ngăn [[Của tôi]]: tin công ty gửi bạn, đơn bạn lập hoặc phụ trách, đơn chờ nhận. Ngăn [[Tất cả]]: thêm tin về mọi đơn bạn xem được.
3. Tin quan trọng hiện một dải ở đầu mọi trang. Bấm [[Đọc và bấm Đã hiểu]], đọc xong bấm [[Đã hiểu]]. Chưa đọc được thì bấm [[Để sau]].

Khi đang mở app, danh sách đơn tự cập nhật, không cần tải lại. Có thể hiện dòng báo nhỏ như "Đơn vừa có người nhận" hay "Đơn đã được xác nhận". Tin giữ trong 30 ngày.`,
    },
    {
      tieuDe: "Trang Tôi, đổi PIN, đăng xuất",
      noiDung: `Mở bằng tab **Tôi** trên điện thoại, hoặc mục [[Của tôi]] trên máy tính. Trang có tên, số điện thoại, quyền của bạn, [[Giấy tờ của tôi]] (nếu công ty đã ghi), Face ID, thông báo và đổi PIN.

### Đổi PIN
1. Mục [[Đổi mã PIN]]: gõ [[PIN hiện tại]], [[PIN mới (6 số)]], [[Nhập lại PIN mới]].
2. Bấm [[Đổi PIN]]. Các máy khác đang đăng nhập tài khoản này bị đăng xuất.

> Lưu ý: không dùng PIN dễ đoán như dãy số liền nhau hoặc sáu số giống nhau.

### Quên PIN
- Đã bật Face ID và đang đăng nhập: mục Face ID, bấm [[Quên PIN? Đặt PIN mới bằng Face ID]], gõ PIN mới hai lần, bấm [[Xác nhận bằng Face ID]].
- Chưa bật Face ID: nhờ Quản trị đặt lại PIN và gửi riêng cho bạn.

### Đăng xuất
Bấm [[Đăng xuất]] ở trang Tôi hoặc dưới cùng menu máy tính. Máy dùng chung thì luôn đăng xuất khi xong việc.`,
    },
    {
      tieuDe: "Trợ giúp và Góp ý",
      noiDung: `### Trợ giúp
Mở [[Trợ giúp]] để đọc hướng dẫn và [[Nhật ký thay đổi]] của từng phiên bản. Khi có bản mới chưa đọc, tab Tôi và mục Trợ giúp có chấm đỏ, bản đó có nhãn [[Mới cập nhật]].

### Gửi góp ý, báo lỗi
1. Bấm [[Góp ý / Báo lỗi]].
2. Chọn loại: [[Báo lỗi]], [[Đề xuất]] hoặc [[Câu hỏi]].
3. Gõ tiêu đề và mô tả, bấm [[Gửi]]. App tự đính kèm trang đang mở, loại máy, phiên bản.
4. Xem trả lời ở ngăn [[Yêu cầu của tôi]].

Chỉ bạn và người phụ trách hệ thống đọc được yêu cầu của bạn.

> Ví dụ: Anh Tuấn thấy nút lưu bị bàn phím che, chọn Báo lỗi, ghi đang ở màn nào, bấm Gửi.`,
    },
    {
      tieuDe: "Hỏi trợ lý Hỗ trợ",
      noiDung: `Nút [[Hỗ trợ]] nằm ở góc dưới bên phải mọi trang. Khung này tự mở một lần sau mỗi lần đăng nhập.

1. Bấm [[Hỗ trợ]], gõ câu hỏi về cách dùng app, bấm [[Gửi]].
2. Đọc câu trả lời. Dòng **Nguồn** cho biết mục hướng dẫn trợ lý đã dựa vào.

- Trợ lý chỉ biết hướng dẫn và các trang của app. Nó không xem được đơn, khách hay tiền, và không làm thay bạn.
- Trả lời do AI, có thể sai: luôn đối chiếu với màn hình.
- Đừng gõ số điện thoại hay thông tin khách. App tự che trước khi gửi đi.
- Báo **Trợ lý chưa bật** hoặc **tạm nghỉ tới tháng sau**: đọc Trợ giúp, hoặc hỏi Quản trị.`,
    },
    {
      tieuDe: "Khi app đang bảo trì",
      noiDung: `Màn hình hiện [[Đang bảo trì]] kèm giờ dự kiến xong. Bạn chưa làm gì được.

1. Chờ, rồi bấm [[Thử lại]].
2. Khi app mở lại, bấm [[Tải lại trang]].
3. Máy dùng chung thì bấm [[Đăng xuất]].

Phần đang gõ chưa lưu có thể mất, nên lưu việc trước giờ bảo trì đã báo.`,
    },
    {
      tieuDe: "Câu hỏi thường gặp",
      noiDung: `- **Đăng nhập hai máy được không?** Được. Đổi PIN thì máy kia bị đăng xuất.
- **Sao tôi không thấy mục mà đồng nghiệp thấy?** Mỗi người thấy menu theo quyền. Cần thêm thì hỏi Quản trị.
- **Mất mạng có dùng được không?** Mở được khung app nhưng không có dữ liệu.`,
    },
  ],
};
