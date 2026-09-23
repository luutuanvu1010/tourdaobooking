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

## Quyết định BỔ SUNG sau khi chủ dự án xem kết quả thật (2026-09-23, chiều)

Chủ dự án xem ảnh trang thật, so với bản mẫu và nói "khác quá nhiều". Một lượt đối chiếu từng khối (chỉ đọc) xác nhận: trong 6 khối nhìn thấy của mockup, 3 khối biến mất hoàn toàn (thanh bên dọc, biểu đồ cột, "Cần xem lại"); **chỉ 1 khối bị bỏ do chủ chốt** (biểu đồ, mục 4 ở trên) — phần còn lại do AI tự quyết hoặc làm lệch không ai ghi nhận, trong đó có **2 chỗ làm SAI chính đặc tả dự án**:
- Bố cục điện thoại: đặc tả `…-design.md` §3 ghi rõ "mockup mobile gộp cả Doanh thu vào lưới 2×2 — dùng đúng cách này, không tách riêng"; mã làm khác (3 ô + 1 ô mồ côi, doanh thu tách thẻ riêng xuống dưới).
- Nhãn ô số liệu không rút gọn ở 390px → ô cao gấp đôi, 3 ô chiếm ~550/844px.

**Chủ dự án chốt lại (đảo 2 quyết định cũ):**

A. **LÀM ĐÚNG BẢN MẪU, KỂ CẢ THANH MENU DỌC** — đảo lại quyết định trước đó ("giữ khung điều hướng hiện tại, đổi menu toàn app làm sau", chốt qua AskUserQuestion sáng 2026-09-23). Nay chủ muốn dựng thanh bên dọc đúng mockup: logo, 3 nhóm BÁN HÀNG / QUẢN TRỊ / TÔI, huy hiệu số đếm, avatar + tên + vai ở chân. Kèm theo: ô tìm kiếm + nút "Lập đơn mới" trên thanh trên, khối "Cần xem lại", biểu đồ cột 7 ngày (đảo mục 4 ở trên), chip bảo trì đúng vị trí, liên kết "Xem tất cả".
   → Đây là **quyết định kiến trúc** (đổi khung điều hướng của CẢ 12 trang + PWA). Theo `CLAUDE.md` §3 (N3), việc này cần **ADR + chủ duyệt**, không phải việc nhét vào một trang.

B. **TRANG CHỦ THÀNH TRANG MẶC ĐỊNH** — đảo mục 2 ở trên ("thêm trang mới riêng, KHÔNG thay route `/`"). Nay `/` phải ra Trang chủ; trang Đơn hàng dời sang địa chỉ khác.
   → Ảnh hưởng đã tra: `/` do Workers Assets ánh xạ thẳng `public/index.html` (không có mã router) nên phải đổi tên tệp hoặc chuyển hướng ở Worker; `PRECACHE` trong `sw-policy.ts` hiện có `/` + `/js/orders.js`, chưa có `/home`; ~10 kịch bản Chrome đang mở `/` để vào trang Đơn hàng; `manifest.webmanifest` có `start_url: "/"` và `scope: "/"` — máy đã cài biểu tượng vẫn mở được vì `/` vẫn phục vụ, nhưng service worker đang cache `/` nên người dùng có thể thấy bản cũ tới khi `CACHE_VERSION` đổi (build tự chèn).

**Ghi nhận trung thực về quy trình (bài học):** việc AI tự xếp các khối nhìn thấy được (thanh bên, "Cần xem lại", ô tìm kiếm, nút Lập đơn mới) vào loại "tự quyết được, không cần hỏi" là SAI. Thứ chủ dự án nhìn thấy trên màn hình thì không phải "bề mặt đảo ngược được" theo nghĩa P8 — phải hỏi. Ghi vào đây để phiên sau không lặp lại.

## Trả lời 4 câu hỏi chặn của Đợt D (2026-09-23, chủ dự án chốt trực tiếp qua AskUserQuestion)

1. **ADR-0015 (thanh menu dọc cho cả app): DUYỆT** — "Duyệt, làm đi". ADR đổi trạng thái `proposed` → `accepted` (AI chỉ đổi dòng trạng thái sau khi có câu trả lời thật, không tự duyệt). Task 4 + Task 5 của Đợt D được mở khoá.
2. **Huy hiệu số đếm trên menu: LÀM ĐỦ CẢ 3 SỐ** (Đơn hàng / Dịch vụ & giá / Góp ý). Nghĩa là phải THÊM chỗ đếm tổng đơn — hiện chưa có API nào trả số này. Task tương ứng phải bổ sung, không được lặng lẽ bỏ.
3. **Khối "Cần xem lại": CHỈ QUẢN TRỊ THẤY** — giữ đúng quyền hiện có của dữ liệu cảnh báo giá (`/api/catalog/admin`, chỉ admin). KHÔNG mở quyền đọc cảnh báo giá cho mọi nhân viên. Nhân viên bán hàng không thấy khối này (không phải lỗi).
4. **Thời điểm đưa lên production: ĐỢI XONG HẾT 6 PHẦN rồi đưa 1 lần** trong cửa sổ bảo trì, sau khi chủ dự án xem ảnh và duyệt. KHÔNG deploy từng phần.
