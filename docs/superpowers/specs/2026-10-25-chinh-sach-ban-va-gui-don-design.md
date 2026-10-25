# Chính sách bán theo loại đối tác, cờ «cần xác nhận» theo nhóm, nút «Gửi đơn» của Đối tác — thiết kế

- Ngày: 2026-10-25. Trạng thái: **bản nháp chờ chủ duyệt**. Vai phiên: lập kế hoạch (không thi công).
- Nền phải xây tiếp (hồ sơ có ngày, không sửa):
  - thiết kế xác nhận đơn `2026-10-19-xac-nhan-don-design.md` (mục 5b–5f thắng phần trên);
  - đề xuất ADR-0136 `2026-10-19-xac-nhan-don/DE-XUAT-ADR-0136-buoc-xac-nhan-don.md` (**chưa duyệt**);
  - ADR-0134 (đã lên bản 2.23) và ADR-0135 (đã duyệt, chưa thi công).
- Lời chủ ghi **[chủ]**. Điều người soạn tự đặt ghi **[người soạn]** — chủ đọc kỹ các dòng này.
- Đây là việc lớn vì chạm quyền và dữ liệu. Mỗi phần cần ADR do chủ duyệt, trang ghép (CLAUDE.md §9) và người kiểm độc lập (§3).
- **Xây trên lỗ đang hở: không**, với điều kiện Đợt 2 (ADR-0135, nháp không ghi thu) lên cùng Đợt 3, như chủ đã chọn A ngày 19/10.
  - Nếu tách hai đợt ra, nhánh «Hết vé» sẽ xây trên lỗ TNV-G1 (đơn huỷ còn tiền đã thu).
  - Các lỗ HIGH khác trong `docs/quyen-hoan.json` (TNV-G3, TNV-G4, HC-4.2, HC-5.19, HC-5.11) không chạm vùng này.
- Người kiểm độc lập đã soát sự thật một vòng (25/10); bản này đã sửa theo kết quả đó.

## 1. Chủ muốn gì [chủ, 25/10]

1. Cho phép hay không cho phép một vai đối tác đặt một dịch vụ hoặc một nhóm dịch vụ.
   - Ví dụ: loại hình «công ty tổ chức tour đảo» không nhìn thấy và không đặt được nhóm «tour đảo».
   - Chủ nêu hai chỗ có thể đặt: làm phân hệ tồn kho, hoặc đặt trong phân hệ bán hàng.
2. Đánh dấu xác nhận theo nhóm dịch vụ.
   - Vé Hòn Tằm không cần xác nhận thủ công.
   - Vé Vinpearl kèm buffet thì cần, vì phụ thuộc ghế còn trống lúc đặt.
3. Đơn của Đối tác kết thúc ở «Gửi đơn».
   - Đơn có dịch vụ cần xác nhận thì báo «Đơn của bạn đã được gửi và chờ xác nhận».
   - Đơn không có thì báo «Đơn của bạn đã được chuyển đến chuyên viên phụ trách & chờ hướng dẫn viên».

**Chủ chọn 25/10 (hộp chọn):**
- (a) Luật chặn xét theo **bên đặt của đơn**: ai lập cũng bị chặn.
- (b) «Gửi đơn» áp cho **mọi tài khoản Đối tác**.
- (c) «Chuyên viên phụ trách» là **văn phòng nói chung**: đơn vào hàng chờ nhận như hôm nay, không thêm dữ liệu mới.

## 2. Ý 1 — Chính sách bán theo loại đối tác (mới, cần ADR mới)

- **Hình dạng [người soạn].**
  - Mỗi luật là một dòng dữ liệu «loại đối tác × (nhóm dịch vụ hoặc một dịch vụ) ⇒ không bán».
  - Dòng có ngày bắt đầu và ngày kết thúc hiệu lực. Bảng chỉ thêm: muốn bỏ luật thì đặt ngày kết thúc, không xoá. Khuôn này giống mức hoa hồng của phân hệ giá.
  - **Chỉ có dòng CHẶN.** Không có dòng nào «cho thêm».
- **Áp ở đâu [chủ (a)].**
  - Máy chủ xét hồ sơ **bên đặt** của đơn.
  - Máy chủ chặn khi lưu, khi gửi và khi xác nhận, kể cả nháp cũ đã chứa dịch vụ nay bị chặn.
  - Danh mục gửi cho người lập cũng được lọc theo bên đặt, nhưng việc lọc này chỉ để giao diện ẩn đi.
- **Loại phải gắn ở đâu [người soạn].**
  - Tài khoản Đối tác **luôn** gắn với hồ sơ cá nhân; máy chủ từ chối hồ sơ công ty.
  - Bên đặt của đơn Đối tác bị ép là chính hồ sơ cá nhân đó, khi hồ sơ mang loại được hưởng. Đối tác cũng không chọn được hồ sơ công ty làm bên đặt.
  - Vì vậy **loại phải gắn lên hồ sơ cá nhân của từng tài khoản Đối tác**, như cách tính hoa hồng hôm nay.
  - Nếu chỉ gắn loại lên hồ sơ công ty, luật sẽ không chặn được đơn nào của nhân viên công ty đó.
  - Muốn xét theo hồ sơ công ty thì phải làm trước việc «đại lý tổ chức nhiều nhân viên» (BACKLOG §44, chủ chốt để sau ngày 24/10).
- **Ca biên [người soạn].**
  - Hồ sơ không mang loại nào thì không bị chặn.
  - Hồ sơ mang nhiều loại thì chỉ cần một loại bị chặn là bị chặn.
  - Đổi nhóm của một dịch vụ thì luật đi theo nhóm mới.
- **Cổng chặn [người soạn].**
  - Máy chủ chặn ở mọi đường ghi đặt bên đặt hoặc dịch vụ: lập đơn, sửa nháp, gửi, xác nhận, và đổi bên đặt (kể cả trên đơn đã xác nhận).
  - Đơn đã xác nhận trước ngày luật có hiệu lực không bị xét lại.
  - Dịch vụ nhập tay không có mã và không có nhóm, nên luật không phủ được. Đối tác không nhập tay được (ADR-0061), nhưng văn phòng thì có.
- **Ai đặt luật [người soạn].** Toàn quyền, cùng chỗ với cờ «cần xác nhận» (Bảng điều khiển, thiết kế 19/10 Phần D).
- **Chỗ đặt mã [người soạn].**
  - Đặt ở phân hệ giá (`pricing`), vì phân hệ này đã đọc được loại đối tác và nhóm dịch vụ, và luật thương mại gắn vai (Hiến chương 2.3).
  - Không làm phân hệ tồn kho, vì Nền tảng chưa có nguồn số chỗ trống. Đếm chỗ thật là dự án riêng (BACKLOG §48).
  - Phân hệ danh mục (`catalog`) không được đọc phân hệ giá. Vì vậy, muốn lọc danh mục theo bên đặt thì cần một hàm do gốc lắp ráp tiêm vào.
- **Luật nền bị chạm (P18).**
  - Luật nền: vai trong hồ sơ chỉ để ghi và truy vấn, **không bao giờ để cho hay chặn** một thao tác. Nguồn: ADR-0001 mục 4 (theo cách bài R-N1-12 diễn giải), ADR-0005 đ1, ADR-0018 đ3.
  - Ý 1 dùng loại đối tác để CHẶN, nên chỉ làm được khi ADR mới ghi rõ đây là **ngoại lệ có tên** của các điều đó.
  - Đã có tiền lệ: hồ sơ «Công ty chủ» là ngoại lệ chỉ siết (`src/CLAUDE.md`).
  - ADR mới phải kèm bài khoá «bảng luật không có cột hay giá trị cho thêm».
  - ADR đó còn phải thay câu «danh mục giống hệt cho mọi người lập đơn» ở ADR-0028 đ2, ADR-0033 đ2 (cả mục Hệ quả) và ADR-0058 Đ5.
- **Chưa kiểm.** Production đã có loại «công ty tổ chức tour đảo» chưa? Loại được thêm trên màn hình (ADR-0117); trong mã, loại gần nhất là «Công ty lữ hành».
- **Sửa sự thật trong bản phân tích 24/10 (YC-0022).** Quản trị **đã** ẩn hay hiện được từng dịch vụ, nhưng việc ẩn áp cho mọi người, không theo loại đối tác.

## 3. Ý 2 — Cờ «cần xác nhận» theo dịch vụ hoặc nhóm (bổ sung 25/10 cho đề xuất ADR-0136 Đ1)

- **[chủ 19/10]**
  - Toàn quyền đánh dấu dịch vụ cần xác nhận.
  - Đơn phải qua «Gửi xác nhận» khi có ít nhất một dịch vụ cần xác nhận, **hoặc** có chặng đón dưới mốc tối thiểu mà chưa đặt gấp (mục 5f).
  - Người nội bộ kiểm chỗ bằng tay rồi chọn Còn vé hoặc Hết vé. Hạn 15 phút, không tính 22:00–06:00.
- **[chủ 25/10]** Đánh dấu được cả theo nhóm.
- **[người soạn] Mức cụ thể nhất thắng.**
  - Dịch vụ có dòng riêng thì theo dòng riêng. Không có thì theo nhóm. Không có cả hai thì không cần xác nhận.
  - Ví dụ: nhóm Vinwonders «không cần», riêng vé kèm buffet «cần».
- Dịch vụ nhập tay không có mã nên không gắn cờ được (theo đề xuất ADR-0136).

## 4. Ý 3 — Nút «Gửi đơn» của Đối tác (bổ sung 25/10 cho đề xuất ADR-0136)

Mọi tài khoản Đối tác [chủ (b)] chỉ còn một nút **«Gửi đơn»**, thay cho cặp nút «Lưu, chờ xác nhận» rồi «Xác nhận đơn». Máy chủ chọn nhánh:

- **Đơn có dịch vụ cần xác nhận, hoặc có chặng dưới mốc chưa đặt gấp.** Máy chủ mở yêu cầu xác nhận, và giao diện báo **«Đơn của bạn đã được gửi và chờ xác nhận»**. Ca chặng dưới mốc suy ra từ lựa chọn A của chủ ngày 19/10.
- **Các đơn còn lại.**
  - Máy chủ xác nhận ngay sau khi gửi, qua đủ các cổng xác nhận hôm nay.
  - Đơn vào hàng chờ nhận [chủ (c)], và giao diện báo **«Đơn của bạn đã được chuyển đến chuyên viên phụ trách & chờ hướng dẫn viên»**.
- **Cổng chạy lúc gửi [người soạn].**
  - «Gửi đơn» chạy mọi cổng của Xác nhận ngay lúc gửi, ở cả hai nhánh, để Đối tác biết lỗi ngay. Các cổng gồm: giá danh mục (xét theo **người lập**, như khuyến nghị trong đề xuất ADR-0136), giảm giá, chọn Đón/Không đón, người lớn, ngày.
  - Có cổng từ chối thì đơn ở lại nháp và hiện câu lỗi tiếng Việt của máy chủ. Không có câu báo thứ ba.
- **Quyền [người soạn].**
  - Đối tác dùng ô `order.submit` (đơn của mình). Ô `order.confirm` của Đối tác là «không». Cách này khớp bảng quyền đích của ADR-0018 đ6 (đặc tả 24/9).
  - Hôm nay Đối tác vẫn tự xác nhận được (ADR-0014 câu 6, ô `order.modify`), và mục BL-QUYEN-BH09 mới chỉ tạm gác.
  - Vì vậy ADR mới phải làm ba việc: bỏ phần «xác nhận» khỏi ô `order.modify` của Đối tác, đóng mục BH09, và thay câu Q19 của đặc tả mô hình người–vai–quyền («đơn đối tác luôn do Tour Đảo xác nhận»). Q19 là phần ADR-0018 đ9 hẹn làm ở giai đoạn 5 với tên «Gửi đơn hàng». Lời chủ 25/10 thay câu này cho đơn không cần xác nhận.

## 5. Thứ tự và bước kế

1. **Bước kế (sau khi chủ đọc trang này).** Soạn ba thứ:
   - ADR mới «Chính sách bán theo loại đối tác»;
   - bản bổ sung 25/10 cho đề xuất ADR-0136 (hai điểm ở mục 3 và 4);
   - **trang ghép mới**, vì `TRANG-GHEP-LUOT-2.md` cũ đã lỗi thời.

   Lượt duyệt này có hai quyết định chạm quyền hoặc dữ liệu, không gồm «thư + QR», nên vẫn trong trần 3.

   **Màn đánh dấu [người soạn].** Một màn tối thiểu để đánh dấu cờ «cần xác nhận» và đặt luật bán sẽ phát hành cùng tính năng. Màn này không chờ Bảng điều khiển ở Đợt 5; nếu chờ thì tính năng lên mà không ai đánh dấu được.
2. Đề xuất cũ «0137 thư + QR» phải đổi số, vì số 0137 đã dùng cho ADR sổ đại lý. Số ADR lấy số trống kế tiếp lúc nộp.
3. Thi công:
   - Đợt 2 và Đợt 3 của kế hoạch 19/10, kèm phần bổ sung, phát hành cùng nhau (chủ chọn A);
   - chính sách bán thi công riêng, độc lập với hai đợt trên.

## 6. Để người thi công tự quyết

Tên bảng, mã và câu lỗi. Màn quản lý luật thì trình chủ ảnh thật hai hướng (điện thoại và máy tính) trước khi làm giao diện.
