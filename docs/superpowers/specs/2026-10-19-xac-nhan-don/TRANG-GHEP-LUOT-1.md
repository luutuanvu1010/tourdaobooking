# Trang ghép lượt 1 — ADR-0133 + ADR-0134 (CLAUDE.md §9 "Bước ghép khi duyệt")

> Kèm `DE-XUAT-ADR-0133-don-khong-don-khung-gio.md` và `DE-XUAT-ADR-0134-nhap-rieng-tu-khong-thu.md`. Hai quyết định chạm quyền / dữ liệu (≤ 3). Tệp:dòng đúng tại commit `305aae77` (bản sửa riêng `worktree-xac-nhan-don`, 19/10), người soạn đã đọc từng chỗ.

## 1. Bảng bị chạm chứa những loại thực thể nào

| Bảng | Hôm nay chứa | Sau lượt 1 |
|---|---|---|
| `orders` | đơn `draft` / `confirmed` / `cancelled` (CHECK từ `0003`). `draft` gồm cả nháp đang dở lẫn nháp "chưa bấm xác nhận" | không đổi cột. **Nghĩa mới:** `draft` = vùng riêng của người lập (ADR-0134 Đ1). Sau ADR-0135, `draft` còn chứa "đơn chờ xác nhận" (có dòng yêu cầu mở) |
| `order_service` | dịch vụ của đơn | + `pickup_choice` (`DON`/`KHONG_DON`/NULL) — ADR-0133 Đ1 |
| `ord_transfer_leg` | chặng đưa đón (ADR-0047), `pickup_time` = giờ hẹn | + `pickup_slot_end` (giờ cuối khung, NULL = "Giờ khác") — ADR-0133 Đ3 |
| `ord_pickup_slot_policy` (mới) | — | chính sách khung giờ + câu lưu ý, chỉ thêm dòng |
| `bil_payment_receipt` (`0045`) | khoản thu của đơn nháp, đã xác nhận, đã huỷ (đơn huỷ: chỉ Kế toán/Toàn quyền) | không đổi bảng; **không còn dòng mới** cho đơn nháp (ADR-0134 Đ7). Dòng cũ của nháp vẫn còn — mục 4 |
| `dsp_assignment` (`0014`) | dòng phụ trách, kể cả dòng mở do người lập chọn sẵn trên đơn nháp | không đổi bảng; dòng mở trên nháp **không còn sinh quyền** (ADR-0134 Đ5) |
| `audit_log` | mọi dòng nhật ký, kể cả của nháp | + `pickup_slot_policy_changed`; trang Nhật ký vẫn thấy dòng của nháp (ngoại lệ có tên ADR-0134 Đ1) |

## 2. Dòng bản đồ quyền chạm → áp cho loại nào (giá trị ô KHÔNG đổi)

| Ô (`src/shared/permissions.ts`) | Giá trị hôm nay | Hôm nay áp cho | Sau lượt 1 |
|---|---|---|---|
| `order.view` `:88` | SALES/ACC/ADMIN/SA any; FIELD assigned; PARTNER/INTERN own | mọi đơn mọi trạng thái | đơn **nháp**: chỉ khi người xem là người lập (luật thuần thêm, ngoại lệ ADR-0014 đ2); đã xác nhận / huỷ: như cũ |
| `money.view` `:89`, `contact.view` `:91`, `order.history.view` `:90` | như hàng trên | chi tiết, biên nhận, QR | đi theo `order.view` ở trên (nháp → 404 trước khi tới các ô này) |
| `order.modify` `:93` | SALES ownOrAssigned; ADMIN/SA any; PARTNER/INTERN own | sửa / xác nhận / huỷ mọi đơn nháp trong phạm vi | nháp: chỉ người lập (ADR-0134 Đ2 — chờ chủ Q2). Người phụ trách chọn sẵn (ownOrAssigned của SALES) mất quyền trên nháp |
| `payment.receive` `:120` | SALES own; ACC/ADMIN/SA any; FIELD assigned; PARTNER/INTERN own | ghi thu trước "Đã giao", **kể cả nháp** | không áp cho nháp (409); đã xác nhận như cũ |
| `order.pool.view` `:194` | FIELD, SA any | phần hẹp của đơn `draft` + `confirmed` chưa có người | chỉ `confirmed` |
| `dispatch.claim` `:115` | SALES/ADMIN/FIELD/SA any | Nhận đơn nháp hoặc đã xác nhận chưa có người | Nhận đơn nháp → 409 `order_not_confirmed` |
| `dispatch.assign` | (route `PUT …/handler`) | giao người phụ trách cho mọi đơn | nháp: chỉ người lập (theo Đ2) |
| `order.create` `:92` | SALES/ADMIN/PARTNER/SA/INTERN any | lập đơn | + đọc khung giờ (ADR-0133 Đ6) |
| `settings.ops` `:190` | chỉ SA | bảo trì, nhập tay | + đổi khung giờ / câu lưu ý (ADR-0133 Đ6) |
| `order.leg.short_notice` `:97` | chỉ ADMIN, SA (`quanTri()`) | Đặt gấp chặng của **mọi** đơn | không đổi ô, nhưng Quản trị mất đường **thấy** nháp người khác → câu hỏi Q1 của ADR-0134 |
| Nhãn Bảng tin `nhanKetNoi` (`src/shared/bang-tin.ts:56-61`) | `tat-ca` = `can(order.view)` không ngữ cảnh | nhận mọi sự kiện đơn | sự kiện của nháp không mang `tat-ca`/`cho-nhan` |

## 3. Cổng nào canh cửa nào

| Cửa | Cổng hôm nay (tệp:dòng) | Sau lượt 1 |
|---|---|---|
| `GET /api/orders` | ba nhánh `seesAll`/`own`/`handled` `src/modules/orders/index.ts:835-850`; điều kiện SQL `dieuKienDanhSach` `repository.ts:505` | nháp chỉ `o.staff_id = người gọi` (kể cả tìm theo mã) |
| `GET /api/orders/:id` | `can(order.view, scope)` `index.ts:968`, rồi `money.view`/`contact.view` `:970` | luật nháp thay cho `can(order.view)` → 404 |
| `/:id/passengers` `:1244-1250`, `/:id/thuong-mai` `:1504-1512` | `can(order.view, scope)` | như trên |
| `/api/orders/dashboard` `:784`, `/dem-nhap` `:794` | ba ô không ngữ cảnh; `countDrafts` đếm **cả công ty** `repository.ts:705-708`; `unassignedCount` gồm cả nháp `repository.ts:746-748` | `draftCount` = nháp của người gọi; `unassignedCount` chỉ `confirmed` — **kế hoạch Task 2.1 chưa nêu `unassignedCount`** |
| `/api/orders/pool` `:805-815` | `order.pool.view` + `!holdsPartner`; nguồn `listPoolSources` lấy `status IN ('draft','confirmed')` `repository.ts:592-598` | chỉ `confirmed` |
| `PUT /api/orders/:id/handler` `src/modules/dispatch/index.ts:157` | sàng `dispatch.claim`/`dispatch.assign`; Nhận chỉ chặn đơn huỷ `:180` | nháp: Nhận → 409; giao bởi người khác người lập → 404 |
| Route ghi của orders (`PUT /:id` `:1000-1006`, `/status` `:1386-1394`, `/legs*` `:1105-1183`, `/passengers` POST `:1257`, `/booker` `:1326`) | `can(order.modify, {ownerId, assigned})` | thêm luật nháp: chỉ người lập (Đ2) — **kế hoạch Task 2.1 chỉ nêu route đọc** |
| `POST …/legs/:legId/short-notice` `:1214-1226` | chỉ ô `order.leg.short_notice`, **không** hỏi `order.view` | không đổi mã; vấn đề là Quản trị không còn thấy nháp để bấm (Q1) |
| `GET /api/orders/:id/receipt` `src/modules/receipt/index.ts:22-28`; `/qr-thanh-toan` `:39-46` | `order.view` → `money.view` (+`contact.view`); QR **không** xét trạng thái | luật nháp → 404 cho người khác; QR: đơn không `confirmed` → 409 `qr_requires_confirmed` (cả người lập) |
| `GET /api/orders/:id/payments` `src/modules/billing/index.ts:57`; cờ `coTheGhiThu` `:82` | `order.view`; cờ chỉ xét đơn huỷ | luật nháp; cờ thêm `status !== 'draft'` |
| `POST /api/orders/:id/payments` `:91-98` | `payment.receive`; chỉ chặn đơn huỷ | nháp → 409 `order_draft_no_payment` |
| Route cọc `:109-174` (dịch vụ `src/modules/billing/coc.ts`) | đơn **nguồn** phải đã huỷ (`coc.ts:165`); đơn **nhận** của lệnh chuyển cọc (`POST …/coc/chuyen`, và nhánh chuyển ở `coc.ts:196`) chỉ chặn đơn huỷ / đã giao (`coc.ts:196, 304`) — **nhận được đơn nháp** | đơn nhận là nháp ⇒ 409 (chuyển cọc tạo khoản thu trên đơn nhận). Chỉ cần cổng ở đơn nhận, không ở đơn nguồn |
| `donCuaNguoiDat` `src/modules/orders/nguoi-dat-gop-repo.ts:14, 29` (tiêm ở `src/index.ts:199`, dùng khi gộp hồ sơ người đặt) | trả mã đơn mọi trạng thái của một người đặt | chỉ đếm nháp, không trả mã đơn nháp của người khác (kế hoạch Task 2.1 đã nêu) |
| `GET /:id/nhap-ke-toan` `:220-226`, `POST /api/ledger/balances` `:251` | `order.view` theo phạm vi | luật nháp |
| `lichChungChang` `src/modules/orders/index.ts:438-476`; nguồn `legLichChungNhapRows` `chang-hanh-khach-repo.ts:615-631` (mọi chặng mở của nháp); dùng ở `src/modules/van-chuyen/dieu-phoi-lenh.ts:750` | sau `can(trip.view)` | chỉ nháp có yêu cầu xác nhận mở (ADR-0134 Đ9) |
| Bảng tin `nhanSuKien` `src/shared/bang-tin.ts:96-106` | luôn `tat-ca` + người lập + người phụ trách trước/sau | nháp: chỉ `nguoi:<người lập>` |
| Hộp thông báo `HANH_DONG_TIN_DON` `src/shared/thong-bao.ts:10`; `duocThayTinDon` `bang-tin.ts:152-156` | văn phòng + HDV thấy tin `created`, `order_handler_changed`… | tin của nháp chỉ người lập |
| `POST /api/orders/:id/status` nhánh xác nhận `index.ts:1411-1420` | giá danh mục, thiếu người lớn, mốc | + cổng `pickup_choice_required` (ADR-0133 Đ2) |
| `GET/POST /api/cai-dat/khung-gio-don` (mới) | khuôn `/api/cai-dat/nhap-tay` `index.ts:744-760` | đọc `order.create`; ghi cổng `admin` + `settings.ops` |

**Đã rà:** mọi câu SQL `FROM orders` / `JOIN orders` trong `src/` (19/10). Danh sách "chuyến hôm nay" của Trang chủ (`repository.ts:667`) và nguồn lịch chung đã xác nhận (`chang-hanh-khach-repo.ts:580`) vốn chỉ lấy `confirmed`. **Chưa rà:** các nơi module khác đọc đơn qua view công bố (`v_ord_order_label`, `v_ord_order_state`, `v_ord_order_owner`… — sổ tiền, Vận chuyển, Góp ý) có trả mã đơn nháp cho người khác không; người thi công Task 2.1 phải rà trước khi viết mã.

### 3b. Chỗ giao diện ẩn/hiện bị đổi nghĩa

- **Nút QR** `web/order.ts:527-528`: hôm nay hiện cả với nháp (chỉ ẩn đơn huỷ, đã giao, có cọc) → thêm `order.status === "confirmed"`.
- **Nút ghi thu** `web/order.ts:529` (theo cờ `coTheGhiThu` của máy chủ) → tự ẩn với nháp.
- **Ô "Thanh toán trước" / "Hình thức" / "Người thu tiền"** `public/order-form.html:46-50, 62`, `web/order-form.ts:51, 676-689` (gọi `POST …/payments` sau khi lưu) → bỏ. Nhãn thật là "Thanh toán trước", không phải "Trả trước" như đặc tả gọi.
- **Thẻ "Đơn nháp"** của "Việc của bạn" `src/shared/viec-cua-ban.ts:67` (hiện cho `seesAllOrders`, nút "Xác nhận đơn"/"Xem đơn nháp") và **ô "Chờ xác nhận"** trên điện thoại `web/home.ts:658` (cả hai đọc `draftCount`): nghĩa đổi từ "nháp cả công ty" thành "nháp của tôi". Lưu ý: ô điện thoại **đã mang chữ "Chờ xác nhận"** và khoá `choXacNhan` của `PHAM_VI_O_TRANG_CHU` đã thuộc thẻ nháp (`viec-cua-ban.ts:40`) — trùng tên với thẻ mới của ADR-0135; phải đổi tên một trong hai ở lượt 2.
- **Huy hiệu "Đơn hàng"** thanh bên `web/shell.ts:203-210` và `web/home.ts:788` → nháp của tôi.
- **Ô "Chưa phụ trách"** `web/home.ts:659`, thẻ `chuaPhuTrach` `web/home.ts:782` → chỉ đơn đã xác nhận.
- **Hàng chờ nhận của HDV** (trang dùng `GET /api/orders/pool`) → không còn nháp.
- **Ô "ĐƠN NHÁP … chờ duyệt đặt gấp"** bảng điều phối `web/dieu-phoi.ts:131, 135` → chỉ đơn đã gửi xác nhận; nên đổi chữ thành "Chờ xác nhận" ở lượt 2.
- **Hộp "Xác nhận đơn để gửi khách"** tự bật sau khi lập `web/order.ts:95-107, 1511`: lượt 1 không đổi (ADR-0135 Đ11 đổi).
- **Khối đưa đón** `web/khoi-dua-don.ts:368` ("Không đưa đón"), ô giờ chặng → hai nút Đón / Không đón + hàng khung (ADR-0133).

## 4. Lỗ đang hở (`docs/quyen-hoan.json`, mục `phat_hien`)

**Xây trên lỗ đang hở: không** — với một điều kiện ở TNV-G1.
- **TNV-G1** (đơn huỷ còn tiền đã thu, hạn 2026-11-30): **né** nhờ ADR-0134 Đ7 "nháp không ghi thu" — đơn bị huỷ khi còn nháp (sau này: Hết vé ở bước xác nhận) không giữ tiền khách. **TRỪ** nháp CŨ đã có khoản thu (sinh từ ô Thanh toán trước trước ngày phát hành): huỷ chúng vẫn rơi đúng vào lỗ. Chủ phải đếm trước phát hành bằng lệnh ở Task 2.2 Step 0 của kế hoạch (chủ chạy, AI không chạy lệnh remote); > 0 thì chủ quyết cách xử lý trước khi phát hành Đợt 2.
- **TNV-G3**, **TNV-G4**, **HC-4.2** (sổ tiền sau "Đã giao", ràng buộc sổ, điều chỉnh có duyệt): không chạm — lượt 1 chỉ **bớt** đường ghi thu, không mở đường mới, không đổi luật sổ.
- **HC-5.19** (chưa diễn tập khôi phục): lượt 1 có migration thêm cột (ADR-0133) — thêm, không ghi đè dữ liệu cũ; không dựa vào khôi phục. Hạn và điều kiện phát hành của mục này giữ nguyên.
- **HC-5.11** (Cron không định danh): không chạm.

## 5. Bài kiểm dự kiến phải sửa (ước lượng)
`src/modules/orders/dem-nhap.test.ts` (đếm theo người), bài pool trong `tests/e2e/dispatch.mjs`, `src/shared/bang-tin.test.ts` (nhãn nháp), `src/shared/service-form.test.ts` (thân không còn trả trước — sửa có chủ đích), `tests/e2e/so-tien.mjs`, `tests/e2e/qr-thanh-toan.mjs`, kịch bản `a2-smoke-form`. Bài ghim giá trị ô (`permissions.test.ts`) **không** đổi.
