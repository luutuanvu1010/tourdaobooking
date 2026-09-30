# Đề xuất: trợ lý AI hỏi đáp cách dùng app (OpenAI) — BẢN NHÁP, CHƯA DUYỆT

- **Ngày:** 2026-09-30. **Loại:** đề xuất để chủ dự án duyệt thành ADR (đặt ngoài `docs/adr/` cho tới khi duyệt). Chưa thi công gì.
- **Nguồn:** chủ giao 30/9: "gắn thêm 1 mô hình AI như OpenAI hoặc Deepseek để hỗ trợ (từ thực tế Code Base, sơ đồ kiến trúc và tài liệu) để có thể hỏi đáp". Hộp hỏi 30/9: **"Hướng dẫn trước, AI sau"**; nhà cung cấp ưu tiên **"OpenAI"**.
- **Xây trên:** bộ hướng dẫn theo vai (`docs/superpowers/specs/2026-09-30-huong-dan-theo-vai.md`) — phải gộp và chạy thật trước.
- **Chưa kiểm:** giá, tên mẫu (model) và điều khoản dữ liệu hiện hành của OpenAI — phải tra trang chính thức lúc duyệt, không lấy từ trí nhớ.

## 1. Vấn đề

Nhân viên hỏi "làm sao để …" trong lúc làm việc. Hướng dẫn 30 phút giải được phần lớn, nhưng tìm đúng mục vẫn tốn thời gian. Trợ lý AI trả lời bằng lời thường, dẫn đúng bước và đúng tên nút.

## 2. Quyết định đề xuất (mỗi điều chủ gật / sửa riêng)

1. **AI chỉ đọc bộ hướng dẫn + bản mô tả kiến trúc bằng lời thường. KHÔNG đọc mã nguồn, KHÔNG đọc dữ liệu thật** (đơn, khách, tiền, nhật ký). Lý do: kho mã chứa mã Google Sheet và số điện thoại thật (repo private); gửi lên dịch vụ ngoài là đưa dữ liệu công ty ra ngoài. Bộ hướng dẫn đã được luật nội dung canh (không giá, không SĐT, không email — bài `huong-dan.test.ts` A3), nên là thứ an toàn để gửi.
2. **Chỉ trả lời, không làm thay.** AI không bấm nút, không ghi gì (Hiến chương 5.11); không bao giờ nêu hay tính số tiền (5.15) — câu hỏi về tiền của một đơn cụ thể: trả lời "xem ở trang đơn" + tên nút.
3. **Gọi từ máy chủ, không từ trình duyệt.** Route mới `POST /api/tro-ly` (cổng `staff`, ô quyền mới `assistant.ask` trong `permissions.ts`), Worker gọi OpenAI bằng khoá `OPENAI_API_KEY` đặt bằng `wrangler secret put` (chủ tự đặt). Trình duyệt không thấy khoá; không đổi chính sách CSP.
4. **Lọc trước khi gửi:** câu hỏi bị cắt ≤ 500 ký tự; chuỗi giống SĐT / email / số giấy tờ bị thay bằng "[đã che]" trước khi rời máy chủ. Không gửi tên, SĐT, quyền của người hỏi — chỉ gửi **tên nhóm vai** để AI trả lời đúng phần hướng dẫn.
5. **Trần chi phí và công tắc:** giới hạn số câu mỗi người mỗi ngày + trần tổng mỗi tháng (con số chủ đặt); vượt thì trả "Trợ lý tạm nghỉ, xem Hướng dẫn". Toàn quyền tắt được trợ lý bằng một cài đặt (không cần deploy).
6. **Không lưu nội dung hỏi đáp** trong cơ sở dữ liệu; nhật ký chỉ ghi "ai hỏi lúc nào, bao nhiêu chữ" để đếm trần (không ghi câu hỏi — tránh lọt SĐT khách người dùng lỡ gõ, Hiến chương 5.12).
7. **Câu trả lời luôn kèm nguồn:** tên mục hướng dẫn đã dùng; AI không chắc thì nói "không có trong hướng dẫn — hỏi Quản trị", không đoán.

## 3. Câu hỏi cho chủ (gom một lần)

| # | Câu | Khuyến nghị |
|---|---|---|
| Q1 | Ai được dùng trợ lý? | Nhân viên nội bộ trước (Bán hàng, Kế toán, HDV, Quản trị, Tài xế); Đối tác bên ngoài để sau |
| Q2 | Trần mỗi người / ngày và trần tổng / tháng? | 20 câu / người / ngày; trần tháng theo bảng giá lúc duyệt |
| Q3 | Dùng mẫu nào của OpenAI? | Mẫu nhỏ, rẻ, tiếng Việt tốt — IT tra bảng giá hiện hành và đo thử 20 câu hỏi mẫu trước khi chốt |
| Q4 | Có chấp nhận dữ liệu (chỉ câu hỏi đã che + hướng dẫn) xử lý ở máy chủ OpenAI tại Mỹ? | Chấp nhận, vì không có dữ liệu khách / đơn |

## 4. Cách kiểm (khi thi công)

- Bài kiểm: route từ chối khi thiếu quyền; câu có SĐT / email bị che trước khi gửi (bắt bằng giả lập gọi ra ngoài); vượt trần ⇒ câu "tạm nghỉ"; công tắc tắt ⇒ không gọi ra ngoài.
- Bộ 20 câu hỏi mẫu theo vai, người kiểm độc lập chấm "đúng bước, đúng tên nút".
- Trang ghép (CLAUDE.md §9): ô quyền mới `assistant.ask` áp cho vai nào; cổng nào canh (route + trần + công tắc).
