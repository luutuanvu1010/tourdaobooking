// Hướng dẫn: Quản trị (bản 1.40). Luật viết ở src/shared/huong-dan.ts; nguồn đối chiếu docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/quan-tri.md.
import type { NhomHuongDan } from "./huong-dan.ts";

export const HD_QUAN_TRI: NhomHuongDan = {
  id: "quan-tri",
  tieuDe: "Quản trị",
  quyen: ["ADMIN", "SUPER_ADMIN"],
  gioiThieu: "Bạn làm mọi việc của văn phòng, cộng thêm: sửa, ngưng, gán vai trò, hỗ trợ đăng nhập cho tài khoản nhân viên, Danh bạ, danh mục dịch vụ, địa điểm, xe và giấy tờ. Bạn đặt gấp lượt đưa đón sát giờ và phá lệ khi điều xe.",
  batDauNhanh: `1. Mở [[Quản lý tài khoản]], xem cột [[Đăng nhập gần nhất]] để biết ai đã vào.
2. Nhân viên mới: Hành chính nhân sự tạo tài khoản; bạn gán vai trò, đặt lại PIN khi họ cần.
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
- Nhóm **THIẾT LẬP** (bấm để mở, thu gọn): [[Hoa hồng đối tác]], [[Người bán dịch vụ]], [[Dịch vụ & giá]], [[Địa điểm]], [[Loại giấy tờ cá nhân]], [[Loại giấy tờ xe]], [[Lý do điều phối]], [[Quản lý tài khoản]].
- Số nhỏ cạnh Dịch vụ & giá: dịch vụ có giá Sheet vừa đổi; cạnh Xe & giấy tờ: giấy tờ đã hoặc sắp hết hạn.

### Trên điện thoại
- Tab ở đáy: [[Trang chủ]], [[Đơn hàng]], [[Tạo đơn]], [[Dịch vụ]], [[Tài khoản]], **Tôi**.
- Các trang khác mở từ trang Tôi: [[Danh bạ]], [[Địa điểm]], [[Loại giấy tờ cá nhân]], [[Điều chỉnh công nợ]], nhóm VẬN CHUYỂN ([[Điều phối xe]], [[Xe]], [[Giấy tờ sắp hết hạn]], [[Loại giấy tờ xe]], [[Lý do điều phối]]).`,
    },
    {
      tieuDe: "Tài khoản cho nhân viên mới",
      noiDung: `Tài khoản mới do **Hành chính nhân sự** (hoặc người phụ trách hệ thống) tạo ở khung **Thêm tài khoản**; Quản trị không còn khung này.

Bạn không thấy các vai trò quản lý (Giám đốc, Điều hành chung, IT, Hành chính nhân sự).`,
    },
    {
      tieuDe: "Đổi vai trò, sửa tên hoặc số điện thoại",
      noiDung: `1. [[Quản lý tài khoản]], ở dòng người đó bấm [[Sửa]].
2. Sửa [[Họ tên]], [[Số điện thoại đăng nhập]] nếu cần. Đổi số là đổi tên đăng nhập của họ.
3. Tick hoặc bỏ tick vai trò. Xem kỹ dòng **Sẽ thêm** và **Sẽ mất**. Đổi vai trò có thể đăng xuất máy thừa.
4. Cần cộng hoặc bớt riêng một quyền: mở [[Chỉnh riêng cho người này (cộng hoặc bớt quyền)]], tick ở [[Cộng thêm]] hoặc [[Bớt đi]], gõ lý do (bắt buộc).
5. Bấm [[Lưu]]; không lưu thì bấm [[Đóng]].`,
    },
    {
      tieuDe: "Quên PIN, bị khoá, mất máy, nghỉ việc",
      noiDung: `Mọi việc dưới đây làm ở [[Quản lý tài khoản]], dòng của người đó.

- **Quên PIN**: bấm [[Đặt lại PIN]], xác nhận. PIN cũ, Face ID mất hiệu lực; mọi máy của họ bị đăng xuất. Gửi riêng PIN mới rồi bấm [[Đã ghi lại, ẩn đi]].
- **Bị khoá vì gõ sai nhiều lần**: dòng có nhãn [[Bị khoá đăng nhập]]. Bấm [[Mở khoá]].
- **Mất điện thoại**: bấm nút **Gỡ Face ID**, rồi [[Đặt lại PIN]].
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
4. Nếu số đã có hồ sơ, sẽ hiện nút [[Mở hồ sơ này]]. Đúng người thì dùng hồ sơ có sẵn.
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
      noiDung: `Nguồn: Google Sheet; tự đồng bộ mỗi 15 phút.

1. [[Dịch vụ & giá]]: đầu trang ghi lần đồng bộ gần nhất và lỗi nếu có.
2. Lấy ngay: [[Đồng bộ ngay từ Google Sheet]].
3. Nền tảng hỏi vì sắp ẩn nhiều dịch vụ: chỉ đồng ý khi chắc Sheet đúng.

### Ghi đè giá (không ghi vào Sheet)
1. Tìm theo mã hoặc tên, bấm [[Sửa giá]], gõ giá loại khách cần đổi, [[Lưu ghi đè]].
2. Về giá Sheet: [[Bỏ ghi đè]].
3. Sheet đổi giá sau khi bạn ghi đè: dòng có cảnh báo; giữ giá của bạn: [[Giữ ghi đè]].
4. Tạm ngưng bán: [[Ẩn]]. Bán lại: [[Hiện lại]].

### Nhóm dịch vụ (không lấy từ Sheet)
Khối [[Nhóm dịch vụ]]: [[Thêm nhóm]], [[Lên]], [[Xuống]], [[Tắt]] (nhóm phải trống; dùng lại: [[Bật]]). Chuyển nhóm: tick ô chọn (tối đa 50), chọn nhóm đích; một dịch vụ: [[Sửa giá]] → [[Đổi nhóm]], có lịch sử. Tắt [[Có đưa đón]] thì dịch vụ của nhóm không còn phần Đưa đón.

Lọc: [[Đang ghi đè giá]], [[Sheet đã đổi giá (cần xem)]], [[Đã ẩn]], [[Không còn trong Sheet]]. Đơn đã lập luôn giữ giá lúc lập.`,
    },
    {
      tieuDe: "Người phụ trách đơn",
      noiDung: `1. Mở đơn, tìm khối [[Người phụ trách]]. Đơn chưa có ai hiện [[Chờ nhận]].
2. Bấm [[Chọn người phụ trách]] hoặc [[Đổi người phụ trách]], chọn người, bấm [[Lưu người phụ trách]].

Người đang lo đơn tự trả bằng [[Từ chối đơn]]: đơn về Chờ nhận, chữ "được trả lại". Đơn đi hôm nay, ngày mai thì họ gọi bạn đổi người. Người đi kèm chuyến xe không tự đổi theo.`,
    },
    {
      tieuDe: "Đặt gấp (giờ đón đã qua hạn chốt)",
      noiDung: `Giờ đón quá sát vẫn lưu nháp được, nhưng muốn xác nhận phải đặt gấp lượt đó (Bán hàng cũng tự làm được). Lượt chưa qua hạn chốt thì không đặt gấp được.

1. Mở đơn, bấm [[Đặt gấp]] ở dải vàng.
2. Chọn lý do: [[Khách đoàn gọi gấp]], [[Chuyến bay đổi giờ]], [[Đơn bù cho khách bị lỡ chuyến]] hoặc [[Lý do khác]]. Gõ [[Ghi chú ngắn]] nếu cần.
3. Bấm [[Duyệt đặt gấp]]. Sau đó đơn xác nhận được.

Ở màn Tạo đơn, nút Đặt gấp ở thẻ dịch vụ; Nền tảng lưu nháp rồi mới đặt gấp. Trên Điều phối xe có mục [[Đơn nháp chờ duyệt đặt gấp]].`,
    },
    {
      tieuDe: "Xe và giấy tờ xe",
      noiDung: `1. Vào [[Xe]], bấm [[Thêm xe]].
2. Gõ [[Biển số]], [[Số khung]], [[Tên / đời xe]], chọn [[Chủ xe]] (công ty hoặc nhà xe đối tác), [[Số người được chở (không kể tài xế)]], trạng thái. Bấm [[Lưu xe]].
3. Mở xe, bấm [[Thêm giấy tờ]]. Phải có Kiểm định và Bảo hiểm trách nhiệm dân sự, thiếu thì xe không chạy được.
4. Giấy mới: [[Gia hạn]]. Ghi sai: [[Sửa sai]].
5. Không dùng xe nữa: [[Sửa thông tin xe]], [[Ngừng dùng xe]], rồi [[Ngừng dùng]]. Xe không bị xoá; dùng lại bằng [[Dùng lại xe]].

### Giấy tờ sắp hết hạn
Mở [[Xe & giấy tờ]], chọn [[Giấy tờ sắp hết hạn]] (điện thoại: ở trang Tôi). Gồm giấy của xe và tài xế, cả giấy đã hết hạn; bấm một dòng để gia hạn.`,
    },
    {
      tieuDe: "Điều chỉnh khẩn cấp và phá lệ",
      noiDung: `Đã tới hạn chốt (kể cả khi xe chạy), xếp, rút, chuyển khách, đổi xe, đổi tài xế, huỷ chuyến còn khách là **điều chỉnh khẩn cấp**: Bán hàng cũng làm được. Chuyến chưa tới hạn chốt mà thiếu nghỉ, hoặc ghép khách, xe nhỏ trái cam kết [[Xe riêng]] hay [[Xe tối thiểu]] của đơn, là **phá lệ**: chỉ Quản trị.

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
- Lúc bạn bấm [[Duyệt]], máy kiểm lại trần và số dư; không đạt thì không đổi.
- Toàn quyền gửi được yêu cầu nhưng không tự duyệt yêu cầu của mình.`,
    },
    {
      tieuDe: "Các danh mục cài đặt",
      noiDung: `### Địa điểm
1. [[Địa điểm]], khung [[Thêm địa điểm]]: gõ mã (chữ HOA, số, gạch dưới), tên, loại, địa chỉ, thứ tự, [[Thêm]].
2. Sửa: [[Sửa]], [[Lưu]]. Mã không đổi được.
3. Không dùng nữa: bỏ tick [[Đang dùng]], Lưu (không xoá được).
4. Ô "Chọn nhanh (1–99)": điểm có số thành nút ở form Tạo đơn.

### Loại giấy tờ, hạng bằng lái
Mở [[Loại giấy tờ cá nhân]] (có cả [[Hạng giấy phép lái xe]]) hoặc [[Loại giấy tờ xe]]. Thêm: gõ mã, tên, tick [[Có ngày hết hạn]] nếu cần, thứ tự, [[Thêm]]. Sửa: [[Sửa]], [[Lưu]]. Không xoá, chỉ ngưng dùng.

### Trợ lý Hỗ trợ (chỉ Toàn quyền)
Mở [[Trợ lý Hỗ trợ]] ở nhóm THIẾT LẬP (điện thoại: trang **Tôi**). Bảy phần, lưu riêng từng phần, hiệu lực ngay:
1. **Tình trạng**: bật / tắt cả công ty, trần chi phí tháng, chi phí, số câu, lượt thử. [[Thử key]] cho biết key còn dùng được, sai hay hết tiền. Đổi key làm ngoài Nền tảng.
2. **Ai được dùng**: bật / tắt theo vai trò, số câu mỗi người mỗi ngày, [[Lưu]]. Tài khoản nhiều vai trò: một vai trò bật là dùng được.
3. **Bộ não**: chọn mẫu AI (có giá ước tính), mức suy nghĩ, độ dài; sửa lời nhắc, [[Lưu bộ não]]. [[Khôi phục mặc định]] chỉ đưa lời nhắc gốc vào ô soạn, phải bấm [[Lưu bộ não]] thì mới có hiệu lực; mở Lịch sử bản, [[Quay lại bản này]].
4. **Thử trước khi lưu**: chọn vai trò, gõ câu hỏi, bấm [[Thử với cấu hình đang soạn]].
5. **Lời dặn**: câu chào, câu hỏi mẫu, [[Lưu thành bản mới]].
6. **Ngữ cảnh bổ sung**: gõ tiêu đề và nội dung, [[Thêm đoạn]]; bỏ tick **Đang dùng** để tắt một đoạn.
7. **Lịch sử hỏi đáp**: lọc theo ngày, người, vai trò hoặc tìm chữ, [[Lọc]]. Không xoá được.

Chữ tuỳ chỉnh không được có số điện thoại, email, số tiền. Dù lời nhắc bị sửa, máy vẫn che số điện thoại, ẩn số tiền, giữ trần tiền và quyền xem.

### Dịch vụ nhập tay (chỉ Toàn quyền bật / tắt)
Trang **Tôi**, khối **Dịch vụ nhập tay**: [[Bật dịch vụ nhập tay]] hoặc [[Tắt dịch vụ nhập tay]]. Mặc định tắt. Khi bật: Bán hàng, Quản trị, Toàn quyền thêm được dịch vụ gõ tên và giá tay ở form lập đơn ([[+ Dịch vụ nhập tay]]). Tài khoản có quyền Đối tác luôn không dùng được. Khi tắt: dịch vụ nhập tay đã có trên đơn vẫn giữ, chỉ xem. Văn phòng thêm dịch vụ nhập tay vào đơn nháp của Đối tác thì Đối tác không tự xác nhận được — văn phòng xác nhận thay.

### Lý do điều phối
Mở [[Lý do điều phối]]. Lý do chia nhóm, như [[Đổi giờ xe tới]], [[Huỷ chuyến]], [[Điều chỉnh khẩn cấp, phá lệ]]. Thêm: [[+ Thêm lý do]] ở nhóm cần, gõ lý do, [[Thêm]]. Sửa tên: [[Sửa]]. Không dùng nữa: [[Ngưng]]; dùng lại: [[Dùng lại]]. Lý do hệ thống tự dùng không ngưng được.`,
    },
    {
      tieuDe: "Tình huống hay gặp",
      noiDung: `- **Nhân viên không vào được Nền tảng**: xem dòng của họ. Bị khoá thì [[Mở khoá]]; có nhãn [[Ngưng]] thì hỏi lý do trước khi kích hoạt lại; quên PIN thì [[Đặt lại PIN]].
- **Trang chủ báo Sheet đã đổi giá**: bấm vào, xem giá mới; đồng ý thì [[Bỏ ghi đè]], không thì [[Giữ ghi đè]].
- **Đồng bộ báo lỗi**: vẫn dùng bản đã lưu. Kiểm tra Sheet, thử lại sau; vẫn lỗi thì báo ở Hỗ trợ.
- **Nhân viên không xác nhận được đơn vì giờ đón sát**: bấm [[Đặt gấp]].
- **Hai hồ sơ trùng trong Danh bạ**: [[Danh bạ]] → [[Hồ sơ nghi trùng]] → [[Gộp]].`,
    },
    {
      tieuDe: "Điều bạn không làm được — hỏi ai",
      noiDung: `Hỏi **người phụ trách hệ thống** khi cần:
- Cấp hoặc gỡ quyền Quản trị, Nhân sự; gán vai trò Giám đốc, Điều hành chung, IT, Hành chính nhân sự.
- Sửa, đặt lại PIN, ngưng tài khoản của một Quản trị khác hoặc của Hành chính nhân sự.
- Tạo tài khoản mới (Hành chính nhân sự cũng làm được); xem trang Nhật ký.
- Bật, tắt chế độ bảo trì; gửi thông báo cho cả công ty.
- Đổi chính sách điều phối, điều kiện cho xe chạy.
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
      noiDung: `Toàn quyền làm được mọi việc của Quản trị, thêm các việc dưới đây. Menu có thêm [[Chính sách điều phối]], [[Nhật ký]], [[Gửi thông báo]], [[Máy đang đăng nhập]].

### Tài khoản
- Gán được vai trò Giám đốc, Điều hành chung, IT, Hành chính nhân sự; sửa được cả tài khoản Quản trị và Hành chính nhân sự.
- Tạo tài khoản ở khung [[Thêm tài khoản]], như Hành chính nhân sự.

### Chế độ bảo trì
Chỉ hiện ở trang Tôi của tài khoản Toàn quyền. Khi bật, mọi tài khoản khác (kể cả Quản trị) thấy màn hình bảo trì; tài khoản Toàn quyền vẫn dùng bình thường.
1. Mục [[Chế độ bảo trì]]: chọn **30 phút**, **60 phút**, **120 phút** hoặc giờ dự kiến hoàn tất.
2. Bấm [[Bật chế độ bảo trì]], đọc cảnh báo, bấm [[Xác nhận bật]] (hoặc [[Quay lại]]).
3. Đổi giờ: [[Cập nhật giờ dự kiến]]. Mở lại: [[Tắt chế độ bảo trì]].

> Lưu ý: chỉ bật khi cột Đăng nhập gần nhất cho thấy mọi người đã dùng bản mới.

### Gửi thông báo
1. Mở [[Gửi thông báo]], gõ tiêu đề và nội dung.
2. Chọn gửi cho [[Toàn công ty]] hoặc [[Chọn nhóm]]. Tick [[Tin quan trọng]] nếu cần mọi người bấm Đã hiểu.
3. Bấm [[Gửi thông báo]]. Sau đó: [[Xem ai đã hiểu]], hoặc [[Thu hồi]] (không hoàn tác được).

### Chính sách điều phối
Mở [[Chính sách điều phối]], sửa [[Hạn chốt trước giờ đón (phút)]], [[Cảnh báo sắp tới hạn chốt (phút)]], [[Khoảng nghỉ tài xế (phút)]], [[Khai lùi tối đa (phút)]], công tắc [[Phải đủ danh sách khách]]. Bấm [[Lưu thành bản mới]], có hiệu lực ngay; bản cũ vào [[Lịch sử bản]]. Liên kết [[Điều kiện theo cỡ xe, hạng bằng ›]] mở trang Điều kiện cho xe chạy.

### Máy đang đăng nhập
Mở [[Máy đang đăng nhập]] (điện thoại: trang **Tôi**) xem ai đăng nhập trên máy nào.
- [[Đăng xuất máy này]]: đăng xuất ngay.
- Nghi lộ PIN, mất máy: [[Đăng xuất mọi máy + đặt lại PIN]]; PIN mới hiện một lần, gửi riêng cho người đó.
- **Chính sách đăng nhập**: mỗi quyền chọn Một máy hoặc Nhiều máy (một quyền Nhiều máy là đủ); [[Lưu chính sách]], xem số máy sẽ đăng xuất, [[Xác nhận lưu]].

### Nhật ký, Hỗ trợ, hồ sơ công ty
- [[Nhật ký]]: tìm theo mã đơn, mã dịch vụ hoặc tên nhân viên.
- Hỗ trợ: ở [[Việc của nhóm]], thành viên nhóm nhận việc, đổi trạng thái, mức ưu tiên, trả lời; Trưởng nhóm có thêm [[Giao cho người khác]].
- Hồ sơ công ty trong Danh bạ: sửa tên, mã số thuế, địa chỉ, hotline (dùng ở trang đăng nhập và biên nhận). Thêm hotline mới trước khi đóng cái cũ.`,
    },
  ],
};
