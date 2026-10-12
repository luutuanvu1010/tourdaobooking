# Trang ghép — lượt duyệt 8c (2026-10-08)

> **Hồ sơ có ngày 2026-10-08, vai soạn.** Bắt buộc theo `CLAUDE.md` §9 ("bước ghép khi duyệt"), vì lượt có hai quyết định chạm tiền hoặc luật dữ liệu, cộng một việc tự áp chạm dữ liệu nhật ký — dưới trần 3. Trang này ghép ba văn bản cùng thư mục:
> - `01-de-xuat-adr-0109-tong-tien-am.md` — ADR-0109, phải thu của đơn không dưới 0;
> - `02-hai-cho-ma-lech-adr-0096.md` — giữ mã hay sửa mã ở hai chỗ lệch ADR-0096 (nếu giữ: ADR-0110, số tạm);
> - `03-sua-thong-tin-chuyen-chua-bao-xe.md` — `PUT /api/orders/:id/trip` chưa trả ghế, chưa báo tài xế (không hỏi chủ: giữ ADR-0104 Đ2.4; báo tài xế tự áp theo ADR-0052 D6.2).
>
> Mọi `tệp:dòng` đo trên `luot-duyet-8c` @ `b8927c27`. Số 0110, 0111 là số tạm, chốt khi gộp.

## Cho chủ dự án

Lượt này có hai quyết định. Quyết định thứ nhất đụng tiền: đơn bớt khách tới mức tiền dịch vụ nhỏ hơn giảm giá thì phải thu tính bằng 0, để Kế toán hoàn đúng tiền khách đã trả và đơn lên "Đã giao" được. Quyết định thứ hai không đổi gì trong mã, chỉ ghi thành luật hai chỗ mã đang làm khác chữ quyết định về thứ tự điểm dừng. Việc thứ ba không cần bạn chọn: bảng 'Sửa thông tin chuyến' đổi ngày đi mà chưa báo tài xế. Đây là chỗ Nền tảng làm thiếu so với quyết định về tin báo ngày 30/9, nên tôi sửa theo quyết định đó. Còn việc bỏ chặng qua bảng này chỉ còn ở máy chưa cập nhật bản mới, nên tôi giữ như quyết định 8/10.

Ghép ba việc lại, tôi không thấy lỗ mới, và không ai được thêm quyền. Có ba điều bạn nên biết:
1. **Một con số dùng ở nhiều màn.** Quyết định thứ nhất đổi con số "phải thu" mà trang đơn, biên nhận gửi khách, doanh thu tuần trên Trang chủ và sổ tiền cùng dùng. Chỉ đơn đang âm mới đổi số, nhưng nút "Đã giao" của các đơn đó sẽ mở lại được sau khi hoàn tiền.
2. **Câu cảnh báo phải đổi điều kiện hiện.** Hôm nay câu cảnh báo trên trang đơn hiện khi tổng tiền âm. Sau quyết định thứ nhất, tổng không còn âm, nên nếu giữ điều kiện cũ thì câu này sẽ lặng lẽ biến mất. Vì vậy điều kiện mới là "giảm giá lớn hơn tiền dịch vụ".
3. **Đơn của đại lý chịu phần giảm giá thực dùng.** Phần sổ hoa hồng của đại lý đã duyệt nhưng chưa làm. Theo quyết định thứ nhất, với đơn đại lý bị bớt khách tới mức tổng âm, đại lý nợ công ty phần giảm giá thực dùng chứ không phải toàn bộ số giảm giá đã cho, nếu không thì sổ không cân. Hôm nay chưa có số nào đổi.

Người kiểm đã chạy thử cách khuyến nghị trên bản sao của mã; chưa ai xem bản chạy thật có bao nhiêu đơn tổng âm.

## Hai câu hỏi cho chủ (chép thẳng vào hộp hỏi; phương án khuyến nghị đứng đầu)

**Câu 1**
- Tiêu đề: `Tổng âm`
- Câu hỏi: Khi văn phòng bớt khách, tiền dịch vụ có thể còn nhỏ hơn số giảm giá đã cho: ví dụ đơn 2 người, mỗi người 500.000, giảm giá 800.000, khách đã trả 200.000, bớt còn 1 người thì tổng tiền thành âm 300.000. Hôm nay đơn như vậy bị kẹt, vì Kế toán hoàn hết 200.000 mà Nền tảng vẫn báo khách còn dư 300.000, nên không bấm được "Đã giao". Hai cách sửa đều phải đổi chữ hai quyết định bạn đã duyệt: quyết định sửa số khách ngày 8/10 (đoạn nói tổng âm thì khách được ghi dư nhiều hơn số đã trả) và quyết định sổ đại lý ngày 1/10 (đoạn nói đại lý chịu đúng số giảm giá đã cho; phần này chưa làm nên hôm nay chưa có số nào đổi). Bạn muốn Nền tảng tính tiền khách phải trả thế nào?
- Phương án 1, nhãn `Phải thu không âm (Recommended)`. Mô tả: Được: đơn gỡ được bằng một lần hoàn (ở ví dụ người khách còn lại không phải trả gì, Kế toán hoàn đủ 200.000), giảm giá vẫn lưu 800.000, trang đơn vẫn cảnh báo, và đơn không âm không đổi đồng nào; mất: 300.000 giảm giá vượt coi như bỏ, biên nhận gửi khách ghi giảm giá 500.000 thay vì 800.000, và với đơn đại lý thì đại lý chịu 500.000 chứ không phải 800.000.
- Phương án 2, nhãn `Giảm giá theo số khách`. Mô tả: Được: khách vẫn trả một phần (ở ví dụ giảm giá co còn 400.000, khách trả 100.000 và được hoàn 100.000); mất: tiền của mọi đơn có giảm giá từng sửa số khách đều đổi, kể cả đơn cũ và đơn đã giao (khối thanh toán của đơn đã giao sẽ lệch số đã chốt), phải thêm luật làm tròn, và trái thêm câu "giảm giá giữ nguyên" bạn duyệt ngày 8/10.
- Phương án 3, nhãn `Giữ như hôm nay`. Mô tả: Được: không đổi gì và không sửa quyết định nào; mất: đơn tổng âm kẹt mãi không lên "Đã giao", và cách gỡ duy nhất là tăng số khách trở lại, tức ghi sai thực tế.

**Câu 2**
- Tiêu đề: `Thứ tự điểm`
- Câu hỏi: Quyết định ngày 3/10 về thứ tự điểm đón, điểm trả có hai chỗ Nền tảng đang làm khác chữ. Chỗ thứ nhất: chữ ghi lần đổi thứ tự nào làm sai luật cũng bị từ chối, còn Nền tảng chỉ từ chối lần đổi tạo ra chỗ sai mới, nên chuyến đã sai từ trước vẫn sửa dần được bằng nút lên/xuống. Chỗ thứ hai: chữ ghi nút lên/xuống của chuyến chưa chạy là một lệnh riêng, còn Nền tảng dùng lại lệnh "Sửa chuyến" có sẵn. Hai cách đầu đều phải ghi một quyết định mới sửa chữ ngày 3/10; bạn chọn cách nào?
- Phương án 1, nhãn `Giữ cách đang làm (Recommended)`. Mô tả: Được: không chuyến nào kẹt vì thứ tự, không phải làm thêm gì, và chuyến chưa chạy vẫn không xuất bến được khi còn chỗ sai; mất: chuyến đang chạy mà sai từ trước chỉ bị phát hiện qua lượt kiểm tra định kỳ chứ không bị chặn, và hai điều mới đọc mã chưa chạy thử là tài xế đã được xếp sẽ nhận một tin "chuyến vừa sửa" sau mỗi lần bấm, còn một lần bấm có thể bị từ chối vì lỗi khác của chuyến như trùng giờ hay giấy tờ tài xế.
- Phương án 2, nhãn `Lệnh riêng cho nút`. Mô tả: Được: vẫn sửa dần được, nhật ký ghi đúng "đổi thứ tự" và nút không vướng lỗi khác của chuyến; mất: phải làm thêm một lệnh mới cùng các bài kiểm, và chỗ thứ nhất vẫn cần quyết định mới sửa chữ.
- Phương án 3, nhãn `Sửa theo đúng chữ`. Mô tả: Được: Nền tảng khớp từng chữ quyết định 3/10 và không cần quyết định mới; mất: chuyến nào mà một lần bấm không sửa hết chỗ sai sẽ kẹt, kể cả chuyến chỉ có một chỗ sai khi điểm đón và điểm trả của khách đó không đứng cạnh nhau, nên phải làm thêm nút "Sắp lại tự động" hoặc kéo-thả trên màn hình và một lệnh riêng cho nút lên/xuống.

## Ghi chú cho điều phối (không dán vào hộp hỏi)

- Phần "báo tài xế khi đổi ngày" của bảng "Sửa thông tin chuyến" là mã thiếu so với ADR-0052 D6.2 đã duyệt, nên tự áp theo ADR-0052 D6.2, kèm điều kiện ở mục 3 phiếu tổng hợp (chép ở tệp 03 §4).
- Câu 3 (Sửa chuyến) đã bỏ khỏi hộp: giữ ADR-0104 Đ2.4; đường thân cũ mất khi Nền tảng ngừng nhận bản cũ (ADR-0047 §6).
- Chỉ hỏi lại câu 3 nếu chủ chạy lệnh đếm dòng `client_outdated_body` loại `sua_chuyen` gần đây và thấy còn đáng kể (lệnh đọc D1 remote, chủ tự chạy). Khi đó dùng nguyên văn câu 3 ở mục 4 phiếu tổng hợp.

---

## Phần kỹ thuật

### 1. Đếm quyết định (trần 3 — `CLAUDE.md` §9)

| # | Quyết định | Chạm | Tệp |
|---|---|---|---|
| 1 | ADR-0109 — phải thu ≥ 0, một hàm | tiền (số dẫn xuất), nghĩa cổng hoàn / Đã giao; không ghi bảng mới | 01 |
| 2 | ADR-0110 (tạm) — đọc lại ADR-0096 Đ1.3b, Đ1.3c | luật dữ liệu chuyến (LC-19), không đổi mã | 02 |
| 3 | **Không phải quyết định trình chủ.** `PUT /trip`: bỏ chặng giữ ADR-0104 Đ2.4 (G8 đóng); báo tài xế khi đổi ngày tự áp theo ADR-0052 D6.2 (tệp 03 §4) | dữ liệu nhật ký (dòng `order_leg_updated` mới, target = chặng); không đổi chữ ADR | 03 |

Lượt còn hai quyết định trình chủ (#1, #2), dưới trần 3. Ở các bảng dưới, "#3 (a)" là phương án "tự trả ghế" không được chọn (giữ lại để đối chiếu nếu chủ vẫn được hỏi); "#3 tin" là phần tự áp.

### 2. Bảng bị chạm và loại thực thể chứa trong đó

| Bảng (module chủ) | Chứa loại nào | #1 | #2 | #3 |
|---|---|---|---|---|
| `orders` (orders) | đơn khách lẻ do Bán hàng lập, đơn của Đối tác (đại lý, có người hưởng), đơn Thực tập lập; nháp / xác nhận / huỷ / đã giao / hoàn thành | đọc `subtotal`, `discount`, `total` (khoá sau xác nhận, `migrations/0081_khoa_tien_don_xac_nhan.sql:20-22`) | — | cổng `updated_at` như hôm nay |
| `order_money_adjustment` (orders, `0021:5-13`) | điều chỉnh số khách sau xác nhận của mọi loại đơn, do văn phòng hoặc HDV ghi | đọc; không ghi mới | — | — |
| `order_service`, `order_item` (orders) | dịch vụ và dòng tiền của đơn | đọc (tạm tính) | — | ghi ngày đi như hôm nay |
| `ord_transfer_leg` (orders, `0034:7`) | chặng đưa đón của dịch vụ | — | — | đóng chặng `NOT_NEEDED` như hôm nay; nay kéo theo máy đóng suất (a) |
| `bil_payment_receipt` (billing, `0045:66`) | lần thu của khách, lần trả lại khách; người thu: công ty, nhân viên, chưa rõ (cọc cũ) | trần hoàn ≤ đã thu không đổi; số dư chờ hoàn nhỏ lại | — | — |
| `bil_posting` (billing, `0045:93`) | phiếu Đã giao (`due_snapshot ≥ 0`, `:103`), Hoàn thành, hoàn, quyết toán, đảo, điều chỉnh | phiếu Đã giao của đơn tổng âm ghi được với `due_snapshot` = 0 | — | — |
| `bil_debt_line` (billing, `0045:116`) | nợ giữa công ty và người giữ tiền (nhân viên, đại lý…) | luật không đổi; chỉ dòng hoàn khách như mọi lần hoàn | — | — |
| `vc_trip_stop` (van-chuyen, `0042:87`) | điểm đón / trả; `place_text` có thể là **nhà riêng khách** | — | `seq` đổi qua `PUT /chuyen/:id` như hôm nay | máy bỏ điểm hết khách (Đ2.6) |
| `vc_trip_allocation` (van-chuyen, `0042:121`) | suất `PASSENGER` (khách của chặng thuộc mọi loại đơn) và suất `CREW` (người đi kèm) | — | đọc suất `WAITING` để xét đảo | máy đóng suất `PASSENGER` của chặng vừa đóng, chỉ chuyến `PLANNED`; không đụng `CREW` |
| `vc_trip_event` (van-chuyen, `0042:153`) | sự kiện chuyến | — | `UPDATED` khi ↑ ↓ chuyến kế hoạch | `ALLOCATION_ORDER_SYNCED` (Đ2) |
| `audit_log` (audit) qua view | nhật ký | — | `trip_edited` | `trip_updated` vào `v_aud_order_cmd` (Đ2, chưa tạo); dòng `order_leg_updated` mới (target = chặng), chỉ `thongbao` đọc qua `v_aud_order_change` (`0086:10-15`, có `detail`) |
| tin chuyến (thongbao, không bảng mới) | tin tới tài xế `DRIVER` đang lái, người lập / phụ trách văn phòng | — | — | thêm nguồn MQ-07 |

### 3. Dòng bản đồ quyền chạm các bảng trên

Thứ tự giá trị: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR.

| Ô (`src/shared/permissions.ts`) | Giá trị | Đổi | Áp cho |
|---|---|---|---|
| `order.money.edit` `:95` | own, any, any, assigned, none, any, none, none, none, none | không | #1: kết quả tiền sau khi sửa (≥ 0) ở cả route văn phòng lẫn route HDV |
| `money.view` `:75` | any, any, any, assigned, own, any, own, none, none, none | không | #1: phải thu / dư hiển thị đổi trên đơn tổng âm, kể cả Đối tác, Thực tập xem đơn mình |
| `payment.refund` `:108` | none, any, none, none, none, any, none, none, none, none | không | #1: trần hoàn không đổi; nay hoàn đủ được để dư về 0 |
| `order.handover` `:117` | none, none, any, assigned, none, any, none, none, none, none | không | #1: "Đã giao" mở được cho đơn tổng âm sau khi hoàn |
| `order.complete` `:119` | none, any, none, none, none, any, none, none, none, none | không | #1: "Hoàn thành" được (I1 với `due_snapshot` 0) |
| `trip.dispatch` `:188` | any, none, any, none, none, any, none, none, none, none | không | #2: ↑ ↓ chuyến kế hoạch; #3: mọi người dùng `PUT /trip` đều giữ ô này |
| `trip.progress` `:193` | any, none, any, none, none, any, none, assigned, none, none | không | #2: đổi thứ tự khi chạy (tài xế, văn phòng bấm thay) |
| `order.trip.edit` `:80` | ownOrAssigned, none, any, none, none, any, none, none, none, none | giá trị không; **nghĩa rộng ra** ở (a): đóng chặng kéo theo máy đóng suất | đơn mình lập / phụ trách (Bán hàng), mọi đơn (Quản trị, Toàn quyền) |
| `trip.view` `:187` | any, any, any, none, none, any, none, assigned, none, none | không | #3: tài xế nhận MQ-07 qua `trip.view { assigned }` |
| `trip.call_ack` `:201` | ownOrAssigned, none, any, none, none, any, none, none, none, none | không | #3: người lập / phụ trách văn phòng nhận MQ-07 |

- Không thêm ô, không đổi giá trị, không đụng `EXTERNAL_PERMISSIONS`.
- Ngoại lệ có tên Đ2.13 của ADR-0104 không rộng ra, vì mọi người giữ `order.trip.edit` đều giữ `trip.dispatch`.

### 4. Cổng nào canh cửa nào

**Máy chủ**

| Cửa | Cổng hôm nay | Sau lượt |
|---|---|---|
| `POST /api/orders/:id/money-edit` (`src/modules/orders/index.ts:1071-1097`) | `can(order.money.edit, { ownerId })` `:1076` | #1: cổng không đổi; `canhBaoTongAm` của phản hồi đổi điều kiện |
| `POST /api/orders/:id/handler-money-edit` (`src/modules/dispatch/index.ts:247`) | như hôm nay | #1: cùng hàm tiền, kết quả ≥ 0 |
| `POST /api/ledger/refunds` (`src/modules/billing/index.ts:321-322`) | `can(payment.refund)`; `so ≤ daThu` (`service.ts:456-457`); trigger `refund_exceeds_paid` (`0045:216`) | không đổi; số dư để hoàn = đã thu |
| `POST /api/orders/:id/delivered` (`billing/index.ts:173-178`) | `can(order.handover, { assigned })`; `lyDoChuaGiaoDuoc` (`rules.ts:467`); trigger `bil_posting_delivered_paid` (`0045:232-241`); `CHECK due_snapshot >= 0` (`0045:103`) | #1: `phaiThu` của `thongTinGiaoDon` đã kẹp ⇒ qua được sau khi hoàn |
| Hoàn thành | trigger `completed_due_mismatch` (`0083:27-51`) | không đổi |
| `PUT /api/van-chuyen/chuyen/:id` (`src/modules/van-chuyen/index.ts:1197-1215`) | `can(trip.dispatch)` `:1198`; lớp vé `:1207`; `chanDaoMoi` (`dieu-phoi-lenh.ts:107`); `kiemTaoSuaChuyen` | #2: không đổi, ghi thành luật |
| `POST …/chuyen/:id/thu-tu` (`:1897-1898`), `POST …/cuoc-cua-toi/:id/thu-tu` (`:1672-1676`) | `trip.progress`; `chanDaoMoi` (`dieu-phoi-tien-do.ts:240`) | #2: không đổi |
| Xuất bến | trigger LC-19 (`0084:24-30`) + giữ `TRA_TRUOC_DON` | không đổi |
| `PUT /api/orders/:id/trip` (`orders/index.ts:866-904`) | `can(order.trip.edit, { ownerId, assigned })` `:871`; `xetDatGapSua`; cổng `updated_at` | #3 (a): + hook đồng bộ; câu cổng mỗi chuyến `version` + `status = 'PLANNED'` + `EXISTS v_aud_order_cmd` (có `trip_updated`); trần 74 câu |
| Tin MQ-07 (`tinGioHenCho`, `src/shared/tin-chuyen.ts:122-143`) | nguồn chỉ `order_leg_updated` | #3 (a), (b): `PUT /trip` sinh thêm dòng nguồn khi đổi ngày / giờ chặng đã xếp |

**Giao diện — ẩn/hiện đổi nghĩa**

| Chỗ | Hôm nay | Sau |
|---|---|---|
| Câu cảnh báo khối Thanh toán `web/order.ts:456-457` | hiện khi `order.total < 0` | #1: hiện khi giảm giá > tạm tính hiện hành. **Giữ điều kiện cũ thì câu biến mất âm thầm** |
| Dải sau khi lưu `web/order.ts:1082` | theo `r.canhBaoTongAm` | theo điều kiện mới |
| Dòng "Khách trả dư … chờ Kế toán hoàn" / "Còn lại" `web/order.ts:452` | dư phồng hơn đã thu | dư = đã thu |
| Nút "Ghi hoàn cho khách" `web/order.ts:787-797` | hiện khi có dư | điều kiện không đổi; số dư nhỏ lại |
| Nút / lý do "Đã giao" (theo `lyDoChuaGiao`, `billing/service.ts:171`) | đơn tổng âm luôn bị giữ `overpaid` | mở được sau khi hoàn |
| "Tổng cộng" trang đơn `web/order.ts:447`, biên nhận `src/shared/order-confirmation.ts:214-216` | số âm | 0; biên nhận hiện giảm giá hiệu lực (giả định bề mặt) |
| Nút ↑ ↓ `web/chuyen.ts:351`, `:382` (khoá theo `doiThuTuDuoc`, `src/shared/tien-do-man.ts:108-125`) | khoá khi tạo đảo mới | #2 giữ mã: không đổi. Nếu sửa theo chữ: khoá khi còn bất kỳ đảo nào ⇒ chuyến mà một bước không gỡ hết đảo (≥ 2 suất đảo, hoặc 1 suất đảo có điểm khác chen giữa) khoá hết nút |
| Bảng "Sửa thông tin chuyến" `web/trip-sheet.ts:134` | — | #3 (a): phản hồi có thể mang câu nhắc "văn phòng bấm Báo huỷ" (ADR-0104 Đ2.7) |

### 5. Ghép lại có sinh lỗ không

| Tổ hợp | Rủi ro | Chặn bởi |
|---|---|---|
| #1 + ADR-0104 Đ2 | route sửa số khách là điểm gọi đồng bộ | #1 không đổi số người, nên phần chuyến không đổi |
| #1 + đơn đại lý (ADR-0079, chưa làm) | đại lý chịu giảm giá nào | chốt "giảm giá hiệu lực" (tệp 01 §5) |
| #1 + đơn huỷ | lệch số cọc | `conLai` trả 0/0 cho đơn huỷ (`rules.ts:76-80`) |
| #3 (a) + #2 cùng chuyến | máy đóng suất trong khi văn phòng ↑ ↓ | câu cổng `version`: một bên thua (Đ2.12) |
| #3 (a) + xe đang chạy | máy ghi trái LC-15 | không ghi, chỉ nhắc Báo huỷ; trigger `0076:46-80` là lưới |
| #3 tin + tin đơn đổi | một người nhận hai tin | hộp thư: cùng lô ⇒ tối đa một tin (`thong-bao.ts:144`, `:174-190`); gõ cửa màn hình khoá: CHƯA bảo đảm — `doiVuaGhi` chỉ đọc một dòng (`thongbao/repository.ts:39-41`, `LIMIT 1`), phải sửa kèm (mục 3 phiếu tổng hợp). |
| #2 giữ mã + chuyến cũ đang chạy có đảo | trả khách trước khi đón | Đ1.4 chặn "Đã tới" sai (`dieu-phoi-route.ts:140-151`); `R-VC-THU-TU` phát hiện |

### 6. Sổ dừng dây chuyền (`docs/quyen-hoan.json`, đọc 2026-10-08)
- HIGH đang mở: TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-4.2 (hạn 2026-10-31); HC-5.11 (hạn 2026-11-15).
- #1: xây trên lỗ đang hở: TNV-G1 (cùng hàm `phaiThuCua`, `hoan-tat.ts:9-18`) và TNV-G3 (mở đường Đã giao → Hoàn thành cho đơn tổng âm). Bản vá mã của cả hai đã ở `main` (`0078`–`0079`, `0083`) nhưng chưa lên production; điều kiện: chỉ phát hành sau Sổ tiền, cùng A2. Đơn huỷ không đổi số (`rules.ts:76-80`).
- #2: không chạm.
- #3: máy ghi trong lô lệnh của người, ghi `staff_id` người đó, nên không vướng HC-5.11. Đổi sang chạy nền thì phải ghi "xây trên lỗ đang hở: HC-5.11".

### 7. Lời chủ, quyết định đã duyệt bị thay
- Lời chủ 8/10 "tổng tiền âm thì cảnh báo, không chặn": không mâu thuẫn với #1 (a) — vẫn không chặn, vẫn cảnh báo, chỉ thêm luật tính.
- ADR-0063 D1.12, vế "dư lớn hơn số đã trả" → thay bởi ADR-0109.
- ADR-0079 `:43`, `:57` (iv), `:75` (chủ duyệt 1/10, chưa thi công) → đại lý chịu **giảm giá hiệu lực**. Trên đơn đại lý tổng âm, đại lý nợ công ty ít hơn chữ cũ (ví dụ SV-SK-04: 500.000 thay vì 800.000); giữ chữ cũ thì sổ không cân. Đây là hệ quả của quyết định #1, không phải quyết định thứ tư, nhưng phần "Cho chủ dự án" của tệp 01 và câu duyệt có nói rõ.
- ADR-0104 Đ2.4 (chủ duyệt 8/10) → ADR-0111 nếu chọn (a).
- ADR-0096 Đ1.3b, Đ1.3c → ADR-0110 nếu giữ mã.

### 8. Chưa kiểm
- Toàn bộ là thiết kế trên giấy: chưa chạy trên cây thật (người kiểm mới chạy thử #1 (a) trên bản sao của mã), chưa xem production.
- Chữ V-3, V-5 của phiếu kiểm A2 (không có trong kho).
- Production có đơn tổng âm nào không.
- ADR-0081 (đại lý xem sổ) đã thi công tới đâu.
- Ca ↑ ↓ trên chuyến đang vướng lỗi khác (tệp 02 §3).
- Khuôn `detail` của dòng `order_leg_updated` thêm vào (tệp 03 §3).

### 9. Ghi lại, chưa sửa (mục THẤP của phiếu kiểm độc lập, phán quyết điều phối: không sửa vòng này)
- **00:** câu "tôi không thấy lỗ mới" ở phần "Cho chủ" chưa kèm câu về TNV-G1/G3; §3 cột "Áp cho" chưa tách theo loại đơn (bán lẻ, đại lý, Thực tập); §7 thiếu R-BIL-14 (`ADR-0079:98`) và ADR-0081 (`giamGiaMinhChiu`), nếu chọn tự trả ghế thì thiếu cả ADR-0104 Đ2.2 (`:130`); §4 dòng bảng "Sửa thông tin chuyến": `OrderResponse` (`contracts.ts:490`) không có trường mang câu nhắc "Báo huỷ" và `web/trip-sheet.ts:134` bỏ kết quả trả về (chỉ có nghĩa nếu tự trả ghế); §3 "nghĩa rộng ra ở (a)" của `order.trip.edit` chỉ đúng nếu tự trả ghế; các dòng "#3 (a)" ở §2–§5 tả phương án không được chọn, để nguyên.
- **01:** §6 thiếu năm chỗ sẽ sai hoặc đỏ sau (a) — `tests/e2e/sua-so-khach.mjs:80-89` (CA 3 khoá total −50000), `src/shared/huong-dan-ke-toan.ts:86`, `src/so-vang-sua-so-khach.test.ts:87`, `src/modules/orders/money-adjustment.test.ts:175-177`, mục nhật ký thay đổi `src/shared/changelog.ts` — và việc chạy lại e2e `sua-so-khach`; biên nhận: `ReceiptDto` không có trường giảm giá hiệu lực (`receipt/rules.ts:29-31`, `bien-nhan.test.ts:34`), kế hoạch phải chọn thêm trường hay suy ra, và thêm `receipt/rules.ts`, `contracts.ts` vào danh sách phải sửa; §5 thiếu R-BIL-14, dòng "Sửa:" chưa ghi ADR-0081; §4 có thể nêu thêm "Việc của tôi" của HDV (`orders/index.ts:544` → `web/viec-cua-toi.ts:533`); phần "Cho chủ" ~700 từ, còn mã nội bộ "SV-SK-04", "A2"; dòng "Số:" ghi "cuối README" (thật ra `docs/adr/README.md:113`/135; README nhánh QR ghi "kế tiếp là 0103", phải đối chiếu khi gộp).
- **02:** mục "Giữ mã thì được và mất gì" thiếu hệ quả tài xế nhận tin "Văn phòng vừa sửa chuyến" sau mỗi lần ↑ ↓ (`HANH_DONG_TIN_CHUYEN`, `tin-chuyen.ts:8-9`; hộp câu 2 đã nêu); dẫn chứng "người kiểm đã thử trong vùng 6 giờ" nên chép từ `SYSTEM-DESIGN.md:1283` vào §3; phần "Cho chủ" ~620 từ, còn "ADR-0096", "ADR-0110", "↑ ↓", "mã".
- **03:** phần "Cho chủ" ~680 từ; cột (c) "không ai báo tài xế" ở bảng §2 và câu "cửa sổ là bây giờ" ở §3 tả phương án không còn chọn, để nguyên. Hai mục THẤP khác của 03 (trần `db.batch` khi ghi thêm dòng nhật ký; §4 thiếu D6.1 "một chiều" và việc cần người kiểm) đã được phủ khi chép sáu điều kiện tự áp vào §4.
