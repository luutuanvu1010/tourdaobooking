# ADR-0072 — Trợ lý Hỗ trợ: Toàn quyền chọn mô hình, sửa toàn bộ lời nhắc, thử trước khi lưu; trả lời mềm ngoài hướng dẫn; nhớ vài câu trước

- **Trạng thái:** **proposed** — bản nháp chờ chủ dự án duyệt. Nháp đặt ngoài `docs/adr/` (luật hỏi quyền khi sửa `docs/adr/**`); duyệt xong mới chép vào `docs/adr/` + dòng mục lục.
- **Ngày:** 2026-10-01. **Số:** 0072 (0071 đã dùng cho vai Hành chính nhân sự — commit `10347cce`).
- **Mốc mã:** `main` = `fd77987a` (bản 1.50 + gộp hồ sơ 1.51). **Production đang chạy 1.48** (GET `/api/auth/config` 2026-10-01) — 1.49–1.51 chưa triển khai.
- **Thuộc gói:** một lượt duyệt gồm ADR này + đặc tả `dac-ta.md` cùng thư mục (trang ghép ở §8 đặc tả). Hai quyết định chạm dữ liệu/quyền/tiền ≤ trần 3.
- **Nguồn (lời chủ, chuẩn — không hỏi lại):** phiên 2026-10-01. Chủ dán ví dụ trợ lý trả lời ngây ngô ("sao app khó dùng thế" → "Chưa có trong hướng dẫn — hỏi Quản trị hoặc gửi Góp ý" kèm 2 nguồn không liên quan) và yêu cầu "thông minh và linh hoạt hơn, cho phép Super Admin thêm tuỳ biến, chọn mô hình, System prompt trong Bảng điều khiển". Hộp hỏi gom, nguyên văn lựa chọn:
  - "Toàn quyền được sửa câu dặn dò (system prompt) tới đâu?" → **"Sửa toàn bộ, kể cả luật an toàn"** (AI đã cảnh báo một lần theo P18: lỡ xoá luật an toàn thì trợ lý có thể lộ dữ liệu; chủ vẫn chọn).
  - "Chọn mô hình AI thế nào?" → **"Danh sách có sẵn + giá"**.
  - "Khi câu hỏi không có trong hướng dẫn…" → **"Trả lời mềm, gợi hướng"**.
  - "Làm thêm những gì?" → **"Ô thử trước khi lưu", "Nhớ vài câu trước trong cuộc trò chuyện", "Tìm tài liệu theo nghĩa"**.
  - Chủ đồng ý thiết kế hai lượt ("đồng ý, viết ADR và đặc tả đi"): lượt 1 = ADR này; "tìm theo nghĩa" = lượt 2, ADR riêng.
- **Sửa / thay:** ADR-0066 điều 2 (mẫu là hằng trong mã) — **thay**; ADR-0066 điều 4 (câu "Chưa có trong hướng dẫn" bắt buộc) — **thay một phần** (Đ3); ADR-0069 điều 4 (luật lõi không sửa được, luôn đứng trước) — **thay** (Đ2). Giữ nguyên: ADR-0066 điều 3 (chỉ đọc hướng dẫn, kiến trúc lời thường, sơ đồ trang — không mã nguồn, dữ liệu thật, bí mật), điều 5 (che trước khi gửi, không định danh người hỏi), điều 6 (trần tiền), điều 8 (khoá chỉ qua `wrangler secret`); ADR-0069 điều 2, 3, 5; ADR-0070 toàn bộ.
- **Hiến chương Phần I áp:** Điều 4 (nhật ký chỉ-thêm), luật tiền INTEGER (micro-USD), không xoá cứng.
- **Xây trên lỗ đang hở:** không có (`docs/quyen-hoan.json` `phat_hien` = `[]`, đọc 2026-10-01).
- **Loại cửa:** **hai chiều** cho phần lời nhắc / mẫu (đổi lại được bất cứ lúc nào bằng bản mới); **một chiều** cho bảng / cột mới (migration).

---

## Tóm tắt cho chủ (lời thường)

1. **Bảng điều khiển trợ lý** có thêm mục **"Bộ não"**: chọn mô hình (gpt-5-nano rẻ nhất, gpt-5-mini, gpt-5 khôn nhất) kèm giá ước tính mỗi câu; chọn mức suy nghĩ và độ dài trả lời; **sửa toàn bộ lời nhắc** (có bản mặc định mới, nút "Khôi phục mặc định", lịch sử bản và quay lại bản cũ).
2. **Ô thử**: gõ một câu hỏi, xem trợ lý trả lời theo cấu hình đang sửa (chưa lưu), thấy cả tiền của lần thử. Lần thử tính vào trần tháng.
3. **Lời nhắc mặc định mới** khôn hơn: than phiền thì ghi nhận và gợi hướng, câu mơ hồ thì hỏi lại, không có trong hướng dẫn thì nói thật và chỉ chỗ gần nhất / mời Góp ý — vẫn không bịa tính năng.
4. **Nhớ 3 lượt hỏi đáp gần nhất** trong cùng một khung trò chuyện (chỉ trên máy người dùng, mất khi đóng tab); máy chủ che SĐT / email của cả phần nhớ trước khi gửi.
5. **Lớp bảo vệ trong mã máy chủ không đổi**, kể cả khi lời nhắc bị sửa: che SĐT / email câu hỏi, không gửi tên / id người hỏi, trợ lý chỉ được đọc hướng dẫn (không dữ liệu thật), lọc tên kỹ thuật, trần tiền tháng + lượt ngày, khoá chỉ hiện 4 ký tự.

---

## Bối cảnh

- Lời nhắc (`dungLoiNhac`, `src/shared/tro-ly.ts`) là hằng trong mã: "Việc DUY NHẤT … dựa HOÀN TOÀN vào TÀI LIỆU", luật 1 bắt trả đúng câu `CAU_CHUA_CO` khi tài liệu không có câu trả lời. Không có chỗ cho than phiền / câu mơ hồ / câu ngoài tài liệu.
- Mẫu `gpt-5-nano`, `reasoning.effort: "minimal"`, `verbosity: "low"`, 1200 token ra — hằng trong mã (`MAU_AI`, `MUC_SUY_LUAN`, `TOKEN_RA_TOI_DA`), giá cứng một bộ.
- Tìm đoạn bằng từ khoá (BM25 không dấu), ngưỡng > 0; không đoạn nào khớp thì máy chủ trả thẳng `CAU_CHUA_CO`, không gọi mẫu (`src/modules/tro-ly/index.ts`).
- Lỗi: câu "Chưa có…" vẫn kèm "Nguồn:" khi mẫu bọc câu trong ngoặc kép hoặc thêm câu dẫn (kiểm tiền tố mong manh trong `tachNguon`).
- Bảng điều khiển (ADR-0069) đã có: bật/tắt, trần, công tắc theo vai, câu chào / giọng / lời dặn thêm / câu mẫu, ngữ cảnh bổ sung, lịch sử hỏi đáp đã che — ô quyền `settings.ops` (chỉ Toàn quyền).

## Quyết định

**Đ1 — Mô hình chọn từ danh sách đóng.** Danh sách mẫu là **hằng trong mã** (`DANH_SACH_MAU`: mã mẫu, tên hiển thị, giá micro-USD / 1 triệu token vào, vào-đệm, ra; mức suy nghĩ hợp lệ). Lần đầu: `gpt-5-nano`, `gpt-5-mini`, `gpt-5`. Giá lấy từ trang giá OpenAI lúc thi công (**chưa kiểm** — ghi ngày tra trong mã). Thêm mẫu mới = sửa danh sách + test (không cần ADR mới nếu cùng họ API Responses). Toàn quyền chọn: mẫu, mức suy nghĩ (`minimal` / `low` / `medium` / `high` — chỉ các mức mẫu đó hỗ trợ), độ dài (`low` / `medium` / `high`), token ra tối đa (kẹp 400–4000). Máy chủ chỉ nhận giá trị trong danh sách (400 nếu lạ). Chi phí mỗi lượt tính theo **giá của mẫu đã dùng cho lượt đó**; `tl_luot_hoi` ghi thêm mã mẫu. Trần tháng (ADR-0066 điều 6) giữ nguyên cơ chế.

**Đ2 — Toàn quyền sửa toàn bộ lời nhắc.** Thay ADR-0069 điều 4: không còn "luật lõi không sửa được". Lời nhắc = **một văn bản** do Toàn quyền sửa (giới hạn 12.000 ký tự, qua bộ lọc `viPhamChu` — không SĐT, email, số tiền). Có **bản mặc định** trong mã (Đ3) dùng khi chưa có bản nào và cho nút "Khôi phục mặc định". Máy chủ **luôn tự nối sau** lời nhắc: nhóm vai người hỏi (chỉ tên nhóm) và khối TÀI LIỆU các đoạn tìm được — Toàn quyền không phải (và không thể) tự chèn tài liệu. Mỗi lần lưu là bản mới chỉ-thêm, xem lịch sử, quay lại bản cũ (như ADR-0069). Các trường "giọng" và "lời dặn thêm" cũ **gộp vào** văn bản lời nhắc (bản mặc định đầu tiên sau triển khai = bản mặc định mới + nối nguyên văn giọng / lời dặn thêm đang có nếu có). Nhật ký `tro_ly_settings_changed` chỉ ghi phần đổi ("lời nhắc", "mẫu"…) — không ghi nội dung.

**Đ3 — Trả lời mềm khi ngoài hướng dẫn (bản mặc định).** Lời nhắc mặc định mới: trợ lý hướng dẫn dùng app dựa trên TÀI LIỆU; được trò chuyện tự nhiên ngắn; câu than phiền → ghi nhận, hỏi app khó ở chỗ nào, chỉ chức năng / mục hướng dẫn gần nhất, mời gửi Góp ý; câu mơ hồ → hỏi lại một câu; không có trong tài liệu → nói rõ "hướng dẫn chưa nói về việc này", gợi hỏi Quản trị / Góp ý; **không bịa** tên nút, màn hình, chính sách, số tiền; kèm sẵn các luật an toàn cũ (từ chối bí mật, mã nguồn, dữ liệu khách, chống bị dụ, không tính tiền) — **Toàn quyền sửa / xoá được** (Đ2). Máy chủ: khi **không đoạn nào khớp** thì **vẫn gọi mẫu** với khối TÀI LIỆU rỗng kèm ghi chú "không tìm thấy đoạn hướng dẫn liên quan" (thay hành vi trả thẳng `CAU_CHUA_CO`). Câu cố định `CAU_CHUA_CO` chỉ còn dùng khi gọi mẫu lỗi / hết hạn giờ.

**Đ4 — Nhớ 3 lượt trước.** Khung trò chuyện giữ tối đa 3 cặp hỏi–đáp gần nhất **trong bộ nhớ trang / `sessionStorage`** (không `localStorage`, không máy chủ). Gửi kèm câu hỏi mới; máy chủ kiểm dạng (≤ 3 cặp, mỗi câu hỏi ≤ 500 ký tự, mỗi câu trả lời ≤ 1500 ký tự), **che SĐT / email từng câu như câu hỏi**, rồi đưa vào `input` dạng các lượt hội thoại trước. Lịch sử hỏi đáp (`tl_hoi_dap`) vẫn chỉ lưu câu hỏi + câu trả lời của lượt hiện tại (đã che). Nút "Cuộc trò chuyện mới" xoá phần nhớ.

**Đ5 — Ô thử trong Bảng điều khiển.** Route mới chỉ Toàn quyền (`settings.ops`): nhận cấu hình **chưa lưu** (mẫu, mức suy nghĩ, độ dài, token ra, lời nhắc) + một câu hỏi + vai giả định để thử; chạy đúng đường ống thật (che, tìm đoạn, gọi mẫu); trả câu trả lời, nguồn, số token và tiền. Lượt thử **tính vào trần tháng**, ghi `tl_luot_hoi` với cờ thử; **không** ghi `tl_hoi_dap`. Cấu hình thử qua cùng bộ kiểm hợp lệ như khi lưu.

**Đ6 — Nguồn đáng tin hơn.** Máy chủ chỉ gắn "Nguồn" khi câu trả lời có dòng "Nguồn:" hợp lệ chỉ tới đoạn **đã gửi**; không có dòng đó thì **không** gắn nguồn (bỏ hành vi "lấy đoạn đầu"). Không còn so tiền tố câu cố định.

**Đ7 — Ngoài phạm vi (lượt 2, ADR riêng):** tìm tài liệu theo nghĩa (embeddings) — chi phí, nơi lưu véc-tơ, cách sinh lại khi hướng dẫn đổi.

## Hệ quả

- **Được:** trợ lý trả lời tự nhiên hơn; Toàn quyền chỉnh nhanh không cần sửa mã / triển khai; thử trước khi áp dụng; chi phí theo mẫu minh bạch.
- **Mất / rủi ro:** (a) lời nhắc có thể bị sửa làm trợ lý trả lời sai / lộ ý (chủ chấp nhận) — lưới còn lại là các lớp trong mã máy chủ (Đ tóm tắt 5) và lịch sử bản để quay lại; (b) mẫu đắt (gpt-5) + mức suy nghĩ cao làm tiền tăng nhanh — trần tháng chặn; Bảng điều khiển hiện giá ước tính; (c) không còn trả thẳng câu cố định khi không khớp ⇒ mỗi câu đều gọi mẫu (tốn hơn một chút); (d) dòng sổ hàng rào 285 ("luật lõi đứng trước phần tuỳ chỉnh") hết hiệu lực — thay bằng hàng rào mới (đặc tả §6).
- **Lệch có tên:** không.

## Câu thay

- ADR-0066 điều 2: "Mẫu: gpt-5-nano … Tên mẫu là hằng trong mã (đổi = một dòng + test)" → **thay bằng Đ1**.
- ADR-0066 điều 4 (phần "trả lời đúng một câu 'Chưa có trong hướng dẫn…'") → **thay bằng Đ3**; phạm vi "chỉ đọc hướng dẫn" của điều 3 giữ nguyên.
- ADR-0069 điều 4: "**Không sửa được** phần luật lõi … luật lõi luôn đứng TRƯỚC và thắng phần tuỳ chỉnh" → **thay bằng Đ2**. Phần còn lại của điều 4 (câu chào, câu mẫu, ngữ cảnh bổ sung, bộ lọc chữ, bản chỉ-thêm, quay lại bản cũ) giữ nguyên.

## Phương án đã cân nhắc

1. **Giữ luật an toàn khoá, chỉ mở phần còn lại** — AI khuyến nghị; chủ chọn khác (Đ2).
2. **Gõ tên mẫu tự do** — không tính được tiền / chặn trần chính xác; gõ sai làm trợ lý ngừng. **Loại** (chủ chọn danh sách).
3. **Giữ trả thẳng câu cố định khi không khớp từ khoá** — chính là nguyên nhân câu ngây ngô của ví dụ. **Loại**.
