# Quyết định 28/10/2026: ai dựng bộ "Island Booking System — Design System v2"

Hồ sơ có ngày, bổ sung cho `QUYET-DINH-CONG-1.md`. Sửa lại cách làm bước **7a** của `PROMPT.md` (mục 7) và **bước 2** của `LO-TRINH.md` mục 1. Hai tệp đó giữ nguyên; phiên Chặng 2 đọc tờ này trước.

## Chủ quyết

Chủ dự án (28/10, hỏi qua hộp chọn, trả lời trực tiếp): **chia đôi** việc dựng bộ v2, thay vì "phiên Claude Code làm, không phải Claude Design" như đề bài.

Lý do chủ nêu: Claude Design chuyên về thiết kế hơn, nên diện mạo thành phần giao cho Claude Design. Lý do giữ phần cho Claude Code (AI nêu, chủ đồng ý): hai bộ cũ do Claude Design dựng đã lệch mã đang chạy (PHU-LUC-PHAT-HIEN: bộ hệ thống thiết kế lệch bên Claude Design); "sự thật" phải chép từ mã và sau này giữ khớp mã.

## Cách làm mới cho bước 2 (thay bước 2 cũ; cổng 2a giữ nguyên)

| # | Việc | Ai | Sản phẩm |
|---|---|---|---|
| 2a | Trích **sự thật từ mã**: bảng màu thương hiệu từ `:root` của `public/app.css`, phông Be Vietnam Pro ở `public/fonts/`, 37 biểu tượng ở `web/icons.ts` (đề bài ghi 24, số đúng theo KIEM-KE là 37), logo; cộng **cấu trúc từ đề cương** `HE-THONG-HOP-NHAT.md`: ba tầng token, từ vựng trạng thái, thang nút ba cấp, danh sách thành phần bắt buộc (mục 7a của PROMPT) và luật dùng. Mỗi giá trị ghi rõ "từ mã" hay "MỚI theo đề cương" | phiên Claude Code | `DAU-VAO-BO-V2.md` (cùng thư mục) |
| 2b | Viết đề bài **số 0** cho Claude Design: dựng bộ "Island Booking System — Design System v2" từ `DAU-VAO-BO-V2.md`, theo khuôn mục 9 của PROMPT (bỏ phần "hiện trạng ảnh" nếu không cần). Điều cấm: không tự đặt màu/phông mới ngoài tờ đầu vào; thiếu thì đánh dấu MỚI kèm lý do; không chế độ tối; không chữ Anh | phiên Claude Code viết, chủ đưa cho Claude Design | `PROMPT-CLAUDE-DESIGN-0-BO-V2.md`; bộ v2 trên Claude |
| 2c | **Kiểm lại bộ** Claude Design trả về: từng giá trị màu/phông/cỡ so với mã (`DAU-VAO-BO-V2.md`), thành phần đủ danh sách bắt buộc, mỗi thành phần có "khi nào dùng"; lệch thì ghi bảng lệch, chủ quyết sửa bộ hay sửa đầu vào | phiên Claude Code (chỉ đọc) | bảng đối chiếu ngắn, kèm vào hồ sơ cổng 2a |
| cổng 2a | Chủ duyệt bộ v2 bằng mắt trên Claude, có bảng đối chiếu 2c bên cạnh | chủ | — |
| 7c (giữ) | Sau đợt thi công 0, chuyển bộ v2 sang **đồng bộ từ mã** (`/design-sync`), mã là nguồn duy nhất | phiên Claude Code | — |

Bước 3 (đổi tên hai bộ cũ) và bước 4 (đề bài số 1 Khung chung) giữ nguyên như `LO-TRINH.md`.

## Điều không đổi

- Bộ v2 vẫn chỉ là tài liệu thiết kế; không kéo React hay thư viện nào vào Nền tảng.
- Mọi thay đổi mã vẫn qua đặc tả → kế hoạch → thi công → kiểm độc lập; đợt 0 vẫn chờ chủ duyệt ADR nhỏ về khung tải (quyết định 3, 27/10).
