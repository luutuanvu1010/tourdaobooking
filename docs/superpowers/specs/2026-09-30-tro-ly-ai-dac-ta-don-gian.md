# Trợ lý Hỗ trợ (AI) — đặc tả đơn giản

> Bản lời thường cho chủ dự án đọc và bổ sung ý định. Bản quyết định kỹ thuật: ADR-0066 (`docs/superpowers/specs/2026-09-30-adr-0066-tro-ly-ai-ho-tro.md`, sẽ chuyển vào `docs/adr/`).
> Bản chủ sửa trực tiếp: Google Docs "Đặc tả Trợ lý Hỗ trợ (AI) — bản đơn giản" (https://docs.google.com/document/d/1v0FK0IpmDVPVYgyKIaVHk5NR4_BjVYYSL6W2-YqLM6M/edit) — khi chủ ghi thêm, AI chép lại vào đây rồi mới làm.
> Ngày: 30/9/2026. Trạng thái: bản đầu đã làm xong, chờ phát hành 1.44.

## 1. Để làm gì
Nhân viên và đối tác đang dùng app mà bí thì hỏi ngay trong app, AI trả lời bằng lời thường: bấm nút nào, ở trang nào, vì sao không làm được.

> Ví dụ: "Khách đổi giờ đón sau khi đã xác nhận thì làm sao?" → AI trả lời 3–4 bước, kèm "Nguồn: Bán hàng — Tình huống hay gặp".

## 2. Ai dùng
Mọi người đăng nhập được app: bán hàng, kế toán, hướng dẫn viên, đối tác, tài xế, quản trị, thực tập.

## 3. AI được đọc gì
- Bộ hướng dẫn theo vai (trang Trợ giúp).
- Bản mô tả cách app vận hành, viết lời thường.
- Sơ đồ trang: trang nào, menu nào, nút tên gì — máy tự đọc từ app.

AI **không** đọc: mã nguồn, dữ liệu đơn / khách / tiền, nhật ký, mật khẩu, cấu hình.

## 4. AI không trả lời
Bí mật công ty, mã nguồn, cách hệ thống được xây ("chất xám"), giá tour, số tiền của một đơn cụ thể, thông tin khách. Không có trong tài liệu thì nói: "Chưa có trong hướng dẫn — hỏi Quản trị hoặc gửi Góp ý".

## 5. Giới hạn
- Trần **5 USD mỗi tháng** cho cả công ty; mỗi người **30 câu mỗi ngày**. Hết trần thì trợ lý tạm nghỉ.
- Câu hỏi tối đa 500 chữ. Số điện thoại, email, số giấy tờ trong câu hỏi bị che trước khi gửi đi.
- Không lưu nội dung hỏi đáp; chỉ đếm số câu và chi phí.
- Mẫu AI: gpt-5-nano của OpenAI (loại cơ bản, rẻ nhất).

## 6. Trên màn hình
- Nút **Hỗ trợ** nổi ở góc mọi trang sau khi đăng nhập.
- Khung hỏi đáp tự mở một lần ngay sau khi đăng nhập.
- Dưới mỗi câu trả lời có dòng: "Trả lời do AI, có thể sai — đối chiếu màn hình".
- Tài khoản Toàn quyền: trang Tôi có khối bật / tắt trợ lý và xem chi phí tháng này.

## 7. Chưa làm (để sau)
- Chưa gọi OpenAI thật lần nào — lần hỏi đầu tiên sau khi lên mạng là lần thử thật.
- Chưa lưu lịch sử hỏi đáp để xem lại.
- Chưa có câu hỏi mẫu / gợi ý sẵn trong khung.

## 8. Ý định bổ sung của chủ dự án
_(Ghi thêm bất cứ điều gì muốn trợ lý làm khác đi. Gợi ý:)_
- Câu chào khi khung mở ra:
- Giọng trả lời (thân mật / trang trọng, xưng hô "bạn" / "anh chị"):
- Câu hỏi mẫu muốn hiện sẵn để bấm:
- Chủ đề cấm thêm (ngoài mục 4):
- Muốn tự mở mỗi lần đăng nhập, hay chỉ lần đầu tiên:
- Khác:
