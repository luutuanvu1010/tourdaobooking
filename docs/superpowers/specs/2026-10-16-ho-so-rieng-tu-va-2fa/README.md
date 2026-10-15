# Hồ sơ đầy đủ, giấy tờ đính kèm, quyền riêng tư, đăng nhập hai lớp — bản suy ra từ luật

> Hồ sơ có ngày (2026-10-16), chỉ tài liệu, chưa có mã. Trạng thái: **đề xuất, chờ chủ duyệt**. Đọc tiếp: `SUY-RA.md` (luật → hệ quả, điều mới cho Hiến chương, xung đột) · `PHUONG-AN.md` · `TRANG-GHEP.md` · `DE-XUAT-ADR.md` · `KE-HOACH-SUY-RA.md`.

## Kết luận

Phần đăng nhập hai lớp gần như **đã được chủ duyệt từ 1/10** (ADR-0074) nhưng chưa ai xây. Mã email 6 số, sống 10 phút mà chủ chốt hôm nay trùng đúng bản đã duyệt, và "lần đầu trên thiết bị" chính là "máy chưa được tin 30 ngày". Vì vậy Gói 1 không cần thiết kế lại; chỉ cần làm bước kiểm "email có gửi được tới địa chỉ bất kỳ không" trước, rồi thi công theo kế hoạch cũ. Phần hồ sơ và quyền riêng tư thì luật hiện có trả lời được khoảng hai phần ba: giấy tờ là dữ liệu, che số, xem đủ số có nhật ký, đối tác chỉ thấy của mình, tự khai không được ghi đè thẳng. Phần còn lại, gồm yêu cầu xoá, phân loại dữ liệu, tệp đính kèm và lưu giữ, Hiến chương **chưa có điều**. Tôi đề xuất sáu điều mới để chủ duyệt một lần, sau đó các tính năng sau tự suy ra.

## Hai gói

| Gói | Nội dung | Điều kiện bắt đầu |
|---|---|---|
| **1 — Đăng nhập hai lớp** | Ứng dụng xác thực + mã dự phòng + máy được tin; mã email cho người không giữ Quản trị/Toàn quyền/Kế toán | Bước kiểm gửi email (chạy song song); chủ trả lời Q1 |
| **2 — Hồ sơ, giấy tờ, xác minh, riêng tư** | Tự khai chờ xác minh; giấy tờ tổ chức là dữ liệu; ảnh trên kho R2 riêng; chính sách riêng tư có phiên bản; phiếu yêu cầu xoá | Chủ duyệt sáu điều mới + hai lượt ADR; chủ tạo kho R2 |

## Chủ đã chốt (áp dụng, không hỏi lại)

| Điều | Áp vào |
|---|---|
| Gói 1 trước, Gói 2 sau | `KE-HOACH-SUY-RA.md` |
| Mã email 6 số, 10 phút, không gửi mật khẩu; Quản trị/Toàn quyền/Kế toán không dùng email | khớp ADR-0074 đ7, đặc tả 10-01 §3 |
| Yêu cầu xoá: Quản trị xử lý trong 30 ngày; ảnh xoá khỏi R2; số giấy tờ ẩn danh hoá, không xoá cứng; phần luật bắt giữ giữ lại và ghi trong phiếu | ADR-H4 nháp; Hiến chương đề xuất 5.24 |

## Ba quyết định mới cần chủ

**Q1. Đối tác (~1000 tài khoản) có bắt buộc đăng nhập hai lớp không?** ADR-0074 đang cho đối tác tự chọn.
- **A (khuyến nghị):** giữ tự chọn ở đợt đầu, xét lại sau khi email chạy ổn hai tuần. Không cần ADR mới, không treo việc vào email chưa kiểm.
- B: bắt buộc qua email, có ân hạn 30 ngày sau khi email chạy ổn. An toàn hơn, nhưng cần ADR mới, tốn thư gửi (chưa tra giá), và đối tác mất hộp thư phải gọi Quản trị.

**Q2. Ai được xác minh giấy tờ?** So ảnh với số tức là xem đủ số, mà hôm nay chỉ Toàn quyền được xem đủ số (ADR-0083).
- A: chỉ Toàn quyền. Giữ nguyên luật, nhưng khoảng 1000–3000 lượt xác minh sẽ dồn vào một người.
- **B (khuyến nghị):** Quản trị và Toàn quyền. Quản trị chỉ thấy đủ số trong phiếu đang xử lý, mỗi lần xem có nhật ký, và không xác minh phiếu của chính mình hay của tài khoản cấp trên.
- C: như B, thêm Kế toán cho giấy tờ doanh nghiệp (mã số thuế, giấy phép kinh doanh).

**Q3. Ảnh giấy tờ giữ bao lâu?**
- A: xoá ảnh ngay sau khi xác minh, chỉ giữ kết quả và số. Ít rủi ro lộ nhất, nhưng lần xác minh lại phải tải ảnh mới.
- **B (khuyến nghị):** giữ khi giấy tờ còn hiệu lực và người đó còn làm việc hoặc hợp tác, rồi tự đưa vào danh sách xoá 12 tháng sau khi hết. Quản trị bấm xoá, máy không tự xoá.
- C: giữ tới khi có phiếu xoá. Đơn giản nhất nhưng trái nguyên tắc chỉ giữ điều cần.

## Giả định đã ghi (bề mặt, đổi được)

Kho R2 dùng bucket riêng thay vì một thư mục trong bucket chung, vì tệp hồ sơ phải xoá được còn tệp thông báo thì không. Chỉ nhận ảnh JPG/PNG/HEIC và PDF tới 10 MB. Bốn mục đích sử dụng dữ liệu được đặt tạm ở `PHUONG-AN.md` §2.5, chủ sửa chữ. Số hiệu điều mới (5.20–5.25) và tên bảng là tên tạm.

## Nói thẳng

Mọi điều pháp lý ở đây **chưa có luật sư hay kế toán xác nhận**. Từ 1/1/2026, Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025 thay Nghị định 13/2023 (tôi mới đọc qua bài viết, chưa đọc bản gốc). Tôi không tìm được thời hạn luật định để trả lời yêu cầu xoá, nên 30 ngày là lựa chọn của chủ. Sau khi xoá, dữ liệu vẫn còn trong bản sao lưu của Cloudflare trong một số ngày chưa kiểm. Việc khôi phục dữ liệu cũng chưa từng được diễn tập (mục HC-5.19 trong sổ hoãn).
