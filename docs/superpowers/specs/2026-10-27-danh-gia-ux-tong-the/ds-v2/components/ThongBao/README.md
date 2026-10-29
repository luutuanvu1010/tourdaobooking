Thông báo ngắn `.toast[data-tong]` nền tối `c-toast-bg` (chữ `c-on-dark` 13,9:1), tông `do` đổi nền `c-danger`; hình 18 + câu `.toast-cau` + nút «Hoàn tác» `.toast-hoan-tac` (chữ `c-hoan-tac`, chỉ khi việc hoàn tác được) + nút đóng `.toast-dong`. Bảng tin là `a.toast` bấm được.

**Trong mã:** `web/toast.ts` — `hienBaoNgan(cau, { tong, hoanTac })` (tông `la` mặc định, `do`, `bien`, `cat`; tự tắt 3 giây, có Hoàn tác thì 5 giây) và `hienThongBao` (Bảng tin, tông `bien`); vùng `.toast-vung` (`aria-live`, `z-tren-cung`, tối đa 3 cái). CSS khối «Thành phần chung v2».

## Khi nào dùng
Báo xong việc vừa làm, báo lỗi lưu, cho Hoàn tác thay hộp xác nhận với việc hoàn tác được.

## Chưa có trong mã
Thông báo trong trang `.thong-bao[data-tong]` (khối báo lỗi / cảnh báo nằm trong thân) là đề xuất của bộ; mã còn mỗi nơi một kiểu (`.sheet-warn`, `.field-errors`…).
