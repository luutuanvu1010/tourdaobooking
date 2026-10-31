# Hệ thống hoá quy tắc kinh doanh linh hoạt — tách lõi khỏi phần mở rộng theo cách Oracle

> Ghi chú tư vấn kiến trúc, 30/10/2026. **Chưa phải ADR, chưa được duyệt.**
> Đã đối chiếu: Hiến chương `docs/ARCHITECTURE.md` (Điều 2.2, K9, K10), ADR-0001, ADR-0005, ADR-0117, ADR-0136, ADR-0146 và danh sách bảng trong `migrations/`.

## 1. Vấn đề, nhìn từ chính kho mã

Hiến chương đã có đúng nguyên tắc. Điều 2.2 nói chính sách là *dữ liệu có ngày hiệu lực*, luật tính là *hàm trong mã*, và phép thử là "thêm một giá trị mới mà không phải sửa mã thì đó là dữ liệu".

Cái còn thiếu là **một khuôn chung cho chính sách**. Hiện nay mỗi quy tắc mới được làm thành một bộ riêng: một bảng, một cổng chặn, một ô quyền, một màn hình và một ADR.

- Có **khoảng 20 bảng chính sách, luật, cờ**, mỗi bảng một hình dạng riêng: `ord_service_confirm_flag`, `ord_confirm_policy`, `ord_manual_service_policy`, `ord_pickup_slot_policy`, `ctl_service_transfer_rule`, `prc_role_tier`, `prc_party_tier`, `vc_dispatch_policy`, `vc_departure_rule`, `dsp_refuse_policy`, `aut_session_policy`…
- Có **150 ADR trong khoảng 6 tuần**. Phần lớn ADR mới là *một loại quy tắc mới*, không phải *một khái niệm mới*.
- Hai yêu cầu mới nhất, "không bán cho loại đối tác" và "đóng bán theo ngày", nếu làm theo cách cũ sẽ thêm hai bảng, hai cổng, hai màn hình nữa. Thêm vào đó là bốn câu báo "không đặt được" khác nhau.

Quy tắc kinh doanh không phải quá nhiều. Vấn đề là **mỗi quy tắc được làm như một tính năng**, trong khi phần lớn chúng chỉ là **một câu khác nhau viết bằng cùng một ngữ pháp**.

## 2. Oracle làm thế nào: bảng đối chiếu

Oracle E-Business Suite không viết mã cho từng quy tắc. Họ dựng một số **khung cố định**, và doanh nghiệp tự "điền" quy tắc vào khung đó:

| Khung của Oracle | Nó tách cái gì | Ở Tour Đảo hiện nay |
|---|---|---|
| **TCA** (Party – Role – Relationship) | Con người/tổ chức tách khỏi vai họ đóng | **Đã có** (ADR-0001, Điều 2.1) |
| **Lookups** | Danh sách giá trị là dữ liệu, không phải mã | **Một phần**: loại đối tác là dữ liệu (ADR-0117); nhiều danh sách khác vẫn nằm cứng trong mã |
| **Flexfields** | Thêm thuộc tính cho đối tượng mà không sửa cấu trúc lõi | **Chưa có.** Dịch vụ không có "đặc điểm" (gồm đưa đón, có buffet, cần giấy tờ…) |
| **Qualifiers** (Advanced Pricing) | Điều kiện áp dụng (loại khách, ngày, kênh…) là một danh mục dùng chung | **Chưa có.** Mỗi bảng tự có cột điều kiện riêng |
| **Processing Constraints** (Order Mgmt) | "Không được làm thao tác X khi điều kiện Y" là dữ liệu | **Rải rác**: chặn bán, mốc 6 giờ, nhóm tắt đưa đón — mỗi thứ một cổng riêng |
| **Holds** | Giữ đơn kèm nguồn giữ và cách gỡ | **Có kiểu riêng**: giữ ở bước "Đã giao" khi thiếu mức hoa hồng |
| **Profile Options** | Thiết lập theo tầng Công ty → Vai → Người | **Rải rác**: mỗi công tắc một bảng (`ord_confirm_policy`, `aut_session_policy`…) |
| **AME** (Approvals) | Ai duyệt cái gì là luật dữ liệu | **Từng ca**: cờ "cần xác nhận", người thứ hai duyệt điều chỉnh tiền |
| **Business Events** | Điểm móc để gắn phản ứng mà không sửa lõi | **Có một phần**: Bảng tin, thông báo |

## 3. Đề xuất: "ngữ pháp" của một quy tắc

Mỗi quy tắc kinh doanh được viết thành **một câu có năm phần**:

> **Áp cho** [đối tượng] · **khi** [điều kiện] · **thì** [hiệu ứng] · **trong** [khoảng hiệu lực] · **do** [người đặt, lý do]

| Phần | Gồm những gì (tập đóng, do mã định nghĩa) |
|---|---|
| **Áp cho** | Dịch vụ · Nhóm dịch vụ · *Đặc điểm dịch vụ* (gồm đưa đón, có buffet…) · Toàn bộ danh mục |
| **Khi** (điều kiện) | Loại đối tác của bên đặt · Kênh (văn phòng / đối tác) · Ngày đi · Thời điểm đặt · Số khách · Giờ đón · Khu vực đón… |
| **Thì** (hiệu ứng) | Chặn bán · Cần xác nhận · Giữ đơn · Cảnh báo · Cộng phí · Giảm giá · Mức hoa hồng… |
| **Trong** | Hiệu lực từ – đến (đã có khuôn chỉ thêm dòng) |
| **Do** | Người đặt, lý do, nhật ký |

Hai yêu cầu vừa rồi viết theo ngữ pháp này:

- *Áp cho* đặc điểm "Hòn Tằm không gồm đưa đón" · *khi* loại đối tác của bên đặt ∈ {Lễ tân, Tài xế taxi} · *thì* **Chặn bán** · *từ* 01/11.
- *Áp cho* "Vinwonders kèm buffet" · *khi* ngày đi ∈ 01–03/11 · *thì* **Chặn bán** · *từ* bây giờ + 5 giờ · *do* Bán hàng, lý do "hết suất buffet".
- Cờ "cần xác nhận" hiện có: *áp cho* nhóm Vinpearl · *khi* (mọi đơn) · *thì* **Cần xác nhận**.

**Nguyên tắc then chốt: mã định nghĩa ngữ pháp, dữ liệu viết câu.**

- Quy tắc mới chỉ ghép từ những điều kiện và hiệu ứng *đã có*: thêm **một dòng dữ liệu** trên màn hình. Không cần sửa mã, không cần ADR.
- Cần một *loại điều kiện* hoặc *loại hiệu ứng* mới (hiếm): sửa mã kèm ADR. Đây là lúc đáng để cân nhắc kỹ.

## 4. Ranh giới lõi và phần mở rộng

| | **Lõi** — chỉ đổi bằng mã + ADR | **Mở rộng** — đổi bằng dữ liệu trên màn hình |
|---|---|---|
| Là gì | Vòng đời đơn, các bước chuyển trạng thái; cách tính tiền, sổ công nợ; quyền; bất biến dữ liệu; danh sách điều kiện và hiệu ứng | Từng quy tắc cụ thể; đặc điểm dịch vụ; danh sách giá trị (loại đối tác, lý do…); công tắc thiết lập |
| Tần suất đổi | Hiếm | Hằng tuần, hằng ngày |
| Ai đổi | Lập trình, chủ duyệt | Người nghiệp vụ có quyền, có nhật ký |

Chỗ nối giữa hai bên là các **điểm quyết định** cố định trong lõi: lúc hiện danh mục, lúc lưu nháp, lúc gửi, lúc xác nhận, lúc giao, lúc tính tiền. Tại mỗi điểm, lõi hỏi **một bộ máy chính sách duy nhất**: "với đơn này, ở bước này, có hiệu ứng nào?". Bộ máy trả về danh sách hiệu ứng kèm lý do dễ đọc. Lõi chỉ biết thi hành *hiệu ứng*, không biết *quy tắc* nào sinh ra hiệu ứng đó.

## 5. Rào chắn để không thành "Oracle nặng nề"

1. **Từ vựng đóng, không cho viết công thức tự do.** Người dùng chỉ chọn từ danh sách điều kiện và hiệu ứng, không gõ biểu thức. Đây là khác biệt giữa *bảng chính sách* và *bộ máy luật tự do*. Bộ máy luật tự do là thứ làm Oracle khó dùng và khó kiểm thử.
2. **Chỉ siết theo vai.** Điều kiện về loại đối tác chỉ được dẫn tới *chặn, giữ, cần xác nhận*, không bao giờ *cấp thêm quyền*. Giữ nguyên ADR-0005 và ADR-0018.
3. **Luật xung đột chung cho mọi loại**, viết một lần. Phạm vi cụ thể hơn thắng (dịch vụ > nhóm > đặc điểm > toàn bộ). Ở cùng bậc mà mâu thuẫn thì giữ đơn, không tự đoán (đã dùng ở hoa hồng). Chặn thắng cho phép.
4. **Tiền vẫn là lõi.** Hiệu ứng tiền (phí, giảm giá, hoa hồng) có thứ tự áp cố định trong mã, có ca vàng (`golden/`), và được **chụp** vào đơn lúc xác nhận (K10). Sổ công nợ không bao giờ đọc quy tắc trực tiếp.
5. **Giải thích được.** Mọi lần chặn hoặc giữ đều trả lời được câu "vì quy tắc nào, ai đặt, đến bao giờ". Có thêm **màn thử luật**: nhập một đơn giả, xem những quy tắc nào bắt.
6. **Quyền theo hiệu ứng, không theo bảng.** Ví dụ: "Chặn bán" do Bán hàng, Quản trị, Toàn quyền đặt; "Cần xác nhận" chỉ Toàn quyền; "Mức hoa hồng" do Kế toán, Quản trị, Toàn quyền.

## 6. Lộ trình hợp nhất dần, không đập đi xây lại

| Bước | Việc | Ghi chú |
|---|---|---|
| 0 | ADR "Khung chính sách chung": ngữ pháp, điểm quyết định, luật xung đột, rào chắn | Cửa một chiều về mô hình, cần chủ duyệt |
| 1 | **Nhóm "được bán hay không"**: chặn theo loại đối tác (ADR-0146) + đóng bán theo ngày + ẩn dịch vụ + cần xác nhận | Hai mục đầu **chưa xây** nên đây là lúc rẻ nhất để làm chung |
| 2 | **Đặc điểm dịch vụ** (kiểu flexfield), có thể lấy thêm cột từ Google Sheet | Giải quyết Hòn Tằm "không gồm đưa đón" tự động cho vé mới |
| 3 | Nhóm phí / giảm giá theo điều kiện (phí đón vùng, chiết khấu loại khách) | Chạm tiền: ca vàng trước |
| 4 | Gom các công tắc rời thành thiết lập theo tầng | Thấp rủi ro |
| — | Hoa hồng, sổ công nợ, điều phối xe | **Giữ chuyên biệt.** Đã ổn định, chạm tiền, chuyển sang khung chung không đáng rủi ro |

## 7. Cái giá phải trả (nói thẳng)

- Bước 0–1 chậm hơn làm riêng ADR-0146: thêm một tầng, thêm kiểm thử cho luật xung đột.
- Bộ máy chung là **điểm hỏng chung**: lỗi ở đây ảnh hưởng mọi quy tắc. Cần ca vàng và bài kiểm đủ dày.
- ADR-0146 đã duyệt với thiết kế bảng riêng. Đưa nó vào khung chung là **thay một phần ADR đã duyệt**, cần chủ duyệt ADR mới.
- Lợi ích về sau: phần lớn yêu cầu kiểu "không bán X cho Y vào ngày Z" hay "đơn kiểu này phải xác nhận" thành thao tác trên màn hình trong vài phút, không còn là một đợt thi công.
