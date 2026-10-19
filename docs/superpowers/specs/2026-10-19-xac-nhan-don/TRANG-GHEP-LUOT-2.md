# Trang ghép lượt 2 — ADR-0135 + ADR-0136 (CLAUDE.md §9 "Bước ghép khi duyệt")

> Kèm `DE-XUAT-ADR-0135-buoc-xac-nhan-don.md` và `DE-XUAT-ADR-0136-thu-xac-nhan-va-qr-may-chu.md`. Hai quyết định chạm quyền / dữ liệu (≤ 3). Giả định lượt 1 (ADR-0133, ADR-0134) đã duyệt nguyên văn; lượt 1 đổi thì trang này phải soát lại. Tệp:dòng đúng tại commit `b1ba5dac` (mã nguồn giống hệt `305aae77`).

## 1. Bảng bị chạm chứa những loại thực thể nào

| Bảng | Sau lượt 1 | Sau lượt 2 |
|---|---|---|
| `orders` | `draft` = nháp riêng của người lập; `confirmed`; `cancelled` | `draft` chứa **hai loại**: nháp riêng (không có yêu cầu mở) và **đơn chờ xác nhận** (có yêu cầu mở). Không thêm giá trị `status` |
| `ord_confirm_request` (mới) | — | một dòng mỗi lần gửi: người gửi, lúc gửi, hạn; khi khép: người quyết, lúc, kết quả (`XAC_NHAN`/`HUY`/`RUT_LAI`), tình trạng vé, ghi chú. Một dòng mở mỗi đơn; khép một lần; không xoá |
| `ord_service_confirm_flag` (mới) | — | cờ "cần xác nhận" theo mã dịch vụ, chỉ thêm dòng |
| `ord_confirm_policy` (mới) | — | công tắc "người nội bộ tự xác nhận", chỉ thêm dòng, gieo BẬT |
| `ord_transfer_leg` | chặng + khung giờ (ADR-0133) | người quyết định đổi giờ đón trong lô Còn vé |
| `bil_payment_receipt` | không nhận dòng mới cho nháp | không đổi; đơn chờ vẫn là nháp ⇒ không ghi thu được |
| `audit_log` | — | + gửi, rút lại, đổi cờ, đổi công tắc; quyết định dùng lại `confirmed`/`cancelled` kèm chữ "Còn vé"/"Hết vé"; sửa tiền khi chờ ghi lý do. Không ghi địa chỉ thư |

Không bảng nào cho thư (nếu chủ chọn ADR-0136 Đ5 phương án b).

## 2. Dòng bản đồ quyền chạm → áp cho loại nào

| Ô / luật | Giá trị | Sau lượt 1 áp cho | Sau lượt 2 |
|---|---|---|---|
| `order.confirm.review` (mới) | SALES, ACC, ADMIN, FIELD, SA `any`; còn lại `none` | — | đọc danh sách chờ + chi tiết **đơn chờ** của bất kỳ ai; quyết định Còn vé / Hết vé / Huỷ (cùng luật tự xác nhận ADR-0135 Đ5) |
| `order.view` `permissions.ts:88` | không đổi | nháp: chỉ người lập | **đơn chờ**: người lập HOẶC người giữ `order.confirm.review`; nháp riêng: như lượt 1 |
| `money.view` `:89` | không đổi | theo `order.view` | đơn chờ: người xét duyệt thấy tiền **chỉ đọc** dù không có ô (HDV chưa phụ trách) |
| `contact.view` `:91` | không đổi | theo `order.view` | đơn chờ, người xét duyệt không phải người lập: máy chủ **bỏ** SĐT, email, liên hệ người đặt (ngoại lệ ADR-0019 đ2) |
| `order.money.edit` `:109` | SALES own; ACC/ADMIN any; FIELD assigned; SA any | sau xác nhận (route điều chỉnh) | + sửa tiền thẳng trên đơn **chờ** khi không phải người lập, bắt lý do. Thực tế: Kế toán, Quản trị, Toàn quyền (SALES `own` và FIELD `assigned` không trúng vì người lập bị khoá và phụ trách chưa hiệu lực khi còn nháp) |
| `order.modify` `:93` | không đổi | nháp: chỉ người lập | gửi / rút lại: người lập. Xác nhận bằng `/status`: chỉ đơn **không** cần xác nhận. Đang chờ: người lập bị khoá sửa |
| `order.cancel.classify` `:113` | ADMIN, SA | nhóm lý do "Công ty huỷ" | Hết vé ⇒ `HET_CHO` tự gán, **không** hỏi ô này (ngoại lệ ADR-0089 đ8); Huỷ lý do khác vẫn hỏi như hộp Huỷ |
| `payment.receive` `:120` | không đổi | không áp cho nháp | đơn chờ = nháp ⇒ vẫn không ghi thu |
| `order.pool.view` `:194`, `dispatch.claim` `:115` | không đổi | chỉ đơn đã xác nhận | đơn chờ không vào hàng chờ nhận, không Nhận được |
| `order.leg.short_notice` `:97` | ADMIN, SA | — | áp lúc bấm Còn vé (409 `short_notice_required` như hôm nay) |
| `settings.ops` `:190` | SA | + khung giờ | + cờ dịch vụ, công tắc tự xác nhận |
| `holdsPartner` / INTERN | — | — | người lập Đối tác / Thực tập không bao giờ tự quyết (ô `none`) |
| `duocThayTinDon` `bang-tin.ts:152-156` | — | Đối tác/Thực tập không bao giờ nhận tin đơn | Đối tác/Thực tập nhận tin xác nhận / huỷ **đơn mình lập** (không tên người làm, ADR-0131) |
| Nhãn Bảng tin `nhanKetNoi` `bang-tin.ts:56-61` | — | sự kiện nháp chỉ người lập | + nhãn `xet-duyet` cho người giữ ô; sự kiện gửi / rút lại của nháp mang thêm nhãn này |

## 3. Cổng nào canh cửa nào

| Cửa | Cổng (thứ tự) |
|---|---|
| `POST /api/orders/:id/gui-xac-nhan` (mới) | cổng `orders` → chỉ người lập → đơn `draft` → có dịch vụ cần xác nhận → đã chọn đón (ADR-0133) → chưa có yêu cầu mở → ghi + nhật ký + Bảng tin |
| `POST /api/orders/:id/rut-xac-nhan` (mới) | chỉ người lập → có yêu cầu mở → khép `RUT_LAI` |
| `POST /api/orders/:id/quyet-dinh` (mới) | `can(order.confirm.review)` → luật tự xác nhận → yêu cầu còn mở → khoá `updated_at` (thua 409) → Còn vé: các cổng xác nhận hiện có (`/status` `src/modules/orders/index.ts:1411-1420`, mốc / đặt gấp) |
| `GET /api/orders/cho-xac-nhan` (mới) | `can(order.confirm.review)`; DTO không tên / SĐT / email khách |
| `GET|POST /api/cai-dat/xac-nhan-don` (mới) | đọc: người giữ ô; ghi: cổng `admin` + `settings.ops` (khuôn `index.ts:744-760`) |
| `POST /api/orders/:id/status` `:1386` | + đơn cần xác nhận ⇒ 409 `confirm_request_required` |
| `PUT /api/orders/:id` `:1000-1006` | + người lập khi đang chờ ⇒ 409 `confirm_pending_locked`; người khác: đang chờ + `order.money.edit` + lý do khi tổng đổi |
| `GET /api/orders/:id` `:956-970` và các route đọc của ADR-0134 Đ1 | nhánh đọc thứ hai: đơn chờ + `order.confirm.review` ⇒ 200, bỏ trường liên hệ. Phải **thay** câu `can(order.view)` ở `:968`, nếu không HDV chưa phụ trách bị 404 trước khi tới nhánh này |
| Thư (ADR-0136) | chạy sau lô thắng của `quyet-dinh` / nhánh huỷ `:1400` / `cancelOrderByHandler` `:502`; gốc lắp ráp tiêm hàm gửi (orders không import `receipt`) |
| Bộ vẽ QR | `src/vendor-qr.test.ts:52-56` hôm nay ép chỉ `web/qr-ve.ts` nhắc bộ vẽ → nới đúng một tệp; băm thân giữ |
| Cạnh module | `src/architecture.test.ts:59` `receipt: ["orders","billing","parties","company"]` → + `staff`; `receipt` vẫn hạng không bảng (`:133`) |
| Bộ gửi thư | `src/shared/gui-thu.ts:6-9` (`Mailer.send`) chưa có trường đính kèm — phải mở rộng nếu Email Service hỗ trợ |

### 3b. Chỗ giao diện ẩn/hiện bị đổi nghĩa

- **Nút "Xác nhận" → "Gửi xác nhận"** hàm `orderActions` (`src/shared/order-view.ts:112-118`): hôm nay `draft` + `canModify` ⇒ `confirm`. Sau: đơn cần xác nhận ⇒ `send` (người lập), `withdraw` (người lập, đang chờ), `decide` (người xét duyệt); `confirm` chỉ khi không cần xác nhận.
- **Thẻ "Chờ xác nhận"** (mới, "Việc của bạn"): khoá `choXacNhan` của `PHAM_VI_O_TRANG_CHU` **đã bị thẻ "Đơn nháp" dùng** (`src/shared/viec-cua-ban.ts:40, 67`) và ô điện thoại `web/home.ts:658` **đã in chữ "Chờ xác nhận"** cho số nháp — phải đổi tên khoá / chữ cũ trước, không thì hai nghĩa chồng nhau. Khối "Việc của bạn" bị ẩn trên điện thoại (`web/home.ts:334-336`) và chỉ cho `seesAllOrders` (`viec-cua-ban.ts:57`, không có HDV) — thẻ mới phải hiện cả điện thoại và cho HDV (ADR-0135 Đ9).
- **Ảnh "XÁC NHẬN ĐƠN DỊCH VỤ"** `src/shared/order-confirmation.ts:178`, hộp tự bật `web/order.ts:95-107, 1511`: không tự bật với đơn cần xác nhận còn nháp / đang chờ.
- **Nút QR** `web/order.ts:527-528`: đơn chờ vẫn là nháp ⇒ ẩn (đã lo ở lượt 1).
- **Dải "Chờ xác nhận · còn N phút / Quá hạn"** trên trang đơn và **trang danh sách chờ** (mới, khai `PAGES`).
- **Ô "ĐƠN NHÁP"** bảng điều phối `web/dieu-phoi.ts:131, 135`: từ lượt 2 mới có số (đơn chờ) — nên đổi chữ thành "Chờ xác nhận".
- **Hộp thông báo**: tin mới "có đơn gửi xác nhận"; Đối tác / Thực tập thấy tin xác nhận / huỷ đơn mình (không tên người làm).

## 4. Lỗ đang hở (`docs/quyen-hoan.json`)

**Xây trên lỗ đang hở: không** — cùng điều kiện lượt 1.
- **TNV-G1:** Hết vé là đường huỷ mà nháp CŨ đã có khoản thu (sinh từ ô Thanh toán trước trước khi phát hành lượt 1) sẽ đi vào ⇒ đơn huỷ còn tiền. Chủ đếm trước phát hành bằng lệnh ở Task 2.2 Step 0 của kế hoạch. Thêm: ADR-0135 "Điều chưa chắc" khuyến nghị chặn Gửi xác nhận khi đơn đã có khoản thu (cần hàm tiêm vì `orders` không đọc `bil_`); kế hoạch Task 3.3 chưa có điều kiện này.
- **TNV-G3, TNV-G4, HC-4.2:** không chạm (không ghi thu, không đổi sổ; sửa tiền khi chờ là sửa giá đơn nháp chưa có khoản thu).
- **HC-5.19:** migration thêm ba bảng; không ghi đè dữ liệu cũ. Hạn giữ.
- **HC-5.11:** không chạm (không có tác vụ tự động mới — quá hạn chỉ hiện, không nhắc bằng bộ hẹn giờ).

## 5. Bài kiểm dự kiến phải sửa / thêm (ước lượng)
`src/shared/permissions.test.ts` (bảng ADR + ba bài ghim hàng), `src/shared/order-view.test.ts`, `src/shared/viec-cua-ban.test.ts`, `src/shared/thong-bao.test.ts`, `src/shared/bang-tin.test.ts` (Đối tác nhận tin đơn mình — bài Q-C hiện có sẽ đỏ có chủ đích), `src/vendor-qr.test.ts`, `src/architecture.test.ts`, `tests/e2e/permissions.mjs`, route mới vào `route-write-guard` / `permission-enforcement`.
