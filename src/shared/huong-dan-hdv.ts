// Hướng dẫn: Hướng dẫn viên (bản 1.40). Luật viết ở src/shared/huong-dan.ts; nguồn đối chiếu docs/superpowers/plans/2026-09-30-huong-dan-theo-vai-nguon/hdv.md.
import type { NhomHuongDan } from "./huong-dan.ts";
import { mucBatHaiLop, mucNhanMaEmail } from "./huong-dan-hai-lop.ts";

export const HD_HDV: NhomHuongDan = {
  id: "hdv",
  tieuDe: "Hướng dẫn viên",
  quyen: ["FIELD"],
  gioiThieu:
    "Bạn là hướng dẫn viên. Trong Nền tảng, bạn nhận đơn đang chờ người lo, gọi khách, xem thông tin chuyến và tiền của đơn mình lo, ghi tiền đã thu và bấm Đã giao khi xong; khi cần thì sửa số khách hoặc huỷ đơn, luôn kèm lý do.",
  batDauNhanh: `1. Bấm [[Tôi]] ở thanh dưới đáy.
2. Kéo tới mục **Việc của tôi**. Có hai ô: **Chờ nhận** và **Đơn của tôi**.
3. Ở khối **Đơn chờ nhận**, xem ngày đi, giờ đón, số khách.
4. Đơn hợp lịch thì bấm [[Nhận]].
5. Đơn chuyển xuống **Đơn của tôi**. Bấm [[Gọi]] để hẹn khách.
6. Bấm chuông ở góc trên để xem thông báo.`,
  muc: [
    {
      tieuDe: "Menu của bạn",
      noiDung: `Trên điện thoại, thanh dưới đáy chỉ có một nút: [[Tôi]].

Trên máy tính, menu bên trái có [[Đơn hàng]] (chỉ đơn bạn đang lo) ở đầu menu; ở chân menu có [[Của tôi]], [[Hỗ trợ]], [[Trợ giúp]]. Đơn tự do đang chờ nhận nằm ở [[Của tôi]], không nằm ở [[Đơn hàng]].

Mở Nền tảng, bạn thấy trang [[Đơn hàng]]. Trang này chỉ có đơn **bạn đang lo**.

Việc hằng ngày nằm ở trang [[Tôi]], mục **Việc của tôi**:
- **Chờ nhận**: đơn chưa có ai lo.
- **Đơn của tôi**: đơn bạn đang lo.

Chuông ở góc trên là nơi xem thông báo.`,
    },
    {
      tieuDe: "Nhận một đơn đang chờ",
      noiDung: `1. Bấm [[Tôi]].
2. Kéo tới khối **Đơn chờ nhận**. Đơn đi sớm nhất đứng đầu.
3. Mỗi thẻ có: ngày đi, mã đơn, còn mấy ngày, tên dịch vụ, giờ đón, số khách, nơi đón.
   - Ở đây **không có** tên khách, số điện thoại, tiền.
4. Bấm [[Nhận]]. Nút đổi thành "Đang nhận…".
5. Nhận xong, đơn nằm ở **Đơn của tôi**. Lúc này bạn mới thấy tên khách, số điện thoại và tiền.

> Ví dụ: Chị Lan thấy một đơn tour đảo, đón 07:30 ở một khách sạn trên đường Trần Phú, 8 khách, đi thứ Tư. Chị bấm Nhận. Đơn chuyển xuống Đơn của tôi, có tên người đặt và nút Gọi.

Người khác bấm nhận trước bạn: Nền tảng báo "Đơn này vừa có người khác nhận phụ trách". Bạn chọn đơn khác.

Không nhận được đơn **đã huỷ** hay **đã qua ngày đi**.`,
    },
    {
      tieuDe: "Xem và lo đơn của mình",
      noiDung: `Mỗi thẻ ở **Đơn của tôi** có:
- Ngày đi, mã đơn, nhãn ngày như "Hôm nay", "Ngày mai".
- Trạng thái: **Chờ xác nhận**, **Đã xác nhận** hoặc **Đã đi tour**.
- Tên khách, số điện thoại và nút [[Gọi]]. Bấm là điện thoại quay số.
- Từng dịch vụ: giờ đón, số khách, nơi đón, giờ khởi hành, khách có mặt, ghi chú.
- Ba ô tiền: **Tổng tiền**, **Đã thu**, **Còn lại**.
- Các nút [[Sửa số khách]], [[Huỷ đơn]], [[Xem đơn]] (tuỳ trạng thái đơn).

Đơn sắp đi ở trên. Đơn đã đi tour ở dưới cùng, sau dòng **Đã đi tour**.

Bấm [[Xem đơn]] để mở trang đầy đủ. Ở đó không sửa hay huỷ được (làm ở **Việc của tôi**), nhưng có khối **Thanh toán** để ghi tiền và bấm Đã giao (xem mục dưới).

> Ví dụ: Tối trước ngày đi, chị Lan bấm Gọi để hẹn khách 07:30 ở sảnh khách sạn. Chị xem ô Còn lại để biết có phải thu thêm không.`,
    },
    {
      tieuDe: "Sửa số khách",
      noiDung: `Chỉ làm được với đơn **Đã xác nhận**, tới **hết ngày đi**. Từ hôm sau không còn nút [[Sửa số khách]]; cần sửa thì nhờ văn phòng (người lập đơn, Kế toán hoặc Quản trị).

1. Ở thẻ đơn, bấm [[Sửa số khách]].
2. Ở từng dịch vụ, bấm nút tăng hoặc giảm cho từng loại khách.
   - Dịch vụ ghi "không sửa được ở đây": nhờ văn phòng sửa.
3. Ở ô **Lý do sửa (bắt buộc)**, bấm nhanh [[Khách thêm người]], [[Khách bớt người]] hoặc [[Đổi dịch vụ]], hoặc tự gõ.
   - **Không gõ số điện thoại**, máy sẽ từ chối.
4. Bấm [[Xác nhận]]. Muốn bỏ thì bấm [[Đóng]].

Để trống lý do, Nền tảng báo "Cần nhập lý do sửa." Lý do có số điện thoại, Nền tảng báo "Lý do không được chứa số điện thoại hoặc dãy số dài — chỉ ghi văn bản thường."

> Ví dụ: Sáng đi tour, khách báo thêm 2 trẻ em. Chị Lan bấm Sửa số khách, tăng Trẻ em thêm 2, bấm Khách thêm người, rồi bấm Xác nhận.`,
    },
    {
      tieuDe: "Huỷ đơn",
      noiDung: `Chỉ huỷ được đơn **Đã xác nhận**, và **trước ngày đi**. Huỷ rồi **không lấy lại được**.

1. Ở thẻ đơn, bấm [[Huỷ đơn]].
2. Chọn một lý do:
   - [[Không liên hệ được với khách]]
   - [[Khách yêu cầu huỷ]]
   - [[Khác]]: gõ lý do vào ô hiện ra. **Không gõ số điện thoại**, máy sẽ từ chối.
3. Bấm [[Huỷ đơn]] trong bảng để huỷ. Đổi ý thì bấm [[Không huỷ]].

> Ví dụ: Chị Lan gọi đoàn khách ba lần không ai nghe. Chị bấm Huỷ đơn, chọn Không liên hệ được với khách, rồi bấm Huỷ đơn.`,
    },
    {
      tieuDe: "Trả đơn (Từ chối)",
      noiDung: `Nhận nhầm, hoặc bận không đi được: trả đơn để người khác nhận. Đơn **không bị huỷ**, chỉ quay về danh sách Chờ nhận.

1. Ở thẻ đơn, bấm [[Từ chối đơn]].
2. Chọn một lý do: Bận lịch khác, Ốm / việc riêng, Không phù hợp tuyến/dịch vụ, hoặc Khác. Không có ô gõ chữ.
3. Bấm [[Xác nhận từ chối]]. Đổi ý thì bấm [[Không từ chối]].

Thẻ đơn biến khỏi Đơn của tôi; người khác thấy đơn ở Đơn chờ nhận, có chữ "được trả lại". Bạn không mở được đơn đó nữa.

- Chỉ trả được đơn **Đã xác nhận**. Đơn chờ xác nhận: báo người lập đơn đổi người phụ trách.
- Đơn đi **hôm nay hoặc ngày mai** thì không còn nút này: **gọi văn phòng** để đổi người.
- **Có giới hạn số lần:** tối đa **2 đơn liên tiếp** và **15 lần mỗi tuần** (thứ Hai – Chủ nhật). Nhận hoặc được giao một đơn khác và giữ đơn đó thì đếm "liên tiếp" lại từ đầu. Huỷ đơn không tính. Khi đang chặn, hộp Từ chối ghi sẵn "Bạn còn được từ chối … đơn liên tiếp, … lần trong tuần này". Hết lượt thì bấm sẽ hiện **"Hãy gọi văn phòng"** — gọi văn phòng để đổi người.

> Ví dụ: Anh Tâm nhận đơn đi thứ Sáu rồi bị ốm. Thứ Tư anh bấm Từ chối đơn, chọn Ốm / việc riêng, bấm Xác nhận từ chối. Đơn về Chờ nhận cho người khác.`,
    },
    {
      tieuDe: "Thu tiền và bấm Đã giao",
      noiDung: `Làm trên trang đơn (bấm [[Xem đơn]]), khối **Thanh toán**. Khối này ghi **Đã thu**, **Còn lại** và từng khoản thu.

**Ghi tiền khách trả:**
1. Bấm [[Ghi khoản thu]].
2. Gõ số tiền, chọn hình thức, chọn người thu tiền: [[Tôi thu]] (tiền mặt bạn cầm) hoặc [[Công ty (vào tài khoản công ty)]].
3. Bấm [[Ghi]].

**Khách trả cho đại lý hoặc trả tại quầy nhà cung cấp** (bạn không cầm tiền): ở ô người thu tiền chọn "Khách trả cho đại lý …" hoặc "Khách trả tại quầy …"; đơn có dịch vụ của nhà cung cấp thì chọn thêm **Phần tiền này cho**. Khoản này chờ Kế toán xác nhận với bên kia; trong lúc chờ, đơn chưa Đã giao được.

**Xong tour, khách đã trả đủ:** bấm [[Đã giao – đã thu đủ]] rồi đồng ý. Nút chỉ bấm được khi đơn đã xác nhận, từ ngày đi trở đi, và số đã thu **bằng đúng** số phải thu. Nút bị mờ thì dòng **Đang giữ đơn** ghi lý do và ai xử lý.

Sau Đã giao, đơn **bị khoá**: không sửa số khách, không huỷ, không ghi thêm khoản thu. Thẻ ghi "Đã giao – đã thu đủ: đơn đã khoá." Bạn đang cầm tiền mặt của công ty thì nhớ nộp về; Kế toán ghi đã nộp rồi bấm **Hoàn thành**.`,
    },
    {
      tieuDe: "Thông báo",
      noiDung: `Chuông có hai ngăn:
- [[Của tôi]]: tin công ty gửi bạn, tin về đơn bạn lo, đơn mới đang chờ nhận.
- [[Tất cả]]: thêm các tin khác.

Khi văn phòng xác nhận một đơn chưa có ai lo, bạn nhận tin "Có đơn mới …, chưa có người phụ trách". Bấm vào tin là Nền tảng mở trang [[Tôi]].

Tin quan trọng có nút [[Đã hiểu]]. Đọc xong thì bấm.

### Nhận thông báo trên màn hình khoá (iPhone)
1. Mở Nền tảng trong Safari, bấm **Chia sẻ**, chọn **Thêm vào MH chính**.
2. Mở Nền tảng từ biểu tượng vừa thêm.
3. Vào [[Tôi]], bấm [[Bật thông báo trên điện thoại]] và cho phép.
4. Muốn tắt: bấm [[Tắt]] ở cùng mục.`,
    },
    {
      tieuDe: "Tình huống hay gặp",
      noiDung: `- **Nhận đơn Chờ xác nhận:** vẫn nhận được, nhưng chưa sửa hay huỷ được. Thẻ ghi "Đơn đang chờ xác nhận — chưa thể huỷ hay sửa số khách." Đợi văn phòng xác nhận.
- **Nhận nhầm, bận không đi được:** bấm [[Từ chối đơn]] ở thẻ đơn (xem mục Trả đơn). Đơn đi hôm nay hoặc ngày mai thì gọi văn phòng giao cho người khác.
- **Đơn đã qua ngày đi:** không còn nút [[Huỷ đơn]] và [[Sửa số khách]]. Cần huỷ hay sửa số khách thì nhờ văn phòng (người lập đơn, Kế toán hoặc Quản trị).
- **Đang sửa thì văn phòng cũng sửa đơn đó:** Nền tảng đóng bảng, hiện dòng báo màu vàng rồi tải lại. Bạn xem lại rồi làm lại.
- **Mất mạng:** Nền tảng báo chưa tải được đơn. Có mạng thì tải lại trang.
- **Không thấy khối Đơn chờ nhận:** tài khoản có thêm quyền Đối tác. Hỏi Quản trị.
- **Không bấm được Đã giao:** đọc dòng **Đang giữ đơn** trên trang đơn. Còn thiếu tiền thì ghi thêm khoản thu; khách trả dư hay khoản thu chưa rõ người thu tiền thì chờ Kế toán.`,
    },
    {
      tieuDe: "Điều bạn không làm được — hỏi ai",
      noiDung: `- **Xem đơn của người khác:** không được. Bạn chỉ xem đơn mình lo và phần rút gọn của đơn chờ nhận.
- **Lập đơn mới:** nhờ nhân viên bán hàng.
- **Sửa dịch vụ, giờ đón, thông tin chuyến, xác nhận đơn:** nhờ người lập đơn hoặc văn phòng.
- **Trả lại đơn đã nhận:** chưa có (chưa có ở bản này). Văn phòng giao cho người khác.
- **Huỷ đơn chờ xác nhận, huỷ sau ngày đi:** nhờ văn phòng.
- **Sửa số khách sau ngày đi:** nhờ văn phòng (người lập đơn, Kế toán hoặc Quản trị).
- **Hoàn tiền cho khách, xác nhận tiền đã vào công ty, bấm Hoàn thành:** Kế toán làm.
- **Xem bảng giá, Danh bạ:** hỏi văn phòng.`,
    },
    {
      tieuDe: "Câu hỏi thường gặp",
      noiDung: `### Sao đơn chờ nhận không có số điện thoại khách?
Vì đơn chưa phải của bạn. Bấm [[Nhận]] xong là thấy.

### Hai người cùng bấm Nhận thì sao?
Ai bấm trước được. Người sau thấy dòng báo, danh sách tự tải lại.

### Huỷ nhầm có lấy lại được không?
Không. Gọi văn phòng ngay để lập đơn mới.

### Sửa số khách sau ngày đi được không?
Không. Bạn sửa được tới hết ngày đi. Từ hôm sau, nhờ văn phòng (người lập đơn, Kế toán hoặc Quản trị) sửa.

### Tôi có thấy tiền của đơn không?
Có, chỉ ở đơn bạn đang lo: **Tổng tiền**, **Đã thu**, **Còn lại**.`,
    },
    mucBatHaiLop("noi-bo"), mucNhanMaEmail("noi-bo"),
  ],
};
