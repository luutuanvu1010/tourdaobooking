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
