# Diễn tập khôi phục cơ sở dữ liệu + sao lưu định kỳ ra ngoài Cloudflare

> Ngày 2026-09-22. Trạng thái: **bản thảo chờ chủ dự án duyệt** (câu hỏi ở §6). Mã duy nhất: công cụ tách tệp `scripts/tach-ban-xuat-d1.mjs` (chỉ đọc và ghi tệp trên máy, không gọi mạng). Chưa qua kiểm độc lập.
> Nguồn: kiểm toán kiến trúc `docs/AUDIT-2026-09-22-KIEN-TRUC.md` F-04 (mục NOW của §21); chủ dự án đồng ý 2026-09-22.
> Loại việc: **triển khai/vận hành**. Mọi lệnh có `--remote` do **chủ dự án tự chạy** (CLAUDE.md §8). AI chỉ chuẩn bị, đọc kết quả chủ dán lại và ghi vào `docs/HANDOFF-N1.md`.
> Mọi lệnh ở đây **chỉ đọc** production. Không lệnh nào khôi phục đè lên production.

## 1. Vấn đề

- Hiện chỉ có Time Travel của Cloudflare (quay lại một thời điểm trong khoảng 30 ngày gần nhất). **Chưa kiểm** thời hạn thật theo gói đang dùng.
- `docs/HANDOFF-N1.md` có ghi điểm khôi phục và lệnh khôi phục, nhưng **chưa có lần nào khôi phục thử**. Một bản sao lưu chưa từng nạp lại thử thì chưa chứng minh được là dùng được.
- Không có bản sao nào nằm ngoài Cloudflare. Hỏng dữ liệu phát hiện sau hơn 30 ngày, hoặc tài khoản Cloudflare gặp sự cố, thì không lấy lại được.
- **Đã thử trên máy lúc soạn (D1 local, 2026-09-22) — bản xuất NGUYÊN KHỐI KHÔNG nạp lại được.** Người soạn đã chạy toàn bộ migration trên một D1 local trống, gieo một đơn đã xác nhận (có hồ sơ, dịch vụ, dòng tiền, nhật ký, người phụ trách), chạy `wrangler d1 export --local`, rồi nạp tệp đó vào một D1 trống khác → lỗi `no such table: main.pty_party` và **cả lần nạp bị huỷ, bản khôi phục trống**.
  - Nguyên nhân: tệp xuất tạo bảng theo thứ tự lịch sử và chèn dữ liệu ngay sau từng bảng. Bảng `staff` (tạo ở 0001) có cột `party_id` (thêm ở 0012) trỏ tới `pty_party` (tạo ở 0011, đứng **sau** `staff` trong tệp). Tương tự, `orders.booker_party_id` trỏ `pty_party`, và `order_item.service_id` trỏ `order_service`.
  - **Cách đã chạy được:** xuất cấu trúc và dữ liệu thành hai tệp riêng; tách trigger ra khỏi tệp cấu trúc (`scripts/tach-ban-xuat-d1.mjs`); nạp theo thứ tự **cấu trúc → dữ liệu → trigger**. Trigger phải nạp sau cùng, vì ví dụ `order_service_frozen_insert` chặn chèn dịch vụ của đơn đã xác nhận.
  - Kết quả: đủ dữ liệu, 18 trigger, 5 view, 19 dòng lịch sử migration; khoá nhật ký chỉ-thêm vẫn chặn sửa; `audit-invariants --strict` cho **đúng cùng kết quả** trên bản gốc và bản khôi phục.
  - **Chưa kiểm:** bản xuất từ **production** (`--remote`) có cùng định dạng hay không. Giả định là có; lần diễn tập dưới đây sẽ xác nhận.
- Time Travel (khôi phục ngay trên D1 production) là cơ chế khác, không đi qua tệp xuất, nên không bị lỗi này. Nhưng nó cũng **chưa từng được thử**.

## 2. Mục tiêu (đề xuất, chủ sửa ở §6)

- **Mất tối đa (RPO):** 1 tuần dữ liệu nếu mất cả Cloudflare (nhờ bản xuất hằng tuần); vài phút nếu chỉ cần quay lại trong 30 ngày (nhờ Time Travel).
- **Thời gian dựng lại (RTO):** ≤ 1 giờ từ tệp sao lưu tới một D1 chạy được. Lần diễn tập đầu sẽ đo con số thật.

## 3. Các bước diễn tập (chủ dự án chạy, trong Terminal)

Chạy ở **thư mục gốc của dự án** (bản checkout chính, nơi đã cài thư viện):

```
cd /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales
```

**Bước 1. Ghi giờ bắt đầu, tạo thư mục sao lưu ngoài repo.**

```
date; mkdir -p "$HOME/TourDao-SaoLuu"
```

**Bước 2. Xem điểm khôi phục hiện tại và thời hạn giữ của Time Travel** (chỉ đọc).

```
CI=1 npx wrangler d1 time-travel info tourdao-sales-db
```

**Bước 3. Xuất production thành HAI tệp: cấu trúc và dữ liệu** (chỉ đọc production; tệp dữ liệu chứa tên và SĐT thật của khách và nhân viên). Chạy từng dòng:

```
export BK="$HOME/TourDao-SaoLuu/$(date +%Y%m%d-%H%M)"; mkdir -p "$BK"; echo "$BK"
```
```
CI=1 npx wrangler d1 export tourdao-sales-db --remote --no-data --output="$BK/cau-truc-goc.sql"
```
```
CI=1 npx wrangler d1 export tourdao-sales-db --remote --no-schema --output="$BK/du-lieu.sql"
```
```
node scripts/tach-ban-xuat-d1.mjs "$BK/cau-truc-goc.sql" "$BK/cau-truc.sql" "$BK/trigger.sql"
```

Lệnh cuối in "câu cấu trúc: … ; trigger: …". Số trigger hiện nay là **18**.

**Bước 4. Nạp vào một cơ sở dữ liệu tạm trên máy, theo đúng thứ tự cấu trúc → dữ liệu → trigger** (không đụng production, không đụng dữ liệu local thường dùng). Chạy từng dòng; mỗi lệnh phải báo "commands executed successfully".

```
export TMPDB=$(mktemp -d); echo "$TMPDB"
```
```
CI=1 npx wrangler d1 execute tourdao-sales-db --local --persist-to "$TMPDB" --file="$BK/cau-truc.sql"
```
```
CI=1 npx wrangler d1 execute tourdao-sales-db --local --persist-to "$TMPDB" --file="$BK/du-lieu.sql"
```
```
CI=1 npx wrangler d1 execute tourdao-sales-db --local --persist-to "$TMPDB" --file="$BK/trigger.sql"
```

Nếu lệnh nào **báo lỗi**: dừng lại và dán nguyên lỗi cho AI. **Không** dùng lệnh xuất nguyên khối (không có `--no-data`/`--no-schema`) để khôi phục: tệp đó không nạp lại được (§1).

**Bước 5. Kiểm bất biến trên bản đã nạp.**

```
node scripts/audit-invariants.mjs --db local --persist-to "$TMPDB" --strict
```

**Bước 6. So số dòng giữa bản đã nạp và production** (chỉ đếm, không in dữ liệu khách). Chạy hai lệnh; hai kết quả phải giống hệt nhau (trừ khi có người vừa lập đơn trong lúc diễn tập).

```
CI=1 npx wrangler d1 execute tourdao-sales-db --local --persist-to "$TMPDB" --command "SELECT (SELECT count(*) FROM orders) AS don, (SELECT count(*) FROM order_item) AS dong_tien, (SELECT count(*) FROM staff) AS tai_khoan, (SELECT count(*) FROM pty_party) AS ho_so, (SELECT count(*) FROM audit_log) AS nhat_ky"
```
```
CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT (SELECT count(*) FROM orders) AS don, (SELECT count(*) FROM order_item) AS dong_tien, (SELECT count(*) FROM staff) AS tai_khoan, (SELECT count(*) FROM pty_party) AS ho_so, (SELECT count(*) FROM audit_log) AS nhat_ky"
```

**Bước 7. Ghi giờ kết thúc, dọn bản tạm.**

```
date; rm -rf "$TMPDB"
```

**Bước 8. Cất cả thư mục `$BK`** (ba tệp `cau-truc.sql`, `du-lieu.sql`, `trigger.sql`, cùng tệp gốc) vào nơi riêng tư của công ty, ngoài Cloudflare (ví dụ Google Drive của công ty, thư mục chỉ chủ có quyền). **Không** gửi qua chat, **không** đưa vào git, **không** để thư mục chia sẻ công khai.

**Bước 9. Dán cho AI:** kết quả bước 2 (dòng thời hạn giữ), giờ bắt đầu và giờ kết thúc, dòng "câu cấu trúc / trigger" ở bước 3, dung lượng tệp (`ls -lh "$BK"`), dòng cuối của bước 5, và hai kết quả của bước 6. AI ghi vào `docs/HANDOFF-N1.md` mục "Diễn tập khôi phục", **không** chép dữ liệu khách.

## 4. Sao lưu định kỳ (sau khi diễn tập đạt)

- Mỗi tuần chạy **bước 3 và bước 8** (bước 3 đã gồm việc tách tệp, nên bản cất luôn ở dạng nạp lại được). Mỗi tháng chạy lại đủ bước 1–9, vì schema đổi theo mỗi migration mới.
- Giữ tối thiểu 8 bản hằng tuần gần nhất và 1 bản mỗi tháng trong 12 tháng.
- **Trước mỗi lần áp migration lên production**, ngoài điểm Time Travel đã ghi như hiện nay, chạy thêm bước 3 (thêm vào runbook ở `docs/HANDOFF-N1.md`).

## 5. Tiêu chí nghiệm thu

1. Bước 4 (ba lệnh nạp) chạy không lỗi với tệp xuất **từ production**. Nếu lỗi: tìm cách nạp khác, kiểm được, ghi lại, rồi chạy lại từ bước 4.
2. Bước 5: `audit-invariants --strict` thoát 0 trên bản đã nạp.
3. Bước 6: năm con số khớp production.
4. `docs/HANDOFF-N1.md` có mục "Diễn tập khôi phục" với ngày, thời gian dựng lại đo được (RTO), thời hạn Time Travel thật, và nơi cất tệp (chỉ tên nơi, không có đường dẫn chia sẻ).
5. Có lịch nhắc sao lưu hằng tuần (xem §6 câu 2).

## 6. Câu hỏi cho chủ dự án

1. **Mục tiêu ở §2 có đúng ý bạn không?** Mất tối đa 1 tuần nếu Cloudflare sự cố, dựng lại trong 1 giờ. (a) **Đồng ý — khuyến nghị** ở quy mô hiện nay. (b) Chặt hơn: sao lưu hằng ngày, khi có thu tiền thật (N3) thì nên chuyển sang mức này.
2. **Nhắc sao lưu hằng tuần bằng cách nào?** (a) **Lịch nhắc trên điện thoại, bạn tự chạy — khuyến nghị lúc đầu**: đơn giản, không cần cấp khoá Cloudflare cho máy nào khác. (b) Máy Mac của bạn tự chạy theo lịch: tiện hơn, nhưng cần máy bật và lưu khoá Cloudflare trên máy.
3. **Cất tệp ở đâu?** Google Drive của công ty, hay nơi khác bạn tin cậy.

## 7. Ngoài phạm vi

Khôi phục đè lên production (chỉ làm khi có sự cố thật, chủ quyết theo `docs/HANDOFF-N1.md` phần Hoàn tác); mã hoá tệp sao lưu (cân nhắc khi có dữ liệu tiền); tự động hoá bằng máy chủ bên ngoài.
