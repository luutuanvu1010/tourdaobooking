# ADR-0003 — Chuẩn mô hình dữ liệu (theo triết lý Oracle và chuẩn ER/CASE)

- **Trạng thái:** **accepted** (chủ dự án duyệt 2026-09-20). Sau khi accepted chỉ sửa trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-20   **Người phê chuẩn:** chủ dự án (đã duyệt 2026-09-20)
- **Loại quyết định:** **cửa một chiều** — cột kiểm toán, khoá, hiệu lực có mặt trên mọi bảng mới
- **Liên quan:** ADR-0001, ADR-0002; `docs/ARCHITECTURE.md` mục "Luật dữ liệu" (ADR này chỉ siết chặt thêm)

## Bối cảnh
Chủ dự án yêu cầu (2026-09-20) mô hình dữ liệu "chuẩn theo triết lý Oracle", để sau này sửa dễ, tách bạch, không phải làm lại; đã chọn cả ba: Party–Role–Relationship (ADR-0001), **toàn vẹn nằm ở CSDL**, **chuẩn ER/CASE (Barker)**. CSDL là D1/SQLite: **không có schema và stored procedure**; có khoá ngoại, `CHECK`, trigger, view, và `PRAGMA defer_foreign_keys` (hoãn kiểm khoá ngoại tới cuối giao dịch — dùng được khi dựng lại bảng theo trình tự ở điều 10; `PRAGMA foreign_keys` thì không đổi được trong giao dịch). Phải mô phỏng bằng tiền tố bảng (ADR-0002), view và trigger.

## Quyết định (áp cho MỌI bảng mới; bảng cũ áp khi được chạm tới)
1. **Chuẩn hoá tới 3NF.** Mỗi thực thể có định danh duy nhất: khoá chính thay thế `id TEXT` (uuid) cho bảng nghiệp vụ; khoá tự nhiên có `UNIQUE` riêng khi nghiệp vụ đòi duy nhất. **Bảng tra cứu dùng mã `TEXT` ổn định, viết hoa, làm khoá chính** (`pty_role_type.code`, `dsp_task_kind.code`, `stf_permission_type.code`…), không dùng uuid: mã phải xuất hiện được trong vị từ của chỉ mục có điều kiện và trong mã nguồn. *Ngoại lệ đã có:* `catalog_item`, `catalog_override` dùng mã dịch vụ `code` (khoá tự nhiên do Sheet cấp) làm khoá chính — giữ nguyên.
2. **Tên:** bảng số ít, tiền tố module (ADR-0002), chữ thường gạch dưới; khoá ngoại `<thực thể>_id`; thời điểm máy `*_at` (ISO-8601 UTC); ngày/giờ dân sự `*_date` (`YYYY-MM-DD`) / `*_time` (`HH:MM`) theo giờ Việt Nam; tiền `INTEGER` VNĐ.
3. **Toàn vẹn khai báo trước:** `NOT NULL`, khoá ngoại, `UNIQUE`, `CHECK`.
   - **Tập giá trị đóng** (không bao giờ đổi; vd loại hồ sơ `PERSON | ORGANIZATION`) dùng `CHECK`.
   - **Tập giá trị mở** (loại vai trò, loại địa điểm, loại nhiệm vụ, hình thức thu, quyền app) là **bảng tra cứu** có khoá ngoại: thêm giá trị = thêm một dòng, không sửa schema hay mã. Điều này **siết chặt** quy tắc cũ "kiểm tập mở ở code, không CHECK" (vẫn mở rộng được, nhưng có khoá ngoại). *Ngoại lệ đã ghi:* `audit_log.target_id` là tham chiếu **đa hình**, cố ý không có khoá ngoại (toàn vẹn kiểm ở kiểm toán định kỳ, Điều 8.3); `audit_log.action`/`target_type` giữ nguồn duy nhất ở `src/shared/audit-actions.ts` (quyết định của `0007`, vì `web/` dùng chung); nếu về sau cần bảng tra cứu thì bảng đó phải được **sinh ra** từ file đó, không nhập tay.
4. **Khoá ngoại:** hành động khi xoá mặc định `NO ACTION`; `RESTRICT` chỉ cho bảng cha không bao giờ phải dựng lại; **`CASCADE` cấm cho bảng mới**. *Nợ đã ghi:* `order_item`/`order_service` đang `ON DELETE CASCADE` (xem `ARCHITECTURE.md` "Luật dữ liệu"); chỉ an toàn vì chưa có đường xoá đơn.
5. **Trigger là lưới cuối** cho luật nhiều bảng (như `0008`); luật chính vẫn ở mã thuần + câu `UPDATE` có điều kiện. Thông báo lỗi trigger có tiền tố mã (`order_frozen: …`).
6. **Cột kiểm toán ("WHO columns" của Oracle)** trên mọi bảng nghiệp vụ: `created_at`, `created_by`, `updated_at`, `updated_by`. **`created_by`/`updated_by` là `TEXT NULL` KHÔNG có khoá ngoại** (id tài khoản để truy vết; `NULL` = hệ thống/migration): chúng là dấu vết nguồn gốc chứ không phải quan hệ, và không có khoá ngoại thì không tạo vòng `parties ⇄ staff` cũng như không có bài toán "dòng đầu tiên do ai tạo". Khoá lạc quan dùng `updated_at` như A1 (**không** thêm số phiên bản thứ hai — P6, P11). Bảng chỉ-thêm (phiếu thu, nhật ký) chỉ có `created_*`. Vì không có khoá ngoại nên đối chiếu `created_by` với `staff.id` là việc của kiểm toán định kỳ (Điều 8.3), không của CSDL.
7. **Hiệu lực theo thời gian** cho quan hệ có thời hạn: hai dạng, chọn theo độ chi tiết nghiệp vụ.
   - Cấp **ngày** (vai trò, quan hệ hồ sơ, liên hệ): `valid_from_date`, `valid_to_date` (ngày dân sự Việt Nam; `valid_to_date IS NULL` = còn hiệu lực), so với `vnToday()` — không so với `date('now')` (UTC).
   - Cấp **thời điểm** (lịch sử người phụ trách, phân công): `valid_from_at`, `valid_to_at` (UTC).
   - Mọi bảng có `CHECK (valid_to_* IS NULL OR valid_to_* >= valid_from_*)`.
   - **Chỉ mục duy nhất có điều kiện** `WHERE valid_to_* IS NULL` chỉ bảo đảm *tối đa một dòng đang mở* cho mỗi khoá nghiệp vụ. **Chống chồng lấn khoảng đã đóng bắt buộc dùng trigger** `BEFORE INSERT/UPDATE` (điều kiện giao nhau `NOT (COALESCE(new.to,'9999-12-31') < old.from OR new.from > COALESCE(old.to,'9999-12-31'))`; dạng thời điểm dùng `'9999-12-31T00:00:00Z'` — nếu không có `COALESCE`, vị từ trả `NULL` và **không chặn** khi khoảng còn mở, tức trường hợp phổ biến nhất), vì SQLite không có exclusion constraint.
8. **Không xoá cứng** bản ghi nghiệp vụ mới: kết thúc hiệu lực hoặc `active = 0`. Bảng chỉ-thêm không sửa, không xoá; sai thì ghi dòng đảo (ADR của N3).
9. **Sổ dữ liệu:** mỗi bảng/view mới có mục ở `docs/data-dictionary.json` (ADR-0002 điều 1): mô tả, khoá, khoá ngoại, bất biến, **cách kiểm bằng máy** (theo mẫu `01-CONTENT_MODEL`, `04-CONSTRAINTS`, `05-URL_MAP-and-DB_SCHEMA` của playbook). Ràng buộc không có cách kiểm là ràng buộc rỗng (Điều 8.2).
10. **Di trú:** file đánh số, chỉ thêm, không sửa file đã áp remote. Đổi cột/bảng cũ theo **expand–contract** (thêm cái mới + backfill → chuyển mã → gỡ cái cũ, các migration/cổng kiểm riêng). Khi **chưa có mã cũ nào chạy trên dữ liệu thật** (remote chưa có đơn/không deploy giữa chừng) các bước có thể áp trong cùng một lần triển khai; khi đã có dữ liệu thật đang phục vụ thì phải tách thành các lần triển khai riêng. Migration phá hoại dữ liệu là cửa một chiều, cần ADR. **Ưu tiên tuyệt đối: không dựng lại bảng đang bị bảng khác tham chiếu** — dùng `ALTER TABLE … ADD COLUMN` + trigger (idiom của `0007`). Nếu buộc phải dựng lại, chỉ dùng trình tự đã kiểm chạy được (SQLite 3.51 và 3.53, 2026-09-20), **trong một giao dịch**: `PRAGMA defer_foreign_keys = true` → `CREATE TABLE <cũ>_copy AS SELECT * FROM <cũ>` → tạo bảng mới **rỗng** → `DROP TABLE <cũ>` → `ALTER TABLE <mới> RENAME TO <cũ>` → **nạp lại dữ liệu vào bảng đã đổi tên** → `DROP TABLE <cũ>_copy`. Trình tự "nạp dữ liệu vào bảng mới **trước** khi `DROP` bảng cũ" **thất bại ở `COMMIT`** (`DROP TABLE` sinh vi phạm khoá ngoại hoãn mà chỉ việc chèn dòng cha vào bảng đã đổi tên mới trừ được). Cổng: `PRAGMA foreign_key_check` trả 0 dòng, ghi điểm khôi phục D1 Time Travel trước khi áp remote, và có bằng chứng D1 hỗ trợ `defer_foreign_keys` cùng việc bọc một tệp migration trong một giao dịch.

## Lý do
- Toàn vẹn ở CSDL chặn sai sót tại nguồn thay vì dựa vào mọi đường mã nhớ kiểm (P10, N5); A1 đã chứng minh (trigger + câu `UPDATE` có điều kiện).
- Bảng tra cứu + khoá ngoại + hiệu lực biến mở rộng nghiệp vụ (thêm loại vai trò, nơi, hình thức thu) thành thao tác dữ liệu, không phải đổi cấu trúc — đúng mục tiêu "sửa dễ, không đập đi làm lại".
- Cột WHO không khoá ngoại là chuẩn Oracle Applications và giải bài toán vòng/bootstrap mà không cần cơ chế đặc biệt.
- Chuẩn tên và sổ dữ liệu làm người/tác nhân đến sau đọc hiểu ngay (P11).

## Phương án bị loại
- **Giữ kiểu hiện tại** (không cột kiểm toán, tập mở kiểm ở mã): trái yêu cầu Oracle/ER và mất truy vết ai sửa gì.
- **`CHECK` cho mọi tập giá trị**: mỗi lần thêm giá trị phải dựng lại bảng SQLite.
- **`created_by`/`updated_by` có khoá ngoại tới `staff`**: tạo vòng `parties ⇄ staff` và bài toán dòng đầu tiên.
- **Xoá cứng và khoá chính tự nhiên** (số điện thoại làm khoá): số điện thoại đổi, dùng chung; khoá thay thế an toàn hơn.
- **Số phiên bản `row_version` riêng**: hai cơ chế khoá lạc quan cho cùng một việc.
- **Chỉ mục duy nhất có điều kiện để chống chồng lấn**: không làm được, chỉ đóng vai trò "tối đa một dòng mở".

## Hệ quả
- Mỗi bảng mới thêm bốn cột kiểm toán; mỗi tập mở thêm một bảng tra cứu nhỏ — đọc tra cứu bằng `JOIN`, không bằng câu riêng (giới hạn số truy vấn mỗi lần gọi Worker, xem `HANDOFF-M4.md`).
- Bảng cũ (`orders`, `order_service`…) chưa có `created_by`/`updated_by`: bổ sung khi được chạm tới (N2/N3); trong lúc đó `audit_log` là nguồn ai-làm-gì.
- Bài kiểm kiến trúc (ADR-0002 điều 8) cũng kiểm: bảng mới đủ cột kiểm toán, có mục trong sổ, tập mở không dùng `CHECK`, không `CASCADE`.
