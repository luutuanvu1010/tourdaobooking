// Kho tri thức (b) của trợ lý Hỗ trợ (ADR-0066 điều 3): hệ thống vận hành thế nào, viết lại bằng LỜI THƯỜNG cho NGƯỜI DÙNG.
// Rút từ docs/SYSTEM-DESIGN.md §6, §8 và docs/VAN-CHUYEN.md (bản 1.38–1.42). Luật viết: KHÔNG tên bảng, hàm, tệp, đường dẫn API; không số liệu thật
// (đơn, khách, tiền); không bí mật, cấu hình, máy chủ, hạ tầng. Chỉ ghi điều người dùng THẤY và LÀM được trên màn hình.
// ADR-0070 (1/10): phần "các phân hệ, phụ thuộc, luồng chính, vai làm được gì" nay TỰ SINH ở kho (d) `src/shared/tro-ly-cau-truc.ts` (từ bảng quyền và ranh giới
// module, dịch qua `src/shared/tro-ly-cau-truc-ten.ts`). Đừng chép danh sách "vai X làm được Y" vào đây — viết tay sẽ lệch bảng quyền; chỉ giữ giải thích mà
// bảng quyền không nói được (vì sao, trường hợp đặc biệt).
// Chữ này rời máy chủ (gửi OpenAI) nên qua `viPhamChu` + bộ lọc tên kỹ thuật `viPhamKyThuat` — bài `viPhamKho` ở tro-ly.test.ts / tro-ly-cau-truc.test.ts.
// Đổi tri thức: sửa đoạn ở đây → `node --test src/shared/tro-ly.test.ts` (docs/CHANGE-GUIDE.md công thức z5 "trợ lý Hỗ trợ").

export interface DoanKienTruc { readonly tieuDe: string; readonly noiDung: string }

export const KIEN_TRUC: readonly DoanKienTruc[] = [
  {
    tieuDe: "Vai và quyền: vì sao mỗi người thấy menu khác nhau",
    noiDung: `Mỗi tài khoản có một hoặc vài quyền: Bán hàng, Kế toán, Quản trị, Toàn quyền, Hướng dẫn viên, Đối tác, Thực tập, Tài xế, Tài xế đối tác. Menu, nút và dữ liệu hiện theo quyền: không thấy một mục nghĩa là tài khoản chưa có quyền đó, không phải lỗi. Dù giao diện có hiện nút, máy chủ vẫn kiểm lại quyền; bị từ chối thì Nền tảng báo "không có quyền".
Vai nào làm được việc gì, phạm vi tới đâu (của mình, đang được giao hay tất cả): xem các đoạn "Vai … làm được gì" và "Việc: …" của phần Cấu trúc Nền tảng — lấy thẳng từ bảng quyền của Nền tảng nên luôn đúng. Muốn thêm quyền thì hỏi Quản trị.`,
  },
  {
    tieuDe: "Vòng đời một đơn: nháp, xác nhận, huỷ",
    noiDung: `Đơn mới luôn bắt đầu là đơn nháp: lưu được khi chưa đủ thông tin, sửa thoải mái. Khi đủ thông tin thì bấm xác nhận; đơn đã xác nhận không quay lại nháp. Đơn đã xác nhận vẫn sửa được thông tin chuyến (giờ đón, nơi đón, ghi chú) theo quyền. Huỷ đơn là trạng thái cuối, đơn huỷ không bị xoá mà vẫn nằm trong danh sách để tra lại.
Tiền của đơn (thành tiền, tổng, còn lại) do máy chủ tự tính từ giá danh mục và số khách; không ai gõ tay được tổng tiền. Mỗi lần sửa đơn đều được ghi vào lịch sử của đơn: ai sửa, lúc nào.`,
  },
  {
    tieuDe: "Người phụ trách đơn",
    noiDung: `Người lập đơn có thể chọn người phụ trách ngay khi lập; không chọn thì đơn nằm ở hàng chờ để hướng dẫn viên hoặc nhân viên bấm nhận. Người phụ trách sửa được đơn mình phụ trách như người lập. Hướng dẫn viên chỉ thấy đơn khi đang là người phụ trách; khi được đổi sang người khác thì thôi thấy đơn đó. Hướng dẫn viên huỷ được đơn mình đang phụ trách (đơn đã xác nhận, trước ngày đi), luôn kèm lý do.`,
  },
  {
    tieuDe: "Mốc ra lệnh và Đặt gấp",
    noiDung: `Nếu giờ đón cách hiện tại dưới mốc ra lệnh, đơn vẫn lưu nháp được nhưng chưa xác nhận được. Quản trị hoặc Toàn quyền phải bấm Đặt gấp cho chặng đó và chọn lý do; sau đó người lập mới xác nhận được. Mốc này không tắt được. Trên trang đơn, dải cảnh báo "dưới mốc ra lệnh" cho biết chặng nào đang chờ duyệt đặt gấp.`,
  },
  {
    tieuDe: "Thông báo: chuông, dải tin quan trọng, điện thoại",
    noiDung: `Nền tảng báo tin ở ba nơi: hình chuông ở đầu trang (tin chưa đọc có số đỏ), dải tin quan trọng ở đầu mọi trang (phải bấm Đã hiểu), và thông báo trên điện thoại khi đã bật. Tin về đơn gửi cho người lập, người phụ trách và người đang chờ nhận đơn; lưu nháp không báo ai, xác nhận mới báo. Khi đang mở Nền tảng, danh sách đơn tự cập nhật không cần tải lại. Đổi PIN hoặc bị ngưng tài khoản thì thông báo điện thoại tự tắt, phải bật lại.`,
  },
  {
    tieuDe: "Điều phối xe: xếp khách lên chuyến, tài xế bấm tiến độ",
    noiDung: `Phân hệ Vận chuyển gồm xe, giấy tờ xe, tài xế, nhà xe đối tác và bảng Điều phối xe (xếp khách của nhiều đơn lên một chuyến, tài xế bấm tiến độ Xuất bến, Đã đón, Đã trả, Kết thúc). Dùng được cho chuyến thật khi xe có Kiểm định và Bảo hiểm còn hạn, tài xế có bằng lái ghi hạng còn hạn, và đơn đủ nơi trả, họ tên, năm sinh khách (nhập ở khối Hành khách của đơn). Quản trị ghi Lịch xe bận khi xe vào xưởng; trong giờ đó không xếp chuyến cho xe được. Chuyến chỉ xuất bến khi đủ điều kiện (giấy tờ xe còn hạn, bằng lái đúng hạng, đủ tên khách, đủ chỗ, đủ giờ nghỉ); thiếu gì thì màn hình ghi rõ lý do và ai xử lý.`,
  },
  {
    tieuDe: "Giấy tờ của người và của xe",
    noiDung: `Giấy tờ (căn cước, giấy phép lái xe, khám sức khoẻ, đăng ký xe, kiểm định, bảo hiểm…) được ghi trong hồ sơ người ở Danh bạ hoặc ở chi tiết xe. Số giấy tờ luôn bị che; chỉ người phụ trách hệ thống bấm Xem đủ số, số hiện trong chốc lát rồi tự che, và mỗi lần xem đều được ghi lại. Quản trị chỉ thấy số đã che, vẫn ghi và sửa giấy tờ. Gia hạn là thêm một dòng mới, bản cũ giữ làm lịch sử; ghi sai thì dùng Sửa sai kèm lý do. Mỗi người xem giấy tờ của chính mình ở trang Tôi, mục Giấy tờ của tôi. Danh sách Sắp hết hạn gom giấy tờ sắp hết hoặc đã hết.`,
  },
  {
    tieuDe: "Dữ liệu không bị xoá, chỉ ngưng hoặc đóng",
    noiDung: `Nền tảng không xoá hẳn dữ liệu nghiệp vụ: xe ngừng dùng, tài khoản bị ngưng, loại giấy tờ bị ngưng, chuyến bị huỷ… đều còn trong hệ thống để tra lại. Vì vậy khi thấy một mục "đã ngưng" thì đó là cách Nền tảng giữ lịch sử, không phải lỗi. Mọi thay đổi quan trọng đều có dấu vết ai làm, lúc nào.`,
  },
  {
    tieuDe: "Trợ lý Hỗ trợ trả lời được gì",
    noiDung: `Trợ lý Hỗ trợ chỉ hướng dẫn cách dùng Nền tảng, dựa trên bộ hướng dẫn trong Trợ giúp, sơ đồ các phần của Nền tảng và danh sách trang, mục, nút của Nền tảng (tự cập nhật mỗi lần Nền tảng được cập nhật). Trợ lý không xem được đơn, khách, tiền hay dữ liệu thật của công ty, không làm thay thao tác nào, và có thể trả lời sai: luôn đối chiếu với màn hình. Việc hướng dẫn chưa nói thì trợ lý nói thật và gợi hỏi Quản trị hoặc gửi Góp ý. Trợ lý nhớ tối đa ba câu vừa hỏi của chính người hỏi trong cùng cuộc trò chuyện, và không bao giờ nêu số tiền.
Câu hỏi (đã che số điện thoại, email, số giấy tờ) và câu trả lời được lưu để cải thiện trợ lý; chỉ người phụ trách hệ thống đọc được, không ai xoá được. Người phụ trách hệ thống bật hoặc tắt trợ lý theo từng vai, đặt câu chào, câu hỏi mẫu, chọn mẫu AI, sửa lời nhắc và thêm đoạn ngữ cảnh ở trang Trợ lý Hỗ trợ; vai đang tắt thì không thấy nút Hỗ trợ.`,
  },
];
