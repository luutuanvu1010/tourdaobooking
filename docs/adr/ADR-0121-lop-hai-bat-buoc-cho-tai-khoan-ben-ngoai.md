# ADR-0121 — Lớp hai bắt buộc cho cả tài khoản bên ngoài (bổ sung ADR-0074 điều 1)

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-16: *"duyệt lượt 1"* (văn bản đề xuất: `docs/superpowers/specs/2026-10-16-ho-so-rieng-tu-va-2fa/DE-XUAT-ADR.md`, mục ADR-G1; số "G1" là số giữ chỗ, nay là 0121).
  - AI soạn và ghi lại, không tự duyệt (Hiến pháp N3). Chưa có người kiểm độc lập đọc văn bản; người kiểm đọc sau khi thi công.
- **Ngày:** 2026-10-16.
- **Loại:** việc lớn (quyền, tài khoản). Hai chiều: Toàn quyền tắt cờ thì đối tác trở lại như ADR-0074 điều 1, yếu tố đã bật vẫn giữ.
- **Quan hệ với ADR cũ:** thay câu "Tài khoản chỉ có quyền bên ngoài được tự bật; đã bật thì bị hỏi như nhân viên" (ADR-0074 điều 1) và Q2 điều 10 của ADR-0085 ("Tài khoản Đối tác / Tài xế đối tác đặt 'nhiều máy': không bắt bảo mật hai lớp"). Các điều còn lại của hai ADR giữ nguyên, kể cả ADR-0074 điều 7 (ba vai lớn không dùng email).
- **Xây trên lỗ đang hở:** không có (không có mục HIGH ở `auth`).

## Bối cảnh
Chủ chốt 2026-10-16: "đối tác cũng bắt buộc — yêu cầu an toàn của hệ thống, áp dụng chung, không phân biệt". ADR-0074 chỉ bắt buộc nội bộ (ân hạn 14 ngày), tài khoản bên ngoài tự chọn. Có khoảng 1000 tài khoản đối tác; nhiều người chưa có email trong hồ sơ, ít người quen ứng dụng xác thực.

## Quyết định
1. Tài khoản chỉ có quyền bên ngoài (`EXTERNAL_PERMISSIONS`) cũng phải có lớp hai, cùng luật hỏi như nội bộ (máy chưa được tin thì hỏi; máy được tin 30 ngày).
2. Yếu tố: email (xác nhận bằng mã, thuộc `auth`, ADR-0074 điều 4) hoặc ứng dụng xác thực.
3. **Bật theo đợt:** một cờ toàn cục "bắt buộc lớp hai cho tài khoản bên ngoài" (dữ liệu có hiệu lực, chỉ Toàn quyền, Hiến chương 5.2) cộng với việc Toàn quyền đưa từng nhóm tài khoản vào ân hạn (`staff.mfa_grace_until` đặt cùng lô). Ân hạn **14 ngày** như nội bộ; đợt đầu khoảng 5 cộng tác viên, sau đó khoảng 100 người mỗi đợt. Đợt đầu chỉ bật khi lớp email (Phần C) đã chạy ổn trên production.
4. Hết ân hạn mà chưa bật thì bị chặn ở bước PIN. Quản trị (không phải Nhân sự) có thể "mở lại 24 giờ" sau khi gọi xác nhận đúng người. Mất yếu tố: dùng mã dự phòng, hoặc Quản trị tắt lớp hai (ADR-0074 điều 5).
5. Face ID vẫn miễn lớp hai (ADR-0074 điều 3): đối tác dùng Face ID thay lớp hai.
6. **Đạt yêu cầu = có ít nhất một yếu tố** trong ba: email đã xác nhận bằng mã, ứng dụng xác thực, hoặc Face ID đã đăng ký. Người chỉ có Face ID: hết ân hạn mà đăng nhập bằng PIN trên máy chưa tin thì bị chặn (không có yếu tố để hỏi), phải đăng nhập bằng Face ID.
7. **Không có ngoại lệ vĩnh viễn.** Trong ân hạn, Quản trị hỗ trợ trực tiếp (giúp tạo email, cài ứng dụng, đăng ký Face ID). Ngoại lệ **tạm thời** cho người chưa có yếu tố nào: một dòng dữ liệu có `valid_to` (tối đa khoảng 14 ngày mỗi lần), **chỉ Toàn quyền** đặt, nhật ký ghi **trước** khi có hiệu lực, hết hạn bằng cách so lúc đăng nhập (không có Cron ghi, Hiến chương 5.11). Việc đặt ngoại lệ tính là "chạm quyền truy cập tài khoản" cho luật tách nhiệm vụ xác minh ở Gói 2.

## Hệ quả
Số thư gửi tăng (ước vài nghìn mỗi tháng; giá và giới hạn của dịch vụ gửi thư chưa tra); tải hỗ trợ cho Quản trị theo đợt; đối tác "nhiều máy" (ADR-0085) phải qua lớp hai ở mỗi máy chưa tin. **Rủi ro vận hành:** bật cả ngàn người một lúc, hoặc email hỏng giữa chừng, có thể khoá đối tác ngoài, nên phải bật theo đợt. **Hoàn tác:** Toàn quyền tắt cờ, đối tác trở lại như ADR-0074 điều 1 ngay lần đăng nhập sau; không mất dữ liệu.

## Tiêu chí nghiệm thu (P20)
- Đối tác chưa có yếu tố, hết ân hạn, đăng nhập PIN trên máy chưa tin: bị chặn bằng câu tiếng Việt; có Face ID thì vào được.
- Cờ tắt: tài khoản bên ngoài đăng nhập như trước ADR này.
- Chỉ Toàn quyền bật cờ, đặt ân hạn, đặt ngoại lệ tạm; Quản trị làm thì 403; mỗi thao tác có nhật ký ghi trước, không chứa email hay SĐT.
- Ngoại lệ tạm tự hết hạn lúc đăng nhập, không cần Cron.
- Bài kiểm bản đồ quyền, kiến trúc, `audit-invariants` xanh; e2e đăng nhập hai lớp chạy lại.
