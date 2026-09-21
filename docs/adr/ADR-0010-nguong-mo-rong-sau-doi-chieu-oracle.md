# ADR-0010 — Ngưỡng mở rộng sau đối chiếu Oracle TCA: phạm vi theo nơi, hoá đơn là bản chụp, tác nhân tự động

- **Trạng thái:** **accepted** — chủ dự án duyệt ngày 2026-09-21 ("2- Duyệt"). Sau khi accepted chỉ sửa trạng thái, thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-21   **Người phê chuẩn:** chủ dự án (duyệt ngày 2026-09-21)
- **Loại quyết định:** **cửa hai chiều** — không đổi mã hay cấu trúc dữ liệu ngay; ghi lại ngưỡng (điều kiện) để quyết định sau này khi làm N3/tích hợp AI, có thể đảo lại nếu điều kiện thay đổi
- **Liên quan:** ADR-0004 (mở rộng phạm vi thu tiền/hoá đơn; ADR N3 sẽ kế thừa), ADR-0007 (bản đồ quyền → thao tác, `Scope` của `src/shared/permissions.ts`), báo cáo đối chiếu `docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md` §6.5 (P-6, P-7, P-11)

## Bối cảnh
Đối chiếu kiến trúc với tài liệu tham chiếu Oracle TCA (Trading Community Architecture) nêu ba điểm mà Oracle TCA có sẵn nhưng `tourdao-sales` chưa có, và kết luận: chưa có nhu cầu thật để làm ngay, nhưng cần ghi lại **ngưỡng** — điều kiện cụ thể để biết khi nào phải quay lại làm — để tránh vừa làm sớm khi không ai dùng, vừa quên mất khi nhu cầu thật sự xuất hiện.

1. **Phạm vi dữ liệu theo tổ chức (P-6).** Oracle TCA cho phép phạm vi truy cập theo đơn vị tổ chức/site. `src/shared/permissions.ts` hiện chỉ có năm giá trị `Scope` (`none/own/assigned/ownOrAssigned/any`), không có phạm vi theo nơi (địa điểm/chi nhánh). Dữ liệu nền cho phạm vi này đã có sẵn: `pty_party_role.location_id` (ADR-0008).
2. **Địa chỉ xuất hoá đơn nhiều bản, gắn hồ sơ tổ chức (P-7).** Oracle TCA có `HZ_PARTY_SITES` cho phép một tổ chức có nhiều địa chỉ dùng cho các mục đích khác nhau. ADR-0004 đã dự kiến N3 (sổ thu tiền, yêu cầu hoá đơn) nhưng chưa ghi rõ việc lưu địa chỉ xuất hoá đơn theo hồ sơ hay theo từng yêu cầu.
3. **Tác nhân tự động ghi dữ liệu nghiệp vụ thay người dùng, kể cả AI (P-11).** Oracle TCA phân biệt người dùng và tiến trình hệ thống ghi dữ liệu qua API có định danh riêng. Dự án đã có MỘT tác nhân tự động ghi dữ liệu hệ thống — Cron đồng bộ danh mục (ghi `catalog_item`, nhật ký `catalog_synced` với `staff_id` NULL, xem Quyết định điều 3) — nhưng chưa có tác nhân nào ghi dữ liệu nghiệp vụ **thay mặt một người dùng** (đơn, hồ sơ, phân công…); lộ trình có khả năng tích hợp trợ lý AI làm việc đó; cần chốt nguyên tắc trước khi việc đó xảy ra, để không phải vá an ninh sau khi đã có tác nhân ghi thẳng.

Đây là hạng mục "chỉ ghi tài liệu, không mã" (mục 6.5 của báo cáo đối chiếu): không có thay đổi hành vi hệ thống, chỉ ghi ngưỡng để tham chiếu về sau.

## Quyết định

**1. Phạm vi dữ liệu theo tổ chức (P-6).** `Scope` của `src/shared/permissions.ts` giữ nguyên năm giá trị (`none/own/assigned/ownOrAssigned/any`).
Chỉ thêm phạm vi theo nơi (`location`, dựa trên `pty_party_role.location_id` đã có) khi xảy ra MỘT trong hai điều: (i) công ty có chi nhánh/điểm bán thứ hai;
(ii) đại lý được đăng nhập để xem đơn của chính họ. Khi đó viết ADR mới thay điều này.

**2. Thông tin xuất hoá đơn là bản chụp theo từng yêu cầu (P-7).** Không làm bảng địa chỉ hồ sơ kiểu `party_site`. Khi làm N3 (`bil_*`, ADR-0004),
tên đơn vị, MST, địa chỉ, email nhận được CHÉP vào chính yêu cầu xuất hoá đơn tại thời điểm tạo; `pty_organization.address`/`invoice_email` chỉ là giá trị gợi ý điền sẵn.

**3. Tác nhân tự động, kể cả AI (P-11).** Áp dụng cho tác nhân ghi dữ liệu nghiệp vụ **thay mặt một người dùng** (đơn, hồ sơ, phân công… — ví dụ trợ lý AI). Tác nhân như vậy phải: gọi qua API có phiên như người dùng; có tài khoản `staff`
riêng mang quyền tối thiểu; để lại `audit_log.staff_id` là chính tài khoản đó. Không có đường ghi thẳng D1 cho tác nhân tự động.
Điều này áp dụng TRƯỚC khi tích hợp bất kỳ trợ lý nào có quyền ghi thay người dùng.
**Ngoại lệ đã có, giữ nguyên:** Cron đồng bộ danh mục (`runScheduledSync` → `syncCatalog(env, null)`, `src/index.ts`) ghi `catalog_item` và nhật ký `catalog_synced` với `staff_id` NULL — đây KHÔNG phải tác nhân ghi thay người dùng (đồng bộ danh mục từ Google Sheet, không phải dữ liệu nghiệp vụ do người vận hành nhập), đã ghi từ trước ở `migrations/0006_catalog.sql` và `docs/SYSTEM-DESIGN.md` ("`staff_id` NULL = hệ thống/Cron"); quy tắc này không bắt Cron phải có tài khoản `staff` riêng.

## Lý do
- **P-6:** thêm phạm vi `location` ngay bây giờ là làm trước khi có nhu cầu thật — hiện công ty chỉ có một điểm bán và chưa có đại lý đăng nhập; dữ liệu nền đã sẵn (`pty_party_role.location_id`, ADR-0008) nên khi cần, việc thêm giá trị `Scope` là nhỏ, không phải dựng lại mô hình dữ liệu.
- **P-7:** chụp bản ghi tại thời điểm tạo yêu cầu hoá đơn (thay vì bảng địa chỉ nhiều-nhiều kiểu `party_site`) giữ đúng nguyên tắc "hồ sơ khách/đại lý đơn giản, đúng cỡ nhu cầu hiện tại" và tránh việc yêu cầu hoá đơn cũ bị đổi ngược khi hồ sơ tổ chức được sửa sau này — đúng tinh thần "vết tích lịch sử không đổi theo hồ sơ hiện tại" đã dùng ở các module khác (ví dụ `audit_log`).
- **P-11:** ghi nguyên tắc trước khi có tác nhân tự động đầu tiên rẻ hơn nhiều so với sửa lại sau khi đã có tích hợp đang chạy; giữ đúng nguyên tắc "mọi thay đổi dữ liệu qua API có phiên, có dấu vết" đã áp dụng cho người dùng thật, không tạo ngoại lệ cho tác nhân máy.

## Phương án bị loại
- **Thêm phạm vi `location` ngay bây giờ:** bị loại vì chưa có chi nhánh thứ hai hay đại lý đăng nhập — sẽ là suy đoán thiết kế không có ca dùng thật để kiểm.
- **Làm bảng `party_site` (nhiều địa chỉ/tổ chức) theo đúng mô hình Oracle TCA:** bị loại vì tăng độ phức tạp mô hình dữ liệu (bảng mới, quan hệ nhiều-nhiều, luật "địa chỉ mặc định") cho một nhu cầu mà bản chụp theo yêu cầu đã giải quyết được.
- **Hoãn quy tắc P-11 tới khi tích hợp AI thật sự bắt đầu:** bị loại vì lúc đó áp lực giao việc nhanh dễ khiến quy tắc bị bỏ qua hoặc thêm muộn sau khi đã có đường ghi thẳng D1; ghi trước vào ADR để mọi thiết kế tích hợp sau này phải tuân theo ngay từ đầu.

## Hệ quả
- Không đổi mã, không đổi cấu trúc dữ liệu ở ADR này.
- Khi ADR này được duyệt thì `docs/ARCHITECTURE.md`/`docs/SYSTEM-DESIGN.md` §8 (nếu có nội dung về `Scope`) thêm trỏ về ADR này khi có ai đề xuất thêm phạm vi theo nơi, để không phải suy luận lại từ đầu — chưa thêm trỏ bây giờ vì ADR còn `proposed`.
- ADR N3 (thu tiền/hoá đơn, kế thừa ADR-0004) phải ghi rõ điều 2 (bản chụp) khi thiết kế bảng yêu cầu hoá đơn (`bil_*`).
- Khi bắt đầu tích hợp trợ lý AI có quyền ghi dữ liệu thay người dùng, thiết kế đó phải tuân theo điều 3 ngay từ ADR/đặc tả đầu tiên, không phải vá sau. Hai điều còn chưa có đường giải quyết và phải chốt trong thiết kế tích hợp đầu tiên: (i) đăng nhập hiện đòi token Turnstile ở trình duyệt, tác nhân tự động chưa có đường đăng nhập không qua Turnstile; (ii) chế độ bảo trì (`mnt_setting`) khi bật chặn mọi số điện thoại ngoài `allowed_phones` ở máy chủ, kể cả phiên đang mở — phải quyết tác nhân tự động có bị chặn theo cùng danh sách hay cần một cơ chế riêng.
