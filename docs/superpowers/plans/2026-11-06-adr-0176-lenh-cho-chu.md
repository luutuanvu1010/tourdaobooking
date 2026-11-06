# Lệnh cho chủ: thử lượt kiểm đầu trên GitHub, nhập, và quan sát hai lần chặn (ADR-0176, 2026-11-06)

Mọi lệnh chạy trong ứng dụng Terminal, ở thư mục gốc dự án:

```bash
cd ~/Documents/Projects/ctytnhhtourdao/tourdao-sales
```

## Trước hết: thứ đang chờ triển khai thì triển khai bằng cách CŨ

Lần nhập nhánh này dùng `day-len` cũ, nên bản đó không có kết quả kiểm trên GitHub, và `trien-khai` mới sẽ từ chối nó. Vì vậy thứ gì đang nằm trên `main` mà chưa lên hệ thống thật (xem mục «ĐANG CHỜ PHÁT HÀNH» trong `docs/HANDOFF-N1.md`) thì chạy `npm run trien-khai` như mọi lần **trước** khi làm phần B.

## A. Thử lượt kiểm trên GitHub, chưa nhập gì (đo thời gian)

1. Đẩy đúng bản của nhánh lên một nhánh phụ chờ kiểm. `main` trên GitHub không đổi.

```bash
git push origin claude/xenodochial-mclaren-12ef4f:refs/heads/cho-kiem/$(git rev-parse claude/xenodochial-mclaren-12ef4f)
```

2. Xem lượt kiểm vừa chạy (lấy số ở cột đầu, gọi là `<số lượt>`).

```bash
gh run list -R luutuanvu1010/tourdaobooking --workflow kiem.yml --limit 3
```

3. Theo dõi tới khi xong. Khi xong, ghi lại tổng thời gian GitHub hiện.

```bash
gh run watch <số lượt> -R luutuanvu1010/tourdaobooking
```

4. Nếu đỏ: chép kết quả của lệnh dưới gửi AI, chưa làm bước B.

```bash
gh run view <số lượt> -R luutuanvu1010/tourdaobooking --log-failed
```

Lần đầu có thể đỏ vì ba điều chưa từng thử: kiểm thử đầu-cuối trên máy Linux, gọi Google Sheet thật và Turnstile từ máy GitHub, bài đo tốc độ của hàng rào trên máy 4 lõi. Bản ở máy 6/11: trong phần kiểm đã chạy thử ở máy chỉ có một bài đỏ có sẵn ở bản chính cũ, đã được sửa khi nối bản chính.

## B. Nhập nhánh (lần cuối dùng `day-len` cũ)

Chỉ làm khi bước A xanh. Lệnh này còn chạy kiểm ở máy khoảng 7 phút như cũ. **Không** chạy `trien-khai` sau bước này.

```bash
npm run day-len -- claude/xenodochial-mclaren-12ef4f
```

## C. Lần phát hành đầu theo cách mới, rồi hai lần quan sát chặn (tiêu chí 4)

1. Lần phát hành kế tiếp (một lần lưu mới do AI chuẩn bị) chạy `npm run day-len -- <tên nhánh AI báo>`. Lần đầu lệnh sẽ hỏi **lý do đổi quy trình kiểm** vì chưa có lượt kiểm cũ để so — đúng thiết kế; gõ ví dụ «lần đầu dùng kiểm trên GitHub». Rồi `npm run trien-khai`. Khối tóm tắt in thời gian từng chặng: gửi AI để đối chiếu mục tiêu 10 phút (cần ba lần liên tiếp).
2. **Bài đỏ cố ý** (nhánh `claude/adr-0176-thu-do`, một bài luôn đỏ): chạy lệnh dưới. Phải thấy lượt kiểm ĐỎ và câu hỏi r/d/q; gõ `d`. Lệnh dừng, không đẩy `main`, và in một dòng `git reset --hard …` — chạy đúng dòng đó để trả `main` về chỗ cũ.

```bash
npm run day-len -- claude/adr-0176-thu-do
```

3. **Bớt một tệp kiểm** (nhánh `claude/adr-0176-thu-bot-bai`) — chỉ làm SAU bước C.1, vì cần một lượt kiểm XANH của bản chính để so. Lượt kiểm sẽ xanh nhưng lệnh phải dừng ở «ĐỔI QUY TRÌNH KIỂM» và đòi lý do; để trống rồi Enter. Lệnh dừng, không đẩy `main`; chạy dòng `git reset --hard …` nó in.

```bash
npm run day-len -- claude/adr-0176-thu-bot-bai
```

Hai nhánh thử được tạo từ đầu nhánh thi công; nếu `main` đã có lần lưu mới trước khi bạn làm bước C, báo AI cập nhật hai nhánh này (không thì lệnh báo «không tiến thẳng được»).

4. Dọn nhánh chờ kiểm trên GitHub khi cần (xoá các nhánh `cho-kiem/*` đã nằm trong `main`): báo AI soạn lệnh.

## Ghi nhận

- Sau một lần «cho qua» lượt kiểm đỏ, lần phát hành kế tiếp không có lượt xanh của bản chính để so nên lại hỏi lý do.
- Chạy lại phần đỏ (`r`) dựa vào việc ghi đè tệp báo cáo trên GitHub — chưa quan sát thật; bước C.2 là lúc thử (gõ `r` một lần trước khi gõ `d`).
