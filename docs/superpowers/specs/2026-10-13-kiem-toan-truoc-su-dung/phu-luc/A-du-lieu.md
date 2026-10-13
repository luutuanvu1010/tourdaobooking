# Phụ lục A — Cấu trúc dữ liệu

> Mốc `483b3aa0` (bản 1.90). Người kiểm độc lập chỉ đọc; thí nghiệm schema chạy trên `node:sqlite` trong bộ nhớ dựng từ 84 migration, **không phải D1 thật**. SĐT, khoá bí mật không chép vào đây.

## Phát hiện

| Mã | Mức | Chuyện gì | Tái hiện | Tệp:dòng | Xử lý |
|---|---|---|---|---|---|
| A-1 | Medium | Migration "dựng lại bảng" `orders` (DROP rồi đổi tên) xoá im lặng dòng tiền con: `order_item`, `order_service`, `order_money_adjustment` đều `ON DELETE CASCADE`; trigger `orders_no_delete` không chạy khi `DROP TABLE`. | Đã chạy trên sqlite giả lập (foreign_keys=ON, cha có trigger chặn xoá): `DROP TABLE` thành công, bảng con còn 0 dòng. D1 có y hệt hay không: chưa kiểm. | `migrations/0003_orders.sql:27`, `0008_order_service.sql:8`, `0021_order_money_adjustment.sql:7`; `0017:16` dựa đúng tính chất này; `docs/CHANGE-GUIDE.md:229` | Thêm bài cấm `DROP TABLE` bảng cha có CASCADE vào `architecture.test.ts`. Nhỏ. |
| A-2 | Medium | Production luôn chạy `audit-invariants` **không** `--strict`. Bốn kiểm mức `warn-unless-strict` (R-N1-1, R-PTY-4 số căn cước/bằng lái lọt nhật ký, R-DSP-2a, R-ORD-7 bản sao ghi kép) vĩnh viễn chỉ là cảnh báo; dòng tóm tắt in "ĐẠT" khi mã thoát 0. | Lỗi mã mới ghi căn cước vào `audit_log.detail`; lần phát hành kế vẫn "ĐẠT". Hiện chưa có vi phạm. | `scripts/release-lib.mjs:468,505`; `tests/e2e/run.mjs:217` (chỉ chỗ gọi `--strict`); `scripts/audit-invariants.mjs:23` | Chạy `--strict` trên remote cho R-PTY-4/R-N1-1 hoặc nâng R-PTY-4 lên `fail`. Nhỏ. |
| A-3 | Medium | Danh mục tự áp thay đổi giá từ Sheet, không ngưỡng (chi tiết ở phụ lục F, F-1). | Gõ 8000 thay 800000 → trong ≤15 phút giá danh mục là 8000; Đối tác/Thực tập bị ép giá danh mục nên không tự phát hiện. Điều kiện: ai sửa được Sheet (chưa kiểm). | `src/modules/catalog/index.ts:364`, `service.ts:11-47`, `rules.ts:54` | Ngưỡng lệch giá chờ Quản trị duyệt. Lớn. |
| A-5 | Low | Khoá tháng: CSDL chỉ canh "kề tháng trước"; luật "chỉ tháng đã qua", "bắt đầu từ tháng sớm nhất" chỉ ở mã. | Trên sqlite giả lập chèn '2099-12' làm tháng đầu được, sau đó không xoá được. Chỉ xảy ra khi chạy SQL tay. | `src/modules/ky-so/rules.ts:28-38`; `0090:249` | Ghi nhận. |
| A-6 | Low | 47 bảng không có trigger chặn xoá (gồm `pty_party`, `staff`, `stf_permission`, `dsp_assignment`…). Mã không bao giờ xoá cứng; khoá ngoại che phần lớn. | Chỉ SQL tay. | grep `DELETE FROM` toàn `src/` | Ghi nhận. |
| A-7 | Low | Cột chết và ghi kép dở dang, không chủ không hạn: `company_profile.*` cũ, `orders.deposit_*`/`remaining_amount`, `staff.role/full_name`; `order_service.pickup_*` (ADR-0047 phát hành 1) không còn được đọc nhưng chưa nằm danh sách cột chết; BACKLOG không có mục "phát hành 2". Không migration nào DROP COLUMN. | Đọc `docs/data-dictionary.json` (`deprecatedColumns`), `rg pickup_time`. | `docs/data-dictionary.json` | Ghi vào BACKLOG. |
| A-8 | Low | Bất biến chỉ trigger/mã canh, không có kiểm định kỳ: `orders.total = subtotal − discount`, `line_total = quantity × unit_price`; thu trước "Đã giao" không có trần; định dạng ISO UTC; "mỗi đơn ≥ 1 người lớn" (thuộc ADR-0114, chưa duyệt). | Đọc `0007` và `billing/service.ts:313`. Gõ nhầm số 0 khi ghi lần thu → dòng "giữ hộ" lớn đến khi Kế toán đảo. | `src/modules/billing/service.ts:313` | Ghi nhận. |

## Đã kiểm, sạch (kèm cách kiểm)

- **Migration đã áp không bị sửa**: `git diff --name-only --diff-filter=M <bản triển khai> HEAD -- migrations/` rỗng cho 6 bản (1.38, 1.76, 1.81, 1.86, 1.87, 1.88). 20 tệp có hơn một commit đều sửa trước lần triển khai tương ứng.
- **84 migration chạy được trên DB trống** (sqlite giả lập): 110 bảng, 360 trigger, 39 view, 253 index.
- **Số trùng**: chỉ hai tệp `0016_*` (`ls migrations | cut -c1-4 | uniq -d`). Số kế tiếp 0094. Khoảng trống (0019, 0036, 0046–0049, 0053, 0061, 0064) vô hại vì wrangler theo tên.
- **Trigger bị gỡ không tái tạo**: chỉ `vc_unavailability_driver_closed` (gỡ có chủ ý ở 0092). Mọi `DROP TRIGGER` khác được tạo lại cùng tên.
- **Cột tiền**: `pragma table_info` mọi bảng, lọc tên tiền và kiểu không INT → chỉ ra cột chữ không phải tiền (`deposit_method`, `payment_note`, `prices_json`…). `prices_json` do máy chủ kiểm số nguyên an toàn (`catalog/index.ts:84`).
- **Số tiền từ trình duyệt**: mọi đường nhập tay kiểm số nguyên (`billing/service.ts:137,454`; `orders/fields.ts:19`; `tien-xe-than.ts:25,125`); `validateOrder` tính tổng từ `lineTotal` ở máy chủ (`orders/rules.ts:164-176`).
- **Xoá cứng**: `grep -rniE "DELETE FROM" src migrations` (bỏ test): chỉ `login_attempt`, `catalog_override`, dòng đơn nháp có lính gác (`status='draft'` + trigger đóng băng). `orders_no_delete` (`0034:106`) chặn xoá đơn nên CASCADE không kích hoạt.
- **Khoá tiền đơn**: `order_item_frozen_*`, `orders_money_frozen`, `orders_delivered_lock` (`0081`, `0044`) hiện diện.
- **Ranh giới mô-đun**: SQL `INSERT/UPDATE/DELETE` của `orders` chỉ chạm `orders`, `order_*`, `ord_*`, `audit_log`. Ngoại lệ còn lại: `NUA_NGHIEM` 6 tệp (không hạn), `XOA_CUNG_NHAP` 2 tên (chỉ được co), `DOC_AUDIT_LOG_WONGUARD` 10 tên (hạn 2027-03-31), `LEGACY_TABLES` 11 bảng (chỉ co); `catalog` LEGACY hạn 2027-03-31. `accounts` còn trong LEGACY dù không có SQL.

## `audit-invariants`: kiểm gì, chưa kiểm gì

131 kiểm trong `scripts/audit-checks.mjs`: hồ sơ/quyền (R-N1, R-LC, R-PTY…), sổ tiền (R-BIL-1/1w/3/4/6/8/13/C0–C6/D6/M1/M2/S9), đơn (R-ORD-4…15/T1/T2), vận chuyển (R-VC-1…35, VC-COST…), điều phối (R-DSP), phiên (R-AUT), giá (R-PRC-1…5), kỳ (R-KY-1/2). **Chưa kiểm định kỳ**: người hưởng hoa hồng trong bản chụp = bên đặt hiện tại của đơn chưa giao (nên K-B-3 không bị bắt); hoa hồng ≤ thành tiền (C-1); điều chỉnh cộng dồn (C-2); `orders.total = Σ dòng` (chỉ trigger); mỗi đơn ≥ 1 người lớn. Chạy trên DB local trống là vô nghĩa nên tôi không dùng làm bằng chứng "sạch"; chạy remote bị máy phân quyền từ chối (xem README mục 6).
