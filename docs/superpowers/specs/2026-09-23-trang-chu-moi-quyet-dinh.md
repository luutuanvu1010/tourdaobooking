# Trang chủ mới (Dashboard) — quyết định của chủ dự án (2026-09-23)

> Ghi lại các điểm chủ dự án đã chốt trực tiếp trong phiên chat (qua `AskUserQuestion`, không chỉ qua lời chuyển của phiên khác) trước khi lập đặc tả/kế hoạch đầy đủ. Tham chiếu: đặc tả gốc `docs/superpowers/specs/2026-09-22-thiet-ke-lai-giao-dien-design.md` §10 (Trang chủ mới), §11 (Bước 3), §12 mục 1 (việc còn mở).

Bối cảnh: 11/12 trang thiết kế lại giao diện đã xong, đã gộp `main`, đã đẩy, đã triển khai production (2026-09-23). Trang chủ mới là trang thứ 12, việc riêng, có đụng API — theo `CLAUDE.md` §3 phải chốt với chủ dự án trước khi viết mã, không tự quyết.

## Đã chốt

1. **API**: TÁCH RIÊNG cho Trang chủ mới — KHÔNG đổi `GET /api/orders` hiện có, trang Đơn hàng giữ nguyên y hệt, không đụng gì.
2. **Vị trí trang**: THÊM TRANG MỚI RIÊNG (route mới, ví dụ `/home` như mockup ghi) — KHÔNG thay thế route `/` hiện tại (trang Đơn hàng vẫn ở chỗ cũ).
3. **Đơn chưa có ngày đón** (đơn nháp mới tạo, chưa nhập chuyến): KHÔNG hiện trong danh sách "chuyến đón hôm nay". Đơn loại này đã có ô số liệu riêng "Đơn nháp chưa xác nhận" để nhắc.
4. **Biểu đồ "Doanh thu của tôi"**: LÀM GỌN TRƯỚC — chỉ hiện số tổng tuần, CHƯA vẽ biểu đồ cột 7 ngày. Biểu đồ để đợt sau nếu cần.
5. **Phạm vi ngày của "chuyến đón hôm nay"**: CHỈ ĐÚNG HÔM NAY (theo giờ Việt Nam, `vnToday()`) — KHÔNG hiện đơn có ngày đón đã qua (quá khứ).
6. **Ô số liệu "Chưa có người phụ trách"**: chỉ đếm đơn ở trạng thái ĐÃ XÁC NHẬN (`confirmed`) — không tính đơn nháp.
7. **Đơn có nhiều dịch vụ, nhiều ngày đón khác nhau**: lấy ngày đón SỚM NHẤT trong số các dịch vụ CÓ ngày đón của đơn đó, dùng để xếp/lọc vào danh sách "hôm nay" — khác quy ước "dịch vụ đầu theo `sort_order`" đã dùng để HIỂN THỊ ở Bước 1 (đó là chọn 1 ngày để hiện, đây là chọn ngày để lọc/sắp, mục đích khác nhau, không dùng chung logic).
8. **5 icon mới** (nhà, danh bạ, ghim, lịch sử, trò chuyện): dùng ĐÚNG hình SVG đã có sẵn trong mockup `docs/design/mockup-by-ClaudeDesign/00 Trang chu v2.dc.html`, không tự vẽ mới, không cần hỏi lại — thêm vào `web/icons.ts` theo đúng lưới 24×24 đã có.

## Chưa chốt / cần đọc mã thật để xác nhận thêm khi lập kế hoạch

- Ô số liệu "Còn thiếu tiền" (nếu mockup có) tính từ đơn nào (trạng thái, phạm vi ngày) — đối chiếu mockup thật lúc lập kế hoạch, không suy đoán.
- "Doanh thu của tôi" tính tổng `total` của đơn `confirmed` theo `staff_id` đăng nhập trong tuần hiện tại (giờ VN) — xác nhận cách tính tuần (thứ 2 → chủ nhật hay 7 ngày gần nhất) khi đọc mockup, nếu mockup không rõ thì tự quyết theo hướng đơn giản nhất và ghi lại (P8 — bề mặt, đảo ngược được).
- "Chưa có người phụ trách" cần xuyên qua module `dispatch` (đọc view `v_dsp_order_handler`, KHÔNG import thẳng module — luật kiến trúc `src/CLAUDE.md`) — xác định route/API này đặt ở module nào (`orders` hay `dispatch`) khi lập kế hoạch, đọc mã thật trước khi quyết.
- Tên route API mới, tên tham số, hình dạng response — chốt cụ thể lúc lập kế hoạch (đã chốt HƯỚNG "tách riêng" ở mục 1, chưa chốt CHI TIẾT).

## Việc lớn — bắt buộc theo CLAUDE.md §3

Đụng dữ liệu (API mới), có thể đụng cấu trúc module (`dispatch`). Bắt buộc: kiểm độc lập sau khi thi công, không tự nghiệm thu. Điểm mơ hồ MỚI phát sinh lúc đọc mã (ảnh hưởng dữ liệu/hành vi rõ rệt, chưa được liệt kê ở trên) → hỏi thẳng chủ dự án, không tự đoán.
