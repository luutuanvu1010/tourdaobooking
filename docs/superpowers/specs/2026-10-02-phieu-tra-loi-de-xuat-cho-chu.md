# Phiếu trả lời đề xuất cho chủ dự án — bản 4 (2026-10-02)

> **Phiếu này để làm gì:** gom mọi câu còn mở vào **một lần trả lời**. Mỗi câu có đề xuất kèm lý do.
>
> Quyết định chỉ có hiệu lực khi chủ trả lời (Hiến pháp N3).
>
> **Cách trả lời nhanh:** "Đồng ý tất cả đề xuất, trừ: …".

## Đã xong theo lời chủ
- **ADR-0089 (accepted):** đơn huỷ và cọc.
  - Cọc là tiền trả trước; khách huỷ thì mặc định không hoàn.
  - Quản trị duyệt hoàn, Kế toán chi.
  - Hạn 60 ngày chỉ chặn duyệt mới.
  - Công ty huỷ thì hoàn toàn bộ hoặc dời lịch, không thu thêm, và chỉ nhắc.
  - Đại lý cầm cọc thì trừ vào đối soát.
  - Tiền trả trước là nghĩa vụ, hiển thị "Khách hàng đã trả trước".
  - Điều khoản huỷ ngắn in trên ảnh xác nhận.
- **ADR-0090 (accepted):** chỉ Toàn quyền đặt lại PIN, gán quyền và tạo tài khoản Kế toán.
- **Luật mới trong CLAUDE.md:** gọi hệ thống là **"Nền tảng"**, không gọi "App".
- **Bảng 11 trường hợp trách nhiệm** (ADR-0088): đã có lời chủ.

---

## Còn chờ chủ trả lời

### 1. Lớp chống ghi trùng chung của Nền tảng (sẽ thành ADR-0094)
Theo lời chủ "chặn ghi trùng bằng giải pháp kỹ thuật, chứ không phải đi vá", đã tra Cloudflare, Oracle và chuẩn chung của ngành. Tệp: `2026-10-02-lop-chong-ghi-trung-chung-de-xuat.md`.
- **Cloudflare không có sẵn công tắc chống ghi trùng.**
- **Oracle, Stripe và bản nháp chuẩn IETF** dùng chung một cách: mỗi lần bấm mang một **"vé"**. Gửi lại cùng vé thì máy chủ trả kết quả cũ, không ghi lần hai.
- **Đề xuất:** làm **một lớp ở cổng chung**:
  - điện thoại tự gắn vé cho mọi lệnh ghi;
  - máy chủ ghi vé **cùng một lần** với dữ liệu;
  - cả 133 lệnh ghi được bảo vệ, không màn nào phải tự vá.

| Mã | Câu hỏi | Đề xuất | Lý do |
|---|---|---|---|
| **V1** | Giữ vé bao lâu | **Dọn sau 30 ngày**, kèm một ngoại lệ có tên cho luật "không xoá cứng" | Vé là dữ liệu **kỹ thuật**, không phải dữ liệu kinh doanh; giữ mãi thì tốn 0,3–1,1 GB mỗi năm (ước tính) |
| **V2** | Gửi lại thì trả gì | Báo **"đã ghi"** rồi mở trang kết quả; **không** chép dữ liệu khách vào bảng vé | Không để SĐT hay số căn cước nằm trong bảng kỹ thuật |
| **V3** | Bắt buộc ngay hay từ từ | **Từ từ:** bản đầu nhận cả lệnh thiếu vé; khi mọi người đã lên bản mới thì mới bắt buộc | Máy còn bản cũ không bị lỗi bất ngờ |

Hai câu cũ đi kèm, ở lớp **nghiệp vụ** (hai người nhập cùng một việc ngoài đời — lớp vé không bắt được):
- **CT3:** cảnh báo lần thu tiền mặt giống nhau (cùng đơn, số tiền, ngày). **Đề xuất:** có, chỉ cảnh báo.
- **CT4:** người đang ghi được bỏ qua cảnh báo, lý do bắt buộc, có nhật ký. **Đề xuất:** đồng ý.

**Lưu ý hạn:** lỗi gửi lặp (F-02) có hạn **15/10** trong sổ dừng dây chuyền. Lớp chung cần được duyệt sớm. Nếu không kịp, bạn gia hạn kèm lý do.

### 2. Câu về đơn cũ đã hoàn tay (QH5) — giải thích lại
- **Chuyện:** trước ngày 29/9, Nền tảng **chưa có sổ thu tiền**. Nếu hồi đó có khách huỷ và công ty đã **chuyển trả tiền cọc bằng tay** (ngoài Nền tảng), thì Nền tảng không biết việc đã trả.
- **Hậu quả:** khi tính năng mới chạy, những đơn đó sẽ hiện "công ty đang giữ cọc X", tức là **sai sự thật**.
- **Đề xuất:**
  - Nền tảng in danh sách các đơn huỷ còn tiền để Kế toán đối chiếu;
  - đơn nào đã trả tay thì **Toàn quyền ghi bổ sung một dòng "đã hoàn ngoài hệ thống"**, một lần;
  - dòng này **không bị hạn 60 ngày chặn**, vì đó là việc đã xảy ra.
- **Bạn chỉ cần trả lời:** đồng ý hay không.

### 3. Sáu điểm "Đề xuất — chờ chủ" trong ADR-0089
| Mã | Đề xuất |
|---|---|
| **Đ-1** | "Chuyển tiền sang đơn mới" (khi dời lịch hoặc lập lại đơn) tính như một lần chi, nên **cần Quản trị duyệt trước** |
| **Đ-2** | Chỉ **Quản trị, Toàn quyền** được chọn lý do "công ty huỷ", vì lý do này kéo theo hoàn toàn bộ. Lý do "Khác" bắt ghi chú và chờ Quản trị phân loại |
| **Đ-3** | Huỷ để lập lại hoặc trùng đơn: khoản chuyển hay hoàn **không bị hạn 60 ngày chặn**, chỉ nhắc |
| **Đ-4** | Sau "Đã giao" thì nhãn đổi từ "Khách hàng đã trả trước" sang **"Đã thu"**, vì dịch vụ đã bàn giao |
| **Đ-5** | Chỉ bật dòng đường dẫn chính sách trên ảnh xác nhận khi trang `tourdao.vn/chinh-sach-thanh-toan` **mở được**. Ngày 2/10 trang này đang báo lỗi 404 |
| **Đ-6** | Khi khách huỷ, khoản giữ lại không còn là nghĩa vụ hoàn; **thời điểm ghi thành thu nhập do Kế toán chốt** |

### 4. Các lượt sau (chưa gấp)
- **Lượt 2b, sổ tiền:**
  - **Q-A1:** trần phiếu điều chỉnh; người bị đổi số nhận tin báo.
  - **Q-A2:** ô mã giao dịch ngân hàng: chặn trùng trong cùng đơn, cảnh báo khi trùng ở đơn khác.
  - **Đề xuất:** đồng ý cả hai.
- **Lượt 3, PIN tạm và ngoại lệ 6 giờ:** Q-B1, Q-B3–Q-B9 như phiếu bản 3. **Đề xuất:** đồng ý cả.

### 5. Việc ngoài Nền tảng
- Trang `tourdao.vn/chinh-sach-thanh-toan` đang **404**: cần đăng trang trên website.
