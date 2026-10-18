# Trang ghép — ADR-0131 (CLAUDE.md §9 "Bước ghép khi duyệt")

> Kèm `ADR-0131-nhap.md` cùng thư mục. Ba quyết định, cùng chạm bảng `audit_log` và ba ô quyền. Số liệu, tệp, tên hàm đúng tại commit `cc003e02` (main 2026-10-18).

## 1. Bảng `audit_log` chứa loại thực thể nào
Một dòng = một thao tác: người làm (`staff_id`, NULL = hệ thống tự làm), hành động (khai ở `src/shared/audit-actions.ts`), đối tượng (`target_type` / `target_id`), đơn (`order_id`, có thể NULL), chữ chi tiết (`detail`), lúc. Theo đối tượng:

| Loại dòng | `order_id` | Hiện trong lịch sử đơn? |
|---|---|---|
| Sự kiện của đơn (lập, sửa, chuyến, chặng, khách, xác nhận, huỷ, sửa số khách, thu, đã giao, hoàn thành, phụ trách, đổi khách, xuất ảnh/PDF, chụp mức hoa hồng, dấu nhập kế toán) | có | có |
| Tiền của đơn trong sổ (`ledger_*`, `deposit_*` ghi kèm đơn) | có | có |
| Chuyến xe (`trip_*`) | **NULL có chủ đích** (ADR-0059) | không |
| Tài khoản, nhân viên, hồ sơ Danh bạ, giấy tờ, xe, điều phối, danh mục, địa điểm, góp ý, thông báo, hệ thống | NULL | không |

View đọc ra ngoài module `audit`: `v_aud_order_event`, `v_aud_order_change` (có `detail`), `v_aud_trip_event`, `v_aud_account_event`, `v_aud_ledger_event`, `v_aud_cham_tai_khoan`, `v_aud_order_cmd` (chỉ dấu lệnh). Trợ lý AI không đọc nhật ký.

## 2. Dòng bản đồ quyền chạm bảng này → áp cho loại nào

| Ô / luật | Ai (hôm nay) | Hôm nay áp cho | Sau ADR-0131 |
|---|---|---|---|
| `audit.view` | chỉ SUPER_ADMIN | trang Nhật ký (mọi loại dòng) | **+ lớp đầy đủ** của lịch sử đơn **+ tên người làm** trong tin đơn / tin đổi / tin điều chỉnh. Giá trị ô không đổi; chú thích ô trong `permissions.ts` phải sửa |
| `admin.manage` | ADMIN, SUPER_ADMIN | cổng thứ nhất của `GET /api/audit` | không đổi |
| `admin.manage.superadmin` | SUPER_ADMIN | lọc "thao tác im lặng" ở trang Nhật ký | không đổi |
| `order.history.view` | SALES ownOrAssigned; ACCOUNTING, ADMIN any; FIELD assigned; PARTNER, INTERN own; SUPER_ADMIN any | lịch sử đơn **đầy đủ có tên** + tên người làm trong tin đơn / tin đổi + `lichSuSoKhach` | phạm vi không đổi; nay chỉ mở **lớp rút gọn** (không tên) + `lichSuSoKhach` (không đổi, không có tên) |
| `holdsPartner` (danh tính, không phải ô) | mọi tài khoản giữ PARTNER, kể cả lai | danh sách Đối tác D-1, có tên | danh sách D-1 không đổi, **bỏ tên**; thắng `audit.view` (tài khoản Toàn quyền + Đối tác vẫn nhận lớp Đối tác ở chi tiết đơn) |
| `accounting.entry.view` | theo bảng | dòng dấu nhập phần mềm kế toán | luật giữ, bỏ tên |
| `order.leg.short_notice.view` | theo bảng | rút gọn dòng đặt gấp | không đổi |
| `order.view` không ngữ cảnh (SALES, ACC, ADMIN, SA) | — | nhãn `tat-ca` → nhận **nội dung** tin đổi | không đổi (nội dung giữ; tên → `audit.view`) |
| `ledger.adjust.approve` | ACC, ADMIN, SA | ai nhận tin điều chỉnh công nợ (câu luôn có tên) | người nhận không đổi; tên → `audit.view` |
| `trip.view` | SALES, ACC, ADMIN, SA any; DRIVER assigned | tin chuyến (vốn không có tên người làm) | không đổi |
| `party.verify` | ADMIN, HR, SA | `v_aud_cham_tai_khoan` → chỉ kết luận | không đổi (ngoài phạm vi) |

## 3. Cổng nào canh cửa nào

| Cửa | Cổng (theo thứ tự) | Sau ADR-0131 |
|---|---|---|
| `GET /api/audit` (`src/modules/audit/index.ts`) | access `admin` → `admin.manage` → `audit.view`; lọc im lặng; lọc thương mại khi `holdsPartner` | không đổi |
| `GET /api/orders/:id` (`src/modules/orders/index.ts`) | access `orders` → `order.view`, `money.view`, `contact.view` → `order.history.view` (có khối hay `[]`) → `holdsPartner` ? `lichSuChoDoiTac` : lọc dấu nhập kế toán | thêm nhánh: `holdsPartner` → lớp Đối tác không tên; `audit.view` → lớp đầy đủ; còn lại → **lớp nội bộ** (danh sách mới, không tên). `lichSuSoKhach` không đổi |
| `GET /api/thong-bao`, `/tom-tat`, `/moi-nhat` (`src/modules/thongbao/index.ts` → `locHopThongBao`, `src/shared/thong-bao.ts`) | access `staff` → chọn người nhận (`duocThayTinDon`, `duocThayTinDoi`, `ledger.adjust.approve`) → `coTen` = `can(order.history.view, phạm vi đơn)`; tin điều chỉnh luôn có tên | `coTen` = `can(audit.view)` cho cả ba loại tin; người nhận không đổi |
| Thông báo đẩy (web push) | gửi không kèm chữ; service worker gọi `GET /api/thong-bao/moi-nhat` | tự đi theo dòng trên, không sửa riêng |
| `PUT` / `POST` đơn | không trả `history` | không đổi |

### 3b. Chỗ giao diện ẩn/hiện theo quyền
- Mục menu "Nhật ký" (`src/shared/muc-giao-dien.ts`) và trang `web/audit.ts`: hỏi `can(staff, "audit.view")`. Ai thấy không đổi; **nghĩa ô rộng ra** (thêm lớp đầy đủ và tên trong tin) — không ai thêm quyền.
- Khối "Lịch sử" ở `web/order.ts`: **không có `can()`**, hiện khi `history.length > 0` và in `· ${e.staffName}`. Nghĩa khối đổi **âm thầm** theo máy chủ: người thi công phải bỏ phần "· tên" khi máy chủ không gửi tên, và bản cũ còn lưu trên máy (chưa cập nhật service worker) không được in "null" — vì vậy máy chủ gửi nhãn trung tính (ADR đ2a). Giao diện không dùng `e.staffId`.
- `web/order-form.ts` nhận `history` trong phản hồi nhưng không vẽ — vẫn phải là lớp rút gọn (cùng route).
- `web/thong-bao-ui.ts`: in câu `cau` máy chủ đã dựng — không sửa.
- Chữ hướng dẫn phải sửa cùng: `src/shared/huong-dan-ke-toan.ts`, `src/shared/huong-dan-ban-hang.ts`, `src/shared/tro-ly-kien-truc.ts` ("ai sửa, lúc nào"), `src/shared/tro-ly-cau-truc.ts` (sinh từ bảng quyền — chạy lại `scripts/sinh-so-do-trang.mjs`).

### 3c. Bài kiểm dự kiến phải sửa (ước lượng, chưa đếm từng bài)
Khoảng mười tệp: lịch sử đơn — `src/lich-su-don-doi-tac.test.ts`, `src/modules/orders/dat-gap-hien-thi.test.ts`, `tests/e2e/orders.mjs`, `dispatch.mjs`, `trip.mjs`, `catalog.mjs`; câu thông báo — `src/shared/thong-bao.test.ts`, `thong-bao-giao.test.ts`, `thong-bao-doi.test.ts`, `web-push.test.ts`. Các bài ghim giá trị ô (`permissions.test.ts`) **không** đổi vì không ô nào đổi giá trị.

## 4. Danh sách mã hành động của lớp nội bộ (cho người thi công)
Nguồn: rà từng khuôn chữ `detail` ngày 2026-10-18 (người rà chỉ đọc, đối chiếu `src/shared/lich-su-doi-tac.ts`). Cách giữ chữ dùng lại bốn cách của D-1 (`giu`, `bo`, `chi-nhom-huy`, `cat-ly-do`). Mọi dòng của lớp nội bộ: **không tên, không mã người làm** (đ2a).

| Nhóm | Mã hành động | Chữ | Ghi chú từ lần rà |
|---|---|---|---|
| Đơn đổi gì | `created`, `updated` | giu | có tên hồ sơ bên đặt, giá danh mục → giá bán; Đối tác lập thì tên bên đặt = người lập (đã hiện ở đầu trang đơn) |
| | `trip_updated`, `order_leg_added`, `order_leg_updated`, `order_leg_closed` | giu | ngày/giờ/nơi của đơn; nơi đón và tên dịch vụ nhập tay là chữ tự gõ (`trip_updated` chưa che dãy số dài — lệch cũ, ngoài phạm vi) |
| | `order_leg_short_notice` | giu | đã rút gọn trước bởi `lichSuTheoVai` cho người không có ô xem đủ (R-P21) |
| | `order_passenger_changed`, `confirmed` | giu | số đếm; giá lệch danh mục |
| | `cancelled`, `order_cancelled_by_field`, `order_cancel_reason_classified` | giu | nhãn lý do hoặc chữ tự gõ (ca "Khác") |
| | `order_money_adjusted`, `order_money_adjusted_by_field` | giu | số khách trước → sau; lý do (văn phòng: mã đóng; hướng dẫn viên: tự gõ) |
| | `payment_recorded`, `order_delivered`, `order_completed` | giu | "trả trước" / "lúc Đã giao" / không chữ — không tên người thu |
| | `order_handler_changed` | giu | "từ <phụ trách cũ> sang <mới>" — tên người phụ trách là dữ liệu đơn; dòng không nói ai bấm |
| | `order_claimed` | **bo** | khuôn "… sang <tên>" luôn là **chính người bấm** |
| | `booker_changed` | giu | tên hồ sơ bên đặt cũ → mới |
| Tiền của đơn trong sổ (lựa chọn phụ của chủ có thể gác cả nhóm bằng `ledger.view` không ngữ cảnh) | `order_terms_captured`, `order_terms_recaptured`, `order_terms_manual` | giu | số dòng có/thiếu mức; mức cũ → mới, tên hồ sơ người bán (không phải người bấm) |
| | `ledger_company_received`, `ledger_refund`, `ledger_adjustment_withdrawn`, `ledger_bank_txn_linked`, `deposit_refund_paid`, `deposit_transferred_out`, `deposit_transferred_in` | giu | không chữ hoặc chữ cố định |
| | `ledger_adjustment`, `ledger_adjustment_requested`, `ledger_adjustment_approved`, `ledger_adjustment_rejected` | giu | lý do tự gõ (dòng duyệt mang lý do của **người đề nghị**, không tên); số dư trước → sau |
| | `ledger_adjustment_affected` | giu | câu cố định xưng "bạn" — đọc lạ với người khác, lệch cũ, ngoài phạm vi |
| | `ledger_receipt_replaced`, `ledger_reversal` | giu | số tiền, cờ "đổi người thu" (không tên), lý do tự gõ |
| | `deposit_refund_approved`, `deposit_transfer_approved`, `deposit_approval_voided`, `deposit_outside_recorded`, `deposit_outside_confirmed`, `deposit_outside_rejected` | giu | lý do tự gõ |
| Dấu nhập kế toán | `order_accounting_entry_marked`, `order_accounting_entry_unmarked` | giu | **chỉ** khi qua `accounting.entry.view` của đơn (ADR-0060, như hôm nay) |
| Ẩn | `exported_png`, `exported_pdf` | — | không còn chỗ ghi trong mã; xếp ẩn để đóng mặc định |
| Ẩn | mọi hành động không gắn đơn (tài khoản, hồ sơ, xe, điều phối, danh mục, địa điểm, góp ý, thông báo, hệ thống) và `ledger_settlement`, `ledger_period_closed`, `prc_*` | — | không bao giờ có `order_id`; vẫn phải liệt kê để hàng rào biên dịch đủ |

**Hàng rào:** như D-1 — kiểu "chưa phân loại" làm `npm run typecheck` đỏ khi một hành động mới chưa nằm ở danh sách nội bộ, cộng một bài kiểm khoá danh sách cho phép bằng bản chủ duyệt đặt trong bài. Người thi công chọn: một tệp thuần mới, hoặc mở rộng `lich-su-doi-tac.ts` thành hai danh sách dùng chung hàm cắt chữ — miễn danh sách Đối tác không đổi.
