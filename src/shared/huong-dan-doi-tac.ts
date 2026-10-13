// Hướng dẫn: Đối tác (bản 1.40). Luật viết ở src/shared/huong-dan.ts; nguồn đối chiếu docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/doi-tac.md.
import type { NhomHuongDan } from "./huong-dan.ts";

export const HD_DOI_TAC: NhomHuongDan = {
  id: "doi-tac",
  tieuDe: "Đối tác",
  quyen: ["PARTNER"],
  gioiThieu:
    "Bạn là đối tác của công ty: đại lý, khách sạn hay nơi gửi khách đi tour. Bạn lập đơn cho khách của mình bằng dịch vụ trong danh mục, theo đúng giá bán lẻ, và chỉ thấy đơn do chính mình lập.",
  batDauNhanh: `1. Mở app, gõ **Số điện thoại** và **Mã PIN 6 số** công ty đã cấp, bấm [[Đăng nhập]].
2. Vào [[Tôi]], bấm [[Đổi mã PIN]] để đổi sang mã PIN của riêng bạn.
3. Bấm [[Tạo đơn]], chọn **Ngày khởi hành**, rồi chọn dịch vụ ở ô [[Chọn từ danh mục]].
   Muốn lọc nhanh, bấm nút [[Nhóm dịch vụ]] rồi đánh dấu nhóm cần xem.
4. Nhập số khách, tên và số điện thoại của khách.
5. Bấm [[Lưu, chờ xác nhận]]. App mở trang của đơn vừa lập.
6. Kiểm lại rồi bấm [[Xác nhận đơn]]. Sau đó bấm [[Xem biên nhận]] để gửi ảnh cho khách.`,
  muc: [
    {
      tieuDe: "Menu của bạn",
      noiDung: `### Trên máy tính

Thanh menu dọc bên trái có:
- Nhóm BÁN HÀNG: [[Đơn hàng]], [[Tạo đơn]].
- Nhóm TÔI: [[Của tôi]], [[Góp ý / Báo lỗi]], [[Trợ giúp]].

### Trên điện thoại

Thanh tab dưới đáy có [[Đơn hàng]], [[Tạo đơn]] và [[Tôi]].

### Mở danh sách đơn của bạn

Bấm [[Đơn hàng]] trên menu (máy tính) hoặc thanh tab (điện thoại). Trang này chỉ có các đơn bạn đã lập. Mở app cũng tự vào trang này.`,
    },
    {
      tieuDe: "Đăng nhập và đổi mã PIN",
      noiDung: `1. Mở app **Island Booking System**. Trên iPhone, biểu tượng có thể vẫn mang tên cũ "Tour Đảo Booking".
2. Gõ **Số điện thoại** và **Mã PIN 6 số** công ty đã cấp.
3. Bấm [[Đăng nhập]].

Nên đổi mã PIN ngay lần đầu:
1. Vào [[Tôi]], tìm phần [[Đổi mã PIN]].
2. Gõ **PIN hiện tại**, **PIN mới (6 số)**, **Nhập lại PIN mới**.
3. Bấm [[Đổi PIN]].

Muốn đăng nhập nhanh bằng Face ID: vào [[Tôi]], phần **Đăng nhập bằng Face ID**, gõ lại PIN ở ô [[Nhập lại PIN để xác nhận]] rồi bấm [[Bật]]. Chỉ bật trên điện thoại riêng của bạn.

> Lưu ý: Đừng dùng mã PIN dễ đoán, ví dụ sáu số giống nhau.`,
    },
    {
      tieuDe: "Lập đơn cho khách",
      noiDung: `1. Bấm [[Tạo đơn]].
2. Đầu trang: chọn **Ngày khởi hành**. Ngày này dùng cho mọi dịch vụ trong đơn.
3. Phần **Dịch vụ**: bấm vào ô [[Chọn từ danh mục]], gõ tên hoặc mã dịch vụ, rồi bấm vào dịch vụ cần chọn.
   - Dịch vụ có nhãn "chưa có giá" hoặc "chưa hỗ trợ" thì không chọn được.
   - Dịch vụ đã có trong đơn có nhãn "đã chọn".
4. Trong thẻ dịch vụ vừa thêm, nhập **Số khách**: **Người lớn**, **Trẻ em**… tuỳ dịch vụ. Dòng tiền tự hiện. Cả đơn cần ít nhất một người lớn đi cùng; trẻ em và em bé không đi một mình.
5. Bấm [[Thông tin chuyến]] để mở phần này, ghi **Giờ đón**, **Điểm đón**, giờ và nơi khách có mặt, **Ghi chú dịch vụ**.
6. Phần **Thông tin khách hàng**: gõ **Tên khách**, **Số điện thoại**. Có thể thêm Email và **Ghi chú / yêu cầu đặc biệt**.
   - Khách liên hệ qua bạn: bấm [[Sử dụng thông tin của tôi]] để tự điền tên và số của bạn.
7. Phần **Thanh toán**: khách đã trả trước thì gõ **Thanh toán trước** và chọn **Phương thức thanh toán**.
8. Xem lại khối **Tóm tắt** (máy tính) hoặc dòng tổng dưới đáy (điện thoại).
9. Bấm [[Lưu, chờ xác nhận]]. App mở trang của đơn vừa lập.

> Ví dụ: Khách sạn "Biển Xanh" (tên đặt ra) có một gia đình 2 người lớn, 1 trẻ em muốn đi tour 4 đảo ngày 05/10. Chị Hoa (lễ tân) bấm Tạo đơn, chọn ngày 05/10, gõ "4 đảo" vào ô Chọn từ danh mục và chọn dịch vụ. Chị nhập 2 người lớn, 1 trẻ em, ghi giờ đón 7:30 ở sảnh khách sạn, gõ tên và số điện thoại của khách, rồi bấm Lưu, chờ xác nhận.

### Giá của đối tác

- Ô đơn giá được **khoá sẵn** theo giá bán lẻ của danh mục. Bạn không gõ giá khác được.
- Ô **Giảm giá** cũng khoá, kèm dòng "Tài khoản đối tác tạm chưa được giảm giá."
- Muốn giảm giá hay dùng giá khác cho khách thì **nhờ văn phòng**.

### Người phụ trách

Tài khoản đối tác không chọn được hướng dẫn viên khi lập đơn. Đơn của bạn chờ nhân viên Tour Đảo nhận lo.`,
    },
    {
      tieuDe: "Sửa đơn còn Chờ xác nhận",
      noiDung: `1. Mở danh sách [[Đơn hàng]], bấm vào đơn.
2. Bấm [[Sửa]]. Màn **Sửa đơn** mở ra.
3. Sửa những gì cần, rồi bấm [[Lưu thay đổi]].`,
    },
    {
      tieuDe: "Xác nhận đơn",
      noiDung: `1. Mở đơn đang **Chờ xác nhận**.
2. Kiểm lại ngày, số khách, giờ đón.
3. Bấm [[Xác nhận đơn]]. App hỏi lại một lần. Đồng ý thì đơn chuyển sang **Đã xác nhận**.

Sau khi xác nhận, dịch vụ, số khách và tiền **bị khoá**.

App **không cho xác nhận** khi:
- Thiếu thông tin chuyến. App báo "Chưa đủ thông tin chuyến để xác nhận đơn." và chỉ rõ dịch vụ còn thiếu. Bấm [[Sửa]] để bổ sung.
- Giờ đón quá gần. Dưới nút có dòng "Cần Quản trị duyệt đặt gấp". Gọi văn phòng để Quản trị duyệt. Khi đã duyệt, đơn có nhãn "Đặt gấp — Quản trị đã duyệt" và bạn xác nhận được.
- Đơn có giá khác giá bán lẻ hoặc có giảm giá. App báo "Tài khoản đối tác dùng đúng giá bán lẻ theo danh mục; muốn giá khác, nhờ văn phòng."`,
    },
    {
      tieuDe: "Gửi biên nhận cho khách",
      noiDung: `1. Mở đơn.
2. Bấm [[Xem biên nhận]].
3. Hộp **Xác nhận đơn để gửi khách** hiện ảnh xác nhận. Ảnh của đối tác không có dòng người phụ trách.
4. Bấm [[Chia sẻ]] để gửi qua Zalo, hoặc [[Tải ảnh PNG]] để lưu về máy.

> Ví dụ: Sau khi xác nhận đơn cho gia đình khách, chị Hoa bấm Xem biên nhận rồi Chia sẻ, chọn Zalo, gửi ảnh cho khách.`,
    },
    {
      tieuDe: "Huỷ đơn",
      noiDung: `1. Mở đơn của bạn.
2. Bấm [[Huỷ đơn]]. App hỏi: "Huỷ đơn này? Việc huỷ không thể hoàn tác."
3. Đồng ý thì đơn chuyển sang **Đã huỷ**.

> Lưu ý: Đơn đã huỷ không mở lại được. Khách muốn đi lại thì phải lập đơn mới.`,
    },
    {
      tieuDe: "Xem lại đơn của mình",
      noiDung: `1. Mở danh sách [[Đơn hàng]] (xem cách mở ở mục Menu của bạn).
2. Gõ mã đơn, tên hoặc số điện thoại vào ô tìm kiếm, hoặc bấm nút **Lọc** để lọc theo ngày đi, dịch vụ, trạng thái rồi bấm [[Áp dụng]]; [[Xoá lọc]] để bỏ.
3. Bấm vào một đơn để xem đủ khách, dịch vụ, tiền.`,
    },
    {
      tieuDe: "Xem hoa hồng của bạn",
      noiDung: `Nếu Công ty tính hoa hồng cho bạn, trang đơn có khối [[Hoa hồng của bạn]]. Mỗi dịch vụ ghi **Thành tiền**, **Hoa hồng** và **Giá đại lý**, cuối khối có tổng.

- Dòng ghi "Chờ Công ty cài mức" là Công ty chưa đặt mức hoa hồng cho dịch vụ đó. Bạn không cần làm gì; hoa hồng hiện khi Công ty đặt mức.
- Đơn còn **Chờ xác nhận** ghi "Dự kiến — tính theo bảng mức hôm nay, chưa lưu". Số chốt sau khi đơn được xác nhận.
- Bạn chỉ thấy tiền của chính mình, không thấy tỷ lệ hay giá vốn của Công ty.`,
    },
    {
      tieuDe: "Tình huống hay gặp",
      noiDung: `### Khách muốn đổi giờ đón hoặc điểm đón sau khi đơn đã xác nhận

Hãy **gọi văn phòng** để nhân viên sửa. Sau khi xác nhận, tài khoản đối tác không sửa thông tin chuyến và không đổi khách, nên trang đơn không có hai nút này.

### Khách muốn thêm người sau khi đơn đã xác nhận

Số khách đã khoá. Gọi văn phòng.

### Khách đòi giảm giá

Bạn không nhập được giảm giá. Gọi văn phòng.

### Tìm không thấy dịch vụ

App ghi "Không tìm thấy dịch vụ." Thử gõ ngắn hơn, ví dụ một từ trong tên. Vẫn không có thì hỏi văn phòng. Tài khoản đối tác chỉ xem danh mục ngay trong ô [[Chọn từ danh mục]] khi lập đơn; không có trang bảng giá riêng.

### Khách đi gấp trong vài giờ tới

Vẫn lập và lưu đơn được. Nhưng muốn xác nhận thì phải có Quản trị duyệt "Đặt gấp". Gọi văn phòng ngay sau khi lưu.`,
    },
    {
      tieuDe: "Điều bạn không làm được — hỏi ai",
      noiDung: `- Xem đơn của người khác: không.
- Nhập giá khác giá bán lẻ, nhập giảm giá: không. Nhờ văn phòng.
- Chọn hướng dẫn viên phụ trách: không. Nhờ văn phòng.
- Sửa giờ đón, điểm đón, đổi khách sau khi xác nhận: không. Nhờ văn phòng.
- Sửa số khách, tiền sau khi xác nhận: không. Nhờ văn phòng.
- Duyệt "Đặt gấp": không. Nhờ Quản trị.
- Xem Danh bạ, Trang chủ của công ty: không.
- Xin nhận lo một đơn, báo tiến độ tour (chưa có ở bản này).
- Nhận tin gửi toàn công ty: không, chỉ nhân viên nội bộ nhận.`,
    },
    {
      tieuDe: "Câu hỏi thường gặp",
      noiDung: `### Sao trang đơn không ghi ai phụ trách?

Tài khoản đối tác không xem tên người phụ trách đơn, nên trang đơn và danh sách đơn không có phần này. Muốn biết ai lo đơn thì gọi văn phòng.

### Sao tôi không thấy Trang chủ?

Trang chủ là màn tổng hợp của văn phòng. Tài khoản đối tác mở app sẽ vào thẳng danh sách đơn của mình.

### Ô đơn giá bị xám, không gõ được

Đúng vậy. Đối tác dùng giá bán lẻ của danh mục.

### Đơn tôi lưu rồi, ai sẽ lo cho khách?

Đơn chờ nhân viên Tour Đảo bấm nhận. Khi đơn được xác nhận mà chưa có người lo, nhân viên nhận được thông báo.

### Tôi quên mã PIN

Máy đã bật Face ID: vào [[Tôi]], bấm [[Quên PIN? Đặt PIN mới bằng Face ID]]. Chưa bật: gọi văn phòng để đặt lại.

### Tôi muốn góp ý về app

Bấm [[Góp ý / Báo lỗi]]. Bạn xem lại được các góp ý mình đã gửi.`,
    },
  ],
};
