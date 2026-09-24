# ADR-0017 — Hướng dẫn viên nội bộ (`FIELD`) xem được mọi đơn, kể cả tiền; đối tác ngoài (`PARTNER`) giữ nguyên phạm vi hẹp

- **Trạng thái:** **accepted** — **chủ dự án duyệt trực tiếp trong phiên chat 2026-09-24**: AI trình toàn văn bản ghi này kèm mục "Rủi ro đã nêu", chủ trả lời **"duyệt"**. AI soạn theo yêu cầu trực tiếp của chủ và **không tự duyệt** (N3, Điều 7.2); dòng trạng thái này chỉ đổi sau khi có câu trả lời thật. Thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-24   **Người phê chuẩn:** chủ dự án (đã duyệt 2026-09-24)
- **Loại quyết định:** **cửa một chiều**. Đã cho một vai nhìn thấy danh sách khách và số tiền thì **không thu lại được** những gì họ đã thấy; gỡ mã chỉ chặn từ thời điểm gỡ. Phần mã thì gỡ được bằng một commit.
- **Liên quan:** **đảo ngược** ADR-0007 **điều 3** (bảng quyền: `FIELD` = "◆ không" ở dòng *"Xem tiền, bảng giá danh mục, nhật ký/lịch sử sửa đơn"*) và **điều 4(c)** (`FIELD` dùng route riêng, không dùng `/api/orders*` chung); **đảo ngược** phần tái khẳng định ở **ADR-0014 điều 6**; **không đụng** ADR-0014 điều 10 (`PARTNER`). Đặc tả giao diện: `docs/superpowers/specs/2026-09-23-dot-e-the-don-gon-va-bieu-tuong.md`.

## Bối cảnh

Luật hiện hành, đã hiện thực hoá trong mã (`src/shared/permissions.ts`):

| Thao tác | `FIELD` hôm nay | `PARTNER` hôm nay |
|---|---|---|
| `contact.view` (tên/SĐT khách, điểm đón, giờ) | `assigned` | `ownOrAssigned` |
| `task.progress` | `assigned` | `assigned` |
| `order.money.edit` | `assigned` | `none` |
| Vào được màn hình/API đơn (`canAccessOrders`) | **không** | có |

Và hai ADR đã duyệt cấm `FIELD` thấy tiền:
- **ADR-0007 điều 3:** `FIELD` = **◆ không** xem tiền, bảng giá, nhật ký/lịch sử đơn.
- **ADR-0014 điều 6** (accepted 2026-09-22) **tái khẳng định**: *"`FIELD` vẫn không xem tổng tiền, bảng giá hay lịch sử đơn ở **bất kỳ bề mặt nào**."*

Mã làm đúng thế: `MyAssignmentDto` viết độc lập, kèm chú thích nói rõ mục đích là để tiền *"không vô tình lọt vào đây"*; `GET /api/dispatch/mine` không gửi một trường tiền nào.

**Hai sự thật nghiệp vụ mới, do chủ dự án nêu 2026-09-24** — cả hai đều là thông tin các ADR trước **không có**:
1. *"HDV (nội bộ) phải xem được tiền để còn thu tiền mặt khi đón khách."* Hướng dẫn viên là người **trực tiếp nhận tiền mặt của khách tại điểm đón**.
2. *"HDV nội bộ thấy được tất cả đơn, HDV bên ngoài chỉ thấy được đơn của họ."* Tức chủ dự án phân biệt rõ **nhân sự nội bộ** (tin cậy, hợp đồng lao động) với **đối tác ngoài** — ranh giới mà ADR-0014 chưa tách theo hướng này (ADR-0014 siết cả hai vì lúc đó phát hiện tài khoản cấp cho **người ngoài** xem được mọi đơn, khiếm khuyết D-01).

## Quyết định

Chủ dự án được trình bốn mức phạm vi và hai lựa chọn màn hình, đã chọn:

1. **`FIELD` xem được MỌI đơn, kể cả tiền của mọi đơn** (chọn "Thấy mọi đơn, kể cả tiền của mọi đơn", bác các mức hẹp hơn: "tiền chỉ ở đơn mình dẫn", "chỉ đơn hôm nay/sắp tới", "giữ như cũ").
2. **Mở trang Đơn hàng (`/orders`) cho `FIELD`** (chọn "Mở trang Đơn hàng cho HDV", bác "mở rộng màn Việc của tôi"). Mục "Đơn hàng" xuất hiện trong thanh điều hướng của `FIELD`.
3. **`PARTNER` KHÔNG đổi một ô nào.** Đối tác ngoài giữ nguyên `own`/`ownOrAssigned` — đúng yêu cầu *"HDV bên ngoài chỉ thấy được đơn của họ"*, vốn đã là luật hiện hành.
4. **Chỉ mở quyền XEM.** `FIELD` **không** được thêm `order.create`, `order.modify` (sửa/xác nhận/huỷ đơn nháp), `order.trip.edit`, hay bất kỳ quyền quản trị nào. Các quyền sửa của `FIELD` giữ nguyên đúng ADR-0014 điều 6/11 (`order.money.edit` và `order.cancel`, phạm vi `assigned`).
5. **Số tiền là số HIỆN HÀNH sau điều chỉnh** (`getLatestAdjustmentSubtotals()` + `effectiveMoney()`), tính ở **máy chủ**.
6. **Không đổi phạm vi của các vai khác** (`SALES`, `ACCOUNTING`, `ADMIN`, `SUPER_ADMIN`).

## Lý do

- Nhu cầu vận hành là thật và cụ thể: người thu tiền phải biết số phải thu; người dẫn tour phải xem được lịch cả công ty để đổi ca, dẫn thay đồng nghiệp.
- **Ranh giới "nội bộ vs ngoài" là ranh giới đúng để phân quyền ở đây.** Khiếm khuyết D-01 mà ADR-0014 bịt là *"cấp tài khoản Bán hàng cho **người ngoài**"*. `FIELD` là nhân sự nội bộ; chủ dự án — người chịu trách nhiệm về nhân sự — đánh giá mức tin cậy đó là đủ.
- Dùng lại `/orders` thay vì dựng màn mới: ít mã mới nhất, và màn đó đã có tìm kiếm, lọc, phân trang, thẻ đơn rút gọn 2 dòng vừa làm ở Đợt E.

## Rủi ro đã nêu cho chủ dự án, chủ vẫn quyết (ghi để sau này không ai nói "không biết")

**Một hướng dẫn viên nghỉ việc sẽ đã kịp xem toàn bộ danh sách khách hàng (tên, số điện thoại) và toàn bộ số tiền từng đơn của công ty.** Câu này được nêu nguyên văn trong lựa chọn mà chủ dự án đã chọn. Đây là **cửa một chiều**: sau khi phát hành, dữ liệu đã xem không thu lại được.

Giảm nhẹ khả dĩ (**không** thuộc quyết định này, ghi để cân nhắc sau): tắt tài khoản ngay khi nhân sự nghỉ (`staff.active` đã có); nhật ký truy cập; giới hạn theo thời gian nếu sau này thấy cần.

## Phương án bị loại

- **Giữ nguyên bất biến cũ.** Đúng luật cũ nhưng đẩy chi phí sang vận hành mỗi chuyến (gọi về văn phòng hỏi số tiền); chủ dự án bác.
- **Thấy mọi đơn nhưng tiền chỉ ở đơn mình dẫn.** Giữ được lý do gốc của bất biến (hướng dẫn viên không bàn giá với khách) — **AI khuyến nghị mức này**; chủ dự án bác, chọn mức rộng hơn.
- **Chỉ hiện dấu "đã thanh toán đủ / còn nợ", không hiện số.** Không đủ để thu tiền mặt.
- **Giới hạn theo thời gian (chỉ đơn hôm nay/sắp tới).** Hẹp hơn, nhưng chủ dự án chọn không giới hạn.
- **Mở rộng màn "Việc của tôi" thay vì mở `/orders`.** Phải làm lại tìm kiếm/lọc/phân trang từ đầu.

## Hệ quả

- **`src/shared/permissions.ts`:** `isOffice`/`canAccessOrders` phải cho `FIELD` vào màn hình và API đơn; ô `contact.view` của `FIELD` đổi `assigned` → `any`. **Đây là tệp "việc lớn" theo `CLAUDE.md` §3 — bắt buộc có người kiểm độc lập.**
- **`web/shell.ts`:** mục "Đơn hàng" hiện cho `FIELD` (thanh bên và thanh tab). Các mục quản trị **vẫn không** hiện.
- **Bài kiểm ghim phạm vi** phải đổi theo, và phải có bài kiểm mới ghim đúng ranh giới mới: `FIELD` **có** thấy đơn người khác; `PARTNER` **vẫn không**. Đây là chỗ dễ trượt nhất — một thay đổi sau này rất dễ vô tình nới luôn cho `PARTNER`.
- **`MyAssignmentDto` / `GET /api/dispatch/mine`:** màn "Việc của tôi" giữ nguyên vai trò (việc được giao). Nếu muốn hiện tiền ở đó thì thêm `remainingAmount`/`depositAmount`; **chú thích "không Pick/Omit từ `OrderDto`" trong `src/shared/contracts.ts` phải sửa lại cho đúng sự thật mới** — nó đang nói tiền không bao giờ được lọt vào đây.
- **Trang chủ (`/home`, access `office`):** mở `office` cho `FIELD` thì `FIELD` cũng vào được Trang chủ. Ô "Doanh thu của tôi" tính theo người xem nên vẫn đúng; ba ô số liệu là **toàn công ty**. **Chủ dự án đã được nêu điểm này và đồng ý** (2026-09-24, cùng lượt duyệt): mọi con số trên Trang chủ đều suy ra được từ danh sách đơn mà `FIELD` nay xem được, nên không lộ thêm gì.
- **Không migration, không đổi schema.**
- **Không hoàn tác được phần đã lộ.**
