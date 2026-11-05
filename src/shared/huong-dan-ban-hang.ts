// Hướng dẫn: Bán hàng + Thực tập sinh (bản 1.40). Luật viết ở src/shared/huong-dan.ts; nguồn đối chiếu docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/ban-hang.md.
import type { NhomHuongDan } from "./huong-dan.ts";

export const HD_BAN_HANG: NhomHuongDan = {
  id: "ban-hang",
  tieuDe: "Bán hàng",
  quyen: ["SALES", "INTERN"],
  gioiThieu:
    "Bạn nhận khách, lập đơn dịch vụ từ danh mục, ghi giờ và nơi đón, rồi xác nhận đơn và gửi ảnh biên nhận cho khách. Bạn xem được mọi đơn của công ty, nhưng chỉ sửa, xác nhận, huỷ được đơn bạn lập hoặc đang phụ trách (Thực tập: chỉ đơn mình lập — xem mục cuối).",
  batDauNhanh: `1. Bấm [[Tạo đơn]].
2. Ở đầu trang, chọn [[Ngày khởi hành]], rồi điền **Tên khách** và [[Số điện thoại]].
3. Gõ tên dịch vụ vào ô [[Tìm theo tên hoặc mã dịch vụ]], chạm dịch vụ đúng, rồi bấm **+** để nhập số khách.
4. Bấm [[Lưu đơn (chưa xác nhận)]].
5. Trên trang đơn, bấm [[Xác nhận đơn]] và đồng ý.
6. Bấm [[Xem ảnh gửi khách]], rồi [[Chia sẻ]] (gửi qua Zalo) hoặc [[Tải ảnh về máy]].`,
  muc: [
    {
      tieuDe: "Menu của bạn",
      noiDung: `### Trên máy tính (thanh bên trái)

- **Đầu menu**: [[Tạo đơn]], [[Trang chủ]], [[Đơn hàng]] (số nhỏ bên cạnh là số đơn chưa xác nhận), [[Danh bạ]].
- Nhóm **VẬN CHUYỂN**: [[Điều phối xe]], [[Xe đang chạy]].
- Nhóm **THIẾT LẬP** (bấm để mở, thu gọn): [[Hoa hồng đối tác]] (chỉ xem), [[Luật bán]], [[Đặc điểm dịch vụ]].
- **Chân menu**: [[Của tôi]], [[Hỗ trợ]], [[Hướng dẫn]]. Nút [[Đăng xuất]] ở dưới cùng.
- Thanh trên cùng: ô tìm đơn, nút [[Tạo đơn]] và cái chuông thông báo.

### Trên điện thoại (thanh dưới đáy)

Bốn tab: [[Trang chủ]], [[Đơn hàng]], [[Tạo đơn]], [[Tôi]]. Trong trang [[Tôi]] có [[Danh bạ]], [[Điều phối xe]], [[Hỗ trợ]], [[Hướng dẫn]], [[Đăng xuất]] và nút [[Bật thông báo trên điện thoại]].`,
    },
    {
      tieuDe: "Lập đơn mới",
      noiDung: `> Ví dụ: chị Lan gọi đặt tour 4 đảo cho 2 người lớn và 1 trẻ em, ngày mai, đón 7 giờ 30 tại khách sạn Biển Xanh, đã chuyển khoản trước một phần.

1. Bấm [[Tạo đơn]]. Trang chia bốn bước; chạm tên bước trên thanh đầu trang để nhảy tới.
2. Chọn [[Ngày khởi hành]]; ngày này áp cho **mọi dịch vụ** trong đơn.
3. Khối [[Khách hàng]]: điền **Tên khách đi tour**, [[Số điện thoại]] (bắt buộc). Ghi [[Email]] hoặc [[Ghi chú / yêu cầu đặc biệt]] thì bấm [[Email, ghi chú]].
   - Gõ xong số điện thoại sẽ hiện hồ sơ trùng số: đúng người thì bấm [[Dùng hồ sơ này]], khách mới thì [[Tạo hồ sơ mới]]; không chọn vẫn lưu được.
   - Nút [[Điền thông tin của tôi]] điền tên và số của chính bạn.
   - Khách đặt qua đại lý hoặc cộng tác viên: ở hàng [[Đơn của]] bấm [[Qua đối tác]] (mặc định [[Khách lẻ]]), rồi chọn người đó để tính hoa hồng.
4. Ở khối [[Dịch vụ]], gõ vào ô [[Tìm theo tên hoặc mã dịch vụ]] (ví dụ "4 đảo"), rồi chạm dịch vụ đúng: dòng hiện "✓ đã thêm" và thẻ dịch vụ hiện ra.
   - Danh mục dài: chạm một nhóm dưới ô tìm ([[Tất cả]] để xem lại). Dịch vụ gắn ☆ nằm ở mục "★ Hay dùng".
   - Dịch vụ mờ, ghi "chưa có giá" hoặc "chưa hỗ trợ", không chọn được — báo Quản trị.
5. Trên thẻ, bấm **+** và **−** để nhập số khách theo từng loại ([[Người lớn]], [[Trẻ em]], [[Người cao tuổi]], [[Em bé]] — tuỳ dịch vụ).
   - Dịch vụ tính theo nhóm chỉ có một ô [[Số khách]]; số lượt tự tính.
   - Mỗi dịch vụ tối đa 50 khách, phải có ít nhất 1 khách không phải em bé. Cả đơn cần ít nhất một người lớn.
   - [[Sửa giá đơn này]] để đổi đơn giá; dòng đã sửa hiện nhãn [[Khác giá danh mục]].
6. Phần [[Đưa đón]] trên thẻ: mỗi dịch vụ phải chọn [[Đón]] hoặc [[Không đón]] (có mẫu đưa đón thì [[Đón]] chọn sẵn). Mỗi lượt có giờ đón (chạm khung giờ hoặc [[Giờ khác]]), [[Nơi đón]], [[Nơi trả]] (chọn điểm có sẵn hoặc [[Gõ tự do…]]). [[Ngày đón]] tự lấy ngày khởi hành (khác ngày: [[Đón khác ngày]]). Lượt đủ thông tin gập thành một dòng; chạm để sửa. [[Xe riêng]] và [[Xe tối thiểu]] (số chỗ, không kể tài xế) nằm trong [[Thêm chi tiết (xe riêng, số chỗ)]]. Bấm dòng [[Thông tin chuyến]] để điền [[Giờ khởi hành]] và nếu có thì [[Có mặt lúc]], [[Có mặt tại]] (khác ngày: [[Có mặt khác ngày]]), [[Ghi chú dịch vụ]].
7. Thêm dịch vụ: lặp bước 4–6 (tối đa 20). Mỗi lúc chỉ một thẻ mở; chạm dòng gập để mở, thùng rác để bỏ.
8. Khối [[Thanh toán]]: [[Giảm giá (₫)]], [[Ghi chú thanh toán]]. Đơn chưa xác nhận thì chưa ghi thu tiền được: khách trả tiền thì bấm [[Ghi khoản thu]] trên trang đơn sau khi đơn đã **xác nhận**.
9. Khối [[Người phụ trách]] (Bán hàng): bấm [[Chọn người phụ trách]] rồi chạm tên để mời; để trống thì đơn ở [[Chờ Bán hàng nhận]]. Khối [[Hướng dẫn viên]] (nếu hiện): để trống thì đơn ở [[Chờ nhận]]. Đổi ý: [[Đổi]] hoặc [[Bỏ chọn — để Chờ Bán hàng nhận]].
10. Xem tổng ở thanh dưới cùng (chạm để xem chi tiết; máy tính: [[Tóm tắt]]) rồi bấm [[Lưu đơn (chưa xác nhận)]]. Đơn lưu ở [[Chưa xác nhận]], rồi trang đơn mở kèm hộp ảnh biên nhận.

> Lưu ý: số tiền chỉ để xem trước; máy chủ tính lại khi lưu. Thiếu gì thì khung đỏ [[Chưa lưu được — kiểm tra lại:]] hiện ngay trên nút Lưu.`,
    },
    {
      tieuDe: "Sửa đơn chưa xác nhận",
      noiDung: `1. Mở đơn từ [[Đơn hàng]] hoặc [[Trang chủ]].
2. Bấm [[Sửa]]. Form giống lúc lập.
3. Sửa xong bấm [[Lưu thay đổi]].

> Ví dụ: chị Lan báo thêm 1 người lớn → mở đơn → [[Sửa]] → Người lớn từ 2 lên 3 → [[Lưu thay đổi]].

> Lưu ý: nếu người khác vừa sửa cùng đơn, Nền tảng báo đơn vừa được cập nhật — mở lại đơn rồi sửa tiếp.`,
    },
    {
      tieuDe: "Xác nhận đơn",
      noiDung: `1. Mở đơn đang [[Chưa xác nhận]].
2. Bấm [[Xác nhận đơn]]. Hộp hỏi lại: sau khi xác nhận, dịch vụ và đơn giá bị khoá. Bấm đồng ý.
3. Đơn chuyển sang [[Đã xác nhận]].

Nền tảng chỉ cho xác nhận khi mỗi dịch vụ đã chọn Đón hoặc Không đón, có ngày khởi hành, ngày đó chưa qua và không quá 365 ngày tới, mỗi dịch vụ có khách, và không còn lượt đưa đón sát giờ chưa đặt gấp (xem "Đơn sát giờ — Đặt gấp"). Thiếu thì Nền tảng báo [[Chưa đủ thông tin chuyến để xác nhận đơn.]] kèm từng dịch vụ và liên kết [[Sửa]].

> Lưu ý: giờ đón chưa chốt vẫn xác nhận được, nhưng nên điền trước khi gửi khách.`,
    },
    {
      tieuDe: "Gửi ảnh biên nhận cho khách",
      noiDung: `1. Trên trang đơn, bấm [[Xem ảnh gửi khách]] (lần đầu sau lập đơn, hộp tự mở).
2. Hộp [[Ảnh gửi khách]] vẽ ảnh gồm thông tin công ty, mã đơn, trạng thái, khách, dịch vụ, tiền.
3. Bấm [[Tải ảnh về máy]] để lưu ảnh, hoặc [[Chia sẻ]] (chỉ có trên máy hỗ trợ, ví dụ iPhone) để gửi qua Zalo.

> Ví dụ: xác nhận xong đơn của chị Lan → [[Xem ảnh gửi khách]] → [[Chia sẻ]] → chọn Zalo → gửi chị Lan.

- Ảnh ghi trạng thái lúc tạo ảnh: đơn chưa xác nhận thì ảnh ghi "Chờ xác nhận". Nên gửi **sau** khi xác nhận.
- Đơn chưa có Hướng dẫn viên thì ảnh ghi đơn đang chờ hướng dẫn viên nhận khách.
- Hộp báo chưa tạo được ảnh thì bấm [[Thử lại]].`,
    },
    {
      tieuDe: "Người phụ trách đơn",
      noiDung: `**Người phụ trách** là Bán hàng chịu trách nhiệm chính; **Hướng dẫn viên** đón, gặp khách, thu tiền tại cảng.

- Người được mời bấm [[Nhận phụ trách]] hoặc [[Từ chối]]. Hết ưu tiên hoặc khi họ từ chối, đơn ở [[Chờ Bán hàng nhận]] cho Bán hàng nào cũng nhận.
- Nhận rồi bạn sửa được chuyến và danh sách khách.`,
    },
    {
      tieuDe: "Danh sách đơn và Trang chủ",
      noiDung: `### Đơn hàng

1. Bấm [[Đơn hàng]].
2. Gõ vào ô tìm (mã đơn, tên, số điện thoại), hoặc bấm nút **Lọc** để lọc theo ngày đi, dịch vụ, trạng thái ([[Chưa xác nhận]], [[Đã xác nhận]], [[Đã huỷ]]) và người lập ([[Đơn tôi lập]] hoặc gõ tên người lập), rồi bấm [[Áp dụng]]. Điều kiện đang lọc hiện thành nhãn trên danh sách; bấm × để bỏ từng cái, [[Xoá lọc]] để bỏ hết. Máy nhớ bộ lọc cho lần sau.
3. Mỗi thẻ hiện mã, trạng thái, ngày, khách, tiền; mở phần xổ xuống để thấy người phụ trách ("Phụ trách: tên", "Đang mời …" hoặc [[Chờ Bán hàng nhận]]). Bấm [[Tải thêm]] để xem đơn cũ hơn.

### Trang chủ

- Máy tính có thẻ [[Lối tắt]]; bấm [[Tất cả]] để xem mọi chức năng.
- Máy tính: thẻ [[Đang chờ bạn]] liệt kê việc đang chờ, mỗi dòng có số, bấm để làm tiếp: [[Đơn nháp]], [[Đơn còn thiếu tiền]], [[Đơn chưa có người phụ trách]]. Nhãn **Toàn công ty** là số của cả công ty.
- Điện thoại: các ô số **Còn thiếu tiền**, [[Đơn nháp]], [[Chưa phụ trách]] — bấm để sang [[Đơn hàng]].
- [[Đơn đi]]: đơn đã xác nhận có ngày đi trong ngày đang chọn, xếp theo giờ đón; bấm [[Hôm nay]] / [[Ngày mai]] / [[Ngày kia]] để đổi ngày. Điện thoại có nút [[Gọi]] khách.
- [[Doanh thu của tôi]]: chỉ đơn **bạn lập** đã xác nhận trong tuần.`,
    },
    {
      tieuDe: "Thông báo",
      noiDung: `- Bấm chuông để xem hai ngăn [[Của tôi]] và [[Tất cả]]. Mở ra là coi như đã đọc; bấm một tin để mở đúng đơn.
- Bạn được báo khi có người nhận, giao, xác nhận hay huỷ đơn liên quan tới bạn, và khi có đơn vừa xác nhận mà chưa có người phụ trách. Lưu đơn nháp **không** báo ai.
- Tin quan trọng của công ty hiện dải nhắc: bấm [[Xem]], rồi [[Đã hiểu]].
- Muốn nhận thông báo trên màn hình khoá: vào [[Tôi]] → [[Bật thông báo trên điện thoại]] → cho phép. Trên iPhone phải mở Nền tảng từ biểu tượng ngoài màn hình chính.
- Danh sách đơn và trang đơn tự làm mới khi người khác sửa đơn.`,
    },
    {
      tieuDe: "Điều phối xe",
      noiDung: `Ở [[Điều phối xe]], chọn ngày; cột **Chưa xếp** có lượt đưa đón của đơn đã xác nhận. Bấm [[+ Chuyến mới]] (xe, tài xế, giờ) → [[Tạo chuyến]], rồi kéo lượt vào chuyến hoặc bấm [[Xếp vào chuyến]]. Chuyến bị giữ thì [[Mở chuyến]] xem lý do và ai xử lý.

Xe đã chạy: mở [[Xe đang chạy]], bấm chuyến. Thêm khách: [[Thêm điểm đón / thêm khách]]. Khách huỷ: [[Báo huỷ]]; ghế giữ tới khi tài xế xác nhận. Đổi nơi đón: [[Cập nhật điểm theo đơn]]. Xe hỏng: [[Gửi đề nghị cứu hộ]] nhờ xe đang chạy (gõ nơi gặp), hoặc [[Kết thúc gián đoạn (xe hỏng)]] rồi xếp khách ở khối **Cứu hộ**.

> Lưu ý: xe chỉ chạy được khi đơn đủ họ tên, năm sinh khách và nơi trả. Khi đã tới hạn chốt trước giờ xe chạy, xếp, rút khách, đổi xe, tài xế, huỷ chuyến là **điều chỉnh khẩn cấp**: bạn làm kèm lý do.

Mục "Giờ hẹn đổi — gọi báo khách" ở [[Cần xử lý]]: gọi khách rồi bấm [[Đã gọi báo]], chỉ cho đơn bạn lập hoặc phụ trách.`,
    },
    {
      tieuDe: "Luật bán và đặc điểm dịch vụ",
      noiDung: `**Luật bán**: vai trò không được đặt một dịch vụ, một nhóm, hoặc dịch vụ mang một đặc điểm; đơn có dịch vụ bị chặn thì không lập, lưu, xác nhận hay gửi được.

1. [[Luật bán]], [[Thêm luật]]: chọn vai người dùng, phạm vi, ngày.
2. [[Kết thúc ngay]]: thôi chặn từ bây giờ. [[Đặt ngày kết thúc]]: ngày đó **tính trọn** — hẹn đến hôm nay vẫn chặn tới hết hôm nay.
3. [[Đặc điểm dịch vụ]]: chọn giá trị cho từng dịch vụ. Dịch vụ «Chưa khai» không bị chặn theo đặc điểm. Đổi giá trị làm đổi luật bán thì Nền tảng hỏi lại ([[Vẫn lưu]]).`,
    },
    {
      tieuDe: "Đơn của đối tác chờ xác nhận: kiểm vé",
      noiDung: `Đơn đối tác gửi lên ở trạng thái [[Chờ xác nhận]]; khối **Xác nhận đơn** có [[Còn vé, xác nhận đơn]], [[Hết vé]] và Huỷ. Mỗi dịch vụ có dòng **Ghi chú** của đối tác và ô **Giờ đón** từng lượt. Đối tác không nhập giờ: lượt đầu ghi **(bắt buộc)**, chọn giờ rồi mới bấm [[Còn vé, xác nhận đơn]]. Giờ đã qua hạn chốt thì bấm [[Đặt gấp]] ngay trong bảng. Xác nhận xong, gọi số liên hệ trên đơn để báo giờ; số này là của đối tác khi công tắc ẩn thông tin khách đang bật.`,
    },
    {
      tieuDe: "Tình huống hay gặp",
      noiDung: `### Khách đổi giờ đón (đơn đã xác nhận)

> Ví dụ: chị Lan báo đổi đón từ 7:30 sang 8:00.

1. Mở đơn → ở khối [[Đưa đón]] bấm [[Sửa đưa đón]].
2. Sửa [[Giờ đón]] (hoặc [[Nơi đón]], [[Nơi trả]] của lượt). Ngày khởi hành của cả đơn đổi ở [[Sửa thông tin chuyến]].
3. Bấm [[Lưu]].
4. Nền tảng nhắc bản xác nhận đã gửi khách có thể lỗi thời → bấm [[Xem ảnh gửi khách]] và gửi lại ảnh.
5. Tự gọi hoặc nhắn hướng dẫn viên phụ trách: họ chưa được tự báo khi giờ hoặc nơi đón đổi.

> Lưu ý: nếu giờ đón cũ hoặc mới đã qua hạn chốt, bảng mở khung [[Đặt gấp]]: chọn lý do rồi bấm [[Duyệt đặt gấp]]. Muốn đổi hồ sơ khách của đơn đã xác nhận thì bấm [[Đổi khách]].

### Khách đổi số người hoặc dịch vụ sau khi đã xác nhận

Sau xác nhận, dịch vụ và tiền **bị khoá**. Số khách của đơn **bạn lập** thì sửa được tới khi đơn **Đã thu đủ sau dịch vụ**, kể cả sau ngày đi:

1. Trên trang đơn, bấm [[Sửa số khách dịch vụ]].
2. Bấm **+** hoặc **−**; dịch vụ nhập tay chỉ để xem.
3. Chọn lý do ([[Khách thêm người]], [[Khách bớt người]], [[Đổi dịch vụ]], [[Khác]]) rồi bấm [[Lưu số khách]].

Nền tảng tự tính lại tiền (giảm giá giữ nguyên), ghi [[Lịch sử]], báo người phụ trách, tự trả hoặc thêm ghế trên xe đã xếp. Đơn người khác lập: nhờ người lập, Kế toán hoặc Quản trị.

### Đơn sát giờ — Đặt gấp

> Ví dụ: 10 giờ sáng khách gọi đặt đưa đón lúc 13 giờ cùng ngày.

1. Lập đơn như thường. Khi giờ đón đã qua hạn chốt, cuối thẻ dịch vụ hiện dải vàng báo còn bao lâu tới giờ đón, kèm nút [[Đặt gấp]].
2. Bấm [[Đặt gấp]], chọn lý do, bấm [[Duyệt đặt gấp]]. Nền tảng lưu đơn rồi đóng dấu cho lượt đó.
3. Lượt đó mang nhãn "Điều chỉnh khẩn cấp". Lúc này bạn bấm [[Xác nhận đơn]].

> Lưu ý: sửa ngày, giờ hoặc nơi đón của lượt đã đặt gấp thì dấu mất, đặt gấp lại nếu vẫn sát giờ.

### Thiếu thông tin chuyến

- Chưa biết giờ đón: vẫn lưu được; lượt ghi "Chưa chốt giờ". Bổ sung sau bằng [[Sửa]] (đơn chưa xác nhận) hoặc [[Sửa đưa đón]] (đơn đã xác nhận).

### Khách huỷ

1. Mở đơn → bấm [[Huỷ đơn]].
2. Chọn lý do (bắt buộc) → bấm [[Huỷ đơn]]. Không hoàn tác được.
3. Đơn thành [[Đã huỷ]]; khách đặt lại thì lập đơn mới.

Huỷ được đơn bạn lập hoặc đang phụ trách. Đơn đã xếp xe chưa chạy: Nền tảng tự trả ghế; xe đang chạy: văn phòng bấm [[Báo huỷ]].

### Hướng dẫn viên nhận, huỷ, sửa đơn — bạn thấy gì

- **HDV bấm Nhận**: khối [[Hướng dẫn viên]] của đơn đổi từ [[Chờ nhận]] sang tên người nhận.
- **HDV huỷ đơn** hoặc **sửa số khách**: bạn nhận tin; khối [[Lịch sử]] có dòng kèm lý do. Đơn huỷ thành [[Đã huỷ]].
- **HDV, bạn bấm [[Từ chối đơn]]**: đơn về Chờ nhận ("được trả lại").`,
    },
    {
      tieuDe: "Thực tập — khác Bán hàng ở đâu",
      noiDung: `Thực tập lập đơn, sửa, xác nhận, huỷ **đơn của chính mình** giống Bán hàng. Khác ở mấy điểm sau:

- **Chỉ thấy đơn mình lập.** Mở đơn người khác bị từ chối.
- **Menu hẹp hơn**: không có [[Trang chủ]], [[Danh bạ]], [[Điều phối xe]]. Mục [[Đơn hàng]] chỉ có đơn bạn lập. Trên điện thoại có tab [[Đơn hàng]], [[Tạo đơn]] và [[Tôi]].
- **Mời được người phụ trách**; không chọn Hướng dẫn viên.
- **Không thấy ai phụ trách đơn** (cả trên ảnh biên nhận).
- **Sau khi xác nhận, Thực tập không có nút** [[Sửa thông tin chuyến]], [[Đổi khách]], [[Sửa số khách dịch vụ]] — nhờ người phụ trách hoặc Quản trị.
- **Không nhận phụ trách, không giao đơn**: không có nút [[Nhận phụ trách]].
- **Chỉ giá danh mục, không giảm giá**: không có [[Sửa giá đơn này]], ô giảm giá chỉ đọc; cần giá khác nhờ Bán hàng.`,
    },
    {
      tieuDe: "Điều bạn không làm được — hỏi ai",
      noiDung: `- Sửa, xác nhận, huỷ đơn người khác lập mà bạn không phụ trách → người lập đơn, người phụ trách, hoặc **Quản trị** (đơn đang [[Chờ Bán hàng nhận]] thì bạn tự bấm [[Nhận phụ trách]]).
- Sửa số khách sau khi đã xác nhận của đơn người khác lập → người lập đơn, **Kế toán** hoặc **Quản trị** (đơn bạn lập thì tự bấm [[Sửa số khách dịch vụ]]). Dịch vụ, giá → chưa sửa được, báo **Quản trị**.
- Thêm, sửa dịch vụ và giá trong danh mục; dịch vụ "chưa có giá" → **Quản trị**.
- Khách trả tiền (đơn đã xác nhận): bấm [[Ghi khoản thu]] trên đơn bạn lập. Hoàn tiền, hoá đơn → **Kế toán**.
- Quên mã PIN, bị khoá đăng nhập → **Quản trị**.
- Xe thiếu giấy tờ, tài xế thiếu bằng lái, thiếu nghỉ hay trái cam kết xe khi chưa tới hạn chốt → **Quản trị**.`,
    },
    {
      tieuDe: "Câu hỏi thường gặp",
      noiDung: `### Lưu xong đơn đã chắc chắn chưa?

Chưa. Đơn mới lưu ở trạng thái [[Chưa xác nhận]]. Phải bấm [[Xác nhận đơn]] thì mới chốt.

### Sao tôi không bấm được "Xác nhận đơn"?

Hoặc có lượt đưa đón đã qua hạn chốt chưa đặt gấp (dòng [[Đặt gấp xong thì xác nhận được.]] hiện ngay dưới; bấm [[Đặt gấp]] ở lượt đó), hoặc thiếu thông tin chuyến (Nền tảng liệt kê từng dịch vụ kèm liên kết [[Sửa]]).

### Sao tôi không thấy nút Sửa, Xác nhận, Huỷ?

Đơn không phải của bạn và bạn không phụ trách; trang ghi rõ ai được sửa. Nếu đơn đang [[Chờ Bán hàng nhận]], bạn có thể bấm [[Nhận phụ trách]].

### Hai dịch vụ khác ngày trong cùng một đơn được không?

Không. Một đơn một ngày khởi hành. Khác ngày thì lập hai đơn.

### Danh mục báo chưa cập nhật được giá mới từ Google Sheet?

Đang dùng giá đã lưu. Kiểm tra lại giá trước khi gửi khách và báo Quản trị.

### Có dịch vụ nhập tay không?

Có khi Toàn quyền bật "Dịch vụ nhập tay" (mặc định tắt): form lập đơn có nút "+ Dịch vụ nhập tay" để gõ tên và từng dòng tiền. Khi tắt, dịch vụ đã có chỉ xem. Đối tác không dùng được; đơn nháp của Đối tác có dịch vụ nhập tay thì văn phòng xác nhận thay.
`,
    },
  ],
};
