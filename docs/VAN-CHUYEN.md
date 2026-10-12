# Phân hệ Vận chuyển — hướng dẫn cho chủ dự án (bản 1.38, ngày 30/9/2026)

> Tài liệu **mô tả** (không phải lời duyệt; khi lệch mã thì mã đúng, sửa tài liệu này). Viết cho người không lập trình.
> Mọi tên menu, trang, nút dưới đây lấy từ mã thật của bản 1.38. Điều chưa đối chiếu được với mã hay với thao tác thật ghi rõ **"chưa kiểm"**.
> Lộ trình, trạng thái từng lượt, việc đang chặn: `docs/superpowers/specs/2026-09-29-van-chuyen-lo-trinh.md`.
> Cập nhật 2/10: mục 2.3 và danh sách việc đã đối chiếu bản 1.65; các mục khác vẫn theo bản 1.38 — chưa rà lại.

**Điều quan trọng nhất:** bản 1.38 đã chạy trên mạng thật, nhưng **chủ đã quyết chưa dùng Bảng điều phối cho chuyến thật** cho tới khi có màn nhập tên khách. Màn đó đã có từ bản 1.62; việc dùng Bảng điều phối cho chuyến thật đang chờ chủ quyết. Văn phòng vẫn điều xe như cũ. Riêng **quy tắc 6 giờ đã có hiệu lực ngay** với việc xác nhận đơn.

## Mục lục

1. [Phân hệ làm gì](#1-phân-hệ-làm-gì)
2. [Đang có gì trên bản 1.38](#2-đang-có-gì-trên-bản-138)
3. [Cách sử dụng theo vai](#3-cách-sử-dụng-theo-vai)
4. [Checklist sẵn sàng thử tính năng](#4-checklist-sẵn-sàng-thử-tính-năng)
5. [Lưu ý và giới hạn đã biết](#5-lưu-ý-và-giới-hạn-đã-biết)
6. [Nguồn (cho người kỹ thuật)](#6-nguồn-cho-người-kỹ-thuật)

---

## 1. Phân hệ làm gì

Phân hệ Vận chuyển giúp công ty quản lý **xe và giấy tờ xe**, **tài xế và giấy tờ của họ**, **nhà xe đối tác**, và **điều xe đưa đón khách** của các đơn: gom khách của nhiều đơn lên một chuyến xe, kiểm xe có đủ điều kiện chạy không, để tài xế tự bấm tiến độ trên điện thoại.

### Các khái niệm chính (lời thường)

| Khái niệm | Nghĩa |
|---|---|
| **Xe** | Một chiếc xe có biển số, số khung, tên / đời xe, **số người được chở (không kể tài xế)**, chủ xe (công ty hoặc một nhà xe đối tác), trạng thái Đang dùng / Bảo dưỡng / Ngừng dùng. Xe không bao giờ bị xoá, chỉ ngừng dùng. |
| **Giấy tờ xe** | Đăng ký xe, Kiểm định, Bảo hiểm trách nhiệm dân sự, Phù hiệu xe hợp đồng, Giám sát hành trình, Camera người lái (danh mục sửa được). Mỗi giấy có ngày hết hạn; gia hạn là thêm một dòng mới, bản cũ vẫn giữ làm lịch sử. |
| **Giấy tờ của người** | Căn cước, Giấy phép lái xe (có **hạng**: B, D1, D2, D…), Khám sức khoẻ, Tập huấn nghiệp vụ vận tải. Ghi trong hồ sơ người ở Danh bạ. **Số giấy luôn bị che**; chỉ Quản trị / Toàn quyền bấm "Xem đủ số" thì số hiện khoảng 10 giây, và mỗi lần xem đều được ghi lại. |
| **Tài xế công ty** | Nhân viên có tài khoản app (vai "Tài xế công ty"). Mở app là vào "Cuốc của tôi". |
| **Tài xế đối tác** | Người của một nhà xe đối tác, có tài khoản riêng (vai "Tài xế đối tác"). Bản 1.38 mới cho họ **xem giấy tờ của mình**; chưa dùng app cho chuyến. |
| **Nhà xe đối tác** | Một hồ sơ tổ chức trong Danh bạ mang vai "Nhà xe đối tác". Tài xế gắn với nhà xe bằng quan hệ "Tài xế của"; xe của nhà xe ghi ở ô "Chủ xe". |
| **Chặng đưa đón** | Một lượt đón của một dịch vụ trong đơn: chiều đi hoặc chiều về, ngày giờ đón, nơi đón, nơi trả. Từ 1.38 thông tin đưa đón được lưu theo từng chặng (màn nhập đơn vẫn như cũ). |
| **Hành khách** | Danh sách họ tên + năm sinh của đơn. Nhân viên nhập ở khối "Hành khách" của form đơn và "Sửa danh sách" ở chi tiết đơn (từ bản 1.62). |
| **Chuyến** | Một lần chạy của một xe với một tài xế trong một khung giờ (giờ bắt đầu, giờ kết thúc). Mã chuyến dạng "CX-…". Trạng thái: lên kế hoạch → đang chạy → kết thúc (hoặc kết thúc gián đoạn, hoặc huỷ). Chuyến huỷ không bị xoá. |
| **Suất** | Chỗ của một khách trên chuyến. Xếp một chặng có 4 khách lên xe là mở 4 suất. |
| **Điểm dừng** | Các nơi xe dừng đón / trả khách của chuyến, theo thứ tự. Máy tự tạo từ nơi đón / nơi trả của các chặng được xếp. |
| **Xếp / Rút / Chuyển** | Xếp: đưa khách của một chặng lên một chuyến (xếp ít hơn số khách là tách đoàn, phần còn lại ở cột "Chưa xếp"). Rút: đưa khách ra khỏi xe, về cột "Chưa xếp". Chuyển: đưa khách sang một chuyến khác cùng ngày. |
| **Xuất bến** | Lúc xe lăn bánh. Chỉ xuất bến được khi chuyến **đạt đủ điều kiện xuất bến**. |
| **"Giữ"** | Chuyến chưa đủ điều kiện thì bị giữ (không xuất bến được) và màn hình ghi rõ **lý do** + **ai xử lý** (Văn phòng / Quản trị / Toàn quyền). Ví dụ lý do: "Chưa đủ tên khách", "Chặng chưa có nơi trả", "Nơi đón / trả đã đổi sau khi xếp — cập nhật điểm", "Khách trong xe không còn trong đơn — bấm Cập nhật khách theo đơn", "Xe thiếu hoặc hết hạn giấy tờ bắt buộc", "Tài xế chưa có giấy phép lái xe còn dùng được", "Giấy phép lái xe chưa ghi hạng", "Hạng bằng lái không đủ chở số chỗ của xe", "Chưa đủ thời gian nghỉ sau chuyến trước", "Vượt số chỗ của xe". Màn chi tiết chuyến gom các lý do thành bảy dòng kiểm: Giấy tờ xe, Giấy phép lái xe, Đủ tên khách, Không có đơn đã huỷ, Điểm khớp đơn, Đủ chỗ, Đủ giờ nghỉ. |
| **Mốc 6 giờ và "Đặt gấp"** | Giờ đón cách bây giờ **dưới 6 giờ** thì đơn vẫn **lưu nháp** được, nhưng **muốn xác nhận** phải có Quản trị hoặc Toàn quyền bấm **"Đặt gấp"** cho chặng đó (chọn lý do: "Khách đoàn gọi gấp", "Chuyến bay đổi giờ", "Đơn bù cho khách bị lỡ chuyến", "Lý do khác"). Phía xếp xe: trong 6 giờ trước giờ xuất bến, chuyến bị **khoá** (không xếp thêm, không đổi xe / tài xế, không rút) trừ khi Quản trị **phá lệ** kèm lý do; khoá "dính" — dời giờ chuyến ra xa cũng không mở lại. Bán hàng vẫn tạo được chuyến mới trong 6 giờ, nhưng chỉ để xếp chặng đã "Đặt gấp". |
| **"Đã gọi báo"** | Khi giờ hẹn đón của một chặng **đổi sau khi đã xếp xe**, bảng điều phối hiện mục "Giờ hẹn đổi — gọi báo khách". Máy **không tự báo khách**; người phụ trách gọi khách rồi bấm "Đã gọi báo" (bấm nhầm thì "Bỏ đánh dấu"). |
| **Chính sách điều phối** | Các con số cài đặt (chỉ Toàn quyền đổi): mốc tối thiểu (6 giờ), cảnh báo sát mốc (2 giờ), khoảng nghỉ tài xế giữa hai chuyến (30 phút), khai lùi tối đa khi văn phòng bấm thay (180 phút), công tắc "Phải đủ danh sách khách" (đang **bật**), "Phải có hợp đồng" (khoá tắt). Giá trị trong ngoặc là giá trị gieo sẵn lúc cài; giá trị đang dùng trên mạng thật **chưa kiểm**. Mỗi lần lưu là một bản mới, có hiệu lực ngay; bản cũ vào lịch sử. |
| **Điều kiện xuất bến** | Giấy tờ bắt buộc phải còn hạn tới hết chuyến. Gieo sẵn cho mọi xe: **Kiểm định** và **Bảo hiểm trách nhiệm dân sự**. Chỉ thêm hoặc đóng, không sửa, không xoá. |
| **Giờ xảy ra thật** | Khi văn phòng bấm thay tài xế (ví dụ "Đã đón"), được khai giờ việc thật xảy ra (lùi tối đa theo chính sách). Màn hiện hai giờ, kiểu "07:31 · ghi lúc 07:45 — Lan". Tài xế tự bấm thì luôn lấy giờ máy chủ. |

---

## 2. Đang có gì trên bản 1.38

### 2.1 Các màn và ai thấy

Trên máy tính, các mục nằm ở thanh bên, nhóm **QUẢN TRỊ › Vận chuyển**. Trên điện thoại, mở trang **Tôi**, nhóm **VẬN CHUYỂN**.

| Màn (tên trong menu) | Dùng để | Ai thấy |
|---|---|---|
| **Điều phối xe** | Bảng theo ngày: cột "Chưa xếp" (chặng của đơn đã xác nhận), dòng thời gian theo xe, cột "Cần xử lý", nút "+ Chuyến mới"; mở "Chi tiết chuyến" và "Tạo / sửa chuyến" | Bán hàng, Kế toán (chỉ xem), Quản trị, Toàn quyền |
| **Xe** | Danh sách xe, lọc theo "Chủ xe"; "Thêm xe"; chi tiết xe với "Giấy tờ xe" ("Thêm giấy tờ", "Gia hạn", "Sửa sai", lịch sử) | Quản trị, Toàn quyền |
| **Sắp hết hạn** (điện thoại: "Giấy tờ sắp hết hạn") | Giấy tờ của xe và tài xế còn 30 ngày trở xuống hoặc đã hết; số đếm hiện ở menu | Quản trị, Toàn quyền |
| **Loại giấy tờ xe** | Danh mục loại giấy tờ xe (thêm, sửa, ngưng — không xoá) | Quản trị, Toàn quyền |
| **Chính sách điều phối** (kèm trang **Điều kiện xuất bến** và bảng **Số khách theo hạng bằng**) | Các con số và công tắc ở mục 1 | **Chỉ Toàn quyền** |
| **Lý do điều phối** | Danh mục lý do dùng trong các hộp chọn (phá lệ, huỷ chuyến, …); chỉ ngưng, không xoá | Quản trị, Toàn quyền |
| **Loại giấy tờ người** (nhóm QUẢN TRỊ, ngoài mục Vận chuyển) | Danh mục loại giấy tờ của người + hạng giấy phép lái xe | Quản trị, Toàn quyền |
| **Danh bạ** → hồ sơ người → mục **"Giấy tờ"** | Ghi giấy tờ của nhân viên, tài xế ("Thêm giấy tờ", "Xem đủ số") | Ghi và "Xem đủ số": Quản trị, Toàn quyền |
| **Danh bạ** → hồ sơ tổ chức (vai "Nhà xe đối tác") → mục **"Người liên hệ, tài xế"** | Ghi nhà xe, tài xế thuộc nhà xe (quan hệ "Tài xế của") | Quản trị, Toàn quyền (chưa kiểm từng nút ở màn này) |
| Trang đơn → khối dưới dịch vụ | Dải cảnh báo "dưới 6 giờ", nút **"Đặt gấp"**, nhãn "Đặt gấp — lý do — người duyệt" | Nút: Quản trị, Toàn quyền. Nhãn đủ: Bán hàng, Kế toán, Quản trị, Toàn quyền. Đối tác, Hướng dẫn viên, Thực tập chỉ thấy "Đặt gấp — Quản trị đã duyệt" |
| **Cuốc của tôi** | Chuyến mình lái, hai nhóm "Hôm nay" và "Ngày mai"; mở chuyến để bấm Xuất bến, Đã tới, Đã đón, Vắng, Đã trả, Kết thúc | Tài xế công ty (tài khoản chỉ tài xế: tab mở đầu; tài khoản vừa tài xế vừa văn phòng: mục ở thanh bên / trang Tôi) |
| **Trang chủ của tài xế** | Lời chào, lối sang "Cuốc của tôi", "Giấy tờ của tôi" | Tài xế công ty, Tài xế đối tác |
| Trang **Tôi** → **"Giấy tờ của tôi"** | Xem giấy tờ và hạn của chính mình, số bị che | Nhân viên nội bộ và tài xế; tài khoản mang quyền Đối tác thì không có mục này |

### 2.2 Ai được làm gì (theo bảng quyền trong mã)

| Việc | Bán hàng | Kế toán | Quản trị | Toàn quyền | Hướng dẫn viên | Đối tác | Thực tập | Tài xế công ty | Tài xế đối tác |
|---|---|---|---|---|---|---|---|---|---|
| Xem Điều phối xe, chi tiết chuyến | có | có | có | có | không | không | không | chỉ chuyến mình lái (ở "Cuốc của tôi") | không |
| Tạo / sửa / xếp / rút / chuyển / huỷ chuyến; "Cập nhật điểm theo đơn", "Cập nhật khách theo đơn" | có | không | có | có | không | không | không | không | không |
| Gắn người đi kèm (hướng dẫn viên) — chỉ chọn được tài khoản Hướng dẫn viên đang hoạt động | có | không | có | có | không | không | không | không | không |
| Xem chuyến (Hướng dẫn viên) | — | — | — | — | không (chờ ADR-0064) | — | — | — | — |
| Phá lệ (mốc 6 giờ, khoảng nghỉ) | không | không | có | có | không | không | không | không | không |
| Bấm tiến độ (Xuất bến, Đã đón, …) | bấm thay | không | bấm thay | bấm thay | không | không | không | tự bấm, chuyến mình lái | không |
| "Đã gọi báo" | đơn mình lập hoặc đang phụ trách | không | mọi chặng | mọi chặng | không | không | không | không | không |
| Bấm "Đặt gấp" | không | không | có | có | không | không | không | không | không |
| Xe, giấy tờ xe, Sắp hết hạn | không | không | có | có | không | không | không | không | không |
| Chính sách điều phối, Điều kiện xuất bến, số khách theo hạng bằng | không | không | **không** | có | không | không | không | không | không |
| Lý do điều phối, loại giấy tờ | không | không | có | có | không | không | không | không | không |
| Xem tên + năm sinh khách trên chuyến | có (chi tiết chuyến) | có | có | có | không | không | không | chỉ trong ngày chạy | không |

### 2.3 Cái gì CHƯA có (cập nhật bản 1.65)

- ~~**Màn nhập tên hành khách** và **màn nhập / sửa chặng đưa đón mới** (chiều về, nơi trả, …) — ADR-0047 Phần B, chờ chủ vẽ. Hệ quả: chuyến có khách luôn bị giữ "Chưa đủ tên khách". Ngoài ra, theo mã, **không màn nào ghi được nơi trả**: đơn lập bằng màn hiện tại tạo chặng chiều đi **không có nơi trả** (chỉ đơn cũ trước 1.38 được chép "Nơi check-in" sang làm nơi trả). Chặng thiếu nơi trả vẫn **xếp được** lên xe, nhưng chuyến bị giữ "Chặng chưa có nơi trả" và không xuất bến. Chặng chưa có giờ đón thì **không xếp được**.~~ — **đã có từ 1.62** (khối Đưa đón + Hành khách ở form đơn; "Sửa đưa đón" / "Sửa danh sách" ở chi tiết đơn). Chiều về: form gợi ý theo dịch vụ, máy chủ không tự tạo.
- **Tài xế đối tác dùng app cho chuyến**, Từ chối chuyến, Báo bận (ADR-0053, lượt 3).
- **Chuyển điểm đón giữa hai xe**, việc văn phòng làm khi xe đang chạy, **cứu hộ** xe hỏng (ADR-0052, lượt 2).
- **Chiều về tự tạo theo dịch vụ** (ADR-0054).
- **Lịch xe vào xưởng, giờ lái tối đa, số hiệu chuyến bay** (ADR-0055); **"xe riêng" / số chỗ tối thiểu hứa khách** (ADR-0056).
- **Tiền xe thuê** (bảng giá nhà xe, chi phí chuyến — ADR-0057) và sổ tiền / công nợ.
- **Hợp đồng vận chuyển** (để sau).
- **Ô ghi chú gõ tự do** trong chuyến; **tài xế mất mạng thì máy tự gửi lại** (hiện phải bấm lại); văn phòng sắp lại thứ tự điểm khi xe đang chạy; huy hiệu số ở mục "Điều phối xe" (sổ tồn đọng mục 5–7).

---

## 3. Cách sử dụng theo vai

> Các bước dưới đây viết theo tên nút trong mã. Chưa ai thao tác thật bằng tài khoản đã đăng nhập trên bản 1.38 (theo trạng thái triển khai 30/9) — **chưa kiểm** trên màn thật.

### 3.1 Quản trị

**Xe và giấy tờ xe**
1. Vận chuyển › **Xe** → **"Thêm xe"**. Điền Biển số, Số khung, Tên / đời xe, Chủ xe (công ty hoặc nhà xe), **Số người được chở (không kể tài xế** — xe 16 chỗ nhập 15), Trạng thái → **"Lưu xe"**.
2. Mở xe → mục "Giấy tờ xe" → **"Thêm giấy tờ"**: chọn loại, số, ngày cấp, ngày hết hạn. **Tối thiểu Kiểm định và Bảo hiểm trách nhiệm dân sự** (thiếu là xe bị giữ, không xuất bến).
3. Giấy sắp hết: bấm **"Gia hạn"** (thêm bản mới). Ghi sai: **"Sửa sai"** (sửa bản hiện hành, cần lý do).
4. Xe không dùng nữa: "Sửa thông tin xe" → **"Ngừng dùng xe"** (không xoá; "Dùng lại xe" được).
5. Theo dõi hạn: Vận chuyển › **Sắp hết hạn** (30 ngày trở xuống); bấm một dòng để mở xe hoặc hồ sơ.

**Nhà xe đối tác**
1. **Danh bạ** → hồ sơ tổ chức của nhà xe → gán vai **"Nhà xe đối tác"**.
2. Hồ sơ người của tài xế → mục "Người liên hệ, tài xế" → quan hệ **"Tài xế của"** nhà xe đó.
3. Xe của nhà xe: ở **Xe**, chọn "Chủ xe" là nhà xe.
(Thao tác từng nút ở Danh bạ: chưa kiểm.)

**Tài xế**
1. **Quản lý tài khoản** → tạo tài khoản, chọn vai **"Tài xế công ty"**; tài xế của nhà xe: vai **"Tài xế đối tác"** (vai này đứng một mình, không kèm quyền khác). Từng bước ở màn này: chưa kiểm.
2. **Danh bạ** → hồ sơ người của tài xế → mục **"Giấy tờ"** → **"Thêm giấy tờ"** → **Giấy phép lái xe**, ghi **hạng** và ngày hết hạn. Thiếu hạng, hết hạn, hoặc hạng không đủ chở số chỗ của xe thì chuyến bị giữ. Giới hạn gieo sẵn: hạng B tối đa 8 khách, D1 16, D2 29, D không giới hạn (không kể tài xế) — **chưa có người chuyên môn kiểm các con số này**.

**Lý do điều phối**
- Vận chuyển › **Lý do điều phối** → "+ Thêm lý do" / "Sửa" / ngưng. Lý do đã dùng không xoá được.

**Đặt gấp**
1. Mở đơn có dải cảnh báo "Giờ đón cách bây giờ … — …" (dưới mốc 6 giờ).
2. Bấm **"Đặt gấp"** ở khối dưới dịch vụ → chọn **Lý do**, ghi **Ghi chú ngắn** (không bắt buộc) → **"Duyệt đặt gấp"**.
3. Sau đó người lập đơn bấm **"Xác nhận đơn"** được. Trong form lập đơn, Quản trị có nút "Duyệt đặt gấp" ngay trên thẻ dịch vụ: máy **lưu nháp rồi đặt gấp**.
4. Dấu "Đặt gấp" còn giữ nếu sau đó không đổi ngày, giờ, nơi đón, nơi trả; đổi thì mất, phải bấm lại. Đơn đã xác nhận mà chặng đã đặt gấp và đang dưới mốc: **chỉ Quản trị / Toàn quyền** sửa được đưa đón của chặng đó.

**Phá lệ**: khi xếp / rút / đổi xe / đổi tài xế trong vùng khoá 6 giờ, hộp hỏi hiện nút **"Phá lệ và xếp"** (hoặc "… và rút", "… và chuyển", "… và lưu", "… và huỷ") → chọn lý do. Việc phá lệ ghi vào nhật ký chuyến kèm tên người bấm.

### 3.2 Toàn quyền (thêm so với Quản trị)

1. Vận chuyển › **Chính sách điều phối**: sửa Mốc tối thiểu (giờ, lớn hơn 0, tối đa 48 — không tắt được), Cảnh báo sát mốc, Khoảng nghỉ tài xế (phút), Khai lùi tối đa (phút), công tắc "Phải đủ danh sách khách" → **"Lưu thành bản mới"** (hiệu lực ngay). Xem "Lịch sử bản".
2. Từ trang đó → **"Điều kiện theo cỡ xe, hạng bằng ›"** → trang **Điều kiện xuất bến**: "Thêm điều kiện" (áp cho xe chở từ N người, giấy tờ của xe hoặc của tài xế) hoặc "Đóng" một điều kiện; bảng "Số khách theo hạng bằng" → "Đổi".
3. Khuyến nghị: **không** tắt "Phải đủ danh sách khách" và **không** đóng hai điều kiện Kiểm định / Bảo hiểm trên mạng thật — chủ đã chọn "chưa dùng cho chuyến thật" thay vì tắt công tắc.

### 3.3 Bán hàng — lập đơn có giờ đón sát

1. Lập đơn như cũ. Nếu giờ đón cách bây giờ dưới 6 giờ, cuối thẻ dịch vụ hiện dải cảnh báo; dòng nhắc "Lưu nháp được. Xác nhận cần Quản trị duyệt đặt gấp."
2. Lưu nháp. Trên trang đơn, nút **"Xác nhận đơn"** bị khoá kèm dòng "Cần Quản trị duyệt đặt gấp".
3. Nhờ Quản trị bấm **"Đặt gấp"** (mục 3.1). Xong thì bấm "Xác nhận đơn".
4. Nếu sửa ngày / giờ / nơi của chặng đã đặt gấp trước khi xác nhận thì dấu mất, phải nhờ lại.

### 3.4 Văn phòng điều phối (Bán hàng, Quản trị, Toàn quyền)

> Nhắc lại: **chưa dùng cho chuyến thật** ở bản 1.38.

1. Vận chuyển › **Điều phối xe**, chọn ngày.
2. **"+ Chuyến mới"** → Chọn xe, Chọn tài xế (nhóm "Tài xế công ty" và theo từng nhà xe), Giờ bắt đầu, Giờ kết thúc → **"Lưu chuyến"**. Khung "Xe trong ngày" báo nếu trùng giờ.
3. Xếp khách: **kéo chặng** ở cột "Chưa xếp" thả vào một chuyến, hoặc bấm chặng → **"Xếp vào chuyến…"** → chọn chuyến, nhập "Số khách xếp vào chuyến" (ít hơn là tách đoàn) → **"Xếp vào chuyến"**.
4. Bấm chuyến → **"Mở chuyến"** để xem **Chi tiết chuyến**: điểm dừng, "Điều kiện xuất bến" (bảy dòng Đạt / Chưa đạt, kèm "Ai xử lý"), "Khách trong chuyến", "Nhật ký chuyến".
5. Sửa sai: trên từng nhóm khách, **"Rút khỏi xe"** hoặc **"Chuyển sang xe khác"**; cả chuyến: **"Sửa chuyến"**, **"Huỷ chuyến"** (chọn lý do; khách về cột "Chưa xếp", chuyến không bị xoá).
6. Chuyến bị giữ vì nơi đón / trả đổi trên đơn: bấm **"Cập nhật điểm theo đơn"**. Vì khách trong đơn bị thay: **"Cập nhật khách theo đơn"**. Không cần Quản trị.
7. **Bấm thay tài xế** (tài xế gọi về báo): ở Chi tiết chuyến, **"Xuất bến thay tài xế"**, rồi ở từng điểm **Ghi "Đã tới"**, "Đã đón" / "Vắng" / "Khách đã huỷ", Ghi "Đã trả", cuối cùng **"Kết thúc chuyến"** hoặc **"Kết thúc gián đoạn"**. Hộp hỏi có ô **"Xảy ra lúc"** để khai giờ thật (lùi tối đa theo chính sách, mặc định 180 phút). Kế toán không bấm thay được.
8. **"Đã gọi báo"**: khi cột "Cần xử lý" hiện "Giờ hẹn đón đổi …", gọi khách rồi bấm **"Đã gọi báo"**; nhầm thì **"Bỏ đánh dấu"**. Bán hàng chỉ bấm được cho đơn mình lập hoặc đang phụ trách.
9. Trong vùng khoá 6 giờ, Bán hàng thấy câu "Chuyến đã vào vùng khoá trước giờ xuất bến — cần Quản trị phá lệ."

### 3.5 Tài xế công ty

1. Mở app → vào thẳng **"Cuốc của tôi"**: hai nhóm **Hôm nay**, **Ngày mai**; mỗi chuyến có giờ xuất bến, mã, biển số, số khách, số điểm.
2. Bấm một chuyến. Nếu còn thiếu điều kiện, màn ghi "Chưa xuất bến được — văn phòng đang lo."
3. Đủ điều kiện → **"Xuất bến"** lúc xe lăn bánh (giờ ghi là lúc bấm).
4. Ở từng điểm: **"Đã tới"**, rồi từng khách **"Đã đón"** / **"Vắng"** / **"Khách đã huỷ"**; ở điểm trả **"Đã trả"**.
5. Hết khách → **"Kết thúc chuyến"** (nút bấm được khi đã trả hết khách). Không chạy tiếp được → **"Kết thúc gián đoạn"**, chọn lý do; màn báo "Văn phòng đã nhận báo."
6. Tên, năm sinh khách và dòng "Liên hệ" (bấm gọi được) **chỉ hiện trong ngày chạy**; ngày khác màn ghi "Khách 1", "Khách 2"… Bấm Xuất bến sớm từ tối hôm trước cũng không mở tên trước 0 giờ ngày chạy.
7. Mất mạng: dòng "Chưa gửi được" — **phải tự bấm lại** khi có mạng (máy không tự gửi lại); đóng app trước khi bấm lại thì thao tác mất, gọi văn phòng bấm thay.
8. Trang chủ của tài xế và trang Tôi có **"Giấy tờ của tôi"** (số bị che).

### 3.6 Tài xế đối tác (bản 1.38)

- Đăng nhập được, xem **"Giấy tờ của tôi"**. Trang chủ ghi "Cuốc xe của bạn sẽ hiện ở đây".
- **Chưa** thấy chuyến, đơn, giá hay tin nội bộ; chưa bấm tiến độ. Văn phòng vẫn chọn được tài xế nhà xe khi tạo chuyến và bấm thay tiến độ cho họ (theo mã; chưa kiểm trên màn thật).

---

## 4. Checklist sẵn sàng thử tính năng

### (A) Việc phải làm TRƯỚC khi thử / dùng thật

**Dữ liệu**
- [ ] Quản trị nhập **Kiểm định** và **Bảo hiểm trách nhiệm dân sự** (còn hạn) cho **6 xe** đang thiếu (kiểm tra dữ liệu ngày 30/9 đếm 12 giấy thiếu = 6 xe × 2 loại). Thiếu thì xe bị giữ, không xuất bến.
- [ ] Bổ sung **nơi trả** cho **2 chặng** đơn đã xác nhận (kiểm tra 30/9). **Lưu ý:** màn "Sửa đưa đón" đã có từ bản 1.62; dữ liệu các đơn cũ còn thiếu nơi trả.
- [ ] Mỗi tài xế công ty: có tài khoản vai "Tài xế công ty"; hồ sơ người trong Danh bạ có **Giấy phép lái xe có hạng, còn hạn**, hạng đủ chở số chỗ của xe sẽ lái.
- [ ] Mỗi xe: đúng "Số người được chở (không kể tài xế)", trạng thái "Đang dùng".
- [ ] Nhờ người chuyên môn xác nhận bảng hạng bằng ↔ số khách và danh sách giấy tờ xe bắt buộc (hiện chỉ Kiểm định + Bảo hiểm).

**Cài đặt (Toàn quyền)**
- [ ] Mở Vận chuyển › **Chính sách điều phối** bằng tài khoản **Toàn quyền**, xác nhận: mốc tối thiểu 6 giờ, khoảng nghỉ, khai lùi tối đa, "Phải đủ danh sách khách" **bật**. (Giá trị hiện hành trên mạng thật: chưa kiểm.)
- [ ] Mở **Điều kiện xuất bến**: đang áp Kiểm định + Bảo hiểm cho mọi xe.

**Người dùng**
- [ ] **Báo nhân viên quy tắc 6 giờ** (đã có hiệu lực): đơn đón dưới 6 giờ lưu nháp được, xác nhận cần Quản trị / Toàn quyền bấm "Đặt gấp". (Đã báo hay chưa: chưa kiểm.)
- [ ] Nhắc nhân viên: **chưa dùng Bảng điều phối cho chuyến thật**; văn phòng điều xe như cũ.
- [ ] **Chế độ bảo trì đang BẬT tới 13:21 ngày 4/10**: chỉ số điện thoại trong danh sách cho phép vào được app. Người thử phải có trong danh sách, hoặc chủ tắt bảo trì trước.

**Điều kiện chặn dùng thật**
- [x] ~~Có **màn nhập tên khách** (ADR-0047 Phần B — chủ vẽ 5 màn). Chưa có thì mọi chuyến có khách bị giữ "Chưa đủ tên khách".~~ — **đã có từ 1.62** (khối Hành khách ở form đơn và "Sửa danh sách" ở chi tiết đơn).
- [ ] Thử màn tài xế trên **iPhone thật**.
- [ ] (Pháp lý) hỏi luật sư về danh sách hành khách xe hợp đồng; hạng bằng; giờ lái.

### (B) Kịch bản thử tay

**Nên thử ở đâu**
- **Khuyến nghị:** thử trên **dữ liệu tạm**, không phải dữ liệu thật. App không có nút xoá đơn hay xoá chuyến: đơn thử chỉ "Huỷ đơn", chuyến thử chỉ "Huỷ chuyến" — chúng **còn lại mãi** trong danh sách và nhật ký, và dùng hết số mã đơn / mã chuyến.
- Cách có sẵn: `node scripts/dev-iphone.mjs` (người kỹ thuật chạy) dựng một cơ sở dữ liệu **tạm**, mất khi tắt, không đụng dữ liệu thật; mở được trên iPhone cùng Wi-Fi (`docs/PWA-IPHONE.md`). **Giới hạn:** nó chỉ tạo hai tài khoản (Bán hàng + Quản trị, và Bán hàng) — **không có Toàn quyền, không có tài xế**; danh mục dịch vụ có nạp được khi không có mạng hay không: chưa kiểm. Muốn thử đủ (chính sách, tài xế) cần người kỹ thuật thêm tài khoản cho bản tạm này.
- Nếu buộc phải thử trên mạng thật: dùng đơn ghi rõ "THỬ", ngày đón xa, huỷ ngay sau khi thử; không thử Chính sách điều phối bằng cách lưu bản mới (mỗi bản mới có hiệu lực ngay cho mọi người).
- Vì chưa nhập được tên khách, các bước tài xế Xuất bến / Đã đón / Kết thúc và "thấy tên khách" **không làm được qua màn hình hôm nay** — chỉ làm được sau Phần B, hoặc trên dữ liệu tạm do người kỹ thuật dựng sẵn tên khách (các kịch bản kiểm tự động đã làm cách này).

**Nhóm 1 — thử được ngay**

Dùng **hai đơn**: đơn A có giờ đón cách bây giờ khoảng 3 giờ (chỉ cho bước 1–5 và 13); đơn B có giờ đón **xa hơn 6 giờ** (ví dụ ngày mai) cho bước 7–12 và 15 — nếu dùng đơn A cho các bước này, chuyến nằm trong vùng khoá 6 giờ và Bán hàng bị chặn rút / chuyển. Đơn phải có giờ đón (chặng chưa có giờ thì không xếp được).

| # | Bước | Kết quả mong đợi |
|---|---|---|
| 1 | Bán hàng lập đơn, giờ đón cách bây giờ khoảng 3 giờ, lưu nháp | Lưu được; thẻ dịch vụ có dải cảnh báo dưới mốc |
| 2 | Mở đơn đó bằng Bán hàng | Nút "Xác nhận đơn" khoá, dòng "Cần Quản trị duyệt đặt gấp"; không có nút "Đặt gấp" |
| 3 | Quản trị mở đơn → "Đặt gấp" → chọn lý do → "Duyệt đặt gấp" | Hiện nhãn "Đặt gấp — lý do — người duyệt"; báo "Đã duyệt đặt gấp: …" |
| 4 | Bán hàng bấm "Xác nhận đơn" | Xác nhận được |
| 5 | Mở đơn bằng tài khoản Đối tác / Hướng dẫn viên (nếu xem được đơn đó) | Chỉ thấy "Đặt gấp — Quản trị đã duyệt", không thấy lý do, người duyệt |
| 6 | Toàn quyền mở Chính sách điều phối (chỉ xem, không lưu) | Thấy các con số và "Lịch sử bản"; Quản trị mở thẳng trang này thì bị từ chối ("Chỉ Toàn quyền xem và đổi được…") |
| 7 | Điều phối xe → "+ Chuyến mới" (xe, tài xế, giờ) → "Lưu chuyến"; xếp chặng của đơn đã xác nhận vào chuyến | Chuyến hiện trên dòng thời gian; khách rời cột "Chưa xếp" |
| 8 | Mở chuyến đó | "Điều kiện xuất bến" có dòng "Đủ tên khách: Chưa đạt" (chưa có tên) và, với đơn lập từ 1.38, "Điểm khớp đơn: Chưa đạt" ("Chặng chưa có nơi trả") — chuyến bị **giữ**, ai xử lý: Văn phòng |
| 9 | Chuyến dùng một xe thiếu Bảo hiểm | Dòng "Giấy tờ xe: Chưa đạt", ai xử lý: Quản trị; không xuất bến được |
| 10 | Sửa nơi đón của đơn đã xếp (bằng "Sửa thông tin chuyến" trên trang đơn) | Chuyến bị giữ "Nơi đón / trả đã đổi sau khi xếp — cập nhật điểm"; bấm "Cập nhật điểm theo đơn" → hết lý do đó, điểm dừng khớp đơn |
| 11 | Sửa giờ đón của đơn đã xếp | Cột "Cần xử lý" hiện "Giờ hẹn đón đổi …"; bấm "Đã gọi báo" → mục chuyển thành "đã gọi báo khách (tên, giờ)"; "Bỏ đánh dấu" đưa về lại |
| 12 | "Rút khỏi xe" một nhóm khách; rồi xếp lại và "Chuyển sang xe khác" | Khách về "Chưa xếp" / sang chuyến kia |
| 13 | Bán hàng thao tác trên chuyến còn dưới 6 giờ tới giờ xuất bến | Bị chặn với câu "cần Quản trị phá lệ"; Quản trị làm được bằng "Phá lệ và …" kèm lý do |
| 14 | Kế toán mở Điều phối xe | Chỉ xem ("Chỉ xem — Kế toán không xếp xe, không phá lệ.") |
| 15 | "Huỷ chuyến" thử (chọn lý do) | Khách về "Chưa xếp"; chuyến vẫn xem được trong nhật ký |

**Nhóm 2 — chỉ làm được sau Phần B, hoặc trên dữ liệu tạm có sẵn tên khách**

| # | Bước | Kết quả mong đợi |
|---|---|---|
| 16 | Tài xế trên **iPhone thật** mở app | Vào "Cuốc của tôi", thấy chuyến hôm nay và ngày mai |
| 17 | Mở chuyến **hôm nay** | Thấy tên, năm sinh khách và dòng "Liên hệ" (bấm gọi được) |
| 18 | Mở chuyến **ngày mai** | Chỉ "Khách 1", "Khách 2"…, không tên, không số liên hệ |
| 19 | Tối hôm trước bấm "Xuất bến" cho chuyến ngày mai (nếu đủ điều kiện) | Vẫn không hiện tên cho tới 0 giờ ngày chạy |
| 20 | Chuyến hôm nay: "Xuất bến" → "Đã tới" → "Đã đón" → "Đã trả" → "Kết thúc chuyến" | Mỗi bước ghi giờ máy chủ; văn phòng thấy tiến độ ở chi tiết chuyến |
| 21 | Văn phòng bấm thay "Đã đón", khai "Xảy ra lúc" sớm hơn giờ bấm | Màn chuyến hiện hai giờ kiểu "07:31 · ghi lúc 07:45 — tên" |
| 22 | Tắt mạng điện thoại tài xế rồi bấm "Đã đón" | Dòng "Chưa gửi được"; bật mạng, bấm lại thì ghi được |
| 23 | Thay một khách trong đơn sau khi đã xếp | Chuyến bị giữ "Khách trong xe không còn trong đơn — bấm Cập nhật khách theo đơn"; bấm nút đó → hết giữ |

**Nhóm 3 — chỉ xem, an toàn trên dữ liệu thật**

| # | Bước | Kết quả mong đợi |
|---|---|---|
| 24 | Mở vài **đơn cũ** có giờ đón | Giờ và điểm đón hiện như trước 1.38 |
| 25 | Mở biên nhận (ảnh xác nhận gửi khách) của một đơn đã xác nhận | Giống trước |
| 26 | Hướng dẫn viên xem "Việc của tôi" | Giờ đón như trước |

**Dọn sau khi thử (nếu thử trên dữ liệu thật):** "Huỷ chuyến" mọi chuyến thử, "Huỷ đơn" mọi đơn thử. Không có cách xoá hẳn qua app; không tự ý xoá bằng lệnh vào cơ sở dữ liệu thật (luật dự án cấm). Trên dữ liệu tạm: chỉ cần tắt chương trình.

---

## 5. Lưu ý và giới hạn đã biết

- **Chưa dùng thật.** Chủ quyết 30/9: phát hành nhưng chưa dùng Bảng điều phối cho chuyến thật tới khi có màn nhập tên khách. Nhật ký thay đổi 1.38 trong app đã ghi câu này cho nhân viên.
- **Quy tắc 6 giờ đã chạy** với mọi đơn: không phải chờ Phần B.
- **Quyền xem tên khách:** văn phòng (Bán hàng, Kế toán, Quản trị, Toàn quyền) thấy họ tên + năm sinh ở chi tiết chuyến; tài xế công ty chỉ trong ngày chạy, chỉ chuyến mình lái. Nhật ký chuyến và các thông báo không bao giờ chứa tên, năm sinh, số điện thoại khách.
- **Không in / xuất số điện thoại:** trong phân hệ không có nút in hay xuất danh sách khách ra tệp (theo mã hiện tại; chưa kiểm hết mọi màn). Tài xế chỉ thấy số liên hệ trong ngày chạy và bấm gọi được.
- **Lùi về bản 1.37:** người kiểm độc lập đánh giá **an toàn về dữ liệu** (các thay đổi chỉ thêm, chưa có chuyến), nhưng **chưa thử lùi thật**. Sau khi lùi, thông tin chặng sẽ dần cũ đi vì bản 1.37 chỉ ghi vào chỗ cũ.
- **Tài xế đối tác** chưa dùng app cho chuyến (lượt 3, ADR-0053). Trước khi báo nhà xe, chủ muốn thử một tài khoản tài xế đối tác thật.
- **Pháp lý — hỏi người chuyên môn trước khi chạy thật:** danh sách hành khách của xe hợp đồng (họ tên + năm sinh), hạng bằng lái theo số khách (bảng gieo sẵn chưa ai chuyên môn kiểm), giờ lái tối đa (chưa làm), **ghép khách của nhiều đơn trên một xe hợp đồng** (phải hỏi trước khi chạy chuyến ghép thật).
- **Một số chỗ chưa có trong bản vẽ:** nút "Rút khỏi xe", "Chuyển sang xe khác" do thợ tự đặt theo lời chủ (lần 15: "Làm ngay, thợ tự đặt nút", chủ góp ý sau); nút "Cập nhật khách theo đơn" không có hộp xác nhận — điều phối tự chốt, đổi lại được.
- **Câu hỏi còn mở cho chủ:**
  - Khi nào vẽ 5 màn Phần B (chặn dùng thật) và các màn lượt sau (V4, V8–V11, V12, V14, V15).
  - Xác nhận bộ ca mẫu xe A/B trước lượt 2.
  - Có bắt buộc thêm giấy tờ xe nào ngoài Kiểm định + Bảo hiểm (chờ người chuyên môn).
  - Tắt chế độ bảo trì lúc nào để nhân viên thử.

---

## 6. Nguồn (cho người kỹ thuật)

- **Menu, trang:** bảng mục `src/shared/muc-giao-dien.ts` (`TRANG` — điều kiện `vehicle.manage` / `trip.view` / `settings.ops` / `admin.manage`, chốt chặn `moTrang` của "Cuốc của tôi"; `THANH_BEN` mục cha "Vận chuyển"; `TRANG_TOI` nhóm VẬN CHUYỂN ở trang Tôi — `web/shell.ts`, `web/account.ts` chỉ vẽ), `src/shared/start-page.ts` (`TRANG_CUOC`, `coCuocCuaToi`, `chiTaiXe`), `src/shared/dieu-phoi-man.ts` (`thayDieuPhoiXe`), `src/shared/sw-policy.ts` (`PAGES`).
- **Quyền:** `src/shared/permissions.ts` — cột theo thứ tự SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER; ô `vehicle.manage:131`, `trip.view:136`, `trip.dispatch:137`, `trip.override:138`, `trip.progress:142`, `trip.call_ack:146`, `order.leg.short_notice:81`, `order.leg.short_notice.view:85`, `order.passenger.write:86`, `settings.ops:109`, `admin.manage:100`. Route: `src/modules/van-chuyen/index.ts` (chính sách / điều kiện / hạng bằng: `settings.ops` → "chỉ Toàn quyền", `:473-551`; lý do, loại giấy tờ xe: `admin.manage`; xe: `vehicle.manage`; lịch, chuyến: `trip.*`); đặt gấp `src/modules/orders/index.ts:702`; hành khách `:731`, `:744` (chưa màn nào gọi).
- **Lý do giữ:** `src/shared/ly-do-giu.ts` (`MA_GIU`); nhóm bảy dòng điều kiện `src/shared/dieu-phoi-man.ts` (`NHOM_DIEU_KIEN`); "trong ngày chạy" `src/shared/dieu-phoi-kiem.ts` (`trongNgayChay`).
- **Giá trị gieo:** `migrations/0041_chinh_sach_dieu_phoi.sql` (chính sách 360/120/30 phút, `require_manifest` 1, `require_contract` 0, khai lùi 180; điều kiện `INSPECTION`, `TPL_INSURANCE`; bảng hạng bằng); `migrations/0033_van_chuyen_xe.sql`, `0032_giay_to_cua_nguoi.sql` (loại giấy tờ, hạng); `migrations/0038_nha_xe_doi_tac.sql` (vai "Nhà xe đối tác", quan hệ "Tài xế của"); lý do đặt gấp `src/shared/chang-dua-don.ts` (`LY_DO_DAT_GAP`).
- **Chữ trên màn:** `web/dieu-phoi.ts`, `web/chuyen.ts`, `web/chuyen-sua.ts`, `web/dieu-phoi-ui.ts`, `web/tien-do-ui.ts`, `web/cuoc.ts`, `web/cuoc-chuyen.ts`, `web/tai-xe.ts`, `web/chinh-sach-dieu-phoi.ts`, `web/dieu-kien-xuat-ben.ts`, `web/ly-do-dieu-phoi.ts`, `web/dat-gap-ui.ts`, `src/shared/dat-gap-hien-thi.ts`, `src/shared/chinh-sach-hien-thi.ts`, `web/xe*.ts`, `web/order.ts`, `web/order-form.ts`, `web/parties.ts`, `src/shared/roles.ts`.
- **Không màn nào ghi nơi trả:** tìm `dropoff` / `noiTra` trong `web/` chỉ thấy chỗ HIỆN (`web/dieu-phoi.ts:165`, `:431`); `web/trip-fields.ts` chỉ có "Nơi check-in". Chặng mới từ form: `tronChangCu` (`src/shared/chang-dua-don.ts:237`, nơi trả `null`); `0034` chỉ chép `checkin_place` cho dữ liệu cũ. Xếp chặn khi thiếu giờ (`kiemXep`, `src/shared/dieu-phoi-kiem.ts:210`), còn thiếu nơi trả chỉ giữ lúc xuất bến (`:326`).
- **Nhật ký thay đổi:** `src/shared/changelog.ts` mục 1.35–1.38.
- **Trạng thái, quyết định:** `docs/HANDOFF-N1.md` (mục 1.38: Worker d5214617, bảo trì tới 4/10 13:21, audit R-VC-14 = 12, R-ORD-8 = 2); `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` (lời chủ lần 1–25); `docs/superpowers/plans/2026-09-30-van-chuyen-ban-giao-dieu-phoi.md`; `docs/superpowers/plans/2026-09-29-adr-0049-thi-cong-nhat-ky.md` mục 10.39, 10.40; `docs/BACKLOG.md` mục 5–7; ADR-0040, 0047–0057 (`docs/adr/README.md`).
- **Kịch bản thử tay gốc:** kế hoạch ADR-0049 `docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md` mục 9 bước 8; kế hoạch ADR-0047 `docs/superpowers/plans/2026-09-29-adr-0047-thi-cong.md` mục 10 bước 7. Kịch bản Chrome tự động (dựng tên khách qua API trên D1 tạm): `docs/evidence/2026-09-29-adr-0049/kich-ban/` (`cuoc-smoke.mjs`, `dat-gap-smoke.mjs`, `dieu-phoi-smoke.mjs`, `chuyen-smoke.mjs`, `cap-nhat-khach-smoke.mjs`, `goi-bao-smoke.mjs`, …).
- **Thử an toàn:** `scripts/dev-iphone.mjs` (D1 tạm, hai tài khoản SALES+ADMIN và SALES), `docs/PWA-IPHONE.md`.
