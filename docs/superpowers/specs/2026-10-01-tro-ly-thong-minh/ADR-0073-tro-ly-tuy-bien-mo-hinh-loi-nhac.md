# ADR-0073 — Trợ lý Hỗ trợ: Toàn quyền chọn mô hình, sửa toàn bộ lời nhắc, thử trước khi lưu; trả lời mềm ngoài hướng dẫn; nhớ 3 lượt trước

- **Trạng thái:** **proposed** — bản nháp chờ chủ dự án duyệt. Nháp đặt ngoài `docs/adr/` (luật hỏi quyền khi sửa `docs/adr/**`); duyệt xong mới chép vào `docs/adr/` + dòng mục lục (và sửa dòng "số ADR kế tiếp" đã cũ ở `docs/adr/README.md`).
- **Ngày:** 2026-10-01. **Số:** 0073 — 0071 (vai Hành chính nhân sự, `10347cce`) và 0072 (giữ chỗ ở nhánh `worktree-han-che-quan-tri-hcns`, `1a614a0c`) đã dùng.
- **Mốc mã:** `main` = `fd77987a` (1.50 + gộp hồ sơ 1.51). Production đang chạy 1.48 (GET `/api/auth/config`, 2026-10-01) — 1.49–1.51 chưa triển khai; production còn lời nhắc cũ hơn và trần 8 đoạn.
- **Thuộc gói:** một lượt duyệt gồm ADR này + đặc tả `dac-ta.md` cùng thư mục (trang ghép §8 đặc tả). Hai quyết định chạm dữ liệu/quyền/tiền ≤ trần 3.
- **Nguồn (lời chủ, chuẩn — không hỏi lại):** phiên 2026-10-01. Chủ dán ví dụ ("sao app khó dùng thế" → "Chưa có trong hướng dẫn — hỏi Quản trị hoặc gửi Góp ý / Nguồn: Quản trị › Dịch vụ & giá (Google Sheet); Quản trị › Tình huống hay gặp") và yêu cầu "thông minh và linh hoạt hơn, cho phép Super Admin thêm tuỳ biến, chọn mô hình, System prompt trong Bảng điều khiển". Hộp hỏi gom, nguyên văn lựa chọn:
  - "Toàn quyền được sửa câu dặn dò (system prompt) tới đâu?" → **"Sửa toàn bộ, kể cả luật an toàn"** (AI đã cảnh báo một lần theo P18; chủ vẫn chọn).
  - "Chọn mô hình AI thế nào?" → **"Danh sách có sẵn + giá"**.
  - "Khi câu hỏi không có trong hướng dẫn…" → **"Trả lời mềm, gợi hướng"**.
  - "Làm thêm những gì?" → **"Ô thử trước khi lưu", "Nhớ vài câu trước trong cuộc trò chuyện", "Tìm tài liệu theo nghĩa"**.
  - Chủ đồng ý thiết kế hai lượt ("đồng ý, viết ADR và đặc tả đi"): lượt 1 = ADR này; "tìm theo nghĩa" = lượt 2, ADR riêng.
- **Hiến chương Phần I áp:** **5.15 "AI không bao giờ tính tiền"** (đã duyệt; bảng thi hành ghi "dựa vào kỷ luật" — hàng rào duy nhất hôm nay là câu trong lời nhắc) → ADR này **thêm lớp máy chủ** (Đ7) để 5.15 không phụ thuộc lời nhắc; Điều 4 (nhật ký chỉ-thêm); tiền INTEGER; không xoá cứng.
- **Xây trên lỗ đang hở:** không có (`docs/quyen-hoan.json` `phat_hien` = `[]`, đọc 2026-10-01).
- **Loại cửa:** **hai chiều** cho lời nhắc / mẫu (đổi lại bằng bản mới); **một chiều** cho bảng / cột mới (migration).

---

## Tóm tắt cho chủ (lời thường)

1. **Bảng điều khiển trợ lý** có thêm mục **"Bộ não"**: chọn mô hình (gpt-5-nano rẻ nhất, gpt-5-mini, gpt-5 khôn nhất) kèm giá ước tính; chọn mức suy nghĩ, độ dài trả lời; **sửa toàn bộ lời nhắc** (bản mặc định mới, "Khôi phục mặc định", lịch sử bản, quay lại bản cũ).
2. **Ô thử**: gõ câu hỏi, xem trợ lý trả lời theo cấu hình đang sửa (chưa lưu), thấy tiền của lần thử; tính vào trần tiền tháng.
3. **Lời nhắc mặc định mới** khôn hơn: than phiền thì ghi nhận và gợi hướng, câu mơ hồ hỏi lại, không có trong hướng dẫn thì nói thật và chỉ chỗ gần nhất / mời Góp ý — vẫn không bịa.
4. **Nhớ 3 lượt hỏi đáp gần nhất** của chính người đó trong cùng cuộc trò chuyện — máy chủ tự lấy lại từ lịch sử đã che (trình duyệt không gửi được nội dung giả).
5. **Lớp bảo vệ trong mã máy chủ, không phụ thuộc lời nhắc:** che SĐT / email; không gửi tên / id người hỏi; trợ lý chỉ đọc hướng dẫn (không dữ liệu thật); lọc tên kỹ thuật; **lọc số tiền khỏi câu trả lời**; trần tiền tháng (có kiểm trước khi gọi mẫu đắt) + lượt ngày; khoá chỉ hiện 4 ký tự.

---

## Bối cảnh

- Lời nhắc (`dungLoiNhac`, `src/shared/tro-ly.ts:229-245`) là hằng: "Việc DUY NHẤT … dựa HOÀN TOÀN vào TÀI LIỆU"; luật 1 bắt trả đúng câu `CAU_CHUA_CO` khi tài liệu không trả lời được; không có chỗ cho than phiền / câu mơ hồ.
- Mẫu `gpt-5-nano`, `reasoning.effort: "minimal"`, `verbosity: "low"`, 1200 token ra — hằng (`MAU_AI`, `MUC_SUY_LUAN`, `TOKEN_RA_TOI_DA`), một bộ giá cứng; `thanThuKhoa` (thử khoá) cũng dùng `MAU_AI`.
- **Chẩn đoán ví dụ của chủ** (đã chạy `chonDoan("sao app khó dùng thế")` trên mã: ra 12 đoạn khớp yếu — "dung", "kho" có ở khắp nơi): mẫu **được gọi**, nhận 12 đoạn không liên quan, làm theo luật 1 (trả câu cố định) **nhưng vẫn tự viết dòng "Nguồn:"** trái luật 6; máy chủ không bỏ dòng đó vì câu bị bọc / thêm chữ nên kiểm tiền tố trượt. Gốc: lời nhắc chỉ có ba ngả + mẫu nhỏ nhất ở mức suy nghĩ thấp nhất + tìm từ khoá không ngưỡng.
- Bảng điều khiển (ADR-0069) đã có: bật/tắt, trần, công tắc theo vai, câu chào / giọng / lời dặn thêm / câu mẫu, ngữ cảnh bổ sung, lịch sử hỏi đáp đã che (`tl_hoi_dap`, có `staff_id`, câu hỏi + trả lời đã che) — ô `settings.ops` (chỉ Toàn quyền).
- Trần tháng hôm nay kiểm **sau khi** cộng chi phí đã ghi; chấp nhận vượt nhẹ khi nhiều câu chạy cùng lúc vì mỗi câu ~0,001 USD (`src/modules/tro-ly/index.ts:141-142`). Mẫu đắt + suy nghĩ cao làm mỗi câu đắt gấp hàng chục lần ⇒ lý do đó không còn đúng.

## Quyết định

**Đ1 — Mô hình chọn từ danh sách đóng.** Danh sách là **hằng trong mã** (`DANH_SACH_MAU`: mã mẫu, tên hiển thị, giá micro-USD / 1 triệu token vào, vào-đệm, ra; mức suy nghĩ hợp lệ; ngày tra giá). Lần đầu: `gpt-5-nano`, `gpt-5-mini`, `gpt-5` — giá + mức hỗ trợ tra trang OpenAI lúc thi công (**chưa kiểm**). Thêm mẫu = sửa danh sách + test (không cần ADR mới nếu cùng Responses API). Toàn quyền chọn: mẫu, mức suy nghĩ (trong tập mẫu đó hỗ trợ), độ dài (`low`/`medium`/`high`), token ra tối đa (kẹp 800–4000; mức suy nghĩ `high` đòi ≥ 2000). Giá trị lạ → 400. Chi phí mỗi lượt = token × giá **của mẫu lượt đó**; `tl_luot_hoi.mau` ghi mã mẫu. "Thử khoá" dùng mẫu đang chọn.

**Đ2 — Toàn quyền sửa toàn bộ lời nhắc.** Lời nhắc = **một văn bản** (≤ 12.000 ký tự, qua `viPhamChu` — không SĐT, email, số tiền). Có **bản mặc định** trong mã (Đ3). Máy chủ **luôn tự nối sau** lời nhắc: nhóm vai người hỏi (chỉ tên nhóm) và khối TÀI LIỆU — Toàn quyền không chèn / bỏ được tài liệu. Mỗi lần lưu là bản mới chỉ-thêm; lịch sử; quay lại bản cũ. Hai trường **giọng** và **lời dặn thêm** của ADR-0069 điều 4 **thôi dùng**: lần đầu (chưa có bản bộ não nào) lời nhắc hiệu lực = bản mặc định + nối nguyên văn "Giọng: …" / "Lời dặn: …" đang có (nếu khác rỗng); "Khôi phục mặc định" = **chỉ** bản mặc định. Nhật ký `tro_ly_settings_changed` ghi phần đổi, không ghi nội dung.

**Đ3 — Trả lời mềm khi ngoài hướng dẫn (bản mặc định).** Lời nhắc mặc định: hướng dẫn dùng app dựa trên TÀI LIỆU; trò chuyện tự nhiên ngắn; than phiền → ghi nhận, hỏi khó ở chỗ nào, chỉ mục gần nhất, mời Góp ý; câu mơ hồ → hỏi lại một câu; không có trong tài liệu → nói rõ "hướng dẫn chưa nói về việc này", gợi Quản trị / Góp ý; **không bịa** nút, màn hình, chính sách, số tiền; kèm các luật an toàn cũ (từ chối bí mật, mã nguồn, dữ liệu khách, chống bị dụ, không tính tiền) — Toàn quyền sửa / xoá được (Đ2). Máy chủ: **không đoạn nào khớp** → **vẫn gọi mẫu** với khối TÀI LIỆU ghi "(không tìm thấy đoạn hướng dẫn liên quan)". Câu cố định chỉ còn dùng khi gọi mẫu lỗi / quá giờ. Đoạn hướng dẫn Quản trị nói về Bảng điều khiển (`src/shared/huong-dan-quan-tri.ts`) được viết lại cho khớp (trợ lý trích đúng đoạn này).

**Đ4 — Nhớ 3 lượt trước, máy chủ tự dựng.** Trình duyệt chỉ gửi **mã cuộc trò chuyện** (ngẫu nhiên, sinh khi mở khung / bấm "Cuộc trò chuyện mới"). Máy chủ lấy tối đa 3 lượt gần nhất **của chính người hỏi** (`staff_id`) **cùng mã cuộc trò chuyện**, kết quả `ok`, trong 2 giờ gần nhất, từ `tl_hoi_dap` (đã che sẵn) — **không** nhận nội dung lượt trước từ trình duyệt (chống giả mạo câu "trả lời trước" để dụ mẫu). Thêm cột `cuoc_tro_chuyen` vào `tl_hoi_dap`. Tìm đoạn tài liệu dùng câu hỏi hiện tại **nối** câu hỏi lượt trước gần nhất (câu nối tiếp không mất ngữ cảnh). Đăng xuất / người khác trên cùng máy không thấy nhớ của người trước (lọc theo `staff_id`).

**Đ5 — Ô thử trong Bảng điều khiển.** Route chỉ Toàn quyền (`settings.ops`): nhận cấu hình **chưa lưu** + câu hỏi + vai giả định; chạy đúng đường ống thật (che, tìm đoạn, gọi mẫu, lọc Đ7); trả câu trả lời, nguồn, token, tiền. Chạy được cả khi trợ lý đang **tắt** (để thử trước khi bật); thiếu khoá → 503 như hỏi thường. Lượt thử ghi `tl_luot_hoi` (`la_thu = 1`), **tính vào trần tiền tháng**, **không** tính vào trần lượt ngày của người thử, **không** ghi `tl_hoi_dap`. Cấu hình thử qua cùng bộ kiểm hợp lệ như khi lưu.

**Đ6 — Nguồn đáng tin hơn.** Chỉ gắn "Nguồn" khi câu trả lời có dòng "Nguồn:" chỉ tới đoạn **đã gửi**; không có dòng đó → **không** gắn (bỏ hành vi "lấy đoạn đầu"); câu cố định lỗi không bao giờ có nguồn. Thay câu "Câu trả lời luôn kèm nguồn" ở phần Hệ quả của ADR-0066.

**Đ7 — Lớp máy chủ cho tiền (Hiến chương 5.15) và trần.** (a) Câu trả lời của mẫu đi qua bộ lọc số tiền (cùng mẫu nhận diện số tiền của `viPhamChu`): đoạn có số tiền được thay bằng "[đã ẩn số tiền]" trước khi trả và lưu. (b) Trước khi gọi mẫu, máy chủ ước tính **chi phí tối đa** của lượt (token vào ước tính × giá vào + token ra tối đa × giá ra); nếu `đã dùng tháng + tối đa` > trần → từ chối 429 `tro_ly_het_tran_thang` như hết trần. Vượt trần do các lượt chạy song song vẫn có thể xảy ra nhưng bị chặn trên bởi số lượt song song × chi phí tối đa.

**Đ8 — Ngoài phạm vi (lượt 2, ADR riêng):** tìm tài liệu theo nghĩa (embeddings).

## Hệ quả

- **Được:** trợ lý trả lời tự nhiên hơn; Toàn quyền chỉnh nhanh không cần sửa mã / triển khai; thử trước khi áp dụng; chi phí theo mẫu minh bạch; 5.15 nay có hàng rào máy (trước chỉ dựa vào kỷ luật).
- **Mất / rủi ro:** (a) lời nhắc có thể bị sửa làm trợ lý trả lời sai (chủ chấp nhận) — lưới: các lớp máy chủ (tóm tắt 5) + lịch sử bản; (b) mẫu đắt làm tiền tăng nhanh — trần + kiểm trước khi gọi; (c) mọi câu đều gọi mẫu (không còn trả thẳng câu cố định); (d) **hàng rào bị nới / bỏ (Điều 9.4, chủ duyệt cùng ADR này):** dòng 285 sổ hàng rào ("luật lõi đứng trước phần tuỳ chỉnh") và hai ca test canh nó (`src/shared/tro-ly-bang-dieu-khien.test.ts:93`, `src/modules/tro-ly/bang-dieu-khien-route.test.ts:153`) — thay bằng hàng rào mới ở đặc tả §6; (e) lọc số tiền có thể ẩn nhầm con số không phải tiền (mã đơn, giờ) — kiểm bằng bộ câu mẫu.
- **Lệch có tên:** không (5.15 được giữ bằng Đ7a).

## Câu thay

- ADR-0066 điều 2 ("Mẫu: gpt-5-nano … Tên mẫu là hằng trong mã") → **thay bằng Đ1**.
- ADR-0066 điều 4 (luật trả đúng câu "Chưa có trong hướng dẫn…"; danh sách từ chối và "nêu tên mục đã dùng" là luật cố định trong lời nhắc) → **thay bằng Đ2 + Đ3 + Đ6** (danh sách từ chối thành nội dung của bản mặc định, sửa được; nguồn theo Đ6). Điều 3 (phạm vi chỉ đọc hướng dẫn) giữ.
- ADR-0066, phần Hệ quả: "câu trả lời luôn kèm nguồn" → **thay bằng Đ6**.
- ADR-0069 điều 4: "**Không sửa được** phần luật lõi … luật lõi luôn đứng TRƯỚC và thắng phần tuỳ chỉnh" và hai trường "giọng trả lời, lời dặn thêm" → **thay bằng Đ2**. Phần còn lại (câu chào, câu mẫu, ngữ cảnh bổ sung, bộ lọc chữ, bản chỉ-thêm, quay lại bản cũ) giữ.
- ADR-0070 điều 4 ("Luật lõi vẫn đứng trước lời dặn tuỳ chỉnh") → **thay bằng Đ2**. Các điều khác của ADR-0070 giữ (ngân sách 6.000 token, lọc tên kỹ thuật, kho sinh lúc build).
- ADR-0066 điều 6 (trần tháng) → **bổ sung Đ7b** (kiểm trước khi gọi).

## Phương án đã cân nhắc

1. **Giữ luật an toàn khoá, chỉ mở phần còn lại** — AI khuyến nghị; chủ chọn khác (Đ2).
2. **Gõ tên mẫu tự do** — không tính được tiền / chặn trần chính xác. **Loại** (chủ chọn danh sách).
3. **Trình duyệt gửi nội dung các lượt trước** — giả mạo được câu "trả lời trước" để dụ mẫu; máy dùng chung lộ hội thoại người trước. **Loại**, thay bằng Đ4.
