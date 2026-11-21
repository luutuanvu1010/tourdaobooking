# Phân tích bố cục và khung gốc giao diện — 21/11/2026

> Hồ sơ có ngày. Nối tiếp đợt đánh giá lại 20/11 (`../2026-11-20-danh-gia-lai-giao-dien/`). Phiên này làm vai phân tích và lập kế hoạch: không sửa giao diện, không chạm bản chạy thật.
> Bản được đo: bản chính `6e50cd18b` (bản 3.19). Số liệu đầy đủ: `SO-LIEU.md` (máy sinh). Luật đề xuất: `DE-XUAT-ADR-khung-goc-giao-dien.md` (chưa duyệt). Ảnh và số đo thô ở ngoài kho: `~/tourdao-bo-cuc-2026-11-21/`.
> Lời chủ dự án 21/11, nguyên văn: «tiếp tục việc sửa giao diện, bố cục lại từ gốc, nhiều màn hình có bố cục không đều, các module có. chiều rộng không giống nhau và rất nhiều vấn đề khác. Hãy phân tích lại toàn diện để chúng ta áp khung, luật để tự động các màn buộc phải tuân thủ theo (là gốc), rồi mỗi màn cần có tùy biến gì cho phù hợp thì cũng phải dựa trên cái gốc để đảm bảo giao diện, các thành phần giao diện,.... có sự nhất quán.»

## 1. Kết luận

Bố cục không đều không phải vì từng màn làm ẩu, mà vì Nền tảng chưa có khung gốc cho phần **bên trong** trang. Lưới duyệt ngày 15/11 chỉ quản viền ngoài (lề và ba mức bề rộng của cả trang). Bên trong, mỗi trang tự dựng các khối bằng bộ kiểu riêng, nên hai màn cùng một loại việc vẫn ra hai bố cục. Máy cũng chưa canh phần này: bài kiểm lưới chỉ đọc chữ trong tệp kiểu, còn công cụ đo chỉ nhìn hai bề rộng. Đề nghị dựng một khung gốc gồm năm tầng, mỗi màn khai đúng một trong bảy khuôn trang, chỉ tuỳ biến qua bốn cửa, có máy canh; làm trên bốn màn mẫu để bạn duyệt hình bằng ảnh, rồi mới chuyển từng họ màn.

## 2. Điều đo được

Đo 87 màn ở bốn bề rộng (điện thoại 390, cửa sổ 1.130, máy tính 1.440, màn lớn 1.920), cộng một lượt quét sáu bề rộng trung gian. Ảnh là tệp gửi kèm trong phiên.

| Điều bạn thấy | Số đo | Ảnh |
|---|---|---|
| Bề rộng trang khác nhau giữa các màn | Ở máy tính 1.440 có ba mép phải: 1.144 (28 màn), 1.120 (42 màn), 720 (11 màn); ở màn lớn 1.920 là 1.624, 1.120, 720. Mức bề rộng được chọn tay cho từng trang: 18 trang loại danh sách khai 13 rộng, 3 vừa, 2 hẹp; 9 trang biểu mẫu khai 6 hẹp, 2 vừa, 1 rộng | 1 |
| Trang cùng loại, bố cục khác nhau | 18 trang danh sách mở đầu bằng năm kiểu khối (đoạn chữ dẫn, dải tab, thanh lọc, thẻ, thanh nút). Nút chính của 19 trang thiết lập nằm ở năm kiểu vị trí, 13 trang có nút chính bên trái và 5 trang có nút chính bên phải. Ở 9 trang biểu mẫu, 3 trang đặt nút chính bên trái, 3 trang bên phải | 2, 3, 4, 5 |
| Khối và thẻ không cùng dáng | 24 kiểu vỏ thẻ (đệm, bo góc, viền, bóng); 11 bộ đệm; 24 màn có thẻ lồng trong thẻ | 4 |
| Chiều rộng các phần bên trong không theo quy luật | 88 chỗ chia cột với 52 tỉ lệ khác nhau; 14 màn có từ ba bề rộng thẻ; 27 màn có ô nhập dài hơn 600 điểm (dài nhất 1.144) | 1, 4 |
| Khoảng cách lúc rộng lúc hẹp | 11 giá trị giữa các khối lớn. Lưới quy định 16, nhưng 12 vẫn còn ở 16 màn máy tính và 31 màn điện thoại, vì luật chỉ với tới con trực tiếp của vùng nội dung | — |
| Nút và ô nhập nhiều dáng | Ở máy tính, trong trang có 60 dáng nút khác nhau: 16 của bộ cũ, 40 riêng của từng trang, 4 của bộ mới; 56 màn chỉ dùng nút cũ. Ô nhập có sáu chiều cao (46 tới 58), nhãn đặt ba kiểu (trên ô, nổi trong ô, bên trái) | — |
| Chữ thiếu thứ bậc | Chữ thân 17, tiêu đề khối 18 hoặc 17; lề dưới tiêu đề nơi 0 nơi 12. Phần phông chữ đang có phiên sửa giao diện xử lý, hồ sơ này không quyết lại | — |
| Bố cục vỡ ở bề rộng trung gian | Màn Đơn hàng: cửa sổ rộng 1.100 tới 1.199 thì cột tên khách bị bóp còn một chữ mỗi dòng. Nguyên do: mốc 1.100 tính theo cửa sổ, quên trừ thanh bên 248. Đợt 20/11 không thấy vì chỉ đo 390 và 1.280. Quét cả 87 màn ở sáu bề rộng trung gian (700 tới 1.180): chỉ năm màn Đơn hàng của năm bộ quyền dính lỗi này, không màn nào tràn ngang | 7 |

Điều **không** lệch: các khối lớn nhất của trang hầu hết đã kín vùng nội dung (chỉ 5 trên 87 màn có khối lệch ở 1.440), và ở cửa sổ 1.130 thì mức vừa với mức rộng trùng nhau (834). Tức là viền ngoài đã vào nếp; chỗ lệch nằm ở tầng bên trong và ở chỗ các màn cùng loại không cùng khuôn.

## 3. Gốc rễ

1. **Không có khuôn trang.** Mã dùng chung để dựng trang chỉ có hàm tạo phần tử; không có hàm dựng «trang danh sách», «trang chi tiết», khối hay lưới. Tệp kiểu có 146 họ lớp, 1.505 trên 1.807 tên lớp chỉ một tệp dùng, 64 trên 87 màn không dùng lớp nào của bộ thành phần chung.
2. **Lưới chỉ quản viền ngoài.** Bên trong có 33 luật tự đặt trần bề rộng, 67 cách chia cột, 186 giá trị khoảng cách.
3. **Token chỉ còn là hình thức.** Luật «giá trị phải vào token» được đáp bằng cách mỗi chỗ đẻ một token: 544 token, trong đó 128 token bề rộng mà 97 cái dùng không quá một lần. Có token nhưng không có bộ số đóng.
4. **Hai thế hệ thành phần sống chung, không có hạn gỡ.** Bộ thành phần chung (28/10) ghi «lớp cũ giữ nguyên, việc mới dùng lớp mới»: nút cũ còn ở 101 tệp, nút mới ở 23 tệp.
5. **Mốc đổi bố cục tính theo cửa sổ, mỗi trang thêm mốc riêng.** Có 10 mốc; hai mốc chính (641, 900) và tám mốc lẻ. Mốc lẻ không biết thanh bên chiếm 248 điểm nên vỡ ở khoảng giữa.
6. **Máy không canh bố cục.** Bài kiểm lưới so chữ trong tệp kiểu. Tiêu chí «khoảng trống theo lưới» của công cụ đo đang ghi «chưa đo». Trợ lý đánh giá chấm từng màn, không so màn với màn, và chỉ ở hai bề rộng.
7. **Cách làm theo tính năng.** Mỗi tính năng mới mang theo một họ kiểu riêng và được kiểm về hành vi, không ai kiểm nó có cùng khuôn với màn cùng loại không.

## 4. Khung gốc đề xuất (sơ đồ: ảnh 6)

- **Năm tầng**, tầng trên chỉ dùng thứ của tầng dưới: thang đo (một bộ số) → khung ngoài (đã có) → khuôn trang → khối → thành phần.
- **Bảy khuôn trang:** Danh sách, Chi tiết, Biểu mẫu, Thiết lập, Tổng quan, Trang đọc, Trạng thái. Khuôn định sẵn các vùng, thứ tự vùng, chỗ đặt nút chính, mức bề rộng. 87 màn đã xếp thử vào khuôn (`SO-LIEU.md` mục 6).
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

Tự quyết (bề mặt, đảo ngược được): cách xếp 87 màn vào bảy loại; chọn bốn màn mẫu; đo thêm ở bề rộng 1.130 vì ảnh bạn gửi 20/11 rộng cỡ đó; soạn luật thành bản đề xuất trong thư mục này, chưa chép vào `docs/adr/`.

Cần bạn quyết:

1. **Duyệt luật khung gốc** (`DE-XUAT-ADR-khung-goc-giao-dien.md`). Khuyến nghị: duyệt. Luật chỉ chốt cách quản; hình của từng khuôn bạn duyệt sau bằng ảnh.
2. **Bề rộng trang theo khuôn, bỏ chọn tay từng trang**, và cho mức vừa thẳng mép với mức rộng ở máy tính tới 1.440 (nay lệch 24 điểm). Khuyến nghị: đồng ý; con số cụ thể xem ở ảnh bốn màn mẫu.
3. **Sửa ngay hai lỗi làm hỏng việc**, không chờ khung. Khuyến nghị: có.

## 7. Độ tin

- Số liệu do máy đo và máy sinh; phiên này đã mở ảnh soi mười màn và xác nhận lỗi Đơn hàng bằng một lượt quét riêng.
- Kiểm độc lập: xem mục 8.
- Giới hạn: chỉ đo màn vừa tải; Chrome giả lập, chưa phải máy thật; 15 màn rỗng hoặc gần rỗng như đợt 20/11; cách xếp loại màn và «vị trí nút chính» là của phiên này, chưa có người thứ hai xếp lại; bề rộng 1.130 là suy từ ảnh, chưa hỏi bạn.

## 8. Kết quả kiểm độc lập

(ghi sau khi người kiểm độc lập trả kết quả)
