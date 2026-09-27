# ADR-0023 — Hướng dẫn viên chỉ thấy đơn chờ nhận và đơn của mình; sửa được số khách và dịch vụ của đơn đã nhận

- **Trạng thái:** **accepted phần điều 1, 2, 4** — chủ dự án duyệt 2026-09-27 cùng ADR-0030 ("duyệt cả hai lượt luôn"; lời duyệt do điều phối chuyển lại nguyên văn).
  - **Điều 1–2 ("xem")** theo ADR-0030 lượt 1 (D1): dòng S23-1…S23-5, S23-8.
  - **Điều 4** theo ADR-0030 lượt 2 (D6): dòng S23-9 — "Khác" không kèm ô chữ.
  - Các dòng "nguyên văn → mới" của ADR-0030 Mục S23 đã chép vào tệp này ngày 2026-09-27, mỗi chỗ ghi "(ADR-0030 S23-x)".
  - **Điều 3, 5, 6, 7, 8 giữ proposed**: kế hoạch thi công quyết định chỉ làm S23-9 ở lượt này; điều 3, 5–8 để kế hoạch riêng sau.

  Lịch sử: **proposed** — AI soạn 2026-09-25 từ các câu trả lời của chủ dự án trong phiên chat 2026-09-25 (mục "Nguồn" dưới). Chủ đã quyết hướng; **hai câu C1, C2 còn mở**. AI **không tự duyệt** (N3, Điều 7.2). AI đã nhắc một lần (P18) rằng quyết định này đảo một phần ADR-0017 (duyệt 24/9) và ADR-0014 điều 6; chủ đã nghe và vẫn quyết.
- **Ngày:** 2026-09-25   **Người phê chuẩn:** chủ dự án (đã duyệt phần điều 1, 2, 4 ngày 2026-09-27)
- **Loại quyết định:** **cửa hai chiều** về quyền (đổi ô bản đồ quyền + route), **nhưng** phần "hướng dẫn viên xem SĐT/tiền sau khi nhận" là cửa một chiều theo nghĩa ADR-0017 (dữ liệu đã xem không thu lại được) — hẹp hơn ADR-0017 nên rủi ro giảm.
- **(ĐÃ ĐÓNG 2026-09-25 — DK-T2-01 đã vá, lên production bản 1.13; giữ đoạn dưới làm lịch sử)** ~~Xây trên lỗ đang hở: DK-T2-01 (CRITICAL)~~ — kiểm toán điểm khuất 24/9 (`docs/AUDIT-2026-09-24-DIEM-KHUAT.md`, nhánh `claude/tourdao-sales-audit-62ea81`): HDV lưu "sửa số khách" (kể cả không đổi) làm **mất giá thoả thuận**, tính lại theo giá niêm yết (`src/modules/orders/money-adjustment.ts:24` gọi `buildLines` không truyền đơn giá thoả thuận; `order_item.unit_price` không được đọc) — **đã kiểm lại 2026-09-25 trên origin/main a1f6753: vẫn còn**. Điều 3 của ADR này (HDV sửa khách/dịch vụ) mở rộng đúng đường lỗi đó → **không duyệt, không thi công trước khi DK-T2-01 được vá** (hoặc chủ gia hạn có lý do). Chưa có mục trong `docs/quyen-hoan.json` (luật "dừng dây chuyền" đòi có).
- **Xây trên lỗ đang hở (ADR-0030 S23-7): điều kiện đã thoả.** GĐ2 Phần B (ADR-0019) lên bản 1.18; hai mục `money.view`, `contact.view` không còn trong `docs/quyen-hoan.json`. Trước đây ghi: "Xây trên lỗ đang hở: `money.view`, `contact.view` … Không được duyệt trước khi ADR-0019 (vá hai ô) lên production".
- **Bước ghép khi duyệt** (CLAUDE.md §9): trang ghép và cách đếm quyết định nằm ở ADR-0030 (mục "Trang ghép", "Đếm quyết định"). Theo ADR-0030 S23-6, ADR này được tách hai phần: **"xem"** (điều 1–2, lượt 1) và **"sửa"** (điều 3–8, lượt 2).

## Nguồn (chủ dự án, phiên chat 2026-09-25)

- (5) "HDV chỉ thấy đơn chưa có HDV nào nhận hoặc đơn của chính mình; Quản trị viên hoặc Superadmin hoặc giám đốc thì thấy tất cả đơn." — câu 1 = **A** (đơn chờ nhận chỉ thấy đủ để quyết nhận; nhận xong mới thấy SĐT khách và tiền); câu 2 = **giữ** (Kinh doanh, Kế toán vẫn thấy tất cả).
- (6) "HDV luôn có quyền sửa đơn mà mình đã nhận, kể cả số lượng khách và loại hàng hoá dịch vụ … tăng 2 người thì phản ánh tăng 2, giảm 1 khách thì báo giảm 1 khách. Nếu khách huỷ thì báo huỷ đơn." — câu 3 = theo khuyến nghị (sửa mọi lúc trừ đơn đã huỷ); câu 4 = **có lý do, chọn nhanh**; câu 5 = **A, nhưng phần tăng/giảm hiện ở lịch sử chỉnh sửa; biên nhận vẫn là con số đã cập nhật**; câu 6 = nhãn "Đã sửa" **và** thông báo nổi cho người lập + Kế toán.

## Sửa những câu nào của quyết định đã duyệt

| Nguồn | Hiện hành | Sau ADR-0023 |
|---|---|---|
| ADR-0017 điều 1 | `FIELD` xem **mọi** đơn, kể cả tiền | `FIELD` xem: (a) đơn **chưa có người phụ trách** — chỉ phần để quyết nhận; (b) đơn **mình đang phụ trách** — đủ, kể cả SĐT khách và tiền. Không thấy đơn người khác đang phụ trách. |
| ADR-0017 điều 2 | mở `/orders` cho `FIELD` | giữ, danh sách lọc theo điều 1 |
| ADR-0017 điều 4 | `FIELD` chỉ XEM; không `order.modify` | `FIELD` **sửa được số khách và dịch vụ** (thêm/bớt dịch vụ) của đơn **mình đang phụ trách**, trừ đơn đã huỷ. Xác nhận: **C1**. Sửa thông tin chuyến (`order.trip.edit`): không đổi ở ADR này. |
| ADR-0014 điều 6 (cấp hẹp) | chỉ đổi số khách của dịch vụ **đã có**, chỉ **sau xác nhận**, không lộ giá | thêm/bớt dịch vụ; cả đơn nháp (theo **C2**); giá hiện cho `FIELD` ở đơn mình phụ trách (khớp điều 1b). Ba bất biến ADR-0007 điều 2 **giữ** cho đơn đã xác nhận: lý do bắt buộc, bản ghi trước→sau chỉ-thêm, tiền tính lại ở máy chủ + chênh lệch với tiền đã thu đánh dấu cho Kế toán. |
| ADR-0020 điều 5 | HDV đã nhận đơn nháp chỉ xem | theo điều 3 dưới và **C1/C2** |
| **ADR-0019** (accepted) điều 1 bảng dòng `orders`, điều 3 **(ADR-0030 S23-5)** | "`FIELD` **chỉ khi** ADR-0017 được thi công (điều 3)" / "ô `money.view` của `FIELD` là `any`" | "`FIELD` vào cổng `orders` khi **phần xem của ADR-0023 (điều 1–2)** được thi công; `money.view` của `FIELD` = `assigned`." Hướng dẫn viên vẫn không đọc được bảng giá (đúng ý ADR-0019 điều 3). ADR-0033 đã gộp trên `main`:<br>• `GET /api/catalog` ở cổng `office`: HDV 403 ở cổng.<br>• `GET /api/catalog/for-order` hỏi `can(order.create)`: `FIELD` = `none`, nên 403 ở thân route. |

**Không đổi:** `SALES`, `ACCOUNTING`, `ADMIN`, `SUPER_ADMIN` (Giám đốc = Toàn quyền, ADR-0018 điều 4) thấy mọi đơn. `PARTNER` không đổi. Huỷ của `FIELD` (ADR-0014 điều 11, lý do từ danh sách đóng) giữ.

## Quyết định

1. **Hướng dẫn viên thấy đơn nào.** Máy chủ lọc (không chỉ giao diện).
   - **Cách đặt quyền (ADR-0030 S23-1, Q-I cách (i)):**
     - thao tác mới **`order.pool.view`**: `FIELD` = `any`, `SUPER_ADMIN` = `any`, còn lại `none`. `ADMIN` = `none` nghĩa là thêm `order.pool.view` vào `ADMIN_NONE_OPS` (`src/shared/permissions.test.ts:177`), vì Quản trị đã thấy đủ mọi đơn qua `order.view`;
     - `order.view`, `money.view`, `contact.view`, `order.history.view` của `FIELD` = **`assigned`**;
     - không thêm phạm vi thứ sáu cho `Scope`.
   - **Đơn chưa có người phụ trách:** chỉ phần đủ để quyết nhận — mã đơn, ngày đi, dịch vụ, số khách, nơi đón/giờ đón. **Không** SĐT/tên liên hệ khách, **không** tiền, **không** lịch sử. **(ADR-0030 S23-2)** Thêm:
     - Dựng từ **danh sách trường được phép** ở máy chủ (Hiến chương 4.4).
     - Nơi đón (`order_service.pickup_place`, chữ tự do) **che mọi dãy từ 8 chữ số** trở lên, đếm sau khi bỏ dấu cách/chấm/gạch.
     - Là **ngoại lệ có tên** của chú thích ô `contact.view` (`src/shared/permissions.ts:51` gộp "điểm đón, giờ" vào liên hệ).
     - Chỉ gồm đơn không có dòng `HANDLE` mở, chưa huỷ, chưa qua ngày đi. Tập "đơn đang có người" lấy qua hàm công bố của `dispatch` hoặc tiêm qua `ctx`, không có SQL của `orders` đọc `v_dsp_*`.
     - Tài khoản lai (có quyền Đối tác kèm quyền khác) không thấy.
     - Bài khoá `src/shared/cong-quyen.test.ts:19` chỉ canh `order.view`/`money.view`, nên thêm **một bài kiểm riêng** cho phần hẹp và một dòng ở `docs/SO-HANG-RAO.md`.
   - **Đơn mình đang phụ trách:** đủ như người lập thấy, kể cả SĐT khách và tiền (hiện hành sau điều chỉnh, máy chủ tính), **(ADR-0030 S23-3)** **kể cả lịch sử** (`order.history.view` = `assigned`).
     - **(ADR-0030 S23-8)** Danh sách "Đơn của tôi" có **cả đơn nháp** mình đang phụ trách.
     - Route: `GET /api/dispatch/mine` (cổng `staff`, đã hỏi `contact.view` phạm vi "được giao"). Bỏ lọc "chỉ đơn đã xác nhận" trong `getMyAssignments` (`src/modules/orders/index.ts:141`), giữ lọc chưa huỷ. Đây là đổi hợp đồng `orders`↔`dispatch`, test đỏ trước.
     - Dữ liệu trả về thêm trường trạng thái đơn. Giao diện "Việc của tôi" (`web/account.ts:384-444`) **ẩn** nút "Huỷ đơn này" và "Lưu số khách mới" với đơn nháp cho tới khi lượt 2 mở các việc đó.
   - **Đơn người khác đang phụ trách:** không thấy (404, như đơn không tồn tại). Đơn mình **từng** phụ trách rồi bị đổi **hoặc tự Từ chối (ADR-0030 S23-4)**: không thấy nữa (404), nhưng thấy lại ở hàng chờ dạng phần hẹp. Áp cho hướng dẫn viên (chỉ quyền `FIELD`); người có `order.view = any` không đổi.
     - Chi tiết đơn HDV không được xem: **404** (hôm nay 403, `src/modules/orders/index.ts:241`).
     - **Bẫy:** `GET /api/orders` lọc "người lập = tôi" khi `can(order.view)` không ngữ cảnh trả sai (`src/modules/orders/index.ts:189-193`); với `FIELD` = `assigned` danh sách sẽ **403**. Cần **nhánh lọc thứ ba** theo người phụ trách, lấy tập đơn qua hàm công bố của `dispatch` tiêm qua `ctx`, như `ctx.isAssigned`. **Không** thêm SQL của `orders` đọc `v_dsp_order_handler`.
     - `homeRedirect` (`src/shared/start-page.ts:16`) sẽ chuyển tài khoản chỉ-`FIELD` sang `/orders`, nên nhánh lọc thứ ba phải ra cùng lần phát hành.
2. **Người khác không đổi:** Kinh doanh, Kế toán, Quản trị, Toàn quyền/Giám đốc thấy tất cả; Đối tác chỉ đơn mình lập.
3. **Hướng dẫn viên sửa đơn mình đang phụ trách** — số khách (tăng/giảm) và dịch vụ (thêm/bớt, chọn từ danh mục) — ở mọi trạng thái trừ **đã huỷ**. Tiền **luôn** do máy chủ tính (`buildLines`, giá chụp lúc lập với dịch vụ đã có; dịch vụ thêm mới lấy giá danh mục lúc thêm), không nhận tiền từ trình duyệt. Huỷ vẫn theo ADR-0014 điều 11.
4. **Lý do chọn nhanh** mỗi lần sửa (đơn đã xác nhận — phạm vi theo **C2**): "Khách thêm người", "Khách bớt người", "Đổi dịch vụ", "Khác". **(ADR-0030 S23-9)** "Khác" **không kèm ô chữ**.
   - Trước đây ghi: "Khác (kèm ghi chú ngắn khi chọn 'Khác')".
   - Lý do bỏ: hôm nay lý do sửa số khách của HDV là chữ tự do (`src/modules/orders/money-adjustment.ts:86-87`), ghi thẳng vào `audit_log.detail` (`src/modules/orders/repository.ts:906`) mà không lọc SĐT/email/MST (lỗ #19 / T3d của báo cáo rà cấu trúc 2026-09-27). Nhật ký chỉ-thêm thì lỡ ghi không gỡ được.
   - Route `handler-money-edit` đổi sang nhận **mã lý do** trong danh sách đóng; lý do ngoài danh sách → 400.
5. **Lịch sử chỉnh sửa** (không phải biên nhận) hiện thay đổi **so với bản đã xác nhận với khách**, dạng lời thường: "Người lớn: 4 (tăng 2)", "Trẻ em: 1 (giảm 1)", "Thêm: Lặn biển", "Bỏ: Tour 3 đảo", "Đã huỷ — Khách yêu cầu huỷ"; kèm ai sửa, lúc nào, lý do. Dữ liệu từ các dòng điều chỉnh chỉ-thêm (ADR-0007 điều 2), không sửa đè.
6. **Biên nhận** luôn là **con số hiện hành** (sau mọi điều chỉnh), không ghi tăng/giảm. Đơn huỷ: trạng thái "Đã huỷ" (đã có).
7. **Nhãn "Đã sửa"** cạnh trạng thái (vd "Đã xác nhận · Đã sửa") khi đơn đã xác nhận có ít nhất một dòng điều chỉnh — nhãn, **không** phải trạng thái. **Tập trạng thái sẽ đổi** vì chủ thêm "Hoàn thành" (trả lời C1, dưới) — quyết định riêng theo đặc tả `docs/superpowers/specs/2026-09-25-hoan-tat-don-va-so-ke-toan.md`, không thuộc ADR này.
8. **Thông báo nổi** (qua Bảng tin, ADR-0022) tới **người lập đơn** và **Kế toán** mỗi khi hướng dẫn viên đổi số khách/dịch vụ: "Đơn TD-0123: HDV đổi số khách (tăng 2)". Bổ sung Q-B của ADR-0022 (loại "tiền/sửa" do HDV làm thì **hiện**, không chỉ làm mới). Người khác: chỉ làm mới.

## Câu hỏi mở — chủ đã trả lời (2026-09-25)

- **C1 → chủ mở rộng thành bước mới "Hoàn tất":** *"Hướng dẫn viên sau khi thay đổi đơn có thể bấm xác nhận để CHUYỂN TRẠNG THÁI ĐƠN LÀ HOÀN THÀNH. Lúc này đơn không thể thay đổi bất cứ thông tin nào, và là bất biến"*, kèm ghi nhận kế toán (HDV nợ công ty đúng số đã thu của khách; khách hết nợ) và các giao dịch đại lý/hoa hồng. Việc này vượt phạm vi ADR-0023 (trạng thái mới + sổ tiền + giá theo vai) → tách sang đặc tả `docs/superpowers/specs/2026-09-25-hoan-tat-don-va-so-ke-toan.md` và các ADR riêng. **Chưa rõ, đã đưa vào câu hỏi của đặc tả:** ai bấm "Xác nhận" (chốt với khách) và "Hoàn tất" có là hai bước khác nhau không.
- **C2:** *"Chọn lý do trước khi bấm xác nhận chứ. Và ghi lịch sử tự động bởi hệ thống sau khi bấm xác nhận."* → hộp sửa bắt **chọn lý do trước khi lưu**; hệ thống **tự ghi lịch sử** khi lưu. Áp **cả đơn nháp** — chủ xác nhận 2026-09-25 (câu 8a của đặc tả Hoàn tất): mọi lần HDV sửa đều chọn lý do trước khi lưu. (Với đơn nháp, lịch sử ghi lý do + ai/lúc nào; phần "tăng/giảm so với bản đã xác nhận" chỉ có từ khi đơn đã xác nhận.)

(Nguyên văn câu hỏi trước khi chủ trả lời, giữ làm lịch sử:)

- **C1 — Hướng dẫn viên đã nhận đơn có tự bấm "Xác nhận" (chốt với khách) được không?** Khuyến nghị: **có** (ADR-0018 điều 7: "người nhận xác nhận và chăm sóc đơn"); người lập và Quản trị vẫn xác nhận được.
- **C2 — Lý do bắt buộc và lịch sử tăng/giảm áp từ lúc nào?** Khuyến nghị: **chỉ sau khi đã xác nhận**; đơn nháp sửa thẳng như người lập (không lý do, không dòng lịch sử), mốc so sánh = bản lúc xác nhận.

## Hệ quả (sơ bộ — kế hoạch thi công viết sau khi duyệt)

- `src/shared/permissions.ts` **(ADR-0030 S23-1)**:
  - thao tác mới `order.pool.view` (`FIELD`, `SUPER_ADMIN` = `any`);
  - `order.view`, `money.view`, `contact.view`, `order.history.view` của `FIELD` = `assigned`;
  - test khoá bảng + test hàng rào "ô được máy chủ hỏi" (Sổ hàng rào).
  - Trước đây ghi: "cần một phạm vi mới ('chờ nhận hoặc đang phụ trách') hoặc route riêng lọc ở máy chủ — chọn ở kế hoạch".
- `order.money.edit` của `FIELD` mở rộng sang thêm/bớt dịch vụ (và nháp theo C2); `order.confirm` tách ô theo C1.
- Lịch sử chỉnh sửa: dựng từ dòng điều chỉnh (`order_money_adjustment`) — kiểm xem bảng hiện có lưu được "thêm/bớt dịch vụ" không; nếu phải đổi bảng → migration (việc lớn, expand–contract).
- Bảng tin (ADR-0022): hướng dẫn viên nhận tin về đơn chờ nhận (tag riêng) + đơn mình phụ trách; khi đơn có người nhận, nó biến khỏi danh sách của các HDV khác ngay.
- Việc lớn (quyền + tiền + có thể dữ liệu) → người kiểm độc lập chỉ đọc sau thi công; e2e mới cho: HDV không thấy đơn người khác (404), không thấy SĐT/tiền của đơn chờ nhận, sửa được đơn mình nhận, tiền tính lại ở máy chủ.
