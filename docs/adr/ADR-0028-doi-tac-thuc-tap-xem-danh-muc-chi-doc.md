# ADR-0028 — Đối tác và Thực tập xem danh mục dịch vụ CHỈ-ĐỌC để lập đơn

- **Trạng thái:** **accepted** — chủ dự án quyết trực tiếp trong phiên chat 2026-09-26, chọn phương án **(A)** "mở cho cả Đối tác và Thực tập" (trả lời: *"a"*). AI ghi lại, không tự quyết (tiền lệ ADR-0021, ADR-0027).
- **Ngày:** 2026-09-26   **Loại:** cửa **hai chiều** — đổi cổng truy cập của một route đọc, không migration, không dữ liệu mới; gỡ bằng một commit. Phần một chiều duy nhất: giá bán lẻ Đối tác/Thực tập đã xem thì không thu lại — nhưng ADR-0014 điều 3 đã cho Đối tác thấy giá bán lẻ.

## Bối cảnh
Từ bản 1.14 (ADR-0027) máy chủ ngừng nhận dịch vụ nhập tay. Đối tác và Thực tập nhận 403 ở `GET /api/catalog` (cổng `office`), nên form lập đơn không có dịch vụ nào để chọn: Đối tác **không lập được đơn nào trên app** — trái ADR-0014 điều 2 ("Đối tác được tự lập đơn"). Thực tập bị chặn y hệt (`docs/HANDOFF-N1.md` "Việc còn treo" mục 5, câu hỏi R27 của mô hình 11 vai).

Phương án đã trình (lời thường): (A) mở cho cả Đối tác và Thực tập — **khuyến nghị**; (B) chỉ Đối tác; (C) chưa mở.

## Quyết định
1. `GET /api/catalog` dùng cổng **`orders`** thay `office`: văn phòng + mọi tài khoản xem được đơn của chính mình (Đối tác, Thực tập). Hướng dẫn viên thuần (`order.view` = none) vẫn 403.
2. **Chỉ đọc**, nội dung **giống hệt** nhân viên văn phòng thấy: tên, đơn vị, giá bán lẻ theo loại khách, ghi chú độ tuổi, trạng thái đồng bộ. Không giá vốn, không cột nội bộ của Sheet, không giá gốc Sheet/ghi đè (những thứ đó chỉ ở `GET /api/catalog/admin`).
3. Mọi thao tác quản trị danh mục (`/api/catalog/admin`, đồng bộ, sửa giá, ẩn/hiện, gỡ ghi đè, xác nhận) giữ cổng `admin`.
4. Luật giá của ADR-0027 không đổi: tài khoản có quyền Đối tác chỉ lập/sửa/xác nhận đơn đúng giá danh mục, tạm chưa được giảm giá — máy chủ chặn. Form lập đơn chỉ **khoá ô** cho khỏi gõ rồi bị từ chối (ô đơn giá chỉ xem khi đang bằng giá danh mục; ô giảm giá khoá khi đang 0). *Cách AI áp dụng:* ô vẫn sửa được khi đơn cũ đang lệch, để người dùng đưa về đúng thay vì kẹt.

## Sửa gì của quyết định cũ
- ADR-0027 mục "Trang ghép" câu "`GET /api/catalog` (Đối tác vẫn 403 … mở danh mục cho Đối tác là quyết định riêng)" → nay đã quyết: mở chỉ-đọc.

## Trang ghép (CLAUDE.md §9 — một quyết định chạm quyền)
1. **Bảng:** đọc bảng danh mục của module `catalog` (không ghi). Lần gọi đầu tiên khi hệ thống **chưa từng** đồng bộ vẫn tự kéo Sheet (`bootstrapIfNeverSynced`, chỉ một lần nhờ điều kiện `last_attempt_at IS NULL`) — không đổi so với trước, chỉ thêm người gọi được.
2. **Bản đồ quyền:** không đổi ô nào của `MATRIX`; cổng `orders` = `canAccessOrders` (`order.view` any hoặc own). Loại tài khoản mới đọc được: `PARTNER`, `INTERN`.
3. **Cổng:** `GET /api/catalog` (cổng `orders`); ảnh chụp mức truy cập `src/route-access.test.ts` khoá giá trị mới.
