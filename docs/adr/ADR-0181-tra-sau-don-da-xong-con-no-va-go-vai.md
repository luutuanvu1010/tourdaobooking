# ADR-0181 — Trả sau: đơn đã «Xong và đủ tiền» còn nợ được nhắc và nới hạn; thôi làm đối tác thì hết hạn mức

- **Trạng thái:** **proposed** 2026-11-07 — chủ bấm «Theo khuyến nghị» trong chat (phiên `claude/partner-type-ta-oracle-18-efd687`) cho hai hướng dưới đây, sau báo cáo kiểm độc lập toàn phần Trả sau ngày 7/11 (phát hiện TRUNG-1, TRUNG-2); chờ chủ duyệt văn bản.
- **Loại:** việc lớn (tiền, dữ liệu). **Cửa:** hai chiều về hành vi; Đ1 cần một migration tạo lại trigger khoá (thêm một trường hợp được phép, không đổi dữ liệu).
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt:** 2 (cùng lượt với ADR-0177 đã duyệt sáng 7/11 — tổng 3).
- **Quan hệ với ADR cũ:** **thêm một ngoại lệ có tên** cho ADR-0025 H6 («đơn đã Đã giao khoá tất cả»). **Áp** ADR-0168 Đ1 mục 2 («chỉ cấp cho hồ sơ đang mang loại đối tác được hưởng») vào lúc vai kết thúc. Không đổi ADR-0172, ADR-0173, ADR-0177.

## Bối cảnh

Đối tác thu tiền mặt của khách, ghi đủ tiền rồi bấm «Xong và đủ tiền», nhưng chưa nộp về công ty. Theo ADR-0177, đơn đó vẫn còn nợ (phần đối tác đang giữ). Nợ này vẫn tính vào hạn mức, và quá hạn thì vẫn chặn đơn Trả sau mới. Nhưng máy hiện chỉ nhắc đơn chưa «Xong và đủ tiền», và nút «Ân hạn» bị khoá «đơn đã xong» của ADR-0025 chặn. Kết quả là nợ không ai nhắc, hết ân hạn thì đối tác bị chặn mà Quản trị không nới được. ADR-0173 Đ3 mục 2 chỉ bỏ đơn **đã trả đủ** khỏi việc nhắc, nên phần nhắc là sửa mã cho đúng văn bản đã duyệt. Phần nới hạn đụng khoá của ADR-0025, nên cần quyết định này.

Hạn mức chỉ kiểm vai lúc thêm dòng. Hồ sơ gỡ vai đối tác cuối cùng (đã hết nợ thì gỡ được) vẫn giữ hạn mức đang mở; văn phòng vẫn đặt Trả sau hộ được.

## Quyết định

1. **Đơn đã «Xong và đủ tiền» còn nợ:** máy nhắc như đơn chưa xong (trước hạn 6 giờ, lúc quá hạn, mỗi mốc một lần), và Quản trị, Toàn quyền bấm «Ân hạn» được với cùng luật ADR-0173 Đ1 mục 3 (có lý do, chỉ lùi, giữ số giờ ân hạn, có nhật ký). Đây là **ngoại lệ duy nhất** của khoá «đơn đã xong»: chỉ ba cột hạn trả (`credit_due_at`, `credit_grace_until`, `credit_due_date`) được đổi, mọi cột khác vẫn khoá ở cả máy chủ và CSDL. Hạn trả không đi vào sổ tiền nên không làm sổ lệch (lý do khoá của ADR-0025).
2. **Thôi làm đối tác thì hết hạn mức:** hạn mức chỉ dùng được khi hồ sơ đang mang loại đối tác được hưởng (máy chủ kiểm lúc đọc, mọi đường). Gỡ vai được hưởng cuối cùng ở màn Danh bạ hay màn Tài khoản thì máy **đóng hạn mức** trong cùng lô, có nhật ký. Mang vai lại thì phải bật Trả sau lại từ đầu. Kiểm bất biến dữ liệu báo mọi hạn mức còn mở trên hồ sơ không còn vai (lưới cuối cho đường ít gặp như gộp hồ sơ).

## Phương án đã cân nhắc

- **Đ1 — chỉ nhắc, không nới hạn đơn đã xong:** giữ nguyên khoá, nhưng đối tác bị chặn mà không ai gỡ được ngoài việc nộp tiền. Chủ không chọn.
- **Đ2 — chỉ kiểm vai lúc đọc, không đóng:** mang vai lại thì hạn mức cũ sống lại lặng lẽ. Không chọn; kiểm lúc đọc giữ làm lớp thứ hai.

## Hệ quả

- Danh sách đơn được xét nhắc lớn dần theo mọi đơn Trả sau đã xong (lọc nợ bằng cùng hàm tính nợ). Quy mô hôm nay (khoảng 1.000 đối tác) chấp nhận được; ghi để xem lại khi lớn.
- Bài khoá trigger «đơn đã xong» (NT-R6) phải nhận trường hợp được phép mới bằng tên, không nới chung.

## Tiêu chí nghiệm thu

1. Đơn đã xong, còn nợ 179.000 ₫: trước hạn 6 giờ có đúng một tin, lúc quá hạn có đúng một tin (Kế toán cũng nhận); đơn đã xong hết nợ: không tin.
2. «Ân hạn» trên đơn đã xong còn nợ: 200, nhật ký có mốc cũ, mốc mới, lý do; đơn đã xong hết nợ: 409; đổi bất kỳ cột nào khác của đơn đã xong: vẫn bị CSDL chặn.
3. Gỡ vai được hưởng cuối cùng (Danh bạ, Tài khoản): hạn mức đóng, nhật ký ghi; mang vai lại: chưa có Trả sau. Vai hết hạn theo ngày mà hạn mức còn mở: không xác nhận được đơn Trả sau.
4. Mỗi điều có bài đỏ trước, thử phá đỏ rồi hoàn nguyên, có dòng `docs/SO-HANG-RAO.md`.

## Trang ghép (lượt 7/11: ADR-0177, ADR-0181 Đ1, Đ2)

(1) **Bảng chạm:** `orders` (ba cột hạn trả của đơn đã xong — Đ1), `bil_credit_reminder` (thêm dòng cho đơn đã xong — Đ1), `bil_credit_limit` (đóng dòng khi gỡ vai — Đ2), `bil_ledger_line` (chỉ đọc, ADR-0177). Không thêm loại dữ liệu mới vào bảng nào. (2) **Bản đồ quyền:** không đổi ô nào; `credit.due.extend` nay áp cả cho đơn đã xong còn nợ; `credit.limit.write` không đổi; đóng hạn mức ở Đ2 chạy theo quyền gỡ vai đã có (người gỡ vai là người ghi nhật ký). (3) **Cửa:** route «Ân hạn» bỏ chặn sớm «đơn đã xong» (chỉ route này); trigger `orders_delivered_lock` thêm một trường hợp được phép; nút «Ân hạn» trên màn đơn hiện cả khi đơn đã xong còn nợ; ô «Trả sau» ở Cấp độ đại lý và «Trả sau của tôi» không hiện hạn mức cho hồ sơ không còn vai; cổng xác nhận đơn Trả sau từ chối hồ sơ không còn vai.
