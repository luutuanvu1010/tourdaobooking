# Trợ lý AI chạy trên máy chủ Anthropic (Managed Agents)

Thư mục này giữ cấu hình các trợ lý chạy trên máy chủ Anthropic, theo **ADR-0145** (`docs/adr/ADR-0145-tro-ly-may-chay-thu-tho-san-loi.md`). Hiện có một trợ lý: **Thợ săn lỗi** (`tho-san-loi/`), dựng từ mẫu «Bug hunter» của Anthropic. Trợ lý chỉ đọc kho thật và viết báo cáo: nó làm việc trên một bản sao đã che dữ liệu, trong máy ảo được cấu hình không mạng (chỉ coi là hàng rào sau khi lượt thử quan sát chặn thật), không có khoá nào, không đẩy mã, không triển khai.

**Chỉ chạy sau khi chủ dự án duyệt ADR-0145.** Mọi lệnh dưới đây do chủ dự án tự gõ trong **một ô Terminal mở riêng** — không gõ bằng `!` trong ô trò chuyện với AI, vì phím `y` sẽ không tới được câu hỏi của lệnh. Đứng ở **thư mục AI đưa** (bản sao riêng của phiên làm việc, không phải thư mục gốc `tourdao-sales/`): tệp `claude-lock.json` sinh ra ở thư mục đang đứng, và AI chỉ lưu được nó trên nhánh riêng. Chạy mọi bước trong cùng một cửa sổ Terminal, và giữ phiên làm việc với AI mở tới khi báo cáo được tải về.

## Chuẩn bị (một lần)

1. Có tài khoản Claude Console (`platform.claude.com`) đã nạp tiền, và đặt **giới hạn chi tiêu tháng** ở phần Limits của Console (khuyến nghị $30 cho tháng đầu). Tiền này tính riêng, không nằm trong gói Claude đang dùng.
2. Cài công cụ dòng lệnh `ant` của Anthropic:

   ```bash
   brew install anthropics/tap/ant
   ```

   ```bash
   xattr -d com.apple.quarantine "$(brew --prefix)/bin/ant"
   ```

3. Đăng nhập (mở trình duyệt để bạn chọn tổ chức), rồi xem đã vào đúng tổ chức và workspace chưa:

   ```bash
   ant auth login
   ```

   ```bash
   ant auth status
   ```

## Chạy thử Thợ săn lỗi (phân hệ tiền, trần khoảng $10)

4. Tạo trợ lý và môi trường trên Anthropic. Lệnh đầu chỉ in kế hoạch, không tạo gì: kế hoạch phải ghi **tạo đúng 1 trợ lý và 1 môi trường**, đúng tổ chức. Lệnh sau tạo thật, hỏi `y/n` thì gõ `y`:

   ```bash
   ant apply --dry-run -v tro-ly-may/tho-san-loi/agent.md tro-ly-may/tho-san-loi/environment.yaml
   ```

   ```bash
   ant apply tro-ly-may/tho-san-loi/agent.md tro-ly-may/tho-san-loi/environment.yaml
   ```

   Lệnh tạo ra tệp `claude-lock.json` ở thư mục gốc; để nguyên, AI sẽ lưu nó vào kho.

5. (Tuỳ chọn) Muốn AI quét gói trước khi gửi: lệnh này chỉ đóng gói trên máy, không gửi gì; xong thì báo AI đường dẫn tệp nó in ra.

   ```bash
   node scripts/goi-ma-tro-ly-may.mjs
   ```

6. Đóng gói, tải lên và mở phiên. Lệnh in tóm tắt gói (commit, số tệp, số chỗ đã che) rồi **hỏi**: gõ `y` để gửi, phím khác để thôi. Gửi xong nó in mã tệp và mã phiên; hãy giữ lại:

   ```bash
   bash tro-ly-may/tho-san-loi/chay-thu.sh
   ```

7. Xem trợ lý làm việc qua đường dẫn Console mà lệnh vừa in (hoặc lệnh `ant beta:sessions connect …` nó in kèm). Xong việc thì phiên chuyển sang chờ. Chạm trần cũng chuyển sang chờ chứ không kết thúc: chi phí có thể vượt $10 một chút, và chỉ khi nâng hoặc gỡ trần phiên mới chạy tiếp.
8. Báo AI mã phiên. AI tải báo cáo về `docs/evidence/<ngày>-tho-san-loi/`, đối chiếu năm tiêu chí nghiệm thu của ADR-0145, rồi hỏi bạn trước khi xoá phiên và các tệp trên Anthropic.

## Không được làm (dựa vào kỷ luật — máy không chặn)

- Không chạy `ant apply .` hay `ant apply` cho cả thư mục: theo tài liệu của Anthropic, lệnh nhận mọi tệp nằm trong thư mục tên `agents` là trợ lý, nên có thể tạo nhầm từ `.claude/agents/`. Luôn ghi tên từng tệp như bước 4.
- Không thêm máy vào `allowed_hosts`, không bật `allow_package_managers`, không gắn vault hay khoá, không đặt lịch chạy (deployment) khi chưa có ADR mới.
- Bước 6 lỗi sau khi đã tải tệp lên: lệnh tự in mã tệp cần dọn — báo AI mã đó.
