# Lệnh "Sửa thông tin chuyến" của đơn (`PUT /api/orders/:id/trip`) chưa báo cho xe — hai ý, không còn câu hỏi cho chủ

> **Hồ sơ có ngày 2026-10-08, vai soạn.** **Lượt 8c, tệp 03.** Hai ý cùng route: G8 (sổ `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md:24`) và A3 V3 MQ-07 (`:72`). Mọi `tệp:dòng` đo trên `luot-duyet-8c` @ `b8927c27`. Theo phán quyết của điều phối sau phiếu kiểm độc lập: ý 1 giữ ADR-0104 Đ2.4, không hỏi chủ; ý 2 tự áp theo ADR-0052 D6.2 (mục 4). Chỉ khi chủ vẫn được hỏi và chọn "tự trả ghế" (phương án (a)) mới cần một ADR ngắn sửa ADR-0104 Đ2.4, **số tạm 0111** (`git log --all -S "ADR-0111"` không gặp gì).

## Cho chủ dự án

Trên trang đơn có bảng "Sửa thông tin chuyến". Bảng này đổi được ngày đi của dịch vụ, và kéo theo ngày đón của mọi chặng đưa đón trong dịch vụ đó. Bản mới của bảng không gửi giờ, nơi đón nên không bỏ được chặng. Chỉ máy chưa cập nhật bản mới, hoặc lời gọi thẳng vào máy chủ, mới còn bỏ được chặng qua đường này; đường đó sẽ mất khi Nền tảng ngừng nhận bản cũ. Bán hàng (đơn mình lập hoặc phụ trách), Quản trị và Toàn quyền dùng được bảng này, cả khi đơn đã xác nhận và khách đã được xếp lên xe. Hôm nay bảng này có hai chỗ hở.

**Ý 1 — bản cũ bỏ chặng mà ghế trên xe vẫn còn.** Trên máy chưa cập nhật bản mới, bảng này còn bỏ được chặng đón; khi đó ghế vẫn nằm trên xe và chuyến bị giữ 'có chặng đã bỏ còn khách' cho tới khi người xếp xe gỡ tay (nút 'Cập nhật khách theo đơn' chỉ xử lý chặng đã bỏ sau khi đợt Đồng bộ chuyến thi công). Ở bản mới, bỏ chặng là nút 'Bỏ chặng', và nút này sẽ tự trả ghế.

**Ý 2 — đổi ngày mà tài xế không được báo.** Khi văn phòng sửa giờ đón ở từng chặng, tài xế đang lái chuyến đó nhận tin "Văn phòng vừa đổi giờ đón… mở để xem". Nhưng nếu đổi ngày qua bảng "Sửa thông tin chuyến" thì tài xế không nhận gì, dù giờ hẹn của khách đã đổi thật. Nếu dời từ hai ngày trở lên thì chuyến bị giữ để người xếp xe xử lý, nên văn phòng biết; dời một ngày thì chuyến không bị giữ, chỉ có cảnh báo ở lịch chung. Cả hai trường hợp, tài xế đều không biết.

Với ý 1 có hai cách:
1. **Giữ như đã duyệt (khuyến nghị).** Được: không sửa quyết định 8/10 và không làm thêm việc cho một đường sẽ mất khi Nền tảng ngừng nhận bản cũ. Mất: trong lúc còn người dùng bản cũ, chặng bỏ theo đường này để ghế lại trên xe tới khi người xếp xe gỡ tay.
2. **Tự trả ghế.** Được: bỏ chặng bằng đường nào cũng trả ghế như nhau. Mất: phải sửa quyết định 8/10 (đưa bảng này vào nhóm tự trả ghế), thêm việc và bài kiểm cho một đường sắp bỏ, và phải quyết trước khi đợt Đồng bộ chuyến viết phần cơ sở dữ liệu.

Điều phối không đưa ý 1 vào hộp hỏi, vì cách khuyến nghị không đổi gì so với quyết định 8/10. Chỉ hỏi bạn nếu số lần máy cũ còn gửi bảng này trên bản chạy thật vẫn đáng kể; số đó phải đọc từ cơ sở dữ liệu thật, nên do bạn tự chạy.

**Về thời điểm.** Không còn gấp. Chỉ khi chọn 'tự trả ghế' mới phải quyết trước khi đợt Đồng bộ chuyến viết migration view.

**Ý 2 không cần bạn chọn.** Quyết định về tin báo cho chuyến (ADR-0052, đã duyệt 30/9) ghi rằng tài xế được báo khi "giờ hẹn chặng đổi khi đã xếp", và không giới hạn đổi qua nút nào. Vì vậy đây là chỗ mã làm thiếu so với quyết định đó; việc đúng là sửa mã cho khớp, không đổi chữ quyết định nào. Tài xế sẽ được báo khi văn phòng đổi ngày đi, theo quyết định ngày 30/9.

**Không có câu duyệt cho tệp này.** Ý 1 giữ ADR-0104 Đ2.4 (đường thân cũ mất khi Nền tảng ngừng nhận bản cũ, ADR-0047 §6); ý 2 điều phối tự áp theo ADR-0052 D6.2 với các điều kiện ở mục 4. Nếu chủ vẫn được hỏi ý 1, dùng nguyên văn câu 3 ở mục 4 phiếu tổng hợp ("Giữ như đã duyệt (Recommended)" / "Tự trả ghế"); chọn "Tự trả ghế" thì câu duyệt là: "Bảng Sửa thông tin chuyến: bỏ chặng thì máy trả ghế như nút Bỏ chặng. Ghi thành ADR-0111."

---

## Phần kỹ thuật

### 1. Mã hôm nay
- Route `PUT /api/orders/:id/trip` (`src/modules/orders/index.ts:866-904`): hỏi `can(order.trip.edit, { ownerId, assigned })` (`:871`); lập kế hoạch bằng `keHoachChangTrip`; báo Bảng tin `baoThayDoi({ thayDoi: "chuyen" })` (`:902`). Giao diện gọi route này ở `web/trip-sheet.ts:134`.
- `keHoachChangTrip` (`src/modules/orders/service.ts:67-87`): dời chặng theo ngày đi mới (op `update`), trộn giờ / nơi cũ vào chặng chiều đi đầu, thêm chiều đi (op `insert`), và **đóng chiều đi khi giờ + nơi đều rỗng** (op `close`, lý do `NOT_NEEDED`, `:79`) (chỉ khi thân có khoá `pickupTime`/`pickupPlace` — `chang-dua-don.ts:335`, `:339`; bảng hiện nay bỏ hai khoá, `trip-form.ts:111-120`; thân cũ đếm ở `orders/index.ts:876`; `CAU_CAP_NHAT_APP` chưa dùng).
- `updateTrip` (`src/modules/orders/repository.ts:1263-1297`): một `db.batch` tự chạy; nhật ký **một** dòng `trip_updated` (`:1279`, `target` = đơn); op `close` → `legCloseGuarded` (`:1292`). `legUpdateGuarded` / `legCloseGuarded` chỉ ghi chặng, không ghi dòng nhật ký riêng cho chặng (`src/modules/orders/chang-hanh-khach-repo.ts:247-248`, `:293-294`).
- ADR-0104 Đ2.4 xếp route này vào nhóm "Không cần hook" (`docs/adr/ADR-0104-dieu-chinh-khan-cap-va-dong-bo-chuyen.md:148`). View `v_aud_order_cmd` của Đ2 (`:130`) không có `trip_updated`. Đ2 chưa thi công (sổ `:96`).
- Ghế của chặng đã đóng: lý do giữ `CHANG_DA_DONG` (`src/shared/ly-do-giu.ts:28`; `src/shared/dieu-phoi-kiem.ts:451`, `:456`). Chặng dời sang ngày khác: `GIO_HEN_NGOAI_CHUYEN` (`ly-do-giu.ts:37`), chỉ khi dời từ 2 ngày trở lên; dời ±1 ngày thì chặng vẫn trong khoảng đọc (`src/modules/van-chuyen/dieu-phoi-doc.ts:130-131`), chỉ có cảnh báo ở lịch chung.
- **MQ-07:** nguồn tin chỉ là `order_leg_updated` (`HANH_DONG_TIN_GIO_HEN`, `src/shared/tin-chuyen.ts:110`). Cột `leg_id` của `v_aud_order_change` chỉ có giá trị khi hành động là `order_leg_updated` / `order_leg_closed` và `target_id` khác mã đơn (`migrations/0086_aud_order_change.sql:10-15`). Dòng `trip_updated` có `leg_id` NULL, nên route này **không bao giờ** sinh MQ-07.
- ADR-0052 D6.1 (`docs/adr/ADR-0052-dieu-phoi-luot-2-chuyen-diem-va-xe-dang-chay.md:148`): "giờ hẹn chặng đổi khi chặng đang có suất mở (`order_leg_updated`, MQ-07 …)". D6.2 (`:163`): "giờ hẹn chặng đổi khi đã xếp (MQ-07)" → người lập / phụ trách qua `trip.call_ack`, cùng tài xế đang lái.
- **Phần "thay / bỏ chặng" của A3 V3 tự khép khi Đ2 thi công:** route bỏ chặng và thay chặng là điểm gọi hook (`ADR-0104:145-146`); máy đóng suất, ghi `trip_order_synced`, và hành động này vào danh sách tin chuyến (`:170`, `:172`). Chỉ còn `PUT /trip` đóng chặng (G8) là chưa được phủ.

### 2. Ba phương án

| | (a) hook + báo tài xế | (b) chỉ báo tài xế | (c) giữ |
|---|---|---|---|
| Bỏ chặng qua route này (chỉ thân cũ) | máy đóng suất `REMOVED` trên chuyến `PLANNED` (Đ2.6 (i)); xe đang chạy: câu nhắc Báo huỷ (Đ2.7) | giữ `CHANG_DA_DONG` tới khi bấm nút tay (Đ2.11 gỡ được) | như (b) |
| Đổi ngày / giờ đón chặng đã xếp | máy **không** dời suất (VK1-B giữ nguyên, `ADR-0104:148`); tài xế nhận MQ-07 | tài xế nhận MQ-07 | không ai báo tài xế |
| Đổi ADR đã duyệt | ADR-0104 Đ2.4 (`:148`) và danh sách view Đ2.2 (`:130`) → cần ADR-0111 | không, nếu đọc ADR-0052 D6.2 theo nghĩa (mục 4) | không; nhưng mã còn lệch ADR-0052 D6.2 nếu đọc theo nghĩa → phải ghi `SYSTEM-DESIGN.md` §16 |
| Migration | không thêm tệp: thêm `'trip_updated'` vào danh sách `IN` của migration view mà Đ2 sẽ viết | không | không |
| Quyền | không mở thêm: mọi người giữ `order.trip.edit` (SALES `ownOrAssigned`, ADMIN, SUPER_ADMIN — `src/shared/permissions.ts:80`) đều giữ `trip.dispatch` (`:188`), nên ngoại lệ có tên Đ2.13 không rộng ra | không | không |

Sau phán quyết của điều phối: phần báo tài xế tự áp (mục 4), nên (c) không còn là lựa chọn; khuyến nghị là (b) — giữ ADR-0104 Đ2.4 cho phần bỏ chặng.

### 3. Làm được lúc nào
- **(a), phần hook — phải quyết TRƯỚC khi người thi công Đ2 viết migration `v_aud_order_cmd`.** Lúc đó chỉ cần thêm một giá trị vào danh sách `IN`. Nếu quyết sau khi view đã áp lên D1 thật, phải viết migration mới dựng lại view (luật không sửa migration đã áp). Cùng đợt, `updateTrip` phải đổi sang trả câu chưa chạy kèm `auditId` như `cancelOrder` (Đ2.2, `ADR-0104:137`), và route vào bài tĩnh "mọi route trong danh sách phải gọi hook" (Đ2.4). Đ2 đang chờ Đ1 gộp, nên cửa sổ là bây giờ.
- **Phần báo tài xế (tự áp, mục 4) — độc lập với Đ2**, làm lúc nào cũng được (A3 đã gộp). Cách gợi ý: `updateTrip` ghi thêm một dòng `order_leg_updated` (`target_id` = id chặng, khuôn `detail` chặng có nhãn ngày/giờ đón mà `phanDoiCuaTin` đọc) cho **mỗi chặng bị đổi ngày hoặc giờ đón**, cùng mốc giờ với `trip_updated`; phía đọc (`ganChuyenCuaChang`) tự lọc chặng có suất mở — `orders` không đọc trạng thái xếp. Cách này phủ hộp thư. Gõ cửa màn hình khoá đi qua `dayGoCuaDoi`, mà `doiVuaGhi` chỉ đọc một dòng (`thongbao/repository.ts:39-41`, `LIMIT 1`, thứ tự phụ `e.id`), nên phải sửa kèm để ưu tiên / đọc mọi dòng `order_leg_updated` của request, có bài kiểm 'tài xế đang lái được gõ cửa'. Hộp thư đã gom các dòng cùng (đơn, người làm, mốc giờ) thành một "lô đổi" và trả mỗi người tối đa một tin, MQ-07 xét trước (`src/shared/thong-bao.ts:139-147`, `:174-190`). Cách này không đụng view `0086` và không thêm hành động vào danh sách một chiều D6.1. Khuôn chữ `detail` mà `phanDoiCuaTin` cần để đặt cờ `gioHen` (`src/shared/tin-doi-don.ts:52`): người lập kế hoạch đối chiếu, **chưa kiểm**.

### 4. Ý 2: tự áp theo ADR-0052 D6.2, không hỏi chủ (phán quyết điều phối, phiếu tổng hợp mục 3)
- D6.2 nói theo sự kiện ("giờ hẹn chặng đổi khi đã xếp"), không theo route. `PUT /trip` dời ngày đón của chặng qua `legUpdateGuarded`, đúng là sự kiện đó. Để nguyên thì mã lệch ADR đã duyệt, và việc đúng là sửa mã (CLAUDE.md §2, "tài liệu chuẩn tắc thắng mã"). Cách sửa dưới đây không đổi chữ ADR nào.
- D6.1 ghi tên hành động `order_leg_updated` trong danh sách một chiều; dùng đúng tên này thoả cả cách đọc hẹp (người thi công A3) lẫn cách đọc rộng.
- Điều kiện khi tự áp:
  1. Ghi `order_leg_updated` (`target_id` = chặng) cho **mỗi chặng bị đổi ngày/giờ**, trong cùng lô `updateTrip`, cùng mốc giờ. **Không** thêm `trip_updated` vào `HANH_DONG_TIN_GIO_HEN` (`tin-chuyen.ts:110`), vì việc đó là mở danh sách một chiều và cần ADR (tiền lệ ADR-0097, ADR-0104 Đ2.10).
  2. Chốt khuôn `detail` trong kế hoạch, theo đúng khuôn chặng mà `phanDoiCuaTin` đọc (tiền tố chiều + nhãn ngày/giờ đón), vì `detail` là hợp đồng với ADR-0062. Có bài kiểm `gioHen === true` cho ca chỉ đổi ngày.
  3. Sửa đường gõ cửa (`doiVuaGhi` LIMIT 1 → `dayGoCuaDoi`, `thongbao/index.ts:85`) để không bỏ sót dòng chặng. Bài kiểm cho ba điều: tài xế đang lái được gõ cửa, người làm không nhận, người lập nhận đúng một tin.
  4. Kiểm trần số câu mỗi `db.batch` của `updateTrip` sau khi thêm dòng.
  5. Việc lớn (chạm dữ liệu nhật ký chỉ-thêm): điều phối ghi sổ thi công "V3 của A3: sửa mã cho khớp ADR-0052 D6.2, không đổi chữ ADR". Kế hoạch đi đỏ → xanh, có người kiểm độc lập chỉ-đọc, chạy cả e2e.
  6. Báo cáo cuối lượt cho chủ nói một câu: "tài xế sẽ được báo khi văn phòng đổi ngày đi, theo quyết định ngày 30/9".

### 5. Câu ADR bị thay nếu chủ được hỏi và chọn (a) "tự trả ghế" — ADR-0111 (số tạm)
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
