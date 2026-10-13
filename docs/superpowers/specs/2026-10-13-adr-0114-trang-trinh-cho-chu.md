Hồ sơ có ngày, trình chủ duyệt; chưa phải quyết định.

# Trang trình chủ: duyệt đề xuất ADR-0114 (sửa số khách), 2026-10-13

## Tóm lại

ADR-0114 đổi ba điều khi văn phòng sửa số khách trên một đơn đã xác nhận: Nền tảng nhắc màu đỏ khi bớt khách mà đơn vẫn còn giảm giá; trang đơn cho thấy đủ các dòng số khách từ lúc khởi tạo, qua từng lần sửa, đến hiện tại; và mọi đơn bắt buộc có ít nhất một người lớn. Lý do là ba ý bạn nêu hôm nay khi xem sổ vàng: đơn 10 khách giảm giá 50.000 mà chỉ còn 2 khách thì không thể im lặng, lịch sử đang thiếu dòng lúc đầu, và trẻ em không được đi một mình. Chưa có dòng mã nào được sửa; cần bạn gật đầu thì mới bắt đầu thi công. Cách tính số tiền phải thu vẫn giữ như ADR-0109, nên đề xuất này không làm đổi con số nào.

## Ba quyết định cần bạn gật đầu

**1. Bớt khách trên đơn có giảm giá thì nhắc màu đỏ.** Nền tảng so số khách hiện tại với số khách lúc xác nhận đơn; nếu đơn có giảm giá và số khách đã ít hơn thì hiện câu nhắc đỏ, Kế toán xem lại khuyến mại. Câu nhắc chỉ là lời cảnh báo: không đổi số tiền, không chặn việc lưu. Được là Kế toán không bỏ sót, mất là thêm một dòng đỏ ở một số đơn mà có khi khuyến mại vẫn hợp lý. Khuyến nghị: duyệt.

**2. Lịch sử số khách hiện đủ dòng, kể cả dòng lúc khởi tạo.** Khối "Lịch sử" của trang đơn sẽ có dòng lúc xác nhận (số khách và tạm tính), từng lần sửa (trước và sau), rồi kết quả hiện tại; ca SV-SK-07 sẽ ra ba dòng: 4 người lớn (2.000.000), 3 (1.500.000), 5 (2.500.000). Dòng đầu suy ra từ số liệu đã lưu sẵn, không cần thêm cột hay nhập lại dữ liệu cũ, và ai được xem lịch sử vẫn như cũ. Khuyến nghị: duyệt.

**3. Mỗi đơn có ít nhất một người lớn, tính trên cả đơn.** Máy chủ sẽ từ chối khi lập đơn, lưu nháp, xác nhận và sửa số khách; ca SV-SK-10 (bớt còn 0 người lớn) từ nay là ca bị từ chối thay vì ca tính ra tạm tính 0. Được là chặn đúng chỗ trẻ em đi một mình; mất là một số đơn cũ hay đơn nhập tay có thể bị vướng (xem rủi ro bên dưới). Đề xuất kèm ba điều khoản: người cao tuổi được tính là người đi kèm; dịch vụ tính theo nhóm hoặc nhập tay chỉ có ô "số khách" nên coi là người lớn; đơn cũ đang có 0 người lớn không bị khoá thêm, chỉ bị chặn khi lần sửa đưa từ 1 người lớn trở lên xuống 0. Khuyến nghị: duyệt cả ba điều khoản.

## Rủi ro lớn nhất

Quyết định 3 đổi luật ở máy chủ và chạm dữ liệu đơn thật, nên nếu production đang có đơn đã xác nhận với 0 người lớn thì luật mới phải không làm kẹt các đơn đó; tôi không đọc được dữ liệu production nên số đơn như vậy là **chưa kiểm**. Vì đây là việc lớn, khi thi công phải có người kiểm độc lập chỉ đọc, và sổ hàng rào phải ghi ngày quan sát luật chặn thật trước khi coi là hàng rào.

## Điểm cần chủ biết

- **Câu gốc của bạn là "số người lớn luôn phải lớn hơn 1".** Đề xuất, theo lựa chọn bạn đã trả lời trong chat, hiểu là "ít nhất 1 người lớn". Nếu bạn thật sự muốn từ 2 người lớn trở lên thì phải nói lại, vì luật sẽ chặt hơn nhiều.
- **Chữ "người lớn" bị nới:** đề xuất tính cả người cao tuổi là người đi kèm, vì bạn nói lý do là trẻ em phải đi cùng người lớn. Nếu bạn muốn đúng nghĩa đen "người lớn" thì chỉ đổi một hằng số, nhưng đơn chỉ có người cao tuổi sẽ bị từ chối.
- **Bạn nói "mọi đơn"**, còn đề xuất không chặn thêm đơn cũ đã có 0 người lớn, chỉ cảnh báo trong kiểm tra dữ liệu. Đây là chỗ lệch có chủ ý, để không khoá các đơn đang chạy.
- **Nhắc đỏ tính theo trạng thái, không theo từng lần bớt.** Bạn chọn "nhắc mỗi lần bớt khách"; đề xuất so với lúc xác nhận, nên đơn bớt từ 10 xuống 2 rồi tăng lên 3 vẫn còn nhắc đỏ cho đến khi đủ lại 10. Tôi cho là hợp ý bạn nhưng đây là cách diễn giải.
- **Ví dụ "giá 50":** đề xuất hiểu là giảm giá 50.000 đồng (10 người lớn × 500.000) và thêm làm ca mới SV-SK-12; con số đồng do người soạn chọn cho tròn, bạn xem có đúng ý không.
- **Hàng rào bị đổi:** phiếu kiểm của ADR-0109 đang đòi sổ vàng có ca "tạm tính về 0". Ca đó chính là SV-SK-10, nên đề xuất thay yêu cầu này bằng yêu cầu "có ca bị từ chối vì không còn người lớn"; bạn duyệt ADR là duyệt luôn việc thay này.
- **Đề xuất soạn trước khi 5 ca được xác nhận.** Đề xuất ghi cả 9 ca cũ đều phải xác nhận lại, nhưng sau đó Kế toán đã xác nhận SV-SK-01, 02, 03, 05, 06. Hai khoá đáp án mới (nhắc đỏ, lịch sử) sẽ được thêm vào mọi ca; 5 ca đã xác nhận có cần xác nhận lại hay không là **chưa kiểm**, và đề xuất chưa trả lời.

## Sau khi bạn duyệt

Mã được sửa theo kế hoạch rồi sổ vàng cập nhật đáp án; sau đó Kế toán xác nhận lại 6 ca còn chờ là SV-SK-04, 07, 08, 09, 10 và 11, cộng ca mới SV-SK-12. Việc này cần phát hành bản mới (có triển khai) vì đổi cả máy chủ lẫn giao diện.

Văn bản gốc để đối chiếu: `docs/superpowers/specs/2026-10-13-sua-so-khach-adr-0114/01-de-xuat-adr-0114.md`, trang ghép cùng thư mục, kế hoạch `docs/superpowers/plans/2026-10-13-sua-so-khach-adr-0114-ke-hoach.md`.
