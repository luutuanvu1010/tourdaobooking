# ADR-0007 — Bản đồ quyền → thao tác và sửa sau xác nhận

- **Trạng thái:** **accepted** (chủ dự án duyệt 2026-09-20). Các dòng ◆ được chủ dự án duyệt cùng ADR. Sau khi accepted chỉ sửa trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-20   **Người phê chuẩn:** chủ dự án (đã duyệt 2026-09-20)
- **Loại quyết định:** **cửa một chiều** cho các dòng liên quan tiền: đổi quyền về sau không hoàn tác được những khoản đã sửa/ghi theo quyền cũ
- **Liên quan:** ADR-0004, ADR-0005 (cấu trúc quyền), ADR-0006 (phân công); **thay thế một phần** quyết định Q9 của `docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md` (khoá số khách/dịch vụ/tiền sau xác nhận)

## Bối cảnh
- ADR-0005 chỉ dựng cấu trúc bốn quyền app (`SALES`, `ACCOUNTING`, `ADMIN`, `FIELD`). Ai làm được thao tác nào — nhất là **tiền** — là bất biến phân quyền chạm dữ liệu (P8: mơ hồ cấu trúc thì dừng và hỏi), nên tách thành ADR riêng để chủ dự án duyệt **trước** khi N1 hiện thực hoá quyền.
- A1 (chưa merge, chưa deploy) khoá số khách, dịch vụ và tiền sau khi xác nhận (Q9; trigger `order_service_frozen_*` của `0008`; chốt chặn `updateDraftOrder` và thông điệp `NOT_EDITABLE`). Chủ dự án (2026-09-20) quyết: *sau xác nhận, thông tin vận hành ai được phân công cũng sửa được; số khách, dịch vụ, tiền chỉ người lập đơn hoặc quản trị/kế toán sửa; mỗi lần sửa ghi trước → sau, người sửa và lý do; tiền tự tính lại; khoản chênh so với số đã thu được đánh dấu cho kế toán.* Đây là **nới một bất biến dữ liệu nội bộ chưa phát hành** (N5 hạng có điều kiện), do chủ dự án quyết, cần bản ghi này.

## Quyết định
**1. Bản đồ quyền → thao tác.** "Của mình" = **người lập đơn** (`orders.staff_id`). `ADMIN` làm được mọi thao tác, kể cả lập đơn (nên không cần kèm `SALES`). ◆ = đề xuất chưa được chủ dự án nêu.

| Thao tác | SALES | ACCOUNTING | ADMIN | FIELD (Thực hiện) |
|---|---|---|---|---|
| Xem đơn (mọi nhân viên xem được đơn của nhau, như hiện nay) | tất cả đơn | tất cả đơn | tất cả đơn | ◆ **không** dùng màn hình/API đơn; chỉ "việc của tôi" (điều 4c) |
| Xem **tiền**, bảng giá danh mục, nhật ký/lịch sử sửa đơn | ✓ (nhật ký: đơn của mình) | ✓ (kể cả nhật ký để đối chiếu tiền) | ✓ | ◆ **không** |
| Xem tên/SĐT khách, điểm đón, giờ | ✓ | ✓ | ✓ | ◆ ✓ (đúng việc được giao) |
| Lập, sửa, xác nhận, huỷ đơn | của mình | ◆ — (kế toán không chạm đơn nháp; đơn nháp chưa phải số liệu tiền) | mọi đơn | — |
| Sửa **thông tin vận hành** sau xác nhận (ngày giờ, đón, check-in, ghi chú) | của mình **hoặc đang được giao** | — | mọi đơn | ◆ chỉ cập nhật trạng thái việc được giao (đã đón, giờ thực tế) |
| Sửa **số khách, dịch vụ, tiền** sau xác nhận (lý do bắt buộc) | của mình | ✓ | ✓ | — |
| Đặt/đổi người phụ trách và nhiệm vụ (ADR-0006) | của mình | — | ✓ | — |
| Ghi **thu tiền** | của mình ◆ | ✓ | ✓ | — |
| Ghi **hoàn tiền** (dòng âm) | — ◆ | ✓ | ✓ | — |
| Ghi yêu cầu hoá đơn + thông tin xuất | của mình | ✓ | ✓ | — |
| Đánh dấu hoá đơn **đã xuất** | — | ✓ | ✓ | — |
| Tạo/sửa hồ sơ khách, đại lý (danh bạ) | ✓ | ✓ | ✓ | — |
| Quản lý tài khoản, quyền, địa điểm, danh mục, vai trò hồ sơ, gộp hồ sơ | — | — | ✓ | — |

**2. Quy tắc sửa sau xác nhận** (thay Q9 của A1 ở phần số khách/dịch vụ/tiền): cho phép theo bảng trên, với ba bất biến — (a) **lý do bắt buộc**; (b) bản ghi **trước → sau** chỉ-thêm (module `orders` sở hữu; chi tiết ở ADR của N3); (c) tiền **tự tính lại ở máy chủ** và mọi chênh lệch với tổng đã thu được **đánh dấu** cho `ACCOUNTING`. `audit_log` giữ vai **mục lục** (ai, lúc nào, hành động gì); bản ghi trước → sau giữ **nội dung**; hai bảng nối bằng `audit_log.id`, không lặp nội dung (một nguồn "ai sửa gì"). Thông tin vận hành sau xác nhận giữ cơ chế `PUT /trip` của A1.

**3. Máy chủ kiểm quyền theo bảng này** (giao diện chỉ ẩn/hiện theo); mặc định từ chối; bảng nằm ở **một nơi duy nhất** trong mã (P6) và có test phủ từng ô. **"Không xem tiền" là bất biến của mọi bề mặt**: danh sách đơn, chi tiết đơn, bản xuất PNG/PDF (M4), `detail` nhật ký (lệch giá), `GET /api/catalog`. Test phủ từng bề mặt, không chỉ từng ô của bảng.

**4. Nơi thi hành phạm vi "của mình" / "đang được giao" / "được giao" (không tạo vòng phụ thuộc):**
   - **(a)** Trong `orders`, "của mình" chỉ nghĩa là `orders.staff_id = ctx.staff.id`; `orders` không đọc `dsp_*`.
   - **(b)** Riêng thao tác "sửa thông tin vận hành **khi đang được giao**", `dispatch` cung cấp một hàm kiểm tra; **gốc lắp ráp (`src/index.ts`) tiêm hàm đó vào `ctx`** cùng `ctx.staff` (đúng cách quy tắc 2 của ADR-0002 đã tách kiểm quyền khỏi phụ thuộc). `orders` gọi `ctx.isAssigned(orderId)` ở duy nhất đường `PUT /trip`; không import `dispatch`, không SQL chéo. `party_id` của tài khoản lấy từ `staff.party_id` (ADR-0001 mục 5).
   - **(c)** `FIELD` **không** dùng route của `orders`. Họ dùng route "việc của tôi" của `dispatch`, trả **chỉ** tên/SĐT khách, điểm đón, giờ, nhiệm vụ của họ (không tiền, không bảng giá), lấy dữ liệu qua hàm công khai/view công bố của `orders` (`dispatch → orders` là chiều được phép).

## Lý do
- Bản đồ quyền ghi bằng chữ và duyệt trước tránh để N1/N3 tự diễn giải trên dữ liệu tiền (P8, N3).
- Định nghĩa "của mình" bằng cột của chính `orders` và tiêm hàm "đang được giao" ở gốc lắp ráp giữ đồ thị không vòng (ADR-0002) mà không đảo chiều phụ thuộc hay thêm cột phụ trách vào `orders`.
- Cho sửa theo quyền, có lý do và lịch sử, đáp ứng thực tế khách đổi số người sát ngày đi mà không mất dấu vết hay làm sai tiền lặng lẽ.
- `FIELD` chỉ thấy việc của mình giữ dữ liệu nhạy cảm (tiền, giá, đơn người khác) khỏi người chỉ cần thông tin đón khách.

## Phương án bị loại
- **Giữ khoá như A1** (đổi số khách/dịch vụ/tiền thì huỷ và lập đơn mới): chủ dự án đã quyết khác.
- **Ai có quyền trên đơn cũng sửa mọi thứ:** rủi ro sai tiền cao; chủ dự án chọn "theo quyền".
- **"Của mình" gồm cả người phụ trách trong `orders`:** buộc `orders` đọc `dispatch` (vòng) hoặc thêm cột phụ trách vào `orders` (đã loại ở ADR-0006).
- **Để bản đồ quyền cho đặc tả N1 tự chốt:** giả định cấu trúc nằm trong cửa một chiều.
- **Cho `FIELD` dùng route `orders` với bộ lọc:** dễ rò tiền qua bề mặt nào đó chưa được lọc; route riêng chỉ trả trường được phép an toàn hơn.

## Hệ quả
- **Việc phải làm khi accepted (P4):** sửa Q9 ở `2026-09-19-thong-tin-chuyen-di-design.md` §2 và §11, sửa `SPEC-tourdao-sales.md` §2.3 và "Lịch sử thay đổi", và đổi thông điệp `NOT_EDITABLE` (`orders/index.ts`). **Cho tới khi N3 có bản ghi trước → sau, khoá của A1 giữ nguyên** (A1 được merge/deploy với khoá Q9 nguyên vẹn; không đường nào được nới trước) — nếu không, giữa lúc này và N3 tài liệu nói một đằng, mã làm một nẻo (Điều 3.1).
- **Cơ chế nới trigger ở N3** (SQLite/D1 không có ngữ cảnh phiên nên trigger không biết câu lệnh đến từ đâu): đổi điều kiện các trigger `order_service_frozen_*` từ "đơn không còn nháp" thành "đơn không còn nháp **và không có dòng bản ghi thay đổi của chính request này**", dùng lại idiom `wonGuard` của A1 (`EXISTS (SELECT 1 FROM <bảng bản ghi> WHERE id = ?)`, `ARCHITECTURE.md` "Luật dữ liệu"): câu ghi bản ghi lý do đứng **trước** trong cùng `db.batch()`, nên mọi đường ghi quên bản ghi đều bị trigger chặn. Các trigger `orders_money_update`/`orders_money_insert` (`0007`) — kiểm số học của tiền — **giữ nguyên** làm lưới cuối. Đặc tả N3 phải chứng minh bằng test rằng không có đường ghi số khách/dịch vụ/tiền nào không để lại bản ghi.
- Cần ADR/đặc tả riêng ở N3 cho bảng bản ghi thay đổi; ADR này chỉ quyết **ai được làm gì** và các bất biến.
- Các dòng ◆ là đề xuất: `FIELD` chỉ việc được giao và không thấy tiền/giá/nhật ký; `ACCOUNTING` không lập/sửa/xác nhận/huỷ đơn (kể cả đơn nháp) nhưng sửa được tiền sau xác nhận — một **bất đối xứng cần chủ dự án xác nhận**; `SALES` ghi thu cho đơn của mình nhưng **không hoàn tiền**. Sửa bảng này trước khi accepted là rẻ; sau accepted phải thay bằng ADR mới.
