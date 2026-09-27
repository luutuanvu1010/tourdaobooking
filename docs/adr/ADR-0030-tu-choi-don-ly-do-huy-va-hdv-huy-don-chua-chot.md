# ADR-0030 — Người phụ trách "Từ chối" đơn (đơn về Chờ nhận, thay LC-8); mọi lần Từ chối/Huỷ có lý do; hướng dẫn viên huỷ được đơn chưa chốt

- **Trạng thái:** **proposed** — AI soạn 2026-09-27 (vai lập kế hoạch) từ đặc tả `docs/superpowers/specs/2026-09-26-don-tu-do-hdv-nhan-tu-choi-design.md` (dưới đây gọi "đặc tả"); chủ dự án đã trả lời mọi câu hỏi mở ngày 2026-09-26/27 (đặc tả §0, §1, §9A). **Trả lời của chủ CHƯA phải là duyệt ADR này.** Các điểm sau đổi quyết định đã duyệt, nên phải qua lượt duyệt có trang ghép (`CLAUDE.md` §9):
  - Q-B: thay LC-8 (ADR-0018 điều 5);
  - Q-C;
  - Q-G: ADR-0014 điều 11;
  - Q-K: ADR-0022 điều 3;
  - ADR-0022 mục "Trả lời của chủ" Q-B: thêm "đơn vừa được trả lại" vào danh sách hiện nổi;
  - "Giao có hiệu lực ngay": ADR-0018 điều 7.

  AI **không tự duyệt** (N3, Điều 7.2). Sau khi accepted chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-27   **Người phê chuẩn:** chủ dự án (chưa duyệt)
- **Loại quyết định:** **cửa hỗn hợp.**
  - Hai chiều: mã, route, ô quyền, nhãn.
  - **Một chiều:** SĐT/tiền hướng dẫn viên đã xem qua "nhận rồi từ chối"; **mỗi lần huỷ đơn**; dòng nhật ký chỉ-thêm.

  Chi tiết: mục "Loại cửa".
- **Hai phần, hai lượt duyệt:**
  - **Điều 1–5** trình ở **lượt 2**.
  - **Mục S20** (sửa bản nháp ADR-0020) và **Mục S23** (sửa bản nháp ADR-0023) là đề xuất trình ở **lượt 1**, cùng ADR-0020 và phần "xem" của ADR-0023.

  Xem mục "Đếm quyết định". Tên "S20/S23" để khỏi lẫn với "Phần A–E" của kế hoạch GĐ2 (`docs/superpowers/plans/2026-09-25-gd2-thi-cong.md`); ở ADR này "GĐ2 Phần B" luôn là phần thi công ADR-0019.
- **Hiến chương áp (Điều 6.1):** 1.2, 4.1 (căng — điều 3), **5.1 (lệch có chủ ý — điều 4 và S20-5)**, 5.3, 5.5, 5.8 (khớp — điều 1), 5.10, 5.12, 5.13, 6.3.
- **Xây trên lỗ đang hở: không.** `docs/quyen-hoan.json` trên `main` dc4b4f9 (đọc 2026-09-27):
  - **đã gỡ** (GĐ2 Phần B, ADR-0019): `money.view`, `contact.view`, `admin.manage` và `PUT /api/maintenance`;
  - còn hoãn: `task.progress`, `dispatch.guides.view` (hạn 2026-11-30), `payment.receive`, `payment.refund`, `invoice.request`, `invoice.issue` (hạn 2026-12-31) và 7 ngoại lệ tự phục vụ `/api/account/*`;
  - `phat_hien` rỗng.

  ADR này không chạm mục nào trong số đó.
- **Dẫn chứng mã** theo `main` dc4b4f9 (bản 1.18). Nhiều số dòng trong đặc tả viết **trước** GĐ2 Phần B nên đã lệch; người thi công dùng số dòng ở ADR này.

## Tóm tắt cho chủ (lời thường)

- **Làm gì:**
  - Hướng dẫn viên, hay nhân viên đang lo một đơn, bấm được **"Từ chối"** để trả đơn mình đang lo. Đơn quay về danh sách **"Chờ nhận"** cho người khác nhận.
  - Không trả được khi đơn đã huỷ, hoặc khi ngày đi là hôm nay hay ngày mai. Lúc đó phải gọi văn phòng đổi người.
  - Mọi lần **Từ chối** hay **Huỷ** phải chọn một lý do có sẵn. Không có ô gõ chữ, để số điện thoại không lọt vào nhật ký (nhật ký không xoá được).
  - Hướng dẫn viên huỷ được cả đơn **chưa chốt** mình đang lo (hôm nay chỉ huỷ được đơn đã chốt), vẫn chỉ với hai lý do cũ.
  - "Đã xác nhận" giữ nghĩa cũ: đã chốt với khách. Việc có người nhận hiện bằng nhãn riêng "Chờ nhận" / "HDV: <tên>". Đơn đã lưu mà chưa chốt đổi chữ "Nháp" thành "Chờ xác nhận".
- **Ai thấy khác:**
  - Hướng dẫn viên: thấy nút Từ chối và danh sách đơn chờ nhận (không số điện thoại, không tiền).
  - Văn phòng: thấy chữ "được trả lại" và thông báo khi có đơn bị trả.
  - Ai huỷ đơn cũng phải chọn lý do.
- **Không rút lại được:**
  - số điện thoại, tiền hướng dẫn viên đã xem lúc nhận rồi trả;
  - mỗi lần huỷ đơn;
  - mỗi dòng nhật ký.
- **Chưa có rào:** cho tới khi có hạn mức số lần Từ chối (lượt sau), kiểu "nhận nhiều đơn để xem số điện thoại rồi trả" chỉ phát hiện được **sau khi** xảy ra, qua nhật ký.
- **Hai lượt duyệt:**
  - Lượt 1: hướng dẫn viên xem đơn và nhận đơn (cùng hai bản nháp ADR-0020, ADR-0023).
  - Lượt 2: Từ chối, lý do khi huỷ, huỷ đơn chưa chốt.
- **Bạn cần quyết khi duyệt (3 câu cuối tệp):**
  1. "Ngày đi" tính theo ngày nào khi đơn cũ có nhiều ngày.
  2. Cách chép phần sửa vào hai bản nháp.
  3. Xác nhận bỏ Phần C cũ của kế hoạch GĐ2.

## Bối cảnh

Chủ muốn hướng dẫn viên (HDV) được **trả** đơn mình đang phụ trách khi bận ("Từ chối"), và đơn quay về hàng chờ. Mọi lần từ chối hay huỷ phải có lý do chọn nhanh. HDV đã nhận đơn chưa chốt mà gọi khách không được thì huỷ được (đặc tả §3, câu (3)).

Hôm nay:
- Không có đường nào đóng dòng phụ trách mà không mở dòng mới (`src/modules/dispatch/service.ts:25-32`), vì LC-8 (ADR-0018 điều 5) cấm đơn đã có người rơi về "chưa có ai".
- Huỷ qua `POST /api/orders/:id/status` không nhận lý do (`src/modules/orders/index.ts:324-357`).
- HDV huỷ (`POST /api/orders/:id/handler-cancel`) chỉ với đơn đã xác nhận (`src/modules/dispatch/index.ts:170`). Hàm công bố `cancelOrderByHandler` gắn cứng `"confirmed"` (`src/modules/orders/index.ts:90-92`).
- Câu huỷ `cancelOrder` **không** có khoá lạc quan theo `updated_at`, dù chú thích nói có (xem điều 2, điều kiện tiên quyết).

Chủ đã chốt: Q-A Cách 1, Q-B (a), Q-D, Q-E, Q-F (a), Q-G, Q-H, Q-O (a) (đặc tả §0, §1).

## Sửa những câu nào của quyết định đã duyệt (nguyên văn → mới) — thuộc điều 1–5

| Nguồn | Nguyên văn | Sau ADR-0030 |
|---|---|---|
| **ADR-0018 điều 5**, LC-8 | "LC-8 sau lần nhận đầu, đơn luôn có người phụ trách." | "LC-8 sau lần nhận đầu, đơn luôn có người phụ trách, **trừ khi chính người đang phụ trách Từ chối kèm lý do**; khi đó đơn về Chờ nhận cho tới khi có người Nhận hoặc được Giao." |
| Đặc tả mô hình vai (đã duyệt 24/9) §6, dòng LC-8 (dòng 192), **vế đầu** | "**Sau lần tiếp nhận đầu, đơn luôn có người phụ trách**" | Như dòng trên. **Vế sau** ("đổi người chỉ hoàn tất khi người mới bấm Nhận; tới lúc đó người cũ vẫn phụ trách") được thay ở **Mục S20** (lượt 1), không ở đây. |
| **ADR-0014 điều 11** (mở rộng điều 6, cấp hẹp "sau xác nhận") | HDV đang phụ trách huỷ đơn đang phụ trách, hai lý do đóng — mã chỉ cho đơn **đã xác nhận** | HDV huỷ được **cả đơn chưa chốt** mình đang phụ trách; giữ đúng hai lý do; giữ mốc "không huỷ tour đã qua ngày đi" (ADR-0027 điều 3). |
| ADR-0014 điều 11, gạch 1 | "`SALES`/…/`PARTNER` … tiếp tục huỷ qua `order.modify` như hôm nay, không đổi" | Vẫn huỷ qua `order.modify` (ô không đổi), nhưng **phải chọn lý do** (điều 2). |
| **ADR-0022**, mục "Trả lời của chủ", Q-B | "thông báo nổi cho: đơn mới chưa có người (…), có người nhận / đổi người phụ trách, xác nhận, huỷ; sửa nội dung/chuyến/tiền chỉ làm mới." | Thêm **"đơn vừa được trả lại (Từ chối)"** vào danh sách hiện nổi. Hiện cho mọi người nhận tin được hiện nổi (Q-F (a) — trong khuôn điều 3 hiện hành; nhắm riêng người nhận = ADR mới). |
| ADR-0020 điều 5 (proposed) | "huỷ đơn đã xác nhận kèm lý do" | Xem Mục S20, dòng S20-7. |

## Quyết định

**1. Từ chối (D4).** Người **đang phụ trách** một đơn (có tài khoản) được **trả** đơn đó; đơn về hàng chờ, chưa có ai phụ trách.
   - **Ai:** chỉ tự trả đơn **của chính mình** (Q-D). Ô mới **`dispatch.refuse`**:
     - `SALES`, `ADMIN`, `FIELD` = `assigned`;
     - `SUPER_ADMIN` = `any`;
     - `ACCOUNTING`, `PARTNER`, `INTERN` = `none`.

     Route **thêm một chốt riêng** "người gọi đang phụ trách đơn này", áp cả Toàn quyền → không thì **403**. Đây là **ngoại lệ có chủ ý** (đặc tả §5 bước 5) so với route sửa số khách (`dispatch/index.ts:196`), nơi Toàn quyền qua được khi không phụ trách. Ô Toàn quyền vẫn `any`, nên **không trái** ADR-0014 điều 2: thao tác chỉ định nghĩa trên dòng phụ trách của chính người gọi. Toàn quyền **không trả thay** người khác; muốn đổi người thì dùng Giao (Q-D).
   - **Khi nào không được (409):**
     - đơn **đã huỷ**;
     - ngày đi là hôm nay hoặc ngày mai (giờ VN, `vnToday`) → "Gọi văn phòng để đổi người" (Q-E, áp mọi người). "Ngày đi" tính thế nào khi đơn có nhiều ngày: câu hỏi 1;
     - sau này, từ "Đã giao" (trigger của ADR-0025, **chưa có**).

     Đơn **chưa có ngày đi nào** thì không chặn, **theo ADR-0027 điều 3** (`src/shared/trip-rules.ts:38-42`: không dịch vụ nào có ngày thì không coi là đã qua). Người phụ trách là hồ sơ không tài khoản: không ai tự từ chối được, văn phòng Giao người khác.
   - **Lý do bắt buộc** (điều 2). Thiếu hoặc ngoài danh sách → **400**.
   - **Một lô ghi** (Hiến chương 1.2): đóng dòng `HANDLE` đang mở **mang `party_id` của người gọi** (khuôn `CLOSE_HANDLER`, `dispatch/repository.ts:46-51`), **không** mở dòng mới, + nhật ký `order_handler_refused` với `changes() > 0`.
     - Thua đua (vừa bị đổi người) → 409 `stale`, không dòng nào thay đổi.
     - Nhận đúng lúc đang Từ chối: lệnh tới trước thắng.
     - **Giới hạn đã biết:** chốt "đơn đã huỷ" là đọc rồi mới ghi. Đơn bị huỷ đúng giữa lúc đọc và lúc ghi thì Từ chối vẫn ghi được (không hại: đơn đã huỷ vẫn không ai sửa được). Chặn triệt để cần lớp dữ liệu — xem điều 4, "Khi nào gỡ lệch".
   - **Sau Từ chối:**
     - **Hướng dẫn viên** (tài khoản chỉ có quyền `FIELD`) mở chi tiết đơn vừa trả → 404 như đơn người khác (ADR-0023 điều 1), nhưng thấy lại đơn trong hàng chờ ở dạng phần hẹp.
     - Người có `order.view = any` (Bán hàng, Quản trị, Toàn quyền) vừa trả **vẫn xem đủ** như mọi đơn khác.
     - Văn phòng **được** Giao lại cho chính người vừa trả. Bảng chọn người hiện "đã từ chối lúc … — <lý do>", đọc qua hàm công bố của module `audit` (`dispatch` không đọc thẳng `audit_log`, `dispatch/repository.ts:1-3`).
   - **Bảng tin:**
     - Loại mới `tu_choi`.
     - Route truyền trạng thái phụ trách **trước** thay đổi thật (bước (3) của N-1, đặc tả §8), nên sự kiện gắn `cho-nhan` + `nguoi:<người vừa trả>`.
     - Câu nổi: "Đơn TD-… vừa được trả lại, đang chờ người nhận".
     - Phát **sau** khi lô thành công (Hiến chương 5.10; ADR-0022 điều 5).
   - **Không** làm nút "gỡ người phụ trách" cho văn phòng (câu B2 của đặc tả §0): văn phòng đổi thẳng sang người khác như hôm nay.
   - **Không** đếm và **không** hạn mức ở ADR này (điều 5).
   - Theo 5.8: quyền Từ chối xét theo **vai người phụ trách trên chính đơn**, khớp Hiến chương.

**2. Lý do bắt buộc cho mọi Từ chối/Huỷ; HDV huỷ được đơn chưa chốt (D5).**
   - **Danh sách đóng** (Q-H, đặc tả §7 đã chốt "không bảng, không cột"). "Khác" **không kèm ô chữ**.
     - Lý do **phải** đóng: hôm nay chữ tự do đi thẳng vào nhật ký chỉ-thêm mà không lọc SĐT/email/MST, lỡ ghi thì không gỡ được (`migrations/0017_order_status_audit_guards.sql:17-21`; mục T3d của báo cáo rà cấu trúc `docs/superpowers/specs/2026-09-27-ra-soat-cau-truc-du-an-theo-oracle.md` trên nhánh `hien-chuong-kien-truc`).
     - **Từ chối:** "Bận lịch khác", "Ốm / việc riêng", "Không phù hợp tuyến/dịch vụ", "Khác".
     - **Huỷ qua `POST /api/orders/:id/status`:** "Khách đổi ý", "Khách đặt trùng", "Sai thông tin — lập lại đơn", "Khác". Áp **mọi ai** huỷ bằng đường này (Bán hàng, Quản trị, Toàn quyền, và Đối tác, Thực tập với đơn của mình), theo câu (3) của chủ "bất cứ hành động … huỷ nào cũng cần có lý do" (*giả định của AI, bề mặt: Đối tác/Thực tập dùng cùng danh sách*).
     - **HDV huỷ (Aborted):** giữ đúng hai lý do "Không liên hệ được với khách", "Khách yêu cầu huỷ" (ADR-0014 điều 11; `dispatch/rules.ts:74-80`).
   - Danh sách là **hằng trong mã**, cùng khuôn `CANCEL_REASONS` (`dispatch/rules.ts:74`). Nhật ký ghi nhãn tiếng Việt của lý do đã chọn. Không bảng tra cứu, không migration. Đổi danh sách = một lần phát hành.
   - **HDV huỷ đơn chưa chốt (Q-G):**
     - Route `handler-cancel` bỏ 409 "chưa xác nhận" (`dispatch/index.ts:170`), chỉ còn chặn đơn đã huỷ; giữ chặn đã qua ngày đi (`:171`).
     - Hàm công bố `cancelOrderByHandler` (`orders/index.ts:90`) nhận **trạng thái trước** (`draft` hoặc `confirmed`). Đây là **đổi hợp đồng `orders`↔`dispatch`** (ADR-0007 điều 4(b)): đổi trong cùng commit, test đỏ trước.
     - Ô `order.cancel` không đổi.
   - **Điều kiện tiên quyết của Q-G — sửa lỗi nền, không cần ADR riêng:**
     - Câu huỷ `cancelOrder` (`orders/repository.ts:716-723`) chỉ có điều kiện `status`, **không** có `updated_at`. Trong khi đó chú thích ở `dispatch/index.ts:163`, `orders/index.ts:61` và `:88` khẳng định có khoá lạc quan — mã lệch chú thích.
     - Thêm điều kiện "`updated_at` = mốc đã đọc" vào câu huỷ, test đỏ trước, **trước** khi mở huỷ cho đơn chưa chốt.
     - Nguồn: mục T1d của báo cáo rà cấu trúc 2026-09-27, gói "dọn nền".
     - Đường `/status` dùng chung hàm này nên cũng có khoá.
   - HDV huỷ **không** tính vào hạn mức Từ chối (Q-P2 — ADR-0032).

**3. Hai lớp và nhãn (Cách 1 của Q-A) — bề mặt, không đổi dữ liệu.**
   - Lớp **đơn** giữ nguyên: `draft → confirmed → cancelled`, chỉ đi tiến. **"Đã xác nhận" giữ nghĩa cũ**: chốt với khách, khoá dịch vụ/số khách/tiền, chữ trên biên nhận (đặc tả Phụ lục A).
   - Lớp **phân công** suy từ việc có dòng `HANDLE` đang mở hay không. Không thêm cột trạng thái phân công (ADR-0020 điều 9).
     - Nhãn: **"Chờ nhận"** (thêm "được trả lại" khi lần đóng gần nhất là Từ chối) hoặc **"HDV: <tên>"**.
     - Không dùng chữ "xác nhận" cho việc nhận đơn.
   - Đơn **đã lưu mà chưa chốt**: "Nháp" → **"Chờ xác nhận"** (`web/format.ts:23`), đúng chữ biên nhận đang in (`src/shared/order-confirmation.ts:72`) — Q-A2.
   - Đơn huỷ: **"Đã huỷ · <lý do>"**; HDV huỷ: **"Đã huỷ · HDV huỷ: <lý do>"**. Không lộ mã thô (`cancelled`…).
   - **Căng với Hiến chương 4.1:** nhãn "được trả lại", "HDV huỷ", "đã từ chối lúc…" dựng từ nhật ký, không từ trạng thái trong bảng.
     - Dựng theo **mã hành động** (`order_handler_refused`, `order_cancelled_by_field`, `cancelled`) và hiện nguyên nhãn lý do đã lưu. **Không** phân tích chữ trong chi tiết.
     - Tiền lệ: ADR-0014 điều 11 cũng giữ lý do huỷ chỉ trong nhật ký.
     - Lượt đầu chỉ hiện ở chi tiết đơn và màn HDV (G2).
     - Nhãn ở danh sách đơn văn phòng: kế hoạch đo rồi chọn. Thêm cột phải có ADR riêng.

**4. Lệch có chủ ý: 5.1** (mẫu ADR-0029; Q-O (a)), **vì** ở tầng dữ liệu không phân biệt được các đường ghi mà luật cần phân biệt.
   - **Luật chỉ ở mã máy chủ**, không có trigger hay `CHECK`:
     - (a) LC-8 mới: chỉ người phụ trách tự đóng dòng mà không mở dòng mới;
     - (b) chặn Từ chối đơn đã huỷ, và hạn Q-E;
     - (c) lý do bắt buộc.
   - Chốt Nhận đơn đã huỷ / đã qua ngày đi cùng loại lệch, nhưng phát hành ở **lượt 1**. Vì vậy dòng khai lệch của nó nằm **ngay trong S20-5**, được duyệt cùng lượt 1 (Hiến chương "Cách dùng" (b), điều 6.3). Lý do lệch và điều kiện gỡ lệch dùng chung với điều này.
   - **Vì sao không có lớp dữ liệu:**
     - Nhận và Giao-cho-chính-mình chạy **cùng một câu** chèn (`INSERT_HANDLER_IF_NONE`, `dispatch/repository.ts:34-39`).
     - Từ chối và Giao-đổi-người đều **đóng** một dòng; câu đóng chạy trước câu mở nên trigger không thấy câu sau.
     - Trigger không biết ai gọi, nên hoặc chặn luôn Giao trên đơn huỷ (trái Q-D), hoặc không chặn được Nhận.
   - **Lưới dữ liệu còn giữ:** chỉ mục duy nhất một dòng mở mỗi đơn (`migrations/0014_dispatch.sql:58-59`), trigger trạng thái chỉ đi tiến và nhật ký chỉ-thêm (`0017`). Thêm **câu kiểm LC-8 mới** ở `audit-invariants` làm lớp **phát hiện** (không chặn); hôm nay chưa có câu LC-8 nào.
   - **Khi nào gỡ lệch** (ADR mới do chủ duyệt):
     - khi có khoá "Đã giao" của ADR-0025; hoặc
     - khi chủ chấp nhận "không ai nhận/giao/đổi người trên đơn đã huỷ" — phương án Q-O (b).

     Lúc đó thêm trigger `BEFORE INSERT/UPDATE` dòng `HANDLE` của đơn `cancelled`, đọc view công bố trạng thái đơn (`v_ord_order_state` của ADR-0024 — **còn proposed** — hoặc một view nhỏ mới của `orders`), bằng migration chỉ-thêm.

**5. Phần còn lại của đặc tả thuộc ADR-0031/0032, lượt sau — không soạn ở đây.**
   - **ADR-0031** (lượt 3) gồm:
     - D8: quy tắc 6 giờ;
     - D10: Đơn bổ sung;
     - D11: ngày đi, và giờ theo Q-Y2, bắt buộc ở mọi lần lưu;
     - tiền tố bảng `ord_` (Q-AA: sửa ADR-0002 điều 2);
     - ghi về 5.8 cho G5.
   - **ADR-0032** (lượt 4) gồm:
     - D7: bộ đếm `dsp_release_event` + hạn mức Từ chối (Q-Z, Q-Z2 có loại `ASSIGN`);
     - D9: trang cài đặt theo module, ô `settings.ops` (ô đã có ở `permissions.ts:73`, hôm nay chỉ dùng cho bảo trì).
   - **Cam kết duy nhất của ADR-0030 cho lượt sau:** lô Từ chối được viết sao cho ADR-0032 đặt được câu chèn `REFUSE` có điều kiện đếm **lên đầu lô**, làm câu chốt (đặc tả §9A mục 2), mà không phá thứ tự "`changes()` nói về câu ngay trước" (`dispatch/repository.ts:5-7`).

## Mục S20 — đề xuất sửa bản nháp ADR-0020 (trình ở lượt 1, cùng ADR-0020)

| # | Nguồn | Nguyên văn | Mới |
|---|---|---|---|
| S20-1 | ADR-0020 mục "Không đổi" | "LC-8 (…) — ADR-0020 chỉ đổi **trước** lần tiếp nhận đầu." | "LC-8 đổi bởi ADR-0030 điều 1 (Từ chối). ADR-0020 vẫn chỉ đổi phần trước lần tiếp nhận đầu." |
| S20-2 | ADR-0020, dòng "ADR-0018 điều 7, câu 2", cột mới | "Phần 'chọn người khác = đề nghị' **giữ nguyên** (hiện thực ở giai đoạn 5 …; tới lúc đó 'chọn người' vẫn có hiệu lực ngay như hôm nay)." | **Giao/chọn có hiệu lực ngay**, thay câu "chọn người khác = đề nghị" của ADR-0018 điều 7 (đặc tả §1; chủ, Q-Q: "hệ thống tự gán ngay khi có người chủ động lựa chọn HDV đó"). Người được chọn Từ chối được sau (ADR-0030). Đối tác vẫn chỉ **đề xuất** (ADR-0018 điều 9). Hạn nhận và "đề nghị nhận" của giai đoạn 5 nằm ngoài phạm vi (đặc tả §2). |
| S20-3 | **ADR-0018 điều 7** câu 3; đặc tả mô hình vai §6 LC-8 **vế sau** (dòng 192), §8 dòng 226 | "Đổi người: người cũ giữ tới khi người mới bấm Nhận." / "đổi người chỉ hoàn tất khi người mới bấm 'Nhận'; tới lúc đó người cũ vẫn phụ trách" | **Giao/đổi người có hiệu lực ngay**; không có khoảng "chờ người mới bấm Nhận". |
| S20-4 | ADR-0020 điều 1 ("đường tiêm `defaultHandlerStatement` … **gỡ hẳn**, không để lại hàm trả `null`"), Lý do gạch 3, Hệ quả gạch 1 | gỡ hẳn đường tiêm | **Giữ và đổi dạng** (Q-C) đường tiêm — hợp đồng `orders`↔`dispatch`, ADR-0007 điều 4(b); hôm nay ở `orders/index.ts:207`, `:223`. Chi tiết:<br>• Lô tạo đơn nhận câu mở dòng `HANDLE` cho **người được chọn** trong form, **không bao giờ** mặc định người lập, kèm nhật ký `order_handler_changed`. Không chọn ai → không có câu nào, đơn Chờ nhận.<br>• Chọn được: ai có `dispatch.assign` trên đơn của mình (Bán hàng, Quản trị, Toàn quyền). Thực tập, Đối tác không chọn được (G4).<br>• Người được chọn phải qua `checkAssignee` (`dispatch/rules.ts:50`); không đạt → **400** và **không** tạo đơn.<br>• Bảng tin phát `tao`, không phát `giao`. |
| S20-5 | ADR-0020 điều 2 (thêm) | — | **Chốt Nhận (N-2).** Đây là đổi có chủ ý chú thích "CỐ Ý không xét trạng thái đơn" ở `dispatch/index.ts:122-123`.<br>• **Nhận** → **409** nếu đơn **đã huỷ**, **đã qua ngày đi** (`tripDeparted`, mốc ADR-0027 điều 3), hoặc — khi có ADR-0025 — **Đã giao**. Áp **mọi người**.<br>• **Giao** cho người khác trên đơn huỷ vẫn được.<br>• **Lệch có chủ ý: 5.1, vì** Nhận và Giao-cho-chính-mình là cùng một câu chèn ở tầng dữ liệu, trigger không phân biệt được. Lý do đầy đủ và điều kiện gỡ lệch: ADR-0030 điều 4.<br>• Giới hạn đã biết: đọc rồi mới ghi, nên đơn bị huỷ đúng lúc vẫn có thể được Nhận.<br>**Chặn tài khoản lai** (có quyền Đối tác kèm quyền khác — `holdsPartner`, `permissions.ts:140`; Q-M) ở bốn cửa:<br>• danh sách chờ nhận;<br>• Nhận (403);<br>• `checkAssignee`;<br>• Bảng tin: không nhãn `cho-nhan`, không thông báo nổi về đơn chờ nhận.<br>Câu kiểm dữ liệu `handlerAccountEligible` (`scripts/audit-checks.mjs:19-20`) loại cả tài khoản lai cho khớp `checkAssignee` mới. |
| S20-6 | ADR-0020 dòng "Phụ thuộc" | "sau khi ADR-0019 (…) và ADR-0017 (…) đã lên production" | "Sau ADR-0019 (GĐ2 Phần B đã lên bản 1.18) **và phần xem của ADR-0023 theo Mục S23 dưới đây**, thay cho ADR-0017 điều 1; **không** thi công ADR-0017 nguyên dạng. `dispatch.claim` của `FIELD`: `none` → `any` cùng đợt thi công lượt 1." |
| S20-7 | ADR-0020 điều 5 | "(sửa số khách sau xác nhận, huỷ đơn **đã xác nhận** kèm lý do …)" | "Theo ADR-0023 (sửa) và ADR-0030 điều 2 (huỷ cả đơn chưa chốt)." |
| S20-8 | **ADR-0022 điều 3** (accepted) | "Nhóm nhận suy từ ô `order.view` hiện hành, không đặt luật quyền mới: `any` → tag `tat-ca`; còn lại → `nguoi:<staffId>`. Sự kiện về một đơn gửi tới `tat-ca` + người lập + người phụ trách cũ + người phụ trách mới." | Giữ câu cũ, **thêm**:<br>• Kết nối có `dispatch.claim` và **không** có quyền Đối tác mang thêm nhãn `cho-nhan`, **kể cả khi `order.view` ≠ `any`** (hướng dẫn viên).<br>• Sự kiện gắn `cho-nhan` khi (a) **sau** thay đổi đơn không còn ai phụ trách, hoặc (b) route truyền trạng thái trước **thật** và trước đó chưa có ai.<br>• Mặc định trạng thái trước đổi thành **"không biết"** (thay "chưa ai" ở `src/index.ts:47`). "Không biết" không bao giờ sinh `cho-nhan` (N-1 bước (1)(2)). |
| S20-9 | **NT-3** (`src/shared/bang-tin.test.ts:55-65`) | "mọi mã quyền có `dispatch.claim` khác none đều có `order.view = any`" | **Đỏ trước có chủ ý**, rồi thay bằng: một kết nối không có `tat-ca` chỉ nhận sự kiện có nhãn `cho-nhan` của đơn **đang hoặc vừa rời** hàng chờ, không bao giờ sự kiện của đơn người khác đang phụ trách (hàm thuần, suy từ `MATRIX`, 128 tập con, + e2e đặc tả §12 mục 3). |
| S20-10 | ADR-0020 dòng 4 "Lượt duyệt" | "**trình ở lượt duyệt SAU, khi Phần B (ADR-0019) đã lên production**" | Điều kiện **đã thoả** (bản 1.18, 2026-09-27). Trình ở lượt 1, cùng Mục S20/S23. |
| S20-11 | ADR-0020 dòng 8 "Xây trên lỗ đang hở: `money.view`, `contact.view`" | lỗ đang hở | **Đã đóng**: hai mục đã gỡ khỏi `docs/quyen-hoan.json` (GĐ2 Phần B). |
| S20-12 | ADR-0020 Hệ quả gạch 2 | "ô `dispatch.claim` của `FIELD` `none` → `any` — làm ở **bước trước** (cùng ADR-0017), không ở bước ADR-0020" | Làm **cùng đợt thi công lượt 1**, thay cho Phần C + D của kế hoạch GĐ2 (khớp S20-6). |
| S20-13 | ADR-0020 điều 7 (M1) + Hệ quả gạch "Trang chủ" ("truy vấn ở `src/modules/orders/repository.ts`") | ô "Chưa phụ trách" đếm cả đơn nháp; sửa câu đếm trong `orders` | Giữ M1. **Không** mở rộng việc `orders` đọc view `v_dsp_order_handler` (`orders/repository.ts:477-479` — lệch đã biết, trái ADR-0006 điều 8, ADR-0007 điều 4, Hiến chương 5.3). Câu đếm lấy tập đơn đang có người qua **hàm công bố của `dispatch`** hoặc tiêm qua `ctx` (T3a của báo cáo rà cấu trúc 2026-09-27). |

## Mục S23 — đề xuất sửa bản nháp ADR-0023 (phần "xem" trình ở lượt 1; phần "sửa" ở lượt 2)

| # | Nguồn | Nguyên văn | Mới |
|---|---|---|---|
| S23-1 | ADR-0023 điều 1; Hệ quả gạch 1 ("ô `order.view` của `FIELD` cần một phạm vi mới … hoặc route riêng … — chọn ở kế hoạch") | chưa chọn | **Cách (i), Q-I:**<br>• thao tác mới **`order.pool.view`**: `FIELD` = `any`, `SUPER_ADMIN` = `any`, còn lại `none`. `ADMIN` = `none` nghĩa là thêm `order.pool.view` vào `ADMIN_NONE_OPS` (`permissions.test.ts:177`): Quản trị đã thấy đủ mọi đơn qua `order.view`, không cần phần hẹp.<br>• `order.view`, `money.view`, `contact.view`, `order.history.view` của `FIELD` = **`assigned`**.<br>Không thêm phạm vi thứ sáu cho `Scope` (cách (ii) bị loại: đổi hợp đồng `can()`). |
| S23-2 | ADR-0023 điều 1, gạch 1 (đơn chờ nhận) | "mã đơn, ngày đi, dịch vụ, số khách, nơi đón/giờ đón. Không SĐT…, không tiền, không lịch sử" | Giữ, **thêm**:<br>• Dựng từ **danh sách trường được phép** ở máy chủ (Hiến chương 4.4).<br>• Nơi đón (`order_service.pickup_place`, chữ tự do) **che mọi dãy từ 8 chữ số** trở lên, đếm sau khi bỏ dấu cách/chấm/gạch (Q-N).<br>• Là **ngoại lệ có tên** của chú thích ô `contact.view` (`permissions.ts:51` gộp "điểm đón, giờ" vào liên hệ).<br>• Chỉ gồm đơn không có dòng `HANDLE` mở, chưa huỷ, chưa qua ngày đi. Tập "đơn đang có người" lấy qua hàm công bố của `dispatch`/tiêm qua `ctx` (như S20-13), không có SQL của `orders` đọc `v_dsp_*`. Tài khoản lai không thấy (Q-M).<br>• Bài khoá `cong-quyen.test.ts:19` chỉ canh `order.view`/`money.view`, không canh `order.pool.view`. Vì vậy thêm **một bài kiểm riêng** cho phần hẹp và một dòng ở `docs/SO-HANG-RAO.md`. |
| S23-3 | ADR-0023 điều 1, gạch 2 (đơn mình phụ trách) | "đủ như người lập thấy, kể cả SĐT khách và tiền" | Thêm "**kể cả lịch sử**" (`order.history.view` = `assigned`, câu (2) của chủ). |
| S23-4 | ADR-0023 điều 1, gạch 3 | "Đơn mình **từng** phụ trách rồi bị đổi: không thấy nữa." | "…rồi bị đổi **hoặc tự Từ chối**: không thấy nữa (404); thấy lại ở hàng chờ dạng phần hẹp" — áp cho hướng dẫn viên (chỉ quyền `FIELD`); người có `order.view = any` không đổi.<br>Chi tiết đơn HDV không được xem: **404** (hôm nay 403, `orders/index.ts:241`).<br>**Bẫy:** `GET /api/orders` lọc "người lập = tôi" khi `can(order.view)` không ngữ cảnh trả sai (`orders/index.ts:189-193`). Với `FIELD` = `assigned`, danh sách sẽ **403**. Cần **nhánh lọc thứ ba** theo người phụ trách, lấy tập đơn qua **hàm công bố của `dispatch`** tiêm qua `ctx` như `ctx.isAssigned` (vd `findHandledOrderIds`, hôm nay nằm trong `dispatch/repository.ts:65`, phải công bố qua `dispatch/index.ts`). **Không** thêm SQL của `orders` đọc `v_dsp_order_handler` — không lặp lại lệch ở `orders/repository.ts:477-479`.<br>Cùng lúc, `homeRedirect` (`src/shared/start-page.ts:16`) sẽ chuyển tài khoản chỉ-`FIELD` sang `/orders`. Thiếu nhánh lọc thứ ba thì HDV rơi vào trang lỗi 403, nên hai việc này phải cùng một lần phát hành. |
| S23-5 | **ADR-0019** (accepted) điều 1 bảng dòng `orders`, điều 3 | "`FIELD` **chỉ khi** ADR-0017 được thi công (điều 3)" / "ô `money.view` của `FIELD` là `any`" | "`FIELD` vào cổng `orders` khi **phần xem của ADR-0023 (bản sửa này)** được thi công; `money.view` của `FIELD` = `assigned`."<br>Hệ quả với danh mục giá. HDV không đọc được bảng giá theo đúng ý ADR-0019 điều 3, trong cả hai trường hợp:<br>• **Trước khi nhánh ADR-0033 gộp `main`:** `GET /api/catalog` ở cổng `orders` (ADR-0028) trả **403 ở thân** (`catalog/index.ts:85`, `can(money.view, { ownerId })` sai với `assigned`).<br>• **Sau khi ADR-0033 gộp** (accepted 2026-09-27 trên nhánh `danh-muc-lap-don`): `GET /api/catalog` về cổng `office` (HDV 403 ở cổng); `GET /api/catalog/for-order` hỏi `can(order.create)` (`FIELD` = `none` → 403 ở thân). |
| S23-6 | Tách lượt | ADR-0023 là một khối | **Lượt 1 (D1):** điều 1–2 + Hệ quả gạch 1 và 4 + S23-8. **Lượt 2 (D6):** điều 3–8 + Hệ quả gạch 2, 3. Khi duyệt lượt 1, dòng trạng thái ghi "accepted phần xem (điều 1–2)". |
| S23-7 | ADR-0023 dòng 7 ("không được duyệt trước khi ADR-0019 lên production") | điều kiện | **Đã thoả** (GĐ2 Phần B, bản 1.18). Hai mục này không còn trong `docs/quyen-hoan.json`. |
| S23-8 | ADR-0023 điều 1, gạch 2 (thêm) — danh sách "Đơn của tôi" | — | HDV thấy **cả đơn nháp** mình đang phụ trách (đặc tả §9: đơn chưa huỷ, chưa Hoàn thành), để có chỗ bấm Từ chối/Huỷ ở lượt 2. Route: `GET /api/dispatch/mine` (cổng `staff`, đã hỏi `contact.view` với phạm vi "được giao" ở `dispatch/index.ts:102`). Bỏ lọc "chỉ đơn đã xác nhận" trong `getMyAssignments` (`orders/index.ts:141`), giữ lọc chưa huỷ. Đây là hàm công bố của `orders`, nên là đổi hợp đồng `orders`↔`dispatch`, test đỏ trước. |

## Loại cửa

| Phần | Loại | Vì sao |
|---|---|---|
| Mã, route, ô `dispatch.refuse`, danh sách lý do, nhãn, đổi `cancelOrderByHandler` | **hai chiều** | Gỡ bằng một commit. Không migration. Dòng `HANDLE` đã đóng vẫn nằm trong lịch sử, không xoá cứng (Hiến chương 5.5). |
| **Mỗi lần huỷ đơn** (văn phòng hay HDV) | **một chiều** | Trạng thái chỉ đi tiến; trigger `0017` chặn cả SQL chạy tay. Đơn huỷ nhầm phải lập lại đơn mới. Từ lượt 2, HDV huỷ được cả đơn chưa chốt, kể cả đơn Đối tác lập. |
| SĐT, tiền, lịch sử HDV đã xem qua "nhận (Mục S20) rồi Từ chối" | **một chiều** | Đã xem thì không thu lại. |
| Dòng nhật ký `order_handler_refused`, `cancelled` có lý do, `order_cancelled_by_field` | **một chiều** | Nhật ký chỉ-thêm (trigger `0017`). Vì vậy không có chữ tự do. |
| Mục S20 | hai chiều | Mã + ô `dispatch.claim`. Riêng hàng chờ không lộ SĐT/tiền. |
| Mục S23 | hai chiều cho ô và cổng; **một chiều** cho SĐT/tiền của đơn mình phụ trách | Như ADR-0023 đã ghi; hẹp hơn ADR-0017. |

## Lý do

- Đúng lời chủ (đặc tả §3 câu (3)–(5); Q-B (a)). Không cần bảng hay cột mới: "chưa có ai" đã là trạng thái hợp lệ của phân công (`INSERT_HANDLER_IF_NONE`).
- Lý do chọn nhanh từ danh sách đóng: nhanh cho người bấm, và không để SĐT lọt vào nhật ký không sửa được.
- Giữ "Đã xác nhận" nghĩa cũ (Cách 1): không phá luật lõi đã duyệt (trạng thái chỉ đi tiến, khoá tiền, chữ biên nhận). Không đổi dữ liệu.
- Luật ở mã (lệch 5.1): cách duy nhất phân biệt Nhận với Giao và Từ chối với đổi người mà không chặn nhầm việc văn phòng theo dõi đơn huỷ.

## Phương án bị loại

- **Q-B (b), HDV cũ giữ đơn tới khi có người nhận ("xin trả").** Không có đơn vô chủ. Nhưng chủ chọn (a). Ngoài ra cần thêm mã `dsp_assignment_status` (migration) và một ADR sửa ADR-0006 điều 2.
- **Q-A Cách 2a (bấm Nhận = xác nhận), 2b (đổi tên).** Cách 2a phá luật lõi: HDV không nhận được đơn thiếu ngày/số khách, tiền khoá ngay lúc nhận, Từ chối thành đi lùi. Cách 2b phải đổi chữ ở mọi màn hình, trợ giúp, kịch bản kiểm thử và biên nhận.
- **Q-O (b), trigger ngay bây giờ.** Chặn cả Giao trên đơn huỷ, và cần view trạng thái đơn còn proposed (ADR-0024).
- **Q-H có ô chữ tự do.** Nhật ký chỉ-thêm không gỡ được SĐT; bộ lọc SĐT chỉ giảm nhẹ.
- **Q-F (b), nhắm thông báo riêng người nhận.** Phải sửa ADR-0022 điều 3 thêm một lần. Để ADR sau nếu cần.
- **Nút "gỡ người phụ trách" cho văn phòng (câu B2 của đặc tả).** Chủ: không ở đợt này. Nếu cần thì làm một ô riêng, không gộp vào Từ chối.
- **Toàn quyền Từ chối thay người khác.** Toàn quyền đã có Giao; "trả thay" làm mờ nghĩa "tự trả" và lẫn với nút "gỡ người phụ trách" ở trên.
- **Bảng tra cứu lý do trong cơ sở dữ liệu.** Đặc tả §7 chốt "không bảng"; lý do chỉ nằm ở chi tiết nhật ký, không phải cột mã.
- **`orders` tự đọc view `v_dsp_*` để lọc/đếm theo người phụ trách** (đặc tả §6 bản cũ). Trái ADR-0006 điều 8, ADR-0007 điều 4 và Hiến chương 5.3 (T3a).

## Rủi ro nói với chủ một lần (P18 — ghi để sau này không ai nói "không biết")

- **Đơn vô chủ sát giờ đi.** Q-E chặn tự trả khi ngày đi là hôm nay hoặc ngày mai. Nhưng trong ngày đi, HDV vẫn **huỷ cả đơn** được (ADR-0027 chỉ chặn từ hôm sau). Hai lý do huỷ là danh sách đóng, không kiểm được là thật. Bảng tin không báo được khi app đóng (ADR-0022).
- **Nhận rồi huỷ.** Từ lượt 1, HDV Nhận được **bất kỳ** đơn nào đang chờ nhận, rồi huỷ qua `handler-cancel` với một trong hai lý do. Từ lượt 2, việc này làm được cả với đơn **chưa chốt**, kể cả đơn Đối tác lập. Huỷ **không đảo được** (trigger `0017`, trạng thái chỉ đi tiến). Giảm nhẹ duy nhất hôm nay: nhật ký ghi ai huỷ, lý do gì; văn phòng thấy số lần Huỷ của từng HDV khi ADR-0032 có trang xem số lần.
- **Gom SĐT và khoảng trống hạn mức.** HDV có thể nhận lần lượt nhiều đơn, đọc SĐT, rồi trả.
  - Từ lượt 2 (có Từ chối) tới khi lát **"chặn"** của ADR-0032 lên production, **không có gì chặn trước**. Kiểu này chỉ **phát hiện sau khi xảy ra**, qua nhật ký nhận/từ chối.
  - Số lần từ chối cho Quản trị/Toàn quyền xem, và hạn mức 2 lần liên tiếp, 15 lần/tuần, chỉ có khi ADR-0032 lên: lát "chỉ đo" trước, lát "chặn" sau.

## Hệ quả

- **Dữ liệu:** **không migration, không bảng, không cột** (Q-B (a); đặc tả §7).
  - Từ chối = đóng dòng (`valid_to_at`, `updated_at`, `updated_by`).
  - Hành động nhật ký mới `order_handler_refused` = một dòng ở `src/shared/audit-actions.ts`, không cần migration (`:1-3`). Chi tiết ghi tên người trả + nhãn lý do; **không** SĐT, email, MST (Hiến chương 5.12).
  - `cancelled` ghi nhãn lý do. `order_cancelled_by_field` như cũ, nay cả đơn chưa chốt.
- **Quyền** (`src/shared/permissions.ts` — việc lớn, bắt buộc người kiểm độc lập chỉ đọc):
  - Lượt 2: thêm `dispatch.refuse`.
  - Lượt 1 (Mục S20/S23): `dispatch.claim` của `FIELD`; thêm `order.pool.view`; bốn ô `FIELD` = `assigned`; `ORDERS_GATE` thêm `FIELD`.
  - Ô mới phải vào `MATRIX` **cùng commit** với route hỏi nó (hàng rào 1, `src/permission-enforcement.test.ts`). **Không** thêm mục hoãn vào `docs/quyen-hoan.json`.
- **Module:**
  - `dispatch` thêm route Từ chối (cổng `orders`; hướng dẫn viên tới được cổng này chỉ sau khi dòng S23-5 được thi công). Tên chọn ở kế hoạch, gợi ý `POST /api/orders/:id/handler-refuse`.
  - Câu lệnh dựng ở `service.ts`, test trên SQLite thật như `service.test.ts`.
  - `orders.cancelOrderByHandler` đổi chữ ký.
  - Route `/status` nhận lý do.
  - Lời báo 403/409 bằng tiếng Việt.
  - **Không lặp lại lệch H1:** không thêm chỗ nào `orders` đọc view của `dispatch`. Mọi việc `orders` cần biết về phân công đi qua hàm công bố của `dispatch` hoặc tiêm qua `ctx` (ADR-0006 điều 8, ADR-0007 điều 4, Hiến chương 5.3; T3a).
- **Bảng tin:**
  - `THAY_DOI` thêm `tu_choi` (`bang-tin.ts:8`).
  - Route Từ chối gọi `baoThayDoi` chỉ ở nhánh thành công, kèm `handlerTruoc` thật.
  - App cũ bỏ qua loại lạ (`laSuKienHopLe`, `bang-tin.ts:113`), nên ghi vào nhật ký thay đổi.
- **Ứng dụng cũ trong bộ nhớ đệm (PWA):** sau khi `/status` bắt buộc lý do, bản cũ chưa có ô chọn lý do sẽ nhận **400** khi huỷ.
  - Lời báo 400 phải nói bằng lời thường "hãy tải lại ứng dụng để chọn lý do huỷ".
  - Mục nhật ký thay đổi của lần phát hành ghi rõ (như ADR-0033 đã làm cho form lập đơn).
- **Kiểm dữ liệu:** thêm câu kiểm LC-8 mới ở `scripts/audit-checks.mjs`: đơn từng có dòng `HANDLE`, nay không có dòng mở, thì phải có `order_handler_refused` sau lần đóng cuối.
  - Đặt mức **cảnh báo** trước, **vi phạm** sau. Chủ tự chạy truy vấn chỉ-đọc trên remote trước khi đặt mức "vi phạm".
  - Sẽ đỏ với `dropHandler` của `tests/e2e/dispatch.mjs` (ADR-0020 Hệ quả), nên thay `dropHandler` bằng Từ chối thật.
- **Giao diện:** nút Từ chối + chọn lý do; hộp Huỷ có lý do, kể cả form của Đối tác và Thực tập; hộp hỏi lại "không thể hoàn tác" cho Huỷ; các nhãn ở điều 3. **Bố cục và chữ chờ bản thiết kế của chủ** (bài học Đợt D).
- **Bài kiểm sẽ đỏ có chủ ý** (tín hiệu hỏi chủ, không sửa cho xanh). Các ca trong `npm test` đã đối chiếu với mã `main` dc4b4f9; phần e2e là **suy từ đọc mã, chưa chạy**.
  - **Lượt 1 (Mục S20/S23 + ADR-0020 + ADR-0023 phần xem):**
    - `src/shared/permissions.test.ts`:
      - bảng giá trị ô `:10-13`, `:21` (bốn ô `FIELD`, `dispatch.claim` của `FIELD`);
      - `:40` (26 → 27 thao tác: `order.pool.view`);
      - `:87` (`canAccessOrders` của `FIELD`: false → true);
      - `:114-126` (mọi ô × mọi ngữ cảnh — đổi theo bảng cùng commit);
      - `:147-156` (`dispatch.claim` của `FIELD`);
      - `:183`: ADMIN × `order.pool.view` = `none`. Muốn xanh lại phải thêm vào `ADMIN_NONE_OPS`, tức quyết định "Quản trị không có ô này" (đã ghi ở S23-1).
      - `:181` **vẫn xanh**: `FIELD` = `assigned` hỏi không ngữ cảnh vẫn sai.
    - `src/shared/cong-quyen.test.ts`:
      - `:11` (`ORDERS_GATE`);
      - `:27-33`: HDV không xem giá đơn mình lập. Thêm ngoại lệ có tên cho `FIELD`, vì `order.create` = `none`. Bài vẫn còn trên nhánh ADR-0033, tên đổi theo `for-order`.
      - `:36-44` ("phần B không đổi hành vi").
    - `src/shared/bang-tin.test.ts`:
      - `:30-40` (128 tập con: thêm luật loại tài khoản lai khỏi `cho-nhan`);
      - `:42-53`;
      - `:55-65` (NT-3);
      - `:67`;
      - `:169`.
    - `src/modules/dispatch/rules.test.ts`: `:145` (ca `:151` "FIELD không nhận"), `:169` (ca `:173`).
    - `src/shared/handler-view.test.ts:34` (ca `:40`).
    - `src/shared/router.test.ts:102`.
    - `src/shared/start-page.test.ts:26` (`homeRedirect` của tài khoản chỉ-`FIELD` → `/orders`; xem S23-4).
    - `src/route-access.test.ts:174`: ảnh chụp mức truy cập, nếu có route mới như hàng chờ; sửa cùng commit.
    - e2e, suy từ đọc mã:
      - `tests/e2e/permissions.mjs:29-38`;
      - `tests/e2e/orders.mjs:264` (HDV mở đơn không phụ trách: 403 → 404; `GET /api/orders` đổi kết quả);
      - `tests/e2e/dispatch.mjs:686-692` ("Việc của tôi" nay có đơn nháp — S23-8), và các bước dựa vào ADR-0020 (`dropHandler`).
  - **Lượt 2 (điều 1–5 + ADR-0023 phần sửa):**
    - `permissions.test.ts`: bảng giá trị ô (thêm `dispatch.refuse`), `:40` (27 → 28 thao tác), `:183` (ADMIN × `dispatch.refuse` = `assigned`).
    - `src/shared/bang-tin.test.ts:18-20` (`THAY_DOI` 9 → 10).
    - `src/route-access.test.ts:174` (route Từ chối).
    - e2e, suy từ đọc mã:
      - `tests/e2e/dispatch.mjs:306-316` (HDV huỷ đơn nháp: 409 → 200);
      - `:417-418` (sửa số khách đơn nháp: 409, thuộc D6).
  - **Không tự đỏ — phải tự thêm:** `src/bang-tin-guard.test.ts:204` chỉ kiểm **tập con** 8 route đã biết, nên thêm route thứ 9 không làm nó đỏ. Route Từ chối phải được thêm tay vào danh sách `expected` (tiêu chí 10).
- **Tài liệu:**
  - `docs/SYSTEM-DESIGN.md` §6–§8;
  - `docs/SYSTEM-DESIGN.md` **§16**: thêm một dòng "lệch có chủ ý 5.1" trỏ về ADR-0030 điều 4 và S20-5 (tiền lệ ADR-0029);
  - `docs/CHANGE-GUIDE.md` công thức f (thứ tự câu trong lô);
  - `docs/SO-HANG-RAO.md`: mỗi rào mới kèm ngày thấy chặn thật;
  - nhật ký thay đổi, viết lời thường.

## Trang ghép (`CLAUDE.md` §9) — cho ADR-0030 + Mục S20/S23; lượt 3–4 xem đặc tả §13

**(1) Bảng chứa loại thực thể nào**

| Bảng (module chủ) | Chứa | ADR-0030 + Mục S20/S23 đổi gì |
|---|---|---|
| `dsp_assignment` (`dispatch`) | Dòng `HANDLE` hạt đơn: hồ sơ nội bộ có tài khoản, hoặc hồ sơ không tài khoản. Các loại nhiệm vụ khác không chạm. | Thêm cách **đóng mà không mở** (Từ chối). Mở dòng ngay lúc lập cho người được chọn (S20-4). Không cột mới. |
| `orders` (`orders`) | Đơn do nội bộ, Đối tác, Thực tập lập | Không cột. HDV huỷ từ `draft` (mới). Trạng thái chỉ đi tiến giữ nguyên. Câu huỷ thêm khoá `updated_at` (điều 2). |
| `order_service` (`orders`) | Dịch vụ của đơn, kể cả `pickup_place` là chữ tự do, có thể chứa SĐT (`migrations/0008_order_service.sql:20`) | Không đổi cột. Phần hẹp đọc `pickup_place` và **che dãy từ 8 chữ số** (S23-2, Q-N). |
| `audit_log` (`audit`) | Nhật ký chỉ-thêm của mọi module | Thêm `order_handler_refused`. `cancelled` có lý do. `order_cancelled_by_field` thêm đơn chưa chốt. |
| `order_money_adjustment` (`orders`) | Dòng điều chỉnh của HDV | Lượt 2 (D6, ADR-0023 điều 3): thêm/bớt dịch vụ, cả đơn chưa chốt — theo ADR-0023. |
| Bảng tra cứu lý do | **Không có** | Lý do là hằng trong mã (điều 2). |

**(2) Dòng bản đồ quyền chạm các bảng trên, áp cho loại nào**

| Ô | Hôm nay | Sau | Áp cho |
|---|---|---|---|
| `dispatch.refuse` (mới, lượt 2) | — | `SALES`/`ADMIN`/`FIELD` `assigned`, `SUPER_ADMIN` `any`, còn lại `none`; + chốt "đang phụ trách" | Dòng `HANDLE` **của chính người gọi**, mọi loại đơn (nội bộ lập, Đối tác lập), chưa huỷ, ngoài hạn Q-E |
| `dispatch.claim` (S20) | `FIELD` `none` (`:59`) | `FIELD` `any` + chốt N-2 + `!holdsPartner` | Đơn không có dòng mở, chưa huỷ, chưa qua ngày đi |
| `dispatch.assign` (S20) | `SALES` `ownOrAssigned`, `ADMIN` `any` (`:58`) | Giữ; dùng thêm lúc lập đơn | Đơn của mình lúc lập; mọi đơn (Quản trị); cả đơn đã huỷ |
| `order.cancel` | `FIELD` `assigned`, `SUPER_ADMIN` `any` (`:57`) | Giữ ô; route mở cho `draft` | Đơn HDV đang phụ trách, chưa huỷ, chưa qua ngày đi |
| `order.modify` | như hôm nay (`:53`) | Giữ ô; huỷ qua `/status` phải có lý do | Mọi loại đơn |
| `order.money.edit` (lượt 2, D6) | `FIELD` `assigned` (`:56`) | Giữ ô; theo ADR-0023 điều 3: thêm/bớt dịch vụ, cả đơn chưa chốt | Đơn HDV đang phụ trách, trừ đơn đã huỷ |
| `order.view` / `money.view` (S23) | `FIELD` `none` (`:48-49`) | `FIELD` `assigned` | Đơn HDV đang phụ trách |
| `contact.view` (S23) | `FIELD` `assigned` (`:51`) | Giữ; đòi ở cả "Đơn của tôi" (đã có ở `dispatch/index.ts:102`) | Đơn HDV đang phụ trách; **không** áp cho phần hẹp |
| `order.history.view` (S23) | `FIELD` `none` (`:50`) | `FIELD` `assigned` | Đơn HDV đang phụ trách |
| `order.pool.view` (mới, S23) | — | `FIELD` `any`, `SUPER_ADMIN` `any`, còn lại `none` | Phần hẹp của đơn đang chờ nhận |

**(3) Cổng nào canh cửa nào** (cổng = danh sách mã quyền khai tường minh, ADR-0019 điều 1; `FIELD` chỉ vào cổng `orders` khi dòng S23-5 được thi công — hôm nay `ORDERS_GATE` chưa có `FIELD`, `permissions.ts:122`)

| Cửa | Cổng | Chốt trong thân | Lưới ở dữ liệu |
|---|---|---|---|
| Từ chối (route mới) | `orders` | `can(dispatch.refuse, { assigned })` + đang phụ trách (cả Toàn quyền) + chưa huỷ + hạn Q-E + lý do | Câu đóng theo `party_id` người gọi; nhật ký `changes() > 0`; chỉ mục duy nhất |
| Nhận / Giao (`PUT /api/orders/:id/handler`) | `orders` (đã chuyển ở GĐ2 Phần B, ADR-0019; `dispatch/index.ts:114`) | `handlerChangeVerdict`/`mayChangeHandler` + chốt N-2 (chỉ Nhận) + `!holdsPartner` + `checkAssignee` | `NOT EXISTS` + chỉ mục duy nhất |
| Lập đơn kèm HDV (`POST /api/orders`) | `orders` | `can(dispatch.assign, { ownerId: self })` + `checkAssignee` | Một lô: đơn + dòng `HANDLE` + nhật ký |
| HDV huỷ (`handler-cancel`) | `staff` (`dispatch/index.ts:164`) | `can(order.cancel, { assigned })` + chưa huỷ + `tripDeparted` + hai lý do | Trigger `0017`; khoá `updated_at` (điều kiện tiên quyết, điều 2) |
| Huỷ qua `/status` | `orders` | `can(order.modify, …)` + lý do | Trigger `0017`; khoá `updated_at` |
| Hàng chờ, danh sách, chi tiết đơn (S23) | `orders` | `can(order.pool.view)` + chặn lai / `can(order.view…, { assigned })`; lọc theo người phụ trách qua hàm tiêm của `dispatch` | Danh sách trường được phép; đơn khác → 404 |
| "Đơn của tôi" (`GET /api/dispatch/mine`) | `staff` | `can(contact.view, { assigned: true })` (đã có) | Chỉ đơn của người gọi; thêm đơn nháp (S23-8) |
| Bảng tin (`GET /api/bang-tin`) | `staff` (`src/route-access.test.ts:91`) | `nhanKetNoi` (không `cho-nhan` cho lai); `nhanSuKien` với trạng thái trước "không biết" (S20-8) | — |
| Danh mục cho form lập đơn | Hôm nay: `GET /api/catalog` cổng `orders` (ADR-0028). Sau khi ADR-0033 gộp: `GET /api/catalog` cổng `office` + `GET /api/catalog/for-order` cổng `orders` | Hôm nay: `can(money.view, { ownerId: self })`, HDV 403 ở thân sau S23-5. Sau ADR-0033: `can(order.create)`, HDV 403 | — (xem S23-5) |

## Đếm quyết định chạm quyền/dữ liệu (tối đa 3 mỗi lượt — `CLAUDE.md` §9)

- **Lượt 1** (ADR-0020 + ADR-0023 phần xem + Mục S20/S23; chỉ sau ADR-0019 — đã thoả):
  - **D1** HDV xem gì: ADR-0023 điều 1–2 + S23-1…S23-5, S23-8.
  - **D2** HDV Nhận + chốt Nhận (kèm khai lệch 5.1) + chặn tài khoản lai + ADR-0022 điều 3 / NT-3: ADR-0020 điều 2 + S20-5, S20-8, S20-9.
  - **D3** đơn mới chưa có người + chọn HDV lúc lập + Giao có hiệu lực ngay: ADR-0020 điều 1, 3 + S20-2…S20-4.
  - = **3**.
- **Lượt 2** (sau khi lượt 1 đã thi công):
  - **D4** Từ chối + thay LC-8 + `dispatch.refuse` (điều 1; lệch 5.1 ở điều 4 là **cách thi hành** D4, không phải quyết định thứ tư);
  - **D5** lý do bắt buộc + HDV huỷ đơn chưa chốt (điều 2);
  - **D6** HDV sửa đơn (ADR-0023 điều 3–8).
  - = **3**.
- **Không đếm:**
  - điều 3 (nhãn, bề mặt, không đổi dữ liệu);
  - điều 5 (trỏ lượt sau);
  - S20-10…S20-13, S23-7: ghi trạng thái đã thoả, hoặc áp ADR đã duyệt;
  - khoá `updated_at`: sửa lỗi nền.

## Phụ thuộc — trước khi thi công (hiện trạng đọc từ repo 2026-09-27)

- **ADR-0019:** accepted 25/9. GĐ2 Phần B **đã lên production bản 1.18** (2026-09-27 10:02 giờ VN), theo tệp trạng thái ở nhánh `ghi-trang-thai-1-18`. `docs/HANDOFF-N1.md` trên `main` mới ghi tới 1.17. **AI chưa tự kiểm production bằng lệnh.**
- **ADR-0017:** accepted 24/9, **chưa thi công**: `ORDERS_GATE` chưa có `FIELD` (`permissions.ts:122`), `order.view` của `FIELD` = `none` (`:48`).
  - Kế hoạch GĐ2 Phần C (Task C1 bước 2) đặt bốn ô `FIELD` = `any`. Đó là cửa một chiều: HDV xem mọi đơn kể cả tiền.
  - Đặc tả §11 mục 1 cấm thi công riêng ADR-0017 trước ADR-0023.
  - Nhánh `danh-muc-lap-don` (chưa gộp) đã ghi dòng **DỪNG** ở Phần C (commit a74048e).
  - ⇒ Phần C + D được thay bằng lượt 1 ở đây (câu hỏi 3).
- **ADR-0020, ADR-0023:** **proposed**, chưa duyệt (mục lục `docs/adr/README.md`).
- **ADR-0022:** accepted (bản 1.16).
- **ADR-0025** (khoá "Đã giao"), **ADR-0024** (`v_ord_order_state`): proposed. Các ca "Từ chối/huỷ sau Đã giao" chưa có chặn cho tới khi hai ADR này được duyệt.
- **ADR-0033** (danh mục cho người lập đơn): **accepted** 2026-09-27 trên nhánh `danh-muc-lap-don`, **chưa gộp** `main`. S23-5 đã viết cho cả hai trường hợp.
  - **Cảnh báo gộp:** nhánh đó và nhánh này **cùng thêm một dòng ngay sau dòng 0029** của `docs/adr/README.md` (0033 và 0030). Khi gộp sẽ xung đột; người gộp giữ **cả hai dòng**, xếp 0030 trước 0033.
- **Sửa lỗi nền trước Q-G:** thêm khoá `updated_at` vào câu huỷ (điều 2; T1d). Không cần ADR riêng.
- **Bảng mới của `orders`:** ADR-0030 không thêm bảng nào của `orders`. Mọi bảng mới của `orders` về sau (đặc tả §9A: bảng lý do bổ sung, cài đặt phía `orders` — ADR-0031/0032) chỉ được thêm **sau khi**:
  - đăng ký tiền tố `ord_` (Q-AA đã chốt); và
  - khoá danh sách bảng `legacy` trong `src/architecture.test.ts` (T3b).
- **Thứ tự:**
  1. duyệt lượt 1;
  2. thi công lượt 1 (đỏ → xanh, e2e, Chrome, người kiểm độc lập);
  3. sửa khoá `updated_at`;
  4. duyệt lượt 2 (ADR-0030 điều 1–5 + ADR-0023 phần sửa);
  5. thi công lượt 2.

## Tiêu chí nghiệm thu (hành vi kiểm được; lấy từ đặc tả §12 — phần của ADR-0030)

1. **Từ chối (e2e).**
   - Không lý do, hoặc lý do ngoài danh sách → 400.
   - Có lý do → 200. Đơn không còn dòng `HANDLE` mở. Có đúng một dòng `order_handler_refused`, không SĐT.
   - Hướng dẫn viên (chỉ quyền `FIELD`) vừa trả mở chi tiết → 404; thấy đơn ở hàng chờ dạng phần hẹp.
   - Bán hàng vừa trả (`order.view = any`) mở chi tiết → 200 như trước.
2. **Ai.** Toàn quyền không đang phụ trách → 403. Bán hàng không phụ trách → 403. Kế toán, Đối tác, Thực tập → 403.
3. **Khi nào.**
   - Đơn đã huỷ → 409.
   - Ngày đi là hôm nay hoặc ngày mai → 409 "Gọi văn phòng để đổi người". Ngày đi tính theo trả lời câu hỏi 1.
   - Đã qua ngày đi → 409.
   - Ngày đi là ngày kia → 200. Đồng hồ hoặc ngày tương đối phải tiêm được.
   - Đơn chưa có ngày đi nào → 200 (ADR-0027 điều 3).
4. **Đua.**
   - Văn phòng đổi người đúng lúc HDV Từ chối → một bên thắng, bên kia 409 `stale`; không dòng nhật ký thừa; tối đa một dòng `HANDLE` mở.
   - HDV khác Nhận đúng lúc Từ chối → lệnh tới trước thắng.
5. **Chrome, hai tài khoản:** A Từ chối → trong ≤ 5 giây đơn hiện ở hàng chờ của HDV B, kèm thông báo "vừa được trả lại".
6. **Bảng tin (hàm thuần).** Sự kiện `tu_choi` gắn `cho-nhan` + `nguoi:<người trả>`. Tài khoản lai không hiện thông báo nổi về đơn chờ nhận.
7. **Huỷ.**
   - `/status` → `cancelled` không lý do, hoặc lý do ngoài danh sách → 400. Có lý do → chi tiết nhật ký `cancelled` là lý do đó.
   - HDV huỷ **đơn chưa chốt** mình phụ trách với một trong hai lý do → 200, đơn `cancelled`, nhật ký `order_cancelled_by_field`. Lý do khác → 400. Đã qua ngày đi → 409 (giữ).
   - **Khoá lạc quan:** đổi `updated_at` giữa lúc đọc và lúc ghi (vd `PUT /trip`) → huỷ trả 409, không dòng nhật ký. Test đỏ trước trên mã hôm nay.
8. **Nhãn.** Đơn đã lưu chưa chốt hiện "Chờ xác nhận" ở mọi màn (không còn "Nháp"). Có "Chờ nhận", "HDV: <tên>", "Đã huỷ · HDV huỷ: <lý do>". Không lộ mã thô.
9. **LC-8.** Câu kiểm mới của `audit-invariants` xanh trên D1 local sau e2e (đã thay `dropHandler`). Mức "vi phạm" chỉ đặt sau khi chủ chạy truy vấn chỉ-đọc trên remote.
10. **Hàng rào.**
    - `dispatch.refuse` vào `MATRIX` cùng commit với route hỏi nó; hàng rào 1 và 2 xanh.
    - Route Từ chối được **thêm tay** vào `expected` của `bang-tin-guard.test.ts:204`.
    - Hàng rào "mọi route ghi đơn phải báo" xanh.
    - Các bài "đỏ có chủ ý" chỉ đổi sau khi chủ duyệt.
    - Mỗi rào mới có dòng ở `docs/SO-HANG-RAO.md`, kèm ngày thấy chặn thật (sửa cố ý → đỏ → hoàn nguyên).
11. **Không đổi:** e2e quyền hiện có của Thực tập, Đối tác, Kế toán vẫn xanh.
12. **Lệnh:** `npm test` xanh, `npm run typecheck` 0 lỗi, `npm run test:e2e` xanh, `audit-invariants` đạt. **Người kiểm độc lập chỉ đọc ĐẠT.**

**Mục S20/S23 (lượt 1):** đặc tả §12 mục 1, 2, 3, 4, 8 (tách ba đường, phần hẹp, Bảng tin không lộ tin, Nhận có chốt, lập đơn kèm HDV). Thêm:
- "Đơn của tôi" có đơn nháp HDV đang phụ trách.
- Tài khoản chỉ-`FIELD` vào `/` được chuyển sang `/orders` và thấy danh sách (không phải trang lỗi 403).

## Câu hỏi cho chủ khi duyệt

1. **"Ngày đi" cho mốc "hôm nay hoặc ngày mai" khi đơn cũ có nhiều ngày.** ADR-0021 chưa ép một ngày ở máy chủ, nên đơn cũ có thể có nhiều ngày.
   - **(a) Khuyến nghị: theo ADR-0027 điều 3** — ngày đi = ngày khởi hành **lớn nhất**. Chặn khi ngày đó ≤ ngày mai. Được: một định nghĩa "ngày đi" cho cả Nhận, Huỷ, Từ chối. Mất: đơn cũ có dịch vụ đi sớm (vd hôm nay) mà dịch vụ khác đi xa vẫn trả được.
   - **(b) Ngày khởi hành sớm nhất** ≤ ngày mai → 409. Chặt hơn, nhưng là **định nghĩa thứ hai, khác ADR-0027**. Viết theo "sớm nhất ≤ ngày mai", không viết "rơi vào hôm nay hoặc ngày mai", vì đơn có ngày [hôm qua, ngày mai] sẽ lọt.
2. **Cách áp Mục S20/S23.**
   - **Khuyến nghị:** khi chủ duyệt lượt 1, AI chép đúng các dòng S20/S23 vào hai bản nháp ADR-0020/0023 **trước** khi đổi trạng thái. Hai bản đó chưa accepted, và mục lục ADR chỉ khoá ADR đã accepted. Như vậy mỗi ADR đọc một mình vẫn đúng.
   - **Cách khác:** giữ ở đây, như ADR-0025 đã làm với ADR-0023.
3. **Bỏ Phần C + D của kế hoạch GĐ2 và thay bằng lượt 1 ở đây?** Khuyến nghị: **có**. Chạy Phần C như đang viết thì HDV xem được mọi đơn kể cả tiền (cửa một chiều). Nhánh `danh-muc-lap-don` đã ghi dòng DỪNG, chờ gộp.
