# ADR-0164 — Toàn quyền ẩn dữ liệu: ẩn là vô hiệu hoá và cô lập

- **Trạng thái:** **proposed** 2026-11-04, chờ chủ dự án duyệt. Lời chủ, nguyên văn: *«ok tạm chưa xóa dữ liệu trong Production, mà cho ẩn , tạo quyết định đi, ẩn để không bị rối mắt , đồng thời khi ẩn tức vô hiệu hóa nó luôn, cô lập dữ liệu bị vô hiệu hóa»*. Phạm vi chủ chọn: *«Đơn hàng»*, *«Hồ sơ và tài khoản đối tác»*, *«Cấu hình hoa hồng, dịch vụ»*. Đơn đã có tiền tách sang [ADR-0165](ADR-0165-an-don-co-tien-bang-dao-tien.md).
- **Cửa:** hai chiều, vì có «Hiện lại» và không dòng nghiệp vụ nào bị xoá hay sửa.
- **Loại:** việc lớn (dữ liệu, quyền).
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 3** ([ADR-0162](ADR-0162-ban-development-doc-lap-va-mot-lenh-len-chinh-thuc.md), ADR-0164, ADR-0165). Trang ghép: `docs/superpowers/specs/2026-11-04-trang-ghep-an-du-lieu.md`.
- **Xây trên lỗ đang hở:** không. Đơn còn tiền bị từ chối ở quyết định này, nên không chạm sổ tiền.
- **Áp luật:** Hiến chương hệ thống 5.1 (bất biến giữ ở tầng lưu trữ), 5.5 (đóng hoặc ngưng, không xoá), 4.5 (người nghỉ thì ngưng), 5.6 (bản chụp không đổi); Phần I 5.12 (nhật ký), 5.24 (xoá theo yêu cầu chủ thể). Với Hiến pháp N5 và mục 5.8: không dòng nghiệp vụ nào bị xoá hay sửa, nên không phá bất biến. Với N7: trạng thái đã ẩn chỉ trả lời câu «có hiện không», không thay trạng thái đơn, `active` hay ngưng tài khoản.

## Bối cảnh

Dữ liệu thử và dữ liệu đã ngừng dùng nằm lẫn trong danh sách, ô chọn và các trang cấu hình, làm rối mắt người dùng. Xoá hẳn trên bản chính thức đang tạm gác ([ADR-0163](ADR-0163-toan-quyen-xoa-han-du-lieu-de-thu-nghiem.md)). Các nút tắt, ngưng có sẵn làm một vật ngừng hoạt động nhưng nó vẫn hiện ra.

## Đ1 — Ai

Chỉ Toàn quyền, qua thao tác mới `data.hide` (mọi quyền khác là `none`), do máy chủ thi hành. Mỗi lần ẩn hay hiện lại phải có lý do và ghi một dòng nhật ký: ai, lúc nào, lý do, loại, mã bản ghi.

## Đ2 — Ẩn được gì, khi nào

| Loại | Ẩn được khi (đề xuất của người soạn) | Khi đã ẩn |
|---|---|---|
| **Đơn hàng** | mọi khoản tiền của đơn về 0; không còn khách trên chuyến chưa kết thúc; không còn vé đã cấp chưa đóng | không sửa, không thu, không giao, không xếp chuyến; đường dẫn biên nhận, vé, QR đã gửi không còn hiệu lực |
| **Hồ sơ** khách, đại lý, đối tác | không còn đơn chưa ẩn gắn với hồ sơ; không còn số dư | không chọn được khi lập đơn, không hiện khi tra trùng |
| **Tài khoản** | như hồ sơ | máy tự ngưng, đóng mọi phiên đang mở, tắt thông báo; không đăng nhập được |
| **Cấu hình:** loại đối tác, cấp, mức hoa hồng, dịch vụ | đã tắt hoặc ngừng bằng nút có sẵn; không còn gì đang áp theo nó | không chọn được, không hiện ở trang cấu hình; đơn cũ giữ nguyên bản chụp |

Điều kiện không đạt thì máy từ chối và nói rõ còn vướng gì, ví dụ «Còn 2 đơn chưa ẩn». ADR-0165, nếu được duyệt, bỏ điều kiện tiền về 0 của đơn. **Không ẩn được:** chính mình, tài khoản Toàn quyền cuối cùng, hồ sơ công ty chủ. Chuyến xe, vé, khoản thu riêng lẻ và nhật ký không thuộc quyết định này.

## Đ3 — Cô lập nghĩa là gì

Với mọi người, kể cả Kế toán và Quản trị, bản ghi đã ẩn không còn xuất hiện ở:

- danh sách, tìm kiếm, Trang chủ, Việc của bạn, ô chọn, bộ lọc, số đếm và các số tính từ đơn;
- màn hình của Đối tác và Tài xế;
- thông báo và các tác vụ tự động chạy theo lịch.

Mở thẳng đường dẫn thì thấy câu «Dữ liệu này đã ẩn», không có nội dung. Chuyến đã kết thúc có khách của đơn đã ẩn thì giữ số khách và chi phí, hiện «Đơn đã ẩn» thay cho tên (đề xuất của người soạn).

Ba thứ **không** bị cô lập, vì đó là việc của luật: Sổ công nợ không bị lọc (ADR-0165), kiểm dữ liệu `audit-invariants` vẫn quét đủ mọi dòng, và phiếu yêu cầu xoá dữ liệu cá nhân (5.24) vẫn tới được hồ sơ đã ẩn.

## Đ4 — Máy giữ, không chỉ giao diện

- **Ghi:** trigger ở cơ sở dữ liệu từ chối mọi dòng mới trỏ tới bản ghi đã ẩn và mọi lệnh sửa nó, ví dụ thu tiền vào đơn đã ẩn, lập đơn cho hồ sơ đã ẩn. Miễn cho: nhật ký, chính lệnh ẩn và hiện lại, đóng phiên đăng nhập, tác vụ dọn ảnh vé, và các lệnh sổ tiền ở ADR-0165 Đ3.
- **Đọc:** mỗi module chủ giữ trạng thái đã ẩn của bản ghi gốc của mình và công bố qua một view `v_<tiền tố>_*`; module khác chỉ đọc view đó (ADR-0002).
- **Đăng nhập:** máy chủ từ chối tài khoản đã ẩn và đóng phiên đang mở.
- **Bài kiểm:** một bộ quét mới, dựng trên khung thử `tests/audit/harness.mjs`, gọi mọi route đọc theo từng vai với dữ liệu đã ẩn gieo sẵn, đỏ khi có route trả về mã đã ẩn. Thêm route mới mà quên lọc thì bài này bắt. Bài `src/route-access.test.ts` có sẵn chỉ kiểm quyền vào route, không đọc nội dung trả về nên không thay được.
- `audit-invariants` thêm luật: không có dòng còn hiệu lực trỏ tới bản ghi đã ẩn.

## Đ5 — Hiện lại

Toàn quyền có trang «Dữ liệu đã ẩn» (tên đề xuất) xem được đầy đủ, và nút «Hiện lại» kèm lý do. Hiện lại **không tự bật lại**: tài khoản vẫn ngưng, cấu hình vẫn tắt, phải bật bằng nút có sẵn. Nhờ vậy, hiện lại không vô tình làm đổi giá hay mở đăng nhập.

## Hệ quả chủ cần biết

- **Hồ sơ đã ẩn không còn được tìm thấy khi tra trùng**, nên nhân viên có thể tạo hồ sơ mới cùng số điện thoại. Hiện lại thì sẽ có hai hồ sơ, phải gộp bằng tính năng gộp có sẵn.
- **Số đăng nhập là duy nhất**, nên tài khoản đã ẩn vẫn giữ số đó. Muốn dùng lại số thì phải hiện lại tài khoản.
- **Nhân viên đang mở một đơn mà đơn bị ẩn** sẽ nhận câu «Dữ liệu này đã ẩn» ở lần bấm kế tiếp, không có tin báo trước.
- **Đường dẫn đã gửi khách sẽ chết.** Ẩn nhầm đơn thật thì khách không xem được biên nhận cho tới khi hiện lại.
- **Việc lớn hơn vẻ ngoài:** phải sửa mọi đường đọc của ba nhóm dữ liệu. **Chưa kiểm:** số route và số màn hình cần sửa; kế hoạch thi công phải đếm.

## Việc kèm khi thi công

Migration mới cho trạng thái đã ẩn và trigger; thêm mã vào bản đồ quyền và bài ghim quyền; `docs/data-dictionary.json`; `docs/SO-HANG-RAO.md`; tờ khai `docs/kernel-18.md` nếu đổi chỗ trỏ. Cột `hidden` của dịch vụ đang mang nghĩa khác (ngừng bán), giữ nguyên nghĩa đó và đặt tên cột mới khác đi. **Phải chốt nhãn trước khi thi công:** Quản trị đã có nút ẩn dịch vụ nghĩa là ngừng bán, nên trên màn hình sẽ có hai chữ «Ẩn» khác nghĩa; đưa vào lượt chọn tên của phiên rà soát nút bấm. ADR-0042 dùng chữ «vai ẩn» cho chuyện khác; chữ trên màn hình phải theo bảng từ `src/shared/bang-tu-giao-dien.ts` và trình chủ bằng ảnh thật.

## Tiêu chí nghiệm thu

1. Mọi quyền trừ Toàn quyền gọi lệnh ẩn hoặc hiện lại đều bị từ chối.
2. Đơn đã ẩn không xuất hiện ở bất kỳ route đọc nào, với mọi vai; thêm cố ý một route không lọc thì bài quét đỏ, hoàn nguyên thì xanh.
3. Thu tiền vào đơn đã ẩn bằng câu ghi trực tiếp bị cơ sở dữ liệu từ chối (quan sát chặn thật, ghi sổ hàng rào).
4. Đơn còn tiền, hồ sơ còn đơn, cấu hình còn đang áp đều bị từ chối với câu nói rõ lý do.
5. Tài khoản bị ẩn khi đang đăng nhập thì lần gọi kế tiếp bị từ chối, và không đăng nhập lại được.
6. Ẩn rồi hiện lại một đơn: mọi dòng của đơn giống hệt trước khi ẩn; `audit-invariants` đạt ở cả ba thời điểm.
7. Không ẩn được chính mình, Toàn quyền cuối cùng, hồ sơ công ty chủ.
