// Hướng dẫn: Đối tác (bản 1.40). Luật viết ở src/shared/huong-dan.ts; nguồn đối chiếu docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/doi-tac.md.
import type { NhomHuongDan } from "./huong-dan.ts";
import { mucBatHaiLop, mucNhanMaEmail } from "./huong-dan-hai-lop.ts";

export const HD_DOI_TAC: NhomHuongDan = {
  id: "doi-tac",
  tieuDe: "Đối tác",
  quyen: ["PARTNER"],
  gioiThieu:
    "Bạn là đối tác của công ty: đại lý, khách sạn hay nơi gửi khách đi tour. Bạn lập đơn cho khách của mình bằng dịch vụ trong danh mục, theo đúng giá bán lẻ, và chỉ thấy đơn do chính mình lập.",
  batDauNhanh: `1. Mở Nền tảng, gõ **Số điện thoại** và **Mã PIN 6 số** công ty đã cấp, bấm [[Đăng nhập]].
2. Vào [[Tôi]], bấm [[Đổi mã PIN]] để đổi sang mã PIN của riêng bạn.
3. Bấm [[Tạo đơn]], chọn **Ngày khởi hành**, rồi chạm dịch vụ trong danh sách dưới ô [[Tìm theo tên hoặc mã dịch vụ]].
   Muốn lọc nhanh, chạm một nhóm ở hàng nhóm ngay dưới ô tìm ([[Tất cả]] để xem lại toàn bộ).
4. Nhập số khách, tên và số điện thoại của khách.
5. Bấm [[Gửi đơn]]. Nền tảng lưu đơn rồi gửi đi.
6. Đơn đã xác nhận thì bấm [[Xem biên nhận]] để gửi ảnh cho khách.`,
  muc: [
    {
      tieuDe: "Menu của bạn",
      noiDung: `### Trên máy tính

Thanh menu dọc bên trái có:
- Đầu menu: nút nổi bật [[Tạo đơn]], rồi [[Đơn hàng]].
- Chân menu: [[Của tôi]], [[Hỗ trợ]], [[Hướng dẫn]].

### Trên điện thoại

Thanh tab dưới đáy có [[Đơn hàng]], [[Tạo đơn]] và [[Tôi]].

### Mở danh sách đơn của bạn

Bấm [[Đơn hàng]] trên menu (máy tính) hoặc thanh tab (điện thoại). Trang này chỉ có các đơn bạn đã lập. Mở Nền tảng cũng tự vào trang này.`,
    },
    {
      tieuDe: "Đăng nhập và đổi mã PIN",
      noiDung: `1. Mở Nền tảng **Island Booking System**. Trên iPhone, biểu tượng có thể vẫn mang tên cũ "Tour Đảo Booking".
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
2. Đầu trang: chọn **Ngày khởi hành** (dùng cho mọi dịch vụ trong đơn), rồi ở phần **Khách hàng** gõ **Tên khách đi tour**, **Số điện thoại**. Muốn ghi Email hoặc **Ghi chú / yêu cầu đặc biệt** thì bấm [[Email, ghi chú]].
   - Khách liên hệ qua bạn: bấm [[Điền thông tin của tôi]] để tự điền tên và số của bạn.
   - Dòng **Bên đặt** (nếu có) ghi tên của bạn: Nền tảng tự điền, bạn không cần chọn.
3. Phần **Dịch vụ**: gõ tên hoặc mã vào ô [[Tìm theo tên hoặc mã dịch vụ]] (hoặc chạm một nhóm), rồi chạm dịch vụ cần chọn.
   - Dịch vụ có nhãn "chưa có giá" hoặc "chưa hỗ trợ" thì không chọn được.
   - Dịch vụ vừa chạm hiện "✓ đã thêm" và thẻ dịch vụ hiện bên dưới. Mỗi lúc chỉ một thẻ mở; chạm dòng gập của thẻ để mở lại.
4. Trong thẻ dịch vụ, nhập **Số khách**: **Người lớn**, **Trẻ em**… tuỳ dịch vụ. Dòng tiền tự hiện, ví dụ "2 người lớn × giá = thành tiền". Cả đơn cần ít nhất một người lớn đi cùng; trẻ em và em bé không đi một mình.
5. Phần **Đưa đón** trên thẻ: chọn **Đón** hoặc **Không đón** (bắt buộc trước khi gửi đơn). Chọn **Đón** thì ghi giờ đón (chạm một khung giờ có sẵn, hoặc **Giờ khác** để tự gõ), **Nơi đón**, **Nơi trả** (chọn điểm có sẵn hoặc gõ tự do). Giờ đón thực tế có thể được điều chỉnh cho phù hợp tình hình hoạt động. Bấm [[Thông tin chuyến]] để ghi giờ và nơi khách có mặt, **Ghi chú dịch vụ**.
6. Phần **Thanh toán**: chỉ còn **Giảm giá** (nếu có) và **Ghi chú thanh toán**. Đơn chưa xác nhận thì chưa ghi thu tiền được.
7. Xem tổng tiền ở thanh dưới cùng (chạm để xem chi tiết); trên máy tính là khối **Tóm tắt** bên phải.
8. Bấm [[Gửi đơn]]. Thiếu gì thì khung đỏ hiện ngay trên nút. Đơn được lưu rồi gửi đi. Nếu chưa gửi được (ví dụ giá danh mục vừa đổi), đơn vẫn được lưu nháp, Nền tảng mở trang đơn nháp kèm lý do để bạn sửa rồi bấm [[Gửi đơn]] lại.

> Ví dụ: Khách sạn "Biển Xanh" (tên đặt ra) có một gia đình 2 người lớn, 1 trẻ em muốn đi tour 4 đảo ngày 05/10. Chị Hoa (lễ tân) bấm Tạo đơn, chọn ngày 05/10, gõ "4 đảo" vào ô tìm dịch vụ và chọn dịch vụ. Chị nhập 2 người lớn, 1 trẻ em, ghi giờ đón 7:30 ở sảnh khách sạn, gõ tên và số điện thoại của khách, rồi bấm Gửi đơn.

### Giá của đối tác

- Đơn giá là giá bán lẻ của danh mục. Thẻ dịch vụ của bạn không có nút **Sửa giá** như của văn phòng.
- Ô **Giảm giá**: đơn bạn được hưởng hoa hồng thì giảm được tới mức hoa hồng của đơn; còn lại ô khoá.
- Bạn không thêm được dịch vụ nhập tay (dịch vụ ngoài danh mục).
- Muốn giảm giá, dùng giá khác hay thêm dịch vụ ngoài danh mục thì **nhờ văn phòng**.

### Người phụ trách

Tài khoản đối tác không chọn được hướng dẫn viên khi lập đơn. Đơn của bạn chờ nhân viên Tour Đảo nhận lo.`,
    },
    {
      tieuDe: "Sửa đơn nháp",
      noiDung: `1. Mở danh sách [[Đơn hàng]], bấm vào đơn nháp (đơn chưa gửi).
2. Bấm [[Sửa]]. Màn **Sửa đơn** mở ra.
3. Sửa những gì cần, rồi bấm [[Lưu thay đổi]].

Đơn đã gửi và đang chờ thì bấm [[Rút lại]] trước khi sửa.`,
    },
    {
      tieuDe: "Xác nhận đơn",
      noiDung: `1. Mở đơn nháp, kiểm lại ngày, số khách, giờ đón.
2. Bấm [[Gửi đơn]]. Nền tảng báo một trong hai câu: **Đơn của bạn đã được gửi và chờ xác nhận** (nhân viên kiểm vé, bạn có thể [[Rút lại]]), hoặc **Đơn của bạn đã được chuyển đến chuyên viên phụ trách & chờ hướng dẫn viên** (đơn đã xác nhận, có ảnh biên nhận).

Sau khi xác nhận, dịch vụ, số khách và tiền **bị khoá**.

Nền tảng **không cho gửi đơn** khi:
- Có dịch vụ chưa chọn Đón hay Không đón. Nền tảng báo dịch vụ thứ mấy còn thiếu. Bấm [[Sửa]] để chọn.
- Thiếu thông tin chuyến. Nền tảng báo "Chưa đủ thông tin chuyến để xác nhận đơn." và chỉ rõ dịch vụ còn thiếu. Bấm [[Sửa]] để bổ sung.
- Giờ đón quá gần. Dưới nút có dòng [[Cần văn phòng đặt gấp]]. Gọi văn phòng (nhân viên bán hàng hoặc Quản trị) để đặt gấp. Khi đã đặt gấp, lượt đó có nhãn "Điều chỉnh khẩn cấp (văn phòng)" và bạn xác nhận được.
- Đơn có giá khác giá bán lẻ hoặc có giảm giá. Nền tảng báo "Tài khoản đối tác dùng đúng giá bán lẻ theo danh mục; muốn giá khác, nhờ văn phòng."`,
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
2. Bấm [[Huỷ đơn]]. Nền tảng hỏi: "Huỷ đơn này? Việc huỷ không thể hoàn tác."
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
- Đơn chưa xác nhận (nháp hoặc đang chờ xác nhận) ghi "Dự kiến — tính theo bảng mức hôm nay, chưa lưu". Số chốt sau khi đơn được xác nhận.
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

Nền tảng ghi "Không tìm thấy dịch vụ nào khớp." Thử gõ ngắn hơn, ví dụ một từ trong tên, hoặc chạm [[Tất cả]] nếu đang ở một nhóm. Vẫn không có thì hỏi văn phòng. Tài khoản đối tác chỉ xem danh mục ngay trong danh sách dịch vụ khi lập đơn; không có trang bảng giá riêng.

### Khách đi gấp trong vài giờ tới

Vẫn lập đơn và bấm [[Gửi đơn]] được (dải vàng ghi [[Lưu nháp được. Xác nhận cần văn phòng đặt gấp.]]). Nhưng muốn xác nhận thì văn phòng phải bấm "Đặt gấp" cho lượt đó. Gọi văn phòng ngay sau khi gửi.`,
    },
    {
      tieuDe: "Điều bạn không làm được — hỏi ai",
      noiDung: `- Xem đơn của người khác: không.
- Nhập giá khác giá bán lẻ, nhập giảm giá: không. Nhờ văn phòng.
- Chọn hướng dẫn viên phụ trách: không. Nhờ văn phòng.
- Sửa giờ đón, điểm đón, đổi khách sau khi xác nhận: không. Nhờ văn phòng.
- Sửa số khách, tiền sau khi xác nhận: không. Nhờ văn phòng.
- Bấm "Đặt gấp": không. Nhờ văn phòng (nhân viên bán hàng hoặc Quản trị).
- Xem Danh bạ, Trang chủ của công ty: không.
- Xin nhận lo một đơn, báo tiến độ tour (chưa có ở bản này).
- Nhận tin gửi toàn công ty: không, chỉ nhân viên nội bộ nhận.`,
    },
    {
      tieuDe: "Câu hỏi thường gặp",
      noiDung: `### Sao trang đơn không ghi ai phụ trách?

Tài khoản đối tác không xem tên người phụ trách đơn, nên trang đơn và danh sách đơn không có phần này. Muốn biết ai lo đơn thì gọi văn phòng.

### Sao tôi không thấy Trang chủ?

Trang chủ là màn tổng hợp của văn phòng. Tài khoản đối tác mở Nền tảng sẽ vào thẳng danh sách đơn của mình.

### Sao thẻ dịch vụ không có nút Sửa giá?

Đối tác dùng giá bán lẻ của danh mục nên không sửa đơn giá. Cần giá khác thì nhờ văn phòng.

### Đơn tôi gửi rồi, ai sẽ lo cho khách?

Đơn đã xác nhận chờ nhân viên Tour Đảo bấm nhận. Khi đơn được xác nhận mà chưa có người lo, nhân viên nhận được thông báo. Đơn của bạn được xác nhận hoặc bị huỷ thì bạn nhận thông báo trong hộp thông báo (không kèm tên người xử lý).

### Tôi quên mã PIN

Máy đã bật Face ID: vào [[Tôi]], bấm [[Quên PIN? Đặt PIN mới bằng Face ID]]. Chưa bật: gọi văn phòng để đặt lại.

### Tôi muốn góp ý về Nền tảng

Bấm [[Hỗ trợ]]. Bạn xem lại được các góp ý mình đã gửi.`,
    },
    mucBatHaiLop("doi-tac"), mucNhanMaEmail("doi-tac"),
  ],
};
