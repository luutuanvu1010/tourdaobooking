// Hướng dẫn: Quản trị (bản 1.40). Luật viết ở src/shared/huong-dan.ts; nguồn đối chiếu docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/quan-tri.md.
import type { NhomHuongDan } from "./huong-dan.ts";

export const HD_QUAN_TRI: NhomHuongDan = {
  id: "quan-tri",
  tieuDe: "Quản trị",
  quyen: ["ADMIN", "SUPER_ADMIN"],
  gioiThieu: "Bạn làm mọi việc của văn phòng, cộng thêm: quản lý tài khoản nhân viên, Danh bạ, danh mục dịch vụ, địa điểm, xe và giấy tờ. Bạn duyệt Đặt gấp cho chặng đón sát giờ và phá lệ khi điều xe.",
  batDauNhanh: `1. Mở [[Quản lý tài khoản]], xem cột [[Đăng nhập gần nhất]] để biết ai đã vào app.
2. Tạo tài khoản cho nhân viên mới ở khung [[Thêm tài khoản]], gửi riêng PIN cho họ.
3. Mở [[Dịch vụ & giá]], xem lần đồng bộ gần nhất với Google Sheet có lỗi không.
4. Trên Trang chủ, xem khối [[Cần xem lại]].
5. Mở [[Sắp hết hạn]] trong nhóm Vận chuyển để xem giấy tờ xe, tài xế sắp hết hạn.`,
  muc: [
    {
      tieuDe: "Menu của bạn",
      noiDung: `### Trên máy tính
- Nhóm **BÁN HÀNG**: [[Trang chủ]], [[Đơn hàng]], [[Tạo đơn]], [[Danh bạ]].
- Nhóm **QUẢN TRỊ**: [[Dịch vụ & giá]], [[Quản lý tài khoản]], [[Địa điểm]], [[Loại giấy tờ người]], rồi **Vận chuyển** gồm [[Điều phối xe]], [[Xe]], [[Sắp hết hạn]], [[Loại giấy tờ xe]], [[Lý do điều phối]].
- Số nhỏ cạnh Dịch vụ & giá là số dịch vụ có giá trên Sheet vừa đổi. Số cạnh Sắp hết hạn là số giấy tờ đã hoặc sắp hết hạn.

### Trên điện thoại
- Tab ở đáy: [[Trang chủ]], [[Đơn hàng]], [[Tạo đơn]], [[Dịch vụ]], [[Tài khoản]], **Tôi**.
- Các trang khác mở từ trang Tôi: [[Danh bạ]], [[Địa điểm]], [[Loại giấy tờ người]], và nhóm VẬN CHUYỂN ([[Điều phối xe]], [[Xe]], [[Giấy tờ sắp hết hạn]], [[Loại giấy tờ xe]], [[Lý do điều phối]]).
- Bảng ở trang quản trị có thể phải kéo ngang. Việc nhiều nên làm trên máy tính.`,
    },
    {
      tieuDe: "Tạo tài khoản cho nhân viên mới",
      noiDung: `1. Vào [[Quản lý tài khoản]], khung [[Thêm tài khoản]].
2. Gõ [[Họ tên]] và [[Số điện thoại (tên đăng nhập)]].
3. Nếu số này đã có hồ sơ trong Danh bạ, bấm nút **Dùng hồ sơ có sẵn** để không tạo trùng.
4. Ở [[Vai và quyền]], tick vai. Nhóm **Nội bộ**: [[Hướng dẫn viên nội bộ]], [[Nhân viên kinh doanh]], [[Thực tập sinh]], [[Kế toán]], [[Tài xế công ty]]. Nhóm **Bên ngoài**: [[Công ty lữ hành]], [[Hướng dẫn viên độc lập]], [[Lễ tân khách sạn]], [[Tài xế taxi]], [[Cộng tác viên]], [[Tài xế đối tác]].
5. Đọc dòng **Quyền sẽ có** ngay dưới để chắc chắn đúng.
6. Bấm [[Tạo tài khoản]].
7. Bảng PIN hiện **một lần duy nhất**. Bấm [[Sao chép danh sách]] hoặc chép tay, gửi riêng cho người đó, không gửi nhóm chung.
8. Bấm [[Đã ghi lại, ẩn đi]].

App tự chặn: một người vừa vai nội bộ vừa vai bên ngoài; vai Tài xế đối tác đi kèm vai khác. Bạn không thấy các vai Giám đốc, Điều hành chung, IT.

> Ví dụ: Công ty nhận bạn Ngọc làm kinh doanh. Tick Nhân viên kinh doanh, thấy "Quyền sẽ có: Bán hàng", bấm Tạo tài khoản, nhắn riêng PIN và dặn đổi PIN khi vào app.`,
    },
    {
      tieuDe: "Đổi vai, sửa tên hoặc số điện thoại",
      noiDung: `1. [[Quản lý tài khoản]], ở dòng người đó bấm [[Sửa]].
2. Sửa [[Họ tên]], [[Số điện thoại đăng nhập]] nếu cần. Đổi số là đổi tên đăng nhập của họ.
3. Tick hoặc bỏ tick vai. Xem kỹ dòng **Sẽ thêm** và **Sẽ mất**.
4. Cần cộng hoặc bớt riêng một quyền: mở [[Chỉnh riêng cho người này (cộng hoặc bớt quyền)]], tick ở [[Cộng thêm]] hoặc [[Bớt đi]], gõ lý do (bắt buộc).
5. Bấm [[Lưu]]; không lưu thì bấm [[Đóng]].

> Ví dụ: Bạn Ngọc chuyển sang kế toán. Bỏ Nhân viên kinh doanh, tick Kế toán, app báo sẽ thêm Kế toán, sẽ mất Bán hàng, bấm Lưu.`,
    },
    {
      tieuDe: "Quên PIN, bị khoá, mất máy, nghỉ việc",
      noiDung: `Mọi việc dưới đây làm ở [[Quản lý tài khoản]], trên dòng của người đó.

- **Quên PIN**: bấm [[Đặt lại PIN]], xác nhận. PIN cũ, Face ID và mọi phiên đăng nhập của họ mất hiệu lực. Gửi riêng PIN mới rồi bấm [[Đã ghi lại, ẩn đi]].
- **Bị khoá vì gõ sai nhiều lần**: dòng có nhãn [[Bị khoá đăng nhập]]. Bấm [[Mở khoá]].
- **Mất điện thoại**: bấm nút **Gỡ Face ID** (số trong ngoặc là số máy đã bật), rồi [[Đặt lại PIN]].
- **Nghỉ việc**: bấm [[Ngưng]], xác nhận. Họ bị đăng xuất ngay. Quay lại làm thì bấm [[Kích hoạt lại]]. Tài khoản không bao giờ bị xoá.

Bạn không đặt lại PIN của chính mình ở đây; tự đổi ở trang Tôi. Bạn chỉ quản lý được tài khoản **không có quyền Quản trị**; trên dòng của Quản trị khác các nút bị ẩn.

> Ví dụ: Anh Tuấn gọi báo không vào được app. Dòng của anh có nhãn Bị khoá đăng nhập. Bấm Mở khoá, anh vào lại ngay.`,
    },
    {
      tieuDe: "Danh bạ: thêm và tìm hồ sơ",
      noiDung: `1. Vào [[Danh bạ]], bấm [[+ Hồ sơ mới]].
2. Chọn loại **Cá nhân** hoặc **Tổ chức (đại lý, công ty)**.
   - Cá nhân: [[Họ và tên]].
   - Tổ chức: [[Tên gọi]], [[Tên pháp lý]], [[Mã số thuế]], [[Địa chỉ]], [[Email nhận hoá đơn]].
3. Gõ số điện thoại, email nếu có (không bắt buộc).
4. Nếu số đã có hồ sơ, app báo và có nút [[Mở hồ sơ này]]. Đúng người thì dùng hồ sơ có sẵn.
5. Bấm [[Tạo hồ sơ]].

Tìm: gõ tên hoặc số điện thoại, lọc theo loại, công việc, nơi làm, bấm [[Tìm]]. Tick [[Gồm cả hồ sơ đã ngưng]] để xem cả hồ sơ cũ.

> Ví dụ: Đại lý Công ty Du lịch Sóng Biển gửi khách thường xuyên. Tạo hồ sơ Tổ chức, điền tên pháp lý, mã số thuế, email nhận hoá đơn, bấm Tạo hồ sơ.`,
    },
    {
      tieuDe: "Danh bạ: sửa chi tiết, liên hệ, công việc, tài xế",
      noiDung: `Bấm vào tên hồ sơ để mở.

- **Thông tin**: sửa rồi bấm [[Lưu thông tin]]. Bỏ tick [[Đang dùng]] để ngưng hồ sơ. Người có tài khoản thì ngưng ở màn Quản lý tài khoản.
- **Liên hệ**: chọn loại, gõ giá trị, ghi chú (vd Zalo, hotline), tick [[Liên hệ chính]] nếu cần, bấm [[Thêm liên hệ]]. Liên hệ cũ bấm [[Đóng]], lịch sử vẫn giữ.
- **Công việc tại đâu**: chọn công việc, nơi làm, ngày bắt đầu, bấm [[Thêm công việc]]. Hết làm thì bấm [[Kết thúc]].
- **Người liên hệ, tài xế**: chọn loại quan hệ, gõ tên hồ sơ cần nối, chọn, rồi bấm [[Thêm người liên hệ]], [[Thêm quan hệ tài xế]] hoặc [[Thêm tài xế]].

> Ví dụ nhà xe: hồ sơ Tổ chức "Nhà xe Hòn Chồng", thêm công việc Nhà xe đối tác. Mở hồ sơ tài xế anh Lâm, chọn "Hồ sơ này LÀ tài xế của nhà xe…", tìm Hòn Chồng, bấm Thêm quan hệ tài xế.`,
    },
    {
      tieuDe: "Giấy tờ của người",
      noiDung: `Căn cước, bằng lái, khám sức khoẻ… Chỉ ở hồ sơ Cá nhân, chỉ Quản trị thấy.

1. Mở hồ sơ ở Danh bạ, mục [[Giấy tờ]], bấm [[Thêm giấy tờ]].
2. Chọn loại, gõ số, ngày cấp, ngày hết hạn (hoặc tick [[Giấy này không có hạn]]). Bằng lái có thêm [[Hạng]].
3. Lưu.

- Được cấp giấy mới: bấm [[Gia hạn]], dòng cũ giữ làm lịch sử, bấm [[Lưu gia hạn]].
- Ghi sai: bấm [[Sửa sai]], chọn lý do, bấm [[Lưu sửa sai]].
- Số luôn bị che. Cần xem: bấm [[Xem đủ số]] và xác nhận. Số hiện vài giây rồi tự che, hoặc bấm [[Che lại]].

> Lưu ý: mỗi lần xem đủ số đều được ghi nhật ký. Hồ sơ của Quản trị khác bạn chỉ xem, không sửa.`,
    },
    {
      tieuDe: "Dịch vụ & giá (Google Sheet)",
      noiDung: `Nguồn danh mục là Google Sheet; app tự đồng bộ mỗi 15 phút.

1. Vào [[Dịch vụ & giá]]. Đầu trang ghi lần đồng bộ gần nhất và lỗi nếu có.
2. Muốn lấy ngay: bấm [[Đồng bộ ngay từ Google Sheet]].
3. App hỏi vì sắp ẩn nhiều dịch vụ: chỉ đồng ý khi chắc chắn Sheet đúng.

### Ghi đè giá (chỉ trong app, không ghi ngược vào Sheet)
1. Tìm dịch vụ theo mã hoặc tên. Bấm [[Sửa giá]], gõ giá cho loại khách cần đổi, bấm [[Lưu ghi đè]].
2. Về lại giá Sheet: [[Bỏ ghi đè]].
3. Sheet đổi giá sau khi bạn đã ghi đè: dòng có cảnh báo. Giữ giá của bạn thì bấm [[Giữ ghi đè]].
4. Tạm ngưng bán: [[Ẩn]]. Bán lại: [[Hiện lại]].

Lọc được theo: [[Đang ghi đè giá]], [[Sheet đã đổi giá (cần xem)]], [[Đã ẩn]], [[Không còn trong Sheet]]. Đơn đã lập luôn giữ giá lúc lập.`,
    },
    {
      tieuDe: "Người phụ trách đơn",
      noiDung: `1. Mở đơn từ [[Đơn hàng]], tìm khối [[Người phụ trách]].
2. Đơn chưa có ai hiện [[Chờ nhận]]. Bấm [[Chọn người phụ trách]] (hoặc [[Đổi người phụ trách]]).
3. Chọn người, bấm [[Lưu người phụ trách]].

> Ví dụ: Đơn khách Trần Minh đón ở khách sạn Biển Xanh lúc 7:30 chưa ai nhận. Chọn hướng dẫn viên Hoà, bấm Lưu người phụ trách.`,
    },
    {
      tieuDe: "Đặt gấp (giờ đón dưới 6 giờ)",
      noiDung: `Đơn có giờ đón quá sát vẫn lưu nháp được, nhưng muốn xác nhận thì Quản trị phải duyệt Đặt gấp cho chặng đó.

1. Mở đơn. Dưới dịch vụ có dải vàng báo giờ đón dưới mốc 6 giờ.
2. Bấm [[Đặt gấp]].
3. Chọn lý do: [[Khách đoàn gọi gấp]], [[Chuyến bay đổi giờ]], [[Đơn bù cho khách bị lỡ chuyến]] hoặc [[Lý do khác]]. Gõ [[Ghi chú ngắn]] nếu cần.
4. Bấm [[Duyệt đặt gấp]]. Sau đó đơn xác nhận được.

Ở màn Tạo đơn, nút Đặt gấp hiện ngay trên thẻ dịch vụ; app lưu nháp rồi mới đặt gấp. Trên Điều phối xe có mục [[Đơn nháp chờ duyệt đặt gấp]].

> Ví dụ: 14 giờ, đoàn khách gọi đặt xe đón 17 giờ ở khách sạn Biển Xanh. Nhân viên lập nháp, bạn bấm Đặt gấp, chọn Khách đoàn gọi gấp, bấm Duyệt đặt gấp.`,
    },
    {
      tieuDe: "Xe và giấy tờ xe",
      noiDung: `1. Vào [[Xe]], bấm [[Thêm xe]].
2. Gõ [[Biển số]], [[Số khung]], [[Tên / đời xe]], chọn [[Chủ xe]] (công ty hoặc nhà xe đối tác), [[Số người được chở (không kể tài xế)]], trạng thái. Bấm [[Lưu xe]].
3. Mở xe, bấm [[Thêm giấy tờ]]. Tối thiểu phải có Kiểm định và Bảo hiểm trách nhiệm dân sự, thiếu thì xe không xuất bến được.
4. Giấy mới: [[Gia hạn]]. Ghi sai: [[Sửa sai]].
5. Không dùng xe nữa: [[Sửa thông tin xe]], [[Ngừng dùng xe]], rồi [[Ngừng dùng]]. Xe không bị xoá; dùng lại bằng [[Dùng lại xe]].

### Giấy tờ sắp hết hạn
Mở [[Sắp hết hạn]] (điện thoại: [[Giấy tờ sắp hết hạn]] ở trang Tôi). Danh sách gồm giấy của xe và tài xế, cả giấy đã hết hạn. Bấm một dòng để mở xe hoặc hồ sơ rồi gia hạn.

> Ví dụ: Xe 16 chỗ biển 79B-000.01: ô số người được chở ghi 15. Bảo hiểm còn 12 ngày thì có giấy mới là bấm Gia hạn.`,
    },
    {
      tieuDe: "Phá lệ khi điều xe",
      noiDung: `Trong 6 giờ trước giờ xuất bến, chuyến bị khoá: không xếp thêm khách, không đổi xe, đổi tài xế, rút khách. Chỉ Quản trị phá lệ được.

1. Làm thao tác như bình thường trên [[Điều phối xe]] hoặc màn chuyến.
2. Hộp hỏi hiện nút như [[Phá lệ và rút]], [[Phá lệ và chuyển]], [[Phá lệ và lưu]], [[Phá lệ và huỷ]].
3. Chọn lý do phá lệ, bấm nút đó. Việc phá lệ được ghi lại kèm tên bạn.

> Lưu ý: chưa dùng Bảng điều phối cho chuyến thật cho tới khi có màn nhập tên khách. Hỏi người phụ trách hệ thống trước khi dùng.`,
    },
    {
      tieuDe: "Các danh mục cài đặt",
      noiDung: `### Địa điểm
1. Vào [[Địa điểm]], khung [[Thêm địa điểm]]: gõ mã (chữ HOA, số, gạch dưới), tên, loại, địa chỉ, thứ tự, bấm [[Thêm]].
2. Sửa: [[Sửa]], rồi [[Lưu]]. Mã không đổi được.
3. Không dùng nữa: bỏ tick [[Đang dùng]], bấm Lưu. Địa điểm không xoá được.

### Loại giấy tờ người, loại giấy tờ xe, hạng bằng lái
Mở [[Loại giấy tờ người]] (có cả [[Hạng giấy phép lái xe]]) hoặc [[Loại giấy tờ xe]]. Thêm: gõ mã, tên, tick [[Có ngày hết hạn]] nếu cần, thứ tự, bấm [[Thêm]]. Sửa: [[Sửa]], [[Lưu]]. Không xoá, chỉ ngưng dùng.

### Trợ lý Hỗ trợ (chỉ Toàn quyền)
Mở [[Trợ lý Hỗ trợ]] ở nhóm QUẢN TRỊ (điện thoại: trang **Tôi**). Trang có năm phần, mỗi phần có nút [[Lưu]] riêng, lưu có hiệu lực ngay:
1. **Tình trạng**: bật hoặc tắt cho cả công ty, trần chi phí tháng, chi phí và số câu. Key chỉ hiện đã đặt hay chưa và bốn ký tự cuối; bấm [[Thử key]] để biết key còn dùng được, sai hay hết tiền. Đổi key làm trên Cloudflare, không nhập trong app.
2. **Ai được dùng**: bật hoặc tắt theo từng vai và số câu mỗi người mỗi ngày. Tài khoản nhiều vai được dùng khi ít nhất một vai đang bật.
3. **Lời dặn**: câu chào, giọng trả lời, lời dặn thêm, câu hỏi mẫu. Bấm [[Lưu thành bản mới]]; muốn trở lại bản trước thì mở lịch sử bản, bấm [[Quay lại bản này]].
4. **Ngữ cảnh bổ sung**: gõ tiêu đề và nội dung, bấm [[Thêm đoạn]]; bỏ tick **Đang dùng** để tắt một đoạn.
5. **Lịch sử hỏi đáp**: lọc theo ngày, người, vai hoặc tìm chữ, bấm [[Lọc]]. Lịch sử không xoá được.

Chữ tuỳ chỉnh không được có số điện thoại, email, số tiền (app báo lỗi khi lưu). Trợ lý luôn từ chối bí mật, tiền, thông tin khách, lời dặn không bỏ được luật này.

### Dịch vụ nhập tay (chỉ Toàn quyền bật / tắt)
Trang **Tôi**, khối **Dịch vụ nhập tay**: bấm [[Bật dịch vụ nhập tay]] hoặc [[Tắt dịch vụ nhập tay]]. Mặc định tắt. Khi bật: Bán hàng, Quản trị, Toàn quyền thêm được dịch vụ gõ tên và giá tay ở form lập đơn ([[+ Dịch vụ nhập tay]]). Tài khoản có quyền Đối tác luôn không dùng được. Khi tắt: dịch vụ nhập tay đã có trên đơn vẫn giữ, chỉ xem. Văn phòng thêm dịch vụ nhập tay vào đơn nháp của Đối tác thì Đối tác không tự xác nhận được — văn phòng xác nhận thay.

### Lý do điều phối
Mở [[Lý do điều phối]]. Lý do chia nhóm, như [[Đổi giờ xe tới]], [[Huỷ chuyến]], [[Phá lệ]]. Thêm: [[+ Thêm lý do]] ở nhóm cần, gõ lý do, bấm [[Thêm]]. Sửa tên: [[Sửa]]. Không dùng nữa: [[Ngưng]]; dùng lại: [[Dùng lại]]. Lý do hệ thống tự dùng thì không ngưng được.`,
    },
    {
      tieuDe: "Tình huống hay gặp",
      noiDung: `- **Nhân viên không vào được app**: xem dòng của họ. Bị khoá thì [[Mở khoá]]; có nhãn [[Ngưng]] thì hỏi lý do trước khi kích hoạt lại; quên PIN thì [[Đặt lại PIN]].
- **Tạo tài khoản báo số đã có tài khoản**: tìm người đó trong danh sách, có thể họ đang bị ngưng.
- **Trang chủ báo Sheet đã đổi giá**: bấm vào, xem giá mới; đồng ý thì [[Bỏ ghi đè]], không thì [[Giữ ghi đè]].
- **Đồng bộ báo lỗi**: app vẫn dùng bản đã lưu. Kiểm tra Sheet, thử lại sau; vẫn lỗi thì gửi Góp ý.
- **Nhân viên không xác nhận được đơn vì giờ đón sát**: duyệt [[Đặt gấp]].
- **Hai hồ sơ trùng đã có sẵn trong Danh bạ**: gộp hồ sơ (chưa có ở bản này); hỏi người phụ trách hệ thống.`,
    },
    {
      tieuDe: "Điều bạn không làm được — hỏi ai",
      noiDung: `Hỏi **người phụ trách hệ thống** khi cần:
- Cấp hoặc gỡ quyền Quản trị; gán vai Giám đốc, Điều hành chung, IT.
- Sửa, đặt lại PIN, ngưng tài khoản của một Quản trị khác.
- Đồng bộ danh sách nhân viên từ Google Sheet; xem trang Nhật ký.
- Bật, tắt chế độ bảo trì; gửi thông báo cho cả công ty.
- Đổi chính sách điều phối, điều kiện xuất bến.
- Sửa tên, mã số thuế, địa chỉ, hotline của công ty; đọc góp ý của người khác.`,
    },
    {
      tieuDe: "Câu hỏi thường gặp",
      noiDung: `- **PIN vừa tạo bị mất, xem lại được không?** Không. Bấm [[Đặt lại PIN]] để tạo PIN khác.
- **Xoá được tài khoản hay hồ sơ không?** Không. Chỉ ngưng tài khoản, hoặc bỏ tick Đang dùng ở hồ sơ.
- **Đổi giá thì đơn cũ có đổi tiền không?** Không. Đơn đã lập giữ giá lúc lập.
- **Ai duyệt Đặt gấp được?** Chỉ Quản trị và Toàn quyền.`,
    },
    {
      tieuDe: "Chỉ tài khoản Toàn quyền",
      noiDung: `Toàn quyền làm được mọi việc của Quản trị, thêm các việc dưới đây. Menu có thêm [[Chính sách điều phối]], [[Nhật ký]], [[Gửi thông báo]].

### Tài khoản
- Gán được vai Giám đốc, Điều hành chung, IT; sửa được cả tài khoản Quản trị.
- Đồng bộ nhân viên: bấm [[Đồng bộ danh sách từ Google Sheet…]], xem [[Xem trước dữ liệu từ Google Sheet]], tick người mới, bấm [[Tạo tài khoản cho người đã chọn]]. Tài khoản mới mang vai Nhân viên kinh doanh. Sheet không tự ngưng hay xoá ai.

### Chế độ bảo trì
Chỉ hiện ở trang Tôi khi số điện thoại của bạn nằm trong danh sách được phép.
1. Mục [[Chế độ bảo trì]]: chọn **30 phút**, **60 phút**, **120 phút** hoặc giờ dự kiến hoàn tất.
2. Bấm [[Bật chế độ bảo trì]], đọc cảnh báo, bấm [[Xác nhận bật]] (hoặc [[Quay lại]]).
3. Đổi giờ: [[Cập nhật giờ dự kiến]]. Mở lại app: [[Tắt chế độ bảo trì]].

> Lưu ý: chỉ bật khi cột Đăng nhập gần nhất cho thấy mọi người đã dùng bản mới.

### Gửi thông báo
1. Mở [[Gửi thông báo]], gõ tiêu đề và nội dung.
2. Chọn gửi cho [[Toàn công ty]] hoặc [[Chọn nhóm]]. Tick [[Tin quan trọng]] nếu cần mọi người bấm Đã hiểu.
3. Bấm [[Gửi thông báo]]. Sau đó xem [[Xem ai đã hiểu]], hoặc [[Thu hồi]] (không hoàn tác được).

> Ví dụ: gửi "Lịch nghỉ lễ" cho Toàn công ty, tick Tin quan trọng; hôm sau bấm Xem ai đã hiểu.

### Chính sách điều phối
Mở [[Chính sách điều phối]], sửa [[Mốc tối thiểu (giờ)]], [[Cảnh báo sát mốc (giờ)]], [[Khoảng nghỉ tài xế (phút)]], [[Khai lùi tối đa (phút)]], công tắc [[Phải đủ danh sách khách]]. Bấm [[Lưu thành bản mới]], có hiệu lực ngay; bản cũ vào [[Lịch sử bản]]. Liên kết [[Điều kiện theo cỡ xe, hạng bằng ›]] mở trang Điều kiện xuất bến.

### Nhật ký, Góp ý, hồ sơ công ty
- [[Nhật ký]]: tìm theo mã đơn, mã dịch vụ hoặc tên nhân viên.
- Góp ý: có thêm ngăn [[Hàng đợi]] để đọc mọi yêu cầu, đổi trạng thái, trả lời; tick ghi chú nội bộ thì người gửi không thấy.
- Hồ sơ công ty trong Danh bạ: sửa tên, mã số thuế, địa chỉ, hotline (trang đăng nhập và biên nhận dùng các thông tin này). Thêm hotline mới trước khi đóng cái cũ.`,
    },
  ],
};
