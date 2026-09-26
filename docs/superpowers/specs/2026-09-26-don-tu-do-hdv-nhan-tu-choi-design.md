# Đặc tả (bản nháp): Đơn tự do — hướng dẫn viên nhận, từ chối, huỷ

- **Ngày:** 2026-09-26. **Vai:** lập kế hoạch (không thi công, không sửa ADR hay tệp luật). **Trạng thái:** nháp — **chờ chủ trả lời Q-A…Q-M (§10) trong một lần**; chưa trình duyệt.
- **Việc lớn** (quyền, dữ liệu phân công, nhật ký) → thi công xong phải có người kiểm độc lập chỉ đọc (`CLAUDE.md` §3).
- **Xây trên lỗ đang hở: `money.view`, `contact.view`** (`docs/quyen-hoan.json`, hạn 2026-10-15: hai ô chưa được máy chủ hỏi). "HDV không thấy SĐT/tiền của đơn chờ nhận" dựa đúng vào hai ô này → **không duyệt trước khi ADR-0019 lên production** (dừng dây chuyền). Mục `phat_hien` của sổ đang rỗng (kiểm 2026-09-26): không có phát hiện HIGH nào còn mở ở vùng này.
- **Hiến chương áp** (Điều 6.1): 1.2 (lệnh → luật → một lô → trạng thái + dấu vết), 4.1, 5.1 (trạng thái đơn chỉ đi tiến), 5.5, 5.8 (bước của luồng xét theo vai trên đối tượng), 5.10, 5.12 (nhật ký không SĐT/email/MST), 5.13. Không lệch có chủ ý nào; riêng Q-B đổi một **luật cứng** của ADR-0018 → phải có ADR mới.

## 0. Hai chỗ vướng quyết định ĐÃ DUYỆT — chủ chốt trước

### Q-A. "Đã gửi" và "Đã xác nhận" nghĩa là gì

Chủ trả lời (4) giữ hai lớp, nhưng (5) định nghĩa "Đã gửi" = tạo xong, chưa ai nhận; "Đã xác nhận" = đã có một HDV nhận. Tức là định nghĩa trạng thái **đơn** bằng trạng thái **phân công**. Trong mã và tài liệu đã duyệt, "Đã xác nhận" là một bước khác hẳn:

| Sự thật hôm nay | Nguồn |
|---|---|
| "Xác nhận đơn" = chốt với khách: chỉ đi được khi đủ ngày đi và số khách; sau đó dịch vụ, số khách, tiền **bị khoá** (sửa đơn trả 409), chỉ còn sửa chuyến và ghi dòng điều chỉnh chỉ-thêm | `src/modules/orders/repository.ts:692` (`confirmOrder`), `src/modules/orders/index.ts:241`, `web/order.ts:282`; ADR-0007 điều 2 |
| Biên nhận gửi khách in "Chờ xác nhận" / "Đã xác nhận" | `src/shared/order-confirmation.ts:72` |
| Đối tác chỉ xác nhận được đơn đúng giá danh mục (chặn ngay ở bước xác nhận) | `src/modules/orders/index.ts:330-331` (DK-T3-01, ADR-0027) |
| Trạng thái đơn chỉ đi tiến `draft → confirmed → cancelled`; trigger chặn cả SQL chạy tay | `src/modules/orders/rules.ts:154-163`, `migrations/0017_order_status_audit_guards.sql:8-12`; Hiến chương 5.1 và `docs/ARCHITECTURE.md` Phần II "Luật dữ liệu" (đã duyệt) |
| Đặc tả mô hình vai (đã duyệt 24/9) §8: trạng thái đơn vẫn là `draft/confirmed/cancelled`; "Đã gửi", "chờ nhận", "đã tiếp nhận" là **mốc của lời đề nghị**, không phải trạng thái đơn | `docs/superpowers/specs/2026-09-24-mo-hinh-nguoi-vai-quyen-design.md` §8, câu cuối |
| Ngày 25/9 chủ đã trả lời: "Xác nhận (chốt với khách)" do người lập, Quản trị, **HDV đang phụ trách** bấm — một bước riêng, sau khi nhận | `docs/superpowers/specs/2026-09-25-hoan-tat-don-va-so-ke-toan.md` §10, Q1 |

- **Cách 1 (khuyến nghị): giữ nghĩa cũ, hiện lớp phân công thành nhãn riêng.** Lớp đơn giữ nguyên. Mỗi đơn có thêm một nhãn: "Chờ nhận" hoặc "HDV: <tên>". Điều chủ gọi "Đã gửi" hiện là "Chờ nhận"; điều chủ gọi "Đã xác nhận (có HDV nhận)" hiện là "HDV: <tên>". **Không** dùng chữ "xác nhận" cho việc nhận đơn, vì nó trùng nút "Xác nhận đơn" và chữ trên biên nhận gửi khách. Được: không đổi dữ liệu, không phá khoá tiền. Mất: chữ trên màn hình khác chữ chủ đang dùng.
- **Cách 2: đổi nghĩa theo đúng chữ.**
  - (2a) Bấm "Nhận" là xác nhận luôn. HDV không nhận được đơn còn thiếu ngày hoặc số khách. Tiền bị khoá ngay lúc nhận. Đơn Đối tác sai giá thì HDV cũng không nhận được. Và "Từ chối" phải đưa đơn từ `confirmed` quay lại — trái luật "chỉ đi tiến" đã duyệt, nên **không làm được** nếu không có ADR đổi luật lõi.
  - (2b) Chỉ đổi tên. Bước chốt với khách đổi tên (vd "Đã chốt với khách"), chữ "Đã xác nhận" chuyển sang nghĩa "có HDV nhận". Không phá bất biến nào. Nhưng phải đổi chữ ở mọi màn hình, trợ giúp, nhật ký thay đổi, kịch bản kiểm thử. Với biên nhận: khách hiểu "Đã xác nhận" là "đặt chỗ thành công", nên lại phải chọn thêm chữ cho giấy gửi khách.
- **Q-A2 (chỉ khi chọn Cách 1).** Đơn đã lưu mà chưa chốt với khách hôm nay hiện chữ "Nháp" (`web/format.ts:23`). Nhưng chủ nói Nháp là "hệ thống chưa ghi nhận". Khuyến nghị: đổi nhãn đó trên màn hình nội bộ thành **"Chờ xác nhận"** (đúng chữ biên nhận đang in). Chữ "Nháp" chỉ còn nghĩa "đang soạn, chưa bấm Lưu".

Phần còn lại của đặc tả viết theo **Cách 1**. Chọn 2b: đổi nhãn ở §3, §8 và biên nhận; luồng và dữ liệu không đổi. Chọn 2a: dừng, cần ADR sửa luật lõi.

### Q-B. "Từ chối" đưa đơn về Tự do — vướng luật cứng LC-8 đã duyệt

ADR-0018 điều 5 (accepted) và đặc tả mô hình vai §6, dòng LC-8: *"Sau lần tiếp nhận đầu, đơn luôn có người phụ trách: đổi người chỉ hoàn tất khi người mới bấm Nhận; tới lúc đó người cũ vẫn phụ trách."* ADR-0020 (proposed) ghi rõ **không đổi** LC-8. Chủ nay muốn: HDV từ chối thì đơn về "Tự do" (không ai phụ trách). Hôm nay mã chưa có đường nào đóng dòng phụ trách mà không mở dòng mới (`src/modules/dispatch/service.ts:25-33`; chỉ module `dispatch` ghi `dsp_assignment`), nên trên thực tế LC-8 đang đúng.

- **(a) Khuyến nghị:** ADR mới thay LC-8 thành "…luôn có người phụ trách, **trừ khi** người phụ trách **Từ chối** kèm lý do — đơn về Chờ nhận, mọi người nhận được đơn chung được báo ngay". Không cần migration. Mất: đơn có thể vô chủ trở lại. Giảm nhẹ: chặn từ chối sau ngày đi (Q-E), và thông báo nổi cho mọi người nhận tin — cả văn phòng lẫn HDV (Q-F).
- **(b)** Giữ LC-8. "Từ chối" chỉ là **xin trả**: đơn hiện trong danh sách chờ nhận, nhưng HDV cũ **vẫn phụ trách** (vẫn thấy SĐT và tiền) tới khi có người khác bấm Nhận. Không bao giờ vô chủ. Mất: cần chỗ lưu "đang xin trả" (bảng hoặc cột mới, tức migration); khác câu của chủ ("đơn chuyển sang pending-assignment").

## 1. Mục tiêu và phạm vi

**Mục tiêu.** Đơn do bất kỳ ai lập vào hàng **chờ nhận**. HDV thấy đủ để quyết định, rồi bấm Nhận, Từ chối hoặc Huỷ (luôn kèm lý do). Người lập chọn được HDV ngay lúc lập; Quản trị/Điều hành giao việc. Màn hình HDV gồm "Đơn chờ nhận" và đơn mình chưa hoàn thành. Bảng tin báo ngay khi có thay đổi.

- **Trong phạm vi:** lớp phân công (nhận, giao, chọn lúc lập, từ chối); lý do huỷ; quyền xem của HDV; danh sách của HDV; sự kiện Bảng tin.
- **Ngoài phạm vi (chỉ tham chiếu):**
  - "Đã giao", "Hoàn thành", sổ tiền, biên nhận: ADR-0024/0025/0026 và đặc tả Hoàn tất.
  - HDV sửa số khách/dịch vụ: ADR-0023 điều 3–8, giữ nguyên (Q-J).
  - Hạn nhận 15 phút, "đề nghị nhận", "Gửi đơn hàng" của Đối tác: giai đoạn 5 của mô hình vai.
  - Web Push.
- **Tiền đề:** tách cổng văn phòng (ADR-0019).

## 2. Quyết định của chủ và đối chiếu

Nguyên văn, phiên chat 2026-09-26:
> (A) "Đơn được tạo bởi bất kỳ ai, HDV luôn xem được nhưng không xem SĐT hay số tiền, chỉ xem tên dịch vụ, số lượng… Sau khi HDV chủ động nhận đơn thì đơn đó chính thức được gán (mang theo tham số assigned). Bất kỳ đơn tự do (chưa có HDV) đều có thể cho phép người tạo chọn HDV; quản trị viên có thể giao việc (về bản chất giống nhau, chỉ khác hình thức thể hiện). HDV có quyền từ chối (đơn chuyển sang trạng thái pending-assignment). Đơn có ít nhất các trạng thái: Nháp (Draft – hệ thống chưa ghi nhận), Đã gửi (Submitted), Tự do (pending-assignment: hệ thống đã xác nhận chưa có HDV nhận), Đã có HDV xác nhận (Assigned), Hoàn thành (Finished), Được sửa (edited by Guide – HDV sửa), Aborted – đã huỷ bởi HDV, Đã huỷ (Cancelled) – huỷ bởi người đặt. Đơn hàng nên được hiển thị luôn trong bảng tin của HDV."
> (1) "HDV chỉ thấy đơn đang rảnh hoặc đơn của mình thôi. Quản trị viên, Điều hành, Bán hàng, Giám đốc sẽ thấy hết danh sách." (2) "Sau khi nhận, HDV thấy toàn bộ thông tin của đơn." (3) "Từ chối (Refused) nghĩa là HDV có quyền huỷ đơn được gán cho mình hoặc được sếp giao cho mình khi bận hoặc không sẵn sàng. Aborted – huỷ bởi HDV nghĩa là khi nhận đơn rồi, thì có số điện thoại của khách, nhưng gọi khách không được hoặc khách yêu cầu huỷ. Bất cứ hành động từ chối hoặc huỷ nào cũng cần có lý do (cho phép chọn nhanh để tiết kiệm thời gian)." (4) "Ok tách 2 lớp như đề xuất." (5) "Đã gửi (Submitted): nghĩa là việc tạo đơn thành công bởi ai đó, nhưng chưa có ai nhận đơn cả. Đã xác nhận nghĩa là đã có 1 HDV nào đó nhận phụ trách đơn đó." (6) "Đúng là danh sách đơn chờ nhận, và gồm luôn cả đơn đã nhận nhưng chưa hoàn thành (chưa finished)."

| Điểm của chủ | Đã có ở đâu | Đặc tả này |
|---|---|---|
| Đơn mới không có người phụ trách tới khi nhận/giao | ADR-0020 điều 1 (proposed) | xác nhận — không hỏi lại |
| HDV thấy đơn rảnh (không SĐT/tiền) và đơn mình (đủ) — (A)(1)(2) | ADR-0023 điều 1 (proposed, chủ quyết 25/9) | xác nhận; cách đặt quyền: Q-I |
| Quản trị, Điều hành, Bán hàng, Giám đốc thấy hết — (1) | ADR-0023 điều 2; mã: `order.view = any` (`src/shared/permissions.ts:48`) | xác nhận; Kế toán không được nhắc → giả định G2 |
| HDV nhận là "chính thức được gán" | ADR-0020 điều 2; ô `dispatch.claim` (ADR-0009); đặc tả mô hình vai §5 (đích: FIELD nhận được) | xác nhận; ô FIELD `none → any` |
| Quản trị giao việc | ADR-0020 điều 3; ô `dispatch.assign` | xác nhận |
| HDV sửa đơn đã nhận, nhãn "Đã sửa" | ADR-0023 điều 3–8 | giữ, chỉ tham chiếu (Q-J) |
| Aborted = HDV huỷ vì "gọi khách không được" / "khách yêu cầu huỷ" | ADR-0014 điều 11 + ADR-0027 điều 3 (accepted); mã `src/modules/dispatch/rules.ts:74-79` — **đúng nguyên văn hai lý do đã có** | không đổi danh sách lý do. **Mới:** cho huỷ cả đơn chưa chốt (Q-G) |
| Mọi lần huỷ phải có lý do, chọn nhanh — (3) | đặc tả mô hình vai §8 "Huỷ: … kèm lý do" (đã duyệt, chưa thi công); hôm nay `POST /api/orders/:id/status` không nhận lý do (`src/modules/orders/index.ts:311-345`) | **Mới ở mã:** lý do bắt buộc khi người lập/văn phòng huỷ (Q-H) |
| Hoàn thành | ADR-0025 (proposed) | chỉ tham chiếu |
| **Từ chối → đơn về Tự do** | chưa có; vướng LC-8 | **MỚI** (Q-B, Q-D, Q-E, Q-F) |
| **Người tạo chọn HDV** | ADR-0020 điều 3 (giao sau khi lập, có hiệu lực ngay); ADR-0018 điều 7/9 (accepted): chọn người khác = **đề nghị** | **MỚI:** chọn ngay trong form lập (Q-C) |
| **Danh sách HDV = chờ nhận + đơn mình chưa hoàn thành** — (6) | "Việc của tôi" hôm nay chỉ có đơn đã chốt (`src/modules/orders/index.ts:139`) | **MỚI** (§8); giải luôn mục N7 của Bảng tin |
| Tách hai lớp — (4) | đặc tả mô hình vai §8; ADR-0023 điều 7 | xác nhận |

## 3. Mô hình hai lớp (theo Cách 1)

**Lớp đơn** (cột `orders.status` và các mốc của ADR-0025):

| Nhãn đề xuất | Mã | Đổi bằng | Ai |
|---|---|---|---|
| Chờ xác nhận (hôm nay hiện "Nháp" — Q-A2) | `draft` | lập đơn (`POST /api/orders`) | ai có `order.create` |
| Đã xác nhận (chốt với khách) | `confirmed` | `POST /api/orders/:id/status` | `order.modify`: người lập, người phụ trách cấp đầy đủ, Quản trị. HDV tự xác nhận: đã có hướng (ADR-0018 điều 6, Hoàn tất Q1) nhưng chưa có ô `order.confirm` — ngoài phạm vi |
| Đã huỷ | `cancelled` | `/status` (lý do bắt buộc — mới) hoặc `/handler-cancel` (HDV, lý do đóng) | `order.modify` / `order.cancel` |
| Đã giao – đã thu đủ; Hoàn thành | mốc `delivered_at` / `completed_at` (chưa có) | ADR-0025 | ADR-0025 |

**Lớp phân công** (suy từ dòng `HANDLE` đang mở của `dsp_assignment`; không thêm cột trạng thái — ADR-0020 điều 9):

| Trạng thái | Nghĩa là | Sự kiện đưa vào |
|---|---|---|
| **Chờ nhận** ("Tự do") | không có dòng `HANDLE` đang mở | lập đơn mà không chọn HDV; **Từ chối** |
| **Đã có người nhận** | đúng một dòng đang mở (chỉ mục `dsp_assignment_handler_open_uq`, `migrations/0014_dispatch.sql:58`) | **Nhận** (cho chính mình); **Giao** hoặc chọn lúc lập; **Đổi người** |

**Nhãn** (không phải trạng thái): "Đã sửa" (ADR-0023 điều 7); "HDV huỷ · <lý do>" (nhật ký `order_cancelled_by_field`); "Được trả lại" (nhật ký từ chối — Q-F).

**Tám trạng thái chủ đã kể, xếp vào lớp:**

| Chủ gọi | Thuộc | Hiện trên màn hình |
|---|---|---|
| Nháp (Draft) | chưa có gì trong hệ thống | form chưa bấm Lưu. "Nháp riêng" của Đối tác (chỉ họ thấy, chờ "Gửi đơn hàng") thuộc giai đoạn 5 |
| Đã gửi (Submitted) | phân công: Chờ nhận (lần đầu) | "Chờ nhận" |
| Tự do (pending-assignment) | phân công: Chờ nhận, kể cả sau Từ chối | "Chờ nhận" (+ "được trả lại" nếu có — Q-F) |
| Đã có HDV xác nhận (Assigned) | phân công: Đã có người nhận | "HDV: <tên>" |
| Hoàn thành (Finished) | đơn: mốc của ADR-0025 | theo ADR-0025 |
| Được sửa (edited by Guide) | nhãn | "Đã sửa" |
| Aborted | đơn `cancelled` + nhãn | "Đã huỷ · HDV huỷ: <lý do>" |
| Đã huỷ (Cancelled) | đơn `cancelled` | "Đã huỷ · <lý do>" |

Hai lớp độc lập nhau: đơn "Chờ xác nhận" có thể "Chờ nhận" hoặc "HDV: A"; đơn "Đã xác nhận" cũng vậy.

## 4. Luồng

1. **Lập đơn.** Người lập có thể chọn một HDV. Chọn được là người có `dispatch.assign` trên đơn của mình: Bán hàng, Quản trị, Toàn quyền. Thực tập (`dispatch.assign = none`) và Đối tác không chọn được. Riêng Đối tác chỉ được "đề xuất" (ADR-0018 điều 9), làm ở giai đoạn 5.
   - Có chọn → trong **cùng một lô** với lệnh tạo đơn: kiểm `checkAssignee` (`src/modules/dispatch/rules.ts:50-58`), mở dòng `HANDLE`, ghi nhật ký `order_handler_changed` "từ chưa có người phụ trách sang <tên>".
   - Không chọn → đơn ở Chờ nhận.
   - Chọn HDV có hiệu lực ngay hay chỉ là đề nghị: Q-C.
2. **Chờ nhận.** Đơn hiện ở "Đơn chờ nhận" của mọi HDV. Văn phòng thấy nó ở ô "Chưa phụ trách", ô này sẽ đếm cả đơn chưa chốt (ADR-0020 M1 = A; hôm nay chỉ đếm đơn đã chốt, `src/modules/orders/repository.ts:478`).
3. **Nhận / Giao.**
   - **Nhận:** HDV bấm "Nhận" (`PUT /api/orders/:id/handler`, cho chính mình). Máy chủ chỉ chèn dòng khi chưa có ai (`src/modules/dispatch/repository.ts:34-39`), có chỉ mục duy nhất làm lưới cuối. Hai người cùng bấm thì người sau nhận **409 `stale`** (`src/modules/dispatch/rules.ts:103-112`, `src/modules/dispatch/index.ts:112-134`); màn hình báo "Đơn vừa có người khác nhận" rồi tải lại. Route này đang ở cổng `office` (`dispatch/index.ts:100`), nên HDV chỉ dùng được sau khi ADR-0019 điều 1 chuyển nó sang cổng `orders`.
   - **Giao:** Quản trị/Điều hành/Toàn quyền giao mọi đơn; người lập và người đang phụ trách cấp đầy đủ giao đơn của mình (`dispatch.assign`). Có hiệu lực ngay (ADR-0020 điều 3).
4. **Từ chối (mới).** Người đang phụ trách bấm "Từ chối" và phải chọn lý do. Máy chủ làm trong **một lô**:
   - đóng dòng `HANDLE` của chính người đó. Câu chốt theo đúng khuôn `CLOSE_HANDLER` (`src/modules/dispatch/repository.ts:46-51`), nhưng **không** mở dòng mới;
   - ghi nhật ký `order_handler_refused` với điều kiện `WHERE changes() > 0`.

   Đơn về Chờ nhận. Bảng tin báo cho người được báo theo §7. Lý do chọn nhanh và phạm vi áp dụng: Q-D, Q-H. Ô quyền đề xuất: thao tác mới `dispatch.refuse`:
   - `assigned` cho mọi mức làm người phụ trách được (Bán hàng, Quản trị, Hướng dẫn viên);
   - Toàn quyền `any` (ADR-0014 điều 2);
   - còn lại `none`.
5. **Huỷ.**
   - **Aborted** (HDV đang phụ trách huỷ): `POST /api/orders/:id/handler-cancel`, hai lý do đóng (ADR-0014 điều 11). Bị chặn khi ngày đi đã qua (ADR-0027 điều 3; `dispatch/index.ts:156`). **Mới (Q-G):** cho huỷ cả đơn chưa chốt mà HDV đang phụ trách (hôm nay trả 409 `not_editable`, `dispatch/index.ts:155`).
   - **Cancelled** (người lập hoặc văn phòng huỷ): `POST /api/orders/:id/status` với `cancelled`, **lý do bắt buộc** (mới), ghi vào phần chi tiết của nhật ký `cancelled`.
6. **Sửa:** theo ADR-0023, không đổi.
7. **Hoàn thành:** theo ADR-0025, chỉ tham chiếu.

**Ca biên**

| Ca | Xử lý đề xuất |
|---|---|
| HDV từ chối đơn sếp giao | như bước 4. Người giao được luôn là văn phòng (Bán hàng/Quản trị/Toàn quyền, có `order.view = any`), nên đã nhận tin qua nhóm `tat-ca`; thông báo nổi theo Q-F |
| Từ chối khi tour đã qua ngày đi | chặn, 409: "Tour đã qua ngày đi — nhờ văn phòng đổi người". Dùng cùng hàm `tripDeparted` (`src/shared/trip-rules.ts:38`), cùng mốc với ADR-0027. Có chặn sớm hơn không: Q-E |
| Từ chối hoặc huỷ sau "Đã giao" (ADR-0025) | chặn: trigger của ADR-0025 điều 5 khoá đổi dòng `HANDLE` và đổi trạng thái đơn (**chưa có** — ADR-0025 còn nháp; tới lúc đó không có mốc "Đã giao" để chặn) |
| Từ chối đơn đã huỷ | chặn, 409 "Đơn đã huỷ" |
| Hai HDV cùng bấm Nhận | người sau nhận 409 `stale` (mã đã có) |
| Có người bấm Nhận đúng lúc người phụ trách bấm Từ chối | lệnh nào tới trước thắng. Câu chốt đã theo `party_id`, không cần cơ chế mới |
| HDV từ chối rồi bị giao lại chính đơn đó | cho phép (sếp quyết). Bảng chọn người phụ trách hiện "đã từ chối lúc … — <lý do>" để sếp biết. HDV từ chối lại được; mỗi lần một dòng nhật ký |
| Người phụ trách là hồ sơ không có tài khoản | không ai bấm Từ chối được; văn phòng đổi người như hôm nay |
| Nhật ký | chỉ ghi tên người và nhãn lý do. Với ô "Khác", máy chủ từ chối chuỗi có từ 8 chữ số liền nhau (dạng SĐT) — Hiến chương 5.12 |

## 5. Ai thấy gì

| Mức quyền (vai) | Đơn chờ nhận | Đơn mình phụ trách | Đơn người khác phụ trách | "Đơn chờ nhận" |
|---|---|---|---|---|
| Hướng dẫn viên `FIELD` (vai HDV nội bộ) | **chỉ**: mã đơn, ngày đi, tên dịch vụ, số khách, nơi và giờ đón (ADR-0023 điều 1). Không tên/SĐT khách, không tiền, không ghi chú, không lịch sử | đủ, kể cả SĐT và tiền — (2) | 404 | có (Nhận) |
| Bán hàng `SALES` (NV kinh doanh) | đủ | đủ | đủ | lọc "Chưa phụ trách"; nhận được |
| Quản trị `ADMIN` (Điều hành chung) | đủ | đủ | đủ | xem, nhận, giao |
| Toàn quyền `SUPER_ADMIN` + `ADMIN` (Giám đốc) | đủ | đủ | đủ | xem, nhận, giao |
| Kế toán `ACCOUNTING` | đủ (G2) | — | đủ | xem; không nhận |
| Thực tập `INTERN`, Đối tác `PARTNER` | chỉ đơn mình lập (không đổi) | — | không | không |

**Chữ của chủ → mức quyền** (quyền xét theo mức quyền, không theo vai — ADR-0001 điều 4, ADR-0018 điều 3):

| Chủ nói | Vai | Mức quyền | Nguồn |
|---|---|---|---|
| "Quản trị viên" | — | `ADMIN` | — |
| "Điều hành" | "Điều hành chung" (`OPERATIONS_MANAGER`) | sinh `ADMIN` | `src/shared/roles.ts:28` |
| "Giám đốc" | `DIRECTOR` | sinh `ADMIN` + `SUPER_ADMIN` | `roles.ts:27` |
| "Bán hàng" | Nhân viên kinh doanh | `SALES` | — |
| "HDV" | Hướng dẫn viên nội bộ | `FIELD` | `roles.ts:29` |

**Lọc ở máy chủ, không chỉ ở giao diện.**
- Phạm vi lọc: danh sách đơn, chi tiết đơn, "Việc của tôi"/màn HDV, sự kiện Bảng tin.
- Trang chủ văn phòng vẫn đòi ô không ngữ cảnh (ADR-0019 điều 2), nên HDV không vào Trang chủ đó mà vào thẳng màn của mình (§8).
- Hôm nay đơn không được xem trả **403** (`src/modules/orders/index.ts:230`). Với HDV đổi thành **404**, đúng ADR-0023 điều 1.
- **Bẫy ở mã hôm nay:** `GET /api/orders` tính bộ lọc là "người lập = tôi" mỗi khi `can(staff, "order.view")` không ngữ cảnh trả sai (`src/modules/orders/index.ts:185`). Đặt FIELD = `assigned` mà không sửa thì HDV nhận danh sách lọc theo người lập — **rỗng** (HDV không lập đơn). Route cần nhánh thứ ba lọc theo người phụ trách đang mở qua `v_dsp_order_handler`, như `src/modules/orders/repository.ts:478` đã làm. Chú thích ở `:186-187` dựa vào việc router còn chặn FIELD — điều đó hết đúng sau ADR-0019.
- **Phần hẹp** của đơn chờ nhận dựng từ **danh sách trường được phép**, ở máy chủ (như biên nhận — Hiến chương 4.4). Không lấy cả đơn rồi bỏ bớt. Bỏ hẳn ghi chú khách và ghi chú chuyến, vì chữ tự do có thể chứa SĐT.
- Lưu ý: chú thích của ô `contact.view` (`permissions.ts:51`) gộp "điểm đón, giờ" vào thông tin liên hệ, trong khi ADR-0023 cho HDV thấy hai thứ đó ngay ở đơn chờ nhận. Đây là ngoại lệ có tên, phải ghi vào ADR.

**Cách đặt quyền (Q-I).**
- **(i) Khuyến nghị:** thêm thao tác mới `order.pool.view` (xem phần hẹp của đơn chờ nhận): `FIELD` và `SUPER_ADMIN` là `any`, các mức khác `none` (họ vốn đã thấy đủ). Ba ô `order.view`, `money.view`, `contact.view` của `FIELD` đều là `assigned`. Vì hai dòng `order.view` và `money.view` vẫn giống hệt nhau, bài khoá của ADR-0019 điều 2 vẫn xanh.
- **(ii)** Thêm phạm vi thứ sáu vào `Scope` ("chờ nhận hoặc đang phụ trách") cho `order.view`. Cách này đổi hợp đồng của `can()`, và làm `money.view` khác `order.view` ⇒ bài khoá ADR-0019 đỏ, phải làm thêm phần bỏ trường tiền trong phản hồi.

## 6. Dữ liệu

- **Không có bảng hay cột mới** (theo Cách 1 và Q-B(a)).
  - Từ chối = đóng dòng `HANDLE` (`valid_to_at`, `updated_by`); bảng `dsp_assignment` đã có đủ cột (`migrations/0014_dispatch.sql`).
  - Lý do từ chối nằm ở nhật ký, hành động mới `order_handler_refused`. Thêm hành động chỉ cần một dòng ở `src/shared/audit-actions.ts`; từ migration 0007 không còn CHECK (`audit-actions.ts:1-3`).
  - Lý do huỷ của người lập ghi vào phần chi tiết của nhật ký `cancelled`.
  - Trạng thái và nhật ký ghi cùng lô (Hiến chương 4.1).
- Nhãn "Aborted" và "được trả lại" suy từ nhật ký, hiện ở chi tiết đơn và màn HDV. Muốn hiện cả ở **danh sách đơn** của văn phòng thì có hai cách: đọc thêm nhật ký cho mỗi trang, hoặc thêm một cột (migration chỉ-thêm). Kế hoạch đo rồi chọn.
- Chọn Q-B(b) thì **có** dữ liệu mới: chỗ lưu "đang xin trả" (bảng `dsp_…`, migration theo expand–contract — `CLAUDE.md` §7), kèm cập nhật `docs/data-dictionary.json` và `npm run dict`.
- Theo khuyến nghị: `docs/data-dictionary.json` không đổi; không đụng tiền.

## 7. Bảng tin (ADR-0022, đang chạy ở bản 1.16)

**Sự kiện.**
- Giữ đúng 5 khoá (`src/shared/bang-tin.ts:12-18`).
- Thêm một loại thay đổi: **`tu_choi`**. HDV huỷ dùng lại loại `huy`.
- Lập đơn có chọn HDV: phát `giao` (thay cho `tao`), để HDV được giao thấy thông báo nổi. Mỗi route vẫn báo đúng một lần (`src/bang-tin-guard.test.ts`).

**Ai được báo.**
- HDV có `dispatch.claim` thì kết nối của họ có nhãn `cho-nhan` (`nhanKetNoi`, `bang-tin.ts:30-35`).
- **Chỗ hở cần vá.** `nhanSuKien` chỉ gắn `cho-nhan` khi **sau** thay đổi đơn không còn ai phụ trách (`bang-tin.ts:51`). Khi một đơn chờ nhận vừa có người nhận, các HDV khác (có `cho-nhan`, không có `tat-ca`) **không được báo**. Danh sách của họ vẫn còn đơn đó cho tới khi họ bấm Nhận và gặp 409. Cách sửa: gắn `cho-nhan` khi đơn chưa có người **trước hoặc sau** thay đổi. Bài ảnh chụp NT-2 ("vừa có người nhận — không cho-nhan", `src/shared/bang-tin.test.ts`) sẽ **đỏ có chủ đích**.
- Khi Từ chối: `tat-ca`, `nguoi:<người lập>`, `nguoi:<HDV từ chối>`, `cho-nhan` — luật hiện hành đã tự gắn đủ (ADR-0022 điều 3), **không thêm nhãn mới**. Người giao được việc (Bán hàng/Quản trị/Toàn quyền) đều có `order.view = any` nên đã nằm trong `tat-ca`.
- **Giới hạn của thông báo nổi:** trình duyệt quyết hiện hay không **chỉ theo loại sự kiện và quyền của người xem** (`thongBaoNoi`, `bang-tin.ts:100-108`); sự kiện không mang tên người (ADR-0022 điều 4). Nên nếu `tu_choi` hiện nổi thì hiện cho **mọi** màn hình văn phòng (kể cả Kế toán, mọi Bán hàng) và mọi HDV; Đối tác lập đơn chỉ được làm mới (ADR-0022 Q-C). Không nhắm riêng được "người đã giao" hay "người lập" — muốn vậy phải có ADR mới sửa ADR-0022 điều 3–4 (Q-F).

**NT-3 sẽ đỏ có chủ đích** (`src/shared/bang-tin.test.ts:55-65`). Lý do: `FIELD` có `dispatch.claim` khác `none` mà `order.view` khác `any`. Đây là tín hiệu phải có quyết định của chủ (Q-K), **không** được sửa bài kiểm cho xanh. Khuyến nghị: thay NT-3 bằng luật "mọi người mang nhãn `cho-nhan` đều xem được phần hẹp của đơn chờ nhận (`order.pool.view` hoặc `order.view = any`)".

**Chữ thông báo nổi (nháp).**

| Loại | Câu | Ghi chú |
|---|---|---|
| `tu_choi` | "Đơn TD-… vừa được trả lại, đang chờ người nhận" | sự kiện không mang tên người (ADR-0022 điều 4); muốn biết ai trả, vì sao thì mở đơn |
| `tao_cho_nhan` | "Có đơn mới chưa có người phụ trách: TD-…" | đã có |
| `giao` | "Đơn TD-… vừa đổi người phụ trách" | đã có. Câu riêng "Bạn vừa được giao đơn TD-…": Q-L — màn hình tự tra "Việc của tôi" để biết, không thêm trường vào sự kiện |

HDV bấm vào thông báo: hôm nay mở `/account` (`bang-tin.ts:107`); sau thay đổi này mở đơn (nếu là đơn của mình) hoặc danh sách chờ nhận.

**Giới hạn đã ghi, vẫn còn** (`docs/superpowers/plans/2026-09-25-bang-tin-de-xuat-luat.md`):
- R24: thông báo nổi và dải "Tải lại" nằm dưới bảng đang mở.
- R16: tin `tien` phát cả khi số khách y nguyên.
- N6: tài khoản lai Đối tác + HDV.
- N7: HDV được báo về đơn chưa chốt mà "Việc của tôi" chỉ liệt kê đơn đã chốt — **đặc tả này giải N7**.

Route Từ chối là `POST /api/orders/:id/…`, nên tự rơi vào hàng rào "mọi đường ghi đơn đều báo". Bài kiểm "thấy 8 route" đổi thành 9 — đỏ có chủ đích.

## 8. Màn hình hướng dẫn viên (hành vi; hình thức để chủ duyệt trên Claude Design — bài học Đợt D)

- **Một màn, hai phần.** Màn này thay khối "Việc của tôi" ở trang Tôi (`web/account.ts:339` trở đi):
  - **"Đơn chờ nhận"**: đơn chưa ai nhận, xếp theo ngày đi gần nhất.
  - **"Đơn của tôi"**: đơn mình phụ trách, chưa huỷ, chưa Hoàn thành — (6). Gồm cả đơn chưa chốt lẫn đã chốt.
- **Dòng đơn chờ nhận:** mã, ngày đi, tên dịch vụ, số khách, nơi và giờ đón; nút **Nhận**. Không SĐT, không tiền.
- **Dòng đơn của tôi:**
  - hiện như hôm nay (tên, SĐT khách, dịch vụ, số khách), thêm tiền (sau ADR-0023), trạng thái đơn và nhãn "Đã sửa";
  - nút **Từ chối**, **Huỷ đơn** (không hiện sau ngày đi — ADR-0027), sửa số khách (ADR-0023).
- **Lý do chọn nhanh:** mỗi lý do là một nút, bấm là chọn; "Khác" mở ô chữ ngắn. Chỉ lưu khi đã chọn lý do. Huỷ có thêm hộp hỏi lại "không thể hoàn tác" (như bản 1.14).
- **Làm mới** theo Bảng tin, không hỏi theo chu kỳ. Thua đua thì báo "Đơn vừa có người khác nhận" và tải lại.
- **Câu hỏi bố cục, để chủ thiết kế (không chặn việc khác):**
  - tab hay hai khối;
  - đơn đã qua ngày đi mà chưa Hoàn thành: khi chưa có ADR-0025 thì "chưa hoàn thành" = mọi đơn chưa huỷ. Đề xuất gom thành khối thu gọn "Đã qua ngày đi";
  - đơn chờ nhận đã qua ngày đi: đề xuất không hiện.

## 9. Giả định

| # | Giả định | Loại |
|---|---|---|
| G1 | "Huỷ bởi người đặt" = người lập đơn hoặc văn phòng bấm huỷ. Khách/bên đặt không tự đăng nhập, trừ Đối tác huỷ đơn mình lập (`order.modify` phạm vi `own`) | bề mặt, đảo được |
| G2 | Kế toán vẫn thấy mọi đơn (ADR-0023 điều 2), dù câu (1) không nhắc | cấu trúc → hỏi ở Q-M |
| G3 | Thực tập và Đối tác không đổi gì | đã có nguồn: ADR-0020 điều 2, ADR-0018 LC-1 |
| G4 | "Từ chối" dùng được cho **mọi** người đang phụ trách, không riêng HDV (Hiến chương 5.8) | cấu trúc → Q-D |
| G5 | Ở lượt đầu, nhãn "Aborted"/"được trả lại" chỉ hiện ở chi tiết đơn và màn HDV | bề mặt, đảo được |
| G6 | Tài khoản lai Đối tác + HDV theo luật "có quyền Đối tác là áp" (bản 1.15): không thấy đơn chờ nhận, không nhận | cấu trúc → Q-M |
| G7 | Câu chữ thông báo nổi ở §7 | bề mặt, đảo được |

## 10. Câu hỏi mở — xin chủ trả lời một lần

Trả lời "theo khuyến nghị" = đồng ý mọi khuyến nghị dưới đây; chỉ cần ghi những câu chọn khác.

| Mã | Câu hỏi | Khuyến nghị |
|---|---|---|
| **Q-A** (+A2) | "Đã gửi/Đã xác nhận" theo Cách 1 hay Cách 2 (§0)? Đơn đã lưu chưa chốt đổi nhãn "Nháp" → "Chờ xác nhận"? | **Cách 1**; **có** đổi nhãn |
| **Q-B** | Từ chối: đơn về Tự do ngay — thay LC-8 (a), hay HDV cũ giữ tới khi có người nhận (b)? | **(a)** |
| **Q-C** | Chọn HDV (lúc lập, hoặc Quản trị giao) có hiệu lực ngay rồi HDV từ chối được, hay chỉ là đề nghị, HDV bấm Nhận mới thành người phụ trách (ADR-0018 điều 7)? | **Hiệu lực ngay** — như mã hôm nay và ADR-0020 điều 3, không cần dữ liệu mới. Kiểu "đề nghị có hạn" để giai đoạn 5. Đối tác vẫn chỉ đề xuất (ADR-0018 điều 9) |
| **Q-D** | Ai được Từ chối, với đơn ở trạng thái nào? | Mọi người đang phụ trách; đơn chưa chốt và đã chốt; không áp cho đơn đã huỷ |
| **Q-E** | Hạn chót để từ chối? | Như HDV huỷ: chặn từ ngày sau ngày đi (ADR-0027); từ chối tour hôm nay/ngày mai vẫn được (thông báo nổi như mọi lần từ chối — Bảng tin chưa phân biệt được tin gấp). Phương án chặt hơn: cấm trong 24 giờ trước ngày đi, HDV phải gọi văn phòng |
| **Q-F** | Thông báo khi HDV từ chối? Có hiện "được trả lại" trên đơn không? | **(a) khuyến nghị:** `tu_choi` hiện nổi cho **mọi** người nhận tin (văn phòng + mọi HDV), Đối tác chỉ làm mới — trong khuôn ADR-0022 hiện có. (b) Nhắm riêng người giao/người lập: cần ADR mới sửa ADR-0022 điều 3–4 (đã duyệt). **Có** hiện "được trả lại" trên đơn |
| **Q-G** | HDV được huỷ (Aborted) cả đơn chưa chốt mình đang phụ trách? | **Có**, cùng hai lý do |
| **Q-H** | Danh sách lý do chọn nhanh? | Từ chối: "Bận lịch khác", "Ốm / việc riêng", "Không phù hợp tuyến/dịch vụ", "Khác (ghi ngắn)". Văn phòng huỷ: "Khách đổi ý", "Khách đặt trùng", "Sai thông tin — lập lại đơn", "Khác". HDV huỷ: **giữ đúng hai lý do** (ADR-0014 điều 11 ghi "đúng hai lựa chọn"; thêm "Khác" phải ra ADR mới) |
| **Q-I** | Đặt quyền xem phần hẹp theo cách nào (§5)? | **(i)** thao tác mới `order.pool.view` |
| **Q-J** | HDV sửa đơn và nhãn "Đã sửa" giữ đúng ADR-0023 điều 3–8? | **Giữ** |
| **Q-K** | NT-3 đỏ: chấp nhận nhóm `cho-nhan` có cả HDV (người không xem mọi đơn), thay NT-3 bằng luật mới (§7)? | **Chấp nhận** |
| **Q-L** | Thông báo riêng cho HDV được giao ("Bạn vừa được giao đơn…")? | **Có** |
| **Q-M** | Kế toán vẫn thấy hết (G2)? "Điều hành" = "Điều hành chung", mức Quản trị? Tài khoản lai theo G6? | **Đúng** cả ba |

## 11. Phụ thuộc và thứ tự thi công

1. **ADR-0019 thi công và lên production** trước. Đã duyệt 25/9 nhưng **chưa thi công**: cổng vẫn suy từ một ô (`src/shared/permissions.ts:115`, `src/shared/router.ts:174-175`), ô `dispatch.request` vẫn còn trong bảng (`permissions.ts:61`). Bước này đóng hai lỗ `money.view`, `contact.view`.
2. **Chủ trả lời §10.** Làm được ngay, không phải chờ bước 1.
3. **AI soạn ADR sau khi chủ trả lời:**
   - **ADR-0030** (số kế tiếp; đã kiểm không nhánh nào có ADR-003x): Từ chối + thay LC-8, ô `dispatch.refuse`, lý do huỷ bắt buộc, HDV huỷ đơn chưa chốt.
   - **Sửa bản nháp ADR-0020:** bỏ câu "LC-8 không đổi"; thêm chọn HDV lúc lập; thêm quyết định NT-3.
   - **Sửa bản nháp ADR-0023:** cách đặt quyền theo Q-I; tách phần "xem" khỏi phần "sửa" để duyệt ở hai lượt.
   - Hai ADR trên còn `proposed` nên sửa được. **Không sửa** ADR-0014/0017/0018/0022/0027 (accepted): mọi câu bị thay ghi ở ADR mới theo mẫu "nguyên văn → mới". ADR-0017 (FIELD xem mọi đơn kể cả tiền) chỉ hết hiệu lực khi ADR-0023 được duyệt.
4. **Duyệt theo hai lượt** (trang ghép bên dưới).
5. **Thi công theo lượt:** mỗi task đỏ → xanh; e2e; kịch bản Chrome; người kiểm độc lập chỉ đọc.

## 12. Tiêu chí nghiệm thu (hành vi kiểm được)

1. Ba đường tách riêng, mỗi đường một bài e2e:
   - (a) HDV A gọi `GET /api/orders` → **chỉ** đơn A đang phụ trách (không có đơn chờ nhận, không có đơn người khác);
   - (b) HDV A gọi danh sách chờ nhận → **chỉ** đơn chưa ai nhận, ở dạng phần hẹp;
   - (c) HDV A mở chi tiết đầy đủ của đơn B đang phụ trách **và** của một đơn chờ nhận → **404** cả hai.
2. Phản hồi phần hẹp của đơn chờ nhận không có khoá tên/SĐT/email khách, tiền, ghi chú, lịch sử. Có e2e so khoá, và test thuần: đưa vào đơn đủ mọi trường → không trường ngoài danh sách nào lọt ra.
3. A và B cùng bấm Nhận: đúng một 200, một 409 `stale`; đơn có đúng một dòng `HANDLE` đang mở (e2e).
4. Từ chối không kèm lý do → 400. Có lý do → 200; đơn hết dòng `HANDLE` đang mở; có đúng một dòng `order_handler_refused` mang nhãn lý do, không có SĐT (e2e + `audit-invariants`).
5. Hai tài khoản trên Chrome: A từ chối → trong ≤ 5 giây đơn hiện ở "Đơn chờ nhận" trên màn hình của HDV B đang mở. Sau đó C nhận → đơn biến khỏi màn hình của B.
6. Từ chối khi ngày đi đã qua → 409. Từ chối đơn đã huỷ → 409.
7. Người lập huỷ không kèm lý do → 400. Có lý do → nhật ký `cancelled` ghi lý do.
8. (nếu Q-G = có) HDV huỷ được đơn chưa chốt bằng một trong hai lý do; lý do khác → 400.
9. Lập đơn kèm HDV: một lô ghi đơn + dòng `HANDLE` + nhật ký. HDV không đủ điều kiện → 400, và không có đơn nào được tạo.
10. Thực tập, Đối tác, Kế toán không đổi: các bài e2e quyền hiện có vẫn xanh.
11. Hàng rào:
    - NT-3 đỏ khi đổi ô → chủ quyết → bài kiểm mới; NT-2 đổi theo;
    - hàng rào Bảng tin thấy route mới;
    - hàng rào 1 và 2 xanh (ô mới được hỏi trong thân route);
    - mỗi rào mới có dòng ở `docs/SO-HANG-RAO.md` với ngày thấy chặn thật.
12. `npm test` xanh; `npm run typecheck` 0 lỗi; `npm run test:e2e` xanh; `audit-invariants` đạt. Nếu chọn Q-B(a), thêm câu kiểm bất biến: đơn đã từng có người nhận mà nay không còn ai thì lần đóng gần nhất phải đi cùng một dòng `order_handler_refused` (LC-8 mới).
13. Người kiểm độc lập chỉ đọc báo ĐẠT.

## 13. Trang ghép (CLAUDE.md §9)

**(1) Bảng chứa loại thực thể nào**

| Bảng | Hôm nay | Sau thay đổi |
|---|---|---|
| `dsp_assignment` | dòng `HANDLE` hạt đơn: hồ sơ nội bộ có tài khoản (Bán hàng/Quản trị/HDV), hoặc hồ sơ không tài khoản; đổi người = đóng một dòng, mở một dòng | vẫn đúng loại đó; **thêm** cách đóng mà không mở dòng mới (Từ chối) |
| `orders` | đơn do nội bộ, Đối tác, Thực tập lập | không đổi cột; đơn mới không có người phụ trách (ADR-0020) |
| `audit_log` | nhật ký chỉ-thêm | thêm hành động `order_handler_refused`; `cancelled` có lý do |
| `order_money_adjustment` | dòng điều chỉnh của HDV | không đổi (ADR-0023) |

**(2) Dòng bản đồ quyền bị chạm** (`src/shared/permissions.ts`)

| Ô | Hôm nay | Đề xuất | Áp cho |
|---|---|---|---|
| `order.view` | FIELD `none` (:48) | FIELD `assigned` (ADR-0017 cho `any`; ADR-0023 thu hẹp) | đơn mọi nguồn mà HDV đang phụ trách |
| `money.view` | FIELD `none` (:49) | FIELD `assigned` | như trên |
| `contact.view` | FIELD `assigned` (:51) | giữ | như trên |
| `order.pool.view` (mới) | — | FIELD `any`, SUPER_ADMIN `any`, còn lại `none` | đơn chưa có người, chưa huỷ, chưa "Đã giao"; chỉ phần hẹp |
| `dispatch.claim` | FIELD `none` (:59) | FIELD `any` | đơn chưa có người; nhận cho chính mình |
| `dispatch.assign` | SALES `ownOrAssigned`, ADMIN `any` (:58) | giữ; dùng thêm ngay lúc lập đơn | đơn của mình / mọi đơn |
| `dispatch.refuse` (mới) | — | SALES/ADMIN/FIELD `assigned`, SUPER_ADMIN `any`, còn lại `none` | đơn mình đang phụ trách |
| `order.cancel` | FIELD `assigned` (:57) | giữ ô; mở thêm cho đơn `draft` (luật trạng thái, Q-G) | đơn HDV đang phụ trách |
| `order.modify` | như hôm nay (:53) | giữ ô; huỷ qua `/status` đòi lý do | — |

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng router (sau ADR-0019) | Chốt trong thân route | Lọc / lưới ở dữ liệu |
|---|---|---|---|
| Danh sách, chi tiết đơn | `orders` (FIELD được thêm theo ADR-0019 điều 3) | `can(order.view, {assigned})`, `money.view`, `contact.view` | FIELD chỉ thấy đơn mình; đơn khác → 404 |
| Danh sách chờ nhận | `orders` | `can(order.pool.view)` | chỉ đơn không có dòng `HANDLE` đang mở; phản hồi theo danh sách trường được phép |
| Nhận / giao / chọn lúc lập | `orders` (chuyển từ `office`, ADR-0019 điều 1) | `mayChangeHandler` → `dispatch.assign` / `dispatch.claim`; `checkAssignee` | câu chèn `NOT EXISTS` + chỉ mục duy nhất |
| Từ chối (mới) | `orders` | `can(dispatch.refuse, {assigned})` + trạng thái + `tripDeparted` | câu chốt theo `party_id` |
| HDV huỷ | `staff` (hôm nay, `dispatch/index.ts:149`) | `can(order.cancel, {assigned})` + `tripDeparted` | trigger 0017 |
| Bảng tin | `GET /api/bang-tin` (có phiên) | `nhanKetNoi` | nhãn `cho-nhan`, `nguoi:` |
| Cơ sở dữ liệu | — | — | chỉ mục `dsp_assignment_handler_open_uq`; trigger 0017; trigger của ADR-0025 (khi có) |

**Số quyết định chạm quyền/dữ liệu: 6** — vượt trần 3 mỗi lượt, nên chia hai lượt:
- D1: HDV xem gì.
- D2: HDV nhận đơn + NT-3.
- D3: đơn mới không có người + chọn HDV lúc lập.
- D4: Từ chối + thay LC-8.
- D5: lý do huỷ bắt buộc + HDV huỷ đơn chưa chốt.
- D6: HDV sửa đơn (ADR-0023 điều 3–8).

Chia lượt:
- **Lượt 1 (D1, D2, D3), chỉ sau khi ADR-0019 lên production:** ADR-0023 phần "xem" + ADR-0020 (đã sửa). Chạy được một mình: HDV thấy đơn và nhận đơn; văn phòng giao; chưa có Từ chối (HDV nhờ văn phòng đổi người như hôm nay).
- **Lượt 2 (D4, D5, D6):** ADR-0030 + ADR-0023 phần "sửa".

Chủ vẫn trả lời mọi câu ở §10 trong một lần; chỉ việc **duyệt** mới chia hai lượt.
