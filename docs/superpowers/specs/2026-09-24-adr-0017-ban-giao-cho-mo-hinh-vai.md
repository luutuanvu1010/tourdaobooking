# Bàn giao: ADR-0017 đã duyệt — việc thi công chuyển sang phiên làm mô hình 11 vai

**Ngày:** 2026-09-24 · **Người bàn giao:** phiên "thiết kế lại giao diện" (Đợt D/E) · **Người nhận:** phiên đang thiết kế
**mô hình người–vai–quyền (11 vai)**.

**Chủ dự án quyết (2026-09-24):** *"b, để phiên kia làm luôn cho đồng bộ"* — tức **KHÔNG sửa bản đồ quyền ở nhánh
Đợt E**; việc mở quyền cho hướng dẫn viên do phiên mô hình vai thi công cùng lúc với thiết kế 11 vai, để chỉ có
**một** phiên bản của `src/shared/permissions.ts`.

---

## 1. ADR-0017 ĐÃ ĐƯỢC CHỦ DỰ ÁN DUYỆT — không phải bản nháp

`docs/adr/ADR-0017-huong-dan-vien-xem-tien-can-thu.md`, **accepted**, chủ dự án duyệt **trực tiếp trong phiên chat
2026-09-24** (trả lời "duyệt" sau khi được trình toàn văn). Đã có hàng trong `docs/adr/README.md`.

**Nội dung bắt buộc phải giữ khi bạn thiết kế 11 vai:**

| Điều | Nội dung |
|---|---|
| 1 | **`FIELD` (HDV nội bộ) xem được MỌI đơn, KỂ CẢ TIỀN của mọi đơn.** Chủ đã bác ba mức hẹp hơn: "tiền chỉ ở đơn mình dẫn", "chỉ đơn hôm nay/sắp tới", "giữ như cũ". |
| 2 | **Mở trang Đơn hàng (`/orders`) cho `FIELD`**; mục "Đơn hàng" hiện trong thanh điều hướng của họ. Chủ đã bác phương án "mở rộng màn Việc của tôi". |
| 3 | **`PARTNER` KHÔNG đổi một ô nào** — *"HDV bên ngoài chỉ thấy được đơn của họ"*. |
| 4 | ADR-0017 **chỉ mở quyền XEM**. Nó **không** thêm `order.create`/`order.modify` cho `FIELD`. |
| 5 | Số tiền là **số HIỆN HÀNH sau điều chỉnh**, tính ở máy chủ. |

**Chủ cũng đã xác nhận trong cùng lượt:** `FIELD` vào được **Trang chủ** với ba ô số liệu **toàn công ty** — đồng ý,
vì mọi con số đó suy ra được từ danh sách đơn mà `FIELD` nay xem được.

## 2. ADR-0017 ĐẢO NGƯỢC các bất biến cũ — đừng cố bảo toàn chúng nữa

Đây là điểm quan trọng nhất cho thiết kế của bạn. Trước ADR-0017, hai ADR đã duyệt cấm `FIELD` thấy tiền:
- **ADR-0007 điều 3** (bảng quyền: `FIELD` = "◆ không" ở dòng *"Xem tiền, bảng giá danh mục, nhật ký/lịch sử sửa đơn"*)
- **ADR-0007 điều 4(c)** (`FIELD` dùng route riêng, **không** dùng `/api/orders*` chung)
- **ADR-0014 điều 6** tái khẳng định: *"`FIELD` vẫn không xem tổng tiền, bảng giá hay lịch sử đơn ở bất kỳ bề mặt nào."*

**Cả ba điều trên nay đã bị ADR-0017 đảo ngược.** Nếu thiết kế 11 vai của bạn vẫn giữ "HDV không xem tiền" thì nó
**trái ADR đã duyệt mới nhất**.

## 3. Giao nhau với 5 quyết định bạn đã có

| Quyết định của bạn | Giao nhau |
|---|---|
| "MỌI vai nội bộ lên đơn được, kể cả HDV nội bộ" | **Rộng hơn ADR-0017 điều 4.** Không xung đột (ADR-0017 chỉ nói nó không tự thêm), nhưng bảng 11 vai của bạn là nơi chốt `order.create` cho HDV. Ghi rõ trong ADR mới của bạn rằng nó **thêm** vào ADR-0017. |
| "Cách A: vai quyết định bộ quyền mặc định" | Đây là lý do chủ chọn để bạn làm: cơ chế mới thay bảng `MATRIX` hiện tại. ADR-0017 phải được **hấp thụ vào bộ quyền mặc định của vai "HDV nội bộ"**, không hiện thực hoá riêng lẻ. |
| "HDV độc lập KHÔNG nhận đơn" | Khớp ADR-0017 điều 3 (`PARTNER` không đổi). |
| "Công ty lữ hành: một tài khoản chung" | Không giao nhau. |
| "Thu tiền mặt tại cảng: đợt sau" | Liên quan gián tiếp — ADR-0017 sinh ra chính vì HDV thu tiền mặt khi đón khách. |

## 4. Việc kỹ thuật cụ thể còn phải làm (ADR-0017 chưa thi công một dòng nào)

- `src/shared/permissions.ts`: `isOffice`/`canAccessOrders` cho `FIELD` vào màn hình + API đơn; ô `contact.view` của
  `FIELD` đổi `assigned` → `any`. **Tệp "việc lớn" (`CLAUDE.md` §3) — bắt buộc người kiểm độc lập.**
- `web/shell.ts`: mục "Đơn hàng" hiện cho `FIELD`; các mục quản trị **vẫn không**.
- **Bài kiểm ghim ranh giới MỚI**: `FIELD` **có** thấy đơn người khác; `PARTNER` **vẫn không**. Đây là chỗ dễ trượt
  nhất — một thay đổi sau này rất dễ vô tình nới luôn cho `PARTNER`.
- `src/shared/contracts.ts`: chú thích của `MyAssignmentDto` đang nói *"không `Pick`/`Omit` từ `OrderDto` … để một
  lần đổi kiểu dữ liệu đơn sau này (thêm trường tiền) không vô tình lọt vào đây"* — **đã lỗi thời sau ADR-0017**,
  sửa cho đúng sự thật khi bạn chạm vào (`CLAUDE.md` §2: tài liệu mô tả thua mã).
- Nếu muốn hiện tiền ở màn "Việc của tôi": thêm `remainingAmount`/`depositAmount` vào `MyAssignmentDto` và tính
  bằng số hiện hành sau điều chỉnh.

## 5. Thứ đã LÀM SẴN cho bạn dùng lại (nhánh `dot-e-the-don-gon-va-bieu-tuong`)

- **`web/order-card.ts`** — thành phần thẻ đơn rút gọn **2 dòng + nút xổ xuống**, đã đo thật **76px, đúng 2 dòng ở cả
  390px và 1040px**. Đã nối vào `/orders`.
- Thành phần này có **tham số `money`**, trong đó chế độ **`"no-total"`** đã làm sẵn (hiện "còn thu" + "đã trả",
  **không** hiện tổng) — dựng ra đúng để màn HDV dùng lại. **Cố ý CHƯA nối vào `web/account.ts`.**
- Biểu tượng cho Trang chủ đã xong (`web/icons.ts` + `web/home.ts`).
- Đặc tả: `docs/superpowers/specs/2026-09-23-dot-e-the-don-gon-va-bieu-tuong.md` (có 4 quyết định của chủ).

## 6. Rủi ro chủ dự án ĐÃ được nêu và vẫn quyết — đừng nêu lại (P18)

**Một hướng dẫn viên nghỉ việc sẽ đã kịp xem toàn bộ danh sách khách hàng (tên, số điện thoại) và toàn bộ số tiền
từng đơn của công ty.** Câu này nằm nguyên văn trong lựa chọn chủ đã chọn, và được ghi ở mục "Rủi ro" của ADR-0017.
Chủ đã nghe và vẫn quyết ⇒ thi hành, không nhắc lại.

Giảm nhẹ khả dĩ (**không** thuộc ADR-0017, chỉ ghi để cân nhắc): tắt tài khoản ngay khi nhân sự nghỉ
(`staff.active` đã có); nhật ký truy cập.

## 7. Trạng thái nhánh và production khi bàn giao

- Nhánh `dot-e-the-don-gon-va-bieu-tuong` tách từ `main` **`3de1249`**; `main` **đã tiến lên `36ade75`** (bản sửa
  `homeRedirect` cho tài khoản chỉ-PARTNER, đã lên production 2026-09-24 06:48, Worker `feed0f32`). Nhánh Đợt E
  **chưa gộp main mới**.
- **Đừng khẳng định trạng thái production từ tài liệu này** (`CLAUDE.md` §8) — kiểm bằng GET công khai hoặc lệnh
  chỉ đọc tại thời điểm cần.
