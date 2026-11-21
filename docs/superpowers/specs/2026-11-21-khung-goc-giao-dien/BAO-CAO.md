# Phân tích bố cục và khung gốc giao diện — 21/11/2026

> Hồ sơ có ngày. Nối tiếp đợt đánh giá lại 20/11 (`../2026-11-20-danh-gia-lai-giao-dien/`). Phiên này làm vai phân tích và lập kế hoạch: không sửa giao diện, không chạm bản chạy thật.
> Bản được đo: bản chính `6e50cd18b` (bản 3.19). Số liệu đầy đủ: `SO-LIEU.md` (máy sinh). Luật đề xuất: `DE-XUAT-ADR-khung-goc-giao-dien.md` (chưa duyệt). Ảnh và số đo thô ở ngoài kho: `~/tourdao-bo-cuc-2026-11-21/`.
> Lời chủ dự án 21/11, nguyên văn: «tiếp tục việc sửa giao diện, bố cục lại từ gốc, nhiều màn hình có bố cục không đều, các module có. chiều rộng không giống nhau và rất nhiều vấn đề khác. Hãy phân tích lại toàn diện để chúng ta áp khung, luật để tự động các màn buộc phải tuân thủ theo (là gốc), rồi mỗi màn cần có tùy biến gì cho phù hợp thì cũng phải dựa trên cái gốc để đảm bảo giao diện, các thành phần giao diện,.... có sự nhất quán.»

## 1. Kết luận

Bố cục không đều không phải vì từng màn làm ẩu, mà vì Nền tảng chưa có khung gốc cho phần **bên trong** trang. Lưới duyệt ngày 15/11 chỉ quản viền ngoài (lề và ba mức bề rộng của cả trang). Bên trong, mỗi trang tự dựng các khối bằng bộ kiểu riêng, nên hai màn cùng một loại việc vẫn ra hai bố cục. Máy cũng chưa canh phần này: bài kiểm lưới chỉ đọc chữ trong tệp kiểu, còn công cụ đo chỉ nhìn hai bề rộng. Đề nghị dựng một khung gốc gồm năm tầng, mỗi màn khai đúng một trong bảy khuôn trang, chỉ tuỳ biến qua bốn cửa, có máy canh; làm trên bốn màn mẫu để bạn duyệt hình bằng ảnh, rồi mới chuyển từng họ màn.

## 2. Điều đo được

Đo 87 màn ở bốn bề rộng (điện thoại 390, cửa sổ 1.130, máy tính 1.440, màn lớn 1.920), cộng một lượt quét sáu bề rộng trung gian. Ảnh là tệp gửi kèm trong phiên. 87 màn là 63 trang: nhiều trang được đo ở vài bộ quyền (Trang chủ 5, Đơn hàng 5, Chi tiết đơn 5, Tạo đơn 4), nên số ghi «màn» có tính lặp, số ghi «trang» thì không. Số không ghi bề rộng là số ở máy tính 1.440.

| Điều bạn thấy | Số đo | Ảnh |
|---|---|---|
| Bề rộng trang khác nhau giữa các màn | Ở máy tính 1.440 có ba mép phải: 1.144 (33 màn, gồm 5 màn Trang chủ), 1.120 (42 màn), 720 (11 màn); ở màn lớn 1.920 là 1.624, 1.120, 720. Ba mức này là thứ bạn đã duyệt 15/11, không phải lỗi. Điều lệch là mức được khai tay cho từng trang: 18 trang loại danh sách khai 13 rộng, 3 vừa, 2 hẹp; cả thảy 9 trang khai lệch bảng loại trang của chính quyết định 15/11 | 1 |
| Trang cùng loại, bố cục khác nhau | 18 trang danh sách mở đầu bằng năm kiểu khối (đoạn chữ dẫn, dải tab, thanh lọc, thẻ, thanh nút). Chỗ đặt nút chính không theo một quy ước: trong 19 trang thiết lập, 13 trang có ít nhất một nút chính nằm bên trái, 5 trang có nút nằm bên phải, 5 trang không có nút chính; trong 9 trang biểu mẫu là 3 trang trái, 3 trang phải. Phép đếm này tính mọi nút nền đặc và nút gửi biểu mẫu, kể cả của biểu mẫu con, nên chỉ nên đọc là dấu hiệu; ảnh 3 và 5 cho thấy trực tiếp | 2, 3, 4, 5 |
| Khối và thẻ không cùng dáng | 24 kiểu vỏ thẻ (đệm, bo góc, viền, bóng); 11 bộ đệm; 24 màn có thẻ lồng trong thẻ | 4 |
| Chiều rộng các phần bên trong không theo quy luật | 88 chỗ chia cột với 52 tỉ lệ khác nhau; 14 màn có từ ba bề rộng thẻ; 27 màn có ô nhập dài hơn 600 điểm (dài nhất 1.144) | 1, 4 |
| Khoảng cách lúc rộng lúc hẹp | 11 giá trị giữa các khối lớn. Lưới quy định 16, nhưng 12 vẫn còn ở 16 màn máy tính và 31 màn điện thoại, vì trong tệp kiểu luật nhịp 16 chỉ áp cho đoạn chữ dẫn đầu trang; các khối khác tự đặt khoảng cách của mình | — |
| Nút và ô nhập nhiều dáng | Ở máy tính, trong trang có 60 tổ hợp dáng nút (chiều cao, bo góc, nền, cỡ chữ, độ đậm, viền). Đáng chú ý là 40 dáng riêng của từng trang; 16 dáng của bộ cũ và 4 dáng của bộ mới có gồm các biến thể chủ đích (chính, phụ, nguy hiểm). 56 màn chỉ dùng nút cũ. Ô nhập một dòng có tám chiều cao trong khoảng 46 tới 58, nhãn đặt ba kiểu (trên ô, nổi trong ô, bên trái) | — |
| Chữ thiếu thứ bậc | Chữ thân 17, tiêu đề khối 18 hoặc 17; lề dưới tiêu đề nơi 0 nơi 12. Phiên sửa giao diện đã gửi bạn hai phương án phông chữ, nên hồ sơ này không quyết lại phần chữ | — |
| Bố cục vỡ ở bề rộng trung gian | Màn Đơn hàng: cửa sổ rộng 1.100 tới 1.199 thì cột tên khách bị bóp còn một chữ mỗi dòng. Nguyên do: mốc 1.100 tính theo cửa sổ, quên trừ thanh bên 248. Đợt 20/11 không thấy vì chỉ đo 390 và 1.280. Quét cả 87 màn ở sáu bề rộng trung gian (700 tới 1.180): chỉ năm màn Đơn hàng của năm bộ quyền dính lỗi này, không màn nào tràn ngang | 7 |

Điều **không** lệch: các khối lớn nhất của trang hầu hết đã kín vùng nội dung (chỉ 5 trên 87 màn có khối lệch ở 1.440), và ở cửa sổ 1.130 thì mức vừa với mức rộng trùng nhau (834). Tức là viền ngoài đã vào nếp; chỗ lệch nằm ở tầng bên trong và ở chỗ các màn cùng loại không cùng khuôn.

## 3. Gốc rễ

1. **Không có khuôn trang.** Mã dùng chung để dựng trang chỉ có hàm tạo phần tử; không có hàm dựng «trang danh sách», «trang chi tiết», khối hay lưới. Tệp kiểu có 146 họ lớp, 1.505 trên 1.807 tên lớp chỉ một tệp dùng, 64 trên 87 màn không dùng lớp nào của bộ thành phần chung.
2. **Lưới chỉ quản viền ngoài.** Bên trong có 33 luật tự đặt trần bề rộng, 67 cách chia cột, 186 giá trị khoảng cách.
3. **Token chỉ còn là hình thức.** Luật «giá trị phải vào token» được đáp bằng cách mỗi chỗ đẻ một token: 544 token, trong đó 128 token bề rộng mà 97 cái dùng không quá một lần. Có token nhưng không có bộ số đóng.
4. **Hai thế hệ thành phần sống chung, không có hạn gỡ.** Bộ thành phần chung (28/10) ghi «lớp cũ giữ nguyên, việc mới dùng lớp mới»: nút cũ còn ở 101 tệp, nút mới ở 23 tệp.
5. **Mốc đổi bố cục tính theo cửa sổ, mỗi trang thêm mốc riêng.** Có 9 mốc: hai mốc chính (641, 900) và bảy mốc lẻ của từng trang (riêng mốc 641 có một chỗ viết lệch thành 640). Một mốc lẻ, mốc 1.100 của bảng Đơn hàng, không tính thanh bên 248 điểm nên đã làm vỡ bố cục. Lượt quét chưa thấy mốc lẻ nào khác gây vỡ.
6. **Máy không canh bố cục.** Bài kiểm lưới so chữ trong tệp kiểu. Tiêu chí «khoảng trống theo lưới» của công cụ đo đang ghi «chưa đo». Trợ lý đánh giá chấm từng màn, không so màn với màn, và chỉ ở hai bề rộng.
7. **Cách làm theo tính năng.** Mỗi tính năng mới mang theo một họ kiểu riêng và được kiểm về hành vi, không ai kiểm nó có cùng khuôn với màn cùng loại không.

## 4. Khung gốc đề xuất (sơ đồ: ảnh 6)

- **Năm tầng**, tầng trên chỉ dùng thứ của tầng dưới: thang đo (một bộ số) → khung ngoài (đã có) → khuôn trang → khối → thành phần.
- **Bảy khuôn trang:** Danh sách, Chi tiết, Biểu mẫu, Thiết lập, Tổng quan, Trang đọc, Trạng thái. Khuôn định sẵn các vùng, thứ tự vùng, chỗ đặt nút chính, mức bề rộng. 87 màn đã xếp thử vào bảy khuôn, riêng màn Quét vé xếp là «công cụ» và thuộc ngoại lệ (`SO-LIEU.md` mục 6).
- **Một màn chỉ tuỳ biến qua bốn cửa:** chọn khuôn; bật hay tắt vùng; chọn số trong thang (số cột, cỡ ô nhập, có cột phụ không); xin ngoại lệ có tên, ghi sổ, bạn duyệt.
- **Máy canh ba lớp:** bài kiểm trong bộ kiểm chung (thêm số riêng là đỏ; số chỗ còn lệch chỉ được giảm); lệnh đo trên trang thật ở mọi bề rộng từ 360 tới 1.920; tiêu chí «đúng khuôn» cho trợ lý đánh giá giao diện.

## 5. Thứ tự làm (vá vào kế hoạch 13/11, không lập lộ trình mới)

| Bước | Việc | Bạn duyệt gì |
|---|---|---|
| Ngay | Sửa riêng hai lỗi làm hỏng việc: cột tên khách ở Đơn hàng (cửa sổ 1.100 tới 1.199) và mất nút lưu ở Chính sách điều phối trên điện thoại | không cần, là sửa lỗi |
| 2b (mới, trước bước 3) | Dựng khung gốc và máy canh, chưa đổi màn nào; rồi làm bốn màn mẫu: Đơn hàng (Danh sách), Chi tiết đơn (Chi tiết), Sửa xe (Biểu mẫu), Địa điểm (Thiết lập) | luật đề xuất; ảnh trước và sau của bốn màn mẫu |
| 3 (đã có) | Chuyển từng họ màn sang khuôn theo thứ tự đã đề nghị 20/11: Đơn hàng, Chi tiết đơn, Lập đơn → Tài xế, Điều phối xe → Tiền → Thiết lập → màn của đối tác → còn lại | mỗi họ một lượt ảnh |

Mỗi đợt vẫn theo nếp cũ: ảnh thật trước, thi công ở phiên khác, người kiểm độc lập, bạn tự nhập bản chính và triển khai.

## 6. Điều phiên này tự quyết và điều cần bạn quyết

Tự quyết (bề mặt, đảo ngược được): cách xếp 87 màn vào tám loại (bảy khuôn và một loại «công cụ» cho màn Quét vé); chọn bốn màn mẫu; đo thêm ở bề rộng 1.130 vì ảnh bạn gửi 20/11 rộng cỡ đó; soạn luật thành bản đề xuất trong thư mục này, chưa chép vào `docs/adr/`.

Cần bạn quyết:

1. **Duyệt luật khung gốc** (`DE-XUAT-ADR-khung-goc-giao-dien.md`). Khuyến nghị: duyệt. Luật chỉ chốt cách quản; hình của từng khuôn bạn duyệt sau bằng ảnh.
2. **Sửa ngay hai lỗi làm hỏng việc**, không chờ khung. Khuyến nghị: có.

Không cần quyết lúc này: ba mức bề rộng trang và trần 1.120 duyệt ngày 15/11 được giữ nguyên trong luật đề xuất. Nếu điều bạn thấy khó chịu chính là «trang này rộng, trang kia hẹp» ở màn lớn (ảnh 1), thì đó là do ba mức này; lượt ảnh bốn màn mẫu sẽ kèm một phương án gom lại để bạn so, lúc đó mới quyết.

## 7. Độ tin

- Số liệu do máy đo và máy sinh; phiên này đã mở bản đồ bề rộng, bốn tờ so sánh và bốn ảnh màn riêng để soi, và xác nhận lỗi Đơn hàng bằng một lượt quét riêng.
- Kiểm độc lập: xem mục 8.
- Giới hạn: chỉ đo màn vừa tải; Chrome giả lập, chưa phải máy thật; 15 màn rỗng hoặc gần rỗng như đợt 20/11; cách xếp loại màn và «vị trí nút chính» là của phiên này, chưa có người thứ hai xếp lại; bề rộng 1.130 là suy từ ảnh, chưa hỏi bạn.

## 8. Kết quả kiểm độc lập

Một trợ lý kiểm độc lập (chỉ đọc) soát lần lưu `5e600dc30`: tự tính lại số từ tệp kiểu và số đo thô, chạy lại lượt quét màn Đơn hàng, mở ba ảnh, đối chiếu bản đề xuất luật với các quyết định cũ. Kết luận: **đạt có điều kiện**.

- Xác nhận: ba mép phải và số màn mỗi mức; 128 token bề rộng, 97 cái dùng không quá một lần; lỗi Đơn hàng ở 1.100 tới 1.199 và nguyên do (năm cột cố định cộng lại 704, vùng nội dung ở 1.100 chỉ còn 804); chỉ năm màn Đơn hàng dính lỗi; 24 màn thẻ lồng thẻ; 14 màn có từ ba bề rộng thẻ; 27 màn có ô nhập dài hơn 600; 64 trên 87 màn không dùng bộ thành phần chung; mức bề rộng của 18 trang danh sách; hồ sơ chỉ thêm tệp trong hai thư mục của mình, không ảnh hay số đo thô nào vào kho.
- Đã sửa theo kết quả kiểm: (1) bản đề xuất luật viết sai rằng thuộc tính `data-khuon` ở 12 trang là của khung chờ tải; thật ra nó mang nghĩa «trang biểu mẫu không nhận dải nhắc bảo mật», nên luật nay dùng thuộc tính mới và giữ nguyên nghĩa cũ; (2) bản đề xuất từng lặng lẽ đổi cách khai mức bề rộng của lưới 15/11 và báo cáo từng đề nghị nới trần 1.120: nay ghi rõ giữ nguyên ba mức và trần, chỉ thêm «mức đi theo khuôn theo đúng bảng 15/11», 9 trang lệch bảng sẽ trình bằng ảnh; (3) ba câu nói quá so với phép đo đã viết lại (vị trí nút chính, 60 dáng nút, «mốc lẻ làm vỡ»); (4) 1.144 là 33 màn chứ không phải 28; số mốc là 9 chứ không phải 10; ghi rõ số theo «màn» có tính lặp.
- Không sửa: người kiểm đếm 537 token ở gốc, phiên này đếm lại bằng cách khác vẫn ra 544 tên token (550 khai báo), nên giữ 544.
- Người kiểm chưa kiểm: các số kiểm kê mã còn lại (146 họ lớp, 1.505 trên 1.807 tên lớp, 33 luật trần bề rộng, 67 cách chia cột, 186 giá trị khoảng cách, nút cũ 101 tệp và nút mới 23 tệp); ảnh 2, 4, 5, 6; số đo ở 390 và 1.920; lỗi nút lưu ở Chính sách điều phối (lấy từ hồ sơ 20/11, không đo lại).
