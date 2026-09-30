# ADR-0069: Bảng điều khiển trợ lý Hỗ trợ cho Toàn quyền

- **Trạng thái:** accepted — chủ dự án duyệt 2026-09-30 (hộp hỏi, nguyên văn lựa chọn: "Xem trạng thái + thử key (Recommended)", "Lưu đã che, chỉ Toàn quyền xem (Recommended)", "Bật/tắt theo từng vai (Recommended)", "Thêm lời dặn + ngữ cảnh, giữ luật lõi (Recommended)"; chat: "đưa tuỳ chọn trợ lý AI này vào trong bảng điều khiển của riêng SuperAdmin … quản lý key, bật tắt áp dụng cho nhóm nào, tuỳ chỉnh prompt, đưa ngữ cảnh, quản lý lịch sử").
- **Sửa / bổ sung:** ADR-0066 điều 1 (ai dùng — nay theo công tắc từng vai), điều 7 (lưu — nay có lưu nội dung đã che), điều 9–10 (khối cài đặt ở trang Tôi → trang riêng). Các điều khác của ADR-0066 giữ nguyên.
- **Đặc tả lời thường:** `docs/superpowers/specs/2026-09-30-bang-dieu-khien-tro-ly-dac-ta.md`.

## Quyết định

1. **Trang riêng** "Trợ lý Hỗ trợ" trong nhóm QUẢN TRỊ, **chỉ Toàn quyền** (ô `settings.ops`; route cổng `office` + `can`). Khối cài đặt ở trang Tôi (ADR-0066) chuyển sang trang này.
2. **Key:** chỉ hiện trạng thái — đã đặt / chưa đặt, 4 ký tự cuối, nút **"Thử key"** (gửi OpenAI một câu cố định ngắn, không dữ liệu công ty; kết quả: được / sai key / hết tiền / lỗi mạng). **Không nhập, không lưu, không hiện đủ key trong app**; đổi key vẫn bằng Cloudflare (`wrangler secret put`) — luật "bí mật chỉ qua secret" (CLAUDE.md §7) giữ nguyên. Lượt thử key ghi vào sổ lượt hỏi (chi phí thật).
3. **Bật / tắt theo vai:** 9 công tắc theo mã quyền (+ công tắc tổng). Tài khoản nhiều quyền được dùng nếu **ít nhất một** quyền đang bật. Máy chủ chặn thật (403 lời thường), nút Hỗ trợ ẩn với tài khoản không được dùng. Mặc định sau migration: bật cả 9 (giữ hành vi 1.44/1.45).
4. **Lời dặn và ngữ cảnh:** Toàn quyền sửa được: câu chào, giọng trả lời, lời dặn thêm, các đoạn ngữ cảnh bổ sung (tiêu đề + nội dung, bật/tắt từng đoạn), câu hỏi mẫu hiện sẵn trong khung. **Không sửa được** phần luật lõi (từ chối bí mật / mã nguồn / tiền / dữ liệu khách, chống bị dụ, không tính tiền) — luật lõi luôn đứng TRƯỚC và thắng phần tuỳ chỉnh. Mọi chữ tuỳ chỉnh qua bộ lọc nội dung (không SĐT, email, số tiền — một nguồn với bài A3) trước khi lưu. Mỗi lần lưu là một **bản mới** (chỉ thêm), xem lịch sử bản và **quay lại bản cũ** (= lưu bản mới giống bản cũ). Đoạn ngữ cảnh đi vào kho tìm đoạn như hướng dẫn (có ngân sách token).
5. **Lịch sử hỏi đáp:** lưu câu hỏi **đã che** (SĐT, email, số giấy tờ), câu trả lời, nguồn, người hỏi, vai, thời điểm, chi phí. **Chỉ Toàn quyền xem** (lọc theo ngày, người, vai; tìm chữ). **Không xoá** (luật không xoá cứng). Khung Hỗ trợ ghi rõ cho người dùng: "Câu hỏi được lưu để cải thiện trợ lý — đừng gõ thông tin khách". Nhật ký kiểm toán không chứa nội dung (Hiến chương 5.12).
6. **Trần và chi phí:** trần tháng / ngày (ADR-0066 điều 6) sửa trên trang này; trang hiện chi phí tháng này, số câu hôm nay, theo vai.
7. **Dữ liệu:** migration **0054**; bảng chỉ-thêm (tiền tố `tl_`), trigger chặn UPDATE / DELETE; `data-dictionary.json` + `npm run dict`. Không cột chứa key.

## Trang ghép (CLAUDE.md §9)
| Bảng | Chứa | Ô quyền | Cổng |
|---|---|---|---|
| `tl_cai_dat` (có sẵn) + bảng mới cấu hình vai / lời dặn / ngữ cảnh (chỉ thêm, bản có hiệu lực) | cấu hình trợ lý | ghi / đọc: `settings.ops` (Toàn quyền) | route trang quản lý (office + can) |
| bảng mới lịch sử hỏi đáp (chỉ thêm) | nội dung hỏi đáp ĐÃ CHE | ghi: route hỏi (`assistant.ask` + công tắc vai); đọc: `settings.ops` | route hỏi (staff + can + vai bật) / route lịch sử (office + can) |
| `tl_luot_hoi` (có sẵn) | đếm, chi phí | như ADR-0066 | như ADR-0066 |

## Hệ quả
- Dữ liệu cá nhân có thể nằm trong câu hỏi (tên khách người dùng lỡ gõ) — chấp nhận, chỉ Toàn quyền đọc, có câu nhắc người dùng.
- Lời dặn tuỳ chỉnh gửi sang OpenAI mỗi câu — tăng token vào; trần chi phí vẫn chặn.
