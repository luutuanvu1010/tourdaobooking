# ADR-0162 — Bản Development độc lập ở dev.tourdao.vn và một lệnh lên bản chính thức

- **Trạng thái:** **proposed** 2026-11-04, chờ chủ dự án duyệt. Lời chủ, nguyên văn: *«Vậy thì cả 2, vừa cho phép xóa ở bản thật, vừa tạo 1 bản hoàn toàn độc lập là Development (staging) để phát triển, sau đó chỉ với 1 lệnh là đẩy sang bản chính thức được . Bản thử nghiệm chạy ở tên miền dev.tourdao.vn»*.
- **Cửa:** hai chiều. Tắt bản Development không ảnh hưởng bản chính thức.
- **Loại:** việc lớn (triển khai, luật).
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 3** (cùng [ADR-0164](ADR-0164-toan-quyen-an-du-lieu-vo-hieu-hoa-va-co-lap.md), [ADR-0165](ADR-0165-an-don-co-tien-bang-dao-tien.md)). Trang ghép: `docs/superpowers/specs/2026-11-04-trang-ghep-an-du-lieu.md`.
- **Xây trên lỗ đang hở:** không chạm lỗ mới. Lệnh mới gọi lại nguyên các cổng phát hành đang có, không bỏ cổng nào. Development chạy cùng Cron nên mang cùng nợ HC-5.11, nhưng trên dữ liệu thử.
- **Quan hệ với luật:** thi hành Hiến pháp N2 ở bản kho luật gốc (không đi thẳng ra môi trường thật mà không qua một môi trường thử giống thật). Đ5 **nới một hàng rào của chính AI** (Hiến pháp Điều 9.4), nên chỉ có hiệu lực khi chủ duyệt. `CLAUDE.md` §5, §8 và `docs/SO-HANG-RAO.md` được sửa khi thi công, không sửa trong bản đề xuất này.

## Bối cảnh

Hôm nay chỉ có một bản chạy trên mạng là `booking.tourdao.vn`. Bản chạy ở máy thì không thử được từ điện thoại ngoài mạng nội bộ, nên nhiều thứ chỉ thử được trên dữ liệu thật. Chủ muốn phát triển và thử ở một bản riêng, rồi đưa sang bản chính thức bằng một lệnh.

## Đ1 — Độc lập hoàn toàn

Bản Development là một Worker riêng ở `dev.tourdao.vn`. Nó có cơ sở dữ liệu D1 riêng, ba kho tệp riêng, trạm Bảng tin riêng, lịch chạy 15 phút riêng và đường gửi thư riêng. Bí mật cũng riêng: `SESSION_SECRET`, `LAN_GUI_SECRET`, `MFA_ENCRYPTION_KEY`, `VAPID_PRIVATE_KEY`, khoá Turnstile và khoá trợ lý. Biến công khai cũng riêng: khoá thông báo và Face ID theo tên miền của nó.

Worker đang chạy của bản này không có đường chạm tới dữ liệu của bản chính thức. Lệnh đưa mã lên thì khác: `len-dev` dùng cùng tài khoản Cloudflare, nên lớp chống nhầm ở đó là bài so cấu hình dưới đây, không phải ranh giới vật lý.

Ngoại lệ duy nhất: danh mục dịch vụ vẫn đọc cùng Google Sheet, vì Nền tảng chỉ đọc Sheet, không ghi.

Bài kiểm máy so hai cấu hình: đỏ khi cấu hình Development chứa tên hay mã tài nguyên của bản chính thức, và đỏ khi hai bên không có cùng một bộ tài nguyên.

## Đ2 — Dữ liệu và những gì đi ra ngoài

- **Không chép dữ liệu thật sang Development.** Bản này dùng dữ liệu tạo sẵn và tài khoản thử riêng, có lệnh làm mới về trạng thái sạch.
- **Thư điện tử** chỉ gửi tới danh sách địa chỉ do chủ khai; danh sách trống thì không gửi. Thông báo chỉ tới máy đã đăng ký trên chính bản này.

## Đ3 — Không thể nhầm hai bản

Mọi trang của Development có dải màu cố định ghi «BẢN THỬ». Tên cài lên điện thoại là «Tour Đảo Dev». Máy tìm kiếm không được lập chỉ mục.

## Đ4 — Một lệnh lên bản chính thức

Chủ gõ `npm run len-chinh-thuc -- <nhánh>`. AI không được chạy lệnh này. Lệnh làm theo thứ tự:

1. So **mã commit** của bản đang chạy trên Development với bản sắp lên. Khác nhau thì dừng trước khi ghi bất cứ thứ gì, vì đó là bản chưa được thử. Hôm nay Nền tảng chỉ lộ số phiên bản do người gõ, nên hai bản khác nhau có thể cùng số; vì vậy Development phải lộ mã commit lúc build, thiếu thì cổng này vô nghĩa.
2. Nối `day-len` rồi `trien-khai`, giữ nguyên mọi cổng: mục nhật ký thay đổi, test, typecheck, e2e, cổng phiên bản, điểm khôi phục, migration, deploy, kiểm dữ liệu, kiểm phiên bản sau deploy.
3. Mọi câu hỏi xác nhận đang có cũng giữ nguyên (đề xuất của người soạn): chủ gõ một lệnh nhưng vẫn được hỏi trước các bước ghi. Chủ muốn gộp thành một câu hỏi thì ghi khi duyệt.

Lệnh chỉ mang **mã và cấu trúc dữ liệu (migration)**, không mang dữ liệu. Bản sửa gấp cũng đi qua `len-dev` rồi `len-chinh-thuc`, không đi tắt (Hiến pháp N2, N6). Từ khi lệnh mới chạy được, `day-len` và `trien-khai` không gõ trực tiếp nữa; điều này dựa vào kỷ luật.

## Đ5 — AI được làm gì trên Development

AI được chạy đúng một lệnh có tên, `npm run len-dev`, để áp migration và deploy lên Development. Lệnh chỉ đọc cấu hình Development và kiểm bài so cấu hình ở Đ1 trước khi chạy; hàng rào không nhìn thấy `wrangler` chạy bên trong một lệnh có tên, nên chính lệnh này phải tự kiểm.

`wrangler deploy` thô, `--remote`, `secret`, `day-len`, `trien-khai` vẫn bị chặn như cũ. `len-chinh-thuc` là tên mới, hàng rào chưa biết, nên **phải thêm chặn** (hook và danh sách cấm) ngay khi tạo lệnh; thêm chặn là siết nên AI được làm.

Chủ tự tạo tài nguyên và đặt bí mật cho Development một lần, theo danh sách lệnh AI soạn sẵn.

## Hệ quả chủ cần biết

- Development chỉ chạy một bản mỗi lúc. Phiên sau đè phiên trước, và cổng ở Đ4 mục 1 chặn việc đưa nhầm bản lên chính thức.
- Nếu `main` đã đi trước, nhánh phải dựng lại trên `main` và thử lại trên Development, vì lúc đó nó đã là một bản khác.
- Dữ liệu tạo sẵn không làm lộ những lỗi chỉ dữ liệu thật mới có. Development giảm rủi ro chứ không thay được việc kiểm sau khi lên chính thức.
- **Đã kiểm 4/11 bằng tra DNS:** `tourdao.vn` đang ở Cloudflare, `dev.tourdao.vn` chưa có bản ghi. **Chưa kiểm:** chi phí thêm.

## Việc kèm khi thi công

Mã đang gắn cứng bản chính thức phải đổi theo môi trường: `public/_headers` (Bảng tin có thể bị trình duyệt chặn trên tên miền khác), `VAPID_SUB` ở `src/shared/web-push.ts`, `DB` ở `scripts/release-lib.mjs`. Dải «BẢN THỬ» và tên cài cần một biến nhận biết môi trường. Thêm chặn `len-chinh-thuc` vào hàng rào.

## Tiêu chí nghiệm thu

1. Tạo đơn trên `dev.tourdao.vn` thì đơn không xuất hiện trên `booking.tourdao.vn`, và ngược lại.
2. Sửa cố ý cấu hình Development thành mã D1 của bản chính thức thì bài so cấu hình đỏ và `len-dev` từ chối chạy; hoàn nguyên thì xanh.
3. AI thử `wrangler deploy`, `npm run trien-khai` và `npm run len-chinh-thuc` đều bị chặn; ghi ngày quan sát vào `docs/SO-HANG-RAO.md`.
4. `len-chinh-thuc` với một bản khác bản đang chạy trên Development dừng trước khi ghi gì, kể cả khi hai bản cùng số phiên bản.
5. Development không gửi thư tới địa chỉ ngoài danh sách.
