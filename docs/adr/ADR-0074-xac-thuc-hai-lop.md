# ADR-0074 — Xác thực hai lớp khi đăng nhập: ứng dụng xác thực + email (đợt 1), Zalo ZNS (đợt 2)

- **Trạng thái:** **accepted** 2026-10-01 (chủ dự án duyệt bằng lời "duyệt" trong phiên, sau khi trả lời hộp hỏi gom: 4 câu phạm vi/tần suất/kênh/khôi phục + Q1–Q5 đều chọn phương án khuyến nghị). Bản nháp gốc giữ ở `docs/superpowers/specs/2026-10-01-adr-0074-xac-thuc-hai-lop.md`.
- **Ngày:** 2026-10-01 (soạn và duyệt).
- **Thuộc gói:** một lượt duyệt gồm đặc tả `docs/superpowers/specs/2026-10-01-xac-thuc-hai-lop-dac-ta.md` (trang ghép §13) + ADR này + ADR-0075. Ba quyết định chạm dữ liệu/quyền = trần 3.
- **Số:** 0074 — 0071 (Hành chính nhân sự), 0072 (Giám đốc) đã lên `main`, 0073 đã dùng ở nhánh trợ lý; bản nháp viết 0071 rồi đổi số khi gộp main 1.52.
- **Mốc mã:** `main` = `4fb2c320` (bản 1.52). Migration số tạm `0058` theo luật 1.46 (không giữ chỗ; số lớn nhất của `main` + 1; nhánh gộp sau tự đổi tên).
- **Xây trên lỗ đang hở:** **không có.** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (đọc 2026-10-01).
- **Liên quan:** ADR-0075 (sổ phiên, một máy — phát hành cùng hoặc trước), ADR-0016 (Face ID, Google lát 2), ADR-0042 (đặt lại PIN), ADR-0071 (quyền Nhân sự), ADR-0001 (SĐT đăng nhập ≠ SĐT liên hệ), Hiến chương 2.3, K1, 5.16.

## Bối cảnh

Đăng nhập bằng PIN 6 số chỉ là một yếu tố: ai biết SĐT + PIN là vào được, kể cả vào tài khoản Quản trị/Kế toán (thấy tiền, sửa quyền). Chủ dự án yêu cầu (2026-10-01) thêm lớp bảo vệ thứ hai và đã chốt: bắt buộc với nhân viên nội bộ, tự chọn với tài khoản bên ngoài; chỉ hỏi trên máy chưa tin, tin 30 ngày; Face ID miễn; đợt 1 ứng dụng xác thực + email, đợt 2 Zalo ZNS; khôi phục bằng mã dự phòng + Quản trị.

## Quyết định

1. **Phạm vi bắt buộc.** Tài khoản giữ ít nhất một quyền ngoài `EXTERNAL_PERMISSIONS` phải có lớp hai để đăng nhập bằng PIN, sau **14 ngày ân hạn** kể từ phát hành (tự bật trong phiên; hết hạn chưa bật thì bị chặn, nhờ Quản trị bật giúp). Phiên mở trước phát hành không sống tiếp — mọi người đăng nhập lại một lần (ADR-0075 điều 1). Tài khoản chỉ có quyền bên ngoài được tự bật; đã bật thì bị hỏi như nhân viên.
   - *Bổ sung sau lượt duyệt (2026-10-01, khi gộp main 1.52 — áp nguyên tắc của chính điều này, chủ xem lại):* tài khoản nội bộ **tạo sau phát hành**, hoặc tài khoản bên ngoài **được cấp thêm quyền nội bộ**, có 14 ngày ân hạn tính từ lúc tạo / lúc cấp quyền. Quyền `HR` (Nhân sự, ADR-0071) là quyền nội bộ nên thuộc diện bắt buộc.
2. **Khi nào hỏi.** Chỉ ở **cấp phiên mới bằng PIN** (và mọi cách đăng nhập một yếu tố thêm sau này, gồm Google lát 2 — điều 6), trừ khi trình duyệt mang cookie **máy được tin** còn hạn (30 ngày, băm lưu ở máy chủ, thu hồi khi đổi/đặt lại PIN, tắt lớp hai, hoặc người dùng quên máy). Máy được tin chỉ bỏ qua lớp hai, không bao giờ bỏ qua PIN.
3. **Face ID không bị hỏi** — passkey với `userVerification: required` đã gồm hai yếu tố (thiết bị + sinh trắc). Bật Face ID chỉ làm được trong phiên đã có, nên không thành đường vòng.
4. **Yếu tố thuộc tài khoản đăng nhập, không thuộc hồ sơ.** Email nhận mã và khoá ứng dụng xác thực lưu trong module `auth` (bảng `aut_mfa_*`), được xác nhận bằng mã lúc bật; **không** đọc từ `pty_contact_point`. Lý do: ai sửa được liên hệ hồ sơ (Quản trị, người giữ hồ sơ) sẽ chuyển hướng được mã nếu dùng chung. Đây là áp dụng K1 ("Định danh — tài khoản, phiên, Face ID" thuộc lõi định danh); không trái 2.3 vì 2.3 nói về **điều khoản nghiệp vụ** gắn vai/hồ sơ, còn yếu tố đăng nhập là thuộc tính an ninh của tài khoản, giống PIN và passkey.
5. **Khôi phục.** 10 mã dự phòng dùng một lần (băm lưu). Mở rộng ADR-0042: hộp đặt lại của Quản trị có thêm "Tắt bảo mật hai lớp" (huỷ yếu tố, mã dự phòng, máy được tin; đá mọi phiên; nhật ký `mfa_reset` không chứa email/mã). **Ai tắt của ai:** Quản trị tắt cho tài khoản không giữ Quản trị/Toàn quyền; chỉ Toàn quyền tắt cho Quản trị và Toàn quyền khác; không ai tắt của chính mình qua đường này. Nhân sự (ADR-0071 điều e) không làm hỗ trợ đăng nhập nên cũng không tắt lớp hai.
6. **Google lát 2 (ADR-0016)** khi làm: đăng nhập Google được coi là một yếu tố, chịu cổng lớp hai như PIN (không dựa vào 2FA của tài khoản Google vì máy chủ không kiểm được).
7. **Email không dành cho vai lớn:** tài khoản giữ Quản trị, Toàn quyền hoặc Kế toán chỉ dùng ứng dụng xác thực; máy chủ chặn bật yếu tố email cho họ, và được cấp các quyền này thì yếu tố email cũ hết hiệu lực trong cùng lô.
8. **Bí mật.** Khoá TOTP mã hoá AES-GCM bằng bí mật mới `MFA_ENCRYPTION_KEY` (đặt bằng `wrangler secret put`). Mã, khoá, email đầy đủ, mã dự phòng không vào nhật ký, câu lỗi, DTO.
9. **Zalo ZNS (đợt 2)** cần ADR/sửa đổi riêng khi chủ đã có Zalo OA + mẫu ZNS được duyệt; yếu tố Zalo phải xác nhận bằng mã lúc bật (SĐT đăng nhập có thể không phải SĐT Zalo — ADR-0001).

## Hệ quả

- Thêm 4 bảng `aut_mfa_*`/`aut_trusted_device`, 1 cột `staff.mfa_grace_until` (migration `0058`, chỉ thêm), 1 bí mật, 1 cookie chờ (khoá riêng) và 1 cookie máy được tin.
- Đăng nhập PIN trên máy mới chậm thêm một bước; Face ID không đổi.
- Hỗ trợ: người mất điện thoại không có mã dự phòng phải nhờ Quản trị (như quên PIN hôm nay).
- Email phụ thuộc Cloudflare Email Service (chưa kiểm gửi tới địa chỉ bất kỳ) — vì vậy ứng dụng xác thực + mã dự phòng phát hành trước, email không chặn.
- Hàng rào mới phải có dòng trong `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.

## Phương án đã cân nhắc

- **Chỉ email hoặc chỉ Zalo:** phụ thuộc bên ngoài, tốn tiền tin, hộp thư/Zalo bị chiếm là mất cả hai lớp → không chọn làm yếu tố duy nhất.
- **Bắt Face ID cho mọi người thay cho lớp hai:** đơn giản nhất, nhưng máy Windows/Android cũ, máy dùng chung ở văn phòng không có passkey → không đủ.
- **Hỏi mỗi lần đăng nhập:** chủ không chọn (phiền, tốn tin).
