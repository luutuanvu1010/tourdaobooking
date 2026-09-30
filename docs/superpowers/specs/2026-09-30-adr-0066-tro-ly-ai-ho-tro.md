# ADR-0066: Trợ lý AI "Hỗ trợ" trả lời cách dùng app (OpenAI)

- **Trạng thái:** accepted — chủ dự án duyệt 2026-09-30 (hộp hỏi, nguyên văn lựa chọn: "Sơ đồ trang tự sinh (Recommended)", "Duyệt, thi công luôn (Recommended)"; chat cùng ngày: "Người dùng là tất cả những ai đăng nhập được hệ thống, trần chi phí mỗi tháng là 5$, dùng mô hình cơ bản của OpenAI", "không trả lời những gì liên quan đến bí mật, chất xám hoặc hàm lượng tri thức").
- **Nguồn:** đề xuất `docs/superpowers/specs/2026-09-30-de-xuat-tro-ly-ai-hoi-dap.md`; bộ hướng dẫn theo vai (bản 1.41, `src/shared/huong-dan*.ts`).
- **Liên quan Hiến chương:** 5.11 (AI chỉ phát lệnh qua route có kiểm quyền; ở đây AI KHÔNG ghi gì), 5.12 (nhật ký không chứa SĐT/email), 5.15 (AI không tính tiền).
- **Giá tra ngày 30/9/2026** (trang giá chính thức developers.openai.com/api/docs/pricing): `gpt-5-nano` $0.05 / 1M token vào, $0.005 vào đã đệm, $0.40 / 1M token ra. Ước ~0,001 USD/câu (≈ 6k token vào, ≈ 1–2k token ra kể cả token suy luận) ⇒ 5 USD ≈ 4.000–5.000 câu/tháng. **Chưa đo thật** — đo ở bước thi công.

## Quyết định

1. **Ai dùng:** mọi tài khoản đang đăng nhập (9 mã quyền). Ô quyền mới `assistant.ask` = `any` cho mọi quyền; route `POST /api/tro-ly/hoi` cổng `staff`, gọi `can(staff, "assistant.ask")`.
2. **Mẫu:** `gpt-5-nano` (mẫu cơ bản rẻ nhất), mức suy luận thấp nhất, giới hạn token ra. Tên mẫu là hằng trong mã (đổi = một dòng + test).
3. **AI đọc gì (và chỉ gì):** (a) bộ hướng dẫn theo vai; (b) tài liệu kiến trúc viết lại bằng lời thường cho người dùng (không mã, không tên bảng, không số liệu); (c) **sơ đồ trang tự sinh** từ mã lúc build: trang, menu, tên nút, vai thấy được — chỉ nhãn chữ. **KHÔNG gửi mã nguồn thô, dữ liệu thật (đơn, khách, tiền, nhật ký), bí mật, cấu hình.** Mỗi câu chỉ gửi các đoạn liên quan nhất (tìm theo từ khoá, ưu tiên nhóm vai của người hỏi), tổng ≤ khoảng 6.000 token.
4. **Phạm vi trả lời:** chỉ cách dùng app và thắc mắc khi dùng. Từ chối: bí mật, mã nguồn, cách hệ thống được xây, luật nội bộ ngoài hướng dẫn ("chất xám"), giá, số tiền của một đơn cụ thể, dữ liệu khách. Không có trong tài liệu ⇒ "Chưa có trong hướng dẫn — hỏi Quản trị hoặc gửi Góp ý". Câu trả lời nêu tên mục hướng dẫn đã dùng.
5. **Che trước khi gửi:** câu hỏi ≤ 500 ký tự; chuỗi giống SĐT, email, số giấy tờ ⇒ "[đã che]" trên máy chủ trước khi rời Worker. Không gửi tên, SĐT, id của người hỏi — chỉ gửi tên nhóm vai.
6. **Trần chi phí:** 5 USD/tháng dương lịch (giờ VN) cho cả công ty + 30 câu/người/ngày. Đếm ở máy chủ từ `usage` OpenAI trả về × giá hằng trong mã, lưu **micro-USD kiểu INTEGER** (không phải tiền nghiệp vụ VNĐ — ngoại lệ có tên với luật "tiền = INTEGER VNĐ"). Chạm trần ⇒ "Trợ lý tạm nghỉ tới tháng sau — xem Trợ giúp" (không gọi OpenAI). Chủ nên đặt thêm giới hạn ngân sách ở bảng điều khiển OpenAI (lớp hai).
7. **Lưu gì:** bảng chỉ-thêm `tl_luot_hoi` (module mới `tro-ly`, tiền tố `tl_`, migration **0050**): mỗi câu một dòng — id, người hỏi, lúc hỏi (ISO UTC), ngày VN, token vào/ra, chi phí micro-USD, kết quả (`ok` / `het_tran` / `loi`). **Không lưu nội dung câu hỏi hay câu trả lời.** Cài đặt bật/tắt + trần: bảng `tl_cai_dat` bản có hiệu lực (chỉ thêm), chỉ Toàn quyền đổi (ô `settings.ops`).
8. **Khoá:** `OPENAI_API_KEY` chỉ qua `wrangler secret put` (chủ tự đặt). Thiếu khoá hoặc đang tắt ⇒ route trả 503 "Trợ lý chưa bật", nút Hỗ trợ vẫn hiện kèm câu này.
9. **Giao diện:** nút **"Hỗ trợ"** nổi ở mọi trang sau đăng nhập (trên thanh tab điện thoại); bấm mở khung hỏi đáp; khung tự mở **một lần** sau mỗi lần đăng nhập (nhớ trên máy, lỗi bộ nhớ ⇒ không tự mở). Không `innerHTML`; ô gõ 16px; chỉ token CSS.
10. **Tắt / hoàn tác:** Toàn quyền tắt bằng cài đặt (không cần deploy); gỡ hẳn = bỏ khoá bí mật. Bảng `tl_*` chỉ thêm, không ảnh hưởng dữ liệu nghiệp vụ.

## Trang ghép (CLAUDE.md §9)
| Bảng | Chứa | Ô quyền chạm | Cổng |
|---|---|---|---|
| `tl_luot_hoi` | một dòng / câu hỏi, không nội dung | `assistant.ask` (ghi qua route hỏi) — mọi quyền; đọc tổng tháng: `settings.ops` (Toàn quyền) | route `POST /api/tro-ly/hoi` (staff + can) + trần ngày + trần tháng + công tắc |
| `tl_cai_dat` | bật/tắt, trần tháng, trần ngày | `settings.ops` (chỉ Toàn quyền) | route cài đặt (office + can) |

## Hệ quả
- Dữ liệu rời hệ thống: chỉ câu hỏi đã che + đoạn hướng dẫn / sơ đồ trang (đã qua luật nội dung A3). Xử lý tại máy chủ OpenAI (Mỹ). Điều khoản lưu dữ liệu của OpenAI API: **chưa kiểm** — kiểm trước khi bật.
- AI có thể trả lời sai; câu trả lời luôn kèm nguồn mục và dặn đối chiếu màn hình.

---

## Thi công (2026-09-30, nhánh `worktree-agent-aafde1b67d6cd2bf2`) — ghi của người thi công, KHÔNG đổi quyết định ở trên

### Tài liệu OpenAI đã tra (30/9/2026)
- https://developers.openai.com/api/docs/models/gpt-5-nano — hỗ trợ cả Responses lẫn Chat Completions; cửa sổ 400.000 token, tối đa 128.000 token ra; giá vào 0,05 / vào đã đệm 0,005 / ra 0,40 USD cho 1 triệu token (khớp ADR).
- https://developers.openai.com/api/docs/guides/reasoning — `reasoning.effort` tuỳ mẫu (none, minimal, low, …); chạm `max_output_tokens` ⇒ `status: "incomplete"`, `incomplete_details.reason = "max_output_tokens"`; tên trường `usage.input_tokens_details.cached_tokens`, `usage.output_tokens_details.reasoning_tokens`.
- https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_new_params_and_tools — `minimal` áp cho gpt-5, gpt-5-mini, gpt-5-nano; `text.verbosity` low / medium / high.
- https://developers.openai.com/api/reference/resources/responses/methods/create — thân phản hồi: `output[]` gồm phần tử `type: "message"` có `content[]` kiểu `output_text` (trường `output_text` gộp sẵn chỉ có ở SDK).
- Chưa kiểm: một bài diễn đàn cộng đồng báo 400 khi gửi `reasoning` cho gpt-5-nano — nhiều khả năng do gửi vào Chat Completions; mã chuyển MỌI lỗi 4xx/5xx thành câu tiếng Việt + dòng `loi`. **Lần gọi thật đầu tiên sau khi chủ đặt khoá phải xem một câu hỏi thử có trả 200 không**; nếu 400 vì `minimal`, đổi `MUC_SUY_LUAN` (một dòng, `src/shared/tro-ly.ts`) sang `low`.

### API đã chọn
`POST {OPENAI_BASE_URL | https://api.openai.com}/v1/responses` với `{ model: "gpt-5-nano", instructions, input, reasoning: { effort: "minimal" }, text: { verbosity: "low" }, max_output_tokens: 1200, store: false }`. Không gửi `user`, `safety_identifier`, `metadata`. Hết giờ 20 giây.

### Ước chi phí mỗi câu (lời nhắc THẬT dựng từ kho, token ƯỚC 3 ký tự / token — chưa gọi OpenAI thật)
8 câu mẫu cho 8 quyền: lời nhắc 5.300–12.100 ký tự ⇒ 1.800–4.000 token vào; giả sử 500 token ra ⇒ 290–403 micro-USD/câu (trung bình 331); trường hợp xấu (hết 1.200 token ra) 570–683 micro-USD. ⇒ 5 USD ≈ 7.000–15.000 câu/tháng. Bộ tách từ thật của OpenAI với tiếng Việt có dấu có thể ra nhiều token hơn ước ~20–30 %. Số thật đọc ở khối "Trợ lý Hỗ trợ" trang Tôi (Toàn quyền) sau vài ngày dùng.

### Giả định bề mặt (đảo ngược được) — ghi theo P8
1. **Vị trí nút Hỗ trợ:** góc phải dưới; điện thoại: ngay trên thanh tab. Khi thanh nút dính đáy của trang (`.form-actions`, `.vc-bottom-bar`) đè vùng của nút thì nút tự nâng lên khỏi thanh (đo lúc chạy, cả khi cuộn). Hoàn tác: sửa `nangTheoThanhDay` ở `web/tro-ly.ts`.
2. **Mã lỗi:** 503 `tro_ly_chua_bat` (không dùng mã `maintenance` — mã đó bật màn bảo trì toàn trang); 429 `tro_ly_het_tran_ngay` / `tro_ly_het_tran_thang`; 502 `tro_ly_loi` khi OpenAI lỗi / hết giờ / mạng hỏng.
3. **Trần ngày đếm dòng `ok` và `loi`** (câu đã tới bước hỏi), không đếm `het_tran` — lỗi cũng tính để một lỗi lặp không thành vòng gọi vô hạn.
4. **Không đoạn tài liệu nào khớp câu hỏi ⇒ trả ngay câu "Chưa có trong hướng dẫn…" mà KHÔNG gọi OpenAI** (ghi dòng `ok`, chi phí 0) — tiết kiệm và tất định.
5. **Dòng Nguồn:** chỉ giữ tên mục CÓ trong các đoạn đã gửi (mẫu bịa tên không lọt); mẫu không ghi nguồn ⇒ lấy đoạn xếp đầu; câu "chưa có" / từ chối ⇒ không nguồn.
6. **Kiểm-rồi-ghi không nguyên tử:** vài câu gửi cùng lúc có thể vượt trần một chút (mỗi câu dưới 0,001 USD). Chấp nhận; lớp hai là giới hạn ngân sách ở bảng điều khiển OpenAI (ADR điều 6).
7. **Không ghi `audit_log` khi đổi cài đặt:** `tl_cai_dat` chỉ thêm, mỗi bản mang `created_by` / `created_at` — dấu vết trên chính dòng (Hiến chương 5.5). Nhờ vậy module `tro-ly` là lá (không cạnh tới `audit`).
8. **Sơ đồ trang không có cột "vai thấy trang":** menu dựng theo quyền bằng mã thủ tục; đọc tĩnh không suy chắc được ⇒ bỏ trống (người điều phối dặn "không đoán"). Trợ lý dựa vào hướng dẫn theo vai cho việc "ai thấy gì".
9. **Tự mở một lần:** cờ `sessionStorage` đặt ngay sau POST đăng nhập thành công (PIN và Face ID), đọc-rồi-xoá ở trang đầu; không đặt ở nhánh "đã có phiên → vào thẳng".
10. **Lịch sử hỏi đáp chỉ trong bộ nhớ của trang** (không lưu máy, không lưu máy chủ): chuyển trang là mất — đúng tinh thần "không lưu nội dung".
11. **Trần tháng nhận USD ở giao diện** (0–100, lưu micro-USD); số câu / người / ngày 0–200.

### Lệch / chưa làm so với giao việc
- Ca e2e "thiếu khoá → 503" KHÔNG chạy trên `wrangler dev` dùng chung (khoá giả luôn có, env không gỡ được lúc chạy) — phủ ở `src/modules/tro-ly/tro-ly-route.test.ts` (chạy CẢ ứng dụng trên SQLite thật, `fetch` giả).
- Điều khoản lưu dữ liệu của OpenAI API: chưa kiểm (ADR "Hệ quả" đã ghi — kiểm trước khi bật). Mã gửi `store: false`.
