# Đề bài — đánh giá thị giác và hướng nâng cấp giao diện (24/11/2026)

> Hồ sơ có ngày. Chép nguyên văn đề bài phiên điều phối giao cho phiên đánh giá ngày 24/11/2026 (bản chính lúc giao: `277fe8e12`). Chữ giữ nguyên; chỉ hạ các tiêu đề mục xuống một bậc và thêm hai tiêu đề «Bối cảnh», «Đề bài» để tách hai phần. Không sửa lại sau khi chép.

## Bối cảnh (lời phiên giao việc)

Chủ dự án Tour Đảo Booking (kho `tourdao-sales`) ngày 24/11/2026 xin một đề bài để đánh giá toàn diện bề mặt, giao diện, bố cục, màu sắc, thị giác của Nền tảng trên máy tính và điện thoại, rồi căn cứ thực hành tốt nhất về kiến trúc thiết kế, mô hình nền tảng kinh doanh, phong cách Apple và Anthropic để chỉ hướng nâng cấp toàn diện; bối cảnh là hàng trăm đối tác, nhiều vai, nhiều màn. Giao diện đã được đo bốn lượt (27/10, 13/11, 20/11, 21/11) về cấu trúc và lỗi dùng, và đã có luật khung gốc ADR-0222 đang thi công theo đợt; phần chưa ai làm là nhận định về ngôn ngữ thị giác và hướng đi. Phiên này chỉ đánh giá và đề xuất: không sửa mã sản phẩm, không chạm bản chạy thật. Mọi đường dẫn trong đề bài đã được kiểm là có thật trên bản chính `277fe8e12`.

## Đề bài

Việc của phiên này: đánh giá toàn diện bề mặt thị giác của Nền tảng Tour Đảo Booking trên điện thoại và máy tính, rồi đề xuất hướng nâng cấp giao diện ở tầm cả hệ thống. Phiên giữ một vai là đánh giá và lập hướng: không sửa mã sản phẩm, không chạm bản chạy thật. Thi công là việc của phiên khác, sau khi chủ dự án chọn hướng.

### Vì sao làm, ai dùng kết quả

Nền tảng phục vụ hàng trăm đối tác bên ngoài (đại lý, cộng tác viên, tài xế đối tác, tổ chức đối tác có người quản lý và thành viên) bên cạnh nhân viên văn phòng. Đối tác không được đào tạo, phần lớn mở trên điện thoại, và nhìn giao diện để quyết có tin Nền tảng hay không. Hiện có khoảng 65 trang (danh sách ở `PAGES`, `src/shared/sw-policy.ts`) và 11 quyền; mỗi bộ quyền thấy một tập màn khác nhau (`src/shared/muc-giao-dien.ts`). Chủ dự án muốn biết: dưới con mắt của một nhà thiết kế sản phẩm giỏi, giao diện hôm nay đứng ở đâu, và nên đi hướng nào để thành một nền tảng kinh doanh chỉn chu, nhất quán, học từ cách làm của Apple và Anthropic. Chủ dự án không phải lập trình viên. Báo cáo là thứ để ông chọn hướng, nên phải đọc xong trong mười phút và mọi nhận định phải chỉ được vào ảnh thật.

### Điều đã có, đừng làm lại

Giao diện đã được đo bốn lượt trong một tháng (27/10, 13/11, 20/11, 21/11). Các lượt đó đo cấu trúc, bố cục, độ nhất quán và lỗi dùng: lượt 20/11 chấm 87 màn ra 476 phát hiện; lượt 21/11 dẫn tới luật khung gốc (ADR-0222, chủ duyệt 21/11), đã áp cho bốn màn mẫu, các trang còn lại chuyển theo đợt. Hồ sơ ở `docs/superpowers/specs/`, các thư mục `2026-10-27-danh-gia-ux-tong-the`, `2026-11-13-kiem-giao-dien`, `2026-11-20-danh-gia-lai-giao-dien`, `2026-11-21-khung-goc-giao-dien`; trạng thái sống của khung gốc ở `docs/superpowers/plans/2026-11-21-khung-goc-giao-dien-thi-cong-nhat-ky.md`. Đọc phần kết luận của từng hồ sơ trước khi chụp tấm ảnh nào.

Điều chưa lượt nào làm, và là phần chính của phiên này: nhận định về ngôn ngữ thị giác (màu, chữ, khoảng thở, hình khối, chiều sâu, biểu tượng, cảm giác thương hiệu) so với chuẩn bên ngoài, và một hướng đi. Trợ lý `nguoi-danh-gia-giao-dien` cố ý không chấm gu, nên đừng giao phần này cho nó. Cũng đừng nộp thêm một danh sách lỗi từng màn: 476 phát hiện cũ là đầu vào. Giá trị của phiên nằm ở chỗ gom chúng với điều nhìn thấy thành năm tới bảy nguyên nhân gốc ở tầng ngôn ngữ thị giác, rồi chỉ ra đích đến.

### Quyết định đã duyệt phải tôn trọng

Hướng đề xuất xây trên các quyết định sau, không thay chúng: khung gốc và bảy khuôn trang (ADR-0222); lưới bề rộng ba mức duyệt 15/11; bộ núm Giao diện công ty để chủ tự chỉnh màu, phông, cỡ chữ (ADR-0087); bảng điều khiển giao diện của Toàn quyền (ADR-0194); bảng tên nút và nhãn (ADR-0167, không đề xuất đổi chữ); bản vẽ Trang chủ đã duyệt; màu thương hiệu chép từ trang web công khai của công ty. Nếu chuẩn bên ngoài cho thấy một quyết định trong số này nên đổi, hãy nói thẳng một lần, kèm ảnh so sánh, và ghi nó thành một quyết định cần chủ duyệt bằng ADR mới; đừng lặng lẽ thiết kế vòng qua. Kế hoạch 13/11 (`docs/superpowers/plans/2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md`, mục 8) ghi phong cách tham chiếu là Oracle Redwood, học nguyên tắc chứ không chép; nay chủ nêu thêm Apple và Anthropic. Hãy nói rõ ba nguồn này bổ sung nhau ở đâu và kéo ngược nhau ở đâu.

### Cách thu bằng chứng

Chụp trên máy thử có dữ liệu giả, đúng mã của bản chính hôm chạy. Bản chạy thật có thể đang dùng bộ núm riêng của chủ: đọc `/giao-dien.css` công khai của bản chạy thật (chỉ đọc) và dựng lại đúng bộ đó trên máy thử trước khi chụp, kẻo ảnh không phải thứ người dùng đang thấy. Dùng lại công cụ và dữ liệu đã có thay vì viết mới: `scripts/giao-dien/do-man.mjs`, `npm run do-khung`, kịch bản ở `docs/evidence/2026-11-21-phan-tich-bo-cuc/kich-ban/`, hướng dẫn dựng máy thử ở `docs/evidence/2026-11-20-danh-gia-lai-giao-dien/README.md`, kho dữ liệu thử và tài khoản thử ở `~/tourdao-danh-gia-2026-11-20/` nếu còn dùng được.

Mỗi màn chụp ít nhất ở ba bề rộng: 390 (điện thoại), 1.280 và 1.440 (máy tính). Quét thêm các bề rộng trung gian cho khung chung và màn danh sách, vì lượt 20/11 chỉ đo hai khổ nên bỏ sót một lỗi vỡ cột ở khoảng 1.100–1.199. Phủ đủ mọi trang và mọi bộ quyền, nhưng soi kỹ nhất ở ba chỗ: khung chung (thanh trên, thanh bên, thanh tab dưới); một màn đại diện cho mỗi khuôn trang; và trọn hành trình của đối tác, từ đăng ký, đăng nhập, trang chủ, tạo đơn, theo dõi đơn, tiền và hoa hồng, tới tổ chức và thành viên. Chụp cả những trạng thái hay bị quên: rỗng, đang tải, lỗi, không có quyền, bảng trượt, hộp xác nhận, ô đang gõ khi bàn phím bật.

Thứ gì đếm được thì để máy đếm, đừng soát bằng mắt: số màu thật sự hiện trên màn so với số token, số cỡ chữ và độ đậm đang dùng, số kiểu bo góc, viền, bóng, số khoảng cách nằm ngoài thang, độ tương phản, vùng chạm nhỏ hơn 44 điểm. Con số là bằng chứng cho nhận định, không phải kết luận.

### Các mặt cần nhận định

Ít nhất gồm: hệ màu (vai của từng màu, màu thương hiệu, màu trạng thái, các tầng nền và bề mặt); chữ (thang cỡ, độ đậm, giãn dòng cho chữ Việt có dấu, cách trình bày số tiền); khoảng cách và mật độ (văn phòng cần bảng dày, đối tác cần thoáng: nên có một hay hai mức mật độ); hình khối và chiều sâu (bo góc, viền, bóng, lớp nổi); biểu tượng và hình minh hoạ; bố cục và thứ bậc nhìn trong từng khuôn trang; điều hướng theo vai (người dùng có biết mình đang ở đâu không, tài khoản nhiều quyền có bị ngợp không); thành phần và các trạng thái của chúng; chuyển động và phản hồi khi bấm; độ hợp với iPhone (vùng an toàn, thanh dưới, bảng trượt, cỡ vùng chạm) và với máy tính (màn rộng có được dùng tốt không, bảng dày, di chuột, bàn phím); ấn tượng ba giây đầu của một đối tác mới; và khi đi qua các vai, giao diện có còn là một sản phẩm duy nhất không. Thấy mặt nào khác đáng nói thì thêm.

### Chuẩn để so

Tra nguồn gốc hiện hành và ghi đường dẫn, đừng viết theo trí nhớ: Human Interface Guidelines của Apple; cách Anthropic trình bày sản phẩm và thương hiệu (claude.ai, anthropic.com và những gì họ công bố về thiết kế); các hệ thống thiết kế cho nền tảng kinh doanh nhiều vai (Shopify Polaris, Atlassian, IBM Carbon, Salesforce Lightning, Oracle Redwood); cổng dành cho đối tác trong ngành du lịch (Klook, GetYourGuide, Booking.com cho nhà cung cấp); và thực hành về kiến trúc hệ thống thiết kế (giá trị gốc, giá trị theo nghĩa, thành phần, khuôn trang, màn; cách quản việc thay đổi; chủ đề sáng tối và chủ đề theo tổ chức).

Từ mỗi nguồn rút ra vài nguyên tắc kiểm được, rồi nói nguyên tắc nào hợp với một công cụ làm việc hằng ngày của người Việt trên điện thoại, nguyên tắc nào không hợp và vì sao. Học nguyên tắc, không chép diện mạo: không dùng phông, biểu tượng, màu nhận diện hay tên thương hiệu của Apple và Anthropic. Chỗ nào sự điềm tĩnh, thoáng của hai phong cách này va với nhu cầu bảng dày của kế toán và điều phối thì nói ra, đừng làm như không có mâu thuẫn. Nền tảng dự định lên App Store (ADR-0200), nên phần so với Apple cũng chỉ ra chỗ nào dễ bị xét duyệt chê.

### Hướng nâng cấp phải có gì

Một bộ năm tới bảy nguyên tắc thiết kế riêng cho Tour Đảo Booking, mỗi nguyên tắc đủ cụ thể để hai người thiết kế khác nhau áp ra kết quả giống nhau.

Hai hoặc ba phương án hướng đi (ví dụ: tinh chỉnh trên nền hiện có; làm mới ngôn ngữ thị giác trên khung gốc; một phương án xa hơn nếu bằng chứng đòi). Mỗi phương án nói rõ đổi ở tầng nào (chỉ giá trị, diện mạo thành phần, bố cục khuôn trang, hay điều hướng), được gì, mất gì, công sức cỡ nào. Có một khuyến nghị.

Mỗi phương án phải nhìn thấy được chứ không chỉ mô tả: tiêm một lớp kiểu đề xuất lên trang thật sau khi tải (không sửa mã sản phẩm), rồi chụp «hiện tại» cạnh «phương án» ở cả 390 và 1.280 trên bốn tới sáu màn then chốt, trong đó ít nhất hai màn của đối tác.

Hướng được chọn phải đi qua được mọi trang và mọi quyền mà không cần thiết kế tay từng màn. Chỉ rõ phần nào tự chảy xuống nhờ khung gốc và bộ giá trị chung, phần nào phải làm theo từng họ màn, và máy canh nào giữ cho giao diện không trôi lại. Lộ trình vá vào các đợt còn lại của khung gốc, không lập lộ trình song song.

### Sản phẩm, và khi nào xong

Hồ sơ có ngày ở `docs/superpowers/specs/<ngày chạy>-danh-gia-thi-giac-va-huong-nang-cap/`, gồm: `DE-BAI.md` (chép nguyên văn đề bài này); `BAO-CAO.md` dài một trang (kết luận ba bốn câu; bảng các mặt với ba mức tốt, tạm, yếu kèm một dòng lý do; các nguyên nhân gốc; các phương án và khuyến nghị; tối đa ba quyết định cần chủ duyệt); `PHU-LUC.md` (bằng chứng từng mặt, số liệu máy đếm, nguyên tắc rút từ từng nguồn kèm đường dẫn). Kịch bản chụp và đo để ở `docs/evidence/<ngày chạy>-danh-gia-thi-giac/kich-ban/`. Ảnh để ngoài kho; gửi chủ một trang so sánh ảnh riêng tư, mở được trên điện thoại. Mọi thứ chủ đọc viết bằng lời thường, tiếng Việt có dấu.

Trước khi đưa chủ, giao `nguoi-kiem-doc-lap` soát một vòng các khẳng định sự thật: số đo, lời trích quyết định cũ, và nguồn bên ngoài có nói đúng điều được dẫn không. Phần gu thì không soát.

Việc xong khi: mọi nhận định trong báo cáo chỉ được vào một tấm ảnh hoặc một con số; mỗi phương án có ảnh thật ở hai khổ; mọi chỗ đụng quyết định đã duyệt đều được nêu tên; và có mục «chưa kiểm» (iPhone thật, tốc độ, màn không có dữ liệu thử).

Được giao trợ lý chạy song song cho việc chụp, đo và tra nguồn. Phần nhận định thị giác và phần hướng đi do chính phiên này làm, vì phải nhìn xuyên các màn mới thấy được. Không hỏi chủ giữa chừng: chỗ nào phải giả định thì ghi giả định vào báo cáo, còn các quyết định gom về cuối.
