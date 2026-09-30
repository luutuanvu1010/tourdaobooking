// Hướng dẫn: Bán hàng + Thực tập sinh (bản 1.40). Luật viết ở src/shared/huong-dan.ts; nguồn đối chiếu docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/ban-hang.md.
import type { NhomHuongDan } from "./huong-dan.ts";

export const HD_BAN_HANG: NhomHuongDan = {
  id: "ban-hang",
  tieuDe: "Bán hàng",
  quyen: ["SALES", "INTERN"],
  gioiThieu:
    "Bạn nhận khách, lập đơn dịch vụ từ danh mục, ghi giờ và nơi đón, rồi xác nhận đơn và gửi ảnh biên nhận cho khách. Bạn xem được mọi đơn của công ty, nhưng chỉ sửa, xác nhận, huỷ được đơn bạn lập hoặc đơn bạn đang phụ trách (Thực tập: chỉ đơn mình lập — xem mục cuối).",
  batDauNhanh: `1. Bấm [[Tạo đơn]].
2. Ở khối [[Chọn ngày]], chọn [[Ngày khởi hành]].
3. Gõ tên dịch vụ vào ô [[Chọn từ danh mục]], chạm dịch vụ đúng, rồi bấm **+** để nhập số khách.
4. Điền **Tên khách** và [[Số điện thoại]], rồi bấm [[Lưu, chờ xác nhận]].
5. Trên trang đơn, bấm [[Xác nhận đơn]] và đồng ý.
6. Bấm [[Xem biên nhận]], rồi [[Chia sẻ]] (gửi qua Zalo) hoặc [[Tải ảnh PNG]].`,
  muc: [
    {
      tieuDe: "Menu của bạn",
      noiDung: `### Trên máy tính (thanh bên trái)

- Nhóm **BÁN HÀNG**: [[Trang chủ]], [[Đơn hàng]] (số nhỏ bên cạnh là số đơn đang chờ xác nhận), [[Tạo đơn]], [[Danh bạ]].
- Nhóm **QUẢN TRỊ**: [[Vận chuyển]] › [[Điều phối xe]] (chưa dùng cho chuyến thật — xem mục riêng).
- Nhóm **TÔI**: [[Của tôi]], [[Góp ý / Báo lỗi]], [[Trợ giúp]]. Nút [[Đăng xuất]] ở dưới cùng.
- Thanh trên cùng: ô tìm đơn, nút [[Tạo đơn]] và cái chuông thông báo.

### Trên điện thoại (thanh dưới đáy)

Bốn tab: [[Trang chủ]], [[Đơn hàng]], [[Tạo đơn]], [[Tôi]]. Trong trang [[Tôi]] có [[Danh bạ]], [[Điều phối xe]], [[Góp ý / Báo lỗi]], [[Trợ giúp]], [[Đăng xuất]] và nút [[Bật thông báo trên điện thoại]].`,
    },
    {
      tieuDe: "Lập đơn mới",
      noiDung: `> Ví dụ: chị Lan gọi đặt tour 4 đảo cho 2 người lớn và 1 trẻ em, ngày mai, đón 7 giờ 30 tại khách sạn Biển Xanh trên đường Trần Phú, đã chuyển khoản trước một phần.

1. Bấm [[Tạo đơn]].
2. Ở khối [[Chọn ngày]], chọn [[Ngày khởi hành]]. Ngày này áp cho **mọi dịch vụ** trong đơn.
3. Ở khối [[Dịch vụ]], gõ vào ô [[Chọn từ danh mục]] (tên hoặc mã, ví dụ "4 đảo"), rồi chạm dịch vụ đúng. App báo ngắn đã thêm và hiện một thẻ dịch vụ.
   - Danh mục dài: bấm một chip ở hàng [[Nhóm dịch vụ]] để chỉ thấy dịch vụ của nhóm đó; app nhớ lựa chọn trên máy này.
   - Dịch vụ hiện mờ, ghi "chưa có giá" hoặc "chưa hỗ trợ", thì không chọn được — báo Quản trị.
   - Dịch vụ đã có trong đơn mang nhãn "đã chọn".
4. Trên thẻ, bấm **+** và **−** để nhập số khách theo từng loại ([[Người lớn]], [[Trẻ em]], [[Người cao tuổi]], [[Em bé]] — tuỳ dịch vụ). Dòng tiền hiện ngay bên dưới.
   - Dịch vụ tính theo nhóm chỉ có một ô [[Số khách]]; app tự tính số lượt.
   - Mỗi dịch vụ tối đa 50 khách, phải có ít nhất 1 khách không phải em bé.
   - Sửa được đơn giá; dòng khác giá danh mục hiện nhãn [[Khác giá danh mục]].
5. Bấm dòng [[Thông tin chuyến]] trên thẻ để mở ra, điền [[Giờ khởi hành]], [[Giờ đón]], [[Điểm đón]], và nếu có thì [[Ngày check-in]], [[Giờ check-in]], [[Nơi check-in]], [[Ghi chú dịch vụ]]. Khi thu gọn, dòng tóm tắt ghi giờ đón, nơi đón và giờ check-in.
6. Cần thêm dịch vụ khác thì lặp lại bước 3 đến 5 (tối đa 20 dịch vụ). Bấm [[Xoá]] trên thẻ để bỏ một dịch vụ.
7. Khối [[Thanh toán]]: [[Giảm giá (₫)]], [[Thanh toán trước (₫)]], [[Hình thức]] ([[Chuyển khoản]] — mặc định, [[Tiền mặt]], [[Khác]]), [[Người nhận tiền]], [[Ghi chú thanh toán]]. Tiền trả trước được ghi vào sổ ngay sau khi lưu đơn.
8. Khối [[Thông tin khách hàng]]: điền **Tên khách**, [[Số điện thoại]] (bắt buộc), [[Email]], [[Ghi chú / yêu cầu đặc biệt]].
   - Gõ xong số điện thoại, app tìm hồ sơ trùng số. Đúng người thì bấm [[Dùng hồ sơ này]]; khách mới thì bấm [[Tạo hồ sơ mới]]. Không chọn gì vẫn lưu được.
   - Nút [[Sử dụng thông tin của tôi]] điền tên và số của chính bạn.
9. Khối [[Người phụ trách]]: để trống thì đơn ở trạng thái [[Chờ nhận]] — hướng dẫn viên nào cũng nhận được. Muốn giao luôn thì bấm [[Chọn người phụ trách]], tìm tên, chạm người đó. Đổi ý thì bấm [[Đổi]] hoặc [[Bỏ chọn — để Chờ nhận]].
10. Xem khối [[Tóm tắt]] rồi bấm [[Lưu, chờ xác nhận]]. Đơn lưu ở trạng thái [[Chờ xác nhận]]; app chuyển sang trang đơn và tự mở hộp ảnh biên nhận.

> Lưu ý: số ở khối Tóm tắt chỉ để xem trước; máy chủ tính lại khi lưu. Thiếu gì thì app hiện khung đỏ [[Chưa lưu được — kiểm tra lại:]] kèm danh sách lỗi.`,
    },
    {
      tieuDe: "Sửa đơn đang chờ xác nhận",
      noiDung: `1. Mở đơn từ [[Đơn hàng]] hoặc [[Trang chủ]].
2. Bấm [[Sửa]]. Form giống lúc lập.
3. Sửa xong bấm [[Lưu thay đổi]].

> Ví dụ: chị Lan báo thêm 1 người lớn → mở đơn → [[Sửa]] → Người lớn từ 2 lên 3 → [[Lưu thay đổi]].

> Lưu ý: nếu người khác vừa sửa cùng đơn, app báo đơn vừa được người khác cập nhật — mở lại đơn rồi sửa tiếp.`,
    },
    {
      tieuDe: "Xác nhận đơn",
      noiDung: `1. Mở đơn đang [[Chờ xác nhận]].
2. Bấm [[Xác nhận đơn]]. App hỏi lại và nhắc: sau khi xác nhận, dịch vụ, số khách và tiền sẽ bị khoá — chỉ còn sửa được thông tin chuyến. Bấm đồng ý.
3. Đơn chuyển sang [[Đã xác nhận]].

App chỉ cho xác nhận khi mỗi dịch vụ có ngày khởi hành, ngày đó chưa qua và không quá 365 ngày tới, mỗi dịch vụ có khách, và không còn chặng đón sát giờ chưa được duyệt (xem "Đơn sát giờ — Đặt gấp"). Thiếu thì app báo [[Chưa đủ thông tin chuyến để xác nhận đơn.]] kèm từng dịch vụ và liên kết [[Sửa]].

> Lưu ý: giờ đón và nơi đón không bắt buộc để xác nhận, nhưng nên điền đủ trước khi gửi khách.`,
    },
    {
      tieuDe: "Gửi ảnh biên nhận cho khách",
      noiDung: `1. Trên trang đơn, bấm [[Xem biên nhận]] (lần đầu sau khi lập đơn, hộp này tự mở).
2. Hộp [[Xác nhận đơn để gửi khách]] vẽ ảnh gồm thông tin công ty, mã đơn, trạng thái, khách, dịch vụ, tiền.
3. Bấm [[Tải ảnh PNG]] để lưu về máy, hoặc [[Chia sẻ]] (chỉ có trên máy hỗ trợ, ví dụ iPhone) để gửi thẳng qua Zalo.

> Ví dụ: xác nhận xong đơn của chị Lan → [[Xem biên nhận]] → [[Chia sẻ]] → chọn Zalo → gửi chị Lan.

- Ảnh ghi trạng thái lúc tạo ảnh: đơn chưa xác nhận thì ảnh ghi "Chờ xác nhận". Nên gửi **sau** khi xác nhận.
- Đơn chưa có người phụ trách thì ảnh ghi đơn đang chờ hướng dẫn viên nhận khách.
- Hộp báo chưa tạo được ảnh thì bấm [[Thử lại]].`,
    },
    {
      tieuDe: "Người phụ trách đơn",
      noiDung: `Khối [[Người phụ trách]] trên trang đơn cho biết ai đang lo đơn, hoặc [[Chờ nhận]].

- Đơn chưa có ai: bấm [[Nhận phụ trách]] để tự nhận, kể cả đơn người khác lập. Nhận rồi bạn sửa, xác nhận, huỷ được đơn đó.
- Đơn bạn lập hoặc đang phụ trách: bấm [[Chọn người phụ trách]] hoặc [[Đổi người phụ trách]], chọn người, bấm [[Lưu người phụ trách]].
- Người nhận được đơn gồm hướng dẫn viên, bán hàng và quản trị.`,
    },
    {
      tieuDe: "Danh sách đơn và Trang chủ",
      noiDung: `### Đơn hàng

1. Bấm [[Đơn hàng]].
2. Gõ vào ô tìm (mã đơn, tên, số điện thoại), hoặc bấm nút **Lọc** để lọc cùng lúc theo ngày đi, dịch vụ, trạng thái ([[Chờ xác nhận]], [[Đã xác nhận]], [[Đã huỷ]]) và người lập ([[Đơn tôi lập]], hoặc gõ tên để chọn từng người đã lập đơn), rồi bấm [[Áp dụng]]. Điều kiện đang lọc hiện thành nhãn trên danh sách; bấm × để bỏ từng cái, [[Xoá lọc]] để bỏ hết. Máy nhớ bộ lọc cho lần sau.
3. Mỗi thẻ hiện mã, trạng thái, ngày, khách, tiền; mở phần xổ xuống để thấy người phụ trách ("HDV: tên" hoặc [[Chờ nhận]]). Bấm [[Tải thêm]] để xem đơn cũ hơn.

Ô tìm trên thanh trên cùng cũng đưa bạn tới đây, kèm từ bạn gõ.

### Trang chủ

- Ba ô của cả công ty: [[Còn thiếu tiền]], [[Đơn chờ xác nhận]], [[Chưa có người phụ trách]] — bấm để sang [[Đơn hàng]].
- [[Chuyến đón]]: đơn đã xác nhận, xếp theo giờ đón; bấm [[Hôm nay]] / [[Ngày mai]] / [[Ngày kia]] để đổi ngày; trên điện thoại có nút [[Gọi]] khách.
- [[Doanh thu của tôi]]: chỉ đơn **bạn lập** đã xác nhận trong tuần.`,
    },
    {
      tieuDe: "Thông báo",
      noiDung: `- Bấm chuông để xem hai ngăn [[Của tôi]] và [[Tất cả]]. Mở ra là coi như đã đọc; bấm một tin để mở đúng đơn.
- Bạn được báo khi có người nhận, giao, xác nhận hay huỷ đơn liên quan tới bạn, và khi có đơn vừa xác nhận mà chưa có người phụ trách. Lưu đơn nháp **không** báo ai.
- Tin quan trọng của công ty hiện dải nhắc: bấm [[Đọc và bấm Đã hiểu]], rồi [[Đã hiểu]].
- Muốn nhận thông báo trên màn hình khoá: vào [[Tôi]] → [[Bật thông báo trên điện thoại]] → cho phép. Trên iPhone phải mở app từ biểu tượng ngoài màn hình chính.
- Danh sách đơn và trang đơn tự làm mới khi người khác sửa đơn.`,
    },
    {
      tieuDe: "Điều phối xe — chưa dùng cho chuyến thật",
      noiDung: `App đã có màn [[Điều phối xe]] (tạo chuyến, xếp khách lên xe) và Bán hàng được xếp chuyến. **Nhưng chủ công ty đã quyết: CHƯA dùng màn này cho chuyến thật** cho tới khi có màn nhập tên khách. Văn phòng vẫn điều xe như cũ. Bạn có thể mở xem, đừng tạo chuyến thật.

Khi được dùng (sau này): cột [[Cần xử lý]] có mục "Giờ hẹn đổi — gọi báo khách", người xử lý là người phụ trách đơn. Gọi khách xong bấm [[Đã gọi báo]]; nhầm thì bấm [[Bỏ đánh dấu]]. Bạn chỉ bấm được cho đơn mình lập hoặc đang phụ trách.`,
    },
    {
      tieuDe: "Tình huống hay gặp",
      noiDung: `### Khách đổi giờ đón (đơn đã xác nhận)

> Ví dụ: chị Lan báo đổi đón từ 7:30 sang 8:00.

1. Mở đơn → bấm [[Sửa thông tin chuyến]].
2. Sửa [[Giờ đón]] (hoặc [[Điểm đón]], ngày khởi hành của cả đơn…).
3. Bấm [[Lưu thông tin chuyến]].
4. App nhắc bản xác nhận đã gửi khách có thể lỗi thời → bấm [[Xem biên nhận]] và gửi lại ảnh mới.
5. Tự gọi hoặc nhắn hướng dẫn viên phụ trách: app chưa tự báo cho họ khi giờ hoặc nơi đón đổi (chưa có ở bản này).

> Lưu ý: nếu giờ đón mới cách bây giờ dưới mốc 6 giờ, app từ chối và chỉ Quản trị sửa được — hãy nhờ Quản trị. Muốn đổi hồ sơ khách của đơn đã xác nhận thì bấm [[Đổi khách]].

### Khách đổi số người hoặc dịch vụ sau khi đã xác nhận

Sau xác nhận, dịch vụ, số khách và tiền **bị khoá** với Bán hàng. Hiện chỉ hướng dẫn viên đang phụ trách đơn sửa được số khách, tới **hết ngày đi**. Hãy báo hướng dẫn viên đó; qua ngày đi thì nhờ tài khoản Toàn quyền. Quản trị cũng KHÔNG sửa được. Tiền của đơn đã xác nhận không ai sửa được trong app, trừ tài khoản Toàn quyền. Việc cho người lập đơn, Quản trị, Kế toán sửa số khách sau xác nhận đang chờ làm (chưa có ở bản này).

### Đơn sát giờ — Đặt gấp

> Ví dụ: 10 giờ sáng khách gọi đặt đưa đón lúc 13 giờ cùng ngày.

1. Lập đơn như thường. Khi giờ đón cách bây giờ dưới mốc (hiện là 6 giờ), cuối thẻ dịch vụ hiện dải vàng báo còn bao lâu tới giờ đón, kèm dòng [[Lưu nháp được. Xác nhận cần Quản trị duyệt đặt gấp.]]
2. Bấm [[Lưu, chờ xác nhận]] như thường.
3. Trên trang đơn, nút [[Xác nhận đơn]] bị khoá, kèm dòng [[Cần Quản trị duyệt đặt gấp]].
4. Gọi Quản trị, đọc mã đơn. Quản trị mở đơn, bấm [[Đặt gấp]], chọn lý do, bấm [[Duyệt đặt gấp]].
5. Chặng đó hiện nhãn "Đặt gấp". Lúc này bạn bấm [[Xác nhận đơn]].

> Lưu ý: nếu sau khi Quản trị duyệt mà bạn sửa ngày, giờ hoặc nơi đón của chặng đó (khi đơn còn chờ xác nhận), dấu đặt gấp mất — phải nhờ duyệt lại. Bạn không tự bấm Đặt gấp được.

### Thiếu thông tin chuyến

- Chưa biết giờ đón: vẫn lưu được; thẻ dịch vụ ghi "Chưa có giờ / nơi đón". Bổ sung sau bằng [[Sửa]] (đơn chờ xác nhận) hoặc [[Sửa thông tin chuyến]] (đơn đã xác nhận).
- Ngày khởi hành đã qua hoặc quá 365 ngày: app cho lưu nhưng báo chưa thể xác nhận.
- Giờ đón sau giờ khởi hành: app nhắc kiểm tra lại.

### Khách huỷ

1. Mở đơn → bấm [[Huỷ đơn]].
2. App hỏi lại và nhắc việc huỷ không thể hoàn tác → đồng ý.
3. Đơn chuyển sang [[Đã huỷ]]. Không mở lại được — khách đặt lại thì lập đơn mới.

Huỷ được cả đơn chờ xác nhận lẫn đã xác nhận, nếu là đơn bạn lập hoặc đang phụ trách. Bán hàng không có ô ghi lý do huỷ.

### Hướng dẫn viên nhận, huỷ, sửa đơn — bạn thấy gì

- **HDV bấm Nhận**: thẻ đơn đổi từ [[Chờ nhận]] sang "HDV: tên"; bạn nhận tin nếu đơn liên quan tới bạn.
- **HDV huỷ đơn** (họ phải chọn lý do): đơn thành [[Đã huỷ]], bạn nhận tin huỷ; khối [[Lịch sử]] của trang đơn có dòng huỷ đơn kèm lý do.
- **HDV sửa số khách**: khối [[Lịch sử]] có dòng sửa số khách kèm lý do. App không gửi thông báo cho bạn về việc này (chưa có ở bản này) — hãy xem Lịch sử.
- **HDV từ chối đơn**: chưa có nút này (chưa có ở bản này).`,
    },
    {
      tieuDe: "Thực tập — khác Bán hàng ở đâu",
      noiDung: `Thực tập lập đơn, sửa, xác nhận, huỷ **đơn của chính mình** giống Bán hàng. Khác ở mấy điểm sau:

- **Chỉ thấy đơn mình lập.** Mở đơn người khác sẽ bị từ chối.
- **Menu hẹp hơn**: không có [[Trang chủ]], [[Danh bạ]], [[Điều phối xe]]. Mục [[Đơn hàng]] chỉ có đơn bạn lập. Trên điện thoại có tab [[Đơn hàng]], [[Tạo đơn]] và [[Tôi]]. Mở app cũng tự vào danh sách đơn của bạn.
- **Không chọn người phụ trách** khi lập đơn: khối [[Người phụ trách]] không hiện, đơn luôn ở [[Chờ nhận]].
- **Không thấy ai phụ trách đơn**: trang đơn không có khối Người phụ trách, thẻ đơn ở danh sách không có dòng "HDV: tên". Ảnh biên nhận cũng không có dòng người phụ trách.
- Ô tra hồ sơ khách có thể báo không tra được hồ sơ — vẫn lưu đơn bình thường.
- **Sau khi xác nhận, Thực tập không sửa được thông tin chuyến và không đổi khách.** Trang đơn không có nút [[Sửa thông tin chuyến]] và [[Đổi khách]]. Cần đổi giờ đón thì nhờ Bán hàng phụ trách hoặc Quản trị.
- **Thực tập không nhận phụ trách và không giao đơn**: không có nút [[Nhận phụ trách]]; cần người phụ trách thì nhờ Bán hàng.`,
    },
    {
      tieuDe: "Điều bạn không làm được — hỏi ai",
      noiDung: `- Duyệt đặt gấp cho đơn sát giờ; sửa giờ đón sát giờ sau xác nhận → **Quản trị**.
- Sửa, xác nhận, huỷ đơn người khác lập mà bạn không phụ trách → người lập đơn, người phụ trách, hoặc **Quản trị** (đơn đang [[Chờ nhận]] thì bạn tự bấm [[Nhận phụ trách]]).
- Sửa số khách sau khi đã xác nhận → hướng dẫn viên đang phụ trách đơn, tới hết ngày đi (Quản trị không sửa được); qua ngày đi → tài khoản Toàn quyền. Dịch vụ, tiền → chỉ tài khoản Toàn quyền.
- Thêm, sửa dịch vụ và giá trong danh mục; dịch vụ "chưa có giá" → **Quản trị**.
- Tiền thu thêm, hoàn tiền, hoá đơn → **Kế toán** (app chưa có chỗ ghi thu tiền ở bản này).
- Quên mã PIN, bị khoá đăng nhập → **Quản trị**.
- Điều xe cho chuyến thật → làm như cũ, ngoài app.
- Báo lỗi app, góp ý → [[Góp ý / Báo lỗi]].`,
    },
    {
      tieuDe: "Câu hỏi thường gặp",
      noiDung: `### Lưu xong đơn đã chắc chắn chưa?

Chưa. Đơn mới lưu ở trạng thái [[Chờ xác nhận]]. Phải bấm [[Xác nhận đơn]] thì mới chốt.

### Sao tôi không bấm được "Xác nhận đơn"?

Hoặc có chặng đón dưới mốc 6 giờ chưa được Quản trị duyệt (dòng [[Cần Quản trị duyệt đặt gấp]] hiện ngay dưới), hoặc thiếu thông tin chuyến (app liệt kê từng dịch vụ kèm liên kết [[Sửa]]).

### Sao tôi không thấy nút Sửa, Xác nhận, Huỷ?

Đơn không phải của bạn và bạn không phụ trách; app ghi rõ ai được sửa. Nếu đơn đang [[Chờ nhận]], bạn có thể bấm [[Nhận phụ trách]].

### Gửi biên nhận rồi mới đổi giờ đón thì sao?

Sau khi bấm [[Lưu thông tin chuyến]], bấm [[Xem biên nhận]] và gửi lại ảnh mới cho khách.

### Hai dịch vụ khác ngày trong cùng một đơn được không?

Không. Một đơn một ngày khởi hành. Khác ngày thì lập hai đơn.

### Danh mục báo chưa cập nhật được giá mới từ Google Sheet?

App đang dùng giá đã lưu. Kiểm tra lại giá trước khi gửi khách và báo Quản trị.

### Có dịch vụ nhập tay không?

Có khi Toàn quyền bật "Dịch vụ nhập tay" (mặc định tắt). Khi bật, form lập đơn có nút "+ Dịch vụ nhập tay": gõ tên dịch vụ, từng dòng tiền (mô tả, số lượng, đơn giá). Khi tắt, dịch vụ nhập tay đã có trên đơn chỉ xem được; muốn đổi thì xoá và chọn lại từ danh mục. Tài khoản Đối tác không dùng được dịch vụ nhập tay; bạn thêm dịch vụ nhập tay vào đơn nháp của Đối tác thì Đối tác không tự xác nhận được đơn đó — văn phòng xác nhận thay.

### Xem bản mới có gì ở đâu?

Vào [[Trợ giúp]]: có số phiên bản và nhật ký thay đổi.`,
    },
  ],
};
