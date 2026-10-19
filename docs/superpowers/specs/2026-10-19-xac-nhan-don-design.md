# Bước Xác nhận đơn, Đón/không đón theo khung giờ, QR sau xác nhận, Bảng điều khiển Toàn quyền — thiết kế

- Ngày: 2026-10-19. Trạng thái: **bản nháp chờ chủ duyệt**. Vai phiên: lập kế hoạch (không thi công).
- Bản mô tả luồng công việc thực tế + phân tích rủi ro: `2026-10-19-xac-nhan-don-luong-thuc-te.md`.
- Nguồn: lời chủ dự án trong phiên 19/10 (hai lượt hỏi–đáp, 14 + 4 câu). Lời chủ ghi là **[chủ]**; điều do người soạn tự đặt ghi là **[người soạn]** — chủ cần đọc kỹ các dòng này.
- Việc lớn (chạm quyền, dữ liệu, tiền, gửi thư ra ngoài): mỗi phần cần ADR riêng do chủ duyệt + trang ghép (CLAUDE.md §9) + người kiểm độc lập (§3).

## 1. Vì sao

Hôm nay người lập đơn tự bấm "Xác nhận"; không ai kiểm lại những dịch vụ phải hỏi nhà cung cấp còn chỗ hay không (ví dụ vé Vinpearl kèm buffet trưa). Khách nhận QR ngay cả khi đơn còn nháp, nên có thể chuyển tiền cho một dịch vụ chưa chắc còn vé. Ô đón khách từ 1/10 chỉ tự mở với dịch vụ có mẫu chặng "một chiều/khứ hồi"; dịch vụ khác chỉ có dòng chữ nhỏ "Không đưa đón", người lập dễ bỏ sót. Các công tắc của Toàn quyền nằm rải rác (trang Tôi, /giao-dien, /tro-ly-cai-dat, /chinh-sach-dieu-phoi, /sessions).

Thành công = (a) đơn có dịch vụ "cần xác nhận" không thể thành "đã xác nhận" nếu chưa có một người nội bộ chọn Còn vé; (b) khách chỉ thấy QR sau khi đơn đã xác nhận, kèm email đủ số tiền; (c) không còn đơn nào thiếu câu trả lời "đón hay không đón"; (d) Toàn quyền có một chỗ duy nhất để chỉnh mọi tuỳ chọn.

**Chống mục tiêu** (làm ra mà dính một trong các điều này là hỏng dù chạy được): đơn không cần xác nhận bị chậm thêm một bước; đơn chờ xác nhận lọt vào xếp xe; QR hiện trước khi xác nhận; email lộ thông tin đơn cho người không liên quan; khung giờ đón bị hiểu là giờ cam kết.

## 2. Phần A — Bước Xác nhận đơn

1. **Phạm vi [chủ]:** chỉ đơn có ít nhất một dịch vụ được Toàn quyền đánh dấu **"cần xác nhận"** (đánh dấu theo từng dịch vụ, không chi tiết theo mùa/ngày). Đơn không có dịch vụ nào như vậy giữ nguyên luồng hôm nay.
2. **Trạng thái mới [chủ]:** người lập bấm **"Gửi xác nhận"** → đơn ở trạng thái **"Chờ xác nhận"**. Người xác nhận chỉ có hai lựa chọn: **Xác nhận** hoặc **Huỷ (kèm lý do)**. Xác nhận xong, đơn trở thành **đơn tự do** (chưa có HDV phụ trách) như luồng hiện nay.
3. **Ai xác nhận [chủ]:** mọi vai nội bộ: Bán hàng, Kế toán, Quản trị, Toàn quyền, Hướng dẫn viên. **[người soạn]** Không gồm HCNS, Tài xế, Tài xế đối tác, Đối tác, Thực tập (chủ không nhắc tới; xếp vào nhóm không được, mở sau nếu chủ muốn).
4. **Tự xác nhận [chủ]:** người lập đơn là người nội bộ thì có tự xác nhận đơn của mình hay không do **một công tắc trên Bảng điều khiển** quyết. **[người soạn]** Mặc định của công tắc: BẬT (giữ hành vi hôm nay cho nội bộ). Đối tác và Thực tập luôn phải chờ người khác.
5. **Được sửa gì khi xác nhận [chủ]:** ngày đi, giờ đón, tình trạng vé (Còn vé / Hết vé, chọn tay). **Sửa phần tiền phải ghi lý do.**
   **Thấy và sửa tới đâu [chủ, lượt 3]:** mọi người xác nhận thấy danh sách đơn đang chờ và nội dung cần để kiểm vé (dịch vụ, ngày, số khách, giờ đón, tiền) nhưng **không thấy SĐT/email khách**. Ngày, giờ đón, tình trạng vé: mọi người xác nhận sửa được. **Tiền: chỉ ai đang có quyền sửa tiền theo bản đồ quyền hiện nay** (ví dụ Kế toán, Quản trị, Toàn quyền, Bán hàng với đơn mình lập); người khác thấy tiền ở dạng chỉ đọc. Hướng dẫn viên được thấy đơn đang chờ dù chưa phụ trách — đây là nới quyền xem có giới hạn, phải ghi trong ADR + trang ghép.
6. **Hết vé [chủ]:** chọn "Hết vé" = huỷ đơn và báo người lập. **[người soạn]** Dùng lại lý do huỷ có sẵn `HET_CHO` ("Hết chỗ", nhóm Công ty huỷ). Nhóm này hôm nay chỉ Quản trị/Toàn quyền chọn được; ở hộp xác nhận, máy chủ tự gán `HET_CHO` khi người xác nhận chọn Hết vé, không cần quyền phân loại (vì đây là kết quả kiểm vé, không phải người dùng tự phân loại). Huỷ vì lý do khác dùng danh sách lý do như hộp "Huỷ đơn" hiện nay.
7. **Hạn 15 phút [chủ]:** cố định 15 phút kể từ lúc gửi xác nhận. Quá hạn thì đơn hiện cảnh báo trên **Trang chủ** (khối "Việc của bạn") của những người xác nhận được. Không tự huỷ.
8. **Mốc tối thiểu trước giờ đón [chủ]:** giữ luật hôm nay (đơn có chặng dưới mốc phải được Quản trị/Toàn quyền "Đặt gấp" mới xác nhận được). Luật áp ở lúc **bấm Xác nhận**, không ở lúc gửi. Chủ muốn mặc định **30 phút** thay cho 360 phút hiện nay → chủ tự đổi trên trang Chính sách điều phối (đã có, chỉ thêm dòng, đảo ngược được); không cần mã.
9. **[người soạn] Trong lúc chờ:** đơn không vào xếp xe/đưa đón, không được ghi lần thu, không thấy QR (Phần C). Người lập không sửa được đơn đang chờ; muốn sửa thì bấm "Rút lại" để về nháp (đồng hồ 15 phút bắt đầu lại khi gửi lần sau).
10. **[người soạn] Cách lưu "Chờ xác nhận":** KHÔNG thêm giá trị vào `orders.status` (CHECK ba giá trị từ `0003`; thêm giá trị = dựng lại bảng `orders` và trigger, điều `0018` đã cố tình tránh). Đơn chờ vẫn là `draft`; "Chờ xác nhận" = có một dòng yêu cầu xác nhận còn mở trong một bảng riêng chỉ-thêm (gửi lúc, người gửi, kết quả, người xác nhận, tình trạng vé, lý do). Đảo ngược dễ, không chạm các chỗ đang đọc `status`; các chỗ hiển thị đọc thêm cờ "đang chờ".
11. **[người soạn] Sửa tiền khi xác nhận:** vì đơn chờ vẫn là nháp, người xác nhận sửa thẳng như sửa nháp (không qua luồng điều chỉnh tiền sau xác nhận), máy chủ bắt lý do khi tổng tiền đổi và ghi nhật ký. **Sửa 19/10 sau bản mô tả luồng thực tế:** câu cũ "không có lần thu nào trước xác nhận" SAI — hôm nay Nền tảng cho ghi thu lên đơn nháp, và hàng chờ nhận của HDV có cả đơn nháp. Xử lý ở hai câu hỏi chờ chủ trong `2026-10-19-xac-nhan-don-luong-thuc-te.md` (chặn ghi thu / chặn nhận khi đang chờ); chưa chốt thì Phần A ghi "xây trên lỗ đang hở: TNV-G1".
12. **[người soạn] HDV chọn sẵn lúc tạo đơn:** giữ nguyên như hôm nay — xác nhận xong, đơn có HDV đã chọn thì giữ người đó; không có thì thành đơn tự do. ("Như cũ" theo lời chủ ở câu 1.)
13. **[người soạn] Nhật ký:** mỗi lần gửi / xác nhận / huỷ / sửa tiền khi xác nhận ghi một dòng nhật ký có người làm và lý do (không ghi SĐT/email).

## 3. Phần B — Đón/không đón và khung giờ đón

1. **[chủ]** Khi tạo đơn, mỗi dịch vụ **bắt buộc chọn "Đón" hoặc "Không đón"**; chưa chọn thì không gửi/xác nhận được. Mẫu chặng theo dịch vụ (đang có) chỉ quyết **lựa chọn gợi ý sẵn**, không thay cho việc chọn. **[người soạn]** Bắt buộc từ lúc "Gửi xác nhận"/"Xác nhận"; lưu nháp vẫn cho bỏ trống. Đơn cũ đã xác nhận không bị đòi lại.
2. **Khung giờ đón [chủ]:** người lập chọn một khung trong danh sách **hoặc chọn "Giờ khác" để gõ giờ chính xác** (sân bay, tour chiều…) [chủ, lượt 3]. Khung mặc định: 07:30–08:00, 08:00–08:30, 08:30–09:00, 09:00–09:30, 09:30–10:00 (định dạng 24 giờ), kèm dòng lưu ý: *"Giờ đón thực tế có thể điều chỉnh cho phù hợp tình hình hoạt động."*
3. **[người soạn]** Một bộ khung dùng chung cho mọi dịch vụ, Toàn quyền sửa trên Bảng điều khiển (thêm/bớt khung, sửa câu lưu ý). Chặng đón lưu **khung đã chọn** và lấy **giờ đầu khung làm giờ hẹn** cho phân hệ Vận chuyển; giờ đón thật vẫn do điều phối ghi như hôm nay. Không phá ADR-0047 (chặng đưa đón) và mốc giờ hẹn bắt buộc của suất khách (`0043`).
4. **Vì sao "biến mất" (đã tra mã):** ô "Giờ đón / Điểm đón" chung của đơn bị bỏ ngày 1/10 (commit d045311f9) theo bản vẽ M1–M6 đã duyệt (ADR-0047 Phần B); khối "Đưa đón" theo từng dịch vụ thay thế và chỉ tự mở với mẫu chặng một chiều/khứ hồi. Không phải lỗi; phần B sửa chỗ dễ bỏ sót này.

## 4. Phần C — QR thanh toán sau xác nhận, email và thông báo

1. **[chủ]** Với đơn cần xác nhận, nút QR **ẩn hoàn toàn** tới khi xác nhận xong (ẩn ở giao diện **và** máy chủ từ chối route QR). **[người soạn]** Đơn không cần xác nhận: QR chỉ hiện khi đơn đã xác nhận (hôm nay hiện cả ở nháp — sửa luôn cho thống nhất; chủ có thể bác dòng này).
2. **Xác nhận xong [chủ, chốt ở lượt 3]:** gửi **email** tới (a) **người đặt của đơn** (hồ sơ đứng tên đặt — `booker_party_id`; đơn qua đại lý thì đại lý nhận, **không** gửi thẳng khách lẻ của đại lý) và (b) **nhân viên lập đơn** (email hồ sơ nhân viên). Đồng thời **thông báo trong Nền tảng** cho người lập đơn và người bấm xác nhận. QR ghi **đủ số tiền còn phải thu**; riêng đơn có cọc, QR ghi **số tiền cọc còn phải thu**.
3. Gửi thư qua chức năng email Cloudflare đang dùng cho Góp ý và mã hai lớp (`src/shared/gui-thu.ts`). Không có email thì bỏ qua người đó, không chặn việc xác nhận; ghi nhật ký "chưa gửi được" (không ghi địa chỉ).
4. Thư khi **Hết vé/Huỷ** ở bước xác nhận: chỉ báo người lập (thông báo trong Nền tảng) **[chủ]**. **[người soạn]** Không gửi email cho khách khi huỷ (chủ chưa nói; người lập tự liên hệ khách).
5. **[người soạn]** QR hiện do trình duyệt vẽ; email cần ảnh QR do máy chủ dựng (không dùng dịch vụ tạo ảnh bên ngoài, vì sẽ lộ số tài khoản + số tiền ra bên thứ ba). Nội dung thư tối thiểu: mã đơn, tên dịch vụ, ngày đi, khung giờ đón + câu lưu ý, tổng tiền, QR, số tài khoản nhận.

## 5. Phần D — Bảng điều khiển Toàn quyền

1. **[chủ]** Một trang mới, thiết kế lại cho chuẩn, vừa đúng hệ thống vừa hợp lý về dùng. Chỉ Toàn quyền (`settings.ops` hoặc ô mới tương đương).
2. **[người soạn] Bố cục đề xuất** — nhóm theo việc, mỗi nhóm một thẻ:
   - **Đơn hàng:** danh sách dịch vụ cần xác nhận (tìm + đánh dấu); công tắc "Người nội bộ tự xác nhận đơn của mình"; dòng chỉ đọc "Hạn xác nhận: 15 phút"; dịch vụ nhập tay (chuyển từ trang Tôi).
   - **Đón khách:** khung giờ đón; câu lưu ý; mẫu chặng theo dịch vụ (liên kết tới trang danh mục, đang có).
   - **Điều phối:** liên kết /chinh-sach-dieu-phoi (mốc tối thiểu…).
   - **Hệ thống:** chế độ bảo trì (chuyển từ trang Tôi), phiên đăng nhập, giao diện công ty, trợ lý.
   Trang hiện có giữ nguyên địa chỉ; Bảng điều khiển là cửa vào chung. Ảnh thật hai hướng (điện thoại + máy tính) trình chủ trước khi thi công giao diện.
3. Mọi cài đặt mới theo kiểu mẫu chặng: lưu trong D1, **chỉ thêm dòng** (có lịch sử ai đổi, lúc nào), đồng bộ Sheet không đụng tới.

## 5b. Chốt của chủ lượt 4 (19/10, sau bản mô tả luồng thực tế) — thắng mọi dòng [người soạn] ở trên nếu lệch

1. **[chủ] Đơn nháp chỉ người tạo đơn đọc được**; nháp chưa vào luồng đơn chung; **danh sách đơn chờ nhận không tính đơn nháp.** Hôm nay mã làm khác (hàng chờ nhận của HDV có cả đơn nháp; Quản trị/Toàn quyền xem được nháp của người khác) → đây là **luật mới phải thi công**, chạm bản đồ quyền xem đơn (ADR + trang ghép). **[người soạn]** Đơn "Chờ xác nhận" không còn là nháp riêng: người lập + mọi người xác nhận thấy được (theo quy tắc thấy/sửa ở Phần A mục 5), nhưng vẫn KHÔNG vào hàng chờ nhận của HDV; chỉ đơn đã xác nhận mới vào.
2. **[chủ] Đơn nháp không ghi thu tiền được.** Hôm nay mã cho ghi thu lên nháp → luật mới phải thi công; áp cả cho đơn "Chờ xác nhận". Nhờ vậy đơn huỷ vì hết vé không bao giờ giữ tiền khách (không xây trên lỗ TNV-G1). Mục 11 Phần A giữ đúng nhờ luật này.
3. **[chủ] Khoảng 22:00–06:00 (giờ Việt Nam) không tính vào 15 phút chờ.** Ví dụ gửi lúc 21:55 → còn 10 phút, tính tiếp từ 06:00 → quá hạn lúc 06:10.
4. **[chủ, người soạn hiểu]** Ảnh "XÁC NHẬN ĐƠN DỊCH VỤ" gửi khách chỉ tự bật cho đơn **không** cần bước xác nhận; đơn cần xác nhận thì chỉ có ảnh sau khi đã xác nhận xong.
5. **[chủ] Đơn bị huỷ (trạng thái đổi sang huỷ): thông báo trong Nền tảng VÀ email tới những người liên quan.** **[người soạn hiểu]** Áp cho MỌI lần huỷ, không riêng huỷ ở bước xác nhận. Người liên quan = người đặt của đơn (email), nhân viên lập đơn kể cả Đối tác/Thực tập (trong Nền tảng + email), người xác nhận và HDV đang phụ trách nếu có (trong Nền tảng). Thư nêu lý do huỷ theo nhãn, không kèm tên người huỷ. Dòng "không gửi email cho khách khi huỷ" ở Phần C mục 4 **bị thay** bởi mục này.
6. **[người soạn] Báo khi có đơn gửi xác nhận** (chủ chưa chốt): tin trong Nền tảng tới mọi người xác nhận được, ngay lúc gửi; nhắc thêm một lần khi quá hạn 15 phút (tính theo mục 3). Rung ban đêm hay không: theo giờ yên lặng hiện có (không rung 22:00–06:00), hợp với mục 3.

## 5c. Chốt lượt 5 (19/10, khi lập kế hoạch) — thắng các dòng ở trên nếu lệch

1. **[chủ] Bỏ ô "Trả trước" khỏi màn Tạo đơn**; tiền chỉ ghi được sau khi đơn đã xác nhận (trang đơn hoặc QR). Lý do: màn Tạo đơn hôm nay ghi khoản thu ngay sau khi lưu nháp, trái luật "nháp không ghi thu".
2. **[người soạn, sửa lại lựa chọn sai của chính mình]** Nền tảng KHÔNG có khái niệm "cọc phải thu" (cột `deposit_amount` đã chết; "cọc" trong mã là cọc của đơn huỷ — ADR-0089). Dòng "đơn có cọc thì QR ghi số cọc" ở Phần C mục 2 **bỏ**; QR luôn ghi **đủ số tiền còn phải thu**, đúng lời gốc của chủ.
3. **[người soạn]** "Nháp chỉ người tạo đọc" áp đúng chữ: hôm nay Bán hàng, Kế toán, Quản trị, Toàn quyền xem được nháp người khác và thẻ "Đơn nháp" trên Trang chủ đếm nháp cả công ty; sau thay đổi mỗi người chỉ thấy nháp của mình (đơn "Chờ xác nhận" thì người xác nhận thấy theo Phần A mục 5).
4. **[người soạn]** Bỏ "nhắc thêm một lần khi quá hạn" ở mục 5b.6 (cần bộ hẹn giờ mới); quá hạn chỉ hiện trên Trang chủ như lời chủ ở câu 6.

## 6. Thứ tự làm đề xuất

B (đón/khung giờ, ít rủi ro nhất) → A (xác nhận, lõi) → C (QR + email, cần A) → D (Bảng điều khiển; phần cài đặt của A/B/C thi công cùng phần đó, trang tổng hợp làm cuối). Mỗi phần một ADR; tối đa 3 quyết định chạm quyền/dữ liệu mỗi lượt duyệt.

## 7. Ràng buộc đã biết

- Thêm trạng thái vào `orders.status` (hôm nay chỉ `draft/confirmed/cancelled`) là đổi dữ liệu: migration mới theo expand–contract; mọi chỗ đọc trạng thái (thẻ đơn, bộ lọc, Bảng tin, sổ tiền, xếp xe, audit-invariants) phải xử lý giá trị mới.
- Quyền xác nhận tách khỏi `order.modify` (ô hôm nay dùng chung cho sửa/xác nhận/huỷ) → ô quyền mới trong `src/shared/permissions.ts`, máy chủ phải hỏi (bài permission-enforcement).
- **Xây cạnh lỗ đang hở TNV-G1** (đơn huỷ còn tiền đã thu, hạn 30/11): Phần A chặn ghi lần thu khi đơn chờ xác nhận, nên đơn huỷ vì Hết vé không có tiền; nếu không chặn được thì phải ghi "xây trên lỗ đang hở: TNV-G1".
- Email gửi khách là gửi dữ liệu ra ngoài: chỉ tới địa chỉ trong hồ sơ của đơn, không chép email vào nhật ký.

## 8. Để người thi công tự quyết

Tên mã trạng thái/ô quyền/bảng; cách dựng ảnh QR phía máy chủ; cách hiện đồng hồ 15 phút; chữ trên nút (giữ từ quen thuộc, đưa chủ chọn nếu lưỡng lự).

## 5d. Chốt lượt 6 (19/10, lúc chọn cách thi công)

1. **[chủ]** Trả lời nguyên văn "theo khuyến nghị của bạn" (lệnh `/superpowers:executing-plans`, 19/10) cho hai khuyến nghị đang treo trong báo cáo kế hoạch: (a) lịch chung điều phối xe **chỉ hiện chặng của đơn nháp đã gửi xác nhận**, bỏ nháp chưa gửi; (b) cách thi công: mỗi đợt một trợ lý làm hết, cuối đợt có người kiểm độc lập.

## 5e. Chốt lượt 7 (19/10, khi duyệt lượt 1)

1. **[chủ]** "Chỉ người tạo đọc" kèm **"chỉ người tạo sửa"**: mọi đường ghi lên đơn nháp (kể cả sửa thông tin chuyến, sửa thương mại theo dịch vụ) chỉ người lập. Nguyên văn: "câu 2- đồng ý".
2. Câu "đặt gấp cho nháp sát giờ": chủ yêu cầu ví dụ cụ thể và phân tích trước khi quyết (chưa chốt).
