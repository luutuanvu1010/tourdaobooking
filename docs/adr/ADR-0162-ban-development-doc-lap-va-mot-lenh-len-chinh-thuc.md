# ADR-0162 — Bản Development độc lập ở dev.tourdao.vn và một lệnh lên bản chính thức

- **Trạng thái:** **proposed** 2026-11-04, chờ chủ dự án duyệt. Lời chủ, nguyên văn: *«Vậy thì cả 2, vừa cho phép xóa ở bản thật, vừa tạo 1 bản hoàn toàn độc lập là Development (staging) để phát triển, sau đó chỉ với 1 lệnh là đẩy sang bản chính thức được . Bản thử nghiệm chạy ở tên miền dev.tourdao.vn»*.
- **Cửa:** hai chiều. Tắt bản Development không ảnh hưởng bản chính thức.
- **Loại:** việc lớn (triển khai, luật).
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 2** (cùng [ADR-0163](ADR-0163-toan-quyen-xoa-han-du-lieu-de-thu-nghiem.md)). Trang ghép: `docs/superpowers/specs/2026-11-04-trang-ghep-ban-development-va-xoa-du-lieu.md`.
- **Xây trên lỗ đang hở:** không. Lệnh mới gọi lại nguyên các cổng phát hành đang có, không bỏ cổng nào.
- **Quan hệ với luật:** thi hành Hiến pháp N2 ở bản kho luật gốc (không đi thẳng ra môi trường thật mà không qua một môi trường thử giống thật). Đ5 **nới một hàng rào của chính AI** (Hiến pháp Điều 9.4), nên chỉ có hiệu lực khi chủ duyệt. `CLAUDE.md` §5, §8 và `docs/SO-HANG-RAO.md` được sửa khi thi công, không sửa trong bản đề xuất này.

## Bối cảnh

Hôm nay chỉ có một bản chạy trên mạng là `booking.tourdao.vn`. Bản chạy ở máy thì không thử được từ điện thoại ngoài mạng nội bộ, nên nhiều thứ chỉ thử được trên dữ liệu thật. Chủ muốn phát triển và thử ở một bản riêng, rồi đưa sang bản chính thức bằng một lệnh.

## Đ1 — Độc lập hoàn toàn

Bản Development là một Worker riêng ở `dev.tourdao.vn`. Nó có cơ sở dữ liệu D1 riêng, ba kho tệp riêng, trạm Bảng tin riêng, bí mật riêng (phiên đăng nhập, khoá thông báo, Turnstile, trợ lý) và Face ID theo tên miền của nó. Về vật lý, nó không có đường chạm tới dữ liệu của bản chính thức.

Ngoại lệ duy nhất: danh mục dịch vụ vẫn đọc cùng Google Sheet, vì Nền tảng chỉ đọc Sheet, không ghi.

Bài kiểm máy so hai cấu hình: đỏ khi cấu hình Development chứa tên hay mã tài nguyên của bản chính thức, và đỏ khi hai bên không có cùng một bộ tài nguyên.

## Đ2 — Dữ liệu và những gì đi ra ngoài

- **Không chép dữ liệu thật sang Development.** Bản này dùng dữ liệu tạo sẵn và tài khoản thử riêng, có lệnh làm mới về trạng thái sạch.
- **Thư điện tử** chỉ gửi tới danh sách địa chỉ do chủ khai; danh sách trống thì không gửi. Thông báo chỉ tới máy đã đăng ký trên chính bản này.

## Đ3 — Không thể nhầm hai bản

Mọi trang của Development có dải màu cố định ghi «BẢN THỬ». Tên cài lên điện thoại là «Tour Đảo Dev». Máy tìm kiếm không được lập chỉ mục.

## Đ4 — Một lệnh lên bản chính thức

Chủ gõ `npm run len-chinh-thuc -- <nhánh>`. AI không được chạy lệnh này. Lệnh làm theo thứ tự:

1. So bản đang chạy trên Development với bản sắp lên. Khác nhau thì dừng trước khi ghi bất cứ thứ gì, vì đó là bản chưa được thử.
2. Chạy các cổng đọc của `day-len` và `trien-khai`: mục nhật ký thay đổi, test, typecheck, e2e, cổng phiên bản. Đỏ thì dừng.
3. In tóm tắt rồi **hỏi một lần duy nhất**: bản nào, migration mới nào.
4. Gõ `c` thì gộp vào `main`, đưa lên GitHub, lấy điểm khôi phục, áp migration, deploy, kiểm dữ liệu, kiểm phiên bản sau deploy, ghi tóm tắt. Bước nào đỏ thì dừng ở đó.

Lệnh chỉ mang **mã và cấu trúc dữ liệu (migration)**, không mang dữ liệu. `day-len` và `trien-khai` được giữ làm đường khẩn cấp cho bản sửa gấp không kịp qua Development.

## Đ5 — AI được làm gì trên Development

AI được chạy đúng một lệnh có tên, `npm run len-dev`, để áp migration và deploy lên Development. Lệnh chỉ đọc cấu hình Development và kiểm bài so cấu hình ở Đ1 trước khi chạy. Mọi lệnh khác vẫn bị chặn như cũ: `wrangler deploy` thô, `--remote`, `secret`, `day-len`, `trien-khai`, `len-chinh-thuc`.

Chủ tự tạo tài nguyên và đặt bí mật cho Development một lần, theo danh sách lệnh AI soạn sẵn.

## Hệ quả chủ cần biết

- Development chỉ chạy một bản mỗi lúc. Phiên sau đè phiên trước, và cổng ở Đ4 mục 1 chặn việc đưa nhầm bản lên chính thức.
- Nếu `main` đã đi trước, nhánh phải dựng lại trên `main` và thử lại trên Development, vì lúc đó nó đã là một bản khác.
- Dữ liệu tạo sẵn không làm lộ những lỗi chỉ dữ liệu thật mới có. Development giảm rủi ro chứ không thay được việc kiểm sau khi lên chính thức.
- **Đã kiểm 4/11 bằng tra DNS:** `tourdao.vn` đang ở Cloudflare, `dev.tourdao.vn` chưa có bản ghi. **Chưa kiểm:** chi phí thêm.

## Tiêu chí nghiệm thu

1. Tạo đơn trên `dev.tourdao.vn` thì đơn không xuất hiện trên `booking.tourdao.vn`, và ngược lại.
2. Sửa cố ý cấu hình Development thành mã D1 của bản chính thức thì bài so cấu hình đỏ và `len-dev` từ chối chạy; hoàn nguyên thì xanh.
3. AI thử `wrangler deploy`, `npm run trien-khai` và `npm run len-chinh-thuc` đều bị chặn; ghi ngày quan sát vào `docs/SO-HANG-RAO.md`.
4. `len-chinh-thuc` với một bản khác bản đang chạy trên Development dừng trước khi ghi gì.
5. Development không gửi thư tới địa chỉ ngoài danh sách.
