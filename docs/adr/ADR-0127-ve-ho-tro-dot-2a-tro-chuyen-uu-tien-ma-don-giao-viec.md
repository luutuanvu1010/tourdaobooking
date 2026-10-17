# ADR-0127 — Vé hỗ trợ đợt 2a: trò chuyện tự làm mới, mức ưu tiên, mã đơn liên quan, giao việc

- **Trạng thái:** **accepted — chỉ đợt 2a** — chủ dự án, chat 2026-10-16: *«Duyệt, viết ADR và kế hoạch đợt 2a đi»*, sau khi đọc đặc tả `docs/superpowers/specs/2026-10-16-ve-ho-tro-dot-2a-design.md` (bản 2, commit `6c4a1629`, đã qua một vòng kiểm độc lập) và chọn trong chat: làm phần «Trò chuyện + giao việc» trước; **chỉ người xử lý đặt mức ưu tiên**; **người gửi chọn mã đơn từ danh sách đơn của mình**. Đợt 2b (trạng thái «Chờ người gửi bổ sung», loại «Yêu cầu hỗ trợ», thông báo đẩy cho thành viên) **chưa duyệt**.
  - AI soạn và ghi lại, không tự duyệt (Hiến pháp N3). Người kiểm độc lập đọc lại sau khi thi công (việc lớn: dữ liệu, quyền, cạnh kiến trúc).
- **Ngày:** 2026-10-16.
- **Số:** 0127 là số kế tiếp trên mọi nhánh lúc soạn (cao nhất thấy: `0126`); **kiểm lại trước khi gộp** (`git ls-tree --name-only <nhánh> docs/adr/` cho mọi nhánh). Migration dự kiến `0104` (cao nhất thấy: `0103`); kiểm lại tương tự khi đặt tên tệp.
- **Loại:** việc lớn (dữ liệu: thêm cột; kiến trúc: cạnh mới `feedback → orders`; quyền: ba tuyến mới). Dữ liệu chỉ-thêm nên đảo được: mã cũ chạy bình thường trên cấu trúc mới.
- **Sửa/bổ sung:** bổ sung ADR-0119 (không sửa thân). **NỚI cạnh kiến trúc (Điều 9.4):** `feedback` được phép đọc view công bố của `orders` — xem điều 3.
- **Xây trên lỗ đang hở:** không. Đợt này không ghi tiền, không chạm Sổ đại lý, không đọc dữ liệu khách.

## Quyết định

1. **Khung trò chuyện tự làm mới bằng tuyến chỉ đọc.** `GET /api/feedback/:id/messages?since=<ISO>` trả tin mới hơn mốc theo đúng quyền đọc và bộ lọc ghi chú nội bộ của tuyến chi tiết; **không ghi mốc «đã xem»**. Vì dấu giờ tin do Worker tính trước lô ghi, trình duyệt lấy mốc từ tin cuối máy chủ đã trả, lùi 30 giây và bỏ tin trùng theo `id` (không để mất tin). Phản hồi kèm phần đầu phiếu gọn (trạng thái, người xử lý, mức ưu tiên, nhóm). Làm mới 5 giây khi tab hiện, 30 giây khi phiếu đã đóng, dừng khi tab ẩn hoặc khi 404. **Không** dùng Durable Objects (BACKLOG mục 33 vẫn để sau).
2. **Mức ưu tiên.** Cột `fbk_ticket.priority` (`NORMAL`/`HIGH`/`URGENT`, mặc định `NORMAL`), kiểm giá trị ở code, **không `CHECK` liệt kê**. Chỉ người xử lý được phiếu (`quyenPhieu.xuLy`) đặt, qua `PATCH …/xu-ly`; người gửi không đặt được. Ghi nhận bằng nhật ký `feedback_priority_changed`, **không** thêm loại vào `fbk_ticket_event` (cột `type` có `CHECK` ba giá trị, phải dựng lại bảng chỉ-thêm mới sửa được). Hàng đợi sắp Khẩn, Cao, Thường rồi tới hoạt động gần nhất.
3. **Mã đơn liên quan + cạnh `feedback → orders`.** Cột `order_id`, `order_code` (tham chiếu, không khoá ngoại; mã chụp lúc gửi; cùng NULL hoặc cùng có giá trị). Người gửi chọn từ `GET /api/feedback/my-orders` (tối đa 30 đơn do chính người gọi lập; chỉ `id`, `orderCode`, `status`); máy chủ kiểm lại lúc gửi, câu lỗi **giống hệt** cho «không tồn tại» và «không phải của bạn». Tuyến hỏi quyền xem đơn của chính người gọi bằng `can(...)` (hàng rào (1c) của `route-write-guard`). **Cạnh mới `feedback → orders`** ở `ALLOWED_EDGES`, **chỉ đọc ba view có sẵn** `v_ord_order_owner`, `v_ord_order_label`, `v_ord_order_state` — không import hàm của `orders`, không thêm view, không đọc tiền/khách/SĐT.
4. **Giao việc cho người khác.** `GET /api/feedback/teams/:id/members` cho Trưởng nhóm của đúng nhóm đó và Toàn quyền (qua `quyenPhieu({ submitterId: "", ticketTeamId })`, không thêm hàm mới vào `GUARDS`): thành viên đang hiệu lực, tài khoản còn hoạt động, loại người gửi phiếu đang giao và tài khoản bên ngoài còn dòng cũ. Giao diện dùng lệnh `PATCH …/xu-ly {assigneeId}` đã có từ đợt 1.
5. **Không đổi `MATRIX`, không đổi chữ ký `quyenPhieu`.** Ba tuyến mới đều cổng `staff`, mặc định từ chối trong thân route.

## Điều phải nói thẳng

- Cạnh `feedback → orders` là thay đổi ranh giới giữa hai phân hệ (Điều 9.4). Nó hẹp: chỉ ba view khoá/nhãn/cờ, và người xử lý bấm mở đơn vẫn theo quyền xem đơn **của chính họ**, nên phiếu không làm lộ đơn cho ai.
- Tải lại 5 giây × ~30 người là đủ nhẹ; nếu đông hơn nhiều thì chuyển sang BACKLOG mục 33 (cần ADR riêng).
- Tuyến cũ `PATCH /api/feedback/:id` dùng chung bộ kiểm và câu SQL nên cũng nhận thêm trường `priority` (chỉ Toàn quyền; tuyến này sắp gỡ — BL-VE-GO-TUYEN-CU).
- Mức ưu tiên không có hạn xử lý (SLA) đi kèm: «Khẩn» chỉ là nhãn và thứ tự sắp, không tự cảnh báo.

## Phương án bị loại

- **Người gửi chọn mức ưu tiên:** dễ bị lạm dụng «Khẩn» khi chưa có SLA để cân bằng.
- **Gõ mã đơn tự do, chỉ lưu chuỗi:** không cần cạnh mới nhưng không kiểm đơn có thật và của ai; chủ chọn chọn-từ-danh-sách.
- **View mới `v_ord_order_for_support`:** vướng luật «view xuyên module chỉ chứa khoá/nhãn/cờ» và thừa, vì ba view sẵn có đủ.
- **Thêm `PRIORITY_CHANGED` vào `fbk_ticket_event`:** phải dựng lại bảng chỉ-thêm có trigger, rủi ro không đáng cho thông tin ít xem lại.
- **Chat thời gian thực (Durable Objects):** thêm loại hạ tầng, để sau.

## Hệ quả

- Một migration chỉ THÊM ba cột vào `fbk_ticket`; cập nhật `docs/data-dictionary.json` (kèm `logicalRefs` cho `order_id`) + `npm run dict`.
- Bài kiểm máy phải sửa cùng đợt: `route-access.test.ts`, `tai-xe-cong.test.ts` (`BANG_STAFF`), `architecture.test.ts` (cạnh mới và sổ dữ liệu), `audit-actions.test.ts`, `route-write-guard.test.ts` (1c) — liệt kê đầy đủ ở mục 5 đặc tả.
- Dòng mới ở `docs/SO-HANG-RAO.md` cho bài khoá «tuyến làm mới không ghi mốc đã xem» và bài ca ghi lệch thứ tự dấu giờ, kèm ngày quan sát chặn thật.
- Đóng mục BL-VE-GIAO-VIEC ở `docs/BACKLOG.md`.
- Triển khai production do chủ tự chạy; có migration nên **cần triển khai**; hoàn tác bằng `wrangler rollback` (mã cũ chạy bình thường trên cấu trúc mới, không cần xoá cột).
- Kế hoạch thi công: `docs/superpowers/plans/2026-10-16-ve-ho-tro-dot-2a.md`.
