# Hồ sơ đầy đủ, giấy tờ đính kèm, quyền riêng tư, đăng nhập hai lớp — bản suy ra từ luật

> Hồ sơ có ngày (2026-10-16), chỉ tài liệu, chưa có mã. Trạng thái: **đề xuất, chờ chủ duyệt các lượt ADR**. Bản này đã sửa theo một lượt kiểm độc lập và đã ghi ba quyết định chủ chốt ngày 2026-10-16. Đọc tiếp: `SUY-RA.md` (luật → hệ quả, điều mới cho Hiến chương, xung đột) · `PHUONG-AN.md` (kể cả mục "Bắt buộc đối tác" và bảng kiểm kê dữ liệu cá nhân §2.8) · `TRANG-GHEP.md` · `DE-XUAT-ADR.md` · `KE-HOACH-SUY-RA.md`.

## Kết luận

Phần đăng nhập hai lớp đã được chủ duyệt từ 1/10 (ADR-0074) nhưng chưa làm xong. Nay chủ chốt thêm: **đối tác cũng bắt buộc**. Vì vậy cần một ADR mới thay câu "tài khoản ngoài tự chọn", và việc bật cho ~1000 đối tác phải làm **theo đợt**, có công tắc của Toàn quyền để tắt ngay nếu trục trặc.

Phần hồ sơ: **Quản trị và Nhân sự** cùng xác minh giấy tờ. Điều này đảo một quyết định cũ (ADR-0083: chỉ Toàn quyền xem đủ số) và cho Nhân sự quyền nghiệp vụ đầu tiên ngoài việc quản lý tài khoản. Để giữ an toàn, người xác minh chỉ thấy ảnh và số **của phiếu đang chờ**, mỗi lần mở đều có nhật ký. Ảnh giấy tờ chỉ giữ khi giấy tờ còn hiệu lực. Phần xoá dữ liệu vẫn phải chờ lỗ "chưa diễn tập khôi phục" (HC-5.19) được vá hoặc được chủ gia hạn, và chờ luật sư xác nhận thời hạn.

## Hai gói

| Gói | Nội dung | Điều kiện bắt đầu |
|---|---|---|
| **1 — Đăng nhập hai lớp** | Ứng dụng xác thực + mã dự phòng + máy được tin; mã email cho người không giữ Quản trị/Toàn quyền/Kế toán; **bắt buộc cả đối tác**, bật theo đợt | Bước kiểm gửi email (chạy song song); chủ duyệt ADR-G1; đợt đối tác đầu chỉ bật khi email chạy ổn |
| **2 — Hồ sơ, giấy tờ, xác minh, riêng tư** | Tự khai chờ xác minh (Quản trị + Nhân sự); giấy tờ tổ chức là dữ liệu; ảnh trên kho R2 riêng, giữ khi còn hiệu lực; chính sách riêng tư; phiếu yêu cầu xoá | Chủ duyệt bộ sáu điều, rồi hai lượt ADR; chủ tạo kho R2. Phần xoá: **xây trên lỗ đang hở: HC-5.19**, không duyệt trước khi lỗ được vá hoặc chủ gia hạn có lý do (hạn 31/10) |

## Chủ đã chốt 2026-10-16 (áp dụng, không hỏi lại)

| Điều | Áp vào |
|---|---|
| Gói 1 trước, Gói 2 sau | `KE-HOACH-SUY-RA.md` |
| Mã email 6 số, 10 phút, không gửi mật khẩu (trùng đặc tả 10-01 §3) | Gói 1 |
| Quản trị, Toàn quyền, Kế toán không dùng email làm lớp hai — đây là **ADR-0074 đ7** đã duyệt 1/10, hôm nay chủ nhắc giữ | Gói 1 không ra bản "chỉ email" |
| **Đối tác cũng bắt buộc hai lớp**: "yêu cầu an toàn của hệ thống, áp dụng chung, không phân biệt" | ADR-G1 (thay ADR-0074 đ1 phần "ngoài tự chọn", ADR-0085 đ10); `PHUONG-AN.md` "Bắt buộc đối tác" |
| **Quản trị và Nhân sự xác minh giấy tờ** | ADR-H5 (đảo ADR-0083 đ2; thêm hai ô cho Nhân sự, trái ADR-0071 đ1e); `TRANG-GHEP.md` §2 |
| **Ảnh giấy tờ giữ khi giấy tờ còn hiệu lực**; hết hiệu lực thì vào danh sách xoá, Quản trị bấm xoá | điều đề xuất 5.25; ADR-H4 mục 6; `PHUONG-AN.md` §2.5 |
| Yêu cầu xoá: Quản trị xử lý; ảnh xoá khỏi R2; số giấy tờ ẩn danh hoá, không xoá cứng; phần luật bắt giữ giữ lại, ghi trong phiếu | ADR-H4; điều đề xuất 5.24 |
| Thời hạn xử lý: chủ nói "30 ngày". Tôi đọc là **"trong thời hạn luật định, không quá 30 ngày"**, vì một bản tóm tắt luật nói Nghị định 356/2025 đặt 20 ngày. Con số cuối cùng **chờ luật sư** (cần chủ xác nhận cách đọc) | `SUY-RA.md` X13 |

## Câu hỏi mới (phát sinh từ ba quyết định; không trả lời thì áp phương án khuyến nghị)

**M1. Nhân sự xác minh phiếu của những ai?**
- **A (khuyến nghị, đang là giả định):** mọi phiếu, gồm đối tác và khách có tài khoản, trừ tài khoản Nhân sự không quản được (Quản trị, Toàn quyền, Nhân sự khác). Cách này chia được gánh ~1000 đối tác.
- B: chỉ phiếu của nhân viên nội bộ. Nhân sự thấy ít dữ liệu người ngoài hơn, nhưng Quản trị gánh toàn bộ đối tác.

**M2. Đối tác có được dùng Face ID thay lớp hai không?**
- **A (khuyến nghị, đang là giả định):** có, như ADR-0074 đ3 cho mọi người, vì Face ID đã là hai yếu tố (máy + khuôn mặt).
- B: không. Chặt hơn, nhưng làm Face ID vô ích với đối tác và trái lý do kỹ thuật của ADR-0074.

**M3. Ân hạn và cách đưa đối tác vào diện bắt buộc**
- **A (khuyến nghị, đang là giả định):** mỗi đợt có 14 ngày ân hạn như nội bộ. Đợt đầu khoảng 5 cộng tác viên thí điểm (như ADR-0014), sau đó khoảng 100 người mỗi đợt, do Toàn quyền bật.
- B: một lần cho tất cả, 30 ngày ân hạn. Đơn giản hơn, nhưng dễ dồn hàng trăm cuộc gọi hỗ trợ cùng lúc.

## Giả định khác đã ghi (bề mặt, đổi được)

- Hết quan hệ nghĩa là tài khoản ngưng hoặc mọi vai đã đóng; lúc đó ảnh vào danh sách xoá.
- Giấy tờ không ghi ngày hết hạn được giữ tới khi người đó hết quan hệ.
- Phiếu bị từ chối hoặc bị rút thì ảnh của phiếu vào danh sách xoá.
- Kho R2 dùng bucket riêng; chỉ nhận ảnh JPG/PNG/HEIC và PDF tới 10 MB.
- Số điều (5.20–5.25), số ADR (G1, H1–H5) và tên bảng là số và tên giữ chỗ.

## Nói thẳng

Mọi điều pháp lý ở đây **chưa có luật sư hay kế toán xác nhận**. Tôi chỉ đọc bài viết về Luật 91/2025 và Nghị định 356/2025, chưa đọc bản gốc. Sau khi xoá, dữ liệu vẫn còn trong bản sao lưu của Cloudflare trong một số ngày chưa kiểm. Họ tên trong nhật ký thao tác cũng được giữ lại. Chưa ai đếm được bao nhiêu đối tác đã có email trong hồ sơ, nên tải hỗ trợ khi bắt buộc hai lớp mới chỉ là ước tính.
