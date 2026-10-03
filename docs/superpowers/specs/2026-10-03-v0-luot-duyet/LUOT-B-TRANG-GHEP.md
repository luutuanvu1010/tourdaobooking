# Lượt duyệt V0-B — trang ghép (CLAUDE.md §9)

> Hai quyết định trình chủ cùng lượt (lộ trình `docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` §2, lượt B):
> - **B1** — ADR-0097 nháp "Sự kiện điều chỉnh có lý do cho chuyến xe": `B1-ADR-0097-su-kien-dieu-chinh-co-ly-do.md`.
> - **B2** — ADR-0098 nháp "Tra trùng hồ sơ khách theo số điện thoại ở máy chủ, cho mọi vai lập đơn": `B2-ADR-0098-tra-trung-ho-so-theo-sdt.md`.
>
> **Đếm quyết định chạm quyền/dữ liệu (trần 3):** 2 (B1, B2). Nếu chủ chọn Q-98-1 (A) — Danh bạ cũng chặn trùng số, chạm `party.write` và dữ liệu hồ sơ — thì đó là quyết định thứ 3, vẫn trong trần. Q-98-2 chỉ là chọn dạng số trong cùng luật của B2 (không tính thêm). Hai quyết định **không chạm chung bảng** (B1: `vc_*`; B2: `pty_*`, `orders`), nên không có va chạm chéo trong lượt; điểm chạm duy nhất là cả hai cùng đi qua lớp vé chống ghi trùng (ADR-0094) ở route mới / route sẵn có.
>
> **Phụ thuộc lượt A:** B1 cần ADR-0096 (lượt A) để chuyến "xuất bến nhầm 3 ngày sau" không còn xảy ra; B1 chỉ gỡ nhầm **trong cửa sổ** xuất bến. Duyệt B1 trước A3 vẫn đúng nghĩa, nhưng thi công V3-B làm sau V3-A.
>
> **Xây trên lỗ đang hở:** không (không chạm `billing`).
>
> Mục (4) "cặp lệnh trên cùng đối tượng" là **áp thử** đề xuất 5.1 của `NGUYEN-NHAN-GOC.md`.

## (1) Bảng nào chứa loại thực thể nào

| Bảng | Thực thể chứa | Quyết định chạm | Đổi gì |
|---|---|---|---|
| `vc_trip` | chuyến xe | B1 Đ3, Đ4 | + cạnh `RUNNING → PLANNED` có điều kiện (trigger LC-07 chuyến); `departed_at/ms` về `NULL` khi thu hồi |
| `vc_trip_allocation` | suất khách (`PASSENGER`) và người đi kèm (`CREW`) | B1 Đ2, Đ4 | + giá trị `close_reason = 'CORRECTED'`; + cột `corrects_allocation_id`; chèn suất mới ở trạng thái đúng khi chuyến đang chạy (ngoại lệ LC-15) |
| `vc_trip_event` | sự kiện chuyến chỉ-thêm | B1 | + loại `CORRECTION`, `DEPARTURE_REVOKED` (tập loại kiểm ở mã, `src/shared/dieu-phoi-kieu.ts:35-40`) |
| `vc_reason` | danh mục lý do theo nhóm | B1 Đ2.5 | + nhóm `DIEU_CHINH`: Bấm nhầm, Khách đổi ý tại điểm, Khác |
| `vc_trip_departure_check`, `_item`, `vc_trip_manifest` | bản chụp lúc xuất bến (LC-05) | B1 Đ3.4 | không đổi; giữ bản cũ, thêm bản mới khi xuất bến lại |
| `pty_party` | hồ sơ người / tổ chức (khách, nhân viên, đối tác, nhà cung cấp, công ty chủ, tài xế …) | B2 | không đổi cấu trúc; **ít** dòng mới hơn (dùng lại thay vì tạo) |
| `pty_contact_point` | liên hệ có hiệu lực (SĐT, email …) của mọi loại hồ sơ trên | B2 | không đổi cấu trúc; là nơi tra trùng (`value_normalized`, chỉ mục không duy nhất `0011:64`) |
| `orders` | đơn: `booker_party_id`, bản chụp `customer_name` / `customer_phone` | B2 Đ2, Đ4 | `customer_phone` lưu dạng chuẩn hoá; `booker_party_id` trỏ hồ sơ dùng lại |

**Chú ý loại thực thể (bài học F-01):** `pty_party` / `pty_contact_point` chứa **mọi** loại người và tổ chức, không chỉ khách. Luật B2 tra trên **hồ sơ cá nhân** đang hoạt động, chưa gộp, bất kể vai — một SĐT trùng với hồ sơ **nhân viên** (ví dụ BH-21 "Sử dụng thông tin của tôi") cũng được dùng lại, không tạo hồ sơ khách thứ hai. Phản hồi cho Đối tác / Thực tập không nói hồ sơ đó là của ai (Đ3).

## (2) Dòng bản đồ quyền chạm các bảng trên (`src/shared/permissions.ts`)

Thứ tự cột: Bán hàng, Kế toán, Quản trị, HDV, Đối tác, Toàn quyền, Thực tập, Tài xế, Tài xế đối tác, Nhân sự.

| Ô | Dòng | Giá trị | Lượt B đổi gì |
|---|---|---|---|
| `trip.progress` | `:175` | Bán hàng, Quản trị, Toàn quyền `any`; Tài xế `assigned` | không đổi ô; **thêm việc** cho người có ô không ngữ cảnh (văn phòng): điều chỉnh suất, thu hồi xuất bến. Tài xế (`assigned`) **không** được hai lệnh này. Nhắc một lần (P18): ô này gồm cả **Bán hàng** — Bán hàng sẽ sửa được kết quả khách của mọi chuyến đang chạy; muốn chỉ Quản trị / Toàn quyền thì đổi điều kiện sang `trip.override` khi duyệt |
| `trip.dispatch` | `:170` | Bán hàng, Quản trị, Toàn quyền | không đổi; là người **nhận tin** điều chỉnh / thu hồi |
| `trip.view` | `:169` | văn phòng 4 vai; Tài xế `assigned` | không đổi; thấy lịch sử điều chỉnh trên chi tiết chuyến |
| `admin.manage` (route `/ly-do`) | — | Quản trị, Toàn quyền | không đổi; nhóm lý do `DIEU_CHINH` gieo bằng migration, sửa nhãn theo route sẵn có |
| `order.create` | `:78` | Bán hàng, Quản trị, Đối tác, Toàn quyền, Thực tập | không đổi; đường tạo hồ sơ người đặt nhận luật Đ1–Đ2 |
| `order.modify` | `:79` | Bán hàng `ownOrAssigned`, Quản trị, Toàn quyền, Đối tác `own`, Thực tập `own` | không đổi; cùng luật khi lưu nháp có `newBooker` |
| `order.trip.edit` | `:80` | Bán hàng `ownOrAssigned`, Quản trị, Toàn quyền | không đổi; cùng luật ở `PUT /api/orders/:id/booker` |
| `party.view` | `:122` | Bán hàng, Kế toán, Quản trị, Toàn quyền | **không đổi** — Đối tác, Thực tập vẫn `none`; quyết định ai nhận danh sách 409 (có ô) hay chỉ thông điệp (không ô) |
| `party.write` | `:123` | Bán hàng, Kế toán, Quản trị, Toàn quyền | không đổi; Danh bạ ngoài phạm vi trừ khi chủ chọn Q-98-1 (A) |

Không thêm mã quyền, không đổi giá trị ô nào.

## (3) Cổng nào canh cửa nào — gồm chỗ giao diện ẩn/hiện

| Cửa | Hôm nay | Sau lượt B |
|---|---|---|
| **Route mới** `POST /api/van-chuyen/chuyen/:id/phan-bo/:aid/dieu-chinh` | không có | cổng `office` + `can(trip.progress)` không ngữ cảnh; chuyến `RUNNING`; bảng điều chỉnh được phép (B1 Đ2.4); lý do nhóm `DIEU_CHINH`; lớp vé ADR-0094 |
| **Route mới** `POST /api/van-chuyen/chuyen/:id/thu-hoi-xuat-ben` | không có | như trên; chưa có tiến độ sau xuất bến; trong `proxy_backdate_max_minutes` |
| Route tài xế `POST /api/van-chuyen/cuoc-cua-toi/:id/…` | lệnh tiến độ | **không** thêm route điều chỉnh / thu hồi |
| Trigger LC-07 chuyến, LC-15 | chặn mọi lùi; LC-15 một ngoại lệ | + cạnh thu hồi có điều kiện; + ngoại lệ lô `CORRECTION` |
| `POST /api/orders`, `PUT /api/orders/:id`, `PUT /api/orders/:id/booker` (nhánh `newBooker`) | tạo hồ sơ mới không tra | tra theo SĐT chuẩn hoá; 0 → tạo; 1 → dùng lại; ≥ 2 → 409 danh sách (có `party.view`) hoặc không gắn (không có) |
| `GET /api/parties/lookup` (cổng `office` + `party.view`) | Đối tác, Thực tập 403 | **không đổi** (không mở đường đọc mới) |
| Luật SĐT khách trên đơn (`orders/rules.ts:90,116`) | `PHONE_RE` rộng | `normalizePhone`; số nước ngoài theo Q-98-2 |
| **Nút "Điều chỉnh…"** trên từng suất ở chi tiết chuyến văn phòng (`web/chuyen.ts`, khối bấm thay `:233-400`) | không có | hiện khi `can(trip.progress)` và chuyến đang chạy; bảng trượt chọn kết quả đúng + lý do |
| **Nút "Thu hồi xuất bến"** trên chuyến đang chạy (`web/chuyen.ts`) | không có | hiện khi `can(trip.progress)`, chuyến `RUNNING`, chưa có tiến độ; ẩn khi quá hạn |
| **Màn tài xế** (`web/cuoc-chuyen.ts`) | không nút sửa | **không** thêm nút; dòng "Vừa ghi … — Sai? Báo văn phòng" (V1.4); lịch sử điều chỉnh hiện như sự kiện thường |
| **Ô chọn người đặt** (`web/booker-picker.ts:54-85`) cho Đối tác / Thực tập | gọi lookup → 403 → "Không tra được hồ sơ — vẫn lưu đơn được" + nút "Tạo hồ sơ mới" | không gọi lookup; câu "Nhập số điện thoại — hệ thống tự dùng lại hồ sơ nếu đã có"; sau lưu hiện "Khách này đã có hồ sơ, hệ thống dùng lại" khi `bookerReused` |
| **Thông tin "Hồ sơ khách" trên trang đơn** (`web/order.ts:732`, `web/order-form.ts:520`; `OrderDto.bookerPartyId/bookerName`, `orders/repository.ts:75-76,162-163`) | trả tên hồ sơ cho mọi người xem được đơn — kể cả Đối tác, Thực tập | người không có `party.view`: không trả id / tên hồ sơ, chỉ cờ "đã gắn hồ sơ"; hiện bản chụp tên khách tự gõ (B2 Đ3b) |
| **Lịch sử đơn** (nhật ký "gắn hồ sơ khách “{tên}”", `src/shared/booker.ts:62-67`, `orders/repository.ts:918`) | kèm tên hồ sơ | khi dùng lại hồ sơ có sẵn: câu không kèm tên (B2 Đ3b) |
| **Ô chọn người đặt** cho văn phòng | danh sách trùng + "Dùng hồ sơ này" / "Tạo hồ sơ mới" | **bỏ** "Tạo hồ sơ mới" khi danh sách trùng không rỗng (máy chủ 409 nếu cố gửi) |

## (4) Cặp lệnh trên cùng đối tượng: độc lập / loại trừ / có thứ tự

**Đối tượng: một suất trên chuyến đang chạy (B1).**

| Cặp lệnh | Quan hệ | Ai canh |
|---|---|---|
| Lệnh suất của tài xế (Đã đón / Vắng / Khách huỷ / Đã trả) × Điều chỉnh của văn phòng, cùng lúc | **loại trừ** theo phiên bản — người sau 409 `stale`, tải lại thấy kết quả mới | cổng phiên bản của lô (`chayLo`) |
| Điều chỉnh × lệnh suất tiếp theo trên **suất mới** | **có thứ tự** — suất cũ đã đóng, mọi lệnh sau đi trên suất mới | LC-04 `close_once` + LC-07 |
| Điều chỉnh × Điều chỉnh (sửa lần hai) | **có thứ tự** — mỗi lần đóng suất hiện hành, mở suất kế tiếp (chuỗi `corrects_allocation_id`) | trigger LC-15 ngoại lệ đòi suất vừa đóng `CORRECTED` |
| Điều chỉnh × Kết thúc chuyến | **có thứ tự** — kết thúc đòi mọi suất đã xong (LC-16); điều chỉnh về "Còn trên xe" chỉ khi điểm xuống chưa `DONE` | B1 Đ2.4 + LC-16 |
| Điều chỉnh × Kết thúc gián đoạn | **có thứ tự** — sau gián đoạn chuyến đóng băng (LC-06), không điều chỉnh được | LC-06 |

**Đối tượng: một chuyến vừa xuất bến (B1).**

| Cặp lệnh | Quan hệ | Ai canh |
|---|---|---|
| Thu hồi xuất bến × bất kỳ lệnh tiến độ ("Đã tới", lệnh suất, đổi thứ tự) | **loại trừ** — có tiến độ thì không thu hồi; đã thu hồi thì chuyến `PLANNED`, lệnh tiến độ 409 "chưa xuất bến" | máy chủ + trigger LC-07 chuyến (đếm sự kiện tiến độ sau `DEPARTED`) |
| Thu hồi × Xuất bến lại | **có thứ tự** — xuất bến lại muộn hơn thu hồi, bản chụp mới | `vc_trip_departed_after_plan` |
| Thu hồi × Xuất bến chuyến khác cùng xe / tài xế | **có thứ tự** — chỉ sau thu hồi xe/tài xế mới rảnh | chỉ mục một chuyến đang chạy |

**Đối tượng: một số điện thoại khách (B2).**

| Cặp lệnh | Quan hệ | Ai canh |
|---|---|---|
| Lập đơn (người A, SĐT X) × Lập đơn (người B, SĐT X), cùng lúc, chưa có hồ sơ X | **loại trừ** cho việc **tạo** hồ sơ — chỉ một lô tạo; lô kia chạy lại nhánh "dùng lại" | B2 Đ5 (câu chèn có điều kiện + `changes()`) |
| Lập đơn (SĐT X) × Gộp hồ sơ (ADR-0068) có hồ sơ X | **có thứ tự** — tra trùng bỏ hồ sơ đã gộp (`merged_into_id`), dùng hồ sơ đích | `findPartiesByPhone` (đã lọc gộp, ADR-0068 Đ7) + lọc hồ sơ đang hoạt động (mới) |
| Lập đơn (SĐT X) × Ngưng hồ sơ X | **có thứ tự** — hồ sơ đã ngưng không được dùng lại; nếu chỉ còn hồ sơ ngưng cùng số ⇒ xem như 0 ⇒ tạo mới | B2 Đ2 (chỉ hồ sơ đang hoạt động); trường hợp này **không** đếm là vi phạm `R-PTY-7` (chỉ đếm cặp cùng đang hoạt động) |
| Lập đơn (SĐT X) × Danh bạ thêm SĐT X vào hồ sơ khác | **độc lập hôm nay** — Danh bạ không chặn trùng; thành **loại trừ** nếu chủ chọn Q-98-1 (A) | — / B2 Q-98-1 |

## Loại cửa

- B1: luật hai chiều (gỡ được bằng migration); sự kiện và dòng ghi chỉ-thêm (một chiều về dữ liệu); thêm vào danh sách tin chuyến đóng là cửa một chiều theo ADR-0052. Việc lớn (dữ liệu) — người kiểm độc lập khi thi công (V3-B).
- B2: hai chiều. Việc lớn (dữ liệu + quyền xem) — người kiểm độc lập khi thi công (V4).

## Chủ trả lời

Mỗi mục một chữ: **"Duyệt"** hoặc **"Sửa: …"**, và chọn Q-98-1, Q-98-2 (ở cuối B2). Ví dụ: "B1 Duyệt, B2 Duyệt, Q-98-1 A, Q-98-2 B".
