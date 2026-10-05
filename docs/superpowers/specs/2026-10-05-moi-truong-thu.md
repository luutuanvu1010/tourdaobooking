# Đặc tả: môi trường thử giống thật cho CRM (staging)

- Ngày: 2026-10-05. Trạng thái: chủ dự án đã chọn mục 6 (2026-10-05, "đồng ý cả bốn khuyến nghị"); kế hoạch thi công ở `docs/superpowers/plans/2026-10-05-moi-truong-thu-ke-hoach.md`. Chủ dự án đã đồng ý dựng môi trường thử (2026-10-05).
- Vì sao: Hiến pháp N2 (cả v2.3.0 qua `playbook/FRAMEWORK.md:748` lẫn v4.1.0) cấm đưa thẳng ra bản thật mà không qua môi trường thử giống thật; QĐ-H12 giữ CRM ở ghim v2.3.0 cho tới khi có môi trường này và lời khai của nó được chủ duyệt (H12a). Xem `docs/superpowers/specs/2026-10-05-doi-chieu-bo-luat-v2.md` mục 2.
- Loại việc: việc lớn (triển khai, cấu hình Cloudflare). AI soạn cấu hình và kịch bản trên nhánh; mọi lệnh tạo tài nguyên, áp migration, deploy, đặt bí mật do chủ tự chạy (CLAUDE.md §8). Thi công cần kế hoạch, ADR và người kiểm độc lập.

## 1. Hiện trạng
`wrangler.jsonc`: một Worker `tourdao-sales`, route `booking.tourdao.vn`, một D1 `tourdao-sales-db`, Durable Object `BangTin`, cron 15 phút đồng bộ danh mục, `send_email`, vars `PASSKEY_RP_ID`/`PASSKEY_ORIGIN` theo tên miền thật, `VAPID_PUBLIC_KEY`. Thử cục bộ (`wrangler dev`, e2e trên D1 tạm, `scripts/dev-iphone.mjs`) lệch thật ở Turnstile (tắt khi thiếu khoá), passkey (ghi đè rpId), Email Service (mô phỏng), tên miền và HTTPS.

## 2. Thiết kế đề xuất
Một môi trường `staging` khai trong chính `wrangler.jsonc` (khối `env.staging`), cùng mã, cùng migration, tài nguyên riêng:

| Thành phần | Bản thật | Bản thử |
|---|---|---|
| Worker | `tourdao-sales` | `tourdao-sales-staging` |
| Tên miền | `booking.tourdao.vn` | `thu.booking.tourdao.vn` (đề xuất, chủ chọn ở mục 6) |
| D1 | `tourdao-sales-db` | `tourdao-sales-staging-db`, áp cùng thư mục `migrations/` |
| Durable Object Bảng tin | lớp `BangTin` | cùng lớp, không gian tên riêng của Worker thử |
| Cron đồng bộ danh mục | 15 phút | tắt mặc định; Sheet chỉ đọc nên bật được khi cần |
| Passkey | rpId tên miền thật | rpId tên miền thử (cấu hình theo env, không ghi đè tay) |
| Turnstile | khoá thật | site riêng hoặc thêm tên miền thử vào site hiện có |
| Web Push | cặp VAPID thật | cặp VAPID riêng |
| Email | bật khi có hai bí mật | tắt (không đặt bí mật) |
| Bí mật | bộ thật | bộ riêng, đặt bằng `wrangler secret put --env staging` |
| Ai được vào | nhân viên, đối tác | chỉ chủ và người thử, chặn bằng Cloudflare Access |

Dữ liệu: không chép dữ liệu thật vào bản thử (có số điện thoại, giấy tờ, tiền). Dùng dữ liệu gieo của e2e cộng một bộ tình huống nghiệp vụ; khi cần thử trên hình dạng dữ liệu thật thì chỉ dùng bản đã làm mờ, chủ duyệt riêng.

## 3. Quy trình phát hành mới
`npm run trien-khai` thêm một chặng trước bản thật: áp migration lên D1 thử → deploy Worker thử → chạy bộ kiểm khói (đăng nhập, lập đơn, xác nhận, thu tiền, Bảng tin) trên tên miền thử → `kiem-phien-ban.mjs` cho bản thử → chủ bấm qua → rồi mới tới các bước bản thật hiện có (điểm khôi phục, migration, deploy, audit, kiểm sau deploy). Hàng rào AI không đổi: AI vẫn không chạy lệnh remote nào.

## 4. Lời khai giống thật (cho sổ hàng rào, H12a)
Giống ở: nền tảng (Workers, D1, Durable Object, Assets, custom domain, HTTPS), cấu hình (Turnstile bật, passkey trên tên miền thật của nó, Web Push), mã và migration. Khác ở: dữ liệu (gieo hoặc làm mờ), email (tắt), lượng người dùng. Chủ duyệt lời khai này rồi mới được tính là đạt H12.

## 5. Việc thi công (sau khi chủ chọn mục 6)
1. AI: khối `env.staging` trong `wrangler.jsonc`, sửa `src/` chỗ đọc rpId/origin nếu cần, chặng thử trong `scripts/release-lib.mjs`, bộ kiểm khói, dòng sổ hàng rào, ADR. Test đỏ trước xanh sau; người kiểm độc lập.
2. Chủ: tạo D1 thử, bản ghi tên miền, Access, các bí mật thử; chạy lần đầu theo runbook AI soạn.
3. Quan sát chặn thật một lần (P16): cố ý làm hỏng một bước trên bản thử, thấy cổng dừng, không tới bản thật.

## 6. Câu cần chủ dự án chọn
1. Tên miền bản thử: `thu.booking.tourdao.vn` (khuyến nghị) hay địa chỉ `workers.dev` không cần DNS.
2. Dữ liệu: chỉ dữ liệu gieo (khuyến nghị) hay thêm bản chép dữ liệu thật đã làm mờ.
3. Ai được vào bản thử: chỉ chủ (khuyến nghị lúc đầu) hay thêm vài nhân viên thử.
4. Cron đồng bộ danh mục trên bản thử: tắt (khuyến nghị) hay bật.

Chủ dự án chọn 2026-10-05: tên miền `thu.booking.tourdao.vn`; chỉ dữ liệu gieo; lúc đầu chỉ chủ được vào (Cloudflare Access); cron đồng bộ danh mục tắt trên bản thử.
