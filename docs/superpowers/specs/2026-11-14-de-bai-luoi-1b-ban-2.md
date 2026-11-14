# Đề bài Claude Design số 1b, bản 2 — lưới bố cục theo nguyên tắc Oracle Redwood (14/11/2026)

Hồ sơ có ngày. Thay bản 30/10 (`docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/PROMPT-CLAUDE-DESIGN-1B-LUOI-BO-CUC.md`, chưa gửi, giữ nguyên làm lịch sử).
Căn cứ: lời chủ 13/11 («Mang phong cách Orcale, không sao chép»; «Công khai»; «Mở lại, nhưng nâng cấp độ lên mức toàn diện hơn») ở mục 8 của
`docs/superpowers/plans/2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md`; số đo 14/11 ở `docs/superpowers/plans/2026-11-14-buoc-2-luoi-bo-cuc.md`.

**Việc của chủ dự án:** chép phần giữa hai dòng gạch, dán vào dự án Claude Design đã có bộ «Island Booking System — Design System v2», đính kèm ảnh ở
`docs/evidence/2026-11-13-kiem-giao-dien/anh/` (các tệp `*-390.jpg`, `*-820.jpg`, `*-1280.jpg`) và sáu tấm ở `docs/evidence/2026-11-14-buoc-2-luoi-bo-cuc/xem-truoc/`.
Bản vẽ về thì đưa lại cho Claude Code đối chiếu với mã. Phần lưới nền (lề, ba mức bề rộng, nhịp) đã làm được ngay trong mã, **không chờ** bản vẽ này; bản vẽ là đầu vào
cho bước 3 (sửa từng họ màn).

## Khác bản 30/10 ở đâu

1. Thêm tham chiếu **nguyên tắc** Oracle Redwood và điều cấm sao chép (lời chủ 13/11).
2. Phạm vi là web **và** ứng dụng trên kho (iPhone, iPad, Android), không chỉ máy tính trước.
3. Bỏ câu «rộng tối đa 1280, căn giữa»: chủ 31/10 đã chọn danh sách và bảng điều khiển dùng hết bề ngang (bản 2.53). Thay bằng ba mức bề rộng đã đo ở bước 2.
4. Bỏ mục từ điển động từ: đã có bảng tham chiếu ngôn ngữ (ADR-0166, ADR-0167). Bỏ các luật đã thi công ở luật khung 30/10 và bước 1 (một tiêu đề mỗi trang, danh
   sách thành bảng, hộp hỏi trong trang).
5. Số đo hiện trạng lấy của 13–14/11, không dùng số 30/10.

---

## 1. Vai và nhiệm vụ

Bạn là nhà thiết kế sản phẩm cao cấp cho phần mềm quản trị doanh nghiệp. Hãy thiết kế **lưới bố cục bên trong vùng nội dung** của Island Booking System cho năm khuôn
trang (Danh sách, Chi tiết, Biểu mẫu, Bảng điều khiển, Thiết lập) ở năm khổ: điện thoại 390, điện thoại xoay ngang 844 × 390, iPad đứng 820, máy tính 1280, màn rộng
1920. Khung chung (thanh trên, thanh bên 248 px từ khổ 900, thanh tab dưới, dải thông báo, bảng trượt, hộp xác nhận) đã duyệt và đang chạy: **không vẽ lại**.

Dùng đúng bộ «Island Booking System — Design System v2» trong dự án này. Không màu mới, không phông mới, không biểu tượng mới.

## 2. Phong cách: Oracle Redwood là tham chiếu nguyên tắc, không sao chép

Lấy **nguyên tắc** của Oracle Redwood: bố cục theo khuôn trang cố định; phân cấp rõ (một việc chính mỗi màn, việc phụ lùi lại); mật độ thông tin vừa phải, nhiều
khoảng thở có chủ ý; nội dung có bề rộng đọc được, không giãn theo màn; hành động đặt cạnh thứ nó tác động; trạng thái luôn có chữ và hình, không chỉ màu.
**Không** chép hình, biểu tượng, phông, màu, tên thành phần hay bố cục cụ thể của Oracle. Người nhìn phải nhận ra Tour Đảo, không nhận ra Oracle.

## 3. Bối cảnh

Nền tảng đặt dịch vụ tour của Công ty TNHH Tour Đảo (Nha Trang). Khoảng 30 nhân viên và tới 1.000 tài khoản đối tác. Kế toán, điều phối ngồi máy tính cả ngày; bán
hàng, tài xế, đối tác dùng điện thoại. Sắp phát hành công khai trên App Store và CH Play, nên bố cục phải đứng được trên iPhone, iPad và điện thoại Android, cả khi
xoay ngang và khi người dùng đặt chữ cỡ lớn.

Chủ dự án chê giao diện «nhìn không được mạch lạc, có những khoảng trống vô lý». Số đo 13–14/11 (112 trang × 7 khổ): iPad đứng dùng nguyên bố cục điện thoại kéo giãn
(một cột 788 px, 888 khối chỉ có nội dung ở một đầu); ở màn 1920 biểu mẫu một cột có ô gõ dài tới 1.600 px; khoảng cách giữa các khối có tám giá trị khác nhau.

## 4. Đã chốt trong mã (vẽ đúng như vậy; muốn khác thì ghi chú riêng, không đưa lên bản vẽ)

- Ba mốc khổ 640 / 900 / 1200. Khổ 641–899 dùng bố cục điện thoại (thanh tab dưới). Thang khoảng cách 4 / 8 / 12 / 16 / 24 / 32 / 48.
- **Lề trang:** 16 ở điện thoại, 24 từ khổ 641 trở lên.
- **Ba mức bề rộng nội dung, mỗi trang đúng một mức:** hẹp 720 (biểu mẫu một cột, trang đọc); vừa 1120 (chi tiết, biểu mẫu hai cột, thiết lập); rộng (danh sách, bảng
  điều khiển: dùng hết vùng nội dung, không để dải trống bên phải).
- **Vị trí:** ở máy tính (có thanh bên) vùng nội dung bám mép trái, sát thanh bên, không căn giữa; khổ chưa có thanh bên thì căn giữa màn.
- **Nhịp giữa các khối:** 16.
- Tên trang chỉ ở thanh trên. Thanh trên tối đa một nút chính toàn cục («Tạo đơn»). Danh sách từ khổ 900 là bảng có cột. Ô gõ chữ 16 px, vùng chạm tối thiểu 44 × 44.
- Trang chủ giữ bản vẽ đã duyệt (điện thoại và máy tính).

## 5. Việc cần bạn quyết bằng bản vẽ

1. **Lưới cột bên trong mỗi mức bề rộng** ở năm khổ: số cột, khe, cách các khối bám cột. Riêng iPad đứng: khi nào hai cột, khi nào một cột — để hết cảnh «điện thoại
   kéo giãn».
2. **Vùng của từng khuôn:** hàng công cụ đầu thân (ô tìm, lọc, nút chính riêng của trang), thân, cột phụ, chân dính; cái gì cố định, cái gì cuộn.
3. **Luật đặt chỗ**, mỗi luật một cặp sai / đúng cắt từ ảnh đính kèm: nút cạnh thứ nó tác động; trạng thái cạnh tên; vùng rỗng không chiếm chỗ; đầu khối không để
   chữ một đầu, số một đầu.
4. **Thang bề rộng ô nhập theo dữ liệu:** ngắn (PIN, số lượng, giờ), vừa (ngày, điện thoại, tiền), dài (họ tên, tên dịch vụ), kín (địa chỉ, ghi chú). Từ khổ 900
   các ô ngắn và vừa xếp cùng hàng theo lưới.
5. **Mật độ:** chiều cao dòng bảng, đệm thẻ, khoảng cách nhãn – ô cho hai chế độ dùng (máy tính ngồi cả ngày, điện thoại một tay), vẫn chỉ lấy số từ thang khoảng cách.
6. **Khi màn thấp hoặc chữ lớn** (xoay ngang, cỡ chữ 200 %): khối nào co, khối nào xuống dòng, thanh dính nào thôi dính.

## 6. Sản phẩm cần giao

Một HTML tương tác, khung vẽ đánh số: **L1** lưới cột và ba mức bề rộng ở năm khổ, vẽ chồng lên khung đã duyệt; **L2** các cặp sai / đúng của luật đặt chỗ; **L3**
thang bề rộng ô và một biểu mẫu mẫu ở 390 / 820 / 1280; **L4** minh hoạ lưới trên năm trang đại diện, mỗi khuôn một trang (Đơn hàng, Chi tiết đơn, Tạo đơn, Trang chủ,
Địa điểm) ở 390, 820, 1280, thêm Đơn hàng ở 1920 và Tạo đơn ở 844 × 390. Kèm bảng «token đã dùng» (tên theo mã) và «token mới đề xuất» có lý do, và 3–5 dòng giải
thích vì sao lưới này làm màn hình mạch lạc hơn.

## 7. Đừng làm

Không vẽ lại khung. Không đổi điều hướng. Không thêm, bớt trường, tính năng hay bước nghiệp vụ. Không đổi chữ nút, nhãn (đã có bảng tham chiếu). Không chế độ tối.
Không chữ Anh trên màn hình. Không dữ liệu thật. Không nút nổi. Không mã chạy được: sản phẩm là bản vẽ để duyệt.

## 8. Thiếu thông tin quan trọng thì hỏi tôi trước khi vẽ, tối đa ba câu.

---

## Bàn giao (đọc cùng bản vẽ, không dán vào Claude Design)

Khi lệch: mục 4 thắng bản vẽ; token thật trong mã thắng số trong bản vẽ; chữ thật của Nền tảng thắng chữ trong bản vẽ. L1–L3 là đầu vào bắt buộc của bước 3; L4 chỉ
là minh hoạ. Mục 4 ghi theo lưới chủ duyệt 15/11 («Duyệt, bám trái») và đã thi công trong mã.
