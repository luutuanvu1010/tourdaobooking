// Hướng dẫn: Quản trị (bản 1.40). Luật viết ở src/shared/huong-dan.ts; nguồn đối chiếu docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/quan-tri.md.
import type { NhomHuongDan } from "./huong-dan.ts";

export const HD_QUAN_TRI: NhomHuongDan = {
  id: "quan-tri",
  tieuDe: "Quản trị",
  quyen: ["ADMIN", "SUPER_ADMIN"],
  gioiThieu: "Bạn làm mọi việc của văn phòng, cộng thêm: sửa, ngưng, gán vai, hỗ trợ đăng nhập cho tài khoản nhân viên, Danh bạ, danh mục dịch vụ, địa điểm, xe và giấy tờ. Bạn duyệt Đặt gấp cho chặng đón sát giờ và phá lệ khi điều xe.",
  batDauNhanh: `1. Mở [[Quản lý tài khoản]], xem cột [[Đăng nhập gần nhất]] để biết ai đã vào app.
2. Nhân viên mới: Hành chính nhân sự tạo tài khoản; bạn gán vai, đặt lại PIN khi họ cần.
3. Mở [[Dịch vụ & giá]], xem lần đồng bộ gần nhất với Google Sheet có lỗi không.
4. Trên Trang chủ, xem khối [[Việc của bạn]] (thẻ [[Cần xem lại]] đứng đầu).
5. Mở [[Xe & giấy tờ]], chọn [[Giấy tờ sắp hết hạn]] để xem giấy tờ xe, tài xế sắp hết hạn.`,
  muc: [
    {
      tieuDe: "Menu của bạn",
      noiDung: `### Trên máy tính
- **Đầu menu**: [[Tạo đơn]], [[Trang chủ]], [[Đơn hàng]], [[Danh bạ]].
- Nhóm **VẬN CHUYỂN**: [[Điều phối xe]], [[Xe đang chạy]], [[Đề nghị chuyển khách]], [[Xe & giấy tờ]] (gộp [[Xe]], [[Lịch xe bận]], [[Giấy tờ sắp hết hạn]]) và [[Giá & chi phí]].
- Nhóm **TIỀN**: [[Điều chỉnh công nợ]]; [[Khoá sổ tháng]] chỉ Toàn quyền thấy.
- Nhóm **THIẾT LẬP** (bấm để mở, thu gọn): [[Hoa hồng đối tác]], [[Người bán dịch vụ]], [[Dịch vụ & giá]], [[Địa điểm]], [[Loại giấy tờ cá nhân]], [[Loại giấy tờ xe]], [[Lý do điều phối]], [[Quản lý tài khoản]].- Số nhỏ cạnh Dịch vụ & giá: dịch vụ có giá Sheet vừa đổi; cạnh Xe & giấy tờ: giấy tờ đã hoặc sắp hết hạn.
### Trên điện thoại
- Tab ở đáy: [[Trang chủ]], [[Đơn hàng]], [[Tạo đơn]], [[Dịch vụ]], [[Tài khoản]], **Tôi**.
- Các trang khác mở từ trang Tôi: [[Danh bạ]], [[Địa điểm]], [[Loại giấy tờ cá nhân]], [[Điều chỉnh công nợ]], nhóm VẬN CHUYỂN ([[Điều phối xe]], [[Xe]], [[Giấy tờ sắp hết hạn]], [[Loại giấy tờ xe]], [[Lý do điều phối]]).
- Bảng ở trang quản trị có thể phải kéo ngang. Việc nhiều nên làm trên máy tính.`,
    },
    {
      tieuDe: "Tài khoản cho nhân viên mới",
      noiDung: `Tài khoản mới do **Hành chính nhân sự** (hoặc người phụ trách hệ thống) tạo ở khung **Thêm tài khoản**; Quản trị không còn khung này. Sau khi có tài khoản, bạn vẫn đổi vai, sửa tên, ngưng và hỗ trợ đăng nhập như dưới đây.

Bạn không thấy các vai quản lý (Giám đốc, Điều hành chung, IT, Hành chính nhân sự).`,
    },
    {
      tieuDe: "Đổi vai, sửa tên hoặc số điện thoại",
      noiDung: `1. [[Quản lý tài khoản]], ở dòng người đó bấm [[Sửa]].
2. Sửa [[Họ tên]], [[Số điện thoại đăng nhập]] nếu cần. Đổi số là đổi tên đăng nhập của họ.
3. Tick hoặc bỏ tick vai. Xem kỹ dòng **Sẽ thêm** và **Sẽ mất**. Đổi vai có thể đăng xuất máy thừa.
4. Cần cộng hoặc bớt riêng một quyền: mở [[Chỉnh riêng cho người này (cộng hoặc bớt quyền)]], tick ở [[Cộng thêm]] hoặc [[Bớt đi]], gõ lý do (bắt buộc).
5. Bấm [[Lưu]]; không lưu thì bấm [[Đóng]].`,
    },
    {
      tieuDe: "Quên PIN, bị khoá, mất máy, nghỉ việc",
      noiDung: `Mọi việc dưới đây làm ở [[Quản lý tài khoản]], trên dòng của người đó.

- **Quên PIN**: bấm [[Đặt lại PIN]], xác nhận. PIN cũ, Face ID và mọi phiên đăng nhập của họ mất hiệu lực. Gửi riêng PIN mới rồi bấm [[Đã ghi lại, ẩn đi]].
- **Bị khoá vì gõ sai nhiều lần**: dòng có nhãn [[Bị khoá đăng nhập]]. Bấm [[Mở khoá]].
- **Mất điện thoại**: bấm nút **Gỡ Face ID** (số trong ngoặc là số máy đã bật), rồi [[Đặt lại PIN]].
- **Nghỉ việc**: bấm [[Ngưng]], xác nhận. Họ bị đăng xuất ngay. Quay lại làm thì bấm [[Kích hoạt lại]]. Tài khoản không bao giờ bị xoá.

Bạn không đặt lại PIN của chính mình ở đây; tự đổi ở trang Tôi. Bạn chỉ quản lý được tài khoản **không có quyền Quản trị hoặc Nhân sự**; trên dòng của Quản trị khác và của Hành chính nhân sự các nút bị ẩn.`,
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

Tìm: gõ tên hoặc số điện thoại, lọc theo loại, công việc, nơi làm, bấm [[Tìm]]. Tick [[Gồm cả hồ sơ đã ngưng]] để xem cả hồ sơ cũ.`,
    },
    {
      tieuDe: "Danh bạ: sửa chi tiết, liên hệ, công việc, tài xế",
      noiDung: `Bấm vào tên hồ sơ để mở.

- **Thông tin**: sửa rồi bấm [[Lưu thông tin]]. Bỏ tick [[Đang dùng]] để ngưng hồ sơ. Người có tài khoản thì ngưng ở màn Quản lý tài khoản.
- **Liên hệ**: chọn loại, gõ giá trị, ghi chú (vd Zalo, hotline), tick [[Liên hệ chính]] nếu cần, bấm [[Thêm liên hệ]]. Liên hệ cũ bấm [[Đóng]], lịch sử vẫn giữ.
- **Công việc tại đâu**: chọn công việc, nơi làm, ngày bắt đầu, bấm [[Thêm công việc]]. Hết làm thì bấm [[Kết thúc]]. Loại đối tác do Kế toán thêm (ghi « (đối tác)») cũng gắn ở đây; nhân viên nội bộ không gắn được.
- **Người liên hệ, tài xế**: chọn loại quan hệ, gõ tên hồ sơ cần nối, chọn, rồi bấm [[Thêm người liên hệ]], [[Thêm quan hệ tài xế]] hoặc [[Thêm tài xế]].`,
    },
    {
      tieuDe: "Giấy tờ của người",
      noiDung: `Căn cước, bằng lái, khám sức khoẻ… Chỉ ở hồ sơ Cá nhân, chỉ Quản trị thấy.

1. Mở hồ sơ ở Danh bạ, mục [[Giấy tờ]], bấm [[Thêm giấy tờ]].
2. Chọn loại, gõ số, ngày cấp, ngày hết hạn (hoặc tick [[Giấy này không có hạn]]). Bằng lái có thêm [[Hạng]].
3. Lưu.

- Được cấp giấy mới: bấm [[Gia hạn]], dòng cũ giữ làm lịch sử, bấm [[Lưu gia hạn]].
- Ghi sai: bấm [[Sửa sai]], chọn lý do, bấm [[Lưu sửa sai]].
- Số luôn bị che. Chỉ người phụ trách hệ thống xem được số đầy đủ: bấm [[Xem đủ số]] và xác nhận. Số hiện vài giây rồi tự che, hoặc bấm [[Che lại]].
- Quản trị chỉ thấy số đã che (ví dụ ••••6789), vẫn thêm, gia hạn, sửa sai được. Cần số đầy đủ (ví dụ kiểm bằng lái thật) thì nhờ người phụ trách hệ thống, hoặc xem bản giấy.

> Lưu ý: mỗi lần xem đủ số đều được ghi nhật ký. Hồ sơ của Quản trị khác bạn chỉ xem, không sửa.`,
    },
    {
      tieuDe: "Dịch vụ & giá (Google Sheet)",
      noiDung: `Nguồn: Google Sheet; app tự đồng bộ mỗi 15 phút.

1. [[Dịch vụ & giá]]: đầu trang ghi lần đồng bộ gần nhất và lỗi nếu có.
2. Lấy ngay: [[Đồng bộ ngay từ Google Sheet]].
3. App hỏi vì sắp ẩn nhiều dịch vụ: chỉ đồng ý khi chắc Sheet đúng.

### Ghi đè giá (chỉ trong app, không ghi vào Sheet)
1. Tìm theo mã hoặc tên, bấm [[Sửa giá]], gõ giá loại khách cần đổi, [[Lưu ghi đè]].
2. Về giá Sheet: [[Bỏ ghi đè]].
3. Sheet đổi giá sau khi bạn ghi đè: dòng có cảnh báo; giữ giá của bạn: [[Giữ ghi đè]].
4. Tạm ngưng bán: [[Ẩn]]. Bán lại: [[Hiện lại]].

### Nhóm dịch vụ (trong app, không lấy từ Sheet)
Khối [[Nhóm dịch vụ]]: [[Thêm nhóm]], [[Lên]], [[Xuống]], [[Tắt]] (nhóm phải trống; dùng lại: [[Bật]]). Chuyển nhóm: tick ô chọn (tối đa 50), chọn nhóm đích; một dịch vụ: [[Sửa giá]] → [[Đổi nhóm]], có lịch sử.

Lọc: [[Đang ghi đè giá]], [[Sheet đã đổi giá (cần xem)]], [[Đã ẩn]], [[Không còn trong Sheet]]. Đơn đã lập luôn giữ giá lúc lập.`,
    },
    {
      tieuDe: "Người phụ trách đơn",
      noiDung: `1. Mở đơn từ [[Đơn hàng]], tìm khối [[Người phụ trách]].
2. Đơn chưa có ai hiện [[Chờ nhận]]. Bấm [[Chọn người phụ trách]] (hoặc [[Đổi người phụ trách]]).
3. Chọn người, bấm [[Lưu người phụ trách]].`,
    },
    {
      tieuDe: "Đặt gấp (giờ đón dưới 6 giờ)",
      noiDung: `Đơn có giờ đón quá sát vẫn lưu nháp được, nhưng muốn xác nhận thì Quản trị phải duyệt Đặt gấp cho chặng đó.

1. Mở đơn. Dưới dịch vụ có dải vàng báo giờ đón dưới mốc 6 giờ.
2. Bấm [[Đặt gấp]].
3. Chọn lý do: [[Khách đoàn gọi gấp]], [[Chuyến bay đổi giờ]], [[Đơn bù cho khách bị lỡ chuyến]] hoặc [[Lý do khác]]. Gõ [[Ghi chú ngắn]] nếu cần.
4. Bấm [[Duyệt đặt gấp]]. Sau đó đơn xác nhận được.

Ở màn Tạo đơn, nút Đặt gấp hiện ngay trên thẻ dịch vụ; app lưu nháp rồi mới đặt gấp. Trên Điều phối xe có mục [[Đơn nháp chờ duyệt đặt gấp]].`,
    },
    {
      tieuDe: "Xe và giấy tờ xe",
      noiDung: `1. Vào [[Xe]], bấm [[Thêm xe]].
2. Gõ [[Biển số]], [[Số khung]], [[Tên / đời xe]], chọn [[Chủ xe]] (công ty hoặc nhà xe đối tác), [[Số người được chở (không kể tài xế)]], trạng thái. Bấm [[Lưu xe]].
3. Mở xe, bấm [[Thêm giấy tờ]]. Tối thiểu phải có Kiểm định và Bảo hiểm trách nhiệm dân sự, thiếu thì xe không xuất bến được.
4. Giấy mới: [[Gia hạn]]. Ghi sai: [[Sửa sai]].
5. Không dùng xe nữa: [[Sửa thông tin xe]], [[Ngừng dùng xe]], rồi [[Ngừng dùng]]. Xe không bị xoá; dùng lại bằng [[Dùng lại xe]].

### Giấy tờ sắp hết hạn
Mở [[Xe & giấy tờ]], chọn [[Giấy tờ sắp hết hạn]] (điện thoại: ở trang Tôi). Danh sách gồm giấy của xe và tài xế, cả giấy đã hết hạn. Bấm một dòng để mở rồi gia hạn.`,
    },
    {
      tieuDe: "Điều chỉnh khẩn cấp và phá lệ",
      noiDung: `Trong 6 giờ trước giờ xuất bến (và khi xe chạy), xếp, rút, chuyển khách, đổi xe, đổi tài xế, huỷ chuyến còn khách là **điều chỉnh khẩn cấp**: Bán hàng cũng làm được. Chuyến còn hơn 6 giờ mà thiếu nghỉ, hoặc ghép khách, xe nhỏ trái cam kết [[Xe riêng]] hay [[Xe tối thiểu]] của đơn, là **phá lệ**: chỉ Quản trị.

1. Thao tác như thường trên [[Điều phối xe]] hoặc màn chuyến.
2. Hộp hỏi hiện nút như [[Điều chỉnh khẩn cấp và rút]], [[Điều chỉnh khẩn cấp và lưu]], [[Phá lệ và xếp]], [[Phá lệ và lưu]].
3. Chọn lý do, bấm nút đó.
4. Chờ duyệt chuyển khách: mở [[Đề nghị chuyển khách]], [[Duyệt]] hoặc [[Bác]].

### Lịch xe bận
[[Lịch xe bận]]: ghi giờ xe vào xưởng; giờ đó không xếp chuyến cho xe được. Bấm ✕ để rút.`,
    },
    {
      tieuDe: "Duyệt điều chỉnh công nợ",
      noiDung: `Kế toán gửi yêu cầu điều chỉnh công nợ; số dư **chưa đổi** tới khi người **khác người gửi** duyệt.

1. Bấm [[Điều chỉnh công nợ]]. Khối **Chờ duyệt** là yêu cầu chưa ai quyết.
2. Đồng ý thì bấm [[Duyệt]]: số dư đổi ngay.
3. Không đồng ý thì bấm [[Từ chối]], gõ lý do (bắt buộc), bấm [[Xác nhận từ chối]].

- Quản trị chỉ duyệt, không gửi yêu cầu, không thấy sổ công nợ hay yêu cầu đã quyết.
- Quá 7 ngày không ai quyết thì yêu cầu hết hạn, số dư giữ nguyên.
- Lúc bạn bấm [[Duyệt]], máy kiểm lại trần và số dư; không đạt thì không đổi gì.
- Toàn quyền có thêm khối gửi yêu cầu nhưng không tự duyệt yêu cầu của mình.`,
    },
    {
      tieuDe: "Các danh mục cài đặt",
      noiDung: `### Địa điểm
1. [[Địa điểm]], khung [[Thêm địa điểm]]: gõ mã (chữ HOA, số, gạch dưới), tên, loại, địa chỉ, thứ tự, [[Thêm]].
2. Sửa: [[Sửa]], [[Lưu]]. Mã không đổi được.
3. Không dùng nữa: bỏ tick [[Đang dùng]], Lưu (không xoá được).

### Loại giấy tờ, hạng bằng lái
Mở [[Loại giấy tờ cá nhân]] (có cả [[Hạng giấy phép lái xe]]) hoặc [[Loại giấy tờ xe]]. Thêm: gõ mã, tên, tick [[Có ngày hết hạn]] nếu cần, thứ tự, [[Thêm]]. Sửa: [[Sửa]], [[Lưu]]. Không xoá, chỉ ngưng dùng.

### Trợ lý Hỗ trợ (chỉ Toàn quyền)
Mở [[Trợ lý Hỗ trợ]] ở nhóm THIẾT LẬP (điện thoại: trang **Tôi**). Sáu phần, mỗi phần có nút lưu riêng, hiệu lực ngay:
1. **Tình trạng**: bật / tắt cả công ty, trần chi phí tháng, chi phí, số câu, lượt thử. [[Thử key]] cho biết key còn dùng được, sai hay hết tiền. Đổi key làm ngoài app.
2. **Ai được dùng**: bật / tắt theo từng vai và số câu mỗi người mỗi ngày, [[Lưu]]. Tài khoản nhiều vai: dùng được khi có một vai đang bật.
3. **Bộ não**: chọn mẫu AI (có giá ước tính), mức suy nghĩ, độ dài; sửa lời nhắc, [[Lưu bộ não]]. [[Khôi phục mặc định]] chỉ đưa lời nhắc gốc vào ô soạn, phải bấm [[Lưu bộ não]] thì mới có hiệu lực; mở Lịch sử bản, [[Quay lại bản này]]. Thử trước: chọn vai, gõ câu hỏi, [[Thử với cấu hình đang soạn]].
4. **Lời dặn**: câu chào, câu hỏi mẫu, [[Lưu thành bản mới]].
5. **Ngữ cảnh bổ sung**: gõ tiêu đề và nội dung, [[Thêm đoạn]]; bỏ tick **Đang dùng** để tắt một đoạn.
6. **Lịch sử hỏi đáp**: lọc theo ngày, người, vai hoặc tìm chữ, [[Lọc]]. Không xoá được.

Chữ tuỳ chỉnh không được có số điện thoại, email, số tiền. Dù lời nhắc bị sửa, máy vẫn che số điện thoại, ẩn số tiền, giữ trần tiền và quyền xem.

### Dịch vụ nhập tay (chỉ Toàn quyền bật / tắt)
Trang **Tôi**, khối **Dịch vụ nhập tay**: [[Bật dịch vụ nhập tay]] hoặc [[Tắt dịch vụ nhập tay]]. Mặc định tắt. Khi bật: Bán hàng, Quản trị, Toàn quyền thêm được dịch vụ gõ tên và giá tay ở form lập đơn ([[+ Dịch vụ nhập tay]]). Tài khoản có quyền Đối tác luôn không dùng được. Khi tắt: dịch vụ nhập tay đã có trên đơn vẫn giữ, chỉ xem. Văn phòng thêm dịch vụ nhập tay vào đơn nháp của Đối tác thì Đối tác không tự xác nhận được — văn phòng xác nhận thay.

### Lý do điều phối
Mở [[Lý do điều phối]]. Lý do chia nhóm, như [[Đổi giờ xe tới]], [[Huỷ chuyến]], [[Điều chỉnh khẩn cấp, phá lệ]]. Thêm: [[+ Thêm lý do]] ở nhóm cần, gõ lý do, [[Thêm]]. Sửa tên: [[Sửa]]. Không dùng nữa: [[Ngưng]]; dùng lại: [[Dùng lại]]. Lý do hệ thống tự dùng không ngưng được.`,
    },
    {
      tieuDe: "Tình huống hay gặp",
      noiDung: `- **Nhân viên không vào được app**: xem dòng của họ. Bị khoá thì [[Mở khoá]]; có nhãn [[Ngưng]] thì hỏi lý do trước khi kích hoạt lại; quên PIN thì [[Đặt lại PIN]].
- **Trang chủ báo Sheet đã đổi giá**: bấm vào, xem giá mới; đồng ý thì [[Bỏ ghi đè]], không thì [[Giữ ghi đè]].
- **Đồng bộ báo lỗi**: app vẫn dùng bản đã lưu. Kiểm tra Sheet, thử lại sau; vẫn lỗi thì gửi Góp ý.
- **Nhân viên không xác nhận được đơn vì giờ đón sát**: duyệt [[Đặt gấp]].
- **Hai hồ sơ trùng đã có sẵn trong Danh bạ**: gộp hồ sơ (chưa có ở bản này); hỏi người phụ trách hệ thống.`,
    },
    {
      tieuDe: "Điều bạn không làm được — hỏi ai",
      noiDung: `Hỏi **người phụ trách hệ thống** khi cần:
- Cấp hoặc gỡ quyền Quản trị, Nhân sự; gán vai Giám đốc, Điều hành chung, IT, Hành chính nhân sự.
- Sửa, đặt lại PIN, ngưng tài khoản của một Quản trị khác hoặc của Hành chính nhân sự.
- Tạo tài khoản mới (Hành chính nhân sự cũng làm được); xem trang Nhật ký.
- Bật, tắt chế độ bảo trì; gửi thông báo cho cả công ty.
- Đổi chính sách điều phối, điều kiện xuất bến.
- Sửa tên, mã số thuế, địa chỉ, hotline của công ty; đọc góp ý của người khác.`,
    },
    {
      tieuDe: "Câu hỏi thường gặp",
      noiDung: `- **PIN vừa tạo bị mất, xem lại được không?** Không. Bấm [[Đặt lại PIN]] để tạo PIN khác.
- **Xoá được tài khoản hay hồ sơ không?** Không. Chỉ ngưng tài khoản, hoặc bỏ tick Đang dùng ở hồ sơ.
- **Đổi giá thì đơn cũ có đổi tiền không?** Không. Đơn đã lập giữ giá lúc lập.`,
    },
    {
      tieuDe: "Chỉ tài khoản Toàn quyền",
      noiDung: `Toàn quyền làm được mọi việc của Quản trị, thêm các việc dưới đây. Menu có thêm [[Chính sách điều phối]], [[Nhật ký]], [[Gửi thông báo]], [[Phiên đăng nhập]].

### Tài khoản
- Gán được vai Giám đốc, Điều hành chung, IT, Hành chính nhân sự; sửa được cả tài khoản Quản trị và Hành chính nhân sự.
- Tạo tài khoản ở khung [[Thêm tài khoản]], như Hành chính nhân sự.

### Chế độ bảo trì
Chỉ hiện ở trang Tôi của tài khoản Toàn quyền. Khi bật, mọi tài khoản khác (kể cả Quản trị) thấy màn hình bảo trì; tài khoản Toàn quyền vẫn dùng bình thường.
1. Mục [[Chế độ bảo trì]]: chọn **30 phút**, **60 phút**, **120 phút** hoặc giờ dự kiến hoàn tất.
2. Bấm [[Bật chế độ bảo trì]], đọc cảnh báo, bấm [[Xác nhận bật]] (hoặc [[Quay lại]]).
3. Đổi giờ: [[Cập nhật giờ dự kiến]]. Mở lại app: [[Tắt chế độ bảo trì]].

> Lưu ý: chỉ bật khi cột Đăng nhập gần nhất cho thấy mọi người đã dùng bản mới.

### Gửi thông báo
1. Mở [[Gửi thông báo]], gõ tiêu đề và nội dung.
2. Chọn gửi cho [[Toàn công ty]] hoặc [[Chọn nhóm]]. Tick [[Tin quan trọng]] nếu cần mọi người bấm Đã hiểu.
3. Bấm [[Gửi thông báo]]. Sau đó xem [[Xem ai đã hiểu]], hoặc [[Thu hồi]] (không hoàn tác được).

### Chính sách điều phối
Mở [[Chính sách điều phối]], sửa [[Mốc tối thiểu (giờ)]], [[Cảnh báo sát mốc (giờ)]], [[Khoảng nghỉ tài xế (phút)]], [[Khai lùi tối đa (phút)]], công tắc [[Phải đủ danh sách khách]]. Bấm [[Lưu thành bản mới]], có hiệu lực ngay; bản cũ vào [[Lịch sử bản]]. Liên kết [[Điều kiện theo cỡ xe, hạng bằng ›]] mở trang Điều kiện xuất bến.

### Phiên đăng nhập
Mở [[Phiên đăng nhập]] (điện thoại: trang **Tôi**) xem ai đang đăng nhập trên máy nào.
- [[Gỡ phiên]]: máy đó đăng xuất ngay.
- Nghi lộ PIN, mất máy: [[Gỡ phiên + đặt lại PIN]]; PIN mới hiện một lần, gửi riêng cho người đó.
- **Chính sách đăng nhập**: mỗi quyền chọn Một máy hoặc Nhiều máy (một quyền Nhiều máy là đủ); [[Lưu chính sách]], xem số máy sẽ đăng xuất, [[Xác nhận lưu]].

### Nhật ký, Góp ý, hồ sơ công ty
- [[Nhật ký]]: tìm theo mã đơn, mã dịch vụ hoặc tên nhân viên.
- Góp ý: có thêm ngăn [[Hàng đợi]] để đọc mọi yêu cầu, đổi trạng thái, trả lời; tick ghi chú nội bộ thì người gửi không thấy.
- Hồ sơ công ty trong Danh bạ: sửa tên, mã số thuế, địa chỉ, hotline (trang đăng nhập và biên nhận dùng các thông tin này). Thêm hotline mới trước khi đóng cái cũ.`,
    },
  ],
};
