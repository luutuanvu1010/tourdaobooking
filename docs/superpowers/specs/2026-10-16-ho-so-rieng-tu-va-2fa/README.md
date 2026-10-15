# Hồ sơ đầy đủ, giấy tờ đính kèm, quyền riêng tư, đăng nhập hai lớp — bản suy ra từ luật

> Hồ sơ có ngày (2026-10-16), chỉ tài liệu, chưa có mã. Trạng thái: **đề xuất, chờ chủ duyệt**; đã sửa theo một lượt kiểm độc lập. Đọc tiếp: `SUY-RA.md` (luật → hệ quả, điều mới cho Hiến chương, xung đột) · `PHUONG-AN.md` (kể cả bảng kiểm kê dữ liệu cá nhân §2.8) · `TRANG-GHEP.md` · `DE-XUAT-ADR.md` · `KE-HOACH-SUY-RA.md`.

## Kết luận

Phần đăng nhập hai lớp gần như **đã được chủ duyệt từ 1/10** (ADR-0074) nhưng chưa ai làm xong. Mã đã có sẵn chỗ chờ, còn phần mã, cookie, giao diện thì chưa có. Mã email 6 số, sống 10 phút mà chủ chốt hôm nay trùng đúng bản đã duyệt, và "lần đầu trên thiết bị" chính là "máy chưa được tin 30 ngày". Vì vậy Gói 1 chỉ cần kiểm trước "email có gửi được tới địa chỉ bất kỳ không", rồi thi công theo kế hoạch cũ.

Với phần hồ sơ và quyền riêng tư, luật hiện có trả lời được phần lớn. Phần Hiến chương chưa có điều (yêu cầu xoá, phân loại dữ liệu, tệp đính kèm, lưu giữ) được đề xuất thành **một bộ sáu điều** để chủ duyệt một lần. Riêng phần xoá dữ liệu phải chờ hai thứ: lỗ "chưa từng diễn tập khôi phục" (HC-5.19) được vá hoặc được chủ gia hạn, và luật sư xác nhận thời hạn.

## Hai gói

| Gói | Nội dung | Điều kiện bắt đầu |
|---|---|---|
| **1 — Đăng nhập hai lớp** | Ứng dụng xác thực + mã dự phòng + máy được tin; mã email cho người không giữ Quản trị/Toàn quyền/Kế toán | Bước kiểm gửi email (chạy song song); chủ trả lời Q1 |
| **2 — Hồ sơ, giấy tờ, xác minh, riêng tư** | Tự khai chờ xác minh; giấy tờ tổ chức là dữ liệu; ảnh trên kho R2 riêng; chính sách riêng tư có phiên bản; phiếu yêu cầu xoá | Chủ duyệt bộ sáu điều, rồi hai lượt ADR; chủ tạo kho R2. Phần xoá: **xây trên lỗ đang hở: HC-5.19** — không duyệt trước khi lỗ được vá (diễn tập khôi phục) hoặc chủ gia hạn có ghi lý do (hạn hiện tại 31/10) |

## Đã chốt (áp dụng, không hỏi lại)

| Điều | Nguồn | Áp vào |
|---|---|---|
| Gói 1 trước, Gói 2 sau | chủ, 16/10 | `KE-HOACH-SUY-RA.md` |
| Mã email 6 số, 10 phút, không gửi mật khẩu | chủ, 16/10 (trùng đặc tả 10-01 §3) | Gói 1 |
| Quản trị, Toàn quyền, Kế toán không dùng email làm lớp hai | **ADR-0074 đ7** (đã duyệt 1/10; hôm nay chủ chỉ nhắc giữ) | Gói 1 không ra bản "chỉ email" |
| Yêu cầu xoá: Quản trị xử lý; ảnh xoá khỏi R2; số giấy tờ ẩn danh hoá, không xoá cứng; phần luật bắt giữ giữ lại, ghi trong phiếu | chủ, 16/10 | ADR-H4 nháp; điều đề xuất 5.24 |
| Thời hạn xử lý | chủ nói "30 ngày". Tôi đọc là **"trong thời hạn luật định, không quá 30 ngày"**, vì một bản tóm tắt luật nói Nghị định 356/2025 đặt 20 ngày (30 ngày khi có bên xử lý). Con số cuối cùng **chờ luật sư**, không xây trước | `SUY-RA.md` X13 |

## Ba quyết định mới cần chủ

**Q1. Đối tác (~1000 tài khoản) có bắt buộc đăng nhập hai lớp không?** ADR-0074 đang cho đối tác tự chọn.
- **A (khuyến nghị):** giữ tự chọn ở đợt đầu, xét lại sau khi email chạy ổn hai tuần. Không cần ADR mới, không treo việc vào email chưa kiểm.
- B: bắt buộc qua email, có ân hạn 30 ngày sau khi email chạy ổn. An toàn hơn, nhưng cần ADR mới, tốn thư gửi (chưa tra giá), và đối tác mất hộp thư phải gọi Quản trị.

**Q2. Ai được xác minh giấy tờ?** Luật đã trả lời: ADR-0083 điều 2 (chủ chọn "Chỉ Toàn quyền" ngày 1/10) chỉ cho Toàn quyền xem đủ số, mà so ảnh với số là xem đủ số.
- A: giữ ADR-0083, chỉ Toàn quyền xác minh. Không đổi luật, nhưng khoảng 1000–3000 lượt lần đầu dồn vào một người.
- **B (khuyến nghị):** Quản trị cũng xác minh **qua ảnh**, mỗi lần mở ảnh ghi nhật ký trước; ngoài lúc đó vẫn chỉ thấy số đã che. Phương án này **đảo ADR-0083 điều 2**, cần ADR mới ghi rõ câu bị thay. Tôi khuyến nghị vì gánh việc ~1000 đối tác.
- C: Quản trị thấy số đủ chỉ trong phiếu đang xử lý. Cũng **đảo ADR-0083 điều 2**, nhưng lộ số rộng hơn B.

**Q3. Ảnh giấy tờ giữ bao lâu?**
- A: xoá ảnh ngay sau khi xác minh, chỉ giữ kết quả và số. Ít rủi ro lộ nhất, nhưng lần xác minh lại phải tải ảnh mới.
- **B (khuyến nghị):** giữ khi giấy tờ còn hiệu lực và người đó còn làm việc hoặc hợp tác, rồi đưa vào danh sách xoá 12 tháng sau khi hết. Quản trị bấm xoá, máy không tự xoá.
- C: giữ tới khi có phiếu xoá. Đơn giản nhất nhưng trái nguyên tắc chỉ giữ điều cần.

## Giả định đã ghi (bề mặt, đổi được)

Kho R2 dùng bucket riêng thay vì một thư mục trong bucket chung, vì tệp hồ sơ phải xoá được còn tệp thông báo thì không. Chỉ nhận ảnh JPG/PNG/HEIC và PDF tới 10 MB. Bốn mục đích sử dụng dữ liệu đặt tạm ở `PHUONG-AN.md` §2.5, chủ sửa chữ. Số điều mới (5.20–5.25), số ADR (ADR-G1, ADR-H1…H4) và tên bảng là số và tên giữ chỗ.

## Nói thẳng

Mọi điều pháp lý ở đây **chưa có luật sư hay kế toán xác nhận**. Từ 1/1/2026, Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025 thay Nghị định 13/2023. Tôi mới đọc qua bài viết, chưa đọc bản gốc. Sau khi xoá, dữ liệu vẫn còn trong bản sao lưu của Cloudflare trong một số ngày chưa kiểm. Họ tên trong nhật ký thao tác cũng được giữ lại, vì nhật ký không sửa được. Chữ tự do như ghi chú đơn hay góp ý thì không được rà khi xoá.
