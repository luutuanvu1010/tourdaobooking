# ADR-0017 — Hướng dẫn viên nội bộ được xem "còn thu" và "đã trả" của đơn mình phụ trách

- **Trạng thái:** **proposed** — chờ chủ dự án duyệt. AI soạn 2026-09-24 theo yêu cầu trực tiếp của chủ dự án; **AI không tự duyệt** (N3, Điều 7.2). Chủ đã chọn phạm vi số tiền trong phiên chat (qua `AskUserQuestion`: "Hướng dẫn viên sẽ thấy những con số tiền nào?" → **"Còn thu + đã trả"**), nhưng dòng trạng thái này chỉ được đổi sang `accepted` sau khi chủ duyệt chính văn bản này.
- **Ngày:** 2026-09-24   **Người phê chuẩn:** chủ dự án (chưa duyệt)
- **Loại quyết định:** **cửa một chiều** cho các dòng liên quan tiền — đúng cách ADR-0007 tự phân loại: đã cho một vai nhìn thấy số tiền thì những gì họ đã thấy không thu lại được. Phần mã thì gỡ được bằng một commit.
- **Liên quan:** **sửa một phần ADR-0007 điều 3** (bảng quyền: `FIELD` = "◆ không" ở dòng "Xem tiền, bảng giá danh mục, nhật ký/lịch sử sửa đơn") và **ADR-0014 điều 6** (dòng tái khẳng định bất biến đó); giữ nguyên ADR-0007 điều 4(c) (route riêng cho `FIELD`, không dùng `/api/orders*` chung). Đặc tả giao diện: `docs/superpowers/specs/2026-09-23-dot-e-the-don-gon-va-bieu-tuong.md`.

## Bối cảnh

Hai ADR đã duyệt cấm hướng dẫn viên (`FIELD`) nhìn thấy tiền:

- **ADR-0007 điều 3**, bảng quyền, dòng *"Xem **tiền**, bảng giá danh mục, nhật ký/lịch sử sửa đơn"*: `FIELD` = **◆ không**.
- **ADR-0014 điều 6** (accepted 2026-09-22) **tái khẳng định**: *"**Bất biến giữ nguyên (ADR-0007 điều 3):** `FIELD` vẫn không xem tổng tiền, bảng giá hay lịch sử đơn ở **bất kỳ bề mặt nào**."* — ngay cả khi ADR-0014 mở `order.money.edit` cho `FIELD`: hướng dẫn viên **sửa được** số khách/dịch vụ (máy chủ tự tính lại tiền) nhưng **không được thấy** đơn giá hay tổng tiền.

Mã hiện thực hoá đúng như vậy: `MyAssignmentDto` (`src/shared/contracts.ts`) được viết **độc lập**, không `Pick`/`Omit` từ `OrderDto`, kèm chú thích nói rõ mục đích là để *"một lần đổi kiểu dữ liệu đơn sau này (thêm trường tiền) không vô tình lọt vào đây"*. `GET /api/dispatch/mine` hiện **không gửi một trường tiền nào**.

**Sự thật nghiệp vụ mới, do chủ dự án nêu 2026-09-24:** *"HDV (nội bộ) phải xem được tiền để còn thu tiền mặt khi đón khách."* Đây là thông tin vận hành mà các ADR trước **không có**: hướng dẫn viên là người trực tiếp nhận tiền mặt của khách tại điểm đón. Không biết phải thu bao nhiêu thì hoặc họ phải gọi về văn phòng mỗi chuyến, hoặc thu sai.

## Quyết định

1. **Hướng dẫn viên (`FIELD`) được xem ĐÚNG HAI số tiền** của đơn **mình đang được giao phụ trách**, trên **màn "Việc của tôi"**: **"còn thu"** (`remainingAmount`) và **"đã trả"** (`depositAmount`).
2. **Vẫn KHÔNG được xem:** **tổng tiền đơn**, **đơn giá từng dịch vụ**, **bảng giá danh mục**, **lịch sử sửa đơn**. Bất biến của ADR-0007 điều 3 chỉ bị thu hẹp đúng hai trường trên, không bị bỏ.
3. **Phạm vi là "đang được giao"**, không phải "mọi đơn": thực thi ở **máy chủ**, trong chính route riêng của `FIELD` (`GET /api/dispatch/mine`) — giữ nguyên nguyên tắc ADR-0007 điều 4(c): `FIELD` **không** dùng `/api/orders*` chung.
4. **Số tiền là số HIỆN HÀNH sau điều chỉnh** (`getLatestAdjustmentSubtotals()` + `effectiveMoney()`), tính ở máy chủ. Không tính lại ở trình duyệt.
5. **`PARTNER` (đối tác ngoài) KHÔNG được hưởng thay đổi này** — ADR-0014 điều 10 đã tách rõ năng lực đối tác hẹp hơn `FIELD`; ADR này không đụng tới.

## Lý do

- Nhu cầu là **vận hành thật và cụ thể**: người thu tiền phải biết số phải thu. Đây là loại thông tin ADR-0007 chưa cân nhắc vì khi đó `FIELD` chưa dùng màn hình đơn nào (ADR-0014 ghi rõ: *"Hướng dẫn viên nội bộ (quyền `FIELD`) chưa dùng được màn hình đơn nào"*).
- **Hai trường, không phải mở toang.** "Còn thu" là con số cần để làm việc; "đã trả" để đối chiếu khi khách nói đã đặt cọc. Giữ **tổng tiền** và **giá từng gói** trong vòng cấm nghĩa là hướng dẫn viên vẫn **không bàn giá với khách được** — đó là lý do gốc của bất biến cũ, và nó được giữ.
- Chủ dự án đã được trình ba mức (chỉ "còn thu" / "còn thu + đã trả" / xem đủ như văn phòng) và **chọn mức giữa**.

## Phương án bị loại

- **Giữ nguyên bất biến cũ, hướng dẫn viên gọi về văn phòng hỏi số tiền.** Đúng luật cũ nhưng đẩy chi phí sang vận hành mỗi chuyến; chủ dự án bác.
- **Chỉ hiện dấu "đã thanh toán đủ" / "còn nợ", không hiện số.** Nới hẹp hơn, nhưng không đủ để thu tiền mặt — vẫn phải hỏi số.
- **Cho `FIELD` xem đủ như nhân viên văn phòng.** Nới rộng nhất, không thu lại được, và làm mất lý do gốc của bất biến (không để hướng dẫn viên bàn giá với khách).
- **Dùng `/api/orders*` chung cho `FIELD`.** Phá nguyên tắc ADR-0007 điều 4(c) và mở ra bề mặt rộng hơn nhiều so với nhu cầu.

## Hệ quả

- **`MyAssignmentDto` thêm đúng hai trường** (`remainingAmount`, `depositAmount`). **Chú thích "không Pick/Omit từ `OrderDto`" ở `src/shared/contracts.ts` phải được sửa lại cho đúng sự thật mới** — nó đang nói tiền không bao giờ được lọt vào đây.
- **`GET /api/dispatch/mine`** phải tính hai số đó bằng **số hiện hành sau điều chỉnh**, không phải số gốc.
- **Cần một bài kiểm ghim bất biến CÒN LẠI**: phản hồi của `/api/dispatch/mine` **không được chứa** tổng tiền hay đơn giá dịch vụ. Đây là chỗ dễ trượt nhất khi sau này ai đó "tiện tay" thêm trường.
- **Giao diện**: màn "Việc của tôi" dùng lại thành phần thẻ đơn của Đợt E, bật phần tiền ở chế độ **chỉ "còn thu" + "đã trả"** (không có "tổng").
- **Không đổi bản đồ quyền `MATRIX`** (`src/shared/permissions.ts`): đây là mở rộng dữ liệu trả về của một route `FIELD` đã có, không phải thao tác mới.
- **Không hoàn tác được phần đã lộ**: sau khi phát hành, những số tiền hướng dẫn viên đã nhìn thấy là đã thấy. Gỡ mã thì chỉ chặn từ thời điểm gỡ.
