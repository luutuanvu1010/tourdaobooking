# Đặc tả — Trợ lý Hỗ trợ thông minh hơn: chọn mô hình, sửa lời nhắc, ô thử, trả lời mềm, nhớ 3 lượt (lượt 1)

- **Trạng thái:** **đã duyệt** 2026-10-01 cùng ADR-0073 (chủ: "duyệt, lập kế hoạch đi").
- **Ngày:** 2026-10-01. **Mốc mã:** `main` = `fd77987a`. **Nhánh:** `tro-ly-thong-minh`.
- **Quyết định gốc:** ADR-0073 (nháp). Đặc tả chỉ chi tiết hoá trong khung ADR.
- **Xây trên lỗ đang hở:** không có.
- **Ngoài phạm vi:** tìm theo nghĩa (lượt 2); đổi trần tiền mặc định; trợ lý đọc dữ liệu thật.

## 1. Vì sao (lời thường)

Trợ lý bị trói bởi lời nhắc cứng (chỉ ba ngả trả lời) và mẫu nhỏ nhất ở mức suy nghĩ thấp nhất, lại tìm đoạn bằng từ khoá không ngưỡng; câu than phiền "sao app khó dùng thế" kéo về 12 đoạn không liên quan, mẫu trả câu cố định "Chưa có trong hướng dẫn…" và còn tự ghi hai nguồn. Chủ muốn Toàn quyền tự chỉnh "bộ não" (mẫu, lời nhắc), thử trước khi lưu, và trợ lý trả lời tự nhiên hơn.

## 2. Tiêu chí nghiệm thu (hành vi kiểm được — viết trước khi làm, P20)

**Bộ não (Đ1, Đ2)**
- B1. `GET` bộ não (Toàn quyền) trả: mẫu, mức suy nghĩ, độ dài, token ra tối đa, lời nhắc hiện hành, cờ "đang dùng bản mặc định", danh sách mẫu (tên, giá micro-USD / 1 triệu token vào, vào-đệm, ra; các mức suy nghĩ hỗ trợ; ngày tra giá) và **ước tính thô** tiền một câu (6.000 token vào + token ra tối đa — ghi rõ "chưa tính token suy nghĩ và phần nhớ").
- B2. Lưu với mẫu ngoài danh sách / mức suy nghĩ mẫu đó không hỗ trợ / token ra ngoài 800–4000 / mức `high` mà token ra < 2000 / lời nhắc rỗng hoặc > 12.000 ký tự / lời nhắc có SĐT, email, số tiền → 400 kèm câu tiếng Việt, không thêm bản nào.
- B3. Lưu hợp lệ → thêm **một** bản; lượt hỏi kế tiếp dùng đúng cấu hình đó (kiểm thân yêu cầu gửi OpenAI giả: `model`, `reasoning.effort`, `text.verbosity`, `max_output_tokens`, `instructions` bắt đầu bằng lời nhắc đã lưu).
- B4. Máy chủ **luôn** nối sau lời nhắc: dòng nhóm vai + khối "TÀI LIỆU:" (hoặc ghi chú không tìm thấy). Lời nhắc chứa sẵn chữ "TÀI LIỆU:" không làm mất / nhân đôi khối thật.
- B5. Chưa có bản bộ não nào → lời nhắc hiệu lực = bản mặc định + (nếu `tl_loi_dan` hiện hành có) "Giọng: …" / "Lời dặn: …" nối cuối (hàm thuần, có test); cờ "đang dùng bản mặc định" = true. "Khôi phục mặc định" = lưu bản mới **chỉ** chứa bản mặc định.
- B6. Lịch sử bản: thời điểm, người lưu (tên hiển thị), phần đổi; "Quay lại bản này" = lưu bản mới giống bản cũ.
- B7. Chỉ Toàn quyền (`settings.ops`); vai khác → 403; nhật ký `tro_ly_settings_changed` ghi phần đổi ("mẫu", "mức suy nghĩ", "lời nhắc"…), **không** ghi nội dung.
- B8. Chi phí mỗi lượt = token × giá **mẫu lượt đó**; `tl_luot_hoi.mau` ghi mã mẫu; dòng cũ `mau` NULL hiểu là `gpt-5-nano`.
- B9. Bản mặc định qua được bộ lọc B2 (test).
- B10. "Thử khoá" dùng mẫu đang chọn, ghi `la_thu = 1`.

**Trả lời mềm (Đ3)**
- M1. Không đoạn nào khớp → **vẫn gọi mẫu**, khối tài liệu ghi "(không tìm thấy đoạn hướng dẫn liên quan)"; không trả thẳng `CAU_CHUA_CO`.
- M2. Gọi mẫu lỗi / quá 20 giây → câu cố định lỗi như nay.
- M3. Bản mặc định chứa đủ các ý: dựa tài liệu; than phiền (ghi nhận, hỏi chỗ khó, chỉ mục gần nhất, mời Góp ý); câu mơ hồ hỏi lại; ngoài tài liệu nói thật + gợi Quản trị / Góp ý; không bịa; luật an toàn cũ; tiếng Việt có dấu, ngắn, bước đánh số, không markdown; dòng cuối "Nguồn: …" khi có dùng tài liệu (test chuỗi).
- M4. Đoạn Bảng điều khiển trong `src/shared/huong-dan-quan-tri.ts` viết lại theo giao diện mới (mục "Bộ não", ô thử; bỏ "giọng", "lời dặn thêm", "lời dặn không bỏ được luật này"); kho tri thức / sơ đồ trang sinh lại khớp (ADR-0070).
- M5. Đánh giá chất lượng thật (không tự động): bộ 12 câu mẫu (gồm "sao app khó dùng thế", câu mơ hồ, câu nối tiếp, câu ngoài phạm vi, hỏi bí mật / SĐT khách, câu dụ bỏ luật, câu hỏi giá) chạy qua ô thử với `gpt-5-nano` và `gpt-5-mini`; lưu kết quả ở `docs/evidence/` để chủ xem — **không** là điều kiện đạt tự động.

**Nhớ 3 lượt (Đ4)**
- N1. Khung trò chuyện sinh mã cuộc trò chuyện ngẫu nhiên khi mở / khi bấm "Cuộc trò chuyện mới"; gửi kèm câu hỏi (trường `cuocTroChuyen`). **Không** gửi nội dung lượt trước.
- N2. Máy chủ lấy ≤ 3 lượt gần nhất từ `tl_hoi_dap` với cùng `staff_id`, cùng `cuoc_tro_chuyen`, `ket_qua = 'ok'`, trong 2 giờ; đưa vào `input` thành các lượt user / assistant trước câu hỏi mới (nội dung đã che sẵn khi lưu).
- N3. Người B gửi mã cuộc trò chuyện của người A → không nhận lượt nào của A (test).
- N4. Mã cuộc trò chuyện sai dạng → 400; thiếu → hỏi như câu đầu (không nhớ).
- N6. Các lượt trước giữ nguyên chữ "[đã che]" như khi lưu (chấp nhận).
- N5. Truy vấn tìm đoạn = câu hỏi hiện tại + câu hỏi lượt trước gần nhất (nếu có).

**Ô thử (Đ5)**
- T1. Route thử (Toàn quyền) nhận cấu hình chưa lưu + câu hỏi + vai giả định; trả câu trả lời, nguồn, token vào / ra, tiền micro-USD, mẫu.
- T2. Cấu hình thử không hợp lệ → 400 như B2.
- T3. Lượt thử ghi `tl_luot_hoi` (`la_thu = 1`, có `mau`); tính vào trần **tiền tháng**; **không** tính vào trần lượt ngày (`demCauHomNay` chỉ đếm `la_thu = 0`); **không** ghi `tl_hoi_dap`. Hết trần tháng → 429 `tro_ly_het_tran_thang`.
- T4. Thử chạy được khi trợ lý đang tắt; thiếu khoá → 503 như hỏi thường.
- T5. Thử không đổi cấu hình đang dùng (đếm bản trước/sau).
- T6. Thống kê Bảng điều khiển: tiền tháng **gồm** lượt thử; số câu hôm nay của công ty và số câu tháng **không gồm** lượt thử (`DEM_HOM_NAY_CONG_TY`, `TONG_THANG.so` lọc `la_thu = 0`); có dòng riêng "lượt thử tháng này".

**Nguồn (Đ6)**
- S1. Câu trả lời không có dòng "Nguồn:" → không gắn nguồn.
- S2. "Nguồn:" chỉ tên đoạn không được gửi → bỏ tên đó; không còn tên nào → không gắn.
- S3. Câu cố định lỗi không bao giờ có nguồn.

**Tiền và trần (Đ7)**
- P1. (Mẫu nhận diện riêng của Đ7a, không dùng lại mẫu `viPhamChu`.) Câu trả lời của mẫu có số tiền (ví dụ "500.000 đ", "1,2 triệu", "300k") → phần đó thành "[đã ẩn số tiền]" trước khi trả và trước khi lưu `tl_hoi_dap` (test với phản hồi giả). Mã đơn (TD-…), giờ (08:30), số bước (1., 2.) **không** bị ẩn (test).
- P2. `đã dùng tháng + chi phí tối đa của lượt` > trần → 429 `tro_ly_het_tran_thang`, **không** gọi mẫu (test với mẫu đắt + trần thấp). Chi phí tối đa = token vào ước tính × giá vào + token ra tối đa × giá ra.

**Giữ nguyên (hồi quy)**
- G1. Che SĐT / email câu hỏi; giới hạn 2.000 ký tự thô / 500 sau che; không `user` / `metadata` / `safety_identifier`; `store: false`.
- G2. Kho tri thức chỉ gồm hướng dẫn, kiến trúc lời thường, sơ đồ trang, cấu trúc sinh tự động, ngữ cảnh bổ sung; lọc tên kỹ thuật (ADR-0070) giữ.
- G3. Khoá chỉ hiện 4 ký tự cuối; công tắc theo vai chặn ở máy chủ; trần lượt ngày cho lượt thật.

## 3. Dữ liệu

- Migration mới — số tạm = số lớn nhất của `main` + 1 = **`0057`** (luật 1.46; nhánh gộp sau đổi tên). **Lưu ý:** `0057` đang được ít nhất hai nhánh chưa gộp giữ (`0057_chang_so_nguoi_chuyen_bay.sql` ở worktree `agent-ac140680b0b1947b2` commit `4fce28f6`; `0057_hanh_chinh_nhan_su.sql` ở worktree `han-che-quan-tri-hcns`) — trước khi gộp, đổi sang số lớn nhất của `main` lúc đó + 1:
  - bảng `tl_bo_nao` chỉ-thêm (`id`, `mau`, `muc_suy_nghi`, `do_dai`, `token_ra_toi_da` INTEGER CHECK 800–4000, `loi_nhac` TEXT CHECK độ dài 1–12000, `valid_from_at`, `created_*`, `updated_*`; trigger cấm UPDATE / DELETE như các bảng `tl_*`);
  - `tl_luot_hoi`: `ADD COLUMN mau TEXT` (NULL = lượt cũ) và `ADD COLUMN la_thu INTEGER NOT NULL DEFAULT 0 CHECK (la_thu IN (0,1))` (đã thử hợp lệ trên `node:sqlite`; **chưa thử trên D1**);
  - `tl_hoi_dap`: `ADD COLUMN cuoc_tro_chuyen TEXT` (NULL = lượt cũ) + chỉ mục `(staff_id, cuoc_tro_chuyen, created_at)`.
- `tl_loi_dan` không đổi (giọng / lời dặn thêm thôi hiện, giữ dữ liệu; bỏ cột = việc sau, expand–contract).
- `docs/data-dictionary.json` + `npm run dict`. Tiền: micro-USD INTEGER, tính ở máy chủ.

## 4. API

| Route | Cổng | Việc |
|---|---|---|
| `GET /api/tro-ly/bo-nao` | `office` + `settings.ops` | B1 |
| `PUT /api/tro-ly/bo-nao` | như trên | B2–B3, B7 |
| `GET /api/tro-ly/bo-nao/lich-su` | như trên | B6 |
| `POST /api/tro-ly/thu` | như trên | T1–T5 |
| `POST /api/tro-ly/hoi` | như cũ | thêm trường tuỳ chọn `cuocTroChuyen` (N1–N5); dùng bộ não hiện hành; P1–P2 |

## 5. Giao diện

- **Bảng điều khiển** (`/tro-ly-cai-dat`): mục **"Bộ não"** trên "Lời dặn": ô chọn mẫu (tên + giá ước tính), mức suy nghĩ, độ dài, token ra; ô soạn lời nhắc lớn (đếm ký tự, "Khôi phục mặc định", "Xem bản mặc định"); Lưu; "Lịch sử bản". Dòng cảnh báo cố định: "Xoá các luật an toàn trong lời nhắc có thể khiến trợ lý trả lời điều không nên nói. Che số điện thoại, ẩn số tiền, giới hạn tiền và quyền xem vẫn do máy chủ giữ."
- **Ô thử** cạnh lời nhắc: vai giả định, câu hỏi, "Thử với cấu hình đang soạn" → câu trả lời, nguồn, token, tiền.
- Mục "Lời dặn" còn: câu chào, câu hỏi mẫu.
- **Khung trò chuyện**: nút "Cuộc trò chuyện mới".
- Luật giao diện (`web/CLAUDE.md`); chạy lại kịch bản Chrome bảng điều khiển + khung trợ lý; sinh lại sơ đồ trang / kho trợ lý.

## 6. Kiểm thử và hàng rào

- Hàm thuần đỏ trước: kiểm hợp lệ bộ não (B2, B9), ghép lời nhắc (B4, B5), giá theo mẫu (B8), chi phí tối đa (P2), lọc số tiền (P1), tách nguồn (S1–S3), truy vấn tìm đoạn nối (N5).
- Route với OpenAI giả: B1–B8, B10, M1–M2, N1–N4, T1–T5, P1–P2; migration test cho `tl_bo_nao` + 3 cột.
- e2e `tro-ly` mở rộng (OpenAI giả).
- **Hàng rào bị bỏ (nới, Điều 9.4 — chủ duyệt cùng ADR-0073):** dòng 285 sổ hàng rào + ca `src/shared/tro-ly-bang-dieu-khien.test.ts:93`, `src/modules/tro-ly/bang-dieu-khien-route.test.ts:153` (luật lõi đứng trước phần tuỳ chỉnh).
- **Hàng rào mới** (mỗi dòng ghi ngày quan sát chặn thật — sửa cố ý → đỏ → hoàn nguyên): (a) máy chủ luôn nối khối tài liệu + nhóm vai; (b) phần nhớ chỉ lấy từ `tl_hoi_dap` cùng người; (c) mẫu ngoài danh sách bị từ chối; (d) lượt thử tính vào trần tiền tháng; (e) lọc số tiền ở câu trả lời (Hiến chương 5.15 — cập nhật bảng thi hành `docs/ARCHITECTURE.md` từ "dựa vào kỷ luật" sang có cơ chế = **đề xuất** sửa tài liệu chuẩn tắc, chủ duyệt); (f) kiểm trần trước khi gọi.
- Kiểm độc lập (việc lớn: tiền + luật).

## 7. Giả định và điều chưa chắc

- **Chưa kiểm:** giá hiện hành, mức suy nghĩ / độ dài từng mẫu hỗ trợ; Responses API nhận `input` dạng danh sách lượt user / assistant cùng `instructions` (tin là có); lỗi 400 khi dùng `reasoning` với nano (ADR-0066 còn treo) — tra tài liệu OpenAI lúc thi công, ghi ngày.
- **Giả định (bề mặt, đổi được):** 3 lượt, 2 giờ; 12.000 ký tự; token ra 800–4000; tên mục "Bộ não"; mẫu nhận diện số tiền.
- **Chưa chắc:** điều khoản lưu dữ liệu của OpenAI (ADR-0066 vẫn "chưa kiểm").

## 8. Trang ghép (`CLAUDE.md` §9 — lượt duyệt 2 quyết định)

**(1) Bảng chứa gì:** `tl_bo_nao` (mới) — chỉ cấu hình trợ lý. `tl_luot_hoi` — thêm mã mẫu + cờ thử, vẫn không nội dung. `tl_hoi_dap` — thêm mã cuộc trò chuyện; vẫn chỉ câu hỏi + trả lời đã che (nay đã ẩn số tiền) của lượt thật.

**(2) Dòng bản đồ quyền chạm các bảng:**

| Ô | Vai | `tl_bo_nao` | `tl_luot_hoi` | `tl_hoi_dap` |
|---|---|---|---|---|
| `assistant.ask` (như cũ) | các vai được bật | đọc gián tiếp (bản hiện hành) | ghi lượt của mình | ghi lượt của mình; đọc gián tiếp ≤ 3 lượt của **chính mình** cùng cuộc trò chuyện (Đ4) |
| `settings.ops` (chỉ Toàn quyền) | Toàn quyền | đọc + ghi bản mới; thử | đọc tổng hợp; ghi lượt thử | đọc (như ADR-0069) |

**(3) Cổng canh cửa:** route bộ não / thử → `office` + `can(settings.ops)`; route hỏi → `assistant.ask` + công tắc vai + trần (kiểm trước khi gọi); phần nhớ → lọc `staff_id` + mã cuộc trò chuyện ở máy chủ; che SĐT / email → trước khi gửi; số tiền → lọc câu trả lời; mẫu → danh sách đóng; CSDL → trigger chỉ-thêm + CHECK.

## 9. Việc tiếp theo

1. Chủ duyệt ADR-0073 + đặc tả (một lượt), kèm nới hàng rào ở §6 và đề xuất sửa bảng thi hành Hiến chương 5.15.
2. Chép ADR vào `docs/adr/` + mục lục.
3. Kế hoạch thi công → thi công theo task (đỏ → xanh) → kiểm độc lập → `npm run day-len` + `npm run trien-khai` do chủ chạy.
4. Lượt 2 (tìm theo nghĩa): ADR + đặc tả riêng.
