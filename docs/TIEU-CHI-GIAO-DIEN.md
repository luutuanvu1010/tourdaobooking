# Tiêu chí đánh giá giao diện

> Tài liệu sống: đây là nơi DUY NHẤT ghi tiêu chí chấm «mạch lạc, logic, không lỗi thị giác» cho màn hình của Nền tảng. Trợ lý `nguoi-danh-gia-giao-dien` đọc tệp này trước khi chấm; người thiết kế màn mới cũng nên đọc.
> Phần máy đo lấy từ bảng tiêu chí T của kế hoạch `docs/superpowers/plans/2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md` mục 3 (giữ nguyên mã). Phần suy xét rút từ các phát hiện thật ngày 27/10, 13/11 và 20/11.
> Ngưỡng do AI đặt (bề mặt, đảo ngược được); chủ dự án sửa được. Luật giao diện về mã (`h()`, token, khai trang) nằm ở `web/CLAUDE.md`, không chép lại ở đây.

Cách chấm đi theo thứ tự: **máy đo trước** (thứ gì ra được con số thì không dùng mắt), **suy xét sau** (thứ cần hiểu việc của người dùng), **chủ dự án duyệt cuối** về gu. Tài liệu này không chấm gu màu, phong cách hay «dấu ấn riêng»: đây là công cụ làm việc, điều được đặt nặng là màn hình liền một khối và dễ dùng.

## 1. Phần máy đo

Chạy bằng `node scripts/giao-dien/do-man.mjs --o <BỘ:/trang>`. Mỗi tiêu chí ra một trong bốn kết quả: đạt, không đạt, chưa đo, không áp dụng. Mã thoát của lệnh: 0 là mọi tiêu chí đạt; 1 là có tiêu chí không đạt; 2 là không chạy được hoặc **đo thiếu** (ví dụ thiếu công cụ kiểm tương phản). Kết quả đo thiếu không bao giờ được coi là đạt.

Mã và ngưỡng dưới đây phải khớp `scripts/giao-dien/cham-may.mjs` (bài kiểm `src/giao-dien-tieu-chi-khop.test.ts` so hai bên).

| Mã | Tiêu chí | Ngưỡng đạt | Khổ áp dụng |
|---|---|---|---|
| `T1` | Không cuộn ngang | trang không tràn ngang | 390, 1280 |
| `T2` | Không cắt chữ thông tin chính | 0 chỗ cắt mất số tiền hay con số (chỗ cắt chữ phụ chỉ đếm, không tính vi phạm) | 390, 1280 |
| `T3` | Không phần tử nổi hay dính đè nút, số tiền | 0 chỗ | 390, 1280 |
| `T4` | Vùng chạm ở điện thoại | mọi nút, liên kết, ô từ 44 × 44 | 390 |
| `T5` | Một tiêu đề chính, tối đa một nút chính ở màn đầu | đúng 1 tiêu đề, không quá 1 nút nền đặc | 390, 1280 (bỏ khối trạng thái toàn trang) |
| `T6` | Ít kiểu dáng | không quá 3 hình nút, không quá 5 cỡ chữ | 1280 |
| `T8` | Trợ năng tự động (axe, gồm tương phản mức AA) | 0 lỗi mức nặng, nghiêm trọng | 390, 1280 |
| `T9` | Không lộ chữ Anh hay mã thô | 0 từ | 390, 1280 |
| `T15` | Nút, ô, liên kết đều có tên cho bộ đọc màn hình | 0 phần tử không tên | 390, 1280 |
| `M1` | Ô gõ cỡ chữ từ 16 px | 0 ô nhỏ hơn | 390, 1280 |
| `M2` | Chữ không chồng chữ | 0 cặp chồng | 390, 1280 |
| `M3` | Ô gõ có nhãn | 0 ô không nhãn | 390, 1280 |

Lệnh này chưa đo: khoảng trống theo lưới chung (T7, đang chờ lưới), tốc độ và nhảy bố cục (T10, T11), hộp hỏi của hệ điều hành (T12, đã có bài kiểm riêng), iPhone thật (T13), hành trình từng vai (T14), cỡ chữ lớn của máy (T16), chữ khớp bảng tham chiếu (T17, đã có bài kiểm cho chữ nút), điều kiện lên kho ứng dụng (T19). Điểm Nielsen theo họ màn (T18) được thay bằng mười tiêu chí suy xét ở mục 2.

Máy đo cũng báo nhầm (13/11: «310 ô chồng chữ» là giả, do đếm cả phần tử đã cuộn khuất). Người chấm được ghi nhận xét «có vẻ báo nhầm, vì …» cạnh một dòng máy đo, nhưng không được bỏ dòng đó khỏi báo cáo.

## 2. Phần suy xét

Mười tiêu chí. Mỗi tiêu chí chấm trên **ảnh màn hình thật**, cả hai khổ. Một phát hiện chỉ được ghi khi chỉ được vào một chỗ nhìn thấy trên một tệp ảnh cụ thể. Không chỉ được thì không ghi.

### S1 — Một thông tin, một lần
- **Đạt khi:** người dùng chỉ phải nhập mỗi thông tin một lần; cùng một giá trị (tên, số tiền, ngày, tên dịch vụ) không hiện lặp trên một màn, trừ khi lần lặp phục vụ một việc khác hẳn.
- **Không đạt khi:** hai ô cùng hỏi một thứ; nhiều ô cùng mang một tên; một số tiền lặp từ ba lần liền nhau khi chỉ có một dòng tính; dòng «0 ₫» không mang thông tin.
- **Ví dụ thật:** Tạo đơn 20/11 — gõ «Tên khách đi tour» rồi khối Hành khách đòi gõ lại tên; cùng một số tiền hiện ba đến năm lần.
- **Đừng báo khi:** số tổng có ở thanh dính đáy màn điện thoại và ở khối tóm tắt; tiêu đề trang trùng tên mục điều hướng.
- **Mức mặc định:** Nặng nếu bắt gõ lại; Nhỏ nếu chỉ hiện lặp.

### S2 — Một nút chính
- **Đạt khi:** mỗi màn (và mỗi hộp thoại) có đúng một nút nổi nhất, là việc chính của màn; nút khác kém nổi rõ ràng; nút nguy hiểm (xoá, huỷ) không mang dáng nút chính.
- **Không đạt khi:** hai nút nền đặc cùng màu cùng cỡ đứng cạnh nhau; nút điều hướng chung nổi ngang nút chính của màn; không nút nào nổi nên không biết bấm gì để xong việc.
- **Ví dụ thật:** Tạo đơn máy tính 20/11 — nút đỏ «Tạo đơn» ở thanh trên cạnh tranh với «Gửi đơn».
- **Liên hệ máy đo:** T5 chỉ đếm nút nền đặc ở màn đầu; S2 xét cả màn và độ nổi tương đối.
- **Mức mặc định:** Nặng.

### S3 — Một con số chính
- **Đạt khi:** màn có tiền thì chỉ một số được nhấn mạnh nhất, và đó là số người dùng cần để hành động (số khách phải trả, số còn phải thu); số khác nhỏ hơn hoặc nhạt hơn.
- **Không đạt khi:** hai số cùng tô đỏ hoặc cùng đậm ngang nhau; số phụ nổi hơn số chính; nhìn không biết số nào là số phải trả.
- **Ví dụ thật:** Tạo đơn 20/11 — hai dòng tiền tô đỏ cùng lúc.
- **Mức mặc định:** Nặng; Chặn việc nếu có thể hiểu sai số phải trả.

### S4 — Bước khớp khối, thứ tự theo việc
- **Đạt khi:** các khối xếp theo trình tự người dùng làm việc; thanh bước (nếu có) có số bước và tên bước khớp các khối trên trang; dấu «đủ» chỉ hiện khi khối đó thật sự đủ.
- **Không đạt khi:** thanh bước ghi ba bước mà trang có sáu khối; tên bước không trùng tên khối; điều phải biết trước lại đứng sau.
- **Ví dụ thật:** Tạo đơn 20/11 — ba bước, sáu khối; cả ba bước đã đánh dấu đủ trong khi lưu vẫn bị báo thiếu.
- **Giới hạn:** dấu «đủ» sai chỉ thấy khi bấm lưu. Trên ảnh tĩnh, chấm phần nhìn thấy và ghi phần còn lại vào «không kiểm được».
- **Mức mặc định:** Nặng.

### S5 — Hai khổ một trình tự, một tên
- **Đạt khi:** khổ 390 và khổ 1280 của cùng một màn giữ cùng thứ tự khối (đọc từ trên xuống) và cùng tên khối, tên nút, cách viết số; chỉ khác cách xếp cột.
- **Không đạt khi:** thứ tự khối khác nhau giữa hai khổ; một khối hay nút có ở khổ này mà mất ở khổ kia không lý do; cùng một số viết hai kiểu.
- **Ví dụ thật:** Tạo đơn 20/11 — điện thoại là Hành khách rồi Thanh toán, máy tính ngược lại. Đơn hàng 13/11 — «1,43tr đ» ở điện thoại, «1.430.000 đ» ở máy tính.
- **Đừng báo khi:** thanh tab đáy (điện thoại) thay cho thanh bên (máy tính); khối tóm tắt chỉ đọc nằm cột phải ở máy tính và nằm cuối ở điện thoại.
- **Mức mặc định:** Nặng nếu đổi thứ tự bước làm việc; Nhỏ nếu chỉ khác cách viết.

### S6 — Cùng nghĩa cùng tên, cùng hình
- **Đạt khi:** cùng một thứ mang một tên (theo `docs/BANG-THAM-CHIEU.md`), một hình (nút cùng cấp cùng dáng, huy hiệu cùng nghĩa cùng màu), một cách viết (tiền, ngày, số điện thoại); ô nhập trên một màn theo một khuôn (nhãn, ô, câu giải thích ngay dưới).
- **Không đạt khi:** chỗ này «Họ tên», chỗ kia «Họ tên khách»; ba kiểu ô nhập trên một form; hai huy hiệu cùng nghĩa khác màu.
- **Ví dụ thật:** Tạo đơn 20/11 — nhãn nổi trong ô, chỉ có chữ gợi ý không nhãn, nhãn trên ô cùng nằm trên một form.
- **Liên hệ máy đo:** T6 đếm số hình nút và số cỡ chữ; S6 xét nghĩa.
- **Mức mặc định:** Nhỏ; Nặng nếu hai tên làm người dùng tưởng là hai thứ khác nhau.

### S7 — Nhãn và nút nói đúng
- **Đạt khi:** nhãn, chữ gợi ý trong ô và nội dung khớp nhau; tên nút nói việc sẽ xảy ra khi bấm; nút hay ô bị mờ có một câu ngắn nói vì sao hoặc phải làm gì trước; hai lựa chọn ngược nhau không dùng chung một chữ.
- **Không đạt khi:** nhãn «Ghi chú» mà chữ gợi ý là «Thời gian đón»; nút mờ mà không nói vì sao; một chữ mang hai nghĩa ngược nhau trên cùng màn.
- **Ví dụ thật:** Tạo đơn 20/11 (nhãn và gợi ý lệch nhau); Tài xế đối tác 13/11 («Lưu khung bận» mờ, không giải thích); Hoa hồng 29/10 («Tắt» hai nghĩa).
- **Mức mặc định:** Nặng.

### S8 — Bố cục ngay ngắn
- **Đạt khi:** không có khoảng trống lớn không chứa gì giữa các khối; ở 1280 nội dung không dạt một phía để trống nửa màn; khối cùng cấp thẳng mép và cách nhau đều; số tiền trong một cột thẳng hàng.
- **Không đạt khi:** hố trống cao hơn khoảng một phần ba màn giữa hai khối; danh sách dài nằm một cột hẹp bên trái, nửa phải trống; hai thẻ cùng hàng lệch mép; khoảng cách giữa các khối lúc rộng lúc hẹp.
- **Ví dụ thật:** Tạo đơn 20/11 — hộp tìm dịch vụ vẫn mở sau khi chọn, để lại khoảng trống khoảng 330 px. Thiết lập 13/11 — danh sách phẳng khoảng 20 dòng, nửa phải trống. Lời chủ 29/10: «có những khoảng trống vô lý».
- **Đừng báo khi:** lề hai bên của khung nội dung; khoảng thở quanh tiêu đề.
- **Mức mặc định:** Nặng nếu thấy ngay ở màn đầu; Nhỏ nếu phải cuộn mới thấy.

### S9 — Thứ bậc nhìn rõ
- **Đạt khi:** nhìn ba giây biết màn này để làm gì và bắt đầu từ đâu: tiêu đề trang nổi nhất, tiêu đề khối nổi hơn nội dung, chữ phụ nhạt hơn chữ chính; thứ quan trọng nằm trên, thứ ít dùng gập lại hoặc ở dưới.
- **Không đạt khi:** mọi chữ cùng cỡ cùng độ đậm; khối giải thích dài đứng trước việc chính; thứ hiếm dùng chiếm đầu màn; quá nhiều thứ cùng tô màu nên không còn gì nổi.
- **Ví dụ thật:** Hoa hồng 13/11 — khối giải thích dài ở đầu trang. Điều phối xe 13/11 — rất dày, khó dùng ở điện thoại.
- **Mức mặc định:** Nặng nếu việc chính bị đẩy khỏi màn đầu; còn lại Nhỏ.

### S10 — Trạng thái và chữ dễ hiểu
- **Đạt khi:** trạng thái rỗng, đang tải, lỗi, không quyền có câu tiếng Việt dễ hiểu và một lối đi tiếp; câu báo lỗi nằm cạnh chỗ sai và nói cách sửa; không chữ nội bộ, mã thô, chữ viết tắt lạ.
- **Không đạt khi:** màn rỗng chỉ có một dòng chữ, không lối đi tiếp; lộ mã như `VP_TRAN_PHU`, `cancelled`; chữ nội bộ kiểu «(văn phòng lo)»; câu báo lỗi ở đầu trang trong khi ô sai ở cuối.
- **Ví dụ thật:** Đơn hàng 13/11 (trạng thái rỗng một dòng); Địa điểm 13/11 (mã thô).
- **Liên hệ máy đo:** T9 bắt chữ Anh và mã thô theo danh sách; S10 xét câu chữ có dễ hiểu không. Tên nút, nhãn tra `docs/BANG-THAM-CHIEU.md`; người chấm không tự đề xuất tên mới.
- **Mức mặc định:** Nặng nếu người dùng kẹt, không biết làm gì tiếp; còn lại Nhỏ.

## 3. Ba mức của một phát hiện

- **Chặn việc:** người dùng không làm xong được việc của màn, hoặc có thể hiểu sai số tiền, hoặc dễ bấm nhầm một việc không hoàn tác được.
- **Nặng:** thấy ngay; làm người dùng chậm lại, nhầm, phải gõ lại, hoặc mất tin vào Nền tảng.
- **Nhỏ:** thẩm mỹ, không cản việc. Gộp lại, không cần sửa ngay.

## 4. Điều tài liệu này không chấm

- Gu màu, phong cách, «dấu ấn riêng».
- Quyết định bố cục chủ dự án đã duyệt bằng ảnh: người chấm chỉ ghi «khác ảnh đã duyệt» khi màn thật lệch ảnh, không đề nghị đổi quyết định.
- Luật về mã giao diện và quyền hiển thị: thuộc `web/CLAUDE.md` và người kiểm độc lập.

## 5. Ví dụ thử trợ lý

Bộ ví dụ ở `scripts/giao-dien/vi-du/`: mỗi ví dụ là một màn thật bị cấy một lỗi phỏng theo một phát hiện đã ghi, hoặc một màn không cấy. Mỗi tiêu chí S có ít nhất một ví dụ. Trợ lý chỉ được tin khi đã bắt được lỗi cấy và không báo nhầm quá ngưỡng (đặc tả `docs/superpowers/specs/2026-11-20-tro-ly-danh-gia-giao-dien.md` mục 2). Chủ dự án thấy trợ lý bỏ sót hay báo nhầm một lỗi thật thì lỗi đó thành một ví dụ mới.
