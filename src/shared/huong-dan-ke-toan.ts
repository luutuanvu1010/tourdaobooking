// Hướng dẫn: Kế toán (bản 1.40). Luật viết ở src/shared/huong-dan.ts; nguồn đối chiếu docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/ke-toan.md.
import type { NhomHuongDan } from "./huong-dan.ts";

export const HD_KE_TOAN: NhomHuongDan = {
  id: "ke-toan",
  tieuDe: "Kế toán",
  quyen: ["ACCOUNTING"],
  gioiThieu:
    "Bạn là kế toán của công ty. Bạn xem được mọi đơn: khách, dịch vụ, số khách, tiền, lịch sử sửa đơn, và mở được biên nhận để gửi khách. Trên trang đơn, bạn ghi và đối chiếu tiền, bấm Hoàn thành, đánh dấu đã nhập phần mềm kế toán. Bạn không lập, không sửa, không xác nhận, không huỷ đơn; riêng số khách của đơn đã xác nhận thì bạn sửa được.",
  batDauNhanh: `1. Mở app. App vào thẳng [[Trang chủ]].
2. Nhìn thẻ số liệu: **Còn thiếu tiền**, **Chờ xác nhận**, **Chưa phụ trách**. Đây là số của cả công ty.
3. Bấm [[Đơn hàng]] để xem danh sách đơn.
4. Gõ tên khách, số điện thoại hoặc mã đơn vào ô tìm kiếm của danh sách.
5. Bấm vào một đơn, xem khối **Thanh toán** để biết tổng tiền, đã thu và còn lại.
6. Cần gửi phiếu cho khách: trong đơn, bấm [[Xem biên nhận]].`,
  muc: [
    {
      tieuDe: "Menu của bạn",
      noiDung: `### Trên máy tính

Thanh menu dọc bên trái có:
- Nhóm BÁN HÀNG: [[Trang chủ]], [[Đơn hàng]], [[Danh bạ]]. Cạnh [[Đơn hàng]] có số nhỏ, là số đơn chưa xác nhận.
- Nhóm QUẢN TRỊ: [[Vận chuyển]], bên dưới là [[Điều phối xe]] và [[Xe đang chạy]].
- Nhóm TÔI: [[Của tôi]], [[Góp ý / Báo lỗi]], [[Trợ giúp]].

Trên đầu trang có ô tìm kiếm. Gõ mã đơn, tên khách hoặc số điện thoại rồi bấm phím Enter là ra danh sách đơn khớp.

### Trên điện thoại

Thanh tab dưới đáy có [[Trang chủ]], [[Đơn hàng]] và [[Tôi]]. Các mục khác như [[Danh bạ]], [[Điều phối xe]], [[Góp ý / Báo lỗi]], [[Trợ giúp]] nằm trong trang [[Tôi]].

> Lưu ý: Bạn không thấy nút [[Tạo đơn]]. Đó là đúng, vì Kế toán không lập đơn.`,
    },
    {
      tieuDe: "Xem tình hình chung ở Trang chủ",
      noiDung: `1. Mở app. App vào thẳng [[Trang chủ]].
2. Nhìn thẻ số liệu (máy tính: hàng ngay dưới lời chào; điện thoại: dưới các ô chức năng). Ba ô sau là số của **cả công ty**:
   - **Còn thiếu tiền**: tổng tiền khách còn phải trả của các đơn đã xác nhận. Dòng nhỏ bên dưới ghi số đơn và ngày đón sớm nhất (máy tính).
   - **Chờ xác nhận**: số đơn đã lưu nhưng chưa chốt.
   - **Chưa phụ trách**: số đơn chưa có ai nhận lo.
3. Bấm vào một ô để mở danh sách đơn.
4. Xem thẻ **Chuyến đón**: các đơn đã xác nhận có giờ đón hôm nay (bấm Ngày mai, Ngày kia để xem tiếp).

> Ví dụ: Sáng thứ Hai, chị Lan (kế toán) mở app. Ô Còn thiếu tiền ghi "5 đơn · sớm nhất đón 03/10". Chị bấm vào ô đó để xem đó là những đơn nào, rồi gọi nhắc người phụ trách thu tiền.

> Lưu ý: Ô **Doanh thu của tôi** chỉ tính đơn do chính bạn lập. Kế toán không lập đơn nên ô này luôn bằng không (máy tính ghi thêm "Chưa có đơn nào tuần này"). Không phải lỗi.`,
    },
    {
      tieuDe: "Tìm và lọc đơn",
      noiDung: `1. Bấm [[Đơn hàng]].
2. Gõ vào ô tìm kiếm của danh sách: mã đơn, tên hoặc số điện thoại. Danh sách tự lọc sau khi bạn ngừng gõ.
3. Muốn lọc thì bấm nút **Lọc**: chọn cùng lúc ngày đi (có nút nhanh [[Hôm nay]], [[Ngày mai]], [[3 ngày tới]], [[Tuần này]]), dịch vụ, trạng thái (**Chờ xác nhận**, **Đã xác nhận**, **Đã huỷ**) và người lập (gõ tên để chọn từng người đã lập đơn), rồi bấm [[Áp dụng]]. Ô **Nhập phần mềm kế toán** lọc đơn chưa nhập / đã nhập, cần chọn cả Từ ngày và Đến ngày. Bấm × trên nhãn để bỏ từng điều kiện, [[Xoá lọc]] để bỏ hết; máy nhớ bộ lọc cho lần sau.
4. Cuối danh sách có nút [[Tải thêm]] nếu còn đơn.
5. Mỗi thẻ đơn ghi **Còn thu**; nút xổ xuống cho xem thêm **Đã trả**, **Tổng**, người phụ trách. Đơn đã nhập phần mềm kế toán có nhãn riêng.

> Ví dụ: Khách "Trần Thị B" gọi hỏi tiền chuyển khoản đã được ghi nhận chưa. Chị Lan gõ số điện thoại của khách vào ô tìm kiếm. Danh sách còn đúng một đơn. Chị bấm vào đơn để xem.

> Lưu ý: Chưa lọc được theo người phụ trách (sẽ có sau).`,
    },
    {
      tieuDe: "Xem tiền của một đơn",
      noiDung: `1. Bấm vào một đơn trong danh sách. Trang **Chi tiết đơn** mở ra.
2. Dải trên cùng ghi: **MÃ ĐƠN** và trạng thái, **ĐÓN**, **KHÁCH**, **SỐ KHÁCH**, **CÒN LẠI**.
3. Khối **Thanh toán** ghi đủ các dòng:
   - **Tạm tính**, **Giảm giá**, **Tổng cộng**
   - **Đã thu**, rồi **Còn lại** (khách trả dư thì ghi **Khách trả dư**)
   - **Ghi chú thanh toán**
   - Từng lần thu: ngày, số tiền, hình thức, người thu
4. Khối **Lịch sử** ở cuối trang ghi ai đã làm gì với đơn, lúc nào. Ai sửa số khách (hướng dẫn viên, người lập đơn, Kế toán, Quản trị) thì lý do cũng hiện ở đây.

Đơn đã xác nhận có dòng khoá: "Đơn đã xác nhận: dịch vụ, số khách và tiền đã khoá."

> Ví dụ: Chị Lan thấy số Còn lại của một đơn khác với số khách báo. Chị xem Lịch sử thì thấy hướng dẫn viên đã bớt 1 khách, lý do "khách ốm không đi". Chị ghi lại để đối chiếu cuối ngày.`,
    },
    {
      tieuDe: "Sửa số khách đơn đã xác nhận",
      noiDung: `Bạn sửa được số khách của mọi đơn **Đã xác nhận** chưa **Đã giao**, kể cả sau ngày đi:

1. Trên trang đơn, bấm [[Sửa số khách dịch vụ]].
2. Bấm **+** và **−** để đổi số khách từng loại của từng dịch vụ. Dịch vụ nhập tay chỉ để xem, không sửa ở đây.
3. Chọn lý do: [[Khách thêm người]], [[Khách bớt người]], [[Đổi dịch vụ]] hoặc [[Khác]].
4. Bấm [[Lưu số khách]]. Nền tảng tự tính lại tiền theo đơn giá đã chốt của đơn; giảm giá giữ nguyên. Người lập và người phụ trách nhận tin đơn đổi.

Bớt khách sau khi khách đã trả: khối **Thanh toán** hiện **Khách trả dư** — hoàn cho khách bằng [[Ghi hoàn cho khách]] như thường lệ.

Nếu giảm giá lớn hơn tiền dịch vụ còn lại, **Tổng cộng** thành số âm. Nền tảng vẫn lưu nhưng khối **Thanh toán** hiện câu cảnh báo tổng âm. Khi đó số **Khách trả dư** lớn hơn tiền khách thật đã trả: chỉ hoàn tối đa số khách đã trả rồi báo chủ dự án — đơn kiểu này hiện chưa bấm được **Đã giao** (đang chờ chủ dự án quyết cách xử lý).`,
    },
    {
      tieuDe: "Mở biên nhận để gửi khách",
      noiDung: `1. Mở trang **Chi tiết đơn**.
2. Bấm [[Xem biên nhận]].
3. Hộp **Xác nhận đơn để gửi khách** hiện ra. App tự vẽ ảnh xác nhận của đơn.
4. Bấm [[Tải ảnh PNG]] để lưu ảnh về máy, hoặc bấm [[Chia sẻ]] (có trên điện thoại) để gửi qua Zalo.
5. Thấy dòng báo lỗi thì bấm [[Thử lại]].

> Ví dụ: Khách của một đơn đã xác nhận xin lại phiếu. Chị Lan bấm Xem biên nhận, rồi bấm Chia sẻ để gửi ảnh qua Zalo cho khách.`,
    },
    {
      tieuDe: "Xem Điều phối xe (chỉ xem)",
      noiDung: `1. Máy tính: bấm [[Vận chuyển]] rồi [[Điều phối xe]]. Điện thoại: bấm tab [[Tôi]], tìm nhóm VẬN CHUYỂN, bấm [[Điều phối xe]].
2. Chọn ngày ở ô ngày trên cùng. Bấm mũi tên trái hoặc phải để lùi hay tiến một ngày.
3. Màn có ba phần: **Chưa xếp**, **Xe**, **Cần xử lý**. Trên điện thoại, ba phần này là ba thẻ để bấm qua lại.
4. Bạn sẽ thấy dải chữ "Chỉ xem — Kế toán không xếp xe, không phá lệ." Bạn không có nút [[+ Chuyến mới]], không xếp khách, không sửa chuyến.
5. Bấm vào một chuyến để xem **Chi tiết chuyến**.
6. [[Xe đang chạy]] liệt kê xe đang chạy; bạn chỉ xem, không thêm khách hay báo huỷ.`,
    },
    {
      tieuDe: "Danh bạ",
      noiDung: `1. Bấm [[Danh bạ]].
2. Gõ tên hoặc số điện thoại, rồi bấm [[Tìm]].
3. Bấm vào một hồ sơ để xem thông tin.

Kế toán có nút [[+ Hồ sơ mới]] và được thêm, sửa hồ sơ khách hay đại lý. Hồ sơ của người có tài khoản (nhân viên, đối tác) thì chỉ Quản trị sửa được.`,
    },
    {
      tieuDe: "Tình huống hay gặp",
      noiDung: `### Thấy một đơn sai tiền

Bạn không sửa được. Ghi lại mã đơn rồi báo người lập đơn hoặc người phụ trách đơn. Tên người lập có ở dòng "Lập … bởi …" dưới dải trên cùng. Tên người phụ trách có ở khối **Người phụ trách**. Đơn đã xác nhận mà sai số khách: bạn tự sửa bằng [[Sửa số khách dịch vụ]] (mục "Sửa số khách đơn đã xác nhận"); tiền của đơn đã xác nhận không ai sửa được trong app, trừ tài khoản Toàn quyền.

### Khách đã trả thêm tiền, muốn ghi vào đơn

Trong khối **Thanh toán**, bấm [[Ghi lần thu]]: số tiền, hình thức, người nhận tiền; riêng Kế toán chọn được **Ngày phát sinh**. Bấm [[Ghi]]. Sau khi đơn **Đã giao – đã thu đủ** thì không ghi thêm lần thu được.

### Đối chiếu tiền trên trang đơn

Chưa có màn **Sổ công nợ** riêng; mọi việc làm ngay trên trang đơn:
- Lần thu người khác khai là tiền vào công ty: đối chiếu tài khoản, bấm [[Xác nhận đã nhận]] rồi [[Công ty đã nhận]].
- Lần thu ghi sai: bấm [[Đảo]], ghi lý do (bắt buộc). Sổ giữ dòng cũ và thêm một dòng đảo.
- Khối **Kế toán** ghi ai đang giữ tiền của công ty: nhận tiền rồi bấm [[Đã nộp về công ty]].
- Khách trả dư: bấm [[Ghi hoàn cho khách]].

### Hoàn thành đơn

Sau khi đơn **Đã giao – đã thu đủ** và không còn ai giữ tiền của công ty vì đơn, bấm [[Hoàn thành]] rồi đồng ý. **Không mở lại được.** Nút mờ thì dòng **Đang giữ đơn** ghi lý do.

### Đánh dấu đã nhập phần mềm kế toán

App **không xuất hoá đơn**. Khi đã nhập đơn vào phần mềm kế toán, ở khối **Phần mềm kế toán** bấm [[Đánh dấu đã nhập]], gõ số hoá đơn (không bắt buộc), bấm [[Đánh dấu]]. Chỉ đơn đã xác nhận mới đánh dấu được. Sửa số: [[Sửa số hoá đơn]]. Nhầm: [[Bỏ dấu]], ghi lý do.

### Cần danh sách đơn để làm sổ

Nút xuất ra tệp Excel (chưa có ở bản này). Dùng ô tìm kiếm và nút **Lọc** để lọc, rồi xem từng đơn.

### Đơn bị huỷ

Bấm nút **Lọc**, chọn **Đã huỷ** rồi bấm [[Áp dụng]] để xem. Khối **Lịch sử** của đơn cho biết ai huỷ, lúc nào.

### Chuông thông báo

Chuông ở thanh trên báo khi có đơn mới, có người nhận đơn, đơn được xác nhận hay bị huỷ. Bấm vào một tin để mở đúng đơn. Muốn nhận thông báo trên màn hình khoá điện thoại: vào [[Tôi]], bật mục **Thông báo trên điện thoại**.`,
    },
    {
      tieuDe: "Điều bạn không làm được — hỏi ai",
      noiDung: `- Lập đơn mới: không. Nhờ nhân viên bán hàng.
- Sửa, xác nhận, huỷ đơn: không. Nhờ người lập đơn, người phụ trách đơn hoặc Quản trị.
- Sửa tiền sau khi xác nhận: không, chỉ tài khoản Toàn quyền. Số khách thì bạn sửa được (mục "Sửa số khách đơn đã xác nhận").
- Nhận phụ trách, giao đơn cho người khác: không. Nhờ nhân viên bán hàng hoặc Quản trị.
- Duyệt "Đặt gấp": không. Nhờ Quản trị.
- Xếp xe, tạo chuyến, bấm tiến độ chuyến: không, bạn chỉ xem. Nhờ nhân viên bán hàng hoặc Quản trị.
- Bấm **Đã giao – đã thu đủ**: không. Hướng dẫn viên đang phụ trách đơn hoặc Quản trị bấm.
- Xuất hoá đơn trong app: không có. Xuất ở phần mềm kế toán rồi đánh dấu trên đơn.
- Sửa bảng giá dịch vụ, quản lý tài khoản nhân viên: không. Nhờ Quản trị.`,
    },
    {
      tieuDe: "Câu hỏi thường gặp",
      noiDung: `### Sao tôi không thấy nút Tạo đơn?

Vì Kế toán không lập đơn. Đây là cài đặt đúng.

### Trang đơn ghi "Chỉ … (người lập đơn), người phụ trách đơn hoặc quản trị viên mới được sửa, xác nhận hoặc huỷ đơn này." Có phải lỗi không?

Không. Dòng này giải thích vì sao bạn không có nút sửa.

### Ô Doanh thu của tôi luôn trống?

Đúng vậy, vì ô này chỉ đếm đơn do bạn lập. Xem tiền cả công ty ở ô **Còn thiếu tiền** và trong [[Đơn hàng]].

### Tôi quên mã PIN thì sao?

Máy đã bật Face ID: vào [[Tôi]], bấm [[Quên PIN? Đặt PIN mới bằng Face ID]]. Chưa bật: nhờ Quản trị đặt lại PIN.

### Tôi muốn báo một chỗ sai trong app

Bấm [[Góp ý / Báo lỗi]], ghi rõ mã đơn và việc bạn thấy sai.`,
    },
  ],
};
