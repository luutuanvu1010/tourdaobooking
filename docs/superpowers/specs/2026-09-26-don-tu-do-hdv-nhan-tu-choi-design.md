# Đặc tả (bản nháp): Đơn tự do — hướng dẫn viên nhận, từ chối, huỷ

- **Ngày:** 2026-09-26. **Vai:** lập kế hoạch — không thi công, không sửa ADR hay tệp luật. **Trạng thái:** nháp, bản sửa 2 sau một vòng kiểm độc lập; **chờ chủ trả lời §1 một lần**; chưa trình duyệt.
- **Việc lớn** (quyền, dữ liệu phân công, nhật ký) → thi công xong phải có người kiểm độc lập chỉ đọc (`CLAUDE.md` §3).
- **Xây trên lỗ đang hở: `money.view`, `contact.view`** (`docs/quyen-hoan.json`, hạn 2026-10-15; hai ô chưa được máy chủ hỏi). "HDV không thấy SĐT/tiền của đơn chờ nhận" dựa đúng vào hai ô này → **không duyệt trước khi ADR-0019 lên production**. Mục `phat_hien` của sổ đang rỗng (kiểm 2026-09-26).
- **Hiến chương áp** (Điều 6.1): 1.2, 4.1, 5.1 (bất biến có **hai lớp**: cơ sở dữ liệu **và** mã), 5.3, 5.5, 5.8, 5.10, 5.12, 6.3.
- **Có lệch cần ghi:** vài luật mới chỉ nằm ở mã (Q-O). Theo 6.3 ("không làm mới thêm lệch cùng loại"), ADR mang chúng phải hoặc có dòng "lệch có chủ ý: 5.1, vì …" theo mẫu ADR-0029, hoặc thêm lớp cơ sở dữ liệu.

## 0. Mâu thuẫn cần chủ chốt (đụng quyết định ĐÃ DUYỆT)

### Q-A. "Đã gửi" và "Đã xác nhận"

- **Vướng ở đâu.** Câu (4) giữ hai lớp, nhưng câu (5) định nghĩa trạng thái **đơn** bằng việc có HDV nhận hay chưa.
- **Hôm nay "Đã xác nhận" là bước chốt với khách:** chỉ bấm được khi đủ ngày đi và số khách; sau đó dịch vụ, số khách, tiền bị khoá; biên nhận gửi khách in đúng chữ này; trạng thái chỉ đi tiến, trigger chặn cả SQL chạy tay (Phụ lục A).
- **Cách 1 (khuyến nghị):** giữ nghĩa cũ. Việc nhận đơn hiện thành nhãn riêng "Chờ nhận" / "HDV: <tên>", không dùng chữ "xác nhận". Không đổi dữ liệu.
- **Cách 2a — bấm Nhận là xác nhận luôn.** Không làm được nếu không có ADR đổi luật lõi, vì: HDV không nhận được đơn thiếu ngày hoặc số khách; tiền bị khoá ngay lúc nhận; "Từ chối" phải đưa đơn đi lùi — trái luật đã duyệt.
- **Cách 2b — chỉ đổi tên.** Bước chốt với khách mang tên khác; chữ "Đã xác nhận" chuyển sang nghĩa "có HDV". Không phá bất biến. Phải đổi chữ ở mọi màn hình, trợ giúp, kịch bản kiểm thử, và chọn lại chữ trên biên nhận.
- **Q-A2.** Đơn đã lưu mà chưa chốt hôm nay hiện "Nháp" (`web/format.ts:23`), trong khi chủ nói Nháp = "hệ thống chưa ghi nhận". Khuyến nghị: đổi thành **"Chờ xác nhận"**, đúng chữ biên nhận đang in (`src/shared/order-confirmation.ts:72`).

Phần còn lại viết theo Cách 1. Chọn 2b thì chỉ đổi nhãn ở §4, §9 và biên nhận.

### Q-B. Từ chối đưa đơn về Tự do — vướng luật cứng LC-8

- **Vướng ở đâu.** LC-8 (ADR-0018 điều 5, accepted; đặc tả mô hình vai §6): *"Sau lần tiếp nhận đầu, đơn luôn có người phụ trách: đổi người chỉ hoàn tất khi người mới bấm Nhận; tới lúc đó người cũ vẫn phụ trách."* ADR-0020 ghi rõ không đổi luật này. Hôm nay mã chưa có đường nào đóng dòng phụ trách mà không mở dòng mới (`src/modules/dispatch/service.ts:25-33`).
- **(a) Khuyến nghị:** ADR mới thay LC-8 bằng "…trừ khi người phụ trách Từ chối kèm lý do". Không cần bảng hay cột mới (nếu chủ chọn Q-O(b) thì trigger là migration chỉ-thêm).
- **(b)** Giữ LC-8. Từ chối chỉ là "xin trả"; HDV cũ vẫn phụ trách tới khi có người nhận. Có thể không cần bảng mới: thêm một mã vào bảng tra cứu `dsp_assignment_status` (`migrations/0014_dispatch.sql:18-25`, cột `status_code` ở `:40`). Nhưng ADR-0006 điều 2 (accepted) chỉ cho `PENDING`/`DONE` ⇒ cần migration chèn dòng tra cứu và một ADR sửa ADR-0006.

**Rủi ro — nói với chủ một lần (P18):**
1. **Đơn vô chủ sát giờ đi.** Chặn "từ ngày sau ngày đi" (mốc ADR-0027) **không** che ca HDV từ chối ngay trong ngày đi. Bảng tin không báo được khi app đóng (ADR-0022 dòng 7). Mốc ADR-0027 sinh cho ca khách không đến bến (`src/shared/trip-rules.ts:33-35`), không cho ca HDV bỏ việc. → Q-E.
2. **Gom SĐT.** Câu (2) cộng câu (3) cho phép một HDV nhận lần lượt nhiều đơn, đọc SĐT, rồi từ chối. SĐT đã lộ thì không thu lại được (một chiều). Giảm nhẹ: nhật ký nhận/từ chối đủ để truy; văn phòng xem được số lần từ chối của từng HDV; tuỳ chọn: trần số lần từ chối mỗi ngày. Hai ý sau cùng là **đề xuất, chưa thành hạng mục** — chủ muốn thì thêm vào lượt 2.

**B2.** Văn phòng có cần nút "gỡ người phụ trách" (đưa đơn về Chờ nhận thay cho HDV)? Khuyến nghị: **không** ở đợt này — văn phòng đổi thẳng sang người khác như hôm nay; nếu cần thì làm một ô quyền riêng, không gộp vào Từ chối.

## 1. Câu hỏi mở — trả lời một lần

Trả lời "theo khuyến nghị" = đồng ý mọi khuyến nghị; chỉ cần ghi câu nào chọn khác. **Trả lời như vậy CHƯA phải là duyệt ADR:** Q-B (LC-8), Q-C (ADR-0020 điều 1), Q-K (ADR-0022 điều 3), mục "Giao có hiệu lực ngay" dưới bảng (ADR-0018 điều 7) và Q-A nếu chọn Cách 2 đều đổi quyết định đã duyệt, nên vẫn phải qua ADR do chủ duyệt theo lượt (§13).

| Mã | Câu hỏi | Khuyến nghị |
|---|---|---|
| Q-A (+A2) | Nghĩa của "Đã gửi/Đã xác nhận" (§0) | Cách 1; "Nháp" → "Chờ xác nhận" |
| Q-B (+B2) | Từ chối: đơn về Tự do (a) hay HDV cũ giữ tới khi có người nhận (b)? Có "gỡ người phụ trách" không? | (a); không |
| Q-C | Chọn HDV ngay lúc lập cần **giữ** đường tiêm câu lệnh vào lô tạo đơn và đổi dạng nó (nhận người được chọn, không mặc định người lập). ADR-0020 điều 1 lại đòi **gỡ hẳn** đường này (ADR-0020 dòng 30, 45, 62). Đây là hợp đồng `orders`↔`dispatch` (ADR-0007 điều 4(b)) | **Giữ và đổi dạng:** một lô = đơn + người phụ trách + nhật ký. Cách khác: form gọi hai lần — không đổi hợp đồng, nhưng có thể còn đơn đã lưu mà chưa giao được |
| Q-D | Ai từ chối được, với đơn nào? Chốt khi Nhận áp cho ai? | Mọi người **đang phụ trách**, chỉ tự trả đơn của chính mình; đơn chưa chốt lẫn đã chốt. Không ai **Nhận** (= tự đặt mình khi đơn chưa có ai, đúng nghĩa `thayDoiCuaHandler`, `src/shared/bang-tin.ts:59-66`) hay từ chối đơn đã huỷ / đã qua ngày đi — áp cho **mọi người**; văn phòng theo dõi đơn huỷ thì **Giao** cho người khác (vẫn được, như `src/modules/dispatch/index.ts:107`) |
| Q-E | Hạn chót để tự từ chối; áp cho ai? | **Chặt:** ngày đi là hôm nay hoặc ngày mai thì phải gọi văn phòng đổi người; từ ngày sau ngày đi thì chặn hẳn. Áp cho **mọi người** tự trả đơn (văn phòng vẫn đổi người bằng Giao). **Nói một lần (P18):** trong ngày đi HDV vẫn **huỷ cả đơn** được (`src/modules/dispatch/index.ts:156`, ADR-0027) — bị cấm trả đơn, HDV có thể chọn huỷ đơn; hai lý do huỷ là danh sách đóng nhưng không kiểm được là thật |
| Q-F | Thông báo khi HDV từ chối | (a) hiện nổi cho **mọi** người nhận tin (trong khuôn ADR-0022). Nhắm riêng người nhận tin = ADR mới sửa ADR-0022 điều 3 |
| Q-G | HDV huỷ (Aborted) cả đơn chưa chốt mình đang phụ trách? | Có, cùng hai lý do. Phải đổi hàm công bố `cancelOrderByHandler`, đang gắn cứng `"confirmed"` (`src/modules/orders/index.ts:88-90`) — hợp đồng giữa hai module |
| Q-H | Danh sách lý do chọn nhanh | Danh sách đóng; "Khác" **không kèm ô chữ**, để không có chữ tự do vào nhật ký chỉ-thêm. **Từ chối:** "Bận lịch khác", "Ốm / việc riêng", "Không phù hợp tuyến/dịch vụ", "Khác". **Văn phòng huỷ:** "Khách đổi ý", "Khách đặt trùng", "Sai thông tin — lập lại đơn", "Khác". **HDV huỷ:** giữ đúng hai lý do (ADR-0014 điều 11) |
| Q-I | Cách đặt quyền xem phần hẹp của đơn chờ nhận | Thao tác mới `order.pool.view` (§6) |
| Q-K | Đưa HDV vào nhóm nhận tin `cho-nhan` = sửa ADR-0022 điều 3; NT-3 sẽ đỏ | Chấp nhận; ADR ghi "nguyên văn → mới"; NT-3 thay bằng luật mới (§8) |
| Q-L | Câu riêng "Bạn vừa được giao đơn …" | Có — màn hình tự tra "Đơn của tôi", không thêm trường vào sự kiện |
| Q-M | Tài khoản lai Đối tác + HDV | Chặn ở bốn cửa: danh sách chờ nhận, Nhận, `checkAssignee`, và **Bảng tin** (không gắn `cho-nhan` — hôm nay `src/shared/bang-tin.ts:33` gắn vì tài khoản có `dispatch.claim`; không thông báo nổi — phương án (1) của N6). Theo "có quyền Đối tác là áp" (bản 1.15) và LC-2 |
| Q-N | Nơi đón là chữ tự do (`migrations/0008_order_service.sql:20`), có thể chứa SĐT, mà mọi HDV đều thấy | Trong phần hẹp, che mọi dãy từ 8 chữ số trở lên (sau khi bỏ dấu cách/chấm/gạch); hoặc chủ chấp nhận rủi ro |
| Q-O | Luật mới chỉ ở mã hay thêm lớp cơ sở dữ liệu (Hiến chương 5.1)? | **(a) khuyến nghị: cả ba luật mới ở mã** (chặn Nhận/Từ chối đơn đã huỷ, hạn Q-E, LC-8 mới) + ADR ghi "lệch có chủ ý: 5.1" như ADR-0029. Lý do: ở tầng dữ liệu, Nhận và Giao-cho-chính-mình chạy **cùng một câu** chèn (`src/modules/dispatch/service.ts:32`); Từ chối và Giao-đổi-người đều **đóng** một dòng (câu đóng chạy trước câu mở, trigger không thấy câu sau). Trigger không biết ai gọi ⇒ hoặc chặn cả Giao trên đơn huỷ (trái Q-D), hoặc không chặn được Nhận. Gỡ lệch khi có khoá "Đã giao" của ADR-0025 (áp cho mọi đường). (b) Nếu chủ chấp nhận **không ai** (kể cả văn phòng) nhận/giao/đổi người trên đơn đã huỷ: trigger `BEFORE INSERT/UPDATE` dòng `HANDLE` của đơn `cancelled`, đọc view công bố trạng thái đơn — `v_ord_order_state` của ADR-0024 (**còn proposed**) hoặc một view nhỏ mới của `orders`; migration chỉ-thêm |

**Đã chốt — áp dụng, không hỏi lại:**
- **Giao/chọn HDV có hiệu lực ngay**, HDV từ chối được sau — câu (A), (3); ADR-0020 điều 3. ADR mới ghi là thay câu "chọn người khác = đề nghị" của ADR-0018 điều 7. Đối tác vẫn chỉ đề xuất (ADR-0018 điều 9, giai đoạn 5).
- **HDV sửa đơn, nhãn "Đã sửa":** theo ADR-0023 điều 3–8 (chủ đã quyết hướng 25/9; ADR-0023 **chưa duyệt**).
- **Kế toán thấy mọi đơn** (ADR-0023 dòng 12 — chủ trả lời 25/9; ADR chưa duyệt).
- **"Điều hành" = vai "Điều hành chung", mức Quản trị** (`src/shared/roles.ts:28`; ADR-0018 điều 4).

## 2. Mục tiêu và phạm vi

- **Mục tiêu:** đơn do bất kỳ ai lập vào hàng **chờ nhận**; HDV thấy đủ để quyết định, rồi Nhận / Từ chối / Huỷ, luôn có lý do; người lập chọn được HDV; Quản trị/Điều hành giao việc; màn HDV gồm đơn chờ nhận và đơn mình chưa hoàn thành; Bảng tin báo ngay.
- **Ngoài phạm vi (chỉ tham chiếu):** "Đã giao", "Hoàn thành", sổ tiền, biên nhận: ADR-0024/0025/0026; việc HDV sửa đơn: ADR-0023 điều 3–8; **HDV tự "Xác nhận đơn"**: chủ đã quyết hướng 25/9 (Hoàn tất Q1) nhưng chưa có ô `order.confirm` (ADR-0018 điều 6) — chờ ADR-0025/ô đó; hạn nhận 15 phút, đề nghị nhận, "Gửi đơn hàng": giai đoạn 5; Web Push.
- **Tiền đề:** ADR-0019.

## 3. Quyết định của chủ (nguyên văn, phiên chat 2026-09-26) — chỉ ghi phần MỚI

> (A) "Đơn được tạo bởi bất kỳ ai, HDV luôn xem được nhưng không xem SĐT hay số tiền, chỉ xem tên dịch vụ, số lượng… Sau khi HDV chủ động nhận đơn thì đơn đó chính thức được gán (mang theo tham số assigned). Bất kỳ đơn tự do (chưa có HDV) đều có thể cho phép người tạo chọn HDV; quản trị viên có thể giao việc (về bản chất giống nhau, chỉ khác hình thức thể hiện). HDV có quyền từ chối (đơn chuyển sang trạng thái pending-assignment). Đơn có ít nhất các trạng thái: Nháp (Draft – hệ thống chưa ghi nhận), Đã gửi (Submitted), Tự do (pending-assignment: hệ thống đã xác nhận chưa có HDV nhận), Đã có HDV xác nhận (Assigned), Hoàn thành (Finished), Được sửa (edited by Guide – HDV sửa), Aborted – đã huỷ bởi HDV, Đã huỷ (Cancelled) – huỷ bởi người đặt. Đơn hàng nên được hiển thị luôn trong bảng tin của HDV."
> (1) "HDV chỉ thấy đơn đang rảnh hoặc đơn của mình thôi. Quản trị viên, Điều hành, Bán hàng, Giám đốc sẽ thấy hết danh sách." (2) "Sau khi nhận, HDV thấy toàn bộ thông tin của đơn." (3) "Từ chối (Refused) nghĩa là HDV có quyền huỷ đơn được gán cho mình hoặc được sếp giao cho mình khi bận hoặc không sẵn sàng. Aborted – huỷ bởi HDV nghĩa là khi nhận đơn rồi, thì có số điện thoại của khách, nhưng gọi khách không được hoặc khách yêu cầu huỷ. Bất cứ hành động từ chối hoặc huỷ nào cũng cần có lý do (cho phép chọn nhanh để tiết kiệm thời gian)." (4) "Ok tách 2 lớp như đề xuất." (5) "Đã gửi (Submitted): nghĩa là việc tạo đơn thành công bởi ai đó, nhưng chưa có ai nhận đơn cả. Đã xác nhận nghĩa là đã có 1 HDV nào đó nhận phụ trách đơn đó." (6) "Đúng là danh sách đơn chờ nhận, và gồm luôn cả đơn đã nhận nhưng chưa hoàn thành (chưa finished)."

**Đã có sẵn, không phải mới** (chủ đã quyết hướng; ADR-0020/0023/0025 còn **proposed**, chưa duyệt): đơn mới không có người phụ trách (ADR-0020); HDV thấy đơn rảnh + đơn mình, văn phòng thấy hết (ADR-0023 điều 1–2); HDV nhận, Quản trị giao (ADR-0020 điều 2–3); HDV sửa đơn, nhãn "Đã sửa" (ADR-0023); tách hai lớp (đặc tả mô hình vai §8); Hoàn thành (ADR-0025). Hai lý do "Aborted" của chủ trùng **nghĩa** với hai lý do đã có: "Không liên hệ được với khách", "Khách yêu cầu huỷ" (`src/modules/dispatch/rules.ts:74-79`; ADR-0014 điều 11).

| Điểm MỚI | Khác gì hôm nay |
|---|---|
| **Từ chối → đơn về Tự do** | chưa có đường nào; vướng LC-8 (Q-B) |
| **Chọn HDV ngay trong form lập** | hôm nay chỉ giao được sau khi đã lưu; vướng ADR-0020 điều 1 (Q-C) |
| **Mọi lần huỷ có lý do** | đặc tả mô hình vai §8 đã ghi "Huỷ: … kèm lý do" (đã duyệt, chưa làm); `POST /api/orders/:id/status` hôm nay không nhận lý do (`src/modules/orders/index.ts:311-345`) |
| **HDV huỷ cả đơn chưa chốt** | hôm nay trả 409 (`src/modules/dispatch/index.ts:155`) (Q-G) |
| **Màn HDV = chờ nhận + đơn mình chưa hoàn thành** | "Việc của tôi" chỉ có đơn đã chốt (`src/modules/orders/index.ts:139`) |

## 4. Hai lớp và tám trạng thái của chủ (Cách 1)

| Chủ gọi | Lớp | Dữ liệu thật | Nhãn | Đổi bằng / ai |
|---|---|---|---|---|
| Nháp | — | chưa lưu gì | (form chưa Lưu) | — |
| Đã gửi | phân công | không có dòng `HANDLE` đang mở | "Chờ nhận" | lập đơn không chọn HDV |
| Tự do | phân công | như trên, kể cả sau Từ chối | "Chờ nhận" (+ "được trả lại") | **Từ chối** (người đang phụ trách) |
| Đã có HDV xác nhận | phân công | đúng một dòng đang mở (`migrations/0014_dispatch.sql:58`) | "HDV: <tên>" | Nhận (`dispatch.claim`); Giao hoặc chọn lúc lập (`dispatch.assign`) |
| — (chốt với khách) | đơn | `draft` → `confirmed` | "Chờ xác nhận" → "Đã xác nhận" | `order.modify` (`POST …/status`) — FIELD `none`: **HDV giữ đơn chưa chốt mà không tự chốt được**, người lập/Quản trị phải chốt, cho tới khi có ô `order.confirm` (ngoài phạm vi, §2) |
| Hoàn thành | đơn | mốc của ADR-0025 (chưa có) | theo ADR-0025 | ADR-0025 |
| Được sửa | nhãn | có dòng điều chỉnh | "Đã sửa" | ADR-0023 |
| Aborted | đơn + nhãn | `cancelled` + nhật ký `order_cancelled_by_field` | "Đã huỷ · HDV huỷ: <lý do>" | `order.cancel` (`POST …/handler-cancel`) |
| Đã huỷ | đơn | `cancelled` + nhật ký `cancelled` có lý do | "Đã huỷ · <lý do>" | `order.modify` (`POST …/status`) |

- Hai lớp độc lập nhau; không thêm cột trạng thái phân công (ADR-0020 điều 9).
- "Huỷ bởi người đặt" hiểu là người lập hoặc văn phòng bấm huỷ (G1).

## 5. Luồng và ca biên

1. **Lập đơn.** Ai có `dispatch.assign` trên đơn của mình (Bán hàng, Quản trị, Toàn quyền) chọn được một HDV. Có chọn → cùng một lô (Q-C): kiểm `checkAssignee` (`src/modules/dispatch/rules.ts:50-58`), mở dòng `HANDLE`, ghi nhật ký `order_handler_changed`. Thực tập và Đối tác không chọn được (G4). Không chọn → Chờ nhận.
2. **Chờ nhận.** Đơn hiện ở danh sách chờ nhận của mọi HDV. Ô "Chưa phụ trách" của văn phòng đếm cả đơn chưa chốt (ADR-0020 M1 = A); hôm nay ô này chỉ đếm đơn đã chốt (`src/modules/orders/repository.ts:478`).
3. **Nhận** = người gọi tự đặt mình khi đơn chưa có ai (`PUT /api/orders/:id/handler`; cùng nghĩa `thayDoiCuaHandler`, `src/shared/bang-tin.ts:59-66`). Chỉ chèn khi chưa có ai (`src/modules/dispatch/repository.ts:34-39`), có chỉ mục duy nhất. Người đến sau nhận 409 `stale` (`src/modules/dispatch/rules.ts:103-112`). **Chốt mới — đổi hành vi có chủ ý, phải ghi vào ADR:** hôm nay route cố ý không xét trạng thái đơn (`src/modules/dispatch/index.ts:107-108`). Từ nay từ chối Nhận nếu đơn đã huỷ, đã qua ngày đi, hoặc (sau này) "Đã giao". Áp cho mọi người (Q-D); chốt nằm ở **mã** vì chỉ mã biết ai gọi (Q-O). Giao cho người khác trên đơn huỷ vẫn được. Vì sao cần chốt: không có nó thì đơn huỷ trước khi có người nhận vô chủ mãi, và HDV biết mã đơn (qua danh sách hay tin `huy`) nhận được rồi đọc SĐT, tiền. Chặn tài khoản lai (Q-M). Route đang ở cổng `office` (`src/modules/dispatch/index.ts:100`); HDV chỉ tới được sau ADR-0019 điều 1.
4. **Giao.** Quản trị/Điều hành/Toàn quyền giao mọi đơn. Người lập và người đang phụ trách cấp đầy đủ giao đơn của mình. Hiệu lực ngay.
5. **Từ chối (mới) — việc tự làm.** Chỉ người đang phụ trách trả đơn của chính mình, **kể cả Toàn quyền**: ô Toàn quyền vẫn `any` (ADR-0014 điều 2), nhưng thao tác chỉ định nghĩa trên dòng của người gọi. Đây là **ngoại lệ có chủ ý** (quyết định mới) so với `src/modules/dispatch/index.ts:180-181`, nơi Toàn quyền được qua **không cần** đang phụ trách. Phải chọn lý do (Q-H). Một lô: đóng dòng `HANDLE` mang `party_id` của người gọi (khuôn `src/modules/dispatch/repository.ts:46-51`, không mở dòng mới) + nhật ký `order_handler_refused` `WHERE changes() > 0`. Route tự truyền trạng thái phụ trách trước thay đổi cho Bảng tin (như `src/modules/dispatch/index.ts:139`).
6. **Huỷ.** **Aborted:** `POST …/handler-cancel`, hai lý do đóng; chặn khi đã qua ngày đi (`src/modules/dispatch/index.ts:156`, ADR-0027). Mở cho đơn chưa chốt: Q-G. **Cancelled:** `POST …/status` với `cancelled` + **lý do bắt buộc**, ghi vào chi tiết nhật ký `cancelled`.
7. **Sửa:** theo ADR-0023. **Hoàn thành:** theo ADR-0025.

| Ca biên | Xử lý |
|---|---|
| Nhận đơn đã huỷ / đã qua ngày đi | **409** "Đơn đã huỷ" / "Tour đã qua ngày đi" (chốt ở bước 3) |
| Từ chối đơn sếp giao | như bước 5. Người giao luôn là văn phòng (có `order.view = any`), đã nhận tin qua `tat-ca` |
| Từ chối khi ngày đi là hôm nay/ngày mai hoặc đã qua | theo Q-E: 409 "Gọi văn phòng để đổi người" |
| Từ chối đơn đã huỷ | 409 |
| Từ chối/huỷ sau "Đã giao" | trigger của ADR-0025 chặn (**chưa có** — ADR-0025 còn nháp) |
| Nhận đúng lúc người phụ trách từ chối | lệnh tới trước thắng; câu chốt theo `party_id` |
| Từ chối rồi bị giao lại chính đơn đó | cho phép. Bảng chọn người hiện "đã từ chối lúc … — <lý do>", đọc qua hàm công bố của module `audit` (`dispatch` không đọc thẳng `audit_log`, `src/modules/dispatch/repository.ts:2-3`) |
| Người phụ trách là hồ sơ không có tài khoản | không ai tự từ chối được; văn phòng đổi người |

## 6. Ai thấy gì

| Mức quyền (vai) | Đơn chờ nhận | Đơn mình phụ trách | Đơn người khác phụ trách |
|---|---|---|---|
| Hướng dẫn viên `FIELD` | **chỉ phần hẹp**: mã, ngày đi, tên dịch vụ, số khách, nơi đón (che số — Q-N), giờ đón (ADR-0023 điều 1). Không tên/SĐT khách, tiền, ghi chú, lịch sử | **đủ**, kể cả SĐT, tiền, lịch sử — câu (2) | **404** |
| Bán hàng, Quản trị (Điều hành chung), Toàn quyền (Giám đốc), Kế toán | đủ (không đổi) | đủ | đủ |
| Thực tập, Đối tác | chỉ đơn mình lập (không đổi) | — | không |

- **Lọc ở máy chủ** cho danh sách, chi tiết, "Đơn của tôi" và Bảng tin. Chi tiết đơn không được xem hôm nay trả 403 (`src/modules/orders/index.ts:230`); với HDV đổi thành 404. Trang chủ văn phòng đòi ô không ngữ cảnh (ADR-0019 điều 2), nên HDV vào thẳng màn của mình.
- **Bẫy ở mã hôm nay:** `GET /api/orders` lọc "người lập = tôi" khi `can(staff, "order.view")` không ngữ cảnh trả sai (`src/modules/orders/index.ts:185`; chú thích `:183-184` dựa vào việc router còn chặn FIELD). Đặt FIELD = `assigned` mà không sửa → danh sách của HDV **rỗng**. Cần nhánh thứ ba lọc theo người phụ trách qua `v_dsp_order_handler`, như `src/modules/orders/repository.ts:478`.
- **Phần hẹp** dựng từ **danh sách trường được phép**, ở máy chủ (như biên nhận — Hiến chương 4.4). Chú thích ô `contact.view` (`src/shared/permissions.ts:51`) gộp "điểm đón, giờ" vào liên hệ, nên phần hẹp là ngoại lệ có tên, phải ghi vào ADR.
- **Cách (i) — khuyến nghị cho Q-I:** thao tác mới `order.pool.view`: FIELD `any`, Toàn quyền `any`, còn lại `none`; `order.view`, `money.view`, `contact.view`, `order.history.view` của FIELD đều là `assigned`.
- **Lưu ý về bài khoá của ADR-0019 điều 2** ("hai dòng `order.view`/`money.view` giống hệt"): bài này **chưa tồn tại** — ADR-0019 chưa thi công; hôm nay `src/shared/permissions.test.ts:10-11` chỉ chụp giá trị ô; `order.pool.view` chính là kiểu "thấy đơn mà không thấy tiền" mà bài đó dựng để bắt (ADR-0019 dòng 55); vì vậy, việc không lộ SĐT/tiền được bảo đảm bằng danh sách trường được phép **cộng một bài kiểm riêng**, và cần một dòng ở `docs/SO-HANG-RAO.md`.
- **Cách (ii):** thêm phạm vi thứ sáu cho `Scope`. Đổi hợp đồng `can()`; `money.view` khác `order.view`.

## 7. Dữ liệu

- **Không bảng, không cột mới** (theo Q-B(a)). Từ chối = đóng dòng `HANDLE` (`valid_to_at`, `updated_by`). Lý do nằm ở nhật ký, hành động mới `order_handler_refused`. Thêm hành động không cần migration (`src/shared/audit-actions.ts:1-3`). Lý do huỷ của văn phòng ghi vào chi tiết nhật ký `cancelled`. Theo Q-O(a): không migration. Q-O(b): migration chỉ-thêm (trigger, có thể một view; khi đó cập nhật `docs/data-dictionary.json`).
- **Căng với Hiến chương 4.1:** nhãn "Aborted", "được trả lại", "đã từ chối lúc…" dựng từ nhật ký, không từ trạng thái trong bảng. Tiền lệ: ADR-0014 điều 11 cũng chỉ giữ lý do huỷ trong nhật ký. Nhãn ở danh sách đơn văn phòng: đọc thêm nhật ký, hoặc thêm cột — kế hoạch đo rồi chọn.
- **Nhật ký chỉ-thêm** (trigger cấm sửa/xoá, `migrations/0017_order_status_audit_guards.sql:17-21`): ghi nhầm SĐT thì không gỡ được. Vì vậy Q-H không cho chữ tự do. Nếu chủ muốn có chữ: bỏ dấu cách, chấm, gạch, `+84` trước khi lọc SĐT (≥ 8 chữ số), email, MST. Rào này cần một dòng ở `docs/SO-HANG-RAO.md`.

## 8. Bảng tin (ADR-0022, bản 1.16)

- **Sự kiện.** Thêm loại `tu_choi`. HDV huỷ dùng lại `huy`. Lập đơn kèm HDV vẫn phát `tao` (không đổi thành `giao`), tránh câu "vừa đổi người phụ trách" cho đơn vừa tạo. App cũ còn trong bộ nhớ đệm bỏ qua loại lạ (`laSuKienHopLe`, `src/shared/bang-tin.ts:113-125`), nên không tự làm mới với `tu_choi` cho tới khi được cập nhật. Ghi vào nhật ký thay đổi; khi nối lại, app vẫn tải lại dữ liệu.
- **N-1 — không làm lộ tin.** Hôm nay chỉ `PUT /api/orders/:id/handler` truyền trạng thái phụ trách trước thay đổi (`src/modules/dispatch/index.ts:139`); các route khác rơi vào mặc định "trước chưa ai" (`src/index.ts:47`). Sửa: (1) Đổi mặc định thành "**không biết**". (2) `nhanSuKien` gắn `cho-nhan` khi: (a) **sau** thay đổi không còn ai — như hôm nay; hoặc (b) route truyền trạng thái trước **thật** và trước đó chưa có ai (để mọi HDV gỡ đơn vừa có người nhận khỏi danh sách). "Không biết" không bao giờ sinh `cho-nhan`. (3) Route Từ chối truyền trạng thái trước thật. **Không dùng** quy tắc "trước **hoặc** sau chưa có người" với mặc định cũ: người kiểm đã chứng minh bằng đột biến rằng khi đó tin "xác nhận" về đơn HDV B lọt tới HDV A.
- **Sửa ADR-0022 điều 3 (Q-K).** Điều 3 ghi: "nhóm nhận suy từ `order.view`: `any` → `tat-ca`; còn lại → `nguoi:<id>`". Hôm nay `cho-nhan` nằm gọn trong `tat-ca`, và NT-3 canh đúng điều đó. Đưa HDV vào `cho-nhan` là thêm người nhận ngoài điều 3 ⇒ ADR mang D2 phải có dòng "nguyên văn → mới".
- **Thông báo nổi.** `tu_choi`: "Đơn TD-… vừa được trả lại, đang chờ người nhận". Hiện cho mọi người nhận tin, vì trình duyệt chỉ quyết theo loại sự kiện và quyền của người xem (`bang-tin.ts:100-108`). **Một cách giải thích:** chọn *câu chữ* riêng cho một người thì màn hình tự tra API (Q-L), không cần ADR. Chọn *ai được gửi tin* thì phải sửa ADR-0022 điều 3 (Q-F).
- **Bài kiểm sẽ đỏ có chủ ý** (tín hiệu hỏi chủ, không sửa cho xanh):

| Tệp | Bài kiểm |
|---|---|
| `src/shared/bang-tin.test.ts` | `THAY_DOI` 9 giá trị (:18-20), ảnh chụp `nhanKetNoi` (:42-53), NT-3 (:55-65), `nhanSuKien`/NT-2 (:67), `thongBaoNoi` của HDV (:169) |
| `src/shared/permissions.test.ts` | ảnh chụp ô (:10-11 và các dòng FIELD khác) |
| `tests/e2e/dispatch.mjs` | các bước dựa vào ADR-0020 |
| `src/bang-tin-guard.test.ts` | "thấy 8 route" → 9 |

Người kiểm quan sát: đổi `dispatch.claim` của FIELD → 3 bài đỏ; thêm sửa `bang-tin.ts:51` → 4. Tôi **chưa chạy lại**.
- **Giới hạn đã ghi** (R24, R16, N6, N7): xem `docs/superpowers/plans/2026-09-25-bang-tin-de-xuat-luat.md`. Đặc tả này giải N7, và N6 qua cửa Bảng tin của Q-M.

## 9. Màn hình hướng dẫn viên (hành vi)

- **Một màn, hai phần**, thay khối "Việc của tôi" (`web/account.ts:339`): **"Đơn chờ nhận":** phần hẹp, nút **Nhận**. **"Đơn của tôi":** đơn chưa huỷ, chưa Hoàn thành, cả chưa chốt lẫn đã chốt; nút **Từ chối**, **Huỷ đơn** (ẩn khi không còn được làm), sửa số khách.
- Nếu dùng lại `GET /api/dispatch/mine` (cổng `staff`, có trả `customerPhone`) thì ADR-0019 điều 2 đòi `contact.view` ở route đó.
- **Lý do:** mỗi lý do một nút; chỉ lưu khi đã chọn; Huỷ có hộp hỏi lại "không thể hoàn tác". **Làm mới** theo Bảng tin; thua đua → "Đơn vừa có người khác nhận", rồi tải lại.
- **Bố cục, chữ, cách xếp đơn đã qua ngày đi:** chờ bản thiết kế của chủ (bài học Đợt D).

## 10. Giả định (bề mặt, đảo được — giả định cấu trúc đã đưa lên §1)

**G1:** "huỷ bởi người đặt" = người lập hoặc văn phòng bấm huỷ. **G2:** ở lượt đầu, nhãn "Aborted"/"được trả lại" chỉ hiện ở chi tiết đơn và màn HDV. **G3:** câu chữ thông báo ở §8. **G4 (cấu trúc, theo ô đã có):** câu (A) "người tạo chọn HDV" được thu hẹp: Thực tập không chọn được vì `dispatch.assign` của INTERN là `none` (`src/shared/permissions.ts:58`); Đối tác chỉ đề xuất (ADR-0018 điều 9). Mở cho Thực tập = đổi một ô, cần chủ quyết.

## 11. Phụ thuộc và thứ tự

1. **ADR-0019 thi công và lên production.** Đã duyệt 25/9 nhưng chưa thi công: cổng vẫn suy từ một ô (`src/shared/permissions.ts:115`, `src/shared/router.ts:174-175`); ô `dispatch.request` còn đó (`permissions.ts:61`). ADR-0019 điều 3 chỉ cho FIELD vào cổng `orders` "khi ADR-0017 được thi công" → bản sửa ADR-0023 phải thay điều kiện này. **Không thi công riêng ADR-0017** (accepted, một chiều: FIELD xem mọi đơn kể cả tiền) trước ADR-0023.
2. **Chủ trả lời §1** (làm được ngay).
3. **AI soạn ADR:** **ADR-0030** — số kế tiếp, đã kiểm không nhánh nào có ADR-003x. Nội dung: Từ chối + thay LC-8; ô `dispatch.refuse`; lý do huỷ bắt buộc; HDV huỷ đơn chưa chốt (đổi `cancelOrderByHandler`); "lệch có chủ ý: 5.1" theo Q-O. **Cửa hỗn hợp:** hai chiều cho mã và ô quyền; **một chiều** cho SĐT đã lộ qua nhận-rồi-từ-chối và cho nhật ký chỉ-thêm. **Sửa bản nháp ADR-0020:** bỏ "LC-8 không đổi" và "gỡ hẳn đường tiêm" (Q-C); thêm chốt Nhận (N-2) và chặn tài khoản lai; thêm dòng "nguyên văn → mới" cho ADR-0022 điều 3 / NT-3 và cho ADR-0018 điều 7. **Sửa bản nháp ADR-0023:** cách đặt quyền theo Q-I; `order.history.view` của FIELD; điều kiện cổng thay ADR-0019 điều 3; tách phần "xem" (lượt 1) khỏi "sửa" (lượt 2). Không sửa ADR đã accepted.
4. **Duyệt hai lượt (§13)**, rồi thi công theo lượt: đỏ → xanh, e2e, Chrome, người kiểm độc lập.

## 12. Tiêu chí nghiệm thu (hành vi kiểm được)

1. **Tách ba đường (e2e).** (a) HDV A gọi `GET /api/orders` → chỉ đơn A đang phụ trách. (b) Danh sách chờ nhận → chỉ đơn chưa ai nhận, dạng phần hẹp. (c) Chi tiết đầy đủ của đơn B đang phụ trách và của một đơn chờ nhận → **404** cả hai.
2. **Phần hẹp** không có tên/SĐT/email khách, tiền, ghi chú, lịch sử; dãy số trong nơi đón bị che. Test thuần: đơn đủ mọi trường → không trường nào ngoài danh sách được phép lọt ra.
3. **Bảng tin (e2e `tests/e2e/bangtin.mjs`).** HDV A **không nhận khung tin nào** về đơn HDV B đang phụ trách — khi văn phòng xác nhận, sửa, sửa chuyến, đổi tiền, huỷ đơn đó. **Ngoại lệ duy nhất:** đúng một tin lúc đơn rời hàng chờ (C vừa nhận hoặc vừa được giao) → đơn biến khỏi danh sách chờ nhận của A. Kết nối của tài khoản lai Đối tác + HDV không có nhãn `cho-nhan` và không hiện thông báo nổi về đơn chờ nhận.
4. **Nhận.** Đơn **đã huỷ** → 409; đơn đã qua ngày đi → 409; tài khoản lai → 403. Hai HDV cùng Nhận → đúng một 200 + một 409, và đúng một dòng `HANDLE` đang mở.
5. **Từ chối.** Không lý do → 400. Có lý do → đơn hết dòng đang mở và có đúng một dòng `order_handler_refused`. Toàn quyền không đang phụ trách gọi Từ chối → 403. Trong khoảng Q-E cấm, hoặc đơn đã huỷ → 409.
6. **Chrome, hai tài khoản:** A từ chối → trong ≤ 5 giây đơn hiện ở danh sách chờ nhận của HDV B.
7. **Huỷ.** Văn phòng huỷ không lý do → 400. HDV huỷ đơn chưa chốt (nếu Q-G = có) chỉ với hai lý do; lý do khác → 400.
8. **Lập đơn kèm HDV:** một lô ghi đơn + dòng `HANDLE` + nhật ký. HDV không đủ điều kiện → 400, không có đơn nào được tạo.
9. **Không đổi:** Thực tập, Đối tác, Kế toán — e2e quyền hiện có vẫn xanh.
10. **Hàng rào.** Các bài đỏ có chủ ý ở §8 chỉ đổi sau khi chủ quyết. Hàng rào 1 và 2 xanh. Mỗi rào mới có dòng ở `docs/SO-HANG-RAO.md`, kèm ngày thấy chặn thật.
11. **Kiểm bất biến LC-8 mới.** Sẽ đỏ với `dropHandler` của e2e (ADR-0020 dòng 64), và có thể đỏ với dữ liệu cũ trên production. Chạy truy vấn chỉ-đọc trước (chủ tự chạy); đặt mức "cảnh báo" trước khi đặt "vi phạm".
12. **Lệnh kiểm:** `npm test` xanh, `npm run typecheck` 0 lỗi, `npm run test:e2e` xanh, `audit-invariants` đạt; người kiểm độc lập ĐẠT.

## 13. Trang ghép (CLAUDE.md §9)

**(1) Bảng**

| Bảng | Hôm nay | Sau |
|---|---|---|
| `dsp_assignment` | dòng `HANDLE`: hồ sơ nội bộ có tài khoản, hoặc hồ sơ không tài khoản; đổi người = đóng một + mở một | thêm cách đóng mà không mở dòng mới (Từ chối); trigger chỉ khi Q-O(b) |
| `orders` | đơn do nội bộ, Đối tác, Thực tập lập | không đổi cột |
| `audit_log` | nhật ký chỉ-thêm | thêm `order_handler_refused`; `cancelled` có lý do |
| `order_money_adjustment` | dòng điều chỉnh của HDV | theo ADR-0023 (D6) |

**(2) Ô quyền** (`src/shared/permissions.ts`, cột FIELD nếu không ghi khác)

| Ô | Hôm nay | Đề xuất |
|---|---|---|
| `order.view` / `money.view` | `none` (:48, :49) | `assigned` (ADR-0017 từng cho `any`; ADR-0023 thu hẹp) |
| `contact.view` | `assigned` (:51) | giữ; đòi ở cả "Đơn của tôi" |
| `order.history.view` | `none` (:50) | `assigned` — câu (2) |
| `order.pool.view` (mới) | — | FIELD `any`, Toàn quyền `any`, còn lại `none` |
| `dispatch.claim` | `none` (:59) | `any` + chốt Nhận (N-2) + chặn tài khoản lai |
| `dispatch.assign` | SALES `ownOrAssigned`, ADMIN `any` (:58) | giữ; dùng thêm lúc lập đơn |
| `dispatch.refuse` (mới) | — | SALES/ADMIN/FIELD `assigned`, Toàn quyền `any` (chỉ tự làm — §5 bước 5), còn lại `none` |
| `order.cancel` | `assigned` (:57) | giữ ô; mở cho đơn chưa chốt (Q-G) |
| `order.money.edit` | `assigned` (:56) | theo ADR-0023: thêm/bớt dịch vụ, cả đơn chưa chốt (D6, lượt 2) |
| `order.modify` | như hôm nay (:53) | giữ ô; huỷ phải có lý do |

**(3) Cổng canh cửa** (sau ADR-0019)

| Cửa | Cổng router | Chốt trong thân route | Lưới ở dữ liệu |
|---|---|---|---|
| Danh sách, chi tiết đơn | `orders` | `can(order.view/money.view/contact.view/order.history.view, {assigned})`; lọc theo người phụ trách | đơn khác → 404 |
| Danh sách chờ nhận | `orders` | `can(order.pool.view)` + chặn tài khoản lai | danh sách trường được phép; chỉ đơn không có dòng đang mở, chưa huỷ, chưa qua ngày đi |
| "Đơn của tôi" | `staff` (nếu dùng `/api/dispatch/mine`) | `can(contact.view, {assigned})` (ADR-0019 điều 2) | chỉ đơn của người gọi |
| Nhận / giao / chọn lúc lập | `orders` (chuyển từ `office`) | `mayChangeHandler`; **chốt trạng thái + ngày đi**; chặn tài khoản lai ở `checkAssignee` | `NOT EXISTS` + chỉ mục duy nhất; trigger chỉ khi Q-O(b) |
| Từ chối | `orders` | `can(dispatch.refuse, {assigned})` + đang phụ trách + trạng thái + hạn Q-E | câu chốt theo `party_id` của người gọi; trigger chỉ khi Q-O(b) |
| HDV huỷ | `staff` (`src/modules/dispatch/index.ts:149`) | `can(order.cancel, {assigned})` + `tripDeparted` | trigger 0017 |
| Bảng tin | `GET /api/bang-tin` | `nhanKetNoi` (không `cho-nhan` cho tài khoản lai); `nhanSuKien` với trạng thái trước "không biết" (N-1) | — |

**Đếm: 6 quyết định chạm quyền/dữ liệu** → chia 3 + 3.
- **Lượt 1** (chỉ sau khi ADR-0019 lên production; chạy được một mình vì chưa có Từ chối): D1: HDV xem gì. D2: HDV nhận + chốt Nhận + tài khoản lai + sửa ADR-0022 điều 3 / NT-3. D3: đơn mới không có người + chọn HDV lúc lập (hợp đồng `orders`↔`dispatch`).
- **Lượt 2:** D4: Từ chối + thay LC-8. D5: lý do huỷ bắt buộc + HDV huỷ đơn chưa chốt. D6: HDV sửa đơn (phần "sửa" của ADR-0023).

## Phụ lục A — Bằng chứng cho Q-A

| Sự thật | Nguồn |
|---|---|
| Xác nhận đòi đủ ngày đi + số khách, khoá dịch vụ/số khách/tiền; sửa đơn đã xác nhận trả 409 | `src/modules/orders/repository.ts:692`; `src/modules/orders/index.ts:241`; `web/order.ts:282`; ADR-0007 điều 2 |
| Biên nhận in "Chờ xác nhận" / "Đã xác nhận" | `src/shared/order-confirmation.ts:72` |
| Trạng thái chỉ đi tiến `draft → confirmed → cancelled`, có trigger | `src/modules/orders/rules.ts:154-163`; `migrations/0017_order_status_audit_guards.sql:8-12`; Hiến chương 5.1; `docs/ARCHITECTURE.md` Phần II "Luật dữ liệu" |
| "Đã gửi", "chờ nhận" là mốc của lời đề nghị, không phải trạng thái đơn | đặc tả mô hình vai (đã duyệt 24/9) §8, câu cuối |
| Chủ đã coi "Xác nhận (chốt với khách)" là bước riêng, HDV đang phụ trách bấm được | `docs/superpowers/specs/2026-09-25-hoan-tat-don-va-so-ke-toan.md` §10, Q1 |
| Luật giá Đối tác khi xác nhận xét **người thao tác** (`holdsPartner`), nên **không** chặn HDV | `src/modules/orders/index.ts:330-331`; ADR-0029 điều 2 |
