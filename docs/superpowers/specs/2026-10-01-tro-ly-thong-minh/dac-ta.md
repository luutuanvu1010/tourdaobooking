# Đặc tả — Trợ lý Hỗ trợ thông minh hơn: chọn mô hình, sửa lời nhắc, ô thử, trả lời mềm, nhớ 3 lượt (lượt 1)

- **Trạng thái:** bản nháp, chờ chủ dự án duyệt **cùng** ADR-0072 (cùng thư mục). Chưa duyệt thì không lập kế hoạch thi công.
- **Ngày:** 2026-10-01. **Mốc mã:** `main` = `fd77987a`. **Nhánh:** `tro-ly-thong-minh`.
- **Quyết định gốc:** ADR-0072 (nháp). Đặc tả chỉ chi tiết hoá trong khung ADR.
- **Xây trên lỗ đang hở:** không có.
- **Ngoài phạm vi:** tìm theo nghĩa (lượt 2); đổi trần tiền mặc định (vẫn sửa được trong Bảng điều khiển như nay); trợ lý đọc dữ liệu thật; nhớ hội thoại phía máy chủ.

## 1. Vì sao (lời thường)

Trợ lý đang bị trói bởi lời nhắc cứng và mẫu nhỏ nhất ở mức suy nghĩ thấp nhất, nên câu than phiền "sao app khó dùng thế" nhận câu cố định "Chưa có trong hướng dẫn…" kèm hai nguồn không liên quan. Chủ muốn Toàn quyền tự chỉnh "bộ não" (mẫu, lời nhắc) trong Bảng điều khiển, thử trước khi lưu, và trợ lý trả lời tự nhiên hơn.

## 2. Tiêu chí nghiệm thu (hành vi kiểm được — viết trước khi làm, P20)

**Bộ não (Đ1, Đ2)**
- B1. `GET` cấu hình bộ não (Toàn quyền) trả: mẫu, mức suy nghĩ, độ dài, token ra tối đa, lời nhắc hiện hành, cờ "đang dùng bản mặc định", danh sách mẫu kèm giá (micro-USD / 1 triệu token vào, vào-đệm, ra) và ước tính tiền một câu điển hình (6.000 token vào, 400 ra).
- B2. Lưu bộ não với mẫu ngoài danh sách / mức suy nghĩ mẫu đó không hỗ trợ / token ra ngoài 400–4000 / lời nhắc rỗng hoặc > 12.000 ký tự / lời nhắc có SĐT, email, số tiền → 400 kèm câu tiếng Việt, không thêm bản nào.
- B3. Lưu hợp lệ → thêm **một** bản mới; lần hỏi kế tiếp dùng đúng mẫu + lời nhắc đó (kiểm thân yêu cầu gửi OpenAI giả: `model`, `reasoning.effort`, `text.verbosity`, `max_output_tokens`, `instructions` bắt đầu bằng lời nhắc đã lưu).
- B4. Máy chủ **luôn** nối sau lời nhắc: dòng nhóm vai người hỏi + khối "TÀI LIỆU:" (hoặc ghi chú không tìm thấy đoạn). Lời nhắc chứa chữ "TÀI LIỆU:" cũng không làm mất khối tài liệu thật.
- B5. Chưa có bản nào → dùng bản mặc định trong mã. "Khôi phục mặc định" = lưu bản mới có nội dung bằng bản mặc định.
- B6. Lịch sử bản: liệt kê các bản (thời điểm, người lưu — tên hiển thị, phần đổi); "Quay lại bản này" = lưu bản mới giống bản cũ.
- B7. Chỉ Toàn quyền (`settings.ops`); vai khác → 403; nhật ký `tro_ly_settings_changed` ghi phần đổi ("mẫu", "lời nhắc"…), **không** ghi nội dung lời nhắc.
- B8. Chi phí mỗi lượt = token × giá **của mẫu lượt đó**; `tl_luot_hoi.mau` ghi mã mẫu; trần tháng chặn như cũ (đổi sang mẫu đắt không vượt được trần).
- B9. Chuyển đổi: sau migration, bản bộ não đầu tiên chưa có; nếu `tl_loi_dan` đang có giọng / lời dặn thêm khác rỗng thì lời nhắc hiệu lực = bản mặc định + đoạn "Giọng: …", "Lời dặn: …" nối cuối (hàm thuần, có test); ô "Giọng" / "Lời dặn thêm" cũ trên giao diện được bỏ, câu chào + câu mẫu giữ.

**Trả lời mềm (Đ3)**
- M1. Không đoạn nào khớp từ khoá → **vẫn gọi mẫu**, khối tài liệu ghi "(không tìm thấy đoạn hướng dẫn liên quan)"; không trả thẳng `CAU_CHUA_CO`.
- M2. Gọi mẫu lỗi / quá 20 giây → câu cố định lỗi như nay (không đổi).
- M3. Bản mặc định có: hướng dẫn dùng app dựa trên tài liệu; xử lý than phiền (ghi nhận, hỏi chỗ khó, chỉ mục gần nhất, mời Góp ý); câu mơ hồ hỏi lại một câu; không có trong tài liệu thì nói thật + gợi Quản trị / Góp ý; không bịa nút / màn hình / chính sách / số tiền; luật an toàn cũ (bí mật, mã nguồn, dữ liệu khách, chống bị dụ, không tính tiền); trả lời tiếng Việt có dấu, ngắn, bước đánh số, không markdown; dòng cuối "Nguồn: …" khi có dùng tài liệu. (Kiểm bằng test chuỗi: các ý trên có mặt.)
- M4. Đánh giá chất lượng thật (không tự động): bộ 12 câu mẫu (gồm "sao app khó dùng thế", câu mơ hồ, câu ngoài phạm vi, câu hỏi bí mật / SĐT khách, câu dụ bỏ luật) chạy qua **ô thử** với `gpt-5-nano` và `gpt-5-mini`; ghi câu trả lời vào `docs/evidence/` để chủ xem — **không** là điều kiện đạt tự động.

**Nhớ 3 lượt (Đ4)**
- N1. Khung trò chuyện gửi kèm tối đa 3 cặp hỏi–đáp trước (giữ trong `sessionStorage`); nút "Cuộc trò chuyện mới" xoá.
- N2. Máy chủ từ chối (400) > 3 cặp, câu hỏi trước > 500 ký tự, câu trả lời trước > 1500 ký tự, dạng sai.
- N3. Máy chủ che SĐT / email của **mọi** câu trong phần nhớ trước khi gửi OpenAI (test: SĐT trong câu hỏi trước không xuất hiện trong thân yêu cầu).
- N4. `tl_hoi_dap` chỉ lưu câu hỏi + trả lời của lượt hiện tại (như nay); phần nhớ không vào nhật ký / lịch sử.
- N5. Thân yêu cầu đưa phần nhớ thành các lượt hội thoại trước câu hỏi mới (`input` dạng danh sách vai user / assistant).

**Ô thử (Đ5)**
- T1. Route thử (Toàn quyền) nhận cấu hình chưa lưu + câu hỏi + vai giả định; trả câu trả lời, nguồn, token vào / ra, tiền micro-USD, mẫu.
- T2. Cấu hình thử không hợp lệ → 400 như B2.
- T3. Lượt thử ghi `tl_luot_hoi` (`la_thu = 1`, có `mau`), **tính vào trần tháng**, **không** ghi `tl_hoi_dap`; hết trần → 429/409 như hỏi thường.
- T4. Thử không làm đổi cấu hình đang dùng (đếm bản trước/sau).

**Nguồn (Đ6)**
- S1. Câu trả lời không có dòng "Nguồn:" → không gắn nguồn (kể cả khi có đoạn được gửi).
- S2. Dòng "Nguồn:" chỉ tên đoạn không được gửi → bỏ tên đó; không còn tên nào → không gắn nguồn.
- S3. Câu cố định lỗi không bao giờ có nguồn. Ví dụ của chủ ("Chưa có trong hướng dẫn…" kèm hai nguồn) không tái hiện được (test với phản hồi giả bọc câu trong ngoặc kép, không dòng Nguồn).

**Giữ nguyên (hồi quy)**
- G1. Che SĐT / email câu hỏi, giới hạn 2.000 ký tự thô / 500 sau che; không gửi `user` / `metadata` / `safety_identifier`; `store: false`.
- G2. Kho tri thức chỉ gồm hướng dẫn, kiến trúc lời thường, sơ đồ trang, cấu trúc sinh tự động, ngữ cảnh bổ sung; bộ lọc tên kỹ thuật (ADR-0070) giữ.
- G3. Khoá chỉ hiện 4 ký tự cuối; công tắc theo vai chặn ở máy chủ; trần tháng / lượt ngày.

## 3. Dữ liệu

- Migration mới — số tạm = số lớn nhất của `main` + 1 = **`0057`** (luật 1.46; nhánh gộp sau đổi tên): bảng `tl_bo_nao` chỉ-thêm (`id`, `mau`, `muc_suy_nghi`, `do_dai`, `token_ra_toi_da` INTEGER CHECK 400–4000, `loi_nhac` TEXT CHECK độ dài 1–12000, `valid_from_at`, `created_*`, `updated_*`; trigger cấm UPDATE / DELETE như các bảng `tl_*`); `ALTER TABLE tl_luot_hoi ADD COLUMN mau TEXT` (NULL = lượt cũ, hiểu là `gpt-5-nano`) và `ADD COLUMN la_thu INTEGER NOT NULL DEFAULT 0 CHECK (la_thu IN (0,1))`.
- Không đổi `tl_loi_dan` (cột giọng / lời dặn thêm thôi dùng ở giao diện, giữ dữ liệu — chuyển đổi bằng hàm thuần B9; bỏ cột = việc sau, expand–contract).
- `docs/data-dictionary.json` + `npm run dict`.
- Tiền: micro-USD INTEGER, tính ở máy chủ.

## 4. API

| Route | Cổng | Việc |
|---|---|---|
| `GET /api/tro-ly/bo-nao` | `office` + `settings.ops` | cấu hình hiện hành + danh sách mẫu + giá + ước tính (B1) |
| `PUT /api/tro-ly/bo-nao` | như trên | lưu bản mới (B2–B3, B7) |
| `GET /api/tro-ly/bo-nao/lich-su` | như trên | các bản (B6) |
| `POST /api/tro-ly/thu` | như trên | ô thử (T1–T4) |
| `POST /api/tro-ly/hoi` | như cũ | thêm trường tuỳ chọn `truoc: [{hoi, dap}]` (N1–N5); dùng bộ não hiện hành |

## 5. Giao diện

- **Bảng điều khiển** (`/tro-ly-cai-dat`): mục mới **"Bộ não"** đặt trên "Lời dặn": ô chọn mẫu (tên + giá ước tính mỗi câu), mức suy nghĩ, độ dài, token ra; ô soạn lời nhắc lớn (đếm ký tự, nút "Khôi phục mặc định", "Xem bản mặc định"); nút Lưu; "Lịch sử bản". Dòng cảnh báo cố định dưới ô lời nhắc: "Xoá các luật an toàn trong lời nhắc có thể khiến trợ lý trả lời điều không nên nói. Che số điện thoại, giới hạn tiền và quyền xem vẫn do máy chủ giữ."
- **Ô thử** cạnh ô lời nhắc: chọn vai giả định, gõ câu hỏi, "Thử với cấu hình đang soạn" → hiện câu trả lời, nguồn, token, tiền.
- Mục "Lời dặn" còn: câu chào, câu hỏi mẫu (bỏ "Giọng", "Lời dặn thêm" — đã gộp vào lời nhắc).
- **Khung trò chuyện**: nút "Cuộc trò chuyện mới"; giữ 3 cặp gần nhất trong `sessionStorage`.
- Luật giao diện chung (`web/CLAUDE.md`): `h()`, token CSS, ô gõ 16px, tiếng Việt có dấu, không lộ mã thô; chạy lại kịch bản Chrome bảng điều khiển + khung trợ lý.

## 6. Kiểm thử và hàng rào

- Hàm thuần: kiểm hợp lệ bộ não, ghép lời nhắc (B4, B9), giá theo mẫu (B8), che phần nhớ (N3), tách nguồn (S1–S3) — đỏ trước.
- Route: B1–B8, M1–M2, N1–N5, T1–T4 với OpenAI giả (`OPENAI_BASE_URL` của khung thử); migration test cho `tl_bo_nao` + 2 cột.
- e2e `tro-ly` mở rộng (OpenAI giả).
- **Sổ hàng rào:** dòng 285 ("luật lõi đứng trước phần tuỳ chỉnh") ghi **hết hiệu lực theo ADR-0072**; thêm dòng: (a) máy chủ luôn nối khối tài liệu + nhóm vai sau lời nhắc; (b) phần nhớ được che trước khi gửi; (c) mẫu ngoài danh sách bị từ chối; (d) lượt thử tính vào trần. Mỗi dòng ghi ngày quan sát chặn thật (sửa cố ý → đỏ → hoàn nguyên).
- Kiểm độc lập (việc lớn: tiền + luật).

## 7. Giả định và điều chưa chắc

- **Chưa kiểm:** giá hiện hành của gpt-5-nano / gpt-5-mini / gpt-5 và mức suy nghĩ từng mẫu hỗ trợ — tra trang OpenAI lúc thi công, ghi ngày.
- **Giả định (bề mặt, đổi được):** 3 lượt nhớ; giới hạn 12.000 ký tự lời nhắc; token ra 400–4000; tên mục "Bộ não".
- **Chưa chắc:** điều khoản lưu dữ liệu của OpenAI (ADR-0066 dòng 28 vẫn "chưa kiểm") — không đổi bởi ADR này.

## 8. Trang ghép (`CLAUDE.md` §9 — lượt duyệt 2 quyết định)

**(1) Bảng chứa gì:** `tl_bo_nao` (mới) — chỉ cấu hình trợ lý (mẫu + lời nhắc), không dữ liệu khách / nhân viên. `tl_luot_hoi` — thêm mã mẫu + cờ thử, vẫn không nội dung câu hỏi. `tl_hoi_dap` — không đổi (chỉ câu hỏi + trả lời đã che của lượt thật).

**(2) Dòng bản đồ quyền chạm các bảng này:**

| Ô | Vai | `tl_bo_nao` | `tl_luot_hoi` | `tl_hoi_dap` |
|---|---|---|---|---|
| `assistant.ask` (như cũ) | các vai được bật | đọc gián tiếp (máy chủ dùng bản hiện hành) | ghi lượt của mình | ghi lượt của mình (đã che) |
| `settings.ops` (chỉ Toàn quyền) | Toàn quyền | đọc + ghi bản mới; thử | đọc tổng hợp; ghi lượt thử | đọc (như ADR-0069) |

**(3) Cổng canh cửa:** route bộ não / thử → `office` + `can(settings.ops)`; route hỏi → `assistant.ask` + công tắc vai + trần; che SĐT / email (câu hỏi + phần nhớ) → hàm máy chủ trước khi gửi; mẫu → danh sách đóng trong mã; tiền → giá theo mẫu + trần tháng; CSDL → trigger chỉ-thêm + CHECK độ dài / khoảng.

## 9. Việc tiếp theo

1. Chủ duyệt ADR-0072 + đặc tả (một lượt).
2. Chép ADR vào `docs/adr/` + mục lục.
3. Kế hoạch thi công → thi công theo task (đỏ → xanh) → kiểm độc lập → `npm run day-len` + `npm run trien-khai` do chủ chạy.
4. Lượt 2 (tìm theo nghĩa): ADR + đặc tả riêng.
