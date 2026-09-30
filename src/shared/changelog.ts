// Nhật ký thay đổi của ứng dụng (đặc tả docs/superpowers/specs/2026-09-23-nhat-ky-thay-doi-tro-giup-design.md). Thuần, không I/O.
// NGUỒN DUY NHẤT của số phiên bản: app-info.ts dẫn xuất APP_VERSION/APP_RELEASE_DATE từ mục đầu. Mỗi lần deploy mã mới = thêm MỘT mục vào ĐẦU mảng,
// số tăng 1 (1.N), lời thường cho nhân viên (công thức "Ghi nhật ký thay đổi" ở docs/CHANGE-GUIDE.md). changelog.test.ts chặn cách viết sai.
import { isISODate } from "./vn-date.ts";

export type ChangeKind = "moi" | "sua" | "doi";
export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = { moi: "Mới", sua: "Đã sửa", doi: "Thay đổi" };
export interface ChangeItem { readonly kind: ChangeKind; readonly text: string }
export interface ReleaseNote { readonly version: string; readonly date: string; readonly items: readonly ChangeItem[] }

/** Mới nhất ở ĐẦU. */
export const CHANGELOG: readonly ReleaseNote[] = [
  {
    // Đợt giao diện G1 theo góp ý người dùng 30/9 (docs/superpowers/specs/2026-09-30-phan-tich-gop-y-nguoi-dung.md §7.2 + câu trả lời của chủ cho README
    // docs/design/gop-y-2026-09-30/). Số "1.42" TẠM theo điều phối (1.41 dành cho sổ tiền lượt 1); người gộp chốt số trống kế tiếp LÚC GỘP.
    version: "1.42",
    date: "2026-09-30",
    items: [
      { kind: "moi", text: "Danh sách đơn có nút \"Lọc\": lọc cùng lúc theo ngày đi, dịch vụ, trạng thái và đơn mình lập; máy nhớ bộ lọc cho lần sau, bấm \"Xoá lọc\" để bỏ." },
      { kind: "moi", text: "Trang chủ: khối \"Chuyến đón\" có ba nút Hôm nay / Ngày mai / Ngày kia." },
      { kind: "moi", text: "Tạo đơn: lọc dịch vụ theo \"Hay dùng\" (bấm ☆ để ghim), theo người hoặc theo nhóm; máy nhớ lựa chọn cho lần sau." },
      { kind: "moi", text: "Tài xế xem được cuốc của ngày kia ở trang \"Cuốc của tôi\" (trước chỉ hôm nay và ngày mai)." },
      { kind: "doi", text: "Màn tài xế: mỗi điểm đón hiện thêm giờ xe tới nếu khác giờ hẹn khách." },
      { kind: "doi", text: "Danh sách đơn: đơn có nơi đón hiện luôn dòng \"Đón tại …\" ngay trên thẻ, không phải bấm mở." },
      { kind: "doi", text: "Góp ý / Báo lỗi: trạng thái hiện nổi bật theo từng bước (Mới → Đã tiếp nhận → Đang xử lý → Đã xong); yêu cầu đã xong hoặc bị từ chối có nút \"Mở lại\"." },
    ],
  },
  {
    // Sửa giao diện nhỏ theo rà soát 30/9 (docs/superpowers/specs/2026-09-30-ra-soat-luong-giao-dien-phan-loai-huong-dan.md §2 trên nhánh
    // ra-soat-luong-giao-dien): chỉ bề mặt, không đổi máy chủ / dữ liệu. Số 1.40 (1.39 = bản phông chữ đã lên production 30/9).
    version: "1.40",
    date: "2026-09-30",
    items: [
      { kind: "doi", text: "Tạo đơn: tiêu đề, phần Tóm tắt và thanh dưới đáy ghi rõ đơn đang có mấy dịch vụ; chọn xong có báo ngắn, dịch vụ đã chọn có nhãn \"đã chọn\"." },
      { kind: "doi", text: "Tạo đơn: phần \"Thông tin chuyến\" nay thu gọn sẵn cả trên máy tính; dòng tóm tắt ghi giờ đón, nơi đón và giờ check-in." },
      { kind: "doi", text: "Việc của tôi (hướng dẫn viên): thẻ đơn có giờ khởi hành, check-in, ghi chú và nút \"Xem đơn\"; nhãn tiền đổi thành \"Thanh toán trước / Còn lại\"." },
      { kind: "doi", text: "Trang đơn: không lặp ngày khởi hành ở từng dịch vụ; số khách ở đầu trang ghi đủ chữ, ví dụ \"8 người lớn, 1 trẻ em\"." },
      { kind: "doi", text: "Màn tài xế: nút \"Kết thúc gián đoạn\" nhỏ lại, viền đỏ; nút \"Kết thúc chuyến\" khi chưa bấm được vẫn hiện rõ là một nút." },
      { kind: "moi", text: "Tài xế thấy trước các điểm đón, giờ hẹn và số khách của chuyến." },
    ],
  },
  {
    // Rà soát phông + cỡ chữ (chủ dự án giao 30/9: "chọn phông tiếng Việt chuẩn", lỗi phông nhẹ trên Windows) — đặc tả
    // docs/superpowers/specs/2026-09-30-phong-chu-va-co-chu.md. Số "1.39" TẠM (production 1.38); người gộp chốt số trống kế tiếp LÚC GỘP.
    version: "1.39",
    date: "2026-09-30",
    items: [
      { kind: "sua", text: "Sửa lỗi chữ tiếng Việt trên máy tính Windows: dấu có lúc bị lệch hoặc tách khỏi chữ, nút bấm hiện phông khác." },
      { kind: "doi", text: "Toàn bộ app dùng một phông chữ thiết kế riêng cho tiếng Việt (Be Vietnam Pro), hiển thị giống nhau trên iPhone, Android và máy tính." },
    ],
  },
  {
    // Phát hành 1.38 (phân hệ Vận chuyển lượt 1): ADR-0049 (bảng điều phối chung, mốc 6 giờ + đặt gấp, cuốc tài xế — Task K1 của
    // docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md), ADR-0047 (chặng đưa đón + danh sách hành khách), Q-L3-B (ADR-0053 D7.2). Production 1.37
    // (kiem-phien-ban 30/9). Chủ quyết 30/9: phát hành nhưng CHƯA dùng Điều phối cho chuyến thật tới khi có màn nhập tên khách (ADR-0047 Phần B).
    version: "1.38",
    date: "2026-09-30",
    items: [
      { kind: "doi", text: "Đơn có giờ đón cách bây giờ dưới 6 giờ vẫn lưu nháp được, nhưng muốn xác nhận thì phải có Quản trị bấm \"Đặt gấp\" cho chặng đó." },
      { kind: "moi", text: "Có Bảng điều phối xe: lịch đón theo ngày, tạo chuyến, xếp khách lên xe; tài xế công ty xem cuốc của mình ở trang \"Cuốc của tôi\"." },
      { kind: "doi", text: "Lưu ý: CHƯA dùng Bảng điều phối cho chuyến thật cho tới khi có màn nhập tên khách. Văn phòng vẫn điều xe như cũ." },
      { kind: "doi", text: "Tài xế chỉ thấy tên và số liên hệ của khách trong ngày chạy; bấm Xuất bến sớm từ hôm trước cũng không thấy trước." },
      { kind: "doi", text: "Thông tin đưa đón nay được lưu theo từng chặng (lượt đi, lượt về); màn nhập đơn vẫn như cũ." },
    ],
  },
  {
    // ADR-0048 (nhà xe đối tác, tài xế đối tác; Task K1 của docs/superpowers/plans/2026-09-29-adr-0048-thi-cong.md). Số "1.37" TẠM theo điều phối
    // (production 1.36 từ 28/9 23:21 giờ VN; 1.37 là bản kế tiếp); người gộp chốt số trống kế tiếp LÚC GỘP (nhánh ADR-0047 đang xếp hàng).
    version: "1.37",
    date: "2026-09-29",
    items: [
      { kind: "moi", text: "Có tài khoản cho tài xế của nhà xe đối tác: đăng nhập, xem giấy tờ của mình; không thấy đơn, giá hay tin nội bộ của công ty." },
      { kind: "moi", text: "Quản trị ghi được nhà xe đối tác ở Danh bạ, tài xế của từng nhà xe và xe của nhà xe; danh sách xe lọc được theo chủ xe." },
      { kind: "doi", text: "Danh sách giấy tờ sắp hết hạn có thêm xe và tài xế của nhà xe đối tác, ghi rõ tên nhà xe." },
    ],
  },
  {
    // ADR-0046 (thông báo điện thoại tự tắt đúng máy — sửa ADR-0036 điều 6) + tách "Danh mục giấy tờ" theo chủ dữ liệu (chủ chọn 28/9).
    version: "1.36",
    date: "2026-09-28",
    items: [
      { kind: "sua", text: "Đăng xuất ở máy tính không còn làm tắt thông báo trên điện thoại: chỉ máy đang đăng xuất mới thôi nhận thông báo." },
      { kind: "doi", text: "Đổi vai hoặc quyền của một người không còn làm tắt thông báo trên điện thoại của họ; đổi PIN, gỡ Face ID, ngưng tài khoản thì vẫn tắt." },
      { kind: "doi", text: "Danh mục giấy tờ tách làm hai: \"Loại giấy tờ xe\" nằm trong Vận chuyển, \"Loại giấy tờ người\" nằm trong nhóm Quản trị." },
    ],
  },
  {
    // Vận chuyển lượt 1a (ADR-0040; Task K1 của docs/superpowers/plans/2026-09-28-van-chuyen-1a.md). Số "1.35" theo điều phối (main 1.34, 1.32 để trống);
    // điều phối chốt số thật lúc gộp cuối.
    version: "1.35",
    date: "2026-09-28",
    items: [
      { kind: "moi", text: "Mục Vận chuyển mới cho Quản trị: quản lý xe của công ty (biển số, số người được chở, trạng thái) và giấy tờ từng xe kèm ngày hết hạn, gia hạn, lịch sử." },
      { kind: "moi", text: "Quản trị ghi giấy tờ của nhân viên (căn cước, bằng lái, khám sức khoẻ, tập huấn) trong hồ sơ ở Danh bạ; số luôn che, bấm \"Xem đủ số\" thì số hiện 10 giây." },
      { kind: "moi", text: "Trang Tôi có mục \"Giấy tờ của tôi\": nhân viên xem giấy tờ và ngày hết hạn của mình, số được che." },
      { kind: "moi", text: "Có tài khoản cho tài xế công ty: mở app là vào trang của tài xế, xem giấy tờ và hạn giấy tờ của mình." },
      { kind: "moi", text: "Quản trị có danh sách giấy tờ của xe và tài xế còn 30 ngày trở xuống hoặc đã hết hạn; số đếm hiện ở menu và trang Tôi, bấm một dòng để mở xe hoặc hồ sơ." },
      { kind: "moi", text: "Quản trị sửa được danh mục loại giấy tờ xe, loại giấy tờ của người và hạng bằng lái (mục \"Danh mục giấy tờ\" ở trang Tôi)." },
    ],
  },
  {
    // T2b — hồ sơ công ty chủ (ADR-0024 điều 6, ADR-0043). SỐ "1.34" theo chỉ đạo D19 của điều phối: main 356084a đã có 1.33 (HDV — ADR-0030 +
    // ADR-0037) ngay trên 1.31, số 1.32 để trống đúng như main; điều phối chốt số thật lúc gộp cuối.
    version: "1.34",
    date: "2026-09-28",
    items: [
      { kind: "doi", text: "Tên và mã số thuế ở cuối trang đăng nhập, cùng thông tin công ty trên ảnh xác nhận đơn, nay lấy từ hồ sơ công ty trong Danh bạ: sửa một nơi là đổi mọi nơi." },
      { kind: "doi", text: "Chỉ người phụ trách hệ thống sửa được tên, mã số thuế, địa chỉ, số liên hệ của hồ sơ công ty trong Danh bạ, và đổi sang hồ sơ công ty khác khi cần." },
      { kind: "sua", text: "Địa chỉ ở cuối trang đăng nhập viết lại đúng như hồ sơ công ty." },
    ],
  },
  {
    version: "1.33",
    date: "2026-09-28",
    items: [
      { kind: "doi", text: "Đơn mới lập không còn tự ghi người lập là người phụ trách: đơn chưa có ai hiện “Chờ nhận”, chờ hướng dẫn viên hoặc nhân viên bấm Nhận." },
      { kind: "moi", text: "Hướng dẫn viên thấy danh sách đơn chờ nhận (không có số điện thoại, không có tiền) và bấm Nhận; đơn mình đang phụ trách thì xem đủ thông tin." },
      { kind: "moi", text: "Khi lập đơn, bạn chọn được hướng dẫn viên phụ trách ngay; chọn xong là có hiệu lực luôn." },
      { kind: "doi", text: "Mục “Việc của tôi” làm lại theo mẫu mới: đơn chờ nhận và đơn của bạn (kể cả chưa xác nhận) trên một màn; mỗi đơn có Tổng tiền, Đã cọc, Còn thu, nút gọi khách." },
      { kind: "doi", text: "Hướng dẫn viên sửa số khách hoặc huỷ đơn qua một bảng hỏi lại: sửa số khách có nút chọn nhanh lý do, huỷ đơn phải chọn lý do rồi mới bấm được." },
      { kind: "doi", text: "Đơn đã lưu mà chưa chốt nay ghi “Chờ xác nhận” thay cho “Nháp”; người đang lo đơn hiện “HDV: tên người đó”." },
    ],
  },
  {
    version: "1.31",
    date: "2026-09-28",
    items: [
      { kind: "doi", text: "Lưu đơn nháp không còn báo ai; khi đơn được bấm \"Xác nhận đơn\" mà chưa có người phụ trách, người nhận được đơn mới được báo (cả trên màn hình khoá)." },
    ],
  },
  {
    version: "1.30",
    date: "2026-09-28",
    items: [
      { kind: "moi", text: "Thêm vai IT trong nhóm nội bộ." },
    ],
  },
  {
    version: "1.29",
    date: "2026-09-28",
    items: [
      { kind: "sua", text: "Tài khoản Đối tác tạo lại được ảnh xác nhận đơn (bản 1.28 báo \"Chưa tải được người phụ trách\"); ảnh của Đối tác không in dòng người phụ trách." },
    ],
  },
  {
    version: "1.28",
    date: "2026-09-28",
    items: [
      { kind: "sua", text: "Ảnh xác nhận đơn chưa có người phụ trách nay ghi \"Đơn khởi tạo thành công và đang chờ hướng dẫn viên nhận khách\" thay vì tên người lập." },
      { kind: "doi", text: "Từ 22:00 đến 6:00 thông báo vẫn hiện trên màn hình khoá nhưng không rung, không kêu; tin quan trọng vẫn rung." },
    ],
  },
  {
    version: "1.27",
    date: "2026-09-28",
    items: [
      { kind: "doi", text: "Quản trị đặt lại được mã PIN, mở khoá đăng nhập và gỡ Face ID cho nhân viên mình quản lý." },
    ],
  },
  {
    version: "1.26",
    date: "2026-09-28",
    items: [
      { kind: "doi", text: "Góp ý và Báo lỗi do người phụ trách hệ thống tiếp nhận; tài khoản Quản trị không còn mở hàng đợi Góp ý. Mọi người vẫn gửi và xem góp ý của mình như cũ." },
      { kind: "doi", text: "Quản trị tập trung việc kinh doanh, nhân sự. Đặt lại PIN, gỡ Face ID, mở khoá, đồng bộ từ Sheet và trang Nhật ký do người phụ trách hệ thống làm." },
    ],
  },
  {
    version: "1.25",
    date: "2026-09-28",
    items: [
      { kind: "moi", text: "Thông báo hiện trên màn hình khoá điện thoại: vào trang Tài khoản, bấm \"Bật thông báo trên điện thoại\" rồi cho phép." },
      { kind: "moi", text: "Trên iPhone, cần mở app từ biểu tượng ngoài màn hình chính thì mới bật được." },
    ],
  },
  {
    version: "1.24",
    date: "2026-09-28",
    items: [
      { kind: "moi", text: "Chuẩn bị thông báo hiện trên màn hình khoá điện thoại; mục bật sẽ xuất hiện trong trang Tài khoản khi công ty mở tính năng." },
      { kind: "doi", text: "Đăng xuất hoặc đổi mã PIN sẽ tắt thông báo trên mọi điện thoại của tài khoản; muốn nhận lại thì bấm Bật lần nữa." },
    ],
  },
  {
    version: "1.23",
    date: "2026-09-28",
    items: [
      { kind: "sua", text: "Nút quay về trong ngăn Thông báo không còn bị phần tai thỏ và đồng hồ của iPhone che." },
      { kind: "sua", text: "Chuông thông báo nằm đúng góc phải ở tài khoản Hướng dẫn viên và Đối tác trên máy tính." },
    ],
  },
  {
    version: "1.22",
    date: "2026-09-28",
    items: [
      { kind: "moi", text: "Chuông thông báo trên thanh trên: báo khi có đơn mới, có người nhận đơn, giao đơn, xác nhận hay huỷ đơn liên quan tới bạn." },
      { kind: "moi", text: "Bấm chuông để xem hai ngăn \"Của tôi\" và \"Tất cả\"; mở ra là coi như đã đọc hết, bấm một tin để mở đúng đơn." },
      { kind: "moi", text: "Chủ công ty gửi được thông báo cho cả công ty hoặc từng nhóm; tin quan trọng hiện dải nhắc cho tới khi bạn bấm \"Đã hiểu\"." },
    ],
  },
  {
    version: "1.21",
    date: "2026-09-27",
    items: [
      { kind: "sua", text: "Thanh tab dưới đáy không còn nhảy lên xuống khi chuyển trang trên iPhone." },
      { kind: "sua", text: "Trong lúc chờ dữ liệu, trang hiện khung thẻ trắng thay vì một khoảng trống." },
    ],
  },
  {
    version: "1.20",
    date: "2026-09-27",
    items: [
      { kind: "doi", text: "Mở trang nhanh hơn: thanh trên, menu và thanh tab hiện ngay khi bấm; danh sách đơn và Trang chủ hiện dữ liệu nhanh gần gấp đôi." },
      { kind: "doi", text: "Sau mỗi lần cập nhật, app lưu sẵn mọi màn hình trên máy nên lần mở đầu tiên của từng màn cũng không phải chờ tải." },
    ],
  },
  {
    version: "1.19",
    date: "2026-09-27",
    items: [
      { kind: "doi", text: "Tài khoản đối tác và thực tập sinh nay lấy danh mục dịch vụ khi tạo đơn qua một đường riêng, kiểm quyền chặt hơn; bạn không thấy gì khác." },
    ],
  },
  {
    version: "1.18",
    date: "2026-09-27",
    items: [
      { kind: "doi", text: "Hệ thống kiểm tra quyền chặt hơn ở các màn quản trị và màn đơn; với đa số nhân viên bạn không thấy gì khác." },
      { kind: "doi", text: "Chế độ bảo trì: chỉ tài khoản Toàn quyền có số điện thoại trong danh sách được phép mới bật hoặc tắt được." },
      { kind: "doi", text: "Quản trị viên không còn thêm hay kết thúc vai, quan hệ (như “Người liên hệ của”) trên hồ sơ của quản trị viên khác hoặc của Toàn quyền; chỉ Toàn quyền làm được." },
    ],
  },
  {
    version: "1.17",
    date: "2026-09-26",
    items: [
      { kind: "sua", text: "Form lập đơn của tài khoản đối tác: dòng báo “tạm chưa được giảm giá” nay nằm gọn một hàng dưới mục Thanh toán, không còn bị bóp hẹp." },
    ],
  },
  {
    version: "1.16",
    date: "2026-09-26",
    items: [
      { kind: "moi", text: "Danh sách đơn, Trang chủ và trang đơn tự cập nhật khi đồng nghiệp nhận, giao, xác nhận hoặc huỷ đơn; có thông báo nhỏ ở góc màn hình." },
    ],
  },
  {
    version: "1.15",
    date: "2026-09-26",
    items: [
      { kind: "moi", text: "Tài khoản đối tác và thực tập sinh nay chọn được dịch vụ trong danh mục để lập đơn (chỉ xem, không sửa được danh mục)." },
      { kind: "doi", text: "Với tài khoản đối tác, ô đơn giá và ô giảm giá trên form lập đơn được khoá sẵn: giá luôn theo giá bán lẻ, tạm chưa giảm giá." },
    ],
  },
  {
    version: "1.14",
    date: "2026-09-26",
    items: [
      { kind: "sua", text: "Hướng dẫn viên bấm huỷ đơn nay được hỏi lại một lần trước khi huỷ; vùng huỷ đơn tách xa nút lưu số khách và có nút Thôi." },
      { kind: "doi", text: "Hướng dẫn viên không huỷ được tour đã qua ngày đi; cần huỷ thì nhờ văn phòng. Ngay trong ngày đi vẫn huỷ được." },
      { kind: "doi", text: "Dịch vụ nhập tay đã ngừng, không thêm mới được. Dịch vụ nhập tay trên đơn cũ chỉ để xem; muốn đổi thì xoá rồi chọn trong danh mục." },
      { kind: "doi", text: "Tài khoản đối tác lập đơn theo đúng giá bán lẻ của danh mục và tạm chưa được giảm giá; cần giảm cho khách thì nhờ văn phòng." },
      { kind: "doi", text: "Quản trị viên không tự đặt lại mã PIN của chính mình ở trang Quản lý tài khoản nữa; muốn đổi mã PIN thì vào trang Tôi." },
    ],
  },
  {
    version: "1.13",
    date: "2026-09-25",
    items: [
      { kind: "sua", text: "Sửa lỗi: hướng dẫn viên lưu số khách không còn làm đổi giá đã thoả thuận với khách; thêm khách thì tính theo đúng giá đã thoả thuận." },
      { kind: "sua", text: "Hướng dẫn viên bấm lưu mà không đổi số khách thì đơn giữ nguyên, không ghi thêm lần sửa nào." },
    ],
  },
  {
    version: "1.12",
    date: "2026-09-25",
    items: [
      { kind: "doi", text: "\"Sửa thông tin chuyến\" nay có một ô ngày khởi hành cho cả đơn; đổi ngày là đổi cho mọi dịch vụ trong đơn." },
      { kind: "doi", text: "Hệ thống không nhận đơn có các dịch vụ khác ngày nhau. Đơn cũ đang khác ngày vẫn sửa được giờ, điểm đón, ghi chú như trước." },
    ],
  },
  {
    version: "1.11",
    date: "2026-09-25",
    items: [
      { kind: "doi", text: "\"Lập đơn mới\" đổi tên thành \"Tạo đơn\". Màn Tạo đơn nay đi theo thứ tự: chọn ngày, chọn dịch vụ, rồi nhập thông tin khách." },
      { kind: "doi", text: "Mỗi đơn chỉ có một ngày khởi hành, chọn ở đầu màn Tạo đơn; không còn nút thêm dịch vụ nhập tay." },
      { kind: "moi", text: "Nút \"Sử dụng thông tin của tôi\" ở Tạo đơn: tự điền tên và số điện thoại của chính bạn làm thông tin khách." },
      { kind: "doi", text: "\"Đã cọc\" đổi thành \"Thanh toán trước\", \"Hình thức cọc\" đổi thành \"Phương thức thanh toán\" (để sẵn Tiền mặt)." },
      { kind: "doi", text: "Nút \"Xác nhận gửi khách\" trong đơn đổi tên thành \"Xem biên nhận\"; danh sách đơn hàng có thêm số thứ tự." },
    ],
  },
  {
    version: "1.10",
    date: "2026-09-25",
    items: [
      { kind: "doi", text: "Màn \"Nhân viên\" đổi tên thành \"Quản lý tài khoản\" (trên điện thoại là tab \"Tài khoản\"), vì ở đây quản lý cả tài khoản của đối tác." },
      { kind: "doi", text: "Mục \"Tài khoản\" ở thanh bên máy tính đổi tên thành \"Của tôi\"." },
      { kind: "doi", text: "Màn \"Hồ sơ\" đổi tên thành \"Danh bạ\"; trong mỗi hồ sơ, \"Vai trò theo nơi\" nay là \"Công việc tại đâu\", \"Quan hệ\" nay là \"Người liên hệ\"." },
    ],
  },
  {
    version: "1.9",
    date: "2026-09-24",
    items: [
      { kind: "doi", text: "Hồ sơ của người có tài khoản (nhân viên, đối tác) giờ chỉ quản trị viên sửa được tên và số liên hệ." },
      { kind: "doi", text: "Muốn tạm khoá hay cho nghỉ việc một người, dùng màn Nhân viên; màn Hồ sơ không còn tắt được người có tài khoản." },
    ],
  },
  {
    version: "1.8",
    date: "2026-09-24",
    items: [
      { kind: "moi", text: "Quản trị viên gán vai cho từng tài khoản (Giám đốc, Kế toán, Hướng dẫn viên nội bộ, Cộng tác viên…); quyền tự theo vai, xem trước trước khi lưu." },
      { kind: "moi", text: "Thêm vai Thực tập sinh: lập đơn và chỉ thấy đơn của mình (chưa chọn được dịch vụ từ danh mục — chờ quyết định)." },
      { kind: "moi", text: "Tạo tài khoản cho người đã có hồ sơ (ví dụ khách cũ) mà không tạo hồ sơ trùng." },
      { kind: "doi", text: "Quyền \"Super Admin\" đổi tên thành \"Toàn quyền\". Chỉ Toàn quyền mới cấp được quyền Quản trị." },
    ],
  },
  {
    version: "1.7",
    date: "2026-09-24",
    items: [
      { kind: "sua", text: "Trang Đăng nhập trên điện thoại gọn hơn, hiện đủ trong một màn hình, không phải kéo, kể cả khi mở bằng Safari." },
    ],
  },
  {
    version: "1.6",
    date: "2026-09-24",
    items: [
      { kind: "doi", text: "Trang Đăng nhập có giao diện mới, gọn trong một màn hình, không cần kéo. Nút Đăng nhập chỉ bấm được khi đã gõ đủ số điện thoại và 6 số mã PIN." },
      { kind: "moi", text: "Nút Face ID / vân tay nằm ngay cạnh nút Đăng nhập. Ô mã PIN có nút Hiện để xem lại số vừa gõ và bộ đếm 0/6." },
      { kind: "doi", text: "Gõ sai mã PIN thì ô PIN tự xoá để gõ lại. Số hỗ trợ kỹ thuật 0989 929 373 hiện ngay dưới nút Đăng nhập." },
      { kind: "doi", text: "Tên ứng dụng đổi thành Island Booking System. App đã cài trên iPhone vẫn giữ tên cũ dưới biểu tượng tới khi cài lại." },
    ],
  },
  {
    version: "1.5",
    date: "2026-09-24",
    items: [
      { kind: "sua", text: "Đơn do Đối tác lập nay để trống người phụ trách, chờ nhân viên Tour Đảo nhận lo đơn, không còn tự ghi Đối tác làm người phụ trách." },
    ],
  },
  {
    version: "1.4",
    date: "2026-09-24",
    items: [
      { kind: "moi", text: "Trang Trợ giúp mới (ở trang Tôi và menu bên trái): xem app vừa đổi gì qua từng bản. Chấm đỏ nhỏ báo khi có bản mới mà bạn chưa xem." },
      { kind: "doi", text: "Mở app là vào thẳng Trang chủ. Danh sách đơn nay nằm ở mục Đơn hàng." },
      { kind: "doi", text: "Trên máy tính và iPad, menu chuyển sang cột dọc bên trái; cạnh mục Đơn hàng có số đơn chưa xác nhận." },
      { kind: "moi", text: "Ô tìm kiếm trên đầu trang (máy tính): gõ mã đơn, tên khách hoặc số điện thoại rồi bấm Enter để lọc danh sách đơn." },
      { kind: "moi", text: "Trang chủ có biểu đồ doanh thu từng ngày trong tuần của bạn (máy tính, iPad). Quản trị viên thấy thêm khối \"Cần xem lại\": Sheet đổi giá, góp ý chưa trả lời." },
      { kind: "sua", text: "Tài khoản Đối tác mở app được đưa thẳng tới danh sách đơn, không còn gặp báo lỗi ở Trang chủ." },
    ],
  },
  {
    version: "1.3",
    date: "2026-09-23",
    items: [
      { kind: "moi", text: "Đăng nhập bằng Face ID hoặc vân tay: bật một lần ở trang Tôi, lần sau chạm một cái là vào, không cần gõ số điện thoại và mã PIN." },
      { kind: "moi", text: "Quên mã PIN: đặt mã PIN mới ngay trên máy đã bật Face ID, không cần nhờ quản trị viên." },
      { kind: "doi", text: "Quản trị viên thấy ai đã bật Face ID và gỡ được khi cần. Ngưng tài khoản hoặc đặt lại mã PIN sẽ gỡ luôn Face ID của người đó." },
    ],
  },
  {
    version: "1.2",
    date: "2026-09-23",
    items: [
      { kind: "moi", text: "Trang chủ mới cho nhân viên văn phòng: đơn còn thiếu tiền, đơn nháp chưa xác nhận, đơn chưa có người phụ trách, chuyến đón hôm nay và doanh thu tuần." },
    ],
  },
  {
    version: "1.1",
    date: "2026-09-22",
    items: [
      { kind: "doi", text: "Giao diện mới cho các trang: dễ đọc hơn trên điện thoại, bố cục hai cột trên máy tính." },
      { kind: "moi", text: "Ghi được người đặt tour trên từng đơn." },
      { kind: "moi", text: "Hướng dẫn viên có mục \"Việc của tôi\" ở trang Tôi: sửa số khách hoặc huỷ đơn kèm lý do cho đơn đã xác nhận mà mình phụ trách." },
      { kind: "doi", text: "Quyền \"Thực hiện\" đổi tên thành \"Hướng dẫn viên\"." },
      { kind: "sua", text: "Sửa lỗi không tạo được tài khoản nhân viên mới." },
    ],
  },
  {
    version: "1.0",
    date: "2026-09-21",
    items: [
      { kind: "moi", text: "Lập đơn dịch vụ tour từ bảng giá chung, ghi thông tin chuyến cho từng dịch vụ và xác nhận đơn." },
      { kind: "moi", text: "Gửi ảnh xác nhận đơn cho khách; giao người phụ trách cho từng đơn." },
      { kind: "moi", text: "Đăng nhập bằng số điện thoại và mã PIN, có bước xác minh chống dò mã." },
      { kind: "moi", text: "Cài app lên màn hình chính điện thoại; gửi ý kiến cho quản trị viên ở mục Góp ý / Báo lỗi." },
    ],
  },
];

const VERSION_RE = /^(\d+)\.(\d+)$/;
function parseVersion(v: string): [number, number] | null {
  const m = VERSION_RE.exec(v);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** So hai số phiên bản `X.Y` theo SỐ (1.10 > 1.9). Sai dạng thì ném lỗi. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) throw new Error(`Số phiên bản không hợp lệ (cần dạng X.Y): "${pa ? b : a}"`);
  return pa[0] - pb[0] || pa[1] - pb[1];
}

/** Chấm đỏ: chưa từng xem, giá trị lưu là rác, hoặc đã xem bản cũ hơn ⇒ true. */
export function hasUnseenRelease(seen: string | null, current: string): boolean {
  if (seen === null || !parseVersion(seen)) return true;
  return compareVersions(seen, current) < 0;
}

/** Nhãn "Mới cập nhật" trên từng bản: chưa từng xem (hoặc rác) ⇒ chỉ bản mới nhất; đã xem X ⇒ mọi bản mới hơn X. */
export function isNewForViewer(version: string, seen: string | null, latest: string): boolean {
  if (seen === null || !parseVersion(seen)) return version === latest;
  return compareVersions(version, seen) > 0;
}

export const MAX_ITEM_LENGTH = 160;
const FORBIDDEN_WORDS = ["task", "commit", "api", "route", "migration", "worker", "deploy", "e2e", "d1", "null", "undefined"];
const FORBIDDEN_RE = new RegExp(`(^|[^\\p{L}\\p{N}_])(${FORBIDDEN_WORDS.join("|")})(?=$|[^\\p{L}\\p{N}_])`, "iu");
const SNAKE_RE = /[A-Za-z0-9]+_[A-Za-z0-9]+/;
const KINDS = new Set<string>(Object.keys(CHANGE_KIND_LABEL));

/** Mọi lỗi viết của nhật ký (rỗng = hợp lệ). Dùng ở changelog.test.ts. */
export function changelogProblems(log: readonly ReleaseNote[]): string[] {
  const out: string[] = [];
  if (log.length === 0) return ["Nhật ký rỗng: cần ít nhất một bản."];
  log.forEach((n, i) => {
    const at = `bản #${i} (${n.version})`;
    if (!parseVersion(n.version)) out.push(`${at}: số phiên bản không hợp lệ, cần dạng X.Y`);
    if (!isISODate(n.date)) out.push(`${at}: ngày không hợp lệ "${n.date}"`);
    if (n.items.length === 0) out.push(`${at}: cần ít nhất một gạch`);
    n.items.forEach((it, j) => {
      const t = it.text.trim();
      if (!KINDS.has(it.kind)) out.push(`${at} gạch ${j}: loại không hợp lệ "${it.kind}"`);
      if (!t) out.push(`${at} gạch ${j}: chữ rỗng`);
      if (t.length > MAX_ITEM_LENGTH) out.push(`${at} gạch ${j}: dài ${t.length} ký tự, tối đa ${MAX_ITEM_LENGTH}`);
      const bad = FORBIDDEN_RE.exec(t);
      if (bad) out.push(`${at} gạch ${j}: có chữ kỹ thuật "${bad[2]}"`);
      if (t.includes("`")) out.push(`${at} gạch ${j}: có dấu \``);
      if (SNAKE_RE.test(t)) out.push(`${at} gạch ${j}: có định danh kiểu snake_case`);
    });
    const next = log[i + 1];
    if (next && parseVersion(n.version) && parseVersion(next.version) && compareVersions(n.version, next.version) <= 0) out.push(`${at}: số phiên bản phải tăng dần nghiêm ngặt (mới nhất ở đầu), bản sau là ${next.version}`);
    if (next && isISODate(n.date) && isISODate(next.date) && n.date < next.date) out.push(`${at}: ngày ${n.date} sớm hơn bản cũ hơn (${next.date})`);
  });
  return out;
}

/** Cổng phát hành (scripts/kiem-phien-ban.mjs). "truoc": bản ở máy phải MỚI HƠN production; "sau": production phải BẰNG bản ở máy. remote null = production chưa báo số (coi là 1.0). */
export function releaseGate(local: string, remote: string | null, mode: "truoc" | "sau"): { ok: boolean; message: string } {
  const note = remote === null ? " (production chưa báo số phiên bản: coi là 1.0)" : "";
  const prod = remote ?? "1.0";
  if (!parseVersion(prod)) return { ok: false, message: `CHƯA ĐẠT: production trả số phiên bản lạ "${prod}".` };
  const cmp = compareVersions(local, prod);
  if (mode === "truoc") {
    return cmp > 0
      ? { ok: true, message: `ĐẠT: bản ở máy ${local} mới hơn production ${prod}${note}.` }
      : { ok: false, message: `CHƯA ĐẠT: bản ở máy ${local} không mới hơn production ${prod}${note}. Thêm mục mới vào đầu CHANGELOG (src/shared/changelog.ts).` };
  }
  return remote !== null && cmp === 0
    ? { ok: true, message: `ĐẠT: production đang chạy đúng bản ${local}.` }
    : { ok: false, message: `CHƯA ĐẠT: production báo ${prod}${note}, bản ở máy là ${local}.` };
}
