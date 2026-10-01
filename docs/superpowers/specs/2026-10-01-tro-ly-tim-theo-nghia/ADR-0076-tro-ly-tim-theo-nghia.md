# ADR-0076 — Trợ lý Hỗ trợ: tìm đoạn hướng dẫn theo nghĩa (embedding OpenAI) trộn với từ khoá

- **Trạng thái:** **proposed** — bản nháp chờ chủ dự án duyệt. Nháp ngoài `docs/adr/` (luật hỏi quyền khi sửa `docs/adr/**`).
- **Ngày:** 2026-10-01. **Số:** 0076 — 0074 (2FA) và 0075 (sổ phiên một máy) đã duyệt ở nhánh đăng nhập.
- **Mốc mã:** `origin/main` = `c62ffc6d`; production đang chạy **1.54** (GET `/api/auth/config`, 2026-10-01) — đã có ADR-0073 (bộ não tuỳ biến).
- **Thuộc gói:** lượt duyệt gồm ADR này + đặc tả `dac-ta.md` cùng thư mục (trang ghép §7 đặc tả). Hai quyết định chạm dữ liệu/tiền ≤ trần 3.
- **Nguồn (lời chủ, chuẩn — không hỏi lại):** ADR-0073 Đ8 để "tìm tài liệu theo nghĩa" sang lượt 2 (chủ chọn "Tìm tài liệu theo nghĩa" trong hộp hỏi 1/10 và đồng ý chia hai lượt). Phiên 2026-10-01, chủ "tiếp tục đi", hộp hỏi gom, nguyên văn lựa chọn:
  - "Dùng dịch vụ nào để tính 'dấu vân nghĩa'?" → **"OpenAI"** (AI khuyến nghị Cloudflare; chủ chọn OpenAI).
  - "Kết hợp với cách tìm từ khoá hiện tại thế nào?" → **"Trộn cả hai"**.
  - "Toàn quyền có cần tự chỉnh cách tìm trong Bảng điều khiển không?" → **"Không, đặt sẵn"**.
- **Sửa / bổ sung:** ADR-0066 điều 3 (trợ lý chỉ đọc hướng dẫn) — **giữ**, chỉ đổi cách chọn đoạn; ADR-0070 điều 6 (ngân sách 6.000 token cho tài liệu) — **giữ**; ADR-0073 Đ7b (kiểm trần trước khi gọi) — **bổ sung**: tính cả tiền tính dấu vân nghĩa.
- **Hiến chương Phần I áp:** tiền INTEGER micro-USD; 5.15 không đổi (lọc số tiền ADR-0073 giữ nguyên); không xoá cứng dữ liệu nghiệp vụ.
- **Xây trên lỗ đang hở:** không có (`docs/quyen-hoan.json` `phat_hien` = `[]`).
- **Loại cửa:** hai chiều cho cách chọn đoạn (tắt được bằng mã, trở về từ khoá); một chiều cho bảng lưu dấu vân nghĩa (migration).

---

## Tóm tắt cho chủ (lời thường)

1. Mỗi đoạn hướng dẫn (214 đoạn hiện nay, cộng các đoạn "Ngữ cảnh bổ sung") được OpenAI đổi thành một **dấu vân nghĩa** — tính **một lần** rồi lưu; đoạn nào đổi chữ thì tính lại đoạn đó.
2. Mỗi câu hỏi: tính dấu vân nghĩa của câu hỏi (đã che SĐT/email như hôm nay), chọn các đoạn **gần nghĩa nhất** và **trộn** với các đoạn khớp từ khoá (tên nút chính xác vẫn tìm đúng), bỏ đoạn quá xa nghĩa.
3. Tiền: rất nhỏ (mỗi câu thêm khoảng vài phần triệu USD), vẫn tính vào trần tháng và hiện trong lượt hỏi.
4. OpenAI lỗi khi tính dấu vân → tự lùi về tìm theo từ khoá như hôm nay, không hỏng câu trả lời.
5. Ô thử hiện **đoạn nào đã được chọn** để Toàn quyền kiểm; không có ô chỉnh cách tìm (đặt sẵn).

## Bối cảnh

- `chonDoan` (`src/shared/tro-ly.ts`) chọn đoạn bằng BM25 không dấu, ngưỡng điểm > 0, tối đa 12 đoạn / 6.000 token. Câu than phiền / câu ít từ khoá khớp yếu nhiều đoạn không liên quan (ví dụ "sao app khó dùng thế" → 12 đoạn).
- Kho = hướng dẫn + kiến trúc lời thường + cấu trúc / sơ đồ trang sinh lúc build (ADR-0070) + "Ngữ cảnh bổ sung" do Toàn quyền sửa lúc chạy. Khoá OpenAI chỉ có ở máy chủ (`wrangler secret`), không có lúc build.

## Quyết định

**Đ1 — Dịch vụ:** OpenAI Embeddings API (`/v1/embeddings`), mẫu là **hằng trong mã** (dự kiến `text-embedding-3-small`, số chiều rút gọn qua tham số `dimensions`, ví dụ 512) — giá + tham số **tra trang OpenAI lúc thi công** (chưa kiểm). Cùng khoá `OPENAI_API_KEY`; không gửi `user` / định danh người hỏi.

**Đ2 — Tính và lưu dấu vân nghĩa của đoạn (máy chủ, lười):** khoá = băm (SHA-256) của nội dung đoạn đã định dạng + mã mẫu + số chiều. Bảng mới `tl_van_nghia` (chỉ-thêm, không sửa / không xoá — dòng cũ không còn dùng thì bỏ mặc): khoá băm, mẫu, số chiều, véc-tơ (BLOB float32), thời điểm. Khi trả lời một câu hỏi, máy chủ tìm các đoạn của kho **chưa có** dấu vân; nếu có thì tính bù **một lô** (một lần gọi) rồi ghi. Lần đầu sau triển khai (hoặc sau khi hướng dẫn đổi) sẽ tính ~214 đoạn trong một lần. Véc-tơ đọc được giữ trong bộ nhớ isolate (theo băm) để không đọc lại D1 mỗi câu.

**Đ3 — Chọn đoạn trộn:** điểm trộn theo thứ hạng (Reciprocal Rank Fusion) của hai danh sách: (a) từ khoá (BM25 như hôm nay), (b) độ giống cô-sin giữa câu hỏi và đoạn. Đoạn có độ giống dưới **ngưỡng đặt sẵn** và không khớp từ khoá thì bỏ. Giữ ngân sách 6.000 token, tối đa 12 đoạn, trọng số theo vai như hôm nay. Câu hỏi dùng cho tìm = câu hỏi hiện tại + câu hỏi lượt trước gần nhất (ADR-0073 N5). Hằng số (ngưỡng, k của RRF) đặt trong mã, có test; **không** có ô chỉnh.

**Đ4 — Lùi về từ khoá:** gọi Embeddings lỗi / quá giờ / không có khoá → dùng kết quả từ khoá như hôm nay; ghi một dòng log chỉ tên sự kiện; câu trả lời vẫn chạy.

**Đ5 — Tiền:** tiền embedding của câu hỏi (và của lô tính bù, nếu có trong lượt đó) cộng vào `chi_phi_micro_usd` của lượt (hỏi hoặc thử). Kiểm trần trước khi gọi (ADR-0073 Đ7b) cộng thêm chi phí tối đa của embedding. Lô tính bù lớn (lần đầu) tính vào lượt đầu tiên gặp nó.

**Đ6 — Hiển thị:** ô thử trả thêm danh sách tên đoạn đã chọn (kèm cờ "khớp nghĩa" / "khớp từ khoá"); khung trò chuyện không đổi.

## Hệ quả

- **Được:** câu hỏi diễn đạt khác chữ trong hướng dẫn vẫn tìm đúng đoạn; câu than phiền không kéo 12 đoạn lạc đề.
- **Mất / rủi ro:** (a) thêm một lần gọi OpenAI mỗi câu (độ trễ + tiền nhỏ); (b) nội dung hướng dẫn được gửi sang OpenAI để tính dấu vân (hướng dẫn không chứa dữ liệu khách — ADR-0066 điều 3; "Ngữ cảnh bổ sung" đã qua bộ lọc chữ không SĐT / email / tiền); (c) lần đầu sau mỗi lần đổi hướng dẫn chậm hơn một chút; (d) bảng `tl_van_nghia` lớn dần theo số lần đổi hướng dẫn (vài trăm dòng / lần, nhỏ).
- **Lệch có tên:** không.

## Phương án đã cân nhắc

1. **Cloudflare Workers AI** (AI khuyến nghị: không thêm dịch vụ ngoài, gần như miễn phí) — chủ chọn OpenAI.
2. **Tính dấu vân lúc build** — build không có khoá OpenAI; "Ngữ cảnh bổ sung" đổi lúc chạy. **Loại**.
3. **Chỉ theo nghĩa** — trượt tên nút chính xác. **Loại** (chủ chọn trộn).
