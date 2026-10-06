# Ghi nhận: kích hoạt dựng môi trường thử (staging)

- Ngày: 2026-10-06. **Trạng thái: chuyển từ "hoãn có điều kiện" sang THI CÔNG** — chủ dự án quyết 2026-10-06 bắt đầu dựng, sau khi điều kiện kích hoạt số (1) của đặc tả `docs/superpowers/specs/2026-10-05-moi-truong-thu.md` đã xảy ra thật: bản 1.84 (chạm tiền — khoá kỳ sổ, lô "thay lần thu") đã lên thẳng production ngày 2026-10-06, không qua môi trường thử.
- Hồ sơ này KHÔNG thiết kế lại từ đầu. Thiết kế đầy đủ, bốn lựa chọn chủ đã chọn, và kế hoạch 11 bước đều đã có sẵn, đóng băng từ 2026-10-05, và vẫn còn khớp hiện trạng mã (đã kiểm lại hôm nay — xem mục 2):
  - Thiết kế + lời khai giống thật: `docs/superpowers/specs/2026-10-05-moi-truong-thu.md`.
  - Kế hoạch thi công từng bước: `docs/superpowers/plans/2026-10-05-moi-truong-thu-ke-hoach.md`.
- Việc của hồ sơ này chỉ là: ghi lại mốc kích hoạt, xác nhận kế hoạch cũ còn dùng được, và nêu rõ điều cần chủ xác nhận lại trước khi AI bắt đầu làm phần việc của AI (bước 4–7 của kế hoạch).

## 1. Vì sao kích hoạt đúng lúc này
Đặc tả cũ đặt ba điều kiện kích hoạt. Điều kiện (1) — "sắp phát hành một migration chạm tiền" — đã xảy ra thật với bản 1.84. Lúc triển khai bản đó, chủ dự án đã biết rõ và chủ động chọn bỏ qua môi trường thử cho riêng lần đó, chấp nhận rủi ro (ghi ở `docs/HANDOFF-N1.md`, dòng ghi chú 2026-10-06). Hôm nay, trong một lượt rà soát tổng thể dự án, chủ dự án xác nhận muốn bắt đầu dựng môi trường thử cho các lần phát hành tiếp theo.

## 2. Kiểm nhanh kế hoạch cũ còn khớp không
Đã đọc lại `wrangler.jsonc` và `migrations/` hôm nay (2026-10-06):
- Chưa có khối `env.staging` nào trong `wrangler.jsonc` — đúng như kế hoạch mô tả (chưa bắt đầu bước nào).
- `migrations/` đã lên tới `0083` (bản 1.84) — kế hoạch áp "cùng thư mục migrations/" cho D1 thử, không phụ thuộc số thứ tự, nên không bị ảnh hưởng.
- Chưa có ADR nào về môi trường thử trong `docs/adr/` — khớp bước 10 của kế hoạch (ADR soạn sau, lúc gần xong).
- Bước 0 của kế hoạch cũ ("nhập nhánh `worktree-cap-nhat-bo-luat-v2`") đã lạc hậu — nhánh đó không còn liên quan tới việc này, nên bỏ qua, bắt đầu thẳng từ bước 1.

Kết luận: kế hoạch cũ vẫn dùng được nguyên vẹn, không cần viết lại.

## 3. Điều cần chủ dự án xác nhận lại trước khi bắt đầu
Bốn lựa chọn chủ đã chọn ngày 2026-10-05 (mục 6 của đặc tả cũ) — xác nhận còn giữ nguyên hay muốn đổi:
1. Tên miền bản thử: `thu.booking.tourdao.vn`.
2. Dữ liệu: chỉ dữ liệu gieo, không chép dữ liệu thật.
3. Ai được vào: lúc đầu chỉ chủ (qua Cloudflare Access).
4. Cron đồng bộ danh mục trên bản thử: tắt.

Nếu giữ nguyên cả bốn, AI có thể bắt đầu ngay bước 4 của kế hoạch (khối `env.staging` trong `wrangler.jsonc` và bài kiểm cấu hình) — bước này không cần chủ làm gì trước. Các bước cần chủ tự chạy (tạo D1 thử, Cloudflare Access, Turnstile, đặt bí mật — bước 1, 2, 3, 8) thì AI sẽ soạn đúng lệnh/hướng dẫn khi tới lúc, theo đúng luật CLAUDE.md §8 (AI không tự chạy lệnh ghi lên Cloudflare).

## 4. Chưa kiểm được
- Chi phí thật của Cloudflare Access và D1 thêm cho bản thử — chưa tra giá, nên chưa nêu số cụ thể.
- Chưa xác nhận chủ còn dùng đúng email nào để cấu hình chính sách Cloudflare Access (bước 2 của kế hoạch).
