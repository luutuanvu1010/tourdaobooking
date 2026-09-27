# ADR-0030 — Người phụ trách "Từ chối" đơn (đơn về Chờ nhận, thay LC-8); mọi lần Từ chối/Huỷ có lý do; hướng dẫn viên huỷ được đơn chưa chốt

- **Trạng thái:** **proposed** — AI soạn 2026-09-27 (vai lập kế hoạch) từ đặc tả `docs/superpowers/specs/2026-09-26-don-tu-do-hdv-nhan-tu-choi-design.md` (dưới đây gọi "đặc tả"); chủ dự án đã trả lời mọi câu hỏi mở ngày 2026-09-26/27 (đặc tả §0, §1, §9A). **Trả lời của chủ CHƯA phải là duyệt ADR này**: Q-B (LC-8), Q-C, Q-G, Q-K và "Giao có hiệu lực ngay" đổi quyết định đã duyệt, nên phải qua lượt duyệt có trang ghép (`CLAUDE.md` §9). AI **không tự duyệt** (N3, Điều 7.2). Sau khi accepted chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-27   **Người phê chuẩn:** chủ dự án (chưa duyệt)
- **Loại quyết định:** **cửa hỗn hợp** — hai chiều cho mã, route, ô quyền, nhãn; **một chiều** cho SĐT/tiền hướng dẫn viên đã xem qua "nhận rồi từ chối" và cho dòng nhật ký chỉ-thêm. Chi tiết: mục "Loại cửa".
- **Hai phần, hai lượt duyệt:** **Điều 1–5** trình ở **lượt 2**. **Phần A** (sửa bản nháp ADR-0020) và **Phần B** (sửa bản nháp ADR-0023) là đề xuất trình ở **lượt 1**, cùng ADR-0020 và phần "xem" của ADR-0023. Xem mục "Đếm quyết định".
- **Hiến chương áp (Điều 6.1):** 1.2, 4.1 (căng — điều 3), **5.1 (lệch có chủ ý — điều 4)**, 5.3, 5.5, 5.8 (khớp — điều 1), 5.10, 5.12, 5.13, 6.3.
- **Xây trên lỗ đang hở: không.** `docs/quyen-hoan.json` trên `main` dc4b4f9 (đọc 2026-09-27): `money.view`, `contact.view`, `admin.manage` và `PUT /api/maintenance` **đã gỡ** (ADR-0019 Phần B); còn hoãn `task.progress`, `dispatch.guides.view` (hạn 2026-11-30), `payment.receive`, `payment.refund`, `invoice.request`, `invoice.issue` (hạn 2026-12-31) và 7 ngoại lệ tự phục vụ `/api/account/*`; `phat_hien` rỗng. ADR này không chạm mục nào trong số đó. Dòng "Xây trên lỗ đang hở: `money.view`, `contact.view`, `admin.manage`" ở đầu đặc tả **đã cũ**.
- **Dẫn chứng mã** theo `main` dc4b4f9 (bản 1.18). Nhiều số dòng trong đặc tả viết **trước** ADR-0019 Phần B nên đã lệch; người thi công dùng số dòng ở ADR này.

## Bối cảnh

Chủ muốn hướng dẫn viên (HDV) được **trả** đơn mình đang phụ trách khi bận ("Từ chối"), đơn quay về hàng chờ; mọi lần từ chối hay huỷ phải có lý do chọn nhanh; HDV đã nhận đơn chưa chốt mà gọi khách không được thì huỷ được (đặc tả §3, câu (3)). Hôm nay:
- Không có đường nào đóng dòng phụ trách mà không mở dòng mới (`src/modules/dispatch/service.ts:25-32`), vì LC-8 (ADR-0018 điều 5) cấm đơn đã có người rơi về "chưa có ai".
- Huỷ qua `POST /api/orders/:id/status` không nhận lý do (`src/modules/orders/index.ts:324-357`).
- HDV huỷ (`POST /api/orders/:id/handler-cancel`) chỉ với đơn đã xác nhận (`src/modules/dispatch/index.ts:170`); hàm công bố `cancelOrderByHandler` gắn cứng `"confirmed"` (`src/modules/orders/index.ts:90-92`).

Chủ đã chốt: Q-A Cách 1, Q-B (a), Q-D, Q-E, Q-F (a), Q-G, Q-H, Q-O (a) (đặc tả §0, §1).

## Sửa những câu nào của quyết định đã duyệt (nguyên văn → mới) — thuộc điều 1–5

| Nguồn | Nguyên văn | Sau ADR-0030 |
|---|---|---|
| **ADR-0018 điều 5**, LC-8 | "LC-8 sau lần nhận đầu, đơn luôn có người phụ trách." | "LC-8 sau lần nhận đầu, đơn luôn có người phụ trách, **trừ khi chính người đang phụ trách Từ chối kèm lý do**; khi đó đơn về Chờ nhận cho tới khi có người Nhận hoặc được Giao." |
| Đặc tả mô hình vai (đã duyệt 24/9) §6, dòng LC-8 (dòng 192), **vế đầu** | "**Sau lần tiếp nhận đầu, đơn luôn có người phụ trách**" | Như dòng trên. **Vế sau** ("đổi người chỉ hoàn tất khi người mới bấm Nhận; tới lúc đó người cũ vẫn phụ trách") được thay ở **Phần A** (lượt 1), không ở đây. |
| **ADR-0014 điều 11** (mở rộng điều 6, cấp hẹp "sau xác nhận") | HDV đang phụ trách huỷ đơn đang phụ trách, hai lý do đóng — mã chỉ cho đơn **đã xác nhận** | HDV huỷ được **cả đơn chưa chốt** mình đang phụ trách; giữ đúng hai lý do; giữ mốc "không huỷ tour đã qua ngày đi" (ADR-0027 điều 3). |
| ADR-0014 điều 11, gạch 1 | "`SALES`/…/`PARTNER` … tiếp tục huỷ qua `order.modify` như hôm nay, không đổi" | Vẫn huỷ qua `order.modify` (ô không đổi), nhưng **phải chọn lý do** (điều 2). |
| **ADR-0022**, mục "Trả lời của chủ", Q-B | "thông báo nổi cho: đơn mới chưa có người (…), có người nhận / đổi người phụ trách, xác nhận, huỷ; sửa nội dung/chuyến/tiền chỉ làm mới." | Thêm **"đơn vừa được trả lại (Từ chối)"** vào danh sách hiện nổi. Hiện cho mọi người nhận tin được hiện nổi (Q-F (a) — trong khuôn điều 3 hiện hành; nhắm riêng người nhận = ADR mới). |
| ADR-0020 điều 5 (proposed) | "huỷ đơn đã xác nhận kèm lý do" | Xem Phần A, dòng A7. |

## Quyết định

**1. Từ chối (D4).** Người **đang phụ trách** một đơn (có tài khoản) được **trả** đơn đó; đơn về hàng chờ, chưa có ai phụ trách.
   - **Ai:** chỉ tự trả đơn **của chính mình** (Q-D). Ô mới **`dispatch.refuse`**: `SALES`, `ADMIN`, `FIELD` = `assigned`; `SUPER_ADMIN` = `any` (giữ ADR-0014 điều 2 "any ở mọi thao tác"); `ACCOUNTING`, `PARTNER`, `INTERN` = `none`. Route **thêm một chốt riêng** "người gọi đang phụ trách đơn này", áp cả Toàn quyền → không thì **403**. Đây không phải ngoại lệ của điều 2 ADR-0014: thao tác chỉ định nghĩa trên dòng phụ trách của chính người gọi. Khác route sửa số khách (`dispatch/index.ts:196`), nơi Toàn quyền qua được khi không phụ trách.
   - **Khi nào không được (409):** đơn **đã huỷ**; **ngày đi là hôm nay hoặc ngày mai** (giờ VN, `vnToday`) → "Gọi văn phòng để đổi người"; đã qua ngày đi (Q-E, áp mọi người). Sau này: từ "Đã giao" (trigger của ADR-0025, **chưa có**). Người phụ trách là hồ sơ không tài khoản: không ai tự từ chối được, văn phòng Giao người khác.
   - **Lý do bắt buộc** (điều 2). Thiếu hoặc ngoài danh sách → **400**.
   - **Một lô ghi** (Hiến chương 1.2): đóng dòng `HANDLE` đang mở **mang `party_id` của người gọi** (khuôn `CLOSE_HANDLER`, `dispatch/repository.ts:46-51`), **không** mở dòng mới, + nhật ký `order_handler_refused` với `changes() > 0`. Thua đua (vừa bị đổi người) → 409 `stale`, không dòng nào thay đổi. Nhận đúng lúc đang Từ chối: lệnh tới trước thắng.
   - **Sau Từ chối:** người vừa trả mở chi tiết đơn → 404 như đơn người khác (ADR-0023 điều 1), nhưng thấy lại đơn trong hàng chờ ở dạng phần hẹp. Văn phòng **được** Giao lại cho chính người đó. Bảng chọn người hiện "đã từ chối lúc … — <lý do>", đọc qua hàm công bố của module `audit` (`dispatch` không đọc thẳng `audit_log`, `dispatch/repository.ts:1-3`).
   - **Bảng tin:** loại mới `tu_choi`. Route truyền trạng thái phụ trách **trước** thay đổi thật (bước (3) của N-1, đặc tả §8), nên sự kiện gắn `cho-nhan` + `nguoi:<người vừa trả>`. Câu nổi: "Đơn TD-… vừa được trả lại, đang chờ người nhận". Phát **sau** khi lô thành công (Hiến chương 5.10; ADR-0022 điều 5).
   - **Không** làm nút "gỡ người phụ trách" cho văn phòng (B2): văn phòng đổi thẳng sang người khác như hôm nay.
   - **Không** đếm và **không** hạn mức ở ADR này (điều 5). 5.8: quyền Từ chối xét theo **vai người phụ trách trên chính đơn**, khớp Hiến chương.

**2. Lý do bắt buộc cho mọi Từ chối/Huỷ; HDV huỷ được đơn chưa chốt (D5).**
   - **Danh sách đóng** (Q-H). "Khác" **không kèm ô chữ**, vì nhật ký chỉ-thêm (`migrations/0017_order_status_audit_guards.sql:17-21`) không gỡ được SĐT gõ nhầm.
     - **Từ chối:** "Bận lịch khác", "Ốm / việc riêng", "Không phù hợp tuyến/dịch vụ", "Khác".
     - **Huỷ qua `POST /api/orders/:id/status`:** "Khách đổi ý", "Khách đặt trùng", "Sai thông tin — lập lại đơn", "Khác". Áp **mọi ai** huỷ bằng đường này (Bán hàng, Quản trị, Toàn quyền, Đối tác và Thực tập với đơn của mình), theo câu (3) của chủ "bất cứ hành động … huỷ nào cũng cần có lý do" (*giả định của AI, bề mặt: Đối tác/Thực tập dùng cùng danh sách*).
     - **HDV huỷ (Aborted):** giữ đúng hai lý do "Không liên hệ được với khách", "Khách yêu cầu huỷ" (ADR-0014 điều 11; `dispatch/rules.ts:74-80`).
   - Danh sách là **hằng trong mã**, cùng khuôn `CANCEL_REASONS` (`dispatch/rules.ts:74`). Nhật ký ghi nhãn tiếng Việt vào chi tiết. **Không** bảng tra cứu, **không** migration (đặc tả §7). Xem câu hỏi 1.
   - **HDV huỷ đơn chưa chốt (Q-G):** route `handler-cancel` bỏ 409 "chưa xác nhận" (`dispatch/index.ts:170`), chỉ còn chặn đơn đã huỷ; giữ chặn đã qua ngày đi (`:171`). Hàm công bố `cancelOrderByHandler` (`orders/index.ts:90`) nhận **trạng thái trước** (`draft` hoặc `confirmed`). Đây là **đổi hợp đồng `orders`↔`dispatch`** (ADR-0007 điều 4(b)): đổi trong cùng commit, test đỏ trước. Ô `order.cancel` không đổi.
   - HDV huỷ **không** tính vào hạn mức Từ chối (Q-P2 — ADR-0032).

**3. Hai lớp và nhãn (Cách 1 của Q-A) — bề mặt, không đổi dữ liệu.**
   - Lớp **đơn** giữ nguyên: `draft → confirmed → cancelled`, chỉ đi tiến. **"Đã xác nhận" giữ nghĩa cũ**: chốt với khách, khoá dịch vụ/số khách/tiền, chữ trên biên nhận (đặc tả Phụ lục A).
   - Lớp **phân công** suy từ việc có dòng `HANDLE` đang mở hay không. Không thêm cột trạng thái phân công (ADR-0020 điều 9). Nhãn: **"Chờ nhận"** (thêm "được trả lại" khi lần đóng gần nhất là Từ chối) hoặc **"HDV: <tên>"**. Không dùng chữ "xác nhận" cho việc nhận đơn.
   - Đơn **đã lưu mà chưa chốt**: "Nháp" → **"Chờ xác nhận"** (`web/format.ts:23`), đúng chữ biên nhận đang in (`src/shared/order-confirmation.ts:72`) — Q-A2.
   - Đơn huỷ: **"Đã huỷ · <lý do>"**; HDV huỷ: **"Đã huỷ · HDV huỷ: <lý do>"**. Không lộ mã thô (`cancelled`…).
   - **Căng với Hiến chương 4.1:** nhãn "được trả lại", "HDV huỷ", "đã từ chối lúc…" dựng từ nhật ký, không từ trạng thái trong bảng. Tiền lệ: ADR-0014 điều 11 cũng giữ lý do huỷ chỉ trong nhật ký. Lượt đầu chỉ hiện ở chi tiết đơn và màn HDV (G2). Nhãn ở danh sách đơn văn phòng: kế hoạch đo rồi chọn (đọc thêm nhật ký hay thêm cột — thêm cột phải có ADR riêng).

**4. Lệch có chủ ý: 5.1** (mẫu ADR-0029; Q-O (a)), **vì** ở tầng dữ liệu không phân biệt được các đường ghi mà luật cần phân biệt.
   - **Luật chỉ ở mã máy chủ**, không có trigger hay `CHECK`:
     - (a) LC-8 mới: chỉ người phụ trách tự đóng dòng mà không mở dòng mới;
     - (b) chặn Từ chối đơn đã huỷ, và hạn Q-E;
     - (c) chốt Nhận đơn đã huỷ / đã qua ngày đi (Phần A, dòng A5);
     - (d) lý do bắt buộc.
   - **Vì sao không có lớp dữ liệu:**
     - Nhận và Giao-cho-chính-mình chạy **cùng một câu** chèn (`INSERT_HANDLER_IF_NONE`, `dispatch/repository.ts:34-39`).
     - Từ chối và Giao-đổi-người đều **đóng** một dòng; câu đóng chạy trước câu mở nên trigger không thấy câu sau.
     - Trigger không biết ai gọi, nên hoặc chặn luôn Giao trên đơn huỷ (trái Q-D), hoặc không chặn được Nhận.
   - **Lưới dữ liệu còn giữ:** chỉ mục duy nhất một dòng mở mỗi đơn (`migrations/0014_dispatch.sql:58-59`), trigger trạng thái chỉ đi tiến và nhật ký chỉ-thêm (`0017`). Thêm **câu kiểm LC-8 mới** ở `audit-invariants` làm lớp **phát hiện** (không chặn); hôm nay chưa có câu LC-8 nào.
   - **Khi nào gỡ lệch** (ADR mới do chủ duyệt): khi có khoá "Đã giao" của ADR-0025, hoặc khi chủ chấp nhận "không ai nhận/giao/đổi người trên đơn đã huỷ". Lúc đó thêm trigger `BEFORE INSERT/UPDATE` dòng `HANDLE` của đơn `cancelled`, đọc view công bố trạng thái đơn (`v_ord_order_state` của ADR-0024 — **còn proposed** — hoặc một view nhỏ mới của `orders`), bằng migration chỉ-thêm. Đó là phương án Q-O (b).

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

## Phần A — đề xuất sửa bản nháp ADR-0020 (trình ở lượt 1, cùng ADR-0020)

| # | Nguồn | Nguyên văn | Mới |
|---|---|---|---|
| A1 | ADR-0020 mục "Không đổi" | "LC-8 (…) — ADR-0020 chỉ đổi **trước** lần tiếp nhận đầu." | "LC-8 đổi bởi ADR-0030 điều 1 (Từ chối). ADR-0020 vẫn chỉ đổi phần trước lần tiếp nhận đầu." |
| A2 | ADR-0020, dòng "ADR-0018 điều 7, câu 2", cột mới | "Phần 'chọn người khác = đề nghị' **giữ nguyên** (hiện thực ở giai đoạn 5 …; tới lúc đó 'chọn người' vẫn có hiệu lực ngay như hôm nay)." | **Thay hẳn**, không còn là tạm: chọn/giao một người thì người đó phụ trách **ngay** (chủ, Q-Q: "hệ thống tự gán ngay khi có người chủ động lựa chọn HDV đó"). Người đó Từ chối được sau (ADR-0030). Đối tác vẫn chỉ **đề xuất** (ADR-0018 điều 9). |
| A3 | **ADR-0018 điều 7** câu 3; đặc tả mô hình vai §6 LC-8 **vế sau** (dòng 192), §8 dòng 226 | "Đổi người: người cũ giữ tới khi người mới bấm Nhận." / "đổi người chỉ hoàn tất khi người mới bấm 'Nhận'; tới lúc đó người cũ vẫn phụ trách" | **Giao/đổi người có hiệu lực ngay**; không có khoảng "chờ người mới bấm Nhận". |
| A4 | ADR-0020 điều 1 ("đường tiêm `defaultHandlerStatement` … **gỡ hẳn**, không để lại hàm trả `null`"), Lý do gạch 3, Hệ quả gạch 1 | gỡ hẳn đường tiêm | **Giữ và đổi dạng** (Q-C) đường tiêm — hợp đồng `orders`↔`dispatch`, ADR-0007 điều 4(b); hôm nay ở `orders/index.ts:207`, `:223`. Chi tiết:<br>• Lô tạo đơn nhận câu mở dòng `HANDLE` cho **người được chọn** trong form, **không bao giờ** mặc định người lập, kèm nhật ký `order_handler_changed`. Không chọn ai → không có câu nào, đơn Chờ nhận.<br>• Chọn được: ai có `dispatch.assign` trên đơn của mình (Bán hàng, Quản trị, Toàn quyền). Thực tập, Đối tác không chọn được (G4).<br>• Người được chọn phải qua `checkAssignee` (`dispatch/rules.ts:50`); không đạt → **400** và **không** tạo đơn.<br>• Bảng tin phát `tao`, không phát `giao`. |
| A5 | ADR-0020 điều 2 (thêm) | — | **Chốt Nhận (N-2).** Đây là đổi có chủ ý chú thích "CỐ Ý không xét trạng thái đơn" ở `dispatch/index.ts:122-123`.<br>• **Nhận** → **409** nếu đơn **đã huỷ**, **đã qua ngày đi** (`tripDeparted`, mốc ADR-0027), hoặc — khi có ADR-0025 — **Đã giao**. Áp **mọi người**.<br>• **Giao** cho người khác trên đơn huỷ vẫn được.<br>**Chặn tài khoản lai** (có quyền Đối tác kèm quyền khác — `holdsPartner`, `permissions.ts:140`; Q-M) ở bốn cửa:<br>• danh sách chờ nhận;<br>• Nhận (403);<br>• `checkAssignee`;<br>• Bảng tin: không nhãn `cho-nhan`, không thông báo nổi về đơn chờ nhận. |
| A6 | ADR-0020 dòng "Phụ thuộc" | "sau khi ADR-0019 (…) và ADR-0017 (…) đã lên production" | "Sau ADR-0019 (Phần B đã lên bản 1.18) **và phần xem của ADR-0023 theo Phần B dưới đây**, thay cho ADR-0017 điều 1; **không** thi công ADR-0017 nguyên dạng. `dispatch.claim` của `FIELD`: `none` → `any` cùng đợt." |
| A7 | ADR-0020 điều 5 | "(sửa số khách sau xác nhận, huỷ đơn **đã xác nhận** kèm lý do …)" | "Theo ADR-0023 (sửa) và ADR-0030 điều 2 (huỷ cả đơn chưa chốt)." |
| A8 | **ADR-0022 điều 3** (accepted) | "Nhóm nhận suy từ ô `order.view` hiện hành, không đặt luật quyền mới: `any` → tag `tat-ca`; còn lại → `nguoi:<staffId>`. Sự kiện về một đơn gửi tới `tat-ca` + người lập + người phụ trách cũ + người phụ trách mới." | Giữ câu cũ, **thêm**:<br>• Kết nối có `dispatch.claim` và **không** có quyền Đối tác mang thêm nhãn `cho-nhan`, **kể cả khi `order.view` ≠ `any`** (hướng dẫn viên).<br>• Sự kiện gắn `cho-nhan` khi (a) **sau** thay đổi đơn không còn ai phụ trách, hoặc (b) route truyền trạng thái trước **thật** và trước đó chưa có ai.<br>• Mặc định trạng thái trước đổi thành **"không biết"** (thay "chưa ai" ở `src/index.ts:47`). "Không biết" không bao giờ sinh `cho-nhan` (N-1 bước (1)(2)). |
| A9 | **NT-3** (`src/shared/bang-tin.test.ts:55-65`) | "mọi mã quyền có `dispatch.claim` khác none đều có `order.view = any`" | **Đỏ trước có chủ ý**, rồi thay bằng: một kết nối không có `tat-ca` chỉ nhận sự kiện có nhãn `cho-nhan` của đơn **đang hoặc vừa rời** hàng chờ, không bao giờ sự kiện của đơn người khác đang phụ trách (hàm thuần, suy từ `MATRIX`, 128 tập con, + e2e đặc tả §12 mục 3). |

## Phần B — đề xuất sửa bản nháp ADR-0023 (phần "xem" trình ở lượt 1; phần "sửa" ở lượt 2)

| # | Nguồn | Nguyên văn | Mới |
|---|---|---|---|
| B1 | ADR-0023 điều 1; Hệ quả gạch 1 ("ô `order.view` của `FIELD` cần một phạm vi mới … hoặc route riêng … — chọn ở kế hoạch") | chưa chọn | **Cách (i), Q-I:**<br>• thao tác mới **`order.pool.view`**: `FIELD` = `any`, `SUPER_ADMIN` = `any`, còn lại `none`;<br>• `order.view`, `money.view`, `contact.view`, `order.history.view` của `FIELD` = **`assigned`**.<br>Không thêm phạm vi thứ sáu cho `Scope` (cách (ii) bị loại: đổi hợp đồng `can()`). |
| B2 | ADR-0023 điều 1, gạch 1 (đơn chờ nhận) | "mã đơn, ngày đi, dịch vụ, số khách, nơi đón/giờ đón. Không SĐT…, không tiền, không lịch sử" | Giữ, **thêm**:<br>• Dựng từ **danh sách trường được phép** ở máy chủ (Hiến chương 4.4).<br>• Nơi đón **che mọi dãy từ 8 chữ số** trở lên, đếm sau khi bỏ dấu cách/chấm/gạch (Q-N).<br>• Là **ngoại lệ có tên** của chú thích ô `contact.view` (`permissions.ts:51` gộp "điểm đón, giờ" vào liên hệ).<br>• Chỉ gồm đơn không có dòng `HANDLE` mở, chưa huỷ, chưa qua ngày đi. Tài khoản lai không thấy (Q-M).<br>• Bài khoá `cong-quyen.test.ts:19` chỉ canh `order.view`/`money.view`, không canh `order.pool.view`. Vì vậy thêm **một bài kiểm riêng** cho phần hẹp và một dòng ở `docs/SO-HANG-RAO.md`. |
| B3 | ADR-0023 điều 1, gạch 2 (đơn mình phụ trách) | "đủ như người lập thấy, kể cả SĐT khách và tiền" | Thêm "**kể cả lịch sử**" (`order.history.view` = `assigned`, câu (2) của chủ). |
| B4 | ADR-0023 điều 1, gạch 3 | "Đơn mình **từng** phụ trách rồi bị đổi: không thấy nữa." | "…rồi bị đổi **hoặc tự Từ chối**: không thấy nữa (404); thấy lại ở hàng chờ dạng phần hẹp." Chi tiết đơn HDV không được xem: **404** (hôm nay 403, `orders/index.ts:241`). **Bẫy:** `GET /api/orders` lọc "người lập = tôi" khi `can(order.view)` không ngữ cảnh trả sai (`orders/index.ts:189-193`). Với `FIELD` = `assigned`, danh sách sẽ **403**. Cần nhánh thứ ba lọc theo người phụ trách qua `v_dsp_order_handler`. |
| B5 | **ADR-0019** (accepted) điều 1 bảng dòng `orders`, điều 3 | "`FIELD` **chỉ khi** ADR-0017 được thi công (điều 3)" / "ô `money.view` của `FIELD` là `any`" | "`FIELD` vào cổng `orders` khi **phần xem của ADR-0023 (bản sửa này)** được thi công; `money.view` của `FIELD` = `assigned`."<br>Hệ quả: `GET /api/catalog` (cổng `orders` từ ADR-0028) trả **403 ở thân** cho HDV (`catalog/index.ts:85`, `can(money.view, { ownerId })`). Như vậy giữ đúng ý ADR-0019 điều 3: hướng dẫn viên không đọc danh mục giá. |
| B6 | Tách lượt | ADR-0023 là một khối | **Lượt 1 (D1):** điều 1–2 + Hệ quả gạch 1 và 4. **Lượt 2 (D6):** điều 3–8 + Hệ quả gạch 2, 3. Khi duyệt lượt 1, dòng trạng thái ghi "accepted phần xem (điều 1–2)". |
| B7 | ADR-0023 dòng 7 ("không được duyệt trước khi ADR-0019 lên production") | điều kiện | **Đã thoả** (bản 1.18). Hai mục này không còn trong `docs/quyen-hoan.json`. |

## Loại cửa

| Phần | Loại | Vì sao |
|---|---|---|
| Mã, route, ô `dispatch.refuse`, danh sách lý do, nhãn, đổi `cancelOrderByHandler` | **hai chiều** | Gỡ bằng một commit. Không migration. Dòng `HANDLE` đã đóng vẫn nằm trong lịch sử, không xoá cứng (Hiến chương 5.5). |
| SĐT, tiền, lịch sử HDV đã xem qua "nhận (Phần A) rồi Từ chối" | **một chiều** | Đã xem thì không thu lại. Giảm nhẹ: nhật ký nhận/từ chối đủ để truy; số lần từ chối và hạn mức ở ADR-0032. |
| Dòng nhật ký `order_handler_refused`, `cancelled` có lý do, `order_cancelled_by_field` | **một chiều** | Nhật ký chỉ-thêm (trigger `0017`). Vì vậy không có chữ tự do. |
| Phần A | hai chiều | Mã + ô `dispatch.claim`. Riêng hàng chờ không lộ SĐT/tiền. |
| Phần B | hai chiều cho ô và cổng; **một chiều** cho SĐT/tiền của đơn mình phụ trách | Như ADR-0023 đã ghi; hẹp hơn ADR-0017. |

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
- **B2, nút "gỡ người phụ trách" cho văn phòng.** Chủ: không ở đợt này. Nếu cần thì làm một ô riêng, không gộp vào Từ chối.
- **Toàn quyền Từ chối thay người khác.** Toàn quyền đã có Giao; "trả thay" làm mờ nghĩa "tự trả" và lẫn với B2.
- **Bảng tra cứu lý do trong cơ sở dữ liệu.** Đặc tả §7 chốt "không bảng"; lý do chỉ nằm ở chi tiết nhật ký, không phải cột mã. Xem câu hỏi 1.

## Rủi ro đã nêu cho chủ (P18 — chủ đã nghe và vẫn quyết, ghi để sau này không ai nói "không biết")

- **Đơn vô chủ sát giờ đi.** Q-E chặn tự trả khi ngày đi là hôm nay hoặc ngày mai. Nhưng trong ngày đi, HDV vẫn **huỷ cả đơn** được (ADR-0027 chỉ chặn từ hôm sau). Hai lý do huỷ là danh sách đóng, không kiểm được là thật. Bảng tin không báo được khi app đóng (ADR-0022).
- **Gom SĐT.** HDV có thể nhận lần lượt nhiều đơn, đọc SĐT, rồi trả. Giảm nhẹ: nhật ký, số lần từ chối cho Quản trị/Toàn quyền, và hạn mức 2 lần liên tiếp, 15 lần/tuần (ADR-0032).

## Hệ quả

- **Dữ liệu:** **không migration, không bảng, không cột** (Q-B (a); đặc tả §7).
  - Từ chối = đóng dòng (`valid_to_at`, `updated_at`, `updated_by`).
  - Hành động nhật ký mới `order_handler_refused` = một dòng ở `src/shared/audit-actions.ts`, không cần migration (`:1-3`). Chi tiết ghi tên người trả + nhãn lý do; **không** SĐT, email, MST (Hiến chương 5.12).
  - `cancelled` ghi nhãn lý do. `order_cancelled_by_field` như cũ, nay cả đơn chưa chốt.
- **Quyền** (`src/shared/permissions.ts` — việc lớn, bắt buộc người kiểm độc lập chỉ đọc):
  - Lượt 2: thêm `dispatch.refuse`.
  - Lượt 1 (Phần A/B): `dispatch.claim` của `FIELD`; thêm `order.pool.view`; bốn ô `FIELD` = `assigned`; `ORDERS_GATE` thêm `FIELD`.
  - Ô mới phải vào `MATRIX` **cùng commit** với route hỏi nó (hàng rào 1, `src/permission-enforcement.test.ts`). **Không** thêm mục hoãn vào `docs/quyen-hoan.json`.
- **Module:**
  - `dispatch` thêm route Từ chối (cổng `orders`, sau Phần B). Tên chọn ở kế hoạch, gợi ý `POST /api/orders/:id/handler-refuse`.
  - Câu lệnh dựng ở `service.ts`, test trên SQLite thật như `service.test.ts`.
  - `orders.cancelOrderByHandler` đổi chữ ký.
  - Route `/status` nhận lý do.
  - Lời báo 403/409 bằng tiếng Việt.
- **Bảng tin:**
  - `THAY_DOI` thêm `tu_choi` (`bang-tin.ts:8`).
  - Route Từ chối gọi `baoThayDoi` chỉ ở nhánh thành công, kèm `handlerTruoc` thật.
  - App cũ bỏ qua loại lạ (`laSuKienHopLe`, `bang-tin.ts:113`), nên ghi vào nhật ký thay đổi.
- **Kiểm dữ liệu:** thêm câu kiểm LC-8 mới ở `scripts/audit-checks.mjs`: đơn từng có dòng `HANDLE`, nay không có dòng mở, thì phải có `order_handler_refused` sau lần đóng cuối.
  - Đặt mức **cảnh báo** trước, **vi phạm** sau. Chủ tự chạy truy vấn chỉ-đọc trên remote trước khi đặt mức "vi phạm".
  - Sẽ đỏ với `dropHandler` của `tests/e2e/dispatch.mjs` (ADR-0020 Hệ quả), nên thay `dropHandler` bằng Từ chối thật.
- **Giao diện:** nút Từ chối + chọn lý do; hộp Huỷ có lý do, kể cả form của Đối tác và Thực tập; hộp hỏi lại "không thể hoàn tác" cho Huỷ; các nhãn ở điều 3. **Bố cục và chữ chờ bản thiết kế của chủ** (bài học Đợt D).
- **Bài kiểm sẽ đỏ có chủ ý** (tín hiệu hỏi chủ, không sửa cho xanh):
  - Lượt 2:
    - `src/shared/permissions.test.ts:40` (26 → 27 thao tác, ảnh chụp ô) và `:177-184` (ADMIN × `dispatch.refuse` = `assigned`);
    - `src/shared/bang-tin.test.ts:18-20` (`THAY_DOI` 9 → 10);
    - `src/bang-tin-guard.test.ts:204` (8 → 9 route);
    - các ca ghim 409 "chưa xác nhận" của `handler-cancel`;
    - `tests/e2e/dispatch.mjs`.
  - Lượt 1:
    - `bang-tin.test.ts:42-53`, `:55-65` (NT-3), `:67`, `:169`;
    - `src/shared/cong-quyen.test.ts:11` (`ORDERS_GATE`);
    - `cong-quyen.test.ts:27-33`: HDV không xem giá đơn mình lập. Thêm ngoại lệ có tên cho `FIELD`, vì `order.create` = `none`;
    - `cong-quyen.test.ts:36-44` ("phần B không đổi hành vi");
    - `permissions.test.ts:10-13`, `:181`.
- **Tài liệu:** `docs/SYSTEM-DESIGN.md` §6–§8; `docs/CHANGE-GUIDE.md` công thức f (thứ tự câu trong lô); `docs/SO-HANG-RAO.md` (mỗi rào mới kèm ngày thấy chặn thật); nhật ký thay đổi lời thường.

## Trang ghép (`CLAUDE.md` §9) — cho ADR-0030 + Phần A/B; lượt 3–4 xem đặc tả §13

**(1) Bảng chứa loại thực thể nào**

| Bảng (module chủ) | Chứa | ADR-0030 + Phần A/B đổi gì |
|---|---|---|
| `dsp_assignment` (`dispatch`) | Dòng `HANDLE` hạt đơn: hồ sơ nội bộ có tài khoản, hoặc hồ sơ không tài khoản. Các loại nhiệm vụ khác không chạm. | Thêm cách **đóng mà không mở** (Từ chối). Mở dòng ngay lúc lập cho người được chọn (A4). Không cột mới. |
| `orders` (`orders`) | Đơn do nội bộ, Đối tác, Thực tập lập | Không cột. HDV huỷ từ `draft` (mới). Trạng thái chỉ đi tiến giữ nguyên. |
| `audit_log` (`audit`) | Nhật ký chỉ-thêm của mọi module | Thêm `order_handler_refused`. `cancelled` có lý do. `order_cancelled_by_field` thêm đơn chưa chốt. |
| Bảng tra cứu lý do | **Không có** | Lý do là hằng trong mã (điều 2); câu hỏi 1. |
| `order_money_adjustment` | Dòng điều chỉnh của HDV | Không chạm (thuộc ADR-0023 D6). |

**(2) Dòng bản đồ quyền chạm các bảng trên, áp cho loại nào**

| Ô | Hôm nay | Sau | Áp cho |
|---|---|---|---|
| `dispatch.refuse` (mới, lượt 2) | — | `SALES`/`ADMIN`/`FIELD` `assigned`, `SUPER_ADMIN` `any`, còn lại `none`; + chốt "đang phụ trách" | Dòng `HANDLE` **của chính người gọi**, mọi loại đơn (nội bộ lập, Đối tác lập), chưa huỷ, ngoài hạn Q-E |
| `dispatch.claim` (A) | `FIELD` `none` (`:59`) | `FIELD` `any` + chốt N-2 + `!holdsPartner` | Đơn không có dòng mở, chưa huỷ, chưa qua ngày đi |
| `dispatch.assign` (A) | `SALES` `ownOrAssigned`, `ADMIN` `any` (`:58`) | Giữ; dùng thêm lúc lập đơn | Đơn của mình lúc lập; mọi đơn (Quản trị); cả đơn đã huỷ |
| `order.cancel` | `FIELD` `assigned`, `SUPER_ADMIN` `any` (`:57`) | Giữ ô; route mở cho `draft` | Đơn HDV đang phụ trách, chưa huỷ, chưa qua ngày đi |
| `order.modify` | như hôm nay (`:53`) | Giữ ô; huỷ qua `/status` phải có lý do | Mọi loại đơn |
| `order.view` / `money.view` (B) | `FIELD` `none` (`:48-49`) | `FIELD` `assigned` | Đơn HDV đang phụ trách |
| `contact.view` (B) | `FIELD` `assigned` (`:51`) | Giữ; đòi ở cả "Đơn của tôi" (đã có ở `dispatch/index.ts:102`) | Đơn HDV đang phụ trách; **không** áp cho phần hẹp |
| `order.history.view` (B) | `FIELD` `none` (`:50`) | `FIELD` `assigned` | Đơn HDV đang phụ trách |
| `order.pool.view` (mới, B) | — | `FIELD` `any`, `SUPER_ADMIN` `any`, còn lại `none` | Phần hẹp của đơn đang chờ nhận |

**(3) Cổng nào canh cửa nào** (cổng = danh sách mã quyền khai tường minh, ADR-0019 điều 1; `FIELD` chỉ vào cổng `orders` khi Phần B, dòng B5, được thi công — hôm nay `ORDERS_GATE` chưa có `FIELD`, `permissions.ts:122`)

| Cửa | Cổng | Chốt trong thân | Lưới ở dữ liệu |
|---|---|---|---|
| Từ chối (route mới) | `orders` | `can(dispatch.refuse, { assigned })` + đang phụ trách (cả Toàn quyền) + chưa huỷ + hạn Q-E + lý do | Câu đóng theo `party_id` người gọi; nhật ký `changes() > 0`; chỉ mục duy nhất |
| Nhận / Giao (`PUT /api/orders/:id/handler`) | `orders` (đã chuyển ở Phần B, `dispatch/index.ts:114`) | `handlerChangeVerdict`/`mayChangeHandler` + chốt N-2 (chỉ Nhận) + `!holdsPartner` + `checkAssignee` | `NOT EXISTS` + chỉ mục duy nhất |
| Lập đơn kèm HDV (`POST /api/orders`) | `orders` | `can(dispatch.assign, { ownerId: self })` + `checkAssignee` | Một lô: đơn + dòng `HANDLE` + nhật ký |
| HDV huỷ (`handler-cancel`) | `staff` (`dispatch/index.ts:164`) | `can(order.cancel, { assigned })` + chưa huỷ + `tripDeparted` + hai lý do | Trigger `0017`; khoá lạc quan `updated_at` |
| Huỷ qua `/status` | `orders` | `can(order.modify, …)` + lý do | Trigger `0017` |
| Hàng chờ, danh sách, chi tiết đơn (B) | `orders` | `can(order.pool.view)` + chặn lai / `can(order.view…, { assigned })`; lọc theo người phụ trách | Danh sách trường được phép; đơn khác → 404 |
| "Đơn của tôi" (`GET /api/dispatch/mine`) | `staff` | `can(contact.view, { assigned: true })` (đã có) | Chỉ đơn của người gọi |
| Bảng tin (`GET /api/bang-tin`) | — | `nhanKetNoi` (không `cho-nhan` cho lai); `nhanSuKien` với trạng thái trước "không biết" (A8) | — |
| Danh mục cho form lập đơn | `GET /api/catalog` cổng `orders` (ADR-0028) | `can(money.view, { ownerId: self })`: HDV 403 ở thân sau B5 | Nhánh `danh-muc-lap-don` (ADR-0033, **chưa gộp**) chuyển danh mục cho người lập đơn sang **route riêng** (đúng Phần A0 kế hoạch GĐ2). AI **chưa thấy tệp ADR-0033** trên nhánh đó lúc soạn. Khi gộp, kiểm lại rằng HDV vẫn không đọc được bảng giá. |

## Đếm quyết định chạm quyền/dữ liệu (tối đa 3 mỗi lượt — `CLAUDE.md` §9)

- **Lượt 1** (ADR-0020 + ADR-0023 phần xem + Phần A/B; chỉ sau ADR-0019 — đã thoả):
  - **D1** HDV xem gì: ADR-0023 điều 1–2 + B1–B5.
  - **D2** HDV Nhận + chốt Nhận + chặn tài khoản lai + ADR-0022 điều 3 / NT-3: ADR-0020 điều 2 + A5, A8, A9.
  - **D3** đơn mới chưa có người + chọn HDV lúc lập + Giao có hiệu lực ngay: ADR-0020 điều 1, 3 + A2–A4.
  - = **3**.
- **Lượt 2** (sau khi lượt 1 đã thi công):
  - **D4** Từ chối + thay LC-8 + `dispatch.refuse` (điều 1; lệch 5.1 ở điều 4 là **cách thi hành** D4, không phải quyết định thứ tư);
  - **D5** lý do bắt buộc + HDV huỷ đơn chưa chốt (điều 2);
  - **D6** HDV sửa đơn (ADR-0023 điều 3–8).
  - = **3**.
- **Không đếm:** điều 3 (nhãn, bề mặt, không đổi dữ liệu) và điều 5 (trỏ lượt sau).

## Phụ thuộc — trước khi thi công (hiện trạng đọc từ repo 2026-09-27)

- **ADR-0019:** accepted 25/9. Phần B **đã lên production bản 1.18** (2026-09-27 10:02 giờ VN) theo tệp trạng thái ở nhánh `ghi-trang-thai-1-18` (**chưa gộp** `main`; `docs/HANDOFF-N1.md` trên `main` mới ghi tới 1.17). **AI chưa tự kiểm production bằng lệnh.**
- **ADR-0017:** accepted 24/9, **chưa thi công**: `ORDERS_GATE` chưa có `FIELD` (`permissions.ts:122`), `order.view` của `FIELD` = `none` (`:48`).
  - **Cảnh báo — rủi ro gần nhất:** kế hoạch GĐ2 **Phần C** (`docs/superpowers/plans/2026-09-25-gd2-thi-cong.md`, Task C1 bước 2) đặt bốn ô `FIELD` = `any`. Đó là cửa một chiều: HDV xem mọi đơn kể cả tiền, và đọc được danh mục giá qua `GET /api/catalog`.
  - Điều kiện mở Phần C ("Phần B lên production") **nay đã thoả**. Đặc tả §11 mục 1 cấm thi công riêng ADR-0017 trước ADR-0023.
  - ⇒ **Không chạy Phần C như đang viết.** Phải viết lại theo Phần B ở trên (`assigned` + `order.pool.view`) và chờ lượt 1 được duyệt.
- **ADR-0020, ADR-0023:** **proposed**, chưa duyệt (mục lục `docs/adr/README.md`).
- **ADR-0022:** accepted (bản 1.16).
- **ADR-0025** (khoá "Đã giao"), **ADR-0024** (`v_ord_order_state`): proposed. Các ca "Từ chối/huỷ sau Đã giao" chưa có chặn cho tới khi hai ADR này được duyệt.
- **Thứ tự:**
  1. duyệt lượt 1;
  2. thi công lượt 1 (đỏ → xanh, e2e, Chrome, người kiểm độc lập);
  3. duyệt lượt 2 (ADR-0030 điều 1–5 + ADR-0023 phần sửa);
  4. thi công lượt 2.

## Tiêu chí nghiệm thu (hành vi kiểm được; lấy từ đặc tả §12 — phần của ADR-0030)

1. **Từ chối (e2e).**
   - Không lý do, hoặc lý do ngoài danh sách → 400.
   - Có lý do → 200. Đơn không còn dòng `HANDLE` mở. Có đúng một dòng `order_handler_refused`, không SĐT.
   - Người vừa trả mở chi tiết → 404; thấy đơn ở hàng chờ dạng phần hẹp.
2. **Ai.** Toàn quyền không đang phụ trách → 403. Bán hàng không phụ trách → 403. Kế toán, Đối tác, Thực tập → 403.
3. **Khi nào.** Đơn đã huỷ → 409. Ngày đi là hôm nay hoặc ngày mai → 409 "Gọi văn phòng để đổi người". Đã qua ngày đi → 409. Ngày đi là ngày kia → 200 (đồng hồ hoặc ngày tương đối tiêm được).
4. **Đua.**
   - Văn phòng đổi người đúng lúc HDV Từ chối → một bên thắng, bên kia 409 `stale`; không dòng nhật ký thừa; tối đa một dòng `HANDLE` mở.
   - HDV khác Nhận đúng lúc Từ chối → lệnh tới trước thắng.
5. **Chrome, hai tài khoản:** A Từ chối → trong ≤ 5 giây đơn hiện ở hàng chờ của HDV B, kèm thông báo "vừa được trả lại".
6. **Bảng tin (hàm thuần).** Sự kiện `tu_choi` gắn `cho-nhan` + `nguoi:<người trả>`. Tài khoản lai không hiện thông báo nổi về đơn chờ nhận.
7. **Huỷ.**
   - `/status` → `cancelled` không lý do hoặc lý do ngoài danh sách → 400. Có lý do → chi tiết nhật ký `cancelled` là lý do đó.
   - HDV huỷ **đơn chưa chốt** mình phụ trách với một trong hai lý do → 200, đơn `cancelled`, nhật ký `order_cancelled_by_field`. Lý do khác → 400. Đã qua ngày đi → 409 (giữ).
8. **Nhãn.** Đơn đã lưu chưa chốt hiện "Chờ xác nhận" ở mọi màn (không còn "Nháp"). Có "Chờ nhận", "HDV: <tên>", "Đã huỷ · HDV huỷ: <lý do>". Không lộ mã thô.
9. **LC-8.** Câu kiểm mới của `audit-invariants` xanh trên D1 local sau e2e (đã thay `dropHandler`). Mức "vi phạm" chỉ đặt sau khi chủ chạy truy vấn chỉ-đọc trên remote.
10. **Hàng rào.**
    - `dispatch.refuse` vào `MATRIX` cùng commit với route hỏi nó; hàng rào 1 và 2 xanh.
    - Hàng rào Bảng tin thấy 9 route.
    - Các bài "đỏ có chủ ý" chỉ đổi sau khi chủ duyệt.
    - Mỗi rào mới có dòng ở `docs/SO-HANG-RAO.md` kèm ngày thấy chặn thật (sửa cố ý → đỏ → hoàn nguyên).
11. **Không đổi:** e2e quyền hiện có của Thực tập, Đối tác, Kế toán vẫn xanh.
12. **Lệnh:** `npm test` xanh, `npm run typecheck` 0 lỗi, `npm run test:e2e` xanh, `audit-invariants` đạt. **Người kiểm độc lập chỉ đọc ĐẠT.**
- **Phần A/B (lượt 1):** đặc tả §12 mục 1, 2, 3, 4, 8 (tách ba đường, phần hẹp, Bảng tin không lộ tin, Nhận có chốt, lập đơn kèm HDV).

## Câu hỏi / điểm cần chủ nhìn khi duyệt

1. **Danh sách lý do nằm trong mã, không phải bảng dữ liệu** (theo đặc tả §7; tiền lệ lý do HDV huỷ). Đổi danh sách = một lần phát hành. Muốn tự sửa danh sách trong app thì cần bảng tra cứu + ADR sau. Khuyến nghị: giữ trong mã.
2. **Hạn Q-E khi đơn chưa có ngày đi hoặc có nhiều ngày** (dữ liệu cũ; ADR-0021 chưa ép ở máy chủ). AI đề xuất:
   - lấy **ngày sớm nhất** (chặt hơn);
   - đơn **chưa có ngày** thì cho Từ chối, vì không có mốc — tới khi ADR-0031 D11 bắt buộc ngày đi.
   Việc này chạm luật, cần chủ xác nhận.
3. **Cách áp Phần A/B.** Khuyến nghị: khi chủ duyệt lượt 1, AI chép đúng các dòng A/B vào hai bản nháp ADR-0020/0023 **trước** khi đổi trạng thái. Hai bản đó chưa accepted, và mục lục ADR chỉ khoá ADR đã accepted. Như vậy mỗi ADR đọc một mình vẫn đúng. Cách khác: giữ ở đây như ADR-0025 đã làm với ADR-0023.
4. **Kế hoạch GĐ2 Phần C phải viết lại** trước khi ai bắt đầu (xem "Phụ thuộc"). Nếu không, HDV sẽ xem được mọi đơn kể cả tiền (cửa một chiều).
5. **Toàn quyền không "trả thay" người khác** (403). Muốn đổi người thì dùng Giao. Đúng đặc tả §5 bước 5.
