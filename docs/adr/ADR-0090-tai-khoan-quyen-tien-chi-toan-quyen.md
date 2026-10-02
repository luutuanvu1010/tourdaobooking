# ADR-0090 — Tài khoản có quyền tiền: chỉ Toàn quyền được cấp quyền tiền, tạo tài khoản mang quyền tiền, và đặt lại PIN của họ

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-02: *"7- Duyệt"*.
  - Chủ duyệt văn bản lượt 1b ở `docs/superpowers/specs/2026-10-02-luot-duyet-1-don-huy-va-quyen-tien.md` @ `4598221f`.
  - Trước đó chủ chọn nguyên tắc *"4- ok"* (PIN tạm, người đặt lại PIN không được biết PIN dùng lâu dài); phần quyền tiền được tách ra làm trước.
  - AI ghi lại, không tự duyệt (Hiến pháp N3).
- **Ngày:** 2026-10-02.
- **Số:** 0090.
- **Loại:** việc lớn (quyền). Chỉ đổi mã, không migration, nên hai chiều.
- **Đi cùng:** ADR-0089 (lượt 1), vì ADR này bảo vệ chính các ô tiền mà ADR-0089 dùng. ADR-0093 PIN tạm (lượt 3) xử lý phần còn lại.
- **Số dòng mã** trích theo `968ecfdb`.

## Bối cảnh (đã chạy thật trên Nền tảng tạm, đêm 1→2/10)
- **QT04:**
  - Quản trị đặt lại PIN của Kế toán (200) và **thấy PIN mới**.
  - Quản trị đăng nhập thay, xác nhận "Công ty đã nhận" (200), rồi **hoàn 500.000** (201). Nhật ký ghi tên Kế toán.
  - **Biến thể:** Quản trị cấp thêm quyền Kế toán cho một Bán hàng cấp dưới (200), vì `ACCOUNTANT.superAdminOnly = false` (`src/shared/roles.ts:33`).
- **GD-P-01:** Nhân sự tạo được tài khoản mang vai Kế toán (ADR-0071 điều 1b) và biết PIN đầu (ADR-0071 điều 1f: máy chủ sinh, hiện một lần cho người tạo).
- **Chuỗi ghép:** Quản trị đặt lại PIN một Bán hàng, đổi sang PIN mình biết, gán thêm quyền Kế toán. Kết quả là một tài khoản giữ tiền do Quản trị điều khiển.

## Quyết định
0. **Định nghĩa "tài khoản có quyền tiền":** tài khoản giữ ít nhất một ô **ghi tiền mà Quản trị không có**.
   - Các ô: `ledger.write`, `payment.refund`, `order.complete`, `accounting.entry.mark` (`src/shared/permissions.ts:114, 105, 110, 120`).
   - Tính bằng **một hàm** suy từ bảng quyền, dùng chung cho máy chủ và giao diện.
   - Hôm nay hàm cho ra đúng ACCOUNTING và SUPER_ADMIN.
1. **Chỉ Toàn quyền** được làm bốn việc với tài khoản có quyền tiền:
   - (i) **đặt lại PIN**;
   - (ii) **gán vai Kế toán, hoặc cộng tay một quyền tiền** cho tài khoản bất kỳ;
   - (iii) **tạo tài khoản** mang quyền tiền;
   - (iv) **tắt bảo mật hai lớp**, khi ADR-0074 thi công.
   
   Quản trị và Nhân sự nhận 403: "Tài khoản giữ tiền — chỉ người phụ trách hệ thống (Toàn quyền) làm việc này."
2. **Giao diện:** nút "Đặt lại PIN", lựa chọn vai Kế toán và lựa chọn quyền tiền ẩn hay hiện theo **cờ máy chủ tính cho từng dòng**, như `datLaiPinDuoc` (`src/modules/accounts/index.ts:735`). Cờ dùng cùng hàm với cổng route.
3. **Không đổi:** Quản trị vẫn mở khoá "sai PIN quá nhiều", đổi tên, ngưng tài khoản Kế toán. Các việc này không mở được quyền tiền.
   - Khi Quản trị ngưng tài khoản Kế toán thì gửi tin cho Toàn quyền, vì việc ngưng làm đứt người duyệt tiền.
4. **Thi công nhỏ:** cờ chỉ-Toàn-quyền của vai nằm trong mã (`src/shared/roles.ts`), cộng một nhánh kiểm ở các route đặt lại PIN, tạo tài khoản và sửa quyền. Làm **trước hoặc cùng** đợt thi công ADR-0089.
   - **Bổ sung (lời chủ 2026-10-02, câu (f): *"a,b.c,d,e,f : đồng ý."*):** tin ở đ3 ("Quản trị ngưng tài khoản Kế toán" vào "Của tôi" của Toàn quyền) cần **một migration**. Migration này tạo **một view** nhật ký tài khoản trong module `audit`, **không bảng mới**; `thongbao` đã có cạnh tới `audit`, nên không nới ranh giới. Phần cờ và route vẫn không cần migration.

## Thay câu nào (ghi bằng dòng trỏ ở dòng trạng thái của văn bản cũ, không sửa thân)
| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0042 đ1 (Quản trị lấy lại ô đặt lại PIN, chỉ cấp dưới) | mọi cấp dưới | trừ tài khoản có quyền tiền (đ1i) |
| ADR-0071 điều 1b (`account.create`: Nhân sự tạo mọi loại tài khoản) | mọi loại | trừ tài khoản mang quyền tiền (đ1iii) |
| ADR-0018 điều 5, danh sách LC-4 (chỉ Toàn quyền cấp ADMIN, SUPER_ADMIN, HR); `ACCOUNTANT.superAdminOnly` | không có ACCOUNTING | + vai Kế toán và quyền tiền (đ1ii) |
| ADR-0074 điều 5 (`:22`, Quản trị tắt lớp hai cho người không giữ Quản trị/Toàn quyền) | gồm cả Kế toán | trừ tài khoản có quyền tiền (đ1iv) |
| ADR-0072, mục "Câu hỏi đã được chủ trả lời" số 1 ("Kế toán là quyền ghi sổ; tách nhiệm vụ … Toàn quyền cộng tay") | — | ADR này là cách thi hành nguyên tắc đó |
| ADR-0034 đ1 (hành động nguồn), đ4 ("Của tôi" theo quan hệ với đơn) | — | + tin "Quản trị ngưng tài khoản Kế toán" vào "Của tôi" của Toàn quyền (đ3) |

## Rủi ro còn lại
- Quản trị vẫn đặt lại PIN được tài khoản Bán hàng hay HDV và dùng thay họ.
- Việc này **không** mở thêm quyền tiền, vì Quản trị đã có `payment.receive any`; nó chỉ cho phép làm việc dưới tên người khác.
- Chặn phần này là việc của ADR-0093 PIN tạm (lượt 3).

## Hệ quả
- Đường mạo danh Kế toán đã chạy thật (QT04 và biến thể) bị đóng ở cả ba cửa: đặt lại PIN, gán quyền, tạo tài khoản.
- Việc dồn lên Toàn quyền rất ít, vì công ty chỉ có 1–2 Kế toán.
- Thi công:
  - có bài kiểm "đỏ trước" cho từng cửa;
  - có người kiểm độc lập;
  - có dòng mới ở `docs/SO-HANG-RAO.md` cho cổng "quyền tiền chỉ Toàn quyền", kèm quan sát chặn thật.
