# Đặc tả ngắn: tối ưu giao diện Tạo đơn (đối tác) và mẫu Xác nhận đơn, theo hướng không trùng lặp trường

> Ngày 2026-11-20. Trạng thái: **chủ duyệt 2026-11-20** trong chat, nguyên văn «đồng ý cả ba, dựng ảnh đề xuất cho tôi xem»: ba câu mục 7 theo khuyến nghị. Bước kế: ảnh «hiện tại / đề xuất» để chủ duyệt trước khi sửa mã. Soạn theo `MAU-DAC-TA-NGAN.md`. Chưa sửa mã sản phẩm cho việc này.
> **Đây không phải lộ trình mới.** Nó là đợt «Lập đơn» của bước 3 trong kế hoạch đã chốt `docs/superpowers/plans/2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md` (theo họ màn, ảnh thật trước, chủ duyệt, rồi thi công). Tiêu chí đo dùng lại T1–T18 của kế hoạch đó.
> Bằng chứng: ảnh thật chụp 20/11 trên bản thử (D1 tạm) ở 390 và 1280, tài khoản Đối tác «Đại Lý Biển Xanh» và Bán hàng; mẫu xác nhận dựng bằng `mau-hd-02-dt.mjs`. Ảnh chỉ nằm trên máy.

## 1. Việc gì, cho ai, vì sao
Chủ 20/11 yêu cầu tối ưu giao diện theo khuôn, làm một lần cho cả trang, ưu tiên form Tạo đơn của đối tác và mẫu Xác nhận đơn gửi khách, theo hướng **không trùng lặp trường thông tin**. Người hưởng: Đối tác tự lập đơn (ít dùng máy, hay dùng điện thoại), Bán hàng, và khách nhận ảnh xác nhận.

## 2. Phát hiện, gom theo nhóm (soát ảnh 20/11)

**Nhóm A — Một thông tin hỏi hoặc hiện nhiều lần (trùng lặp).**
- A1. «Ghi chú» có ba ô trên một form: ghi chú khách (sau nút «Email, ghi chú»), ghi chú trong thẻ dịch vụ, «Ghi chú thanh toán». Ô trong thẻ dịch vụ mang nhãn «Ghi chú» nhưng chữ gợi ý là «Thời gian đón», tức nhãn và nội dung lệch nhau.
- A2. Tên khách nhập ở «Tên khách đi tour», rồi khối «Hành khách» báo «0/1 khách đã có tên» và đòi nhập lại tên. Đơn một khách phải gõ tên hai lần.
- A3. Cùng một số tiền hiện ba đến năm lần khi đơn có một dịch vụ: dòng tính trong thẻ, «Thành tiền dịch vụ», thanh dưới «Tổng», và ở máy tính thêm «Tạm tính», «Tổng cộng», «Khách còn phải trả». Hai dòng tô đỏ cùng lúc, không rõ số nào là số chính.
- A4. Tên dịch vụ vừa chọn hiện ba nơi: dòng kết quả tìm (kèm «đã thêm»), câu «Đã thêm …», và thẻ dịch vụ. Hộp kết quả tìm vẫn mở sau khi chọn, để lại một khoảng trống lớn (máy tính khoảng 330 px, điện thoại khoảng 250 px).
- A5. Mẫu xác nhận: «Số khách: 2 người lớn, 1 trẻ em» lặp lại đúng nội dung bảng ngay dưới; đơn một dịch vụ thì «Cộng dịch vụ», «Tạm tính», «Tổng cộng» là một số; dòng «Giảm giá 0 ₫» hiện cả khi không giảm; hotline in hai lần (đầu và chân).

**Nhóm B — Bước và thứ tự không khớp thứ người dùng thấy.**
- B1. Thanh bước ghi ba bước (Khách, Dịch vụ, Thanh toán) nhưng trang có sáu khối (thêm Ngày khởi hành, Hành khách, Người phụ trách). Cả ba bước đã đánh dấu «đủ thông tin» trong khi bấm lưu vẫn bị báo «chưa chọn Đón hay Không đón».
- B2. Thứ tự khối khác nhau giữa hai khổ: điện thoại là Hành khách rồi Thanh toán, máy tính là Thanh toán rồi Hành khách.
- B3. Đối tác thấy khối «Người phụ trách» với nút «Chọn người phụ trách» và câu «Chờ Bán hàng nhận». Cần tra lại ADR-0142 xem đây là chủ ý hay phần thừa với đối tác (chưa tra hết, không gọi là lỗi).
- B4. Máy tính: nút đỏ «Tạo đơn» ở thanh trên vẫn nổi bật khi đang ở chính trang Tạo đơn, cạnh tranh với nút chính «Gửi đơn».

**Nhóm C — Thành phần không cùng khuôn.**
- C1. Ba kiểu ô nhập trên một form: nhãn nổi trong ô (Ngày khởi hành, Tên khách), chỉ có chữ gợi ý không nhãn (Giảm giá, Đặt cọc), nhãn trên ô (bảng trượt). Hai câu giải thích ở Thanh toán đứng tách khỏi ô mà chúng giải thích.
- C2. Tạo đơn có 17 hình nút khác nhau (số đo 13/11, phát hiện N6).
- C3. Hai mẫu xác nhận gọi cùng một thứ bằng hai tên: «Họ tên» / «Họ tên khách», «Số khách» / «Số lượng», «Mô tả» / «Loại khách», «Đơn giá» / «Giá công bố», «Còn lại» / «Phải thu». Một phần là chủ ý của mẫu HD-02-DT (chủ duyệt 6/11), cần chủ nói phần nào giữ.

**Nhóm D — Bảng chật (Dịch vụ & giá).** Bảng có 10 cột, mỗi dòng 5 nút và 2 công tắc nằm trong ô tên. Ở 1280 vừa khít; ở 1040 bảng phải cuộn ngang 167 px (chưa đo bản chính để biết trước việc ADR-0220 đã cuộn chưa). Đã vá tối thiểu trong ADR-0220; xếp lại bảng thuộc họ màn Danh mục của bước 3.

## 3. Hướng sửa đề xuất (một lần cho cả form)
- **Một nguồn cho mỗi thông tin.** Tên khách gõ một lần: hành khách đầu tiên lấy sẵn từ tên khách đi tour, sửa được. Một ô ghi chú cho khách và một dòng «Giờ, nơi đón» đúng tên trong thẻ dịch vụ; «Ghi chú thanh toán» gập lại sau nút, như «Email, ghi chú».
- **Một số tiền chính.** Trong thẻ chỉ còn dòng tính; tổng nằm ở một nơi (thanh dưới ở điện thoại, khối Tóm tắt ở máy tính); chỉ tô đậm đúng một số là số khách phải trả; dòng bằng 0 thì ẩn.
- **Bước khớp khối.** Thanh bước phản ánh đúng các khối, dấu «đủ» chỉ hiện khi khối đó thật sự lưu được; thứ tự khối giống nhau ở hai khổ.
- **Hộp tìm dịch vụ tự thu lại** sau khi chọn, chỉ để lại ô tìm.
- **Một khuôn ô nhập** (nhãn + ô + câu giải thích ngay dưới ô) của bộ thành phần chung cho cả form.
- **Mẫu xác nhận:** bỏ dòng lặp số khách, ẩn dòng bằng 0, đơn một dịch vụ không lặp tổng, hotline một nơi, một bộ tên nhãn trừ chỗ chủ muốn khác.
- Cách làm theo kế hoạch 13/11: ảnh thật «hiện tại / đề xuất» ở 390 và 1280 cho chủ duyệt trước, rồi mới thi công trên nhánh riêng.

## 4. Xong khi (ví dụ nhìn thấy được)
- Đối tác lập đơn một khách một dịch vụ: gõ tên khách **một lần**, form có **một** ô ghi chú đang mở, thấy **một** con số tô đậm «1.350.000 ₫».
- Chọn dịch vụ xong, hộp kết quả thu lại, thẻ dịch vụ nằm ngay dưới ô tìm, không còn khoảng trống.
- Chưa chọn Đón hay Không đón thì bước Dịch vụ chưa có dấu «đủ».
- Mẫu xác nhận của đơn một dịch vụ không giảm giá: không có dòng «Giảm giá 0 ₫», tổng in một lần.
- Số đo: Tạo đơn ≤ 3 hình nút chính, 0 cuộn ngang ở 390, 1040, 1280; mẫu xác nhận nội bộ so với mốc phép vẽ có ghi rõ từng chỗ đổi.

## 5. Không làm lần này
- Không đổi luật tính tiền, quyền, hay dữ liệu lưu (hành khách tự điền chỉ là điền sẵn trên form, máy chủ không đổi).
- Không vẽ lại lưới bố cục chung (bước 2 của kế hoạch 13/11), không đụng trang ngoài họ Lập đơn và mẫu xác nhận.
- Không xếp lại bảng Dịch vụ & giá (nhóm D), chỉ ghi nhận.

## 6. Loại việc
- [x] **Việc lớn** vì chạm chỗ hiển thị tiền (kế hoạch 13/11 mục 5) và ảnh gửi khách ⇒ có người kiểm độc lập, chạy lại các kịch bản Chrome của form và của ảnh xác nhận.
- Cần ADR: không, nếu chủ giữ nguyên các quyết định cũ. Bỏ khối «Người phụ trách» với đối tác (B3) hoặc đổi nhãn mẫu HD-02-DT (C3) thì cần tra và có thể cần ADR.

## 7. Câu hỏi cho chủ (ba câu)
1. **«Biểu mẫu xác nhận đặt vé» là cái nào?** Khuyến nghị hiểu là **ảnh «Xác nhận đơn dịch vụ» gửi khách** (cả mẫu nội bộ lẫn mẫu đối tác HD-02-DT), vì đó là thứ khách cầm. Phương án khác: bước «Gửi xác nhận / Còn vé» trong trang đơn của văn phòng. Để làm gì: hai thứ này là hai màn khác nhau, soát nhầm là làm sai việc.
2. **Tên khách tự điền vào hành khách đầu tiên (A2)?** Khuyến nghị: **có, điền sẵn và sửa được**. Lý do: bỏ được lần gõ trùng phổ biến nhất mà không đổi dữ liệu lưu. Phương án khác: giữ nguyên vì người đặt đôi khi không đi.
3. **Phạm vi đợt này?** Khuyến nghị: **nhóm A + B + C1 cho form Tạo đơn (mọi vai, vì dùng chung một form) và A5 + C3 cho mẫu xác nhận**; nhóm D và C2 để đợt Danh mục. Lý do: đúng trọng tâm «không trùng lặp», vừa một đợt duyệt ảnh.

## 8. Điều AI tự quyết (chủ bác được)
- Gắn việc này vào bước 3 của kế hoạch 13/11, không lập lộ trình riêng.
- Sửa form dùng chung cho mọi vai, không tách bản riêng cho đối tác (một form, ẩn hiện theo quyền như hiện nay).
- Các mục «cần tra quyết định cũ» (B3, C3) sẽ tra xong trước khi vẽ ảnh đề xuất; thấy là chủ ý đã duyệt thì giữ, chỉ báo lại.

## 9. Thi công 20/11: chỗ khác ảnh chủ duyệt và quyết định cũ bị đổi (ghi để chủ biết, chủ bác được)
Chủ duyệt ảnh đề xuất trong chat 20/11 bằng nút trả lời «Duyệt, sửa mã» (nút chỉ gửi đúng chữ đó).

**Khác ảnh đã duyệt:**
- **Tên khách không tự thành hành khách** (câu 2 mục 7). Lý do tìm ra lúc thi công: dòng hành khách có tên mà thiếu năm sinh thì luật có sẵn chặn lưu đơn («Dòng 1: năm sinh là bắt buộc»), nên tự điền sẽ biến một đơn đang lưu được thành không lưu được. Làm thay: nút một chạm «Điền tên khách đi tour» trong khối Hành khách, bấm thì có sẵn dòng mang tên đó, con trỏ ở ô năm sinh. Mục 5 ghi «máy chủ không đổi» vẫn đúng; câu «không đổi dữ liệu lưu» ở câu 2 là sai, vì hành khách là dữ liệu lưu.
- **Ô «Giảm giá cho khách» của đối tác giữ khuôn cũ** (chữ gợi ý trong ô, không nhãn nổi): khuôn này do đặc tả đặt vé đối tác §4.1 chốt và có bài kiểm ghim. Câu giải thích vẫn dời xuống ngay dưới ô.
- **Hai câu giải thích ở Thanh toán giữ nguyên chữ** (ảnh rút gọn chữ): câu giảm giá do luật tính ra theo từng vai, đổi chữ là việc của bảng từ ngữ.
- **Mẫu đối tác HD-02-DT:** dòng «Số lượng» chỉ bỏ khi bảng đã ghi đủ từng loại khách; dịch vụ theo nhóm, nhập tay, hoặc dòng tiền lệch số khách vẫn in. Mẫu nội bộ cũng vậy với «Số khách».
- **Hotline in hai nơi** trên mẫu xác nhận: giữ nguyên (đầu trang là danh tính công ty, chân trang là lời mời gọi).

**Quyết định cũ bị đổi theo ảnh chủ duyệt hôm nay:**
- Ô chọn dịch vụ: bản 14/10 chốt «khung danh sách luôn mở, đứng yên sau khi chọn» để thêm nhiều dịch vụ liền tay. Nay khung thu lại sau mỗi lần chọn; thêm dịch vụ nữa phải bấm hoặc gõ ô tìm (thêm một chạm mỗi dịch vụ).
- Thanh bước: ảnh phác 14/10 có bốn bước; nay thêm «Hành khách» (ẩn khi khối Hành khách không dựng).
- Khối Hành khách ở máy tính: bản vẽ M2 đặt khối trải ngang dưới cả hai cột; nay nằm trong cột chính, sau Dịch vụ. Khi có hành khách, bảng năm cột chạy trong cột hẹp hơn — chưa chụp trường hợp nhiều hành khách.
- Nhãn ô ghi chú gọn của đối tác: «Ghi chú» kèm gợi ý «Thời gian đón» (đặc tả đặt vé đối tác) thành «Ghi chú đưa đón» kèm gợi ý «Ví dụ: đón lúc 7 giờ 30 tại sảnh».
- Mẫu xác nhận nội bộ: bài kiểm cũ ghim «giảm giá 0 in '0 ₫'» và hai số nổi bật; nay theo luật mẫu HD-02-DT (dòng bằng 0 thì bỏ, một số nổi bật).

**Chưa làm của đặc tả:** C2 (giảm số hình nút), nhóm D (bảng Dịch vụ & giá), B3 (khối «Người phụ trách» với đối tác: chưa tra xong, để nguyên).

**Kịch bản Chrome sau khi sửa (chạy 20/11, KHÔNG có `AXE_JS` nên chưa kiểm tương phản):** `a2-smoke-form.mjs` xanh; `dat-coc-smoke.mjs` xanh; `doi-tac-lap-don-smoke.mjs` 13 bước xanh, 2 bước đỏ (bước 6, 7: trang ĐƠN đã xác nhận còn khối «Người phụ trách» với Đối tác / Thực tập — trang đơn không nằm trong đợt sửa này; chưa đối chiếu với bản chính để biết đỏ từ bao giờ); `dua-don-smoke.mjs` không khởi động được (gieo tài khoản Đối tác thiếu `vai`, lỗi có từ ADR-0185) nên bước 3 của nó (khối Hành khách dạng bảng trải ngang ở 1040) CHƯA được sửa theo bố cục mới. Chưa chạy: `diem-dung-bi-che.mjs`, `khong-cuon-truoc-smoke.mjs`, `thanh-dinh-smoke.mjs`, `v1-xac-nhan-png.mjs`, `chip-nhom-smoke.mjs`, `danh-muc-lap-don-smoke.mjs`.
