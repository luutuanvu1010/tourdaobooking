# Lệnh "Sửa thông tin chuyến" của đơn (`PUT /api/orders/:id/trip`) chưa báo cho xe — một quyết định, hai ý

> **Hồ sơ có ngày 2026-10-08, vai soạn.** **Lượt 8c, tệp 03.** Một quyết định gộp hai ý cùng route: G8 (sổ `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md:24`) và A3 V3 MQ-07 (`:72`). Mọi `tệp:dòng` đo trên `luot-duyet-8c` @ `b8927c27`. Phương án (a) sửa ADR-0104 Đ2.4 (đã duyệt), nên nếu chọn (a) thì cần một ADR ngắn **số tạm 0111** (`git log --all -S "ADR-0111"` không gặp gì).

## Cho chủ dự án

Trên trang đơn có bảng "Sửa thông tin chuyến". Bảng này đổi được ngày đi của dịch vụ, và kéo theo ngày đón của mọi chặng đưa đón trong dịch vụ đó. Nó cũng bỏ được chặng đón chiều đi nếu người sửa xoá cả giờ lẫn nơi đón. Bán hàng (đơn mình lập hoặc phụ trách), Quản trị và Toàn quyền dùng được bảng này, cả khi đơn đã xác nhận và khách đã được xếp lên xe. Hôm nay bảng này có hai chỗ hở.

**Ý 1 — bỏ chặng mà ghế trên xe vẫn còn.** Theo quyết định "Đồng bộ chuyến theo đơn" bạn duyệt ngày 8/10, khi đơn bỏ một chặng thì máy tự trả ghế trên xe chưa chạy. Nhưng danh sách lệnh được máy đồng bộ lại không có bảng này, vì lúc soạn quyết định đó, bảng này bị xếp vào nhóm chỉ đổi giờ, nơi. Thật ra nó bỏ được chặng (người điều phối đã đọc mã xác nhận, tôi đọc lại cũng thấy vậy). Hệ quả là ghế của chặng đã bỏ vẫn nằm trên xe, chuyến bị giữ "có chặng đã bỏ còn khách", cho tới khi người xếp xe bấm "Cập nhật khách theo đơn". Khi đợt "Đồng bộ chuyến theo đơn" thi công xong, nút "Bỏ chặng" sẽ trả ghế ngay, còn bảng này thì không. Hai nút làm cùng một việc mà cho hai kết quả khác nhau.

**Ý 2 — đổi ngày mà tài xế không được báo.** Khi văn phòng sửa giờ đón ở từng chặng, tài xế đang lái chuyến đó nhận tin "Văn phòng vừa đổi giờ đón… mở để xem". Nhưng nếu đổi ngày qua bảng "Sửa thông tin chuyến" thì tài xế không nhận gì, dù giờ hẹn của khách đã đổi thật. Chuyến vẫn bị giữ để người xếp xe xử lý, nên văn phòng biết, chỉ tài xế là không biết.

Có ba cách:
1. **Máy trả ghế khi bỏ chặng và báo tài xế khi đổi ngày (khuyến nghị).** Được: bảng này làm giống hệt các nút sửa chặng khác, và tài xế luôn biết giờ hẹn đổi. Mất: mỗi lần lưu bảng này máy ghi thêm vài dòng về chuyến xe trong cùng một lần lưu, và phải viết thêm bài kiểm. Không mở thêm quyền cho ai, vì mọi người dùng được bảng này đều đã có quyền xếp xe.
2. **Chỉ báo tài xế; ghế để người xếp xe tự gỡ.** Được: ít việc hơn, giữ đúng chữ quyết định 8/10. Mất: hai nút bỏ chặng vẫn cho hai kết quả khác nhau.
3. **Giữ nguyên cả hai.** Được: không làm gì. Mất: tài xế có thể tới đón theo giờ cũ cho tới khi văn phòng gỡ khách khỏi chuyến.

**Về thời điểm.** Cách 1 nên quyết ngay bây giờ. Phần trả ghế làm chung với đợt thi công "Đồng bộ chuyến theo đơn" sắp bắt đầu, và chỉ thêm một dòng vào thay đổi cơ sở dữ liệu mà đợt đó sẽ viết. Nếu quyết sau khi đợt đó đã lên bản chạy thật, sẽ phải có thêm một lần đổi cơ sở dữ liệu nữa. Phần báo tài xế không phụ thuộc đợt đó, làm lúc nào cũng được.

**Một điều tôi nói thẳng:** ý 2 có lẽ không cần hỏi bạn. Quyết định về tin báo cho chuyến (ADR-0052, đã duyệt 30/9) ghi rằng tài xế được báo khi "giờ hẹn chặng đổi khi đã xếp", và không giới hạn đổi qua nút nào. Đọc như vậy thì mã đang thiếu, và việc đúng là sửa mã. Tôi vẫn để ý 2 trong câu hỏi, vì chữ quyết định cũ có ghi kèm tên một loại nhật ký cụ thể, và người làm trước đã đọc hẹp theo tên đó.

**Câu duyệt gợi ý:** "Bảng Sửa thông tin chuyến: bỏ chặng thì máy trả ghế như nút Bỏ chặng; đổi ngày hoặc giờ đón của chặng đã xếp thì báo tài xế như sửa chặng. Ghi thành ADR-0111."

---

## Phần kỹ thuật

### 1. Mã hôm nay
- Route `PUT /api/orders/:id/trip` (`src/modules/orders/index.ts:866-904`): hỏi `can(order.trip.edit, { ownerId, assigned })` (`:871`); lập kế hoạch bằng `keHoachChangTrip`; báo Bảng tin `baoThayDoi({ thayDoi: "chuyen" })` (`:902`). Giao diện gọi route này ở `web/trip-sheet.ts:134`.
- `keHoachChangTrip` (`src/modules/orders/service.ts:67-87`): dời chặng theo ngày đi mới (op `update`), trộn giờ / nơi cũ vào chặng chiều đi đầu, thêm chiều đi (op `insert`), và **đóng chiều đi khi giờ + nơi đều rỗng** (op `close`, lý do `NOT_NEEDED`, `:79`).
- `updateTrip` (`src/modules/orders/repository.ts:1263-1297`): một `db.batch` tự chạy; nhật ký **một** dòng `trip_updated` (`:1279`, `target` = đơn); op `close` → `legCloseGuarded` (`:1292`). `legUpdateGuarded` / `legCloseGuarded` chỉ ghi chặng, không ghi dòng nhật ký riêng cho chặng (`src/modules/orders/chang-hanh-khach-repo.ts:247-248`, `:293-294`).
- ADR-0104 Đ2.4 xếp route này vào nhóm "Không cần hook" (`docs/adr/ADR-0104-dieu-chinh-khan-cap-va-dong-bo-chuyen.md:148`). View `v_aud_order_cmd` của Đ2 (`:130`) không có `trip_updated`. Đ2 chưa thi công (sổ `:96`).
- Ghế của chặng đã đóng: lý do giữ `CHANG_DA_DONG` (`src/shared/ly-do-giu.ts:28`; `src/shared/dieu-phoi-kiem.ts:451`, `:456`). Chặng dời sang ngày khác: `GIO_HEN_NGOAI_CHUYEN` (`ly-do-giu.ts:37`).
- **MQ-07:** nguồn tin chỉ là `order_leg_updated` (`HANH_DONG_TIN_GIO_HEN`, `src/shared/tin-chuyen.ts:110`). Cột `leg_id` của `v_aud_order_change` chỉ có giá trị khi hành động là `order_leg_updated` / `order_leg_closed` và `target_id` khác mã đơn (`migrations/0086_aud_order_change.sql:10-15`). Dòng `trip_updated` có `leg_id` NULL, nên route này **không bao giờ** sinh MQ-07.
- ADR-0052 D6.1 (`docs/adr/ADR-0052-dieu-phoi-luot-2-chuyen-diem-va-xe-dang-chay.md:148`): "giờ hẹn chặng đổi khi chặng đang có suất mở (`order_leg_updated`, MQ-07 …)". D6.2 (`:163`): "giờ hẹn chặng đổi khi đã xếp (MQ-07)" → người lập / phụ trách qua `trip.call_ack`, cùng tài xế đang lái.
- **Phần "thay / bỏ chặng" của A3 V3 tự khép khi Đ2 thi công:** route bỏ chặng và thay chặng là điểm gọi hook (`ADR-0104:145-146`); máy đóng suất, ghi `trip_order_synced`, và hành động này vào danh sách tin chuyến (`:170`, `:172`). Chỉ còn `PUT /trip` đóng chặng (G8) là chưa được phủ.

### 2. Ba phương án

| | (a) hook + báo tài xế | (b) chỉ báo tài xế | (c) giữ |
|---|---|---|---|
| Bỏ chặng qua route này | máy đóng suất `REMOVED` trên chuyến `PLANNED` (Đ2.6 (i)); xe đang chạy: câu nhắc Báo huỷ (Đ2.7) | giữ `CHANG_DA_DONG` tới khi bấm nút tay (Đ2.11 gỡ được) | như (b) |
| Đổi ngày / giờ đón chặng đã xếp | máy **không** dời suất (VK1-B giữ nguyên, `ADR-0104:148`); tài xế nhận MQ-07 | tài xế nhận MQ-07 | không ai báo tài xế |
| Đổi ADR đã duyệt | ADR-0104 Đ2.4 (`:148`) và danh sách view Đ2.2 (`:130`) → cần ADR-0111 | không, nếu đọc ADR-0052 D6.2 theo nghĩa (mục 4) | không; nhưng mã còn lệch ADR-0052 D6.2 nếu đọc theo nghĩa → phải ghi `SYSTEM-DESIGN.md` §16 |
| Migration | không thêm tệp: thêm `'trip_updated'` vào danh sách `IN` của migration view mà Đ2 sẽ viết | không | không |
| Quyền | không mở thêm: mọi người giữ `order.trip.edit` (SALES `ownOrAssigned`, ADMIN, SUPER_ADMIN — `src/shared/permissions.ts:80`) đều giữ `trip.dispatch` (`:188`), nên ngoại lệ có tên Đ2.13 không rộng ra | không | không |

### 3. Làm được lúc nào
- **(a), phần hook — phải quyết TRƯỚC khi người thi công Đ2 viết migration `v_aud_order_cmd`.** Lúc đó chỉ cần thêm một giá trị vào danh sách `IN`. Nếu quyết sau khi view đã áp lên D1 thật, phải viết migration mới dựng lại view (luật không sửa migration đã áp). Cùng đợt, `updateTrip` phải đổi sang trả câu chưa chạy kèm `auditId` như `cancelOrder` (Đ2.2, `ADR-0104:137`), và route vào bài tĩnh "mọi route trong danh sách phải gọi hook" (Đ2.4). Đ2 đang chờ Đ1 gộp, nên cửa sổ là bây giờ.
- **(a) và (b), phần báo tài xế — độc lập với Đ2**, làm lúc nào cũng được (A3 đã gộp). Cách gợi ý: `updateTrip` ghi thêm một dòng `order_leg_updated` (`target_id` = id chặng) cho mỗi chặng đã xếp bị đổi ngày hoặc giờ đón, cùng mốc giờ với dòng `trip_updated`. Hộp thư đã gom các dòng cùng (đơn, người làm, mốc giờ) thành một "lô đổi" và trả mỗi người tối đa một tin, MQ-07 xét trước (`src/shared/thong-bao.ts:139-147`, `:174-190`). Cách này không đụng view `0086` và không thêm hành động vào danh sách một chiều D6.1. Khuôn chữ `detail` mà `phanDoiCuaTin` cần để đặt cờ `gioHen` (`src/shared/tin-doi-don.ts:52`): người lập kế hoạch đối chiếu, **chưa kiểm**.

### 4. Ý 2 có cần hỏi chủ không (nói thẳng)
- D6.2 nói theo sự kiện ("giờ hẹn chặng đổi khi đã xếp"), không theo route. `PUT /trip` dời ngày đón của chặng qua `legUpdateGuarded`, đúng là sự kiện đó. Đọc như vậy thì (c) để mã lệch ADR đã duyệt, và việc đúng là sửa mã (CLAUDE.md §2, "tài liệu chuẩn tắc thắng mã").
- Ngược lại, D6.1 ghi tên hành động `order_leg_updated` trong ngoặc, và người thi công A3 đọc hẹp theo tên đó.
- Đề xuất cho điều phối: nếu đồng ý cách đọc rộng thì tự áp ý 2 (ghi sổ), và câu hỏi chỉ còn ý 1 với hai lựa chọn "hook" hoặc "giữ ADR". Câu hỏi soạn sẵn ở tệp 00 vẫn giữ đủ ba phương án theo giao việc.

### 5. Câu ADR bị thay nếu chọn (a) — ADR-0111 (số tạm)
| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ADR-0104 Đ2.4 (`:148`) | "Không cần hook …: … `PUT …/trip` (`:823`), …" | bỏ `PUT …/trip` khỏi nhóm này; thêm vào danh sách điểm gọi `orders` (`:145`): "`PUT …/trip` (đóng chiều đi khi giờ + nơi rỗng — Đ2.6 (i); đổi ngày / giờ vẫn theo VK1-B)" |
| ADR-0104 Đ2.2 (`:130`) | danh sách `IN` của `v_aud_order_cmd` | + `'trip_updated'` |

### 6. Bài kiểm (a)
- Đơn đã xác nhận, chặng chiều đi đã xếp lên chuyến `PLANNED`. Gửi `PUT /trip` xoá giờ + nơi → suất `REMOVED`, sự kiện `ALLOCATION_ORDER_SYNCED`, nhật ký `trip_order_synced` (`staff_id` = người sửa), chuyến không còn `CHANG_DA_DONG`.
- Cùng ca trên chuyến `RUNNING` → không ghi suất; phản hồi có câu nhắc Báo huỷ.
- `PUT /trip` dời ngày → suất giữ nguyên, chuyến giữ `GIO_HEN_NGOAI_CHUYEN`; tài xế đang lái nhận MQ-07, người làm không nhận; người lập nhận đúng một tin.
- Đơn thua cổng `updated_at` → không câu chuyến nào ghi.

### 7. Chưa kiểm
- `validateTripUpdate` (`src/modules/orders/service-rules.ts:316`) cho đổi ngày của đơn đã xác nhận tới đâu (dời ngày quá khứ, ngày đã có chuyến chạy): chưa đọc kỹ.
- Khuôn `detail` của dòng `order_leg_updated` thêm vào (mục 3).
- Đường tài xế đối tác (`DRIVER_PARTNER`) chưa nhận tin chuyến nào tới Đợt 6 (ADR-0052 `:165`); không đổi.
